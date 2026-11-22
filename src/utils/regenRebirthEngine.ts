// Rebirth ("reborn") system: when a notable player retires, he comes back in the same
// season rollover as a 17-19 year old version of himself - same name, nationality and
// position, a fresh career, and potential near his peak. His career record stays in the
// hall-of-fame (RetiredPlayer) archive untouched; the reborn is a brand new Player entity
// linked to the archive only through _rebornOf. A reborn is mortal: he ages, declines and
// retires like anyone else (and can himself be reborn in a later era).
import type { Player, PositionCategory } from '../types/game';

/** Only players at/above this rating come back as reborns - ordinary retirees keep the old random-youth path. */
export const REBIRTH_MIN_RATING = 78;
/** Hard cap for a reborn's potential (matches the existing youth-replenishment cap). */
export const REBIRTH_MAX_POTENTIAL = 92;

export function shouldRebornPlayer(p: { overallRating?: number } | null | undefined): boolean {
  return !!p && Number(p.overallRating || 0) >= REBIRTH_MIN_RATING;
}

export interface RebornContext {
  /** Uniqueness suffix for the new id (e.g. `s<seasonNumber>` or `e<era>`). */
  idSuffix: string;
  clubId: string;
  leagueId?: string | null;
  rand?: () => number;
}

const freshStats = (): Player['stats'] => ({
  appearances: 0,
  starts: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  cleanSheets: 0,
  yellowCards: 0,
  redCards: 0,
  shots: 0,
  shotsOnTarget: 0,
  passes: 0,
  tackles: 0,
  saves: 0,
  averageRating: 7.0,
  motm: 0,
});

/**
 * Build the reborn version of a retiring player. The caller owns dedupe (one reborn per
 * retiree per rollover) and squad placement.
 */
export function buildRebornPlayer(retired: Player, ctx: RebornContext): Player {
  const rand = ctx.rand || Math.random;
  const peak = Math.max(REBIRTH_MIN_RATING, Number(retired.overallRating || REBIRTH_MIN_RATING));
  // Potential lands within 0-3 of the retiree's peak, capped like regular youth.
  const potential = Math.min(REBIRTH_MAX_POTENTIAL, peak - Math.floor(rand() * 4));
  // He starts raw: 10-14 below his potential, leaving real seasons of growth ahead.
  const ovr = Math.max(55, potential - (10 + Math.floor(rand() * 5)));
  const age = 17 + Math.floor(rand() * 3); // 17-19
  const pos = retired.position;
  const cat: PositionCategory =
    retired.positionCategory ||
    (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(pos) ? 'DEF' : ['CM', 'CDM', 'CAM'].includes(pos) ? 'MID' : 'FWD');
  const nameParts = String(retired.name || '').trim().split(/\s+/);
  const firstName = retired.firstName || nameParts[0] || '';
  const lastName = retired.lastName || nameParts.slice(1).join(' ') || nameParts[0] || '';

  const reborn: Player = {
    id: `reborn_${retired.id}_${ctx.idSuffix}`,
    name: retired.name, // the whole point: the star's name lives on
    firstName,
    lastName,
    age,
    position: pos,
    positionCategory: cat,
    overallRating: ovr,
    potentialRating: Math.max(potential, ovr),
    attributes: {
      pace: Math.floor(rand() * 12 + Math.max(62, ovr)),
      shooting: cat === 'FWD' ? ovr + 3 : Math.max(52, ovr - 6),
      passing: cat === 'MID' ? ovr + 3 : Math.max(56, ovr - 2),
      dribbling: cat === 'FWD' || cat === 'MID' ? ovr + 2 : Math.max(55, ovr - 4),
      defending: cat === 'DEF' ? ovr + 3 : pos === 'GK' ? 25 : Math.max(45, ovr - 10),
      physical: Math.floor(rand() * 10 + Math.max(60, ovr - 2)),
      goalkeeping: pos === 'GK' ? ovr + 3 : 20,
    },
    nationality: retired.nationality || 'مصر',
    nationalityCode: retired.nationalityCode || 'EGY',
    currentClubId: ctx.clubId,
    currentLeagueId: ctx.leagueId || retired.currentLeagueId,
    marketValue: Math.round(ovr * 15000),
    salary: Math.round(ovr * 65),
    contractYears: 3,
    fitness: 100,
    morale: 90,
    form: 7,
    number: Math.floor(rand() * 50 + 40),
    stats: freshStats(),
    _rebornOf: retired.id,
    _realisticCalibratedV2: true,
  } as any;
  return reborn;
}
