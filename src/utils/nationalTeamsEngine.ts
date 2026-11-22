// =========================================================================
// National Teams Engine (محرك المنتخبات)
// -------------------------------------------------------------------------
// FULLY ISOLATED from club logic. This module:
//   - scans EXISTING club players and groups them by nationalityCode
//   - builds 23-man CALL-UP squads (snapshots) — never buys/sells/generates
//   - creates statistical-strength teams for countries without real players
//   - adapts a NationalTeam into the Club shape the match engine expects
// It is imported only by national-team code paths; club engines never import it.
// =========================================================================

import {
  Club,
  ContinentCode,
  Continent,
  Player,
  PositionCategory,
  TeamTactics,
} from '../types/game';
import { GLOBAL_COUNTRIES } from '../data/countriesData';
import { SUPPLEMENTARY_NATIONS } from '../data/nationalTeamsData';
import {
  NationalTeam,
  NationalTeamStats,
} from '../types/nationalTeams';

export const NT_ID_PREFIX = 'nt_';
export const CALL_UP_SQUAD_SIZE = 23;
export const MIN_REAL_PLAYERS_FOR_FULL_SQUAD = 23;

/** Call-up quotas per position category (sums to 23). */
const CATEGORY_QUOTAS: ReadonlyArray<readonly [PositionCategory, number]> = [
  ['GK', 3],
  ['DEF', 8],
  ['MID', 7],
  ['FWD', 5],
];

const EMPTY_STATS: NationalTeamStats = {
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
};

export function isNationalTeamId(id?: string | null): boolean {
  return typeof id === 'string' && id.startsWith(NT_ID_PREFIX);
}

export function nationalTeamIdForCountry(countryCode: string): string {
  return `${NT_ID_PREFIX}${countryCode}`;
}

function normalizeContinent(continent?: Continent | ContinentCode | string): ContinentCode {
  const raw = String(continent || '').trim().toUpperCase();
  if (raw === 'EUROPE') return 'EUROPE';
  if (raw === 'ASIA') return 'ASIA';
  if (raw === 'SOUTH_AMERICA' || raw === 'SOUTH AMERICA') return 'SOUTH_AMERICA';
  if (raw === 'NORTH_AMERICA' || raw === 'NORTH AMERICA') return 'NORTH_AMERICA';
  return 'AFRICA';
}

/**
 * Maps a raw country football level (1-100) to the reputation scale the match
 * engine uses for player-less teams (base strength = reputation * 1.2 + 20).
 * A level-85 nation lands around an 82-rated squad strength.
 */
export function statisticalReputationFromLevel(footballLevel: number): number {
  const targetStrength = 45 + Math.max(1, Math.min(100, footballLevel)) * 0.45;
  const rep = Math.round((targetStrength - 20) / 1.2);
  return Math.max(30, Math.min(95, rep));
}

/**
 * Scans every club squad and groups real players by nationalityCode.
 * Excludes one-match guest stars and announced retirees. READ-ONLY: the
 * source club players are never mutated here.
 */
export function collectNationalPool(teams: Club[]): Map<string, Player[]> {
  const pool = new Map<string, Player[]>();
  // The same real player can appear in more than one squad data source
  // (overlapping squad files); keep the strongest copy of each id.
  const seen = new Map<string, Player>();
  for (const club of teams || []) {
    for (const player of club?.players || []) {
      if (!player || !player.id) continue;
      if (player.isGuestStar || player.isGameFiller) continue;
      if (player.announcedRetirement) continue;
      const code = (player.nationalityCode || '').trim().toUpperCase();
      if (!code) continue;
      const prior = seen.get(player.id);
      if (prior && (prior.overallRating || 0) >= (player.overallRating || 0)) continue;
      seen.set(player.id, player);
      const list = pool.get(code);
      if (list) {
        const idx = prior ? list.findIndex(p => p.id === player.id) : -1;
        if (idx >= 0) list[idx] = player;
        else list.push(player);
      } else {
        pool.set(code, [player]);
      }
    }
  }
  return pool;
}

function byRatingDesc(a: Player, b: Player): number {
  return (b.overallRating || 0) - (a.overallRating || 0);
}

function categoryOf(player: Player): PositionCategory {
  const cat = player.positionCategory;
  if (cat === 'GK' || cat === 'DEF' || cat === 'MID' || cat === 'FWD') return cat;
  // Fallbacks for legacy data missing positionCategory
  const pos = player.position;
  if (pos === 'GK') return 'GK';
  if (pos === 'CB' || pos === 'RB' || pos === 'LB') return 'DEF';
  if (pos === 'CDM' || pos === 'CM' || pos === 'CAM') return 'MID';
  return 'FWD';
}

/**
 * Picks the best 23 players by rating with realistic position coverage
 * (3 GK / 8 DEF / 7 MID / 5 FWD). Shortfalls in one category are filled by
 * the best remaining players regardless of category.
 */
export function selectCallUpSquad(poolPlayers: Player[], size: number = CALL_UP_SQUAD_SIZE): Player[] {
  const eligible = (poolPlayers || []).filter(p => p && p.id && typeof p.overallRating === 'number');
  const byCategory = new Map<PositionCategory, Player[]>();
  for (const cat of ['GK', 'DEF', 'MID', 'FWD'] as PositionCategory[]) byCategory.set(cat, []);
  for (const p of eligible) byCategory.get(categoryOf(p))!.push(p);
  for (const list of byCategory.values()) list.sort(byRatingDesc);

  const picked: Player[] = [];
  const pickedIds = new Set<string>();

  for (const [cat, quota] of CATEGORY_QUOTAS) {
    const list = byCategory.get(cat) || [];
    for (const p of list.slice(0, quota)) {
      picked.push(p);
      pickedIds.add(p.id);
    }
  }

  if (picked.length < size) {
    const rest = eligible.filter(p => !pickedIds.has(p.id)).sort(byRatingDesc);
    for (const p of rest) {
      if (picked.length >= size) break;
      picked.push(p);
      pickedIds.add(p.id);
    }
  }

  // Final trim keeps the strongest mix while never dropping a goalkeeper
  // below one (a squad with zero GKs would break the match engine).
  let squad = picked.slice(0, size);
  if (!squad.some(p => categoryOf(p) === 'GK')) {
    const anyGk = eligible.filter(p => categoryOf(p) === 'GK').sort(byRatingDesc)[0];
    if (anyGk) {
      squad[squad.length - 1] = anyGk;
    }
  }
  return squad;
}

/**
 * Builds default tactics for an AI-managed national team from its call-up
 * squad: best XI by rating with a 4-3-3 shape, bench = next 7.
 */
export function buildNationalTeamTactics(players: Player[]): TeamTactics | undefined {
  if (!players || players.length === 0) return undefined;
  const sorted = [...players].sort(byRatingDesc);
  const gk = sorted.filter(p => categoryOf(p) === 'GK');
  const def = sorted.filter(p => categoryOf(p) === 'DEF');
  const mid = sorted.filter(p => categoryOf(p) === 'MID');
  const fwd = sorted.filter(p => categoryOf(p) === 'FWD');

  const xi: Player[] = [];
  if (gk[0]) xi.push(gk[0]);
  xi.push(...def.slice(0, 4), ...mid.slice(0, 3), ...fwd.slice(0, 3));
  // Top up to 11 with best leftovers if any line was short
  if (xi.length < 11) {
    const inXi = new Set(xi.map(p => p.id));
    for (const p of sorted) {
      if (xi.length >= 11) break;
      if (!inXi.has(p.id) && categoryOf(p) !== 'GK') {
        xi.push(p);
        inXi.add(p.id);
      }
    }
  }

  const xiIds = new Set(xi.map(p => p.id));
  const bench = sorted.filter(p => !xiIds.has(p.id)).slice(0, 7);
  const captain = xi.find(p => categoryOf(p) !== 'GK') || xi[0];

  return {
    formation: '4-3-3',
    mentality: 'balanced',
    passingStyle: 'short',
    pressingIntensity: 'balanced',
    tempo: 'balanced',
    startingPlayerIds: xi.map(p => p.id),
    benchPlayerIds: bench.map(p => p.id),
    captainId: captain?.id || xi[0]?.id || '',
    penaltyTakerId: fwd[0]?.id || captain?.id || xi[0]?.id || '',
    freeKickTakerId: mid[0]?.id || captain?.id || xi[0]?.id || '',
    cornerTakerId: mid[0]?.id || captain?.id || xi[0]?.id || '',
  };
}

/** Reputation for a squad of real players: average of the best XI, clamped. */
export function reputationFromSquad(players: Player[]): number {
  if (!players || players.length === 0) return 50;
  const top11 = [...players].sort(byRatingDesc).slice(0, 11);
  const avg = top11.reduce((s, p) => s + (p.overallRating || 60), 0) / top11.length;
  return Math.max(35, Math.min(95, Math.round(avg)));
}

function snapshotSquad(players: Player[]): Player[] {
  // Snapshot copies: national-team matches never write back to club players.
  return players.map(p => ({ ...p, stats: { ...p.stats } }));
}

function emptyTeam(
  countryCode: string,
  name: string,
  flag: string,
  continent: ContinentCode,
  footballLevel: number,
  isStatistical: boolean
): NationalTeam {
  return {
    id: nationalTeamIdForCountry(countryCode),
    countryCode,
    name,
    shortName: countryCode,
    flag,
    continent,
    isStatistical,
    footballLevel,
    reputation: statisticalReputationFromLevel(footballLevel),
    players: [],
    rankingPoints: Math.round(footballLevel * 10),
    worldRank: 0,
    trophies: [],
    stats: { ...EMPTY_STATS },
  };
}

/**
 * Builds the full national-team universe for a career:
 *   - every country in GLOBAL_COUNTRIES (17) — real squads when enough of its
 *     nationals play in the game world's clubs, statistical otherwise
 *   - every supplementary nation — always statistical
 * Ranking points are seeded from football level; worldRank is assigned after.
 */
export function buildNationalTeams(teams: Club[]): NationalTeam[] {
  const pool = collectNationalPool(teams);
  const result: NationalTeam[] = [];

  for (const country of Object.values(GLOBAL_COUNTRIES)) {
    const code = country.code.toUpperCase();
    const nationals = pool.get(code) || [];
    if (nationals.length >= MIN_REAL_PLAYERS_FOR_FULL_SQUAD) {
      const squad = snapshotSquad(selectCallUpSquad(nationals));
      result.push({
        ...emptyTeam(code, country.name, country.flag, normalizeContinent(country.continent), country.footballLevel, false),
        players: squad,
        tactics: buildNationalTeamTactics(squad),
        reputation: reputationFromSquad(squad),
      });
    } else {
      result.push(emptyTeam(code, country.name, country.flag, normalizeContinent(country.continent), country.footballLevel, true));
    }
  }

  for (const nation of Object.values(SUPPLEMENTARY_NATIONS)) {
    if (GLOBAL_COUNTRIES[nation.code]) continue;
    result.push(emptyTeam(nation.code, nation.name, nation.flag, nation.continent, nation.footballLevel, true));
  }

  // Seed world ranking by current strength
  const ranked = [...result].sort((a, b) => b.rankingPoints - a.rankingPoints);
  ranked.forEach((nt, idx) => {
    const target = result.find(t => t.id === nt.id);
    if (target) target.worldRank = idx + 1;
  });

  return result;
}

/**
 * Refreshes a national team's call-up list from the CURRENT club squads.
 * Call-ups only — club rosters are never modified. Statistical teams are
 * returned unchanged.
 */
export function refreshCallUpSquad(nationalTeam: NationalTeam, teams: Club[]): NationalTeam {
  if (!nationalTeam) return nationalTeam;
  const pool = collectNationalPool(teams);
  const nationals = pool.get(nationalTeam.countryCode) || [];
  if (nationals.length < MIN_REAL_PLAYERS_FOR_FULL_SQUAD) {
    if (nationalTeam.isStatistical) return nationalTeam;
    // The country can no longer field a full squad of real players: it keeps
    // its identity but becomes statistical.
    return {
      ...nationalTeam,
      isStatistical: true,
      players: [],
      tactics: undefined,
      reputation: statisticalReputationFromLevel(nationalTeam.footballLevel),
    };
  }
  const squad = snapshotSquad(selectCallUpSquad(nationals));
  const autoTactics = buildNationalTeamTactics(squad);
  return {
    ...nationalTeam,
    isStatistical: false,
    players: squad,
    tactics: { ...autoTactics, ...nationalTeam.tactics, startingPlayerIds: autoTactics?.startingPlayerIds || [], benchPlayerIds: autoTactics?.benchPlayerIds || [] },
    reputation: reputationFromSquad(squad),
  };
}

/**
 * Adapts a NationalTeam to the Club shape expected by the match engine
 * (simulateMatch / calculateTeamStrength). The adapter is a pure view:
 * statistical teams carry no players, so the engine's reputation fallback
 * produces their strength.
 */
export function nationalTeamToClub(nt: NationalTeam): Club {
  let tactics = nt.tactics;
  try {
    const ids = nt.userStartingIds;
    if (nt.isUserManaged && tactics && Array.isArray(ids) && ids.length === 11) {
      const have = new Set((nt.players || []).map(p => p.id));
      if (ids.every(id => have.has(id))) {
        const idSet = new Set(ids);
        const bench = (nt.players || []).filter(p => !idSet.has(p.id)).sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0)).slice(0, 7).map(p => p.id);
        tactics = { ...tactics, startingPlayerIds: [...ids], benchPlayerIds: bench };
      }
    }
  } catch (_) { /* fall back to the auto XI */ }
  return {
    id: nt.id,
    name: nt.name,
    shortName: nt.shortName,
    city: nt.name,
    country: nt.name,
    countryCode: nt.countryCode,
    continent: nt.continent,
    division: 1,
    reputation: nt.reputation,
    primaryColor: '#166534',
    secondaryColor: '#ffffff',
    budget: 0,
    transferBudget: 0, // National teams NEVER trade players
    wageBudgetMonthly: 0,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [],
    isUserClub: !!nt.isUserManaged,
    players: nt.players,
    tactics,
  } as unknown as Club;
}

/**
 * Hard guard used by every national-team code path: national teams are
 * call-up lists only. Any transfer/buy/sell attempt against an NT id must be
 * rejected by callers; this predicate makes the check one line everywhere.
 */
export function assertNotNationalTeamTransfer(teamId: string, operation: string): void {
  if (isNationalTeamId(teamId)) {
    throw new Error(`[NationalTeams] Transfers are forbidden for national teams (attempted ${operation} on ${teamId}).`);
  }
}

export function getNationalTeamById(teams: NationalTeam[], id?: string | null): NationalTeam | undefined {
  if (!id) return undefined;
  return (teams || []).find(t => t.id === id);
}
