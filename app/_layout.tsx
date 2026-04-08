import { AppInitializer } from "@/components/app-initializer";
import { GluestackUIProvider, ModeType } from "@/components/ui/gluestack-ui-provider";
import { AIProvider } from "@/lib/ai";
import { getPreferences } from "@/lib/preference/preferences";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { initExecutorch } from "react-native-executorch";
import { ExpoResourceFetcher } from "react-native-executorch-expo-resource-fetcher";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-get-random-values";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "../global.css";

SplashScreen.preventAutoHideAsync();
initExecutorch({ resourceFetcher: ExpoResourceFetcher });

export default function RootLayout() {
    const [themeMode, setThemeMode] = useState<ModeType>("system");
    const [themeLoaded, setThemeLoaded] = useState(false);

    useEffect(() => {
        getPreferences().then((prefs) => {
            setThemeMode(prefs.theme);
            setThemeLoaded(true);
        });
    }, []);

    // Don't render until we know the saved theme — prevents flash of wrong theme
    if (!themeLoaded) return null;

    return (
        <AIProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                    <GluestackUIProvider mode={themeMode}>
                        <StatusBar style="auto" />
                        <AppInitializer>
                            <Stack screenOptions={{ headerShown: false }} />
                        </AppInitializer>
                    </GluestackUIProvider>
                </KeyboardProvider>
            </GestureHandlerRootView>
        </AIProvider>
    );
}
