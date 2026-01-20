import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import type { Note } from "@/lib/database"
import { useColorScheme } from "nativewind"
import type { FC } from "react"
import { Pressable, StyleSheet, View } from "react-native"

export interface NoteCardProps {
    note: Note
    onPress: (note: Note) => void
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

// Get note type icon/badge
function getNoteTypeBadge(type: Note["type"]): { label: string; color: string } {
    switch (type) {
        case "meeting":
            return { label: "Meeting", color: "#3B82F6" }
        case "task":
            return { label: "Task", color: "#EF4444" }
        case "idea":
            return { label: "Idea", color: "#F59E0B" }
        case "journal":
            return { label: "Journal", color: "#8B5CF6" }
        case "reference":
            return { label: "Reference", color: "#10B981" }
        default:
            return { label: "Note", color: "#6B7280" }
    }
}

// Truncate text to a certain length
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
}

export const NoteCard: FC<NoteCardProps> = ({ note, onPress }) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const typeBadge = getNoteTypeBadge(note.type)
    const displayTitle = note.title || truncateText(note.content, 50)
    const preview = note.title ? truncateText(note.content, 100) : truncateText(note.content.substring(50), 100)

    return (
        <Pressable
            onPress={() => onPress(note)}
            style={({ pressed }) => [
                styles.container,
                {
                    backgroundColor: isDark ? (pressed ? "#2a2a2a" : "#1a1a1a") : pressed ? "#f5f5f5" : "#ffffff",
                    borderColor: isDark ? "#333" : "#e5e5e5",
                },
            ]}
        >
            <View style={styles.header}>
                <View style={[styles.typeBadge, { backgroundColor: typeBadge.color + "20" }]}>
                    <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>{typeBadge.label}</Text>
                </View>
                <Text style={[styles.timestamp, { color: isDark ? "#888" : "#666" }]}>
                    {formatRelativeTime(note.created_at)}
                </Text>
            </View>

            <Heading size="sm" style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
                {displayTitle}
            </Heading>

            {preview && preview.length > 0 && (
                <Text style={[styles.preview, { color: isDark ? "#aaa" : "#666" }]} numberOfLines={2}>
                    {preview}
                </Text>
            )}

            {note.is_processed && (
                <View style={styles.processedIndicator}>
                    <View style={[styles.processedDot, { backgroundColor: "#10B981" }]} />
                    <Text style={[styles.processedText, { color: isDark ? "#888" : "#666" }]}>Organized</Text>
                </View>
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    timestamp: {
        fontSize: 12,
    },
    title: {
        marginBottom: 4,
    },
    preview: {
        fontSize: 14,
        lineHeight: 20,
    },
    processedIndicator: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
    },
    processedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    processedText: {
        fontSize: 11,
    },
})
