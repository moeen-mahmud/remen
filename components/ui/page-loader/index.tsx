import { Box } from "@/components/ui/box"
import { Spinner } from "@/components/ui/spinner"

export const PageLoader: React.FC = () => {
    return (
        <Box className="flex-1 justify-center items-center">
            <Spinner size="large" />
        </Box>
    )
}
