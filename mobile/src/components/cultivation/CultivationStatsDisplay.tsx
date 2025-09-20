/**
 * Cultivation Stats Display Component
 * Shows qi and body cultivation levels with experience progress
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CultivationStatsDisplayProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const CultivationStatsDisplay: React.FC<CultivationStatsDisplayProps> = ({
  stats,
  animated = true,
  showExperience = true,
  showNextLevel = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Qi Level:</Text>
        <Text style={[styles.statValue, { color: cultivationTheme.colors.qi }]}>
          {stats.qi.level}
        </Text>
        {showExperience && (
          <Text style={styles.expText}>
            ({stats.qi.experience}/{stats.qi.experienceToNext})
          </Text>
        )}
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Body Level:</Text>
        <Text style={[styles.statValue, { color: cultivationTheme.colors.body }]}>
          {stats.body.level}
        </Text>
        {showExperience && (
          <Text style={styles.expText}>
            ({stats.body.experience}/{stats.body.experienceToNext})
          </Text>
        )}
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
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: cultivationTheme.spacing.sm,
  },
  statLabel: {
    fontSize: cultivationTheme.typography.medium,
    color: cultivationTheme.colors.text,
    flex: 1,
  },
  statValue: {
    fontSize: cultivationTheme.typography.large,
    fontWeight: 'bold',
    marginRight: cultivationTheme.spacing.sm,
  },
  expText: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.textSecondary,
  },
});