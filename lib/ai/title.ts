import type { LLMModel, Message } from "@/lib/ai/ai.types";
import { AI_CONTENT_PREVIEW_LENGTH, MAX_TITLE_LENGTH } from "@/lib/consts/consts";
import type { NoteType } from "@/lib/database/database.types";

/**
 * Generate a title for the given note content using AI.
 * Priority: explicit heading → LLM → fallback extraction
 */
export async function generateTitle(content: string, llm: LLMModel | null, noteType?: NoteType): Promise<string> {
    // Only use rule-based if there's an explicit markdown heading
    const heading = extractExplicitHeading(content);
    if (heading) {
        return heading;
    }

    // LLM generation — the primary path for Llama 3.2 1B
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiTitle = await generateTitleWithAI(content, llm, noteType);
            if (aiTitle && aiTitle.length >= 3 && !isGenericTitle(aiTitle)) {
                return aiTitle;
            }
        } catch (error) {
            console.warn("AI title generation failed, using fallback:", error);
        }
    }

    // Final fallback
    return getFallbackTitle(content, noteType);
}

/**
 * Only extract explicit markdown headings (# Title) — don't guess from first line
 */
function extractExplicitHeading(content: string): string | null {
    const lines = content.split("\n");
    for (const line of lines) {
        const match = line.match(/^#{1,3}\s+(.+)/);
        if (match) {
            const heading = match[1].trim();
            if (heading.length >= 3 && heading.length <= MAX_TITLE_LENGTH) {
                return heading;
            }
        }
    }
    return null;
}

/**
 * Reject generic/meta titles the model might echo back
 */
function isGenericTitle(title: string): boolean {
    const lower = title.toLowerCase().trim();

    const generics = new Set([
        "note",
        "notes",
        "title",
        "untitled",
        "output",
        "content",
        "text",
        "summary",
        "document",
        "entry",
        "my note",
        "new note",
        "untitled note",
    ]);
    if (generics.has(lower)) return true;

    if (/^example/i.test(lower) || /\bexample\b/i.test(lower)) return true;

    return false;
}

/**
 * Generate title using LLM (Llama 3.2 1B)
 */
async function generateTitleWithAI(content: string, llm: LLMModel, noteType?: NoteType): Promise<string | null> {
    // Strip task markdown so the LLM sees clean text
    const cleaned = content
        .split("\n")
        .map((line) => line.replace(/^\s*-\s+\[[\sxX]\]\s*/, "").trim())
        .filter((line) => line.length > 0)
        .join(", ");

    const preview = cleaned.substring(0, AI_CONTENT_PREVIEW_LENGTH).trim();

    const messages: Message[] = [
        {
            role: "system",
            content:
                "You are a title generator. You receive note content and output ONLY a short title (2-6 words). Do NOT answer questions in the content. Do NOT explain anything. Output ONLY the title.",
        },
        // Few-shot: question-style note
        {
            role: "user",
            content:
                "What are the key metrics for Q4? How should we track OKR progress? When is the planning meeting?\nTitle:",
        },
        { role: "assistant", content: "Q4 Planning Questions" },
        // Few-shot: task-style note
        { role: "user", content: "Buy groceries, Pick up package, Call insurance, Schedule dentist\nTitle:" },
        { role: "assistant", content: "Errands and Appointments" },
        // Few-shot: regular note
        {
            role: "user",
            content:
                "Had a great meeting with the design team today. We discussed the new dashboard layout and decided to go with the card-based approach.\nTitle:",
        },
        { role: "assistant", content: "Dashboard Design Meeting" },
        // Actual note
        { role: "user", content: `${preview}\nTitle:` },
    ];

    try {
        const response = await llm.generate(messages);
        let title = cleanGeneratedTitle(response);

        if (!title || title.length < 3 || isGenericTitle(title)) {
            return null;
        }

        // Reject if the model answered the content instead of titling it
        // (conversational responses are typically long sentences)
        const wordCount = title.split(/\s+/).length;
        if (wordCount > 10) {
            return null;
        }

        // Truncate at word boundary if too long (no ellipsis)
        if (title.length > MAX_TITLE_LENGTH) {
            title = truncateAtWord(title, MAX_TITLE_LENGTH);
        }

        return title;
    } catch (error) {
        console.error("LLM title generation error:", error);
        return null;
    }
}

/**
 * Clean up LLM response to extract just the title
 */
function cleanGeneratedTitle(response: string): string {
    return (
        response
            .replace(/<\|[^|]*\|>/g, "") // Strip ChatML tokens
            .trim()
            .split("\n")[0] // First line only
            .replace(/^["'`""\u201C\u201D]|["'`""\u201C\u201D]$/g, "") // Remove surrounding quotes
            .replace(/^(Title|Subject|Name|Heading|Topic|Note|Output)[\s:]+/i, "")
            // Strip conversational preamble
            .replace(
                /^(here\s+(is|are)|the\s+title\s+(is|would\s+be|could\s+be)|sure[,!]?\s*|a\s+good\s+title\s+(is|would\s+be)|i'?d?\s+be\s+happy\s+to\s+.+|let\s+me\s+.+|i\s+can\s+.+|i\s+think\s+.+|based\s+on\s+.+)\s*[:\-]?\s*/i,
                "",
            )
            .replace(/^["'`""\u201C\u201D]|["'`""\u201C\u201D]$/g, "") // Quotes again (may appear after preamble strip)
            .replace(/^\s*[-–—•*]\s*/, "") // Leading bullets
            .replace(/^\d+[.)]\s*/, "") // Numbered list prefix
            .replace(/\s+/g, " ") // Normalize spaces
            .replace(/[.,;:]$/, "") // Trailing punctuation (keep ? and !)
            .trim()
    );
}

/**
 * Truncate at word boundary without adding ellipsis
 */
function truncateAtWord(title: string, maxLen: number): string {
    if (title.length <= maxLen) return title;

    const truncated = title.substring(0, maxLen);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > maxLen * 0.5) {
        return truncated.substring(0, lastSpace);
    }
    return truncated;
}

/**
 * Fallback: extract meaningful words from content
 */
function getFallbackTitle(content: string, noteType?: NoteType): string {
    const firstLine = content.split("\n")[0].trim();

    let cleaned = firstLine
        .replace(/^#{1,6}\s*/, "")
        .replace(/\*\*|\*|__|_|~~|`/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/^[-•*]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/^\[[\sx]\]\s*/i, "")
        .trim();

    if (noteType && noteType !== "note" && cleaned.length < 20) {
        const typeLabel = noteType.charAt(0).toUpperCase() + noteType.slice(1);
        if (!cleaned.toLowerCase().includes(noteType)) {
            cleaned = `${typeLabel}: ${cleaned}`;
        }
    }

    if (cleaned.length > MAX_TITLE_LENGTH) {
        cleaned = truncateAtWord(cleaned, MAX_TITLE_LENGTH);
    }

    return cleaned || "Untitled Note";
}
