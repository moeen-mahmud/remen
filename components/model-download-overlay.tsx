import { Text } from "@/components/ui/text";
import { Minimize2 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ModelDownloadOverlayProps {
    progress: number; // 0 to 1
    llmProgress: number;
    embeddingsProgress: number;
    ocrProgress: number;
    isVisible: boolean;
    onMinimize?: () => void;
    onClose?: () => void;
    isMinimized?: boolean;
}

export function ModelDownloadOverlay({
    progress,
    llmProgress,
    embeddingsProgress,
    ocrProgress,
    isVisible,
    onMinimize,
    onClose,
    isMinimized = false,
}: ModelDownloadOverlayProps) {
    const { top, bottom } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [internalMinimized, setInternalMinimized] = useState(isMinimized);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const minimizeAnim = useRef(new Animated.Value(0)).current;

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
        );
        pulse.start();
        return () => pulse.stop();
    }, [pulseAnim]);

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();
    }, [progress, progressAnim]);

    // Fade out when done
    useEffect(() => {
        if (!isVisible) {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start();
        }
    }, [isVisible, fadeAnim]);

    // Handle minimize
    const handleMinimize = useCallback(() => {
        setInternalMinimized(true);
        onMinimize?.();
    }, [onMinimize]);

    // Update internal minimized state when prop changes
    useEffect(() => {
        setInternalMinimized(isMinimized);
    }, [isMinimized]);

    // Animate minimize state
    useEffect(() => {
        Animated.timing(minimizeAnim, {
            toValue: internalMinimized ? 1 : 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [internalMinimized, minimizeAnim]);

    if (!isVisible && progress >= 1) {
        return null;
    }

    const progressPercent = Math.round(progress * 100);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    // Don't render if not visible and progress is complete
    if (!isVisible && progress >= 1) {
        return null;
    }

    const minimizedStyle = {
        transform: [
            {
                translateY: minimizeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -SCREEN_HEIGHT + 120 + top],
                }),
            },
        ],
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? "#000" : "#fff",
                    paddingTop: top,
                    paddingBottom: bottom + 40,
                    opacity: fadeAnim,
                },
                internalMinimized && minimizedStyle,
            ]}
            pointerEvents={isVisible ? "auto" : "none"}
        >
            {/* Header with controls */}
            <View style={styles.header}>
                <View style={styles.headerLeft} />
                <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#000" }]}>Downloading AI Models</Text>
                <View style={styles.headerRight}>
                    <Pressable onPress={handleMinimize} style={styles.headerButton}>
                        <Minimize2 size={20} color={isDark ? "#fff" : "#000"} />
                    </Pressable>
                    <View />
                </View>
            </View>

            {/* Main message */}
            <View style={styles.messageContainer}>
                <Text bold size="4xl" style={styles.title}>
                    Setting up AI...
                </Text>
                <Text className="text-background-500 dark:text-background-600">
                    Downloading models for on-device intelligence
                </Text>
            </View>

            {/* Progress section */}
            <View style={styles.progressSection}>
                {/* Overall progress bar */}
                <View style={[styles.progressBarContainer, { backgroundColor: isDark ? "#1a1a1a" : "#f0f0f0" }]}>
                    <Animated.View
                        style={[
                            styles.progressBar,
                            {
                                backgroundColor: isDark ? "#39FF14" : "#00B700",
                                width: progressWidth,
                            },
                        ]}
                    />
                </View>

                {/* Progress percentage */}
                <Text className="mt-4 text-4xl font-bold" style={{ color: isDark ? "#39FF14" : "#00B700" }}>
                    {progressPercent}%
                </Text>

                {/* Individual model progress */}
                <View style={styles.modelsContainer}>
                    <ModelProgressItem
                        name="Language Model"
                        progress={llmProgress}
                        isDark={isDark}
                        description="The core of the AI functionality"
                    />
                    <ModelProgressItem
                        name="Embeddings"
                        progress={embeddingsProgress}
                        isDark={isDark}
                        description="Intelligent note discovery"
                    />
                    <ModelProgressItem
                        name="Text Recognition"
                        progress={ocrProgress}
                        isDark={isDark}
                        description="Extracting text from images"
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
    );
}

interface ModelProgressItemProps {
    name: string;
    progress: number;
    isDark: boolean;
    description: string;
}

function ModelProgressItem({ name, progress, isDark, description }: ModelProgressItemProps) {
    const isComplete = progress >= 1;
    const progressPercent = Math.round(progress * 100);

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
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 32,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 20,
    },
    headerLeft: {
        width: 40,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    logoContainer: {},
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
});
