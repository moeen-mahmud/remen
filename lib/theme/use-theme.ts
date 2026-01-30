import { useColorScheme } from "nativewind";

export const useTheme = () => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";
};
