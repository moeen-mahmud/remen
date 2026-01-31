import { scanStyles as styles } from "@/components/scan/scan-styles";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme/use-theme";
import { Image } from "expo-image";
import { CheckIcon, RefreshCwIcon } from "lucide-react-native";
import { TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScanReviewProps = {
    capturedImagePath: string | null;
    confidence: number;
    extractedText: string;
    setExtractedText: (text: string) => void;
    handleRetake: () => void;
    handleSave: () => void;
    isDisabledRetake: boolean;
    isSaving: boolean;
};

export const ScanReview: React.FC<ScanReviewProps> = ({
    capturedImagePath,
    confidence,
    extractedText,
    setExtractedText,
    handleRetake,
    handleSave,
    isDisabledRetake,
    isSaving,
}) => {
    const { bottom } = useSafeAreaInsets();
    const { textColor, backgroundColor, placeholderTextColor, borderColor } = useTheme();

    return (
        <KeyboardAwareScrollView className="flex-1 -mt-6 bg-background-0">
            {/* Scanned image preview */}
            {capturedImagePath ? (
                <Box className="overflow-hidden mx-4 rounded-lg shadow-md dark:bg-neutral-900 bg-neutral-200">
                    <Image
                        source={{ uri: capturedImagePath }}
                        style={styles.imagePreview}
                        contentFit="contain"
                        transition={200}
                    />
                    <Box className="absolute right-4 bottom-4 p-2 rounded-md bg-background-0/75">
                        <Text className="text-sm font-semibold">{Math.round(confidence * 100)}% confidence</Text>
                    </Box>
                </Box>
            ) : null}

            {/* Extracted text */}
            <Box className="mx-4 my-4">
                <Text className="mb-4 font-medium text-left uppercase text-typography-500">Extracted Text</Text>
                <TextInput
                    className="rounded-lg"
                    style={[
                        styles.textInput,
                        {
                            color: textColor,
                            backgroundColor: backgroundColor,
                            borderColor: borderColor,
                        },
                    ]}
                    value={extractedText}
                    onChangeText={setExtractedText}
                    multiline
                    textAlignVertical="top"
                    placeholder="No text detected"
                    placeholderTextColor={placeholderTextColor}
                />
            </Box>

            {/* Action buttons */}
            <Box className="flex-row gap-4 mx-4" style={{ paddingBottom: bottom + 20 }}>
                <Button
                    variant="outline"
                    action="secondary"
                    className="flex-grow"
                    size="lg"
                    onPress={handleRetake}
                    disabled={isDisabledRetake}
                >
                    <ButtonIcon as={RefreshCwIcon} />
                    <ButtonText>Retake</ButtonText>
                </Button>
                <Button
                    variant="solid"
                    action="primary"
                    className="flex-grow"
                    size="lg"
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <ButtonIcon as={CheckIcon} className="text-white dark:text-black" />
                    <ButtonText className="text-white dark:text-black">Save</ButtonText>
                </Button>
            </Box>
        </KeyboardAwareScrollView>
    );
};
