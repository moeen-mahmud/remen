---
name: remen-search
description: Remen search and retrieval system — semantic search, keyword search, temporal parsing, query NLP, and result ranking.
version: 1.0.0
---

# Remen Search & Retrieval

The search system is the core UX differentiator: "capture messy, retrieve smart."

## Architecture

```
lib/search/
  search.ts            — Main search orchestrator
  search.types.ts      — SearchResult, EnhancedSearchResult, TemporalFilter
  query-nlp.ts         — Query preprocessing, stopword removal, keyword extraction
  temporal-parser.ts   — "last week", "yesterday", "in March" → date ranges

lib/ask-notes/         — DEPRECATED. Being replaced with enhanced query-nlp.
  ask-notes.ts         — LLM-based query interpretation (unreliable with small models)
```

## Search Modes

### 1. Semantic Search (embeddings)
- Generates query embedding via MiniLM model.
- Computes cosine similarity against all notes' stored embeddings.
- Threshold: 0.25 (neural), 0.2 (fallback).
- Handles dimension mismatch (regenerates stale 256-dim fallback embeddings on the fly).
- This is the PRIMARY search mode — it's what makes "find my recipe from last month" work.

### 2. Keyword Search (SQL LIKE)
- Simple `content LIKE %term% OR title LIKE %term%` in SQLite.
- Scoring: title match = +0.4, content match = +0.1 per occurrence (capped at 0.5).
- Should also search tag names (JOIN note_tags/tags).

### 3. Temporal Search
- `temporal-parser.ts` extracts date ranges from queries.
- Patterns: "yesterday", "last week", "3 days ago", "in March", "this month".
- Returns `TemporalFilter { startTime, endTime, description, query }`.
- The `query` field is the input with temporal phrases stripped out.
- Temporal-only queries (e.g., "what I wrote last week") rank by created > edited > recency.

### 4. Combined (searchNotesEnhanced)
- Extracts temporal filter first.
- Runs semantic + keyword in parallel.
- Merges results (deduplication by note ID).
- Applies temporal filter to merged results.
- Returns top 50.

## Result Types

```typescript
SearchResult extends Note {
    relevanceScore: number;
    matchType: "semantic" | "keyword" | "both";
}

EnhancedSearchResult {
    results: SearchResult[];
    temporalFilter: TemporalFilter | null;
    interpretedQuery?: string;
}
```

## Merge Strategy
- When a note matches both semantic and keyword: take `Math.max(scores) + 0.15` bonus, matchType = "both".
- Apply recency boost: `0.1 * max(0, 1 - age_in_days / 30)`.
- Sort by relevanceScore descending.

## Related Notes
- `findRelatedNotes(noteId, limit)` — cosine similarity between a note and all others.
- Threshold: 0.3 (neural), 0.25 (fallback).
- Returns top `limit` results.

## Rules
- NEVER use the LLM in the search hot path. Search must be instant.
- Embeddings model is the backbone — it's always loaded and ready.
- Temporal parsing is deterministic (regex-based), NOT LLM-based.
- Query preprocessing in `query-nlp.ts` handles stopwords, quoted phrases, and normalization.
- All search functions filter out `is_archived = 1` and `is_deleted = 1` by default.
- Constants and regex patterns in `lib/config/regex-patterns.ts` and `lib/consts/consts.ts`.
