import { settingsStyle as styles } from "@/components/settings/settings-style";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";
import { BookOpen, MessageSquare } from "lucide-react-native";
import { Alert, Linking, Pressable } from "react-native";

const SUPPORT_EMAIL = "moeen@osmynt.dev";

type SettingsHelpProps = {
    onHowItWorks: () => void;
};

export const SettingsHelp: React.FC<SettingsHelpProps> = ({ onHowItWorks }) => {
    const { mutedTextColor } = useTheme();

    const handleContactUs = async () => {
        const subject = encodeURIComponent("Remen Feedback");
        const body = encodeURIComponent("\n\n---\nSent from Remen app");
        const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        } else {
            Alert.alert("No Email App", `You can reach us at ${SUPPORT_EMAIL}`);
        }
    };

    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">HELP & SUPPORT</Text>

            <Box className="rounded-lg bg-background-0">
                <Pressable style={styles.row} onPress={onHowItWorks}>
                    <Box style={styles.rowLeft}>
                        <Icon as={BookOpen} color={mutedTextColor} />
                        <Text>How Remen Works</Text>
                    </Box>
                </Pressable>

                <Divider className="bg-background-50 dark:bg-background-100" />

                <Pressable style={styles.row} onPress={handleContactUs}>
                    <Box style={styles.rowLeft}>
                        <Icon as={MessageSquare} color={mutedTextColor} />
                        <Text>Contact Us / Send Feedback</Text>
                    </Box>
                </Pressable>
            </Box>
        </Box>
    );
};
