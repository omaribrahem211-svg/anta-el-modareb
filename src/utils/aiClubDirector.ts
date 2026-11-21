// AI Club Director: makes AI clubs behave like real competitors between seasons.
// Runs once per in-game month for the user's active league:
//  - Every AI club gets a persistent manager (personality drives its match tactics).
//  - Underperforming managers get sacked and replaced (with news).
//  - Clubs develop: young players grow mid-season, facilities get investment, morale drifts with form.
import type { Club, ClubManager, DailyNewsItem, LeagueStanding, Player } from '../types/game';
import { getOrCreateClubManager } from '../data/worldManagersData';
import { avgTopOvr } from './worldEvolution';
import { syncPlayerMarketValueWithRating } from './transferEngine';

type Rng = () => number;

const COACH_FIRST = ['حسام', 'عماد', 'طارق', 'محمد', 'أحمد', 'كريم', 'سامي', 'وليد', 'هاني', 'شوقي', 'إيهاب', 'تامر'];
const COACH_LAST = ['حسن', 'البدري', 'مصطفى', 'عبدالعال', 'سليمان', 'جمال', 'شعبان', 'غريب', 'يعقوب', 'سيد', 'الشاذلي', 'عاشور'];
const FOREIGN_COACHES = ['كارلوس كيروش', 'جوزيه بيسيرو', 'روي فيتوريا', 'هيرفي رينار', 'باتريس كارتيرون', 'جايمي باتشيكو', 'ريكاردو سواريس', 'مارسيل كولر'];

const MANAGER_STYLES: ClubManager['tacticalStyle'][] = ['attacking', 'possession', 'counter_attack', 'defensive', 'high_press', 'tiki_taka', 'balanced'];
const MANAGER_FORMATIONS: ClubManager['preferredFormation'][] = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '4-1-4-1', '5-3-2'];

function generateReplacementManager(club: Club, rng: Rng): ClubManager {
  const rep = club.reputation || 40;
  const tier = club.division || 1;
  const baseRating = tier === 4 ? 58 : tier === 3 ? 65 : tier === 2 ? 71 : 76;
  const rating = Math.min(92, Math.max(52, Math.round(baseRating + rng() * 8 - 2)));
  const foreign = rng() < Math.min(0.4, rep / 200); // bigger clubs attract foreign coaches
  const name = foreign
    ? FOREIGN_COACHES[Math.floor(rng() * FOREIGN_COACHES.length)]
    : `${COACH_FIRST[Math.floor(rng() * COACH_FIRST.length)]} ${COACH_LAST[Math.floor(rng() * COACH_LAST.length)]}`;
  return {
    id: `mgr_${club.id}_r${Date.now().toString(36)}${Math.floor(rng() * 1e4)}`,
    name,
    shortName: name.split(' ').slice(-1)[0] || name,
    nationality: foreign ? 'أجنبي' : (club.country || 'مصر'),
    countryCode: club.countryCode || 'EGY',
    age: 40 + Math.floor(rng() * 22),
    rating,
    tacticalStyle: MANAGER_STYLES[Math.floor(rng() * MANAGER_STYLES.length)],
    preferredFormation: MANAGER_FORMATIONS[Math.floor(rng() * MANAGER_FORMATIONS.length)],
    reputation: Math.max(15, Math.min(90, rep + Math.floor(rng() * 10 - 5))),
    rankingPoints: Math.round(rating * 20 + rep * 10),
    worldRank: 400 + Math.floor(rng() * 1200),
    previousWorldRank: 400,
    monthlyRankChange: 0,
    trophiesWonCount: Math.floor(rng() * 4),
    majorTrophies: [],
    currentClubId: club.id,
    currentClubName: club.name,
    currentLeagueId: club.leagueId,
  };
}

function bumpYoungPlayer(p: Player, rng: Rng): Player {
  const pot = Math.max(p.overallRating || 65, (p as any).potentialRating || 0);
  const next = Math.min(99, (p.overallRating || 65) + 1);
  if (next > pot) return p;
  const a: any = p.attributes || {};
  const inc = (v: any) => (Number.isFinite(Number(v)) ? Math.min(99, Number(v) + 1) : v);
  const out: any = {
    ...p,
    overallRating: next,
    attributes: {
      ...a,
      pace: inc(a.pace), shooting: inc(a.shooting), passing: inc(a.passing),
      dribbling: inc(a.dribbling), defending: inc(a.defending), physical: inc(a.physical),
      ...(a.goalkeeping !== undefined ? { goalkeeping: inc(a.goalkeeping) } : {}),
    },
  };
  try { out.marketValue = syncPlayerMarketValueWithRating(out, p.overallRating || 65); } catch { /* keep old value */ }
  return out;
}

export interface AiClubDirectorResult {
  teams: Club[];
  news: DailyNewsItem[];
  sackings: number;
  appointments: number;
}

/**
 * Monthly decisions for every AI club in the league. `standings` must reflect the current table.
 * The user's club is never touched.
 */
export function runMonthlyAiClubDecisions(
  teams: Club[],
  standings: LeagueStanding[],
  opts: { seasonNumber: number; monthLabel: string; dateStr: string; userClubId?: string | null },
  rng: Rng = Math.random
): AiClubDirectorResult {
  const news: DailyNewsItem[] = [];
  let sackings = 0;
  let appointments = 0;
  if (!Array.isArray(teams) || teams.length === 0) return { teams, news, sackings, appointments };

  const isUser = (c: Club) => Boolean(c?.isUserClub) || Boolean(opts.userClubId && c?.id === opts.userClubId);
  const aiClubs = teams.filter(t => t && !isUser(t));

  // Expected rank by squad strength vs actual rank by points
  const byStrength = [...aiClubs].sort((a, b) => avgTopOvr(b) - avgTopOvr(a)).map(c => c.id);
  const safeStandings = Array.isArray(standings) ? standings : [];
  const byPoints = [...safeStandings]
    .sort((a, b) => (b.points - a.points) || (b.goalDifference - a.goalDifference))
    .map(s => s.teamId);
  const strengthRank = new Map(byStrength.map((id, i) => [id, i + 1]));
  const tableRank = new Map(byPoints.map((id, i) => [id, i + 1]));
  const maxPlayed = safeStandings.reduce((m, s) => Math.max(m, s?.played || 0), 0);

  const updated = teams.map(club => {
    if (!club || isUser(club)) return club;
    let c: Club = { ...club };

    // 1. Every AI club has a persistent manager whose personality drives its tactics
    if (!c.manager || typeof c.manager.rating !== 'number') {
      c.manager = getOrCreateClubManager(c);
    }

    // 2. Manager evaluation: sack chronic underperformers once the season has settled
    const exp = strengthRank.get(c.id) || aiClubs.length / 2;
    const act = tableRank.get(c.id) || exp;
    const underperformingBy = act - exp; // positive = worse than the squad deserves
    if (maxPlayed >= 8 && underperformingBy >= 5 && rng() < 0.38) {
      const oldMgr = c.manager;
      const newMgr = generateReplacementManager(c, rng);
      sackings++;
      appointments++;
      news.push({
        id: `aimgr_sack_${c.id}_${Date.now().toString(36)}`,
        dateStr: opts.dateStr,
        title: `رسمياً: ${c.name} يقيل ${oldMgr?.name || 'مدربه'} ويعين ${newMgr.name}`,
        content: `أعلن مجلس إدارة ${c.name} إقالة المدير الفني ${oldMgr?.name || 'السابق'} بعد تراجع النتائج (المركز ${act} رغم امتلاك الفريق قوة تؤهله للمركز ${exp}). المدرب الجديد ${newMgr.name} (${newMgr.nationality}) يفضل أسلوب ${newMgr.tacticalStyle} وتشكيل ${newMgr.preferredFormation}.`,
        category: 'board',
        importance: 'high',
        icon: '⚽',
        source: 'أخبار الدوري',
        clubName: c.name,
      } as DailyNewsItem);
      // New manager bounce: morale lift across the squad, and the club's stored tactics
      // immediately reflect the new manager's philosophy (batch sim uses club.tactics).
      c = {
        ...c,
        manager: newMgr,
        players: (c.players || []).map(p => (p ? { ...p, morale: Math.min(99, (p.morale || 60) + 8) } : p)),
        tactics: c.tactics
          ? {
              ...c.tactics,
              formation: newMgr.preferredFormation || c.tactics.formation,
              tacticalStyle: newMgr.tacticalStyle === 'attacking' ? 'wing_play'
                : newMgr.tacticalStyle === 'possession' || newMgr.tacticalStyle === 'tiki_taka' ? 'tiki_taka'
                : newMgr.tacticalStyle === 'counter_attack' ? 'counter_attack'
                : newMgr.tacticalStyle === 'defensive' ? 'park_the_bus'
                : newMgr.tacticalStyle === 'high_press' ? 'gegenpress'
                : c.tactics.tacticalStyle,
            } as any
          : c.tactics,
      };
    } else if (maxPlayed >= 8 && underperformingBy >= 4 && rng() < 0.25) {
      news.push({
        id: `aimgr_pressure_${c.id}_${Date.now().toString(36)}`,
        dateStr: opts.dateStr,
        title: `ضغوط على مدرب ${c.name} بعد تذبذب النتائج`,
        content: `تصاعدت الأصوات داخل جماهير ${c.name} مطالبة بتحسن النتائج، حيث يحتل الفريق المركز ${act} في ${opts.monthLabel} رغم قوة تشكيلته.`,
        category: 'crisis',
        importance: 'normal',
        icon: '🔥',
        source: 'أخبار الدوري',
        clubName: c.name,
      } as DailyNewsItem);
    }

    // 3. Youth development: one promising youngster improves mid-season (most months)
    const youngsters = (c.players || [])
      .filter(p => p && (p.age || 30) <= 23 && ((p as any).potentialRating || 0) > (p.overallRating || 0))
      .sort((a, b) => (((b as any).potentialRating || 0) - (b.overallRating || 0)) - (((a as any).potentialRating || 0) - (a.overallRating || 0)));
    if (youngsters.length > 0 && rng() < 0.55) {
      const target = youngsters[Math.floor(rng() * Math.min(3, youngsters.length))];
      c = {
        ...c,
        players: (c.players || []).map(p => (p && p.id === target.id ? bumpYoungPlayer(p, rng) : p)),
      };
    }

    // 4. Facility investment: rich clubs upgrade infrastructure (feeds crowd advantage & development)
    if ((c.budget || 0) > 25_000_000 && rng() < 0.3) {
      const fac: any = { ...(c.facilities || {}) };
      const key = rng() < 0.5 ? 'trainingCenter' : 'stadium';
      const cur = Number(fac[key] || 1);
      if (cur < 5) {
        fac[key] = cur + 1;
        c = { ...c, facilities: fac, budget: (c.budget || 0) - 8_000_000 };
        if ((c.reputation || 0) >= 70) {
          news.push({
            id: `aifac_${c.id}_${Date.now().toString(36)}`,
            dateStr: opts.dateStr,
            title: `${c.name} يطور ${key === 'stadium' ? 'ملعبه' : 'مركزه التدريبي'}`,
            content: `استثمر مجلس إدارة ${c.name} في تطوير ${key === 'stadium' ? 'الملعب إلى المستوى ' + fac[key] : 'المركز التدريبي إلى المستوى ' + fac[key]} ضمن خطة طويلة المدى للمنافسة على الألقاب.`,
            category: 'board',
            importance: 'normal',
            icon: '🏟️',
            source: 'أخبار الدوري',
            clubName: c.name,
          } as DailyNewsItem);
        }
      }
    }

    // 5. Morale drifts with recent form (standings form string, last 5)
    const row = safeStandings.find(s => s && s.teamId === c.id);
    if (row && Array.isArray(row.form) && row.form.length > 0) {
      const wins = row.form.filter(r => r === 'W').length;
      const losses = row.form.filter(r => r === 'L').length;
      const drift = Math.max(-4, Math.min(4, wins - losses));
      if (drift !== 0) {
        c = {
          ...c,
          players: (c.players || []).map(p => (p ? { ...p, morale: Math.max(35, Math.min(99, (p.morale || 60) + drift)) } : p)),
        };
      }
    }

    return c;
  });

  return { teams: updated, news, sackings, appointments };
}
