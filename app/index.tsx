import { SpeedDial, type FabAction } from "@/components/fab"
import RichEditor from "@/components/rich-editor"
import { useRouter } from "expo-router"
import { CameraIcon, ListIcon, MicIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback } from "react"
import { View } from "react-native"

export default function Index() {
    const router = useRouter()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const handleViewNotes = useCallback(() => {
        router.push("/notes" as any)
    }, [router])

    const handleVoiceCapture = useCallback(() => {
        router.push("/voice" as any)
    }, [router])

    const handleScanCapture = useCallback(() => {
        router.push("/scan" as any)
    }, [router])

    const fabActions: FabAction[] = [
        {
            id: "notes",
            label: "All Notes",
            icon: ListIcon,
            onPress: handleViewNotes,
            backgroundColor: isDark ? "#272E38" : "#E8E8E8",
            color: isDark ? "#F8F8F8" : "#161616",
        },
        {
            id: "scan",
            label: "Scan",
            icon: CameraIcon,
            onPress: handleScanCapture,
            backgroundColor: isDark ? "#272E38" : "#E8E8E8",
            color: isDark ? "#F8F8F8" : "#161616",
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
        <View className="flex-1">
            <RichEditor showBackButton={false} showQuickActions={false} />
            <SpeedDial actions={fabActions} position="bottom-right" />
        </View>
    )
}
