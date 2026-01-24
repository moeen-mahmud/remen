import { RemenLogo } from "@/components/brand/logo"
import { editorStyles } from "@/components/rich-editor/editor-styles"
import { Box } from "@/components/ui/box"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { ArrowLeftIcon, ListIcon } from "lucide-react-native"
import { Pressable } from "react-native"

type EditorHeaderProps = {
    showBackButton: boolean
    handleBack: () => void
    handleViewNotes: () => void
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ showBackButton, handleBack, handleViewNotes }) => {
    return (
        <Box
            className="flex-row justify-between items-center px-4 py-2 border-b border-background-300"
            style={editorStyles.header}
        >
            {showBackButton ? (
                <Pressable hitSlop={10} onPress={handleBack} className="flex-row gap-2 justify-center items-center p-2">
                    <Icon as={ArrowLeftIcon} size="xl" className="text-background-900" />
                    <Text className="text-lg font-bold">Edit Note</Text>
                </Pressable>
            ) : (
                <Box className="min-w-11">
                    <RemenLogo size="md" showIcon={true} />
                </Box>
            )}

            {/* Spacer for header alignment */}
            <Pressable onPress={handleViewNotes} hitSlop={10}>
                <Icon as={ListIcon} size="xl" className="text-background-900" />
            </Pressable>
        </Box>
    )
}
