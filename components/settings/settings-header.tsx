import { Box } from "@/components/ui/box"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { router } from "expo-router"
import { ArrowLeftIcon } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type SettingsHeaderProps = {
    title: string
    showBackButton: boolean
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ showBackButton, title }) => {
    const { top } = useSafeAreaInsets()
    const handleBack = () => {
        router.back()
    }
    return (
        <Box
            className="flex-row justify-between items-center p-4 mb-6 bg-background-0"
            style={[styles.header, { paddingTop: top }]}
        >
            {showBackButton ? (
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <Icon as={ArrowLeftIcon} size="xl" />
                </Pressable>
            ) : (
                <View style={styles.backButton} />
            )}
            <Text className="text-xl font-bold text-typography-0">{title}</Text>
            <View style={styles.backButton} />
        </Box>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
})
