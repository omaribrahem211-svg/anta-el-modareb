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
  ENABLE_REWARDS: boolean; // Master toggle to disable/enable all rewards
  ENABLE_BANNER: boolean;  // Native stable bottom banner toggle
  ENABLE_INTERSTITIAL: boolean; // Interstitial ads toggle (disabled for stability)
  INTERSTITIAL_FREQUENCY_MATCHES: number; // Show interstitial every N matches
  REWARDED_COOLDOWN_SECONDS: number;     // Cooldown between rewarded ad claims
  APP_ID: string;
  TOP_BANNER_ID: string;    // بانر تحت صفحة الفيسبوك (Top In-Content Banner)
  BOTTOM_BANNER_ID: string; // بانر فوق القائمة السفلية (Bottom Fixed Banner)
  BANNER_ID: string;        // Native banner ad unit ID
  INTERSTITIAL_ID: string;
  REWARDED_ID: string;
}

// Google Official Standard Android Test Ad Unit IDs
const TEST_AD_IDS = {
  APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  TOP_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  BOTTOM_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  BANNER_ID: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_ID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_ID: 'ca-app-pub-3940256099942544/5224354917',
};

// Official Production AdMob IDs for "أنت المدرب"
export const PRODUCTION_AD_IDS = {
  APP_ID: 'ca-app-pub-5272866425919152~1232269694',
  BANNER_ID: 'ca-app-pub-5272866425919152/4077924883',        // البانر الثابت أسفل الشاشة
  TOP_BANNER_ID: 'ca-app-pub-5272866425919152/6734203345',    // بانر تحت جزء صفحة الفيسبوك
  BOTTOM_BANNER_ID: 'ca-app-pub-5272866425919152/4077924883', // بانر أسفل الشاشة
  INTERSTITIAL_ID: 'ca-app-pub-5272866425919152/5931052283',  // إعلان بيني أصلي مسبق التحميل
  REWARDED_ID: 'ca-app-pub-5272866425919152/6872814469',      // إعلان بمكافأة حقيقي (علاج وإلغاء إيقاف)
};

// Activated for diagnosis to use Google test ads and guarantee 100% fill rate and zero crashes
export const IS_TEST_MODE = true;

export const ADMOB_CONFIG: AdMobConfigType = {
  IS_TEST_MODE: true,
  ENABLE_LOGS: true,
  ENABLE_REWARDS: true, // تفعيل إعلانات المكافأة
  ENABLE_BANNER: true,  // تفعيل إعلان البانر الثابت المستقر في أسفل الشاشة
  ENABLE_INTERSTITIAL: false, // تعطيل الإعلانات البينية بالكامل مؤقتاً لاستقرار اللعبة ومنع الشاشة البيضاء والتهنيج
  INTERSTITIAL_FREQUENCY_MATCHES: 3, // عرض إعلان بيني كل 3 مباريات عند اكتمالها
  REWARDED_COOLDOWN_SECONDS: 0,           // متاح عند الحاجة لعلاج أو إلغاء إيقاف لاعب
  APP_ID: PRODUCTION_AD_IDS.APP_ID,
  TOP_BANNER_ID: PRODUCTION_AD_IDS.TOP_BANNER_ID,
  BOTTOM_BANNER_ID: PRODUCTION_AD_IDS.BOTTOM_BANNER_ID,
  BANNER_ID: PRODUCTION_AD_IDS.BANNER_ID,
  INTERSTITIAL_ID: PRODUCTION_AD_IDS.INTERSTITIAL_ID,
  REWARDED_ID: PRODUCTION_AD_IDS.REWARDED_ID,
};
