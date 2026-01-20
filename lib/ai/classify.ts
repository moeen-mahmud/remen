import type { NoteType } from "@/lib/database"

/**
 * Classify the type of a note based on its content
 *
 * Uses rule-based classification with weighted scoring and structural analysis.
 * Voice and scan types are set explicitly when creating notes.
 */

interface ClassificationResult {
    type: NoteType
    confidence: number
}

/**
 * Get badge info for note types
 */
export function getNoteTypeBadge(type: NoteType): { label: string; color: string; bgColor: string } {
    switch (type) {
        case "meeting":
            return { label: "Meeting", color: "#3B82F6", bgColor: "#3B82F620" }
        case "task":
            return { label: "Task", color: "#F59E0B", bgColor: "#F59E0B20" }
        case "idea":
            return { label: "Idea", color: "#8B5CF6", bgColor: "#8B5CF620" }
        case "journal":
            return { label: "Journal", color: "#10B981", bgColor: "#10B98120" }
        case "reference":
            return { label: "Reference", color: "#6B7280", bgColor: "#6B728020" }
        case "voice":
            return { label: "Voice", color: "#EF4444", bgColor: "#EF444420" }
        case "scan":
            return { label: "Scan", color: "#D97706", bgColor: "#D9770620" }
        default:
            return { label: "Note", color: "#9CA3AF", bgColor: "#9CA3AF20" }
    }
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
 * Rule-based classification using keyword patterns and structural analysis
 */
function classifyWithRules(content: string): ClassificationResult {
    const lowerContent = content.toLowerCase()
    const lines = content.split("\n").filter((l) => l.trim().length > 0)

    // Score each type based on keyword presence and structure
    const scores: Record<Exclude<NoteType, "voice" | "scan">, number> = {
        meeting: 0,
        task: 0,
        idea: 0,
        journal: 0,
        reference: 0,
        note: 0,
    }

    // ===== STRUCTURAL ANALYSIS =====

    // Check for bullet/list structure (strong task indicator)
    const bulletLines = lines.filter((l) => /^\s*[-•*]\s/.test(l)).length
    const numberedLines = lines.filter((l) => /^\s*\d+[.)]\s/.test(l)).length
    const checkboxLines = lines.filter((l) => /\[[\sx]\]/i.test(l)).length

    if (checkboxLines > 0) {
        scores.task += checkboxLines * 3
    }
    if (bulletLines > 2) {
        scores.task += 1.5
        scores.meeting += 1 // Meeting notes often have bullets
    }
    if (numberedLines > 2) {
        scores.task += 1.5
        scores.reference += 1 // Step-by-step guides
    }

    // Check for question marks (idea exploration)
    const questionCount = (content.match(/\?/g) || []).length
    if (questionCount > 2) {
        scores.idea += questionCount * 0.5
    }

    // Check for code/URLs (reference indicator)
    const hasCode = /```[\s\S]*?```|`[^`]+`/.test(content)
    const hasUrls = /https?:\/\/|www\./i.test(content)
    if (hasCode) scores.reference += 2.5
    if (hasUrls) scores.reference += 2

    // First person pronoun density (journal indicator)
    const words = lowerContent.split(/\s+/).length
    const firstPersonMatches = (lowerContent.match(/\bi\s|\bmy\b|\bme\b|\bmyself\b|\bi'm\b|\bi've\b|\bi'll\b/g) || [])
        .length
    const firstPersonDensity = words > 0 ? firstPersonMatches / words : 0
    if (firstPersonDensity > 0.05) {
        scores.journal += firstPersonDensity * 30
    }

    // Time references (meeting/journal indicator)
    const hasTimeRefs = /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|morning|afternoon|evening|today|yesterday|tomorrow/i.test(
        content,
    )
    if (hasTimeRefs) {
        scores.meeting += 1
        scores.journal += 1
    }

    // ===== KEYWORD ANALYSIS =====

    // Meeting indicators (high weight)
    const meetingKeywords = [
        { word: "meeting", weight: 3 },
        { word: "call", weight: 2 },
        { word: "sync", weight: 2.5 },
        { word: "standup", weight: 3 },
        { word: "1:1", weight: 3 },
        { word: "one-on-one", weight: 3 },
        { word: "discussed", weight: 2 },
        { word: "attendees", weight: 3 },
        { word: "agenda", weight: 2.5 },
        { word: "action items", weight: 2.5 },
        { word: "follow-up", weight: 2 },
        { word: "participants", weight: 2.5 },
        { word: "zoom", weight: 2 },
        { word: "teams", weight: 1.5 },
        { word: "meet", weight: 1.5 },
        { word: "scheduled", weight: 1.5 },
        { word: "recap", weight: 2 },
        { word: "notes from", weight: 2 },
    ]
    for (const { word, weight } of meetingKeywords) {
        if (lowerContent.includes(word)) {
            scores.meeting += weight
        }
    }

    // Task indicators
    const taskKeywords = [
        { word: "todo", weight: 3 },
        { word: "to-do", weight: 3 },
        { word: "task", weight: 2.5 },
        { word: "[ ]", weight: 3 },
        { word: "[x]", weight: 3 },
        { word: "due", weight: 2 },
        { word: "deadline", weight: 2.5 },
        { word: "complete", weight: 1.5 },
        { word: "finish", weight: 1.5 },
        { word: "need to", weight: 2 },
        { word: "must", weight: 1.5 },
        { word: "should", weight: 1 },
        { word: "priority", weight: 2 },
        { word: "urgent", weight: 2.5 },
        { word: "asap", weight: 2.5 },
        { word: "reminder", weight: 2 },
        { word: "don't forget", weight: 2 },
        { word: "remember to", weight: 2 },
    ]
    for (const { word, weight } of taskKeywords) {
        if (lowerContent.includes(word)) {
            scores.task += weight
        }
    }

    // Idea indicators
    const ideaKeywords = [
        { word: "idea", weight: 3 },
        { word: "thought", weight: 2 },
        { word: "what if", weight: 2.5 },
        { word: "maybe", weight: 1.5 },
        { word: "could", weight: 1 },
        { word: "brainstorm", weight: 3 },
        { word: "concept", weight: 2 },
        { word: "hypothesis", weight: 2.5 },
        { word: "explore", weight: 1.5 },
        { word: "consider", weight: 1.5 },
        { word: "wonder", weight: 2 },
        { word: "imagine", weight: 2 },
        { word: "potential", weight: 1.5 },
        { word: "possibility", weight: 1.5 },
        { word: "experiment", weight: 2 },
        { word: "theory", weight: 2 },
        { word: "innovation", weight: 2 },
    ]
    for (const { word, weight } of ideaKeywords) {
        if (lowerContent.includes(word)) {
            scores.idea += weight
        }
    }

    // Journal indicators
    const journalKeywords = [
        { word: "today", weight: 2 },
        { word: "feeling", weight: 2.5 },
        { word: "felt", weight: 2 },
        { word: "grateful", weight: 3 },
        { word: "thankful", weight: 3 },
        { word: "reflection", weight: 2.5 },
        { word: "diary", weight: 3 },
        { word: "personal", weight: 1.5 },
        { word: "mood", weight: 2 },
        { word: "energy", weight: 1.5 },
        { word: "sleep", weight: 1.5 },
        { word: "woke up", weight: 2 },
        { word: "went to", weight: 1 },
        { word: "day was", weight: 2 },
        { word: "morning", weight: 1.5 },
        { word: "evening", weight: 1.5 },
        { word: "stressed", weight: 2 },
        { word: "happy", weight: 2 },
        { word: "sad", weight: 2 },
        { word: "excited", weight: 2 },
        { word: "anxious", weight: 2 },
    ]
    for (const { word, weight } of journalKeywords) {
        if (lowerContent.includes(word)) {
            scores.journal += weight
        }
    }

    // Reference indicators
    const referenceKeywords = [
        { word: "definition", weight: 2.5 },
        { word: "meaning", weight: 2 },
        { word: "reference", weight: 2.5 },
        { word: "source", weight: 2 },
        { word: "link", weight: 1.5 },
        { word: "article", weight: 2 },
        { word: "book", weight: 2 },
        { word: "paper", weight: 2 },
        { word: "documentation", weight: 2.5 },
        { word: "docs", weight: 2 },
        { word: "api", weight: 2 },
        { word: "guide", weight: 2 },
        { word: "tutorial", weight: 2 },
        { word: "how to", weight: 2 },
        { word: "example", weight: 1.5 },
        { word: "syntax", weight: 2 },
        { word: "function", weight: 1.5 },
        { word: "method", weight: 1.5 },
    ]
    for (const { word, weight } of referenceKeywords) {
        if (lowerContent.includes(word)) {
            scores.reference += weight
        }
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
    const confidence = Math.min(0.4 + scoreDiff * 0.1 + maxScore * 0.03, 0.95)

    // If no strong signal, default to generic note
    if (maxScore < 2) {
        return { type: "note", confidence: 0.8 }
    }

    return { type: maxType, confidence }
}

/**
 * AI-based classification (to be implemented)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function classifyWithAI(content: string): Promise<ClassificationResult> {
    // TODO: Implement ExecuTorch classification
    return { type: "note", confidence: 0.5 }
}
