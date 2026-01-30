import type { NoteType } from "@/lib/database";
import type { LLMModel, Message } from "./ai.types";

const MAX_TAGS = 5;
const MIN_TAG_LENGTH = 2;
const MAX_TAG_LENGTH = 20;

export async function extractTags(content: string, llm: LLMModel | null, noteType?: NoteType): Promise<string[]> {
    // Skip AI for very short content
    if (content.trim().length < 20) {
        return extractTagsFallback(content, noteType);
    }

    // Try AI extraction if model is ready and not busy
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiTags = await extractTagsWithAI(content, llm, noteType);
            if (aiTags && aiTags.length > 0 && !containsExampleTags(aiTags)) {
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

function containsExampleTags(tags: string[]): boolean {
    const exampleWords = new Set([
        "example",
        "team",
        "planning",
        "design", // meeting examples
        "urgent",
        "work",
        "deadline", // task examples
        "product",
        "innovation",
        "future", // idea examples
        "gratitude",
        "health",
        "reflection", // journal examples
        "coding",
        "tutorial",
        "docs", // reference examples
        "important",
        "project", // default examples
        "actionable",
        "decision",
        "review",
        "recurring",
        "urgent",
        "blocked",
        "quick-win",
        "product",
        "experimental",
        "improvement",
        "exploratory",
        "goals",
        "gratitude",
        "learning",
        "reflection",
        "coding",
        "tutorial",
        "docs",
        "example",
        "finance",
        "contact",
        "link",
        "code",
        "tutorial",
        "docs",
        "example",
        "finance",
        "contact",
        "link",
        "code",
        "tutorial",
        "docs",
        "example",
        "finance",
        "contact",
        "link",
        "code",
        "tutorial",
        "docs",
        "example",
        "finance",
        "contact",
        "link",
        "code",
        "tutorial",
        "docs",
        "example",
        "finance",
        "contact",
        "link",
        "code",
        "tutorial",
        "docs",
        "example",
        "finance",
        "contact",
        "link",
    ]);

    // If 2+ tags are from example set, likely copied
    const exampleMatches = tags.filter((tag) => exampleWords.has(tag.toLowerCase()));
    return exampleMatches.length >= 2;
}

/**
 * AI-based tag extraction using LLM
 */
async function extractTagsWithAI(content: string, llm: LLMModel, noteType?: NoteType): Promise<string[]> {
    // Truncate content to focus model on key parts
    const contentPreview = content.length > 400 ? content.substring(0, 400).trim() : content.trim();

    const systemPrompt = buildTagSystemPrompt(noteType);

    const messages: Message[] = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: `Content:\n${contentPreview}`,
        },
    ];

    try {
        const response = await llm.generate(messages);

        // Parse and validate tags
        const tags = parseTagResponse(response, noteType);

        return tags;
    } catch (error) {
        console.error("LLM tag extraction error:", error);
        return [];
    }
}

/**
 * Build system prompt for tag extraction
 */
function buildTagSystemPrompt(noteType?: NoteType): string {
    const baseInstruction = "You are a tag extractor. Read the content and identify 2-4 relevant topic tags.";

    const rules = [
        "Output ONLY comma-separated words",
        "No hashtags, no quotes, no explanations",
        "Single words or short phrases only",
        "Be specific to the actual content topics",
    ];

    let typeGuidance = "";
    switch (noteType) {
        case "meeting":
            typeGuidance = "Focus on: who attended, what was discussed, action items.";
            break;
        case "task":
            typeGuidance = "Focus on: priority level, category, deadline status.";
            break;
        case "idea":
            typeGuidance = "Focus on: domain, novelty, purpose.";
            break;
        case "journal":
            typeGuidance = "Focus on: main themes, emotions, activities.";
            break;
        case "reference":
            typeGuidance = "Focus on: subject area, type of information.";
            break;
        default:
            typeGuidance = "Focus on: main topics and categories.";
    }

    return `${baseInstruction}\n\n${rules.join("\n")}\n\n${typeGuidance}`;
}

/**
 * Parse and clean tag response from LLM
 */
function parseTagResponse(response: string, noteType?: NoteType): string[] {
    // Clean and parse the response
    const tags = response
        .trim()
        .toLowerCase()
        .split("\n")[0] // Take only first line
        .replace(/^(tags?|keywords?|topics?):\s*/i, "") // Remove prefixes
        .replace(/[\[\]"'`]/g, "") // Remove brackets and quotes
        .replace(/^[-•*]\s*/gm, "") // Remove bullet points
        .split(/[,\n;]+/) // Split by common separators
        .map((tag) => cleanTag(tag))
        .filter((tag) => isValidTag(tag, noteType));

    return tags.slice(0, MAX_TAGS);
}

/**
 * Clean individual tag
 */
function cleanTag(tag: string): string {
    return tag
        .trim()
        .replace(/^#/, "") // Remove hashtags
        .replace(/[^a-z0-9\s-]/g, "") // Keep only alphanumeric, spaces, hyphens
        .replace(/\s+/g, "-") // Convert spaces to hyphens
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
        .replace(/-{2,}/g, "-"); // Collapse multiple hyphens
}

/**
 * Validate if tag is acceptable
 */
function isValidTag(tag: string, noteType?: NoteType): boolean {
    // Length check
    if (tag.length < MIN_TAG_LENGTH || tag.length > MAX_TAG_LENGTH) {
        return false;
    }

    // Don't duplicate the note type as a tag
    if (noteType && tag === noteType) {
        return false;
    }

    // Filter out common stopwords that aren't useful as tags
    const stopwords = new Set([
        "the",
        "and",
        "or",
        "but",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "with",
        "by",
        "from",
        "up",
        "about",
        "into",
        "through",
        "during",
        "before",
        "after",
        "above",
        "below",
        "between",
        "this",
        "that",
        "these",
        "those",
        "then",
        "than",
        "very",
        "note",
        "notes",
        "content",
        "text",
        "item",
        "example",
    ]);

    if (stopwords.has(tag)) {
        return false;
    }

    // Must contain at least one letter
    if (!/[a-z]/.test(tag)) {
        return false;
    }

    return true;
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
    const tags: string[] = [];

    switch (noteType) {
        case "meeting":
            if (/\b(action|follow-?up|todo)\b/i.test(content)) tags.push("actionable");
            if (/\b(decision|decided|approved)\b/i.test(content)) tags.push("decision");
            if (/\b(review|feedback|retrospective)\b/i.test(content)) tags.push("review");
            if (/\b(standup|sync|1:1|one-on-one)\b/i.test(content)) tags.push("recurring");
            break;
        case "task":
            if (/\b(urgent|asap|priority|critical|high-priority)\b/i.test(content)) tags.push("urgent");
            if (/\b(deadline|due|by|before)\b/i.test(content)) tags.push("deadline");
            if (/\b(blocked|waiting|pending|on-hold)\b/i.test(content)) tags.push("blocked");
            if (/\b(quick|easy|simple|5-min)\b/i.test(content)) tags.push("quick-win");
            break;
        case "idea":
            if (/\b(feature|product|design|ui|ux)\b/i.test(content)) tags.push("product");
            if (/\b(experiment|test|try|prototype)\b/i.test(content)) tags.push("experimental");
            if (/\b(improvement|optimize|enhance|refactor)\b/i.test(content)) tags.push("improvement");
            if (/\b(brainstorm|explore|consider|maybe)\b/i.test(content)) tags.push("exploratory");
            break;
        case "journal":
            if (/\b(goal|resolution|intention|plan)\b/i.test(content)) tags.push("goals");
            if (/\b(grateful|thankful|appreciate|blessing)\b/i.test(content)) tags.push("gratitude");
            if (/\b(learned|insight|realization|discovery)\b/i.test(content)) tags.push("learning");
            if (/\b(challenge|struggle|difficult|hard)\b/i.test(content)) tags.push("reflection");
            break;
        case "reference":
            if (/\b(code|programming|function|class|method)\b/i.test(content)) tags.push("coding");
            if (/\b(guide|tutorial|how-?to|step-by-step)\b/i.test(content)) tags.push("tutorial");
            if (/\b(documentation|docs|api|reference)\b/i.test(content)) tags.push("docs");
            if (/\b(example|sample|template|boilerplate)\b/i.test(content)) tags.push("example");
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
        .filter((tag) => tag.length >= MIN_TAG_LENGTH && tag.length <= MAX_TAG_LENGTH);
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
        deadline: {
            keywords: ["deadline", "due", "by", "before"],
            relevantTypes: ["task", "meeting"],
        },
        blocked: {
            keywords: ["blocked", "waiting", "pending", "on-hold"],
            relevantTypes: ["task", "meeting"],
        },
        quickWin: {
            keywords: ["quick", "easy", "simple", "5-min"],
            relevantTypes: ["task", "meeting"],
        },
        experimental: {
            keywords: ["experiment", "test", "try", "prototype"],
            relevantTypes: ["idea", "task"],
        },
        improvement: {
            keywords: ["improvement", "optimize", "enhance", "refactor"],
            relevantTypes: ["idea", "task"],
        },
        exploratory: {
            keywords: ["explore", "consider", "maybe"],
            relevantTypes: ["idea", "task"],
        },
        goals: {
            keywords: ["goal", "resolution", "intention", "plan"],
            relevantTypes: ["journal", "task"],
        },
        gratitude: {
            keywords: ["grateful", "thankful", "appreciate", "blessing"],
            relevantTypes: ["journal", "task"],
        },
        reflection: {
            keywords: ["reflection", "realization", "discovery"],
            relevantTypes: ["journal", "task"],
        },
        coding: {
            keywords: ["code", "programming", "function", "class", "method"],
            relevantTypes: ["reference", "idea", "task"],
        },
        tutorial: {
            keywords: ["tutorial", "how-to", "step-by-step"],
            relevantTypes: ["reference", "idea", "task"],
        },
        docs: {
            keywords: ["documentation", "docs", "api", "reference"],
            relevantTypes: ["reference", "idea", "task"],
        },
        example: {
            keywords: ["example", "sample", "template", "boilerplate"],
            relevantTypes: ["reference", "idea", "task"],
        },
        contact: {
            keywords: ["contact", "email", "phone", "address"],
            relevantTypes: ["reference", "idea", "task"],
        },
        link: {
            keywords: ["link", "url", "website", "web", "page"],
            relevantTypes: ["reference", "idea", "task"],
        },
        code: {
            keywords: ["code", "programming", "function", "class", "method"],
            relevantTypes: ["reference", "idea", "task"],
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
