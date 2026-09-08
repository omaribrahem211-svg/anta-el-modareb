import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  RewardAdOptions,
  RewardAdPluginEvents,
  BannerAdPluginEvents,
  AdMobRewardItem,
} from '@capacitor-community/admob';
import { ADMOB_CONFIG } from '../config/admobConfig';
import { AdManagerState, ActiveTrainingBoost, TrainingBoostType } from '../types/game';
import { AdRewardManager, AdRewardType, AdRewardClaimResult } from './adRewardService';

const ADMOB_STORAGE_KEY = 'modareb_admob_state_v1';
const BOTTOM_NAV_MARGIN_DP = 58; // Sits above the bottom navigation bar

class AdManagerService {
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private isNative = false;

  // Banner State
  private isBannerVisible = false;
  private isBannerCreated = false;
  private isBannerActive = false;
  private isBannerLoading = false;
  private bannerListenersAttached = false;
  private bannerListenerHandles: PluginListenerHandle[] = [];

  // Rewarded State
  private isRewardedLoading = false;
  private isRewardedLoaded = false;
  private isRewardedShowing = false;
  private rewardedLoadPromise: Promise<boolean> | null = null;

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
   * Initializes the Google AdMob SDK cleanly in the background.
   * STRICT GUARANTEES:
   * - Never blocks React or WebView from launching.
   * - No preloading of Rewarded or Interstitial ads.
   * - Banner listeners attached once.
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.isInitializing = true;
      this.log('Initializing AdMob SDK... (Native:', this.isNative, ')');

      try {
        if (this.isNative) {
          await AdMob.initialize({
            testingDevices: ADMOB_CONFIG.IS_TEST_MODE ? ['EMULATOR'] : undefined,
            initializeForTesting: ADMOB_CONFIG.IS_TEST_MODE,
          });
          console.log('[ADMOB] SDK initialized');

          // Attach persistent banner listeners once
          await this.attachBannerListeners();
        } else {
          console.log('[ADMOB] SDK initialized (web simulation mode)');
        }

        this.isInitialized = true;
        this.isInitializing = false;
        console.log('[STARTUP] AdManager initialized', Math.round(performance.now()) + 'ms');

        return true;
      } catch (error) {
        console.warn('[ADMOB] SDK initialization error (app continues normally):', error);
        this.isInitialized = false;
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
   * Attaches Banner listeners once to handle load and failure events.
   */
  private async attachBannerListeners(): Promise<void> {
    if (this.bannerListenersAttached || !this.isNative) return;

    try {
      const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        console.log('[ADMOB] Banner loaded');
        this.isBannerActive = true;
        this.isBannerLoading = false;
        this.isBannerCreated = true;
        this.isBannerVisible = true;
      });

      const failedHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => {
        console.warn('[ADMOB] Banner failed to load:', error);
        this.isBannerActive = false;
        this.isBannerLoading = false;
        // Strict requirement: Log only, do NOT enter retry loop.
      });

      this.bannerListenerHandles.push(loadedHandle, failedHandle);
      this.bannerListenersAttached = true;
    } catch (e) {
      console.warn('[ADMOB] Error registering banner listeners:', e);
    }
  }

  /**
   * Ensures the persistent Bottom Banner Ad is active.
   * - Single-instance guarantee: does not call showBanner if already created or active.
   * - Uses: ca-app-pub-5272866425919152/4077924883
   * - Position: BOTTOM_CENTER, Size: BANNER
   * - Active is set to true ONLY after BannerAdPluginEvents.Loaded event fires.
   */
  public async ensureBannerActive(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER || this.state.isPremium) {
      if (this.isBannerActive || this.isBannerCreated) {
        await this.destroyBanner();
      }
      return false;
    }

    // Single-instance guarantee: Do not re-call if already active, created, or loading
    if (this.isBannerActive || this.isBannerCreated || this.isBannerLoading) {
      return true;
    }

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
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };

        await AdMob.showBanner(options);
        this.isBannerCreated = true;
        this.isBannerVisible = true;
        // isBannerActive remains false until BannerAdPluginEvents.Loaded fires!
        this.log('Native Banner Ad request sent, awaiting Loaded event');
      } else {
        this.isBannerCreated = true;
        this.isBannerVisible = true;
        this.isBannerActive = true;
        this.isBannerLoading = false;
      }

      return true;
    } catch (error) {
      console.warn('[ADMOB] Banner showBanner error:', error);
      this.isBannerActive = false;
      this.isBannerLoading = false;
      return false;
    }
  }

  public async showBanner(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER) return false;
    return this.ensureBannerActive();
  }

  public async hideBanner(): Promise<boolean> {
    if (!this.state.isPremium) return true;
    return this.destroyBanner();
  }

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

  public isBannerReady(): boolean {
    return this.isBannerActive;
  }

  // ==========================================
  // INTERSTITIAL ADS (COMPLETELY DISABLED)
  // ==========================================

  public isInterstitialActive(): boolean {
    return false;
  }

  public isInterstitialShowingNow(): boolean {
    return false;
  }

  public shouldShowInterstitial(): boolean {
    return false;
  }

  public async loadInterstitial(): Promise<boolean> {
    return false;
  }

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

  public onMatchCompleted(onAfterAd?: () => void): { shouldShowInterstitial: boolean } {
    if (onAfterAd) onAfterAd();
    return { shouldShowInterstitial: false };
  }

  // ==========================================
  // REWARDED ADS (ON-DEMAND ONLY)
  // ==========================================

  public isRewardedReady(): boolean {
    return this.isRewardedLoaded || !this.isNative;
  }

  /**
   * Loads a Rewarded Video Ad on demand when the player requests it.
   * Strict Guarantees:
   * - No preload at startup.
   * - Uses: ca-app-pub-5272866425919152/6872814469
   * - Waits for actual load event with a safe timeout (default 8000ms).
   * - Resolves false immediately on timeout or error without freezing the UI.
   */
  public async loadRewarded(timeoutMs: number = 8000): Promise<boolean> {
    if (this.isRewardedLoaded) return true;
    if (this.isRewardedLoading && this.rewardedLoadPromise) {
      return this.rewardedLoadPromise;
    }

    if (!this.isNative) {
      this.isRewardedLoaded = true;
      return true;
    }

    this.isRewardedLoading = true;

    this.rewardedLoadPromise = new Promise<boolean>(async (resolve) => {
      let settled = false;
      let timer: NodeJS.Timeout | null = null;
      let loadedListener: PluginListenerHandle | null = null;
      let failedListener: PluginListenerHandle | null = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (loadedListener) {
          loadedListener.remove();
          loadedListener = null;
        }
        if (failedListener) {
          failedListener.remove();
          failedListener = null;
        }
        this.isRewardedLoading = false;
        this.rewardedLoadPromise = null;
      };

      // Safe timeout for loading
      timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.isRewardedLoaded = false;
          cleanup();
          console.warn(`[ADMOB] Rewarded load timed out after ${timeoutMs}ms`);
          resolve(false);
        }
      }, timeoutMs);

      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        // Listen for actual Loaded event
        loadedListener = await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
          if (!settled) {
            settled = true;
            this.isRewardedLoaded = true;
            cleanup();
            console.log('[ADMOB] Rewarded loaded');
            resolve(true);
          }
        });

        // Listen for FailedToLoad event
        failedListener = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (err: any) => {
          if (!settled) {
            settled = true;
            this.isRewardedLoaded = false;
            cleanup();
            console.warn('[ADMOB] Rewarded failed to load:', err);
            resolve(false);
          }
        });

        const options: RewardAdOptions = {
          adId: ADMOB_CONFIG.REWARDED_ID || 'ca-app-pub-5272866425919152/6872814469',
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };

        // Trigger prepare in native SDK
        AdMob.prepareRewardVideoAd(options).catch((err: any) => {
          if (!settled) {
            settled = true;
            this.isRewardedLoaded = false;
            cleanup();
            console.warn('[ADMOB] prepareRewardVideoAd rejected:', err);
            resolve(false);
          }
        });
      } catch (ex) {
        if (!settled) {
          settled = true;
          this.isRewardedLoaded = false;
          cleanup();
          console.warn('[ADMOB] loadRewarded exception:', ex);
          resolve(false);
        }
      }
    });

    return this.rewardedLoadPromise;
  }

  /**
   * Executes a native Rewarded Video Ad with complete safety:
   * - Checks or loads on demand.
   * - Safeguard timeouts around presentation & entire ad lifecycle.
   * - NEVER leaves isRewardedShowing stuck in true.
   * - Grants reward ONLY upon RewardAdPluginEvents.Rewarded.
   * - Cleans up listeners and preloads next ad in background after dismissal.
   */
  private async executeRewardedAd(params: {
    rewardTypeLabel: string;
    onRewardEarned: () => void;
    onDismiss?: (rewardEarned: boolean) => void;
    onFailure?: (error: any) => void;
  }): Promise<boolean> {
    if (this.isRewardedShowing) {
      this.log('Rewarded Ad is already showing, ignoring duplicate call');
      return false;
    }

    this.isRewardedShowing = true;
    let rewardEarned = false;

    try {
      this.log(`Starting Rewarded Ad for: ${params.rewardTypeLabel}`);

      if (this.isNative) {
        // 1. Ensure ad is loaded on demand with timeout
        if (!this.isRewardedLoaded) {
          const loaded = await this.loadRewarded(7000);
          if (!loaded) {
            this.isRewardedShowing = false;
            this.isRewardedLoaded = false;
            const err = new Error('تعذر تحميل الإعلان حالياً');
            if (params.onFailure) params.onFailure(err);
            return false;
          }
        }

        let rewardListener: PluginListenerHandle | null = null;
        let dismissListener: PluginListenerHandle | null = null;
        let failListener: PluginListenerHandle | null = null;
        let showedListener: PluginListenerHandle | null = null;
        let presentationTimer: NodeJS.Timeout | null = null;
        let sessionTimer: NodeJS.Timeout | null = null;
        let adHasShown = false;
        let isCleanedUp = false;

        const cleanup = () => {
          if (isCleanedUp) return;
          isCleanedUp = true;

          if (presentationTimer) {
            clearTimeout(presentationTimer);
            presentationTimer = null;
          }
          if (sessionTimer) {
            clearTimeout(sessionTimer);
            sessionTimer = null;
          }
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
          if (showedListener) {
            showedListener.remove();
            showedListener = null;
          }

          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
        };

        // Critical Safeguard 1: If ad does not appear within 7 seconds, abort
        presentationTimer = setTimeout(() => {
          if (!adHasShown && this.isRewardedShowing) {
            console.warn('[ADMOB] Presentation timeout: Ad did not show within 7s');
            cleanup();
            if (params.onFailure) {
              params.onFailure(new Error('انتهت مهلة عرض الإعلان'));
            }
          }
        }, 7000);

        // Critical Safeguard 2: Master session timeout (90 seconds maximum ad duration)
        // Ensures Promise or state NEVER hangs indefinitely
        sessionTimer = setTimeout(() => {
          if (this.isRewardedShowing) {
            console.warn('[ADMOB] Master session timeout reached (90s)');
            cleanup();
            if (params.onDismiss) {
              params.onDismiss(rewardEarned);
            }
          }
        }, 90000);

        // A. Listen for presentation start
        showedListener = await AdMob.addListener(RewardAdPluginEvents.Showed, () => {
          adHasShown = true;
          if (presentationTimer) {
            clearTimeout(presentationTimer);
            presentationTimer = null;
          }
          console.log('[ADMOB] Rewarded ad showed successfully');
        });

        // B. Listen for Reward Earned
        rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          console.log('[ADMOB] Rewarded earned:', reward);
          rewardEarned = true;
          this.recordRewardedAdSuccess();
          try {
            params.onRewardEarned();
          } catch (err) {
            console.error('Error in onRewardEarned callback:', err);
          }
        });

        // C. Listen for Dismissed
        dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          console.log(`[ADMOB] Rewarded dismissed. Reward earned: ${rewardEarned}`);
          cleanup();

          if (params.onDismiss) {
            try {
              params.onDismiss(rewardEarned);
            } catch (err) {
              console.error('Error in onDismiss callback:', err);
            }
          }
        });

        // D. Listen for FailedToShow
        failListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err: any) => {
          console.warn('[ADMOB] Rewarded failed to show:', err);
          cleanup();

          if (params.onFailure) {
            try {
              params.onFailure(err);
            } catch (cbErr) {
              console.error('Error in onFailure callback:', cbErr);
            }
          }
        });

        // Critical Safeguard 3: Safe show call with catch
        // In @capacitor-community/admob, showRewardVideoAd Promise may only resolve on reward,
        // so we must catch rejections and NEVER let it block the main flow
        AdMob.showRewardVideoAd().catch((showError: any) => {
          console.warn('[ADMOB] showRewardVideoAd rejected:', showError);
          if (!adHasShown) {
            cleanup();
            if (params.onFailure) {
              params.onFailure(showError);
            }
          }
        });
      } else {
        // Web Simulation Mode
        this.log('Rewarded Ad - Web Simulation');
        const confirmed = window.confirm(
          `🎬 [إعلان AdMob بمكافأة - Rewarded Ad]\n\nهل ترغب في محاكاة إكمال مشاهدة إعلان الفيديو بالكامل لـ (${params.rewardTypeLabel})؟\n\n- موافق (OK): اكتمال الإعلان بنجاح ومنح المكافأة فوراً.\n- إلغاء (Cancel): إغلاق الإعلان قبل اكتماله (لن يتم منح أي مكافأة).`
        );

        if (confirmed) {
          rewardEarned = true;
          this.recordRewardedAdSuccess();
          console.log('[ADMOB] Rewarded rewarded (web simulation)');
          params.onRewardEarned();
        }

        this.isRewardedShowing = false;
        if (params.onDismiss) {
          params.onDismiss(rewardEarned);
        }
      }

      return true;
    } catch (error) {
      console.warn('[ADMOB] executeRewardedAd exception:', error);
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      if (params.onFailure) params.onFailure(error);
      return false;
    }
  }

  /**
   * Action-specific Rewarded Ads (e.g. heal injured player, cancel suspension)
   */
  public async showRewardedForAction(params: {
    actionType: 'heal_player' | 'cancel_suspension';
    onUserEarnedReward: () => void;
    onDismiss?: (rewardEarned: boolean) => void;
    onFailure?: (error: any) => void;
  }): Promise<boolean> {
    const label = params.actionType === 'heal_player' ? 'تسريع علاج اللاعب المصاب' : 'إلغاء عقوبة إيقاف اللاعب';
    return this.executeRewardedAd({
      rewardTypeLabel: label,
      onRewardEarned: params.onUserEarnedReward,
      onDismiss: params.onDismiss,
      onFailure: params.onFailure,
    });
  }

  /**
   * General Rewarded Ads (Coins, Club Funds, Team Energy, Training Boost)
   */
  public async showRewarded(
    rewardType: AdRewardType,
    onRewardEarnedCallback?: (result: AdRewardClaimResult) => void,
    onDismissCallback?: () => void,
    onFailureHandler?: (error: any) => void
  ): Promise<boolean> {
    const sessionId = AdRewardManager.createAdSession(rewardType);

    return this.executeRewardedAd({
      rewardTypeLabel: rewardType,
      onRewardEarned: () => {
        const claimResult = AdRewardManager.verifyAndConsumeReward(sessionId, rewardType);
        if (claimResult.success && onRewardEarnedCallback) {
          onRewardEarnedCallback(claimResult);
        }
      },
      onDismiss: () => {
        if (onDismissCallback) onDismissCallback();
      },
      onFailure: onFailureHandler,
    });
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

  // ==========================================
  // TRAINING BOOSTS & PREMIUM
  // ==========================================

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
