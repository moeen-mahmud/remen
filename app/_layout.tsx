import { Stack } from "expo-router"
import "../global.css"

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider"
import { StatusBar } from "expo-status-bar"
import { KeyboardProvider } from "react-native-keyboard-controller"

export default function RootLayout() {
    return (
        <GluestackUIProvider>
            <KeyboardProvider>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }} />
            </KeyboardProvider>
        </GluestackUIProvider>
    )
}
