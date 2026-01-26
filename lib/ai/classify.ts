// /**
//  * Classify the type of a note based on its content
//  *
//  * Uses SmolLM 360M via ExecutorTorch for intelligent classification.
//  * Falls back to rule-based classification when the model isn't ready.
//  * Voice and scan types are set explicitly when creating notes.
//  */

// import type { NoteType } from "@/lib/database";
// import type { LLMModel, Message } from "./provider";

// interface ClassificationResult {
//     type: NoteType;
//     confidence: number;
// }

// // Valid note types for classification (voice and scan are set explicitly)
// const VALID_TYPES: Exclude<NoteType, "voice" | "scan">[] = ["meeting", "task", "idea", "journal", "reference", "note"];

// /**
//  * Get badge info for note types
//  */
// export function getNoteTypeBadge(type: NoteType): { label: string; color: string; bgColor: string } {
//     switch (type) {
//         case "meeting":
//             return { label: "Meeting", color: "#3B82F6", bgColor: "#3B82F620" };
//         case "task":
//             return { label: "Task", color: "#F59E0B", bgColor: "#F59E0B20" };
//         case "idea":
//             return { label: "Idea", color: "#8B5CF6", bgColor: "#8B5CF620" };
//         case "journal":
//             return { label: "Journal", color: "#10B981", bgColor: "#10B98120" };
//         case "reference":
//             return { label: "Reference", color: "#6B7280", bgColor: "#6B728020" };
//         case "voice":
//             return { label: "Voice", color: "#EF4444", bgColor: "#EF444420" };
//         case "scan":
//             return { label: "Scan", color: "#D97706", bgColor: "#D9770620" };
//         default:
//             return { label: "Note", color: "#9CA3AF", bgColor: "#9CA3AF20" };
//     }
// }

// /**
//  * Classify a note into one of the predefined types using AI
//  */
// export async function classifyNoteType(content: string, llm: LLMModel | null): Promise<NoteType> {
//     // Skip AI for very short content
//     if (content.trim().length < 20) {
//         return classifyWithRules(content).type;
//     }

//     // Try AI classification if model is ready and not busy
//     if (llm?.isReady && !llm.isGenerating) {
//         try {
//             const aiType = await classifyWithAI(content, llm);
//             if (aiType && VALID_TYPES.includes(aiType as any)) {
//                 return aiType;
//             }
//         } catch (error) {
//             console.warn("AI classification failed, using fallback:", error);
//         }
//     }

//     // Fallback to rule-based classification
//     return classifyWithRules(content).type;
// }

// /**
//  * AI-based classification using LLM
//  */
// async function classifyWithAI(content: string, llm: LLMModel): Promise<NoteType | null> {
//     const messages: Message[] = [
//         {
//             role: "system",
//             content: `You are a note classifier. Classify the given note into exactly ONE category from this list:
// - meeting (discussions, calls, meetings with people)
// - task (todos, action items, things to do)
// - idea (brainstorms, thoughts, concepts)
// - journal (personal reflections, daily logs, feelings)
// - reference (facts, information to remember, links, documentation)
// - note (general notes that don't fit above)

// Return ONLY the category name in lowercase, nothing else.`,
//         },
//         {
//             role: "user",
//             content: content.substring(0, 400),
//         },
//     ];

//     try {
//         // generate() now returns the response directly
//         const response = await llm.generate(messages);

//         // Parse the response
//         const cleanResponse = response.trim().toLowerCase();

//         // Extract the type from response (handle cases like "Category: meeting" or just "meeting")
//         for (const validType of VALID_TYPES) {
//             if (cleanResponse.includes(validType)) {
//                 return validType;
//             }
//         }

//         return null;
//     } catch (error) {
//         console.error("LLM classification error:", error);
//         return null;
//     }
// }

// /**
//  * Rule-based classification using keyword patterns and structural analysis (fallback)
//  */
// function classifyWithRules(content: string): ClassificationResult {
//     const lowerContent = content.toLowerCase();
//     const lines = content.split("\n").filter((l) => l.trim().length > 0);

//     // Score each type based on keyword presence and structure
//     const scores: Record<Exclude<NoteType, "voice" | "scan">, number> = {
//         meeting: 0,
//         task: 0,
//         idea: 0,
//         journal: 0,
//         reference: 0,
//         note: 0,
//     };

//     // ===== STRUCTURAL ANALYSIS =====

//     // Check for bullet/list structure (strong task indicator)
//     const bulletLines = lines.filter((l) => /^\s*[-•*]\s/.test(l)).length;
//     const numberedLines = lines.filter((l) => /^\s*\d+[.)]\s/.test(l)).length;
//     const checkboxLines = lines.filter((l) => /\[[\sx]\]/i.test(l)).length;

//     if (checkboxLines > 0) {
//         scores.task += checkboxLines * 3;
//     }
//     if (bulletLines > 2) {
//         scores.task += 1.5;
//         scores.meeting += 1;
//     }
//     if (numberedLines > 2) {
//         scores.task += 1.5;
//         scores.reference += 1;
//     }

//     // Check for question marks (idea exploration)
//     const questionCount = (content.match(/\?/g) || []).length;
//     if (questionCount > 2) {
//         scores.idea += questionCount * 0.5;
//     }

//     // Check for code/URLs (reference indicator)
//     const hasCode = /```[\s\S]*?```|`[^`]+`/.test(content);
//     const hasUrls = /https?:\/\/|www\./i.test(content);
//     if (hasCode) scores.reference += 2.5;
//     if (hasUrls) scores.reference += 2;

//     // First person pronoun density (journal indicator)
//     const words = lowerContent.split(/\s+/).length;
//     const firstPersonMatches = (lowerContent.match(/\bi\s|\bmy\b|\bme\b|\bmyself\b|\bi'm\b|\bi've\b|\bi'll\b/g) || [])
//         .length;
//     const firstPersonDensity = words > 0 ? firstPersonMatches / words : 0;
//     if (firstPersonDensity > 0.05) {
//         scores.journal += firstPersonDensity * 30;
//     }

//     // Time references (meeting/journal indicator)
//     const hasTimeRefs = /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|morning|afternoon|evening|today|yesterday|tomorrow/i.test(
//         content,
//     );
//     if (hasTimeRefs) {
//         scores.meeting += 1;
//         scores.journal += 1;
//     }

//     // ===== KEYWORD ANALYSIS =====

//     // Meeting indicators
//     const meetingKeywords = [
//         { word: "meeting", weight: 3 },
//         { word: "call", weight: 2 },
//         { word: "sync", weight: 2.5 },
//         { word: "standup", weight: 3 },
//         { word: "1:1", weight: 3 },
//         { word: "discussed", weight: 2 },
//         { word: "attendees", weight: 3 },
//         { word: "agenda", weight: 2.5 },
//         { word: "action items", weight: 2.5 },
//         { word: "follow-up", weight: 2 },
//         { word: "participants", weight: 2.5 },
//         { word: "zoom", weight: 2 },
//         { word: "recap", weight: 2 },
//     ];
//     for (const { word, weight } of meetingKeywords) {
//         if (lowerContent.includes(word)) {
//             scores.meeting += weight;
//         }
//     }

//     // Task indicators
//     const taskKeywords = [
//         { word: "todo", weight: 3 },
//         { word: "to-do", weight: 3 },
//         { word: "task", weight: 2.5 },
//         { word: "[ ]", weight: 3 },
//         { word: "[x]", weight: 3 },
//         { word: "due", weight: 2 },
//         { word: "deadline", weight: 2.5 },
//         { word: "need to", weight: 2 },
//         { word: "must", weight: 1.5 },
//         { word: "priority", weight: 2 },
//         { word: "urgent", weight: 2.5 },
//         { word: "reminder", weight: 2 },
//     ];
//     for (const { word, weight } of taskKeywords) {
//         if (lowerContent.includes(word)) {
//             scores.task += weight;
//         }
//     }

//     // Idea indicators
//     const ideaKeywords = [
//         { word: "idea", weight: 3 },
//         { word: "thought", weight: 2 },
//         { word: "what if", weight: 2.5 },
//         { word: "maybe", weight: 1.5 },
//         { word: "brainstorm", weight: 3 },
//         { word: "concept", weight: 2 },
//         { word: "hypothesis", weight: 2.5 },
//         { word: "wonder", weight: 2 },
//         { word: "imagine", weight: 2 },
//         { word: "potential", weight: 1.5 },
//         { word: "experiment", weight: 2 },
//     ];
//     for (const { word, weight } of ideaKeywords) {
//         if (lowerContent.includes(word)) {
//             scores.idea += weight;
//         }
//     }

//     // Journal indicators
//     const journalKeywords = [
//         { word: "today", weight: 2 },
//         { word: "feeling", weight: 2.5 },
//         { word: "felt", weight: 2 },
//         { word: "grateful", weight: 3 },
//         { word: "reflection", weight: 2.5 },
//         { word: "diary", weight: 3 },
//         { word: "mood", weight: 2 },
//         { word: "woke up", weight: 2 },
//         { word: "day was", weight: 2 },
//         { word: "stressed", weight: 2 },
//         { word: "happy", weight: 2 },
//         { word: "sad", weight: 2 },
//         { word: "excited", weight: 2 },
//     ];
//     for (const { word, weight } of journalKeywords) {
//         if (lowerContent.includes(word)) {
//             scores.journal += weight;
//         }
//     }

//     // Reference indicators
//     const referenceKeywords = [
//         { word: "definition", weight: 2.5 },
//         { word: "reference", weight: 2.5 },
//         { word: "source", weight: 2 },
//         { word: "article", weight: 2 },
//         { word: "documentation", weight: 2.5 },
//         { word: "guide", weight: 2 },
//         { word: "tutorial", weight: 2 },
//         { word: "how to", weight: 2 },
//         { word: "example", weight: 1.5 },
//         { word: "syntax", weight: 2 },
//     ];
//     for (const { word, weight } of referenceKeywords) {
//         if (lowerContent.includes(word)) {
//             scores.reference += weight;
//         }
//     }

//     // Find the highest scoring type
//     let maxScore = 0;
//     let maxType: NoteType = "note";

//     for (const [type, score] of Object.entries(scores) as [NoteType, number][]) {
//         if (score > maxScore) {
//             maxScore = score;
//             maxType = type;
//         }
//     }

//     // Calculate confidence
//     const sortedScores = Object.values(scores).sort((a, b) => b - a);
//     const scoreDiff = sortedScores[0] - (sortedScores[1] || 0);
//     const confidence = Math.min(0.4 + scoreDiff * 0.1 + maxScore * 0.03, 0.95);

//     // If no strong signal, default to generic note
//     if (maxScore < 2) {
//         return { type: "note", confidence: 0.8 };
//     }

//     return { type: maxType, confidence };
// }

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
    const messages: Message[] = [
        {
            role: "system",
            content: `Classify notes into categories. Reply with ONLY the category name.

Categories:
• meeting - discussions with people, calls, meetings, standups, sync sessions, recaps
• task - todos, action items, checkboxes, deadlines, things to do, reminders
• idea - brainstorms, concepts, "what if" thoughts, hypotheses, creative exploration
• journal - personal reflections, daily logs, feelings, moods, diary entries, gratitude
• reference - facts, documentation, code, links, guides, how-tos, definitions
• note - general notes that don't fit the above

Instructions:
1. Read the note carefully
2. Identify key characteristics (tone, structure, purpose)
3. Match to the best category
4. Reply with ONLY the category name in lowercase

Examples:
"Team sync at 2pm. Discussed Q1 goals. Action: John to send proposal by Friday." → meeting
"- Buy groceries\n- Call dentist\n- Finish report" → task
"What if we used AI to auto-categorize notes? Could save time." → idea
"Feeling grateful today. Had a great conversation with mom." → journal
"Python list comprehension: [x*2 for x in range(10)]" → reference`,
        },
        {
            role: "user",
            content: content.substring(0, 400),
        },
    ];

    try {
        // generate() now returns the response directly
        const response = await llm.generate(messages);

        // Parse the response - handle various formats
        const cleanResponse = response
            .trim()
            .toLowerCase()
            .replace(/^(category|type|answer|result):\s*/i, "") // Remove prefixes
            .replace(/[.,;!?]$/g, "") // Remove trailing punctuation
            .split(/[\s\n]/)[0]; // Take first word only

        // Direct match
        if (VALID_TYPES.includes(cleanResponse as any)) {
            return cleanResponse as NoteType;
        }

        // Fuzzy match - check if response contains a valid type
        for (const validType of VALID_TYPES) {
            if (cleanResponse.includes(validType)) {
                return validType;
            }
        }

        return null;
    } catch (error) {
        console.error("LLM classification error:", error);
        return null;
    }
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
        { word: "discussed", weight: 2 },
        { word: "attendees", weight: 3 },
        { word: "agenda", weight: 2.5 },
        { word: "action items", weight: 2.5 },
        { word: "follow-up", weight: 2 },
        { word: "participants", weight: 2.5 },
        { word: "zoom", weight: 2 },
        { word: "recap", weight: 2 },
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
