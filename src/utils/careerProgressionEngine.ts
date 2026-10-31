import {
  ManagerProfile,
  Club,
  LeagueDefinition,
  CoachingLicenseTier,
  CareerMilestone,
  CareerDynamicChallenge,
  ClubPrestigeTier,
  JobOffer,
  JobOfferCategory,
  TeamTactics,
} from '../types/game';

// ============================================================================
// 1. CENTRALIZED CONFIGURATION (مكان مركزي واحد لكافة قيم وضوابط المسيرة)
// ============================================================================

export interface LicenseRequirements {
  minLevel: number;
  minMatches: number;
  minWins: number;
  minWinRate: number; // percentage (e.g. 40 = 40%)
  minTrophies: number;
  minReputation: number;
  minPlayersDeveloped: number;
  minActivePlayMinutes: number; // Real active in-game minutes (Anti-AFK verified)
  examCost: number; // One-time purchase cost ($)
}

export interface LicenseConfigItem {
  id: CoachingLicenseTier;
  codeName: string;
  arabicTitle: string;
  titleArabic: string;
  badgeName: string;
  badgeIcon: string;
  rankIndex: number;
  purchaseCost: number;
  annualRenewalFee: number;
  tierDescription: string;
  description: string;
  unlockedClubsDescription: string;
  requirements: LicenseRequirements;
  perks: string[];
}

export interface ClubTierDefinition {
  id: ClubPrestigeTier;
  tierLevel: number; // 1 to 6
  nameArabic: string;
  minLicense: CoachingLicenseTier;
  minReputation: number;
  minTrophies: number;
  minMatches: number;
  minWinRate: number;
  minManagerLevel: number;
  description: string;
  exampleClubs: string;
}

export const OFFICIAL_LICENSES: ('BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY')[] = [
  'BASIC',
  'PREMIER',
  'CONTINENTAL',
  'LEGENDARY',
];

const BASIC_LICENSE_DEF: LicenseConfigItem = {
  id: 'BASIC',
  codeName: 'BASIC',
  arabicTitle: 'الرخصة الأولية (Basic License)',
  titleArabic: 'الرخصة الأولية (Basic License)',
  badgeName: 'Basic License',
  badgeIcon: '🪪',
  rankIndex: 1,
  purchaseCost: 0,
  annualRenewalFee: 0,
  tierDescription: 'تُمنح تلقائياً لأي مدرب جديد عند بدء مسيرته التدريبية.',
  description: 'تدريب أندية الدرجة الثانية (وما دونها) في الدوريات العربية فقط.',
  unlockedClubsDescription: 'تدريب أندية الدرجة الثانية (وما دونها) في الدوريات العربية فقط.',
  requirements: {
    minLevel: 1,
    minMatches: 0,
    minWins: 0,
    minWinRate: 0,
    minTrophies: 0,
    minReputation: 0,
    minPlayersDeveloped: 0,
    minActivePlayMinutes: 0,
    examCost: 0,
  },
  perks: [
    'تدريب أندية الدرجة الثانية وما دونها في الدوريات العربية فقط',
    'سعر الشراء لمرة واحدة: مجانية (0 ج.م)',
    'رسوم التجديد السنوية: مجانية (0 ج.م)',
  ],
};

const PREMIER_LICENSE_DEF: LicenseConfigItem = {
  id: 'PREMIER',
  codeName: 'PREMIER',
  arabicTitle: 'الرخصة الممتازة (Premier License)',
  titleArabic: 'الرخصة الممتازة (Premier License)',
  badgeName: 'Premier License',
  badgeIcon: '🥈',
  rankIndex: 2,
  purchaseCost: 2_500_000,
  annualRenewalFee: 250_000,
  tierDescription: 'رخصة المحترفين لقيادة كبرى أندية الدوريات الممتازة العربية.',
  description: 'تدريب جميع أندية الدوريات الممتازة العربية دون قيود.',
  unlockedClubsDescription: 'تدريب جميع أندية الدوريات الممتازة العربية دون قيود.',
  requirements: {
    minLevel: 1,
    minMatches: 0,
    minWins: 0,
    minWinRate: 0,
    minTrophies: 0,
    minReputation: 0,
    minPlayersDeveloped: 0,
    minActivePlayMinutes: 0,
    examCost: 2_500_000,
  },
  perks: [
    'تدريب جميع أندية الدوريات الممتازة العربية دون قيود',
    'سعر الشراء لمرة واحدة: 2,500,000 ج.م (من الميزانية الشخصية للمدرب)',
    'رسوم التجديد السنوية: 250,000 ج.م (تُخصم مع بداية كل موسم جديد)',
  ],
};

const CONTINENTAL_LICENSE_DEF: LicenseConfigItem = {
  id: 'CONTINENTAL',
  codeName: 'CONTINENTAL',
  arabicTitle: 'الرخصة الأوروبية (Continental License)',
  titleArabic: 'الرخصة الأوروبية (Continental License)',
  badgeName: 'Continental License',
  badgeIcon: '🌍',
  rankIndex: 3,
  purchaseCost: 6_000_000,
  annualRenewalFee: 600_000,
  tierDescription: 'رخصة قارية ودولية تفتح أبواب التدريب في أوروبا وبقية قارات العالم.',
  description: 'التدريب في أوروبا وبقية قارات العالم، باستثناء فرق النخبة والقمة (Tier 1 / Elite Clubs).',
  unlockedClubsDescription: 'التدريب في أوروبا وبقية قارات العالم، باستثناء فرق النخبة والقمة (Tier 1 / Elite Clubs).',
  requirements: {
    minLevel: 1,
    minMatches: 0,
    minWins: 0,
    minWinRate: 0,
    minTrophies: 0,
    minReputation: 0,
    minPlayersDeveloped: 0,
    minActivePlayMinutes: 0,
    examCost: 6_000_000,
  },
  perks: [
    'التدريب في أوروبا وبقية قارات العالم (باستثناء فرق النخبة والقمة)',
    'سعر الشراء لمرة واحدة: 6,000,000 ج.م (من الميزانية الشخصية للمدرب)',
    'رسوم التجديد السنوية: 600,000 ج.م (تُخصم مع بداية كل موسم جديد)',
  ],
};

const LEGENDARY_LICENSE_DEF: LicenseConfigItem = {
  id: 'LEGENDARY',
  codeName: 'LEGENDARY',
  arabicTitle: 'الرخصة الأسطورية (Legendary / Pro License)',
  titleArabic: 'الرخصة الأسطورية (Legendary / Pro License)',
  badgeName: 'Legendary / Pro License',
  badgeIcon: '👑',
  rankIndex: 4,
  purchaseCost: 15_000_000,
  annualRenewalFee: 1_500_000,
  tierDescription: 'أعلى رخصة تدريبية في العالم لقيادة عمالقة ونخبة أندية كوكب الأرض.',
  description: 'تدريب كبرى فرق النخبة والعمالقة في أوروبا والعالم دون أي قيود.',
  unlockedClubsDescription: 'تدريب كبرى فرق النخبة والعمالقة في أوروبا والعالم دون أي قيود.',
  requirements: {
    minLevel: 1,
    minMatches: 0,
    minWins: 0,
    minWinRate: 0,
    minTrophies: 0,
    minReputation: 0,
    minPlayersDeveloped: 0,
    minActivePlayMinutes: 0,
    examCost: 15_000_000,
  },
  perks: [
    'تدريب كبرى فرق النخبة والعمالقة في أوروبا والعالم دون أي قيود',
    'سعر الشراء لمرة واحدة: 15,000,000 ج.م (من الميزانية الشخصية للمدرب)',
    'رسوم التجديد السنوية: 1,500,000 ج.م (تُخصم مع بداية كل موسم جديد)',
  ],
};

export const CAREER_CONFIG = {
  // ----------------------------------------------------
  // A. COACHING LICENSES SPECIFICATION (4 الرخص التدريبية الجديدة)
  // ----------------------------------------------------
  LICENSES: {
    BASIC: BASIC_LICENSE_DEF,
    PREMIER: PREMIER_LICENSE_DEF,
    CONTINENTAL: CONTINENTAL_LICENSE_DEF,
    LEGENDARY: LEGENDARY_LICENSE_DEF,
    // Legacy fallback aliases mapped to BASIC so no legacy lookup ever fails
    D: BASIC_LICENSE_DEF,
    C: BASIC_LICENSE_DEF,
    B: BASIC_LICENSE_DEF,
    A: PREMIER_LICENSE_DEF,
    PRO: CONTINENTAL_LICENSE_DEF,
    ELITE: LEGENDARY_LICENSE_DEF,
  } as Record<CoachingLicenseTier, LicenseConfigItem>,

  // ----------------------------------------------------
  // B. CLUB PRESTIGE TIERS (منطقية تصنيف الأندية وفق الرخص الـ 4)
  // ----------------------------------------------------
  CLUB_TIERS: {
    tier_dc: {
      id: 'tier_dc',
      tierLevel: 1,
      nameArabic: 'أندية الدرجة الرابعة والثالثة العربية (Basic)',
      minLicense: 'BASIC',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'أندية الدرجات الدنيا (الرابعة والثالثة) في الدوريات العربية.',
      exampleClubs: 'أندية الدرجة الرابعة والثالثة في الدوريات العربية',
    },
    tier_cb: {
      id: 'tier_cb',
      tierLevel: 2,
      nameArabic: 'أندية الدرجة الثانية العربية (Basic)',
      minLicense: 'BASIC',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'أندية الدرجة الثانية وما دونها في الدوريات العربية.',
      exampleClubs: 'أندية الدرجة الثانية ودوري المحترفين العربي',
    },
    tier_ba: {
      id: 'tier_ba',
      tierLevel: 2,
      nameArabic: 'متصدرو الدرجة الثانية العربية (Basic)',
      minLicense: 'BASIC',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'أندية الدرجة الثانية المتنافسة على الصعود في الدوريات العربية.',
      exampleClubs: 'متصدرو دوري الدرجة الثانية العربي',
    },
    tier_apro: {
      id: 'tier_apro',
      tierLevel: 3,
      nameArabic: 'أندية الدوريات الممتازة العربية (Premier)',
      minLicense: 'PREMIER',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'جميع أندية الدوريات الممتازة العربية دون قيود.',
      exampleClubs: 'الأهلي، الزمالك، بيراميدز، الهلال، النصر، الوداد، الترجي، السد، العين',
    },
    tier_pro: {
      id: 'tier_pro',
      tierLevel: 4,
      nameArabic: 'أندية أوروبا والعالم - غير النخبة (Continental)',
      minLicense: 'CONTINENTAL',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'أندية أوروبا وبقية قارات العالم، باستثناء فرق النخبة والقمة.',
      exampleClubs: 'أندية الدوريات الأوروبية والعالمية المتوسطة والطموحة',
    },
    tier_elite: {
      id: 'tier_elite',
      tierLevel: 5,
      nameArabic: 'عمالقة ونخبة أوروبا والعالم (Legendary)',
      minLicense: 'LEGENDARY',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'كبرى فرق النخبة والعمالقة في أوروبا والعالم دون أي قيود.',
      exampleClubs: 'ريال مدريد، مانشستر سيتي، بايرن ميونخ، باريس سان جيرمان، برشلونة، ليفربول',
    },
  } as Record<ClubPrestigeTier, ClubTierDefinition>,

  // ----------------------------------------------------
  // C. MANAGER REPUTATION SYSTEM (سمعة المدرب 0 - 100)
  // ----------------------------------------------------
  REPUTATION_TITLES: [
    { min: 0, max: 25, title: 'مدرب مغمور', color: 'text-slate-400', badge: 'Grassroots' },
    { min: 26, max: 45, title: 'مدرب صاعد وواعد', color: 'text-cyan-400', badge: 'Rising Coach' },
    { min: 46, max: 65, title: 'مدرب معتمد ومحنك', color: 'text-emerald-400', badge: 'Established' },
    { min: 66, max: 80, title: 'مدرب كبير محلياً وقارياً', color: 'text-amber-400', badge: 'Continental' },
    { min: 81, max: 92, title: 'مدرب من الطراز الرفيع عالمياً', color: 'text-purple-400', badge: 'World Class' },
    { min: 93, max: 100, title: 'أسطورة تدريبية خالدة', color: 'text-rose-400', badge: 'Legendary' },
  ],

  // ----------------------------------------------------
  // D. CAREER MILESTONES (الأهداف المستمرة للمسيرة)
  // ----------------------------------------------------
  DEFAULT_MILESTONES: [
    // --- Short-term (قصيرة المدى) ---
    {
      id: 'ms_first_win',
      title: 'أول انتصار رسمي ⚽',
      description: 'حقق أول فوز رسمي لك في مسيرتك التدريبية.',
      category: 'short',
      targetValue: 1,
      rewardReputation: 2,
      rewardXp: 150,
      rewardCash: 25000,
      badgeIcon: 'Trophy',
    },
    {
      id: 'ms_win_streak_3',
      title: 'سلسلة انتصارات ثلاثية 🔥',
      description: 'حقق الفوز في 3 مباريات رسمية متتالية.',
      category: 'short',
      targetValue: 3,
      rewardReputation: 3,
      rewardXp: 250,
      rewardCash: 40000,
      badgeIcon: 'Flame',
    },
    {
      id: 'ms_develop_prospect',
      title: 'صانع النجوم الصاعد ⭐',
      description: 'قم بتطوير لاعب شاب ورفع تقييمه الفني بمقدار نقطتين على الأقل.',
      category: 'short',
      targetValue: 1,
      rewardReputation: 3,
      rewardXp: 200,
      rewardCash: 35000,
      badgeIcon: 'Sparkles',
    },
    {
      id: 'ms_matches_15',
      title: 'بداية الرحلة الاحترافية 🏟️',
      description: 'قم بقيادة 15 مباراة رسمية في مسيرتك.',
      category: 'short',
      targetValue: 15,
      rewardReputation: 3,
      rewardXp: 250,
      rewardCash: 30000,
      badgeIcon: 'Activity',
    },

    // --- Mid-term (متوسطة المدى) ---
    {
      id: 'ms_promotion_champ',
      title: 'بطاقة الصعود التاريخي 🚀',
      description: 'حقق الصعود بفريقك إلى درجة دوري أعلى.',
      category: 'mid',
      targetValue: 1,
      rewardReputation: 8,
      rewardXp: 600,
      rewardCash: 120000,
      badgeIcon: 'TrendingUp',
    },
    {
      id: 'ms_cup_glory',
      title: 'معانقة الكأس 🏆',
      description: 'توج بلقب بطولة الكأس الرسمية.',
      category: 'mid',
      targetValue: 1,
      rewardReputation: 7,
      rewardXp: 500,
      rewardCash: 150000,
      badgeIcon: 'Trophy',
    },
    {
      id: 'ms_license_a',
      title: 'نيل الرخصة الممتازة 🎓',
      description: 'احصل على الرخصة الممتازة (Premier License) لتدريب أندية الدوريات الممتازة العربية.',
      category: 'mid',
      targetValue: 1,
      rewardReputation: 10,
      rewardXp: 800,
      rewardCash: 250000,
      badgeIcon: 'Award',
    },
    {
      id: 'ms_matches_50',
      title: 'الخبير المخضرم (50 مباراة) 📋',
      description: 'أدر 50 مباراة رسمية بنجاح.',
      category: 'mid',
      targetValue: 50,
      rewardReputation: 6,
      rewardXp: 550,
      rewardCash: 90000,
      badgeIcon: 'Shield',
    },
    {
      id: 'ms_giant_slayer',
      title: 'قاهر الكبار ⚔️',
      description: 'انتصر على فريق يفوق فريقك بأكثر من 15 نقطة سمعة.',
      category: 'mid',
      targetValue: 2,
      rewardReputation: 6,
      rewardXp: 450,
      rewardCash: 75000,
      badgeIcon: 'Target',
    },

    // --- Long-term (طويلة المدى) ---
    {
      id: 'ms_premier_champion',
      title: 'بطل الدوري الممتاز 🏆',
      description: 'توج بلقب الدوري الممتاز لأول مرة في مسيرتك.',
      category: 'long',
      targetValue: 1,
      rewardReputation: 15,
      rewardXp: 1200,
      rewardCash: 500000,
      badgeIcon: 'Trophy',
    },
    {
      id: 'ms_continental_trophy',
      title: 'عرش القارة الإفريقية / الآسيوية 🌍',
      description: 'احصد لقب دوري أبطال القارة أو بطولة قارية كبرى.',
      category: 'long',
      targetValue: 1,
      rewardReputation: 16,
      rewardXp: 1500,
      rewardCash: 750000,
      badgeIcon: 'Globe2',
    },
    {
      id: 'ms_license_pro',
      title: 'الرخصة الأوروبية 🌟',
      description: 'احصل على الرخصة الأوروبية (Continental License) لفتح دوريات أوروبا والعالم.',
      category: 'long',
      targetValue: 1,
      rewardReputation: 14,
      rewardXp: 1000,
      rewardCash: 400000,
      badgeIcon: 'Award',
    },
    {
      id: 'ms_two_clubs_trophies',
      title: 'الذهب مع ناديين مختلفين 🤝',
      description: 'توج بالألقاب والبطولات مع ناديين مختلفين.',
      category: 'long',
      targetValue: 2,
      rewardReputation: 12,
      rewardXp: 900,
      rewardCash: 350000,
      badgeIcon: 'Briefcase',
    },
    {
      id: 'ms_matches_100_elite',
      title: 'نادي المئة ومعدل فوز 55%+ 💯',
      description: 'قد 100 مباراة رسمية مع الحفاظ على نسبة انتصارات تفوق 55%.',
      category: 'long',
      targetValue: 100,
      rewardReputation: 15,
      rewardXp: 1400,
      rewardCash: 600000,
      badgeIcon: 'Star',
    },
    {
      id: 'ms_license_elite',
      title: 'الرخصة الأسطورية (Legendary License) 👑🌍',
      description: 'احصل على الرخصة الأسطورية لقيادة كبرى فرق النخبة والعمالقة في أوروبا والعالم.',
      category: 'long',
      targetValue: 1,
      rewardReputation: 20,
      rewardXp: 2500,
      rewardCash: 1200000,
      badgeIcon: 'Award',
    },
    {
      id: 'ms_world_rank_one',
      title: 'المدرب رقم 1 في العالم 🥇',
      description: 'تصدر التصنيف العالمي للفيفا وتفوق على بيب جوارديولا وكبار العالم.',
      category: 'long',
      targetValue: 1,
      rewardReputation: 25,
      rewardXp: 3000,
      rewardCash: 2000000,
      badgeIcon: 'Sparkles',
    },
  ],
};

// ============================================================================
// 2. LICENSE NORMALIZATION, ELIGIBILITY & LEAGUE ELIGIBILITY SERVICE
// ============================================================================

export function normalizeCoachingLicense(lic?: string | null): 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY' {
  if (!lic) return 'BASIC';
  const upper = String(lic).toUpperCase().trim();
  if (upper === 'BASIC' || upper === 'PREMIER' || upper === 'CONTINENTAL' || upper === 'LEGENDARY') {
    return upper;
  }
  // Migration rule: reset any old license names/identifiers ('D', 'C', 'B', 'A', 'PRO', 'ELITE') to 'BASIC'
  return 'BASIC';
}

export function getLicenseTitleArabic(lic?: string | null): string {
  const norm = normalizeCoachingLicense(lic);
  switch (norm) {
    case 'LEGENDARY':
      return 'الرخصة الأسطورية';
    case 'CONTINENTAL':
      return 'الرخصة الأوروبية';
    case 'PREMIER':
      return 'الرخصة الممتازة';
    case 'BASIC':
    default:
      return 'الرخصة الأولية';
  }
}

export function getLicenseRank(license: CoachingLicenseTier | string | undefined | null): number {
  const norm = normalizeCoachingLicense(license);
  switch (norm) {
    case 'BASIC':
      return 1;
    case 'PREMIER':
      return 2;
    case 'CONTINENTAL':
      return 3;
    case 'LEGENDARY':
      return 4;
    default:
      return 1;
  }
}

export function getNextLicense(current: CoachingLicenseTier | string | undefined | null): 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY' | null {
  const norm = normalizeCoachingLicense(current);
  switch (norm) {
    case 'BASIC':
      return 'PREMIER';
    case 'PREMIER':
      return 'CONTINENTAL';
    case 'CONTINENTAL':
      return 'LEGENDARY';
    case 'LEGENDARY':
      return null;
    default:
      return 'PREMIER';
  }
}

export const ARAB_COUNTRIES_LIST = [
  'مصر',
  'السعودية',
  'المملكة العربية السعودية',
  'الإمارات',
  'قطر',
  'المغرب',
  'تونس',
  'الجزائر',
  'الكويت',
  'الأردن',
  'العراق',
  'البحرين',
  'عمان',
];

export const ARAB_LEAGUE_PREFIXES = [
  'egy_',
  'ksa_',
  'uae_',
  'qat_',
  'mar_',
  'tun_',
  'alg_',
  'arab_',
];

export function isArabLeagueOrCountry(country?: string, leagueId?: string): boolean {
  if (leagueId) {
    const lid = leagueId.toLowerCase();
    if (ARAB_LEAGUE_PREFIXES.some(p => lid.startsWith(p))) {
      return true;
    }
    if (lid.startsWith('eng_') || lid.startsWith('esp_') || lid.startsWith('ita_') || lid.startsWith('ger_') || lid.startsWith('fra_')) {
      return false;
    }
  }
  if (country) {
    return ARAB_COUNTRIES_LIST.some(c => country.includes(c));
  }
  return false;
}

export const ELITE_GLOBAL_CLUB_NAMES = [
  'ريال مدريد',
  'برشلونة',
  'أتلتيكو مدريد',
  'مانشستر سيتي',
  'ليفربول',
  'أرسنال',
  'تشيلسي',
  'مانشستر يونايتد',
  'بايرن ميونخ',
  'بوروسيا دورتموند',
  'باريس سان جيرمان',
  'إنتر ميلان',
  'إيه سي ميلان',
  'ميلان',
  'يوفنتوس',
];

export function isEliteGlobalClub(club: Club, league?: LeagueDefinition): boolean {
  const country = league?.country || (club as any).country || '';
  const leagueId = league?.id || (club as any).leagueId || '';
  if (isArabLeagueOrCountry(country, leagueId)) {
    return false; // Arab Premier League clubs are unlocked by PREMIER license without restrictions
  }
  const tier = league?.tier ?? league?.divisionTier ?? (club as any).divisionTier ?? 1;
  const rep = club.reputation || 50;
  if (ELITE_GLOBAL_CLUB_NAMES.some(name => club.name.includes(name))) {
    return true;
  }
  return tier === 1 && rep >= 85;
}

export function getRequiredLicenseForLeague(league: LeagueDefinition): 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY' {
  const isArab = isArabLeagueOrCountry(league.country, league.id);
  const tier = league.tier ?? league.divisionTier ?? 1;
  if (isArab) {
    return tier >= 2 ? 'BASIC' : 'PREMIER';
  }
  return 'CONTINENTAL';
}

export function getRequiredLicenseForClub(club: Club, league?: LeagueDefinition): 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY' {
  const country = league?.country || (club as any).country || 'مصر';
  const leagueId = league?.id || (club as any).leagueId || '';
  const tier = league?.tier ?? league?.divisionTier ?? (club as any).divisionTier ?? 1;
  const isArab = isArabLeagueOrCountry(country, leagueId);

  if (isArab) {
    return tier >= 2 ? 'BASIC' : 'PREMIER';
  }
  if (isEliteGlobalClub(club, league)) {
    return 'LEGENDARY';
  }
  return 'CONTINENTAL';
}

export function isClubEligibleForManager(
  club: Club,
  league?: LeagueDefinition,
  managerLicense?: string | null
): {
  allowed: boolean;
  requiredLicense: 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY';
  reasonArabic?: string;
} {
  const activeLic = normalizeCoachingLicense(managerLicense);
  const reqLic = getRequiredLicenseForClub(club, league);
  const allowed = getLicenseRank(activeLic) >= getLicenseRank(reqLic);
  return {
    allowed,
    requiredLicense: reqLic,
    reasonArabic: allowed ? undefined : `يتطلب ${CAREER_CONFIG.LICENSES[reqLic].arabicTitle}`,
  };
}

export interface LeagueEligibilityResult {
  leagueId: string;
  leagueName: string;
  country: string;
  tier: number;
  isArabLeague: boolean;
  isUnlocked: boolean;
  requiredLicense: 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY';
  requiredLicenseTitle: string;
  requiredLicenseTitleArabic: string;
  purchaseCost: number;
  annualRenewalFee: number;
  lockReasonArabic?: string;
  hasRestrictedEliteClubs: boolean;
  eliteClubsLocked: boolean;
  unlockedClubsCount: number;
  totalClubsCount: number;
  eligibleClubs: Club[];
  restrictedEliteClubs: Club[];
}

export function evaluateLeagueEligibilityForManager(
  league: LeagueDefinition,
  managerLicense?: string | null
): LeagueEligibilityResult {
  const activeLic = normalizeCoachingLicense(managerLicense);
  const activeRank = getLicenseRank(activeLic);
  const requiredLicense = getRequiredLicenseForLeague(league);
  const requiredRank = getLicenseRank(requiredLicense);
  const reqConfig = CAREER_CONFIG.LICENSES[requiredLicense];
  const isUnlocked = activeRank >= requiredRank;
  const isArab = isArabLeagueOrCountry(league.country, league.id);
  const tier = league.tier ?? league.divisionTier ?? 1;

  const teams = Array.isArray(league.teams) ? league.teams : [];
  const eligibleClubs: Club[] = [];
  const restrictedEliteClubs: Club[] = [];

  for (const club of teams) {
    const clubReqLic = getRequiredLicenseForClub(club, league);
    if (activeRank >= getLicenseRank(clubReqLic)) {
      eligibleClubs.push(club);
    } else {
      restrictedEliteClubs.push(club);
    }
  }

  let lockReasonArabic: string | undefined;
  if (!isUnlocked) {
    lockReasonArabic = `يتطلب ${reqConfig.arabicTitle} لفتح هذا الدوري`;
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    country: league.country,
    tier,
    isArabLeague: isArab,
    isUnlocked,
    requiredLicense,
    requiredLicenseTitle: reqConfig.arabicTitle,
    requiredLicenseTitleArabic: reqConfig.arabicTitle,
    purchaseCost: reqConfig.purchaseCost,
    annualRenewalFee: reqConfig.annualRenewalFee,
    lockReasonArabic,
    hasRestrictedEliteClubs: restrictedEliteClubs.length > 0,
    eliteClubsLocked: restrictedEliteClubs.length > 0,
    unlockedClubsCount: eligibleClubs.length,
    totalClubsCount: teams.length,
    eligibleClubs,
    restrictedEliteClubs,
  };
}

/**
 * Executes the exact 4-step End-of-Season Financial Settlement & Renewal:
 * 1) Calculate and deposit end-of-season bonus into manager's personalWallet.
 * 2) Execute deduction of the annual renewal fee for the current license.
 * 3) If personalWallet is insufficient, automatically downgrade to the highest license tier
 *    covered by the balance (or back to free BASIC) with a warning notification.
 * 4) Return settled active license & breakdown for opening the League Selection Screen.
 */
export function settleEndOfSeasonLicenseAndBonus(
  manager: ManagerProfile,
  seasonBonusAmount: number,
  seasonNumber: number
): {
  updatedManager: ManagerProfile;
  settlement: NonNullable<import('../types/game').SeasonEndSummary['licenseSettlement']>;
} {
  const previousLicense = normalizeCoachingLicense(manager.license);
  const previousConfig = CAREER_CONFIG.LICENSES[previousLicense];
  const walletBeforeSettlement = Math.max(0, manager.personalWallet || 0);
  const bonusToDeposit = Math.max(0, Math.round(seasonBonusAmount || 0));

  // Step 1: Deposit end-of-season bonus & salary reward into Manager Personal Balance
  const walletAfterBonus = walletBeforeSettlement + bonusToDeposit;
  const transactions = Array.isArray(manager.financialTransactions) ? [...manager.financialTransactions] : [];

  if (bonusToDeposit > 0) {
    transactions.unshift({
      id: `tx_eos_bonus_s${seasonNumber}_${Date.now()}`,
      date: `ختام الموسم ${seasonNumber}`,
      amount: bonusToDeposit,
      type: 'trophy_bonus',
      description: `مكافأة وراتب ختام الموسم ${seasonNumber} (إيداع في الميزانية الشخصية للمدرب)`,
    });
  }

  // Step 2 & 3: Deduct annual renewal fee for current license, or downgrade if insufficient
  const renewalRequired = previousConfig.annualRenewalFee;
  let activeLicense: 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY' = previousLicense;
  let renewalDeducted = 0;
  let wasDowngraded = false;
  let messageArabic = '';

  if (walletAfterBonus >= renewalRequired) {
    renewalDeducted = renewalRequired;
    if (renewalDeducted > 0) {
      transactions.unshift({
        id: `tx_eos_renewal_s${seasonNumber}_${Date.now() + 1}`,
        date: `بداية الموسم ${seasonNumber + 1}`,
        amount: renewalDeducted,
        type: 'license_renewal',
        description: `خصم رسوم التجديد السنوية لـ ${previousConfig.arabicTitle}`,
      });
      messageArabic = `تم إيداع مكافأة نهاية الموسم (${bonusToDeposit.toLocaleString()} ج.م) وتجديد ${previousConfig.arabicTitle} بنجاح مقابل ${renewalDeducted.toLocaleString()} ج.م.`;
    } else {
      messageArabic = `تم إيداع مكافأة نهاية الموسم (${bonusToDeposit.toLocaleString()} ج.م). ${previousConfig.arabicTitle} مجانية ومفعّلة للموسم الجديد.`;
    }
  } else {
    // Insufficient balance -> downgrade to highest license whose renewal fee is covered by walletAfterBonus
    wasDowngraded = true;
    const downgradeCandidates: ('CONTINENTAL' | 'PREMIER' | 'BASIC')[] = ['CONTINENTAL', 'PREMIER', 'BASIC'];
    const currentRank = getLicenseRank(previousLicense);
    for (const candidate of downgradeCandidates) {
      if (getLicenseRank(candidate) < currentRank) {
        const candFee = CAREER_CONFIG.LICENSES[candidate].annualRenewalFee;
        if (walletAfterBonus >= candFee) {
          activeLicense = candidate;
          renewalDeducted = candFee;
          break;
        }
      }
    }

    const activeConfig = CAREER_CONFIG.LICENSES[activeLicense];
    if (renewalDeducted > 0) {
      transactions.unshift({
        id: `tx_eos_renewal_downgrade_s${seasonNumber}_${Date.now() + 1}`,
        date: `بداية الموسم ${seasonNumber + 1}`,
        amount: renewalDeducted,
        type: 'license_renewal',
        description: `تجديد تلقائي مخفض لـ ${activeConfig.arabicTitle} لعدم كفاية الرصيد لتجديد ${previousConfig.arabicTitle}`,
      });
    }

    messageArabic = `⚠️ تحذير مالي: رصيد ميزانيتك الشخصية (${walletAfterBonus.toLocaleString()} ج.م) لم يكفِ لسداد رسوم التجديد السنوية لـ ${previousConfig.arabicTitle} (${renewalRequired.toLocaleString()} ج.م). تم خفض رخصتك تلقائياً إلى ${activeConfig.arabicTitle}${renewalDeducted > 0 ? ` وخصم ${renewalDeducted.toLocaleString()} ج.م` : ' (المجانية)'}.`;
  }

  const walletAfterSettlement = Math.max(0, walletAfterBonus - renewalDeducted);
  const activeConfig = CAREER_CONFIG.LICENSES[activeLicense];

  const updatedManager: ManagerProfile = {
    ...manager,
    license: activeLicense,
    personalWallet: walletAfterSettlement,
    careerEarnings: (manager.careerEarnings || 0) + bonusToDeposit,
    totalBonusesEarned: (manager.totalBonusesEarned || 0) + bonusToDeposit,
    financialTransactions: transactions.slice(0, 60),
    lastSettledSeasonNumber: seasonNumber,
  };

  return {
    updatedManager,
    settlement: {
      previousLicense,
      previousLicenseTitle: previousConfig.arabicTitle,
      activeLicense,
      activeLicenseAfterRenewal: activeLicense,
      activeLicenseTitle: activeConfig.arabicTitle,
      seasonBonusDeposited: bonusToDeposit,
      renewalFeeRequired: renewalRequired,
      renewalFeeDeducted: renewalDeducted,
      wasDowngraded,
      walletBeforeSettlement,
      walletAfterSettlement,
      personalWalletAfter: walletAfterSettlement,
      messageArabic,
      warningMessage: wasDowngraded ? messageArabic : undefined,
    },
  };
}

export interface LicenseChecklistItem {
  key: string;
  label: string;
  current: number | string;
  target: number | string;
  isMet: boolean;
  unit?: string;
  progressPercent: number; // 0 to 100%
  displayCurrent: string;
  displayTarget: string;
}

export interface LicenseEvaluationResult {
  currentLicense: CoachingLicenseTier;
  nextLicense: CoachingLicenseTier | null;
  nextLicenseConfig: LicenseConfigItem | null;
  canUpgrade: boolean;
  checklist: LicenseChecklistItem[];
  missingCount: number;
  walletBalance: number;
  hasEnoughCash: boolean;
  overallProgressPercent: number;
  activePlayMinutes: number;
  activePlayFormatted: string;
}

export function formatPlayTimeHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '0 Hours';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} Min`;
  if (remainingMinutes === 0) return `${hours} Hours`;
  return `${hours}h ${remainingMinutes}m`;
}

export function evaluateLicenseEligibility(
  manager: ManagerProfile,
  _userClub: Club | null
): LicenseEvaluationResult {
  const currentLicense = normalizeCoachingLicense(manager.license);
  const nextLicense = getNextLicense(currentLicense);
  const wallet = manager.personalWallet || 0;
  const activePlayMinutes = Math.max(0, manager.totalPlayTimeMinutes || 0);
  const activePlayFormatted = formatPlayTimeHours(activePlayMinutes);

  if (!nextLicense) {
    return {
      currentLicense,
      nextLicense: null,
      nextLicenseConfig: null,
      canUpgrade: false,
      checklist: [],
      missingCount: 0,
      walletBalance: wallet,
      hasEnoughCash: true,
      overallProgressPercent: 100,
      activePlayMinutes,
      activePlayFormatted,
    };
  }

  const config = CAREER_CONFIG.LICENSES[nextLicense];
  const cost = config.purchaseCost;
  const walletProgress = cost === 0 ? 100 : Math.min(100, Math.round((wallet / cost) * 100));
  const hasEnoughCash = wallet >= cost;

  const checklist: LicenseChecklistItem[] = [
    {
      key: 'purchase_cost',
      label: 'سعر الشراء لمرة واحدة (من الميزانية الشخصية للمدرب)',
      current: `${wallet.toLocaleString()} ج.م`,
      target: `${cost.toLocaleString()} ج.م`,
      displayCurrent: `${wallet.toLocaleString()} ج.م`,
      displayTarget: `${cost.toLocaleString()} ج.م`,
      isMet: hasEnoughCash,
      progressPercent: walletProgress,
    },
    {
      key: 'annual_renewal_info',
      label: 'رسوم التجديد السنوية (تُخصم بداية كل موسم جديد)',
      current: `${config.annualRenewalFee.toLocaleString()} ج.م / موسم`,
      target: `${config.annualRenewalFee.toLocaleString()} ج.م`,
      displayCurrent: `${config.annualRenewalFee.toLocaleString()} ج.م`,
      displayTarget: `${config.annualRenewalFee.toLocaleString()} ج.م`,
      isMet: true,
      progressPercent: 100,
    },
  ];

  const missingCount = hasEnoughCash ? 0 : 1;

  return {
    currentLicense,
    nextLicense,
    nextLicenseConfig: config,
    canUpgrade: hasEnoughCash,
    checklist,
    missingCount,
    walletBalance: wallet,
    hasEnoughCash,
    overallProgressPercent: walletProgress,
    activePlayMinutes,
    activePlayFormatted,
  };
}

// ============================================================================
// 3. CLUB PRESTIGE & LOGICAL JOB REQUIREMENTS (منطقية الأندية وعروض العمل)
// ============================================================================

export function getClubPrestigeTier(club: Club, league?: LeagueDefinition): ClubTierDefinition {
  const reqLic = getRequiredLicenseForClub(club, league);
  const tier = league?.tier ?? (club as any).divisionTier ?? 1;

  if (reqLic === 'LEGENDARY') {
    return CAREER_CONFIG.CLUB_TIERS.tier_elite;
  }
  if (reqLic === 'CONTINENTAL') {
    return CAREER_CONFIG.CLUB_TIERS.tier_pro;
  }
  if (reqLic === 'PREMIER') {
    return CAREER_CONFIG.CLUB_TIERS.tier_apro;
  }
  if (tier === 2) {
    return CAREER_CONFIG.CLUB_TIERS.tier_cb;
  }
  return CAREER_CONFIG.CLUB_TIERS.tier_dc;
}

export function isManagerQualifiedForClub(
  manager: ManagerProfile,
  club: Club,
  league?: LeagueDefinition
): { qualified: boolean; reasons: string[]; clubTier: ClubTierDefinition } {
  const clubTier = getClubPrestigeTier(club, league);
  const reasons: string[] = [];

  const activeLicense = normalizeCoachingLicense(manager.license);
  const requiredLicense = getRequiredLicenseForClub(club, league);

  if (getLicenseRank(activeLicense) < getLicenseRank(requiredLicense)) {
    reasons.push(
      `يتطلب ${getLicenseTitleArabic(requiredLicense)} على الأقل لتدريب ${club.name} (لديك حالياً: ${getLicenseTitleArabic(activeLicense)}).`
    );
  }

  return {
    qualified: reasons.length === 0,
    reasons,
    clubTier,
  };
}

export function isClubEligibleToMakeJobOffer(
  manager: ManagerProfile,
  currentClub: Club,
  currentLeague: LeagueDefinition,
  candidateClub: Club,
  candidateLeague: LeagueDefinition,
  _isChampion: boolean = false,
  _isPromoted: boolean = false,
  offerCategory?: JobOfferCategory,
  managerTactics?: TeamTactics
): { eligible: boolean; reasons: string[]; clubTier: ClubTierDefinition; score: number; tacticalFit: number } {
  const clubTier = getClubPrestigeTier(candidateClub, candidateLeague);
  const reasons: string[] = [];

  const activeLicense = normalizeCoachingLicense(manager.license);
  const requiredLicense = getRequiredLicenseForClub(candidateClub, candidateLeague);
  const managerLicenseRank = getLicenseRank(activeLicense);
  const requiredLicenseRank = getLicenseRank(requiredLicense);

  // Strictly enforce the 4-License permissions
  if (managerLicenseRank < requiredLicenseRank) {
    reasons.push(
      `يتطلب ${getLicenseTitleArabic(requiredLicense)} لتدريب هذا النادي (رخصتك الفعّالة: ${getLicenseTitleArabic(activeLicense)}).`
    );
  }

  // Tactical Fit calculation for UI cards
  let tacticalFit = 78;
  const tactics = managerTactics || currentClub.tactics;
  if (tactics) {
    const mentality = tactics.mentality || 'balanced';
    const pressing = tactics.pressingIntensity || 'balanced';
    const passing = tactics.passingStyle || 'short';

    if (offerCategory === 'relegation_salvage') {
      if (mentality === 'defensive' || mentality === 'ultra_defensive' || pressing === 'high' || pressing === 'gegenpress') {
        tacticalFit += 15;
      }
    } else if (offerCategory === 'title_challenger' || clubTier.tierLevel >= 4) {
      if (mentality === 'attacking' || mentality === 'ultra_attacking' || passing === 'short') {
        tacticalFit += 14;
      }
    } else if (offerCategory === 'youth_foundation') {
      if (tactics.buildUpStyle === 'from_back' || passing === 'short' || mentality === 'balanced') {
        tacticalFit += 14;
      }
    }
  }
  tacticalFit = Math.max(50, Math.min(100, tacticalFit));

  const currentTier = currentLeague?.tier ?? (currentClub as any).divisionTier ?? 1;
  const candidateTier = candidateLeague?.tier ?? (candidateClub as any).divisionTier ?? 1;
  const licenseWeight = Math.min(1, managerLicenseRank / Math.max(1, requiredLicenseRank)) * 45;
  const repWeight = Math.min(1, (manager.reputation || 25) / Math.max(20, candidateClub.reputation || 50)) * 30;
  const tacticalWeight = (tacticalFit / 100) * 15;
  const tierFitBonus = Math.max(0, 10 - Math.abs(currentTier - candidateTier) * 2);

  const score = Math.max(0, Math.min(100, Math.round(
    licenseWeight + repWeight + tacticalWeight + tierFitBonus
  )));

  return {
    eligible: reasons.length === 0,
    reasons,
    clubTier,
    score,
    tacticalFit,
  };
}

// ============================================================================
// 4. MANAGER REPUTATION TITLE & HELPERS (ألقاب وسمعة المدرب)
// ============================================================================

export function getReputationInfo(reputation: number) {
  const rep = Math.max(0, Math.min(100, Math.round(reputation)));
  const found = CAREER_CONFIG.REPUTATION_TITLES.find(t => rep >= t.min && rep <= t.max);
  return found || CAREER_CONFIG.REPUTATION_TITLES[0];
}

// ============================================================================
// 5. CAREER MILESTONES EVALUATOR (تقييم الإنجازات المستمرة)
// ============================================================================

export function evaluateCareerMilestones(
  manager: ManagerProfile,
  userClub: Club | null
): {
  milestones: CareerMilestone[];
  completedCount: number;
  totalCount: number;
  percentCompleted: number;
  newlyUnlocked: CareerMilestone[];
} {
  const completedIds = new Set(manager.completedMilestones || []);
  const newlyUnlocked: CareerMilestone[] = [];

  const matchesManaged = Math.max(manager.matchesManaged || 0, userClub?.stats?.played || 0);
  const wins = Math.max(manager.wins || 0, userClub?.stats?.won || 0);
  const winRate = matchesManaged > 0 ? Math.round((wins / matchesManaged) * 100) : 0;
  const trophiesCount =
    (manager.leagueTitles || 0) + (manager.cupTitles || 0) ||
    (Array.isArray(manager.trophies) ? manager.trophies.length : 0);
  const licenseRank = getLicenseRank(manager.license);
  const clubsCount = (manager.clubsManaged || []).length || (manager.currentClubId ? 1 : 0);
  const worldRank = manager.worldRank || 850;
  const playersDeveloped = manager.totalPlayersDeveloped || Math.floor((manager.developmentPoints || 0) / 20) || 0;

  const milestones: CareerMilestone[] = CAREER_CONFIG.DEFAULT_MILESTONES.map(def => {
    let currentVal = 0;

    switch (def.id) {
      case 'ms_first_win':
        currentVal = wins >= 1 ? 1 : 0;
        break;
      case 'ms_win_streak_3':
        currentVal = wins >= 3 ? 3 : wins;
        break;
      case 'ms_develop_prospect':
        currentVal = playersDeveloped >= 1 ? 1 : 0;
        break;
      case 'ms_matches_15':
        currentVal = Math.min(15, matchesManaged);
        break;
      case 'ms_promotion_champ':
        currentVal = (manager.promotions || 0) >= 1 ? 1 : 0;
        break;
      case 'ms_cup_glory':
        currentVal = (manager.cupTitles || 0) >= 1 ? 1 : 0;
        break;
      case 'ms_matches_50':
        currentVal = Math.min(50, matchesManaged);
        break;
      case 'ms_license_a':
        currentVal = licenseRank >= 2 ? 1 : 0;
        break;
      case 'ms_giant_slayer':
        currentVal = wins >= 5 ? 2 : (wins >= 2 ? 1 : 0);
        break;
      case 'ms_premier_champion':
        currentVal = (manager.leagueTitles || 0) >= 1 ? 1 : 0;
        break;
      case 'ms_continental_trophy':
        currentVal = (manager.trophies || []).some(t => t.includes('إفريقيا') || t.includes('أبطال') || t.includes('قارة')) ? 1 : 0;
        break;
      case 'ms_license_pro':
        currentVal = licenseRank >= 3 ? 1 : 0;
        break;
      case 'ms_two_clubs_trophies':
        currentVal = Math.min(2, clubsCount > 1 && trophiesCount >= 2 ? 2 : (trophiesCount >= 1 ? 1 : 0));
        break;
      case 'ms_matches_100_elite':
        currentVal = matchesManaged >= 100 && winRate >= 55 ? 100 : Math.min(100, matchesManaged);
        break;
      case 'ms_license_elite':
        currentVal = licenseRank >= 4 ? 1 : 0;
        break;
      case 'ms_world_rank_one':
        currentVal = worldRank === 1 ? 1 : 0;
        break;
      default:
        currentVal = 0;
    }

    const isCompleted = currentVal >= def.targetValue || completedIds.has(def.id);

    const milestoneObj: CareerMilestone = {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category as 'short' | 'mid' | 'long',
      targetValue: def.targetValue,
      currentValue: currentVal,
      rewardReputation: def.rewardReputation,
      rewardXp: def.rewardXp,
      rewardCash: def.rewardCash,
      badgeIcon: def.badgeIcon,
      isCompleted,
    };

    if (isCompleted && !completedIds.has(def.id)) {
      newlyUnlocked.push(milestoneObj);
    }

    return milestoneObj;
  });

  const completedCount = milestones.filter(m => m.isCompleted).length;
  const totalCount = milestones.length;
  const percentCompleted = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    milestones,
    completedCount,
    totalCount,
    percentCompleted,
    newlyUnlocked,
  };
}

// ============================================================================
// 6. DYNAMIC ADAPTIVE CHALLENGES (تحديات ديناميكية متجددة)
// ============================================================================

export function generateAdaptiveChallenges(
  manager: ManagerProfile,
  userClub: Club | null,
  league?: LeagueDefinition
): CareerDynamicChallenge[] {
  const challenges: CareerDynamicChallenge[] = [];
  const level = manager.level || 1;
  const rep = manager.reputation || 20;

  // Challenge 1: Unbeaten Streak / Fortress
  challenges.push({
    id: `dyn_ch_streak_${Date.now()}_1`,
    title: 'الحصن المنيع: سلسلة عدم الهزيمة 🛡️',
    description: 'حافظ على سجلك خالياً من أي هزيمة في المباريات الـ 4 القادمة بالدوري.',
    difficulty: 'normal',
    targetType: 'win_streak',
    targetValue: 4,
    currentValue: 0,
    rewardReputation: 4,
    rewardCash: 45000,
    expiresInRounds: 5,
    isCompleted: false,
  });

  // Challenge 2: Giant Slayer / Underdog Clash
  challenges.push({
    id: `dyn_ch_slayer_${Date.now()}_2`,
    title: 'قاهر متصدري الدوري ⚔️',
    description: 'انتزع فوزاً مستحقاً أمام أحد الفرق التي تسبقك في جدول الترتيب.',
    difficulty: level > 5 ? 'hard' : 'normal',
    targetType: 'beat_stronger',
    targetValue: 1,
    currentValue: 0,
    rewardReputation: 6,
    rewardCash: 60000,
    expiresInRounds: 6,
    isCompleted: false,
  });

  // Challenge 3: Iron Defense Clean Sheets
  challenges.push({
    id: `dyn_ch_cleansheet_${Date.now()}_3`,
    title: 'الشباك النظيفة العذراء 🧤',
    description: 'اخرج بشباك نظيفة (Clean Sheet) دون استقبال أي هدف في مباراتين متتاليتين.',
    difficulty: 'hard',
    targetType: 'clean_sheets',
    targetValue: 2,
    currentValue: 0,
    rewardReputation: 5,
    rewardCash: 50000,
    expiresInRounds: 4,
    isCompleted: false,
  });

  return challenges;
}
