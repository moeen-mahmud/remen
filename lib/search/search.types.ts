import { Note } from "@/lib/database/database.types";

export interface SearchResult extends Note {
    relevanceScore: number;
    matchType: "semantic" | "keyword" | "both";
}

export interface EnhancedSearchResult {
    results: SearchResult[];
    temporalFilter: TemporalFilter | null;
    interpretedQuery?: string; // For LLM-interpreted queries
}

export interface TemporalFilter {
    startTime: number;
    endTime: number;
    description: string;
    query: string; // The remaining query after extracting temporal info
}
