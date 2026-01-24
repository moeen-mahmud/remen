import { SettingsAppearanceActions } from "@/components/settings/settings-home/settings-appearance-actions"
import { Box } from "@/components/ui/box"
import { Text } from "@/components/ui/text"
import { useSettingsActions } from "@/hooks/use-settings-actions"
import { Preferences } from "@/lib/preferences"
import { useColorScheme } from "nativewind"

export const SettingsAppearance: React.FC = () => {
    const { preferences, handleThemeChange } = useSettingsActions()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">APPEARANCE</Text>

            <Box className="rounded-lg bg-background-0">
                <SettingsAppearanceActions
                    handleThemeChange={handleThemeChange}
                    theme={preferences?.theme as Preferences["theme"]}
                    dark={isDark}
                />
            </Box>
        </Box>
    )
}
