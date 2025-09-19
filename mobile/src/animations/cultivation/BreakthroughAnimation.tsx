/**
 * Breakthrough Animation Component
 * High-performance particle system for breakthrough moments with 60fps targeting
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { BreakthroughAnimationProps, QiParticle } from '../../types/ui';
import { cultivationTheme, PARTICLE_EFFECTS } from '../../styles/cultivationTheme';
import { ANIMATION_CONSTANTS } from '../../types/ui';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const BreakthroughAnimation: React.FC<BreakthroughAnimationProps> = ({
  isPlaying,
  stage,
  onComplete,
  intensity = 'medium',
  style,
}) => {
  const fadeValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;

  const [particles, setParticles] = useState<QiParticle[]>([]);
  const particleAnimations = useRef<Map<string, Animated.Value[]>>(new Map());

  // Animation configuration based on intensity
  const getIntensityConfig = () => {
    switch (intensity) {
      case 'low':
        return {
          particleCount: 30,
          duration: 2000,
          explosionRadius: 100,
          colors: [cultivationTheme.colors.qi, cultivationTheme.colors.energy],
        };
      case 'high':
        return {
          particleCount: 80,
          duration: 4000,
          explosionRadius: 200,
          colors: [cultivationTheme.colors.breakthrough, cultivationTheme.colors.qi, cultivationTheme.colors.energy],
        };
      case 'extreme':
        return {
          particleCount: 120,
          duration: 5000,
          explosionRadius: 250,
          colors: [cultivationTheme.colors.breakthrough, '#FFD700', '#FF6B35', cultivationTheme.colors.qi],
        };
      default: // medium
        return {
          particleCount: 50,
          duration: 3000,
          explosionRadius: 150,
          colors: [cultivationTheme.colors.breakthrough, cultivationTheme.colors.qi],
        };
    }
  };

  const config = getIntensityConfig();

  // Create particle system
  const createParticles = () => {
    const newParticles: QiParticle[] = [];
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT / 2;

    for (let i = 0; i < config.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / config.particleCount + (Math.random() - 0.5) * 0.5;
      const velocity = 2 + Math.random() * 3;
      const particle: QiParticle = {
        id: `particle_${i}_${Date.now()}`,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        maxLife: 1,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        size: 4 + Math.random() * 6,
        opacity: 1,
      };
      newParticles.push(particle);
    }

    setParticles(newParticles);
    return newParticles;
  };

  // Animate particles
  const animateParticles = (particleList: QiParticle[]) => {
    particleList.forEach(particle => {
      const animations = [
        new Animated.Value(particle.x),
        new Animated.Value(particle.y),
        new Animated.Value(particle.size),
        new Animated.Value(particle.opacity),
      ];

      particleAnimations.current.set(particle.id, animations);

      const [xAnim, yAnim, sizeAnim, opacityAnim] = animations;

      // Calculate final position
      const finalX = particle.x + particle.vx * config.explosionRadius;
      const finalY = particle.y + particle.vy * config.explosionRadius;

      // Animate particle movement and fade
      Animated.parallel([
        // Position animation with physics-like deceleration
        Animated.timing(xAnim, {
          toValue: finalX,
          duration: config.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(yAnim, {
          toValue: finalY,
          duration: config.duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
        // Size animation - grow then shrink
        Animated.sequence([
          Animated.timing(sizeAnim, {
            toValue: particle.size * 1.5,
            duration: config.duration * 0.3,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(sizeAnim, {
            toValue: 0,
            duration: config.duration * 0.7,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        // Opacity fade
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: config.duration * 0.2,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: config.duration * 0.8,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  // Main breakthrough animation sequence
  useEffect(() => {
    if (isPlaying) {
      // Stage-specific animations
      switch (stage) {
        case 'preparation':
          // Fade in and build energy
          Animated.parallel([
            Animated.timing(fadeValue, {
              toValue: 0.8,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
              toValue: 0.5,
              duration: 500,
              easing: Easing.out(Easing.back(1.2)),
              useNativeDriver: true,
            }),
          ]).start();
          break;

        case 'breakthrough':
          // Explosion effect
          const particles = createParticles();
          animateParticles(particles);

          Animated.parallel([
            Animated.timing(scaleValue, {
              toValue: 2,
              duration: 200,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(fadeValue, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(rotationValue, {
              toValue: 1,
              duration: config.duration,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();

          // Auto-complete after duration
          setTimeout(() => {
            onComplete();
          }, config.duration);
          break;

        case 'success':
          // Success glow and fade
          Animated.sequence([
            Animated.timing(fadeValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(fadeValue, {
              toValue: 0,
              duration: 1000,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setParticles([]);
            onComplete();
          });
          break;

        case 'failure':
          // Failure animation - quick fade
          Animated.timing(fadeValue, {
            toValue: 0,
            duration: 500,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }).start(() => {
            setParticles([]);
            onComplete();
          });
          break;
      }
    } else {
      // Reset animation values
      fadeValue.setValue(0);
      scaleValue.setValue(0);
      rotationValue.setValue(0);
      setParticles([]);
      particleAnimations.current.clear();
    }
  }, [isPlaying, stage, fadeValue, scaleValue, rotationValue, onComplete, config]);

  if (!isPlaying) {
    return null;
  }

  const rotation = rotationValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeValue,
        },
        style,
      ]}
      pointerEvents="none"
    >
      {/* Background Overlay */}
      <View style={styles.overlay} />

      {/* Central Energy Core */}
      <Animated.View
        style={[
          styles.energyCore,
          {
            transform: [
              { scale: scaleValue },
              { rotate: rotation },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={config.colors}
          style={styles.coreGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Inner Rings */}
        {[0.8, 0.6, 0.4].map((scale, index) => (
          <Animated.View
            key={index}
            style={[
              styles.ring,
              {
                transform: [
                  {
                    scale: scaleValue.interpolate({
                      inputRange: [0, 1, 2],
                      outputRange: [0, scale, scale * 2],
                    }),
                  },
                  {
                    rotate: rotationValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${360 * (index + 1)}deg`],
                    }),
                  },
                ],
                borderColor: config.colors[index % config.colors.length],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Particle System */}
      {particles.map(particle => {
        const animations = particleAnimations.current.get(particle.id);
        if (!animations) return null;

        const [xAnim, yAnim, sizeAnim, opacityAnim] = animations;

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: xAnim,
                top: yAnim,
                width: sizeAnim,
                height: sizeAnim,
                opacity: opacityAnim,
                backgroundColor: particle.color,
                borderRadius: sizeAnim.interpolate({
                  inputRange: [0, 20],
                  outputRange: [0, 10],
                }),
              },
            ]}
          />
        );
      })}

      {/* Shockwave Effect */}
      {stage === 'breakthrough' && (
        <ShockwaveEffect
          isPlaying={isPlaying}
          duration={config.duration}
          maxRadius={config.explosionRadius * 2}
          color={config.colors[0]}
        />
      )}
    </Animated.View>
  );
};

// Shockwave effect component
const ShockwaveEffect: React.FC<{
  isPlaying: boolean;
  duration: number;
  maxRadius: number;
  color: string;
}> = ({ isPlaying, duration, maxRadius, color }) => {
  const waveScale = useRef(new Animated.Value(0)).current;
  const waveOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.parallel([
        Animated.timing(waveScale, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(waveOpacity, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isPlaying, waveScale, waveOpacity, duration]);

  return (
    <Animated.View
      style={[
        styles.shockwave,
        {
          width: maxRadius * 2,
          height: maxRadius * 2,
          borderRadius: maxRadius,
          borderColor: color,
          opacity: waveOpacity,
          transform: [{ scale: waveScale }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  energyCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coreGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  particle: {
    position: 'absolute',
  },
  shockwave: {
    position: 'absolute',
    borderWidth: 3,
  },
});