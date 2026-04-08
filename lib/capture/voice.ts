import { VoiceCallback, VoiceState } from "@/lib/capture/voice.types";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import type { EventSubscription } from "expo-modules-core";

class VoiceCapture {
    private callback: VoiceCallback | null = null;
    private state: VoiceState = {
        isListening: false,
        results: [],
        partialResults: [],
        error: null,
    };
    private subscriptions: EventSubscription[] = [];

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        this.cleanupListeners();

        this.subscriptions.push(
            ExpoSpeechRecognitionModule.addListener("start", () => {
                this.updateState({ isListening: true, error: null });
            }),
        );

        this.subscriptions.push(
            ExpoSpeechRecognitionModule.addListener("end", () => {
                this.updateState({ isListening: false });
            }),
        );

        this.subscriptions.push(
            ExpoSpeechRecognitionModule.addListener("result", (event) => {
                const transcript = event.results?.[0]?.transcript ?? "";
                if (event.isFinal) {
                    this.updateState({
                        results: transcript ? [transcript] : [],
                        partialResults: [],
                        isListening: false,
                    });
                } else {
                    this.updateState({
                        partialResults: transcript ? [transcript] : [],
                    });
                }
            }),
        );

        this.subscriptions.push(
            ExpoSpeechRecognitionModule.addListener("error", (event) => {
                console.error("Voice error:", event.error, event.message);
                this.updateState({
                    isListening: false,
                    error: event.message ?? event.error ?? "Unknown error occurred",
                });
            }),
        );
    }

    private cleanupListeners() {
        this.subscriptions.forEach((sub) => sub.remove());
        this.subscriptions = [];
    }

    private updateState(partial: Partial<VoiceState>) {
        this.state = { ...this.state, ...partial };
        this.callback?.(this.state);
    }

    setCallback(callback: VoiceCallback) {
        this.callback = callback;
    }

    async start(locale: string = "en-US") {
        try {
            this.updateState({
                results: [],
                partialResults: [],
                error: null,
            });

            // Ensure permissions are granted
            const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            if (!granted) {
                this.updateState({
                    error: "Microphone permission denied",
                    isListening: false,
                });
                return;
            }

            ExpoSpeechRecognitionModule.start({
                lang: locale,
                interimResults: true,
                continuous: true,
            });
        } catch (error) {
            console.error("Failed to start voice:", error);
            this.updateState({
                error: "Failed to start voice recognition",
                isListening: false,
            });
        }
    }

    async stop() {
        try {
            ExpoSpeechRecognitionModule.stop();
        } catch (error) {
            console.error("Failed to stop voice:", error);
        }
    }

    async cancel() {
        try {
            ExpoSpeechRecognitionModule.abort();
            this.updateState({
                isListening: false,
                partialResults: [],
            });
        } catch (error) {
            console.error("Failed to cancel voice:", error);
        }
    }

    async destroy() {
        try {
            ExpoSpeechRecognitionModule.abort();
        } catch (_) {
            // ignore
        }
        this.cleanupListeners();
        this.callback = null;
    }

    async isAvailable(): Promise<boolean> {
        try {
            // Request permissions if not yet granted (first launch)
            const { status } = await ExpoSpeechRecognitionModule.getPermissionsAsync();
            if (status === "granted") return true;
            const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
            return granted;
        } catch {
            return false;
        }
    }

    getState(): VoiceState {
        return this.state;
    }

    getCurrentTranscript(): string {
        if (this.state.partialResults.length > 0 && this.state.isListening) {
            return this.state.partialResults[0] ?? "";
        }
        return this.state.results[0] ?? "";
    }
}

// Singleton instance
export const voiceCapture = new VoiceCapture();
