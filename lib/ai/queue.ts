import { addTagToNote, getNoteById, updateNote } from "@/lib/database"
import { classifyNoteType } from "./classify"
import { generateEmbedding } from "./embeddings"
import { extractTags } from "./tags"
import { generateTitle } from "./title"

export interface NoteJob {
    noteId: string
    content: string
}

class AIProcessingQueue {
    private queue: NoteJob[] = []
    private isProcessing = false

    /**
     * Add a note to the processing queue
     */
    add(job: NoteJob) {
        // Check if job already exists to avoid duplicates
        if (!this.queue.some((j) => j.noteId === job.noteId)) {
            this.queue.push(job)
            this.processNext()
        }
    }

    /**
     * Process the next job in the queue
     */
    private async processNext() {
        if (this.isProcessing || this.queue.length === 0) return

        this.isProcessing = true
        const job = this.queue.shift()!

        try {
            await this.processNote(job)
        } catch (error) {
            console.error("AI processing failed for note:", job.noteId, error)
        } finally {
            this.isProcessing = false
            this.processNext()
        }
    }

    /**
     * Process a single note with AI
     */
    private async processNote(job: NoteJob) {
        const { noteId, content } = job

        // Verify note still exists
        const note = await getNoteById(noteId)
        if (!note) {
            console.log("Note no longer exists, skipping:", noteId)
            return
        }

        // Skip empty or very short content
        if (content.trim().length < 10) {
            await updateNote(noteId, { is_processed: true })
            return
        }

        try {
            // Run AI tasks in parallel
            const [title, type, tags, embedding] = await Promise.all([
                generateTitle(content),
                note.type === "voice" || note.type === "scan" ? Promise.resolve(note.type) : classifyNoteType(content),
                extractTags(content),
                generateEmbedding(content),
            ])

            // Update note with AI-generated metadata and embedding
            await updateNote(noteId, {
                title,
                type,
                is_processed: true,
                embedding: JSON.stringify(embedding),
            })

            // Add tags to the note
            for (const tag of tags) {
                await addTagToNote(noteId, tag)
            }

            console.log("AI processing complete:", { noteId, title, type, tagsAdded: tags.length })
        } catch (error) {
            console.error("AI processing error:", error)
            // Mark as processed even on error to avoid infinite retries
            await updateNote(noteId, { is_processed: true })
        }
    }

    /**
     * Get the current queue length
     */
    getQueueLength(): number {
        return this.queue.length
    }

    /**
     * Check if the queue is currently processing
     */
    isCurrentlyProcessing(): boolean {
        return this.isProcessing
    }
}

// Singleton instance
export const aiQueue = new AIProcessingQueue()
