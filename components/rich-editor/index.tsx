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
import { Box } from "@/components/ui/box"
import { PageLoader } from "@/components/ui/page-loader"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { createNote, getNoteById, updateNote } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, type LayoutChangeEvent } from "react-native"
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnLinkDetected,
} from "react-native-enriched"
import { KeyboardGestureArea, useKeyboardHandler } from "react-native-keyboard-controller"
import Reanimated, { useAnimatedProps, useAnimatedStyle, useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const useKeyboardAnimation = () => {
    const progress = useSharedValue(0)
    const height = useSharedValue(0)
    const inset = useSharedValue(0)
    const shouldUseOnMoveHandler = useSharedValue(false)

    useKeyboardHandler({
        onStart: (e) => {
            "worklet"

            // i. e. the keyboard was under interactive gesture, and will be showed
            // again. Since iOS will not schedule layout animation for that we can't
            // simply update `height` to destination and we need to listen to `onMove`
            // handler to have a smooth animation
            if (progress.value !== 1 && progress.value !== 0 && e.height !== 0) {
                shouldUseOnMoveHandler.value = true

                return
            }

            progress.value = e.progress
            height.value = e.height

            inset.value = e.height
        },
        onInteractive: (e) => {
            "worklet"

            progress.value = e.progress
            height.value = e.height
            inset.value = e.height
        },
        onMove: (e) => {
            "worklet"

            if (shouldUseOnMoveHandler.value) {
                progress.value = e.progress
                height.value = e.height
                inset.value = e.height
            }
        },
        onEnd: (e) => {
            "worklet"

            height.value = e.height
            progress.value = e.progress
            inset.value = e.height
            shouldUseOnMoveHandler.value = false
        },
    })

    return { height, progress, inset }
}

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
     * Custom placeholder text
     */
    placeholder?: string
}

export default function RichEditor({
    noteId: initialNoteId = null,
    onClose,
    placeholder = "What's on your mind?",
}: RichEditorProps) {
    const { height, inset } = useKeyboardAnimation()
    const { bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const props = useAnimatedProps(() => ({
        contentInset: {
            bottom: inset.value,
        },
    }))

    // Get AI models for processing queue
    const { llm, embeddings } = useAI()

    const [isLoading, setIsLoading] = useState(!!initialNoteId)
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
    const [bottomBarHeight, setBottomBarHeight] = useState(0)

    // Autosave state
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSavedContentRef = useRef<string>("")

    // Content state
    const [content, setContent] = useState("")
    const [html, setHtml] = useState("")
    const [initialContent, setInitialContent] = useState("")

    const [selection, setSelection] = useState<Selection>()
    const [stylesState, setStylesState] = useState<StylesState>(DEFAULT_STYLES)
    const [currentLink, setCurrentLink] = useState<CurrentLinkState>(DEFAULT_LINK_STATE)

    const animatedScrollViewRef = useRef<Reanimated.ScrollView>(null)
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

            try {
                if (noteId) {
                    // Update existing note
                    await updateNote(noteId, {
                        content: noteContent,
                        html: noteHtml,
                    })
                    lastSavedContentRef.current = noteContent

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

                    // Queue for AI processing
                    aiQueue.setModels({ llm, embeddings })
                    aiQueue.add({ noteId: note.id, content: noteContent }, true)

                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    return note.id
                }
            } catch (error) {
                console.error("Failed to save note:", error)
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

    // Smooth, native-driven bottom bar movement + safe-area spacer (Google Keep-like)
    const bottomBarAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: -height.value }],
        }
    }, [height])

    const bottomSafeAreaSpacerStyle = useAnimatedStyle(() => {
        const maxPadding = bottom + 8
        // Don't animate this while the keyboard opens; otherwise the toolbar "drifts".
        // As soon as the keyboard starts appearing, remove safe-area spacer so the toolbar
        // stays flush to the keyboard edge.
        const isKeyboardActive = height.value > 1
        return { height: isKeyboardActive ? 0 : maxPadding }
    }, [bottom, height])

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

    if (isLoading) return <PageLoader />

    const handleBottomBarLayout = (e: LayoutChangeEvent) => {
        const next = e.nativeEvent.layout.height
        // Keep the max height so scroll padding doesn't "shrink" mid-animation.
        setBottomBarHeight((prev) => (next > prev ? next : prev))
    }

    return (
        <KeyboardGestureArea offset={bottomBarHeight} style={editorStyles.container} textInputNativeID="rich-editor">
            {/* Editor */}
            <Reanimated.ScrollView
                ref={animatedScrollViewRef}
                // simulation of `automaticallyAdjustKeyboardInsets` behavior on RN < 0.73
                animatedProps={props}
                automaticallyAdjustContentInsets={false}
                // contentContainerStyle={contentContainerStyle}
                contentInsetAdjustmentBehavior="never"
                keyboardDismissMode="interactive"
                // onContentSizeChange={scrollToBottom}
                // className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(bottomBarHeight, bottom + 16) }}
                keyboardShouldPersistTaps="handled"
            >
                <EnrichedTextInput
                    ref={ref}
                    nativeID="rich-editor"
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
            </Reanimated.ScrollView>

            {/* Bottom Bar */}
            <Reanimated.View style={bottomBarAnimatedStyle}>
                <Box onLayout={handleBottomBarLayout} className="pt-2 border-t bg-background-0 border-background-300">
                    {/* Formatting toolbar (always visible) */}
                    <Box className="mt-2">
                        <Toolbar stylesState={stylesState} editorRef={ref} onOpenLinkModal={openLinkModal} />
                    </Box>

                    {/* Smoothly animates away when keyboard opens (keeps bar flush to keyboard) */}
                    <Reanimated.View style={bottomSafeAreaSpacerStyle} />
                </Box>
            </Reanimated.View>

            {/* Modals */}
            <LinkModal
                isOpen={isLinkModalOpen}
                editedText={insideCurrentLink ? currentLink.text : (selection?.text ?? "")}
                editedUrl={insideCurrentLink ? currentLink.url : ""}
                onSubmit={submitLink}
                onClose={closeLinkModal}
            />
        </KeyboardGestureArea>
    )
}
