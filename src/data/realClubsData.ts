import { Club, ContinentCode } from '../types/game';
import { isRealClub, loadRealClubSquad } from './realPlayersData';
import { generateClubSquad } from '../utils/playerGenerator';
import { populateClubSponsors } from '../services/sponsorshipService';

/**
 * Deterministic Continent Resolver for any Country / CountryCode / LeagueId / ClubId
 */
export function resolveCountryContinent(
  country?: string,
  countryCode?: string,
  leagueId?: string,
  clubId?: string
): ContinentCode {
  const c = String(country || '').trim();
  const code = String(countryCode || '').trim().toUpperCase();
  const lg = String(leagueId || '').trim().toLowerCase();
  const id = String(clubId || '').trim().toLowerCase();

  // 1. ASIA (Saudi Arabia, UAE, Qatar, etc.)
  if (
    code === 'SAU' ||
    code === 'KSA' ||
    code === 'UAE' ||
    code === 'QAT' ||
    code === 'JPN' ||
    code === 'KOR' ||
    lg.startsWith('sau_') ||
    lg.startsWith('sa_') ||
    lg.startsWith('uae_') ||
    lg.startsWith('qat_') ||
    id.startsWith('sau') ||
    id.startsWith('uae_') ||
    id.startsWith('qat_') ||
    c.includes('السعودية') ||
    c.includes('الإمارات') ||
    c.includes('قطر') ||
    c.toLowerCase().includes('saudi') ||
    c.toLowerCase().includes('uae') ||
    c.toLowerCase().includes('qatar')
  ) {
    return 'ASIA';
  }

  // 2. EUROPE (England, Wales, Spain, Italy, Germany, France, etc.)
  if (
    code === 'ENG' ||
    code === 'WAL' ||
    code === 'ESP' ||
    code === 'ITA' ||
    code === 'GER' ||
    code === 'FRA' ||
    code === 'POR' ||
    code === 'NED' ||
    lg.startsWith('eng_') ||
    lg.startsWith('esp_') ||
    lg.startsWith('ita_') ||
    lg.startsWith('ger_') ||
    lg.startsWith('fra_') ||
    id.startsWith('eng_') ||
    id.startsWith('en2_') ||
    id.startsWith('en3_') ||
    id.startsWith('en4_') ||
    id.startsWith('esp_') ||
    id.startsWith('es2_') ||
    id.startsWith('es3_') ||
    id.startsWith('es4_') ||
    id.startsWith('ita_') ||
    id.startsWith('it2_') ||
    id.startsWith('ger_') ||
    id.startsWith('ge2_') ||
    id.startsWith('fra_') ||
    id.startsWith('fr2_') ||
    c.includes('إنجلترا') ||
    c.includes('ويلز') ||
    c.includes('إسبانيا') ||
    c.includes('إيطاليا') ||
    c.includes('ألمانيا') ||
    c.includes('فرنسا') ||
    c.toLowerCase().includes('england') ||
    c.toLowerCase().includes('wales') ||
    c.toLowerCase().includes('spain') ||
    c.toLowerCase().includes('italy') ||
    c.toLowerCase().includes('germany') ||
    c.toLowerCase().includes('france')
  ) {
    return 'EUROPE';
  }

  // 3. SOUTH AMERICA (Brazil, Argentina, etc.)
  if (
    code === 'BRA' ||
    code === 'ARG' ||
    lg.startsWith('bra_') ||
    lg.startsWith('arg_') ||
    id.startsWith('bra_') ||
    id.startsWith('arg_') ||
    c.includes('البرازيل') ||
    c.includes('الأرجنتين') ||
    c.toLowerCase().includes('brazil') ||
    c.toLowerCase().includes('argentina')
  ) {
    return 'SOUTH_AMERICA';
  }

  // 4. AFRICA (Egypt, Morocco, Tunisia, Algeria, etc.)
  return 'AFRICA';
}

/**
 * Universal Club Factory
 * If the club is a real-world club with a defined squad, it uses loadRealClubSquad(id).
 * Fictional / lower tier clubs use generateClubSquad(id, countryCode, leagueId, reputation, baseSquadLevel).
 */
export function createClub(
  id: string,
  name: string,
  shortName: string,
  city: string,
  country: string,
  countryCode: string,
  division: number,
  leagueId: string,
  reputation: number,
  baseSquadLevel: number,
  primaryColor: string,
  secondaryColor: string,
  budget: number,
  transferBudget: number,
  wageBudgetMonthly: number,
  stadiumName: string,
  stadiumCapacity: number,
  facilitiesLevel: number = 4
): Club {
  const players = isRealClub(id)
    ? loadRealClubSquad(id)
    : generateClubSquad(id, countryCode, leagueId, reputation, baseSquadLevel);

  const startingPlayerIds = players.slice(0, 11).map(p => p.id);
  const benchPlayerIds = players.slice(11, 18).map(p => p.id);
  const continent = resolveCountryContinent(country, countryCode, leagueId, id);

  const baseClub: Partial<Club> = {
    id,
    name,
    shortName,
    city,
    country,
    countryCode,
    countryId: countryCode,
    continent,
    division,
    leagueId,
    reputation,
    budget,
    transferBudget,
    wageBudgetMonthly,
    primaryColor,
    secondaryColor,
  };

  const dynamicSponsors = populateClubSponsors(baseClub as Club);

  return {
    id,
    name,
    shortName,
    city,
    country,
    countryCode,
    countryId: countryCode,
    continent,
    division,
    leagueId,
    reputation,
    budget,
    transferBudget,
    wageBudgetMonthly,
    primaryColor,
    secondaryColor,
    isUserClub: false,
    facilities: {
      stadiumName,
      stadiumCapacity,
      stadiumLevel: facilitiesLevel,
      medicalCenterLevel: facilitiesLevel,
      trainingGroundLevel: facilitiesLevel,
      youthAcademyLevel: facilitiesLevel,
      scoutingNetworkLevel: facilitiesLevel,
    },
    tactics: {
      formation: '4-3-3',
      mentality: 'balanced',
      passingStyle: 'short',
      pressingIntensity: 'balanced',
      tempo: 'balanced',
      startingPlayerIds,
      benchPlayerIds,
      captainId: players[0]?.id || '',
      penaltyTakerId: players[0]?.id || '',
      freeKickTakerId: players[0]?.id || '',
      cornerTakerId: players[0]?.id || '',
    },
    players,
    sponsors: dynamicSponsors,
  };
}
