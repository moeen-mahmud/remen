/**
 * Generate a title for a note
 *
 * Uses SmolLM 360M via ExecutorTorch for intelligent title generation.
 * Falls back to rule-based extraction when the model isn't ready.
 */

import type { NoteType } from "@/lib/database";
import type { LLMModel, Message } from "./provider";

const MAX_TITLE_LENGTH = 50;

/**
 * Generate a title for the given note content using AI
 */
export async function generateTitle(content: string, llm: LLMModel | null, noteType?: NoteType): Promise<string> {
    // Skip AI for very short content
    if (content.trim().length < 20) {
        return getFallbackTitle(content, noteType);
    }

    // Try AI generation if model is ready and not busy
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiTitle = await generateTitleWithAI(content, llm, noteType);
            if (aiTitle && aiTitle.length > 3) {
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
 * Generate title using LLM (SmolLM 360M via ExecutorTorch)
 */
async function generateTitleWithAI(content: string, llm: LLMModel, noteType?: NoteType): Promise<string | null> {
    // Build context-aware system prompt based on note type
    let typeGuidance = "";
    switch (noteType) {
        case "meeting":
            typeGuidance = "For meetings: include who/what the meeting was about (e.g., 'Sync with Design Team')";
            break;
        case "task":
            typeGuidance = "For tasks: summarize the main action (e.g., 'Finish Q1 Report')";
            break;
        case "idea":
            typeGuidance = "For ideas: capture the core concept (e.g., 'AI Note Classification System')";
            break;
        case "journal":
            typeGuidance = "For journals: reflect the day or theme (e.g., 'Reflections on Progress')";
            break;
        case "reference":
            typeGuidance = "For reference: describe what's being documented (e.g., 'Python List Comprehension')";
            break;
        default:
            typeGuidance = "Create a descriptive summary of the note's content";
    }

    const messages: Message[] = [
        {
            role: "system",
            content: `Generate a concise title (max 50 characters) for this note.

Rules:
• Be specific and descriptive
• Use title case (capitalize main words)
• No quotes, explanations, or prefixes
• ${typeGuidance}

Examples:
"Team standup at 2pm. Discussed new features..." → Weekly Team Standup
"- Buy milk\n- Call dentist\n- Submit report" → Daily Tasks
"What if we automated note tagging with AI?" → Automated Note Tagging Idea
"Feeling grateful today. Great talk with Sarah." → Gratitude and Connection
"React hooks: useState for state management" → React Hooks Reference

Reply with ONLY the title.`,
        },
        {
            role: "user",
            content: content.substring(0, 500),
        },
    ];

    try {
        const response = await llm.generate(messages);

        // Clean up the response
        let title = response
            .trim()
            .replace(/^["']|["']$/g, "") // Remove surrounding quotes
            .replace(/^(Title|Subject|Name):\s*/i, "") // Remove common prefixes
            .replace(/\n.*/g, "") // Take only first line
            .replace(/\s+/g, " ") // Normalize spaces
            .trim();

        // Ensure it's within length limits
        if (title.length > MAX_TITLE_LENGTH) {
            // Try to break at a word boundary
            const truncated = title.substring(0, MAX_TITLE_LENGTH - 3);
            const lastSpace = truncated.lastIndexOf(" ");
            if (lastSpace > MAX_TITLE_LENGTH * 0.5) {
                title = truncated.substring(0, lastSpace) + "...";
            } else {
                title = truncated + "...";
            }
        }

        return title || null;
    } catch (error) {
        console.error("LLM title generation error:", error);
        return null;
    }
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
    if (cleaned.length > MAX_TITLE_LENGTH) {
        // Try to break at a word boundary
        const truncated = cleaned.substring(0, MAX_TITLE_LENGTH - 3);
        const lastSpace = truncated.lastIndexOf(" ");
        if (lastSpace > MAX_TITLE_LENGTH * 0.5) {
            cleaned = truncated.substring(0, lastSpace) + "...";
        } else {
            cleaned = truncated + "...";
        }
    }

    return cleaned || "Untitled Note";
}
