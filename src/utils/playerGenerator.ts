import {
  Player,
  Position,
  PositionCategory,
  PreferredFoot,
  PlayerPersonality,
} from '../types/game';
import { getCountryById, GLOBAL_COUNTRIES } from '../data/countriesData';

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
  const isForeign = options.isForeign ?? Math.random() < primaryCountry.foreignPlayerRate;

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

    const randomKey = foreignKeys[Math.floor(Math.random() * foreignKeys.length)] || 'BRA';
    playerCountry = GLOBAL_COUNTRIES[randomKey] || primaryCountry;
  }

  // Determine Position
  let pos = options.position;
  let cat = options.positionCategory;

  if (!pos) {
    const cats: PositionCategory[] = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
    cat = cats[Math.floor(Math.random() * cats.length)];
    const possiblePositions = POSITIONS_BY_CATEGORY[cat];
    pos = possiblePositions[Math.floor(Math.random() * possiblePositions.length)];
  } else if (!cat) {
    if (pos === 'GK') cat = 'GK';
    else if (['CB', 'RB', 'LB'].includes(pos)) cat = 'DEF';
    else if (['CDM', 'CM', 'CAM'].includes(pos)) cat = 'MID';
    else cat = 'FWD';
  }

  // Pick First and Last Name from Country Pool
  const { firstNames, lastNames } = playerCountry.playerNamePool;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fullName = `${firstName} ${lastName}`;

  // Age & Ratings
  const ageMin = options.ageMin ?? 18;
  const ageMax = options.ageMax ?? 33;
  const age = Math.floor(Math.random() * (ageMax - ageMin + 1)) + ageMin;

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
    // Compress inflated base levels (e.g. 76-86) down to realistic 62-72 range for Arab leagues
    if (effectiveBaseLevel >= 82) {
      effectiveBaseLevel = 70 + Math.round((effectiveBaseLevel - 82) * 0.5); // 82->70, 86->72
    } else if (effectiveBaseLevel >= 74) {
      effectiveBaseLevel = 64 + Math.round((effectiveBaseLevel - 74) * 0.75); // 74->64, 80->69
    } else if (effectiveBaseLevel >= 66) {
      effectiveBaseLevel = 58 + Math.round((effectiveBaseLevel - 66) * 0.75); // 66->58, 72->63
    }
  }

  const variance = Math.floor(Math.random() * 7 - 3); // -3 to +3
  const maxAllowedOvr = isArabLeagueOrCountry ? (isForeign ? 78 : 75) : 91;
  const overall = Math.min(maxAllowedOvr, Math.max(42, effectiveBaseLevel + variance));

  // Potential is higher for young players, with realistic caps
  const potentialBoost =
    age <= 20
      ? Math.floor(Math.random() * 8 + 3)
      : age <= 24
      ? Math.floor(Math.random() * 5 + 2)
      : age <= 27
      ? Math.floor(Math.random() * 2 + 1)
      : 0;
  const maxAllowedPot = isArabLeagueOrCountry ? (isForeign ? 82 : 80) : 94;
  const potential = Math.min(maxAllowedPot, overall + potentialBoost);

  // Position-specific attributes
  const isGK = pos === 'GK';
  const isDef = cat === 'DEF';
  const isMid = cat === 'MID';
  const isFwd = cat === 'FWD';

  const attributes = {
    pace: Math.min(92, Math.max(35, overall + Math.floor(Math.random() * 12 - 4))),
    shooting: Math.min(92, Math.max(25, overall + (isFwd ? Math.floor(Math.random() * 5 + 3) : isDef ? -Math.floor(Math.random() * 15 + 5) : -1))),
    passing: Math.min(92, Math.max(30, overall + (isMid ? Math.floor(Math.random() * 5 + 3) : isGK ? -10 : -1))),
    dribbling: Math.min(92, Math.max(30, overall + (isFwd || isMid ? Math.floor(Math.random() * 5 + 2) : isGK ? -15 : -4))),
    defending: Math.min(92, Math.max(25, overall + (isDef ? Math.floor(Math.random() * 5 + 4) : isFwd ? -Math.floor(Math.random() * 18 + 8) : -3))),
    physical: Math.min(92, Math.max(38, overall + Math.floor(Math.random() * 10 - 3))),
    goalkeeping: isGK ? Math.min(92, overall + Math.floor(Math.random() * 4 + 1)) : undefined,
  };

  // Realistic Market Value & Monthly Salary calculation
  const { marketValue, salary } = calculatePlayerValuation(overall, potential, age, cat, clubRep);

  const preferredFoot = PREFERRED_FEET[Math.floor(Math.random() * PREFERRED_FEET.length)];
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];

  const playerId = options.clubId
    ? `${options.clubId}_p_${Math.random().toString(36).substring(2, 9)}`
    : `p_${playerCountry.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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
    number: Math.floor(Math.random() * 99 + 1),
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
    contractYears: Math.floor(Math.random() * 3 + 1),
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
  if (player._realisticCalibratedV2) return player;

  const pId = String(player.id || '');
  const clubId = String(clubIdHint || player.currentClubId || player.clubId || '').toLowerCase();
  const leagueId = String(leagueIdHint || player.currentLeagueId || player.leagueId || '').toLowerCase();
  const natCode = String(player.nationalityCode || '').toUpperCase();
  const natName = String(player.nationality || '');

  const isArabNationality =
    ARAB_NATIONALITY_CODES.has(natCode) ||
    ARAB_COUNTRY_KEYWORDS.some(kw => natName.includes(kw));

  const isArabLeague =
    /^(egy|sau|mar|tun|alg|uae|qat)_/.test(leagueId) ||
    /^(eg1|eg2|eg3|sau1|sau2|sau3|sau4|mar_|tun_|alg_|uae_|qat_|al_ahly|zamalek|pyramids|al_masry|al_hilal|al_nassr|al_ittihad|al_shabab|al_qadsiah|team_)/.test(clubId);

  const isTopEuroLeague = /^(esp|eng|ita|ger|fra)_tier_1/.test(leagueId) ||
    /^(esp1|eng1|ita_|ger_|fra_)/.test(clubId);

  const oldOvr = Number(player.overallRating) || 65;
  const oldPot = Number(player.potentialRating) || oldOvr;
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

  // If neither an Arab player nor playing in an Arab league, keep European/LatAm ratings intact
  if (!isArabNationality && !isArabLeague) {
    return { ...player, _realisticCalibratedV2: true } as any;
  }

  let newOvr = oldOvr;
  let newPot = oldPot;

  // 1. Check explicit world/regional star overrides first
  if (ELITE_ARAB_WORLD_STARS[pId]) {
    newOvr = ELITE_ARAB_WORLD_STARS[pId].ovr;
    newPot = ELITE_ARAB_WORLD_STARS[pId].pot;
  } else if (isTopEuroLeague && isArabNationality) {
    // Arab player in Top 5 European League (e.g. Salah, Hakimi, Brahim, Mazraoui, or generated)
    newOvr = oldOvr > 84 ? Math.min(88, oldOvr) : Math.min(81, oldOvr);
    newPot = Math.min(88, Math.max(newOvr, oldPot - Math.max(0, oldOvr - newOvr)));
  } else if (isArabLeague && !isArabNationality) {
    // Foreign international player in an Arab league
    const isSaudiBigClub = /^(sau1_hilal|sau1_nassr|sau1_ittihad|sau1_ahli|sau1_qadsiah|sau1_shabab|al_hilal|al_nassr|al_ittihad|al_ahli_sau|al_qadsiah|al_shabab)/.test(clubId);
    if (isSaudiBigClub) {
      // Foreign stars in top Saudi clubs (e.g. Ronaldo, Neves, Milinkovic-Savic, Benzema, Kante)
      if (oldOvr >= 86) newOvr = 82 + Math.min(3, Math.floor((oldOvr - 86) * 0.5)); // 82-85 max
      else if (oldOvr >= 80) newOvr = 77 + Math.round((oldOvr - 80) * 0.8); // 77-81
      else newOvr = Math.min(76, oldOvr - 2);
    } else {
      // Foreign players in Egypt / Morocco / Tunisia / Algeria / UAE / Qatar / mid-table Saudi
      if (oldOvr >= 80) newOvr = 73 + Math.min(3, Math.floor((oldOvr - 80) * 0.5)); // 73-76 max
      else if (oldOvr >= 74) newOvr = 68 + Math.round((oldOvr - 74) * 0.75); // 68-72
      else if (oldOvr >= 68) newOvr = 64 + Math.round((oldOvr - 68) * 0.65); // 64-68
      else newOvr = oldOvr;
    }
    const potGap = Math.min(6, Math.max(0, oldPot - oldOvr));
    newPot = age >= 28 ? newOvr : Math.min(isSaudiBigClub ? 85 : 79, newOvr + potGap);
  } else {
    // Arab player in Arab leagues (or free agent Arab player)
    const isTier2 = /tier_2|^eg2|^sau2/.test(leagueId) || /^eg2|^sau2/.test(clubId);
    const isTier3 = /tier_3|^eg3|^sau3/.test(leagueId) || /^eg3|^sau3/.test(clubId);
    const isTier4 = /tier_4|^team_|^sau4/.test(leagueId) || /^team_|^sau4/.test(clubId);

    const isTopArabGiant =
      /^(eg1_ahly|eg1_zamalek|eg1_pyramids|al_ahly|zamalek|pyramids|sau1_hilal|sau1_nassr|sau1_ittihad|sau1_ahli|al_hilal|al_nassr|al_ittihad|al_ahli_sau|mar_wydad|mar_raja|mar_far|mar_berkane|tun_esperance|alg_mca|alg_crb|uae_ain|uae_wasl|uae_shabab_ahli|qat_sadd|qat_duhail)/.test(
        clubId
      );

    if (isTier4) {
      newOvr = Math.min(54, Math.max(45, Math.round(46 + (oldOvr - 45) * 0.35)));
    } else if (isTier3) {
      newOvr = Math.min(59, Math.max(49, Math.round(51 + (oldOvr - 50) * 0.4)));
    } else if (isTier2) {
      newOvr = Math.min(65, Math.max(54, Math.round(56 + (oldOvr - 55) * 0.45)));
    } else if (isTopArabGiant) {
      // Top Arab giant domestic player: realistic 65 - 75 OVR range
      if (oldOvr >= 83) newOvr = 75;
      else if (oldOvr >= 80) newOvr = 72 + Math.round((oldOvr - 80) * 0.75); // 80->72, 82->74
      else if (oldOvr >= 75) newOvr = 68 + Math.round((oldOvr - 75) * 0.75); // 75->68, 79->71
      else if (oldOvr >= 70) newOvr = 65 + Math.round((oldOvr - 70) * 0.6);  // 70->65, 74->67
      else newOvr = Math.max(58, oldOvr - 3);
    } else {
      // Mid-table / standard Arab Tier 1 club player: realistic 60 - 70 OVR range
      if (oldOvr >= 80) newOvr = 70;
      else if (oldOvr >= 75) newOvr = 66 + Math.round((oldOvr - 75) * 0.7); // 75->66, 79->69
      else if (oldOvr >= 70) newOvr = 63 + Math.round((oldOvr - 70) * 0.6); // 70->63, 74->65
      else if (oldOvr >= 65) newOvr = 60 + Math.round((oldOvr - 65) * 0.6); // 65->60, 69->62
      else newOvr = Math.max(54, oldOvr - 2);
    }

    const rawGap = Math.max(0, oldPot - oldOvr);
    const realisticBoost =
      age <= 21 ? Math.min(7, Math.max(3, rawGap)) : age <= 25 ? Math.min(4, Math.max(1, rawGap)) : age <= 27 ? Math.min(2, rawGap) : 0;
    const maxCap = isTier4 ? 62 : isTier3 ? 66 : isTier2 ? 71 : isTopArabGiant ? 80 : 76;
    newPot = Math.min(maxCap, newOvr + realisticBoost);
  }

  const delta = newOvr - oldOvr;
  const oldAttrs = player.attributes || {
    pace: oldOvr,
    shooting: oldOvr - 4,
    passing: oldOvr - 2,
    dribbling: oldOvr - 2,
    defending: oldOvr - 5,
    physical: oldOvr,
  };

  // Scale attributes smoothly so technical stats match the realistic OVR while keeping physical/pace natural
  const scaleAttr = (val: number, weight = 0.85, minVal = 28, maxVal = 86) => {
    const base = Number.isFinite(val) ? val : oldOvr;
    return Math.min(maxVal, Math.max(minVal, Math.round(base + delta * weight)));
  };

  const calibratedAttributes = {
    pace: scaleAttr(oldAttrs.pace, 0.55, 38, 87),
    shooting: scaleAttr(oldAttrs.shooting, 0.85, 22, 84),
    passing: scaleAttr(oldAttrs.passing, 0.85, 28, 84),
    dribbling: scaleAttr(oldAttrs.dribbling, 0.82, 28, 85),
    defending: scaleAttr(oldAttrs.defending, 0.85, 22, 84),
    physical: scaleAttr(oldAttrs.physical, 0.6, 40, 86),
    goalkeeping:
      oldAttrs.goalkeeping !== undefined || player.position === 'GK'
        ? scaleAttr(oldAttrs.goalkeeping ?? oldOvr, 0.9, 35, 85)
        : undefined,
  };

  // Recalculate realistic marketValue and salary if rating was reduced
  const valuation =
    delta !== 0
      ? calculatePlayerValuation(newOvr, newPot, age, posCat, clubReputationHint)
      : { marketValue: player.marketValue || 250000, salary: player.salary || 8000 };

  return {
    ...player,
    overallRating: newOvr,
    potentialRating: newPot,
    attributes: calibratedAttributes,
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

  return squadBlueprint.map((slot, index) => {
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
  });
}

export function generateFreeAgentsMarket(count = 20): Player[] {
  const countryKeys = Object.keys(GLOBAL_COUNTRIES);
  const players: Player[] = [];

  for (let i = 0; i < count; i++) {
    const randomCountry = countryKeys[Math.floor(Math.random() * countryKeys.length)];
    const baseLevel = Math.floor(Math.random() * 35 + 48); // 48 - 83 rating
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
  
  // 1. Deduplicate
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
    cleanPlayers.push({
      ...p,
      currentClubId: club.id,
      currentLeagueId: club.leagueId || p.currentLeagueId || '',
    });
  }

  // 2. Minimum squad size enforcement: At least 20 players (target 22)
  if (cleanPlayers.length < 20) {
    const needed = 22 - cleanPlayers.length;
    const countryCode = club.countryCode || 'EGY';
    const rep = club.reputation || 50;
    const tier = club.division || (club as any).tier || 4;
    const baseLevel = tier === 1 ? 75 : tier === 2 ? 67 : tier === 3 ? 59 : 52;

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

    for (let i = 0; i < needed; i++) {
      const slot = blueprintSlots[i % blueprintSlots.length];
      const newP = generatePlayer({
        countryId: countryCode,
        clubId: club.id,
        leagueId: club.leagueId,
        clubReputation: rep,
        baseLevel,
        position: slot.pos,
        positionCategory: slot.cat,
      });

      newP.id = `${club.id}_squad_${cleanPlayers.length + 1}_${Date.now()}`;
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
  }

  // 3. Fix numbers
  const usedNumbers = new Set<number>();
  cleanPlayers.forEach((p, idx) => {
    if (!p.number || usedNumbers.has(p.number)) {
      let num = idx + 1;
      while (usedNumbers.has(num)) num++;
      p.number = num;
    }
    usedNumbers.add(p.number);
  });

  return {
    ...club,
    players: cleanPlayers,
  };
}
