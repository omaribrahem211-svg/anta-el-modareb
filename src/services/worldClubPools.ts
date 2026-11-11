// Live pools of TOP-FLIGHT clubs per continent, read from the current world (so promoted / relegated clubs are right).
import type { Club } from '../types/game';
import { GLOBAL_LEAGUES, getCustomLeagues } from '../data/leaguesData';

/** All clubs that CURRENTLY play in a tier-1 league of the given continent (never lower divisions). */
export function getLiveTopFlightPool(continent: string): Club[] {
  const all = { ...GLOBAL_LEAGUES, ...getCustomLeagues() };
  const seen = new Set<string>();
  const out: Club[] = [];
  for (const l of Object.values(all)) {
    if (!l || l.tier !== 1 || String(l.continent || '').toUpperCase() !== continent.toUpperCase()) continue;
    for (const c of l.teams || []) {
      if (!c || !c.id || seen.has(c.id)) continue;
      if (typeof c.division === 'number' && c.division > 1) continue; // belt and braces
      if ((c.players || []).length < 11) continue;
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

export const WORLD_CUP_CONTINENTS = ['AFRICA', 'EUROPE', 'ASIA', 'SOUTH_AMERICA'] as const;

export function getLiveTopFlightPoolsByContinent(): Record<string, Club[]> {
  const out: Record<string, Club[]> = {};
  for (const k of WORLD_CUP_CONTINENTS) out[k] = getLiveTopFlightPool(k);
  return out;
}
