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

export const TEMPORAL_ONLY_PATTERNS = [
    /^what\s+(i\s+)?(wrote|was\s+thinking|thought|noted)\s*[?.]?\s*$/i,
    /^what\s+did\s+i\s+(write|note)\s*[?.]?\s*$/i,
    /^what\s+did\s+i\s+(write|note)\s+down\s*[?.]?\s*$/i,
    /^notes?\s+(from|i\s+wrote)\s*[?.]?\s*$/i,
    /^(from|my\s+notes?)\s*[?.]?\s*$/i,
];

export const TASK_PATTERNS = /^\s*-\s+\[[\sxX]\]\s+/;
