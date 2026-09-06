import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { ActiveTab } from '../types/game';
import { useGame } from '../context/GameContext';
import { useLanguage } from '../utils/i18n';
import { AdManager } from '../services/adManager';
import {
  LayoutDashboard,
  Users,
  Swords,
  Trophy,
  ArrowLeftRight,
  Dumbbell,
  Building2,
  UserCheck,
  Mail,
  Sliders,
  MoreHorizontal,
  Globe2,
  X
} from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { unreadMessagesCount, liveMatch } = useGame();
  const { t } = useLanguage();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isPremium, setIsPremium] = useState(AdManager.isPremium());

  useEffect(() => {
    const unsub = AdManager.subscribe((s) => setIsPremium(s.isPremium));
    return () => unsub();
  }, []);

  // Check if native Android banner ad is currently shown at the bottom
  const isMatchScreen = activeTab === 'matches' || activeTab === 'online_pvp' || Boolean(liveMatch && liveMatch.isPlaying);
  const isNativeBannerActive = Capacitor.isNativePlatform() && !isPremium && !isMatchScreen;

  const mainTabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: t('tab_dashboard', 'الرئيسية'), icon: LayoutDashboard },
    { id: 'tactics', label: t('tab_tactics', 'التكتيك'), icon: Sliders },
    { id: 'matches', label: t('tab_matches', 'المباراة'), icon: Swords },
    { id: 'squad', label: t('tab_squad', 'الفريق'), icon: Users },
    { id: 'league', label: t('tab_league', 'الدوري'), icon: Trophy },
  ];

  const secondaryTabs: { id: ActiveTab; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; badge?: number; tag?: string }[] = [
    { id: 'rankings', label: t('tab_rankings', 'التصنيف العالمي'), desc: 'تصنيف أندية ومدربي العالم الشهري وترتيبك', icon: Globe2 },
    { id: 'online_pvp', label: t('tab_pvp', 'مباريات أونلاين'), desc: 'التحديات المباشرة متوقفة مؤقتًا وستعود قريبًا', icon: Swords, tag: 'قريباً' },
    { id: 'transfers', label: t('tab_transfers', 'سوق الانتقالات'), desc: 'شراء وبيع اللاعبين وعقود الصفقات', icon: ArrowLeftRight },
    { id: 'training', label: t('tab_training', 'مركز التدريب'), desc: 'تطوير مهارات اللاعبين والناشئين', icon: Dumbbell },
    { id: 'club', label: t('tab_club', 'إدارة النادي'), desc: 'المالية، الاستاد، المنشآت والرعاة', icon: Building2 },
    { id: 'career', label: t('tab_career', 'مسيرة المدرب'), desc: 'الإنجازات والسمعة والرخص التدريبية', icon: UserCheck },
    { id: 'inbox', label: t('tab_inbox', 'صندوق الوارد'), desc: 'رسائل الإدارة والجماهير والعروض', icon: Mail, badge: unreadMessagesCount },
  ];

  const handleSelectTab = (tabId: ActiveTab) => {
    React.startTransition(() => {
      setActiveTab(tabId);
    });
  };

  return (
    <>
      {/* More Options Modal Sheet for Mobile */}
      {showMoreMenu && (
        <div 
          className={`fixed inset-0 z-40 bg-black/80 flex items-end justify-center animate-fade-in ${
            isNativeBannerActive ? 'pb-[50px]' : ''
          }`}
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 pb-8 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 className="font-bold text-base text-white">الأقسام الإدارية الإضافية</h3>
              </div>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {secondaryTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleSelectTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors text-right ${
                      isActive 
                        ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' 
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${isActive ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-700/80 text-slate-300'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          {item.label}
                          {item.tag && (
                            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-amber-500/30">
                              {item.tag}
                            </span>
                          )}
                          {item.badge && item.badge > 0 ? (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Nav Bar - Optimized for zero GPU composition lag on Android */}
      <nav className={`fixed left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 pb-safe gpu-layer ${
        isNativeBannerActive ? 'bottom-[50px]' : 'bottom-0'
      }`}>
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1.5">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isMatchPlaying = tab.id === 'matches' && liveMatch && liveMatch.isPlaying;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-transform select-none min-w-[58px] ${
                  isActive
                    ? 'text-emerald-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-400 stroke-[2.5]' : ''}`} />
                  {isMatchPlaying && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className="text-[11px] mt-1 font-medium tracking-tight">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-1 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}

          {/* More Menu Trigger */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-xl transition-transform select-none min-w-[58px] ${
              secondaryTabs.some(t => t.id === activeTab)
                ? 'text-emerald-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
            <span className="text-[11px] mt-1 font-medium tracking-tight">
              المزيد
            </span>
            {secondaryTabs.some(t => t.id === activeTab) && (
              <span className="absolute bottom-0 w-8 h-1 bg-emerald-500 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
