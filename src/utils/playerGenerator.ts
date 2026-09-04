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

  const variance = Math.floor(Math.random() * 9 - 4);
  const overall = Math.min(96, Math.max(35, baseLevel + variance));
  
  // Potential is higher for young players
  const potentialBoost = age <= 21 ? Math.floor(Math.random() * 12 + 4) : age <= 26 ? Math.floor(Math.random() * 6 + 1) : 0;
  const potential = Math.min(99, overall + potentialBoost);

  // Position-specific attributes
  const isGK = pos === 'GK';
  const isDef = cat === 'DEF';
  const isMid = cat === 'MID';
  const isFwd = cat === 'FWD';

  const attributes = {
    pace: Math.min(99, Math.max(30, overall + Math.floor(Math.random() * 14 - 6))),
    shooting: Math.min(99, Math.max(25, overall + (isFwd ? Math.floor(Math.random() * 6 + 4) : isDef ? -Math.floor(Math.random() * 15 + 5) : 0))),
    passing: Math.min(99, Math.max(30, overall + (isMid ? Math.floor(Math.random() * 6 + 4) : isGK ? -10 : 0))),
    dribbling: Math.min(99, Math.max(30, overall + (isFwd || isMid ? Math.floor(Math.random() * 6 + 2) : isGK ? -15 : -4))),
    defending: Math.min(99, Math.max(25, overall + (isDef ? Math.floor(Math.random() * 6 + 5) : isFwd ? -Math.floor(Math.random() * 18 + 8) : -2))),
    physical: Math.min(99, Math.max(35, overall + Math.floor(Math.random() * 10 - 4))),
    goalkeeping: isGK ? Math.min(99, overall + Math.floor(Math.random() * 5 + 2)) : undefined,
  };

  // Realistic Market Value & Monthly Salary calculation
  const { marketValue, salary } = calculatePlayerValuation(overall, potential, age, cat, clubRep);

  const preferredFoot = PREFERRED_FEET[Math.floor(Math.random() * PREFERRED_FEET.length)];
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];

  const playerId = options.clubId 
    ? `${options.clubId}_p_${Math.random().toString(36).substring(2, 9)}`
    : `p_${playerCountry.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
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
