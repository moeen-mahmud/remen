# Remen Theme System

This theme system is based on the oklch color space and has been converted to RGB for use with NativeWind and GluestackUI.

## Color System

The theme uses oklch color values converted to RGB:

- **Primary**: Green (`oklch(0.67 0.25 141.53)` light, `oklch(0.8714 0.286 141.53)` dark)
- **Secondary**: Neutral gray
- **Accent**: Blue-tinted (`oklch(0.9 0.05 255)` light, `oklch(0.3 0.02 255)` dark)
- **Destructive**: Red (`oklch(0.65 0.22 27.3)` light, `oklch(0.577 0.245 27.325)` dark)

## Usage

### In React Native Components

#### Using NativeWind Classes

```tsx
<View className="bg-background-0 dark:bg-background-0">
    <Text className="text-foreground dark:text-foreground">Hello World</Text>
</View>
```

#### Using GluestackUI Components

```tsx
import { Button } from "@/components/ui/button";

<Button>
    <ButtonText>Click me</ButtonText>
</Button>;
```

#### Using Design System Helpers

```tsx
import { getThemeColors, colors } from "@/lib/design";

const themeColors = getThemeColors(isDark);
// themeColors.background, themeColors.text, etc.
```

### Available Color Scales

All colors have scales from 0 (lightest) to 950 (darkest):

- `primary-0` through `primary-950`
- `secondary-0` through `secondary-950`
- `error-0` through `error-950`
- `success-0` through `success-950`
- `warning-0` through `warning-950`
- `info-0` through `info-950`
- `typography-0` through `typography-950`
- `outline-0` through `outline-950`
- `background-0` through `background-950`

### Special Background Colors

- `background-error`
- `background-warning`
- `background-success`
- `background-muted`
- `background-info`

## Files

- `lib/theme/oklch-to-rgb.ts` - Conversion utilities
- `lib/theme/colors.ts` - Direct color mappings
- `lib/theme/theme-config.ts` - Theme configuration generator
- `components/ui/gluestack-ui-provider/config.ts` - GluestackUI theme config
- `lib/design.ts` - Design system helpers

## Converting New Colors

To add new oklch colors:

```typescript
import { oklchToRgbString } from "@/lib/theme/oklch-to-rgb";

const newColor = oklchToRgbString("oklch(0.67 0.25 141.53)");
// Returns: "0 183 0"
```
