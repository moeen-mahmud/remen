import { Text } from "@/components/ui/text"
import { useAI } from "@/lib/ai/provider"
import { aiQueue } from "@/lib/ai/queue"
import { formatOCRText, processImageOCR, saveScannedImage } from "@/lib/capture/scan"
import { createNote } from "@/lib/database"
import * as Haptics from "expo-haptics"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { CameraIcon, CheckIcon, RefreshCwIcon, XIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera"

type ScanState = "camera" | "processing" | "review" | "model-loading"

export default function ScanCaptureScreen() {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    // Get OCR model from AI provider
    const { ocr, llm, embeddings } = useAI()

    const { hasPermission, requestPermission } = useCameraPermission()
    const device = useCameraDevice("back")
    const cameraRef = useRef<Camera>(null)

    const [state, setState] = useState<ScanState>("camera")
    const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null)
    const [extractedText, setExtractedText] = useState("")
    const [confidence, setConfidence] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Request permission on mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission()
        }
    }, [hasPermission, requestPermission])

    // Take photo and process
    const handleCapture = useCallback(async () => {
        if (!cameraRef.current) return

        // Check if OCR model is ready
        if (!ocr?.isReady) {
            setState("model-loading")
            return
        }

        try {
            setError(null)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

            // Take photo
            const photo = await cameraRef.current.takePhoto()
            setState("processing")

            // Save image permanently
            const savedPath = await saveScannedImage(photo.path)
            setCapturedImagePath(savedPath)

            // Process OCR using ExecutorTorch
            const result = await processImageOCR(photo.path, ocr)
            setExtractedText(formatOCRText(result))
            setConfidence(result.confidence)

            setState("review")
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            console.error("Failed to capture/process:", err)
            setError("Failed to process image. Please try again.")
            setState("camera")
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
    }, [ocr])

    // Retake photo
    const handleRetake = useCallback(() => {
        setState("camera")
        setCapturedImagePath(null)
        setExtractedText("")
        setConfidence(0)
        setError(null)
    }, [])

    // Save and navigate to note detail
    const handleSave = useCallback(async () => {
        if (extractedText.trim().length === 0) {
            Alert.alert("No Text", "No text was extracted from the image.")
            return
        }

        setIsSaving(true)

        try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

            const note = await createNote({
                content: extractedText,
                type: "scan",
                original_image: capturedImagePath,
            })

            // Queue for AI processing (pass models)
            aiQueue.setModels({ llm, embeddings })
            aiQueue.add({ noteId: note.id, content: extractedText })

            // Navigate to note detail
            router.replace(`/notes/${note.id}` as any)
        } catch (err) {
            console.error("Failed to save scanned note:", err)
            Alert.alert("Error", "Failed to save note. Please try again.")
            setIsSaving(false)
        }
    }, [extractedText, capturedImagePath, router, llm, embeddings])

    // Close without saving
    const handleClose = useCallback(() => {
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
                onPress={() => setState("camera")}
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

        if (!device) {
            return (
                <View style={styles.centeredContainer}>
                    <Text className="text-typography-600" style={styles.permissionText}>
                        No camera device found
                    </Text>
                </View>
            )
        }

        return (
            <View style={styles.cameraContainer}>
                <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={state === "camera"}
                    photo={true}
                />

                {/* Camera overlay with guide */}
                <View style={styles.cameraOverlay}>
                    <View style={styles.guideBox}>
                        <View style={[styles.guideCorner, styles.guideTopLeft]} />
                        <View style={[styles.guideCorner, styles.guideTopRight]} />
                        <View style={[styles.guideCorner, styles.guideBottomLeft]} />
                        <View style={[styles.guideCorner, styles.guideBottomRight]} />
                    </View>
                    <Text style={styles.guideText}>Position document within frame</Text>
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
                        style={[styles.captureButton, !ocr?.isReady && styles.captureButtonDisabled]}
                    >
                        <CameraIcon size={32} color="#fff" />
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
            <Text style={[styles.processingText, { color: isDark ? "#fff" : "#000" }]}>Processing document...</Text>
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
                <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: capturedImagePath }} style={styles.imagePreview} contentFit="cover" />
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
                    style={[styles.actionButton, styles.secondaryButton, { borderColor: isDark ? "#333" : "#ddd" }]}
                >
                    <RefreshCwIcon size={20} color={isDark ? "#fff" : "#000"} />
                    <Text style={[styles.actionButtonText, { color: isDark ? "#fff" : "#000" }]}>Retake</Text>
                </Pressable>
                <Pressable
                    onPress={handleSave}
                    disabled={isSaving || extractedText.trim().length === 0}
                    style={[
                        styles.actionButton,
                        styles.primaryButton,
                        { opacity: isSaving || extractedText.trim().length === 0 ? 0.5 : 1 },
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
                        backgroundColor: state === "camera" ? "rgba(0,0,0,0.5)" : isDark ? "#000" : "#fff",
                    },
                ]}
            >
                <Pressable onPress={handleClose} style={styles.closeButton}>
                    <XIcon size={24} color={state === "camera" ? "#fff" : isDark ? "#fff" : "#000"} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: state === "camera" ? "#fff" : isDark ? "#fff" : "#000" }]}>
                    Scan Document
                </Text>
                <View style={styles.closeButton} />
            </View>

            {/* Content based on state */}
            {state === "camera" && renderCamera()}
            {state === "processing" && renderProcessing()}
            {state === "review" && renderReview()}
            {state === "model-loading" && renderModelLoading()}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    cameraContainer: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 100,
    },
    guideBox: {
        width: "85%",
        aspectRatio: 0.75,
        position: "relative",
    },
    guideCorner: {
        position: "absolute",
        width: 48,
        height: 48,
        borderColor: "#fff",
    },
    guideTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 12,
    },
    guideTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 12,
    },
    guideBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 12,
    },
    guideBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 12,
    },
    guideText: {
        marginTop: 28,
        color: "#fff",
        fontSize: 15,
        fontWeight: "500",
        textShadowColor: "rgba(0,0,0,0.6)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
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
        backgroundColor: "#D97706",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#D97706",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
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
    reviewContent: {
        padding: 16,
    },
    imagePreviewContainer: {
        marginBottom: 24,
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
        height: 220,
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
    textSection: {
        marginBottom: 24,
    },
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
    primaryButton: {
        backgroundColor: "#3B82F6",
    },
    secondaryButton: {
        borderWidth: 1,
    },
    actionButtonText: {
        fontSize: 17,
        fontWeight: "600",
    },
})
