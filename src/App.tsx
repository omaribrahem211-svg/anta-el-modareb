import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import ForcedUpdateGate from './components/ForcedUpdateGate';
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
import { ChallengesTab } from './components/ChallengesTab';
import { BannerAdContainer } from './components/ads/BannerAdContainer';
import { RewardedAdCenterModal } from './components/ads/RewardedAdCenterModal';
import { DailyLoginRewardModal } from './components/DailyLoginRewardModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdManager } from './services/adManager';
import { ADMOB_CONFIG } from './config/admobConfig';
import { AdRewardType } from './services/adRewardService';
import { ActiveTab, Player } from './types/game';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminAccessDenied } from './components/admin/AdminAccessDenied';
import { MatchErrorBoundary } from './components/MatchErrorBoundary';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';

function GameApp() {
  console.log('[STARTUP] App rendered', Math.round(performance.now()) + 'ms');

  useEffect(() => {
    console.log('[STARTUP] first screen ready', Math.round(performance.now()) + 'ms');
  }, []);

  const { isAdmin } = useAuth();
  const { 
    dayAdvanceSummary, 
    showDaySummaryModal, 
    closeDaySummaryModal, 
    isMatchDay, 
    liveMatch,
    startLiveMatch,
    showDailyRewardModal,
    setShowDailyRewardModal
  } = useGame();
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
  const [isPrivacyPolicyMode, setIsPrivacyPolicyMode] = useState<boolean>(() => {
    return (
      window.location.pathname === '/privacy-policy' ||
      window.location.pathname.startsWith('/privacy-policy/') ||
      window.location.hash === '#privacy-policy' ||
      window.location.hash.startsWith('#/privacy-policy') ||
      window.location.hash.startsWith('#privacy-policy')
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

  // Listen for global set-active-tab event to switch tabs safely from anywhere
  useEffect(() => {
    const handleSetTab = (e: any) => {
      if (e.detail?.tab) {
        handleTabChange(e.detail.tab);
      }
    };
    window.addEventListener('set-active-tab', handleSetTab);
    return () => {
      window.removeEventListener('set-active-tab', handleSetTab);
    };
  }, [handleTabChange]);

  // Android Hardware Back Button Listener (Capacitor)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListenerPromise = CapApp.addListener('backButton', () => {
      // 0. Close Rewarded Ad Modal if open
      if (isRewardedModalOpen) {
        setIsRewardedModalOpen(false);
        return;
      }

      // 1. Dispatch custom event so open page-level modals (like Sponsorship Hub, Promo code) can handle back
      const backEvent = new CustomEvent('anta-android-back-pressed', { cancelable: true });
      const handled = !window.dispatchEvent(backEvent);
      if (handled) {
        return;
      }

      // 2. Close open Player Modal
      if (selectedPlayer) {
        setSelectedPlayer(null);
        return;
      }

      // 3. Close Day Summary Modal if open
      if (showDaySummaryModal) {
        closeDaySummaryModal();
        return;
      }

      // 4. Exit Privacy Policy or Admin View if open
      if (isPrivacyPolicyMode || isAdminMode) {
        handleBackToGame();
        return;
      }

      // 5. If on sub-tab, return to Dashboard Home
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }

      // 6. If on Dashboard Home and nothing open, exit app
      CapApp.exitApp();
    });

    return () => {
      backListenerPromise.then(l => l.remove()).catch(() => {});
    };
  }, [selectedPlayer, showDaySummaryModal, closeDaySummaryModal, isAdminMode, isPrivacyPolicyMode, activeTab, isRewardedModalOpen]);

  // Listen to browser navigation changes for /admin, #admin, /privacy-policy, #privacy-policy
  useEffect(() => {
    const checkRoutes = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;

      const isTargetingAdmin = 
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#admin' ||
        hash.startsWith('#/admin');
      setIsAdminMode(isTargetingAdmin);

      const isTargetingPrivacy = 
        path === '/privacy-policy' ||
        path.startsWith('/privacy-policy/') ||
        hash === '#privacy-policy' ||
        hash.startsWith('#/privacy-policy') ||
        hash.startsWith('#privacy-policy');
      setIsPrivacyPolicyMode(isTargetingPrivacy);
    };

    window.addEventListener('popstate', checkRoutes);
    window.addEventListener('hashchange', checkRoutes);
    return () => {
      window.removeEventListener('popstate', checkRoutes);
      window.removeEventListener('hashchange', checkRoutes);
    };
  }, []);

  const handleBackToGame = () => {
    setIsAdminMode(false);
    setIsPrivacyPolicyMode(false);
    if (
      window.location.hash === '#admin' || 
      window.location.hash.startsWith('#/admin') ||
      window.location.hash === '#privacy-policy' ||
      window.location.hash.startsWith('#/privacy-policy') ||
      window.location.hash.startsWith('#privacy-policy')
    ) {
      window.location.hash = '';
    }
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/privacy-policy')) {
      window.history.pushState({}, '', '/');
    }
  };

  // If in Privacy Policy Mode (publicly accessible, no login required)
  if (isPrivacyPolicyMode) {
    return <PrivacyPolicyPage onBackToGame={handleBackToGame} />;
  }

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

      {/* Main Content Stage */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-4 pb-36">
        {/* Facebook Community Banner at the top of dashboard */}
        {activeTab === 'dashboard' && <FacebookBanner />}

        {activeTab === 'dashboard' && (
          <ErrorBoundary fallbackTitle="تنبيه واجهة الرئيسية">
            <DashboardTab 
              setActiveTab={handleTabChange} 
              onSelectPlayer={(p) => setSelectedPlayer(p)} 
            />
          </ErrorBoundary>
        )}

        {activeTab === 'squad' && (
          <ErrorBoundary fallbackTitle="تنبيه قائمة الفريق">
            <SquadTab 
              onSelectPlayer={(p) => setSelectedPlayer(p)} 
            />
          </ErrorBoundary>
        )}

        {activeTab === 'tactics' && (
          <ErrorBoundary fallbackTitle="تنبيه الخطة والتكتيك">
            <TacticsTab 
              onSelectPlayer={(p) => setSelectedPlayer(p)} 
            />
          </ErrorBoundary>
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
          <ErrorBoundary fallbackTitle="تنبيه جدول الترتيب">
            <LeagueTab />
          </ErrorBoundary>
        )}

        {activeTab === 'transfers' && (
          <MatchErrorBoundary componentName="TransfersTab">
            <TransfersTab 
              onSelectPlayer={(p) => setSelectedPlayer(p)} 
            />
          </MatchErrorBoundary>
        )}

        {activeTab === 'training' && (
          <ErrorBoundary fallbackTitle="تنبيه تدريب اللاعبين">
            <TrainingTab 
              onSelectPlayer={(p) => setSelectedPlayer(p)} 
            />
          </ErrorBoundary>
        )}

        {activeTab === 'club' && (
          <ErrorBoundary fallbackTitle="تنبيه إدارة النادي">
            <ClubTab />
          </ErrorBoundary>
        )}

        {activeTab === 'career' && (
          <ErrorBoundary fallbackTitle="تنبيه مسيرة المدرب">
            <CareerTab />
          </ErrorBoundary>
        )}

        {activeTab === 'inbox' && (
          <ErrorBoundary fallbackTitle="تنبيه صندوق الرسائل">
            <InboxTab />
          </ErrorBoundary>
        )}

        {activeTab === 'rankings' && (
          <ErrorBoundary fallbackTitle="تنبيه التصنيف العالمي">
            <WorldRankingsTab />
          </ErrorBoundary>
        )}

        {activeTab === 'challenges' && (
          <ErrorBoundary fallbackTitle="تنبيه سجل التحديات">
            <ChallengesTab />
          </ErrorBoundary>
        )}
      </main>

      {/* Persistent Mobile Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Detail Player Inspector Modal */}
      {selectedPlayer && (
        <PlayerModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)} 
          onStartNegotiation={(targetP) => {
            setSelectedPlayer(null);
            handleTabChange('transfers');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-player-negotiation', { detail: targetP }));
            }, 100);
          }}
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
          startLiveMatch();
        }}
      />

      {/* Match Day Progression Blocker Modal */}
      <MatchDayBlockerModal onNavigateTab={(tab) => setActiveTab(tab)} />

      {/* Auth / Guest Check Welcome Modal */}
      <WelcomeModalHandler />

      {/* Google AdMob Persistent Smart Banner (Android & Safe Preview) */}
      <BannerAdContainer activeTab={activeTab} isMatchActive={!!liveMatch} />

      {/* Daily Login Reward Modal */}
      <ErrorBoundary fallbackTitle="تنبيه المكافأة اليومية" fallbackMessage="يمكنك متابعة اللعب واستلام المكافأة مباشرة من القائمة أو شريط التحكم.">
        <DailyLoginRewardModal
          isOpen={showDailyRewardModal}
          onClose={() => setShowDailyRewardModal(false)}
        />
      </ErrorBoundary>

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
      <ForcedUpdateGate />
      <AuthProvider>
        <GameProvider>
          <GameApp />
        </GameProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
