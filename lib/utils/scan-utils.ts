import { OCRBbox } from "@/lib/ai/provider";
import { SCANS_DIR_NAME } from "@/lib/consts/consts";
import { Directory, Paths } from "expo-file-system";

export function getScansDirectory(): Directory {
    const scansDir = new Directory(Paths.document, SCANS_DIR_NAME);
    if (!scansDir.exists) {
        scansDir.create();
    }
    return scansDir;
}

export function getBboxTopY(bbox?: OCRBbox[]): number {
    if (!bbox || bbox.length === 0) return 0;
    return Math.min(...bbox.map((p) => Number(p?.y) || 0));
}

export function getBboxBottomY(bbox?: OCRBbox[]): number {
    if (!bbox || bbox.length === 0) return 0;
    return Math.max(...bbox.map((p) => Number(p?.y) || 0));
}
