import { Box } from "@/components/ui/box"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Note } from "@/lib/database"
import { SquareCheck, SquareX } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { Pressable, TextInput } from "react-native"

type NotesTitleProps = {
    isEditingTitle: boolean
    editingTitle: string
    setEditingTitle: (title: string) => void
    handleTitleSave: () => void
    handleTitleCancel: () => void
    handleTitlePress: () => void
    note: Note
}

export const NotesTitle: React.FC<NotesTitleProps> = ({
    isEditingTitle,
    editingTitle,
    setEditingTitle,
    handleTitleSave,
    handleTitleCancel,
    handleTitlePress,
    note,
}) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    return (
        <Box className="px-4 mb-4">
            {isEditingTitle ? (
                <Box className="flex-row gap-2 items-center">
                    <TextInput
                        className="flex-1 text-xl font-semibold text-left text-typography-900 dark:text-typography-0"
                        value={editingTitle}
                        onChangeText={setEditingTitle}
                        placeholder="Enter title..."
                        placeholderTextColor={isDark ? "#666" : "#999"}
                        autoFocus
                        selectTextOnFocus
                        onSubmitEditing={handleTitleSave}
                        maxLength={100}
                    />
                    <Box className="flex-row gap-2 items-center">
                        <Pressable onPress={handleTitleSave} hitSlop={10}>
                            <Icon as={SquareCheck} color={isDark ? "#39FF14" : "#00B700"} />
                        </Pressable>
                        <Pressable onPress={handleTitleCancel} hitSlop={10}>
                            <Icon as={SquareX} color={isDark ? "#666" : "#999"} />
                        </Pressable>
                    </Box>
                </Box>
            ) : note.title ? (
                <Pressable onPress={handleTitlePress}>
                    <Text className="text-xl font-semibold text-left">{note.title}</Text>
                </Pressable>
            ) : (
                <Pressable onPress={handleTitlePress}>
                    <Text className="text-xl font-semibold text-left">Add a title...</Text>
                </Pressable>
            )}
        </Box>
    )
}
