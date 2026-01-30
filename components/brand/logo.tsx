import { springConfigs, timingConfigs } from "@/lib/utils/animation-config";
import { useColorScheme } from "nativewind";
import { type FC } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

interface RemenLogoProps {
    size?: "sm" | "md" | "lg";
    showIcon?: boolean;
    animated?: boolean;
}

const SIZES = {
    sm: { fontSize: 18, iconSize: 16, gap: 4 },
    md: { fontSize: 24, iconSize: 20, gap: 6 },
    lg: { fontSize: 32, iconSize: 28, gap: 8 },
};

export const RemenLogo: FC<RemenLogoProps> = ({ size = "md", showIcon = true, animated = false }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const sizeConfig = SIZES[size];

    // Animation values
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    // Subtle pulse animation for the icon
    if (animated) {
        scale.value = withRepeat(
            withSequence(withTiming(1.05, timingConfigs.slow), withTiming(1, timingConfigs.slow)),
            -1,
            true,
        );
    }

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    }));

    // Primary brand color (green from theme)
    const primaryColor = isDark ? "#39FF14" : "#00B700";
    const textColor = isDark ? "#F8F8F8" : "#161616";

    return (
        <View style={styles.container}>
            {showIcon && (
                <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
                    <View
                        style={[
                            styles.iconDot,
                            {
                                width: sizeConfig.iconSize * 0.6,
                                height: sizeConfig.iconSize * 0.6,
                                backgroundColor: primaryColor,
                                borderRadius: sizeConfig.iconSize * 0.3,
                            },
                        ]}
                    />
                </Animated.View>
            )}
            <Text
                style={[
                    styles.wordmark,
                    {
                        fontSize: sizeConfig.fontSize,
                        color: textColor,
                        marginLeft: showIcon ? sizeConfig.gap : 0,
                    },
                ]}
            >
                Remen
            </Text>
        </View>
    );
};

// Compact version for headers - just the wordmark
export const RemenWordmark: FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "md" }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const sizeConfig = SIZES[size];

    return (
        <Text
            style={[
                styles.wordmark,
                {
                    fontSize: sizeConfig.fontSize,
                    color: isDark ? "#F8F8F8" : "#161616",
                },
            ]}
        >
            Remen
        </Text>
    );
};

// Animated icon only - for loading states or accents
export const RemenIcon: FC<{ size?: number; color?: string }> = ({ size = 24, color }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const iconColor = color || (isDark ? "#39FF14" : "#00B700");

    const scale = useSharedValue(1);

    // Breathing animation
    scale.value = withRepeat(
        withSequence(withSpring(1.1, springConfigs.bouncy), withSpring(1, springConfigs.bouncy)),
        -1,
        true,
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View style={animatedStyle}>
            <View
                style={{
                    width: size,
                    height: size,
                    backgroundColor: iconColor,
                    borderRadius: size / 2,
                }}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    iconDot: {
        shadowColor: "#39FF14",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 4,
    },
    wordmark: {
        fontWeight: "700",
        letterSpacing: -0.5,
    },
});
