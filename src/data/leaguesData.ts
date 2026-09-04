import { Club, LeagueDefinition } from '../types/game';
import { INITIAL_TEAMS } from './initialData';
import { createClub } from './realClubsData';
import { generateClubSquad } from '../utils/playerGenerator';
import { 
  EGYPT_PREMIER_CLUBS, 
  EGYPT_TIER_2_CLUBS, 
  SAUDI_PRO_CLUBS, 
  SAUDI_TIER_2_CLUBS, 
  MOROCCO_BOTOLA_CLUBS, 
  TUNISIA_LIGUE_CLUBS, 
  ALGERIA_LIGUE_CLUBS, 
  UAE_PRO_CLUBS, 
  QATAR_STARS_CLUBS 
} from './arabClubsData';
import { 
  SPAIN_LA_LIGA_CLUBS, 
  ENGLAND_PREMIER_CLUBS, 
  ITALY_SERIE_A_CLUBS, 
  GERMANY_BUNDESLIGA_CLUBS, 
  FRANCE_LIGUE_1_CLUBS 
} from './europeanClubsData';
import { 
  SPAIN_LA_LIGA_2_CLUBS, 
  ENGLAND_CHAMPIONSHIP_CLUBS 
} from './europeanClubsData2';
import { 
  BRAZIL_SERIE_A_CLUBS, 
  ARGENTINA_PRIMERA_CLUBS 
} from './latamClubsData';

// Re-export for backward compatibility
export { generateClubSquad, createClub };

// ----------------------------------------------------
// 1. EGYPTIAN LEAGUES (TIERS 1 TO 4)
// ----------------------------------------------------

export const EGYPT_TIER_4_LEAGUE: LeagueDefinition = {
  id: 'egy_tier_4',
  name: 'دوري الدرجة الرابعة المصري',
  shortName: 'الدرجة الرابعة',
  country: 'مصر',
  tier: 4,
  reputation: 15,
  promotionSpots: 2,
  relegationSpots: 0,
  playoffSpots: 0,
  teams: INITIAL_TEAMS,
};

export const EGYPT_TIER_3_TEAMS: Club[] = [
  createClub('eg3_mansoura', 'نادي المنصورة الرياضي', 'المنصورة', 'الدقهلية', 'مصر', 'EGY', 3, 'egy_tier_3', 45, 63, '#ea580c', '#ffffff', 420000, 160000, 130000, 'استاد المنصورة الرياضي', 18000, 3),
  createClub('eg3_olympi', 'النادي الأولمبي السكندري', 'الأولمبي', 'الإسكندرية', 'مصر', 'EGY', 3, 'egy_tier_3', 46, 64, '#dc2626', '#ffffff', 450000, 175000, 135000, 'استاد عز الدين يعقوب', 12000, 3),
  createClub('eg3_nasr', 'نادي النصر القاهري', 'النصر', 'القاهرة', 'مصر', 'EGY', 3, 'egy_tier_3', 44, 62, '#dc2626', '#2563eb', 400000, 150000, 125000, 'ملعب نادي النصر بمصر الجديدة', 8000, 3),
  createClub('eg3_dikernis', 'نادي دكرنس الرياضي', 'دكرنس', 'الدقهلية', 'مصر', 'EGY', 3, 'egy_tier_3', 40, 60, '#059669', '#ffffff', 350000, 130000, 120000, 'ملعب نادي دكرنس', 4000, 2),
  createClub('eg3_bns', 'نادي بني سويف', 'بني سويف', 'بني سويف', 'مصر', 'EGY', 3, 'egy_tier_3', 38, 58, '#2563eb', '#ffffff', 280000, 100000, 95000, 'استاد بني سويف الرياضي', 4500, 2),
  createClub('eg3_petrol', 'بترول أسيوط', 'بترول أسيوط', 'أسيوط', 'مصر', 'EGY', 3, 'egy_tier_3', 42, 61, '#0284c7', '#f59e0b', 390000, 145000, 118000, 'استاد بترول أسيوط', 5500, 2),
  createClub('eg3_kafr_elshikh', 'نادي كفر الشيخ', 'كفر الشيخ', 'كفر الشيخ', 'مصر', 'EGY', 3, 'egy_tier_3', 41, 60, '#059669', '#eab308', 360000, 135000, 112000, 'استاد كفر الشيخ الرياضي', 10000, 3),
  createClub('eg3_almasry_saloom', 'المصري بالسلوم', 'السلوم', 'مطروح', 'مصر', 'EGY', 3, 'egy_tier_3', 36, 56, '#2563eb', '#ffffff', 260000, 95000, 88000, 'ملعب مطروح', 4000, 2),
  createClub('eg3_almerrikh', 'نادي المريخ البورسعيدي', 'المريخ', 'بورسعيد', 'مصر', 'EGY', 3, 'egy_tier_3', 43, 62, '#dc2626', '#ffffff', 380000, 140000, 115000, 'استاد المريخ ببورسعيد', 9000, 3),
  createClub('eg3_portfouad', 'نادي بورفؤاد الرياضي', 'بورفؤاد', 'بورسعيد', 'مصر', 'EGY', 3, 'egy_tier_3', 39, 58, '#0284c7', '#ffffff', 310000, 115000, 98000, 'ملعب نادي بورفؤاد', 5000, 2),
  createClub('eg3_makadi', 'نادي مكادي إف سي', 'مكادي', 'البحر الأحمر', 'مصر', 'EGY', 3, 'egy_tier_3', 37, 57, '#eab308', '#000000', 300000, 110000, 92000, 'ملعب خالد بشارة بالجونة', 6000, 2),
  createClub('eg3_pioneer', 'بايونيرز إف سي', 'بايونيرز', 'الدقهلية', 'مصر', 'EGY', 3, 'egy_tier_3', 38, 58, '#7c3aed', '#ffffff', 320000, 120000, 99000, 'ملعب شربين', 4500, 2),
  createClub('eg3_cascada', 'نادي كاسكادا الرياضي', 'كاسكادا', 'الجيزة', 'مصر', 'EGY', 3, 'egy_tier_3', 35, 56, '#ea580c', '#ffffff', 270000, 100000, 89000, 'ملعب كاسكادا بالجيزة', 3500, 2),
  createClub('eg3_aloegypt', 'ألو إيجيبت', 'ألو إيجيبت', 'القاهرة', 'مصر', 'EGY', 3, 'egy_tier_3', 36, 57, '#0284c7', '#dc2626', 290000, 105000, 91000, 'استاد السلام الفرعي', 4000, 2),
  createClub('eg3_tut', 'توت عنخ آمون إف سي', 'توت عنخ آمون', 'بني سويف', 'مصر', 'EGY', 3, 'egy_tier_3', 37, 58, '#eab308', '#000000', 330000, 125000, 96000, 'ملعب الأسيوطي سبورت', 4000, 2),
  createClub('eg3_nasser_fikria', 'ناصر الفكرية', 'الفكرية', 'المنيا', 'مصر', 'EGY', 3, 'egy_tier_3', 35, 56, '#15803d', '#ffffff', 260000, 95000, 87000, 'استاد المنيا الرياضي', 6000, 2),
  createClub('eg3_shubra', 'نادي بهتيم الرياضي', 'بهتيم', 'القليوبية', 'مصر', 'EGY', 3, 'egy_tier_3', 38, 59, '#2563eb', '#ffffff', 310000, 110000, 95000, 'ملعب بهتيم بشبرا الخيمة', 5000, 2),
  createClub('eg3_belkas', 'نادي بلقاس الرياضي', 'بلقاس', 'الدقهلية', 'مصر', 'EGY', 3, 'egy_tier_3', 39, 60, '#15803d', '#ffffff', 320000, 115000, 97000, 'ملعب نادي بلقاس', 4500, 2),
  createClub('eg3_maleyat_kafr', 'نادي مالية كفر الزيات', 'المالية', 'الغربية', 'مصر', 'EGY', 3, 'egy_tier_3', 42, 61, '#dc2626', '#eab308', 370000, 135000, 110000, 'استاد مالية كفر الزيات', 6000, 2),
  createClub('eg3_qous', 'نادي قوص الرياضي', 'قوص', 'قنا', 'مصر', 'EGY', 3, 'egy_tier_3', 36, 57, '#0284c7', '#ffffff', 280000, 100000, 90000, 'ملعب قوص الرياضي بقنا', 4000, 2),
];

export const EGYPT_TIER_2_TEAMS = EGYPT_TIER_2_CLUBS;
export const EGYPT_TIER_1_TEAMS = EGYPT_PREMIER_CLUBS;

// ----------------------------------------------------
// 2. SAUDI ARABIAN LEAGUES
// ----------------------------------------------------
export const SAUDI_TIER_1_TEAMS = SAUDI_PRO_CLUBS;
export const SAUDI_TIER_2_TEAMS = SAUDI_TIER_2_CLUBS;

// ----------------------------------------------------
// 3. UAE & QATAR
// ----------------------------------------------------
export const UAE_TIER_1_TEAMS = UAE_PRO_CLUBS;
export const QATAR_TIER_1_TEAMS = QATAR_STARS_CLUBS;

// ----------------------------------------------------
// 4. NORTH AFRICA
// ----------------------------------------------------
export const MOROCCO_TIER_1_TEAMS = MOROCCO_BOTOLA_CLUBS;
export const TUNISIA_TIER_1_TEAMS = TUNISIA_LIGUE_CLUBS;
export const ALGERIA_TIER_1_TEAMS = ALGERIA_LIGUE_CLUBS;

// ----------------------------------------------------
// 5. EUROPEAN LEAGUES
// ----------------------------------------------------
export const SPAIN_TIER_1_TEAMS = SPAIN_LA_LIGA_CLUBS;
export const SPAIN_TIER_2_TEAMS = SPAIN_LA_LIGA_2_CLUBS;
export const ENGLAND_TIER_1_TEAMS = ENGLAND_PREMIER_CLUBS;
export const ENGLAND_TIER_2_TEAMS = ENGLAND_CHAMPIONSHIP_CLUBS;
export const FRANCE_TIER_1_TEAMS = FRANCE_LIGUE_1_CLUBS;
export const ITALY_TIER_1_TEAMS = ITALY_SERIE_A_CLUBS;
export const GERMANY_TIER_1_TEAMS = GERMANY_BUNDESLIGA_CLUBS;

// ----------------------------------------------------
// 6. SOUTH AMERICA
// ----------------------------------------------------
export const BRAZIL_TIER_1_TEAMS = BRAZIL_SERIE_A_CLUBS;
export const ARGENTINA_TIER_1_TEAMS = ARGENTINA_PRIMERA_CLUBS;

// ----------------------------------------------------
// COMPLETE GLOBAL LEAGUES DICTIONARY
// ----------------------------------------------------

export const GLOBAL_LEAGUES: Record<string, LeagueDefinition> = {
  // Egypt (4 tiers)
  'egy_tier_4': EGYPT_TIER_4_LEAGUE,
  'egy_tier_3': { id: 'egy_tier_3', name: 'دوري الدرجة الثالثة المصري', shortName: 'الدرجة الثالثة', country: 'مصر', tier: 3, reputation: 35, promotionSpots: 2, relegationSpots: 1, playoffSpots: 0, teams: EGYPT_TIER_3_TEAMS },
  'egy_tier_2': { id: 'egy_tier_2', name: 'دوري المحترفين المصري (الدرجة الثانية)', shortName: 'المحترفين (ب)', country: 'مصر', tier: 2, reputation: 55, promotionSpots: 2, relegationSpots: 1, playoffSpots: 0, teams: EGYPT_TIER_2_TEAMS },
  'egy_tier_1': { id: 'egy_tier_1', name: 'الدوري المصري الممتاز', shortName: 'الممتاز المصري', country: 'مصر', tier: 1, reputation: 80, promotionSpots: 0, relegationSpots: 2, playoffSpots: 0, teams: EGYPT_TIER_1_TEAMS },

  // Saudi Arabia (2 tiers)
  'sau_tier_1': { id: 'sau_tier_1', name: 'دوري روشن السعودي للمحترفين', shortName: 'دوري روشن', country: 'المملكة العربية السعودية', tier: 1, reputation: 88, promotionSpots: 0, relegationSpots: 2, playoffSpots: 0, teams: SAUDI_TIER_1_TEAMS },
  'sau_tier_2': { id: 'sau_tier_2', name: 'دوري يلو السعودي للدرجة الأولى', shortName: 'دوري يلو', country: 'المملكة العربية السعودية', tier: 2, reputation: 65, promotionSpots: 2, relegationSpots: 1, playoffSpots: 0, teams: SAUDI_TIER_2_TEAMS },

  // UAE & Qatar
  'uae_tier_1': { id: 'uae_tier_1', name: 'دوري أدنوك للمحترفين الإماراتي', shortName: 'دوري أدنوك', country: 'الإمارات العربية المتحدة', tier: 1, reputation: 82, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: UAE_TIER_1_TEAMS },
  'qat_tier_1': { id: 'qat_tier_1', name: 'دوري نجوم قطر (إكسبو)', shortName: 'دوري نجوم قطر', country: 'قطر', tier: 1, reputation: 83, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: QATAR_TIER_1_TEAMS },

  // North Africa
  'mar_tier_1': { id: 'mar_tier_1', name: 'البطولة الوطنية المغربية الاحترافية (إنوي)', shortName: 'البطولة المغربية', country: 'المغرب', tier: 1, reputation: 84, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: MOROCCO_TIER_1_TEAMS },
  'tun_tier_1': { id: 'tun_tier_1', name: 'الرابطة المحترفة التونسية الأولى لكرة القدم', shortName: 'الرابطة الأولى', country: 'تونس', tier: 1, reputation: 81, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: TUNISIA_TIER_1_TEAMS },
  'alg_tier_1': { id: 'alg_tier_1', name: 'الرابطة الجزائرية المحترفة الأولى موبيليس', shortName: 'الرابطة الجزائرية', country: 'الجزائر', tier: 1, reputation: 82, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: ALGERIA_TIER_1_TEAMS },

  // Europe (Spain 2 tiers, England 2 tiers, France, Italy, Germany)
  'esp_tier_1': { id: 'esp_tier_1', name: 'الدوري الإسباني الدرجة الأولى (لا ليغا)', shortName: 'لا ليغا', country: 'إسبانيا', tier: 1, reputation: 95, promotionSpots: 0, relegationSpots: 2, playoffSpots: 0, teams: SPAIN_TIER_1_TEAMS },
  'esp_tier_2': { id: 'esp_tier_2', name: 'الدوري الإسباني الدرجة الثانية (لا ليغا هايبرموشن)', shortName: 'لا ليغا 2', country: 'إسبانيا', tier: 2, reputation: 75, promotionSpots: 2, relegationSpots: 1, playoffSpots: 0, teams: SPAIN_TIER_2_TEAMS },

  'eng_tier_1': { id: 'eng_tier_1', name: 'الدوري الإنجليزي الممتاز (البريميرليغ)', shortName: 'البريميرليغ', country: 'إنجلترا', tier: 1, reputation: 97, promotionSpots: 0, relegationSpots: 2, playoffSpots: 0, teams: ENGLAND_TIER_1_TEAMS },
  'eng_tier_2': { id: 'eng_tier_2', name: 'دوري البطولة الإنجليزية (التشامبيونشيب)', shortName: 'التشامبيونشيب', country: 'إنجلترا', tier: 2, reputation: 78, promotionSpots: 2, relegationSpots: 1, playoffSpots: 0, teams: ENGLAND_TIER_2_TEAMS },

  'fra_tier_1': { id: 'fra_tier_1', name: 'الدوري الفرنسي الدرجة الأولى (ليغ 1 ماكدونالدز)', shortName: 'ليغ 1', country: 'فرنسا', tier: 1, reputation: 89, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: FRANCE_TIER_1_TEAMS },
  'ita_tier_1': { id: 'ita_tier_1', name: 'الدوري الإيطالي الدرجة الأولى (سيريا أ)', shortName: 'سيريا أ', country: 'إيطاليا', tier: 1, reputation: 92, promotionSpots: 0, relegationSpots: 2, playoffSpots: 0, teams: ITALY_TIER_1_TEAMS },
  'ger_tier_1': { id: 'ger_tier_1', name: 'الدوري الألماني الدرجة الأولى (البوندسليغا)', shortName: 'البوندسليغا', country: 'ألمانيا', tier: 1, reputation: 93, promotionSpots: 0, relegationSpots: 2, playoffSpots: 0, teams: GERMANY_TIER_1_TEAMS },

  // South America
  'bra_tier_1': { id: 'bra_tier_1', name: 'الدوري البرازيلي الدرجة الأولى (البرازيليرو)', shortName: 'البرازيليرو', country: 'البرازيل', tier: 1, reputation: 85, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: BRAZIL_TIER_1_TEAMS },
  'arg_tier_1': { id: 'arg_tier_1', name: 'الدوري الأرجنتيني الممتاز (بريميرا ديفيزيون)', shortName: 'الدوري الأرجنتيني', country: 'الأرجنتين', tier: 1, reputation: 84, promotionSpots: 0, relegationSpots: 1, playoffSpots: 0, teams: ARGENTINA_TIER_1_TEAMS },
};

export const LEAGUES_STORAGE_KEY = 'antaelmodareb_persistent_leagues_v1';

export function getCustomLeagues(): Record<string, LeagueDefinition> {
  if (typeof window === 'undefined') return GLOBAL_LEAGUES;
  try {
    const raw = localStorage.getItem(LEAGUES_STORAGE_KEY);
    if (!raw) return GLOBAL_LEAGUES;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...GLOBAL_LEAGUES, ...parsed };
    }
    return GLOBAL_LEAGUES;
  } catch {
    return GLOBAL_LEAGUES;
  }
}

export function saveCustomLeagues(leagues: Record<string, LeagueDefinition>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEAGUES_STORAGE_KEY, JSON.stringify(leagues));
  } catch (e) {
    console.error('Failed to save custom leagues', e);
  }
}

export function updateLeagueRosterInWorld(leagueId: string, updatedTeams: Club[]): void {
  const currentLeagues = getCustomLeagues();
  const targetLeague = currentLeagues[leagueId] || GLOBAL_LEAGUES[leagueId];
  if (!targetLeague) return;

  const updated: LeagueDefinition = {
    ...targetLeague,
    teams: updatedTeams,
  };

  currentLeagues[leagueId] = updated;
  saveCustomLeagues(currentLeagues);
}

export function getLeagueById(leagueId: string): LeagueDefinition {
  const custom = getCustomLeagues();
  return custom[leagueId] || GLOBAL_LEAGUES[leagueId] || EGYPT_TIER_4_LEAGUE;
}

export function getLeagueByCountryAndTier(country: string, tier: number): LeagueDefinition {
  const custom = getCustomLeagues();
  const safeCountry = (country || '').trim();

  // 1. Direct match by country and tier
  if (safeCountry) {
    for (const league of Object.values(custom)) {
      const leagueCountry = (league.country || '').trim();
      if ((leagueCountry === safeCountry || safeCountry.includes(leagueCountry) || leagueCountry.includes(safeCountry)) && league.tier === tier) {
        return league;
      }
    }

    // 2. If tier not found for that country, try finding closest tier in that country
    const countryLeagues = Object.values(custom).filter(league => {
      const leagueCountry = (league.country || '').trim();
      return leagueCountry === safeCountry || safeCountry.includes(leagueCountry) || leagueCountry.includes(safeCountry);
    });
    if (countryLeagues.length > 0) {
      countryLeagues.sort((a, b) => Math.abs(a.tier - tier) - Math.abs(b.tier - tier));
      return countryLeagues[0];
    }
  }

  // 3. Fallback search by ID pattern
  if (!safeCountry || safeCountry === 'مصر' || safeCountry.includes('مصر')) {
    const id = `egy_tier_${tier}`;
    if (custom[id]) return custom[id];
  }
  return custom['egy_tier_1'] || EGYPT_TIER_4_LEAGUE;
}

export function getAllClubsForCountry(country: string): Club[] {
  const custom = getCustomLeagues();
  const clubsMap = new Map<string, Club>();
  
  // Static registry fallback for Egypt and all major nations
  if (country === 'مصر' || country.includes('مصر')) {
    EGYPT_PREMIER_CLUBS.forEach(t => clubsMap.set(t.id, t));
    EGYPT_TIER_2_CLUBS.forEach(t => clubsMap.set(t.id, t));
    EGYPT_TIER_3_TEAMS.forEach(t => clubsMap.set(t.id, t));
    INITIAL_TEAMS.forEach(t => clubsMap.set(t.id, t));
  } else if (country === 'المملكة العربية السعودية' || country.includes('السعودية')) {
    SAUDI_PRO_CLUBS.forEach(t => clubsMap.set(t.id, t));
    SAUDI_TIER_2_CLUBS.forEach(t => clubsMap.set(t.id, t));
  } else if (country === 'إسبانيا' || country.includes('إسبانيا')) {
    SPAIN_LA_LIGA_CLUBS.forEach(t => clubsMap.set(t.id, t));
    SPAIN_LA_LIGA_2_CLUBS.forEach(t => clubsMap.set(t.id, t));
  } else if (country === 'إنجلترا' || country.includes('إنجلترا')) {
    ENGLAND_PREMIER_CLUBS.forEach(t => clubsMap.set(t.id, t));
    ENGLAND_CHAMPIONSHIP_CLUBS.forEach(t => clubsMap.set(t.id, t));
  }

  // Merge with custom persistent state
  Object.values(custom).forEach(league => {
    const leagueCountry = league.country || '';
    if (
      leagueCountry === country || 
      country.includes(leagueCountry) || 
      leagueCountry.includes(country) ||
      (country === 'مصر' && (league.id.startsWith('egy_') || leagueCountry.includes('مصر')))
    ) {
      league.teams.forEach(t => {
        clubsMap.set(t.id, t);
      });
    }
  });

  return Array.from(clubsMap.values());
}

export function findClubInWorld(clubId: string): Club | undefined {
  if (!clubId) return undefined;

  // 1. Check custom active leagues
  const custom = getCustomLeagues();
  for (const league of Object.values(custom)) {
    const match = league.teams.find(t => t.id === clubId);
    if (match) return match;
  }

  // 2. Check static default global leagues
  for (const league of Object.values(GLOBAL_LEAGUES)) {
    const match = league.teams.find(t => t.id === clubId);
    if (match) return match;
  }

  // 3. Check all raw club lists directly
  const allStaticClubs: Club[] = [
    ...EGYPT_PREMIER_CLUBS,
    ...EGYPT_TIER_2_CLUBS,
    ...EGYPT_TIER_3_TEAMS,
    ...INITIAL_TEAMS,
    ...SAUDI_PRO_CLUBS,
    ...SAUDI_TIER_2_CLUBS,
    ...UAE_PRO_CLUBS,
    ...QATAR_STARS_CLUBS,
    ...MOROCCO_BOTOLA_CLUBS,
    ...TUNISIA_LIGUE_CLUBS,
    ...ALGERIA_LIGUE_CLUBS,
    ...SPAIN_LA_LIGA_CLUBS,
    ...SPAIN_LA_LIGA_2_CLUBS,
    ...ENGLAND_PREMIER_CLUBS,
    ...ENGLAND_CHAMPIONSHIP_CLUBS,
    ...FRANCE_LIGUE_1_CLUBS,
    ...ITALY_SERIE_A_CLUBS,
    ...GERMANY_BUNDESLIGA_CLUBS,
    ...BRAZIL_SERIE_A_CLUBS,
    ...ARGENTINA_PRIMERA_CLUBS,
  ];

  const direct = allStaticClubs.find(c => c.id === clubId);
  if (direct) return direct;

  return undefined;
}

// =========================================================================
// COMPREHENSIVE ARABIC CLUB NAMES DICTIONARY & FALLBACK RESOLVER
// =========================================================================
export const ARABIC_CLUB_NAMES_MAP: Record<string, { name: string; shortName: string; city: string; country: string }> = {
  // Egypt Premier League (Tier 1)
  'eg1_ahly': { name: 'النادي الأهلي المصري', shortName: 'الأهلي', city: 'القاهرة', country: 'مصر' },
  'eg1_zamalek': { name: 'نادي الزمالك للألعاب الرياضية', shortName: 'الزمالك', city: 'الجيزة', country: 'مصر' },
  'eg1_pyramids': { name: 'نادي بيراميدز إف سي', shortName: 'بيراميدز', city: 'القاهرة', country: 'مصر' },
  'eg1_masry': { name: 'النادي المصري البورسعيدي', shortName: 'المصري', city: 'بورسعيد', country: 'مصر' },
  'eg1_ittihad': { name: 'الاتحاد السكندري سيد البلد', shortName: 'الاتحاد', city: 'الإسكندرية', country: 'مصر' },
  'eg1_smouha': { name: 'نادي سموحة الرياضي', shortName: 'سموحة', city: 'الإسكندرية', country: 'مصر' },
  'eg1_ceramica': { name: 'سيراميكا كليوباترا', shortName: 'سيراميكا', city: 'الجيزة', country: 'مصر' },
  'eg1_zed': { name: 'زد إف سي', shortName: 'زد', city: 'القاهرة', country: 'مصر' },
  'eg1_enppi': { name: 'نادي إنبي الرياضي', shortName: 'إنبي', city: 'القاهرة', country: 'مصر' },
  'eg1_talaea': { name: 'طلائع الجيش', shortName: 'الطلائع', city: 'القاهرة', country: 'مصر' },
  'eg1_bankahly': { name: 'البنك الأهلي المصري', shortName: 'البنك الأهلي', city: 'القاهرة', country: 'مصر' },
  'eg1_ismaily': { name: 'نادي الإسماعيلي برازيل العرب', shortName: 'الإسماعيلي', city: 'الإسماعيلية', country: 'مصر' },
  'eg1_gouna': { name: 'نادي الجونة', shortName: 'الجونة', city: 'الجونة', country: 'مصر' },
  'eg1_pharco': { name: 'نادي فاركو للأدوية', shortName: 'فاركو', city: 'الإسكندرية', country: 'مصر' },
  'eg1_modern': { name: 'مودرن سبورت', shortName: 'مودرن سبورت', city: 'القاهرة', country: 'مصر' },
  'eg1_petrojet': { name: 'نادي بتروجيت الرياضي', shortName: 'بتروجيت', city: 'السويس', country: 'مصر' },
  'eg1_mahalla': { name: 'غزل المحلة زعيم الفلاحين', shortName: 'المحلة', city: 'الغربية', country: 'مصر' },
  'eg1_haras': { name: 'حرس الحدود', shortName: 'حرس الحدود', city: 'الإسكندرية', country: 'مصر' },

  // Egypt Second Division (Tier 2)
  'eg2_arabcont': { name: 'المقاولون العرب ذئاب الجبل', shortName: 'المقاولون', city: 'القاهرة', country: 'مصر' },
  'eg2_dakhleya': { name: 'نادي الداخلية الرياضي', shortName: 'الداخلية', city: 'القاهرة', country: 'مصر' },
  'eg2_baladiyat': { name: 'بلدية المحلة الكبرى', shortName: 'البلدية', city: 'الغربية', country: 'مصر' },
  'eg2_qanah': { name: 'نادي القناة الرياضي', shortName: 'القناة', city: 'الإسماعيلية', country: 'مصر' },
  'eg2_degla': { name: 'وادي دجلة إف سي', shortName: 'وادي دجلة', city: 'القاهرة', country: 'مصر' },
  'eg2_tanta': { name: 'نادي طنطا أبناء السيد البدوي', shortName: 'طنطا', city: 'الغربية', country: 'مصر' },
  'eg2_laviena': { name: 'لافيينا إف سي', shortName: 'لافيينا', city: 'بني سويف', country: 'مصر' },
  'eg2_aswan': { name: 'نادي أسوان زهرة الجنوب', shortName: 'أسوان', city: 'أسوان', country: 'مصر' },
  'eg2_telecom': { name: 'المصرية للاتصالات (وي)', shortName: 'وي', city: 'القاهرة', country: 'مصر' },
  'eg2_proxy': { name: 'بروكسي إف سي', shortName: 'بروكسي', city: 'البحيرة', country: 'مصر' },
  'eg2_sekkahadid': { name: 'نادي السكة الحديد أقدم أندية مصر', shortName: 'السكة الحديد', city: 'القاهرة', country: 'مصر' },
  'eg2_raya': { name: 'راية الرياضي بكفر الدوار', shortName: 'راية', city: 'كفر الشيخ', country: 'مصر' },
  'eg2_dayrout': { name: 'ديروط الرياضي', shortName: 'ديروط', city: 'أسيوط', country: 'مصر' },
  'eg2_kahraba': { name: 'كهرباء الإسماعيلية', shortName: 'الكهرباء', city: 'الإسماعيلية', country: 'مصر' },
  'eg2_tersana': { name: 'نادي الترسانة الشواكيش العريق', shortName: 'الترسانة', city: 'الجيزة', country: 'مصر' },
  'eg2_suez': { name: 'منتخب السويس الغريب', shortName: 'السويس', city: 'السويس', country: 'مصر' },
  'eg2_shebin': { name: 'جمهورية شبين الكوم', shortName: 'شبين', city: 'المنوفية', country: 'مصر' },
  'eg2_asment': { name: 'أسمنت أسيوط الرياضي', shortName: 'أسمنت أسيوط', city: 'أسيوط', country: 'مصر' },

  // Egypt Third Division (Tier 3)
  'eg3_mansoura': { name: 'نادي المنصورة الرياضي العريق', shortName: 'المنصورة', city: 'الدقهلية', country: 'مصر' },
  'eg3_olympi': { name: 'النادي الأولمبي السكندري العريق', shortName: 'الأولمبي', city: 'الإسكندرية', country: 'مصر' },
  'eg3_nasr': { name: 'نادي النصر القاهري بمصر الجديدة', shortName: 'النصر', city: 'القاهرة', country: 'مصر' },
  'eg3_dikernis': { name: 'نادي دكرنس الرياضي', shortName: 'دكرنس', city: 'الدقهلية', country: 'مصر' },
  'eg3_bns': { name: 'نادي بني سويف الرياضي', shortName: 'بني سويف', city: 'بني سويف', country: 'مصر' },
  'eg3_petrol': { name: 'بترول أسيوط الرياضي', shortName: 'بترول أسيوط', city: 'أسيوط', country: 'مصر' },
  'eg3_kafr_elshikh': { name: 'نادي كفر الشيخ الرياضي', shortName: 'كفر الشيخ', city: 'كفر الشيخ', country: 'مصر' },
  'eg3_almasry_saloom': { name: 'المصري بالسلوم', shortName: 'السلوم', city: 'مطروح', country: 'مصر' },
  'eg3_almerrikh': { name: 'نادي المريخ البورسعيدي', shortName: 'المريخ', city: 'بورسعيد', country: 'مصر' },
  'eg3_portfouad': { name: 'نادي بورفؤاد الرياضي', shortName: 'بورفؤاد', city: 'بورسعيد', country: 'مصر' },
  'eg3_makadi': { name: 'نادي مكادي إف سي', shortName: 'مكادي', city: 'البحر الأحمر', country: 'مصر' },
  'eg3_pioneer': { name: 'بايونيرز إف سي', shortName: 'بايونيرز', city: 'الدقهلية', country: 'مصر' },
  'eg3_cascada': { name: 'نادي كاسكادا الرياضي', shortName: 'كاسكادا', city: 'الجيزة', country: 'مصر' },
  'eg3_aloegypt': { name: 'ألو إيجيبت سبورت', shortName: 'ألو إيجيبت', city: 'القاهرة', country: 'مصر' },
  'eg3_tut': { name: 'توت عنخ آمون إف سي', shortName: 'توت عنخ آمون', city: 'بني سويف', country: 'مصر' },
  'eg3_nasser_fikria': { name: 'ناصر الفكرية بالمنيا', shortName: 'الفكرية', city: 'المنيا', country: 'مصر' },
  'eg3_shubra': { name: 'نادي بهتيم الرياضي', shortName: 'بهتيم', city: 'القليوبية', country: 'مصر' },
  'eg3_belkas': { name: 'نادي بلقاس الرياضي', shortName: 'بلقاس', city: 'الدقهلية', country: 'مصر' },
  'eg3_maleyat_kafr': { name: 'نادي مالية كفر الزيات', shortName: 'المالية', city: 'الغربية', country: 'مصر' },
  'eg3_qous': { name: 'نادي قوص الرياضي', shortName: 'قوص', city: 'قنا', country: 'مصر' },

  // Egypt Fourth Division (Tier 4)
  'team_1': { name: 'كفر ميت عقبة الرياضي', shortName: 'ميت عقبة', city: 'الجيزة', country: 'مصر' },
  'team_2': { name: 'عمال حلوان الرياضي', shortName: 'عمال حلوان', city: 'حلوان', country: 'مصر' },
  'team_3': { name: 'مركز شباب طموه', shortName: 'طموه', city: 'الجيزة', country: 'مصر' },
  'team_4': { name: 'اتحاد قليوب القومي', shortName: 'قليوب', city: 'القليوبية', country: 'مصر' },
  'team_5': { name: 'نادي نماء بلبيس', shortName: 'بلبيس', city: 'الشرقية', country: 'مصر' },
  'team_6': { name: 'كهرباء دسوق الرياضي', shortName: 'كهرباء دسوق', city: 'كفر الشيخ', country: 'مصر' },
  'team_7': { name: 'شروق القناطر الخيرية', shortName: 'شروق القناطر', city: 'القليوبية', country: 'مصر' },
  'team_8': { name: 'نادي أمل ميت غمر', shortName: 'ميت غمر', city: 'الدقهلية', country: 'مصر' },
  'team_9': { name: 'نادي جولدي الرياضي', shortName: 'جولدي', city: 'الجيزة', country: 'مصر' },
  'team_10': { name: 'مركز شباب الحوامدية', shortName: 'الحوامدية', city: 'الجيزة', country: 'مصر' },
  'team_11': { name: 'نادي رأس البر الرياضي', shortName: 'رأس البر', city: 'دمياط', country: 'مصر' },
  'team_12': { name: 'صيد المحلة الكبرى', shortName: 'صيد المحلة', city: 'الغربية', country: 'مصر' },
  'team_13': { name: 'نادي الشمس الفاقوسي', shortName: 'فاقوس', city: 'الشرقية', country: 'مصر' },
  'team_14': { name: 'مركز شباب سمسطا', shortName: 'سمسطا', city: 'بني سويف', country: 'مصر' },
  'team_15': { name: 'نادي أهلي الغرق بالفيوم', shortName: 'أهلي الغرق', city: 'الفيوم', country: 'مصر' },
  'team_16': { name: 'نادي بيلا الرياضي', shortName: 'بيلا', city: 'كفر الشيخ', country: 'مصر' },
  'team_17': { name: 'نادي منوف الرياضي', shortName: 'منوف', city: 'المنوفية', country: 'مصر' },
  'team_18': { name: 'نادي إسنا الرياضي', shortName: 'إسنا', city: 'الأقصر', country: 'مصر' },
  'team_19': { name: 'مركز شباب سنورس بالفيوم', shortName: 'سنورس', city: 'الفيوم', country: 'مصر' },
  'team_20': { name: 'نادي مغاغة الرياضي', shortName: 'مغاغة', city: 'المنيا', country: 'مصر' },

  // Saudi Pro League
  'sau1_hilal': { name: 'نادي الهلال الزعيم الملكي', shortName: 'الهلال', city: 'الرياض', country: 'المملكة العربية السعودية' },
  'sau1_nassr': { name: 'نادي النصر العالمي فارس نجد', shortName: 'النصر', city: 'الرياض', country: 'المملكة العربية السعودية' },
  'sau1_ittihad': { name: 'نادي الاتحاد العميد الجداوي', shortName: 'الاتحاد', city: 'جدة', country: 'المملكة العربية السعودية' },
  'sau1_ahli': { name: 'نادي الأهلي قلعة الكؤوس', shortName: 'الأهلي', city: 'جدة', country: 'المملكة العربية السعودية' },
  'sau1_qadsiah': { name: 'نادي القادسية بالخبر', shortName: 'القادسية', city: 'الخبر', country: 'المملكة العربية السعودية' },
  'sau1_shabab': { name: 'نادي الشباب الليث الأبيض', shortName: 'الشباب', city: 'الرياض', country: 'المملكة العربية السعودية' },
  'sau1_ettifaq': { name: 'نادي الاتفاق فارس الدهناء', shortName: 'الاتفاق', city: 'الدمام', country: 'المملكة العربية السعودية' },
  'sau1_taawoun': { name: 'نادي التعاون سكري القصيم', shortName: 'التعاون', city: 'بريدة', country: 'المملكة العربية السعودية' },
  'sau1_fateh': { name: 'نادي الفتح النموذجي', shortName: 'الفتح', city: 'الأحساء', country: 'المملكة العربية السعودية' },
  'sau1_fayha': { name: 'نادي الفيحاء البرتقالي', shortName: 'الفيحاء', city: 'المجمعة', country: 'المملكة العربية السعودية' },
  'sau1_damac': { name: 'نادي ضمك فارس الجنوب', shortName: 'ضمك', city: 'خميس مشيط', country: 'المملكة العربية السعودية' },
  'sau1_khaleej': { name: 'نادي الخليج الدانة', shortName: 'الخليج', city: 'سيهات', country: 'المملكة العربية السعودية' },
  'sau1_wehda': { name: 'نادي الوحدة فرسان مكة', shortName: 'الوحدة', city: 'مكة المكرمة', country: 'المملكة العربية السعودية' },
  'sau1_raed': { name: 'نادي الرائد رائد التحدي', shortName: 'الرائد', city: 'بريدة', country: 'المملكة العربية السعودية' },
  'sau1_riyadh': { name: 'نادي الرياض مدرسة الوسطى', shortName: 'الرياض', city: 'الرياض', country: 'المملكة العربية السعودية' },
  'sau1_okhdood': { name: 'نادي الأخدود بنجران', shortName: 'الأخدود', city: 'نجران', country: 'المملكة العربية السعودية' },
  'sau1_orobah': { name: 'نادي العروبة بسكاكا', shortName: 'العروبة', city: 'سكاكا', country: 'المملكة العربية السعودية' },
  'sau1_kholood': { name: 'نادي الخلود فخر الرس', shortName: 'الخلود', city: 'الرس', country: 'المملكة العربية السعودية' },
};

/**
 * Universal Arabic Club Name Helper
 * Guaranteed to return a valid, polished Arabic display name for any club ID
 */
export function getArabicClubNameFallback(clubId: string): string {
  if (!clubId) return 'فريق منافس';
  
  if (ARABIC_CLUB_NAMES_MAP[clubId]) {
    return ARABIC_CLUB_NAMES_MAP[clubId].name;
  }

  const resolved = findClubInWorld(clubId);
  if (resolved && resolved.name) {
    return resolved.name;
  }

  return clubId;
}

/**
 * Universal Club Display Name Helper
 */
export function getClubDisplayName(clubId: string, customTeams?: Club[]): string {
  if (!clubId) return 'فريق غير محدد';
  if (customTeams && customTeams.length > 0) {
    const found = customTeams.find(t => t.id === clubId);
    if (found?.name) return found.name;
  }
  const worldClub = findClubInWorld(clubId);
  if (worldClub?.name) return worldClub.name;
  return getArabicClubNameFallback(clubId);
}

