/**
 * Lightweight NLP-ish preprocessing for search queries.
 *
 * Goal: turn natural-language questions into stable search terms without requiring the LLM.
 */

export interface ProcessedQuery {
    original: string;
    normalized: string;
    keywordQuery: string;
    keywords: string[];
}

const STOPWORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "did",
    "do",
    "does",
    "for",
    "from",
    "have",
    "how",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "notes",
    "note",
    "of",
    "on",
    "or",
    "please",
    "show",
    "tell",
    "that",
    "the",
    "their",
    "this",
    "to",
    "was",
    "we",
    "what",
    "when",
    "where",
    "who",
    "why",
    "with",
    "you",
    "your",
    // common note-query filler verbs
    "write",
    "wrote",
    "written",
    "think",
    "thought",
    "thinking",
    "noted",
    "about",
    "regarding",
    "concerning",
]);

function normalizeText(q: string): string {
    return (
        q
            .trim()
            .toLowerCase()
            // keep letters/numbers/spaces/apostrophes; strip punctuation
            .replace(/[^a-z0-9\s']/g, " ")
            .replace(/\s+/g, " ")
            .trim()
    );
}

export function processSearchQuery(query: string): ProcessedQuery {
    const original = query;
    const normalized = normalizeText(query);

    const tokens = normalized.split(" ").filter(Boolean);

    // Preserve quoted phrases as-is (best-effort)
    const quoted: string[] = [];
    const quoteMatches = original.match(/"([^"]{1,80})"/g) || [];
    for (const m of quoteMatches) {
        const inner = m.slice(1, -1).trim();
        if (inner) quoted.push(inner);
    }

    const keywords = tokens
        .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
        // de-dupe while keeping order
        .filter((t, idx, arr) => arr.indexOf(t) === idx);

    const keywordQuery = [...quoted, ...keywords].join(" ").trim();

    return { original, normalized, keywordQuery, keywords };
}
