import { StyleSheet } from "react-native";

export const editorStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    editorInput: {
        width: "100%",
        fontSize: 17,
        lineHeight: 28,
        paddingHorizontal: 16,
    },
});

export const ContextualRecallStyles = StyleSheet.create({
    container: {
        paddingTop: 8,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        marginBottom: 6,
    },
    listContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    card: {
        width: 180,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
});
