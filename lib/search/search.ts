import type { EmbeddingsModel, LLMModel } from "@/lib/ai/ai.types";
import { cosineSimilarity, generateEmbedding } from "@/lib/ai/embeddings";
import { interpretQuery } from "@/lib/ask-notes/ask-notes";
import { AskNotesResult } from "@/lib/ask-notes/ask-notes.type";
import { TEMPORAL_ONLY_PATTERNS } from "@/lib/config/regex-patterns";
import { getAllNotes, searchNotes as keywordSearch, updateNote } from "@/lib/database/database";
import type { Note } from "@/lib/database/database.types";
import { processSearchQuery } from "@/lib/search/query-nlp";
import type { EnhancedSearchResult, SearchResult } from "@/lib/search/search.types";
import { parseTemporalQuery } from "@/lib/search/temporal-parser";
import { shouldUseLLM } from "@/lib/utils/functions";

function isTemporalOnlyRemainder(q: string): boolean {
    const s = q.replace(/[?.]/g, " ").trim();
    if (!s) return true;
    return TEMPORAL_ONLY_PATTERNS.some((p) => p.test(q));
}

export async function searchNotes(query: string, embeddingsModel: EmbeddingsModel | null): Promise<SearchResult[]> {
    const enhanced = await searchNotesEnhanced(query, embeddingsModel);
    return enhanced.results;
}

export async function searchNotesEnhanced(
    query: string,
    embeddingsModel: EmbeddingsModel | null,
): Promise<EnhancedSearchResult> {
    if (query.trim().length === 0) {
        return { results: [], temporalFilter: null };
    }

    console.log(`🔍 [Search] Starting enhanced search for: "${query}"`);
    console.log(`🔍 [Search] Embeddings model ready: ${embeddingsModel?.isReady || false}`);

    // Parse any temporal expressions from the query
    const temporalFilter = parseTemporalQuery(query);
    if (temporalFilter) {
        console.log(`🔍 [Search] Temporal filter detected: ${temporalFilter.description}`);
    }

    // Use the cleaned query (with temporal terms removed) or original
    const searchQuery = (temporalFilter?.query || query).trim();
    const processed = processSearchQuery(searchQuery);

    // If we have a temporal filter and the remaining text is empty or temporal-only
    // filler ("what i wrote", "what I was thinking", etc.), treat as time-only: filter
    // all notes by the time range.
    if (temporalFilter && isTemporalOnlyRemainder(searchQuery)) {
        console.log(`🔍 [Search] Temporal-only query, filtering notes by time: ${temporalFilter.description}`);
        const allNotes = await getAllNotes();
        const inRange = (t: number) => t >= temporalFilter.startTime && t <= temporalFilter.endTime;
        const filteredNotes = allNotes.filter((note) => inRange(note.created_at) || inRange(note.updated_at));

        // Rank temporal-only queries:
        // 1) Notes CREATED in the time window
        // 2) Notes EDITED in the time window (but created earlier)
        // Then by recency within that window.
        const windowMs = Math.max(temporalFilter.endTime - temporalFilter.startTime, 1);
        const scored = filteredNotes
            .map((note) => {
                const createdMatch = inRange(note.created_at);
                const time = createdMatch ? note.created_at : note.updated_at;
                const recency01 = Math.min(Math.max((time - temporalFilter.startTime) / windowMs, 0), 1);
                return { note, createdMatch, time, recency01 };
            })
            .sort((a, b) => {
                if (a.createdMatch !== b.createdMatch) return a.createdMatch ? -1 : 1;
                return b.time - a.time;
            });

        return {
            results: scored.map(({ note, createdMatch, recency01 }) => ({
                ...note,
                // Keep relevance meaningful for debugging/UX:
                // - createdMatch gets a higher base
                // - within-window recency breaks ties
                relevanceScore: (createdMatch ? 2 : 1) + recency01,
                matchType: "keyword" as const,
            })),
            temporalFilter,
        };
    }

    // Run both search methods in parallel.
    // For natural-language queries, prefer the extracted keywords for searching.
    const keywordQuery = processed.keywordQuery || processed.normalized || searchQuery;
    const semanticQuery = processed.keywordQuery || processed.normalized || searchQuery;

    const [semanticResults, keywordResults] = await Promise.all([
        semanticSearch(semanticQuery, embeddingsModel),
        keywordSearchWithScoring(keywordQuery),
    ]);

    // Merge and deduplicate results
    let mergedResults = mergeSearchResults(semanticResults, keywordResults);

    // If we have a temporal filter, apply it to the results
    if (temporalFilter) {
        mergedResults = mergedResults.filter(
            (result) => result.created_at >= temporalFilter.startTime && result.created_at <= temporalFilter.endTime,
        );
    }

    return { results: mergedResults, temporalFilter };
}

async function semanticSearch(query: string, embeddingsModel: EmbeddingsModel | null): Promise<SearchResult[]> {
    try {
        console.log(`🧠 [Semantic Search] Starting for: "${query}"`);

        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query, embeddingsModel);
        console.log(`🧠 [Semantic Search] Query embedding: ${queryEmbedding.length} dims`);

        // Get all notes
        const allNotes = await getAllNotes();
        console.log(`🧠 [Semantic Search] Comparing against ${allNotes.length} notes`);

        // Calculate similarity for each note
        const results: SearchResult[] = [];
        const scoredNotes: { note: Note; similarity: number }[] = [];
        const allScores: { title: string; similarity: number; noteDim: number }[] = [];

        for (const note of allNotes) {
            // Generate embedding for note if not already done
            let noteEmbedding: number[];
            let needsRegeneration = false;

            if (note.embedding) {
                try {
                    noteEmbedding = JSON.parse(note.embedding);
                    // Regenerate if dimension mismatch (old fallback vs new neural)
                    if (noteEmbedding.length !== queryEmbedding.length && embeddingsModel?.isReady) {
                        needsRegeneration = true;
                    }
                } catch {
                    needsRegeneration = true;
                    noteEmbedding = [];
                }
            } else {
                needsRegeneration = true;
                noteEmbedding = [];
            }

            // Regenerate embedding if needed
            if (needsRegeneration) {
                noteEmbedding = await generateEmbedding(note.content, embeddingsModel);
                await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) });
            }

            // Calculate similarity
            const similarity = cosineSimilarity(queryEmbedding, noteEmbedding);
            scoredNotes.push({ note, similarity });

            // Track all scores for debugging
            allScores.push({
                title: (note.title || note.content.substring(0, 30)).substring(0, 20),
                similarity: Math.round(similarity * 100) / 100,
                noteDim: noteEmbedding.length,
            });

            // Lower threshold for better recall - 0.25 for neural, 0.2 for fallback
            const threshold = embeddingsModel?.isReady ? 0.25 : 0.2;
            if (similarity > threshold) {
                results.push({
                    ...note,
                    relevanceScore: similarity,
                    matchType: "semantic",
                });
            }
        }

        // Log all similarity scores for debugging
        console.log(`🧠 [Semantic Search] Similarity scores:`, allScores);
        console.log(
            `🧠 [Semantic Search] Found ${results.length} semantic matches (threshold: ${embeddingsModel?.isReady ? 0.25 : 0.2})`,
        );

        // Fallback: if nothing cleared the threshold, still return the best matches
        // so the UI can show "closest" notes instead of empty results.
        if (results.length === 0 && scoredNotes.length > 0) {
            const sorted = scoredNotes
                .filter((s) => Number.isFinite(s.similarity))
                .sort((a, b) => b.similarity - a.similarity);

            const best = sorted[0]?.similarity ?? 0;
            const min = embeddingsModel?.isReady ? 0.1 : 0.08;

            if (best >= min) {
                const top = sorted.slice(0, 5);
                console.log(
                    `🧠 [Semantic Search] No strong matches, returning top ${top.length} low-confidence results (best: ${Math.round(best * 100) / 100})`,
                );
                return top.map(({ note, similarity }) => ({
                    ...note,
                    relevanceScore: similarity,
                    matchType: "semantic",
                }));
            }
        }
        const removeEmptyResults = results.filter((result) => result.content.trim().length > 0);

        // Sort by relevance
        return removeEmptyResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
        console.error("❌ [Semantic Search] Failed:", error);
        return [];
    }
}

async function keywordSearchWithScoring(query: string): Promise<SearchResult[]> {
    try {
        const results = await keywordSearch(query);
        console.log(`📝 [Keyword Search] Found ${results.length} keyword matches for: "${query}"`);

        return results.map((note) => {
            // Calculate a simple relevance score based on keyword frequency
            const queryTerms = query.toLowerCase().split(/\s+/);
            const contentLower = note.content.toLowerCase();
            const titleLower = (note.title || "").toLowerCase();

            let score = 0;

            for (const term of queryTerms) {
                if (term.length < 2) continue;

                // Title matches are weighted higher
                if (titleLower.includes(term)) {
                    score += 0.4;
                }

                // Count occurrences in content
                const regex = new RegExp(term, "gi");
                const contentMatches = (contentLower.match(regex) || []).length;
                score += Math.min(contentMatches * 0.1, 0.5); // Cap content contribution
            }

            // Normalize score
            const normalizedScore = Math.min(score / queryTerms.length, 1);

            return {
                ...note,
                relevanceScore: normalizedScore,
                matchType: "keyword" as const,
            };
        });
    } catch (error) {
        console.error("Keyword search failed:", error);
        return [];
    }
}

function mergeSearchResults(semantic: SearchResult[], keyword: SearchResult[]): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Add semantic results
    for (const result of semantic) {
        resultMap.set(result.id, result);
    }

    // Add keyword results, updating if already exists
    for (const result of keyword) {
        const existing = resultMap.get(result.id);
        if (existing) {
            // Combine scores for notes found by both methods
            resultMap.set(result.id, {
                ...existing,
                relevanceScore: (existing.relevanceScore + result.relevanceScore) / 2 + 0.1, // Bonus for appearing in both
                matchType: "both",
            });
        } else {
            resultMap.set(result.id, result);
        }
    }

    // Convert to array and sort by relevance
    return Array.from(resultMap.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 50); // Limit results
}

export async function askNotesSearch(
    query: string,
    embeddingsModel: EmbeddingsModel | null,
    llmModel: LLMModel | null,
): Promise<EnhancedSearchResult> {
    if (query.trim().length === 0) {
        return { results: [], temporalFilter: null };
    }

    console.log(`🤖 [Ask Notes Search] Starting LLM-powered search for: "${query}"`);
    console.log(`🤖 [Ask Notes Search] Should use LLM: ${shouldUseLLM(query)}`);

    // Check if we should use LLM interpretation
    if (!shouldUseLLM(query) || !llmModel?.isReady) {
        console.log(`🤖 [Ask Notes Search] Falling back to regular search`);
        return searchNotesEnhanced(query, embeddingsModel);
    }

    try {
        // Use LLM to interpret the query
        const interpretation: AskNotesResult = await interpretQuery(query, llmModel);
        console.log(`🤖 [Ask Notes Search] LLM interpretation complete:`, interpretation);

        // Create a combined search query from the interpreted terms
        let combinedQuery = interpretation.searchTerms.join(" ");

        // Add topics to search terms if they're distinct
        const uniqueTopics = interpretation.topics.filter(
            (topic) => !interpretation.searchTerms.some((term) => term.toLowerCase().includes(topic.toLowerCase())),
        );
        if (uniqueTopics.length > 0) {
            combinedQuery += " " + uniqueTopics.join(" ");
        }

        // If the LLM detected a temporal hint, include it in the query we pass to the temporal parser.
        const queryForSearch = interpretation.temporalHint
            ? `notes from ${interpretation.temporalHint} ${combinedQuery}`.trim()
            : combinedQuery.trim();

        console.log(`🤖 [Ask Notes Search] Combined search query: "${queryForSearch}"`);

        // Perform the actual search with the interpreted query
        const searchResult = await searchNotesEnhanced(queryForSearch, embeddingsModel);

        // If we have a temporal hint from LLM, try to parse it
        let temporalFilter = searchResult.temporalFilter;
        if (interpretation.temporalHint && !temporalFilter) {
            // Try to parse the temporal hint as a query
            const temporalQuery = `notes from ${interpretation.temporalHint}`;
            temporalFilter = parseTemporalQuery(temporalQuery);
            if (temporalFilter) {
                console.log(`🤖 [Ask Notes Search] Applied LLM temporal hint: ${temporalFilter.description}`);
                // Re-filter results with temporal constraint
                searchResult.results = searchResult.results.filter(
                    (result) =>
                        result.created_at >= temporalFilter!.startTime && result.created_at <= temporalFilter!.endTime,
                );
            }
        }

        // Add interpretation metadata to the result
        return {
            ...searchResult,
            temporalFilter,
            // Store the interpreted query for UI display
            interpretedQuery: interpretation.interpretedQuery,
        };
    } catch (error) {
        console.error("❌ [Ask Notes Search] LLM interpretation failed, falling back:", error);
        // Fallback to regular search
        return searchNotesEnhanced(query, embeddingsModel);
    }
}

export async function findRelatedNotes(
    noteId: string,
    embeddingsModel: EmbeddingsModel | null,
    limit: number = 5,
): Promise<SearchResult[]> {
    try {
        const allNotes = await getAllNotes();
        const targetNote = allNotes.find((n) => n.id === noteId);

        if (!targetNote) {
            return [];
        }

        // Get or generate target note embedding
        let targetEmbedding: number[];
        if (targetNote.embedding) {
            try {
                targetEmbedding = JSON.parse(targetNote.embedding);
                // Regenerate if we have neural model but old fallback embedding
                if (targetEmbedding.length === 256 && embeddingsModel?.isReady) {
                    targetEmbedding = await generateEmbedding(targetNote.content, embeddingsModel);
                    await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) });
                }
            } catch {
                targetEmbedding = await generateEmbedding(targetNote.content, embeddingsModel);
                await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) });
            }
        } else {
            targetEmbedding = await generateEmbedding(targetNote.content, embeddingsModel);
            await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) });
        }

        // Calculate similarity with all other notes
        const results: SearchResult[] = [];

        for (const note of allNotes) {
            if (note.id === noteId) continue; // Skip the target note itself

            let noteEmbedding: number[];
            let needsRegeneration = false;

            if (note.embedding) {
                try {
                    noteEmbedding = JSON.parse(note.embedding);
                    // Regenerate if dimension mismatch
                    if (noteEmbedding.length !== targetEmbedding.length && embeddingsModel?.isReady) {
                        needsRegeneration = true;
                    }
                } catch {
                    needsRegeneration = true;
                    noteEmbedding = [];
                }
            } else {
                needsRegeneration = true;
                noteEmbedding = [];
            }

            if (needsRegeneration) {
                noteEmbedding = await generateEmbedding(note.content, embeddingsModel);
                await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) });
            }

            const similarity = cosineSimilarity(targetEmbedding, noteEmbedding);

            // Lower threshold for related notes - 0.3 for neural, 0.25 for fallback
            const threshold = embeddingsModel?.isReady ? 0.3 : 0.25;
            if (similarity > threshold) {
                results.push({
                    ...note,
                    relevanceScore: similarity,
                    matchType: "semantic",
                });
            }
        }

        return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
        console.error("Find related notes failed:", error);
        return [];
    }
}
