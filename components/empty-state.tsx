import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { springConfigs, timingConfigs } from "@/lib/animation-config";
import { useColorScheme } from "nativewind";
import { type FC, useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
}

export const EmptyState: FC<EmptyStateProps> = ({ icon, title, description }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const iconScale = useSharedValue(1);
    const iconRotation = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(20);

    useEffect(() => {
        // Icon animation - gentle bounce
        iconScale.value = withRepeat(
            withSequence(withSpring(1.1, springConfigs.bouncy), withSpring(1, springConfigs.bouncy)),
            -1,
            true,
        );

        // Subtle rotation
        iconRotation.value = withRepeat(
            withSequence(withTiming(5, timingConfigs.slow), withTiming(-5, timingConfigs.slow)),
            -1,
            true,
        );

        // Content fade in
        contentOpacity.value = withDelay(300, withTiming(1, timingConfigs.slow));
        contentTranslateY.value = withDelay(300, withSpring(0, springConfigs.gentle));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }, { rotate: `${iconRotation.value}deg` }],
    }));

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslateY.value }],
    }));

    return (
        <View style={styles.container}>
            <Animated.Text style={[styles.icon, iconAnimatedStyle]}>{icon}</Animated.Text>

            <Animated.View style={contentAnimatedStyle}>
                <Heading size="md" style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
                    {title}
                </Heading>
                <Text style={[styles.description, { color: isDark ? "#888" : "#666" }]}>{description}</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -100,
    },
    icon: {
        fontSize: 64,
        marginBottom: 24,
    },
    title: {
        marginBottom: 8,
        textAlign: "center",
    },
    description: {
        textAlign: "center",
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.7,
    },
});
