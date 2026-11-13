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
  const ovr = (p: any): number => Number(p?.overallRating ?? p?.rating ?? 0);
  const ps = (c.players || []).filter(p => p && ovr(p) > 0);
  if (ps.length === 0) return c.reputation || 40;
  const top = ps.map(p => ovr(p)).sort((a, b) => b - a).slice(0, 16);
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

/**
 * Self-healing pass for saved worlds whose league sizes drifted (e.g. a Premier League with 24 clubs, 46 rounds, and nobody
 * ever relegated). Every league with a bundled definition is brought back to its original club count:
 *  - surplus clubs (weakest first, never the user's club) are pushed one division down, cascading to the bottom tier,
 *    where the extra clubs are simply dropped;
 *  - missing clubs are filled by promoting the strongest clubs of the division below.
 * No-op on healthy worlds. Returns the ids of the leagues that were repaired.
 */
export function normalizeLeagueSizes(userClubId?: string): string[] {
  const repaired: string[] = [];
  const pyramids = getCountryPyramids();
  for (const country of Object.keys(pyramids)) {
    const list = pyramids[country];
    const rosters = new Map<string, Club[]>();
    list.forEach(l => rosters.set(l.id, [...(l.teams || [])]));
    const target = (l: LeagueDefinition): number => {
      const bundled = GLOBAL_LEAGUES[l.id]?.teams?.length || 0;
      if (!bundled) return 0;
      return bundled % 2 === 0 ? bundled : bundled + 1;
    };
    const touched = new Set<string>();
    const weakest = (arr: Club[]) => [...arr].filter(c => c.id !== userClubId).sort((a, b) => clubStrength(a) - clubStrength(b));

    // 1) Trim surplus top-down so overflow cascades into the next division
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      const want = target(l);
      const cur = rosters.get(l.id)!;
      if (!want || cur.length <= want) continue;
      const surplus = weakest(cur).slice(0, cur.length - want);
      const ids = new Set(surplus.map(c => c.id));
      rosters.set(l.id, cur.filter(c => !ids.has(c.id)));
      touched.add(l.id);
      const lower = list[i + 1];
      if (lower && lower.tier === l.tier + 1) {
        const tagged = surplus.map(c => ({ ...c, division: lower.tier, leagueId: lower.id, country: lower.country, previousDivision: l.tier, isNewlyPromoted: false }));
        rosters.set(lower.id, [...rosters.get(lower.id)!, ...tagged]);
        touched.add(lower.id);
      }
    }
    // 2) Fill shortages bottom-up from the division below
    for (let i = list.length - 2; i >= 0; i--) {
      const l = list[i];
      const lower = list[i + 1];
      const want = target(l);
      const cur = rosters.get(l.id)!;
      if (!want || cur.length >= want || !lower || lower.tier !== l.tier + 1) continue;
      const low = rosters.get(lower.id)!;
      const need = Math.min(want - cur.length, Math.max(0, low.length - Math.floor(target(lower) * 0.75)));
      if (need <= 0) continue;
      const best = [...low].filter(c => c.id !== userClubId).sort((a, b) => clubStrength(b) - clubStrength(a)).slice(0, need);
      const ids = new Set(best.map(c => c.id));
      rosters.set(lower.id, low.filter(c => !ids.has(c.id)));
      rosters.set(l.id, [...cur, ...best.map(c => ({ ...c, division: l.tier, leagueId: l.id, country: l.country, previousDivision: lower.tier, isNewlyPromoted: true }))]);
      touched.add(l.id); touched.add(lower.id);
    }
    touched.forEach(id => { updateLeagueRosterInWorld(id, rosters.get(id)!); repaired.push(id); });
  }
  return repaired;
}
