import type { EmbeddingsModel } from "@/lib/ai/ai.types";
import { cosineSimilarity, generateEmbedding } from "@/lib/ai/embeddings";
import { TEMPORAL_ONLY_PATTERNS } from "@/lib/config/regex-patterns";
import { getAllNotes, searchNotes as keywordSearch, updateNote } from "@/lib/database/database";
import type { Note, NoteType } from "@/lib/database/database.types";
import { processSearchQuery, stripNaturalLanguageFiller } from "@/lib/search/query-nlp";
import type { EnhancedSearchResult, SearchResult } from "@/lib/search/search.types";
import { parseTemporalQuery } from "@/lib/search/temporal-parser";

// Detect type-filter queries like "show me my scans", "voice notes", "my tasks"
const TYPE_QUERY_MAP: { pattern: RegExp; type: NoteType }[] = [
    { pattern: /\b(scan|scans|scanned|photos?|images?|pictures?)\b/i, type: "scan" },
    { pattern: /\b(voice|voice\s*notes?|recordings?|audio)\b/i, type: "voice" },
    { pattern: /\b(tasks?|to-?dos?|checklists?)\b/i, type: "task" },
    { pattern: /\b(meetings?|syncs?|calls?)\b/i, type: "meeting" },
    { pattern: /\b(ideas?|brainstorms?)\b/i, type: "idea" },
    { pattern: /\b(journals?|diary|reflections?)\b/i, type: "journal" },
    { pattern: /\b(references?|guides?|docs?|documentation)\b/i, type: "reference" },
];

// Common filler words around type queries: "show me my task lists" → remove "my", "lists", "list", "all"
const TYPE_FILLER = /\b(my|all|the|me|show|list|lists|every|recent)\b/gi;

function detectTypeFilter(query: string): NoteType | null {
    const stripped = stripNaturalLanguageFiller(query).toLowerCase();
    return detectTypeFromText(stripped);
}

// Detect type keyword in any text (used by both full-query detection and temporal remainder detection)
function detectTypeFromText(text: string): NoteType | null {
    const cleaned = text.replace(/['']/g, "").toLowerCase(); // Strip apostrophes ("today's tasks" → "todays tasks")
    for (const { pattern, type } of TYPE_QUERY_MAP) {
        if (pattern.test(cleaned)) {
            const withoutType = cleaned.replace(pattern, "").replace(TYPE_FILLER, "").replace(/[?\s]+/g, " ").trim();
            if (withoutType.length < 3) {
                return type;
            }
        }
    }
    return null;
}

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

    // Check if temporal remainder is a type-filter query (e.g., "today's tasks" → temporal=today + type=task)
    // Or if remainder is temporal-only filler (e.g., "what I wrote" → just time filter)
    if (temporalFilter && (isTemporalOnlyRemainder(searchQuery) || detectTypeFromText(searchQuery))) {
        const typeFromRemainder = detectTypeFromText(searchQuery);
        console.log(
            `🔍 [Search] Temporal${typeFromRemainder ? `+type(${typeFromRemainder})` : "-only"} query: ${temporalFilter.description}`,
        );
        const allNotes = await getAllNotes();
        const inRange = (t: number) => t >= temporalFilter.startTime && t <= temporalFilter.endTime;
        let filteredNotes = allNotes.filter((note) => inRange(note.created_at) || inRange(note.updated_at));
        if (typeFromRemainder) {
            filteredNotes = filteredNotes.filter((note) => note.type === typeFromRemainder);
        }

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

    for (const result of semantic) {
        resultMap.set(result.id, result);
    }

    for (const result of keyword) {
        const existing = resultMap.get(result.id);
        if (existing) {
            // Use the stronger signal + bonus for dual match (don't dilute with average)
            resultMap.set(result.id, {
                ...existing,
                relevanceScore: Math.max(existing.relevanceScore, result.relevanceScore) + 0.15,
                matchType: "both",
            });
        } else {
            resultMap.set(result.id, result);
        }
    }

    // Apply recency boost — linear decay over 30 days
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const results = Array.from(resultMap.values()).map((result) => ({
        ...result,
        relevanceScore: result.relevanceScore + 0.1 * Math.max(0, 1 - (now - result.created_at) / thirtyDaysMs),
    }));

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 50);
}

export async function askNotesSearch(
    query: string,
    embeddingsModel: EmbeddingsModel | null,
): Promise<EnhancedSearchResult> {
    if (query.trim().length === 0) {
        return { results: [], temporalFilter: null };
    }

    // === LAYER 0: Strip NL filler ===
    const stripped = stripNaturalLanguageFiller(query);
    const isNaturalLanguage = stripped !== query.trim();

    // === LAYER 1: Time filter (highest priority) ===
    const temporalFilter = parseTemporalQuery(stripped);
    const afterTemporal = temporalFilter ? temporalFilter.query.trim() : stripped;

    // === LAYER 2: Type filter ===
    const typeFilter = detectTypeFromText(afterTemporal) || detectTypeFilter(query);

    // === LAYER 3: Content query (what's left after removing time + type) ===
    let contentQuery = afterTemporal;
    if (typeFilter) {
        // Remove type keywords from the remaining content query
        for (const { pattern } of TYPE_QUERY_MAP) {
            contentQuery = contentQuery.replace(pattern, "");
        }
        contentQuery = contentQuery.replace(TYPE_FILLER, "").replace(/[''?.!\s]+/g, " ").trim();
    }
    const hasContent = contentQuery.length >= 2 && !isTemporalOnlyRemainder(contentQuery);

    // Log what we extracted
    const parts = [
        temporalFilter ? `time=${temporalFilter.description}` : null,
        typeFilter ? `type=${typeFilter}` : null,
        hasContent ? `content="${contentQuery}"` : null,
    ]
        .filter(Boolean)
        .join(" + ");
    console.log(`[Ask Notes] "${query}" → ${parts || "plain search"}`);

    // === DISPATCH: combine all signals ===

    // If we have temporal or type filters, fetch all notes and filter
    if (temporalFilter || typeFilter) {
        let notes = await getAllNotes();

        // Apply temporal filter — use created_at only (updated_at catches AI reprocessing noise)
        if (temporalFilter) {
            const inRange = (t: number) => t >= temporalFilter.startTime && t <= temporalFilter.endTime;
            notes = notes.filter((note) => inRange(note.created_at));
        }

        // Apply type filter
        if (typeFilter) {
            notes = notes.filter((note) => note.type === typeFilter);
        }

        // If there's a content query, rank by semantic similarity
        if (hasContent && embeddingsModel?.isReady) {
            const queryEmbedding = await generateEmbedding(contentQuery, embeddingsModel);
            const scored = notes
                .map((note) => {
                    let similarity = 0;
                    if (note.embedding) {
                        try {
                            const noteEmbedding = JSON.parse(note.embedding);
                            similarity = cosineSimilarity(queryEmbedding, noteEmbedding);
                        } catch {}
                    }
                    return { ...note, relevanceScore: similarity, matchType: "semantic" as const };
                })
                .sort((a, b) => b.relevanceScore - a.relevanceScore);

            return {
                results: scored,
                temporalFilter,
                interpretedQuery: isNaturalLanguage ? parts : undefined,
            };
        }

        // No content query — sort by recency
        const results: SearchResult[] = notes
            .sort((a, b) => b.created_at - a.created_at)
            .map((note) => ({ ...note, relevanceScore: 1, matchType: "keyword" as const }));

        return {
            results,
            temporalFilter,
            interpretedQuery: isNaturalLanguage ? parts : undefined,
        };
    }

    // No temporal or type filter — pure content search
    const searchResult = await searchNotesEnhanced(stripped, embeddingsModel);

    return {
        ...searchResult,
        interpretedQuery: isNaturalLanguage ? contentQuery : undefined,
    };
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
