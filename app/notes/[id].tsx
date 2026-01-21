import { Heading } from "@/components/ui/heading"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { getNoteTypeBadge } from "@/lib/ai/classify"
import { getNoteById, getTagsForNote, moveToTrash, type Note, type Tag } from "@/lib/database"
import { findRelatedNotes, type SearchResult } from "@/lib/search"
import * as Haptics from "expo-haptics"
import { Image } from "expo-image"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeftIcon, EditIcon, MicIcon, RecycleIcon, ScanIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native"
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

// Get icon for special note types
function getNoteTypeIcon(type: Note["type"], color: string, size: number = 14) {
    switch (type) {
        case "voice":
            return <MicIcon size={size} color={color} />
        case "scan":
            return <ScanIcon size={size} color={color} />
        default:
            return null
    }
}

export default function NoteDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [note, setNote] = useState<Note | null>(null)
    const [tags, setTags] = useState<Tag[]>([])
    const [relatedNotes, setRelatedNotes] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Load note
    const loadNote = useCallback(async () => {
        if (!id) return

        setIsLoading(true)
        try {
            const fetchedNote = await getNoteById(id)
            if (fetchedNote) {
                setNote(fetchedNote)

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

    // Reload note when screen comes into focus (after editing)
    useFocusEffect(
        useCallback(() => {
            loadNote()
        }, [loadNote]),
    )

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

    // Handle edit - navigate to edit screen
    const handleEdit = useCallback(() => {
        if (!id) return
        router.push(`/edit/${id}` as any)
    }, [id, router])

    // Handle delete
    const handleDelete = useCallback(() => {
        if (!note) return

        Alert.alert(
            "Move to Recycle Bin",
            "This note will be moved to the recycle bin. You can restore it from there.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move",
                    style: "default",
                    onPress: async () => {
                        try {
                            await moveToTrash(note.id)
                            // Remove from local state
                            setNote(null)
                            setTags([])
                            setRelatedNotes([])
                            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                            router.back()
                        } catch (error) {
                            console.error("Failed to delete note:", error)
                            Alert.alert("Error", "Failed to delete note")
                        }
                    },
                },
            ],
        )
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
    const typeIcon = getNoteTypeIcon(note.type, typeBadge.color)

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff", paddingTop: top }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: isDark ? "#333" : "#e5e5e5" }]}>
                <Pressable onPress={handleBack} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Icon as={ArrowLeftIcon} size="md" color={isDark ? "#fff" : "#000"} />
                    <Text className="text-lg font-bold">View Note</Text>
                </Pressable>

                <View style={styles.headerActions}>
                    <Pressable onPress={handleEdit} style={styles.headerButton}>
                        <Icon as={EditIcon} size="md" />
                    </Pressable>
                    <Pressable onPress={handleDelete} style={styles.headerButton}>
                        <Icon as={RecycleIcon} size="md" color={isDark ? "#f7d512" : "#f7d512"} />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: bottom + 24 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Original image for scan notes */}
                {note.type === "scan" && note.original_image && (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: note.original_image }} style={styles.scanImage} />
                    </View>
                )}

                {/* Title */}
                {note.title && (
                    <Heading size="xl" style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
                        {note.title}
                    </Heading>
                )}

                {/* Unified Type + Tags Row */}
                <View style={styles.badgesContainer}>
                    {/* Type badge */}
                    <View style={[styles.typeBadge, { backgroundColor: typeBadge.bgColor }]}>
                        {typeIcon && <View style={styles.typeIcon}>{typeIcon}</View>}
                        <Text style={[styles.typeBadgeText, { color: typeBadge.color }]}>{typeBadge.label}</Text>
                    </View>

                    {/* Tags */}
                    {tags.map((tag) => (
                        <View key={tag.id} style={[styles.tagBadge, { backgroundColor: isDark ? "#333" : "#f0f0f0" }]}>
                            <Text style={[styles.tagText, { color: isDark ? "#ccc" : "#555" }]}>#{tag.name}</Text>
                        </View>
                    ))}
                </View>

                {/* Timestamp */}
                <Text style={[styles.timestamp, { color: isDark ? "#888" : "#666" }]}>
                    {formatFullDate(note.created_at)}
                </Text>

                {/* Content */}
                <Pressable onPress={handleEdit}>
                    <Text style={[styles.contentText, { color: isDark ? "#ddd" : "#333" }]}>{note.content}</Text>
                </Pressable>

                {/* Processing status */}
                {note.is_processed && (
                    <View style={styles.processedContainer}>
                        <View style={[styles.processedDot, { backgroundColor: "#10B981" }]} />
                        <Text style={[styles.processedText, { color: isDark ? "#888" : "#666" }]}>AI organized</Text>
                    </View>
                )}

                {/* Related Notes */}
                {relatedNotes.length > 0 && (
                    <View style={[styles.relatedSection, { borderTopColor: isDark ? "#333" : "#e5e5e5" }]}>
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
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        // gap: 4,
    },
    backButton: {
        marginTop: 16,
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    imageContainer: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    scanImage: {
        width: "100%",
        height: "auto",
        objectFit: "contain",
        aspectRatio: 16 / 9,
        borderRadius: 16,
    },
    title: {
        marginBottom: 16,
        lineHeight: 40,
    },
    badgesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    typeBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 5,
    },
    typeIcon: {
        marginRight: 2,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tagBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 14,
        fontWeight: "500",
    },
    timestamp: {
        fontSize: 13,
        marginBottom: 24,
        opacity: 0.7,
    },
    contentText: {
        fontSize: 17,
        lineHeight: 30,
    },
    processedContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 32,
        paddingTop: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(0,0,0,0.1)",
    },
    processedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    processedText: {
        fontSize: 13,
        fontWeight: "500",
    },
    relatedSection: {
        marginTop: 40,
        paddingTop: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    relatedTitle: {
        marginBottom: 20,
    },
    relatedCard: {
        padding: 14,
        marginBottom: 10,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    relatedCardTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 6,
    },
    relatedCardPreview: {
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.7,
    },
})
