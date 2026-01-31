import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";

export interface FabAction {
    id: string;
    label: string;
    icon: LucideIcon | ReactNode;
    onPress: () => void;
    color?: string;
    backgroundColor?: string;
}

export interface SpeedDialProps {
    actions: FabAction[] | null;
    actionRoute?: string;
    mainButtonColor?: string;
    position?: "bottom-right" | "bottom-left" | "bottom-center";
    offsetBottom?: number;
    offsetHorizontal?: number;
}

export interface FabItemProps {
    action: FabAction;
    index: number;
    isOpen: boolean;
    totalItems: number;
    onPress: () => void;
}
