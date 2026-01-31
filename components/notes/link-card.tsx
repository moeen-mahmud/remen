import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { LINK_MATCHER } from "@/lib/config";
import { useTheme } from "@/lib/theme/use-theme";
import { extractDomain, truncateUrl } from "@/lib/utils/functions";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, Link2 } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

interface LinkCardProps {
    url: string;
    onPress?: () => void;
}

export const LinkCard: React.FC<LinkCardProps> = ({ url, onPress }) => {
    const { primaryColor, mutedIconColor, mutedTextColor } = useTheme();

    const domain = extractDomain(url);

    const handlePress = async () => {
        if (onPress) {
            onPress();
        } else {
            try {
                await WebBrowser.openBrowserAsync(url);
            } catch (error) {
                console.error("Failed to open URL:", error);
            }
        }
    };

    return (
        <Pressable onPress={handlePress} style={[styles.container, { backgroundColor: primaryColor }]}>
            <Box style={styles.iconContainer}>
                <Icon as={Link2} size="sm" color={mutedIconColor} />
            </Box>
            <Box style={styles.textContainer}>
                <Text style={[styles.domain, { color: mutedTextColor }]}>{domain}</Text>
                <Text style={[styles.url, { color: mutedIconColor }]} numberOfLines={1}>
                    {truncateUrl(url)}
                </Text>
            </Box>
            <Icon as={ExternalLink} size="sm" color={mutedIconColor} />
        </Pressable>
    );
};

export function detectUrls(text: string): string[] {
    const matches = text.match(LINK_MATCHER.http || LINK_MATCHER.nonHttp);
    if (!matches) return [];
    // Return unique URLs only
    return [...new Set(matches)];
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(128, 128, 128, 0.1)",
    },
    textContainer: {
        flex: 1,
    },
    domain: {
        fontSize: 14,
        fontWeight: "600",
    },
    url: {
        fontSize: 12,
        marginTop: 2,
    },
});
