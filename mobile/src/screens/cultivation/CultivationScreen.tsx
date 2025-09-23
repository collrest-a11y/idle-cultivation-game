/**
 * Cultivation Screen - Main Interface for Cultivation System
 * Features real-time progress, animations, and responsive design
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';

import { CultivationScreenProps, CultivationScreenState, AnimationState } from '../../types/ui';
import { cultivationTheme } from '../../styles/cultivationTheme';
import { useResponsiveDesign } from '../../hooks/useResponsiveDesign';
import { getLayoutConfig } from '../../constants/responsive';

// Import component placeholders - these will be implemented next
import { CultivationProgressBar } from '../../components/cultivation/CultivationProgressBar';
import { EnergyIndicator } from '../../components/cultivation/EnergyIndicator';
import { CultivationControls } from '../../components/cultivation/CultivationControls';
import { CultivationStatsDisplay } from '../../components/cultivation/CultivationStatsDisplay';
import { RealmProgressDisplay } from '../../components/cultivation/RealmProgressDisplay';
import { TechniqueSelector } from '../../components/cultivation/TechniqueSelector';
import { ResourceDisplay } from '../../components/cultivation/ResourceDisplay';
import { OfflineProgressModal } from '../../components/cultivation/OfflineProgressModal';
import { CultivationToast } from '../../components/cultivation/CultivationToast';
import { BreakthroughAnimation } from '../../animations/cultivation/BreakthroughAnimation';

export const CultivationScreen: React.FC<CultivationScreenProps> = ({
  cultivationState,
  onStartCultivation,
  onStopCultivation,
  onBreakthroughAttempt,
  onTechniqueChange,
  onOfflineProgressCalculate,
  theme = cultivationTheme,
}) => {
  const { dimensions, isTablet, isLandscape } = useResponsiveDesign();
  const layoutConfig = getLayoutConfig();

  // Component state
  const [screenState, setScreenState] = useState<CultivationScreenState>({
    showOfflineProgress: false,
    showSettings: false,
    showTechniqueSelector: false,
    activeToasts: [],
    animationState: {
      progress: {
        isAnimating: false,
        fromValue: 0,
        toValue: 0,
        duration: 0,
      },
      breakthrough: {
        isPlaying: false,
        stage: 'preparation',
        intensity: 0,
        particleCount: layoutConfig.animations.particleCount,
      },
      energy: {
        isRegenerating: false,
        flowDirection: 'stable',
        pulseIntensity: 0,
        glowEffect: false,
      },
      qi: {
        particles: [],
        meridianFlow: false,
        density: 0.5,
        swirling: false,
      },
    },
    layoutConfig,
  });

  // Calculate derived values
  const currentRealm = useMemo(() => {
    // This would typically come from the cultivation store
    return 'Qi Condensation';
  }, [cultivationState]);

  const canBreakthrough = useMemo(() => {
    // Calculate if breakthrough is available based on current progress
    return cultivationState.breakthroughProgress >= 100;
  }, [cultivationState.breakthroughProgress]);

  const cultivationProgress = useMemo(() => {
    const qiProgress = cultivationState.stats.qi.experience / cultivationState.stats.qi.experienceToNext;
    const bodyProgress = cultivationState.stats.body.experience / cultivationState.stats.body.experienceToNext;
    return { qi: qiProgress, body: bodyProgress };
  }, [cultivationState.stats]);

  // Handle offline progress on component mount
  useEffect(() => {
    if (cultivationState.lastOfflineTime && !cultivationState.offlineProgressCalculated) {
      const offlineTime = Date.now() - cultivationState.lastOfflineTime;
      if (offlineTime > 60000) { // Show if offline for more than 1 minute
        const progress = onOfflineProgressCalculate();
        if (progress.timeOffline > 0) {
          setScreenState(prev => ({ ...prev, showOfflineProgress: true }));
        }
      }
    }
  }, [cultivationState.lastOfflineTime, cultivationState.offlineProgressCalculated, onOfflineProgressCalculate]);

  // Handle breakthrough attempt
  const handleBreakthroughAttempt = useCallback(async () => {
    if (!canBreakthrough) {
      showToast('warning', 'Cannot Breakthrough', 'Progress is not sufficient for breakthrough');
      return;
    }

    try {
      // Start breakthrough animation
      setScreenState(prev => ({
        ...prev,
        animationState: {
          ...prev.animationState,
          breakthrough: {
            ...prev.animationState.breakthrough,
            isPlaying: true,
            stage: 'preparation',
          },
        },
      }));

      const result = await onBreakthroughAttempt();

      if (result.success) {
        showToast('success', 'Breakthrough Successful!', `Advanced to ${result.newRealm || 'next stage'}`);

        // Update breakthrough animation to success
        setScreenState(prev => ({
          ...prev,
          animationState: {
            ...prev.animationState,
            breakthrough: {
              ...prev.animationState.breakthrough,
              stage: 'success',
            },
          },
        }));
      } else {
        showToast('error', 'Breakthrough Failed', 'Try again when better prepared');

        // Update breakthrough animation to failure
        setScreenState(prev => ({
          ...prev,
          animationState: {
            ...prev.animationState,
            breakthrough: {
              ...prev.animationState.breakthrough,
              stage: 'failure',
            },
          },
        }));
      }
    } catch (error) {
      showToast('error', 'Error', 'An error occurred during breakthrough attempt');
      console.error('Breakthrough error:', error);
    }
  }, [canBreakthrough, onBreakthroughAttempt]);

  // Handle cultivation start/stop
  const handleCultivationToggle = useCallback(() => {
    if (cultivationState.isCultivating) {
      onStopCultivation();
      showToast('info', 'Cultivation Stopped', 'Your progress has been saved');
    } else {
      onStartCultivation(cultivationState.activeTechnique || undefined);
      showToast('success', 'Cultivation Started', 'Focus your mind and gather qi');

      // Start energy animation
      setScreenState(prev => ({
        ...prev,
        animationState: {
          ...prev.animationState,
          energy: {
            ...prev.animationState.energy,
            isRegenerating: true,
            flowDirection: 'in',
            glowEffect: true,
          },
        },
      }));
    }
  }, [cultivationState.isCultivating, cultivationState.activeTechnique, onStartCultivation, onStopCultivation]);

  // Toast management
  const showToast = useCallback((type: 'success' | 'warning' | 'error' | 'info', title: string, message: string) => {
    const toast = {
      type,
      title,
      message,
      duration: 3000,
      onDismiss: () => {
        setScreenState(prev => ({
          ...prev,
          activeToasts: prev.activeToasts.filter(t => t !== toast),
        }));
      },
      animated: true,
    };

    setScreenState(prev => ({
      ...prev,
      activeToasts: [...prev.activeToasts, toast],
    }));
  }, []);

  // Handle breakthrough animation completion
  const handleBreakthroughComplete = useCallback(() => {
    setScreenState(prev => ({
      ...prev,
      animationState: {
        ...prev.animationState,
        breakthrough: {
          ...prev.animationState.breakthrough,
          isPlaying: false,
          stage: 'preparation',
        },
      },
    }));
  }, []);

  // Close offline progress modal
  const handleOfflineProgressClose = useCallback(() => {
    setScreenState(prev => ({ ...prev, showOfflineProgress: false }));
  }, []);

  // Get responsive styles
  const styles = useMemo(() => createStyles(theme, dimensions, isTablet, isLandscape), [theme, dimensions, isTablet, isLandscape]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

      {/* Breakthrough Animation Overlay */}
      {screenState.animationState.breakthrough.isPlaying && (
        <BreakthroughAnimation
          isPlaying={screenState.animationState.breakthrough.isPlaying}
          stage={screenState.animationState.breakthrough.stage}
          onComplete={handleBreakthroughComplete}
          intensity="medium"
          style={styles.breakthroughOverlay}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Cultivation</Text>
          <Text style={styles.realmTitle}>{currentRealm}</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Energy and Resources Section */}
          <View style={styles.resourceSection}>
            <EnergyIndicator
              currentEnergy={cultivationState.currentQi}
              maxEnergy={cultivationState.maxQi}
              regenRate={1.0} // This would come from cultivation state
              showRegeneration={screenState.animationState.energy.isRegenerating}
              animated={true}
              style={styles.energyIndicator}
            />

            <ResourceDisplay
              currentQi={cultivationState.currentQi}
              maxQi={cultivationState.maxQi}
              spiritStones={cultivationState.spiritStones}
              regenRate={1.0}
              showQiRegen={true}
              style={styles.resourceDisplay}
            />
          </View>

          {/* Cultivation Progress */}
          <View style={styles.progressSection}>
            <CultivationStatsDisplay
              stats={cultivationState.stats}
              animated={true}
              showExperience={true}
              showNextLevel={true}
              style={styles.statsDisplay}
            />

            <CultivationProgressBar
              current={cultivationProgress.qi}
              maximum={1}
              animated={true}
              showLabel={true}
              labelText="Qi Cultivation"
              color={theme.colors.qi}
              style={styles.progressBar}
            />

            <CultivationProgressBar
              current={cultivationProgress.body}
              maximum={1}
              animated={true}
              showLabel={true}
              labelText="Body Cultivation"
              color={theme.colors.body}
              style={styles.progressBar}
            />
          </View>

          {/* Realm Progress */}
          <RealmProgressDisplay
            currentRealm={currentRealm}
            currentStage={cultivationState.currentStage}
            progress={cultivationState.breakthroughProgress / 100}
            showNextRealmPreview={true}
            animated={true}
            style={styles.realmProgress}
          />

          {/* Technique Selection */}
          {screenState.showTechniqueSelector && (
            <TechniqueSelector
              availableTechniques={cultivationState.unlockedTechniques}
              activeTechnique={cultivationState.activeTechnique}
              onTechniqueSelect={(technique) => {
                onTechniqueChange(technique);
                setScreenState(prev => ({ ...prev, showTechniqueSelector: false }));
              }}
              style={styles.techniqueSelector}
            />
          )}

          {/* Cultivation Controls */}
          <CultivationControls
            isCultivating={cultivationState.isCultivating}
            canStartCultivation={!cultivationState.isCultivating}
            canAttemptBreakthrough={canBreakthrough}
            onStart={handleCultivationToggle}
            onStop={handleCultivationToggle}
            onBreakthrough={handleBreakthroughAttempt}
            style={styles.controls}
          />
        </View>
      </ScrollView>

      {/* Modals and Overlays */}
      <OfflineProgressModal
        visible={screenState.showOfflineProgress}
        progress={onOfflineProgressCalculate()}
        onContinue={handleOfflineProgressClose}
        onClose={handleOfflineProgressClose}
        animated={true}
      />

      {/* Toast Notifications */}
      {screenState.activeToasts.map((toast, index) => (
        <CultivationToast
          key={index}
          {...toast}
          style={[styles.toast, { top: 50 + (index * 80) }]}
        />
      ))}
    </SafeAreaView>
  );
};

const createStyles = (theme: any, dimensions: any, isTablet: boolean, isLandscape: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
    },
    screenTitle: {
      fontSize: theme.typography.title,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    realmTitle: {
      fontSize: theme.typography.medium,
      color: theme.colors.textSecondary,
    },
    mainContent: {
      flex: 1,
    },
    resourceSection: {
      flexDirection: isLandscape && isTablet ? 'row' : 'column',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    energyIndicator: {
      marginBottom: isLandscape && isTablet ? 0 : theme.spacing.md,
      marginRight: isLandscape && isTablet ? theme.spacing.md : 0,
    },
    resourceDisplay: {
      flex: isLandscape && isTablet ? 1 : undefined,
    },
    progressSection: {
      marginBottom: theme.spacing.lg,
    },
    statsDisplay: {
      marginBottom: theme.spacing.md,
    },
    progressBar: {
      marginBottom: theme.spacing.sm,
    },
    realmProgress: {
      marginBottom: theme.spacing.lg,
    },
    techniqueSelector: {
      marginBottom: theme.spacing.lg,
    },
    controls: {
      marginTop: theme.spacing.lg,
    },
    breakthroughOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    toast: {
      position: 'absolute',
      left: theme.spacing.md,
      right: theme.spacing.md,
      zIndex: 1001,
    },
  });