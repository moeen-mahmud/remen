---
name: remen-ai-pipeline
description: On-device AI processing pipeline for Remen — model lifecycle, LLM prompts, tag/title/classify generation, queue management, and react-native-executorch integration.
version: 1.0.0
---

# Remen AI Pipeline

You are working on the on-device AI system for Remen, a privacy-focused iOS notes app. All AI runs on-device via `react-native-executorch`. No cloud LLMs.

## Architecture Overview

```
AIProvider (lib/ai/provider.tsx)
  └─ Wraps entire app at root layout (_layout.tsx)
  └─ Provides model access via React Context

AI Queue (lib/ai/queue.ts)
  └─ Singleton: aiQueue
  └─ Owns LLM lifecycle (load on demand, unload when idle)
  └─ Processes notes: classify → title → tags → embedding
  └─ Pending queue for notes being actively edited

Modules:
  lib/ai/classify.ts   — Note type classification (one-word output)
  lib/ai/title.ts      — Title generation (short descriptive title)
  lib/ai/tags.ts        — Tag extraction (comma-separated words)
  lib/ai/embeddings.ts  — Neural embeddings + TF-IDF fallback
  lib/ai/queue.ts       — Processing queue with cancel support
  lib/ai/provider.tsx   — React context + model initialization
  lib/ai/ai.types.ts    — Type definitions
```

## Models

| Model | Purpose | Size | Loaded When |
|-------|---------|------|-------------|
| SMOLLM 2.1 (135M or 360M quantized) | LLM: titles, tags, classify | ~270-500MB | On demand by queue |
| ALL-MINILM-L6-V2 | Embeddings: semantic search | ~91MB | App start (always) |

## Critical Rules

### Prompts for Small Models
- Keep prompts SHORT. Template-style: `"Note: {content}\nTitle:"` — not multi-paragraph instructions.
- The 135M/360M model cannot follow complex instructions. Fewer words = better output.
- Always use `configure({ temperature: 0.3, topp: 0.9 })` for deterministic output.
- Content preview: use `AI_CONTENT_PREVIEW_LENGTH` (250 chars) from `lib/consts/consts.ts`.

### Output Parsing
- Always take first line only from LLM output.
- Strip common prefixes: "Title:", "Tags:", "Type:", "Category:", etc.
- Handle numbered lists (`1. tag`) and bullet points.
- Every AI module MUST have a rule-based fallback that works without the LLM.

### Queue Behavior
- Notes from the editor go to `pendingQueue` and process when user leaves the editing page.
- The queue checks `isCancelled()` between each step.
- Use `waitForModel()` between LLM operations (polls at 50ms), NOT `setTimeout`.
- Embeddings run in parallel with LLM operations.

### Model Lifecycle (v0.8.x target)
- Embeddings: loaded eagerly at app start, stays in RAM.
- LLM: loaded by queue when work arrives via `LLMModule.fromModelName()`.
- LLM: unloaded after 30s idle via `llm.delete()` to free RAM.
- Call `interrupt()` before `delete()` if model was generating.
- Model `.pte` files live on disk permanently. Only inference state uses RAM.

### File Conventions
- AI modules export from `lib/ai/index.ts` (barrel file).
- Types in `lib/ai/ai.types.ts`.
- Constants in `lib/consts/consts.ts` (AI_OPERATION_DELAY, AI_CONTENT_PREVIEW_LENGTH, NEURAL_EMBEDDING_DIM, etc.).
- Each AI module (classify, title, tags) follows the same pattern: build prompt → call LLM → parse output → validate → fallback.

## What NOT To Do
- Never add cloud/API-based AI. Privacy is non-negotiable.
- Never load all models at app start simultaneously.
- Never use `setTimeout` for delays between AI operations — use `waitForModel()`.
- Never trust LLM output without validation and fallback.
- Never ask the small LLM to generate structured JSON — it can't do it reliably.
