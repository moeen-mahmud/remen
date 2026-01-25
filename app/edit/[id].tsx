import { PageWrapper } from "@/components/page-wrapper"
import RichEditor from "@/components/rich-editor"
import { EditorHeader } from "@/components/rich-editor/editor-header"
import { useLocalSearchParams, useRouter } from "expo-router"

export default function EditNoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()

    const handleClose = () => {
        router.back()
    }

    const handleViewNotes = () => {
        router.push("/notes" as any)
    }

    return (
        <PageWrapper disableBottomPadding>
            <EditorHeader isEditing={true} handleBack={handleClose} handleViewNotes={handleViewNotes} />
            <RichEditor noteId={id || null} onClose={handleClose} />
        </PageWrapper>
    )
}
