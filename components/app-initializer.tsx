import { ModelDownloadOverlay } from "@/components/model-download-overlay";
import { Onboarding } from "@/components/onboarding/onboarding-home";
import { useAI } from "@/lib/ai";
import { aiQueue } from "@/lib/ai/queue";
import { getDatabase, getUnprocessedNotes } from "@/lib/database/database";
import { getPreferences, savePreferences } from "@/lib/preference/preferences";
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
    const { embeddings, isInitializing, overallProgress, error } = useAI();

    const prevStateRef = useRef({ embeddingsReady: false, lastProgress: 0 });

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

    // Mark models as downloaded when embeddings are ready
    useEffect(() => {
        async function markModelsDownloaded() {
            if (embeddingsReady && modelsDownloadedPreviously === false) {
                console.log("[App] Embeddings downloaded, saving preference...");
                await savePreferences({ modelsDownloaded: true });
                setTimeout(() => {
                    setShowDownloadOverlay(false);
                }, 500);
            }
        }
        markModelsDownloaded();
    }, [embeddingsReady, modelsDownloadedPreviously]);

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
        await savePreferences({ downloadOverlayMinimized: true, modelsDownloaded: true });
        setDownloadOverlayMinimized(true);
        setShowDownloadOverlay(false);
    }, []);

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
                    progress={overallProgress}
                    embeddingsProgress={embeddings?.downloadProgress || 0}
                    isVisible={showDownloadOverlay && isInitializing}
                    onMinimize={handleDownloadOverlayMinimize}
                    onClose={handleDownloadOverlayClose}
                    isMinimized={downloadOverlayMinimized}
                />
            ) : null}
        </>
    );
}
