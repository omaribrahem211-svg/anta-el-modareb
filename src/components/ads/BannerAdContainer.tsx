import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';
import { Sparkles } from 'lucide-react';

interface BannerAdContainerProps {
  activeTab: ActiveTab;
  isMatchActive?: boolean;
}

export const BannerAdContainer: React.FC<BannerAdContainerProps> = ({ activeTab, isMatchActive = false }) => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsubscribe();
  }, []);

  // Determine if banner should be visible
  // Banner appears on ALL app pages smoothly.
  // Only paused when a live interactive match simulation is actively running on screen to prevent user distraction.
  const shouldShow = !isPremium && !isMatchActive;

  useEffect(() => {
    // Clear any previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Debounce the native AdMob call by 250ms during page navigation
    // This gives React and the WebView full CPU/GPU priority to render the new page first!
    debounceTimerRef.current = setTimeout(() => {
      if (shouldShow) {
        AdManager.showBanner();
      } else {
        AdManager.hideBanner();
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  // Banner lifecycle controller for native AdMob
  // Visual presentation is rendered at the top ("بانر فوق") natively, and in-content below Facebook in Web preview
  return null;
};
