/**
 * Resource Display Component
 * Shows qi, spirit stones, and other cultivation resources
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ResourceDisplayProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const ResourceDisplay: React.FC<ResourceDisplayProps> = ({
  currentQi,
  maxQi,
  spiritStones,
  regenRate,
  showQiRegen = true,
  compact = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.resourceRow}>
        <Text style={styles.resourceLabel}>Qi:</Text>
        <Text style={[styles.resourceValue, { color: cultivationTheme.colors.qi }]}>
          {Math.floor(currentQi)} / {Math.floor(maxQi)}
        </Text>
        {showQiRegen && (
          <Text style={styles.regenRate}>+{regenRate.toFixed(1)}/s</Text>
        )}
      </View>
      <View style={styles.resourceRow}>
        <Text style={styles.resourceLabel}>Spirit Stones:</Text>
        <Text style={[styles.resourceValue, { color: cultivationTheme.colors.breakthrough }]}>
          {spiritStones.toLocaleString()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: cultivationTheme.colors.surface,
    padding: cultivationTheme.spacing.md,
    borderRadius: 8,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: cultivationTheme.spacing.sm,
  },
  resourceLabel: {
    fontSize: cultivationTheme.typography.medium,
    color: cultivationTheme.colors.text,
    flex: 1,
  },
  resourceValue: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: 'bold',
    marginRight: cultivationTheme.spacing.sm,
  },
  regenRate: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.energy,
  },
});