import { Note } from "@/lib/database/database.types";

export interface SyncResult {
    success: boolean;
    error?: string;
    notesBackedUp?: number;
    notesRestored?: number;
    timestamp?: number;
}

export interface NoteWithTags extends Note {
    tags: string[];
}

export interface BackupData {
    version: number;
    timestamp: number;
    notes: NoteWithTags[];
}
