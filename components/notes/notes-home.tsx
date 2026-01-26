import { EmptyState } from "@/components/empty-state";
import { NotesFooter } from "@/components/notes/notes-footer";
import { NotesHeader } from "@/components/notes/notes-header";
import { NotesSearch } from "@/components/notes/notes-search";
import { NotesSearchHelper } from "@/components/notes/notes-search-helper";
import { SettingsNoteCounter } from "@/components/settings/settings-note-counter";
import { SwipeableNoteCard } from "@/components/swipeable-note-card";
import { Box } from "@/components/ui/box";
import { PageLoader } from "@/components/ui/page-loader";
import { useSelectionMode } from "@/hooks/use-selection-mode";
import { aiQueue } from "@/lib/ai";
import { useAI, useAILLM } from "@/lib/ai/provider";
import { archiveNote, getAllNotes, getTagsForNote, moveToTrash, type Note, type Tag } from "@/lib/database";
import { askNotesSearch } from "@/lib/search";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { ListIcon, SearchIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, FlatList, RefreshControl, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NoteWithTags extends Note {
    tags: Tag[];
}

export const NotesHome: React.FC = () => {
    const { colorScheme } = useColorScheme();
    const router = useRouter();
    const isDark = colorScheme === "dark";
    const { bottom } = useSafeAreaInsets();

    // Get AI models for search - use ref to avoid dependency issues
    const { embeddings } = useAI();
    const llm = useAILLM();
    const embeddingsRef = useRef(embeddings);
    const llmRef = useRef(llm);
    embeddingsRef.current = embeddings;
    llmRef.current = llm;

    const [notes, setNotes] = useState<NoteWithTags[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<NoteWithTags[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [temporalFilterDescription, setTemporalFilterDescription] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isUsingLLM, setIsUsingLLM] = useState(false);
    const [interpretedQuery, setInterpretedQuery] = useState<string | null>(null);
    const [processingNoteIds, setProcessingNoteIds] = useState<Set<string>>(new Set());

    // Selection mode
    const {
        isSelectionMode,
        selectedIds,
        selectedCount,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        isSelected,
    } = useSelectionMode();

    // Load notes with tags
    const loadNotes = useCallback(async () => {
        try {
            const allNotes = await getAllNotes();

            // Fetch tags for each note in parallel
            const notesWithTags = await Promise.all(
                allNotes.map(async (note) => {
                    const tags = await getTagsForNote(note.id);
                    return { ...note, tags };
                }),
            );

            setNotes(notesWithTags);
            setFilteredNotes(notesWithTags);
        } catch (error) {
            console.error("Failed to load notes:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Refresh notes when screen comes into focus (e.g., after restoring from archive/trash)
    useFocusEffect(
        useCallback(() => {
            loadNotes();
        }, [loadNotes]),
    );

    // Track AI processing queue
    useEffect(() => {
        const updateProcessingNotes = () => {
            const queueStatus = aiQueue.getStatus();
            const processingIds = new Set<string>();
            if (queueStatus.currentJobId) {
                processingIds.add(queueStatus.currentJobId);
            }
            setProcessingNoteIds(processingIds);
        };

        // Listen for processing complete events
        const handleProcessingComplete = (noteId: string) => {
            console.log(`📋 [Notes] AI processing completed for note: ${noteId.substring(0, 8)}...`);
            // Refresh notes to show updated tags/categories
            loadNotes();
            // Update processing status
            updateProcessingNotes();
        };

        // Register callback
        aiQueue.onProcessingComplete(handleProcessingComplete);

        // Update immediately
        updateProcessingNotes();

        // Check periodically for processing status
        const interval = (notes.length || filteredNotes.length) > 0 ? setInterval(updateProcessingNotes, 1000) : 0;

        return () => {
            if ((notes.length || filteredNotes.length) > 0) {
                clearInterval(interval);
            }
            aiQueue.removeProcessingCompleteCallback(handleProcessingComplete);
        };
    }, [loadNotes, notes, filteredNotes]);

    // Filter notes based on search query (using LLM-powered search when appropriate)
    // Use debounced search to prevent rapid re-renders
    const handleSearch = useCallback(async () => {
        if (searchQuery.trim() === "") {
            setFilteredNotes(notes);
            setTemporalFilterDescription(null);
            setIsSearching(false);
            setIsUsingLLM(false);
            setInterpretedQuery(null);
            return;
        }

        setIsSearching(true);
        setIsUsingLLM(false);
        setInterpretedQuery(null);

        // Debounce search
        try {
            console.log("🔍 [Search] Searching for:", searchQuery);

            // Use LLM-powered search if LLM is available
            const searchResult = await askNotesSearch(searchQuery, embeddingsRef.current, llmRef.current);
            const { results, temporalFilter, interpretedQuery: llmInterpretedQuery } = searchResult;

            console.log(`🔍 [Search] Found ${results.length} results`);
            console.log(`🤖 [Search] Interpreted query:`, llmInterpretedQuery);

            // Update UI state
            setTemporalFilterDescription(temporalFilter?.description || null);
            setIsUsingLLM(!!llmInterpretedQuery);
            setInterpretedQuery(llmInterpretedQuery || null);

            // Match results with notes to get tags
            const resultIds = new Set(results.map((r) => r.id));
            const filtered = notes.filter((note) => resultIds.has(note.id));
            // Sort by the search results order
            filtered.sort((a, b) => {
                const aIndex = results.findIndex((r) => r.id === a.id);
                const bIndex = results.findIndex((r) => r.id === b.id);
                return aIndex - bIndex;
            });
            setFilteredNotes(filtered);
        } catch (error) {
            console.error("❌ [Search] Search failed:", error);
            setTemporalFilterDescription(null);
            setIsUsingLLM(false);
            setInterpretedQuery(null);
            // Fallback to simple filtering
            const query = searchQuery.toLowerCase();
            const filtered = notes.filter(
                (note) =>
                    note.content.toLowerCase().includes(query) ||
                    (note.title && note.title.toLowerCase().includes(query)) ||
                    note.tags.some((tag) => tag.name.toLowerCase().includes(query)),
            );
            setFilteredNotes(filtered);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, notes]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadNotes();
    }, [loadNotes]);

    // Handle note press
    const handleNotePress = useCallback(
        (note: Note) => {
            router.push(`/notes/${note.id}` as any);
        },
        [router],
    );

    // Handle archive note
    const handleArchiveNote = useCallback(async (noteId: string) => {
        await archiveNote(noteId);
        // Remove from local state
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setFilteredNotes((prev) => prev.filter((n) => n.id !== noteId));
    }, []);

    // Handle trash note
    const handleTrashNote = useCallback(async (noteId: string) => {
        await moveToTrash(noteId);
        // Remove from local state
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        setFilteredNotes((prev) => prev.filter((n) => n.id !== noteId));
    }, []);

    // Handle settings
    const handleSettings = useCallback(() => {
        router.push("/settings");
    }, [router]);

    // Handle long press to enter selection mode
    const handleLongPress = useCallback(
        (note: Note) => {
            enterSelectionMode(note.id);
        },
        [enterSelectionMode],
    );

    // Handle toggle selection
    const handleToggleSelect = useCallback(
        (note: Note) => {
            toggleSelection(note.id);
        },
        [toggleSelection],
    );

    // Handle bulk delete selected notes
    const handleBulkDelete = useCallback(async () => {
        if (selectedCount === 0) return;

        Alert.alert(
            "Move to Recycle Bin",
            `Move ${selectedCount} note${selectedCount !== 1 ? "s" : ""} to recycle bin?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Move",
                    style: "default",
                    onPress: async () => {
                        for (const id of selectedIds) {
                            await moveToTrash(id);
                        }
                        setNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
                        setFilteredNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
                        exitSelectionMode();
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ],
        );
    }, [selectedCount, selectedIds, exitSelectionMode]);

    // Handle share selected notes
    const handleShareSelected = useCallback(async () => {
        if (selectedCount === 0) return;

        const selectedNotes = filteredNotes.filter((n) => selectedIds.has(n.id));
        const content = selectedNotes.map((n) => `${n.title || "Untitled"}\n${n.content}`).join("\n\n---\n\n");

        try {
            await Share.share({
                message: content,
                title: `${selectedCount} Note${selectedCount !== 1 ? "s" : ""} from Remen`,
            });
            exitSelectionMode();
        } catch (error) {
            console.error("Share failed:", error);
        }
    }, [selectedCount, selectedIds, filteredNotes, exitSelectionMode]);

    const renderNote = useCallback(
        ({ item }: { item: NoteWithTags }) => (
            <SwipeableNoteCard
                note={item}
                tags={item.tags}
                onPress={handleNotePress}
                onArchive={() => handleArchiveNote(item.id)}
                onTrash={() => handleTrashNote(item.id)}
                onLongPress={handleLongPress}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected(item.id)}
                onToggleSelect={handleToggleSelect}
                isProcessing={processingNoteIds.has(item.id)}
            />
        ),
        [
            handleNotePress,
            handleArchiveNote,
            handleTrashNote,
            handleLongPress,
            isSelectionMode,
            isSelected,
            handleToggleSelect,
            processingNoteIds,
        ],
    );

    // Key extractor
    const keyExtractor = useCallback((item: Note) => item.id, []);

    // Determine empty state props based on current state
    const getEmptyStateProps = useCallback(() => {
        // Show searching state while actively searching
        if (isSearching && searchQuery) {
            return {
                icon: <SearchIcon size={56} color={isDark ? "#39FF14" : "#00B700"} />,
                title: "AI is searching...",
                description: "Using intelligent search to find relevant notes",
            };
        }

        // Show no results state when search is complete but no matches
        if (searchQuery && !isSearching) {
            return {
                icon: <SearchIcon size={56} color={isDark ? "#444" : "#ccc"} />,
                title: "No notes found",
                description: "Try a different search term or time expression",
            };
        }

        // Show default empty state when no search and no notes
        return {
            icon: <ListIcon size={56} color={isDark ? "#444" : "#ccc"} />,
            title: "No notes yet",
            description: "Tap the + button to capture your first thought",
        };
    }, [isSearching, searchQuery, isDark]);

    // Render empty state with dynamic props
    const renderEmptyState = useCallback(() => {
        const emptyStateProps = getEmptyStateProps();
        return <EmptyState {...emptyStateProps} />;
    }, [getEmptyStateProps]);

    if (isLoading) {
        return <PageLoader />;
    }

    return (
        <Box className="flex-1">
            {/* Header - Normal or Selection Mode */}
            <NotesHeader
                isSelectionMode={isSelectionMode}
                exitSelectionMode={exitSelectionMode}
                selectedCount={selectedCount}
                handleShareSelected={handleShareSelected}
                handleBulkDelete={handleBulkDelete}
                handleSettings={handleSettings}
            />
            {/* Search Bar */}
            <NotesSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                isSearching={isSearching}
                isUsingLLM={isUsingLLM}
                refetchNotes={loadNotes}
            />

            {/* Helper text or AI interpretation */}
            <NotesSearchHelper
                interpretedQuery={interpretedQuery}
                temporalFilterDescription={temporalFilterDescription}
                searchQuery={searchQuery}
                isDark={isDark}
            />

            {/* Notes count */}
            <SettingsNoteCounter notes={filteredNotes} />

            {/* Notes List */}
            <FlatList
                data={filteredNotes}
                renderItem={renderNote}
                keyExtractor={keyExtractor}
                contentContainerClassName="flex-grow"
                contentContainerStyle={{ paddingBottom: bottom + 16 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={filteredNotes.length > 0 ? <NotesFooter /> : undefined}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={"grey"} />
                }
            />
        </Box>
    );
};
