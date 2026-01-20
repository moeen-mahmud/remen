/**
 * Generate and update GluestackUI config with oklch theme
 */

const fs = require("fs")
const path = require("path")

function oklchToRgb(l, c, h) {
    const hRad = (h * Math.PI) / 180
    const a = c * Math.cos(hRad)
    const b = c * Math.sin(hRad)
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b
    const s_ = l - 0.0894841775 * a - 1.291485548 * b
    const lLin = l_ * l_ * l_
    const mLin = m_ * m_ * m_
    const sLin = s_ * s_ * s_
    let rLin = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin
    let gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin
    let bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin
    const gammaSRGB = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055)
    let r = Math.min(Math.max(0, gammaSRGB(rLin)), 1)
    let g = Math.min(Math.max(0, gammaSRGB(gLin)), 1)
    let blue = Math.min(Math.max(0, gammaSRGB(bLin)), 1)
    return `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(blue * 255)}`
}

function generateScale(baseL, baseC, baseH, isDark = false) {
    const steps = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
    return steps.map((step) => {
        const factor = step / 950
        let lightness, chroma

        if (isDark) {
            lightness = baseL * (1 - factor * 0.6) + factor * 0.95
            chroma = baseC * (1 - factor * 0.4)
        } else {
            lightness = baseL * (1 - factor * 0.75) + factor * 0.15
            chroma = baseC * (1 - factor * 0.7)
        }

        return oklchToRgb(Math.max(0, Math.min(1, lightness)), Math.max(0, chroma), baseH)
    })
}

function formatConfigEntry(name, scale, steps) {
    return scale.map((color, i) => `        "--color-${name}-${steps[i]}": "${color}",`).join("\n")
}

const steps = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

// Light theme
const lightPrimary = generateScale(0.67, 0.25, 141.53, false)
const lightSecondary = generateScale(0.93, 0, 0, false)
const lightError = generateScale(0.65, 0.22, 27.3, false)
const lightSuccess = generateScale(0.65, 0.17, 162.48, false)
const lightWarning = generateScale(0.72, 0.18, 70.08, false)
const lightInfo = generateScale(0.65, 0.17, 200, false)
const lightTypography = generateScale(0.2, 0, 0, false)
const lightOutline = generateScale(0.9, 0, 0, false)
const lightBackground = generateScale(0.98, 0, 0, false)

// Dark theme
const darkPrimary = generateScale(0.8714, 0.286, 141.53, true)
const darkSecondary = generateScale(0.18, 0, 0, true)
const darkError = generateScale(0.577, 0.245, 27.325, true)
const darkSuccess = generateScale(0.65, 0.17, 162.48, true)
const darkWarning = generateScale(0.72, 0.18, 70.08, true)
const darkInfo = generateScale(0.65, 0.17, 200, true)
const darkTypography = generateScale(0.98, 0, 0, true)
const darkOutline = generateScale(0.22, 0, 0, true)
const darkBackground = generateScale(0.1, 0, 0, true)

const configContent = `"use client"
import { vars } from "nativewind"

export const config = {
    light: vars({
${formatConfigEntry("primary", lightPrimary, steps)}

        /* Secondary  */
${formatConfigEntry("secondary", lightSecondary, steps)}

        /* Tertiary - using accent color */
${formatConfigEntry("tertiary", generateScale(0.9, 0.05, 255, false), steps)}

        /* Error */
${formatConfigEntry("error", lightError, steps)}

        /* Success */
${formatConfigEntry("success", lightSuccess, steps)}

        /* Warning */
${formatConfigEntry("warning", lightWarning, steps)}

        /* Info */
${formatConfigEntry("info", lightInfo, steps)}

        /* Typography */
${formatConfigEntry("typography", lightTypography, steps)}

        /* Outline */
${formatConfigEntry("outline", lightOutline, steps)}

        /* Background */
${formatConfigEntry("background", lightBackground, steps)}

        /* Background Special */
        "--color-background-error": "${oklchToRgb(0.98, 0.02, 27.3)}",
        "--color-background-warning": "${oklchToRgb(0.98, 0.02, 70.08)}",
        "--color-background-success": "${oklchToRgb(0.98, 0.02, 162.48)}",
        "--color-background-muted": "${oklchToRgb(0.92, 0, 0)}",
        "--color-background-info": "${oklchToRgb(0.98, 0.02, 200)}",

        /* Focus Ring Indicator  */
        "--color-indicator-primary": "${oklchToRgb(0.67, 0.25, 141.53)}",
        "--color-indicator-info": "${oklchToRgb(0.65, 0.17, 200)}",
        "--color-indicator-error": "${oklchToRgb(0.65, 0.22, 27.3)}",
    }),
    dark: vars({
${formatConfigEntry("primary", darkPrimary, steps)}

        /* Secondary  */
${formatConfigEntry("secondary", darkSecondary, steps)}

        /* Tertiary - using accent color */
${formatConfigEntry("tertiary", generateScale(0.3, 0.02, 255, true), steps)}

        /* Error */
${formatConfigEntry("error", darkError, steps)}

        /* Success */
${formatConfigEntry("success", darkSuccess, steps)}

        /* Warning */
${formatConfigEntry("warning", darkWarning, steps)}

        /* Info */
${formatConfigEntry("info", darkInfo, steps)}

        /* Typography */
${formatConfigEntry("typography", darkTypography, steps)}

        /* Outline */
${formatConfigEntry("outline", darkOutline, steps)}

        /* Background */
${formatConfigEntry("background", darkBackground, steps)}

        /* Background Special */
        "--color-background-error": "${oklchToRgb(0.15, 0.05, 27.325)}",
        "--color-background-warning": "${oklchToRgb(0.15, 0.05, 70.08)}",
        "--color-background-success": "${oklchToRgb(0.15, 0.05, 162.48)}",
        "--color-background-muted": "${oklchToRgb(0.22, 0, 0)}",
        "--color-background-info": "${oklchToRgb(0.15, 0.05, 200)}",

        /* Focus Ring Indicator  */
        "--color-indicator-primary": "${oklchToRgb(0.8714, 0.286, 141.53)}",
        "--color-indicator-info": "${oklchToRgb(0.65, 0.17, 200)}",
        "--color-indicator-error": "${oklchToRgb(0.577, 0.245, 27.325)}",
    }),
}
`

const configPath = path.join(process.cwd(), "components/ui/gluestack-ui-provider/config.ts")
fs.writeFileSync(configPath, configContent)
console.log("✅ Updated GluestackUI config with oklch theme!")
