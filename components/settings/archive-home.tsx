import { EmptyPage } from "@/components/empty-page"
import { SettingsNoteCounter } from "@/components/settings/settings-note-counter"
import { SwipeableNoteCard } from "@/components/swipeable-note-card"
import { Box } from "@/components/ui/box"
import { PageLoader } from "@/components/ui/page-loader"
import { getArchivedNotes, getTagsForNote, moveToTrash, unarchiveNote, type Note, type Tag } from "@/lib/database"
import { useRouter } from "expo-router"
import { ArchiveIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { FlatList, RefreshControl } from "react-native"

interface NoteWithTags extends Note {
    tags: Tag[]
}

export const ArchivesHome: React.FC = () => {
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
        <EmptyPage
            icon={<ArchiveIcon size={56} color={isDark ? "#444" : "#ccc"} />}
            title="No archived notes"
            description="Notes you archive will appear here"
        />
    )

    if (isLoading) {
        return <PageLoader />
    }

    return (
        <Box className="flex-1">
            {/* Count */}
            <SettingsNoteCounter notes={notes} />

            {/* Notes List */}
            <FlatList
                data={notes}
                renderItem={renderNote}
                keyExtractor={keyExtractor}
                contentContainerClassName="flex-1"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={"grey"} />
                }
            />
        </Box>
    )
}
