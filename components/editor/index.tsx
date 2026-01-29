import { editorStyles } from "@/components/editor/editor-styles";
import { PageLoader } from "@/components/ui/page-loader";
import { useKeyboardAnimation } from "@/hooks/use-keyboard-animation";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { createNote, getNoteById, updateNote } from "@/lib/database";
import { useFocusEffect } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Dimensions, Keyboard, TextInput } from "react-native";
import { KeyboardGestureArea } from "react-native-keyboard-controller";
import Reanimated, { useAnimatedProps, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTOSAVE_DELAY = 100;
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

interface EditorProps {
    noteId?: string | null;
    placeholder?: string;
}

export default function Editor({ noteId: initialNoteId = null, placeholder = "What's on your mind?" }: EditorProps) {
    const { height, inset, progress, offset, onScroll } = useKeyboardAnimation();
    const { bottom } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const bottomBarHeightSV = useSharedValue(64);

    const scrollViewAnimatedProps = useAnimatedProps(() => ({
        contentInset: {
            // Keep caret/content above both the keyboard and the toolbar.
            // Toolbar is only visible while the keyboard is visible (progress 0..1).
            bottom: inset.value + bottomBarHeightSV.value * progress.value,
        },
        contentOffset: {
            x: 0,
            y: offset.value,
        },
    }));

    const { llm, embeddings } = useAI();

    const [isLoading, setIsLoading] = useState(!!initialNoteId);

    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>("");

    const [content, setContent] = useState("");

    const animatedScrollViewRef = useRef<Reanimated.ScrollView>(null);
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
        async (noteContent: string, noteId: string | null) => {
            // if (noteContent.trim().length === 0) return null;

            if (noteContent === lastSavedContentRef.current && noteId) {
                return noteId;
            }

            try {
                if (noteId) {
                    const content = noteContent.trim().length > 0 ? noteContent : "";
                    await updateNote(noteId, {
                        content,
                        // html: noteHtml,
                    });
                    lastSavedContentRef.current = noteContent;

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId, content }, true);

                    return noteId;
                } else {
                    const note = await createNote({
                        content: noteContent,
                        // html: noteHtml,
                    });
                    lastSavedContentRef.current = noteContent;

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId: note.id, content: noteContent }, true);

                    // await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        (noteContent: string) => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Only prevent auto-creation of new empty notes
            // Allow updating existing notes with empty content
            if (noteContent.trim().length === 0 && !currentNoteId) {
                return;
            }

            saveTimeoutRef.current = setTimeout(async () => {
                const savedId = await saveNote(noteContent, currentNoteId);
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

        // Only prevent saving if content is empty AND there's no existing note
        if (content.trim().length === 0 && !currentNoteId) return;

        const savedId = await saveNote(content, currentNoteId);
        if (savedId && !currentNoteId) {
            setCurrentNoteId(savedId);
        }
    }, [content, currentNoteId, saveNote]);

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

    const bottomSafeAreaSpacerStyle = useAnimatedStyle(() => {
        const maxPadding = bottom + 8;
        // Remove spacer as soon as keyboard starts moving (not just when > 1)
        const isKeyboardActive = height.value > 0;
        return {
            height: isKeyboardActive ? 0 : maxPadding,
        };
    }, [bottom, height]);

    const handleChangeText = (text: string) => {
        setContent(text);
        scheduleAutosave(text);
    };

    const handleContentSizeChange = (w: number, h: number) => {
        scrollViewContentHeight.current = h;
    };

    if (isLoading) return <PageLoader />;

    return (
        <KeyboardGestureArea offset={0} style={editorStyles.container} textInputNativeID="rich-editor">
            {/* <KeyboardAvoidingView behavior="padding"> */}
            <Reanimated.ScrollView
                ref={animatedScrollViewRef}
                animatedProps={scrollViewAnimatedProps}
                automaticallyAdjustContentInsets={false}
                contentInsetAdjustmentBehavior="never"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: bottom + 16,
                }}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={handleContentSizeChange}
                onScroll={onScroll}
            >
                <TextInput
                    nativeID="rich-editor"
                    className="flex-1 px-4"
                    style={[
                        {
                            minHeight:
                                Dimensions.get("window").height -
                                bottom -
                                16 -
                                bottomBarHeightSV.value * progress.value,
                            paddingBottom: bottom,
                            color: isDark ? "#ffffff" : "#000000",
                        },
                        editorStyles.editorInput,
                    ]}
                    value={content}
                    onChangeText={handleChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? "#555555" : "#aaaaaa"}
                    multiline
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    autoFocus={false}
                />
                <Reanimated.View style={bottomSafeAreaSpacerStyle} />
            </Reanimated.ScrollView>
            {/* </KeyboardAvoidingView> */}
        </KeyboardGestureArea>
    );
}
