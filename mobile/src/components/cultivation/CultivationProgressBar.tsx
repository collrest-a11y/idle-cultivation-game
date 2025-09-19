/**
 * Cultivation Progress Bar Component
 * Features smooth 60fps animations and visual effects
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { ProgressBarProps } from '../../types/ui';
import { cultivationTheme, GRADIENTS } from '../../styles/cultivationTheme';
import { ANIMATION_CONSTANTS } from '../../types/ui';

export const CultivationProgressBar: React.FC<ProgressBarProps> = ({
  current,
  maximum,
  animated = true,
  showLabel = true,
  labelText,
  color = cultivationTheme.colors.qi,
  backgroundColor = cultivationTheme.colors.surface,
  height = 12,
  borderRadius = 6,
  style,
  glowEffect = false,
  pulseOnChange = true,
}) => {
  const progressValue = Math.max(0, Math.min(1, current / maximum));
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const [previousProgress, setPreviousProgress] = useState(progressValue);

  // Animate progress bar width changes
  useEffect(() => {
    if (animated) {
      Animated.timing(animatedWidth, {
        toValue: progressValue,
        duration: ANIMATION_CONSTANTS.PROGRESS_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Pulse effect when progress changes
      if (pulseOnChange && progressValue !== previousProgress) {
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();

        setPreviousProgress(progressValue);
      }
    } else {
      animatedWidth.setValue(progressValue);
    }
  }, [progressValue, animated, pulseOnChange, animatedWidth, pulseScale, previousProgress]);

  // Glow effect animation
  useEffect(() => {
    if (glowEffect) {
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 1000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 1000,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation.start();

      return () => glowAnimation.stop();
    } else {
      glowOpacity.setValue(0);
    }
  }, [glowEffect, glowOpacity]);

  // Determine gradient colors based on progress type
  const getGradientColors = () => {
    if (color === cultivationTheme.colors.qi) {
      return GRADIENTS.qi.colors;
    } else if (color === cultivationTheme.colors.body) {
      return GRADIENTS.body.colors;
    } else if (color === cultivationTheme.colors.energy) {
      return GRADIENTS.energy.colors;
    }
    return [color, color];
  };

  const gradientColors = getGradientColors();
  const percentage = Math.round(progressValue * 100);

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{ scale: pulseScale }],
        },
      ]}
    >
      {/* Label */}
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>
            {labelText || 'Progress'}
          </Text>
          <Text style={styles.percentageText}>
            {percentage}%
          </Text>
        </View>
      )}

      {/* Progress Bar Container */}
      <View style={styles.progressContainer}>
        {/* Background */}
        <View
          style={[
            styles.progressBackground,
            {
              height,
              borderRadius,
              backgroundColor,
            },
          ]}
        />

        {/* Glow Effect */}
        {glowEffect && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                height: height + 4,
                borderRadius: borderRadius + 2,
                opacity: glowOpacity,
                shadowColor: color,
              },
            ]}
          />
        )}

        {/* Progress Fill */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              height,
              borderRadius,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={GRADIENTS.qi.start}
            end={GRADIENTS.qi.end}
            style={[
              styles.gradient,
              {
                borderRadius,
              },
            ]}
          />

          {/* Shimmer Effect */}
          {animated && progressValue > 0 && (
            <ShimmerEffect
              height={height}
              borderRadius={borderRadius}
              color={color}
            />
          )}
        </Animated.View>

        {/* Progress Text Overlay */}
        {showLabel && (
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressText}>
              {current.toFixed(0)} / {maximum.toFixed(0)}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// Shimmer effect component for enhanced visual appeal
const ShimmerEffect: React.FC<{
  height: number;
  borderRadius: number;
  color: string;
}> = ({ height, borderRadius, color }) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  return (
    <Animated.View
      style={[
        styles.shimmer,
        {
          height,
          borderRadius,
          backgroundColor: color,
          opacity: shimmerValue.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.3, 0.7, 0.3],
          }),
          transform: [
            {
              translateX: shimmerValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 300],
              }),
            },
          ],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: cultivationTheme.spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: cultivationTheme.spacing.xs,
  },
  labelText: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: '600',
    color: cultivationTheme.colors.text,
  },
  percentageText: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.textSecondary,
    fontWeight: '500',
  },
  progressContainer: {
    position: 'relative',
  },
  progressBackground: {
    overflow: 'hidden',
  },
  glowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    width: 50,
    opacity: 0.5,
  },
  progressTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: cultivationTheme.typography.tiny,
    color: cultivationTheme.colors.text,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});