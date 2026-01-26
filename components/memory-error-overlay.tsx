import { RemenLogo } from "@/components/brand/logo";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface MemoryErrorOverlayProps {
    isVisible: boolean;
}

export function MemoryErrorOverlay({ isVisible }: MemoryErrorOverlayProps) {
    const { top, bottom } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current;

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

    if (!isVisible) {
        return null;
    }

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
            pointerEvents="auto"
        >
            {/* Logo */}
            <View style={styles.logoContainer}>
                <RemenLogo size="lg" showIcon={true} animated={false} />
            </View>

            {/* Main message */}
            <View style={styles.messageContainer}>
                <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>Insufficient Memory</Text>
                <Text style={[styles.subtitle, { color: isDark ? "#888" : "#666" }]}>
                    AI models require more RAM than available
                </Text>
            </View>

            {/* Error details */}
            <View style={styles.errorSection}>
                <Text style={[styles.errorText, { color: isDark ? "#ff6b6b" : "#d32f2f" }]}>
                    The AI models {"couldn't"} be loaded due to insufficient memory. This can happen on devices with
                    limited RAM or when other apps are using too much memory.
                </Text>

                <Text style={[styles.solutionText, { color: isDark ? "#39FF14" : "#00B700" }]}>Solutions:</Text>
                <Text style={[styles.solutionItem, { color: isDark ? "#ccc" : "#666" }]}>
                    • Close other apps to free up memory
                </Text>
                <Text style={[styles.solutionItem, { color: isDark ? "#ccc" : "#666" }]}>• Restart your device</Text>
                <Text style={[styles.solutionItem, { color: isDark ? "#ccc" : "#666" }]}>
                    • Try again after freeing up memory
                </Text>
            </View>

            {/* Bottom message */}
            <View style={styles.bottomMessage}>
                <Text style={[styles.footnote, { color: isDark ? "#666" : "#999" }]}>
                    Note-taking will work without AI features. You can search and organize notes manually.
                </Text>
            </View>
        </Animated.View>
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
    logoContainer: {
        marginTop: 60,
    },
    messageContainer: {
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: "center",
    },
    errorSection: {
        width: "100%",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 20,
    },
    solutionText: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 12,
        alignSelf: "flex-start",
    },
    solutionItem: {
        fontSize: 14,
        marginBottom: 6,
        alignSelf: "flex-start",
        lineHeight: 20,
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
