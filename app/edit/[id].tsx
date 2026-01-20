import { LinkModal } from "@/components/rich-editor/link-modal"
import { Toolbar } from "@/components/rich-editor/toolbar"
import { Box } from "@/components/ui/box"
import { aiQueue } from "@/lib/ai/queue"
import { getNoteById, updateNote } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeftIcon, CheckCircleIcon, Loader2Icon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type HtmlStyle,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnLinkDetected,
} from "react-native-enriched"
import { KeyboardAvoidingView, KeyboardController, useKeyboardState } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type StylesState = OnChangeStateEvent
type CurrentLinkState = OnLinkDetected

interface Selection {
    start: number
    end: number
    text: string
}

const DEFAULT_STYLE_STATE = {
    isActive: false,
    isConflicting: false,
    isBlocking: false,
}

const DEFAULT_STYLES: StylesState = {
    bold: DEFAULT_STYLE_STATE,
    italic: DEFAULT_STYLE_STATE,
    underline: DEFAULT_STYLE_STATE,
    strikeThrough: DEFAULT_STYLE_STATE,
    inlineCode: DEFAULT_STYLE_STATE,
    h1: DEFAULT_STYLE_STATE,
    h2: DEFAULT_STYLE_STATE,
    h3: DEFAULT_STYLE_STATE,
    h4: DEFAULT_STYLE_STATE,
    h5: DEFAULT_STYLE_STATE,
    h6: DEFAULT_STYLE_STATE,
    blockQuote: DEFAULT_STYLE_STATE,
    codeBlock: DEFAULT_STYLE_STATE,
    orderedList: DEFAULT_STYLE_STATE,
    unorderedList: DEFAULT_STYLE_STATE,
    link: DEFAULT_STYLE_STATE,
    image: DEFAULT_STYLE_STATE,
    mention: DEFAULT_STYLE_STATE,
}

const DEFAULT_LINK_STATE = {
    text: "",
    url: "",
    start: 0,
    end: 0,
}

const LINK_REGEX = /^(?:enriched:\/\/\S+|(?:https?:\/\/)?(?:www\.)?swmansion\.com(?:\/\S*)?)$/i
const AUTOSAVE_DELAY = 2000

export default function EditNoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const { top, bottom } = useSafeAreaInsets()
    const { isVisible: isKeyboardVisible } = useKeyboardState()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [isLoading, setIsLoading] = useState(true)
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSavedContentRef = useRef<string>("")

    // Content state
    const [content, setContent] = useState("")
    const [html, setHtml] = useState("")
    const [initialContent, setInitialContent] = useState("")

    const [selection, setSelection] = useState<Selection>()
    const [stylesState, setStylesState] = useState<StylesState>(DEFAULT_STYLES)
    const [currentLink, setCurrentLink] = useState<CurrentLinkState>(DEFAULT_LINK_STATE)

    const ref = useRef<EnrichedTextInputInstance>(null)

    // Load existing note
    useEffect(() => {
        async function loadNote() {
            if (!id) {
                router.back()
                return
            }

            try {
                const note = await getNoteById(id)
                if (note) {
                    setContent(note.content)
                    setHtml(note.html || "")
                    setInitialContent(note.content)
                    lastSavedContentRef.current = note.content
                } else {
                    router.back()
                }
            } catch (error) {
                console.error("Failed to load note:", error)
                router.back()
            } finally {
                setIsLoading(false)
            }
        }

        loadNote()
    }, [id, router])

    // Save note to database
    const saveNote = useCallback(
        async (noteContent: string, noteHtml: string) => {
            if (!id || noteContent.trim().length === 0) return

            // Skip if content hasn't changed
            if (noteContent === lastSavedContentRef.current) {
                return
            }

            setSaveStatus("saving")

            try {
                await updateNote(id, {
                    content: noteContent,
                    html: noteHtml,
                })
                lastSavedContentRef.current = noteContent
                setSaveStatus("saved")

                // Queue for AI processing
                aiQueue.add({ noteId: id, content: noteContent })
            } catch (error) {
                console.error("Failed to save note:", error)
                setSaveStatus("idle")
            }
        },
        [id],
    )

    // Debounced autosave
    const scheduleAutosave = useCallback(
        (noteContent: string, noteHtml: string) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }

            if (noteContent.trim().length === 0) {
                setSaveStatus("idle")
                return
            }

            saveTimeoutRef.current = setTimeout(() => {
                saveNote(noteContent, noteHtml)
            }, AUTOSAVE_DELAY)
        },
        [saveNote],
    )

    // Immediate save
    const immediateSave = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        if (content.trim().length === 0) return
        await saveNote(content, html)
    }, [content, html, saveNote])

    // Save on app background
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            if (nextState === "background" || nextState === "inactive") {
                immediateSave()
            }
        })

        return () => subscription.remove()
    }, [immediateSave])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    const handleChangeText = (e: OnChangeTextEvent) => {
        const newContent = e.value
        setContent(newContent)
        scheduleAutosave(newContent, html)
    }

    const handleChangeHtml = (e: OnChangeHtmlEvent) => {
        setHtml(e.value)
    }

    const handleChangeState = (state: OnChangeStateEvent) => {
        setStylesState(state)
    }

    // Go back and save
    const handleBack = useCallback(async () => {
        await immediateSave()
        await KeyboardController.dismiss()
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.back()
    }, [immediateSave, router])

    const insideCurrentLink =
        stylesState.link.isActive &&
        currentLink.url.length > 0 &&
        (currentLink.start || currentLink.end) &&
        selection &&
        selection.start >= currentLink.start &&
        selection.end <= currentLink.end

    const openLinkModal = () => {
        setIsLinkModalOpen(true)
    }

    const closeLinkModal = () => {
        setIsLinkModalOpen(false)
    }

    const submitLink = (text: string, url: string) => {
        if (!selection || url.length === 0) {
            closeLinkModal()
            return
        }

        const newText = text.length > 0 ? text : url

        if (insideCurrentLink) {
            ref.current?.setLink(currentLink.start, currentLink.end, newText, url)
        } else {
            ref.current?.setLink(selection.start, selection.end, newText, url)
        }

        closeLinkModal()
    }

    const handleLinkDetected = (state: CurrentLinkState) => {
        setCurrentLink(state)
    }

    const handleSelectionChangeEvent = (sel: OnChangeSelectionEvent) => {
        setSelection(sel)
    }

    // Render save status
    const renderSaveStatus = () => {
        if (saveStatus === "saving") {
            return (
                <View style={styles.saveStatus}>
                    <Loader2Icon size={14} color={isDark ? "#888" : "#666"} />
                    <Text style={[styles.saveStatusText, { color: isDark ? "#888" : "#666" }]}>Saving...</Text>
                </View>
            )
        }

        if (saveStatus === "saved") {
            return (
                <View style={styles.saveStatus}>
                    <CheckCircleIcon size={14} color="#10B981" />
                    <Text style={[styles.saveStatusText, { color: "#10B981" }]}>Saved</Text>
                </View>
            )
        }

        return <Text style={[styles.headerTitle, { color: isDark ? "#888" : "#666" }]}>Editing</Text>
    }

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
            </View>
        )
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: isDark ? "#333" : "#e5e5e5" }]}>
                <Pressable onPress={handleBack} style={styles.headerButton}>
                    <ArrowLeftIcon size={22} color={isDark ? "#fff" : "#000"} />
                </Pressable>

                {renderSaveStatus()}

                <Pressable onPress={handleBack} style={styles.doneButton}>
                    <Text style={[styles.doneText, { color: "#3B82F6" }]}>Done</Text>
                </Pressable>
            </View>

            {/* Editor */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Box className="w-full">
                    <EnrichedTextInput
                        ref={ref}
                        style={[styles.editorInput, { color: isDark ? "#fdfcfc" : "#141414" }] as any}
                        htmlStyle={htmlStyle}
                        defaultValue={initialContent}
                        placeholder="Start typing..."
                        placeholderTextColor={isDark ? "#555" : "#aaa"}
                        selectionColor={isDark ? "#dddddd" : "#666666"}
                        autoCapitalize="sentences"
                        autoFocus={true}
                        linkRegex={LINK_REGEX}
                        onChangeText={(e) => handleChangeText(e.nativeEvent)}
                        onChangeHtml={(e) => handleChangeHtml(e.nativeEvent)}
                        onChangeState={(e) => handleChangeState(e.nativeEvent)}
                        onLinkDetected={handleLinkDetected}
                        onChangeSelection={(e) => handleSelectionChangeEvent(e.nativeEvent)}
                    />
                </Box>
            </ScrollView>

            {/* Bottom Bar */}
            <KeyboardAvoidingView behavior="padding" style={styles.bottomBarContainer}>
                <View
                    style={[
                        styles.bottomBar,
                        {
                            borderTopColor: isDark ? "#333" : "#e5e5e5",
                            backgroundColor: isDark ? "#000" : "#fff",
                            paddingBottom: isKeyboardVisible ? 8 : bottom + 8,
                        },
                    ]}
                >
                    {isKeyboardVisible && (
                        <View style={styles.toolbarContainer}>
                            <Toolbar stylesState={stylesState} editorRef={ref} onOpenLinkModal={openLinkModal} />
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* Modals */}
            <LinkModal
                isOpen={isLinkModalOpen}
                editedText={insideCurrentLink ? currentLink.text : (selection?.text ?? "")}
                editedUrl={insideCurrentLink ? currentLink.url : ""}
                onSubmit={submitLink}
                onClose={closeLinkModal}
            />
        </View>
    )
}

const htmlStyle: HtmlStyle = {
    h1: { fontSize: 32, bold: true },
    h2: { fontSize: 26, bold: true },
    h3: { fontSize: 22, bold: true },
    h4: { fontSize: 18, bold: true },
    h5: { fontSize: 16, bold: true },
    h6: { fontSize: 14, bold: true },
    blockquote: {
        borderColor: "#3B82F6",
        borderWidth: 3,
        gapWidth: 12,
        color: "#3B82F6",
    },
    codeblock: {
        color: "#10B981",
        borderRadius: 6,
        backgroundColor: "#f0fdf4",
    },
    code: {
        color: "#8B5CF6",
        backgroundColor: "#f5f3ff",
    },
    a: {
        color: "#3B82F6",
        textDecorationLine: "underline",
    },
    ol: {
        gapWidth: 12,
        marginLeft: 20,
        markerColor: "#3B82F6",
        markerFontWeight: "bold",
    },
    ul: {
        bulletColor: "#10B981",
        bulletSize: 6,
        marginLeft: 20,
        gapWidth: 12,
    },
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
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        padding: 8,
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    saveStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    saveStatusText: {
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    doneButton: {
        padding: 8,
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    doneText: {
        fontSize: 16,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 120,
    },
    editorInput: {
        width: "100%",
        minHeight: 400,
        fontSize: 17,
        lineHeight: 28,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    bottomBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    toolbarContainer: {
        marginTop: 8,
    },
})
