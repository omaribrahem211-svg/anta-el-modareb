import {
  Club,
  Fixture,
  LeagueDefinition,
  LeagueStanding,
  ContinentalTournament,
  ContinentalMatch,
  CupTournament,
  CalendarDate,
  CompetitionType,
} from '../types/game';
import { simulateMatch } from '../utils/engine';
import { simulateKnockoutMatch } from '../utils/continentalEngine';
import { formatCalendarDate, parseDateString, addDaysToDate } from '../utils/calendarEngine';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';

/**
 * Normalizes any variation of competition type into the 3 core types:
 * - 'LEAGUE'
 * - 'DOMESTIC_COP'
 * - 'CONTINENTAL_CUP'
 */
export function normalizeCompetitionType(
  rawType?: string | CompetitionType
): 'LEAGUE' | 'DOMESTIC_COP' | 'CONTINENTAL_CUP' {
  if (!rawType) return 'LEAGUE';
  const lower = String(rawType).toLowerCase().trim();
  if (
    lower.includes('cont') ||
    lower.includes('ccl') ||
    lower.includes('ccc') ||
    lower.includes('ucl') ||
    lower.includes('uel') ||
    lower.includes('acl') ||
    lower.includes('caf') ||
    lower.includes('uefa') ||
    lower.includes('europa') ||
    lower.includes('confed') ||
    lower.includes('champ') ||
    lower === 'continental_cup'
  ) {
    return 'CONTINENTAL_CUP';
  }
  if (
    lower.includes('cup') ||
    lower.includes('cop') ||
    lower.includes('pokal') ||
    lower.includes('coupe') ||
    lower === 'domestic_cop' ||
    lower === 'domestic_cup'
  ) {
    return 'DOMESTIC_COP';
  }
  return 'LEAGUE';
}

export interface CalendarScheduleItem extends Fixture {
  date: string; // "YYYY-MM-DD"
  timestamp: number; // ms timestamp
  tournamentId: 'league' | 'cup' | 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2' | 'caf_cl';
  tournamentBadge: string; // e.g. "🇪🇬 الدوري" | "🏆 دوري أبطال إفريقيا" | "🌍 كأس الكونفدرالية" | "🏆 دوري أبطال أوروبا" | "🟠 الدوري الأوروبي" | "🛡️ كأس مصر"
  stage: string;
}

export interface CalendarAdvanceResult {
  nextDate: CalendarDate;
  simulatedFixtures: CalendarScheduleItem[];
  userMatchDayReached: boolean;
  userFixtureToday: CalendarScheduleItem | null;
  seasonFinished: boolean;
  updatedStandings?: LeagueStanding[];
  updatedCupTournament?: CupTournament | null;
  updatedContinentalTournament?: ContinentalTournament | null;
}

/**
 * Generates a full real-world master calendar from August 15 to May 30
 * with League on weekends (Fri/Sat/Sun), Champions League & Domestic Cups on midweeks (Tue/Wed),
 * Confederation Cup & Europa League on Thursdays, and strictly enforces the 48-hour minimum rest rule.
 */
export class CalendarManager {
  /**
   * Builds the start and end dates for a given season number.
   * Season 1 = 2026-08-15 to 2027-05-30
   * Season 2 = 2027-08-15 to 2028-05-30
   */
  static getSeasonDateRange(seasonNumber: number = 1): { startDateStr: string; endDateStr: string; startYear: number } {
    const startYear = 2025 + Math.max(1, seasonNumber);
    const startDateStr = `${startYear}-08-15`;
    const endDateStr = `${startYear + 1}-05-30`;
    return { startDateStr, endDateStr, startYear };
  }

  /**
   * Helper to format a Date object as "YYYY-MM-DD".
   */
  static formatDateStr(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Check if two dates are within 48 hours (< 2 calendar days difference).
   * Ensures at least 2 full days between any two fixtures for the same club (e.g. Thursday -> Sunday).
   */
  static isWithin48Hours(dateStr1: string, dateStr2: string): boolean {
    const t1 = parseDateString(dateStr1).getTime();
    const t2 = parseDateString(dateStr2).getTime();
    const diffHours = Math.abs(t1 - t2) / (1000 * 60 * 60);
    return diffHours < 48;
  }

  /**
   * Returns competition metadata (name & badge) for a given continental competition ID.
   */
  static getContinentalMeta(competitionId?: string, fallbackName?: string): {
    compCode: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2';
    name: string;
    badge: string;
    isThursdaySlot: boolean;
  } {
    const raw = (competitionId || '').toLowerCase();
    if (raw.includes('ucl') || raw.includes('uefa_champions')) {
      return {
        compCode: 'ucl',
        name: fallbackName || 'دوري أبطال أوروبا',
        badge: '🏆 دوري أبطال أوروبا',
        isThursdaySlot: false,
      };
    }
    if (raw.includes('uel') || raw.includes('europa')) {
      return {
        compCode: 'uel',
        name: fallbackName || 'الدوري الأوروبي',
        badge: '🟠 الدوري الأوروبي',
        isThursdaySlot: true,
      };
    }
    if (raw.includes('ccc') || raw.includes('confed')) {
      return {
        compCode: 'ccc',
        name: fallbackName || 'كأس الكونفدرالية الإفريقية',
        badge: '🌍 كأس الكونفدرالية الإفريقية',
        isThursdaySlot: true,
      };
    }
    if (raw.includes('acl2') || raw.includes('afc_two') || raw.includes('asia_two')) {
      return {
        compCode: 'acl2',
        name: fallbackName || 'دوري أبطال آسيا 2',
        badge: '🌏 دوري أبطال آسيا 2',
        isThursdaySlot: true,
      };
    }
    if (raw.includes('acl') || raw.includes('asia')) {
      return {
        compCode: 'acl',
        name: fallbackName || 'دوري أبطال آسيا للنخبة',
        badge: '👑 دوري أبطال آسيا للنخبة',
        isThursdaySlot: false,
      };
    }
    return {
      compCode: 'ccl',
      name: fallbackName || 'دوري أبطال إفريقيا',
      badge: '🏆 دوري أبطال إفريقيا',
      isThursdaySlot: false,
    };
  }

  /**
   * Resolves a canonical midweek date and Arabic stage label for any ContinentalMatch
   * (Group Matchdays 1-6, Quarter-Final, Semi-Final, Final).
   * - Champions League (CCL / UCL): Tuesdays / Wednesdays
   * - Confederation Cup / Europa League (CCC / UEL): Thursdays (+2 days from Tuesday)
   */
  static resolveContinentalMatchDate(
    cmOrSeason: ContinentalMatch | number,
    seasonOrCm: number | ContinentalMatch = 1,
    competitionId?: string,
    competitionName?: string
  ): { dateObj: Date; dateStr: string; stageName: string } {
    const cm: ContinentalMatch =
      typeof cmOrSeason === 'number' ? (seasonOrCm as ContinentalMatch) : cmOrSeason;
    const seasonNumber: number =
      typeof cmOrSeason === 'number' ? cmOrSeason : (typeof seasonOrCm === 'number' ? seasonOrCm : 1);

    const { startYear } = this.getSeasonDateRange(seasonNumber);
    const inferredCompId = competitionId || (cm?.id ? cm.id.split('_')[0] : 'ccl');
    const meta = this.getContinentalMeta(inferredCompId, competitionName);
    const dayOffset = meta.isThursdaySlot ? 2 : 0; // Tuesday + 2 = Thursday

    if (cm?.stage === 'quarter') {
      const dateObj = new Date(startYear + 1, 1, 16 + dayOffset); // Feb 16 (Tue) or Feb 18 (Thu)
      return {
        dateObj,
        dateStr: this.formatDateStr(dateObj),
        stageName: `${meta.name} - ربع النهائي`,
      };
    }
    if (cm?.stage === 'semi') {
      const dateObj = new Date(startYear + 1, 2, 30 + dayOffset); // Mar 30 (Tue) or Apr 1 (Thu)
      return {
        dateObj,
        dateStr: this.formatDateStr(dateObj),
        stageName: `${meta.name} - نصف النهائي`,
      };
    }
    if (cm?.stage === 'final') {
      const dateObj = new Date(startYear + 1, 4, 11 + dayOffset); // May 11 (Tue) or May 13 (Thu)
      return {
        dateObj,
        dateStr: this.formatDateStr(dateObj),
        stageName: `نهائي ${meta.name} الكبير 🏆`,
      };
    }

    const continentalGroupDates: Record<number, { date: Date; name: string }> = {
      1: { date: new Date(startYear, 8, 15 + dayOffset), name: `${meta.name} - المجموعات جولة 1` }, // Sep 15/17
      2: { date: new Date(startYear, 9, 6 + dayOffset), name: `${meta.name} - المجموعات جولة 2` },  // Oct 6/8
      3: { date: new Date(startYear, 9, 27 + dayOffset), name: `${meta.name} - المجموعات جولة 3` }, // Oct 27/29
      4: { date: new Date(startYear, 10, 24 + dayOffset), name: `${meta.name} - المجموعات جولة 4` },// Nov 24/26
      5: { date: new Date(startYear, 11, 15 + dayOffset), name: `${meta.name} - المجموعات جولة 5` },// Dec 15/17
      6: { date: new Date(startYear + 1, 0, 19 + dayOffset), name: `${meta.name} - المجموعات جولة 6` }, // Jan 19/21
    };

    const md = cm?.matchday || 1;
    const entry = continentalGroupDates[md] || {
      date: new Date(startYear, 8, 15 + (md - 1) * 14 + dayOffset),
      name: `${meta.name} - جولة ${md}`,
    };
    return {
      dateObj: entry.date,
      dateStr: this.formatDateStr(entry.date),
      stageName: entry.name,
    };
  }

  /**
   * Resolves the canonical midweek date for a Domestic Cup stage.
   */
  static resolveDomesticCupStageDate(
    stage: string,
    seasonNumber: number = 1,
    cupName: string = 'كأس مصر'
  ): { dateObj: Date; dateStr: string; stageName: string } {
    const { startYear } = this.getSeasonDateRange(seasonNumber);
    const cupDatesByStage: Record<string, { date: Date; name: string }> = {
      round_of_64: { date: new Date(startYear, 10, 10), name: `${cupName} - دور الـ 64` }, // Nov 10 (Tue)
      round_of_32: { date: new Date(startYear, 11, 8), name: `${cupName} - دور الـ 32` },  // Dec 8 (Tue)
      round_of_16: { date: new Date(startYear + 1, 0, 26), name: `${cupName} - ثمن النهائي (دور الـ 16)` }, // Jan 26 (Tue)
      quarter: { date: new Date(startYear + 1, 2, 16), name: `${cupName} - ربع النهائي` }, // Mar 16 (Tue)
      semi: { date: new Date(startYear + 1, 3, 20), name: `${cupName} - نصف النهائي` },    // Apr 20 (Tue)
      final: { date: new Date(startYear + 1, 4, 25), name: `نهائي ${cupName} الكبير 🏆` }, // May 25 (Tue)
    };

    const entry = cupDatesByStage[stage] || {
      date: new Date(startYear + 1, 0, 12),
      name: `${cupName} - الأدوار الإقصائية`,
    };
    return {
      dateObj: entry.date,
      dateStr: this.formatDateStr(entry.date),
      stageName: entry.name,
    };
  }

  /**
   * Generates a unified real-date master calendar schedule for the entire season.
   * Schedules Continental & Cup midweek slots first, then Weekend League slots,
   * so any club playing on Thursday (Confederation Cup / Europa League) automatically
   * gets its weekend league match shifted to Sunday (preserving the >= 48h rest rule).
   */
  static generateMasterSchedule(params: {
    seasonNumber: number;
    activeLeague: LeagueDefinition;
    teams: Club[];
    userClub?: Club | null;
    cupTournament?: CupTournament | null;
    continentalTournament?: ContinentalTournament | null;
  }): CalendarScheduleItem[] {
    const { seasonNumber, activeLeague, teams, cupTournament, continentalTournament } = params;
    const { startYear } = this.getSeasonDateRange(seasonNumber);

    const masterSchedule: CalendarScheduleItem[] = [];
    const clubMatchDates = new Map<string, string[]>();

    // Helper to safely assign fixture date ensuring >= 48h rest against ALL matches for both clubs
    const assignSafeDate = (teamA: string, teamB: string, preferredDate: Date): Date => {
      const candidate = new Date(preferredDate);
      let attempts = 0;
      while (attempts < 14) {
        const candidateStr = this.formatDateStr(candidate);
        const datesA = clubMatchDates.get(teamA) || [];
        const datesB = clubMatchDates.get(teamB) || [];

        const conflictA = datesA.some(d => this.isWithin48Hours(d, candidateStr));
        const conflictB = datesB.some(d => this.isWithin48Hours(d, candidateStr));

        if (!conflictA && !conflictB) {
          clubMatchDates.set(teamA, [...datesA, candidateStr]);
          clubMatchDates.set(teamB, [...datesB, candidateStr]);
          return candidate;
        }

        // Shift by 1 day forward (e.g. Saturday -> Sunday if club played Thursday)
        candidate.setDate(candidate.getDate() + 1);
        attempts++;
      }
      return candidate;
    };

    // 1. GENERATE CONTINENTAL TOURNAMENT FIXTURES FIRST (Midweeks: Tue/Wed for CCL/UCL, Thu for CCC/UEL)
    if (continentalTournament && Array.isArray(continentalTournament.matches) && continentalTournament.matches.length > 0) {
      const meta = this.getContinentalMeta(continentalTournament.competitionId, continentalTournament.name);

      continentalTournament.matches.forEach(cm => {
        const mdInfo = this.resolveContinentalMatchDate(
          cm,
          seasonNumber,
          continentalTournament.competitionId,
          continentalTournament.name
        );
        const safeDate = assignSafeDate(cm.homeTeamId, cm.awayTeamId, mdInfo.dateObj);
        const dateStr = this.formatDateStr(safeDate);
        const timestamp = safeDate.getTime();

        masterSchedule.push({
          id: cm.id,
          round: cm.roundTrigger || 1,
          homeTeamId: cm.homeTeamId,
          awayTeamId: cm.awayTeamId,
          competitionType: 'CONTINENTAL_CUP',
          competitionId: continentalTournament.competitionId || meta.compCode,
          tournamentId: meta.compCode,
          competitionName: continentalTournament.name || meta.name,
          tournamentBadge: meta.badge,
          stage: cm.stage || 'group',
          stageName: mdInfo.stageName,
          groupId: cm.groupId,
          matchday: cm.matchday,
          date: dateStr,
          timestamp,
          isPlayed: cm.isPlayed || false,
          homeScore: cm.homeScore,
          awayScore: cm.awayScore,
          homePenalties: cm.homePenalties,
          awayPenalties: cm.awayPenalties,
          winnerTeamId: cm.winnerTeamId,
        });
      });
    }

    // 2. GENERATE DOMESTIC NATIONAL CUP FIXTURES (Reserved Midweeks: Tuesdays/Wednesdays)
    if (cupTournament && Array.isArray(cupTournament.matches) && cupTournament.matches.length > 0) {
      const cupDef = getDomesticCupDefinitionForCountry(cupTournament.country || activeLeague.country || 'مصر');
      const cupDisplayName = cupTournament.name || cupDef.shortName || cupDef.name;

      cupTournament.matches.forEach(cupM => {
        const stageInfo = this.resolveDomesticCupStageDate(cupM.stage, seasonNumber, cupDisplayName);
        const safeDate = assignSafeDate(cupM.homeTeamId, cupM.awayTeamId, stageInfo.dateObj);
        const dateStr = this.formatDateStr(safeDate);
        const timestamp = safeDate.getTime();

        masterSchedule.push({
          id: cupM.id,
          round: cupM.roundTrigger || 1,
          homeTeamId: cupM.homeTeamId,
          awayTeamId: cupM.awayTeamId,
          competitionType: 'DOMESTIC_COP',
          competitionId: cupTournament.id || cupDef.id,
          tournamentId: 'cup',
          competitionName: cupDisplayName,
          tournamentBadge: `🛡️ ${cupDef.shortName || cupDisplayName}`,
          cupStage: cupM.stage,
          stage: cupM.stage,
          stageName: stageInfo.stageName,
          date: dateStr,
          timestamp,
          isPlayed: cupM.isPlayed || false,
          homeScore: cupM.homeScore,
          awayScore: cupM.awayScore,
          homePenalties: cupM.homePenalties,
          awayPenalties: cupM.awayPenalties,
          winnerTeamId: cupM.winnerTeamId,
        });
      });
    }

    // 3. GENERATE DOMESTIC LEAGUE FIXTURES (Double Round Robin on Weekends: Fri/Sat/Sun)
    const leagueTeams = Array.isArray(teams) && teams.length > 0 ? teams : activeLeague.teams;
    const teamIds = leagueTeams.map(t => t.id);
    const n = teamIds.length;
    const isOdd = n % 2 !== 0;
    const numTeams = isOdd ? n + 1 : n;
    const workingIds = isOdd ? [...teamIds, 'BYE'] : [...teamIds];

    const roundRobinRounds: { homeId: string; awayId: string }[][] = [];
    for (let round = 0; round < numTeams - 1; round++) {
      const roundMatches: { homeId: string; awayId: string }[] = [];
      for (let i = 0; i < numTeams / 2; i++) {
        const home = workingIds[i];
        const away = workingIds[numTeams - 1 - i];
        if (home !== 'BYE' && away !== 'BYE') {
          if (round % 2 === 1) {
            roundMatches.push({ homeId: away, awayId: home });
          } else {
            roundMatches.push({ homeId: home, awayId: away });
          }
        }
      }
      roundRobinRounds.push(roundMatches);
      workingIds.splice(1, 0, workingIds.pop()!);
    }

    // Second half of season (reverse home/away)
    for (let round = 0; round < numTeams - 1; round++) {
      const reverseMatches = roundRobinRounds[round].map(m => ({ homeId: m.awayId, awayId: m.homeId }));
      roundRobinRounds.push(reverseMatches);
    }

    // Map each league round to weekly Weekends starting Aug 15 (Saturday)
    const leagueStartDate = new Date(startYear, 7, 15); // August 15
    roundRobinRounds.forEach((roundMatches, roundIdx) => {
      const roundNum = roundIdx + 1;
      const roundSaturday = new Date(leagueStartDate);
      roundSaturday.setDate(leagueStartDate.getDate() + roundIdx * 7);

      roundMatches.forEach(match => {
        // assignSafeDate automatically shifts Saturday -> Sunday if either team played Thursday in CCC/UEL!
        const safeDate = assignSafeDate(match.homeId, match.awayId, roundSaturday);
        const dateStr = this.formatDateStr(safeDate);
        const timestamp = safeDate.getTime();

        masterSchedule.push({
          id: `fix_league_r${roundNum}_${match.homeId}_${match.awayId}_s${seasonNumber}`,
          round: roundNum,
          homeTeamId: match.homeId,
          awayTeamId: match.awayId,
          competitionType: 'LEAGUE',
          competitionId: activeLeague.id || 'egyptian_league',
          tournamentId: 'league',
          competitionName: activeLeague.name,
          tournamentBadge: `🏟️ ${activeLeague.shortName || activeLeague.name}`,
          stage: `الجولة ${roundNum}`,
          stageName: `${activeLeague.shortName || activeLeague.name} - الجولة ${roundNum}`,
          date: dateStr,
          timestamp,
          isPlayed: false,
        });
      });
    });

    // Sort master schedule strictly by date and timestamp
    masterSchedule.sort((a, b) => {
      const dateA = String(a?.date || '');
      const dateB = String(b?.date || '');
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0);
    });

    return masterSchedule;
  }

  /**
   * Filters the master schedule to show ONLY the user's club matches in exact chronological order.
   */
  static getUserClubSchedule(userClubId: string | undefined, masterSchedule: CalendarScheduleItem[]): CalendarScheduleItem[] {
    if (!userClubId || !Array.isArray(masterSchedule)) return [];
    return masterSchedule
      .filter(f => f && (f.homeTeamId === userClubId || f.awayTeamId === userClubId))
      .sort((a, b) => {
        const dateA = String(a?.date || '');
        const dateB = String(b?.date || '');
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        return (Number(a?.timestamp) || 0) - (Number(b?.timestamp) || 0);
      });
  }

  /**
   * Finds the upcoming match for user's club on or after currentDateStr.
   */
  static getNextUserMatch(userClubId: string | undefined, currentDateStr: string, masterSchedule: CalendarScheduleItem[]): CalendarScheduleItem | null {
    if (!userClubId || !Array.isArray(masterSchedule)) return null;
    const userMatches = this.getUserClubSchedule(userClubId, masterSchedule);
    const cleanCurrent = (currentDateStr || '').trim();
    const todayMatch = userMatches.find(m => !m.isPlayed && (m?.date || '').trim() === cleanCurrent);
    if (todayMatch) return todayMatch;
    const upcoming = userMatches.find(m => !m.isPlayed && (m?.date || '').trim() > cleanCurrent);
    if (upcoming) return upcoming;
    const earliestUnplayed = userMatches.find(m => !m.isPlayed);
    return earliestUnplayed || null;
  }

  /**
   * Calculate exact days until user's club next match.
   */
  static calculateDaysUntilUserMatch(
    userClubId: string | undefined,
    currentDateStr: string | undefined,
    masterSchedule: CalendarScheduleItem[]
  ): { daysRemaining: number; isMatchDay: boolean; nextMatch: CalendarScheduleItem | null } {
    if (!userClubId || !Array.isArray(masterSchedule) || masterSchedule.length === 0) {
      return { daysRemaining: 0, isMatchDay: false, nextMatch: null };
    }

    const safeDateStr = (currentDateStr || '2026-08-15').trim();
    const nextMatch = this.getNextUserMatch(userClubId, safeDateStr, masterSchedule);
    if (!nextMatch || !nextMatch.date) {
      return { daysRemaining: 0, isMatchDay: false, nextMatch: null };
    }

    const cleanMatchDate = nextMatch.date.trim();

    if (cleanMatchDate === safeDateStr) {
      return { daysRemaining: 0, isMatchDay: !nextMatch.isPlayed, nextMatch };
    }

    const tCurrent = parseDateString(safeDateStr).getTime();
    const tMatch = parseDateString(cleanMatchDate).getTime();
    const diffDays = Math.ceil((tMatch - tCurrent) / (1000 * 60 * 60 * 24));

    return {
      daysRemaining: Math.max(0, diffDays),
      isMatchDay: !nextMatch.isPlayed && (diffDays <= 0 || cleanMatchDate <= safeDateStr),
      nextMatch,
    };
  }

  /**
   * Advance the calendar simulation by 1 step (to the next calendar date or event date).
   * Background AI matches on that date are simulated simultaneously.
   * If user's club has a match on that date, execution pauses with userMatchDayReached = true.
   */
  static advanceCalendarStep(params: {
    currentDateStr: string;
    dayIndexInSeason: number;
    seasonNumber: number;
    userClubId: string | null;
    masterSchedule: CalendarScheduleItem[];
    teams: Club[];
    skipDirectlyToNextUserMatch?: boolean;
  }): CalendarAdvanceResult {
    const {
      currentDateStr,
      dayIndexInSeason,
      seasonNumber,
      userClubId,
      masterSchedule,
      teams,
      skipDirectlyToNextUserMatch = false,
    } = params;

    const { endDateStr } = this.getSeasonDateRange(seasonNumber);
    const getClubObj = (clubId: string): Club => {
      return teams.find(t => t.id === clubId) || ({
        id: clubId,
        name: 'فريق منافس',
        shortName: 'منافس',
        players: [],
        primaryColor: '#334155',
        tactics: { startingPlayerIds: [], benchPlayerIds: [] },
      } as any);
    };

    let targetDateStr: string;
    let daysToAdvance = 1;

    if (skipDirectlyToNextUserMatch && userClubId) {
      const nextMatch = this.getNextUserMatch(userClubId, currentDateStr, masterSchedule);
      if (nextMatch && nextMatch.date && nextMatch.date.trim() > currentDateStr.trim()) {
        targetDateStr = nextMatch.date.trim();
        const diffMs = parseDateString(targetDateStr).getTime() - parseDateString(currentDateStr).getTime();
        daysToAdvance = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else if (nextMatch && !nextMatch.isPlayed && nextMatch.date && nextMatch.date.trim() <= currentDateStr.trim()) {
        targetDateStr = currentDateStr;
        daysToAdvance = 0;
      } else {
        targetDateStr = addDaysToDate(currentDateStr, 1).rawDateStr;
      }
    } else {
      targetDateStr = addDaysToDate(currentDateStr, 1).rawDateStr;
    }

    const isSeasonFinished = targetDateStr >= endDateStr;
    const nextDateObj = formatCalendarDate(parseDateString(targetDateStr), dayIndexInSeason + daysToAdvance);

    const matchesOnDate = masterSchedule.filter(
      f => f && !f.isPlayed && f.date && f.date >= currentDateStr && f.date <= targetDateStr
    );

    const userMatchToday = userClubId
      ? matchesOnDate.find(m => m.homeTeamId === userClubId || m.awayTeamId === userClubId) || null
      : null;

    const simulatedFixtures: CalendarScheduleItem[] = [];

    const pruneAiEvents = (evs: any[] = []) =>
      (Array.isArray(evs) ? evs : [])
        .filter(e => e && (e.type === 'goal' || e.type === 'red_card'))
        .slice(0, 8);

    matchesOnDate.forEach(fix => {
      if (userClubId && (fix.homeTeamId === userClubId || fix.awayTeamId === userClubId)) {
        return;
      }
      if (userMatchToday && fix.id === userMatchToday.id) {
        return;
      }

      const home = getClubObj(fix.homeTeamId) || ({ id: fix.homeTeamId, name: 'فريق', shortName: 'فريق', players: [], reputation: 50, tactics: { formation: '4-4-2' } } as any);
      const away = getClubObj(fix.awayTeamId) || ({ id: fix.awayTeamId, name: 'فريق', shortName: 'فريق', players: [], reputation: 50, tactics: { formation: '4-4-2' } } as any);

      const normType = normalizeCompetitionType(
        fix.competitionType || fix.tournamentId || fix.competitionId || (fix.cupStage ? 'DOMESTIC_COP' : undefined)
      );
      const isCup = normType === 'DOMESTIC_COP';
      const isContinental = normType === 'CONTINENTAL_CUP';

      if (isCup) {
        const res = simulateKnockoutMatch(home, away);
        fix.homeScore = res.homeScore;
        fix.awayScore = res.awayScore;
        fix.homePenalties = res.homePenalties;
        fix.awayPenalties = res.awayPenalties;
        fix.winnerTeamId = res.winnerTeamId;
        fix.isPlayed = true;
        fix.events = pruneAiEvents(res.events);
        fix.stats = res.stats;
      } else if (isContinental) {
        const isKnockout = fix.stage !== 'group' && !fix.stageName?.includes('المجموعات');
        if (isKnockout) {
          const res = simulateKnockoutMatch(home, away);
          fix.homeScore = res.homeScore;
          fix.awayScore = res.awayScore;
          fix.homePenalties = res.homePenalties;
          fix.awayPenalties = res.awayPenalties;
          fix.winnerTeamId = res.winnerTeamId;
          fix.isPlayed = true;
          fix.events = pruneAiEvents(res.events);
          fix.stats = res.stats;
        } else {
          const res = simulateMatch(home, away, home.tactics || { formation: '4-4-2' }, away.tactics || { formation: '4-4-2' });
          fix.homeScore = res.homeScore;
          fix.awayScore = res.awayScore;
          fix.isPlayed = true;
          fix.events = pruneAiEvents(res.events);
          fix.stats = res.stats;
        }
      } else {
        const res = simulateMatch(home, away, home.tactics || { formation: '4-4-2' }, away.tactics || { formation: '4-4-2' });
        fix.homeScore = res.homeScore;
        fix.awayScore = res.awayScore;
        fix.isPlayed = true;
        fix.events = pruneAiEvents(res.events);
        fix.stats = res.stats;
      }
      simulatedFixtures.push(fix);
    });

    return {
      nextDate: nextDateObj,
      simulatedFixtures,
      userMatchDayReached: Boolean(userMatchToday),
      userFixtureToday: userMatchToday,
      seasonFinished: isSeasonFinished,
    };
  }
}
