import {
  Club,
  CupTournament,
  ContinentalTournament,
  LeagueDefinition,
  LeagueStanding,
  ManagerProfile,
  SeasonEndSummary,
  SeasonInfo,
} from '../types/game';
import { CalendarManager, CalendarScheduleItem } from './calendarManager';
import {
  initContinentalTournamentByCode,
  resolveClubContinent,
  getContinentalCodesForContinent,
  isClubEligibleForContinentalQualification,
  isEuropeanCountry,
  isAsianCountry,
} from '../utils/continentalEngine';
import {
  calculateSeasonEndSummary,
  initNationalCupTournament,
} from '../utils/seasonEngine';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { resolveCountryContinent } from '../data/realClubsData';
import { getLeagueByCountryAndTier, findClubInWorld } from '../data/leaguesData';

export interface ContinentalQualifications {
  primaryContinentalCode: 'ccl' | 'ucl' | 'acl';
  secondaryContinentalCode: 'ccc' | 'uel' | 'acl2';
  cclQualifiedClubIds: string[]; // 1st & 2nd in Premier League (Tier 1) ONLY
  cccQualifiedClubIds: string[]; // Cup Winner & 3rd/4th in Premier League (Tier 1) ONLY
  qualificationNotes: string[];
}

export interface SeasonTransitionResult {
  nextSeason: SeasonInfo;
  nextStartDate: string;
  seasonEndSummary: SeasonEndSummary;
  qualifications: ContinentalQualifications;
  nextCupTournament: CupTournament;
  nextContinentalTournament: ContinentalTournament | null;
  nextMasterSchedule: CalendarScheduleItem[];
  nextStandings: LeagueStanding[];
  updatedManager: ManagerProfile;
  announcementInboxMessage: {
    id: string;
    title: string;
    sender: string;
    date: string;
    type: 'board' | 'news';
    read: boolean;
    content: string;
  };
}

export class SeasonTransitionManager {
  /**
   * Evaluates continental qualifications according to strict CAF, AFC & UEFA rules:
   * - STRICT PROMOTION & TIER GOVERNANCE:
   *   1) Newly promoted clubs (`isNewlyPromoted === true` or `previousDivision > 1`) and clubs from lower divisions
   *      (`division > 1` or `completedLeagueTier > 1`) are STRICTLY BARRED from any continental slot, even if they
   *      finished 1st in Division 2.
   *   2) Continental slots are awarded exclusively to the Top 4 (Golden Square) of the Premier League (Tier 1)
   *      from the completed season, plus the Domestic Cup winner (if eligible).
   *   3) A newly promoted user club participates ONLY in (Premier League + Domestic Cup) until completing a full
   *      season in Tier 1 in a qualifying position.
   */
  static evaluateContinentalQualifications(
    standings: LeagueStanding[],
    cupTournament: CupTournament | null,
    country: string = 'مصر',
    userClub?: Club | null,
    activeLeague?: LeagueDefinition | null,
    completedLeagueTier?: number
  ): ContinentalQualifications {
    const continent =
      userClub || activeLeague
        ? resolveClubContinent(userClub, activeLeague)
        : resolveCountryContinent(country);
    const codes = getContinentalCodesForContinent(continent);
    const primaryContinentalCode: 'ccl' | 'ucl' | 'acl' = codes.primaryCode;
    const secondaryContinentalCode: 'ccc' | 'uel' | 'acl2' = codes.secondaryCode;

    const primaryName =
      continent === 'EUROPE'
        ? 'دوري أبطال أوروبا (UCL)'
        : continent === 'ASIA'
        ? 'دوري أبطال آسيا للنخبة (ACL Elite)'
        : 'دوري أبطال إفريقيا (CAF CL)';
    const secondaryName =
      continent === 'EUROPE'
        ? 'الدوري الأوروبي (UEL)'
        : continent === 'ASIA'
        ? 'دوري أبطال آسيا 2 (AFC Two)'
        : 'كأس الكونفدرالية الإفريقية (CAF CC)';
    const cupDef = getDomesticCupDefinitionForCountry(country);

    const finishedTier =
      typeof completedLeagueTier === 'number'
        ? completedLeagueTier
        : userClub?.isNewlyPromoted && typeof userClub?.previousDivision === 'number'
        ? userClub.previousDivision
        : activeLeague?.tier ?? userClub?.division ?? 1;

    const isUserNewlyPromotedOrLowerTier = Boolean(
      userClub &&
        (userClub.isNewlyPromoted === true ||
          (typeof userClub.previousDivision === 'number' && userClub.previousDivision > 1) ||
          (typeof userClub.division === 'number' && userClub.division > 1) ||
          finishedTier > 1)
    );

    const cclQualifiedClubIds: string[] = [];
    const cccQualifiedClubIds: string[] = [];
    const qualificationNotes: string[] = [];
    const primarySet = new Set<string>();
    const secondarySet = new Set<string>();

    // Determine Domestic National Cup Winner & Runner-Up
    let cupWinnerId = cupTournament?.winnerClubId;
    let cupRunnerUpId = cupTournament?.runnerUpClubId;
    if (cupTournament && cupTournament.matches) {
      const finalMatch = cupTournament.matches.find(m => m.stage === 'final' && m.isPlayed);
      if (finalMatch) {
        if (!cupWinnerId) {
          cupWinnerId =
            finalMatch.winnerTeamId ||
            ((finalMatch.homeScore ?? 0) > (finalMatch.awayScore ?? 0)
              ? finalMatch.homeTeamId
              : finalMatch.awayTeamId);
        }
        if (!cupRunnerUpId && cupWinnerId) {
          cupRunnerUpId =
            cupWinnerId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;
        }
      }
    }

    // Helper to check if a club ID is eligible for continental qualification (Tier 1 & NOT newly promoted)
    const isClubIdEligible = (clubId?: string): boolean => {
      if (!clubId) return false;
      if (isUserNewlyPromotedOrLowerTier && userClub && clubId === userClub.id) {
        return false;
      }
      const clubObj =
        userClub && userClub.id === clubId ? userClub : findClubInWorld(clubId);
      if (clubObj && !isClubEligibleForContinentalQualification(clubObj)) {
        return false;
      }
      return true;
    };

    // Build the effective Premier League (Tier 1) ordered table for qualification:
    // - If the completed season was Tier 1 (`finishedTier === 1`), use `standings` filtered to eligible Tier 1 clubs.
    // - If the completed season was Tier 2/3/4 (`finishedTier > 1`), `standings` is a lower-division table and
    //   MUST NOT be used for continental qualification; instead, rank the country's Premier League (Tier 1) clubs.
    let premierLeagueOrderedEntries: { teamId: string; teamName: string }[] = [];

    if (finishedTier === 1 && Array.isArray(standings) && standings.length > 0) {
      premierLeagueOrderedEntries = standings
        .filter(s => s && s.teamId && isClubIdEligible(s.teamId))
        .map(s => ({ teamId: s.teamId, teamName: s.teamName }));
    } else {
      const tier1League = getLeagueByCountryAndTier(country, 1);
      const tier1Clubs = (tier1League?.teams || [])
        .filter(
          c =>
            c &&
            c.id &&
            isClubEligibleForContinentalQualification(c) &&
            !(isUserNewlyPromotedOrLowerTier && userClub && c.id === userClub.id)
        )
        .sort((a, b) => (b.reputation || 70) - (a.reputation || 70));
      premierLeagueOrderedEntries = tier1Clubs.map(c => ({
        teamId: c.id,
        teamName: c.name,
      }));
    }

    // 1. Premier League Champion & Runner-Up (Top 2 of Tier 1) -> Primary Continental (CCL / ACL / UCL)
    if (premierLeagueOrderedEntries.length > 0) {
      cclQualifiedClubIds.push(premierLeagueOrderedEntries[0].teamId);
      primarySet.add(premierLeagueOrderedEntries[0].teamId);
      qualificationNotes.push(
        `🥇 بطل الدوري الممتاز (${premierLeagueOrderedEntries[0].teamName}): تأهل رسمي إلى ${primaryName}.`
      );
    }
    if (
      premierLeagueOrderedEntries.length > 1 &&
      !primarySet.has(premierLeagueOrderedEntries[1].teamId)
    ) {
      cclQualifiedClubIds.push(premierLeagueOrderedEntries[1].teamId);
      primarySet.add(premierLeagueOrderedEntries[1].teamId);
      qualificationNotes.push(
        `🥈 وصيف الدوري الممتاز (${premierLeagueOrderedEntries[1].teamName}): تأهل رسمي إلى ${primaryName}.`
      );
    }

    // 2. Premier League 3rd Place -> Secondary Continental (CCC / ACL2 / UEL)
    for (let i = 2; i < premierLeagueOrderedEntries.length; i++) {
      const candidate = premierLeagueOrderedEntries[i];
      if (!primarySet.has(candidate.teamId) && !secondarySet.has(candidate.teamId)) {
        cccQualifiedClubIds.push(candidate.teamId);
        secondarySet.add(candidate.teamId);
        qualificationNotes.push(
          `🥉 المركز ${i + 1} في الدوري الممتاز (${candidate.teamName}): تأهل رسمي إلى ${secondaryName}.`
        );
        break;
      }
    }

    // 3. National Cup Winner (if eligible and not newly promoted) -> else 4th Place in Premier League (Golden Square Top 4)
    if (
      cupWinnerId &&
      isClubIdEligible(cupWinnerId) &&
      !primarySet.has(cupWinnerId) &&
      !secondarySet.has(cupWinnerId)
    ) {
      cccQualifiedClubIds.push(cupWinnerId);
      secondarySet.add(cupWinnerId);
      const cupWinnerName =
        premierLeagueOrderedEntries.find(s => s.teamId === cupWinnerId)?.teamName ||
        findClubInWorld(cupWinnerId)?.name ||
        'بطل الكأس';
      qualificationNotes.push(
        `🏆 بطل ${cupDef.shortName} (${cupWinnerName}): تأهل رسمي إلى ${secondaryName}.`
      );
    } else if (
      cupRunnerUpId &&
      isClubIdEligible(cupRunnerUpId) &&
      !primarySet.has(cupRunnerUpId) &&
      !secondarySet.has(cupRunnerUpId)
    ) {
      cccQualifiedClubIds.push(cupRunnerUpId);
      secondarySet.add(cupRunnerUpId);
      const runnerUpName =
        premierLeagueOrderedEntries.find(s => s.teamId === cupRunnerUpId)?.teamName ||
        findClubInWorld(cupRunnerUpId)?.name ||
        'وصيف الكأس';
      qualificationNotes.push(
        `🥈 وصيف ${cupDef.shortName} (${runnerUpName}): تأهل إلى ${secondaryName} بعد تأهل بطل الكأس لبطولة قارية بالفعل.`
      );
    } else {
      for (let i = 2; i < premierLeagueOrderedEntries.length; i++) {
        const candidate = premierLeagueOrderedEntries[i];
        if (!primarySet.has(candidate.teamId) && !secondarySet.has(candidate.teamId)) {
          cccQualifiedClubIds.push(candidate.teamId);
          secondarySet.add(candidate.teamId);
          qualificationNotes.push(
            `🎖️ المركز ${i + 1} في الدوري الممتاز (${candidate.teamName}): تأهل إلى ${secondaryName} ضمن المربع الذهبي.`
          );
          break;
        }
      }
    }

    if (userClub?.isNewlyPromoted) {
      qualificationNotes.push(
        `📌 ناديك (${userClub.name}) صاعد حديثاً للدوري الممتاز؛ يشارك هذا الموسم في (الدوري الممتاز + الكأس المحلي فقط) ويبدأ التنافس على المقاعد القارية بعد إتمام موسم كامل في الدرجة الأولى.`
      );
    }

    // Final hard filter: ensure newly promoted or lower-division userClub is NEVER in qualified lists
    const finalPrimaryIds = cclQualifiedClubIds.filter(id => isClubIdEligible(id));
    const finalSecondaryIds = cccQualifiedClubIds.filter(
      id => !primarySet.has(id) && isClubIdEligible(id)
    );

    return {
      primaryContinentalCode,
      secondaryContinentalCode,
      cclQualifiedClubIds: finalPrimaryIds,
      cccQualifiedClubIds: finalSecondaryIds,
      qualificationNotes,
    };
  }

  /**
   * Executes the full automated season transition when May 30 is reached.
   */
  static executeSeasonTransition(params: {
    currentSeason: SeasonInfo;
    standings: LeagueStanding[];
    activeLeague: LeagueDefinition;
    teams: Club[];
    userClub: Club | null;
    manager: ManagerProfile;
    cupTournament: CupTournament | null;
    continentalTournament: ContinentalTournament | null;
  }): SeasonTransitionResult {
    const {
      currentSeason,
      standings,
      activeLeague,
      teams,
      userClub,
      manager,
      cupTournament,
    } = params;

    const nextSeasonNum = (currentSeason?.seasonNumber || 1) + 1;
    const { startDateStr } = CalendarManager.getSeasonDateRange(nextSeasonNum);
    const country = activeLeague?.country || userClub?.country || 'مصر';

    // 1. Evaluate Standings & Continental Qualifications strictly using completed league tier
    const qualifications = this.evaluateContinentalQualifications(
      standings,
      cupTournament,
      country,
      userClub,
      activeLeague,
      activeLeague?.tier || currentSeason?.divisionTier || 1
    );

    // 2. Generate End of Season Summary
    const summaryClub = userClub || teams[0];
    const seasonEndSummary = calculateSeasonEndSummary(
      { ...currentSeason, status: 'completed' },
      standings,
      summaryClub,
      activeLeague,
      cupTournament,
      manager,
      params.continentalTournament
    );

    // 3. Initialize Next Season's Domestic National Cup for the active country
    const totalLeagueRounds = Math.max(18, (teams.length - 1) * 2);
    const nextCupTournament = initNationalCupTournament(
      nextSeasonNum,
      country,
      teams,
      userClub,
      totalLeagueRounds
    );

    // 4. Determine Which Continental Tournament User's Club Participates In (with Strict Mutual Exclusion & Continent Isolation)
    const userId = userClub?.id;
    const userEligibleForCont = isClubEligibleForContinentalQualification(userClub);
    const userQualifiedForPrimary = Boolean(
      userId && userEligibleForCont && qualifications.cclQualifiedClubIds.includes(userId)
    );
    const userQualifiedForSecondary = Boolean(
      userId &&
        userEligibleForCont &&
        qualifications.cccQualifiedClubIds.includes(userId) &&
        !qualifications.cclQualifiedClubIds.includes(userId)
    );
    const targetContinentalCode: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2' = userQualifiedForSecondary
      ? qualifications.secondaryContinentalCode
      : qualifications.primaryContinentalCode;

    const qualifiedIdsForTarget = userQualifiedForSecondary
      ? qualifications.cccQualifiedClubIds
      : qualifications.cclQualifiedClubIds;

    const excludedIdsForTarget = new Set<string>(
      userQualifiedForSecondary
        ? qualifications.cclQualifiedClubIds
        : qualifications.cccQualifiedClubIds
    );
    if (userId && !userQualifiedForPrimary && !userQualifiedForSecondary) {
      excludedIdsForTarget.add(userId);
    }

    const qualifiedClubObjs = qualifiedIdsForTarget
      .map(id => teams.find(t => t.id === id) || findClubInWorld(id))
      .filter((c): c is Club => Boolean(c && isClubEligibleForContinentalQualification(c)));

    const nextContinentalTournament = initContinentalTournamentByCode(
      targetContinentalCode,
      nextSeasonNum,
      teams,
      userQualifiedForPrimary || userQualifiedForSecondary ? userClub || undefined : undefined,
      qualifiedClubObjs,
      excludedIdsForTarget
    );

    // 5. Generate Fresh Master Calendar Schedule for Season N+1 (League + Domestic Cup + Continental Cup)
    const nextMasterSchedule = CalendarManager.generateMasterSchedule({
      seasonNumber: nextSeasonNum,
      activeLeague,
      teams,
      userClub,
      cupTournament: nextCupTournament,
      continentalTournament: nextContinentalTournament,
    });

    // 6. Reset Standings for Season N+1
    const nextStandings: LeagueStanding[] = teams.map(t => ({
      teamId: t.id,
      teamName: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    }));

    // 7. Update Manager Records
    const isUserChampion = standings[0]?.teamId === userClub?.id;
    const isUserCupWinner = Boolean(userClub?.id && cupTournament?.winnerClubId === userClub.id);
    const isUserContWinner = Boolean(
      userClub?.id &&
      (seasonEndSummary.continentalTrophyAwarded ||
        params.continentalTournament?.winnerClubId === userClub.id)
    );

    const newTrophiesForManager = [...(manager.trophies || [])];
    if (isUserChampion && seasonEndSummary.leagueTrophyAwarded && !newTrophiesForManager.includes(seasonEndSummary.leagueTrophyAwarded)) {
      newTrophiesForManager.push(seasonEndSummary.leagueTrophyAwarded);
    }
    if (isUserCupWinner && seasonEndSummary.cupTrophyAwarded && !newTrophiesForManager.includes(seasonEndSummary.cupTrophyAwarded)) {
      newTrophiesForManager.push(seasonEndSummary.cupTrophyAwarded);
    }
    if (isUserContWinner && seasonEndSummary.continentalTrophyAwarded && !newTrophiesForManager.includes(seasonEndSummary.continentalTrophyAwarded)) {
      newTrophiesForManager.push(seasonEndSummary.continentalTrophyAwarded);
    }

    const updatedManager: ManagerProfile = {
      ...manager,
      totalSeasons: (manager.totalSeasons || 1) + 1,
      leagueTitles: isUserChampion ? (manager.leagueTitles || 0) + 1 : (manager.leagueTitles || 0),
      cupTitles: isUserCupWinner ? (manager.cupTitles || 0) + 1 : (manager.cupTitles || 0),
      trophies: newTrophiesForManager,
      reputation: isUserChampion || isUserContWinner ? Math.min(100, (manager.reputation || 20) + 10) : manager.reputation,
      level: isUserChampion || isUserContWinner ? (manager.level || 1) + 1 : manager.level,
    };

    // 8. Next Season Info
    const nextSeason: SeasonInfo = {
      seasonId: `season_${nextSeasonNum}_${Date.now()}`,
      seasonNumber: nextSeasonNum,
      startDate: startDateStr,
      endDate: CalendarManager.getSeasonDateRange(nextSeasonNum).endDateStr,
      currentRound: 1,
      totalRounds: Math.max(...nextMasterSchedule.map(f => f.round || 1), 34),
      status: 'active',
      leagueId: activeLeague.id,
      leagueName: activeLeague.name,
      divisionTier: activeLeague.tier,
    };

    // 9. Inbox Announcement Message
    const federationSender = isEuropeanCountry(country)
      ? 'الاتحاد الأوروبي لكرة القدم (UEFA) ورابطة الدوري'
      : 'الاتحاد الإفريقي لكرة القدم (CAF) ورابطة الأندية';

    const announcementInboxMessage = {
      id: `msg_season_trans_${nextSeasonNum}_${Date.now()}`,
      title: `🎉 انطلاق الموسم الجديد ${nextSeasonNum} واعتماد المتأهلين للبطولات القارية 🌍`,
      sender: federationSender,
      date: startDateStr,
      type: 'board' as const,
      read: false,
      content:
        `انطلق رسمياً الموسم الكروي الجديد ${nextSeasonNum} بتحديث شامل لجدول المباريات والمسابقات المحلية والقارية!\n\n` +
        `🏆 الأندية المتأهلة للبطولات القارية هذا الموسم:\n` +
        qualifications.qualificationNotes.join('\n') +
        '\n\n' +
        `🛡️ الكأس المحلية: ${nextCupTournament.name}\n` +
        `🌍 البطولة القارية النشطة: ${nextContinentalTournament.name}\n\n` +
        `📅 جدول مباريات الموسم الجديد جاهز بالكامل وفق التقويم الزمني الموحد (الدوري في عطلة نهاية الأسبوع، ودوري الأبطال والكأس أيام الثلاثاء والأربعاء، والكونفدرالية/الدوري الأوروبي أيام الخميس مع ضمان فاصل راحة 48 ساعة على الأقل). نتمنى لك موسماً حافلاً بالبطولات! 🚀`,
    };

    return {
      nextSeason,
      nextStartDate: startDateStr,
      seasonEndSummary,
      qualifications,
      nextCupTournament,
      nextContinentalTournament,
      nextMasterSchedule,
      nextStandings,
      updatedManager,
      announcementInboxMessage,
    };
  }
}
