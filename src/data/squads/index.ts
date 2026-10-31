import { buildCompactSquads } from '../compactSquadBuilder';
import type { RealPlayerTemplate } from '../realPlayersData';
import { ENGLAND_SQUADS } from './england';
import { SPAIN_SQUADS } from './spain';

/** league id → compact squads. Add new files here. */
const SOURCES: { leagueId: string; squads: Record<string, string[]> }[] = [
  { leagueId: 'eng_tier_1', squads: ENGLAND_SQUADS },
  { leagueId: 'esp_tier_1', squads: SPAIN_SQUADS },
];

export const COMPACT_REAL_SQUADS: Record<string, RealPlayerTemplate[]> = (() => {
  const out: Record<string, RealPlayerTemplate[]> = {};
  SOURCES.forEach(s => Object.assign(out, buildCompactSquads(s.leagueId, s.squads)));
  return out;
})();

export const COMPACT_CLUB_IDS: ReadonlySet<string> = new Set(Object.keys(COMPACT_REAL_SQUADS));
