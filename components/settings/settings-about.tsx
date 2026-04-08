import { RemenLogo } from "@/components/brand/logo";
import { settingsStyle as styles } from "@/components/settings/settings-style";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";
import { nativeApplicationVersion } from "expo-application";
import { FileText, ShieldCheck, Star } from "lucide-react-native";
import { Alert, Linking, Platform, Pressable } from "react-native";

const APP_STORE_ID = ""; // TODO: Add App Store ID after publishing
const PRIVACY_POLICY_URL = "https://remennote.com/privacy";
const TERMS_URL = "https://remennote.com/terms";

export const SettingsAbout: React.FC = () => {
    const { mutedTextColor } = useTheme();

    const handleRateApp = async () => {
        if (!APP_STORE_ID) {
            Alert.alert("Coming Soon", "Rating will be available once the app is published on the App Store.");
            return;
        }

        const url =
            Platform.OS === "ios"
                ? `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`
                : `market://details?id=com.remennote.app`;

        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    };

    const handleOpenURL = async (url: string) => {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            await Linking.openURL(url);
        }
    };

    return (
        <Box className="px-4 mt-6 mb-8">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">ABOUT</Text>

            <Box className="rounded-lg bg-background-0">
                {/* App Info */}
                <Box className="flex-row justify-between items-center p-4">
                    <RemenLogo size="sm" showIcon={false} animated={true} />
                    <Text className="text-typography-500">{nativeApplicationVersion}</Text>
                </Box>

                <Divider className="bg-background-50 dark:bg-background-100" />

                {/* Rate App */}
                <Pressable style={styles.row} onPress={handleRateApp}>
                    <Box style={styles.rowLeft}>
                        <Icon as={Star} color={mutedTextColor} />
                        <Text>Rate Remen</Text>
                    </Box>
                </Pressable>

                <Divider className="bg-background-50 dark:bg-background-100" />

                {/* Privacy Policy */}
                <Pressable style={styles.row} onPress={() => handleOpenURL(PRIVACY_POLICY_URL)}>
                    <Box style={styles.rowLeft}>
                        <Icon as={ShieldCheck} color={mutedTextColor} />
                        <Text>Privacy Policy</Text>
                    </Box>
                </Pressable>

                <Divider className="bg-background-50 dark:bg-background-100" />

                {/* Terms of Service */}
                <Pressable style={styles.row} onPress={() => handleOpenURL(TERMS_URL)}>
                    <Box style={styles.rowLeft}>
                        <Icon as={FileText} color={mutedTextColor} />
                        <Text>Terms of Service</Text>
                    </Box>
                </Pressable>
            </Box>
        </Box>
    );
};
