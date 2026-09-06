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
            // When app resumes, gently re-evaluate banner if it was active
            if (this.lastBannerRequestedState && !this.isInterstitialShowing && !this.state.isPremium) {
              setTimeout(() => {
                this.showBanner();
              }, 400);
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
              });
              const failedHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => {
                this.log('Native Banner Ad Failed to Load:', error);
                this.isBannerVisible = false;
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

        // Preload interstitial after a short delay so cold start remains instantaneous
        if (!this.state.isPremium) {
          setTimeout(() => {
            this.loadInterstitial();
          }, 3000);
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
   * Shows a Banner Ad at the bottom of the screen (on non-match screens)
   * High performance: Uses resumeBanner to instantly restore an existing native banner
   * without destroying or re-allocating the Android AdView or triggering layout lag!
   */
  public async showBanner(): Promise<boolean> {
    if (this.state.isPremium) {
      this.log('Banner skipped: User is Premium');
      return false;
    }

    // Do NOT attempt to show banner if an interstitial is currently presenting
    if (this.isInterstitialShowing) {
      this.log('Banner skipped: Interstitial is active');
      return false;
    }

    this.lastBannerRequestedState = true;

    // If already visible or operation currently in-flight, skip redundant native bridge call
    if (this.isBannerVisible) return true;
    if (this.bannerOperationLock) return false;

    this.bannerOperationLock = true;

    try {
      const initialized = await this.initialize();
      if (!initialized && this.isNative) {
        this.log('Banner deferred: AdMob not ready yet');
        return false;
      }

      if (this.isNative) {
        if (this.isBannerCreated) {
          // Instant resume: preserves existing View in memory, 0 network delay, 0 layout thrashing!
          try {
            await AdMob.resumeBanner();
            this.isBannerVisible = true;
            this.log('Native Banner Resumed smoothly');
          } catch (resumeErr) {
            this.log('Banner resume notice, re-creating view:', resumeErr);
            const options: BannerAdOptions = {
              adId: ADMOB_CONFIG.BANNER_ID,
              adSize: BannerAdSize.BANNER,
              position: BannerAdPosition.BOTTOM_CENTER,
              margin: 0,
              isTesting: ADMOB_CONFIG.IS_TEST_MODE,
            };
            await AdMob.showBanner(options);
            this.isBannerCreated = true;
            this.isBannerVisible = true;
          }
        } else {
          // First time creation - use standard 320x50 BANNER to prevent dynamic layout shifts
          const options: BannerAdOptions = {
            adId: ADMOB_CONFIG.BANNER_ID,
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: ADMOB_CONFIG.IS_TEST_MODE,
          };

          await AdMob.showBanner(options);
          this.isBannerCreated = true;
          this.isBannerVisible = true;
          this.log('Native Banner Loaded & Shown natively (Fixed BANNER at BOTTOM_CENTER)');
        }
      } else {
        this.isBannerVisible = true;
        this.log('Banner Loaded (Web Simulation)');
      }

      return true;
    } catch (error) {
      this.log('Banner Failed to show:', error);
      this.isBannerVisible = false;
      return false;
    } finally {
      this.bannerOperationLock = false;
    }
  }

  /**
   * Hides the Banner Ad smoothly without destroying the native Android view.
   * This allows immediate smooth tab switching without Android UI thread lag!
   */
  public async hideBanner(): Promise<boolean> {
    this.lastBannerRequestedState = false;

    if (!this.isBannerVisible) return true;
    if (this.bannerOperationLock) return false;

    this.bannerOperationLock = true;

    try {
      if (this.isNative && this.isBannerCreated) {
        try {
          await AdMob.hideBanner();
        } catch (hideErr) {
          this.log('Banner hide error:', hideErr);
        }
      }
      this.isBannerVisible = false;
      this.log('Banner smoothly hidden (view cached in memory)');
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
   * Pre-loads an Interstitial Ad in background
   */
  public async loadInterstitial(): Promise<boolean> {
    if (this.state.isPremium || this.isInterstitialLoaded || this.isInterstitialShowing) return true;

    try {
      if (this.isNative) {
        const options: AdOptions = {
          adId: ADMOB_CONFIG.INTERSTITIAL_ID,
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };
        await AdMob.prepareInterstitial(options);
      }
      this.isInterstitialLoaded = true;
      this.log('Interstitial Loaded and Ready');
      return true;
    } catch (error) {
      this.log('Interstitial Failed to Load:', error);
      this.isInterstitialLoaded = false;
      return false;
    }
  }

  public isInterstitialReady(): boolean {
    if (this.state.isPremium) return false;
    return this.isInterstitialLoaded || !this.isNative;
  }

  /**
   * Checks if frequency capping and cooldown conditions are met for Interstitial Ads
   */
  public shouldShowInterstitial(): boolean {
    if (this.state.isPremium) return false;

    // 1. Frequency cap: matches played threshold
    const matchesReached = this.state.matchesPlayedSinceLastInterstitial >= ADMOB_CONFIG.INTERSTITIAL_FREQUENCY_MATCHES;
    if (!matchesReached) return false;

    // 2. Cooldown cap: minimum interval between interstitials (3 minutes)
    const timeSinceLast = Date.now() - (this.state.lastInterstitialTimestamp || 0);
    if (timeSinceLast < MIN_INTERSTITIAL_COOLDOWN_MS) {
      this.log(`Interstitial blocked by cooldown: ${Math.round((MIN_INTERSTITIAL_COOLDOWN_MS - timeSinceLast) / 1000)}s remaining`);
      return false;
    }

    return true;
  }

  /**
   * Displays the Interstitial Ad between matches.
   * 
   * CRITICAL FIX:
   * 1. Safely detaches and removes native BannerAdView before showing interstitial.
   * 2. Registers Dismissed / FailedToShow listeners and awaits true dismissal by the user.
   * 3. Prevents concurrent preload collisions while ad is showing.
   * 4. Allows a 400ms stabilization tick for Android Activity & WebView to redraw before restoring banner.
   */
  public async showInterstitial(): Promise<boolean> {
    if (this.state.isPremium) {
      this.log('Interstitial skipped: User is Premium');
      return false;
    }

    if (this.isInterstitialShowing) return false;

    const hadBannerBeforeInterstitial = this.isBannerVisible;

    try {
      this.isInterstitialShowing = true;
      this.log('Preparing to show Interstitial...');

      // 1. Detach native banner view completely to prevent GL texture & layout collisions
      if (this.isNative) {
        await this.hideBanner();
      }

      if (this.isNative) {
        if (!this.isInterstitialLoaded) {
          await this.loadInterstitial();
        }

        // 2. Setup dismissal promise so we know when the ad actually finishes
        await new Promise<void>(async (resolve) => {
          let dismissHandle: PluginListenerHandle | null = null;
          let failHandle: PluginListenerHandle | null = null;

          const cleanup = () => {
            if (dismissHandle) dismissHandle.remove();
            if (failHandle) failHandle.remove();
          };

          try {
            dismissHandle = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
              this.log('Native Interstitial Dismissed by user');
              cleanup();
              resolve();
            });

            failHandle = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (err: any) => {
              this.log('Native Interstitial FailedToShow:', err);
              cleanup();
              resolve();
            });

            await AdMob.showInterstitial();
          } catch (showErr) {
            this.log('Error triggering AdMob.showInterstitial():', showErr);
            cleanup();
            resolve();
          }
        });
      } else {
        // Web simulation mode
        this.log('Interstitial Showing (Web Simulation)...');
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      this.isInterstitialLoaded = false;
      this.isInterstitialShowing = false;
      this.log('Interstitial finished and closed cleanly');

      // 3. Reset frequency counter and record timestamp
      this.state.matchesPlayedSinceLastInterstitial = 0;
      this.state.lastInterstitialTimestamp = Date.now();
      this.saveState();

      // 4. Android Activity resume stabilization tick (600ms) to ensure smooth WebView rendering
      setTimeout(() => {
        if (hadBannerBeforeInterstitial && !this.state.isPremium && this.lastBannerRequestedState) {
          this.showBanner();
        }
      }, 600);

      // 5. Preload next interstitial with 35s safe cooldown (never immediate)
      setTimeout(() => {
        this.loadInterstitial();
      }, 35000);

      return true;
    } catch (error) {
      this.log('Interstitial failed during lifecycle:', error);
      this.isInterstitialLoaded = false;
      this.isInterstitialShowing = false;
      
      // Attempt restoring banner on failure after stabilization
      setTimeout(() => {
        if (hadBannerBeforeInterstitial && !this.state.isPremium && this.lastBannerRequestedState) {
          this.showBanner();
        }
      }, 600);

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

    try {
      this.isRewardedShowing = true;
      this.log(`Rewarded Showing for ${rewardType} (Session: ${sessionId})...`);

      let rewardEarnedNatively = false;

      if (this.isNative) {
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
