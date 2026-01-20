import { useColorScheme } from "nativewind"
import { useEffect, useState } from "react"
import { Animated, StyleSheet, Text } from "react-native"

interface ToastProps {
    message: string
    visible: boolean
    duration?: number
    onHide?: () => void
}

export function Toast({ message, visible, duration = 1500, onHide }: ToastProps) {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"
    const [fadeAnim] = useState(new Animated.Value(0))

    useEffect(() => {
        if (visible) {
            // Fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start()

            // Auto hide
            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    onHide?.()
                })
            }, duration)

            return () => clearTimeout(timer)
        }
    }, [visible, duration, fadeAnim, onHide])

    if (!visible) return null

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? "#333" : "#333",
                    opacity: fadeAnim,
                },
            ]}
        >
            <Text style={styles.text}>{message}</Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 100,
        left: 20,
        right: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    text: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
    },
})
