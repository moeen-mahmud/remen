import { detectUrls, LinkCard } from "@/components/notes/link-card";
import { getNoteTypeIcon, NoteTagBadge, NoteTypeBadge } from "@/components/notes/note-badges";
import { NoteDetailsProcessing } from "@/components/notes/note-details-processing";
import { NoteDetailsTimestamp } from "@/components/notes/note-details-timestamp";
import { noteDetailsStyles as styles } from "@/components/notes/note.styles";
import { NotesTitle } from "@/components/notes/notes-title";
import { RelatedNoteCard } from "@/components/notes/related-note-card";
import { ReminderPicker } from "@/components/notes/reminder-picker";
import { TaskItem } from "@/components/notes/task-item";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { PageLoader } from "@/components/ui/page-loader";
import { Text } from "@/components/ui/text";
import { getNoteTypeBadge } from "@/lib/ai/classify";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { getNoteById, getTagsForNote, updateNote } from "@/lib/database/database";
import { Note, Tag } from "@/lib/database/database.types";
import { findRelatedNotes } from "@/lib/search/search";
import { SearchResult } from "@/lib/search/search.types";
import { parseTasksFromText, toggleTaskInText } from "@/lib/tasks/tasks";
import { useTheme } from "@/lib/theme/use-theme";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const NoteDetails: React.FC<{ id: string }> = ({ id }) => {
    const router = useRouter();
    const { bottom } = useSafeAreaInsets();
    const { backgroundColor } = useTheme();
    // Get AI embeddings model - use ref to avoid dependency issues
    const { embeddings } = useAI();
    const embeddingsRef = useRef(embeddings);
    embeddingsRef.current = embeddings;

    const [note, setNote] = useState<Note | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [relatedNotes, setRelatedNotes] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingThisNote, setIsProcessingThisNote] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editingTitle, setEditingTitle] = useState("");
    const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
    const [parsedTasks, setParsedTasks] = useState<ReturnType<typeof parseTasksFromText>>([]);

    // Load note - don't depend on embeddings to avoid infinite loops
    const loadNote = useCallback(async () => {
        if (!id) return;

        setIsLoading(true);
        try {
            const fetchedNote = await getNoteById(id);
            if (fetchedNote) {
                setNote(fetchedNote);

                const fetchedTags = await getTagsForNote(id);
                setTags(fetchedTags);

                // Load related notes in background (using embeddings ref)
                findRelatedNotes(id, embeddingsRef.current, 3).then(setRelatedNotes).catch(console.error);

                // Detect URLs in content
                const urls = detectUrls(fetchedNote.content);
                setDetectedUrls(urls);

                // Parse tasks from content
                const tasks = parseTasksFromText(fetchedNote.content);
                setParsedTasks(tasks);
            }
        } catch (error) {
            console.error("Failed to load note:", error);
        } finally {
            setIsLoading(false);
        }
    }, [id]); // Only depend on id, not embeddings

    // Reload note when screen comes into focus (after editing)
    useFocusEffect(
        useCallback(() => {
            loadNote();
        }, [loadNote]),
    );

    // Track AI processing status for this specific note
    useEffect(() => {
        const updateProcessingStatus = () => {
            if (!id) return;
            const queueStatus = aiQueue.getStatus();
            setIsProcessingThisNote(queueStatus.currentJobId === id);
        };

        const handleProcessingComplete = (processedNoteId: string) => {
            if (processedNoteId === id) {
                console.log(`📋 [NoteDetail] AI processing completed for current note: ${processedNoteId}`);
                // Refresh note data to show updated tags/categories
                loadNote();
                // Update processing status
                updateProcessingStatus();
            }
        };

        // Register callback for processing completion
        aiQueue.onProcessingComplete(handleProcessingComplete);

        // Update immediately
        updateProcessingStatus();

        // Check periodically for processing status changes
        const interval = setInterval(updateProcessingStatus, 1000);

        return () => {
            clearInterval(interval);
            aiQueue.removeProcessingCompleteCallback(handleProcessingComplete);
        };
    }, [id, loadNote]);

    // Handle related note press
    const handleRelatedNotePress = useCallback(
        (relatedNote: Note) => {
            router.push(`/notes/${relatedNote.id}` as any);
        },
        [router],
    );

    // Handle back
    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    // Handle edit - navigate to edit screen
    const handleEdit = useCallback(() => {
        if (!id) return;
        router.push(`/edit/${id}` as any);
    }, [id, router]);

    // Handle title editing
    const handleTitlePress = useCallback(() => {
        if (isProcessingThisNote) {
            Alert.alert("Processing", "AI is still processing this note. Please wait for it to complete.", [
                { text: "OK", onPress: () => {} },
            ]);
        }
        setEditingTitle(note?.title || "");
        setIsEditingTitle(true);
    }, [note?.title, isProcessingThisNote]);

    const handleTitleSave = useCallback(async () => {
        if (!note || isProcessingThisNote) return;

        try {
            // Allow empty titles to clear the title
            const trimmedTitle = editingTitle.trim();
            await updateNote(note.id, { title: trimmedTitle || null });
            setNote({ ...note, title: trimmedTitle || null });
            setIsEditingTitle(false);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.error("Failed to update note title:", error);
            Alert.alert("Error", "Failed to update title");
        }
    }, [note, editingTitle, isProcessingThisNote]);

    const handleTitleClear = useCallback(() => {
        setEditingTitle("");
    }, []);

    const handleReorganizeWithAI = useCallback(() => {
        if (!note || isProcessingThisNote) return;

        Alert.alert(
            "Re-organize with AI",
            "This will regenerate the note’s title, type, tags, and embedding. Your note content won’t change.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Re-organize",
                    style: "default",
                    onPress: async () => {
                        try {
                            await updateNote(note.id, { is_processed: false, ai_status: "queued", ai_error: null });
                            aiQueue.add({ noteId: note.id, content: note.content });
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            loadNote();
                        } catch (error) {
                            console.error("Failed to queue AI reorganize:", error);
                            Alert.alert("Error", "Failed to start AI re-organization");
                        }
                    },
                },
            ],
        );
    }, [note, isProcessingThisNote, loadNote]);

    // Handle task toggle
    const handleTaskToggle = useCallback(
        async (taskLineIndex: number) => {
            if (!note) return;

            try {
                const updatedContent = toggleTaskInText(note.content, taskLineIndex);
                await updateNote(note.id, { content: updatedContent });
                setNote({ ...note, content: updatedContent });

                // Update parsed tasks
                const tasks = parseTasksFromText(updatedContent);
                setParsedTasks(tasks);

                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch (error) {
                console.error("Failed to toggle task:", error);
            }
        },
        [note],
    );

    const taskLineIndices = () => {
        if (!note) return null;
        const taskLineIndices = new Set(parsedTasks.map((t) => t.lineIndex));
        const contentLines = note.content.split("\n");
        const filteredContent = contentLines
            .map((line, index) => (taskLineIndices.has(index) ? "" : line))
            .join("\n")
            .trim();

        return filteredContent ? (
            <Pressable className="px-4" onPress={handleEdit}>
                <Text className="text-lg text-typography-900 dark:text-typography-0">{filteredContent}</Text>
            </Pressable>
        ) : null;
    };

    if (isLoading) {
        return <PageLoader />;
    }

    if (!note) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: backgroundColor }]}>
                <Button onPress={handleBack} variant="outline" size="sm">
                    <ButtonText>Go back</ButtonText>
                </Button>
            </View>
        );
    }

    const typeBadge = getNoteTypeBadge(note.type);
    const typeIcon = getNoteTypeIcon(note.type, typeBadge.color);

    return (
        <Box className="flex-1">
            <ScrollView
                contentContainerStyle={{ paddingBottom: bottom + 16 }}
                contentContainerClassName="flex-grow"
                className="flex-1"
                showsVerticalScrollIndicator={false}
            >
                {/* Original image for scan notes */}
                {note.type === "scan" && note.original_image ? (
                    <Box className="dark:bg-neutral-900 bg-neutral-200" style={styles.imageContainer}>
                        <Image source={{ uri: note.original_image }} style={styles.scanImage} />
                    </Box>
                ) : null}

                {/* Title */}
                <NotesTitle
                    isEditingTitle={isEditingTitle}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    handleTitleSave={handleTitleSave}
                    handleTitleClear={handleTitleClear}
                    handleTitlePress={handleTitlePress}
                    note={note}
                />

                {/* Reminder */}
                {note && (
                    <Box className="px-4 mb-4">
                        <ReminderPicker
                            noteId={note.id}
                            currentReminder={note.reminder_at}
                            onReminderSet={(reminderAt) => {
                                if (note) {
                                    setNote({ ...note, reminder_at: reminderAt });
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Unified Type + Tags Row */}
                <Box className="flex-row flex-wrap gap-2 items-center px-4 mb-4">
                    {/* Type badge */}
                    <NoteTypeBadge typeBadge={typeBadge} typeIcon={typeIcon} />

                    {/* Tags */}
                    {tags.map((tag) => (
                        <NoteTagBadge key={tag.id} id={tag.id} name={tag.name} is_auto={tag.is_auto} />
                    ))}
                </Box>

                {/* Timestamp and processing status */}
                <Box className="flex-col justify-start items-start px-4 mb-4">
                    <NoteDetailsTimestamp createdAt={note.created_at} />
                    {(note.is_processed ||
                        isProcessingThisNote ||
                        note.ai_status === "queued" ||
                        note.ai_status === "failed" ||
                        note.ai_status === "cancelled") && (
                        <NoteDetailsProcessing
                            isProcessingThisNote={isProcessingThisNote}
                            aiStatus={note.ai_status}
                            handleReorganizeWithAI={handleReorganizeWithAI}
                        />
                    )}
                </Box>

                <Divider className="mb-4" />

                {/* Tasks Section */}
                {parsedTasks.length > 0 && (
                    <Box className="px-4 mb-4">
                        <Text className="mb-2 text-sm font-medium text-typography-500">TASKS</Text>
                        {parsedTasks.map((task, index) => (
                            <TaskItem
                                key={`task-${task.lineIndex}-${index}`}
                                content={task.content}
                                isCompleted={task.isCompleted}
                                indent={task.indent}
                                onToggle={() => handleTaskToggle(task.lineIndex)}
                            />
                        ))}
                    </Box>
                )}

                {/* Content - filter out task lines to avoid duplication */}
                {taskLineIndices && taskLineIndices()}

                {/* Link Cards - Only shown when viewing, not editing */}
                {detectedUrls.length > 0 && (
                    <Box className="px-4 mt-4">
                        <Text className="mb-2 text-sm font-medium text-typography-500">LINKS</Text>
                        {detectedUrls.map((url, index) => (
                            <LinkCard key={`${url}-${index}`} url={url} />
                        ))}
                    </Box>
                )}

                {/* Related Notes */}
                {relatedNotes.length > 0 && (
                    <RelatedNoteCard relatedNotes={relatedNotes} handleRelatedNotePress={handleRelatedNotePress} />
                )}
            </ScrollView>
        </Box>
    );
};
