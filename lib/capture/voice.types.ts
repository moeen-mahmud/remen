export interface VoiceState {
    isListening: boolean;
    results: string[];
    partialResults: string[];
    error: string | null;
}

export type VoiceCallback = (state: VoiceState) => void;
