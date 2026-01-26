import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Cog, LucideRecycle, Share2Icon, XIcon } from "lucide-react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NotesHeaderProps = {
    isSelectionMode: boolean;
    exitSelectionMode: () => void;
    selectedCount: number;
    handleShareSelected: () => void;
    handleBulkDelete: () => void;
    handleSettings: () => void;
};

export const NotesHeader: React.FC<NotesHeaderProps> = ({
    isSelectionMode,
    exitSelectionMode,
    selectedCount,
    handleShareSelected,
    handleBulkDelete,
    handleSettings,
}) => {
    const { top } = useSafeAreaInsets();
    return (
        <Box style={{ paddingTop: top }} className="p-4 mb-6 bg-background-0">
            {isSelectionMode ? (
                <Box className="flex-row justify-between items-center">
                    <Pressable hitSlop={10} onPress={exitSelectionMode}>
                        <Icon size="xl" as={XIcon} />
                    </Pressable>
                    <Text className="font-semibold">{selectedCount} selected</Text>
                    <Box className="flex-row gap-4">
                        <Pressable onPress={handleShareSelected}>
                            <Icon size="xl" as={Share2Icon} />
                        </Pressable>
                        <Pressable onPress={handleBulkDelete}>
                            <Icon size="xl" as={LucideRecycle} />
                        </Pressable>
                    </Box>
                </Box>
            ) : (
                <Box className="flex-row justify-between items-center">
                    <Box className="flex-row gap-4 items-center">
                        <Text className="text-xl font-bold">Notes</Text>
                    </Box>
                    <Pressable hitSlop={10} onPress={handleSettings}>
                        <Icon as={Cog} size="xl" />
                    </Pressable>
                </Box>
            )}
        </Box>
    );
};
