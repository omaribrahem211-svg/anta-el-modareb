import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { billingService } from '../../services/billingService';

/** حالة المدرب المميز التفاعلية: تتحدث فور الشراء أو الاستعادة */
export function useIsPremium(): boolean {
  const [premium, setPremium] = useState<boolean>(() => billingService.isPremium());
  useEffect(() => {
    const onChange = (e: any) => setPremium(Boolean(e?.detail?.owned ?? billingService.isPremium()));
    window.addEventListener('premium-status-changed', onChange);
    return () => window.removeEventListener('premium-status-changed', onChange);
  }, []);
  return premium;
}

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
  withLabel?: boolean;
}

/** الشارة الذهبية "مدرب مميز" بجانب اسم المدرب */
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ size = 'sm', withLabel = true }) => {
  const cls =
    size === 'md'
      ? 'px-2 py-1 text-[11px] gap-1'
      : 'px-1.5 py-0.5 text-[9px] gap-0.5';
  return (
    <span
      className={`inline-flex items-center rounded-full font-black bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 border border-amber-300/60 shadow-sm shadow-amber-500/30 ${cls}`}
      title="مدرب مميز"
    >
      <Crown className={size === 'md' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'} />
      {withLabel && <span>مدرب مميز</span>}
    </span>
  );
};
