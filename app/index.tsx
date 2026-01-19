import { CaptureComponent } from "@/components/capture.component"
import { Box } from "@/components/ui/box"

export default function Index() {
    return (
        <Box className={`flex-1 border border-blue-500`}>
            <CaptureComponent />
        </Box>
    )
}
