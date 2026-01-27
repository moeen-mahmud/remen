import { DatePickerModal } from "@/components/date-picker-modal";
import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cancelNoteReminder, formatReminderDateDetailed, scheduleReminder } from "@/lib/reminders";
import { SquarePen } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Pressable } from "react-native";

type ReminderPickerProps = {
    noteId: string;
    currentReminder: number | null;
    onReminderSet: (reminderAt: number | null) => void;
};

export const ReminderPicker: React.FC<ReminderPickerProps> = ({ noteId, currentReminder, onReminderSet }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const [isSetting, setIsSetting] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(
        currentReminder ? new Date(currentReminder) : new Date(Date.now() + 60 * 60 * 1000), // Default to 1 hour from now
    );

    const handleOpenDatePicker = () => {
        if (currentReminder) {
            setSelectedDate(new Date(currentReminder));
        } else {
            setSelectedDate(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour from now
        }
        setIsDatePickerOpen(true);
    };

    const scheduleReminderForNote = async (date: Date) => {
        if (date.getTime() <= Date.now()) {
            return; // Don't show alert, just don't set
        }

        setIsSetting(true);
        try {
            const notificationId = await scheduleReminder(noteId, date);
            if (notificationId) {
                onReminderSet(date.getTime());
            }
        } catch (error) {
            console.error("Error setting reminder:", error);
        } finally {
            setIsSetting(false);
            setIsDatePickerOpen(false);
        }
    };

    const handleCancelReminder = async () => {
        try {
            await cancelNoteReminder(noteId);
            onReminderSet(null);
        } catch (error) {
            console.error("Error canceling reminder:", error);
        }
    };

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    const handleDateConfirm = (date: Date) => {
        if (date.getTime() > Date.now()) {
            scheduleReminderForNote(date);
        }
    };

    const isReminderPast = currentReminder ? currentReminder <= Date.now() : false;

    return (
        <>
            <Pressable onPress={handleOpenDatePicker} disabled={isSetting}>
                <Box className="flex-row gap-2 items-center px-4 py-3 rounded-lg bg-background-50 dark:bg-background-100">
                    {/* <Icon
                        as={currentReminder ? Bell : Calendar}
                        size="sm"
                        color={currentReminder ? (isDark ? "#39FF14" : "#00B700") : undefined}
                    /> */}
                    <Box className="flex-1">
                        {currentReminder ? (
                            <>
                                <Text className="text-sm font-medium text-typography-900 dark:text-typography-0">
                                    Reminder {isReminderPast ? "(Past)" : "Set"}
                                </Text>
                                <Text className="text-xs text-typography-500">
                                    {formatReminderDateDetailed(currentReminder)}
                                </Text>
                            </>
                        ) : (
                            <Text className="text-sm font-medium">Set Reminder</Text>
                        )}
                    </Box>
                    {currentReminder && (
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation();
                                handleCancelReminder();
                            }}
                            hitSlop={10}
                            className="p-1"
                        >
                            <Icon as={SquarePen} size="sm" color={isDark ? "#666" : "#999"} />
                        </Pressable>
                    )}
                    {isSetting && <Text className="text-xs text-typography-500">Setting...</Text>}
                </Box>
            </Pressable>

            <DatePickerModal
                visible={isDatePickerOpen}
                date={selectedDate}
                onDateChange={handleDateChange}
                onConfirm={handleDateConfirm}
                onCancel={() => setIsDatePickerOpen(false)}
                minimumDate={new Date()}
                title="Set Reminder"
                confirmText="Set"
                cancelText="Cancel"
            />
        </>
    );
};
