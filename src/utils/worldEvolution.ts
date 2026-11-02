// Living world: AI players age/develop/retire, AI clubs invest to strengthen themselves,
// and AI managers grow (or decline) from season to season. Keeps the game fresh for the user.
import type { Club, Player } from '../types/game';
import { GLOBAL_COUNTRIES } from '../data/countriesData';
import { GLOBAL_LEAGUES, getCustomLeagues, updateLeagueRosterInWorld } from '../data/leaguesData';
import { getOrCreateClubManager } from '../data/worldManagersData';
import { syncPlayerMarketValueWithRating } from './transferEngine';

type Rng = () => number;

const ovrOf = (p: any): number => {
  const v = Number(p?.overallRating ?? p?.rating ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 65;
};

export function avgTopOvr(c: Club, n = 16): number {
  const o = (c.players || []).filter(Boolean).map(ovrOf).sort((a, b) => b - a).slice(0, n);
  return o.length ? o.reduce((s, v) => s + v, 0) / o.length : 60;
}

function scaleAttrs(p: any, delta: number): any {
  const a = p.attributes;
  if (!a || typeof a !== 'object' || delta === 0) return a;
  const f = (v: any, min: number) => (Number.isFinite(Number(v)) ? Math.min(99, Math.max(min, Math.round(Number(v) + delta))) : v);
  return {
    ...a,
    pace: f(a.pace, 38), shooting: f(a.shooting, 28), passing: f(a.passing, 32),
    dribbling: f(a.dribbling, 32), defending: f(a.defending, 28), physical: f(a.physical, 40),
    ...(a.goalkeeping !== undefined ? { goalkeeping: f(a.goalkeeping, 15) } : {}),
  };
}

/** One year of natural development / decline (same curve as the user's league rollover). */
export function progressPlayerOneYear(p: Player, rng: Rng): Player {
  const age = (p.age || 25) + 1;
  const ovr = ovrOf(p);
  const pot = Math.max(ovr, Number((p as any).potentialRating ?? ovr + (age <= 23 ? 5 : 2)));
  const gk = (p as any).position === 'GK';
  let d = 0;
  if (age <= 23 && ovr < pot) d = Math.min(pot - ovr, Math.floor(rng() * 3) + 1);
  else if (age <= 27 && ovr < pot) d = Math.min(pot - ovr, Math.floor(rng() * 2) + (rng() < 0.65 ? 1 : 0));
  else if (age <= 30) d = ovr < pot && rng() < 0.35 ? 1 : 0;
  else if (age <= 32) d = gk ? 0 : rng() < 0.5 ? -1 : 0;
  else if (age <= 34) d = gk ? (rng() < 0.5 ? -1 : 0) : -(Math.floor(rng() * 2) + 1);
  else d = gk ? -(Math.floor(rng() * 2) + 1) : -(Math.floor(rng() * 3) + 1);
  const next = Math.min(99, Math.max(Math.min(ovr, 55), ovr + Math.max(-3, Math.min(3, d))));
  const actual = next - ovr;
  const out: any = {
    ...p,
    age,
    overallRating: next,
    potentialRating: Math.max(next, pot),
    attributes: scaleAttrs(p, actual),
    contractYears: Math.max(0, (p.contractYears ?? 2) - 1) || 2 + Math.floor(rng() * 2), // AI renews expiring deals
    fitness: 100,
    isInjured: false,
  };
  if (actual !== 0) {
    try { out.marketValue = syncPlayerMarketValueWithRating(out, ovr); } catch { /* keep old value */ }
  }
  return out;
}

function shouldRetire(p: Player, rng: Rng): boolean {
  const age = p.age || 25;
  if (age >= 40) return true;
  if (age < 35) return false;
  const prob = age === 35 ? 0.18 : age === 36 ? 0.3 : age === 37 ? 0.48 : age === 38 ? 0.7 : 0.88;
  return rng() < prob + (ovrOf(p) < 72 ? 0.12 : 0);
}

function makeRegen(old: Player, club: Club, clubBase: number, rng: Rng): Player {
  const code = (club as any).countryCode || 'EGY';
  const pool = (GLOBAL_COUNTRIES as any)[code]?.playerNamePool || (GLOBAL_COUNTRIES as any)['EGY']?.playerNamePool;
  const first = pool?.firstNames?.[Math.floor(rng() * pool.firstNames.length)] || 'محمد';
  const last = pool?.lastNames?.[Math.floor(rng() * pool.lastNames.length)] || 'علي';
  const base = Math.max(55, Math.min(86, Math.round(clubBase - 8 - rng() * 4)));
  const a: any = (old as any).attributes || {};
  const shift = base - ovrOf(old);
  return {
    ...(old as any),
    id: `regen_${club.id}_${Date.now().toString(36)}_${Math.floor(rng() * 1e6).toString(36)}`,
    name: `${first} ${last}`,
    firstName: first,
    lastName: last,
    age: 17 + Math.floor(rng() * 3),
    overallRating: base,
    potentialRating: Math.min(93, Math.round(clubBase) + Math.floor(rng() * 5) - 1),
    attributes: scaleAttrs({ attributes: a }, shift),
    marketValue: Math.round(base * 15000),
    salary: Math.round(base * 65),
    contractYears: 3,
    morale: 85,
    form: 7,
    stats: { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0, averageRating: 7.0, motm: 0 },
  } as Player;
}

/** Club "invests": upgrades its weakest regulars, more if it is below what its reputation/budget deserves. */
export function strengthenClub(club: Club, leagueMeanOvr: number, leagueMeanRep: number, rng: Rng, pressure = 0, rank01 = 0.5): Club {
  const players = (club.players || []).filter(Boolean);
  if (players.length < 12) return club;
  const target = leagueMeanOvr + ((club.reputation || leagueMeanRep) - leagueMeanRep) * 0.22;
  const gap = target - avgTopOvr(club);               // >0 => underperforming its standing
  const budget = Number(club.budget || 0);
  let n = budget > 30_000_000 ? 2 : 1;
  if ((club as any).isNewlyPromoted) n += 1;
  if (gap > 2) n += 1;
  if (gap < -1 && !(pressure > 0 && rank01 < 0.5)) n = 0;
  if (pressure > 0 && rank01 < 0.5) n += 1;      // rivals respond to a dominant champion              // over-achievers do not keep inflating
  if (n <= 0) return club;

  const sorted = [...players].sort((a, b) => ovrOf(b) - ovrOf(a)).slice(0, 15);
  const weakest = sorted.slice(-n * 2).filter(p => (p.age || 25) < 33);
  const picks = weakest.sort(() => rng() - 0.5).slice(0, n);
  const ids = new Map<string, Player>();
  for (const p of picks) {
    const bump = 1 + Math.floor(rng() * 2);                              // +1..+2 (new signing / promoted youngster)
    const cap = Math.min(94, Math.round(target + 3 + (pressure > 0 && rank01 < 0.5 ? 3 : 0)));
    const next = Math.min(cap, ovrOf(p) + bump);
    const actual = next - ovrOf(p);
    if (actual <= 0) continue;
    const upd: any = { ...p, overallRating: next, potentialRating: Math.max(next, Number((p as any).potentialRating || next)), attributes: scaleAttrs(p, actual) };
    try { upd.marketValue = syncPlayerMarketValueWithRating(upd, ovrOf(p)); } catch { /* ignore */ }
    ids.set(p.id, upd);
  }
  if (!ids.size) return club;
  return { ...club, players: club.players.map(p => (p && ids.has(p.id) ? ids.get(p.id)! : p)) };
}

/** Manager grows with experience and results, plateaus, then slowly declines. */
export function developManager(club: Club, strengthRank01: number, rng: Rng): Club {
  const m: any = (club as any).manager || getOrCreateClubManager(club);
  const age = (m.age || 50) + 1;
  const r = Number(m.rating || 65);
  let d = 0;
  if (age < 48) d = rng() < 0.7 ? 1 : 0;
  else if (age < 58) d = rng() < 0.45 ? 1 : 0;
  else if (age < 64) d = rng() < 0.2 ? 1 : (rng() < 0.2 ? -1 : 0);
  else d = rng() < 0.4 ? -1 : 0;
  // results vs expectation: strengthRank01 0 = best squad, 1 = worst squad. Good managers overperform.
  if (rng() < 0.25) d += strengthRank01 > 0.6 ? (rng() < 0.4 ? 1 : 0) : (rng() < 0.2 ? -1 : 0);
  const rating = Math.min(94, Math.max(50, r + Math.max(-2, Math.min(2, d))));
  const rep = Math.min(95, Math.max(15, Math.round((m.reputation || club.reputation || 40) + (rating - r) * 1.5)));
  return {
    ...club,
    manager: { ...m, age, rating, reputation: rep, rankingPoints: Math.round((m.rankingPoints || rating * 20) + (rating - r) * 25), currentClubId: club.id, currentClubName: club.name, currentLeagueId: club.leagueId },
  } as Club;
}

/** Strengthen clubs + develop managers for a list of AI clubs (user club is never touched). */
export function evolveAIClubs(teams: Club[], isUser: (c: Club) => boolean, rng: Rng = Math.random, pressure = 0): Club[] {
  const ai = teams.filter(t => !isUser(t));
  if (!ai.length) return teams;
  const meanOvr = ai.reduce((s, c) => s + avgTopOvr(c), 0) / ai.length;
  const meanRep = ai.reduce((s, c) => s + (c.reputation || 40), 0) / ai.length;
  const ranked = [...ai].sort((a, b) => avgTopOvr(b) - avgTopOvr(a));
  const rankOf = new Map(ranked.map((c, i) => [c.id, ranked.length > 1 ? i / (ranked.length - 1) : 0.5]));
  return teams.map(c => {
    if (isUser(c)) return c;
    let x = strengthenClub(c, meanOvr, meanRep, rng, pressure, rankOf.get(c.id) ?? 0.5);
    x = developManager(x, rankOf.get(c.id) ?? 0.5, rng);
    // reputation drifts toward real strength
    const drift = Math.round(((meanRep + (avgTopOvr(x) - meanOvr) * 1.2) - (x.reputation || meanRep)) * 0.15);
    return { ...x, reputation: Math.min(99, Math.max(10, (x.reputation || meanRep) + Math.max(-2, Math.min(2, drift)))) };
  });
}

/**
 * Full yearly evolution for all leagues except the user's active one
 * (that league is aged by the season rollover itself and then passed to evolveAIClubs).
 */
export function evolveWorldLeagues(excludeLeagueIds: string[], isUser: (c: Club) => boolean, rng: Rng = Math.random): void {
  const all = { ...GLOBAL_LEAGUES, ...getCustomLeagues() };
  for (const league of Object.values(all)) {
    if (!league || excludeLeagueIds.includes(league.id) || !Array.isArray(league.teams) || !league.teams.length) continue;
    const aged = league.teams.map(club => {
      if (!club || isUser(club)) return club;
      const idMap = new Map<string, string>();
      const base = avgTopOvr(club);
      const players: Player[] = [];
      for (const p of club.players || []) {
        if (!p) continue;
        const prog = progressPlayerOneYear(p, rng);
        if (shouldRetire(prog, rng)) {
          const r = makeRegen(prog, club, base, rng);
          idMap.set(p.id, r.id);
          players.push(r);
        } else players.push(prog);
      }
      let tactics: any = club.tactics;
      if (tactics && idMap.size) {
        const m = (id: string) => idMap.get(id) || id;
        tactics = {
          ...tactics,
          startingPlayerIds: (tactics.startingPlayerIds || []).map(m),
          benchPlayerIds: (tactics.benchPlayerIds || []).map(m),
          captainId: tactics.captainId ? m(tactics.captainId) : tactics.captainId,
          penaltyTakerId: tactics.penaltyTakerId ? m(tactics.penaltyTakerId) : tactics.penaltyTakerId,
        };
      }
      return { ...club, players, tactics, isNewlyPromoted: false } as Club;
    });
    updateLeagueRosterInWorld(league.id, evolveAIClubs(aged as Club[], isUser, rng));
  }
}
