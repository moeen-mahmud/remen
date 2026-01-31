import type {
    CreateNoteInput,
    Note,
    NoteRow,
    NoteType,
    Tag,
    Task,
    UpdateNoteInput,
} from "@/lib/database/database.types";
import * as SQLite from "expo-sqlite";
import { v4 as uuidv4 } from "uuid";
// Database singleton
let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db;

    db = await SQLite.openDatabaseAsync("remen.db");
    await initializeDatabase(db);
    return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            html TEXT,
            title TEXT,
            type TEXT DEFAULT 'note',
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            is_processed INTEGER DEFAULT 0,
            ai_status TEXT DEFAULT 'unprocessed',
            ai_error TEXT,
            embedding TEXT,
            original_image TEXT,
            audio_file TEXT,
            is_archived INTEGER DEFAULT 0,
            is_deleted INTEGER DEFAULT 0,
            deleted_at INTEGER,
            reminder_at INTEGER,
            notification_id TEXT,
            is_pinned INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            is_auto INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS note_tags (
            note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
            tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (note_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notes_processed ON notes(is_processed);
        CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(is_archived);
        CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(is_deleted);
    `);

    // Migration: Add new columns if they don't exist (for existing databases)
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN is_deleted INTEGER DEFAULT 0`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN deleted_at INTEGER`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN ai_status TEXT DEFAULT 'unprocessed'`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN ai_error TEXT`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN reminder_at INTEGER`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN notification_id TEXT`);
    } catch {
        // Column already exists
    }
    try {
        await database.execAsync(`ALTER TABLE notes ADD COLUMN is_pinned INTEGER DEFAULT 0`);
    } catch {
        // Column already exists
    }
}

// Note CRUD Operations
export async function createNote(input: CreateNoteInput): Promise<Note> {
    const database = await getDatabase();
    const now = Date.now();
    const note: Note = {
        id: input.id ?? uuidv4(),
        content: input.content,
        html: input.html ?? null,
        title: input.title ?? null,
        type: input.type ?? "note",
        created_at: input.created_at ?? now,
        updated_at: input.updated_at ?? now,
        is_processed: false,
        ai_status: "unprocessed",
        ai_error: null,
        embedding: null,
        original_image: input.original_image ?? null,
        audio_file: input.audio_file ?? null,
        is_archived: false,
        is_deleted: false,
        deleted_at: null,
        reminder_at: null,
        notification_id: null,
        is_pinned: false,
    };

    await database.runAsync(
        `INSERT INTO notes (id, content, html, title, type, created_at, updated_at, is_processed, ai_status, ai_error, embedding, original_image, audio_file, is_archived, is_deleted, deleted_at, reminder_at, notification_id, is_pinned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            note.id,
            note.content,
            note.html,
            note.title,
            note.type,
            note.created_at,
            note.updated_at,
            note.is_processed ? 1 : 0,
            note.ai_status,
            note.ai_error,
            note.embedding,
            note.original_image,
            note.audio_file,
            note.is_archived ? 1 : 0,
            note.is_deleted ? 1 : 0,
            note.deleted_at,
            note.reminder_at,
            note.notification_id,
            note.is_pinned ? 1 : 0,
        ],
    );

    return note;
}

// Database row type for notes

// Helper to convert row to Note
function rowToNote(row: NoteRow): Note {
    return {
        ...row,
        type: row.type as NoteType,
        is_processed: row.is_processed === 1,
        ai_status: row.ai_status ?? "unprocessed",
        ai_error: row.ai_error ?? null,
        is_archived: row.is_archived === 1,
        is_deleted: row.is_deleted === 1,
        is_pinned: row.is_pinned === 1,
    };
}

export async function getNoteById(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<NoteRow>("SELECT * FROM notes WHERE id = ?", [id]);

    if (!result) return null;

    return rowToNote(result);
}

export async function getAllNotes(): Promise<Note[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<NoteRow>(
        "SELECT * FROM notes WHERE is_archived = 0 AND is_deleted = 0 ORDER BY is_pinned DESC, created_at DESC",
    );

    return results.map(rowToNote);
}

// Get active notes (not archived, not deleted)
export async function getActiveNotes(): Promise<Note[]> {
    return getAllNotes();
}

// Get archived notes
export async function getArchivedNotes(): Promise<Note[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<NoteRow>(
        "SELECT * FROM notes WHERE is_archived = 1 AND is_deleted = 0 ORDER BY updated_at DESC",
    );

    return results.map(rowToNote);
}

// Get deleted notes (trash)
export async function getTrashedNotes(): Promise<Note[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<NoteRow>(
        "SELECT * FROM notes WHERE is_deleted = 1 ORDER BY deleted_at DESC",
    );

    return results.map(rowToNote);
}

export async function getUnprocessedNotes(): Promise<Note[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<NoteRow>(
        "SELECT * FROM notes WHERE is_processed = 0 AND is_deleted = 0 ORDER BY created_at ASC",
    );

    return results.map(rowToNote);
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    const updated: Note = {
        ...existing,
        content: input.content ?? existing.content,
        html: input.html !== undefined ? input.html : existing.html,
        title: input.title !== undefined ? input.title : existing.title,
        type: input.type ?? existing.type,
        is_processed: input.is_processed ?? existing.is_processed,
        ai_status: input.ai_status ?? existing.ai_status,
        ai_error: input.ai_error !== undefined ? input.ai_error : existing.ai_error,
        embedding: input.embedding !== undefined ? input.embedding : existing.embedding,
        reminder_at: input.reminder_at !== undefined ? input.reminder_at : existing.reminder_at,
        notification_id: input.notification_id !== undefined ? input.notification_id : existing.notification_id,
        updated_at: Date.now(),
    };

    await database.runAsync(
        `UPDATE notes SET content = ?, html = ?, title = ?, type = ?, is_processed = ?, ai_status = ?, ai_error = ?, embedding = ?, reminder_at = ?, notification_id = ?, updated_at = ? WHERE id = ?`,
        [
            updated.content,
            updated.html,
            updated.title,
            updated.type,
            updated.is_processed ? 1 : 0,
            updated.ai_status,
            updated.ai_error,
            updated.embedding,
            updated.reminder_at,
            updated.notification_id,
            updated.updated_at,
            id,
        ],
    );

    return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
    const database = await getDatabase();
    const result = await database.runAsync("DELETE FROM notes WHERE id = ?", [id]);
    return result.changes > 0;
}

// Archive Operations
export async function archiveNote(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    await database.runAsync("UPDATE notes SET is_archived = 1, updated_at = ? WHERE id = ?", [Date.now(), id]);

    return { ...existing, is_archived: true, updated_at: Date.now() };
}

export async function unarchiveNote(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    await database.runAsync("UPDATE notes SET is_archived = 0, updated_at = ? WHERE id = ?", [Date.now(), id]);

    return { ...existing, is_archived: false, updated_at: Date.now() };
}

// Trash Operations (Soft Delete)
export async function moveToTrash(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    const now = Date.now();
    await database.runAsync("UPDATE notes SET is_deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?", [
        now,
        now,
        id,
    ]);

    return { ...existing, is_deleted: true, deleted_at: now, updated_at: now };
}

export async function restoreFromTrash(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    await database.runAsync("UPDATE notes SET is_deleted = 0, deleted_at = NULL, updated_at = ? WHERE id = ?", [
        Date.now(),
        id,
    ]);

    return { ...existing, is_deleted: false, deleted_at: null, updated_at: Date.now() };
}

export async function emptyTrash(): Promise<number> {
    const database = await getDatabase();
    const result = await database.runAsync("DELETE FROM notes WHERE is_deleted = 1");
    return result.changes;
}

// Pin Operations
export async function pinNote(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    await database.runAsync("UPDATE notes SET is_pinned = 1, updated_at = ? WHERE id = ?", [Date.now(), id]);

    return { ...existing, is_pinned: true, updated_at: Date.now() };
}

export async function unpinNote(id: string): Promise<Note | null> {
    const database = await getDatabase();
    const existing = await getNoteById(id);
    if (!existing) return null;

    await database.runAsync("UPDATE notes SET is_pinned = 0, updated_at = ? WHERE id = ?", [Date.now(), id]);

    return { ...existing, is_pinned: false, updated_at: Date.now() };
}

// Get counts for archives and trash
export async function getArchivedNotesCount(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM notes WHERE is_archived = 1 AND is_deleted = 0",
    );
    return result?.count ?? 0;
}

export async function getTrashedNotesCount(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM notes WHERE is_deleted = 1",
    );
    return result?.count ?? 0;
}

// Tag Operations
export async function createTag(name: string, isAuto: boolean = true): Promise<Tag> {
    const database = await getDatabase();
    const tag: Tag = {
        id: uuidv4(),
        name: name.toLowerCase().trim(),
        is_auto: isAuto,
    };

    await database.runAsync("INSERT OR IGNORE INTO tags (id, name, is_auto) VALUES (?, ?, ?)", [
        tag.id,
        tag.name,
        tag.is_auto ? 1 : 0,
    ]);

    return tag;
}

export async function getTagByName(name: string): Promise<Tag | null> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{
        id: string;
        name: string;
        is_auto: number;
    }>("SELECT * FROM tags WHERE name = ?", [name.toLowerCase().trim()]);

    if (!result) return null;

    return {
        ...result,
        is_auto: result.is_auto === 1,
    };
}

export async function getAllTags(): Promise<Tag[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<{
        id: string;
        name: string;
        is_auto: number;
    }>("SELECT * FROM tags ORDER BY name ASC");

    return results.map((row) => ({
        ...row,
        is_auto: row.is_auto === 1,
    }));
}

export async function addTagToNote(noteId: string, tagName: string): Promise<void> {
    const database = await getDatabase();

    // Get or create tag
    let tag = await getTagByName(tagName);
    if (!tag) {
        tag = await createTag(tagName);
    }

    await database.runAsync("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)", [noteId, tag.id]);
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?", [noteId, tagId]);
}

export async function getTagsForNote(noteId: string): Promise<Tag[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<{
        id: string;
        name: string;
        is_auto: number;
    }>(
        `SELECT t.* FROM tags t
         INNER JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?
         ORDER BY t.name ASC`,
        [noteId],
    );

    return results.map((row) => ({
        ...row,
        is_auto: row.is_auto === 1,
    }));
}

// Task Operations
export async function createTask(noteId: string, content: string, isCompleted: boolean = false): Promise<Task> {
    const database = await getDatabase();
    const task: Task = {
        id: uuidv4(),
        note_id: noteId,
        content,
        is_completed: isCompleted,
    };

    await database.runAsync("INSERT INTO tasks (id, note_id, content, is_completed) VALUES (?, ?, ?, ?)", [
        task.id,
        task.note_id,
        task.content,
        task.is_completed ? 1 : 0,
    ]);

    return task;
}

export async function getTasksForNote(noteId: string): Promise<Task[]> {
    const database = await getDatabase();
    const results = await database.getAllAsync<{
        id: string;
        note_id: string;
        content: string;
        is_completed: number;
    }>("SELECT * FROM tasks WHERE note_id = ?", [noteId]);

    return results.map((row) => ({
        ...row,
        is_completed: row.is_completed === 1,
    }));
}

export async function toggleTaskCompletion(taskId: string): Promise<Task | null> {
    const database = await getDatabase();
    const existing = await database.getFirstAsync<{
        id: string;
        note_id: string;
        content: string;
        is_completed: number;
    }>("SELECT * FROM tasks WHERE id = ?", [taskId]);

    if (!existing) return null;

    const newStatus = existing.is_completed === 0 ? 1 : 0;
    await database.runAsync("UPDATE tasks SET is_completed = ? WHERE id = ?", [newStatus, taskId]);

    return {
        ...existing,
        is_completed: newStatus === 1,
    };
}

export async function updateTask(
    taskId: string,
    updates: { content?: string; is_completed?: boolean },
): Promise<Task | null> {
    const database = await getDatabase();
    const existing = await database.getFirstAsync<{
        id: string;
        note_id: string;
        content: string;
        is_completed: number;
    }>("SELECT * FROM tasks WHERE id = ?", [taskId]);

    if (!existing) return null;

    const updatedContent = updates.content !== undefined ? updates.content : existing.content;
    const updatedCompleted =
        updates.is_completed !== undefined ? (updates.is_completed ? 1 : 0) : existing.is_completed;

    await database.runAsync("UPDATE tasks SET content = ?, is_completed = ? WHERE id = ?", [
        updatedContent,
        updatedCompleted,
        taskId,
    ]);

    return {
        ...existing,
        content: updatedContent,
        is_completed: updatedCompleted === 1,
    };
}

export async function deleteTask(taskId: string): Promise<boolean> {
    const database = await getDatabase();
    const result = await database.runAsync("DELETE FROM tasks WHERE id = ?", [taskId]);
    return result.changes > 0;
}

// Search Operations
export async function searchNotes(query: string): Promise<Note[]> {
    const database = await getDatabase();
    const searchTerm = `%${query}%`;

    const results = await database.getAllAsync<NoteRow>(
        `SELECT * FROM notes 
         WHERE (content LIKE ? OR title LIKE ?)
         AND is_archived = 0 AND is_deleted = 0
         ORDER BY created_at DESC`,
        [searchTerm, searchTerm],
    );

    return results.map(rowToNote);
}

// Get notes count
export async function getNotesCount(): Promise<number> {
    const database = await getDatabase();
    const result = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM notes");
    return result?.count ?? 0;
}

// Close database (for cleanup)
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync();
        db = null;
    }
}
