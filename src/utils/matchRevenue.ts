import { Club, Sponsor } from '../types/game';
import { calculateSponsorMatchdayEarnings } from '../services/sponsorshipService';

export interface MatchRevenueBreakdown {
  isHome: boolean;
  stadiumCapacity: number;
  attendance: number;
  attendancePercentage: number;
  ticketPrice: number;
  benchmarkTicketPrice: number;
  ticketRevenue: number;
  sponsorsRevenue: number;
  sponsorsWinBonus: number;
  sponsorsMatchdayAd: number;
  sponsorsBreakdown?: string[];
  resultBonus: number;
  resultType: 'win' | 'draw' | 'loss';
  baseTotalRevenue: number;
  totalRevenue: number;
  isDoubledWithAd?: boolean;
  adDoubledBonus?: number;
  isClaimedToBudget?: boolean;
  isSkippedMatch?: boolean;
  skipPenaltyAmount?: number;
}

/**
 * Benchmark ticket price in Egyptian Pounds (EGP) based on league tier.
 */
export function getBenchmarkTicketPrice(tier: number = 1): number {
  switch (tier) {
    case 1:
      return 50; // الدوري المصري الممتاز
    case 2:
      return 30; // دوري المحترفين (القسم الثاني أ)
    case 3:
      return 20; // دوري القسم الثاني ب
    case 4:
    default:
      return 10; // دوري القسم الثالث / الرابع
  }
}

/**
 * Official match result prize / federation bonus in EGP.
 */
export function getMatchResultBonus(tier: number = 1, result: 'win' | 'draw' | 'loss'): number {
  const table: Record<number, { win: number; draw: number; loss: number }> = {
    1: { win: 50000, draw: 20000, loss: 2000 },
    2: { win: 30000, draw: 12000, loss: 1500 },
    3: { win: 18000, draw: 7000, loss: 1000 },
    4: { win: 10000, draw: 4000, loss: 500 },
  };

  const tierPrizes = table[tier] || table[4];
  return tierPrizes[result];
}

export interface CalculateRevenueParams {
  userClub: Club;
  opponentClub?: Club;
  isHome: boolean;
  userScore: number;
  opponentScore: number;
  leagueTier: number;
  isCupMatch?: boolean;
  competitionType?: 'league' | 'cup' | 'continental' | 'world' | string;
  userPenalties?: number;
  opponentPenalties?: number;
  customTicketPrice?: number;
  isSkipped?: boolean;
}

/**
 * Calculates realistic match revenue based on stadium capacity, coach ticket pricing,
 * attendance elasticity, recent performance, sponsors, and match outcome bonuses.
 * If the match was skipped/simulated, a 50% deduction is applied to motivate playing the full 90 minutes.
 */
export function calculateMatchRevenue(params: CalculateRevenueParams): MatchRevenueBreakdown {
  const {
    userClub,
    opponentClub,
    isHome,
    userScore,
    opponentScore,
    leagueTier,
    isCupMatch = false,
    competitionType: rawCompetitionType,
    userPenalties,
    opponentPenalties,
    customTicketPrice,
    isSkipped = false,
  } = params;

  const effectiveCompType = rawCompetitionType || (isCupMatch ? 'cup' : 'league');

  // 1. Result type - in cup matches ties are decided by penalty shootouts, never a draw
  let resultType: 'win' | 'draw' | 'loss';
  if (isCupMatch) {
    if (userPenalties !== undefined && opponentPenalties !== undefined && userPenalties !== opponentPenalties) {
      resultType = userPenalties > opponentPenalties ? 'win' : 'loss';
    } else if (userScore !== opponentScore) {
      resultType = userScore > opponentScore ? 'win' : 'loss';
    } else {
      // In cup ties without penalties, consider it win if user advanced or loss
      resultType = 'win';
    }
  } else {
    resultType = userScore > opponentScore ? 'win' : userScore === opponentScore ? 'draw' : 'loss';
  }

  // 2. Stadium Capacity & Coach Ticket Price
  const facilities = userClub.facilities || {
    stadiumCapacity: 8000,
    stadiumLevel: 1,
    stadiumName: 'استاد النادي',
    medicalCenterLevel: 1,
    trainingGroundLevel: 1,
    youthAcademyLevel: 1,
    scoutingNetworkLevel: 1,
  };

  const stadiumCapacity = Math.max(1000, facilities.stadiumCapacity || 8000);
  const benchmarkPrice = getBenchmarkTicketPrice(leagueTier);

  // Coach ticket price: uses club setting, or custom param, or default benchmark
  const ticketPrice = Math.max(
    5,
    customTicketPrice ?? facilities.ticketPrice ?? benchmarkPrice
  );

  // 3. Attendance Rate Calculation (Realistic Stadium Attendance Dynamics)
  // Baseline attendance rate
  let attendanceRate = 0.65; // 65% base

  // Performance Impact: Team Morale & Win/Loss outcome
  const squadMorale =
    Array.isArray(userClub.players) && userClub.players.length > 0
      ? userClub.players.reduce((sum, p) => sum + (p.morale || 80), 0) / userClub.players.length
      : 80;

  if (squadMorale >= 85) {
    attendanceRate += 0.08; // High enthusiasm (+8%)
  } else if (squadMorale <= 65) {
    attendanceRate -= 0.10; // Disappointed fan base (-10%)
  }

  if (resultType === 'win') {
    attendanceRate += 0.05; // Victory euphoria (+5%)
  } else if (resultType === 'loss') {
    attendanceRate -= 0.08; // Defeat penalty (-8%)
  }

  // Opponent Prestige & Derby Factor
  if (opponentClub) {
    const oppReputation = opponentClub.reputation || 50;
    if (oppReputation >= 80) {
      attendanceRate += 0.20; // Massive match (e.g. Al Ahly / Zamalek / Pyramids) (+20%)
    } else if (oppReputation >= 70) {
      attendanceRate += 0.10; // Tough competitor (+10%)
    }
  }

  // Ticket Price Elasticity (Demand vs Price)
  const priceRatio = ticketPrice / benchmarkPrice;
  if (priceRatio > 1.0) {
    // Price higher than benchmark: attendance drops proportionally
    const penalty = (priceRatio - 1.0) * 0.45; // e.g. +50% price => ~22.5% fewer attendees
    attendanceRate -= penalty;
  } else if (priceRatio < 1.0) {
    // Price lower than benchmark: discount encourages more fans
    const bonus = (1.0 - priceRatio) * 0.25; // e.g. -40% price => +10% fans
    attendanceRate += bonus;
  }

  // Cup match hype boost
  if (isCupMatch) {
    attendanceRate += 0.10;
  }

  // Clamp attendance rate between 15% and 100%
  const finalAttendanceRate = Math.min(1.0, Math.max(0.15, attendanceRate));
  const attendance = Math.min(stadiumCapacity, Math.round(stadiumCapacity * finalAttendanceRate));
  const attendancePercentage = Math.round((attendance / stadiumCapacity) * 100);

  // 4. Ticket Revenue
  // Ticket revenue belongs primarily to the home team in league matches
  let ticketRevenue = 0;
  if (isHome) {
    ticketRevenue = attendance * ticketPrice;
  } else {
    // Away match: small visiting fans share / travel allowance
    ticketRevenue = Math.round(attendance * ticketPrice * 0.05);
  }

  // 5. Sponsors & Commercial Matchday Ad Revenue (Multi-competition clauses)
  const isCleanSheet = opponentScore === 0;
  const isDerby = Boolean(
    opponentClub &&
      ((opponentClub.reputation && opponentClub.reputation >= 75) ||
        (opponentClub.city && userClub.city && opponentClub.city === userClub.city))
  );

  const sponsorCalc = calculateSponsorMatchdayEarnings(userClub.sponsors || [], {
    competitionType: effectiveCompType,
    resultType,
    isCleanSheet,
    isDerby,
    isHome,
    leagueTier,
  });

  const sponsorsRevenue = sponsorCalc.totalSponsorsRevenue;
  const sponsorsWinBonus =
    sponsorCalc.sponsorsWinBonus +
    sponsorCalc.sponsorsCupBonus +
    sponsorCalc.sponsorsContinentalBonus +
    sponsorCalc.sponsorsDerbyBonus +
    sponsorCalc.sponsorsCleanSheetBonus;
  const sponsorsMatchdayAd = sponsorCalc.sponsorsBaseMatchdayAd;

  // 6. Match Result Official Bonus
  const resultBonus = getMatchResultBonus(leagueTier, resultType);

  // 7. Base Total Revenue
  const baseTotalRevenue = ticketRevenue + sponsorsRevenue + resultBonus;

  // 8. Skip Penalty (50% deduction if match was skipped or simulated)
  const skipPenaltyAmount = isSkipped ? Math.round(baseTotalRevenue * 0.5) : 0;
  const totalRevenue = isSkipped ? Math.max(0, baseTotalRevenue - skipPenaltyAmount) : baseTotalRevenue;

  return {
    isHome,
    stadiumCapacity,
    attendance,
    attendancePercentage,
    ticketPrice,
    benchmarkTicketPrice: benchmarkPrice,
    ticketRevenue,
    sponsorsRevenue,
    sponsorsWinBonus,
    sponsorsMatchdayAd,
    sponsorsBreakdown: sponsorCalc.detailedBreakdown,
    resultBonus,
    resultType,
    baseTotalRevenue,
    totalRevenue,
    isDoubledWithAd: false,
    adDoubledBonus: 0,
    isClaimedToBudget: false,
    isSkippedMatch: isSkipped,
    skipPenaltyAmount,
  };
}
