/**
 * Responsive Design Constants and Breakpoints
 * Defines screen size breakpoints and responsive configurations
 */

import { Dimensions } from 'react-native';

// Screen size breakpoints
export const BREAKPOINTS = {
  SMALL: 375,   // iPhone SE, small phones
  MEDIUM: 768,  // iPad mini, large phones
  LARGE: 1024,  // iPad, tablets
  XLARGE: 1366, // iPad Pro, large tablets
} as const;

// Get current screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const { width: windowWidth, height: windowHeight } = Dimensions.get('screen');

// Screen size detection
export const SCREEN_SIZE = {
  width: screenWidth,
  height: screenHeight,
  isSmall: screenWidth < BREAKPOINTS.SMALL,
  isMedium: screenWidth >= BREAKPOINTS.SMALL && screenWidth < BREAKPOINTS.MEDIUM,
  isLarge: screenWidth >= BREAKPOINTS.MEDIUM && screenWidth < BREAKPOINTS.LARGE,
  isXLarge: screenWidth >= BREAKPOINTS.LARGE,
  isTablet: screenWidth >= BREAKPOINTS.MEDIUM,
  isLandscape: screenWidth > screenHeight,
  aspectRatio: screenWidth / screenHeight,
  scale: windowWidth / screenWidth,
} as const;

// Responsive spacing values
export const SPACING = {
  xs: SCREEN_SIZE.isSmall ? 4 : 6,
  sm: SCREEN_SIZE.isSmall ? 8 : 12,
  md: SCREEN_SIZE.isSmall ? 16 : 20,
  lg: SCREEN_SIZE.isSmall ? 24 : 32,
  xl: SCREEN_SIZE.isSmall ? 32 : 48,
  xxl: SCREEN_SIZE.isSmall ? 48 : 64,
} as const;

// Responsive typography scales
export const TYPOGRAPHY = {
  tiny: SCREEN_SIZE.isSmall ? 10 : 12,
  small: SCREEN_SIZE.isSmall ? 12 : 14,
  medium: SCREEN_SIZE.isSmall ? 14 : 16,
  large: SCREEN_SIZE.isSmall ? 18 : 22,
  xlarge: SCREEN_SIZE.isSmall ? 24 : 32,
  title: SCREEN_SIZE.isSmall ? 28 : 36,
  hero: SCREEN_SIZE.isSmall ? 32 : 48,
} as const;

// Responsive component sizes
export const COMPONENT_SIZES = {
  progressBar: {
    height: SCREEN_SIZE.isSmall ? 8 : 12,
    marginVertical: SPACING.sm,
  },
  energyIndicator: {
    size: SCREEN_SIZE.isSmall ? 60 : 80,
    fontSize: TYPOGRAPHY.small,
  },
  button: {
    height: SCREEN_SIZE.isSmall ? 44 : 56,
    fontSize: TYPOGRAPHY.medium,
    borderRadius: SCREEN_SIZE.isSmall ? 8 : 12,
  },
  card: {
    borderRadius: SCREEN_SIZE.isSmall ? 8 : 12,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
  },
  modal: {
    borderRadius: SCREEN_SIZE.isSmall ? 12 : 16,
    maxWidth: SCREEN_SIZE.isTablet ? 400 : '90%',
  },
} as const;

// Layout configurations for different screen sizes
export const LAYOUT_CONFIG = {
  small: {
    components: {
      progressBar: {
        height: 8,
        marginVertical: 8,
      },
      energyIndicator: {
        size: 60,
        position: 'top' as const,
      },
      controls: {
        buttonSize: 44,
        spacing: 8,
        arrangement: 'vertical' as const,
      },
      stats: {
        fontSize: 12,
        showDetailed: false,
      },
    },
    animations: {
      particleCount: 30,
      enableAdvancedEffects: false,
      targetFPS: 30,
    },
  },
  medium: {
    components: {
      progressBar: {
        height: 10,
        marginVertical: 12,
      },
      energyIndicator: {
        size: 70,
        position: 'top' as const,
      },
      controls: {
        buttonSize: 48,
        spacing: 12,
        arrangement: 'horizontal' as const,
      },
      stats: {
        fontSize: 14,
        showDetailed: true,
      },
    },
    animations: {
      particleCount: 50,
      enableAdvancedEffects: true,
      targetFPS: 45,
    },
  },
  large: {
    components: {
      progressBar: {
        height: 12,
        marginVertical: 16,
      },
      energyIndicator: {
        size: 80,
        position: 'side' as const,
      },
      controls: {
        buttonSize: 56,
        spacing: 16,
        arrangement: 'horizontal' as const,
      },
      stats: {
        fontSize: 16,
        showDetailed: true,
      },
    },
    animations: {
      particleCount: 80,
      enableAdvancedEffects: true,
      targetFPS: 60,
    },
  },
} as const;

// Screen size utility functions
export const getScreenSize = () => {
  if (SCREEN_SIZE.isSmall) return 'small';
  if (SCREEN_SIZE.isMedium) return 'medium';
  return 'large';
};

export const getLayoutConfig = () => {
  const size = getScreenSize();
  return LAYOUT_CONFIG[size];
};

// Responsive value getter
export const getResponsiveValue = <T>(values: {
  small: T;
  medium: T;
  large: T;
}): T => {
  const size = getScreenSize();
  return values[size];
};

// Safe area padding for different devices
export const SAFE_AREA = {
  top: SCREEN_SIZE.isSmall ? 20 : 44,
  bottom: SCREEN_SIZE.isSmall ? 0 : 34,
  left: 0,
  right: 0,
} as const;

// Device-specific optimizations
export const PERFORMANCE_CONFIG = {
  animations: {
    useNativeDriver: true,
    enableHighFrameRate: SCREEN_SIZE.isTablet,
    particleCount: getResponsiveValue({
      small: 30,
      medium: 50,
      large: 80,
    }),
    targetFPS: getResponsiveValue({
      small: 30,
      medium: 45,
      large: 60,
    }),
  },
  rendering: {
    enableHardwareAcceleration: true,
    useOptimizedImages: true,
    enableMemoization: true,
  },
} as const;

// Accessibility configurations
export const ACCESSIBILITY = {
  minimumTouchTarget: 44,
  textScale: {
    minimum: 0.8,
    maximum: 1.5,
    default: 1.0,
  },
  animations: {
    respectReduceMotion: true,
    fallbackToStaticWhenDisabled: true,
  },
} as const;