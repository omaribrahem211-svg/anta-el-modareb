import facts from './mls2026RosterFacts.json';
import { parseCompactPlayer } from './compactSquadBuilder';
import type { RealPlayerTemplate } from './realPlayersData';
import type { Position, PreferredFoot } from '../types/game';
import { WORLD_STARS_POOL } from '../services/worldStarService';

export interface MLSRealPlayerTemplate extends RealPlayerTemplate {
  birthDate: string;
  rosterSourceUrls: string[];
  rosterSnapshotDate: string;
  isGameFiller: false;
  gameDataNote: string;
  originalPosition: string;
  isPositionAdapted: boolean;
  isPreferredFootEstimated: boolean;
  sourceShirtNumber: number | null;
}

export const MLS_DATA_NOTE = 'اللاعبون والأندية من قوائم موثقة بتاريخ 22 نوفمبر 2026. التقييمات والقدرات والقيم والرواتب موازنة للعبة، وليست إحصاءات واقعية. المراكز والقدم غير المؤكدة تُكيّف للمحاكاة.';
const normalize = (name: string) => name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const stars = new Map(WORLD_STARS_POOL.map(player => [normalize(player.nameEn), player]));
const hash = (id: string) => [...id].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 17);
const positionAdaptations: Record<string, Position> = { 'Right Midfield': 'RW', 'Left Midfield': 'LW', 'Second Striker': 'ST' };

/** Pure conversion of supported biographies. No generated depth is mixed into these 832 records.
 * Ratings, economics and unknown-foot defaults are game parameters, not claimed source facts.
 */
export function buildMLSRealSquads(): Record<string, MLSRealPlayerTemplate[]> {
  return Object.fromEntries(facts.clubs.map(club => {
    const reserved = new Set(club.players.map(p => p.number).filter((n): n is number => n != null && n > 0));
    const assigned = new Set<number>();
    const players = club.players.map((source, index): MLSRealPlayerTemplate => {
      const position = (source.position || positionAdaptations[source.rawPosition]) as Position;
      if (!position) throw new Error(`Unmapped MLS position for ${source.id}`);
      const birth = new Date(`${source.birthDate}T00:00:00Z`);
      const asOf = new Date(`${facts.asOf}T00:00:00Z`);
      const age = asOf.getUTCFullYear() - birth.getUTCFullYear() - (asOf.getUTCMonth() < birth.getUTCMonth() || (asOf.getUTCMonth() === birth.getUTCMonth() && asOf.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
      const star = stars.get(normalize(source.name));
      const seed = hash(source.id);
      const base = source.rosterCategory === 'Senior' ? 69 : source.rosterCategory.startsWith('Supplemental') ? 57 : 65;
      const overall = star?.overallRating ?? Math.max(49, Math.min(79, base + seed % 9 - (age > 34 ? 3 : 0)));
      const potential = age < 24 ? Math.min(86, overall + Math.max(2, 25 - age)) : overall;
      const valueMillions = Math.max(0.1, Math.round(Math.pow(1.13, overall - 60) * (age > 32 ? 0.35 : age < 24 ? 1.2 : 1) * 10) / 10);
      let number = source.number || 0;
      if (!number || assigned.has(number)) {
        number = 1;
        while (reserved.has(number) || assigned.has(number)) number++;
      }
      assigned.add(number);
      const template = parseCompactPlayer(club.id, 'usa_tier_1', `${source.name}|${position}|${age}|${overall}|${potential}|${valueMillions}|${source.nationalityCode}`, index, number);
      return {
        ...template,
        id: source.id,
        name: star?.name || source.name,
        firstName: source.firstName,
        lastName: source.lastName,
        nationality: template.nationality === source.nationalityCode ? source.nationality : template.nationality,
        preferredFoot: (source.preferredFoot || template.preferredFoot) as PreferredFoot,
        ...(star ? { attributes: { ...star.attributes } } : {}),
        birthDate: source.birthDate,
        rosterSourceUrls: [...source.sourceUrls],
        rosterSnapshotDate: facts.asOf,
        isGameFiller: false,
        gameDataNote: MLS_DATA_NOTE,
        originalPosition: source.rawPosition,
        isPositionAdapted: source.position == null,
        isPreferredFootEstimated: source.preferredFoot == null,
        sourceShirtNumber: source.number,
      };
    });
    return [club.id, players];
  }));
}
