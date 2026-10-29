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
} from '../utils/continentalEngine';
import {
  calculateSeasonEndSummary,
  initNationalCupTournament,
} from '../utils/seasonEngine';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { resolveCountryContinent } from '../data/realClubsData';

export interface ContinentalQualifications {
  primaryContinentalCode: 'ccl' | 'ucl' | 'acl';
  secondaryContinentalCode: 'ccc' | 'uel' | 'acl2';
  cclQualifiedClubIds: string[]; // 1st & 2nd (Champions League: CCL, ACL Elite, or UCL)
  cccQualifiedClubIds: string[]; // Cup Winner & 3rd/4th (Confederation Cup, AFC Two, or Europa League)
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
   * Evaluates continental qualifications according to official CAF, AFC & UEFA rules:
   * - League 1st & 2nd Place: Qualify for Primary Continental (CAF CL in Africa, AFC CL Elite in Asia, UEFA CL in Europe).
   * - National Cup Winner & League 3rd Place: Qualify for Secondary Continental (CAF CC in Africa, AFC Two in Asia, UEFA EL in Europe).
   *   (If Cup Winner is already in Top 3, League 4th place qualifies).
   */
  static evaluateContinentalQualifications(
    standings: LeagueStanding[],
    cupTournament: CupTournament | null,
    country: string = 'مصر',
    userClub?: Club | null,
    activeLeague?: LeagueDefinition | null
  ): ContinentalQualifications {
    const continent =
      userClub || activeLeague
        ? resolveClubContinent(userClub, activeLeague)
        : resolveCountryContinent(country);
    const codes = getContinentalCodesForContinent(continent);
    const primaryContinentalCode: 'ccl' | 'ucl' | 'acl' = codes.primary;
    const secondaryContinentalCode: 'ccc' | 'uel' | 'acl2' = codes.secondary;

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

    const cclQualifiedClubIds: string[] = [];
    const cccQualifiedClubIds: string[] = [];
    const qualificationNotes: string[] = [];
    const primarySet = new Set<string>();
    const secondarySet = new Set<string>();

    // 1. League Champion & Runner-Up -> Primary Continental (CCL / ACL / UCL)
    if (standings.length > 0) {
      cclQualifiedClubIds.push(standings[0].teamId);
      primarySet.add(standings[0].teamId);
      qualificationNotes.push(`🥇 بطل الدوري (${standings[0].teamName}): تأهل رسمي إلى ${primaryName}.`);
    }
    if (standings.length > 1 && !primarySet.has(standings[1].teamId)) {
      cclQualifiedClubIds.push(standings[1].teamId);
      primarySet.add(standings[1].teamId);
      qualificationNotes.push(`🥈 وصيف الدوري (${standings[1].teamName}): تأهل رسمي إلى ${primaryName}.`);
    }

    // 2. Determine Domestic National Cup Winner & Runner-Up
    let cupWinnerId = cupTournament?.winnerClubId;
    let cupRunnerUpId = cupTournament?.runnerUpClubId;
    if (cupTournament && cupTournament.matches) {
      const finalMatch = cupTournament.matches.find(m => m.stage === 'final' && m.isPlayed);
      if (finalMatch) {
        if (!cupWinnerId) {
          cupWinnerId = finalMatch.winnerTeamId || (
            (finalMatch.homeScore ?? 0) > (finalMatch.awayScore ?? 0)
              ? finalMatch.homeTeamId
              : finalMatch.awayTeamId
          );
        }
        if (!cupRunnerUpId && cupWinnerId) {
          cupRunnerUpId = cupWinnerId === finalMatch.homeTeamId ? finalMatch.awayTeamId : finalMatch.homeTeamId;
        }
      }
    }

    // 3. League 3rd Place (or highest team not in Primary) -> Secondary Continental (CCC / ACL2 / UEL)
    for (let i = 2; i < standings.length; i++) {
      const candidate = standings[i];
      if (!primarySet.has(candidate.teamId) && !secondarySet.has(candidate.teamId)) {
        cccQualifiedClubIds.push(candidate.teamId);
        secondarySet.add(candidate.teamId);
        qualificationNotes.push(`🥉 المركز ${i + 1} في الدوري (${candidate.teamName}): تأهل رسمي إلى ${secondaryName}.`);
        break;
      }
    }

    // 4. National Cup Winner -> else Cup Runner-Up -> else next in League Standings (4th / 5th)
    // Strict Mutual Exclusion: Any club in primarySet is strictly excluded from secondarySet
    if (cupWinnerId && !primarySet.has(cupWinnerId) && !secondarySet.has(cupWinnerId)) {
      cccQualifiedClubIds.push(cupWinnerId);
      secondarySet.add(cupWinnerId);
      const cupWinnerName = standings.find(s => s.teamId === cupWinnerId)?.teamName || 'بطل الكأس';
      qualificationNotes.push(`🏆 بطل ${cupDef.shortName} (${cupWinnerName}): تأهل رسمي إلى ${secondaryName}.`);
    } else if (cupRunnerUpId && !primarySet.has(cupRunnerUpId) && !secondarySet.has(cupRunnerUpId)) {
      cccQualifiedClubIds.push(cupRunnerUpId);
      secondarySet.add(cupRunnerUpId);
      const runnerUpName = standings.find(s => s.teamId === cupRunnerUpId)?.teamName || 'وصيف الكأس';
      qualificationNotes.push(
        `🥈 وصيف ${cupDef.shortName} (${runnerUpName}): تأهل إلى ${secondaryName} بعد تأهل بطل الكأس لبطولة قارية بالفعل.`
      );
    } else {
      for (let i = 2; i < standings.length; i++) {
        const candidate = standings[i];
        if (!primarySet.has(candidate.teamId) && !secondarySet.has(candidate.teamId)) {
          cccQualifiedClubIds.push(candidate.teamId);
          secondarySet.add(candidate.teamId);
          qualificationNotes.push(
            `🎖️ المركز ${i + 1} في الدوري (${candidate.teamName}): تأهل إلى ${secondaryName} لتمرير بطاقة الكأس حسب الترتيب.`
          );
          break;
        }
      }
    }

    return {
      primaryContinentalCode,
      secondaryContinentalCode,
      cclQualifiedClubIds,
      cccQualifiedClubIds: cccQualifiedClubIds.filter(id => !primarySet.has(id)),
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

    // 1. Evaluate Standings & Continental Qualifications
    const qualifications = this.evaluateContinentalQualifications(
      standings,
      cupTournament,
      country,
      userClub,
      activeLeague
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
    const userQualifiedForSecondary = Boolean(
      userId &&
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

    const qualifiedClubObjs = teams.filter(t => qualifiedIdsForTarget.includes(t.id));
    const nextContinentalTournament = initContinentalTournamentByCode(
      targetContinentalCode,
      nextSeasonNum,
      teams,
      userClub || undefined,
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
