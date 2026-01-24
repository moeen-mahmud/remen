import { SettingsAbout } from "@/components/settings/settings-home/settings-about"
import { SettingsAI } from "@/components/settings/settings-home/settings-ai"
import { SettingsAppearance } from "@/components/settings/settings-home/settings-appearance"
import { SettingsData } from "@/components/settings/settings-home/settings-data"
import { SettingsPreference } from "@/components/settings/settings-home/settings-preference"
import { PageLoader } from "@/components/ui/page-loader"
import { useSettingsActions } from "@/hooks/use-settings-actions"
import { Box } from "lucide-react-native"
import { ScrollView } from "react-native"

export const SettingsHome: React.FC = () => {
    const { preferences, isLoading } = useSettingsActions()

    if (!preferences) {
        return <Box className="flex-1 bg-background-50" />
    }

    if (isLoading) {
        return <PageLoader />
    }

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Appearance Section */}
            <SettingsAppearance />

            {/* Preferences Section */}
            <SettingsPreference />

            {/* Data Section */}
            <SettingsData />

            {/* AI Section */}
            <SettingsAI />

            {/* About Section */}
            <SettingsAbout />
        </ScrollView>
    )
}
