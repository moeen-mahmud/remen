/**
 * Remen Design System
 * Based on DESIGN.md specifications and oklch theme
 * Uses GluestackUI theme variables for NativeWind compatibility
 */

// Convert oklch to hex for direct use
// These are the key colors from the oklch theme
const oklchToHex = {
    // Light mode
    light: {
        background: "#F8F8F8", // oklch(0.98 0 0)
        foreground: "#161616", // oklch(0.2 0 0)
        primary: "#00B700", // oklch(0.67 0.25 141.53) - green
        "primary-foreground": "#FCFCFC", // oklch(0.99 0 0)
        secondary: "#E8E8E8", // oklch(0.93 0 0)
        "secondary-foreground": "#222222", // oklch(0.25 0 0)
        muted: "#E4E4E4", // oklch(0.92 0 0)
        "muted-foreground": "#717171", // oklch(0.55 0 0)
        accent: "#C8E0FF", // oklch(0.9 0.05 255)
        "accent-foreground": "#161616", // oklch(0.2 0 0)
        destructive: "#F9423C", // oklch(0.65 0.22 27.3)
        "destructive-foreground": "#FCFCFC", // oklch(0.99 0 0)
        border: "#DEDEDE", // oklch(0.9 0 0)
        input: "#DEDEDE", // oklch(0.9 0 0)
        ring: "#00B700", // oklch(0.67 0.25 141.53)
        card: "#F5F5F5", // oklch(0.97 0 0)
        "card-foreground": "#161616", // oklch(0.2 0 0)
    },
    // Dark mode
    dark: {
        background: "#030303", // oklch(0.1 0 0)
        foreground: "#F8F8F8", // oklch(0.98 0 0)
        primary: "#39FF14", // oklch(0.8714 0.286 141.53) - bright green
        "primary-foreground": "#030303", // oklch(0.1 0 0)
        secondary: "#121212", // oklch(0.18 0 0)
        "secondary-foreground": "#F8F8F8", // oklch(0.98 0 0)
        muted: "#1B1B1B", // oklch(0.22 0 0)
        "muted-foreground": "#8F8F8F", // oklch(0.65 0 0)
        accent: "#272E38", // oklch(0.3 0.02 255)
        "accent-foreground": "#E9EBEE", // oklch(0.94 0.005 255)
        destructive: "#E7000B", // oklch(0.577 0.245 27.325)
        "destructive-foreground": "#F8F8F8", // oklch(0.98 0 0)
        border: "#1B1B1B", // oklch(0.22 0 0)
        input: "#1B1B1B", // oklch(0.22 0 0)
        ring: "#272E38", // oklch(0.3 0.02 255)
        card: "#0D0D0D", // oklch(0.16 0 0)
        "card-foreground": "#F8F8F8", // oklch(0.98 0 0)
    },
};

export const colors = {
    // Use NativeWind/GluestackUI theme variables
    // These will automatically switch based on dark mode
    primary: "rgb(var(--color-primary-500))",
    "primary-foreground": "rgb(var(--color-primary-0))",
    secondary: "rgb(var(--color-secondary-500))",
    "secondary-foreground": "rgb(var(--color-secondary-0))",
    accent: "rgb(var(--color-tertiary-500))", // Using tertiary as accent
    "accent-foreground": "rgb(var(--color-tertiary-0))",
    destructive: "rgb(var(--color-error-500))",
    "destructive-foreground": "rgb(var(--color-error-0))",
    success: "rgb(var(--color-success-500))",
    warning: "rgb(var(--color-warning-500))",
    info: "rgb(var(--color-info-500))",
    muted: "rgb(var(--color-background-muted))",
    "muted-foreground": "rgb(var(--color-typography-500))",
    border: "rgb(var(--color-outline-500))",
    input: "rgb(var(--color-outline-500))",
    ring: "rgb(var(--color-primary-500))",
    background: "rgb(var(--color-background-0))",
    foreground: "rgb(var(--color-typography-950))",
    card: "rgb(var(--color-background-50))",
    "card-foreground": "rgb(var(--color-typography-950))",

    // Direct hex values for fallback/static use
    hex: {
        light: oklchToHex.light,
        dark: oklchToHex.dark,
    },

    // Note type colors (using theme colors)
    noteTypes: {
        meeting: "rgb(var(--color-info-500))", // Blue
        task: "rgb(var(--color-warning-500))", // Orange
        idea: "rgb(var(--color-primary-500))", // Green (primary)
        journal: "rgb(var(--color-success-500))", // Green
        reference: "rgb(var(--color-typography-500))", // Grey
        voice: "rgb(var(--color-error-500))", // Red
        scan: "rgb(var(--color-tertiary-500))", // Amber/Accent
        note: "rgb(var(--color-typography-400))", // Default grey
    },

    // Note type backgrounds (20% opacity)
    noteTypeBg: {
        meeting: "rgb(var(--color-info-500) / 0.2)",
        task: "rgb(var(--color-warning-500) / 0.2)",
        idea: "rgb(var(--color-primary-500) / 0.2)",
        journal: "rgb(var(--color-success-500) / 0.2)",
        reference: "rgb(var(--color-typography-500) / 0.2)",
        voice: "rgb(var(--color-error-500) / 0.2)",
        scan: "rgb(var(--color-tertiary-500) / 0.2)",
        note: "rgb(var(--color-typography-400) / 0.2)",
    },
};

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
};

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
};

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
};

// Helper functions
export const getThemeColors = (isDark: boolean) => {
    const theme = isDark ? colors.hex.dark : colors.hex.light;
    return {
        background: theme.background,
        foreground: theme.foreground,
        text: theme.foreground,
        textSecondary: theme["muted-foreground"],
        border: theme.border,
        accent: theme.accent,
        primary: theme.primary,
        card: theme.card,
        "card-foreground": theme["card-foreground"],
    };
};

export const getNoteTypeColors = (type: string) => ({
    color: colors.noteTypes[type as keyof typeof colors.noteTypes] || colors.noteTypes.note,
    bgColor: colors.noteTypeBg[type as keyof typeof colors.noteTypeBg] || colors.noteTypeBg.note,
});
