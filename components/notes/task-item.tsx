import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Circle, CircleCheck } from "lucide-react-native";
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
        <Pressable onPress={onToggle} style={[styles.container]} disabled={!onToggle}>
            <Box style={[styles.checkbox]}>
                {isCompleted ? (
                    <CircleCheck size={22} color={isCompleted ? "#007AFF" : isDark ? "#888" : "#666"} />
                ) : (
                    <Circle size={22} color={isDark ? "#888" : "#666"} />
                )}
            </Box>
            <Text
                className="text-lg"
                style={[
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
        borderColor: "#888",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    contentCompleted: {
        textDecorationLine: "line-through",
    },
});
