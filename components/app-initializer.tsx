import { ModelDownloadOverlay } from "@/components/model-download-overlay";
import { Onboarding } from "@/components/onboarding";
import { useAI } from "@/lib/ai";
import { aiQueue } from "@/lib/ai/queue";
import { getDatabase, getUnprocessedNotes } from "@/lib/database";
import { getPreferences, savePreferences } from "@/lib/preferences";
import * as Notifications from "expo-notifications";
import { router, SplashScreen } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

export function AppInitializer({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showDownloadOverlay, setShowDownloadOverlay] = useState(false);
    const [downloadOverlayMinimized, setDownloadOverlayMinimized] = useState(false);
    const [modelsDownloadedPreviously, setModelsDownloadedPreviously] = useState<boolean | null>(null);
    const [, setOnboardingCompleted] = useState<boolean | null>(null);
    const { llm, embeddings, ocr, isInitializing, overallProgress, error } = useAI();

    // Track previous state to avoid duplicate logs
    const prevStateRef = useRef({ llmReady: false, embeddingsReady: false, lastProgress: 0 });

    // Check if models were previously downloaded and onboarding completed
    useEffect(() => {
        async function checkPreferences() {
            const prefs = await getPreferences();
            setModelsDownloadedPreviously(prefs.modelsDownloaded);
            setOnboardingCompleted(prefs.onboardingCompleted);
            setDownloadOverlayMinimized(prefs.downloadOverlayMinimized);

            // Show onboarding if not completed, otherwise show download overlay if models not downloaded
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

    // Update AI models in queue when their ready state changes
    const llmReady = llm?.isReady || false;
    const embeddingsReady = embeddings?.isReady || false;
    const ocrReady = ocr?.isReady || false;
    const allModelsReady = llmReady && embeddingsReady && ocrReady;

    // Mark models as downloaded when all are ready (only if no memory error)
    useEffect(() => {
        async function markModelsDownloaded() {
            if (allModelsReady && modelsDownloadedPreviously === false) {
                console.log("[App] All models downloaded, saving preference...");
                await savePreferences({ modelsDownloaded: true });
                setTimeout(() => {
                    setShowDownloadOverlay(false);
                }, 500);
            }
        }
        markModelsDownloaded();
    }, [allModelsReady, modelsDownloadedPreviously]);

    // Handle notification taps to open the respective note
    useEffect(() => {
        let subscription: Notifications.EventSubscription | null = null;
        if (isReady) {
            // Helper to navigate to a note if we have a valid ID
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

            // Listen for taps while the app is in foreground/background
            subscription = Notifications.addNotificationResponseReceivedListener((response) => {
                const noteId = (response.notification.request.content.data as any)?.noteId;
                handleNavigateToNote(noteId);
            });
        }

        return () => {
            subscription?.remove();
        };
    }, [isReady]);

    // Handle onboarding completion
    const handleOnboardingComplete = useCallback(async () => {
        await savePreferences({ onboardingCompleted: true });
        setShowOnboarding(false);
        setOnboardingCompleted(true);

        // Check if we should show download overlay after onboarding
        const prefs = await getPreferences();
        if (!prefs.modelsDownloaded) {
            setShowDownloadOverlay(true);
        }
    }, []);

    // Handle onboarding skip
    const handleOnboardingSkip = useCallback(async () => {
        await savePreferences({ onboardingCompleted: true });
        setShowOnboarding(false);
        setOnboardingCompleted(true);

        // Check if we should show download overlay after onboarding
        const prefs = await getPreferences();
        if (!prefs.modelsDownloaded && !prefs.downloadOverlayMinimized) {
            setShowDownloadOverlay(true);
        }
    }, []);

    // Handle download overlay minimize
    const handleDownloadOverlayMinimize = useCallback(async () => {
        await savePreferences({ downloadOverlayMinimized: true });
        setDownloadOverlayMinimized(true);
        setShowDownloadOverlay(false);
    }, []);

    // Handle download overlay close
    const handleDownloadOverlayClose = useCallback(async () => {
        await savePreferences({ downloadOverlayMinimized: true, modelsDownloaded: true });
        setDownloadOverlayMinimized(true);
        setShowDownloadOverlay(false);
    }, []);

    useEffect(() => {
        const prev = prevStateRef.current;

        // Only log when state actually changes
        if (llmReady !== prev.llmReady || embeddingsReady !== prev.embeddingsReady) {
            console.log(
                `[App] AI models - LLM: ${llmReady ? "✓" : "..."}, Embeddings: ${embeddingsReady ? "✓" : "..."}`,
            );
            prev.llmReady = llmReady;
            prev.embeddingsReady = embeddingsReady;
        }

        if (llm || embeddings) {
            aiQueue.setModels({ llm, embeddings });
        }
    }, [llm, embeddings, llmReady, embeddingsReady]);

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

    // Log errors
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
            {/* Show onboarding on first launch */}
            {showOnboarding ? <Onboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} /> : null}

            {/* Show download overlay after onboarding while models are downloading (only if no memory error) */}
            {showDownloadOverlay ? (
                <ModelDownloadOverlay
                    progress={overallProgress}
                    llmProgress={llm?.downloadProgress || 0}
                    embeddingsProgress={embeddings?.downloadProgress || 0}
                    ocrProgress={ocr?.downloadProgress || 0}
                    isVisible={showDownloadOverlay && isInitializing}
                    onMinimize={handleDownloadOverlayMinimize}
                    onClose={handleDownloadOverlayClose}
                    isMinimized={downloadOverlayMinimized}
                />
            ) : null}

            {/* Show memory error overlay if models failed due to memory issues */}
            {/* {hasMemoryError ? <MemoryErrorOverlay isVisible={hasMemoryError} /> : null} */}
        </>
    );
}
