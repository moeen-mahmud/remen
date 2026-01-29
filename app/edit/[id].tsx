import Editor from "@/components/editor";
import { EditorHeader } from "@/components/editor/editor-header";
import { PageWrapper } from "@/components/page-wrapper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardController } from "react-native-keyboard-controller";

export default function EditNoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

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
            <Editor noteId={id || null} />
        </PageWrapper>
    );
}
