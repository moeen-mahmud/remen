import { NoteCard } from "@/components/note-card"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { getAllNotes, getTagsForNote, type Note, type Tag } from "@/lib/database"
import { searchNotes as hybridSearch } from "@/lib/search"
import { useRouter } from "expo-router"
import { PlusIcon, SearchIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface NoteWithTags extends Note {
    tags: Tag[]
}

export default function NotesListScreen() {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [notes, setNotes] = useState<NoteWithTags[]>([])
    const [filteredNotes, setFilteredNotes] = useState<NoteWithTags[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Load notes with tags
    const loadNotes = useCallback(async () => {
        try {
            const allNotes = await getAllNotes()

            // Fetch tags for each note in parallel
            const notesWithTags = await Promise.all(
                allNotes.map(async (note) => {
                    const tags = await getTagsForNote(note.id)
                    return { ...note, tags }
                }),
            )

            setNotes(notesWithTags)
            setFilteredNotes(notesWithTags)
        } catch (error) {
            console.error("Failed to load notes:", error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }, [])

    // Initial load
    useEffect(() => {
        loadNotes()
    }, [loadNotes])

    // Filter notes based on search query (using hybrid search)
    useEffect(() => {
        const performSearch = async () => {
            if (searchQuery.trim() === "") {
                setFilteredNotes(notes)
            } else {
                try {
                    // Use hybrid semantic + keyword search
                    const results = await hybridSearch(searchQuery)
                    // Match results with notes to get tags
                    const resultIds = new Set(results.map((r) => r.id))
                    const filtered = notes.filter((note) => resultIds.has(note.id))
                    // Sort by the search results order
                    filtered.sort((a, b) => {
                        const aIndex = results.findIndex((r) => r.id === a.id)
                        const bIndex = results.findIndex((r) => r.id === b.id)
                        return aIndex - bIndex
                    })
                    setFilteredNotes(filtered)
                } catch (error) {
                    console.error("Search failed:", error)
                    // Fallback to simple filtering
                    const query = searchQuery.toLowerCase()
                    const filtered = notes.filter(
                        (note) =>
                            note.content.toLowerCase().includes(query) ||
                            (note.title && note.title.toLowerCase().includes(query)) ||
                            note.tags.some((tag) => tag.name.toLowerCase().includes(query)),
                    )
                    setFilteredNotes(filtered)
                }
            }
        }
        performSearch()
    }, [searchQuery, notes])

    // Handle refresh
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true)
        loadNotes()
    }, [loadNotes])

    // Handle note press
    const handleNotePress = useCallback(
        (note: Note) => {
            router.push(`/notes/${note.id}` as any)
        },
        [router],
    )

    // Handle new note
    const handleNewNote = useCallback(() => {
        router.push("/")
    }, [router])

    // Render note item
    const renderNote = useCallback(
        ({ item }: { item: NoteWithTags }) => <NoteCard note={item} tags={item.tags} onPress={handleNotePress} />,
        [handleNotePress],
    )

    // Key extractor
    const keyExtractor = useCallback((item: Note) => item.id, [])

    // Empty state
    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={[styles.emptyStateEmoji]}>📝</Text>
            <Heading size="md" style={[styles.emptyStateTitle, { color: isDark ? "#fff" : "#000" }]}>
                {searchQuery ? "No notes found" : "No notes yet"}
            </Heading>
            <Text style={[styles.emptyStateText, { color: isDark ? "#888" : "#666" }]}>
                {searchQuery ? "Try a different search term" : "Tap the + button to capture your first thought"}
            </Text>
        </View>
    )

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
            </View>
        )
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff", paddingTop: top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Heading size="2xl" style={{ color: isDark ? "#fff" : "#000" }}>
                    Notes
                </Heading>
                <Pressable onPress={handleNewNote} style={styles.newNoteButton}>
                    <PlusIcon size={24} color={isDark ? "#fff" : "#000"} />
                </Pressable>
            </View>

            {/* Search Bar */}
            <View
                style={[
                    styles.searchContainer,
                    {
                        backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                        borderColor: isDark ? "#333" : "#e5e5e5",
                    },
                ]}
            >
                <SearchIcon size={18} color={isDark ? "#888" : "#666"} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: isDark ? "#fff" : "#000" }]}
                    placeholder="What are you looking for?"
                    placeholderTextColor={isDark ? "#888" : "#999"}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            {/* Notes count */}
            <View style={styles.countContainer}>
                <Text style={[styles.countText, { color: isDark ? "#888" : "#666" }]}>
                    {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
                </Text>
            </View>

            {/* Notes List */}
            <FlatList
                data={filteredNotes}
                renderItem={renderNote}
                keyExtractor={keyExtractor}
                contentContainerStyle={[styles.listContent, { paddingBottom: bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={
                    filteredNotes.length > 0 ? (
                        <View style={styles.listFooter}>
                            <Text style={[styles.listFooterText, { color: isDark ? "#888" : "#666" }]}>
                                You&apos;re all caught up!
                            </Text>
                        </View>
                    ) : undefined
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={isDark ? "#fff" : "#000"}
                    />
                }
            />
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
        paddingTop: 8,
        paddingBottom: 16,
    },
    newNoteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 14,
        height: 44,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        padding: 0,
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
        paddingHorizontal: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyStateEmoji: {
        fontSize: 56,
        marginBottom: 20,
    },
    emptyStateTitle: {
        marginBottom: 8,
        textAlign: "center",
    },
    emptyStateText: {
        textAlign: "center",
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.7,
    },
    listFooter: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    listFooterText: {
        textAlign: "center",
        fontSize: 14,
    },
})
