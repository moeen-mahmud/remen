/**
 * AI Provider Context
 *
 * Initializes and provides access to the embeddings model (always loaded).
 * The LLM is managed by the AI queue (load on demand, unload after idle).
 * OCR has been removed to free memory for larger LLM models.
 */

import { usePathname } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ALL_MINILM_L6_V2, useTextEmbeddings } from "react-native-executorch";
import { AIContextType, EmbeddingsModel } from "./ai.types";
import { aiQueue } from "./queue";

const AIContext = createContext<AIContextType>({
    embeddings: null,
    isInitializing: true,
    overallProgress: 0,
    error: null,
});

export function useAI(): AIContextType {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error("useAI must be used within an AIProvider");
    }
    return context;
}

// Hook to get just the embeddings model
export function useAIEmbeddings(): EmbeddingsModel | null {
    const { embeddings } = useAI();
    return embeddings;
}

interface AIProviderProps {
    children: ReactNode;
}

export function AIProvider({ children }: AIProviderProps) {
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pathname = usePathname();

    const prevStatesRef = useRef({
        embeddingsReady: false,
    });

    // Only load embeddings eagerly — needed for search at any time (~91MB)
    // LLM is managed by the queue (loaded on demand, unloaded after 30s idle)
    const embeddingsHook = useTextEmbeddings({
        model: ALL_MINILM_L6_V2,
    });

    const overallProgress = embeddingsHook?.downloadProgress || 0;

    // Log model status changes
    useEffect(() => {
        const prev = prevStatesRef.current;

        if (embeddingsHook && embeddingsHook.isReady !== prev.embeddingsReady) {
            if (embeddingsHook.isReady) {
                console.log("[AI] Embeddings (MiniLM) is READY");
            } else {
                console.log(
                    `[AI] Embeddings downloading: ${Math.round((embeddingsHook.downloadProgress || 0) * 100)}%`,
                );
            }
            prev.embeddingsReady = embeddingsHook.isReady;
        }
    }, [embeddingsHook?.isReady, embeddingsHook?.downloadProgress]);

    // Embeddings ready = app ready (LLM loads on demand via queue)
    useEffect(() => {
        if (embeddingsHook?.isReady && isInitializing) {
            setIsInitializing(false);
            console.log("[AI] Embeddings loaded — app ready. LLM will load on demand.");
        }

        if (embeddingsHook?.error) {
            const errorMessage = embeddingsHook.error.message || String(embeddingsHook.error);
            setError(errorMessage);
            console.error("[AI] Embeddings loading error:", errorMessage);
        }
    }, [embeddingsHook?.isReady, embeddingsHook?.error, isInitializing]);

    // Track navigation to pause/resume AI processing on editing pages
    useEffect(() => {
        const isEditingPage = pathname === "/" || pathname.startsWith("/edit/");
        if (aiQueue) {
            aiQueue.setOnEditingPage(isEditingPage);
        }
    }, [pathname]);

    // Store hook reference in ref to avoid stale closures
    const embeddingsHookRef = useRef(embeddingsHook);
    if (embeddingsHook) embeddingsHookRef.current = embeddingsHook;

    // Memoized forward function for Embeddings
    const embeddingsForward = useCallback(async (text: string): Promise<number[]> => {
        const hook = embeddingsHookRef.current;
        if (!hook.isReady) {
            throw new Error("Embeddings model not ready");
        }
        if (hook.isGenerating) {
            throw new Error("Embeddings model is currently processing");
        }
        try {
            const result = await hook.forward(text);
            return Array.from(result);
        } catch (error) {
            console.error("[AI] Embeddings inference failed:", error);
            return [];
        }
    }, []);

    const embeddings: EmbeddingsModel = useMemo(
        () => ({
            forward: embeddingsForward,
            isReady: embeddingsHook.isReady,
            isGenerating: embeddingsHook.isGenerating || false,
            error: embeddingsHook.error?.message || null,
            downloadProgress: embeddingsHook.downloadProgress || 0,
        }),
        [
            embeddingsForward,
            embeddingsHook.isReady,
            embeddingsHook.isGenerating,
            embeddingsHook.error,
            embeddingsHook.downloadProgress,
        ],
    );

    // Pass embeddings to queue when ready
    const embeddingsReady = embeddings?.isReady || false;
    useEffect(() => {
        if (embeddings) {
            aiQueue.setModels({ embeddings });
        }
    }, [embeddings, embeddingsReady]);

    const contextValue: AIContextType = useMemo(
        () => ({
            embeddings,
            isInitializing,
            overallProgress,
            error,
        }),
        [embeddings, isInitializing, overallProgress, error],
    );

    return <AIContext.Provider value={contextValue}>{children}</AIContext.Provider>;
}
