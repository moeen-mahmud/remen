import { StyleSheet } from "react-native";

export const noteCardStyles = StyleSheet.create({
    container: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    timestamp: {
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    title: {
        marginBottom: 6,
        lineHeight: 24,
    },
    preview: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 14,
        opacity: 0.8,
    },
    badgesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginTop: 6,
    },
    typeBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    typeIcon: {
        marginRight: 2,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tagBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 13,
        fontWeight: "500",
    },
    moreTagsText: {
        fontSize: 12,
        fontWeight: "600",
        opacity: 0.6,
    },
});

export const noteDetailsStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        // gap: 4,
    },
    backButton: {
        marginTop: 16,
        padding: 8,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    imageContainer: {
        marginBottom: 20,
        // borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    scanImage: {
        width: "100%",
        height: "auto",
        resizeMode: "contain",
        aspectRatio: 16 / 9,
        borderRadius: 16,
    },
    titleContainer: {
        marginBottom: 16,
    },
    titlePressable: {
        alignItems: "flex-start",
    },
    title: {
        lineHeight: 40,
        textAlign: "left",
    },
    titleHint: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.7,
    },
    titleEditContainer: {
        alignItems: "flex-start",
    },
    titleActions: {
        flexDirection: "row",
        gap: 16,
        marginTop: 12,
    },
    titleActionButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    titleActionText: {
        fontSize: 14,
        fontWeight: "600",
    },
    titlePlaceholder: {
        alignItems: "center",
        paddingVertical: 16,
    },
    titlePlaceholderText: {
        fontSize: 20,
        fontStyle: "italic",
        opacity: 0.7,
    },
    badgesContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    typeIcon: {
        marginRight: 2,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    tagBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 14,
        fontWeight: "500",
    },
    timestamp: {
        fontSize: 13,
        marginBottom: 24,
        opacity: 0.7,
    },
    contentText: {
        fontSize: 17,
        lineHeight: 30,
    },
    processedContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 32,
        paddingTop: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(0,0,0,0.1)",
    },
    processedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    processedText: {
        fontSize: 13,
        fontWeight: "500",
    },
    processingIndicator: {
        marginRight: 10,
    },
    relatedSection: {
        marginTop: 40,
        paddingTop: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    relatedTitle: {
        marginBottom: 20,
    },
    relatedCard: {
        padding: 14,
        marginBottom: 10,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    relatedCardTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 6,
    },
    relatedCardPreview: {
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.7,
    },
});
