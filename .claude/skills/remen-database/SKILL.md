---
name: remen-database
description: Remen SQLite database — schema, migrations, CRUD operations, query patterns, and expo-sqlite usage.
version: 1.0.0
---

# Remen Database

SQLite via `expo-sqlite` with a singleton pattern.

## Schema

```sql
-- lib/database/database.ts (initializeDatabase)

notes (
    id TEXT PRIMARY KEY,              -- UUID v4
    content TEXT NOT NULL,            -- Note body (markdown for tasks)
    html TEXT,                        -- Rich text HTML
    title TEXT,                       -- AI-generated or user-set
    type TEXT DEFAULT 'note',         -- note|meeting|task|idea|journal|reference|voice|scan
    created_at INTEGER NOT NULL,      -- Unix timestamp (ms)
    updated_at INTEGER NOT NULL,      -- Unix timestamp (ms)
    is_processed INTEGER DEFAULT 0,   -- AI processing complete
    ai_status TEXT DEFAULT 'unprocessed',  -- unprocessed|queued|processing|organized|failed|cancelled
    ai_error TEXT,                    -- Error message if AI failed
    embedding TEXT,                   -- JSON serialized float array (384-dim neural or 256-dim fallback)
    original_image TEXT,              -- Base64 data URI for scan photos
    audio_file TEXT,                  -- Audio file path for voice notes
    is_archived INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,     -- Soft delete
    deleted_at INTEGER,               -- When moved to trash
    reminder_at INTEGER,              -- Reminder timestamp
    notification_id TEXT,             -- expo-notifications ID
    is_pinned INTEGER DEFAULT 0
)

tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,        -- Lowercase, trimmed
    is_auto INTEGER DEFAULT 1         -- 1 = AI-generated, 0 = user-created
)

note_tags (
    note_id TEXT REFERENCES notes(id),
    tag_id TEXT REFERENCES tags(id),
    PRIMARY KEY (note_id, tag_id)
)

tasks (
    id TEXT PRIMARY KEY,
    note_id TEXT REFERENCES notes(id),
    content TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0
)
```

## Indexes
- `idx_notes_created` on (created_at DESC)
- `idx_notes_processed` on (is_processed)
- `idx_notes_archived` on (is_archived)
- `idx_notes_deleted` on (is_deleted)

## Key Patterns

### Singleton Access
```typescript
import { getDatabase } from "@/lib/database/database";
const db = await getDatabase(); // Always use this, never create your own connection
```

### Note States
- **Active:** `is_archived = 0 AND is_deleted = 0` — shown in main list
- **Pinned:** `is_pinned = 1` — sorted first in active notes
- **Archived:** `is_archived = 1 AND is_deleted = 0`
- **Trashed:** `is_deleted = 1` (soft delete with `deleted_at` timestamp)
- **Hard deleted:** removed from DB via `deleteNote()` or `emptyTrash()`

### Embeddings Storage
- Stored as `JSON.stringify(float[])` in the `embedding` TEXT column.
- 384 dimensions for neural (MiniLM), 256 for fallback (TF-IDF hash).
- Parse with `JSON.parse(note.embedding)` — always check for null.
- Constants: `NEURAL_EMBEDDING_DIM = 384`, `FALLBACK_EMBEDDING_DIM = 256` in `lib/consts/consts.ts`.

### AI Status Flow
```
unprocessed → queued → processing → organized (success)
                                  → failed (error)
                                  → cancelled (user action)
```

### Migrations
- Add new columns via `ALTER TABLE` in the migrations block of `initializeDatabase()`.
- Always wrap in try/catch (column may already exist from previous migration).
- Pragmas: WAL mode, foreign keys ON.

## Rules
- All IDs are UUID v4 (generated via `uuid` package).
- Timestamps are `Date.now()` (milliseconds).
- Boolean fields are INTEGER (0/1) in SQLite, converted to boolean in `rowToNote()`.
- Tags are always lowercase and trimmed before storage.
- `updateNote()` always sets `updated_at = Date.now()`.
- Types file: `lib/database/database.types.ts`.
- Never use raw SQL in components — always go through the functions in `database.ts`.
