import { noteCardStyles as styles } from "@/components/notes/note.styles";
import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";
import { formatRelativeTime } from "@/lib/utils/functions";
import { CircleCheckIcon, CircleIcon, Pin } from "lucide-react-native";

type NoteCardHeaderProps = {
    isSelectionMode: boolean;
    isSelected: boolean;
    isPinned: boolean;
    createdAt: number;
};

export const NoteCardHeader: React.FC<NoteCardHeaderProps> = ({ isSelectionMode, isSelected, isPinned, createdAt }) => {
    const { brandColor, mutedIconColor } = useTheme();
    return (
        <Box style={styles.header}>
            <Box style={styles.headerLeft}>
                {isSelectionMode && (
                    <Box>
                        {isSelected ? (
                            <Icon as={CircleCheckIcon} size="sm" color={brandColor} />
                        ) : (
                            <Icon as={CircleIcon} size="sm" color={mutedIconColor} />
                        )}
                    </Box>
                )}
                {isPinned && <Icon as={Pin} color={brandColor} size="sm" />}
            </Box>
            <Text style={[styles.timestamp, { color: mutedIconColor }]}>{formatRelativeTime(createdAt)}</Text>
        </Box>
    );
};
