import type { Club, Player } from '../types/game';
import { syncPlayerMarketValueWithRating } from '../utils/transferEngine';

/** Random in-season events the manager decides on (training camps, friendlies, star demands...). */

export interface SeasonEventEffects {
  budget?: number;            // club treasury delta
  wallet?: number;            // manager personal wallet delta
  reputation?: number;        // manager reputation delta
  squadMorale?: number;       // every player
  squadFitness?: number;      // every player
  target?: {                  // the event's featured player
    morale?: number;
    listed?: boolean;
    salaryMult?: number;
    ratingDelta?: number;
    injuryDays?: number;
  };
  randomPlayers?: { count: number; fatigue?: number; injuryChance?: number; injuryDays?: number };
}

export interface SeasonEventChoice {
  id: string;
  label: string;
  hint: string;
  effects: SeasonEventEffects;
  /** Optional gamble: with probability p the `win` effects apply, otherwise `effects`. */
  gamble?: { p: number; win: SeasonEventEffects; winText: string; loseText: string; roll?: number };
  /** Treasury needed to pick this choice (the choice is disabled / refused when the club cannot pay). */
  cost?: number;
}

export interface SeasonEvent {
  id: string;
  kind: string;
  icon: string;
  title: string;
  body: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  choices: SeasonEventChoice[];
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export interface SeasonEventHistory {
  seasonNumber: number;
  lastDay: number;
  byKind: Record<string, number>;          // kind -> day index it last fired
  perPlayer: Record<string, number>;       // targetPlayerId -> day index it last fired
  seasonCounts: Record<string, number>;    // limited kinds -> times this season
}

export const emptySeasonEventHistory = (seasonNumber = 1): SeasonEventHistory => ({
  seasonNumber, lastDay: -100, byKind: {}, perPlayer: {}, seasonCounts: {},
});

export function rolloverSeasonEventHistory(h: SeasonEventHistory, seasonNumber: number): SeasonEventHistory {
  return h.seasonNumber === seasonNumber ? h : { ...h, seasonNumber, seasonCounts: {}, lastDay: -100 };
}

/** Per-season caps for events that hand out free value, and minimum gap (days) before the same kind repeats. */
const SEASON_CAPS: Record<string, number> = { sponsor: 2, friendly: 2, youth_boom: 2, star_demand: 3, press: 3, fans: 3 };
const KIND_GAP_DAYS = 45;
const PLAYER_GAP_DAYS = 90;

export function rollSeasonEvent(
  club: Club,
  history: SeasonEventHistory = emptySeasonEventHistory(),
  day = 0,
  rng: () => number = Math.random
): SeasonEvent | null {
  const players = (club.players || []).filter(p => p && p.id);
  if (players.length < 11) return null;
  const budget = Math.max(0, club.budget || 0);
  const star = [...players].sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0))[0];
  const youth = players.filter(p => (p.age || 30) <= 21 && (p.potentialRating || 0) > (p.overallRating || 0));
  const scale = Math.max(50000, Math.min(2_000_000, Math.round(budget * 0.04 / 10000) * 10000));
  const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];

  const pool: SeasonEvent[] = [];

  pool.push({
    id: `ev_camp_${Date.now()}`, kind: 'camp', icon: '🏕️', title: 'عرض معسكر تدريبي خارجي',
    body: 'عرض عليك منظم معسكرات تنظيم معسكر مغلق لمدة أسبوع لرفع اللياقة وروح الفريق.',
    choices: [
      { id: 'accept', label: `قبول المعسكر (${fmt(scale)} ج.م)`, hint: 'لياقة +10 ومعنويات +5 للفريق', cost: scale, effects: { budget: -scale, squadFitness: 10, squadMorale: 5 } },
      { id: 'decline', label: 'رفض العرض', hint: 'لا شيء يتغير', effects: {} },
    ],
  });

  pool.push({
    id: `ev_friendly_${Date.now()}`, kind: 'friendly', icon: '🤝', title: 'مباراة ودية مدفوعة',
    body: 'نادٍ أجنبي يعرض مباراة ودية بمقابل مادي، لكن المباراة قد ترهق اللاعبين.',
    choices: [
      { id: 'accept', label: `لعب المباراة (+${fmt(scale)} ج.م)`, hint: 'إرهاق 3 لاعبين وفرصة إصابة 30% لكل منهم', effects: { budget: scale, randomPlayers: { count: 3, fatigue: 18, injuryChance: 0.3, injuryDays: 7 } } },
      { id: 'decline', label: 'الاعتذار', hint: 'الفريق يرتاح', effects: { squadFitness: 3 } },
    ],
  });

  pool.push({
    id: `ev_sponsor_${Date.now()}`, kind: 'sponsor', icon: '💼', title: 'راعٍ يعرض مكافأة مفاجئة',
    body: 'شركة محلية تعرض مكافأة مالية للنادي مقابل ظهور إعلاني. يمكنك قبولها أو التفاوض لطلب الضعف (مخاطرة).',
    choices: [
      { id: 'accept', label: `قبول (+${fmt(scale)} ج.م)`, hint: 'مبلغ مضمون', effects: { budget: scale } },
      { id: 'double', label: `طلب الضعف (+${fmt(scale * 2)} ج.م)`, hint: '50% نجاح، وإن فشلت تنسحب الشركة', effects: {}, gamble: { p: 0.5, win: { budget: scale * 2 }, winText: 'وافقت الشركة على الضعف!', loseText: 'انسحبت الشركة ولم يتم الاتفاق.' } },
    ],
  });

  pool.push({
    id: `ev_flu_${Date.now()}`, kind: 'flu', icon: '🤒', title: 'موجة إنفلونزا في المعسكر',
    body: 'ظهرت أعراض إنفلونزا بين بعض اللاعبين. الطبيب يقترح عزلاً وقائياً بتكلفة.',
    choices: [
      { id: 'isolate', label: `عزل وقائي (${fmt(scale * 0.5)} ج.م)`, hint: 'لا إصابات', cost: Math.round(scale * 0.5), effects: { budget: -Math.round(scale * 0.5) } },
      { id: 'ignore', label: 'تجاهل', hint: 'إصابة لاعبين لمدة 5 أيام', effects: { randomPlayers: { count: 2, injuryChance: 1, injuryDays: 5 } } },
    ],
  });

  pool.push({
    id: `ev_fans_${Date.now()}`, kind: 'fans', icon: '📣', title: 'الجماهير تطلب مبادرة',
    body: 'روابط المشجعين تطلب تخفيض أسعار التذاكر في مباراة قادمة كبادرة تقدير.',
    choices: [
      { id: 'accept', label: `الموافقة (-${fmt(scale * 0.4)} ج.م)`, hint: 'معنويات +6 وسمعتك +1', cost: Math.round(scale * 0.4), effects: { budget: -Math.round(scale * 0.4), squadMorale: 6, reputation: 1 } },
      { id: 'decline', label: 'الرفض', hint: 'معنويات -4', effects: { squadMorale: -4 } },
    ],
  });

  pool.push({
    id: `ev_press_${Date.now()}`, kind: 'press', icon: '🎙️', title: 'مقابلة تلفزيونية',
    body: 'قناة رياضية تستضيفك قبل المباراة القادمة. كيف تتحدث؟',
    choices: [
      { id: 'confident', label: 'تصريحات واثقة', hint: '60%: سمعتك +3 ومعنويات +4، وإلا سمعتك -2', effects: { reputation: -2 }, gamble: { p: 0.6, win: { reputation: 3, squadMorale: 4 }, winText: 'أعجبت تصريحاتك الجماهير والإعلام!', loseText: 'اعتُبرت تصريحاتك مبالغاً فيها.' } },
      { id: 'humble', label: 'تصريحات متواضعة', hint: 'سمعتك +1', effects: { reputation: 1 } },
    ],
  });

  if (star) {
    pool.push({
      id: `ev_star_${Date.now()}`, kind: 'star_demand', icon: '⭐', title: `${star.name} يطلب مكانة أكبر`,
      body: `نجم الفريق ${star.name} (${star.overallRating}) يشعر بأنه يستحق راتباً أعلى، ويلمّح لوكيله بإمكانية الرحيل.`,
      targetPlayerId: star.id, targetPlayerName: star.name,
      choices: [
        { id: 'raise', label: 'زيادة راتبه 15%', hint: 'معنويات +15 له وراتبه أعلى', effects: { target: { morale: 15, salaryMult: 1.15 } } },
        { id: 'refuse', label: 'الرفض بحزم', hint: 'معنوياته -15', effects: { target: { morale: -15 } } },
        { id: 'list', label: 'السماح برحيله (إدراجه للبيع)', hint: 'يُعرض في سوق الانتقالات', effects: { target: { listed: true, morale: -5 } } },
      ],
    });
  }

  if (youth.length > 0) {
    const y = pick(youth);
    pool.push({
      id: `ev_youth_${Date.now()}`, kind: 'youth_boom', icon: '🌟', title: `${y.name} يتألق في التدريبات`,
      body: `الجهاز الفني لاحظ تطوراً واضحاً للاعب الشاب ${y.name} (${y.age} عاماً).`,
      targetPlayerId: y.id, targetPlayerName: y.name,
      choices: [
        { id: 'promote', label: 'منحه دقائق لعب أكثر', hint: 'تقييمه +1 ومعنوياته +10', effects: { target: { ratingDelta: 1, morale: 10 } } },
        { id: 'keep', label: 'إبقاؤه كما هو', hint: 'لا شيء يتغير', effects: {} },
      ],
    });
  }

  const eligible = pool.filter(e => {
    const last = history.byKind[e.kind];
    if (last !== undefined && day - last < KIND_GAP_DAYS && day >= last) return false;
    const cap = SEASON_CAPS[e.kind];
    if (cap !== undefined && (history.seasonCounts[e.kind] || 0) >= cap) return false;
    if (e.targetPlayerId) {
      const lp = history.perPlayer[e.targetPlayerId];
      if (lp !== undefined && day - lp < PLAYER_GAP_DAYS && day >= lp) return false;
    }
    return true;
  });
  if (eligible.length === 0) return null;
  const chosen = pick(eligible);
  // Gambles are decided now, so closing / reopening the app cannot re-roll them.
  chosen.choices.forEach(c => { if (c.gamble) c.gamble.roll = rng(); });
  return chosen;
}

/** Records that an event fired. Resets the per-season counters when a new season starts. */
export function recordSeasonEvent(history: SeasonEventHistory, event: SeasonEvent, day: number, seasonNumber: number): SeasonEventHistory {
  const base = history.seasonNumber === seasonNumber ? history : { ...emptySeasonEventHistory(seasonNumber), byKind: history.byKind, perPlayer: history.perPlayer };
  return {
    ...base,
    seasonNumber,
    lastDay: day,
    byKind: { ...base.byKind, [event.kind]: day },
    perPlayer: event.targetPlayerId ? { ...base.perPlayer, [event.targetPlayerId]: day } : base.perPlayer,
    seasonCounts: { ...base.seasonCounts, [event.kind]: (base.seasonCounts[event.kind] || 0) + 1 },
  };
}

export interface SeasonEventOutcome {
  ok: boolean;
  club: Club;
  walletDelta: number;
  reputationDelta: number;
  message: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function resolveSeasonEvent(club: Club, event: SeasonEvent, choiceId: string, rng: () => number = Math.random): SeasonEventOutcome {
  const choice = event.choices.find(c => c.id === choiceId) || event.choices[event.choices.length - 1];
  if ((choice.cost || 0) > (club.budget || 0)) {
    return { ok: false, club, walletDelta: 0, reputationDelta: 0, message: `خزينة النادي لا تكفي لهذا القرار (يلزم ${fmt(choice.cost || 0)} ج.م).` };
  }
  let fx: SeasonEventEffects = choice.effects;
  let extra = '';
  if (choice.gamble) {
    const roll = choice.gamble.roll ?? rng();
    if (roll < choice.gamble.p) { fx = choice.gamble.win; extra = choice.gamble.winText; }
    else { extra = choice.gamble.loseText; }
  }

  let players: Player[] = (club.players || []).map(p => ({ ...p }));
  const notes: string[] = [];

  if (fx.squadMorale) players = players.map(p => ({ ...p, morale: clamp((p.morale ?? 80) + fx.squadMorale!, 0, 100) }));
  if (fx.squadFitness) players = players.map(p => ({ ...p, fitness: clamp((p.fitness ?? 90) + fx.squadFitness!, 0, 100) }));

  if (fx.target && event.targetPlayerId) {
    players = players.map(p => {
      if (p.id !== event.targetPlayerId) return p;
      const np: Player = { ...p };
      if (fx.target!.morale) np.morale = clamp((p.morale ?? 80) + fx.target!.morale!, 0, 100);
      if (fx.target!.listed) np.isListedForTransfer = true;
      if (fx.target!.salaryMult) np.salary = Math.round((p.salary || 0) * fx.target!.salaryMult!);
      if (fx.target!.ratingDelta) {
        np.overallRating = clamp((p.overallRating || 60) + fx.target!.ratingDelta!, 30, Math.max(p.potentialRating || 99, p.overallRating || 0));
        np.marketValue = syncPlayerMarketValueWithRating(np, p.overallRating);
      }
      return np;
    });
  }

  if (fx.randomPlayers) {
    const fit = players.filter(p => !(p.isInjured || (p.injury && p.injury.daysRemaining > 0)));
    const chosen = [...fit].sort(() => rng() - 0.5).slice(0, fx.randomPlayers.count).map(p => p.id);
    players = players.map(p => {
      if (!chosen.includes(p.id)) return p;
      const np: Player = { ...p };
      if (fx.randomPlayers!.fatigue) np.fatigue = clamp((p.fatigue ?? 20) + fx.randomPlayers!.fatigue!, 0, 100);
      if ((fx.randomPlayers!.injuryChance ?? 0) > 0 && rng() < fx.randomPlayers!.injuryChance!) {
        const days = fx.randomPlayers!.injuryDays || 5;
        np.isInjured = true;
        np.injury = { type: 'إصابة بسيطة', daysRemaining: days, severity: 'mild', description: 'إصابة نتجت عن حدث الموسم.' };
        notes.push(`${p.name} (${days} أيام)`);
      }
      return np;
    });
  }

  const budgetDelta = Math.round(fx.budget || 0);
  const parts: string[] = [];
  if (extra) parts.push(extra);
  if (budgetDelta) parts.push(`${budgetDelta > 0 ? '+' : '-'}${fmt(Math.abs(budgetDelta))} ج.م للخزينة`);
  if (fx.squadMorale) parts.push(`معنويات الفريق ${fx.squadMorale > 0 ? '+' : ''}${fx.squadMorale}`);
  if (fx.squadFitness) parts.push(`لياقة الفريق +${fx.squadFitness}`);
  if (fx.reputation) parts.push(`سمعتك ${fx.reputation > 0 ? '+' : ''}${fx.reputation}`);
  if (fx.target?.listed) parts.push(`${event.targetPlayerName} معروض للبيع`);
  if (fx.target?.salaryMult) parts.push(`راتب ${event.targetPlayerName} ارتفع`);
  if (fx.target?.ratingDelta) parts.push(`تقييم ${event.targetPlayerName} +${fx.target.ratingDelta}`);
  if (notes.length) parts.push(`إصابات: ${notes.join('، ')}`);

  return {
    ok: true,
    club: { ...club, players, budget: Math.max(0, (club.budget || 0) + budgetDelta) },
    walletDelta: Math.round(fx.wallet || 0),
    reputationDelta: fx.reputation || 0,
    message: parts.length ? parts.join(' • ') : 'تم تسجيل قرارك.',
  };
}
