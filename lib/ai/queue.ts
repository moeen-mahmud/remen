/**
 * AI Processing Queue
 *
 * Manages background processing of notes with AI models.
 * Processes notes one at a time to avoid overwhelming the device.
 */

import { addTagToNote, getNoteById, updateNote } from "@/lib/database"
import { classifyNoteType } from "./classify"
import { generateEmbedding } from "./embeddings"
import type { EmbeddingsModel, LLMModel } from "./provider"
import { extractTags } from "./tags"
import { generateTitle } from "./title"

export interface NoteJob {
    noteId: string
    content: string
}

export interface AIModels {
    llm: LLMModel | null
    embeddings: EmbeddingsModel | null
}

// Small delay between AI operations to prevent "ModelGenerating" errors
const AI_OPERATION_DELAY = 100

/**
 * Wait for a model to be ready and not generating
 */
async function waitForModel(
    model: { isReady: boolean; isGenerating: boolean } | null,
    timeoutMs: number = 5000,
): Promise<boolean> {
    if (!model) return false

    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
        if (model.isReady && !model.isGenerating) {
            return true
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return false
}

class AIProcessingQueue {
    private queue: NoteJob[] = []
    private isProcessing = false
    private models: AIModels = { llm: null, embeddings: null }

    /**
     * Set the AI models to use for processing
     */
    setModels(models: AIModels) {
        const wasLLMReady = this.models.llm?.isReady || false
        const wasEmbeddingsReady = this.models.embeddings?.isReady || false

        this.models = models

        // Log model status changes
        if (!wasLLMReady && models.llm?.isReady) {
            console.log("📋 [Queue] LLM model is now available for processing")
        }
        if (!wasEmbeddingsReady && models.embeddings?.isReady) {
            console.log("📋 [Queue] Embeddings model is now available for processing")
        }

        // If models just became ready and we have queued jobs, start processing
        if ((models.llm?.isReady || models.embeddings?.isReady) && this.queue.length > 0 && !this.isProcessing) {
            console.log(`📋 [Queue] Models ready, starting to process ${this.queue.length} queued notes`)
            this.processNext()
        }
    }

    /**
     * Add a note to the processing queue
     */
    add(job: NoteJob) {
        // Check if job already exists to avoid duplicates
        if (!this.queue.some((j) => j.noteId === job.noteId)) {
            this.queue.push(job)
            console.log(
                `📋 [Queue] Added note to queue: ${job.noteId.substring(0, 8)}... (queue size: ${this.queue.length})`,
            )
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

        console.log(`📋 [Queue] Processing note: ${job.noteId.substring(0, 8)}... (${this.queue.length} remaining)`)

        try {
            await this.processNote(job)
        } catch (error) {
            console.error(`❌ [Queue] AI processing failed for note: ${job.noteId.substring(0, 8)}...`, error)
        } finally {
            this.isProcessing = false
            // Small delay before processing next to let models settle
            setTimeout(() => this.processNext(), AI_OPERATION_DELAY)
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
            console.log(`⚠️ [Queue] Note no longer exists, skipping: ${noteId.substring(0, 8)}...`)
            return
        }

        // Skip empty or very short content
        if (content.trim().length < 10) {
            console.log(`⚠️ [Queue] Note too short, skipping AI processing: ${noteId.substring(0, 8)}...`)
            await updateNote(noteId, { is_processed: true })
            return
        }

        const { llm, embeddings } = this.models

        try {
            console.log(`🧠 [Queue] Starting AI processing for: ${noteId.substring(0, 8)}...`)

            // Generate embedding first (can run in parallel with nothing else using it)
            console.log(`  📊 Generating embedding...`)
            const embeddingPromise = generateEmbedding(content, embeddings)

            // Wait for LLM to be available before starting LLM operations
            const llmReady = await waitForModel(llm, 3000)
            console.log(`  🤖 LLM ready: ${llmReady}`)

            // Generate title (uses LLM)
            console.log(`  📝 Generating title...`)
            let title = note.title || ""
            if (llmReady && llm) {
                title = await generateTitle(content, llm)
                // Small delay between LLM operations
                await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY))
            } else {
                title = await generateTitle(content, null) // Fallback
            }
            console.log(`  📝 Title: "${title}"`)

            // Classify type (uses LLM) - skip if note type was explicitly set to voice/scan
            let type = note.type
            if (note.type !== "voice" && note.type !== "scan") {
                console.log(`  🏷️ Classifying type...`)
                // Wait for LLM again
                const llmReadyForClassify = await waitForModel(llm, 3000)
                if (llmReadyForClassify && llm) {
                    type = await classifyNoteType(content, llm)
                    await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY))
                } else {
                    type = await classifyNoteType(content, null) // Fallback
                }
                console.log(`  🏷️ Type: ${type}`)
            }

            // Extract tags (uses LLM)
            console.log(`  🔖 Extracting tags...`)
            const llmReadyForTags = await waitForModel(llm, 3000)
            let tags: string[] = []
            if (llmReadyForTags && llm) {
                tags = await extractTags(content, llm)
            } else {
                tags = await extractTags(content, null) // Fallback
            }
            console.log(`  🔖 Tags: [${tags.join(", ")}]`)

            // Wait for embedding to complete
            const embedding = await embeddingPromise
            console.log(`  📊 Embedding: ${embedding.length} dimensions`)

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

            console.log(`✅ [Queue] AI processing complete for: ${noteId.substring(0, 8)}...`, {
                title: title.substring(0, 30),
                type,
                tags: tags.length,
                embeddingDim: embedding.length,
                usedAI: {
                    llm: llmReady,
                    embeddings: embeddings?.isReady || false,
                },
            })
        } catch (error) {
            console.error(`❌ [Queue] AI processing error for ${noteId.substring(0, 8)}...:`, error)
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

    /**
     * Check if AI models are ready
     */
    areModelsReady(): boolean {
        return (this.models.llm?.isReady || false) && (this.models.embeddings?.isReady || false)
    }

    /**
     * Clear all pending jobs
     */
    clear() {
        this.queue = []
    }

    /**
     * Get status info for debugging
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            isProcessing: this.isProcessing,
            llmReady: this.models.llm?.isReady || false,
            llmGenerating: this.models.llm?.isGenerating || false,
            embeddingsReady: this.models.embeddings?.isReady || false,
            embeddingsGenerating: this.models.embeddings?.isGenerating || false,
        }
    }
}

// Singleton instance
export const aiQueue = new AIProcessingQueue()
