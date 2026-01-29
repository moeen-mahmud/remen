/**
 * AI Processing Queue
 *
 * Manages background processing of notes with AI models.
 * Processes notes one at a time to avoid overwhelming the device.
 */

import { addTagToNote, getNoteById, getTagsForNote, removeTagFromNote, updateNote } from "@/lib/database";
import { classifyNoteType } from "./classify";
import { generateEmbedding } from "./embeddings";
import type { EmbeddingsModel, LLMModel } from "./provider";
import { extractTags } from "./tags";
import { generateTitle } from "./title";

export interface NoteJob {
    noteId: string;
    content: string;
}

export interface AIModels {
    llm: LLMModel | null;
    embeddings: EmbeddingsModel | null;
}

export type ProcessingCompleteCallback = (noteId: string) => void;

// Small delay between AI operations to prevent "ModelGenerating" errors
const AI_OPERATION_DELAY = 2000;

/**
 * Wait for a model to be ready and not generating
 */
async function waitForModel(
    model: { isReady: boolean; isGenerating: boolean } | null,
    timeoutMs: number = 5000,
): Promise<boolean> {
    if (!model) return false;

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        if (model.isReady && !model.isGenerating) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
}

class AIProcessingQueue {
    private queue: NoteJob[] = [];
    private pendingQueue: NoteJob[] = []; // Notes waiting for user to leave editing
    private isProcessing = false;
    private currentJob: NoteJob | null = null;
    private models: AIModels = { llm: null, embeddings: null };
    private onProcessingCompleteCallbacks: ProcessingCompleteCallback[] = [];
    private processingTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private isOnEditingPage = false;
    private cancelToken = 0;

    /**
     * Set whether the user is currently on an editing page
     */
    setOnEditingPage(isOnEditing: boolean) {
        const wasOnEditing = this.isOnEditingPage;
        this.isOnEditingPage = isOnEditing;

        // If user just left editing page, process any pending notes
        if (wasOnEditing && !isOnEditing && this.pendingQueue.length > 0) {
            console.log(`📋 [Queue] User left editing page, processing ${this.pendingQueue.length} pending notes`);
            // Move all pending notes to the processing queue
            this.pendingQueue.forEach((job) => this.addImmediate(job));
            this.pendingQueue = [];
        }
    }

    /**
     * Add a note to the processing queue (immediate)
     */
    private addImmediate(job: NoteJob) {
        // Check if job already exists to avoid duplicates
        if (!this.queue.some((j) => j.noteId === job.noteId)) {
            this.queue.push(job);
            console.log(
                `📋 [Queue] Added note to immediate queue: ${job.noteId.substring(0, 8)}... (queue size: ${this.queue.length})`,
            );

            // Clear any existing timeout for this note
            const existingTimeout = this.processingTimeouts.get(job.noteId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            // Add 2-second delay before processing starts
            const timeout = setTimeout(() => {
                this.processingTimeouts.delete(job.noteId);
                this.processNext();
            }, 2000);

            this.processingTimeouts.set(job.noteId, timeout as unknown as NodeJS.Timeout);
        }
    }

    /**
     * Set the AI models to use for processing
     */
    setModels(models: AIModels) {
        const wasLLMReady = this.models.llm?.isReady || false;
        const wasEmbeddingsReady = this.models.embeddings?.isReady || false;

        this.models = models;

        // Log model status changes
        if (!wasLLMReady && models.llm?.isReady) {
            console.log("📋 [Queue] LLM model is now available for processing");
        }
        if (!wasEmbeddingsReady && models.embeddings?.isReady) {
            console.log("📋 [Queue] Embeddings model is now available for processing");
        }

        // If models just became ready and we have queued jobs, start processing
        if ((models.llm?.isReady || models.embeddings?.isReady) && this.queue.length > 0 && !this.isProcessing) {
            console.log(`📋 [Queue] Models ready, starting to process ${this.queue.length} queued notes`);
            this.processNext();
        }
    }

    /**
     * Register a callback to be called when processing completes for a note
     */
    onProcessingComplete(callback: ProcessingCompleteCallback) {
        this.onProcessingCompleteCallbacks.push(callback);
    }

    /**
     * Remove a processing complete callback
     */
    removeProcessingCompleteCallback(callback: ProcessingCompleteCallback) {
        const index = this.onProcessingCompleteCallbacks.indexOf(callback);
        if (index > -1) {
            this.onProcessingCompleteCallbacks.splice(index, 1);
        }
    }

    /**
     * Add a note to the processing queue
     */
    add(job: NoteJob, fromEditor = false) {
        // If from editor and currently on editing page, add to pending queue
        if (fromEditor && this.isOnEditingPage) {
            // If a job for this note already exists in the pending queue,
            // update its content so we always process the latest version.
            const existingIndex = this.pendingQueue.findIndex((j) => j.noteId === job.noteId);
            if (existingIndex !== -1) {
                this.pendingQueue[existingIndex] = job;
                console.log(
                    `📋 [Queue] Updated pending job with latest content: ${job.noteId.substring(
                        0,
                        8,
                    )}... (pending: ${this.pendingQueue.length})`,
                );
            } else {
                this.pendingQueue.push(job);
                console.log(
                    `📋 [Queue] Added note to pending queue: ${job.noteId.substring(0, 8)}... (pending: ${
                        this.pendingQueue.length
                    })`,
                );
            }
            return;
        }

        // Otherwise, add to immediate processing queue
        this.addImmediate(job);
    }

    /**
     * Cancel all queued AI work.
     *
     * Note: This cannot forcibly interrupt in-flight native model inference,
     * but it will prevent further steps and clear all queued work.
     */
    cancelAll() {
        this.cancelToken++;
        this.clear();
    }

    /**
     * Process the next job in the queue
     */
    private async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const job = this.queue.shift()!;
        this.currentJob = job;
        const tokenAtStart = this.cancelToken;

        console.log(`📋 [Queue] Processing note: ${job.noteId.substring(0, 8)}... (${this.queue.length} remaining)`);

        try {
            await this.processNote(job, tokenAtStart);
            if (tokenAtStart !== this.cancelToken) {
                // Cancelled while processing - don't fire completion callbacks.
                return;
            }
            // Notify callbacks that processing completed
            this.onProcessingCompleteCallbacks.forEach((callback) => {
                try {
                    callback(job.noteId);
                } catch (error) {
                    console.error("Error in processing complete callback:", error);
                }
            });
        } catch (error) {
            console.error(`❌ [Queue] AI processing failed for note: ${job.noteId.substring(0, 8)}...`, error);
        } finally {
            this.isProcessing = false;
            this.currentJob = null;
            // Small delay before processing next to let models settle
            setTimeout(() => this.processNext(), AI_OPERATION_DELAY);
        }
    }

    /**
     * Process a single note with AI
     */
    private async processNote(job: NoteJob, tokenAtStart: number) {
        const { noteId, content } = job;

        const isCancelled = () => tokenAtStart !== this.cancelToken;

        // Verify note still exists
        const note = await getNoteById(noteId);
        if (!note) {
            console.log(`⚠️ [Queue] Note no longer exists, skipping: ${noteId.substring(0, 8)}...`);
            return;
        }

        // Mark as processing for UI/status
        await updateNote(noteId, { ai_status: "processing", ai_error: null });

        // Skip empty or very short content
        if (content.trim().length < 10) {
            console.log(`⚠️ [Queue] Note too short, skipping AI processing: ${noteId.substring(0, 8)}...`);
            await updateNote(noteId, { is_processed: true, ai_status: "organized", ai_error: null });
            return;
        }

        const { llm, embeddings } = this.models;

        try {
            console.log(`🧠 [Queue] Starting AI processing for: ${noteId.substring(0, 8)}...`);

            // Generate embedding first (can run in parallel with nothing else using it)
            console.log(`  📊 Generating embedding...`);
            const embeddingPromise = generateEmbedding(content, embeddings);

            // Wait for LLM to be available before starting LLM operations
            const llmReady = await waitForModel(llm, 3000);
            console.log(`  🤖 LLM ready: ${llmReady}`);
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // ===== STEP 1: Classify type (uses LLM) =====
            // Skip if note type was explicitly set to voice/scan
            let type = note.type;
            if (note.type !== "voice" && note.type !== "scan") {
                // Check if note has tasks - if so, classify as task type immediately
                const hasTasks = /^\s*-\s+\[[\sxX]\]\s+/.test(content);
                if (hasTasks) {
                    type = "task";
                    console.log(`  🏷️ Type: ${type} (has tasks)`);
                } else {
                    console.log(`  🏷️ Classifying type...`);
                    if (llmReady && llm) {
                        type = await classifyNoteType(content, llm);
                        await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY));
                    } else {
                        type = await classifyNoteType(content, null); // Fallback
                    }
                    console.log(`  🏷️ Type: ${type}`);
                }
            } else {
                console.log(`  🏷️ Type: ${type} (explicit)`);
            }
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // ===== STEP 2: Generate title with type context (uses LLM) =====
            // Only generate title if note doesn't already have one (preserve user-set titles)
            let title = note.title || "";
            if (!title) {
                console.log(`  📝 Generating title...`);
                if (llmReady && llm) {
                    // Pass the classified type to generateTitle for context-aware generation
                    title = await generateTitle(content, llm, type);
                    await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY));
                } else {
                    title = await generateTitle(content, null, type); // Fallback with type
                }
                console.log(`  📝 Title: "${title}"`);
            } else {
                console.log(`  📝 Title preserved (user-set): "${title}"`);
            }
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // ===== STEP 3: Extract tags with type context (uses LLM) =====
            console.log(`  🔖 Extracting tags...`);
            const llmReadyForTags = await waitForModel(llm, 3000);
            let tags: string[] = [];
            if (llmReadyForTags && llm) {
                // Pass the classified type to extractTags for context-aware extraction
                tags = await extractTags(content, llm, type);
            } else {
                tags = await extractTags(content, null, type); // Fallback with type
            }
            console.log(`  🔖 Tags: [${tags.join(", ")}]`);
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // Wait for embedding to complete
            const embedding = await embeddingPromise;
            console.log(`  📊 Embedding: ${embedding.length} dimensions`);
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // Update note with AI-generated metadata and embedding
            // Only update title if we generated a new one (preserve existing user-set titles)
            const updateData: any = {
                type,
                is_processed: true,
                ai_status: "organized",
                ai_error: null,
                embedding: JSON.stringify(embedding),
            };
            // Only update title if it was empty before (i.e., we generated it)
            if (!note.title) {
                updateData.title = title;
            }
            await updateNote(noteId, updateData);

            // Replace existing auto tags (keep any user/manual tags)
            const existingTags = await getTagsForNote(noteId);
            for (const tag of existingTags) {
                if (tag.is_auto) {
                    await removeTagFromNote(noteId, tag.id);
                }
            }

            // Add extracted tags
            for (const tag of tags) {
                await addTagToNote(noteId, tag);
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
            });
        } catch (error) {
            console.error(`❌ [Queue] AI processing error for ${noteId.substring(0, 8)}...:`, error);
            // Mark as processed even on error to avoid infinite retries
            const message = error instanceof Error ? error.message : String(error);
            await updateNote(noteId, { is_processed: true, ai_status: "failed", ai_error: message });
        }
    }

    /**
     * Get the current queue length
     */
    getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Check if the queue is currently processing
     */
    isCurrentlyProcessing(): boolean {
        return this.isProcessing;
    }

    /**
     * Check if AI models are ready
     */
    areModelsReady(): boolean {
        return (this.models.llm?.isReady || false) && (this.models.embeddings?.isReady || false);
    }

    /**
     * Clear all pending jobs
     */
    clear() {
        this.queue = [];
        this.pendingQueue = [];
        // Clear all timeouts
        this.processingTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.processingTimeouts.clear();
    }

    /**
     * Get status info for debugging
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            pendingQueueLength: this.pendingQueue.length,
            isProcessing: this.isProcessing,
            currentJobId: this.currentJob?.noteId || null,
            isOnEditingPage: this.isOnEditingPage,
            llmReady: this.models.llm?.isReady || false,
            llmGenerating: this.models.llm?.isGenerating || false,
            embeddingsReady: this.models.embeddings?.isReady || false,
            embeddingsGenerating: this.models.embeddings?.isGenerating || false,
        };
    }
}

// Singleton instance
export const aiQueue = new AIProcessingQueue();
