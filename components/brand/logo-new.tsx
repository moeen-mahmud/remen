import { Text } from "@/components/ui/text"
import { useColorScheme } from "nativewind"
import { type FC, useEffect } from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated"

interface RemenLogoProps {
    size?: "sm" | "md" | "lg"
    showIcon?: boolean
    animated?: boolean
}

const SIZES = {
    sm: { fontSize: 18, iconSize: 20, gap: 6 },
    md: { fontSize: 20, iconSize: 24, gap: 8 },
    lg: { fontSize: 32, iconSize: 36, gap: 10 },
}

export const RemenLogo: FC<RemenLogoProps> = ({
    size = "md",
    showIcon = true,
    animated = true, // Default to true so you can see it animate
}) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"
    const sizeConfig = SIZES[size]

    // Animation values
    const scale = useSharedValue(1)
    const opacity1 = useSharedValue(0.4)
    const opacity2 = useSharedValue(0.4)
    const opacity3 = useSharedValue(0.4)

    // Primary brand color
    const primaryColor = isDark ? "#39FF14" : "#00B700"

    useEffect(() => {
        if (animated) {
            // Gentle breathing animation for the whole icon
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                ),
                -1,
                false,
            )

            // Sequential pulse for the three dots (like synapses firing)
            opacity1.value = withRepeat(
                withSequence(withTiming(1, { duration: 400 }), withTiming(0.4, { duration: 800 })),
                -1,
                false,
            )

            opacity2.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: 200 }),
                    withTiming(1, { duration: 400 }),
                    withTiming(0.4, { duration: 600 }),
                ),
                -1,
                false,
            )

            opacity3.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: 400 }),
                    withTiming(1, { duration: 400 }),
                    withTiming(0.4, { duration: 400 }),
                ),
                -1,
                false,
            )
        }
    }, [animated])

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    const dot1Style = useAnimatedStyle(() => ({
        opacity: opacity1.value,
    }))

    const dot2Style = useAnimatedStyle(() => ({
        opacity: opacity2.value,
    }))

    const dot3Style = useAnimatedStyle(() => ({
        opacity: opacity3.value,
    }))

    const dotSize = sizeConfig.iconSize * 0.25

    return (
        <View style={styles.container}>
            {showIcon && (
                <Animated.View
                    style={[
                        styles.iconContainer,
                        { width: sizeConfig.iconSize, height: sizeConfig.iconSize },
                        containerAnimatedStyle,
                    ]}
                >
                    {/* Three dots forming a memory/neural pattern */}
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                width: dotSize,
                                height: dotSize,
                                backgroundColor: primaryColor,
                                position: "absolute",
                                top: "15%",
                                left: "50%",
                                marginLeft: -dotSize / 2,
                            },
                            dot1Style,
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                width: dotSize,
                                height: dotSize,
                                backgroundColor: primaryColor,
                                position: "absolute",
                                bottom: "15%",
                                left: "20%",
                                marginLeft: -dotSize / 2,
                            },
                            dot2Style,
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.dot,
                            {
                                width: dotSize,
                                height: dotSize,
                                backgroundColor: primaryColor,
                                position: "absolute",
                                bottom: "15%",
                                right: "20%",
                                marginRight: -dotSize / 2,
                            },
                            dot3Style,
                        ]}
                    />

                    {/* Connecting lines (subtle) */}
                    <View
                        style={[
                            styles.connectionLine,
                            {
                                width: 1,
                                height: sizeConfig.iconSize * 0.5,
                                backgroundColor: primaryColor,
                                opacity: 0.3,
                                position: "absolute",
                                top: "25%",
                                left: "30%",
                                transform: [{ rotate: "45deg" }],
                            },
                        ]}
                    />
                    <View
                        style={[
                            styles.connectionLine,
                            {
                                width: 1,
                                height: sizeConfig.iconSize * 0.5,
                                backgroundColor: primaryColor,
                                opacity: 0.3,
                                position: "absolute",
                                top: "25%",
                                right: "30%",
                                transform: [{ rotate: "-45deg" }],
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
                        marginLeft: showIcon ? sizeConfig.gap + 4 : 0,
                    },
                ]}
            >
                Remen
            </Text>
        </View>
    )
}

// Compact version for headers
export const RemenWordmark: FC<{ size?: "sm" | "md" | "lg" }> = ({ size = "md" }) => {
    const sizeConfig = SIZES[size]

    return (
        <Text
            style={[
                styles.wordmark,
                {
                    fontSize: sizeConfig.fontSize,
                },
            ]}
        >
            Remen
        </Text>
    )
}

// Animated icon only - simplified version
export const RemenIcon: FC<{ size?: number; color?: string; animated?: boolean }> = ({
    size = 28,
    color,
    animated = true,
}) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"
    const iconColor = color || (isDark ? "#39FF14" : "#00B700")

    const pulse = useSharedValue(1)

    useEffect(() => {
        if (animated) {
            pulse.value = withRepeat(
                withSequence(
                    withSpring(1.15, { damping: 8, stiffness: 100 }),
                    withSpring(1, { damping: 8, stiffness: 100 }),
                ),
                -1,
                false,
            )
        }
    }, [animated])

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    const dotSize = size * 0.25

    return (
        <Animated.View
            style={[
                {
                    width: size,
                    height: size,
                    position: "relative",
                    justifyContent: "center",
                    alignItems: "center",
                },
                animatedStyle,
            ]}
        >
            <View
                style={{
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: iconColor,
                    borderRadius: dotSize / 2,
                    position: "absolute",
                    top: "15%",
                }}
            />
            <View
                style={{
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: iconColor,
                    borderRadius: dotSize / 2,
                    position: "absolute",
                    bottom: "10%",
                    left: "10%",
                }}
            />
            <View
                style={{
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: iconColor,
                    borderRadius: dotSize / 2,
                    position: "absolute",
                    bottom: "10%",
                    right: "10%",
                }}
            />
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    dot: {
        borderRadius: 999,
        shadowColor: "#39FF14",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
    },
    connectionLine: {
        // Subtle connecting lines between dots
    },
    wordmark: {
        fontWeight: "700",
        letterSpacing: -0.5,
    },
})
