import {
  Player,
  Position,
  PositionCategory,
  PreferredFoot,
  PlayerPersonality,
} from '../types/game';
import { getCountryById, GLOBAL_COUNTRIES } from '../data/countriesData';
import { STAR_RATINGS_OVERRIDES } from '../data/starRatingsOverrides';


/**
 * Randomness source. Defaults to Math.random; generateClubSquad switches it to a per-club seeded
 * generator so a club's generated squad is identical on every launch (stable ids/names/ratings,
 * which world-level transfers and rankings rely on).
 */
let rng: () => number = Math.random;

function seedFromString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function withSeededRandom<T>(seed: string, fn: () => T): T {
  const previous = rng;
  rng = mulberry32(seedFromString(seed));
  try {
    return fn();
  } finally {
    rng = previous;
  }
}

const POSITIONS_BY_CATEGORY: Record<PositionCategory, Position[]> = {
  GK: ['GK'],
  DEF: ['CB', 'RB', 'LB'],
  MID: ['CDM', 'CM', 'CAM'],
  FWD: ['RW', 'LW', 'ST'],
};

const PERSONALITIES: PlayerPersonality[] = [
  'ambitious',
  'loyal',
  'leader',
  'professional',
  'determined',
  'temperamental',
];

const PREFERRED_FEET: PreferredFoot[] = ['right', 'right', 'right', 'left', 'both'];

export interface GeneratePlayerOptions {
  countryId?: string;
  clubId?: string;
  leagueId?: string;
  clubReputation?: number;
  baseLevel?: number;
  position?: Position;
  positionCategory?: PositionCategory;
  ageMin?: number;
  ageMax?: number;
  isForeign?: boolean;
}

export function generatePlayer(options: GeneratePlayerOptions): Player {
  const clubRep = options.clubReputation ?? 50;
  const baseLevel = options.baseLevel ?? 60;
  const primaryCountry = getCountryById(options.countryId || 'EGY');

  // Decide Nationality based on Foreign Player Rate
  let playerCountry = primaryCountry;
  const isForeign = options.isForeign ?? rng() < primaryCountry.foreignPlayerRate;

  if (isForeign) {
    // Pick another country (weighted towards culturally and football-historically relevant regions)
    const allCountryKeys = Object.keys(GLOBAL_COUNTRIES);
    let foreignKeys = allCountryKeys.filter(k => k !== primaryCountry.code);
    
    if (primaryCountry.code === 'ESP') {
      // Spanish clubs: heavy Latin American (BRA, ARG), top European (FRA, GER, ITA, ENG), and North African (MAR, ALG)
      foreignKeys = ['BRA', 'BRA', 'ARG', 'ARG', 'FRA', 'FRA', 'GER', 'ITA', 'ENG', 'MAR', 'ALG', 'TUN', 'EGY'];
    } else if (primaryCountry.code === 'ENG') {
      // English clubs: diverse top global talent
      foreignKeys = ['BRA', 'FRA', 'ESP', 'GER', 'ARG', 'ITA', 'MAR', 'ALG', 'EGY'];
    } else if (primaryCountry.code === 'SAU') {
      // Saudi clubs: South American stars, North African & Egyptian masters, top Europeans
      foreignKeys = ['BRA', 'BRA', 'ARG', 'EGY', 'EGY', 'MAR', 'MAR', 'ALG', 'TUN', 'FRA', 'ESP', 'ENG'];
    } else if (primaryCountry.code === 'UAE' || primaryCountry.code === 'QAT') {
      // Gulf clubs: Brazilians, North Africans, Europeans
      foreignKeys = ['BRA', 'BRA', 'ARG', 'MAR', 'ALG', 'TUN', 'EGY', 'FRA', 'ESP'];
    } else if (primaryCountry.continent === 'Europe') {
      foreignKeys = ['BRA', 'ARG', 'FRA', 'ESP', 'GER', 'ITA', 'ENG', 'MAR', 'ALG'].filter(k => k !== primaryCountry.code);
    } else if (primaryCountry.continent === 'Africa') {
      // African clubs: intra-African + occasional South American
      foreignKeys = ['MAR', 'TUN', 'ALG', 'EGY', 'BRA'].filter(k => k !== primaryCountry.code);
    } else if (primaryCountry.continent === 'South America') {
      // South American clubs: other South Americans + occasional returning Europeans
      foreignKeys = ['BRA', 'ARG', 'ESP', 'ITA'].filter(k => k !== primaryCountry.code);
    }

    const randomKey = foreignKeys[Math.floor(rng() * foreignKeys.length)] || 'BRA';
    playerCountry = GLOBAL_COUNTRIES[randomKey] || primaryCountry;
  }

  // Determine Position
  let pos = options.position;
  let cat = options.positionCategory;

  if (!pos) {
    const cats: PositionCategory[] = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
    cat = cats[Math.floor(rng() * cats.length)];
    const possiblePositions = POSITIONS_BY_CATEGORY[cat];
    pos = possiblePositions[Math.floor(rng() * possiblePositions.length)];
  } else if (!cat) {
    if (pos === 'GK') cat = 'GK';
    else if (['CB', 'RB', 'LB'].includes(pos)) cat = 'DEF';
    else if (['CDM', 'CM', 'CAM'].includes(pos)) cat = 'MID';
    else cat = 'FWD';
  }

  // Pick First and Last Name from Country Pool
  const { firstNames, lastNames } = playerCountry.playerNamePool;
  const firstName = firstNames[Math.floor(rng() * firstNames.length)];
  const lastName = lastNames[Math.floor(rng() * lastNames.length)];
  const fullName = `${firstName} ${lastName}`;

  // Age & Ratings
  const ageMin = options.ageMin ?? 18;
  const ageMax = options.ageMax ?? 33;
  const age = Math.floor(rng() * (ageMax - ageMin + 1)) + ageMin;

  // Calibrate baseLevel if generating for an Arab club/league so generated ratings are never inflated
  const ARAB_CODES = new Set([
    'EGY', 'SAU', 'KSA', 'UAE', 'QAT', 'MAR', 'TUN', 'ALG',
    'PLE', 'JOR', 'IRQ', 'SYR', 'LBN', 'LBY', 'SDN', 'KUW', 'BHR', 'OMA', 'YEM',
  ]);
  const isArabLeagueOrCountry =
    ARAB_CODES.has(primaryCountry.code) ||
    ARAB_CODES.has(playerCountry.code) ||
    Boolean(options.leagueId && /^(egy|sau|mar|tun|alg|uae|qat)_/i.test(options.leagueId)) ||
    Boolean(options.clubId && /^(eg|sau|mar|tun|alg|uae|qat|team_)/i.test(options.clubId));

  let effectiveBaseLevel = baseLevel;
  if (isArabLeagueOrCountry) {
    // Keep realistic, balanced ratings for Arab leagues without crushing squads down to 50/54
    if (effectiveBaseLevel >= 84) {
      effectiveBaseLevel = 76 + Math.round((effectiveBaseLevel - 84) * 0.5);
    } else if (effectiveBaseLevel >= 74) {
      effectiveBaseLevel = 71 + Math.round((effectiveBaseLevel - 74) * 0.65);
    } else if (effectiveBaseLevel >= 65) {
      effectiveBaseLevel = 64 + Math.round((effectiveBaseLevel - 65) * 0.75);
    }
  }

  const variance = Math.floor(rng() * 5 - 2); // -2 to +2
  const maxAllowedOvr = isArabLeagueOrCountry ? (isForeign ? 84 : 81) : 92;
  const overall = Math.min(maxAllowedOvr, Math.max(52, effectiveBaseLevel + variance));

  // Potential is higher for young players, with realistic caps
  const potentialBoost =
    age <= 20
      ? Math.floor(rng() * 8 + 4)
      : age <= 24
      ? Math.floor(rng() * 5 + 2)
      : age <= 27
      ? Math.floor(rng() * 3 + 1)
      : 0;
  const maxAllowedPot = isArabLeagueOrCountry ? (isForeign ? 86 : 85) : 94;
  const potential = Math.min(maxAllowedPot, overall + potentialBoost);

  // Position-specific attributes
  const isGK = pos === 'GK';
  const isDef = cat === 'DEF';
  const isMid = cat === 'MID';
  const isFwd = cat === 'FWD';

  const attributes = {
    pace: Math.min(92, Math.max(35, overall + Math.floor(rng() * 12 - 4))),
    shooting: Math.min(92, Math.max(25, overall + (isFwd ? Math.floor(rng() * 5 + 3) : isDef ? -Math.floor(rng() * 15 + 5) : -1))),
    passing: Math.min(92, Math.max(30, overall + (isMid ? Math.floor(rng() * 5 + 3) : isGK ? -10 : -1))),
    dribbling: Math.min(92, Math.max(30, overall + (isFwd || isMid ? Math.floor(rng() * 5 + 2) : isGK ? -15 : -4))),
    defending: Math.min(92, Math.max(25, overall + (isDef ? Math.floor(rng() * 5 + 4) : isFwd ? -Math.floor(rng() * 18 + 8) : -3))),
    physical: Math.min(92, Math.max(38, overall + Math.floor(rng() * 10 - 3))),
    goalkeeping: isGK ? Math.min(92, overall + Math.floor(rng() * 4 + 1)) : undefined,
  };

  // Realistic Market Value & Monthly Salary calculation
  const { marketValue, salary } = calculatePlayerValuation(overall, potential, age, cat, clubRep);

  const preferredFoot = PREFERRED_FEET[Math.floor(rng() * PREFERRED_FEET.length)];
  const personality = PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)];

  const playerId = options.clubId
    ? `${options.clubId}_p_${rng().toString(36).substring(2, 9)}`
    : `p_${playerCountry.code.toLowerCase()}_${Date.now()}_${rng().toString(36).substring(2, 7)}`;

  const generated: Player = {
    id: playerId,
    firstName,
    lastName,
    name: fullName,
    nationality: playerCountry.name,
    nationalityCode: playerCountry.code,
    countryOfBirth: playerCountry.name,
    preferredFoot,
    personality,
    currentClubId: options.clubId,
    currentLeagueId: options.leagueId,
    age,
    position: pos,
    positionCategory: cat,
    overallRating: overall,
    potentialRating: potential,
    attributes,
    salary,
    marketValue,
    morale: 85,
    fitness: 100,
    form: 7.0,
    number: Math.floor(rng() * 99 + 1),
    stats: {
      appearances: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      tackles: 0,
      saves: 0,
      averageRating: 7.0,
      motm: 0,
    },
    contractYears: Math.floor(rng() * 3 + 1),
  };

  (generated as any)._realisticCalibratedV2 = true;
  return generated;
}

const ARAB_NATIONALITY_CODES = new Set([
  'EGY', 'SAU', 'KSA', 'UAE', 'QAT', 'MAR', 'TUN', 'ALG',
  'PLE', 'JOR', 'IRQ', 'SYR', 'LBN', 'LBY', 'SDN', 'KUW', 'BHR', 'OMA', 'YEM',
]);

const ARAB_COUNTRY_KEYWORDS = [
  'مصر', 'السعودية', 'المغرب', 'تونس', 'الجزائر', 'الإمارات', 'قطر',
  'فلسطين', 'الأردن', 'العراق', 'سوريا', 'لبنان', 'ليبيا', 'السودان', 'الكويت', 'البحرين', 'عمان', 'اليمن',
];

// World-class Arab stars playing in elite European clubs or returning directly from Europe peak
const ELITE_ARAB_WORLD_STARS: Record<string, { ovr: number; pot: number }> = {
  liverpool_mohamed_salah: { ovr: 88, pot: 88 },
  psg_achraf_hakimi: { ovr: 84, pot: 85 },
  real_madrid_brahim_diaz: { ovr: 80, pot: 84 },
  man_united_noussair_mazraoui: { ovr: 79, pot: 81 },
  hilal_yassine_bounou: { ovr: 80, pot: 80 },
  ahli_sau_riyad_mahrez: { ovr: 80, pot: 80 },
  ittihad_houssine_aouar: { ovr: 77, pot: 79 },
  hilal_salem_al_dawsari: { ovr: 76, pot: 76 },
  ahly_emam_ashour: { ovr: 76, pot: 79 },
  zamalek_zizo: { ovr: 76, pot: 77 },
  ahly_mohamed_el_shenawy: { ovr: 75, pot: 75 },
  ahly_wissam_abou_ali: { ovr: 75, pot: 78 },
  ahly_marwan_attia: { ovr: 74, pot: 77 },
};

/**
 * Calibrates inflated player ratings (especially Arab players & Arab league squads)
 * to realistic EA FC / Football Manager standards.
 */
export function calibrateRealisticPlayerRating(
  player: any,
  clubIdHint?: string,
  leagueIdHint?: string,
  clubReputationHint: number = 65
): Player {
  if (!player || typeof player !== 'object') return player;

  const pId = String(player.id || '');
  const clubId = String(clubIdHint || player.currentClubId || player.clubId || '').toLowerCase();
  const leagueId = String(leagueIdHint || player.currentLeagueId || player.leagueId || '').toLowerCase();

  const rawOvr = Number(player.overallRating ?? player.rating ?? 65);
  const oldOvr = Number.isFinite(rawOvr) && rawOvr > 0 ? rawOvr : 65;
  const rawPot = Number(player.potentialRating ?? player.potential ?? oldOvr);
  const oldPot = Number.isFinite(rawPot) && rawPot >= oldOvr ? rawPot : oldOvr;
  const age = Number(player.age) || 24;
  const posCat: PositionCategory =
    player.positionCategory ||
    (player.position === 'GK'
      ? 'GK'
      : ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(player.position)
      ? 'DEF'
      : ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(player.position)
      ? 'MID'
      : 'FWD');

  // 1. Check explicit worldwide and regional star overrides first (never downgrade developed players)
  const starOverride = STAR_RATINGS_OVERRIDES[pId] || ELITE_ARAB_WORLD_STARS[pId];
  if (starOverride) {
    const targetOvr = Math.max(40, Math.min(99, Math.round(starOverride.ovr)));
    const finalOvr = Math.max(oldOvr, targetOvr);
    const finalPot = Math.max(finalOvr, starOverride.pot ? Math.max(finalOvr, starOverride.pot) : oldPot);
    const valuation =
      player.marketValue && player.salary && finalOvr === oldOvr
        ? { marketValue: player.marketValue, salary: player.salary }
        : calculatePlayerValuation(finalOvr, finalPot, age, posCat, clubReputationHint);
    return {
      ...player,
      overallRating: finalOvr,
      potentialRating: finalPot,
      attributes: {
        pace: player.attributes?.pace ?? finalOvr,
        shooting: player.attributes?.shooting ?? Math.max(35, finalOvr - 4),
        passing: player.attributes?.passing ?? Math.max(40, finalOvr - 2),
        dribbling: player.attributes?.dribbling ?? Math.max(40, finalOvr - 2),
        defending: player.attributes?.defending ?? Math.max(35, finalOvr - 5),
        physical: player.attributes?.physical ?? finalOvr,
        ...(player.attributes || {}),
        ...((starOverride as any).attributes || {}),
      },
      marketValue: valuation.marketValue,
      salary: valuation.salary,
      _realisticCalibratedV2: true,
    } as any;
  }

  // 2. Self-Heal Protection: Recover players whose ratings were previously crushed to 50-54 by legacy tier clamping
  let newOvr = oldOvr;
  let newPot = Math.max(oldOvr, oldPot);

  const isLegacyCrushedRating =
    oldOvr >= 45 &&
    oldOvr <= 54 &&
    (oldPot >= 63 ||
      (Number(player.salary) || 0) >= 4500 ||
      (Number(player.marketValue) || 0) >= 180000 ||
      /tier_1|tier_2|tier_3/.test(leagueId) ||
      clubReputationHint >= 50);

  if (isLegacyCrushedRating) {
    if (oldPot >= 64) {
      newOvr = Math.min(82, Math.max(60, oldPot - (age <= 23 ? 5 : age <= 27 ? 3 : 1)));
    } else if ((Number(player.salary) || 0) >= 15000) {
      newOvr = 71;
    } else if ((Number(player.salary) || 0) >= 5000) {
      newOvr = 64;
    } else if (/tier_1/.test(leagueId) || clubReputationHint >= 70) {
      newOvr = 68;
    } else if (/tier_2/.test(leagueId) || clubReputationHint >= 55) {
      newOvr = 63;
    } else {
      newOvr = 59;
    }
    newPot = Math.max(newOvr, oldPot);
  }

  // 3. Preserve existing attributes without ever resetting or downgrading them
  const isGK = posCat === 'GK' || player.position === 'GK';
  const isDef = posCat === 'DEF';
  const isMid = posCat === 'MID';
  const isFwd = posCat === 'FWD';

  const existingAttrs = player.attributes && typeof player.attributes === 'object' ? player.attributes : null;
  const ratingHealedDelta = Math.max(0, newOvr - oldOvr);

  const resolveSafeAttribute = (rawVal: any, fallbackOffset: number, minFloor = 35): number => {
    const num = Number(rawVal);
    if (Number.isFinite(num) && num > 0) {
      // If the player was healed from a 50/54 rating crush, lift the crushed attribute proportionally
      if (ratingHealedDelta > 0 && num <= 56) {
        return Math.min(95, Math.max(minFloor, Math.round(num + ratingHealedDelta)));
      }
      return Math.min(99, Math.max(minFloor, Math.round(num)));
    }
    return Math.min(92, Math.max(minFloor, Math.round(newOvr + fallbackOffset)));
  };

  const preservedAttributes = {
    pace: resolveSafeAttribute(existingAttrs?.pace, 1, 38),
    shooting: resolveSafeAttribute(existingAttrs?.shooting, isFwd ? 3 : isDef ? -10 : -2, 25),
    passing: resolveSafeAttribute(existingAttrs?.passing, isMid ? 3 : isGK ? -10 : -1, 30),
    dribbling: resolveSafeAttribute(existingAttrs?.dribbling, isFwd || isMid ? 2 : isGK ? -14 : -3, 30),
    defending: resolveSafeAttribute(existingAttrs?.defending, isDef ? 4 : isFwd ? -12 : -3, 25),
    physical: resolveSafeAttribute(existingAttrs?.physical, 1, 40),
    goalkeeping:
      existingAttrs?.goalkeeping !== undefined || isGK
        ? resolveSafeAttribute(existingAttrs?.goalkeeping, isGK ? 2 : -20, isGK ? 45 : 15)
        : undefined,
  };

  const hasValidValuation =
    Number.isFinite(Number(player.marketValue)) &&
    Number(player.marketValue) > 0 &&
    Number.isFinite(Number(player.salary)) &&
    Number(player.salary) > 0 &&
    ratingHealedDelta === 0;

  const valuation = hasValidValuation
    ? { marketValue: Number(player.marketValue), salary: Number(player.salary) }
    : calculatePlayerValuation(newOvr, newPot, age, posCat, clubReputationHint);

  return {
    ...player,
    currentClubId: player.currentClubId || clubId || undefined,
    currentLeagueId: player.currentLeagueId || leagueId || undefined,
    overallRating: newOvr,
    potentialRating: newPot,
    attributes: preservedAttributes,
    marketValue: valuation.marketValue,
    salary: valuation.salary,
    _realisticCalibratedV2: true,
  } as any;
}

/**
 * Robust, realistic valuation engine matching real-world transfer prices & wages
 */
export function calculatePlayerValuation(
  overall: number,
  potential: number,
  age: number,
  positionCategory: PositionCategory,
  reputation: number = 70
): { marketValue: number; salary: number } {
  let baseValue = 100000;
  if (overall >= 90) {
    baseValue = 110000000 + (overall - 90) * 35000000;
  } else if (overall >= 85) {
    baseValue = 55000000 + (overall - 85) * 11000000;
  } else if (overall >= 80) {
    baseValue = 18000000 + (overall - 80) * 7400000;
  } else if (overall >= 75) {
    baseValue = 5500000 + (overall - 75) * 2500000;
  } else if (overall >= 70) {
    baseValue = 1600000 + (overall - 70) * 780000;
  } else if (overall >= 65) {
    baseValue = 450000 + (overall - 65) * 230000;
  } else if (overall >= 60) {
    baseValue = 160000 + (overall - 60) * 58000;
  } else if (overall >= 50) {
    baseValue = 45000 + (overall - 50) * 11500;
  } else {
    baseValue = 20000 + Math.max(0, overall - 35) * 1600;
  }

  // Age and Potential modifier
  const potGap = Math.max(0, potential - overall);
  let agePotentialMultiplier = 1.0;
  if (age <= 20) {
    agePotentialMultiplier = 1.25 + potGap * 0.05;
  } else if (age <= 23) {
    agePotentialMultiplier = 1.12 + potGap * 0.03;
  } else if (age <= 28) {
    agePotentialMultiplier = 1.0 + potGap * 0.01;
  } else if (age <= 32) {
    agePotentialMultiplier = Math.max(0.60, 1.0 - (age - 28) * 0.08);
  } else {
    agePotentialMultiplier = Math.max(0.20, 0.60 - (age - 32) * 0.1);
  }

  // Position modifier
  let posMultiplier = 1.0;
  if (positionCategory === 'FWD') posMultiplier = 1.1;
  else if (positionCategory === 'MID') posMultiplier = 1.02;
  else if (positionCategory === 'DEF') posMultiplier = 0.95;
  else if (positionCategory === 'GK') posMultiplier = 0.88;

  let marketValue = Math.round(baseValue * agePotentialMultiplier * posMultiplier);
  if (marketValue >= 10000000) {
    marketValue = Math.round(marketValue / 1000000) * 1000000;
  } else if (marketValue >= 1000000) {
    marketValue = Math.round(marketValue / 100000) * 100000;
  } else {
    marketValue = Math.round(marketValue / 10000) * 10000;
  }
  marketValue = Math.max(25000, marketValue);

  // Monthly salary calculation
  let monthlySalary = 2000;
  if (overall >= 90) {
    monthlySalary = 1100000 + (overall - 90) * 350000;
  } else if (overall >= 85) {
    monthlySalary = 550000 + (overall - 85) * 110000;
  } else if (overall >= 80) {
    monthlySalary = 180000 + (overall - 80) * 74000;
  } else if (overall >= 75) {
    monthlySalary = 50000 + (overall - 75) * 26000;
  } else if (overall >= 70) {
    monthlySalary = 18000 + (overall - 70) * 6400;
  } else if (overall >= 60) {
    monthlySalary = 5000 + (overall - 60) * 1300;
  } else {
    monthlySalary = 1200 + Math.max(0, overall - 40) * 190;
  }

  const repMultiplier = Math.max(0.65, Math.min(1.4, reputation / 70));
  monthlySalary = Math.round((monthlySalary * repMultiplier) / 500) * 500;
  monthlySalary = Math.max(1000, monthlySalary);

  return { marketValue, salary: monthlySalary };
}

export function generateClubSquad(
  clubId: string,
  countryCode: string,
  leagueId: string,
  clubReputation: number,
  baseLevel: number
): Player[] {
  const squadBlueprint: { pos: Position; cat: PositionCategory }[] = [
    // 3 Goalkeepers
    { pos: 'GK', cat: 'GK' },
    { pos: 'GK', cat: 'GK' },
    { pos: 'GK', cat: 'GK' },
    // 8 Defenders (4 CB, 2 RB, 2 LB)
    { pos: 'CB', cat: 'DEF' },
    { pos: 'CB', cat: 'DEF' },
    { pos: 'CB', cat: 'DEF' },
    { pos: 'CB', cat: 'DEF' },
    { pos: 'RB', cat: 'DEF' },
    { pos: 'RB', cat: 'DEF' },
    { pos: 'LB', cat: 'DEF' },
    { pos: 'LB', cat: 'DEF' },
    // 7 Midfielders (2 CDM, 3 CM, 2 CAM)
    { pos: 'CDM', cat: 'MID' },
    { pos: 'CDM', cat: 'MID' },
    { pos: 'CM', cat: 'MID' },
    { pos: 'CM', cat: 'MID' },
    { pos: 'CM', cat: 'MID' },
    { pos: 'CAM', cat: 'MID' },
    { pos: 'CAM', cat: 'MID' },
    // 6 Forwards (2 RW, 2 LW, 2 ST)
    { pos: 'RW', cat: 'FWD' },
    { pos: 'RW', cat: 'FWD' },
    { pos: 'LW', cat: 'FWD' },
    { pos: 'LW', cat: 'FWD' },
    { pos: 'ST', cat: 'FWD' },
    { pos: 'ST', cat: 'FWD' },
  ];

  return withSeededRandom(`squad:${clubId}`, () => squadBlueprint.map((slot, index) => {
    const player = generatePlayer({
      countryId: countryCode,
      clubId,
      leagueId,
      clubReputation,
      baseLevel,
      position: slot.pos,
      positionCategory: slot.cat,
    });

    player.number = index + 1;
    player.id = `${clubId}_p_${index + 1}`;
    player.currentClubId = clubId;
    player.currentLeagueId = leagueId;
    return player;
  }));
}

export function generateFreeAgentsMarket(count = 20): Player[] {
  const countryKeys = Object.keys(GLOBAL_COUNTRIES);
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    const randomCountry = countryKeys[Math.floor(rng() * countryKeys.length)];
    const baseLevel = Math.floor(rng() * 35 + 48); // 48 - 83 rating
    const player = generatePlayer({
      countryId: randomCountry,
      clubReputation: 30,
      baseLevel,
      ageMin: 18,
      ageMax: 34,
      isForeign: false,
    });

    player.contractYears = 0;
    player.isListedForTransfer = true;
    player.id = `fa_${randomCountry.toLowerCase()}_${i + 1}_${Date.now()}`;
    players.push(player);
  }

  return players;
}

/**
 * Ensures strict squad integrity for any club:
 * 1. Eliminates duplicate players (by ID or normalized full name).
 * 2. Enforces a minimum squad size of at least 20-22 players across all clubs.
 * 3. Assigns clean, non-conflicting jersey numbers.
 */
export function ensureClubSquadIntegrity(club: any): any {
  if (!club) return club;
  const existingPlayers: Player[] = Array.isArray(club.players) ? [...club.players] : [];

  // 1. Deduplicate while preserving full player attributes & ratings
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const cleanPlayers: Player[] = [];

  for (const p of existingPlayers) {
    if (!p || !p.id) continue;
    const normName = (p.name || '').trim().toLowerCase();
    if (seenIds.has(p.id)) continue;
    if (normName && seenNames.has(normName)) continue;

    seenIds.add(p.id);
    if (normName) seenNames.add(normName);
    cleanPlayers.push(
      calibrateRealisticPlayerRating(
        {
          ...p,
          currentClubId: club.id,
          currentLeagueId: club.leagueId || p.currentLeagueId || '',
        },
        club.id,
        club.leagueId,
        club.reputation || 65
      )
    );
  }

  // 2. Enforce positional minimums & minimum squad size (at least 20-22 players)
  const countryCode = club.countryCode || 'EGY';
  const rep = Number(club.reputation) || 60;
  const tier = Number(club.division || (club as any).tier || (/tier_1|^eg1|^sau1/.test(String(club.leagueId || club.id)) ? 1 : /tier_2|^eg2|^sau2/.test(String(club.leagueId || club.id)) ? 2 : /tier_3|^eg3|^sau3/.test(String(club.leagueId || club.id)) ? 3 : 4));

  const baseLevel =
    tier === 1
      ? Math.max(70, Math.min(78, Math.round(rep * 0.94)))
      : tier === 2
      ? Math.max(63, Math.min(70, Math.round(rep * 0.96)))
      : tier === 3
      ? Math.max(58, Math.min(64, Math.round(Math.max(58, rep * 0.98))))
      : Math.max(55, Math.min(61, Math.round(Math.max(56, rep + 15))));

  const countByCategory = (cat: PositionCategory) =>
    cleanPlayers.filter(p => p.positionCategory === cat).length;

  const requiredSlots: { pos: Position; cat: PositionCategory }[] = [];
  const gkNeeded = Math.max(0, 2 - countByCategory('GK'));
  for (let i = 0; i < gkNeeded; i++) requiredSlots.push({ pos: 'GK', cat: 'GK' });

  const defPositions: Position[] = ['CB', 'CB', 'RB', 'LB', 'CB', 'RB'];
  const defNeeded = Math.max(0, 6 - countByCategory('DEF'));
  for (let i = 0; i < defNeeded; i++) requiredSlots.push({ pos: defPositions[i % defPositions.length], cat: 'DEF' });

  const midPositions: Position[] = ['CM', 'CDM', 'CAM', 'CM', 'CDM', 'CAM'];
  const midNeeded = Math.max(0, 6 - countByCategory('MID'));
  for (let i = 0; i < midNeeded; i++) requiredSlots.push({ pos: midPositions[i % midPositions.length], cat: 'MID' });

  const fwdPositions: Position[] = ['ST', 'RW', 'LW', 'ST'];
  const fwdNeeded = Math.max(0, 4 - countByCategory('FWD'));
  for (let i = 0; i < fwdNeeded; i++) requiredSlots.push({ pos: fwdPositions[i % fwdPositions.length], cat: 'FWD' });

  const blueprintSlots: { pos: Position; cat: PositionCategory }[] = [
    { pos: 'GK', cat: 'GK' },
    { pos: 'CB', cat: 'DEF' },
    { pos: 'RB', cat: 'DEF' },
    { pos: 'LB', cat: 'DEF' },
    { pos: 'CM', cat: 'MID' },
    { pos: 'CDM', cat: 'MID' },
    { pos: 'CAM', cat: 'MID' },
    { pos: 'RW', cat: 'FWD' },
    { pos: 'LW', cat: 'FWD' },
    { pos: 'ST', cat: 'FWD' },
  ];

  const targetSquadSize = 22;
  let slotIdx = 0;
  let safetyAttempts = 0;

  while ((cleanPlayers.length < 20 || requiredSlots.length > 0) && cleanPlayers.length < targetSquadSize && safetyAttempts < 40) {
    safetyAttempts++;
    const slot = requiredSlots.length > 0 ? requiredSlots.shift()! : blueprintSlots[slotIdx++ % blueprintSlots.length];
    const newP = generatePlayer({
      countryId: countryCode,
      clubId: club.id,
      leagueId: club.leagueId,
      clubReputation: rep,
      baseLevel,
      position: slot.pos,
      positionCategory: slot.cat,
    });

    newP.id = `${club.id}_squad_${cleanPlayers.length + 1}_${Date.now()}_${safetyAttempts}`;
    newP.currentClubId = club.id;
    newP.currentLeagueId = club.leagueId || '';
    newP.number = cleanPlayers.length + 1;

    const nName = (newP.name || '').trim().toLowerCase();
    if (!seenNames.has(nName)) {
      seenNames.add(nName);
      seenIds.add(newP.id);
      cleanPlayers.push(newP);
    }
  }

  // 3. Fix jersey numbers
  const usedNumbers = new Set<number>();
  cleanPlayers.forEach((p, idx) => {
    if (!p.number || usedNumbers.has(p.number)) {
      let num = idx + 1;
      while (usedNumbers.has(num)) num++;
      p.number = num;
    }
    usedNumbers.add(p.number);
  });

  // 4. Ensure valid startingPlayerIds (11) and benchPlayerIds (7)
  const validIdsSet = new Set(cleanPlayers.map(p => p.id));
  let startingIds: string[] = Array.isArray(club.tactics?.startingPlayerIds)
    ? club.tactics.startingPlayerIds.filter((id: string) => validIdsSet.has(id))
    : [];
  let benchIds: string[] = Array.isArray(club.tactics?.benchPlayerIds)
    ? club.tactics.benchPlayerIds.filter((id: string) => validIdsSet.has(id) && !startingIds.includes(id))
    : [];

  if (startingIds.length < 11) {
    const remaining = cleanPlayers.filter(p => !startingIds.includes(p.id));
    // Prefer at least 1 GK in starting 11
    const hasStarterGk = startingIds.some(id => cleanPlayers.find(p => p.id === id)?.positionCategory === 'GK');
    if (!hasStarterGk) {
      const gk = remaining.find(p => p.positionCategory === 'GK');
      if (gk) {
        startingIds.unshift(gk.id);
      }
    }
    for (const p of remaining) {
      if (startingIds.length >= 11) break;
      if (!startingIds.includes(p.id)) {
        startingIds.push(p.id);
      }
    }
    benchIds = benchIds.filter(id => !startingIds.includes(id));
  }

  if (benchIds.length < 7) {
    for (const p of cleanPlayers) {
      if (benchIds.length >= 7) break;
      if (!startingIds.includes(p.id) && !benchIds.includes(p.id)) {
        benchIds.push(p.id);
      }
    }
  }

  return {
    ...club,
    players: cleanPlayers,
    tactics: club.tactics
      ? {
          ...club.tactics,
          startingPlayerIds: startingIds.slice(0, 11),
          benchPlayerIds: benchIds.slice(0, 7),
        }
      : {
          formation: '4-3-3',
          mentality: 'balanced',
          passingStyle: 'mixed',
          tempo: 'normal',
          attackingWidth: 'normal',
          attackFocus: 'mixed',
          pressingIntensity: 'medium',
          defensiveLine: 'normal',
          timeWasting: 'never',
          offsideTrap: false,
          counterAttack: true,
          startingPlayerIds: startingIds.slice(0, 11),
          benchPlayerIds: benchIds.slice(0, 7),
        },
  };
}
