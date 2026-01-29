/**
 * Classify the type of a note based on its content
 *
 * Uses SmolLM 360M via ExecutorTorch for intelligent classification.
 * Falls back to rule-based classification when the model isn't ready.
 * Voice and scan types are set explicitly when creating notes.
 */

import type { NoteType } from "@/lib/database";
import type { LLMModel, Message } from "./provider";

interface ClassificationResult {
    type: NoteType;
    confidence: number;
}

// Valid note types for classification (voice and scan are set explicitly)
const VALID_TYPES: Exclude<NoteType, "voice" | "scan">[] = ["meeting", "task", "idea", "journal", "reference", "note"];

/**
 * Get badge info for note types
 */
export function getNoteTypeBadge(type: NoteType): { label: string; color: string; bgColor: string } {
    switch (type) {
        case "meeting":
            return { label: "Meeting", color: "#3B82F6", bgColor: "#3B82F620" };
        case "task":
            return { label: "Task", color: "#F59E0B", bgColor: "#F59E0B20" };
        case "idea":
            return { label: "Idea", color: "#8B5CF6", bgColor: "#8B5CF620" };
        case "journal":
            return { label: "Journal", color: "#10B981", bgColor: "#10B98120" };
        case "reference":
            return { label: "Reference", color: "#6B7280", bgColor: "#6B728020" };
        case "voice":
            return { label: "Voice", color: "#EF4444", bgColor: "#EF444420" };
        case "scan":
            return { label: "Scan", color: "#D97706", bgColor: "#D9770620" };
        default:
            return { label: "Note", color: "#9CA3AF", bgColor: "#9CA3AF20" };
    }
}

/**
 * Classify a note into one of the predefined types using AI
 */
export async function classifyNoteType(content: string, llm: LLMModel | null): Promise<NoteType> {
    // Skip AI for very short content
    if (content.trim().length < 20) {
        return classifyWithRules(content).type;
    }

    // Try AI classification if model is ready and not busy
    if (llm?.isReady && !llm.isGenerating) {
        try {
            const aiType = await classifyWithAI(content, llm);
            if (aiType && VALID_TYPES.includes(aiType as any)) {
                return aiType;
            }
        } catch (error) {
            console.warn("AI classification failed, using fallback:", error);
        }
    }

    // Fallback to rule-based classification
    return classifyWithRules(content).type;
}

/**
 * AI-based classification using LLM
 */
async function classifyWithAI(content: string, llm: LLMModel): Promise<NoteType | null> {
    // Truncate content for focus
    const contentPreview = content.length > 400 ? content.substring(0, 400).trim() : content.trim();

    const systemPrompt = buildClassificationPrompt();

    const messages: Message[] = [
        {
            role: "system",
            content: systemPrompt,
        },
        {
            role: "user",
            content: `Classify this note:\n\n${contentPreview}`,
        },
    ];

    try {
        const response = await llm.generate(messages);

        // Parse and validate the response
        const classifiedType = parseClassificationResponse(response);

        return classifiedType;
    } catch (error) {
        console.error("LLM classification error:", error);
        return null;
    }
}

/**
 * Build classification system prompt without content examples
 */
function buildClassificationPrompt(): string {
    const instruction =
        "You are a note classifier. Analyze the content and respond with exactly ONE word from this list:";

    const typeDescriptions = [
        "meeting - if about a meeting, call, sync, or discussion with others",
        "task - if it's a to-do list, action items, or things to complete",
        "idea - if exploring concepts, questions, or brainstorming",
        "journal - if expressing personal feelings, reflections, or daily events",
        "reference - if documenting information, code, guides, or resources",
        "note - if general information that doesn't fit other categories",
    ];

    const rules = [
        "Output ONLY one word: meeting, task, idea, journal, reference, or note",
        "No explanations, no punctuation, no extra text",
        "Choose the category that best matches the content's primary purpose",
    ];

    return `${instruction}\n\n${typeDescriptions.join("\n")}\n\n${rules.join("\n")}`;
}

/**
 * Parse classification response from LLM
 */
function parseClassificationResponse(response: string): NoteType | null {
    // Clean the response aggressively
    const cleaned = response
        .trim()
        .toLowerCase()
        .split("\n")[0] // Take only first line
        .replace(/^(category|type|classification|answer|result):\s*/i, "") // Remove prefixes
        .replace(/[.,;!?'"]/g, "") // Remove all punctuation
        .replace(/\s+/g, " ") // Normalize spaces
        .split(/[\s]/)[0]; // Take first word only

    // Direct match
    if (VALID_TYPES.includes(cleaned as any)) {
        return cleaned as NoteType;
    }

    // Fuzzy match - check if response contains a valid type
    for (const validType of VALID_TYPES) {
        if (cleaned.includes(validType)) {
            return validType;
        }
    }

    // Check for common variations/misspellings
    const variations: Record<string, NoteType> = {
        meet: "meeting",
        mtg: "meeting",
        discussion: "meeting",
        todo: "task",
        todos: "task",
        tasklist: "task",
        checklist: "task",
        concept: "idea",
        brainstorm: "idea",
        thought: "idea",
        diary: "journal",
        log: "journal",
        entry: "journal",
        doc: "reference",
        docs: "reference",
        documentation: "reference",
        guide: "reference",
        info: "note",
        notes: "note",
        general: "note",
    };

    for (const [variation, type] of Object.entries(variations)) {
        if (cleaned.includes(variation)) {
            return type;
        }
    }

    return null;
}

/**
 * Rule-based classification using keyword patterns and structural analysis (fallback)
 */
function classifyWithRules(content: string): ClassificationResult {
    const lowerContent = content.toLowerCase();
    const lines = content.split("\n").filter((l) => l.trim().length > 0);

    // Score each type based on keyword presence and structure
    const scores: Record<Exclude<NoteType, "voice" | "scan">, number> = {
        meeting: 0,
        task: 0,
        idea: 0,
        journal: 0,
        reference: 0,
        note: 0,
    };

    // ===== STRUCTURAL ANALYSIS =====

    // Check for bullet/list structure (strong task indicator)
    const bulletLines = lines.filter((l) => /^\s*[-•*]\s/.test(l)).length;
    const numberedLines = lines.filter((l) => /^\s*\d+[.)]\s/.test(l)).length;
    const checkboxLines = lines.filter((l) => /\[[\sx]\]/i.test(l)).length;
    // Check for task pattern: - [ ] or - [x]
    const taskPatternLines = lines.filter((l) => /^\s*-\s+\[[\sxX]\]\s+/.test(l)).length;

    // Strong task detection - if we have task pattern, strongly classify as task
    if (taskPatternLines > 0) {
        scores.task += taskPatternLines * 10; // Very high weight for explicit task format
    }
    if (checkboxLines > 0) {
        scores.task += checkboxLines * 3;
    }
    if (bulletLines > 2) {
        scores.task += 1.5;
        scores.meeting += 1;
    }
    if (numberedLines > 2) {
        scores.task += 1.5;
        scores.reference += 1;
    }

    // Check for question marks (idea exploration)
    const questionCount = (content.match(/\?/g) || []).length;
    if (questionCount > 2) {
        scores.idea += questionCount * 0.5;
    }

    // Check for code/URLs (reference indicator)
    const hasCode = /```[\s\S]*?```|`[^`]+`/.test(content);
    const hasUrls = /https?:\/\/|www\./i.test(content);
    if (hasCode) scores.reference += 2.5;
    if (hasUrls) scores.reference += 2;

    // First person pronoun density (journal indicator)
    const words = lowerContent.split(/\s+/).length;
    const firstPersonMatches = (lowerContent.match(/\bi\s|\bmy\b|\bme\b|\bmyself\b|\bi'm\b|\bi've\b|\bi'll\b/g) || [])
        .length;
    const firstPersonDensity = words > 0 ? firstPersonMatches / words : 0;
    if (firstPersonDensity > 0.05) {
        scores.journal += firstPersonDensity * 30;
    }

    // Time references (meeting/journal indicator)
    const hasTimeRefs = /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|morning|afternoon|evening|today|yesterday|tomorrow/i.test(
        content,
    );
    if (hasTimeRefs) {
        scores.meeting += 1;
        scores.journal += 1;
    }

    // ===== KEYWORD ANALYSIS =====

    // Meeting indicators
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
        { word: "recap", weight: 2 },
        { word: "notes from", weight: 2 },
    ];
    for (const { word, weight } of meetingKeywords) {
        if (lowerContent.includes(word)) {
            scores.meeting += weight;
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
        { word: "need to", weight: 2 },
        { word: "must", weight: 1.5 },
        { word: "priority", weight: 2 },
        { word: "urgent", weight: 2.5 },
        { word: "reminder", weight: 2 },
        { word: "complete", weight: 1.5 },
        { word: "finish", weight: 1.5 },
    ];
    for (const { word, weight } of taskKeywords) {
        if (lowerContent.includes(word)) {
            scores.task += weight;
        }
    }

    // Idea indicators
    const ideaKeywords = [
        { word: "idea", weight: 3 },
        { word: "thought", weight: 2 },
        { word: "what if", weight: 2.5 },
        { word: "maybe", weight: 1.5 },
        { word: "brainstorm", weight: 3 },
        { word: "concept", weight: 2 },
        { word: "hypothesis", weight: 2.5 },
        { word: "wonder", weight: 2 },
        { word: "imagine", weight: 2 },
        { word: "potential", weight: 1.5 },
        { word: "experiment", weight: 2 },
        { word: "could we", weight: 2 },
        { word: "possibility", weight: 2 },
    ];
    for (const { word, weight } of ideaKeywords) {
        if (lowerContent.includes(word)) {
            scores.idea += weight;
        }
    }

    // Journal indicators
    const journalKeywords = [
        { word: "today", weight: 2 },
        { word: "feeling", weight: 2.5 },
        { word: "felt", weight: 2 },
        { word: "grateful", weight: 3 },
        { word: "reflection", weight: 2.5 },
        { word: "diary", weight: 3 },
        { word: "mood", weight: 2 },
        { word: "woke up", weight: 2 },
        { word: "day was", weight: 2 },
        { word: "stressed", weight: 2 },
        { word: "happy", weight: 2 },
        { word: "sad", weight: 2 },
        { word: "excited", weight: 2 },
        { word: "anxious", weight: 2 },
        { word: "proud", weight: 2 },
    ];
    for (const { word, weight } of journalKeywords) {
        if (lowerContent.includes(word)) {
            scores.journal += weight;
        }
    }

    // Reference indicators
    const referenceKeywords = [
        { word: "definition", weight: 2.5 },
        { word: "reference", weight: 2.5 },
        { word: "source", weight: 2 },
        { word: "article", weight: 2 },
        { word: "documentation", weight: 2.5 },
        { word: "guide", weight: 2 },
        { word: "tutorial", weight: 2 },
        { word: "how to", weight: 2 },
        { word: "example", weight: 1.5 },
        { word: "syntax", weight: 2 },
        { word: "cheat sheet", weight: 2.5 },
        { word: "commands", weight: 2 },
    ];
    for (const { word, weight } of referenceKeywords) {
        if (lowerContent.includes(word)) {
            scores.reference += weight;
        }
    }

    // Find the highest scoring type
    let maxScore = 0;
    let maxType: NoteType = "note";

    for (const [type, score] of Object.entries(scores) as [NoteType, number][]) {
        if (score > maxScore) {
            maxScore = score;
            maxType = type;
        }
    }

    // Calculate confidence
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const scoreDiff = sortedScores[0] - (sortedScores[1] || 0);
    const confidence = Math.min(0.4 + scoreDiff * 0.1 + maxScore * 0.03, 0.95);

    // If no strong signal, default to generic note
    if (maxScore < 2) {
        return { type: "note", confidence: 0.8 };
    }

    return { type: maxType, confidence };
}
