import type { ContinentalPhaseState } from '../services/continentalPhase';

export interface AwardItem {
  id: string;
  kind: 'coach' | 'player';
  scope: 'continent' | 'world';
  title: string;        // e.g. "أفضل مدرب في أفريقيا"
  winnerName: string;
  clubName: string;
  clubId: string;
  isUser: boolean;
  playerId?: string;
  prize: number;        // goes to the coach's personal wallet (coach awards only)
  seasonNumber: number;
  detail: string;       // short line of numbers / result for the share card
}

export const COACH_CONTINENT_PRIZE = 100000;
export const COACH_WORLD_PRIZE = 250000;
export const COACH_AWARD_CHANCE = 0.8;

const CONTINENT_NAME: Record<string, string> = {
  AFRICA: 'أفريقيا', EUROPE: 'أوروبا', ASIA: 'آسيا', SOUTH_AMERICA: 'أمريكا الجنوبية',
};

const AI_FIRST = ['كارلو','أوليفر','ماركو','جوزيه','دييغو','ستيفان','فرانك','ماتيو','رودريغو','يورغن','أندريا','باولو','ميشيل','تيو','لوكا','ساندرو'];
const AI_LAST = ['روسي','مارتينيز','شميدت','فيرنانديز','بيريرا','دوبوا','أندرسن','كوفاتش','مورينيو','سيلفا','بيانكي','ويبر','غارسيا','ليمان','نوفاك','رينالدي'];
export function aiCoachName(clubId: string): string {
  let h = 0;
  for (let i = 0; i < clubId.length; i++) h = (h * 31 + clubId.charCodeAt(i)) >>> 0;
  return `${AI_FIRST[h % AI_FIRST.length]} ${AI_LAST[(h >>> 5) % AI_LAST.length]}`;
}

const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

function scorePlayer(p: any, isUser: boolean, champion: boolean, world: boolean, rnd: () => number) {
  const ovr = num(p.overallRating, 60);
  const goals = num(p.stats?.goals), assists = num(p.stats?.assists), apps = num(p.stats?.appearances);
  const avg = num(p.stats?.averageRating, 6.5);
  let score: number;
  let eligible = true;
  if (isUser) {
    const output = goals + assists * 0.6;
    const isKeeperOrDef = p.positionCategory === 'GK' || p.positionCategory === 'DEF';
    // the user's player must have had a genuinely big season in numbers to be considered
    eligible = apps >= 10 && (output >= (world ? 15 : 8) || (isKeeperOrDef && avg >= (world ? 7.5 : 7.2)));
    score = output * 0.45 + Math.max(0, avg - 6) * 3 + (ovr - 60) * 0.3;
  } else {
    // AI players: the world doesn't track reliable season numbers for them, so estimate from quality
    score = (ovr - 60) * 0.45 + rnd() * 3;
  }
  if (champion) score += 5;
  return { score, eligible };
}

export function rollSeasonAwards(args: {
  state: ContinentalPhaseState;
  userClub: any;
  findClub: (id: string) => any;
  coachName: string;
  rnd?: () => number;
}): AwardItem[] {
  const { state, userClub, findClub, coachName } = args;
  const rnd = args.rnd || Math.random;
  const out: AwardItem[] = [];
  try {
    const world = state.compId === 'cwc';
    if (!world && !state.isTopTier) return out; // only the top continental competition hands out the continental awards
    const finalTie = state.ties.find(t => t.round === 'F');
    if (!finalTie || !state.championId) return out;

    const scope: 'continent' | 'world' = world ? 'world' : 'continent';
    const place = world ? 'العالم' : (CONTINENT_NAME[state.continent || ''] || 'القارة');
    const userInFinal = finalTie.a === state.userId || finalTie.b === state.userId;
    const userChampion = state.championId === state.userId;
    const seasonNumber = state.seasonNumber;

    // ---- Coach of the year. Not automatic: the user wins it only when he earned it (title / World Cup final) AND the vote
    // goes his way (80%); otherwise the award goes to the coach of the champion (or the runner-up when the user was champion).
    const qualifies = world ? userInFinal : userChampion;
    const userWins = qualifies && rnd() < COACH_AWARD_CHANCE;
    const otherId = userChampion ? (finalTie.a === state.userId ? finalTie.b : finalTie.a)
      : (userInFinal && !userChampion ? state.championId : state.championId);
    if (userWins) {
      out.push({
        id: `coach_${scope}_${seasonNumber}`,
        kind: 'coach', scope,
        title: `أفضل مدرب في ${place}`,
        winnerName: coachName || 'المدرب',
        clubName: userClub?.name || '',
        clubId: userClub?.id || '',
        isUser: true,
        prize: world ? COACH_WORLD_PRIZE : COACH_CONTINENT_PRIZE,
        seasonNumber,
        detail: userChampion ? `🏆 بطل ${state.compName} ${seasonNumber}` : `🥈 وصيف ${state.compName}`,
      });
    } else if (otherId) {
      const club = findClub(otherId);
      const cname = club?.manager?.name || aiCoachName(otherId);
      out.push({
        id: `coach_${scope}_${seasonNumber}`,
        kind: 'coach', scope,
        title: `أفضل مدرب في ${place}`,
        winnerName: cname,
        clubName: club?.name || state.teams.find(t => t.id === otherId)?.name || '',
        clubId: otherId,
        isUser: false,
        prize: 0,
        seasonNumber,
        detail: otherId === state.championId ? `🏆 قاد فريقه لبطولة ${state.compName}` : `🥈 قاد فريقه لنهائي ${state.compName}`,
      });
    }

    // ---- Player of the year: picked from the two finalists
    let best: { p: any; clubId: string; clubName: string; isUser: boolean; score: number } | null = null;
    for (const id of [finalTie.a, finalTie.b]) {
      const isUserClub = id === state.userId;
      const club = isUserClub ? userClub : findClub(id);
      if (!club || !Array.isArray(club.players)) continue;
      const champion = state.championId === id;
      for (const p of club.players) {
        if (!p || !p.id) continue;
        const { score, eligible } = scorePlayer(p, isUserClub, champion, world, rnd);
        if (!eligible) continue;
        if (!best || score > best.score) best = { p, clubId: id, clubName: club.name || '', isUser: isUserClub, score };
      }
    }
    if (best) {
      const g = num(best.p.stats?.goals), a = num(best.p.stats?.assists);
      out.push({
        id: `player_${scope}_${seasonNumber}`,
        kind: 'player', scope,
        title: `أفضل لاعب في ${place}`,
        winnerName: best.p.name || 'لاعب',
        clubName: best.clubName,
        clubId: best.clubId,
        isUser: best.isUser,
        playerId: best.p.id,
        prize: 0,
        seasonNumber,
        detail: best.isUser && (g || a) ? `⚽ ${g} هدف • 🎯 ${a} تمريرة حاسمة هذا الموسم` : `نجم نهائي ${state.compName}`,
      });
    }
  } catch { /* awards are optional */ }
  return out;
}

/** Boost the user's winning players (morale, value, development) — applied once when the season rolls over. */
export function applyPlayerAwardBoosts(teams: any[], userClubId: string | undefined, items: AwardItem[]): any[] {
  const wins = items.filter(i => i.kind === 'player' && i.isUser && i.playerId);
  if (!userClubId || wins.length === 0) return teams;
  return (teams || []).map((t: any) => {
    if (!t || t.id !== userClubId || !Array.isArray(t.players)) return t;
    return {
      ...t,
      players: t.players.map((p: any) => {
        const w = p && wins.filter(x => x.playerId === p.id);
        if (!w || w.length === 0) return p;
        const world = w.some(x => x.scope === 'world');
        const mult = Math.min(1.5, w.reduce((m, x) => m * (x.scope === 'world' ? 1.35 : 1.18), 1));
        return {
          ...p,
          morale: Math.min(100, num(p.morale, 70) + (world ? 25 : 15)),
          marketValue: Math.round(num(p.marketValue, 50000) * mult),
          overallRating: Math.min(99, num(p.overallRating, 60) + (world ? 2 : 1)),
          potentialRating: Math.min(99, Math.max(num(p.potentialRating, 60), num(p.overallRating, 60) + 1) + (world ? 2 : 1)),
          seasonAwards: [...(p.seasonAwards || []), ...w.map(x => `${x.title} (موسم ${x.seasonNumber})`)],
        };
      }),
    };
  });
}
