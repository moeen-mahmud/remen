import { NoteCardContent } from "@/components/notes/note-card-content";
import {
    hasTaskTypeContent,
    renderDisplayTitle,
    renderPreview,
    tasksParser,
} from "@/components/notes/note-card-helper";
import { noteDetailsStyles as styles } from "@/components/notes/note.styles";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Note } from "@/lib/database/database.types";
import { useTheme } from "@/lib/theme/use-theme";
import { Pressable } from "react-native";

type RelatedNoteCardProps = {
    relatedNotes: Note[];
    handleRelatedNotePress: (note: Note) => void;
};
export const RelatedNoteCard: React.FC<RelatedNoteCardProps> = ({ relatedNotes, handleRelatedNotePress }) => {
    const { borderColor } = useTheme();

    return (
        <Box
            className="px-4 border-t border-neutral-200 dark:border-neutral-900"
            style={[styles.relatedSection, { borderTopColor: borderColor }]}
        >
            <Heading className="mb-4 text-lg text-typography-900 dark:text-typography-0" size="sm">
                Related Notes
            </Heading>
            {relatedNotes?.map((relatedNote) => (
                <Pressable
                    key={relatedNote.id}
                    onPress={() => handleRelatedNotePress(relatedNote)}
                    className="p-4 mb-4 rounded-lg border border-neutral-200 dark:border-neutral-900"
                >
                    <Text
                        className="text-lg font-semibold text-typography-900 dark:text-typography-0"
                        numberOfLines={1}
                    >
                        {renderDisplayTitle(relatedNote)}
                    </Text>
                    <NoteCardContent
                        hasTaskTypeContent={hasTaskTypeContent(relatedNote)}
                        parsedTasks={tasksParser(relatedNote)}
                        totalTasks={tasksParser(relatedNote)?.length}
                        preview={renderPreview(relatedNote)}
                    />
                </Pressable>
            ))}
        </Box>
    );
};
