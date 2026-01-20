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
import { ArchiveIcon, CameraIcon, CheckIcon, ChevronDownIcon, MicIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useRef, useState } from "react"
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native"
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

const showToast = (message: string) => {
    if (Platform.OS === "android") {
        ToastAndroid.show(message, ToastAndroid.SHORT)
    } else {
        console.log(message)
    }
}

export default function RichEditor() {
    const { top, bottom } = useSafeAreaInsets()
    const { isVisible: isKeyboardVisible } = useKeyboardState()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

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
    const saveDraft = useCallback((text: string) => {
        if (text.trim().length > 0) {
            console.log("Draft saved:", text.substring(0, 50))
        }
    }, [])

    const debouncedSaveDraft = useDebounce(saveDraft, 2000)

    // Capture/Done handler - saves note and resets editor instantly
    const handleCapture = useCallback(async () => {
        if (content.trim().length === 0) {
            Alert.alert("Empty Note", "Write something before saving!")
            return
        }

        await KeyboardController.dismiss()
        setIsCapturing(true)

        try {
            const capturedContent = content
            const capturedHtml = html

            // Clear the editor
            setContent("")
            setHtml("")
            setEditorKey((k) => k + 1)

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            showToast("Saved!")

            // Save to database
            const note = await createNote({
                content: capturedContent,
                html: capturedHtml,
            })

            // Queue for AI processing
            aiQueue.add({ noteId: note.id, content: capturedContent })
        } catch (error) {
            console.error("Failed to save note:", error)
            Alert.alert("Error", "Failed to save note. Please try again.")
        } finally {
            setIsCapturing(false)
        }
    }, [content, html])

    // Voice capture handler
    const handleVoice = useCallback(async () => {
        await KeyboardController.dismiss()
        setIsVoiceModalVisible(true)
    }, [])

    // Handle voice capture result - save directly as a new note
    const handleVoiceCapture = useCallback(async (text: string) => {
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            showToast("Voice note saved!")

            const note = await createNote({
                content: text,
            })

            aiQueue.add({ noteId: note.id, content: text })
        } catch (error) {
            console.error("Failed to save voice note:", error)
            Alert.alert("Error", "Failed to save voice note.")
        }
    }, [])

    // Scan handler
    const handleScan = useCallback(async () => {
        await KeyboardController.dismiss()
        setIsScanModalVisible(true)
    }, [])

    // Handle scan capture result - save directly as a new note
    const handleScanCapture = useCallback(async (text: string) => {
        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            showToast("Scanned note saved!")

            const note = await createNote({
                content: text,
            })

            aiQueue.add({ noteId: note.id, content: text })
        } catch (error) {
            console.error("Failed to save scanned note:", error)
            Alert.alert("Error", "Failed to save scanned note.")
        }
    }, [])

    // View notes handler
    const handleViewNotes = useCallback(async () => {
        await KeyboardController.dismiss()
        router.push("/notes" as any)
    }, [router])

    // Dismiss keyboard
    const handleDismissKeyboard = useCallback(async () => {
        await KeyboardController.dismiss()
    }, [])

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
        debouncedSaveDraft(e.value)
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

    const handleLinkDetected = (state: CurrentLinkState) => {
        setCurrentLink(state)
    }

    const handleSelectionChangeEvent = (sel: OnChangeSelectionEvent) => {
        setSelection(sel)
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: top + 8, borderBottomColor: isDark ? "#333" : "#e5e5e5" }]}>
                <Pressable onPress={handleViewNotes} style={styles.headerButton}>
                    <ArchiveIcon size={22} color={isDark ? "#fff" : "#000"} />
                </Pressable>

                <Text style={[styles.headerTitle, { color: isDark ? "#888" : "#666" }]}>
                    {hasContent ? "Editing..." : "New Note"}
                </Text>

                <Pressable
                    onPress={handleCapture}
                    disabled={!hasContent || isCapturing}
                    style={[
                        styles.doneButton,
                        {
                            backgroundColor: hasContent ? "#3B82F6" : isDark ? "#333" : "#e5e5e5",
                        },
                    ]}
                >
                    <CheckIcon size={18} color={hasContent ? "#fff" : isDark ? "#666" : "#999"} />
                    <Text style={[styles.doneButtonText, { color: hasContent ? "#fff" : isDark ? "#666" : "#999" }]}>
                        Done
                    </Text>
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
                        key={editorKey}
                        ref={ref}
                        style={[styles.editorInput, { color: isDark ? "#fdfcfc" : "#141414" }] as any}
                        htmlStyle={htmlStyle}
                        placeholder="What's on your mind?"
                        placeholderTextColor={isDark ? "#666" : "#999"}
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
                    {/* Quick capture buttons */}
                    <View style={styles.quickActions}>
                        <Pressable onPress={handleVoice} style={styles.quickButton}>
                            <MicIcon size={22} color={isDark ? "#fff" : "#000"} />
                        </Pressable>
                        <Pressable onPress={handleScan} style={styles.quickButton}>
                            <CameraIcon size={22} color={isDark ? "#fff" : "#000"} />
                        </Pressable>
                        {isKeyboardVisible && (
                            <Pressable onPress={handleDismissKeyboard} style={styles.quickButton}>
                                <ChevronDownIcon size={22} color={isDark ? "#fff" : "#000"} />
                            </Pressable>
                        )}
                    </View>

                    {/* Formatting toolbar (only when keyboard is visible) */}
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    headerButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: "500",
    },
    doneButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        gap: 4,
    },
    doneButtonText: {
        fontSize: 14,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    editorInput: {
        width: "100%",
        minHeight: 300,
        fontSize: 17,
        lineHeight: 26,
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    bottomBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomBar: {
        borderTopWidth: 1,
        paddingTop: 8,
        paddingHorizontal: 12,
    },
    quickActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    quickButton: {
        padding: 10,
        borderRadius: 8,
    },
    toolbarContainer: {
        marginTop: 4,
    },
})
