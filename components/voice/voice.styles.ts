import { LIGHT_THEME_COLORS } from "@/lib/theme/colors";
import { StyleSheet } from "react-native";

export const VoiceStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
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
    waveformContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 60,
    },
    statusContainer: {
        alignItems: "center",
        paddingVertical: 24,
    },
    statusText: {
        fontSize: 18,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    timerText: {
        fontSize: 56,
        fontWeight: "200",
        marginTop: 12,
        fontVariant: ["tabular-nums"],
        letterSpacing: -1,
    },
    transcriptContainer: {
        paddingHorizontal: 32,
        paddingVertical: 20,
        maxHeight: 150,
    },
    transcriptText: {
        fontSize: 16,
        fontStyle: "italic",
        textAlign: "center",
        lineHeight: 26,
        opacity: 0.9,
    },
    micContainer: {
        position: "relative",
        alignItems: "center",
        paddingVertical: 48,
    },
    pulseRing: {
        // position: "absolute",
        alignItems: "center",
        justifyContent: "center",
        width: 110,
        height: 110,
        borderRadius: 55,
    },
    micButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: LIGHT_THEME_COLORS.voiceWaveformColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    hintText: {
        marginTop: 20,
        fontSize: 14,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
});
