export interface Preferences {
    theme: "system" | "light" | "dark";
    hapticFeedback: boolean;
    autoSaveDelay: number; // in milliseconds
    modelsDownloaded: boolean; // tracks if AI models have been downloaded (first-time only)
    onboardingCompleted: boolean; // tracks if user has completed onboarding
    downloadOverlayMinimized: boolean; // tracks if download overlay has been minimized
    iCloudSyncEnabled: boolean; // tracks if iCloud sync is enabled
    lastICloudSync: number | null; // tracks the last sync time
}
