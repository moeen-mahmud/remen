import { aiQueue } from "@/lib/ai/queue";
import { useEffect, useRef, useState } from "react";

export function useAIProcessingNotes(enabled: boolean) {
    const [processingNoteIds, setProcessingNoteIds] = useState<Set<string>>(new Set());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const update = () => {
            const { currentJobId } = aiQueue.getStatus();

            setProcessingNoteIds((prev: any) => {
                const next = currentJobId ? new Set([currentJobId]) : new Set();

                if (prev.size === next.size && [...prev].every((id) => next.has(id))) {
                    return prev;
                }

                return next;
            });
        };

        const handleComplete = () => update();

        aiQueue.onProcessingComplete(handleComplete);
        update();

        intervalRef.current = setInterval(update, 1000) as unknown as NodeJS.Timeout;

        return () => {
            aiQueue.removeProcessingCompleteCallback(handleComplete);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled]);

    return processingNoteIds;
}
