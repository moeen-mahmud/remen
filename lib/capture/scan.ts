/**
 * Document scanning and OCR module
 *
 * Hardened for ExecutorTorch edge cases:
 * - Empty detections
 * - Partial / malformed outputs
 * - Zero-text scenarios
 */

import type { OCRBbox, OCRDetection, OCRModel } from "@/lib/ai/provider"
import { Directory, File, Paths } from "expo-file-system/next"

/* ---------------------------------- Types --------------------------------- */

export interface ScanResult {
    text: string
    blocks: TextBlock[]
    confidence: number
    savedImagePath?: string
    isEmpty?: boolean
}

export interface TextBlock {
    text: string
    isBullet: boolean
    isNumbered: boolean
    isHeading: boolean
    bbox?: OCRBbox[]
    score?: number
}

/* -------------------------------- Constants -------------------------------- */

const SCANS_DIR_NAME = "remen_scans"

/* ----------------------------- File Utilities ------------------------------ */

function getScansDirectory(): Directory {
    const scansDir = new Directory(Paths.document, SCANS_DIR_NAME)
    if (!scansDir.exists) {
        scansDir.create()
    }
    return scansDir
}

export async function saveScannedImage(tempPath: string): Promise<string> {
    const scansDir = getScansDirectory()
    const fileName = `remen_scan_${Date.now()}.jpg`

    const sourcePath = tempPath.startsWith("file://") ? tempPath.replace("file://", "") : tempPath

    const sourceFile = new File(sourcePath)
    const destFile = new File(scansDir, fileName)

    sourceFile.copy(destFile)
    return destFile.uri
}

export async function deleteScannedImage(imagePath: string): Promise<void> {
    try {
        const filePath = imagePath.startsWith("file://") ? imagePath.replace("file://", "") : imagePath

        const file = new File(filePath)
        if (file.exists) file.delete()
    } catch (error) {
        console.error("Failed to delete scanned image:", error)
    }
}

/* ----------------------------- BBox Utilities ------------------------------ */

function getBboxTopY(bbox?: OCRBbox[]): number {
    if (!bbox || bbox.length === 0) return 0
    return Math.min(...bbox.map((p) => Number(p?.y) || 0))
}

function getBboxBottomY(bbox?: OCRBbox[]): number {
    if (!bbox || bbox.length === 0) return 0
    return Math.max(...bbox.map((p) => Number(p?.y) || 0))
}

/* ----------------------------- Core OCR Logic ------------------------------ */

export async function processImageOCR(imagePath: string, ocrModel: OCRModel | null): Promise<ScanResult> {
    if (!ocrModel?.isReady) {
        throw new Error("OCR model not ready")
    }

    try {
        const rawDetections = await ocrModel.forward(imagePath)

        if (!Array.isArray(rawDetections) || rawDetections.length === 0) {
            return emptyScanResult()
        }

        return parseOCRDetections(rawDetections)
    } catch (error) {
        console.error("OCR inference failed:", error)
        return emptyScanResult()
    }
}

/* ---------------------------- Parsing & Safety ----------------------------- */

function parseOCRDetections(detections: OCRDetection[]): ScanResult {
    const validDetections = detections.filter((d) => {
        return typeof d?.text === "string" && d.text.trim().length > 0 && typeof d?.score === "number"
    })

    if (validDetections.length === 0) {
        return emptyScanResult()
    }

    const sorted = [...validDetections].sort((a, b) => getBboxTopY(a.bbox) - getBboxTopY(b.bbox))

    const blocks: TextBlock[] = sorted.map((d) => {
        const text = d.text.trim()

        return {
            text,
            isBullet: /^[•\-*]\s+/.test(text),
            isNumbered: /^\d+[.)]\s+/.test(text),
            isHeading: text.length > 3 && text.length < 60 && text === text.toUpperCase(),
            bbox: d.bbox,
            score: d.score,
        }
    })

    const fullText = blocks.map((b) => b.text).join("\n")

    const confidence = validDetections.reduce((sum, d) => sum + d.score, 0) / validDetections.length

    return {
        text: fullText,
        blocks,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        isEmpty: false,
    }
}

/* --------------------------- Empty Result Model ---------------------------- */

function emptyScanResult(): ScanResult {
    return {
        text: "",
        blocks: [],
        confidence: 0,
        isEmpty: true,
    }
}

/* ----------------------------- Text Formatting ----------------------------- */

export function formatOCRText(result: ScanResult): string {
    if (result.isEmpty || result.blocks.length === 0) return ""

    return result.blocks
        .map((block) => {
            if (block.isHeading) return `## ${block.text}`
            return block.text
        })
        .join("\n\n")
}

/* ----------------------------- Heuristics ---------------------------------- */

export function isLikelyDocument(result: ScanResult): boolean {
    if (result.isEmpty) return false

    const lines = result.text.split("\n").filter((l) => l.trim().length > 0)

    return lines.length >= 3 && result.confidence >= 0.5
}

/* ------------------------- Paragraph Grouping ------------------------------ */

export function groupBlocksIntoParagraphs(blocks: TextBlock[]): TextBlock[][] {
    if (!blocks || blocks.length === 0) return []

    const paragraphs: TextBlock[][] = []
    let current: TextBlock[] = [blocks[0]]

    for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1]
        const curr = blocks[i]

        if (prev.bbox && curr.bbox) {
            const prevTop = getBboxTopY(prev.bbox)
            const prevBottom = getBboxBottomY(prev.bbox)
            const currTop = getBboxTopY(curr.bbox)

            const lineHeight = prevBottom - prevTop
            const gap = currTop - prevBottom

            if (lineHeight > 0 && gap < lineHeight * 1.5) {
                current.push(curr)
            } else {
                paragraphs.push(current)
                current = [curr]
            }
        } else {
            current.push(curr)
        }
    }

    paragraphs.push(current)
    return paragraphs
}
