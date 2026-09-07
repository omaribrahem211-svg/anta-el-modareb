import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Trophy, Wallet, Star, Bell, Shield, Play, Cloud, Check, Loader2 } from 'lucide-react';
import { ActiveTab } from '../types/game';
import { UserProfileMenu } from './UserProfileMenu';
import { useLanguage } from '../utils/i18n';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAdmin?: () => void;
  isNativeBannerActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  onOpenAdmin,
  isNativeBannerActive = false,
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
  } = useGame();

  const { t } = useLanguage();
  const { user } = useAuth();
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [saveCloudSuccess, setSaveCloudSuccess] = useState(false);

  const handleManualSave = async () => {
    if (isSavingCloud) return;
    setIsSavingCloud(true);
    const res = await saveToCloud(true);
    setIsSavingCloud(false);
    if (res.success) {
      setSaveCloudSuccess(true);
      setTimeout(() => setSaveCloudSuccess(false), 2500);
    }
  };

  return (
    <header className={`sticky ${isNativeBannerActive ? 'top-[50px]' : 'top-0'} z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 shadow-lg transition-all duration-200`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
        
        {/* Game & Club Brand Info */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-1.5 focus:outline-none group shrink-0"
            title="أنت المدرب - الشاشة الرئيسية"
          >
            <img 
              src="/anta_elmodareb_logo.png" 
              alt="شعار لعبة أنت المدرب" 
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-md border border-amber-500/40 group-hover:scale-105 group-hover:border-amber-400 transition-all"
              referrerPolicy="no-referrer"
            />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-xs sm:text-base text-white truncate">
                {userClub ? userClub.name : t('unemployed_manager')}
              </h1>
              {userClub ? (
                <>
                  <span className="text-[9px] sm:text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded font-medium shrink-0">
                    {t('tier')} {activeLeague.divisionTier}
                  </span>
                  <span className="text-[9px] sm:text-[10px] bg-amber-950 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded font-bold shrink-0">
                    {t('season')} {season.seasonNumber}
                  </span>
                </>
              ) : (
                <span className="text-[9px] sm:text-[10px] bg-amber-950 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-full font-bold shrink-0">
                  {t('available_for_hire')}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {manager.name} • {userClub ? activeLeague.name : 'بحث عن فرصة تدريبية'}
            </p>
          </div>
        </div>

        {/* Status Chips & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Manual Cloud Save Button (Only if user logged in) */}
          {user && (
            <button
              onClick={handleManualSave}
              disabled={isSavingCloud}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                saveCloudSuccess
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : isSavingCloud
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700/80 text-sky-300'
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

          {/* Round / Season Status Pill */}
          <div className="hidden md:flex flex-col items-center bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-lg">
            <span className="text-[9px] text-slate-400 font-medium">{t('round')}</span>
            <span className="text-xs font-bold text-amber-400">
              {seasonFinished ? t('season_ended') : `${currentRound} / ${totalRounds}`}
            </span>
          </div>

          {/* Budget */}
          {userClub && (
            <button 
              onClick={() => setActiveTab('club')}
              className="flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/70 border border-emerald-700/50 px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors text-right cursor-pointer"
              title={t('budget')}
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-[9px] text-emerald-300/80">{t('budget')}</span>
                <span className="text-xs font-bold text-emerald-300">
                  {userClub.budget >= 1000 ? `${(userClub.budget / 1000).toFixed(1)}k` : userClub.budget} {t('egp')}
                </span>
              </div>
            </button>
          )}

          {/* Manager Rep */}
          <button 
            onClick={() => setActiveTab('career')}
            className="flex items-center gap-1 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/50 px-2 py-1.5 rounded-lg transition-colors text-right cursor-pointer"
            title={t('level')}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] text-amber-300/80">{t('level')} {manager.level}</span>
              <span className="text-xs font-bold text-amber-300">
                {manager.reputation} ⭐
              </span>
            </div>
          </button>

          {/* Inbox Bell */}
          <button 
            onClick={() => setActiveTab('inbox')}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 transition-colors cursor-pointer"
            title={t('tab_inbox')}
          >
            <Bell className="w-4 h-4" />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* User Account / Cloud Sync Button */}
          <UserProfileMenu onOpenAdmin={onOpenAdmin} />

          {/* Season Review Button if Finished */}
          {seasonFinished ? (
            <button
              onClick={openSeasonModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-3 py-2 rounded-lg shadow-md transition-all active:scale-95 shrink-0 cursor-pointer animate-pulse"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('review_season')}</span>
            </button>
          ) : !liveMatch && activeTab !== 'matches' ? (
            <button
              onClick={() => {
                setActiveTab('matches');
                startLiveMatch();
              }}
              className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
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

