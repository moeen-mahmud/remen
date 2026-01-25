import { ScanCameraPermission } from "@/components/scan/scan-camera-permission"
import { scanStyles as styles } from "@/components/scan/scan-styles"
import { Box } from "@/components/ui/box"
import { PageLoader } from "@/components/ui/page-loader"
import { Text } from "@/components/ui/text"
import { useAI } from "@/lib/ai/provider"
import { setPendingScanPhotoUri } from "@/lib/capture/pending-scan-photo"
import { useIsFocused } from "@react-navigation/native"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { useCallback, useRef, useState } from "react"
import { Alert, Pressable, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from "react-native-vision-camera"

export const ScanCamera: React.FC = () => {
    const { top, bottom } = useSafeAreaInsets()
    const router = useRouter()
    const isFocused = useIsFocused()
    const { ocr } = useAI()

    const { hasPermission, requestPermission } = useCameraPermission()
    const device = useCameraDevice("back")
    const format = useCameraFormat(device, [{ photoResolution: { width: 1280, height: 720 } }])

    const cameraRef = useRef<Camera>(null)
    const isCapturingRef = useRef(false)

    const [error, setError] = useState<string | null>(null)

    const handleClose = useCallback(() => {
        router.back()
    }, [router])

    const handleCapture = useCallback(async () => {
        if (!hasPermission) {
            Alert.alert("Permission Required", "Camera permission is required to scan documents")
            return
        }

        if (!device) {
            console.warn("⚠️ [Scan] No camera device found")
            return
        }

        if (isCapturingRef.current) {
            console.warn("⚠️ [Scan] Already capturing, ignoring capture request")
            return
        }
        if (!cameraRef.current) {
            console.warn("⚠️ [Scan] Camera not mounted, ignoring capture request")
            return
        }

        // Keep capture disabled while OCR is not ready (matches prior behavior)
        if (!ocr?.isReady) {
            console.warn("⚠️ [Scan] OCR not ready, ignoring capture request")
            return
        }
        if (ocr?.isGenerating) {
            console.warn("⚠️ [Scan] OCR is generating, ignoring capture request")
            return
        }

        try {
            isCapturingRef.current = true
            setError(null)

            const photo = await cameraRef.current.takePhoto({
                flash: "off",
            })

            if (!photo?.path) throw new Error("No photo was captured")

            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

            // Pass the URI back to `/scan` and pop this route (unmounting camera state)
            const uri = photo.path.startsWith("file://") ? photo.path : `file://${photo.path}`
            setPendingScanPhotoUri(uri)
            router.back()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error occurred"
            setError(message)
            Alert.alert("Capture Failed", message)
        } finally {
            isCapturingRef.current = false
        }
    }, [device, hasPermission, ocr, router])

    return (
        <Box className="flex-1 bg-black">
            {!hasPermission ? (
                <ScanCameraPermission requestPermission={() => void requestPermission()} />
            ) : (
                <Box className="flex-1">
                    {!device ? (
                        <PageLoader />
                    ) : (
                        <Camera
                            ref={cameraRef}
                            style={StyleSheet.absoluteFill}
                            device={device}
                            format={format}
                            isActive={isFocused}
                            photoQualityBalance="speed"
                            photo
                            enableZoomGesture
                            onError={(e) => {
                                console.error("❌ [Scan] Camera error:", e)
                                setError(e.message)
                            }}
                        />
                    )}

                    {/* Close button overlay (safe-area padded) */}
                    <Box className="absolute right-0 left-0 z-10" style={{ paddingTop: top + 10 }}>
                        <Box className="px-4">
                            <Pressable
                                onPress={handleClose}
                                hitSlop={10}
                                className="self-start px-3 py-2 rounded-full bg-black/60"
                            >
                                <Text className="text-xl font-semibold text-white">Close</Text>
                            </Pressable>
                        </Box>
                    </Box>

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
                            disabled={!device || !ocr?.isReady || ocr?.isGenerating}
                            style={[
                                styles.captureButton,
                                (!device || !ocr?.isReady || ocr?.isGenerating) && styles.captureButtonDisabled,
                            ]}
                        />
                    </Box>

                    {error && (
                        <Box className="absolute right-5 left-5 bottom-48 p-4 mx-8 bg-red-500 rounded-lg">
                            <Text className="text-sm font-medium text-center text-white">{error}</Text>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    )
}
