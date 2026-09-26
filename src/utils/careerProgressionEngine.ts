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
  examCost: number; // in EGP
}

export interface LicenseConfigItem {
  id: CoachingLicenseTier;
  codeName: string;
  arabicTitle: string;
  badgeName: string;
  rankIndex: number;
  tierDescription: string;
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

export const CAREER_CONFIG = {
  // ----------------------------------------------------
  // A. COACHING LICENSES SPECIFICATION (الرخص التدريبية المتدرجة)
  // ----------------------------------------------------
  LICENSES: {
    D: {
      id: 'D',
      codeName: 'CAF-D',
      arabicTitle: 'رخصة التدريب التأسيسية D',
      badgeName: 'CAF / Local D',
      rankIndex: 1,
      tierDescription: 'بداية المسيرة التدريبية وأسس إدارة التدريبات والمباريات.',
      unlockedClubsDescription: 'أندية الهواة والدرجة الرابعة وأكاديميات الناشئين.',
      requirements: {
        minLevel: 1,
        minMatches: 0,
        minWins: 0,
        minWinRate: 0,
        minTrophies: 0,
        minReputation: 0,
        minPlayersDeveloped: 0,
        minActivePlayMinutes: 60, // ساعة واحدة لعب فعلي (بدلاً من 5 ساعات)
        examCost: 15000,
      },
      perks: [
        'تسجيل رسمي في سجلات الاتحاد المحلي',
        'قيادة أندية الدرجة الرابعة والهواة',
        'فتح نظام الخطط التأسيسية (4-4-2، 4-3-3، 4-5-1)',
      ],
    },
    C: {
      id: 'C',
      codeName: 'CAF-C',
      arabicTitle: 'رخصة التدريب القارية C',
      badgeName: 'CAF / UEFA C',
      rankIndex: 2,
      tierDescription: 'تأهيل قاري لتطوير الخطط، استيعاب أساليب الضغط والتمركز.',
      unlockedClubsDescription: 'أندية الدرجة الثالثة والأندية الصاعدة في الدرجات الأدنى.',
      requirements: {
        minLevel: 2,
        minMatches: 10,
        minWins: 4,
        minWinRate: 35,
        minTrophies: 0,
        minReputation: 25,
        minPlayersDeveloped: 1,
        minActivePlayMinutes: 180, // 3 ساعات لعب فعلي (بدلاً من 15 ساعة)
        examCost: 50000,
      },
      perks: [
        'أهلية تدريب أندية الدرجة الثالثة ومشاريع الصعود',
        'فتح خطط تكتيكية حديثة (4-2-3-1، 3-5-2، 4-4-1-1)',
        'فتح أساليب اللعب المرتد، الكاتيناتشو، التكتل الدفاعي، والأطراف',
        'زيادة نقاط التصنيف العالمي للمدرب (+30 نقطة)',
      ],
    },
    B: {
      id: 'B',
      codeName: 'CAF-B',
      arabicTitle: 'رخصة التدريب المتقدمة B',
      badgeName: 'CAF / UEFA B',
      rankIndex: 3,
      tierDescription: 'احتراف تكتيكي متقدم لإدارة غرف الملابس والتحولات السريعة.',
      unlockedClubsDescription: 'أندية الدرجة الثانية والمنافسين على الصعود للدوري الممتاز.',
      requirements: {
        minLevel: 4,
        minMatches: 25,
        minWins: 11,
        minWinRate: 42,
        minTrophies: 0,
        minReputation: 45,
        minPlayersDeveloped: 3,
        minActivePlayMinutes: 360, // 6 ساعات لعب فعلي (بدلاً من 30 ساعة)
        examCost: 150000,
      },
      perks: [
        'أهلية تدريب أندية الدرجة الثانية والدرجات المتوسطة',
        'فتح التيكي تاكا، الضغط العكسي (Gegenpress)، والبناء من الخلف',
        'فتح أدوار اللاعبين التكتيكية: المهاجم الوهمي، المهاجم المحطة، الأظهرة المتداخلة',
        'فتح 8 تشكيلات هجومية متقدمة (3-4-3، 4-1-2-1-2، 4-3-2-1)',
        'رفع تصنيفك العالمي للمدربين (+60 نقطة)',
      ],
    },
    A: {
      id: 'A',
      codeName: 'CAF-A',
      arabicTitle: 'رخصة النخبة التكتيكية A',
      badgeName: 'CAF / UEFA A',
      rankIndex: 4,
      tierDescription: 'شهادة القيادة العليا لإدارة أندية الدوري الممتاز والمحترفين.',
      unlockedClubsDescription: 'أندية الدرجة الأولى والدوري الممتاز والأندية الكبيرة محلياً.',
      requirements: {
        minLevel: 7,
        minMatches: 45,
        minWins: 22,
        minWinRate: 48,
        minTrophies: 1, // تتطلب تحقيق بطولة أو صعود رسمي واحد على الأقل
        minReputation: 65,
        minPlayersDeveloped: 5,
        minActivePlayMinutes: 600, // 10 ساعات لعب فعلي (بدلاً من 50 ساعة)
        examCost: 350000,
      },
      perks: [
        'أهلية تدريب أندية الدوري الممتاز رسمياً',
        'فتح تشكيل 3-2-4-1 لمربع غوارديولا، والتحكم بالاستحواذ، والدفاع الوقائي',
        'فتح مصائد الضغط التكتيكية (مصيدة الأطراف، مصيدة العمق)',
        'فتح منظومات الدفاع الخماسي الحصين (5-3-2، 5-4-1، 5-2-3)',
        'قفزة قوية في التصنيف العالمي (+120 نقطة)',
      ],
    },
    PRO: {
      id: 'PRO',
      codeName: 'FIFA-PRO',
      arabicTitle: 'رخصة المحترفين القارية والدولية PRO',
      badgeName: 'FIFA / Continental PRO',
      rankIndex: 5,
      tierDescription: 'أعلى وسام تدريبي قاري لقيادة عمالقة القارة والبطولات الدولية.',
      unlockedClubsDescription: 'الأندية الكبيرة، أبطال القارات، وأندية الدوريات الأوروبية القوية.',
      requirements: {
        minLevel: 10,
        minMatches: 70,
        minWins: 38,
        minWinRate: 54,
        minTrophies: 2, // تتطلب بطولتين رسميتين على الأقل
        minReputation: 80,
        minPlayersDeveloped: 8,
        minActivePlayMinutes: 900, // 15 ساعة لعب فعلي (بدلاً من 80 ساعة)
        examCost: 850000,
      },
      perks: [
        'أهلية تدريب كبرى أندية إفريقيا وآسيا وأوروبا',
        'فتح اللعب التموضعي الفائق (Juego de Posición)',
        'فتح تشكيل 3-4-3 ماسة كرويف و 3-2-2-3 لخبراء التموضع',
        'فتح محفزات الضغط وتكتيكات سيناريوهات المباراة (حماية التقدم / مطاردة النتيجة)',
        'قفزة ضخمة في التصنيف العالمي (+250 نقطة)',
      ],
    },
    ELITE: {
      id: 'ELITE',
      codeName: 'WORLD-ELITE',
      arabicTitle: 'رخصة النخبة العالمية للمدربين ELITE',
      badgeName: 'World Elite Master',
      rankIndex: 6,
      tierDescription: 'المستوى الأسطوري الأعلى في تاريخ كرة القدم لصفوة مدربي كوكب الأرض.',
      unlockedClubsDescription: 'أقوى أندية العالم (ريال مدريد، مانشستر سيتي، بايرن ميونخ) والمنتخبات العالمية.',
      requirements: {
        minLevel: 14,
        minMatches: 100,
        minWins: 60,
        minWinRate: 58,
        minTrophies: 4, // 4 ألقاب وبطولات كبرى
        minReputation: 90,
        minPlayersDeveloped: 12,
        minActivePlayMinutes: 1200, // 20 ساعة لعب فعلي (بدلاً من 120 ساعة)
        examCost: 2000000,
      },
      perks: [
        'الوصول الحصري لأقوى عروض التدريب العالمية ونخبة الأندية الأوروبية',
        'فتح المنظومة الهجينة المتكيفة لحظياً (Tactical Mastermind)',
        'فتح تشكيل 2-3-5 الهرم التكتيكي المعكوس و 4-2-1-3 المتغيرة أوتوماتيكياً',
        'فتح نظام ابتكار الفلسفة التكتيكية الخاصة وتسميتها باسمك',
        'مكافأة تصنيف عالمي هائلة (+400 نقطة)',
      ],
    },
  } as Record<CoachingLicenseTier, LicenseConfigItem>,

  // ----------------------------------------------------
  // B. CLUB PRESTIGE TIERS (منطقية تصنيف الأندية)
  // ----------------------------------------------------
  CLUB_TIERS: {
    tier_dc: {
      id: 'tier_dc',
      tierLevel: 1,
      nameArabic: 'أندية الدرجات الدنيا والتأسيسية (D/C)',
      minLicense: 'D',
      minReputation: 0,
      minTrophies: 0,
      minMatches: 0,
      minWinRate: 0,
      minManagerLevel: 1,
      description: 'أندية الهواة والمناطق والدرجة الرابعة ذات الإمكانيات المحدودة.',
      exampleClubs: 'أندية الدرجة الرابعة، مراكز الشباب، وأندية الهواة',
    },
    tier_cb: {
      id: 'tier_cb',
      tierLevel: 2,
      nameArabic: 'أندية الدرجات المتوسطة والدنيا (C/B)',
      minLicense: 'C',
      minReputation: 25,
      minTrophies: 0,
      minMatches: 8,
      minWinRate: 35,
      minManagerLevel: 2,
      description: 'أندية الدرجة الثالثة ومشاريع الصعود الصاعدة الطامحة للاحتراف.',
      exampleClubs: 'أندية الدرجة الثالثة، أندية القسم الثاني (ب)',
    },
    tier_ba: {
      id: 'tier_ba',
      tierLevel: 3,
      nameArabic: 'أندية الدرجة الأولى والمتوسطة (B/A)',
      minLicense: 'B',
      minReputation: 45,
      minTrophies: 0,
      minMatches: 20,
      minWinRate: 42,
      minManagerLevel: 4,
      description: 'أندية الدرجة الثانية القوية والمتنافسة بضراوة على الصعود للممتاز.',
      exampleClubs: 'متصدرو دوري المحترفين (الدرجة الثانية)',
    },
    tier_apro: {
      id: 'tier_apro',
      tierLevel: 4,
      nameArabic: 'الأندية الكبيرة محلياً والدوري الممتاز (A/Pro)',
      minLicense: 'A',
      minReputation: 65,
      minTrophies: 1,
      minMatches: 40,
      minWinRate: 48,
      minManagerLevel: 7,
      description: 'أندية الدوري الممتاز القوية والمنافسة محلياً وقارياً.',
      exampleClubs: 'الأهلي، الزمالك، بيراميدز، الهلال، النصر، الوداد، الترجي',
    },
    tier_pro: {
      id: 'tier_pro',
      tierLevel: 5,
      nameArabic: 'الأندية القارية والأوروبية القوية (Pro)',
      minLicense: 'PRO',
      minReputation: 78,
      minTrophies: 2,
      minMatches: 60,
      minWinRate: 52,
      minManagerLevel: 10,
      description: 'أندية البطولات القارية وأندية الدوريات الأوروبية الخمس الكبرى المستقرة.',
      exampleClubs: 'إشبيلية، بورتو، بنفيكا، روما، أستون فيلا، مارسيليا',
    },
    tier_elite: {
      id: 'tier_elite',
      tierLevel: 6,
      nameArabic: 'نخبة أندية العالم (World Elite)',
      minLicense: 'ELITE',
      minReputation: 88,
      minTrophies: 3,
      minMatches: 80,
      minWinRate: 58,
      minManagerLevel: 13,
      description: 'عمالقة العالم التاريخيون الأكثر تتويجاً وهيمنة في كوكب الأرض.',
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
      id: 'ms_license_c',
      title: 'نيل رخصة التدريب C 📜',
      description: 'اجتز شروط الاعتماد واحصل على رخصة التدريب القارية C.',
      category: 'short',
      targetValue: 1,
      rewardReputation: 5,
      rewardXp: 350,
      rewardCash: 50000,
      badgeIcon: 'Award',
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
      id: 'ms_license_b',
      title: 'الارتقاء إلى رخصة B 🎓',
      description: 'حقق متطلبات الرخصة المتقدمة B واجتز الاختبار بنجاح.',
      category: 'mid',
      targetValue: 1,
      rewardReputation: 6,
      rewardXp: 450,
      rewardCash: 80000,
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
      id: 'ms_license_a',
      title: 'الرخصة الذهبية A 👑',
      description: 'ارتقِ إلى مصاف مدربي الدرجة الأولى بنيل رخصة A.',
      category: 'mid',
      targetValue: 1,
      rewardReputation: 10,
      rewardXp: 800,
      rewardCash: 200000,
      badgeIcon: 'Award',
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
      title: 'رخصة المحترفين PRO 🌟',
      description: 'احصل على رخصة المحترفين الدولية PRO.',
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
      title: 'رخصة النخبة العالمية ELITE 👑🌍',
      description: 'احصل على أسمى رخصة تدريبية في تاريخ كرة القدم (World Elite Master).',
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
// 2. LICENSE EVALUATION & CHECKLIST (فحص الأهلية وشروط الرخص)
// ============================================================================

export interface LicenseChecklistItem {
  key: string;
  label: string;
  current: number | string;
  target: number | string;
  isMet: boolean;
  unit?: string;
  progressPercent: number; // 0 to 100%
  displayCurrent: string; // Formatted current (e.g. "42", "50%", "12h")
  displayTarget: string; // Formatted target (e.g. "70", "55%", "20h")
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
  overallProgressPercent: number; // Overall progression towards next license (0 - 100%)
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

export function getLicenseRank(license: CoachingLicenseTier | string): number {
  switch (license) {
    case 'D': return 1;
    case 'C': return 2;
    case 'B': return 3;
    case 'A': return 4;
    case 'PRO': return 5;
    case 'ELITE': return 6;
    default: return 1;
  }
}

export function getNextLicense(current: CoachingLicenseTier | string): CoachingLicenseTier | null {
  switch (current) {
    case 'D': return 'C';
    case 'C': return 'B';
    case 'B': return 'A';
    case 'A': return 'PRO';
    case 'PRO': return 'ELITE';
    case 'ELITE': return null;
    default: return 'C';
  }
}

export function evaluateLicenseEligibility(
  manager: ManagerProfile,
  userClub: Club | null
): LicenseEvaluationResult {
  const currentLicense: CoachingLicenseTier = (manager.license as CoachingLicenseTier) || 'D';
  const nextLicense = getNextLicense(currentLicense);

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
      walletBalance: manager.personalWallet || 0,
      hasEnoughCash: true,
      overallProgressPercent: 100,
      activePlayMinutes,
      activePlayFormatted,
    };
  }

  const config = CAREER_CONFIG.LICENSES[nextLicense];
  const req = config.requirements;

  // Real stats resolution (combining manager career + current club if higher)
  const matchesManaged = Math.max(manager.matchesManaged || 0, userClub?.stats?.played || 0);
  const wins = Math.max(manager.wins || 0, userClub?.stats?.won || 0);
  const winRate = matchesManaged > 0 ? Math.round((wins / matchesManaged) * 100) : 0;
  const level = manager.level || 1;
  const reputation = manager.reputation || 15;
  const trophiesCount =
    (manager.leagueTitles || 0) + (manager.cupTitles || 0) ||
    (Array.isArray(manager.trophies) ? manager.trophies.length : 0);
  const playersDeveloped = manager.totalPlayersDeveloped || Math.floor((manager.developmentPoints || 0) / 15) || 0;
  const wallet = manager.personalWallet || 0;

  // Compute individual progress ratios (0 - 100%)
  const matchesProgress = req.minMatches === 0 ? 100 : Math.min(100, Math.round((matchesManaged / req.minMatches) * 100));
  const winsProgress = req.minWins === 0 ? 100 : Math.min(100, Math.round((wins / req.minWins) * 100));
  const winRateProgress = req.minWinRate === 0 ? 100 : Math.min(100, Math.round((winRate / req.minWinRate) * 100));
  const trophiesProgress = req.minTrophies === 0 ? 100 : Math.min(100, Math.round((trophiesCount / req.minTrophies) * 100));
  const playersProgress = req.minPlayersDeveloped === 0 ? 100 : Math.min(100, Math.round((playersDeveloped / req.minPlayersDeveloped) * 100));
  const activePlayProgress = req.minActivePlayMinutes === 0 ? 100 : Math.min(100, Math.round((activePlayMinutes / req.minActivePlayMinutes) * 100));
  const levelProgress = req.minLevel <= 1 ? 100 : Math.min(100, Math.round((level / req.minLevel) * 100));
  const repProgress = req.minReputation === 0 ? 100 : Math.min(100, Math.round((reputation / req.minReputation) * 100));
  const walletProgress = req.examCost === 0 ? 100 : Math.min(100, Math.round((wallet / req.examCost) * 100));

  const checklist: LicenseChecklistItem[] = [
    {
      key: 'matches',
      label: 'المباريات الفعلية (Matches)',
      current: matchesManaged,
      target: req.minMatches,
      displayCurrent: `${matchesManaged}`,
      displayTarget: `${req.minMatches}`,
      unit: 'مباراة',
      isMet: matchesManaged >= req.minMatches,
      progressPercent: matchesProgress,
    },
    {
      key: 'wins',
      label: 'الانتصارات الرسمية (Wins)',
      current: wins,
      target: req.minWins,
      displayCurrent: `${wins}`,
      displayTarget: `${req.minWins}`,
      unit: 'فوز',
      isMet: wins >= req.minWins,
      progressPercent: winsProgress,
    },
    {
      key: 'win_rate',
      label: 'نسبة الفوز (Win Rate)',
      current: `${winRate}%`,
      target: `${req.minWinRate}%`,
      displayCurrent: `${winRate}%`,
      displayTarget: `${req.minWinRate}%`,
      isMet: winRate >= req.minWinRate,
      progressPercent: winRateProgress,
    },
    {
      key: 'trophies',
      label: 'الألقاب والإنجازات (Titles)',
      current: trophiesCount,
      target: req.minTrophies,
      displayCurrent: `${trophiesCount}`,
      displayTarget: `${req.minTrophies}`,
      unit: 'لقب',
      isMet: trophiesCount >= req.minTrophies,
      progressPercent: trophiesProgress,
    },
    {
      key: 'players',
      label: 'تطوير اللاعبين (Player Development)',
      current: playersDeveloped,
      target: req.minPlayersDeveloped,
      displayCurrent: `${playersDeveloped}`,
      displayTarget: `${req.minPlayersDeveloped}`,
      unit: 'لاعب',
      isMet: playersDeveloped >= req.minPlayersDeveloped,
      progressPercent: playersProgress,
    },
    {
      key: 'active_play_time',
      label: 'وقت اللعب الفعلي (Active Play Time)',
      current: formatPlayTimeHours(activePlayMinutes),
      target: formatPlayTimeHours(req.minActivePlayMinutes),
      displayCurrent: formatPlayTimeHours(activePlayMinutes),
      displayTarget: formatPlayTimeHours(req.minActivePlayMinutes),
      unit: '',
      isMet: activePlayMinutes >= req.minActivePlayMinutes,
      progressPercent: activePlayProgress,
    },
    {
      key: 'level',
      label: 'المستوى التدريبي (Manager Level)',
      current: `المستوى ${level}`,
      target: `المستوى ${req.minLevel}`,
      displayCurrent: `${level}`,
      displayTarget: `${req.minLevel}`,
      isMet: level >= req.minLevel,
      progressPercent: levelProgress,
    },
    {
      key: 'reputation',
      label: 'السمعة التراكمية (Manager Reputation)',
      current: reputation,
      target: req.minReputation,
      displayCurrent: `${reputation}`,
      displayTarget: `${req.minReputation}`,
      unit: 'نقطة',
      isMet: reputation >= req.minReputation,
      progressPercent: repProgress,
    },
    {
      key: 'exam_fee',
      label: 'رسوم الاختبار (Exam Fee)',
      current: `${wallet.toLocaleString()} ج.م`,
      target: `${req.examCost.toLocaleString()} ج.م`,
      displayCurrent: `${wallet.toLocaleString()} ج.م`,
      displayTarget: `${req.examCost.toLocaleString()} ج.م`,
      isMet: wallet >= req.examCost,
      progressPercent: walletProgress,
    },
  ];

  const missingCount = checklist.filter(c => !c.isMet).length;
  const hasEnoughCash = wallet >= req.examCost;
  const canUpgrade = missingCount === 0;

  // Overall progression towards next license (weighted mean of all criteria)
  const overallProgressPercent = checklist.length > 0
    ? Math.round(checklist.reduce((sum, item) => sum + item.progressPercent, 0) / checklist.length)
    : 0;

  return {
    currentLicense,
    nextLicense,
    nextLicenseConfig: config,
    canUpgrade,
    checklist,
    missingCount,
    walletBalance: wallet,
    hasEnoughCash,
    overallProgressPercent,
    activePlayMinutes,
    activePlayFormatted,
  };
}

// ============================================================================
// 3. CLUB PRESTIGE & LOGICAL JOB REQUIREMENTS (منطقية الأندية وعروض العمل)
// ============================================================================

export function getClubPrestigeTier(club: Club, league?: LeagueDefinition): ClubTierDefinition {
  const rep = club.reputation || 50;
  const tier = league?.tier ?? (club as any).divisionTier ?? 1;
  const country = league?.country || (club as any).country || 'مصر';

  // World Elite Clubs: Top clubs in European Tier 1 or clubs with reputation >= 88
  const eliteClubNames = [
    'ريال مدريد', 'مانشستر سيتي', 'بايرن ميونخ', 'باريس سان جيرمان', 'برشلونة',
    'ليفربول', 'إنتر ميلان', 'أرسنال', 'ريال مدريد كاستيا', 'يوفنتوس',
  ];

  if (eliteClubNames.some(name => club.name.includes(name)) || (rep >= 88 && tier === 1)) {
    return CAREER_CONFIG.CLUB_TIERS.tier_elite;
  }

  // Continental Pro Giants: Egyptian & Arab Champions or Strong European contenders
  const proClubNames = [
    'الأهلي', 'الزمالك', 'بيراميدز', 'الهلال', 'النصر', 'الاتحاد', 'الوداد',
    'الترجي', 'الرجاء', 'صن داونز', 'إشبيلية', 'بوروسيا دورتموند', 'بنفيكا', 'بورتو', 'روما',
  ];

  if (proClubNames.some(name => club.name.includes(name)) || (rep >= 76 && rep < 88)) {
    return CAREER_CONFIG.CLUB_TIERS.tier_pro;
  }

  // Premier League / Division 1 clubs (A/Pro or B/A)
  if (tier === 1 || rep >= 62) {
    return CAREER_CONFIG.CLUB_TIERS.tier_apro;
  }

  // Division 2 (B/A)
  if (tier === 2 || (rep >= 45 && rep < 62)) {
    return CAREER_CONFIG.CLUB_TIERS.tier_ba;
  }

  // Division 3 (C/B)
  if (tier === 3 || (rep >= 30 && rep < 45)) {
    return CAREER_CONFIG.CLUB_TIERS.tier_cb;
  }

  // Division 4 / Lower (D/C)
  return CAREER_CONFIG.CLUB_TIERS.tier_dc;
}

export function isManagerQualifiedForClub(
  manager: ManagerProfile,
  club: Club,
  league?: LeagueDefinition
): { qualified: boolean; reasons: string[]; clubTier: ClubTierDefinition } {
  const clubTier = getClubPrestigeTier(club, league);
  const reasons: string[] = [];

  const managerLicenseRank = getLicenseRank(manager.license || 'D');
  const requiredLicenseRank = getLicenseRank(clubTier.minLicense);

  if (managerLicenseRank < requiredLicenseRank) {
    reasons.push(`يتطلب رخصة ${clubTier.minLicense} على الأقل (لديك ${manager.license || 'D'}).`);
  }

  const rep = manager.reputation || 15;
  if (rep < clubTier.minReputation) {
    reasons.push(`يتطلب سمعة تدريبية لا تقل عن ${clubTier.minReputation} (سمعتك الحالية: ${rep}).`);
  }

  const trophiesCount =
    (manager.leagueTitles || 0) + (manager.cupTitles || 0) ||
    (Array.isArray(manager.trophies) ? manager.trophies.length : 0);

  if (trophiesCount < clubTier.minTrophies) {
    reasons.push(`يتطلب تحقيق ${clubTier.minTrophies} بطولات رسمية على الأقل (حققت: ${trophiesCount}).`);
  }

  const matches = manager.matchesManaged || 0;
  if (matches < clubTier.minMatches) {
    reasons.push(`يتطلب خبرة لا تقل عن ${clubTier.minMatches} مباراة رسمية.`);
  }

  const wins = manager.wins || 0;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
  if (winRate < clubTier.minWinRate) {
    reasons.push(`يتطلب نسبة فوز لا تقل عن ${clubTier.minWinRate}% (نسبتك الحالية: ${winRate}%).`);
  }

  return {
    qualified: reasons.length === 0,
    reasons,
    clubTier,
  };
}

/**
 * Evaluates whether a candidate club can extend a job offer to the manager.
 * Strictly computes all 10 realistic factors:
 * 1. Coaching License (الرخصة التدريبية المطلوبة وفق سلم التدرج)
 * 2. Manager Reputation (السمعة التدريبية للمدرب)
 * 3. Career Achievements & Trophies (البطولات، الألقاب، عدد المباريات، نسبة الفوز)
 * 4. Current Club Level & Division Tier (مستوى النادي الحالي وسلم الترقي المنطقي)
 * 5. Manager's Tactical Style (الأسلوب التكتيكي ومدى تناسبه مع هوية النادي)
 * 6. Previous League/Club Experience (الخبرة التدريبية في الدوريات)
 * 7. Club's Current Situation (وضع النادي الحالي: إنقاذ، مشروع، منافسة، بناء)
 * 8. Club Budget & Ambitions (الميزانية والطموح الإداري)
 * 9. Squad Quality (جودة التشكيلة وقوة العناصر)
 * 10. Competition Level (مستوى المنافسة والدرجة)
 */
export function isClubEligibleToMakeJobOffer(
  manager: ManagerProfile,
  currentClub: Club,
  currentLeague: LeagueDefinition,
  candidateClub: Club,
  candidateLeague: LeagueDefinition,
  isChampion: boolean = false,
  isPromoted: boolean = false,
  offerCategory?: JobOfferCategory,
  managerTactics?: TeamTactics
): { eligible: boolean; reasons: string[]; clubTier: ClubTierDefinition; score: number; tacticalFit: number } {
  const clubTier = getClubPrestigeTier(candidateClub, candidateLeague);
  const reasons: string[] = [];

  const managerLicenseRank = getLicenseRank(manager.license || 'D');
  const requiredLicenseRank = getLicenseRank(clubTier.minLicense);

  // ----------------------------------------------------
  // FACTOR 1: Coaching License (الرخصة التدريبية)
  // ----------------------------------------------------
  // World Elite (tier_elite): strictly requires at least PRO (rank 5) or ELITE (rank 6).
  if (clubTier.tierLevel >= 6 && managerLicenseRank < 5) {
    reasons.push(`أندية النخبة العالمية تشترط رخصة المحترفين PRO أو ELITE على الأقل.`);
  } else if (clubTier.tierLevel >= 5 && managerLicenseRank < 4) {
    // Continental Pro Giants (Al Ahly, Zamalek, Pyramids, Al Hilal, Porto, etc.): strictly requires at least License A (rank 4).
    reasons.push(`عمالقة القارة يتطلبون رخصة النخبة A على الأقل.`);
  } else if (clubTier.tierLevel >= 4 && managerLicenseRank < 4 && !isPromoted && !isChampion) {
    // Domestic Tier 1: requires License A unless promoted from Tier 2 as champion with License B
    if (managerLicenseRank < 3) {
      reasons.push(`أندية الدوري الممتاز تشترط رخصة A على الأقل (لديك: رخصة ${manager.license || 'D'}).`);
    }
  } else if (managerLicenseRank < requiredLicenseRank) {
    // Category exception: youth foundation projects may accept one license level lower if manager has high reputation
    const isYouthProject = offerCategory === 'youth_foundation';
    if (!isYouthProject || managerLicenseRank < requiredLicenseRank - 1) {
      reasons.push(`الرخصة التدريبية غير كافية لهذا المستوى (المطلوب: ${clubTier.minLicense}).`);
    }
  }

  // ----------------------------------------------------
  // FACTOR 2: Manager Reputation (السمعة التدريبية)
  // ----------------------------------------------------
  const baseRep = manager.reputation || 15;
  let repModifier = 0;
  if (isChampion) repModifier += 8;
  else if (isPromoted) repModifier += 5;

  // Category adjustments:
  let thresholdAdjustment = 0;
  if (offerCategory === 'youth_foundation') thresholdAdjustment -= 8; // More accessible
  else if (offerCategory === 'relegation_salvage') thresholdAdjustment -= 5; // Desperate for help
  else if (offerCategory === 'title_challenger') thresholdAdjustment += 4; // Demanding
  else if (offerCategory === 'higher_competition') thresholdAdjustment += 6; // High prestige step

  const effectiveRep = baseRep + repModifier;
  const targetMinRep = Math.max(5, clubTier.minReputation + thresholdAdjustment);

  if (effectiveRep < targetMinRep) {
    reasons.push(`سمعة المدرب (${baseRep}) أقل من الحد الأدنى المقبول لإدارة النادي (${targetMinRep}).`);
  }

  // ----------------------------------------------------
  // FACTOR 3: Career Achievements & Trophies (البطولات والخبرة)
  // ----------------------------------------------------
  const trophiesCount =
    (manager.leagueTitles || 0) + (manager.cupTitles || 0) ||
    (Array.isArray(manager.trophies) ? manager.trophies.length : 0);
  const matches = manager.matchesManaged || 0;
  const wins = manager.wins || 0;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  // Elite clubs: at least 2 major trophies, 50 matches, 50% win rate
  if (clubTier.tierLevel >= 6) {
    if (trophiesCount < 2) {
      reasons.push(`أندية النخبة العالمية تطلب سجلاً بطولياً يحوي بطولتين كبريين على الأقل (حققت: ${trophiesCount}).`);
    }
    if (matches < 50) {
      reasons.push(`الخبرة الميدانية أقل من 50 مباراة رسمية (خضت: ${matches}).`);
    }
    if (winRate < 48) {
      reasons.push(`نسبة الفوز (${winRate}%) غير كافية لعمالقة العالم (المطلوب 50%+).`);
    }
  } else if (clubTier.tierLevel >= 5) {
    // Continental Pro Giants: at least 1 trophy (or champion promotion) and 25 matches
    if (trophiesCount < 1 && !isChampion && !isPromoted) {
      reasons.push(`عمالقة القارة يطلبون تتويجاً ببطولة سابقة أو تحقيق إنجاز الصعود التاريخي.`);
    }
    if (matches < 25) {
      reasons.push(`الخبرة الميدانية غير كافية (المطلوب 25 مباراة على الأقل، خضت: ${matches}).`);
    }
  } else if (clubTier.tierLevel >= 4 && matches < 12 && !isPromoted && !isChampion) {
    // Domestic Tier 1: requires at least some match experience
    reasons.push(`إدارة النادي تبحث عن مدرب متمرس خاض 12 مباراة رسمية على الأقل.`);
  }

  // ----------------------------------------------------
  // FACTOR 4: Current Club Level (مستوى النادي وسلم التدرج المنطقي)
  // ----------------------------------------------------
  const currentTier = currentLeague?.tier ?? (currentClub as any).divisionTier ?? 1;
  const candidateTier = candidateLeague?.tier ?? (candidateClub as any).divisionTier ?? 1;

  // Division 4 Coach (الدرجة الرابعة):
  if (currentTier === 4) {
    // Can ONLY receive offers from Tier 4 or Tier 3 (or Tier 2 ONLY if champion with reputation >= 40)
    if (candidateTier <= 1 || clubTier.tierLevel >= 4) {
      reasons.push(`القفز من الدرجة الرابعة مباشرة إلى أندية الدوري الممتاز أو النخبة غير منطقي كروياً.`);
    } else if (candidateTier === 2 && !isChampion && effectiveRep < 40) {
      reasons.push(`الانتقال لدوري المحترفين (الدرجة الثانية) يتطلب تحقيق لقب بطولة أو سمعة أعلى.`);
    }
  } else if (currentTier === 3) {
    // Division 3 Coach (الدرجة الثالثة):
    // Can move to Tier 3, Tier 2, or lower Tier 4. Cannot jump directly to Tier 1 giants or World Elite.
    if (clubTier.tierLevel >= 5 || (candidateTier === 1 && !isChampion && !isPromoted && effectiveRep < 60)) {
      reasons.push(`الفارق الفني بين دوري الدرجة الثالثة وأندية القمة في الممتاز يتطلب التدرج أولاً في الدرجة الثانية.`);
    }
  } else if (currentTier === 2) {
    // Division 2 Coach (دوري المحترفين):
    // Can move to Tier 2, Tier 1, or Arab Tier 2/1. Elite clubs (Real Madrid) are blocked.
    if (clubTier.tierLevel >= 6) {
      reasons.push(`أندية النخبة العالمية لا تتعاقد مباشرة مع مدربي الدرجة الثانية دون تجربة ممتازة في دوري الأضواء.`);
    }
  }

  // Limit reputation jump per transfer to prevent unrealistic surges
  const maxRepJump = isChampion ? 38 : isPromoted ? 30 : 25;
  if (candidateClub.reputation > (currentClub.reputation + maxRepJump) && offerCategory !== 'youth_foundation') {
    reasons.push(`الفارق في مكانة الناديين (${candidateClub.reputation} مقابل ${currentClub.reputation}) يتجاوز الحد المنطقي لانتقال المدرب.`);
  }

  // ----------------------------------------------------
  // FACTOR 5: Manager's Tactical Style Match (التوافق التكتيكي)
  // ----------------------------------------------------
  let tacticalFit = 75; // baseline neutral fit
  const tactics = managerTactics || currentClub.tactics;
  if (tactics) {
    const mentality = tactics.mentality || 'balanced';
    const pressing = tactics.pressingIntensity || 'balanced';
    const passing = tactics.passingStyle || 'short';

    if (offerCategory === 'relegation_salvage') {
      // Relegation fight favors defensive discipline and high pressing
      if (mentality === 'defensive' || mentality === 'ultra_defensive' || pressing === 'high' || pressing === 'gegenpress') {
        tacticalFit += 18;
      } else if (mentality === 'ultra_attacking') {
        tacticalFit -= 10;
      }
    } else if (offerCategory === 'title_challenger' || clubTier.tierLevel >= 5) {
      // Big clubs favor attacking, dominant possession football
      if (mentality === 'attacking' || mentality === 'ultra_attacking' || passing === 'short') {
        tacticalFit += 15;
      } else if (mentality === 'ultra_defensive') {
        tacticalFit -= 12;
      }
    } else if (offerCategory === 'youth_foundation') {
      // Youth foundation favors progressive build up
      if (tactics.buildUpStyle === 'from_back' || passing === 'short' || mentality === 'balanced') {
        tacticalFit += 15;
      }
    }
  }
  tacticalFit = Math.max(40, Math.min(100, tacticalFit));

  // ----------------------------------------------------
  // Overall Suitability Score (0 - 100)
  // ----------------------------------------------------
  const licenseWeight = Math.min(1, managerLicenseRank / Math.max(1, requiredLicenseRank)) * 25;
  const repWeight = Math.min(1, effectiveRep / Math.max(1, targetMinRep)) * 30;
  const achievementWeight = Math.min(1, (trophiesCount * 10 + matches * 0.5) / 25) * 20;
  const tacticalWeight = (tacticalFit / 100) * 15;
  const tierFitBonus = Math.max(0, 10 - Math.abs(currentTier - candidateTier) * 3);

  const score = Math.max(0, Math.min(100, Math.round(
    licenseWeight + repWeight + achievementWeight + tacticalWeight + tierFitBonus
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
  const licenseRank = getLicenseRank(manager.license || 'D');
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
      case 'ms_license_c':
        currentVal = licenseRank >= 2 ? 1 : 0;
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
      case 'ms_license_b':
        currentVal = licenseRank >= 3 ? 1 : 0;
        break;
      case 'ms_matches_50':
        currentVal = Math.min(50, matchesManaged);
        break;
      case 'ms_license_a':
        currentVal = licenseRank >= 4 ? 1 : 0;
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
        currentVal = licenseRank >= 5 ? 1 : 0;
        break;
      case 'ms_two_clubs_trophies':
        currentVal = Math.min(2, clubsCount > 1 && trophiesCount >= 2 ? 2 : (trophiesCount >= 1 ? 1 : 0));
        break;
      case 'ms_matches_100_elite':
        currentVal = matchesManaged >= 100 && winRate >= 55 ? 100 : Math.min(100, matchesManaged);
        break;
      case 'ms_license_elite':
        currentVal = licenseRank >= 6 ? 1 : 0;
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
