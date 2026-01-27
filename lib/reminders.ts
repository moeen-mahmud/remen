/**
 * Reminder Service
 *
 * Handles scheduling, canceling, and managing reminders for notes using expo-notifications
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getNoteById, updateNote } from "./database";

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
            // Request local notification permissions
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== "granted") {
            console.warn("Notification permissions not granted");
            return false;
        }

        // Configure notification channel for Android
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync("reminders", {
                name: "Reminders",
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
                sound: "default",
            });
        }

        return true;
    } catch (error) {
        console.error("Error requesting notification permissions:", error);
        return false;
    }
}

/**
 * Schedule a reminder notification for a note
 */
export async function scheduleReminder(noteId: string, reminderDate: Date): Promise<string | null> {
    try {
        // Request permissions if not already granted
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
            throw new Error("Notification permissions not granted");
        }

        // Get note details
        const note = await getNoteById(noteId);
        if (!note) {
            throw new Error("Note not found");
        }

        // Cancel existing notification if any
        if (note.notification_id) {
            await cancelReminder(note.notification_id);
        }

        // Create notification content
        const title = note.title || "Reminder";
        const body = note.content.substring(0, 100) + (note.content.length > 100 ? "..." : "");

        // Schedule notification
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                data: { noteId: noteId },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
            },
        });

        // Update note with reminder info
        await updateNote(noteId, {
            reminder_at: reminderDate.getTime(),
            notification_id: notificationId,
        });

        return notificationId;
    } catch (error) {
        console.error("Error scheduling reminder:", error);
        return null;
    }
}

/**
 * Cancel a reminder notification
 */
export async function cancelReminder(notificationId: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
        console.error("Error canceling reminder:", error);
    }
}

/**
 * Cancel reminder for a note
 */
export async function cancelNoteReminder(noteId: string): Promise<void> {
    try {
        const note = await getNoteById(noteId);
        if (!note || !note.notification_id) {
            return;
        }

        await cancelReminder(note.notification_id);
        await updateNote(noteId, {
            reminder_at: null,
            notification_id: null,
        });
    } catch (error) {
        console.error("Error canceling note reminder:", error);
    }
}

/**
 * Get all scheduled reminders
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.error("Error getting scheduled notifications:", error);
        return [];
    }
}

/**
 * Format reminder date for display
 */
export function formatReminderDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `In ${days} day${days !== 1 ? "s" : ""}`;
    } else if (hours > 0) {
        return `In ${hours} hour${hours !== 1 ? "s" : ""}`;
    } else if (minutes > 0) {
        return `In ${minutes} minute${minutes !== 1 ? "s" : ""}`;
    } else {
        return "Now";
    }
}

/**
 * Format reminder date for detailed display
 */
export function formatReminderDateDetailed(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reminderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((reminderDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Today
        return `Today at ${date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })}`;
    } else if (diffDays === 1) {
        // Tomorrow
        return `Tomorrow at ${date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })}`;
    } else if (diffDays < 7) {
        // This week
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    } else {
        // Future date
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    }
}
