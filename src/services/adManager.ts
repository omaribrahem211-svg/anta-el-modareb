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
import { ADMOB_CONFIG, TEST_AD_IDS } from '../config/admobConfig';
import { AdManagerState, ActiveTrainingBoost, TrainingBoostType } from '../types/game';
import { AdRewardManager, AdRewardType, AdRewardClaimResult } from './adRewardService';

const ADMOB_STORAGE_KEY = 'modareb_admob_state_v1';
const BOTTOM_NAV_MARGIN_DP = 58; // Sits above the bottom navigation bar

class AdManagerService {
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private isNative = false;

  // Banner State (In-Content Banner below Facebook)
  private isBannerVisible = false;
  private isBannerCreated = false;
  private isBannerActive = false;
  private isBannerLoading = false;
  private bannerListenersAttached = false;
  private bannerListenerHandles: PluginListenerHandle[] = [];

  // Top In-Content Banner State
  private isTopBannerActive = true;
  private isTopBannerLoading = false;
  private isTopBannerCreated = true;

  // Rewarded State
  private isRewardedLoading = false;
  private isRewardedLoaded = false;
  private isRewardedShowing = false;
  private rewardedLoadPromise: Promise<boolean> | null = null;
  private rewardedListenerHandles: PluginListenerHandle[] = [];

  private async cleanupRewardedListeners() {
    while (this.rewardedListenerHandles.length > 0) {
      const handle = this.rewardedListenerHandles.pop();
      if (handle) {
        try {
          await handle.remove();
        } catch {
          // ignore
        }
      }
    }
  }

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
          console.log('[BANNER_TEST] Banner completely disabled');

          // [BANNER_TEST] Banner listeners skipped in isolation test
          if (ADMOB_CONFIG.ENABLE_BANNER) {
            await this.attachBannerListeners();
          }
        } else {
          console.log('[ADMOB] SDK initialized (web simulation mode)');
          console.log('[BANNER_TEST] Banner completely disabled');
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
    if (!ADMOB_CONFIG.ENABLE_BANNER || this.bannerListenersAttached || !this.isNative) return;

    try {
      const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        console.log('[ADMOB_BANNER_LOADED] Banner loaded successfully and is now active');
        this.isBannerActive = true;
        this.isBannerLoading = false;
        this.isBannerCreated = true;
        this.isBannerVisible = true;
      });

      const failedHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, async (error: any) => {
        const errCode = (error && (error.code ?? error.errorCode)) ?? 'UNKNOWN';
        const errMsg = (error && (error.message ?? error.errorMessage)) ?? (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.warn(`[ADMOB_BANNER_FAILED] Code: ${errCode} | Message: ${errMsg}`);

        this.isBannerActive = false;
        this.isBannerLoading = false;
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
   * - Uses: ca-app-pub-5272866425919152/4077924883 (or configured ID)
   * - Position: BOTTOM_CENTER, Size: BANNER
   * - Positioned right above the bottom navigation bar (margin: 58dp)
   */
  public async ensureBannerActive(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER) {
      return false;
    }

    if (this.state.isPremium) {
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

      await this.attachBannerListeners();

      if (this.isNative) {
        const bannerAdId = ADMOB_CONFIG.IS_TEST_MODE
          ? TEST_AD_IDS.BANNER_ID
          : (ADMOB_CONFIG.BANNER_ID || ADMOB_CONFIG.BOTTOM_BANNER_ID || 'ca-app-pub-5272866425919152/4077924883');

        const options: BannerAdOptions = {
          adId: bannerAdId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: BOTTOM_NAV_MARGIN_DP,
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };

        console.log('[ADMOB_BANNER] Requesting native banner ad:', bannerAdId, 'position: BOTTOM_CENTER');
        await AdMob.showBanner(options);
        this.isBannerCreated = true;
        this.isBannerVisible = true;
        this.isBannerActive = true;
        this.isBannerLoading = false;
        this.log('Native AdMob Banner requested successfully');
      } else {
        this.isBannerCreated = true;
        this.isBannerVisible = true;
        this.isBannerActive = true;
        this.isBannerLoading = false;
      }

      return true;
    } catch (error) {
      console.error('[ADMOB] Banner showBanner error:', error);
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
    if (!ADMOB_CONFIG.ENABLE_BANNER) return true;
    return this.destroyBanner();
  }

  public async destroyBanner(): Promise<boolean> {
    this.isBannerVisible = false;
    this.isBannerCreated = false;
    this.isBannerActive = false;
    this.isBannerLoading = false;

    if (!ADMOB_CONFIG.ENABLE_BANNER) {
      return true;
    }

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
  // TOP IN-CONTENT BANNER (BELOW FACEBOOK SECTION)
  // ==========================================

  public async ensureTopBannerActive(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER || this.state.isPremium) {
      return false;
    }

    this.isTopBannerCreated = true;
    this.isTopBannerActive = true;
    this.isTopBannerLoading = false;
    return true;
  }

  // ==========================================
  // MATCH PROGRESSION (INTERSTITIAL ADS REMOVED)
  // ==========================================

  public onMatchCompleted(fixtureId?: string, onAfterAd?: () => void): { shouldShowInterstitial: boolean } {
    if (onAfterAd) {
      try {
        onAfterAd();
      } catch (e) {
        console.error('Error in onAfterAd callback:', e);
      }
    }
    return { shouldShowInterstitial: false };
  }

  // ==========================================
  // REWARDED ADS (ON-DEMAND ONLY, PRODUCTION)
  // ==========================================

  public isRewardedReady(): boolean {
    return this.isRewardedLoaded || !this.isNative;
  }

  /**
   * Loads a Rewarded Video Ad strictly on demand when the player requests it.
   * Strict Guarantees:
   * - No preload at startup.
   * - Production ID: ca-app-pub-5272866425919152/6872814469
   * - isTesting: false (No test mode fallback)
   * - Detailed logging of error code and error message for diagnosis.
   * - Never freezes the game.
   */
  public async loadRewarded(timeoutMs: number = 15000): Promise<boolean> {
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

      const finish = async (success: boolean) => {
        if (settled) return;
        settled = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        await this.cleanupRewardedListeners();
        this.isRewardedLoading = false;
        this.isRewardedLoaded = success;
        this.rewardedLoadPromise = null;
        resolve(success);
      };

      // Safe timeout for loading so game never hangs
      timer = setTimeout(() => {
        console.error(`[ADMOB_PRODUCTION_REWARDED_TIMEOUT] Load timed out after ${timeoutMs}ms`);
        finish(false);
      }, timeoutMs);

      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        await this.cleanupRewardedListeners();

        const productionRewardedId = ADMOB_CONFIG.REWARDED_ID || 'ca-app-pub-5272866425919152/6872814469';

        // 1. Listen for Loaded event
        const loadedHandle = await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
          console.log('[ADMOB_PRODUCTION_REWARDED_LOADED] Ad loaded successfully with unit ID:', productionRewardedId);
          finish(true);
        });
        this.rewardedListenerHandles.push(loadedHandle);

        // 2. Listen for FailedToLoad event - extract Code & Message, never replace with test ad
        const failedHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, async (err: any) => {
          const errCode = (err && (err.code ?? err.errorCode)) ?? 'UNKNOWN';
          const errMsg = (err && (err.message ?? err.errorMessage)) ?? (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.error(`[ADMOB_PRODUCTION_REWARDED_LOAD_FAILED] Code: ${errCode} | Message: ${errMsg}`, err);
          finish(false);
        });
        this.rewardedListenerHandles.push(failedHandle);

        const options: RewardAdOptions = {
          adId: productionRewardedId,
          isTesting: false, // Strict production ad
        };

        console.log('[ADMOB_PRODUCTION_REWARDED] Preparing production rewarded ad:', productionRewardedId);
        AdMob.prepareRewardVideoAd(options).catch((err: any) => {
          const errCode = (err && (err.code ?? err.errorCode)) ?? 'UNKNOWN';
          const errMsg = (err && (err.message ?? err.errorMessage)) ?? (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.error(`[ADMOB_PRODUCTION_REWARDED_PREPARE_ERROR] Code: ${errCode} | Message: ${errMsg}`, err);
          finish(false);
        });
      } catch (ex: any) {
        console.error('[ADMOB_PRODUCTION_REWARDED_EXCEPTION]', ex);
        finish(false);
      }
    });

    return this.rewardedLoadPromise;
  }

  /**
   * Executes a native Rewarded Video Ad with complete safety:
   * - Checks or loads on demand.
   * - Safeguard timeouts around presentation & entire ad lifecycle.
   * - NEVER leaves isRewardedShowing or isRewardedLoaded stuck in true.
   * - Grants reward ONLY upon RewardAdPluginEvents.Rewarded.
   * - Cleans up all listeners on dismissal or failure.
   */
  private async executeRewardedAd(params: {
    rewardTypeLabel: string;
    onRewardEarned: () => void;
    onDismiss?: (rewardEarned: boolean) => void;
    onFailure?: (error: any) => void;
  }): Promise<boolean> {
    if (this.isRewardedShowing || this.isRewardedLoading) {
      console.warn('[REWARDED] Busy: Rewarded Ad is already loading or showing');
      return false;
    }

    this.isRewardedShowing = true;
    let rewardEarned = false;

    try {
      this.log(`Starting Production Rewarded Ad for: ${params.rewardTypeLabel}`);

      if (this.isNative) {
        // 1. Ensure ad is loaded on demand with timeout
        if (!this.isRewardedLoaded) {
          const loaded = await this.loadRewarded(15000);
          if (!loaded) {
            this.isRewardedShowing = false;
            this.isRewardedLoaded = false;
            const err = new Error('تعذر تحميل الإعلان حالياً');
            if (params.onFailure) params.onFailure(err);
            return false;
          }
        }

        let presentationTimer: NodeJS.Timeout | null = null;
        let sessionTimer: NodeJS.Timeout | null = null;
        let adHasShown = false;
        let isCleanedUp = false;

        const cleanup = async () => {
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

          await this.cleanupRewardedListeners();
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          this.isRewardedLoading = false;
        };

        // Clean any previous listeners before registering presentation listeners
        await this.cleanupRewardedListeners();

        // Critical Safeguard 1: If ad does not appear within 7 seconds, abort safely
        presentationTimer = setTimeout(async () => {
          if (!adHasShown && this.isRewardedShowing) {
            console.error('[ADMOB_PRODUCTION_REWARDED_TIMEOUT] Presentation timeout (7s)');
            await cleanup();
            if (params.onFailure) {
              params.onFailure(new Error('انتهت مهلة عرض الإعلان'));
            }
          }
        }, 7000);

        // Critical Safeguard 2: Master session timeout (90 seconds maximum ad duration)
        sessionTimer = setTimeout(async () => {
          if (this.isRewardedShowing) {
            console.warn('[ADMOB_PRODUCTION_REWARDED_MASTER_TIMEOUT] Master session timeout reached (90s)');
            await cleanup();
            if (params.onDismiss) {
              params.onDismiss(rewardEarned);
            }
          }
        }, 90000);

        // A. Listen for presentation start
        const showedHandle = await AdMob.addListener(RewardAdPluginEvents.Showed, () => {
          adHasShown = true;
          if (presentationTimer) {
            clearTimeout(presentationTimer);
            presentationTimer = null;
          }
          console.log('[ADMOB_PRODUCTION_REWARDED] Show started');
        });
        this.rewardedListenerHandles.push(showedHandle);

        // B. Listen for Reward Earned (strictly only grant reward here!)
        const rewardHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          console.log('[ADMOB_PRODUCTION_REWARDED] Rewarded earned:', reward);
          rewardEarned = true;
          this.recordRewardedAdSuccess();
          try {
            params.onRewardEarned();
          } catch (err) {
            console.error('Error in onRewardEarned callback:', err);
          }
        });
        this.rewardedListenerHandles.push(rewardHandle);

        // C. Listen for Dismissed
        const dismissHandle = await AdMob.addListener(RewardAdPluginEvents.Dismissed, async () => {
          console.log(`[ADMOB_PRODUCTION_REWARDED] Dismissed (rewardEarned: ${rewardEarned})`);
          await cleanup();

          if (params.onDismiss) {
            try {
              params.onDismiss(rewardEarned);
            } catch (err) {
              console.error('Error in onDismiss callback:', err);
            }
          }
        });
        this.rewardedListenerHandles.push(dismissHandle);

        // D. Listen for FailedToShow - log code and message, never freeze
        const failHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, async (err: any) => {
          const errCode = (err && (err.code ?? err.errorCode)) ?? 'UNKNOWN';
          const errMsg = (err && (err.message ?? err.errorMessage)) ?? (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.error(`[ADMOB_PRODUCTION_REWARDED_SHOW_FAILED] Code: ${errCode} | Message: ${errMsg}`, err);
          await cleanup();

          if (params.onFailure) {
            try {
              params.onFailure(err);
            } catch (cbErr) {
              console.error('Error in onFailure callback:', cbErr);
            }
          }
        });
        this.rewardedListenerHandles.push(failHandle);

        // Trigger show in native SDK
        AdMob.showRewardVideoAd().catch(async (showError: any) => {
          const errCode = (showError && (showError.code ?? showError.errorCode)) ?? 'UNKNOWN';
          const errMsg = (showError && (showError.message ?? showError.errorMessage)) ?? (typeof showError === 'object' ? JSON.stringify(showError) : String(showError));
          console.error(`[ADMOB_PRODUCTION_REWARDED_INVOKE_ERROR] Code: ${errCode} | Message: ${errMsg}`, showError);
          if (!adHasShown) {
            await cleanup();
            if (params.onFailure) {
              params.onFailure(showError);
            }
          }
        });
      } else {
        // Web Simulation Mode
        this.log('Rewarded Ad - Web Simulation');
        const confirmed = window.confirm(
          `🎬 [إعلان AdMob بمكافأة - Rewarded Ad]\n\nهل ترغب في مشاهدة إعلان الفيديو بالكامل لـ (${params.rewardTypeLabel})؟\n\n- موافق (OK): اكتمال الإعلان بنجاح ومنح المكافأة فوراً.\n- إلغاء (Cancel): إغلاق الإعلان قبل اكتماله.`
        );

        if (confirmed) {
          rewardEarned = true;
          this.recordRewardedAdSuccess();
          console.log('[REWARDED] rewarded (web simulation)');
          params.onRewardEarned();
        }

        this.isRewardedShowing = false;
        this.isRewardedLoaded = false;
        this.isRewardedLoading = false;
        if (params.onDismiss) {
          params.onDismiss(rewardEarned);
        }
      }

      return true;
    } catch (error: any) {
      const errCode = (error && (error.code ?? error.errorCode)) ?? 'UNKNOWN';
      const errMsg = (error && (error.message ?? error.errorMessage)) ?? (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.error(`[ADMOB_PRODUCTION_REWARDED_EXECUTE_ERROR] Code: ${errCode} | Message: ${errMsg}`, error);
      await this.cleanupRewardedListeners();
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      this.isRewardedLoading = false;
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
