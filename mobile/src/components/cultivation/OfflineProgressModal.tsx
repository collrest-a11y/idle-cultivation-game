/**
 * Offline Progress Modal Component
 * Shows progress made while app was offline
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { OfflineProgressModalProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const OfflineProgressModal: React.FC<OfflineProgressModalProps> = ({
  visible,
  progress,
  onContinue,
  onClose,
  animated = true,
}) => {
  const timeOfflineHours = Math.floor(progress.timeOffline / (1000 * 60 * 60));
  const timeOfflineMinutes = Math.floor((progress.timeOffline % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animated ? 'fade' : 'none'}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            You were offline for {timeOfflineHours}h {timeOfflineMinutes}m
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Qi Gained:</Text>
              <Text style={[styles.progressValue, { color: cultivationTheme.colors.qi }]}>
                +{progress.qiGained.toFixed(0)}
              </Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Body Gained:</Text>
              <Text style={[styles.progressValue, { color: cultivationTheme.colors.body }]}>
                +{progress.bodyGained.toFixed(0)}
              </Text>
            </View>
            {progress.breakthroughsAchieved > 0 && (
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Breakthroughs:</Text>
                <Text style={[styles.progressValue, { color: cultivationTheme.colors.breakthrough }]}>
                  {progress.breakthroughsAchieved}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.buttonText}>Continue Cultivation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: cultivationTheme.colors.surface,
    padding: cultivationTheme.spacing.xl,
    borderRadius: 16,
    marginHorizontal: cultivationTheme.spacing.lg,
    maxWidth: 400,
  },
  title: {
    fontSize: cultivationTheme.typography.title,
    fontWeight: 'bold',
    color: cultivationTheme.colors.text,
    textAlign: 'center',
    marginBottom: cultivationTheme.spacing.sm,
  },
  subtitle: {
    fontSize: cultivationTheme.typography.medium,
    color: cultivationTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: cultivationTheme.spacing.lg,
  },
  progressContainer: {
    marginBottom: cultivationTheme.spacing.lg,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: cultivationTheme.spacing.sm,
  },
  progressLabel: {
    fontSize: cultivationTheme.typography.medium,
    color: cultivationTheme.colors.text,
  },
  progressValue: {
    fontSize: cultivationTheme.typography.large,
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: cultivationTheme.colors.primary,
    paddingVertical: cultivationTheme.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: '600',
    color: cultivationTheme.colors.text,
  },
});