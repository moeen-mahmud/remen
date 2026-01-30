export type { AIContextType, EmbeddingsModel, LLMModel, Message, OCRDetection, OCRModel } from "./ai.types";
export { classifyNoteType, getNoteTypeBadge } from "./classify";
export { cosineSimilarity, generateEmbedding, isNeuralEmbedding } from "./embeddings";
export { AIProvider, useAI, useAIEmbeddings, useAILLM, useAIOCR } from "./provider";
export { aiQueue } from "./queue";
export type { AIModels, NoteJob } from "./queue";
export { extractTags } from "./tags";
export { generateTitle } from "./title";
// TODO: Add OCR model
