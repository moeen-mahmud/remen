---
name: remen-executorch
description: react-native-executorch integration guide — model loading, API surface, lifecycle management, quantization, and device optimization for Remen.
version: 1.0.0
---

# react-native-executorch in Remen

Reference for the on-device ML runtime. Docs: https://docs.swmansion.com/react-native-executorch/

## Current State
- Package: `react-native-executorch@^0.6.0` (upgrading to 0.8.x)
- Models downloaded from HuggingFace on first app launch.
- Model `.pte` files stored on device filesystem (managed by library).
- RAM usage = loaded inference state (freed on `delete()`).

## Available Models (0.8.x)

### LLM (for title/tag/classify)
| Constant | Params | Quantization | Use Case |
|----------|--------|-------------|----------|
| `SMOLLM2_1_135M` | 135M | BF16 | Current, baseline |
| `SMOLLM2_1_135M_QUANTIZED` | 135M | 8da4w | Smaller RAM |
| `SMOLLM2_1_360M_QUANTIZED` | 360M | 8da4w | **Target upgrade** |
| `SMOLLM2_1_1_7B_QUANTIZED` | 1.7B | 8da4w | Likely too large |
| `QWEN3_0_6B_8DA4W` | 0.6B | 8da4w | Alternative |
| `QWEN2_5_0_5B_8DA4W` | 0.5B | 8da4w | Alternative |

### Embeddings
| Constant | Dims | Size |
|----------|------|------|
| `ALL_MINILM_L6_V2` | 384 | ~91MB |
| `ALL_MPNET_BASE_V2` | 768 | ~438MB |

## API Reference

### Hook API (declarative, for React components)
```typescript
// LLM
const llm = useLLM({ model: SMOLLM2_1_360M_QUANTIZED, preventLoad: true });
// Returns: isReady, isGenerating, downloadProgress, response, error
// Methods: generate(messages), sendMessage(text), configure(opts), interrupt()

// Embeddings
const embeddings = useTextEmbeddings({ model: ALL_MINILM_L6_V2 });
// Returns: isReady, isGenerating, downloadProgress, error
// Methods: forward(text) → Float32Array
```

### Class API (imperative, for queue/services)
```typescript
// Better for lifecycle management — use this in the AI queue
const llm = await LLMModule.fromModelName("SMOLLM2_1_360M_QUANTIZED");
llm.configure({ temperature: 0.3, topp: 0.9 });
const response = await llm.generate(messages);
await llm.interrupt();  // Must call before delete if generating
await llm.delete();     // Frees RAM

// Embeddings
const emb = await TextEmbeddingsModule.fromModelName("ALL_MINILM_L6_V2");
const vector = await emb.forward("some text");  // Float32Array
await emb.delete();
```

### configure() Options
```typescript
llm.configure({
    temperature: 0.3,       // Lower = more deterministic (0.0-2.0)
    topp: 0.9,              // Nucleus sampling threshold
    // contextStrategy,     // Context window management
});
```

### Token Counting
```typescript
llm.getGeneratedTokenCount();
llm.getPromptTokensCount();
llm.getTotalTokensCount();
```

## Lifecycle Strategy for Remen

```
EMBEDDINGS (always loaded):
  - Load at app start via useTextEmbeddings() hook in AIProvider.
  - Never unload — needed for search at any time.
  - ~91MB RAM footprint.

LLM (load on demand):
  - NOT loaded at app start.
  - Queue calls ensureLLMLoaded() when work arrives.
  - Uses LLMModule class API (imperative, not hook).
  - configure({ temperature: 0.3 }) immediately after load.
  - Unloads after 30s idle via scheduleLLMUnload().
  - Falls back 360M → 135M if larger model crashes.
  - Store successful model name in preferences.

OCR (removed):
  - Cut to free memory for larger LLM.
  - Scan flow uses optional user caption instead.
```

## Key Constraints
- No GPU/ANE backend selection for LLMs (XNNPACK only).
- No `maxTokens` or stop sequences — model generates until EOS.
- Quantization is baked into `.pte` file — cannot change at runtime.
- `preventLoad: true` on hook → model downloads but doesn't load into RAM.
- Must call `interrupt()` before `delete()` if model was generating.
- Downloads are managed by the library — provide model constant or HuggingFace URL.

## Troubleshooting
- `bad_alloc` error → device ran out of RAM. Try smaller model or unload other models first.
- `ModelGenerating` error → previous generation not complete. Use `waitForModel()` or `interrupt()`.
- Slow first load → model downloading from HuggingFace. Subsequent loads are from local `.pte` file.
