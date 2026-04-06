# PLAN.md — Make Remen's AI Feel Alive

## Context

Remen's on-device AI uses SMOLLM 135M (LLM) + MiniLM-L6-V2 (embeddings) + OCR via `react-native-executorch@^0.6.0`. The 135M model produces inconsistent titles, tags, and classifications. Larger models crash the app. The OCR feature adds memory pressure without enough value. The retrieval system works but doesn't feel alive.

This plan optimizes the AI pipeline, redesigns model lifecycle management, upgrades the library, explores larger models, cuts OCR to free memory, and makes search/retrieval feel like a second brain.

---

## The Core Problem: Model Lifecycle & Memory

### What happens today (and why it's bad)

```
App Launch
  └─ AIProvider mounts (root layout, wraps ENTIRE app)
       ├─ useLLM({ model: SMOLLM2_1_135M })     ← loads immediately, stays in RAM forever
       ├─ useTextEmbeddings({ model: ALL_MINILM_L6_V2 }) ← loads immediately, stays in RAM forever
       └─ useOCR({ model: OCR_ENGLISH })          ← loads immediately, stays in RAM forever
                                                     (even if user never opens camera)
```

**Three models loaded at app start. Three models in RAM for the entire app session. No way to unload.**

The models sit in memory whether the user is actively writing, browsing notes, or the phone is in their pocket. This is why larger models crash — there's no headroom. The `.pte` model files are downloaded to disk (managed by the executorch library), but the loaded/inference-ready model state lives in RAM.

### What the current code does

| File | What it does | Problem |
|------|-------------|---------|
| `lib/ai/provider.tsx:78-88` | Calls `useLLM()`, `useTextEmbeddings()`, `useOCR()` at component mount | All 3 models load eagerly on every app launch |
| `lib/ai/provider.tsx:63` | `AIProvider` wraps entire app in `_layout.tsx:14` | Models never unmount, never release memory |
| `lib/ai/queue.ts:239` | Queue holds `this.models = { llm, embeddings }` | Models are cached references, not lifecycle-managed |
| `components/app-initializer.tsx:71` | Waits for `allModelsReady = llm && embeddings && ocr` | App "initializing" state blocks on ALL THREE models |
| `components/scan/scan-home.tsx:26` | `const { ocr } = useAI()` | OCR only needed in scan flow, but loaded globally |
| `lib/hooks/use-ai-processing-notes.ts:30` | Polls `aiQueue.getStatus()` every 1 second | Polling keeps queue references alive |

### Who actually needs what, and when

| Consumer | Needs LLM | Needs Embeddings | Needs OCR | When |
|----------|-----------|-------------------|-----------|------|
| AI Queue (background processing) | Yes (classify, title, tags) | Yes (embeddings) | No | After note is saved, user leaves editor |
| Search (`lib/search/search.ts`) | No (being removed) | Yes (semantic search) | No | When user searches |
| Scan flow (`components/scan/`) | No | No | Yes | Only when user opens camera |
| Editor (`components/editor/`) | Passes to queue | Passes to queue | No | Indirectly via queue |
| Note details (`components/notes/notes-details.tsx`) | No | Yes (related notes) | No | When viewing a note |

**Key insight:** The LLM is only needed during background AI processing. It does NOT need to be in RAM while the user is reading, searching, or browsing.

---

## Key Discovery: react-native-executorch v0.8.x

The project uses `^0.6.0`. Version **0.8.x** has the API features we need to fix the lifecycle problem:

### New Models Available
| Model | Params | Quantized Size | Notes |
|-------|--------|---------------|-------|
| **SMOLLM2_1_135M_QUANTIZED** | 135M | ~270MB | Current model |
| **SMOLLM2_1_360M_QUANTIZED** | 360M | ~500MB | 2.6x larger, same family |
| **SMOLLM2_1_1_7B_QUANTIZED** | 1.7B | ~1.2GB | May be too large |
| **Qwen 3 0.6B (8da4w)** | 0.6B | ~600MB | New in 0.8.x, strong instruct |
| **Qwen 2.5 0.5B (8da4w)** | 0.5B | ~500MB | Solid instruction following |
| **Hammer 2.1 0.5B** | 0.5B | ~500MB | Optimized for tool calling |

### New API Features That Fix Our Lifecycle Problem
| Feature | What it does | How we use it |
|---------|-------------|---------------|
| **`preventLoad: true`** | Hook mounts but model stays on disk | LLM doesn't load until queue needs it |
| **`model.delete()`** | Frees model from RAM completely | Unload LLM after processing batch is done |
| **`LLMModule` class** | Imperative lifecycle (load/configure/generate/delete) | Queue manages LLM lifecycle directly, no hook needed |
| **`configure({ temperature, topp })`** | Control output randomness | `temperature: 0.3` → consistent titles/tags |
| **`interrupt()`** | Stop generation mid-stream | Kill runaway outputs early |
| **Token counting** | `getGeneratedTokenCount()`, `getPromptTokensCount()` | Monitor context usage |
| **`contextStrategy`** | Context window management | Prevent context overflow on small models |

### The New Model Lifecycle Design

```
App Launch
  └─ AIProvider mounts
       ├─ Embeddings: loaded eagerly (small, needed for search, stays in RAM)
       ├─ LLM: NOT loaded (preventLoad: true, or LLMModule not yet created)
       └─ OCR: REMOVED entirely
                                                     
User saves a note → note enters AI Queue
  └─ Queue detects: LLM not loaded
       ├─ Load LLM (SMOLLM 360M quantized)
       ├─ configure({ temperature: 0.3, topp: 0.9 })
       ├─ Process all queued notes (classify → title → tags)
       ├─ When queue is empty + idle for 30s:
       │    └─ llm.delete()  ← FREE RAM
       └─ Embeddings stay loaded (needed for search anytime)

User opens camera (future, if we ever re-add OCR)
  └─ Load OCR model on demand → process → delete
```

**Memory timeline with new design:**

```
                    Embeddings (~91MB)
App start ─────────────────────────────────────── always loaded
                    
                    LLM (~500MB for 360M quantized)
              ┌─────────────┐      ┌──────┐
              │ load → process → unload  │ load → ...
              └─────────────┘      └──────┘
Note saved ──^                     ^── Another note saved
              
                    OCR (REMOVED)
──────────────────────────────────────────── not loaded, freed ~200MB
```

**vs. current design:**
```
                    Embeddings (~91MB)
App start ─────────────────────────────────────── always loaded

                    LLM (~270MB for 135M)
App start ─────────────────────────────────────── always loaded (WASTED)

                    OCR (~200MB)
App start ─────────────────────────────────────── always loaded (WASTED)
```

### Where Model Files Live (Disk vs RAM)

The `.pte` model files are downloaded once to the device's filesystem (managed by executorch). This is **disk storage**, not RAM. What eats RAM is the **loaded model state** — the weights, buffers, and inference engine that gets created when you call `useLLM()` or `LLMModule.fromModelName()`.

- **Disk (permanent):** Model `.pte` files. Downloaded once. ~500MB for 360M quantized. Survives app restarts. No cost when model isn't loaded.
- **RAM (temporary):** Loaded inference state. Created on `load()` / `fromModelName()`. Freed on `delete()`. This is what crashes the app.

The optimization strategy is: **keep files on disk, only load into RAM when processing, unload when done.**

---

## Implementation Phases

### Phase 1: Fix the Broken Blacklists (Zero Risk, 30 min)

These are bugs that actively reject good AI output today.

#### 1a. Fix tag example blacklist
**File:** `lib/ai/tags.ts` lines 33-115

The `containsExampleTags` function has a `Set` with 110+ entries including massive copy-paste duplicates (lines 72-110 repeat "finance", "contact", "link", "code", "tutorial", "docs", "example" six times each). Legitimate tags like "team", "design", "planning", "work", "project", "coding", "gratitude" are blacklisted. The threshold of just 2 matches means most real tag sets get rejected.

**Change:** Gut the set down to only truly meta words: `"example"`, `"e.g"`, `"such-as"`, `"like-this"`. Raise threshold to 3.

#### 1b. Fix title example blacklist
**File:** `lib/ai/title.ts` lines 34-51

`isExampleTitle` rejects real titles like "Meeting Notes", "Design Review", "Team Sync", "Project Ideas" (lines 44-47).

**Change:** Remove lines 44-47 (the specific title patterns). Keep only the generic `/^example/i`, `/\bexample\b/i`, `/^e\.g\./i` patterns.

---

### Phase 2: Upgrade react-native-executorch & Redesign Model Lifecycle (Medium Risk, 2-3 hours)

This is the most impactful phase. We upgrade the library, redesign how models live in memory, and try a larger model.

#### 2a. Upgrade the package
```bash
bun add react-native-executorch@latest
bun prebuild:clean
```

#### 2b. Redesign AIProvider — Load-on-demand LLM
**File:** `lib/ai/provider.tsx`

The current provider loads all 3 models eagerly via React hooks at the root layout. The new design:

```typescript
// BEFORE: All models load on mount, live forever in RAM
const llmHook = useLLM({ model: SMOLLM2_1_135M });
const embeddingsHook = useTextEmbeddings({ model: ALL_MINILM_L6_V2 });
const ocrHook = useOCR({ model: OCR_ENGLISH });

// AFTER: Only embeddings load eagerly. LLM managed imperatively. OCR removed.
const embeddingsHook = useTextEmbeddings({ model: ALL_MINILM_L6_V2 });
// LLM lifecycle managed by the queue via LLMModule class (not a hook)
// OCR removed entirely
```

Key changes:
1. **Remove `useLLM()` hook** — replace with `LLMModule` class managed by the queue
2. **Remove `useOCR()` hook** — OCR is being cut
3. **Keep `useTextEmbeddings()` hook** — embeddings are small (~91MB) and needed for search anytime
4. **Simplify `AIContextType`** — remove `ocr`, change `llm` to expose load/unload status
5. **Don't block app initialization on LLM** — the app is usable immediately with just embeddings

**New AIProvider context shape:**
```typescript
interface AIContextType {
    embeddings: EmbeddingsModel | null;
    llmStatus: "unloaded" | "loading" | "ready" | "error";
    isInitializing: boolean;  // now only tracks embeddings
    overallProgress: number;  // now only tracks embeddings download
    error: string | null;
    hasMemoryError: boolean;
}
```

#### 2c. Move LLM lifecycle into the AI Queue
**File:** `lib/ai/queue.ts`

The queue becomes the **owner** of the LLM lifecycle. It loads the model when there's work to do and unloads it when idle.

```typescript
class AIProcessingQueue {
    private llmModule: LLMModule | null = null;
    private llmUnloadTimer: NodeJS.Timeout | null = null;
    private embeddings: EmbeddingsModel | null = null;  // still passed from provider
    
    private async ensureLLMLoaded(): Promise<LLMModule> {
        // Cancel any pending unload
        if (this.llmUnloadTimer) {
            clearTimeout(this.llmUnloadTimer);
            this.llmUnloadTimer = null;
        }
        
        if (this.llmModule) return this.llmModule;
        
        console.log("[Queue] Loading LLM...");
        try {
            this.llmModule = await LLMModule.fromModelName("SMOLLM2_1_360M_QUANTIZED");
            this.llmModule.configure({ temperature: 0.3, topp: 0.9 });
        } catch (error) {
            // Fallback to smaller model if 360M crashes
            console.warn("[Queue] 360M failed, falling back to 135M");
            this.llmModule = await LLMModule.fromModelName("SMOLLM2_1_135M_QUANTIZED");
            this.llmModule.configure({ temperature: 0.3, topp: 0.9 });
        }
        return this.llmModule;
    }
    
    private scheduleLLMUnload() {
        // Unload LLM after 30 seconds of idle to free RAM
        this.llmUnloadTimer = setTimeout(async () => {
            if (this.llmModule && !this.isProcessing && this.queue.length === 0) {
                console.log("[Queue] Unloading LLM (idle 30s)...");
                await this.llmModule.interrupt();
                await this.llmModule.delete();
                this.llmModule = null;
            }
        }, 30_000);
    }
    
    // Called in processNext() finally block:
    // if queue is empty → scheduleLLMUnload()
}
```

**What this changes:**
- LLM is NOT loaded on app start (saves ~270-500MB RAM at boot)
- LLM loads on first note processing (user might see a brief "organizing..." delay)
- LLM stays loaded while there are notes to process (no load/unload churn)
- LLM unloads after 30s idle → RAM freed for the rest of the app
- If a new note comes in while idle, LLM reloads (takes a few seconds)
- **Model file stays on disk** — only the inference state is loaded/unloaded

#### 2d. Update model download flow
**File:** `components/app-initializer.tsx`

Current: waits for `allModelsReady = llm && embeddings && ocr` (line 71). Blocks app on all 3.

New: only wait for embeddings. The LLM will be downloaded on first queue run (the download overlay can show a simpler state). The OCR download is removed entirely.

**File:** `components/model-download-overlay.tsx`

Remove OCR progress row. Change to show just embeddings progress. LLM download can be triggered later (or shown as "Language Model will download when first note is saved").

#### 2e. Try SMOLLM 360M quantized
Now that we've freed ~200MB (OCR removed) and the LLM only loads on demand (not competing with OCR for RAM at boot), we have headroom for the 360M model.

If 360M crashes on older devices, the fallback in `ensureLLMLoaded()` (shown above) catches the error and drops to 135M. Store which model succeeded in preferences so subsequent loads skip the failed attempt.

#### 2f. Update AI types
**File:** `lib/ai/ai.types.ts`

- Remove `OCRModel`, `OCRDetection`
- Add `LLMModule` imperative types (or import from executorch directly)
- Update `AIContextType` to remove `llm` and `ocr`, add `llmStatus`

#### 2g. Update consumers
All components that currently call `useAI()` to get `llm`:

| File | Current usage | New usage |
|------|--------------|-----------|
| `components/editor/index.tsx:32` | `const { llm, embeddings } = useAI()` | `const { embeddings } = useAI()` — editor doesn't call LLM directly, it passes to queue |
| `components/voice/voice-home.tsx:24` | `const { llm, embeddings } = useAI()` | `const { embeddings } = useAI()` — same, uses queue |
| `components/scan/scan-home.tsx:26` | `const { ocr, llm, embeddings } = useAI()` | `const { embeddings } = useAI()` — OCR removed, queue handles LLM |
| `components/scan/scan-camera.tsx:20` | `const { ocr } = useAI()` | Remove OCR usage entirely |
| `components/notes/notes-home.tsx:34-35` | `const { embeddings } = useAI(); const llm = useAILLM()` | `const { embeddings } = useAI()` — LLM used for askNotesSearch (being removed in Phase 7) |
| `components/notes/notes-details.tsx:36` | `const { embeddings } = useAI()` | No change — only uses embeddings |
| `components/settings/settings-home.tsx:24` | `const { llm, embeddings, ocr, ... } = useAI()` | Update to show llmStatus + embeddings status only |
| `components/app-initializer.tsx:18` | `const { llm, embeddings, ocr, ... } = useAI()` | `const { embeddings, llmStatus, ... } = useAI()` |

---

### Phase 3: Simplify Prompts (Low Risk, 2 hours)

Even with a larger model, simpler prompts = better output. Template-style "fill in the blank" prompts work best with small models.

#### 3a. Simplify title prompt
**File:** `lib/ai/title.ts` — replace `buildSystemPrompt` (lines 98-129)

```
Current: ~120 tokens of system instructions with type-specific guidance
New:     System: "Title generator. Output only a short title, nothing else."
         User: "Note: {first 250 chars}\nTitle:"
```

Remove type-specific guidance. The "Title:" suffix guides completion naturally.

#### 3b. Simplify tag prompt
**File:** `lib/ai/tags.ts` — replace `buildTagSystemPrompt` (lines 153-184)

```
New: System: "Tag extractor. Output 2-4 comma-separated topic words, nothing else."
     User: "Note: {first 250 chars}\nTags:"
```

#### 3c. Simplify classify prompt
**File:** `lib/ai/classify.ts` — replace prompt (lines 80-99)

```
New: System: "Classify this note as one word: meeting, task, idea, journal, reference, or note."
     User: "Note: {first 250 chars}\nType:"
```

#### 3d. Normalize content truncation
**File:** `lib/consts/consts.ts`

Add `AI_CONTENT_PREVIEW_LENGTH = 250` (250 instead of 200 since 360M has larger effective context). Use it in all three AI modules instead of the inconsistent 500/400/400 chars.

#### 3e. Better output parsing
- `title.ts`: Strip "Title:" prefix if the model echoes it back
- `tags.ts`: Handle numbered lists (`1. tag, 2. tag`) which small models sometimes produce
- Keep all existing fallback logic intact

---

### Phase 4: Speed Up the AI Queue (Low Risk, 1 hour)

Currently a single note has ~6 seconds of pure dead time.

#### 4a. Reduce pre-processing delay
**File:** `lib/ai/queue.ts` line 87-90

Change `setTimeout(..., 2000)` → `setTimeout(..., 300)`. The pending queue already handles debouncing for notes being edited.

#### 4b. Replace blind sleeps with waitForModel
**File:** `lib/ai/queue.ts` lines 269, 291

Replace:
```typescript
await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY));
```
With:
```typescript
await waitForModel(llm, 3000);
```

The `waitForModel` function (lines 26-40) polls at 50ms — starts next operation as soon as model is ready.

#### 4c. Reduce between-job delay
**File:** `lib/ai/queue.ts` line 213 — change to `setTimeout(..., 300)`.

#### 4d. Reduce the constant
**File:** `lib/consts/consts.ts` — change `AI_OPERATION_DELAY = 2000` → `AI_OPERATION_DELAY = 500`.

**Net effect:** Single note: ~8s → ~2-3s. Three notes: ~24s → ~8s.

---

### Phase 5: Cut OCR, Simplify Image Capture (Medium Risk, 3-4 hours)

Free device memory for the larger LLM. Simplify the scan UX.

#### 5a. Remove OCR model from AIProvider
**File:** `lib/ai/provider.tsx`

Remove `useOCR` hook. Remove `ocr` from context. This frees ~200MB+ of device memory — critical for running SMOLLM 360M.

**Update:** `lib/ai/ai.types.ts`, `lib/ai/index.ts` — remove OCR types and exports.

#### 5b. Add image_description column
**File:** `lib/database/database.ts`

Add migration:
```sql
ALTER TABLE notes ADD COLUMN image_description TEXT;
```

**File:** `lib/database/database.types.ts` — add `image_description: string | null` to `Note`, `NoteRow`, `UpdateNoteInput`.

#### 5c. Simplify scan flow
**Files:** `components/scan/scan-home.tsx`, `components/scan/scan-review.tsx`

New flow: Camera → Image preview + optional "What's this?" text input → Save.

Remove: OCR processing states, confidence display, extracted text review, model loading screen.

#### 5d. Add keyword expansion for scan notes in the AI queue
**File:** `lib/ai/queue.ts` — in `processNote()`

For scan notes with a caption:
```
System: "Expand this photo caption into searchable keywords, comma-separated."
User: "Caption: {caption}\nKeywords:"
```

Store in `image_description`. Generate embedding from `content + " " + image_description`.

#### 5e. Clean up scan utilities
**File:** `lib/capture/scan.ts`

Keep: `getScannedImageAsBase64()`, `saveScannedImage()`, `deleteScannedImage()`
Remove: `processImageOCR()`, `parseOCRDetections()`, `formatOCRText()`, `isLikelyDocument()`, `groupBlocksIntoParagraphs()`

---

### Phase 6: Enrich Embeddings and Search (Low Risk, 2 hours)

The embeddings model is the real star. Feed it richer input and fix how search uses it.

#### 6a. Enriched embedding input
**File:** `lib/ai/queue.ts` line 246

Move embedding generation to AFTER title and tags are generated. Generate from:
```typescript
`${title} ${content} ${tags.join(" ")} ${image_description || ""}`.trim()
```

#### 6b. Fix search result merging
**File:** `lib/search/search.ts` lines 253-280

Current: averages semantic + keyword scores (dilutes strong matches).
Change: `Math.max(semantic, keyword) + 0.15` for dual matches.

#### 6c. Add recency boost
**File:** `lib/search/search.ts`

After merging, apply: `0.1 * Math.max(0, 1 - (now - created_at) / (30 * 24 * 60 * 60 * 1000))`. Linear decay over 30 days.

#### 6d. Include tags in keyword search SQL
**File:** `lib/database/database.ts` lines 560-573

```sql
SELECT DISTINCT n.* FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
WHERE (n.content LIKE ? OR n.title LIKE ? OR t.name LIKE ?)
AND n.is_archived = 0 AND n.is_deleted = 0
ORDER BY n.created_at DESC
```

#### 6e. Remove low-confidence semantic fallback
**File:** `lib/search/search.ts` lines 179-200

Remove the fallback that returns top 5 below-threshold results. Returning irrelevant results is worse than returning nothing.

---

### Phase 7: Simplify Ask-Notes (Low Risk, 1 hour)

The 135M model cannot reliably generate JSON. Even 360M will struggle.

#### 7a. Remove LLM from the search path
**File:** `lib/search/search.ts` — `askNotesSearch()` (lines 282-354)

Replace LLM interpretation with enhanced query preprocessing. The temporal parser already handles time expressions. The embedding model already handles synonym expansion.

#### 7b. Enhance query-nlp.ts
**File:** `lib/search/query-nlp.ts`

Add question-word stripping: "what did I write about X" → "X". "find my notes on Y" → "Y". Add search-specific stopwords: "find", "show", "tell", "wrote", "notes".

#### 7c. Deprecate ask-notes module
**Files:** `lib/ask-notes/ask-notes.ts`, `lib/ask-notes/ask-notes.type.ts`

Remove or mark deprecated. All search goes through `searchNotesEnhanced()`.

---

### Phase 8: Make It Feel Alive — UX Polish (Low Risk, 3-4 hours)

#### 8a. Search-as-you-type
**File:** `components/notes/notes-home.tsx`

Use existing `useDebounce` hook (400ms). Trigger search on debounced query change. Keep submit for immediate.

#### 8b. Search suggestions when empty
When search bar focused but empty: show chips for "This week", "Ideas", "Tasks", + 2-3 recent tags from `getAllTags()`.

#### 8c. Related notes on home screen
Take most recently edited note, call `findRelatedNotes(id, 3)`. Show as horizontal scroll: "You might also be thinking about..."

#### 8d. "On this day" nudge
Query notes created ~365 days ago (±12 hours). Show subtle banner. Zero AI cost.

#### 8e. Fix "embedding" visibility in UI
Any user-facing text mentioning "embedding" → change to "organize" or "analyze".

---

## Implementation Order

| Step | Phase | What | Risk | Effort |
|------|-------|------|------|--------|
| 1 | Phase 1 | Fix broken blacklists | None | 30 min |
| 2 | Phase 2 | Upgrade to executorch 0.8.x + try 360M | Medium | 1-2 hrs |
| 3 | Phase 3 | Simplify prompts + add temperature config | Low | 2 hrs |
| 4 | Phase 4 | Speed up AI queue | Low | 1 hr |
| 5 | Phase 5 | Cut OCR, simplify scan | Medium | 3-4 hrs |
| 6 | Phase 6 | Enrich embeddings + fix search | Low | 2 hrs |
| 7 | Phase 7 | Kill ask-notes JSON | Low | 1 hr |
| 8 | Phase 8 | UX polish | Low | 3-4 hrs |

**Total estimated effort: ~14-17 hours across 8 independently shippable phases.**

Each phase should be tested on a real device before moving to the next. After Phase 2, verify the 360M model runs without crashes — this determines whether Phases 3-8 get a significant boost.

---

## Verification After Each Phase

1. `bun type-check` — no TypeScript errors
2. `bun lint` — passes
3. `bun prebuild:clean && bun ios` — app builds and runs
4. Create 3+ notes (text, voice, task) and verify:
   - Tags are generated and not rejected (Phase 1)
   - Model loads and generates output (Phase 2)
   - Titles/tags are more consistent with lower temperature (Phase 3)
   - Processing time feels faster (Phase 4)
   - Scan flow works with just image + caption (Phase 5)
   - Search finds notes by meaning + tags (Phase 6)
   - Natural language queries work without LLM (Phase 7)
   - Search-as-you-type, suggestions work (Phase 8)

---

## Critical Files Summary

| File | Phases |
|------|--------|
| `lib/ai/tags.ts` | 1a, 3b, 3e |
| `lib/ai/title.ts` | 1b, 3a, 3e |
| `lib/ai/classify.ts` | 3c |
| `lib/ai/queue.ts` | 4a-4c, 5d, 6a |
| `lib/ai/provider.tsx` | 2b, 5a |
| `lib/ai/ai.types.ts` | 2c, 5a |
| `lib/ai/index.ts` | 5a |
| `lib/consts/consts.ts` | 3d, 4d |
| `lib/database/database.ts` | 5b, 6d |
| `lib/database/database.types.ts` | 5b |
| `lib/search/search.ts` | 6b, 6c, 6e, 7a |
| `lib/search/query-nlp.ts` | 7b |
| `lib/capture/scan.ts` | 5e |
| `components/scan/*` | 5c |
| `components/notes/notes-home.tsx` | 8a-8d |
| `package.json` | 2a |

---

## The Big Picture

After all 8 phases:
- **Model:** SMOLLM 360M quantized (2.6x more capable) with temperature 0.3 for consistency, or 135M with same optimizations as fallback
- **Memory:** OCR model freed (~200MB+), more headroom for LLM
- **Speed:** Note processing from ~8s to ~2-3s
- **Quality:** Simpler prompts + lower temperature + fixed blacklists = dramatically better titles, tags, classification
- **Search:** Enriched embeddings (title+tags+content), fixed merge formula, recency boost, tag-aware keyword search, search-as-you-type
- **Capture:** Simplified scan (camera → caption → save), faster voice-to-note
- **UX:** Related notes, "On this day", search suggestions — the app proactively surfaces connections
- **Privacy:** 100% on-device. No cloud. The core value is preserved.
