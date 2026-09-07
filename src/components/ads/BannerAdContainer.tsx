import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';
import { Sparkles } from 'lucide-react';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

export const BannerAdContainer: React.FC<BannerAdContainerProps> = () => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsubscribe();
  }, []);

  // Banner remains persistently visible at the bottom of the screen ALWAYS,
  // including during live matches (never hidden or removed).
  const shouldShow = !isPremium;

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(() => {
      if (shouldShow) {
        AdManager.showBanner();
      } else {
        AdManager.hideBanner();
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [shouldShow]);

  // On Native Android, Google AdMob displays the real native Banner view.
  // No fake or mock placeholder divs are rendered to prevent "إعلان AdMob" without real ad.
  return null;
};
