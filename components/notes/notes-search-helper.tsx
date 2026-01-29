import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { useColorScheme } from "nativewind";

type NotesSearchHelperProps = {
    interpretedQuery: string | null;
    temporalFilterDescription: string | null;
    searchQuery: string | null;
    isDark: boolean;
};

export const NotesSearchHelper: React.FC<NotesSearchHelperProps> = ({
    interpretedQuery,
    temporalFilterDescription,
    searchQuery,
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return (
        <Box className="mx-4 my-2">
            {interpretedQuery ? (
                <Box className="p-4 rounded-lg bg-brand/10">
                    <Text style={{ color: isDark ? "#39FF14" : "#00B700" }} className="font-semibold">
                        Interpreted as: &ldquo;{interpretedQuery}&rdquo;
                    </Text>
                </Box>
            ) : temporalFilterDescription ? (
                <Box className="p-4 rounded-lg bg-brand/10">
                    <Text style={{ color: isDark ? "#39FF14" : "#00B700" }} className="text-sm font-semibold">
                        Showing notes from: {temporalFilterDescription}
                    </Text>
                </Box>
            ) : searchQuery ? null : (
                <Box className="p-4 rounded-lg bg-brand/10">
                    <Text style={{ color: isDark ? "#39FF14" : "#00B700" }} className="text-sm font-semibold">
                        {`Try asking questions like "What I wrote about work last week" or "Find my ideas about travel"`}
                    </Text>
                </Box>
            )}
        </Box>
    );
};
