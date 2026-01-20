import { Box } from "@/components/ui/box"
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button"
import * as Haptics from "expo-haptics"
import { ArchiveIcon, CameraIcon, CheckIcon, MicIcon } from "lucide-react-native"
import type { FC } from "react"
import { StyleSheet, View } from "react-native"

export interface CaptureActionsProps {
    onCapture: () => void
    onVoice: () => void
    onScan: () => void
    onViewNotes: () => void
    isCapturing?: boolean
    hasContent?: boolean
}

export const CaptureActions: FC<CaptureActionsProps> = ({
    onCapture,
    onVoice,
    onScan,
    onViewNotes,
    isCapturing = false,
    hasContent = false,
}) => {
    const handleCapture = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        onCapture()
    }

    const handleVoice = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onVoice()
    }

    const handleScan = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onScan()
    }

    const handleViewNotes = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        onViewNotes()
    }

    return (
        <Box className="px-4 py-3 w-full border-t bg-background-50 border-outline-200">
            <View style={styles.container}>
                {/* Left side: Notes archive button */}
                <View style={styles.leftSection}>
                    <Button variant="outline" size="md" onPress={handleViewNotes} className="rounded-full">
                        <ButtonIcon as={ArchiveIcon} className="text-typography-600" />
                    </Button>
                </View>

                {/* Center: Voice and Scan buttons */}
                <View style={styles.centerSection}>
                    <Button variant="outline" size="md" onPress={handleVoice} className="mr-2 rounded-full">
                        <ButtonIcon as={MicIcon} className="text-typography-600" />
                    </Button>
                    <Button variant="outline" size="md" onPress={handleScan} className="rounded-full">
                        <ButtonIcon as={CameraIcon} className="text-typography-600" />
                    </Button>
                </View>

                {/* Right side: Done button */}
                <View style={styles.rightSection}>
                    <Button
                        variant="solid"
                        size="md"
                        onPress={handleCapture}
                        isDisabled={!hasContent || isCapturing}
                        className="rounded-full bg-primary-500"
                    >
                        <ButtonIcon as={CheckIcon} className="text-white" />
                        <ButtonText className="ml-1 text-white">Done</ButtonText>
                    </Button>
                </View>
            </View>
        </Box>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    leftSection: {
        flex: 1,
        alignItems: "flex-start",
    },
    centerSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    rightSection: {
        flex: 1,
        alignItems: "flex-end",
    },
})
