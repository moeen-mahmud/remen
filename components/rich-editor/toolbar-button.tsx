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
        <Button
            className="bg-transparent data-[active=true]:bg-transparent px-3"
            isPressed={isActive}
            disabled={isDisabled}
            onPress={onPress}
            size="md"
        >
            {icon ? (
                <Icon
                    as={icon as any}
                    className={`"text-typography-0 dark:text-typography-0" ${isActive ? "text-primary-50" : ""}`}
                />
            ) : (
                <Text className={`"text-typography-0 dark:text-typography-0" ${isActive ? "text-primary-50" : ""}`}>
                    {text}
                </Text>
            )}
        </Button>
    )
}
