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
    const [noteText, setNoteText] = useState("");
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

            const imageDataUri = await getScannedImageAsBase64(photoUri);
            setCapturedImagePath(imageDataUri);

            setNoteText("");
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

    useFocusEffect(
        useCallback(() => {
            const pending = consumePendingScanPhotoUri();
            if (pending) {
                handleProcessCapturedPhoto(pending);
                return;
            }

            if (!didAutoOpenCameraRef.current && scanState === "camera" && !capturedImagePath && !noteText) {
                didAutoOpenCameraRef.current = true;
                router.push("/scan/camera" as any);
            }
        }, [capturedImagePath, noteText, handleProcessCapturedPhoto, router, scanState]),
    );

    const handleRetake = useCallback(() => {
        setCapturedImagePath(null);
        setNoteText("");
        setError(null);
        setScanState("camera");
        handleOpenCamera();
    }, [handleOpenCamera]);

    const handleSave = useCallback(async () => {
        if (isSaving) return;

        setIsSaving(true);

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            const note = await createNote({
                content: noteText || "",
                type: "scan",
                original_image: capturedImagePath,
            });

            try {
                aiQueue.add({ noteId: note.id, content: noteText || "" });
            } catch (queueError) {
                console.error("[Scan] Failed to queue for AI processing:", queueError);
            }

            setScanState("camera");
            setCapturedImagePath(null);
            setNoteText("");
            setError(null);

            router.dismissAll();
            router.navigate(`/notes/${note.id}` as any);
        } catch (err) {
            setScanState("camera");
            setCapturedImagePath(null);
            setNoteText("");
            setError(null);
            console.error("[Scan] Failed to save note:", err);
            Alert.alert("Error", "Failed to save note. Please try again.", [{ text: "OK" }]);
            setIsSaving(false);
        }
    }, [noteText, capturedImagePath, router, isSaving]);

    const handleClose = useCallback(() => {
        setScanState("camera");
        router.back();
    }, [router]);

    const renderProcessing = useCallback(() => <ScanProcessing scanState={scanState} />, [scanState]);

    const renderReview = useCallback(
        () => (
            <ScanReview
                capturedImagePath={capturedImagePath}
                extractedText={noteText}
                setExtractedText={setNoteText}
                handleRetake={handleRetake}
                handleSave={handleSave}
                isDisabledRetake={scanState === "processing" || scanState === "saving-image" || isSaving}
                isSaving={isSaving}
            />
        ),
        [capturedImagePath, noteText, handleRetake, handleSave, isSaving, scanState],
    );

    return (
        <Box className="flex-1 bg-background-0">
            <Box
                style={{ paddingTop: top }}
                className="flex-row justify-between items-center p-4 mb-6 border-b bg-background-0 border-neutral-200 dark:border-neutral-800"
            >
                <Pressable hitSlop={10} onPress={handleClose}>
                    <Icon as={XIcon} size="xl" />
                </Pressable>
                <Text className="text-xl font-bold">Capture</Text>
                <Box className="w-10 h-10" />
            </Box>

            {scanState === "camera" ? (
                <Box className="flex-1 justify-center items-center px-6 -mt-6">
                    <Text className="mb-3 text-lg font-semibold text-center">Ready to capture</Text>
                    <Text className="mb-6 text-center text-typography-600">
                        Take a photo and add a note about what you see.
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
