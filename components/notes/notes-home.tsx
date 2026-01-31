import { EmptyState } from "@/components/empty-state";
import { NotesFooter } from "@/components/notes/notes-footer";
import { NotesHeader } from "@/components/notes/notes-header";
import { NotesSearch } from "@/components/notes/notes-search";
import { NotesSearchHelper } from "@/components/notes/notes-search-helper";
import { SwipeableNoteCard } from "@/components/notes/swipeable-note-card";
import { Box } from "@/components/ui/box";
import { PageLoader } from "@/components/ui/page-loader";
import { Text } from "@/components/ui/text";
import { useSelectionMode } from "@/hooks/use-selection-mode";
import { aiQueue } from "@/lib/ai";
import { useAI, useAILLM } from "@/lib/ai/provider";
import { archiveNote, getAllNotes, getTagsForNote, moveToTrash, pinNote, unpinNote } from "@/lib/database/database";
import { Note, Tag } from "@/lib/database/database.types";
import { askNotesSearch } from "@/lib/search/search";
import { useTheme } from "@/lib/theme/use-theme";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { ListIcon, SearchIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, LayoutAnimation, RefreshControl, SectionList, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NoteWithTags extends Note {
    tags: Tag[];
}

export const NotesHome: React.FC = () => {
    const { mutedIconColor, brandColor } = useTheme();
    const router = useRouter();
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
    const [sections, setSections] = useState<{ title: string; data: NoteWithTags[] }[]>([]);
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
        exitSelectionMode: originalExitSelectionMode,
        toggleSelection,
        isSelected,
    } = useSelectionMode();

    // Wrap exitSelectionMode with layout animation
    const exitSelectionMode = useCallback(() => {
        LayoutAnimation.configureNext({
            duration: 300,
            create: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
            update: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.scaleXY,
            },
        });
        originalExitSelectionMode();
    }, [originalExitSelectionMode]);

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
            // Organize notes into sections
            const pinnedNotes = notesWithTags.filter((note) => note.is_pinned);
            const unpinnedNotes = notesWithTags.filter((note) => !note.is_pinned);
            const newSections: { title: string; data: NoteWithTags[] }[] = [];
            if (pinnedNotes.length > 0) {
                newSections.push({ title: "Pinned items", data: pinnedNotes });
            }
            if (unpinnedNotes.length > 0) {
                newSections.push({ title: "Others", data: unpinnedNotes });
            }
            setSections(newSections);
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

        const handleProcessingComplete = (noteId: string) => {
            console.log(`📋 [Notes] AI processing completed for note: ${noteId.substring(0, 8)}...`);
            loadNotes();
            updateProcessingNotes();
        };

        aiQueue.onProcessingComplete(handleProcessingComplete);

        updateProcessingNotes();

        const interval = (notes.length || filteredNotes.length) > 0 ? setInterval(updateProcessingNotes, 1000) : 0;

        return () => {
            if ((notes.length || filteredNotes.length) > 0) {
                clearInterval(interval);
            }
            aiQueue.removeProcessingCompleteCallback(handleProcessingComplete);
        };
    }, [loadNotes, notes, filteredNotes]);

    const handleSearch = useCallback(async () => {
        if (searchQuery.trim() === "") {
            setFilteredNotes(notes);
            setTemporalFilterDescription(null);
            setIsSearching(false);
            setIsUsingLLM(false);
            setInterpretedQuery(null);
            const pinnedNotes = notes.filter((note) => note.is_pinned);
            const unpinnedNotes = notes.filter((note) => !note.is_pinned);
            const newSections: { title: string; data: NoteWithTags[] }[] = [];
            if (pinnedNotes.length > 0) {
                newSections.push({ title: "Pinned items", data: pinnedNotes });
            }
            if (unpinnedNotes.length > 0) {
                newSections.push({ title: "", data: unpinnedNotes });
            }
            setSections(newSections);
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
            // For search results, don't separate by pinned status
            const searchSections: { title: string; data: NoteWithTags[] }[] = [];
            if (filtered.length > 0) {
                searchSections.push({ title: "Search results", data: filtered });
            }
            setSections(searchSections);
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
            // For search results, don't separate by pinned status
            const searchSections: { title: string; data: NoteWithTags[] }[] = [];
            if (filtered.length > 0) {
                searchSections.push({ title: "Search results", data: filtered });
            }
            setSections(searchSections);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery, notes]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        setSearchQuery("");
        setTemporalFilterDescription(null);
        setInterpretedQuery(null);
        setIsSearching(false);
        setIsUsingLLM(false);
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
    const handleArchiveNote = useCallback(
        async (noteId: string) => {
            await archiveNote(noteId);
            // Remove from local state
            setNotes((prev) => prev.filter((n) => n.id !== noteId));
            setFilteredNotes((prev) => prev.filter((n) => n.id !== noteId));
            // Reload notes to update sections
            await loadNotes();
        },
        [loadNotes],
    );

    // Handle pin/unpin note
    const handlePinNote = useCallback(
        async (noteId: string) => {
            const note = notes.find((n) => n.id === noteId);
            if (!note) return;

            if (note.is_pinned) {
                await unpinNote(noteId);
            } else {
                await pinNote(noteId);
            }

            // Reload notes to reflect pin status and reordering
            await loadNotes();
        },
        [notes, loadNotes],
    );

    // Handle settings
    const handleSettings = useCallback(() => {
        router.push("/settings");
    }, [router]);

    // Handle long press to enter selection mode
    const handleLongPress = useCallback(
        (note: Note) => {
            LayoutAnimation.configureNext({
                duration: 300,
                create: {
                    type: LayoutAnimation.Types.easeInEaseOut,
                    property: LayoutAnimation.Properties.opacity,
                },
                update: {
                    type: LayoutAnimation.Types.easeInEaseOut,
                    property: LayoutAnimation.Properties.scaleXY,
                },
            });
            enterSelectionMode(note.id);
        },
        [enterSelectionMode],
    );

    // Handle toggle selection
    const handleToggleSelect = useCallback(
        (note: Note) => {
            LayoutAnimation.configureNext({
                duration: 200,
                create: {
                    type: LayoutAnimation.Types.easeInEaseOut,
                    property: LayoutAnimation.Properties.opacity,
                },
                update: {
                    type: LayoutAnimation.Types.easeInEaseOut,
                },
            });
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
                        setSections((prev) =>
                            prev.map((s) => ({ ...s, data: s.data.filter((n) => !selectedIds.has(n.id)) })),
                        );
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
                onPin={() => handlePinNote(item.id)}
                isPinned={item.is_pinned}
                onLongPress={handleLongPress}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected(item.id)}
                onToggleSelect={handleToggleSelect}
                isProcessing={processingNoteIds.has(item.id)}
                pageContext="notes"
            />
        ),
        [
            handleNotePress,
            handleArchiveNote,
            handlePinNote,
            handleLongPress,
            isSelectionMode,
            isSelected,
            handleToggleSelect,
            processingNoteIds,
        ],
    );

    const renderSectionHeader = useCallback(({ section }: { section: { title: string; data: NoteWithTags[] } }) => {
        return (
            <Box className="px-4 py-2">
                <Text className="text-sm font-medium text-typography-500">{section.title}</Text>
            </Box>
        );
    }, []);

    // Key extractor
    const keyExtractor = useCallback((item: Note) => item.id, []);

    const getEmptyStateProps = useCallback(() => {
        if (isSearching && searchQuery) {
            return {
                icon: <SearchIcon size={56} color={brandColor} />,
                title: "AI is searching...",
                description: "Using intelligent search to find relevant notes",
            };
        }

        // Show no results state when search is complete but no matches
        if (searchQuery && !isSearching) {
            return {
                icon: <SearchIcon size={56} color={mutedIconColor} />,
                title: "No notes found",
                description: "Try a different search term or time expression",
            };
        }

        return {
            icon: <ListIcon size={56} color={mutedIconColor} />,
            title: "No notes yet",
            description: "Tap the button to capture your first thought",
        };
    }, [isSearching, searchQuery, brandColor, mutedIconColor]);

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
                setInterpretedQuery={setInterpretedQuery}
                setTemporalFilterDescription={setTemporalFilterDescription}
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
            />

            {/* Notes count */}
            {/* <SettingsNoteCounter notes={filteredNotes} /> */}

            {/* Notes List */}
            <SectionList
                renderSectionHeader={renderSectionHeader}
                sections={sections}
                renderItem={renderNote}
                keyExtractor={keyExtractor}
                contentContainerClassName="flex-grow"
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                contentContainerStyle={{ paddingBottom: bottom + 16 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={filteredNotes.length > 0 ? <NotesFooter /> : undefined}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={"grey"} />
                }
                stickySectionHeadersEnabled={false}
            />
        </Box>
    );
};
