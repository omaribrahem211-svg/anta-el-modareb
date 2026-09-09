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

  // Safely defer banner request until after game startup and WebView have completely settled,
  // and strictly hide banners during live matches
  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) return;

    if (isMatchActive) {
      // Strictly do not show any banner during a match
      AdManager.hideBanner().catch((err) => {
        console.warn('[BannerAdContainer] Hide banner during match notice:', err);
      });
      return;
    }

    const timer = setTimeout(() => {
      // Bottom Native AdMob Banner
      AdManager.ensureBannerActive().catch((err) => {
        console.warn('[BannerAdContainer] Bottom banner notice:', err);
      });
      // Top Native AdMob Banner
      AdManager.ensureTopBannerActive().catch((err) => {
        console.warn('[BannerAdContainer] Top banner notice:', err);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [isPremium, isMatchActive]);

  return null;
};
