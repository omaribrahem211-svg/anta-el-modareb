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
  ENABLE_REWARDS: boolean; // Master toggle for rewarded ads
  ENABLE_BANNER: boolean;  // Banner ad toggle
  REWARDED_COOLDOWN_SECONDS: number;
  APP_ID: string;
  TOP_BANNER_ID: string;    // بانر تحت صفحة الفيسبوك (In-Content Banner)
  BOTTOM_BANNER_ID: string; // بانر احتياطي
  BANNER_ID: string;
  REWARDED_ID: string;
  INTERSTITIAL_ID: string;  // إعلان بيني بعد المباريات
}

// Google Official Standard Android Test Ad Unit IDs
export const TEST_AD_IDS = {
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  TOP_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  BOTTOM_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917',
  INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712',
};

// Official Production AdMob IDs for "أنت المدرب"
export const PRODUCTION_AD_IDS = {
  APP_ID: 'ca-app-pub-5272866425919152~1232269694',
  BANNER_ID: 'ca-app-pub-5272866425919152/4077924883',
  TOP_BANNER_ID: 'ca-app-pub-5272866425919152/6734203345',    // بانر تحت جزء صفحة الفيسبوك
  BOTTOM_BANNER_ID: 'ca-app-pub-5272866425919152/4077924883',
  REWARDED_ID: 'ca-app-pub-5272866425919152/6872814469',      // إعلان بمكافأة حقيقي
  INTERSTITIAL_ID: 'ca-app-pub-5272866425919152/3245233091',  // إعلان بيني حقيقي جديد
};

// Production Mode: IS_TEST_MODE = false for Google Play release
export const IS_TEST_MODE = false;

export const ADMOB_CONFIG: AdMobConfigType = {
  IS_TEST_MODE: false,
  ENABLE_LOGS: true,
  ENABLE_REWARDS: true, // تفعيل إعلانات المكافأة
  ENABLE_BANNER: true,  // تفعيل إعلانات البانر
  REWARDED_COOLDOWN_SECONDS: 0,
  APP_ID: PRODUCTION_AD_IDS.APP_ID,
  TOP_BANNER_ID: PRODUCTION_AD_IDS.TOP_BANNER_ID,
  BOTTOM_BANNER_ID: PRODUCTION_AD_IDS.BOTTOM_BANNER_ID,
  BANNER_ID: PRODUCTION_AD_IDS.BANNER_ID,
  REWARDED_ID: PRODUCTION_AD_IDS.REWARDED_ID,
  INTERSTITIAL_ID: PRODUCTION_AD_IDS.INTERSTITIAL_ID,
};
