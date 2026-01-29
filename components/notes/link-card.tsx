import { Box } from "@/components/ui/box";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, Link2 } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { Pressable, StyleSheet } from "react-native";

interface LinkCardProps {
    url: string;
    onPress?: () => void;
}

// Extract domain from URL for display
function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace("www.", "");
    } catch {
        // If URL parsing fails, try basic extraction
        const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
        return match ? match[1] : url;
    }
}

// Truncate URL for display
function truncateUrl(url: string, maxLength: number = 50): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + "...";
}

export const LinkCard: React.FC<LinkCardProps> = ({ url, onPress }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

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
        <Pressable
            onPress={handlePress}
            style={[styles.container, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}
        >
            <Box style={styles.iconContainer}>
                <Icon as={Link2} size="sm" color={isDark ? "#888" : "#666"} />
            </Box>
            <Box style={styles.textContainer}>
                <Text style={[styles.domain, { color: isDark ? "#ddd" : "#333" }]}>{domain}</Text>
                <Text style={[styles.url, { color: isDark ? "#888" : "#666" }]} numberOfLines={1}>
                    {truncateUrl(url)}
                </Text>
            </Box>
            <Icon as={ExternalLink} size="sm" color={isDark ? "#666" : "#999"} />
        </Pressable>
    );
};

// Utility function to detect URLs in text
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

export function detectUrls(text: string): string[] {
    const matches = text.match(URL_REGEX);
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
