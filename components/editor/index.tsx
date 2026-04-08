import { ContextualRecallTray } from "@/components/editor/contextual-recall-tray";
import { editorStyles } from "@/components/editor/editor-styles";
import { EditorTaskLine } from "@/components/editor/editor-task-line";
import { PageLoader } from "@/components/ui/page-loader";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { TASK_PATTERNS } from "@/lib/config/regex-patterns";
import { AUTOSAVE_DELAY } from "@/lib/consts/consts";
import { createNote, getNoteById, updateNote } from "@/lib/database/database";
import { NoteType } from "@/lib/database/database.types";
import { useContextualRecall } from "@/lib/hooks/use-contextual-recall";
import { syncTasksFromText } from "@/lib/tasks/tasks";
import { useTheme } from "@/lib/theme/use-theme";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, TextInput } from "react-native";
import { KeyboardGestureArea } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TASK_LINE_REGEX = /^(\s*)-\s+\[([\sxX])\]\s+(.*)$/;

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

    const router = useRouter();
    const { embeddings } = useAI();

    const [isLoading, setIsLoading] = useState(!!initialNoteId);
    const [currentNoteId, setCurrentNoteId] = useState<string | null>(initialNoteId);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedContentRef = useRef<string>("");
    const [content, setContent] = useState("");
    const [noteType, setNoteType] = useState<NoteType | null>(null);
    // Track which line to auto-focus (for new task insertion)
    const [focusLineIndex, setFocusLineIndex] = useState<number | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const textInputRef = useRef<TextInput>(null);
    const taskInputRefs = useRef<Map<number, TextInput | null>>(new Map());

    const { relatedNotes, isDismissed, dismiss } = useContextualRecall(currentNoteId, content, embeddings);

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
                    setNoteType(note.type);
                    lastSavedContentRef.current = note.content;
                } else {
                    setCurrentNoteId(null);
                    setNoteType(null);
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

    // Focus management for newly inserted task lines
    useEffect(() => {
        if (focusLineIndex !== null) {
            const ref = taskInputRefs.current.get(focusLineIndex);
            if (ref) {
                ref.focus();
            }
            setFocusLineIndex(null);
        }
    }, [focusLineIndex, content]);

    const saveNote = useCallback(
        async (noteContent: string, noteId: string | null) => {
            if (noteContent === lastSavedContentRef.current && noteId) {
                return noteId;
            }

            try {
                const hasTasks = TASK_PATTERNS.test(noteContent);
                const newNoteType = hasTasks ? ("task" as const) : undefined;

                if (noteId) {
                    const trimmed = noteContent.trim().length > 0 ? noteContent : "";
                    const updatedNote = await updateNote(noteId, { content: trimmed, type: newNoteType });
                    if (updatedNote) {
                        setNoteType(updatedNote.type);
                    }
                    lastSavedContentRef.current = noteContent;

                    try {
                        await syncTasksFromText(noteId, trimmed);
                    } catch (error) {
                        console.error("Failed to sync tasks:", error);
                    }

                    aiQueue.setModels({ embeddings });
                    aiQueue.add({ noteId, content: trimmed }, true);

                    return noteId;
                } else {
                    const note = await createNote({ content: noteContent, type: newNoteType });
                    setNoteType(note.type);
                    lastSavedContentRef.current = noteContent;

                    try {
                        await syncTasksFromText(note.id, noteContent);
                    } catch (error) {
                        console.error("Failed to sync tasks:", error);
                    }

                    aiQueue.setModels({ embeddings });
                    aiQueue.add({ noteId: note.id, content: noteContent }, true);

                    return note.id;
                }
            } catch (error) {
                console.error("Failed to save note:", error);
                return noteId;
            }
        },
        [embeddings],
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

    // --- Line-level helpers for task rendering ---

    const lines = useMemo(() => content.split("\n"), [content]);

    const updateContentFromLines = useCallback(
        (newLines: string[]) => {
            const newContent = newLines.join("\n");
            setContent(newContent);
            scheduleAutosave(newContent);
        },
        [scheduleAutosave],
    );

    const handleTaskToggle = useCallback(
        (lineIndex: number) => {
            const newLines = [...lines];
            const line = newLines[lineIndex];
            const match = line.match(TASK_LINE_REGEX);
            if (!match) return;

            const [, indent, checkbox, taskContent] = match;
            const newCheckbox = checkbox.toLowerCase() === "x" ? " " : "x";
            newLines[lineIndex] = `${indent}- [${newCheckbox}] ${taskContent}`;
            updateContentFromLines(newLines);
        },
        [lines, updateContentFromLines],
    );

    const handleTaskContentChange = useCallback(
        (lineIndex: number, newTaskContent: string) => {
            const newLines = [...lines];
            const line = newLines[lineIndex];
            const match = line.match(TASK_LINE_REGEX);
            if (!match) return;

            const [, indent, checkbox] = match;
            newLines[lineIndex] = `${indent}- [${checkbox}] ${newTaskContent}`;
            updateContentFromLines(newLines);
        },
        [lines, updateContentFromLines],
    );

    const handleTaskSubmit = useCallback(
        (lineIndex: number) => {
            // Insert a new empty task after this line
            const newLines = [...lines];
            newLines.splice(lineIndex + 1, 0, "- [ ] ");
            updateContentFromLines(newLines);
            setFocusLineIndex(lineIndex + 1);
        },
        [lines, updateContentFromLines],
    );

    const handleTaskBackspaceEmpty = useCallback(
        (lineIndex: number) => {
            // Remove the empty task line
            const newLines = [...lines];
            newLines.splice(lineIndex, 1);
            if (newLines.length === 0) newLines.push("");
            updateContentFromLines(newLines);
            // Focus previous task or text
            if (lineIndex > 0) {
                setFocusLineIndex(lineIndex - 1);
            }
        },
        [lines, updateContentFromLines],
    );

    // Handle text block changes (non-task lines grouped together)
    const handleTextBlockChange = useCallback(
        (startLine: number, endLine: number, newText: string) => {
            const newLines = [...lines];
            const newBlockLines = newText.split("\n");

            // Check if user just typed "- " at end of new block — convert to task
            const lastNewLine = newBlockLines[newBlockLines.length - 1];
            if (lastNewLine.trim() === "- " && !lastNewLine.includes("[")) {
                newBlockLines[newBlockLines.length - 1] = lastNewLine.replace(/^(\s*)- $/, "$1- [ ] ");
            }

            newLines.splice(startLine, endLine - startLine + 1, ...newBlockLines);
            updateContentFromLines(newLines);
        },
        [lines, updateContentFromLines],
    );

    // Determine if content has any tasks
    const hasTasks = useMemo(() => lines.some((line) => TASK_LINE_REGEX.test(line)), [lines]);

    // Build segments: consecutive non-task lines grouped into text blocks
    const segments = useMemo(() => {
        if (!hasTasks) return null; // Use plain TextInput when no tasks

        const segs: (
            | { type: "task"; lineIndex: number; isCompleted: boolean; content: string }
            | { type: "text"; startLine: number; endLine: number; text: string }
        )[] = [];

        let textStart: number | null = null;

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(TASK_LINE_REGEX);
            if (match) {
                // Flush pending text block
                if (textStart !== null) {
                    segs.push({
                        type: "text",
                        startLine: textStart,
                        endLine: i - 1,
                        text: lines.slice(textStart, i).join("\n"),
                    });
                    textStart = null;
                }
                segs.push({
                    type: "task",
                    lineIndex: i,
                    isCompleted: match[2].toLowerCase() === "x",
                    content: match[3],
                });
            } else {
                if (textStart === null) textStart = i;
            }
        }

        // Flush trailing text block
        if (textStart !== null) {
            segs.push({
                type: "text",
                startLine: textStart,
                endLine: lines.length - 1,
                text: lines.slice(textStart).join("\n"),
            });
        }

        return segs;
    }, [lines, hasTasks]);

    if (isLoading) return <PageLoader />;

    // --- Plain TextInput mode (no tasks) ---
    const renderPlainEditor = () => (
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
            onChangeText={(text) => {
                // Auto-convert "- " to task in non-task mode
                const newLines = text.split("\n");
                const lastLine = newLines[newLines.length - 1];
                if (lastLine.trim() === "- " && !lastLine.includes("[")) {
                    newLines[newLines.length - 1] = lastLine.replace(/^(\s*)- $/, "$1- [ ] ");
                    const converted = newLines.join("\n");
                    setContent(converted);
                    scheduleAutosave(converted);
                    return;
                }

                setContent(text);
                scheduleAutosave(text);
            }}
            placeholder={taskMode || noteType === "task" ? "Add tasks..." : placeholder}
            placeholderTextColor={placeholderTextColor}
            multiline
            textAlignVertical="top"
            autoCapitalize="sentences"
            autoFocus={taskMode}
            scrollEnabled={false}
        />
    );

    // --- Task-aware editor (interactive checkboxes) ---
    const renderTaskEditor = () => (
        <>
            {segments!.map((seg, i) => {
                if (seg.type === "task") {
                    return (
                        <EditorTaskLine
                            key={`task-${seg.lineIndex}`}
                            content={seg.content}
                            isCompleted={seg.isCompleted}
                            onToggle={() => handleTaskToggle(seg.lineIndex)}
                            onChangeContent={(text) => handleTaskContentChange(seg.lineIndex, text)}
                            onSubmitEditing={() => handleTaskSubmit(seg.lineIndex)}
                            onBackspaceEmpty={() => handleTaskBackspaceEmpty(seg.lineIndex)}
                            autoFocus={focusLineIndex === seg.lineIndex}
                            inputRef={(ref) => taskInputRefs.current.set(seg.lineIndex, ref)}
                        />
                    );
                }

                return (
                    <TextInput
                        key={`text-${seg.startLine}`}
                        style={[
                            editorStyles.editorInput,
                            { color: textColor },
                            // First text block before any tasks: give it some min height
                            i === 0 && seg.startLine === 0 ? { minHeight: 60 } : undefined,
                        ]}
                        value={seg.text}
                        onChangeText={(text) => handleTextBlockChange(seg.startLine, seg.endLine, text)}
                        placeholder={i === 0 && seg.startLine === 0 ? placeholder : undefined}
                        placeholderTextColor={placeholderTextColor}
                        multiline
                        textAlignVertical="top"
                        autoCapitalize="sentences"
                        scrollEnabled={false}
                    />
                );
            })}
        </>
    );

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
                {hasTasks && segments ? renderTaskEditor() : renderPlainEditor()}
            </ScrollView>
            {!isDismissed && (
                <ContextualRecallTray
                    notes={relatedNotes}
                    onNotePress={(note) => router.push(`/notes/${note.id}` as any)}
                    onDismiss={dismiss}
                />
            )}
        </KeyboardGestureArea>
    );
}
