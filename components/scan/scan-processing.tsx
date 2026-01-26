import { ScanState } from "@/components/scan/scan-types";
import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

type ScanProcessingProps = {
    scanState: ScanState;
};

export const ScanProcessing: React.FC<ScanProcessingProps> = ({ scanState }) => {
    return (
        <Box className="flex-1 justify-center items-center p-6 bg-background-0">
            <Spinner size="large" />
            <Text className="mt-2 font-semibold">
                {scanState === "saving-image" ? "Saving image..." : "Processing document..."}
            </Text>
            <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">This may take a moment</Text>
        </Box>
    );
};
