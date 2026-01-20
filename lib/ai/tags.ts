/**
 * Extract relevant tags from note content
 *
 * Uses a combination of:
 * - Explicit hashtags in the content
 * - Named entity recognition patterns
 * - Keyword extraction
 */

const MAX_TAGS = 5

/**
 * Extract tags from note content
 */
export async function extractTags(content: string): Promise<string[]> {
    const tags = new Set<string>()

    // 1. Extract explicit hashtags
    const hashtagTags = extractHashtags(content)
    hashtagTags.forEach((tag) => tags.add(tag))

    // 2. Extract named entities (people, places, etc.)
    const entityTags = extractEntities(content)
    entityTags.forEach((tag) => tags.add(tag))

    // 3. Extract keywords based on common patterns
    const keywordTags = extractKeywords(content)
    keywordTags.forEach((tag) => tags.add(tag))

    // Convert to array and limit
    return Array.from(tags).slice(0, MAX_TAGS)
}

/**
 * Extract explicit hashtags from content
 */
function extractHashtags(content: string): string[] {
    const regex = /#([a-zA-Z][a-zA-Z0-9_-]{1,30})/g
    const matches = content.match(regex) || []

    return matches
        .map((tag) => tag.substring(1).toLowerCase()) // Remove # and lowercase
        .filter((tag) => tag.length >= 2)
}

/**
 * Extract named entities (simplified pattern matching)
 */
function extractEntities(content: string): string[] {
    const tags: string[] = []

    // Date patterns -> "dated" tag
    if (/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(content)) {
        tags.push("dated")
    }
    if (
        /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i.test(
            content,
        )
    ) {
        tags.push("dated")
    }
    if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(content)) {
        tags.push("dated")
    }

    // Time patterns -> "scheduled" tag
    if (/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/i.test(content)) {
        tags.push("scheduled")
    }

    // Money patterns -> "finance" tag
    if (/\$\d+(?:\.\d{2})?|\b\d+\s*(?:dollars|usd|eur|gbp)\b/i.test(content)) {
        tags.push("finance")
    }

    // Email patterns -> "contact" tag
    if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content)) {
        tags.push("contact")
    }

    // Phone patterns -> "contact" tag
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)) {
        tags.push("contact")
    }

    // URL patterns -> "reference" tag
    if (/https?:\/\/[^\s]+/i.test(content)) {
        tags.push("reference")
    }

    return tags
}

/**
 * Extract keyword-based tags
 */
function extractKeywords(content: string): string[] {
    const lowerContent = content.toLowerCase()
    const tags: string[] = []

    // Category keyword maps
    const keywordMap: Record<string, string[]> = {
        work: ["project", "deadline", "client", "meeting", "team", "office", "work", "job", "career"],
        personal: ["family", "friend", "home", "personal", "self", "life", "health"],
        health: ["workout", "exercise", "gym", "run", "sleep", "diet", "nutrition", "health", "doctor", "medical"],
        finance: ["budget", "savings", "investment", "expense", "income", "money", "bank", "pay"],
        learning: ["learn", "study", "course", "book", "read", "tutorial", "education", "research"],
        tech: ["code", "programming", "software", "app", "developer", "api", "database", "server"],
        creative: ["design", "art", "music", "write", "create", "creative", "story", "draw"],
        travel: ["trip", "flight", "hotel", "travel", "vacation", "visit", "explore"],
        food: ["recipe", "cook", "restaurant", "food", "meal", "dinner", "lunch", "breakfast"],
        urgent: ["urgent", "asap", "important", "priority", "critical", "deadline"],
    }

    // Check each category
    for (const [tag, keywords] of Object.entries(keywordMap)) {
        const matchCount = keywords.filter((kw) => lowerContent.includes(kw)).length
        if (matchCount >= 2) {
            tags.push(tag)
        } else if (matchCount === 1) {
            // Only add if the keyword appears multiple times or is prominent
            const keyword = keywords.find((kw) => lowerContent.includes(kw))
            if (keyword) {
                const regex = new RegExp(`\\b${keyword}\\b`, "gi")
                const matches = content.match(regex) || []
                if (matches.length >= 2) {
                    tags.push(tag)
                }
            }
        }
    }

    return tags
}

/**
 * AI-based tag suggestion (to be implemented)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function suggestTagsWithAI(content: string): Promise<string[]> {
    // TODO: Implement ExecuTorch tag suggestion
    /*
    const prompt = `Suggest 2-4 relevant tags for organizing this note. Return as comma-separated words (lowercase, no hashtags).

Examples: work, personal, urgent, project-x, health, finance

Note:
${content.substring(0, 300)}

Tags:`;

    const result = await LLAMA.generate(prompt, { maxTokens: 30, temperature: 0.3 });
    
    return result
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length < 20)
        .slice(0, 4);
    */

    return []
}
