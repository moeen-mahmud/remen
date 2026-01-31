import { settingsStyle as styles } from "@/components/settings/settings-style";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";

import { AlertCircle, Archive, ChevronRightIcon, Recycle } from "lucide-react-native";
import { Pressable } from "react-native";

type SettingsDataProps = {
    handleArchives: () => void;
    archivedCount: number;
    handleTrash: () => void;
    trashedCount: number;
    handleEmptyTrash: () => void;
};

export const SettingsData: React.FC<SettingsDataProps> = ({
    handleArchives,
    archivedCount,
    handleTrash,
    trashedCount,
    handleEmptyTrash,
}) => {
    const { dangerColor } = useTheme();
    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">DATA</Text>

            <Box className="rounded-lg bg-background-0">
                <Pressable style={styles.row} onPress={handleArchives}>
                    <Box style={styles.rowLeft}>
                        <Icon as={Archive} />
                        <Text>Archives</Text>
                    </Box>
                    <Box style={styles.rowRight}>
                        <Text>{archivedCount}</Text>
                        <Icon as={ChevronRightIcon} />
                    </Box>
                </Pressable>

                <Divider className="bg-background-50 dark:bg-background-100" />

                <Pressable style={styles.row} onPress={handleTrash}>
                    <Box style={styles.rowLeft}>
                        <Icon as={Recycle} />
                        <Text>Recycle Bin</Text>
                    </Box>
                    <Box style={styles.rowRight}>
                        <Text>{trashedCount}</Text>
                        <Icon as={ChevronRightIcon} />
                    </Box>
                </Pressable>

                {trashedCount > 0 ? (
                    <>
                        <Divider className="bg-background-50 dark:bg-background-100" />
                        <Pressable style={styles.row} onPress={handleEmptyTrash}>
                            <Box style={styles.rowLeft}>
                                <Icon as={AlertCircle} color={dangerColor} />
                                <Text style={{ color: dangerColor }}>Empty Recycle Bin</Text>
                            </Box>
                        </Pressable>
                    </>
                ) : null}
            </Box>
        </Box>
    );
};
