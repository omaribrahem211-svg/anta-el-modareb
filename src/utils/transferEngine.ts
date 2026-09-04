import { ActiveNegotiation, Club, InboxMessage, Player, Position, PositionCategory, TransferHistoryEntry, TransferOffer } from '../types/game';
import { GLOBAL_LEAGUES } from '../data/leaguesData';
import { isRealClub, loadRealClubSquad, REAL_SQUADS_BY_CLUB_ID } from '../data/realPlayersData';
import { VERIFIED_REAL_PLAYERS, convertVerifiedRealPlayerToPlayer } from '../data/playersData';
import { generateClubSquad } from '../utils/playerGenerator';
import { calculateClubMonthlyIncome, calculateClubTotalMonthlyWages } from '../services/economyService';

export type PlayerTransferStatus = 
  | 'available' 
  | 'transfer_listed' 
  | 'loan_listed' 
  | 'injured' 
  | 'negotiating' 
  | 'free_agent' 
  | 'not_available';

export interface MarketPlayerItem {
  player: Player;
  club?: Club;
  clubName: string;
  leagueId: string;
  leagueName: string;
  askingPrice: number;
  loanFee?: number;
  status: PlayerTransferStatus;
  statusLabel: string;
  statusColor: string;
  isUserClubPlayer: boolean;
  canNegotiate: boolean;
}

export interface TransferNegotiationProposal {
  playerId: string;
  targetClubId?: string; // Selling club ID (or empty if free agent)
  transferFee: number;
  monthlySalary: number;
  contractYears: number;
  squadRole: 'key_player' | 'first_team' | 'rotation' | 'prospect';
  bonusPerGoal?: number;
  bonusCleanSheet?: number;
}

export interface NegotiationResult {
  decision: 'accept' | 'counter' | 'reject';
  clubApproved: boolean;
  playerApproved: boolean;
  message: string;
  counterFee?: number;
  counterSalary?: number;
  rejectionReason?: string;
}

/**
 * Calculates realistic player market valuation and wage recommendation.
 */
export function calculatePlayerFairValue(
  player: Player,
  club?: Club
): {
  fairMarketValue: number;
  minimumAcceptableFee: number;
  recommendedMonthlyWage: number;
  valuationTier: 'low' | 'medium' | 'high' | 'world_class';
} {
  const ovr = player.overallRating || 60;
  const pot = player.potentialRating || ovr;
  const age = player.age || 25;

  // Base value scale exponential by rating
  let baseValue = 10000;
  if (ovr >= 90) baseValue = 90000000;
  else if (ovr >= 85) baseValue = 45000000;
  else if (ovr >= 80) baseValue = 20000000;
  else if (ovr >= 75) baseValue = 6000000;
  else if (ovr >= 70) baseValue = 2200000;
  else if (ovr >= 65) baseValue = 750000;
  else if (ovr >= 60) baseValue = 250000;
  else if (ovr >= 55) baseValue = 85000;
  else if (ovr >= 50) baseValue = 35000;
  else baseValue = 15000;

  // Age & Potential multiplier
  let ageMultiplier = 1.0;
  if (age <= 21) {
    const potDiff = Math.max(0, pot - ovr);
    ageMultiplier = 1.25 + (potDiff * 0.05); // High potential young talent premium
  } else if (age <= 25) {
    ageMultiplier = 1.15;
  } else if (age <= 29) {
    ageMultiplier = 1.0;
  } else if (age <= 33) {
    ageMultiplier = 0.75;
  } else {
    ageMultiplier = 0.45; // Veterans discount
  }

  // Contract duration multiplier
  const contractYears = player.contractYears ?? 2;
  let contractMultiplier = 1.0;
  if (contractYears === 0) contractMultiplier = 0.0; // Free agent (no transfer fee to club)
  else if (contractYears === 1) contractMultiplier = 0.8;
  else if (contractYears >= 3) contractMultiplier = 1.15;

  const rawFairFee = Math.max(25000, Math.round(baseValue * ageMultiplier * (contractYears === 0 ? 0.75 : contractMultiplier)));
  const fairMarketValue = Math.max(25000, player.marketValue > 0 ? player.marketValue : rawFairFee);
  
  // If player is listed for transfer, minimum acceptable fee is slightly lower
  const discountFactor = player.isListedForTransfer ? 0.85 : 0.95;
  const minimumAcceptableFee = Math.max(25000, Math.round(fairMarketValue * discountFactor));

  // Recommended wage
  let baseSalary = Math.max(2500, Math.round(fairMarketValue * 0.008));
  if (player.salary > 0) {
    baseSalary = Math.max(baseSalary, player.salary);
  }

  let valuationTier: 'low' | 'medium' | 'high' | 'world_class' = 'low';
  if (ovr >= 85) valuationTier = 'world_class';
  else if (ovr >= 75) valuationTier = 'high';
  else if (ovr >= 65) valuationTier = 'medium';

  return {
    fairMarketValue,
    minimumAcceptableFee,
    recommendedMonthlyWage: baseSalary,
    valuationTier,
  };
}

/**
 * Evaluates a transfer proposal from the perspective of both the Selling Club and the Player.
 */
export function evaluateTransferOffer(
  player: Player,
  sellingClub: Club | undefined,
  proposal: TransferNegotiationProposal,
  userClub: Club,
  managerReputation = 50
): NegotiationResult {
  const isFreeAgent = !sellingClub || !player.currentClubId || player.contractYears === 0;

  // 1. STRICT FINANCIAL VALIDATION: Check User Club Available Transfer Budget & Wage Limits
  if (!isFreeAgent && userClub.budget < proposal.transferFee) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `عفواً، ميزانية ناديك الحالية (${userClub.budget.toLocaleString()} ج.م) أقل من قيمة عرض الشراء المقترح (${proposal.transferFee.toLocaleString()} ج.م)! يجب توفير سعر اللاعب أولاً.`,
    };
  }

  // 1.1 Check Wage Cap vs Club Monthly Income
  const currentClubWages = calculateClubTotalMonthlyWages(userClub);
  const monthlyClubIncome = calculateClubMonthlyIncome(userClub);
  if (currentClubWages + proposal.monthlySalary > monthlyClubIncome) {
    const remainingWageBudget = Math.max(0, monthlyClubIncome - currentClubWages);
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `لا يمكن تقديم هذا العرض! الراتب المقترح (${proposal.monthlySalary.toLocaleString()} ج.م) سيتجاوز سقف الدخل الشهري للنادي (${monthlyClubIncome.toLocaleString()} ج.م). إجمالي رواتب الفريق الحالي: ${currentClubWages.toLocaleString()} ج.م، والمتبقي لسقف الرواتب هو ${remainingWageBudget.toLocaleString()} ج.م فقط!`,
    };
  }

  // Contract duration sanity check
  if (proposal.contractYears < 1 || proposal.contractYears > 5) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: 'مدة العقد يجب أن تكون بين سنة واحدة و 5 سنوات.',
    };
  }

  const { fairMarketValue, minimumAcceptableFee, recommendedMonthlyWage } = calculatePlayerFairValue(player, sellingClub);

  // 2. REALISTIC DIVISION & REPUTATION COMPATIBILITY CHECKS
  const userDiv = userClub.division || 4;
  const userRep = userClub.reputation || 30;
  const ovr = player.overallRating || 60;
  const pot = player.potentialRating || ovr;
  const age = player.age || 25;

  // A. Tier 4 Restrictions (Semi-Pro / 4th Division)
  if (userDiv >= 4) {
    const maxAllowed = age >= 33 ? 67 : 65;
    if (ovr > maxAllowed) {
      return {
        decision: 'reject',
        clubApproved: false,
        playerApproved: false,
        message: `يرفض اللاعب ${player.name} (تقييم ${ovr}) اللعب في دوري الدرجة الرابعة رفضاً قاطعاً! اللاعب يرى أن مستواه لا يناسب دوريات الهواة ويطمح للعب في دوريات المحترفين والدرجات العليا.`,
      };
    }
  }

  // B. Tier 3 Restrictions (3rd Division)
  if (userDiv === 3) {
    const maxAllowed = age >= 33 ? 73 : 71;
    if (ovr > maxAllowed) {
      return {
        decision: 'reject',
        clubApproved: false,
        playerApproved: false,
        message: `يرى اللاعب ${player.name} (تقييم ${ovr}) أن الانتقال لدوري الدرجة الثالثة لا يناسب طموحاته ومكانته الرياضية في هذه المرحلة من مسيرته.`,
      };
    }
  }

  // C. Tier 2 Restrictions (2nd Division)
  if (userDiv === 2) {
    const maxAllowed = age >= 33 ? 79 : 77;
    if (ovr > maxAllowed) {
      return {
        decision: 'reject',
        clubApproved: false,
        playerApproved: false,
        message: `يرفض اللاعب ${player.name} (تقييم ${ovr}) الانتقال لدوري الدرجة الثانية؛ اللاعب يشترط اللعب في الدوري الممتاز والمنافسة على البطولات الكبرى.`,
      };
    }
  }

  // D. Young Prodigy Ambition Check
  if (age <= 21 && pot >= 79 && userDiv > 1) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `الموهبة الصاعدة ${player.name} ووكيل أعماله يرفضون الانتقال للدرجات الأدنى؛ اللاعب يفضل البقاء في أندية النخبة لتطوير إمكانياته الفنية العالية (إمكانية ${pot}).`,
    };
  }

  // E. Tier 1 Low Reputation vs Superstars
  if (userDiv === 1 && userRep < 65 && ovr >= 82) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `النجم العالمي ${player.name} (تقييم ${ovr}) يشترط نادياً ينافس على البطولات القارية ودوري أبطال إفريقيا/أوروبا، ويرى أن سمعة النادي الحالية غير كافية لجلبه.`,
    };
  }

  // F. Squad Role Compatibility Check
  if (ovr >= 74 && (proposal.squadRole === 'rotation' || proposal.squadRole === 'prospect')) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `يرفض اللاعب ${player.name} العرض؛ لاعب بهذا التقييم العالي (${ovr}) يشترط دوراً أساسياً لا غنى عنه في التشكيلة (Key Player / First Team) ولا يقبل بالجلوس على الدكة أو المداورة!`,
    };
  }

  // 3. EVALUATE SELLING CLUB (if not a free agent) or Signing Fee
  let clubApproved = false;
  let clubCounterFee: number | undefined = undefined;
  let clubRejectionMessage = '';

  const offeredFee = proposal.transferFee;
  if (userClub && userClub.budget < offeredFee) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `ميزانية ناديك الحالية (${userClub.budget.toLocaleString()} ج.م) لا تكفي لدفع قيمة الصفقة (${offeredFee.toLocaleString()} ج.م)!`,
    };
  }

  if (isFreeAgent) {
    if (offeredFee >= minimumAcceptableFee) {
      clubApproved = true;
    } else {
      clubApproved = true; // Free agent negotiation is primarily about contract terms and signing fee
    }
  } else {
    if (offeredFee >= minimumAcceptableFee) {
      clubApproved = true;
    } else if (offeredFee >= minimumAcceptableFee * 0.8) {
      // Counter offer from club
      clubApproved = false;
      clubCounterFee = Math.round(minimumAcceptableFee * 1.05);
      clubRejectionMessage = `النادي يرى أن العرض المالي (${offeredFee.toLocaleString()} ج.م) غير كافٍ للاستغناء عن اللاعب، ويطلب (${clubCounterFee.toLocaleString()} ج.م) لإتمام الصفقة.`;
    } else {
      // Direct rejection
      clubApproved = false;
      clubRejectionMessage = `إدارة نادي ${sellingClub?.name || 'اللاعب'} رفضت العرض رسمياً؛ المبلغ المعروض (${offeredFee.toLocaleString()} ج.م) بعيد جداً عن القيمة الحقيقية للاعب.`;
    }
  }

  // 4. EVALUATE PLAYER WAGE & CONTRACT
  let playerApproved = false;
  let playerCounterSalary: number | undefined = undefined;
  let playerRejectionMessage = '';

  const offeredSalary = proposal.monthlySalary;
  const currentSalary = player.salary || 2500;

  // Strict User Rule: Cannot offer salary less than current player salary!
  if (offeredSalary < currentSalary) {
    return {
      decision: 'reject',
      clubApproved,
      playerApproved: false,
      message: `يرفض اللاعب ${player.name} العرض لأن الراتب الشهري المقترح (${offeredSalary.toLocaleString()} ج.م) أقل من راتبه الحالي (${currentSalary.toLocaleString()} ج.م)! يجب أن يكون العرض مساوياً أو أعلى من راتبه الحالي.`,
    };
  }

  const expectedSalary = Math.max(currentSalary * 1.05, recommendedMonthlyWage);

  // Division gap adjustment
  const playerDivision = sellingClub?.division || 1;
  const divisionGap = userDiv - playerDivision;

  let divisionWageModifier = 1.0;
  if (divisionGap > 0) {
    divisionWageModifier = 1.0 + (divisionGap * 0.25);
  }

  const finalExpectedSalary = Math.round(expectedSalary * divisionWageModifier);

  if (offeredSalary >= finalExpectedSalary * 0.95) {
    playerApproved = true;
  } else if (offeredSalary >= finalExpectedSalary * 0.75) {
    playerApproved = false;
    playerCounterSalary = Math.round(finalExpectedSalary * 1.05);
    playerRejectionMessage = `اللاعب ووكيل أعماله يطلبان راتباً شهرياً لا يقل عن (${playerCounterSalary.toLocaleString()} ج.م) للموافقة على التوقيع.`;
  } else {
    playerApproved = false;
    playerRejectionMessage = `اللاعب يرفض العرض؛ الراتب المعروض (${offeredSalary.toLocaleString()} ج.م) أقل بكثير من تطلعاته المالية (المطلوب حوالي ${finalExpectedSalary.toLocaleString()} ج.م).`;
  }

  // 3. FINAL SYNTHESIS
  if (clubApproved && playerApproved) {
    return {
      decision: 'accept',
      clubApproved: true,
      playerApproved: true,
      message: `تمت الموافقة الرسمية على الصفقة! وافق نادي ${sellingClub ? sellingClub.name : 'اللاعب الحر'} واللاعب على كافة البنود والراتب (${offeredSalary.toLocaleString()} ج.م/شهر).`,
    };
  }

  if (!clubApproved && clubCounterFee) {
    return {
      decision: 'counter',
      clubApproved: false,
      playerApproved,
      message: clubRejectionMessage,
      counterFee: clubCounterFee,
      counterSalary: playerCounterSalary,
    };
  }

  if (clubApproved && !playerApproved && playerCounterSalary) {
    return {
      decision: 'counter',
      clubApproved: true,
      playerApproved: false,
      message: playerRejectionMessage,
      counterSalary: playerCounterSalary,
    };
  }

  return {
    decision: 'reject',
    clubApproved,
    playerApproved,
    message: clubRejectionMessage || playerRejectionMessage || 'تم رفض العرض من قبل الأطراف المعنية.',
  };
}

/**
 * Atomically executes a player transfer between clubs (or from free agents) ensuring Single Source of Truth.
 */
export function executeAtomicTransfer(params: {
  player: Player;
  sellingClubId?: string;
  buyingClubId: string;
  allTeams: Club[];
  transferFee: number;
  salary: number;
  contractYears: number;
  currentRound: number;
  seasonNumber: number;
}): {
  success: boolean;
  message: string;
  updatedTeams: Club[];
  transferEntry?: TransferHistoryEntry;
  inboxMessage?: InboxMessage;
} {
  const {
    player,
    sellingClubId,
    buyingClubId,
    allTeams,
    transferFee,
    salary,
    contractYears,
    currentRound,
    seasonNumber,
  } = params;

  const buyingClub = buyingClubId ? allTeams.find(t => t.id === buyingClubId) : undefined;
  const sellingClub = sellingClubId ? allTeams.find(t => t.id === sellingClubId) : undefined;

  // Financial safety check: strictly applied for both user and AI buying clubs
  if (buyingClub) {
    if (buyingClub.budget < transferFee) {
      const errorPrefix = buyingClub.isUserClub ? 'ميزانية ناديك' : `ميزانية النادي المشتري (${buyingClub.name})`;
      return {
        success: false,
        message: `${errorPrefix} (${buyingClub.budget.toLocaleString()} ج.م) لا تكفي لدفع قيمة الصفقة المطلوبة (${transferFee.toLocaleString()} ج.م)!`,
        updatedTeams: allTeams,
      };
    }

    if (buyingClub.isUserClub) {
      const currentWages = calculateClubTotalMonthlyWages(buyingClub);
      const monthlyIncome = calculateClubMonthlyIncome(buyingClub);
      if (currentWages + salary > monthlyIncome) {
        const remaining = Math.max(0, monthlyIncome - currentWages);
        return {
          success: false,
          message: `لا يمكن إتمام الصفقة! راتب اللاعب (${salary.toLocaleString()} ج.م) سيتجاوز سقف الدخل الشهري للنادي (${monthlyIncome.toLocaleString()} ج.م). إجمالي الرواتب الحالي: ${currentWages.toLocaleString()} ج.م، والمتبقي لسقف الرواتب هو ${remaining.toLocaleString()} ج.م فقط.`,
          updatedTeams: allTeams,
        };
      }

      if ((buyingClub.players || []).length >= 35) {
        return { success: false, message: 'قائمة الفريق بلغت الحد الأقصى (35 لاعباً)!', updatedTeams: allTeams };
      }
    }
  }

  const fromClubName = sellingClub ? sellingClub.name : (player.currentClubId ? 'نادي آخر' : 'لاعب حر (سوق الانتقالات)');
  const toClubName = buyingClub ? buyingClub.name : 'نادي مشتري';

  const transferredPlayer: Player = {
    ...player,
    currentClubId: buyingClub?.id || buyingClubId || 'external_club',
    currentLeagueId: buyingClub?.leagueId || '',
    salary,
    contractYears,
    isListedForTransfer: false,
    morale: Math.min(100, (player.morale || 80) + 15),
    fitness: 100,
  };

  // Update teams atomically
  const updatedTeams = allTeams.map(t => {
    // 1. Selling Club: remove player, remove from tactics lineup/bench, add transfer fee
    if (sellingClub && t.id === sellingClub.id) {
      const filteredPlayers = (t.players || []).filter(p => p.id !== player.id);
      const updatedTactics = t.tactics ? {
        ...t.tactics,
        startingPlayerIds: (t.tactics.startingPlayerIds || []).filter(id => id !== player.id),
        benchPlayerIds: (t.tactics.benchPlayerIds || []).filter(id => id !== player.id),
      } : undefined;

      return {
        ...t,
        budget: t.budget + transferFee,
        players: filteredPlayers,
        tactics: updatedTactics,
      };
    }

    // 2. Buying Club: add player and subtract transfer fee (if in league teams)
    if (buyingClub && t.id === buyingClub.id) {
      const filteredExisting = (t.players || []).filter(p => p.id !== player.id);
      return {
        ...t,
        budget: Math.max(0, t.budget - transferFee),
        players: [...filteredExisting, transferredPlayer],
      };
    }

    // 3. Other Clubs: ensure player is removed if they previously held this ID
    if (t.players && t.players.some(p => p.id === player.id) && (!sellingClub || t.id !== sellingClub.id)) {
      return {
        ...t,
        players: t.players.filter(p => p.id !== player.id),
        tactics: t.tactics ? {
          ...t.tactics,
          startingPlayerIds: (t.tactics.startingPlayerIds || []).filter(id => id !== player.id),
          benchPlayerIds: (t.tactics.benchPlayerIds || []).filter(id => id !== player.id),
        } : undefined,
      };
    }

    return t;
  });

  // Also synchronize across all external GLOBAL_LEAGUES
  Object.values(GLOBAL_LEAGUES).forEach(league => {
    if (!league.teams) return;
    league.teams.forEach(c => {
      if (c.id === sellingClubId && (!sellingClub || c.id !== sellingClub.id)) {
        c.budget = (c.budget || 0) + transferFee;
        c.players = (c.players || []).filter(p => p.id !== player.id);
        if (c.tactics) {
          c.tactics.startingPlayerIds = (c.tactics.startingPlayerIds || []).filter(id => id !== player.id);
          c.tactics.benchPlayerIds = (c.tactics.benchPlayerIds || []).filter(id => id !== player.id);
        }
      } else if (c.id !== buyingClubId && c.players && c.players.some(p => p.id === player.id)) {
        c.players = c.players.filter(p => p.id !== player.id);
        if (c.tactics) {
          c.tactics.startingPlayerIds = (c.tactics.startingPlayerIds || []).filter(id => id !== player.id);
          c.tactics.benchPlayerIds = (c.tactics.benchPlayerIds || []).filter(id => id !== player.id);
        }
      }
    });
  });

  const isUserBuying = Boolean(buyingClub?.isUserClub);
  const transferEntry: TransferHistoryEntry = {
    id: `tx_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    playerRating: player.overallRating,
    position: player.position,
    type: isUserBuying ? 'buy' : 'sell',
    fee: transferFee,
    salary,
    date: `الجولة ${currentRound}`,
    seasonNumber,
    round: currentRound,
    fromClubName,
    toClubName,
    timestamp: Date.now(),
  };

  const inboxMessage: InboxMessage = isUserBuying
    ? {
        id: `msg_trans_${Date.now()}_${player.id}`,
        title: `حسم صفقة ${player.name} بنجاح! ✍️`,
        sender: 'لجنة التعاقدات والاحتراف',
        date: `الجولة ${currentRound}`,
        type: 'transfer',
        read: false,
        content: `تم توقيع العقود رسمياً مع اللاعب ${player.name} (${player.position}) قادماً من (${fromClubName}) مقابل رسوم انتقال ${transferFee.toLocaleString()} ج.م وراتب شهري ${salary.toLocaleString()} ج.م لمدة ${contractYears} سنوات وانضم إلى قائمة الفريق.`,
      }
    : {
        id: `msg_trans_sell_${Date.now()}_${player.id}`,
        title: `إتمام بيع اللاعب ${player.name} إلى ${toClubName} 💰`,
        sender: 'إدارة التعاقدات والحسابات',
        date: `الجولة ${currentRound}`,
        type: 'transfer',
        read: false,
        content: `تمت الموافقة الرسمية على انتقال اللاعب ${player.name} إلى (${toClubName}) مقابل ${transferFee.toLocaleString()} ج.م. تم إيداع المبلغ كاملاً في الخزينة وتفريغ راتبه (${(player.salary || 0).toLocaleString()} ج.م/ش) من قائمة الأجور.`,
      };

  return {
    success: true,
    message: isUserBuying
      ? `تم التعاقد مع ${player.name} بنجاح وانضم إلى قائمة الفريق!`
      : `تم بيع اللاعب ${player.name} إلى نادي ${toClubName} بمبلغ ${transferFee.toLocaleString()} ج.م!`,
    updatedTeams,
    transferEntry,
    inboxMessage,
  };
}

/**
 * Universal helper to locate or construct a full runtime Player object for transfers and negotiations.
 */
export function resolveFullPlayerObject(
  deal: {
    playerId: string;
    playerName: string;
    playerOverall?: number;
    playerPosition?: string;
    playerAge?: number;
    offeredSalary?: number;
    contractYears?: number;
    bidFee?: number;
    squadRole?: string;
  },
  allTeams: Club[],
  transferMarket: Player[] = []
): Player {
  // 1. Search in current teams
  for (const t of allTeams) {
    const p = (t.players || []).find(x => x.id === deal.playerId);
    if (p) {
      return {
        ...p,
        salary: deal.offeredSalary || p.salary,
        contractYears: deal.contractYears || p.contractYears || 2,
        isListedForTransfer: false,
        morale: 95,
        fitness: 100,
      };
    }
  }

  // 2. Search in transfer market
  const marketPlayer = transferMarket.find(p => p.id === deal.playerId);
  if (marketPlayer) {
    return {
      ...marketPlayer,
      salary: deal.offeredSalary || marketPlayer.salary,
      contractYears: deal.contractYears || marketPlayer.contractYears || 2,
      isListedForTransfer: false,
      morale: 95,
      fitness: 100,
    };
  }

  // 3. Search in verified real players registry
  const vrp = VERIFIED_REAL_PLAYERS.find(p => p.id === deal.playerId);
  if (vrp) {
    const converted = convertVerifiedRealPlayerToPlayer(vrp);
    return {
      ...converted,
      salary: deal.offeredSalary || converted.salary,
      contractYears: deal.contractYears || converted.contractYears || 2,
      isListedForTransfer: false,
      morale: 95,
      fitness: 100,
    };
  }

  // 4. Construct complete authentic Player object from negotiation metadata
  const targetPosition = (deal.playerPosition as any) || 'CM';
  const cat: PositionCategory = targetPosition === 'GK'
    ? 'GK'
    : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(targetPosition)
    ? 'DEF'
    : ['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(targetPosition)
    ? 'MID'
    : 'FWD';
  const ovr = deal.playerOverall || 70;
  const age = deal.playerAge || 24;

  return {
    id: deal.playerId,
    name: deal.playerName,
    position: targetPosition,
    positionCategory: cat,
    age,
    overallRating: ovr,
    potentialRating: Math.min(94, ovr + (age <= 22 ? 6 : age <= 26 ? 3 : 1)),
    marketValue: deal.bidFee || ovr * 45000,
    salary: deal.offeredSalary || 8000,
    contractYears: deal.contractYears || 2,
    preferredFoot: 'right',
    personality: 'professional',
    number: Math.floor(Math.random() * 80) + 12,
    morale: 95,
    fitness: 100,
    form: 8.0,
    isListedForTransfer: false,
    trainingFocus: 'general',
    attributes: {
      pace: ovr,
      shooting: cat === 'FWD' ? ovr : Math.max(45, ovr - 10),
      passing: cat === 'MID' ? ovr : Math.max(45, ovr - 8),
      dribbling: ['MID', 'FWD'].includes(cat) ? ovr : Math.max(45, ovr - 12),
      defending: cat === 'DEF' ? ovr : Math.max(40, ovr - 15),
      physical: Math.max(50, ovr - 5),
      goalkeeping: cat === 'GK' ? ovr : 20,
    },
    stats: {
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
    },
  };
}

/**
 * Finds all AI clubs that can realistically afford and attract the target player.
 */
export function findEligibleBuyerClubs(
  targetPlayer: Player,
  allTeams: Club[],
  userClubId?: string
): { club: Club; maxAffordableFee: number }[] {
  const ovr = targetPlayer.overallRating || 60;
  const val = targetPlayer.marketValue || 50000;
  const eligible: { club: Club; maxAffordableFee: number }[] = [];

  for (const club of allTeams) {
    if (club.isUserClub || (userClubId && club.id === userClubId)) continue;
    
    const budget = club.budget || 0;
    const div = club.division || 1;
    const rep = club.reputation || 40;

    // Minimum budget threshold: Club must have at least 80% of player's market value in available liquid budget
    if (budget < val * 0.8) continue;

    // Division & Reputation compatibility constraints:
    // A weak club cannot sign a superstar regardless of budget glitches
    if (ovr >= 85) {
      if (div !== 1 || rep < 75 || budget < val) continue;
    } else if (ovr >= 80) {
      if (div !== 1 || rep < 60 || budget < val * 0.9) continue;
    } else if (ovr >= 75) {
      if (div > 2 || (div === 2 && rep < 50) || budget < val * 0.85) continue;
    } else if (ovr >= 70) {
      if (div > 3 || (div === 3 && rep < 40) || budget < val * 0.8) continue;
    } else if (ovr >= 65) {
      if (div > 3) continue;
    }

    // Maximum fee the club is willing to spend from its budget (never more than 85% of its total budget)
    const maxBudgetFee = Math.floor(budget * 0.85);
    // Maximum multiplier over market value based on reputation
    const repMultiplier = rep >= 80 ? 1.15 : rep >= 60 ? 1.10 : 1.05;
    const maxValFee = Math.round(val * repMultiplier);
    const maxAffordableFee = Math.min(maxBudgetFee, maxValFee);

    if (maxAffordableFee >= val * 0.8) {
      eligible.push({ club, maxAffordableFee });
    }
  }

  return eligible;
}

/**
 * Evaluates whether an AI buyer club accepts or rejects a manager's counter-offer.
 */
export function evaluateAiBuyerCounter(
  buyerClub: Club,
  targetPlayer: { marketValue: number; overallRating?: number; name?: string },
  demandedFee: number,
  currentBidFee: number
): {
  accepted: boolean;
  maxAcceptableFee: number;
  reason: string;
} {
  const budget = buyerClub.budget || 0;
  const val = targetPlayer.marketValue || currentBidFee;
  const rep = buyerClub.reputation || 45;

  // 1. Budget strict check: AI CANNOT spend what it does not have!
  if (demandedFee > budget) {
    return {
      accepted: false,
      maxAcceptableFee: budget,
      reason: `المبلغ المطلوب (${demandedFee.toLocaleString()} ج.م) يتجاوز كامل ميزانية نادي ${buyerClub.name} المتاحة (${budget.toLocaleString()} ج.م).`,
    };
  }

  // 2. Spending limit: AI club won't spend more than 85% of its total budget on a single transfer
  const budgetCap = Math.floor(budget * 0.85);

  // 3. Valuation ceiling: Maximum percentage over market value the AI is willing to pay
  const maxMarkup = rep >= 80 ? 1.15 : rep >= 65 ? 1.10 : 1.05;
  const valuationCap = Math.round(val * maxMarkup);

  const maxAcceptableFee = Math.min(budgetCap, valuationCap);

  if (demandedFee <= maxAcceptableFee && demandedFee <= budget) {
    return {
      accepted: true,
      maxAcceptableFee,
      reason: `وافق نادي ${buyerClub.name} على المقابل المطلوب (${demandedFee.toLocaleString()} ج.م) كعرض نهائي.`,
    };
  }

  return {
    accepted: false,
    maxAcceptableFee,
    reason: `رفض نادي ${buyerClub.name} دفع المبلغ المطلوب (${demandedFee.toLocaleString()} ج.م) واعتبره مبالغاً فيه ولا يتناسب مع ميزانيته وقيمة اللاعب السوقية (الحد الأقصى للنادي هو ${maxAcceptableFee.toLocaleString()} ج.م).`,
  };
}

/**
 * Generates realistic incoming AI bids for transfer-listed or high-performing user players during round simulation.
 */
export function generateIncomingAiBids(
  allTeams: Club[],
  userClub: Club | null,
  round: number,
  seasonNumber: number
): {
  bids: TransferOffer[];
  inboxMessages: InboxMessage[];
} {
  const bids: TransferOffer[] = [];
  const inboxMessages: InboxMessage[] = [];

  if (!userClub || !Array.isArray(userClub.players) || userClub.players.length <= 14) {
    return { bids, inboxMessages };
  }

  // Look for listed players first, or top scorers
  const candidatePlayers = userClub.players.filter(p => p.isListedForTransfer || p.overallRating >= 65 || (p.stats?.goals || 0) >= 3);

  if (candidatePlayers.length === 0) return { bids, inboxMessages };

  // 35% chance of an incoming bid on any simulated round
  if (Math.random() > 0.35) return { bids, inboxMessages };

  const targetPlayer = candidatePlayers[Math.floor(Math.random() * candidatePlayers.length)];
  const eligibleBuyers = findEligibleBuyerClubs(targetPlayer, allTeams, userClub.id);

  if (eligibleBuyers.length === 0) return { bids, inboxMessages };

  const { club: biddingClub, maxAffordableFee } = eligibleBuyers[Math.floor(Math.random() * eligibleBuyers.length)];
  
  // Calculate realistic bid amount (90% to 140% of market value, strictly capped by club budget)
  // Occasional big clubs or high demand results in lucrative bids!
  const isLucrativeRoll = Math.random() < 0.35 || targetPlayer.overallRating >= 72 || (targetPlayer.stats?.goals || 0) >= 5;
  const multiplier = targetPlayer.isListedForTransfer 
    ? (0.95 + Math.random() * 0.20) 
    : isLucrativeRoll
    ? (1.20 + Math.random() * 0.30) // Lucrative bid 120% - 150%
    : (1.00 + Math.random() * 0.15);

  const rawBidAmount = Math.round(targetPlayer.marketValue * multiplier);
  const bidAmount = Math.min(rawBidAmount, maxAffordableFee, Math.floor(biddingClub.budget * 0.85));

  if (bidAmount <= 0 || bidAmount > biddingClub.budget) return { bids, inboxMessages };

  const profitRatio = Number((bidAmount / Math.max(1, targetPlayer.marketValue)).toFixed(2));
  const isLucrative = profitRatio >= 1.15 || (biddingClub.reputation || 50) >= 80;

  const offerId = `bid_${Date.now()}_${targetPlayer.id}`;
  const offer: TransferOffer = {
    id: offerId,
    playerId: targetPlayer.id,
    player: targetPlayer,
    fromClubId: userClub.id,
    fromClubName: userClub.name,
    toClubId: biddingClub.id,
    toClubName: biddingClub.name,
    bidAmount,
    status: 'pending',
    date: `الجولة ${round}`,
  };

  bids.push(offer);

  const title = isLucrative
    ? `🔥 عرض انتقال مغرٍ جداً: نادي ${biddingClub.name} يطلب شراء ${targetPlayer.name} (${bidAmount.toLocaleString()} ج.م)!`
    : `💰 عرض شراء رسمي: نادي ${biddingClub.name} يطلب التعاقد مع ${targetPlayer.name}`;

  const content = isLucrative
    ? `تلقى النادي عرضاً مالياً مغرياً ومميزاً من نادي ${biddingClub.name} لشراء اللاعب ${targetPlayer.name} (${targetPlayer.position} - تقييم ${targetPlayer.overallRating}) بمبلغ ${bidAmount.toLocaleString()} ج.م (بفارق +${Math.round((profitRatio - 1) * 100)}% عن قيمته السوقية البالغة ${targetPlayer.marketValue.toLocaleString()} ج.م).\n\nيمثل هذا العرض فرصة استثمارية ممتازة لإنعاش خزينة النادي. يمكنك قبول العرض مباشرة أو رفضه للحفاظ على اللاعب وتجديد عقده لحمايته.`
    : `وصلنا عرض شراء رسمي من نادي ${biddingClub.name} للتعاقد مع اللاعب ${targetPlayer.name} (${targetPlayer.position} - تقييم ${targetPlayer.overallRating}) مقابل رسوم انتقال تبلغ ${bidAmount.toLocaleString()} ج.م.\n\nالقيمة السوقية الحالية: ${targetPlayer.marketValue.toLocaleString()} ج.م. يمكنك اتخاذ القرار المناسب مباشرة.`;

  const msg: InboxMessage = {
    id: `msg_bid_${Date.now()}_${targetPlayer.id}`,
    title,
    sender: `إدارة التعاقدات بنادي ${biddingClub.name}`,
    date: `الجولة ${round}`,
    type: 'offer',
    read: false,
    priority: isLucrative ? 'high' : 'normal',
    content,
    offerDetails: {
      type: 'player_bid',
      clubId: biddingClub.id,
      clubName: biddingClub.name,
      playerId: targetPlayer.id,
      playerName: targetPlayer.name,
      playerPosition: targetPlayer.position,
      playerRating: targetPlayer.overallRating,
      amount: bidAmount,
      bidId: offerId,
      isLucrative,
      profitRatio,
    },
  };

  inboxMessages.push(msg);

  return { bids, inboxMessages };
}

/**
 * Determines the current market status and human-readable badges for a player.
 */
export function getPlayerTransferStatus(
  player: Player,
  club: Club | undefined,
  activeNegotiations: ActiveNegotiation[],
  userClubId?: string
): {
  status: PlayerTransferStatus;
  statusLabel: string;
  statusColor: string;
  canNegotiate: boolean;
} {
  const isUserClubPlayer = Boolean(userClubId && (club?.id === userClubId || player.currentClubId === userClubId));
  
  // 1. In Active Negotiations
  const isNegotiating = activeNegotiations.some(
    n => n.playerId === player.id && n.stage !== 'completed' && n.stage !== 'rejected' && n.stage !== 'cancelled'
  );
  if (isNegotiating) {
    return {
      status: 'negotiating',
      statusLabel: 'قيد التفاوض',
      statusColor: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      canNegotiate: true, // Can click to view/resume negotiation
    };
  }

  // 2. Injured
  if (player.injury?.isInjured && player.injury.durationDays > 0) {
    return {
      status: 'injured',
      statusLabel: `مصاب (${player.injury.durationDays} يوم)`,
      statusColor: 'bg-red-950/80 text-red-300 border-red-600/60',
      canNegotiate: !isUserClubPlayer,
    };
  }

  // 3. User Club Player
  if (isUserClubPlayer) {
    return {
      status: 'not_available',
      statusLabel: 'لاعب فريقك',
      statusColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      canNegotiate: false,
    };
  }

  // 4. Free Agent
  const isFree = !club || !player.currentClubId || player.contractYears === 0 || (player as any).isFreeAgent;
  if (isFree) {
    return {
      status: 'free_agent',
      statusLabel: 'لاعب حر (بدون نادٍ)',
      statusColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60',
      canNegotiate: true,
    };
  }

  // 5. Loan Listed
  if ((player as any).isLoanListed) {
    return {
      status: 'loan_listed',
      statusLabel: 'معروض للإعارة',
      statusColor: 'bg-blue-950/80 text-blue-300 border-blue-600/60',
      canNegotiate: true,
    };
  }

  // 6. Transfer Listed
  if (player.isListedForTransfer) {
    return {
      status: 'transfer_listed',
      statusLabel: 'معروض للبيع',
      statusColor: 'bg-purple-950/80 text-purple-300 border-purple-600/60',
      canNegotiate: true,
    };
  }

  // 7. Regular Available
  return {
    status: 'available',
    statusLabel: 'متاح للتعاقد',
    statusColor: 'bg-slate-800 text-slate-300 border-slate-700',
    canNegotiate: true,
  };
}

/**
 * Calculates asking price and loan fee for a player.
 */
export function calculateAskingPrice(player: Player, club?: Club): { askingPrice: number; loanFee: number } {
  const baseValue = Math.max(25000, player.marketValue || 50000);
  const isFree = !club || !player.currentClubId || player.contractYears === 0;
  
  if (isFree) {
    // Free agents require signing & agency bonus fee
    const signingBonus = Math.max(25000, Math.round(baseValue * 0.75));
    return {
      askingPrice: signingBonus,
      loanFee: Math.round(baseValue * 0.05),
    };
  }

  if (player.isListedForTransfer) {
    return {
      askingPrice: Math.max(25000, Math.round(baseValue * 0.95)),
      loanFee: Math.round(baseValue * 0.08),
    };
  }

  return {
    askingPrice: Math.max(25000, Math.round(baseValue * 1.15)),
    loanFee: Math.round(baseValue * 0.12),
  };
}

// Known Real & Regional Club Names Dictionary for instant lookup and safe fallbacks
export const KNOWN_CLUB_NAMES: Record<string, { name: string; leagueId: string; leagueName: string; country: string }> = {
  // Egypt Tier 1
  'egy_t1_ahly': { name: 'الأهلي المصري', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'club_al_ahly': { name: 'الأهلي المصري', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'real_club_al_ahly': { name: 'الأهلي المصري', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_zamalek': { name: 'الزمالك', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'club_zamalek': { name: 'الزمالك', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'real_club_zamalek': { name: 'الزمالك', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_pyramids': { name: 'بيراميدز', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'club_pyramids': { name: 'بيراميدز', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'real_club_pyramids': { name: 'بيراميدز', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_future': { name: 'مودرن سبورت', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_masry': { name: 'المصري البورسعيدي', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_ittihad': { name: 'الاتحاد السكندري', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_ismaily': { name: 'الإسماعيلي', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_smoha': { name: 'سموحة', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_cleopatra': { name: 'سيراميكا كليوباترا', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_enppi': { name: 'إنبي', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_talaea': { name: 'طلائع الجيش', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_bank': { name: 'البنك الأهلي', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_farko': { name: 'فاركو', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_gouna': { name: 'الجونة', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_baladeyet': { name: 'بلدية المحلة', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_dakhleya': { name: 'الداخلية', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_arab_contractors': { name: 'المقاولون العرب', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },
  'egy_t1_zed': { name: 'زد إف سي', leagueId: 'egy_tier_1', leagueName: 'الدوري المصري الممتاز', country: 'مصر' },

  // Saudi Tier 1
  'sau_t1_hilal': { name: 'الهلال السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'real_club_al_hilal': { name: 'الهلال السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_nassr': { name: 'النصر السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'real_club_al_nassr': { name: 'النصر السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_ittihad': { name: 'الاتحاد السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'real_club_al_ittihad': { name: 'الاتحاد السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_ahli': { name: 'الأهلي السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'real_club_al_ahly_saudi': { name: 'الأهلي السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_shabab': { name: 'الشباب السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_taawoun': { name: 'التعاون', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_ettifaq': { name: 'الاتفاق', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_fateh': { name: 'الفتح', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },
  'sau_t1_qadsiah': { name: 'القادسية السعودي', leagueId: 'sau_tier_1', leagueName: 'دوري روشن السعودي', country: 'السعودية' },

  // European Giants
  'esp_t1_real_madrid': { name: 'ريال مدريد', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'real_club_real_madrid': { name: 'ريال مدريد', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'esp_t1_barcelona': { name: 'برشلونة', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'real_club_barcelona': { name: 'برشلونة', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'esp_t1_atletico': { name: 'أتلتيكو مدريد', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'real_club_atletico_madrid': { name: 'أتلتيكو مدريد', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'esp_t1_sevilla': { name: 'إشبيلية', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },
  'esp_t1_sociedad': { name: 'ريال سوسيداد', leagueId: 'esp_tier_1', leagueName: 'الدوري الإسباني (La Liga)', country: 'إسبانيا' },

  'eng_t1_man_city': { name: 'مانشستر سيتي', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'real_club_manchester_city': { name: 'مانشستر سيتي', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_liverpool': { name: 'ليفربول', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'real_club_liverpool': { name: 'ليفربول', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_arsenal': { name: 'أرسنال', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'real_club_arsenal': { name: 'أرسنال', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_man_utd': { name: 'مانشستر يونايتد', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'real_club_manchester_united': { name: 'مانشستر يونايتد', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_chelsea': { name: 'تشيلسي', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'real_club_chelsea': { name: 'تشيلسي', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_tottenham': { name: 'توتنهام هوتسبير', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_newcastle': { name: 'نيوكاسل يونايتد', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },
  'eng_t1_aston_villa': { name: 'أستون فيلا', leagueId: 'eng_tier_1', leagueName: 'الدوري الإنجليزي الممتاز (Premier League)', country: 'إنجلترا' },

  'fra_t1_psg': { name: 'باريس سان جيرمان', leagueId: 'fra_tier_1', leagueName: 'الدوري الفرنسي (Ligue 1)', country: 'فرنسا' },
  'real_club_psg': { name: 'باريس سان جيرمان', leagueId: 'fra_tier_1', leagueName: 'الدوري الفرنسي (Ligue 1)', country: 'فرنسا' },
  'fra_t1_monaco': { name: 'موناكو', leagueId: 'fra_tier_1', leagueName: 'الدوري الفرنسي (Ligue 1)', country: 'فرنسا' },
  'fra_t1_marseille': { name: 'أولمبيك مارسيليا', leagueId: 'fra_tier_1', leagueName: 'الدوري الفرنسي (Ligue 1)', country: 'فرنسا' },
  'fra_t1_lyon': { name: 'أولمبيك ليون', leagueId: 'fra_tier_1', leagueName: 'الدوري الفرنسي (Ligue 1)', country: 'فرنسا' },

  'ita_t1_inter': { name: 'إنتر ميلان', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'real_club_inter_milan': { name: 'إنتر ميلان', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'ita_t1_milan': { name: 'إيه سي ميلان', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'real_club_ac_milan': { name: 'إيه سي ميلان', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'ita_t1_juventus': { name: 'يوفنتوس', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'real_club_juventus': { name: 'يوفنتوس', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'ita_t1_napoli': { name: 'نابولي', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },
  'ita_t1_roma': { name: 'روما', leagueId: 'ita_tier_1', leagueName: 'الدوري الإيطالي (Serie A)', country: 'إيطاليا' },

  'ger_t1_bayern': { name: 'بايرن ميونخ', leagueId: 'ger_tier_1', leagueName: 'الدوري الألماني (Bundesliga)', country: 'ألمانيا' },
  'real_club_bayern_munich': { name: 'بايرن ميونخ', leagueId: 'ger_tier_1', leagueName: 'الدوري الألماني (Bundesliga)', country: 'ألمانيا' },
  'ger_t1_dortmund': { name: 'بوروسيا دورتموند', leagueId: 'ger_tier_1', leagueName: 'الدوري الألماني (Bundesliga)', country: 'ألمانيا' },
  'real_club_dortmund': { name: 'بوروسيا دورتموند', leagueId: 'ger_tier_1', leagueName: 'الدوري الألماني (Bundesliga)', country: 'ألمانيا' },
  'ger_t1_leverkusen': { name: 'باير ليفركوزن', leagueId: 'ger_tier_1', leagueName: 'الدوري الألماني (Bundesliga)', country: 'ألمانيا' },
  'ger_t1_leipzig': { name: 'لايبزيغ', leagueId: 'ger_tier_1', leagueName: 'الدوري الألماني (Bundesliga)', country: 'ألمانيا' },
};

/**
 * Universal Club Resolver to prevent any "undefined" club names across the entire platform.
 */
export function resolveClubInfo(
  clubId?: string,
  fallbackClubName?: string,
  currentTeams?: Club[]
): { clubName: string; leagueId: string; leagueName: string; club?: Club } {
  // If no clubId and no fallback name
  if (!clubId && !fallbackClubName) {
    return {
      clubName: 'وكيل حر (بدون نادٍ)',
      leagueId: '',
      leagueName: 'سوق اللاعبين الأحرار',
    };
  }

  // 1. Check current live teams
  if (currentTeams && clubId) {
    const liveClub = currentTeams.find(t => t.id === clubId);
    if (liveClub && liveClub.name) {
      const leagueDef = liveClub.leagueId ? GLOBAL_LEAGUES[liveClub.leagueId] : undefined;
      return {
        clubName: liveClub.name,
        leagueId: liveClub.leagueId || '',
        leagueName: leagueDef ? leagueDef.name : (liveClub.country || 'دوري محلي'),
        club: liveClub,
      };
    }
  }

  // 2. Check KNOWN_CLUB_NAMES dictionary
  if (clubId && KNOWN_CLUB_NAMES[clubId]) {
    const known = KNOWN_CLUB_NAMES[clubId];
    return {
      clubName: known.name,
      leagueId: known.leagueId,
      leagueName: known.leagueName,
    };
  }

  // 3. Search in all GLOBAL_LEAGUES
  if (clubId) {
    for (const [lId, lDef] of Object.entries(GLOBAL_LEAGUES)) {
      const match = (lDef.teams || []).find(t => t.id === clubId);
      if (match && match.name) {
        return {
          clubName: match.name,
          leagueId: match.leagueId || lId,
          leagueName: lDef.name,
          club: match,
        };
      }
    }
  }

  // 4. Fallback to provided fallback club name
  if (fallbackClubName && fallbackClubName.trim() !== '' && fallbackClubName !== 'undefined') {
    return {
      clubName: fallbackClubName,
      leagueId: '',
      leagueName: 'دوري تنافسي',
    };
  }

  // 5. If clubId exists but is unknown, make a clean readable label
  if (clubId) {
    const cleaned = clubId.replace(/^(real_club_|club_|egy_t[1-4]_|sau_t[1-2]_)/, '').replace(/_/g, ' ');
    const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return {
      clubName: `نادي ${capitalized}`,
      leagueId: '',
      leagueName: 'دوري منافس',
    };
  }

  return {
    clubName: 'وكيل حر (بدون نادٍ)',
    leagueId: '',
    leagueName: 'سوق اللاعبين الأحرار',
  };
}

export interface TransferRumor {
  id: string;
  headline: string;
  details: string;
  source: string;
  sourceType: 'tier1' | 'insider' | 'agent' | 'press';
  probability: number; // 0-100%
  category: 'mega_deal' | 'negotiation' | 'release_clause' | 'swap' | 'contract_dispute';
  playerName: string;
  playerOverall: number;
  playerAge: number;
  playerPosition: string;
  currentClubName: string;
  interestedClubName: string;
  estimatedFee: number;
  dateStr: string;
}

/**
 * Generates realistic dynamic speculative transfer rumors based on real and database players
 */
export function generateTransferRumors(
  allPlayers: MarketPlayerItem[],
  currentDateStr: string = 'اليوم',
  count: number = 8
): TransferRumor[] {
  if (!allPlayers || allPlayers.length === 0) return [];

  const eliteClubs = [
    'ريال مدريد',
    'برشلونة',
    'مانشستر سيتي',
    'ليفربول',
    'أرسنال',
    'باريس سان جيرمان',
    'بايرن ميونخ',
    'الهلال السعودي',
    'النصر السعودي',
    'الاتحاد السعودي',
    'الأهلي المصري',
    'الزمالك',
    'بيراميدز',
    'إنتر ميلان',
    'يوفنتوس',
    'تشيلسي',
  ];

  const sources = [
    { name: 'فابريتسيو رومانو (خبير الانتقالات)', type: 'tier1' as const },
    { name: 'صحيفة ماركا الإسبانية', type: 'press' as const },
    { name: 'شبكة سكاي سبورتس العالمية', type: 'press' as const },
    { name: 'ليكيب الفرنسية', type: 'press' as const },
    { name: 'صحيفة الرياضية السعودية', type: 'press' as const },
    { name: 'مصادر مقربة من اللاعب والوكيل', type: 'agent' as const },
    { name: 'تسريبات غرف خلع الملابس', type: 'insider' as const },
    { name: 'صحيفة الأهرام الرياضي', type: 'press' as const },
  ];

  const rumorTemplates: {
    category: TransferRumor['category'];
    headline: (p: string, from: string, to: string) => string;
    details: (p: string, from: string, to: string, fee: string) => string;
    minProb: number;
    maxProb: number;
  }[] = [
    {
      category: 'mega_deal',
      headline: (p, _, to) => `🚨 عرض قياسي وضخم: ${to} يضع اللمسات الأخيرة لحسم صفقة ${p}!`,
      details: (p, from, to, fee) => `بحسب كبار المحللين، فإن مسؤولي ${to} فتحوا خطوط اتصال رسمية لضم النجم ${p} من ${from} في صفقة تتجاوز قيمتها ${fee}. اللاعب يرحب بالفكرة.`,
      minProb: 70,
      maxProb: 92,
    },
    {
      category: 'negotiation',
      headline: (p, from, to) => `👀 مفاوضات سرية ومتقدمة بين وكيل ${p} وإدارة ${to}`,
      details: (p, from, to, fee) => `شوهد وكيل أعمال ${p} في جلسة خاصة لمناقشة البنود الشخصية وراتب اللاعب للانتقال من ${from} إلى ${to} خلال الميركاتو.`,
      minProb: 55,
      maxProb: 80,
    },
    {
      category: 'release_clause',
      headline: (p, _, to) => `⚡ كسر الشرط الجزائي: ${to} مستعد لدفع الشرط الكامل للتعاقد مع ${p}`,
      details: (p, from, to, fee) => `إدارة ${to} أبلغت ممثلي اللاعب ${p} باستعدادها لتفعيل بند كسر العقد من ${from} والبالغ ${fee} دون الدخول في مفاوضات مع ناديه.`,
      minProb: 65,
      maxProb: 88,
    },
    {
      category: 'contract_dispute',
      headline: (p, from) => `⚠️ تعثر تجديد عقد ${p} مع ${from}، وأندية كبرى تترقب الموقف!`,
      details: (p, from, to) => `اللاعب ${p} رفض العرض المالي الأخير المقدم من ${from} بسبب خلاف حول الراتب، ومسؤولو ${to} بدأوا بالفعل في استكشاف إمكانية ضمه.`,
      minProb: 40,
      maxProb: 75,
    },
    {
      category: 'swap',
      headline: (p, from, to) => `🔄 صفقة تبادلية مرتقبة: ${to} يعرض لاعباً ومبلغاً مالياً لضم ${p}`,
      details: (p, from, to, fee) => `خطة ذكية من إدارة ${to} لإقناع ${from} بالتخلي عن خدمات ${p} مقابل لاعب بديل بالإضافة إلى مبلغ مالي تكميلي يُقدر بـ ${fee}.`,
      minProb: 45,
      maxProb: 68,
    },
  ];

  // Pick suitable players (preferably prominent or good rating)
  const topPlayers = [...allPlayers]
    .filter(i => i.player && i.player.overallRating >= 65)
    .sort(() => 0.5 - Math.random())
    .slice(0, count * 2);

  const pool = topPlayers.length >= count ? topPlayers : allPlayers.slice(0, count * 2);
  const rumors: TransferRumor[] = [];

  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const item = pool[i];
    const player = item.player;
    const currentClub = item.clubName && item.clubName !== 'وكيل حر (بدون نادٍ)' ? item.clubName : 'ناديه الحالي';
    
    // Choose an interested club different from current club
    const candidateClubs = eliteClubs.filter(c => c !== currentClub);
    const interestedClub = candidateClubs[Math.floor(Math.random() * candidateClubs.length)] || 'أحد أندية القمة';

    const tpl = rumorTemplates[Math.floor(Math.random() * rumorTemplates.length)];
    const src = sources[Math.floor(Math.random() * sources.length)];
    const prob = Math.floor(Math.random() * (tpl.maxProb - tpl.minProb + 1)) + tpl.minProb;
    const fee = item.askingPrice > 0 ? `${(item.askingPrice).toLocaleString()} ج.م` : `${(player.marketValue * 1.1).toLocaleString()} ج.م`;

    rumors.push({
      id: `rumor_${player.id}_${i}_${Date.now()}`,
      headline: tpl.headline(player.name, currentClub, interestedClub),
      details: tpl.details(player.name, currentClub, interestedClub, fee),
      source: src.name,
      sourceType: src.type,
      probability: prob,
      category: tpl.category,
      playerName: player.name,
      playerOverall: player.overallRating,
      playerAge: player.age,
      playerPosition: player.position,
      currentClubName: currentClub,
      interestedClubName: interestedClub,
      estimatedFee: item.askingPrice || player.marketValue,
      dateStr: currentDateStr,
    });
  }

  return rumors;
}

// In-memory cache for generated global clubs to ensure fast retrieval
const globalClubsPlayerCache = new Map<string, Player[]>();

/**
 * Gathers all players registered across the entire game database without duplication.
 * Single Source of Truth: Integrates active universe teams, global league squads, and transfer market.
 */
export function getAllDatabasePlayers(
  currentTeams: Club[],
  transferMarket: Player[],
  activeNegotiations: ActiveNegotiation[],
  userClubId?: string
): MarketPlayerItem[] {
  const seenPlayerIds = new Set<string>();
  const seenPlayerNames = new Set<string>();
  const results: MarketPlayerItem[] = [];

  const normalizePlayerKey = (name?: string): string => {
    if (!name) return '';
    return name.trim().toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\s\-_]/g, '');
  };

  // Helper to resolve human-readable league name
  const getLeagueName = (leagueId?: string, fallbackCountry?: string): string => {
    if (!leagueId) return fallbackCountry || 'دوري محلي';
    const l = GLOBAL_LEAGUES[leagueId];
    return l ? l.name : leagueId;
  };

  // 1. Process Live Teams in Current Universe (User League & Active Teams)
  for (const club of currentTeams) {
    if (!club) continue;
    const safeClubInfo = resolveClubInfo(club.id, club.name, currentTeams);
    const clubName = safeClubInfo.clubName;
    const leagueName = getLeagueName(club.leagueId, club.country) || safeClubInfo.leagueName;
    const players = Array.isArray(club.players) ? club.players : [];

    for (const player of players) {
      if (!player || !player.id) continue;
      const normKey = normalizePlayerKey(player.name);
      if (seenPlayerIds.has(player.id) || (normKey && seenPlayerNames.has(normKey))) continue;
      seenPlayerIds.add(player.id);
      if (normKey) seenPlayerNames.add(normKey);

      const statusInfo = getPlayerTransferStatus(player, club, activeNegotiations, userClubId);
      const { askingPrice, loanFee } = calculateAskingPrice(player, club);

      results.push({
        player: {
          ...player,
          currentClubId: club.id,
        },
        club,
        clubName,
        leagueId: club.leagueId || safeClubInfo.leagueId,
        leagueName,
        askingPrice,
        loanFee,
        status: statusInfo.status,
        statusLabel: statusInfo.statusLabel,
        statusColor: statusInfo.statusColor,
        isUserClubPlayer: statusInfo.status === 'not_available' || club.id === userClubId,
        canNegotiate: statusInfo.canNegotiate,
      });
    }
  }

  // 2. Process Global Leagues & Predefined Authentic Clubs
  const currentTeamIds = new Set(currentTeams.map(t => t.id));

  for (const [leagueId, leagueDef] of Object.entries(GLOBAL_LEAGUES)) {
    const clubs = leagueDef.teams || [];

    for (const club of clubs) {
      if (!club || !club.id || currentTeamIds.has(club.id)) continue;

      const safeClubInfo = resolveClubInfo(club.id, club.name, currentTeams);
      const clubName = safeClubInfo.clubName;
      const leagueName = leagueDef.name || safeClubInfo.leagueName;

      let squad = club.players || [];
      if (squad.length === 0) {
        if (globalClubsPlayerCache.has(club.id)) {
          squad = globalClubsPlayerCache.get(club.id)!;
        } else if (isRealClub(club.id)) {
          try {
            squad = loadRealClubSquad(club.id);
            globalClubsPlayerCache.set(club.id, squad);
          } catch {
            squad = [];
          }
        } else {
          try {
            squad = generateClubSquad(
              club.id,
              club.countryCode || 'EGY',
              club.leagueId || leagueId,
              club.reputation || 50,
              (club as any).tier === 1 ? 74 : (club as any).tier === 2 ? 66 : 58
            );
            globalClubsPlayerCache.set(club.id, squad);
          } catch {
            squad = [];
          }
        }
      }

      for (const player of squad) {
        if (!player || !player.id) continue;
        const normKey = normalizePlayerKey(player.name);
        if (seenPlayerIds.has(player.id) || (normKey && seenPlayerNames.has(normKey))) continue;
        seenPlayerIds.add(player.id);
        if (normKey) seenPlayerNames.add(normKey);

        const statusInfo = getPlayerTransferStatus(player, club, activeNegotiations, userClubId);
        const { askingPrice, loanFee } = calculateAskingPrice(player, club);

        results.push({
          player: {
            ...player,
            currentClubId: club.id,
          },
          club,
          clubName,
          leagueId: club.leagueId || leagueId,
          leagueName,
          askingPrice,
          loanFee,
          status: statusInfo.status,
          statusLabel: statusInfo.statusLabel,
          statusColor: statusInfo.statusColor,
          isUserClubPlayer: club.id === userClubId,
          canNegotiate: statusInfo.canNegotiate,
        });
      }
    }
  }

  // 3. Process Free Agents & Transfer Market Listed Players
  for (const player of transferMarket) {
    if (!player || !player.id) continue;
    const normKey = normalizePlayerKey(player.name);
    if (seenPlayerIds.has(player.id) || (normKey && seenPlayerNames.has(normKey))) continue;
    seenPlayerIds.add(player.id);
    if (normKey) seenPlayerNames.add(normKey);

    const safeClubInfo = resolveClubInfo(player.currentClubId, (player as any).currentClubName, currentTeams);
    const club = safeClubInfo.club;
    const clubName = safeClubInfo.clubName;
    const leagueName = safeClubInfo.leagueName;

    const statusInfo = getPlayerTransferStatus(player, club, activeNegotiations, userClubId);
    const { askingPrice, loanFee } = calculateAskingPrice(player, club);

    results.push({
      player,
      club,
      clubName,
      leagueId: safeClubInfo.leagueId || player.currentLeagueId || '',
      leagueName,
      askingPrice,
      loanFee,
      status: statusInfo.status,
      statusLabel: statusInfo.statusLabel,
      statusColor: statusInfo.statusColor,
      isUserClubPlayer: false,
      canNegotiate: statusInfo.canNegotiate,
    });
  }

  // 4. Process Verified Real Players Registry
  for (const vrp of VERIFIED_REAL_PLAYERS) {
    if (!vrp || !vrp.id) continue;
    const normKey = normalizePlayerKey(vrp.name);
    if (seenPlayerIds.has(vrp.id) || (normKey && seenPlayerNames.has(normKey))) continue;
    seenPlayerIds.add(vrp.id);
    if (normKey) seenPlayerNames.add(normKey);

    const player = convertVerifiedRealPlayerToPlayer(vrp);
    const safeClubInfo = resolveClubInfo(vrp.clubId, vrp.clubName, currentTeams);
    const club = safeClubInfo.club;
    const clubName = safeClubInfo.clubName;
    const leagueName = getLeagueName(vrp.leagueId) || safeClubInfo.leagueName;

    const statusInfo = getPlayerTransferStatus(player, club, activeNegotiations, userClubId);
    const { askingPrice, loanFee } = calculateAskingPrice(player, club);

    results.push({
      player,
      club,
      clubName,
      leagueId: vrp.leagueId || safeClubInfo.leagueId,
      leagueName,
      askingPrice,
      loanFee,
      status: statusInfo.status,
      statusLabel: statusInfo.statusLabel,
      statusColor: statusInfo.statusColor,
      isUserClubPlayer: statusInfo.status === 'not_available' || (club && club.id === userClubId),
      canNegotiate: statusInfo.canNegotiate,
    });
  }

  return results;
}
