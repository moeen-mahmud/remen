import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { formatOCRText, processImageOCR, type ScanResult } from "@/lib/capture/scan"
import * as Haptics from "expo-haptics"
import { CameraIcon, CheckIcon, RefreshCwIcon, XIcon } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native"
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera"

type ScanState = "camera" | "processing" | "review"

export interface ScanCaptureModalProps {
    isVisible: boolean
    onClose: () => void
    onCapture: (text: string) => void
}

export function ScanCaptureModal({ isVisible, onClose, onCapture }: ScanCaptureModalProps) {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const { hasPermission, requestPermission } = useCameraPermission()
    const device = useCameraDevice("back")
    const cameraRef = useRef<Camera>(null)

    const [state, setState] = useState<ScanState>("camera")
    const [scanResult, setScanResult] = useState<ScanResult | null>(null)
    const [editedText, setEditedText] = useState("")
    const [error, setError] = useState<string | null>(null)

    // Request permission on mount
    useEffect(() => {
        if (isVisible && !hasPermission) {
            requestPermission()
        }
    }, [isVisible, hasPermission, requestPermission])

    // Reset state when modal closes
    useEffect(() => {
        if (!isVisible) {
            setState("camera")
            setScanResult(null)
            setEditedText("")
            setError(null)
        }
    }, [isVisible])

    // Take photo
    const handleTakePhoto = useCallback(async () => {
        if (!cameraRef.current) return

        try {
            setError(null)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

            const photoResult = await cameraRef.current.takePhoto()
            setState("processing")

            // Process OCR
            const result = await processImageOCR(photoResult.path)
            setScanResult(result)
            setEditedText(formatOCRText(result))
            setState("review")

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        } catch (err) {
            console.error("Failed to capture/process:", err)
            setError("Failed to process image. Please try again.")
            setState("camera")
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
    }, [])

    // Retake photo
    const handleRetake = useCallback(() => {
        setState("camera")
        setScanResult(null)
        setEditedText("")
        setError(null)
    }, [])

    // Done - save the captured text
    const handleDone = useCallback(() => {
        if (editedText.trim().length > 0) {
            onCapture(editedText.trim())
        }
        onClose()
    }, [editedText, onCapture, onClose])

    // Cancel
    const handleCancel = useCallback(() => {
        onClose()
    }, [onClose])

    // Render camera view
    const renderCamera = () => {
        if (!hasPermission) {
            return (
                <View style={styles.centeredContainer}>
                    <Text style={[styles.permissionText, { color: isDark ? "#fff" : "#000" }]}>
                        Camera permission is required to scan documents
                    </Text>
                    <Button variant="solid" size="lg" onPress={requestPermission}>
                        <ButtonText>Grant Permission</ButtonText>
                    </Button>
                </View>
            )
        }

        if (!device) {
            return (
                <View style={styles.centeredContainer}>
                    <Text style={[styles.permissionText, { color: isDark ? "#fff" : "#000" }]}>
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
                    isActive={isVisible && state === "camera"}
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

                {/* Capture button */}
                <View style={styles.captureButtonContainer}>
                    <Pressable onPress={handleTakePhoto} style={styles.captureButton}>
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
        <View style={[styles.reviewContainer, { backgroundColor: isDark ? "#000" : "#fff" }]}>
            <View style={styles.reviewHeader}>
                <Heading size="md" style={{ color: isDark ? "#fff" : "#000" }}>
                    Review Text
                </Heading>
                {scanResult && (
                    <Text style={[styles.confidenceText, { color: isDark ? "#888" : "#666" }]}>
                        {Math.round(scanResult.confidence * 100)}% confidence
                    </Text>
                )}
            </View>

            <ScrollView style={styles.reviewScroll}>
                <TextInput
                    style={[
                        styles.reviewInput,
                        {
                            color: isDark ? "#fff" : "#000",
                            backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5",
                        },
                    ]}
                    value={editedText}
                    onChangeText={setEditedText}
                    multiline
                    textAlignVertical="top"
                    placeholder="No text detected. Try again with a clearer image."
                    placeholderTextColor={isDark ? "#888" : "#999"}
                />
            </ScrollView>

            <View style={styles.reviewActions}>
                <Button variant="outline" size="lg" onPress={handleRetake} style={styles.reviewButton}>
                    <RefreshCwIcon size={18} color={isDark ? "#fff" : "#000"} />
                    <ButtonText style={{ marginLeft: 8 }}>Retake</ButtonText>
                </Button>
                <Button
                    variant="solid"
                    size="lg"
                    onPress={handleDone}
                    isDisabled={editedText.trim().length === 0}
                    style={styles.reviewButton}
                    className="bg-primary-500"
                >
                    <CheckIcon size={18} color="#fff" />
                    <ButtonText className="text-white" style={{ marginLeft: 8 }}>
                        Done
                    </ButtonText>
                </Button>
            </View>
        </View>
    )

    return (
        <Modal visible={isVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleCancel}>
            <View style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
                    <Pressable onPress={handleCancel} style={styles.closeButton}>
                        <XIcon size={24} color="#fff" />
                    </Pressable>
                    <Heading size="md" style={{ color: "#fff" }}>
                        Scan Document
                    </Heading>
                    <View style={styles.closeButton} />
                </View>

                {/* Content based on state */}
                {state === "camera" && renderCamera()}
                {state === "processing" && renderProcessing()}
                {state === "review" && renderReview()}
            </View>
        </Modal>
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
        paddingTop: 60,
        paddingBottom: 16,
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    closeButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    centeredContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
    },
    permissionText: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: 24,
    },
    cameraContainer: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: "center",
        justifyContent: "center",
    },
    guideBox: {
        width: "80%",
        aspectRatio: 0.75,
        position: "relative",
    },
    guideCorner: {
        position: "absolute",
        width: 30,
        height: 30,
        borderColor: "#fff",
    },
    guideTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
    },
    guideTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
    },
    guideBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
    },
    guideBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    guideText: {
        marginTop: 24,
        color: "#fff",
        fontSize: 14,
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    captureButtonContainer: {
        position: "absolute",
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: "center",
    },
    captureButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#3B82F6",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    errorBanner: {
        position: "absolute",
        bottom: 140,
        left: 20,
        right: 20,
        backgroundColor: "rgba(239, 68, 68, 0.9)",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    errorText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 14,
    },
    processingText: {
        marginTop: 16,
        fontSize: 16,
    },
    reviewContainer: {
        flex: 1,
        paddingTop: 100,
    },
    reviewHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    confidenceText: {
        fontSize: 13,
    },
    reviewScroll: {
        flex: 1,
        paddingHorizontal: 16,
    },
    reviewInput: {
        fontSize: 16,
        lineHeight: 26,
        padding: 16,
        borderRadius: 12,
        minHeight: 300,
    },
    reviewActions: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 24,
        gap: 12,
    },
    reviewButton: {
        flex: 1,
    },
})
