import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { getNoteTypeBadge } from "@/lib/ai/classify"

import type { Note, Tag } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { CheckCircleIcon, CircleIcon, MicIcon, ScanIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import type { FC } from "react"
import { Pressable, StyleSheet, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export interface NoteCardProps {
    note: Note
    tags?: Tag[]
    onPress: (note: Note) => void
    onLongPress?: (note: Note) => void
    isSelectionMode?: boolean
    isSelected?: boolean
    onToggleSelect?: (note: Note) => void
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    // For older notes, show the date
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    })
}

// Truncate text to a certain length
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
}

// Get icon for special note types
function getNoteTypeIcon(type: Note["type"], color: string) {
    switch (type) {
        case "voice":
            return <MicIcon size={12} color={color} />
        case "scan":
            return <ScanIcon size={12} color={color} />
        default:
            return null
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
}) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const typeBadge = getNoteTypeBadge(note.type)
    const displayTitle = note.title || truncateText(note.content, 50)
    const preview = note.title ? truncateText(note.content, 100) : truncateText(note.content.substring(50), 100)
    const typeIcon = getNoteTypeIcon(note.type, typeBadge.color)

    // Show first 3 tags max
    const displayTags = tags.slice(0, 3)
    const hasMoreTags = tags.length > 3

    // Animation values
    const scale = useSharedValue(1)
    const shadowOpacity = useSharedValue(0.1)

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: shadowOpacity.value,
    }))

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 20, stiffness: 300 })
        shadowOpacity.value = withTiming(0.2, { duration: 100 })
    }

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 })
        shadowOpacity.value = withTiming(0.1, { duration: 150 })
    }

    const handlePress = async () => {
        if (isSelectionMode && onToggleSelect) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onToggleSelect(note)
        } else {
            onPress(note)
        }
    }

    const handleLongPress = async () => {
        scale.value = withSpring(0.95, { damping: 15 })
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setTimeout(() => {
            scale.value = withSpring(1, { damping: 15 })
        }, 100)
        onLongPress?.(note)
    }

    const selectedBorderColor = isDark ? "#39FF14" : "#00B700"

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleLongPress}
            delayLongPress={400}
            style={[
                animatedStyle,
                styles.container,
                {
                    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
                    borderColor: isSelected ? selectedBorderColor : isDark ? "#333" : "#e5e5e5",
                    borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                    shadowColor: isDark ? "#39FF14" : "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 8,
                    elevation: 3,
                },
            ]}
        >
            {/* Header with selection indicator and timestamp */}
            <View style={styles.header}>
                {isSelectionMode && (
                    <View style={styles.selectionIndicator}>
                        {isSelected ? (
                            <CheckCircleIcon size={22} color={isDark ? "#39FF14" : "#00B700"} />
                        ) : (
                            <CircleIcon size={22} color={isDark ? "#666" : "#ccc"} />
                        )}
                    </View>
                )}
                <Text style={[styles.timestamp, { color: isDark ? "#888" : "#666" }]}>
                    {formatRelativeTime(note.created_at)}
                </Text>
            </View>

            {/* Title */}
            <Heading size="sm" style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
                {displayTitle}
            </Heading>

            {/* Preview */}
            {preview && preview.length > 0 && (
                <Text style={[styles.preview, { color: isDark ? "#aaa" : "#666" }]} numberOfLines={2}>
                    {preview}
                </Text>
            )}

            {/* Type + Tags Row */}
            <View style={styles.badgesContainer}>
                {/* Type badge */}
                <View style={[styles.typeBadge, { backgroundColor: typeBadge.bgColor }]}>
                    {typeIcon && <View style={styles.typeIcon}>{typeIcon}</View>}
                    <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>{typeBadge.label}</Text>
                </View>

                {/* Tags */}
                {displayTags.map((tag) => (
                    <View key={tag.id} style={[styles.tagBadge, { backgroundColor: isDark ? "#333" : "#f0f0f0" }]}>
                        <Text style={[styles.tagText, { color: isDark ? "#ccc" : "#555" }]}>#{tag.name}</Text>
                    </View>
                ))}

                {/* More tags indicator */}
                {hasMoreTags && (
                    <Text style={[styles.moreTagsText, { color: isDark ? "#666" : "#999" }]}>+{tags.length - 3}</Text>
                )}
            </View>
        </AnimatedPressable>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    selectionIndicator: {
        marginRight: 8,
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
})
