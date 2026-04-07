import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/lib/theme/use-theme";
import { SearchIcon, XIcon } from "lucide-react-native";
import { Pressable, TextInput } from "react-native";

type NotesSearchProps = {
    searchQuery: string;
    setInterpretedQuery: (query: string | null) => void;
    setTemporalFilterDescription: (description: string | null) => void;
    setSearchQuery: (query: string) => void;
    handleSearch: () => void;
    refetchNotes: () => void;
    isSearching: boolean;
};

export const NotesSearch: React.FC<NotesSearchProps> = ({
    searchQuery,
    setInterpretedQuery,
    setTemporalFilterDescription,
    setSearchQuery,
    handleSearch,
    refetchNotes,
    isSearching,
}) => {
    const { placeholderTextColor, mutedIconColor } = useTheme();

    const handleClearSearch = () => {
        setSearchQuery("");
        setInterpretedQuery(null);
        setTemporalFilterDescription(null);
        refetchNotes();
    };

    return (
        <Box className="flex-row gap-2 items-center p-4 mx-4 rounded-lg bg-background-0">
            <Icon as={SearchIcon} />
            <TextInput
                className="flex-1 font-semibold text-typography-900 dark:text-typography-0"
                placeholder="Ask me anything..."
                placeholderTextColor={placeholderTextColor}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
            />
            {isSearching ? (
                <Spinner color={mutedIconColor} />
            ) : searchQuery ? (
                <Pressable onPress={handleClearSearch}>
                    <Icon as={XIcon} />
                </Pressable>
            ) : null}
        </Box>
    );
};
