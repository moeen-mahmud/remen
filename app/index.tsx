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
            backgroundColor: isDark ? "#1a1b1c" : "#F8F8F8",
            color: isDark ? "#F8F8F8" : "#1a1b1c",
        },
        {
            id: "voice",
            label: "Voice",
            icon: MicIcon,
            onPress: handleVoiceCapture,
            backgroundColor: isDark ? "#E7000B" : "#F9423C",
            color: "#fff",
        },
    ]

    return (
        <Box className="flex-1 bg-background-50">
            <RichEditor showBackButton={false} />
            <SpeedDial actions={fabActions} position="bottom-right" />
        </Box>
    )
}
