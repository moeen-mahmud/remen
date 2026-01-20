import { CaptureActions } from "@/components/capture-actions"
import { LinkModal } from "@/components/rich-editor/link-modal"
import { Toolbar } from "@/components/rich-editor/toolbar"
import { ScanCaptureModal } from "@/components/scan-capture-modal"
import { Box } from "@/components/ui/box"
import { VoiceCaptureModal } from "@/components/voice-capture-modal"
import { aiQueue } from "@/lib/ai/queue"
import { createNote } from "@/lib/database"
import { useDebounce } from "@/lib/hooks/use-debounce"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { useColorScheme } from "nativewind"
import { useCallback, useRef, useState } from "react"
import { Alert, Platform, ScrollView, StyleSheet, ToastAndroid } from "react-native"
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type HtmlStyle,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnKeyPressEvent,
    type OnLinkDetected,
} from "react-native-enriched"
import { KeyboardAvoidingView, useKeyboardState } from "react-native-keyboard-controller"
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

// Simple toast function for cross-platform
const showToast = (message: string) => {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.SHORT)
    } else {
        // On iOS, we'll use a subtle approach - just haptic feedback
        // A proper toast library could be added later
        console.log(message)
    }
}

export default function RichEditor() {
    const { top } = useSafeAreaInsets()
    const { isVisible } = useKeyboardState()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
    const [isCapturing, setIsCapturing] = useState(false)
    const [editorKey, setEditorKey] = useState(0)
    const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false)
    const [isScanModalVisible, setIsScanModalVisible] = useState(false)

    // Content state
    const [content, setContent] = useState("")
    const [html, setHtml] = useState("")

    const [selection, setSelection] = useState<Selection>()
    const [stylesState, setStylesState] = useState<StylesState>(DEFAULT_STYLES)
    const [currentLink, setCurrentLink] = useState<CurrentLinkState>(DEFAULT_LINK_STATE)

    const ref = useRef<EnrichedTextInputInstance>(null)

    // Auto-save draft (debounced)
    const saveDraft = useCallback((text: string, htmlContent: string) => {
        // For now, just log - we can add draft persistence later
        if (text.trim().length > 0) {
            console.log("Draft saved:", text.substring(0, 50))
        }
    }, [])

    const debouncedSaveDraft = useDebounce(saveDraft, 2000)

    // Capture/Done handler - saves note and resets editor instantly
    const handleCapture = useCallback(async () => {
        if (content.trim().length === 0) return

        setIsCapturing(true)

        try {
            // 1. Reset UI immediately (0ms perceived latency)
            const capturedContent = content
            const capturedHtml = html

            // Clear the editor right away by incrementing key (forces remount)
            setContent("")
            setHtml("")
            setEditorKey((k) => k + 1)

            // Haptic feedback for success
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            showToast("Organizing...")

            // 2. Save to database (background)
            const note = await createNote({
                content: capturedContent,
                html: capturedHtml,
            })

            // 3. Queue for AI processing
            aiQueue.add({ noteId: note.id, content: capturedContent })

            // 4. Focus back on editor for next capture
            setTimeout(() => {
                ref.current?.focus()
            }, 100)
        } catch (error) {
            console.error("Failed to save note:", error)
            Alert.alert("Error", "Failed to save note. Please try again.")
        } finally {
            setIsCapturing(false)
        }
    }, [content, html])

    // Voice capture handler
    const handleVoice = useCallback(() => {
        setIsVoiceModalVisible(true)
    }, [])

    // Handle voice capture result
    const handleVoiceCapture = useCallback(
        (text: string) => {
            // Append voice text to current content
            const newContent = content.length > 0 ? `${content}\n\n${text}` : text
            setContent(newContent)
            // Note: We can't easily insert into the rich editor, so we just update the content state
            // The user can then edit or save
        },
        [content],
    )

    // Scan handler
    const handleScan = useCallback(() => {
        setIsScanModalVisible(true)
    }, [])

    // Handle scan capture result
    const handleScanCapture = useCallback(
        (text: string) => {
            // Append scanned text to current content
            const newContent = content.length > 0 ? `${content}\n\n${text}` : text
            setContent(newContent)
        },
        [content],
    )

    // View notes handler
    const handleViewNotes = useCallback(() => {
        router.push("/notes" as any)
    }, [router])

    const hasContent = content.trim().length > 0

    const insideCurrentLink =
        stylesState.link.isActive &&
        currentLink.url.length > 0 &&
        (currentLink.start || currentLink.end) &&
        selection &&
        selection.start >= currentLink.start &&
        selection.end <= currentLink.end

    const handleChangeText = (e: OnChangeTextEvent) => {
        setContent(e.value)
        debouncedSaveDraft(e.value, html)
    }

    const handleChangeHtml = (e: OnChangeHtmlEvent) => {
        setHtml(e.value)
    }

    const handleChangeState = (state: OnChangeStateEvent) => {
        setStylesState(state)
    }

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

    const handleFocusEvent = () => {
        console.log("Input focused")
    }

    const handleBlurEvent = () => {
        console.log("Input blurred")
    }

    const handleKeyPress = (e: OnKeyPressEvent) => {
        console.log("Key pressed:", e.key)
    }

    const handleLinkDetected = (state: CurrentLinkState) => {
        console.log(state)
        setCurrentLink(state)
    }

    const handleSelectionChangeEvent = (sel: OnChangeSelectionEvent) => {
        setSelection(sel)
    }

    return (
        <>
            <ScrollView className="flex-1 bg-background-0" style={{ paddingTop: top }}>
                <Box className="w-full">
                    <EnrichedTextInput
                        key={editorKey}
                        ref={ref}
                        style={[styles.editorInput, { color: colorScheme === "dark" ? "#fdfcfc" : "#141414" }] as any}
                        htmlStyle={htmlStyle}
                        placeholder="What's on your mind?"
                        placeholderTextColor={colorScheme === "dark" ? "#dddddd" : "#666666"}
                        selectionColor={colorScheme === "dark" ? "#dddddd" : "#666666"}
                        autoCapitalize="sentences"
                        autoFocus={false}
                        linkRegex={LINK_REGEX}
                        onChangeText={(e) => handleChangeText(e.nativeEvent)}
                        onChangeHtml={(e) => handleChangeHtml(e.nativeEvent)}
                        onChangeState={(e) => handleChangeState(e.nativeEvent)}
                        onLinkDetected={handleLinkDetected}
                        onFocus={handleFocusEvent}
                        onBlur={handleBlurEvent}
                        onChangeSelection={(e) => handleSelectionChangeEvent(e.nativeEvent)}
                        onKeyPress={(e) => handleKeyPress(e.nativeEvent)}
                    />
                </Box>
            </ScrollView>
            <KeyboardAvoidingView behavior="padding" style={styles.keyboardAvoidingView}>
                {isVisible ? (
                    <Toolbar stylesState={stylesState} editorRef={ref} onOpenLinkModal={openLinkModal} />
                ) : (
                    <CaptureActions
                        onCapture={handleCapture}
                        onVoice={handleVoice}
                        onScan={handleScan}
                        onViewNotes={handleViewNotes}
                        isCapturing={isCapturing}
                        hasContent={hasContent}
                    />
                )}
            </KeyboardAvoidingView>
            <LinkModal
                isOpen={isLinkModalOpen}
                editedText={insideCurrentLink ? currentLink.text : (selection?.text ?? "")}
                editedUrl={insideCurrentLink ? currentLink.url : ""}
                onSubmit={submitLink}
                onClose={closeLinkModal}
            />
            <VoiceCaptureModal
                isVisible={isVoiceModalVisible}
                onClose={() => setIsVoiceModalVisible(false)}
                onCapture={handleVoiceCapture}
            />
            <ScanCaptureModal
                isVisible={isScanModalVisible}
                onClose={() => setIsScanModalVisible(false)}
                onCapture={handleScanCapture}
            />
        </>
    )
}

const htmlStyle: HtmlStyle = {
    h1: {
        fontSize: 56,
        bold: true,
    },
    h2: {
        fontSize: 42,
        bold: true,
    },
    h3: {
        fontSize: 36,
        bold: true,
    },
    h4: {
        fontSize: 28,
        bold: true,
    },
    h5: {
        fontSize: 22,
        bold: true,
    },
    h6: {
        fontSize: 18,
        bold: true,
    },
    blockquote: {
        borderColor: "#0043B6",
        borderWidth: 4,
        gapWidth: 16,
        color: "#0043B6",
    },
    codeblock: {
        color: "#489766",
        borderRadius: 8,
        backgroundColor: "aquamarine",
    },
    code: {
        color: "#8754FF",
        backgroundColor: "yellow",
    },
    a: {
        color: "#489766",
        textDecorationLine: "underline",
    },
    ol: {
        gapWidth: 16,
        marginLeft: 24,
        markerColor: "#0043B6",
        markerFontWeight: "bold",
    },
    ul: {
        bulletColor: "#489766",
        bulletSize: 8,
        marginLeft: 24,
        gapWidth: 16,
    },
}

const styles = StyleSheet.create({
    keyboardAvoidingView: {
        position: "absolute",
        width: "100%",
        bottom: 0,
    },
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        alignItems: "center",
    },
    editor: {
        width: "100%",
    },
    buttonStack: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
    },
    button: {
        width: "45%",
    },
    valueButton: {
        width: "100%",
    },
    editorInput: {
        width: "100%",
        height: "100%",
        fontSize: 16,
        fontFamily: "Lora-Regular",
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
})
