import { Waveform } from "@/components/waveform"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { voiceCapture, type VoiceState } from "@/lib/capture/voice"
import { createNote } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { MicIcon, MicOffIcon, XIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useEffect, useRef, useState } from "react"
import { Alert, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function VoiceCaptureScreen() {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    // Get AI models for processing queue
    const { llm, embeddings } = useAI()

    const [, setVoiceState] = useState<VoiceState>({
        isListening: false,
        results: [],
        partialResults: [],
        error: null,
    })
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [isSaving, setIsSaving] = useState(false)

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Pulse animation for the mic button
    const pulseScale = useSharedValue(1)
    const pulseOpacity = useSharedValue(0.3)

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
        opacity: pulseOpacity.value,
    }))

    let currentTranscript = voiceCapture.getCurrentTranscript()

    // Start pulse animation when recording
    useEffect(() => {
        if (isRecording) {
            pulseScale.value = withRepeat(
                withTiming(1.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true,
            )
            pulseOpacity.value = withRepeat(
                withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                -1,
                true,
            )
        } else {
            pulseScale.value = withTiming(1, { duration: 200 })
            pulseOpacity.value = withTiming(0.3, { duration: 200 })
        }
    }, [isRecording, pulseScale, pulseOpacity])

    // Set up voice callback
    useEffect(() => {
        voiceCapture.setCallback(setVoiceState)
        return () => {
            voiceCapture.destroy()
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [])

    // Format recording time
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    // Start recording
    const startRecording = async () => {
        const available = await voiceCapture.isAvailable()

        if (!available) {
            Alert.alert("Not Available", "Voice recognition is not available on this device")
            return
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setIsRecording(true)
        setRecordingTime(0)

        // Start timer
        timerRef.current = setInterval(() => {
            setRecordingTime((t) => t + 1)
        }, 1000)

        await voiceCapture.start()
    }

    // Stop recording and save
    const stopRecording = async () => {
        if (!isRecording) return

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setIsRecording(false)

        // Stop timer
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }

        await voiceCapture.stop()

        // Get transcript
        const transcript = voiceCapture.getCurrentTranscript()

        if (transcript.trim().length > 0) {
            await saveAndNavigate(transcript)
        } else {
            // No transcript - show brief message and go back
            Alert.alert("No Speech Detected", "We couldn't detect any speech. Please try again.", [
                { text: "OK", onPress: () => router.back() },
            ])
        }
    }

    // Save note and navigate to detail
    const saveAndNavigate = async (transcript: string) => {
        setIsSaving(true)

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

            const note = await createNote({
                content: transcript,
                type: "voice",
            })

            // Queue for AI processing (with AI models)
            aiQueue.setModels({ llm, embeddings })
            aiQueue.add({ noteId: note.id, content: transcript })

            // Navigate to note detail
            currentTranscript = ""
            voiceCapture.destroy()
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            router.replace(`/notes/${note.id}` as any)
        } catch (error) {
            console.error("Failed to save voice note:", error)
            Alert.alert("Error", "Failed to save voice note. Please try again.")
            setIsSaving(false)
        }
    }

    // Close without saving
    const handleClose = () => {
        console.log("close")
        currentTranscript = ""
        voiceCapture.destroy()
        if (timerRef.current) {
            clearInterval(timerRef.current)
        }
        router.back()
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff", paddingTop: top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleClose} style={styles.closeButton}>
                    <XIcon size={24} color={isDark ? "#fff" : "#000"} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#000" }]}>Voice Note</Text>
                <View style={styles.closeButton} />
            </View>

            {/* Waveform */}
            <View style={styles.waveformContainer}>
                <Waveform isActive={isRecording} color="#EF4444" size={100} />
            </View>

            {/* Status */}
            <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: isDark ? "#fff" : "#000" }]}>
                    {isSaving ? "Saving..." : isRecording ? "Press again to save" : ""}
                </Text>
                {isRecording && (
                    <Text style={[styles.timerText, { color: "#EF4444" }]}>{formatTime(recordingTime)}</Text>
                )}
            </View>

            {/* Live transcript */}
            {isRecording && currentTranscript?.length > 0 ? (
                <View style={styles.transcriptContainer}>
                    <Text style={[styles.transcriptText, { color: isDark ? "#ddd" : "#333" }]} numberOfLines={5}>
                        &ldquo;{currentTranscript}&rdquo;
                    </Text>
                </View>
            ) : null}

            {/* Mic button */}
            <View style={[styles.micContainer, { paddingBottom: bottom + 40 }]}>
                {/* Pulse ring */}
                <Animated.View style={[styles.pulseRing, { backgroundColor: "#EF4444" }, pulseStyle]}>
                    {/* Main button */}
                    {isRecording ? (
                        <Pressable
                            onPress={stopRecording}
                            disabled={isSaving}
                            style={[
                                styles.micButton,
                                { backgroundColor: isRecording ? "#EF4444" : isDark ? "#333" : "#f0f0f0" },
                            ]}
                        >
                            <MicOffIcon size={40} color={isRecording ? "#fff" : isDark ? "#fff" : "#000"} />
                        </Pressable>
                    ) : (
                        <Pressable
                            onPress={startRecording}
                            disabled={isSaving}
                            style={[
                                styles.micButton,
                                { backgroundColor: isRecording ? "#EF4444" : isDark ? "#333" : "#f0f0f0" },
                            ]}
                        >
                            <MicIcon size={40} color={isRecording ? "#fff" : isDark ? "#fff" : "#000"} />
                        </Pressable>
                    )}
                </Animated.View>

                <Text style={[styles.hintText, { color: isDark ? "#888" : "#666" }]}>
                    {isRecording ? "Listening..." : "Start speaking"}
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    closeButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        letterSpacing: -0.3,
    },
    waveformContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 60,
    },
    statusContainer: {
        alignItems: "center",
        paddingVertical: 24,
    },
    statusText: {
        fontSize: 18,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    timerText: {
        fontSize: 56,
        fontWeight: "200",
        marginTop: 12,
        fontVariant: ["tabular-nums"],
        letterSpacing: -1,
    },
    transcriptContainer: {
        paddingHorizontal: 32,
        paddingVertical: 20,
        maxHeight: 150,
    },
    transcriptText: {
        fontSize: 16,
        fontStyle: "italic",
        textAlign: "center",
        lineHeight: 26,
        opacity: 0.9,
    },
    micContainer: {
        position: "relative",
        alignItems: "center",
        paddingVertical: 48,
    },
    pulseRing: {
        // position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        width: 110,
        height: 110,
        borderRadius: 55,
    },
    micButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    hintText: {
        marginTop: 20,
        fontSize: 14,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
})
