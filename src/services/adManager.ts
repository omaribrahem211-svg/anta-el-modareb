import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  AdMob,
  AdOptions,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  RewardAdOptions,
  RewardAdPluginEvents,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  AdMobRewardItem,
} from '@capacitor-community/admob';
import { ADMOB_CONFIG } from '../config/admobConfig';
import { AdManagerState, ActiveTrainingBoost, TrainingBoostType } from '../types/game';
import { AdRewardManager, AdRewardType, AdRewardClaimResult } from './adRewardService';

const ADMOB_STORAGE_KEY = 'modareb_admob_state_v1';
const BOTTOM_NAV_MARGIN_DP = 58; // Sits directly above the bottom menu bar

class AdManagerService {
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private isNative = false;
  private isBannerVisible = false;
  private isBannerCreated = false;
  private isBannerActive = false;
  private isBannerLoading = false;
  private bannerOperationLock = false;
  private bannerRetryTimer: NodeJS.Timeout | null = null;
  private bannerRetryCount = 0;
  private readonly MAX_BANNER_RETRIES = 2;
  private isRewardedLoaded = false;
  private isRewardedShowing = false;
  private isInterstitialLoaded = false;
  private isInterstitialLoading = false;
  private isInterstitialShowing = false;
  private bannerListenersAttached = false;
  private bannerListenerHandles: PluginListenerHandle[] = [];

  private state: AdManagerState = {
    isPremium: false,
    matchesPlayedSinceLastInterstitial: 0,
    lastInterstitialTimestamp: Date.now(),
    activeBoost: null,
    lastRewardedAdTimestamp: 0,
  };

  private listeners: Array<(state: AdManagerState) => void> = [];

  constructor() {
    this.loadState();
    this.isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    // Safe lifecycle tracking - NO AdMob operations triggered on resume to prevent UI freezes
    if (this.isNative) {
      try {
        CapApp.addListener('appStateChange', (appState) => {
          console.log(`[APP] Activity lifecycle: stateChanged isActive = ${appState.isActive}`);
        });
      } catch (e) {
        console.warn('[APP] CapApp listener registration note:', e);
      }
    }
  }

  private log(message: string, ...args: any[]) {
    if (ADMOB_CONFIG.ENABLE_LOGS) {
      console.log(`[AdMob] ${message}`, ...args);
    }
  }

  private loadState() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const saved = localStorage.getItem(ADMOB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = {
          ...this.state,
          ...parsed,
        };
      }
    } catch (e) {
      this.log('Failed to load AdManager state from localStorage', e);
    }
  }

  private saveState() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.setItem(ADMOB_STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      this.log('Failed to save AdManager state to localStorage', e);
    }
  }

  public subscribe(callback: (state: AdManagerState) => void): () => void {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners() {
    for (const cb of this.listeners) {
      cb({ ...this.state });
    }
  }

  /**
   * Initializes the Google AdMob SDK and sets up one-time native listeners
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.isInitializing = true;
      this.log('Initializing AdMob SDK... (Test Mode:', ADMOB_CONFIG.IS_TEST_MODE, ')');

      try {
        if (this.isNative) {
          await AdMob.initialize({
            testingDevices: ADMOB_CONFIG.IS_TEST_MODE ? ['EMULATOR'] : undefined,
            initializeForTesting: ADMOB_CONFIG.IS_TEST_MODE,
          });

          console.log('[ADMOB] SDK initialized');

          // Setup Banner listeners ONCE to prevent listener leaks if banner is enabled
          if (ADMOB_CONFIG.ENABLE_BANNER && !this.bannerListenersAttached) {
            try {
              const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
                console.log('[ADMOB] Banner loaded');
                this.isBannerVisible = true;
                this.isBannerCreated = true;
                this.isBannerActive = true;
                this.isBannerLoading = false;
              });

              const failedHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => {
                console.warn('[ADMOB] Banner failed to load:', error);
                this.isBannerLoading = false;
                this.isBannerActive = false;
                // Strict requirement: Do not perform repetitive retries on failure
              });

              this.bannerListenerHandles.push(loadedHandle, failedHandle);
              this.bannerListenersAttached = true;
            } catch (listenerErr) {
              console.warn('[ADMOB] Banner listener registration notice:', listenerErr);
            }
          }

          this.log('Native AdMob SDK initialized successfully');
        } else {
          this.log('Web/Preview Mode: AdMob running in web simulation mode');
          console.log('[ADMOB] SDK initialized (web simulation mode)');
        }

        this.isInitialized = true;
        this.isInitializing = false;

        // Start loading native banner safely after UI/WebView settles cleanly without blocking
        if (ADMOB_CONFIG.ENABLE_BANNER) {
          setTimeout(() => {
            this.ensureBannerActive().catch((err) => {
              this.log('Background banner init non-blocking notice:', err);
            });
          }, 2500);
        }

        return true;
      } catch (error) {
        this.log('AdMob initialization error:', error);
        this.isInitializing = false;
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public init(): Promise<boolean> {
    return this.initialize();
  }

  /**
   * Ensures the persistent Banner Ad is active at the bottom of the screen.
   * - Single-instance guarantee: will not recreate or call loadAd() if already active.
   * - Never destroyed or hidden during matches or screen changes.
   * - Positioned above the bottom navigation bar (margin 58 DP).
   * - Uses real production Ad Unit ID: ca-app-pub-5272866425919152/4077924883
   * - Completely non-blocking and safe against UI freeze or white screen.
   */
  public async ensureBannerActive(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER || this.state.isPremium) {
      if (this.isBannerActive || this.isBannerCreated) {
        await this.destroyBanner();
      }
      return false;
    }

    // If banner is already created, active or in-flight loading, do NOT re-call showBanner()
    if (this.isBannerCreated || this.isBannerActive || this.isBannerLoading) {
      return true;
    }

    if (this.bannerOperationLock) {
      return false;
    }

    this.bannerOperationLock = true;
    this.isBannerLoading = true;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isNative) {
        const options: BannerAdOptions = {
          adId: ADMOB_CONFIG.BANNER_ID || ADMOB_CONFIG.BOTTOM_BANNER_ID || 'ca-app-pub-5272866425919152/4077924883',
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: BOTTOM_NAV_MARGIN_DP,
          isTesting: false,
        };

        await AdMob.showBanner(options);
        this.isBannerCreated = true;
        this.isBannerVisible = true;
        // Strict requirement: isBannerActive is set to true ONLY when BannerAdPluginEvents.Loaded fires!
        this.log('Native Banner Ad created, waiting for Loaded event');
      } else {
        this.isBannerVisible = true;
        this.isBannerActive = true;
      }

      return true;
    } catch (error) {
      this.log('Banner ensureActive notice:', error);
      this.isBannerLoading = false;
      this.isBannerActive = false;
      return false;
    } finally {
      this.isBannerLoading = false;
      this.bannerOperationLock = false;
    }
  }

  /**
   * Direct showBanner method
   */
  public async showBanner(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER) return false;
    return this.ensureBannerActive();
  }

  /**
   * Hide banner is ONLY used when user explicitly becomes Premium
   */
  public async hideBanner(): Promise<boolean> {
    if (!this.state.isPremium) {
      // User is not premium - per user request, banner MUST remain visible at all times
      return true;
    }
    return this.destroyBanner();
  }

  /**
   * Completely removes the native banner view (used when user purchases Premium)
   */
  public async destroyBanner(): Promise<boolean> {
    this.isBannerVisible = false;
    this.isBannerCreated = false;
    this.isBannerActive = false;
    this.isBannerLoading = false;

    if (this.isNative) {
      try {
        await AdMob.removeBanner();
      } catch (e) {
        this.log('Banner destroy notice:', e);
      }
    }
    return true;
  }

  /**
   * Check if Interstitial ad is ready in memory
   */
  public isInterstitialActive(): boolean {
    return false;
  }

  public isInterstitialShowingNow(): boolean {
    return false;
  }

  /**
   * Interstitial is completely disabled for stability and preventing freeze/white-screen.
   */
  public async loadInterstitial(): Promise<boolean> {
    return false;
  }

  /**
   * Shows Interstitial if enabled - otherwise calls onDismiss immediately and returns false.
   */
  public async showInterstitial(onDismiss?: () => void): Promise<boolean> {
    if (onDismiss) {
      try {
        onDismiss();
      } catch (e) {
        console.error('Error in onDismiss callback:', e);
      }
    }
    return false;
  }

  public shouldShowInterstitial(): boolean {
    return false;
  }

  /**
   * Preloads a Rewarded Video Ad in the background
   */
  public async loadRewarded(): Promise<boolean> {
    if (this.isRewardedLoaded) return true;

    try {
      if (this.isNative) {
        const options: RewardAdOptions = {
          adId: ADMOB_CONFIG.REWARDED_ID || 'ca-app-pub-5272866425919152/6872814469',
          isTesting: false,
        };
        await AdMob.prepareRewardVideoAd(options);
      }
      this.isRewardedLoaded = true;
      console.log('[ADMOB] Rewarded loaded');
      return true;
    } catch (error) {
      console.warn('[ADMOB] Rewarded failed:', error);
      this.isRewardedLoaded = false;
      return false;
    }
  }

  public isRewardedReady(): boolean {
    return this.isRewardedLoaded || !this.isNative;
  }

  /**
   * Plays a real Rewarded Video Ad for a specific player action:
   * 1. Injured Player: Accelerate healing -> onUserEarnedReward cures player immediately.
   * 2. Suspended Player: Cancel suspension -> onUserEarnedReward cancels suspension immediately.
   * 
   * Strict Rules:
   * - Uses real Ad Unit ID: ca-app-pub-5272866425919152/6872814469 (no test ads).
   * - If ad is not completed, reward is strictly NOT granted.
   * - Immediately loads a new Rewarded Ad after usage.
   * - Banner is NEVER destroyed or removed.
   * - Failure or timeout never hangs the UI or causes a white screen.
   */
  public async showRewardedForAction(params: {
    actionType: 'heal_player' | 'cancel_suspension';
    onUserEarnedReward: () => void;
    onDismiss?: (rewardEarned: boolean) => void;
    onFailure?: (error: any) => void;
  }): Promise<boolean> {
    if (this.isRewardedShowing) {
      this.log('Rewarded Ad already showing');
      return false;
    }

    this.isRewardedShowing = true;
    let rewardEarned = false;

    try {
      this.log(`Rewarded ad started for action: ${params.actionType}`);

      if (this.isNative) {
        // Prepare ad on demand with a 6-second safeguard timeout if not already loaded
        if (!this.isRewardedLoaded) {
          const prepareWithTimeout = Promise.race([
            this.loadRewarded(),
            new Promise<boolean>((_, reject) =>
              setTimeout(() => reject(new Error('Ad load timeout')), 6000)
            ),
          ]);

          try {
            const loaded = await prepareWithTimeout;
            if (!loaded) throw new Error('Ad unavailable');
          } catch (loadErr) {
            console.warn('[ADMOB] Rewarded failed to load on demand:', loadErr);
            this.isRewardedShowing = false;
            this.isRewardedLoaded = false;
            if (params.onFailure) params.onFailure(loadErr);
            return false;
          }
        }

        let rewardListener: PluginListenerHandle | null = null;
        let dismissListener: PluginListenerHandle | null = null;
        let failListener: PluginListenerHandle | null = null;

        const cleanup = () => {
          if (rewardListener) {
            rewardListener.remove();
            rewardListener = null;
          }
          if (dismissListener) {
            dismissListener.remove();
            dismissListener = null;
          }
          if (failListener) {
            failListener.remove();
            failListener = null;
          }
        };

        // 1. Listen for user earned reward (onUserEarnedReward)
        rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          console.log('[ADMOB] Rewarded earned:', reward);
          rewardEarned = true;
          this.recordRewardedAdSuccess();
          try {
            params.onUserEarnedReward();
          } catch (err) {
            console.error('Error executing onUserEarnedReward:', err);
          }
        });

        // 2. Listen for ad dismissal
        dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.log(`Rewarded ad dismissed. Reward earned: ${rewardEarned}`);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          cleanup();

          if (params.onDismiss) {
            try {
              params.onDismiss(rewardEarned);
            } catch (err) {
              console.error('Error in onDismiss callback:', err);
            }
          }
        });

        // 3. Listen for presentation failure
        failListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err: any) => {
          console.warn('[ADMOB] Rewarded failed to show:', err);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          cleanup();

          if (params.onFailure) {
            try {
              params.onFailure(err);
            } catch (cbErr) {
              console.error('Error in onFailure callback:', cbErr);
            }
          }
        });

        // Show the Rewarded Video Ad natively
        await AdMob.showRewardVideoAd();
      } else {
        // Web Simulation Mode for browser testing
        this.log('Rewarded ad Web Simulation');
        const actionLabel = params.actionType === 'heal_player' 
          ? 'تسريع علاج اللاعب المصاب' 
          : 'إلغاء عقوبة إيقاف اللاعب';
        
        const confirmed = window.confirm(
          `🎬 [إعلان AdMob بمكافأة - Rewarded Ad]\n\nهل ترغب في محاكاة إكمال مشاهدة إعلان الفيديو بالكامل لـ (${actionLabel})؟\n\n- موافق (OK): اكتمال الإعلان بنجاح ومنح المكافأة فوراً (onUserEarnedReward).\n- إلغاء (Cancel): إغلاق الإعلان قبل اكتماله (لن يتم تطبيق المكافأة).`
        );

        if (confirmed) {
          rewardEarned = true;
          console.log('[ADMOB] Rewarded rewarded: (web simulated reward)');
          this.recordRewardedAdSuccess();
          params.onUserEarnedReward();
        }

        this.isRewardedShowing = false;
        if (params.onDismiss) {
          params.onDismiss(rewardEarned);
        }
      }

      return true;
    } catch (error) {
      console.warn('[ADMOB] Rewarded failed:', error);
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      if (params.onFailure) params.onFailure(error);
      return false;
    }
  }

  /**
   * Plays a Rewarded Video Ad with complete lifecycle management (General rewards)
   */
  public async showRewarded(
    rewardType: AdRewardType,
    onRewardEarnedCallback?: (result: AdRewardClaimResult) => void,
    onDismissCallback?: () => void,
    onFailureHandler?: (error: any) => void
  ): Promise<boolean> {
    if (this.isRewardedShowing) return false;

    const sessionId = AdRewardManager.createAdSession(rewardType);
    this.isRewardedShowing = true;
    let rewardEarnedNatively = false;

    try {
      this.log(`Rewarded Showing for ${rewardType} (Session: ${sessionId})...`);

      if (this.isNative) {
        if (!this.isRewardedLoaded) {
          const prepareWithTimeout = Promise.race([
            this.loadRewarded(),
            new Promise<boolean>((_, reject) =>
              setTimeout(() => reject(new Error('Ad load timeout')), 6000)
            ),
          ]);

          try {
            const loaded = await prepareWithTimeout;
            if (!loaded) throw new Error('Ad unavailable');
          } catch (loadErr) {
            console.warn('[ADMOB] Rewarded failed to load on demand:', loadErr);
            this.isRewardedShowing = false;
            this.isRewardedLoaded = false;
            if (onFailureHandler) onFailureHandler(loadErr);
            return false;
          }
        }

        let rewardListener: PluginListenerHandle | null = null;
        let dismissListener: PluginListenerHandle | null = null;
        let failListener: PluginListenerHandle | null = null;

        const cleanup = () => {
          if (rewardListener) rewardListener.remove();
          if (dismissListener) dismissListener.remove();
          if (failListener) failListener.remove();
        };

        rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          console.log('[ADMOB] Rewarded earned:', reward);
          rewardEarnedNatively = true;
          this.recordRewardedAdSuccess();

          const claimResult = AdRewardManager.verifyAndConsumeReward(sessionId, rewardType);
          if (claimResult.success && onRewardEarnedCallback) {
            onRewardEarnedCallback(claimResult);
          }
        });

        dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.log('Rewarded dismissed');
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          cleanup();

          if (onDismissCallback) onDismissCallback();
        });

        failListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {
          console.warn('[ADMOB] Rewarded failed to show:', err);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          cleanup();
          if (onFailureHandler) onFailureHandler(err);
        });

        await AdMob.showRewardVideoAd();
      } else {
        // Web Simulation Mode
        this.log('Rewarded Showing (Web Simulation)...');
        console.log('[ADMOB] Rewarded rewarded: (web simulated reward)');
        rewardEarnedNatively = true;
        this.recordRewardedAdSuccess();

        const claimResult = AdRewardManager.verifyAndConsumeReward(sessionId, rewardType);
        if (claimResult.success && onRewardEarnedCallback) {
          onRewardEarnedCallback(claimResult);
        }

        this.isRewardedShowing = false;
        if (onDismissCallback) onDismissCallback();
      }

      return true;
    } catch (error) {
      console.warn('[ADMOB] Rewarded failed:', error);
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      if (onFailureHandler) onFailureHandler(error);
      return false;
    }
  }

  public showRewardedAd(
    rewardType: AdRewardType,
    onRewardEarnedCallback?: (result: AdRewardClaimResult) => void,
    onDismissCallback?: () => void,
    onFailureHandler?: (error: any) => void
  ): Promise<boolean> {
    return this.showRewarded(rewardType, onRewardEarnedCallback, onDismissCallback, onFailureHandler);
  }

  private recordRewardedAdSuccess() {
    this.state.lastRewardedAdTimestamp = Date.now();
    this.saveState();
  }

  /**
   * Called when a match completes.
   * Interstitial is disabled for stability, so game continues immediately without delay or UI freeze.
   */
  public onMatchCompleted(onAfterAd?: () => void): { shouldShowInterstitial: boolean } {
    if (onAfterAd) onAfterAd();
    return { shouldShowInterstitial: false };
  }

  public activateTrainingBoost(
    type: TrainingBoostType,
    currentRound: number,
    dateStr: string
  ): ActiveTrainingBoost {
    const titles: Record<TrainingBoostType, string> = {
      fitness: '🏋️ تدريب اللياقة البدنية المكثف',
      attacking: '⚽ تدريب الفعالية الهجومية والإنهاء',
      defensive: '🛡️ تدريب الصلابة الدفاعية والتمركز',
      tactical: '🧠 تدريب الاستيعاب التكتيكي والانضباط',
    };

    const descriptions: Record<TrainingBoostType, string> = {
      fitness: 'يحافظ على طاقة اللاعبين ويمنح +5% كفاءة بدنية ومقاومة للإرهاق طوال الـ 90 دقيقة.',
      attacking: 'يعزز دقة اللمسة الأخيرة بنسبة +5% ويزيد فرص التسجيل في الهجمات الخطيرة.',
      defensive: 'يقوي المنظومة الدفاعية بنسبة +5% ويرفع نسبة استخلاص الكرة والتصديات.',
      tactical: 'يحسن تنفيذ خطة اللعب والتحرك الجماعي بدون كرة بنسبة +5%.',
    };

    const boost: ActiveTrainingBoost = {
      type,
      title: titles[type],
      description: descriptions[type],
      activatedAtRound: currentRound,
      activatedAtDateStr: dateStr,
      bonusValue: 0.05,
      isConsumed: false,
    };

    this.state.activeBoost = boost;
    this.saveState();
    this.log(`Training Boost Activated: ${boost.title}`);
    return boost;
  }

  public consumeTrainingBoost(): void {
    if (this.state.activeBoost) {
      this.log(`Training Boost Consumed: ${this.state.activeBoost.title}`);
      this.state.activeBoost = null;
      this.saveState();
    }
  }

  public getActiveTrainingBoost(): ActiveTrainingBoost | null {
    return this.state.activeBoost;
  }

  public isPremium(): boolean {
    return this.state.isPremium;
  }

  public setPremium(premium: boolean): void {
    this.state.isPremium = premium;
    if (premium) {
      this.destroyBanner();
    }
    this.saveState();
    this.log(`Premium status updated: ${premium}`);
  }

  public getState(): AdManagerState {
    return { ...this.state };
  }
}

export const AdManager = new AdManagerService();
export default AdManager;
