import { settingsStyle as styles } from "@/components/settings/settings-home/settings-style";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Preferences } from "@/lib/preference/preferences";

import { Cloud, CloudOff, RefreshCw } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { ActivityIndicator, Platform, Pressable, Switch } from "react-native";

type SettingsICloudProps = {
    preferences: Preferences;
    iCloudAvailable: boolean;
    isSyncing: boolean;
    onToggleSync: (enabled: boolean) => void;
    onSyncNow: () => void;
};

function formatLastSync(timestamp: number | null): string {
    if (!timestamp) return "Never";

    const now = Date.now();
    const diff = now - timestamp;

    // Less than a minute
    if (diff < 60 * 1000) {
        return "Just now";
    }

    // Less than an hour
    if (diff < 60 * 60 * 1000) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    // Less than a day
    if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diff / (60 * 60 * 1000));
        return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }

    // Format as date
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const SettingsICloud: React.FC<SettingsICloudProps> = ({
    preferences,
    iCloudAvailable,
    isSyncing,
    onToggleSync,
    onSyncNow,
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    // Only show on iOS
    if (Platform.OS !== "ios") {
        return null;
    }

    const isEnabled = preferences.iCloudSyncEnabled;
    const lastSync = preferences.lastICloudSync;

    // Icon color based on state (similar to other settings)
    const iconColor = isEnabled && iCloudAvailable ? (isDark ? "#39FF14" : "#00B700") : isDark ? "#fff" : "#000";

    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">iCLOUD BACKUP</Text>

            <Box className="rounded-lg bg-background-0">
                {/* iCloud Status Row */}
                <Box style={styles.row}>
                    <Box style={styles.rowLeft}>
                        <Icon as={iCloudAvailable ? Cloud : CloudOff} color={iconColor} />
                        <Box>
                            <Text style={{ color: iconColor }}>iCloud Backup</Text>
                            <Text className="text-xs text-typography-500">
                                {iCloudAvailable
                                    ? "Sync notes across your devices"
                                    : "iCloud is not available on this device"}
                            </Text>
                        </Box>
                    </Box>
                    <Switch
                        value={isEnabled}
                        onValueChange={onToggleSync}
                        disabled={isSyncing || !iCloudAvailable}
                        trackColor={{
                            false: isDark ? "#39393D" : "#E9E9EA",
                            true: isDark ? "#39FF14" : "#00B700",
                        }}
                        thumbColor="#FFFFFF"
                    />
                </Box>

                {/* Sync Now Row - Only show when enabled */}
                {isEnabled && iCloudAvailable && (
                    <>
                        <Divider className="bg-background-50 dark:bg-background-100" />
                        <Pressable style={styles.row} onPress={onSyncNow} disabled={isSyncing}>
                            <Box style={styles.rowLeft}>
                                <Icon as={RefreshCw} />
                                <Text>Sync Now</Text>
                            </Box>
                            <Box style={styles.rowRight}>
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color={isDark ? "#fff" : "#000"} />
                                ) : (
                                    <Text className="text-xs text-typography-500">{formatLastSync(lastSync)}</Text>
                                )}
                            </Box>
                        </Pressable>
                    </>
                )}
            </Box>

            {/* Info text */}
            {isEnabled && iCloudAvailable && (
                <Text className="mt-2 ml-1 text-xs text-typography-500">
                    Your notes will be backed up to iCloud and synced across all your devices.
                </Text>
            )}
        </Box>
    );
};
