import { useColorScheme } from "nativewind"
import { type FC, useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
} from "react-native-reanimated"

interface LoadingIndicatorProps {
    size?: "sm" | "md" | "lg"
    color?: string
}

const SIZES = {
    sm: { dot: 8, gap: 6 },
    md: { dot: 12, gap: 8 },
    lg: { dot: 16, gap: 10 },
}

export const LoadingIndicator: FC<LoadingIndicatorProps> = ({ size = "md", color }) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const sizeConfig = SIZES[size]
    const dotColor = color || (isDark ? "#39FF14" : "#00B700")

    // Animation values for each dot
    const scale1 = useSharedValue(1)
    const scale2 = useSharedValue(1)
    const scale3 = useSharedValue(1)

    useEffect(() => {
        // Staggered bounce animation
        scale1.value = withRepeat(
            withSequence(
                withSpring(1.3, { damping: 8, stiffness: 200 }),
                withSpring(1, { damping: 8, stiffness: 200 }),
            ),
            -1,
            true,
        )

        setTimeout(() => {
            scale2.value = withRepeat(
                withSequence(
                    withSpring(1.3, { damping: 8, stiffness: 200 }),
                    withSpring(1, { damping: 8, stiffness: 200 }),
                ),
                -1,
                true,
            )
        }, 150)

        setTimeout(() => {
            scale3.value = withRepeat(
                withSequence(
                    withSpring(1.3, { damping: 8, stiffness: 200 }),
                    withSpring(1, { damping: 8, stiffness: 200 }),
                ),
                -1,
                true,
            )
        }, 300)
    }, [])

    const dot1Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale1.value }],
    }))

    const dot2Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale2.value }],
    }))

    const dot3Style = useAnimatedStyle(() => ({
        transform: [{ scale: scale3.value }],
    }))

    return (
        <View style={[styles.container, { gap: sizeConfig.gap }]}>
            <Animated.View
                style={[
                    dot1Style,
                    {
                        width: sizeConfig.dot,
                        height: sizeConfig.dot,
                        borderRadius: sizeConfig.dot / 2,
                        backgroundColor: dotColor,
                    },
                ]}
            />
            <Animated.View
                style={[
                    dot2Style,
                    {
                        width: sizeConfig.dot,
                        height: sizeConfig.dot,
                        borderRadius: sizeConfig.dot / 2,
                        backgroundColor: dotColor,
                    },
                ]}
            />
            <Animated.View
                style={[
                    dot3Style,
                    {
                        width: sizeConfig.dot,
                        height: sizeConfig.dot,
                        borderRadius: sizeConfig.dot / 2,
                        backgroundColor: dotColor,
                    },
                ]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
})
