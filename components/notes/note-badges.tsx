import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Note, Tag } from "@/lib/database/database.types";
import {
    BookIcon,
    BookOpenIcon,
    CalendarIcon,
    FileIcon,
    LightbulbIcon,
    ListIcon,
    MicIcon,
    ScanIcon,
} from "lucide-react-native";

// Get icon for special note types
export function getNoteTypeIcon(type: Note["type"], color: string) {
    switch (type) {
        case "voice":
            return <MicIcon size={12} color={color} />;
        case "scan":
            return <ScanIcon size={12} color={color} />;
        case "task":
            return <ListIcon size={12} color={color} />;
        case "idea":
            return <LightbulbIcon size={12} color={color} />;
        case "journal":
            return <BookIcon size={12} color={color} />;
        case "reference":
            return <BookOpenIcon size={12} color={color} />;
        case "meeting":
            return <CalendarIcon size={12} color={color} />;
        case "note":
            return <FileIcon size={12} color={color} />;
        default:
            return null;
    }
}

type NoteBadge = {
    typeBadge: {
        label: string;
        color: string;
        bgColor: string;
    };
    typeIcon: React.ReactNode;
};

export const NoteTypeBadge: React.FC<NoteBadge> = ({ typeBadge, typeIcon }) => {
    return (
        <Box className="flex-row gap-2 items-center p-2 rounded-lg" style={{ backgroundColor: typeBadge.bgColor }}>
            {typeIcon && <Box>{typeIcon}</Box>}
            <Text className="text-sm font-semibold uppercase" style={{ color: typeBadge.color }}>
                {typeBadge.label}
            </Text>
        </Box>
    );
};

export const NoteTagBadge: React.FC<Tag> = ({ id, name }) => {
    return (
        <Box key={id} className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-900">
            <Text className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">#{name}</Text>
        </Box>
    );
};
