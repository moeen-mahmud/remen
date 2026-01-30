export interface ParsedTask {
    lineIndex: number;
    indent: string;
    isCompleted: boolean;
    content: string;
    fullLine: string;
}
