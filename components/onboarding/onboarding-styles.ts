import { Dimensions, StyleSheet } from "react-native";

export const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const onboardingStyles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "space-between",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 24,
    },
    progressContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    slidesContainer: {
        flexDirection: "row",
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
    },
    nextButton: {
        marginHorizontal: 24,
        marginBottom: 12,
        paddingVertical: 16,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
});
