import { getScansDirectory } from "@/lib/utils/scan-utils";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";

export async function getScannedImageAsBase64(tempPath: string): Promise<string> {
    const localPath = tempPath.startsWith("file://") ? tempPath.replace("file://", "") : tempPath;
    const base64 = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/jpeg;base64,${base64}`;
}

export async function saveScannedImage(tempPath: string): Promise<string> {
    const scansDir = getScansDirectory();
    const fileName = `remen_scan_${Date.now()}.jpg`;

    const sourcePath = tempPath.startsWith("file://") ? tempPath.replace("file://", "") : tempPath;

    const sourceFile = new File(sourcePath);
    const destFile = new File(scansDir, fileName);

    sourceFile.copy(destFile);
    return destFile.uri;
}

export async function deleteScannedImage(imagePath: string): Promise<void> {
    try {
        const filePath = imagePath.startsWith("file://") ? imagePath.replace("file://", "") : imagePath;

        const file = new File(filePath);
        if (file.exists) file.delete();
    } catch (error) {
        console.error("Failed to delete scanned image:", error);
    }
}
