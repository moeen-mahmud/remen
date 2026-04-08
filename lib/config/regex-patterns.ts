// Word-to-number map for temporal parsing ("one hour ago" → 1)
const WORD_NUMS: Record<string, string> = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    a: "1",
    an: "1",
};
const WORD_NUM_PATTERN = Object.keys(WORD_NUMS).join("|");

export function normalizeWordNumbers(query: string): string {
    return query.replace(
        new RegExp(`\\b(${WORD_NUM_PATTERN})\\s+(hours?|hrs?|minutes?|mins?|days?|weeks?|months?)\\b`, "gi"),
        (_, word, unit) => `${WORD_NUMS[word.toLowerCase()] || word} ${unit}`,
    );
}

export const RELATIVE_TIME_PATTERNS = [
    // "2 hours ago", "30 minutes ago", etc.
    /(\d+)\s*(hours?|hrs?)\s*ago/i,
    /(\d+)\s*(minutes?|mins?)\s*ago/i,
    /(\d+)\s*(days?)\s*ago/i,
    /(\d+)\s*(weeks?)\s*ago/i,
    /(\d+)\s*(months?)\s*ago/i,
];

export const LAST_WEEK = /last\s+week/i;
export const LAST_WEEK_GLOBAL = /last\s+week/gi;

export const THIS_WEEK = /this\s+week/i;
export const THIS_WEEK_GLOBAL = /this\s+week/gi;

export const LAST_MONTH = /last\s+month/i;
export const LAST_MONTH_GLOBAL = /last\s+month/gi;

export const THIS_MONTH = /this\s+month/i;
export const THIS_MONTH_GLOBAL = /this\s+month/gi;

export const LAST_YEAR = /last\s+year/i;
export const LAST_YEAR_GLOBAL = /last\s+year/gi;

// Patterns that indicate the query is purely temporal (no content search needed)
// After temporal extraction, if remainder matches any of these → return all notes in time range
export const TEMPORAL_ONLY_PATTERNS = [
    /^what\s+(i\s+)?(wrote|was\s+thinking|thought|noted|saved|captured)\s*[?.]?\s*$/i,
    /^what\s+did\s+i\s+(write|note|save|capture|record)\s*[?.]?\s*$/i,
    /^what\s+did\s+i\s+(write|note)\s+down\s*[?.]?\s*$/i,
    /^notes?\s+(from|i\s+wrote)\s*[?.]?\s*$/i,
    /^(from|my\s+notes?)\s*[?.]?\s*$/i,
    // Single filler verbs left after stripping (e.g., "wrote" from "what I wrote 1 hour ago")
    /^(wrote|write|written|noted|saved|captured|recorded|thought|said|thinking)\s*[?.]?\s*$/i,
    // Empty or just punctuation
    /^[?.!\s]*$/,
];

export const TASK_PATTERNS = /^\s*-\s+\[[\sxX]\]\s+/;
