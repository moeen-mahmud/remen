import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Check, Circle } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, StyleSheet } from "react-native";

interface TaskItemProps {
    content: string;
    isCompleted: boolean;
    onToggle?: () => void;
    indent?: string;
}

export const TaskItem: React.FC<TaskItemProps> = ({ content, isCompleted, onToggle, indent = "" }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <Pressable
            onPress={onToggle}
            style={[styles.container, { paddingLeft: indent.length * 8 + 12 }]}
            disabled={!onToggle}
        >
            <Box style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}>
                {isCompleted ? (
                    <Check size={14} color={isDark ? "#000" : "#fff"} strokeWidth={3} />
                ) : (
                    <Circle size={14} color={isDark ? "#888" : "#666"} strokeWidth={2} />
                )}
            </Box>
            <Text
                style={[
                    styles.content,
                    {
                        color: isDark ? (isCompleted ? "#666" : "#fff") : isCompleted ? "#999" : "#000",
                    },
                    isCompleted && styles.contentCompleted,
                ]}
            >
                {content}
            </Text>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingRight: 12,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: "#888",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    checkboxCompleted: {
        backgroundColor: "#007AFF",
        borderColor: "#007AFF",
    },
    content: {
        flex: 1,
        fontSize: 16,
        lineHeight: 22,
    },
    contentCompleted: {
        textDecorationLine: "line-through",
    },
});
