import { FabItemProps } from "@/components/fab/types"
import * as Haptics from "expo-haptics"
import type { LucideIcon } from "lucide-react-native"
import React, { type FC, isValidElement } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export const FabItem: FC<FabItemProps> = ({ action, index, isOpen, totalItems, onPress, isDark }) => {
    const handlePress = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onPress()
        action.onPress()
    }

    // Calculate stagger delay based on index (reverse order - bottom items animate first)
    const delay = (totalItems - 1 - index) * 100

    if (!isOpen) return null

    const IconComponent = action.icon as LucideIcon
    const isReactElement = isValidElement(action.icon)

    return (
        <AnimatedPressable
            entering={SlideInDown.delay(delay)}
            exiting={SlideOutDown.delay((totalItems - 1 - index) * 30).duration(200)}
            onPress={handlePress}
            style={({ pressed }) => [
                styles.itemContainer,
                pressed && styles.itemPressed,
                { opacity: pressed ? 0.8 : 1 },
            ]}
        >
            {/* Label */}
            {/* <Animated.View
                entering={FadeIn.delay(delay + 100).duration(200)}
                exiting={FadeOut.duration(100)}
                style={[styles.labelContainer, { backgroundColor: isDark ? "#1a1a1a" : "#ffffff" }]}
            >
            </Animated.View> */}

            {/* Icon Button */}
            <View
                style={[
                    styles.iconButton,
                    {
                        backgroundColor: action.backgroundColor || (isDark ? "#39FF14" : "#00B700"),
                    },
                ]}
            >
                {isReactElement ? (
                    (action.icon as React.ReactNode)
                ) : (
                    <IconComponent size={22} color={action.color || (isDark ? "#000" : "#fff")} />
                )}
            </View>
        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginBottom: 12,
    },
    itemPressed: {
        transform: [{ scale: 0.95 }],
    },
    labelContainer: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginRight: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
    },
    iconButton: {
        width: 60,
        height: 60,
        marginBottom: 12,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
})
