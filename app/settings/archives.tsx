import { SwipeableNoteCard } from "@/components/swipeable-note-card"
import { Box } from "@/components/ui/box"
import { Heading } from "@/components/ui/heading"
import { PageLoader } from "@/components/ui/page-loader"
import { Text } from "@/components/ui/text"
import { getArchivedNotes, getTagsForNote, moveToTrash, unarchiveNote, type Note, type Tag } from "@/lib/database"
import { useRouter } from "expo-router"
import { ArchiveIcon, ArrowLeftIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface NoteWithTags extends Note {
    tags: Tag[]
}

export default function ArchivesScreen() {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [notes, setNotes] = useState<NoteWithTags[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const loadNotes = useCallback(async () => {
        try {
            const archivedNotes = await getArchivedNotes()

            const notesWithTags = await Promise.all(
                archivedNotes.map(async (note) => {
                    const tags = await getTagsForNote(note.id)
                    return { ...note, tags }
                }),
            )

            setNotes(notesWithTags)
        } catch (error) {
            console.error("Failed to load archived notes:", error)
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
        await unarchiveNote(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }, [])

    const handleTrash = useCallback(async (noteId: string) => {
        await moveToTrash(noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
    }, [])

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true)
        loadNotes()
    }, [loadNotes])

    const renderNote = useCallback(
        ({ item }: { item: NoteWithTags }) => (
            <SwipeableNoteCard
                note={item}
                tags={item.tags}
                onPress={handleNotePress}
                onRestore={() => handleRestore(item.id)}
                onTrash={() => handleTrash(item.id)}
                isArchived={true}
            />
        ),
        [handleNotePress, handleRestore, handleTrash],
    )

    const keyExtractor = useCallback((item: Note) => item.id, [])

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <ArchiveIcon size={56} color={isDark ? "#444" : "#ccc"} />
            <Heading size="md" style={[styles.emptyStateTitle, { color: isDark ? "#fff" : "#000" }]}>
                No archived notes
            </Heading>
            <Text style={[styles.emptyStateText, { color: isDark ? "#888" : "#666" }]}>
                Notes you archive will appear here
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
                <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#000" }]}>Archives</Text>
                <View style={styles.backButton} />
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
