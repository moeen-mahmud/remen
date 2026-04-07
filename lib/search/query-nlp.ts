import { normalizeText } from "@/lib/utils/functions";

export interface ProcessedQuery {
    original: string;
    normalized: string;
    keywordQuery: string;
    keywords: string[];
}

// Natural language filler phrases to strip before search
// "What I was thinking about job switching" → "job switching"
// "Show me notes about React hooks" → "React hooks"
// "Find everything related to project deadlines" → "project deadlines"
const NL_FILLER_PATTERNS = [
    /^(what|where|when|how|why|which|who|show|find|search|get|give|tell)\s+(i|me|my|we|us|did|do|was|were|have|had|am)\b/i,
    /^(what\s+)?(i\s+)?(was|were|am|have been)\s+(thinking|writing|noting|working|talking|reading)\s+(about|on|regarding)\s*/i,
    /^(show|find|search|get|give|tell)\s+(me\s+)?(all\s+)?(my\s+)?(notes?|things?|stuff|everything|entries?|items?)\s*(about|on|regarding|related to|for|with)?\s*/i,
    /^(do\s+i\s+have\s+)?(any\s+)?(notes?|things?|stuff|entries?)\s*(about|on|regarding|related to|for|with)\s*/i,
    /^(everything|anything)\s+(i\s+)?(wrote|noted|captured|saved|recorded)\s*(about|on|regarding)?\s*/i,
    /^(what\s+)?(did\s+)?(i\s+)?(write|note|capture|save|record|think|say)\s*(about|on|regarding)?\s*/i,
    /^(notes?\s+)?(about|on|regarding|related to|for)\s+/i,
];

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
]);

/**
 * Strip natural language filler from the query.
 * "What I was thinking about job switching" → "job switching"
 */
export function stripNaturalLanguageFiller(query: string): string {
    let stripped = query.trim();
    for (const pattern of NL_FILLER_PATTERNS) {
        stripped = stripped.replace(pattern, "").trim();
    }
    return stripped || query.trim(); // If everything got stripped, use original
}

export function processSearchQuery(query: string): ProcessedQuery {
    const original = query;
    const normalized = normalizeText(query);

    // Strip NL filler before tokenizing
    const stripped = stripNaturalLanguageFiller(normalized);

    const tokens = stripped.split(" ").filter(Boolean);

    const quoted: string[] = [];
    const quoteMatches = original.match(/"([^"]{1,80})"/g) || [];
    for (const m of quoteMatches) {
        const inner = m.slice(1, -1).trim();
        if (inner) quoted.push(inner);
    }

    const keywords = tokens
        .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
        .filter((t, idx, arr) => arr.indexOf(t) === idx);

    const keywordQuery = [...quoted, ...keywords].join(" ").trim();

    return { original, normalized, keywordQuery, keywords };
}
