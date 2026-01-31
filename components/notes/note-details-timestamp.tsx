import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { formatFullDate } from "@/lib/utils/functions";
import { ClockIcon } from "lucide-react-native";

type NoteDetailsTimestampProps = {
    createdAt: number;
};
export const NoteDetailsTimestamp: React.FC<NoteDetailsTimestampProps> = ({ createdAt }) => {
    return (
        <Box className="flex-row gap-2 items-center">
            <Icon as={ClockIcon} size="sm" className="text-neutral-500 dark:text-neutral-400" />
            <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                {formatFullDate(createdAt)}
            </Text>
        </Box>
    );
};
