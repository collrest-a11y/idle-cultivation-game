/**
 * UI Component Types for Cultivation Interface
 * Extends cultivation types with UI-specific interfaces and props
 */

import { CultivationState, CultivationStats, BreakthroughResult, OfflineProgressResult } from './cultivation';
import { CultivationProgress, BreakthroughEvent, EnergyRegeneration } from './websocket';

// Screen dimensions for responsive design
export interface ScreenDimensions {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  scale: number;
}

// Theme colors for cultivation UI
export interface CultivationTheme {
  colors: {
    primary: string;
    secondary: string;
    qi: string;
    body: string;
    energy: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    breakthrough: string;
    realm: {
      mortal: string;
      cultivator: string;
      immortal: string;
    };
  };
  animations: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
    easing: {
      inOut: string;
      out: string;
      in: string;
    };
  };
  typography: {
    large: number;
    medium: number;
    small: number;
    tiny: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

// Animation state for 60fps animations
export interface AnimationState {
  progress: {
    isAnimating: boolean;
    fromValue: number;
    toValue: number;
    duration: number;
    delay?: number;
  };
  breakthrough: {
    isPlaying: boolean;
    stage: 'preparation' | 'breakthrough' | 'success' | 'failure';
    intensity: number;
    particleCount: number;
  };
  energy: {
    isRegenerating: boolean;
    flowDirection: 'in' | 'out' | 'stable';
    pulseIntensity: number;
    glowEffect: boolean;
  };
  qi: {
    particles: QiParticle[];
    meridianFlow: boolean;
    density: number;
    swirling: boolean;
  };
}

export interface QiParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  opacity: number;
}

// Progress bar component props
export interface ProgressBarProps {
  current: number;
  maximum: number;
  animated?: boolean;
  showLabel?: boolean;
  labelText?: string;
  color?: string;
  backgroundColor?: string;
  height?: number;
  borderRadius?: number;
  style?: object;
  glowEffect?: boolean;
  pulseOnChange?: boolean;
}

// Energy indicator component props
export interface EnergyIndicatorProps {
  currentEnergy: number;
  maxEnergy: number;
  regenRate: number;
  showRegeneration?: boolean;
  compact?: boolean;
  style?: object;
  animated?: boolean;
}

// Cultivation stats display props
export interface CultivationStatsDisplayProps {
  stats: CultivationStats;
  animated?: boolean;
  showExperience?: boolean;
  showNextLevel?: boolean;
  style?: object;
}

// Breakthrough animation component props
export interface BreakthroughAnimationProps {
  isPlaying: boolean;
  stage: 'preparation' | 'breakthrough' | 'success' | 'failure';
  onComplete: () => void;
  intensity?: 'low' | 'medium' | 'high' | 'extreme';
  style?: object;
}

// Cultivation screen main component props
export interface CultivationScreenProps {
  cultivationState: CultivationState;
  onStartCultivation: (techniqueId?: string) => void;
  onStopCultivation: () => void;
  onBreakthroughAttempt: () => Promise<BreakthroughResult>;
  onTechniqueChange: (techniqueId: string) => void;
  onOfflineProgressCalculate: () => OfflineProgressResult;
  theme: CultivationTheme;
  screenDimensions: ScreenDimensions;
}

// Realm progression display props
export interface RealmProgressDisplayProps {
  currentRealm: string;
  currentStage: number;
  progress: number;
  nextRealm?: string;
  showNextRealmPreview?: boolean;
  animated?: boolean;
  style?: object;
}

// Technique selector component props
export interface TechniqueSelectorProps {
  availableTechniques: string[];
  activeTechnique: string | null;
  onTechniqueSelect: (techniqueId: string) => void;
  disabled?: boolean;
  style?: object;
}

// Cultivation controls component props
export interface CultivationControlsProps {
  isCultivating: boolean;
  canStartCultivation: boolean;
  canAttemptBreakthrough: boolean;
  onStart: () => void;
  onStop: () => void;
  onBreakthrough: () => void;
  style?: object;
}

// Resource display component props
export interface ResourceDisplayProps {
  currentQi: number;
  maxQi: number;
  spiritStones: number;
  regenRate: number;
  showQiRegen?: boolean;
  compact?: boolean;
  style?: object;
}

// Offline progress modal props
export interface OfflineProgressModalProps {
  visible: boolean;
  progress: OfflineProgressResult;
  onContinue: () => void;
  onClose: () => void;
  animated?: boolean;
}

// Toast notification props for cultivation events
export interface CultivationToastProps {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number;
  onDismiss?: () => void;
  animated?: boolean;
}

// Settings panel props
export interface CultivationSettingsProps {
  visible: boolean;
  settings: {
    autoBreakthrough: boolean;
    backgroundProcessing: boolean;
    animationsEnabled: boolean;
    soundEnabled: boolean;
    notificationsEnabled: boolean;
  };
  onSettingChange: (key: string, value: boolean) => void;
  onClose: () => void;
}

// Hook return types for custom hooks
export interface UseCultivationAnimationReturn {
  animationState: AnimationState;
  startProgressAnimation: (from: number, to: number, duration?: number) => void;
  startBreakthroughAnimation: (intensity?: string) => void;
  startEnergyAnimation: (type: 'regen' | 'consume' | 'pulse') => void;
  stopAllAnimations: () => void;
}

export interface UseRealtimeUpdatesReturn {
  isConnected: boolean;
  lastUpdate: number;
  connectionStats: {
    latency: number;
    reconnectCount: number;
  };
}

export interface UseResponsiveDesignReturn {
  dimensions: ScreenDimensions;
  getResponsiveValue: <T>(values: { small: T; medium: T; large: T }) => T;
  isTablet: boolean;
  isLandscape: boolean;
}

// Layout configuration for responsive design
export interface CultivationLayoutConfig {
  components: {
    progressBar: {
      height: number;
      marginVertical: number;
    };
    energyIndicator: {
      size: number;
      position: 'top' | 'bottom' | 'side';
    };
    controls: {
      buttonSize: number;
      spacing: number;
      arrangement: 'horizontal' | 'vertical' | 'grid';
    };
    stats: {
      fontSize: number;
      showDetailed: boolean;
    };
  };
  animations: {
    particleCount: number;
    enableAdvancedEffects: boolean;
    targetFPS: number;
  };
}

// Component state for complex components
export interface CultivationScreenState {
  showOfflineProgress: boolean;
  showSettings: boolean;
  showTechniqueSelector: boolean;
  activeToasts: CultivationToastProps[];
  animationState: AnimationState;
  layoutConfig: CultivationLayoutConfig;
}

// Constants for animation performance
export const ANIMATION_CONSTANTS = {
  TARGET_FPS: 60,
  FRAME_TIME: 1000 / 60, // ~16.67ms
  MAX_PARTICLES: 100,
  PARTICLE_POOL_SIZE: 200,

  // Animation durations (ms)
  PROGRESS_ANIMATION_DURATION: 1000,
  BREAKTHROUGH_ANIMATION_DURATION: 3000,
  ENERGY_PULSE_DURATION: 500,

  // Easing functions
  EASING: {
    LINEAR: 'linear',
    EASE_OUT: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    EASE_IN_OUT: 'cubic-bezier(0.42, 0, 0.58, 1)',
    BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Color opacity values for animations
  OPACITY: {
    HIDDEN: 0,
    VISIBLE: 1,
    SUBTLE: 0.7,
    FADED: 0.3,
  },
} as const;