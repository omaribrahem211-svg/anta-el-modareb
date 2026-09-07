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

  // On native platform (Android), AdMob renders the native banner at the bottom of the device screen
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <div 
      id="admob-banner-container"
      className="fixed bottom-16 left-0 right-0 z-20 flex justify-center px-2 pointer-events-none transition-all duration-300"
    >
      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-slate-300 shadow-xl pointer-events-auto relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-2">
          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded border border-amber-500/40 tracking-wider">
            AD
          </span>
          <span className="text-slate-200 font-medium text-[11px] truncate max-w-[200px] sm:max-w-[280px]">
            {ADMOB_CONFIG.IS_TEST_MODE 
              ? 'Google AdMob Smart Banner (أنت المدرب)' 
              : 'شريك الإعلانات الرسمي'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-amber-400/80 font-mono shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>320×50</span>
        </div>
      </div>
    </div>
  );
};
