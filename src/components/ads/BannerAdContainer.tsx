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

  // Ensure banner is loaded and actively displayed at all times,
  // including during navigation between screens and live matches.
  useEffect(() => {
    if (!isPremium) {
      AdManager.ensureBannerActive();
    }
  }, [activeTab, isMatchActive, isPremium]);

  // Native AdMob attaches the real AdView directly into Android root window hierarchy.
  // We return null to never display any placeholder text or mock boxes.
  return null;
};
