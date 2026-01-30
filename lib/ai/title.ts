import { LLMModel, Message } from "@/lib/ai/ai.types";
import { MAX_TITLE_LENGTH } from "@/lib/consts/consts";
import type { NoteType } from "@/lib/database";

/**
 * Generate a title for the given note content using AI
 */
export async function generateTitle(content: string, llm: LLMModel | null, noteType?: NoteType): Promise<string> {
    // Try AI generation if model is ready and not busy
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiTitle = await generateTitleWithAI(content, llm, noteType);
            if (aiTitle && aiTitle.length > 3 && !isExampleTitle(aiTitle)) {
                return aiTitle;
            }
        } catch (error) {
            console.warn("AI title generation failed, using fallback:", error);
        }
    }

    // Try rule-based title extraction (faster, no AI needed)
    const ruleBasedTitle = extractTitleFromContent(content, noteType);
    if (ruleBasedTitle) {
        return ruleBasedTitle;
    }

    // Final fallback: first line truncated
    return getFallbackTitle(content, noteType);
}

/**
 * Check if the generated title looks like an example that was copied
 */
function isExampleTitle(title: string): boolean {
    const lowerTitle = title.toLowerCase();

    // Common example indicators
    const examplePatterns = [
        /^example/i,
        /\bexample\b/i,
        /^e\.g\./i,
        /^like\b/i,
        /^such as\b/i,
        // Specific examples that might get copied
        /team sync|design review|daily tasks|finish report/i,
        /ai automation|gratitude today|react hooks guide/i,
        /meeting notes|project ideas/i,
    ];

    return examplePatterns.some((pattern) => pattern.test(lowerTitle));
}

/**
 * Generate title using LLM (SmolLM 360M via ExecutorTorch)
 */
async function generateTitleWithAI(content: string, llm: LLMModel, noteType?: NoteType): Promise<string | null> {
    // Truncate very long content to save tokens and improve focus
    const truncatedContent = content.length > 500 ? content.substring(0, 500) + "..." : content;

    // Build a clearer, more direct prompt
    const systemPrompt = buildSystemPrompt(noteType);

    const messages: Message[] = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: `Content:\n${truncatedContent}`,
        },
    ];

    try {
        const response = await llm.generate(messages);

        // Clean up the response
        let title = cleanGeneratedTitle(response);

        // Validate the title
        if (!title || title.length < 3 || isExampleTitle(title)) {
            return null;
        }

        // Ensure it's within length limits
        title = truncateTitle(title);

        return title;
    } catch (error) {
        console.error("LLM title generation error:", error);
        return null;
    }
}

/**
 * Build a better system prompt based on note type
 */
function buildSystemPrompt(noteType?: NoteType): string {
    const baseInstruction =
        "You are a title generator. Read the content and create a short, descriptive title (maximum 30 characters).";

    const rules = [
        "Output ONLY the title text",
        "No quotes, no punctuation at the end",
        "No prefixes like 'Title:' or 'Subject:'",
        "Be specific to the actual content",
    ];

    let typeGuidance = "";
    switch (noteType) {
        case "meeting":
            typeGuidance = "Focus on who met or what was discussed.";
            break;
        case "task":
            typeGuidance = "Focus on the main action or task.";
            break;
        case "idea":
            typeGuidance = "Capture the core concept briefly.";
            break;
        case "journal":
            typeGuidance = "Reflect the main theme or feeling.";
            break;
        case "reference":
            typeGuidance = "Describe what the reference is about.";
            break;
    }

    return `${baseInstruction}\n\n${rules.join("\n")}${typeGuidance ? `\n\n${typeGuidance}` : ""}`;
}

/**
 * Clean up the generated title response
 */
function cleanGeneratedTitle(response: string): string {
    return response
        .trim()
        .split("\n")[0] // Take only first line
        .replace(/^["'`]|["'`]$/g, "") // Remove surrounding quotes
        .replace(/^(Title|Subject|Name|Heading|Topic):\s*/i, "") // Remove common prefixes
        .replace(/^\s*[-–—]\s*/, "") // Remove leading dashes
        .replace(/\s+/g, " ") // Normalize spaces
        .replace(/[.!?,;:]$/, "") // Remove trailing punctuation
        .trim();
}

/**
 * Truncate title to max length at word boundary
 */
function truncateTitle(title: string): string {
    if (title.length <= MAX_TITLE_LENGTH) {
        return title;
    }

    // Try to break at a word boundary
    const truncated = title.substring(0, MAX_TITLE_LENGTH - 3);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > MAX_TITLE_LENGTH * 0.5) {
        return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
}

/**
 * Extract a title using rule-based heuristics (fallback)
 */
function extractTitleFromContent(content: string, noteType?: NoteType): string | null {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length === 0) return null;

    const firstLine = lines[0].trim();

    // Check if first line looks like a title (short, no punctuation at end except ? or !)
    if (firstLine.length <= MAX_TITLE_LENGTH && !firstLine.endsWith(".") && !firstLine.endsWith(",")) {
        // Remove markdown heading markers
        const cleaned = firstLine.replace(/^#{1,6}\s*/, "");
        if (cleaned.length > 3 && cleaned.length <= MAX_TITLE_LENGTH) {
            return cleaned;
        }
    }

    // Type-specific pattern matching
    const patterns: { pattern: RegExp; types?: NoteType[] }[] = [
        {
            pattern: /^(?:meeting|call|sync|standup|1:1|review|planning)\s+(?:with|about|for|re:?)\s+(.+)/i,
            types: ["meeting"],
        },
        { pattern: /^(?:todo|task|action)\s*:?\s*(.+)/i, types: ["task"] },
        { pattern: /^(?:idea|thought|concept)\s*:?\s*(.+)/i, types: ["idea"] },
        { pattern: /^(?:note|notes)\s*:?\s*(.+)/i, types: ["note", "reference"] },
        { pattern: /^(?:journal|diary|reflection)\s*:?\s*(.+)/i, types: ["journal"] },
    ];

    for (const { pattern, types } of patterns) {
        // If note type is known, prioritize patterns for that type
        if (!noteType || !types || types.includes(noteType)) {
            const match = firstLine.match(pattern);
            if (match && match[1]) {
                const extracted = match[1].trim();
                if (extracted.length > 3 && extracted.length <= MAX_TITLE_LENGTH) {
                    return firstLine; // Return full match for context
                }
            }
        }
    }

    return null;
}

/**
 * Fallback title extraction - first meaningful words
 */
function getFallbackTitle(content: string, noteType?: NoteType): string {
    // Get the first line and clean it up
    const firstLine = content.split("\n")[0].trim();

    // Remove markdown formatting
    let cleaned = firstLine
        .replace(/^#{1,6}\s*/, "") // headings
        .replace(/\*\*|\*|__|_|~~|`/g, "") // bold, italic, strikethrough, code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
        .replace(/^[-•*]\s*/, "") // bullet points
        .replace(/^\d+[.)]\s*/, "") // numbered lists
        .replace(/^\[[\sx]\]\s*/i, "") // checkboxes
        .trim();

    // Add type prefix if it helps provide context
    if (noteType && noteType !== "note" && cleaned.length < 30) {
        const typeLabel = noteType.charAt(0).toUpperCase() + noteType.slice(1);
        // Only add prefix if it's not already in the content
        if (!cleaned.toLowerCase().includes(noteType)) {
            cleaned = `${typeLabel}: ${cleaned}`;
        }
    }

    // Truncate with ellipsis if needed
    cleaned = truncateTitle(cleaned);

    return cleaned || "Untitled Note";
}
