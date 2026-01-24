import { SpeedDial, type FabAction } from "@/components/fab"
import RichEditor from "@/components/rich-editor"
import { Box } from "@/components/ui/box"
import { useRouter } from "expo-router"
import { CameraIcon, MicIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback } from "react"

export default function Index() {
    const router = useRouter()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const handleVoiceCapture = useCallback(() => {
        router.push("/voice" as any)
    }, [router])

    const handleScanCapture = useCallback(() => {
        router.push("/scan" as any)
    }, [router])

    const fabActions: FabAction[] = [
        {
            id: "scan",
            label: "Scan",
            icon: CameraIcon,
            onPress: handleScanCapture,
            backgroundColor: isDark ? "#000000" : "#fff",
            color: isDark ? "#fff" : "#000",
        },
        {
            id: "voice",
            label: "Voice",
            icon: MicIcon,
            onPress: handleVoiceCapture,
            backgroundColor: isDark ? "#000000" : "#fff",
            color: isDark ? "#fff" : "#000",
        },
    ]

    return (
        <Box className="flex-1 bg-background-50">
            <RichEditor showBackButton={false} />
            <SpeedDial actions={fabActions} position="bottom-right" />
        </Box>
    )
}
