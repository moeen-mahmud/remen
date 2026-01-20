import { NoteCard } from "@/components/note-card"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { getAllNotes, type Note } from "@/lib/database"
import { searchNotes as hybridSearch } from "@/lib/search"
import { useRouter } from "expo-router"
import { PlusIcon, SearchIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function NotesListScreen() {
    const { top } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [notes, setNotes] = useState<Note[]>([])
    const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Load notes
    const loadNotes = useCallback(async () => {
        try {
            const allNotes = await getAllNotes()
            setNotes(allNotes)
            setFilteredNotes(allNotes)
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
                    setFilteredNotes(results)
                } catch (error) {
                    console.error("Search failed:", error)
                    // Fallback to simple filtering
                    const query = searchQuery.toLowerCase()
                    const filtered = notes.filter(
                        (note) =>
                            note.content.toLowerCase().includes(query) ||
                            (note.title && note.title.toLowerCase().includes(query)),
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
        ({ item }: { item: Note }) => <NoteCard note={item} onPress={handleNotePress} />,
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
                    placeholder="Search notes..."
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
                contentContainerStyle={styles.listContent}
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
        paddingVertical: 12,
    },
    newNoteButton: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        padding: 0,
    },
    countContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    countText: {
        fontSize: 13,
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
        paddingHorizontal: 32,
    },
    emptyStateEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyStateTitle: {
        marginBottom: 8,
        textAlign: "center",
    },
    emptyStateText: {
        textAlign: "center",
        fontSize: 15,
        lineHeight: 22,
    },
})
