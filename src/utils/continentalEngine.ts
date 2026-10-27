import {
  Club,
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
import { simulateMatch } from './engine';
import { GLOBAL_LEAGUES, findClubInWorld } from '../data/leaguesData';
import {
  EGYPT_PREMIER_CLUBS,
  MOROCCO_BOTOLA_CLUBS,
  TUNISIA_LIGUE_CLUBS,
  ALGERIA_LIGUE_CLUBS,
} from '../data/arabClubsData';
import {
  ENGLAND_PREMIER_CLUBS,
  SPAIN_LA_LIGA_CLUBS,
  ITALY_SERIE_A_CLUBS,
  GERMANY_BUNDESLIGA_CLUBS,
  FRANCE_LIGUE_1_CLUBS,
} from '../data/europeanClubsData';

// ----------------------------------------------------
// HELPER: BUILD 4 GROUPS OF 4 + 6 MATCHDAYS (HOME & AWAY)
// ----------------------------------------------------

function buildGroupStageStructure(
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl',
  seasonNumber: number,
  groupClubsMatrix: Club[][],
  groupNames: string[],
  roundTriggers: [number, number, number, number, number, number] = [3, 6, 8, 12, 14, 16]
): { groups: ContinentalGroup[]; matches: ContinentalMatch[] } {
  const groups: ContinentalGroup[] = [];
  const matches: ContinentalMatch[] = [];

  for (let gIdx = 0; gIdx < 4; gIdx++) {
    const groupClubs = groupClubsMatrix[gIdx];
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
      name: groupNames[gIdx],
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
// 0. DYNAMIC QUALIFICATION & SEEDED GROUP DRAW (RE-SEEDING & SHUFFLE)
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
 * Dynamically selects qualifiers from a league based on seasonal performance simulation
 * so that non-user domestic leagues also send varied qualifiers each season while respecting excludedClubIds.
 */
export function selectDynamicForeignQualifiers(
  leagueClubs: Club[],
  count: number,
  seasonNumber: number,
  excludedClubIds?: Set<string>
): Club[] {
  const eligible = (Array.isArray(leagueClubs) ? leagueClubs : []).filter(
    c => c && c.id && !(excludedClubIds && excludedClubIds.has(c.id))
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
 * Divides clubs into Pots 1-4 by seasonal coefficient, shuffles each pot, and minimizes same-country clashes.
 */
export function conductSeededGroupDraw(
  clubs16: Club[],
  seasonNumber: number,
  competitionCode: string
): Club[][] {
  const rng = createDrawRng(seasonNumber, competitionCode);

  const uniqueMap = new Map<string, Club>();
  for (const c of clubs16) {
    if (c && c.id && !uniqueMap.has(c.id)) {
      uniqueMap.set(c.id, c);
    }
  }
  const uniqueClubs = Array.from(uniqueMap.values());
  while (uniqueClubs.length < 16 && clubs16.length > 0) {
    const fallback = clubs16[uniqueClubs.length % clubs16.length];
    if (fallback) uniqueClubs.push(fallback);
    else break;
  }

  const sortedBySeed = [...uniqueClubs.slice(0, 16)].sort(
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

// ----------------------------------------------------
// 1. INITIALIZATION: AFRICAN CHAMPIONS LEAGUE (CAF CL)
// ----------------------------------------------------

/**
 * Initializes the African Champions League (CAF CL - دوري أبطال إفريقيا)
 * 16 Top clubs across Africa (Egypt, Morocco, Tunisia, Algeria)
 * 4 Groups of 4 teams, 6 matchdays (Home & Away), Top 2 advance to Quarterfinals.
 */
export function initAfricanChampionsLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const excluded = excludedClubIds || new Set<string>();
  const egyptAll = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS,
    4,
    seasonNumber,
    excluded
  );
  const moroccoAll = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['mar_tier_1']?.teams || MOROCCO_BOTOLA_CLUBS,
    4,
    seasonNumber,
    excluded
  );
  const tunisiaAll = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['tun_tier_1']?.teams || TUNISIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    excluded
  );
  const algeriaAll = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['alg_tier_1']?.teams || ALGERIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    excluded
  );

  const egyptTeams = [...egyptAll.slice(0, 4)];
  const moroccoTeams = [...moroccoAll.slice(0, 4)];
  const tunisiaTeams = [...tunisiaAll.slice(0, 4)];
  const algeriaTeams = [...algeriaAll.slice(0, 4)];

  if (qualifiedClubs && qualifiedClubs.length > 0) {
    let egyIdx = 0;
    let marIdx = 0;
    let tunIdx = 0;
    let algIdx = 0;
    qualifiedClubs.forEach(qc => {
      if (!qc || excluded.has(qc.id)) return;
      if ((qc.country === 'مصر' || !qc.country) && egyIdx < 4) {
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

  // Only include userClub in CCL if it is NOT excluded (i.e. not assigned to CCC)
  // and either qualified for CCL or is in the default CCL pool
  const userInQualifiedList = !qualifiedClubs || qualifiedClubs.length === 0 || qualifiedClubs.some(q => q.id === userClub?.id);
  if (userClub && !excluded.has(userClub.id) && userInQualifiedList) {
    const c = userClub.country || 'مصر';
    if (c === 'مصر' || userClub.id === 'eg1_ahly') {
      const idx = egyptTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) egyptTeams[idx] = userClub;
      else if (!qualifiedClubs || qualifiedClubs.length === 0) egyptTeams[0] = userClub;
    } else if (c === 'المغرب') {
      const idx = moroccoTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) moroccoTeams[idx] = userClub;
      else if (!qualifiedClubs || qualifiedClubs.length === 0) moroccoTeams[0] = userClub;
    } else if (c === 'تونس') {
      const idx = tunisiaTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) tunisiaTeams[idx] = userClub;
      else if (!qualifiedClubs || qualifiedClubs.length === 0) tunisiaTeams[0] = userClub;
    } else if (c === 'الجزائر') {
      const idx = algeriaTeams.findIndex(t => t.id === userClub.id);
      if (idx !== -1) algeriaTeams[idx] = userClub;
      else if (!qualifiedClubs || qualifiedClubs.length === 0) algeriaTeams[0] = userClub;
    }
  }

  const all16Participants = [
    ...egyptTeams,
    ...moroccoTeams,
    ...tunisiaTeams,
    ...algeriaTeams,
  ].filter(Boolean);

  // Conduct fresh 4-Pot Seeded Group Draw (Re-seeding & Shuffle)
  const groupClubsMatrix = conductSeededGroupDraw(all16Participants, seasonNumber, 'ccl');

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
// 2. INITIALIZATION: CAF CONFEDERATION CUP (CCC)
// ----------------------------------------------------

/**
 * Initializes the CAF Confederation Cup (كأس الكونفدرالية الإفريقية)
 * Enforces STRICT MUTUAL EXCLUSION: Any club participating in CAF Champions League (CCL)
 * is 100% excluded from CAF Confederation Cup (CCC), passing slots to the next teams in the table / Cup runner-up.
 */
export function initCafConfederationCup(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  // 1. Build strict exclusion set from CAF Champions League (CCL) participants
  const cclTeamIds = new Set<string>(excludedClubIds ? Array.from(excludedClubIds) : []);
  if (cclTeamIds.size === 0) {
    const cclReference = initAfricanChampionsLeague(seasonNumber, allTeams, userClub);
    cclReference.groups.forEach(g => g.teamIds.forEach(id => cclTeamIds.add(id)));
  }

  const egyptTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS,
    4,
    seasonNumber,
    cclTeamIds
  );
  const moroccoTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['mar_tier_1']?.teams || MOROCCO_BOTOLA_CLUBS,
    4,
    seasonNumber,
    cclTeamIds
  );
  const tunisiaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['tun_tier_1']?.teams || TUNISIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    cclTeamIds
  );
  const algeriaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['alg_tier_1']?.teams || ALGERIA_LIGUE_CLUBS,
    4,
    seasonNumber,
    cclTeamIds
  );

  // Apply qualifiedClubs ONLY if they are not in CCL (Mutual Exclusion)
  if (qualifiedClubs && qualifiedClubs.length > 0) {
    let egyIdx = 0;
    let marIdx = 0;
    let tunIdx = 0;
    let algIdx = 0;
    qualifiedClubs
      .filter(qc => qc && !cclTeamIds.has(qc.id))
      .forEach(qc => {
        if ((qc.country === 'مصر' || !qc.country) && egyIdx < 4) {
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

  // Mutual Exclusion Check for userClub:
  // NEVER add userClub to CAF Confederation Cup if userClub is already in CAF Champions League!
  const isUserInCcl = Boolean(userClub && cclTeamIds.has(userClub.id));
  const isUserExplicitlyQualifiedForCcc = Boolean(
    userClub && qualifiedClubs && qualifiedClubs.some(qc => qc.id === userClub.id) && !isUserInCcl
  );

  if (userClub && !isUserInCcl && isUserExplicitlyQualifiedForCcc) {
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
  } else if (userClub && !isUserInCcl) {
    const idxEgy = egyptTeams.findIndex(t => t.id === userClub.id);
    if (idxEgy !== -1) egyptTeams[idxEgy] = userClub;
    const idxMar = moroccoTeams.findIndex(t => t.id === userClub.id);
    if (idxMar !== -1) moroccoTeams[idxMar] = userClub;
    const idxTun = tunisiaTeams.findIndex(t => t.id === userClub.id);
    if (idxTun !== -1) tunisiaTeams[idxTun] = userClub;
    const idxAlg = algeriaTeams.findIndex(t => t.id === userClub.id);
    if (idxAlg !== -1) algeriaTeams[idxAlg] = userClub;
  }

  const all16Participants = [
    ...egyptTeams,
    ...moroccoTeams,
    ...tunisiaTeams,
    ...algeriaTeams,
  ].filter(Boolean);

  // Conduct fresh 4-Pot Seeded Group Draw (Re-seeding & Shuffle)
  const groupClubsMatrix = conductSeededGroupDraw(all16Participants, seasonNumber, 'ccc');

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
// 3. INITIALIZATION: UEFA CHAMPIONS LEAGUE (UCL)
// ----------------------------------------------------

/**
 * Initializes the UEFA Champions League (UCL - دوري أبطال أوروبا)
 * 16 Top clubs across Europe (England, Spain, Italy, Germany, France)
 * 4 Groups of 4 teams, 6 matchdays (Home & Away), Top 2 advance to Quarterfinals.
 */
export function initUefaChampionsLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  const excluded = excludedClubIds || new Set<string>();
  let participantPool: Club[] = [];

  if (qualifiedClubs && qualifiedClubs.length >= 8) {
    participantPool = qualifiedClubs.filter(c => c && !excluded.has(c.id));
  } else {
    const engTeams = selectDynamicForeignQualifiers(
      GLOBAL_LEAGUES['eng_tier_1']?.teams || ENGLAND_PREMIER_CLUBS,
      4,
      seasonNumber,
      excluded
    );
    const espTeams = selectDynamicForeignQualifiers(
      GLOBAL_LEAGUES['esp_tier_1']?.teams || SPAIN_LA_LIGA_CLUBS,
      4,
      seasonNumber,
      excluded
    );
    const itaTeams = selectDynamicForeignQualifiers(
      GLOBAL_LEAGUES['ita_tier_1']?.teams || ITALY_SERIE_A_CLUBS,
      3,
      seasonNumber,
      excluded
    );
    const gerTeams = selectDynamicForeignQualifiers(
      GLOBAL_LEAGUES['ger_tier_1']?.teams || GERMANY_BUNDESLIGA_CLUBS,
      3,
      seasonNumber,
      excluded
    );
    const fraTeams = selectDynamicForeignQualifiers(
      GLOBAL_LEAGUES['fra_tier_1']?.teams || FRANCE_LIGUE_1_CLUBS,
      2,
      seasonNumber,
      excluded
    );

    participantPool = [...engTeams, ...espTeams, ...itaTeams, ...gerTeams, ...fraTeams];
  }

  const uniquePool: Club[] = [];
  const seenIds = new Set<string>();

  if (qualifiedClubs && qualifiedClubs.length > 0 && qualifiedClubs.length < 8) {
    qualifiedClubs.forEach(c => {
      if (c && !excluded.has(c.id) && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        uniquePool.push(c);
      }
    });
  }

  participantPool.forEach(c => {
    if (c && !excluded.has(c.id) && !seenIds.has(c.id)) {
      seenIds.add(c.id);
      uniquePool.push(c);
    }
  });

  if (userClub && seenIds.has(userClub.id)) {
    const idx = uniquePool.findIndex(c => c.id === userClub.id);
    if (idx !== -1) uniquePool[idx] = userClub;
  } else if (
    userClub &&
    !excluded.has(userClub.id) &&
    qualifiedClubs &&
    qualifiedClubs.some(q => q.id === userClub.id) &&
    !seenIds.has(userClub.id)
  ) {
    uniquePool.unshift(userClub);
    seenIds.add(userClub.id);
  }

  const realEuropeanBackups = [
    ...ENGLAND_PREMIER_CLUBS,
    ...SPAIN_LA_LIGA_CLUBS,
    ...ITALY_SERIE_A_CLUBS,
    ...GERMANY_BUNDESLIGA_CLUBS,
    ...FRANCE_LIGUE_1_CLUBS,
  ];

  for (const backupClub of realEuropeanBackups) {
    if (uniquePool.length >= 16) break;
    if (backupClub && backupClub.id && !seenIds.has(backupClub.id) && !excluded.has(backupClub.id)) {
      seenIds.add(backupClub.id);
      uniquePool.push(backupClub);
    }
  }

  const selected16 = uniquePool.slice(0, 16);
  // Conduct fresh 4-Pot Seeded Group Draw (Re-seeding & Shuffle)
  const groupClubsMatrix = conductSeededGroupDraw(selected16, seasonNumber, 'ucl');

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
// 4. INITIALIZATION: UEFA EUROPA LEAGUE (UEL)
// ----------------------------------------------------

/**
 * Initializes the UEFA Europa League (UEL - الدوري الأوروبي)
 * Enforces STRICT MUTUAL EXCLUSION: Any club participating in UEFA Champions League (UCL)
 * is 100% excluded from UEFA Europa League (UEL), passing slots to the next teams in the table / Cup runner-up.
 */
export function initUefaEuropaLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  // 1. Build strict exclusion set from UEFA Champions League (UCL) participants
  const uclTeamIds = new Set<string>(excludedClubIds ? Array.from(excludedClubIds) : []);
  if (uclTeamIds.size === 0) {
    const uclReference = initUefaChampionsLeague(seasonNumber, allTeams, userClub);
    uclReference.groups.forEach(g => g.teamIds.forEach(id => uclTeamIds.add(id)));
  }

  // 2. Dynamically select next clubs from European leagues that are NOT in UCL
  const engTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['eng_tier_1']?.teams || ENGLAND_PREMIER_CLUBS,
    4,
    seasonNumber,
    uclTeamIds
  );
  const espTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['esp_tier_1']?.teams || SPAIN_LA_LIGA_CLUBS,
    4,
    seasonNumber,
    uclTeamIds
  );
  const itaTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['ita_tier_1']?.teams || ITALY_SERIE_A_CLUBS,
    3,
    seasonNumber,
    uclTeamIds
  );
  const gerTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['ger_tier_1']?.teams || GERMANY_BUNDESLIGA_CLUBS,
    3,
    seasonNumber,
    uclTeamIds
  );
  const fraTeams = selectDynamicForeignQualifiers(
    GLOBAL_LEAGUES['fra_tier_1']?.teams || FRANCE_LIGUE_1_CLUBS,
    2,
    seasonNumber,
    uclTeamIds
  );

  const participantPool = [...engTeams, ...espTeams, ...itaTeams, ...gerTeams, ...fraTeams];
  const uniquePool: Club[] = [];
  const seenIds = new Set<string>();

  if (qualifiedClubs && qualifiedClubs.length > 0) {
    qualifiedClubs.forEach(c => {
      if (c && !uclTeamIds.has(c.id) && !seenIds.has(c.id)) {
        seenIds.add(c.id);
        uniquePool.push(c);
      }
    });
  }

  participantPool.forEach(c => {
    if (c && !uclTeamIds.has(c.id) && !seenIds.has(c.id)) {
      seenIds.add(c.id);
      uniquePool.push(c);
    }
  });

  // Mutual Exclusion Check for userClub:
  // NEVER add userClub to UEL if userClub is already in UCL!
  const isUserInUcl = Boolean(userClub && uclTeamIds.has(userClub.id));
  if (userClub && !isUserInUcl && seenIds.has(userClub.id)) {
    const idx = uniquePool.findIndex(c => c.id === userClub.id);
    if (idx !== -1) uniquePool[idx] = userClub;
  } else if (
    userClub &&
    !isUserInUcl &&
    qualifiedClubs &&
    qualifiedClubs.some(q => q.id === userClub.id) &&
    !seenIds.has(userClub.id)
  ) {
    uniquePool.unshift(userClub);
    seenIds.add(userClub.id);
  }

  const realEuropeanBackups = [
    ...ENGLAND_PREMIER_CLUBS,
    ...SPAIN_LA_LIGA_CLUBS,
    ...ITALY_SERIE_A_CLUBS,
    ...GERMANY_BUNDESLIGA_CLUBS,
    ...FRANCE_LIGUE_1_CLUBS,
  ];

  for (const backupClub of realEuropeanBackups) {
    if (uniquePool.length >= 16) break;
    if (backupClub && backupClub.id && !seenIds.has(backupClub.id) && !uclTeamIds.has(backupClub.id)) {
      seenIds.add(backupClub.id);
      uniquePool.push(backupClub);
    }
  }

  const selected16 = uniquePool.slice(0, 16);
  // Conduct fresh 4-Pot Seeded Group Draw (Re-seeding & Shuffle)
  const groupClubsMatrix = conductSeededGroupDraw(selected16, seasonNumber, 'uel');

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
 * by competitionId ('ccl' | 'ccc' | 'ucl' | 'uel') with strict Mutual Exclusion.
 */
export function initContinentalTournamentByCode(
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel',
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[],
  excludedClubIds?: Set<string>
): ContinentalTournament {
  switch (competitionId) {
    case 'ucl':
      return initUefaChampionsLeague(seasonNumber, allTeams, userClub, qualifiedClubs, excludedClubIds);
    case 'uel':
      return initUefaEuropaLeague(seasonNumber, allTeams, userClub, qualifiedClubs, excludedClubIds);
    case 'ccc':
      return initCafConfederationCup(seasonNumber, allTeams, userClub, qualifiedClubs, excludedClubIds);
    case 'ccl':
    default:
      return initAfricanChampionsLeague(seasonNumber, allTeams, userClub, qualifiedClubs, excludedClubIds);
  }
}

/**
 * Resolves whether a country belongs to the European (UEFA) or African/Arab continental region.
 */
export function isEuropeanCountry(country?: string): boolean {
  if (!country) return false;
  return ['إنجلترا', 'إسبانيا', 'إيطاليا', 'ألمانيا', 'فرنسا', 'ENG', 'ESP', 'ITA', 'GER', 'FRA'].some(c =>
    country.includes(c)
  );
}

/**
 * Resolves the continental region ('africa' | 'europe') of the currently managed club or league.
 * Supports `currentManagedTeam.continent`, `league.region`, `club.country`, `club.countryCode`, and `league.id`.
 */
export function resolveClubContinentRegion(
  club?: Club | null,
  league?: LeagueDefinition | null
): 'africa' | 'europe' {
  const explicitContinent = String(club?.continent || league?.region || '').toLowerCase();
  if (explicitContinent === 'europe') return 'europe';
  if (explicitContinent === 'africa') return 'africa';

  if (
    isEuropeanCountry(club?.country) ||
    isEuropeanCountry(club?.countryCode) ||
    isEuropeanCountry(league?.country) ||
    /^(eng|esp|ita|ger|fra)_/i.test(String(league?.id || club?.leagueId || ''))
  ) {
    return 'europe';
  }

  return 'africa';
}

/**
 * Returns the allowed continental competition options for a given continent region.
 * - Africa -> ['ccl', 'ccc'] (دوري أبطال إفريقيا + كأس الكونفدرالية الإفريقية)
 * - Europe -> ['ucl', 'uel'] (دوري أبطال أوروبا + الدوري الأوروبي)
 */
export function getContinentalCompetitionsForRegion(region: 'africa' | 'europe'): Array<{
  code: 'ccl' | 'ccc' | 'ucl' | 'uel';
  name: string;
  shortLabel: string;
  region: 'africa' | 'europe';
  tier: 1 | 2;
}> {
  if (region === 'europe') {
    return [
      {
        code: 'ucl',
        name: 'دوري أبطال أوروبا',
        shortLabel: '🏆 دوري أبطال أوروبا',
        region: 'europe',
        tier: 1,
      },
      {
        code: 'uel',
        name: 'الدوري الأوروبي',
        shortLabel: '🟠 الدوري الأوروبي',
        region: 'europe',
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
      tier: 1,
    },
    {
      code: 'ccc',
      name: 'كأس الكونفدرالية الإفريقية',
      shortLabel: '🌍 الكونفدرالية الإفريقية',
      region: 'africa',
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
  const baseResult = simulateMatch(safeHome, safeAway);
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

    const homeRep = safeHome.reputation || 50;
    const awayRep = safeAway.reputation || 50;
    const repDiff = homeRep - awayRep;

    // 35% chance a decisive goal is scored in Extra Time (minutes 91-120)
    const extraTimeRoll = Math.random();
    if (extraTimeRoll < 0.18) {
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
    } else if (extraTimeRoll < 0.35) {
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
      // Penalty shootout!
      let homeP = Math.floor(Math.random() * 2 + 3); // 3 to 5
      let awayP = Math.floor(Math.random() * 2 + 3);

      if (repDiff > 10 && Math.random() < 0.65) {
        homeP = Math.max(homeP, awayP + 1);
      } else if (repDiff < -10 && Math.random() < 0.65) {
        awayP = Math.max(awayP, homeP + 1);
      }

      if (homeP === awayP) {
        if (Math.random() > 0.5) {
          homeP += 1;
        } else {
          awayP += 1;
        }
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

  return {
    ...tournament,
    currentStage: nextStage,
    groups: updatedGroups,
    matches: syncedMatches,
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

  // A. SIMULATE GROUP STAGE MATCHES (All matchdays whose roundTrigger <= currentRound)
  // Group matchdays trigger at rounds [3, 6, 8, 12, 14, 16] (Matchdays 1..6)
  const dueGroupMatches = matches.filter(
    m => m.stage === 'group' && !m.isPlayed && (m.roundTrigger || 1) <= currentRound
  );

  if (dueGroupMatches.length > 0) {
    let lastSimulatedMatchday = dueGroupMatches[0]?.matchday || 1;

    matches = matches.map(m => {
      if (m.stage !== 'group' || m.isPlayed || (m.roundTrigger || 1) > currentRound) {
        return m;
      }

      const isUserInvolved = Boolean(
        userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      );

      // STRICT RULE: Never simulate the user's Continental match in the background unless explicitly requested!
      if (isUserInvolved && !shouldSimUser) {
        if (!userMatchThisRound) {
          userMatchThisRound = m;
        }
        return m;
      }

      const homeTeam = findClub(m.homeTeamId);
      const awayTeam = findClub(m.awayTeamId);
      const res = simulateMatch(homeTeam, awayTeam, homeTeam.tactics, awayTeam.tactics);
      if (m.matchday) lastSimulatedMatchday = m.matchday;

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

    newsMessage = `انتهت مباريات الجولة ${lastSimulatedMatchday} من دور المجموعات لـ ${tournament.name}!`;
  }

  // Recompute group standings immutably and auto-generate QF if all 6 group matchdays are complete
  let updatedTournament = recalculateContinentalGroupStandings(
    {
      ...baseTournament,
      matches,
    },
    options?.externalFixtures
  );
  matches = updatedTournament.matches.map(m => ({ ...m }));

  if (
    updatedTournament.currentStage === 'quarter' &&
    baseTournament.currentStage === 'group'
  ) {
    newsMessage = `اكتمل دور المجموعات (6 جولات) وتحددت مواجهات الدور ربع النهائي النارية لـ ${tournament.name}! 🌟`;
  }

  // B. SIMULATE QUARTERFINALS (When user plays QF, or when currentRound >= 18 for AI matches)
  const qfMatches = matches.filter(m => m.stage === 'quarter');
  const userQfMatch = userClub
    ? qfMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
    : undefined;
  const anyQfPlayed = qfMatches.some(m => m.isPlayed);

  if (qfMatches.length > 0 && (currentRound >= 18 || anyQfPlayed)) {
    const unplayedQFs = qfMatches.filter(m => !m.isPlayed);
    // If user is in QF and hasn't played yet (and !shouldSimUser), hold back user's QF and only simulate AI QFs if user already played or round >= 18
    if (unplayedQFs.length > 0) {
      matches = matches.map(m => {
        if (m.stage !== 'quarter' || m.isPlayed) return m;
        const isUserInvolved = Boolean(
          userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
        );
        if (isUserInvolved && !shouldSimUser) {
          userMatchThisRound = m;
          return m;
        }
        // Wait for user to play their QF before auto-resolving other QFs if currentRound < 18
        if (userQfMatch && !userQfMatch.isPlayed && !shouldSimUser) {
          return m;
        }

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
      const sfWinners = allQFs.map(m => m.winnerTeamId || m.homeTeamId);
      updatedTournament.currentStage = 'semi';
      matches = [
        ...matches,
        {
          id: `${tournament.competitionId}_sf_1_s${tournament.seasonNumber}`,
          stage: 'semi',
          stageName: `${tournament.name} - نصف النهائي (1)`,
          roundTrigger: Math.max(20, currentRound + 1),
          homeTeamId: sfWinners[0],
          awayTeamId: sfWinners[1],
          isPlayed: false,
        },
        {
          id: `${tournament.competitionId}_sf_2_s${tournament.seasonNumber}`,
          stage: 'semi',
          stageName: `${tournament.name} - نصف النهائي (2)`,
          roundTrigger: Math.max(20, currentRound + 1),
          homeTeamId: sfWinners[2],
          awayTeamId: sfWinners[3],
          isPlayed: false,
        },
      ];
      newsMessage = `إثارة بالغة في ربع نهائي ${tournament.name} وتأهل الفرق الأربعة إلى المربع الذهبي!`;
    }
  }

  // C. SIMULATE SEMIFINALS (When user plays SF, or when currentRound >= 20 for AI matches)
  const sfMatches = matches.filter(m => m.stage === 'semi');
  const userSfMatch = userClub
    ? sfMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
    : undefined;
  const anySfPlayed = sfMatches.some(m => m.isPlayed);

  if (sfMatches.length > 0 && (currentRound >= 20 || anySfPlayed)) {
    const unplayedSFs = sfMatches.filter(m => !m.isPlayed);
    if (unplayedSFs.length > 0) {
      matches = matches.map(m => {
        if (m.stage !== 'semi' || m.isPlayed) return m;
        const isUserInvolved = Boolean(
          userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
        );
        if (isUserInvolved && !shouldSimUser) {
          userMatchThisRound = m;
          return m;
        }
        if (userSfMatch && !userSfMatch.isPlayed && !shouldSimUser) {
          return m;
        }

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
      const finalWinners = allSFs.map(m => m.winnerTeamId || m.homeTeamId);
      updatedTournament.currentStage = 'final';
      matches = [
        ...matches,
        {
          id: `${tournament.competitionId}_final_s${tournament.seasonNumber}`,
          stage: 'final',
          stageName: `نهائي ${tournament.name} الكبير 🏆`,
          roundTrigger: Math.max(22, currentRound + 1),
          homeTeamId: finalWinners[0],
          awayTeamId: finalWinners[1],
          isPlayed: false,
        },
      ];
      newsMessage = `تحدد طرفا النهائي الحلم لبطولة ${tournament.name}! 🏆`;
    }
  }

  // D. SIMULATE FINAL (When user plays Final, or when currentRound >= 22 for AI Final)
  const existingFinalMatch = matches.find(m => m.stage === 'final');
  if (existingFinalMatch && (currentRound >= 22 || existingFinalMatch.isPlayed)) {
    if (!existingFinalMatch.isPlayed) {
      const isUserInvolved = Boolean(
        userClub && (existingFinalMatch.homeTeamId === userClub.id || existingFinalMatch.awayTeamId === userClub.id)
      );
      if (isUserInvolved && !shouldSimUser) {
        userMatchThisRound = existingFinalMatch;
      } else {
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

        updatedTournament = {
          ...updatedTournament,
          isCompleted: true,
          currentStage: 'completed',
          winnerClubId: res.winnerTeamId,
          runnerUpClubId: runnerUpId,
        };

        const winnerClub = findClub(res.winnerTeamId);
        newsMessage = `ألف مبروك لفريق (${winnerClub.name}) التتويج بلقب ${tournament.name} ورفع ${tournament.trophyName}! 🏆🎉`;
      }
    } else {
      // Final was already played (e.g. by the user in Live Match) -> ensure tournament is marked completed
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

      updatedTournament = {
        ...updatedTournament,
        isCompleted: true,
        currentStage: 'completed',
        winnerClubId: resolvedWinner,
        runnerUpClubId: runnerUpId,
      };
    }
  }

  return {
    updatedTournament: {
      ...updatedTournament,
      matches,
      groups: updatedTournament.groups.map(g => ({
        ...g,
        teamIds: [...g.teamIds],
        standings: g.standings.map(s => ({ ...s })),
      })),
    },
    userMatchThisRound,
    newsMessage,
  };
}

// ----------------------------------------------------
// 7. CONTINENTAL QUALIFICATION FOR NEXT SEASON
// ----------------------------------------------------

export function determineQualifiedClubsForContinental(
  allLeagues: Record<string, LeagueDefinition>,
  standingsByLeague: Record<string, LeagueStanding[]>,
  cupWinnersByCountry?: Record<string, string>,
  cupRunnersUpByCountry?: Record<string, string>
): {
  africanClubs: Club[];
  cafConfederationClubs: Club[];
  uefaClubs: Club[];
  europaLeagueClubs: Club[];
} {
  const africanClubs: Club[] = [];
  const uefaClubs: Club[] = [];
  const europaLeagueClubs: Club[] = [];

  const cclIds = new Set<string>();
  const cccIds = new Set<string>();
  const uclIds = new Set<string>();
  const uelIds = new Set<string>();
  const cafConfedList: Club[] = [];

  // 1. African Leagues:
  // Primary (CCL): 1st & 2nd in League
  // Secondary (CCC): 3rd in League + Cup Winner (or Cup Runner-Up / 4th / next in table if already in CCL/CCC)
  const africanLeagueIds = ['egy_tier_1', 'mar_tier_1', 'tun_tier_1', 'alg_tier_1'];
  africanLeagueIds.forEach(lgId => {
    const lg = allLeagues[lgId] || GLOBAL_LEAGUES[lgId];
    if (!lg) return;
    const std = standingsByLeague[lgId];
    const orderedClubs: Club[] =
      std && std.length >= 4
        ? (std.map(s => lg.teams.find(t => t.id === s.teamId)).filter(Boolean) as Club[])
        : [...lg.teams];

    // Assign Primary Continental (CAF Champions League) spots (2 per league, or up to 4 for full 16-club grid)
    let addedCcl = 0;
    for (const club of orderedClubs) {
      if (addedCcl >= 2) break;
      if (!cclIds.has(club.id)) {
        cclIds.add(club.id);
        africanClubs.push(club);
        addedCcl++;
      }
    }

    // Assign Secondary Continental (CAF Confederation Cup) spots with strict Mutual Exclusion (!cclIds.has(id))
    let addedCcc = 0;
    const cupWinnerId = cupWinnersByCountry?.[lg.country];
    const cupRunnerUpId = cupRunnersUpByCountry?.[lg.country];

    // Slot 1: Highest league team NOT in CCL (usually 3rd place)
    for (const club of orderedClubs) {
      if (!cclIds.has(club.id) && !cccIds.has(club.id)) {
        cccIds.add(club.id);
        cafConfedList.push(club);
        addedCcc++;
        break;
      }
    }

    // Slot 2: Cup Winner -> else Cup Runner-Up -> else next in League table (4th / 5th) NOT in CCL or CCC
    const cupWinnerClub = cupWinnerId ? lg.teams.find(t => t.id === cupWinnerId) : undefined;
    const cupRunnerUpClub = cupRunnerUpId ? lg.teams.find(t => t.id === cupRunnerUpId) : undefined;

    if (cupWinnerClub && !cclIds.has(cupWinnerClub.id) && !cccIds.has(cupWinnerClub.id)) {
      cccIds.add(cupWinnerClub.id);
      cafConfedList.push(cupWinnerClub);
      addedCcc++;
    } else if (cupRunnerUpClub && !cclIds.has(cupRunnerUpClub.id) && !cccIds.has(cupRunnerUpClub.id)) {
      cccIds.add(cupRunnerUpClub.id);
      cafConfedList.push(cupRunnerUpClub);
      addedCcc++;
    }

    // Fill any remaining CCC spots for this country from the next teams in the league standings
    for (const club of orderedClubs) {
      if (addedCcc >= 2) break;
      if (!cclIds.has(club.id) && !cccIds.has(club.id)) {
        cccIds.add(club.id);
        cafConfedList.push(club);
        addedCcc++;
      }
    }
  });

  // 2. European Leagues:
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
    const orderedClubs: Club[] =
      std && std.length >= cfg.uclSpots + cfg.uelSpots
        ? (std.map(s => lg.teams.find(t => t.id === s.teamId)).filter(Boolean) as Club[])
        : [...lg.teams];

    // Primary (UCL) spots
    let addedUcl = 0;
    for (const club of orderedClubs) {
      if (addedUcl >= cfg.uclSpots) break;
      if (!uclIds.has(club.id)) {
        uclIds.add(club.id);
        uefaClubs.push(club);
        addedUcl++;
      }
    }

    // Secondary (UEL) spots with strict Mutual Exclusion (!uclIds.has(id))
    let addedUel = 0;
    const cupWinnerId = cupWinnersByCountry?.[lg.country];
    const cupRunnerUpId = cupRunnersUpByCountry?.[lg.country];
    const cupWinnerClub = cupWinnerId ? lg.teams.find(t => t.id === cupWinnerId) : undefined;
    const cupRunnerUpClub = cupRunnerUpId ? lg.teams.find(t => t.id === cupRunnerUpId) : undefined;

    if (cupWinnerClub && !uclIds.has(cupWinnerClub.id) && !uelIds.has(cupWinnerClub.id)) {
      uelIds.add(cupWinnerClub.id);
      europaLeagueClubs.push(cupWinnerClub);
      addedUel++;
    } else if (cupRunnerUpClub && !uclIds.has(cupRunnerUpClub.id) && !uelIds.has(cupRunnerUpClub.id)) {
      uelIds.add(cupRunnerUpClub.id);
      europaLeagueClubs.push(cupRunnerUpClub);
      addedUel++;
    }

    for (const club of orderedClubs) {
      if (addedUel >= cfg.uelSpots) break;
      if (!uclIds.has(club.id) && !uelIds.has(club.id)) {
        uelIds.add(club.id);
        europaLeagueClubs.push(club);
        addedUel++;
      }
    }
  });

  return {
    africanClubs,
    cafConfederationClubs: cafConfedList,
    uefaClubs,
    europaLeagueClubs,
  };
}
