import { renderDisplayTitle, renderPreview } from "@/components/notes/note-card-helper";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import type { Note } from "@/lib/database/database.types";
import { useTheme } from "@/lib/theme/use-theme";
import { FlatList, LayoutAnimation, Platform, Pressable, StyleSheet, UIManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ContextualRecallTrayProps {
    notes: Note[];
    onNotePress: (note: Note) => void;
    onDismiss: () => void;
}

export function ContextualRecallTray({ notes, onNotePress, onDismiss }: ContextualRecallTrayProps) {
    const { bottom } = useSafeAreaInsets();
    const { borderColor, primaryColor, textColor, mutedTextColor } = useTheme();

    if (notes.length === 0) return null;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    return (
        <Box
            style={[styles.container, { borderTopColor: borderColor, paddingBottom: bottom }]}
            className="border-t border-neutral-200 dark:border-neutral-800"
        >
            <Box style={styles.header}>
                <Text className="text-xs font-medium text-typography-500 dark:text-typography-400">Related</Text>
                {/* <Pressable onPress={onDismiss} hitSlop={8}>
                    <Text className="text-xs text-typography-400 dark:text-typography-500">Dismiss</Text>
                </Pressable> */}
            </Box>
            <FlatList
                horizontal
                data={notes}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    const title = renderDisplayTitle(item);
                    const preview = renderPreview(item);
                    return (
                        <Pressable
                            onPress={() => onNotePress(item)}
                            style={[styles.card, { borderColor, backgroundColor: primaryColor }]}
                        >
                            <Text style={{ color: textColor }} numberOfLines={1} className="text-sm font-semibold">
                                {title}
                            </Text>
                            {preview ? (
                                <Text style={{ color: mutedTextColor }} numberOfLines={1} className="text-xs mt-0.5">
                                    {preview}
                                </Text>
                            ) : null}
                        </Pressable>
                    );
                }}
            />
        </Box>
    );
}

const styles = StyleSheet.create({
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
