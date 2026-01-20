/**
 * Embeddings module for semantic search
 *
 * This module provides text embeddings for semantic similarity search.
 * Currently uses a simplified TF-IDF-like approach for React Native compatibility.
 * Can be upgraded to use proper neural embeddings (like MiniLM) when available.
 */

/**
 * Generate a simple embedding vector for text
 *
 * Uses a bag-of-words with TF-IDF-like weighting
 * This is a simplified approach that works offline and is fast.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    // Normalize and tokenize
    const tokens = tokenize(text)

    // Create a fixed-dimension vector using hash-based approach
    const embedding = new Array(256).fill(0)

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
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error("Vectors must have the same length")
    }

    let dotProduct = 0
    let magA = 0
    let magB = 0

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i]
        magA += vecA[i] * vecA[i]
        magB += vecB[i] * vecB[i]
    }

    const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
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
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "having",
    "do",
    "does",
    "did",
    "doing",
    "a",
    "an",
    "the",
    "and",
    "but",
    "if",
    "or",
    "because",
    "as",
    "until",
    "while",
    "of",
    "at",
    "by",
    "for",
    "with",
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
    "to",
    "from",
    "up",
    "down",
    "in",
    "out",
    "on",
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
