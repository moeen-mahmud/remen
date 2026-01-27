import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cancelNoteReminder, formatReminderDateDetailed, scheduleReminder } from "@/lib/reminders";
import { Bell, BellOff, Calendar, Clock } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, Platform, Pressable } from "react-native";

type ReminderPickerProps = {
    noteId: string;
    currentReminder: number | null;
    onReminderSet: (reminderAt: number | null) => void;
};

export const ReminderPicker: React.FC<ReminderPickerProps> = ({ noteId, currentReminder, onReminderSet }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isSetting, setIsSetting] = useState(false);

    const handleSetReminder = () => {
        // Show alert with quick options for both platforms
        const options: any[] = [
            { text: "Cancel", style: "cancel" as const },
            {
                text: "In 1 hour",
                onPress: () => {
                    const date = new Date();
                    date.setHours(date.getHours() + 1);
                    scheduleReminderForNote(date);
                },
            },
            {
                text: "In 2 hours",
                onPress: () => {
                    const date = new Date();
                    date.setHours(date.getHours() + 2);
                    scheduleReminderForNote(date);
                },
            },
            {
                text: "Tomorrow at 9 AM",
                onPress: () => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(9, 0, 0, 0);
                    scheduleReminderForNote(date);
                },
            },
            {
                text: "Tomorrow at 6 PM",
                onPress: () => {
                    const date = new Date();
                    date.setDate(date.getDate() + 1);
                    date.setHours(18, 0, 0, 0);
                    scheduleReminderForNote(date);
                },
            },
        ];

        // Add custom option for iOS only (Alert.prompt is iOS-only)
        if (Platform.OS === "ios" && Alert.prompt) {
            options.push({
                text: "Custom",
                onPress: () => {
                    Alert.prompt(
                        "Custom Reminder",
                        "Enter date and time (e.g., 2024-01-15 14:30)",
                        [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Set",
                                onPress: (text: string | undefined) => {
                                    if (text) {
                                        const date = new Date(text);
                                        if (!isNaN(date.getTime())) {
                                            scheduleReminderForNote(date);
                                        } else {
                                            Alert.alert("Invalid Date", "Please enter a valid date and time");
                                        }
                                    }
                                },
                            },
                        ],
                        "plain-text",
                    );
                },
            });
        }

        Alert.alert("Set Reminder", "Choose when to be reminded", options, { cancelable: true });
    };

    const scheduleReminderForNote = async (date: Date) => {
        if (date.getTime() <= Date.now()) {
            Alert.alert("Invalid Date", "Reminder time must be in the future");
            return;
        }

        setIsSetting(true);
        try {
            const notificationId = await scheduleReminder(noteId, date);
            if (notificationId) {
                onReminderSet(date.getTime());
            } else {
                Alert.alert("Error", "Failed to set reminder. Please check notification permissions.");
            }
        } catch (error) {
            console.error("Error setting reminder:", error);
            Alert.alert("Error", "Failed to set reminder");
        } finally {
            setIsSetting(false);
        }
    };

    const handleCancelReminder = async () => {
        Alert.alert("Cancel Reminder", "Are you sure you want to cancel this reminder?", [
            { text: "No", style: "cancel" },
            {
                text: "Yes",
                style: "destructive",
                onPress: async () => {
                    try {
                        await cancelNoteReminder(noteId);
                        onReminderSet(null);
                    } catch (error) {
                        console.error("Error canceling reminder:", error);
                        Alert.alert("Error", "Failed to cancel reminder");
                    }
                },
            },
        ]);
    };

    if (currentReminder) {
        const reminderDate = formatReminderDateDetailed(currentReminder);
        return (
            <Pressable onPress={handleCancelReminder}>
                <Box className="flex-row gap-2 items-center px-4 py-3 rounded-lg bg-background-50 dark:bg-background-100">
                    <Icon as={Bell} size="sm" color={isDark ? "#39FF14" : "#00B700"} />
                    <Box className="flex-1">
                        <Text className="text-sm font-medium text-typography-900 dark:text-typography-0">
                            Reminder set
                        </Text>
                        <Text className="text-xs text-typography-500">{reminderDate}</Text>
                    </Box>
                    <Pressable onPress={handleCancelReminder} hitSlop={10} className="p-1">
                        <Icon as={BellOff} size="sm" color={isDark ? "#666" : "#999"} />
                    </Pressable>
                </Box>
            </Pressable>
        );
    }

    return (
        <Pressable onPress={handleSetReminder} disabled={isSetting}>
            <Box className="flex-row gap-2 items-center px-4 py-3 rounded-lg bg-background-50 dark:bg-background-100">
                <Icon as={Calendar} size="sm" />
                <Text className="flex-1 text-sm font-medium">Set Reminder</Text>
                {isSetting ? (
                    <Text className="text-xs text-typography-500">Setting...</Text>
                ) : (
                    <Icon as={Clock} size="sm" />
                )}
            </Box>
        </Pressable>
    );
};
