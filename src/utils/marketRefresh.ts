import { Player, ActiveNegotiation } from '../types/game';
import { generateFreeAgentsMarket } from './playerGenerator';

const MAX_FREE_AGENTS = 160;

/**
 * Keeps the free-agent pool alive: every call adds a few fresh free agents from around the world and drops the oldest
 * stale ones (never legends, never a player the user is negotiating with).
 */
export function refreshFreeAgentPool(market: Player[], negotiations: ActiveNegotiation[] = [], addCount = 8): Player[] {
  const base = Array.isArray(market) ? market : [];
  const protectedIds = new Set<string>();
  for (const n of negotiations || []) if (n && n.playerId) protectedIds.add(n.playerId);

  const fresh = generateFreeAgentsMarket(addCount).map((p, i) => ({
    ...p,
    id: `${p.id}_${Math.random().toString(36).slice(2, 6)}${i}`,
    currentClubId: '',
    currentLeagueId: 'free_agents',
    isFreeAgent: true,
    contractYears: 0,
  }));

  let next = [...base, ...fresh];
  if (next.length > MAX_FREE_AGENTS) {
    // Drop the oldest generated free agents first (they are at the front, legends and protected ones are kept)
    let toDrop = next.length - MAX_FREE_AGENTS;
    next = next.filter(p => {
      if (toDrop <= 0) return true;
      if (!p || p.isLegend || protectedIds.has(p.id)) return true;
      toDrop--;
      return false;
    });
  }
  return next;
}
