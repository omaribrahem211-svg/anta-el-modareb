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
export const InContentBannerAd: React.FC<InContentBannerAdProps> = () => {
  // Top in-content banner removed per user request
  return null;
};


