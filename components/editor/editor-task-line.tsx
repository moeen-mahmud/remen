import { useTheme } from "@/lib/theme/use-theme";
import { Circle, CircleCheck } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

interface EditorTaskLineProps {
    content: string;
    isCompleted: boolean;
    onToggle: () => void;
    onChangeContent: (text: string) => void;
    onSubmitEditing: () => void;
    onBackspaceEmpty: () => void;
    autoFocus?: boolean;
    inputRef?: (ref: TextInput | null) => void;
}

export function EditorTaskLine({
    content,
    isCompleted,
    onToggle,
    onChangeContent,
    onSubmitEditing,
    onBackspaceEmpty,
    autoFocus = false,
    inputRef,
}: EditorTaskLineProps) {
    const { textColor, taskCompletedColor, taskIncompleteColor, mutedTextColor, placeholderTextColor } = useTheme();
    const localRef = useRef<TextInput>(null);

    const handleKeyPress = (e: { nativeEvent: { key: string } }) => {
        if (e.nativeEvent.key === "Backspace" && content.length === 0) {
            onBackspaceEmpty();
        }
    };

    return (
        <View style={styles.container}>
            <Pressable onPress={onToggle} style={styles.checkbox} hitSlop={6}>
                {isCompleted ? (
                    <CircleCheck size={22} color={taskCompletedColor} />
                ) : (
                    <Circle size={22} color={taskIncompleteColor} />
                )}
            </Pressable>
            <TextInput
                ref={(ref) => {
                    localRef.current = ref;
                    inputRef?.(ref);
                }}
                style={[
                    styles.input,
                    { color: isCompleted ? mutedTextColor : textColor },
                    isCompleted && styles.completed,
                ]}
                value={content}
                onChangeText={onChangeContent}
                onSubmitEditing={onSubmitEditing}
                onKeyPress={handleKeyPress}
                placeholder="Task..."
                placeholderTextColor={placeholderTextColor}
                autoFocus={autoFocus}
                blurOnSubmit={false}
                returnKeyType="next"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        minHeight: 44,
    },
    checkbox: {
        marginRight: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    input: {
        flex: 1,
        fontSize: 17,
    },
    completed: {
        textDecorationLine: "line-through",
    },
});
