import { Platform } from "react-native";
import { CloudStorage, CloudStorageScope } from "react-native-cloud-storage";
import { createNote, getAllNotes, getNoteById, Note, updateNote } from "./database";
import { getPreferences, savePreferences } from "./preferences";

// Constants
const BACKUP_DIR = "remen-backup";
const NOTES_FILE = "notes.json";
const BACKUP_PATH = `${BACKUP_DIR}/${NOTES_FILE}`;

// Types
export interface SyncResult {
    success: boolean;
    error?: string;
    notesBackedUp?: number;
    notesRestored?: number;
    timestamp?: number;
}

interface BackupData {
    version: number;
    timestamp: number;
    notes: Note[];
}

/**
 * Check if iCloud is available on the device
 */
export async function isICloudAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios") {
        return false;
    }

    try {
        return await CloudStorage.isCloudAvailable();
    } catch (error) {
        console.error("Failed to check iCloud availability:", error);
        return false;
    }
}

/**
 * Ensure the backup directory exists in iCloud
 */
async function ensureBackupDirectory(): Promise<void> {
    try {
        const exists = await CloudStorage.exists(BACKUP_DIR, CloudStorageScope.AppData);
        if (!exists) {
            await CloudStorage.mkdir(BACKUP_DIR, CloudStorageScope.AppData);
        }
    } catch (error) {
        console.error("Failed to create backup directory:", error);
        throw error;
    }
}

/**
 * Sync notes TO iCloud (backup)
 */
export async function syncNotesToCloud(): Promise<SyncResult> {
    try {
        // Check if iCloud is available
        const available = await isICloudAvailable();
        if (!available) {
            return {
                success: false,
                error: "iCloud is not available. Please sign in to iCloud in Settings.",
            };
        }

        // Get all notes from local database (excludes deleted and archived)
        const notes = await getAllNotes();

        console.log(`[Sync] Backing up ${notes.length} notes to iCloud`);

        // Create backup data
        const backupData: BackupData = {
            version: 1,
            timestamp: Date.now(),
            notes,
        };

        // Ensure backup directory exists
        await ensureBackupDirectory();

        // Write backup to iCloud
        await CloudStorage.writeFile(BACKUP_PATH, JSON.stringify(backupData), CloudStorageScope.AppData);

        console.log(`[Sync] Backup complete: ${notes.length} notes backed up`);

        // Update last sync time in preferences
        await savePreferences({ lastICloudSync: backupData.timestamp });

        return {
            success: true,
            notesBackedUp: notes.length,
            timestamp: backupData.timestamp,
        };
    } catch (error) {
        console.error("Failed to sync notes to iCloud:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to backup notes to iCloud",
        };
    }
}

/**
 * Sync notes FROM iCloud (restore)
 */
export async function syncNotesFromCloud(): Promise<SyncResult> {
    try {
        // Check if iCloud is available
        const available = await isICloudAvailable();
        if (!available) {
            return {
                success: false,
                error: "iCloud is not available. Please sign in to iCloud in Settings.",
            };
        }

        // Check if backup exists
        const exists = await CloudStorage.exists(BACKUP_PATH, CloudStorageScope.AppData);
        if (!exists) {
            return {
                success: true,
                notesRestored: 0,
                error: "No backup found in iCloud",
            };
        }

        // Read backup from iCloud
        const content = await CloudStorage.readFile(BACKUP_PATH, CloudStorageScope.AppData);
        const backupData: BackupData = JSON.parse(content);

        // Validate backup data
        if (!backupData.notes || !Array.isArray(backupData.notes)) {
            return {
                success: false,
                error: "Invalid backup data format",
            };
        }

        console.log(`[Sync] Found ${backupData.notes.length} notes in cloud backup`);

        let restoredCount = 0;
        let createdCount = 0;
        let updatedCount = 0;

        // Merge notes - import notes that don't exist locally or are newer
        for (const cloudNote of backupData.notes) {
            try {
                const localNote = await getNoteById(cloudNote.id);

                if (!localNote) {
                    // Note doesn't exist locally (was permanently deleted or never existed), restore it
                    await createNote({
                        id: cloudNote.id,
                        content: cloudNote.content,
                        html: cloudNote.html,
                        title: cloudNote.title,
                        type: cloudNote.type,
                        original_image: cloudNote.original_image,
                        audio_file: cloudNote.audio_file,
                        created_at: cloudNote.created_at,
                        updated_at: cloudNote.updated_at,
                    });
                    restoredCount++;
                    createdCount++;
                    console.log(`[Sync] Restored note: ${cloudNote.id}`);
                } else if (cloudNote.updated_at > localNote.updated_at) {
                    // Cloud note is newer, update local (but only if not deleted/archived)
                    if (!localNote.is_deleted && !localNote.is_archived) {
                        await updateNote(cloudNote.id, {
                            content: cloudNote.content,
                            html: cloudNote.html,
                            title: cloudNote.title,
                            type: cloudNote.type,
                        });
                        restoredCount++;
                        updatedCount++;
                        console.log(`[Sync] Updated note: ${cloudNote.id}`);
                    }
                }
            } catch (noteError) {
                console.error(`[Sync] Error processing note ${cloudNote.id}:`, noteError);
                // Continue with other notes even if one fails
            }
        }

        console.log(
            `[Sync] Restore complete: ${createdCount} created, ${updatedCount} updated, ${restoredCount} total`,
        );

        // Update last sync time
        await savePreferences({ lastICloudSync: Date.now() });

        return {
            success: true,
            notesRestored: restoredCount,
            timestamp: backupData.timestamp,
        };
    } catch (error) {
        console.error("Failed to sync notes from iCloud:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to restore notes from iCloud",
        };
    }
}

/**
 * Get the last sync timestamp
 */
export async function getLastSyncTime(): Promise<number | null> {
    const preferences = await getPreferences();
    return preferences.lastICloudSync;
}

/**
 * Perform a full two-way sync
 * First pulls from iCloud, then pushes local changes
 */
export async function performFullSync(): Promise<SyncResult> {
    try {
        // First, pull from iCloud to get any changes
        const pullResult = await syncNotesFromCloud();
        if (!pullResult.success && pullResult.error !== "No backup found in iCloud") {
            return pullResult;
        }

        // Then, push local notes to iCloud
        const pushResult = await syncNotesToCloud();
        if (!pushResult.success) {
            return pushResult;
        }

        return {
            success: true,
            notesRestored: pullResult.notesRestored || 0,
            notesBackedUp: pushResult.notesBackedUp || 0,
            timestamp: pushResult.timestamp,
        };
    } catch (error) {
        console.error("Failed to perform full sync:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to sync with iCloud",
        };
    }
}
