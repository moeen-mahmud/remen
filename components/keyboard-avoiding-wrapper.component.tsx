import {
    KeyboardAwareScrollView,
    type KeyboardAwareScrollViewProps,
    KeyboardGestureArea,
} from "react-native-keyboard-controller"

type KeyboardAvoidingComponentProps = {
    children: React.ReactNode | React.ReactNode[]
} & KeyboardAwareScrollViewProps

export const KeyboardAvoidingComponent: React.FC<KeyboardAvoidingComponentProps> = ({ children, ...rest }) => {
    return (
        <KeyboardGestureArea interpolator="ios" style={{ flex: 1 }}>
            <KeyboardAwareScrollView showsVerticalScrollIndicator={false} bounces={false} {...rest} style={{ flex: 1 }}>
                {children}
            </KeyboardAwareScrollView>
        </KeyboardGestureArea>
    )
}
