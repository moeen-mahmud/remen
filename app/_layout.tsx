import { AppInitializer } from "@/components/app-initializer"
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider"
import { AIProvider } from "@/lib/ai"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import "react-native-get-random-values"
import { KeyboardProvider } from "react-native-keyboard-controller"
import "../global.css"

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
    return (
        <GluestackUIProvider>
            <AIProvider>
                <KeyboardProvider>
                    <StatusBar style="auto" />
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <AppInitializer>
                            <Stack screenOptions={{ headerShown: false }} />
                        </AppInitializer>
                    </GestureHandlerRootView>
                </KeyboardProvider>
            </AIProvider>
        </GluestackUIProvider>
    )
}
