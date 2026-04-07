import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";

type NotesSearchHelperProps = {
    interpretedQuery: string | null;
    temporalFilterDescription: string | null;
    searchQuery: string | null;
    searchResultCount: number;
};

export const NotesSearchHelper: React.FC<NotesSearchHelperProps> = ({
    interpretedQuery,
    temporalFilterDescription,
    searchQuery,
    searchResultCount,
}) => {
    const { brandColor } = useTheme();
    return (
        <Box className="mx-4 my-2">
            {interpretedQuery ? (
                <Box className="p-4 rounded-lg bg-brand/10">
                    <Text style={{ color: brandColor }} className="font-semibold">
                        Showing {searchResultCount} results
                    </Text>
                </Box>
            ) : temporalFilterDescription ? (
                <Box className="p-4 rounded-lg bg-brand/10">
                    <Text style={{ color: brandColor }} className="text-sm font-semibold">
                        Showing notes from: {temporalFilterDescription}
                    </Text>
                </Box>
            ) : searchQuery ? null : (
                <Box className="p-4 rounded-lg bg-brand/10">
                    <Text style={{ color: brandColor }} className="text-sm font-semibold">
                        {`Try asking questions like "What I wrote about work last week" or "Find my ideas about travel"`}
                    </Text>
                </Box>
            )}
        </Box>
    );
};
