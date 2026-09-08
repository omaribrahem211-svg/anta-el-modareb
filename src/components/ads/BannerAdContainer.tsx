import React, { useEffect, useState } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

export const BannerAdContainer: React.FC<BannerAdContainerProps> = ({ activeTab, isMatchActive }) => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());

  useEffect(() => {
    const unsubscribe = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsubscribe();
  }, []);

  // Safely defer banner request until after game startup and WebView have completely settled
  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) return;

    const timer = setTimeout(() => {
      AdManager.ensureBannerActive().catch((err) => {
        console.warn('[BannerAdContainer] Deferred banner notice:', err);
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [isPremium]);

  return null;
};
