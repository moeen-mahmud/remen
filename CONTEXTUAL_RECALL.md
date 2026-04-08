# Contextual Recall — Killer Feature

## Context

All 8 phases of the "Make Remen's AI Feel Alive" plan shipped successfully (2026-04-07). The AI pipeline is stable: queue-managed LLM (360M/135M fallback, load-on-demand), always-on MiniLM embeddings, simplified prompts, fast processing, enriched embeddings, 3-layer NL search. The `react-native-executorch` package was upgraded to latest.

**Now:** Add one killer feature that differentiates Remen — **Contextual Recall**. While the user is writing or editing a note, the app silently surfaces related notes they've written before. No buttons, no search — it just appears. "You wrote about this before."

This works because every note already has a pre-computed 384-dimension embedding (from MiniLM). The embeddings model is always loaded in memory. Cosine similarity between two vectors is pure math — no model inference, near-instant. The only inference call is generating one embedding for the current editor content.

---

## Design Principles

1. **Zero friction** — appears automatically, dismissible, never blocks editing
2. **No model contention** — only calls `embeddings.forward()` (always loaded), never the LLM
3. **Battery-friendly** — 3-second debounce, skip if content hasn't meaningfully changed, skip if model busy
4. **Lightweight** — pure cosine similarity against pre-computed embeddings, no DB queries for search

---

## Architecture

```
Editor typing → useDebouncedValue(content, 3000)
  → useContextualRecall hook
    → Skip if < 30 chars or model busy
    → embeddings.forward(content) → live embedding (384-dim)
    → Compare against all notes' stored embeddings (cosine similarity)
    → Filter: score > 0.35, exclude self, take top 3
    → Return related notes
  → ContextualRecallTray component (collapsible, above keyboard)
```

---

## Implementation

### Step 1: New Hook — `lib/hooks/use-contextual-recall.ts`

~100 lines. Core logic:

```typescript
export function useContextualRecall(
    noteId: string | null,
    content: string,
    embeddingsModel: EmbeddingsModel | null,
): { relatedNotes: Note[]; isDismissed: boolean; dismiss: () => void; restore: () => void }
```

**Internal flow:**
1. `useDebouncedValue(content, 3000)` — wait 3s after last keystroke
2. Guard: skip if `debouncedContent.length < 30` or `!embeddingsModel?.isReady` or `embeddingsModel.isGenerating`
3. **Change detection:** cache last embedding + content hash. If new content has cosine similarity > 0.95 with previous embedding, skip (user made trivial edits)
4. **Race protection:** increment abort counter before each call, check after `await`
5. Call `embeddingsModel.forward(debouncedContent)` → live 384-dim vector
6. Load all notes via `getAllNotes()` from `lib/database/database.ts`
7. For each note with a stored embedding: parse `JSON.parse(note.embedding)`, compute `cosineSimilarity(liveVec, storedVec)`
8. Filter: `score > 0.35`, exclude `noteId` (self), sort descending, take top 3
9. Return `{ relatedNotes, isDismissed, dismiss, restore }`

**Why NOT reuse `findRelatedNotes()`:** That function takes a `noteId` and fetches/generates the stored embedding for that note. We need a fresh embedding from live editor content that hasn't been saved yet.

**Why call `embeddingsModel.forward()` directly (not `generateEmbedding()`):** The `generateEmbedding()` helper falls back to a TF-IDF hash (256 dims) when the model is busy. That would fail cosine similarity against stored 384-dim neural embeddings (dimension mismatch). We want neural-only — if the model is busy, skip silently.

**Key reuse:**
- `useDebouncedValue` from `lib/hooks/use-debounce.ts`
- `cosineSimilarity` from `lib/ai/embeddings.ts`
- `getAllNotes` from `lib/database/database.ts`
- `EmbeddingsModel` type from `lib/ai/ai.types.ts`

### Step 2: New Component — `components/editor/contextual-recall-tray.tsx`

~80 lines. Renders below the editor TextInput, above the keyboard.

**Props:**
```typescript
interface ContextualRecallTrayProps {
    notes: Note[];
    onNotePress: (note: Note) => void;
    onDismiss: () => void;
}
```

**UI:**
- Collapsible container with subtle background (matches editor theme)
- Header: "Related" label + dismiss (X) button
- Horizontal `FlatList` of compact note cards (title + 1-line preview)
- Each card is tappable → navigates to that note
- Smooth `LayoutAnimation` on appear/disappear
- Only renders when `notes.length > 0`

**Reuse from existing codebase:**
- `renderDisplayTitle()` from `components/notes/note-card-helper.tsx`
- `renderPreview()` from `components/notes/note-card-helper.tsx`
- `useTheme()` for colors
- Does NOT reuse `RelatedNoteCard` — that's a vertical list for the detail page. The tray needs a horizontal compact layout.

### Step 3: Wire Into Editor — `components/editor/index.tsx`

~15 lines of changes. No structural refactor.

**Changes:**
1. Import `useContextualRecall` and `ContextualRecallTray`
2. Import `useAI` to get `embeddings`
3. Call `useContextualRecall(noteId, content, embeddings)` — `content` is already tracked in state
4. Add `<ContextualRecallTray>` below the `<TextInput>` inside the `<ScrollView>`
5. `onNotePress` → `router.push(`/notes/${note.id}`)` to view the related note
6. `onDismiss` → calls `dismiss()` from the hook

**No changes to:** `app/edit/[id].tsx`, `EditorHeader`, `PageWrapper`, or any other component.

---

## Critical Files

| File | Action |
|------|--------|
| `lib/hooks/use-contextual-recall.ts` | **Create** — new hook (~100 lines) |
| `components/editor/contextual-recall-tray.tsx` | **Create** — new component (~80 lines) |
| `components/editor/index.tsx` | **Modify** — wire hook + tray (~15 lines added) |

**Existing code reused (no changes needed):**
| File | What's reused |
|------|---------------|
| `lib/hooks/use-debounce.ts` | `useDebouncedValue(value, delay)` |
| `lib/ai/embeddings.ts` | `cosineSimilarity(vecA, vecB)` |
| `lib/database/database.ts` | `getAllNotes()` |
| `lib/ai/ai.types.ts` | `EmbeddingsModel` interface |
| `components/notes/note-card-helper.tsx` | `renderDisplayTitle()`, `renderPreview()` |

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| New note (no noteId yet) | Hook still works — excludes nothing from results |
| Content < 30 chars | Skip — not enough signal for meaningful embedding |
| Model is generating (busy) | Skip silently — try again on next debounce |
| Trivial edit (cosine > 0.95 with previous) | Skip — same meaning, no need to recompute |
| No notes have embeddings yet | Empty results — tray doesn't render |
| Dimension mismatch (old TF-IDF embeddings) | `cosineSimilarity` warns + returns 0 — filtered out |
| User dismisses tray | Stays dismissed until content changes significantly |
| User navigates away mid-computation | Abort counter prevents stale state update |
| AI queue processing while editing | No contention — embeddings model handles concurrent reads, and the hook checks `isGenerating` |

---

## Verification

1. `bun type-check` — no TypeScript errors
2. `bun lint` — passes
3. `bun prebuild:clean && bun ios` — builds and runs
4. **Manual test flow:**
   - Write 3+ notes on different topics (e.g., "work meeting about Q3 goals", "recipe for pasta carbonara", "ideas for birthday party")
   - Wait for AI processing to complete (tags + embeddings generated)
   - Open a new note, start typing about one of the topics (e.g., "planning for Q3...")
   - After ~3 seconds of pause, the Contextual Recall tray should appear with the related "work meeting" note
   - Tap a related note → navigates to it
   - Dismiss the tray → it disappears
   - Continue typing about a different topic → tray reappears with new suggestions
5. **Performance test:** Type rapidly for 10+ seconds — no lag, no model contention errors in console
6. **Empty state:** New app with 0 notes — no tray appears, no errors
