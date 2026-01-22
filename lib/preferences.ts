import AsyncStorage from "@react-native-async-storage/async-storage"

const PREFERENCES_KEY = "@remen_preferences"

export interface Preferences {
    theme: "system" | "light" | "dark"
    hapticFeedback: boolean
    autoSaveDelay: number // in milliseconds
    modelsDownloaded: boolean // tracks if AI models have been downloaded (first-time only)
}

const DEFAULT_PREFERENCES: Preferences = {
    theme: "system",
    hapticFeedback: true,
    autoSaveDelay: 3000,
    modelsDownloaded: false,
}

export async function getPreferences(): Promise<Preferences> {
    try {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY)
        if (stored) {
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) }
        }
        return DEFAULT_PREFERENCES
    } catch (error) {
        console.error("Failed to load preferences:", error)
        return DEFAULT_PREFERENCES
    }
}

export async function savePreferences(preferences: Partial<Preferences>): Promise<Preferences> {
    try {
        const current = await getPreferences()
        const updated = { ...current, ...preferences }
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated))
        return updated
    } catch (error) {
        console.error("Failed to save preferences:", error)
        throw error
    }
}

export async function resetPreferences(): Promise<Preferences> {
    try {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES))
        return DEFAULT_PREFERENCES
    } catch (error) {
        console.error("Failed to reset preferences:", error)
        throw error
    }
}
