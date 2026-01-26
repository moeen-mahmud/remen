import { RemenLogo } from "@/components/brand/logo";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { LinearGradient } from "expo-linear-gradient";
import { Bot, Camera, ChevronRight, Mic, Search, Shield } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Easing,
    runOnJS,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingProps {
    onComplete: () => void;
    onSkip?: () => void;
}

interface OnboardingSlide {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: [string, string];
}

const slides: OnboardingSlide[] = [
    {
        id: "ai",
        icon: <Bot size={48} color="#fff" />,
        title: "AI-Powered Intelligence",
        description: "Your notes are automatically categorized, tagged, and titled using advanced on-device AI.",
        gradient: ["#667eea", "#764ba2"],
    },
    {
        id: "privacy",
        icon: <Shield size={48} color="#fff" />,
        title: "Privacy First",
        description: "All processing stays on your device. Your data never leaves your phone.",
        gradient: ["#fa709a", "#fee140"],
    },
    {
        id: "voice",
        icon: <Mic size={48} color="#fff" />,
        title: "Voice Notes",
        description: "Capture ideas instantly. AI transcribes and organizes your spoken thoughts.",
        gradient: ["#f093fb", "#f5576c"],
    },
    {
        id: "scan",
        icon: <Camera size={48} color="#fff" />,
        title: "Document Scanning",
        description: "Scan documents and handwritten notes with OCR-powered search.",
        gradient: ["#4facfe", "#00f2fe"],
    },
    {
        id: "search",
        icon: <Search size={48} color="#fff" />,
        title: "Smart Search",
        description: "Find anything instantly using semantic search and natural language.",
        gradient: ["#43e97b", "#38f9d7"],
    },
];

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
    const { colorScheme } = useColorScheme();
    const { top, bottom } = useSafeAreaInsets();
    const isDark = colorScheme === "dark";

    const [currentIndex, setCurrentIndex] = useState(0);

    /** Shared animation state */
    const translateX = useSharedValue(0);
    const indexSV = useSharedValue(0);
    const opacitySV = useSharedValue(1);

    /** Deterministic navigation */
    const goToIndex = useCallback((index: number) => {
        indexSV.value = index;
        translateX.value = withTiming(-index * SCREEN_WIDTH, {
            duration: 320,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
        });
        setCurrentIndex(index);
    }, []);

    /** Gesture */
    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            translateX.value = -indexSV.value * SCREEN_WIDTH + e.translationX;
        })
        .onEnd(() => {
            const rawIndex = -translateX.value / SCREEN_WIDTH;
            const nextIndex = Math.round(rawIndex);
            const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex));

            indexSV.value = clamped;
            translateX.value = withTiming(-clamped * SCREEN_WIDTH, {
                duration: 320,
                easing: Easing.bezier(0.22, 1, 0.36, 1),
            });

            runOnJS(setCurrentIndex)(clamped);
        });

    /** Animated styles */
    const slidesStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacitySV.value,
    }));

    /** Actions */
    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            goToIndex(currentIndex + 1);
        } else {
            opacitySV.value = withTiming(0, { duration: 240 }, () => runOnJS(onComplete)());
        }
    };

    const handleSkip = () => {
        opacitySV.value = withTiming(0, { duration: 240 }, () => runOnJS(onSkip || onComplete)());
    };

    return (
        <Animated.View
            className="bg-background-0"
            style={[
                styles.container,
                containerStyle,
                {
                    paddingTop: top + 16,
                    paddingBottom: bottom + 16,
                },
            ]}
        >
            {/* Header */}
            <View style={styles.header}>
                <RemenLogo size="sm" showIcon animated={false} />
                <Pressable onPress={handleSkip}>
                    <Text className="text-neutral-500 dark:text-neutral-400">Skip</Text>
                </Pressable>
            </View>

            {/* Slides */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.slidesContainer, { width: SCREEN_WIDTH * slides.length }, slidesStyle]}>
                    {slides.map((slide) => (
                        <View key={slide.id} style={styles.slide}>
                            <LinearGradient colors={slide.gradient} style={styles.iconContainer}>
                                {slide.icon}
                            </LinearGradient>

                            <Text bold size="2xl" style={{ color: isDark ? "#fff" : "#000", textAlign: "center" }}>
                                {slide.title}
                            </Text>

                            <Text style={{ color: isDark ? "#ccc" : "#666", textAlign: "center", marginTop: 12 }}>
                                {slide.description}
                            </Text>
                        </View>
                    ))}
                </Animated.View>
            </GestureDetector>

            {/* Dots */}
            <View className="flex-row gap-2 justify-center mb-10">
                {slides.map((_, i) => (
                    <Dot key={i} index={i} translateX={translateX} />
                ))}
            </View>

            {/* Footer */}
            <Pressable
                onPress={handleNext}
                className="flex-row gap-2 justify-center items-center p-4 rounded-lg"
                style={{ backgroundColor: isDark ? "#39FF14" : "#00B700" }}
            >
                <Text className="text-xl font-bold text-white dark:text-black">
                    {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
                </Text>
                <Icon as={ChevronRight} size="xl" color={isDark ? "#000" : "#fff"} />
            </Pressable>
        </Animated.View>
    );
}

/** Dot Component */
function Dot({ index, translateX }: { index: number; translateX: SharedValue<number> }) {
    const style = useAnimatedStyle(() => {
        const position = -translateX.value / SCREEN_WIDTH;
        const distance = Math.abs(position - index);

        return {
            width: withTiming(distance < 0.5 ? 16 : 8),
            opacity: withTiming(distance < 0.5 ? 1 : 0.4),
        };
    });

    return <Animated.View style={[styles.dot, style]} />;
}

/** Styles */
const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 24,
    },
    progressContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: "#39FF14",
    },
    slidesContainer: {
        flexDirection: "row",
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
    },
    nextButton: {
        marginHorizontal: 24,
        marginBottom: 12,
        paddingVertical: 16,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
});
