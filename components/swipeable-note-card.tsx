import { NoteCard, type NoteCardProps } from "@/components/note-card";
import { Icon } from "@/components/ui/icon";
import { gestureThresholds, timingConfigs } from "@/lib/utils/animation-config";
import * as Haptics from "expo-haptics";
import { ArchiveIcon, Pin, PinOff, Trash2, UndoIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { type FC, useCallback } from "react";
import { Alert, Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * gestureThresholds.swipeActionThreshold;

type PageContext = "notes" | "archive" | "trash";

interface SwipeableNoteCardProps extends NoteCardProps {
    onArchive?: () => void;
    onPin?: () => void;
    onRestore?: () => void;
    onTrash?: () => void;
    onPermanentDelete?: () => void;
    isPinned?: boolean;
    pageContext: PageContext; // Required to determine swipe behavior
    showRightAction?: boolean;
    showLeftAction?: boolean;
}

export const SwipeableNoteCard: FC<SwipeableNoteCardProps> = ({
    note,
    tags,
    onPress,
    onArchive,
    onPin,
    onRestore,
    onTrash,
    onPermanentDelete,
    isPinned = false,
    pageContext,
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

    const handleLeftAction = useCallback(() => {
        switch (pageContext) {
            case "notes":
                onPin?.();
                break;
            case "archive":
            case "trash":
                onRestore?.();
                break;
        }
    }, [pageContext, onPin, onRestore]);

    const handleRightAction = useCallback(() => {
        switch (pageContext) {
            case "notes":
                onArchive?.();
                break;
            case "archive":
                onTrash?.();
                break;
            case "trash":
                // Show confirmation alert before permanent deletion
                Alert.alert(
                    "Delete Permanently",
                    "Are you sure you want to permanently delete this note? This action cannot be undone.",
                    [
                        {
                            text: "Cancel",
                            style: "cancel",
                        },
                        {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => onPermanentDelete?.(),
                        },
                    ],
                );
                break;
        }
    }, [pageContext, onArchive, onTrash, onPermanentDelete]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-5, 5])
        .onUpdate((event) => {
            // Limit swipe distance
            const clampedX = Math.max(-SCREEN_WIDTH * 0.5, Math.min(SCREEN_WIDTH * 0.5, event.translationX));
            translateX.value = clampedX;
        })
        .onEnd((event) => {
            const shouldTriggerLeft = translateX.value > SWIPE_THRESHOLD;
            const shouldTriggerRight = translateX.value < -SWIPE_THRESHOLD;

            if (shouldTriggerLeft && showLeftAction) {
                // Swipe left to right
                runOnJS(triggerHaptic)();
                runOnJS(handleLeftAction)();

                // Only animate removal for non-pin actions
                if (pageContext !== "notes") {
                    isRemoving.value = true;
                    translateX.value = withTiming(SCREEN_WIDTH, timingConfigs.fast);
                } else {
                    translateX.value = withTiming(0, timingConfigs.normal);
                }
            } else if (shouldTriggerRight && showRightAction) {
                // Swipe right to left
                runOnJS(triggerHaptic)();

                // For trash page, we need to show alert first
                if (pageContext === "trash") {
                    runOnJS(handleRightAction)();
                    translateX.value = withTiming(0, timingConfigs.normal);
                } else {
                    runOnJS(handleRightAction)();
                    isRemoving.value = true;
                    translateX.value = withTiming(-SCREEN_WIDTH, timingConfigs.fast);
                }
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

    // Determine action colors, icons, and labels based on page context
    const getLeftActionConfig = () => {
        switch (pageContext) {
            case "notes":
                return {
                    color: isPinned
                        ? isDark
                            ? "#E7000B"
                            : "#F9423C" // Danger color for unpin
                        : isDark
                          ? "#3B82F6"
                          : "#2563EB", // Blue for pin
                    icon: isPinned ? PinOff : Pin,
                    label: isPinned ? "Unpin" : "Pin",
                };
            case "archive":
            case "trash":
                return {
                    color: isDark ? "#39FF14" : "#00B700", // Success color for restore
                    icon: UndoIcon,
                    label: "Restore",
                };
        }
    };

    const getRightActionConfig = () => {
        switch (pageContext) {
            case "notes":
                return {
                    color: isDark ? "#F59E0B" : "#D97706", // Orange for archive
                    icon: ArchiveIcon,
                    label: "Archive",
                };
            case "archive":
                return {
                    color: isDark ? "#E7000B" : "#F9423C", // Danger color for trash
                    icon: Trash2,
                    label: "Trash",
                };
            case "trash":
                return {
                    color: isDark ? "#E7000B" : "#F9423C", // Danger color for delete
                    icon: Trash2,
                    label: "Delete",
                };
        }
    };

    const leftConfig = getLeftActionConfig();
    const rightConfig = getRightActionConfig();

    return (
        <View style={styles.container}>
            {/* Left Action - visible when swiping left to right */}
            {showLeftAction && (
                <Animated.View style={[styles.actionContainer, styles.leftAction, leftActionStyle]}>
                    <View
                        style={[
                            styles.actionContent,
                            { backgroundColor: leftConfig.color, justifyContent: "flex-start" },
                        ]}
                    >
                        <Icon as={leftConfig.icon} size="md" color="#000" />
                        <Text style={styles.actionText}>{leftConfig.label}</Text>
                    </View>
                </Animated.View>
            )}

            {/* Right Action - visible when swiping right to left */}
            {showRightAction && (
                <Animated.View style={[styles.actionContainer, styles.rightAction, rightActionStyle]}>
                    <View
                        style={[
                            styles.actionContent,
                            { backgroundColor: rightConfig.color, justifyContent: "flex-end" },
                        ]}
                    >
                        <Text style={styles.actionText}>{rightConfig.label}</Text>
                        <Icon as={rightConfig.icon} size="md" color="#000" />
                    </View>
                </Animated.View>
            )}

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
        borderRadius: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#000",
    },
});
