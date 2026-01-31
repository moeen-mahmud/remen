import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";

interface EmptyPageProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

export const EmptyPage: React.FC<EmptyPageProps> = ({ icon, title, description }) => {
    const { mutedTextColor } = useTheme();
    return (
        <Box className="flex-1 justify-center items-center">
            {icon}
            <Heading size="md" className="mt-4">
                {title}
            </Heading>
            <Text className="text-lg" style={{ color: mutedTextColor }}>
                {description}
            </Text>
        </Box>
    );
};
