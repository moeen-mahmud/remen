import { ScanModelLoading } from "@/components/scan/scan-model-loading";
import { ScanProcessing } from "@/components/scan/scan-processing";
import { ScanState } from "@/components/scan/scan-types";
import { Text } from "@/components/ui/text";
import { useAI } from "@/lib/ai/provider";
import { aiQueue } from "@/lib/ai/queue";
import { consumePendingScanPhotoUri } from "@/lib/capture/pending-scan-photo";
import { formatOCRText, processImageOCR, saveScannedImage } from "@/lib/capture/scan";
import { createNote } from "@/lib/database";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { XIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScanReview } from "@/components/scan/scan-review";
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
export const ScanHome: React.FC = () => {
    const { top } = useSafeAreaInsets();
    const router = useRouter();

    // Get OCR model from AI provider
    const { ocr, llm, embeddings } = useAI();

    const didAutoOpenCameraRef = useRef(false);
    const isProcessingRef = useRef(false);
    const pendingPhotoUriRef = useRef<string | null>(null);

    const [scanState, setScanState] = useState<ScanState>("camera");
    const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState("");
    const [confidence, setConfidence] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenCamera = useCallback(() => {
        router.push("/scan/camera" as any);
    }, [router]);

    const handleProcessCapturedPhoto = useCallback(
        async (photoUri: string) => {
            if (!photoUri) return;
            if (isProcessingRef.current) return;

            // Check if OCR model is ready
            if (!ocr?.isReady) {
                pendingPhotoUriRef.current = photoUri;
                setScanState("model-loading");
                return;
            }

            // Check if OCR is already processing
            if (ocr?.isGenerating) {
                Alert.alert("Please Wait", "OCR is currently processing. Please wait a moment.");
                return;
            }

            try {
                isProcessingRef.current = true;
                setError(null);

                setScanState("saving-image");

                // Save image permanently first (this is fast)
                const savedPath = await saveScannedImage(photoUri);
                setCapturedImagePath(savedPath);

                setScanState("processing");

                // Small delay to ensure UI updates
                await new Promise((resolve) => setTimeout(resolve, 100));

                const ocrPromise = processImageOCR(savedPath, ocr);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("OCR timeout after 30 seconds")), 30000),
                );

                const result = (await Promise.race([ocrPromise, timeoutPromise])) as Awaited<
                    ReturnType<typeof processImageOCR>
                >;

                const formattedText = formatOCRText(result);

                if (!formattedText || formattedText.trim().length === 0) {
                    setExtractedText("");
                    setConfidence(0);
                } else {
                    setExtractedText(formattedText);
                    setConfidence(result.confidence);
                }

                setScanState("review");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
                console.error("❌ [Scan] Processing failed:", err);

                const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
                setError(`Failed to process image: ${errorMessage}`);
                setScanState("camera");

                Alert.alert(
                    "Scan Failed",
                    "Failed to process the image. This might be an unknown error. Try restarting the app or scanning a smaller area.",
                    [{ text: "OK" }],
                );
            } finally {
                isProcessingRef.current = false;
            }
        },
        [ocr],
    );

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

    // If we captured a photo while the OCR model wasn't ready, resume once it becomes ready.
    useEffect(() => {
        if (scanState !== "model-loading") return;
        if (!ocr?.isReady) return;
        if (!pendingPhotoUriRef.current) return;

        const uri = pendingPhotoUriRef.current;
        pendingPhotoUriRef.current = null;
        handleProcessCapturedPhoto(uri);
    }, [handleProcessCapturedPhoto, ocr?.isReady, scanState]);

    // Retake photo
    const handleRetake = useCallback(() => {
        setCapturedImagePath(null);
        setExtractedText("");
        setConfidence(0);
        setError(null);
        setScanState("camera");
        handleOpenCamera();
    }, [handleOpenCamera]);

    // Save and navigate to note detail with better error handling
    const handleSave = useCallback(async () => {
        if (!extractedText || extractedText?.trim()?.length === 0) {
            Alert.alert("No Text", "No text was extracted from the image.");
            return;
        }

        if (isSaving) {
            console.warn("⚠️ [Scan] Already saving");
            return;
        }

        setIsSaving(true);

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            console.log("💾 [Scan] Creating note...");
            const note = await createNote({
                content: extractedText,
                type: "scan",
                original_image: capturedImagePath,
            });
            console.log("✅ [Scan] Note created:", note.id);

            // Queue for AI processing (pass models) - but don't block navigation
            if (llm?.isReady && embeddings?.isReady) {
                try {
                    aiQueue.setModels({ llm, embeddings });
                    aiQueue.add({ noteId: note.id, content: extractedText });
                    console.log("📋 [Scan] Note queued for AI processing");
                } catch (queueError) {
                    console.error("⚠️ [Scan] Failed to queue for AI processing:", queueError);
                    // Don't block navigation on queue failure
                }
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
            console.error("❌ [Scan] Failed to save note:", err);
            Alert.alert("Error", "Failed to save note. Please try again.", [{ text: "OK" }]);
            setIsSaving(false);
        }
    }, [extractedText, capturedImagePath, router, llm, embeddings, isSaving]);

    // Close without saving
    const handleClose = useCallback(() => {
        setScanState("camera");
        router.back();
    }, [router]);

    // Render model loading view
    const renderModelLoading = useCallback(
        () => <ScanModelLoading ocr={ocr} setScanState={setScanState} />,
        [ocr, setScanState],
    );

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
                        Open the camera, align your document inside the frame, then take a picture.
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

                    {!ocr?.isReady && (
                        <Box className="px-4 py-2 mt-6 bg-blue-500 rounded-md">
                            <Text className="text-sm font-medium text-center text-white">
                                OCR model loading: {Math.round((ocr?.downloadProgress || 0) * 100)}%
                            </Text>
                        </Box>
                    )}

                    {error && (
                        <Box className="p-4 mt-6 bg-red-500 rounded-lg">
                            <Text className="text-sm font-medium text-center text-white">{error}</Text>
                        </Box>
                    )}
                </Box>
            ) : null}
            {(scanState === "processing" || scanState === "saving-image") && renderProcessing()}
            {scanState === "review" && renderReview()}
            {scanState === "model-loading" && renderModelLoading()}
        </Box>
    );
};
