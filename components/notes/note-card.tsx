import { getNoteTypeIcon, NoteTagBadge, NoteTypeBadge } from "@/components/notes/note-badges";
import { NoteCardHeader } from "@/components/notes/note-card-header";
import {
    hasTaskTypeContent,
    renderDisplayTitle,
    renderPreview,
    tasksParser,
} from "@/components/notes/note-card-helper";
import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { getNoteTypeBadge } from "@/lib/ai/classify";
import { scaleValues, springConfigs, timingConfigs } from "@/lib/config/animation-config";

import { NoteCardContent } from "@/components/notes/note-card-content";
import { noteCardStyles as styles } from "@/components/notes/note.styles";
import type { Note, Tag } from "@/lib/database/database.types";
import { useTheme } from "@/lib/theme/use-theme";
import * as Haptics from "expo-haptics";
import { useEffect, type FC } from "react";
import { Pressable } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NoteCardProps {
    note: Note;
    tags?: Tag[];
    onPress: (note: Note) => void;
    onLongPress?: (note: Note) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (note: Note) => void;
    isProcessing?: boolean;
}

export const NoteCard: FC<NoteCardProps> = ({
    note,
    tags = [],
    onPress,
    onLongPress,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    isProcessing = false,
}) => {
    const { brandColor, brandRGB } = useTheme();

    const typeBadge = getNoteTypeBadge(note.type);
    const typeIcon = getNoteTypeIcon(note.type, typeBadge.color);

    // Animation values
    const scale = useSharedValue(1);
    const shadowOpacity = useSharedValue(0.1);
    const borderAnim = useSharedValue(0);
    const borderWidthAnim = useSharedValue(0);
    const selectedBorderWidth = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        shadowOpacity: shadowOpacity.value,
    }));

    const borderStyle = useAnimatedStyle(() => {
        const processingColor = `rgba(${brandRGB}, ${borderAnim.value})`;

        // Priority: processing > selected > default
        const borderColor = isProcessing ? processingColor : selectedBorderWidth.value > 0 ? brandColor : "";

        // Combine border widths (processing takes priority visually)
        const totalBorderWidth = borderWidthAnim.value > 0 ? borderWidthAnim.value : selectedBorderWidth.value;

        return {
            borderWidth: totalBorderWidth,
            borderColor,
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(scaleValues.pressedIn, springConfigs.stiff);
        shadowOpacity.value = withTiming(0.2, timingConfigs.fast);
    };

    const handlePressOut = () => {
        scale.value = withSpring(scaleValues.pressedOut, springConfigs.gentle);
        shadowOpacity.value = withTiming(0.1, timingConfigs.fast);
    };

    const handlePress = async () => {
        if (isSelectionMode && onToggleSelect) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleSelect(note);
        } else {
            onPress(note);
        }
    };

    const handleLongPress = async () => {
        scale.value = withSpring(0.95, springConfigs.gentle);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => {
            scale.value = withSpring(1, springConfigs.gentle);
        }, 100);
        onLongPress?.(note);
    };

    useEffect(() => {
        if (isProcessing) {
            borderWidthAnim.value = withTiming(2, { duration: 300 });
            borderAnim.value = withTiming(1, { duration: 500 }, () => {
                borderAnim.value = withRepeat(withTiming(0.3, { duration: 1000 }), -1, true);
            });
        } else {
            borderWidthAnim.value = withTiming(0, { duration: 300 });
            borderAnim.value = withTiming(0, { duration: 300 });
        }
    }, [isProcessing, borderAnim, borderWidthAnim]);

    useEffect(() => {
        if (isSelected) {
            selectedBorderWidth.value = withTiming(2, { duration: 200 });
        } else {
            selectedBorderWidth.value = withTiming(0, { duration: 200 });
        }
    }, [isSelected, selectedBorderWidth]);

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={handleLongPress}
            delayLongPress={400}
            className="rounded-lg bg-background-0"
            style={[animatedStyle, borderStyle, styles.container]}
        >
            {/* Header with selection indicator and timestamp */}
            <NoteCardHeader
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isPinned={note.is_pinned}
                createdAt={note.created_at}
            />
            {/* Title */}
            <Heading size="sm" className="flex-wrap" style={styles.title}>
                {renderDisplayTitle(note)}
            </Heading>

            {/* Preview */}
            {renderPreview(note) && renderPreview(note).length > 0 && (
                <NoteCardContent
                    hasTaskTypeContent={hasTaskTypeContent(note)}
                    parsedTasks={tasksParser(note)}
                    totalTasks={tasksParser(note)?.length}
                    preview={renderPreview(note)}
                />
            )}

            {/* Type + Tags Row */}
            <Box className="flex-row flex-wrap gap-2 items-center">
                {/* Type badge */}
                <NoteTypeBadge typeBadge={typeBadge} typeIcon={typeIcon} />

                {/* Tags */}
                {tags.map((tag) => (
                    <NoteTagBadge key={tag.id} id={tag.id} name={tag.name} is_auto={tag.is_auto} />
                ))}
            </Box>
        </AnimatedPressable>
    );
};
