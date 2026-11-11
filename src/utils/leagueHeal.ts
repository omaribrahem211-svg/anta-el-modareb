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

/** Keeps the first club for each id (a club listed twice in a league plays two matches per round). */
export function dedupeClubsById<T extends { id?: string }>(clubs: T[]): T[] {
  const seen = new Set<string>();
  return (clubs || []).filter(c => {
    if (!c || !c.id) return false;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

const shiftDate = (d: string | undefined, days: number): string | undefined => {
  if (!d) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return undefined;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

/**
 * Repairs a league whose schedule was generated with a club listed twice (or otherwise gives a club two
 * matches in one round): extra same-round fixtures are dropped, then every missing home/away pair is
 * scheduled in the rounds that are still ahead, so each club ends with exactly (n-1)*2 league matches.
 * Returns null when nothing is wrong.
 */
export function repairLeagueFixtures(fixtures: Fixture[], teams: Club[], currentRound: number): Fixture[] | null {
  const ids = new Set(dedupeClubsById(teams as any[]).map((t: any) => t.id as string));
  if (ids.size < 4) return null;
  const league = fixtures.filter(f => f && isLeague(f) && (f.round ?? 0) > 0);
  if (league.length === 0) return null;

  // 1. detect a club with 2 matches in one round, or a repeated ordered pair
  const perRound = new Map<number, Set<string>>();
  const pairSeen = new Set<string>();
  let corrupt = false;
  for (const f of league) {
    const s = perRound.get(f.round) || new Set<string>();
    if (s.has(f.homeTeamId) || s.has(f.awayTeamId)) corrupt = true;
    s.add(f.homeTeamId); s.add(f.awayTeamId); perRound.set(f.round, s);
    const pk = `${f.homeTeamId}>${f.awayTeamId}`;
    if (pairSeen.has(pk)) corrupt = true;
    pairSeen.add(pk);
  }
  if (!corrupt) return null;

  // 2. keep a valid subset (played ones first, in round order)
  const ordered = [...league].sort((a, b) => Number(!!b.isPlayed) - Number(!!a.isPlayed) || a.round - b.round);
  const busy = new Map<number, Set<string>>();
  const havePair = new Set<string>();
  const keep = new Set<string>();
  for (const f of ordered) {
    if (!ids.has(f.homeTeamId) || !ids.has(f.awayTeamId) || f.homeTeamId === f.awayTeamId) continue;
    const pk = `${f.homeTeamId}>${f.awayTeamId}`;
    const s = busy.get(f.round) || new Set<string>();
    if (havePair.has(pk) || s.has(f.homeTeamId) || s.has(f.awayTeamId)) continue;
    s.add(f.homeTeamId); s.add(f.awayTeamId); busy.set(f.round, s);
    havePair.add(pk);
    keep.add(String(f.id));
  }
  const kept = league.filter(f => keep.has(String(f.id)));
  const others = fixtures.filter(f => !(f && isLeague(f) && (f.round ?? 0) > 0));

  // 3. schedule missing pairs in rounds that have not been played yet
  const roundDate = new Map<number, { date?: string; timestamp?: number }>();
  kept.forEach(f => { if (!roundDate.has(f.round) && f.date) roundDate.set(f.round, { date: f.date, timestamp: f.timestamp }); });
  const sample = kept.find(f => !f.isPlayed) || kept[0];
  const lastRound = Math.max(...kept.map(f => f.round));
  const firstOpen = Math.max(1, kept.filter(f => f.isPlayed).reduce((m, f) => Math.max(m, f.round), 0) + 1, 1);
  const startRound = Math.max(firstOpen, Math.min(currentRound || firstOpen, firstOpen));
  const list = [...ids];
  const missing: Array<[string, string]> = [];
  for (const h of list) for (const a of list) if (h !== a && !havePair.has(`${h}>${a}`)) missing.push([h, a]);

  const added: Fixture[] = [];
  let seq = 0;
  for (const [h, a] of missing) {
    let r = startRound;
    for (;; r++) {
      const s = busy.get(r) || new Set<string>();
      if (!s.has(h) && !s.has(a)) { s.add(h); s.add(a); busy.set(r, s); break; }
    }
    let rd = roundDate.get(r);
    if (!rd) {
      const base = roundDate.get(lastRound) || roundDate.get(Math.max(...Array.from(roundDate.keys()), 1));
      const date = shiftDate(base?.date, 7 * (r - lastRound));
      rd = { date, timestamp: date ? new Date(date + 'T12:00:00').getTime() : undefined };
      roundDate.set(r, rd);
    }
    added.push({
      ...(sample as Fixture),
      id: `fix_repair_r${r}_${h}_${a}_${seq++}`,
      round: r,
      homeTeamId: h,
      awayTeamId: a,
      isPlayed: false,
      homeScore: undefined,
      awayScore: undefined,
      events: undefined,
      stats: undefined,
      revenueClaimed: undefined,
      matchRevenue: undefined,
      date: rd.date,
      timestamp: rd.timestamp,
      stage: `الجولة ${r}`,
      stageName: `${(sample as any)?.competitionName || ''} - الجولة ${r}`,
    } as Fixture);
  }
  return [...others, ...kept, ...added];
}
