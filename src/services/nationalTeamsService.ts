// =========================================================================
// National Teams Service — calendar & state orchestration.
// -------------------------------------------------------------------------
// FULLY ISOLATED: pure functions over NationalTeamsState. GameContext calls
// these from additive effects; no club logic is modified. NT matches are
// batch-simulated exactly like AI club matches (constraint: no heavy sim
// load — at most a handful of NT matches per processed round).
// =========================================================================

import { Club, InboxMessage } from '../types/game';
import {
  FRIENDLY_COMPETITION_ID,
  InternationalMatch,
  InternationalTournament,
  NationalTeam,
  NationalTeamJobOffer,
  NationalTeamsState,
} from '../types/nationalTeams';
import {
  buildNationalTeams,
  getNationalTeamById,
  refreshCallUpSquad,
} from '../utils/nationalTeamsEngine';
import {
  InternationalSchedule,
  defaultAfconSchedule,
  defaultWorldCupSchedule,
  getTeamTournamentMatches,
  initInternationalTournament,
  playInternationalMatch,
  processInternationalRound,
  recomputeNationalTeamWorldRanks,
  shouldHoldAfcon,
  shouldHoldWorldCup,
} from '../utils/internationalTournamentEngine';

export const NT_MIN_REPUTATION_FOR_JOB = 50;

// ---------------------------------------------------------------------------
// Tiered NT job offers: weak national teams offer first; stronger teams offer
// as the manager's score (reputation + trophy bonus) grows. Contract ends
// after the next completed tournament so the manager can switch teams.
// ---------------------------------------------------------------------------

/** Reputation points added per trophy won (club or country) for NT offer tiers. */
export const NT_TROPHY_SCORE_BONUS = 3;

export interface NtOfferTier {
  /** Minimum manager score to receive offers from this tier. */
  minScore: number;
  /** Minimum NT rankingPoints to belong to this tier (band runs up to the tier above). */
  minRankingPoints: number;
  label: string;
}

/** Ordered strongest-first; the first tier whose minScore is met is the offer band. */
export const NT_OFFER_TIERS: NtOfferTier[] = [
  { minScore: 82, minRankingPoints: 900, label: 'منتخب من الصفوة' },
  { minScore: 72, minRankingPoints: 850, label: 'منتخب قوي' },
  { minScore: 62, minRankingPoints: 780, label: 'منتخب متوسط' },
  { minScore: NT_MIN_REPUTATION_FOR_JOB, minRankingPoints: 0, label: 'منتخب ناشئ' },
];

/** Manager score driving tiered offers: reputation plus a bonus per trophy won. */
export function managerNtScore(reputation: number, trophiesCount: number): number {
  return (reputation || 0) + NT_TROPHY_SCORE_BONUS * Math.max(0, trophiesCount || 0);
}

/** The strongest offer tier this manager qualifies for, or null below the gate. */
export function eligibleNtOfferTier(score: number): NtOfferTier | null {
  return NT_OFFER_TIERS.find(t => score >= t.minScore) || null;
}

/** Manager context needed to generate offers outside the init effect. */
export interface NtJobContext {
  reputation: number;
  trophiesCount: number;
  nationalityCode?: string;
}

/** Rounds on which friendly internationals are scheduled (international breaks). */
const FRIENDLY_ROUND_MODULO = 6;
const MAX_STORED_FRIENDLIES = 60;

export interface NtAdvanceResult {
  state: NationalTeamsState;
  messages: InboxMessage[];
}

function msg(id: string, title: string, content: string, date: string): InboxMessage {
  return {
    id,
    title,
    sender: 'الاتحاد الدولي لكرة القدم',
    date,
    type: 'news',
    read: false,
    content,
  } as InboxMessage;
}

export function createEmptyNationalTeamsState(): NationalTeamsState {
  return {
    teams: [],
    activeTournament: null,
    queuedTournament: null,
    lastTournamentSeasonByCompetition: {},
    friendlyMatches: [],
    userNationalTeamId: null,
    pendingJobOffers: [],
  };
}

function tournamentSchedule(t: InternationalTournament, totalRounds: number): InternationalSchedule {
  return t.competitionId === 'afcon' ? defaultAfconSchedule(totalRounds) : defaultWorldCupSchedule(totalRounds);
}

/**
 * Season rollover: (re)build the NT universe for the new season, refresh
 * call-up squads from current club rosters, and schedule this season's
 * international competitions. Idempotent per season.
 */
export function initNationalTeamsForSeason(
  prev: NationalTeamsState | null | undefined,
  seasonNumber: number,
  totalRounds: number,
  clubTeams: Club[],
  userNationalTeamId?: string | null
): NtAdvanceResult {
  const state: NationalTeamsState = prev && Array.isArray(prev.teams) ? { ...createEmptyNationalTeamsState(), ...prev } : createEmptyNationalTeamsState();
  if (state.initializedForSeason === seasonNumber && state.teams.length > 0) {
    return { state, messages: [] };
  }

  const messages: InboxMessage[] = [];
  let teams: NationalTeam[];
  if (state.teams.length === 0) {
    teams = buildNationalTeams(clubTeams);
    messages.push(msg(
      `nt_init_${seasonNumber}`,
      '🌍 نظام المنتخبات الوطنية متاح الآن!',
      `تم تشكيل ${teams.length} منتخباً وطنياً من أفضل اللاعبين الموجودين في اللعبة حسب الجنسية.\n` +
      `• ${teams.filter(t => !t.isStatistical).length} منتخبات بتشكيلات حقيقية من لاعبي الأندية.\n` +
      `• كأس الأمم الإفريقية كل موسمين وكأس العالم كل 4 مواسم.\n` +
      `• تدريب المنتخبات متاح من سمعة ${NT_MIN_REPUTATION_FOR_JOB}+ ويمكن الجمع بينه وبين تدريب النادي.\n` +
      `• تبدأ بعروض من منتخبات ناشئة، وكلما ربحت البطولات وصلتك عروض من منتخبات أقوى.\n` +
      `• عقدك مع أي منتخب ينتهي بعد نهاية البطولة الدولية، فتنتقل لمنتخب آخر.\n` +
      `تابع المنتخبات من شاشة "المنتخبات".`,
      `الموسم ${seasonNumber}`
    ));
  } else {
    // Refresh call-up squads from CURRENT club rosters (call-ups only).
    teams = state.teams.map(nt => refreshCallUpSquad(nt, clubTeams));
  }
  recomputeNationalTeamWorldRanks(teams);

  const userNtId = userNationalTeamId ?? state.userNationalTeamId ?? null;
  let activeTournament: InternationalTournament | null = null;
  let queuedTournament: InternationalTournament | null = null;
  const lastByComp = { ...state.lastTournamentSeasonByCompetition };

  if (shouldHoldAfcon(seasonNumber) && lastByComp.afcon !== seasonNumber) {
    activeTournament = initInternationalTournament('afcon', seasonNumber, teams, defaultAfconSchedule(totalRounds), userNtId);
    lastByComp.afcon = seasonNumber;
    const userIn = userNtId && activeTournament.participantTeamIds.includes(userNtId);
    messages.push(msg(
      `nt_afcon_draw_${seasonNumber}`,
      '🏆 قرعة كأس الأمم الإفريقية',
      `أُجريت قرعة كأس الأمم الإفريقية (الموسم ${seasonNumber}) بمشاركة ${activeTournament.participantTeamIds.length} منتخباً في ${activeTournament.groups.length} مجموعات.\n` +
      (userIn ? '🇪🇬 منتخبك يشارك في البطولة! تابع مبارياته من شاشة المنتخبات.' : 'تابع البطولة من شاشة المنتخبات.'),
      `الموسم ${seasonNumber}`
    ));
  }

  if (shouldHoldWorldCup(seasonNumber) && lastByComp.worldcup !== seasonNumber) {
    queuedTournament = initInternationalTournament('worldcup', seasonNumber, teams, defaultWorldCupSchedule(totalRounds), userNtId);
    lastByComp.worldcup = seasonNumber;
    const userIn = userNtId && queuedTournament.participantTeamIds.includes(userNtId);
    messages.push(msg(
      `nt_wc_draw_${seasonNumber}`,
      '🌍 قرعة كأس العالم',
      `أُجريت قرعة كأس العالم (الموسم ${seasonNumber}) بمشاركة أفضل ${queuedTournament.participantTeamIds.length} منتخباً في التصنيف العالمي.\n` +
      `تُقام البطولة بعد نهاية الموسم مباشرة.\n` +
      (userIn ? '🎯 منتخبك تأهل لكأس العالم!' : (userNtId ? '❌ منتخبك لم يتأهل هذه المرة (خارج أفضل 32 في التصنيف).' : 'تابع البطولة من شاشة المنتخبات.')),
      `الموسم ${seasonNumber}`
    ));
  }

  return {
    state: {
      ...state,
      teams,
      activeTournament,
      queuedTournament,
      lastTournamentSeasonByCompetition: lastByComp,
      userNationalTeamId: userNtId,
      initializedForSeason: seasonNumber,
      lastProcessedRound: 0,
      // Keep friendly history across seasons so a team's all-time record
      // (stats) always has visible matches behind it.
      friendlyMatches: (state.friendlyMatches || []).slice(0, MAX_STORED_FRIENDLIES),
      declinedOfferTeamIds: [],
      postSeasonCompletedForSeason: undefined,
    },
    messages,
  };
}

/** Pairs idle NTs for a friendly break round (each team at most once). */
function buildFriendlyRound(
  teams: NationalTeam[],
  busyTeamIds: Set<string>,
  round: number,
  seasonNumber: number
): InternationalMatch[] {
  const idle = teams
    .filter(t => !busyTeamIds.has(t.id))
    .sort((a, b) => b.rankingPoints - a.rankingPoints);
  const matches: InternationalMatch[] = [];
  for (let i = 0; i + 1 < idle.length; i += 2) {
    matches.push({
      id: `friendly_s${seasonNumber}_r${round}_${idle[i].id}_v_${idle[i + 1].id}`,
      competitionId: FRIENDLY_COMPETITION_ID,
      stage: 'friendly',
      stageName: 'مباراة ودية دولية',
      roundTrigger: round,
      homeTeamId: idle[i].id,
      awayTeamId: idle[i + 1].id,
      isPlayed: false,
    });
  }
  return matches;
}

/**
 * Advances all national-team activity up to `currentRound`. Idempotent:
 * rounds at or below state.lastProcessedRound are skipped, so React effect
 * re-runs (StrictMode double-invoke included) never double-simulate.
 */
export function advanceNationalTeamsToRound(
  prev: NationalTeamsState,
  currentRound: number,
  totalRounds: number,
  seasonNumber: number,
  clubTeams: Club[],
  jobCtx?: NtJobContext
): NtAdvanceResult {
  if (!prev || !Array.isArray(prev.teams) || prev.teams.length === 0) return { state: prev, messages: [] };
  const lastDone = prev.lastProcessedRound ?? 0;
  if (currentRound <= lastDone) return { state: prev, messages: [] };

  let state: NationalTeamsState = { ...prev, teams: prev.teams.map(t => ({ ...t, stats: { ...t.stats } })) };
  const messages: InboxMessage[] = [];

  // Promote the queued post-season tournament once its first trigger arrives
  // (the previous tournament, e.g. AFCON, stays as a completed record until then).
  if (state.queuedTournament && (!state.activeTournament || state.activeTournament.isCompleted)) {
    const firstTrigger = Math.min(...state.queuedTournament.matches.map(m => m.roundTrigger));
    if (currentRound >= firstTrigger) {
      state.activeTournament = state.queuedTournament;
      state.queuedTournament = null;
    }
  }

  for (let round = lastDone + 1; round <= currentRound; round++) {
    // 1. Tournament matches due this round
    if (state.activeTournament) {
      const t = state.activeTournament;
      const schedule = tournamentSchedule(t, totalRounds);
      const beforeIds = new Set(t.matches.filter(m => m.isPlayed).map(m => m.id));
      const res = processInternationalRound(t, round, state.teams, schedule);
      state = { ...state, activeTournament: res.tournament };
      const justPlayed = res.tournament.matches.filter(m => m.isPlayed && !beforeIds.has(m.id));
      for (const m of justPlayed) {
        messages.push(...describePlayedInternational(m, state, round));
      }
      if (res.tournament.isCompleted && !t.isCompleted) {
        messages.push(championMessage(res.tournament, state.teams, round));
        // The user's NT contract runs until the end of a tournament: end it
        // and line up the next (possibly stronger) offer.
        if (jobCtx) {
          const contract = applyTournamentContractOutcome(state, res.tournament, jobCtx, seasonNumber);
          state = contract.state;
          messages.push(...contract.messages);
        }
      }
    }

    // 2. Friendlies on break rounds (only for teams with no tournament match)
    if (round % FRIENDLY_ROUND_MODULO === 0 && round <= totalRounds) {
      const busy = new Set<string>();
      if (state.activeTournament && !state.activeTournament.isCompleted) {
        for (const m of state.activeTournament.matches) {
          if (!m.isPlayed && m.roundTrigger >= round && m.roundTrigger <= round + FRIENDLY_ROUND_MODULO - 1) {
            busy.add(m.homeTeamId);
            busy.add(m.awayTeamId);
          }
        }
      }
      const friendlies = buildFriendlyRound(state.teams, busy, round, seasonNumber);
      if (friendlies.length > 0) {
        const played = friendlies.map(f => playInternationalMatch(f, state.teams));
        const userNtId = state.userNationalTeamId;
        for (const f of played) {
          if (userNtId && (f.homeTeamId === userNtId || f.awayTeamId === userNtId)) {
            messages.push(...describePlayedInternational(f, state, round));
          }
        }
        state = {
          ...state,
          friendlyMatches: [...played, ...state.friendlyMatches].slice(0, MAX_STORED_FRIENDLIES),
        };
      }
    }
  }

  recomputeNationalTeamWorldRanks(state.teams);
  state.lastProcessedRound = currentRound;
  return { state, messages };
}

function describePlayedInternational(
  m: InternationalMatch,
  state: NationalTeamsState,
  round: number
): InboxMessage[] {
  const userNtId = state.userNationalTeamId;
  const involvesUser = userNtId && (m.homeTeamId === userNtId || m.awayTeamId === userNtId);
  if (!involvesUser) return [];
  const home = getNationalTeamById(state.teams, m.homeTeamId);
  const away = getNationalTeamById(state.teams, m.awayTeamId);
  const pens = typeof m.homePenalties === 'number'
    ? ` (${m.homePenalties}-${m.awayPenalties} ركلات ترجيح)`
    : '';
  const userWon = m.winnerTeamId === userNtId;
  const isDraw = m.homeScore === m.awayScore && !m.winnerTeamId;
  return [msg(
    `nt_res_${m.id}`,
    `${m.stage === 'friendly' ? '🤝 ودية دولية' : `🏆 ${m.stageName}`}: ${home?.flag || ''} ${home?.name || ''} ${m.homeScore} - ${m.awayScore} ${away?.name || ''} ${away?.flag || ''}`,
    `نتيجة مباراة منتخبك:\n${home?.name} ${m.homeScore} - ${m.awayScore} ${away?.name}${pens}\n` +
    (userWon ? '✅ انتصار رائع لمنتخبك!' : isDraw ? '➖ تعادل.' : '❌ هزيمة.') +
    `\nالبطولة: ${m.competitionId === 'afcon' ? 'كأس الأمم الإفريقية' : m.competitionId === 'worldcup' ? 'كأس العالم' : 'مباراة ودية'}`,
    `الجولة ${round}`
  )];
}

function championMessage(t: InternationalTournament, teams: NationalTeam[], round: number): InboxMessage {
  const winner = getNationalTeamById(teams, t.winnerTeamId);
  const runnerUp = getNationalTeamById(teams, t.runnerUpTeamId);
  const userNtId = t.userTeamId;
  const userWon = userNtId && userNtId === t.winnerTeamId;
  return msg(
    `nt_champion_${t.id}`,
    `🏆 ${winner?.flag || ''} ${winner?.name || ''} بطل ${t.name}!`,
    `توج ${winner?.name} بطلاً لـ ${t.name} (الموسم ${t.seasonNumber}) بعد الفوز على ${runnerUp?.name} في النهائي.\n` +
    (userWon ? '🎉🎉 إنجاز تاريخي! قدت منتخبك للقب! سمعتك العالمية سترتفع بقوة.' : ''),
    `الجولة ${round}`
  );
}

/**
 * Season end: force-completes any remaining post-season tournament (World
 * Cup) before season transition. Called when seasonFinished becomes true.
 */
export function completePostSeasonTournament(
  prev: NationalTeamsState,
  totalRounds: number,
  seasonNumber: number,
  clubTeams: Club[],
  jobCtx?: NtJobContext
): NtAdvanceResult {
  if (!prev || prev.postSeasonCompletedForSeason === seasonNumber) return { state: prev, messages: [] };
  let state: NationalTeamsState = { ...prev, teams: prev.teams.map(t => ({ ...t, stats: { ...t.stats } })) };
  const messages: InboxMessage[] = [];

  if (state.queuedTournament && (!state.activeTournament || state.activeTournament.isCompleted)) {
    state.activeTournament = state.queuedTournament;
    state.queuedTournament = null;
  }
  const t = state.activeTournament;
  if (t && !t.isCompleted) {
    const schedule = tournamentSchedule(t, totalRounds);
    // A very large round number makes every due match playable; each pass
    // resolves one stage (group -> R16 -> QF -> SF -> F) until completion.
    const farFutureRound = totalRounds + 1000;
    let current = t;
    let guard = 0;
    while (!current.isCompleted && ++guard < 12) {
      const res = processInternationalRound(current, farFutureRound, state.teams, schedule);
      current = res.tournament;
      if (res.playedMatches.length === 0) break;
    }
    if (current.isCompleted) {
      messages.push(championMessage(current, state.teams, totalRounds));
    }
    state = { ...state, activeTournament: current };
    if (current.isCompleted && jobCtx) {
      const contract = applyTournamentContractOutcome(state, current, jobCtx, seasonNumber);
      state = contract.state;
      messages.push(...contract.messages);
    }
  }

  recomputeNationalTeamWorldRanks(state.teams);
  state.postSeasonCompletedForSeason = seasonNumber;
  return { state, messages };
}

// ---------------------------------------------------------------------------
// Save-load helpers: player snapshots are NOT persisted (save size on weak
// devices); squads are re-selected from live club rosters after load.
// ---------------------------------------------------------------------------

export function stripNationalTeamsForSave(state: NationalTeamsState | null | undefined): NationalTeamsState | null {
  if (!state) return null;
  return {
    ...state,
    teams: (state.teams || []).map(nt => ({ ...nt, players: nt.isStatistical ? [] : [] })),
  };
}

export function rehydrateNationalTeams(state: NationalTeamsState | null | undefined, clubTeams: Club[]): NationalTeamsState | null {
  if (!state || !Array.isArray(state.teams) || state.teams.length === 0) return null;
  return {
    ...state,
    teams: state.teams.map(nt => refreshCallUpSquad(nt, clubTeams)),
  };
}

// ---------------------------------------------------------------------------
// NT job offers (stage 4 hooks live here so GameContext stays thin)
// ---------------------------------------------------------------------------

/**
 * Picks an NT that would offer the user a job, from the strongest tier the
 * manager qualifies for (weak NTs first, stronger ones as trophies pile up).
 * User's own country is preferred inside the eligible band.
 */
export function generateNationalTeamJobOffer(
  state: NationalTeamsState,
  managerReputation: number,
  managerNationalityCode: string | undefined,
  seasonNumber: number,
  trophiesCount = 0
): NationalTeamsState {
  const score = managerNtScore(managerReputation, trophiesCount);
  const tier = eligibleNtOfferTier(score);
  if (!tier) return state;
  if (state.userNationalTeamId) return state; // already manages an NT
  if ((state.pendingJobOffers || []).length > 0) return state; // one at a time

  // Eligible pool: every NT below the ceiling of the manager's tier (the next
  // tier up's floor). The strongest team in reach is picked, so offers grow
  // with the manager; home country wins ties of access.
  const tierIdx = NT_OFFER_TIERS.indexOf(tier);
  const bandCeiling = tierIdx > 0 ? NT_OFFER_TIERS[tierIdx - 1].minRankingPoints : Infinity;
  const declined = new Set(state.declinedOfferTeamIds || []);
  const candidates = [...(state.teams || [])]
    .filter(t => !t.isUserManaged
      && !declined.has(t.id)
      && t.rankingPoints < bandCeiling)
    .sort((a, b) => {
      const aHome = managerNationalityCode && a.countryCode === managerNationalityCode ? 1 : 0;
      const bHome = managerNationalityCode && b.countryCode === managerNationalityCode ? 1 : 0;
      if (aHome !== bHome) return bHome - aHome;
      return b.rankingPoints - a.rankingPoints;
    });
  const pick = candidates[0];
  if (!pick) return state;

  return {
    ...state,
    pendingJobOffers: [{
      id: `nt_offer_${seasonNumber}_${pick.id}_r${pick.worldRank}`,
      nationalTeamId: pick.id,
      nationalTeamName: pick.name,
      flag: pick.flag,
      requiredReputation: NT_MIN_REPUTATION_FOR_JOB,
      offeredSeason: seasonNumber,
      expiresAfterSeasons: 1,
    }],
  };
}

/** Inbox message announcing a new NT job offer (shared by all offer paths). */
export function describeNtJobOffer(
  offer: NationalTeamJobOffer,
  managerReputation: number,
  seasonNumber: number
): InboxMessage {
  return msg(
    `msg_${offer.id}`,
    `${offer.flag} عرض تدريب منتخب ${offer.nationalTeamName}!`,
    `بناءً على سمعتك (${managerReputation}/100)، يسعدنا أن نعرض عليك تدريب منتخب ${offer.nationalTeamName} ${offer.flag}.\n\n` +
    `• يمكنك الجمع بين تدريب المنتخب وناديك الحالي في نفس الوقت.\n` +
    `• المنتخبات لا تشترك في سوق الانتقالات — قوائم استدعاء فقط.\n` +
    `• العقد يمتد حتى نهاية البطولة الدولية القادمة، وبعدها تصلك عروض جديدة كلما ربحت البطولات.\n\n` +
    `قبول العرض متاح من شاشة المنتخبات.`,
    `الموسم ${seasonNumber}`
  );
}

/**
 * Ends the user's NT contract after a tournament completes, then immediately
 * offers the next job their (possibly boosted) score qualifies for. A manager
 * who just won the tournament is credited with the champion reward (+6 rep,
 * +1 trophy) before the next offer is picked. Idempotent: after the contract
 * ends there is no userNationalTeamId, so re-runs are no-ops.
 */
export function applyTournamentContractOutcome(
  prev: NationalTeamsState,
  completedTournament: InternationalTournament,
  jobCtx: NtJobContext,
  seasonNumber: number
): NtAdvanceResult {
  if (!prev.userNationalTeamId) return { state: prev, messages: [] };
  const team = getNationalTeamById(prev.teams, prev.userNationalTeamId);
  const teamName = team ? `${team.flag} ${team.name}` : 'منتخبك';
  const wonIt = completedTournament.winnerTeamId === prev.userNationalTeamId;
  let state: NationalTeamsState = {
    ...prev,
    userNationalTeamId: null,
    teams: prev.teams.map(t => t.id === prev.userNationalTeamId ? { ...t, isUserManaged: false } : t),
  };
  const messages: InboxMessage[] = [msg(
    `nt_contract_end_${completedTournament.id}_${prev.userNationalTeamId}`,
    `📄 انتهى عقدك مع ${teamName}`,
    `انتهى عقدك مع ${teamName} بعد نهاية ${completedTournament.name}.\n` +
    (wonIt
      ? 'رحلت وأنت بطل! إنجازك سيرفع أسهمك وستصلك عروض من منتخبات أقوى.\n'
      : 'شكراً على فترة قيادتك للمنتخب.\n') +
    'يمكنك الآن قبول عرض جديد من شاشة المنتخبات متى وصلك.',
    `الموسم ${seasonNumber}`
  )];
  const rep = jobCtx.reputation + (wonIt ? 6 : 0);
  const trophies = jobCtx.trophiesCount + (wonIt ? 1 : 0);
  const before = state.pendingJobOffers.length;
  state = generateNationalTeamJobOffer(state, rep, jobCtx.nationalityCode, seasonNumber, trophies);
  if (state.pendingJobOffers.length > before) {
    messages.push(describeNtJobOffer(state.pendingJobOffers[0], rep, seasonNumber));
  }
  return { state, messages };
}

export function acceptNationalTeamJob(state: NationalTeamsState, offerId: string): NationalTeamsState {
  const offer = (state.pendingJobOffers || []).find(o => o.id === offerId);
  if (!offer) return state;
  return {
    ...state,
    userNationalTeamId: offer.nationalTeamId,
    pendingJobOffers: [],
    teams: state.teams.map(t => t.id === offer.nationalTeamId ? { ...t, isUserManaged: true } : t),
  };
}

export function declineNationalTeamJob(state: NationalTeamsState): NationalTeamsState {
  const declinedIds = (state.pendingJobOffers || []).map(o => o.nationalTeamId);
  return {
    ...state,
    pendingJobOffers: [],
    declinedOfferTeamIds: [...new Set([...(state.declinedOfferTeamIds || []), ...declinedIds])],
  };
}

export function resignFromNationalTeam(state: NationalTeamsState): NationalTeamsState {
  if (!state.userNationalTeamId) return state;
  const resignedId = state.userNationalTeamId;
  return {
    ...state,
    userNationalTeamId: null,
    teams: state.teams.map(t => t.id === resignedId ? { ...t, isUserManaged: false } : t),
    declinedOfferTeamIds: [...new Set([...(state.declinedOfferTeamIds || []), resignedId])],
  };
}

/** Re-selects the user's NT call-up squad on demand (call-up windows). */
export function refreshUserCallUp(state: NationalTeamsState, clubTeams: Club[]): NationalTeamsState {
  if (!state.userNationalTeamId) return state;
  return {
    ...state,
    teams: state.teams.map(t => (t.id === state.userNationalTeamId ? refreshCallUpSquad(t, clubTeams) : t)),
  };
}

export { getTeamTournamentMatches };
