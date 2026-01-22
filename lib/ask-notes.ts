/**
 * Ask Notes service
 *
 * Uses LLM to interpret natural language queries for note search.
 * Extracts intent, topics, temporal context, and generates search terms.
 */

import { type LLMModel } from "@/lib/ai/provider"

export interface AskNotesResult {
    searchTerms: string[]
    temporalHint: string | null
    topics: string[]
    interpretedQuery: string
}

/**
 * Interpret a natural language query using LLM to extract search parameters
 */
export async function interpretQuery(query: string, llm: LLMModel): Promise<AskNotesResult> {
    if (!llm?.isReady) {
        throw new Error("LLM model not ready")
    }

    const systemPrompt = `You are a helpful assistant that interprets natural language queries about finding notes. Your task is to analyze the user's query and extract:

1. Search terms - specific keywords or phrases to search for
2. Temporal hints - any time-related references (dates, periods, "recent", "last week", etc.)
3. Topics - main subjects or themes mentioned
4. Interpreted query - a clear, concise rephrasing of what the user is asking for

Respond with valid JSON in this exact format:
{
    "searchTerms": ["term1", "term2"],
    "temporalHint": "specific time reference or null",
    "topics": ["topic1", "topic2"],
    "interpretedQuery": "clear rephrasing of the query"
}

Guidelines:
- Extract concrete search terms that would appear in notes
- Recognize temporal expressions like "yesterday", "last month", "this week", "recently"
- Identify topics like "work", "personal", "ideas", "meeting"
- Keep interpreted query concise but clear
- If no temporal hint, use null
- Focus on what the user wants to find, not how to find it`

    const userPrompt = `Please analyze this query: "${query}"`

    try {
        const messages = [
            { role: "system" as const, content: systemPrompt },
            { role: "user" as const, content: userPrompt },
        ]

        const response = await llm.generate(messages)
        console.log("🤖 [Ask Notes] LLM response:", response)

        // Parse JSON response
        const parsed = JSON.parse(response.trim())

        // Validate the response structure
        if (!parsed.searchTerms || !Array.isArray(parsed.searchTerms)) {
            throw new Error("Invalid searchTerms in response")
        }
        if (!parsed.topics || !Array.isArray(parsed.topics)) {
            throw new Error("Invalid topics in response")
        }
        if (typeof parsed.interpretedQuery !== "string") {
            throw new Error("Invalid interpretedQuery in response")
        }
        if (parsed.temporalHint !== null && typeof parsed.temporalHint !== "string") {
            throw new Error("Invalid temporalHint in response")
        }

        console.log("🤖 [Ask Notes] Interpreted query:", {
            original: query,
            interpreted: parsed.interpretedQuery,
            searchTerms: parsed.searchTerms,
            temporalHint: parsed.temporalHint,
            topics: parsed.topics,
        })

        return {
            searchTerms: parsed.searchTerms,
            temporalHint: parsed.temporalHint,
            topics: parsed.topics,
            interpretedQuery: parsed.interpretedQuery,
        }
    } catch (error) {
        console.error("❌ [Ask Notes] Failed to interpret query:", error)
        // Fallback: treat the entire query as search terms
        return {
            searchTerms: [query],
            temporalHint: null,
            topics: [],
            interpretedQuery: query,
        }
    }
}

/**
 * Check if a query looks like it should use LLM interpretation
 * (vs simple keyword search)
 */
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
    ]

    return llmQueryPatterns.some((pattern) => pattern.test(query))
}
