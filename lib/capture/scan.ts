import TextRecognition, { type TextRecognitionResult } from "@react-native-ml-kit/text-recognition"

export interface ScanResult {
    text: string
    blocks: TextBlock[]
    confidence: number
}

export interface TextBlock {
    text: string
    isBullet: boolean
    isNumbered: boolean
    isHeading: boolean
}

/**
 * Process an image using ML Kit OCR
 */
export async function processImageOCR(imagePath: string): Promise<ScanResult> {
    try {
        const result = await TextRecognition.recognize(imagePath)
        return parseOCRResult(result)
    } catch (error) {
        console.error("OCR processing failed:", error)
        throw new Error("Failed to process image. Please try again.")
    }
}

/**
 * Parse OCR result into a structured format
 */
function parseOCRResult(result: TextRecognitionResult): ScanResult {
    const blocks: TextBlock[] = result.blocks.map((block) => {
        const text = block.text.trim()
        return {
            text,
            isBullet: /^[•\-*]\s/.test(text),
            isNumbered: /^\d+[.)]\s/.test(text),
            isHeading: text.length < 60 && text === text.toUpperCase() && text.length > 3,
        }
    })

    // Use a default confidence since ML Kit doesn't always expose element-level confidence
    // The presence of recognized text with multiple blocks indicates good quality
    const avgConfidence = blocks.length > 0 ? Math.min(0.8 + blocks.length * 0.02, 0.98) : 0.5

    return {
        text: result.text,
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
