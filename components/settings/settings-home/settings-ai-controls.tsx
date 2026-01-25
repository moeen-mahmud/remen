import { Box } from "@/components/ui/box"
import { Divider } from "@/components/ui/divider"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { aiQueue } from "@/lib/ai"
import * as Haptics from "expo-haptics"
import { AlertCircle, CircleStop } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Alert, Pressable } from "react-native"

export const SettingsAIControls = () => {
    const [queueStatus, setQueueStatus] = useState(() => aiQueue.getStatus())

    useEffect(() => {
        const tick = () => setQueueStatus(aiQueue.getStatus())
        tick()
        const interval = setInterval(tick, 750)
        return () => clearInterval(interval)
    }, [])

    const handleStop = async () => {
        aiQueue.cancelAll()
        setQueueStatus(aiQueue.getStatus())
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }

    const handleStopAIProcessing = () => {
        Alert.alert(
            queueStatus?.isProcessing ? "Stop AI processing" : "No AI processing in progress",
            queueStatus?.isProcessing
                ? "This clears the AI queue and cancels any queued work. In-flight generation may take a moment to stop."
                : "Currently no AI processing in progress. You can start AI processing by adding a note to the queue.",
            [
                { text: "Cancel", style: "cancel" },
                ...(queueStatus?.isProcessing
                    ? [{ text: "Stop", style: "destructive" as const, onPress: async () => await handleStop() }]
                    : []),
            ],
        )
    }

    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">PROCESSES</Text>
            <Box className="mt-4">
                <Box className="p-4 rounded-lg bg-background-0">
                    <Box className="flex-row justify-between items-center mb-3">
                        <Box className="flex-row gap-2 items-center">
                            <Icon as={AlertCircle} className="text-neutral-500 dark:text-neutral-400" />
                            <Text className="font-medium text-typography-500">AI Queue</Text>
                        </Box>
                        <Text className="text-sm text-neutral-500 dark:text-neutral-400">
                            {queueStatus.isProcessing ? "Active" : "Idle"}
                        </Text>
                    </Box>

                    <Box className="flex-row gap-2">
                        <Box className="flex-1 p-3 rounded-lg bg-background-50 dark:bg-background-100">
                            <Text className="text-xl font-semibold text-typography-500">
                                {queueStatus.isProcessing ? 1 : 0}
                            </Text>
                            <Text className="text-xs text-neutral-500 dark:text-neutral-400">Processing</Text>
                        </Box>
                        <Box className="flex-1 p-3 rounded-lg bg-background-50 dark:bg-background-100">
                            <Text className="text-xl font-semibold text-typography-500">{queueStatus.queueLength}</Text>
                            <Text className="text-xs text-neutral-500 dark:text-neutral-400">Queued</Text>
                        </Box>
                        <Box className="flex-1 p-3 rounded-lg bg-background-50 dark:bg-background-100">
                            <Text className="text-xl font-semibold text-typography-500">
                                {queueStatus.pendingQueueLength}
                            </Text>
                            <Text className="text-xs text-neutral-500 dark:text-neutral-400">Pending</Text>
                        </Box>
                    </Box>

                    {queueStatus.currentJobId ? (
                        <Box className="mt-3">
                            <Text className="text-xs text-neutral-500 dark:text-neutral-400">
                                Current: {queueStatus.currentJobId.slice(0, 8)}…
                            </Text>
                        </Box>
                    ) : null}
                </Box>
                <Divider className="bg-background-50 dark:bg-background-100" />
                <Pressable
                    className="flex-row gap-2 items-center p-4 mt-2 rounded-lg dark:bg-error-500 bg-error-50"
                    onPress={handleStopAIProcessing}
                >
                    <Icon as={CircleStop} className="text-error-900 dark:text-error-50" size="lg" />
                    <Text className="font-semibold text-error-900 dark:text-error-50">Stop AI processes</Text>
                </Pressable>
            </Box>
        </Box>
    )
}
