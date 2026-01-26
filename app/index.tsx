import { SpeedDial, type FabAction } from "@/components/fab";
import { PageWrapper } from "@/components/page-wrapper";
import RichEditor from "@/components/rich-editor";
import { EditorHeader } from "@/components/rich-editor/editor-header";
import { useRouter } from "expo-router";
import { CameraIcon, MicIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback } from "react";
import { KeyboardController } from "react-native-keyboard-controller";

export default function Index() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const handleVoiceCapture = useCallback(() => {
        router.push("/voice" as any);
    }, [router]);

    const handleScanCapture = useCallback(() => {
        router.push("/scan" as any);
    }, [router]);

    const fabActions: FabAction[] = [
        {
            id: "scan",
            label: "Scan",
            icon: CameraIcon,
            onPress: handleScanCapture,
            backgroundColor: isDark ? "#1A1A1B" : "#fff",
            color: isDark ? "#fff" : "#000",
        },
        {
            id: "voice",
            label: "Voice",
            icon: MicIcon,
            onPress: handleVoiceCapture,
            backgroundColor: isDark ? "#1A1A1B" : "#fff",
            color: isDark ? "#fff" : "#000",
        },
    ];

    const handleViewNotes = async () => {
        router.push("/notes" as any);
        KeyboardController.dismiss();
    };
    const handleBack = async () => {
        router.back();
        KeyboardController.dismiss();
    };

    return (
        <PageWrapper disableBottomPadding>
            <EditorHeader isEditing={false} handleBack={handleBack} handleViewNotes={handleViewNotes} />
            <RichEditor />
            <SpeedDial actions={fabActions} position="bottom-right" />
        </PageWrapper>
    );
}
