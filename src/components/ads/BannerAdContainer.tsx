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

  // Ensure banner is loaded once on initial mount if enabled and not premium.
  useEffect(() => {
    if (ADMOB_CONFIG.ENABLE_BANNER && !isPremium) {
      AdManager.ensureBannerActive();
    }
  }, [isPremium]);

  return null;
};
