import { RemenLogo } from "@/components/brand/logo"
import { Box } from "@/components/ui/box"
import { Text } from "@/components/ui/text"

export const SettingsAbout: React.FC = () => {
    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">ABOUT</Text>

            <Box className="rounded-lg bg-background-0">
                <Box className="flex-row justify-between items-center p-4">
                    <RemenLogo size="sm" showIcon={true} />
                    <Text className="text-typography-500">Version 1.0.0</Text>
                </Box>
            </Box>
        </Box>
    )
}
