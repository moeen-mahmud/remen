import { RemenLogo } from "@/components/brand/logo"
import {
    AUTOSAVE_DELAY,
    DEFAULT_LINK_STATE,
    DEFAULT_STYLES,
    LINK_REGEX,
    type CurrentLinkState,
    type Selection,
    type StylesState,
} from "@/components/rich-editor/constants"
import { editorStyles } from "@/components/rich-editor/editor-styles"
import { htmlStyle } from "@/components/rich-editor/html-styles"
import { LinkModal } from "@/components/rich-editor/link-modal"
import { Toolbar } from "@/components/rich-editor/toolbar"
import { SaveStatus, type SaveState } from "@/components/save-status"
import { Box } from "@/components/ui/box"
import { aiQueue } from "@/lib/ai/queue"
import { createNote, getNoteById, updateNote } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { ArrowLeftIcon, CameraIcon, ChevronDownIcon, MicIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, AppState, Pressable, ScrollView, View } from "react-native"
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnLinkDetected,
} from "react-native-enriched"
import { KeyboardAvoidingView, KeyboardController, useKeyboardState } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface RichEditorProps {
    /**
     * Optional note ID to edit an existing note.
     * If provided, the editor will load and edit that note.
     * If not provided, creates a new note.
     */
    noteId?: string | null
    /**
     * Callback when the editor should close (e.g., back button pressed)
     */
    onClose?: () => void
    /**
     * Whether to show the back button (default: true)
     */
    showBackButton?: boolean
    /**
     * Whether to show quick action buttons (voice/scan) (default: true)
     */
    showQuickActions?: boolean
    /**
     * Custom placeholder text
     */
    placeholder?: string
}

export default function RichEditor({
    noteId: initialNoteId = null,
    onClose,
    showBackButton = true,
    showQuickActions = true,
    placeholder = "What's on your mind?",
}: RichEditorProps) {
    const { top, bottom } = useSafeAreaInsets()
    const { isVisible: isKeyboardVisible } = useKeyboardState()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [isLoading, setIsLoading] = useState(!!initialNoteId)
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

    // Autosave state
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId)
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

    // Load existing note if noteId is provided
    useEffect(() => {
        async function loadNote() {
            if (!initialNoteId) {
                setIsLoading(false)
                return
            }

            try {
                const note = await getNoteById(initialNoteId)
                if (note) {
                    setContent(note.content)
                    setHtml(note.html || "")
                    setInitialContent(note.content)
                    setCurrentNoteId(note.id)
                    lastSavedContentRef.current = note.content
                } else {
                    // Note not found, treat as new note
                    setCurrentNoteId(null)
                }
            } catch (error) {
                console.error("Failed to load note:", error)
                setCurrentNoteId(null)
            } finally {
                setIsLoading(false)
            }
        }

        loadNote()
    }, [initialNoteId])

    // Save note to database
    const saveNote = useCallback(async (noteContent: string, noteHtml: string, noteId: string | null) => {
        if (noteContent.trim().length === 0) return null

        // Skip if content hasn't changed
        if (noteContent === lastSavedContentRef.current && noteId) {
            return noteId
        }

        setSaveStatus("saving")

        try {
            if (noteId) {
                // Update existing note
                await updateNote(noteId, {
                    content: noteContent,
                    html: noteHtml,
                })
                lastSavedContentRef.current = noteContent
                setSaveStatus("saved")

                // Queue for AI processing (re-process on update)
                aiQueue.add({ noteId, content: noteContent })

                return noteId
            } else {
                // Create new note
                const note = await createNote({
                    content: noteContent,
                    html: noteHtml,
                })
                lastSavedContentRef.current = noteContent
                setSaveStatus("saved")

                // Queue for AI processing
                aiQueue.add({ noteId: note.id, content: noteContent })

                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                return note.id
            }
        } catch (error) {
            console.error("Failed to save note:", error)
            setSaveStatus("idle")
            return noteId
        }
    }, [])

    // Debounced autosave
    const scheduleAutosave = useCallback(
        (noteContent: string, noteHtml: string) => {
            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }

            // Don't save empty content
            if (noteContent.trim().length === 0) {
                setSaveStatus("idle")
                return
            }

            // Schedule new save
            saveTimeoutRef.current = setTimeout(async () => {
                const savedId = await saveNote(noteContent, noteHtml, currentNoteId)
                if (savedId && !currentNoteId) {
                    setCurrentNoteId(savedId)
                }
            }, AUTOSAVE_DELAY)
        },
        [currentNoteId, saveNote],
    )

    // Immediate save (for blur/navigate)
    const immediateSave = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        if (content.trim().length === 0) return

        const savedId = await saveNote(content, html, currentNoteId)
        if (savedId && !currentNoteId) {
            setCurrentNoteId(savedId)
        }
    }, [content, html, currentNoteId, saveNote])

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

    // Handle text changes - trigger autosave
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

    // Navigate to notes list or close
    const handleBack = useCallback(async () => {
        await immediateSave()
        await KeyboardController.dismiss()
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

        if (onClose) {
            onClose()
        } else {
            router.push("/notes" as any)
        }
    }, [immediateSave, onClose, router])

    // Navigate to voice capture
    const handleVoice = useCallback(async () => {
        await immediateSave()
        await KeyboardController.dismiss()
        router.push("/voice" as any)
    }, [immediateSave, router])

    // Navigate to scan capture
    const handleScan = useCallback(async () => {
        await immediateSave()
        await KeyboardController.dismiss()
        router.push("/scan" as any)
    }, [immediateSave, router])

    // Dismiss keyboard
    const handleDismissKeyboard = useCallback(async () => {
        await KeyboardController.dismiss()
    }, [])

    const isEditMode = !!currentNoteId

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

    const handleLinkDetected = (state: OnLinkDetected) => {
        setCurrentLink(state)
    }

    const handleSelectionChangeEvent = (sel: OnChangeSelectionEvent) => {
        setSelection(sel)
    }

    // Render save status indicator
    const renderSaveStatus = () => {
        // Use the new animated SaveStatus component
        return <SaveStatus state={saveStatus as SaveState} />
    }

    if (isLoading) {
        return (
            <View style={[editorStyles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
                </View>
            </View>
        )
    }

    return (
        <View style={[editorStyles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            {/* Header */}
            <View
                style={[editorStyles.header, { paddingTop: top + 8, borderBottomColor: isDark ? "#333" : "#e5e5e5" }]}
            >
                {showBackButton ? (
                    <Pressable onPress={handleBack} style={editorStyles.headerButton}>
                        <ArrowLeftIcon size={22} color={isDark ? "#fff" : "#000"} />
                    </Pressable>
                ) : (
                    <View style={editorStyles.brandContainer}>
                        <RemenLogo size="sm" showIcon={true} animated={false} />
                    </View>
                )}

                {renderSaveStatus()}

                {/* Spacer for header alignment */}
                <View style={editorStyles.headerButton} />
            </View>

            {/* Editor */}
            <ScrollView
                style={editorStyles.scrollView}
                contentContainerStyle={editorStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Box className="w-full">
                    <EnrichedTextInput
                        ref={ref}
                        style={[editorStyles.editorInput, { color: isDark ? "#fdfcfc" : "#141414" }] as any}
                        htmlStyle={htmlStyle}
                        defaultValue={initialContent}
                        placeholder={placeholder}
                        placeholderTextColor={isDark ? "#555" : "#aaa"}
                        selectionColor={isDark ? "#dddddd" : "#666666"}
                        autoCapitalize="sentences"
                        autoFocus={false}
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
            <KeyboardAvoidingView behavior="padding" style={editorStyles.bottomBarContainer}>
                <View
                    style={[
                        editorStyles.bottomBar,
                        {
                            borderTopColor: isDark ? "#333" : "#e5e5e5",
                            backgroundColor: isDark ? "#000" : "#fff",
                            paddingBottom: isKeyboardVisible ? 8 : bottom + 8,
                        },
                    ]}
                >
                    {/* Quick capture buttons */}
                    {showQuickActions && (
                        <View style={editorStyles.quickActions}>
                            <Pressable onPress={handleVoice} style={editorStyles.quickButton}>
                                <MicIcon size={22} color={isDark ? "#fff" : "#000"} />
                            </Pressable>
                            <Pressable onPress={handleScan} style={editorStyles.quickButton}>
                                <CameraIcon size={22} color={isDark ? "#fff" : "#000"} />
                            </Pressable>
                            {isKeyboardVisible && (
                                <Pressable onPress={handleDismissKeyboard} style={editorStyles.quickButton}>
                                    <ChevronDownIcon size={22} color={isDark ? "#fff" : "#000"} />
                                </Pressable>
                            )}
                        </View>
                    )}

                    {/* Formatting toolbar (only when keyboard is visible) */}
                    {isKeyboardVisible && (
                        <View style={editorStyles.toolbarContainer}>
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
