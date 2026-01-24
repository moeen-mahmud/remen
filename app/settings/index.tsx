import { SettingsHeader } from "@/components/settings/settings-header"
import { SettingsHome } from "@/components/settings/settings-home/settings-home"
import { Box } from "@/components/ui/box"

export default function SettingsScreen() {
    return (
        <Box className="flex-1 bg-background-50">
            <SettingsHeader />
            <SettingsHome />
        </Box>
    )
}
