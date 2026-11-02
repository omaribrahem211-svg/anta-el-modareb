// Promotion / relegation engine for the whole football pyramid.
// Guarantees: no club is lost or duplicated, league sizes never change,
// no relegation happens when no lower division exists.
import type { Club, LeagueDefinition } from '../types/game';
import { GLOBAL_LEAGUES, getCustomLeagues, updateLeagueRosterInWorld } from '../data/leaguesData';

export interface PyramidMovement {
  upperLeagueId: string;
  lowerLeagueId: string;
  promoted: string[];   // club ids moving lower -> upper
  relegated: string[];  // club ids moving upper -> lower
}

function leagueMap(): Record<string, LeagueDefinition> {
  return { ...GLOBAL_LEAGUES, ...getCustomLeagues() };
}

export function clubStrength(c: Club): number {
  const ps = (c.players || []).filter(p => p && typeof (p as any).overall === 'number');
  if (ps.length === 0) return c.reputation || 40;
  const top = ps.map(p => (p as any).overall as number).sort((a, b) => b - a).slice(0, 16);
  const avg = top.reduce((s, v) => s + v, 0) / top.length;
  return avg * 0.8 + (c.reputation || 40) * 0.2;
}

/** All leagues grouped by country, sorted by tier. */
export function getCountryPyramids(): Record<string, LeagueDefinition[]> {
  const out: Record<string, LeagueDefinition[]> = {};
  for (const l of Object.values(leagueMap())) {
    if (!l || !l.country) continue;
    (out[l.country] = out[l.country] || []).push(l);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.tier - b.tier);
  return out;
}

export function hasLowerDivision(league: LeagueDefinition): boolean {
  const list = getCountryPyramids()[league.country] || [];
  return list.some(l => l.tier === league.tier + 1);
}

/** Simulated final table: stronger clubs finish higher on average, but upsets happen. */
function simulatedOrder(teams: Club[], rng: () => number): Club[] {
  return teams
    .map(t => ({ t, s: clubStrength(t) + (rng() - 0.5) * 14 }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.t);
}

/**
 * Apply promotion/relegation for every country's pyramid.
 * `user` (optional) pins the user's club outcome in its real league:
 *  'up' => among promoted, 'down' => among relegated, 'stay' => never moves.
 */
export function applyPyramidMovements(
  user?: { clubId: string; outcome: 'up' | 'down' | 'stay' },
  rng: () => number = Math.random
): PyramidMovement[] {
  const movements: PyramidMovement[] = [];
  const pyramids = getCountryPyramids();

  for (const country of Object.keys(pyramids)) {
    const list = pyramids[country];
    const rosters = new Map<string, Club[]>();
    list.forEach(l => rosters.set(l.id, [...(l.teams || [])]));
    const touched = new Set<string>();
    const moved = new Set<string>(); // a club moves at most one division per season

    for (let i = 0; i < list.length - 1; i++) {
      const upper = list[i];
      const lower = list[i + 1];
      if (lower.tier !== upper.tier + 1) continue;
      const upTeams = rosters.get(upper.id)!;
      const lowTeams = rosters.get(lower.id)!;
      const k = Math.min(
        upper.relegationSpots || 0,
        lower.promotionSpots || 0,
        Math.floor(upTeams.length / 3),
        Math.floor(lowTeams.length / 3)
      );
      if (k <= 0) continue;

      const isUser = (id: string) => !!user && user.clubId === id;
      const pinned = (id: string, dir: 'up' | 'down') => isUser(id) && user!.outcome === dir && !moved.has(id);

      // Relegated from upper (worst of the simulated table, user pinned if relegated)
      let relegated: Club[] = upTeams.filter(t => pinned(t.id, 'down'));
      for (const t of [...simulatedOrder(upTeams, rng)].reverse()) {
        if (relegated.length >= k) break;
        if (isUser(t.id) || moved.has(t.id)) continue; // user's fate is decided by real standings only
        if (!relegated.includes(t)) relegated.push(t);
      }
      relegated = relegated.slice(0, k);

      // Promoted from lower (best of the simulated table, user pinned if promoted)
      let promoted: Club[] = lowTeams.filter(t => pinned(t.id, 'up'));
      for (const t of simulatedOrder(lowTeams, rng)) {
        if (promoted.length >= k) break;
        if (isUser(t.id) || moved.has(t.id)) continue;
        if (!promoted.includes(t)) promoted.push(t);
      }
      promoted = promoted.slice(0, k);

      const n = Math.min(relegated.length, promoted.length);
      if (n <= 0) continue;
      relegated = relegated.slice(0, n);
      promoted = promoted.slice(0, n);
      const relIds = new Set(relegated.map(c => c.id));
      const proIds = new Set(promoted.map(c => c.id));

      const tag = (c: Club, l: LeagueDefinition, up: boolean): Club => ({
        ...c,
        division: l.tier,
        leagueId: l.id,
        country: l.country,
        previousDivision: c.division,
        isNewlyPromoted: up,
      });

      rosters.set(upper.id, [...upTeams.filter(t => !relIds.has(t.id)), ...promoted.map(c => tag(c, upper, true))]);
      rosters.set(lower.id, [...lowTeams.filter(t => !proIds.has(t.id)), ...relegated.map(c => tag(c, lower, false))]);
      touched.add(upper.id);
      touched.add(lower.id);
      relIds.forEach(id => moved.add(id));
      proIds.forEach(id => moved.add(id));
      movements.push({ upperLeagueId: upper.id, lowerLeagueId: lower.id, promoted: [...proIds], relegated: [...relIds] });
    }

    touched.forEach(id => updateLeagueRosterInWorld(id, rosters.get(id)!));
  }
  return movements;
}
