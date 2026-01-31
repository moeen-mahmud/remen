import {
    LAST_MONTH,
    LAST_MONTH_GLOBAL,
    LAST_WEEK,
    LAST_WEEK_GLOBAL,
    LAST_YEAR,
    LAST_YEAR_GLOBAL,
    RELATIVE_TIME_PATTERNS,
    THIS_MONTH,
    THIS_MONTH_GLOBAL,
    THIS_WEEK,
    THIS_WEEK_GLOBAL,
} from "@/lib/config/regex-patterns";
import { DAYS, MONTHS, TEMPORAL_KEYWORDS } from "@/lib/consts/consts";
import { TemporalFilter } from "@/lib/search/search.types";
import { getLastDayOfWeek, getStartOfWeek, getThisDayOfWeek } from "@/lib/utils/functions";

export function parseTemporalQuery(query: string): TemporalFilter | null {
    const lowerQuery = query.toLowerCase().trim();

    // Try to match various patterns
    let result: TemporalFilter | null = null;

    // "X hours/minutes/days ago" pattern
    result = parseRelativeTime(lowerQuery);
    if (result) return result;

    // "yesterday", "today" pattern
    result = parseSimpleRelative(lowerQuery);
    if (result) return result;

    // "last/this [day]" pattern
    result = parseLastThisDay(lowerQuery);
    if (result) return result;

    // "last/this week/month/year" pattern
    result = parseLastThisPeriod(lowerQuery);
    if (result) return result;

    // Date patterns like "on January 5" or "in March"
    result = parseDateMention(lowerQuery);
    if (result) return result;

    return null;
}

function parseRelativeTime(query: string): TemporalFilter | null {
    for (const pattern of RELATIVE_TIME_PATTERNS) {
        const match = query.match(pattern);
        if (match) {
            const value = parseInt(match[1], 10);
            const unit = match[2].toLowerCase();

            const now = Date.now();
            let msAgo: number;
            let description: string;

            if (unit.startsWith("hour") || unit.startsWith("hr")) {
                msAgo = value * 60 * 60 * 1000;
                description = `${value} hour${value !== 1 ? "s" : ""} ago`;
            } else if (unit.startsWith("minute") || unit.startsWith("min")) {
                msAgo = value * 60 * 1000;
                description = `${value} minute${value !== 1 ? "s" : ""} ago`;
            } else if (unit.startsWith("day")) {
                msAgo = value * 24 * 60 * 60 * 1000;
                description = `${value} day${value !== 1 ? "s" : ""} ago`;
            } else if (unit.startsWith("week")) {
                msAgo = value * 7 * 24 * 60 * 60 * 1000;
                description = `${value} week${value !== 1 ? "s" : ""} ago`;
            } else if (unit.startsWith("month")) {
                msAgo = value * 30 * 24 * 60 * 60 * 1000; // Approximate
                description = `${value} month${value !== 1 ? "s" : ""} ago`;
            } else {
                continue;
            }

            // Create time window (±30 minutes for short durations, larger for longer)
            const windowSize = Math.min(msAgo * 0.5, 2 * 60 * 60 * 1000); // Max 2 hour window
            const startTime = now - msAgo - windowSize;
            const endTime = now - msAgo + windowSize;

            return {
                startTime,
                endTime,
                description: `Around ${description}`,
                query: query.replace(pattern, "").trim(),
            };
        }
    }

    return null;
}

function parseSimpleRelative(query: string): TemporalFilter | null {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (query.includes("yesterday")) {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
            startTime: yesterday.getTime(),
            endTime: today.getTime(),
            description: "Yesterday",
            query: query.replace(/yesterday/gi, "").trim(),
        };
    }

    if (query.includes("today")) {
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        return {
            startTime: today.getTime(),
            endTime: tomorrow.getTime(),
            description: "Today",
            query: query.replace(/today/gi, "").trim(),
        };
    }

    return null;
}

function parseLastThisDay(query: string): TemporalFilter | null {
    for (let i = 0; i < DAYS.length; i++) {
        const day = DAYS[i];

        // "last [day]" pattern
        const lastPattern = new RegExp(`last\\s+${day}`, "i");
        if (lastPattern.test(query)) {
            const targetDate = getLastDayOfWeek(i);
            const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
            return {
                startTime: targetDate.getTime(),
                endTime: nextDay.getTime(),
                description: `Last ${day.charAt(0).toUpperCase() + day.slice(1)}`,
                query: query.replace(lastPattern, "").trim(),
            };
        }

        // "this [day]" pattern
        const thisPattern = new RegExp(`this\\s+${day}`, "i");
        if (thisPattern.test(query)) {
            const targetDate = getThisDayOfWeek(i);
            const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
            return {
                startTime: targetDate.getTime(),
                endTime: nextDay.getTime(),
                description: `This ${day.charAt(0).toUpperCase() + day.slice(1)}`,
                query: query.replace(thisPattern, "").trim(),
            };
        }

        // "on [day]" pattern
        const onPattern = new RegExp(`on\\s+${day}`, "i");
        if (onPattern.test(query)) {
            const targetDate = getLastDayOfWeek(i);
            const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
            return {
                startTime: targetDate.getTime(),
                endTime: nextDay.getTime(),
                description: `Last ${day.charAt(0).toUpperCase() + day.slice(1)}`,
                query: query.replace(onPattern, "").trim(),
            };
        }
    }

    return null;
}

function parseLastThisPeriod(query: string): TemporalFilter | null {
    const now = new Date();

    // Last week
    if (LAST_WEEK.test(query)) {
        const endOfLastWeek = getStartOfWeek(now);
        const startOfLastWeek = new Date(endOfLastWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
            startTime: startOfLastWeek.getTime(),
            endTime: endOfLastWeek.getTime(),
            description: "Last week",
            query: query.replace(LAST_WEEK_GLOBAL, "").trim(),
        };
    }

    // This week
    if (THIS_WEEK.test(query)) {
        const startOfWeek = getStartOfWeek(now);
        const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        return {
            startTime: startOfWeek.getTime(),
            endTime: endOfWeek.getTime(),
            description: "This week",
            query: query.replace(THIS_WEEK_GLOBAL, "").trim(),
        };
    }

    // Last month
    if (LAST_MONTH.test(query)) {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
            startTime: startOfLastMonth.getTime(),
            endTime: startOfThisMonth.getTime(),
            description: "Last month",
            query: query.replace(LAST_MONTH_GLOBAL, "").trim(),
        };
    }

    // This month
    if (THIS_MONTH.test(query)) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
            startTime: startOfMonth.getTime(),
            endTime: startOfNextMonth.getTime(),
            description: "This month",
            query: query.replace(THIS_MONTH_GLOBAL, "").trim(),
        };
    }

    // Last year
    if (LAST_YEAR.test(query)) {
        const startOfThisYear = new Date(now.getFullYear(), 0, 1);
        const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
        return {
            startTime: startOfLastYear.getTime(),
            endTime: startOfThisYear.getTime(),
            description: "Last year",
            query: query.replace(LAST_YEAR_GLOBAL, "").trim(),
        };
    }

    return null;
}

function parseDateMention(query: string): TemporalFilter | null {
    const now = new Date();

    // "in [month]" pattern
    for (let i = 0; i < MONTHS.length; i++) {
        const month = MONTHS[i];
        const inPattern = new RegExp(`in\\s+${month}`, "i");
        if (inPattern.test(query)) {
            // Assume current or previous year
            let year = now.getFullYear();
            if (i > now.getMonth()) {
                year--; // If month is in the future, use last year
            }
            const startOfMonth = new Date(year, i, 1);
            const endOfMonth = new Date(year, i + 1, 1);
            return {
                startTime: startOfMonth.getTime(),
                endTime: endOfMonth.getTime(),
                description: `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`,
                query: query.replace(inPattern, "").trim(),
            };
        }
    }

    return null;
}

export function hasTemporalKeywords(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return TEMPORAL_KEYWORDS.some((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, "i");
        return regex.test(lowerQuery);
    });
}
