import { NoteCard, type NoteCardProps } from "@/components/note-card";
import { Icon } from "@/components/ui/icon";
import { gestureThresholds, timingConfigs } from "@/lib/animation-config";
import * as Haptics from "expo-haptics";
import { ArchiveIcon, Pin, PinOff, UndoIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { type FC, useCallback } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * gestureThresholds.swipeActionThreshold;

interface SwipeableNoteCardProps extends NoteCardProps {
    onArchive?: () => void;
    onPin?: () => void;
    onRestore?: () => void;
    isArchived?: boolean;
    isTrashed?: boolean;
    isPinned?: boolean;
    showRightAction?: boolean;
    showLeftAction?: boolean;
    // Selection mode props are passed through to NoteCard
}

export const SwipeableNoteCard: FC<SwipeableNoteCardProps> = ({
    note,
    tags,
    onPress,
    onArchive,
    onPin,
    onRestore,
    isArchived = false,
    isTrashed = false,
    isPinned = false,
    showRightAction = true,
    showLeftAction = true,
    onLongPress,
    isSelectionMode,
    isSelected,
    onToggleSelect,
    isProcessing,
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const translateX = useSharedValue(0);
    const isRemoving = useSharedValue(false);

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleArchive = useCallback(() => {
        onArchive?.();
    }, [onArchive]);

    const handlePin = useCallback(() => {
        onPin?.();
    }, [onPin]);

    const handleRestore = useCallback(() => {
        onRestore?.();
    }, [onRestore]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-5, 5])
        .onUpdate((event) => {
            // Limit swipe distance
            const clampedX = Math.max(-SCREEN_WIDTH * 0.5, Math.min(SCREEN_WIDTH * 0.5, event.translationX));
            translateX.value = clampedX;
        })
        .onEnd((event) => {
            const shouldTriggerLeft = translateX.value < -SWIPE_THRESHOLD;
            const shouldTriggerRight = translateX.value > SWIPE_THRESHOLD;

            if (shouldTriggerLeft) {
                // Swipe left - Archive (or Restore if in trash)
                runOnJS(triggerHaptic)();
                if (isTrashed) {
                    runOnJS(handleRestore)();
                } else {
                    runOnJS(handleArchive)();
                }
                isRemoving.value = true;
                translateX.value = withTiming(-SCREEN_WIDTH, timingConfigs.fast);
            } else if (shouldTriggerRight) {
                // Swipe right - Pin/Unpin (only for non-archived, non-trashed notes)
                if (!isArchived && !isTrashed) {
                    runOnJS(triggerHaptic)();
                    runOnJS(handlePin)();
                } else if (isArchived) {
                    runOnJS(triggerHaptic)();
                    runOnJS(handleRestore)();
                }
                translateX.value = withTiming(0, timingConfigs.normal);
            } else {
                // Snap back
                translateX.value = withTiming(0, timingConfigs.normal);
            }
        });

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const leftActionStyle = useAnimatedStyle(() => {
        const opacity = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
        return {
            opacity: Math.max(0, opacity),
        };
    });

    const rightActionStyle = useAnimatedStyle(() => {
        const opacity = Math.min(-translateX.value / SWIPE_THRESHOLD, 1);
        return {
            opacity: Math.max(0, opacity),
        };
    });

    // Determine action colors and icons based on context
    // Left action (visible when swiping right) = Pin/Unpin
    // Right action (visible when swiping left) = Archive
    const leftActionColor = isArchived
        ? isDark
            ? "#39FF14"
            : "#00B700"
        : isPinned
          ? isDark
              ? "#E7000B"
              : "#F9423C"
          : isDark
            ? "#39FF14"
            : "#00B700";
    const rightActionColor = isArchived ? (isDark ? "#39FF14" : "#00B700") : isDark ? "#E7000B" : "#F9423C";

    const LeftIcon = isArchived ? UndoIcon : isPinned ? PinOff : Pin;
    const RightIcon = isArchived ? UndoIcon : ArchiveIcon;

    const leftLabel = isArchived ? "Restore" : isPinned ? "Unpin" : "Pin";
    const rightLabel = isArchived ? "Restore" : "Archive";

    return (
        <View style={styles.container}>
            {/* Left Action (Pin/Unpin/Restore) - visible when swiping right */}
            {showLeftAction ? (
                <Animated.View style={[styles.actionContainer, styles.leftAction, leftActionStyle]}>
                    <View
                        style={[
                            styles.actionContent,
                            { backgroundColor: leftActionColor, justifyContent: "flex-start" },
                        ]}
                    >
                        <Icon as={LeftIcon} size="md" color="#000" />
                        <Text style={styles.actionText}>{leftLabel}</Text>
                    </View>
                </Animated.View>
            ) : null}

            {/* Right Action (Archive/Restore) - visible when swiping left */}
            {showRightAction ? (
                <Animated.View style={[styles.actionContainer, styles.rightAction, rightActionStyle]}>
                    <View
                        style={[
                            styles.actionContent,
                            { backgroundColor: rightActionColor, justifyContent: "flex-end" },
                        ]}
                    >
                        <Icon as={RightIcon} size="md" color="#000" />
                        <Text style={styles.actionText}>{rightLabel}</Text>
                    </View>
                </Animated.View>
            ) : null}

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
                        isProcessing={isProcessing}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

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
        paddingHorizontal: 16,
        paddingVertical: 8,
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
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minWidth: 200,
        paddingHorizontal: 16,
        // paddingVertical: 12,
        borderRadius: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: "600",
    },
});
