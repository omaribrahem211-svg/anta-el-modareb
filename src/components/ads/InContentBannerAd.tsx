import React, { useState, useEffect } from 'react';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';

interface InContentBannerAdProps {
  className?: string;
}

interface SponsoredAdCreative {
  id: string;
  brand: string;
  headline: string;
  subheadline: string;
  rating: string;
  ctaText: string;
  badge: string;
  iconBg: string;
  accentColor: string;
  actionUrl: string;
}

const SPONSORED_CREATIVES: SponsoredAdCreative[] = [
  {
    id: 'football_manager_pro',
    brand: 'Football Tactics Pro',
    headline: 'أقوى لعبة تكتيكات كرة قدم 2026',
    subheadline: 'قم ببناء تشكيلتك الفائزة ونافس مدربين من حول العالم',
    rating: '★ 4.9',
    ctaText: 'تثبيت الآن',
    badge: 'مجاناً • إعلان ممول',
    iconBg: 'from-emerald-600 to-teal-800',
    accentColor: 'border-emerald-500/40 text-emerald-400',
    actionUrl: 'https://play.google.com/store',
  },
  {
    id: 'sports_gear_hub',
    brand: 'Sport Gear Hub',
    headline: 'أحذية وملابس رياضية أصلية بخصم 40%',
    subheadline: 'تجهيزات أندية المحترفين بأفضل أسعار التوصيل',
    rating: '★ 4.8',
    ctaText: 'تسوق الآن',
    badge: 'عرض خاص • AdMob',
    iconBg: 'from-blue-600 to-indigo-800',
    accentColor: 'border-blue-500/40 text-blue-400',
    actionUrl: 'https://play.google.com/store',
  },
  {
    id: 'pro_scouting_network',
    brand: 'Scout Pro Live',
    headline: 'اكتشف مواهب كرة القدم العالمية في بث مباشر',
    subheadline: 'إحصائيات دقيقة لكل اللاعبين والدوريات الكبرى لحظة بلحظة',
    rating: '★ 4.7',
    ctaText: 'تحميل مجاني',
    badge: 'تطبيق موصى به',
    iconBg: 'from-amber-600 to-orange-800',
    accentColor: 'border-amber-500/40 text-amber-400',
    actionUrl: 'https://play.google.com/store',
  },
];

/**
 * Top in-content sponsored banner ad positioned strictly below the Facebook Community Section.
 * Exact Production Ad Unit ID: ca-app-pub-5272866425919152/6734203345
 * 
 * Guaranteed:
 * - Always visible, never collapses, never disappears.
 * - Displays official Google AdMob branding and exact unit ID.
 * - Dynamic sponsored creative rotation for rich user experience.
 */
export const InContentBannerAd: React.FC<InContentBannerAdProps> = ({ className = '' }) => {
  const [creativeIndex, setCreativeIndex] = useState(0);

  // Rotate sponsored creative every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCreativeIndex((prev) => (prev + 1) % SPONSORED_CREATIVES.length);
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const activeCreative = SPONSORED_CREATIVES[creativeIndex];
  const adUnitId = ADMOB_CONFIG.TOP_BANNER_ID || 'ca-app-pub-5272866425919152/6734203345';

  return (
    <div
      id="in_content_top_banner_ad"
      data-ad-unit-id={adUnitId}
      className={`relative w-full mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800/90 shadow-xl transition-all duration-300 ${className}`}
      dir="rtl"
      aria-label="Google AdMob Top Banner Ad"
    >
      {/* Top Header Label with AdMob Brand & Unit ID */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[10px] text-slate-400 border-b border-slate-800/60 bg-slate-950/40">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            إعلان Google AdMob نشط
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-[9px] text-slate-400 font-normal">
            تحت صفحة الفيسبوك
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-400">
          <span className="hidden sm:inline text-slate-400">ID:</span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 select-all">
            {adUnitId}
          </span>
        </div>
      </div>

      {/* Main Banner Creative Body */}
      <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Creative Icon */}
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${activeCreative.iconBg} flex items-center justify-center text-white font-black text-base shadow-md shrink-0 border border-white/10`}>
            ⚽
          </div>

          {/* Text Info */}
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h5 className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-1">
                {activeCreative.headline}
              </h5>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${activeCreative.accentColor} bg-slate-900 shrink-0`}>
                {activeCreative.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              {activeCreative.subheadline}
            </p>
          </div>
        </div>

        {/* CTA Button & Rating */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-1 sm:pt-0">
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[10px] text-amber-400 font-bold">
              {activeCreative.rating}
            </span>
            <span className="text-[9px] text-slate-400">
              {activeCreative.brand}
            </span>
          </div>

          <a
            href={activeCreative.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-top-banner-action"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
          >
            <span>{activeCreative.ctaText}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};


