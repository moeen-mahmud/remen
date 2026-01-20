import { updateNote } from "@/lib/database"
import { classifyNoteType } from "./classify"
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
        this.queue.push(job)
        this.processNext()
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

        // Skip empty or very short content
        if (content.trim().length < 10) {
            await updateNote(noteId, { is_processed: true })
            return
        }

        try {
            // Run AI tasks in parallel
            const [title, type, tags] = await Promise.all([
                generateTitle(content),
                classifyNoteType(content),
                extractTags(content),
            ])

            // Update note with AI-generated metadata
            await updateNote(noteId, {
                title,
                type,
                is_processed: true,
            })

            // TODO: Add tags to the note using the tag system
            console.log("AI processing complete:", { noteId, title, type, tags })
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
