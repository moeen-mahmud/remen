/**
 * Convert OKLCH to sRGB
 * @param l Lightness (0 to 1)
 * @param c Chroma
 * @param h Hue, in degrees 0 to 360
 * @returns { r, g, b } sRGB channels each in 0..255
 */
export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
    // 1. OKLCH → OKLab
    const hRad = (h * Math.PI) / 180
    const a = c * Math.cos(hRad)
    const b_ = c * Math.sin(hRad)

    // 2. OKLab → linear-light sRGB
    // First compute LMS' (cube-rooted components from linear-light space)
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b_
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b_
    const s_ = l - 0.0894841775 * a - 1.291485548 * b_

    // Inverse of cube root → cube to go back to linear-light
    const lLin = l_ * l_ * l_
    const mLin = m_ * m_ * m_
    const sLin = s_ * s_ * s_

    // Now convert LMS linear to linear-light sRGB using matrix
    let rLin = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin
    let gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin
    let bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin

    // 3. Apply sRGB gamma correction
    function gammaSRGB(u: number): number {
        if (u <= 0.0031308) {
            return 12.92 * u
        } else {
            return 1.055 * Math.pow(u, 1 / 2.4) - 0.055
        }
    }

    let r = gammaSRGB(rLin)
    let g = gammaSRGB(gLin)
    let b = gammaSRGB(bLin)

    // 4. Clamp to [0,1] and convert to 0-255
    r = Math.min(Math.max(0, r), 1)
    g = Math.min(Math.max(0, g), 1)
    b = Math.min(Math.max(0, b), 1)

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    }
}

/**
 * Parse oklch string like "oklch(0.98 0 0)" and convert to RGB
 */
export function parseOklch(oklchString: string): { r: number; g: number; b: number } {
    const match = oklchString.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
    if (!match) {
        throw new Error(`Invalid oklch string: ${oklchString}`)
    }

    const l = parseFloat(match[1])
    const c = parseFloat(match[2])
    const h = parseFloat(match[3])

    return oklchToRgb(l, c, h)
}

/**
 * Convert oklch to RGB string format "r g b" for NativeWind vars
 */
export function oklchToRgbString(oklchString: string): string {
    const rgb = parseOklch(oklchString)
    return `${rgb.r} ${rgb.g} ${rgb.b}`
}
