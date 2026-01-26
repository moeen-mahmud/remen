import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

interface WaveformProps {
    isActive: boolean;
    color?: string;
    size?: number;
}

const NUM_BARS = 5;
const BAR_DELAYS = [0, 100, 200, 100, 0]; // Staggered delays for wave effect

export function Waveform({ isActive, color = "#EF4444", size = 80 }: WaveformProps) {
    return (
        <View style={[styles.container, { width: size * 1.5, height: size }]}>
            {Array.from({ length: NUM_BARS }).map((_, index) => (
                <WaveformBar key={index} isActive={isActive} color={color} delay={BAR_DELAYS[index]} index={index} />
            ))}
        </View>
    );
}

interface WaveformBarProps {
    isActive: boolean;
    color: string;
    delay: number;
    index: number;
}

function WaveformBar({ isActive, color, delay, index }: WaveformBarProps) {
    const scale = useSharedValue(0.3);
    const opacity = useSharedValue(0.5);

    useEffect(() => {
        if (isActive) {
            // Animate scale with wave pattern
            scale.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.3, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                    ),
                    -1,
                    false,
                ),
            );

            // Animate opacity
            opacity.value = withDelay(
                delay,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.5, { duration: 300, easing: Easing.inOut(Easing.ease) }),
                    ),
                    -1,
                    false,
                ),
            );
        } else {
            scale.value = withTiming(0.3, { duration: 200 });
            opacity.value = withTiming(0.5, { duration: 200 });
        }
    }, [isActive, delay, scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scaleY: scale.value }],
        opacity: opacity.value,
    }));

    return <Animated.View style={[styles.bar, { backgroundColor: color }, animatedStyle]} />;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    bar: {
        width: 8,
        height: "100%",
        borderRadius: 4,
    },
});
