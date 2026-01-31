import { noteCardStyles as styles } from "@/components/notes/note.styles";
import { TaskItem } from "@/components/notes/task-item";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { ParsedTask } from "@/lib/tasks/tasks.type";
import { useTheme } from "@/lib/theme/use-theme";
import React from "react";

type NoteCardContentProps = {
    hasTaskTypeContent: boolean;
    parsedTasks: ParsedTask[];
    totalTasks: number;
    preview: string;
};

export const NoteCardContent: React.FC<NoteCardContentProps> = ({
    hasTaskTypeContent,
    parsedTasks,
    totalTasks,
    preview,
}) => {
    const { mutedTextColor, mutedIconColor } = useTheme();
    return (
        <Box>
            {hasTaskTypeContent ? (
                <Box className="flex-col">
                    {parsedTasks?.slice(0, 3)?.map((task, index) => {
                        return (
                            <TaskItem
                                key={`task-${task.lineIndex}-${index}`}
                                content={task.content}
                                isCompleted={task.isCompleted}
                                fontSizeClass="text-base"
                                circleSize={16}
                                incompleteTaskColor={mutedTextColor}
                            />
                        );
                    })}
                    <Box className="flex-row flex-grow gap-2 items-center mt-1 mb-2">
                        {totalTasks > 3 ? (
                            <Text className="text-xs font-semibold uppercase" style={{ color: mutedIconColor }}>
                                +{totalTasks - 3} more tasks
                            </Text>
                        ) : (
                            <Box className="flex-grow"></Box>
                        )}
                    </Box>
                </Box>
            ) : (
                <Text style={[styles.preview, { color: mutedTextColor }]} numberOfLines={2}>
                    {preview}
                </Text>
            )}
        </Box>
    );
};
