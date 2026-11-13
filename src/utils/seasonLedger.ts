// Season scorers/assisters ledger.
// Player objects carry their own goal counters, but those can be lost when a player is moved, re-hydrated or replaced.
// This tiny independent ledger is fed straight from every simulated league match (user's and the AI's), so the
// top-scorers / top-assisters tables always reflect what really happened on the pitch this season.

export interface LedgerEntry { id: string; name: string; clubId: string; goals: number; assists: number }
interface LedgerBlob { key: string; entries: Record<string, LedgerEntry> }

const STORAGE_KEY = 'anta_season_ledger_v1';
let cache: LedgerBlob | null = null;

function load(): LedgerBlob | null {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const b = JSON.parse(raw); if (b && b.key && b.entries) { cache = b; return b; } }
  } catch { /* */ }
  return null;
}

function save(b: LedgerBlob) {
  cache = b;
  try {
    // keep the file small: only the best ~150 contributors survive
    const all = Object.values(b.entries);
    if (all.length > 150) {
      all.sort((x, y) => (y.goals + y.assists * 0.6) - (x.goals + x.assists * 0.6));
      b.entries = Object.fromEntries(all.slice(0, 150).map(e => [e.id, e]));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  } catch { /* */ }
}

const keyOf = (leagueId: string, season: number) => `${leagueId}|${season}`;

export function recordLeagueMatchesToLedger(
  matches: { events?: any[]; isCup?: boolean }[],
  seasonNumber: number | undefined,
  leagueId: string | undefined
): void {
  if (!leagueId || typeof seasonNumber !== 'number') return;
  const key = keyOf(leagueId, seasonNumber);
  let b = load();
  if (!b || b.key !== key) b = { key, entries: {} };
  for (const m of matches || []) {
    if (!m || m.isCup) continue;
    for (const e of m.events || []) {
      if (!e || e.type !== 'goal') continue;
      if (e.playerId) {
        const cur = b.entries[e.playerId] || { id: e.playerId, name: e.playerName || '', clubId: e.teamId || '', goals: 0, assists: 0 };
        cur.goals += 1; if (e.playerName) cur.name = e.playerName; if (e.teamId) cur.clubId = e.teamId;
        b.entries[e.playerId] = cur;
      }
      if (e.assistPlayerId) {
        const cur = b.entries[e.assistPlayerId] || { id: e.assistPlayerId, name: e.assistPlayerName || '', clubId: e.teamId || '', goals: 0, assists: 0 };
        cur.assists += 1; if (e.assistPlayerName) cur.name = e.assistPlayerName;
        b.entries[e.assistPlayerId] = cur;
      }
    }
  }
  save(b);
}

export function getLedger(leagueId: string | undefined, seasonNumber: number | undefined): LedgerEntry[] {
  if (!leagueId || typeof seasonNumber !== 'number') return [];
  const b = load();
  if (!b || b.key !== keyOf(leagueId, seasonNumber)) return [];
  return Object.values(b.entries);
}

export interface SeasonAwardResult {
  teams: any[];
  messages: { title: string; content: string }[];
  lines: string[];
}

/**
 * League awards (top scorer / top assister / Golden Ball). When one of the user's players wins, he gets a morale boost,
 * a higher market value and a small development jump, and the coach gets a message about it.
 */
export function applySeasonAwards(teams: any[], userClubId: string | undefined, leagueId: string | undefined, seasonNumber: number | undefined): SeasonAwardResult {
  const out: SeasonAwardResult = { teams, messages: [], lines: [] };
  try {
    if (!userClubId || !leagueId || typeof seasonNumber !== 'number') return out;
    const ledger = getLedger(leagueId, seasonNumber);
    const byId = new Map<string, LedgerEntry & { fromTeam?: boolean }>();
    for (const e of ledger) byId.set(e.id, { ...e });
    for (const t of teams || []) {
      if (!t || !Array.isArray(t.players)) continue;
      for (const p of t.players) {
        if (!p) continue;
        const g = p.stats?.goals || 0, a = p.stats?.assists || 0;
        const cur = byId.get(p.id);
        if (cur) { cur.goals = Math.max(cur.goals, g); cur.assists = Math.max(cur.assists, a); }
        else if (g || a) byId.set(p.id, { id: p.id, name: p.name, clubId: t.id, goals: g, assists: a });
      }
    }
    const all = [...byId.values()];
    if (all.length === 0) return out;
    const topScorer = [...all].sort((x, y) => y.goals - x.goals)[0];
    const topAssister = [...all].sort((x, y) => y.assists - x.assists)[0];
    const golden = [...all].sort((x, y) => (y.goals + y.assists * 0.6) - (x.goals + x.assists * 0.6))[0];

    const wins: Record<string, { title: string; mult: number }[]> = {};
    const add = (e: LedgerEntry | undefined, ok: boolean, title: string, mult: number) => {
      if (!e || !ok) return;
      (wins[e.id] = wins[e.id] || []).push({ title, mult });
    };
    add(topScorer, topScorer?.goals >= 8, '👟 الهداف التاريخي للدوري (الحذاء الذهبي)', 1.12);
    add(topAssister, topAssister?.assists >= 6, '🎯 أفضل صانع ألعاب في الدوري', 1.10);
    add(golden, golden && golden.goals + golden.assists * 0.6 >= 10, '🏆 الكرة الذهبية — أفضل لاعب في الدوري', 1.2);

    const newTeams = (teams || []).map((t: any) => {
      if (!t || t.id !== userClubId || !Array.isArray(t.players)) return t;
      let touched = false;
      const players = t.players.map((p: any) => {
        const w = p && wins[p.id];
        if (!w) return p;
        touched = true;
        const mult = Math.min(1.4, w.reduce((m, x) => m * x.mult, 1));
        const titles = w.map(x => x.title);
        out.lines.push(`${p.name}: ${titles.join(' + ')}`);
        out.messages.push({
          title: `🏅 ${p.name} يحصد جوائز الدوري!`,
          content: `${p.name} نال ${titles.join(' و ')} هذا الموسم. ارتفعت معنوياته وقيمته السوقية وتطوّر مستواه، والجماهير تتغنى باسمه!`,
        });
        return {
          ...p,
          morale: Math.min(100, (p.morale || 70) + 15),
          marketValue: Math.round((p.marketValue || 50000) * mult),
          overallRating: Math.min(99, (p.overallRating || 60) + 1),
          potentialRating: Math.min(99, Math.max((p.potentialRating || 60), (p.overallRating || 60) + 1) + 1),
          seasonAwards: [...(p.seasonAwards || []), ...titles.map(x => `${x} (موسم ${seasonNumber})`)],
        };
      });
      return touched ? { ...t, players } : t;
    });
    out.teams = newTeams;
  } catch { /* awards are optional */ }
  return out;
}
