import {
    AUTOSAVE_DELAY,
    DEFAULT_LINK_STATE,
    DEFAULT_STYLES,
    LINK_REGEX,
    type CurrentLinkState,
    type Selection,
    type StylesState,
} from "@/components/rich-editor/constants";
import { editorStyles } from "@/components/rich-editor/editor-styles";
import { htmlStyle } from "@/components/rich-editor/html-styles";
import { LinkModal } from "@/components/rich-editor/link-modal";
import { Toolbar } from "@/components/rich-editor/toolbar";
import { Box } from "@/components/ui/box";
import { PageLoader } from "@/components/ui/page-loader";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { createNote, getNoteById, updateNote } from "@/lib/database";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Keyboard, type LayoutChangeEvent } from "react-native";
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type OnChangeHtmlEvent,
    type OnChangeSelectionEvent,
    type OnChangeStateEvent,
    type OnChangeTextEvent,
    type OnLinkDetected,
} from "react-native-enriched";
import { KeyboardGestureArea, useKeyboardHandler } from "react-native-keyboard-controller";
import Reanimated, { useAnimatedProps, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const useKeyboardAnimation = () => {
    const progress = useSharedValue(0);
    const height = useSharedValue(0);
    const inset = useSharedValue(0);

    useKeyboardHandler({
        onStart: (e) => {
            "worklet";
            progress.value = e.progress;
            height.value = e.height;
            inset.value = e.height;
        },
        onMove: (e) => {
            "worklet";
            progress.value = e.progress;
            height.value = e.height;
            inset.value = e.height;
        },
        onEnd: (e) => {
            "worklet";
            // Keep everything in sync without additional animation
            height.value = e.height;
            progress.value = e.progress;
            inset.value = e.height;
        },
    });

    return { height, progress, inset };
};

interface RichEditorProps {
    noteId?: string | null;
    onClose?: () => void;
    placeholder?: string;
}

export default function RichEditor({
    noteId: initialNoteId = null,
    onClose,
    placeholder = "What's on your mind?",
}: RichEditorProps) {
    const { height, inset, progress } = useKeyboardAnimation();
    const { bottom } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const bottomBarHeightSV = useSharedValue(64);

    const animatedProps = useAnimatedProps(() => ({
        contentInset: {
            // Keep caret/content above both the keyboard and the toolbar.
            // Toolbar is only visible while the keyboard is visible (progress 0..1).
            bottom: inset.value + bottomBarHeightSV.value * progress.value,
        },
    }));

    const { llm, embeddings } = useAI();

    const [isLoading, setIsLoading] = useState(!!initialNoteId);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [bottomBarHeight, setBottomBarHeight] = useState(0);

    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>("");

    const [content, setContent] = useState("");
    const [html, setHtml] = useState("");
    const [initialContent, setInitialContent] = useState("");

    const [selection, setSelection] = useState<Selection>();
    const [stylesState, setStylesState] = useState<StylesState>(DEFAULT_STYLES);
    const [currentLink, setCurrentLink] = useState<CurrentLinkState>(DEFAULT_LINK_STATE);

    const animatedScrollViewRef = useRef<Reanimated.ScrollView>(null);
    const ref = useRef<EnrichedTextInputInstance>(null);
    const scrollViewContentHeight = useRef(0);

    // Dismiss keyboard when route loses focus
    useFocusEffect(
        useCallback(() => {
            return () => {
                Keyboard.dismiss();
            };
        }, []),
    );

    useEffect(() => {
        async function loadNote() {
            if (!initialNoteId) {
                setIsLoading(false);
                return;
            }

            try {
                const note = await getNoteById(initialNoteId);
                if (note) {
                    setContent(note.content);
                    setHtml(note.html || "");
                    setInitialContent(note.content);
                    setCurrentNoteId(note.id);
                    lastSavedContentRef.current = note.content;
                } else {
                    setCurrentNoteId(null);
                }
            } catch (error) {
                console.error("Failed to load note:", error);
                setCurrentNoteId(null);
            } finally {
                setIsLoading(false);
            }
        }

        loadNote();
    }, [initialNoteId]);

    const saveNote = useCallback(
        async (noteContent: string, noteHtml: string, noteId: string | null) => {
            if (noteContent.trim().length === 0) return null;

            if (noteContent === lastSavedContentRef.current && noteId) {
                return noteId;
            }

            try {
                if (noteId) {
                    await updateNote(noteId, {
                        content: noteContent,
                        html: noteHtml,
                    });
                    lastSavedContentRef.current = noteContent;

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId, content: noteContent }, true);

                    return noteId;
                } else {
                    const note = await createNote({
                        content: noteContent,
                        html: noteHtml,
                    });
                    lastSavedContentRef.current = noteContent;

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId: note.id, content: noteContent }, true);

                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    return note.id;
                }
            } catch (error) {
                console.error("Failed to save note:", error);
                return noteId;
            }
        },
        [llm, embeddings],
    );

    const scheduleAutosave = useCallback(
        (noteContent: string, noteHtml: string) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            if (noteContent.trim().length === 0) {
                return;
            }

            saveTimeoutRef.current = setTimeout(async () => {
                const savedId = await saveNote(noteContent, noteHtml, currentNoteId);
                if (savedId && !currentNoteId) {
                    setCurrentNoteId(savedId);
                }
            }, AUTOSAVE_DELAY);
        },
        [currentNoteId, saveNote],
    );

    const immediateSave = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        if (content.trim().length === 0) return;

        const savedId = await saveNote(content, html, currentNoteId);
        if (savedId && !currentNoteId) {
            setCurrentNoteId(savedId);
        }
    }, [content, html, currentNoteId, saveNote]);

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            if (nextState === "background" || nextState === "inactive") {
                immediateSave();
            }
        });

        return () => subscription.remove();
    }, [immediateSave]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Toolbar:
    // - Visible only while keyboard is visible (progress > 0)
    // - Slides with keyboard, then continues sliding down off-screen while hiding
    const bottomBarAnimatedStyle = useAnimatedStyle(() => {
        const hiddenOffset = bottomBarHeightSV.value + bottom + 16;
        return {
            opacity: progress.value,
            transform: [{ translateY: (1 - progress.value) * hiddenOffset - height.value }],
        };
    }, [bottom]);

    const bottomSafeAreaSpacerStyle = useAnimatedStyle(() => {
        const maxPadding = bottom + 8;
        // Remove spacer as soon as keyboard starts moving (not just when > 1)
        const isKeyboardActive = height.value > 0;
        return {
            height: isKeyboardActive ? 0 : maxPadding,
        };
    }, [bottom, height]);

    const handleChangeText = (e: OnChangeTextEvent) => {
        const newContent = e.value;
        setContent(newContent);
        scheduleAutosave(newContent, html);
    };

    const handleChangeHtml = (e: OnChangeHtmlEvent) => {
        setHtml(e.value);
    };

    const handleChangeState = (state: OnChangeStateEvent) => {
        setStylesState(state);
    };

    const insideCurrentLink =
        stylesState.link.isActive &&
        currentLink.url.length > 0 &&
        (currentLink.start || currentLink.end) &&
        selection &&
        selection.start >= currentLink.start &&
        selection.end <= currentLink.end;

    const openLinkModal = () => {
        setIsLinkModalOpen(true);
    };

    const closeLinkModal = () => {
        setIsLinkModalOpen(false);
    };

    const submitLink = (text: string, url: string) => {
        if (!selection || url.length === 0) {
            closeLinkModal();
            return;
        }

        const newText = text.length > 0 ? text : url;

        if (insideCurrentLink) {
            ref.current?.setLink(currentLink.start, currentLink.end, newText, url);
        } else {
            ref.current?.setLink(selection.start, selection.end, newText, url);
        }

        closeLinkModal();
    };

    const handleLinkDetected = (state: OnLinkDetected) => {
        setCurrentLink(state);
    };

    // Auto-scroll to cursor position when selection changes
    const handleSelectionChangeEvent = (sel: OnChangeSelectionEvent) => {
        setSelection(sel);

        // Auto-scroll to cursor position when it's at the bottom
        // This ensures the cursor is visible when typing in long documents
        if (animatedScrollViewRef.current) {
            // Use requestAnimationFrame to ensure layout is complete
            requestAnimationFrame(() => {
                // Estimate cursor position based on line height
                const lineHeight = 28; // matches editorInput lineHeight
                const estimatedLines = content.split("\n").slice(0, Math.floor(sel.start / 50)).length;
                const estimatedCursorY = estimatedLines * lineHeight;

                // Get current keyboard height from shared value
                const keyboardHeight = height.value;

                // Calculate visible area (viewport height minus keyboard and toolbar)
                const visibleAreaHeight = 600; // approximate screen height, adjust as needed
                const availableSpace = visibleAreaHeight - keyboardHeight - bottomBarHeight - 100; // 100px padding

                // Scroll if cursor is likely below visible area
                if (estimatedCursorY > availableSpace) {
                    animatedScrollViewRef.current?.scrollTo({
                        y: estimatedCursorY - availableSpace + 150, // extra padding to keep cursor well visible
                        animated: true,
                    });
                }
            });
        }
    };

    const handleContentSizeChange = (w: number, h: number) => {
        scrollViewContentHeight.current = h;
    };

    if (isLoading) return <PageLoader />;

    const handleBottomBarLayout = (e: LayoutChangeEvent) => {
        const next = e.nativeEvent.layout.height;
        setBottomBarHeight((prev) => {
            const v = next > prev ? next : prev;
            bottomBarHeightSV.value = v;
            return v;
        });
    };

    return (
        <KeyboardGestureArea
            // offset={bottomBarHeight}
            style={editorStyles.container}
            textInputNativeID="rich-editor"
        >
            <Reanimated.ScrollView
                ref={animatedScrollViewRef}
                animatedProps={animatedProps}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior="automatic"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                // contentContainerStyle={{
                //     paddingBottom: Math.max(bottomBarHeight, bottom + 16),
                // }}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={handleContentSizeChange}
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

                <Reanimated.View style={bottomSafeAreaSpacerStyle} />
            </Reanimated.ScrollView>

            <Reanimated.View
                style={[
                    {
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 10,
                        elevation: 10,
                    },
                    bottomBarAnimatedStyle,
                ]}
                pointerEvents="box-none"
            >
                <Box onLayout={handleBottomBarLayout} className="py-2 bg-background-50">
                    <Toolbar stylesState={stylesState} editorRef={ref} onOpenLinkModal={openLinkModal} />
                </Box>
            </Reanimated.View>

            <LinkModal
                isOpen={isLinkModalOpen}
                editedText={insideCurrentLink ? currentLink.text : (selection?.text ?? "")}
                editedUrl={insideCurrentLink ? currentLink.url : ""}
                onSubmit={submitLink}
                onClose={closeLinkModal}
            />
        </KeyboardGestureArea>
    );
}
