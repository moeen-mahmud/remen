import { ScanCameraPermission } from "@/components/scan/scan-camera-permission"
import { scanStyles as styles } from "@/components/scan/scan-styles"
import { Box } from "@/components/ui/box"
import { Text } from "@/components/ui/text"
import { useAI } from "@/lib/ai/provider"
import { setPendingScanPhotoUri } from "@/lib/capture/pending-scan-photo"
import { CameraView, useCameraPermissions } from "expo-camera"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import { useCallback, useRef, useState } from "react"
import { Alert, Pressable, StyleSheet } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export const ScanCamera: React.FC = () => {
    const { top, bottom } = useSafeAreaInsets()
    const router = useRouter()
    const { ocr } = useAI()

    const [permission, requestPermission] = useCameraPermissions()
    const hasPermission = !!permission?.granted

    const cameraRef = useRef<CameraView>(null)
    const isCapturingRef = useRef(false)

    const [error, setError] = useState<string | null>(null)

    const handleClose = useCallback(() => {
        router.replace("/")
    }, [router])

    const handleCapture = useCallback(async () => {
        if (!hasPermission) {
            Alert.alert("Permission Required", "Camera permission is required to scan documents")
            return
        }

        if (isCapturingRef.current) return
        if (!cameraRef.current) return

        // Keep capture disabled while OCR is not ready (matches prior behavior)
        if (!ocr?.isReady) return
        if (ocr?.isGenerating) return

        try {
            isCapturingRef.current = true
            setError(null)

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.1,
                skipProcessing: true,
            })

            if (!photo?.uri) throw new Error("No photo was captured")

            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

            // Pass the URI back to `/scan` and pop this route (unmounting camera state)
            setPendingScanPhotoUri(photo.uri)
            router.back()
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error occurred"
            setError(message)
            Alert.alert("Capture Failed", message)
        } finally {
            isCapturingRef.current = false
        }
    }, [hasPermission, ocr, router])

    return (
        <Box className="flex-1 bg-black">
            {!hasPermission ? (
                <ScanCameraPermission requestPermission={requestPermission} />
            ) : (
                <Box className="flex-1">
                    <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="picture" facing="back" active />

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
            )}
        </Box>
    )
}
