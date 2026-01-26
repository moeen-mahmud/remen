import { FabAction, SpeedDial } from "@/components/fab";
import { NoteDetails } from "@/components/notes/notes-details";
import { PageWrapper } from "@/components/page-wrapper";
import { SettingsHeader } from "@/components/settings/settings-header";
import { archiveNote, moveToTrash } from "@/lib/database";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Archive, Recycle } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Alert } from "react-native";

export default function NoteDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const handleTrash = () => {
        Alert.alert("Move to Recycle Bin", `You can restore this note later`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Move",
                style: "default",
                onPress: async () => {
                    await moveToTrash(id);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.replace("/notes");
                },
            },
        ]);
    };

    const handleArchive = async () => {
        await archiveNote(id);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/notes");
    };
    const fabActions: FabAction[] = [
        {
            id: "archive",
            label: "Archive",
            icon: Archive,
            onPress: handleArchive,
            color: isDark ? "#fff" : "#000",
            backgroundColor: isDark ? "#1A1A1B" : "#fff",
        },
        {
            id: "trash",
            label: "Trash",
            icon: Recycle,
            onPress: handleTrash,
            color: isDark ? "#fff" : "#000",
            backgroundColor: isDark ? "#1A1A1B" : "#fff",
        },
    ];
    return (
        <PageWrapper disableBottomPadding>
            <SettingsHeader title="View Note" showBackButton={true} />
            <NoteDetails id={id} />
            <SpeedDial actions={fabActions} position="bottom-right" />
        </PageWrapper>
    );
}
