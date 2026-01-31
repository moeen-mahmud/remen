import { Box } from "@/components/ui/box";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PageWrapperProps = {
    children: React.ReactNode;
    disableBottomPadding?: boolean;
    extraBottomPadding?: number;
};

export const PageWrapper: React.FC<PageWrapperProps> = ({
    children,
    disableBottomPadding = false,
    extraBottomPadding = 40,
}) => {
    const { bottom } = useSafeAreaInsets();
    const paddingBottom = disableBottomPadding ? 0 : bottom + extraBottomPadding;
    return (
        <Box style={{ paddingBottom }} className="flex-1 bg-background-50">
            {children}
        </Box>
    );
};
