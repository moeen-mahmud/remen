import { DatePickerModal } from "@/components/date-picker-modal";
import Editor from "@/components/editor";
import { EditorHeader } from "@/components/editor/editor-header";
import { SpeedDial, type FabAction } from "@/components/fab";
import { PageWrapper } from "@/components/page-wrapper";
import { createNote } from "@/lib/database";
import { requestNotificationPermissions, scheduleReminder } from "@/lib/reminders";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Bell, CameraIcon, MicIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { KeyboardController } from "react-native-keyboard-controller";

export default function Index() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedReminderDate, setSelectedReminderDate] = useState<Date>(new Date());

    const handleVoiceCapture = useCallback(() => {
        router.push("/voice" as any);
    }, [router]);

    const handleScanCapture = useCallback(() => {
        router.push("/scan" as any);
    }, [router]);

    const createReminderNoteWithDate = useCallback(
        async (reminderDate: Date) => {
            if (reminderDate.getTime() <= Date.now()) {
                Alert.alert("Invalid Date", "Reminder time must be in the future");
                return;
            }

            try {
                // Request permissions first
                const hasPermission = await requestNotificationPermissions();
                if (!hasPermission) {
                    Alert.alert("Permission Required", "Please enable notifications in Settings to set reminders.");
                    return;
                }

                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                // Create note with placeholder content
                const note = await createNote({
                    content: "Reminder",
                    type: "task",
                });

                // Schedule the reminder
                const notificationId = await scheduleReminder(note.id, reminderDate);
                if (!notificationId) {
                    Alert.alert("Error", "Failed to set reminder. Please try again.");
                    return;
                }

                // Navigate to the note so user can edit it
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push(`/notes/${note.id}` as any);
            } catch (error) {
                console.error("Error creating reminder note:", error);
                Alert.alert("Error", "Failed to create reminder. Please try again.");
            }
        },
        [router],
    );

    const createReminderNote = useCallback(
        async (hours: number) => {
            const date = new Date();
            date.setHours(date.getHours() + hours);
            await createReminderNoteWithDate(date);
        },
        [createReminderNoteWithDate],
    );

    const handleReminderCapture = useCallback(() => {
        // Show alert with quick options
        const options: any[] = [
            { text: "Cancel", style: "cancel" as const },
            {
                text: "In 1 hour",
                onPress: () => createReminderNote(1),
            },
            {
                text: "In 2 hours",
                onPress: () => createReminderNote(2),
            },
            {
                text: "Tomorrow at 9 AM",
                onPress: () => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(9, 0, 0, 0);
                    createReminderNoteWithDate(date);
                },
            },
            {
                text: "Tomorrow at 6 PM",
                onPress: () => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(18, 0, 0, 0);
                    createReminderNoteWithDate(date);
                },
            },
            {
                text: "Custom",
                onPress: () => {
                    setSelectedReminderDate(new Date());
                    setIsDatePickerOpen(true);
                },
            },
        ];

        Alert.alert("Set Reminder", "Choose when to be reminded", options, { cancelable: true });
    }, [createReminderNote, createReminderNoteWithDate]);

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
        {
            id: "reminder",
            label: "Reminder",
            icon: Bell,
            onPress: handleReminderCapture,
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

    const handleReminderDateChange = useCallback((date: Date) => {
        setSelectedReminderDate(date);
    }, []);

    const handleReminderDateConfirm = useCallback(
        (date: Date) => {
            setIsDatePickerOpen(false);
            createReminderNoteWithDate(date);
        },
        [createReminderNoteWithDate],
    );

    return (
        <PageWrapper disableBottomPadding>
            <EditorHeader isEditing={false} handleBack={handleBack} handleViewNotes={handleViewNotes} />
            <Editor />
            <SpeedDial actions={fabActions} position="bottom-right" />
            <DatePickerModal
                visible={isDatePickerOpen}
                date={selectedReminderDate}
                onDateChange={handleReminderDateChange}
                onConfirm={handleReminderDateConfirm}
                onCancel={() => setIsDatePickerOpen(false)}
                minimumDate={new Date()}
                title="Set Reminder"
                confirmText="Create"
                cancelText="Cancel"
            />
        </PageWrapper>
    );
}
