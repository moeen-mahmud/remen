import { useTheme } from "@/lib/theme/use-theme";
import Animated, { SharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SCREEN_WIDTH, onboardingStyles as styles } from "./onboarding-styles";

type DotProps = {
    index: number;
    translateX: SharedValue<number>;
};

export const Dot = ({ index, translateX }: DotProps) => {
    const { brandColor } = useTheme();
    const style = useAnimatedStyle(() => {
        const position = -translateX.value / SCREEN_WIDTH;
        const distance = Math.abs(position - index);

        return {
            width: withTiming(distance < 0.5 ? 16 : 8),
            opacity: withTiming(distance < 0.5 ? 1 : 0.4),
        };
    });

    return <Animated.View style={[{ backgroundColor: brandColor }, styles.dot, style]} />;
};
