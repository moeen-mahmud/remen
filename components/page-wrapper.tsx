import { Box } from "@/components/ui/box";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PageWrapperProps = {
    children: React.ReactNode;
    /**
     * Disable extra bottom padding. Useful for full-screen experiences like the editor,
     * where the content manages its own safe-area + keyboard insets.
     */
    disableBottomPadding?: boolean;
    /**
     * Extra bottom padding added on top of safe-area bottom inset.
     * Useful to keep scrollable content clear of floating UI (e.g. FAB).
     */
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
