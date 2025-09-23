/**
 * Energy Indicator Component
 * Displays current energy with regeneration animations and visual effects
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

import { EnergyIndicatorProps } from '../../types/ui';
import { cultivationTheme, GRADIENTS, PARTICLE_EFFECTS } from '../../styles/cultivationTheme';

export const EnergyIndicator: React.FC<EnergyIndicatorProps> = ({
  currentEnergy,
  maxEnergy,
  regenRate,
  showRegeneration = true,
  compact = false,
  style,
  animated = true,
}) => {
  const energyPercentage = Math.max(0, Math.min(1, currentEnergy / maxEnergy));

  // Animation values
  const energyScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.5)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef<Animated.Value[]>([]);

  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    opacity: Animated.Value;
    scale: Animated.Value;
  }>>([]);

  // Energy level color mapping
  const getEnergyColor = () => {
    if (energyPercentage > 0.7) return cultivationTheme.colors.energy;
    if (energyPercentage > 0.3) return cultivationTheme.colors.warning;
    return cultivationTheme.colors.error;
  };

  // Pulse animation for energy flow
  useEffect(() => {
    if (showRegeneration && animated) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.sine),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [showRegeneration, animated, pulseOpacity]);

  // Rotation animation for energy core
  useEffect(() => {
    if (animated) {
      const rotationAnimation = Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotationAnimation.start();

      return () => rotationAnimation.stop();
    }
  }, [animated, rotateValue]);

  // Scale animation when energy changes
  useEffect(() => {
    if (animated) {
      Animated.sequence([
        Animated.timing(energyScale, {
          toValue: 1.1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(energyScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentEnergy, animated, energyScale]);

  // Particle system for energy flow
  useEffect(() => {
    if (showRegeneration && animated) {
      const createParticle = () => {
        const particleId = Date.now() + Math.random();
        const opacity = new Animated.Value(0);
        const scale = new Animated.Value(0.5);

        const particle = {
          id: particleId,
          x: Math.random() * 100,
          y: Math.random() * 100,
          opacity,
          scale,
        };

        setParticles(prev => [...prev, particle]);

        // Animate particle lifecycle
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setParticles(prev => prev.filter(p => p.id !== particleId));
        });
      };

      const interval = setInterval(createParticle, 300);
      return () => clearInterval(interval);
    }
  }, [showRegeneration, animated]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const energyColor = getEnergyColor();
  const size = compact ? 60 : 80;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Outer Pulse Ring */}
      {showRegeneration && (
        <Animated.View
          style={[
            styles.pulseRing,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              opacity: pulseOpacity,
              borderColor: energyColor,
            },
          ]}
        />
      )}

      {/* Energy Core */}
      <Animated.View
        style={[
          styles.energyCore,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [
              { scale: energyScale },
              { rotate: rotation },
            ],
          },
        ]}
      >
        {/* Background Gradient */}
        <LinearGradient
          colors={[
            energyColor + '40',
            energyColor + '80',
            energyColor,
          ]}
          style={[
            styles.gradient,
            {
              borderRadius: size / 2,
            },
          ]}
        />

        {/* Energy Fill */}
        <View
          style={[
            styles.energyFill,
            {
              height: `${energyPercentage * 100}%`,
              backgroundColor: energyColor,
              borderRadius: size / 2,
            },
          ]}
        />

        {/* Inner Glow */}
        <View
          style={[
            styles.innerGlow,
            {
              borderRadius: size / 2,
              shadowColor: energyColor,
            },
          ]}
        />
      </Animated.View>

      {/* Energy Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.energyText, { fontSize: compact ? 10 : 12 }]}>
          {Math.floor(currentEnergy)}
        </Text>
        <Text style={[styles.maxEnergyText, { fontSize: compact ? 8 : 10 }]}>
          / {Math.floor(maxEnergy)}
        </Text>
      </View>

      {/* Regeneration Rate */}
      {showRegeneration && !compact && (
        <View style={styles.regenContainer}>
          <Text style={styles.regenText}>
            +{regenRate.toFixed(1)}/s
          </Text>
        </View>
      )}

      {/* Particle Effects */}
      {particles.map(particle => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: particle.opacity,
              transform: [{ scale: particle.scale }],
              backgroundColor: energyColor,
            },
          ]}
        />
      ))}

      {/* Energy Level Indicator */}
      <View style={styles.levelIndicators}>
        {[0.25, 0.5, 0.75].map((threshold, index) => (
          <View
            key={index}
            style={[
              styles.levelMark,
              {
                backgroundColor: energyPercentage >= threshold ? energyColor : 'transparent',
                borderColor: energyColor,
                bottom: `${threshold * 100}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    opacity: 0.5,
  },
  energyCore: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: cultivationTheme.colors.surface,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  energyFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  innerGlow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyText: {
    color: cultivationTheme.colors.text,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  maxEnergyText: {
    color: cultivationTheme.colors.textSecondary,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  regenContainer: {
    position: 'absolute',
    bottom: -20,
    alignItems: 'center',
  },
  regenText: {
    fontSize: 10,
    color: cultivationTheme.colors.energy,
    fontWeight: '600',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  levelIndicators: {
    position: 'absolute',
    right: -10,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  levelMark: {
    width: 6,
    height: 2,
    borderRadius: 1,
    borderWidth: 1,
  },
});