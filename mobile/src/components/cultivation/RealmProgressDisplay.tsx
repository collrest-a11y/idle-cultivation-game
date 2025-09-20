/**
 * Realm Progress Display Component
 * Shows current realm, stage progress, and next realm preview
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
  Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { RealmProgressDisplayProps } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';

export const RealmProgressDisplay: React.FC<RealmProgressDisplayProps> = ({
  currentRealm,
  currentStage,
  progress,
  nextRealm,
  showNextRealmPreview = true,
  animated = true,
  style,
}) => {
  const progressValue = Math.max(0, Math.min(1, progress));
  const progressWidth = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;
  const stageScale = useRef(new Animated.Value(1)).current;

  // Get realm-specific colors
  const getRealmColor = (realm: string) => {
    const lowerRealm = realm.toLowerCase();
    if (lowerRealm.includes('mortal') || lowerRealm.includes('condensation')) {
      return cultivationTheme.colors.realm.mortal;
    } else if (lowerRealm.includes('foundation') || lowerRealm.includes('core')) {
      return cultivationTheme.colors.realm.cultivator;
    } else if (lowerRealm.includes('nascent') || lowerRealm.includes('soul')) {
      return cultivationTheme.colors.realm.immortal;
    }
    return cultivationTheme.colors.primary;
  };

  const currentRealmColor = getRealmColor(currentRealm);
  const nextRealmColor = nextRealm ? getRealmColor(nextRealm) : currentRealmColor;

  // Animate progress changes
  useEffect(() => {
    if (animated) {
      Animated.timing(progressWidth, {
        toValue: progressValue,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Pulse effect when near breakthrough
      if (progressValue > 0.8) {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(glowOpacity, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.sine),
              useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
              toValue: 0.3,
              duration: 600,
              easing: Easing.inOut(Easing.sine),
              useNativeDriver: true,
            }),
          ])
        );
        pulseAnimation.start();

        return () => pulseAnimation.stop();
      }
    } else {
      progressWidth.setValue(progressValue);
    }
  }, [progressValue, animated, progressWidth, glowOpacity]);

  // Stage change animation
  useEffect(() => {
    if (animated) {
      Animated.sequence([
        Animated.timing(stageScale, {
          toValue: 1.1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stageScale, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentStage, animated, stageScale]);

  // Generate stage indicators
  const renderStageIndicators = () => {
    const totalStages = 9; // Typical for most realms
    const indicators = [];

    for (let i = 1; i <= totalStages; i++) {
      const isComplete = i < currentStage;
      const isCurrent = i === currentStage;
      const isNext = i === currentStage + 1;

      indicators.push(
        <View
          key={i}
          style={[
            styles.stageIndicator,
            {
              backgroundColor: isComplete
                ? currentRealmColor
                : isCurrent
                ? currentRealmColor + '80'
                : 'transparent',
              borderColor: isCurrent || isNext ? currentRealmColor : cultivationTheme.colors.surface,
              borderWidth: isCurrent ? 2 : 1,
            },
          ]}
        >
          {isCurrent && (
            <Animated.View
              style={[
                styles.currentStageGlow,
                {
                  backgroundColor: currentRealmColor,
                  opacity: glowOpacity,
                  transform: [{ scale: stageScale }],
                },
              ]}
            />
          )}
          <Text
            style={[
              styles.stageNumber,
              {
                color: isComplete || isCurrent ? cultivationTheme.colors.text : cultivationTheme.colors.textSecondary,
                fontWeight: isCurrent ? 'bold' : 'normal',
              },
            ]}
          >
            {i}
          </Text>
        </View>
      );
    }

    return indicators;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Realm Header */}
      <View style={styles.realmHeader}>
        <View style={styles.realmTitleContainer}>
          <Text style={styles.realmTitle}>{currentRealm}</Text>
          <Text style={[styles.stageText, { color: currentRealmColor }]}>
            Stage {currentStage}
          </Text>
        </View>

        {/* Progress Percentage */}
        <View style={styles.progressInfo}>
          <Text style={styles.progressPercentage}>
            {Math.round(progressValue * 100)}%
          </Text>
          <Text style={styles.progressLabel}>to breakthrough</Text>
        </View>
      </View>

      {/* Stage Indicators */}
      <View style={styles.stageContainer}>
        <Text style={styles.stageLabel}>Stages</Text>
        <View style={styles.stageIndicators}>
          {renderStageIndicators()}
        </View>
      </View>

      {/* Breakthrough Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Text style={styles.progressBarLabel}>Breakthrough Progress</Text>
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
                backgroundColor: currentRealmColor,
              },
            ]}
          >
            <LinearGradient
              colors={[currentRealmColor + '80', currentRealmColor, currentRealmColor + 'CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressGradient}
            />
          </Animated.View>

          {/* Breakthrough Threshold Marker */}
          <View
            style={[
              styles.thresholdMarker,
              {
                borderColor: currentRealmColor,
                right: '0%', // At 100%
              },
            ]}
          />
        </View>
      </View>

      {/* Next Realm Preview */}
      {showNextRealmPreview && nextRealm && (
        <View style={styles.nextRealmContainer}>
          <Text style={styles.nextRealmLabel}>Next Realm</Text>
          <View style={styles.nextRealmInfo}>
            <Text style={[styles.nextRealmName, { color: nextRealmColor }]}>
              {nextRealm}
            </Text>
            <View style={styles.realmBenefits}>
              <Text style={styles.benefitText}>• Enhanced Qi Capacity</Text>
              <Text style={styles.benefitText}>• Faster Cultivation Speed</Text>
              <Text style={styles.benefitText}>• New Abilities Unlocked</Text>
            </View>
          </View>
        </View>
      )}

      {/* Breakthrough Ready Indicator */}
      {progressValue >= 1 && (
        <Animated.View
          style={[
            styles.breakthroughReady,
            {
              backgroundColor: currentRealmColor + '20',
              borderColor: currentRealmColor,
              opacity: glowOpacity,
            },
          ]}
        >
          <Text style={[styles.breakthroughText, { color: currentRealmColor }]}>
            ⚡ Breakthrough Available ⚡
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: cultivationTheme.colors.surface,
    borderRadius: 12,
    padding: cultivationTheme.spacing.md,
    marginVertical: cultivationTheme.spacing.sm,
  },
  realmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: cultivationTheme.spacing.md,
  },
  realmTitleContainer: {
    flex: 1,
  },
  realmTitle: {
    fontSize: cultivationTheme.typography.large,
    fontWeight: 'bold',
    color: cultivationTheme.colors.text,
    marginBottom: cultivationTheme.spacing.xs,
  },
  stageText: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: '600',
  },
  progressInfo: {
    alignItems: 'flex-end',
  },
  progressPercentage: {
    fontSize: cultivationTheme.typography.large,
    fontWeight: 'bold',
    color: cultivationTheme.colors.text,
  },
  progressLabel: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.textSecondary,
  },
  stageContainer: {
    marginBottom: cultivationTheme.spacing.md,
  },
  stageLabel: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.textSecondary,
    marginBottom: cultivationTheme.spacing.xs,
  },
  stageIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  stageIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    position: 'relative',
  },
  currentStageGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  stageNumber: {
    fontSize: cultivationTheme.typography.small,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginBottom: cultivationTheme.spacing.md,
  },
  progressBarLabel: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.textSecondary,
    marginBottom: cultivationTheme.spacing.xs,
  },
  progressBarTrack: {
    height: 16,
    backgroundColor: cultivationTheme.colors.background,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  thresholdMarker: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 2,
    borderRightWidth: 2,
  },
  nextRealmContainer: {
    marginTop: cultivationTheme.spacing.sm,
    padding: cultivationTheme.spacing.sm,
    backgroundColor: cultivationTheme.colors.background,
    borderRadius: 8,
  },
  nextRealmLabel: {
    fontSize: cultivationTheme.typography.small,
    color: cultivationTheme.colors.textSecondary,
    marginBottom: cultivationTheme.spacing.xs,
  },
  nextRealmInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nextRealmName: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: '600',
    flex: 1,
  },
  realmBenefits: {
    flex: 1,
    marginLeft: cultivationTheme.spacing.sm,
  },
  benefitText: {
    fontSize: cultivationTheme.typography.tiny,
    color: cultivationTheme.colors.textSecondary,
    marginBottom: 2,
  },
  breakthroughReady: {
    marginTop: cultivationTheme.spacing.md,
    padding: cultivationTheme.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  breakthroughText: {
    fontSize: cultivationTheme.typography.medium,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});