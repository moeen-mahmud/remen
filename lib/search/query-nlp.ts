import { normalizeText } from "@/lib/utils/functions";

export interface ProcessedQuery {
    original: string;
    normalized: string;
    keywordQuery: string;
    keywords: string[];
}

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

export function processSearchQuery(query: string): ProcessedQuery {
    const original = query;
    const normalized = normalizeText(query);

    const tokens = normalized.split(" ").filter(Boolean);

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
