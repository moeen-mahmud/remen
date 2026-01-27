/**
 * Convert oklch theme to RGB for GluestackUI and NativeWind
 */

function oklchToRgb(l, c, h) {
    const hRad = (h * Math.PI) / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.291485548 * b;
    const lLin = l_ * l_ * l_;
    const mLin = m_ * m_ * m_;
    const sLin = s_ * s_ * s_;
    let rLin = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
    let gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
    let bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;
    const gammaSRGB = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);
    let r = Math.min(Math.max(0, gammaSRGB(rLin)), 1);
    let g = Math.min(Math.max(0, gammaSRGB(gLin)), 1);
    let blue = Math.min(Math.max(0, gammaSRGB(bLin)), 1);
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(blue * 255) };
}

function toRgbString(oklch) {
    const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
    if (!match) return null;
    const rgb = oklchToRgb(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
    return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

// Key colors from theme
const colors = {
    light: {
        background: toRgbString("oklch(0.98 0 0)"),
        foreground: toRgbString("oklch(0.2 0 0)"),
        primary: toRgbString("oklch(0.67 0.25 141.53)"),
        "primary-foreground": toRgbString("oklch(0.99 0 0)"),
        secondary: toRgbString("oklch(0.93 0 0)"),
        "secondary-foreground": toRgbString("oklch(0.25 0 0)"),
        muted: toRgbString("oklch(0.92 0 0)"),
        "muted-foreground": toRgbString("oklch(0.55 0 0)"),
        accent: toRgbString("oklch(0.9 0.05 255)"),
        "accent-foreground": toRgbString("oklch(0.2 0 0)"),
        destructive: toRgbString("oklch(0.65 0.22 27.3)"),
        "destructive-foreground": toRgbString("oklch(0.99 0 0)"),
        border: toRgbString("oklch(0.9 0 0)"),
        input: toRgbString("oklch(0.9 0 0)"),
        ring: toRgbString("oklch(0.67 0.25 141.53)"),
        card: toRgbString("oklch(0.97 0 0)"),
        "card-foreground": toRgbString("oklch(0.2 0 0)"),
    },
    dark: {
        background: toRgbString("oklch(0.1 0 0)"),
        foreground: toRgbString("oklch(0.98 0 0)"),
        primary: toRgbString("oklch(0.8714 0.286 141.53)"),
        "primary-foreground": toRgbString("oklch(0.1 0 0)"),
        secondary: toRgbString("oklch(0.18 0 0)"),
        "secondary-foreground": toRgbString("oklch(0.98 0 0)"),
        muted: toRgbString("oklch(0.22 0 0)"),
        "muted-foreground": toRgbString("oklch(0.65 0 0)"),
        accent: toRgbString("oklch(0.3 0.02 255)"),
        "accent-foreground": toRgbString("oklch(0.94 0.005 255)"),
        destructive: toRgbString("oklch(0.577 0.245 27.325)"),
        "destructive-foreground": toRgbString("oklch(0.98 0 0)"),
        border: toRgbString("oklch(0.22 0 0)"),
        input: toRgbString("oklch(0.22 0 0)"),
        ring: toRgbString("oklch(0.3 0.02 255)"),
        card: toRgbString("oklch(0.16 0 0)"),
        "card-foreground": toRgbString("oklch(0.98 0 0)"),
    },
};

console.log(JSON.stringify(colors, null, 2));
