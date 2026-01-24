import {
    AUTOSAVE_DELAY,
    DEFAULT_LINK_STATE,
    DEFAULT_STYLES,
    LINK_REGEX,
    type CurrentLinkState,
    type Selection,
    type StylesState,
} from "@/components/rich-editor/constants"
import { EditorHeader } from "@/components/rich-editor/editor-header"
import { editorStyles } from "@/components/rich-editor/editor-styles"
import { htmlStyle } from "@/components/rich-editor/html-styles"
import { LinkModal } from "@/components/rich-editor/link-modal"
import { Toolbar } from "@/components/rich-editor/toolbar"
import { Box } from "@/components/ui/box"
import { PageLoader } from "@/components/ui/page-loader"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { createNote, getNoteById, updateNote } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnLinkDetected,
} from "react-native-enriched"
import {
    KeyboardAvoidingView,
    KeyboardAwareScrollView,
    KeyboardController,
    useKeyboardState,
} from "react-native-keyboard-controller"
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
    /**
     * Custom placeholder text
     */
    placeholder?: string
}

export default function RichEditor({
    noteId: initialNoteId = null,
    onClose,
    showBackButton = true,
    placeholder = "What's on your mind?",
}: RichEditorProps) {
    const { top, bottom } = useSafeAreaInsets()
    const { isVisible: isKeyboardVisible } = useKeyboardState()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    // Get AI models for processing queue
    const { llm, embeddings } = useAI()

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
    const saveNote = useCallback(
        async (noteContent: string, noteHtml: string, noteId: string | null) => {
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
                    aiQueue.setModels({ llm, embeddings })
                    aiQueue.add({ noteId, content: noteContent }, true)

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
                    aiQueue.setModels({ llm, embeddings })
                    aiQueue.add({ noteId: note.id, content: noteContent }, true)

                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    return note.id
                }
            } catch (error) {
                console.error("Failed to save note:", error)
                setSaveStatus("idle")
                return noteId
            }
        },
        [llm, embeddings],
    )

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

    const handleViewNotes = useCallback(() => {
        router.push("/notes" as any)
    }, [router])

    if (isLoading) return <PageLoader />

    return (
        <Box className="flex-1 bg-background" style={{ paddingTop: top }}>
            {/* Header */}
            <EditorHeader showBackButton={showBackButton} handleBack={handleBack} handleViewNotes={handleViewNotes} />

            {/* Editor */}
            <KeyboardAwareScrollView
                style={editorStyles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottom + 120 }}
                keyboardShouldPersistTaps="handled"
            >
                <Box className="w-full">
                    <EnrichedTextInput
                        ref={ref}
                        style={[editorStyles.editorInput, { color: isDark ? "#ffffff" : "#000000" }] as any}
                        htmlStyle={htmlStyle}
                        defaultValue={initialContent}
                        placeholder={placeholder}
                        placeholderTextColor={isDark ? "#555555" : "#aaaaaa"}
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
            </KeyboardAwareScrollView>

            {/* Bottom Bar */}
            <KeyboardAvoidingView behavior="padding" style={editorStyles.bottomBarContainer}>
                <Box
                    className="pt-2 border-t border-background-300 bg-background"
                    style={{ paddingBottom: isKeyboardVisible ? 0 : bottom + 8 }}
                >
                    {/* Formatting toolbar (only when keyboard is visible) */}
                    {isKeyboardVisible && (
                        <Box className="mt-2">
                            <Toolbar stylesState={stylesState} editorRef={ref} onOpenLinkModal={openLinkModal} />
                        </Box>
                    )}
                </Box>
            </KeyboardAvoidingView>

            {/* Modals */}
            <LinkModal
                isOpen={isLinkModalOpen}
                editedText={insideCurrentLink ? currentLink.text : (selection?.text ?? "")}
                editedUrl={insideCurrentLink ? currentLink.url : ""}
                onSubmit={submitLink}
                onClose={closeLinkModal}
            />
        </Box>
    )
}
