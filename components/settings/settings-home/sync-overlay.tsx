import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Cloud } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, View } from "react-native";

type SyncOverlayProps = {
    visible: boolean;
    message?: string;
};

export const SyncOverlay: React.FC<SyncOverlayProps> = ({ visible, message = "Syncing with iCloud..." }) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    // Animation for rotating cloud icon
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Fade in
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Continuous rotation
            const rotation = Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            );
            rotation.start();

            return () => {
                rotation.stop();
            };
        } else {
            // Fade out
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }).start();
            scaleAnim.setValue(0.8);
            rotateAnim.setValue(0);
        }
    }, [visible, opacityAnim, scaleAnim, rotateAnim]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
            <View
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" },
                ]}
            >
                <Box className="items-center justify-center flex-1">
                    <Animated.View
                        style={[
                            styles.container,
                            {
                                opacity: opacityAnim,
                                transform: [{ scale: scaleAnim }],
                                backgroundColor: isDark ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
                            },
                        ]}
                    >
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                            <Cloud size={48} color={isDark ? "#64D2FF" : "#007AFF"} strokeWidth={1.5} />
                        </Animated.View>

                        <Text className="mt-4 text-base font-medium text-center">{message}</Text>

                        <Box className="flex-row items-center mt-2">
                            <Animated.Text style={[styles.dots, { color: isDark ? "#8E8E93" : "#6E6E73" }]}>
                                Please wait...
                            </Animated.Text>
                        </Box>
                    </Animated.View>
                </Box>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 32,
        borderRadius: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        minWidth: 200,
    },
    dots: {
        fontSize: 14,
    },
});
