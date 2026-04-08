import { getPreferences } from "@/lib/preference/preferences";
import { Platform } from "react-native";
import { isICloudAvailable, performFullSync } from "./cloud-sync";

const AUTO_SYNC_DEBOUNCE = 15_000; // 15 seconds after last change
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncing = false;

/**
 * Schedule an auto-sync after a note change (create/update/delete).
 * Debounced — batches rapid edits into a single sync.
 * Only runs if iCloud sync is enabled in preferences.
 */
export function scheduleAutoSync() {
    if (Platform.OS !== "ios") return;

    if (syncTimer) {
        clearTimeout(syncTimer);
    }

    syncTimer = setTimeout(async () => {
        syncTimer = null;
        if (isSyncing) return;

        try {
            const prefs = await getPreferences();
            if (!prefs.iCloudSyncEnabled) return;

            const available = await isICloudAvailable();
            if (!available) return;

            isSyncing = true;
            console.log("[AutoSync] Starting background sync...");
            const result = await performFullSync();

            if (result.success) {
                console.log(
                    `[AutoSync] Complete — backed up ${result.notesBackedUp || 0}, restored ${result.notesRestored || 0}`,
                );
            } else {
                console.warn("[AutoSync] Failed:", result.error);
            }
        } catch (error) {
            console.warn("[AutoSync] Error:", error);
        } finally {
            isSyncing = false;
        }
    }, AUTO_SYNC_DEBOUNCE);
}

/**
 * Cancel any pending auto-sync (e.g., when user is actively editing).
 */
export function cancelAutoSync() {
    if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
    }
}
