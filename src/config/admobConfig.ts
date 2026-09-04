/**
 * AdMob Configuration for "أنت المدرب"
 * 
 * IMPORTANT FOR PRODUCTION PUBLISHING:
 * 1. Set IS_TEST_MODE to false when creating production builds for Google Play.
 * 2. Replace PRODUCTION_AD_IDS with your real AdMob Ad Unit IDs from your Google AdMob Dashboard.
 * 3. Never hardcode production IDs inside gameplay simulation or match logic.
 */

export interface AdMobConfigType {
  IS_TEST_MODE: boolean;
  ENABLE_LOGS: boolean;
  INTERSTITIAL_FREQUENCY_MATCHES: number; // Show interstitial every N matches
  REWARDED_COOLDOWN_SECONDS: number;     // Cooldown between rewarded ad claims
  APP_ID: string;
  BANNER_ID: string;
  INTERSTITIAL_ID: string;
  REWARDED_ID: string;
}

// Google Official Standard Android Test Ad Unit IDs
const TEST_AD_IDS = {
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917',
};

// PLACEHOLDER FOR REAL PRODUCTION ADMOB IDS (Replace before Google Play Release)
const PRODUCTION_AD_IDS = {
  APP_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX',
  BANNER_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  INTERSTITIAL_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  REWARDED_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};

// Set to false when publishing to Google Play Store!
export const IS_TEST_MODE = true;

export const ADMOB_CONFIG: AdMobConfigType = {
  IS_TEST_MODE,
  ENABLE_LOGS: true,
  INTERSTITIAL_FREQUENCY_MATCHES: 3, // Frequency cap: every 3 matches
  REWARDED_COOLDOWN_SECONDS: 60,     // 1 minute cooldown between training boosts
  APP_ID: IS_TEST_MODE ? TEST_AD_IDS.APP_ID : PRODUCTION_AD_IDS.APP_ID,
  BANNER_ID: IS_TEST_MODE ? TEST_AD_IDS.BANNER_ID : PRODUCTION_AD_IDS.BANNER_ID,
  INTERSTITIAL_ID: IS_TEST_MODE ? TEST_AD_IDS.INTERSTITIAL_ID : PRODUCTION_AD_IDS.INTERSTITIAL_ID,
  REWARDED_ID: IS_TEST_MODE ? TEST_AD_IDS.REWARDED_ID : PRODUCTION_AD_IDS.REWARDED_ID,
};
