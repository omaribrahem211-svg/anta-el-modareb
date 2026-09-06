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
  const isMatchScreen = activeTab === 'matches' || activeTab === 'online_pvp' || isMatchActive;
  const shouldShow = !isPremium && !isMatchScreen;

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
      className="w-full max-w-lg mx-auto my-3 px-2 transition-all duration-300"
    >
      <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-400 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-2">
          <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30 tracking-wider">
            AD
          </span>
          <span className="text-slate-300 font-medium truncate max-w-[200px] sm:max-w-[280px]">
            {ADMOB_CONFIG.IS_TEST_MODE 
              ? 'إعلان اختباري من Google AdMob (Banner)' 
              : 'شريك الإعلانات الرسمي'}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <Sparkles className="w-3 h-3 text-amber-400/70" />
          <span>320×50</span>
        </div>
      </div>
    </div>
  );
};
