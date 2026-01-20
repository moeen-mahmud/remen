/**
 * Theme configuration based on oklch color system
 * Converted to RGB for NativeWind and GluestackUI
 */

import { oklchToRgb } from "./oklch-to-rgb"

/**
 * Generate a color scale from base oklch values
 * Creates shades from 0 (lightest) to 950 (darkest)
 */
function generateScale(baseL: number, baseC: number, baseH: number, isDark: boolean = false): string[] {
    const scale: string[] = []

    for (let i = 0; i <= 950; i += 50) {
        let lightness: number
        let chroma: number

        if (isDark) {
            // Dark mode: 0 is darkest, 950 is lightest
            const factor = i / 950
            lightness = baseL * (1 - factor * 0.7) + factor * 0.9
            chroma = baseC * (1 - factor * 0.5)
        } else {
            // Light mode: 0 is lightest, 950 is darkest
            const factor = i / 950
            lightness = baseL * (1 - factor * 0.8) + factor * 0.1
            chroma = baseC * (1 - factor * 0.6)
        }

        const rgb = oklchToRgb(Math.max(0, Math.min(1, lightness)), Math.max(0, chroma), baseH)
        scale.push(`${rgb.r} ${rgb.g} ${rgb.b}`)
    }

    return scale
}

// Primary color (green) - oklch(0.67 0.25 141.53) light, oklch(0.8714 0.286 141.53) dark
const PRIMARY_L = 0.67
const PRIMARY_C = 0.25
const PRIMARY_H = 141.53

const PRIMARY_DARK_L = 0.8714
const PRIMARY_DARK_C = 0.286

// Secondary (neutral gray)
const SECONDARY_L = 0.93
const SECONDARY_C = 0
const SECONDARY_H = 0

const SECONDARY_DARK_L = 0.18

// Error/Destructive (red) - oklch(0.65 0.22 27.3) light, oklch(0.577 0.245 27.325) dark
const ERROR_L = 0.65
const ERROR_C = 0.22
const ERROR_H = 27.3

const ERROR_DARK_L = 0.577
const ERROR_DARK_C = 0.245

// Success (green) - using chart-2 oklch(0.65 0.17 162.48)
const SUCCESS_L = 0.65
const SUCCESS_C = 0.17
const SUCCESS_H = 162.48

// Warning (yellow/orange) - oklch(0.72 0.18 70.08)
const WARNING_L = 0.72
const WARNING_C = 0.18
const WARNING_H = 70.08

// Info (blue) - using accent-like color
const INFO_L = 0.65
const INFO_C = 0.17
const INFO_H = 200

// Typography (foreground/muted)
const TYPO_L = 0.2
const TYPO_C = 0
const TYPO_H = 0

const TYPO_DARK_L = 0.98

// Outline/Border
const BORDER_L = 0.9
const BORDER_C = 0
const BORDER_H = 0

const BORDER_DARK_L = 0.22

// Background
const BG_L = 0.98
const BG_C = 0
const BG_H = 0

const BG_DARK_L = 0.1

export const themeConfig = {
    light: {
        primary: generateScale(PRIMARY_L, PRIMARY_C, PRIMARY_H, false),
        secondary: generateScale(SECONDARY_L, SECONDARY_C, SECONDARY_H, false),
        error: generateScale(ERROR_L, ERROR_C, ERROR_H, false),
        success: generateScale(SUCCESS_L, SUCCESS_C, SUCCESS_H, false),
        warning: generateScale(WARNING_L, WARNING_C, WARNING_H, false),
        info: generateScale(INFO_L, INFO_C, INFO_H, false),
        typography: generateScale(TYPO_L, TYPO_C, TYPO_H, false),
        outline: generateScale(BORDER_L, BORDER_C, BORDER_H, false),
        background: generateScale(BG_L, BG_C, BG_H, false),
    },
    dark: {
        primary: generateScale(PRIMARY_DARK_L, PRIMARY_DARK_C, PRIMARY_H, true),
        secondary: generateScale(SECONDARY_DARK_L, SECONDARY_C, SECONDARY_H, true),
        error: generateScale(ERROR_DARK_L, ERROR_DARK_C, ERROR_H, true),
        success: generateScale(SUCCESS_L, SUCCESS_C, SUCCESS_H, true),
        warning: generateScale(WARNING_L, WARNING_C, WARNING_H, true),
        info: generateScale(INFO_L, INFO_C, INFO_H, true),
        typography: generateScale(TYPO_DARK_L, TYPO_C, TYPO_H, true),
        outline: generateScale(BORDER_DARK_L, BORDER_C, BORDER_H, true),
        background: generateScale(BG_DARK_L, BG_C, BG_H, true),
    },
}
