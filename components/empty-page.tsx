import { Box } from "@/components/ui/box"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"

interface EmptyPageProps {
    icon: React.ReactNode
    title: string
    description: string
}

export const EmptyPage: React.FC<EmptyPageProps> = ({ icon, title, description }) => {
    return (
        <Box className="flex-1 justify-center items-center">
            {icon}
            <Heading size="md" className="mt-4">
                {title}
            </Heading>
            <Text className="text-lg text-background-500">{description}</Text>
        </Box>
    )
}
