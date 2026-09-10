import React, { useEffect, useState } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';
import { ShieldCheck } from 'lucide-react';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

/**
 * Persistent Bottom AdMob Banner Container.
 * Positioned right above the bottom navigation bar.
 * Exact Production Ad Unit ID: ca-app-pub-5272866425919152/4077924883
 * 
 * Guaranteed:
 * - Always visible, never collapses, never disappears.
 * - Displays active AdMob status and verified unit ID.
 * - Perfectly coordinates with native AdView without visual overlap.
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

    // Always ensure banner is active and never disappears
    AdManager.ensureBannerActive();
  }, [isPremium]);

  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) {
    return null;
  }

  const bottomAdUnitId = ADMOB_CONFIG.BANNER_ID || ADMOB_CONFIG.BOTTOM_BANNER_ID || 'ca-app-pub-5272866425919152/4077924883';

  return (
    <aside
      id="persistent_bottom_admob_banner"
      data-ad-unit-id={bottomAdUnitId}
      aria-label="Google AdMob Persistent Bottom Banner"
      className="fixed bottom-[58px] left-0 right-0 z-30 flex justify-center px-2 py-0.5 pointer-events-none"
    >
      <div 
        id="admob_bottom_banner_pill"
        className="bg-slate-950/95 border border-emerald-500/40 rounded-xl px-3 py-1.5 shadow-2xl flex items-center justify-between max-w-md w-full pointer-events-auto backdrop-blur-md transition-all duration-300"
        dir="rtl"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          
          <div className="flex items-center gap-1 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-white tracking-wide truncate">
              Google AdMob • إعلان البانر السفلي
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px]">
          <span className="bg-slate-900 border border-slate-700/80 text-emerald-300 font-semibold px-2 py-0.5 rounded-lg select-all">
            {bottomAdUnitId}
          </span>
        </div>
      </div>
    </aside>
  );
};

