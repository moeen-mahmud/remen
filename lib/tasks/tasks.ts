import { createTask, deleteTask, getTasksForNote, updateTask } from "@/lib/database/database";
import type { Task } from "@/lib/database/database.types";
import { ParsedTask } from "@/lib/tasks/tasks.type";

export function parseTasksFromText(text: string): ParsedTask[] {
    const lines = text.split("\n");
    const tasks: ParsedTask[] = [];

    lines.forEach((line, index) => {
        const match = line.match(/^(\s*)-\s+\[([\sxX])\]\s+(.+)$/);
        if (match) {
            const [, indent, checkbox, content] = match;
            tasks.push({
                lineIndex: index,
                indent,
                isCompleted: checkbox.toLowerCase() === "x",
                content: content.trim(),
                fullLine: line,
            });
        }
    });

    return tasks;
}

export function taskToMarkdown(task: ParsedTask): string {
    const checkbox = task.isCompleted ? "- [x]" : "- [ ]";
    return `${task.indent}- ${checkbox} ${task.content}`;
}

export async function syncTasksFromText(noteId: string, text: string): Promise<void> {
    const parsedTasks = parseTasksFromText(text);
    const existingTasks = await getTasksForNote(noteId);

    // Create a map of existing tasks by content (for matching)
    // We'll use a simple content-based matching for now
    const existingTasksMap = new Map<string, Task>();
    existingTasks.forEach((task) => {
        // Use content as key, but we need to handle duplicates
        const key = task.content.trim().toLowerCase();
        if (!existingTasksMap.has(key)) {
            existingTasksMap.set(key, task);
        }
    });

    // Track which tasks we've processed
    const processedTaskIds = new Set<string>();

    // Update or create tasks
    for (const parsedTask of parsedTasks) {
        const key = parsedTask.content.trim().toLowerCase();
        const existingTask = existingTasksMap.get(key);

        if (existingTask) {
            // Update existing task if needed
            if (existingTask.is_completed !== parsedTask.isCompleted || existingTask.content !== parsedTask.content) {
                await updateTask(existingTask.id, {
                    content: parsedTask.content,
                    is_completed: parsedTask.isCompleted,
                });
            }
            processedTaskIds.add(existingTask.id);
        } else {
            // Create new task
            await createTask(noteId, parsedTask.content, parsedTask.isCompleted);
        }
    }

    // Delete tasks that are no longer in the text
    for (const existingTask of existingTasks) {
        if (!processedTaskIds.has(existingTask.id)) {
            await deleteTask(existingTask.id);
        }
    }
}

export function toggleTaskInText(text: string, lineIndex: number): string {
    const lines = text.split("\n");
    const line = lines[lineIndex];

    if (!line) return text;

    const match = line.match(/^(\s*)-\s+\[([\sxX])\]\s+(.+)$/);
    if (!match) return text;

    const [, indent, checkbox, content] = match;
    const newCheckbox = checkbox.toLowerCase() === "x" ? " " : "x";
    const newLine = `${indent}- [${newCheckbox}] ${content}`;

    lines[lineIndex] = newLine;
    return lines.join("\n");
}
