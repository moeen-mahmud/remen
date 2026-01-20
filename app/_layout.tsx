import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider"
import { aiQueue } from "@/lib/ai/queue"
import { getDatabase, getUnprocessedNotes } from "@/lib/database"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect, useState } from "react"
import "react-native-get-random-values"
import { KeyboardProvider } from "react-native-keyboard-controller"
import "../global.css"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        async function initialize() {
            try {
                await getDatabase()

                // Process any unprocessed notes from previous sessions
                const unprocessedNotes = await getUnprocessedNotes()
                for (const note of unprocessedNotes) {
                    aiQueue.add({ noteId: note.id, content: note.content })
                }
            } catch (error) {
                console.error("Failed to initialize app:", error)
            } finally {
                setIsReady(true)
                await SplashScreen.hideAsync()
            }
        }

        initialize()
    }, [])

    if (!isReady) {
        return null
    }

    return (
        <GluestackUIProvider>
            <KeyboardProvider>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }} />
            </KeyboardProvider>
        </GluestackUIProvider>
    )
}
