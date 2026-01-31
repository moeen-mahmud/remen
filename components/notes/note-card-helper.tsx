import { TASK_PATTERNS } from "@/lib/config/regex-patterns";
import { Note } from "@/lib/database/database.types";
import { parseTasksFromText } from "@/lib/tasks/tasks";
import { truncateText } from "@/lib/utils/functions";

export const hasTitle = (note: Note) => note.title && note.title.trim().length > 0;
export const hasTaskTypeTitle = (note: Note) => TASK_PATTERNS.test(note.title ?? "");
export const hasTaskTypeContent = (note: Note) => TASK_PATTERNS.test(note.content);
export const hasContent = (note: Note) => note.content.trim().length > 0;

export const renderDisplayTitle = (note: Note) =>
    hasTitle(note)
        ? hasTaskTypeTitle(note)
            ? "Tasks list"
            : note.title
        : hasTaskTypeContent(note)
          ? "Task list"
          : `${note.content ? truncateText(note.content, 10) : "Empty note"}`;

export const tasksParser = (note: Note) => parseTasksFromText(note.content);

export const renderPreview = (note: Note) =>
    hasTitle(note) && hasContent(note)
        ? hasTaskTypeContent(note)
            ? note.content
            : truncateText(note.content, 100)
        : hasTitle(note)
          ? ""
          : hasContent(note)
            ? hasTaskTypeContent(note)
                ? note.content
                : truncateText(note.content, 100)
            : "";
