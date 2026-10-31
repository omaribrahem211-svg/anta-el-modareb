import { ManagerProfile, Player, Club, FormationType, TacticalStyle, CoachingLicenseTier, OfficialCoachingLicenseTier, SeasonEndSummary } from '../types/game';

export interface ManagerTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'salary' | 'trophy_bonus' | 'course_license' | 'license_upgrade' | 'license_renewal' | 'club_donation' | 'player_bonus' | 'match_bonus';
  description: string;
}

/** Tactical items a workshop opens for the coach, on top of what the license already allows. */
export interface CourseUnlocks {
  formations?: FormationType[];
  styles?: TacticalStyle[];
}

export interface CoachingCourse {
  id: string;
  /** Tactical formations / playing styles this course opens (tactic workshops only). */
  unlocks?: CourseUnlocks;
  /** When true the coach may watch a rewarded ad to open the course until the end of the current season. */
  adUnlockable?: boolean;
  title: string;
  category: 'license' | 'tactic' | 'psychology' | 'fitness' | 'fellowship';
  cost: number;
  annualRenewalFee?: number;
  requiredLicense?: OfficialCoachingLicenseTier;
  grantsLicense?: OfficialCoachingLicenseTier;
  description: string;
  xpReward: number;
  reputationReward: number;
  specialBenefit: string;
  iconName: 'Award' | 'Sparkles' | 'Heart' | 'Activity' | 'Globe';
}

export const COACHING_COURSES: CoachingCourse[] = [
  // Official 4 Coaching Licenses
  {
    id: 'license_basic',
    title: 'الرخصة الأولية (Basic License)',
    category: 'license',
    cost: 0,
    annualRenewalFee: 0,
    grantsLicense: 'BASIC',
    description: 'الرخصة الافتراضية المجانية التي تُمنح تلقائياً لأي مدرب جديد عند بدء مسيرته التدريبية.',
    xpReward: 200,
    reputationReward: 4,
    specialBenefit: 'صلاحية تدريب أندية الدرجة الثانية (وما دونها) في الدوريات العربية فقط. رسوم التجديد السنوية: مجانية (0 ج.م).',
    iconName: 'Award',
  },
  {
    id: 'license_premier',
    title: 'الرخصة الممتازة (Premier License)',
    category: 'license',
    cost: 2_500_000,
    annualRenewalFee: 250_000,
    requiredLicense: 'BASIC',
    grantsLicense: 'PREMIER',
    description: 'رخصة احترافية تمنحك صلاحية قيادة جميع أندية الدوريات الممتازة العربية دون قيود.',
    xpReward: 1200,
    reputationReward: 15,
    specialBenefit: 'صلاحية تدريب جميع أندية الدوريات الممتازة العربية دون قيود. رسوم التجديد السنوية: 250,000 ج.م (تُخصم مع بداية كل موسم جديد).',
    iconName: 'Award',
  },
  {
    id: 'license_continental',
    title: 'الرخصة الأوروبية (Continental License)',
    category: 'license',
    cost: 6_000_000,
    annualRenewalFee: 600_000,
    requiredLicense: 'PREMIER',
    grantsLicense: 'CONTINENTAL',
    description: 'رخصة قارية ودولية تفتح لك أبواب التدريب في أوروبا وبقية قارات العالم.',
    xpReward: 2800,
    reputationReward: 30,
    specialBenefit: 'صلاحية التدريب في أوروبا وبقية قارات العالم، باستثناء فرق النخبة والقمة (Tier 1 / Elite Clubs). رسوم التجديد السنوية: 600,000 ج.م.',
    iconName: 'Award',
  },
  {
    id: 'license_legendary',
    title: 'الرخصة الأسطورية (Legendary / Pro License)',
    category: 'license',
    cost: 15_000_000,
    annualRenewalFee: 1_500_000,
    requiredLicense: 'CONTINENTAL',
    grantsLicense: 'LEGENDARY',
    description: 'أعلى وسام تدريبي في العالم لقيادة كبرى فرق النخبة والعمالقة في أوروبا والعالم دون أي قيود.',
    xpReward: 5000,
    reputationReward: 50,
    specialBenefit: 'صلاحية تدريب كبرى فرق النخبة والعمالقة في أوروبا والعالم دون أي قيود. رسوم التجديد السنوية: 1,500,000 ج.م.',
    iconName: 'Award',
  },

  // Specialized Seminars & Development Courses
  {
    id: 'workshop_gegenpress',
    title: 'ورشة الضغط العكسي والتحولات السريعة',
    category: 'tactic',
    cost: 25000,
    adUnlockable: true,
    unlocks: { styles: ['gegenpress', 'fast_transition'], formations: ['4-1-3-2'] },
    description: 'دراسة متعمقة لأساليب الضغط العالي الخانق، استرجاع الكرة في الثلث الأخير، وتضييق المساحات.',
    xpReward: 250,
    reputationReward: 3,
    specialBenefit: 'تفتح أسلوبَي «الضغط العكسي» و«التحول السريع» وتشكيل 4-1-3-2. عند الشراء الدائم: +25 نقطة تطوير للاعبيك.',
    iconName: 'Sparkles',
  },
  {
    id: 'workshop_possession',
    title: 'ورشة الاستحواذ وبناء اللعب من الخلف',
    category: 'tactic',
    cost: 30000,
    adUnlockable: true,
    unlocks: { styles: ['tiki_taka', 'build_up_from_back'], formations: ['4-1-2-1-2', '3-3-3-1'] },
    description: 'التمرير القصير، المثلثات، وخروج الكرة من الحارس بثقة للسيطرة على إيقاع المباراة.',
    xpReward: 280,
    reputationReward: 3,
    specialBenefit: 'تفتح «تيكي تاكا» و«بناء اللعب من الخلف» وتشكيلَي 4-1-2-1-2 و3-3-3-1.',
    iconName: 'Sparkles',
  },
  {
    id: 'workshop_back_three',
    title: 'ورشة منظومة الثلاثي الخلفي والأظهرة المتقدمة',
    category: 'tactic',
    cost: 30000,
    adUnlockable: true,
    unlocks: { formations: ['3-4-3', '3-4-2-1', '3-4-1-2'] },
    description: 'كيف تُدار ثلاثية الدفاع مع ظهيرين جناحين يتقدمان بالكرة وبدونها.',
    xpReward: 280,
    reputationReward: 3,
    specialBenefit: 'تفتح تشكيلات 3-4-3 و3-4-2-1 و3-4-1-2.',
    iconName: 'Sparkles',
  },
  {
    id: 'workshop_midfield_control',
    title: 'ورشة السيطرة على وسط الملعب والكرات الطويلة',
    category: 'tactic',
    cost: 25000,
    adUnlockable: true,
    unlocks: { styles: ['long_ball'], formations: ['4-1-4-1', '4-3-2-1'] },
    description: 'تأمين الارتكاز، الانتقال المباشر للمهاجمين بالكرات الطويلة، وتنظيم خطوط الوسط.',
    xpReward: 250,
    reputationReward: 3,
    specialBenefit: 'تفتح أسلوب «الكرات الطويلة» وتشكيلَي 4-1-4-1 و4-3-2-1.',
    iconName: 'Sparkles',
  },
  {
    id: 'workshop_modern_attack',
    title: 'ورشة الهجوم الحديث والتحكم في الإيقاع',
    category: 'tactic',
    cost: 120000,
    adUnlockable: true,
    unlocks: { styles: ['possession_control', 'transition_control', 'fluid_creative'], formations: ['4-2-2-2', '4-3-1-2', '3-2-4-1', '4-2-4'] },
    description: 'تنويع الهجوم بين الاستحواذ الطويل والتحولات الخاطفة مع حرية إبداعية لصناع اللعب.',
    xpReward: 600,
    reputationReward: 5,
    specialBenefit: 'تفتح «التحكم بالاستحواذ» و«التحكم بالتحولات» و«الإبداع الحر» وتشكيلات 4-2-2-2 و4-3-1-2 و3-2-4-1 و4-2-4.',
    iconName: 'Sparkles',
  },
  {
    id: 'workshop_defensive_masterclass',
    title: 'ورشة التحصين الدفاعي وإغلاق المساحات',
    category: 'tactic',
    cost: 100000,
    adUnlockable: true,
    unlocks: { formations: ['5-3-2', '5-4-1', '5-2-3'] },
    description: 'تنظيم دفاع الخمسة، الكتلة المنخفضة، والمرتدات الفتاكة ضد الفرق الأقوى.',
    xpReward: 550,
    reputationReward: 5,
    specialBenefit: 'تفتح تشكيلات 5-3-2 و5-4-1 و5-2-3.',
    iconName: 'Sparkles',
  },
  {
    id: 'masterclass_positional',
    title: 'ماستركلاس لعب المراكز والتشكيلات المتغيرة',
    category: 'tactic',
    cost: 1500000,
    requiredLicense: 'PREMIER',
    adUnlockable: true,
    unlocks: { styles: ['fluid_positional_play'], formations: ['4-2-3-1-asym', '3-4-3-diamond', '3-2-2-3'] },
    description: 'مدرسة المدربين الكبار: لاعبون يغيرون مراكزهم أثناء اللعب وتفوق عددي في كل منطقة.',
    xpReward: 1500,
    reputationReward: 12,
    specialBenefit: 'تفتح «لعب المراكز المتغير» وتشكيلات 4-2-3-1 اللامتماثل و3-4-3 الماسي و3-2-2-3.',
    iconName: 'Award',
  },
  {
    id: 'masterclass_mastermind',
    title: 'ماستركلاس العقل المدبر (النخبة العالمية)',
    category: 'tactic',
    cost: 3000000,
    requiredLicense: 'PREMIER',
    adUnlockable: true,
    unlocks: { styles: ['tactical_mastermind'], formations: ['2-3-5', '4-2-1-3'] },
    description: 'أرقى ما وصل إليه التفكير التكتيكي: خطط جريئة تُربك أكبر الفرق وتغير مجرى المباراة.',
    xpReward: 2500,
    reputationReward: 20,
    specialBenefit: 'تفتح «العقل التكتيكي المدبر» وتشكيلَي 2-3-5 و4-2-1-3.',
    iconName: 'Award',
  },

  {
    id: 'course_psychology',
    title: 'دبلومة علم النفس الرياضي وإدارة غرف الملابس',
    category: 'psychology',
    cost: 35000,
    description: 'تقنيات تحفيز اللاعبين، نزع الخلافات، التعامل مع النجوم وأصحاب الشخصيات الصعبة لتحقيق الانسجام الكامل.',
    xpReward: 300,
    reputationReward: 4,
    specialBenefit: 'رفع معنويات جميع لاعبي الفريق فوراً إلى 100% (حالة حماسية فائقة) وتقليل شكاوى اللعب.',
    iconName: 'Heart',
  },
  {
    id: 'course_conditioning',
    title: 'دورة الإعداد البدني الحديث والوقاية من الإصابات',
    category: 'fitness',
    cost: 30000,
    description: 'برامج الاستشفاء الرياضي السريع، التغذية المتقدمة للرياضيين، وتفادي الحمل العضلي الزائد.',
    xpReward: 280,
    reputationReward: 3,
    specialBenefit: 'استعادة فورية لـ 15% من لياقة جميع لاعبي الفريق وتقليل احتمالية الإصابات في المباريات القادمة.',
    iconName: 'Activity',
  },
  {
    id: 'fellowship_elite',
    title: 'معايشة فنية بأكاديمية أوروبية عالمية',
    category: 'fellowship',
    cost: 75000,
    description: 'معايشة تدريبية وميدانية مع كبار مدربي الأكاديميات الكبرى (لا ماسيا، أياكس، بايرن ميونخ).',
    xpReward: 650,
    reputationReward: 6,
    specialBenefit: 'منح 50 نقطة تطوير فورية للاعبيك الموهوبين وفتح آفاق فنية واسعة لتطوير الشباب.',
    iconName: 'Globe',
  },
];

/**
 * Calculate realistic initial savings for a player based on age, salary, and career stage
 */
export function calculateInitialPlayerSavings(player: { salary?: number; age?: number; marketValue?: number }): number {
  const wage = player.salary || 3000;
  const age = player.age || 22;
  const careerYears = Math.max(1, age - 17);
  // Average player saves between 4 and 16 months worth of salary depending on career length
  const savingsFactor = Math.min(20, Math.floor(careerYears * 1.5) + 3);
  return Math.round(wage * savingsFactor);
}

/**
 * Calculate default manager salary based on club reputation and league division
 */
export function calculateDefaultManagerSalary(clubReputation: number = 40, tier: number = 4): number {
  if (tier === 1) return Math.round(clubReputation * 1200 + 40000);
  if (tier === 2) return Math.round(clubReputation * 700 + 20000);
  if (tier === 3) return Math.round(clubReputation * 400 + 12000);
  return Math.round(clubReputation * 250 + 8000);
}


/* -------------------------------------------------------------------------- */
/* Course access: permanent purchase OR season-long rewarded-ad access         */
/* -------------------------------------------------------------------------- */

export type CourseAccessMode = 'owned' | 'season' | 'none';

/** 'owned' = bought for good, 'season' = unlocked by an ad and valid through the stored season number. */
export function getCourseAccess(manager: Pick<ManagerProfile, 'completedCourses' | 'seasonCourseAccess'>, courseId: string, seasonNumber: number): CourseAccessMode {
  if ((manager.completedCourses || []).includes(courseId)) return 'owned';
  const until = manager.seasonCourseAccess?.[courseId];
  if (typeof until === 'number' && until >= seasonNumber) return 'season';
  return 'none';
}

export interface ActiveCourseUnlocks {
  formations: Set<string>;
  styles: Set<string>;
}

/** Everything the coach currently has open through courses (permanent or season access). */
export function getActiveCourseUnlocks(
  manager: Pick<ManagerProfile, 'completedCourses' | 'seasonCourseAccess'> | null | undefined,
  seasonNumber: number
): ActiveCourseUnlocks {
  const out: ActiveCourseUnlocks = { formations: new Set(), styles: new Set() };
  if (!manager) return out;
  for (const course of COACHING_COURSES) {
    if (!course.unlocks) continue;
    if (getCourseAccess(manager, course.id, seasonNumber) === 'none') continue;
    (course.unlocks.formations || []).forEach(f => out.formations.add(f));
    (course.unlocks.styles || []).forEach(st => out.styles.add(st));
  }
  return out;
}

/** The course (if any) that opens a given formation/style, to tell the coach where to get it. */
export function findCoursesUnlocking(kind: 'formation' | 'style', id: string): CoachingCourse[] {
  return COACHING_COURSES.filter(c =>
    kind === 'formation' ? (c.unlocks?.formations || []).includes(id as FormationType) : (c.unlocks?.styles || []).includes(id as TacticalStyle)
  );
}

/* -------------------------------------------------------------------------- */
/* Manager rewards                                                             */
/* -------------------------------------------------------------------------- */

const TIER_SCALE: Record<number, number> = { 1: 1, 2: 0.4, 3: 0.17, 4: 0.08 };

/** Money the coach earns for one league win (paid on top of the weekly salary). */
export function calculateWinBonus(monthlySalary: number | undefined, divisionTier: number): number {
  const weekly = Math.round((monthlySalary || 25000) / 4);
  const tierBoost = divisionTier <= 1 ? 1.0 : divisionTier === 2 ? 0.8 : 0.6;
  return Math.max(2000, Math.round(weekly * tierBoost));
}

/**
 * End-of-season payout for the coach, deposited in the personal wallet:
 * 12 months of salary + 25% of the club prize money + title / promotion / trophy bonuses + a per-win bonus.
 */
export function calculateManagerSeasonBonus(
  summary: Pick<SeasonEndSummary, 'prizeMoney' | 'divisionTier' | 'resultStatus' | 'wins' | 'cupTrophyAwarded' | 'continentalTrophyAwarded'>,
  manager: { personalSalary?: number; monthlySalary?: number }
): number {
  const tier = Math.max(1, Math.min(4, summary.divisionTier || 1));
  const scale = TIER_SCALE[tier] ?? 0.08;
  const salaryYear = (manager.monthlySalary || manager.personalSalary || 15000) * 12;
  const prizeShare = Math.round((summary.prizeMoney || 0) * 0.25);

  let achievement = 0;
  if (summary.resultStatus === 'champion') achievement += Math.round(3_000_000 * scale);
  else if (summary.resultStatus === 'promoted') achievement += Math.round(1_200_000 * scale);
  if (summary.cupTrophyAwarded) achievement += Math.round(1_500_000 * Math.max(scale, 0.2));
  if (summary.continentalTrophyAwarded) achievement += 4_000_000;

  const winBonus = (summary.wins || 0) * Math.round(8000 * Math.max(scale, 0.15));
  return Math.round(salaryYear + prizeShare + achievement + winBonus);
}
