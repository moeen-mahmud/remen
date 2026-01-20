import { oklchToRgb } from "./oklch-to-rgb"

/**
 * Generate color scale from base color
 * Creates a scale from 0 (lightest) to 950 (darkest)
 */
function generateColorScale(baseL: number, baseC: number, baseH: number): string[] {
    const scale: string[] = []

    // Generate scale from lightest to darkest
    for (let i = 0; i <= 950; i += 50) {
        // Map 0-950 to lightness range
        // For light mode: 0 = very light, 950 = very dark
        // For dark mode: 0 = very dark, 950 = very light
        const lightness = baseL + ((i / 950) * (1 - baseL) - (i / 950) * baseL) * 0.8
        const chroma = baseC * (1 - i / 950) // Reduce chroma as we go darker/lighter

        const rgb = oklchToRgb(lightness, chroma, baseH)
        scale.push(`${rgb.r} ${rgb.g} ${rgb.b}`)
    }

    return scale
}

/**
 * Generate theme config for GluestackUI
 */
export function generateThemeConfig() {
    // Primary color (green-ish from the theme)
    const primaryL = 0.67
    const primaryC = 0.25
    const primaryH = 141.53

    // Secondary (neutral gray)
    const secondaryL = 0.93
    const secondaryC = 0
    const secondaryH = 0

    // Error/Destructive (red)
    const errorL = 0.65
    const errorC = 0.22
    const errorH = 27.3

    // Success (green)
    const successL = 0.65
    const successC = 0.17
    const successH = 162.48

    // Warning (orange/yellow)
    const warningL = 0.72
    const warningC = 0.18
    const warningH = 70.08

    // Info (blue)
    const infoL = 0.65
    const infoC = 0.17
    const infoH = 162.48

    return {
        light: {
            primary: generateColorScale(primaryL, primaryC, primaryH),
            secondary: generateColorScale(secondaryL, secondaryC, secondaryH),
            error: generateColorScale(errorL, errorC, errorH),
            success: generateColorScale(successL, successC, successH),
            warning: generateColorScale(warningL, warningC, warningH),
            info: generateColorScale(infoL, infoC, infoH),
        },
        dark: {
            primary: generateColorScale(0.87, 0.286, primaryH).reverse(),
            secondary: generateColorScale(0.18, 0, 0),
            error: generateColorScale(0.577, 0.245, errorH).reverse(),
            success: generateColorScale(0.65, 0.17, successH).reverse(),
            warning: generateColorScale(0.72, 0.18, warningH).reverse(),
            info: generateColorScale(0.65, 0.17, infoH).reverse(),
        },
    }
}
