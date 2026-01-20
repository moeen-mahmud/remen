import * as SQLite from "expo-sqlite"
import { v4 as uuidv4 } from "uuid"

// Types
export interface Note {
    id: string
    content: string
    html: string | null
    title: string | null
    type: NoteType
    created_at: number
    updated_at: number
    is_processed: boolean
    embedding: string | null
    original_image: string | null
    audio_file: string | null
}

export type NoteType = "note" | "meeting" | "task" | "idea" | "journal" | "reference" | "voice" | "scan"

export interface Tag {
    id: string
    name: string
    is_auto: boolean
}

export interface NoteTag {
    note_id: string
    tag_id: string
}

export interface Task {
    id: string
    note_id: string
    content: string
    is_completed: boolean
}

export interface CreateNoteInput {
    content: string
    html?: string | null
    title?: string | null
    type?: NoteType
    original_image?: string | null
    audio_file?: string | null
}

export interface UpdateNoteInput {
    content?: string
    html?: string | null
    title?: string | null
    type?: NoteType
    is_processed?: boolean
    embedding?: string | null
}

// Database singleton
let db: SQLite.SQLiteDatabase | null = null

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (db) return db

    db = await SQLite.openDatabaseAsync("remen.db")
    await initializeDatabase(db)
    return db
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
            embedding TEXT,
            original_image TEXT,
            audio_file TEXT
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
    `)
}

// Note CRUD Operations
export async function createNote(input: CreateNoteInput): Promise<Note> {
    const database = await getDatabase()
    const now = Date.now()
    const note: Note = {
        id: uuidv4(),
        content: input.content,
        html: input.html ?? null,
        title: input.title ?? null,
        type: input.type ?? "note",
        created_at: now,
        updated_at: now,
        is_processed: false,
        embedding: null,
        original_image: input.original_image ?? null,
        audio_file: input.audio_file ?? null,
    }

    await database.runAsync(
        `INSERT INTO notes (id, content, html, title, type, created_at, updated_at, is_processed, embedding, original_image, audio_file)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            note.id,
            note.content,
            note.html,
            note.title,
            note.type,
            note.created_at,
            note.updated_at,
            note.is_processed ? 1 : 0,
            note.embedding,
            note.original_image,
            note.audio_file,
        ],
    )

    return note
}

export async function getNoteById(id: string): Promise<Note | null> {
    const database = await getDatabase()
    const result = await database.getFirstAsync<{
        id: string
        content: string
        html: string | null
        title: string | null
        type: string
        created_at: number
        updated_at: number
        is_processed: number
        embedding: string | null
        original_image: string | null
        audio_file: string | null
    }>("SELECT * FROM notes WHERE id = ?", [id])

    if (!result) return null

    return {
        ...result,
        type: result.type as NoteType,
        is_processed: result.is_processed === 1,
    }
}

export async function getAllNotes(): Promise<Note[]> {
    const database = await getDatabase()
    const results = await database.getAllAsync<{
        id: string
        content: string
        html: string | null
        title: string | null
        type: string
        created_at: number
        updated_at: number
        is_processed: number
        embedding: string | null
        original_image: string | null
        audio_file: string | null
    }>("SELECT * FROM notes ORDER BY created_at DESC")

    return results.map((row) => ({
        ...row,
        type: row.type as NoteType,
        is_processed: row.is_processed === 1,
    }))
}

export async function getUnprocessedNotes(): Promise<Note[]> {
    const database = await getDatabase()
    const results = await database.getAllAsync<{
        id: string
        content: string
        html: string | null
        title: string | null
        type: string
        created_at: number
        updated_at: number
        is_processed: number
        embedding: string | null
        original_image: string | null
        audio_file: string | null
    }>("SELECT * FROM notes WHERE is_processed = 0 ORDER BY created_at ASC")

    return results.map((row) => ({
        ...row,
        type: row.type as NoteType,
        is_processed: row.is_processed === 1,
    }))
}

export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note | null> {
    const database = await getDatabase()
    const existing = await getNoteById(id)
    if (!existing) return null

    const updated: Note = {
        ...existing,
        content: input.content ?? existing.content,
        html: input.html !== undefined ? input.html : existing.html,
        title: input.title !== undefined ? input.title : existing.title,
        type: input.type ?? existing.type,
        is_processed: input.is_processed ?? existing.is_processed,
        embedding: input.embedding !== undefined ? input.embedding : existing.embedding,
        updated_at: Date.now(),
    }

    await database.runAsync(
        `UPDATE notes SET content = ?, html = ?, title = ?, type = ?, is_processed = ?, embedding = ?, updated_at = ? WHERE id = ?`,
        [
            updated.content,
            updated.html,
            updated.title,
            updated.type,
            updated.is_processed ? 1 : 0,
            updated.embedding,
            updated.updated_at,
            id,
        ],
    )

    return updated
}

export async function deleteNote(id: string): Promise<boolean> {
    const database = await getDatabase()
    const result = await database.runAsync("DELETE FROM notes WHERE id = ?", [id])
    return result.changes > 0
}

// Tag Operations
export async function createTag(name: string, isAuto: boolean = true): Promise<Tag> {
    const database = await getDatabase()
    const tag: Tag = {
        id: uuidv4(),
        name: name.toLowerCase().trim(),
        is_auto: isAuto,
    }

    await database.runAsync("INSERT OR IGNORE INTO tags (id, name, is_auto) VALUES (?, ?, ?)", [
        tag.id,
        tag.name,
        tag.is_auto ? 1 : 0,
    ])

    return tag
}

export async function getTagByName(name: string): Promise<Tag | null> {
    const database = await getDatabase()
    const result = await database.getFirstAsync<{
        id: string
        name: string
        is_auto: number
    }>("SELECT * FROM tags WHERE name = ?", [name.toLowerCase().trim()])

    if (!result) return null

    return {
        ...result,
        is_auto: result.is_auto === 1,
    }
}

export async function getAllTags(): Promise<Tag[]> {
    const database = await getDatabase()
    const results = await database.getAllAsync<{
        id: string
        name: string
        is_auto: number
    }>("SELECT * FROM tags ORDER BY name ASC")

    return results.map((row) => ({
        ...row,
        is_auto: row.is_auto === 1,
    }))
}

export async function addTagToNote(noteId: string, tagName: string): Promise<void> {
    const database = await getDatabase()

    // Get or create tag
    let tag = await getTagByName(tagName)
    if (!tag) {
        tag = await createTag(tagName)
    }

    await database.runAsync("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)", [noteId, tag.id])
}

export async function removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    const database = await getDatabase()
    await database.runAsync("DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?", [noteId, tagId])
}

export async function getTagsForNote(noteId: string): Promise<Tag[]> {
    const database = await getDatabase()
    const results = await database.getAllAsync<{
        id: string
        name: string
        is_auto: number
    }>(
        `SELECT t.* FROM tags t
         INNER JOIN note_tags nt ON t.id = nt.tag_id
         WHERE nt.note_id = ?
         ORDER BY t.name ASC`,
        [noteId],
    )

    return results.map((row) => ({
        ...row,
        is_auto: row.is_auto === 1,
    }))
}

// Task Operations
export async function createTask(noteId: string, content: string): Promise<Task> {
    const database = await getDatabase()
    const task: Task = {
        id: uuidv4(),
        note_id: noteId,
        content,
        is_completed: false,
    }

    await database.runAsync("INSERT INTO tasks (id, note_id, content, is_completed) VALUES (?, ?, ?, ?)", [
        task.id,
        task.note_id,
        task.content,
        task.is_completed ? 1 : 0,
    ])

    return task
}

export async function getTasksForNote(noteId: string): Promise<Task[]> {
    const database = await getDatabase()
    const results = await database.getAllAsync<{
        id: string
        note_id: string
        content: string
        is_completed: number
    }>("SELECT * FROM tasks WHERE note_id = ?", [noteId])

    return results.map((row) => ({
        ...row,
        is_completed: row.is_completed === 1,
    }))
}

export async function toggleTaskCompletion(taskId: string): Promise<Task | null> {
    const database = await getDatabase()
    const existing = await database.getFirstAsync<{
        id: string
        note_id: string
        content: string
        is_completed: number
    }>("SELECT * FROM tasks WHERE id = ?", [taskId])

    if (!existing) return null

    const newStatus = existing.is_completed === 0 ? 1 : 0
    await database.runAsync("UPDATE tasks SET is_completed = ? WHERE id = ?", [newStatus, taskId])

    return {
        ...existing,
        is_completed: newStatus === 1,
    }
}

export async function deleteTask(taskId: string): Promise<boolean> {
    const database = await getDatabase()
    const result = await database.runAsync("DELETE FROM tasks WHERE id = ?", [taskId])
    return result.changes > 0
}

// Search Operations
export async function searchNotes(query: string): Promise<Note[]> {
    const database = await getDatabase()
    const searchTerm = `%${query}%`

    const results = await database.getAllAsync<{
        id: string
        content: string
        html: string | null
        title: string | null
        type: string
        created_at: number
        updated_at: number
        is_processed: number
        embedding: string | null
        original_image: string | null
        audio_file: string | null
    }>(
        `SELECT * FROM notes 
         WHERE content LIKE ? OR title LIKE ?
         ORDER BY created_at DESC`,
        [searchTerm, searchTerm],
    )

    return results.map((row) => ({
        ...row,
        type: row.type as NoteType,
        is_processed: row.is_processed === 1,
    }))
}

// Get notes count
export async function getNotesCount(): Promise<number> {
    const database = await getDatabase()
    const result = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM notes")
    return result?.count ?? 0
}

// Close database (for cleanup)
export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.closeAsync()
        db = null
    }
}
