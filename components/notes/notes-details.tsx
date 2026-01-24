import { NotesTitle } from "@/components/notes/notes-title"
import { Box } from "@/components/ui/box"
import { Divider } from "@/components/ui/divider"
import { Heading } from "@/components/ui/heading"
import { PageLoader } from "@/components/ui/page-loader"
import { Spinner } from "@/components/ui/spinner"
import { Text } from "@/components/ui/text"
import { getNoteTypeBadge } from "@/lib/ai/classify"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { getNoteById, getTagsForNote, moveToTrash, updateNote, type Note, type Tag } from "@/lib/database"
import { findRelatedNotes, type SearchResult } from "@/lib/search"
import * as Haptics from "expo-haptics"
import { Image } from "expo-image"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { MicIcon, ScanIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native"

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

export const NoteDetails: React.FC = () => {
    const { id } = useLocalSearchParams<{ id: string }>()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    // Get AI embeddings model - use ref to avoid dependency issues
    const { embeddings } = useAI()
    const embeddingsRef = useRef(embeddings)
    embeddingsRef.current = embeddings

    const [note, setNote] = useState<Note | null>(null)
    const [tags, setTags] = useState<Tag[]>([])
    const [relatedNotes, setRelatedNotes] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isProcessingThisNote, setIsProcessingThisNote] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editingTitle, setEditingTitle] = useState("")

    // Load note - don't depend on embeddings to avoid infinite loops
    const loadNote = useCallback(async () => {
        if (!id) return

        setIsLoading(true)
        try {
            const fetchedNote = await getNoteById(id)
            if (fetchedNote) {
                setNote(fetchedNote)

                const fetchedTags = await getTagsForNote(id)
                setTags(fetchedTags)

                // Load related notes in background (using embeddings ref)
                findRelatedNotes(id, embeddingsRef.current, 3).then(setRelatedNotes).catch(console.error)
            }
        } catch (error) {
            console.error("Failed to load note:", error)
        } finally {
            setIsLoading(false)
        }
    }, [id]) // Only depend on id, not embeddings

    // Reload note when screen comes into focus (after editing)
    useFocusEffect(
        useCallback(() => {
            loadNote()
        }, [loadNote]),
    )

    // Track AI processing status for this specific note
    useEffect(() => {
        const updateProcessingStatus = () => {
            if (!id) return
            const queueStatus = aiQueue.getStatus()
            setIsProcessingThisNote(queueStatus.currentJobId === id)
        }

        const handleProcessingComplete = (processedNoteId: string) => {
            if (processedNoteId === id) {
                console.log(`📋 [NoteDetail] AI processing completed for current note: ${processedNoteId}`)
                // Refresh note data to show updated tags/categories
                loadNote()
                // Update processing status
                updateProcessingStatus()
            }
        }

        // Register callback for processing completion
        aiQueue.onProcessingComplete(handleProcessingComplete)

        // Update immediately
        updateProcessingStatus()

        // Check periodically for processing status changes
        const interval = setInterval(updateProcessingStatus, 1000)

        return () => {
            clearInterval(interval)
            aiQueue.removeProcessingCompleteCallback(handleProcessingComplete)
        }
    }, [id, loadNote])

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

    // Handle title editing
    const handleTitlePress = useCallback(() => {
        if (isProcessingThisNote) {
            Alert.alert("Processing", "AI is still processing this note. Please wait for it to complete.", [
                { text: "OK", onPress: () => {} },
            ])
        }
        setEditingTitle(note?.title || "")
        setIsEditingTitle(true)
    }, [note?.title, isProcessingThisNote])

    const handleTitleSave = useCallback(async () => {
        if (!note || !editingTitle.trim() || isProcessingThisNote) return

        try {
            const trimmedTitle = editingTitle.trim()
            await updateNote(note.id, { title: trimmedTitle })
            setNote({ ...note, title: trimmedTitle })
            setIsEditingTitle(false)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } catch (error) {
            console.error("Failed to update note title:", error)
            Alert.alert("Error", "Failed to update title")
        }
    }, [note, editingTitle, isProcessingThisNote])

    const handleTitleCancel = useCallback(() => {
        setIsEditingTitle(false)
        setEditingTitle(note?.title || "")
    }, [note?.title])

    if (isLoading) {
        return <PageLoader />
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
        <Box className="flex-grow">
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Original image for scan notes */}
                {note.type === "scan" && note.original_image ? (
                    <Box className="px-4 dark:bg-neutral-900 bg-neutral-200" style={styles.imageContainer}>
                        <Image source={{ uri: note.original_image }} style={styles.scanImage} />
                    </Box>
                ) : null}

                {/* Title */}
                <NotesTitle
                    isEditingTitle={isEditingTitle}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    handleTitleSave={handleTitleSave}
                    handleTitleCancel={handleTitleCancel}
                    handleTitlePress={handleTitlePress}
                    note={note}
                />

                {/* Unified Type + Tags Row */}
                <Box className="flex-row flex-wrap gap-2 items-center px-4 mb-4">
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

                {/* Timestamp */}
                <Box className="px-4 mb-4">
                    <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatFullDate(note.created_at)}
                    </Text>
                </Box>

                <Divider className="mb-4" />

                {/* Content */}
                <Pressable className="px-4" onPress={handleEdit}>
                    <Text className="text-lg text-typography-900 dark:text-typography-0">{note.content}</Text>
                </Pressable>

                {/* Processing status */}
                {(note.is_processed || isProcessingThisNote) && (
                    <Box className="flex-row items-center px-4 pt-6 mt-8 border-t border-neutral-200 dark:border-neutral-900">
                        {isProcessingThisNote ? (
                            <>
                                <Spinner className="mr-2" size="small" color="grey" />
                                <Text className="text-sm text-success-500">AI organizing...</Text>
                            </>
                        ) : (
                            <>
                                <Box className="mr-2 w-2 h-2 rounded-full bg-success-500" />
                                <Text className="text-sm text-neutral-500 dark:text-neutral-400">AI organized</Text>
                            </>
                        )}
                    </Box>
                )}

                {/* Related Notes */}
                {relatedNotes.length > 0 && (
                    <Box
                        className="px-4 border-t border-neutral-200 dark:border-neutral-900"
                        style={[styles.relatedSection, { borderTopColor: isDark ? "#333" : "#e5e5e5" }]}
                    >
                        <Heading className="mb-4 text-lg text-typography-900 dark:text-typography-0" size="sm">
                            Related Notes
                        </Heading>
                        {relatedNotes?.map((relatedNote) => (
                            <Pressable
                                key={relatedNote.id}
                                onPress={() => handleRelatedNotePress(relatedNote)}
                                className="p-4 mb-4 rounded-lg border border-neutral-200 dark:border-neutral-900"
                            >
                                <Text
                                    className="text-lg font-semibold text-typography-900 dark:text-typography-0"
                                    numberOfLines={1}
                                >
                                    {relatedNote.title || relatedNote.content.substring(0, 50)}
                                </Text>
                                <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
                                    {relatedNote.content.substring(0, 100)}
                                </Text>
                            </Pressable>
                        ))}
                    </Box>
                )}
            </ScrollView>
        </Box>
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
        resizeMode: "contain",
        aspectRatio: 16 / 9,
        borderRadius: 16,
    },
    titleContainer: {
        marginBottom: 16,
    },
    titlePressable: {
        alignItems: "flex-start",
    },
    title: {
        lineHeight: 40,
        textAlign: "left",
    },
    titleHint: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.7,
    },
    titleEditContainer: {
        alignItems: "flex-start",
    },
    titleInput: {
        // fontWeight: "bold",
        // textAlign: "left",
        // minWidth: "100%",
        // paddingVertical: 8,
        // paddingHorizontal: 16,
        // borderRadius: 8,
        // borderWidth: 1,
        // borderColor: "#39FF14",
        // backgroundColor: "rgba(57, 255, 20, 0.1)",
    },
    titleActions: {
        flexDirection: "row",
        gap: 16,
        marginTop: 12,
    },
    titleActionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    titleActionText: {
        fontSize: 14,
        fontWeight: "600",
    },
    titlePlaceholder: {
        alignItems: "center",
        paddingVertical: 16,
    },
    titlePlaceholderText: {
        fontSize: 20,
        fontStyle: "italic",
        opacity: 0.7,
    },
    badgesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
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
    processingIndicator: {
        marginRight: 10,
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
