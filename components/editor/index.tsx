import { editorStyles } from "@/components/editor/editor-styles";
import { PageLoader } from "@/components/ui/page-loader";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { createNote, getNoteById, updateNote } from "@/lib/database";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, TextInput } from "react-native";
import { KeyboardGestureArea } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AUTOSAVE_DELAY = 100;

interface EditorProps {
    noteId?: string | null;
    placeholder?: string;
}

export default function Editor({ noteId: initialNoteId = null, placeholder = "What's on your mind?" }: EditorProps) {
    const { bottom } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const { llm, embeddings } = useAI();

    const [isLoading, setIsLoading] = useState(!!initialNoteId);
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>("");
    const [content, setContent] = useState("");

    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

    // Dismiss keyboard when route loses focus
    // useFocusEffect(
    //     useCallback(() => {
    //         return () => {
    //             Keyboard.dismiss();
    //         };
    //     }, []),
    // );

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
            if (noteContent === lastSavedContentRef.current && noteId) {
                return noteId;
            }

            try {
                if (noteId) {
                    const content = noteContent.trim().length > 0 ? noteContent : "";
                    await updateNote(noteId, { content });
                    lastSavedContentRef.current = noteContent;

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId, content }, true);

                    return noteId;
                } else {
                    const note = await createNote({ content: noteContent });
                    lastSavedContentRef.current = noteContent;

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId: note.id, content: noteContent }, true);

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

    const handleChangeText = (text: string) => {
        setContent(text);
        scheduleAutosave(text);
    };

    if (isLoading) return <PageLoader />;

    return (
        <KeyboardGestureArea offset={20} style={editorStyles.container} interpolator="ios">
            <ScrollView
                ref={scrollViewRef}
                style={{ flex: 1 }}
                contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: bottom + 16,
                }}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                automaticallyAdjustKeyboardInsets={true}
            >
                <TextInput
                    ref={textInputRef}
                    style={[
                        editorStyles.editorInput,
                        {
                            color: isDark ? "#ffffff" : "#000000",
                            minHeight: "100%",
                        },
                    ]}
                    value={content}
                    onChangeText={handleChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? "#555555" : "#aaaaaa"}
                    multiline
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    autoFocus={false}
                    scrollEnabled={false}
                />
            </ScrollView>
        </KeyboardGestureArea>
    );
}
