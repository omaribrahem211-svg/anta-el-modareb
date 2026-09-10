import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

export const BannerAdContainer: React.FC<BannerAdContainerProps> = ({
  activeTab,
  isMatchActive = false,
}) => {
  const [isPremium, setIsPremium] = useState<boolean>(AdManager.isPremium());
  const isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

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

    if (isMatchActive) {
      // Hide banner during live match so it doesn't obstruct match view
      AdManager.hideBanner();
    } else {
      // Show/resume banner on main screens
      AdManager.resumeBanner();
    }
  }, [isMatchActive, isPremium]);

  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) {
    return null;
  }

  // Native Android AdMob banner is managed directly by native AdView.
  if (isNative) {
    return null;
  }

  // Web Simulation mode container
  return (
    <div
      id="web_simulation_bottom_banner"
      className="fixed bottom-[64px] left-0 right-0 z-30 flex justify-center px-3 pointer-events-none"
    >
      <div className="bg-slate-900/95 border border-emerald-500/30 rounded-lg px-3 py-1.5 shadow-lg flex items-center justify-between max-w-sm w-full pointer-events-auto backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200">AdMob Banner</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">
          {ADMOB_CONFIG.BANNER_ID}
        </span>
      </div>
    </div>
  );
};
