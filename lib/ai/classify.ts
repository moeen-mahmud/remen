import type { NoteType } from "@/lib/database"

/**
 * Classify the type of a note based on its content
 *
 * Uses rule-based classification with keyword matching.
 * Can be enhanced with AI classification later.
 */

interface ClassificationResult {
    type: NoteType
    confidence: number
}

/**
 * Classify a note into one of the predefined types
 */
export async function classifyNoteType(content: string): Promise<NoteType> {
    // Try rule-based classification first
    const ruleBasedResult = classifyWithRules(content)
    if (ruleBasedResult.confidence > 0.7) {
        return ruleBasedResult.type
    }

    // TODO: Use AI classification for ambiguous cases
    // For now, return the rule-based result even with lower confidence
    return ruleBasedResult.type
}

/**
 * Rule-based classification using keyword patterns
 */
function classifyWithRules(content: string): ClassificationResult {
    const lowerContent = content.toLowerCase()

    // Score each type based on keyword presence
    const scores: Record<NoteType, number> = {
        meeting: 0,
        task: 0,
        idea: 0,
        journal: 0,
        reference: 0,
        note: 0,
    }

    // Meeting indicators
    const meetingKeywords = [
        "meeting",
        "call",
        "sync",
        "standup",
        "1:1",
        "one-on-one",
        "discussed",
        "attendees",
        "agenda",
        "action items",
        "follow-up",
        "participants",
        "zoom",
        "teams",
        "meet",
    ]
    for (const keyword of meetingKeywords) {
        if (lowerContent.includes(keyword)) {
            scores.meeting += 1.5
        }
    }

    // Task indicators
    const taskKeywords = [
        "todo",
        "task",
        "[ ]",
        "[x]",
        "- [ ]",
        "- [x]",
        "due",
        "deadline",
        "complete",
        "finish",
        "need to",
        "must",
        "should",
        "priority",
        "urgent",
        "asap",
    ]
    for (const keyword of taskKeywords) {
        if (lowerContent.includes(keyword)) {
            scores.task += 1.5
        }
    }
    // Checkbox patterns give strong signal
    if (/\[[\sx]\]/i.test(content)) {
        scores.task += 3
    }

    // Idea indicators
    const ideaKeywords = [
        "idea",
        "thought",
        "what if",
        "maybe",
        "could",
        "brainstorm",
        "concept",
        "hypothesis",
        "explore",
        "consider",
        "wonder",
        "imagine",
        "potential",
        "possibility",
    ]
    for (const keyword of ideaKeywords) {
        if (lowerContent.includes(keyword)) {
            scores.idea += 1.5
        }
    }

    // Journal indicators
    const journalKeywords = [
        "today",
        "feeling",
        "felt",
        "morning",
        "evening",
        "day",
        "week",
        "grateful",
        "thankful",
        "reflection",
        "diary",
        "personal",
        "mood",
        "energy",
        "sleep",
        "woke up",
        "went to",
    ]
    for (const keyword of journalKeywords) {
        if (lowerContent.includes(keyword)) {
            scores.journal += 1.2
        }
    }
    // First person pronouns suggest journal
    const firstPersonCount = (lowerContent.match(/\bi\s|\bmy\b|\bme\b|\bmyself\b/g) || []).length
    if (firstPersonCount > 3) {
        scores.journal += 2
    }

    // Reference indicators
    const referenceKeywords = [
        "definition",
        "meaning",
        "reference",
        "source",
        "link",
        "http",
        "www",
        "article",
        "book",
        "paper",
        "documentation",
        "docs",
        "api",
        "guide",
        "tutorial",
        "how to",
        "howto",
        "example",
    ]
    for (const keyword of referenceKeywords) {
        if (lowerContent.includes(keyword)) {
            scores.reference += 1.5
        }
    }
    // URLs strongly suggest reference
    if (/https?:\/\/|www\./i.test(content)) {
        scores.reference += 2
    }

    // Find the highest scoring type
    let maxScore = 0
    let maxType: NoteType = "note"

    for (const [type, score] of Object.entries(scores) as [NoteType, number][]) {
        if (score > maxScore) {
            maxScore = score
            maxType = type
        }
    }

    // Calculate confidence based on score magnitude and separation from others
    const sortedScores = Object.values(scores).sort((a, b) => b - a)
    const scoreDiff = sortedScores[0] - (sortedScores[1] || 0)
    const confidence = Math.min(0.5 + scoreDiff * 0.1 + maxScore * 0.05, 0.95)

    // If no strong signal, default to generic note
    if (maxScore < 1) {
        return { type: "note", confidence: 0.9 }
    }

    return { type: maxType, confidence }
}

/**
 * AI-based classification (to be implemented)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function classifyWithAI(content: string): Promise<ClassificationResult> {
    // TODO: Implement ExecuTorch classification
    /*
    const prompt = `Classify this note into ONE category. Return only the category name.

Categories:
- meeting (discussions, calls, meetings with people)
- task (todos, action items, things to do)
- idea (brainstorms, thoughts, concepts)
- journal (personal reflections, daily logs)
- reference (facts, information to remember)
- note (general notes that don't fit above)

Note:
${content.substring(0, 300)}

Category:`;

    const result = await LLAMA.generate(prompt, { maxTokens: 10, temperature: 0.1 });
    const type = result.trim().toLowerCase();
    
    const validTypes: NoteType[] = ['meeting', 'task', 'idea', 'journal', 'reference', 'note'];
    return {
        type: validTypes.includes(type as NoteType) ? type as NoteType : 'note',
        confidence: 0.8
    };
    */

    return { type: "note", confidence: 0.5 }
}
