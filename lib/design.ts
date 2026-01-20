/**
 * Remen Design System
 * Based on DESIGN.md specifications
 */

export const colors = {
    // Primary color palette
    primary: "#6B7280", // Slate/Soft Grey - subtle accent, interactive hints
    accent: "#D97706", // Warm Neutral - action states, voice/scan buttons
    accentAlt: "#3B82F6", // Subtle Blue - alternative accent

    // Background colors
    background: {
        light: "#FFFFFF",
        dark: "#1F2937", // near black
        lightAlt: "#FAFAF9",
    },

    // Text colors
    text: {
        primary: {
            light: "#1F2937",
            dark: "#F3F4F6",
        },
        secondary: {
            light: "#374151",
            dark: "#F3F4F6",
        },
        placeholder: {
            light: "#9CA3AF", // 60% opacity
            dark: "#6B7280",
        },
        timestamp: {
            light: "#9CA3AF",
            dark: "#9CA3AF",
        },
        ui: {
            light: "#6B7280",
            dark: "#9CA3AF",
        },
    },

    // Borders
    border: {
        subtle: "#E5E7EB",
        dark: "#374151",
        hairline: "#E5E7EB",
    },

    // Status colors
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",

    // Note type colors
    noteTypes: {
        meeting: "#3B82F6", // Blue
        task: "#F59E0B", // Orange
        idea: "#8B5CF6", // Purple
        journal: "#10B981", // Green
        reference: "#6B7280", // Grey
        voice: "#EF4444", // Red
        scan: "#D97706", // Amber
        note: "#9CA3AF", // Default grey
    },

    // Note type backgrounds (20% opacity)
    noteTypeBg: {
        meeting: "#3B82F620",
        task: "#F59E0B20",
        idea: "#8B5CF620",
        journal: "#10B98120",
        reference: "#6B728020",
        voice: "#EF444420",
        scan: "#D9770620",
        note: "#9CA3AF20",
    },
}

export const typography = {
    // Font sizes (SF Pro Display)
    heading: {
        xl: 32, // Auto-generated titles
        lg: 26,
        md: 22,
        sm: 18,
    },
    body: {
        lg: 17, // Primary text
        md: 16, // Regular body text
        sm: 14, // UI labels
    },
    ui: {
        lg: 16, // Button text
        md: 14, // UI labels
        sm: 12, // Timestamps, small labels
    },

    // Line heights
    lineHeight: {
        heading: 1.2,
        body: 1.6,
        ui: 1.4,
    },

    // Font weights
    weight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
    },

    // Letter spacing
    letterSpacing: {
        tight: -0.3,
        normal: 0.2,
        wide: 0.5,
    },
}

export const spacing = {
    // Padding
    padding: {
        xs: 8,
        sm: 12,
        md: 16,
        lg: 20,
        xl: 24,
    },

    // Margins
    margin: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
    },

    // Gaps
    gap: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
    },

    // Border radius
    radius: {
        xs: 4,
        sm: 6,
        md: 8,
        lg: 12,
        xl: 16,
    },

    // Heights
    height: {
        button: 56, // Thumb-friendly
        touchTarget: 44, // Minimum touch target
        header: 44,
    },
}

export const shadows = {
    light: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    heavy: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
}

// Helper functions
export const getThemeColors = (isDark: boolean) => ({
    background: isDark ? colors.background.dark : colors.background.light,
    text: isDark ? colors.text.primary.dark : colors.text.primary.light,
    textSecondary: isDark ? colors.text.secondary.dark : colors.text.secondary.light,
    border: isDark ? colors.border.dark : colors.border.subtle,
    accent: colors.accent,
})

export const getNoteTypeColors = (type: string) => ({
    color: colors.noteTypes[type as keyof typeof colors.noteTypes] || colors.noteTypes.note,
    bgColor: colors.noteTypeBg[type as keyof typeof colors.noteTypeBg] || colors.noteTypeBg.note,
})
