import React, { useEffect, useState } from 'react';
import { AdManager } from '../../services/adManager';
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

  // Ensure banner is loaded once on initial mount if not premium.
  // CRITICAL: Never recreate or call loadAd on tab change (activeTab) or match ticks (isMatchActive).
  // Native AdMob keeps the bottom banner persistently active above the navigation bar.
  useEffect(() => {
    if (!isPremium) {
      AdManager.ensureBannerActive();
    }
  }, [isPremium]);

  // Native AdMob attaches the real AdView directly into Android root window hierarchy.
  // We return null to never display any placeholder text or mock boxes.
  return null;
};
