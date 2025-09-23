/**
 * Cultivation Theme Configuration
 * Defines colors, animations, and styling for cultivation UI components
 */

import { CultivationTheme } from '../types/ui';

// Base color palette inspired by Wuxia/Xianxia themes
const COLORS = {
  // Primary cultivation colors
  qi: '#4FC3F7',           // Light blue - representing qi energy
  body: '#FF7043',         // Orange-red - representing body cultivation
  energy: '#66BB6A',       // Green - representing energy/vitality
  breakthrough: '#FFD700', // Gold - representing breakthrough moments

  // Realm colors
  mortal: '#795548',       // Brown - earthly realm
  cultivator: '#7986CB',   // Purple-blue - spiritual awakening
  immortal: '#FFB74D',     // Golden - transcendent realm

  // UI colors
  primary: '#1976D2',      // Primary blue
  secondary: '#424242',    // Dark gray
  background: '#121212',   // Dark background
  surface: '#1E1E1E',      // Card/surface background
  text: '#FFFFFF',         // Primary text
  textSecondary: '#B0B0B0', // Secondary text

  // Status colors
  success: '#4CAF50',      // Green - success states
  warning: '#FF9800',      // Orange - warning states
  error: '#F44336',        // Red - error states
  info: '#2196F3',         // Blue - info states

  // Gradient colors for visual effects
  qiGradient: ['#4FC3F7', '#29B6F6', '#0288D1'],
  bodyGradient: ['#FF7043', '#FF5722', '#D84315'],
  energyGradient: ['#66BB6A', '#4CAF50', '#388E3C'],
  breakthroughGradient: ['#FFD700', '#FFC107', '#FF8F00'],
} as const;

// Animation configuration
const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
    breakthrough: 3000,
  },
  easing: {
    inOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
    out: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    in: 'cubic-bezier(0.55, 0.06, 0.68, 0.19)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Typography scale
const TYPOGRAPHY = {
  tiny: 10,
  small: 12,
  medium: 14,
  large: 18,
  xlarge: 24,
  title: 28,
  hero: 36,
} as const;

// Spacing scale
const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Main cultivation theme
export const cultivationTheme: CultivationTheme = {
  colors: {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    qi: COLORS.qi,
    body: COLORS.body,
    energy: COLORS.energy,
    background: COLORS.background,
    surface: COLORS.surface,
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    success: COLORS.success,
    warning: COLORS.warning,
    error: COLORS.error,
    breakthrough: COLORS.breakthrough,
    realm: {
      mortal: COLORS.mortal,
      cultivator: COLORS.cultivator,
      immortal: COLORS.immortal,
    },
  },
  animations: ANIMATIONS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
};

// Gradient definitions for advanced visual effects
export const GRADIENTS = {
  qi: {
    colors: COLORS.qiGradient,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  body: {
    colors: COLORS.bodyGradient,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  energy: {
    colors: COLORS.energyGradient,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  breakthrough: {
    colors: COLORS.breakthroughGradient,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  backgroundGlow: {
    colors: ['transparent', COLORS.qi + '20', 'transparent'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;

// Shadow definitions for depth
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.qi,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 12,
  },
} as const;

// Border radius scale
export const BORDER_RADIUS = {
  none: 0,
  small: 4,
  medium: 8,
  large: 12,
  xlarge: 16,
  round: 50,
} as const;

// Opacity values for different states
export const OPACITY = {
  disabled: 0.38,
  inactive: 0.6,
  active: 1.0,
  overlay: 0.8,
  subtle: 0.12,
} as const;

// Particle effect configurations
export const PARTICLE_EFFECTS = {
  qi: {
    color: COLORS.qi,
    size: { min: 2, max: 6 },
    speed: { min: 0.5, max: 2.0 },
    life: { min: 1000, max: 3000 },
    count: 50,
  },
  body: {
    color: COLORS.body,
    size: { min: 3, max: 8 },
    speed: { min: 0.3, max: 1.5 },
    life: { min: 1500, max: 4000 },
    count: 30,
  },
  breakthrough: {
    color: COLORS.breakthrough,
    size: { min: 4, max: 12 },
    speed: { min: 1.0, max: 3.0 },
    life: { min: 2000, max: 5000 },
    count: 100,
  },
} as const;

// Theme variants for different contexts
export const THEME_VARIANTS = {
  dark: cultivationTheme,
  light: {
    ...cultivationTheme,
    colors: {
      ...cultivationTheme.colors,
      background: '#FFFFFF',
      surface: '#F5F5F5',
      text: '#212121',
      textSecondary: '#757575',
    },
  },
  contrast: {
    ...cultivationTheme,
    colors: {
      ...cultivationTheme.colors,
      qi: '#1E88E5',
      body: '#E53935',
      energy: '#43A047',
    },
  },
} as const;

// Animation presets for common cultivation UI patterns
export const ANIMATION_PRESETS = {
  progressUpdate: {
    duration: ANIMATIONS.duration.normal,
    easing: ANIMATIONS.easing.out,
    useNativeDriver: true,
  },
  breakthroughPulse: {
    duration: ANIMATIONS.duration.fast,
    easing: ANIMATIONS.easing.bounce,
    iterations: 3,
    useNativeDriver: true,
  },
  energyFlow: {
    duration: ANIMATIONS.duration.slow,
    easing: ANIMATIONS.easing.inOut,
    iterations: -1, // infinite
    useNativeDriver: true,
  },
  stageTransition: {
    duration: ANIMATIONS.duration.breakthrough,
    easing: ANIMATIONS.easing.inOut,
    useNativeDriver: false, // may need layout changes
  },
} as const;