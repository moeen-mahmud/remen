import RichEditor from "@/components/rich-editor"
import { useLocalSearchParams, useRouter } from "expo-router"

export default function EditNoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()

    const handleClose = () => {
        router.back()
    }

    return <RichEditor noteId={id || null} onClose={handleClose} showBackButton={true} showQuickActions={false} />
}
