import { cosineSimilarity, generateEmbedding } from "@/lib/ai/embeddings"
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

/**
 * Search notes using a hybrid approach combining semantic and keyword search
 * Now with natural language temporal parsing support
 */
export async function searchNotes(query: string): Promise<SearchResult[]> {
    const enhanced = await searchNotesEnhanced(query)
    return enhanced.results
}

/**
 * Enhanced search that returns both results and any detected temporal filter
 */
export async function searchNotesEnhanced(query: string): Promise<EnhancedSearchResult> {
    if (query.trim().length === 0) {
        return { results: [], temporalFilter: null }
    }

    // Parse any temporal expressions from the query
    const temporalFilter = parseTemporalQuery(query)

    // Use the cleaned query (with temporal terms removed) or original
    const searchQuery = temporalFilter?.query || query

    // If we have a temporal filter but no remaining query, just filter by time
    if (temporalFilter && (!searchQuery || searchQuery.trim().length === 0)) {
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
        semanticSearch(searchQuery),
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
 * Semantic search using embeddings
 */
async function semanticSearch(query: string): Promise<SearchResult[]> {
    try {
        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query)

        // Get all notes
        const allNotes = await getAllNotes()

        // Calculate similarity for each note
        const results: SearchResult[] = []

        for (const note of allNotes) {
            // Generate embedding for note if not already done
            let noteEmbedding: number[]

            if (note.embedding) {
                try {
                    noteEmbedding = JSON.parse(note.embedding)
                } catch {
                    // Invalid embedding, regenerate
                    noteEmbedding = await generateEmbedding(note.content)
                    await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) })
                }
            } else {
                // Generate and store embedding
                noteEmbedding = await generateEmbedding(note.content)
                await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) })
            }

            // Calculate similarity
            const similarity = cosineSimilarity(queryEmbedding, noteEmbedding)

            // Only include if similarity is above threshold
            if (similarity > 0.3) {
                results.push({
                    ...note,
                    relevanceScore: similarity,
                    matchType: "semantic",
                })
            }
        }

        // Sort by relevance
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    } catch (error) {
        console.error("Semantic search failed:", error)
        return []
    }
}

/**
 * Keyword search with relevance scoring
 */
async function keywordSearchWithScoring(query: string): Promise<SearchResult[]> {
    try {
        const results = await keywordSearch(query)

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
export async function findRelatedNotes(noteId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
        const allNotes = await getAllNotes()
        const targetNote = allNotes.find((n) => n.id === noteId)

        if (!targetNote) {
            return []
        }

        // Get or generate target note embedding
        let targetEmbedding: number[]
        if (targetNote.embedding) {
            targetEmbedding = JSON.parse(targetNote.embedding)
        } else {
            targetEmbedding = await generateEmbedding(targetNote.content)
            await updateNote(noteId, { embedding: JSON.stringify(targetEmbedding) })
        }

        // Calculate similarity with all other notes
        const results: SearchResult[] = []

        for (const note of allNotes) {
            if (note.id === noteId) continue // Skip the target note itself

            let noteEmbedding: number[]
            if (note.embedding) {
                try {
                    noteEmbedding = JSON.parse(note.embedding)
                } catch {
                    noteEmbedding = await generateEmbedding(note.content)
                    await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) })
                }
            } else {
                noteEmbedding = await generateEmbedding(note.content)
                await updateNote(note.id, { embedding: JSON.stringify(noteEmbedding) })
            }

            const similarity = cosineSimilarity(targetEmbedding, noteEmbedding)

            if (similarity > 0.4) {
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
