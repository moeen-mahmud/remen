import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { deleteNote, getNoteById, getTagsForNote, updateNote, type Note, type Tag } from "@/lib/database"
import { findRelatedNotes, type SearchResult } from "@/lib/search"
import * as Haptics from "expo-haptics"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeftIcon, TrashIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// Format full date
function formatFullDate(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    })
}

// Get note type badge
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

export default function NoteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const { top } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [note, setNote] = useState<Note | null>(null)
    const [tags, setTags] = useState<Tag[]>([])
    const [relatedNotes, setRelatedNotes] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState("")

    // Load note
    const loadNote = useCallback(async () => {
        if (!id) return

        try {
            const fetchedNote = await getNoteById(id)
            if (fetchedNote) {
                setNote(fetchedNote)
                setEditedContent(fetchedNote.content)

                const fetchedTags = await getTagsForNote(id)
                setTags(fetchedTags)

                // Load related notes in background
                findRelatedNotes(id, 3).then(setRelatedNotes).catch(console.error)
            }
        } catch (error) {
            console.error("Failed to load note:", error)
        } finally {
            setIsLoading(false)
        }
    }, [id])

    useEffect(() => {
        loadNote()
    }, [loadNote])

    // Handle related note press
    const handleRelatedNotePress = useCallback(
        (relatedNote: Note) => {
            router.push(`/notes/${relatedNote.id}` as any)
        },
        [router],
    )

    // Handle back
    const handleBack = useCallback(() => {
        router.back()
    }, [router])

    // Handle save
    const handleSave = useCallback(async () => {
        if (!note || editedContent.trim() === note.content) {
            setIsEditing(false)
            return
        }

        try {
            await updateNote(note.id, { content: editedContent.trim() })
            setNote({ ...note, content: editedContent.trim() })
            setIsEditing(false)
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (error) {
            console.error("Failed to save note:", error)
            Alert.alert("Error", "Failed to save changes")
        }
    }, [note, editedContent])

    // Handle delete
    const handleDelete = useCallback(() => {
        if (!note) return

        Alert.alert("Delete Note", "Are you sure you want to delete this note? This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await deleteNote(note.id)
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        router.back()
                    } catch (error) {
                        console.error("Failed to delete note:", error)
                        Alert.alert("Error", "Failed to delete note")
                    }
                },
            },
        ])
    }, [note, router])

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
            </View>
        )
    }

    if (!note) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                <Text style={{ color: isDark ? "#fff" : "#000" }}>Note not found</Text>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Text style={{ color: "#3B82F6" }}>Go back</Text>
                </Pressable>
            </View>
        )
    }

    const typeBadge = getNoteTypeBadge(note.type)

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff", paddingTop: top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.headerButton}>
                    <ArrowLeftIcon size={24} color={isDark ? "#fff" : "#000"} />
                </Pressable>

                <View style={styles.headerActions}>
                    {isEditing ? (
                        <Pressable onPress={handleSave} style={styles.headerButton}>
                            <Text style={{ color: "#3B82F6", fontWeight: "600" }}>Save</Text>
                        </Pressable>
                    ) : (
                        <>
                            <Pressable onPress={() => setIsEditing(true)} style={styles.headerButton}>
                                <Text style={{ color: "#3B82F6", fontWeight: "600" }}>Edit</Text>
                            </Pressable>
                            <Pressable onPress={handleDelete} style={styles.headerButton}>
                                <TrashIcon size={20} color="#EF4444" />
                            </Pressable>
                        </>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Title */}
                {note.title && (
                    <Heading size="xl" style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
                        {note.title}
                    </Heading>
                )}

                {/* Metadata */}
                <View style={styles.metadata}>
                    <View style={[styles.typeBadge, { backgroundColor: typeBadge.color + "20" }]}>
                        <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>{typeBadge.label}</Text>
                    </View>
                    <Text style={[styles.timestamp, { color: isDark ? "#888" : "#666" }]}>
                        {formatFullDate(note.created_at)}
                    </Text>
                </View>

                {/* Tags */}
                {tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {tags.map((tag) => (
                            <View key={tag.id} style={[styles.tag, { backgroundColor: isDark ? "#333" : "#f0f0f0" }]}>
                                <Text style={[styles.tagText, { color: isDark ? "#fff" : "#333" }]}>#{tag.name}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Content */}
                {isEditing ? (
                    <TextInput
                        style={[styles.contentInput, { color: isDark ? "#fff" : "#000" }]}
                        value={editedContent}
                        onChangeText={setEditedContent}
                        multiline
                        autoFocus
                        textAlignVertical="top"
                        placeholderTextColor={isDark ? "#888" : "#999"}
                    />
                ) : (
                    <Text style={[styles.contentText, { color: isDark ? "#ddd" : "#333" }]}>{note.content}</Text>
                )}

                {/* Processing status */}
                {note.is_processed && (
                    <View style={styles.processedContainer}>
                        <View style={[styles.processedDot, { backgroundColor: "#10B981" }]} />
                        <Text style={[styles.processedText, { color: isDark ? "#888" : "#666" }]}>AI organized</Text>
                    </View>
                )}

                {/* Related Notes */}
                {relatedNotes.length > 0 && (
                    <View style={styles.relatedSection}>
                        <Heading size="sm" style={[styles.relatedTitle, { color: isDark ? "#fff" : "#000" }]}>
                            Related Notes
                        </Heading>
                        {relatedNotes.map((relatedNote) => (
                            <Pressable
                                key={relatedNote.id}
                                onPress={() => handleRelatedNotePress(relatedNote)}
                                style={[
                                    styles.relatedCard,
                                    {
                                        backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                                        borderColor: isDark ? "#333" : "#e5e5e5",
                                    },
                                ]}
                            >
                                <Text
                                    style={[styles.relatedCardTitle, { color: isDark ? "#fff" : "#000" }]}
                                    numberOfLines={1}
                                >
                                    {relatedNote.title || relatedNote.content.substring(0, 50)}
                                </Text>
                                <Text
                                    style={[styles.relatedCardPreview, { color: isDark ? "#888" : "#666" }]}
                                    numberOfLines={2}
                                >
                                    {relatedNote.content.substring(0, 100)}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.1)",
    },
    headerButton: {
        padding: 8,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    backButton: {
        marginTop: 16,
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    title: {
        marginBottom: 12,
    },
    metadata: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        flexWrap: "wrap",
        gap: 12,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    timestamp: {
        fontSize: 13,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 20,
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    tagText: {
        fontSize: 13,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 26,
    },
    contentInput: {
        fontSize: 16,
        lineHeight: 26,
        minHeight: 200,
    },
    processedContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.1)",
    },
    processedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    processedText: {
        fontSize: 13,
    },
    relatedSection: {
        marginTop: 32,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.1)",
    },
    relatedTitle: {
        marginBottom: 16,
    },
    relatedCard: {
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    relatedCardTitle: {
        fontSize: 15,
        fontWeight: "600",
        marginBottom: 4,
    },
    relatedCardPreview: {
        fontSize: 13,
        lineHeight: 18,
    },
})
