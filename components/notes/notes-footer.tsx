import { Box } from "@/components/ui/box"
import { Text } from "@/components/ui/text"

export const NotesFooter: React.FC = () => {
    return (
        <Box className="px-4 py-4">
            <Text className="text-sm font-medium text-center text-typography-500">You&apos;re all caught up!</Text>
        </Box>
    )
}
