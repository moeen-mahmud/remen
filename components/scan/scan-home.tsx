import { ScanModelLoading } from "@/components/scan/scan-model-loading"
import { ScanProcessing } from "@/components/scan/scan-processing"
import { ScanState } from "@/components/scan/scan-types"
import { Text } from "@/components/ui/text"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { formatOCRText, processImageOCR, saveScannedImage } from "@/lib/capture/scan"
import { createNote } from "@/lib/database"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { XIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, Pressable, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ScanCameraPermission } from "@/components/scan/scan-camera-permission"
import { ScanReview } from "@/components/scan/scan-review"
import { Box } from "@/components/ui/box"
import { Icon } from "@/components/ui/icon"
import { scanStyles as styles } from "./scan-styles"
export const ScanHome: React.FC = () => {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    // Get OCR model from AI provider
    const { ocr, llm, embeddings } = useAI()

    const [hasPermission, requestPermission] = useCameraPermissions()
    const cameraRef = useRef<CameraView>(null)

    const [scanState, setScanState] = useState<ScanState>("camera")
    const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null)
    const [extractedText, setExtractedText] = useState("")
    const [confidence, setConfidence] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Add processing lock to prevent concurrent operations
    const isProcessingRef = useRef(false)
    const isMountedRef = useRef(true)

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false
            isProcessingRef.current = false
        }
    }, [])

    // Take photo and process with better error handling
    const handleCapture = useCallback(async () => {
        // Prevent concurrent operations
        if (isProcessingRef.current) {
            console.warn("⚠️ [Scan] Already processing, ignoring capture request")
            return
        }

        if (!hasPermission) {
            Alert.alert("Permission Required", "Camera permission is required to scan documents")
            return
        }

        // Check if OCR model is ready
        if (!ocr?.isReady) {
            console.warn("⚠️ [Scan] OCR model not ready")
            setScanState("model-loading")
            return
        }

        // Check if OCR is already processing
        if (ocr?.isGenerating) {
            console.warn("⚠️ [Scan] OCR is currently processing another image")
            Alert.alert("Please Wait", "OCR is currently processing. Please wait a moment.")
            return
        }

        try {
            isProcessingRef.current = true
            setError(null)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

            console.log("📷 [Scan] Taking picture...")
            if (!cameraRef.current) {
                isProcessingRef.current = false
                console.error("📷 [Scan] Camera ref is not initialized")
                return
            }

            // Take photo with quality settings to reduce memory usage
            const photo = await cameraRef.current?.takePictureAsync({
                quality: 0.1,
            })

            console.log("no error till now")

            if (!photo?.uri) {
                throw new Error("No photo was captured")
            }

            console.log("📷 [Scan] Photo captured:", photo.uri)

            // Update state before async operations
            if (!isMountedRef.current) {
                isProcessingRef.current = false
                console.warn("⚠️ [Scan] Not mounted, ignoring capture request")
                return
            }
            setScanState("saving-image")

            // Save image permanently first (this is fast)
            console.log("💾 [Scan] Saving image...")
            const savedPath = await saveScannedImage(photo.uri)
            console.log("✅ [Scan] Image saved:", savedPath)

            if (!isMountedRef.current) {
                isProcessingRef.current = false
                console.warn("⚠️ [Scan] Not mounted, ignoring save request")
                return
            }
            setCapturedImagePath(savedPath)
            setScanState("processing")

            // Small delay to ensure UI updates
            await new Promise((resolve) => setTimeout(resolve, 100))

            // Process OCR with timeout protection
            console.log("🔍 [Scan] Starting OCR processing...")

            const ocrPromise = processImageOCR(savedPath, ocr)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("OCR timeout after 30 seconds")), 30000),
            )

            const result = (await Promise.race([ocrPromise, timeoutPromise])) as Awaited<
                ReturnType<typeof processImageOCR>
            >

            console.log(`✅ [Scan] OCR complete. Confidence: ${Math.round(result.confidence * 100)}%`)

            if (!isMountedRef.current) {
                isProcessingRef.current = false
                console.warn("⚠️ [Scan] Not mounted, ignoring OCR completion")
                return
            }

            const formattedText = formatOCRText(result)

            if (!formattedText || formattedText.trim().length === 0) {
                console.warn("⚠️ [Scan] No text extracted from image")
                setExtractedText("")
                setConfidence(0)
            } else {
                setExtractedText(formattedText)
                setConfidence(result.confidence)
            }

            setScanState("review")
            isProcessingRef.current = false
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            console.error("❌ [Scan] Capture/process failed:", err)

            const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"

            if (!isMountedRef.current) return

            setError(`Failed to process image: ${errorMessage}`)
            setScanState("camera")

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)

            // Show user-friendly error
            Alert.alert(
                "Scan Failed",
                "Failed to process the image. This might be unknown error." +
                    "Try restarting the app or scanning a smaller area.",
                [{ text: "OK" }],
            )
        } finally {
            isProcessingRef.current = false
        }
    }, [ocr, hasPermission])

    // Retake photo
    const handleRetake = useCallback(() => {
        if (isProcessingRef.current) {
            console.warn("⚠️ [Scan] Cannot retake while processing")
            return
        }

        setScanState("camera")
        setCapturedImagePath(null)
        setExtractedText("")
        setConfidence(0)
        setError(null)
    }, [])

    // Save and navigate to note detail with better error handling
    const handleSave = useCallback(async () => {
        if (!extractedText || extractedText?.trim()?.length === 0) {
            Alert.alert("No Text", "No text was extracted from the image.")
            return
        }

        if (isSaving) {
            console.warn("⚠️ [Scan] Already saving")
            return
        }

        setIsSaving(true)

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

            console.log("💾 [Scan] Creating note...")
            const note = await createNote({
                content: extractedText,
                type: "scan",
                original_image: capturedImagePath,
            })
            console.log("✅ [Scan] Note created:", note.id)

            // Queue for AI processing (pass models) - but don't block navigation
            if (llm?.isReady && embeddings?.isReady) {
                try {
                    aiQueue.setModels({ llm, embeddings })
                    aiQueue.add({ noteId: note.id, content: extractedText })
                    console.log("📋 [Scan] Note queued for AI processing")
                } catch (queueError) {
                    console.error("⚠️ [Scan] Failed to queue for AI processing:", queueError)
                    // Don't block navigation on queue failure
                }
            }

            setScanState("camera")
            setCapturedImagePath(null)
            setExtractedText("")
            setConfidence(0)
            setError(null)

            // Navigate to note detail
            router.dismissAll()
            router.navigate(`/notes/${note.id}` as any)
        } catch (err) {
            setScanState("camera")
            setCapturedImagePath(null)
            setExtractedText("")
            setConfidence(0)
            setError(null)
            console.error("❌ [Scan] Failed to save note:", err)
            Alert.alert("Error", "Failed to save note. Please try again.", [{ text: "OK" }])
            setIsSaving(false)
        }
    }, [extractedText, capturedImagePath, router, llm, embeddings, isSaving])

    // Close without saving
    const handleClose = useCallback(() => {
        if (isProcessingRef.current) {
            Alert.alert("Processing", "OCR is still processing. Are you sure you want to cancel?", [
                { text: "Wait", style: "cancel" },
                {
                    text: "Cancel",
                    style: "destructive",
                    onPress: () => {
                        isProcessingRef.current = false
                        router.back()
                    },
                },
            ])
            return
        }
        router.back()
    }, [router])

    // Render model loading view
    const renderModelLoading = useCallback(
        () => <ScanModelLoading ocr={ocr} setScanState={setScanState} />,
        [ocr, setScanState],
    )

    // Render processing view
    const renderProcessing = useCallback(() => <ScanProcessing scanState={scanState} />, [scanState])

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
                isDisabledRetake={isProcessingRef.current}
                isSaving={isSaving}
            />
        ),
        [capturedImagePath, confidence, extractedText, setExtractedText, handleRetake, handleSave, isSaving],
    )

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

            {!hasPermission ? <ScanCameraPermission requestPermission={requestPermission} /> : null}

            {/* Content based on state */}
            {scanState === "camera" && hasPermission ? (
                <Box className="flex-1 -mt-6">
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="picture" facing="back" />

                    {/* Camera overlay with guide */}
                    <Box style={styles.mask}>
                        <Box style={styles.maskTop} />
                        <Box style={styles.maskMiddle}>
                            <Box style={styles.maskSide} />
                            <Box className="rounded-lg" style={styles.scanFrame} />
                            <Box style={styles.maskSide} />
                        </Box>
                        <Box style={styles.maskBottom} />
                    </Box>

                    {/* OCR Model Status */}
                    {!ocr?.isReady && (
                        <Box style={styles.modelStatusBanner}>
                            <Text style={styles.modelStatusText}>
                                OCR model loading: {Math.round((ocr?.downloadProgress || 0) * 100)}%
                            </Text>
                        </Box>
                    )}

                    {/* Capture button */}
                    <Box style={[styles.captureButtonContainer, { paddingBottom: bottom + 20 }]}>
                        <Pressable
                            onPress={handleCapture}
                            disabled={!ocr?.isReady || ocr?.isGenerating}
                            style={[
                                styles.captureButton,
                                (!ocr?.isReady || ocr?.isGenerating) && styles.captureButtonDisabled,
                            ]}
                        />
                    </Box>

                    {error && (
                        <Box className="absolute right-5 left-5 bottom-48 p-4 mx-8 bg-red-500 rounded-lg">
                            <Text className="text-sm font-medium text-center text-white">{error}</Text>
                        </Box>
                    )}
                </Box>
            ) : null}
            {(scanState === "processing" || scanState === "saving-image") && renderProcessing()}
            {scanState === "review" && renderReview()}
            {scanState === "model-loading" && renderModelLoading()}
        </Box>
    )
}
