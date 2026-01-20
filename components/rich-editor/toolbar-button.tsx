import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { JSX, type FC } from "react"

interface ToolbarButtonIconProps {
    text?: never
    icon: JSX.Element
    isActive: boolean
    isDisabled: boolean
    onPress: () => void
}

interface ToolbarButtonTextProps {
    text: string
    icon?: never
    isActive: boolean
    isDisabled: boolean
    onPress: () => void
}

export type ToolbarButtonProps = ToolbarButtonIconProps | ToolbarButtonTextProps

export const ToolbarButton: FC<ToolbarButtonProps> = ({ icon, text, isDisabled, isActive, onPress }) => {
    return (
        <Button className="rounded-none" isPressed={isActive} disabled={isDisabled} onPress={onPress} size="lg">
            {icon ? (
                <Icon as={icon as any} size="md" className="text-white dark:text-black" />
            ) : (
                <Text className="text-white dark:text-black">{text}</Text>
            )}
        </Button>
    )
}
