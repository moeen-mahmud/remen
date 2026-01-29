import { FabAction, SpeedDial } from "@/components/fab";
import { NoteDetails } from "@/components/notes/notes-details";
import { PageWrapper } from "@/components/page-wrapper";
import { SettingsHeader } from "@/components/settings/settings-header";
import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { archiveNote, getNoteById, moveToTrash } from "@/lib/database";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { Archive, Edit, Recycle, Share2Icon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback } from "react";
import { Alert, Pressable, Share } from "react-native";

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
    const handleEdit = () => {
        router.push(`/edit/${id}`);
    };

    const handleShare = useCallback(async () => {
        const note = await getNoteById(id);
        if (!note) return;
        const content = `${note.title || "Untitled"}\n${note.content}`;

        try {
            await Share.share({
                message: content,
                title: `${note.title || "Untitled"} from Remen`,
            });
        } catch (error) {
            console.error("Share failed:", error);
        }
    }, [id]);
    return (
        <PageWrapper disableBottomPadding>
            <SettingsHeader
                title="View Note"
                showBackButton={true}
                rightButton={
                    <Box className="flex-row gap-4 justify-end items-center">
                        <Pressable hitSlop={10} onPress={handleEdit}>
                            <Icon as={Edit} />
                        </Pressable>
                        <Pressable hitSlop={10} onPress={handleShare}>
                            <Icon as={Share2Icon} />
                        </Pressable>
                    </Box>
                }
            />
            <NoteDetails id={id} />
            <SpeedDial actions={fabActions} position="bottom-right" />
        </PageWrapper>
    );
}
