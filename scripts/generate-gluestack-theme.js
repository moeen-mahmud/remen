/**
 * Generate complete GluestackUI theme config from oklch colors
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
    return `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(blue * 255)}`;
}

function generateScale(baseL, baseC, baseH, isDark = false) {
    const scale = [];
    const steps = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    for (const step of steps) {
        const factor = step / 950;
        let lightness, chroma;

        if (isDark) {
            // Dark mode: invert - 0 is darkest, 950 is lightest
            lightness = baseL * (1 - factor * 0.6) + factor * 0.95;
            chroma = baseC * (1 - factor * 0.4);
        } else {
            // Light mode: 0 is lightest, 950 is darkest
            lightness = baseL * (1 - factor * 0.75) + factor * 0.15;
            chroma = baseC * (1 - factor * 0.7);
        }

        scale.push(oklchToRgb(Math.max(0, Math.min(1, lightness)), Math.max(0, chroma), baseH));
    }

    return scale;
}

// Generate all color scales
const lightTheme = {
    primary: generateScale(0.67, 0.25, 141.53, false),
    secondary: generateScale(0.93, 0, 0, false),
    error: generateScale(0.65, 0.22, 27.3, false),
    success: generateScale(0.65, 0.17, 162.48, false),
    warning: generateScale(0.72, 0.18, 70.08, false),
    info: generateScale(0.65, 0.17, 200, false),
    typography: generateScale(0.2, 0, 0, false),
    outline: generateScale(0.9, 0, 0, false),
    background: generateScale(0.98, 0, 0, false),
};

const darkTheme = {
    primary: generateScale(0.8714, 0.286, 141.53, true),
    secondary: generateScale(0.18, 0, 0, true),
    error: generateScale(0.577, 0.245, 27.325, true),
    success: generateScale(0.65, 0.17, 162.48, true),
    warning: generateScale(0.72, 0.18, 70.08, true),
    info: generateScale(0.65, 0.17, 200, true),
    typography: generateScale(0.98, 0, 0, true),
    outline: generateScale(0.22, 0, 0, true),
    background: generateScale(0.1, 0, 0, true),
};

// Format for GluestackUI config
function formatConfig(theme, mode) {
    const config = {};
    const steps = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    // Primary
    theme.primary.forEach((color, i) => {
        config[`--color-primary-${steps[i]}`] = color;
    });

    // Secondary
    theme.secondary.forEach((color, i) => {
        config[`--color-secondary-${steps[i]}`] = color;
    });

    // Error
    theme.error.forEach((color, i) => {
        config[`--color-error-${steps[i]}`] = color;
    });

    // Success
    theme.success.forEach((color, i) => {
        config[`--color-success-${steps[i]}`] = color;
    });

    // Warning
    theme.warning.forEach((color, i) => {
        config[`--color-warning-${steps[i]}`] = color;
    });

    // Info
    theme.info.forEach((color, i) => {
        config[`--color-info-${steps[i]}`] = color;
    });

    // Typography
    theme.typography.forEach((color, i) => {
        config[`--color-typography-${steps[i]}`] = color;
    });

    // Outline
    theme.outline.forEach((color, i) => {
        config[`--color-outline-${steps[i]}`] = color;
    });

    // Background
    theme.background.forEach((color, i) => {
        config[`--color-background-${steps[i]}`] = color;
    });

    // Background special colors
    if (mode === "light") {
        config["--color-background-error"] = oklchToRgb(0.98, 0.02, 27.3);
        config["--color-background-warning"] = oklchToRgb(0.98, 0.02, 70.08);
        config["--color-background-success"] = oklchToRgb(0.98, 0.02, 162.48);
        config["--color-background-muted"] = oklchToRgb(0.92, 0, 0);
        config["--color-background-info"] = oklchToRgb(0.98, 0.02, 200);
    } else {
        config["--color-background-error"] = oklchToRgb(0.15, 0.05, 27.325);
        config["--color-background-warning"] = oklchToRgb(0.15, 0.05, 70.08);
        config["--color-background-success"] = oklchToRgb(0.15, 0.05, 162.48);
        config["--color-background-muted"] = oklchToRgb(0.22, 0, 0);
        config["--color-background-info"] = oklchToRgb(0.15, 0.05, 200);
    }

    // Indicators
    if (mode === "light") {
        config["--color-indicator-primary"] = oklchToRgb(0.67, 0.25, 141.53);
        config["--color-indicator-info"] = oklchToRgb(0.65, 0.17, 200);
        config["--color-indicator-error"] = oklchToRgb(0.65, 0.22, 27.3);
    } else {
        config["--color-indicator-primary"] = oklchToRgb(0.8714, 0.286, 141.53);
        config["--color-indicator-info"] = oklchToRgb(0.65, 0.17, 200);
        config["--color-indicator-error"] = oklchToRgb(0.577, 0.245, 27.325);
    }

    return config;
}

const lightConfig = formatConfig(lightTheme, "light");
const darkConfig = formatConfig(darkTheme, "dark");

console.log(JSON.stringify({ light: lightConfig, dark: darkConfig }, null, 2));
