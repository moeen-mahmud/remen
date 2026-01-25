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
import { Animated, AppState, type LayoutChangeEvent } from "react-native"
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnLinkDetected,
} from "react-native-enriched"
import { KeyboardGestureArea, useKeyboardHandler, useKeyboardState } from "react-native-keyboard-controller"
import Reanimated, { useAnimatedProps, useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const useKeyboardAnimation = () => {
    const progress = useSharedValue(0)
    const height = useSharedValue(0)
    const inset = useSharedValue(0)
    const offset = useSharedValue(0)
    const scroll = useSharedValue(0)
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
            // Math.max is needed to prevent overscroll when keyboard hides (and user scrolled to the top, for example)
            offset.value = Math.max(e.height + scroll.value, 0)
        },
        onInteractive: (e) => {
            "worklet"

            progress.value = e.progress
            height.value = e.height
        },
        onMove: (e) => {
            "worklet"

            if (shouldUseOnMoveHandler.value) {
                progress.value = e.progress
                height.value = e.height
            }
        },
        onEnd: (e) => {
            "worklet"

            height.value = e.height
            progress.value = e.progress
            shouldUseOnMoveHandler.value = false
        },
    })

    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scroll.value = e.contentOffset.y - inset.value
        },
    })

    return { height, progress, onScroll, inset, offset }
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
    const keyboard = useKeyboardState((state) => ({
        isVisible: state.isVisible,
        height: state.height,
        duration: state.duration,
    }))
    const { height, onScroll, inset, offset } = useKeyboardAnimation()
    const { bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const props = useAnimatedProps(() => ({
        contentInset: {
            bottom: inset.value,
        },
        contentOffset: {
            x: 0,
            y: offset.value,
        },
    }))

    // Get AI models for processing queue
    const { llm, embeddings } = useAI()

    const [isLoading, setIsLoading] = useState(!!initialNoteId)
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
    const [isToolbarMounted, setIsToolbarMounted] = useState(false)
    const [bottomBarHeight, setBottomBarHeight] = useState(0)

    const bottomBarTranslateY = useRef(new Animated.Value(0)).current
    const toolbarAnim = useRef(new Animated.Value(0)).current

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

    // Keep bottom bar above keyboard (with animation)
    useEffect(() => {
        // Lift exactly by the keyboard height so the bar sits flush on top of it.
        const keyboardLift = keyboard.isVisible ? Math.max(0, keyboard.height) : 0
        const toValue = -keyboardLift
        Animated.timing(bottomBarTranslateY, {
            toValue,
            duration: keyboard.duration || 250,
            useNativeDriver: true,
        }).start()
    }, [keyboard.isVisible, keyboard.height, keyboard.duration, bottomBarTranslateY])

    // Animate toolbar in/out (separately from keyboard slide)
    useEffect(() => {
        toolbarAnim.stopAnimation()

        if (keyboard.isVisible) {
            setIsToolbarMounted(true)
            toolbarAnim.setValue(0)
            Animated.timing(toolbarAnim, {
                toValue: 1,
                duration: Math.max(150, keyboard.duration || 250),
                useNativeDriver: true,
            }).start()
            return
        }

        Animated.timing(toolbarAnim, {
            toValue: 0,
            duration: Math.max(150, keyboard.duration || 250),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setIsToolbarMounted(false)
        })
    }, [keyboard.isVisible, keyboard.duration, toolbarAnim])

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
    const scrollToBottom = useCallback(() => {
        animatedScrollViewRef.current?.scrollToEnd({ animated: false })
    }, [])

    if (isLoading) return <PageLoader />

    const handleBottomBarLayout = (e: LayoutChangeEvent) => {
        setBottomBarHeight(e.nativeEvent.layout.height)
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
                onContentSizeChange={scrollToBottom}
                onScroll={onScroll}
                // className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(bottomBarHeight, bottom + 16) }}
                // keyboardShouldPersistTaps="handled"
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
            <Animated.View
                style={[
                    editorStyles.bottomBarContainer,
                    {
                        transform: [{ translateY: bottomBarTranslateY }],
                    },
                ]}
            >
                <Box
                    onLayout={handleBottomBarLayout}
                    className="pt-2 border-t bg-background-0 border-background-300"
                    style={{ paddingBottom: keyboard.isVisible ? 0 : bottom + 8 }}
                >
                    {/* Formatting toolbar (only when keyboard is visible) */}
                    {isToolbarMounted && (
                        <Animated.View
                            style={{
                                opacity: toolbarAnim,
                                transform: [
                                    {
                                        translateY: toolbarAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [8, 0],
                                        }),
                                    },
                                ],
                            }}
                        >
                            <Box className="mt-2">
                                <Toolbar stylesState={stylesState} editorRef={ref} onOpenLinkModal={openLinkModal} />
                            </Box>
                        </Animated.View>
                    )}
                </Box>
            </Animated.View>

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
