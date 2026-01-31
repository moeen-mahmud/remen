import { SettingsAppearanceActions } from "@/components/settings/settings-appearance-actions";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Preferences } from "@/lib/preference/preference.types";
import { useColorScheme } from "nativewind";

type SettingAppearanceProps = {
    handleThemeChange: (theme: Preferences["theme"]) => Promise<void>;
    preferences: Preferences | null;
};

export const SettingsAppearance: React.FC<SettingAppearanceProps> = ({ handleThemeChange, preferences }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <Box className="px-4">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">APPEARANCE</Text>

            <Box className="rounded-lg bg-background-0">
                <SettingsAppearanceActions
                    handleThemeChange={handleThemeChange}
                    theme={preferences?.theme as Preferences["theme"]}
                    dark={isDark}
                />
            </Box>
        </Box>
    );
};
