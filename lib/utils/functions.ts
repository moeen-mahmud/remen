import { LINK_MATCHER } from "@/lib/config";

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

export function normalizeText(q: string): string {
    return q
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
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

// Extract domain from URL for display
export function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace("www.", "");
    } catch {
        // If URL parsing fails, try basic extraction
        const match = url.match(LINK_MATCHER.nonHttp || LINK_MATCHER.http);
        return match ? match[1] : url;
    }
}

// Truncate URL for display
export function truncateUrl(url: string, maxLength: number = 50): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    // For older notes, show the date
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
}
