import { RemenLogo } from "@/components/brand/logo"
import { Box } from "@/components/ui/box"
import { Text } from "@/components/ui/text"
import { emptyTrash, getArchivedNotesCount, getTrashedNotesCount } from "@/lib/database"
import { getPreferences, savePreferences, type Preferences } from "@/lib/preferences"
import * as Haptics from "expo-haptics"
import { useRouter } from "expo-router"
import {
    ArchiveIcon,
    ArrowLeftIcon,
    ChevronRightIcon,
    MoonIcon,
    SmartphoneIcon,
    SunIcon,
    Trash2Icon,
    TrashIcon,
    VibrateIcon,
} from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function SettingsScreen() {
    const { top, bottom } = useSafeAreaInsets()
    const { colorScheme, setColorScheme } = useColorScheme()
    const router = useRouter()
    const isDark = colorScheme === "dark"

    const [preferences, setPreferences] = useState<Preferences | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [archivedCount, setArchivedCount] = useState(0)
    const [trashedCount, setTrashedCount] = useState(0)

    // Load preferences and counts
    useEffect(() => {
        async function load() {
            const prefs = await getPreferences()
            setPreferences(prefs)

            const archived = await getArchivedNotesCount()
            const trashed = await getTrashedNotesCount()
            setArchivedCount(archived)
            setTrashedCount(trashed)
            setIsLoading(false)
        }
        load()
    }, [])

    const handleBack = useCallback(() => {
        router.back()
    }, [router])

    const handleThemeChange = useCallback(
        async (theme: Preferences["theme"]) => {
            if (!preferences) return
            await savePreferences({ theme })
            setPreferences({ ...preferences, theme })
            setColorScheme(theme)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
        [preferences, setColorScheme],
    )

    const handleHapticToggle = useCallback(
        async (value: boolean) => {
            if (!preferences) return
            await savePreferences({ hapticFeedback: value })
            setPreferences({ ...preferences, hapticFeedback: value })
            if (value) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            }
        },
        [preferences],
    )

    const handleArchives = useCallback(() => {
        router.push("/settings/archives" as any)
    }, [router])

    const handleTrash = useCallback(() => {
        router.push("/settings/trash" as any)
    }, [router])

    const handleEmptyTrash = useCallback(async () => {
        Alert.alert(
            "Empty Recycle Bin",
            "This will permanently delete all notes in the recycle bin. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Empty",
                    style: "destructive",
                    onPress: async () => {
                        const deleted = await emptyTrash()
                        setTrashedCount(0)
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                        Alert.alert("Done", `${deleted} note${deleted !== 1 ? "s" : ""} permanently deleted.`)
                    },
                },
            ],
        )
    }, [])

    if (!preferences) {
        return <Box className="flex-1 bg-background-50" />
    }

    if (isLoading) {
        return (
            <Box className="flex-1 bg-background-50">
                <ActivityIndicator size="large" color={isDark ? "#fff" : "#000"} />
            </Box>
        )
    }
    return (
        <Box className="flex-1 bg-background-50" style={{ paddingTop: top }}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={styles.backButton}>
                    <ArrowLeftIcon size={22} color={isDark ? "#fff" : "#000"} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: isDark ? "#fff" : "#000" }]}>Settings</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: bottom + 40 }}>
                {/* Appearance Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: isDark ? "#888" : "#666" }]}>APPEARANCE</Text>

                    <View style={[styles.card, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                        {/* Theme Options */}
                        <Pressable
                            style={[styles.themeOption, preferences.theme === "system" && styles.themeOptionSelected]}
                            onPress={() => handleThemeChange("system")}
                        >
                            <SmartphoneIcon
                                size={20}
                                color={
                                    preferences.theme === "system"
                                        ? isDark
                                            ? "#39FF14"
                                            : "#00B700"
                                        : isDark
                                          ? "#888"
                                          : "#666"
                                }
                            />
                            <Text
                                style={[
                                    styles.themeOptionText,
                                    {
                                        color:
                                            preferences.theme === "system"
                                                ? isDark
                                                    ? "#39FF14"
                                                    : "#00B700"
                                                : isDark
                                                  ? "#fff"
                                                  : "#000",
                                    },
                                ]}
                            >
                                System
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[styles.themeOption, preferences.theme === "light" && styles.themeOptionSelected]}
                            onPress={() => handleThemeChange("light")}
                        >
                            <SunIcon
                                size={20}
                                color={
                                    preferences.theme === "light"
                                        ? isDark
                                            ? "#39FF14"
                                            : "#00B700"
                                        : isDark
                                          ? "#888"
                                          : "#666"
                                }
                            />
                            <Text
                                style={[
                                    styles.themeOptionText,
                                    {
                                        color:
                                            preferences.theme === "light"
                                                ? isDark
                                                    ? "#39FF14"
                                                    : "#00B700"
                                                : isDark
                                                  ? "#fff"
                                                  : "#000",
                                    },
                                ]}
                            >
                                Light
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[styles.themeOption, preferences.theme === "dark" && styles.themeOptionSelected]}
                            onPress={() => handleThemeChange("dark")}
                        >
                            <MoonIcon
                                size={20}
                                color={
                                    preferences.theme === "dark"
                                        ? isDark
                                            ? "#39FF14"
                                            : "#00B700"
                                        : isDark
                                          ? "#888"
                                          : "#666"
                                }
                            />
                            <Text
                                style={[
                                    styles.themeOptionText,
                                    {
                                        color:
                                            preferences.theme === "dark"
                                                ? isDark
                                                    ? "#39FF14"
                                                    : "#00B700"
                                                : isDark
                                                  ? "#fff"
                                                  : "#000",
                                    },
                                ]}
                            >
                                Dark
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Preferences Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: isDark ? "#888" : "#666" }]}>PREFERENCES</Text>

                    <View style={[styles.card, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <VibrateIcon size={20} color={isDark ? "#888" : "#666"} />
                                <Text style={[styles.rowText, { color: isDark ? "#fff" : "#000" }]}>
                                    Haptic Feedback
                                </Text>
                            </View>
                            <Switch
                                value={preferences.hapticFeedback}
                                onValueChange={handleHapticToggle}
                                trackColor={{ false: isDark ? "#333" : "#ccc", true: isDark ? "#39FF14" : "#00B700" }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>

                {/* Data Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: isDark ? "#888" : "#666" }]}>DATA</Text>

                    <View style={[styles.card, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                        <Pressable style={styles.row} onPress={handleArchives}>
                            <View style={styles.rowLeft}>
                                <ArchiveIcon size={20} color={isDark ? "#888" : "#666"} />
                                <Text style={[styles.rowText, { color: isDark ? "#fff" : "#000" }]}>Archives</Text>
                            </View>
                            <View style={styles.rowRight}>
                                <Text style={[styles.countText, { color: isDark ? "#888" : "#666" }]}>
                                    {archivedCount}
                                </Text>
                                <ChevronRightIcon size={18} color={isDark ? "#666" : "#999"} />
                            </View>
                        </Pressable>

                        <View style={[styles.separator, { backgroundColor: isDark ? "#333" : "#e5e5e5" }]} />

                        <Pressable style={styles.row} onPress={handleTrash}>
                            <View style={styles.rowLeft}>
                                <Trash2Icon size={20} color={isDark ? "#888" : "#666"} />
                                <Text style={[styles.rowText, { color: isDark ? "#fff" : "#000" }]}>Recycle Bin</Text>
                            </View>
                            <View style={styles.rowRight}>
                                <Text style={[styles.countText, { color: isDark ? "#888" : "#666" }]}>
                                    {trashedCount}
                                </Text>
                                <ChevronRightIcon size={18} color={isDark ? "#666" : "#999"} />
                            </View>
                        </Pressable>

                        {trashedCount > 0 && (
                            <>
                                <View style={[styles.separator, { backgroundColor: isDark ? "#333" : "#e5e5e5" }]} />
                                <Pressable style={styles.row} onPress={handleEmptyTrash}>
                                    <View style={styles.rowLeft}>
                                        <TrashIcon size={20} color={isDark ? "#E7000B" : "#F9423C"} />
                                        <Text style={[styles.rowText, { color: isDark ? "#E7000B" : "#F9423C" }]}>
                                            Empty Recycle Bin
                                        </Text>
                                    </View>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>

                {/* About Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: isDark ? "#888" : "#666" }]}>ABOUT</Text>

                    <View style={[styles.card, { backgroundColor: isDark ? "#1a1a1a" : "#f5f5f5" }]}>
                        <View style={styles.aboutRow}>
                            <RemenLogo size="sm" showIcon={true} />
                            <Text style={[styles.versionText, { color: isDark ? "#888" : "#666" }]}>Version 1.0.0</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </Box>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    content: {
        flex: 1,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        borderRadius: 12,
        overflow: "hidden",
    },
    themeOption: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
    },
    themeOptionSelected: {
        // Visual indicator is handled by color
    },
    themeOptionText: {
        fontSize: 16,
        fontWeight: "500",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    rowLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    rowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    rowText: {
        fontSize: 16,
        fontWeight: "500",
    },
    countText: {
        fontSize: 14,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 48,
    },
    aboutRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
    },
    versionText: {
        fontSize: 14,
    },
})
