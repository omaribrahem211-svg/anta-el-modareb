import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Wallet, Star, Bell, Play, Cloud, Check, Loader2, Gift, Zap } from 'lucide-react';
import { ActiveTab } from '../types/game';
import { UserProfileMenu } from './UserProfileMenu';
import { useLanguage } from '../utils/i18n';
import { useAuth } from '../context/AuthContext';
import { challengesManager } from '../services/challengesService';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  onOpenAdmin,
}) => {
  const {
    userClub,
    currentRound,
    totalRounds,
    manager,
    unreadMessagesCount,
    liveMatch,
    startLiveMatch,
    seasonFinished,
    season,
    activeLeague,
    openSeasonModal,
    saveToCloud,
    canClaimDailyReward,
    setShowDailyRewardModal,
  } = useGame();

  const { t } = useLanguage();
  const { user } = useAuth();
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [saveCloudSuccess, setSaveCloudSuccess] = useState(false);
  const [unclaimedChallengesCount, setUnclaimedChallengesCount] = useState<number>(() => {
    return challengesManager.getUnclaimedCompletedCount();
  });

  React.useEffect(() => {
    const unsub = challengesManager.subscribe(() => {
      setUnclaimedChallengesCount(challengesManager.getUnclaimedCompletedCount());
    });
    return () => unsub();
  }, []);

  const handleManualSave = async () => {
    if (isSavingCloud) return;
    setIsSavingCloud(true);
    const res = await saveToCloud(true);
    setIsSavingCloud(false);
    if (res.success) {
      setSaveCloudSuccess(true);
      setTimeout(() => setSaveCloudSuccess(false), 2200);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2 sm:py-2.5 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2.5">
        
        {/* Game & Club Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-1.5 focus:outline-none group shrink-0 active:scale-95 transition-transform"
            title="أنت المدرب - الشاشة الرئيسية"
          >
            <img 
              src="/anta_elmodareb_logo.png" 
              alt="شعار لعبة أنت المدرب" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow border border-amber-500/30 group-hover:border-amber-400 transition-colors"
              referrerPolicy="no-referrer"
            />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="font-bold text-xs sm:text-base text-white truncate">
                {userClub ? userClub.name : t('unemployed_manager')}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 truncate">
              <span>{manager.name}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="truncate">{userClub ? activeLeague.name : 'باحث عن نادٍ'}</span>
              <span aria-hidden="true" className="text-slate-600 hidden xs:inline">·</span>
              <span className="hidden xs:inline text-amber-400/90 font-medium">م{season.seasonNumber}</span>
            </div>
          </div>
        </div>

        {/* Streamlined Status & Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Quick Manual Cloud Save Button (Desktop, if logged in) */}
          {user && (
            <button
              onClick={handleManualSave}
              disabled={isSavingCloud}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                saveCloudSuccess
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                  : isSavingCloud
                  ? 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-sky-300'
              }`}
              title={t('cloud_save_now')}
            >
              {isSavingCloud ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : saveCloudSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="text-[11px]">
                {isSavingCloud ? t('saving') : saveCloudSuccess ? t('cloud_saved_success') : t('cloud_save_now')}
              </span>
            </button>
          )}

          {/* Round / Season Status Ticker (Desktop) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/40 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs">
            <span className="text-slate-400 text-[10px]">{t('round')}:</span>
            <span className="font-bold text-amber-400 font-mono text-[11px]">
              {seasonFinished ? t('season_ended') : `${currentRound}/${totalRounds}`}
            </span>
          </div>

          {/* Unified Financial & Reputation Metric Capsule */}
          {userClub ? (
            <button 
              onClick={() => setActiveTab('club')}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 px-2 sm:px-2.5 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95"
              title="ميزانية النادي وسمعة المدرب"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-xs font-bold text-emerald-300">
                {userClub.budget >= 1000 ? `${(userClub.budget / 1000).toFixed(1)}k` : userClub.budget}
              </span>
              <span className="text-slate-600 text-xs select-none">|</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-mono text-[11px] font-bold text-amber-300">
                {manager.reputation}
              </span>
            </button>
          ) : (
            <button 
              onClick={() => setActiveTab('career')}
              className="flex items-center gap-1 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 px-2 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95"
              title="سمعة ومستوى المدرب"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-mono text-xs font-bold text-amber-300">
                {manager.reputation} ⭐
              </span>
            </button>
          )}

          {/* Challenges & Ad Rewards Hub Shortcut */}
          <button 
            onClick={() => setActiveTab('challenges')}
            className={`relative p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
              activeTab === 'challenges'
                ? 'bg-amber-500/25 border-amber-500/80 text-amber-300 shadow-sm shadow-amber-500/20'
                : unclaimedChallengesCount > 0
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/60 text-slate-300'
            }`}
            title="مركز التحديات ومكافآت الإعلانات"
            aria-label="مركز التحديات ومكافآت الإعلانات"
          >
            <Zap className={`w-4 h-4 ${unclaimedChallengesCount > 0 ? 'text-amber-400 fill-amber-400' : 'text-amber-400'}`} />
            {unclaimedChallengesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] min-w-[15px] h-3.5 px-0.5 rounded-full flex items-center justify-center ring-1 ring-slate-900">
                {unclaimedChallengesCount}
              </span>
            )}
          </button>

          {/* Daily Reward Icon Button */}
          <button 
            onClick={() => setShowDailyRewardModal(true)}
            className={`relative p-2 rounded-xl border transition-colors cursor-pointer active:scale-95 ${
              canClaimDailyReward
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/60 text-slate-300'
            }`}
            title="المكافأة اليومية"
            aria-label="المكافأة اليومية"
          >
            <Gift className={`w-4 h-4 ${canClaimDailyReward ? 'text-amber-400' : 'text-slate-400'}`} />
            {canClaimDailyReward && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
            )}
          </button>

          {/* Inbox Bell */}
          <button 
            onClick={() => setActiveTab('inbox')}
            className="relative p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors cursor-pointer active:scale-95"
            title={t('tab_inbox')}
            aria-label={t('tab_inbox')}
          >
            <Bell className="w-4 h-4" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Account / Profile Menu */}
          <UserProfileMenu onOpenAdmin={onOpenAdmin} />

          {/* Season Review / Match Button */}
          {seasonFinished ? (
            <button
              onClick={openSeasonModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('review_season')}</span>
            </button>
          ) : !liveMatch && activeTab !== 'matches' ? (
            <button
              onClick={() => {
                setActiveTab('matches');
                startLiveMatch();
              }}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{t('match')}</span>
            </button>
          ) : null}

        </div>

      </div>
    </header>
  );
};
