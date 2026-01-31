import { DARK_THEME_COLORS, LIGHT_THEME_COLORS } from "@/lib/theme/colors";
import { useColorScheme } from "nativewind";

export const useTheme = () => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    return isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
};
