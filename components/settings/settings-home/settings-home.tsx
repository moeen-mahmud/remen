import { SettingsAbout } from "@/components/settings/settings-home/settings-about";
import { SettingsAI } from "@/components/settings/settings-home/settings-ai";
import { SettingsAppearance } from "@/components/settings/settings-home/settings-appearance";
import { SettingsData } from "@/components/settings/settings-home/settings-data";
import { SettingsICloud } from "@/components/settings/settings-home/settings-icloud";
import { PageLoader } from "@/components/ui/page-loader";

import { useAI } from "@/lib/ai/provider";
import { isICloudAvailable, performFullSync } from "@/lib/cloud/cloud-sync";
import { emptyTrash, getArchivedNotesCount, getTrashedNotesCount } from "@/lib/database/database";
import { Alert, ScrollView } from "react-native";

import { SettingsAIControls } from "@/components/settings/settings-home/settings-ai-controls";
import { Box } from "@/components/ui/box";
import { Preferences, getPreferences, savePreferences } from "@/lib/preference/preferences";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useState } from "react";

export const SettingsHome: React.FC = () => {
    const pathname = usePathname();
    const { llm, embeddings, ocr, overallProgress, isInitializing } = useAI();
    const { setColorScheme } = useColorScheme();
    const [preferences, setPreferences] = useState<Preferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [archivedCount, setArchivedCount] = useState(0);
    const [trashedCount, setTrashedCount] = useState(0);
    const [iCloudAvailable, setICloudAvailable] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Load preferences, counts, and iCloud availability
    useEffect(() => {
        async function load() {
            const prefs = await getPreferences();
            setPreferences(prefs);

            const archived = await getArchivedNotesCount();
            const trashed = await getTrashedNotesCount();
            setArchivedCount(archived);
            setTrashedCount(trashed);

            // Check iCloud availability
            const cloudAvailable = await isICloudAvailable();
            setICloudAvailable(cloudAvailable);

            setIsLoading(false);
        }

        load();

        return () => {
            setIsLoading(true);
            setPreferences(null);
            setArchivedCount(0);
            setTrashedCount(0);
            setICloudAvailable(false);
        };
    }, [pathname]);

    const handleThemeChange = useCallback(
        async (theme: Preferences["theme"]) => {
            if (!preferences) return;
            await savePreferences({ theme });
            setPreferences({ ...preferences, theme });
            setColorScheme(theme);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
        [preferences, setColorScheme],
    );

    const handleArchives = useCallback(() => {
        router.push("/settings/archives" as any);
    }, []);

    const handleTrash = useCallback(() => {
        router.push("/settings/trash" as any);
    }, []);

    const handleEmptyAction = useCallback(async () => {
        const deleted = await emptyTrash();
        setTrashedCount(0);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Done", `${deleted} note${deleted !== 1 ? "s" : ""} permanently deleted.`);
    }, []);

    const handleEmptyTrash = useCallback(async () => {
        Alert.alert(
            "Empty Recycle Bin",
            "This will permanently delete all notes in the recycle bin. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Empty",
                    style: "destructive",
                    onPress: handleEmptyAction,
                },
            ],
        );
    }, [handleEmptyAction]);

    const handleICloudToggle = useCallback(
        async (enabled: boolean) => {
            console.log("preference", preferences);
            if (!preferences) return;
            await savePreferences({ iCloudSyncEnabled: enabled });
            setPreferences({ ...preferences, iCloudSyncEnabled: enabled });
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // If enabling, perform initial sync
            if (enabled) {
                setIsSyncing(true);
                try {
                    const result = await performFullSync();

                    if (result.success) {
                        setPreferences((prev) => (prev ? { ...prev, lastICloudSync: result.timestamp ?? null } : null));
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } else {
                        Alert.alert("Sync Failed", result.error || "Failed to sync with iCloud");
                    }
                } catch (error) {
                    console.error("Sync error:", error);
                    Alert.alert("Sync Failed", error instanceof Error ? error.message : "An unexpected error occurred");
                } finally {
                    setIsSyncing(false);
                }
            }
        },
        [preferences],
    );

    const handleSyncNow = useCallback(async () => {
        if (!preferences?.iCloudSyncEnabled || isSyncing) return;

        setIsSyncing(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const result = await performFullSync();

            if (result.success) {
                setPreferences((prev) => (prev ? { ...prev, lastICloudSync: result.timestamp ?? null } : null));
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                const message = result.notesRestored
                    ? `Backed up ${result.notesBackedUp || 0} notes. Restored ${result.notesRestored} notes.`
                    : `Backed up ${result.notesBackedUp || 0} notes.`;

                Alert.alert("Sync Complete", message);
            } else {
                Alert.alert("Sync Failed", result.error || "Failed to sync with iCloud");
            }
        } catch (error) {
            console.error("Sync error:", error);
            Alert.alert("Sync Failed", error instanceof Error ? error.message : "An unexpected error occurred");
        } finally {
            setIsSyncing(false);
        }
    }, [preferences, isSyncing]);

    if (!preferences) {
        return <Box className="flex-1 bg-background-50" />;
    }

    if (isLoading) {
        return <PageLoader />;
    }

    return (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Appearance Section */}
            <SettingsAppearance handleThemeChange={handleThemeChange} preferences={preferences} />

            {/* Preferences Section */}
            {/* <SettingsPreference handleAutoAIToggle={handleAutoAIToggle} preferences={preferences} /> */}

            {/* Data Section */}
            <SettingsData
                handleArchives={handleArchives}
                archivedCount={archivedCount}
                handleTrash={handleTrash}
                trashedCount={trashedCount}
                handleEmptyTrash={handleEmptyTrash}
            />

            {/* iCloud Sync Section */}
            <SettingsICloud
                preferences={preferences}
                iCloudAvailable={iCloudAvailable}
                isSyncing={isSyncing}
                onToggleSync={handleICloudToggle}
                onSyncNow={handleSyncNow}
            />

            {/* AI Section */}
            <SettingsAI
                llm={llm}
                embeddings={embeddings}
                ocr={ocr}
                overallProgress={overallProgress}
                isInitializing={isInitializing}
            />

            {/* AI Controls Section */}
            <SettingsAIControls />

            {/* About Section */}
            <SettingsAbout />
        </ScrollView>
    );
};
