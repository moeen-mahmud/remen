/**
 * Embeddings module for semantic search
 *
 * Uses MiniLM (ALL_MINILM_L6_V2) via ExecutorTorch for real neural embeddings.
 * Falls back to TF-IDF-like approach when the model isn't ready.
 *
 * MiniLM produces 384-dimensional embeddings, which provide much better
 * semantic similarity compared to the fallback 256-dim hash vectors.
 */

import type { EmbeddingsModel } from "./provider"

// Embedding dimensions
export const NEURAL_EMBEDDING_DIM = 384 // MiniLM output dimension
export const FALLBACK_EMBEDDING_DIM = 256 // TF-IDF fallback dimension

/**
 * Generate an embedding vector for text using AI
 */
export async function generateEmbedding(text: string, embeddingsModel: EmbeddingsModel | null): Promise<number[]> {
    // Try neural embeddings if model is ready and not busy
    if (embeddingsModel?.isReady && !embeddingsModel.isGenerating) {
        try {
            const embedding = await embeddingsModel.forward(text)
            console.log(`📊 [Embeddings] Neural embedding generated: ${embedding.length} dimensions`)
            return embedding
        } catch (error) {
            console.warn("⚠️ [Embeddings] Neural embedding generation failed, using fallback:", error)
        }
    } else {
        console.log(
            `📊 [Embeddings] Using fallback (model ready: ${embeddingsModel?.isReady || false}, generating: ${embeddingsModel?.isGenerating || false})`,
        )
    }

    // Fallback to TF-IDF-like approach
    const fallback = generateFallbackEmbedding(text)
    console.log(`📊 [Embeddings] Fallback embedding generated: ${fallback.length} dimensions`)
    return fallback
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Note: Dimension mismatch (e.g., 256 vs 384) will give poor results!
 * Always regenerate embeddings to match dimensions before comparing.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    // Warn about dimension mismatch - this will give poor results
    if (vecA.length !== vecB.length) {
        console.warn(`⚠️ [Embeddings] Dimension mismatch: ${vecA.length} vs ${vecB.length} - results may be poor`)
    }

    const minLen = Math.min(vecA.length, vecB.length)

    let dotProduct = 0
    let magA = 0
    let magB = 0

    for (let i = 0; i < minLen; i++) {
        dotProduct += vecA[i] * vecB[i]
        magA += vecA[i] * vecA[i]
        magB += vecB[i] * vecB[i]
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

/**
 * Check if an embedding is from neural model (384-dim) or fallback (256-dim)
 */
export function isNeuralEmbedding(embedding: number[]): boolean {
    return embedding.length === NEURAL_EMBEDDING_DIM
}

// ============= FALLBACK IMPLEMENTATION =============

/**
 * Generate a fallback embedding using TF-IDF-like approach
 * Used when neural model isn't ready
 */
function generateFallbackEmbedding(text: string): number[] {
    // Normalize and tokenize
    const tokens = tokenize(text)

    // Create a fixed-dimension vector using hash-based approach
    const embedding = new Array(FALLBACK_EMBEDDING_DIM).fill(0)

    tokens.forEach((token, index) => {
        // Hash each token to a position in the vector
        const hash = hashToken(token)
        const position = hash % embedding.length

        // Weight by position (earlier words matter more for titles, etc.)
        const positionWeight = 1 / (1 + Math.log(index + 1))

        // Weight by term frequency
        const tfWeight = 1 + Math.log(tokens.filter((t) => t === token).length)

        embedding[position] += positionWeight * tfWeight
    })

    // Normalize the vector
    return normalizeVector(embedding)
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ") // Remove punctuation
        .split(/\s+/) // Split on whitespace
        .filter((word) => word.length >= 2) // Remove very short words
        .filter((word) => !STOP_WORDS.has(word)) // Remove stop words
}

/**
 * Simple hash function for tokens
 */
function hashToken(token: string): number {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
}

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vec: number[]): number[] {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0))
    if (magnitude === 0) return vec
    return vec.map((val) => val / magnitude)
}

/**
 * Common English stop words to filter out
 */
const STOP_WORDS = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "as",
    "is",
    "was",
    "are",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "i",
    "me",
    "my",
    "myself",
    "we",
    "our",
    "ours",
    "ourselves",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
    "he",
    "him",
    "his",
    "himself",
    "she",
    "her",
    "hers",
    "herself",
    "it",
    "its",
    "itself",
    "they",
    "them",
    "their",
    "theirs",
    "themselves",
    "what",
    "which",
    "who",
    "whom",
    "this",
    "that",
    "these",
    "those",
    "am",
    "being",
    "having",
    "doing",
    "if",
    "because",
    "until",
    "while",
    "about",
    "against",
    "between",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "up",
    "down",
    "out",
    "off",
    "over",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "just",
])
