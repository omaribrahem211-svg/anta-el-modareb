import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

export const BannerAdContainer: React.FC<BannerAdContainerProps> = ({ activeTab, isMatchActive }) => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());
  const isNative = Capacitor.isNativePlatform();

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
      // Activate Native Google AdMob Banner
      AdManager.ensureBannerActive().catch((err) => {
        console.warn('[BannerAdContainer] Bottom banner notice:', err);
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [isPremium, isMatchActive, activeTab]);

  // If banner is disabled, user is premium, or a match is playing, don't show
  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium || isMatchActive) {
    return null;
  }

  // On Native Android, AdMob plugin displays the native com.google.android.gms.ads.AdView
  if (isNative) {
    return null;
  }

  // On Web / AI Studio Preview: Render active AdMob Banner above the bottom navigation bar
  return (
    <div
      id="admob_persistent_bottom_banner"
      className="fixed left-0 right-0 bottom-[56px] z-25 pointer-events-auto flex justify-center px-2 py-0.5 animate-fade-in"
      aria-label="Google AdMob Banner"
    >
      <div className="w-full max-w-md bg-slate-900/95 border border-emerald-500/30 rounded-lg p-2 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
            إعلان AdMob
          </span>
          <span className="text-slate-200 font-medium truncate text-[11px] font-arabic">
            ⚽ إعلان بانر رسمي مفعل • {ADMOB_CONFIG.BANNER_ID}
          </span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono shrink-0 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
          320×50
        </span>
      </div>
    </div>
  );
};
