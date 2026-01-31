import Editor from "@/components/editor";
import { EditorHeader } from "@/components/editor/editor-header";
import { PageWrapper } from "@/components/page-wrapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { KeyboardController } from "react-native-keyboard-controller";

export default function EditNoteScreen() {
    const { id, taskMode } = useLocalSearchParams<{ id: string; taskMode?: string }>();
    const router = useRouter();
    const insertTaskRef = useRef<(() => void) | null>(null);
    const isTaskMode = taskMode === "true";

    const handleBack = async () => {
        router.back();
        KeyboardController.dismiss();
    };

    const handleViewNotes = async () => {
        router.push("/notes" as any);
        KeyboardController.dismiss();
    };

    return (
        <PageWrapper disableBottomPadding>
            <EditorHeader isEditing={true} handleBack={handleBack} handleViewNotes={handleViewNotes} />
            <Editor
                noteId={id || null}
                onInsertTaskReady={(fn) => (insertTaskRef.current = fn)}
                taskMode={isTaskMode}
            />
        </PageWrapper>
    );
}
