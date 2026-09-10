import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { LanguageProvider } from './utils/i18n';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider, useGame } from './context/GameContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardTab } from './components/DashboardTab';
import { SquadTab } from './components/SquadTab';
import { TacticsTab } from './components/TacticsTab';
import { MatchesTab } from './components/MatchesTab';
import { LeagueTab } from './components/LeagueTab';
import { TransfersTab } from './components/TransfersTab';
import { TrainingTab } from './components/TrainingTab';
import { ClubTab } from './components/ClubTab';
import { CareerTab } from './components/CareerTab';
import { InboxTab } from './components/InboxTab';
import { WorldRankingsTab } from './components/WorldRankingsTab';
import { OnlinePvPTab } from './components/pvp/OnlinePvPTab';
import { PlayerModal } from './components/PlayerModal';
import { SeasonTransitionModal } from './components/SeasonTransitionModal';
import { DaySummaryModal } from './components/DaySummaryModal';
import { MatchDayBlockerModal } from './components/MatchDayBlockerModal';
import { WelcomeModalHandler } from './components/WelcomeModalHandler';
import { FacebookBanner } from './components/FacebookBanner';
import { BannerAdContainer } from './components/ads/BannerAdContainer';
import { RewardedAdCenterModal } from './components/ads/RewardedAdCenterModal';
import { AdManager } from './services/adManager';
import { ADMOB_CONFIG } from './config/admobConfig';
import { AdRewardType } from './services/adRewardService';
import { ActiveTab, Player } from './types/game';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminAccessDenied } from './components/admin/AdminAccessDenied';
import { MatchErrorBoundary } from './components/MatchErrorBoundary';

function GameApp() {
  console.log('[STARTUP] App rendered', Math.round(performance.now()) + 'ms');

  useEffect(() => {
    console.log('[STARTUP] first screen ready', Math.round(performance.now()) + 'ms');
  }, []);

  const { isAdmin } = useAuth();
  const { dayAdvanceSummary, showDaySummaryModal, closeDaySummaryModal, isMatchDay, liveMatch } = useGame();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const handleTabChange = useCallback((newTab: ActiveTab) => {
    startTransition(() => {
      setActiveTab(newTab);
    });
  }, []);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isRewardedModalOpen, setIsRewardedModalOpen] = useState<boolean>(false);
  const [rewardedModalDefaultType, setRewardedModalDefaultType] = useState<AdRewardType>('coins');
  const [isPremium, setIsPremium] = useState<boolean>(AdManager.isPremium());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return (
      window.location.pathname === '/admin' ||
      window.location.pathname.startsWith('/admin/') ||
      window.location.hash === '#admin' ||
      window.location.hash.startsWith('#/admin')
    );
  });

  // Track VIP/Premium status
  useEffect(() => {
    const unsub = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsub();
  }, []);

  // Initialize AdMob cleanly in background after app startup
  useEffect(() => {
    const timer = setTimeout(() => {
      AdManager.init().catch((err) => {
        console.warn('[AdMob] Init notice:', err);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Listen for global open-admob-rewards event (disabled when rewards are turned off)
  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_REWARDS) return;

    const handleOpenAdRewards = (e: any) => {
      if (e.detail?.type) {
        setRewardedModalDefaultType(e.detail.type);
      }
      setIsRewardedModalOpen(true);
    };

    window.addEventListener('open-admob-rewards', handleOpenAdRewards);
    return () => {
      window.removeEventListener('open-admob-rewards', handleOpenAdRewards);
    };
  }, []);

  // Android Hardware Back Button Listener (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListenerPromise = CapApp.addListener('backButton', () => {
      // 1. Close open Player Modal
      if (selectedPlayer) {
        setSelectedPlayer(null);
        return;
      }

      // 2. Close Day Summary Modal if open
      if (showDaySummaryModal) {
        closeDaySummaryModal();
        return;
      }

      // 3. Exit Admin View if open
      if (isAdminMode) {
        handleBackToGame();
        return;
      }

      // 4. If on sub-tab, return to Dashboard Home
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }

      // 5. If on Dashboard Home and nothing open, exit app
      CapApp.exitApp();
    });

    return () => {
      backListenerPromise.then(l => l.remove()).catch(() => {});
    };
  }, [selectedPlayer, showDaySummaryModal, closeDaySummaryModal, isAdminMode, activeTab]);

  // Listen to browser navigation changes for /admin or #admin
  useEffect(() => {
    const checkAdminRoute = () => {
      const isTargetingAdmin = 
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin/') ||
        window.location.hash === '#admin' ||
        window.location.hash.startsWith('#/admin');
      setIsAdminMode(isTargetingAdmin);
    };

    window.addEventListener('popstate', checkAdminRoute);
    window.addEventListener('hashchange', checkAdminRoute);
    return () => {
      window.removeEventListener('popstate', checkAdminRoute);
      window.removeEventListener('hashchange', checkAdminRoute);
    };
  }, []);

  const handleBackToGame = () => {
    setIsAdminMode(false);
    if (window.location.hash === '#admin' || window.location.hash.startsWith('#/admin')) {
      window.location.hash = '';
    }
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/');
    }
  };

  // If in Admin Mode
  if (isAdminMode) {
    if (isAdmin) {
      return <AdminLayout onBackToGame={handleBackToGame} />;
    } else {
      return <AdminAccessDenied onBackToGame={handleBackToGame} />;
    }
  }

  // Regular Player Game Experience
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] safe-area-inset">
      {/* Top Header Bar */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        onOpenAdmin={() => {
          setIsAdminMode(true);
          window.location.hash = '#admin';
        }}
      />

      {/* Main Content Stage - GPU accelerated for smooth page transitions */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-4 pb-36 gpu-layer">
        {/* Facebook Community Banner */}
        <FacebookBanner />

        {activeTab === 'dashboard' && (
          <DashboardTab 
            setActiveTab={handleTabChange} 
            onSelectPlayer={(p) => setSelectedPlayer(p)} 
          />
        )}

        {activeTab === 'squad' && (
          <SquadTab 
            onSelectPlayer={(p) => setSelectedPlayer(p)} 
          />
        )}

        {activeTab === 'tactics' && (
          <TacticsTab 
            onSelectPlayer={(p) => setSelectedPlayer(p)} 
          />
        )}

        {activeTab === 'matches' && (
          <MatchErrorBoundary componentName="MatchesTab">
            <MatchesTab />
          </MatchErrorBoundary>
        )}

        {activeTab === 'online_pvp' && (
          <OnlinePvPTab />
        )}

        {activeTab === 'league' && (
          <LeagueTab />
        )}

        {activeTab === 'transfers' && (
          <TransfersTab 
            onSelectPlayer={(p) => setSelectedPlayer(p)} 
          />
        )}

        {activeTab === 'training' && (
          <TrainingTab 
            onSelectPlayer={(p) => setSelectedPlayer(p)} 
          />
        )}

        {activeTab === 'club' && (
          <ClubTab />
        )}

        {activeTab === 'career' && (
          <CareerTab />
        )}

        {activeTab === 'inbox' && (
          <InboxTab />
        )}

        {activeTab === 'rankings' && (
          <WorldRankingsTab />
        )}
      </main>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Detail Player Inspector Modal */}
      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
        />
      )}

      {/* Multi-Season Career Transition Modal */}
      <SeasonTransitionModal />

      {/* Daily Simulation Summary Modal */}
      <DaySummaryModal
        summary={dayAdvanceSummary}
        isOpen={showDaySummaryModal}
        onClose={closeDaySummaryModal}
        isMatchDay={isMatchDay}
        onGoToMatches={() => {
          closeDaySummaryModal();
          setActiveTab('matches');
        }}
      />

      {/* Match Day Progression Blocker Modal */}
      <MatchDayBlockerModal onNavigateTab={(tab) => setActiveTab(tab)} />

      {/* Auth / Guest Check Welcome Modal */}
      <WelcomeModalHandler />

      {/* Google AdMob Persistent Smart Banner (Android & Safe Preview) */}
      <BannerAdContainer activeTab={activeTab} isMatchActive={!!liveMatch} />

      {/* Google AdMob Rewarded Video Center Modal (Temporarily Disabled) */}
      {ADMOB_CONFIG.ENABLE_REWARDS && (
        <RewardedAdCenterModal
          isOpen={isRewardedModalOpen}
          onClose={() => setIsRewardedModalOpen(false)}
          defaultRewardType={rewardedModalDefaultType}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <GameProvider>
          <GameApp />
        </GameProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
