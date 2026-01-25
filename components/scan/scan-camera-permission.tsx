import { Box } from "@/components/ui/box"
import { Button, ButtonText } from "@/components/ui/button"
import { Text } from "@/components/ui/text"

type ScanCameraPermissionProps = {
    requestPermission: () => void
}

export const ScanCameraPermission: React.FC<ScanCameraPermissionProps> = ({ requestPermission }) => {
    return (
        <Box className="flex-1 justify-center items-center p-6">
            <Text className="mb-6 text-lg text-center text-typography-600">
                Camera permission is required to scan documents
            </Text>
            <Button variant="outline" action="secondary" onPress={requestPermission} className="px-4 py-2 rounded-md">
                <ButtonText>Grant Permission</ButtonText>
            </Button>
        </Box>
    )
}
