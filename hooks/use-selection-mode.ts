import * as Haptics from "expo-haptics";
import { useCallback, useState } from "react";

export interface UseSelectionModeResult {
    isSelectionMode: boolean;
    selectedIds: Set<string>;
    selectedCount: number;
    enterSelectionMode: (initialId?: string) => void;
    exitSelectionMode: () => void;
    toggleSelection: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
}

export function useSelectionMode(): UseSelectionModeResult {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const enterSelectionMode = useCallback(async (initialId?: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSelectionMode(true);
        if (initialId) {
            setSelectedIds(new Set([initialId]));
        }
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    const toggleSelection = useCallback(
        async (id: string) => {
            if (!isSelectionMode) return;

            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }

                // Exit selection mode if no items selected
                if (next.size === 0) {
                    setIsSelectionMode(false);
                }

                return next;
            });
        },
        [isSelectionMode],
    );

    const selectAll = useCallback(async (ids: string[]) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedIds(new Set(ids));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isSelected = useCallback(
        (id: string) => {
            return selectedIds.has(id);
        },
        [selectedIds],
    );

    return {
        isSelectionMode,
        selectedIds,
        selectedCount: selectedIds.size,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
    };
}
