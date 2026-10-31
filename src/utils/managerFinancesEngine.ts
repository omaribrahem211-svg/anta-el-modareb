import { ManagerProfile, Player, Club, FormationType, CoachingLicenseTier, OfficialCoachingLicenseTier } from '../types/game';

export interface ManagerTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'salary' | 'trophy_bonus' | 'course_license' | 'license_upgrade' | 'license_renewal' | 'club_donation' | 'player_bonus' | 'match_bonus';
  description: string;
}

export interface CoachingCourse {
  id: string;
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
    title: 'ورشة عمل التكتيك الحديث والضغط العكسي',
    category: 'tactic',
    cost: 25000,
    description: 'دراسة متعمقة لأساليب الضغط العالي الخانق، استرجاع الكرة في الثلث الأخير، وتضييق المساحات.',
    xpReward: 250,
    reputationReward: 3,
    specialBenefit: 'منح 25 نقطة تطوير فورية للاعبيك، ورفع كفاءة استخلاص الكرة بدون مخالفات.',
    iconName: 'Sparkles',
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
