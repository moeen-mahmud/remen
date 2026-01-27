import { EmptyPage } from "@/components/empty-page";
import { SettingsNoteCounter } from "@/components/settings/settings-note-counter";
import { SwipeableNoteCard } from "@/components/swipeable-note-card";
import { Box } from "@/components/ui/box";
import { PageLoader } from "@/components/ui/page-loader";
import {
    deleteNote,
    emptyTrash,
    getTagsForNote,
    getTrashedNotes,
    restoreFromTrash,
    type Note,
    type Tag,
} from "@/lib/database";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Recycle } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl } from "react-native";

interface NoteWithTags extends Note {
    tags: Tag[];
}

export const TrashHome: React.FC = () => {
    const { colorScheme } = useColorScheme();
    const router = useRouter();
    const isDark = colorScheme === "dark";

    const [notes, setNotes] = useState<NoteWithTags[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadNotes = useCallback(async () => {
        try {
            const trashedNotes = await getTrashedNotes();

            const notesWithTags = await Promise.all(
                trashedNotes.map(async (note) => {
                    const tags = await getTagsForNote(note.id);
                    return { ...note, tags };
                }),
            );

            setNotes(notesWithTags);
        } catch (error) {
            console.error("Failed to load trashed notes:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleNotePress = useCallback(
        (note: Note) => {
            router.push(`/notes/${note.id}` as any);
        },
        [router],
    );

    const handleRestore = useCallback(async (noteId: string) => {
        await restoreFromTrash(noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }, []);

    const handlePermanentDelete = useCallback(async (noteId: string) => {
        await deleteNote(noteId);
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }, []);

    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadNotes();
    }, [loadNotes]);

    const handleEmptyTrash = useCallback(async () => {
        Alert.alert("Empty Recycle Bin", "This will permanently delete all notes. This cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Empty",
                style: "destructive",
                onPress: async () => {
                    await emptyTrash();
                    setNotes([]);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
            },
        ]);
    }, []);

    const renderNote = useCallback(
        ({ item }: { item: NoteWithTags }) => (
            <SwipeableNoteCard
                note={item}
                tags={item.tags}
                onPress={handleNotePress}
                onRestore={() => handleRestore(item.id)}
                onArchive={() => handlePermanentDelete(item.id)}
                pageContext="trash"
            />
        ),
        [handleNotePress, handleRestore, handlePermanentDelete],
    );

    const keyExtractor = useCallback((item: Note) => item.id, []);

    const renderEmptyState = () => (
        <EmptyPage
            icon={<Recycle size={56} color={isDark ? "#444" : "#ccc"} />}
            title="Recycle Bin is empty"
            description="Deleted notes will appear here"
        />
    );

    if (isLoading) {
        return <PageLoader />;
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
    );
};
