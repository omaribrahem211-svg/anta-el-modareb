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
      // Bottom Native AdMob Banner
      AdManager.ensureBannerActive().catch((err) => {
        console.warn('[BannerAdContainer] Deferred bottom banner notice:', err);
      });
      // Top Native AdMob Banner
      AdManager.ensureTopBannerActive().catch((err) => {
        console.warn('[BannerAdContainer] Deferred top banner notice:', err);
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [isPremium]);

  return null;
};
