// Self-healing for league fixtures: a CPU fixture that could not be simulated (bad data, an exception that was
// swallowed...) would stay unplayed forever, so the round never advances and the game "stops at round N".
// This resolves such fixtures with a plausible result so the season can always continue.
import type { Club, Fixture, LeagueStanding } from '../types/game';
import { updateLeagueStandings } from './engine';

const isLeague = (f: any): boolean => {
  const t = String(f?.competitionType || f?.tournamentId || 'LEAGUE').toUpperCase();
  return t === 'LEAGUE' || t === 'DOMESTIC_LEAGUE' || t === 'DEFAULT';
};

function strengthOf(club?: Club): number {
  const ps = ((club as any)?.players || []).filter(Boolean).map((p: any) => Number(p.overallRating ?? p.rating ?? 0)).filter((n: number) => n > 0);
  if (!ps.length) return Number((club as any)?.rating ?? (club as any)?.reputation ?? 65) || 65;
  const top = ps.sort((a: number, b: number) => b - a).slice(0, 14);
  return top.reduce((s: number, v: number) => s + v, 0) / top.length;
}

function poisson(lambda: number, rnd: () => number): number {
  const L = Math.exp(-Math.max(0.05, lambda));
  let k = 0;
  let p = 1;
  do { k++; p *= rnd(); } while (p > L && k < 8);
  return k - 1;
}

export interface HealResult {
  fixtures: Fixture[];
  standings: LeagueStanding[];
  healed: number;
}

/**
 * Resolves unplayed LEAGUE fixtures of rounds <= upToRound that do not involve `protectUserId`
 * (the user's own matches are always played/simulated through the normal flow).
 */
export function healStaleLeagueFixtures(params: {
  fixtures: Fixture[];
  standings: LeagueStanding[];
  teams: Club[];
  upToRound: number;
  protectUserId?: string;
  rnd?: () => number;
}): HealResult {
  const { teams, upToRound, protectUserId } = params;
  const rnd = params.rnd || Math.random;
  const byId = new Map<string, Club>();
  (teams || []).forEach(t => { if (t && t.id) byId.set(t.id, t); });
  let standings = params.standings;
  let healed = 0;
  const fixtures = params.fixtures.map(f => {
    if (!f || f.isPlayed || !isLeague(f)) return f;
    if ((f.round || 0) > upToRound) return f;
    if (protectUserId && (f.homeTeamId === protectUserId || f.awayTeamId === protectUserId)) return f;
    const h = strengthOf(byId.get(f.homeTeamId));
    const a = strengthOf(byId.get(f.awayTeamId));
    const diff = (h - a) / 40;
    const homeGoals = poisson(1.35 + diff + 0.15, rnd);
    const awayGoals = poisson(1.15 - diff, rnd);
    standings = updateLeagueStandings(standings, f.homeTeamId, f.awayTeamId, homeGoals, awayGoals);
    healed++;
    return { ...f, homeScore: homeGoals, awayScore: awayGoals, isPlayed: true, events: [] } as Fixture;
  });
  return { fixtures, standings, healed };
}
