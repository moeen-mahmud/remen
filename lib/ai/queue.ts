import { AI_OPERATION_DELAY } from "@/lib/consts/consts";
import { addTagToNote, getNoteById, getTagsForNote, removeTagFromNote, updateNote } from "@/lib/database/database";
import { LLMModule, SMOLLM2_1_135M_QUANTIZED, SMOLLM2_1_360M_QUANTIZED } from "react-native-executorch";
import type { EmbeddingsModel, LLMModel, Message } from "./ai.types";
import { classifyNoteType } from "./classify";
import { generateEmbedding } from "./embeddings";
import { extractTags } from "./tags";
import { generateTitle } from "./title";

export interface NoteJob {
    noteId: string;
    content: string;
}

export interface AIModels {
    embeddings: EmbeddingsModel | null;
}

export type ProcessingCompleteCallback = (noteId: string) => void;

const LLM_IDLE_TIMEOUT = 30_000; // Unload LLM after 30s idle

class AIProcessingQueue {
    private queue: NoteJob[] = [];
    private pendingQueue: NoteJob[] = []; // Notes waiting for user to leave editing
    private isProcessing = false;
    private currentJob: NoteJob | null = null;
    private models: AIModels = { embeddings: null };
    private onProcessingCompleteCallbacks: ProcessingCompleteCallback[] = [];
    private processingTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private isOnEditingPage = false;
    private cancelToken = 0;

    // LLM lifecycle — queue owns the model
    private llmModule: LLMModule | null = null;
    private llmUnloadTimer: ReturnType<typeof setTimeout> | null = null;
    private llmIsGenerating = false;
    private llmModelName: string | null = null;

    /**
     * Set whether the user is currently on an editing page
     */
    setOnEditingPage(isOnEditing: boolean) {
        const wasOnEditing = this.isOnEditingPage;
        this.isOnEditingPage = isOnEditing;

        // If user just left editing page, process any pending notes
        if (wasOnEditing && !isOnEditing && this.pendingQueue.length > 0) {
            console.log(`[Queue] User left editing page, processing ${this.pendingQueue.length} pending notes`);
            this.pendingQueue.forEach((job) => this.addImmediate(job));
            this.pendingQueue = [];
        }
    }

    /**
     * Add a note to the processing queue (immediate)
     */
    private addImmediate(job: NoteJob) {
        if (!this.queue.some((j) => j.noteId === job.noteId)) {
            this.queue.push(job);
            console.log(`[Queue] Added note: ${job.noteId.substring(0, 8)}... (queue size: ${this.queue.length})`);

            const existingTimeout = this.processingTimeouts.get(job.noteId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }

            const timeout = setTimeout(() => {
                this.processingTimeouts.delete(job.noteId);
                this.processNext();
            }, 2000);

            this.processingTimeouts.set(job.noteId, timeout as unknown as NodeJS.Timeout);
        }
    }

    /**
     * Set the AI models to use for processing (embeddings only — LLM is queue-managed)
     */
    setModels(models: AIModels) {
        const wasEmbeddingsReady = this.models.embeddings?.isReady || false;
        this.models = models;

        if (!wasEmbeddingsReady && models.embeddings?.isReady) {
            console.log("[Queue] Embeddings model is now available");
        }

        // If embeddings just became ready and we have queued jobs, start processing
        if (models.embeddings?.isReady && this.queue.length > 0 && !this.isProcessing) {
            console.log(`[Queue] Embeddings ready, starting to process ${this.queue.length} queued notes`);
            this.processNext();
        }
    }

    /**
     * Load the LLM on demand. Tries 360M quantized first, falls back to 135M quantized.
     * Configures low temperature for consistent output.
     */
    private async ensureLLMLoaded(): Promise<LLMModel> {
        // Cancel any pending unload
        if (this.llmUnloadTimer) {
            clearTimeout(this.llmUnloadTimer);
            this.llmUnloadTimer = null;
        }

        // Already loaded — return wrapper
        if (this.llmModule) {
            return this.createLLMWrapper();
        }

        // Try 360M quantized first (better quality), fall back to 135M quantized
        const modelsToTry = [
            { source: SMOLLM2_1_360M_QUANTIZED, name: "360M" },
            { source: SMOLLM2_1_135M_QUANTIZED, name: "135M" },
        ];

        for (const { source, name } of modelsToTry) {
            try {
                console.log(`[Queue] Loading SMOLLM ${name} quantized...`);
                const module = new LLMModule();
                await module.load(source);
                module.configure({ generationConfig: { temperature: 0.3, topp: 0.9 } });
                this.llmModule = module;
                this.llmModelName = name;
                console.log(`[Queue] SMOLLM ${name} loaded and configured (temp=0.3)`);
                return this.createLLMWrapper();
            } catch (error) {
                console.warn(`[Queue] SMOLLM ${name} failed to load:`, error);
            }
        }

        // All models failed
        console.error("[Queue] All LLM models failed to load");
        throw new Error("No LLM model could be loaded");
    }

    /**
     * Create an LLMModel-compatible wrapper around the loaded LLMModule.
     * This lets classify/title/tags code work unchanged.
     */
    private createLLMWrapper(): LLMModel {
        const module = this.llmModule!;
        return {
            generate: async (messages: Message[]): Promise<string> => {
                this.llmIsGenerating = true;
                try {
                    const etMessages = messages.map((m) => ({ role: m.role, content: m.content }));
                    return await module.generate(etMessages);
                } finally {
                    this.llmIsGenerating = false;
                }
            },
            isReady: true,
            isGenerating: false,
            error: null,
            downloadProgress: 1,
        };
    }

    /**
     * Schedule LLM unload after idle period to free RAM.
     */
    private scheduleLLMUnload() {
        if (this.llmUnloadTimer) {
            clearTimeout(this.llmUnloadTimer);
        }
        this.llmUnloadTimer = setTimeout(() => {
            if (this.llmModule && !this.isProcessing && this.queue.length === 0) {
                console.log("[Queue] Unloading LLM after idle timeout...");
                try {
                    this.llmModule.interrupt();
                } catch (_) {
                    // ignore — may not be generating
                }
                this.llmModule.delete();
                this.llmModule = null;
                console.log(`[Queue] LLM (${this.llmModelName}) unloaded — RAM freed`);
            }
        }, LLM_IDLE_TIMEOUT);
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
        if (fromEditor && this.isOnEditingPage) {
            const existingIndex = this.pendingQueue.findIndex((j) => j.noteId === job.noteId);
            if (existingIndex !== -1) {
                this.pendingQueue[existingIndex] = job;
                console.log(
                    `[Queue] Updated pending job: ${job.noteId.substring(0, 8)}... (pending: ${this.pendingQueue.length})`,
                );
            } else {
                this.pendingQueue.push(job);
                console.log(
                    `[Queue] Added to pending: ${job.noteId.substring(0, 8)}... (pending: ${this.pendingQueue.length})`,
                );
            }
            return;
        }

        this.addImmediate(job);
    }

    /**
     * Cancel all queued AI work.
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

        console.log(`[Queue] Processing note: ${job.noteId.substring(0, 8)}... (${this.queue.length} remaining)`);

        try {
            await this.processNote(job, tokenAtStart);
            if (tokenAtStart !== this.cancelToken) {
                return;
            }
            this.onProcessingCompleteCallbacks.forEach((callback) => {
                try {
                    callback(job.noteId);
                } catch (error) {
                    console.error("Error in processing complete callback:", error);
                }
            });
        } catch (error) {
            console.error(`[Queue] AI processing failed for note: ${job.noteId.substring(0, 8)}...`, error);
        } finally {
            this.isProcessing = false;
            this.currentJob = null;

            if (this.queue.length > 0) {
                // More work — keep LLM loaded, process next after small delay
                setTimeout(() => this.processNext(), AI_OPERATION_DELAY);
            } else {
                // Queue empty — schedule LLM unload after idle timeout
                this.scheduleLLMUnload();
            }
        }
    }

    private async processNote(job: NoteJob, tokenAtStart: number) {
        const { noteId, content } = job;

        const isCancelled = () => tokenAtStart !== this.cancelToken;

        // Verify note still exists
        const note = await getNoteById(noteId);
        if (!note) {
            console.log(`[Queue] Note no longer exists, skipping: ${noteId.substring(0, 8)}...`);
            return;
        }

        await updateNote(noteId, { ai_status: "processing", ai_error: null });

        if (content.trim().length < 10) {
            console.log(`[Queue] Note too short, skipping AI: ${noteId.substring(0, 8)}...`);
            await updateNote(noteId, { is_processed: true, ai_status: "organized", ai_error: null });
            return;
        }

        const { embeddings } = this.models;

        try {
            console.log(`[Queue] Starting AI processing for: ${noteId.substring(0, 8)}...`);

            // Start embedding generation in parallel (uses embeddings model, not LLM)
            console.log(`  Generating embedding...`);
            const embeddingPromise = generateEmbedding(content, embeddings);

            // Load LLM on demand (or reuse if already loaded)
            let llm: LLMModel | null = null;
            try {
                llm = await this.ensureLLMLoaded();
                console.log(`  LLM ready (${this.llmModelName})`);
            } catch (error) {
                console.warn(`  LLM unavailable, using fallbacks:`, error);
            }

            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // ===== STEP 1: Classify type =====
            let type = note.type;
            if (note.type !== "voice" && note.type !== "scan") {
                const hasTasks = /^\s*-\s+\[[\sxX]\]\s+/.test(content);
                if (hasTasks) {
                    type = "task";
                    console.log(`  Type: ${type} (has tasks)`);
                } else {
                    console.log(`  Classifying type...`);
                    type = await classifyNoteType(content, llm);
                    if (llm) await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY));
                    console.log(`  Type: ${type}`);
                }
            } else {
                console.log(`  Type: ${type} (explicit)`);
            }
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // ===== STEP 2: Generate title =====
            let title = note.title || "";
            if (!title) {
                console.log(`  Generating title...`);
                title = await generateTitle(content, llm, type);
                if (llm) await new Promise((resolve) => setTimeout(resolve, AI_OPERATION_DELAY));
                console.log(`  Title: "${title}"`);
            } else {
                console.log(`  Title preserved (user-set): "${title}"`);
            }
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // ===== STEP 3: Extract tags =====
            console.log(`  Extracting tags...`);
            const tags = await extractTags(content, llm, type);
            console.log(`  Tags: [${tags.join(", ")}]`);
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // Wait for embedding to complete
            const embedding = await embeddingPromise;
            console.log(`  Embedding: ${embedding.length} dimensions`);
            if (isCancelled()) {
                await updateNote(noteId, { ai_status: "cancelled", ai_error: "Cancelled by user" });
                return;
            }

            // Update note with AI-generated metadata
            const updateData: any = {
                type,
                is_processed: true,
                ai_status: "organized",
                ai_error: null,
                embedding: JSON.stringify(embedding),
            };
            if (!note.title) {
                updateData.title = title;
            }
            await updateNote(noteId, updateData);

            // Replace existing auto tags
            const existingTags = await getTagsForNote(noteId);
            for (const tag of existingTags) {
                if (tag.is_auto) {
                    await removeTagFromNote(noteId, tag.id);
                }
            }
            for (const tag of tags) {
                await addTagToNote(noteId, tag);
            }

            console.log(`[Queue] AI complete for: ${noteId.substring(0, 8)}...`, {
                title: title.substring(0, 30),
                type,
                tags: tags.length,
                embeddingDim: embedding.length,
                llmModel: this.llmModelName || "fallback",
            });
        } catch (error) {
            console.error(`[Queue] AI processing error for ${noteId.substring(0, 8)}...:`, error);
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
     * Check if AI models are ready (embeddings required, LLM loads on demand)
     */
    areModelsReady(): boolean {
        return this.models.embeddings?.isReady || false;
    }

    /**
     * Clear all pending jobs
     */
    clear() {
        this.queue = [];
        this.pendingQueue = [];
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
            llmLoaded: this.llmModule !== null,
            llmModel: this.llmModelName,
            llmGenerating: this.llmIsGenerating,
            embeddingsReady: this.models.embeddings?.isReady || false,
            embeddingsGenerating: this.models.embeddings?.isGenerating || false,
        };
    }
}

export const aiQueue = new AIProcessingQueue();
