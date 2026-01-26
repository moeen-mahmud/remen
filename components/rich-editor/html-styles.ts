import type { HtmlStyle } from "react-native-enriched";

export const htmlStyle: HtmlStyle = {
    h1: { fontSize: 32, bold: true },
    h2: { fontSize: 26, bold: true },
    h3: { fontSize: 22, bold: true },
    h4: { fontSize: 18, bold: true },
    h5: { fontSize: 16, bold: true },
    h6: { fontSize: 14, bold: true },
    blockquote: {
        borderColor: "#3B82F6",
        borderWidth: 3,
        gapWidth: 12,
        color: "#3B82F6",
    },
    codeblock: {
        color: "#10B981",
        borderRadius: 6,
        backgroundColor: "#f0fdf4",
    },
    code: {
        color: "#8B5CF6",
        backgroundColor: "#f5f3ff",
    },
    a: {
        color: "#3B82F6",
        textDecorationLine: "underline",
    },
    ol: {
        gapWidth: 12,
        marginLeft: 20,
        markerColor: "#3B82F6",
        markerFontWeight: "bold",
    },
    ul: {
        bulletColor: "#10B981",
        bulletSize: 6,
        marginLeft: 20,
        gapWidth: 12,
    },
};
