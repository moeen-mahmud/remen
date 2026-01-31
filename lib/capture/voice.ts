import { VoiceCallback, VoiceState } from "@/lib/capture/voice.types";
import Voice, {
    type SpeechEndEvent,
    type SpeechErrorEvent,
    type SpeechResultsEvent,
    type SpeechStartEvent,
} from "@react-native-voice/voice";

class VoiceCapture {
    private callback: VoiceCallback | null = null;
    private state: VoiceState = {
        isListening: false,
        results: [],
        partialResults: [],
        error: null,
    };

    constructor() {
        this.setupListeners();
    }

    private setupListeners() {
        Voice.onSpeechStart = this.onSpeechStart.bind(this);
        Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
        Voice.onSpeechResults = this.onSpeechResults.bind(this);
        Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
        Voice.onSpeechError = this.onSpeechError.bind(this);
    }

    private updateState(partial: Partial<VoiceState>) {
        this.state = { ...this.state, ...partial };
        this.callback?.(this.state);
    }

    private onSpeechStart(_e: SpeechStartEvent) {
        this.updateState({ isListening: true, error: null });
    }

    private onSpeechEnd(_e: SpeechEndEvent) {
        this.updateState({ isListening: false });
    }

    private onSpeechResults(e: SpeechResultsEvent) {
        this.updateState({
            results: e.value ?? [],
            isListening: false,
        });
    }

    private onSpeechPartialResults(e: SpeechResultsEvent) {
        this.updateState({ partialResults: e.value ?? [] });
    }

    private onSpeechError(e: SpeechErrorEvent) {
        console.error("Voice error:", e.error);
        this.updateState({
            isListening: false,
            error: e.error?.message ?? "Unknown error occurred",
        });
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
            await Voice.start(locale);
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
            await Voice.stop();
        } catch (error) {
            console.error("Failed to stop voice:", error);
        }
    }

    async cancel() {
        try {
            await Voice.cancel();
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
            await Voice.destroy();
            this.callback = null;
        } catch (error) {
            console.error("Failed to destroy voice:", error);
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            const available = await Voice.isAvailable();
            return available === 1 || Boolean(available) === true;
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
