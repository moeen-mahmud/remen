/**
 * Generate a title for a note
 *
 * Uses SmolLM 360M via ExecutorTorch for intelligent title generation.
 * Falls back to rule-based extraction when the model isn't ready.
 */

import type { LLMModel, Message } from "./provider"

const MAX_TITLE_LENGTH = 50

/**
 * Generate a title for the given note content using AI
 */
export async function generateTitle(content: string, llm: LLMModel | null): Promise<string> {
    // Skip AI for very short content
    if (content.trim().length < 20) {
        return getFallbackTitle(content)
    }

    // Try AI generation if model is ready and not busy
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiTitle = await generateTitleWithAI(content, llm)
            if (aiTitle && aiTitle.length > 3) {
                return aiTitle
            }
        } catch (error) {
            console.warn("AI title generation failed, using fallback:", error)
        }
    }

    // Try rule-based title extraction (faster, no AI needed)
    const ruleBasedTitle = extractTitleFromContent(content)
    if (ruleBasedTitle) {
        return ruleBasedTitle
    }

    // Final fallback: first line truncated
    return getFallbackTitle(content)
}

/**
 * Generate title using LLM (SmolLM 360M via ExecutorTorch)
 */
async function generateTitleWithAI(content: string, llm: LLMModel): Promise<string | null> {
    const messages: Message[] = [
        {
            role: "system",
            content:
                "You are a title generator. Generate a concise, descriptive title (maximum 50 characters) for the given note. Return ONLY the title text, nothing else. No quotes, no explanation, just the title.",
        },
        {
            role: "user",
            content: content.substring(0, 500),
        },
    ]

    try {
        // generate() now returns the response directly
        const response = await llm.generate(messages)

        // Clean up the response
        let title = response
            .trim()
            .replace(/^["']|["']$/g, "") // Remove surrounding quotes
            .replace(/^Title:\s*/i, "") // Remove "Title:" prefix
            .replace(/\n.*/g, "") // Take only first line
            .trim()

        // Ensure it's within length limits
        if (title.length > MAX_TITLE_LENGTH) {
            // Try to break at a word boundary
            const truncated = title.substring(0, MAX_TITLE_LENGTH - 3)
            const lastSpace = truncated.lastIndexOf(" ")
            if (lastSpace > MAX_TITLE_LENGTH * 0.5) {
                title = truncated.substring(0, lastSpace) + "..."
            } else {
                title = truncated + "..."
            }
        }

        return title || null
    } catch (error) {
        console.error("LLM title generation error:", error)
        return null
    }
}

/**
 * Extract a title using rule-based heuristics (fallback)
 */
function extractTitleFromContent(content: string): string | null {
    const lines = content.split("\n").filter((line) => line.trim().length > 0)
    if (lines.length === 0) return null

    const firstLine = lines[0].trim()

    // Check if first line looks like a title (short, no punctuation at end except ? or !)
    if (firstLine.length <= MAX_TITLE_LENGTH && !firstLine.endsWith(".") && !firstLine.endsWith(",")) {
        // Remove markdown heading markers
        const cleaned = firstLine.replace(/^#{1,6}\s*/, "")
        if (cleaned.length > 3 && cleaned.length <= MAX_TITLE_LENGTH) {
            return cleaned
        }
    }

    // Check for common title patterns
    const patterns = [
        /^(?:meeting|call|sync|standup|1:1|review|planning)\s+(?:with|about|for|re:?)\s+(.+)/i,
        /^(?:todo|task|action)\s*:?\s*(.+)/i,
        /^(?:idea|thought|concept)\s*:?\s*(.+)/i,
        /^(?:note|notes)\s*:?\s*(.+)/i,
    ]

    for (const pattern of patterns) {
        const match = firstLine.match(pattern)
        if (match && match[1]) {
            const extracted = match[1].trim()
            if (extracted.length > 3 && extracted.length <= MAX_TITLE_LENGTH) {
                return firstLine // Return full match for context
            }
        }
    }

    return null
}

/**
 * Fallback title extraction - first meaningful words
 */
function getFallbackTitle(content: string): string {
    // Get the first line and clean it up
    const firstLine = content.split("\n")[0].trim()

    // Remove markdown formatting
    let cleaned = firstLine
        .replace(/^#{1,6}\s*/, "") // headings
        .replace(/\*\*|\*|__|_|~~|`/g, "") // bold, italic, strikethrough, code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
        .trim()

    // Truncate with ellipsis if needed
    if (cleaned.length > MAX_TITLE_LENGTH) {
        // Try to break at a word boundary
        const truncated = cleaned.substring(0, MAX_TITLE_LENGTH - 3)
        const lastSpace = truncated.lastIndexOf(" ")
        if (lastSpace > MAX_TITLE_LENGTH * 0.5) {
            cleaned = truncated.substring(0, lastSpace) + "..."
        } else {
            cleaned = truncated + "..."
        }
    }

    return cleaned || "Untitled Note"
}
