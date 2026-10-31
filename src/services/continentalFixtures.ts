/**
 * Continental tournaments as fixtures (pure functions, no React state, no effects).
 *
 * Same rules as the domestic cup:
 *  - the fixtures list is the ONLY source of truth;
 *  - group-stage fixtures are created with the season schedule (4 groups x 4 teams, 6 matchdays);
 *  - quarter-finals / semi-finals / final are appended by progressContinentalFixtures(), which is
 *    idempotent (returns the SAME array when nothing changes);
 *  - the tournament object used by the UI is derived (deriveContinentalTournament), never stored.
 */
import type {
  Club,
  ContinentalGroup,
  ContinentalGroupStanding,
  ContinentalMatch,
  ContinentalTournament,
  Fixture,
} from '../types/game';
import {
  initContinentalTournamentByCode,
  getContinentalCodesForContinent,
  resolveClubContinent,
  isClubEligibleForContinentalQualification,
} from '../utils/continentalEngine';
import { findClubInWorld } from '../data/leaguesData';
import { CalendarManager } from './calendarManager';
import { cupStageRounds } from './cupEngine';

export type ContinentalCode = 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2';

export interface ContinentalSetup {
  primaryCode: 'ccl' | 'ucl' | 'acl';
  secondaryCode: 'ccc' | 'uel' | 'acl2';
  /** Clubs that qualified for the primary / secondary competition (may be empty: the draw fills the field). */
  primaryClubIds: string[];
  secondaryClubIds: string[];
  userQualifiedPrimary: boolean;
  userQualifiedSecondary: boolean;
}

const KNOCKOUT_ORDER = ['quarter', 'semi', 'final'] as const;
type KnockoutStage = (typeof KNOCKOUT_ORDER)[number];

export function isContinentalFixture(f: Fixture | null | undefined): boolean {
  if (!f) return false;
  return f.competitionType === 'CONTINENTAL_CUP' || f.competitionType === 'continental';
}

export function isContinentalKnockoutFixture(f: Fixture | null | undefined): boolean {
  return isContinentalFixture(f) && (f!.stage || 'group') !== 'group';
}

function codeOf(f: Fixture): ContinentalCode {
  const raw = String(f.competitionId || f.tournamentId || 'ccl').toLowerCase();
  return (['ccl', 'ccc', 'ucl', 'uel', 'acl', 'acl2'].includes(raw) ? raw : 'ccl') as ContinentalCode;
}

const REGION_OF_CODE: Record<ContinentalCode, 'africa' | 'europe' | 'asia'> = {
  ccl: 'africa',
  ccc: 'africa',
  ucl: 'europe',
  uel: 'europe',
  acl: 'asia',
  acl2: 'asia',
};

const PRIZES: Record<ContinentalCode, { winner: number; runnerUp: number }> = {
  ccl: { winner: 8000000, runnerUp: 4000000 },
  ucl: { winner: 10000000, runnerUp: 5000000 },
  acl: { winner: 8000000, runnerUp: 4000000 },
  ccc: { winner: 4000000, runnerUp: 2000000 },
  uel: { winner: 5000000, runnerUp: 2500000 },
  acl2: { winner: 4000000, runnerUp: 2000000 },
};

export function defaultContinentalSetup(userClub?: Club | null, activeLeagueCountryOrClub?: any): ContinentalSetup {
  let continent: any = 'AFRICA';
  try {
    continent = resolveClubContinent(userClub as any, activeLeagueCountryOrClub as any);
  } catch {
    continent = 'AFRICA';
  }
  const codes = getContinentalCodesForContinent(continent);
  return {
    primaryCode: codes.primaryCode,
    secondaryCode: codes.secondaryCode,
    primaryClubIds: [],
    secondaryClubIds: [],
    userQualifiedPrimary: false,
    userQualifiedSecondary: false,
  };
}

/** Continental ties are played on Wednesdays after league rounds that never collide with cup rounds. */
function continentalRounds(totalLeagueRounds: number): { groups: number[]; quarter: number; semi: number; final: number } {
  const R = Math.max(10, totalLeagueRounds || 38);
  const cup = new Set<number>(Object.values(cupStageRounds(R)));
  const cap = R - 3; // leave room for the final (R - 2), which is before the last league round
  // 6 group matchdays + quarter-final + semi-final
  const wanted = [0.1, 0.22, 0.3, 0.44, 0.62, 0.69, 0.78, 0.88].map(f => Math.max(1, Math.round(R * f)));
  const result: number[] = [];
  let prev = 0;
  wanted.forEach(w => {
    let v = Math.max(w, prev + 1);
    while (cup.has(v) && v < cap) v += 1;
    v = Math.max(Math.min(v, cap), prev + 1);
    result.push(v);
    prev = v;
  });
  return {
    groups: result.slice(0, 6),
    quarter: result[6],
    semi: result[7],
    final: Math.min(Math.max(prev + 1, R - 2), R - 1),
  };
}

function continentalDate(afterRound: number, seasonNumber: number): { dateStr: string; timestamp: number } {
  const { startYear } = CalendarManager.getSeasonDateRange(seasonNumber);
  const leagueStart = new Date(startYear, 7, 15);
  const d = new Date(leagueStart);
  d.setDate(leagueStart.getDate() + (afterRound - 1) * 7 + 4); // Wednesday after that league round
  return { dateStr: CalendarManager.formatDateStr(d), timestamp: d.getTime() };
}

/**
 * Builds the group-stage fixtures for ONE continental competition: the one the user qualified for,
 * or the primary competition of the user's continent (AI clubs only) when the user did not qualify.
 */
export function buildContinentalFixtures(params: {
  seasonNumber: number;
  teams: Club[];
  userClub?: Club | null;
  setup: ContinentalSetup;
  totalLeagueRounds: number;
}): Fixture[] {
  try {
    const { seasonNumber, teams, userClub, setup, totalLeagueRounds } = params;
    const resolveClubs = (ids: string[]): Club[] =>
      ids
        .map(id => teams.find(t => t.id === id) || findClubInWorld(id))
        .filter((c): c is Club => Boolean(c && isClubEligibleForContinentalQualification(c)));

    const primaryExcluded = new Set<string>();
    if (userClub && !setup.userQualifiedPrimary) primaryExcluded.add(userClub.id);

    const primary = initContinentalTournamentByCode(
      setup.primaryCode,
      seasonNumber,
      teams,
      setup.userQualifiedPrimary ? userClub || undefined : undefined,
      resolveClubs(setup.primaryClubIds),
      primaryExcluded
    );

    let active: ContinentalTournament = primary;
    if (setup.userQualifiedSecondary && userClub) {
      const primaryIds = new Set<string>(primary.groups.flatMap(g => g.teamIds));
      const secondary = initContinentalTournamentByCode(
        setup.secondaryCode,
        seasonNumber,
        teams,
        userClub,
        resolveClubs(setup.secondaryClubIds),
        primaryIds
      );
      if (secondary.groups.some(g => g.teamIds.includes(userClub.id))) active = secondary;
    }

    const code = active.competitionId as ContinentalCode;
    const meta = CalendarManager.getContinentalMeta(code, active.name);
    const rounds = continentalRounds(totalLeagueRounds);

    const groupMatches = (active.matches || []).filter(m => m && (m.stage || 'group') === 'group');
    return groupMatches.map((m, i) => {
      const md = Math.min(6, Math.max(1, m.matchday || 1));
      const when = continentalDate(rounds.groups[md - 1], seasonNumber);
      return {
        id: `fix_cont_${code}_g${m.groupId || 'X'}_md${md}_${i + 1}_s${seasonNumber}`,
        round: 0,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        competitionType: 'CONTINENTAL_CUP' as const,
        competitionId: code,
        competitionName: meta.name,
        tournamentId: code as Fixture['tournamentId'],
        tournamentBadge: meta.badge,
        stage: 'group',
        stageName: `${meta.name} - دور المجموعات - الجولة ${md}`,
        groupId: m.groupId,
        matchday: md,
        date: when.dateStr,
        timestamp: when.timestamp,
        isPlayed: false,
      };
    });
  } catch (err) {
    console.warn('[ContinentalFixtures] Could not build the continental group stage:', err);
    return [];
  }
}

function winnerOf(f: Fixture): string {
  if (f.winnerTeamId) return f.winnerTeamId;
  const hs = f.homeScore ?? 0;
  const as = f.awayScore ?? 0;
  if (hs > as) return f.homeTeamId;
  if (as > hs) return f.awayTeamId;
  if (f.homePenalties !== undefined && f.awayPenalties !== undefined && f.homePenalties !== f.awayPenalties) {
    return f.homePenalties > f.awayPenalties ? f.homeTeamId : f.awayTeamId;
  }
  return f.homeTeamId; // never block the bracket
}

function computeGroupStandings(groupFixtures: Fixture[], teamIds: string[]): ContinentalGroupStanding[] {
  const map = new Map<string, ContinentalGroupStanding>();
  teamIds.forEach(id => {
    map.set(id, {
      teamId: id,
      teamName: findClubInWorld(id)?.name || id,
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
  groupFixtures
    .filter(f => f.isPlayed && typeof f.homeScore === 'number' && typeof f.awayScore === 'number')
    .forEach(f => {
      const h = map.get(f.homeTeamId);
      const a = map.get(f.awayTeamId);
      if (!h || !a) return;
      const hs = f.homeScore as number;
      const as = f.awayScore as number;
      h.played++; a.played++;
      h.goalsFor += hs; h.goalsAgainst += as;
      a.goalsFor += as; a.goalsAgainst += hs;
      if (hs > as) { h.won++; a.lost++; h.points += 3; }
      else if (as > hs) { a.won++; h.lost++; a.points += 3; }
      else { h.drawn++; a.drawn++; h.points += 1; a.points += 1; }
    });
  const list = Array.from(map.values());
  list.forEach(s => (s.goalDifference = s.goalsFor - s.goalsAgainst));
  return list.sort(
    (x, y) =>
      y.points - x.points ||
      y.goalDifference - x.goalDifference ||
      y.goalsFor - x.goalsFor ||
      x.teamId.localeCompare(y.teamId)
  );
}

function buildKnockoutFixtures(params: {
  stage: KnockoutStage;
  pairs: Array<[string, string]>;
  code: ContinentalCode;
  seasonNumber: number;
  totalLeagueRounds: number;
}): Fixture[] {
  const { stage, pairs, code, seasonNumber, totalLeagueRounds } = params;
  const meta = CalendarManager.getContinentalMeta(code);
  const rounds = continentalRounds(totalLeagueRounds);
  const when = continentalDate(rounds[stage], seasonNumber);
  const stageLabel = stage === 'quarter' ? 'ربع النهائي' : stage === 'semi' ? 'نصف النهائي' : 'النهائي';
  return pairs.map(([home, away], i) => ({
    id: `fix_cont_${code}_${stage}_${i + 1}_s${seasonNumber}`,
    round: 0,
    homeTeamId: home,
    awayTeamId: away,
    competitionType: 'CONTINENTAL_CUP' as const,
    competitionId: code,
    competitionName: meta.name,
    tournamentId: code as Fixture['tournamentId'],
    tournamentBadge: meta.badge,
    stage,
    stageName: `${meta.name} - ${stageLabel}`,
    date: when.dateStr,
    timestamp: when.timestamp,
    isPlayed: false,
  }));
}

/** Appends the next knockout stage when the previous one is complete. Idempotent. */
export function progressContinentalFixtures(fixtures: Fixture[], seasonNumber: number): Fixture[] {
  if (!Array.isArray(fixtures)) return fixtures;
  const cont = fixtures.filter(isContinentalFixture);
  if (cont.length === 0) return fixtures;
  const code = codeOf(cont[0]);
  const totalLeagueRounds = fixtures.reduce(
    (max, f) =>
      f && !isContinentalFixture(f) && f.competitionType !== 'DOMESTIC_COP' && typeof f.round === 'number' && f.round > max
        ? f.round
        : max,
    0
  );
  const byStage = (st: string) =>
    cont.filter(f => (f.stage || 'group') === st).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  const groupFx = byStage('group');
  if (groupFx.length === 0) return fixtures;

  if (byStage('quarter').length === 0) {
    if (!groupFx.every(f => f.isPlayed)) return fixtures;
    const groupIds = Array.from(new Set(groupFx.map(f => f.groupId || 'X'))).sort();
    const qualifiers: Array<{ first: string; second: string }> = groupIds.map(gid => {
      const gFx = groupFx.filter(f => (f.groupId || 'X') === gid);
      const teamIds = Array.from(new Set(gFx.flatMap(f => [f.homeTeamId, f.awayTeamId])));
      const table = computeGroupStandings(gFx, teamIds);
      return { first: table[0]?.teamId, second: table[1]?.teamId };
    });
    if (qualifiers.some(q => !q.first || !q.second)) return fixtures;
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i + 1 < qualifiers.length; i += 2) {
      pairs.push([qualifiers[i].first, qualifiers[i + 1].second]);
      pairs.push([qualifiers[i + 1].first, qualifiers[i].second]);
    }
    if (pairs.length === 0) return fixtures;
    return [...fixtures, ...buildKnockoutFixtures({ stage: 'quarter', pairs, code, seasonNumber, totalLeagueRounds })];
  }

  const advance = (from: KnockoutStage, to: KnockoutStage): Fixture[] | null => {
    const src = byStage(from);
    if (src.length === 0 || byStage(to).length > 0 || !src.every(f => f.isPlayed)) return null;
    const winners = src.map(winnerOf);
    if (winners.length < 2 || winners.length % 2 !== 0) return null;
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);
    return buildKnockoutFixtures({ stage: to, pairs, code, seasonNumber, totalLeagueRounds });
  };

  const toSemi = advance('quarter', 'semi');
  if (toSemi) return [...fixtures, ...toSemi];
  const toFinal = advance('semi', 'final');
  if (toFinal) return [...fixtures, ...toFinal];
  return fixtures;
}

/** Read-only tournament view for the UI, season summary and qualification rules. */
export function deriveContinentalTournament(
  fixtures: Fixture[] | null | undefined,
  opts: { seasonNumber: number; userClubId?: string | null }
): ContinentalTournament | null {
  if (!Array.isArray(fixtures)) return null;
  const cont = fixtures.filter(isContinentalFixture);
  if (cont.length === 0) return null;

  const code = codeOf(cont[0]);
  const meta = CalendarManager.getContinentalMeta(code);
  const groupFx = cont.filter(f => (f.stage || 'group') === 'group');

  const groupIds = Array.from(new Set(groupFx.map(f => f.groupId || 'X'))).sort();
  const groups: ContinentalGroup[] = groupIds.map(gid => {
    const gFx = groupFx.filter(f => (f.groupId || 'X') === gid);
    const teamIds = Array.from(new Set(gFx.flatMap(f => [f.homeTeamId, f.awayTeamId])));
    return { id: gid, name: `المجموعة ${gid}`, teamIds, standings: computeGroupStandings(gFx, teamIds) };
  });

  const matches: ContinentalMatch[] = cont.map(f => ({
    id: f.id,
    stage: ((f.stage || 'group') as ContinentalMatch['stage']),
    stageName: f.stageName || '',
    groupId: f.groupId,
    matchday: f.matchday,
    roundTrigger: 0,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    homeScore: typeof f.homeScore === 'number' ? f.homeScore : undefined,
    awayScore: typeof f.awayScore === 'number' ? f.awayScore : undefined,
    homePenalties: f.homePenalties,
    awayPenalties: f.awayPenalties,
    isPlayed: Boolean(f.isPlayed),
    winnerTeamId: f.isPlayed ? winnerOf(f) : undefined,
    events: f.events,
    stats: f.stats,
  }));

  const finalMatch = matches.find(m => m.stage === 'final' && m.isPlayed);
  let currentStage: ContinentalTournament['currentStage'] = 'group';
  if (finalMatch) currentStage = 'completed';
  else if (matches.some(m => m.stage === 'final')) currentStage = 'final';
  else if (matches.some(m => m.stage === 'semi')) currentStage = 'semi';
  else if (matches.some(m => m.stage === 'quarter')) currentStage = 'quarter';

  let userEliminatedStage: string | undefined;
  if (opts.userClubId) {
    const inGroup = groups.some(g => g.teamIds.includes(opts.userClubId!));
    if (inGroup) {
      const lostKnockout = matches.find(
        m => m.stage !== 'group' && m.isPlayed && (m.homeTeamId === opts.userClubId || m.awayTeamId === opts.userClubId) && m.winnerTeamId !== opts.userClubId
      );
      if (lostKnockout) {
        userEliminatedStage = lostKnockout.stageName;
      } else if (matches.some(m => m.stage === 'quarter')) {
        const reached = matches.some(m => m.stage === 'quarter' && (m.homeTeamId === opts.userClubId || m.awayTeamId === opts.userClubId));
        if (!reached) userEliminatedStage = 'دور المجموعات';
      }
    }
  }

  return {
    id: `${code}_s${opts.seasonNumber}`,
    competitionId: code,
    name: meta.name,
    region: REGION_OF_CODE[code],
    seasonNumber: opts.seasonNumber,
    trophyName: `${meta.name} 🏆`,
    prizeMoneyWinner: PRIZES[code].winner,
    prizeMoneyRunnerUp: PRIZES[code].runnerUp,
    groups,
    matches,
    isCompleted: Boolean(finalMatch),
    winnerClubId: finalMatch ? finalMatch.winnerTeamId : undefined,
    runnerUpClubId: finalMatch
      ? finalMatch.winnerTeamId === finalMatch.homeTeamId
        ? finalMatch.awayTeamId
        : finalMatch.homeTeamId
      : undefined,
    userEliminatedStage,
    currentStage,
  };
}
