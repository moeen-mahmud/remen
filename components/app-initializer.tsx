import { ModelDownloadOverlay } from "@/components/model-download-overlay";
import { Onboarding } from "@/components/onboarding/onboarding-home";
import { useAI } from "@/lib/ai";
import { aiQueue } from "@/lib/ai/queue";
import { getDatabase, getUnprocessedNotes } from "@/lib/database/database";
import { getPreferences, savePreferences } from "@/lib/preference/preferences";
import * as Notifications from "expo-notifications";
import { router, SplashScreen } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { LLMModule, SMOLLM2_1_360M_QUANTIZED } from "react-native-executorch";

// Llama 3.2 1B SpinQuant — pinned to v0.7.0 tag (v0.8.0 tag missing on HuggingFace)
const LLAMA_3_2_1B_SPINQUANT_URLS = {
    model: "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2/resolve/v0.7.0/llama-3.2-1B/spinquant/llama3_2_spinquant.pte",
    tokenizer:
        "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2/resolve/v0.7.0/tokenizer.json",
    tokenizerConfig:
        "https://huggingface.co/software-mansion/react-native-executorch-llama-3.2/resolve/v0.7.0/tokenizer_config.json",
};

// Module-level trigger so settings can request onboarding replay
let onboardingTrigger: (() => void) | null = null;
export function triggerOnboarding() {
    onboardingTrigger?.();
}

// Module-level LLM download progress so settings can read it
let _llmDownloadProgress = 0;
export function getLlmDownloadProgress(): number {
    return _llmDownloadProgress;
}

export function AppInitializer({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showDownloadOverlay, setShowDownloadOverlay] = useState(false);
    const [downloadOverlayMinimized, setDownloadOverlayMinimized] = useState(false);
    const [modelsDownloadedPreviously, setModelsDownloadedPreviously] = useState<boolean | null>(null);
    const [, setOnboardingCompleted] = useState<boolean | null>(null);
    const [llmDownloadProgress, _setLlmDownloadProgress] = useState(0);
    const setLlmDownloadProgress = useCallback((p: number) => {
        _llmDownloadProgress = p;
        _setLlmDownloadProgress(p);
    }, []);
    const [llmDownloadStarted, setLlmDownloadStarted] = useState(false);
    const { embeddings, isInitializing, overallProgress, error } = useAI();

    const prevStateRef = useRef({ embeddingsReady: false, lastProgress: 0 });

    // Register the onboarding trigger so external code can replay it
    useEffect(() => {
        onboardingTrigger = () => setShowOnboarding(true);
        return () => {
            onboardingTrigger = null;
        };
    }, []);

    // Check if models were previously downloaded and onboarding completed
    useEffect(() => {
        async function checkPreferences() {
            const prefs = await getPreferences();
            setModelsDownloadedPreviously(prefs.modelsDownloaded);
            setOnboardingCompleted(prefs.onboardingCompleted);
            setDownloadOverlayMinimized(prefs.downloadOverlayMinimized);

            if (!prefs.onboardingCompleted) {
                setShowOnboarding(true);
            } else if (!prefs.modelsDownloaded && !prefs.downloadOverlayMinimized) {
                setShowDownloadOverlay(true);
            }
        }
        checkPreferences();
    }, []);

    useEffect(() => {
        async function initialize() {
            try {
                console.log("[App] Initializing database...");
                await getDatabase();
                console.log("[App] Database initialized");

                // Process any unprocessed notes from previous sessions
                const unprocessedNotes = await getUnprocessedNotes();
                if (unprocessedNotes.length > 0) {
                    console.log(`[App] Found ${unprocessedNotes.length} unprocessed notes, adding to queue...`);
                    for (const note of unprocessedNotes) {
                        aiQueue.add({ noteId: note.id, content: note.content });
                    }
                }
            } catch (error) {
                console.error("[App] Failed to initialize:", error);
            } finally {
                setIsReady(true);
                await SplashScreen.hideAsync();
            }
        }

        initialize();
    }, []);

    // Only need embeddings ready — LLM loads on demand via queue
    const embeddingsReady = embeddings?.isReady || false;

    // Mark models as downloaded when BOTH embeddings AND LLM are ready
    const allModelsReady = embeddingsReady && llmDownloadProgress >= 1;
    useEffect(() => {
        async function markModelsDownloaded() {
            if (allModelsReady && modelsDownloadedPreviously === false) {
                console.log("[App] All models downloaded, saving preference...");
                await savePreferences({ modelsDownloaded: true });
                setTimeout(() => {
                    setShowDownloadOverlay(false);
                }, 1000);
            }
        }
        markModelsDownloaded();
    }, [allModelsReady, modelsDownloadedPreviously]);

    // Pre-download LLM after embeddings are ready (download only, then free RAM)
    useEffect(() => {
        if (!embeddingsReady || llmDownloadStarted) return;

        (async () => {
            const prefs = await getPreferences();
            if (prefs.llmDownloaded) {
                setLlmDownloadProgress(1);
                return;
            }

            setLlmDownloadStarted(true);

            // Show download overlay if not already visible
            if (!showDownloadOverlay && !prefs.downloadOverlayMinimized) {
                setShowDownloadOverlay(true);
            }

            console.log("[App] Pre-downloading LLM...");

            const modelsToTry: { name: string; load: (onProgress: (p: number) => void) => Promise<LLMModule> }[] = [
                {
                    name: "Llama 3.2 1B SpinQuant",
                    load: (onProgress) =>
                        LLMModule.fromCustomModel(
                            LLAMA_3_2_1B_SPINQUANT_URLS.model,
                            LLAMA_3_2_1B_SPINQUANT_URLS.tokenizer,
                            LLAMA_3_2_1B_SPINQUANT_URLS.tokenizerConfig,
                            onProgress,
                        ),
                },
                {
                    name: "SmolLM 360M",
                    load: (onProgress) => LLMModule.fromModelName(SMOLLM2_1_360M_QUANTIZED, onProgress),
                },
            ];

            for (const { name, load } of modelsToTry) {
                try {
                    console.log(`[App] Downloading ${name}...`);
                    const module = await load((progress) => {
                        setLlmDownloadProgress(progress);
                    });
                    // Downloaded + loaded — immediately free RAM
                    module.delete();
                    console.log(`[App] ${name} pre-downloaded and freed from RAM`);
                    await savePreferences({ llmDownloaded: true });
                    setLlmDownloadProgress(1);
                    return;
                } catch (err) {
                    console.warn(`[App] ${name} pre-download failed:`, err);
                }
            }

            // All models failed — mark as done anyway so we don't block forever
            console.warn("[App] LLM pre-download failed for all models");
            setLlmDownloadProgress(1);
            await savePreferences({ llmDownloaded: true });
        })();
    }, [embeddingsReady, llmDownloadStarted, showDownloadOverlay]);

    // Handle notification taps to open the respective note
    useEffect(() => {
        let subscription: Notifications.EventSubscription | null = null;
        if (isReady) {
            const handleNavigateToNote = (noteId: unknown) => {
                if (typeof noteId !== "string" || !noteId) return;
                try {
                    router.push(`/notes/${noteId}` as any);
                } catch (error) {
                    console.error("[Notifications] Failed to navigate to note from notification:", error);
                }
            };

            (async () => {
                try {
                    const lastResponse = await Notifications.getLastNotificationResponseAsync();
                    if (lastResponse) {
                        const noteId = (lastResponse.notification.request.content.data as any)?.noteId;
                        handleNavigateToNote(noteId);
                    }
                } catch (error) {
                    console.error("[Notifications] Error checking last notification response:", error);
                }
            })();

            subscription = Notifications.addNotificationResponseReceivedListener((response) => {
                const noteId = (response.notification.request.content.data as any)?.noteId;
                handleNavigateToNote(noteId);
            });
        }

        return () => {
            subscription?.remove();
        };
    }, [isReady]);

    const handleOnboardingComplete = useCallback(async () => {
        await savePreferences({ onboardingCompleted: true });
        setShowOnboarding(false);
        setOnboardingCompleted(true);

        const prefs = await getPreferences();
        if (!prefs.modelsDownloaded) {
            setShowDownloadOverlay(true);
        }
    }, []);

    const handleOnboardingSkip = useCallback(async () => {
        await savePreferences({ onboardingCompleted: true });
        setShowOnboarding(false);
        setOnboardingCompleted(true);

        const prefs = await getPreferences();
        if (!prefs.modelsDownloaded && !prefs.downloadOverlayMinimized) {
            setShowDownloadOverlay(true);
        }
    }, []);

    const handleDownloadOverlayMinimize = useCallback(async () => {
        await savePreferences({ downloadOverlayMinimized: true });
        setDownloadOverlayMinimized(true);
        setShowDownloadOverlay(false);
    }, []);

    const handleDownloadOverlayClose = useCallback(async () => {
        // Only mark as fully downloaded if both models are actually done
        await savePreferences({
            downloadOverlayMinimized: true,
            modelsDownloaded: allModelsReady,
        });
        setDownloadOverlayMinimized(true);
        setShowDownloadOverlay(false);
    }, [allModelsReady]);

    useEffect(() => {
        const prev = prevStateRef.current;

        if (embeddingsReady !== prev.embeddingsReady) {
            console.log(`[App] AI models - Embeddings: ${embeddingsReady ? "✓" : "..."}, LLM: on-demand`);
            prev.embeddingsReady = embeddingsReady;
        }
    }, [embeddingsReady]);

    // Log AI progress at 10% intervals
    useEffect(() => {
        if (isInitializing) {
            const roundedProgress = Math.floor(overallProgress * 10) * 10;
            if (roundedProgress > prevStateRef.current.lastProgress) {
                console.log(`[App] AI models loading: ${roundedProgress}%`);
                prevStateRef.current.lastProgress = roundedProgress;
            }
        }
    }, [isInitializing, overallProgress]);

    useEffect(() => {
        if (error) {
            console.error(`[App] AI error: ${error}`);
        }
    }, [error]);

    if (!isReady) {
        return null;
    }

    return (
        <>
            {children}
            {showOnboarding ? <Onboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} /> : null}

            {showDownloadOverlay ? (
                <ModelDownloadOverlay
                    progress={(overallProgress + llmDownloadProgress) / 2}
                    embeddingsProgress={embeddings?.downloadProgress || 0}
                    llmProgress={llmDownloadProgress}
                    isVisible={showDownloadOverlay && !allModelsReady}
                    onMinimize={handleDownloadOverlayMinimize}
                    onClose={handleDownloadOverlayClose}
                    isMinimized={downloadOverlayMinimized}
                />
            ) : null}
        </>
    );
}
