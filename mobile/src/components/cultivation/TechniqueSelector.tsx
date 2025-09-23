/**
 * Technique Selector Component
 * Allows selection of cultivation techniques
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TechniqueSelectorProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const TechniqueSelector: React.FC<TechniqueSelectorProps> = ({
  availableTechniques,
  activeTechnique,
  onTechniqueSelect,
  disabled = false,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Select Cultivation Technique</Text>
      {availableTechniques.map((technique) => (
        <TouchableOpacity
          key={technique}
          style={[
            styles.techniqueItem,
            {
              backgroundColor: activeTechnique === technique
                ? cultivationTheme.colors.primary
                : cultivationTheme.colors.surface,
            },
          ]}
          onPress={() => onTechniqueSelect(technique)}
          disabled={disabled}
        >
          <Text style={styles.techniqueName}>{technique}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: cultivationTheme.colors.surface,
    padding: cultivationTheme.spacing.md,
    borderRadius: 8,
  },
  title: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: 'bold',
    color: cultivationTheme.colors.text,
    marginBottom: cultivationTheme.spacing.md,
  },
  techniqueItem: {
    padding: cultivationTheme.spacing.sm,
    borderRadius: 6,
    marginBottom: cultivationTheme.spacing.xs,
  },
  techniqueName: {
    fontSize: cultivationTheme.typography.medium,
    color: cultivationTheme.colors.text,
  },
});