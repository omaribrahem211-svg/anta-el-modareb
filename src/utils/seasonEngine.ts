import {
  Club,
  CupMatch,
  CupTournament,
  Fixture,
  JobOffer,
  LeagueDefinition,
  LeagueStanding,
  ManagerProfile,
  Player,
  PlayerStats,
  SeasonEndSummary,
  SeasonHistoryEntry,
  SeasonInfo,
  RetiredPlayer,
} from '../types/game';
import { getLeagueByCountryAndTier, getLeagueById, GLOBAL_LEAGUES, updateLeagueRosterInWorld, getCustomLeagues, getAllClubsForCountry, findClubInWorld, createClub } from '../data/leaguesData';
import { generateLeagueSchedule, generateInitialStandings } from '../data/initialData';
import { simulateMatch } from './engine';
import { simulateKnockoutMatch } from './continentalEngine';
import { generateYouthAcademyBatch } from './youthAcademyEngine';
import { checkCupStageAdvancementRewards, StageRewardInfo } from './rewardsEngine';
import { isRealClub, loadRealClubSquad } from '../data/realPlayersData';

// ----------------------------------------------------
// 1. END OF SEASON RESULT CALCULATION
// ----------------------------------------------------

export function calculateSeasonEndSummary(
  season: SeasonInfo,
  standings: LeagueStanding[],
  userClub: Club,
  activeLeague: LeagueDefinition,
  cupTournament: CupTournament | null,
  manager: ManagerProfile
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

  // Next Destination Tier
  let nextDivisionTier = activeLeague.tier;
  if (resultStatus === 'champion' || resultStatus === 'promoted') {
    nextDivisionTier = Math.max(1, activeLeague.tier - 1);
  } else if (resultStatus === 'relegated') {
    nextDivisionTier = Math.min(4, activeLeague.tier + 1);
  }
  const nextLeague = getLeagueByCountryAndTier(activeLeague.country, nextDivisionTier);

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
  const sponsorsList = Array.isArray(userClub?.sponsors) ? userClub.sponsors : [];
  const sponsorshipTotal = sponsorsList.reduce((sum, sp) => sum + (sp?.monthlyPayment || 0) * 6, 0);

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
    nextDivisionTier,
    leagueTrophyAwarded,
    cupTrophyAwarded,
    cupResultText,
    prizeMoney,
    ticketRevenueTotal,
    sponsorshipTotal,
    xpEarned,
    reputationChange,
    finalBudget,
    developmentPointsEarned,
    developmentPointsBreakdown,
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
export function generateSeasonJobOffers(
  manager: ManagerProfile,
  currentClub: Club,
  currentLeague: LeagueDefinition,
  finalPosition: number
): JobOffer[] {
  const offers: JobOffer[] = [];
  const rep = manager.reputation || 15;
  const level = manager.level || 1;
  const totalTeams = currentLeague.teams.length;

  // Performance classification
  const isChampion = finalPosition === 1;
  const isPromoted = finalPosition <= currentLeague.promotionSpots && currentLeague.tier > 1;
  const isTopThree = finalPosition <= 3;
  const isTopHalf = finalPosition <= Math.ceil(totalTeams / 2);
  const isRelegated = currentLeague.relegationSpots > 0 && finalPosition > (totalTeams - currentLeague.relegationSpots);

  // Compute effective manager appeal & momentum
  let effectiveAppeal = rep;
  if (isChampion) effectiveAppeal += 18;
  else if (isPromoted) effectiveAppeal += 12;
  else if (isTopThree) effectiveAppeal += 7;
  else if (isTopHalf) effectiveAppeal += 3;
  else if (isRelegated) effectiveAppeal -= 12;

  // Gather all potential clubs across global leagues
  const allClubsWithLeagues: { club: Club; league: LeagueDefinition }[] = [];
  Object.values(GLOBAL_LEAGUES).forEach(league => {
    league.teams.forEach(c => {
      if (c.id !== currentClub.id && !c.isUserClub) {
        allClubsWithLeagues.push({ club: c, league });
      }
    });
  });

  // Offer Pool Builders for Diverse Tiers:
  // 1. Domestic Step-Up / Same Country
  const domesticCandidates = allClubsWithLeagues.filter(({ club, league }) => {
    if (league.country !== currentLeague.country) return false;
    // If promoted, look for higher tier or same tier with higher reputation
    if (isChampion || isPromoted) {
      return league.tier <= currentLeague.tier && club.reputation <= effectiveAppeal + 18;
    }
    if (isTopThree || isTopHalf) {
      return Math.abs(club.reputation - effectiveAppeal) <= 22;
    }
    return league.tier >= currentLeague.tier && club.reputation <= effectiveAppeal + 8;
  });

  // 2. Arab Region Contenders (Saudi Arabia, UAE, Qatar, Morocco, Tunisia, Algeria)
  const arabCountryNames = ['المملكة العربية السعودية', 'الإمارات العربية المتحدة', 'قطر', 'المغرب', 'تونس', 'الجزائر'];
  const arabCandidates = allClubsWithLeagues.filter(({ club, league }) => {
    if (!arabCountryNames.includes(league.country)) return false;
    if (league.country === currentLeague.country) return false; // Cross-border

    // Tier matching
    if (currentLeague.tier >= 3 && rep < 40) {
      // Lower tier manager can get Saudi Tier 2 (Yellow League) or rising Arab clubs
      return league.tier === 2 || (league.tier === 1 && club.reputation <= 68);
    }
    if (currentLeague.tier >= 2 && rep < 60) {
      return club.reputation <= effectiveAppeal + 18;
    }
    // Premier/Higher tier manager
    return club.reputation <= effectiveAppeal + 22;
  });

  // 3. European Gateway & Giants (Spain La Liga 2/1, England Championship/Premier, France, Italy, Germany)
  const europeanCountryNames = ['إسبانيا', 'إنجلترا', 'فرنسا', 'إيطاليا', 'ألمانيا'];
  const europeanCandidates = allClubsWithLeagues.filter(({ club, league }) => {
    if (!europeanCountryNames.includes(league.country)) return false;

    // Progression rules for Europe:
    // - Rep 35-55: Tier 2 Europe (Championship, La Liga 2) or lower-mid
    // - Rep 56-75: Upper Tier 2 or mid-table Tier 1
    // - Rep 76+: Top European Giants
    if (effectiveAppeal < 35 && !isChampion && !isPromoted) return false;

    if (effectiveAppeal < 55) {
      return league.tier === 2 || (league.tier === 1 && club.reputation <= 70);
    }
    if (effectiveAppeal < 75) {
      return (league.tier === 2 && club.reputation >= 65) || (league.tier === 1 && club.reputation <= 84);
    }
    return league.tier === 1 && club.reputation <= effectiveAppeal + 14;
  });

  // 4. Latin America & Exotic Challenges (Brazil, Argentina)
  const latamCountryNames = ['البرازيل', 'الأرجنتين'];
  const latamCandidates = allClubsWithLeagues.filter(({ club, league }) => {
    if (!latamCountryNames.includes(league.country)) return false;
    return club.reputation <= effectiveAppeal + 20;
  });

  // 5. High Budget / Ambitious Revival Projects
  const rebuildCandidates = allClubsWithLeagues.filter(({ club, league }) => {
    return club.reputation <= effectiveAppeal + 12 && club.reputation >= 35;
  });

  // Pick balanced selections to create a thrilling 3-5 offers menu
  const selectedPicks: { club: Club; league: LeagueDefinition; category: JobOffer['offerCategory']; badge: string }[] = [];
  const usedClubIds = new Set<string>();

  const pickCandidate = (
    pool: { club: Club; league: LeagueDefinition }[],
    category: JobOffer['offerCategory'],
    badge: string
  ) => {
    const available = pool.filter(p => !usedClubIds.has(p.club.id));
    if (available.length === 0) return;
    const item = available[Math.floor(Math.random() * available.length)];
    usedClubIds.add(item.club.id);
    selectedPicks.push({ ...item, category, badge });
  };

  // Domestic Step-up (Always available unless relegated badly)
  if (domesticCandidates.length > 0) {
    const badge = currentLeague.country === 'مصر' ? 'عملاق محلي 🇪🇬' : `تحدي محلي 📌`;
    pickCandidate(domesticCandidates, 'domestic_stepup', badge);
  }

  // Arab Regional Opportunity
  if (arabCandidates.length > 0) {
    pickCandidate(arabCandidates, 'arab_challenge', 'تحدي عربي طموح 🏆');
  }

  // European Gateway (If manager is doing well or has decent rep)
  if (europeanCandidates.length > 0 && (isChampion || isPromoted || isTopThree || rep >= 35)) {
    const euroBadge = rep >= 75 ? 'عملاق أوروبي عالمي 🌟' : 'بوابة الاحتراف الأوروبي 🌍';
    pickCandidate(europeanCandidates, 'european_leap', euroBadge);
  }

  // Latin America Opportunity (Brazil/Argentina)
  if (latamCandidates.length > 0 && (isChampion || isPromoted || isTopHalf || rep >= 45)) {
    pickCandidate(latamCandidates, 'continental_champions', 'سحر الكرة اللاتينية 🇧🇷');
  }

  // Ambitious Rebuild / Big Budget Challenge
  if (rebuildCandidates.length > 0 && selectedPicks.length < 4) {
    pickCandidate(rebuildCandidates, 'rebuild_project', 'مشروع صعود وطموح تاريخي 🚀');
  }

  // If still fewer than 3 offers, fill from general candidate pool
  if (selectedPicks.length < 3 && allClubsWithLeagues.length > 0) {
    const fallbacks = allClubsWithLeagues.filter(p => !usedClubIds.has(p.club.id) && p.club.reputation <= effectiveAppeal + 15);
    while (selectedPicks.length < 3 && fallbacks.length > 0) {
      const idx = Math.floor(Math.random() * fallbacks.length);
      const fallbackItem = fallbacks.splice(idx, 1)[0];
      usedClubIds.add(fallbackItem.club.id);
      selectedPicks.push({
        ...fallbackItem,
        category: 'rebuild_project',
        badge: 'فرصة تدريبية ممتازة ⚽',
      });
    }
  }

  // Build full rich JobOffer items
  selectedPicks.forEach(({ club, league, category, badge }, idx) => {
    const salaryBase = Math.round(club.reputation * 450 + level * 700 + (effectiveAppeal * 250));
    
    // Dynamic Expectations based on league & club reputation
    let expectations = '';
    if (league.tier === 1) {
      if (club.reputation >= 85) {
        expectations = 'التتويج بلقب الدوري والمنافسة الشرسة على دوري الأبطال القاري';
      } else if (club.reputation >= 70) {
        expectations = 'إنهاء الموسم في المربع الذهبي والتأهل للبطولات القارية';
      } else {
        expectations = 'تأمين البقاء بمركز متقدم في وسط الجدول وبناء هوية تكتيكية صلبة';
      }
    } else if (league.tier === 2) {
      expectations = 'المنافسة المباشرة على بطاقة الصعود للدوري الممتاز';
    } else {
      expectations = 'تحقيق الصعود وتطوير جيل شاب من قطاع الناشئين';
    }

    // Dynamic tailored Arabic justifications matching performance & country
    let interestReason = '';
    if (category === 'european_leap') {
      interestReason = `تتابع الإدارة الفنية لنادي ${club.name} في (${league.name}) تألقك اللافت مع ${currentClub.name}، وترى أن أسلوبك التكتيكي وشخصيتك القيادية مؤهلة للنجاح في الكرة الأوروبية.`;
    } else if (category === 'arab_challenge') {
      interestReason = `رصدت لجنة التخطيط بنادي ${club.name} نتائجك المتميزة في ${currentLeague.shortName}، وتضع بين يديك مشروعاً عربياً طموحاً بميزانية قوية للمنافسة على الألقاب.`;
    } else if (isChampion) {
      interestReason = `أعرب مسؤولو ${club.name} عن إعجابهم الشديد بتتويجك بطلاً للدوري مع ${currentClub.name}، ويرون فيك المدرب البطل القادر على كتابة التاريخ مع فريقهم.`;
    } else if (isPromoted) {
      interestReason = `جذبت قيادتك الحكيمة وتحقيق الصعود المستحق اهتمام إدارة ${club.name}، وترغب في الاستفادة من فكرك التنظيمي لإحداث ثورة فنية في النادي.`;
    } else if (isTopThree) {
      interestReason = `لفتت صلابة فريقك التكتيكية وإنهاؤك الموسم في المربع الذهبي (المركز ${finalPosition}) أنظار كشافي ${club.name} لقيادة مشروعهم القادم.`;
    } else {
      interestReason = `يقدر مسؤولو نادي ${club.name} مرونتك الخططية وثبات نتائجك، ويرون فيك الرجل المناسب لتحقيق تطلعات الجماهير وإعادة التوازن للفريق.`;
    }

    // Transfer budget with realistic boost
    const transferBudget = club.transferBudget || Math.max(150000, Math.round(club.budget * 0.45));
    const wageBudget = club.wageBudgetMonthly || Math.max(20000, Math.round(club.budget * 0.35));

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
      offerCategory: category,
      categoryBadge: badge,
      interestReason,
      minimumLevelRequired: Math.max(1, Math.floor(club.reputation / 15)),
      minimumReputationRequired: Math.max(5, club.reputation - 20),
      primaryColor: club.primaryColor || '#1e293b',
      secondaryColor: club.secondaryColor || '#ffffff',
      managerSalary: salaryBase,
      transferBudget,
      wageBudgetMonthly: wageBudget,
      boardExpectations: expectations,
      contractDurationYears: Math.floor(Math.random() * 2 + 2),
      stadiumName: club.facilities?.stadiumName || `ملعب ${club.name}`,
      stadiumCapacity: club.facilities?.stadiumCapacity || (league.tier === 1 ? 25000 : 8000),
      currentPositionInLeague: Math.floor(Math.random() * 4 + 1),
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

  if (totalLeagueRounds >= 30) {
    // 38-round league schedule (20 clubs playing 38 matchdays)
    if (isContinentalActive) {
      if (stage === 'round_of_64') {
        return {
          r64Trigger: 6,
          r32Trigger: 15,
          r16Trigger: 28,
          quarterTrigger: 36,
          semiTrigger: 44,
          finalTrigger: 52,
          totalSeasonRounds: 53,
        };
      } else if (stage === 'round_of_32') {
        return {
          r64Trigger: -1,
          r32Trigger: 10,
          r16Trigger: 28,
          quarterTrigger: 36,
          semiTrigger: 44,
          finalTrigger: 51,
          totalSeasonRounds: 52,
        };
      } else if (stage === 'round_of_16') {
        return {
          r64Trigger: -1,
          r32Trigger: -1,
          r16Trigger: 18,
          quarterTrigger: 36,
          semiTrigger: 44,
          finalTrigger: 50,
          totalSeasonRounds: 51,
        };
      } else {
        return {
          r64Trigger: -1,
          r32Trigger: -1,
          r16Trigger: -1,
          quarterTrigger: 24,
          semiTrigger: 36,
          finalTrigger: 49,
          totalSeasonRounds: 50,
        };
      }
    } else {
      if (stage === 'round_of_64') {
        return {
          r64Trigger: 3,
          r32Trigger: 11,
          r16Trigger: 20,
          quarterTrigger: 29,
          semiTrigger: 37,
          finalTrigger: 43,
          totalSeasonRounds: 44,
        };
      } else if (stage === 'round_of_32') {
        return {
          r64Trigger: -1,
          r32Trigger: 7,
          r16Trigger: 16,
          quarterTrigger: 25,
          semiTrigger: 34,
          finalTrigger: 42,
          totalSeasonRounds: 43,
        };
      } else if (stage === 'round_of_16') {
        return {
          r64Trigger: -1,
          r32Trigger: -1,
          r16Trigger: 10,
          quarterTrigger: 21,
          semiTrigger: 32,
          finalTrigger: 41,
          totalSeasonRounds: 42,
        };
      } else {
        return {
          r64Trigger: -1,
          r32Trigger: -1,
          r16Trigger: -1,
          quarterTrigger: 15,
          semiTrigger: 28,
          finalTrigger: 40,
          totalSeasonRounds: 41,
        };
      }
    }
  } else {
    // Legacy 14-round league calendar fallback (8 teams)
    if (isContinentalActive) {
      return {
        r64Trigger: stage === 'round_of_64' ? 4 : -1,
        r32Trigger: stage === 'round_of_64' ? 9 : 4,
        r16Trigger: 14,
        quarterTrigger: 19,
        semiTrigger: 23,
        finalTrigger: 27,
        totalSeasonRounds: 28,
      };
    } else if (stage === 'round_of_64') {
      return {
        r64Trigger: 2,
        r32Trigger: 5,
        r16Trigger: 9,
        quarterTrigger: 13,
        semiTrigger: 17,
        finalTrigger: 19,
        totalSeasonRounds: 20,
      };
    } else if (stage === 'round_of_32') {
      return {
        r64Trigger: -1,
        r32Trigger: 3,
        r16Trigger: 7,
        quarterTrigger: 11,
        semiTrigger: 15,
        finalTrigger: 18,
        totalSeasonRounds: 19,
      };
    } else {
      return {
        r64Trigger: -1,
        r32Trigger: -1,
        r16Trigger: 5,
        quarterTrigger: 9,
        semiTrigger: 13,
        finalTrigger: 17,
        totalSeasonRounds: 18,
      };
    }
  }
}

export function initNationalCupTournament(
  seasonNumber: number,
  country: string,
  teams: Club[],
  userClub?: Club | null,
  totalLeagueRounds: number = 38
): CupTournament {
  const trophyName = country === 'مصر' ? 'كأس مصر العريق 🏆' : `كأس ${country} الوطنية 🏆`;
  
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
    id: `cup_s${seasonNumber}_${Date.now()}`,
    name: trophyName,
    country,
    seasonNumber,
    trophyName,
    prizeMoneyWinner: 250000,
    prizeMoneyRunnerUp: 100000,
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
  cupTournament: CupTournament,
  continentalTournament?: any,
  userClub?: Club | null
): Fixture[] {
  const masterFixtures: Fixture[] = [];
  const teamIds = (leagueTeams || []).map(t => t?.id).filter(Boolean) as string[];
  const n = teamIds.length;

  // 1. Generate 14 League Matchdays (7 first leg + 7 second leg)
  const halfRounds = n > 1 ? n - 1 : 1; // 7
  const leagueRounds: { homeId: string; awayId: string }[][] = [];

  // First leg (7 rounds)
  for (let r = 0; r < halfRounds; r++) {
    const roundMatches: { homeId: string; awayId: string }[] = [];
    for (let i = 0; i < n / 2; i++) {
      const homeIdx = (r + i) % (n - 1);
      let awayIdx = (n - 1 - i + r) % (n - 1);
      if (i === 0) awayIdx = n - 1;
      roundMatches.push({
        homeId: teamIds[homeIdx],
        awayId: teamIds[awayIdx],
      });
    }
    leagueRounds.push(roundMatches);
  }

  // Second leg (7 rounds) - reverse home & away
  for (let r = 0; r < halfRounds; r++) {
    const roundMatches: { homeId: string; awayId: string }[] = [];
    const firstLeg = leagueRounds[r];
    for (const match of firstLeg) {
      roundMatches.push({
        homeId: match.awayId,
        awayId: match.homeId,
      });
    }
    leagueRounds.push(roundMatches);
  }

  const isContinentalActive = !!continentalTournament;
  const cupMatches = cupTournament?.matches || [];
  const startStage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' =
    cupMatches.some(m => m?.stage === 'round_of_64')
      ? 'round_of_64'
      : cupMatches.some(m => m?.stage === 'round_of_32')
      ? 'round_of_32'
      : cupMatches.some(m => m?.stage === 'round_of_16')
      ? 'round_of_16'
      : 'quarter';

  const roundMapping = buildMasterRoundMapping(leagueRounds.length, startStage, isContinentalActive);

  roundMapping.forEach(rm => {
    if (rm.type === 'league' && rm.leagueIndex !== undefined) {
      const matches = leagueRounds[rm.leagueIndex] || [];
      matches.forEach(m => {
        masterFixtures.push({
          id: `fix_league_r${rm.round}_${m.homeId}_${m.awayId}_s${seasonNumber}`,
          round: rm.round,
          homeTeamId: m.homeId,
          awayTeamId: m.awayId,
          competitionType: 'league',
          competitionName: activeLeague?.name || 'الدوري العام',
          stageName: rm.stageName,
          isPlayed: false,
        });
      });
    } else if (rm.type === 'cup' && rm.cupStage) {
      const stageMatches = cupMatches.filter(m => m?.stage === rm.cupStage);
      if (stageMatches.length > 0) {
        stageMatches.forEach((qm, idx) => {
          masterFixtures.push({
            id: qm?.id || `fix_cup_${rm.cupStage}_${idx + 1}_s${seasonNumber}`,
            round: rm.round,
            homeTeamId: qm?.homeTeamId || '',
            awayTeamId: qm?.awayTeamId || '',
            competitionType: 'cup',
            competitionName: cupTournament?.name || 'كأس البطولة',
            cupStage: rm.cupStage,
            stageName: rm.stageName,
            isPlayed: qm?.isPlayed || false,
          });
        });
      } else {
        // Placeholder slots for future cup stages
        const count = rm.cupStage === 'round_of_64' ? 32 : rm.cupStage === 'round_of_32' ? 16 : rm.cupStage === 'round_of_16' ? 8 : rm.cupStage === 'quarter' ? 4 : rm.cupStage === 'semi' ? 2 : 1;
        for (let p = 1; p <= count; p++) {
          masterFixtures.push({
            id: `fix_cup_${rm.cupStage}_${p}_s${seasonNumber}`,
            round: rm.round,
            homeTeamId: '',
            awayTeamId: '',
            competitionType: 'cup',
            competitionName: cupTournament?.name || 'كأس البطولة',
            cupStage: rm.cupStage,
            stageName: rm.stageName,
            isPlayed: false,
          });
        }
      }
    } else if (rm.type === 'continental' && continentalTournament) {
      if (rm.contStage === 'group' && rm.contMD) {
        const mdMatches = (continentalTournament.matches || []).filter(
          (m: any) => m.stage === 'group' && m.matchday === rm.contMD
        );
        mdMatches.forEach((cm: any, idx: number) => {
          masterFixtures.push({
            id: cm.id || `fix_cont_md${rm.contMD}_${idx}_s${seasonNumber}`,
            round: rm.round,
            homeTeamId: cm.homeTeamId,
            awayTeamId: cm.awayTeamId,
            competitionType: 'continental',
            competitionName: continentalTournament.name,
            cupStage: continentalTournament.competitionId === 'ccl' ? 'دوري أبطال إفريقيا' : 'دوري أبطال أوروبا',
            stageName: rm.stageName,
            groupId: cm.groupId,
            isPlayed: cm.isPlayed || false,
          });
        });
      } else if (rm.contStage === 'quarter') {
        const qfMatches = (continentalTournament.matches || []).filter((m: any) => m.stage === 'quarter');
        if (qfMatches.length > 0) {
          qfMatches.forEach((qm: any, idx: number) => {
            masterFixtures.push({
              id: qm.id || `fix_cont_qf_${idx + 1}_s${seasonNumber}`,
              round: rm.round,
              homeTeamId: qm.homeTeamId,
              awayTeamId: qm.awayTeamId,
              competitionType: 'continental',
              competitionName: continentalTournament.name,
              cupStage: continentalTournament.competitionId === 'ccl' ? 'دوري أبطال إفريقيا' : 'دوري أبطال أوروبا',
              stageName: rm.stageName,
              isPlayed: qm.isPlayed || false,
            });
          });
        } else {
          for (let q = 1; q <= 4; q++) {
            masterFixtures.push({
              id: `fix_cont_qf_${q}_s${seasonNumber}`,
              round: rm.round,
              homeTeamId: '',
              awayTeamId: '',
              competitionType: 'continental',
              competitionName: continentalTournament.name,
              cupStage: continentalTournament.competitionId === 'ccl' ? 'دوري أبطال إفريقيا' : 'دوري أبطال أوروبا',
              stageName: `ربع النهائي - مباراة ${q}`,
              isPlayed: false,
            });
          }
        }
      } else if (rm.contStage === 'semi') {
        const sfMatches = (continentalTournament.matches || []).filter((m: any) => m.stage === 'semi');
        if (sfMatches.length > 0) {
          sfMatches.forEach((sm: any, idx: number) => {
            masterFixtures.push({
              id: sm.id || `fix_cont_sf_${idx + 1}_s${seasonNumber}`,
              round: rm.round,
              homeTeamId: sm.homeTeamId,
              awayTeamId: sm.awayTeamId,
              competitionType: 'continental',
              competitionName: continentalTournament.name,
              cupStage: continentalTournament.competitionId === 'ccl' ? 'دوري أبطال إفريقيا' : 'دوري أبطال أوروبا',
              stageName: rm.stageName,
              isPlayed: sm.isPlayed || false,
            });
          });
        } else {
          for (let s = 1; s <= 2; s++) {
            masterFixtures.push({
              id: `fix_cont_sf_${s}_s${seasonNumber}`,
              round: rm.round,
              homeTeamId: '',
              awayTeamId: '',
              competitionType: 'continental',
              competitionName: continentalTournament.name,
              cupStage: continentalTournament.competitionId === 'ccl' ? 'دوري أبطال إفريقيا' : 'دوري أبطال أوروبا',
              stageName: `نصف النهائي - مباراة ${s}`,
              isPlayed: false,
            });
          }
        }
      } else if (rm.contStage === 'final') {
        const finalMatch = (continentalTournament.matches || []).find((m: any) => m.stage === 'final');
        masterFixtures.push({
          id: finalMatch?.id || `fix_cont_final_s${seasonNumber}`,
          round: rm.round,
          homeTeamId: finalMatch?.homeTeamId || '',
          awayTeamId: finalMatch?.awayTeamId || '',
          competitionType: 'continental',
          competitionName: continentalTournament.name,
          cupStage: continentalTournament.competitionId === 'ccl' ? 'دوري أبطال إفريقيا' : 'دوري أبطال أوروبا',
          stageName: rm.stageName,
          isPlayed: finalMatch?.isPlayed || false,
        });
      }
    }
  });

  return masterFixtures;
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

  if (totalLeagueRounds >= 30) {
    // 38-round league schedule (20 clubs playing 38 matchdays)
    const triggers = getCupStageTriggers(totalLeagueRounds, stage, isContinentalActive);
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
      contRoundsMap.set(4, { stage: 'group', md: 1, name: 'دوري الأبطال - المجموعات (الجولة 1)' });
      contRoundsMap.set(8, { stage: 'group', md: 2, name: 'دوري الأبطال - المجموعات (الجولة 2)' });
      contRoundsMap.set(12, { stage: 'group', md: 3, name: 'دوري الأبطال - المجموعات (الجولة 3)' });
      contRoundsMap.set(hasR64 ? 18 : 16, { stage: 'group', md: 4, name: 'دوري الأبطال - المجموعات (الجولة 4)' });
      contRoundsMap.set(hasR64 ? 22 : 20, { stage: 'group', md: 5, name: 'دوري الأبطال - المجموعات (الجولة 5)' });
      contRoundsMap.set(hasR64 ? 26 : 24, { stage: 'group', md: 6, name: 'دوري الأبطال - المجموعات (الجولة 6)' });
      contRoundsMap.set(32, { stage: 'quarter', name: 'دوري الأبطال - ربع النهائي' });
      contRoundsMap.set(40, { stage: 'semi', name: 'دوري الأبطال - نصف النهائي' });
      contRoundsMap.set(48, { stage: 'final', name: 'نهائي دوري الأبطال القاري الكبير 🏆' });
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
        const leagueNum = leagueIdx + 1;
        let stageName = `الدوري - الجولة ${leagueNum}`;
        if (leagueNum === 19) stageName = 'الدوري - الجولة 19 (ختام الدور الأول)';
        else if (leagueNum === 20) stageName = 'الدوري - الجولة 20 (افتتاح الدور الثاني)';
        else if (leagueNum === totalLeagueRounds) stageName = `الدوري - الجولة ${leagueNum} (الجولة الختامية الحاسمة)`;

        mapping.push({
          round: r,
          type: 'league',
          leagueIndex: leagueIdx,
          stageName,
        });
        leagueIdx++;
      }
    }
    return mapping;
  }

  // Legacy 14-round mapping (for 8-team leagues)
  if (isContinentalActive) {
    return [
      { round: 1, type: 'league', leagueIndex: 0, stageName: 'الدوري - الجولة 1' },
      { round: 2, type: 'league', leagueIndex: 1, stageName: 'الدوري - الجولة 2' },
      { round: 3, type: 'continental', contStage: 'group', contMD: 1, stageName: 'دوري الأبطال - المجموعات (الجولة 1)' },
      { round: 4, type: 'cup', cupStage: hasR64 ? 'round_of_64' : 'round_of_32', stageName: hasR64 ? 'الكأس الوطنية - دور الـ 64 🏆' : 'الكأس الوطنية - دور الـ 32 🏆' },
      { round: 5, type: 'league', leagueIndex: 2, stageName: 'الدوري - الجولة 3' },
      { round: 6, type: 'continental', contStage: 'group', contMD: 2, stageName: 'دوري الأبطال - المجموعات (الجولة 2)' },
      { round: 7, type: 'league', leagueIndex: 3, stageName: 'الدوري - الجولة 4' },
      { round: 8, type: 'continental', contStage: 'group', contMD: 3, stageName: 'دوري الأبطال - المجموعات (الجولة 3)' },
      { round: 9, type: 'cup', cupStage: 'round_of_16', stageName: 'الكأس الوطنية - ثمن النهائي (دور الـ 16) 🏆' },
      { round: 10, type: 'league', leagueIndex: 4, stageName: 'الدوري - الجولة 5' },
      { round: 11, type: 'continental', contStage: 'group', contMD: 4, stageName: 'دوري الأبطال - المجموعات (الجولة 4)' },
      { round: 12, type: 'league', leagueIndex: 5, stageName: 'الدوري - الجولة 6' },
      { round: 13, type: 'league', leagueIndex: 6, stageName: 'الدوري - الجولة 7 (ختام الدور الأول)' },
      { round: 14, type: 'continental', contStage: 'group', contMD: 5, stageName: 'دوري الأبطال - المجموعات (الجولة 5)' },
      { round: 15, type: 'cup', cupStage: 'quarter', stageName: 'الكأس الوطنية - ربع النهائي 🏆' },
      { round: 16, type: 'continental', contStage: 'group', contMD: 6, stageName: 'دوري الأبطال - المجموعات (الجولة 6)' },
      { round: 17, type: 'league', leagueIndex: 7, stageName: 'الدوري - الجولة 8' },
      { round: 18, type: 'continental', contStage: 'quarter', stageName: 'دوري الأبطال - ربع النهائي' },
      { round: 19, type: 'league', leagueIndex: 8, stageName: 'الدوري - الجولة 9' },
      { round: 20, type: 'cup', cupStage: 'semi', stageName: 'الكأس الوطنية - نصف النهائي 🏆' },
      { round: 21, type: 'continental', contStage: 'semi', stageName: 'دوري الأبطال - نصف النهائي' },
      { round: 22, type: 'league', leagueIndex: 9, stageName: 'الدوري - الجولة 10' },
      { round: 23, type: 'continental', contStage: 'final', stageName: 'نهائي دوري الأبطال القاري الكبير 🏆' },
      { round: 24, type: 'league', leagueIndex: 10, stageName: 'الدوري - الجولة 11' },
      { round: 25, type: 'league', leagueIndex: 11, stageName: 'الدوري - الجولة 12' },
      { round: 26, type: 'league', leagueIndex: 12, stageName: 'الدوري - الجولة 13' },
      { round: 27, type: 'cup', cupStage: 'final', stageName: 'نهائي الكأس الوطنية الكبير 🏆' },
      { round: 28, type: 'league', leagueIndex: 13, stageName: 'الدوري - الجولة 14 (الجولة الختامية الحاسمة)' },
    ];
  } else if (hasR64) {
    return [
      { round: 1, type: 'league', leagueIndex: 0, stageName: 'الدوري - الجولة 1' },
      { round: 2, type: 'cup', cupStage: 'round_of_64', stageName: 'الكأس الوطنية - دور الـ 64 (مشاركة جميع الأندية) 🏆' },
      { round: 3, type: 'league', leagueIndex: 1, stageName: 'الدوري - الجولة 2' },
      { round: 4, type: 'league', leagueIndex: 2, stageName: 'الدوري - الجولة 3' },
      { round: 5, type: 'cup', cupStage: 'round_of_32', stageName: 'الكأس الوطنية - دور الـ 32 🏆' },
      { round: 6, type: 'league', leagueIndex: 3, stageName: 'الدوري - الجولة 4' },
      { round: 7, type: 'league', leagueIndex: 4, stageName: 'الدوري - الجولة 5' },
      { round: 8, type: 'league', leagueIndex: 5, stageName: 'الدوري - الجولة 6' },
      { round: 9, type: 'cup', cupStage: 'round_of_16', stageName: 'الكأس الوطنية - ثمن النهائي (دور الـ 16) 🏆' },
      { round: 10, type: 'league', leagueIndex: 6, stageName: 'الدوري - الجولة 7 (ختام الدور الأول)' },
      { round: 11, type: 'league', leagueIndex: 7, stageName: 'الدوري - الجولة 8' },
      { round: 12, type: 'league', leagueIndex: 8, stageName: 'الدوري - الجولة 9' },
      { round: 13, type: 'cup', cupStage: 'quarter', stageName: 'الكأس الوطنية - ربع النهائي 🏆' },
      { round: 14, type: 'league', leagueIndex: 9, stageName: 'الدوري - الجولة 10' },
      { round: 15, type: 'league', leagueIndex: 10, stageName: 'الدوري - الجولة 11' },
      { round: 16, type: 'league', leagueIndex: 11, stageName: 'الدوري - الجولة 12' },
      { round: 17, type: 'cup', cupStage: 'semi', stageName: 'الكأس الوطنية - نصف النهائي 🏆' },
      { round: 18, type: 'league', leagueIndex: 12, stageName: 'الدوري - الجولة 13' },
      { round: 19, type: 'cup', cupStage: 'final', stageName: 'نهائي الكأس الوطنية الكبير 🏆' },
      { round: 20, type: 'league', leagueIndex: 13, stageName: 'الدوري - الجولة 14 (الجولة الختامية الحاسمة)' },
    ];
  } else {
    return [
      { round: 1, type: 'league', leagueIndex: 0, stageName: 'الدوري - الجولة 1' },
      { round: 2, type: 'league', leagueIndex: 1, stageName: 'الدوري - الجولة 2' },
      { round: 3, type: 'cup', cupStage: 'round_of_32', stageName: 'الكأس الوطنية - دور الـ 32 🏆' },
      { round: 4, type: 'league', leagueIndex: 2, stageName: 'الدوري - الجولة 3' },
      { round: 5, type: 'league', leagueIndex: 3, stageName: 'الدوري - الجولة 4' },
      { round: 6, type: 'league', leagueIndex: 4, stageName: 'الدوري - الجولة 5' },
      { round: 7, type: 'cup', cupStage: 'round_of_16', stageName: 'الكأس الوطنية - ثمن النهائي (دور الـ 16) 🏆' },
      { round: 8, type: 'league', leagueIndex: 5, stageName: 'الدوري - الجولة 6' },
      { round: 9, type: 'league', leagueIndex: 6, stageName: 'الدوري - الجولة 7 (ختام الدور الأول)' },
      { round: 10, type: 'league', leagueIndex: 7, stageName: 'الدوري - الجولة 8' },
      { round: 11, type: 'cup', cupStage: 'quarter', stageName: 'الكأس الوطنية - ربع النهائي 🏆' },
      { round: 12, type: 'league', leagueIndex: 8, stageName: 'الدوري - الجولة 9' },
      { round: 13, type: 'league', leagueIndex: 9, stageName: 'الدوري - الجولة 10' },
      { round: 14, type: 'league', leagueIndex: 10, stageName: 'الدوري - الجولة 11' },
      { round: 15, type: 'cup', cupStage: 'semi', stageName: 'الكأس الوطنية - نصف النهائي 🏆' },
      { round: 16, type: 'league', leagueIndex: 11, stageName: 'الدوري - الجولة 12' },
      { round: 17, type: 'league', leagueIndex: 12, stageName: 'الدوري - الجولة 13' },
      { round: 18, type: 'cup', cupStage: 'final', stageName: 'نهائي الكأس الوطنية الكبير 🏆' },
      { round: 19, type: 'league', leagueIndex: 13, stageName: 'الدوري - الجولة 14 (الجولة الختامية الحاسمة)' },
    ];
  }
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

  let matches = [...cup.matches];
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

  // Determine which cup stage is triggered by this calendar round dynamically
  const inferredLeagueRounds = totalLeagueRounds || (allTeams.length > 1 ? (allTeams.length - 1) * 2 : 38);
  const triggers = getCupStageTriggers(inferredLeagueRounds, startStage, isContinentalActive);
  const r64Trigger = triggers.r64Trigger;
  const r32Trigger = triggers.r32Trigger;
  const r16Trigger = triggers.r16Trigger;
  const quarterTrigger = triggers.quarterTrigger;
  const semiTrigger = triggers.semiTrigger;
  const finalTrigger = triggers.finalTrigger;

  // 1. Round of 64 Trigger
  if (currentRound === r64Trigger) {
    const stageR64 = matches.filter(m => m.stage === 'round_of_64');
    if (stageR64.length > 0) {
      const qualifiedR32Ids: string[] = [];

      stageR64.forEach(match => {
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
          match.events = res.events;
          match.stats = res.stats;

          if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
            cupMatchThisRound = match;
            if (res.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'دور الـ 64';
            }
          }
        } else {
          if (userClub && (match.homeTeamId === userClub.id || match.awayTeamId === userClub.id)) {
            cupMatchThisRound = match;
            if (match.winnerTeamId && match.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'دور الـ 64';
            }
          }
        }

        if (match.winnerTeamId) {
          qualifiedR32Ids.push(match.winnerTeamId);
        } else {
          qualifiedR32Ids.push(match.homeTeamId);
        }
      });

      // Check if R32 matches already exist to avoid duplicate generation
      const existingR32 = matches.filter(m => m.stage === 'round_of_32');
      if (existingR32.length === 0 && qualifiedR32Ids.length >= 32) {
        for (let i = 0; i < 16; i++) {
          const r32Match: CupMatch = {
            id: `cup_r32_${i + 1}_s${cup.seasonNumber}`,
            stage: 'round_of_32',
            stageName: 'دور الـ 32',
            roundTrigger: r32Trigger,
            homeTeamId: qualifiedR32Ids[i * 2],
            awayTeamId: qualifiedR32Ids[i * 2 + 1],
            isPlayed: false,
          };
          matches.push(r32Match);
          newMatchesCreated.push(r32Match);
        }
      }

      cupNewsMessage = '🏆 اختتام منافسات دور الـ 64 من كأس مصر وتأهل 32 نادياً رسمياً إلى دور الـ 32!';
    }
  }

  // 2. Round of 32 Trigger
  if (currentRound === r32Trigger) {
    const stageR32 = matches.filter(m => m.stage === 'round_of_32');
    if (stageR32.length > 0) {
      const qualifiedR16Ids: string[] = [];

      stageR32.forEach(match => {
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
          match.events = res.events;
          match.stats = res.stats;

          if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
            cupMatchThisRound = match;
            if (res.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'دور الـ 32';
            }
          }
        } else {
          if (userClub && (match.homeTeamId === userClub.id || match.awayTeamId === userClub.id)) {
            cupMatchThisRound = match;
            if (match.winnerTeamId && match.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'دور الـ 32';
            }
          }
        }

        if (match.winnerTeamId) {
          qualifiedR16Ids.push(match.winnerTeamId);
        } else {
          qualifiedR16Ids.push(match.homeTeamId);
        }
      });

      // Check if R16 matches already exist to avoid duplicate generation
      const existingR16 = matches.filter(m => m.stage === 'round_of_16');
      if (existingR16.length === 0 && qualifiedR16Ids.length >= 16) {
        for (let i = 0; i < 8; i++) {
          const r16Match: CupMatch = {
            id: `cup_r16_${i + 1}_s${cup.seasonNumber}`,
            stage: 'round_of_16',
            stageName: 'ثمن النهائي (دور الـ 16)',
            roundTrigger: r16Trigger,
            homeTeamId: qualifiedR16Ids[i * 2],
            awayTeamId: qualifiedR16Ids[i * 2 + 1],
            isPlayed: false,
          };
          matches.push(r16Match);
          newMatchesCreated.push(r16Match);
        }
      }

      cupNewsMessage = '🏆 اختتام منافسات دور الـ 32 من كأس مصر وتأهل 16 نادياً رسمياً إلى ثمن النهائي!';
    }
  }

  // 3. Round of 16 Trigger
  if (currentRound === r16Trigger) {
    const stageR16 = matches.filter(m => m.stage === 'round_of_16');
    if (stageR16.length > 0) {
      const qualifiedQuarterIds: string[] = [];

      stageR16.forEach(match => {
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
          match.events = res.events;
          match.stats = res.stats;

          if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
            cupMatchThisRound = match;
            if (res.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'ثمن النهائي (دور الـ 16)';
            }
          }
        } else {
          if (userClub && (match.homeTeamId === userClub.id || match.awayTeamId === userClub.id)) {
            cupMatchThisRound = match;
            if (match.winnerTeamId && match.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'ثمن النهائي (دور الـ 16)';
            }
          }
        }

        if (match.winnerTeamId) {
          qualifiedQuarterIds.push(match.winnerTeamId);
        } else {
          qualifiedQuarterIds.push(match.homeTeamId);
        }
      });

      // Check if Quarter matches already exist
      const existingQuarters = matches.filter(m => m.stage === 'quarter');
      if (existingQuarters.length === 0 && qualifiedQuarterIds.length >= 8) {
        for (let i = 0; i < 4; i++) {
          const qMatch: CupMatch = {
            id: `cup_q_${i + 1}_s${cup.seasonNumber}`,
            stage: 'quarter',
            stageName: 'ربع النهائي',
            roundTrigger: quarterTrigger,
            homeTeamId: qualifiedQuarterIds[i * 2],
            awayTeamId: qualifiedQuarterIds[i * 2 + 1],
            isPlayed: false,
          };
          matches.push(qMatch);
          newMatchesCreated.push(qMatch);
        }
      }

      cupNewsMessage = '🏆 نهاية مباريات ثمن النهائي في الكأس واكتمال عقد الأندية المتأهلة لربع النهائي!';
    }
  }

  // 4. Quarterfinals Trigger
  if (currentRound === quarterTrigger) {
    const stageQuarters = matches.filter(m => m.stage === 'quarter');
    if (stageQuarters.length > 0) {
      const semiQualifiedIds: string[] = [];

      stageQuarters.forEach(qMatch => {
        if (!qMatch.isPlayed) {
          const homeTeam = getFullClub(qMatch.homeTeamId);
          const awayTeam = getFullClub(qMatch.awayTeamId);
          const res = simulateKnockoutMatch(homeTeam, awayTeam);

          qMatch.homeScore = res.homeScore;
          qMatch.awayScore = res.awayScore;
          qMatch.homePenalties = res.homePenalties;
          qMatch.awayPenalties = res.awayPenalties;
          qMatch.isPlayed = true;
          qMatch.winnerTeamId = res.winnerTeamId;
          qMatch.events = res.events;
          qMatch.stats = res.stats;

          if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
            cupMatchThisRound = qMatch;
            if (res.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'ربع النهائي';
            }
          }
        } else {
          if (userClub && (qMatch.homeTeamId === userClub.id || qMatch.awayTeamId === userClub.id)) {
            cupMatchThisRound = qMatch;
            if (qMatch.winnerTeamId && qMatch.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'ربع النهائي';
            }
          }
        }

        if (qMatch.winnerTeamId) {
          semiQualifiedIds.push(qMatch.winnerTeamId);
        } else {
          semiQualifiedIds.push(qMatch.homeTeamId);
        }
      });

      // Check if Semi matches already exist
      const existingSemis = matches.filter(m => m.stage === 'semi');
      if (existingSemis.length === 0 && semiQualifiedIds.length >= 4) {
        const semi1: CupMatch = {
          id: `cup_semi1_s${cup.seasonNumber}`,
          stage: 'semi',
          stageName: 'نصف النهائي',
          roundTrigger: semiTrigger,
          homeTeamId: semiQualifiedIds[0],
          awayTeamId: semiQualifiedIds[1],
          isPlayed: false,
        };
        const semi2: CupMatch = {
          id: `cup_semi2_s${cup.seasonNumber}`,
          stage: 'semi',
          stageName: 'نصف النهائي',
          roundTrigger: semiTrigger,
          homeTeamId: semiQualifiedIds[2],
          awayTeamId: semiQualifiedIds[3],
          isPlayed: false,
        };
        matches.push(semi1, semi2);
        newMatchesCreated.push(semi1, semi2);
      }

      cupNewsMessage = '🏆 تأهل 4 أندية كبرى إلى المربع الذهبي (نصف نهائي كأس مصر) في مواجهات حارقة!';
    }
  }

  // 5. Semifinals Trigger
  if (currentRound === semiTrigger) {
    const stageSemis = matches.filter(m => m.stage === 'semi');
    if (stageSemis.length > 0) {
      const finalQualifiedIds: string[] = [];

      stageSemis.forEach(sMatch => {
        if (!sMatch.isPlayed) {
          const homeTeam = getFullClub(sMatch.homeTeamId);
          const awayTeam = getFullClub(sMatch.awayTeamId);
          const res = simulateKnockoutMatch(homeTeam, awayTeam);

          sMatch.homeScore = res.homeScore;
          sMatch.awayScore = res.awayScore;
          sMatch.homePenalties = res.homePenalties;
          sMatch.awayPenalties = res.awayPenalties;
          sMatch.isPlayed = true;
          sMatch.winnerTeamId = res.winnerTeamId;
          sMatch.events = res.events;
          sMatch.stats = res.stats;

          if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
            cupMatchThisRound = sMatch;
            if (res.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'نصف النهائي';
            }
          }
        } else {
          if (userClub && (sMatch.homeTeamId === userClub.id || sMatch.awayTeamId === userClub.id)) {
            cupMatchThisRound = sMatch;
            if (sMatch.winnerTeamId && sMatch.winnerTeamId !== userClub.id) {
              cup.userEliminatedStage = 'نصف النهائي';
            }
          }
        }

        if (sMatch.winnerTeamId) {
          finalQualifiedIds.push(sMatch.winnerTeamId);
        } else {
          finalQualifiedIds.push(sMatch.homeTeamId);
        }
      });

      // Check if Final match already exists
      const existingFinal = matches.find(m => m.stage === 'final');
      if (!existingFinal && finalQualifiedIds.length >= 2) {
        const finalMatch: CupMatch = {
          id: `cup_final_s${cup.seasonNumber}`,
          stage: 'final',
          stageName: 'المباراة النهائية 🏆',
          roundTrigger: finalTrigger,
          homeTeamId: finalQualifiedIds[0],
          awayTeamId: finalQualifiedIds[1],
          isPlayed: false,
        };
        matches.push(finalMatch);
        newMatchesCreated.push(finalMatch);
      }

      cupNewsMessage = '🏆 تم تحديد طرفي المباراة النهائية لكأس مصر في قمة كروية منتظرة!';
    }
  }

  // 6. Final Trigger
  if (currentRound === finalTrigger) {
    const finalMatch = matches.find(m => m.stage === 'final');
    if (finalMatch) {
      if (!finalMatch.isPlayed) {
        const homeTeam = getFullClub(finalMatch.homeTeamId);
        const awayTeam = getFullClub(finalMatch.awayTeamId);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);

        finalMatch.homeScore = res.homeScore;
        finalMatch.awayScore = res.awayScore;
        finalMatch.homePenalties = res.homePenalties;
        finalMatch.awayPenalties = res.awayPenalties;
        finalMatch.isPlayed = true;
        finalMatch.winnerTeamId = res.winnerTeamId;
        finalMatch.events = res.events;
        finalMatch.stats = res.stats;

        if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
          cupMatchThisRound = finalMatch;
        }
      } else if (!finalMatch.winnerTeamId) {
        if ((finalMatch.homeScore || 0) > (finalMatch.awayScore || 0)) {
          finalMatch.winnerTeamId = finalMatch.homeTeamId;
        } else if ((finalMatch.awayScore || 0) > (finalMatch.homeScore || 0)) {
          finalMatch.winnerTeamId = finalMatch.awayTeamId;
        } else {
          finalMatch.winnerTeamId = (finalMatch.homePenalties || 0) >= (finalMatch.awayPenalties || 0) ? finalMatch.homeTeamId : finalMatch.awayTeamId;
        }
      }

      cup.isCompleted = true;
      cup.winnerClubId = finalMatch.winnerTeamId;
      cup.runnerUpClubId = finalMatch.winnerTeamId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;

      if (userClub && finalMatch.winnerTeamId === userClub.id) {
        cup.userEliminatedStage = undefined;
      } else if (userClub && (finalMatch.homeTeamId === userClub.id || finalMatch.awayTeamId === userClub.id)) {
        cup.userEliminatedStage = 'وصيف الكأس (المباراة النهائية)';
      }

      const winnerClub = getFullClub(cup.winnerClubId);
      cupNewsMessage = `🏆 تتويج رسمي: نادي ${winnerClub.name} يتوج بطلاً لـ ${cup.trophyName || cup.name} بعد ملحمة كروية كبرى!`;
    }
  }

  // Safety Verification: If final match is played, always ensure cup is marked as completed and winner is set
  const anyFinal = matches.find(m => m.stage === 'final');
  if (anyFinal && anyFinal.isPlayed) {
    if (!anyFinal.winnerTeamId) {
      if ((anyFinal.homeScore || 0) > (anyFinal.awayScore || 0)) {
        anyFinal.winnerTeamId = anyFinal.homeTeamId;
      } else if ((anyFinal.awayScore || 0) > (anyFinal.homeScore || 0)) {
        anyFinal.winnerTeamId = anyFinal.awayTeamId;
      } else {
        anyFinal.winnerTeamId = (anyFinal.homePenalties || 0) >= (anyFinal.awayPenalties || 0) ? anyFinal.homeTeamId : anyFinal.awayTeamId;
      }
    }
    cup.isCompleted = true;
    cup.winnerClubId = anyFinal.winnerTeamId;
    cup.runnerUpClubId = anyFinal.winnerTeamId === anyFinal.homeTeamId ? anyFinal.awayTeamId : anyFinal.homeTeamId;
    if (userClub && anyFinal.winnerTeamId === userClub.id) {
      cup.userEliminatedStage = undefined;
    } else if (userClub && (anyFinal.homeTeamId === userClub.id || anyFinal.awayTeamId === userClub.id)) {
      cup.userEliminatedStage = 'وصيف الكأس (المباراة النهائية)';
    }
  }

  const cupWithMatches = {
    ...cup,
    matches,
  };

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
    currentCountry = userClub?.country || currentLeague.country || 'مصر';
    const oldDivisionTier = userClub?.division ?? currentLeague.tier;
    const newDivisionTier = summary.nextDivisionTier ?? oldDivisionTier;

    if (newDivisionTier === oldDivisionTier) {
      nextActiveLeague = currentLeague;
    } else {
      nextActiveLeague = getLeagueByCountryAndTier(currentCountry, newDivisionTier);
    }
  }

  // 2. Prepare clubs for the next season & apply promotions/relegations to world leagues
  let leagueTeams = [...nextActiveLeague.teams];
  let nextUserClub = userClub || leagueTeams[0];

  // If user club earned promotion or relegation from the previous season:
  if (userClub && !acceptedJobOffer) {
    const currentLeague = getLeagueById(summary.leagueId || currentSeason.leagueId);
    const oldDivisionTier = userClub.division ?? currentLeague.tier;
    const newDivisionTier = summary.nextDivisionTier ?? oldDivisionTier;

    // If tier changed (promoted or relegated):
    if (newDivisionTier !== oldDivisionTier) {
      const targetPromotedLeague = getLeagueByCountryAndTier(currentCountry, newDivisionTier);
      let targetLeagueSquads = [...targetPromotedLeague.teams];

      const isPromoted = newDivisionTier < oldDivisionTier;
      const promotedClubData: Club = {
        ...userClub,
        division: newDivisionTier,
        country: currentCountry,
        leagueId: targetPromotedLeague.id,
        isUserClub: true,
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

      leagueTeams = targetLeagueSquads;
      nextUserClub = promotedClubData;
    } else {
      // User stayed in current league
      const updatedUserClub: Club = {
        ...(userClub || {} as Club),
        division: targetTier,
        country: currentCountry,
        leagueId: nextActiveLeague.id,
        isUserClub: true,
        budget: summary.finalBudget,
      };
      nextUserClub = updatedUserClub;

      const existingIndex = leagueTeams.findIndex(t => t && userClub && t.id === userClub.id);
      if (existingIndex >= 0) {
        leagueTeams[existingIndex] = updatedUserClub;
      } else {
        leagueTeams[leagueTeams.length - 1] = updatedUserClub;
      }
    }
  } else if (acceptedJobOffer) {
    // Manager joined a new club with its OWN independent budget & authentic roster
    const normOfferId = (acceptedJobOffer.clubId || '').toLowerCase().trim();
    const normOfferName = (acceptedJobOffer.clubName || '').trim();

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

    if (newClubFound) {
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
      const existsIdx = leagueTeams.findIndex(t => t.id === nextUserClub.id);
      if (existsIdx >= 0) {
        leagueTeams = leagueTeams.map((t, idx) => {
          if (idx === existsIdx) return nextUserClub;
          return { ...t, isUserClub: false };
        });
      } else {
        leagueTeams = [nextUserClub, ...leagueTeams.map(t => ({ ...t, isUserClub: false }))];
      }
    }
  }

  // 3. Flexible Retirement System (strictly between age 35 and 40) + Player Age & Contract Updates
  const newRetiredPlayers: RetiredPlayer[] = [];

  const updatedLeagueTeams = leagueTeams.map(team => {
    const squad = Array.isArray(team.players) ? team.players : [];
    const survivingPlayers: Player[] = [];

    squad.forEach(p => {
      const newAge = p.age + 1;
      const newContractYears = Math.max(0, p.contractYears - 1);

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

        survivingPlayers.push({
          ...p,
          age: newAge,
          contractYears: newContractYears,
          overallRating: newOverall,
          fitness: 100,
          morale: Math.min(100, Math.max(70, p.morale + 10)),
          stats: resetStats,
          unhappyMatchesCount: 0,
          transferRequestSubmitted: false,
        });
      }
    });

    // If squad size drops below 16 due to retirements, promote a promising youth
    if (survivingPlayers.length < 16) {
      const positionsNeeded: Player['position'][] = ['ST', 'CM', 'CB', 'GK'];
      const pos = positionsNeeded[Math.floor(Math.random() * positionsNeeded.length)];
      const freshYouth: Player = {
        id: `youth_replenish_${team.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: `صاعد جديد (${pos})`,
        age: 18,
        position: pos,
        positionCategory: pos === 'GK' ? 'GK' : pos === 'CB' ? 'DEF' : pos === 'CM' ? 'MID' : 'FWD',
        overallRating: Math.floor(Math.random() * 6 + 65),
        potentialRating: Math.floor(Math.random() * 10 + 78),
        attributes: {
          pace: 68,
          shooting: pos === 'ST' ? 70 : 58,
          passing: pos === 'CM' ? 70 : 60,
          dribbling: 65,
          defending: pos === 'CB' ? 70 : 50,
          physical: 66,
          goalkeeping: pos === 'GK' ? 68 : 20,
        },
        nationality: team.country || 'مصر',
        marketValue: 350000,
        salary: 3000,
        contractYears: 3,
        fitness: 100,
        morale: 90,
        form: 7,
        number: Math.floor(Math.random() * 40 + 50),
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

  // 6. Setup Next Season Info & Cup
  const nextCup = initNationalCupTournament(nextSeasonNumber, nextActiveLeague.country, updatedLeagueTeams, nextUserClub);

  // 4. Generate New Season Schedule & Standings with Cup Synchronization
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
    resultText: summary.resultTitle,
    cupResult: summary.cupResultText,
    managerXpEarned: summary.xpEarned,
    seasonEarnings: summary.prizeMoney + (summary.wins * 2000),
  };

  const allClubsManaged = Array.from(new Set([...(manager.clubsManaged || []), summary.clubName, nextUserClub.name]));
  const allCountriesManaged = Array.from(new Set([...(manager.countriesManaged || []), effectiveUserClub?.country || 'مصر', nextActiveLeague.country]));
  const allTrophies = [...(manager.trophies || []), ...trophiesWonThisSeason];

  const updatedManager: ManagerProfile = {
    ...manager,
    currentClubId: nextUserClub.id,
    currentClubName: nextUserClub.name,
    employmentStatus: 'employed',
    isUnemployed: false,
    age: manager.age + 1,
    reputation: Math.min(100, Math.max(1, manager.reputation + summary.reputationChange)),
    totalSeasons: manager.totalSeasons + 1,
    leagueTitles: manager.leagueTitles + (summary.resultStatus === 'champion' ? 1 : 0),
    cupTitles: manager.cupTitles + (summary.cupTrophyAwarded ? 1 : 0),
    promotions: manager.promotions + (summary.resultStatus === 'promoted' || (summary.resultStatus === 'champion' && summary.divisionTier > 1) ? 1 : 0),
    relegations: manager.relegations + (summary.resultStatus === 'relegated' ? 1 : 0),
    clubsManaged: allClubsManaged,
    countriesManaged: allCountriesManaged,
    highestLeagueReached: manager.highestLeagueReached ? `${manager.highestLeagueReached}, ${nextActiveLeague.name}` : nextActiveLeague.name,
    highestManagerLevel: Math.max(manager.highestManagerLevel, manager.level),
    highestReputation: Math.max(manager.highestReputation, manager.reputation + summary.reputationChange),
    developmentPoints: (manager.developmentPoints || 0) + (summary.developmentPointsEarned || 0),
    trophies: allTrophies,
    careerEarnings: manager.careerEarnings + summary.prizeMoney,
    personalWallet: (manager.personalWallet || 0) + Math.round(summary.prizeMoney * 0.15),
    totalBonusesEarned: (manager.totalBonusesEarned || 0) + Math.round(summary.prizeMoney * 0.15),
    financialTransactions: [
      {
        id: `tx_season_end_${Date.now()}`,
        date: `ختام الموسم ${manager.totalSeasons}`,
        amount: Math.round(summary.prizeMoney * 0.15),
        type: 'trophy_bonus' as const,
        description: `مكافأة حصاد ختام الموسم ${manager.totalSeasons} وإنجاز المركز #${summary.finalPosition}`,
      },
      ...(manager.financialTransactions || []),
    ].slice(0, 30),
    history: [historyEntry, ...(manager.history || [])],
  };

  // Setup Next Season Info
  const nextSeason: SeasonInfo = {
    seasonId: `season_${nextSeasonNumber}_${Date.now()}`,
    seasonNumber: nextSeasonNumber,
    startDate: `الموسم ${nextSeasonNumber}`,
    endDate: `نهاية الموسم ${nextSeasonNumber}`,
    currentRound: 1,
    totalRounds: nextFixtures.length > 0 ? Math.max(...nextFixtures.map(f => f.round)) : 44,
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
