import { OCRBbox } from "@/lib/ai/ai.types";

export interface ScanResult {
    text: string;
    blocks: TextBlock[];
    confidence: number;
    savedImagePath?: string;
    isEmpty?: boolean;
}

export interface TextBlock {
    text: string;
    isBullet: boolean;
    isNumbered: boolean;
    isHeading: boolean;
    bbox?: OCRBbox[];
    score?: number;
}
