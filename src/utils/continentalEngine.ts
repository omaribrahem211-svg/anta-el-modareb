import {
  Club,
  ContinentCode,
  ContinentalGroup,
  ContinentalGroupStanding,
  ContinentalMatch,
  ContinentalTournament,
  Fixture,
  LeagueDefinition,
  LeagueStanding,
  MatchEvent,
  MatchStats,
} from '../types/game';
import { simulateMatch, calculateTeamStrength } from './engine';
import { GLOBAL_LEAGUES, findClubInWorld } from '../data/leaguesData';
import { resolveCountryContinent } from '../data/realClubsData';
import {
  EGYPT_PREMIER_CLUBS,
  MOROCCO_BOTOLA_CLUBS,
  TUNISIA_LIGUE_CLUBS,
  ALGERIA_LIGUE_CLUBS,
  SAUDI_PRO_CLUBS,
  SAUDI_TIER_2_CLUBS,
  UAE_PRO_CLUBS,
  QATAR_STARS_CLUBS,
} from '../data/arabClubsData';
import {
  ENGLAND_PREMIER_CLUBS,
  SPAIN_LA_LIGA_CLUBS,
  ITALY_SERIE_A_CLUBS,
  GERMANY_BUNDESLIGA_CLUBS,
  FRANCE_LIGUE_1_CLUBS,
} from '../data/europeanClubsData';
import {
  BRAZIL_SERIE_A_CLUBS,
  ARGENTINA_PRIMERA_CLUBS,
} from '../data/latamClubsData';

// =========================================================================
// 0. STRICT CONTINENT CLASSIFICATION & ISOLATION GUARDS
// =========================================================================

/**
 * Resolves the canonical strict ContinentCode ('AFRICA' | 'ASIA' | 'EUROPE' | 'SOUTH_AMERICA' | 'NORTH_AMERICA')
 * for any Club or LeagueDefinition. Never allows cross-continent ambiguity.
 */
export function resolveClubContinent(
  club?: Partial<Club> | null,
  league?: Partial<LeagueDefinition> | null
): ContinentCode {
  const rawContinent = String(club?.continent || league?.continent || league?.region || '')
    .trim()
    .toUpperCase();

  if (rawContinent === 'ASIA') return 'ASIA';
  if (rawContinent === 'EUROPE') return 'EUROPE';
  if (rawContinent === 'SOUTH_AMERICA' || rawContinent === 'SOUTH AMERICA') return 'SOUTH_AMERICA';
  if (rawContinent === 'NORTH_AMERICA' || rawContinent === 'NORTH AMERICA') return 'NORTH_AMERICA';
  if (rawContinent === 'AFRICA') {
    // Double-check against country/leagueId in case a legacy object had default 'africa' stamped on an Asian/European club
    const verifiedByCountry = resolveCountryContinent(
      club?.country || league?.country,
      club?.countryCode,
      club?.leagueId || league?.id,
      club?.id
    );
    if (verifiedByCountry !== 'AFRICA') {
      return verifiedByCountry;
    }
    return 'AFRICA';
  }

  return resolveCountryContinent(
    club?.country || league?.country,
    club?.countryCode,
    club?.leagueId || league?.id,
    club?.id
  );
}

/**
 * Maps any Continental Competition ID to its strict Target Continent.
 * - 'ccl' | 'ccc' -> 'AFRICA' (CAF Champions League & CAF Confederation Cup)
 * - 'acl' | 'acl2' -> 'ASIA' (AFC Champions League Elite & AFC Champions League Two)
 * - 'ucl' | 'uel' -> 'EUROPE' (UEFA Champions League & UEFA Europa League)
 */
export function getTargetContinentForCompetition(
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2' | string
): ContinentCode {
  const code = String(competitionId || '').toLowerCase();
  if (code === 'acl' || code === 'acl2' || code.includes('afc') || code.includes('asia')) {
    return 'ASIA';
  }
  if (code === 'ucl' || code === 'uel' || code.includes('uefa') || code.includes('euro')) {
    return 'EUROPE';
  }
  return 'AFRICA';
}

/**
 * Returns the pure club pool belonging strictly to `targetContinent`.
 * Used exclusively to fill any vacant spots within the same continent — NEVER across continents.
 */
export function getContinentClubPool(targetContinent: ContinentCode): Club[] {
  let rawPool: Club[] = [];
  switch (targetContinent) {
    case 'ASIA':
      rawPool = [
        ...(GLOBAL_LEAGUES['sau_tier_1']?.teams || SAUDI_PRO_CLUBS),
        ...(GLOBAL_LEAGUES['uae_tier_1']?.teams || UAE_PRO_CLUBS),
        ...(GLOBAL_LEAGUES['qat_tier_1']?.teams || QATAR_STARS_CLUBS),
        ...(GLOBAL_LEAGUES['sau_tier_2']?.teams || SAUDI_TIER_2_CLUBS),
      ];
      break;
    case 'EUROPE':
      rawPool = [
        ...(GLOBAL_LEAGUES['eng_tier_1']?.teams || ENGLAND_PREMIER_CLUBS),
        ...(GLOBAL_LEAGUES['esp_tier_1']?.teams || SPAIN_LA_LIGA_CLUBS),
        ...(GLOBAL_LEAGUES['ita_tier_1']?.teams || ITALY_SERIE_A_CLUBS),
        ...(GLOBAL_LEAGUES['ger_tier_1']?.teams || GERMANY_BUNDESLIGA_CLUBS),
        ...(GLOBAL_LEAGUES['fra_tier_1']?.teams || FRANCE_LIGUE_1_CLUBS),
      ];
      break;
    case 'SOUTH_AMERICA':
      rawPool = [
        ...(GLOBAL_LEAGUES['bra_tier_1']?.teams || BRAZIL_SERIE_A_CLUBS),
        ...(GLOBAL_LEAGUES['arg_tier_1']?.teams || ARGENTINA_PRIMERA_CLUBS),
      ];
      break;
    case 'AFRICA':
    default:
      rawPool = [
        ...(GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS),
        ...(GLOBAL_LEAGUES['mar_tier_1']?.teams || MOROCCO_BOTOLA_CLUBS),
        ...(GLOBAL_LEAGUES['tun_tier_1']?.teams || TUNISIA_LIGUE_CLUBS),
        ...(GLOBAL_LEAGUES['alg_tier_1']?.teams || ALGERIA_LIGUE_CLUBS),
      ];
      break;
  }

  const seen = new Set<string>();
  const purePool: Club[] = [];
  for (const club of rawPool) {
    if (!club || !club.id || seen.has(club.id)) continue;
    const clubContinent = resolveClubContinent(club);
    if (clubContinent === targetContinent) {
      seen.add(club.id);
      purePool.push({ ...club, continent: targetContinent });
    }
  }
  return purePool;
}

/**
 * Safety Guard & Strict Continent Filter:
 * - Filters `allTeams` so ONLY teams with `team.continent === targetContinent` are retained.
 * - If any team from a foreign continent is detected, logs a clear warning, strips it immediately,
 *   and replaces vacant slots strictly from the same continent's pool (`getContinentClubPool(targetContinent)`).
 * - Throws an explicit assertion error if a foreign team ever remains after sanitization.
 */
export function assertAndSanitizeContinentTeams(
  candidateTeams: Club[],
  targetContinent: ContinentCode,
  requiredCount: number = 16,
  seasonNumber: number = 1,
  excludedClubIds?: Set<string>
): Club[] {
  const excluded = excludedClubIds || new Set<string>();
  const seenIds = new Set<string>();
  const eligibleTeams: Club[] = [];

  for (const team of Array.isArray(candidateTeams) ? candidateTeams : []) {
    if (!team || !team.id) continue;
    if (excluded.has(team.id) || seenIds.has(team.id)) continue;

    const teamContinent = resolveClubContinent(team);
    if (teamContinent !== targetContinent) {
      console.warn(
        `[ContinentalIsolationGuard] Rejected foreign club "${team.name}" (${team.id}, continent=${teamContinent}) from ${targetContinent} competition.`
      );
      continue;
    }

    seenIds.add(team.id);
    eligibleTeams.push({ ...team, continent: targetContinent });
  }

  // Fill any vacant spots strictly from the SAME continent pool (ranked by seasonal coefficient)
  if (eligibleTeams.length < requiredCount) {
    const sameContinentPool = getContinentClubPool(targetContinent).filter(
      c => !excluded.has(c.id) && !seenIds.has(c.id)
    );
    const rankedBackups = [...sameContinentPool].sort(
      (a, b) => getClubSeasonalCoefficient(b, seasonNumber) - getClubSeasonalCoefficient(a, seasonNumber)
    );

    for (const backup of rankedBackups) {
      if (eligibleTeams.length >= requiredCount) break;
      seenIds.add(backup.id);
      eligibleTeams.push({ ...backup, continent: targetContinent });
    }

    // If still fewer than requiredCount (e.g., heavily excluded), allow remaining teams from the same continent pool
    if (eligibleTeams.length < requiredCount) {
      for (const backup of getContinentClubPool(targetContinent)) {
        if (eligibleTeams.length >= requiredCount) break;
        if (!seenIds.has(backup.id)) {
          seenIds.add(backup.id);
          eligibleTeams.push({ ...backup, continent: targetContinent });
        }
      }
    }
  }

  const finalSelection = eligibleTeams.slice(0, requiredCount);

  // Hard Assertion: Verify 0 foreign-continent teams exist
  const foreignTeam = finalSelection.find(t => resolveClubContinent(t) !== targetContinent);
  if (foreignTeam) {
    throw new Error(
      `[ContinentalIsolationAssertionError] Foreign club ${foreignTeam.id} (${resolveClubContinent(foreignTeam)}) detected in ${targetContinent} tournament!`
    );
  }

  return finalSelection;
}

// ----------------------------------------------------
// HELPER: BUILD 4 GROUPS OF 4 + 6 MATCHDAYS (HOME & AWAY)
// ----------------------------------------------------

function buildGroupStageStructure(
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2',
  seasonNumber: number,
  groupClubsMatrix: Club[][],
  groupNames: string[],
  roundTriggers: [number, number, number, number, number, number] = [3, 6, 8, 12, 14, 16]
): { groups: ContinentalGroup[]; matches: ContinentalMatch[] } {
  const groups: ContinentalGroup[] = [];
  const matches: ContinentalMatch[] = [];
  const numGroups = Math.min(4, groupClubsMatrix.length);

  for (let gIdx = 0; gIdx < numGroups; gIdx++) {
    const groupClubs = groupClubsMatrix[gIdx] || [];
    if (groupClubs.length < 4) continue;
    const groupTeamIds = groupClubs.map(c => c.id);
    const standings: ContinentalGroupStanding[] = groupClubs.map(c => ({
      teamId: c.id,
      teamName: c.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    const groupId = `${competitionId}_group_${gIdx + 1}_s${seasonNumber}`;
    groups.push({
      id: groupId,
      name: groupNames[gIdx] || `المجموعة ${gIdx + 1}`,
      teamIds: groupTeamIds,
      standings,
    });

    const [t0, t1, t2, t3] = groupTeamIds;
    const schedulePairs = [
      { md: 1, round: roundTriggers[0], pairs: [[t0, t1], [t2, t3]] },
      { md: 2, round: roundTriggers[1], pairs: [[t3, t0], [t1, t2]] },
      { md: 3, round: roundTriggers[2], pairs: [[t0, t2], [t1, t3]] },
      { md: 4, round: roundTriggers[3], pairs: [[t2, t0], [t3, t1]] },
      { md: 5, round: roundTriggers[4], pairs: [[t0, t3], [t2, t1]] },
      { md: 6, round: roundTriggers[5], pairs: [[t1, t0], [t3, t2]] },
    ];

    schedulePairs.forEach(sp => {
      sp.pairs.forEach((pair, pairIdx) => {
        matches.push({
          id: `${competitionId}_m_g${gIdx + 1}_md${sp.md}_${pairIdx}_s${seasonNumber}`,
          stage: 'group',
          stageName: `المجموعات - الجولة ${sp.md}`,
          groupId,
          matchday: sp.md,
          roundTrigger: sp.round,
          homeTeamId: pair[0],
          awayTeamId: pair[1],
          isPlayed: false,
        });
      });
    });
  }

  return { groups, matches };
}

// ----------------------------------------------------
// DYNAMIC QUALIFICATION & SEEDED GROUP DRAW (RE-SEEDING & SHUFFLE)
// ----------------------------------------------------

function createDrawRng(seasonNumber: number, competitionCode: string): () => number {
  let seed = (seasonNumber * 2654435761) ^ (Date.now() & 0xfffffff);
  for (let i = 0; i < competitionCode.length; i++) {
    seed = ((seed << 5) - seed + competitionCode.charCodeAt(i)) | 0;
  }
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getClubSeasonalCoefficient(club: Club, seasonNumber: number): number {
  const players = Array.isArray(club?.players) ? club.players.filter(Boolean) : [];
  const avgOverall =
    players.length > 0
      ? players.reduce((s, p) => s + (p.overallRating || 68), 0) / players.length
      : club?.reputation || 70;
  const rep = club?.reputation || avgOverall;
  let hash = seasonNumber * 131;
  const idStr = String(club?.id || '');
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash * 31 + idStr.charCodeAt(i)) % 10007;
  }
  const seasonalFormDelta = ((hash % 17) - 8) * 1.05;
  return rep * 0.55 + avgOverall * 0.45 + seasonalFormDelta;
}

/**
 * Dynamically selects qualifiers from a league based on seasonal performance simulation,
 * strictly enforcing `team.continent === targetContinent` when `targetContinent` is provided.
 */
export function selectDynamicForeignQualifiers(
  leagueClubs: Club[],
  count: number,
  seasonNumber: number,
  excludedClubIds?: Set<string>,
  targetContinent?: ContinentCode
): Club[] {
  const eligible = (Array.isArray(leagueClubs) ? leagueClubs : []).filter(
    c =>
      c &&
      c.id &&
      !(excludedClubIds && excludedClubIds.has(c.id)) &&
      (!targetContinent || resolveClubContinent(c) === targetContinent)
  );
  if (eligible.length === 0) return [];
  const ranked = [...eligible].sort((a, b) => {
    if (seasonNumber <= 1) {
      return (b.reputation || 70) - (a.reputation || 70);
    }
    return getClubSeasonalCoefficient(b, seasonNumber) - getClubSeasonalCoefficient(a, seasonNumber);
  });
  return ranked.slice(0, count);
}

/**
 * Conducts an official 4-Pot Seeded Group Draw (Re-seeding & Shuffle) for 16 clubs into 4 groups of 4.
 * Enforces strict continent filtering and safety assertion before drawing pots.
 */
export function drawGroupStage(
  allTeams: Club[],
  targetContinent: ContinentCode,
  seasonNumber: number,
  competitionCode: string,
  excludedClubIds?: Set<string>
): Club[][] {
  // 1. Strict Continent Filter at entry point
  const eligibleTeams = (Array.isArray(allTeams) ? allTeams : []).filter(
    team => team && resolveClubContinent(team) === targetContinent
  );

  // 2. Safety Guard & Same-Continent Completion
  const sanitized16 = assertAndSanitizeContinentTeams(
    eligibleTeams,
    targetContinent,
    16,
    seasonNumber,
    excludedClubIds
  );

  const rng = createDrawRng(seasonNumber, competitionCode);

  const sortedBySeed = [...sanitized16].sort(
    (a, b) => getClubSeasonalCoefficient(b, seasonNumber) - getClubSeasonalCoefficient(a, seasonNumber)
  );

  const pot1 = shuffleWithRng(sortedBySeed.slice(0, 4), rng);
  const pot2 = shuffleWithRng(sortedBySeed.slice(4, 8), rng);
  const pot3 = shuffleWithRng(sortedBySeed.slice(8, 12), rng);
  const pot4 = shuffleWithRng(sortedBySeed.slice(12, 16), rng);

  const groups: Club[][] = [[], [], [], []];

  for (let g = 0; g < 4; g++) {
    if (pot1[g]) groups[g].push(pot1[g]);
  }

  const assignPotToGroups = (pot: Club[]) => {
    const availableGroups = [0, 1, 2, 3];
    for (const club of pot) {
      if (!club) continue;
      const clubCountry = club.countryCode || club.country || '';
      let chosenIdx = availableGroups.findIndex(
        gIdx => !groups[gIdx].some(existing => (existing.countryCode || existing.country) === clubCountry)
      );
      if (chosenIdx === -1) {
        chosenIdx = Math.floor(rng() * availableGroups.length);
      }
      const targetGroup = availableGroups[chosenIdx];
      groups[targetGroup].push(club);
      availableGroups.splice(chosenIdx, 1);
    }
  };

  assignPotToGroups(pot2);
  assignPotToGroups(pot3);
  assignPotToGroups(pot4);

  return groups;
}

export function conductSeededGroupDraw(
  clubs16: Club[],
  seasonNumber: number,
  competitionCode: string
): Club[][] {
  const targetContinent = getTargetContinentForCompetition(competitionCode);
  return drawGroupStage(clubs16, targetContinent, seasonNumber, competitionCode);
}

// ----------------------------------------------------
// 1. INITIALIZATION: AFRICAN CHAMPIONS LEAGUE (CAF CL) — STRICTLY AFRICA ONLY
// ----------------------------------------------------

/**
 * Initializes the African Champions League (CAF CL - دوري أبطال إفريقيا)
 * STRICT CONTINENT ISOLATION: Only clubs with `continent === 'AFRICA'` can qualify or be drawn.
 */
export function initAfricanChampionsLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent: ContinentCode = 'AFRICA';
  const excluded = excludedClubIds || new Set<string>();

  // Strict Continent Filter on incoming teams & qualifiedClubs
  const eligibleInputTeams = (Array.isArray(allTeams) ? allTeams : []).filter(
    team => team && resolveClubContinent(team) === targetContinent
  );
  const eligibleQualified = (Array.isArray(qualifiedClubs) ? qualifiedClubs : []).filter(
    team => team && resolveClubContinent(team) === targetContinent && !excluded.has(team.id)
  );
  const isUserAfrican = Boolean(userClub && resolveClubContinent(userClub) === targetContinent);

  const egyptTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS,
    4,
    seasonNumber,
    excluded,
    targetContinent
  );
  const moroccoTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['mar_tier_1']?.teams || MOROCCO_BOTOLA_CLUBS,
    4,
    seasonNumber,
    excluded,
    targetContinent
  );
  const tunisiaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['tun_tier_1']?.teams || TUNISIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    excluded,
    targetContinent
  );
  const algeriaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['alg_tier_1']?.teams || ALGERIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    excluded,
    targetContinent
  );

  if (eligibleQualified.length > 0) {
    let egyIdx = 0;
    let marIdx = 0;
    let tunIdx = 0;
    let algIdx = 0;
    eligibleQualified.forEach(qc => {
      if (qc.country === 'مصر' && egyIdx < 4) {
        const existingIdx = egyptTeams.findIndex(t => t.id === qc.id);
        if (existingIdx !== -1 && existingIdx !== egyIdx) {
          const temp = egyptTeams[egyIdx];
          egyptTeams[egyIdx] = qc;
          egyptTeams[existingIdx] = temp;
        } else {
          egyptTeams[egyIdx] = qc;
        }
        egyIdx++;
      } else if (qc.country === 'المغرب' && marIdx < 4) {
        moroccoTeams[marIdx++] = qc;
      } else if (qc.country === 'تونس' && tunIdx < 4) {
        tunisiaTeams[tunIdx++] = qc;
      } else if (qc.country === 'الجزائر' && algIdx < 4) {
        algeriaTeams[algIdx++] = qc;
      }
    });
  }

  // Only include userClub in CAF Champions League if userClub is STRICTLY AFRICAN, not excluded, and qualified
  const userInQualifiedList =
    isUserAfrican &&
    (!qualifiedClubs || qualifiedClubs.length === 0 || eligibleQualified.some(q => q.id === userClub?.id));

  if (userClub && isUserAfrican && !excluded.has(userClub.id) && userInQualifiedList) {
    const c = userClub.country || 'مصر';
    if (c === 'مصر' || userClub.id === 'eg1_ahly') {
      const idx = egyptTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) egyptTeams[idx] = userClub;
      else if (eligibleQualified.some(q => q.id === userClub.id) || userClub.division === 1) egyptTeams[0] = userClub;
    } else if (c === 'المغرب') {
      const idx = moroccoTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) moroccoTeams[idx] = userClub;
      else if (eligibleQualified.some(q => q.id === userClub.id) || userClub.division === 1) moroccoTeams[0] = userClub;
    } else if (c === 'تونس') {
      const idx = tunisiaTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) tunisiaTeams[idx] = userClub;
      else if (eligibleQualified.some(q => q.id === userClub.id) || userClub.division === 1) tunisiaTeams[0] = userClub;
    } else if (c === 'الجزائر') {
      const idx = algeriaTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) algeriaTeams[idx] = userClub;
      else if (eligibleQualified.some(q => q.id === userClub.id) || userClub.division === 1) algeriaTeams[0] = userClub;
    }
  }

  const candidateParticipants = [
    ...egyptTeams,
    ...moroccoTeams,
    ...tunisiaTeams,
    ...algeriaTeams,
    ...eligibleInputTeams.filter(t => t.division === 1),
  ].filter(Boolean);

  const groupClubsMatrix = drawGroupStage(
    candidateParticipants,
    targetContinent,
    seasonNumber,
    'ccl',
    excluded
  );

  const groupNames = [
    'المجموعة الأولى (A) - مجموعة القمة 🌟',
    'المجموعة الثانية (B) - مجموعة التحدي 🔥',
    'المجموعة الثالثة (C) - مجموعة الأبطال ⚔️',
    'المجموعة الرابعة (D) - مجموعة الصراع 🏆',
  ];

  const { groups, matches } = buildGroupStageStructure('ccl', seasonNumber, groupClubsMatrix, groupNames);

  return {
    id: `ccl_s${seasonNumber}`,
    competitionId: 'ccl',
    name: 'دوري أبطال إفريقيا',
    region: 'africa',
    targetContinent: 'AFRICA',
    seasonNumber,
    trophyName: 'كأس دوري أبطال إفريقيا 🏆',
    prizeMoneyWinner: 15000000,
    prizeMoneyRunnerUp: 7500000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

// ----------------------------------------------------
// 2. INITIALIZATION: CAF CONFEDERATION CUP (CCC) — STRICTLY AFRICA ONLY
// ----------------------------------------------------

/**
 * Initializes the CAF Confederation Cup (كأس الكونفدرالية الإفريقية)
 * Enforces STRICT CONTINENT ISOLATION (`continent === 'AFRICA'`) + STRICT MUTUAL EXCLUSION with CCL.
 */
export function initCafConfederationCup(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent: ContinentCode = 'AFRICA';
  const cclTeamIds = new Set<string>(excludedClubIds ? Array.from(excludedClubIds) : []);
  if (cclTeamIds.size === 0) {
    const cclReference = initAfricanChampionsLeague(seasonNumber, allTeams, userClub);
    cclReference.groups.forEach(g => g.teamIds.forEach(id => cclTeamIds.add(id)));
  }

  const eligibleQualified = (Array.isArray(qualifiedClubs) ? qualifiedClubs : []).filter(
    qc => qc && resolveClubContinent(qc) === targetContinent && !cclTeamIds.has(qc.id)
  );
  const isUserAfrican = Boolean(userClub && resolveClubContinent(userClub) === targetContinent);

  const egyptTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS,
    4,
    seasonNumber,
    cclTeamIds,
    targetContinent
  );
  const moroccoTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['mar_tier_1']?.teams || MOROCCO_BOTOLA_CLUBS,
    4,
    seasonNumber,
    cclTeamIds,
    targetContinent
  );
  const tunisiaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['tun_tier_1']?.teams || TUNISIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    cclTeamIds,
    targetContinent
  );
  const algeriaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['alg_tier_1']?.teams || ALGERIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    cclTeamIds,
    targetContinent
  );

  if (eligibleQualified.length > 0) {
    let egyIdx = 0;
    let marIdx = 0;
    let tunIdx = 0;
    let algIdx = 0;
    eligibleQualified.forEach(qc => {
      if (qc.country === 'مصر' && egyIdx < 4) {
        const existingIdx = egyptTeams.findIndex(t => t.id === qc.id);
        if (existingIdx !== -1 && existingIdx !== egyIdx) {
          const temp = egyptTeams[egyIdx];
          egyptTeams[egyIdx] = qc;
          egyptTeams[existingIdx] = temp;
        } else {
          egyptTeams[egyIdx] = qc;
        }
        egyIdx++;
      } else if (qc.country === 'المغرب' && marIdx < 4) {
        moroccoTeams[marIdx++] = qc;
      } else if (qc.country === 'تونس' && tunIdx < 4) {
        tunisiaTeams[tunIdx++] = qc;
      } else if (qc.country === 'الجزائر' && algIdx < 4) {
        algeriaTeams[algIdx++] = qc;
      }
    });
  }

  const isUserInCcl = Boolean(userClub && cclTeamIds.has(userClub.id));
  const isUserExplicitlyQualifiedForCcc = Boolean(
    userClub && isUserAfrican && eligibleQualified.some(qc => qc.id === userClub.id) && !isUserInCcl
  );

  if (userClub && isUserAfrican && !isUserInCcl && isUserExplicitlyQualifiedForCcc) {
    const c = userClub.country || 'مصر';
    if (c === 'مصر') {
      const idx = egyptTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) egyptTeams[idx] = userClub;
      else egyptTeams[0] = userClub;
    } else if (c === 'المغرب') {
      const idx = moroccoTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) moroccoTeams[idx] = userClub;
      else moroccoTeams[0] = userClub;
    } else if (c === 'تونس') {
      const idx = tunisiaTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) tunisiaTeams[idx] = userClub;
      else tunisiaTeams[0] = userClub;
    } else if (c === 'الجزائر') {
      const idx = algeriaTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) algeriaTeams[idx] = userClub;
      else algeriaTeams[0] = userClub;
    }
  } else if (userClub && isUserAfrican && !isUserInCcl) {
    const idxEgy = egyptTeams.findIndex(t => t.id === userClub.id);
    if (idxEgy !== -1) egyptTeams[idxEgy] = userClub;
    const idxMar = moroccoTeams.findIndex(t => t.id === userClub.id);
    if (idxMar !== -1) moroccoTeams[idxMar] = userClub;
    const idxTun = tunisiaTeams.findIndex(t => t.id === userClub.id);
    if (idxTun !== -1) tunisiaTeams[idxTun] = userClub;
    const idxAlg = algeriaTeams.findIndex(t => t.id === userClub.id);
    if (idxAlg !== -1) algeriaTeams[idxAlg] = userClub;
  }

  const candidateParticipants = [
    ...egyptTeams,
    ...moroccoTeams,
    ...tunisiaTeams,
    ...algeriaTeams,
  ].filter(Boolean);

  const groupClubsMatrix = drawGroupStage(
    candidateParticipants,
    targetContinent,
    seasonNumber,
    'ccc',
    cclTeamIds
  );

  const groupNames = [
    'المجموعة الأولى (A) - الكونفدرالية 🌍',
    'المجموعة الثانية (B) - الكونفدرالية 🔥',
    'المجموعة الثالثة (C) - الكونفدرالية ⚔️',
    'المجموعة الرابعة (D) - الكونفدرالية 🏆',
  ];

  const { groups, matches } = buildGroupStageStructure('ccc', seasonNumber, groupClubsMatrix, groupNames);

  return {
    id: `ccc_s${seasonNumber}`,
    competitionId: 'ccc',
    name: 'كأس الكونفدرالية الإفريقية',
    region: 'africa',
    targetContinent: 'AFRICA',
    seasonNumber,
    trophyName: 'كأس الكونفدرالية الإفريقية 🌍',
    prizeMoneyWinner: 8000000,
    prizeMoneyRunnerUp: 4000000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

// ----------------------------------------------------
// 3. INITIALIZATION: AFC CHAMPIONS LEAGUE ELITE (ACL) & AFC TWO (ACL2) — STRICTLY ASIA ONLY
// ----------------------------------------------------

/**
 * Initializes the AFC Champions League Elite (دوري أبطال آسيا للنخبة - 'acl')
 * STRICT CONTINENT ISOLATION: Only clubs with `continent === 'ASIA'` (Saudi Arabia, UAE, Qatar, etc.) can participate.
 */
export function initAfcChampionsLeagueElite(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent: ContinentCode = 'ASIA';
  const excluded = excludedClubIds || new Set<string>();

  const eligibleQualified = (Array.isArray(qualifiedClubs) ? qualifiedClubs : []).filter(
    c => c && resolveClubContinent(c) === targetContinent && !excluded.has(c.id)
  );
  const isUserAsian = Boolean(userClub && resolveClubContinent(userClub) === targetContinent);

  const saudiTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['sau_tier_1']?.teams || SAUDI_PRO_CLUBS,
    6,
    seasonNumber,
    excluded,
    targetContinent
  );
  const uaeTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['uae_tier_1']?.teams || UAE_PRO_CLUBS,
    5,
    seasonNumber,
    excluded,
    targetContinent
  );
  const qatarTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['qat_tier_1']?.teams || QATAR_STARS_CLUBS,
    5,
    seasonNumber,
    excluded,
    targetContinent
  );

  const candidatePool: Club[] = [...eligibleQualified, ...saudiTeams, ...uaeTeams, ...qatarTeams];

  if (
    userClub &&
    isUserAsian &&
    !excluded.has(userClub.id) &&
    (eligibleQualified.some(q => q.id === userClub.id) ||
      (!qualifiedClubs && (userClub.division === 1 || candidatePool.some(c => c.id === userClub.id))))
  ) {
    const existingIdx = candidatePool.findIndex(c => c.id === userClub.id);
    if (existingIdx !== -1) {
      candidatePool[existingIdx] = userClub;
    } else {
      candidatePool.unshift(userClub);
    }
  }

  const groupClubsMatrix = drawGroupStage(
    candidatePool,
    targetContinent,
    seasonNumber,
    'acl',
    excluded
  );

  const groupNames = [
    'المجموعة الأولى (A) - نخبة آسيا 👑',
    'المجموعة الثانية (B) - نخبة آسيا 🔥',
    'المجموعة الثالثة (C) - نخبة آسيا ⚔️',
    'المجموعة الرابعة (D) - نخبة آسيا 🏆',
  ];

  const { groups, matches } = buildGroupStageStructure('acl', seasonNumber, groupClubsMatrix, groupNames);

  return {
    id: `acl_s${seasonNumber}`,
    competitionId: 'acl',
    name: 'دوري أبطال آسيا للنخبة',
    region: 'asia',
    targetContinent: 'ASIA',
    seasonNumber,
    trophyName: 'كأس دوري أبطال آسيا للنخبة 👑',
    prizeMoneyWinner: 45000000,
    prizeMoneyRunnerUp: 22000000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

/**
 * Initializes the AFC Champions League Two (دوري أبطال آسيا 2 - 'acl2')
 * STRICT CONTINENT ISOLATION (`continent === 'ASIA'`) + STRICT MUTUAL EXCLUSION with ACL Elite.
 */
export function initAfcChampionsLeagueTwo(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent: ContinentCode = 'ASIA';
  const aclTeamIds = new Set<string>(excludedClubIds ? Array.from(excludedClubIds) : []);
  if (aclTeamIds.size === 0) {
    const aclReference = initAfcChampionsLeagueElite(seasonNumber, allTeams, userClub);
    aclReference.groups.forEach(g => g.teamIds.forEach(id => aclTeamIds.add(id)));
  }

  const eligibleQualified = (Array.isArray(qualifiedClubs) ? qualifiedClubs : []).filter(
    c => c && resolveClubContinent(c) === targetContinent && !aclTeamIds.has(c.id)
  );
  const isUserAsian = Boolean(userClub && resolveClubContinent(userClub) === targetContinent);
  const isUserInAcl = Boolean(userClub && aclTeamIds.has(userClub.id));

  const saudiTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['sau_tier_1']?.teams || SAUDI_PRO_CLUBS,
    6,
    seasonNumber,
    aclTeamIds,
    targetContinent
  );
  const uaeTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['uae_tier_1']?.teams || UAE_PRO_CLUBS,
    5,
    seasonNumber,
    aclTeamIds,
    targetContinent
  );
  const qatarTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['qat_tier_1']?.teams || QATAR_STARS_CLUBS,
    5,
    seasonNumber,
    aclTeamIds,
    targetContinent
  );

  const candidatePool: Club[] = [...eligibleQualified, ...saudiTeams, ...uaeTeams, ...qatarTeams];

  if (userClub && isUserAsian && !isUserInAcl) {
    const existingIdx = candidatePool.findIndex(c => c.id === userClub.id);
    if (existingIdx !== -1) {
      candidatePool[existingIdx] = userClub;
    } else if (eligibleQualified.some(q => q.id === userClub.id)) {
      candidatePool.unshift(userClub);
    }
  }

  const groupClubsMatrix = drawGroupStage(
    candidatePool,
    targetContinent,
    seasonNumber,
    'acl2',
    aclTeamIds
  );

  const groupNames = [
    'المجموعة الأولى (A) - أبطال آسيا 2 🌏',
    'المجموعة الثانية (B) - أبطال آسيا 2 🔥',
    'المجموعة الثالثة (C) - أبطال آسيا 2 ⚔️',
    'المجموعة الرابعة (D) - أبطال آسيا 2 🏆',
  ];

  const { groups, matches } = buildGroupStageStructure('acl2', seasonNumber, groupClubsMatrix, groupNames);

  return {
    id: `acl2_s${seasonNumber}`,
    competitionId: 'acl2',
    name: 'دوري أبطال آسيا 2',
    region: 'asia',
    targetContinent: 'ASIA',
    seasonNumber,
    trophyName: 'كأس دوري أبطال آسيا 2 🌏',
    prizeMoneyWinner: 20000000,
    prizeMoneyRunnerUp: 10000000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

// ----------------------------------------------------
// 4. INITIALIZATION: UEFA CHAMPIONS LEAGUE (UCL) — STRICTLY EUROPE ONLY
// ----------------------------------------------------

/**
 * Initializes the UEFA Champions League (UCL - دوري أبطال أوروبا)
 * STRICT CONTINENT ISOLATION: Only clubs with `continent === 'EUROPE'` can qualify or be drawn.
 */
export function initUefaChampionsLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent: ContinentCode = 'EUROPE';
  const excluded = excludedClubIds || new Set<string>();

  const eligibleQualified = (Array.isArray(qualifiedClubs) ? qualifiedClubs : []).filter(
    c => c && resolveClubContinent(c) === targetContinent && !excluded.has(c.id)
  );
  const isUserEuropean = Boolean(userClub && resolveClubContinent(userClub) === targetContinent);

  const engTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['eng_tier_1']?.teams || ENGLAND_PREMIER_CLUBS,
    4,
    seasonNumber,
    excluded,
    targetContinent
  );
  const espTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['esp_tier_1']?.teams || SPAIN_LA_LIGA_CLUBS,
    4,
    seasonNumber,
    excluded,
    targetContinent
  );
  const itaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['ita_tier_1']?.teams || ITALY_SERIE_A_CLUBS,
    3,
    seasonNumber,
    excluded,
    targetContinent
  );
  const gerTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['ger_tier_1']?.teams || GERMANY_BUNDESLIGA_CLUBS,
    3,
    seasonNumber,
    excluded,
    targetContinent
  );
  const fraTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['fra_tier_1']?.teams || FRANCE_LIGUE_1_CLUBS,
    2,
    seasonNumber,
    excluded,
    targetContinent
  );

  const candidatePool: Club[] = [
    ...eligibleQualified,
    ...engTeams,
    ...espTeams,
    ...itaTeams,
    ...gerTeams,
    ...fraTeams,
  ];

  if (userClub && isUserEuropean && !excluded.has(userClub.id)) {
    const existingIdx = candidatePool.findIndex(c => c.id === userClub.id);
    if (existingIdx !== -1) {
      candidatePool[existingIdx] = userClub;
    } else if (eligibleQualified.some(q => q.id === userClub.id)) {
      candidatePool.unshift(userClub);
    }
  }

  const groupClubsMatrix = drawGroupStage(
    candidatePool,
    targetContinent,
    seasonNumber,
    'ucl',
    excluded
  );

  const groupNames = [
    'المجموعة الأولى (A) - دوري الأبطال 🌟',
    'المجموعة الثانية (B) - دوري الأبطال 🔥',
    'المجموعة الثالثة (C) - دوري الأبطال ⚔️',
    'المجموعة الرابعة (D) - دوري الأبطال 🏆',
  ];

  const { groups, matches } = buildGroupStageStructure('ucl', seasonNumber, groupClubsMatrix, groupNames);

  return {
    id: `ucl_s${seasonNumber}`,
    competitionId: 'ucl',
    name: 'دوري أبطال أوروبا',
    region: 'europe',
    targetContinent: 'EUROPE',
    seasonNumber,
    trophyName: 'كأس ذات الأذنين (دوري أبطال أوروبا) 🏆',
    prizeMoneyWinner: 85000000,
    prizeMoneyRunnerUp: 45000000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

// ----------------------------------------------------
// 5. INITIALIZATION: UEFA EUROPA LEAGUE (UEL) — STRICTLY EUROPE ONLY
// ----------------------------------------------------

/**
 * Initializes the UEFA Europa League (UEL - الدوري الأوروبي)
 * STRICT CONTINENT ISOLATION (`continent === 'EUROPE'`) + STRICT MUTUAL EXCLUSION with UCL.
 */
export function initUefaEuropaLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent: ContinentCode = 'EUROPE';
  const uclTeamIds = new Set<string>(excludedClubIds ? Array.from(excludedClubIds) : []);
  if (uclTeamIds.size === 0) {
    const uclReference = initUefaChampionsLeague(seasonNumber, allTeams, userClub);
    uclReference.groups.forEach(g => g.teamIds.forEach(id => uclTeamIds.add(id)));
  }

  const eligibleQualified = (Array.isArray(qualifiedClubs) ? qualifiedClubs : []).filter(
    c => c && resolveClubContinent(c) === targetContinent && !uclTeamIds.has(c.id)
  );
  const isUserEuropean = Boolean(userClub && resolveClubContinent(userClub) === targetContinent);
  const isUserInUcl = Boolean(userClub && uclTeamIds.has(userClub.id));

  const engTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['eng_tier_1']?.teams || ENGLAND_PREMIER_CLUBS,
    4,
    seasonNumber,
    uclTeamIds,
    targetContinent
  );
  const espTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['esp_tier_1']?.teams || SPAIN_LA_LIGA_CLUBS,
    4,
    seasonNumber,
    uclTeamIds,
    targetContinent
  );
  const itaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['ita_tier_1']?.teams || ITALY_SERIE_A_CLUBS,
    3,
    seasonNumber,
    uclTeamIds,
    targetContinent
  );
  const gerTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['ger_tier_1']?.teams || GERMANY_BUNDESLIGA_CLUBS,
    3,
    seasonNumber,
    uclTeamIds,
    targetContinent
  );
  const fraTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['fra_tier_1']?.teams || FRANCE_LIGUE_1_CLUBS,
    2,
    seasonNumber,
    uclTeamIds,
    targetContinent
  );

  const candidatePool: Club[] = [
    ...eligibleQualified,
    ...engTeams,
    ...espTeams,
    ...itaTeams,
    ...gerTeams,
    ...fraTeams,
  ];

  if (userClub && isUserEuropean && !isUserInUcl) {
    const existingIdx = candidatePool.findIndex(c => c.id === userClub.id);
    if (existingIdx !== -1) {
      candidatePool[existingIdx] = userClub;
    } else if (eligibleQualified.some(q => q.id === userClub.id)) {
      candidatePool.unshift(userClub);
    }
  }

  const groupClubsMatrix = drawGroupStage(
    candidatePool,
    targetContinent,
    seasonNumber,
    'uel',
    uclTeamIds
  );

  const groupNames = [
    'المجموعة الأولى (A) - الدوري الأوروبي 🟠',
    'المجموعة الثانية (B) - الدوري الأوروبي 🔥',
    'المجموعة الثالثة (C) - الدوري الأوروبي ⚔️',
    'المجموعة الرابعة (D) - الدوري الأوروبي 🏆',
  ];

  const { groups, matches } = buildGroupStageStructure('uel', seasonNumber, groupClubsMatrix, groupNames);

  return {
    id: `uel_s${seasonNumber}`,
    competitionId: 'uel',
    name: 'الدوري الأوروبي',
    region: 'europe',
    targetContinent: 'EUROPE',
    seasonNumber,
    trophyName: 'كأس الدوري الأوروبي (UEFA Europa League) 🏆',
    prizeMoneyWinner: 35000000,
    prizeMoneyRunnerUp: 18000000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

/**
 * Smart Dispatcher to initialize the appropriate Continental Tournament
 * by competitionId ('ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2') with strict Continent Isolation & Mutual Exclusion.
 */
export function initContinentalTournamentByCode(
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2',
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const targetContinent = getTargetContinentForCompetition(competitionId);
  const eligibleTeams = (Array.isArray(allTeams) ? allTeams : []).filter(
    team => team && resolveClubContinent(team) === targetContinent
  );
  const eligibleQualified = qualifiedClubs
    ? qualifiedClubs.filter(team => team && resolveClubContinent(team) === targetContinent)
    : undefined;
  const eligibleUserClub =
    userClub && resolveClubContinent(userClub) === targetContinent ? userClub : undefined;

  switch (competitionId) {
    case 'ucl':
      return initUefaChampionsLeague(seasonNumber, eligibleTeams, eligibleUserClub, eligibleQualified, excludedClubIds);
    case 'uel':
      return initUefaEuropaLeague(seasonNumber, eligibleTeams, eligibleUserClub, eligibleQualified, excludedClubIds);
    case 'acl':
      return initAfcChampionsLeagueElite(seasonNumber, eligibleTeams, eligibleUserClub, eligibleQualified, excludedClubIds);
    case 'acl2':
      return initAfcChampionsLeagueTwo(seasonNumber, eligibleTeams, eligibleUserClub, eligibleQualified, excludedClubIds);
    case 'ccc':
      return initCafConfederationCup(seasonNumber, eligibleTeams, eligibleUserClub, eligibleQualified, excludedClubIds);
    case 'ccl':
    default:
      return initAfricanChampionsLeague(seasonNumber, eligibleTeams, eligibleUserClub, eligibleQualified, excludedClubIds);
  }
}

/**
 * Alias for `initContinentalTournamentByCode` with explicit targetContinent enforcement.
 */
export function generateContinentalCup(params: {
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2';
  targetContinent?: ContinentCode;
  seasonNumber: number;
  allTeams: Club[];
  userClub?: Club;
  qualifiedClubs?: Club[];
  excludedClubIds?: Set<string>;
}): ContinentalTournament {
  const targetContinent =
    params.targetContinent || getTargetContinentForCompetition(params.competitionId);
  const eligibleTeams = (Array.isArray(params.allTeams) ? params.allTeams : []).filter(
    team => team && resolveClubContinent(team) === targetContinent
  );
  const eligibleQualified = params.qualifiedClubs
    ? params.qualifiedClubs.filter(team => team && resolveClubContinent(team) === targetContinent)
    : undefined;
  const eligibleUserClub =
    params.userClub && resolveClubContinent(params.userClub) === targetContinent
      ? params.userClub
      : undefined;

  return initContinentalTournamentByCode(
    params.competitionId,
    params.seasonNumber,
    eligibleTeams,
    eligibleUserClub,
    eligibleQualified,
    params.excludedClubIds
  );
}

/**
 * Resolves whether a country belongs to the European (UEFA) continental region.
 */
export function isEuropeanCountry(country?: string): boolean {
  if (!country) return false;
  return resolveCountryContinent(country) === 'EUROPE';
}

/**
 * Resolves whether a country belongs to the Asian (AFC) continental region.
 */
export function isAsianCountry(country?: string): boolean {
  if (!country) return false;
  return resolveCountryContinent(country) === 'ASIA';
}

/**
 * Resolves the continental region ('africa' | 'asia' | 'europe') of the currently managed club or league.
 * Supports `club.continent`, `league.continent`, `league.region`, `club.country`, `club.countryCode`, and `league.id`.
 */
export function resolveClubContinentRegion(
  club?: Club | null,
  league?: LeagueDefinition | null
): 'africa' | 'asia' | 'europe' {
  const continentCode = resolveClubContinent(club, league);
  if (continentCode === 'EUROPE') return 'europe';
  if (continentCode === 'ASIA') return 'asia';
  return 'africa';
}

/**
 * Returns the primary and secondary continental competition codes for a given ContinentCode or region.
 */
export function getContinentalCodesForContinent(
  continentOrRegion: ContinentCode | 'africa' | 'asia' | 'europe' | 'south_america'
): {
  primaryCode: 'ccl' | 'acl' | 'ucl';
  secondaryCode: 'ccc' | 'acl2' | 'uel';
  primaryName: string;
  secondaryName: string;
  targetContinent: ContinentCode;
} {
  const norm = String(continentOrRegion || '').toUpperCase();
  if (norm === 'EUROPE') {
    return {
      primaryCode: 'ucl',
      secondaryCode: 'uel',
      primaryName: 'دوري أبطال أوروبا (UCL)',
      secondaryName: 'الدوري الأوروبي (UEL)',
      targetContinent: 'EUROPE',
    };
  }
  if (norm === 'ASIA') {
    return {
      primaryCode: 'acl',
      secondaryCode: 'acl2',
      primaryName: 'دوري أبطال آسيا للنخبة (ACL Elite)',
      secondaryName: 'دوري أبطال آسيا 2 (ACL Two)',
      targetContinent: 'ASIA',
    };
  }
  return {
    primaryCode: 'ccl',
    secondaryCode: 'ccc',
    primaryName: 'دوري أبطال إفريقيا (CAF CL)',
    secondaryName: 'كأس الكونفدرالية الإفريقية (CAF CC)',
    targetContinent: 'AFRICA',
  };
}

/**
 * Returns the allowed continental competition options for a given continent region.
 * - Africa -> ['ccl', 'ccc'] (دوري أبطال إفريقيا + كأس الكونفدرالية الإفريقية)
 * - Asia   -> ['acl', 'acl2'] (دوري أبطال آسيا للنخبة + دوري أبطال آسيا 2)
 * - Europe -> ['ucl', 'uel'] (دوري أبطال أوروبا + الدوري الأوروبي)
 */
export function getContinentalCompetitionsForRegion(region: 'africa' | 'asia' | 'europe'): Array<{
  code: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2';
  name: string;
  shortLabel: string;
  region: 'africa' | 'asia' | 'europe';
  targetContinent: ContinentCode;
  tier: 1 | 2;
}> {
  if (region === 'europe') {
    return [
      {
        code: 'ucl',
        name: 'دوري أبطال أوروبا',
        shortLabel: '🏆 دوري أبطال أوروبا',
        region: 'europe',
        targetContinent: 'EUROPE',
        tier: 1,
      },
      {
        code: 'uel',
        name: 'الدوري الأوروبي',
        shortLabel: '🟠 الدوري الأوروبي',
        region: 'europe',
        targetContinent: 'EUROPE',
        tier: 2,
      },
    ];
  }

  if (region === 'asia') {
    return [
      {
        code: 'acl',
        name: 'دوري أبطال آسيا للنخبة',
        shortLabel: '👑 أبطال آسيا للنخبة',
        region: 'asia',
        targetContinent: 'ASIA',
        tier: 1,
      },
      {
        code: 'acl2',
        name: 'دوري أبطال آسيا 2',
        shortLabel: '🌏 أبطال آسيا 2',
        region: 'asia',
        targetContinent: 'ASIA',
        tier: 2,
      },
    ];
  }

  return [
    {
      code: 'ccl',
      name: 'دوري أبطال إفريقيا',
      shortLabel: '🏆 أبطال إفريقيا',
      region: 'africa',
      targetContinent: 'AFRICA',
      tier: 1,
    },
    {
      code: 'ccc',
      name: 'كأس الكونفدرالية الإفريقية',
      shortLabel: '🌍 الكونفدرالية الإفريقية',
      region: 'africa',
      targetContinent: 'AFRICA',
      tier: 2,
    },
  ];
}

// ----------------------------------------------------
// 5. KNOCKOUT MATCH SIMULATOR WITH EXTRA TIME & PENALTIES
// ----------------------------------------------------

export function simulateKnockoutMatch(
  homeTeam?: Club,
  awayTeam?: Club
): {
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  winnerTeamId: string;
  events: MatchEvent[];
  stats: MatchStats;
} {
  const safeHome = homeTeam || ({ id: 'home_dummy', name: 'الفريق المضيف', shortName: 'مض', reputation: 50, players: [] } as any);
  const safeAway = awayTeam || ({ id: 'away_dummy', name: 'الفريق الضيف', shortName: 'ضف', reputation: 50, players: [] } as any);
  const baseResult = simulateMatch(safeHome, safeAway, safeHome?.tactics, safeAway?.tactics);
  let homeScore = baseResult.homeScore;
  let awayScore = baseResult.awayScore;
  let homePenalties: number | undefined = undefined;
  let awayPenalties: number | undefined = undefined;
  let winnerTeamId = '';

  if (homeScore > awayScore) {
    winnerTeamId = safeHome.id;
  } else if (awayScore > homeScore) {
    winnerTeamId = safeAway.id;
  } else {
    // Scores are tied at 90' -> Extra Time (الوقت الإضافي 30 دقيقة) + Penalty Shootout if still tied
    baseResult.events.push({
      minute: 90,
      type: 'commentary',
      teamId: safeHome.id,
      description: `⏱️ نهاية الوقت الأصلي بالتعادل (${homeScore} - ${awayScore}) والاحتكام إلى شوطين إضافيين!`,
    });

    const homeStr = calculateTeamStrength(safeHome, safeHome?.tactics, safeHome?.manager);
    const awayStr = calculateTeamStrength(safeAway, safeAway?.tactics, safeAway?.manager);
    const homePower = (homeStr.overall * 0.50) + (homeStr.squadStrength * 0.32) + (homeStr.managerRating * 0.18);
    const awayPower = (awayStr.overall * 0.50) + (awayStr.squadStrength * 0.32) + (awayStr.managerRating * 0.18);
    const powerDiff = homePower - awayPower;

    // Extra Time (minutes 91-120) heavily favors the team with stronger Players + Manager + License
    const extraTimeRoll = Math.random();
    const homeEtWinThreshold = Math.max(0.06, Math.min(0.65, 0.25 + (powerDiff * 0.045)));
    const awayEtWinThreshold = homeEtWinThreshold + Math.max(0.06, Math.min(0.65, 0.25 - (powerDiff * 0.045)));

    if (extraTimeRoll < homeEtWinThreshold) {
      homeScore += 1;
      winnerTeamId = safeHome.id;
      const scorer = safeHome.players?.find((p: any) => p.positionCategory === 'FWD' || p.positionCategory === 'MID') || safeHome.players?.[0];
      baseResult.events.push({
        minute: Math.floor(Math.random() * 25) + 95,
        type: 'goal',
        teamId: safeHome.id,
        playerId: scorer?.id,
        playerName: scorer?.name || safeHome.shortName || safeHome.name,
        description: `⚽ هدف قاتل في الوقت الإضافي لصالح (${safeHome.shortName || safeHome.name}) يحسم بطاقة التأهل!`,
      });
    } else if (extraTimeRoll < awayEtWinThreshold) {
      awayScore += 1;
      winnerTeamId = safeAway.id;
      const scorer = safeAway.players?.find((p: any) => p.positionCategory === 'FWD' || p.positionCategory === 'MID') || safeAway.players?.[0];
      baseResult.events.push({
        minute: Math.floor(Math.random() * 25) + 95,
        type: 'goal',
        teamId: safeAway.id,
        playerId: scorer?.id,
        playerName: scorer?.name || safeAway.shortName || safeAway.name,
        description: `⚽ هدف قاتل في الوقت الإضافي لصالح (${safeAway.shortName || safeAway.name}) يحسم بطاقة التأهل!`,
      });
    } else {
      // Penalty shootout weighted by composite power & goalkeeper/shooting quality
      let homeP = Math.floor(Math.random() * 2 + 3); // 3 to 4
      let awayP = Math.floor(Math.random() * 2 + 3);

      const homePenWinProb = Math.max(0.12, Math.min(0.88, 0.50 + (powerDiff * 0.055)));
      if (Math.random() < homePenWinProb) {
        homeP = Math.max(homeP, awayP + 1);
      } else {
        awayP = Math.max(awayP, homeP + 1);
      }

      homePenalties = homeP;
      awayPenalties = awayP;
      winnerTeamId = homeP > awayP ? safeHome.id : safeAway.id;

      const winnerClub = winnerTeamId === safeHome.id ? safeHome : safeAway;
      baseResult.events.push({
        minute: 120,
        type: 'commentary',
        teamId: winnerTeamId,
        description: `🎯 حسمت ركلات الترجيح الموقعة لصالح (${winnerClub.shortName || winnerClub.name}) بنتيجة (${homeP} - ${awayP}) بعد التعادل في الوقتين الأصلي والإضافي!`,
      });
    }
  }

  return {
    homeScore,
    awayScore,
    homePenalties,
    awayPenalties,
    winnerTeamId,
    events: baseResult.events,
    stats: baseResult.stats,
  };
}

// ----------------------------------------------------
// 6. ADVANCEMENT OF CONTINENTAL TOURNAMENT
// ----------------------------------------------------

/**
 * Pure, immutable recalculation of Continental Group Stage standings from all played matches.
 * Syncs played results from externalFixtures (if provided), computes played, won, drawn, lost,
 * goalsFor, goalsAgainst, goalDifference, and points from scratch without direct mutation,
 * and sorts each group by points DESC, goalDifference DESC, goalsFor DESC.
 */
export function recalculateContinentalGroupStandings(
  tournament: ContinentalTournament,
  externalFixtures?: Fixture[]
): ContinentalTournament {
  if (!tournament || !Array.isArray(tournament.groups)) {
    return tournament;
  }

  const extContFixtures = Array.isArray(externalFixtures)
    ? externalFixtures.filter(
        f =>
          f &&
          f.isPlayed &&
          (f.competitionType === 'CONTINENTAL_CUP' ||
            f.competitionType === 'continental' ||
            f.competitionId === tournament.competitionId ||
            String(f.id || '').startsWith(`${tournament.competitionId}_`))
      )
    : [];

  // 1. Immutably sync matches with any played externalFixtures
  let syncedMatches: ContinentalMatch[] = (tournament.matches || []).map(m => {
    if (m.isPlayed && m.homeScore !== undefined && m.awayScore !== undefined) {
      return { ...m };
    }
    const matchingFix = extContFixtures.find(
      f =>
        f.id === m.id ||
        (f.homeTeamId === m.homeTeamId &&
          f.awayTeamId === m.awayTeamId &&
          ((f.matchday && m.matchday && f.matchday === m.matchday) ||
            (f.stage || 'group') === (m.stage || 'group')))
    );
    if (matchingFix && matchingFix.isPlayed) {
      const hScore = Number(matchingFix.homeScore ?? 0);
      const aScore = Number(matchingFix.awayScore ?? 0);
      return {
        ...m,
        homeScore: hScore,
        awayScore: aScore,
        homePenalties: matchingFix.homePenalties ?? m.homePenalties,
        awayPenalties: matchingFix.awayPenalties ?? m.awayPenalties,
        isPlayed: true,
        winnerTeamId:
          matchingFix.winnerTeamId ||
          (hScore > aScore ? m.homeTeamId : aScore > hScore ? m.awayTeamId : undefined),
        events: matchingFix.events || m.events,
        stats: matchingFix.stats || m.stats,
      };
    }
    return { ...m };
  });

  // 2. Immutably rebuild each group's standings from all played group-stage matches
  const updatedGroups: ContinentalGroup[] = tournament.groups.map(group => {
    const statsMap = new Map<string, ContinentalGroupStanding>();

    group.teamIds.forEach(teamId => {
      const existingStanding = (group.standings || []).find(s => s && s.teamId === teamId);
      const teamName = existingStanding?.teamName || findClubInWorld(teamId)?.name || teamId;

      statsMap.set(teamId, {
        teamId,
        teamName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      });
    });

    const playedGroupMatches = syncedMatches.filter(
      m =>
        m.stage === 'group' &&
        m.isPlayed &&
        (m.groupId === group.id ||
          (group.teamIds.includes(m.homeTeamId) && group.teamIds.includes(m.awayTeamId)))
    );

    playedGroupMatches.forEach(m => {
      const hScore = Number(m.homeScore ?? 0);
      const aScore = Number(m.awayScore ?? 0);
      const homeRow = statsMap.get(m.homeTeamId);
      const awayRow = statsMap.get(m.awayTeamId);

      if (homeRow) {
        const isWin = hScore > aScore;
        const isDraw = hScore === aScore;
        const isLoss = hScore < aScore;
        const nextGF = homeRow.goalsFor + hScore;
        const nextGA = homeRow.goalsAgainst + aScore;
        statsMap.set(m.homeTeamId, {
          ...homeRow,
          played: homeRow.played + 1,
          won: homeRow.won + (isWin ? 1 : 0),
          drawn: homeRow.drawn + (isDraw ? 1 : 0),
          lost: homeRow.lost + (isLoss ? 1 : 0),
          goalsFor: nextGF,
          goalsAgainst: nextGA,
          goalDifference: nextGF - nextGA,
          points: homeRow.points + (isWin ? 3 : isDraw ? 1 : 0),
        });
      }

      if (awayRow) {
        const isWin = aScore > hScore;
        const isDraw = hScore === aScore;
        const isLoss = aScore < hScore;
        const nextGF = awayRow.goalsFor + aScore;
        const nextGA = awayRow.goalsAgainst + hScore;
        statsMap.set(m.awayTeamId, {
          ...awayRow,
          played: awayRow.played + 1,
          won: awayRow.won + (isWin ? 1 : 0),
          drawn: awayRow.drawn + (isDraw ? 1 : 0),
          lost: awayRow.lost + (isLoss ? 1 : 0),
          goalsFor: nextGF,
          goalsAgainst: nextGA,
          goalDifference: nextGF - nextGA,
          points: awayRow.points + (isWin ? 3 : isDraw ? 1 : 0),
        });
      }
    });

    const sortedStandings = Array.from(statsMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    return {
      ...group,
      teamIds: [...group.teamIds],
      standings: sortedStandings,
    };
  });

  // 3. Check if all 6 group matchdays (all 24 group matches) are completed to unlock Quarter-Finals
  let nextStage = tournament.currentStage;
  const allGroupMatches = syncedMatches.filter(m => m.stage === 'group');
  const hasQuarterMatches = syncedMatches.some(m => m.stage === 'quarter');

  if (
    allGroupMatches.length > 0 &&
    allGroupMatches.every(m => m.isPlayed) &&
    !hasQuarterMatches
  ) {
    const qualifiedFirst: string[] = [];
    const qualifiedSecond: string[] = [];

    updatedGroups.forEach(g => {
      if (g.standings.length >= 2) {
        qualifiedFirst.push(g.standings[0].teamId);
        qualifiedSecond.push(g.standings[1].teamId);
      }
    });

    if (qualifiedFirst.length === 4 && qualifiedSecond.length === 4) {
      const qfPairs = [
        { home: qualifiedFirst[0], away: qualifiedSecond[1] },
        { home: qualifiedFirst[1], away: qualifiedSecond[0] },
        { home: qualifiedFirst[2], away: qualifiedSecond[3] },
        { home: qualifiedFirst[3], away: qualifiedSecond[2] },
      ];

      const newQfMatches: ContinentalMatch[] = qfPairs.map((pair, idx) => ({
        id: `${tournament.competitionId}_qf_${idx + 1}_s${tournament.seasonNumber}`,
        stage: 'quarter',
        stageName: `${tournament.name} - ربع النهائي (${idx + 1})`,
        roundTrigger: 18,
        homeTeamId: pair.home,
        awayTeamId: pair.away,
        isPlayed: false,
      }));

      syncedMatches = [...syncedMatches, ...newQfMatches];
      nextStage = 'quarter';
    }
  }

  // Check if anything actually changed compared to the input tournament to preserve reference stability
  const origMatches = tournament.matches || [];
  let matchesChanged = syncedMatches.length !== origMatches.length;
  if (!matchesChanged) {
    for (let i = 0; i < syncedMatches.length; i++) {
      const prevM = origMatches[i];
      const nextM = syncedMatches[i];
      if (
        !prevM ||
        prevM.id !== nextM.id ||
        Boolean(prevM.isPlayed) !== Boolean(nextM.isPlayed) ||
        prevM.homeScore !== nextM.homeScore ||
        prevM.awayScore !== nextM.awayScore ||
        prevM.homePenalties !== nextM.homePenalties ||
        prevM.awayPenalties !== nextM.awayPenalties ||
        prevM.winnerTeamId !== nextM.winnerTeamId ||
        prevM.homeTeamId !== nextM.homeTeamId ||
        prevM.awayTeamId !== nextM.awayTeamId
      ) {
        matchesChanged = true;
        break;
      }
    }
  }

  const origGroups = tournament.groups || [];
  let groupsChanged = updatedGroups.length !== origGroups.length;
  if (!groupsChanged) {
    for (let gIdx = 0; gIdx < updatedGroups.length; gIdx++) {
      const prevG = origGroups[gIdx];
      const nextG = updatedGroups[gIdx];
      if (!prevG || (prevG.standings || []).length !== nextG.standings.length) {
        groupsChanged = true;
        break;
      }
      for (let sIdx = 0; sIdx < nextG.standings.length; sIdx++) {
        const prevS = prevG.standings[sIdx];
        const nextS = nextG.standings[sIdx];
        if (
          !prevS ||
          prevS.teamId !== nextS.teamId ||
          prevS.played !== nextS.played ||
          prevS.won !== nextS.won ||
          prevS.drawn !== nextS.drawn ||
          prevS.lost !== nextS.lost ||
          prevS.goalsFor !== nextS.goalsFor ||
          prevS.goalsAgainst !== nextS.goalsAgainst ||
          prevS.goalDifference !== nextS.goalDifference ||
          prevS.points !== nextS.points
        ) {
          groupsChanged = true;
          break;
        }
      }
      if (groupsChanged) break;
    }
  }

  if (!matchesChanged && !groupsChanged && nextStage === tournament.currentStage) {
    return tournament;
  }

  return {
    ...tournament,
    currentStage: nextStage,
    groups: groupsChanged ? updatedGroups : tournament.groups,
    matches: matchesChanged ? syncedMatches : tournament.matches,
  };
}

export function advanceContinentalTournament(
  tournament: ContinentalTournament,
  currentRound: number,
  allTeamsMap: Map<string, Club>,
  userClub?: Club | null,
  options?: { simulateUserMatches?: boolean; externalFixtures?: Fixture[] }
): {
  updatedTournament: ContinentalTournament;
  userMatchThisRound?: ContinentalMatch;
  newsMessage?: string;
} {
  if (!tournament || tournament.isCompleted) {
    return { updatedTournament: tournament };
  }

  const shouldSimUser = options?.simulateUserMatches === true;
  // First sync any already-played fixtures and recalculate current standings immutably
  let baseTournament = recalculateContinentalGroupStandings(tournament, options?.externalFixtures);
  let matches = baseTournament.matches.map(m => ({ ...m }));
  let didMutateKnockout = false;
  let userMatchThisRound: ContinentalMatch | undefined = undefined;
  let newsMessage: string | undefined = undefined;

  const findClub = (id: string): Club => {
    return (
      allTeamsMap.get(id) ||
      findClubInWorld(id) || {
        id,
        name: 'نادي منافس',
        shortName: 'منافس',
        city: 'القاهرة',
        primaryColor: '#334155',
        secondaryColor: '#ffffff',
        budget: 1000000,
        transferBudget: 500000,
        wageBudgetMonthly: 50000,
        reputation: 60,
        division: 1,
        country: 'مصر',
        facilities: {
          stadiumName: 'ستاد المنافس',
          stadiumCapacity: 20000,
          stadiumLevel: 3,
          medicalCenterLevel: 3,
          trainingGroundLevel: 3,
          youthAcademyLevel: 3,
          scoutingNetworkLevel: 3,
        },
        sponsors: [],
        isUserClub: false,
        players: [],
      }
    );
  };

  // =========================================================================
  // 1. GROUP STAGE: STRICT SEQUENTIAL SINGLE-MATCHDAY PROGRESSION (1..6)
  // =========================================================================
  const unplayedGroupMatches = matches.filter(m => m.stage === 'group' && !m.isPlayed);

  if (unplayedGroupMatches.length > 0) {
    // Find the earliest active unplayed matchday (1 to 6)
    const currentMatchday = Math.min(...unplayedGroupMatches.map(m => m.matchday || 1));
    const matchdayMatches = unplayedGroupMatches.filter(m => (m.matchday || 1) === currentMatchday);
    const matchdayTrigger = matchdayMatches[0]?.roundTrigger || 1;

    // A. Has this matchday arrived in the league calendar?
    if (currentRound < matchdayTrigger) {
      // Not yet reached — do not simulate or advance anything!
      return { updatedTournament: baseTournament };
    }

    // B. Check if user is involved in this active matchday
    const userMatchInThisMatchday = userClub
      ? matchdayMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      : undefined;

    // STRICT RULE: If user is involved and hasn't played their match, HOLD THE TOURNAMENT!
    // The user MUST play their own match live; never simulate AI matches ahead of the user or simulate user's match!
    if (userMatchInThisMatchday && !userMatchInThisMatchday.isPlayed) {
      return {
        updatedTournament: baseTournament,
        userMatchThisRound: userMatchInThisMatchday,
      };
    }

    // C. User has played their match for this matchday (or isn't in tournament):
    // Simulate ONLY the remaining unplayed AI matches of THIS active matchday (leave future matchdays untouched!)
    let groupSimulatedCount = 0;
    matches = matches.map(m => {
      if (m.stage !== 'group' || m.isPlayed || (m.matchday || 1) !== currentMatchday) {
        return m;
      }
      const isUserInvolved = Boolean(
        userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      );
      if (isUserInvolved) {
        return m;
      }

      groupSimulatedCount += 1;
      const homeTeam = findClub(m.homeTeamId);
      const awayTeam = findClub(m.awayTeamId);
      const res = simulateMatch(homeTeam, awayTeam, homeTeam.tactics, awayTeam.tactics);

      return {
        ...m,
        homeScore: res.homeScore,
        awayScore: res.awayScore,
        isPlayed: true,
        winnerTeamId:
          res.homeScore > res.awayScore
            ? homeTeam.id
            : res.awayScore > res.homeScore
            ? awayTeam.id
            : undefined,
        events: res.events,
        stats: res.stats,
      };
    });

    if (groupSimulatedCount === 0) {
      return { updatedTournament: baseTournament, userMatchThisRound };
    }

    newsMessage = `انتهت مباريات الجولة ${currentMatchday} من دور المجموعات لـ ${tournament.name}!`;

    // Recalculate standings immutably
    const updatedTournament = recalculateContinentalGroupStandings(
      {
        ...baseTournament,
        matches,
      },
      options?.externalFixtures
    );

    // If this completed all 6 group matchdays, recalculateContinentalGroupStandings will have generated QFs
    if (
      updatedTournament.currentStage === 'quarter' &&
      baseTournament.currentStage === 'group'
    ) {
      return {
        updatedTournament,
        userMatchThisRound,
        newsMessage: `اكتمل دور المجموعات (6 جولات) وتحددت مواجهات الدور ربع النهائي لـ ${tournament.name}! 🌟`,
      };
    }

    // Return immediately for this matchday — DO NOT simulate matchday + 1 in the same tick!
    return {
      updatedTournament,
      userMatchThisRound,
      newsMessage,
    };
  }

  // =========================================================================
  // 2. KNOCKOUT: QUARTERFINALS (4 Matches)
  // =========================================================================
  let updatedTournament = { ...baseTournament, matches };
  const qfMatches = matches.filter(m => m.stage === 'quarter');

  if (qfMatches.length > 0) {
    const unplayedQFs = qfMatches.filter(m => !m.isPlayed);
    const userQfMatch = userClub
      ? qfMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      : undefined;
    const isUserQfPlayed = Boolean(userQfMatch && userQfMatch.isPlayed);
    const qfTrigger = qfMatches[0]?.roundTrigger || 18;

    // If user is in QF and hasn't played yet, and currentRound < trigger, return and wait
    if (userQfMatch && !userQfMatch.isPlayed && !shouldSimUser) {
      if (currentRound >= qfTrigger) {
        userMatchThisRound = userQfMatch;
      }
      return {
        updatedTournament: baseTournament,
        userMatchThisRound,
      };
    }

    // If user already played their QF, or user is not in QF, or round trigger has arrived:
    // Resolve any remaining unplayed AI QF matches immediately!
    if (unplayedQFs.length > 0 && (isUserQfPlayed || currentRound >= qfTrigger || shouldSimUser)) {
      matches = matches.map(m => {
        if (m.stage !== 'quarter' || m.isPlayed) return m;
        const isUserInvolved = Boolean(
          userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
        );
        if (isUserInvolved && !shouldSimUser) return m;

        didMutateKnockout = true;
        const homeTeam = findClub(m.homeTeamId);
        const awayTeam = findClub(m.awayTeamId);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);

        return {
          ...m,
          homeScore: res.homeScore,
          awayScore: res.awayScore,
          homePenalties: res.homePenalties,
          awayPenalties: res.awayPenalties,
          isPlayed: true,
          winnerTeamId: res.winnerTeamId,
          events: res.events,
          stats: res.stats,
        };
      });
    }

    const allQFs = matches.filter(m => m.stage === 'quarter');
    const hasSFs = matches.some(m => m.stage === 'semi');
    if (allQFs.length >= 4 && allQFs.every(m => m.isPlayed) && !hasSFs) {
      didMutateKnockout = true;
      const sfWinners = allQFs.map(m => m.winnerTeamId || m.homeTeamId);
      updatedTournament.currentStage = 'semi';
      const sfTrigger = Math.max(22, currentRound + 2);
      matches = [
        ...matches,
        {
          id: `${tournament.competitionId}_sf_1_s${tournament.seasonNumber}`,
          stage: 'semi',
          stageName: `${tournament.name} - نصف النهائي (1)`,
          roundTrigger: sfTrigger,
          homeTeamId: sfWinners[0],
          awayTeamId: sfWinners[1],
          isPlayed: false,
        },
        {
          id: `${tournament.competitionId}_sf_2_s${tournament.seasonNumber}`,
          stage: 'semi',
          stageName: `${tournament.name} - نصف النهائي (2)`,
          roundTrigger: sfTrigger,
          homeTeamId: sfWinners[2],
          awayTeamId: sfWinners[3],
          isPlayed: false,
        },
      ];
      newsMessage = `إثارة بالغة في ربع نهائي ${tournament.name} وتأهل الفرق الأربعة إلى المربع الذهبي!`;
    }
  }

  // =========================================================================
  // 3. KNOCKOUT: SEMIFINALS (2 Matches)
  // =========================================================================
  const sfMatches = matches.filter(m => m.stage === 'semi');

  if (sfMatches.length > 0) {
    const unplayedSFs = sfMatches.filter(m => !m.isPlayed);
    const userSfMatch = userClub
      ? sfMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      : undefined;
    const isUserSfPlayed = Boolean(userSfMatch && userSfMatch.isPlayed);
    const sfTrigger = sfMatches[0]?.roundTrigger || 22;

    if (userSfMatch && !userSfMatch.isPlayed && !shouldSimUser) {
      if (currentRound >= sfTrigger) {
        userMatchThisRound = userSfMatch;
      }
      return {
        updatedTournament: didMutateKnockout ? { ...updatedTournament, matches } : baseTournament,
        userMatchThisRound,
      };
    }

    if (unplayedSFs.length > 0 && (isUserSfPlayed || currentRound >= sfTrigger || shouldSimUser)) {
      matches = matches.map(m => {
        if (m.stage !== 'semi' || m.isPlayed) return m;
        const isUserInvolved = Boolean(
          userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
        );
        if (isUserInvolved && !shouldSimUser) return m;

        didMutateKnockout = true;
        const homeTeam = findClub(m.homeTeamId);
        const awayTeam = findClub(m.awayTeamId);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);

        return {
          ...m,
          homeScore: res.homeScore,
          awayScore: res.awayScore,
          homePenalties: res.homePenalties,
          awayPenalties: res.awayPenalties,
          isPlayed: true,
          winnerTeamId: res.winnerTeamId,
          events: res.events,
          stats: res.stats,
        };
      });
    }

    const allSFs = matches.filter(m => m.stage === 'semi');
    const hasFinal = matches.some(m => m.stage === 'final');
    if (allSFs.length >= 2 && allSFs.every(m => m.isPlayed) && !hasFinal) {
      didMutateKnockout = true;
      const finalWinners = allSFs.map(m => m.winnerTeamId || m.homeTeamId);
      updatedTournament.currentStage = 'final';
      const finalTrigger = Math.max(28, currentRound + 3);
      matches = [
        ...matches,
        {
          id: `${tournament.competitionId}_final_s${tournament.seasonNumber}`,
          stage: 'final',
          stageName: `نهائي ${tournament.name} الكبير 🏆`,
          roundTrigger: finalTrigger,
          homeTeamId: finalWinners[0],
          awayTeamId: finalWinners[1],
          isPlayed: false,
        },
      ];
      newsMessage = `تحدد طرفا النهائي الحلم لبطولة ${tournament.name}! 🏆`;
    }
  }

  // =========================================================================
  // 4. KNOCKOUT: FINAL (1 Match)
  // =========================================================================
  const existingFinalMatch = matches.find(m => m.stage === 'final');
  if (existingFinalMatch) {
    if (!existingFinalMatch.isPlayed) {
      const finalTrigger = existingFinalMatch.roundTrigger || 28;
      if (currentRound < finalTrigger) {
        return {
          updatedTournament: didMutateKnockout ? { ...updatedTournament, matches } : baseTournament,
        };
      }

      const isUserInvolved = Boolean(
        userClub && (existingFinalMatch.homeTeamId === userClub.id || existingFinalMatch.awayTeamId === userClub.id)
      );

      if (isUserInvolved && !shouldSimUser) {
        return {
          updatedTournament: didMutateKnockout ? { ...updatedTournament, matches } : baseTournament,
          userMatchThisRound: existingFinalMatch,
        };
      }

      const homeTeam = findClub(existingFinalMatch.homeTeamId);
      const awayTeam = findClub(existingFinalMatch.awayTeamId);
      const res = simulateKnockoutMatch(homeTeam, awayTeam);
      const runnerUpId = res.winnerTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;

      matches = matches.map(m =>
        m.id === existingFinalMatch.id
          ? {
              ...m,
              homeScore: res.homeScore,
              awayScore: res.awayScore,
              homePenalties: res.homePenalties,
              awayPenalties: res.awayPenalties,
              isPlayed: true,
              winnerTeamId: res.winnerTeamId,
              events: res.events,
              stats: res.stats,
            }
          : m
      );

      const winnerClub = findClub(res.winnerTeamId);
      newsMessage = `ألف مبروك لفريق (${winnerClub.name}) التتويج بلقب ${tournament.name} ورفع ${tournament.trophyName}! 🏆🎉`;

      return {
        updatedTournament: {
          ...updatedTournament,
          matches,
          isCompleted: true,
          currentStage: 'completed',
          winnerClubId: res.winnerTeamId,
          runnerUpClubId: runnerUpId,
        },
        userMatchThisRound,
        newsMessage,
      };
    } else {
      // Final was already played (e.g., interactively by user) -> mark tournament completed
      const resolvedWinner =
        existingFinalMatch.winnerTeamId ||
        ((existingFinalMatch.homeScore ?? 0) > (existingFinalMatch.awayScore ?? 0)
          ? existingFinalMatch.homeTeamId
          : (existingFinalMatch.awayScore ?? 0) > (existingFinalMatch.homeScore ?? 0)
          ? existingFinalMatch.awayTeamId
          : (existingFinalMatch.homePenalties ?? 0) >= (existingFinalMatch.awayPenalties ?? 0)
          ? existingFinalMatch.homeTeamId
          : existingFinalMatch.awayTeamId);
      const runnerUpId =
        resolvedWinner === existingFinalMatch.homeTeamId
          ? existingFinalMatch.awayTeamId
          : existingFinalMatch.homeTeamId;

      if (
        !didMutateKnockout &&
        baseTournament.isCompleted &&
        baseTournament.currentStage === 'completed' &&
        baseTournament.winnerClubId === resolvedWinner &&
        baseTournament.runnerUpClubId === runnerUpId
      ) {
        return {
          updatedTournament: baseTournament,
          userMatchThisRound,
        };
      }

      return {
        updatedTournament: {
          ...updatedTournament,
          matches,
          isCompleted: true,
          currentStage: 'completed',
          winnerClubId: resolvedWinner,
          runnerUpClubId: runnerUpId,
        },
        userMatchThisRound,
        newsMessage,
      };
    }
  }

  if (!didMutateKnockout) {
    return {
      updatedTournament: baseTournament,
      userMatchThisRound,
      newsMessage,
    };
  }

  return {
    updatedTournament: {
      ...updatedTournament,
      matches,
    },
    userMatchThisRound,
    newsMessage,
  };
}

/**
 * Repairs continental tournament integrity to prevent phantom progression,
 * premature completions, or unplayed user matches being skipped.
 */
export function repairContinentalTournamentIntegrity(
  tournament: ContinentalTournament | null | undefined,
  fixtures: Fixture[] = [],
  userClub?: Club | null,
  currentRound: number = 1,
  seasonNumber: number = 1,
  allTeams: Club[] = []
): { updatedTournament: ContinentalTournament | null; updatedFixtures: Fixture[]; repaired: boolean } {
  if (!tournament || !Array.isArray(tournament.matches)) {
    return { updatedTournament: tournament || null, updatedFixtures: fixtures, repaired: false };
  }

  let repaired = false;
  let matches = tournament.matches.map(m => ({ ...m }));
  let updatedFixtures = fixtures.map(f => ({ ...f }));

  const userParticipates = Boolean(
    userClub &&
    (tournament.groups.some(g => g.teamIds.includes(userClub.id)) ||
      matches.some(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id))
  );

  // Check 1: Premature completion or phantom knockout rounds
  // - If tournament is marked isCompleted without a played final while currentRound < 14
  // - OR if knockout matches exist while currentRound < 14 (group stage triggers run up to round 16)
  // - OR if user is in tournament and has 0 played continental matches/fixtures, but knockout stages were already generated
  const hasKnockoutMatches = matches.some(m => m.stage && m.stage !== 'group');
  const hasPlayedFinal = matches.some(m => m.stage === 'final' && m.isPlayed);
  const userContFixPlayedCount = userParticipates
    ? updatedFixtures.filter(
        f =>
          (f.competitionType === 'CONTINENTAL_CUP' || f.competitionType === 'continental') &&
          f.isPlayed &&
          userClub &&
          (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
      ).length +
      matches.filter(
        m =>
          m.isPlayed &&
          userClub &&
          (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      ).length
    : 0;

  const isPrematureComplete = tournament.isCompleted && currentRound < 14 && !hasPlayedFinal;
  const isPrematureKnockout = hasKnockoutMatches && currentRound < 14;
  const isPrematureSkip = userParticipates && hasKnockoutMatches && userContFixPlayedCount === 0;

  // Check 1.5: Strict Continent Isolation Integrity
  // If any club in groups or matches belongs to a foreign continent (e.g., Asian or European club inside CAF CL/CC),
  // immediately reinitialize the tournament with strict continent isolation!
  const targetContinent =
    tournament.targetContinent || getTargetContinentForCompetition(tournament.competitionId);
  const findClubRef = (clubId: string): Club | undefined => {
    if (userClub && userClub.id === clubId) return userClub;
    return allTeams.find(t => t.id === clubId) || findClubInWorld(clubId);
  };
  const hasForeignContinentClub =
    (Array.isArray(tournament.groups) &&
      tournament.groups.some(g =>
        Array.isArray(g.teamIds) &&
        g.teamIds.some(tid => {
          const c = findClubRef(tid);
          return c ? resolveClubContinent(c) !== targetContinent : false;
        })
      )) ||
    matches.some(m => {
      const h = findClubRef(m.homeTeamId);
      const a = findClubRef(m.awayTeamId);
      return (
        (h ? resolveClubContinent(h) !== targetContinent : false) ||
        (a ? resolveClubContinent(a) !== targetContinent : false)
      );
    });

  if (isPrematureComplete || isPrematureKnockout || isPrematureSkip || hasForeignContinentClub) {
    // Reinitialize a clean, pristine group-stage tournament strictly isolated to targetContinent
    const userContinent = userClub ? resolveClubContinent(userClub) : targetContinent;
    const defaultCodes = getContinentalCodesForContinent(userContinent);
    const defaultCode =
      resolveClubContinent(userClub) === targetContinent
        ? ((tournament.competitionId as 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2') || defaultCodes.primary)
        : defaultCodes.primary;
    const fallbackClubs = getContinentClubPool(
      getTargetContinentForCompetition(defaultCode),
      allTeams,
      userClub || undefined
    );
    const cleanTournament = initContinentalTournamentByCode(
      defaultCode,
      seasonNumber,
      allTeams.length > 0 ? allTeams : fallbackClubs,
      userClub || undefined
    );

    // Remove any orphaned continental knockout fixtures or foreign-continent fixtures from updatedFixtures
    updatedFixtures = updatedFixtures.filter(f => {
      const isThisCont =
        (f.competitionType === 'CONTINENTAL_CUP' || f.competitionType === 'continental') &&
        (!f.competitionId || f.competitionId === tournament.competitionId);
      if (isThisCont && (hasForeignContinentClub || (f.stage && f.stage !== 'group'))) {
        return false;
      }
      return true;
    });

    // Reset any group fixtures for this tournament that didn't have real user gameplay
    updatedFixtures = updatedFixtures.map(f => {
      const isThisCont =
        (f.competitionType === 'CONTINENTAL_CUP' || f.competitionType === 'continental') &&
        (!f.competitionId || f.competitionId === tournament.competitionId);
      if (isThisCont && f.stage === 'group' && f.isPlayed) {
        if (userParticipates && (f.homeTeamId === userClub?.id || f.awayTeamId === userClub?.id) && userContFixPlayedCount === 0) {
          return {
            ...f,
            isPlayed: false,
            homeScore: undefined,
            awayScore: undefined,
            winnerTeamId: undefined,
          };
        }
      }
      return f;
    });

    try {
      localStorage.removeItem('football_game_save_africanChampionsLeague');
      localStorage.removeItem(`football_game_save_contCache_s${seasonNumber}_${defaultCode}`);
      localStorage.removeItem(`football_game_save_contCache_s${seasonNumber}_${tournament.competitionId}`);
    } catch {}

    return {
      updatedTournament: cleanTournament,
      updatedFixtures,
      repaired: true,
    };
  }

  // Check 2.5: Knockout Qualification Guarantee (User progression into SF and Final)
  const userQf = matches.find(
    m => m.stage === 'quarter' && (m.homeTeamId === userClub?.id || m.awayTeamId === userClub?.id)
  );
  const userWonQf = Boolean(
    userQf &&
    userQf.isPlayed &&
    userQf.homeScore !== undefined &&
    userQf.awayScore !== undefined &&
    (userQf.winnerTeamId === userClub?.id ||
      (userQf.homeTeamId === userClub?.id && (userQf.homeScore > userQf.awayScore || (userQf.homePenalties !== undefined && userQf.homePenalties > (userQf.awayPenalties || 0)))) ||
      (userQf.awayTeamId === userClub?.id && (userQf.awayScore > userQf.homeScore || (userQf.awayPenalties !== undefined && userQf.awayPenalties > (userQf.homePenalties || 0)))))
  );

  if (userWonQf) {
    if (userQf && userQf.winnerTeamId !== userClub?.id) {
      userQf.winnerTeamId = userClub?.id;
      repaired = true;
    }
    // 1. Resolve remaining AI QFs
    matches.forEach(m => {
      if (m.stage === 'quarter' && !m.isPlayed) {
        const homeTeam = allTeams.find(t => t.id === m.homeTeamId) || findClubInWorld(m.homeTeamId) || ({ id: m.homeTeamId, name: 'فريق قاري', continent: targetContinent } as any);
        const awayTeam = allTeams.find(t => t.id === m.awayTeamId) || findClubInWorld(m.awayTeamId) || ({ id: m.awayTeamId, name: 'فريق قاري', continent: targetContinent } as any);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.homePenalties = res.homePenalties;
        m.awayPenalties = res.awayPenalties;
        m.winnerTeamId = res.winnerTeamId;
        m.isPlayed = true;
        repaired = true;
      }
    });

    // 2. Ensure Semifinals exist and user is placed into one of them
    let sfMatches = matches.filter(m => m.stage === 'semi');
    const userInSf = sfMatches.some(m => m.homeTeamId === userClub?.id || m.awayTeamId === userClub?.id);
    if (sfMatches.length < 2 || !userInSf) {
      const qfWinners = matches.filter(m => m.stage === 'quarter').map(m => m.winnerTeamId || m.homeTeamId);
      const otherWinners = qfWinners.filter(id => id !== userClub?.id);
      const sf1Home = userClub?.id || qfWinners[0];
      const sf1Away = otherWinners[0] || qfWinners[1] || 'ccl_ai_1';
      const sf2Home = otherWinners[1] || qfWinners[2] || 'ccl_ai_2';
      const sf2Away = otherWinners[2] || qfWinners[3] || 'ccl_ai_3';
      const sfTrigger = Math.max(22, currentRound + 2);

      matches = matches.filter(m => m.stage !== 'semi');
      matches.push(
        {
          id: `${tournament.competitionId}_sf_1_s${tournament.seasonNumber}`,
          stage: 'semi',
          stageName: `${tournament.name} - نصف النهائي (1)`,
          roundTrigger: sfTrigger,
          homeTeamId: sf1Home,
          awayTeamId: sf1Away,
          isPlayed: false,
        },
        {
          id: `${tournament.competitionId}_sf_2_s${tournament.seasonNumber}`,
          stage: 'semi',
          stageName: `${tournament.name} - نصف النهائي (2)`,
          roundTrigger: sfTrigger,
          homeTeamId: sf2Home,
          awayTeamId: sf2Away,
          isPlayed: false,
        }
      );
      repaired = true;
    }
  }

  const userSf = matches.find(
    m => m.stage === 'semi' && (m.homeTeamId === userClub?.id || m.awayTeamId === userClub?.id)
  );
  const userWonSf = Boolean(
    userSf &&
    userSf.isPlayed &&
    userSf.homeScore !== undefined &&
    userSf.awayScore !== undefined &&
    (userSf.winnerTeamId === userClub?.id ||
      (userSf.homeTeamId === userClub?.id && (userSf.homeScore > userSf.awayScore || (userSf.homePenalties !== undefined && userSf.homePenalties > (userSf.awayPenalties || 0)))) ||
      (userSf.awayTeamId === userClub?.id && (userSf.awayScore > userSf.homeScore || (userSf.awayPenalties !== undefined && userSf.awayPenalties > (userSf.homePenalties || 0)))))
  );

  if (userWonSf) {
    if (userSf && userSf.winnerTeamId !== userClub?.id) {
      userSf.winnerTeamId = userClub?.id;
      repaired = true;
    }
    // 1. Resolve other SF match
    matches.forEach(m => {
      if (m.stage === 'semi' && !m.isPlayed) {
        const homeTeam = allTeams.find(t => t.id === m.homeTeamId) || findClubInWorld(m.homeTeamId) || ({ id: m.homeTeamId, name: 'فريق قاري', continent: targetContinent } as any);
        const awayTeam = allTeams.find(t => t.id === m.awayTeamId) || findClubInWorld(m.awayTeamId) || ({ id: m.awayTeamId, name: 'فريق قاري', continent: targetContinent } as any);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);
        m.homeScore = res.homeScore;
        m.awayScore = res.awayScore;
        m.homePenalties = res.homePenalties;
        m.awayPenalties = res.awayPenalties;
        m.winnerTeamId = res.winnerTeamId;
        m.isPlayed = true;
        repaired = true;
      }
    });

    // 2. Ensure Final exists and user is placed into it
    let finalMatch = matches.find(m => m.stage === 'final');
    const userInFinal = finalMatch && (finalMatch.homeTeamId === userClub?.id || finalMatch.awayTeamId === userClub?.id);
    if (!finalMatch || !userInFinal) {
      const sfWinners = matches.filter(m => m.stage === 'semi').map(m => m.winnerTeamId || m.homeTeamId);
      const otherWinner = sfWinners.find(id => id !== userClub?.id) || sfWinners[1] || 'ccl_finalist';
      const finalTrigger = Math.max(28, currentRound + 3);

      matches = matches.filter(m => m.stage !== 'final');
      matches.push({
        id: `${tournament.competitionId}_final_s${tournament.seasonNumber}`,
        stage: 'final',
        stageName: `نهائي ${tournament.name} الكبير 🏆`,
        roundTrigger: finalTrigger,
        homeTeamId: userClub?.id || sfWinners[0],
        awayTeamId: otherWinner,
        isPlayed: false,
      });
      repaired = true;
    }
  }

  // Check 2: Sanitize any individual matches with phantom isPlayed without valid scores
  matches.forEach(m => {
    if (m.isPlayed && (m.homeScore === undefined || m.awayScore === undefined)) {
      m.isPlayed = false;
      m.winnerTeamId = undefined;
      repaired = true;
    }
  });

  updatedFixtures.forEach(f => {
    const isContFix =
      f.competitionType === 'CONTINENTAL_CUP' ||
      f.competitionType === 'continental';
    if (isContFix && (f.homeScore === undefined || f.awayScore === undefined)) {
      if (f.isPlayed || f.winnerTeamId) {
        f.isPlayed = false;
        f.winnerTeamId = undefined;
        repaired = true;
      }
    }
  });

  // Check 3: Strict Sequential Group Matchday Enforcement (Matchdays 1 -> 2 -> 3 -> 4 -> 5 -> 6)
  if (userParticipates && userClub) {
    const userGroupMatches = matches
      .filter(m => m.stage === 'group' && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id))
      .sort((a, b) => (a.matchday || 1) - (b.matchday || 1));

    const earliestUnplayedUserMd = userGroupMatches.find(m => !m.isPlayed)?.matchday;
    if (earliestUnplayedUserMd !== undefined) {
      matches.forEach(m => {
        if (m.stage === 'group' && (m.matchday || 1) > earliestUnplayedUserMd && m.isPlayed) {
          m.isPlayed = false;
          m.homeScore = undefined;
          m.awayScore = undefined;
          m.winnerTeamId = undefined;
          repaired = true;
        }
      });

      updatedFixtures.forEach(f => {
        const isThisCont =
          (f.competitionType === 'CONTINENTAL_CUP' || f.competitionType === 'continental') &&
          (!f.competitionId || f.competitionId === tournament.competitionId);
        if (isThisCont && (f.stage === 'group' || !f.stage) && (f.matchday || 1) > earliestUnplayedUserMd && f.isPlayed) {
          f.isPlayed = false;
          f.homeScore = undefined;
          f.awayScore = undefined;
          f.winnerTeamId = undefined;
          repaired = true;
        }
      });
    }
  }

  if (repaired) {
    const recalced = recalculateContinentalGroupStandings(
      { ...tournament, matches },
      updatedFixtures
    );
    return { updatedTournament: recalced, updatedFixtures, repaired: true };
  }

  return { updatedTournament: tournament, updatedFixtures, repaired: false };
}

// ----------------------------------------------------
// 7. CONTINENTAL QUALIFICATION FOR NEXT SEASON (STRICT CONTINENT ISOLATION)
// ----------------------------------------------------

export function determineQualifiedClubsForContinental(
  allLeagues: Record<string, LeagueDefinition>,
  standingsByLeague: Record<string, LeagueStanding[]>,
  cupWinnersByCountry?: Record<string, string>,
  cupRunnersUpByCountry?: Record<string, string>
): {
  africanClubs: Club[];
  cafConfederationClubs: Club[];
  asianEliteClubs: Club[];
  afcTwoClubs: Club[];
  uefaClubs: Club[];
  europaLeagueClubs: Club[];
} {
  const africanClubs: Club[] = [];
  const cafConfedList: Club[] = [];
  const asianEliteClubs: Club[] = [];
  const afcTwoClubs: Club[] = [];
  const uefaClubs: Club[] = [];
  const europaLeagueClubs: Club[] = [];

  const cclIds = new Set<string>();
  const cccIds = new Set<string>();
  const aclIds = new Set<string>();
  const acl2Ids = new Set<string>();
  const uclIds = new Set<string>();
  const uelIds = new Set<string>();

  // 1. African Leagues (Strict: team.continent === 'AFRICA'):
  // Primary (CCL): 1st & 2nd in League
  // Secondary (CCC): 3rd in League + Cup Winner (or Cup Runner-Up / 4th in table if already in CCL/CCC)
  const africanLeagueIds = ['egy_tier_1', 'mar_tier_1', 'tun_tier_1', 'alg_tier_1'];
  africanLeagueIds.forEach(lgId => {
    const lg = allLeagues[lgId] || GLOBAL_LEAGUES[lgId];
    if (!lg) return;
    const std = standingsByLeague[lgId];
    const rawOrderedClubs: Club[] =
      std && std.length >= 4
        ? (std.map(s => lg.teams.find(t => t.id === s.teamId)).filter(Boolean) as Club[])
        : [...lg.teams];

    // Strict Continent Isolation Filter: Only 'AFRICA' clubs allowed
    const orderedClubs = rawOrderedClubs.filter(club => resolveClubContinent(club, lg) === 'AFRICA');

    let addedCcl = 0;
    for (const club of orderedClubs) {
      if (addedCcl >= 2) break;
      if (!cclIds.has(club.id)) {
        cclIds.add(club.id);
        africanClubs.push({ ...club, continent: 'AFRICA' });
        addedCcl++;
      }
    }

    let addedCcc = 0;
    const cupWinnerId = cupWinnersByCountry?.[lg.country];
    const cupRunnerUpId = cupRunnersUpByCountry?.[lg.country];

    for (const club of orderedClubs) {
      if (!cclIds.has(club.id) && !cccIds.has(club.id)) {
        cccIds.add(club.id);
        cafConfedList.push({ ...club, continent: 'AFRICA' });
        addedCcc++;
        break;
      }
    }

    const cupWinnerClub = cupWinnerId ? orderedClubs.find(t => t.id === cupWinnerId) : undefined;
    const cupRunnerUpClub = cupRunnerUpId ? orderedClubs.find(t => t.id === cupRunnerUpId) : undefined;

    if (cupWinnerClub && !cclIds.has(cupWinnerClub.id) && !cccIds.has(cupWinnerClub.id)) {
      cccIds.add(cupWinnerClub.id);
      cafConfedList.push({ ...cupWinnerClub, continent: 'AFRICA' });
      addedCcc++;
    } else if (cupRunnerUpClub && !cclIds.has(cupRunnerUpClub.id) && !cccIds.has(cupRunnerUpClub.id)) {
      cccIds.add(cupRunnerUpClub.id);
      cafConfedList.push({ ...cupRunnerUpClub, continent: 'AFRICA' });
      addedCcc++;
    }

    for (const club of orderedClubs) {
      if (addedCcc >= 2) break;
      if (!cclIds.has(club.id) && !cccIds.has(club.id)) {
        cccIds.add(club.id);
        cafConfedList.push({ ...club, continent: 'AFRICA' });
        addedCcc++;
      }
    }
  });

  // 2. Asian Leagues (Strict: team.continent === 'ASIA'):
  // Primary (ACL Elite): Top spots in Saudi, UAE, Qatar leagues
  // Secondary (AFC Champions League Two): Cup Winner + next in League NOT in ACL Elite
  const asianLeaguesConfig = [
    { id: 'sau_tier_1', aclSpots: 3, acl2Spots: 2 },
    { id: 'uae_tier_1', aclSpots: 2, acl2Spots: 2 },
    { id: 'qat_tier_1', aclSpots: 2, acl2Spots: 2 },
  ];

  asianLeaguesConfig.forEach(cfg => {
    const lg = allLeagues[cfg.id] || GLOBAL_LEAGUES[cfg.id];
    if (!lg) return;
    const std = standingsByLeague[cfg.id];
    const rawOrderedClubs: Club[] =
      std && std.length >= cfg.aclSpots + cfg.acl2Spots
        ? (std.map(s => lg.teams.find(t => t.id === s.teamId)).filter(Boolean) as Club[])
        : [...lg.teams];

    // Strict Continent Isolation Filter: Only 'ASIA' clubs allowed
    const orderedClubs = rawOrderedClubs.filter(club => resolveClubContinent(club, lg) === 'ASIA');

    let addedAcl = 0;
    for (const club of orderedClubs) {
      if (addedAcl >= cfg.aclSpots) break;
      if (!aclIds.has(club.id)) {
        aclIds.add(club.id);
        asianEliteClubs.push({ ...club, continent: 'ASIA' });
        addedAcl++;
      }
    }

    let addedAcl2 = 0;
    const cupWinnerId = cupWinnersByCountry?.[lg.country];
    const cupRunnerUpId = cupRunnersUpByCountry?.[lg.country];
    const cupWinnerClub = cupWinnerId ? orderedClubs.find(t => t.id === cupWinnerId) : undefined;
    const cupRunnerUpClub = cupRunnerUpId ? orderedClubs.find(t => t.id === cupRunnerUpId) : undefined;

    if (cupWinnerClub && !aclIds.has(cupWinnerClub.id) && !acl2Ids.has(cupWinnerClub.id)) {
      acl2Ids.add(cupWinnerClub.id);
      afcTwoClubs.push({ ...cupWinnerClub, continent: 'ASIA' });
      addedAcl2++;
    } else if (cupRunnerUpClub && !aclIds.has(cupRunnerUpClub.id) && !acl2Ids.has(cupRunnerUpClub.id)) {
      acl2Ids.add(cupRunnerUpClub.id);
      afcTwoClubs.push({ ...cupRunnerUpClub, continent: 'ASIA' });
      addedAcl2++;
    }

    for (const club of orderedClubs) {
      if (addedAcl2 >= cfg.acl2Spots) break;
      if (!aclIds.has(club.id) && !acl2Ids.has(club.id)) {
        acl2Ids.add(club.id);
        afcTwoClubs.push({ ...club, continent: 'ASIA' });
        addedAcl2++;
      }
    }
  });

  // 3. European Leagues (Strict: team.continent === 'EUROPE'):
  // Primary (UCL): Top uclSpots in League
  // Secondary (UEL): Cup Winner (or Cup Runner-Up) + next teams in League NOT in UCL
  const uefaLeaguesConfig = [
    { id: 'eng_tier_1', uclSpots: 4, uelSpots: 2 },
    { id: 'esp_tier_1', uclSpots: 4, uelSpots: 2 },
    { id: 'ita_tier_1', uclSpots: 3, uelSpots: 2 },
    { id: 'ger_tier_1', uclSpots: 3, uelSpots: 2 },
    { id: 'fra_tier_1', uclSpots: 2, uelSpots: 2 },
  ];

  uefaLeaguesConfig.forEach(cfg => {
    const lg = allLeagues[cfg.id] || GLOBAL_LEAGUES[cfg.id];
    if (!lg) return;
    const std = standingsByLeague[cfg.id];
    const rawOrderedClubs: Club[] =
      std && std.length >= cfg.uclSpots + cfg.uelSpots
        ? (std.map(s => lg.teams.find(t => t.id === s.teamId)).filter(Boolean) as Club[])
        : [...lg.teams];

    // Strict Continent Isolation Filter: Only 'EUROPE' clubs allowed
    const orderedClubs = rawOrderedClubs.filter(club => resolveClubContinent(club, lg) === 'EUROPE');

    let addedUcl = 0;
    for (const club of orderedClubs) {
      if (addedUcl >= cfg.uclSpots) break;
      if (!uclIds.has(club.id)) {
        uclIds.add(club.id);
        uefaClubs.push({ ...club, continent: 'EUROPE' });
        addedUcl++;
      }
    }

    let addedUel = 0;
    const cupWinnerId = cupWinnersByCountry?.[lg.country];
    const cupRunnerUpId = cupRunnersUpByCountry?.[lg.country];
    const cupWinnerClub = cupWinnerId ? orderedClubs.find(t => t.id === cupWinnerId) : undefined;
    const cupRunnerUpClub = cupRunnerUpId ? orderedClubs.find(t => t.id === cupRunnerUpId) : undefined;

    if (cupWinnerClub && !uclIds.has(cupWinnerClub.id) && !uelIds.has(cupWinnerClub.id)) {
      uelIds.add(cupWinnerClub.id);
      europaLeagueClubs.push({ ...cupWinnerClub, continent: 'EUROPE' });
      addedUel++;
    } else if (cupRunnerUpClub && !uclIds.has(cupRunnerUpClub.id) && !uelIds.has(cupRunnerUpClub.id)) {
      uelIds.add(cupRunnerUpClub.id);
      europaLeagueClubs.push({ ...cupRunnerUpClub, continent: 'EUROPE' });
      addedUel++;
    }

    for (const club of orderedClubs) {
      if (addedUel >= cfg.uelSpots) break;
      if (!uclIds.has(club.id) && !uelIds.has(club.id)) {
        uelIds.add(club.id);
        europaLeagueClubs.push({ ...club, continent: 'EUROPE' });
        addedUel++;
      }
    }
  });

  return {
    africanClubs,
    cafConfederationClubs: cafConfedList,
    asianEliteClubs,
    afcTwoClubs,
    uefaClubs,
    europaLeagueClubs,
  };
}

export const qualifyTeamsToContinentalCompetitions = determineQualifiedClubsForContinental;

