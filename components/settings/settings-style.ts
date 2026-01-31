import { StyleSheet } from "react-native";

export const settingsStyle = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    rowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    rowText: {
        fontSize: 16,
        fontWeight: "500",
    },
    countText: {
        fontSize: 14,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 48,
    },
    aboutRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    versionText: {
        fontSize: 14,
    },
    modelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    modelInfo: {
        flex: 1,
        marginRight: 16,
    },
    modelName: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 2,
    },
    modelDescription: {
        fontSize: 13,
    },
    modelStatus: {
        alignItems: "flex-end",
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "500",
    },
    progressCard: {
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    progressHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    progressText: {
        fontSize: 14,
        opacity: 0.9,
    },
});
