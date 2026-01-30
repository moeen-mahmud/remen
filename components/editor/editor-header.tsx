import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { ChevronLeft, ListIcon } from "lucide-react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type EditorHeaderProps = {
    isEditing: boolean;
    handleBack: () => void;
    handleViewNotes: () => void;
};

export const EditorHeader: React.FC<EditorHeaderProps> = ({ isEditing, handleBack, handleViewNotes }) => {
    const { top } = useSafeAreaInsets();
    return (
        <Box style={{ paddingTop: top }} className="p-4 mb-6 bg-background-0">
            <Box className="flex-row justify-between items-center">
                {isEditing ? (
                    <Pressable hitSlop={10} onPress={handleBack} className="flex-row gap-2 justify-center items-center">
                        <Icon as={ChevronLeft} size="xl" />
                        <Text className="text-xl font-bold">Edit Note</Text>
                    </Pressable>
                ) : (
                    <Text className="text-xl font-bold">Remen</Text>
                )}

                {/* Action buttons */}
                <Box className="flex-row gap-4 items-center">
                    {/* {onInsertTask && (
                        <Pressable onPress={onInsertTask} hitSlop={10}>
                            <Icon as={CheckSquare} size="xl" />
                        </Pressable>
                    )} */}
                    <Pressable onPress={handleViewNotes} hitSlop={10}>
                        <Icon as={ListIcon} size="xl" />
                    </Pressable>
                </Box>
            </Box>
        </Box>
    );
};
