export interface Note {
    id: string;
    content: string;
    html: string | null;
    title: string | null;
    type: NoteType;
    created_at: number;
    updated_at: number;
    is_processed: boolean;
    ai_status: AIStatus;
    ai_error: string | null;
    embedding: string | null;
    original_image: string | null;
    audio_file: string | null;
    is_archived: boolean;
    is_deleted: boolean;
    deleted_at: number | null;
    reminder_at: number | null;
    notification_id: string | null;
    is_pinned: boolean;
}

export type AIStatus = "unprocessed" | "queued" | "processing" | "organized" | "failed" | "cancelled";
export type NoteType = "note" | "meeting" | "task" | "idea" | "journal" | "reference" | "voice" | "scan";

export interface Tag {
    id: string;
    name: string;
    is_auto: boolean;
}

export interface NoteTag {
    note_id: string;
    tag_id: string;
}

export interface Task {
    id: string;
    note_id: string;
    content: string;
    is_completed: boolean;
}

export interface CreateNoteInput {
    id?: string;
    content: string;
    html?: string | null;
    title?: string | null;
    type?: NoteType;
    original_image?: string | null;
    audio_file?: string | null;
    created_at?: number;
    updated_at?: number;
}

export interface UpdateNoteInput {
    content?: string;
    html?: string | null;
    title?: string | null;
    type?: NoteType;
    is_processed?: boolean;
    ai_status?: Note["ai_status"];
    ai_error?: string | null;
    embedding?: string | null;
    reminder_at?: number | null;
    notification_id?: string | null;
}

export interface NoteRow {
    id: string;
    content: string;
    html: string | null;
    title: string | null;
    type: string;
    created_at: number;
    updated_at: number;
    is_processed: number;
    ai_status: Note["ai_status"] | null;
    ai_error: string | null;
    embedding: string | null;
    original_image: string | null;
    audio_file: string | null;
    is_archived: number;
    is_deleted: number;
    deleted_at: number | null;
    reminder_at: number | null;
    notification_id: string | null;
    is_pinned: number;
}
