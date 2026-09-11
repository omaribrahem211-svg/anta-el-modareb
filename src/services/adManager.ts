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
  InterstitialAdPluginEvents,
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

  // Banner State (Bottom Persistent Banner)
  private isBannerVisible = false;
  private isBannerCreated = false;
  private isBannerActive = false;
  private isBannerLoading = false;
  private bannerListenersAttached = false;
  private bannerListenerHandles: PluginListenerHandle[] = [];
  private isUsingTestBannerFallback = false;

  // Top In-Content Banner State
  private isTopBannerActive = true;
  private isTopBannerLoading = false;
  private isTopBannerCreated = true;

  // Interstitial State
  private isInterstitialLoading = false;
  private isInterstitialLoaded = false;
  private isInterstitialShowing = false;
  private interstitialLoadPromise: Promise<boolean> | null = null;
  private interstitialListenerHandles: PluginListenerHandle[] = [];

  private async cleanupInterstitialListeners() {
    while (this.interstitialListenerHandles.length > 0) {
      const handle = this.interstitialListenerHandles.pop();
      if (handle) {
        try {
          await handle.remove();
        } catch {
          // ignore
        }
      }
    }
  }

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
          console.log('[ADMOB] Native SDK initialized successfully');
        } else {
          console.log('[ADMOB] SDK initialized (web simulation mode)');
        }

        this.isInitialized = true;
        this.isInitializing = false;
        console.log('[STARTUP] AdManager initialized', Math.round(performance.now()) + 'ms');

        if (ADMOB_CONFIG.ENABLE_BANNER && this.isNative) {
          await this.attachBannerListeners();
          setTimeout(() => {
            this.ensureBannerActive().catch((err) => {
              console.warn('[ADMOB] Initial banner notice:', err);
            });
          }, 150);
        }

        if (this.isNative) {
          // Preload Interstitial and Rewarded in background so they are ready
          setTimeout(() => {
            this.loadInterstitial().catch(() => {});
            this.loadRewarded().catch(() => {});
          }, 2000);
        }

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

  private bannerRetryTimer: any = null;

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
        this.isBannerCreated = false;

        // Only fallback to Google test banner when in test mode (never for real production users)
        if (ADMOB_CONFIG.IS_TEST_MODE && !this.isUsingTestBannerFallback && (String(errCode) === '3' || String(errCode) === '0' || String(errCode).includes('NO_FILL'))) {
          console.log('[ADMOB_BANNER] Test mode fallback to test banner...');
          this.isUsingTestBannerFallback = true;
          if (this.bannerRetryTimer) clearTimeout(this.bannerRetryTimer);
          this.bannerRetryTimer = setTimeout(() => {
            this.ensureBannerActive();
          }, 1000);
          return;
        }

        // In production mode, never use test ads. Schedule retry for production ad after 60s
        if (this.bannerRetryTimer) clearTimeout(this.bannerRetryTimer);
        this.bannerRetryTimer = setTimeout(() => {
          this.isUsingTestBannerFallback = false;
          this.ensureBannerActive();
        }, 60000);
      });

      this.bannerListenerHandles.push(loadedHandle, failedHandle);
      this.bannerListenersAttached = true;
    } catch (e) {
      console.warn('[ADMOB] Error registering banner listeners:', e);
    }
  }

  /**
   * Ensures the persistent Bottom Banner Ad is active.
   * - Uses production unit ID: ca-app-pub-5272866425919152/4077924883
   * - Gracefully falls back to Google Test Unit if no-fill is encountered during testing.
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

    // If banner is already active and created, just ensure it is resumed
    if (this.isBannerActive && this.isBannerCreated && this.isBannerVisible) {
      return true;
    }

    if (this.isBannerLoading) {
      return true;
    }

    this.isBannerLoading = true;

    try {
      if (!this.isInitialized) {
        if (this.initPromise) {
          await this.initPromise;
        } else {
          await this.initialize();
        }
      }

      await this.attachBannerListeners();

      if (this.isNative) {
        const isTest = ADMOB_CONFIG.IS_TEST_MODE ? (this.isUsingTestBannerFallback || true) : false;
        const bannerAdId = isTest
          ? TEST_AD_IDS.BANNER_ID
          : (ADMOB_CONFIG.BANNER_ID || ADMOB_CONFIG.BOTTOM_BANNER_ID || 'ca-app-pub-5272866425919152/4077924883');

        const options: BannerAdOptions = {
          adId: bannerAdId,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: BOTTOM_NAV_MARGIN_DP,
          isTesting: isTest,
        };

        console.log(`[ADMOB_BANNER] Requesting ${isTest ? 'TEST' : 'PRODUCTION'} banner ad:`, bannerAdId, 'position: BOTTOM_CENTER');
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
      this.isBannerCreated = false;
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
    if (!this.isBannerCreated) return true;
    this.isBannerVisible = false;

    if (this.isNative) {
      try {
        await AdMob.hideBanner();
      } catch (e) {
        console.warn('[ADMOB] hideBanner notice:', e);
      }
    }
    return true;
  }

  public async resumeBanner(): Promise<boolean> {
    if (!ADMOB_CONFIG.ENABLE_BANNER || this.state.isPremium) return false;

    if (this.isBannerCreated) {
      this.isBannerVisible = true;
      if (this.isNative) {
        try {
          await AdMob.resumeBanner();
          return true;
        } catch (e) {
          console.warn('[ADMOB] resumeBanner notice, re-ensuring banner:', e);
          this.isBannerCreated = false;
        }
      } else {
        return true;
      }
    }

    return this.ensureBannerActive();
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
  // MATCH PROGRESSION & INTERSTITIAL ADS
  // ==========================================

  public isInterstitialReady(): boolean {
    return this.isInterstitialLoaded || !this.isNative;
  }

  public async loadInterstitial(timeoutMs: number = 10000): Promise<boolean> {
    if (this.isInterstitialLoaded) return true;
    if (this.isInterstitialLoading && this.interstitialLoadPromise) {
      return this.interstitialLoadPromise;
    }

    if (!this.isNative) {
      this.isInterstitialLoaded = true;
      return true;
    }

    this.isInterstitialLoading = true;

    this.interstitialLoadPromise = new Promise<boolean>(async (resolve) => {
      let settled = false;
      let timer: NodeJS.Timeout | null = null;

      const finish = async (success: boolean) => {
        if (settled) return;
        settled = true;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        await this.cleanupInterstitialListeners();
        this.isInterstitialLoading = false;
        this.isInterstitialLoaded = success;
        this.interstitialLoadPromise = null;
        resolve(success);
      };

      timer = setTimeout(() => {
        console.warn(`[ADMOB_INTERSTITIAL_TIMEOUT] Load timed out after ${timeoutMs}ms`);
        finish(false);
      }, timeoutMs);

      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        await this.cleanupInterstitialListeners();

        const interstitialAdId = ADMOB_CONFIG.IS_TEST_MODE ? TEST_AD_IDS.INTERSTITIAL_ID : ADMOB_CONFIG.INTERSTITIAL_ID;

        const loadedHandle = await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
          console.log('[ADMOB_INTERSTITIAL_LOADED] Interstitial loaded successfully:', interstitialAdId);
          finish(true);
        });
        this.interstitialListenerHandles.push(loadedHandle);

        const failedHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, async (err: any) => {
          const errCode = (err && (err.code ?? err.errorCode)) ?? 'UNKNOWN';
          const errMsg = (err && (err.message ?? err.errorMessage)) ?? (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.warn(`[ADMOB_INTERSTITIAL_FAILED] Code: ${errCode} | Message: ${errMsg}`);
          finish(false);
        });
        this.interstitialListenerHandles.push(failedHandle);

        const options: AdOptions = {
          adId: interstitialAdId,
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };

        console.log('[ADMOB_INTERSTITIAL] Preparing interstitial ad:', interstitialAdId);
        AdMob.prepareInterstitial(options).catch(async (err: any) => {
          console.warn('[ADMOB_INTERSTITIAL_PREPARE_ERROR]', err);
          finish(false);
        });
      } catch (ex) {
        console.error('[ADMOB_INTERSTITIAL_EXCEPTION]', ex);
        finish(false);
      }
    });

    return this.interstitialLoadPromise;
  }

  public async showInterstitial(onDismiss?: () => void): Promise<boolean> {
    if (this.state.isPremium) {
      if (onDismiss) onDismiss();
      return false;
    }

    if (this.isInterstitialShowing) {
      if (onDismiss) onDismiss();
      return false;
    }

    this.isInterstitialShowing = true;

    try {
      if (this.isNative) {
        if (!this.isInterstitialLoaded) {
          const loaded = await this.loadInterstitial(8000);
          if (!loaded) {
            this.isInterstitialShowing = false;
            if (onDismiss) onDismiss();
            return false;
          }
        }

        await this.cleanupInterstitialListeners();

        let dismissed = false;
        const handleDismiss = async () => {
          if (dismissed) return;
          dismissed = true;
          this.isInterstitialShowing = false;
          this.isInterstitialLoaded = false;
          await this.cleanupInterstitialListeners();
          this.state.matchesPlayedSinceLastInterstitial = 0;
          this.state.lastInterstitialTimestamp = Date.now();
          this.saveState();
          if (onDismiss) onDismiss();
          // Preload next in background
          setTimeout(() => this.loadInterstitial(), 3000);
        };

        const dismissHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          console.log('[ADMOB_INTERSTITIAL] Dismissed');
          handleDismiss();
        });
        this.interstitialListenerHandles.push(dismissHandle);

        const failHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (err: any) => {
          console.error('[ADMOB_INTERSTITIAL] Failed to show:', err);
          handleDismiss();
        });
        this.interstitialListenerHandles.push(failHandle);

        setTimeout(() => {
          if (this.isInterstitialShowing) {
            handleDismiss();
          }
        }, 60000);

        await AdMob.showInterstitial();
        return true;
      } else {
        // Web simulation mode
        console.log('[ADMOB_INTERSTITIAL] Interstitial (web simulation mode)');
        this.isInterstitialShowing = false;
        this.state.matchesPlayedSinceLastInterstitial = 0;
        this.state.lastInterstitialTimestamp = Date.now();
        this.saveState();
        if (onDismiss) onDismiss();
        return true;
      }
    } catch (err) {
      console.error('[ADMOB_INTERSTITIAL_ERROR]', err);
      this.isInterstitialShowing = false;
      this.isInterstitialLoaded = false;
      await this.cleanupInterstitialListeners();
      if (onDismiss) onDismiss();
      return false;
    }
  }

  public onMatchCompleted(fixtureId?: string, onAfterAd?: () => void): { shouldShowInterstitial: boolean } {
    if (this.state.isPremium) {
      if (onAfterAd) onAfterAd();
      return { shouldShowInterstitial: false };
    }

    this.state.matchesPlayedSinceLastInterstitial = (this.state.matchesPlayedSinceLastInterstitial || 0) + 1;
    this.saveState();

    // Show interstitial ad every 2 matches (or on 1st match if loaded)
    const shouldShow = this.state.matchesPlayedSinceLastInterstitial >= 2 || this.isInterstitialLoaded;

    if (shouldShow) {
      this.showInterstitial(onAfterAd);
      return { shouldShowInterstitial: true };
    } else {
      // Ensure it is preloaded for next time
      this.loadInterstitial().catch(() => {});
      if (onAfterAd) onAfterAd();
      return { shouldShowInterstitial: false };
    }
  }

  // ==========================================
  // REWARDED ADS (ON-DEMAND & PRELOADED)
  // ==========================================

  public isRewardedReady(): boolean {
    return this.isRewardedLoaded || !this.isNative;
  }

  /**
   * Loads a Rewarded Video Ad with automatic fallback to test unit if production is unfilled.
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
        console.warn(`[ADMOB_REWARDED_TIMEOUT] Load timed out after ${timeoutMs}ms`);
        finish(false);
      }, timeoutMs);

      try {
        if (!this.isInitialized) {
          await this.initialize();
        }

        await this.cleanupRewardedListeners();

        const rewardedAdId = ADMOB_CONFIG.IS_TEST_MODE ? TEST_AD_IDS.REWARDED_ID : ADMOB_CONFIG.REWARDED_ID;

        // 1. Listen for Loaded event
        const loadedHandle = await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
          console.log('[ADMOB_REWARDED_LOADED] Ad loaded successfully with unit ID:', rewardedAdId);
          finish(true);
        });
        this.rewardedListenerHandles.push(loadedHandle);

        // 2. Listen for FailedToLoad event
        const failedHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, async (err: any) => {
          const errCode = (err && (err.code ?? err.errorCode)) ?? 'UNKNOWN';
          const errMsg = (err && (err.message ?? err.errorMessage)) ?? (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.warn(`[ADMOB_REWARDED_LOAD_FAILED] Code: ${errCode} | Message: ${errMsg}`);
          finish(false);
        });
        this.rewardedListenerHandles.push(failedHandle);

        const options: RewardAdOptions = {
          adId: rewardedAdId,
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };

        console.log('[ADMOB_REWARDED] Preparing rewarded ad:', rewardedAdId);
        AdMob.prepareRewardVideoAd(options).catch(async (err: any) => {
          console.warn('[ADMOB_REWARDED_PREPARE_ERROR]', err);
          finish(false);
        });
      } catch (ex: any) {
        console.error('[ADMOB_REWARDED_EXCEPTION]', ex);
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
      this.log(`Starting Rewarded Ad for: ${params.rewardTypeLabel}`);

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

          // Preload next in background
          setTimeout(() => {
            this.loadRewarded().catch(() => {});
          }, 3000);
        };

        // Clean any previous listeners before registering presentation listeners
        await this.cleanupRewardedListeners();

        // Critical Safeguard 1: If ad does not appear within 7 seconds, abort safely
        presentationTimer = setTimeout(async () => {
          if (!adHasShown && this.isRewardedShowing) {
            console.error('[ADMOB_REWARDED_TIMEOUT] Presentation timeout (7s)');
            await cleanup();
            if (params.onFailure) {
              params.onFailure(new Error('انتهت مهلة عرض الإعلان'));
            }
          }
        }, 7000);

        // Critical Safeguard 2: Master session timeout (90 seconds maximum ad duration)
        sessionTimer = setTimeout(async () => {
          if (this.isRewardedShowing) {
            console.warn('[ADMOB_REWARDED_MASTER_TIMEOUT] Master session timeout reached (90s)');
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
          console.log('[ADMOB_REWARDED] Show started');
        });
        this.rewardedListenerHandles.push(showedHandle);

        // B. Listen for Reward Earned (strictly only grant reward here!)
        const rewardHandle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          console.log('[ADMOB_REWARDED] Rewarded earned:', reward);
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
          console.log(`[ADMOB_REWARDED] Dismissed (rewardEarned: ${rewardEarned})`);
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

        // D. Listen for FailedToShow
        const failHandle = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, async (err: any) => {
          const errCode = (err && (err.code ?? err.errorCode)) ?? 'UNKNOWN';
          const errMsg = (err && (err.message ?? err.errorMessage)) ?? (typeof err === 'object' ? JSON.stringify(err) : String(err));
          console.error(`[ADMOB_REWARDED_SHOW_FAILED] Code: ${errCode} | Message: ${errMsg}`, err);
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
          console.error(`[ADMOB_REWARDED_INVOKE_ERROR] Code: ${errCode} | Message: ${errMsg}`, showError);
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
      console.error(`[ADMOB_REWARDED_EXECUTE_ERROR] Code: ${errCode} | Message: ${errMsg}`, error);
      await this.cleanupRewardedListeners();
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      this.isRewardedLoading = false;
      if (params.onFailure) params.onFailure(error);
      return false;
    }
  }

  /**
   * Action-specific Rewarded Ads (e.g. heal injured player, cancel suspension, double match revenue)
   */
  public async showRewardedForAction(params: {
    actionType: 'heal_player' | 'cancel_suspension' | 'double_match_revenue';
    onUserEarnedReward: () => void;
    onDismiss?: (rewardEarned: boolean) => void;
    onFailure?: (error: any) => void;
  }): Promise<boolean> {
    const label =
      params.actionType === 'heal_player'
        ? 'علاج اللاعب المصاب مجاناً'
        : params.actionType === 'double_match_revenue'
        ? 'مضاعفة إيراد المباراة بالكامل (2X)'
        : 'إلغاء عقوبة إيقاف اللاعب';

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
