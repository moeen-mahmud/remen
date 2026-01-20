import { NoteCard, type NoteCardProps } from "@/components/note-card"
import * as Haptics from "expo-haptics"
import { ArchiveIcon, Trash2Icon, UndoIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { type FC, useCallback } from "react"
import { Dimensions, StyleSheet, Text, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3

interface SwipeableNoteCardProps extends NoteCardProps {
    onArchive?: () => void
    onTrash?: () => void
    onRestore?: () => void
    isArchived?: boolean
    isTrashed?: boolean
    // Selection mode props are passed through to NoteCard
}

export const SwipeableNoteCard: FC<SwipeableNoteCardProps> = ({
    note,
    tags,
    onPress,
    onArchive,
    onTrash,
    onRestore,
    isArchived = false,
    isTrashed = false,
    onLongPress,
    isSelectionMode,
    isSelected,
    onToggleSelect,
}) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const translateX = useSharedValue(0)
    const isRemoving = useSharedValue(false)

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }, [])

    const handleArchive = useCallback(() => {
        onArchive?.()
    }, [onArchive])

    const handleTrash = useCallback(() => {
        onTrash?.()
    }, [onTrash])

    const handleRestore = useCallback(() => {
        onRestore?.()
    }, [onRestore])

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-5, 5])
        .onUpdate((event) => {
            // Limit swipe distance
            const clampedX = Math.max(-SCREEN_WIDTH * 0.5, Math.min(SCREEN_WIDTH * 0.5, event.translationX))
            translateX.value = clampedX
        })
        .onEnd((event) => {
            const shouldTriggerLeft = translateX.value < -SWIPE_THRESHOLD
            const shouldTriggerRight = translateX.value > SWIPE_THRESHOLD

            if (shouldTriggerLeft) {
                // Swipe left - Archive (or Restore if in trash)
                runOnJS(triggerHaptic)()
                if (isTrashed) {
                    runOnJS(handleRestore)()
                } else {
                    runOnJS(handleArchive)()
                }
                isRemoving.value = true
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 })
            } else if (shouldTriggerRight) {
                // Swipe right - Trash (or Restore if archived)
                runOnJS(triggerHaptic)()
                if (isArchived) {
                    runOnJS(handleRestore)()
                } else {
                    runOnJS(handleTrash)()
                }
                isRemoving.value = true
                translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 })
            } else {
                // Snap back
                translateX.value = withSpring(0, { damping: 20, stiffness: 200 })
            }
        })

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }))

    const leftActionStyle = useAnimatedStyle(() => {
        const opacity = Math.min(translateX.value / SWIPE_THRESHOLD, 1)
        return {
            opacity: Math.max(0, opacity),
        }
    })

    const rightActionStyle = useAnimatedStyle(() => {
        const opacity = Math.min(-translateX.value / SWIPE_THRESHOLD, 1)
        return {
            opacity: Math.max(0, opacity),
        }
    })

    // Determine action colors and icons based on context
    const leftActionColor = isArchived ? (isDark ? "#39FF14" : "#00B700") : isDark ? "#E7000B" : "#F9423C"
    const rightActionColor = isTrashed || isArchived ? (isDark ? "#39FF14" : "#00B700") : isDark ? "#39FF14" : "#00B700"

    const LeftIcon = isArchived ? UndoIcon : Trash2Icon
    const RightIcon = isTrashed ? UndoIcon : ArchiveIcon

    const leftLabel = isArchived ? "Restore" : "Trash"
    const rightLabel = isTrashed ? "Restore" : "Archive"

    return (
        <View style={styles.container}>
            {/* Left Action (Trash/Restore) - visible when swiping right */}
            <Animated.View style={[styles.actionContainer, styles.leftAction, leftActionStyle]}>
                <View style={[styles.actionContent, { backgroundColor: leftActionColor }]}>
                    <LeftIcon size={24} color="#fff" />
                    <Text style={styles.actionText}>{leftLabel}</Text>
                </View>
            </Animated.View>

            {/* Right Action (Archive/Restore) - visible when swiping left */}
            <Animated.View style={[styles.actionContainer, styles.rightAction, rightActionStyle]}>
                <View style={[styles.actionContent, { backgroundColor: rightActionColor }]}>
                    <RightIcon size={24} color="#fff" />
                    <Text style={styles.actionText}>{rightLabel}</Text>
                </View>
            </Animated.View>

            {/* Card */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={cardAnimatedStyle}>
                    <NoteCard
                        note={note}
                        tags={tags}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        isSelectionMode={isSelectionMode}
                        isSelected={isSelected}
                        onToggleSelect={onToggleSelect}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        marginVertical: 0,
    },
    actionContainer: {
        position: "absolute",
        top: 0,
        bottom: 0,
        justifyContent: "center",
        paddingHorizontal: 20,
    },
    leftAction: {
        left: 0,
        right: "50%",
        alignItems: "flex-start",
    },
    rightAction: {
        right: 0,
        left: "50%",
        alignItems: "flex-end",
    },
    actionContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    },
    actionText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
})
