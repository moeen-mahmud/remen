import { useKeyboardHandler } from "react-native-keyboard-controller";
import { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

export const useKeyboardAnimation = () => {
    const progress = useSharedValue(0);
    const height = useSharedValue(0);
    const inset = useSharedValue(0);
    const offset = useSharedValue(0);
    const scroll = useSharedValue(0);
    const shouldUseOnMoveHandler = useSharedValue(false);

    useKeyboardHandler({
        onStart: (e) => {
            "worklet";

            // Handle case where keyboard was under interactive gesture
            if (progress.value !== 1 && progress.value !== 0 && e.height !== 0) {
                shouldUseOnMoveHandler.value = true;
                return;
            }

            progress.value = e.progress;
            height.value = e.height;
            inset.value = e.height;

            // When keyboard opens, maintain current scroll position
            // When keyboard closes, reset offset
            if (e.height > 0) {
                // Keep current scroll position when keyboard opens
                offset.value = scroll.value;
            } else {
                // Reset when keyboard closes
                offset.value = 0;
            }
        },
        onInteractive: (e) => {
            "worklet";
            progress.value = e.progress;
            height.value = e.height;
        },
        onMove: (e) => {
            "worklet";
            if (shouldUseOnMoveHandler.value) {
                progress.value = e.progress;
                height.value = e.height;
            }
        },
        onEnd: (e) => {
            "worklet";
            height.value = e.height;
            progress.value = e.progress;
            inset.value = e.height;
            shouldUseOnMoveHandler.value = false;
        },
    });

    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scroll.value = e.contentOffset.y;
            // Update offset to match scroll when keyboard is visible
            if (height.value > 0) {
                offset.value = e.contentOffset.y;
            }
        },
    });

    return { height, progress, inset, offset, onScroll };
};
