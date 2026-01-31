import { type LLMModel } from "@/lib/ai";
import { AskNotesResult } from "@/lib/ask-notes/ask-notes.type";
import { extractJsonObject } from "@/lib/utils/functions";

export async function interpretQuery(query: string, llm: LLMModel): Promise<AskNotesResult> {
    if (!llm?.isReady) {
        throw new Error("LLM model not ready");
    }

    const systemPrompt = `You are a helpful assistant that interprets natural language queries about finding notes. Your task is to analyze the user's query and extract:

1. Search terms - specific keywords or phrases to search for
2. Temporal hints - any time-related references (dates, periods, "recent", "last week", etc.)
3. Topics - main subjects or themes mentioned
4. Interpreted query - a clear, concise rephrasing of what the user is asking for

Respond with ONLY valid JSON in this exact format (no extra text, no markdown):
{
    "searchTerms": ["term1", "term2"],
    "temporalHint": "specific time reference or null",
    "topics": ["topic1", "topic2"],
    "interpretedQuery": "clear rephrasing of the query"
}

Guidelines:
- Extract concrete search terms that would appear in notes
- Recognize temporal expressions like "yesterday", "last month", "this week", "recently and all other time-related expressions"
- Identify topics like "work", "personal", "ideas", "meeting"
- Prioritize and parse all kinds of W/H questions
- Keep interpreted query concise but clear
- If no temporal hint, use null
- Focus on what the user wants to find, not how to find it`;

    const userPrompt = `Please analyze this query: "${query}"`;

    try {
        const messages = [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: userPrompt },
        ];

        const response = await llm.generate(messages);
        console.log("🤖 [Ask Notes] LLM response:", response);

        // Parse JSON response (robust to occasional non-JSON output)
        const raw = response.trim();
        const jsonCandidate = raw.startsWith("{") ? raw : extractJsonObject(raw);
        if (!jsonCandidate) {
            throw new Error("LLM did not return JSON");
        }
        const parsed = JSON.parse(jsonCandidate);

        // Validate the response structure
        if (!parsed.searchTerms || !Array.isArray(parsed.searchTerms)) {
            throw new Error("Invalid searchTerms in response");
        }
        if (!parsed.topics || !Array.isArray(parsed.topics)) {
            throw new Error("Invalid topics in response");
        }
        if (typeof parsed.interpretedQuery !== "string") {
            throw new Error("Invalid interpretedQuery in response");
        }
        if (parsed.temporalHint !== null && typeof parsed.temporalHint !== "string") {
            throw new Error("Invalid temporalHint in response");
        }

        console.log("🤖 [Ask Notes] Interpreted query:", {
            original: query,
            interpreted: parsed.interpretedQuery,
            searchTerms: parsed.searchTerms,
            temporalHint: parsed.temporalHint,
            topics: parsed.topics,
        });

        return {
            searchTerms: parsed.searchTerms,
            temporalHint: parsed.temporalHint,
            topics: parsed.topics,
            interpretedQuery: parsed.interpretedQuery,
        };
    } catch (error) {
        console.warn("[Ask Notes] Falling back (LLM interpretation failed):", error);
        // Fallback: treat the entire query as search terms
        return {
            searchTerms: [query],
            temporalHint: null,
            topics: [],
            interpretedQuery: query,
        };
    }
}
