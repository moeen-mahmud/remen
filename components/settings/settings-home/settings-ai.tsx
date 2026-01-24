import { settingsStyle as styles } from "@/components/settings/settings-home/settings-style"
import { Box } from "@/components/ui/box"
import { Divider } from "@/components/ui/divider"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { EmbeddingsModel, LLMModel, OCRModel } from "@/lib/ai/provider"
import { CheckCircle, Download, XCircle, Zap } from "lucide-react-native"
import { useColorScheme } from "nativewind"
import { useMemo } from "react"

type SettingsAIProps = {
    llm: LLMModel | null
    embeddings: EmbeddingsModel | null
    ocr: OCRModel | null
    overallProgress: number
    isInitializing: boolean
}

export const SettingsAI: React.FC<SettingsAIProps> = ({
    llm,
    embeddings,
    ocr,
    overallProgress = 0,
    isInitializing = false,
}) => {
    const { colorScheme } = useColorScheme()
    const isDark = colorScheme === "dark"

    const modelRows = useMemo(() => {
        return [
            {
                name: "Language Model",
                description: "The core of the AI functionality",
                isReady: llm?.isReady,
                downloadProgress: llm?.downloadProgress,
            },
            {
                name: "Semantic Search",
                description: "For intelligent note discovery",
                isReady: embeddings?.isReady,
                downloadProgress: embeddings?.downloadProgress,
            },
            {
                name: "Text Recognition",
                description: "For scanning documents",
                isReady: ocr?.isReady,
                downloadProgress: ocr?.downloadProgress,
            },
        ]
    }, [llm, embeddings, ocr])

    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">AI MODELS</Text>

            <Box className="rounded-lg bg-background-0">
                {modelRows.map((model, index) => (
                    <Box key={model.name}>
                        <Box style={styles.modelRow}>
                            <Box style={styles.modelInfo}>
                                <Text className="font-medium text-typography-500">{model.name}</Text>
                                <Text className="mt-1 text-sm" style={{ color: isDark ? "#666" : "#999" }}>
                                    {model.description}
                                </Text>
                            </Box>
                            <Box style={styles.modelStatus}>
                                {model.isReady ? (
                                    <Box style={styles.statusRow}>
                                        <Icon as={CheckCircle} color={isDark ? "#39FF14" : "#00B700"} />
                                        <Text style={{ color: isDark ? "#39FF14" : "#00B700" }}>Ready</Text>
                                    </Box>
                                ) : isInitializing ? (
                                    <Box style={styles.statusRow}>
                                        <Icon as={Download} color={isDark ? "#39FF14" : "#00B700"} />
                                        <Text style={{ color: isDark ? "#39FF14" : "#00B700" }}>
                                            {Math.round((model.downloadProgress || 0) * 100)}%
                                        </Text>
                                    </Box>
                                ) : (
                                    <Box style={styles.statusRow}>
                                        <Icon as={XCircle} color={isDark ? "#666" : "#999"} />
                                        <Text style={{ color: isDark ? "#666" : "#999" }}>Not loaded</Text>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                        {index !== modelRows.length - 1 && (
                            <Divider className="bg-background-50 dark:bg-background-100" />
                        )}
                    </Box>
                ))}
            </Box>

            {!isInitializing && (
                <Box className="p-4 mt-4 rounded-lg bg-brand/10">
                    <Box className="flex-row justify-between items-center">
                        <Box className="flex-row gap-2 items-center">
                            <Icon as={Zap} color={isDark ? "#39FF14" : "#00B700"} />
                            <Text
                                className="font-medium text-typography-500"
                                style={{ color: isDark ? "#39FF14" : "#00B700" }}
                            >
                                Downloading AI Models
                            </Text>
                        </Box>
                        <Text className="text-sm" style={{ color: isDark ? "#39FF14" : "#00B700" }}>
                            {Math.round(overallProgress * 100)}%
                        </Text>
                    </Box>
                </Box>
            )}
        </Box>
    )
}
