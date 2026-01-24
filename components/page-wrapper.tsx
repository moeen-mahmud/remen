import { Box } from "@/components/ui/box"
import { useSafeAreaInsets } from "react-native-safe-area-context"
export const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { bottom } = useSafeAreaInsets()
    return (
        <Box style={{ paddingBottom: bottom + 40 }} className="flex-1 bg-background-50">
            {children}
        </Box>
    )
}
