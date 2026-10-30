import { ActiveNegotiation, Club, InboxMessage, Player, PlayerStats, Position, PositionCategory, TransferHistoryEntry, TransferOffer } from '../types/game';
import { GLOBAL_LEAGUES, getCustomLeagues, saveCustomLeagues } from '../data/leaguesData';
import { isRealClub, loadRealClubSquad, REAL_SQUADS_BY_CLUB_ID } from '../data/realPlayersData';
import { VERIFIED_REAL_PLAYERS, convertVerifiedRealPlayerToPlayer } from '../data/playersData';
import { generateClubSquad } from '../utils/playerGenerator';
import { calculateClubMonthlyIncome, calculateClubTotalMonthlyWages, calculateRealisticSalary } from '../services/economyService';

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
 * Helper: Detects if a league ID belongs to top European competitions
 */
export function isTopEuropeanLeague(leagueId?: string): boolean {
  if (!leagueId) return false;
  return ['eng_tier_1', 'esp_tier_1', 'ita_tier_1', 'ger_tier_1', 'fra_tier_1', 'eng_tier_2', 'esp_tier_2'].includes(leagueId);
}

/**
 * Helper: Detects if a club/league belongs to the Arab / African / Middle East region
 */
export function isArabOrAfricanClub(club?: Club): boolean {
  if (!club) return false;
  const country = club.country || '';
  if (['مصر', 'المملكة العربية السعودية', 'المغرب', 'تونس', 'الجزائر', 'الإمارات العربية المتحدة', 'قطر'].includes(country)) {
    return true;
  }
  const leagueId = club.leagueId || '';
  return [
    'egy_tier_1', 'egy_tier_2', 'egy_tier_3', 'egy_tier_4',
    'sau_tier_1', 'sau_tier_2',
    'uae_tier_1', 'qat_tier_1',
    'mar_tier_1', 'tun_tier_1', 'alg_tier_1'
  ].includes(leagueId);
}

/**
 * Helper: Detects elite European clubs
 */
export function isEuropeanEliteClub(club?: Club): boolean {
  if (!club) return false;
  if (isTopEuropeanLeague(club.leagueId)) return true;
  const name = club.name || '';
  const shortName = club.shortName || '';
  const eliteKeywords = [
    'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'بايرن ميونخ',
    'أرسنال', 'باريس سان جيرمان', 'إنتر ميلان', 'يوفنتوس', 'أتلتيكو مدريد',
    'تشيلسي', 'مانشستر يونايتد', 'توتنهام', 'ميلان', 'بوروسيا دورتموند',
    'باير ليفركوزن', 'أستون فيلا', 'نيوكاسل', 'نابولي', 'روما', 'بنفيكا', 'سبورتينغ', 'بورتو'
  ];
  return eliteKeywords.some(kw => name.includes(kw) || shortName.includes(kw));
}

/**
 * Calculates the transfer purchase fee proportional to the chosen contract duration.
 * Baseline player price (100% / 3-season value, e.g., 90M) corresponds to a 3-season contract:
 * - 1 season: 1/3 of the 3-season price (e.g., 30M for a 90M player)
 * - 2 seasons: 2/3 of the 3-season price (e.g., 60M for a 90M player)
 * - 3 seasons: 3/3 (100%) of the 3-season price (e.g., 90M)
 * - 4 seasons: 4/3 of the 3-season price (e.g., 120M)
 * - 5 seasons: 5/3 of the 3-season price (e.g., 150M)
 */
export function calculateContractDurationTransferFee(
  threeSeasonBasePrice: number,
  contractYears: number,
  isFreeAgent: boolean = false
): number {
  if (isFreeAgent || threeSeasonBasePrice <= 0) return 0;
  const safeYears = Math.max(1, Math.min(5, Math.round(contractYears || 3)));
  const proRated = Math.round((threeSeasonBasePrice * safeYears) / 3);
  return Math.max(8000, proRated);
}

/**
 * Synchronizes and increases a player's marketValue to match their current overallRating
 * whenever the player is trained or upgraded.
 */
export function syncPlayerMarketValueWithRating(
  player: Player,
  previousOverallRating?: number
): number {
  const ovr = Math.max(40, Math.min(99, Math.round(player?.overallRating || 60)));
  const prevOvr = previousOverallRating !== undefined ? Math.round(previousOverallRating) : ovr;
  const ovrDelta = Math.max(0, ovr - prevOvr);
  const pot = Math.max(ovr, Math.round(player?.potentialRating || ovr));
  const age = Math.max(16, Math.min(45, Math.round(player?.age || 24)));

  // Smooth exponential benchmark curve for every single OVR point (40..99)
  let tierFloor = 15000;
  let tierCeiling = 35000;
  let tierProgress = 0;

  if (ovr >= 90) {
    tierFloor = 90000000;
    tierCeiling = 180000000;
    tierProgress = Math.min(1, (ovr - 90) / 9);
  } else if (ovr >= 85) {
    tierFloor = 45000000;
    tierCeiling = 90000000;
    tierProgress = (ovr - 85) / 5;
  } else if (ovr >= 80) {
    tierFloor = 20000000;
    tierCeiling = 45000000;
    tierProgress = (ovr - 80) / 5;
  } else if (ovr >= 75) {
    tierFloor = 6000000;
    tierCeiling = 20000000;
    tierProgress = (ovr - 75) / 5;
  } else if (ovr >= 70) {
    tierFloor = 2200000;
    tierCeiling = 6000000;
    tierProgress = (ovr - 70) / 5;
  } else if (ovr >= 65) {
    tierFloor = 750000;
    tierCeiling = 2200000;
    tierProgress = (ovr - 65) / 5;
  } else if (ovr >= 60) {
    tierFloor = 250000;
    tierCeiling = 750000;
    tierProgress = (ovr - 60) / 5;
  } else if (ovr >= 55) {
    tierFloor = 85000;
    tierCeiling = 250000;
    tierProgress = (ovr - 55) / 5;
  } else if (ovr >= 50) {
    tierFloor = 35000;
    tierCeiling = 85000;
    tierProgress = (ovr - 50) / 5;
  } else {
    tierFloor = 15000;
    tierCeiling = 35000;
    tierProgress = Math.max(0, (ovr - 40) / 10);
  }

  const interpolatedBase = tierFloor + (tierCeiling - tierFloor) * tierProgress;

  let ageMultiplier = 1.0;
  if (age <= 21) {
    const potDiff = Math.max(0, pot - ovr);
    ageMultiplier = 1.2 + potDiff * 0.04;
  } else if (age <= 25) {
    ageMultiplier = 1.12;
  } else if (age <= 29) {
    ageMultiplier = 1.0;
  } else if (age <= 33) {
    ageMultiplier = 0.8;
  } else {
    ageMultiplier = 0.55;
  }

  const benchmarkValue = Math.max(25000, Math.round((interpolatedBase * ageMultiplier) / 1000) * 1000);
  const existingMv = Math.max(0, Math.round(player?.marketValue || 0));

  if (ovrDelta > 0 && existingMv > 0) {
    // Each +1 OVR boosts market value by at least +18% compounded OR jumps to the new rating benchmark
    const compoundedBoost = Math.round((existingMv * Math.pow(1.18, ovrDelta)) / 1000) * 1000;
    return Math.max(benchmarkValue, compoundedBoost, existingMv + ovrDelta * 15000);
  }

  if (previousOverallRating !== undefined && ovrDelta === 0 && existingMv > 0) {
    // Sub-attribute upgrade before crossing next OVR integer still adds +4% value
    const attrBoost = Math.round((existingMv * 1.04) / 1000) * 1000;
    return Math.max(benchmarkValue, attrBoost, existingMv + 5000);
  }

  return Math.max(benchmarkValue, existingMv);
}

/**
 * Calculates realistic player market valuation (3-season baseline) and wage recommendation.
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
  const ovr = (player && typeof player.overallRating === 'number' && !isNaN(player.overallRating)) ? player.overallRating : 60;
  const syncedValue = syncPlayerMarketValueWithRating(player);
  const mv = (player && typeof player.marketValue === 'number' && !isNaN(player.marketValue) && player.marketValue > 0) ? player.marketValue : 0;

  // Baseline 3-season price: always reflects at least the synced rating benchmark so trained players' price matches their current rating
  const fairMarketValue = Math.max(25000, mv, syncedValue);
  const minimumAcceptableFee = fairMarketValue;

  // Recommended monthly salary
  const realisticWage = calculateRealisticSalary(ovr, {
    divisionTier: club?.division || 2,
    clubReputation: club?.reputation || 50,
  });
  const curSal = (player && typeof player.salary === 'number' && !isNaN(player.salary) && player.salary > 0) ? player.salary : 0;
  const recommendedMonthlyWage = Math.max(1500, curSal, realisticWage);

  let valuationTier: 'low' | 'medium' | 'high' | 'world_class' = 'low';
  if (ovr >= 85) valuationTier = 'world_class';
  else if (ovr >= 75) valuationTier = 'high';
  else if (ovr >= 65) valuationTier = 'medium';

  return {
    fairMarketValue,
    minimumAcceptableFee,
    recommendedMonthlyWage,
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

  // Contract duration sanity check
  if (proposal.contractYears < 1 || proposal.contractYears > 5) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: 'مدة العقد يجب أن تكون بين سنة واحدة و 5 سنوات.',
    };
  }

  const { fairMarketValue, recommendedMonthlyWage } = calculatePlayerFairValue(player, sellingClub);
  const isContractExpiredFreeAgent = isFreeAgent || (player.contractYears !== undefined && player.contractYears <= 0);
  const validYears = Math.max(1, Math.min(5, proposal.contractYears || 3));
  const proRatedTransferPrice = calculateContractDurationTransferFee(
    fairMarketValue,
    validYears,
    isContractExpiredFreeAgent
  );

  // 1. STRICT FINANCIAL VALIDATION: Check User Club Available Transfer Budget & Wage Limits
  if (!isContractExpiredFreeAgent && userClub.budget < proRatedTransferPrice) {
    return {
      decision: 'reject',
      clubApproved: false,
      playerApproved: false,
      message: `عفواً، ميزانية ناديك الحالية (${((userClub.budget || 0)).toLocaleString()} ج.م) أقل من قيمة شراء اللاعب لعقد مدته ${validYears} ${validYears === 1 ? 'موسم' : 'مواسم'} (${proRatedTransferPrice.toLocaleString()} ج.م)! يجب توفير المبلغ أولاً.`,
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
      message: `لا يمكن تقديم هذا العرض! الراتب المقترح (${((proposal.monthlySalary || 0)).toLocaleString()} ج.م) سيتجاوز سقف الدخل الشهري للنادي (${((monthlyClubIncome || 0)).toLocaleString()} ج.م). إجمالي رواتب الفريق الحالي: ${((currentClubWages || 0)).toLocaleString()} ج.م، والمتبقي لسقف الرواتب هو ${((remainingWageBudget || 0)).toLocaleString()} ج.م فقط!`,
    };
  }

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

  // G. CRITICAL USER RULE: European Stars will NEVER leave top European clubs for Arab/African leagues
  const isSellerEuropean = isEuropeanEliteClub(sellingClub) || isTopEuropeanLeague(sellingClub?.leagueId) || (sellingClub?.country && ['إنجلترا', 'إسبانيا', 'إيطاليا', 'ألمانيا', 'فرنسا'].includes(sellingClub.country));
  const isBuyerArabOrAfrican = isArabOrAfricanClub(userClub);

  if (isSellerEuropean && isBuyerArabOrAfrican) {
    if (ovr >= 78 || (age <= 32 && ovr >= 75) || (age <= 23 && pot >= 80)) {
      return {
        decision: 'reject',
        clubApproved: false,
        playerApproved: false,
        message: `يرفض النجم العالمي ${player.name} (تقييم ${ovr}) مغادرة الملاعب الأوروبية وناديه الحالي (${sellingClub?.name || 'الأوروبي'}) للانتقال إلى الدوريات العربية؛ اللاعب في أوج عطائه الكروي ويرفض بشكل قاطع مغادرة أوروبا لرغبته الثابتة في المنافسة على دوري أبطال أوروبا والبطولات القارية الكبرى.`,
      };
    }

    if (age >= 33) {
      if (userClub.leagueId !== 'sau_tier_1') {
        return {
          decision: 'reject',
          clubApproved: false,
          playerApproved: false,
          message: `يرى اللاعب ${player.name} (تقييم ${ovr}) أن الانتقال للدوري الحالي لا يناسب مكانته وتاريخه الكروي في الملاعب الأوروبية.`,
        };
      }
    }
  }

  // H. REALISTIC ELITE TRANSFERS BETWEEN BIG EUROPEAN CLUBS
  if (isSellerEuropean && !isBuyerArabOrAfrican) {
    const isSellerGiant = isEuropeanEliteClub(sellingClub) && (sellingClub?.reputation || 0) >= 88;
    const isBuyerGiant = (userClub.reputation || 0) >= 85;

    if (isSellerGiant && ovr >= 85 && !isBuyerGiant) {
      return {
        decision: 'reject',
        clubApproved: false,
        playerApproved: false,
        message: `يرفض النجم ${player.name} (تقييم ${ovr}) مغادرة نادي النخبة ${sellingClub?.name} للانتقال إلى نادٍ أقل في التصنيف القاري؛ اللاعب يشترط الانضمام فقط لفرق الصفوة الأوروبية المنافسة على دوري أبطال أوروبا.`,
      };
    }
  }

  // 3. PRO-RATED CONTRACT DURATION TRANSFER PRICE CHECK
  const clubApproved = true;
  const fixedSalary = Math.max(1000, Number(player.salary) || recommendedMonthlyWage || 2500);
  const playerApproved = validYears >= 1 && validYears <= 5;

  if (clubApproved && playerApproved) {
    const expiryWarning =
      validYears <= 2
        ? ` ⚠️ تنبيه هام: العقد لمدة ${validYears === 1 ? 'موسم واحد فقط' : 'موسمين'}؛ يجب تجديد عقد اللاعب قبل انتهاء مدته وإلا سيغادر فريقك وينتقل إلى نادٍ آخر فور انتهاء العقد!`
        : '';
    return {
      decision: 'accept',
      clubApproved: true,
      playerApproved: true,
      message: isContractExpiredFreeAgent
        ? `تمت الموافقة الرسمية! وقع اللاعب الحر ${player.name} على عقد انضمام لناديك لمدة ${validYears} ${validYears === 1 ? 'موسم' : 'مواسم'} بالراتب الشهري (${fixedSalary.toLocaleString()} ج.م) في صفقة انتقال حر.${expiryWarning}`
        : `تمت الموافقة الرسمية على الصفقة! انتقل ${player.name} بعقد لمدة ${validYears} ${validYears === 1 ? 'موسم' : 'مواسم'} بقيمة (${proRatedTransferPrice.toLocaleString()} ج.م) وراتب شهري (${fixedSalary.toLocaleString()} ج.م).${expiryWarning}`,
    };
  }

  return {
    decision: 'reject',
    clubApproved,
    playerApproved,
    message: 'تم رفض العرض لعدم استيفاء شروط التعاقد.',
  };
}

/**
 * Helper to automatically synchronize an AI club's starting 11 and bench so newly signed/transferred players
 * actively participate in matches and no departed player leaves a gap in the lineup.
 */
export function syncClubLineupAfterTransfer(club: Club, prioritizePlayerId?: string): Club {
  if (!club || !Array.isArray(club.players)) return club;
  const validPlayers = club.players.filter(p => p && p.id);
  const validIdSet = new Set(validPlayers.map(p => p.id));

  // For the user's club, only strip invalid/departed IDs and backfill if below 11 starters
  if (club.isUserClub) {
    if (!club.tactics) return club;
    const cleanStarters = (club.tactics.startingPlayerIds || []).filter(id => validIdSet.has(id));
    const starterSet = new Set(cleanStarters);
    const cleanBench = (club.tactics.benchPlayerIds || []).filter(id => validIdSet.has(id) && !starterSet.has(id));
    return {
      ...club,
      tactics: {
        ...club.tactics,
        startingPlayerIds: cleanStarters,
        benchPlayerIds: cleanBench,
      },
    };
  }

  // For AI clubs, build an active 11-player starting lineup + 7-player bench, ensuring prioritizePlayerId plays!
  const sortedByRating = [...validPlayers].sort((a, b) => {
    if (prioritizePlayerId) {
      if (a.id === prioritizePlayerId) return -1;
      if (b.id === prioritizePlayerId) return 1;
    }
    return (b.overallRating || 60) - (a.overallRating || 60);
  });

  const gks = sortedByRating.filter(p => p.position === 'GK' || p.positionCategory === 'GK');
  const nonGks = sortedByRating.filter(p => p.position !== 'GK' && p.positionCategory !== 'GK');

  const startingIds: string[] = [];
  if (gks.length > 0) {
    startingIds.push(gks[0].id);
  }
  for (const p of nonGks) {
    if (startingIds.length >= 11) break;
    if (!startingIds.includes(p.id)) {
      startingIds.push(p.id);
    }
  }
  // If still fewer than 11 (e.g. extra GKs needed), fill from remaining
  for (const p of sortedByRating) {
    if (startingIds.length >= 11) break;
    if (!startingIds.includes(p.id)) {
      startingIds.push(p.id);
    }
  }

  const starterSet = new Set(startingIds);
  const benchIds = sortedByRating
    .filter(p => !starterSet.has(p.id))
    .slice(0, 7)
    .map(p => p.id);

  const currentTactics: any = club.tactics || {
    formation: '4-3-3',
    mentality: 'balanced',
    passingStyle: 'mixed',
    tempo: 'normal',
    pressing: 'medium',
    marking: 'zonal',
    counterAttack: true,
    offsideTrap: false,
    startingPlayerIds: [],
    benchPlayerIds: [],
  };

  return {
    ...club,
    tactics: {
      ...currentTactics,
      startingPlayerIds: startingIds,
      benchPlayerIds: benchIds,
      captainId: currentTactics.captainId && validIdSet.has(currentTactics.captainId)
        ? currentTactics.captainId
        : (startingIds[0] || ''),
    },
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

  const buyingClub = buyingClubId ? allTeams.find(t => t && t.id === buyingClubId) : undefined;
  const sellingClub = sellingClubId ? allTeams.find(t => t && t.id === sellingClubId) : undefined;

  if (!player || !player.id) {
    return {
      success: false,
      message: 'بيانات اللاعب غير متوفرة لإتمام الانتقال!',
      updatedTeams: allTeams,
    };
  }

  // Prevent buying club from buying its own player
  if (buyingClubId && sellingClubId && buyingClubId === sellingClubId) {
    return {
      success: false,
      message: 'اللاعب موجود بالفعل في صفوف هذا النادي!',
      updatedTeams: allTeams,
    };
  }
  if (buyingClub && (buyingClub.players || []).some(p => p && p.id === player.id)) {
    return {
      success: false,
      message: 'اللاعب متواجد بالفعل ضمن قائمة النادي!',
      updatedTeams: allTeams,
    };
  }

  // Financial safety check: strictly applied for both user and AI buying clubs when transferFee > 0
  if (buyingClub) {
    const clubBudget = buyingClub.budget || 0;
    if (transferFee > 0 && clubBudget < transferFee) {
      const errorPrefix = buyingClub.isUserClub ? 'ميزانية ناديك' : `ميزانية النادي المشتري (${buyingClub.name})`;
      return {
        success: false,
        message: `${errorPrefix} (${clubBudget.toLocaleString()} ج.م) لا تكفي لدفع قيمة الصفقة المطلوبة (${transferFee.toLocaleString()} ج.م)!`,
        updatedTeams: allTeams,
      };
    }

    if (buyingClub.isUserClub) {
      if ((buyingClub.players || []).length >= 35) {
        return { success: false, message: 'قائمة الفريق بلغت الحد الأقصى (35 لاعباً)! قم ببيع أو تسريح لاعبين أولاً.', updatedTeams: allTeams };
      }
    }
  }

  const fromClubName = sellingClub ? sellingClub.name : (player.currentClubId ? 'نادي آخر' : 'لاعب حر (سوق الانتقالات)');
  let toClubName = buyingClub ? buyingClub.name : 'نادي مشتري';

  // Synchronize across all external GLOBAL_LEAGUES and custom leagues first to resolve external club name if needed
  const customLeagues = getCustomLeagues();
  let customLeaguesModified = false;

  Object.values(customLeagues).forEach(league => {
    if (!league.teams) return;
    let leagueModified = false;
    league.teams.forEach(c => {
      // 1. External Selling Club: remove player and credit fee
      if (sellingClubId && c.id === sellingClubId && (!sellingClub || c.id !== sellingClub.id)) {
        c.budget = (c.budget || 0) + transferFee;
        c.players = (c.players || []).filter(p => p && p.id !== player.id);
        if (c.tactics) {
          c.tactics.startingPlayerIds = (c.tactics.startingPlayerIds || []).filter(id => id && id !== player.id);
          c.tactics.benchPlayerIds = (c.tactics.benchPlayerIds || []).filter(id => id && id !== player.id);
        }
        leagueModified = true;
      }
      // 2. External Buying Club: add player and debit fee
      else if (c.id === buyingClubId && (!buyingClub || c.id !== buyingClub.id)) {
        toClubName = c.name;
        c.budget = Math.max(0, (c.budget || 0) - transferFee);
        const filtered = (c.players || []).filter(p => p && p.id !== player.id);
        c.players = [...filtered, {
          ...player,
          currentClubId: c.id,
          currentLeagueId: league.id || c.leagueId || '',
          salary,
          contractYears,
          isListedForTransfer: false,
          morale: Math.min(100, (player.morale || 80) + 15),
          fitness: 100,
        }];
        leagueModified = true;
      }
      // 3. Cleanup duplicate player instances across all external clubs
      else if (c.id !== buyingClubId && c.players && c.players.some(p => p && p.id === player.id)) {
        c.players = c.players.filter(p => p && p.id !== player.id);
        if (c.tactics) {
          c.tactics.startingPlayerIds = (c.tactics.startingPlayerIds || []).filter(id => id && id !== player.id);
          c.tactics.benchPlayerIds = (c.tactics.benchPlayerIds || []).filter(id => id && id !== player.id);
        }
        leagueModified = true;
      }
    });

    if (leagueModified) {
      customLeaguesModified = true;
      if (GLOBAL_LEAGUES[league.id]) {
        GLOBAL_LEAGUES[league.id].teams = league.teams;
      }
    }
  });

  if (customLeaguesModified) {
    saveCustomLeagues(customLeagues);
  }

  const fallbackStats: PlayerStats = {
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
  };

  const defaultAttrs = {
    pace: player.overallRating || 70,
    shooting: player.overallRating || 70,
    passing: player.overallRating || 70,
    dribbling: player.overallRating || 70,
    defending: player.overallRating || 70,
    physical: player.overallRating || 70,
    goalkeeping: player.position === 'GK' ? (player.overallRating || 70) : 20,
  };

  const safeContractYears = Math.max(1, Math.min(5, contractYears || 3));
  const preservedThreeSeasonMarketValue = Math.max(
    25000,
    Number(player.marketValue) || Math.round((transferFee * 3) / safeContractYears) || 50000
  );

  const transferredPlayer: Player = {
    ...player,
    currentClubId: buyingClub?.id || buyingClubId || 'external_club',
    currentLeagueId: buyingClub?.leagueId || '',
    isFreeAgent: false,
    salary: Math.max(1000, Number(salary) || player.salary || 2500),
    marketValue: preservedThreeSeasonMarketValue,
    contractYears: safeContractYears,
    isListedForTransfer: false,
    morale: Math.min(100, (player.morale || 80) + 15),
    fitness: 100,
    stats: player.stats ? { ...player.stats } : fallbackStats,
    attributes: player.attributes ? { ...player.attributes } : defaultAttrs,
  };

  // Update teams atomically
  const updatedTeams = (Array.isArray(allTeams) ? allTeams : []).map(t => {
    if (!t) return t;
    const isThisSellingClub = Boolean(
      (sellingClub && t.id === sellingClub.id) ||
        (sellingClubId && t.id === sellingClubId) ||
        (sellingClub?.isUserClub && t.isUserClub)
    );
    const isThisBuyingClub = Boolean(
      (buyingClub && t.id === buyingClub.id) || (buyingClubId && t.id === buyingClubId)
    );

    // 1. Selling Club: remove player, remove from tactics lineup/bench/special roles, add transfer fee
    if (isThisSellingClub && !isThisBuyingClub) {
      const filteredPlayers = (t.players || []).filter(p => p && p.id && p.id !== player.id);
      const updatedTactics = t.tactics ? {
        ...t.tactics,
        startingPlayerIds: (t.tactics.startingPlayerIds || []).filter(id => id && id !== player.id),
        benchPlayerIds: (t.tactics.benchPlayerIds || []).filter(id => id && id !== player.id),
        captainId: t.tactics.captainId === player.id ? '' : t.tactics.captainId,
        penaltyTakerId: t.tactics.penaltyTakerId === player.id ? '' : t.tactics.penaltyTakerId,
        freeKickTakerId: t.tactics.freeKickTakerId === player.id ? '' : t.tactics.freeKickTakerId,
        cornerTakerId: t.tactics.cornerTakerId === player.id ? '' : t.tactics.cornerTakerId,
      } : undefined;

      return syncClubLineupAfterTransfer({
        ...t,
        budget: (t.budget || 0) + transferFee,
        players: filteredPlayers,
        tactics: updatedTactics,
      });
    }

    // 2. Buying Club: add player, subtract transfer fee (only if > 0), and integrate into starting lineup if AI club
    if (isThisBuyingClub) {
      toClubName = t.name;
      const filteredExisting = (t.players || []).filter(p => p && p.id && p.id !== player.id);
      return syncClubLineupAfterTransfer({
        ...t,
        budget: transferFee > 0 ? Math.max(0, (t.budget || 0) - transferFee) : (t.budget || 0),
        players: [...filteredExisting, transferredPlayer],
      }, transferredPlayer.id);
    }

    // 3. Other Clubs: ensure player is removed if they previously held this ID
    if (t.players && t.players.some(p => p && p.id === player.id) && !isThisSellingClub) {
      return {
        ...t,
        players: (t.players || []).filter(p => p && p.id && p.id !== player.id),
        tactics: t.tactics ? {
          ...t.tactics,
          startingPlayerIds: (t.tactics.startingPlayerIds || []).filter(id => id && id !== player.id),
          benchPlayerIds: (t.tactics.benchPlayerIds || []).filter(id => id && id !== player.id),
        } : undefined,
      };
    }

    return t;
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
        content: `تم توقيع العقود رسمياً مع اللاعب ${player.name} (${player.position}) قادماً من (${fromClubName}) ${transferFee > 0 ? `مقابل قيمة انتقال ${transferFee.toLocaleString()} ج.م` : 'في صفقة انتقال حر مجانية'} وبعقد يمتد لـ ${contractYears} سنوات وانضم إلى قائمة الفريق.`,
      }
    : {
        id: `msg_trans_sell_${Date.now()}_${player.id}`,
        title: `إتمام بيع اللاعب ${player.name} إلى ${toClubName} 💰`,
        sender: 'إدارة التعاقدات والحسابات',
        date: `الجولة ${currentRound}`,
        type: 'transfer',
        read: false,
        content: `تمت الموافقة الرسمية على انتقال اللاعب ${player.name} إلى (${toClubName}) مقابل ${transferFee.toLocaleString()} ج.م. تم إيداع المبلغ كاملاً في خزينة النادي.`,
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
  for (const t of (allTeams || [])) {
    if (!t) continue;
    const p = (t.players || []).find(x => x && x.id === deal.playerId);
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
  const marketPlayer = (transferMarket || []).find(p => p && p.id === deal.playerId);
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
  const vrp = VERIFIED_REAL_PLAYERS.find(p => p && p.id === deal.playerId);
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
 * Finds all AI clubs (domestic and international) that can realistically afford and attract the target player.
 */
export function findEligibleBuyerClubs(
  targetPlayer: Player,
  allTeams: Club[],
  userClubId?: string
): { club: Club; maxAffordableFee: number }[] {
  const ovr = targetPlayer.overallRating || 60;
  const val = Math.max(25000, targetPlayer.marketValue || 50000);
  const eligible: { club: Club; maxAffordableFee: number }[] = [];
  const candidateClubs: Club[] = [];
  const seenClubIds = new Set<string>();

  // 1. Gather all clubs from the current active league
  for (const club of allTeams) {
    if (club && club.id && !club.isUserClub && (!userClubId || club.id !== userClubId)) {
      candidateClubs.push(club);
      seenClubIds.add(club.id);
    }
  }

  // 2. Also gather prospective buyer clubs from regional & international leagues (Saudi, Gulf, North Africa, Europe)
  const customLeagues = getCustomLeagues();
  for (const league of Object.values(customLeagues)) {
    if (!league.teams) continue;
    for (const club of league.teams) {
      if (club && club.id && !club.isUserClub && (!userClubId || club.id !== userClubId) && !seenClubIds.has(club.id)) {
        candidateClubs.push({
          ...club,
          leagueId: league.id || club.leagueId,
        });
        seenClubIds.add(club.id);
      }
    }
  }

  for (const club of candidateClubs) {
    let budget = club.budget || 0;
    const div = club.division || 1;
    const rep = club.reputation || 45;

    // Provide realistic liquidity for prestigious foreign/regional clubs if initial budget is unset
    if (budget < val * 0.8) {
      if (rep >= 85) budget = Math.max(budget, Math.round(val * 3.5));
      else if (rep >= 75) budget = Math.max(budget, Math.round(val * 2.2));
      else if (rep >= 65) budget = Math.max(budget, Math.round(val * 1.5));
      else if (rep >= 55) budget = Math.max(budget, Math.round(val * 1.1));
    }

    // Minimum budget threshold: Club must have at least 75% of player's market value
    if (budget < val * 0.75) continue;

    // Caliber & Reputation compatibility:
    // 1. STRICT REALISM: European Stars (Rating >= 78 or wonderkids) CANNOT be bought by Arab clubs
    // "مينفعش لاعب مشهور و قوى يسيب فريق كبيرر فى اوربا عشان يروح نادى عربى"
    const currentClub = allTeams.find(t => t.id === targetPlayer.currentClubId);
    const isPlayerFromEuropeanClub = isEuropeanEliteClub(currentClub) || isTopEuropeanLeague(currentClub?.leagueId) || ovr >= 82;
    const isBuyerArab = isArabOrAfricanClub(club);

    if (isPlayerFromEuropeanClub && isBuyerArab) {
      const isVeteranMarquee = (targetPlayer.age || 25) >= 33 && club.leagueId === 'sau_tier_1' && rep >= 80;
      if (!isVeteranMarquee && (ovr >= 78 || ((targetPlayer.age || 25) <= 23 && (targetPlayer.potentialRating || ovr) >= 80))) {
        continue; // Exclude Arab clubs from bidding on prime European stars
      }
    }

    // 2. Superstars (85+) only go to world-class elite clubs (rep >= 84)
    if (ovr >= 85) {
      if (div !== 1 || rep < 84) continue;
    } else if (ovr >= 80) {
      if (div !== 1 || rep < 70) continue;
    } else if (ovr >= 75) {
      if (div > 2 || (div === 2 && rep < 48)) continue;
    } else if (ovr >= 70) {
      if (div > 3 || (div === 3 && rep < 38)) continue;
    }

    // Maximum fee the club is willing to spend from its budget
    const maxBudgetFee = Math.floor(budget * 0.88);
    // Reputation bonus multiplier
    const repMultiplier = rep >= 80 ? 1.35 : rep >= 65 ? 1.20 : rep >= 50 ? 1.10 : 1.02;
    const maxValFee = Math.round(val * repMultiplier);
    const maxAffordableFee = Math.min(maxBudgetFee, maxValFee);

    if (maxAffordableFee >= val * 0.75) {
      eligible.push({ club: { ...club, budget }, maxAffordableFee });
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

  if (!userClub || !userClub.id || !Array.isArray(userClub.players) || userClub.players.length <= 14) {
    return { bids, inboxMessages };
  }

  const players = userClub.players.filter(p => p && p.id);
  if (players.length === 0) return { bids, inboxMessages };

  // 1. Identify candidate categories:
  const listedPlayers = players.filter(p => p.isListedForTransfer);
  const topPerformers = players.filter(p => 
    (p.stats?.goals || 0) >= 2 || 
    (p.stats?.assists || 0) >= 2 || 
    ((p.stats?.averageRating || 0) >= 7.0 && (p.stats?.appearances || 0) >= 2) ||
    (p.positionCategory === 'GK' && (p.stats?.cleanSheets || 0) >= 2)
  );
  const stars = players.filter(p => p.overallRating >= 68);
  const youngProspects = players.filter(p => p.age <= 23 && p.overallRating >= 64);
  const expiringContracts = players.filter(p => (p.contractYears || 1) <= 1);

  // 2. Determine realistic probability:
  // If player(s) are listed for transfer on the market, 75% chance of receiving an offer this round!
  // If user has top performers or stars, 55% chance!
  // Normal baseline chance: 40%
  const hasListed = listedPlayers.length > 0;
  const hasPerformers = topPerformers.length > 0;
  const hasStars = stars.length > 0;

  const bidRollThreshold = hasListed ? 0.75 : (hasPerformers || hasStars) ? 0.55 : 0.40;
  if (Math.random() > bidRollThreshold) {
    return { bids, inboxMessages };
  }

  // Can generate 1 offer, or 2 offers if multiple players are listed or in high demand
  const maxOffersToGenerate = (hasListed && players.length > 18 && Math.random() < 0.35) ? 2 : 1;
  const selectedPlayerIds = new Set<string>();

  for (let i = 0; i < maxOffersToGenerate; i++) {
    const unselectedPlayers = players.filter(p => !selectedPlayerIds.has(p.id));
    if (unselectedPlayers.length === 0) break;

    let targetPlayer: Player | undefined;
    const unselectedListed = unselectedPlayers.filter(p => p.isListedForTransfer);
    const unselectedPerformers = unselectedPlayers.filter(p => topPerformers.some(tp => tp.id === p.id));
    const unselectedStars = unselectedPlayers.filter(p => stars.some(s => s.id === p.id));
    const unselectedYoung = unselectedPlayers.filter(p => youngProspects.some(y => y.id === p.id));

    if (unselectedListed.length > 0 && (Math.random() < 0.75 || unselectedPerformers.length === 0)) {
      targetPlayer = unselectedListed[Math.floor(Math.random() * unselectedListed.length)];
    } else if (unselectedPerformers.length > 0 && Math.random() < 0.65) {
      targetPlayer = unselectedPerformers[Math.floor(Math.random() * unselectedPerformers.length)];
    } else if (unselectedStars.length > 0 && Math.random() < 0.50) {
      targetPlayer = unselectedStars[Math.floor(Math.random() * unselectedStars.length)];
    } else if (unselectedYoung.length > 0 && Math.random() < 0.50) {
      targetPlayer = unselectedYoung[Math.floor(Math.random() * unselectedYoung.length)];
    } else {
      targetPlayer = unselectedPlayers[Math.floor(Math.random() * unselectedPlayers.length)];
    }

    if (!targetPlayer || !targetPlayer.id) continue;
    selectedPlayerIds.add(targetPlayer.id);

    const eligibleBuyers = findEligibleBuyerClubs(targetPlayer, allTeams, userClub.id);
    if (eligibleBuyers.length === 0) continue;

    const { club: biddingClub, maxAffordableFee } = eligibleBuyers[Math.floor(Math.random() * eligibleBuyers.length)];
    if (!biddingClub || !biddingClub.id) continue;

    // Fixed non-negotiable price: AI bid is strictly the player's fixed marketValue
    const baseMarketVal = Math.max(25000, targetPlayer.marketValue || 50000);
    if (biddingClub.budget < baseMarketVal || maxAffordableFee < baseMarketVal) continue;
    const bidAmount = baseMarketVal;

    const profitRatio = 1.0;
    const isLucrative = (biddingClub.reputation || 50) >= 75 || targetPlayer.overallRating >= 72;

    const offerId = `bid_${Date.now()}_${targetPlayer.id}_${Math.random().toString(36).substring(2, 6)}`;
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

    const isExternalLeague = !allTeams.some(t => t.id === biddingClub.id);
    const originTag = isExternalLeague ? ' (عرض خارجي)' : ' (منافس محلي)';

    const title = isLucrative
      ? `🔥 عرض شراء مغرٍ: ${biddingClub.name}${originTag} يطلب ضم ${targetPlayer.name} (${bidAmount.toLocaleString()} ج.م)!`
      : `💰 عرض رسمي: نادي ${biddingClub.name}${originTag} يرغب في شراء ${targetPlayer.name}`;

    const content = isLucrative
      ? `وصل إدارة نادي ${userClub.name} عرض رسمي مغرٍ من نادي ${biddingClub.name}${originTag} للتعاقد النهائي مع اللاعب ${targetPlayer.name} (${targetPlayer.position} - تقييم ${targetPlayer.overallRating}) مقابل رسوم انتقال تبلغ ${bidAmount.toLocaleString()} ج.م (بفارق ربح +${Math.round((profitRatio - 1) * 100)}% عن قيمته السوقية البالغة ${baseMarketVal.toLocaleString()} ج.م).\n\nيمثل هذا العرض فرصة مالية ممتازة لإنعاش خزينة النادي. في حال الموافقة، سينتقل اللاعب فوراً للنادي المشتري وتودع الأموال في خزينة النادي.`
      : `تلقى النادي خطاباً رسمياً من نادي ${biddingClub.name}${originTag} يطلب فيه شراء اللاعب ${targetPlayer.name} (${targetPlayer.position} - تقييم ${targetPlayer.overallRating}) بمبلغ ${bidAmount.toLocaleString()} ج.م.\n\nالقيمة السوقية الحالية للاعب: ${baseMarketVal.toLocaleString()} ج.م. يمكنك قبول العرض مباشرة لنقل اللاعب، أو رفضه، أو تجديد عقده لحمايته.`;

    const msg: InboxMessage = {
      id: `msg_bid_${Date.now()}_${targetPlayer.id}_${i}`,
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
  }

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
 * Calculates fixed, non-negotiable asking price and loan fee for a player.
 * Player transfer price is strictly fixed at their marketValue (or 0 for free agents).
 */
export function calculateAskingPrice(player: Player, club?: Club): { askingPrice: number; loanFee: number } {
  const baseValue = Math.max(25000, Math.round(player.marketValue || 50000));
  const isFree = !club || !player.currentClubId || player.contractYears === 0 || (player as any).isFreeAgent;
  
  if (isFree) {
    return {
      askingPrice: 0,
      loanFee: 0,
    };
  }

  return {
    askingPrice: baseValue,
    loanFee: Math.round(baseValue * 0.10),
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

  // 3. Fast O(1) lookup in cached GLOBAL_LEAGUES index
  if (clubId) {
    if (!globalClubLookupIndex) {
      globalClubLookupIndex = new Map();
      for (const [lId, lDef] of Object.entries(GLOBAL_LEAGUES)) {
        for (const t of lDef.teams || []) {
          if (t && t.id) {
            globalClubLookupIndex.set(t.id, {
              clubName: t.name,
              leagueId: t.leagueId || lId,
              leagueName: lDef.name,
              club: t,
            });
          }
        }
      }
    }
    const indexed = globalClubLookupIndex.get(clubId);
    if (indexed) {
      return indexed;
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
    const safeAsking = (item.askingPrice || 0) > 0 ? item.askingPrice : ((player?.marketValue || 50000) * 1.1);
    const fee = `${Math.round(safeAsking).toLocaleString()} ج.م`;

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

// In-memory caches for high-speed Android performance on Transfers screen
const globalClubsPlayerCache = new Map<string, Player[]>();
const normalizedKeyCache = new Map<string, string>();
let globalClubLookupIndex: Map<string, { clubName: string; leagueId: string; leagueName: string; club: Club }> | null = null;
let cachedConvertedVerifiedPlayers: { vrp: (typeof VERIFIED_REAL_PLAYERS)[number]; player: Player; normKey: string }[] | null = null;

const HONORARY_TITLES_REGEX = /\b(المايسترو|الاسطوره|الاسطورة|النجم الاول|الحاوي|القناص|الساحر|الدبابه|الدبابة|السفاح|الصاروخ|الموهوب|البلدوزر|الفرعون|العقرب|البرنس|الاباتشي|العميد|الجوكر|الكابيتانو|العملاق|المقاتل|الفنان|الصخره|الصخرة|المسمار|الداهيه|الداهية|المدفعجي|الجناح الطائر|السد العالي|فخر العرب|المرعب|الانيق)\b/g;

export function normalizePlayerKey(name?: string): string {
  if (!name) return '';
  const cached = normalizedKeyCache.get(name);
  if (cached !== undefined) return cached;

  let cleaned = name.trim().toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\(\)\[\]\{\}\-_\.]/g, ' ')
    .replace(/\s+/g, ' ');

  cleaned = cleaned.replace(HONORARY_TITLES_REGEX, '').trim();

  let result: string;
  if (cleaned.includes('زيزو')) result = 'احمد سيد زيزو';
  else if (cleaned.includes('شيكابالا')) result = 'محمود شيكابالا';
  else if (cleaned.includes('افشه') || cleaned.includes('قفشه')) result = 'محمد مجدي افشه';
  else if (cleaned.includes('كهربا')) result = 'محمود كهربا';
  else if (cleaned.includes('تريزيجيه') || cleaned.includes('تريزيجه')) result = 'محمود حسن تريزيجيه';
  else result = cleaned.replace(/\s+/g, '');

  if (normalizedKeyCache.size > 15000) {
    normalizedKeyCache.clear();
  }
  normalizedKeyCache.set(name, result);
  return result;
}

/**
 * Gathers all players registered across the entire game database without duplication.
 * Optimized with O(1) lookup maps and memoized player conversions for smooth Android performance.
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

  // Pre-build O(1) live club lookup map
  const liveClubMap = new Map<string, Club>();
  for (const c of currentTeams) {
    if (c && c.id) liveClubMap.set(c.id, c);
  }

  // Helper to resolve human-readable league name
  const getLeagueName = (leagueId?: string, fallbackCountry?: string): string => {
    if (!leagueId) return fallbackCountry || 'دوري محلي';
    const l = GLOBAL_LEAGUES[leagueId];
    return l ? l.name : leagueId;
  };

  // Fast club info resolver using liveClubMap first
  const fastResolveClub = (clubId?: string, fallbackName?: string) => {
    if (clubId) {
      const live = liveClubMap.get(clubId);
      if (live && live.name) {
        return {
          clubName: live.name,
          leagueId: live.leagueId || '',
          leagueName: getLeagueName(live.leagueId, live.country),
          club: live,
        };
      }
    }
    return resolveClubInfo(clubId, fallbackName);
  };

  // 1. Process Live Teams in Current Universe (User League & Active Teams)
  for (const club of currentTeams) {
    if (!club) continue;
    const clubName = club.name || KNOWN_CLUB_NAMES[club.id]?.name || 'نادي محلي';
    const leagueName = getLeagueName(club.leagueId, club.country);
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
        leagueId: club.leagueId || '',
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
  for (const [leagueId, leagueDef] of Object.entries(GLOBAL_LEAGUES)) {
    const clubs = leagueDef.teams || [];

    for (const club of clubs) {
      if (!club || !club.id || liveClubMap.has(club.id)) continue;

      const clubName = club.name || KNOWN_CLUB_NAMES[club.id]?.name || 'نادي عالمي';
      const leagueName = leagueDef.name || 'دوري عالمي';

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

    const safeClubInfo = fastResolveClub(player.currentClubId, (player as any).currentClubName);
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

  // 4. Process Verified Real Players Registry (using pre-converted cache)
  if (!cachedConvertedVerifiedPlayers) {
    cachedConvertedVerifiedPlayers = [];
    for (const vrp of VERIFIED_REAL_PLAYERS) {
      if (!vrp || !vrp.id) continue;
      cachedConvertedVerifiedPlayers.push({
        vrp,
        player: convertVerifiedRealPlayerToPlayer(vrp),
        normKey: normalizePlayerKey(vrp.name),
      });
    }
  }

  for (const item of cachedConvertedVerifiedPlayers) {
    const { vrp, player, normKey } = item;
    if (seenPlayerIds.has(vrp.id) || (normKey && seenPlayerNames.has(normKey))) continue;
    seenPlayerIds.add(vrp.id);
    if (normKey) seenPlayerNames.add(normKey);

    const safeClubInfo = fastResolveClub(vrp.clubId, vrp.clubName);
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
      isUserClubPlayer: statusInfo.status === 'not_available' || Boolean(club && club.id === userClubId),
      canNegotiate: statusInfo.canNegotiate,
    });
  }

  return results;
}

/**
 * Processes Expired Contracts (contractYears <= 0) and Autonomous AI Club Transfers:
 * 1. Every player whose contract has expired (contractYears <= 0) is guaranteed to leave their club
 *    and transfer to another real club in `allTeams`, signing a new 2–4 year contract with a realistic salary.
 * 2. Every transferred player is immediately integrated into their new club's `tactics.startingPlayerIds`
 *    so they actively play in matches for their new club!
 * 3. Any club whose roster drops below 16 players after contract expirations is replenished so no squad breaks lineup rules.
 */
export function processFreeAgentsAndAiTransfers(
  allTeams: Club[],
  transferMarket: Player[],
  seasonNumber: number,
  currentRound: number,
  _userClubId?: string
): {
  updatedTeams: Club[];
  updatedMarket: Player[];
  updatedTransferMarket: Player[];
  newTransfers: TransferHistoryEntry[];
  newTransferHistory: TransferHistoryEntry[];
  inboxNotifications: InboxMessage[];
} {
  let safeTeams = Array.isArray(allTeams)
    ? allTeams.map(t => ({ ...t, players: [...(t.players || [])] }))
    : [];
  let safeMarket = Array.isArray(transferMarket) ? [...transferMarket] : [];
  const newTransfers: TransferHistoryEntry[] = [];
  const inboxNotifications: InboxMessage[] = [];

  const expiredContractPool: {
    player: Player;
    formerClubId: string;
    formerClubName: string;
    wasUserClub: boolean;
  }[] = [];

  // 1. Collect ALL players whose contracts expired (contractYears <= 0) across all clubs
  for (const club of safeTeams) {
    if (!club || !Array.isArray(club.players)) continue;
    const remainingPlayers: Player[] = [];

    for (const p of club.players) {
      if (!p || !p.id) continue;
      if (p.contractYears !== undefined && p.contractYears <= 0) {
        expiredContractPool.push({
          player: {
            ...p,
            contractYears: 0,
            currentClubId: '',
            isListedForTransfer: false,
          },
          formerClubId: club.id,
          formerClubName: club.name,
          wasUserClub: Boolean(club.isUserClub || (_userClubId && club.id === _userClubId)),
        });
      } else {
        remainingPlayers.push(p);
      }
    }

    club.players = remainingPlayers;
  }

  // Normalize any existing free agents in transferMarket so they remain available as Free Agents
  safeMarket = safeMarket
    .filter(mp => Boolean(mp && mp.id))
    .map(mp => ({
      ...mp,
      currentClubId: '',
      currentLeagueId: 'free_agents',
      isFreeAgent: true,
      contractYears: 0,
    }));

  // 2. Process expired contracts:
  // - Any player from the user's club whose contract reached 0 without renewal is automatically converted to a Free Agent (isFreeAgent: true) and added to transferMarket.
  // - AI club expired players either enter the Free Agents market or join another AI club in need of players.
  for (const item of expiredContractPool) {
    const fa = item.player;
    const posCat = fa.positionCategory || (
      fa.position === 'GK'
        ? 'GK'
        : ['CB', 'LB', 'RB'].includes(fa.position)
        ? 'DEF'
        : ['ST', 'CF', 'RW', 'LW'].includes(fa.position)
        ? 'FWD'
        : 'MID'
    );

    if (item.wasUserClub) {
      const freeAgentPlayer: Player = {
        ...fa,
        currentClubId: '',
        currentLeagueId: 'free_agents',
        isFreeAgent: true,
        contractYears: 0,
        isListedForTransfer: false,
      };
      safeMarket = [
        freeAgentPlayer,
        ...safeMarket.filter(p => p && p.id !== freeAgentPlayer.id),
      ];

      newTransfers.push({
        id: `tx_fa_exp_${Date.now()}_${fa.id}_${Math.random().toString(36).slice(2, 6)}`,
        playerId: fa.id,
        playerName: fa.name,
        playerRating: fa.overallRating,
        position: fa.position,
        type: 'sell',
        fee: 0,
        salary: fa.salary || 2500,
        date: `الموسم ${seasonNumber} - الجولة ${currentRound}`,
        seasonNumber,
        round: currentRound,
        fromClubName: item.formerClubName || 'فريقك',
        toClubName: 'سوق اللاعبين الأحرار (Free Agent)',
        timestamp: Date.now(),
      });

      inboxNotifications.push({
        id: `msg_fa_left_${Date.now()}_${fa.id}_${Math.random().toString(36).slice(2, 5)}`,
        title: `انتهاء عقد: تحول ${fa.name} إلى لاعب حر (Free Agent) 📄`,
        sender: 'لجنة شؤون اللاعبين والتعاقدات',
        date: `الموسم ${seasonNumber}`,
        type: 'transfer',
        read: false,
        content: `انتهت مدة عقد اللاعب ${fa.name} (${fa.position} - تقييم ${fa.overallRating}) مع ناديك رسمياً (0 سنوات متبقية) دون تجديد، وتم إخراجه من قائمة الفريق وتحويل حالته إلى "لاعب حر" (Free Agent) متاح مجاناً في سوق الانتقالات.`,
      });
      continue;
    }

    // Candidate AI clubs (excluding the player's former club and user club)
    const otherAiClubs = safeTeams.filter(
      c => c && !c.isUserClub && (!(_userClubId && c.id === _userClubId)) && c.id !== item.formerClubId
    );
    if (otherAiClubs.length === 0) {
      safeMarket.push({
        ...fa,
        currentClubId: '',
        currentLeagueId: 'free_agents',
        isFreeAgent: true,
        contractYears: 0,
        isListedForTransfer: false,
      });
      continue;
    }

    // Prefer clubs that need this position or have smaller squads
    const preferredClubs = otherAiClubs.filter(c => {
      const squad = c.players || [];
      if (squad.length >= 30) return false;
      const countInPos = squad.filter(p => p.positionCategory === posCat).length;
      const targetMax = posCat === 'GK' ? 4 : posCat === 'DEF' ? 10 : posCat === 'MID' ? 10 : 8;
      return countInPos < targetMax;
    });

    const poolToPickFrom = preferredClubs.length > 0 ? preferredClubs : otherAiClubs;
    poolToPickFrom.sort((a, b) => (a.players?.length || 0) - (b.players?.length || 0));
    const topCandidates = poolToPickFrom.slice(0, Math.min(4, poolToPickFrom.length));
    const buyer = topCandidates[Math.floor(Math.random() * topCandidates.length)] || otherAiClubs[0];

    const newContractYears = Math.floor(Math.random() * 3) + 2; // 2 to 4 years
    const newSalary = calculateRealisticSalary(fa.overallRating || 65, {
      divisionTier: buyer.division || 1,
      clubReputation: buyer.reputation || 60,
    });

    const signedPlayer: Player = {
      ...fa,
      currentClubId: buyer.id,
      currentLeagueId: buyer.leagueId || '',
      isFreeAgent: false,
      contractYears: newContractYears,
      salary: newSalary,
      isListedForTransfer: false,
      morale: 92,
      fitness: 100,
    };

    buyer.players = [...(buyer.players || []).filter(p => p && p.id !== signedPlayer.id), signedPlayer];
    const syncedBuyer = syncClubLineupAfterTransfer(buyer, signedPlayer.id);
    buyer.tactics = syncedBuyer.tactics;

    newTransfers.push({
      id: `tx_fa_${Date.now()}_${fa.id}_${Math.random().toString(36).slice(2, 6)}`,
      playerId: fa.id,
      playerName: fa.name,
      playerRating: fa.overallRating,
      position: fa.position,
      type: 'buy',
      fee: 0,
      salary: newSalary,
      date: `الموسم ${seasonNumber} - الجولة ${currentRound}`,
      seasonNumber,
      round: currentRound,
      fromClubName: item.formerClubName || 'لاعب حر',
      toClubName: buyer.name,
      timestamp: Date.now(),
    });
  }

  // 3. Ensure every club has at least 16 players and a valid synced lineup after contract expirations
  safeTeams = safeTeams.map(club => {
    if (!club) return club;
    let squad = Array.isArray(club.players) ? [...club.players] : [];
    if (squad.length < 16) {
      try {
        const generated = generateClubSquad(
          club.id,
          club.countryCode || 'EGY',
          club.leagueId || 'egy_tier_1',
          club.reputation || 50,
          (club.division || 1) === 1 ? 68 : (club.division || 2) === 2 ? 62 : 56
        );
        for (const gp of generated) {
          if (squad.length >= 18) break;
          if (!squad.some(existing => existing.id === gp.id)) {
            squad.push({
              ...gp,
              currentClubId: club.id,
              contractYears: 3,
            });
          }
        }
      } catch {
        // Ignore fallback generation errors
      }
    }
    return syncClubLineupAfterTransfer({
      ...club,
      players: squad,
    });
  });

  // 4. Autonomous AI-to-AI Paid Transfers at fixed player marketValue
  const aiClubs = safeTeams.filter(t => t && !t.isUserClub);
  const richAiClubs = aiClubs.filter(c => (c.budget || 0) >= 120000 && (c.players || []).length < 26);
  const maxAiDeals = Math.min(3, richAiClubs.length);

  for (let d = 0; d < maxAiDeals; d++) {
    const buyer = richAiClubs[d];
    if (!buyer) continue;

    const marketCandidates = safeMarket.filter(
      p => p && (p.contractYears || 0) > 0 && (p.marketValue || 50000) <= (buyer.budget || 0) * 0.75
    );

    if (marketCandidates.length > 0) {
      const target = marketCandidates[Math.floor(Math.random() * marketCandidates.length)];
      const fee = Math.max(25000, Math.round(target.marketValue || 50000));
      if (buyer.budget >= fee) {
        buyer.budget -= fee;
        const years = Math.floor(Math.random() * 3) + 2;
        const wage = target.salary || calculateRealisticSalary(target.overallRating || 65, {
          divisionTier: buyer.division || 1,
          clubReputation: buyer.reputation || 60,
        });
        const signedTarget: Player = {
          ...target,
          currentClubId: buyer.id,
          currentLeagueId: buyer.leagueId || '',
          contractYears: years,
          salary: wage,
          isListedForTransfer: false,
        };
        buyer.players.push(signedTarget);
        const syncedBuyer = syncClubLineupAfterTransfer(buyer, signedTarget.id);
        buyer.tactics = syncedBuyer.tactics;
        safeMarket = safeMarket.filter(p => p.id !== target.id);

        newTransfers.push({
          id: `tx_ai_${Date.now()}_${target.id}_${d}`,
          playerId: target.id,
          playerName: target.name,
          playerRating: target.overallRating,
          position: target.position,
          type: 'buy',
          fee,
          salary: wage,
          date: `الموسم ${seasonNumber} - الجولة ${currentRound}`,
          seasonNumber,
          round: currentRound,
          fromClubName: 'سوق الانتقالات',
          toClubName: buyer.name,
          timestamp: Date.now(),
        });
      }
    }
  }

  return {
    updatedTeams: safeTeams,
    updatedMarket: safeMarket,
    updatedTransferMarket: safeMarket,
    newTransfers,
    newTransferHistory: newTransfers,
    inboxNotifications,
  };
}

/**
 * Ensures multi-team competition (5 to 7 strong contender clubs) across League, Domestic Cup,
 * and Continental tournaments. Rival AI clubs actively buy players to upgrade their weakest
 * starting positions, train key starters, and upgrade their coaching licenses/levels during the season.
 */
export function executeCompetitiveAiTransfersAndGrowth(params: {
  teams: Club[];
  transferMarket: Player[];
  seasonNumber: number;
  currentRound: number;
  activeLeagueTier?: number;
}): {
  updatedTeams: Club[];
  updatedMarket: Player[];
  newTransfers: TransferHistoryEntry[];
  inboxNotifications: InboxMessage[];
  newsHeadlines: { title: string; summary: string; category: 'transfer' | 'league' }[];
} {
  const {
    teams,
    transferMarket,
    seasonNumber = 1,
    currentRound = 1,
    activeLeagueTier = 1,
  } = params;

  let safeTeams = Array.isArray(teams) ? teams.map(t => ({
    ...t,
    players: Array.isArray(t?.players) ? [...t.players] : [],
  })) : [];
  let safeMarket = Array.isArray(transferMarket) ? [...transferMarket] : [];
  const newTransfers: TransferHistoryEntry[] = [];
  const inboxNotifications: InboxMessage[] = [];
  const newsHeadlines: { title: string; summary: string; category: 'transfer' | 'league' }[] = [];

  const aiClubs = safeTeams.filter(t => t && !t.isUserClub);
  if (aiClubs.length === 0) {
    return {
      updatedTeams: safeTeams,
      updatedMarket: safeMarket,
      newTransfers,
      inboxNotifications,
      newsHeadlines,
    };
  }

  // Helper to compute average starting 11 OVR of a club
  const getClubStarterAvgOvr = (club: Club): number => {
    const players = Array.isArray(club.players) ? club.players : [];
    if (players.length === 0) return club.rating || 60;
    const starterIds = club.tactics?.startingPlayerIds || [];
    const starters = starterIds.length >= 11
      ? players.filter(p => p && starterIds.includes(p.id))
      : [...players].sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0)).slice(0, 11);
    if (starters.length === 0) return club.rating || 60;
    const sum = starters.reduce((acc, p) => acc + (p.overallRating || 60), 0);
    return Math.round((sum / starters.length) * 10) / 10;
  };

  // Determine realistic OVR ceiling and target range based on division tier so competition is fierce & realistic
  const userClub = safeTeams.find(t => t && t.isUserClub);
  const userStarterAvg = userClub ? getClubStarterAvgOvr(userClub) : 0;
  const tierBaseOvr =
    activeLeagueTier === 1 ? 74 :
    activeLeagueTier === 2 ? 66 :
    activeLeagueTier === 3 ? 60 : 54;
  const tierMaxCap =
    activeLeagueTier === 1 ? 87 :
    activeLeagueTier === 2 ? 77 :
    activeLeagueTier === 3 ? 70 : 64;

  // Target contender OVR keeps pace with both the division benchmark and the user's squad
  const competitiveTargetOvr = Math.min(
    tierMaxCap,
    Math.max(tierBaseOvr, Math.round(userStarterAvg))
  );

  // 1. Identify 6 rival contender clubs (top 4 by reputation/rating + 2 ambitious challengers)
  const sortedAiByStrength = [...aiClubs].sort((a, b) => {
    const scoreA = getClubStarterAvgOvr(a) * 1.4 + (a.reputation || 50) * 0.4;
    const scoreB = getClubStarterAvgOvr(b) * 1.4 + (b.reputation || 50) * 0.4;
    return scoreB - scoreA;
  });

  const topContenders = sortedAiByStrength.slice(0, Math.min(4, sortedAiByStrength.length));
  const midTablePool = sortedAiByStrength.slice(4, Math.min(8, sortedAiByStrength.length));
  const darkHorses = midTablePool.sort(() => Math.random() - 0.5).slice(0, 1);
  const activeContenders = [...topContenders, ...darkHorses];
  const contenderIds = new Set(activeContenders.map(c => c.id));

  // 2. Ensure top rival contenders have competitive AI Managers while weak/mid-table clubs stay at realistic baseline licenses
  const licenseOrder: ('D' | 'C' | 'B' | 'A' | 'PRO' | 'ELITE')[] = ['D', 'C', 'B', 'A', 'PRO', 'ELITE'];
  const minContenderLicenseIdx =
    activeLeagueTier === 1 ? 2 : // 'B' or 'A' for top contenders in Tier 1
    activeLeagueTier === 2 ? 1 : // 'C' in Tier 2
    activeLeagueTier === 3 ? 1 : 0; // 'D'/'C' in Tier 3/4

  safeTeams = safeTeams.map((club, idx) => {
    if (!club || club.isUserClub) return club;
    const isContender = contenderIds.has(club.id);
    if (!isContender) {
      // Do not inflate non-contender / weak AI clubs' manager licenses or ratings
      return club;
    }

    const currentMgr: any = (club as any).manager || {
      id: `ai_mgr_${club.id}`,
      name: `المدير الفني لنادي ${club.shortName || club.name}`,
      nationality: 'مصر',
      age: 44 + (idx % 12),
      level: Math.max(2, (5 - activeLeagueTier) * 2),
      reputation: Math.max(45, (club.reputation || 55) + 4),
      license: licenseOrder[Math.min(4, minContenderLicenseIdx)],
      tacticalStyle: idx % 3 === 0 ? 'attacking' : idx % 3 === 1 ? 'possession' : 'counter',
      preferredFormation: club.tactics?.formation || '4-3-3',
    };

    const curLicIdx = Math.max(0, licenseOrder.indexOf(currentMgr.license || 'C'));
    let nextLicIdx = Math.max(curLicIdx, minContenderLicenseIdx);
    let nextLevel = Math.max(1, Number(currentMgr.level || 2));

    // Periodic coaching license / level upgrade for top contender clubs during the season (capped at 'A' / 'PRO')
    if (currentRound > 1 && (currentRound + idx) % 8 === 0) {
      if (nextLicIdx < Math.min(4, minContenderLicenseIdx + 1)) {
        nextLicIdx += 1;
      }
      nextLevel = Math.min(18, nextLevel + 1);
    }

    const updatedMgr = {
      ...currentMgr,
      level: nextLevel,
      license: licenseOrder[nextLicIdx],
      reputation: Math.min(88, Math.max(Number(currentMgr.reputation || 55), (club.reputation || 55) + 4)),
    };

    // Board financial backing for contender clubs so they can actively buy players in the transfer market
    const minContenderBudget =
      activeLeagueTier === 1 ? 450000 :
      activeLeagueTier === 2 ? 260000 :
      activeLeagueTier === 3 ? 160000 : 110000;
    const nextBudget = isContender && (club.budget || 0) < minContenderBudget
      ? (club.budget || 0) + Math.round(minContenderBudget * 0.65)
      : (club.budget || 0);

    return {
      ...club,
      budget: nextBudget,
      manager: updatedMgr,
    } as Club;
  });

  // 3. Active AI Player Purchases: 2 to 3 rival clubs buy players to upgrade their weakest starting position
  const buyingCandidates = safeTeams
    .filter(t => t && !t.isUserClub && (contenderIds.has(t.id) || (t.budget || 0) >= 120000) && (t.players || []).length < 27)
    .sort((a, b) => {
      const aContender = contenderIds.has(a.id) ? 1 : 0;
      const bContender = contenderIds.has(b.id) ? 1 : 0;
      if (aContender !== bContender) return bContender - aContender;
      return Math.random() - 0.5;
    });

  const dealsToExecute = Math.min(3, Math.max(1, buyingCandidates.length));
  const usedPlayerIds = new Set<string>();

  for (let d = 0; d < dealsToExecute; d++) {
    const buyer = buyingCandidates[d];
    if (!buyer) continue;

    const squad = Array.isArray(buyer.players) ? buyer.players : [];
    const starterIds = buyer.tactics?.startingPlayerIds || [];
    const starters = starterIds.length >= 11
      ? squad.filter(p => p && starterIds.includes(p.id))
      : [...squad].sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0)).slice(0, 11);

    // Find the weakest starter position in the AI club's starting XI
    const sortedStartersAsc = [...starters].sort((a, b) => (a.overallRating || 50) - (b.overallRating || 50));
    const weakestStarter = sortedStartersAsc[0];
    const neededPosCat: PositionCategory = weakestStarter?.positionCategory || 'FWD';
    const neededPos: Position = weakestStarter?.position || (neededPosCat === 'GK' ? 'GK' : neededPosCat === 'DEF' ? 'CB' : neededPosCat === 'MID' ? 'CM' : 'ST');
    const weakestOvr = weakestStarter?.overallRating || (tierBaseOvr - 3);

    const desiredMinOvr = Math.min(tierMaxCap, Math.max(weakestOvr + 2, competitiveTargetOvr - 1));
    const desiredMaxOvr = Math.min(tierMaxCap + 2, Math.max(desiredMinOvr + 2, competitiveTargetOvr + 3));

    // Try finding a matching upgrade in the transferMarket first
    let targetPlayer: Player | undefined = safeMarket.find(
      p =>
        p &&
        !usedPlayerIds.has(p.id) &&
        (p.positionCategory === neededPosCat || p.position === neededPos) &&
        (p.overallRating || 60) >= desiredMinOvr &&
        (p.overallRating || 60) <= desiredMaxOvr + 2
    );

    let sellerClubName = 'سوق الانتقالات';

    // If no direct position match in market, look for any high-value upgrade in market
    if (!targetPlayer) {
      targetPlayer = safeMarket.find(
        p =>
          p &&
          !usedPlayerIds.has(p.id) &&
          (p.overallRating || 60) >= desiredMinOvr &&
          (p.overallRating || 60) <= desiredMaxOvr + 2
      );
    }

    // If transfer market doesn't have an upgrade for this tier/position, scout/generate a realistic signing for that position
    if (!targetPlayer) {
      try {
        const targetOvr = Math.min(
          tierMaxCap,
          Math.max(desiredMinOvr, Math.round((desiredMinOvr + desiredMaxOvr) / 2))
        );
        const scoutedBatch = generateClubSquad(
          buyer.id,
          buyer.countryCode || 'EGY',
          buyer.leagueId || 'egy_tier_1',
          Math.max(buyer.reputation || 60, 65),
          targetOvr
        );
        const matchingPosPlayers = scoutedBatch.filter(
          gp => gp && (gp.position === neededPos || gp.positionCategory === neededPosCat)
        );
        const picked = (matchingPosPlayers.length > 0 ? matchingPosPlayers[0] : scoutedBatch[0]);
        if (picked) {
          const tunedOvr = Math.min(tierMaxCap, Math.max(desiredMinOvr, picked.overallRating || targetOvr));
          const boostDelta = Math.max(0, tunedOvr - (picked.overallRating || targetOvr));
          targetPlayer = {
            ...picked,
            id: `ai_scout_${buyer.id}_${seasonNumber}_${currentRound}_${d}_${Math.random().toString(36).slice(2, 6)}`,
            position: neededPos,
            positionCategory: neededPosCat,
            overallRating: tunedOvr,
            potentialRating: Math.min(94, Math.max(tunedOvr + 3, picked.potentialRating || tunedOvr + 3)),
            attributes: {
              ...picked.attributes,
              pace: Math.min(95, (picked.attributes?.pace || 60) + boostDelta),
              shooting: Math.min(95, (picked.attributes?.shooting || 60) + boostDelta),
              passing: Math.min(95, (picked.attributes?.passing || 60) + boostDelta),
              dribbling: Math.min(95, (picked.attributes?.dribbling || 60) + boostDelta),
              defending: Math.min(95, (picked.attributes?.defending || 60) + boostDelta),
              physical: Math.min(95, (picked.attributes?.physical || 60) + boostDelta),
              ...(picked.attributes?.goalkeeping
                ? { goalkeeping: Math.min(95, picked.attributes.goalkeeping + boostDelta) }
                : {}),
            },
          };
          const foreignOrLocalSellers = ['أكاديمية المحترفين الدولية', 'سوق الانتقالات الحرة', 'نادي وادي دجلة', 'نادي إنبي', 'نادي المقاولون العرب', 'الوداد الرياضي', 'الترجي التونسي'];
          sellerClubName = foreignOrLocalSellers[(currentRound + d) % foreignOrLocalSellers.length];
        }
      } catch {
        // Ignore generation fallback error
      }
    }

    if (!targetPlayer) continue;
    usedPlayerIds.add(targetPlayer.id);

    const fairFee = Math.max(
      25000,
      Math.min(
        Math.max(45000, Math.round((buyer.budget || 150000) * 0.55)),
        Math.round(targetPlayer.marketValue || 65000)
      )
    );
    const contractYears = 3;
    const wage = targetPlayer.salary || calculateRealisticSalary(targetPlayer.overallRating || 65, {
      divisionTier: buyer.division || activeLeagueTier || 1,
      clubReputation: buyer.reputation || 60,
    });

    const signedPlayer: Player = {
      ...targetPlayer,
      currentClubId: buyer.id,
      currentLeagueId: buyer.leagueId || '',
      contractYears,
      salary: wage,
      isListedForTransfer: false,
      morale: 94,
      fitness: 100,
    };

    buyer.budget = Math.max(25000, (buyer.budget || 150000) - fairFee);
    buyer.players = [...(buyer.players || []).filter(p => p && p.id !== signedPlayer.id), signedPlayer];
    const syncedBuyer = syncClubLineupAfterTransfer(buyer, signedPlayer.id);
    buyer.tactics = syncedBuyer.tactics;
    buyer.rating = Math.max(buyer.rating || 60, Math.round(getClubStarterAvgOvr(buyer)));

    safeMarket = safeMarket.filter(p => p && p.id !== signedPlayer.id);

    const txEntry: TransferHistoryEntry = {
      id: `tx_ai_comp_${Date.now()}_${signedPlayer.id}_${d}`,
      playerId: signedPlayer.id,
      playerName: signedPlayer.name,
      playerRating: signedPlayer.overallRating,
      position: signedPlayer.position,
      type: 'buy',
      fee: fairFee,
      salary: wage,
      date: `الموسم ${seasonNumber} - الجولة ${currentRound}`,
      seasonNumber,
      round: currentRound,
      fromClubName: sellerClubName,
      toClubName: buyer.name,
      timestamp: Date.now() + d,
    };
    newTransfers.push(txEntry);

    newsHeadlines.push({
      title: `🔥 صفقة قوية للمنافسة: ${buyer.name} يتعاقد مع ${signedPlayer.name} (${signedPlayer.overallRating} OVR)`,
      summary: `أبرم نادي ${buyer.name} صفقة مدوية بضم اللاعب ${signedPlayer.name} (${signedPlayer.position}) مقابل ${fairFee.toLocaleString()} ج.م لتدعيم تشكيلته الأساسية والمنافسة بقوة على البطولات هذا الموسم!`,
      category: 'transfer',
    });

    if (d === 0) {
      inboxNotifications.push({
        id: `msg_ai_comp_tx_${seasonNumber}_${currentRound}_${signedPlayer.id}`,
        title: `🚨 منافسوك يدعمون صفوفهم: ${buyer.name} يضم ${signedPlayer.name} (${signedPlayer.overallRating} ⭐)`,
        sender: 'شبكة رصد الانتقالات والمنافسين',
        date: `الجولة ${currentRound}`,
        type: 'transfer',
        read: false,
        content: `واصلت الأندية المنافسة تعزيز صفوفها للمنافسة على اللقب؛ حيث أتم نادي (${buyer.name}) التعاقد الرسمي مع اللاعب ${signedPlayer.name} (مركز ${signedPlayer.position} - تقييم ${signedPlayer.overallRating}) قادماً من (${sellerClubName}) بقيمة ${fairFee.toLocaleString()} ج.م، ودخل اللاعب فوراً في التشكيلة الأساسية للفريق.`,
      });
    }
  }

  // 4. AI Contender Squad Training & Development: Rival contenders develop 1-2 starters (+1 OVR & attributes)
  safeTeams = safeTeams.map(club => {
    if (!club || club.isUserClub || !contenderIds.has(club.id)) return club;
    const players = Array.isArray(club.players) ? [...club.players] : [];
    if (players.length === 0) return club;

    const starterIds = club.tactics?.startingPlayerIds || [];
    // Pick 1 starter whose OVR is below tierMaxCap to receive a +1 training boost
    const trainableIndices = players
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p && (starterIds.includes(p.id) || (p.overallRating || 0) >= tierBaseOvr - 4) && (p.overallRating || 0) < tierMaxCap);

    if (trainableIndices.length > 0) {
      const chosen = trainableIndices[(currentRound + club.id.length) % trainableIndices.length];
      const targetP = chosen.p;
      const newOvr = Math.min(tierMaxCap, (targetP.overallRating || 60) + 1);
      players[chosen.idx] = {
        ...targetP,
        overallRating: newOvr,
        potentialRating: Math.max(targetP.potentialRating || newOvr, newOvr + 1),
        fitness: Math.max(targetP.fitness || 90, 94),
        morale: Math.max(targetP.morale || 85, 90),
        attributes: {
          ...targetP.attributes,
          pace: Math.min(96, (targetP.attributes?.pace || 60) + 1),
          shooting: Math.min(96, (targetP.attributes?.shooting || 60) + 1),
          passing: Math.min(96, (targetP.attributes?.passing || 60) + 1),
          dribbling: Math.min(96, (targetP.attributes?.dribbling || 60) + 1),
          defending: Math.min(96, (targetP.attributes?.defending || 60) + 1),
          physical: Math.min(96, (targetP.attributes?.physical || 60) + 1),
          ...(targetP.attributes?.goalkeeping
            ? { goalkeeping: Math.min(96, targetP.attributes.goalkeeping + 1) }
            : {}),
        },
      };
    }

    const synced = syncClubLineupAfterTransfer({
      ...club,
      players,
    });
    return {
      ...synced,
      rating: Math.max(club.rating || 60, Math.round(getClubStarterAvgOvr(synced))),
    };
  });

  return {
    updatedTeams: safeTeams,
    updatedMarket: safeMarket,
    newTransfers,
    inboxNotifications,
    newsHeadlines,
  };
}



