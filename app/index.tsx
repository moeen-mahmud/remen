import { Button, ButtonText } from "@/components/ui/button"
import { View } from "react-native"

export default function Index() {
    return (
        <View className="flex-1 items-center justify-center bg-white">
            <Button>
                <ButtonText>Click me</ButtonText>
            </Button>
        </View>
    )
}
