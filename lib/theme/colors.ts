import { oklchToRgbString } from "./oklch-to-rgb"

/**
 * Theme colors converted from oklch to RGB
 * Based on the provided CSS theme
 */

// Light mode colors
export const lightColors = {
    // Core Surfaces
    "background": oklchToRgbString("oklch(0.98 0 0)"),
    "foreground": oklchToRgbString("oklch(0.2 0 0)"),
    "card": oklchToRgbString("oklch(0.97 0 0)"),
    "card-foreground": oklchToRgbString("oklch(0.2 0 0)"),
    "popover": oklchToRgbString("oklch(0.99 0 0)"),
    "popover-foreground": oklchToRgbString("oklch(0.2 0 0)"),

    // Primary Signal
    "primary": oklchToRgbString("oklch(0.67 0.25 141.53)"),
    "primary-foreground": oklchToRgbString("oklch(0.99 0 0)"),

    // Secondary & Muted
    "secondary": oklchToRgbString("oklch(0.93 0 0)"),
    "secondary-foreground": oklchToRgbString("oklch(0.25 0 0)"),
    "muted": oklchToRgbString("oklch(0.92 0 0)"),
    "muted-foreground": oklchToRgbString("oklch(0.55 0 0)"),

    // Accent Layer
    "accent": oklchToRgbString("oklch(0.9 0.05 255)"),
    "accent-foreground": oklchToRgbString("oklch(0.2 0 0)"),

    // Destructive
    "destructive": oklchToRgbString("oklch(0.65 0.22 27.3)"),
    "destructive-foreground": oklchToRgbString("oklch(0.99 0 0)"),

    // Borders & Inputs
    "border": oklchToRgbString("oklch(0.9 0 0)"),
    "input": oklchToRgbString("oklch(0.9 0 0)"),

    // Focus & Ring
    "ring": oklchToRgbString("oklch(0.67 0.25 141.53)"),

    // Charts
    "chart-1": oklchToRgbString("oklch(0.67 0.25 141.53)"),
    "chart-2": oklchToRgbString("oklch(0.65 0.17 162.48)"),
    "chart-3": oklchToRgbString("oklch(0.72 0.18 70.08)"),
    "chart-4": oklchToRgbString("oklch(0.6 0.24 303.9)"),
    "chart-5": oklchToRgbString("oklch(0.63 0.22 16.439)"),

    // Sidebar
    "sidebar": oklchToRgbString("oklch(0.96 0 0)"),
    "sidebar-foreground": oklchToRgbString("oklch(0.18 0 0)"),
    "sidebar-primary": oklchToRgbString("oklch(0.67 0.25 141.53)"),
    "sidebar-primary-foreground": oklchToRgbString("oklch(0.99 0 0)"),
    "sidebar-accent": oklchToRgbString("oklch(0.92 0 0)"),
    "sidebar-accent-foreground": oklchToRgbString("oklch(0.2 0 0)"),
    "sidebar-border": oklchToRgbString("oklch(0.9 0 0)"),
    "sidebar-ring": oklchToRgbString("oklch(0.67 0.25 141.53)"),
    "brand": oklchToRgbString("oklch(0.67 0.25 141.53)"),
    "highlight": oklchToRgbString("oklch(0.852 0.199 91.936)"),
}

// Dark mode colors
export const darkColors = {
    // Core Surfaces
    "background": oklchToRgbString("oklch(0.1 0 0)"),
    "foreground": oklchToRgbString("oklch(0.98 0 0)"),
    "card": oklchToRgbString("oklch(0.16 0 0)"),
    "card-foreground": oklchToRgbString("oklch(0.98 0 0)"),
    "popover": oklchToRgbString("oklch(0.16 0 0)"),
    "popover-foreground": oklchToRgbString("oklch(0.98 0 0)"),

    // Primary Signal
    "primary": oklchToRgbString("oklch(0.8714 0.286 141.53)"),
    "primary-foreground": oklchToRgbString("oklch(0.1 0 0)"),

    // Secondary & Muted
    "secondary": oklchToRgbString("oklch(0.18 0 0)"),
    "secondary-foreground": oklchToRgbString("oklch(0.98 0 0)"),
    "muted": oklchToRgbString("oklch(0.22 0 0)"),
    "muted-foreground": oklchToRgbString("oklch(0.65 0 0)"),

    // Accent Layer
    "accent": oklchToRgbString("oklch(0.3 0.02 255)"),
    "accent-foreground": oklchToRgbString("oklch(0.94 0.005 255)"),

    // Destructive State
    "destructive": oklchToRgbString("oklch(0.577 0.245 27.325)"),
    "destructive-foreground": oklchToRgbString("oklch(0.98 0 0)"),

    // Borders & Inputs
    "border": oklchToRgbString("oklch(0.22 0 0)"),
    "input": oklchToRgbString("oklch(0.22 0 0)"),

    // Focus & Ring
    "ring": oklchToRgbString("oklch(0.3 0.02 255)"),

    // Data Visualization
    "chart-1": oklchToRgbString("oklch(0.3 0.02 255)"),
    "chart-2": oklchToRgbString("oklch(0.696 0.17 162.48)"),
    "chart-3": oklchToRgbString("oklch(0.769 0.188 70.08)"),
    "chart-4": oklchToRgbString("oklch(0.627 0.265 303.9)"),
    "chart-5": oklchToRgbString("oklch(0.645 0.246 16.439)"),

    // Sidebar System
    "sidebar": oklchToRgbString("oklch(0.16 0 0)"),
    "sidebar-foreground": oklchToRgbString("oklch(0.98 0 0)"),
    "sidebar-primary": oklchToRgbString("oklch(0.3 0.02 255)"),
    "sidebar-primary-foreground": oklchToRgbString("oklch(0.1 0 0)"),
    "sidebar-accent": oklchToRgbString("oklch(0.22 0 0)"),
    "sidebar-accent-foreground": oklchToRgbString("oklch(0.98 0 0)"),
    "sidebar-border": oklchToRgbString("oklch(0.22 0 0)"),
    "sidebar-ring": oklchToRgbString("oklch(0.3 0.02 255)"),
    "brand": oklchToRgbString("oklch(0.8714 0.286 141.53)"),
    "highlight": oklchToRgbString("oklch(0.852 0.199 91.936)"),
}
