// =========================================================================
// International Tournament Engine (بطولات المنتخبات)
// -------------------------------------------------------------------------
// FULLY ISOLATED from club tournament logic. AFCON every 2 seasons and the
// World Cup every 4 seasons, with groups of 4 + knockouts, played in
// international-break rounds (roundTrigger pattern, like club competitions).
// Reuses the battle-tested match simulators (simulateMatch for group games,
// simulateKnockoutMatch for ET/penalties) through the NT→Club adapter.
// =========================================================================

import { simulateMatch } from './engine';
import { simulateKnockoutMatch } from './continentalEngine';
import {
  InternationalCompetitionId,
  InternationalGroup,
  InternationalGroupStanding,
  InternationalMatch,
  InternationalStage,
  InternationalTournament,
  NationalTeam,
} from '../types/nationalTeams';
import { getNationalTeamById, nationalTeamToClub } from './nationalTeamsEngine';

export const AFCON_CYCLE_SEASONS = 2;
export const WORLD_CUP_CYCLE_SEASONS = 4;

export function shouldHoldAfcon(seasonNumber: number): boolean {
  return seasonNumber > 0 && seasonNumber % AFCON_CYCLE_SEASONS === 0;
}

export function shouldHoldWorldCup(seasonNumber: number): boolean {
  return seasonNumber > 0 && seasonNumber % WORLD_CUP_CYCLE_SEASONS === 0;
}

// ---------------------------------------------------------------------------
// Scheduling: which league-round trigger hosts each stage (international
// breaks). World Cup runs in the post-season window (triggers beyond
// totalRounds, processed before season transition).
// ---------------------------------------------------------------------------

export interface InternationalSchedule {
  groupMatchdays: [number, number, number];
  knockout: Partial<Record<InternationalStage, number>>;
}

/** Mid-season AFCON: breaks around rounds 16-26 of a 34-38 round season. */
export function defaultAfconSchedule(totalRounds: number): InternationalSchedule {
  const base = Math.max(8, Math.floor(totalRounds / 2) - 3);
  return {
    groupMatchdays: [base, base + 2, base + 4],
    knockout: { quarter: base + 6, semi: base + 8, final: base + 10 },
  };
}

/** Post-season World Cup window, all triggers past the last league round. */
export function defaultWorldCupSchedule(totalRounds: number): InternationalSchedule {
  return {
    groupMatchdays: [totalRounds + 1, totalRounds + 3, totalRounds + 5],
    knockout: {
      round_of_16: totalRounds + 7,
      quarter: totalRounds + 9,
      semi: totalRounds + 11,
      final: totalRounds + 13,
    },
  };
}

// ---------------------------------------------------------------------------
// Field selection
// ---------------------------------------------------------------------------

/** AFCON: every African national team (16 in the current universe). */
export function selectAfconField(nationalTeams: NationalTeam[]): NationalTeam[] {
  return [...(nationalTeams || [])]
    .filter(t => t && t.continent === 'AFRICA')
    .sort((a, b) => b.rankingPoints - a.rankingPoints);
}

/** World Cup: the 32 highest-ranked national teams. */
export function selectWorldCupField(nationalTeams: NationalTeam[], size = 32): NationalTeam[] {
  return [...(nationalTeams || [])]
    .sort((a, b) => b.rankingPoints - a.rankingPoints)
    .slice(0, size);
}

// ---------------------------------------------------------------------------
// Seeded draw (snake seeding into groups of 4)
// ---------------------------------------------------------------------------

const ARABIC_GROUP_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];

export function drawInternationalGroups(field: NationalTeam[], groupSize = 4): InternationalGroup[] {
  const seeded = [...field].sort((a, b) => b.rankingPoints - a.rankingPoints);
  const groupCount = Math.max(1, Math.floor(seeded.length / groupSize));
  const groups: InternationalGroup[] = [];
  for (let g = 0; g < groupCount; g++) {
    groups.push({
      id: `grp_${g}`,
      name: `المجموعة ${ARABIC_GROUP_LETTERS[g] || g + 1}`,
      teamIds: [],
      standings: [],
    });
  }
  // Snake seeding: pot order A->H then H->A, keeps groups balanced
  seeded.forEach((nt, idx) => {
    const round = Math.floor(idx / groupCount);
    const pos = idx % groupCount;
    const target = round % 2 === 0 ? pos : groupCount - 1 - pos;
    groups[target].teamIds.push(nt.id);
  });
  for (const g of groups) {
    g.standings = g.teamIds.map(teamId => blankStanding(teamId, seeded.find(t => t.id === teamId)?.name || teamId));
  }
  return groups;
}

function blankStanding(teamId: string, teamName: string): InternationalGroupStanding {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Standings — strict 3/1/0 points, tiebreak: GD, then GF, then wins
// ---------------------------------------------------------------------------

export function sortInternationalStandings(rows: InternationalGroupStanding[]): InternationalGroupStanding[] {
  return [...rows].sort((a, b) =>
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    b.won - a.won ||
    a.teamName.localeCompare(b.teamName, 'ar')
  );
}

export function recalculateInternationalGroupStandings(
  group: InternationalGroup,
  matches: InternationalMatch[]
): InternationalGroupStanding[] {
  const table = new Map<string, InternationalGroupStanding>();
  for (const teamId of group.teamIds) {
    const existing = group.standings.find(s => s.teamId === teamId);
    table.set(teamId, blankStanding(teamId, existing?.teamName || teamId));
  }
  const apply = (teamId: string, gf: number, ga: number) => {
    const row = table.get(teamId);
    if (!row) return;
    row.played += 1;
    row.goalsFor += gf;
    row.goalsAgainst += ga;
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    if (gf > ga) {
      row.won += 1;
      row.points += 3;
    } else if (gf === ga) {
      row.drawn += 1;
      row.points += 1;
    } else {
      row.lost += 1;
    }
  };
  for (const m of matches || []) {
    if (!m || !m.isPlayed || m.groupId !== group.id || m.stage !== 'group') continue;
    if (typeof m.homeScore !== 'number' || typeof m.awayScore !== 'number') continue;
    apply(m.homeTeamId, m.homeScore, m.awayScore);
    apply(m.awayTeamId, m.awayScore, m.homeScore);
  }
  return sortInternationalStandings(Array.from(table.values()));
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Round-robin pairings for one group of 4 across 3 matchdays. */
const ROUND_ROBIN_4: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

function makeGroupFixtures(
  tournamentId: string,
  competitionId: InternationalCompetitionId,
  groups: InternationalGroup[],
  schedule: InternationalSchedule
): InternationalMatch[] {
  const matches: InternationalMatch[] = [];
  for (const group of groups) {
    ROUND_ROBIN_4.forEach((pairs, mdIdx) => {
      const roundTrigger = schedule.groupMatchdays[mdIdx];
      for (const [h, a] of pairs) {
        const homeTeamId = group.teamIds[h];
        const awayTeamId = group.teamIds[a];
        if (!homeTeamId || !awayTeamId) continue;
        matches.push({
          id: `${tournamentId}_${group.id}_md${mdIdx + 1}_${homeTeamId}_v_${awayTeamId}`,
          competitionId,
          stage: 'group',
          stageName: 'دور المجموعات',
          groupId: group.id,
          matchday: mdIdx + 1,
          roundTrigger,
          homeTeamId,
          awayTeamId,
          isPlayed: false,
        });
      }
    });
  }
  return matches;
}

export function initInternationalTournament(
  competitionId: InternationalCompetitionId,
  seasonNumber: number,
  nationalTeams: NationalTeam[],
  schedule: InternationalSchedule,
  userTeamId?: string | null
): InternationalTournament {
  const isAfcon = competitionId === 'afcon';
  const field = isAfcon ? selectAfconField(nationalTeams) : selectWorldCupField(nationalTeams);
  const groups = drawInternationalGroups(field, 4);
  const id = `${competitionId}_s${seasonNumber}`;
  const matches = makeGroupFixtures(id, competitionId, groups, schedule);
  return {
    id,
    competitionId,
    name: isAfcon ? 'كأس الأمم الإفريقية' : 'كأس العالم',
    trophyName: isAfcon ? 'كأس الأمم الإفريقية 🏆' : 'كأس العالم 🏆',
    seasonNumber,
    groups,
    matches,
    participantTeamIds: field.map(t => t.id),
    currentStage: 'group',
    isCompleted: false,
    userTeamId: userTeamId && field.some(t => t.id === userTeamId) ? userTeamId : undefined,
  };
}

// ---------------------------------------------------------------------------
// Knockout bracket
// ---------------------------------------------------------------------------

const STAGE_NAMES: Record<InternationalStage, string> = {
  group: 'دور المجموعات',
  round_of_16: 'دور الـ16',
  quarter: 'ربع النهائي',
  semi: 'نصف النهائي',
  final: 'النهائي',
};

function groupRankings(tournament: InternationalTournament, groupId: string): InternationalGroupStanding[] {
  const group = tournament.groups.find(g => g.id === groupId);
  if (!group) return [];
  return recalculateInternationalGroupStandings(group, tournament.matches);
}

/** team at position `pos` (0-based) in group index `g`. */
function placed(tournament: InternationalTournament, g: number, pos: number): string | null {
  const group = tournament.groups[g];
  if (!group) return null;
  return groupRankings(tournament, group.id)[pos]?.teamId || null;
}

function nextStageAfter(stage: InternationalStage, groupCount: number): InternationalStage | 'completed' {
  if (stage === 'group') return groupCount >= 8 ? 'round_of_16' : 'quarter';
  if (stage === 'round_of_16') return 'quarter';
  if (stage === 'quarter') return 'semi';
  if (stage === 'semi') return 'final';
  return 'completed';
}

/**
 * Builds the next knockout round once the current stage is fully played.
 * Returns null when the tournament is already complete or the stage is not
 * finished yet.
 */
export function buildNextKnockoutRound(tournament: InternationalTournament): InternationalMatch[] | null {
  if (tournament.isCompleted) return null;
  const stage = tournament.currentStage as InternationalStage;
  const groupCount = tournament.groups.length;
  const stageMatches = tournament.matches.filter(m => m.stage === stage);
  if (stageMatches.length === 0 || stageMatches.some(m => !m.isPlayed)) return null;

  const next = nextStageAfter(stage, groupCount);
  if (next === 'completed') return null;

  let pairings: Array<[string, string]> = [];
  if (stage === 'group') {
    if (groupCount >= 8) {
      // World Cup R16: A1vB2 C1vD2 E1vF2 G1vH2 | B1vA2 D1vC2 F1vE2 H1vG2
      for (let i = 0; i < 8; i += 2) {
        const a1 = placed(tournament, i, 0);
        const b2 = placed(tournament, i + 1, 1);
        const b1 = placed(tournament, i + 1, 0);
        const a2 = placed(tournament, i, 1);
        if (a1 && b2) pairings.push([a1, b2]);
        if (b1 && a2) pairings.push([b1, a2]);
      }
    } else {
      // AFCON QF: A1vB2 B1vA2 C1vD2 D1vC2 (for 4 groups)
      for (let i = 0; i < groupCount; i += 2) {
        const a1 = placed(tournament, i, 0);
        const b2 = placed(tournament, i + 1, 1);
        const b1 = placed(tournament, i + 1, 0);
        const a2 = placed(tournament, i, 1);
        if (a1 && b2) pairings.push([a1, b2]);
        if (b1 && a2) pairings.push([b1, a2]);
      }
    }
  } else {
    // Winners advance in bracket order: M1 winner vs M2 winner, ...
    const winners = stageMatches.map(m => m.winnerTeamId).filter((w): w is string => !!w);
    for (let i = 0; i + 1 < winners.length; i += 2) {
      pairings.push([winners[i], winners[i + 1]]);
    }
  }

  if (pairings.length === 0) return null;

  const trigger = 0; // resolved by caller through the schedule
  return pairings.map(([homeTeamId, awayTeamId], idx) => ({
    id: `${tournament.id}_${next}_${idx + 1}`,
    competitionId: tournament.competitionId,
    stage: next,
    stageName: STAGE_NAMES[next],
    roundTrigger: trigger,
    homeTeamId,
    awayTeamId,
    isPlayed: false,
  }));
}

// ---------------------------------------------------------------------------
// Match play + tournament advancement
// ---------------------------------------------------------------------------

function stageRankingWeight(stage: InternationalStage | 'friendly'): number {
  switch (stage) {
    case 'final': return 5;
    case 'semi': return 4;
    case 'quarter':
    case 'round_of_16': return 3;
    case 'group': return 2;
    default: return 1; // friendly
  }
}

/** Simple NT ranking update: weighted by stage, bonus for beating a stronger team. */
export function applyRankingUpdate(
  home: NationalTeam,
  away: NationalTeam,
  homeScore: number,
  awayScore: number,
  stage: InternationalStage | 'friendly'
): void {
  const weight = stageRankingWeight(stage);
  const applySide = (team: NationalTeam, opp: NationalTeam, gf: number, ga: number) => {
    team.stats.played += 1;
    team.stats.goalsFor += gf;
    team.stats.goalsAgainst += ga;
    let delta = 0;
    if (gf > ga) {
      team.stats.won += 1;
      delta = 10 * weight;
      if (opp.rankingPoints > team.rankingPoints) delta += Math.round((opp.rankingPoints - team.rankingPoints) * 0.05);
    } else if (gf === ga) {
      team.stats.drawn += 1;
      delta = 4 * weight;
    } else {
      team.stats.lost += 1;
      delta = Math.max(0, 2 * weight - Math.round((team.rankingPoints - opp.rankingPoints) * 0.02));
    }
    team.rankingPoints = Math.max(0, team.rankingPoints + delta);
  };
  applySide(home, away, homeScore, awayScore);
  applySide(away, home, awayScore, homeScore);
}

/** Recomputes worldRank across the whole NT universe after results. */
export function recomputeNationalTeamWorldRanks(nationalTeams: NationalTeam[]): void {
  const ranked = [...(nationalTeams || [])].sort((a, b) => b.rankingPoints - a.rankingPoints);
  ranked.forEach((nt, idx) => {
    nt.previousWorldRank = nt.worldRank || idx + 1;
    nt.worldRank = idx + 1;
  });
}

export interface PlayMatchOutcome {
  match: InternationalMatch;
}

/** Plays a single international match (group → simulateMatch, knockout → ET/penalties). */
export function playInternationalMatch(
  match: InternationalMatch,
  nationalTeams: NationalTeam[]
): InternationalMatch {
  if (match.isPlayed) return match;
  const home = getNationalTeamById(nationalTeams, match.homeTeamId);
  const away = getNationalTeamById(nationalTeams, match.awayTeamId);
  if (!home || !away) return match;

  const played: InternationalMatch = { ...match };
  if (match.stage === 'group' || match.stage === 'friendly') {
    const res = simulateMatch(nationalTeamToClub(home), nationalTeamToClub(away));
    played.homeScore = res.homeScore;
    played.awayScore = res.awayScore;
  } else {
    const res = simulateKnockoutMatch(nationalTeamToClub(home), nationalTeamToClub(away));
    played.homeScore = res.homeScore;
    played.awayScore = res.awayScore;
    played.homePenalties = res.homePenalties;
    played.awayPenalties = res.awayPenalties;
    played.winnerTeamId = res.winnerTeamId;
  }
  played.isPlayed = true;
  if (played.stage === 'group') {
    played.winnerTeamId =
      (played.homeScore ?? 0) > (played.awayScore ?? 0)
        ? played.homeTeamId
        : (played.awayScore ?? 0) > (played.homeScore ?? 0)
          ? played.awayTeamId
          : undefined;
  }
  applyRankingUpdate(home, away, played.homeScore ?? 0, played.awayScore ?? 0, played.stage);
  return played;
}

/**
 * Plays every due match (roundTrigger <= currentRound) and advances the
 * tournament through stages when a stage completes. Mutates a cloned
 * tournament; the caller stores the result. Also updates the NT objects'
 * stats and ranking points in place (they are the caller's copies).
 */
export function processInternationalRound(
  tournament: InternationalTournament,
  currentRound: number,
  nationalTeams: NationalTeam[],
  schedule: InternationalSchedule
): { tournament: InternationalTournament; playedMatches: InternationalMatch[] } {
  let t: InternationalTournament = {
    ...tournament,
    groups: tournament.groups.map(g => ({ ...g, standings: g.standings.map(s => ({ ...s })), teamIds: [...g.teamIds] })),
    matches: tournament.matches.map(m => ({ ...m })),
  };
  const playedMatches: InternationalMatch[] = [];

  // 1. Play due matches of the current stage
  t.matches = t.matches.map(m => {
    if (m.isPlayed || m.roundTrigger > currentRound) return m;
    const played = playInternationalMatch(m, nationalTeams);
    playedMatches.push(played);
    return played;
  });

  // 2. Refresh group standings
  for (const group of t.groups) {
    group.standings = recalculateInternationalGroupStandings(group, t.matches);
  }

  // 3. Advance stage when complete
  const stage = t.currentStage as InternationalStage;
  const stageMatches = t.matches.filter(m => m.stage === stage);
  const stageComplete = stageMatches.length > 0 && stageMatches.every(m => m.isPlayed);

  if (stageComplete && !t.isCompleted) {
    if (stage === 'final') {
      const finalMatch = t.matches.find(m => m.stage === 'final');
      if (finalMatch?.winnerTeamId) {
        t.isCompleted = true;
        t.currentStage = 'completed';
        t.winnerTeamId = finalMatch.winnerTeamId;
        t.runnerUpTeamId =
          finalMatch.winnerTeamId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;
        if (t.userTeamId && t.userTeamId !== t.winnerTeamId) t.userEliminatedStage = 'final';
      }
    } else {
      const nextMatches = buildNextKnockoutRound(t);
      if (nextMatches) {
        const nextStage = nextMatches[0].stage as InternationalStage;
        const trigger = schedule.knockout[nextStage];
        const withTriggers = nextMatches.map(m => ({ ...m, roundTrigger: trigger ?? m.roundTrigger }));
        // Track user elimination before moving on
        if (t.userTeamId && stage !== 'group') {
          const userMatch = stageMatches.find(m => m.homeTeamId === t.userTeamId || m.awayTeamId === t.userTeamId);
          if (userMatch && userMatch.winnerTeamId !== t.userTeamId) t.userEliminatedStage = stage;
        }
        if (t.userTeamId && stage === 'group') {
          const stillIn = withTriggers.some(m => m.homeTeamId === t.userTeamId || m.awayTeamId === t.userTeamId);
          if (!stillIn) t.userEliminatedStage = 'group';
        }
        t.matches = [...t.matches, ...withTriggers];
        t.currentStage = nextStage;
      }
    }
  }

  return { tournament: t, playedMatches };
}

/** All matches of a given team inside a tournament, group stage first. */
export function getTeamTournamentMatches(tournament: InternationalTournament, teamId: string): InternationalMatch[] {
  return (tournament.matches || []).filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
}
