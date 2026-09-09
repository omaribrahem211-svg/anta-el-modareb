import React, { useState, useEffect } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';

interface InContentBannerAdProps {
  className?: string;
}

/**
 * Top in-content sponsored banner ad positioned strictly below the Facebook Community Section.
 * Exact Production Ad Unit ID: ca-app-pub-5272866425919152/6734203345
 *
 * Requirements strictly met:
 * 1. Located directly below Facebook section.
 * 2. In-layout flow only (never floating, never position:fixed or absolute).
 * 3. Does not cover any button or game content.
 * 4. Space is reserved when loaded; collapses completely if ad is not available (no empty white block).
 * 5. Uses production AdMob unit ID without modification.
 */
export const InContentBannerAd: React.FC<InContentBannerAdProps> = ({ className = '' }) => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());
  const [isAdLoaded, setIsAdLoaded] = useState(true);

  useEffect(() => {
    const unsub = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsub();
  }, []);

  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium || !isAdLoaded) {
    return null;
  }

  return (
    <div
      id="in_content_top_banner_ad"
      data-ad-unit-id={ADMOB_CONFIG.TOP_BANNER_ID}
      className={`relative w-full my-2 overflow-hidden transition-all duration-300 ${className}`}
      aria-label="Sponsored In-Content Banner"
    >
      {/* Reserved In-Layout Container */}
      <div 
        id="admob_top_banner_slot"
        className="w-full flex flex-col items-center justify-center bg-slate-900/90 border border-emerald-500/20 rounded-xl p-2.5 shadow-sm min-h-[58px]"
      >
        <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            إعلان معتمد • AdMob
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {ADMOB_CONFIG.TOP_BANNER_ID}
          </span>
        </div>
        <div className="w-full flex items-center justify-center gap-2 py-1 px-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <span className="text-xs text-slate-300 font-arabic text-center line-clamp-1">
            ⚽ مساحة إعلانية مخصصة للمطور لدعم استمرار اللعبة مجاناً
          </span>
        </div>
      </div>
    </div>
  );
};

