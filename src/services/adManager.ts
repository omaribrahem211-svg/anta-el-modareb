import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
  AdOptions,
  RewardAdOptions,
  AdmobConsentStatus,
  RewardAdPluginEvents,
  AdMobRewardItem,
} from '@capacitor-community/admob';
import { ADMOB_CONFIG } from '../config/admobConfig';
import { AdManagerState, ActiveTrainingBoost, TrainingBoostType } from '../types/game';

const ADMOB_STORAGE_KEY = 'modareb_admob_state_v1';

class AdManagerService {
  private isInitialized = false;
  private isInitializing = false;
  private isNative = false;
  private isBannerVisible = false;
  private isInterstitialLoaded = false;
  private isRewardedLoaded = false;
  private isInterstitialShowing = false;
  private isRewardedShowing = false;

  private state: AdManagerState = {
    isPremium: false,
    matchesPlayedSinceLastInterstitial: 0,
    lastInterstitialTimestamp: 0,
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
   * Initializes the Google AdMob SDK and requests consent if on Android
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.log('Initializing AdMob SDK... (Test Mode:', ADMOB_CONFIG.IS_TEST_MODE, ')');

    try {
      if (this.isNative) {
        await AdMob.initialize({
          testingDevices: ADMOB_CONFIG.IS_TEST_MODE ? ['EMULATOR'] : undefined,
          initializeForTesting: ADMOB_CONFIG.IS_TEST_MODE,
        });

        this.log('Native AdMob SDK initialized successfully');
      } else {
        this.log('Web/Preview Mode: AdMob running in web simulation mode');
      }

      this.isInitialized = true;
      this.isInitializing = false;

      // Preload ads in background without blocking gameplay
      if (!this.state.isPremium) {
        this.loadInterstitial();
        this.loadRewarded();
      }

      return true;
    } catch (error) {
      this.log('AdMob initialization error:', error);
      this.isInitializing = false;
      return false;
    }
  }

  public init(): Promise<boolean> {
    return this.initialize();
  }

  /**
   * Shows a Banner Ad at the bottom of the screen (on non-match screens)
   */
  public async showBanner(): Promise<boolean> {
    if (this.state.isPremium) {
      this.log('Banner skipped: User is Premium');
      return false;
    }

    if (this.isBannerVisible) return true;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isNative) {
        const options: BannerAdOptions = {
          adId: ADMOB_CONFIG.BANNER_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 60, // Keep above the bottom navigation bar
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };

        await AdMob.showBanner(options);
        this.log('Banner Loaded & Shown natively');
      } else {
        this.log('Banner Loaded (Web Simulation)');
      }

      this.isBannerVisible = true;
      return true;
    } catch (error) {
      this.log('Banner Failed:', error);
      return false;
    }
  }

  /**
   * Hides the Banner Ad (e.g. during Live Match or Match Day simulation)
   */
  public async hideBanner(): Promise<boolean> {
    if (!this.isBannerVisible) return true;

    try {
      if (this.isNative) {
        await AdMob.hideBanner();
        await AdMob.removeBanner();
      }
      this.isBannerVisible = false;
      this.log('Banner Hidden');
      return true;
    } catch (error) {
      this.log('Banner hide error:', error);
      this.isBannerVisible = false;
      return false;
    }
  }

  /**
   * Pre-loads an Interstitial Ad in background
   */
  public async loadInterstitial(): Promise<boolean> {
    if (this.state.isPremium || this.isInterstitialLoaded) return true;

    try {
      if (this.isNative) {
        const options: AdOptions = {
          adId: ADMOB_CONFIG.INTERSTITIAL_ID,
          isTesting: ADMOB_CONFIG.IS_TEST_MODE,
        };
        await AdMob.prepareInterstitial(options);
      }
      this.isInterstitialLoaded = true;
      this.log('Interstitial Loaded');
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
   * Checks if frequency capping condition is met for Interstitial Ads
   */
  public shouldShowInterstitial(): boolean {
    if (this.state.isPremium) return false;
    // Frequency cap: every 3 matches (or as configured in ADMOB_CONFIG)
    return this.state.matchesPlayedSinceLastInterstitial >= ADMOB_CONFIG.INTERSTITIAL_FREQUENCY_MATCHES;
  }

  /**
   * Displays the Interstitial Ad between matches with smart frequency capping
   */
  public async showInterstitial(): Promise<boolean> {
    if (this.state.isPremium) {
      this.log('Interstitial skipped: User is Premium');
      return false;
    }

    if (this.isInterstitialShowing) return false;

    try {
      this.isInterstitialShowing = true;
      this.log('Interstitial Showing...');

      if (this.isNative) {
        if (!this.isInterstitialLoaded) {
          await this.loadInterstitial();
        }
        await AdMob.showInterstitial();
      }

      this.isInterstitialLoaded = false;
      this.isInterstitialShowing = false;
      this.log('Interstitial Shown successfully');

      // Reset frequency counter and record timestamp
      this.state.matchesPlayedSinceLastInterstitial = 0;
      this.state.lastInterstitialTimestamp = Date.now();
      this.saveState();

      // Preload next interstitial in background
      setTimeout(() => {
        this.loadInterstitial();
      }, 5000);

      return true;
    } catch (error) {
      this.log('Interstitial Failed during show:', error);
      this.isInterstitialLoaded = false;
      this.isInterstitialShowing = false;
      // Do not block gameplay if ad fails
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
   * Shows a Rewarded Video Ad.
   * STRICT SECURITY RULE:
   * Reward callback is ONLY executed when the native SDK confirms onRewardEarned.
   * Never grant reward on click or ad start.
   */
  public async showRewardedAd(
    onRewardEarned: (rewardItem?: AdMobRewardItem) => void,
    onDismiss?: () => void,
    onFailure?: (error: any) => void
  ): Promise<boolean> {
    if (this.isRewardedShowing) {
      if (onFailure) onFailure(new Error('Rewarded ad already in progress'));
      return false;
    }

    try {
      this.isRewardedShowing = true;
      this.log('Rewarded Showing...');

      let rewardGiven = false;

      if (this.isNative) {
        // Native Android Bridge listener for Reward
        const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
          this.log('Reward Earned natively:', reward);
          rewardGiven = true;
          this.recordRewardedAdSuccess();
          onRewardEarned(reward);
        });

        const dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.log('Rewarded dismissed');
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          rewardListener.remove();
          dismissListener.remove();
          if (!rewardGiven) {
            this.log('Rewarded closed before earning reward');
          }
          if (onDismiss) onDismiss();
          // Preload next rewarded
          setTimeout(() => this.loadRewarded(), 3000);
        });

        const failListener = await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (err) => {
          this.log('Rewarded Failed to show natively:', err);
          this.isRewardedShowing = false;
          this.isRewardedLoaded = false;
          rewardListener.remove();
          dismissListener.remove();
          failListener.remove();
          if (onFailure) onFailure(err);
        });

        if (!this.isRewardedLoaded) {
          await this.loadRewarded();
        }

        await AdMob.showRewardVideoAd();
      } else {
        // Web Simulation Mode with interactive mock modal / simulated video delay
        this.log('Rewarded Showing (Web Simulation)...');
        // Simulated completion after user watches in web test
        const simulatedReward: AdMobRewardItem = {
          type: 'training_boost',
          amount: 1,
        };

        // We simulate a 2-second playback before granting reward in browser test
        await new Promise(resolve => setTimeout(resolve, 1500));
        rewardGiven = true;
        this.log('Reward Earned (Web Simulation)');
        this.recordRewardedAdSuccess();
        onRewardEarned(simulatedReward);
        this.isRewardedShowing = false;
        if (onDismiss) onDismiss();
      }

      return true;
    } catch (error) {
      this.log('Reward Failed:', error);
      this.isRewardedShowing = false;
      this.isRewardedLoaded = false;
      if (onFailure) onFailure(error);
      return false;
    }
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
      this.hideBanner();
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
