import * as Haptics from "expo-haptics";
import { XIcon, Zap } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { type FC, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FabItem } from "@/components/fab/fab-item";
import { springConfigs } from "@/lib/utils/animation-config";
import { router } from "expo-router";
import type { SpeedDialProps } from "./types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SpeedDial: FC<SpeedDialProps> = ({
    actions = [],
    actionRoute = "/notes",
    mainButtonColor,
    position = "bottom-right",
    offsetBottom = 24,
    offsetHorizontal = 24,
}) => {
    const { bottom } = useSafeAreaInsets();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [isOpen, setIsOpen] = useState(false);
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    const toggleOpen = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (!actions?.length) return router.push(actionRoute as any);

        setIsOpen((prev) => {
            const newState = !prev;
            rotation.value = withSpring(newState ? 90 : 0, { ...springConfigs.stiff });
            scale.value = withSpring(newState ? 1.1 : 1, { ...springConfigs.gentle });
            return newState;
        });
    };

    const closeMenu = () => {
        if (isOpen) {
            setIsOpen(false);
            rotation.value = withSpring(0, { ...springConfigs.stiff });
            scale.value = withSpring(1, { ...springConfigs.gentle });
        }
    };

    const mainButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }],
    }));

    const buttonColor = mainButtonColor || (isDark ? "#39FF14" : "#00B700");
    const iconColor = isDark ? "#000" : "#fff";

    // Position styles based on prop
    const positionStyle = {
        bottom: bottom + offsetBottom,
        ...(position === "bottom-right" && { right: offsetHorizontal }),
        ...(position === "bottom-left" && { left: offsetHorizontal }),
        ...(position === "bottom-center" && { left: "50%", transform: [{ translateX: -28 }] }),
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
                </Animated.View>
            )}

            {/* FAB Container */}
            <View style={[styles.container, positionStyle as any]}>
                {/* Action Items */}
                <View style={styles.actionsContainer}>
                    {!actions?.length
                        ? null
                        : actions?.map((action, index) => (
                              <FabItem
                                  key={action.id}
                                  action={action}
                                  index={index}
                                  isOpen={isOpen}
                                  totalItems={actions.length}
                                  onPress={closeMenu}
                                  isDark={isDark}
                              />
                          ))}
                </View>

                {/* Main FAB Button */}
                <AnimatedPressable
                    onPress={toggleOpen}
                    style={[mainButtonAnimatedStyle, styles.mainButton, { backgroundColor: buttonColor }]}
                >
                    {isOpen ? (
                        <XIcon size={26} color={iconColor} strokeWidth={2.5} />
                    ) : (
                        <Zap size={26} color={iconColor} strokeWidth={2.5} />
                    )}
                </AnimatedPressable>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        zIndex: 998,
    },
    container: {
        position: "absolute",
        marginBottom: 24,
        zIndex: 999,
        alignItems: "flex-end",
    },
    actionsContainer: {
        marginBottom: 12,
    },
    mainButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
});

export default SpeedDial;
