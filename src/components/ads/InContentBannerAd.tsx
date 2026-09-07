import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';

interface InContentBannerAdProps {
  className?: string;
}

export const InContentBannerAd: React.FC<InContentBannerAdProps> = ({ className = '' }) => {
  const [isPremium, setIsPremium] = useState<boolean>(AdManager.isPremium());

  useEffect(() => {
    const unsub = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsub();
  }, []);

  // Never show ads if user has Premium status
  if (isPremium) {
    return null;
  }

  // On Native Android, Google AdMob displays the real native AdView anchored at TOP_CENTER
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <div 
      id="in-content-admob-banner"
      dir="rtl"
      className={`w-full max-w-4xl mx-auto my-3 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900 to-slate-900/95 border border-amber-500/30 p-2.5 sm:p-3 shadow-md relative overflow-hidden transition-all select-none ${className}`}
    >
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-36 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-full bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />

      <div className="relative flex items-center justify-between gap-3">
        {/* Left/Right Ad Identifier & Info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-500/40 tracking-wider shrink-0">
            AD
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200 truncate">
                {ADMOB_CONFIG.IS_TEST_MODE
                  ? 'إعلان تجريبي (Google AdMob)'
                  : 'Google AdMob - بانر فوق'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-400 truncate font-mono hidden sm:block">
              الوحدة: {ADMOB_CONFIG.BANNER_ID}
            </p>
          </div>
        </div>

        {/* Ad Format Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-mono bg-slate-950/70 border border-slate-800 px-2 py-1 rounded-lg">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="font-semibold">320×50 Banner</span>
          </div>
        </div>
      </div>
    </div>
  );
};
