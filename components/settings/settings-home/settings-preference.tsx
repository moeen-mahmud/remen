import { settingsStyle } from "@/components/settings/settings-home/settings-style";
import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Preferences } from "@/lib/preferences";
import { VibrateIcon, VibrateOffIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Switch } from "react-native";

type SettingsPreferenceProps = {
    handleHapticToggle: (hapticFeedback: boolean) => void;
    preferences: Preferences | null;
};

export const SettingsPreference: React.FC<SettingsPreferenceProps> = ({ handleHapticToggle, preferences }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">PREFERENCES</Text>

            <Box className="rounded-lg bg-background-0">
                <Box style={settingsStyle.row}>
                    <Box style={settingsStyle.rowLeft}>
                        <Icon
                            as={preferences?.hapticFeedback ? VibrateIcon : VibrateOffIcon}
                            color={
                                preferences?.hapticFeedback
                                    ? isDark
                                        ? "#39FF14"
                                        : "#00B700"
                                    : isDark
                                      ? "#fff"
                                      : "#000"
                            }
                        />
                        <Text
                            style={{
                                color: preferences?.hapticFeedback
                                    ? isDark
                                        ? "#39FF14"
                                        : "#00B700"
                                    : isDark
                                      ? "#fff"
                                      : "#000",
                            }}
                        >
                            Haptic Feedback
                        </Text>
                    </Box>
                    <Switch value={preferences?.hapticFeedback} onValueChange={handleHapticToggle} />
                </Box>
            </Box>
        </Box>
    );
};
