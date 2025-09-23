/**
 * Responsive Design Hook
 * Provides responsive values and screen dimension utilities
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { UseResponsiveDesignReturn, ScreenDimensions } from '../types/ui';
import { getScreenSize, getLayoutConfig, getResponsiveValue } from '../constants/responsive';

export const useResponsiveDesign = (): UseResponsiveDesignReturn => {
  const [dimensions, setDimensions] = useState<ScreenDimensions>(() => {
    const { width, height } = Dimensions.get('window');
    const { width: screenWidth } = Dimensions.get('screen');

    return {
      width,
      height,
      isTablet: width >= 768,
      isLandscape: width > height,
      scale: screenWidth / width,
    };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        isTablet: window.width >= 768,
        isLandscape: window.width > window.height,
        scale: screen.width / window.width,
      });
    });

    return () => subscription?.remove();
  }, []);

  const getResponsiveValueWithDimensions = <T>(values: {
    small: T;
    medium: T;
    large: T;
  }): T => {
    if (dimensions.width < 375) return values.small;
    if (dimensions.width < 768) return values.medium;
    return values.large;
  };

  return {
    dimensions,
    getResponsiveValue: getResponsiveValueWithDimensions,
    isTablet: dimensions.isTablet,
    isLandscape: dimensions.isLandscape,
  };
};