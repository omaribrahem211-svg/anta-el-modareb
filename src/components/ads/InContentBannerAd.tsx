import React, { useState, useEffect } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';

interface InContentBannerAdProps {
  className?: string;
}

/**
 * Top in-content sponsored banner ad positioned cleanly below the Facebook Community Section.
 * Uses exact production Ad Unit ID: ca-app-pub-5272866425919152/6734203345
 * Completely isolated from the bottom banner to prevent any instance collisions, white screen, or UI freezing.
 */
export const InContentBannerAd: React.FC<InContentBannerAdProps> = ({ className = '' }) => {
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());

  useEffect(() => {
    const unsub = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsub();
  }, []);

  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) {
    return null;
  }

  return (
    <div
      id="in_content_top_banner_ad"
      data-ad-unit-id={ADMOB_CONFIG.TOP_BANNER_ID}
      className={`w-full overflow-hidden transition-all duration-300 ${className}`}
      aria-label="Sponsored In-Content Banner"
    >
      {/* Real Ad container reserved for TOP_BANNER_ID */}
      <div 
        id="admob_top_banner_slot"
        className="w-full flex items-center justify-center min-h-0"
      />
    </div>
  );
};
