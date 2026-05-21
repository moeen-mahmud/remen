import { renderDisplayTitle, renderPreview } from "@/components/notes/note-card-helper";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import type { Note } from "@/lib/database/database.types";
import { useTheme } from "@/lib/theme/use-theme";
import * as Haptics from "expo-haptics";
import { XIcon } from "lucide-react-native";
import { FlatList, LayoutAnimation, Platform, Pressable, UIManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ContextualRecallStyles as styles } from "./editor-styles";

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
                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        onDismiss();
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss related notes"
                >
                    <XIcon size={16} color={mutedTextColor} />
                </Pressable>
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
