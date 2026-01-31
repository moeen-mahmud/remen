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

export const AI_OPERATION_DELAY = 2000;

export const MAX_TITLE_LENGTH = 30;

export const AUTOSAVE_DELAY = 100;
