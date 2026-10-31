/**
 * Domestic Cup engine (pure functions, no React state, no effects).
 *
 * Design rules (to avoid the old freezes):
 *  - The ONLY source of truth for the cup is the fixtures list (competitionType === 'DOMESTIC_COP').
 *  - The first round is created when the season schedule is generated.
 *  - Later rounds are created by progressCupFixtures(), which is idempotent: if the next stage
 *    already exists, or the current stage is not completely played, it returns the SAME array.
 *  - The cup object shown in the UI is derived (deriveCupTournament) and never written back.
 */
import type { Club, CupMatch, CupTournament, Fixture } from '../types/game';
import { getAllClubsForCountry } from '../data/leaguesData';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { CalendarManager } from './calendarManager';

export type CupStage = 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final';

const STAGE_ORDER: CupStage[] = ['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];
const MAX_PARTICIPANTS = 32;
const MIN_PARTICIPANTS = 8;

const STAGE_FOR_SIZE: Record<number, CupStage> = {
  64: 'round_of_64',
  32: 'round_of_32',
  16: 'round_of_16',
  8: 'quarter',
};

export function isCupFixture(f: Fixture | null | undefined): boolean {
  if (!f) return false;
  return f.competitionType === 'DOMESTIC_COP' || f.tournamentId === 'cup' || Boolean(f.cupStage);
}

function largestPowerOfTwoAtMost(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

function winnerOf(f: Fixture): string | undefined {
  if (f.winnerTeamId) return f.winnerTeamId;
  const hs = f.homeScore ?? 0;
  const as = f.awayScore ?? 0;
  if (hs > as) return f.homeTeamId;
  if (as > hs) return f.awayTeamId;
  if (f.homePenalties !== undefined && f.awayPenalties !== undefined && f.homePenalties !== f.awayPenalties) {
    return f.homePenalties > f.awayPenalties ? f.homeTeamId : f.awayTeamId;
  }
  // A drawn cup match with no shootout must never block the bracket: home side advances.
  return f.homeTeamId;
}

/** Rounds of the league season after which each cup stage is played (always a Tuesday, before the last league round). */
function cupStageDate(stage: CupStage, seasonNumber: number, totalLeagueRounds: number): Date {
  const R = Math.max(10, totalLeagueRounds || 38);
  const raw: Record<CupStage, number> = {
    round_of_64: Math.ceil(R * 0.08),
    round_of_32: Math.ceil(R * 0.16),
    round_of_16: Math.ceil(R * 0.34),
    quarter: Math.ceil(R * 0.55),
    semi: Math.ceil(R * 0.76),
    final: R - 1,
  };
  // keep strictly increasing and the final strictly before the last league round
  let prev = 0;
  const ordered: Record<string, number> = {};
  STAGE_ORDER.forEach(st => {
    const v = st === 'final' ? Math.max(raw.final, prev + 1) : Math.max(raw[st], prev + 1);
    ordered[st] = Math.min(v, R - 1);
    prev = ordered[st];
  });
  const { startYear } = CalendarManager.getSeasonDateRange(seasonNumber);
  const leagueStart = new Date(startYear, 7, 15); // same anchor used by the league schedule (Saturday rounds)
  const d = new Date(leagueStart);
  d.setDate(leagueStart.getDate() + (ordered[stage] - 1) * 7 + 3); // Tuesday after that league round
  return d;
}

function buildStageFixtures(params: {
  stage: CupStage;
  pairs: Array<[string, string]>;
  seasonNumber: number;
  totalLeagueRounds: number;
  cupId: string;
  cupName: string;
  cupShortName: string;
}): Fixture[] {
  const { stage, pairs, seasonNumber, totalLeagueRounds, cupId, cupName, cupShortName } = params;
  const named = CalendarManager.resolveDomesticCupStageDate(stage, seasonNumber, cupShortName);
  const dateObj = cupStageDate(stage, seasonNumber, totalLeagueRounds);
  const dateStr = CalendarManager.formatDateStr(dateObj);
  const timestamp = dateObj.getTime();
  return pairs.map(([home, away], i) => ({
    id: `fix_cup_${stage}_${i + 1}_s${seasonNumber}`,
    round: 0,
    homeTeamId: home,
    awayTeamId: away,
    competitionType: 'DOMESTIC_COP' as const,
    competitionId: cupId,
    competitionName: cupName,
    tournamentId: 'cup' as const,
    tournamentBadge: `🏆 ${cupShortName}`,
    cupStage: stage,
    stage,
    stageName: named.stageName,
    date: dateStr,
    timestamp,
    isPlayed: false,
  }));
}

/**
 * Picks the cup participants: the user's club (always, if from the same country) plus the best clubs
 * of the first two divisions, up to 32 (always a power of two, never less than 8).
 */
export function selectCupParticipants(country: string, userClub?: Club | null): Club[] {
  let pool: Club[] = [];
  try {
    pool = getAllClubsForCountry(country) || [];
  } catch {
    pool = [];
  }
  const byId = new Map<string, Club>();
  pool.forEach(c => c && c.id && byId.set(c.id, c));

  const topDivisions = Array.from(byId.values())
    .filter(c => (typeof c.division === 'number' ? c.division : 1) <= 2)
    .sort((a, b) => {
      const da = typeof a.division === 'number' ? a.division : 1;
      const db = typeof b.division === 'number' ? b.division : 1;
      if (da !== db) return da - db;
      return (b.reputation || 0) - (a.reputation || 0);
    });

  const candidates = topDivisions.length >= MIN_PARTICIPANTS ? topDivisions : Array.from(byId.values());
  const size = Math.min(
    MAX_PARTICIPANTS,
    Math.max(MIN_PARTICIPANTS, largestPowerOfTwoAtMost(Math.max(candidates.length, MIN_PARTICIPANTS)))
  );

  const picked: Club[] = [];
  const pickedIds = new Set<string>();
  const userInCountry =
    userClub &&
    (byId.has(userClub.id) || !userClub.country || userClub.country === country || country.includes(userClub.country || ''));
  if (userClub && userInCountry) {
    picked.push(userClub);
    pickedIds.add(userClub.id);
  }
  for (const c of candidates) {
    if (picked.length >= size) break;
    if (pickedIds.has(c.id)) continue;
    picked.push(c);
    pickedIds.add(c.id);
  }
  // If the world data is too small, fall back to the largest power of two we can fill.
  const finalSize = Math.min(size, largestPowerOfTwoAtMost(picked.length));
  return finalSize >= 2 ? picked.slice(0, finalSize) : [];
}

/** Creates the first-round fixtures for a season. Returns [] when a cup cannot be built. */
export function buildCupFirstRound(params: {
  seasonNumber: number;
  country: string;
  userClub?: Club | null;
  totalLeagueRounds: number;
}): Fixture[] {
  try {
    const { seasonNumber, country, userClub, totalLeagueRounds } = params;
    const participants = selectCupParticipants(country, userClub);
    if (participants.length < 4) return [];
    const stage = STAGE_FOR_SIZE[participants.length];
    if (!stage) return [];

    const cupDef = getDomesticCupDefinitionForCountry(country || 'مصر');
    const cupName = cupDef.shortName || cupDef.name;

    // Seeding: stronger half vs weaker half, weaker half shuffled for variety.
    const ranked = [...participants].sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
    const half = ranked.length / 2;
    const potA = ranked.slice(0, half);
    const potB = ranked.slice(half).sort(() => Math.random() - 0.5);
    const pairs: Array<[string, string]> = potA.map((c, i) => [c.id, potB[i].id]);

    return buildStageFixtures({
      stage,
      pairs,
      seasonNumber,
      totalLeagueRounds,
      cupId: cupDef.id,
      cupName: cupDef.name,
      cupShortName: cupName,
    });
  } catch (err) {
    console.warn('[CupEngine] Could not build the first cup round:', err);
    return [];
  }
}

/**
 * If the latest cup stage is fully played and the next stage does not exist yet, appends the next stage.
 * Idempotent: returns the SAME array reference when nothing changes.
 */
export function progressCupFixtures(fixtures: Fixture[], seasonNumber: number, country: string): Fixture[] {
  if (!Array.isArray(fixtures)) return fixtures;
  const cupFixtures = fixtures.filter(isCupFixture);
  if (cupFixtures.length === 0) return fixtures;

  const stagesPresent = STAGE_ORDER.filter(s => cupFixtures.some(f => (f.cupStage || f.stage) === s));
  if (stagesPresent.length === 0) return fixtures;
  const lastStage = stagesPresent[stagesPresent.length - 1];
  if (lastStage === 'final') return fixtures;

  const lastStageFixtures = cupFixtures
    .filter(f => (f.cupStage || f.stage) === lastStage)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  if (lastStageFixtures.length === 0 || !lastStageFixtures.every(f => f.isPlayed)) return fixtures;

  const winners = lastStageFixtures.map(winnerOf).filter((w): w is string => Boolean(w));
  if (winners.length < 2 || winners.length % 2 !== 0) return fixtures;

  const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(lastStage) + 1];
  if (!nextStage) return fixtures;

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);

  const totalLeagueRounds = fixtures.reduce(
    (max, f) => (f && !isCupFixture(f) && typeof f.round === 'number' && f.round > max ? f.round : max),
    0
  );
  const cupDef = getDomesticCupDefinitionForCountry(country || 'مصر');
  const created = buildStageFixtures({
    stage: nextStage,
    pairs,
    seasonNumber,
    totalLeagueRounds,
    cupId: cupDef.id,
    cupName: cupDef.name,
    cupShortName: cupDef.shortName || cupDef.name,
  });
  return [...fixtures, ...created];
}

/** Read-only view of the cup for the UI, season summary and qualification rules. */
export function deriveCupTournament(
  fixtures: Fixture[] | null | undefined,
  opts: { seasonNumber: number; country: string; userClubId?: string | null }
): CupTournament | null {
  if (!Array.isArray(fixtures)) return null;
  const cupFixtures = fixtures.filter(isCupFixture);
  if (cupFixtures.length === 0) return null;

  const cupDef = getDomesticCupDefinitionForCountry(opts.country || 'مصر');
  const matches: CupMatch[] = cupFixtures.map(f => ({
    id: f.id,
    stage: ((f.cupStage || f.stage) as CupStage) || 'round_of_32',
    stageName: f.stageName || '',
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
  let winnerClubId: string | undefined;
  let runnerUpClubId: string | undefined;
  if (finalMatch && finalMatch.winnerTeamId) {
    winnerClubId = finalMatch.winnerTeamId;
    runnerUpClubId = finalMatch.winnerTeamId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;
  }

  let userEliminatedStage: string | undefined;
  if (opts.userClubId) {
    const userLost = matches
      .filter(m => m.isPlayed && (m.homeTeamId === opts.userClubId || m.awayTeamId === opts.userClubId))
      .find(m => m.winnerTeamId && m.winnerTeamId !== opts.userClubId);
    if (userLost) userEliminatedStage = userLost.stageName;
  }

  return {
    id: `${cupDef.id}_s${opts.seasonNumber}`,
    name: cupDef.shortName || cupDef.name,
    country: opts.country || cupDef.country,
    seasonNumber: opts.seasonNumber,
    trophyName: `${cupDef.name} 🏆`,
    prizeMoneyWinner: cupDef.championPrize || 3000000,
    prizeMoneyRunnerUp: cupDef.runnerUpPrize || 1500000,
    matches,
    isCompleted: Boolean(finalMatch),
    winnerClubId,
    runnerUpClubId,
    userEliminatedStage,
  };
}

export { settleCupResult } from './cupResult';
