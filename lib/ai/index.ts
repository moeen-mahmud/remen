export { classifyNoteType, getNoteTypeBadge } from "./classify";
export {
    cosineSimilarity,
    FALLBACK_EMBEDDING_DIM,
    generateEmbedding,
    isNeuralEmbedding,
    NEURAL_EMBEDDING_DIM,
} from "./embeddings";
export { AIProvider, useAI, useAIEmbeddings, useAILLM, useAIOCR } from "./provider";
export type { AIContextType, EmbeddingsModel, LLMModel, Message, OCRDetection, OCRModel } from "./provider";
export { aiQueue } from "./queue";
export type { AIModels, NoteJob } from "./queue";
export { extractTags } from "./tags";
export { generateTitle } from "./title";
