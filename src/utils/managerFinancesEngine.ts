import { ManagerProfile, Player, Club, FormationType } from '../types/game';

export interface ManagerTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'salary' | 'trophy_bonus' | 'course_license' | 'club_donation' | 'player_bonus' | 'match_bonus';
  description: string;
}

export interface CoachingCourse {
  id: string;
  title: string;
  category: 'license' | 'tactic' | 'psychology' | 'fitness' | 'fellowship';
  cost: number;
  requiredLicense?: 'D' | 'C' | 'B' | 'A';
  grantsLicense?: 'D' | 'C' | 'B' | 'A' | 'PRO';
  description: string;
  xpReward: number;
  reputationReward: number;
  specialBenefit: string;
  iconName: 'Award' | 'Sparkles' | 'Heart' | 'Activity' | 'Globe';
}

export const COACHING_COURSES: CoachingCourse[] = [
  // Official Licenses
  {
    id: 'license_d',
    title: 'رخصة التدريب التأسيسية (CAF / الاتحاد المحلي D)',
    category: 'license',
    cost: 15000,
    grantsLicense: 'D',
    description: 'الدورة التأسيسية المعتمدة لمدربي كرة القدم لدراسة مبادئ التدريب، إدارة الحصص التدريبية، والتطوير الفني والبدني للاعبين.',
    xpReward: 200,
    reputationReward: 4,
    specialBenefit: 'الاعتماد الرسمي لرخصة التدريب D، فتح مسار التراخيص القارية المتقدمة (C و B)، وزيادة رصيد تصنيفك العالمي (+20 نقطة).',
    iconName: 'Award',
  },
  {
    id: 'license_c',
    title: 'رخصة التدريب القارية (CAF / UEFA C)',
    category: 'license',
    cost: 50000,
    requiredLicense: 'D',
    grantsLicense: 'C',
    description: 'دورة تدريبية معتمدة لتطوير أسس بناء اللعب، إدارة الحصص التدريبية، والتمركز التكتيكي الحديث.',
    xpReward: 400,
    reputationReward: 6,
    specialBenefit: 'ترقية الرخصة الرسمية إلى C، وزيادة تأثيرك التدريبي ونقاط تصنيفك العالمي (+30 نقطة).',
    iconName: 'Award',
  },
  {
    id: 'license_b',
    title: 'رخصة التدريب المتقدمة (CAF / UEFA B)',
    category: 'license',
    cost: 150000,
    requiredLicense: 'C',
    grantsLicense: 'B',
    description: 'تأهيل متقدم للمدربين في تحليل الأداء الرقمي، التحولات الهجومية السريعة، والتكتيك المضاد.',
    xpReward: 850,
    reputationReward: 12,
    specialBenefit: 'ترقية الرخصة إلى B، تسريع تطور لاعبيك الشباب بنسبة 15%، ورفع تصنيفك العالمي (+60 نقطة).',
    iconName: 'Award',
  },
  {
    id: 'license_a',
    title: 'رخصة النخبة الإدارية والتكتيكية (CAF / UEFA A)',
    category: 'license',
    cost: 350000,
    requiredLicense: 'B',
    grantsLicense: 'A',
    description: 'الشهادة التكتيكية الاحترافية العليا لإدارة أندية الدوريات الممتازة والمنافسة على الألقاب الكبرى.',
    xpReward: 1600,
    reputationReward: 20,
    specialBenefit: 'ترقية الرخصة إلى A، تحسين قراءة المباريات، تقليل الإرهاق البدني للاعبيك، وتصنيف عالمي مرموق (+120 نقطة).',
    iconName: 'Award',
  },
  {
    id: 'license_pro',
    title: 'رخصة الاتحاد الدولي للمحترفين (FIFA / CAF PRO)',
    category: 'license',
    cost: 850000,
    requiredLicense: 'A',
    grantsLicense: 'PRO',
    description: 'أعلى وسام تدريبي عالمي للمحترفين يُمنح لصفوة مدربي العالم لقيادة المنتخبات والأندية العملاقة.',
    xpReward: 3200,
    reputationReward: 35,
    specialBenefit: 'ترقية الرخصة لأعلى مستوى PRO دولي، زيادة قدرة الحسم في النهائيات، وقفزة كبرى في التصنيف العالمي (+250 نقطة).',
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
