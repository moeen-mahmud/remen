// Spring configs for react-native-reanimated (withSpring)
export const springConfigs = {
    // Snappy - for quick UI responses (buttons, toggles)
    snappy: {
        damping: 15,
        stiffness: 200,
    },

    // Gentle - for smooth transitions (modals, sheets)
    gentle: {
        damping: 20,
        stiffness: 120,
    },

    // Bouncy - for playful interactions (success states, celebrations)
    bouncy: {
        damping: 10,
        stiffness: 150,
    },

    // Stiff - for precise movements (selection, focus states)
    stiff: {
        damping: 25,
        stiffness: 300,
    },
};

// Spring configs for Animated.spring (friction/tension based)
export const animatedSpringConfigs = {
    // Default - balanced feel
    default: {
        friction: 7,
        tension: 40,
        useNativeDriver: true,
    },

    // Snappy - quick response
    snappy: {
        friction: 8,
        tension: 80,
        useNativeDriver: true,
    },

    // Gentle - smooth, slower
    gentle: {
        friction: 10,
        tension: 30,
        useNativeDriver: true,
    },

    // Speed Dial - for FAB menu animations
    speedDial: {
        friction: 6,
        tension: 50,
        useNativeDriver: true,
    },
};

// Timing configs for withTiming
export const timingConfigs = {
    // Fast - quick micro-interactions
    fast: {
        duration: 150,
    },

    // Normal - standard transitions
    normal: {
        duration: 250,
    },

    // Slow - emphasis transitions
    slow: {
        duration: 400,
    },
};

// Haptic feedback intensity mapping
export const hapticIntensity = {
    light: "Light" as const,
    medium: "Medium" as const,
    heavy: "Heavy" as const,
};

// Swipe gesture thresholds
export const gestureThresholds = {
    swipeActionThreshold: 0.3, // 30% of screen width
    longPressDelay: 400, // ms
};

// Scale values for press states
export const scaleValues = {
    pressedIn: 0.97,
    pressedOut: 1,
    selected: 1.02,
};

// Opacity values
export const opacityValues = {
    disabled: 0.5,
    pressed: 0.8,
    normal: 1,
};
