import { editorStyles } from "@/components/editor/editor-styles";
import { PageLoader } from "@/components/ui/page-loader";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { TASK_PATTERNS } from "@/lib/config/regex-patterns";
import { AUTOSAVE_DELAY } from "@/lib/consts/consts";
import { createNote, getNoteById, updateNote } from "@/lib/database/database";
import { NoteType } from "@/lib/database/database.types";
import { syncTasksFromText } from "@/lib/tasks/tasks";
import { useTheme } from "@/lib/theme/use-theme";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, ScrollView, TextInput } from "react-native";
import { KeyboardGestureArea } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EditorProps {
    noteId?: string | null;
    placeholder?: string;
    onInsertTaskReady?: (insertTask: () => void) => void;
    taskMode?: boolean;
}

export default function Editor({
    noteId: initialNoteId = null,
    placeholder = "What's on your mind?",
    onInsertTaskReady,
    taskMode = false,
}: EditorProps) {
    const { bottom } = useSafeAreaInsets();
    const { textColor, placeholderTextColor } = useTheme();

    const { llm, embeddings } = useAI();

    const [isLoading, setIsLoading] = useState(!!initialNoteId);
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>("");
    const [content, setContent] = useState("");
    const [noteType, setNoteType] = useState<NoteType | null>(null);
    const previousContentRef = useRef<string>("");

    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);

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
                    previousContentRef.current = note.content;
                    setCurrentNoteId(note.id);
                    setNoteType(note.type);
                    lastSavedContentRef.current = note.content;
                } else {
                    setCurrentNoteId(null);
                    setNoteType(null);
                    previousContentRef.current = "";
                }
            } catch (error) {
                console.error("Failed to load note:", error);
                setCurrentNoteId(null);
            } finally {
                setIsLoading(false);
            }
        }

        loadNote();
    }, [initialNoteId, taskMode]);

    const saveNote = useCallback(
        async (noteContent: string, noteId: string | null) => {
            if (noteContent === lastSavedContentRef.current && noteId) {
                return noteId;
            }

            try {
                // Check if note has tasks - if so, set type to "task"
                const hasTasks = TASK_PATTERNS.test(noteContent);
                const newNoteType = hasTasks ? ("task" as const) : undefined;

                if (noteId) {
                    const content = noteContent.trim().length > 0 ? noteContent : "";
                    const updatedNote = await updateNote(noteId, { content, type: newNoteType });
                    if (updatedNote) {
                        setNoteType(updatedNote.type);
                    }
                    lastSavedContentRef.current = noteContent;

                    // Sync tasks from text to database
                    try {
                        await syncTasksFromText(noteId, content);
                    } catch (error) {
                        console.error("Failed to sync tasks:", error);
                    }

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId, content }, true);

                    return noteId;
                } else {
                    const note = await createNote({ content: noteContent, type: newNoteType });
                    setNoteType(note.type);
                    lastSavedContentRef.current = noteContent;

                    // Sync tasks from text to database
                    try {
                        await syncTasksFromText(note.id, noteContent);
                    } catch (error) {
                        console.error("Failed to sync tasks:", error);
                    }

                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId: note.id, content: noteContent }, true);

                    return note.id;
                }
            } catch (error) {
                console.error("Failed to save note:", error);
                return noteId;
            }
        },
        [llm, embeddings], // noteType is intentionally excluded - we check it in the function body
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
        const previousContent = previousContentRef.current;
        previousContentRef.current = text;

        // Determine if we're in task mode (either explicit prop or note type is "task")
        const isInTaskMode = taskMode || noteType === "task";

        // Task mode: Fast path for newline detection - check if Enter was just pressed
        if (
            isInTaskMode &&
            text.length > previousContent.length &&
            text.endsWith("\n") &&
            !previousContent.endsWith("\n")
        ) {
            // User just pressed Enter - insert task checkbox immediately
            const textWithoutNewline = text.slice(0, -1);
            // const previousLines = previousContent.split("\n");
            // const previousLastLine = previousLines[previousLines.length - 1] || "";

            // Extract indent from previous task line (fast regex match)
            // const taskMatch = previousLastLine.match(TASK_PATTERNS);
            // const indent = taskMatch ? taskMatch[1] : "";

            // Insert task checkbox on new line - single string operation
            const newText = textWithoutNewline + "\n" + "- [ ] ";
            console.log("newText", newText);
            setContent(newText);
            scheduleAutosave(newText);
            return;
        }

        if (!isInTaskMode) {
            const lines = text.split("\n");
            const lastLine = lines[lines.length - 1];
            const previousLines = previousContent.split("\n");

            // Check if user just typed "- " at the start of a line
            if (lastLine.trim() === "-" && previousLines.length === lines.length) {
                // User is typing "- ", wait for space
                setContent(text);
                scheduleAutosave(text);
                return;
            }

            const convertedLines = lines.map((line, index) => {
                // Only convert if it's a new line that starts with "- " and isn't already a task
                if (index === lines.length - 1 && line.trim() === "- " && !line.includes("[")) {
                    return line.replace(/^(\s*)- $/, "$1- [ ] ");
                }
                return line;
            });

            const convertedText = convertedLines.join("\n");
            setContent(convertedText);
            scheduleAutosave(convertedText);
            return;
        }

        // Regular text change in task mode (no newline detected)
        setContent(text);
        scheduleAutosave(text);
    };

    // const handleInsertTask = useCallback(() => {
    //     const currentText = content;
    //     const lines = currentText.split("\n");
    //     const lastLine = lines[lines.length - 1];
    //     const indent = lastLine.match(/^(\s*)/)?.[1] || "";

    //     // Insert task at current position or new line
    //     const taskText = currentText.length > 0 && !currentText.endsWith("\n") ? "\n" : "";
    //     const newContent = currentText + taskText + indent + "- [ ] ";

    //     console.log("newContent", newContent);
    //     setContent(newContent);
    //     scheduleAutosave(newContent);
    // }, [content, scheduleAutosave]);

    // // Expose insertTask handler to parent
    // useEffect(() => {
    //     if (onInsertTaskReady) {
    //         onInsertTaskReady(handleInsertTask);
    //     }
    // }, [onInsertTaskReady, handleInsertTask]);

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
                            color: textColor,
                            minHeight: "100%",
                        },
                    ]}
                    value={content}
                    onChangeText={handleChangeText}
                    placeholder={taskMode || noteType === "task" ? "Add tasks..." : placeholder}
                    placeholderTextColor={placeholderTextColor}
                    multiline
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    autoFocus={taskMode}
                    scrollEnabled={false}
                />
            </ScrollView>
        </KeyboardGestureArea>
    );
}
