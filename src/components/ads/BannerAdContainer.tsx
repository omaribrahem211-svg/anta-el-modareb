import React, { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';
import { Sparkles } from 'lucide-react';

interface BannerAdContainerProps {
  activeTab: ActiveTab;
  isMatchActive?: boolean;
}

export const BannerAdContainer: React.FC<BannerAdContainerProps> = ({ activeTab, isMatchActive = false }) => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsubscribe();
  }, []);

  // Determine if banner should be visible
  // Banner appears on ALL app pages smoothly.
  // Only paused when a live interactive match simulation is actively running on screen to prevent user distraction.
  const shouldShow = !isPremium && !isMatchActive;

  useEffect(() => {
    // Clear any previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Debounce the native AdMob call by 250ms during page navigation
    // This gives React and the WebView full CPU/GPU priority to render the new page first!
    debounceTimerRef.current = setTimeout(() => {
      if (shouldShow) {
        AdManager.showBanner();
      } else {
        AdManager.hideBanner();
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  if (!Capacitor.isNativePlatform()) {
    return (
      <div 
        id="persistent-bottom-admob-banner"
        dir="rtl"
        className="fixed bottom-16 left-0 right-0 z-20 flex justify-center px-2 pointer-events-none select-none"
      >
        <div className="pointer-events-auto w-full max-w-md bg-slate-900/95 border border-amber-500/30 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-500/40 shrink-0">
              AD
            </span>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-slate-200 truncate block">
                {ADMOB_CONFIG.IS_TEST_MODE ? 'إعلان أسفل تجريبي' : 'Google AdMob - بانر أسفل (فوق القائمة)'}
              </span>
              <span className="text-[9px] text-slate-400 font-mono truncate block">
                {ADMOB_CONFIG.BOTTOM_BANNER_ID}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-amber-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 shrink-0">
            320×50
          </span>
        </div>
      </div>
    );
  }

  // On Native Android, Google AdMob displays the real native AdView anchored above bottom nav
  return null;
};
