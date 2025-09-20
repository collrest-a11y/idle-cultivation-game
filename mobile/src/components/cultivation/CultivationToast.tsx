/**
 * Cultivation Toast Component
 * Shows temporary notifications for cultivation events
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { CultivationToastProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const CultivationToast: React.FC<CultivationToastProps> = ({
  type,
  title,
  message,
  duration = 3000,
  onDismiss,
  animated = true,
  style,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (animated) {
      // Slide in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [animated, duration, fadeAnim, slideAnim]);

  const handleDismiss = () => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss?.();
      });
    } else {
      onDismiss?.();
    }
  };

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: cultivationTheme.colors.success + '90',
          borderColor: cultivationTheme.colors.success,
        };
      case 'warning':
        return {
          backgroundColor: cultivationTheme.colors.warning + '90',
          borderColor: cultivationTheme.colors.warning,
        };
      case 'error':
        return {
          backgroundColor: cultivationTheme.colors.error + '90',
          borderColor: cultivationTheme.colors.error,
        };
      default: // info
        return {
          backgroundColor: cultivationTheme.colors.primary + '90',
          borderColor: cultivationTheme.colors.primary,
        };
    }
  };

  const colors = getToastColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
        },
        style,
      ]}
    >
      <TouchableOpacity onPress={handleDismiss} style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: cultivationTheme.spacing.md,
  },
  title: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: 'bold',
    color: cultivationTheme.colors.text,
    marginBottom: cultivationTheme.spacing.xs,
  },
  message: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.text,
  },
});