import { Stack } from "expo-router"
import "../global.css"

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider"
import { StatusBar } from "expo-status-bar"

export default function RootLayout() {
    return (
        <GluestackUIProvider>
            <StatusBar style="auto" />
            <Stack />
        </GluestackUIProvider>
    )
}
