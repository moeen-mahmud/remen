import { StyleSheet } from "react-native"

export const editorStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        padding: 8,
        gap: 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    brandContainer: {
        // paddingHorizontal: 4,
        // paddingVertical: 8,
        minWidth: 44,
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    saveStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    saveStatusText: {
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    newNoteButton: {
        padding: 8,
        minWidth: 44,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    newNoteText: {
        fontSize: 15,
        fontWeight: "600",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        // flexGrow: 1,
        // paddingBottom: 120,
    },
    editorInput: {
        width: "100%",
        minHeight: 400,
        fontSize: 17,
        lineHeight: 28,
        paddingVertical: 24,
        paddingHorizontal: 16,
    },
    bottomBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottomBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 12,
        paddingHorizontal: 16,
    },
    quickActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
    },
    quickButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    toolbarContainer: {
        marginTop: 8,
    },
})
