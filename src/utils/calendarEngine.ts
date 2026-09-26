import {
  ActiveNegotiation,
  BoardSystem,
  CalendarDate,
  Club,
  DailyNewsItem,
  DayAdvanceSummary,
  Fixture,
  Player,
  PlayerAttributes,
  PlayerInjury,
  RetiredPlayer,
  SeasonInfo,
} from '../types/game';
import { resolveFullPlayerObject, evaluateAiBuyerCounter, isArabOrAfricanClub, isEuropeanEliteClub, isTopEuropeanLeague } from './transferEngine';
import { generateInitialBoardSystem as generateInitialBoardSystemFromBoardEngine } from './boardEngine';

export { generateInitialBoardSystemFromBoardEngine as generateInitialBoardSystem };

// Arabic Day and Month Names
export const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const INJURY_TYPES = [
  { name: 'إجهاد عضلي في الفخذ', minDays: 3, maxDays: 7, severity: 'mild' as const },
  { name: 'التواء خفيف في الكاحل', minDays: 6, maxDays: 12, severity: 'mild' as const },
  { name: 'تمزق عضلي في العضلة الخلفية', minDays: 14, maxDays: 24, severity: 'moderate' as const },
  { name: 'كدمة قوية في مفصل الركبة', minDays: 8, maxDays: 16, severity: 'moderate' as const },
  { name: 'كسر في إصبع القدم', minDays: 25, maxDays: 45, severity: 'severe' as const },
];

/**
 * Format a JS Date into a CalendarDate object with Arabic day & month strings.
 */
export function formatCalendarDate(date: Date, dayIndexInSeason: number = 1): CalendarDate {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  const dayOfWeek = ARABIC_DAYS[date.getDay()];
  const monthName = ARABIC_MONTHS[date.getMonth()];

  const rawDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const formattedArabic = `${dayOfWeek} ${day} ${monthName} ${year}`;

  return {
    year,
    month,
    day,
    dayOfWeek,
    rawDateStr,
    formattedArabic,
    dayIndexInSeason,
  };
}

/**
 * Normalizes any input (CalendarDate, rawDateStr, ISO string, null, undefined) into a guaranteed valid CalendarDate object.
 */
export function normalizeCalendarDate(input: any, fallbackSeasonNumber: number = 1): CalendarDate {
  if (input && typeof input === 'object') {
    if (typeof input.rawDateStr === 'string' && input.rawDateStr.includes('-')) {
      const parts = input.rawDateStr.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const date = new Date(y, m - 1, d);
          return formatCalendarDate(date, input.dayIndexInSeason || 1);
        }
      }
    }
  }

  if (typeof input === 'string' && input.includes('-')) {
    const parts = input.split('T')[0].split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]);
      const d = Number(parts[2]);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const date = new Date(y, m - 1, d);
        return formatCalendarDate(date, 1);
      }
    }
  }

  return getInitialSeasonDate(fallbackSeasonNumber);
}

/**
 * Parses rawDateStr (YYYY-MM-DD or ISO string) to JS Date defensively.
 */
export function parseDateString(rawDateStr?: string | null): Date {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return new Date(2026, 7, 9); // Fallback: 9 August 2026
  }

  const cleanStr = rawDateStr.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  const parsed = new Date(rawDateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date(2026, 7, 9);
}

/**
 * Advances the date by N days.
 */
export function addDaysToDate(rawDateStr?: string, daysToAdd: number = 1, currentDayIndex: number = 1): CalendarDate {
  const date = parseDateString(rawDateStr);
  date.setDate(date.getDate() + daysToAdd);
  return formatCalendarDate(date, Math.max(1, currentDayIndex + daysToAdd));
}

/**
 * Generates initial date for a given season.
 * Season 1 starts August 9, 2026.
 * Season 2 starts August 8, 2027, etc.
 */
export function getInitialSeasonDate(seasonNumber: number = 1): CalendarDate {
  const startYear = 2025 + seasonNumber; // Season 1 = 2026, Season 2 = 2027
  const startDate = new Date(startYear, 7, 9); // 9 August
  return formatCalendarDate(startDate, 1);
}

/**
 * Determines the scheduled date for each round of fixtures in the season.
 * Standard rounds occur weekly (7 days apart).
 * The National Cup Final (the penultimate round) is scheduled exactly 2 days before the final league round.
 */
export function getScheduledRoundDate(seasonStartDateStr?: string, roundNumber: number = 1, totalRounds: number = 44): CalendarDate {
  const startDate = parseDateString(seasonStartDateStr);
  let daysOffset: number;

  const safeRound = Math.max(1, roundNumber || 1);
  const safeTotal = Math.max(1, totalRounds || 44);

  if (safeTotal > 1 && safeRound === safeTotal - 1) {
    // Cup final is scheduled exactly 2 days before the final league round
    const finalLeagueOffset = (safeTotal - 1) * 7 + 6;
    daysOffset = Math.max(0, finalLeagueOffset - 2);
  } else {
    daysOffset = (safeRound - 1) * 7 + 6;
  }

  const matchDate = new Date(startDate);
  matchDate.setDate(startDate.getDate() + daysOffset);
  return formatCalendarDate(matchDate, daysOffset + 1);
}

/**
 * Calculate days remaining until the next match for the user's club.
 */
export function calculateDaysUntilNextMatch(
  currentDateStr?: string,
  currentRound: number = 1,
  seasonStartDateStr?: string,
  totalRounds: number = 44
): { daysRemaining: number; isMatchDay: boolean; scheduledDateStr: string; formattedScheduledDate: string } {
  const safeRound = Math.max(1, currentRound || 1);
  const safeTotal = Math.max(1, totalRounds || 44);
  const nextMatchDateObj = getScheduledRoundDate(seasonStartDateStr, safeRound, safeTotal);
  const currentDate = parseDateString(currentDateStr);
  const matchDate = parseDateString(nextMatchDateObj.rawDateStr);

  const diffTime = matchDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const daysRemaining = Math.max(0, diffDays);
  const isMatchDay = daysRemaining === 0;

  return {
    daysRemaining,
    isMatchDay,
    scheduledDateStr: nextMatchDateObj.rawDateStr,
    formattedScheduledDate: nextMatchDateObj.formattedArabic,
  };
}



/**
 * Daily Simulation: Progresses player training, recovers fatigue, handles injuries, and evolves ratings.
 */
export function simulateDailySquadTraining(
  players: Player[],
  intensity: 'recovery' | 'normal' | 'high' = 'normal',
  trainingFacilityLevel: number = 1
): {
  updatedPlayers: Player[];
  trainingReports: { playerId: string; playerName: string; changeText: string; type: 'growth' | 'fatigue' | 'boost' }[];
  injuryUpdates: { playerId: string; playerName: string; text: string; recovered?: boolean }[];
} {
  const trainingReports: { playerId: string; playerName: string; changeText: string; type: 'growth' | 'fatigue' | 'boost' }[] = [];
  const injuryUpdates: { playerId: string; playerName: string; text: string; recovered?: boolean }[] = [];

  const updatedPlayers = players.map(player => {
    let updatedPlayer = { ...player };

    // 1. Injury Progression
    if (updatedPlayer.injury) {
      const remaining = updatedPlayer.injury.daysRemaining - 1;
      if (remaining <= 0) {
        // Player fully recovered!
        injuryUpdates.push({
          playerId: updatedPlayer.id,
          playerName: updatedPlayer.name,
          text: `تعافى اللاعب ${updatedPlayer.name} تماماً من ${updatedPlayer.injury.type} وأصبح جاهزاً للمشاركة!`,
          recovered: true,
        });
        updatedPlayer.injury = null;
        updatedPlayer.fitness = Math.min(95, Math.max(80, updatedPlayer.fitness + 15));
      } else {
        updatedPlayer.injury = {
          ...updatedPlayer.injury,
          daysRemaining: remaining,
        };
        // Slowly regain slight fitness during rehab
        updatedPlayer.fitness = Math.min(80, updatedPlayer.fitness + 1);
      }
      return updatedPlayer;
    }

    // 2. Chance of fresh training injury (very low, increased on high intensity)
    const injuryChance = intensity === 'high' ? 0.008 : intensity === 'normal' ? 0.003 : 0.0005;
    if (Math.random() < injuryChance) {
      const selectedInjury = INJURY_TYPES[Math.floor(Math.random() * INJURY_TYPES.length)];
      const days = Math.floor(Math.random() * (selectedInjury.maxDays - selectedInjury.minDays + 1)) + selectedInjury.minDays;
      const injuryObj: PlayerInjury = {
        type: selectedInjury.name,
        daysRemaining: days,
        severity: selectedInjury.severity,
        description: `تعرض لإصابة (${selectedInjury.name}) خلال الحصة التدريبية وتستدعي غيابه لمدة ${days} أيام.`,
      };
      updatedPlayer.injury = injuryObj;
      updatedPlayer.fitness = Math.max(30, updatedPlayer.fitness - 25);
      injuryUpdates.push({
        playerId: updatedPlayer.id,
        playerName: updatedPlayer.name,
        text: `أصيب ${updatedPlayer.name} بـ (${selectedInjury.name}) - فترة الغياب المتوقعة: ${days} يوم.`,
        recovered: false,
      });
      return updatedPlayer;
    }

    // 3. Fitness & Fatigue Management
    let currentFatigue = updatedPlayer.fatigue ?? 20;
    let currentFitness = updatedPlayer.fitness;

    if (intensity === 'recovery') {
      currentFatigue = Math.max(0, currentFatigue - 15);
      currentFitness = Math.min(100, currentFitness + 8);
    } else if (intensity === 'normal') {
      currentFatigue = Math.min(100, Math.max(0, currentFatigue - 5));
      currentFitness = Math.min(100, currentFitness + 4);
    } else {
      // High intensity
      currentFatigue = Math.min(100, currentFatigue + 12);
      currentFitness = Math.min(100, currentFitness + 2);
    }

    updatedPlayer.fatigue = currentFatigue;
    updatedPlayer.fitness = currentFitness;

    // 4. Realistic Training Progression & Attribute-First Growth
    const age = updatedPlayer.age;
    const currentRating = updatedPlayer.overallRating;
    const potential = updatedPlayer.potentialRating || Math.min(94, currentRating + 5);

    // Hard ceiling: 98+ is practically capped, 100 cannot be reached naturally
    if (currentRating >= 96 || currentRating >= potential) {
      // Reached ceiling: maintain
      updatedPlayer.trainingProgress = 0;
      return updatedPlayer;
    }

    // Base gain per day (0.5 to 2.5 progress points towards the 100 threshold)
    let progressGain = 1.2 + (trainingFacilityLevel - 1) * 0.25;
    if (intensity === 'high') progressGain *= 1.35;
    if (intensity === 'recovery') progressGain *= 0.6;

    // Age Curves:
    // 16-20: fastest youth development (~3.0-4.0x)
    // 21-24: steady development (~1.8-2.2x)
    // 25-28: moderate development (~1.0x)
    // 29-31: rare development (~0.35x)
    // 32+: stagnation or slight decline (~0.05x)
    let ageMultiplier = 1.0;
    if (age <= 20) {
      ageMultiplier = 3.2;
    } else if (age <= 24) {
      ageMultiplier = 2.0;
    } else if (age <= 28) {
      ageMultiplier = 1.0;
    } else if (age <= 31) {
      ageMultiplier = 0.35;
    } else {
      ageMultiplier = 0.05;
      // Potential veteran physical attribute decline over time
      if (age >= 33 && Math.random() < 0.03) {
        if (updatedPlayer.attributes.pace && updatedPlayer.attributes.pace > 45) {
          updatedPlayer.attributes.pace = Math.max(40, updatedPlayer.attributes.pace - 1);
        }
      }
    }

    // Diminishing Returns based on overall rating and proximity to potential
    let ratingDampening = 1.0;
    if (currentRating >= 88) ratingDampening = 0.18;
    else if (currentRating >= 82) ratingDampening = 0.40;
    else if (currentRating >= 75) ratingDampening = 0.70;

    const headroom = Math.max(0, potential - currentRating);
    const headroomFactor = Math.min(1.0, Math.max(0.12, headroom / 10));

    // Calculate final daily progress gain
    const dailyGain = progressGain * ageMultiplier * ratingDampening * headroomFactor;
    const currentProgress = (updatedPlayer.trainingProgress ?? 0) + dailyGain;

    // Attribute-first progression
    const focus = updatedPlayer.trainingFocus || 'general';
    const attrProgress = { ...(updatedPlayer.attributeProgress || {}) };

    let targetAttr: keyof PlayerAttributes = 'passing';
    if (updatedPlayer.position === 'GK') {
      targetAttr = 'goalkeeping';
    } else if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(updatedPlayer.position)) {
      targetAttr = focus === 'fitness' ? 'physical' : focus === 'defending' ? 'defending' : 'defending';
    } else if (['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(updatedPlayer.position)) {
      targetAttr = focus === 'shooting' ? 'shooting' : focus === 'defending' ? 'defending' : 'passing';
    } else {
      targetAttr = focus === 'fitness' ? 'pace' : focus === 'passing' ? 'passing' : 'shooting';
    }

    attrProgress[targetAttr] = (attrProgress[targetAttr] || 0) + dailyGain * 1.5;
    if (attrProgress[targetAttr] >= 100) {
      attrProgress[targetAttr] -= 100;
      const currentVal = updatedPlayer.attributes[targetAttr] || 60;
      if (currentVal < 95) {
        updatedPlayer.attributes = {
          ...updatedPlayer.attributes,
          [targetAttr]: currentVal + 1,
        };
      }
    }
    updatedPlayer.attributeProgress = attrProgress;

    // Overall upgrade only when 100 threshold reached
    if (currentProgress >= 100) {
      if (updatedPlayer.overallRating < potential) {
        updatedPlayer.overallRating += 1;
        updatedPlayer.trainingProgress = Math.round((currentProgress - 100) * 10) / 10;

        const focusLabel = updatedPlayer.trainingFocus || 'العام';
        trainingReports.push({
          playerId: updatedPlayer.id,
          playerName: updatedPlayer.name,
          changeText: `تطور مستوى اللاعب ${updatedPlayer.name} بمقدار (+1) ليصل تقييمه إلى ${updatedPlayer.overallRating} بفضل التدريب ${focusLabel}!`,
          type: 'growth',
        });
      } else {
        updatedPlayer.trainingProgress = 0;
      }
    } else {
      updatedPlayer.trainingProgress = Math.round(currentProgress * 10) / 10;
    }

    return updatedPlayer;
  });

  return { updatedPlayers, trainingReports, injuryUpdates };
}

/**
 * Daily Simulation: Progresses multi-day transfer negotiations.
 */
export function simulateDailyNegotiations(
  activeNegotiations: ActiveNegotiation[],
  userClub: Club,
  allTeams: Club[],
  transferMarket: Player[] = []
): {
  updatedNegotiations: ActiveNegotiation[];
  completedTransfers: { negotiation: ActiveNegotiation; player: Player }[];
  negotiationReports: { negotiationId: string; playerName: string; text: string; stage: ActiveNegotiation['stage']; actionRequired?: boolean }[];
} {
  const completedTransfers: { negotiation: ActiveNegotiation; player: Player }[] = [];
  const negotiationReports: { negotiationId: string; playerName: string; text: string; stage: ActiveNegotiation['stage']; actionRequired?: boolean }[] = [];

  const updatedNegotiations = activeNegotiations.map(neg => {
    let current = { ...neg };

    // If already finalized or rejected, leave as is
    if (current.stage === 'completed' || current.stage === 'rejected' || current.stage === 'cancelled') {
      return current;
    }

    // Decrement wait days
    current.daysRemainingInStage = Math.max(0, current.daysRemainingInStage - 1);

    // If still waiting for another day, just return
    if (current.daysRemainingInStage > 0) {
      return current;
    }

    // --- SELLING NEGOTIATION PROGRESSION (type: 'sell') ---
    if (current.type === 'sell') {
      if (current.stage === 'club_counter') {
        const squadPlayer = (userClub?.players || []).find(p => p && p.id === current.playerId);
        const playerVal = squadPlayer?.marketValue || current.bidFee;
        const demanded = current.demandedFee || current.bidFee;
        const buyerClub = allTeams.find(t => t && t.id === current.buyerClubId);

        if (!buyerClub) {
          current.stage = 'rejected';
          current.statusMessage = 'تعثرت المفاوضات لعدم العثور على النادي المشتري.';
          current.actionRequired = false;
          return current;
        }

        const evaluation = evaluateAiBuyerCounter(
          buyerClub,
          { marketValue: playerVal, overallRating: current.playerOverall, name: current.playerName },
          demanded,
          current.bidFee
        );

        if (evaluation.accepted) {
          current.bidFee = demanded;
          current.stage = 'incoming_bid';
          current.managerHasCountered = true;
          current.counterCount = (current.counterCount || 0) + 1;
          current.daysRemainingInStage = 2;
          current.actionRequired = true;
          current.statusMessage = `وافق نادي ${current.buyerClubName} على دفع المقابل المالي المطلوب (${current.bidFee.toLocaleString()} ج.م) كعرض نهائي وحاسم. يمكنك الآن الموافقة على البيع أو الانسحاب.`;
          current.history.push({
            dateStr: new Date().toISOString().slice(0, 10),
            message: `وافق نادي ${current.buyerClubName} على دفع ${current.bidFee.toLocaleString()} ج.م (عرض نهائي).`,
            from: 'club',
          });
          negotiationReports.push({
            negotiationId: current.id,
            playerName: current.playerName,
            text: `وافق نادي ${current.buyerClubName} على دفع ${current.bidFee.toLocaleString()} ج.م لشراء ${current.playerName}! العرض نهائي وفي انتظار قرارك.`,
            stage: 'incoming_bid',
            actionRequired: true,
          });
        } else {
          current.stage = 'rejected';
          current.statusMessage = evaluation.reason;
          current.actionRequired = false;
          current.history.push({
            dateStr: new Date().toISOString().slice(0, 10),
            message: evaluation.reason,
            from: 'club',
          });
          negotiationReports.push({
            negotiationId: current.id,
            playerName: current.playerName,
            text: `رفض نادي ${current.buyerClubName} دفع ${demanded.toLocaleString()} ج.م وانسحب من مفاوضات ضم ${current.playerName}.`,
            stage: 'rejected',
            actionRequired: false,
          });
        }
      }
      return current;
    }

    // --- STAGE 1: Club Review (for buy negotiations) ---
    if (current.stage === 'club_review') {
      const isBuyingFromOtherClub = current.type === 'buy' && current.playerClubId && current.playerClubId !== userClub?.id;
      
      if (isBuyingFromOtherClub) {
        // AI Club evaluates bid
        const targetClub = allTeams.find(t => t && t.id === current.playerClubId);
        const targetPlayer = (targetClub?.players || []).find(p => p && p.id === current.playerId);
        const playerVal = targetPlayer?.marketValue || current.bidFee;

        // User intent: European stars will not leave European giants for Arab clubs
        const isTargetEuropean = isEuropeanEliteClub(targetClub) || isTopEuropeanLeague(targetClub?.leagueId) || (targetPlayer && targetPlayer.overallRating >= 80);
        const isBuyerArab = isArabOrAfricanClub(userClub);
        if (isTargetEuropean && isBuyerArab && targetPlayer) {
          const isVet = (targetPlayer.age || 25) >= 33 && userClub.leagueId === 'sau_tier_1';
          if (!isVet && (targetPlayer.overallRating >= 78 || ((targetPlayer.age || 25) <= 23 && (targetPlayer.potentialRating || 0) >= 80))) {
            current.stage = 'rejected';
            current.statusMessage = `رفض النجم العالمي ${current.playerName} وناديه ${current.playerClubName} العرض رسمياً؛ اللاعب متمسك بالبقاء في أوروبا للمنافسة على دوري الأبطال ويرفض الانتقال للدوريات العربية.`;
            current.actionRequired = false;
            negotiationReports.push({
              negotiationId: current.id,
              playerName: current.playerName,
              text: `رفض ${current.playerName} وناديه ${current.playerClubName} العرض نهائياً؛ اللاعب يرفض مغادرة الملاعب الأوروبية.`,
              stage: 'rejected',
              actionRequired: false,
            });
            return current;
          }
        }

        // If bid is >= 95% of market value: Club Approves!
        if (current.bidFee >= playerVal * 0.95) {
          current.stage = 'player_terms';
          current.daysRemainingInStage = 1;
          current.statusMessage = `وافق نادي ${current.playerClubName} على العرض المالي (${current.bidFee.toLocaleString()} ج.م). يتم الآن التفاوض مع اللاعب على الشروط الشخصية والراتب.`;
          current.history.push({
            dateStr: new Date().toISOString().slice(0, 10),
            message: `وافق نادي ${current.playerClubName} على العرض المالي.`,
            from: 'club',
          });
          negotiationReports.push({
            negotiationId: current.id,
            playerName: current.playerName,
            text: `نادي ${current.playerClubName} يقبل عرض شراء ${current.playerName}! انطلقت مفاوضات الراتب مع اللاعب.`,
            stage: 'player_terms',
            actionRequired: false,
          });
        } else if (current.bidFee >= playerVal * 0.75) {
          // Counter offer from selling club
          const counterAmount = Math.round(playerVal * 1.05);
          current.stage = 'club_counter';
          current.demandedFee = counterAmount;
          current.statusMessage = `طلب نادي ${current.playerClubName} مبلغاً أعلى قدره (${counterAmount.toLocaleString()} ج.م) للموافقة على بيع اللاعب.`;
          current.history.push({
            dateStr: new Date().toISOString().slice(0, 10),
            message: `النادي يطلب ${counterAmount.toLocaleString()} ج.م للموافقة على الصفقة.`,
            from: 'club',
          });
          negotiationReports.push({
            negotiationId: current.id,
            playerName: current.playerName,
            text: `طلب نادي ${current.playerClubName} رفع العرض إلى ${counterAmount.toLocaleString()} ج.م لضم ${current.playerName}.`,
            stage: 'club_counter',
            actionRequired: true,
          });
        } else {
          // Reject bid as too low
          current.stage = 'rejected';
          current.statusMessage = `رفض نادي ${current.playerClubName} العرض المقدم معتبراً إياه غير كافٍ ومجحفاً بقيمة اللاعب.`;
          current.history.push({
            dateStr: new Date().toISOString().slice(0, 10),
            message: 'رفض النادي العرض نهائياً.',
            from: 'club',
          });
          negotiationReports.push({
            negotiationId: current.id,
            playerName: current.playerName,
            text: `رفض نادي ${current.playerClubName} عرض ضم اللاعب ${current.playerName}.`,
            stage: 'rejected',
            actionRequired: false,
          });
        }
      } else {
        // Free agent or contract renewal: jumps directly to player terms
        current.stage = 'player_terms';
        current.daysRemainingInStage = 1;
      }
      return current;
    }

    // --- STAGE 2: Player Terms Review ---
    if (current.stage === 'player_terms') {
      const minAcceptableSalary = Math.round(current.demandedSalary || (current.playerOverall >= 75 ? 25000 : 8000));
      
      if (current.offeredSalary >= minAcceptableSalary * 0.9) {
        // Player Agrees!
        current.stage = 'completed';
        current.statusMessage = `تم الاتفاق بنجاح! وقع اللاعب ${current.playerName} عقداً رسمياً يمتد لـ ${current.contractYears} سنوات براتب شهري ${current.offeredSalary.toLocaleString()} ج.م.`;
        current.history.push({
          dateStr: new Date().toISOString().slice(0, 10),
          message: `وقع اللاعب ${current.playerName} على عقده الجديد رسمياً.`,
          from: 'player',
        });
        negotiationReports.push({
          negotiationId: current.id,
          playerName: current.playerName,
          text: `🎉 تمت الصفقة رسمياً! انضم ${current.playerName} إلى صفوف فريقك بنجاح.`,
          stage: 'completed',
          actionRequired: false,
        });

        // Reliably locate or construct player for atomic transfer
        const fullPlayer = resolveFullPlayerObject(current, allTeams, transferMarket);
        completedTransfers.push({ negotiation: current, player: fullPlayer });
      } else {
        // Player counters for higher wage
        const demand = Math.round(minAcceptableSalary * 1.15);
        current.stage = 'player_counter';
        current.demandedSalary = demand;
        current.statusMessage = `اللاعب ${current.playerName} وممثلوه يطلبون راتباً شهرياً قدره (${demand.toLocaleString()} ج.م) لإتمام التوقيع.`;
        current.history.push({
          dateStr: new Date().toISOString().slice(0, 10),
          message: `اللاعب يطلب راتباً ${demand.toLocaleString()} ج.م.`,
          from: 'player',
        });
        negotiationReports.push({
          negotiationId: current.id,
          playerName: current.playerName,
          text: `طلب ${current.playerName} راتباً شهرياً ${demand.toLocaleString()} ج.م لحسم انتقاله.`,
          stage: 'player_counter',
          actionRequired: true,
        });
      }
      return current;
    }

    return current;
  });

  return { updatedNegotiations, completedTransfers, negotiationReports };
}

/**
 * Generates dynamic world news based on daily simulation.
 */
export function generateDailyWorldNews(
  currentDateObj: CalendarDate,
  userClub: Club,
  allTeams: Club[],
  currentRound: number
): DailyNewsItem[] {
  const news: DailyNewsItem[] = [];
  const dateStr = currentDateObj?.rawDateStr || new Date().toISOString().split('T')[0];
  const safeTeams = (Array.isArray(allTeams) ? allTeams : []).filter(t => t && t.id);

  // 1. League Focus News
  if (currentRound === 1) {
    news.push({
      id: `news_r1_${Date.now()}`,
      dateStr,
      title: 'صافرة الانطلاق: موسم جديد وتحديات مشتعلة',
      content: `تنطلق اليوم الجولة الافتتاحية للموسم الكروي الجديد وسط ترقب جماهيري واسع لطموحات الأندية والصراع على بطاقات الصعود.`,
      category: 'match',
      importance: 'high',
      icon: '🏆',
    });
  } else if (currentRound % 3 === 0) {
    const randomTeam = allTeams[Math.floor(Math.random() * allTeams.length)];
    if (randomTeam) {
      news.push({
        id: `news_prep_${Date.now()}`,
        dateStr,
        title: `استعدادات مكثفة في معسكر ${randomTeam.name}`,
        content: `يواصل الجهاز الفني لنادي ${randomTeam.name} تكثيف التدريبات الخططية ورفع معدلات اللياقة البدنية لخوض المباريات القادمة.`,
        category: 'match',
        importance: 'normal',
        icon: '⚽',
      });
    }
  }

  // 2. Transfer Market Rumors
  if (Math.random() < 0.35 && safeTeams.length > 1) {
    const teamA = safeTeams[Math.floor(Math.random() * safeTeams.length)];
    const teamB = safeTeams[Math.floor(Math.random() * safeTeams.length)];
    if (teamA && teamB && teamA.id && teamB.id && teamA.id !== teamB.id && Array.isArray(teamA.players) && teamA.players.length > 0) {
      const p = teamA.players[Math.floor(Math.random() * teamA.players.length)];
      if (p) {
        news.push({
          id: `news_rumor_${Date.now()}`,
          dateStr,
          title: `أنباء عن اهتمام نادي ${teamB.name} بضم اللاعب ${p.name}`,
          content: `أشارت تقارير صحفية مطلعة إلى رغبة إدارة ${teamB.name} في التعاقد مع ${p.name} لاعب ${teamA.name} لتدعيم الخطوط في نافذة الانتقالات.`,
          category: 'transfer',
          importance: 'normal',
          icon: '🤝',
        });
      }
    }
  }

  // 3. Youth Academy Spotlight
  if (Math.random() < 0.2) {
    news.push({
      id: `news_academy_${Date.now()}`,
      dateStr,
      title: 'كشافو المواهب يشيدون ببرامج قطاعات الناشئين',
      content: `أكد خبراء التطوير الفني على تصاعد نسق المواهب الصاعدة وضرورة منح اللاعبين الشباب فرصاً منتظمة للمشاركة في الفريق الأول.`,
      category: 'youth',
      importance: 'normal',
      icon: '🌟',
    });
  }

  return news;
}

/**
 * Checks for older players retiring and builds records.
 */
export function checkSeasonRetirements(
  players: Player[],
  seasonNumber: number,
  clubName: string
): { activePlayers: Player[]; newlyRetired: RetiredPlayer[] } {
  const newlyRetired: RetiredPlayer[] = [];
  const activePlayers: Player[] = [];

  for (const player of players) {
    // Players 35+ with low contract or low fitness may retire
    const shouldRetire = player.age >= 36 || (player.age >= 34 && player.announcedRetirement);

    if (shouldRetire) {
      newlyRetired.push({
        id: `ret_${player.id}_${seasonNumber}`,
        name: player.name,
        age: player.age,
        nationality: player.nationality || 'مصر',
        position: player.position,
        finalRating: player.overallRating,
        lastClubName: clubName,
        careerGoals: player.stats?.goals || 0,
        careerAssists: player.stats?.assists || 0,
        careerAppearances: player.stats?.appearances || 0,
        trophiesWon: ['درع الدوري'],
        retirementSeason: seasonNumber,
        retirementYear: `موسم ${2025 + seasonNumber}`,
        legacyNote: `أنهى مسيرته الكروية المليئة بالعطاء والخبرة وودع الملاعب مع نادي ${clubName}.`,
      });
    } else {
      activePlayers.push(player);
    }
  }

  return { activePlayers, newlyRetired };
}
