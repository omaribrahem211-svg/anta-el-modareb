import { Club, Player, PositionCategory } from '../types/game';
import { GameRealismSettings } from '../types/admin';

export interface MatchRewardConfig {
  winCoins: number;
  drawCoins: number;
  lossCoins: number;
  winTicketMultiplier: number;
  drawTicketMultiplier: number;
  lossTicketMultiplier: number;
}

export interface EconomyConfig {
  matchRewards: MatchRewardConfig;
  sponsorBaseMonthlyByTier: Record<number, { min: number; max: number }>;
  promotionBonusByTier: Record<number, { budget: number; coins: number }>;
  championBonusByTier: Record<number, { budget: number; coins: number }>;
  facilityUpgradeCosts: Record<number, number>;
  dailyRewardCoins: number;
}

/**
 * Default balanced in-game economy configuration
 * Reduced rewards to ensure slower, meaningful financial progression.
 */
export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  matchRewards: {
    winCoins: 25,
    drawCoins: 10,
    lossCoins: 2,
    winTicketMultiplier: 1.0,
    drawTicketMultiplier: 0.75,
    lossTicketMultiplier: 0.5,
  },
  sponsorBaseMonthlyByTier: {
    4: { min: 4000, max: 8000 },
    3: { min: 10000, max: 22000 },
    2: { min: 30000, max: 65000 },
    1: { min: 80000, max: 200000 },
  },
  promotionBonusByTier: {
    4: { budget: 45000, coins: 50 },
    3: { budget: 120000, coins: 100 },
    2: { budget: 300000, coins: 200 },
    1: { budget: 800000, coins: 500 },
  },
  championBonusByTier: {
    4: { budget: 75000, coins: 80 },
    3: { budget: 200000, coins: 150 },
    2: { budget: 500000, coins: 350 },
    1: { budget: 1500000, coins: 1000 },
  },
  facilityUpgradeCosts: {
    1: 25000,
    2: 60000,
    3: 150000,
    4: 400000,
    5: 1000000,
  },
  dailyRewardCoins: 15,
};

/**
 * Future Monetization Catalog Interface (Part 9)
 * Prepares the architecture for virtual coin bundles without real-money logic in this phase.
 */
export interface CoinStorePackage {
  productId: string;
  coinAmount: number;
  bonusCoins: number;
  realPrice: number;
  currency: string;
  active: boolean;
  titleAr: string;
  badge?: string;
}

export const FUTURE_COIN_PACKAGES: CoinStorePackage[] = [
  {
    productId: 'coins_bundle_starter_100',
    coinAmount: 100,
    bonusCoins: 0,
    realPrice: 0.99,
    currency: 'USD',
    active: true,
    titleAr: 'حزمة البداية (100 كوينز)',
  },
  {
    productId: 'coins_bundle_trainer_500',
    coinAmount: 500,
    bonusCoins: 50,
    realPrice: 4.99,
    currency: 'USD',
    active: true,
    titleAr: 'حزمة المدرب (550 كوينز)',
    badge: 'شائع',
  },
  {
    productId: 'coins_bundle_pro_1000',
    coinAmount: 1000,
    bonusCoins: 150,
    realPrice: 9.99,
    currency: 'USD',
    active: true,
    titleAr: 'حزمة المحترفين (1,150 كوينز)',
    badge: 'أفضل قيمة',
  },
  {
    productId: 'coins_bundle_legend_5000',
    coinAmount: 5000,
    bonusCoins: 1000,
    realPrice: 39.99,
    currency: 'USD',
    active: true,
    titleAr: 'حزمة الأساطير (6,000 كوينز)',
    badge: 'VIP',
  },
];

/**
 * Centralized Player Market Value Calculation (Part 12 & 13)
 * 
 * Formula:
 * marketValue = baseRatingValue * potentialMultiplier * ageMultiplier * performanceMultiplier * contractMultiplier * reputationMultiplier
 */
export function calculateRealisticMarketValue(
  player: Partial<Player>,
  options?: {
    divisionTier?: number;
    clubReputation?: number;
    transferMultiplier?: number;
  }
): number {
  const overall = player.overallRating ?? 50;
  const potential = player.potentialRating ?? overall;
  const age = player.age ?? 24;
  const form = player.form ?? 7.0;
  const contractYears = player.contractYears ?? 2;
  const multiplier = options?.transferMultiplier ?? 1.0;

  // 1. Base Rating Value Curve (Exponential scaling)
  let baseValue = 0;
  if (overall < 50) {
    baseValue = 10000 + (overall - 35) * 800; // 10k - 22k
  } else if (overall < 60) {
    baseValue = 25000 + Math.pow(overall - 50, 1.8) * 4500; // 25k - 70k
  } else if (overall < 70) {
    baseValue = 75000 + Math.pow(overall - 60, 2.1) * 18000; // 75k - 300k
  } else if (overall < 80) {
    baseValue = 350000 + Math.pow(overall - 70, 2.4) * 65000; // 350k - 2.0M
  } else if (overall < 88) {
    baseValue = 2200000 + Math.pow(overall - 80, 2.7) * 280000; // 2.2M - 9.5M
  } else {
    baseValue = 10000000 + Math.pow(overall - 88, 3.0) * 1200000; // 10M - 35M+
  }

  // 2. Potential Multiplier
  let potentialMultiplier = 1.0;
  const potentialGap = potential - overall;
  if (age <= 21) {
    potentialMultiplier = 1.0 + Math.min(0.8, (potentialGap * 0.05) + ((22 - age) * 0.05));
  } else if (age <= 25) {
    potentialMultiplier = 1.0 + Math.min(0.4, potentialGap * 0.03);
  } else {
    potentialMultiplier = 1.0;
  }

  // 3. Age Multiplier
  let ageMultiplier = 1.0;
  if (age >= 18 && age <= 23) {
    ageMultiplier = 1.15; // high resale value
  } else if (age >= 24 && age <= 28) {
    ageMultiplier = 1.25; // prime athletic age
  } else if (age >= 29 && age <= 31) {
    ageMultiplier = 0.95;
  } else if (age >= 32 && age <= 34) {
    ageMultiplier = 0.65;
  } else {
    ageMultiplier = 0.40; // veteran
  }

  // 4. Performance / Form Multiplier
  let performanceMultiplier = 1.0;
  if (form >= 8.5) performanceMultiplier = 1.15;
  else if (form >= 7.5) performanceMultiplier = 1.05;
  else if (form <= 5.5) performanceMultiplier = 0.90;

  // 5. Contract Length Multiplier
  let contractMultiplier = 1.0;
  if (contractYears >= 3) contractMultiplier = 1.10;
  else if (contractYears === 1) contractMultiplier = 0.85;

  const rawValue = baseValue * potentialMultiplier * ageMultiplier * performanceMultiplier * contractMultiplier * multiplier;
  
  // Round to clean football value numbers
  if (rawValue > 1000000) {
    return Math.round(rawValue / 25000) * 25000;
  } else if (rawValue > 100000) {
    return Math.round(rawValue / 5000) * 5000;
  } else {
    return Math.max(10000, Math.round(rawValue / 1000) * 1000);
  }
}

/**
 * Centralized Player Salary Calculation (Part 14)
 * Scales realistically so lower divisions are playable while stars demand high wages.
 */
export function calculateRealisticSalary(
  overallRating: number,
  options?: {
    divisionTier?: number;
    clubReputation?: number;
    salaryMultiplier?: number;
  }
): number {
  const tier = options?.divisionTier ?? 4;
  const rep = options?.clubReputation ?? 30;
  const mult = options?.salaryMultiplier ?? 1.0;

  let baseMonthly = 0;
  if (overallRating < 50) {
    baseMonthly = 1200 + (overallRating - 35) * 100; // 1,200 - 2,700 EGP
  } else if (overallRating < 60) {
    baseMonthly = 3000 + Math.pow(overallRating - 50, 1.5) * 350; // 3,000 - 9,500 EGP
  } else if (overallRating < 70) {
    baseMonthly = 11000 + Math.pow(overallRating - 60, 1.8) * 900; // 11,000 - 32,000 EGP
  } else if (overallRating < 80) {
    baseMonthly = 35000 + Math.pow(overallRating - 70, 2.0) * 2200; // 35,000 - 110,000 EGP
  } else {
    baseMonthly = 120000 + Math.pow(overallRating - 80, 2.2) * 8500; // 120,000 - 350,000+ EGP
  }

  // Tier cost of living adjustment
  const tierAdjustment = tier === 4 ? 0.75 : tier === 3 ? 0.9 : tier === 2 ? 1.1 : 1.35;
  const finalSalary = baseMonthly * tierAdjustment * mult;

  return Math.max(1000, Math.round(finalSalary / 100) * 100);
}

/**
 * Check if a player accepts to join a club based on division and reputation constraints (Part 15)
 */
/**
 * Calculate club's total monthly revenue/income from all sources (Sponsors + Tickets + Commercial/TV rights).
 */
export function calculateClubMonthlyIncome(club: Club): number {
  if (!club) return 0;
  const tier = club.division || 4;

  // 1. Division Board Payroll Grant (المخصص الأساسي للرواتب من مجلس الإدارة والاتحاد)
  const divisionBoardGrantByTier: Record<number, number> = {
    1: 3500000, // الدوري الممتاز: 3.5 مليون ج.م شهرياً
    2: 1200000, // دوري المحترفين: 1.2 مليون ج.م شهرياً
    3: 550000,  // القسم الثاني ب: 550 ألف ج.م شهرياً
    4: 280000,  // القسم الثالث / الدرجة الرابعة: 280 ألف ج.م شهرياً
  };
  const baseBoardGrant = divisionBoardGrantByTier[tier] || 300000;

  // 2. Existing contracted squad wages
  const currentWages = calculateClubTotalMonthlyWages(club);

  // Board Invariant: Guarantee minimum 20% + 40,000 EGP headroom above existing wages so clubs always have operational wage space
  const guaranteedPayrollFloor = Math.max(baseBoardGrant, Math.round(currentWages * 1.20 + 40000));

  // 3. Matchday Ticket Revenue (تقدير مباراتين على أرض الفريق شهرياً)
  const facilities = club.facilities || { stadiumCapacity: 5000, stadiumLevel: 1 };
  const stadiumCapacity = facilities.stadiumCapacity || 5000;
  const ticketPrice = (facilities as any)?.ticketPrice || (tier === 1 ? 50 : tier === 2 ? 35 : tier === 3 ? 25 : 20);
  const estimatedTicketIncome = stadiumCapacity * ticketPrice * 2;

  // 4. Commercial & TV Rights
  const tvAndCommercialByTier: Record<number, number> = {
    1: 150000,
    2: 60000,
    3: 25000,
    4: 15000,
  };
  const tvCommercial = tvAndCommercialByTier[tier] || 15000;

  // 5. User-transferred wage budget supplement (المحول من الخزينة النقدية)
  const wageBonus = Math.max(
    0,
    (typeof club.wageBudgetMonthly === 'number' ? club.wageBudgetMonthly : 0) +
      (typeof (club as any).wageBudget === 'number' && (club as any).wageBudget !== club.wageBudgetMonthly
        ? (club as any).wageBudget
        : 0)
  );

  return guaranteedPayrollFloor + estimatedTicketIncome + tvCommercial + wageBonus;
}

/**
 * Returns the exact remaining monthly wage capacity available for new signings.
 */
export function calculateClubRemainingWageBudget(club: Club): number {
  if (!club) return 0;
  const totalIncome = calculateClubMonthlyIncome(club);
  const totalWages = calculateClubTotalMonthlyWages(club);
  return Math.max(0, totalIncome - totalWages);
}

/**
 * Calculate total current monthly wages for all players currently contracted to the club.
 */
export function calculateClubTotalMonthlyWages(club: Club): number {
  if (!club) return 0;
  const players = Array.isArray(club.players) ? club.players : [];
  return players.filter(Boolean).reduce((sum, p) => sum + (p?.salary || 0), 0);
}

/**
 * Validate whether a club can financially afford a transfer deal (Fee & Wage cap).
 */
export interface TransferFinancialValidation {
  canAffordFee: boolean;
  canAffordWage: boolean;
  allowed: boolean;
  currentBudget: number;
  requiredFee: number;
  currentWages: number;
  newSalary: number;
  projectedWages: number;
  monthlyIncome: number;
  remainingWageBudget: number;
  reason?: string;
}

export function validateTransferFinancials(
  userClub: Club,
  player: Partial<Player>,
  offeredFee?: number,
  offeredSalary?: number,
  isFreeAgent: boolean = false
): TransferFinancialValidation {
  if (!userClub) {
    return {
      canAffordFee: false,
      canAffordWage: false,
      allowed: false,
      currentBudget: 0,
      requiredFee: 0,
      currentWages: 0,
      newSalary: 0,
      projectedWages: 0,
      monthlyIncome: 0,
      remainingWageBudget: 0,
      reason: 'يجب تولي تدريب نادٍ أولاً لإجراء التعاقدات!',
    };
  }

  const isPlayerFreeAgent = isFreeAgent || (player?.contractYears !== undefined && player.contractYears <= 0);
  const currentBudget = userClub.budget || 0;
  const requiredFee = isPlayerFreeAgent ? 0 : (offeredFee ?? player?.marketValue ?? 0);
  const canAffordFee = currentBudget >= requiredFee;

  const currentWages = calculateClubTotalMonthlyWages(userClub);
  const monthlyIncome = calculateClubMonthlyIncome(userClub);
  const remainingWageBudget = Math.max(0, monthlyIncome - currentWages);
  const defaultSalary = player?.salary || calculateRealisticSalary(player?.overallRating || 60, {
    divisionTier: userClub.division || 4,
    clubReputation: userClub.reputation || 30,
  });
  const newSalary = offeredSalary !== undefined && offeredSalary > 0 ? offeredSalary : defaultSalary;
  const projectedWages = currentWages + newSalary;
  const canAffordWage = projectedWages <= monthlyIncome;

  let reason: string | undefined = undefined;

  if (!canAffordFee) {
    reason = `ميزانية النادي (${(currentBudget || 0).toLocaleString()} ج.م) لا تكفي لدفع السعر الثابت لشراء عقد اللاعب (${(requiredFee || 0).toLocaleString()} ج.م).`;
  } else if (!canAffordWage) {
    reason = `راتب اللاعب الشهري (${newSalary.toLocaleString()} ج.م) يتجاوز السقف المتبقي لرواتب النادي (${remainingWageBudget.toLocaleString()} ج.م شهرياً).`;
  }

  return {
    canAffordFee,
    canAffordWage,
    allowed: canAffordFee && canAffordWage,
    currentBudget,
    requiredFee,
    currentWages,
    newSalary,
    projectedWages,
    monthlyIncome,
    remainingWageBudget,
    reason,
  };
}

export function canPlayerJoinClub(
  player: Player,
  userClub: Club
): { canJoin: boolean; reason?: string } {
  if (!userClub) {
    return { canJoin: false, reason: 'يجب تولي تدريب نادٍ أولاً لإجراء التعاقدات!' };
  }
  if (!player) {
    return { canJoin: false, reason: 'بيانات اللاعب غير صالحة!' };
  }

  const clubTier = userClub.division || 4;
  const clubRep = userClub.reputation || 25;
  const ovr = player.overallRating || 60;
  const pot = player.potentialRating || ovr;
  const age = player.age || 25;

  // 1. Budget validation (Free Agents with contractYears === 0 require 0 transfer fee)
  const isFreeAgent = (player.contractYears !== undefined && player.contractYears <= 0) || !player.currentClubId || player.currentClubId === 'free_agent';
  const playerValue = isFreeAgent ? 0 : (player.marketValue || 0);
  const clubBudget = userClub.budget || 0;
  if (playerValue > 0 && clubBudget < playerValue) {
    return {
      canJoin: false,
      reason: `ميزانية ناديك الحالية (${clubBudget.toLocaleString()} ج.م) لا تكفي لدفع قيمة شراء اللاعب (${playerValue.toLocaleString()} ج.م).`,
    };
  }

  // 2. Tier 4 restrictions
  if (clubTier >= 4) {
    const maxAllowed = age >= 33 ? 67 : 65;
    if (ovr > maxAllowed) {
      return {
        canJoin: false,
        reason: `يرفض اللاعب ${player.name} (تقييم ${ovr}) اللعب في دوري الدرجة الرابعة، ويفضل الانتقال لأندية الدوري الممتاز أو الدرجات الاحترافية العليا.`,
      };
    }
  }

  // 3. Tier 3 restrictions
  if (clubTier === 3) {
    const maxAllowed = age >= 33 ? 73 : 71;
    if (ovr > maxAllowed) {
      return {
        canJoin: false,
        reason: `يرى اللاعب ${player.name} (تقييم ${ovr}) أن الانتقال لدوري الدرجة الثالثة لا يناسب طموحاته ومستواه الفني الحالي.`,
      };
    }
  }

  // 4. Tier 2 restrictions
  if (clubTier === 2) {
    const maxAllowed = age >= 33 ? 79 : 77;
    if (ovr > maxAllowed) {
      return {
        canJoin: false,
        reason: `يرفض اللاعب ${player.name} (تقييم ${ovr}) اللعب في دوري الدرجة الثانية ويشترط اللعب في الدوري الممتاز.`,
      };
    }
  }

  // 5. Young prodigy constraint
  if (age <= 21 && pot >= 79 && clubTier > 1) {
    return {
      canJoin: false,
      reason: `الموهبة الصاعدة ${player.name} (إمكانية ${pot}) ترفض الانتقال للدرجات الأدنى حرصاً على التطور في دوري الأضواء والشهرة.`,
    };
  }

  // 6. Tier 1 low reputation constraint vs global stars
  if (clubTier === 1 && clubRep < 65 && ovr >= 82) {
    return {
      canJoin: false,
      reason: `يشترط النجم ${player.name} سمعة أعلى للنادي ومشاركة في البطولات القارية الكبرى قبل التوقيع.`,
    };
  }

  return { canJoin: true };
}
