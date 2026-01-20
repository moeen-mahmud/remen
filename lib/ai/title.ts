/**
 * Generate a title for a note
 *
 * Uses a simple rule-based approach initially with fallback to AI.
 * The AI model (ExecuTorch Llama) can be enabled once properly configured.
 */

const MAX_TITLE_LENGTH = 50

/**
 * Generate a title for the given note content
 */
export async function generateTitle(content: string): Promise<string> {
    // Try rule-based title extraction first (faster, no AI needed)
    const ruleBasedTitle = extractTitleFromContent(content)
    if (ruleBasedTitle) {
        return ruleBasedTitle
    }

    // Fallback to AI generation if available
    try {
        const aiTitle = await generateTitleWithAI(content)
        if (aiTitle) {
            return aiTitle
        }
    } catch (error) {
        console.warn("AI title generation failed, using fallback:", error)
    }

    // Final fallback: first line truncated
    return getFallbackTitle(content)
}

/**
 * Extract a title using rule-based heuristics
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
 * Generate title using AI (ExecuTorch)
 */
async function generateTitleWithAI(content: string): Promise<string | null> {
    // TODO: Implement ExecuTorch integration once properly set up
    // For now, return null to use fallback

    /*
    try {
        const { LLAMA } = await import('react-native-executorch');
        
        const prompt = `Generate a concise, descriptive title (max 50 characters) for this note. Return ONLY the title, no quotes or extra text.

Note:
${content.substring(0, 500)}

Title:`;

        const result = await LLAMA.generate(prompt, {
            maxTokens: 20,
            temperature: 0.3,
        });
        
        return result.trim().substring(0, MAX_TITLE_LENGTH);
    } catch (error) {
        console.error('ExecuTorch title generation failed:', error);
        return null;
    }
    */

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
