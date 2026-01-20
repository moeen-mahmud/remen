import { CheckCircleIcon, CloudIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { type FC, useEffect } from "react"
import { StyleSheet, Text } from "react-native"
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated"

export type SaveState = "idle" | "saving" | "saved"

interface SaveStatusProps {
    state: SaveState
}

export const SaveStatus: FC<SaveStatusProps> = ({ state }) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const opacity = useSharedValue(0)
    const scale = useSharedValue(0.8)
    const iconRotation = useSharedValue(0)

    useEffect(() => {
        if (state === "idle") {
            opacity.value = withTiming(0, { duration: 200 })
        } else if (state === "saving") {
            opacity.value = withTiming(1, { duration: 200 })
            scale.value = withSpring(1, { damping: 15 })
            // Pulse animation for saving
            iconRotation.value = withSequence(
                withTiming(10, { duration: 300 }),
                withTiming(-10, { duration: 300 }),
                withTiming(0, { duration: 300 }),
            )
        } else if (state === "saved") {
            opacity.value = withTiming(1, { duration: 200 })
            scale.value = withSequence(
                withSpring(1.2, { damping: 10, stiffness: 200 }),
                withSpring(1, { damping: 10, stiffness: 200 }),
            )
            // Fade out after 2 seconds
            opacity.value = withDelay(2000, withTiming(0, { duration: 500 }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state])

    const containerStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }))

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${iconRotation.value}deg` }],
    }))

    const textColor = isDark ? "#888" : "#666"
    const savedColor = isDark ? "#39FF14" : "#00B700"

    if (state === "idle") {
        return null
    }

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <Animated.View style={iconStyle}>
                {state === "saving" ? (
                    <CloudIcon size={14} color={textColor} />
                ) : (
                    <CheckCircleIcon size={14} color={savedColor} />
                )}
            </Animated.View>
            <Text style={[styles.text, { color: state === "saved" ? savedColor : textColor }]}>
                {state === "saving" ? "Saving..." : "Saved"}
            </Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    text: {
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
})
