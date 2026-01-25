import { PageWrapper } from "@/components/page-wrapper"
import RichEditor from "@/components/rich-editor"
import { EditorHeader } from "@/components/rich-editor/editor-header"
import { useLocalSearchParams, useRouter } from "expo-router"
import { KeyboardController } from "react-native-keyboard-controller"

export default function EditNoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()

    const handleBack = async () => {
        await KeyboardController.dismiss()
        router.back()
    }

    const handleViewNotes = async () => {
        await KeyboardController.dismiss()
        router.push("/notes" as any)
    }

    return (
        <PageWrapper disableBottomPadding>
            <EditorHeader isEditing={true} handleBack={handleBack} handleViewNotes={handleViewNotes} />
            <RichEditor noteId={id || null} />
        </PageWrapper>
    )
}
