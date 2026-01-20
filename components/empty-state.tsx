import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { useColorScheme } from "nativewind"
import { type FC, useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated"

interface EmptyStateProps {
    icon?: string
    title: string
    description: string
}

export const EmptyState: FC<EmptyStateProps> = ({ icon = "📝", title, description }) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const iconScale = useSharedValue(1)
    const iconRotation = useSharedValue(0)
    const contentOpacity = useSharedValue(0)
    const contentTranslateY = useSharedValue(20)

    useEffect(() => {
        // Icon animation - gentle bounce
        iconScale.value = withRepeat(
            withSequence(
                withSpring(1.1, { damping: 10, stiffness: 100 }),
                withSpring(1, { damping: 10, stiffness: 100 }),
            ),
            -1,
            true,
        )

        // Subtle rotation
        iconRotation.value = withRepeat(
            withSequence(withTiming(5, { duration: 1500 }), withTiming(-5, { duration: 1500 })),
            -1,
            true,
        )

        // Content fade in
        contentOpacity.value = withDelay(300, withTiming(1, { duration: 500 }))
        contentTranslateY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 100 }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }, { rotate: `${iconRotation.value}deg` }],
    }))

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslateY.value }],
    }))

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
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        paddingHorizontal: 40,
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
})
