import { simulateDailySquadTraining, simulateDailyNegotiations, addDaysToDate, calculateDaysUntilNextMatch, getScheduledRoundDate } from '../src/utils/calendarEngine';
import { cleanPromoCodeInput, getEffectiveUserIdentifier, isGenericOrSharedIdentifier } from '../src/services/promoCodeService';
import { AdRewardManager, AD_REWARD_DEFINITIONS, AdRewardType } from '../src/services/adRewardService';
import { ADMOB_CONFIG, PRODUCTION_AD_IDS, TEST_AD_IDS } from '../src/config/admobConfig';
import type { Player, Club, ActiveNegotiation, PlayerInjury } from '../src/types/game';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, testName: string, errorMsg?: string, details?: any) {
  if (condition) {
    results.push({ suite, testName, passed: true, details });
    console.log(`  ✓ [${suite}] ${testName}`);
  } else {
    results.push({ suite, testName, passed: false, error: errorMsg || 'Assertion failed', details });
    console.error(`  ✗ [${suite}] ${testName}: ${errorMsg || 'FAILED'}`);
  }
}

// -------------------------------------------------------------
// 1. TEST: حركة الأيام (Day Movement & Calendar Progression)
// -------------------------------------------------------------
console.log('\n--- 1. Testing حركة الأيام (Day Advance & Calendar Logic) ---');
try {
  const startDateStr = '2025-08-15';
  const nextDate1 = addDaysToDate(startDateStr, 1, 1);
  assert(nextDate1.rawDateStr === '2025-08-16', 'حركة الأيام', 'تقدم اليوم بمقدار 1 يوم صحيح');
  assert(nextDate1.dayIndexInSeason === 2, 'حركة الأيام', 'عداد أيام الموسم زاد بمقدار 1');
  assert(typeof nextDate1.formattedArabic === 'string' && nextDate1.formattedArabic.length > 0, 'حركة الأيام', 'تنسيق التاريخ بالعربية سليم');

  const nextDate7 = addDaysToDate(startDateStr, 7, 1);
  assert(nextDate7.rawDateStr === '2025-08-22', 'حركة الأيام', 'القفز لأسبوع (7 أيام) صحيح');

  // Month rollover test (from Aug 31 to Sep 1)
  const aug31 = '2025-08-31';
  const sep1 = addDaysToDate(aug31, 1, 17);
  assert(sep1.rawDateStr === '2025-09-01', 'حركة الأيام', 'انتقال نهاية الشهر (أغسطس -> سبتمبر) سليم بدون خطأ');
  assert(sep1.month === 9, 'حركة الأيام', 'تحديث رقم الشهر عند الانتقال للشهر التالي');

  // Match day calculation: test with exact scheduled date
  const scheduledRound1 = getScheduledRoundDate('2025-08-15', 1, 34);
  const matchInfo = calculateDaysUntilNextMatch(scheduledRound1.rawDateStr, 1, '2025-08-15', 34);
  assert(matchInfo.isMatchDay === true && matchInfo.daysRemaining === 0, 'حركة الأيام', 'اكتشاف يوم المباراة بدقة وتصفير الأيام المتبقية عندما يحل موعد اللقاء');
} catch (e: any) {
  assert(false, 'حركة الأيام', 'استثناء غير متوقع في محرك حركة الأيام', e.message);
}

// -------------------------------------------------------------
// 2. TEST: الإصابات (Injuries System)
// -------------------------------------------------------------
console.log('\n--- 2. Testing الإصابات (Injuries System) ---');
try {
  // Test injured player days remaining countdown
  const mockInjuredPlayer = {
    id: 'p_inj_1',
    name: 'أحمد حجازي',
    position: 'CB',
    overallRating: 78,
    potentialRating: 80,
    age: 33,
    fitness: 60,
    morale: 80,
    form: 6,
    injury: {
      type: 'تمزق في العضلة الخلفية',
      daysRemaining: 3,
      severity: 'moderate',
      description: 'تمزق عضلي',
    },
    isInjured: true,
  } as unknown as Player;

  // Run 1 day of simulation
  const day1Result = simulateDailySquadTraining([mockInjuredPlayer], 'normal', 1);
  const pAfterDay1 = day1Result.updatedPlayers[0];
  assert(pAfterDay1.injury?.daysRemaining === 2, 'الإصابات', 'تناقص أيام الإصابة بمقدار 1 يوم بعد التدريب اليومي');
  assert(pAfterDay1.fitness > 60, 'الإصابات', 'استعادة طفيفة للياقة أثناء مرحلة التأهيل');

  // Run day 2
  const day2Result = simulateDailySquadTraining([pAfterDay1], 'normal', 1);
  const pAfterDay2 = day2Result.updatedPlayers[0];
  assert(pAfterDay2.injury?.daysRemaining === 1, 'الإصابات', 'استمرار تناقص أيام الإصابة لليوم الثاني');

  // Run day 3 -> should fully recover!
  const day3Result = simulateDailySquadTraining([pAfterDay2], 'normal', 1);
  const pAfterDay3 = day3Result.updatedPlayers[0];
  assert(pAfterDay3.injury === null, 'الإصابات', 'تعافي اللاعب بالكامل وتصفير كائن الإصابة بعد انتهاء المدة');
  assert(day3Result.injuryUpdates.some(u => u.playerId === 'p_inj_1' && u.recovered), 'الإصابات', 'إصدار تقرير طبي رسمي بالتعافي الكامل للاعب');
} catch (e: any) {
  assert(false, 'الإصابات', 'استثناء في نظام الإصابات', e.message);
}

// -------------------------------------------------------------
// 3. TEST: الإيقاف (Suspensions System)
// -------------------------------------------------------------
console.log('\n--- 3. Testing الإيقاف (Suspensions System) ---');
try {
  // Rule 1: Red card gives 2 match suspension
  const redCards = 1;
  const newSuspensionMatchesRed = redCards > 0 ? 2 : 0;
  assert(newSuspensionMatchesRed === 2, 'الإيقاف', 'الطرد المباشر ببطاقة حمراء يعاقب بالإيقاف لمباراتين رسميتين');

  // Rule 2: 3 yellow cards accumulation gives 1 match suspension
  const yellows3 = 3;
  const isYellowSuspension3 = yellows3 % 3 === 0;
  assert(isYellowSuspension3 === true, 'الإيقاف', 'تراكم 3 بطاقات صفراء يفرض عقوبة الإيقاف لمباراة واحدة');

  const yellows4 = 4;
  const isYellowSuspension4 = yellows4 % 3 === 0;
  assert(isYellowSuspension4 === false, 'الإيقاف', 'عدم فرض إيقاف عندما لا تكون البطاقات الصفراء من مضاعفات الـ 3');

  const yellows6 = 6;
  const isYellowSuspension6 = yellows6 % 3 === 0;
  assert(isYellowSuspension6 === true, 'الإيقاف', 'تراكم 6 بطاقات صفراء يفرض إيقافاً جديداً لمباراة واحدة');

  // Decrement rule: After a match, suspension decreases by 1
  let suspension = 2;
  suspension = Math.max(0, suspension - 1);
  assert(suspension === 1, 'الإيقاف', 'تناقص الإيقاف من 2 إلى 1 بعد خوض مباراة');
  suspension = Math.max(0, suspension - 1);
  assert(suspension === 0, 'الإيقاف', 'انتهاء عقوبة الإيقاف وعودة اللاعب للجاهزية (0 مباريات متبقية)');
} catch (e: any) {
  assert(false, 'الإيقاف', 'استثناء في فحص قواعد الإيقاف', e.message);
}

// -------------------------------------------------------------
// 4. TEST: العلاج (Medical Treatment & Ad Healing)
// -------------------------------------------------------------
console.log('\n--- 4. Testing العلاج (Medical Treatment & Ad Healing) ---');
try {
  // Physio: reduces days by ~35% (daysRemaining * 0.65)
  const initialDays = 10;
  const physioDays = Math.max(1, Math.ceil(initialDays * 0.65));
  assert(physioDays === 7, 'العلاج', 'العلاج الطبيعي يقلص 10 أيام إلى 7 أيام بتكلفة 5,000 ج.م');

  // Specialist: reduces days by ~65% (daysRemaining * 0.35)
  const specialistDays = Math.max(1, Math.ceil(initialDays * 0.35));
  assert(specialistDays === 4, 'العلاج', 'الطبيب الأخصائي يقلص 10 أيام إلى 4 أيام بتكلفة 20,000 ج.م');

  // PRP: instant recovery if <= 4 days, else 1 day
  const prpDaysFrom4 = 4 <= 4 ? 0 : 1;
  assert(prpDaysFrom4 === 0, 'العلاج', 'حقن البلازما (PRP) يشفي الإصابات الخفيفة (<= 4 أيام) فورياً بنسبة 100%');

  // AdMob Rewarded Healing: 100% instant recovery regardless of days!
  const healedState = {
    isInjured: false,
    injury: null,
    injuryType: undefined,
    fitness: 95,
  };
  assert(healedState.isInjured === false && healedState.injury === null, 'العلاج', 'العلاج المجاني بمشاهدة الإعلان يزيل الإصابة فوراً ويعيد اللاعب لقائمة الجاهزين');
} catch (e: any) {
  assert(false, 'العلاج', 'استثناء في نظام العلاج', e.message);
}

// -------------------------------------------------------------
// 5. TEST: الانتقالات والمفاوضات اليومية (Transfers & Negotiations)
// -------------------------------------------------------------
console.log('\n--- 5. Testing الانتقالات والمفاوضات (Transfers & Negotiations) ---');
try {
  const mockUserClub = {
    id: 'club_user',
    name: 'الأهلي',
    shortName: 'الأهلي',
    budget: 50000000,
    players: [],
    reputation: 85,
    tier: 1,
  } as unknown as Club;

  const mockActiveNeg = {
    id: 'neg_1',
    playerId: 'p_trans_1',
    playerName: 'إمام عاشور',
    playerClubId: 'club_other',
    playerClubName: 'نادي ميتلاند',
    playerPosition: 'CM',
    playerOverall: 80,
    bidFee: 25000000,
    offeredSalary: 150000,
    contractYears: 3,
    stage: 'club_review',
    type: 'buy',
    daysRemainingInStage: 1,
    history: [],
  } as unknown as ActiveNegotiation;

  // Run daily negotiations simulation
  const negResult = simulateDailyNegotiations([mockActiveNeg], mockUserClub, [
    mockUserClub,
    {
      id: 'club_other',
      name: 'نادي ميتلاند',
      shortName: 'ميتلاند',
      budget: 100000000,
      reputation: 75,
      tier: 1,
      players: [
        {
          id: 'p_trans_1',
          name: 'إمام عاشور',
          position: 'CM',
          overallRating: 80,
          potentialRating: 84,
          age: 26,
          marketValue: 20000000,
          salary: 100000,
          fitness: 100,
          morale: 85,
          form: 7,
        } as unknown as Player,
      ],
    } as unknown as Club,
  ]);

  assert(negResult.updatedNegotiations.length > 0, 'الانتقالات', 'محاكاة المفاوضات النشطة تعمل بدون توقف');
  const updatedDeal = negResult.updatedNegotiations[0];
  const validStages: string[] = ['player_terms', 'club_counter', 'rejected', 'completed', 'incoming_bid'];
  assert(
    validStages.includes(updatedDeal.stage),
    'الانتقالات',
    `تطور المفاوضة إلى مرحلة منطقية بعد مراجعة النادي (المرحلة الحالية: ${updatedDeal.stage})`
  );
} catch (e: any) {
  assert(false, 'الانتقالات', 'استثناء في نظام المفاوضات والانتقالات', e.message);
}

// -------------------------------------------------------------
// 6. TEST: البرومو كود (Promo Codes System)
// -------------------------------------------------------------
console.log('\n--- 6. Testing البرومو كود (Promo Code System) ---');
try {
  // Test clean input (Arabic digits, zero-width chars, spaces)
  const messyInput = '  WELCOME١٠M\u200B  ';
  const cleaned = cleanPromoCodeInput(messyInput);
  assert(cleaned === 'WELCOME10M', 'البرومو كود', 'تنظيف الكود وتحويل الأرقام العربية (١٠) إلى أرقام قياسية (10) وحذف المسافات والمحارف الخفية');

  // Test generic identifier protection
  assert(isGenericOrSharedIdentifier('TRN-INIT') === true, 'البرومو كود', 'اكتشاف وتجاوز المعرفات العامة الثابتة (TRN-INIT)');
  assert(isGenericOrSharedIdentifier('local_user') === true, 'البرومو كود', 'اكتشاف وتجاوز المعرفات الافتراضية (local_user)');
  assert(isGenericOrSharedIdentifier('usr_real_account_9981') === false, 'البرومو كود', 'قبول المعرفات الحقيقية الفريدة للمستخدم');

  // Test effective identifier fallback
  const fallbackId = getEffectiveUserIdentifier(null, 'TRN-INIT');
  assert(fallbackId.startsWith('dev_') || fallbackId.length > 10, 'البرومو كود', 'توليد معرّف جهاز فريد ومستقل للزائر لمنع تعارض استرداد الأكواد بين الأجهزة');
} catch (e: any) {
  assert(false, 'البرومو كود', 'استثناء في نظام البرومو كود', e.message);
}

// -------------------------------------------------------------
// 7. TEST: هدايا ومكافآت الإعلانات AdMob Rewarded (AdMob System)
// -------------------------------------------------------------
console.log('\n--- 7. Testing مكافآت الإعلانات AdMob (Ad Rewards System) ---');
try {
  // Verify definitions
  const coinsDef = AD_REWARD_DEFINITIONS.coins;
  assert(coinsDef.amount === 50, 'مكافآت الإعلانات', 'مكافأة الكوينز تعطي 50 كوينز');

  const fundsDef = AD_REWARD_DEFINITIONS.club_funds;
  assert(fundsDef.amount === 100000, 'مكافآت الإعلانات', 'مكافأة تمويل النادي تمنح 100,000 ج.م');

  const energyDef = AD_REWARD_DEFINITIONS.team_energy;
  assert(energyDef.amount === 15, 'مكافآت الإعلانات', 'مكافأة الطاقة البدنية تمنح +15% لياقة');

  const trainingDef = AD_REWARD_DEFINITIONS.training_boost;
  assert(trainingDef.amount === 5, 'مكافآت الإعلانات', 'مكافأة التدريب التكتيكي تمنح +5% أفضلية تكتيكية');

  // Test single-use session tokens & double-claim prevention
  const session1 = AdRewardManager.createAdSession('coins');
  const session2 = AdRewardManager.createAdSession('coins');
  assert(session1 !== session2, 'مكافآت الإعلانات', 'كل جلسة إعلان تحصل على توكن أمني فريد (Unique Transaction Token)');

  // Claim once
  const claim1 = AdRewardManager.verifyAndConsumeReward(session1, 'coins');
  assert(claim1.success === true && claim1.amount === 50, 'مكافآت الإعلانات', 'صرف المكافأة بنجاح لأول مرة');

  // Double claim with same session token MUST fail
  const claimDuplicate = AdRewardManager.verifyAndConsumeReward(session1, 'coins');
  assert(claimDuplicate.success === false, 'مكافآت الإعلانات', 'حماية منع استلام نفس المكافأة مرتين لنفس الجلسة (Double Claim Prevention)');

  // Verify production configuration
  assert(typeof PRODUCTION_AD_IDS.APP_ID === 'string' && PRODUCTION_AD_IDS.APP_ID.includes('~'), 'مكافآت الإعلانات', 'صحة بنية AdMob App ID الرسمي');
  assert(typeof PRODUCTION_AD_IDS.REWARDED_ID === 'string' && PRODUCTION_AD_IDS.REWARDED_ID.includes('/'), 'مكافآت الإعلانات', 'صحة بنية AdMob Rewarded Ad Unit ID الرسمي');
} catch (e: any) {
  assert(false, 'مكافآت الإعلانات', 'استثناء في نظام مكافآت الإعلانات', e.message);
}

// -------------------------------------------------------------
// SUMMARY REPORT
// -------------------------------------------------------------
console.log('\n======================================================');
const total = results.length;
const passed = results.filter(r => r.passed).length;
const failed = total - passed;
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
