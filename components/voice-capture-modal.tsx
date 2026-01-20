import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { voiceCapture, type VoiceState } from "@/lib/capture/voice"
import * as Haptics from "expo-haptics"
import { MicIcon, MicOffIcon, XIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native"
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated"

export interface VoiceCaptureModalProps {
    isVisible: boolean
    onClose: () => void
    onCapture: (text: string) => void
}

export function VoiceCaptureModal({ isVisible, onClose, onCapture }: VoiceCaptureModalProps) {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const [voiceState, setVoiceState] = useState<VoiceState>({
        isListening: false,
        results: [],
        partialResults: [],
        error: null,
    })
    const [isInitializing, setIsInitializing] = useState(false)

    // Pulse animation for the mic button
    const pulseScale = useSharedValue(1)

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }))

    // Start pulse animation when listening
    useEffect(() => {
        if (voiceState.isListening) {
            pulseScale.value = withRepeat(withTiming(1.15, { duration: 800 }), -1, true)
        } else {
            cancelAnimation(pulseScale)
            pulseScale.value = withTiming(1, { duration: 200 })
        }
    }, [voiceState.isListening, pulseScale])

    // Set up voice callback
    useEffect(() => {
        voiceCapture.setCallback(setVoiceState)
        return () => {
            voiceCapture.destroy()
        }
    }, [])

    // Auto-start listening when modal opens
    useEffect(() => {
        if (isVisible) {
            startListening()
        } else {
            voiceCapture.cancel()
        }
    }, [isVisible])

    const startListening = async () => {
        setIsInitializing(true)
        const available = await voiceCapture.isAvailable()
        setIsInitializing(false)

        if (!available) {
            setVoiceState((prev) => ({
                ...prev,
                error: "Voice recognition is not available on this device",
            }))
            return
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        await voiceCapture.start()
    }

    const stopListening = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        await voiceCapture.stop()
    }

    const handleToggleListening = async () => {
        if (voiceState.isListening) {
            await stopListening()
        } else {
            await startListening()
        }
    }

    const handleDone = useCallback(() => {
        const transcript = voiceCapture.getCurrentTranscript()
        if (transcript.trim().length > 0) {
            onCapture(transcript)
        }
        voiceCapture.cancel()
        onClose()
    }, [onCapture, onClose])

    const handleCancel = useCallback(() => {
        voiceCapture.cancel()
        onClose()
    }, [onClose])

    const currentTranscript = voiceCapture.getCurrentTranscript()

    return (
        <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCancel}>
            <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={handleCancel} style={styles.closeButton}>
                        <XIcon size={24} color={isDark ? "#fff" : "#000"} />
                    </Pressable>
                    <Heading size="md" style={{ color: isDark ? "#fff" : "#000" }}>
                        Voice Capture
                    </Heading>
                    <View style={styles.closeButton} />
                </View>

                {/* Transcript area */}
                <View style={styles.transcriptContainer}>
                    {isInitializing ? (
                        <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
                    ) : voiceState.error ? (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{voiceState.error}</Text>
                            <Button variant="outline" size="sm" onPress={startListening}>
                                <ButtonText>Try Again</ButtonText>
                            </Button>
                        </View>
                    ) : currentTranscript.length > 0 ? (
                        <Text style={[styles.transcript, { color: isDark ? "#fff" : "#000" }]}>
                            {currentTranscript}
                        </Text>
                    ) : (
                        <Text style={[styles.placeholder, { color: isDark ? "#888" : "#666" }]}>
                            {voiceState.isListening ? "Listening... Speak now" : "Tap the mic to start"}
                        </Text>
                    )}
                </View>

                {/* Mic button */}
                <View style={styles.micContainer}>
                    <Animated.View style={pulseStyle}>
                        <Pressable
                            onPress={handleToggleListening}
                            style={[
                                styles.micButton,
                                {
                                    backgroundColor: voiceState.isListening ? "#EF4444" : "#3B82F6",
                                },
                            ]}
                        >
                            {voiceState.isListening ? (
                                <MicOffIcon size={32} color="#fff" />
                            ) : (
                                <MicIcon size={32} color="#fff" />
                            )}
                        </Pressable>
                    </Animated.View>
                    <Text style={[styles.micHint, { color: isDark ? "#888" : "#666" }]}>
                        {voiceState.isListening ? "Tap to stop" : "Tap to speak"}
                    </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                    <Button variant="outline" size="lg" onPress={handleCancel} style={styles.actionButton}>
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                        variant="solid"
                        size="lg"
                        onPress={handleDone}
                        isDisabled={currentTranscript.trim().length === 0}
                        style={styles.actionButton}
                        className="bg-primary-500"
                    >
                        <ButtonText className="text-white">Done</ButtonText>
                    </Button>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    transcriptContainer: {
        flex: 1,
        padding: 24,
        justifyContent: "center",
    },
    transcript: {
        fontSize: 24,
        lineHeight: 36,
        textAlign: "center",
    },
    placeholder: {
        fontSize: 18,
        textAlign: "center",
    },
    errorContainer: {
        alignItems: "center",
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
    },
    micContainer: {
        alignItems: "center",
        paddingVertical: 32,
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    micHint: {
        marginTop: 12,
        fontSize: 14,
    },
    actions: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 24,
        gap: 12,
    },
    actionButton: {
        flex: 1,
    },
})
