import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColorScheme } from "nativewind";
import { Modal, Platform, Pressable } from "react-native";

type DatePickerModalProps = {
    visible: boolean;
    date: Date;
    onDateChange: (date: Date) => void;
    onConfirm: (date: Date) => void;
    onCancel: () => void;
    minimumDate?: Date;
    title?: string;
    confirmText?: string;
    cancelText?: string;
};

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
    visible,
    date,
    onDateChange,
    onConfirm,
    onCancel,
    minimumDate = new Date(),
    title = "Set Reminder",
    confirmText = "Set",
    cancelText = "Cancel",
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    if (Platform.OS === "ios") {
        return (
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
                <Pressable
                    style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}
                    onPress={onCancel}
                >
                    <Pressable
                        style={{
                            backgroundColor: isDark ? "#1A1A1B" : "#fff",
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            padding: 20,
                        }}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <Box className="flex-row justify-between items-center mb-4">
                            <Pressable onPress={onCancel}>
                                <Text className="text-base text-typography-500">{cancelText}</Text>
                            </Pressable>
                            {/* <Text className="text-base font-semibold text-typography-900 dark:text-typography-0">
                                {title}
                            </Text> */}
                            <Pressable
                                onPress={() => {
                                    if (date.getTime() > Date.now()) {
                                        onConfirm(date);
                                    }
                                }}
                            >
                                <Text
                                    className="text-base font-semibold"
                                    style={{ color: isDark ? "#39FF14" : "#00B700" }}
                                >
                                    {confirmText}
                                </Text>
                            </Pressable>
                        </Box>
                        <Box className="flex-row justify-center items-center">
                            <DateTimePicker
                                value={date}
                                mode="datetime"
                                display="spinner"
                                onChange={(_, selectedDate) => {
                                    if (selectedDate) {
                                        onDateChange(selectedDate);
                                    }
                                }}
                                minimumDate={minimumDate}
                                themeVariant={isDark ? "dark" : "light"}
                                style={{
                                    backgroundColor: isDark ? "#1A1A1B" : "#fff",
                                }}
                            />
                        </Box>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    }

    // Android
    return (
        visible && (
            <DateTimePicker
                value={date}
                mode="datetime"
                display="default"
                onChange={(event, selectedDate) => {
                    if (event.type === "set" && selectedDate) {
                        onDateChange(selectedDate);
                        onConfirm(selectedDate);
                    } else {
                        onCancel();
                    }
                }}
                minimumDate={minimumDate}
            />
        )
    );
};
