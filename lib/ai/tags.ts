/**
 * Extract relevant tags from note content
 *
 * Uses SmolLM 360M via ExecutorTorch for intelligent tag extraction.
 * Falls back to rule-based extraction when the model isn't ready.
 */

import type { NoteType } from "@/lib/database";
import type { LLMModel, Message } from "./provider";

const MAX_TAGS = 5;

/**
 * Extract tags from note content using AI
 */
export async function extractTags(content: string, llm: LLMModel | null, noteType?: NoteType): Promise<string[]> {
    // Skip AI for very short content
    if (content.trim().length < 20) {
        return extractTagsFallback(content, noteType);
    }

    // Try AI extraction if model is ready and not busy
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiTags = await extractTagsWithAI(content, llm, noteType);
            if (aiTags && aiTags.length > 0) {
                // Combine AI tags with entity-based tags for comprehensive tagging
                const entityTags = extractEntities(content);
                const combined = [...new Set([...aiTags, ...entityTags])];
                return combined.slice(0, MAX_TAGS);
            }
        } catch (error) {
            console.warn("AI tag extraction failed, using fallback:", error);
        }
    }

    // Fallback to rule-based extraction
    return extractTagsFallback(content, noteType);
}

/**
 * AI-based tag extraction using LLM
 */
async function extractTagsWithAI(content: string, llm: LLMModel, noteType?: NoteType): Promise<string[]> {
    // Build context-aware guidance based on note type
    let typeGuidance = "";
    let exampleTags = "";

    switch (noteType) {
        case "meeting":
            typeGuidance = "Focus on: participants, projects, topics discussed, action items";
            exampleTags = "team, planning, design, review, follow-up";
            break;
        case "task":
            typeGuidance = "Focus on: priority level, project area, deadlines, categories";
            exampleTags = "urgent, work, personal, deadline, project-name";
            break;
        case "idea":
            typeGuidance = "Focus on: domain, concepts, innovation areas, themes";
            exampleTags = "creative, innovation, product, brainstorm, future";
            break;
        case "journal":
            typeGuidance = "Focus on: emotions, activities, themes, relationships";
            exampleTags = "reflection, growth, gratitude, health, relationships";
            break;
        case "reference":
            typeGuidance = "Focus on: subject area, technology, tools, documentation type";
            exampleTags = "tech, learning, documentation, tutorial, coding";
            break;
        default:
            typeGuidance = "Focus on: main topics, categories, and key themes";
            exampleTags = "work, personal, important, project, learning";
    }

    const messages: Message[] = [
        {
            role: "system",
            content: `Extract 2-5 relevant tags for organizing this ${noteType || "note"}.

Guidelines:
• ${typeGuidance}
• Keep tags simple, lowercase, and broad
• Use single words or hyphenated phrases
• Avoid duplicating note type (already categorized as ${noteType || "note"})
• Tags should help find and filter notes later

Example tags for ${noteType || "notes"}: ${exampleTags}

Reply with ONLY comma-separated tags, no hashtags or explanations.`,
        },
        {
            role: "user",
            content: content.substring(0, 400),
        },
    ];

    try {
        const response = await llm.generate(messages);

        // Parse the response
        const tags = response
            .trim()
            .toLowerCase()
            .replace(/^tags?:?\s*/i, "") // Remove "Tags:" prefix
            .replace(/[\[\]"']/g, "") // Remove brackets and quotes
            .replace(/^[-•*]\s*/gm, "") // Remove bullet points
            .split(/[,\n]+/) // Split by comma or newline
            .map(
                (tag) =>
                    tag
                        .trim()
                        .replace(/^#/, "") // Remove hashtags
                        .replace(/[^a-z0-9-]/g, "") // Keep only alphanumeric and hyphens
                        .replace(/^-+|-+$/g, ""), // Remove leading/trailing hyphens
            )
            .filter((tag) => {
                // Filter out invalid tags
                if (tag.length < 2 || tag.length > 20) return false;
                // Don't duplicate the note type as a tag
                if (noteType && tag === noteType) return false;
                return true;
            })
            .slice(0, MAX_TAGS);

        return tags;
    } catch (error) {
        console.error("LLM tag extraction error:", error);
        return [];
    }
}

/**
 * Fallback: Combine hashtags, entities, and keywords
 */
function extractTagsFallback(content: string, noteType?: NoteType): string[] {
    const tags = new Set<string>();

    // 1. Extract explicit hashtags
    const hashtagTags = extractHashtags(content);
    hashtagTags.forEach((tag) => tags.add(tag));

    // 2. Extract named entities (people, places, etc.)
    const entityTags = extractEntities(content);
    entityTags.forEach((tag) => tags.add(tag));

    // 3. Extract keywords based on common patterns and note type
    const keywordTags = extractKeywords(content, noteType);
    keywordTags.forEach((tag) => tags.add(tag));

    // 4. Add type-specific default tags if relevant
    if (noteType) {
        const typeSpecificTags = getTypeSpecificTags(content, noteType);
        typeSpecificTags.forEach((tag) => tags.add(tag));
    }

    // Convert to array, remove note type itself, and limit
    return Array.from(tags)
        .filter((tag) => tag !== noteType) // Don't duplicate note type
        .slice(0, MAX_TAGS);
}

/**
 * Get type-specific tags based on note type and content
 */
function getTypeSpecificTags(content: string, noteType: NoteType): string[] {
    const lowerContent = content.toLowerCase();
    const tags: string[] = [];

    switch (noteType) {
        case "meeting":
            if (/\b(action|follow-?up|todo)\b/i.test(content)) tags.push("actionable");
            if (/\b(decision|decided|approved)\b/i.test(content)) tags.push("decision");
            if (/\b(review|feedback|retrospective)\b/i.test(content)) tags.push("review");
            break;
        case "task":
            if (/\b(urgent|asap|priority|critical)\b/i.test(content)) tags.push("urgent");
            if (/\b(deadline|due|by)\b/i.test(content)) tags.push("deadline");
            if (/\b(blocked|waiting|pending)\b/i.test(content)) tags.push("blocked");
            break;
        case "idea":
            if (/\b(feature|product|design)\b/i.test(content)) tags.push("product");
            if (/\b(experiment|test|try)\b/i.test(content)) tags.push("experimental");
            if (/\b(improvement|optimize|enhance)\b/i.test(content)) tags.push("improvement");
            break;
        case "journal":
            if (/\b(goal|resolution|intention)\b/i.test(content)) tags.push("goals");
            if (/\b(grateful|thankful|appreciate)\b/i.test(content)) tags.push("gratitude");
            if (/\b(learned|insight|realization)\b/i.test(content)) tags.push("learning");
            break;
        case "reference":
            if (/\b(code|programming|function)\b/i.test(content)) tags.push("coding");
            if (/\b(guide|tutorial|how-?to)\b/i.test(content)) tags.push("tutorial");
            if (/\b(documentation|docs|api)\b/i.test(content)) tags.push("docs");
            break;
    }

    return tags;
}

/**
 * Extract explicit hashtags from content
 */
function extractHashtags(content: string): string[] {
    const regex = /#([a-zA-Z][a-zA-Z0-9_-]{1,30})/g;
    const matches = content.match(regex) || [];

    return matches
        .map((tag) => tag.substring(1).toLowerCase()) // Remove # and lowercase
        .filter((tag) => tag.length >= 2);
}

/**
 * Extract named entities (simplified pattern matching)
 */
function extractEntities(content: string): string[] {
    const tags: string[] = [];

    // Date patterns -> "dated" tag
    if (/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(content)) {
        tags.push("dated");
    }
    if (
        /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(
            content,
        )
    ) {
        tags.push("dated");
    }
    if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(content)) {
        tags.push("dated");
    }

    // Time patterns -> "scheduled" tag
    if (/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/i.test(content)) {
        tags.push("scheduled");
    }

    // Money patterns -> "finance" tag
    if (/\$\d+(?:\.\d{2})?|\b\d+\s*(?:dollars|usd|eur|gbp)\b/i.test(content)) {
        tags.push("finance");
    }

    // Email patterns -> "contact" tag
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content)) {
        tags.push("contact");
    }

    // Phone patterns -> "contact" tag
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)) {
        tags.push("contact");
    }

    // URL patterns -> "link" tag (not "reference" to avoid duplication)
    if (/https?:\/\/[^\s]+/i.test(content)) {
        tags.push("link");
    }

    // Code patterns -> "code" tag
    if (/```[\s\S]*?```|`[^`]+`/.test(content)) {
        tags.push("code");
    }

    return tags;
}

/**
 * Extract keyword-based tags
 */
function extractKeywords(content: string, noteType?: NoteType): string[] {
    const lowerContent = content.toLowerCase();
    const tags: string[] = [];

    // Category keyword maps - enhanced with note type awareness
    const keywordMap: Record<string, { keywords: string[]; relevantTypes?: NoteType[] }> = {
        work: {
            keywords: ["project", "deadline", "client", "meeting", "team", "office", "work", "job", "career"],
            relevantTypes: ["meeting", "task", "reference"],
        },
        personal: {
            keywords: ["family", "friend", "home", "personal", "self", "life"],
            relevantTypes: ["journal", "note"],
        },
        health: {
            keywords: ["workout", "exercise", "gym", "run", "sleep", "diet", "nutrition", "health", "doctor"],
            relevantTypes: ["journal", "task"],
        },
        finance: {
            keywords: ["budget", "savings", "investment", "expense", "income", "money", "bank", "pay"],
            relevantTypes: ["reference", "task"],
        },
        learning: {
            keywords: ["learn", "study", "course", "book", "read", "tutorial", "education", "research"],
            relevantTypes: ["reference", "idea", "note"],
        },
        tech: {
            keywords: ["code", "programming", "software", "app", "developer", "api", "database", "server"],
            relevantTypes: ["reference", "idea", "task"],
        },
        creative: {
            keywords: ["design", "art", "music", "write", "create", "creative", "story", "draw"],
            relevantTypes: ["idea", "journal"],
        },
        travel: {
            keywords: ["trip", "flight", "hotel", "travel", "vacation", "visit", "explore"],
            relevantTypes: ["journal", "task"],
        },
        food: {
            keywords: ["recipe", "cook", "restaurant", "food", "meal", "dinner", "lunch", "breakfast"],
            relevantTypes: ["reference", "journal"],
        },
        urgent: {
            keywords: ["urgent", "asap", "important", "priority", "critical"],
            relevantTypes: ["task", "meeting"],
        },
    };

    // Check each category
    for (const [tag, { keywords, relevantTypes }] of Object.entries(keywordMap)) {
        // Skip if note type is known and this tag isn't relevant
        if (noteType && relevantTypes && !relevantTypes.includes(noteType)) {
            continue;
        }

        const matchCount = keywords.filter((kw) => lowerContent.includes(kw)).length;
        if (matchCount >= 2) {
            tags.push(tag);
        } else if (matchCount === 1) {
            // Only add if the keyword appears multiple times or is prominent
            const keyword = keywords.find((kw) => lowerContent.includes(kw));
            if (keyword) {
                const regex = new RegExp(`\\b${keyword}\\b`, "gi");
                const matches = content.match(regex) || [];
                if (matches.length >= 2) {
                    tags.push(tag);
                }
            }
        }
    }

    return tags;
}
