/**
 * Document scanning and OCR module
 *
 * Uses ExecutorTorch OCR for text recognition from images.
 * Provides image storage and text formatting utilities.
 */

import type { OCRBbox, OCRDetection, OCRModel } from "@/lib/ai/provider"
import { Directory, File, Paths } from "expo-file-system/next"

export interface ScanResult {
    text: string
    blocks: TextBlock[]
    confidence: number
    savedImagePath?: string
}

export interface TextBlock {
    text: string
    isBullet: boolean
    isNumbered: boolean
    isHeading: boolean
    bbox?: OCRBbox[]
    score?: number
}

// Directory for storing scanned images
const SCANS_DIR_NAME = "scans"

/**
 * Get or create the scans directory
 */
function getScansDirectory(): Directory {
    const scansDir = new Directory(Paths.document, SCANS_DIR_NAME)
    if (!scansDir.exists) {
        scansDir.create()
    }
    return scansDir
}

/**
 * Save scanned image to local filesystem
 */
export async function saveScannedImage(tempPath: string): Promise<string> {
    const scansDir = getScansDirectory()
    const fileName = `scan_${Date.now()}.jpg`

    // Create source file reference
    const sourcePath = tempPath.startsWith("file://") ? tempPath.replace("file://", "") : tempPath
    const sourceFile = new File(sourcePath)

    // Create destination file and copy
    const destFile = new File(scansDir, fileName)
    sourceFile.copy(destFile)

    return destFile.uri
}

/**
 * Delete a scanned image
 */
export async function deleteScannedImage(imagePath: string): Promise<void> {
    try {
        const filePath = imagePath.startsWith("file://") ? imagePath.replace("file://", "") : imagePath
        const file = new File(filePath)
        if (file.exists) {
            file.delete()
        }
    } catch (error) {
        console.error("Failed to delete scanned image:", error)
    }
}

/**
 * Get the top-left Y coordinate from a bbox
 */
function getBboxTopY(bbox: OCRBbox[]): number {
    if (!bbox || bbox.length === 0) return 0
    // bbox is an array of {x, y} objects, get the minimum y
    return Math.min(...bbox.map((point) => point.y || 0))
}

/**
 * Get the bottom Y coordinate from a bbox
 */
function getBboxBottomY(bbox: OCRBbox[]): number {
    if (!bbox || bbox.length === 0) return 0
    // bbox is an array of {x, y} objects, get the maximum y
    return Math.max(...bbox.map((point) => point.y || 0))
}

/**
 * Process an image using ExecutorTorch OCR
 */
export async function processImageOCR(imagePath: string, ocrModel: OCRModel | null): Promise<ScanResult> {
    if (!ocrModel?.isReady) {
        throw new Error("OCR model not ready. Please wait for models to load.")
    }

    try {
        // Run OCR on the image
        const detections = await ocrModel.forward(imagePath)
        return parseOCRDetections(detections)
    } catch (error) {
        console.error("OCR processing failed:", error)
        throw new Error("Failed to process image. Please try again.")
    }
}

/**
 * Parse OCR detections into a structured format
 */
function parseOCRDetections(detections: OCRDetection[]): ScanResult {
    // Sort detections by vertical position (top to bottom)
    const sortedDetections = [...detections].sort((a, b) => {
        return getBboxTopY(a.bbox) - getBboxTopY(b.bbox)
    })

    const blocks: TextBlock[] = sortedDetections.map((detection) => {
        const text = detection.text.trim()
        return {
            text,
            isBullet: /^[•\-*]\s/.test(text),
            isNumbered: /^\d+[.)]\s/.test(text),
            isHeading: text.length < 60 && text === text.toUpperCase() && text.length > 3,
            bbox: detection.bbox,
            score: detection.score,
        }
    })

    // Combine all text
    const fullText = blocks.map((b) => b.text).join("\n")

    // Calculate average confidence from scores
    const avgConfidence =
        detections.length > 0 ? detections.reduce((sum, d) => sum + d.score, 0) / detections.length : 0

    return {
        text: fullText,
        blocks,
        confidence: avgConfidence,
    }
}

/**
 * Format OCR text with detected structure (bullets, numbers, headings)
 */
export function formatOCRText(result: ScanResult): string {
    return result.blocks
        .map((block) => {
            let text = block.text

            // Add markdown formatting for headings
            if (block.isHeading) {
                text = `## ${text}`
            }

            // Keep bullet and numbered formatting
            return text
        })
        .join("\n\n")
}

/**
 * Detect if the image appears to be a document
 */
export function isLikelyDocument(result: ScanResult): boolean {
    // Documents typically have multiple lines of text
    const lineCount = result.text.split("\n").filter((l) => l.trim().length > 0).length
    return lineCount >= 3 && result.confidence > 0.6
}

/**
 * Group text blocks by proximity (for paragraph detection)
 */
export function groupBlocksIntoParagraphs(blocks: TextBlock[]): TextBlock[][] {
    if (blocks.length === 0) return []

    const paragraphs: TextBlock[][] = []
    let currentParagraph: TextBlock[] = [blocks[0]]

    for (let i = 1; i < blocks.length; i++) {
        const prevBlock = blocks[i - 1]
        const currBlock = blocks[i]

        // Check if blocks are close vertically (same paragraph)
        if (prevBlock.bbox && currBlock.bbox) {
            const prevBottom = getBboxBottomY(prevBlock.bbox)
            const currTop = getBboxTopY(currBlock.bbox)
            const prevTop = getBboxTopY(prevBlock.bbox)

            const verticalGap = currTop - prevBottom
            const lineHeight = prevBottom - prevTop // height of previous block

            // If gap is less than 1.5x line height, consider same paragraph
            if (lineHeight > 0 && verticalGap < lineHeight * 1.5) {
                currentParagraph.push(currBlock)
            } else {
                paragraphs.push(currentParagraph)
                currentParagraph = [currBlock]
            }
        } else {
            // No bbox info, just add to current paragraph
            currentParagraph.push(currBlock)
        }
    }

    // Don't forget the last paragraph
    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph)
    }

    return paragraphs
}
