// Format full date
export function formatFullDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export function extractJsonObject(text: string): string | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
}

export function normalizeText(q: string): string {
    return q
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function shouldUseLLM(query: string): boolean {
    const llmQueryPatterns = [
        // Question starters
        /^(what|let's|let us|discuss|discussing|discussing about|do you|when|where|how|why|who|which|when|whose|find|show|tell me|can you)/i,
        // Conversational patterns
        /(i (wrote|thought|was thinking|noted)|my (notes|thoughts))/i,
        // Time-based questions
        /(recently|yesterday|last (week|month|year)|this (week|month))/i,
        // Topic-based questions
        /(about|regarding|concerning) .+/i,
        // Ideas and concepts
        /(ideas?|concepts?|thoughts?) (about|on|for)/i,
        // action verbs
        /(find|show|tell me|can you|help me|help us|please|do|remember|remind me|remind us)/i,
        // other patterns
        /(notes?|note|notes about|notes on|notes for|notes of|notes regarding|notes concerning|notes to)/i,
        /(notes about|notes on|notes for|notes of|notes regarding|notes concerning|notes to)/i,
        /(notes about|notes on|notes for|notes of|notes regarding|notes concerning|notes to)/i,
    ];

    return llmQueryPatterns.some((pattern) => pattern.test(query));
}

export function getStartOfWeek(date: Date): Date {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
}

export function getLastDayOfWeek(dayOfWeek: number): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDay = today.getDay();

    let daysAgo = currentDay - dayOfWeek;
    if (daysAgo <= 0) {
        daysAgo += 7; // Go to previous week
    }

    return new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

export function getThisDayOfWeek(dayOfWeek: number): Date {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDay = today.getDay();

    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil < 0) {
        daysUntil += 7;
    }

    return new Date(today.getTime() + daysUntil * 24 * 60 * 60 * 1000);
}
