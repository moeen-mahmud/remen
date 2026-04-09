import { settingsStyle as styles } from "@/components/settings/settings-style";
import { Box } from "@/components/ui/box";
import { Divider } from "@/components/ui/divider";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { EmbeddingsModel } from "@/lib/ai";
import { useTheme } from "@/lib/theme/use-theme";
import { CheckCircle, Download, Zap } from "lucide-react-native";
import { useMemo } from "react";

type SettingsAIProps = {
    embeddings: EmbeddingsModel | null;
    overallProgress: number;
    isInitializing: boolean;
    llmDownloadProgress: number;
};

export const SettingsAI: React.FC<SettingsAIProps> = ({
    embeddings,
    overallProgress = 0,
    isInitializing = false,
    llmDownloadProgress = 1,
}) => {
    const { mutedTextColor, brandColor } = useTheme();

    const embeddingsReady = embeddings?.isReady || false;
    const llmReady = llmDownloadProgress >= 1;
    const isDownloading = isInitializing || !llmReady;
    const combinedProgress = isDownloading ? (overallProgress + llmDownloadProgress) / 2 : 1;

    const modelRows = useMemo(() => {
        return [
            {
                name: "Semantic Search",
                description: "Intelligent note discovery",
                isReady: embeddingsReady,
                progress: embeddings?.downloadProgress || 0,
            },
            {
                name: "Language Model",
                description: "Titles, tags, and classification",
                isReady: llmReady,
                progress: llmDownloadProgress,
            },
        ];
    }, [embeddings, embeddingsReady, llmReady, llmDownloadProgress]);

    return (
        <Box className="px-4 mt-6">
            <Text className="mb-2 ml-1 text-sm font-medium text-typography-500">AI MODELS</Text>

            <Box className="rounded-lg bg-background-0">
                {modelRows.map((model, index) => (
                    <Box key={model.name}>
                        <Box style={styles.modelRow}>
                            <Box style={styles.modelInfo}>
                                <Text className="font-medium text-typography-500">{model.name}</Text>
                                <Text className="mt-1 text-sm" style={{ color: mutedTextColor }}>
                                    {model.description}
                                </Text>
                            </Box>
                            <Box style={styles.modelStatus}>
                                {model.isReady ? (
                                    <Box style={styles.statusRow}>
                                        <Icon as={CheckCircle} color={brandColor} />
                                        <Text style={{ color: brandColor }}>Ready</Text>
                                    </Box>
                                ) : (
                                    <Box style={styles.statusRow}>
                                        <Icon as={Download} color={brandColor} />
                                        <Text style={{ color: brandColor }}>{Math.round(model.progress * 100)}%</Text>
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

            {isDownloading && (
                <Box className="p-4 mt-4 rounded-lg bg-brand/10">
                    <Box className="flex-row justify-between items-center">
                        <Box className="flex-row gap-2 items-center">
                            <Icon as={Zap} color={brandColor} />
                            <Text className="font-medium text-typography-500" style={{ color: brandColor }}>
                                Downloading AI Models
                            </Text>
                        </Box>
                        <Text className="text-sm" style={{ color: brandColor }}>
                            {Math.round(combinedProgress * 100)}%
                        </Text>
                    </Box>
                </Box>
            )}
        </Box>
    );
};
