export const SCANS_DIR_NAME = "remen_scans";
export const BACKUP_DIR = "remen-backup";
export const NOTES_FILE = "notes.json";
export const BACKUP_PATH = `${BACKUP_DIR}/${NOTES_FILE}`;
export const PREFERENCES_KEY = "@remen_preferences";

export const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const MONTHS = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
];
export const TEMPORAL_KEYWORDS = [
    "yesterday",
    "today",
    "ago",
    "last",
    "this",
    "week",
    "month",
    "year",
    "hours?",
    "minutes?",
    "days?",
    ...DAYS,
    ...MONTHS,
];

export const NEURAL_EMBEDDING_DIM = 384;
export const FALLBACK_EMBEDDING_DIM = 256;
export const AI_OPERATION_DELAY = 500;
export const AI_CONTENT_PREVIEW_LENGTH = 500;
export const MAX_TITLE_LENGTH = 60;
export const AUTOSAVE_DELAY = 100;

export const MAX_PERMANENTLY_DELETED_IDS = 2000;

export const NUM_BARS = 5;
export const BAR_DELAYS = [0, 100, 200, 100, 0];

export const SIZES = {
    sm: { fontSize: 18, iconSize: 20, gap: 6 },
    md: { fontSize: 20, iconSize: 24, gap: 8 },
    lg: { fontSize: 32, iconSize: 36, gap: 10 },
};

export const DEBOUNCE_MS = 3000;
export const MIN_CONTENT_LENGTH = 30;
export const SIMILARITY_THRESHOLD = 0.35;
export const SKIP_SIMILARITY = 0.95; // Skip if content barely changed
export const MAX_RESULTS = 3;
export const AUTO_SYNC_DEBOUNCE = 15_000; // 15 seconds after last change

// Common filler words around type queries: "show me my task lists" → remove "my", "lists", "list", "all"
export const TYPE_FILLER = /\b(my|all|the|me|show|list|lists|every|recent)\b/gi;

export const NL_FILLER_PATTERNS = [
    /^(what|where|when|how|why|which|who|show|find|search|get|give|tell)\s+(i|me|my|we|us|did|do|was|were|have|had|am)\b/i,
    /^(what\s+)?(i\s+)?(was|were|am|have been)\s+(thinking|writing|noting|working|talking|reading)\s+(about|on|regarding)\s*/i,
    /^(show|find|search|get|give|tell)\s+(me\s+)?(all\s+)?(my\s+)?(notes?|things?|stuff|everything|entries?|items?)\s*(about|on|regarding|related to|for|with)?\s*/i,
    /^(do\s+i\s+have\s+)?(any\s+)?(notes?|things?|stuff|entries?)\s*(about|on|regarding|related to|for|with)\s*/i,
    /^(everything|anything)\s+(i\s+)?(wrote|noted|captured|saved|recorded)\s*(about|on|regarding)?\s*/i,
    /^(what\s+)?(did\s+)?(i\s+)?(write|note|capture|save|record|think|say)\s*(about|on|regarding)?\s*/i,
    /^(notes?\s+)?(about|on|regarding|related to|for)\s+/i,
];
