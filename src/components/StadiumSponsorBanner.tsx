import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Trophy, Zap, Globe, Award, Radio } from 'lucide-react';
import { ADMOB_CONFIG } from '../config/admobConfig';

interface SponsorItem {
  id: string;
  name: string;
  tagline: string;
  brandColor: string;
  accentColor: string;
  icon: React.ReactNode;
  category: string;
}

const IN_GAME_STADIUM_SPONSORS: SponsorItem[] = [
  {
    id: 'anta_telecom',
    name: 'Anta Elmodareb Telecom',
    tagline: 'الراعي الرسمي للاتصالات وتقنية الملاعب الذكية',
    brandColor: '#0284c7', // Sky-600
    accentColor: '#38bdf8',
    icon: <Globe className="w-3.5 h-3.5" />,
    category: 'الاتصالات الرسمية',
  },
  {
    id: 'nile_sports',
    name: 'Nile Sports Energy',
    tagline: 'طاقة الأبطال وراعي اللياقة والتحمل البدني للأندية',
    brandColor: '#16a34a', // Green-600
    accentColor: '#4ade80',
    icon: <Zap className="w-3.5 h-3.5" />,
    category: 'مشروب الطاقة الرسمي',
  },
  {
    id: 'delta_bank',
    name: 'Delta National Bank',
    tagline: 'الشريك المصرفي والمالي المعتمد لبطولات الدوري',
    brandColor: '#d97706', // Amber-600
    accentColor: '#fcd34d',
    icon: <Trophy className="w-3.5 h-3.5" />,
    category: 'الراعي المصرفي',
  },
  {
    id: 'misr_insurance',
    name: 'Misr Insurance Group',
    tagline: 'راعي الأمان والتأمين الرياضي الشامل لكافة الملاعب',
    brandColor: '#7c3aed', // Purple-600
    accentColor: '#c084fc',
    icon: <Shield className="w-3.5 h-3.5" />,
    category: 'التأمين الرياضي',
  },
  {
    id: 'cairo_logistics',
    name: 'Cairo Cargo & Logistics',
    tagline: 'الناقل الرسمي والتجهيزات اللوجستية لفرق الدرجة الأولى والرابعة',
    brandColor: '#ea580c', // Orange-600
    accentColor: '#fb923c',
    icon: <Award className="w-3.5 h-3.5" />,
    category: 'الشريك اللوجستي',
  },
];

interface StadiumSponsorBannerProps {
  currentMinute?: number;
  isMatchPlaying?: boolean;
}

export const StadiumSponsorBanner: React.FC<StadiumSponsorBannerProps> = ({
  currentMinute = 0,
  isMatchPlaying = false,
}) => {
  const [sponsorIndex, setSponsorIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Rotate pitch-side sponsors smoothly every 12 seconds during the match
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setSponsorIndex((prev) => (prev + 1) % IN_GAME_STADIUM_SPONSORS.length);
        setIsTransitioning(false);
      }, 300);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const currentSponsor = IN_GAME_STADIUM_SPONSORS[sponsorIndex];

  return (
    <div 
      id="stadium_pitch_sponsor_board" 
      className="w-full select-none transition-all duration-300 my-2"
      dir="rtl"
    >
      {/* Pitch-side LED Digital Advertising Board Ribbon Frame */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner p-1.5 sm:p-2 flex items-center justify-between gap-2">
        
        {/* LED Digital Ribbon Scanlines Pattern */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)'
          }}
        />

        {/* Dynamic Sponsor Ambient Glow */}
        <div 
          className="absolute top-0 right-0 w-32 h-full opacity-20 pointer-events-none transition-colors duration-700 blur-md"
          style={{ backgroundColor: currentSponsor.accentColor }}
        />

        {/* Left Section: Live Match Stadium Indicator */}
        <div className="flex items-center gap-1.5 shrink-0 z-10">
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 px-2 py-1 rounded-lg text-[10px] font-mono">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-bold hidden xs:inline">لوحات الملعب</span>
            <span className="text-emerald-400 font-bold">LED</span>
          </div>

          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold font-mono tracking-wider">
            SPONSOR
          </span>
        </div>

        {/* Center: Dynamic Pitch-side Sponsor Brand & Tagline */}
        <div 
          className={`flex-1 flex items-center justify-center gap-2 text-center min-w-0 z-10 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <div 
            className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: currentSponsor.brandColor }}
          >
            {currentSponsor.icon}
          </div>

          <div className="flex items-baseline gap-2 truncate">
            <span 
              className="text-xs sm:text-sm font-black tracking-wide"
              style={{ color: currentSponsor.accentColor }}
            >
              {currentSponsor.name}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium truncate hidden sm:inline">
              — {currentSponsor.tagline}
            </span>
          </div>
        </div>

        {/* Right Section: Official Tournament Partner Badge */}
        <div className="hidden xs:flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0 z-10 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-slate-300">{currentSponsor.category}</span>
        </div>

      </div>
    </div>
  );
};
