import { SwipeableNoteCard } from "@/components/swipeable-note-card"
import { Box } from "@/components/ui/box"
import { Heading } from "@/components/ui/heading"
import { PageLoader } from "@/components/ui/page-loader"
import { Text } from "@/components/ui/text"
import {
    deleteNote,
    emptyTrash,
    getTagsForNote,
    getTrashedNotes,
    restoreFromTrash,
    type Note,
    type Tag,
} from "@/lib/database"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { ArrowLeftIcon, Trash2Icon, TrashIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface NoteWithTags extends Note {
    tags: Tag[]
}

export default function TrashScreen() {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [notes, setNotes] = useState<NoteWithTags[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const loadNotes = useCallback(async () => {
        try {
            const trashedNotes = await getTrashedNotes()

            const notesWithTags = await Promise.all(
                trashedNotes.map(async (note) => {
                    const tags = await getTagsForNote(note.id)
                    return { ...note, tags }
                }),
            )

            setNotes(notesWithTags)
        } catch (error) {
            console.error("Failed to load trashed notes:", error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadNotes()
    }, [loadNotes])

    const handleBack = useCallback(() => {
        router.back()
    }, [router])

    const handleNotePress = useCallback(
        (note: Note) => {
            router.push(`/notes/${note.id}` as any)
        },
        [router],
    )

    const handleRestore = useCallback(async (noteId: string) => {
        await restoreFromTrash(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }, [])

    const handlePermanentDelete = useCallback(async (noteId: string) => {
        await deleteNote(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }, [])

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true)
        loadNotes()
    }, [loadNotes])

    const handleEmptyTrash = useCallback(async () => {
        Alert.alert("Empty Recycle Bin", "This will permanently delete all notes. This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Empty",
                style: "destructive",
                onPress: async () => {
                    await emptyTrash()
                    setNotes([])
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                },
            },
        ])
    }, [])

    const renderNote = useCallback(
        ({ item }: { item: NoteWithTags }) => (
            <SwipeableNoteCard
                note={item}
                tags={item.tags}
                onPress={handleNotePress}
                onRestore={() => handleRestore(item.id)}
                onArchive={() => handlePermanentDelete(item.id)}
                isTrashed={true}
            />
        ),
        [handleNotePress, handleRestore, handlePermanentDelete],
    )

    const keyExtractor = useCallback((item: Note) => item.id, [])

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Trash2Icon size={56} color={isDark ? "#444" : "#ccc"} />
            <Heading size="md" style={[styles.emptyStateTitle, { color: isDark ? "#fff" : "#000" }]}>
                Recycle bin is empty
            </Heading>
            <Text style={[styles.emptyStateText, { color: isDark ? "#888" : "#666" }]}>
                Deleted notes will appear here
            </Text>
        </View>
    )

    if (isLoading) {
        return <PageLoader />
    }

    return (
        <Box className="flex-1 bg-background-50" style={{ paddingTop: top }}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <ArrowLeftIcon size={22} color={isDark ? "#fff" : "#000"} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#000" }]}>Recycle Bin</Text>
                {notes.length > 0 ? (
                    <Pressable onPress={handleEmptyTrash} style={styles.backButton}>
                        <TrashIcon size={20} color={isDark ? "#E7000B" : "#F9423C"} />
                    </Pressable>
                ) : (
                    <View style={styles.backButton} />
                )}
            </View>

            {/* Count */}
            <View style={styles.countContainer}>
                <Text style={[styles.countText, { color: isDark ? "#888" : "#666" }]}>
                    {notes.length} {notes.length === 1 ? "note" : "notes"}
                </Text>
            </View>

            {/* Notes List */}
            <FlatList
                data={notes}
                renderItem={renderNote}
                keyExtractor={keyExtractor}
                contentContainerStyle={[styles.listContent, { paddingBottom: bottom + 40 }]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={isDark ? "#fff" : "#000"}
                    />
                }
            />
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
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    countContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    countText: {
        fontSize: 12,
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    listContent: {
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyStateTitle: {
        marginTop: 20,
        marginBottom: 8,
        textAlign: "center",
    },
    emptyStateText: {
        textAlign: "center",
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.7,
    },
})
