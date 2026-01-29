import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SettingsHeaderProps = {
    title: string;
    showBackButton: boolean;
    rightButton?: React.ReactNode;
};

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ showBackButton, title, rightButton = null }) => {
    const { top } = useSafeAreaInsets();
    const handleBack = () => {
        router.back();
    };
    return (
        <Box className="p-4 mb-6 bg-background-0" style={{ paddingTop: top }}>
            <Box className="flex-row justify-between items-center">
                {showBackButton ? (
                    <Pressable className="flex-row gap-2 justify-start items-center" onPress={handleBack}>
                        <Icon as={ChevronLeft} size="xl" />
                        <Text className="text-xl font-bold">{title}</Text>
                    </Pressable>
                ) : null}
                {rightButton ? <Box className="flex-row justify-end items-center">{rightButton}</Box> : null}
            </Box>
        </Box>
    );
};
