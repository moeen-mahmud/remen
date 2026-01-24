import { Text } from "@/components/ui/text"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { formatOCRText, processImageOCR, saveScannedImage } from "@/lib/capture/scan"
import { createNote } from "@/lib/database"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as Haptics from "expo-haptics"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { CheckIcon, RefreshCwIcon, XIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type ScanState = "camera" | "processing" | "review" | "model-loading" | "saving-image"

export default function ScanCaptureScreen() {
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
    const renderModelLoading = () => (
        <View style={[styles.centeredContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
            <Text style={[styles.processingText, { color: isDark ? "#fff" : "#000" }]}>Loading OCR model...</Text>
            <Text style={[styles.subText, { color: isDark ? "#888" : "#666" }]}>
                {Math.round((ocr?.downloadProgress || 0) * 100)}% downloaded
            </Text>
            <Pressable
                onPress={() => setScanState("camera")}
                style={[styles.cancelButton, { borderColor: isDark ? "#333" : "#ddd" }]}
            >
                <Text style={[styles.cancelButtonText, { color: isDark ? "#fff" : "#000" }]}>Cancel</Text>
            </Pressable>
        </View>
    )

    // Render camera view
    const renderCamera = () => {
        if (!hasPermission) {
            return (
                <View style={styles.centeredContainer}>
                    <Text className="text-typography-600" style={styles.permissionText}>
                        Camera permission is required to scan documents
                    </Text>
                    <Pressable onPress={requestPermission} style={styles.permissionButton}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </Pressable>
                </View>
            )
        }

        return (
            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="picture" facing="back" />

                {/* Camera overlay with guide */}
                <View style={styles.mask}>
                    <View style={styles.maskTop} />
                    <View style={styles.maskMiddle}>
                        <View style={styles.maskSide} />
                        <View style={styles.scanFrame} />
                        <View style={styles.maskSide} />
                    </View>
                    <View style={styles.maskBottom} />
                </View>

                {/* OCR Model Status */}
                {!ocr?.isReady && (
                    <View style={styles.modelStatusBanner}>
                        <Text style={styles.modelStatusText}>
                            OCR model loading: {Math.round((ocr?.downloadProgress || 0) * 100)}%
                        </Text>
                    </View>
                )}

                {/* Capture button */}
                <View style={[styles.captureButtonContainer, { paddingBottom: bottom + 20 }]}>
                    <Pressable
                        onPress={handleCapture}
                        disabled={!ocr?.isReady || ocr?.isGenerating}
                        style={[
                            styles.captureButton,
                            (!ocr?.isReady || ocr?.isGenerating) && styles.captureButtonDisabled,
                        ]}
                    >
                        {/* Camera icon or indicator */}
                    </Pressable>
                </View>

                {error && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>
        )
    }

    // Render processing view
    const renderProcessing = () => (
        <View style={[styles.centeredContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
            <Text style={[styles.processingText, { color: isDark ? "#fff" : "#000" }]}>
                {scanState === "saving-image" ? "Saving image..." : "Processing document..."}
            </Text>
            <Text style={[styles.subText, { color: isDark ? "#888" : "#666" }]}>This may take a moment</Text>
        </View>
    )

    // Render review view
    const renderReview = () => (
        <KeyboardAwareScrollView
            style={[styles.reviewContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}
            contentContainerStyle={styles.reviewContent}
        >
            {/* Scanned image preview */}
            {capturedImagePath && (
                <View className="dark:bg-neutral-900 bg-neutral-200" style={styles.imagePreviewContainer}>
                    <Image
                        source={{ uri: capturedImagePath }}
                        style={styles.imagePreview}
                        contentFit="contain"
                        transition={200}
                    />
                    <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{Math.round(confidence * 100)}% confidence</Text>
                    </View>
                </View>
            )}

            {/* Extracted text */}
            <View style={styles.textSection}>
                <Text style={[styles.sectionTitle, { color: isDark ? "#fff" : "#000" }]}>Extracted Text</Text>
                <TextInput
                    style={[
                        styles.textInput,
                        {
                            color: isDark ? "#fff" : "#000",
                            backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                            borderColor: isDark ? "#333" : "#e5e5e5",
                        },
                    ]}
                    value={extractedText}
                    onChangeText={setExtractedText}
                    multiline
                    textAlignVertical="top"
                    placeholder="No text detected"
                    placeholderTextColor={isDark ? "#666" : "#999"}
                />
            </View>

            {/* Action buttons */}
            <View style={[styles.actionButtons, { paddingBottom: bottom + 20 }]}>
                <Pressable
                    onPress={handleRetake}
                    disabled={isProcessingRef.current}
                    style={[
                        styles.actionButton,
                        styles.secondaryButton,
                        {
                            borderColor: isDark ? "#333" : "#ddd",
                            opacity: isProcessingRef.current ? 0.5 : 1,
                        },
                    ]}
                >
                    <RefreshCwIcon size={20} color={isDark ? "#fff" : "#000"} />
                    <Text style={[styles.actionButtonText, { color: isDark ? "#fff" : "#000" }]}>Retake</Text>
                </Pressable>
                <Pressable
                    onPress={handleSave}
                    disabled={isSaving}
                    style={[
                        styles.actionButton,
                        styles.primaryButton,
                        {
                            opacity: isSaving || isProcessingRef.current ? 0.5 : 1,
                        },
                    ]}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <CheckIcon size={20} color="#fff" />
                            <Text style={[styles.actionButtonText, { color: "#fff" }]}>Save</Text>
                        </>
                    )}
                </Pressable>
            </View>
        </KeyboardAwareScrollView>
    )

    return (
        <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: top + 8,
                        backgroundColor: scanState === "camera" ? "rgba(0,0,0,0.5)" : isDark ? "#000" : "#fff",
                    },
                ]}
            >
                <Pressable onPress={handleClose} style={styles.closeButton}>
                    <XIcon size={24} color={scanState === "camera" ? "#fff" : isDark ? "#fff" : "#000"} />
                </Pressable>
                <Text
                    style={[styles.headerTitle, { color: scanState === "camera" ? "#fff" : isDark ? "#fff" : "#000" }]}
                >
                    Scan Document
                </Text>
                <View style={styles.closeButton} />
            </View>

            {/* Content based on state */}
            {scanState === "camera" && renderCamera()}
            {(scanState === "processing" || scanState === "saving-image") && renderProcessing()}
            {scanState === "review" && renderReview()}
            {scanState === "model-loading" && renderModelLoading()}
        </View>
    )
}

// Styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    closeButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 22,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: "600",
        letterSpacing: -0.3,
    },
    centeredContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    permissionText: {
        fontSize: 17,
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 26,
    },
    permissionButton: {
        backgroundColor: "#D97706",
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 12,
        minHeight: 56,
        justifyContent: "center",
    },
    permissionButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "600",
    },
    cameraContainer: { flex: 1 },
    modelStatusBanner: {
        position: "absolute",
        top: 120,
        left: 20,
        right: 20,
        backgroundColor: "rgba(59, 130, 246, 0.95)",
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    modelStatusText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 14,
        fontWeight: "500",
    },
    captureButtonContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#fff",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
    },
    captureButtonDisabled: { opacity: 0.5 },
    errorBanner: {
        position: "absolute",
        bottom: 160,
        left: 20,
        right: 20,
        backgroundColor: "rgba(239, 68, 68, 0.95)",
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    errorText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 15,
        fontWeight: "500",
    },
    processingText: {
        marginTop: 20,
        fontSize: 17,
        fontWeight: "500",
    },
    subText: {
        marginTop: 8,
        fontSize: 14,
    },
    cancelButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        borderWidth: 1,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: "500",
    },
    reviewContainer: {
        flex: 1,
        paddingTop: 80,
    },
    reviewContent: { padding: 16 },
    imagePreviewContainer: {
        marginVertical: 24,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    imagePreview: {
        width: "100%",
        height: 300,
        borderRadius: 16,
    },
    confidenceBadge: {
        position: "absolute",
        bottom: 12,
        right: 12,
        backgroundColor: "rgba(0,0,0,0.75)",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    confidenceText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    textSection: { marginBottom: 24 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        opacity: 0.7,
    },
    textInput: {
        fontSize: 17,
        lineHeight: 28,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 200,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: 56,
        borderRadius: 12,
        gap: 8,
    },
    primaryButton: { backgroundColor: "#3B82F6" },
    secondaryButton: { borderWidth: 1 },
    actionButtonText: {
        fontSize: 17,
        fontWeight: "600",
    },
    mask: { ...StyleSheet.absoluteFillObject },
    maskTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
    maskMiddle: { flexDirection: "row" },
    maskSide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
    scanFrame: {
        width: "85%",
        aspectRatio: 0.7,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#fff",
    },
    maskBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
})
