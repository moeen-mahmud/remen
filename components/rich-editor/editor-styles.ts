import { Dimensions, StyleSheet } from "react-native";
const containerHeight = Dimensions.get("window").height;
export const editorStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    editorInput: {
        width: "100%",
        minHeight: containerHeight,
        fontSize: 17,
        lineHeight: 28,
        paddingHorizontal: 16,
    },
});
