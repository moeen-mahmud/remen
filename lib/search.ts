/**
 * Search module for notes
 *
 * Combines semantic search (using neural embeddings) with keyword search
 * for comprehensive note retrieval. Supports natural language temporal queries.
 */

import { cosineSimilarity, generateEmbedding } from "@/lib/ai/embeddings"
import type { EmbeddingsModel } from "@/lib/ai/provider"
import { getAllNotes, searchNotes as keywordSearch, updateNote, type Note } from "@/lib/database"
import { parseTemporalQuery, type TemporalFilter } from "@/lib/search/temporal-parser"

export interface SearchResult extends Note {
    relevanceScore: number
    matchType: "semantic" | "keyword" | "both"
}

export interface EnhancedSearchResult {
    results: SearchResult[]
    temporalFilter: TemporalFilter | null
}

/** Filler phrases that indicate a purely time-based query when combined with a temporal filter */
const TEMPORAL_ONLY_PATTERNS = [
    /^what\s+(i\s+)?(wrote|was\s+thinking|thought|noted)\s*[?.]?\s*$/i,
    /^notes?\s+(from|i\s+wrote)\s*[?.]?\s*$/i,
    /^(from|my\s+notes?)\s*[?.]?\s*$/i,
]

function isTemporalOnlyRemainder(q: string): boolean {
    const s = q.replace(/[?.]/g, " ").trim()
    if (!s) return true
    return TEMPORAL_ONLY_PATTERNS.some((p) => p.test(q))
}

/**
 * Search notes using a hybrid approach combining semantic and keyword search
 * Now with natural language temporal parsing support
 */
export async function searchNotes(query: string, embeddingsModel: EmbeddingsModel | null): Promise<SearchResult[]> {
    const enhanced = await searchNotesEnhanced(query, embeddingsModel)
    return enhanced.results
}

/**
 * Enhanced search that returns both results and any detected temporal filter
 */
export async function searchNotesEnhanced(
    query: string,
    embeddingsModel: EmbeddingsModel | null,
): Promise<EnhancedSearchResult> {
    if (query.trim().length === 0) {
        return { results: [], temporalFilter: null }
    }

    console.log(`🔍 [Search] Starting enhanced search for: "${query}"`)
    console.log(`🔍 [Search] Embeddings model ready: ${embeddingsModel?.isReady || false}`)

    // Parse any temporal expressions from the query
    const temporalFilter = parseTemporalQuery(query)
    if (temporalFilter) {
        console.log(`🔍 [Search] Temporal filter detected: ${temporalFilter.description}`)
    }

    // Use the cleaned query (with temporal terms removed) or original
    const searchQuery = (temporalFilter?.query || query).trim()

    // If we have a temporal filter and the remaining text is empty or temporal-only
    // filler ("what i wrote", "what I was thinking", etc.), treat as time-only: filter
    // all notes by the time range.
    if (temporalFilter && isTemporalOnlyRemainder(searchQuery)) {
        console.log(`🔍 [Search] Temporal-only query, filtering notes by time: ${temporalFilter.description}`)
        const allNotes = await getAllNotes()
        const filteredNotes = allNotes.filter(
            (note) => note.created_at >= temporalFilter.startTime && note.created_at <= temporalFilter.endTime,
        )

        return {
            results: filteredNotes.map((note) => ({
                ...note,
                relevanceScore: 1,
                matchType: "keyword" as const,
            })),
            temporalFilter,
        }
    }

    // Run both search methods in parallel
    const [semanticResults, keywordResults] = await Promise.all([
        semanticSearch(searchQuery, embeddingsModel),
        keywordSearchWithScoring(searchQuery),
    ])

    // Merge and deduplicate results
    let mergedResults = mergeSearchResults(semanticResults, keywordResults)

    // If we have a temporal filter, apply it to the results
    if (temporalFilter) {
        mergedResults = mergedResults.filter(
            (result) => result.created_at >= temporalFilter.startTime && result.created_at <= temporalFilter.endTime,
        )
    }

    return { results: mergedResults, temporalFilter }
}

/**
 * Semantic search using neural embeddings
 */
async function semanticSearch(query: string, embeddingsModel: EmbeddingsModel | null): Promise<SearchResult[]> {
    try {
        console.log(`🧠 [Semantic Search] Starting for: "${query}"`)

        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query, embeddingsModel)
        console.log(`🧠 [Semantic Search] Query embedding: ${queryEmbedding.length} dims`)

        // Get all notes
        const allNotes = await getAllNotes()
        console.log(`🧠 [Semantic Search] Comparing against ${allNotes.length} notes`)

        // Calculate similarity for each note
        const results: SearchResult[] = []
        const allScores: { title: string; similarity: number; noteDim: number }[] = []

        for (const note of allNotes) {
            // Generate embedding for note if not already done
            let noteEmbedding: number[]
            let needsRegeneration = false

            if (note.embedding) {
                try {
                    noteEmbedding = JSON.parse(note.embedding)
                    // Regenerate if dimension mismatch (old fallback vs new neural)
                    if (noteEmbedding.length !== queryEmbedding.length && embeddingsModel?.isReady) {
                        needsRegeneration = true
                    }
                } catch {
                    needsRegeneration = true
                    noteEmbedding = []
                }
            } else {
                needsRegeneration = true
                noteEmbedding = []
            }

            // Regenerate embedding if needed
            if (needsRegeneration) {
                noteEmbedding = await generateEmbedding(note.content, embeddingsModel)
                await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) })
            }

            // Calculate similarity
            const similarity = cosineSimilarity(queryEmbedding, noteEmbedding)

            // Track all scores for debugging
            allScores.push({
                title: (note.title || note.content.substring(0, 30)).substring(0, 20),
                similarity: Math.round(similarity * 100) / 100,
                noteDim: noteEmbedding.length,
            })

            // Lower threshold for better recall - 0.25 for neural, 0.2 for fallback
            const threshold = embeddingsModel?.isReady ? 0.25 : 0.2
            if (similarity > threshold) {
                results.push({
                    ...note,
                    relevanceScore: similarity,
                    matchType: "semantic",
                })
            }
        }

        // Log all similarity scores for debugging
        console.log(`🧠 [Semantic Search] Similarity scores:`, allScores)
        console.log(
            `🧠 [Semantic Search] Found ${results.length} semantic matches (threshold: ${embeddingsModel?.isReady ? 0.25 : 0.2})`,
        )

        // Sort by relevance
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    } catch (error) {
        console.error("❌ [Semantic Search] Failed:", error)
        return []
    }
}

/**
 * Keyword search with relevance scoring
 */
async function keywordSearchWithScoring(query: string): Promise<SearchResult[]> {
    try {
        const results = await keywordSearch(query)
        console.log(`📝 [Keyword Search] Found ${results.length} keyword matches for: "${query}"`)

        return results.map((note) => {
            // Calculate a simple relevance score based on keyword frequency
            const queryTerms = query.toLowerCase().split(/\s+/)
            const contentLower = note.content.toLowerCase()
            const titleLower = (note.title || "").toLowerCase()

            let score = 0

            for (const term of queryTerms) {
                if (term.length < 2) continue

                // Title matches are weighted higher
                if (titleLower.includes(term)) {
                    score += 0.4
                }

                // Count occurrences in content
                const regex = new RegExp(term, "gi")
                const contentMatches = (contentLower.match(regex) || []).length
                score += Math.min(contentMatches * 0.1, 0.5) // Cap content contribution
            }

            // Normalize score
            const normalizedScore = Math.min(score / queryTerms.length, 1)

            return {
                ...note,
                relevanceScore: normalizedScore,
                matchType: "keyword" as const,
            }
        })
    } catch (error) {
        console.error("Keyword search failed:", error)
        return []
    }
}

/**
 * Merge semantic and keyword results, handling duplicates
 */
function mergeSearchResults(semantic: SearchResult[], keyword: SearchResult[]): SearchResult[] {
    const resultMap = new Map<string, SearchResult>()

    // Add semantic results
    for (const result of semantic) {
        resultMap.set(result.id, result)
    }

    // Add keyword results, updating if already exists
    for (const result of keyword) {
        const existing = resultMap.get(result.id)
        if (existing) {
            // Combine scores for notes found by both methods
            resultMap.set(result.id, {
                ...existing,
                relevanceScore: (existing.relevanceScore + result.relevanceScore) / 2 + 0.1, // Bonus for appearing in both
                matchType: "both",
            })
        } else {
            resultMap.set(result.id, result)
        }
    }

    // Convert to array and sort by relevance
    return Array.from(resultMap.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 50) // Limit results
}

/**
 * Find notes related to a given note
 */
export async function findRelatedNotes(
    noteId: string,
    embeddingsModel: EmbeddingsModel | null,
    limit: number = 5,
): Promise<SearchResult[]> {
    try {
        const allNotes = await getAllNotes()
        const targetNote = allNotes.find((n) => n.id === noteId)

        if (!targetNote) {
            return []
        }

        // Get or generate target note embedding
        let targetEmbedding: number[]
        if (targetNote.embedding) {
            try {
                targetEmbedding = JSON.parse(targetNote.embedding)
                // Regenerate if we have neural model but old fallback embedding
                if (targetEmbedding.length === 256 && embeddingsModel?.isReady) {
                    targetEmbedding = await generateEmbedding(targetNote.content, embeddingsModel)
                    await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) })
                }
            } catch {
                targetEmbedding = await generateEmbedding(targetNote.content, embeddingsModel)
                await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) })
            }
        } else {
            targetEmbedding = await generateEmbedding(targetNote.content, embeddingsModel)
            await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) })
        }

        // Calculate similarity with all other notes
        const results: SearchResult[] = []

        for (const note of allNotes) {
            if (note.id === noteId) continue // Skip the target note itself

            let noteEmbedding: number[]
            let needsRegeneration = false

            if (note.embedding) {
                try {
                    noteEmbedding = JSON.parse(note.embedding)
                    // Regenerate if dimension mismatch
                    if (noteEmbedding.length !== targetEmbedding.length && embeddingsModel?.isReady) {
                        needsRegeneration = true
                    }
                } catch {
                    needsRegeneration = true
                    noteEmbedding = []
                }
            } else {
                needsRegeneration = true
                noteEmbedding = []
            }

            if (needsRegeneration) {
                noteEmbedding = await generateEmbedding(note.content, embeddingsModel)
                await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) })
            }

            const similarity = cosineSimilarity(targetEmbedding, noteEmbedding)

            // Lower threshold for related notes - 0.3 for neural, 0.25 for fallback
            const threshold = embeddingsModel?.isReady ? 0.3 : 0.25
            if (similarity > threshold) {
                results.push({
                    ...note,
                    relevanceScore: similarity,
                    matchType: "semantic",
                })
            }
        }

        return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit)
    } catch (error) {
        console.error("Find related notes failed:", error)
        return []
    }
}
