import { scanStyles as styles } from "@/components/scan/scan-styles";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { useTheme } from "@/lib/theme/use-theme";
import { Image } from "expo-image";
import { CheckIcon, RefreshCwIcon } from "lucide-react-native";
import { TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScanReviewProps = {
    capturedImagePath: string | null;
    extractedText: string;
    setExtractedText: (text: string) => void;
    handleRetake: () => void;
    handleSave: () => void;
    isDisabledRetake: boolean;
    isSaving: boolean;
};

export const ScanReview: React.FC<ScanReviewProps> = ({
    capturedImagePath,
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
            {/* Photo preview */}
            {capturedImagePath ? (
                <Box className="overflow-hidden mx-4 rounded-lg shadow-md dark:bg-neutral-900 bg-neutral-200">
                    <Image
                        source={{ uri: capturedImagePath }}
                        style={styles.imagePreview}
                        contentFit="contain"
                        transition={200}
                    />
                </Box>
            ) : null}

            {/* Add a note — like Google Keep */}
            <Box className="mx-4 my-4">
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
                    placeholder="Add a note..."
                    placeholderTextColor={placeholderTextColor}
                    autoFocus={false}
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
