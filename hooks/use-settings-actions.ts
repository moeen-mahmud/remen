import { emptyTrash, getArchivedNotesCount, getTrashedNotesCount } from "@/lib/database"

import { Preferences, getPreferences, savePreferences } from "@/lib/preferences"
import * as Haptics from "expo-haptics"
import { router } from "expo-router"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { Alert } from "react-native"

export const useSettingsActions = () => {
    const { setColorScheme } = useColorScheme()
    const [preferences, setPreferences] = useState<Preferences | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [archivedCount, setArchivedCount] = useState(0)
    const [trashedCount, setTrashedCount] = useState(0)

    // Load preferences and counts
    useEffect(() => {
        async function load() {
            const prefs = await getPreferences()
            setPreferences(prefs)

            const archived = await getArchivedNotesCount()
            const trashed = await getTrashedNotesCount()
            setArchivedCount(archived)
            setTrashedCount(trashed)
            setIsLoading(false)
        }
        load()
    }, [])

    const handleThemeChange = useCallback(
        async (theme: Preferences["theme"]) => {
            if (!preferences) return
            await savePreferences({ theme })
            setPreferences({ ...preferences, theme })
            setColorScheme(theme)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
        [preferences, setColorScheme],
    )

    const handleHapticToggle = useCallback(
        async (value: boolean) => {
            if (!preferences) return
            await savePreferences({ hapticFeedback: value })
            setPreferences({ ...preferences, hapticFeedback: value })
            if (value) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
        },
        [preferences],
    )
    const handleArchives = useCallback(() => {
        router.push("/settings/archives" as any)
    }, [])

    const handleTrash = useCallback(() => {
        router.push("/settings/trash" as any)
    }, [])

    const handleEmptyAction = useCallback(async () => {
        const deleted = await emptyTrash()
        setTrashedCount(0)
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("Done", `${deleted} note${deleted !== 1 ? "s" : ""} permanently deleted.`)
    }, [])

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
        )
    }, [handleEmptyAction])

    return {
        preferences,
        isLoading,
        archivedCount,
        trashedCount,
        handleThemeChange,
        handleHapticToggle,
        handleArchives,
        handleTrash,
        handleEmptyTrash,
    }
}
