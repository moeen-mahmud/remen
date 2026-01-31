import { NoteType } from "@/lib/database/database.types";

// Types for the AI context
export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface OCRBbox {
    x: number;
    y: number;
}

export interface OCRDetection {
    bbox: OCRBbox[];
    text: string;
    score: number;
}

export interface LLMModel {
    generate: (messages: Message[]) => Promise<string>;
    isReady: boolean;
    isGenerating: boolean;
    error: string | null;
    downloadProgress: number;
}

export interface EmbeddingsModel {
    forward: (text: string) => Promise<number[]>;
    isReady: boolean;
    isGenerating: boolean;
    error: string | null;
    downloadProgress: number;
}

export interface OCRModel {
    forward: (imagePath: string) => Promise<OCRDetection[]>;
    isReady: boolean;
    isGenerating: boolean;
    error: string | null;
    downloadProgress: number;
}

export interface AIContextType {
    llm: LLMModel | null;
    embeddings: EmbeddingsModel | null;
    ocr: OCRModel | null;
    isInitializing: boolean;
    overallProgress: number;
    error: string | null;
    hasMemoryError: boolean;
}

export interface ClassificationResult {
    type: NoteType;
    confidence: number;
}
