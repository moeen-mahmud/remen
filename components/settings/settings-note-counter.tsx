import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Note } from "@/lib/database";

interface SettingsNoteCounterProps {
    notes: Note[];
}

export const SettingsNoteCounter: React.FC<SettingsNoteCounterProps> = ({ notes }) => {
    return (
        <Box className="px-4">
            <Text className="mb-2 font-medium text-typography-500">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
            </Text>
        </Box>
    );
};
