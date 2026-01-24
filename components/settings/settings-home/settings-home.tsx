import { SettingsAbout } from "@/components/settings/settings-home/settings-about"
import { SettingsAI } from "@/components/settings/settings-home/settings-ai"
import { SettingsAppearance } from "@/components/settings/settings-home/settings-appearance"
import { SettingsData } from "@/components/settings/settings-home/settings-data"
import { SettingsPreference } from "@/components/settings/settings-home/settings-preference"
import { PageLoader } from "@/components/ui/page-loader"
import { useSettingsActions } from "@/hooks/use-settings-actions"
import { useAI } from "@/lib/ai/provider"
import { Box } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export const SettingsHome: React.FC = () => {
    const { bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const { llm, embeddings, ocr, overallProgress, isInitializing } = useAI()

    const {
        preferences,
        isLoading,
        archivedCount,
        trashedCount,
        handleHapticToggle,
        handleArchives,
        handleTrash,
        handleEmptyTrash,
    } = useSettingsActions()

    if (!preferences) {
        return <Box className="flex-1 bg-background-50" />
    }

    if (isLoading) {
        return <PageLoader />
    }

    return (
        <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: bottom + 40 }}
            showsVerticalScrollIndicator={false}
        >
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
