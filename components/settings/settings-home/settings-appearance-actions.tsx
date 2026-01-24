import { Box } from "@/components/ui/box"
import { Divider } from "@/components/ui/divider"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Preferences } from "@/lib/preferences"
import { MoonIcon, SmartphoneIcon, SunIcon } from "lucide-react-native"
import { Pressable } from "react-native"

const actionArray = [
    {
        label: "System",
        icon: SmartphoneIcon,
        value: "system" as const,
        color: (theme: Preferences["theme"], dark?: boolean) =>
            theme === "system" ? (dark ? "#39FF14" : "#00B700") : dark ? "#fff" : "#000",
    },
    {
        label: "Light",
        icon: SunIcon,
        value: "light" as const,
        color: (theme: Preferences["theme"], dark?: boolean) =>
            theme === "light" ? (dark ? "#39FF14" : "#00B700") : dark ? "#fff" : "#000",
    },
    {
        label: "Dark",
        icon: MoonIcon,
        value: "dark" as const,
        color: (theme: Preferences["theme"], dark?: boolean) =>
            theme === "dark" ? (dark ? "#39FF14" : "#00B700") : dark ? "#fff" : "#000",
    },
]

type SettingsAppearanceActionsProps = {
    theme: Preferences["theme"]
    dark?: boolean
    handleThemeChange: (theme: "system" | "light" | "dark") => void
}

export const SettingsAppearanceActions: React.FC<SettingsAppearanceActionsProps> = ({
    handleThemeChange,
    theme,
    dark,
}) => {
    return actionArray?.map((action, index) => (
        <Box key={action.value}>
            <Pressable className="flex-row gap-3 items-center p-4" onPress={() => handleThemeChange(action.value)}>
                <Icon as={action.icon} color={action.color(theme, dark)} />
                <Text style={{ color: action.color(theme, dark) }}>{action.label}</Text>
            </Pressable>

            {index !== actionArray.length - 1 && <Divider className="bg-background-50 dark:bg-background-100" />}
        </Box>
    ))
}
