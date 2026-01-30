import { TaskItem } from "@/components/notes/task-item";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { getNoteTypeBadge } from "@/lib/ai/classify";
import { scaleValues, springConfigs, timingConfigs } from "@/lib/animation-config";

import type { Note, Tag } from "@/lib/database";
import { parseTasksFromText } from "@/lib/tasks";
import * as Haptics from "expo-haptics";
import {
    BookIcon,
    BookOpenIcon,
    CalendarIcon,
    CircleCheckIcon,
    CircleIcon,
    FileIcon,
    LightbulbIcon,
    ListIcon,
    MicIcon,
    Pin,
    ScanIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, type FC } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NoteCardProps {
    note: Note;
    tags?: Tag[];
    onPress: (note: Note) => void;
    onLongPress?: (note: Note) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (note: Note) => void;
    isProcessing?: boolean;
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    // For older notes, show the date
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    });
}

// Truncate text to a certain length
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
}

// Get icon for special note types
function getNoteTypeIcon(type: Note["type"], color: string) {
    switch (type) {
        case "voice":
            return <MicIcon size={12} color={color} />;
        case "scan":
            return <ScanIcon size={12} color={color} />;
        case "task":
            return <ListIcon size={12} color={color} />;
        case "idea":
            return <LightbulbIcon size={12} color={color} />;
        case "journal":
            return <BookIcon size={12} color={color} />;
        case "reference":
            return <BookOpenIcon size={12} color={color} />;
        case "meeting":
            return <CalendarIcon size={12} color={color} />;
        case "note":
            return <FileIcon size={12} color={color} />;
        default:
            return null;
    }
}

export const NoteCard: FC<NoteCardProps> = ({
    note,
    tags = [],
    onPress,
    onLongPress,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    isProcessing = false,
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const typeBadge = getNoteTypeBadge(note.type);
    const hasContent = note.content.trim().length > 0;
    const hasTitle = note.title && note.title.trim().length > 0;
    const hasTasks = /^\s*-\s+\[[\sxX]\]\s+/.test(note.content);
    const parsedTasks = parseTasksFromText(note.content);

    // Display title: show title if exists, otherwise show content preview, or "Empty note" if both empty
    const displayTitle = hasTitle
        ? note.title?.startsWith("- [ ]")
            ? "Tasks list"
            : note.title
        : hasTasks
          ? "Tasks list"
          : "Empty note";
    const totalTasks = parsedTasks.length;
    const completedTasks = parsedTasks.filter((task) => task.isCompleted).length;
    const taskProgressPercentage = Math.round((completedTasks / totalTasks) * 100);
    // Preview: only show if there's content AND we're showing title (not content as title)
    const preview =
        hasTitle && hasContent
            ? hasTasks
                ? note.content
                : truncateText(note.content, 100)
            : hasTitle
              ? "" // Title exists but no content - no preview
              : hasContent
                ? hasTasks
                    ? ""
                    : truncateText(note.content.substring(50), 100) // Content as title, show rest as preview
                : ""; // Empty note - no preview
    const typeIcon = getNoteTypeIcon(note.type, typeBadge.color);

    // Animation values
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.1);
    const borderAnim = useSharedValue(0);
    const borderWidthAnim = useSharedValue(0);
    const selectedBorderWidth = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: shadowOpacity.value,
    }));

    const borderStyle = useAnimatedStyle(() => {
        const processingColor = `rgba(${isDark ? "57, 255, 20" : "0, 183, 0"}, ${borderAnim.value})`;
        const selectedColor = selectedBorderColor;
        const defaultColor = isDark ? "#333" : "#e5e5e5";

        // Priority: processing > selected > default
        const borderColor = isProcessing
            ? processingColor
            : selectedBorderWidth.value > 0
              ? selectedColor
              : defaultColor;

        // Combine border widths (processing takes priority visually)
        const totalBorderWidth = borderWidthAnim.value > 0 ? borderWidthAnim.value : selectedBorderWidth.value;

        return {
            borderWidth: totalBorderWidth,
            borderColor,
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(scaleValues.pressedIn, springConfigs.stiff);
        shadowOpacity.value = withTiming(0.2, timingConfigs.fast);
    };

    const handlePressOut = () => {
        scale.value = withSpring(scaleValues.pressedOut, springConfigs.gentle);
        shadowOpacity.value = withTiming(0.1, timingConfigs.fast);
    };

    const handlePress = async () => {
        if (isSelectionMode && onToggleSelect) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleSelect(note);
        } else {
            onPress(note);
        }
    };

    const handleLongPress = async () => {
        scale.value = withSpring(0.95, springConfigs.gentle);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
            scale.value = withSpring(1, springConfigs.gentle);
        }, 100);
        onLongPress?.(note);
    };

    // Animate border when processing
    useEffect(() => {
        if (isProcessing) {
            // Animate border width in
            borderWidthAnim.value = withTiming(2, { duration: 300 });
            // Animate opacity with pulsing effect
            borderAnim.value = withTiming(1, { duration: 500 }, () => {
                borderAnim.value = withRepeat(withTiming(0.3, { duration: 1000 }), -1, true);
            });
        } else {
            // Animate border width out
            borderWidthAnim.value = withTiming(0, { duration: 300 });
            // Fade out opacity
            borderAnim.value = withTiming(0, { duration: 300 });
        }
    }, [isProcessing, borderAnim, borderWidthAnim]);

    // Animate border when selected
    useEffect(() => {
        if (isSelected) {
            selectedBorderWidth.value = withTiming(2, { duration: 200 });
        } else {
            selectedBorderWidth.value = withTiming(0, { duration: 200 });
        }
    }, [isSelected, selectedBorderWidth]);

    const selectedBorderColor = isDark ? "#39FF14" : "#00B700";

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleLongPress}
            delayLongPress={400}
            className="rounded-lg bg-background-0"
            style={[animatedStyle, borderStyle, styles.container]}
        >
            {/* Header with selection indicator and timestamp */}
            <Box style={styles.header}>
                <Box style={styles.headerLeft}>
                    {isSelectionMode && (
                        <Box>
                            {isSelected ? (
                                <Icon as={CircleCheckIcon} size="sm" color={isDark ? "#39FF14" : "#00B700"} />
                            ) : (
                                <Icon as={CircleIcon} size="sm" color={isDark ? "#666" : "#ccc"} />
                            )}
                        </Box>
                    )}
                    {note.is_pinned && <Icon as={Pin} color={isDark ? "#39FF14" : "#00B700"} size="sm" />}
                </Box>
                <Text style={[styles.timestamp, { color: isDark ? "#888" : "#666" }]}>
                    {formatRelativeTime(note.created_at)}
                </Text>
            </Box>
            {/* Title */}
            <Heading size="sm" className="flex-wrap" style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
                {displayTitle}
            </Heading>

            {/* Preview */}
            {preview && preview.length > 0 && (
                <Box>
                    {hasTasks ? (
                        <Box className="flex-col">
                            {parsedTasks?.slice(0, 3)?.map((task, index) => {
                                return (
                                    <TaskItem
                                        key={`task-${task.lineIndex}-${index}`}
                                        content={task.content}
                                        isCompleted={task.isCompleted}
                                    />
                                );
                            })}
                            <Box className="flex-row flex-grow gap-2 justify-between items-center mt-1 mb-2">
                                {totalTasks > 3 ? (
                                    <Text
                                        className="text-sm font-semibold uppercase"
                                        style={{ color: isDark ? "#888" : "#666" }}
                                    >
                                        {totalTasks - 3}+ more
                                    </Text>
                                ) : (
                                    <Box className="flex-grow"></Box>
                                )}
                                <Text
                                    className="text-sm font-semibold uppercase"
                                    style={{ color: isDark ? "#888" : "#666" }}
                                >
                                    {taskProgressPercentage}% done
                                </Text>
                            </Box>
                        </Box>
                    ) : (
                        <Text style={[styles.preview, { color: isDark ? "#aaa" : "#666" }]} numberOfLines={2}>
                            {preview}
                        </Text>
                    )}
                </Box>
            )}

            {/* Type + Tags Row */}
            <Box className="flex-row flex-wrap gap-2 items-center">
                {/* Type badge */}
                <Box
                    className="flex-row gap-2 items-center p-2 rounded-lg"
                    style={{ backgroundColor: typeBadge.bgColor }}
                >
                    {typeIcon && <Box>{typeIcon}</Box>}
                    <Text className="text-sm font-semibold uppercase" style={{ color: typeBadge.color }}>
                        {typeBadge.label}
                    </Text>
                </Box>

                {/* Tags */}
                {tags.map((tag) => (
                    <Box key={tag.id} className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-900">
                        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                            #{tag.name}
                        </Text>
                    </Box>
                ))}
            </Box>
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        // borderRadius: 16,
        // borderWidth: StyleSheet.hairlineWidth,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timestamp: {
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    title: {
        marginBottom: 6,
        lineHeight: 24,
    },
    preview: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 14,
        opacity: 0.8,
    },
    badgesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginTop: 6,
    },
    typeBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    typeIcon: {
        marginRight: 2,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tagBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 13,
        fontWeight: "500",
    },
    moreTagsText: {
        fontSize: 12,
        fontWeight: "600",
        opacity: 0.6,
    },
});
