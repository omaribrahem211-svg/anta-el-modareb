import React, { useEffect, useState } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

/**
 * Dedicated Native AdMob Banner Container.
 * Anchored directly above the bottom navigation bar (at bottom-[58px]).
 * - Manages the native Android AdView lifecycle via AdManager with unit ID: ca-app-pub-5272866425919152/4077924883.
 * - Provides a clean, reserved layout area for the native Android AdView.
 * - Displays NO debug pills, status indicators, or Ad Unit ID text in the UI.
 */
export const BannerAdContainer: React.FC<BannerAdContainerProps> = () => {
  const [isPremium, setIsPremium] = useState<boolean>(AdManager.isPremium());

  useEffect(() => {
    const unsub = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) {
      AdManager.destroyBanner();
      return;
    }

    // Ensure the native AdMob banner is requested and kept active
    AdManager.ensureBannerActive();
  }, [isPremium]);

  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) {
    return null;
  }

  return (
    <div
      id="native-admob-banner-container"
      aria-hidden="true"
      className="fixed bottom-[58px] left-0 right-0 z-20 pointer-events-none flex justify-center items-center h-[50px] w-full"
    >
      {/* 
        Dedicated transparent space for the Android Native AdView.
        Located exactly above the bottom navigation (58px margin), ensuring buttons and content remain fully accessible.
      */}
      <div className="w-[320px] h-[50px] pointer-events-none" />
    </div>
  );
};
