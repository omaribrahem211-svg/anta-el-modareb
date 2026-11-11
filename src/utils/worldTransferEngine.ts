import type { Club, Player, PositionCategory } from '../types/game';
import { GLOBAL_LEAGUES, EGYPT_TIER_4_LEAGUE } from '../data/leaguesData';
import { pickLineup } from '../data/realClubsData';
import { generatePlayer, calculatePlayerValuation, withSeededRandom } from './playerGenerator';

/**
 * World transfer engine.
 *
 * Every club in the game world (all leagues, not only the one the user plays in) trades players
 * during two windows. A completed move is stored as a tiny record per player (WorldMoves) which
 * is persisted with the save and re-applied to the static club database on load, so a player who
 * joined a rival really stays there and is no longer shown at his old club.
 */

export interface WorldMove {
  fromClubId: string;
  toClubId: string;
  fee: number;
  salary: number;
  contractYears: number;
  seasonNumber: number;
  dateStr: string;
  playerName: string;
}
export type WorldMoves = Record<string, WorldMove>;

export interface WorldTransferDeal extends WorldMove {
  playerId: string;
  position: Player['position'];
  rating: number;
  fromClubName: string;
  toClubName: string;
  buyerReputation: number;
  sellerReputation: number;
}

export type TransferWindow = 'summer' | 'winter';

/** Summer: 15 Jun – 31 Aug. Winter: 1 – 31 Jan. */
export function getTransferWindow(month: number, day: number): { window: TransferWindow; daysLeft: number } | null {
  if (month === 8) return { window: 'summer', daysLeft: 31 - day };
  if (month === 7) return { window: 'summer', daysLeft: 31 - day + 31 };
  if (month === 6 && day >= 15) return { window: 'summer', daysLeft: 30 - day + 62 };
  if (month === 1) return { window: 'winter', daysLeft: 31 - day };
  return null;
}

/* ----------------------------- static world index ----------------------------- */

let staticClubs: Map<string, Club> | null = null;
let staticHolder: Map<string, string> | null = null; // playerId -> clubId
const originalSquads = new Map<string, { players: Player[]; tactics: Club['tactics'] }>();

function ensureIndex() {
  if (staticClubs && staticHolder) return;
  staticClubs = new Map();
  staticHolder = new Map();
  const leagues = [...Object.values(GLOBAL_LEAGUES || {}), EGYPT_TIER_4_LEAGUE];
  leagues.forEach(l => (l?.teams || []).forEach(c => {
    if (!c?.id || staticClubs!.has(c.id)) return;
    staticClubs!.set(c.id, c);
    originalSquads.set(c.id, { players: [...(c.players || [])], tactics: c.tactics });
    (c.players || []).forEach(p => { if (p?.id) staticHolder!.set(p.id, c.id); });
  }));
}

function refreshLineup(club: Club) {
  if (!club.players || club.players.length === 0) return;
  const { startingPlayerIds, benchPlayerIds } = pickLineup(club.players);
  club.tactics = {
    ...(club.tactics || ({} as any)),
    startingPlayerIds,
    benchPlayerIds,
    captainId: club.tactics?.captainId && club.players.some(p => p.id === club.tactics!.captainId) ? club.tactics.captainId : startingPlayerIds[0] || '',
  } as Club['tactics'];
}

function freeNumber(players: Player[], wanted?: number): number {
  const used = new Set(players.map(p => p.number));
  if (wanted && !used.has(wanted)) return wanted;
  let n = 2;
  while (used.has(n)) n++;
  return n;
}

export const FREE_AGENT = 'FREE';

function moveStatic(playerId: string, toClubId: string, mv: Pick<WorldMove, 'salary' | 'contractYears'>): boolean {
  ensureIndex();
  const fromId = staticHolder!.get(playerId);
  if (toClubId === FREE_AGENT) {
    const fromClub = fromId ? staticClubs!.get(fromId) : undefined;
    if (!fromClub) return false;
    fromClub.players = fromClub.players.filter(p => p?.id !== playerId);
    refreshLineup(fromClub);
    staticHolder!.delete(playerId);
    return true;
  }
  const to = staticClubs!.get(toClubId);
  if (!to || !fromId || fromId === toClubId) return false;
  const from = staticClubs!.get(fromId);
  const player = from?.players.find(p => p?.id === playerId);
  if (!from || !player) return false;
  from.players = from.players.filter(p => p?.id !== playerId);
  refreshLineup(from);
  const moved: Player = {
    ...player,
    currentClubId: toClubId,
    currentLeagueId: to.leagueId || player.currentLeagueId,
    salary: mv.salary,
    contractYears: mv.contractYears,
    isListedForTransfer: false,
    number: freeNumber(to.players, player.number),
  };
  to.players = [...to.players, moved];
  refreshLineup(to);
  staticHolder!.set(playerId, toClubId);
  return true;
}

/** Restore the static database to its pristine state (new game / loading another save). */
export function resetWorldTransfers(): void {
  if (!staticClubs || !staticHolder) return;
  staticHolder.clear();
  staticClubs.forEach((club, id) => {
    const orig = originalSquads.get(id);
    if (orig) {
      club.players = [...orig.players];
      club.tactics = orig.tactics;
    }
    (club.players || []).forEach(p => { if (p?.id) staticHolder!.set(p.id, id); });
  });
}

/** Re-apply every saved move to the static database (idempotent). Call once after loading a save. */
export function applyWorldMoves(moves: WorldMoves | undefined | null): number {
  if (!moves) return 0;
  ensureIndex();
  let applied = 0;
  Object.entries(moves).forEach(([pid, mv]) => {
    if (mv && moveStatic(pid, mv.toClubId, mv)) applied++;
  });
  return applied;
}

/* ----------------------------- simulation ----------------------------- */

const MIN_BY_CAT: Record<PositionCategory, number> = { GK: 2, DEF: 6, MID: 6, FWD: 4 };
const STARTERS_BY_CAT: Record<PositionCategory, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 };

/** Transfer funds a club can spend per season, in the same unit as player market values. */
export function clubSeasonAllowance(club: Club): number {
  const rep = club.reputation || 40;
  let allowance = 2_000_000 * Math.pow(1.065, rep - 30);
  if ((club.leagueId || '').startsWith('sau_tier_1')) allowance *= 1.8; // Saudi / Gulf spending power
  if ((club.leagueId || '').startsWith('egy_') || (club.countryCode === 'EGY')) allowance *= 0.5;
  // South American and Maghreb clubs are net sellers to Europe / the Gulf
  if (/^(bra_|arg_|mar_|tun_|alg_)/.test(club.leagueId || '')) allowance *= 0.3;
  return Math.round(allowance);
}

const isRichLeague = (club: Club) => /^(sau_tier_1|qat_tier_1|uae_tier_1)/.test(club.leagueId || '');

const fmtMoney = (fee: number, club?: Club): string => {
  const eg = club?.countryCode === 'EGY';
  const unit = eg ? 'ج.م' : '€';
  if (fee >= 1_000_000) return `${(fee / 1_000_000).toFixed(fee >= 10_000_000 ? 0 : 1)} مليون ${unit}`;
  return `${Math.max(1, Math.round(fee / 1000))} ألف ${unit}`;
};

export interface SimulateTransferDayParams {
  liveTeams: Club[];
  userClubId?: string;
  dateStr: string;
  seasonNumber: number;
  window: TransferWindow;
  daysLeft: number;
  moves: WorldMoves;
  protectedPlayerIds?: Set<string>;
  rng?: () => number;
}

export interface SimulateTransferDayResult {
  updatedLiveTeams: Club[];
  newMoves: WorldMoves;
  deals: WorldTransferDeal[];
  news: { title: string; summary: string }[];
}

export function simulateWorldTransferDay(params: SimulateTransferDayParams): SimulateTransferDayResult {
  ensureIndex();
  const { liveTeams, userClubId, dateStr, seasonNumber, window, daysLeft, moves, protectedPlayerIds } = params;
  const rnd = params.rng || Math.random;

  const liveOut = new Map<string, Club>();
  liveTeams.forEach(c => c?.id && liveOut.set(c.id, c));
  const liveHolder = new Map<string, string>();
  liveTeams.forEach(c => (c?.players || []).forEach(p => p?.id && liveHolder.set(p.id, c.id)));

  const getClub = (id: string): Club | undefined => liveOut.get(id) || staticClubs!.get(id);
  const isLive = (id: string) => liveOut.has(id);

  // Unified club list (live version wins), never the user's club.
  const world: Club[] = [];
  staticClubs!.forEach((c, id) => { if (id !== userClubId) world.push(getClub(id)!); });
  liveTeams.forEach(c => { if (c?.id && c.id !== userClubId && !staticClubs!.has(c.id)) world.push(c); });
  // placeholder clubs with a handful of players (lower tiers without squads) don't trade
  const candidates = world.filter(c => c && !c.isUserClub && (c.players || []).length >= 16);

  const playersOf = (c: Club): Player[] => (c.players || []).filter(p => {
    if (!p?.id) return false;
    const heldBy = liveHolder.get(p.id);
    return !heldBy || heldBy === c.id; // skip static copies of players now playing in a live club (e.g. user signings)
  });

  // Money already spent this season (buys) / earned (70% of sales)
  const spent = new Map<string, number>();
  const dealsDone = new Map<string, number>();
  const addSpent = (id: string, v: number) => spent.set(id, (spent.get(id) || 0) + v);
  Object.values(moves).forEach(m => {
    if (m.seasonNumber !== seasonNumber) return;
    addSpent(m.toClubId, m.fee);
    addSpent(m.fromClubId, -0.7 * m.fee);
    dealsDone.set(m.toClubId, (dealsDone.get(m.toClubId) || 0) + 1);
  });

  const newMoves: WorldMoves = {};
  const deals: WorldTransferDeal[] = [];
  const news: { title: string; summary: string }[] = [];
  const movedToday = new Set<string>();
  const salesThisSeason = new Map<string, number>();
  Object.values(moves).forEach(m => { if (m.seasonNumber === seasonNumber && m.toClubId !== FREE_AGENT) salesThisSeason.set(m.fromClubId, (salesThisSeason.get(m.fromClubId) || 0) + 1); });

  const buyerCount = window === 'summer' ? 34 : 16;
  const deadlineBoost = daysLeft <= 3 ? 2.2 : 1;
  const shuffled = [...candidates];
  const need = buyerCount + 90;
  for (let i = 0; i < Math.min(need, shuffled.length); i++) {
    const j = i + Math.floor(rnd() * (shuffled.length - i));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const buyers = shuffled.slice(0, buyerCount);

  for (const buyer of buyers) {
    const rep = buyer.reputation || 40;
    const actProb = Math.min(0.75, (0.22 + rep / 400) * deadlineBoost);
    if (rnd() > actProb) continue;
    if ((dealsDone.get(buyer.id) || 0) >= 6) continue;

    const buyerPlayers = playersOf(buyer);
    if (buyerPlayers.length >= 32) continue;
    const allowance = clubSeasonAllowance(buyer) - (spent.get(buyer.id) || 0);
    if (allowance <= 0) continue;

    // Choose the position line to strengthen: real shortages first, otherwise weighted pick
    const cats: PositionCategory[] = ['GK', 'DEF', 'MID', 'FWD'];
    const byCat = (c: PositionCategory) => buyerPlayers.filter(p => p.positionCategory === c).sort((a, b) => b.overallRating - a.overallRating);
    const short = cats.filter(c => byCat(c).length < MIN_BY_CAT[c]);
    const r = rnd();
    const cat: PositionCategory = short.length ? short[Math.floor(rnd() * short.length)] : r < 0.08 ? 'GK' : r < 0.38 ? 'DEF' : r < 0.68 ? 'MID' : 'FWD';
    const mine = byCat(cat);
    const starters = mine.slice(0, STARTERS_BY_CAT[cat]);
    const avgTop = starters.length ? starters.reduce((s, p) => s + p.overallRating, 0) / starters.length : (buyer.reputation || 50) * 0.8;
    const worstStarter = starters.length ? starters[starters.length - 1].overallRating : 0;
    const minOvr = short.includes(cat) ? Math.max(45, avgTop - 8) : Math.max(worstStarter + 1, avgTop - 1);
    const maxOvr = avgTop + 4;

    // Scan a random sample of other clubs for the best affordable fit
    const sample = shuffled.slice(buyerCount, buyerCount + 90).filter(c => c.id !== buyer.id);
    let best: { p: Player; seller: Club; price: number; score: number } | null = null;
    for (const seller of sample) {
      const sellerPlayers = playersOf(seller);
      if (sellerPlayers.length <= 19) continue;
      const catCount = sellerPlayers.filter(p => p.positionCategory === cat).length;
      if (catCount <= MIN_BY_CAT[cat]) continue;
      if ((salesThisSeason.get(seller.id) || 0) >= ((seller.reputation || 0) >= 80 ? 3 : 5)) continue;
      const sRep = seller.reputation || 40;
      const keyIds = new Set([...sellerPlayers].sort((a, b) => b.overallRating - a.overallRating).slice(0, 3).map(x => x.id));
      for (const p of sellerPlayers) {
        if (p.positionCategory !== cat) continue;
        if (p.overallRating < minOvr || p.overallRating > maxOvr) continue;
        const maxAge = isRichLeague(buyer) ? 37 : 34;
        if (p.age > maxAge) continue;
        if (movedToday.has(p.id) || moves[p.id]?.seasonNumber === seasonNumber) continue;
        if (protectedPlayerIds?.has(p.id)) continue;
        // stars don't drop to clearly smaller clubs (except big-money leagues)
        if (p.overallRating >= 78 && sRep > rep + (isRichLeague(buyer) ? 18 : 6)) continue;
        // smaller clubs shop in their own tier or below
        if ((seller.division || 4) < (buyer.division || 4) - 1 && p.overallRating >= avgTop) continue;
        const ageF = p.age <= 22 ? 1.15 : p.age >= 31 ? 0.8 : 1;
        const keyPlayer = keyIds.has(p.id);
        const price = Math.round((p.marketValue || 100_000) * (0.95 + rnd() * 0.4) * ageF * (keyPlayer ? 1.3 : 1));
        if (price > allowance) continue;
        if (keyPlayer && rnd() > (p.overallRating >= 85 ? 0.08 : 0.35)) continue; // sellers resist losing a key man (superstars almost never leave)
        const potBonus = p.age <= 23 ? (p.potentialRating - p.overallRating) * 0.3 : 0;
        const score = p.overallRating + potBonus - (price / allowance) * 8 + rnd() * 6;
        if (!best || score > best.score) best = { p, seller, price, score };
      }
    }
    if (!best) continue;

    const { p, seller, price } = best;
    const salary = Math.max(Math.round((p.salary || 3000) * 1.1), Math.round((p.marketValue || 100_000) * 0.012));
    const contractYears = p.age <= 30 ? 4 : 2;
    const move: WorldMove = {
      fromClubId: seller.id, toClubId: buyer.id, fee: price, salary, contractYears,
      seasonNumber, dateStr, playerName: p.name,
    };

    // apply: seller loses him
    const sellerLive = isLive(seller.id);
    const buyerLive = isLive(buyer.id);
    const buyerClub = getClub(buyer.id)!;
    const sellerClub = getClub(seller.id)!;
    const moved: Player = {
      ...p, currentClubId: buyer.id, currentLeagueId: buyerClub.leagueId || p.currentLeagueId,
      salary, contractYears, isListedForTransfer: false, number: freeNumber(buyerClub.players || [], p.number),
    };

    if (sellerLive) {
      const next: Club = { ...sellerClub, players: (sellerClub.players || []).filter(x => x?.id !== p.id) };
      refreshLineupOn(next);
      liveOut.set(seller.id, next);
    }
    if (buyerLive) {
      const next: Club = { ...buyerClub, players: [...(buyerClub.players || []), moved] };
      refreshLineupOn(next);
      liveOut.set(buyer.id, next);
    }
    // keep the static twins consistent (they back rankings, opponents and the ledger replay)
    if (staticClubs!.has(seller.id) && staticClubs!.has(buyer.id)) {
      moveStatic(p.id, buyer.id, move);
    } else if (staticClubs!.has(seller.id) && !sellerLive) {
      /* seller static, buyer live-only: remove from static */
      const sc = staticClubs!.get(seller.id)!;
      sc.players = sc.players.filter(x => x?.id !== p.id);
      refreshLineup(sc);
      staticHolder!.delete(p.id);
    }
    if (buyerLive) liveHolder.set(p.id, buyer.id); else liveHolder.delete(p.id);

    movedToday.add(p.id);
    addSpent(buyer.id, price);
    addSpent(seller.id, -0.7 * price);
    dealsDone.set(buyer.id, (dealsDone.get(buyer.id) || 0) + 1);
    salesThisSeason.set(seller.id, (salesThisSeason.get(seller.id) || 0) + 1);
    newMoves[p.id] = move;
    deals.push({
      ...move, playerId: p.id, position: p.position, rating: p.overallRating,
      fromClubName: seller.name, toClubName: buyer.name,
      buyerReputation: buyer.reputation || 0, sellerReputation: seller.reputation || 0,
    });
  }

  // Last day of a window: oversized squads release their weakest surplus players
  if (daysLeft === 0) {
    candidates.forEach(c => {
      const club = getClub(c.id);
      if (!club) return;
      const squad = playersOf(club);
      if (squad.length <= 27) return;
      const protectedIds = new Set([...squad].sort((a, b) => b.overallRating - a.overallRating).slice(0, 20).map(x => x.id));
      const gkCount = squad.filter(x => x.positionCategory === 'GK').length;
      const releasable = [...squad]
        .filter(x => !protectedIds.has(x.id) && !(x.positionCategory === 'GK' && gkCount <= 3))
        .sort((a, b) => a.overallRating - b.overallRating)
        .slice(0, squad.length - 26);
      if (releasable.length === 0) return;
      const ids = new Set(releasable.map(x => x.id));
      if (isLive(club.id)) {
        const next: Club = { ...club, players: (club.players || []).filter(x => !ids.has(x.id)) };
        refreshLineupOn(next);
        liveOut.set(club.id, next);
      }
      if (staticClubs!.has(club.id)) {
        const sc = staticClubs!.get(club.id)!;
        sc.players = sc.players.filter(x => !ids.has(x.id));
        refreshLineup(sc);
      }
      releasable.forEach(x => {
        staticHolder!.delete(x.id);
        newMoves[x.id] = { fromClubId: club.id, toClubId: FREE_AGENT, fee: 0, salary: 0, contractYears: 0, seasonNumber, dateStr, playerName: x.name };
      });
    });
  }

  // Headlines: only notable deals (big fee, big clubs, or inside the user's own league)
  deals
    .filter(d => d.fee >= 5_000_000 || d.buyerReputation >= 85 || isLive(d.toClubId) || isLive(d.fromClubId))
    .sort((a, b) => b.fee - a.fee)
    .slice(0, 4)
    .forEach(d => {
      const buyer = getClub(d.toClubId);
      news.push({
        title: `🔁 ${d.toClubName} يضم ${d.playerName} من ${d.fromClubName}`,
        summary: `أنهى ${d.toClubName} صفقة ضم ${d.playerName} (${d.rating}) قادماً من ${d.fromClubName} مقابل ${fmtMoney(d.fee, buyer)}، بعقد لمدة ${d.contractYears} مواسم.`,
      });
    });

  const updatedLiveTeams = liveTeams.map(c => (c?.id && liveOut.get(c.id)) || c);
  return { updatedLiveTeams, newMoves, deals, news };
}

function refreshLineupOn(club: Club) {
  if (!club.players || club.players.length === 0) return;
  const { startingPlayerIds, benchPlayerIds } = pickLineup(club.players);
  club.tactics = {
    ...(club.tactics || ({} as any)),
    startingPlayerIds,
    benchPlayerIds,
    captainId: club.tactics?.captainId && club.players.some(p => p.id === club.tactics!.captainId) ? club.tactics.captainId : startingPlayerIds[0] || '',
  } as Club['tactics'];
}


/* ----------------------------- world eras (ageing / retirement / youth) -----------------------------
 * One "era" = one finished season of the world. Every outcome is a pure function of (playerId, era)
 * or (clubId, era), never of where a player currently plays, so ageing commutes with transfers:
 * a save only stores the era counter and the replay (reset -> eras 1..N -> moves) rebuilds the
 * exact same world.
 */

function hash32(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngFor(seed: string): () => number {
  let a = hash32(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const YOUTH_POSITIONS: Player['position'][] = ['CB', 'CM', 'ST', 'RB', 'LW', 'CDM', 'CAM', 'LB', 'RW', 'GK'];
const YOUTH_PER_CLUB = 2;
const MIN_SQUAD_FOR_ERAS = 16;

export interface WorldEraReport {
  era: number;
  retired: number;
  youth: number;
  retiredStars: { name: string; age: number; rating: number; clubName: string }[];
  risingStars: { name: string; age: number; rating: number; clubName: string }[];
}

/** Age one player by a year. Returns null when he retires. */
function agePlayer(p: Player, era: number, club: Club): Player | null {
  const r = rngFor(`${p.id}:era${era}`);
  const age = (p.age || 25) + 1;
  const ovr0 = p.overallRating || 65;
  const pot = Math.max(ovr0, p.potentialRating || ovr0);
  const isGK = p.position === 'GK';

  if (age >= 40) return null;
  if (age >= 35) {
    let prob = age === 35 ? 0.18 : age === 36 ? 0.3 : age === 37 ? 0.48 : age === 38 ? 0.7 : 0.88;
    if (ovr0 < 72) prob += 0.12;
    if (r() < prob) return null;
  }

  let delta = 0;
  if (age <= 23 && ovr0 < pot) delta = Math.min(pot - ovr0, Math.floor(r() * 3) + 1);
  else if (age <= 27 && ovr0 < pot) delta = Math.min(pot - ovr0, Math.floor(r() * 2) + (r() < 0.65 ? 1 : 0));
  else if (age <= 30) delta = ovr0 < pot && r() < 0.35 ? 1 : 0;
  else if (age <= 32) delta = isGK ? 0 : (r() < 0.5 ? -1 : 0);
  else if (age <= 34) delta = isGK ? (r() < 0.5 ? -1 : 0) : -(Math.floor(r() * 2) + 1);
  else delta = isGK ? -(Math.floor(r() * 2) + 1) : -(Math.floor(r() * 3) + 1);
  delta = Math.max(-3, Math.min(3, delta));
  const ovr = Math.min(99, Math.max(Math.min(ovr0, 58), ovr0 + delta));
  const real = ovr - ovr0;

  const a: any = p.attributes || null;
  const adj = (v: any, w: number) => (Number.isFinite(Number(v)) ? Math.min(99, Math.max(25, Math.round(Number(v) + real * w))) : v);
  const attributes = a ? {
    ...a,
    pace: adj(a.pace, real < 0 ? 1.15 : 0.9),
    shooting: adj(a.shooting, real < 0 ? 0.65 : 1),
    passing: adj(a.passing, real < 0 ? 0.55 : 1),
    dribbling: adj(a.dribbling, real < 0 ? 0.85 : 1),
    defending: adj(a.defending, real < 0 ? 0.7 : 1),
    physical: adj(a.physical, real < 0 ? 1.1 : 0.9),
    ...(a.goalkeeping !== undefined ? { goalkeeping: adj(a.goalkeeping, real < 0 ? 0.6 : 1) } : {}),
  } : p.attributes;

  const nextPot = Math.max(ovr, pot - (age >= 24 ? 1 : 0));
  const out: Player = { ...p, age, overallRating: ovr, potentialRating: nextPot, attributes } as Player;
  if (real !== 0 || age >= 30) {
    try {
      const v = calculatePlayerValuation(ovr, nextPot, age, p.positionCategory, 70);
      out.marketValue = Math.max(10000, Math.round(v.marketValue));
    } catch { /* keep old value */ }
  }
  out.contractYears = Math.max(1, (p.contractYears || 1) - (r() < 0.5 ? 1 : 0)) || 1;
  if ((out.contractYears || 0) <= 1 && r() < 0.6) out.contractYears = 2 + Math.floor(r() * 3); // clubs renew
  out.stats = { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0, averageRating: 7.0, motm: 0 } as any;
  return out;
}

function makeYouth(club: Club, era: number, k: number): Player {
  const id = `${club.id}_y${era}_${k + 1}`;
  const pos = YOUTH_POSITIONS[(era * YOUTH_PER_CLUB + k) % YOUTH_POSITIONS.length];
  const cat: PositionCategory = pos === 'GK' ? 'GK' : ['CB', 'RB', 'LB'].includes(pos) ? 'DEF' : ['CM', 'CDM', 'CAM'].includes(pos) ? 'MID' : 'FWD';
  const base = Math.max(45, Math.round(((club as any).baseSquadLevel ?? (club.reputation || 50) * 0.85) - 9));
  const countryCode = club.countryCode || 'EGY';
  const p = withSeededRandom(`youth:${id}`, () => generatePlayer({
    countryId: countryCode,
    clubId: club.id,
    leagueId: club.leagueId,
    clubReputation: club.reputation || 50,
    baseLevel: base,
    position: pos,
    positionCategory: cat,
    ageMin: 17,
    ageMax: 19,
  }));
  p.id = id;
  p.currentClubId = club.id;
  p.currentLeagueId = club.leagueId || p.currentLeagueId;
  p.isListedForTransfer = false;
  // Quality is tied to the club's own level (its original top-16), so talent is replenished at a
  // steady rate: the ratings of the world neither inflate nor decay over many seasons.
  const home = originalSquads.get(club.id);
  const top = [...(home?.players || [])].sort((a, b) => b.overallRating - a.overallRating).slice(0, 16);
  const level = top.length ? top.reduce((s, x) => s + x.overallRating, 0) / top.length : base + 9;
  const r = rngFor(`youthq:${id}`);
  const ovr = Math.max(42, Math.min(80, Math.round(level - 19 + r() * 7)));
  const pot = Math.max(ovr + 2, Math.min(94, Math.round(level + 1 + (r() - 0.45) * 18)));
  p.overallRating = ovr;
  p.potentialRating = pot;
  try {
    const v = calculatePlayerValuation(ovr, pot, p.age, cat, 70);
    p.marketValue = Math.max(10000, Math.round(v.marketValue));
  } catch { /* keep generated value */ }
  return p;
}

/** Apply one world era to every static club. Deterministic; safe to replay. */
export function advanceWorldEra(era: number): WorldEraReport {
  ensureIndex();
  const report: WorldEraReport = { era, retired: 0, youth: 0, retiredStars: [], risingStars: [] };
  staticClubs!.forEach(club => {
    const squad = club.players || [];
    if (squad.length === 0) return;
    const kept: Player[] = [];
    for (const p of squad) {
      if (!p) continue;
      const next = agePlayer(p, era, club);
      if (!next) {
        report.retired++;
        staticHolder!.delete(p.id);
        if (p.overallRating >= 80 && report.retiredStars.length < 12) {
          report.retiredStars.push({ name: p.name, age: (p.age || 35) + 1, rating: p.overallRating, clubName: club.name });
        }
        continue;
      }
      if (next.overallRating - p.overallRating >= 3 && next.overallRating >= 82 && report.risingStars.length < 8) {
        report.risingStars.push({ name: p.name, age: next.age, rating: next.overallRating, clubName: club.name });
      }
      kept.push(next);
    }
    const home = originalSquads.get(club.id);
    if (home && home.players.length >= MIN_SQUAD_FOR_ERAS) {
      for (let k = 0; k < YOUTH_PER_CLUB; k++) {
        const y = makeYouth(club, era, k);
        y.number = freeNumber(kept, y.number);
        kept.push(y);
        staticHolder!.set(y.id, club.id);
        report.youth++;
      }
    }
    club.players = kept;
    refreshLineup(club);
  });
  return report;
}

/** Rebuild eras 1..era on top of a freshly reset static database (call before applyWorldMoves). */
export function applyWorldEras(era: number | undefined | null): void {
  const n = Math.max(0, Math.min(200, Math.floor(Number(era) || 0)));
  for (let e = 1; e <= n; e++) advanceWorldEra(e);
}


/**
 * Keep the saved ledger small: drop moves of players who no longer exist anywhere (retired or
 * released) and slim down moves older than a season to the fields the replay really needs.
 */
export function pruneWorldMoves(moves: WorldMoves | undefined, liveTeams: Club[], currentSeason: number): WorldMoves {
  ensureIndex();
  const liveIds = new Set<string>();
  (liveTeams || []).forEach(c => (c?.players || []).forEach(p => p?.id && liveIds.add(p.id)));
  const out: WorldMoves = {};
  Object.entries(moves || {}).forEach(([pid, mv]) => {
    if (!mv) return;
    const exists = staticHolder!.has(pid) || liveIds.has(pid);
    if (!exists && mv.toClubId !== FREE_AGENT) return;
    if (mv.toClubId === FREE_AGENT && !staticHolder!.has(pid) && !liveIds.has(pid)) {
      // a released player stays released; only keep it while he could still be re-created by a replay
      if ((currentSeason - (mv.seasonNumber || 0)) > 25) return;
    }
    out[pid] = (currentSeason - (mv.seasonNumber || 0)) <= 1
      ? mv
      : { fromClubId: '', toClubId: mv.toClubId, fee: 0, salary: mv.salary, contractYears: mv.contractYears, seasonNumber: mv.seasonNumber, dateStr: '', playerName: '' };
  });
  return out;
}
