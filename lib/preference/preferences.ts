import { MAX_PERMANENTLY_DELETED_IDS, PREFERENCES_KEY } from "@/lib/consts/consts";
import { Preferences } from "@/lib/preference/preference.types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_PREFERENCES: Preferences = {
    theme: "system",
    hapticFeedback: true,
    autoSaveDelay: 3000,
    modelsDownloaded: false,
    onboardingCompleted: false,
    downloadOverlayMinimized: false,
    iCloudSyncEnabled: false,
    lastICloudSync: null,
    permanentlyDeletedNoteIds: [],
};

/** Max number of permanently-deleted IDs to keep (avoids unbounded growth) */

export async function getPreferences(): Promise<Preferences> {
    try {
        const stored = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (stored) {
            return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
        }
        return DEFAULT_PREFERENCES;
    } catch (error) {
        console.error("Failed to load preferences:", error);
        return DEFAULT_PREFERENCES;
    }
}

export async function savePreferences(preferences: Partial<Preferences>): Promise<Preferences> {
    try {
        const current = await getPreferences();
        const updated = { ...current, ...preferences };
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
        return updated;
    } catch (error) {
        console.error("Failed to save preferences:", error);
        throw error;
    }
}

export async function resetPreferences(): Promise<Preferences> {
    try {
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES));
        return DEFAULT_PREFERENCES;
    } catch (error) {
        console.error("Failed to reset preferences:", error);
        throw error;
    }
}

/**
 * Record note IDs that were permanently deleted so iCloud sync won't restore them.
 */
export async function addPermanentlyDeletedIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const current = await getPreferences();
    const existing = current.permanentlyDeletedNoteIds ?? [];
    const merged = [...new Set([...existing, ...ids])];
    const capped = merged.slice(-MAX_PERMANENTLY_DELETED_IDS);
    await savePreferences({ permanentlyDeletedNoteIds: capped });
}
