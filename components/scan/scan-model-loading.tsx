import { ScanState } from "@/components/scan/scan-types";
import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { OCRModel } from "@/lib/ai";
import { Pressable } from "react-native";

type ScanModelLoadingProps = {
    ocr: OCRModel | null;
    setScanState: (state: ScanState) => void;
};

export const ScanModelLoading: React.FC<ScanModelLoadingProps> = ({ ocr, setScanState }) => {
    return (
        <Box className="flex-1 justify-center items-center p-6 bg-background-0">
            <Spinner size="large" />
            <Text className="mt-4 text-xl font-semibold">Loading OCR model...</Text>
            <Text className="mt-2 text-sm">{Math.round((ocr?.downloadProgress || 0) * 100)}% downloaded</Text>
            <Pressable
                onPress={() => setScanState("camera")}
                className="p-3 mt-4 rounded-lg border border-neutral-300 dark:border-neutral-700"
            >
                <Text className="text-sm">Cancel</Text>
            </Pressable>
        </Box>
    );
};
