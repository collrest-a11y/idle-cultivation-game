/**
 * Cultivation Controls Component
 * Start/stop cultivation and breakthrough controls
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CultivationControlsProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const CultivationControls: React.FC<CultivationControlsProps> = ({
  isCultivating,
  canStartCultivation,
  canAttemptBreakthrough,
  onStart,
  onStop,
  onBreakthrough,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          styles.cultivationButton,
          {
            backgroundColor: isCultivating
              ? cultivationTheme.colors.error
              : cultivationTheme.colors.primary,
          },
        ]}
        onPress={isCultivating ? onStop : onStart}
        disabled={!canStartCultivation && !isCultivating}
      >
        <Text style={styles.buttonText}>
          {isCultivating ? 'Stop Cultivation' : 'Start Cultivation'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.breakthroughButton,
          {
            backgroundColor: canAttemptBreakthrough
              ? cultivationTheme.colors.breakthrough
              : cultivationTheme.colors.surface,
            opacity: canAttemptBreakthrough ? 1 : 0.5,
          },
        ]}
        onPress={onBreakthrough}
        disabled={!canAttemptBreakthrough}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: canAttemptBreakthrough
                ? cultivationTheme.colors.text
                : cultivationTheme.colors.textSecondary,
            },
          ]}
        >
          Attempt Breakthrough
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: cultivationTheme.spacing.md,
  },
  button: {
    paddingVertical: cultivationTheme.spacing.md,
    paddingHorizontal: cultivationTheme.spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cultivationButton: {
    minHeight: 50,
  },
  breakthroughButton: {
    minHeight: 50,
  },
  buttonText: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: '600',
    color: cultivationTheme.colors.text,
  },
});