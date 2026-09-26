import { Club, Sponsor, SponsorshipOffer, SponsorCategory, SponsorMilestoneBonus } from '../types/game';

export interface SponsorBrandProfile {
  name: string;
  category: SponsorCategory;
  industry: string;
  tagline: string;
  brandColor: string;
  accentColor: string;
  tierRange: number[]; // e.g. [1], [1, 2], [2, 3, 4]
  countryCode: string; // 'EGY', 'SAU', 'MAR', 'TUN', 'ALG', 'GLOBAL'
  baseMultiplier: number;
}

// =========================================================================
// AUTHENTIC REAL BRANDS REPOSITORY (BY COUNTRY, TIER, & CATEGORY)
// =========================================================================
export const SPONSOR_BRANDS_DATABASE: SponsorBrandProfile[] = [
  // --- EGYPTIAN TIER 1 (ELITE) ---
  {
    name: 'اتصالات من e& مصر',
    category: 'shirt',
    industry: 'الاتصالات والتكنولوجيا',
    tagline: 'معاً نبني المستقبل الرقمي',
    brandColor: '#dc2626',
    accentColor: '#fbbf24',
    tierRange: [1],
    countryCode: 'EGY',
    baseMultiplier: 1.4,
  },
  {
    name: 'فودافون مصر',
    category: 'shirt',
    industry: 'الاتصالات والشبكات',
    tagline: 'مع بعض نقدر',
    brandColor: '#e11d48',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'EGY',
    baseMultiplier: 1.35,
  },
  {
    name: 'المصرية للاتصالات WE',
    category: 'shirt',
    industry: 'الاتصالات والإنترنت',
    tagline: 'قبل أي حد',
    brandColor: '#7c3aed',
    accentColor: '#ffffff',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.25,
  },
  {
    name: 'بنك مصر',
    category: 'shirt',
    industry: 'القطاع المصرفي والاستثمار',
    tagline: 'بنك مصر.. تاريخ وبناء أمة',
    brandColor: '#991b1b',
    accentColor: '#f59e0b',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.3,
  },
  {
    name: 'البنك الأهلي المصري',
    category: 'shirt',
    industry: 'القطاع المصرفي والتنمية',
    tagline: 'أهل الثقة.. شريك التنمية',
    brandColor: '#047857',
    accentColor: '#f59e0b',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.3,
  },
  {
    name: 'مجموعة طلعت مصطفى TMG',
    category: 'shirt',
    industry: 'التطوير العقاري والاستثمار',
    tagline: 'نبني مجتمعات نابضة بالحياة',
    brandColor: '#0f172a',
    accentColor: '#38bdf8',
    tierRange: [1],
    countryCode: 'EGY',
    baseMultiplier: 1.35,
  },
  {
    name: 'حديد عز',
    category: 'shirt',
    industry: 'الصناعات الثقيلة والصلب',
    tagline: 'صلابة تبني الأوطان',
    brandColor: '#1e3a8a',
    accentColor: '#f97316',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.2,
  },
  // STADIUM & PITCH
  {
    name: 'فاب مصر FAB Misr',
    category: 'stadium',
    industry: 'الصيرفة والاستثمار الإقليمي',
    tagline: 'ننمو معاً للمستقبل',
    brandColor: '#1e40af',
    accentColor: '#60a5fa',
    tierRange: [1],
    countryCode: 'EGY',
    baseMultiplier: 1.2,
  },
  {
    name: 'ماونتن فيو للتنمية والاستثمار',
    category: 'stadium',
    industry: 'التطوير العقاري الفاخر',
    tagline: 'عمار وسعادة للحياة',
    brandColor: '#0369a1',
    accentColor: '#38bdf8',
    tierRange: [1],
    countryCode: 'EGY',
    baseMultiplier: 1.15,
  },
  {
    name: 'دهانات كابسي للسيارات والإنشاء',
    category: 'stadium',
    industry: 'الكيماويات ومستلزمات الإنشاء',
    tagline: 'ألوان تدوم لسنوات',
    brandColor: '#b45309',
    accentColor: '#fbbf24',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.05,
  },
  {
    name: 'دهانات GLC مصر',
    category: 'stadium',
    industry: 'الدهانات والديكورات',
    tagline: 'إلهام بلا حدود',
    brandColor: '#b91c1c',
    accentColor: '#facc15',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.1,
  },
  // KIT & APPAREL
  {
    name: 'Puma Global Football',
    category: 'kit_apparel',
    industry: 'الملابس والمستلزمات الرياضية العالمية',
    tagline: 'Forever Faster',
    brandColor: '#000000',
    accentColor: '#dc2626',
    tierRange: [1],
    countryCode: 'GLOBAL',
    baseMultiplier: 1.25,
  },
  {
    name: 'Adidas Football',
    category: 'kit_apparel',
    industry: 'التجهيزات الرياضية الفاخرة',
    tagline: 'Impossible is Nothing',
    brandColor: '#000000',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'GLOBAL',
    baseMultiplier: 1.3,
  },
  {
    name: 'Nike Sports Elite',
    category: 'kit_apparel',
    industry: 'الأطقم والأحذية الرياضية',
    tagline: 'Just Do It',
    brandColor: '#0f172a',
    accentColor: '#10b981',
    tierRange: [1],
    countryCode: 'GLOBAL',
    baseMultiplier: 1.3,
  },
  {
    name: 'Kelme Sports Spain',
    category: 'kit_apparel',
    industry: 'التجهيزات الرياضية المحترفة',
    tagline: 'Leave Your Mark',
    brandColor: '#1e293b',
    accentColor: '#38bdf8',
    tierRange: [1, 2, 3],
    countryCode: 'GLOBAL',
    baseMultiplier: 1.0,
  },
  {
    name: 'Joma Sportswear',
    category: 'kit_apparel',
    industry: 'الأطقم والتجهيزات',
    tagline: 'All for Sports',
    brandColor: '#1e40af',
    accentColor: '#f59e0b',
    tierRange: [2, 3, 4],
    countryCode: 'GLOBAL',
    baseMultiplier: 0.9,
  },
  // SLEEVES & BACK
  {
    name: 'مصر للطيران EgyptAir',
    category: 'sleeve',
    industry: 'الطيران والنقل الدولي',
    tagline: 'أجنحة الوطن للعالم',
    brandColor: '#1e3a8a',
    accentColor: '#60a5fa',
    tierRange: [1],
    countryCode: 'EGY',
    baseMultiplier: 1.1,
  },
  {
    name: 'شركة جهينة للصناعات الغذائية',
    category: 'sleeve',
    industry: 'الأغذية والألبان والعصائر',
    tagline: 'طبيعي ١٠٠٪ لأجيال مصر',
    brandColor: '#15803d',
    accentColor: '#ffffff',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.05,
  },
  {
    name: 'شركة عبور لاند للصناعات الغذائية',
    category: 'sleeve',
    industry: 'الأغذية والمنتجات الاستهلاكية',
    tagline: 'طعم تحبه وتثق فيه',
    brandColor: '#0284c7',
    accentColor: '#facc15',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.0,
  },
  {
    name: 'إيديتا للصناعات الغذائية (مولتو وتودو)',
    category: 'sleeve',
    industry: 'المخبوزات والحلويات',
    tagline: 'ابتسامة مع كل قضمة',
    brandColor: '#dc2626',
    accentColor: '#ffffff',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.0,
  },
  // COMMERCIAL PARTNER
  {
    name: 'بنك التعمير والإسكان HDBank',
    category: 'commercial_partner',
    industry: 'البنوك والتمويل العقاري',
    tagline: 'شريكك لبناء الغد',
    brandColor: '#047857',
    accentColor: '#f97316',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.1,
  },
  {
    name: 'فاليو ValU للتمويل التكنولوجي',
    category: 'commercial_partner',
    industry: 'التكنولوجيا المالية والتقسيط',
    tagline: 'عش اللحظة واشترِ بذكاء',
    brandColor: '#ea580c',
    accentColor: '#ffffff',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.15,
  },
  {
    name: 'كوكاكولا مصر',
    category: 'commercial_partner',
    industry: 'المشروبات المنعشة',
    tagline: 'افتح تفرح مع الكورة',
    brandColor: '#dc2626',
    accentColor: '#ffffff',
    tierRange: [1, 2],
    countryCode: 'GLOBAL',
    baseMultiplier: 1.15,
  },

  // --- EGYPTIAN TIER 2 & 3 (MID-TABLE & PROMOTED) ---
  {
    name: 'سيراميكا كليوباترا جروب',
    category: 'shirt',
    industry: 'السيراميك والأدوات الصحية',
    tagline: 'فن وعراقة في كل تفصيلة',
    brandColor: '#991b1b',
    accentColor: '#fbbf24',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.1,
  },
  {
    name: 'بتروجيت للمشروعات البترولية',
    category: 'shirt',
    industry: 'قطاع البترول والغاز الهندسي',
    tagline: 'رواد مشروعات الطاقة الكبرى',
    brandColor: '#1e3a8a',
    accentColor: '#ea580c',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.05,
  },
  {
    name: 'هيئة قناة السويس البحرية',
    category: 'shirt',
    industry: 'الملاحة والخدمات اللوجستية',
    tagline: 'شريان الخير والتجارة للعالم',
    brandColor: '#0369a1',
    accentColor: '#38bdf8',
    tierRange: [1, 2],
    countryCode: 'EGY',
    baseMultiplier: 1.0,
  },
  {
    name: 'مصر للتأمين القابضة',
    category: 'shirt',
    industry: 'التأمين وإدارة المخاطر',
    tagline: 'أمان واستقرار لأكثر من قرن',
    brandColor: '#1d4ed8',
    accentColor: '#fbbf24',
    tierRange: [2, 3],
    countryCode: 'EGY',
    baseMultiplier: 0.95,
  },
  {
    name: 'شركة دومتي للصناعات الغذائية',
    category: 'shirt',
    industry: 'الأجبان والمخبوزات العصرية',
    tagline: 'الجودة في كل بيت مصري',
    brandColor: '#2563eb',
    accentColor: '#ffffff',
    tierRange: [2, 3],
    countryCode: 'EGY',
    baseMultiplier: 0.9,
  },
  {
    name: 'قطونيل للملابس القطنية المصرية',
    category: 'sleeve',
    industry: 'المنسوجات والقطن الطبيعي',
    tagline: 'نعومة القطن المصري الفاخر',
    brandColor: '#4338ca',
    accentColor: '#ffffff',
    tierRange: [2, 3],
    countryCode: 'EGY',
    baseMultiplier: 0.85,
  },
  {
    name: 'شاي العروسة الأصيل',
    category: 'commercial_partner',
    industry: 'المشروبات الساخنة والتموين',
    tagline: 'مزاج المصريين الأول دائماً',
    brandColor: '#b91c1c',
    accentColor: '#fbbf24',
    tierRange: [2, 3, 4],
    countryCode: 'EGY',
    baseMultiplier: 0.85,
  },

  // --- EGYPTIAN TIER 3 & 4 (LOCAL & REGIONAL CLUBS) ---
  {
    name: 'مصانع غزل المحلة للنسيج',
    category: 'shirt',
    industry: 'الغزل والنسيج القطني',
    tagline: 'فخر الصناعة والقلعة العمالية',
    brandColor: '#0284c7',
    accentColor: '#ffffff',
    tierRange: [2, 3, 4],
    countryCode: 'EGY',
    baseMultiplier: 0.8,
  },
  {
    name: 'أسمنت أسيوط ومواد البناء',
    category: 'shirt',
    industry: 'مواد البناء والتنمية الصعيدية',
    tagline: 'أساس متين لمستقبل الصعيد',
    brandColor: '#c2410c',
    accentColor: '#1e293b',
    tierRange: [3, 4],
    countryCode: 'EGY',
    baseMultiplier: 0.75,
  },
  {
    name: 'مياه سيوة الطبيعية الجوفية',
    category: 'commercial_partner',
    industry: 'المياه المعدنية النقية',
    tagline: 'نقاء واحة سيوة الأصيل',
    brandColor: '#0284c7',
    accentColor: '#ffffff',
    tierRange: [3, 4],
    countryCode: 'EGY',
    baseMultiplier: 0.7,
  },
  {
    name: 'مخبوزات وحلويات البركة الشعبية',
    category: 'stadium',
    industry: 'المخبوزات والحلويات الشرقية',
    tagline: 'طعم البيوت وسر اللمة',
    brandColor: '#d97706',
    accentColor: '#ffffff',
    tierRange: [3, 4],
    countryCode: 'EGY',
    baseMultiplier: 0.65,
  },
  {
    name: 'شاي الكباش الأصيل الفاخر',
    category: 'shirt',
    industry: 'المشروبات التراثية',
    tagline: 'نكهة أصيلة في كل فنجان',
    brandColor: '#991b1b',
    accentColor: '#f59e0b',
    tierRange: [4],
    countryCode: 'EGY',
    baseMultiplier: 0.6,
  },
  {
    name: 'شركة مطاحن مصر العليا',
    category: 'sleeve',
    industry: 'الأغذية والسلع الأساسية',
    tagline: 'خير أرضنا لأهلنا',
    brandColor: '#b45309',
    accentColor: '#ffffff',
    tierRange: [3, 4],
    countryCode: 'EGY',
    baseMultiplier: 0.65,
  },

  // --- SAUDI ARABIA (ROSHN & YELO) ---
  {
    name: 'روشن العقارية ROSHN',
    category: 'shirt',
    industry: 'التطوير العقاري الوطني',
    tagline: 'نحيا كما نحلم',
    brandColor: '#0f172a',
    accentColor: '#10b981',
    tierRange: [1],
    countryCode: 'SAU',
    baseMultiplier: 2.2,
  },
  {
    name: 'أرامكو السعودية Aramco',
    category: 'shirt',
    industry: 'الطاقة والبتروكيماويات العالمية',
    tagline: 'طاقة تلهم العالم',
    brandColor: '#059669',
    accentColor: '#38bdf8',
    tierRange: [1],
    countryCode: 'SAU',
    baseMultiplier: 2.5,
  },
  {
    name: 'stc الاتصالات السعودية',
    category: 'shirt',
    industry: 'الاتصالات والحلول الرقمية',
    tagline: 'انطلق إلى ما هو أبعد',
    brandColor: '#4f46e5',
    accentColor: '#fb7185',
    tierRange: [1],
    countryCode: 'SAU',
    baseMultiplier: 2.0,
  },
  {
    name: 'طيران الرياض Riyadh Air',
    category: 'sleeve',
    industry: 'الطيران الفاخر والضيافة',
    tagline: 'المستقبل يحلّق الآن',
    brandColor: '#581c87',
    accentColor: '#c084fc',
    tierRange: [1],
    countryCode: 'SAU',
    baseMultiplier: 1.8,
  },
  {
    name: 'بنك الرياض Riyad Bank',
    category: 'stadium',
    industry: 'المصارف والاستثمار',
    tagline: 'معاً نبتكر وننجز',
    brandColor: '#1e40af',
    accentColor: '#f59e0b',
    tierRange: [1],
    countryCode: 'SAU',
    baseMultiplier: 1.7,
  },
  {
    name: 'جاهز Jahez لتوصيل الطلبات',
    category: 'commercial_partner',
    industry: 'التوصيل والمنصات الرقمية',
    tagline: 'أقرب لك في كل مكان',
    brandColor: '#dc2626',
    accentColor: '#ffffff',
    tierRange: [1, 2],
    countryCode: 'SAU',
    baseMultiplier: 1.5,
  },
  {
    name: 'يلو Yelo لتأجير السيارات',
    category: 'stadium',
    industry: 'تأجير السيارات واللوجستيات',
    tagline: 'انطلق بثقة مع يلو',
    brandColor: '#facc15',
    accentColor: '#000000',
    tierRange: [1, 2],
    countryCode: 'SAU',
    baseMultiplier: 1.4,
  },

  // --- NORTH AFRICA (MOROCCO, TUNISIA, ALGERIA) ---
  {
    name: 'اتصالات المغرب Maroc Telecom',
    category: 'shirt',
    industry: 'الاتصالات وتكنولوجيا المعلومات',
    tagline: 'عالم جديد يناديكم',
    brandColor: '#1d4ed8',
    accentColor: '#fbbf24',
    tierRange: [1],
    countryCode: 'MAR',
    baseMultiplier: 1.4,
  },
  {
    name: 'التجاري وفا بنك Attijariwafa',
    category: 'stadium',
    industry: 'القطاع البنكي الإفريقي',
    tagline: 'البنك الذي يثق في طموحك',
    brandColor: '#b45309',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'MAR',
    baseMultiplier: 1.3,
  },
  {
    name: 'أوريدو تونس Ooredoo',
    category: 'shirt',
    industry: 'الاتصالات والإنترنت السريع',
    tagline: 'طوّر عالمك',
    brandColor: '#dc2626',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'TUN',
    baseMultiplier: 1.25,
  },
  {
    name: 'سوناطراك Sonatrach للطاقة',
    category: 'shirt',
    industry: 'الطاقة والموارد الطبيعية',
    tagline: 'قوة الاقتصاد الوطني الجزائري',
    brandColor: '#ea580c',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'ALG',
    baseMultiplier: 1.4,
  },

  // --- EUROPEAN & GLOBAL TITANS ---
  {
    name: 'Fly Emirates Airlines',
    category: 'shirt',
    industry: 'الطيران والضيافة العالمية',
    tagline: 'Fly Better',
    brandColor: '#dc2626',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'GLOBAL',
    baseMultiplier: 3.0,
  },
  {
    name: 'Spotify Music Global',
    category: 'shirt',
    industry: 'الترفيه الرقمي وبث الموسيقى',
    tagline: 'Soundtrack Your Passion',
    brandColor: '#10b981',
    accentColor: '#000000',
    tierRange: [1],
    countryCode: 'GLOBAL',
    baseMultiplier: 2.8,
  },
  {
    name: 'Etihad Airways',
    category: 'stadium',
    industry: 'الطيران الدولي المتميز',
    tagline: 'Choose Well',
    brandColor: '#d97706',
    accentColor: '#ffffff',
    tierRange: [1],
    countryCode: 'GLOBAL',
    baseMultiplier: 2.5,
  },
];

// =========================================================================
// FINANCIAL BASELINES BY LEAGUE TIER
// =========================================================================
export const SPONSOR_FINANCIAL_BASELINES: Record<
  number,
  {
    shirtMonthly: { min: number; max: number };
    stadiumMonthly: { min: number; max: number };
    kitMonthly: { min: number; max: number };
    sleeveMonthly: { min: number; max: number };
    partnerMonthly: { min: number; max: number };
    signingBonusMultiplier: number; // monthly * multiplier
    leagueWinBonus: number;
    leagueDrawBonus: number;
    cupWinBonus: number;
    continentalWinBonus: number;
    cleanSheetBonus: number;
    derbyBonus: number;
    leagueTitleBonus: number;
    cupTitleBonus: number;
    continentalTitleBonus: number;
  }
> = {
  1: {
    // Egyptian Premier League / Tier 1
    shirtMonthly: { min: 250000, max: 850000 },
    stadiumMonthly: { min: 180000, max: 550000 },
    kitMonthly: { min: 150000, max: 450000 },
    sleeveMonthly: { min: 90000, max: 280000 },
    partnerMonthly: { min: 80000, max: 240000 },
    signingBonusMultiplier: 3.0,
    leagueWinBonus: 75000,
    leagueDrawBonus: 20000,
    cupWinBonus: 120000,
    continentalWinBonus: 250000,
    cleanSheetBonus: 35000,
    derbyBonus: 90000,
    leagueTitleBonus: 4000000,
    cupTitleBonus: 2500000,
    continentalTitleBonus: 7500000,
  },
  2: {
    // Second Division / Professional League
    shirtMonthly: { min: 60000, max: 180000 },
    stadiumMonthly: { min: 40000, max: 110000 },
    kitMonthly: { min: 35000, max: 95000 },
    sleeveMonthly: { min: 25000, max: 65000 },
    partnerMonthly: { min: 20000, max: 55000 },
    signingBonusMultiplier: 2.5,
    leagueWinBonus: 22000,
    leagueDrawBonus: 7000,
    cupWinBonus: 45000,
    continentalWinBonus: 80000,
    cleanSheetBonus: 12000,
    derbyBonus: 28000,
    leagueTitleBonus: 1200000,
    cupTitleBonus: 900000,
    continentalTitleBonus: 2000000,
  },
  3: {
    // Third Division
    shirtMonthly: { min: 20000, max: 55000 },
    stadiumMonthly: { min: 14000, max: 35000 },
    kitMonthly: { min: 12000, max: 30000 },
    sleeveMonthly: { min: 8000, max: 22000 },
    partnerMonthly: { min: 7000, max: 18000 },
    signingBonusMultiplier: 2.0,
    leagueWinBonus: 7500,
    leagueDrawBonus: 2500,
    cupWinBonus: 16000,
    continentalWinBonus: 30000,
    cleanSheetBonus: 4500,
    derbyBonus: 10000,
    leagueTitleBonus: 400000,
    cupTitleBonus: 300000,
    continentalTitleBonus: 600000,
  },
  4: {
    // Fourth Division / Grassroots
    shirtMonthly: { min: 7000, max: 18000 },
    stadiumMonthly: { min: 4500, max: 12000 },
    kitMonthly: { min: 3500, max: 9000 },
    sleeveMonthly: { min: 2500, max: 7000 },
    partnerMonthly: { min: 2000, max: 5500 },
    signingBonusMultiplier: 1.8,
    leagueWinBonus: 2800,
    leagueDrawBonus: 900,
    cupWinBonus: 6000,
    continentalWinBonus: 12000,
    cleanSheetBonus: 1500,
    derbyBonus: 3500,
    leagueTitleBonus: 150000,
    cupTitleBonus: 100000,
    continentalTitleBonus: 250000,
  },
};

// =========================================================================
// HELPER: GET CATEGORY ARABIC NAME & BADGE
// =========================================================================
export function getSponsorCategoryLabel(category: SponsorCategory | string): {
  label: string;
  shortLabel: string;
  badgeColor: string;
} {
  switch (category) {
    case 'shirt':
    case 'main_shirt':
      return {
        label: 'الراعي الرئيسي للقميص',
        shortLabel: 'القميص',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      };
    case 'stadium':
      return {
        label: 'راعي الاستاد وحقوق التسمية واللوحات',
        shortLabel: 'الاستاد',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    case 'kit_apparel':
      return {
        label: 'المورد الرسمي للأطقم والتجهيزات',
        shortLabel: 'الأطقم',
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      };
    case 'sleeve':
      return {
        label: 'راعي أكمام القميص والظهر',
        shortLabel: 'الأكمام',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      };
    case 'commercial_partner':
    default:
      return {
        label: 'الشريك التجاري والمصرفي الرسمي',
        shortLabel: 'شريك تجاري',
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      };
  }
}

// =========================================================================
// GENERATE REALISTIC SPONSOR FOR ANY CLUB
// =========================================================================
export function generateSponsorForClub(
  club: Club,
  category: SponsorCategory,
  overrideBrand?: SponsorBrandProfile
): Sponsor {
  const tier = Math.min(4, Math.max(1, club.division || 1));
  const baselines = SPONSOR_FINANCIAL_BASELINES[tier] || SPONSOR_FINANCIAL_BASELINES[4];
  const clubRep = Math.max(15, Math.min(99, club.reputation || 50));
  const repFactor = clubRep / 50; // 0.3 to 2.0 multiplier based on club reputation

  // Find suitable brands
  let brand = overrideBrand;
  if (!brand) {
    const candidates = SPONSOR_BRANDS_DATABASE.filter(b => {
      const catMatch = b.category === category;
      const tierMatch = b.tierRange.includes(tier);
      const countryMatch =
        b.countryCode === 'GLOBAL' ||
        b.countryCode === (club.countryCode || club.countryId || 'EGY');
      return catMatch && (tierMatch || countryMatch);
    });

    if (candidates.length > 0) {
      brand = candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      // Fallback
      brand = {
        name: `${club.shortName || club.name} شريك تجاري`,
        category,
        industry: 'شراكة تجارية استراتيجية',
        tagline: 'شريك النجاح الرياضي',
        brandColor: club.primaryColor || '#1e293b',
        accentColor: club.secondaryColor || '#f59e0b',
        tierRange: [tier],
        countryCode: 'EGY',
        baseMultiplier: 1.0,
      };
    }
  }

  // Monthly base calculation
  let minMonthly = 10000;
  let maxMonthly = 30000;
  if (category === 'shirt') {
    minMonthly = baselines.shirtMonthly.min;
    maxMonthly = baselines.shirtMonthly.max;
  } else if (category === 'stadium') {
    minMonthly = baselines.stadiumMonthly.min;
    maxMonthly = baselines.stadiumMonthly.max;
  } else if (category === 'kit_apparel') {
    minMonthly = baselines.kitMonthly.min;
    maxMonthly = baselines.kitMonthly.max;
  } else if (category === 'sleeve') {
    minMonthly = baselines.sleeveMonthly.min;
    maxMonthly = baselines.sleeveMonthly.max;
  } else {
    minMonthly = baselines.partnerMonthly.min;
    maxMonthly = baselines.partnerMonthly.max;
  }

  // Weight by reputation and brand multiplier
  const rawMonthly = (minMonthly + (maxMonthly - minMonthly) * (repFactor - 0.4)) * brand.baseMultiplier;
  const monthlyPayment = Math.max(minMonthly, Math.round(rawMonthly / 1000) * 1000);

  // Signing bonus
  const signingBonus = Math.round(monthlyPayment * baselines.signingBonusMultiplier);

  // Duration
  const totalDurationMonths = category === 'stadium' ? 24 : category === 'shirt' ? 12 : 12;
  const contractMonthsRemaining = totalDurationMonths;

  // Performance bonuses
  const bonusForWin = Math.round(baselines.leagueWinBonus * repFactor * (brand.baseMultiplier * 0.9));
  const bonusForDraw = Math.round(baselines.leagueDrawBonus * repFactor);
  const bonusCupWin = Math.round(baselines.cupWinBonus * repFactor * brand.baseMultiplier);
  const bonusContinentalWin = Math.round(baselines.continentalWinBonus * repFactor * brand.baseMultiplier);
  const bonusCleanSheet = Math.round(baselines.cleanSheetBonus * repFactor);
  const bonusDerbyWin = Math.round(baselines.derbyBonus * repFactor);

  const milestoneBonus: SponsorMilestoneBonus = {
    leagueChampionBonus: Math.round(baselines.leagueTitleBonus * repFactor),
    cupChampionBonus: Math.round(baselines.cupTitleBonus * repFactor),
    continentalChampionBonus: Math.round(baselines.continentalTitleBonus * repFactor),
    topFourFinishBonus: Math.round(baselines.leagueTitleBonus * 0.3 * repFactor),
  };

  return {
    id: `sp_${category}_${club.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: brand.name,
    type: category,
    category,
    industry: brand.industry,
    tagline: brand.tagline,
    brandColor: brand.brandColor,
    accentColor: brand.accentColor,
    monthlyPayment,
    signingBonus,
    contractMonthsRemaining,
    totalDurationMonths,
    bonusForWin,
    bonusForDraw,
    bonusCupWin,
    bonusContinentalWin,
    bonusCleanSheet,
    bonusDerbyWin,
    milestoneBonus,
    satisfaction: 85,
    reputationMinRequired: Math.max(10, Math.round(clubRep * 0.8)),
    penaltyClause: Math.round(monthlyPayment * 2),
  };
}

// =========================================================================
// POPULATE FULL ROSTER OF SPONSORS FOR ANY CLUB (BY TIER & PRESTIGE)
// =========================================================================
export function populateClubSponsors(club: Club): Sponsor[] {
  const tier = Math.min(4, Math.max(1, club.division || 1));
  const slots: SponsorCategory[] = ['shirt', 'stadium'];

  // Higher tier clubs have more active sponsors
  if (tier === 1) {
    slots.push('kit_apparel', 'sleeve', 'commercial_partner');
  } else if (tier === 2) {
    slots.push('kit_apparel', 'sleeve');
  } else if (tier === 3) {
    slots.push('kit_apparel');
  }

  // Keep track of used brand names to prevent duplicate brands on the same club
  const usedNames = new Set<string>();
  const sponsors: Sponsor[] = [];

  for (const slot of slots) {
    // Pick suitable brand not yet used
    const candidates = SPONSOR_BRANDS_DATABASE.filter(b => {
      return (
        b.category === slot &&
        !usedNames.has(b.name) &&
        (b.tierRange.includes(tier) || b.countryCode === 'GLOBAL')
      );
    });

    const chosenBrand = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : undefined;
    if (chosenBrand) {
      usedNames.add(chosenBrand.name);
    }

    const sp = generateSponsorForClub(club, slot, chosenBrand);
    sponsors.push(sp);
  }

  return sponsors;
}

// =========================================================================
// GENERATE ATTRACTIVE INCOMING SPONSORSHIP OFFERS / BIDS
// =========================================================================
export function generateIncomingSponsorshipOffers(
  club: Club,
  count = 4
): SponsorshipOffer[] {
  const tier = Math.min(4, Math.max(1, club.division || 1));
  const existingSponsors = Array.isArray(club.sponsors) ? club.sponsors : [];
  const existingCategories = new Set(existingSponsors.map(s => s.category || s.type));

  const allCategories: SponsorCategory[] = [
    'shirt',
    'stadium',
    'kit_apparel',
    'sleeve',
    'commercial_partner',
  ];

  // Prioritize open slots first, but allow upgrade bids for existing slots
  const targetCategories: SponsorCategory[] = [];
  for (const cat of allCategories) {
    if (!existingCategories.has(cat)) {
      targetCategories.push(cat);
    }
  }
  while (targetCategories.length < count) {
    const randomCat = allCategories[Math.floor(Math.random() * allCategories.length)];
    targetCategories.push(randomCat);
  }

  const offers: SponsorshipOffer[] = [];
  const usedNames = new Set<string>(existingSponsors.map(s => s.name));

  for (let i = 0; i < count; i++) {
    const category = targetCategories[i] || 'shirt';

    // Find candidates for this slot
    const candidates = SPONSOR_BRANDS_DATABASE.filter(b => {
      const catMatch = b.category === category;
      const notUsed = !usedNames.has(b.name);
      const tierMatch = b.tierRange.includes(tier) || b.countryCode === 'GLOBAL';
      return catMatch && notUsed && tierMatch;
    });

    const brand = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : undefined;
    if (brand) {
      usedNames.add(brand.name);
    }

    const baseSponsor = generateSponsorForClub(club, category, brand);

    // Variation in offer terms to create exciting strategic choices
    const durationVariance = Math.random() > 0.6 ? 24 : 12;
    const upfrontBoost = Math.random() > 0.5 ? 1.2 : 0.9;
    const winBonusBoost = Math.random() > 0.5 ? 1.3 : 0.85;

    const offer: SponsorshipOffer = {
      ...baseSponsor,
      id: `offer_${category}_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
      totalDurationMonths: durationVariance,
      contractMonthsRemaining: durationVariance,
      signingBonus: Math.round((baseSponsor.signingBonus || 50000) * upfrontBoost),
      bonusForWin: Math.round(baseSponsor.bonusForWin * winBonusBoost),
      bonusCupWin: Math.round((baseSponsor.bonusCupWin || baseSponsor.bonusForWin * 1.5) * winBonusBoost),
      bonusContinentalWin: Math.round(
        (baseSponsor.bonusContinentalWin || baseSponsor.bonusForWin * 2.5) * winBonusBoost
      ),
      offerExpiryRounds: 3, // Valid for 3 rounds
      isNegotiated: false,
      negotiationCount: 0,
    };

    offers.push(offer);
  }

  return offers;
}

// =========================================================================
// NEGOTIATE SPONSORSHIP OFFER (COACH ATTEMPTS TO IMPROVE TERMS)
// =========================================================================
export interface NegotiationResult {
  success: boolean;
  updatedOffer: SponsorshipOffer;
  message: string;
}

export function negotiateSponsorshipOffer(
  offer: SponsorshipOffer,
  club: Club,
  managerReputation = 50
): NegotiationResult {
  const currentCount = offer.negotiationCount || 0;
  if (currentCount >= 2) {
    return {
      success: false,
      updatedOffer: offer,
      message: 'الراعي يتمسك بعرضه الأخير ويرفض تقديم أي تنازلات إضافية!',
    };
  }

  // Success probability based on manager prestige & club reputation
  const clubRep = club.reputation || 50;
  const successChance = 0.5 + ((clubRep + managerReputation) / 200) * 0.35; // 60% - 85%
  const roll = Math.random();

  if (roll <= successChance) {
    // Negotiation Success! Boost monthly payment by 15-25% and win bonuses by 20%
    const boostPercent = 0.15 + Math.random() * 0.10; // +15% to +25%
    const newMonthly = Math.round((offer.monthlyPayment * (1 + boostPercent)) / 1000) * 1000;
    const newSigning = Math.round(((offer.signingBonus || offer.monthlyPayment * 2) * (1 + boostPercent * 0.8)) / 1000) * 1000;
    const newWin = Math.round((offer.bonusForWin * (1 + boostPercent * 1.2)) / 500) * 500;
    const newCupWin = Math.round(((offer.bonusCupWin || offer.bonusForWin * 1.5) * (1 + boostPercent * 1.2)) / 500) * 500;
    const newContWin = Math.round(((offer.bonusContinentalWin || offer.bonusForWin * 2.5) * (1 + boostPercent * 1.2)) / 500) * 500;

    const updatedOffer: SponsorshipOffer = {
      ...offer,
      monthlyPayment: newMonthly,
      signingBonus: newSigning,
      bonusForWin: newWin,
      bonusCupWin: newCupWin,
      bonusContinentalWin: newContWin,
      isNegotiated: true,
      negotiationCount: currentCount + 1,
    };

    return {
      success: true,
      updatedOffer,
      message: `نجحت المفاوضات بامتياز! وافق ${offer.name} على رفع الدفعة الشهرية بنسبة +${Math.round(boostPercent * 100)}% ومضاعفة مكافآت الفوز والبطولات تقديراً لمكانة النادي.`,
    };
  } else {
    // Negotiation Failed
    const updatedOffer: SponsorshipOffer = {
      ...offer,
      isNegotiated: true,
      negotiationCount: currentCount + 1,
    };

    return {
      success: false,
      updatedOffer,
      message: `تمسك وفد شركة ${offer.name} بالشروط المعروضة واعتذروا عن زيادة الأرقام، مع التأكيد على رغبتهم في الشراكة بالبنود الحالية.`,
    };
  }
}

// =========================================================================
// MATCHDAY SPONSOR REVENUE CALCULATOR
// =========================================================================
export interface MatchdaySponsorCalculation {
  totalSponsorsRevenue: number;
  sponsorsWinBonus: number;
  sponsorsDrawBonus: number;
  sponsorsCupBonus: number;
  sponsorsContinentalBonus: number;
  sponsorsCleanSheetBonus: number;
  sponsorsDerbyBonus: number;
  sponsorsBaseMatchdayAd: number;
  detailedBreakdown: string[];
}

export function calculateSponsorMatchdayEarnings(
  sponsors: Sponsor[],
  params: {
    competitionType: 'league' | 'cup' | 'continental' | 'world' | string;
    resultType: 'win' | 'draw' | 'loss';
    isCleanSheet: boolean;
    isDerby: boolean;
    isHome: boolean;
    leagueTier: number;
  }
): MatchdaySponsorCalculation {
  const {
    competitionType,
    resultType,
    isCleanSheet,
    isDerby,
    isHome,
    leagueTier,
  } = params;

  let sponsorsWinBonus = 0;
  let sponsorsDrawBonus = 0;
  let sponsorsCupBonus = 0;
  let sponsorsContinentalBonus = 0;
  let sponsorsCleanSheetBonus = 0;
  let sponsorsDerbyBonus = 0;
  const detailedBreakdown: string[] = [];

  const activeSponsors = Array.isArray(sponsors) ? sponsors : [];

  for (const sp of activeSponsors) {
    if (!sp) continue;

    // 1. Victory / Draw bonuses
    if (resultType === 'win') {
      if (competitionType === 'cup') {
        const cupBonus = sp.bonusCupWin || Math.round(sp.bonusForWin * 1.5);
        sponsorsCupBonus += cupBonus;
        detailedBreakdown.push(`🏆 ${sp.name}: مكافأة التأهل والفوز في الكأس (+${cupBonus.toLocaleString()} ج.م)`);
      } else if (competitionType === 'continental') {
        const contBonus = sp.bonusContinentalWin || Math.round(sp.bonusForWin * 2.5);
        sponsorsContinentalBonus += contBonus;
        detailedBreakdown.push(`🌍 ${sp.name}: مكافأة الانتصار الإفريقي والقاري (+${contBonus.toLocaleString()} ج.م)`);
      } else {
        // League win
        const winBonus = sp.bonusForWin || 0;
        sponsorsWinBonus += winBonus;
        detailedBreakdown.push(`⚽ ${sp.name}: مكافأة الفوز في الدوري (+${winBonus.toLocaleString()} ج.م)`);
      }

      // Derby victory bonus
      if (isDerby && sp.bonusDerbyWin) {
        sponsorsDerbyBonus += sp.bonusDerbyWin;
        detailedBreakdown.push(`🔥 ${sp.name}: حافز حسم الديربي ومباراة القمة (+${sp.bonusDerbyWin.toLocaleString()} ج.م)`);
      }
    } else if (resultType === 'draw') {
      if (sp.bonusForDraw && sp.bonusForDraw > 0) {
        sponsorsDrawBonus += sp.bonusForDraw;
        detailedBreakdown.push(`🤝 ${sp.name}: حافز حصد نقطة التعادل (+${sp.bonusForDraw.toLocaleString()} ج.م)`);
      }
    }

    // Clean sheet bonus
    if (isCleanSheet && (resultType === 'win' || resultType === 'draw') && sp.bonusCleanSheet) {
      sponsorsCleanSheetBonus += sp.bonusCleanSheet;
      detailedBreakdown.push(`🛡️ ${sp.name}: مكافأة الشباك النظيفة (+${sp.bonusCleanSheet.toLocaleString()} ج.م)`);
    }
  }

  // Stadium and matchday board advertising share (approx 1/4 of monthly retainer across all sponsors)
  let baseFromSponsors = activeSponsors.reduce(
    (sum, sp) => sum + Math.round((sp.monthlyPayment || 0) / 4),
    0
  );

  // If match is at home, stadium sponsor gives full board activation; away match gets 50%
  if (!isHome) {
    baseFromSponsors = Math.round(baseFromSponsors * 0.7);
  }

  // Fallback ad share if no sponsors yet
  const defaultAdShare =
    leagueTier === 1 ? 30000 : leagueTier === 2 ? 18000 : leagueTier === 3 ? 10000 : 5000;
  const sponsorsBaseMatchdayAd = baseFromSponsors > 0 ? baseFromSponsors : defaultAdShare;

  const totalSponsorsRevenue =
    sponsorsWinBonus +
    sponsorsDrawBonus +
    sponsorsCupBonus +
    sponsorsContinentalBonus +
    sponsorsCleanSheetBonus +
    sponsorsDerbyBonus +
    sponsorsBaseMatchdayAd;

  return {
    totalSponsorsRevenue,
    sponsorsWinBonus,
    sponsorsDrawBonus,
    sponsorsCupBonus,
    sponsorsContinentalBonus,
    sponsorsCleanSheetBonus,
    sponsorsDerbyBonus,
    sponsorsBaseMatchdayAd,
    detailedBreakdown,
  };
}
