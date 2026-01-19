import { Box } from "@/components/ui/box"
import { Fab, FabIcon, FabLabel } from "@/components/ui/fab"
import { Zap } from "lucide-react-native"

export function CaptureComponent() {
    return (
        <Box className="flex-1 items-center justify-center">
            <Fab size="lg" placement="bottom right" isHovered={false} isDisabled={false} isPressed={false}>
                <FabIcon as={Zap} />
                <FabLabel>Capture</FabLabel>
            </Fab>
        </Box>
    )
}
