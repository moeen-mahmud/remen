import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider"
import { AIProvider, useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { getDatabase, getUnprocessedNotes } from "@/lib/database"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useRef, useState } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import "react-native-get-random-values"
import { KeyboardProvider } from "react-native-keyboard-controller"
import "../global.css"

SplashScreen.preventAutoHideAsync()

/**
 * Inner component that handles initialization after AI models are available
 */
function AppInitializer({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false)
    const { llm, embeddings, isInitializing, overallProgress, error } = useAI()

    // Track previous state to avoid duplicate logs
    const prevStateRef = useRef({ llmReady: false, embeddingsReady: false, lastProgress: 0 })

    useEffect(() => {
        async function initialize() {
            try {
                console.log("🚀 [App] Initializing database...")
                await getDatabase()
                console.log("✅ [App] Database initialized")

                // Process any unprocessed notes from previous sessions
                const unprocessedNotes = await getUnprocessedNotes()
                if (unprocessedNotes.length > 0) {
                    console.log(`📋 [App] Found ${unprocessedNotes.length} unprocessed notes, adding to queue...`)
                    for (const note of unprocessedNotes) {
                        aiQueue.add({ noteId: note.id, content: note.content })
                    }
                }
            } catch (error) {
                console.error("❌ [App] Failed to initialize:", error)
            } finally {
                setIsReady(true)
                await SplashScreen.hideAsync()
            }
        }

        initialize()
    }, [])

    // Update AI models in queue when their ready state changes
    const llmReady = llm?.isReady || false
    const embeddingsReady = embeddings?.isReady || false

    useEffect(() => {
        const prev = prevStateRef.current

        // Only log when state actually changes
        if (llmReady !== prev.llmReady || embeddingsReady !== prev.embeddingsReady) {
            console.log(
                `🔄 [App] AI models - LLM: ${llmReady ? "✓" : "..."}, Embeddings: ${embeddingsReady ? "✓" : "..."}`,
            )
            prev.llmReady = llmReady
            prev.embeddingsReady = embeddingsReady
        }

        if (llm || embeddings) {
            aiQueue.setModels({ llm, embeddings })
        }
    }, [llm, embeddings, llmReady, embeddingsReady])

    // Log AI progress at 10% intervals
    useEffect(() => {
        if (isInitializing) {
            const roundedProgress = Math.floor(overallProgress * 10) * 10
            if (roundedProgress > prevStateRef.current.lastProgress) {
                console.log(`⏳ [App] AI models loading: ${roundedProgress}%`)
                prevStateRef.current.lastProgress = roundedProgress
            }
        }
    }, [isInitializing, overallProgress])

    // Log errors
    useEffect(() => {
        if (error) {
            console.error(`❌ [App] AI error: ${error}`)
        }
    }, [error])

    if (!isReady) {
        return null
    }

    return <>{children}</>
}

export default function RootLayout() {
    return (
        <GluestackUIProvider>
            <AIProvider>
                <KeyboardProvider>
                    <StatusBar style="auto" />

                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <AppInitializer>
                            <Stack screenOptions={{ headerShown: false }} />
                        </AppInitializer>
                    </GestureHandlerRootView>
                </KeyboardProvider>
            </AIProvider>
        </GluestackUIProvider>
    )
}
