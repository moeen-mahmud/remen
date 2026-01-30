import { RemenLogo } from "@/components/brand/logo";
import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dot } from "./onboarding-dot";
import { onboardingSlides as slides } from "./onboarding-slides";
import { SCREEN_WIDTH, onboardingStyles as styles } from "./onboarding-styles";

type OnboardingProps = {
    onComplete: () => void;
    onSkip?: () => void;
};

export const Onboarding = ({ onComplete, onSkip }: OnboardingProps) => {
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
                <RemenLogo size="sm" showIcon={false} animated={true} />
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
                    <Dot key={i} index={i} translateX={translateX} isDark={isDark} />
                ))}
            </View>

            {/* Footer */}
            <Box className="px-8">
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
            </Box>
        </Animated.View>
    );
};
