import { ScanProcessing } from "@/components/scan/scan-processing";
import { ScanState } from "@/components/scan/scan-types";
import { Text } from "@/components/ui/text";
import { aiQueue } from "@/lib/ai/queue";
import { consumePendingScanPhotoUri } from "@/lib/capture/pending-scan-photo";
import { getScannedImageAsBase64 } from "@/lib/capture/scan";
import { createNote } from "@/lib/database/database";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { XIcon } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanReview } from "@/components/scan/scan-review";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
export const ScanHome: React.FC = () => {
    const { top } = useSafeAreaInsets();
    const router = useRouter();

    const didAutoOpenCameraRef = useRef(false);
    const isProcessingRef = useRef(false);

    const [scanState, setScanState] = useState<ScanState>("camera");
    const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState("");
    const [confidence, setConfidence] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenCamera = useCallback(() => {
        router.push("/scan/camera" as any);
    }, [router]);

    const handleProcessCapturedPhoto = useCallback(async (photoUri: string) => {
        if (!photoUri) return;
        if (isProcessingRef.current) return;

        try {
            isProcessingRef.current = true;
            setError(null);

            setScanState("saving-image");

            // Convert to base64 data URI so image is stored with the note
            const imageDataUri = await getScannedImageAsBase64(photoUri);
            setCapturedImagePath(imageDataUri);

            // OCR removed — go straight to review. User can add a caption.
            setExtractedText("");
            setConfidence(0);
            setScanState("review");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error("[Scan] Processing failed:", err);

            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
            setError(`Failed to process image: ${errorMessage}`);
            setScanState("camera");

            Alert.alert("Scan Failed", "Failed to process the image. Please try again.", [{ text: "OK" }]);
        } finally {
            isProcessingRef.current = false;
        }
    }, []);

    // When `/scan` regains focus (after `/scan/camera`), consume the captured photo and process it.
    // Also auto-opens the camera once on initial entry to preserve the old UX.
    useFocusEffect(
        useCallback(() => {
            const pending = consumePendingScanPhotoUri();
            if (pending) {
                handleProcessCapturedPhoto(pending);
                return;
            }

            if (!didAutoOpenCameraRef.current && scanState === "camera" && !capturedImagePath && !extractedText) {
                didAutoOpenCameraRef.current = true;
                router.push("/scan/camera" as any);
            }
        }, [capturedImagePath, extractedText, handleProcessCapturedPhoto, router, scanState]),
    );

    // Retake photo
    const handleRetake = useCallback(() => {
        setCapturedImagePath(null);
        setExtractedText("");
        setConfidence(0);
        setError(null);
        setScanState("camera");
        handleOpenCamera();
    }, [handleOpenCamera]);

    // Save and navigate to note detail
    const handleSave = useCallback(async () => {
        if (isSaving) {
            console.warn("[Scan] Already saving");
            return;
        }

        setIsSaving(true);

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            console.log("[Scan] Creating note...");
            const note = await createNote({
                content: extractedText || "",
                type: "scan",
                original_image: capturedImagePath,
            });
            console.log("[Scan] Note created:", note.id);

            // Queue for AI processing — queue manages its own LLM
            try {
                aiQueue.add({ noteId: note.id, content: extractedText || "" });
                console.log("[Scan] Note queued for AI processing");
            } catch (queueError) {
                console.error("[Scan] Failed to queue for AI processing:", queueError);
            }

            setScanState("camera");
            setCapturedImagePath(null);
            setExtractedText("");
            setConfidence(0);
            setError(null);

            // Navigate to note detail
            router.dismissAll();
            router.navigate(`/notes/${note.id}` as any);
        } catch (err) {
            setScanState("camera");
            setCapturedImagePath(null);
            setExtractedText("");
            setConfidence(0);
            setError(null);
            console.error("[Scan] Failed to save note:", err);
            Alert.alert("Error", "Failed to save note. Please try again.", [{ text: "OK" }]);
            setIsSaving(false);
        }
    }, [extractedText, capturedImagePath, router, isSaving]);

    // Close without saving
    const handleClose = useCallback(() => {
        setScanState("camera");
        router.back();
    }, [router]);

    // Render processing view
    const renderProcessing = useCallback(() => <ScanProcessing scanState={scanState} />, [scanState]);

    // Render review view
    const renderReview = useCallback(
        () => (
            <ScanReview
                capturedImagePath={capturedImagePath}
                confidence={confidence}
                extractedText={extractedText}
                setExtractedText={setExtractedText}
                handleRetake={handleRetake}
                handleSave={handleSave}
                isDisabledRetake={scanState === "processing" || scanState === "saving-image" || isSaving}
                isSaving={isSaving}
            />
        ),
        [capturedImagePath, confidence, extractedText, setExtractedText, handleRetake, handleSave, isSaving, scanState],
    );

    return (
        <Box className="flex-1 bg-background-0">
            {/* Header */}
            <Box
                style={{ paddingTop: top }}
                className="flex-row justify-between items-center p-4 mb-6 border-b bg-background-0 border-neutral-200 dark:border-neutral-800"
            >
                <Pressable hitSlop={10} onPress={handleClose}>
                    <Icon as={XIcon} size="xl" />
                </Pressable>
                <Text className="text-xl font-bold">Scan Document</Text>
                <Box className="w-10 h-10" />
            </Box>

            {/* Content based on state */}
            {scanState === "camera" ? (
                <Box className="flex-1 justify-center items-center px-6 -mt-6">
                    <Text className="mb-3 text-lg font-semibold text-center">Ready to scan</Text>
                    <Text className="mb-6 text-center text-typography-600">
                        Open the camera, take a picture, and add a caption to your note.
                    </Text>

                    <Button
                        onPress={handleOpenCamera}
                        className="rounded-lg"
                        action="secondary"
                        variant="outline"
                        disabled={false}
                    >
                        <ButtonText className="font-semibold">Open camera</ButtonText>
                    </Button>

                    {error && (
                        <Box className="p-4 mt-6 bg-red-500 rounded-lg">
                            <Text className="text-sm font-medium text-center text-white">{error}</Text>
                        </Box>
                    )}
                </Box>
            ) : null}
            {(scanState === "processing" || scanState === "saving-image") && renderProcessing()}
            {scanState === "review" && renderReview()}
        </Box>
    );
};
