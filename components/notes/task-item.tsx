import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from "@/lib/theme/colors";
import { useTheme } from "@/lib/theme/use-theme";
import { Circle, CircleCheck } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, StyleSheet } from "react-native";

interface TaskItemProps {
    content: string;
    isCompleted: boolean;
    onToggle?: () => void;
    indent?: string;
    fontSizeClass?: string;
    circleSize?: number;
    incompleteTaskColor?: string;
}

export const TaskItem: React.FC<TaskItemProps> = ({
    content,
    isCompleted,
    onToggle,
    indent = "",
    fontSizeClass = "text-lg",
    circleSize = 22,
    incompleteTaskColor = null,
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const { taskCompletedColor, taskIncompleteColor, borderColor } = useTheme();

    return (
        <Pressable onPress={onToggle} style={[styles.container]} disabled={!onToggle}>
            <Box style={[styles.checkbox, { borderColor: borderColor }]}>
                {isCompleted ? (
                    <CircleCheck size={circleSize} color={isCompleted ? taskCompletedColor : taskIncompleteColor} />
                ) : (
                    <Circle size={circleSize} color={taskIncompleteColor} />
                )}
            </Box>
            <Text
                className={`${fontSizeClass}`}
                style={[
                    {
                        color: isDark
                            ? isCompleted
                                ? DARK_THEME_COLORS.mutedTextColor
                                : (incompleteTaskColor ?? DARK_THEME_COLORS.textColor)
                            : isCompleted
                              ? LIGHT_THEME_COLORS.mutedTextColor
                              : (incompleteTaskColor ?? LIGHT_THEME_COLORS.textColor),
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
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    contentCompleted: {
        textDecorationLine: "line-through",
    },
});
