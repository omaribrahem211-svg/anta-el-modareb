import {
  Club,
  CupMatch,
  CupTournament,
  ContinentalTournament,
  Fixture,
  JobOffer,
  JobOfferCategory,
  LeagueDefinition,
  LeagueStanding,
  ManagerProfile,
  Player,
  PlayerStats,
  SeasonEndSummary,
  SeasonHistoryEntry,
  SeasonInfo,
  RetiredPlayer,
  TeamTactics,
  Position,
  PositionCategory,
} from '../types/game';
import { getLeagueByCountryAndTier, getLeagueById, GLOBAL_LEAGUES, updateLeagueRosterInWorld, getCustomLeagues, getAllClubsForCountry, findClubInWorld, createClub } from '../data/leaguesData';
import { generateLeagueSchedule, generateInitialStandings } from '../data/initialData';
import { simulateMatch } from './engine';
import { simulateKnockoutMatch } from './continentalEngine';
import { syncPlayerMarketValueWithRating } from './transferEngine';
import { generateYouthAcademyBatch } from './youthAcademyEngine';
import { checkCupStageAdvancementRewards, StageRewardInfo } from './rewardsEngine';
import { isRealClub, loadRealClubSquad } from '../data/realPlayersData';
import {
  getClubPrestigeTier,
  isClubEligibleToMakeJobOffer,
  evaluateLeagueEligibilityForManager,
  getRequiredLicenseForClub,
  normalizeCoachingLicense,
  settleEndOfSeasonLicenseAndBonus,
  isEliteGlobalClub,
  getLicenseTitleArabic,
  CAREER_CONFIG,
} from './careerProgressionEngine';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { CalendarManager } from '../services/calendarManager';
import { parseDateString } from './calendarEngine';
import { pruneMatchEventsForStorage } from './storage/indexedDbStorage';

// ----------------------------------------------------
// 1. END OF SEASON RESULT CALCULATION
// ----------------------------------------------------

export function calculateSeasonEndSummary(
  season: SeasonInfo,
  standings: LeagueStanding[],
  userClub: Club,
  activeLeague: LeagueDefinition,
  cupTournament: CupTournament | null,
  manager: ManagerProfile,
  continentalTournament?: ContinentalTournament | null
): SeasonEndSummary {
  const userRankIndex = userClub ? standings.findIndex(s => s.teamId === userClub.id) : -1;
  const finalPosition = userRankIndex >= 0 ? userRankIndex + 1 : (standings.length > 0 ? standings.length : 1);
  const userStanding = (userRankIndex >= 0 && standings[userRankIndex]) ? standings[userRankIndex] : (standings[0] || null);
  const totalTeams = standings.length > 0 ? standings.length : 20;
  const expectedLeagueMatches = totalTeams > 1 ? (totalTeams - 1) * 2 : (season.totalRounds || 38);

  const maxStandingPlayed = standings.length > 0 ? Math.max(...standings.map(s => s.played || 0)) : 0;
  const allStandingsPlayedFull = standings.length > 0 && standings.every(s => s.played >= expectedLeagueMatches);
  const isSeasonFullyCompleted = 
    season.status === 'completed' || 
    season.currentRound > season.totalRounds || 
    allStandingsPlayedFull ||
    (maxStandingPlayed > 0 && standings.every(s => s.played === maxStandingPlayed) && (season.currentRound > maxStandingPlayed || season.currentRound >= (season.totalRounds || 38)));

  let resultStatus: 'champion' | 'promoted' | 'playoffs' | 'stayed' | 'relegated' = 'stayed';
  let resultTitle = '';
  let resultDescription = '';
  let leagueTrophyAwarded: string | undefined = undefined;

  const isTier1 = activeLeague.tier === 1;
  const isLowestTier = activeLeague.tier === 4 || activeLeague.relegationSpots === 0;

  // STRICT RULE: Championship and promotion can ONLY be awarded when the season is fully completed (all fixtures played)
  if (isSeasonFullyCompleted) {
    if (finalPosition === 1) {
      resultStatus = 'champion';
      leagueTrophyAwarded = `درع ${activeLeague.name}`;
      if (activeLeague.tier > 1) {
        resultTitle = `🏆 بطل الدوري! وصعود تاريخي إلى الدرجة ${activeLeague.tier - 1}`;
        resultDescription = `موسم استثنائي وتاريخي! توج الفريق بلقب ${activeLeague.name} بعد تصدر جدول الترتيب بجدارة، وصعد رسمياً إلى مصاف أندية الدرجة ${activeLeague.tier - 1}.`;
      } else {
        resultTitle = `🏆 أبطال الدوري الممتاز! معانقة المجد والتاريخ`;
        resultDescription = `إنجاز أسطوري! حقق الفريق لقب ${activeLeague.name} وتوج بطلاً للبلاد وسط احتفالات جماهيرية عارمة لا تنتهي.`;
      }
    } else if (finalPosition <= (activeLeague.promotionSpots || 0) && activeLeague.tier > 1) {
      resultStatus = 'promoted';
      resultTitle = `🎉 تم الصعود إلى الدرجة ${activeLeague.tier - 1}!`;
      resultDescription = `نجاح باهر ومستحق! احتل الفريق المركز ${finalPosition} وضمن بطاقة الصعود المباشر إلى الدرجة الأعلى في الموسم القادم.`;
    } else if (activeLeague.playoffSpots > 0 && finalPosition === (activeLeague.promotionSpots || 0) + 1 && activeLeague.tier > 1) {
      resultStatus = 'playoffs';
      resultTitle = `⚠️ ستخوض مباريات الملحق المؤهل للصعود`;
      resultDescription = `احتل الفريق المركز ${finalPosition} وتأهل رسمياً لمباريات الملحق الفاصل للصعود.`;
    } else if (!isLowestTier && finalPosition > totalTeams - (activeLeague.relegationSpots || 0)) {
      resultStatus = 'relegated';
      resultTitle = `🔴 هبط النادي إلى الدرجة ${activeLeague.tier + 1}`;
      resultDescription = `موسم صعب وعاصف؛ لم ينجح الفريق في تفادي منطقة الخطر وهبط رسمياً إلى الدرجة الأدنى. إدارة النادي تطالب بإعادة البناء فوراً للعودة سريعاً.`;
    } else {
      resultStatus = 'stayed';
      resultTitle = `ثبات الفريق في ${activeLeague.shortName}`;
      resultDescription = `أنهى الفريق الموسم في المركز ${finalPosition} بجدول الترتيب وضمن البقاء والاستقرار لموسم آخر في نفس المسابقة.`;
    }
  } else {
    // If calculated mid-season (e.g. during resignation or inspection), do NOT award trophies or final promotion
    resultStatus = 'stayed';
    resultTitle = `الموقف الحالي في ${activeLeague.shortName} (الجولة ${season.currentRound}/${season.totalRounds})`;
    resultDescription = `يحتل الفريق المركز ${finalPosition} في منتصف الموسم.`;
  }

  // Cup Outcome
  let cupTrophyAwarded: string | undefined = undefined;
  let cupResultText = 'لم يشارك في الأدوار المتقدمة للكأس';
  let isUserRunnerUp = false;
  if (cupTournament) {
    const finalMatch = (cupTournament.matches || []).find(m => m.stage === 'final');
    
    // Check if user won the final directly from match or winnerClubId
    const isUserWinnerByClubId = !!(userClub && cupTournament.winnerClubId && cupTournament.winnerClubId === userClub.id);
    const isUserWinnerByMatch = !!(finalMatch && finalMatch.isPlayed && userClub && (
      finalMatch.winnerTeamId === userClub.id ||
      (finalMatch.homeTeamId === userClub.id && (
        (finalMatch.homeScore || 0) > (finalMatch.awayScore || 0) ||
        ((finalMatch.homeScore || 0) === (finalMatch.awayScore || 0) && (finalMatch.homePenalties || 0) > (finalMatch.awayPenalties || 0))
      )) ||
      (finalMatch.awayTeamId === userClub.id && (
        (finalMatch.awayScore || 0) > (finalMatch.homeScore || 0) ||
        ((finalMatch.homeScore || 0) === (finalMatch.awayScore || 0) && (finalMatch.awayPenalties || 0) > (finalMatch.homePenalties || 0))
      ))
    ));

    isUserRunnerUp = !!(finalMatch && finalMatch.isPlayed && userClub && !isUserWinnerByClubId && !isUserWinnerByMatch && (
      finalMatch.homeTeamId === userClub.id || finalMatch.awayTeamId === userClub.id
    ));

    if (isUserWinnerByClubId || isUserWinnerByMatch) {
      cupTrophyAwarded = cupTournament.trophyName || cupTournament.name || 'كأس مصر';
      cupResultText = `🏆 بطل ${cupTrophyAwarded}!`;
    } else if (isUserRunnerUp) {
      cupResultText = '🥈 وصيف الكأس (المباراة النهائية)';
    } else if (cupTournament.userEliminatedStage) {
      cupResultText = `ودع البطولة من ${cupTournament.userEliminatedStage}`;
    } else {
      // Find furthest cup stage played by user
      const userMatches = (cupTournament.matches || []).filter(m => userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) && m.isPlayed);
      if (userMatches.length > 0) {
        const lastM = userMatches[userMatches.length - 1];
        cupResultText = `ودع البطولة من ${lastM.stageName || 'الأدوار الإقصائية'}`;
      } else {
        cupResultText = 'لم يشارك في الأدوار المتقدمة للكأس';
      }
    }
  }

  // Continental Tournament Outcome
  let continentalTrophyAwarded: string | undefined = undefined;
  let continentalResultText = 'لم يشارك في البطولات القارية';
  let isUserContinentalRunnerUp = false;

  if (continentalTournament) {
    const finalMatch = (continentalTournament.matches || []).find(m => m.stage === 'final');
    const isUserContWinnerByClubId = !!(userClub && continentalTournament.winnerClubId && continentalTournament.winnerClubId === userClub.id);
    const isUserContWinnerByMatch = !!(finalMatch && finalMatch.isPlayed && userClub && (
      finalMatch.winnerTeamId === userClub.id ||
      (finalMatch.homeTeamId === userClub.id && (
        (finalMatch.homeScore || 0) > (finalMatch.awayScore || 0) ||
        ((finalMatch.homeScore || 0) === (finalMatch.awayScore || 0) && (finalMatch.homePenalties || 0) > (finalMatch.awayPenalties || 0))
      )) ||
      (finalMatch.awayTeamId === userClub.id && (
        (finalMatch.awayScore || 0) > (finalMatch.homeScore || 0) ||
        ((finalMatch.awayScore || 0) === (finalMatch.awayScore || 0) && (finalMatch.awayPenalties || 0) > (finalMatch.homePenalties || 0))
      ))
    ));

    isUserContinentalRunnerUp = !!(finalMatch && finalMatch.isPlayed && userClub && !isUserContWinnerByClubId && !isUserContWinnerByMatch && (
      finalMatch.homeTeamId === userClub.id || finalMatch.awayTeamId === userClub.id
    ));

    if (isUserContWinnerByClubId || isUserContWinnerByMatch) {
      continentalTrophyAwarded = continentalTournament.trophyName || continentalTournament.name || 'كأس دوري أبطال إفريقيا 🏆';
      continentalResultText = `🏆 بطل ${continentalTrophyAwarded}!`;
    } else if (isUserContinentalRunnerUp) {
      continentalResultText = `🥈 وصيف ${continentalTournament.name} (المباراة النهائية)`;
    } else {
      const userMatches = (continentalTournament.matches || []).filter(m => userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) && m.isPlayed);
      if (userMatches.length > 0) {
        const lastM = userMatches[userMatches.length - 1];
        continentalResultText = `ودع البطولة من ${lastM.stageName || lastM.stage || 'الأدوار الإقصائية'}`;
      }
    }
  }

  const trophiesWonList: string[] = [];
  if (leagueTrophyAwarded) trophiesWonList.push(leagueTrophyAwarded);
  if (cupTrophyAwarded) trophiesWonList.push(cupTrophyAwarded);
  if (continentalTrophyAwarded) trophiesWonList.push(continentalTrophyAwarded);

  // Next Destination Tier
  let nextDivisionTier = activeLeague.tier;
  if (resultStatus === 'champion' || resultStatus === 'promoted') {
    nextDivisionTier = Math.max(1, activeLeague.tier - 1);
  } else if (resultStatus === 'relegated') {
    nextDivisionTier = Math.min(4, activeLeague.tier + 1);
  }
  const nextLeague = getLeagueByCountryAndTier(activeLeague.country, nextDivisionTier, activeLeague.id);

  // Financial Prizes
  let prizeMoney = 0;
  if (finalPosition === 1) prizeMoney = activeLeague.tier === 1 ? 5000000 : activeLeague.tier === 2 ? 1800000 : activeLeague.tier === 3 ? 600000 : 300000;
  else if (finalPosition === 2) prizeMoney = activeLeague.tier === 1 ? 2500000 : activeLeague.tier === 2 ? 900000 : activeLeague.tier === 3 ? 350000 : 180000;
  else if (finalPosition === 3) prizeMoney = activeLeague.tier === 1 ? 1500000 : activeLeague.tier === 2 ? 500000 : activeLeague.tier === 3 ? 200000 : 100000;
  else if (finalPosition <= 6) prizeMoney = activeLeague.tier === 1 ? 800000 : activeLeague.tier === 2 ? 300000 : activeLeague.tier === 3 ? 120000 : 60000;
  else prizeMoney = activeLeague.tier === 1 ? 300000 : 50000;

  if (cupTrophyAwarded && cupTournament) {
    prizeMoney += (cupTournament.prizeMoneyWinner || 4000000);
  } else if (isUserRunnerUp && cupTournament) {
    prizeMoney += (cupTournament.prizeMoneyRunnerUp || 1800000);
  }

  if (continentalTrophyAwarded && continentalTournament) {
    prizeMoney += (continentalTournament.prizeMoneyWinner || 15000000);
  } else if (isUserContinentalRunnerUp && continentalTournament) {
    prizeMoney += (continentalTournament.prizeMoneyRunnerUp || 7500000);
  }

  // Calculate Player Development Points (نقاط تطوير اللاعبين) earned this season
  let developmentPointsEarned = 0;
  const developmentPointsBreakdown: { reason: string; points: number }[] = [];

  if (resultStatus === 'champion') {
    const champPts = activeLeague.tier === 1 ? 80 : activeLeague.tier === 2 ? 50 : activeLeague.tier === 3 ? 35 : 25;
    developmentPointsEarned += champPts;
    developmentPointsBreakdown.push({ reason: `التتويج بلقب ${activeLeague.name} 🏆`, points: champPts });
  } else if (resultStatus === 'promoted') {
    const promoPts = activeLeague.tier === 2 ? 40 : activeLeague.tier === 3 ? 30 : 20;
    developmentPointsEarned += promoPts;
    developmentPointsBreakdown.push({ reason: `بطاقة الصعود إلى الدرجة ${activeLeague.tier - 1} 🚀`, points: promoPts });
  } else if (finalPosition <= 3) {
    const topPts = activeLeague.tier === 1 ? 30 : 15;
    developmentPointsEarned += topPts;
    developmentPointsBreakdown.push({ reason: `إنهاء الموسم في المربع الذهبي (المركز ${finalPosition}) ⭐`, points: topPts });
  }

  // League match wins performance bonus
  const winsBonus = Math.floor((userStanding?.won || 0) * 1.5);
  if (winsBonus > 0) {
    developmentPointsEarned += winsBonus;
    developmentPointsBreakdown.push({ reason: `مكافأة الانتصارات في الدوري (${userStanding?.won || 0} انتصار) ⚽`, points: winsBonus });
  }

  // Cup achievements in season end
  if (cupTrophyAwarded) {
    developmentPointsEarned += 60;
    developmentPointsBreakdown.push({ reason: `التتويج بكأس البطولة الوطنية 🏆`, points: 60 });
  } else if (isUserRunnerUp) {
    developmentPointsEarned += 35;
    developmentPointsBreakdown.push({ reason: `بلوغ نهائي الكأس (وصيف المسابقة) 🥈`, points: 35 });
  } else if (cupTournament?.userEliminatedStage?.includes('نصف')) {
    developmentPointsEarned += 20;
    developmentPointsBreakdown.push({ reason: `الوصول لنصف نهائي الكأس 🥉`, points: 20 });
  }

  const stadiumCapacity = userClub?.facilities?.stadiumCapacity || 5000;
  const userPlayed = userStanding?.played || 0;
  const ticketRevenueTotal = userPlayed * Math.round(stadiumCapacity * 15);
  // Sponsorship system cancelled: 0 sponsorship revenue
  const sponsorshipTotal = 0;

  // Manager XP & Reputation Changes
  let xpEarned = 100 + ((userStanding?.won || 0) * 40) + ((userStanding?.drawn || 0) * 15);
  let reputationChange = 0;
  if (resultStatus === 'champion') {
    xpEarned += 300;
    reputationChange = +10;
  } else if (resultStatus === 'promoted') {
    xpEarned += 200;
    reputationChange = +6;
  } else if (resultStatus === 'relegated') {
    reputationChange = -4;
  } else if (finalPosition <= 3) {
    reputationChange = +3;
  } else {
    reputationChange = +1;
  }

  if (cupTrophyAwarded) {
    xpEarned += 250;
    reputationChange += 5;
  }

  const finalBudget = userClub ? ((userClub.budget || 0) + prizeMoney) : prizeMoney;

  // World Domination (السيطرة على العالم) calculation
  let worldDominationInfo: SeasonEndSummary['worldDominationInfo'] = undefined;
  if (resultStatus === 'champion') {
    const prevConquered = manager.conqueredLeagues || [];
    const isNew = !prevConquered.includes(activeLeague.id);
    const updatedConqueredList = isNew ? [...prevConquered, activeLeague.id] : prevConquered;
    const totalLeaguesCount = Object.keys(GLOBAL_LEAGUES).length;
    const percentage = Math.min(100, Math.round((updatedConqueredList.length / totalLeaguesCount) * 100));

    worldDominationInfo = {
      percentage,
      conqueredCount: updatedConqueredList.length,
      totalCount: totalLeaguesCount,
      isNewConquest: isNew,
      leagueName: activeLeague.name,
    };
  }

  return {
    seasonNumber: season.seasonNumber,
    leagueId: activeLeague.id,
    leagueName: activeLeague.name,
    divisionTier: activeLeague.tier,
    clubId: userClub?.id || '',
    clubName: userClub?.name || 'مدرب حر',
    finalPosition,
    totalTeams,
    played: userStanding?.played || 0,
    wins: userStanding?.won || 0,
    draws: userStanding?.drawn || 0,
    losses: userStanding?.lost || 0,
    goalsFor: userStanding?.goalsFor || 0,
    goalsAgainst: userStanding?.goalsAgainst || 0,
    goalDifference: userStanding?.goalDifference || 0,
    points: userStanding?.points || 0,
    resultStatus,
    resultTitle,
    resultDescription,
    nextLeagueName: nextLeague.name,
    nextLeagueId: nextLeague.id,
    nextDivisionTier,
    leagueTrophyAwarded,
    cupTrophyAwarded,
    cupResultText,
    continentalTrophyAwarded,
    continentalResultText,
    trophiesWonList,
    prizeMoney,
    ticketRevenueTotal,
    sponsorshipTotal,
    xpEarned,
    reputationChange,
    finalBudget,
    developmentPointsEarned,
    developmentPointsBreakdown,
    worldDominationInfo,
  };
}

// ----------------------------------------------------
// 2. REALISTIC MANAGER JOB OFFERS GENERATION (7 CAREER TIERS)
// ----------------------------------------------------

/**
 * Career Tier Definitions:
 * Tier 1: Fourth Division / Lower Semi-Pro (Rep: 10-25, Min Level: 1, License: D)
 * Tier 2: Third Division (Rep: 22-38, Min Level: 2, License: C)
 * Tier 3: Second Division (Rep: 36-52, Min Level: 3, License: B)
 * Tier 4: First Division / Lower-Mid Professional (Rep: 48-65, Min Level: 4, License: A)
 * Tier 5: Top Domestic Giants (Al Ahly, Zamalek, Pyramids, Al Hilal, Rep: 65-82, Min Level: 6, License: A/PRO)
 * Tier 6: Major Regional / European Challenger (Rep: 75-88, Min Level: 8, License: PRO)
 * Tier 7: Global Elite Giants (Real Madrid, Man City, Bayern, Rep: 88-99, Min Level: 10, License: PRO)
 */
/**
 * Realistic Squad Quality Calculation (متوسط قوة وجودة التشكيلة)
 */
function calculateSquadQuality(club: Club, league: LeagueDefinition): number {
  if (Array.isArray(club.players) && club.players.length >= 11) {
    const sorted = [...club.players].sort((a, b) => (b.overallRating || 60) - (a.overallRating || 60));
    const top14 = sorted.slice(0, 14);
    const avg = top14.reduce((sum, p) => sum + (p.overallRating || 60), 0) / top14.length;
    return Math.round(avg);
  }
  // Base derivation according to league tier & club reputation
  const tierBase = league.tier === 4 ? 56 : league.tier === 3 ? 66 : league.tier === 2 ? 74 : 80;
  const repBonus = Math.round((club.reputation / 100) * 12);
  return Math.max(52, Math.min(93, tierBase + repBonus));
}

/**
 * Derives the manager's tactical profile and description in Arabic
 */
function getManagerTacticalProfile(tactics?: TeamTactics): {
  styleNameArabic: string;
  focusArabic: string;
  isHighPress: boolean;
  isAttacking: boolean;
  isDefensive: boolean;
  isPossession: boolean;
} {
  const mentality = tactics?.mentality || 'balanced';
  const pressing = tactics?.pressingIntensity || 'balanced';
  const passing = tactics?.passingStyle || 'short';
  const buildUp = tactics?.buildUpStyle || 'standard';

  const isHighPress = pressing === 'high' || pressing === 'gegenpress';
  const isAttacking = mentality === 'attacking' || mentality === 'ultra_attacking';
  const isDefensive = mentality === 'defensive' || mentality === 'ultra_defensive';
  const isPossession = passing === 'short' || buildUp === 'from_back' || buildUp === 'patient';

  let styleNameArabic = 'نهج تكتيكي متوازن وشامل';
  let focusArabic = 'المرونة التكتيكية والانضباط الميداني وفق متطلبات كل مباراة';

  if (isHighPress && isAttacking) {
    styleNameArabic = 'الضغط العالي والتحولات السريعة (Gegenpress)';
    focusArabic = 'استخلاص الكرة في الثلث الهجومي للخصم وتكثيف الهجمات المباشرة';
  } else if (isPossession && isAttacking) {
    styleNameArabic = 'الاستحواذ المنظم والتمرير القصير (Tiki-Taka)';
    focusArabic = 'البناء المتدرج من الخلف وفرض السيطرة الفنية على وسط الملعب';
  } else if (isDefensive) {
    styleNameArabic = 'التنظيم الدفاعي والارتداد السريع (Catenaccio & Counter)';
    focusArabic = 'تأمين العمق الدفاعي وغلق المساحات والاعتماد على الكرات المرتدة الحاسمة';
  } else if (passing === 'direct' || passing === 'long_balls') {
    styleNameArabic = 'اللعب العمودي المباشر والكرات الطولية';
    focusArabic = 'نقل الكرة بأسرع وقت لخط الهجوم واستغلال القوة البدنية والعرضيات';
  }

  return { styleNameArabic, focusArabic, isHighPress, isAttacking, isDefensive, isPossession };
}

/**
 * ----------------------------------------------------
 * REALISTIC JOB MARKET & OFFER GENERATION ENGINE
 * ----------------------------------------------------
 * Generates realistic, non-random job offers evaluating all 10 factors:
 * 1. Coaching License (D, C, B, A, PRO, ELITE)
 * 2. Manager Reputation (0-100)
 * 3. Career Achievements & Trophies (League, Cup, Win Rate, Matches)
 * 4. Current Club Level & Division Ladder
 * 5. Manager's Tactical Style & Philosophy Match
 * 6. Previous League/Club Experience
 * 7. Club's Current Situation (Crisis, Ambition, Rebuild, Stability)
 * 8. Club Budget & Ambitions
 * 9. Squad Quality & Potential
 * 10. Competition Level & Tier
 *
 * Produces diverse, strategic offers spanning the 5 core archetypes:
 * - 🏆 higher_competition: نادي أكبر ومنافسة أعلى
 * - 🛠️ mid_table_project: نادي متوسط يريد بناء مشروع
 * - 🛟 relegation_salvage: نادي في خطر ويحتاج إنقاذه من الهبوط
 * - 💰 title_challenger: نادي لديه ميزانية كبيرة ويريد المنافسة على البطولات
 * - 🌱 youth_foundation: نادي أصغر يعطي المدرب فرصة أكبر لبناء الفريق
 */
export function generateSeasonJobOffers(
  manager: ManagerProfile,
  currentClub: Club,
  currentLeague: LeagueDefinition,
  finalPosition: number = 1
): JobOffer[] {
  const offers: JobOffer[] = [];
  const rep = manager.reputation || 15;
  const level = manager.level || 1;
  const totalTeams = currentLeague.teams.length;

  // Performance classification in recent season
  const isChampion = finalPosition === 1;
  const isPromoted = finalPosition <= currentLeague.promotionSpots && currentLeague.tier > 1;
  const isTopThree = finalPosition <= 3;
  const isTopHalf = finalPosition <= Math.ceil(totalTeams / 2);
  const isRelegated = currentLeague.relegationSpots > 0 && finalPosition > (totalTeams - currentLeague.relegationSpots);

  // Career achievements & experience stats
  const trophiesCount =
    (manager.leagueTitles || 0) + (manager.cupTitles || 0) ||
    (Array.isArray(manager.trophies) ? manager.trophies.length : 0);
  const matchesManaged = manager.matchesManaged || 0;
  const wins = manager.wins || 0;
  const winRate = matchesManaged > 0 ? Math.round((wins / matchesManaged) * 100) : 0;

  // Manager tactical profile
  const tacticalProfile = getManagerTacticalProfile(currentClub.tactics);

  // Collect all potential candidate clubs across all registered leagues
  const allClubsWithLeagues: { club: Club; league: LeagueDefinition }[] = [];
  Object.values(GLOBAL_LEAGUES).forEach(league => {
    league.teams.forEach(c => {
      if (c.id !== currentClub.id && !c.isUserClub) {
        allClubsWithLeagues.push({ club: c, league });
      }
    });
  });

  // Evaluate candidate club suitability for a specific offer archetype
  const evaluateOfferMatch = (
    c: Club,
    l: LeagueDefinition,
    archetype: JobOfferCategory
  ) => {
    return isClubEligibleToMakeJobOffer(
      manager,
      currentClub,
      currentLeague,
      c,
      l,
      isChampion,
      isPromoted,
      archetype,
      currentClub.tactics
    );
  };

  const usedClubIds = new Set<string>();
  const selectedArchetypes: {
    club: Club;
    league: LeagueDefinition;
    archetype: 'higher_competition' | 'mid_table_project' | 'relegation_salvage' | 'title_challenger' | 'youth_foundation';
    evalScore: number;
    tacticalFit: number;
  }[] = [];

  // --------------------------------------------------------------------------
  // POOL 1: 🏆 higher_competition (نادي أكبر ومنافسة أعلى)
  // Step up to a higher division or significantly more prestigious club
  // --------------------------------------------------------------------------
  const higherCompCandidates = allClubsWithLeagues
    .filter(({ club, league }) => {
      if (usedClubIds.has(club.id)) return false;
      const res = evaluateOfferMatch(club, league, 'higher_competition');
      if (!res.eligible) return false;

      // Must be higher reputation or higher tier
      const isStepUp = league.tier < currentLeague.tier || club.reputation >= (currentClub.reputation + 4);
      return isStepUp;
    })
    .sort((a, b) => b.club.reputation - a.club.reputation);

  if (higherCompCandidates.length > 0) {
    const pick = higherCompCandidates[0];
    usedClubIds.add(pick.club.id);
    const evalRes = evaluateOfferMatch(pick.club, pick.league, 'higher_competition');
    selectedArchetypes.push({
      club: pick.club,
      league: pick.league,
      archetype: 'higher_competition',
      evalScore: evalRes.score,
      tacticalFit: evalRes.tacticalFit,
    });
  }

  // --------------------------------------------------------------------------
  // POOL 2: 💰 title_challenger (نادي لديه ميزانية كبيرة ويريد المنافسة على البطولات)
  // Wealthy club with championship ambitions and demanding expectations
  // --------------------------------------------------------------------------
  const titleChallengerCandidates = allClubsWithLeagues
    .filter(({ club, league }) => {
      if (usedClubIds.has(club.id)) return false;
      const res = evaluateOfferMatch(club, league, 'title_challenger');
      if (!res.eligible) return false;

      // High budget or high reputation within its tier
      const isRich = (club.budget || 0) >= (currentClub.budget || 200000) * 1.3 || club.reputation >= 60;
      return isRich;
    })
    .sort((a, b) => (b.club.budget || 0) - (a.club.budget || 0));

  if (titleChallengerCandidates.length > 0) {
    const pick = titleChallengerCandidates[0];
    usedClubIds.add(pick.club.id);
    const evalRes = evaluateOfferMatch(pick.club, pick.league, 'title_challenger');
    selectedArchetypes.push({
      club: pick.club,
      league: pick.league,
      archetype: 'title_challenger',
      evalScore: evalRes.score,
      tacticalFit: evalRes.tacticalFit,
    });
  }

  // --------------------------------------------------------------------------
  // POOL 3: 🛠️ mid_table_project (نادي متوسط يريد بناء مشروع)
  // Stable mid-table club seeking a distinct tactical identity and long-term project
  // --------------------------------------------------------------------------
  const midTableCandidates = allClubsWithLeagues
    .filter(({ club, league }) => {
      if (usedClubIds.has(club.id)) return false;
      const res = evaluateOfferMatch(club, league, 'mid_table_project');
      if (!res.eligible) return false;

      // Stable club in same tier or comparable tier
      const isComparable = Math.abs(club.reputation - currentClub.reputation) <= 20;
      return isComparable;
    })
    .sort((a, b) => Math.abs(a.club.reputation - rep) - Math.abs(b.club.reputation - rep));

  if (midTableCandidates.length > 0) {
    const pick = midTableCandidates[0];
    usedClubIds.add(pick.club.id);
    const evalRes = evaluateOfferMatch(pick.club, pick.league, 'mid_table_project');
    selectedArchetypes.push({
      club: pick.club,
      league: pick.league,
      archetype: 'mid_table_project',
      evalScore: evalRes.score,
      tacticalFit: evalRes.tacticalFit,
    });
  }

  // --------------------------------------------------------------------------
  // POOL 4: 🛟 relegation_salvage (نادي في خطر ويحتاج إنقاذه من الهبوط)
  // Struggling club needing tactical discipline, high urgency, emergency bonuses
  // --------------------------------------------------------------------------
  const salvageCandidates = allClubsWithLeagues
    .filter(({ club, league }) => {
      if (usedClubIds.has(club.id)) return false;
      const res = evaluateOfferMatch(club, league, 'relegation_salvage');
      if (!res.eligible) return false;

      // Club in higher tier or same tier with lower prestige / struggling
      return league.tier <= currentLeague.tier;
    })
    .sort((a, b) => a.club.reputation - b.club.reputation);

  if (salvageCandidates.length > 0) {
    const pick = salvageCandidates[0];
    usedClubIds.add(pick.club.id);
    const evalRes = evaluateOfferMatch(pick.club, pick.league, 'relegation_salvage');
    selectedArchetypes.push({
      club: pick.club,
      league: pick.league,
      archetype: 'relegation_salvage',
      evalScore: evalRes.score,
      tacticalFit: evalRes.tacticalFit,
    });
  }

  // --------------------------------------------------------------------------
  // POOL 5: 🌱 youth_foundation (نادي أصغر يعطي المدرب فرصة أكبر لبناء الفريق)
  // Lower pressure, complete tactical autonomy, youth academy integration
  // --------------------------------------------------------------------------
  const youthCandidates = allClubsWithLeagues
    .filter(({ club, league }) => {
      if (usedClubIds.has(club.id)) return false;
      const res = evaluateOfferMatch(club, league, 'youth_foundation');
      if (!res.eligible) return false;

      // Club with equal or lower reputation, great for long-term project
      return club.reputation <= (currentClub.reputation + 8);
    })
    .sort((a, b) => (b.club.facilities?.youthAcademyLevel || 1) - (a.club.facilities?.youthAcademyLevel || 1));

  if (youthCandidates.length > 0) {
    const pick = youthCandidates[0];
    usedClubIds.add(pick.club.id);
    const evalRes = evaluateOfferMatch(pick.club, pick.league, 'youth_foundation');
    selectedArchetypes.push({
      club: pick.club,
      league: pick.league,
      archetype: 'youth_foundation',
      evalScore: evalRes.score,
      tacticalFit: evalRes.tacticalFit,
    });
  }

  // Fallback: Ensure at least 3 distinct realistic offers are always available
  if (selectedArchetypes.length < 3) {
    const fallbacks = allClubsWithLeagues.filter(
      p => !usedClubIds.has(p.club.id) && evaluateOfferMatch(p.club, p.league, 'mid_table_project').eligible
    );
    while (selectedArchetypes.length < 3 && fallbacks.length > 0) {
      const fb = fallbacks.shift()!;
      usedClubIds.add(fb.club.id);
      const evalRes = evaluateOfferMatch(fb.club, fb.league, 'mid_table_project');
      selectedArchetypes.push({
        club: fb.club,
        league: fb.league,
        archetype: 'mid_table_project',
        evalScore: evalRes.score,
        tacticalFit: evalRes.tacticalFit,
      });
    }
  }

  // --------------------------------------------------------------------------
  // ASSEMBLE FULL REALISTIC JOB OFFERS
  // --------------------------------------------------------------------------
  selectedArchetypes.forEach(({ club, league, archetype, evalScore, tacticalFit }, idx) => {
    const clubTier = getClubPrestigeTier(club, league);
    const squadQuality = calculateSquadQuality(club, league);

    // Archetype metadata, expectations, pressure, and contract details
    let categoryBadge = '';
    let offerTypeArabic = '';
    let pressureLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'moderate';
    let pressureLevelArabic = '';
    let boardExpectations = '';
    let clubSituationDescription = '';
    let interestReason = '';
    let tacticalFitReason = '';
    let freedomLevelArabic = '';
    let contractDurationYears = 3;
    let salaryMultiplier = 1.0;
    let transferBudgetBoost = 1.0;

    switch (archetype) {
      case 'higher_competition':
        categoryBadge = 'منافسة عليا 🏆';
        offerTypeArabic = 'نادي أكبر ومنافسة أعلى';
        pressureLevel = 'high';
        pressureLevelArabic = 'ضغط جماهيري وإعلامي مرتفع 🔥';
        contractDurationYears = 2;
        salaryMultiplier = 1.35;
        transferBudgetBoost = 1.25;
        freedomLevelArabic = 'صلاحيات متوازنة تحت إشراف الإدارة والمدير الرياضي';
        clubSituationDescription = `نادٍ عريق ذو قاعدة جماهيرية واسعة يخوض غمار منافسات قوية في ${league.name}، ويبحث عن مدرب ذي شخصية قيادية لتحقيق قفزة نوعية في الترتيب.`;
        boardExpectations = league.tier === 1
          ? 'المنافسة الشرسة على المراكز المؤهلة للبطولات القارية الكبرى'
          : 'المنافسة المباشرة على صدارة الدوري وتحقيق بطاقة الصعود';
        interestReason = isChampion
          ? `أبهرت إدارة ${club.name} بتتويجك المستحق بلقب الدوري مع ${currentClub.name}، وتثق بأنك المدرب القادر على قيادة فريقهم لمنصات الذهب.`
          : isPromoted
          ? `رصد مسؤولو ${club.name} كفاءتك في تحقيق الصعود وثبات نتائجك (نسبة فوز ${winRate}%)، ويرونك الأنسب لخوض هذا التحدي الكبير.`
          : `يقدر نادي ${club.name} تطور مسيرتك وحصولك على رخصة ${manager.license || 'D'} مع سمعة تدريبية مرموقة (${rep}) تؤهلك لقيادة نادٍ أكبر.`;
        tacticalFitReason = `تنسجم هويتك الفنية القائمة على [${tacticalProfile.styleNameArabic}] مع تطلعات النادي لتقديم كرة قدم شجاعة تليق بمكانته الجماهيرية.`;
        break;

      case 'title_challenger':
        categoryBadge = 'ميزانية ضخمة 💰';
        offerTypeArabic = 'نادي ذو ميزانية كبيرة يطمح للألقاب';
        pressureLevel = 'high';
        pressureLevelArabic = 'ضغط بطولات صارم ⚡ (الهدف هو الذهب فقط)';
        contractDurationYears = 3;
        salaryMultiplier = 1.6;
        transferBudgetBoost = 1.8;
        freedomLevelArabic = 'ميزانية استثنائية مع رقابة صارمة على تحقيق الألقاب';
        clubSituationDescription = `يمتلك النادي قدرة مالية ممتازة وميزانية تعاقدات ضخمة، وقد وضع الملاك خطة واضحة تستهدف التتويج بجميع الألقاب المتاحة وتفادي أي تعثر.`;
        boardExpectations = 'التتويج بلقب البطولة وحصد الكؤوس دون أي مساومة على المراكز الأولى';
        interestReason = trophiesCount > 0
          ? `يمتلك النادي مشروعاً بطولياً كبيراً، ولفت سجلك التتويجي (${trophiesCount} بطولة) أنظار مجلس الإدارة كمدرب يعرف طعم الألقاب وإدارة غرف الملابس.`
          : `تبحث إدارة ${club.name} عن مدرب طموح ذي فكر متقدم، واستند اهتمامهم إلى أرقامك التصاعدية ونسبة الانتصارات المميزة (${winRate}%).`;
        tacticalFitReason = `توفر الميزانية المرصودة للمدرب قدرة جلب نجوم يتناسبون تماماً مع فكرك التكتيكي في [${tacticalProfile.focusArabic}].`;
        break;

      case 'mid_table_project':
        categoryBadge = 'مشروع متوسط 🛠️';
        offerTypeArabic = 'نادي متوسط يريد بناء مشروع مستقر';
        pressureLevel = 'moderate';
        pressureLevelArabic = 'توقعات متوازنة ⚖️ (إدارة صبورة تدعم الاستقرار)';
        contractDurationYears = 4;
        salaryMultiplier = 1.0;
        transferBudgetBoost = 1.0;
        freedomLevelArabic = 'صلاحيات تدريبية واسعة واستقلالية فنية مريحة';
        clubSituationDescription = `استقر النادي في المنطقة الدافئة بوسط الترتيب، وتسعى إدارته لعقد شراكة فنية طويلة الأمد مع مدرب قادر على تأسيس أسلوب لعب ثابت.`;
        boardExpectations = 'بناء هوية فنية واضحة للفريق وإنهاء الموسم في النصف الأول من الجدول';
        interestReason = `تتابع اللجنة الفنية لنادي ${club.name} عملك المنظم مع ${currentClub.name}، وترى فيك المدرب المثالي القادر على صياغة مشروع متكامل على مدار 3 إلى 4 سنوات.`;
        tacticalFitReason = `أعجب مسؤولو النادي بأسلوبك في [${tacticalProfile.styleNameArabic}] واعتبروه الأساس الأنسب لبناء المنظومة المستقبلية للنادي.`;
        break;

      case 'relegation_salvage':
        categoryBadge = 'إنقاذ من الهبوط 🛟';
        offerTypeArabic = 'نادي في خطر يحتاج إنقاذه من شبح الهبوط';
        pressureLevel = 'extreme';
        pressureLevelArabic = 'شديد الحرج 🔥 (كل جولة بمثابة نهائي كأس للبقاء)';
        contractDurationYears = 1;
        salaryMultiplier = 1.25; // Combat hazard pay
        transferBudgetBoost = 1.15; // Emergency squad reinforcement
        freedomLevelArabic = 'صلاحيات تكتيكية كاملة لإحداث صدمة إيجابية فورية';
        clubSituationDescription = `يمر الفريق بأزمة نتائج حادة وضعته في منطقة الخطر وشبح الهبوط، وتبحث الإدارة عن منقذ تكتيكي صارم يوقف نزيف النقاط فوراً.`;
        boardExpectations = 'تفادي الهبوط بأي ثمن وضمان البقاء في الدوري بحصد النقاط الحاسمة';
        interestReason = `تبحث إدارة ${club.name} عن قائد حازم يعيد الانضباط والروح القتالية، واستقرت على اسمك لما تتمتع به من حنكة تكتيكية وقدرة على إدارة المباريات المعقدة.`;
        tacticalFitReason = `يعول النادي على قدرتك في ضبط التوازن الميداني وتطبيق [${tacticalProfile.styleNameArabic}] لغلق المنافذ وحسم النقاط في الأوقات الحرجة.`;
        break;

      case 'youth_foundation':
        categoryBadge = 'حرية بناء وتطوير 🌱';
        offerTypeArabic = 'نادي أصغر يمنحك حرية كاملة لبناء الفريق';
        pressureLevel = 'low';
        pressureLevelArabic = 'ضغط منخفض وهادئ 🌱 (بيئة مثالية للإبداع وتصعيد المواهب)';
        contractDurationYears = 4;
        salaryMultiplier = 0.9;
        transferBudgetBoost = 0.85;
        freedomLevelArabic = 'حرية مطلقة وسلطة كاملة على كافة القرارات الفنية والانتدابات';
        clubSituationDescription = `نادٍ طموح يركز على ترشيد الإنفاق وبناء فريق شاب للمستقبل، ويوفر بيئة عمل هادئة تتيح للمدرب تطبيق أفكاره التكتيكية بحرية تامة دون تهديد بالإقالة.`;
        boardExpectations = 'تطوير وتصعيد المواهب الشابة من قطاع الناشئين وتقديم كرة قدم حديثة وممتعة';
        interestReason = `يبحث مسؤولو نادي ${club.name} عن مدرب يتمتع برؤية تطويرية وصبر تكتيكي، ووجدوا في مسيرتك نموذجاً ملهماً لتطبيق مشروع أكاديمي مستدام.`;
        tacticalFitReason = `توفر لك إدارة النادي الضمانات الكاملة لتطبيق أسلوبك الفني [${tacticalProfile.styleNameArabic}] دون أي تدخلات خارجية.`;
        break;
    }

    // Realistic Financial Scaling (الراتب وميزانيات التعاقدات)
    // Base salary scaled by club reputation, manager level, and offer archetype
    const baseSalary = Math.round(
      (club.reputation * 520 + level * 650 + rep * 280) * salaryMultiplier
    );

    // Realistic transfer budget based on club wealth, tier, and offer type
    const clubWealthBase = club.budget || (league.tier === 1 ? 5000000 : league.tier === 2 ? 1500000 : league.tier === 3 ? 500000 : 180000);
    const transferBudget = Math.round(
      Math.max(120000, clubWealthBase * 0.45 * transferBudgetBoost)
    );
    const wageBudgetMonthly = Math.round(
      Math.max(25000, clubWealthBase * 0.35 * (salaryMultiplier > 1 ? 1.2 : 1.0))
    );

    const taskDifficultyArabic =
      clubTier.tierLevel >= 6 ? 'مشروع أسطوري عالمي 🔥' :
      clubTier.tierLevel >= 4 ? 'مهمة احترافية كبرى ⭐' :
      clubTier.tierLevel >= 3 ? 'تحدي صعود طموح 🚀' : 'مشروع تأسيس وبناء ⚽';

    const difficultyRating =
      clubTier.tierLevel >= 6 ? 'extreme' :
      clubTier.tierLevel >= 4 ? 'hard' :
      clubTier.tierLevel >= 3 ? 'medium' : 'easy';

    offers.push({
      id: `job_offer_${club.id}_s_${Date.now()}_${idx}`,
      clubId: club.id,
      clubName: club.name,
      country: club.country || league.country,
      countryCode: club.countryCode || 'EGY',
      leagueId: league.id,
      leagueName: league.name,
      divisionTier: league.tier,
      clubReputation: club.reputation,
      clubPrestige: club.clubPrestige || Math.round(club.reputation * 0.9),
      financialPower: club.reputation >= 82 ? 'elite' : club.reputation >= 65 ? 'high' : club.reputation >= 40 ? 'medium' : 'low',
      offerCategory: archetype,
      categoryBadge,
      offerType: archetype,
      offerTypeArabic,
      interestReason,
      tacticalFitReason,
      boardExpectations,
      clubSituationDescription,
      pressureLevel,
      pressureLevelArabic,
      freedomLevelArabic,
      squadQualityRating: squadQuality,
      minimumLevelRequired: Math.max(1, clubTier.minManagerLevel),
      minimumReputationRequired: Math.max(5, clubTier.minReputation),
      requiredLicense: clubTier.minLicense,
      difficultyRating,
      taskDifficultyArabic,
      primaryColor: club.primaryColor || '#1e293b',
      secondaryColor: club.secondaryColor || '#ffffff',
      managerSalary: baseSalary,
      transferBudget,
      clubBudget: clubWealthBase,
      wageBudgetMonthly,
      contractDurationYears,
      stadiumName: club.facilities?.stadiumName || `استاد ${club.name}`,
      stadiumCapacity: club.facilities?.stadiumCapacity || (league.tier === 1 ? 28000 : league.tier === 2 ? 14000 : 6000),
      currentPositionInLeague: Math.floor(Math.random() * 4 + 1),
      status: 'pending',
    });
  });

  return offers;
}

/**
 * Generates coaching job offers specifically for a user-selected league at the end of the season
 * ("اختيار وجهتك القادمة للموسم الجديد"), strictly filtering clubs according to the manager's active license.
 */
export function generateJobOffersForLeague(
  manager: ManagerProfile,
  league: LeagueDefinition,
  currentClub?: Club | null
): JobOffer[] {
  const offers: JobOffer[] = [];
  const activeLicense = normalizeCoachingLicense(manager.license);
  const activeLicenseRank = CAREER_CONFIG.LICENSES[activeLicense]?.rank || 1;
  const leagueEligibility = evaluateLeagueEligibilityForManager(league, activeLicense);

  if (!leagueEligibility.isUnlocked) {
    return [];
  }

  const level = manager.level || 1;
  const rep = manager.reputation || 15;
  const tacticalProfile = getManagerTacticalProfile(currentClub?.tactics);

  const candidateClubs = (league.teams || []).filter(club => {
    if (!club) return false;
    const reqClubLicense = getRequiredLicenseForClub(club, league);
    const reqRank = CAREER_CONFIG.LICENSES[reqClubLicense]?.rank || 1;
    return activeLicenseRank >= reqRank;
  });

  // Sort clubs by reputation descending so the user sees all available clubs in the chosen league clearly
  const sortedClubs = [...candidateClubs].sort((a, b) => (b.reputation || 50) - (a.reputation || 50));

  sortedClubs.forEach((club, idx) => {
    const clubTier = getClubPrestigeTier(club, league);
    const squadQuality = calculateSquadQuality(club, league);
    const isCurrentUserClub = !!(currentClub && club.id === currentClub.id);
    const isElite = isEliteGlobalClub(club, league);

    let archetype: JobOfferCategory = 'mid_table_project';
    let categoryBadge = 'مشروع طموح 🛠️';
    let offerTypeArabic = 'قيادة الجهاز الفني للموسم الجديد';
    let pressureLevel: 'low' | 'moderate' | 'high' | 'extreme' = 'moderate';
    let pressureLevelArabic = 'توقعات متوازنة ⚖️';
    let boardExpectations = 'بناء فريق تنافسي وتحقيق مركز متقدم في جدول الدوري';
    let salaryMultiplier = 1.0;
    let transferBudgetBoost = 1.0;
    let contractDurationYears = 3;

    if (isCurrentUserClub) {
      archetype = 'higher_competition';
      categoryBadge = 'تجديد الثقة مع ناديك الحالي 🤝';
      offerTypeArabic = 'الاستمرار في قيادة فريقك الحالي للموسم الجديد';
      pressureLevel = 'moderate';
      pressureLevelArabic = 'استقرار فني ودعم جماهيري 🏟️';
      boardExpectations = 'مواصلة مشروع النادي والمنافسة بقوة في الموسم الجديد';
      salaryMultiplier = 1.15;
      transferBudgetBoost = 1.1;
    } else if (isElite || club.reputation >= 82) {
      archetype = 'title_challenger';
      categoryBadge = 'نادي نخبة ومنافسة على الذهب 👑';
      offerTypeArabic = 'قيادة عملاق للمنافسة على جميع الألقاب';
      pressureLevel = 'extreme';
      pressureLevelArabic = 'ضغط بطولات صارم 🔥 (المطلوب التتويج بالألقاب)';
      boardExpectations = 'التتويج بلقب الدوري والمنافسة على الكأس والبطولة القارية';
      salaryMultiplier = 1.55;
      transferBudgetBoost = 1.6;
      contractDurationYears = 2;
    } else if (club.reputation >= 70) {
      archetype = 'higher_competition';
      categoryBadge = 'منافسة عليا 🏆';
      offerTypeArabic = 'نادي جماهيري يطمح للمربع الذهبي';
      pressureLevel = 'high';
      pressureLevelArabic = 'ضغط جماهيري وإعلامي مرتفع ⚡';
      boardExpectations = league.tier === 1
        ? 'المنافسة على المراكز المؤهلة للبطولات القارية'
        : 'المنافسة المباشرة على صدارة الدوري وحسم بطاقة الصعود';
      salaryMultiplier = 1.25;
      transferBudgetBoost = 1.25;
    } else if (idx >= sortedClubs.length - 3 && sortedClubs.length > 4) {
      archetype = 'youth_foundation';
      categoryBadge = 'مشروع بناء وتطوير 🌱';
      offerTypeArabic = 'فرصة ذهبية لبناء فريق شاب بصلاحيات كاملة';
      pressureLevel = 'low';
      pressureLevelArabic = 'بيئة هادئة وصلاحيات فنية كاملة 🌱';
      boardExpectations = 'تثبيت أقدام الفريق في الدوري وتطوير المواهب الشابة';
      salaryMultiplier = 0.95;
      transferBudgetBoost = 0.95;
      contractDurationYears = 4;
    }

    const baseSalary = Math.round(
      (club.reputation * 520 + level * 650 + rep * 280) * salaryMultiplier
    );
    const clubWealthBase = club.budget || (league.tier === 1 ? 5000000 : league.tier === 2 ? 1500000 : 500000);
    const transferBudget = Math.round(Math.max(150000, clubWealthBase * 0.55 * transferBudgetBoost));
    const wageBudgetMonthly = Math.round(Math.max(30000, clubWealthBase * 0.35));

    const reqLicense = getRequiredLicenseForClub(club, league);

    offers.push({
      id: `league_offer_${league.id}_${club.id}_${Date.now()}_${idx}`,
      clubId: club.id,
      clubName: club.name,
      country: club.country || league.country,
      countryCode: club.countryCode || 'EGY',
      leagueId: league.id,
      leagueName: league.name,
      divisionTier: league.tier,
      clubReputation: club.reputation,
      clubPrestige: club.clubPrestige || Math.round(club.reputation * 0.9),
      financialPower: club.reputation >= 82 ? 'elite' : club.reputation >= 65 ? 'high' : club.reputation >= 45 ? 'medium' : 'low',
      offerCategory: archetype,
      categoryBadge,
      offerType: archetype,
      offerTypeArabic,
      interestReason: `يرحب مجلس إدارة ${club.name} بتوليك القيادة الفنية للفريق في ${league.name} بموجب صلاحيات (${getLicenseTitleArabic(activeLicense)}).`,
      tacticalFitReason: `تنسجم فلسفتك التكتيكية [${tacticalProfile.styleNameArabic}] مع تطلعات نادي ${club.name} للموسم الجديد.`,
      boardExpectations,
      clubSituationDescription: `يخوض نادي ${club.name} منافسات ${league.name} (الدرجة ${league.tier}) ويمنحك ميزانية تعاقدات تبلغ ${transferBudget.toLocaleString()}$.`,
      pressureLevel,
      pressureLevelArabic,
      freedomLevelArabic: 'صلاحيات فنية كاملة لإدارة الصفقات والتشكيل',
      squadQualityRating: squadQuality,
      minimumLevelRequired: 1,
      minimumReputationRequired: 1,
      requiredLicense: reqLicense,
      difficultyRating: clubTier.tierLevel >= 6 ? 'extreme' : clubTier.tierLevel >= 4 ? 'hard' : 'medium',
      taskDifficultyArabic: clubTier.tierLevel >= 6 ? 'مشروع أسطوري عالمي 🔥' : clubTier.tierLevel >= 4 ? 'مهمة احترافية كبرى ⭐' : 'تحدي طموح 🚀',
      primaryColor: club.primaryColor || '#1e293b',
      secondaryColor: club.secondaryColor || '#ffffff',
      managerSalary: baseSalary,
      transferBudget,
      clubBudget: clubWealthBase,
      wageBudgetMonthly,
      contractDurationYears,
      stadiumName: club.facilities?.stadiumName || `استاد ${club.name}`,
      stadiumCapacity: club.facilities?.stadiumCapacity || (league.tier === 1 ? 28000 : 14000),
      currentPositionInLeague: idx + 1,
      status: 'pending',
    });
  });

  return offers;
}

// ----------------------------------------------------
// 3. CUP TOURNAMENT GENERATION & SIMULATION
// ----------------------------------------------------

export function getCupStageTriggers(
  totalLeagueRounds: number = 38,
  cupStartStage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | boolean = 'round_of_64',
  isContinentalActive: boolean = false
): {
  r64Trigger: number;
  r32Trigger: number;
  r16Trigger: number;
  quarterTrigger: number;
  semiTrigger: number;
  finalTrigger: number;
  totalSeasonRounds: number;
} {
  const stage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' =
    typeof cupStartStage === 'boolean'
      ? (cupStartStage ? 'round_of_64' : 'round_of_32')
      : cupStartStage;

  const effectiveLeagueRounds = Math.max(10, totalLeagueRounds || 38);
  const cupStagesCount = stage === 'round_of_64' ? 6 : stage === 'round_of_32' ? 5 : stage === 'round_of_16' ? 4 : 3;
  const contMatchesCount = isContinentalActive ? 9 : 0;
  const totalSeasonRounds = effectiveLeagueRounds + cupStagesCount + contMatchesCount;

  // Final is at totalSeasonRounds - 1 (the penultimate round, exactly 2 days before the final league round)
  const finalTrigger = totalSeasonRounds - 1;
  const semiTrigger = Math.max(4, Math.round(totalSeasonRounds * 0.82));
  const quarterTrigger = Math.max(3, Math.round(totalSeasonRounds * 0.62));
  const r16Trigger = stage !== 'quarter' ? Math.max(2, Math.round(totalSeasonRounds * 0.44)) : -1;
  const r32Trigger = (stage === 'round_of_64' || stage === 'round_of_32') ? Math.max(2, Math.round(totalSeasonRounds * 0.24)) : -1;
  const r64Trigger = stage === 'round_of_64' ? Math.max(2, Math.round(totalSeasonRounds * 0.10)) : -1;

  return {
    r64Trigger,
    r32Trigger,
    r16Trigger,
    quarterTrigger,
    semiTrigger,
    finalTrigger,
    totalSeasonRounds,
  };
}

export function initNationalCupTournament(
  seasonNumber: number,
  country: string,
  teams: Club[],
  userClub?: Club | null,
  totalLeagueRounds: number = 38
): CupTournament {
  const cupDef = getDomesticCupDefinitionForCountry(country || 'مصر');
  const trophyName = `${cupDef.name} 🏆`;
  
  // 1. Fetch all clubs from all tiers in the country
  let countryClubs = getAllClubsForCountry(country);
  if (!countryClubs || countryClubs.length === 0) {
    countryClubs = [...teams];
  }
  
  // Ensure user's club is included if in the same country
  if (userClub && !countryClubs.some(c => c.id === userClub.id)) {
    const userCountry = userClub.country || country;
    if (userCountry === country || country.includes(userCountry) || userCountry.includes(country)) {
      countryClubs.unshift(userClub);
    }
  }

  // Bracket sizing: 64 teams (Round of 64) if available (e.g. Egypt with 4 tiers), else 32, else 16, else 8
  let bracketClubs: Club[] = [];
  let startStage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' = 'round_of_32';

  if (countryClubs.length >= 64) {
    if (userClub && countryClubs.some(c => c.id === userClub.id)) {
      const rest = countryClubs.filter(c => c.id !== userClub.id);
      bracketClubs = [userClub, ...rest.slice(0, 63)];
    } else {
      bracketClubs = countryClubs.slice(0, 64);
    }
    startStage = 'round_of_64';
  } else if (countryClubs.length >= 32) {
    if (userClub && countryClubs.some(c => c.id === userClub.id)) {
      const rest = countryClubs.filter(c => c.id !== userClub.id);
      bracketClubs = [userClub, ...rest.slice(0, 31)];
    } else {
      bracketClubs = countryClubs.slice(0, 32);
    }
    startStage = 'round_of_32';
  } else if (countryClubs.length >= 16) {
    if (userClub && countryClubs.some(c => c.id === userClub.id)) {
      const rest = countryClubs.filter(c => c.id !== userClub.id);
      bracketClubs = [userClub, ...rest.slice(0, 15)];
    } else {
      bracketClubs = countryClubs.slice(0, 16);
    }
    startStage = 'round_of_16';
  } else {
    if (userClub && countryClubs.some(c => c.id === userClub.id)) {
      const rest = countryClubs.filter(c => c.id !== userClub.id);
      bracketClubs = [userClub, ...rest.slice(0, 7)];
    } else {
      bracketClubs = countryClubs.slice(0, 8);
    }
    startStage = 'quarter';
  }

  // Seed / pair clubs: pair higher-tier/higher-reputation clubs with lower-tier/lower-reputation clubs for classic cup thrill
  const halfCount = Math.floor(bracketClubs.length / 2);
  const potA = bracketClubs.slice(0, halfCount);
  const potB = bracketClubs.slice(halfCount);

  // Shuffle Pot B slightly for variety while retaining top vs bottom tier pairings
  const shuffledPotB = [...potB].sort(() => 0.5 - Math.random());

  const pairedMatches: { home: Club; away: Club }[] = [];
  for (let i = 0; i < halfCount; i++) {
    const home = potA[i];
    const away = shuffledPotB[i] || potB[i] || bracketClubs[i];
    pairedMatches.push({ home, away });
  }

  // Determine dynamic round triggers based on season structure
  const triggers = getCupStageTriggers(totalLeagueRounds, startStage === 'round_of_64', false);

  // Generate cup fixtures for initial stage
  const matches: CupMatch[] = [];

  if (startStage === 'round_of_64') {
    // 32 matches for Round of 64
    for (let i = 0; i < 32; i++) {
      const pair = pairedMatches[i] || { home: bracketClubs[i * 2], away: bracketClubs[i * 2 + 1] };
      matches.push({
        id: `cup_r64_${i + 1}_s${seasonNumber}`,
        stage: 'round_of_64',
        stageName: 'دور الـ 64 (مشاركة جميع الأندية)',
        roundTrigger: triggers.r64Trigger,
        homeTeamId: pair.home?.id || `c_h_${i}`,
        awayTeamId: pair.away?.id || `c_a_${i}`,
        isPlayed: false,
      });
    }
  } else if (startStage === 'round_of_32') {
    // 16 matches for Round of 32
    for (let i = 0; i < 16; i++) {
      const pair = pairedMatches[i] || { home: bracketClubs[i * 2], away: bracketClubs[i * 2 + 1] };
      matches.push({
        id: `cup_r32_${i + 1}_s${seasonNumber}`,
        stage: 'round_of_32',
        stageName: 'دور الـ 32',
        roundTrigger: triggers.r32Trigger,
        homeTeamId: pair.home?.id || `c_h_${i}`,
        awayTeamId: pair.away?.id || `c_a_${i}`,
        isPlayed: false,
      });
    }
  } else if (startStage === 'round_of_16') {
    // 8 matches for Round of 16
    for (let i = 0; i < 8; i++) {
      const pair = pairedMatches[i] || { home: bracketClubs[i * 2], away: bracketClubs[i * 2 + 1] };
      matches.push({
        id: `cup_r16_${i + 1}_s${seasonNumber}`,
        stage: 'round_of_16',
        stageName: 'ثمن النهائي (دور الـ 16)',
        roundTrigger: triggers.r16Trigger,
        homeTeamId: pair.home?.id || `c_h_${i}`,
        awayTeamId: pair.away?.id || `c_a_${i}`,
        isPlayed: false,
      });
    }
  } else {
    // 4 matches for Quarterfinals
    for (let i = 0; i < 4; i++) {
      const pair = pairedMatches[i] || { home: bracketClubs[i * 2], away: bracketClubs[i * 2 + 1] };
      matches.push({
        id: `cup_q_${i + 1}_s${seasonNumber}`,
        stage: 'quarter',
        stageName: 'ربع النهائي',
        roundTrigger: triggers.quarterTrigger,
        homeTeamId: pair.home?.id || `c_h_${i}`,
        awayTeamId: pair.away?.id || `c_a_${i}`,
        isPlayed: false,
      });
    }
  }

  return {
    id: `${cupDef.id}_s${seasonNumber}`,
    name: cupDef.shortName || cupDef.name,
    country: country || cupDef.country,
    seasonNumber,
    trophyName,
    prizeMoneyWinner: cupDef.championPrize || 3000000,
    prizeMoneyRunnerUp: cupDef.runnerUpPrize || 1500000,
    matches,
    isCompleted: false,
  };
}

// ----------------------------------------------------
// 3. MASTER SEASON CALENDAR / AGENDA GENERATOR
// ----------------------------------------------------

/**
 * Generates an integrated master season agenda where League matches, National Cup,
 * and Continental Tournament matches are scheduled sequentially round-by-round.
 * Cup matches and League matches are strictly synchronized without schedule conflicts.
 * The National Cup final is scheduled exactly 2 days before the final round of the league.
 */
export function generateMasterSeasonAgenda(
  seasonNumber: number,
  activeLeague: LeagueDefinition,
  leagueTeams: Club[],
  cupTournament?: CupTournament | null,
  continentalTournament?: any,
  userClub?: Club | null
): Fixture[] {
  return CalendarManager.generateMasterSchedule({
    seasonNumber,
    activeLeague,
    teams: leagueTeams,
    userClub,
    cupTournament: cupTournament || null,
    continentalTournament: continentalTournament || null,
  });
}

interface MasterRoundMappingItem {
  round: number;
  type: 'league' | 'cup' | 'continental';
  leagueIndex?: number;
  cupStage?: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final';
  contStage?: 'group' | 'quarter' | 'semi' | 'final';
  contMD?: number;
  stageName: string;
}

function buildMasterRoundMapping(
  totalLeagueRounds: number,
  cupStartStage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | boolean,
  isContinentalActive: boolean
): MasterRoundMappingItem[] {
  const stage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' =
    typeof cupStartStage === 'boolean'
      ? (cupStartStage ? 'round_of_64' : 'round_of_32')
      : cupStartStage;
  const hasR64 = stage === 'round_of_64';
  const effectiveLeagueRounds = Math.max(10, totalLeagueRounds || 38);

  const triggers = getCupStageTriggers(effectiveLeagueRounds, stage, isContinentalActive);
  const totalRounds = triggers.totalSeasonRounds;
  const mapping: MasterRoundMappingItem[] = [];

  const cupRoundsMap = new Map<number, { stage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final'; name: string }>();
  if (stage === 'round_of_64' && triggers.r64Trigger > 0) {
    cupRoundsMap.set(triggers.r64Trigger, { stage: 'round_of_64', name: 'الكأس الوطنية - دور الـ 64 (مشاركة جميع الأندية) 🏆' });
  }
  if ((stage === 'round_of_64' || stage === 'round_of_32') && triggers.r32Trigger > 0) {
    cupRoundsMap.set(triggers.r32Trigger, { stage: 'round_of_32', name: 'الكأس الوطنية - دور الـ 32 🏆' });
  }
  if (triggers.r16Trigger > 0) {
    cupRoundsMap.set(triggers.r16Trigger, { stage: 'round_of_16', name: 'الكأس الوطنية - ثمن النهائي (دور الـ 16) 🏆' });
  }
  if (triggers.quarterTrigger > 0) {
    cupRoundsMap.set(triggers.quarterTrigger, { stage: 'quarter', name: 'الكأس الوطنية - ربع النهائي 🏆' });
  }
  if (triggers.semiTrigger > 0) {
    cupRoundsMap.set(triggers.semiTrigger, { stage: 'semi', name: 'الكأس الوطنية - نصف النهائي 🏆' });
  }
  if (triggers.finalTrigger > 0) {
    cupRoundsMap.set(triggers.finalTrigger, { stage: 'final', name: 'نهائي الكأس الوطنية الكبير 🏆' });
  }

  const contRoundsMap = new Map<number, { stage: 'group' | 'quarter' | 'semi' | 'final'; md?: number; name: string }>();
  if (isContinentalActive) {
    const contCandidates = [
      Math.max(3, Math.round(totalRounds * 0.12)),
      Math.max(5, Math.round(totalRounds * 0.19)),
      Math.max(7, Math.round(totalRounds * 0.28)),
      Math.max(9, Math.round(totalRounds * 0.38)),
      Math.max(11, Math.round(totalRounds * 0.48)),
      Math.max(13, Math.round(totalRounds * 0.56)),
      Math.max(15, Math.round(totalRounds * 0.70)),
      Math.max(17, Math.round(totalRounds * 0.86)),
      Math.max(19, totalRounds - 2),
    ];
    const contStages = [
      { stage: 'group' as const, md: 1, name: 'دوري الأبطال - المجموعات (الجولة 1)' },
      { stage: 'group' as const, md: 2, name: 'دوري الأبطال - المجموعات (الجولة 2)' },
      { stage: 'group' as const, md: 3, name: 'دوري الأبطال - المجموعات (الجولة 3)' },
      { stage: 'group' as const, md: 4, name: 'دوري الأبطال - المجموعات (الجولة 4)' },
      { stage: 'group' as const, md: 5, name: 'دوري الأبطال - المجموعات (الجولة 5)' },
      { stage: 'group' as const, md: 6, name: 'دوري الأبطال - المجموعات (الجولة 6)' },
      { stage: 'quarter' as const, name: 'دوري الأبطال - ربع النهائي' },
      { stage: 'semi' as const, name: 'دوري الأبطال - نصف النهائي' },
      { stage: 'final' as const, name: 'نهائي دوري الأبطال القاري الكبير 🏆' },
    ];

    let lastCandidate = 1;
    for (let i = 0; i < contStages.length; i++) {
      let r = Math.max(lastCandidate + 1, contCandidates[i]);
      while (r < totalRounds && (cupRoundsMap.has(r) || contRoundsMap.has(r))) {
        r++;
      }
      if (r < totalRounds) {
        contRoundsMap.set(r, contStages[i]);
        lastCandidate = r;
      }
    }
  }

  let leagueIdx = 0;
  for (let r = 1; r <= totalRounds; r++) {
    if (cupRoundsMap.has(r)) {
      const c = cupRoundsMap.get(r)!;
      mapping.push({
        round: r,
        type: 'cup',
        cupStage: c.stage,
        stageName: c.name,
      });
    } else if (contRoundsMap.has(r)) {
      const cont = contRoundsMap.get(r)!;
      mapping.push({
        round: r,
        type: 'continental',
        contStage: cont.stage,
        contMD: cont.md,
        stageName: cont.name,
      });
    } else {
      if (leagueIdx < effectiveLeagueRounds) {
        const leagueNum = leagueIdx + 1;
        let stageName = `الدوري - الجولة ${leagueNum}`;
        const halfMark = Math.floor(effectiveLeagueRounds / 2);
        if (leagueNum === halfMark) stageName = `الدوري - الجولة ${leagueNum} (ختام الدور الأول)`;
        else if (leagueNum === halfMark + 1) stageName = `الدوري - الجولة ${leagueNum} (افتتاح الدور الثاني)`;
        else if (leagueNum === effectiveLeagueRounds) stageName = `الدوري - الجولة ${leagueNum} (الجولة الختامية الحاسمة)`;

        mapping.push({
          round: r,
          type: 'league',
          leagueIndex: leagueIdx,
          stageName,
        });
        leagueIdx++;
      }
    }
  }

  // Safety guarantee: If any league round was not mapped, append it at the end
  while (leagueIdx < effectiveLeagueRounds) {
    const nextRoundNum = mapping.length + 1;
    mapping.push({
      round: nextRoundNum,
      type: 'league',
      leagueIndex: leagueIdx,
      stageName: `الدوري - الجولة ${leagueIdx + 1}`,
    });
    leagueIdx++;
  }

  return mapping;
}

// ----------------------------------------------------
// 4. CUP TOURNAMENT ADVANCEMENT
// ----------------------------------------------------

export function advanceCupTournament(
  cup: CupTournament,
  currentRound: number,
  allTeams: Club[],
  userClub?: Club | null,
  isContinentalActive: boolean = false,
  totalLeagueRounds?: number
): {
  updatedCup: CupTournament;
  cupMatchThisRound?: CupMatch;
  cupNewsMessage?: string;
  newMatchesCreated?: CupMatch[];
  newlyAwardedRewards?: StageRewardInfo[];
} {
  if (cup.isCompleted) return { updatedCup: cup };

  const effectiveCup = cup;
  let matches = effectiveCup.matches.map(m => ({ ...m }));
  let cupMatchThisRound: CupMatch | undefined = undefined;
  let cupNewsMessage: string | undefined = undefined;
  const newMatchesCreated: CupMatch[] = [];

  // Helper to find full club object across league or world
  const getFullClub = (clubId: string): Club => {
    if (userClub && userClub.id === clubId) return userClub;
    const found = allTeams.find(t => t.id === clubId) || findClubInWorld(clubId);
    if (found) return found;

    return createClub(
      clubId,
      'فريق منافس',
      'منافس',
      'القاهرة',
      cup.country || 'مصر',
      'EGY',
      1,
      'egy_tier_1',
      60,
      65,
      '#334155',
      '#ffffff',
      500000,
      200000,
      120000,
      'استاد المباراة',
      15000,
      2
    );
  };

  const startStage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' =
    matches.some(m => m.stage === 'round_of_64')
      ? 'round_of_64'
      : matches.some(m => m.stage === 'round_of_32')
      ? 'round_of_32'
      : matches.some(m => m.stage === 'round_of_16')
      ? 'round_of_16'
      : 'quarter';

  const inferredLeagueRounds = totalLeagueRounds || (allTeams.length > 1 ? (allTeams.length - 1) * 2 : 38);
  const triggers = getCupStageTriggers(inferredLeagueRounds, startStage, isContinentalActive);

  // Helper to determine the decisive winner of a knockout match
  const resolveWinnerId = (m: CupMatch): string => {
    if (m.winnerTeamId) return m.winnerTeamId;
    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    const hp = m.homePenalties;
    const ap = m.awayPenalties;

    if (hp !== undefined && ap !== undefined && hp !== ap) {
      return hp > ap ? m.homeTeamId : m.awayTeamId;
    }
    if (hs !== as) {
      return hs > as ? m.homeTeamId : m.awayTeamId;
    }
    return m.homeTeamId || m.awayTeamId;
  };

  const allStagesInOrder: ('round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final')[] = [
    'round_of_64',
    'round_of_32',
    'round_of_16',
    'quarter',
    'semi',
    'final',
  ];

  const stageMeta: Record<
    string,
    {
      arabic: string;
      trigger: number;
      nextStage?: 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final';
    }
  > = {
    round_of_64: { arabic: 'دور الـ 64', trigger: triggers.r64Trigger, nextStage: 'round_of_32' },
    round_of_32: { arabic: 'دور الـ 32', trigger: triggers.r32Trigger, nextStage: 'round_of_16' },
    round_of_16: { arabic: 'ثمن النهائي (دور الـ 16)', trigger: triggers.r16Trigger, nextStage: 'quarter' },
    quarter: { arabic: 'ربع النهائي', trigger: triggers.quarterTrigger, nextStage: 'semi' },
    semi: { arabic: 'نصف النهائي', trigger: triggers.semiTrigger, nextStage: 'final' },
    final: { arabic: 'المباراة النهائية 🏆', trigger: triggers.finalTrigger },
  };

  const startIndex = allStagesInOrder.indexOf(startStage);
  const tournamentStages = allStagesInOrder.slice(startIndex);

  const wrapResult = (targetCup: CupTournament) => {
    const cupWithMatches = { ...targetCup, matches };
    let newlyAwardedRewards: StageRewardInfo[] = [];
    let finalCup = cupWithMatches;
    if (userClub?.id) {
      const checkRes = checkCupStageAdvancementRewards(cupWithMatches, userClub.id);
      finalCup = checkRes.updatedCup;
      newlyAwardedRewards = checkRes.newlyAwarded;
    }
    return {
      updatedCup: finalCup,
      cupMatchThisRound,
      cupNewsMessage,
      newMatchesCreated,
      newlyAwardedRewards,
    };
  };

  // Find the single active stage in order
  let activeStageKey: ('round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final') | null = null;

  for (const s of tournamentStages) {
    const sMatches = matches.filter(m => m.stage === s);
    if (sMatches.length > 0) {
      const hasUnplayed = sMatches.some(m => !m.isPlayed);
      if (hasUnplayed) {
        activeStageKey = s;
        break;
      }
      const nextS = stageMeta[s].nextStage;
      if (nextS) {
        const nextMatches = matches.filter(m => m.stage === nextS);
        if (nextMatches.length === 0) {
          activeStageKey = s;
          break;
        }
      } else {
        // Final was already played
        cup.isCompleted = true;
        const finalM = sMatches[0];
        if (finalM) {
          cup.winnerClubId = resolveWinnerId(finalM);
          cup.runnerUpClubId = cup.winnerClubId === finalM.homeTeamId ? finalM.awayTeamId : finalM.homeTeamId;
        }
        return wrapResult(cup);
      }
    }
  }

  if (!activeStageKey) {
    return wrapResult(cup);
  }

  const currentMeta = stageMeta[activeStageKey];
  const stageMatches = matches.filter(m => m.stage === activeStageKey);
  const hasUnplayed = stageMatches.some(m => !m.isPlayed);

  if (hasUnplayed) {
    // Check if user is involved in this stage
    const userMatch = userClub
      ? stageMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
      : undefined;
    const isUserMatchPlayed = Boolean(userMatch && userMatch.isPlayed);

    // STRICT USER PROTECTION: If user's match is unplayed, NEVER auto-simulate AI matches or advance!
    if (userMatch && !userMatch.isPlayed) {
      const stageTrigger = currentMeta.trigger;
      const canPlay = currentRound >= stageTrigger || stageMatches.some(m => m.roundTrigger && currentRound >= m.roundTrigger);
      if (canPlay) {
        cupMatchThisRound = userMatch;
        cupNewsMessage = `مباراة مرتقبة لناديك في ${currentMeta.arabic} لـ ${cup.name || 'الكأس الوطنية'}!`;
      }
      return {
        updatedCup: { ...effectiveCup, matches },
        cupMatchThisRound,
        cupNewsMessage,
        newMatchesCreated,
      };
    }

    // User has played (or not involved in stage):
    // Simulate remaining AI matches immediately if user already played OR if stage trigger arrived
    const stageTrigger = currentMeta.trigger;
    const canPlay = isUserMatchPlayed || currentRound >= stageTrigger || stageMatches.some(m => m.roundTrigger && currentRound >= m.roundTrigger);

    if (!canPlay) {
      // Stage is scheduled for future round; do not simulate!
      return wrapResult(cup);
    }

    // User has played (or was eliminated earlier / not participating):
    // Simulate remaining AI matches in THIS STAGE ONLY
    stageMatches.forEach(match => {
      if (!match.isPlayed) {
        const homeTeam = getFullClub(match.homeTeamId);
        const awayTeam = getFullClub(match.awayTeamId);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);

        match.homeScore = res.homeScore;
        match.awayScore = res.awayScore;
        match.homePenalties = res.homePenalties;
        match.awayPenalties = res.awayPenalties;
        match.isPlayed = true;
        match.winnerTeamId = res.winnerTeamId;
        match.events = pruneMatchEventsForStorage(res.events, true);
        match.stats = res.stats;
      }

      const matchWinnerId = resolveWinnerId(match);
      match.winnerTeamId = matchWinnerId;

      if (userClub && (match.homeTeamId === userClub.id || match.awayTeamId === userClub.id)) {
        cupMatchThisRound = match;
        if (matchWinnerId === userClub.id) {
          cup.userEliminatedStage = undefined;
        } else {
          cup.userEliminatedStage = currentMeta.arabic;
        }
      }
    });

    cupNewsMessage = `انتهت مواجهات ${currentMeta.arabic} لـ ${cup.name || 'الكأس الوطنية'}!`;
  }

  // Check if ALL matches in this stage are now played
  const allPlayed = stageMatches.every(m => m.isPlayed);
  if (allPlayed) {
    if (activeStageKey === 'final') {
      cup.isCompleted = true;
      const finalMatch = stageMatches[0];
      if (finalMatch) {
        const champId = resolveWinnerId(finalMatch);
        cup.winnerClubId = champId;
        cup.runnerUpClubId = champId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;
        if (userClub) {
          if (champId === userClub.id) {
            cup.userEliminatedStage = undefined;
          } else if (cup.runnerUpClubId === userClub.id) {
            cup.userEliminatedStage = 'وصيف الكأس (المباراة النهائية)';
          }
        }
      }
      return wrapResult(cup);
    }

    // Generate the NEXT stage matches if they don't exist yet
    const nextStageKey = currentMeta.nextStage;
    if (nextStageKey) {
      const existingNextMatches = matches.filter(m => m.stage === nextStageKey);
      if (existingNextMatches.length === 0) {
        const winners = stageMatches.map(m => resolveWinnerId(m) || m.homeTeamId);
        const nextMeta = stageMeta[nextStageKey];
        const numPairs = Math.max(1, Math.floor(winners.length / 2));

        for (let i = 0; i < numPairs; i++) {
          const nextMatch: CupMatch = {
            id: `cup_${nextStageKey}_${i + 1}_s${cup.seasonNumber}`,
            stage: nextStageKey,
            stageName: nextMeta.arabic,
            roundTrigger: nextMeta.trigger,
            homeTeamId: winners[i * 2] || winners[0],
            awayTeamId: winners[i * 2 + 1] || winners[1],
            isPlayed: false,
          };
          matches.push(nextMatch);
          newMatchesCreated.push(nextMatch);
        }

        // Guarantee user is placed in next stage if user won their match
        if (userClub && winners.includes(userClub.id)) {
          const nextStageList = matches.filter(m => m.stage === nextStageKey);
          const userInNext = nextStageList.some(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id);
          if (!userInNext && nextStageList.length > 0) {
            const targetM = nextStageList.find(m => !m.isPlayed) || nextStageList[0];
            targetM.homeTeamId = userClub.id;
          }
        }
      }
    }
  }

  // STOP: Return immediately! Never simulate the newly generated next stage in the same turn!
  return wrapResult(cup);
}

/**
 * Automatically detects and repairs any broken cup progression states:
 * e.g., if the user won their Round of 16 (or any cup match) on penalties or score,
 * but was erroneously marked as eliminated or omitted from subsequent stages/fixtures.
 */
export function repairCupProgressionIntegrity(
  cup: CupTournament | null | undefined,
  fixtures: Fixture[] = [],
  userClubId?: string
): { updatedCup: CupTournament; updatedFixtures: Fixture[]; repaired: boolean } {
  if (!cup || !cup.matches || !userClubId) {
    return { updatedCup: cup as CupTournament, updatedFixtures: fixtures, repaired: false };
  }

  let repaired = false;
  const matches = cup.matches.map(m => ({ ...m }));
  const updatedFixtures = fixtures.map(f => ({ ...f }));
  let eliminatedStage = cup.userEliminatedStage;

  // 1. SANITIZE: Any match or fixture that is flagged as played but has NO actual scores is invalid!
  // Reset it immediately to unplayed so it never displays as finished or qualified before being played.
  matches.forEach(m => {
    if (m.homeScore === undefined || m.awayScore === undefined) {
      if (m.isPlayed || m.winnerTeamId) {
        m.isPlayed = false;
        m.winnerTeamId = undefined;
        repaired = true;
      }
    }
  });

  updatedFixtures.forEach(f => {
    const isCupFix =
      f.competitionType === 'cup' ||
      f.competitionType === 'DOMESTIC_CUP' ||
      f.competitionType === 'DOMESTIC_COP' ||
      f.tournamentId === 'cup';

    if (isCupFix && (f.homeScore === undefined || f.awayScore === undefined)) {
      if (f.isPlayed || f.winnerTeamId) {
        f.isPlayed = false;
        f.winnerTeamId = undefined;
        repaired = true;
      }
    }
  });

  const stages: ('round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final')[] = [
    'round_of_64',
    'round_of_32',
    'round_of_16',
    'quarter',
    'semi',
    'final',
  ];

  const startStage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' =
    matches.some(m => m.stage === 'round_of_64')
      ? 'round_of_64'
      : matches.some(m => m.stage === 'round_of_32')
      ? 'round_of_32'
      : matches.some(m => m.stage === 'round_of_16')
      ? 'round_of_16'
      : 'quarter';

  const triggers = getCupStageTriggers(38, startStage, false);

  const stageMeta: Record<
    string,
    {
      arabic: string;
      trigger: number;
      nextStage?: 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final';
    }
  > = {
    round_of_64: { arabic: 'دور الـ 64', trigger: triggers.r64Trigger, nextStage: 'round_of_32' },
    round_of_32: { arabic: 'دور الـ 32', trigger: triggers.r32Trigger, nextStage: 'round_of_16' },
    round_of_16: { arabic: 'ثمن النهائي (دور الـ 16)', trigger: triggers.r16Trigger, nextStage: 'quarter' },
    quarter: { arabic: 'ربع النهائي', trigger: triggers.quarterTrigger, nextStage: 'semi' },
    semi: { arabic: 'نصف النهائي', trigger: triggers.semiTrigger, nextStage: 'final' },
    final: { arabic: 'المباراة النهائية 🏆', trigger: triggers.finalTrigger },
  };

  const resolveStageCanonicalDate = (st: string, sNum: number): string => {
    const startYear = 2026 + Math.max(0, sNum - 1);
    const map: Record<string, string> = {
      round_of_64: `${startYear}-11-10`,
      round_of_32: `${startYear}-12-08`,
      round_of_16: `${startYear + 1}-01-26`,
      quarter: `${startYear + 1}-03-16`,
      semi: `${startYear + 1}-04-20`,
      final: `${startYear + 1}-05-25`,
    };
    return map[st] || `${startYear + 1}-02-16`;
  };

  for (let sIdx = 0; sIdx < stages.length; sIdx++) {
    const stage = stages[sIdx];
    const userMatch = matches.find(
      m => m.stage === stage && (m.homeTeamId === userClubId || m.awayTeamId === userClubId)
    );
    const userFix = updatedFixtures.find(
      f =>
        (f.competitionType === 'cup' ||
          f.competitionType === 'DOMESTIC_CUP' ||
          f.competitionType === 'DOMESTIC_COP' ||
          f.tournamentId === 'cup') &&
        (f.cupStage === stage || f.stage === stage) &&
        (f.homeTeamId === userClubId || f.awayTeamId === userClubId)
    );

    if (!userMatch && !userFix) continue;

    // A match is ONLY played if it has recorded numerical scores!
    const hasActualScores =
      (userMatch && userMatch.isPlayed && userMatch.homeScore !== undefined && userMatch.awayScore !== undefined) ||
      (userFix && userFix.isPlayed && userFix.homeScore !== undefined && userFix.awayScore !== undefined);

    if (!hasActualScores) continue;

    const isUserHomeInMatch = userMatch ? userMatch.homeTeamId === userClubId : userFix?.homeTeamId === userClubId;
    const hs = userMatch?.homeScore ?? userFix?.homeScore ?? 0;
    const as = userMatch?.awayScore ?? userFix?.awayScore ?? 0;
    const hp = userMatch?.homePenalties ?? userFix?.homePenalties;
    const ap = userMatch?.awayPenalties ?? userFix?.awayPenalties;
    const userPen = isUserHomeInMatch ? hp : ap;
    const oppPen = isUserHomeInMatch ? ap : hp;
    const userGoals = isUserHomeInMatch ? hs : as;
    const oppGoals = isUserHomeInMatch ? as : hs;

    const userWonMatch =
      userMatch?.winnerTeamId === userClubId ||
      userFix?.winnerTeamId === userClubId ||
      (userPen !== undefined && oppPen !== undefined && userPen > oppPen) ||
      (userPen === undefined && oppPen === undefined && hs !== as && userGoals > oppGoals);

    if (!userWonMatch) {
      // User was eliminated in this knockout stage: record userEliminatedStage if missing and halt subsequent stage repairs!
      const stageArabic =
        stage === 'final'
          ? 'وصيف الكأس (المباراة النهائية)'
          : stageMeta[stage]?.arabic || userMatch?.stageName || userFix?.stageName || 'الكأس الوطنية';
      if (!eliminatedStage) {
        eliminatedStage = stageArabic;
        repaired = true;
      }
      break;
    }

    if (userWonMatch) {
      if (userMatch) {
        if (userMatch.winnerTeamId !== userClubId) {
          userMatch.winnerTeamId = userClubId;
          repaired = true;
        }
      }

      if (userFix) {
        if (userFix.winnerTeamId !== userClubId) {
          userFix.winnerTeamId = userClubId;
          repaired = true;
        }
      }

      // Only clear userEliminatedStage if the player has NOT lost any cup match played with a final result
      const hasLostAnyPlayedCupMatch =
        matches.some(m => {
          if (!m?.isPlayed || m.homeScore === undefined || m.awayScore === undefined) return false;
          if (m.homeTeamId !== userClubId && m.awayTeamId !== userClubId) return false;
          const isHome = m.homeTeamId === userClubId;
          const hs = m.homeScore ?? 0;
          const as = m.awayScore ?? 0;
          const myPen = isHome ? m.homePenalties : m.awayPenalties;
          const oppPen = isHome ? m.awayPenalties : m.homePenalties;
          const myGoals = isHome ? hs : as;
          const oppGoals = isHome ? as : hs;
          if (m.winnerTeamId) return m.winnerTeamId !== userClubId;
          if (myPen !== undefined && oppPen !== undefined) return myPen < oppPen;
          return myGoals < oppGoals;
        }) ||
        updatedFixtures.some(f => {
          if (!f) return false;
          const isCup =
            f.competitionType === 'cup' ||
            f.competitionType === 'DOMESTIC_CUP' ||
            f.competitionType === 'DOMESTIC_COP' ||
            f.tournamentId === 'cup';
          if (!isCup || !f.isPlayed || f.homeScore === undefined || f.awayScore === undefined) return false;
          if (f.homeTeamId !== userClubId && f.awayTeamId !== userClubId) return false;
          const isHome = f.homeTeamId === userClubId;
          const hs = f.homeScore ?? 0;
          const as = f.awayScore ?? 0;
          const myPen = isHome ? f.homePenalties : f.awayPenalties;
          const oppPen = isHome ? f.awayPenalties : f.homePenalties;
          const myGoals = isHome ? hs : as;
          const oppGoals = isHome ? as : hs;
          if (f.winnerTeamId) return f.winnerTeamId !== userClubId;
          if (myPen !== undefined && oppPen !== undefined) return myPen < oppPen;
          return myGoals < oppGoals;
        });

      if (eliminatedStage && !hasLostAnyPlayedCupMatch) {
        eliminatedStage = undefined;
        repaired = true;
      }

      // Ensure user is placed into the next stage as an UNPLAYED match
      if (sIdx < stages.length - 1) {
        const nextStage = stages[sIdx + 1];
        let nextMatches = matches.filter(m => m?.stage === nextStage);

        // If nextMatches is empty, GENERATE the next stage matches immediately!
        if (nextMatches.length === 0) {
          const currentStageMatches = matches.filter(m => m?.stage === stage);
          currentStageMatches.forEach(cm => {
            if (!cm.isPlayed) {
              const home = findClubInWorld(cm.homeTeamId) || ({ id: cm.homeTeamId, name: 'فريق الكأس' } as any);
              const away = findClubInWorld(cm.awayTeamId) || ({ id: cm.awayTeamId, name: 'فريق الكأس' } as any);
              const res = simulateKnockoutMatch(home, away);
              cm.homeScore = res.homeScore;
              cm.awayScore = res.awayScore;
              cm.homePenalties = res.homePenalties;
              cm.awayPenalties = res.awayPenalties;
              cm.winnerTeamId = res.winnerTeamId;
              cm.isPlayed = true;
              cm.events = [];
              repaired = true;
            }
          });

          const currentWinners = currentStageMatches.map(m => m.winnerTeamId || ((m.homeScore ?? 0) > (m.awayScore ?? 0) ? m.homeTeamId : m.awayTeamId));
          const otherWinners = currentWinners.filter(id => id !== userClubId);
          const nextMeta = stageMeta[nextStage];
          const numMatches = Math.max(1, Math.floor(currentWinners.length / 2));

          for (let i = 0; i < numMatches; i++) {
            const hId = (i === 0 ? userClubId : otherWinners[(i - 1) * 2 + 1]) || 'ai_cup_1';
            const aId = (i === 0 ? (otherWinners[0] || 'ai_cup_2') : otherWinners[(i - 1) * 2 + 2]) || 'ai_cup_3';
            const generatedNextMatch: CupMatch = {
              id: `cup_${nextStage}_${i + 1}_s${cup.seasonNumber || 1}`,
              stage: nextStage,
              stageName: nextMeta?.arabic || (nextStage === 'final' ? 'المباراة النهائية 🏆' : 'نصف النهائي'),
              roundTrigger: nextMeta?.trigger || (nextStage === 'final' ? 29 : 24),
              homeTeamId: hId,
              awayTeamId: aId,
              isPlayed: false,
            };
            matches.push(generatedNextMatch);
            repaired = true;
          }
          nextMatches = matches.filter(m => m?.stage === nextStage);
        }

        const userInNext = nextMatches.some(m => m?.homeTeamId === userClubId || m?.awayTeamId === userClubId);

        let targetNextMatch =
          nextMatches.find(m => m?.homeTeamId === userClubId || m?.awayTeamId === userClubId) ||
          nextMatches.find(m => !m?.isPlayed) ||
          nextMatches[0];

        if (!userInNext && nextMatches.length > 0 && targetNextMatch) {
          targetNextMatch.homeTeamId = userClubId;
          targetNextMatch.isPlayed = false;
          targetNextMatch.winnerTeamId = undefined;
          targetNextMatch.homeScore = undefined;
          targetNextMatch.awayScore = undefined;
          repaired = true;
        }

        if (targetNextMatch) {
          const nextFixes = updatedFixtures.filter(
            f =>
              f &&
              (f.competitionType === 'cup' ||
                f.competitionType === 'DOMESTIC_CUP' ||
                f.competitionType === 'DOMESTIC_COP' ||
                f.cupStage === nextStage ||
                f.id === targetNextMatch!.id) &&
              (f.cupStage === nextStage || f.stage === nextStage || f.id === targetNextMatch!.id)
          );
          const userInNextFix = nextFixes.some(f => f?.homeTeamId === userClubId || f?.awayTeamId === userClubId);
          if (nextFixes.length === 0) {
            const nextMeta = stageMeta[nextStage];
            const dateStr = resolveStageCanonicalDate(nextStage, cup.seasonNumber || 1);
            updatedFixtures.push({
              id: targetNextMatch.id,
              round: targetNextMatch.roundTrigger || nextMeta?.trigger || 29,
              homeTeamId: targetNextMatch.homeTeamId,
              awayTeamId: targetNextMatch.awayTeamId,
              competitionType: 'DOMESTIC_COP',
              competitionId: 'domestic_cup',
              tournamentId: 'cup',
              competitionName: cup.name || 'كأس مصر العريق 🏆',
              tournamentBadge: '🏆 الكأس المحلية',
              cupStage: nextStage,
              stage: nextStage,
              stageName: targetNextMatch.stageName || nextMeta?.arabic || 'المباراة النهائية 🏆',
              date: dateStr,
              timestamp: parseDateString(dateStr).getTime(),
              isPlayed: false,
            });
            repaired = true;
          } else if (!userInNextFix && nextFixes.length > 0) {
            const targetFix =
              nextFixes.find(f => f?.id === targetNextMatch!.id) || nextFixes.find(f => !f?.isPlayed) || nextFixes[0];
            const fixIdx = updatedFixtures.findIndex(f => f?.id === targetFix?.id);
            if (fixIdx !== -1) {
              updatedFixtures[fixIdx] = {
                ...updatedFixtures[fixIdx],
                id: targetNextMatch.id,
                competitionType: 'DOMESTIC_COP',
                cupStage: nextStage,
                stage: nextStage,
                date: updatedFixtures[fixIdx].date || resolveStageCanonicalDate(nextStage, cup.seasonNumber || 1),
                homeTeamId: targetNextMatch.homeTeamId,
                awayTeamId: targetNextMatch.awayTeamId,
                isPlayed: false,
                homeScore: undefined,
                awayScore: undefined,
                winnerTeamId: undefined,
              };
              repaired = true;
            }
          }
        }
      }
    }
  }

  const updatedCup: CupTournament = {
    ...cup,
    matches,
    userEliminatedStage: eliminatedStage,
  };

  return { updatedCup, updatedFixtures, repaired };
}

// ----------------------------------------------------
// 4. NEW SEASON ADVANCEMENT & TRANSITION
// ----------------------------------------------------

export function processNewSeasonAdvancement(
  currentSeason: SeasonInfo,
  summary: SeasonEndSummary,
  userClub: Club | null,
  manager: ManagerProfile,
  allTeams: Club[],
  acceptedJobOffer?: JobOffer
): {
  nextSeason: SeasonInfo;
  nextActiveLeague: LeagueDefinition;
  nextTeams: Club[];
  nextStandings: LeagueStanding[];
  nextFixtures: Fixture[];
  updatedManager: ManagerProfile;
  nextCup: CupTournament;
  historyEntry: SeasonHistoryEntry;
  newRetiredPlayers: RetiredPlayer[];
} {
  const nextSeasonNumber = currentSeason.seasonNumber + 1;

  // 1. Determine active user club & league
  let targetLeagueId = summary.leagueId;
  let targetTier = summary.nextDivisionTier;

  let nextActiveLeague: LeagueDefinition;
  let currentCountry: string;

  if (acceptedJobOffer) {
    targetLeagueId = acceptedJobOffer.leagueId;
    targetTier = acceptedJobOffer.divisionTier;
    const offerLeague = getLeagueById(acceptedJobOffer.leagueId);
    currentCountry = acceptedJobOffer.country || offerLeague.country || 'مصر';
    nextActiveLeague = offerLeague;
  } else {
    const currentLeague = getLeagueById(summary.leagueId || currentSeason.leagueId);
    // League system's country takes top authority (Welsh clubs in English pyramid like Cardiff/Swansea play in England!)
    currentCountry = currentLeague.country || userClub?.country || 'مصر';
    if (currentCountry === 'ويلز' || currentCountry === 'WAL' || currentCountry.includes('ويلز')) {
      currentCountry = 'إنجلترا';
    }
    const oldDivisionTier = userClub?.division ?? currentLeague.tier;
    const newDivisionTier = summary.nextDivisionTier ?? oldDivisionTier;

    if (newDivisionTier === oldDivisionTier) {
      nextActiveLeague = currentLeague;
    } else {
      nextActiveLeague = getLeagueByCountryAndTier(currentCountry, newDivisionTier, currentLeague.id);
    }
  }

  // 2. Prepare clubs for the next season & apply promotions/relegations to world leagues
  let leagueTeams = [...nextActiveLeague.teams];
  let nextUserClub = userClub || leagueTeams[0];

  // If user club earned promotion or relegation from the previous season:
  // Apply promotion/relegation to universe FIRST, regardless of whether manager accepts a job offer!
  if (userClub) {
    const currentLeague = getLeagueById(summary.leagueId || currentSeason.leagueId);
    const oldDivisionTier = userClub.division ?? currentLeague.tier;
    const newDivisionTier = summary.nextDivisionTier ?? oldDivisionTier;

    // If tier changed (promoted or relegated):
    if (newDivisionTier !== oldDivisionTier) {
      const targetPromotedLeague = getLeagueByCountryAndTier(currentCountry, newDivisionTier, currentLeague.id);
      let targetLeagueSquads = [...targetPromotedLeague.teams];

      const isPromoted = newDivisionTier < oldDivisionTier;
      const promotedClubData: Club = {
        ...userClub,
        division: newDivisionTier,
        country: currentCountry,
        leagueId: targetPromotedLeague.id,
        isUserClub: !acceptedJobOffer,
        budget: summary.finalBudget,
        isNewlyPromoted: isPromoted,
        previousDivision: oldDivisionTier,
      };

      const existingIdx = targetLeagueSquads.findIndex(t => t && userClub && t.id === userClub.id);
      if (existingIdx >= 0) {
        targetLeagueSquads[existingIdx] = promotedClubData;
      } else {
        // Swap with the bottom AI team of the higher division
        targetLeagueSquads[targetLeagueSquads.length - 1] = promotedClubData;
      }

      // Persist this promoted league roster so it stays in that tier in the game world
      updateLeagueRosterInWorld(targetPromotedLeague.id, targetLeagueSquads);

      // Clean up previous club from old league so it doesn't exist twice
      try {
        const oldLeague = getLeagueById(currentLeague.id);
        if (oldLeague && Array.isArray(oldLeague.teams)) {
          const cleanedOldTeams = oldLeague.teams.filter(t => t && t.id !== userClub.id);
          updateLeagueRosterInWorld(oldLeague.id, cleanedOldTeams);
        }
      } catch (e) {
        // ignore
      }

      if (!acceptedJobOffer) {
        leagueTeams = targetLeagueSquads;
        nextUserClub = promotedClubData;
      }
    } else {
      // User stayed in current league: completed a full season in this tier, so clear isNewlyPromoted
      const updatedUserClub: Club = {
        ...(userClub || ({} as Club)),
        division: targetTier,
        country: currentCountry,
        leagueId: nextActiveLeague.id,
        isUserClub: !acceptedJobOffer,
        budget: summary.finalBudget,
        isNewlyPromoted: false,
        previousDivision: oldDivisionTier,
      };

      if (!acceptedJobOffer) {
        nextUserClub = updatedUserClub;
        const existingIndex = leagueTeams.findIndex(t => t && userClub && t.id === userClub.id);
        if (existingIndex >= 0) {
          leagueTeams[existingIndex] = updatedUserClub;
        } else {
          leagueTeams[leagueTeams.length - 1] = updatedUserClub;
        }
      } else {
        try {
          const currentLeagueDef = getLeagueById(currentLeague.id);
          if (currentLeagueDef && Array.isArray(currentLeagueDef.teams)) {
            const updatedTeamsInOldLeague = currentLeagueDef.teams.map(t => t.id === userClub.id ? updatedUserClub : t);
            updateLeagueRosterInWorld(currentLeagueDef.id, updatedTeamsInOldLeague);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }

  if (acceptedJobOffer) {
    // Manager joined a new club with its OWN independent budget & authentic roster
    const normOfferId = (acceptedJobOffer.clubId || '').toLowerCase().trim();
    const normOfferName = (acceptedJobOffer.clubName || '').trim();

    // 1. Remove isUserClub from the previous club/league in world persistent data
    if (userClub) {
      const prevLeagueId = userClub.leagueId || currentSeason.leagueId;
      if (prevLeagueId) {
        try {
          const prevLeague = getLeagueById(prevLeagueId);
          if (prevLeague && Array.isArray(prevLeague.teams)) {
            const cleanedPrevTeams = prevLeague.teams.map(t => ({
              ...t,
              isUserClub: false,
            }));
            updateLeagueRosterInWorld(prevLeague.id, cleanedPrevTeams);
          }
        } catch {
          // ignore
        }
      }
    }

    let newClubFound = leagueTeams.find(t => 
      t && t.id && (
        t.id.toLowerCase() === normOfferId ||
        t.name?.trim() === normOfferName ||
        t.shortName?.trim() === normOfferName ||
        (normOfferId.includes('madrid') && t.id.toLowerCase().includes('madrid') && 
          (normOfferName.includes('أتلتيكو') ? t.name?.includes('أتلتيكو') : !t.name?.includes('أتلتيكو')))
      )
    );

    // If not found in current leagueTeams, find in world clubs
    if (!newClubFound) {
      newClubFound = findClubInWorld(acceptedJobOffer.clubId);
      if (!newClubFound) {
        for (const l of Object.values(GLOBAL_LEAGUES || {})) {
          const m = (l?.teams || []).find(t => 
            t && t.id && (
              t.id.toLowerCase() === normOfferId ||
              t.name?.trim() === normOfferName ||
              t.shortName?.trim() === normOfferName
            )
          );
          if (m) {
            newClubFound = m;
            break;
          }
        }
      }
    }

    // Failsafe: If still not found, synthesize the club from the offer details so the manager NEVER gets stuck in their old club!
    if (!newClubFound) {
      newClubFound = createClub(
        acceptedJobOffer.clubId || `club_${Date.now()}`,
        acceptedJobOffer.clubName || 'النادي الجديد',
        acceptedJobOffer.clubName || 'النادي الجديد',
        acceptedJobOffer.country || currentCountry,
        acceptedJobOffer.country || currentCountry,
        'EGY',
        targetTier,
        targetLeagueId,
        acceptedJobOffer.clubReputation || 70,
        acceptedJobOffer.squadQualityRating || 70,
        '#1e40af',
        '#ffffff',
        acceptedJobOffer.clubBudget || 5000000,
        acceptedJobOffer.transferBudget || 2000000,
        500000,
        `استاد ${acceptedJobOffer.clubName || 'النادي'}`,
        25000,
        3
      );
    }

    // Ensure authentic real roster is loaded if this is a known real club
    let clubPlayers = Array.isArray(newClubFound.players) ? [...newClubFound.players] : [];
    if (isRealClub(newClubFound.id) && clubPlayers.length < 11) {
      try {
        clubPlayers = loadRealClubSquad(newClubFound.id);
      } catch {
        // keep existing
      }
    }

    const initialClubBudget = acceptedJobOffer.transferBudget || newClubFound.budget || 250000;
    nextUserClub = {
      ...newClubFound,
      players: clubPlayers,
      isUserClub: true,
      leagueId: nextActiveLeague.id,
      division: targetTier,
      budget: initialClubBudget,
    };

    // Ensure new user club is properly placed in leagueTeams and marked as user club
    const existsIdx = leagueTeams.findIndex(t => t && t.id === nextUserClub.id);
    if (existsIdx >= 0) {
      leagueTeams = leagueTeams.map((t, idx) => {
        if (idx === existsIdx) return nextUserClub;
        return { ...t, isUserClub: false };
      });
    } else {
      // Swap with the last non-user AI club in leagueTeams so team count remains constant and even
      const replaceIdx = leagueTeams.length > 0 ? leagueTeams.length - 1 : 0;
      leagueTeams = leagueTeams.map((t, idx) => {
        if (idx === replaceIdx) return nextUserClub;
        return { ...t, isUserClub: false };
      });
    }
  }

  // 3. Flexible Retirement System (strictly between age 35 and 40) + Player Age & Contract Updates
  const newRetiredPlayers: RetiredPlayer[] = [];

  const updatedLeagueTeams = leagueTeams.map(team => {
    const squad = Array.isArray(team.players) ? team.players : [];
    const survivingPlayers: Player[] = [];

    squad.forEach(p => {
      const newAge = p.age + 1;
      const alreadyDecrementedThisSeason = (p as any).lastContractDecrementedSeason === currentSeason.seasonNumber;
      const newContractYears = alreadyDecrementedThisSeason
        ? Math.max(0, typeof p.contractYears === 'number' ? p.contractYears : 0)
        : Math.max(0, (typeof p.contractYears === 'number' ? p.contractYears : 2) - 1);

      // Flexible Retirement Age Rules:
      // - Under 35: NEVER retires (strictly 0% chance).
      // - 40 and above: 100% MANDATORY retirement (no player plays beyond 40).
      // - Between 35 and 39: progressive probability based on age, rating, and physical stamina.
      let shouldRetire = false;

      if (newAge >= 40) {
        shouldRetire = true;
      } else if (newAge >= 35) {
        let retireProbability = 0.18; // Age 35: ~18%
        if (newAge === 36) retireProbability = 0.30;
        else if (newAge === 37) retireProbability = 0.48;
        else if (newAge === 38) retireProbability = 0.70;
        else if (newAge === 39) retireProbability = 0.88;

        if (p.overallRating < 72) retireProbability += 0.12;
        if ((p.fitness || 100) < 70) retireProbability += 0.10;

        shouldRetire = Math.random() < retireProbability;
      }

      if (shouldRetire) {
        const retiredRecord: RetiredPlayer = {
          id: p.id,
          name: p.name,
          age: newAge,
          nationality: p.nationality || team.country || 'مصر',
          position: p.position,
          lastClubName: team.name,
          clubName: team.name,
          clubId: team.id,
          finalRating: p.overallRating,
          careerGoals: p.stats?.goals || 0,
          careerAssists: p.stats?.assists || 0,
          careerAppearances: (p.stats?.appearances || 0) + (p.stats?.starts || 0),
          trophiesWon: team.isUserClub ? (manager.trophies || []) : ['بطولة الدوري'],
          retirementSeason: currentSeason.seasonNumber,
          retirementYear: `${new Date().getFullYear()}`,
          legacyNote: newAge >= 38 ? 'أسطورة معتزلة أثرت الملاعب بعطائها' : 'نجم مخضرم قرر إنهاء مسيرته في القمة',
        };
        newRetiredPlayers.push(retiredRecord);
        // Player is removed from team!
      } else {
        // Reset player seasonal stats while preserving overall attributes & experience
        const resetStats: PlayerStats = {
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

        // Slight natural attribute growth for young players or decay for older players
        let overallDelta = 0;
        if (p.age < 23 && p.overallRating < p.potentialRating) {
          overallDelta = Math.floor(Math.random() * 3 + 1);
        } else if (p.age > 32) {
          overallDelta = -Math.floor(Math.random() * 2);
        }

        const newOverall = Math.min(99, Math.max(35, p.overallRating + overallDelta));
        const updatedPlayerObj: Player = {
          ...p,
          age: newAge,
          contractYears: newContractYears,
          overallRating: newOverall,
          fitness: 100,
          isInjured: false,
          injury: null,
          injuryType: undefined,
          injuryWeeks: undefined,
          injuryMatches: undefined,
          morale: Math.min(100, Math.max(70, p.morale + 10)),
          stats: resetStats,
          unhappyMatchesCount: 0,
          transferRequestSubmitted: false,
        };
        if (newOverall > p.overallRating) {
          updatedPlayerObj.marketValue = syncPlayerMarketValueWithRating(updatedPlayerObj, p.overallRating);
        }

        survivingPlayers.push(updatedPlayerObj);
      }
    });

    // Ensure squad maintains healthy competitive depth (at least 20 players across all positions)
    let replenishIdx = 1;
    while (survivingPlayers.length < 20) {
      const gks = survivingPlayers.filter(p => p.positionCategory === 'GK').length;
      const defs = survivingPlayers.filter(p => p.positionCategory === 'DEF').length;
      const mids = survivingPlayers.filter(p => p.positionCategory === 'MID').length;
      const fwds = survivingPlayers.filter(p => p.positionCategory === 'FWD').length;

      let pos: Position = 'CM';
      if (gks < 2) pos = 'GK';
      else if (defs < 5) pos = defs % 2 === 0 ? 'CB' : (defs % 3 === 0 ? 'LB' : 'RB');
      else if (mids < 5) pos = mids % 2 === 0 ? 'CM' : 'CDM';
      else if (fwds < 4) pos = fwds % 2 === 0 ? 'ST' : 'RW';
      else {
        const fallbackPositions: Position[] = ['ST', 'CM', 'CB', 'LB', 'RB', 'GK'];
        pos = fallbackPositions[Math.floor(Math.random() * fallbackPositions.length)];
      }

      const cat: PositionCategory = pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB'].includes(pos) ? 'DEF' : ['CM', 'CDM', 'CAM'].includes(pos) ? 'MID' : 'FWD';
      const baseRating = Math.max(58, Math.min(82, (team.reputation ? Math.round(team.reputation * 0.85) : 68) + Math.floor(Math.random() * 5 - 2)));

      const freshYouth: Player = {
        id: `youth_replenish_${team.id}_s${currentSeason.seasonNumber + 1}_${Date.now()}_${replenishIdx++}`,
        name: `صاعد جديد (${pos} #${replenishIdx})`,
        age: Math.floor(Math.random() * 4 + 17),
        position: pos,
        positionCategory: cat,
        overallRating: baseRating,
        potentialRating: Math.min(92, baseRating + Math.floor(Math.random() * 10 + 6)),
        attributes: {
          pace: Math.floor(Math.random() * 15 + 65),
          shooting: cat === 'FWD' ? baseRating + 2 : 55,
          passing: cat === 'MID' ? baseRating + 2 : 60,
          dribbling: cat === 'FWD' || cat === 'MID' ? baseRating : 58,
          defending: cat === 'DEF' ? baseRating + 2 : (pos === 'GK' ? 20 : 48),
          physical: Math.floor(Math.random() * 12 + 64),
          goalkeeping: pos === 'GK' ? baseRating + 3 : 20,
        },
        nationality: team.country || 'مصر',
        marketValue: Math.round(baseRating * 12000),
        salary: Math.round(baseRating * 50),
        contractYears: 3,
        fitness: 100,
        morale: 90,
        form: 7,
        number: Math.floor(Math.random() * 50 + 40),
        stats: { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0, averageRating: 7.0, motm: 0 },
      };
      survivingPlayers.push(freshYouth);
    }

    let teamBudget = team.budget;
    let youthProspects = team.youthAcademyProspects;
    let teamDevPoints = team.developmentPoints || 0;

    if (team.isUserClub) {
      if (acceptedJobOffer) {
        teamBudget = acceptedJobOffer.transferBudget || team.budget || 250000;
      } else {
        teamBudget = summary.finalBudget;
      }
      teamDevPoints = (team.developmentPoints || 0) + (summary.developmentPointsEarned || 0);
      // Generate new intake of promising youngsters for the user club
      youthProspects = generateYouthAcademyBatch(team, currentSeason.seasonNumber + 1);
    }

    // Clean up tactics from any retired player IDs
    const survivingIds = new Set(survivingPlayers.map(p => p.id));
    const cleanStartingIds = (team.tactics?.startingPlayerIds || []).filter(id => survivingIds.has(id));
    const cleanBenchIds = (team.tactics?.benchPlayerIds || []).filter(id => survivingIds.has(id));

    // Fill missing starting slots if any retired
    survivingPlayers.forEach(p => {
      if (cleanStartingIds.length < 11 && !cleanStartingIds.includes(p.id) && !cleanBenchIds.includes(p.id)) {
        cleanStartingIds.push(p.id);
      }
    });

    const cleanTactics = team.tactics ? {
      ...team.tactics,
      startingPlayerIds: cleanStartingIds.slice(0, 11),
      benchPlayerIds: cleanBenchIds.slice(0, 7),
      captainId: survivingIds.has(team.tactics.captainId) ? team.tactics.captainId : (survivingPlayers[0]?.id || ''),
      penaltyTakerId: survivingIds.has(team.tactics.penaltyTakerId) ? team.tactics.penaltyTakerId : (survivingPlayers[0]?.id || ''),
    } : undefined;

    return {
      ...team,
      isUserClub: team.id === nextUserClub.id,
      players: survivingPlayers,
      tactics: cleanTactics,
      budget: teamBudget,
      developmentPoints: teamDevPoints,
      youthAcademyProspects: youthProspects,
      seasonPromotedYouthCount: 0,
    };
  });

  // Also persist this active league roster to world
  updateLeagueRosterInWorld(nextActiveLeague.id, updatedLeagueTeams);

  // 6. Initialize Next Season National Cup Tournament for the active country
  const nextCup = initNationalCupTournament(
    nextSeasonNumber,
    nextActiveLeague.country || 'مصر',
    updatedLeagueTeams,
    nextUserClub,
    Math.max(18, (updatedLeagueTeams.length - 1) * 2)
  );

  // 4. Generate New Season Schedule & Standings (League + National Cup)
  const nextFixtures = generateMasterSeasonAgenda(
    nextSeasonNumber,
    nextActiveLeague,
    updatedLeagueTeams,
    nextCup,
    undefined,
    nextUserClub
  );
  const nextStandings = generateInitialStandings(updatedLeagueTeams);

  // 5. Update Permanent Manager Profile
  const trophiesWonThisSeason: string[] = [];
  if (summary.leagueTrophyAwarded) trophiesWonThisSeason.push(summary.leagueTrophyAwarded);
  if (summary.cupTrophyAwarded) trophiesWonThisSeason.push(summary.cupTrophyAwarded);

  const effectiveUserClub = nextUserClub || userClub || allTeams.find(t => t.isUserClub) || allTeams[0];

  const historyEntry: SeasonHistoryEntry = {
    seasonNumber: currentSeason.seasonNumber,
    seasonYear: `الموسم ${currentSeason.seasonNumber}`,
    clubId: summary.clubId,
    clubName: summary.clubName,
    country: effectiveUserClub?.country || (currentSeason.leagueName.includes('مصر') ? 'مصر' : 'دولي'),
    leagueName: summary.leagueName,
    divisionTier: summary.divisionTier,
    finalPosition: summary.finalPosition,
    totalTeams: summary.totalTeams,
    played: summary.played,
    wins: summary.wins,
    draws: summary.draws,
    losses: summary.losses,
    goalsFor: summary.goalsFor,
    goalsAgainst: summary.goalsAgainst,
    goalDifference: summary.goalDifference,
    points: summary.points,
    trophiesWon: trophiesWonThisSeason,
    resultStatus: summary.resultStatus,
    outcome: summary.resultStatus,
    resultText: summary.resultTitle,
    cupResult: summary.cupResultText,
    managerXpEarned: summary.xpEarned,
    seasonEarnings: summary.prizeMoney + (summary.wins * 2000),
  };

  const allClubsManaged = Array.from(new Set([...(manager.clubsManaged || []), summary.clubName, nextUserClub.name]));
  const allCountriesManaged = Array.from(new Set([...(manager.countriesManaged || []), effectiveUserClub?.country || 'مصر', nextActiveLeague.country]));
  const allTrophies = [...(manager.trophies || []), ...trophiesWonThisSeason];

  // Conquered Leagues & World Domination calculation
  const prevConquered = manager.conqueredLeagues || [];
  const wonLeagueId = (summary.resultStatus === 'champion' && summary.leagueId) ? summary.leagueId : null;
  const newConqueredLeagues = wonLeagueId && !prevConquered.includes(wonLeagueId)
    ? [...prevConquered, wonLeagueId]
    : prevConquered;
  const totalPossibleLeagues = Object.keys(GLOBAL_LEAGUES).length;
  const worldDominationPercentage = Math.min(100, Math.round((newConqueredLeagues.length / totalPossibleLeagues) * 100));

  // Ensure End-of-Season Financial & License Settlement is applied exactly once per season
  const alreadySettledThisSeason = manager.lastSettledSeasonNumber === currentSeason.seasonNumber || !!summary.licenseSettlement;
  let settledManagerState = manager;
  if (!alreadySettledThisSeason) {
    const seasonBonusFallback = Math.round(summary.prizeMoney * 0.15) + ((manager.personalSalary || 15000) * 12);
    const settlementResult = settleEndOfSeasonLicenseAndBonus(manager, seasonBonusFallback, currentSeason.seasonNumber);
    settledManagerState = settlementResult.updatedManager;
  }

  const updatedManager: ManagerProfile = {
    ...settledManagerState,
    currentClubId: nextUserClub.id,
    currentClubName: nextUserClub.name,
    employmentStatus: 'employed',
    isUnemployed: false,
    age: settledManagerState.age + 1,
    reputation: Math.min(100, Math.max(1, settledManagerState.reputation + summary.reputationChange)),
    totalSeasons: settledManagerState.totalSeasons + 1,
    leagueTitles: settledManagerState.leagueTitles + (summary.resultStatus === 'champion' ? 1 : 0),
    cupTitles: settledManagerState.cupTitles + (summary.cupTrophyAwarded ? 1 : 0),
    promotions: settledManagerState.promotions + (summary.resultStatus === 'promoted' || (summary.resultStatus === 'champion' && summary.divisionTier > 1) ? 1 : 0),
    relegations: settledManagerState.relegations + (summary.resultStatus === 'relegated' ? 1 : 0),
    clubsManaged: allClubsManaged,
    countriesManaged: allCountriesManaged,
    highestLeagueReached: settledManagerState.highestLeagueReached ? `${settledManagerState.highestLeagueReached}, ${nextActiveLeague.name}` : nextActiveLeague.name,
    highestManagerLevel: Math.max(settledManagerState.highestManagerLevel, settledManagerState.level),
    highestReputation: Math.max(settledManagerState.highestReputation, settledManagerState.reputation + summary.reputationChange),
    developmentPoints: (settledManagerState.developmentPoints || 0) + (summary.developmentPointsEarned || 0),
    trophies: allTrophies,
    careerEarnings: settledManagerState.careerEarnings + summary.prizeMoney,
    personalWallet: settledManagerState.personalWallet || 0,
    totalBonusesEarned: settledManagerState.totalBonusesEarned || 0,
    conqueredLeagues: newConqueredLeagues,
    worldDominationPercentage,
    financialTransactions: (settledManagerState.financialTransactions || []).slice(0, 30),
    history: [historyEntry, ...(settledManagerState.history || [])],
  };

  // Setup Next Season Info
  const nextSeason: SeasonInfo = {
    seasonId: `season_${nextSeasonNumber}_${Date.now()}`,
    seasonNumber: nextSeasonNumber,
    startDate: `الموسم ${nextSeasonNumber}`,
    endDate: `نهاية الموسم ${nextSeasonNumber}`,
    currentRound: 1,
    totalRounds: nextFixtures.length > 0 ? Math.max(...nextFixtures.map(f => f.round)) : Math.max(10, (updatedLeagueTeams.length - 1) * 2),
    status: 'active',
    leagueId: nextActiveLeague.id,
    leagueName: nextActiveLeague.name,
    divisionTier: nextActiveLeague.tier,
  };

  return {
    nextSeason,
    nextActiveLeague,
    nextTeams: updatedLeagueTeams,
    nextStandings,
    nextFixtures,
    updatedManager,
    nextCup,
    historyEntry,
    newRetiredPlayers,
  };
}
