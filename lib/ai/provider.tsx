/**
 * AI Provider Context
 *
 * Initializes and provides access to all ExecutorTorch AI models:
 * - LLM (SmallLM 2.1 360M) for title generation, classification, and tag extraction
 * - Text Embeddings (MiniLM) for semantic search
 * - OCR for document scanning
 */

import { usePathname } from "expo-router"
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react"
import {
    ALL_MINILM_L6_V2,
    OCR_ENGLISH,
    SMOLLM2_1_135M_QUANTIZED,
    useLLM,
    useOCR,
    useTextEmbeddings,
} from "react-native-executorch"
import { aiQueue } from "./queue"

// Types for the AI context
export interface Message {
    role: "system" | "user" | "assistant"
    content: string
}

export interface OCRBbox {
    x: number
    y: number
}

export interface OCRDetection {
    bbox: OCRBbox[]
    text: string
    score: number
}

export interface LLMModel {
    generate: (messages: Message[]) => Promise<string>
    isReady: boolean
    isGenerating: boolean
    error: string | null
    downloadProgress: number
}

export interface EmbeddingsModel {
    forward: (text: string) => Promise<number[]>
    isReady: boolean
    isGenerating: boolean
    error: string | null
    downloadProgress: number
}

export interface OCRModel {
    forward: (imagePath: string) => Promise<OCRDetection[]>
    isReady: boolean
    isGenerating: boolean
    error: string | null
    downloadProgress: number
}

export interface AIContextType {
    llm: LLMModel | null
    embeddings: EmbeddingsModel | null
    ocr: OCRModel | null
    isInitializing: boolean
    overallProgress: number
    error: string | null
    hasMemoryError: boolean
}

const AIContext = createContext<AIContextType>({
    llm: null,
    embeddings: null,
    ocr: null,
    isInitializing: true,
    overallProgress: 0,
    error: null,
    hasMemoryError: false,
})

export function useAI(): AIContextType {
    const context = useContext(AIContext)
    if (!context) {
        throw new Error("useAI must be used within an AIProvider")
    }
    return context
}

// Hook to get just the LLM
export function useAILLM(): LLMModel | null {
    const { llm } = useAI()
    return llm
}

// Hook to get just the embeddings model
export function useAIEmbeddings(): EmbeddingsModel | null {
    const { embeddings } = useAI()
    return embeddings
}

// Hook to get just the OCR model
export function useAIOCR(): OCRModel | null {
    const { ocr } = useAI()
    return ocr
}

interface AIProviderProps {
    children: ReactNode
}

export function AIProvider({ children }: AIProviderProps) {
    const [isInitializing, setIsInitializing] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasMemoryError, setHasMemoryError] = useState(false)
    const pathname = usePathname()

    // Track previous states for logging changes
    const prevStatesRef = useRef({ llmReady: false, embeddingsReady: false, ocrReady: false })

    // Initialize LLM (Llama 3.2 1B)
    const llmHook = useLLM({
        model: SMOLLM2_1_135M_QUANTIZED,
    })

    const embeddingsHook = useTextEmbeddings({
        model: ALL_MINILM_L6_V2,
    })

    const ocrHook = useOCR({
        model: OCR_ENGLISH,
    })

    // Track overall initialization progress
    const overallProgress =
        ((llmHook?.downloadProgress || 0) +
            (embeddingsHook?.downloadProgress || 0) +
            (ocrHook?.downloadProgress || 0)) /
        3

    // Log model status changes
    useEffect(() => {
        const prev = prevStatesRef.current

        // Log LLM status changes
        if (llmHook && llmHook.isReady !== prev.llmReady) {
            if (llmHook.isReady) {
                console.log("✅ [AI] LLM (Llama 3.2 1B) is READY")
            } else {
                console.log(`⏳ [AI] LLM downloading: ${Math.round((llmHook.downloadProgress || 0) * 100)}%`)
            }
            prev.llmReady = llmHook.isReady
        }

        // Log Embeddings status changes
        if (embeddingsHook && embeddingsHook.isReady !== prev.embeddingsReady) {
            if (embeddingsHook.isReady) {
                console.log("✅ [AI] Embeddings (MiniLM) is READY")
            } else {
                console.log(
                    `⏳ [AI] Embeddings downloading: ${Math.round((embeddingsHook.downloadProgress || 0) * 100)}%`,
                )
            }
            prev.embeddingsReady = embeddingsHook.isReady
        }

        // Log OCR status changes
        if (ocrHook && ocrHook.isReady !== prev.ocrReady) {
            if (ocrHook.isReady) {
                console.log("✅ [AI] OCR (English) is READY")
            } else {
                console.log(`⏳ [AI] OCR downloading: ${Math.round((ocrHook.downloadProgress || 0) * 100)}%`)
            }
            prev.ocrReady = ocrHook.isReady
        }
    }, [
        llmHook?.isReady,
        llmHook?.downloadProgress,
        embeddingsHook?.isReady,
        embeddingsHook?.downloadProgress,
        ocrHook?.isReady,
        ocrHook?.downloadProgress,
    ])

    // Check if all models are ready
    useEffect(() => {
        const allReady = llmHook?.isReady && embeddingsHook?.isReady && ocrHook?.isReady

        if (allReady && isInitializing) {
            setIsInitializing(false)
            console.log("🎉 [AI] All models loaded successfully!")
        }

        // Check for errors
        const errors = [llmHook?.error, embeddingsHook?.error, ocrHook?.error].filter(Boolean)
        if (errors.length > 0) {
            const errorMessages = errors.map((error) => (error as unknown as Error).message)
            setError(errorMessages.join("; "))
            console.error("❌ [AI] Model loading errors:", errors)

            // Check for memory errors
            const hasBadAlloc = errorMessages.some((message) => message.includes("bad_alloc"))
            if (hasBadAlloc && !hasMemoryError) {
                setHasMemoryError(true)
                console.error("🚨 [AI] Memory allocation error detected - models require too much RAM")
            }
        }
    }, [
        llmHook?.isReady,
        embeddingsHook?.isReady,
        ocrHook?.isReady,
        llmHook?.error,
        embeddingsHook?.error,
        ocrHook?.error,
        isInitializing,
        hasMemoryError,
    ])

    // Track navigation to pause/resume AI processing on editing pages
    useEffect(() => {
        // Check if current route is an editing page
        const isEditingPage = pathname === "/" || pathname.startsWith("/edit/")

        // Update queue with editing page status
        if (aiQueue) {
            aiQueue.setOnEditingPage(isEditingPage)
        }
    }, [pathname])

    // Store hook references in refs to avoid stale closures (only if hooks are available)
    const llmHookRef = useRef(llmHook)
    const embeddingsHookRef = useRef(embeddingsHook)
    const ocrHookRef = useRef(ocrHook)

    // Keep refs updated (only if hooks exist)
    if (llmHook) llmHookRef.current = llmHook
    if (embeddingsHook) embeddingsHookRef.current = embeddingsHook
    if (ocrHook) ocrHookRef.current = ocrHook

    // Memoized generate function for LLM
    const llmGenerate = useCallback(async (messages: Message[]): Promise<string> => {
        const hook = llmHookRef.current
        if (!hook.isReady) {
            throw new Error("LLM model not ready")
        }
        if (hook.isGenerating) {
            throw new Error("LLM is currently generating")
        }
        console.log("🤖 [AI] LLM generating response...")
        await hook.generate(messages)
        console.log("🤖 [AI] LLM response complete")
        return hook.response || ""
    }, [])

    // Memoized forward function for Embeddings
    const embeddingsForward = useCallback(async (text: string): Promise<number[]> => {
        const hook = embeddingsHookRef.current
        if (!hook.isReady) {
            throw new Error("Embeddings model not ready")
        }
        if (hook.isGenerating) {
            throw new Error("Embeddings model is currently processing")
        }
        const result = await hook.forward(text)
        // Convert Float32Array to number[] if needed
        return Array.from(result)
    }, [])

    // Memoized forward function for OCR
    const ocrForward = useCallback(async (imagePath: string): Promise<OCRDetection[]> => {
        const hook = ocrHookRef.current
        if (!hook.isReady) {
            throw new Error("OCR model not ready")
        }
        if (hook.isGenerating) {
            throw new Error("OCR model is currently processing")
        }
        console.log("📷 [AI] OCR processing image...")
        const result = await hook.forward(imagePath)
        console.log(`📷 [AI] OCR found ${result.length} text regions`)
        // Map the result to our OCRDetection type
        return result.map((r) => ({
            bbox: r.bbox,
            text: r.text,
            score: r.score,
        }))
    }, [])

    // Memoize model wrapper objects to prevent unnecessary re-renders
    const llm: LLMModel = useMemo(
        () => ({
            generate: llmGenerate,
            isReady: llmHook.isReady,
            isGenerating: llmHook.isGenerating || false,
            error: llmHook.error || null,
            downloadProgress: llmHook.downloadProgress || 0,
        }),
        [llmGenerate, llmHook.isReady, llmHook.isGenerating, llmHook.error, llmHook.downloadProgress],
    )

    const embeddings: EmbeddingsModel = useMemo(
        () => ({
            forward: embeddingsForward,
            isReady: embeddingsHook.isReady,
            isGenerating: embeddingsHook.isGenerating || false,
            error: embeddingsHook.error || null,
            downloadProgress: embeddingsHook.downloadProgress || 0,
        }),
        [
            embeddingsForward,
            embeddingsHook.isReady,
            embeddingsHook.isGenerating,
            embeddingsHook.error,
            embeddingsHook.downloadProgress,
        ],
    )

    const ocr: OCRModel = useMemo(
        () => ({
            forward: ocrForward,
            isReady: ocrHook.isReady,
            isGenerating: ocrHook.isGenerating || false,
            error: ocrHook.error || null,
            downloadProgress: ocrHook.downloadProgress || 0,
        }),
        [ocrForward, ocrHook.isReady, ocrHook.isGenerating, ocrHook.error, ocrHook.downloadProgress],
    )

    // Memoize context value
    const contextValue: AIContextType = useMemo(
        () => ({
            llm,
            embeddings,
            ocr,
            isInitializing,
            overallProgress,
            error,
            hasMemoryError,
        }),
        [llm, embeddings, ocr, isInitializing, overallProgress, error, hasMemoryError],
    )

    return <AIContext.Provider value={contextValue}>{children}</AIContext.Provider>
}
