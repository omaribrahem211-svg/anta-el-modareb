export type CompetitionType = 'league' | 'cup' | 'continental' | 'super_cup';

export interface CompetitionDefinition {
  id: string;
  name: string;
  shortName: string;
  type: CompetitionType;
  country: string;
  countryCode: string;
  continent: 'Europe' | 'Africa' | 'Asia' | 'South America' | 'Global';
  tier?: number;
  totalTeams: number;
  championPrize: number; // In Euro
  runnerUpPrize: number; // In Euro
  reputation: number;
  formatDescription: string;
  iconName: string;
  color: string;
}

export const GLOBAL_COMPETITIONS: Record<string, CompetitionDefinition> = {
  // Continental Competitions
  ucl: {
    id: 'ucl',
    name: 'دوري أبطال أوروبا للنخبة',
    shortName: 'تشامبيونزليغ',
    type: 'continental',
    country: 'أوروبا',
    countryCode: 'EUR',
    continent: 'Europe',
    totalTeams: 32,
    championPrize: 85000000,
    runnerUpPrize: 45000000,
    reputation: 100,
    formatDescription: 'أقوى بطولة قارية في العالم بنظام المجموعات والأدوار الإقصائية',
    iconName: 'Trophy',
    color: '#1e3a8a',
  },
  uel: {
    id: 'uel',
    name: 'الدوري الأوروبي',
    shortName: 'يوروباليغ',
    type: 'continental',
    country: 'أوروبا',
    countryCode: 'EUR',
    continent: 'Europe',
    totalTeams: 32,
    championPrize: 35000000,
    runnerUpPrize: 18000000,
    reputation: 90,
    formatDescription: 'بطولة الأندية الأوروبية العريقة',
    iconName: 'Medal',
    color: '#ea580c',
  },
  ccl: {
    id: 'ccl',
    name: 'دوري أبطال إفريقيا',
    shortName: 'أبطال إفريقيا',
    type: 'continental',
    country: 'إفريقيا',
    countryCode: 'AFR',
    continent: 'Africa',
    totalTeams: 16,
    championPrize: 15000000,
    runnerUpPrize: 7500000,
    reputation: 88,
    formatDescription: 'عرش القارة السمراء للأندية الأبطال',
    iconName: 'Flame',
    color: '#ca8a04',
  },
  acl: {
    id: 'acl',
    name: 'دوري أبطال آسيا للنخبة',
    shortName: 'أبطال آسيا',
    type: 'continental',
    country: 'آسيا',
    countryCode: 'ASI',
    continent: 'Asia',
    totalTeams: 24,
    championPrize: 22000000,
    runnerUpPrize: 11000000,
    reputation: 89,
    formatDescription: 'قمة كرة القدم الآسيوية وصراع العمالقة',
    iconName: 'Crown',
    color: '#0284c7',
  },

  // Domestic Cups
  egy_cup: {
    id: 'egy_cup',
    name: 'كأس مصر العريق',
    shortName: 'كأس مصر',
    type: 'cup',
    country: 'مصر',
    countryCode: 'EGY',
    continent: 'Africa',
    totalTeams: 32,
    championPrize: 3500000,
    runnerUpPrize: 1500000,
    reputation: 82,
    formatDescription: 'أقدم بطولة كأس في الوطن العربي وإفريقيا',
    iconName: 'Shield',
    color: '#dc2626',
  },
  eng_fa_cup: {
    id: 'eng_fa_cup',
    name: 'كأس الاتحاد الإنجليزي',
    shortName: 'FA Cup',
    type: 'cup',
    country: 'إنجلترا',
    countryCode: 'ENG',
    continent: 'Europe',
    totalTeams: 64,
    championPrize: 12000000,
    runnerUpPrize: 6000000,
    reputation: 94,
    formatDescription: 'أعرق مسابقة كرة قدم في التاريخ على استاد ويمبلي',
    iconName: 'Trophy',
    color: '#b91c1c',
  },
  esp_copa: {
    id: 'esp_copa',
    name: 'كأس ملك إسبانيا',
    shortName: 'كوبا ديل ري',
    type: 'cup',
    country: 'إسبانيا',
    countryCode: 'ESP',
    continent: 'Europe',
    totalTeams: 32,
    championPrize: 9000000,
    runnerUpPrize: 4500000,
    reputation: 92,
    formatDescription: 'صراع الكأس الملكية الإسبانية للأندية',
    iconName: 'Crown',
    color: '#eab308',
  },
  sau_kings_cup: {
    id: 'sau_kings_cup',
    name: 'كأس خادم الحرمين الشريفين',
    shortName: 'كأس الملك',
    type: 'cup',
    country: 'المملكة العربية السعودية',
    countryCode: 'SAU',
    continent: 'Asia',
    totalTeams: 32,
    championPrize: 14000000,
    runnerUpPrize: 7000000,
    reputation: 92,
    formatDescription: 'أغلى الكؤوس السعودية في صراع إقصائي ناري',
    iconName: 'Award',
    color: '#15803d',
  },
};
