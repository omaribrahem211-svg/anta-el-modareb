import { Club, Player } from '../types/game';
import { repairSavedClubSquad } from './savedSquadRepair';
import { GLOBAL_COUNTRIES } from '../data/countriesData';

export const MIGRATION_STORAGE_KEY = 'anta_el_modareb_world_migration_v4';

export interface MigrationResult {
  migrated: boolean;
  userClubPreserved: boolean;
  clubsMigratedCount: number;
  playersMigratedCount: number;
  realClubSquadsAssigned: number;
  internationalClubsRegenerated: number;
  teams: Club[];
  transferMarket: Player[];
}

/**
 * Infers the authentic country code and name for any club based on its ID and naming.
 */
export function inferClubCountry(club: Partial<Club>): { countryCode: string; countryName: string } {
  const id = (club.id || '').toLowerCase();
  const name = club.name || '';
  const shortName = club.shortName || '';
  const text = `${id} ${name} ${shortName}`;
  if (id.startsWith('mls_') || club.leagueId === 'usa_tier_1') {
    const canadian = club.countryCode === 'CAN' || ['mls_cf_montreal', 'mls_toronto_fc', 'mls_vancouver_whitecaps_fc'].includes(id);
    return canadian ? { countryCode: 'CAN', countryName: 'كندا' } : { countryCode: 'USA', countryName: 'الولايات المتحدة' };
  }

  if (id.startsWith('sdn') || text.includes('سودان')) {
    return { countryCode: 'SDN', countryName: 'السودان' };
  }
  if (id.startsWith('lby') || text.includes('ليبيا')) {
    return { countryCode: 'LBY', countryName: 'ليبيا' };
  }
  if (id.startsWith('jor') || text.includes('الأردن')) {
    return { countryCode: 'JOR', countryName: 'الأردن' };
  }
  if (id.startsWith('esp') || text.includes('مدريد') || text.includes('بلوغرانا') || text.includes('برشلونة') || text.includes('إسباني') || text.includes('فالنسيا') || text.includes('إشبيلية') || text.includes('بيلباو') || text.includes('بيتيس') || text.includes('خيخون') || text.includes('سرقسطة')) {
    return { countryCode: 'ESP', countryName: 'إسبانيا' };
  }
  if (id.startsWith('sau') || text.includes('الهلال') || text.includes('النصر') || text.includes('الاتحاد') || text.includes('الأهلي السعودي') || text.includes('الشباب') || text.includes('الاتفاق') || text.includes('التعاون') || text.includes('الفتح') || text.includes('القادسية') || text.includes('سعودي')) {
    return { countryCode: 'SAU', countryName: 'المملكة العربية السعودية' };
  }
  if (id.startsWith('eng') || text.includes('مانشستر') || text.includes('ليفربول') || text.includes('أرسنال') || text.includes('تشيلسي') || text.includes('توتنهام') || text.includes('نيوكاسل') || text.includes('أستون فيلا') || text.includes('لندن') || text.includes('إنجل')) {
    return { countryCode: 'ENG', countryName: 'إنجلترا' };
  }
  if (id.startsWith('fra') || text.includes('باريس') || text.includes('مرسيليا') || text.includes('ليون') || text.includes('موناكو') || text.includes('ليل') || text.includes('رين') || text.includes('فرنس')) {
    return { countryCode: 'FRA', countryName: 'فرنسا' };
  }
  if (id.startsWith('ita') || text.includes('إنتر') || text.includes('ميلان') || text.includes('يوفنتوس') || text.includes('نابولي') || text.includes('روما') || text.includes('لاتسيو') || text.includes('أتالانتا') || text.includes('إيطال')) {
    return { countryCode: 'ITA', countryName: 'إيطاليا' };
  }
  if (id.startsWith('ger') || text.includes('بايرن') || text.includes('دورتموند') || text.includes('ليفركوزن') || text.includes('لايبزيغ') || text.includes('فرانكفورت') || text.includes('ألمان')) {
    return { countryCode: 'GER', countryName: 'ألمانيا' };
  }
  if (id.startsWith('uae') || text.includes('العين') || text.includes('الوصل') || text.includes('شباب الأهلي') || text.includes('الشارقة') || text.includes('الجزيرة') || text.includes('إمارات')) {
    return { countryCode: 'UAE', countryName: 'الإمارات العربية المتحدة' };
  }
  if (id.startsWith('qat') || text.includes('السد') || text.includes('الدحيل') || text.includes('الريان') || text.includes('العربي القطري') || text.includes('قطر')) {
    return { countryCode: 'QAT', countryName: 'قطر' };
  }
  if (id.startsWith('mar') || text.includes('الوداد') || text.includes('الرجاء') || text.includes('الجيش الملكي') || text.includes('بركان') || text.includes('مغرب')) {
    return { countryCode: 'MAR', countryName: 'المغرب' };
  }
  if (id.startsWith('tun') || text.includes('الترجي') || text.includes('الإفريقي') || text.includes('النجم الساحلي') || text.includes('صفاقس') || text.includes('تونس')) {
    return { countryCode: 'TUN', countryName: 'تونس' };
  }
  if (id.startsWith('alg') || text.includes('مولودية الجزائر') || text.includes('بلوزداد') || text.includes('شبيبة القبائل') || text.includes('اتحاد الجزائر') || text.includes('وفاق سطيف') || text.includes('جزائر')) {
    return { countryCode: 'ALG', countryName: 'الجزائر' };
  }
  if (id.startsWith('bra') || text.includes('فلامنغو') || text.includes('بالميراس') || text.includes('كورينثيانز') || text.includes('ساو باولو') || text.includes('سانتوس') || text.includes('برازيل')) {
    return { countryCode: 'BRA', countryName: 'البرازيل' };
  }
  if (id.startsWith('arg') || text.includes('بوكا') || text.includes('ريفر بليت') || text.includes('راسينغ') || text.includes('إنديبندينتي') || text.includes('أرجنتين')) {
    return { countryCode: 'ARG', countryName: 'الأرجنتين' };
  }

  // Default to Egypt
  return { countryCode: 'EGY', countryName: 'مصر' };
}

/**
 * Migrates and normalizes a player object, ensuring complete identity and nationality fields.
 */
export function normalizePlayer(player: Player, clubId: string, leagueId: string, defaultCountry = 'مصر', defaultCode = 'EGY'): Player {
  const nationality = player.nationality || defaultCountry;
  const nationalityCode = player.nationalityCode || defaultCode;
  const countryOfBirth = leagueId === 'usa_tier_1' ? player.countryOfBirth : player.countryOfBirth || nationality;

  return {
    ...player,
    nationality,
    nationalityCode,
    countryOfBirth,
    currentClubId: clubId,
    currentLeagueId: leagueId,
    preferredFoot: player.preferredFoot || 'right',
    personality: player.personality || 'professional',
    stats: {
      ...player.stats,
      appearances: player.stats?.appearances ?? 0,
      starts: player.stats?.starts ?? 0,
      minutes: player.stats?.minutes ?? 0,
      goals: player.stats?.goals ?? 0,
      assists: player.stats?.assists ?? 0,
      cleanSheets: player.stats?.cleanSheets ?? 0,
      yellowCards: player.stats?.yellowCards ?? 0,
      redCards: player.stats?.redCards ?? 0,
      shots: player.stats?.shots ?? 0,
      shotsOnTarget: player.stats?.shotsOnTarget ?? 0,
      passes: player.stats?.passes ?? 0,
      tackles: player.stats?.tackles ?? 0,
      saves: player.stats?.saves ?? 0,
      averageRating: player.stats?.averageRating ?? 6.5,
      motm: player.stats?.motm ?? 0,
    },
    attributes: player.attributes || { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 },
  };
}

/**
 * Upgrades saved metadata without ever replacing an evolved squad with seed data.
 * Generated ids, transfers, nationality and a small squad are valid career history.
 * Missing depth/positions are repaired additively, including for non-real clubs.
 */
export function migrateWorldData(
  savedTeams: Club[],
  savedTransferMarket: Player[] = [],
  activeLeagueId = 'egy_tier_4'
): MigrationResult {
  let clubsMigratedCount = 0;
  let playersMigratedCount = 0;
  let realClubSquadsAssigned = 0;
  let internationalClubsRegenerated = 0;
  let userClubPreserved = false;

  const validSavedTeams = (Array.isArray(savedTeams) ? savedTeams : []).filter(t => t && t.id);
  const migratedTeams: Club[] = validSavedTeams.map(club => {
    clubsMigratedCount++;
    const { countryCode, countryName } = inferClubCountry(club);
    const leagueId = club.leagueId || (countryCode === 'EGY' ? activeLeagueId : `${countryCode.toLowerCase()}_tier_${club.division || 1}`);
    const countryId = countryCode;

    // Normalizing club top-level properties
    const normalizedClub: Club = {
      ...club,
      country: club.country || countryName,
      countryId,
      countryCode,
      leagueId,
      city: club.city || (countryCode === 'ESP' ? 'مدريد' : countryCode === 'ENG' ? 'لندن' : countryCode === 'SAU' ? 'الرياض' : 'القاهرة'),
      division: club.division || 1,
      reputation: club.reputation || 50,
      budget: club.budget ?? 500000,
      transferBudget: club.transferBudget ?? 200000,
      wageBudgetMonthly: club.wageBudgetMonthly ?? 150000,
      facilities: club.facilities || {
        stadiumName: `${club.name || 'استاد النادي'}`,
        stadiumCapacity: 10000,
        stadiumLevel: 2,
        medicalCenterLevel: 2,
        trainingGroundLevel: 2,
        youthAcademyLevel: 2,
        scoutingNetworkLevel: 2,
      },
      sponsors: Array.isArray(club.sponsors) ? club.sponsors : [],
      players: [],
    };

    const existingPlayers = (Array.isArray(club.players) ? club.players : [])
      .filter(p => p && typeof p === 'object' && p.id);
    normalizedClub.players = existingPlayers.map(p => {
      playersMigratedCount++;
      return normalizePlayer(p, club.id, leagueId, countryName, countryCode);
    });
    if (club.isUserClub) userClubPreserved = true;
    const repaired = repairSavedClubSquad(normalizedClub);
    playersMigratedCount += Math.max(0, repaired.players.length - existingPlayers.length);
    return repaired;
  });

  // Migrate Transfer Market
  const migratedTransferMarket = (Array.isArray(savedTransferMarket) ? savedTransferMarket : []).map(p => {
    const pCountry = GLOBAL_COUNTRIES[p.nationalityCode || '']?.name || p.nationality || 'مصر';
    const pCode = p.nationalityCode || (p.nationality === 'إسبانيا' ? 'ESP' : p.nationality === 'المملكة العربية السعودية' ? 'SAU' : 'EGY');
    return {
      ...p,
      nationality: pCountry,
      nationalityCode: pCode,
      countryOfBirth: p.countryOfBirth || pCountry,
    };
  });

  return {
    migrated: true,
    userClubPreserved,
    clubsMigratedCount,
    playersMigratedCount,
    realClubSquadsAssigned,
    internationalClubsRegenerated,
    teams: migratedTeams,
    transferMarket: migratedTransferMarket,
  };
}

/**
 * Runs the migration once if not yet executed, updating localStorage safely.
 */
export function runOneTimeWorldMigration(
  savedTeams: Club[],
  savedTransferMarket: Player[],
  activeLeagueId = 'egy_tier_4'
): { teams: Club[]; transferMarket: Player[]; wasMigratedNow: boolean } {
  try {
    const isAlreadyMigrated = localStorage.getItem(MIGRATION_STORAGE_KEY) === 'true';

    const safeTeamsList = (Array.isArray(savedTeams) ? savedTeams : []).filter(t => t && t.id);

    // Never treat a legitimate transfer or legacy generated id as evidence to reseed.
    // Saved-load normalization repairs missing depth separately on every read.
    if (isAlreadyMigrated) {
      return { teams: safeTeamsList, transferMarket: savedTransferMarket, wasMigratedNow: false };
    }

    // Run migration
    const result = migrateWorldData(safeTeamsList, savedTransferMarket, activeLeagueId);
    
    // Set migration flag in localStorage
    localStorage.setItem(MIGRATION_STORAGE_KEY, 'true');
    console.info(
      `[World Migration v4 Completed] Migrated ${result.clubsMigratedCount} clubs, assigned ${result.realClubSquadsAssigned} real squads, ` +
      `regenerated ${result.internationalClubsRegenerated} international squads. User club preserved: ${result.userClubPreserved}`
    );

    return {
      teams: result.teams,
      transferMarket: result.transferMarket,
      wasMigratedNow: true,
    };
  } catch (err) {
    console.warn('[World Migration] Error during migration check:', err);
    return { teams: savedTeams, transferMarket: savedTransferMarket, wasMigratedNow: false };
  }
}
