import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { AIStatus } from "@/lib/database/database.types";
import { useTheme } from "@/lib/theme/use-theme";
import { Sparkles, XCircle } from "lucide-react-native";
import { Pressable } from "react-native";

type NoteDetailsProcessingProps = {
    isProcessingThisNote: boolean;
    aiStatus: AIStatus;
    handleReorganizeWithAI: () => void;
};
export const NoteDetailsProcessing: React.FC<NoteDetailsProcessingProps> = ({
    isProcessingThisNote,
    aiStatus,
    handleReorganizeWithAI,
}) => {
    const { mutedIconColor, dangerColor, dangerColorInverse } = useTheme();
    return (
        <Box className="flex-row items-center pt-2 mt-2">
            {isProcessingThisNote ? (
                <>
                    <Spinner className="mr-2" size="small" color="grey" />
                    <Text className="text-sm font-semibold text-success-500">AI organizing...</Text>
                </>
            ) : aiStatus === "queued" ? (
                <>
                    <Spinner className="mr-2" size="small" color="grey" />
                    <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Queued for AI…</Text>
                </>
            ) : aiStatus === "cancelled" ? (
                <>
                    <Icon size="sm" as={XCircle} className="mr-2" color={mutedIconColor} />
                    <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">AI cancelled</Text>
                </>
            ) : aiStatus === "failed" ? (
                <Pressable
                    hitSlop={20}
                    className="flex-row gap-2 items-center"
                    onPress={handleReorganizeWithAI}
                    disabled={isProcessingThisNote}
                >
                    <Icon size="sm" as={XCircle} color={dangerColor} />
                    <Text className="text-sm font-semibold" style={{ color: dangerColorInverse }}>
                        AI organization failed. Tap to re-organize.
                    </Text>
                </Pressable>
            ) : (
                <Box className="flex-row flex-grow gap-2 justify-between items-center">
                    <Box className="flex-row gap-1 items-center">
                        <Box className="mr-2 w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-400" />
                        <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                            AI organized
                        </Text>
                    </Box>
                    <Pressable
                        hitSlop={20}
                        onPress={handleReorganizeWithAI}
                        disabled={isProcessingThisNote}
                        className="flex-row gap-2 items-center"
                    >
                        <Icon size="sm" as={Sparkles} className="text-primary-600 dark:text-primary-400" />
                        <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                            Re-organize with AI
                        </Text>
                    </Pressable>
                </Box>
            )}
        </Box>
    );
};
