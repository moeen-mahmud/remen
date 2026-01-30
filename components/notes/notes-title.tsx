import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Note } from "@/lib/database/database";
import { useColorScheme } from "nativewind";
import { useRef } from "react";
import { Pressable, TextInput } from "react-native";

type NotesTitleProps = {
    isEditingTitle: boolean;
    editingTitle: string;
    setEditingTitle: (title: string) => void;
    handleTitleSave: () => void;
    handleTitleClear: () => void;
    handleTitlePress: () => void;
    note: Note;
};

export const NotesTitle: React.FC<NotesTitleProps> = ({
    isEditingTitle,
    editingTitle,
    setEditingTitle,
    handleTitleSave,
    handleTitleClear,
    handleTitlePress,
    note,
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isButtonPressRef = useRef(false);

    const handleBlur = () => {
        // Small delay to allow button presses to complete first
        blurTimeoutRef.current = setTimeout(() => {
            if (!isButtonPressRef.current) {
                handleTitleSave();
            }
            isButtonPressRef.current = false;
        }, 150);
    };

    const handleClearPress = () => {
        isButtonPressRef.current = true;
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
        }
        handleTitleClear();
    };

    return (
        <Box className="px-4 mb-4">
            {isEditingTitle ? (
                <Box>
                    <Box className="flex-row gap-2 items-center">
                        <TextInput
                            style={{
                                borderWidth: 1,
                                lineHeight: 0,
                            }}
                            className="flex-1 text-xl font-semibold text-left text-typography-900 dark:text-typography-0"
                            value={editingTitle}
                            onChangeText={setEditingTitle}
                            placeholder="Enter title..."
                            placeholderTextColor={isDark ? "#666" : "#999"}
                            autoFocus
                            selectTextOnFocus
                            onSubmitEditing={handleTitleSave}
                            onBlur={handleBlur}
                            maxLength={100}
                        />
                        {/* {editingTitle.length > 0 && (
                        <Pressable onPress={handleClearPress} hitSlop={10}>
                        <Icon as={X} size="sm" color={isDark ? "#666" : "#999"} />
                        </Pressable>
                        )} */}
                    </Box>
                    <Text className="text-xs opacity-60 text-typography-400">Tap outside to save</Text>
                </Box>
            ) : (
                <Pressable onPress={handleTitlePress}>
                    <Box>
                        {note.title ? (
                            <>
                                <Text className="text-xl font-semibold text-left">{note.title}</Text>
                                <Text className="text-xs opacity-60 text-typography-400">Tap to edit</Text>
                            </>
                        ) : (
                            <Text className="text-xl font-semibold text-left text-typography-500">Add a title...</Text>
                        )}
                    </Box>
                </Pressable>
            )}
        </Box>
    );
};
