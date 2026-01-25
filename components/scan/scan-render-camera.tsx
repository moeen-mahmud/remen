export const ScanRenderCamera: React.FC = () => {
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
                    style={[styles.captureButton, (!ocr?.isReady || ocr?.isGenerating) && styles.captureButtonDisabled]}
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
