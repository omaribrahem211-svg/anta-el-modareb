import { buildCompactSquads } from '../compactSquadBuilder';
import type { RealPlayerTemplate } from '../realPlayersData';
import { ENGLAND_SQUADS } from './england';
import { SPAIN_SQUADS } from './spain';
import { GERMANY_SQUADS } from './germany';
import { FRANCE_SQUADS } from './france';
import { ITALY_SQUADS } from './italy';

/** league id → compact squads. Add new files here. */
const SOURCES: { leagueId: string; squads: Record<string, string[]> }[] = [
  { leagueId: 'eng_tier_1', squads: ENGLAND_SQUADS },
  { leagueId: 'esp_tier_1', squads: SPAIN_SQUADS },
  { leagueId: 'ger_tier_1', squads: GERMANY_SQUADS },
  { leagueId: 'fra_tier_1', squads: FRANCE_SQUADS },
  { leagueId: 'ita_tier_1', squads: ITALY_SQUADS },
];

export const COMPACT_REAL_SQUADS: Record<string, RealPlayerTemplate[]> = (() => {
  const out: Record<string, RealPlayerTemplate[]> = {};
  SOURCES.forEach(s => Object.assign(out, buildCompactSquads(s.leagueId, s.squads)));
  return out;
})();

export const COMPACT_CLUB_IDS: ReadonlySet<string> = new Set(Object.keys(COMPACT_REAL_SQUADS));
