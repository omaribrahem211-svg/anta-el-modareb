import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  AdOptions,
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
const MIN_INTERSTITIAL_COOLDOWN_MS = 180 * 1000; // 3 minutes minimum interval between interstitials
const BOTTOM_NAV_MARGIN_DP = 58; // Standard Android bottom navigation bar height to place native banner solidly above it

class AdManagerService {
  private isInitialized = false;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;
  private isNative = false;
  private isBannerVisible = false;
  private isBannerCreated = false;
  private bannerOperationLock = false;
  private isInterstitialLoaded = false;
  private isRewardedLoaded = false;
  private isInterstitialShowing = false;
  private isInterstitialTransitioning = false;
  private isRewardedShowing = false;
  private activeRewardSessionId: string | null = null;
  private bannerListenersAttached = false;
  private bannerListenerHandles: PluginListenerHandle[] = [];
  private lastBannerRequestedState = false;

  private state: AdManagerState = {
    isPremium: false,
    matchesPlayedSinceLastInterstitial: 0,
    lastInterstitialTimestamp: Date.now(), // Prevent ad right after opening the app
    activeBoost: null,
    lastRewardedAdTimestamp: 0,
  };

  private listeners: Array<(state: AdManagerState) => void> = [];

  constructor() {
    this.loadState();
    this.isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    // If state had 0 for lastInterstitialTimestamp, set it to now to avoid ad on immediate open
    if (!this.state.lastInterstitialTimestamp || this.state.lastInterstitialTimestamp === 0) {
      this.state.lastInterstitialTimestamp = Date.now();
    }

    // Handle App Pause/Resume lifecycle safely
    if (this.isNative) {
      try {
        CapApp.addListener('appStateChange', (appState) => {
          this.log(`App State Changed: isActive = ${appState.isActive}`);
          if (!appState.isActive) {
            // When app goes to background, avoid pending actions
          } else {
            // When app resumes, gently re-evaluate and recreate banner cleanly if it was active
            if (this.lastBannerRequestedState && !this.isInterstitialActive() && !this.isRewardedShowing && !this.state.isPremium) {
              setTimeout(() => {
                if (!this.isInterstitialActive()) {
                  this.reinitializeBanner();
                }
              }, 500);
            }
          }
        });
      } catch (e) {
        this.log('CapApp listener registration note:', e);
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

          // Setup Banner listeners ONCE to prevent listener leaks and repeated initialization
          if (!this.bannerListenersAttached) {
            try {
              const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
                this.log('Native Banner Ad Loaded successfully');
                this.isBannerVisible = true;
                this.isBannerCreated = true;
              });
              const failedHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => {
                this.log('Native Banner Ad Failed to Load:', error);
                this.isBannerVisible = false;
                this.isBannerCreated = false;
              });
              this.bannerListenerHandles.push(loadedHandle, failedHandle);
              this.bannerListenersAttached = true;
            } catch (listenerErr) {
              this.log('Banner listener registration notice:', listenerErr);
            }
          }

          this.log('Native AdMob SDK initialized successfully');
        } else {
          this.log('Web/Preview Mode: AdMob running in web simulation mode');
        }

        this.isInitialized = true;
        this.isInitializing = false;

        // Preload rewarded ad so it is ready when the user requests to heal or unsuspend a player
        setTimeout(() => {
          this.loadRewarded();
        }, 1500);

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
   * Checks whether an Interstitial Ad is currently active, presenting on screen,
   * or within the post-dismissal WebView stabilization window.
   */
  public isInterstitialActive(): boolean {
    return this.isInterstitialShowing || this.isInterstitialTransitioning;
  }

  /**
   * Checks whether an Interstitial Ad is actively visible on screen right now.
   */
  public isInterstitialShowingNow(): boolean {
    return this.isInterstitialShowing;
  }

  /**
   * Safely reinitializes the Banner Ad.
   * Checks the Interstitial ad status first to prevent WebView and graphics context collisions.
   */
  public async reinitializeBanner(): Promise<boolean> {
    if (this.isInterstitialActive()) {
      this.log('reinitializeBanner deferred: Interstitial is active or in stabilization window');
      this.lastBannerRequestedState = true;
      return false;
    }
    return this.showBanner(true);
  }

  /**
   * Shows a Banner Ad at the bottom of the screen (on non-match screens)
   * High performance, self-healing, & WebView-safe:
   * 1. Checks interstitial state before attempting initialization, recreation, or display.
   * 2. If forceRecreate or not created: cleanly removes any stale native view, then calls showBanner.
   * 3. If existing banner: attempts smooth resume, falling back to clean recreation on failure.
   * 4. Prevents layout lag, EGL texture conflicts, and WebView freeze on Android.
   */
  public async showBanner(forceRecreate: boolean = false): Promise<boolean> {
    if (this.state.isPremium) {
      this.log('Banner skipped: User is Premium');
      return false;
    }

    // 1. CRITICAL: Strictly verify Interstitial status before any WebView or native operation
    if (this.isInterstitialActive()) {
      this.log('Banner skipped/deferred: Interstitial is currently active or transitioning in WebView');
      this.lastBannerRequestedState = true;
      return false;
    }

    // 2. Also check if a rewarded video ad is currently presenting
    if (this.isRewardedShowing) {
      this.log('Banner skipped/deferred: Rewarded video is active');
      this.lastBannerRequestedState = true;
      return false;
    }

    this.lastBannerRequestedState = true;

    // If already visible and not forcing recreation, skip redundant native bridge call
    if (this.isBannerVisible && !forceRecreate) return true;
    if (this.bannerOperationLock) return false;

    this.bannerOperationLock = true;

    try {
      // Re-verify interstitial state before async initialization
      if (this.isInterstitialActive()) {
        this.log('Banner aborted: Interstitial ad started before initialization');
        return false;
      }

      const initialized = await this.initialize();
      if (!initialized && this.isNative) {
        this.log('Banner deferred: AdMob not ready yet');
        return false;
      }

      // Re-verify interstitial state after async initialization to prevent race conditions
      if (this.isInterstitialActive()) {
        this.log('Banner aborted: Interstitial ad started during initialization');
        return false;
      }

      if (this.isNative) {
        if (forceRecreate || !this.isBannerCreated) {
          // Double check before removing and creating native view
          if (this.isInterstitialActive()) {
            this.log('Banner clean recreate aborted: Interstitial is active');
            return false;
          }

          try {
            await AdMob.removeBanner();
          } catch (remErr) {
            this.log('Clean remove notice before show:', remErr);
          }
          this.isBannerCreated = false;

          // Final check right before AdMob bridge call to avoid any WebView overlay conflict
          if (this.isInterstitialActive()) {
            this.log('Banner showBanner aborted: Interstitial is active');
            return false;
          }

          const options: BannerAdOptions = {
            adId: ADMOB_CONFIG.BOTTOM_BANNER_ID || ADMOB_CONFIG.BANNER_ID,
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 58, // Sits cleanly directly ABOVE the bottom menu bar
            isTesting: ADMOB_CONFIG.IS_TEST_MODE,
          };

          await AdMob.showBanner(options);
          this.isBannerCreated = true;
          this.isBannerVisible = true;
          this.log('Native Banner cleanly created and attached (Fixed above bottom menu at BOTTOM_CENTER)');
        } else {
          // Attempt instant resume
          try {
            if (this.isInterstitialActive()) {
              return false;
            }
            await AdMob.resumeBanner();
            this.isBannerVisible = true;
            this.log('Native Banner resumed smoothly');
          } catch (resumeErr) {
            this.log('Banner resume notice, fallback to fresh recreate:', resumeErr);
            if (this.isInterstitialActive()) {
              return false;
            }
            try {
              await AdMob.removeBanner();
            } catch {}
            this.isBannerCreated = false;

            if (this.isInterstitialActive()) {
              return false;
            }

            const options: BannerAdOptions = {
              adId: ADMOB_CONFIG.BOTTOM_BANNER_ID || ADMOB_CONFIG.BANNER_ID,
              adSize: BannerAdSize.BANNER,
              position: BannerAdPosition.BOTTOM_CENTER,
              margin: 58, // Above bottom menu
              isTesting: ADMOB_CONFIG.IS_TEST_MODE,
            };

            await AdMob.showBanner(options);
            this.isBannerCreated = true;
            this.isBannerVisible = true;
            this.log('Native Banner freshly recreated after resume fallback');
          }
        }
      } else {
        this.isBannerVisible = true;
        this.log('Banner Loaded (Web Simulation)');
      }

      return true;
    } catch (error) {
      this.log('Banner Failed to show:', error);
      this.isBannerVisible = false;
      this.isBannerCreated = false;
      return false;
    } finally {
      this.bannerOperationLock = false;
    }
  }

  /**
   * Hides the Banner Ad smoothly when entering match screens or modals.
   */
  public async hideBanner(forceCleanRemove = false): Promise<boolean> {
    this.lastBannerRequestedState = false;

    if (!this.isBannerVisible && !this.isBannerCreated) return true;
    if (this.bannerOperationLock) return false;

    this.bannerOperationLock = true;

    try {
      if (this.isNative) {
        try {
          if (forceCleanRemove) {
            await AdMob.removeBanner();
            this.isBannerCreated = false;
          } else {
            await AdMob.hideBanner();
          }
        } catch (hideErr) {
          this.log('Banner hide error:', hideErr);
        }
      }
      this.isBannerVisible = false;
      this.log('Banner hidden');
      return true;
    } catch (error) {
      this.log('Banner hide notice:', error);
      this.isBannerVisible = false;
      return false;
    } finally {
      this.bannerOperationLock = false;
    }
  }

  /**
   * Suspends and cleanly detaches native banner view BEFORE an interstitial or rewarded ad opens.
   * CRITICAL:
   * 1. Does NOT reset this.lastBannerRequestedState to false! (Preserves the screen's desired banner state)
   * 2. Uses removeBanner() to fully destroy the native AdView, preventing OpenGL surface conflicts,
   *    zombie layout passes, and UI stutter when the fullscreen AdActivity opens.
   */
  private async suspendBannerForFullscreenAd(): Promise<boolean> {
    const wasActive = this.lastBannerRequestedState || this.isBannerVisible;

    this.bannerOperationLock = true;
    try {
      if (this.isNative) {
        try {
          await AdMob.removeBanner();
          this.log('Native Banner cleanly detached before fullscreen ad');
        } catch (e) {
          this.log('Banner remove on suspend notice:', e);
        }
      }
      this.isBannerCreated = false;
      this.isBannerVisible = false;
      // CRITICAL: DO NOT change this.lastBannerRequestedState to false!
      return wasActive;
    } finally {
      this.bannerOperationLock = false;
    }
  }

  /**
   * Completely removes the native banner view (used when user purchases Premium)
   */
  public async destroyBanner(): Promise<void> {
    this.lastBannerRequestedState = false;
    this.isBannerVisible = false;
    this.isBannerCreated = false;
    if (this.isNative) {
      try {
        await AdMob.removeBanner();
      } catch {}
    }
  }

  /**
   * Interstitial Ads are permanently removed from the application per user request.
   * Stubbed for type-safety and backwards compatibility.
   */
  public async loadInterstitial(): Promise<boolean> {
    return false;
  }

  public isInterstitialReady(): boolean {
    return false;
  }

  public shouldShowInterstitial(): boolean {
    return false;
  }

  public async showInterstitial(): Promise<boolean> {
    return false;
  }

  /**
   * Shows a standard Rewarded Ad for player actions:
   * - Healing an injured player («شاهد إعلان لتسريع العلاج»)
   * - Lifting a player suspension («شاهد إعلان لإلغاء الإيقاف»)
   *
   * Guaranteed Rules:
   * 1. Only calls onUserEarnedReward if the user completely watched the ad.
   * 2. If closed before completion, reward is NOT granted.
   * 3. Immediately preloads a new Rewarded Ad after use.
   */
  public async showRewardedForAction(params: {
    actionType: 'heal_player' | 'cancel_suspension';
    onUserEarnedReward: () => void;
    onDismiss?: (rewardEarned: boolean) => void;
    onFailure?: (error: any) => void;
  }): Promise<boolean> {
    if (this.isRewardedShowing) return false;

    this.isRewardedShowing = true;
    let rewardEarned = false;

    try {
      this.log(`Rewarded ad started for action: ${params.actionType}`);

      if (this.isNative) {
        // Ensure ad is ready in memory
        if (!this.isRewardedLoaded) {
          const loaded = await this.loadRewarded();
          if (!loaded) {
            this.isRewardedShowing = false;
            if (params.onFailure) params.onFailure(new Error('Failed to prepare rewarded ad'));
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

        // 1. Listen for user earned reward (onUserEarnedReward)
        rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          this.log('Reward Earned natively from AdMob SDK (onUserEarnedReward):', reward);
          rewardEarned = true;
          this.recordRewardedAdSuccess();
          params.onUserEarnedReward();
        });

        // 2. Listen for ad dismissal
        dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.log(`Rewarded ad dismissed. User earned reward: ${rewardEarned}`);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          cleanup();

          if (params.onDismiss) {
            params.onDismiss(rewardEarned);
          }

          // Immediately preload next Rewarded ad
          setTimeout(() => {
            this.loadRewarded();
          }, 800);
        });

        // 3. Listen for failure
        failListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err: any) => {
          this.log('Rewarded ad failed to show:', err);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          cleanup();

          if (params.onFailure) {
            params.onFailure(err);
          }

          // Preload retry
          setTimeout(() => {
            this.loadRewarded();
          }, 1500);
        });

        await AdMob.showRewardVideoAd();
      } else {
        // Web Simulation Mode (allows testing completion vs cancellation in browser)
        this.log('Rewarded ad Web Simulation');
        const actionLabel = params.actionType === 'heal_player' 
          ? 'تسريع علاج اللاعب المصاب' 
          : 'إلغاء عقوبة إيقاف اللاعب';
        
        const confirmed = window.confirm(
          `🎬 [إعلان AdMob بمكافأة - Rewarded Ad]\n\nهل ترغب في محاكاة إكمال مشاهدة إعلان الفيديو بالكامل لـ (${actionLabel})؟\n\n- موافق (OK): اكتمال الإعلان بنجاح ومنح المكافأة فوراً (onUserEarnedReward).\n- إلغاء (Cancel): إغلاق الإعلان قبل اكتماله (لن يتم تطبيق المكافأة).`
        );

        if (confirmed) {
          rewardEarned = true;
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
      this.log('showRewardedForAction error:', error);
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      if (params.onFailure) params.onFailure(error);
      setTimeout(() => this.loadRewarded(), 1500);
      return false;
    }
  }

  /**
   * Pre-loads a Rewarded Video Ad in background
   */
  public async loadRewarded(): Promise<boolean> {
    if (this.isRewardedLoaded) return true;

    try {
      if (this.isNative) {
        const options: RewardAdOptions = {
          adId: ADMOB_CONFIG.REWARDED_ID,
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };
        await AdMob.prepareRewardVideoAd(options);
      }
      this.isRewardedLoaded = true;
      this.log('Rewarded Loaded');
      return true;
    } catch (error) {
      this.log('Rewarded Failed to load:', error);
      this.isRewardedLoaded = false;
      return false;
    }
  }

  public isRewardedReady(): boolean {
    return this.isRewardedLoaded || !this.isNative;
  }

  /**
   * Plays a Rewarded Video Ad with complete lifecycle management
   */
  public async showRewarded(
    rewardType: AdRewardType,
    onRewardEarnedCallback?: (result: AdRewardClaimResult) => void,
    onDismissCallback?: () => void,
    onFailureHandler?: (error: any) => void
  ): Promise<boolean> {
    if (this.isRewardedShowing) return false;

    // Generate unique ad session transaction ID
    const sessionId = AdRewardManager.createAdSession(rewardType);
    this.activeRewardSessionId = sessionId;
    const wasBannerActiveBefore = this.lastBannerRequestedState || this.isBannerVisible;

    try {
      this.isRewardedShowing = true;
      this.log(`Rewarded Showing for ${rewardType} (Session: ${sessionId})...`);

      let rewardEarnedNatively = false;

      if (this.isNative) {
        // Cleanly suspend banner view to give fullscreen rewarded video full GPU priority
        await this.suspendBannerForFullscreenAd();

        // Native Android Bridge listener for Reward
        const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          this.log('Reward Earned natively from AdMob SDK:', reward);
          rewardEarnedNatively = true;
          this.recordRewardedAdSuccess();

          // Validate and prevent duplicate claim
          const claimResult = AdRewardManager.verifyAndConsumeReward(sessionId, rewardType);
          if (claimResult.success && onRewardEarnedCallback) {
            onRewardEarnedCallback(claimResult);
          }
        });

        const dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.log('Rewarded dismissed');
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          this.activeRewardSessionId = null;
          rewardListener.remove();
          dismissListener.remove();

          if (!rewardEarnedNatively) {
            this.log('Rewarded closed before earning reward — no reward granted');
          }
          if (onDismissCallback) onDismissCallback();

          // Restore banner cleanly after stabilization
          setTimeout(async () => {
            if (wasBannerActiveBefore && !this.state.isPremium && this.lastBannerRequestedState) {
              await this.showBanner(true);
            }
          }, 500);

          // Preload next rewarded ad in background
          setTimeout(() => this.loadRewarded(), 8000);
        });

        const failListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {
          this.log('Rewarded Failed to show natively:', err);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          this.activeRewardSessionId = null;
          rewardListener.remove();
          dismissListener.remove();
          failListener.remove();
          if (onFailureHandler) onFailureHandler(err);

          // Restore banner cleanly on failure
          setTimeout(async () => {
            if (wasBannerActiveBefore && !this.state.isPremium && this.lastBannerRequestedState) {
              await this.showBanner(true);
            }
          }, 500);
        });

        if (!this.isRewardedLoaded) {
          await this.loadRewarded();
        }

        await AdMob.showRewardVideoAd();
      } else {
        // Web Simulation Mode for browser preview
        this.log('Rewarded Showing (Web Simulation)...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        rewardEarnedNatively = true;
        this.log('Reward Earned (Web Simulation)');
        this.recordRewardedAdSuccess();

        const claimResult = AdRewardManager.verifyAndConsumeReward(sessionId, rewardType);
        if (claimResult.success && onRewardEarnedCallback) {
          onRewardEarnedCallback(claimResult);
        }

        this.isRewardedShowing = false;
        this.activeRewardSessionId = null;
        if (onDismissCallback) onDismissCallback();
      }

      return true;
    } catch (error) {
      this.log('Reward Failed:', error);
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      this.activeRewardSessionId = null;
      if (onFailureHandler) onFailureHandler(error);

      setTimeout(async () => {
        if (wasBannerActiveBefore && !this.state.isPremium && this.lastBannerRequestedState) {
          await this.showBanner(true);
        }
      }, 500);

      return false;
    }
  }

  /**
   * Alias for showRewarded
   */
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
   * Called after every completed match to increment interstitial frequency counter
   */
  public onMatchCompleted(): { shouldShowInterstitial: boolean } {
    this.state.matchesPlayedSinceLastInterstitial += 1;
    this.saveState();
    this.log(`Matches played since last interstitial: ${this.state.matchesPlayedSinceLastInterstitial}/${ADMOB_CONFIG.INTERSTITIAL_FREQUENCY_MATCHES}`);
    return {
      shouldShowInterstitial: this.shouldShowInterstitial(),
    };
  }

  /**
   * Activates a Training Boost for the next match
   */
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
      bonusValue: 0.05, // +5% balanced boost
      isConsumed: false,
    };

    this.state.activeBoost = boost;
    this.saveState();
    this.log(`Training Boost Activated: ${boost.title}`);
    return boost;
  }

  /**
   * Consumes the active training boost after match completion
   */
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
