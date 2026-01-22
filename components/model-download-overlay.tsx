import { RemenLogo } from "@/components/brand/logo"
import { Text } from "@/components/ui/text"
import { useColorScheme } from "nativewind"
import { useEffect, useRef } from "react"
import { Animated, Easing, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface ModelDownloadOverlayProps {
    progress: number // 0 to 1
    llmProgress: number
    embeddingsProgress: number
    ocrProgress: number
    isVisible: boolean
}

export function ModelDownloadOverlay({
    progress,
    llmProgress,
    embeddingsProgress,
    ocrProgress,
    isVisible,
}: ModelDownloadOverlayProps) {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const progressAnim = useRef(new Animated.Value(0)).current

    // Pulse animation for the logo
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        )
        pulse.start()
        return () => pulse.stop()
    }, [pulseAnim])

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start()
    }, [progress, progressAnim])

    // Fade out when done
    useEffect(() => {
        if (!isVisible) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start()
        }
    }, [isVisible, fadeAnim])

    if (!isVisible && progress >= 1) {
        return null
    }

    const progressPercent = Math.round(progress * 100)

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    })

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? "#000" : "#fff",
                    paddingTop: top + 40,
                    paddingBottom: bottom + 40,
                    opacity: fadeAnim,
                },
            ]}
            pointerEvents={isVisible ? "auto" : "none"}
        >
            {/* Logo with pulse animation */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
                <RemenLogo size="lg" showIcon={true} animated={false} />
            </Animated.View>

            {/* Main message */}
            <View style={styles.messageContainer}>
                <Text bold size="4xl" style={styles.title}>
                    Setting up AI...
                </Text>
                <Text style={styles.subtitle}>Downloading models for on-device intelligence</Text>
            </View>

            {/* Progress section */}
            <View style={styles.progressSection}>
                {/* Overall progress bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: isDark ? "#1a1a1a" : "#f0f0f0" }]}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                backgroundColor: "#39FF14",
                                width: progressWidth,
                            },
                        ]}
                    />
                </View>

                {/* Progress percentage */}
                <Text style={[styles.progressText, { color: isDark ? "#39FF14" : "#00B700" }]}>{progressPercent}%</Text>

                {/* Individual model progress */}
                <View style={styles.modelsContainer}>
                    <ModelProgressItem
                        name="Language Model"
                        progress={llmProgress}
                        isDark={isDark}
                        description="For understanding your notes"
                    />
                    <ModelProgressItem
                        name="Embeddings"
                        progress={embeddingsProgress}
                        isDark={isDark}
                        description="For semantic search"
                    />
                    <ModelProgressItem
                        name="Text Recognition"
                        progress={ocrProgress}
                        isDark={isDark}
                        description="For scanning documents"
                    />
                </View>
            </View>

            {/* Bottom message */}
            <View style={styles.bottomMessage}>
                <Text style={[styles.footnote, { color: isDark ? "#666" : "#999" }]}>
                    This only happens once. Your notes are processed entirely on-device for maximum privacy.
                </Text>
            </View>
        </Animated.View>
    )
}

interface ModelProgressItemProps {
    name: string
    progress: number
    isDark: boolean
    description: string
}

function ModelProgressItem({ name, progress, isDark, description }: ModelProgressItemProps) {
    const isComplete = progress >= 1
    const progressPercent = Math.round(progress * 100)

    return (
        <View style={styles.modelItem}>
            <View style={styles.modelHeader}>
                <Text style={[styles.modelName, { color: isDark ? "#fff" : "#000" }]}>{name}</Text>
                <Text
                    style={[
                        styles.modelProgress,
                        {
                            color: isComplete ? (isDark ? "#39FF14" : "#00B700") : isDark ? "#888" : "#666",
                        },
                    ]}
                >
                    {isComplete ? "✓" : `${progressPercent}%`}
                </Text>
            </View>
            <Text style={[styles.modelDescription, { color: isDark ? "#666" : "#999" }]}>{description}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    logoContainer: {
        marginTop: 60,
    },
    messageContainer: {
        alignItems: "center",
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
    },
    progressSection: {
        width: "100%",
        alignItems: "center",
    },
    progressBarContainer: {
        width: "100%",
        height: 8,
        borderRadius: 4,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        borderRadius: 4,
    },
    progressText: {
        fontSize: 24,
        fontWeight: "700",
        marginTop: 16,
    },
    modelsContainer: {
        width: "100%",
        marginTop: 32,
        gap: 16,
    },
    modelItem: {
        width: "100%",
    },
    modelHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    modelName: {
        fontSize: 15,
        fontWeight: "600",
    },
    modelProgress: {
        fontSize: 14,
        fontWeight: "600",
    },
    modelDescription: {
        fontSize: 13,
        marginTop: 2,
    },
    bottomMessage: {
        alignItems: "center",
    },
    footnote: {
        fontSize: 13,
        textAlign: "center",
        lineHeight: 18,
    },
})
