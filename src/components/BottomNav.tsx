import React, { useState } from 'react';
import { ActiveTab } from '../types/game';
import { useGame } from '../context/GameContext';
import { useLanguage } from '../utils/i18n';
import { challengesManager } from '../services/challengesService';
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
  Zap,
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
  const [unclaimedChallengesCount, setUnclaimedChallengesCount] = useState<number>(() => {
    return challengesManager.getUnclaimedCompletedCount();
  });

  React.useEffect(() => {
    const unsub = challengesManager.subscribe(() => {
      setUnclaimedChallengesCount(challengesManager.getUnclaimedCompletedCount());
    });
    return () => unsub();
  }, []);

  const mainTabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: t('tab_dashboard', 'الرئيسية'), icon: LayoutDashboard },
    { id: 'tactics', label: t('tab_tactics', 'التكتيك'), icon: Sliders },
    { id: 'matches', label: t('tab_matches', 'المباراة'), icon: Swords },
    { id: 'squad', label: t('tab_squad', 'الفريق'), icon: Users },
    { id: 'league', label: t('tab_league', 'الدوري'), icon: Trophy },
  ];

  const secondaryTabs: { 
    id: ActiveTab; 
    label: string; 
    category: string;
    icon: React.ComponentType<{ className?: string }>; 
    badge?: number; 
    tag?: string;
    accentColor: string;
  }[] = [
    { 
      id: 'challenges', 
      label: 'التحديات والمكافآت', 
      category: 'جوائز 2X وإعلانات', 
      icon: Zap, 
      tag: 'مربح 🔥',
      badge: unclaimedChallengesCount > 0 ? unclaimedChallengesCount : undefined, 
      accentColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30' 
    },
    { id: 'transfers', label: t('tab_transfers', 'الانتقالات'), category: 'السوق واللاعبين', icon: ArrowLeftRight, accentColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30' },
    { id: 'training', label: t('tab_training', 'التدريب'), category: 'تطوير المهارات', icon: Dumbbell, accentColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
    { id: 'club', label: t('tab_club', 'إدارة النادي'), category: 'الاستاد والمنشآت', icon: Building2, accentColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
    { id: 'career', label: t('tab_career', 'مسيرة المدرب'), category: 'الرخص والإنجازات', icon: UserCheck, accentColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30' },
    { id: 'rankings', label: t('tab_rankings', 'التصنيف العالمي'), category: 'الأندية والمدربين', icon: Globe2, accentColor: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
    { id: 'online_pvp', label: t('tab_pvp', 'تحدي أونلاين'), category: 'ضد الأصدقاء', icon: Swords, tag: 'مباشر', accentColor: 'text-rose-400 bg-rose-500/15 border-rose-500/30' },
    { id: 'inbox', label: t('tab_inbox', 'صندوق الوارد'), category: 'البريد والقرارات', icon: Mail, badge: unreadMessagesCount, accentColor: 'text-blue-400 bg-blue-500/15 border-blue-500/30' },
  ];

  const handleSelectTab = (tabId: ActiveTab) => {
    React.startTransition(() => {
      setActiveTab(tabId);
    });
  };

  const isSecondaryActive = secondaryTabs.some(t => t.id === activeTab);

  return (
    <>
      {/* Sleek Floating Bottom Sheet for Secondary Navigation */}
      {showMoreMenu && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in pb-16"
          onClick={() => setShowMoreMenu(false)}
          dir="rtl"
        >
          <div 
            className="w-full max-w-lg bg-slate-900/95 border-t border-slate-700/60 rounded-t-3xl p-4 sm:p-5 pb-6 shadow-2xl space-y-3.5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="space-y-1.5">
              <div className="w-9 h-1 bg-slate-700/80 rounded-full mx-auto" />
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 px-1">
                <div>
                  <h3 className="font-bold text-sm text-white">قائمة الأقسام</h3>
                  <p className="text-[11px] text-slate-400">انتقال سريع ومباشر للأقسام</p>
                </div>
                <button 
                  onClick={() => setShowMoreMenu(false)}
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Grid of Functional Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto p-0.5">
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
                    className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all text-right group cursor-pointer active:scale-95 relative overflow-hidden ${
                      isActive 
                        ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-200' 
                        : 'bg-slate-800/50 border-slate-750/50 hover:bg-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 ${item.accentColor} transition-transform group-hover:scale-105`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {item.category}
                      </div>
                    </div>

                    {item.badge && item.badge > 0 ? (
                      <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {item.badge}
                      </span>
                    ) : item.tag ? (
                      <span className="bg-rose-500/15 text-rose-300 text-[9px] px-1.5 py-0.5 rounded font-bold border border-rose-500/25 shrink-0">
                        {item.tag}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Docked Persistent Bottom Navigation Bar */}
      <nav className="fixed left-0 right-0 bottom-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 pb-safe gpu-layer">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isMatchPlaying = tab.id === 'matches' && liveMatch && !liveMatch.isFinished;

            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all select-none min-w-[54px] cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-400' : 'text-slate-400'}`} />
                  {isMatchPlaying && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  )}
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight ${isActive ? 'text-emerald-300 font-bold' : 'text-slate-400 font-medium'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-1 w-6 h-0.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50" />
                )}
              </button>
            );
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all select-none min-w-[54px] cursor-pointer active:scale-95 ${
              isSecondaryActive
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="المزيد من الأقسام"
          >
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 ${isSecondaryActive ? 'scale-110 text-emerald-400' : 'text-slate-400'}`} />
              {(unreadMessagesCount > 0 || unclaimedChallengesCount > 0) && (
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${unclaimedChallengesCount > 0 ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'}`} />
              )}
            </div>
            <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight ${isSecondaryActive ? 'text-emerald-300 font-bold' : 'text-slate-400 font-medium'}`}>
              المزيد
            </span>
            {isSecondaryActive && (
              <span className="absolute -bottom-1 w-6 h-0.5 bg-emerald-400 rounded-full shadow-sm shadow-emerald-400/50" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
