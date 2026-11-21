// Post-league continental competition ("ما بعد الدوري").
//
// Self-contained on purpose: it never touches fixtures, standings or the calendar. It starts only AFTER the league
// season is over (table, promotion/relegation and the season summary are already final) and ends with the season
// transition (summary + job offers) once the user is knocked out or the tournament is finished.
//
// Format: 16 teams, knockout. Round of 16 / quarter-finals / semi-finals are two-legged, the final is a single match.

export type ContRoundKey = 'GS' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';

export interface ContTeam {
  id: string;
  name: string;
  rating: number;
  country?: string;
  isUser?: boolean;
  route?: string; // how the club qualified (used by the Club World Cup)
}

export interface ContLeg {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
}

export interface ContTie {
  id: string;
  round: ContRoundKey;
  a: string; // hosts leg 1
  b: string;
  legs: ContLeg[];
  pens?: { a: number; b: number };
  winnerId?: string;
}

export type ContStatus = 'active' | 'finished' | 'done';

export interface ContGroupMatch {
  id: string;
  matchday: 1 | 2 | 3;
  homeId: string;
  awayId: string;
  homeGoals?: number;
  awayGoals?: number;
  isPlayed: boolean;
}

export interface ContGroup {
  id: string;        // 'A' .. 'H'
  teamIds: string[]; // exactly 4
  matches: ContGroupMatch[]; // exactly 6: full round robin over 3 matchdays, every club exactly 3 games
}

export interface ContinentalPhaseState {
  version: 1;
  seasonNumber: number;
  compId: string;
  compName: string;
  isTopTier: boolean;
  userId: string;
  teams: ContTeam[];
  ties: ContTie[];
  round: ContRoundKey;
  status: ContStatus;
  championId?: string;
  userStage?: ContRoundKey; // round the user reached (last round he played in)
  userEliminated: boolean;
  userRoundsWon: number;
  log: string[];
  singleLeg?: boolean; // Club World Cup: every tie is a single match
  groups?: ContGroup[];  // Club World Cup group stage. Present only when the tournament starts with groups (round 'GS').
  continent?: string;  // continent of the competition (AFRICA / EUROPE / ASIA)
}

export const ROUND_LABEL: Record<ContRoundKey, string> = {
  GS: 'دور المجموعات',
  R32: 'دور الـ32',
  R16: 'دور الـ16',
  QF: 'ربع النهائي',
  SF: 'نصف النهائي',
  F: 'النهائي',
};

const ROUND_ORDER: ContRoundKey[] = ['R32', 'R16', 'QF', 'SF', 'F'];

export const CONTINENTAL_PHASE_ENABLED = true;

// ------------------------------------------------------------------------------------------------------------------
// Qualification
// ------------------------------------------------------------------------------------------------------------------

export interface ContinentalCompetitionInfo {
  compId: string;
  compName: string;
  isTopTier: boolean;
  continent: 'AFRICA' | 'EUROPE' | 'ASIA';
}

const COMPETITIONS: Record<'AFRICA' | 'EUROPE' | 'ASIA', { top: [string, string]; second: [string, string] }> = {
  AFRICA: { top: ['ccl', 'دوري أبطال أفريقيا'], second: ['ccc', 'كأس الكونفدرالية الأفريقية'] },
  EUROPE: { top: ['ucl', 'دوري أبطال أوروبا'], second: ['uel', 'الدوري الأوروبي'] },
  ASIA: { top: ['acl', 'دوري أبطال آسيا للنخبة'], second: ['acl2', 'دوري أبطال آسيا 2'] },
};

/**
 * Decides whether (and where) the user's club plays continentally, from the FINAL league table.
 * Only top-flight clubs qualify: 1st-2nd -> champions competition, 3rd -> second competition.
 */
export function getContinentalQualification(params: {
  divisionTier: number;
  finalPosition: number;
  totalTeams: number;
  continent: string;
}): ContinentalCompetitionInfo | null {
  const { divisionTier, finalPosition, totalTeams, continent } = params;
  if (divisionTier !== 1) return null;
  if (totalTeams < 10) return null;
  if (continent !== 'AFRICA' && continent !== 'EUROPE' && continent !== 'ASIA') return null;
  const c = COMPETITIONS[continent];
  if (finalPosition >= 1 && finalPosition <= 2) {
    return { compId: c.top[0], compName: c.top[1], isTopTier: true, continent };
  }
  if (finalPosition === 3) {
    return { compId: c.second[0], compName: c.second[1], isTopTier: false, continent };
  }
  return null;
}

// ------------------------------------------------------------------------------------------------------------------
// Ratings & match simulation
// ------------------------------------------------------------------------------------------------------------------

export function clubRating(club: any): number {
  const ovr: number[] = (club?.players || [])
    .map((p: any) => Number(p?.overallRating))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .sort((a: number, b: number) => b - a)
    .slice(0, 16);
  if (ovr.length < 8) return 60;
  return ovr.reduce((s, n) => s + n, 0) / ovr.length;
}

function poisson(lambda: number, rnd: () => number): number {
  const L = Math.exp(-Math.max(0.05, Math.min(lambda, 6)));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L && k < 12);
  return k - 1;
}

export function simulateMatchGoals(
  homeRating: number,
  awayRating: number,
  rnd: () => number,
  neutral = false
): { home: number; away: number } {
  const diff = homeRating - awayRating;
  const homeEdge = neutral ? 0 : 0.18;
  const lh = 1.35 * Math.exp(diff / 18 + homeEdge);
  const la = 1.15 * Math.exp(-diff / 18 - homeEdge * 0.5);
  return { home: poisson(lh, rnd), away: poisson(la, rnd) };
}

function penaltyShootout(ra: number, rb: number, rnd: () => number): { a: number; b: number } {
  const pa = Math.min(0.85, Math.max(0.65, 0.75 + (ra - rb) / 400));
  const pb = Math.min(0.85, Math.max(0.65, 0.75 - (ra - rb) / 400));
  let a = 0;
  let b = 0;
  for (let i = 0; i < 5; i++) {
    if (rnd() < pa) a++;
    if (rnd() < pb) b++;
  }
  let guard = 0;
  while (a === b && guard++ < 30) {
    const sa = rnd() < pa ? 1 : 0;
    const sb = rnd() < pb ? 1 : 0;
    a += sa;
    b += sb;
  }
  if (a === b) a += 1; // practically unreachable; keeps the shoot-out always decisive
  return { a, b };
}

// ------------------------------------------------------------------------------------------------------------------
// Creation
// ------------------------------------------------------------------------------------------------------------------

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairTies(teamIds: string[], round: ContRoundKey, rnd: () => number): ContTie[] {
  const ids = shuffle(teamIds, rnd);
  const ties: ContTie[] = [];
  for (let i = 0; i + 1 < ids.length; i += 2) {
    ties.push({ id: `${round}_${i / 2}`, round, a: ids[i], b: ids[i + 1], legs: [] });
  }
  return ties;
}

const CWC_GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/**
 * Draws 32 teams into 8 seeded groups of 4 (one club from each rating pot per group, so no group
 * stacks the strongest clubs) and builds the full round-robin schedule: 3 matchdays, 2 matches per
 * group per matchday, every club EXACTLY 3 matches. Home/away alternates (1-2 home games per club).
 */
export function buildCwcGroups(teams: ContTeam[], rnd: () => number): ContGroup[] {
  const sorted = [...teams].sort((x, y) => y.rating - x.rating || x.id.localeCompare(y.id));
  const pots: ContTeam[][] = [0, 1, 2, 3].map(k => shuffle(sorted.slice(k * 8, k * 8 + 8), rnd));
  const ROUNDS: { matchday: 1 | 2 | 3; pairs: [number, number][] }[] = [
    { matchday: 1, pairs: [[0, 1], [2, 3]] },
    { matchday: 2, pairs: [[2, 0], [1, 3]] },
    { matchday: 3, pairs: [[3, 0], [1, 2]] },
  ];
  return CWC_GROUP_IDS.map((id, gi) => {
    const teamIds = pots.map(pot => pot[gi].id);
    const matches: ContGroupMatch[] = [];
    for (const r of ROUNDS) {
      for (const [h, a] of r.pairs) {
        matches.push({
          id: `gs_${id}_md${r.matchday}_${h}${a}`,
          matchday: r.matchday,
          homeId: teamIds[h],
          awayId: teamIds[a],
          isPlayed: false,
        });
      }
    }
    return { id, teamIds, matches };
  });
}

export interface ContGroupRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

/**
 * Group table computed from PLAYED matches only. Points 3/1/0.
 * Tiebreakers in order: points, goal difference, goals for, squad rating (deterministic, no coin flips).
 */
export function groupStandingsRows(state: ContinentalPhaseState, group: ContGroup): ContGroupRow[] {
  const rows = new Map<string, ContGroupRow>();
  group.teamIds.forEach(id =>
    rows.set(id, { teamId: id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 })
  );
  for (const m of group.matches) {
    if (!m.isPlayed || m.homeGoals === undefined || m.awayGoals === undefined) continue;
    const h = rows.get(m.homeId);
    const a = rows.get(m.awayId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.gf += m.homeGoals; h.ga += m.awayGoals;
    a.gf += m.awayGoals; a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.won++; h.pts += 3; a.lost++; }
    else if (m.homeGoals < m.awayGoals) { a.won++; a.pts += 3; h.lost++; }
    else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  }
  rows.forEach(r => { r.gd = r.gf - r.ga; });
  return [...rows.values()].sort((x, y) =>
    y.pts - x.pts ||
    y.gd - x.gd ||
    y.gf - x.gf ||
    teamOf(state, y.teamId).rating - teamOf(state, x.teamId).rating ||
    x.teamId.localeCompare(y.teamId)
  );
}

/**
 * Builds a 16-team field: the user's club + 15 clubs from the same continent (never the user's own club).
 * Champions competitions draw from the strongest clubs, second competitions from the next tier of clubs.
 */
export function createContinentalPhase(params: {
  seasonNumber: number;
  info: ContinentalCompetitionInfo;
  userClub: any;
  pool: any[];
  rnd?: () => number;
}): ContinentalPhaseState | null {
  const rnd = params.rnd || Math.random;
  const { info, userClub, pool, seasonNumber } = params;
  if (!userClub?.id) return null;

  const seenIds = new Set<string>();
  const candidates = (pool || [])
    .filter(c => {
      if (!c || !c.id || c.id === userClub.id || seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    })
    .map(c => ({ c, r: clubRating(c) }))
    .sort((x, y) => y.r - x.r);
  // 32-team knockout when the continent has enough clubs, otherwise a 16-team one
  const size = candidates.length >= 40 ? 32 : 16;
  const need = size - 1;
  if (candidates.length < need) return null;

  // Champions competitions: top of the pool (with some variety). Second competitions: next slice.
  const slice = info.isTopTier
    ? candidates.slice(0, Math.min(candidates.length, need + 14))
    : candidates.slice(Math.min(8, candidates.length - need), Math.min(candidates.length, need + 26));
  const field = shuffle(slice, rnd).slice(0, need);
  if (field.length < need) return null;
  const startRound: ContRoundKey = size === 32 ? 'R32' : 'R16';

  const userRating = clubRating(userClub);
  const teams: ContTeam[] = [
    { id: userClub.id, name: userClub.name || 'فريقك', rating: userRating, country: userClub.country, isUser: true },
    ...field.map(f => ({ id: f.c.id, name: f.c.name, rating: f.r, country: f.c.country })),
  ];

  const state: ContinentalPhaseState = {
    version: 1,
    seasonNumber,
    compId: info.compId,
    compName: info.compName,
    isTopTier: info.isTopTier,
    continent: info.continent,
    userId: userClub.id,
    teams,
    ties: pairTies(teams.map(t => t.id), startRound, rnd),
    round: startRound,
    status: 'active',
    userEliminated: false,
    userRoundsWon: 0,
    userStage: startRound,
    log: [`تأهل ${userClub.name} إلى ${info.compName} 🌍`],
  };
  return state;
}

/**
 * Club World Cup qualification slots (fixed, transparent, 32 in total). The user's club takes one slot of the
 * champions competition he won / reached the final of.
 */
export const WORLD_CUP_SLOTS: { continent: string; compId: string; name: string; slots: number; topTier: boolean }[] = [
  { continent: 'AFRICA', compId: 'ccl', name: 'دوري أبطال أفريقيا', slots: 4, topTier: true },
  { continent: 'AFRICA', compId: 'ccc', name: 'الكونفدرالية الأفريقية', slots: 4, topTier: false },
  { continent: 'EUROPE', compId: 'ucl', name: 'دوري أبطال أوروبا', slots: 6, topTier: true },
  { continent: 'EUROPE', compId: 'uel', name: 'الدوري الأوروبي', slots: 4, topTier: false },
  { continent: 'ASIA', compId: 'acl', name: 'دوري أبطال آسيا', slots: 4, topTier: true },
  { continent: 'ASIA', compId: 'acl2', name: 'دوري أبطال آسيا 2', slots: 2, topTier: false },
  { continent: 'SOUTH_AMERICA', compId: 'lib', name: 'كوبا ليبرتادوريس', slots: 4, topTier: true },
  { continent: 'SOUTH_AMERICA', compId: 'sud', name: 'كوبا سودأمريكانا', slots: 4, topTier: false },
];
// 4+4+6+4+4+2+4+4 = 32

/**
 * Club World Cup: 32 TOP-FLIGHT clubs, single-match knockout, filled by the fixed slots above.
 * `poolsByContinent` must contain top-flight clubs only. Opponents of each competition are drawn from the strongest
 * clubs of that continent (champions competitions from the very top, second competitions from the next group).
 */
export function createWorldCupPhase(params: {
  seasonNumber: number;
  userClub: any;
  userCompId: string;        // champions competition the user qualified through
  userContinent: string;
  poolsByContinent: Record<string, any[]>;
  rnd?: () => number;
}): ContinentalPhaseState | null {
  const rnd = params.rnd || Math.random;
  const { userClub, poolsByContinent, seasonNumber, userCompId, userContinent } = params;
  if (!userClub?.id) return null;

  const used = new Set<string>([userClub.id]);
  const teams: ContTeam[] = [
    { id: userClub.id, name: userClub.name || 'فريقك', rating: clubRating(userClub), country: userClub.country, isUser: true,
      route: WORLD_CUP_SLOTS.find(x => x.compId === userCompId)?.name || 'بطل قاري' },
  ];

  for (const continent of Array.from(new Set(WORLD_CUP_SLOTS.map(x => x.continent)))) {
    const ranked = (poolsByContinent[continent] || [])
      .filter(c => c && c.id && (c.players || []).length >= 11 && !(typeof c.division === 'number' && c.division > 1))
      .map(c => ({ c, r: clubRating(c) }))
      .sort((x, y) => y.r - x.r);
    let cursor = 0;
    for (const slot of WORLD_CUP_SLOTS.filter(x => x.continent === continent)) {
      const quota = slot.slots - (slot.compId === userCompId && continent === userContinent ? 1 : 0);
      // window: the next ~2.5x quota strongest not-yet-used clubs, then pick randomly inside it
      const window: { c: any; r: number }[] = [];
      let i = cursor;
      while (i < ranked.length && window.length < Math.ceil(quota * 2.5)) {
        if (!used.has(ranked[i].c.id)) window.push(ranked[i]);
        i++;
      }
      const picked = shuffle(window, rnd).slice(0, quota);
      picked.forEach(p => {
        used.add(p.c.id);
        teams.push({ id: p.c.id, name: p.c.name, rating: p.r, country: p.c.country, route: slot.name });
      });
      cursor = i;
    }
  }
  if (teams.length !== 32) return null;

  return {
    version: 1,
    seasonNumber,
    compId: 'cwc',
    compName: 'كأس العالم للأندية',
    isTopTier: true,
    userId: userClub.id,
    teams,
    ties: [],
    groups: buildCwcGroups(teams, rnd),
    round: 'GS',
    status: 'active',
    userEliminated: false,
    userRoundsWon: 0,
    userStage: 'GS',
    singleLeg: true,
    log: [`تأهل ${userClub.name} إلى كأس العالم للأندية 🌍🏆`],
  };
}

/** True when the user's finished continental run earns a Club World Cup place. */
export function qualifiesForWorldCup(state: ContinentalPhaseState): boolean {
  if (state.compId === 'cwc' || !state.isTopTier || state.status !== 'finished') return false;
  const o = getContinentalOutcome(state);
  return o.isChampion || o.isRunnerUp;
}

// ------------------------------------------------------------------------------------------------------------------
// Progression
// ------------------------------------------------------------------------------------------------------------------

function teamOf(state: ContinentalPhaseState, id: string): ContTeam {
  return state.teams.find(t => t.id === id) || { id, name: id, rating: 60 };
}

function legsFor(state: ContinentalPhaseState): number {
  if (state.singleLeg) return 1;
  return state.round === 'F' ? 1 : 2;
}

function aggregate(tie: ContTie): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const l of tie.legs) {
    if (l.homeId === tie.a) {
      a += l.homeGoals;
      b += l.awayGoals;
    } else {
      b += l.homeGoals;
      a += l.awayGoals;
    }
  }
  return { a, b };
}

/** One step: plays the next leg of every undecided tie in the current round and moves on when the round is done. */
function stepOnce(input: ContinentalPhaseState, rnd: () => number, userLegResult?: { homeGoals: number; awayGoals: number }): ContinentalPhaseState {
  if (input.status !== 'active') return input;
  const state: ContinentalPhaseState = JSON.parse(JSON.stringify(input));
  const need = legsFor(state);

  // GROUP STAGE (Club World Cup): one matchday per step, all 8 groups in lockstep.
  // The user's own group match uses his real played score when provided.
  if (state.round === 'GS' && state.groups && state.groups.length > 0) {
    const unplayed = state.groups.flatMap(g => g.matches).filter(m => !m.isPlayed);
    if (unplayed.length > 0) {
      const md = Math.min(...unplayed.map(m => m.matchday));
      for (const g of state.groups) {
        for (const m of g.matches) {
          if (m.matchday !== md || m.isPlayed) continue;
          const isUserMatch = m.homeId === state.userId || m.awayId === state.userId;
          const goals = isUserMatch && userLegResult
            ? { home: userLegResult.homeGoals, away: userLegResult.awayGoals }
            : simulateMatchGoals(teamOf(state, m.homeId).rating, teamOf(state, m.awayId).rating, rnd, false);
          m.homeGoals = goals.home;
          m.awayGoals = goals.away;
          m.isPlayed = true;
        }
      }
      state.log.push(`انتهت الجولة ${md} من دور المجموعات`);
    }
    const stillUnplayed = state.groups.some(g => g.matches.some(m => !m.isPlayed));
    if (!stillUnplayed) {
      // Group stage complete: top 2 of every group advance (16 clubs).
      // Group winners are seeded against runners-up of OTHER groups (no same-group rematch in R16).
      const winners: string[] = [];
      const runners: string[] = [];
      for (const g of state.groups) {
        const rows = groupStandingsRows(state, g);
        winners.push(rows[0].teamId);
        runners.push(rows[1].teamId);
      }
      const order = shuffle([0, 1, 2, 3, 4, 5, 6, 7], rnd);
      for (let i = 0; i < 8; i++) {
        if (order[i] === i) {
          const j = (i + 1) % 8;
          const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        }
      }
      const newTies: ContTie[] = [];
      for (let i = 0; i < 8; i++) {
        newTies.push({ id: `R16_${i}`, round: 'R16', a: winners[i], b: runners[order[i]], legs: [] });
      }
      state.ties = state.ties.concat(newTies);
      state.round = 'R16';
      const userGroup = state.groups.find(g => g.teamIds.includes(state.userId));
      const userQualified = newTies.some(t => t.a === state.userId || t.b === state.userId);
      if (userQualified) {
        state.userRoundsWon += 1;
        state.userStage = 'R16';
        state.log.push(`✅ تأهل ${teamOf(state, state.userId).name} من المجموعة ${userGroup ? userGroup.id : ''} إلى دور الـ16`);
      } else {
        state.userEliminated = true;
        state.log.push(`❌ خرج ${teamOf(state, state.userId).name} من دور المجموعات`);
      }
    }
    return state;
  }

  state.ties = state.ties.map(tie => {
    if (tie.round !== state.round || tie.winnerId) return tie;
    const legNo = tie.legs.length; // 0-based
    if (legNo >= need) return tie;
    const t = { ...tie, legs: tie.legs.slice() };
    const isFinal = state.round === 'F';
    const homeId = legNo === 0 ? t.a : t.b;
    const awayId = homeId === t.a ? t.b : t.a;
    const isUserTie = t.a === state.userId || t.b === state.userId;
    const g = (isUserTie && userLegResult)
      ? { home: userLegResult.homeGoals, away: userLegResult.awayGoals }
      : simulateMatchGoals(teamOf(state, homeId).rating, teamOf(state, awayId).rating, rnd, isFinal || !!state.singleLeg);
    t.legs.push({ homeId, awayId, homeGoals: g.home, awayGoals: g.away });

    if (t.legs.length >= need) {
      const agg = aggregate(t);
      if (agg.a !== agg.b) {
        t.winnerId = agg.a > agg.b ? t.a : t.b;
      } else {
        const p = penaltyShootout(teamOf(state, t.a).rating, teamOf(state, t.b).rating, rnd);
        t.pens = p;
        t.winnerId = p.a > p.b ? t.a : t.b;
      }
    }
    return t;
  });

  const current = state.ties.filter(t => t.round === state.round);
  const allDecided = current.length > 0 && current.every(t => !!t.winnerId);

  if (allDecided) {
    const userTie = current.find(t => t.a === state.userId || t.b === state.userId);
    if (userTie && !state.userEliminated) {
      if (userTie.winnerId === state.userId) {
        state.userRoundsWon += 1;
        state.log.push(`✅ تأهل ${teamOf(state, state.userId).name} من ${ROUND_LABEL[state.round]}`);
      } else {
        state.userEliminated = true;
        state.log.push(`❌ خرج ${teamOf(state, state.userId).name} من ${ROUND_LABEL[state.round]}`);
      }
    }
    if (state.round === 'F') {
      state.championId = current[0].winnerId;
      state.status = 'finished';
    } else {
      const next = ROUND_ORDER[ROUND_ORDER.indexOf(state.round) + 1];
      const winners = current.map(t => t.winnerId as string);
      state.ties = state.ties.concat(pairTies(winners, next, rnd));
      state.round = next;
      if (!state.userEliminated) state.userStage = next;
    }
  }

  return state;
}

/** The user's next unplayed leg (who hosts it), or null when the user is out / the round is not waiting on him. */
export function getUserPendingLeg(state: ContinentalPhaseState): { tieId: string; homeId: string; awayId: string; legNo: number; isFinal: boolean; single: boolean } | null {
  if (state.status !== 'active' || state.userEliminated) return null;
  if (state.round === 'GS' && state.groups && state.groups.length > 0) {
    const ug = state.groups.find(g => g.teamIds.includes(state.userId));
    if (!ug) return null;
    const unplayedAll = state.groups.flatMap(g => g.matches).filter(m => !m.isPlayed);
    if (unplayedAll.length === 0) return null;
    const md = Math.min(...unplayedAll.map(m => m.matchday));
    const m = ug.matches.find(x => x.matchday === md && !x.isPlayed);
    if (!m) return null;
    return { tieId: m.id, homeId: m.homeId, awayId: m.awayId, legNo: 0, isFinal: false, single: true };
  }
  const tie = state.ties.find(t => t.round === state.round && !t.winnerId && (t.a === state.userId || t.b === state.userId));
  if (!tie) return null;
  const legNo = tie.legs.length;
  if (legNo >= legsFor(state)) return null;
  const homeId = legNo === 0 ? tie.a : tie.b;
  return { tieId: tie.id, homeId, awayId: homeId === tie.a ? tie.b : tie.a, legNo, isFinal: state.round === 'F', single: !!state.singleLeg || state.round === 'F' };
}

/** Same as playNextLeg but the user's match uses the score of the match he actually watched. */
export function playNextLegWithUserScore(input: ContinentalPhaseState, result: { homeGoals: number; awayGoals: number }, rnd: () => number = Math.random): ContinentalPhaseState {
  const s = stepOnce(input, rnd, result);
  if (s.userEliminated && s.status === 'active') return simulateRemaining(s, rnd);
  return s;
}

/** Plays the next leg for everyone. If that knocks the user out, the rest of the tournament is simulated at once. */
export function playNextLeg(input: ContinentalPhaseState, rnd: () => number = Math.random): ContinentalPhaseState {
  const s = stepOnce(input, rnd);
  if (s.userEliminated && s.status === 'active') return simulateRemaining(s, rnd);
  return s;
}

/** Plays everything that is left (user out, or the user chose "simulate the rest"). Always ends in 'finished'. */
export function simulateRemaining(input: ContinentalPhaseState, rnd: () => number = Math.random): ContinentalPhaseState {
  let state = input;
  let guard = 0;
  while (state.status === 'active' && guard++ < 24) {
    state = stepOnce(state, rnd);
  }
  if (state.status === 'active') {
    // Unreachable in practice; guarantees the season can always continue.
    const forced: ContinentalPhaseState = JSON.parse(JSON.stringify(state));
    forced.status = 'finished';
    forced.championId = forced.championId || forced.ties.find(t => t.winnerId)?.winnerId || forced.teams[0].id;
    return forced;
  }
  return state;
}

// ------------------------------------------------------------------------------------------------------------------
// Results & rewards
// ------------------------------------------------------------------------------------------------------------------

export interface ContinentalOutcome {
  stageReached: ContRoundKey;
  isChampion: boolean;
  isRunnerUp: boolean;
  resultText: string;
  trophyName?: string;
  prizeMonthsOfWages: number;
  xp: number;
  reputation: number;
}

/** How much each competition matters (rewards, XP and reputation scale with it). */
export const COMP_PRESTIGE: Record<string, number> = {
  cwc: 2.2, ucl: 1.5, ccl: 1.1, acl: 1.1, lib: 1.2, uel: 0.8, ccc: 0.6, acl2: 0.55, sud: 0.7,
};
export const prestigeOf = (compId: string): number => COMP_PRESTIGE[compId] ?? 0.6;

/**
 * Prize ladder by the STAGE the user reaches, in "months of the club's wages" (before prestige).
 * Entering the tournament pays `participation`; every later round the user reaches adds its own amount.
 */
export const REWARD_SCHEDULE = {
  participation: 0.25,
  stage: { GS: 0, R32: 0.25, R16: 0.45, QF: 0.8, SF: 1.3, F: 2.0 } as Record<ContRoundKey, number>,
  champion: 2.0,
};

const STAGE_NAME: Record<ContRoundKey, string> = {
  GS: 'دور المجموعات',
  R32: 'دور الـ32', R16: 'دور الـ16', QF: 'ربع النهائي', SF: 'نصف النهائي', F: 'النهائي',
};

export interface PayoutLine { label: string; months: number }

/** Rounds the user actually played in, in order. */
function roundsReached(state: ContinentalPhaseState): ContRoundKey[] {
  return ROUND_ORDER.filter(r => state.ties.some(t => t.round === r && (t.a === state.userId || t.b === state.userId)));
}

export function getPayoutLines(state: ContinentalPhaseState): PayoutLine[] {
  const pr = prestigeOf(state.compId);
  const champion = state.championId === state.userId;
  const reached = roundsReached(state);
  const lines: PayoutLine[] = [{ label: 'مكافأة المشاركة', months: REWARD_SCHEDULE.participation * pr }];
  // With a group stage, participation already covers the groups: reaching R16 is itself a rewarded step up.
  reached.slice(state.groups && state.groups.length ? 0 : 1).forEach(r => lines.push({ label: `بلوغ ${STAGE_NAME[r]}`, months: REWARD_SCHEDULE.stage[r] * pr }));
  if (champion) lines.push({ label: '🏆 مكافأة التتويج بالبطولة', months: REWARD_SCHEDULE.champion * pr });
  return lines;
}

export interface ContinentalPayout {
  lines: { label: string; amount: number }[];
  clubPrize: number;      // paid into the club budget
  managerBonus: number;   // personal bonus for the coach
}

/** Cash payout from the club's monthly wage bill. Never below a small floor so tiny clubs still get something. */
export function getContinentalPayout(state: ContinentalPhaseState, wageBillRaw: number): ContinentalPayout {
  const wageBill = Number.isFinite(wageBillRaw) ? Math.max(0, wageBillRaw) : 0;
  const pr = prestigeOf(state.compId);
  const floor = 100000 * pr;
  const round1k = (n: number) => Math.round(n / 1000) * 1000;
  const lines = getPayoutLines(state).map((l, i) => ({
    label: l.label,
    amount: round1k(Math.max(i === 0 ? floor : 0, Math.max(0, wageBill) * l.months)),
  }));
  const clubPrize = lines.reduce((s, l) => s + l.amount, 0);
  const champion = state.championId === state.userId;
  const finalTie = state.ties.find(t => t.round === 'F');
  const runnerUp = !champion && !!finalTie && (finalTie.a === state.userId || finalTie.b === state.userId);
  const share = champion ? 0.15 : runnerUp ? 0.1 : 0.05;
  return { lines, clubPrize, managerBonus: round1k(clubPrize * share) };
}

export function getContinentalOutcome(state: ContinentalPhaseState): ContinentalOutcome {
  const isChampion = state.championId === state.userId;
  const finalTie = state.ties.find(t => t.round === 'F');
  const reachedFinal = !!finalTie && (finalTie.a === state.userId || finalTie.b === state.userId);
  const isRunnerUp = reachedFinal && !isChampion;
  const lastRound: ContRoundKey = reachedFinal
    ? 'F'
    : (ROUND_ORDER.slice().reverse().find(r => state.ties.some(t => t.round === r && (t.a === state.userId || t.b === state.userId))) || (state.groups && state.groups.length ? 'GS' : 'R16'));

  const pr = prestigeOf(state.compId);
  const months = getPayoutLines(state).reduce((s, l) => s + l.months, 0);
  const xp = Math.round((60 + state.userRoundsWon * 40 + (isRunnerUp ? 80 : 0) + (isChampion ? 250 : 0)) * pr);
  const reputation = Math.round((state.userRoundsWon * 0.4 + (isRunnerUp ? 1.5 : 0) + (isChampion ? 3 : 0)) * pr);

  let resultText: string;
  if (isChampion) resultText = `🏆 بطل ${state.compName}!`;
  else if (isRunnerUp) resultText = `🥈 وصيف ${state.compName} (خسر النهائي)`;
  else resultText = `خرج من ${ROUND_LABEL[lastRound]} في ${state.compName}`;

  return {
    stageReached: lastRound,
    isChampion,
    isRunnerUp,
    resultText,
    trophyName: isChampion ? state.compName : undefined,
    prizeMonthsOfWages: months,
    xp,
    reputation,
  };
}

export function tieScoreText(state: ContinentalPhaseState, tie: ContTie): string {
  if (!tie.legs.length) return 'لم تُلعب';
  // One orientation for everything: the user's side first (or tie.a for other ties), so legs and aggregate agree.
  const first = (tie.a === state.userId || tie.b === state.userId) ? state.userId : tie.a;
  const mine = (l: ContTie['legs'][number]) => (l.homeId === first ? [l.homeGoals, l.awayGoals] : [l.awayGoals, l.homeGoals]);
  const legs = tie.legs.map(l => { const [x, y] = mine(l); return `${x}-${y}`; }).join(' | ');
  const agg = aggregate(tie);
  const [ag, bg] = first === tie.a ? [agg.a, agg.b] : [agg.b, agg.a];
  const pens = tie.pens ? ` (ركلات ${first === tie.a ? tie.pens.a : tie.pens.b}-${first === tie.a ? tie.pens.b : tie.pens.a})` : '';
  return tie.legs.length > 1 ? `${legs} ⟵ مجموع ${ag}-${bg}${pens}` : `${legs}${pens}`;
}

/** Plain-language verdict for the user's finished tie, e.g. "خسرت الذهاب 1-3 وفزت في الإياب 2-1 لكن المجموع 3-4 ضدك". */
export function userTieVerdict(state: ContinentalPhaseState, tie: ContTie): string {
  if (!tie.winnerId || tie.legs.length < 2) return '';
  const first = state.userId;
  const res = tie.legs.map(l => (l.homeId === first ? [l.homeGoals, l.awayGoals] : [l.awayGoals, l.homeGoals]));
  const word = (x: number, y: number) => (x > y ? 'فزت' : x < y ? 'خسرت' : 'تعادلت');
  const [a, b] = [res[0], res[1]];
  const agg = aggregate(tie);
  const [ug, og] = first === tie.a ? [agg.a, agg.b] : [agg.b, agg.a];
  const won = tie.winnerId === state.userId;
  return `${word(a[0], a[1])} الذهاب ${a[0]}-${a[1]} و${word(b[0], b[1])} الإياب ${b[0]}-${b[1]} — المجموع ${ug}-${og}${ug === og ? ' (حسمتها ركلات الترجيح)' : won ? ' لصالحك' : ' ضدك'}`;
}

export function loadContinentalPhase(raw: string | null): ContinentalPhaseState | null {
  try {
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Array.isArray(s.teams) || !Array.isArray(s.ties)) return null;
    return s as ContinentalPhaseState;
  } catch {
    return null;
  }
}
