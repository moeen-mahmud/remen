import type { EmbeddingsModel } from "@/lib/ai/ai.types";
import { cosineSimilarity } from "@/lib/ai/embeddings";
import { getAllNotes } from "@/lib/database/database";
import type { Note } from "@/lib/database/database.types";
import { useDebouncedValue } from "@/lib/hooks/use-debounce";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 3000;
const MIN_CONTENT_LENGTH = 30;
const SIMILARITY_THRESHOLD = 0.35;
const SKIP_SIMILARITY = 0.95; // Skip if content barely changed
const MAX_RESULTS = 3;

interface ContextualRecallResult {
    relatedNotes: Note[];
    isDismissed: boolean;
    dismiss: () => void;
    restore: () => void;
}

export function useContextualRecall(
    noteId: string | null,
    content: string,
    embeddingsModel: EmbeddingsModel | null,
): ContextualRecallResult {
    const [relatedNotes, setRelatedNotes] = useState<Note[]>([]);
    const [isDismissed, setIsDismissed] = useState(false);

    const debouncedContent = useDebouncedValue(content, DEBOUNCE_MS);

    // Stable ref for the model — avoids re-triggering effect on every provider render
    const modelRef = useRef(embeddingsModel);
    modelRef.current = embeddingsModel;

    // Stable ref for noteId
    const noteIdRef = useRef(noteId);
    noteIdRef.current = noteId;

    // Cache previous embedding to detect trivial edits
    const prevEmbeddingRef = useRef<number[] | null>(null);
    // Abort counter for race protection
    const abortRef = useRef(0);
    // Prevent concurrent runs
    const isRunningRef = useRef(false);

    const dismiss = useCallback(() => setIsDismissed(true), []);
    const restore = useCallback(() => setIsDismissed(false), []);

    // Only trigger on actual content changes — model checked inside via ref
    useEffect(() => {
        if (debouncedContent.length < MIN_CONTENT_LENGTH) {
            setRelatedNotes([]);
            return;
        }

        const currentAbort = ++abortRef.current;

        const run = async () => {
            // Prevent overlapping runs
            if (isRunningRef.current) return;

            const model = modelRef.current;
            if (!model?.isReady || model.isGenerating) {
                console.log("[ContextualRecall] Model not available, will retry in 2s");
                // Retry after a delay instead of depending on the model object
                setTimeout(() => {
                    if (currentAbort === abortRef.current) run();
                }, 2000);
                return;
            }

            isRunningRef.current = true;
            const currentNoteId = noteIdRef.current;

            try {
                console.log(
                    `[ContextualRecall] Running (${debouncedContent.length} chars, noteId: ${currentNoteId?.substring(0, 8) || "new"})`,
                );

                const liveEmbedding = await model.forward(debouncedContent);
                if (currentAbort !== abortRef.current) return;

                const liveVec = Array.from(liveEmbedding);

                // Skip if content hasn't meaningfully changed
                if (prevEmbeddingRef.current && cosineSimilarity(liveVec, prevEmbeddingRef.current) > SKIP_SIMILARITY) {
                    console.log("[ContextualRecall] Content barely changed, skipping");
                    return;
                }
                prevEmbeddingRef.current = liveVec;

                // Un-dismiss when content changes meaningfully
                setIsDismissed(false);

                const allNotes = await getAllNotes();
                if (currentAbort !== abortRef.current) return;

                const scored: { note: Note; score: number }[] = [];

                for (const note of allNotes) {
                    if (note.id === currentNoteId) continue;
                    if (!note.embedding) continue;

                    try {
                        const storedVec: number[] = JSON.parse(note.embedding);
                        if (storedVec.length !== liveVec.length) continue;

                        const score = cosineSimilarity(liveVec, storedVec);
                        if (score >= SIMILARITY_THRESHOLD) {
                            scored.push({ note, score });
                        }
                    } catch {
                        // Malformed embedding, skip
                    }
                }

                if (currentAbort !== abortRef.current) return;

                scored.sort((a, b) => b.score - a.score);
                const results = scored.slice(0, MAX_RESULTS);
                console.log(
                    `[ContextualRecall] ${scored.length} matches above ${SIMILARITY_THRESHOLD}, showing ${results.length}`,
                    results.map((r) => `${r.note.title?.substring(0, 20) || "untitled"} (${r.score.toFixed(3)})`),
                );
                setRelatedNotes(results.map((s) => s.note));
            } catch (error) {
                console.error("[ContextualRecall] Error:", error);
            } finally {
                isRunningRef.current = false;
            }
        };

        run();
    }, [debouncedContent]); // Only debouncedContent — model accessed via ref

    return { relatedNotes, isDismissed, dismiss, restore };
}
