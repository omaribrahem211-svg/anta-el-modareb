import React, { useEffect, useState } from 'react';
import { Crown, UserRound } from 'lucide-react';
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
  premium?: boolean;
}

/** الشارة الذهبية "مدرب مميز" بجانب اسم المدرب */
export const PremiumBadge: React.FC<PremiumBadgeProps> = ({ size = 'sm', withLabel = true, premium = true }) => {
  const cls =
    size === 'md'
      ? 'px-2 py-1 text-[11px] gap-1'
      : 'px-1.5 py-0.5 text-[9px] gap-0.5';
  return (
    <span
      className={`inline-flex shrink-0 max-w-full items-center whitespace-nowrap rounded-full font-black border ${premium ? 'bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 border-amber-300/60 shadow-sm shadow-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-600'} ${cls}`}
      title={premium ? 'مدرب مميز' : 'مدرب عادي'}
      data-coach-status={premium ? 'premium' : 'regular'}
    >
      {premium ? <Crown className={size === 'md' ? 'w-3.5 h-3.5 shrink-0' : 'w-2.5 h-2.5 shrink-0'} /> : <UserRound className={size === 'md' ? 'w-3.5 h-3.5 shrink-0' : 'w-2.5 h-2.5 shrink-0'} />}
      {withLabel && <span>{premium ? 'مدرب مميز' : 'مدرب عادي'}</span>}
    </span>
  );
};
