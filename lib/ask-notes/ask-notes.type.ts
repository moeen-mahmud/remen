export interface AskNotesResult {
    searchTerms: string[];
    temporalHint: string | null;
    topics: string[];
    interpretedQuery: string;
}
