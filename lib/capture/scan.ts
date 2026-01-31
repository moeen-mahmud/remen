import type { OCRDetection, OCRModel } from "@/lib/ai/ai.types";
import { ScanResult, TextBlock } from "@/lib/capture/scan.types";
import { getBboxBottomY, getBboxTopY, getScansDirectory } from "@/lib/utils/scan-utils";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

export async function getScannedImageAsBase64(tempPath: string): Promise<string> {
    const localPath = tempPath.startsWith("file://") ? tempPath.replace("file://", "") : tempPath;
    const base64 = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
}

export async function saveScannedImage(tempPath: string): Promise<string> {
    const scansDir = getScansDirectory();
    const fileName = `remen_scan_${Date.now()}.jpg`;

    const sourcePath = tempPath.startsWith("file://") ? tempPath.replace("file://", "") : tempPath;

    const sourceFile = new File(sourcePath);
    const destFile = new File(scansDir, fileName);

    sourceFile.copy(destFile);
    return destFile.uri;
}

export async function deleteScannedImage(imagePath: string): Promise<void> {
    try {
        const filePath = imagePath.startsWith("file://") ? imagePath.replace("file://", "") : imagePath;

        const file = new File(filePath);
        if (file.exists) file.delete();
    } catch (error) {
        console.error("Failed to delete scanned image:", error);
    }
}

export async function processImageOCR(imagePath: string, ocrModel: OCRModel | null): Promise<ScanResult> {
    if (!ocrModel?.isReady) {
        throw new Error("OCR model not ready");
    }

    if (ocrModel.isGenerating) {
        throw new Error("OCR model is already processing another image");
    }

    try {
        console.log("🔍 [OCR] Processing image:", imagePath);

        // Ensure the path is properly formatted
        const cleanPath = imagePath.startsWith("file://") ? imagePath : `file://${imagePath}`;

        const rawDetections = await ocrModel.forward(cleanPath);

        if (!Array.isArray(rawDetections) || rawDetections.length === 0) {
            console.warn("⚠️ [OCR] No text detected in image");
            return emptyScanResult();
        }

        console.log(`✅ [OCR] Detected ${rawDetections.length} text regions`);
        return parseOCRDetections(rawDetections);
    } catch (error) {
        console.error("❌ [OCR] Inference failed:", error);
        // Re-throw with more context
        if (error instanceof Error) {
            throw new Error(`OCR processing failed: ${error.message}`);
        }
        throw error;
    }
}

function parseOCRDetections(detections: OCRDetection[]): ScanResult {
    const validDetections = detections.filter((d) => {
        return typeof d?.text === "string" && d.text.trim().length > 0 && typeof d?.score === "number";
    });

    if (validDetections.length === 0) {
        return emptyScanResult();
    }

    const sorted = [...validDetections].sort((a, b) => getBboxTopY(a.bbox) - getBboxTopY(b.bbox));

    const blocks: TextBlock[] = sorted.map((d) => {
        const text = d.text.trim();

        return {
            text,
            isBullet: /^[•\-*]\s+/.test(text),
            isNumbered: /^\d+[.)]\s+/.test(text),
            isHeading: text.length > 3 && text.length < 60 && text === text.toUpperCase(),
            bbox: d.bbox,
            score: d.score,
        };
    });

    const fullText = blocks.map((b) => b.text).join("\n");

    const confidence = validDetections.reduce((sum, d) => sum + d.score, 0) / validDetections.length;

    return {
        text: fullText,
        blocks,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        isEmpty: false,
    };
}

function emptyScanResult(): ScanResult {
    return {
        text: "",
        blocks: [],
        confidence: 0,
        isEmpty: true,
    };
}

export function formatOCRText(result: ScanResult): string {
    if (result.isEmpty || result.blocks.length === 0) return "";

    return result.blocks
        .map((block) => {
            if (block.isHeading) return `# ${block.text}`;
            return block.text;
        })
        .join("\n\n");
}

export function isLikelyDocument(result: ScanResult): boolean {
    if (result.isEmpty) return false;

    const lines = result.text.split("\n").filter((l) => l.trim().length > 0);

    return lines.length >= 3 && result.confidence >= 0.5;
}

export function groupBlocksIntoParagraphs(blocks: TextBlock[]): TextBlock[][] {
    if (!blocks || blocks.length === 0) return [];

    const paragraphs: TextBlock[][] = [];
    let current: TextBlock[] = [blocks[0]];

    for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1];
        const curr = blocks[i];

        if (prev.bbox && curr.bbox) {
            const prevTop = getBboxTopY(prev.bbox);
            const prevBottom = getBboxBottomY(prev.bbox);
            const currTop = getBboxTopY(curr.bbox);

            const lineHeight = prevBottom - prevTop;
            const gap = currTop - prevBottom;

            if (lineHeight > 0 && gap < lineHeight * 1.5) {
                current.push(curr);
            } else {
                paragraphs.push(current);
                current = [curr];
            }
        } else {
            current.push(curr);
        }
    }

    paragraphs.push(current);
    return paragraphs;
}
