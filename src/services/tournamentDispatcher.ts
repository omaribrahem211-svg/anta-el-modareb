import {
  Club,
  CompetitionType,
  ContinentalTournament,
  CupMatch,
  CupTournament,
  Fixture,
  LeagueStanding,
  MatchEvent,
  MatchStats,
} from '../types/game';
import { updateLeagueStandings } from '../utils/engine';
import { recalculateContinentalGroupStandings, simulateKnockoutMatch } from '../utils/continentalEngine';
import { findClubInWorld } from '../data/leaguesData';
import { CalendarManager } from './calendarManager';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { pruneMatchEventsForStorage } from '../utils/storage/indexedDbStorage';

export interface ProcessMatchResultOptions {
  fixture: Fixture;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  winnerTeamId?: string;
  events?: MatchEvent[];
  stats?: MatchStats;
  currentStandings?: LeagueStanding[];
  standings?: LeagueStanding[];
  currentCup?: CupTournament | null;
  cupTournament?: CupTournament | null;
  currentContinental?: ContinentalTournament | null;
  continentalTournament?: ContinentalTournament | null;
  fixtures?: Fixture[];
  teams?: Club[];
  userClubId?: string;
  userClub?: Club | null;
  currentRound?: number;
}

export interface ProcessMatchStateContext {
  standings: LeagueStanding[];
  cupTournament: CupTournament | null;
  continentalTournament: ContinentalTournament | null;
  fixtures: Fixture[];
  teams: Club[];
  userClub?: Club | null;
  currentRound?: number;
}

export interface ProcessMatchResultOutput {
  updatedStandings: LeagueStanding[];
  updatedCup: CupTournament | null;
  updatedCupTournament: CupTournament | null;
  updatedContinental: ContinentalTournament | null;
  updatedContinentalTournament: ContinentalTournament | null;
  updatedFixture: Fixture;
  updatedFixtures: Fixture[];
  updatedTeams: Club[];
  competitionBadge: string;
  competitionName: string;
  stageLabel: string;
  isUserMatch: boolean;
  userOutcome?: 'win' | 'draw' | 'loss';
  newsTitle: string;
  newsContent: string;
}

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

/**
 * Returns human-readable Arabic branding details for any fixture/competition.
 * Null-safe and supports UCL, UEL, CCL, CCC, and all Domestic National Cups.
 */
export function getCompetitionBranding(
  fixture?: Partial<Fixture> | null,
  defaultLeagueName?: string
): {
  type: 'LEAGUE' | 'DOMESTIC_COP' | 'CONTINENTAL_CUP';
  badge: string;
  name: string;
  stageName: string;
} {
  if (!fixture) {
    return {
      type: 'LEAGUE',
      badge: `🏟️ ${defaultLeagueName || 'الدوري'}`,
      name: defaultLeagueName || 'الدوري العام',
      stageName: 'مباراة رسمية',
    };
  }

  const rawId = String(fixture.id || '').toLowerCase();
  const rawCompId = String(fixture.competitionId || fixture.tournamentId || '').toLowerCase();

  const normType = normalizeCompetitionType(
    fixture.competitionType ||
      fixture.tournamentId ||
      fixture.competitionId ||
      (fixture.cupStage ? 'DOMESTIC_COP' : undefined) ||
      (rawId.includes('caf_cl') ||
      rawId.startsWith('ccl_') ||
      rawId.startsWith('ccc_') ||
      rawId.startsWith('ucl_') ||
      rawId.startsWith('uel_')
        ? 'CONTINENTAL_CUP'
        : undefined) ||
      (rawId.startsWith('cup_') || rawId.includes('_cup_') ? 'DOMESTIC_COP' : undefined)
  );

  if (normType === 'CONTINENTAL_CUP') {
    const meta = CalendarManager.getContinentalMeta(
      rawCompId || rawId,
      fixture.competitionName
    );
    return {
      type: 'CONTINENTAL_CUP',
      badge: fixture.tournamentBadge || meta.badge,
      name: fixture.competitionName || meta.name,
      stageName: fixture.stageName || fixture.stage || 'دور المجموعات',
    };
  }

  if (normType === 'DOMESTIC_COP') {
    const cupName = fixture.competitionName || 'الكأس الوطنية';
    return {
      type: 'DOMESTIC_COP',
      badge: fixture.tournamentBadge || `🛡️ ${cupName}`,
      name: cupName,
      stageName: fixture.stageName || fixture.cupStage || 'الأدوار الإقصائية للكأس',
    };
  }

  return {
    type: 'LEAGUE',
    badge: fixture.tournamentBadge || `🏟️ ${defaultLeagueName || 'الدوري'}`,
    name: fixture.competitionName || defaultLeagueName || 'الدوري العام',
    stageName: fixture.stageName || (fixture.round ? `الجولة ${fixture.round}` : 'مباراة بالدوري'),
  };
}

/**
 * Resolves the final winner of a match, taking penalties into account for knockout cups
 */
export function resolveMatchWinner(
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  homePenalties?: number,
  awayPenalties?: number,
  forcedWinnerTeamId?: string
): string | undefined {
  if (forcedWinnerTeamId) return forcedWinnerTeamId;
  if (
    homePenalties !== undefined &&
    awayPenalties !== undefined &&
    homePenalties !== awayPenalties
  ) {
    return homePenalties > awayPenalties ? homeTeamId : awayTeamId;
  }
  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;
  return undefined;
}

/**
 * Central Tournament Dispatcher:
 * Dispatches and commits match results atomically across:
 * 1. Domestic League tables (points, GD, stats)
 * 2. Continental Cup group stage standings & knockout brackets (CCL, CCC, UCL, UEL)
 * 3. Domestic Cup elimination brackets & round progression
 * 4. Player stats (goals, assists, cards, clean sheets, ratings)
 */
export function processMatchResult(
  fixtureOrOptions: Fixture | ProcessMatchResultOptions,
  context?: ProcessMatchStateContext
): ProcessMatchResultOutput {
  let fixture: Fixture;
  let homeScore: number;
  let awayScore: number;
  let homePenalties: number | undefined;
  let awayPenalties: number | undefined;
  let winnerTeamId: string | undefined;
  let events: MatchEvent[];
  let stats: MatchStats | undefined;
  let currentStandings: LeagueStanding[];
  let currentCup: CupTournament | null;
  let currentContinental: ContinentalTournament | null;
  let currentFixtures: Fixture[];
  let teams: Club[];
  let userClubId: string | undefined;

  if (context || !('fixture' in fixtureOrOptions)) {
    fixture = fixtureOrOptions as Fixture;
    homeScore = fixture?.homeScore ?? 0;
    awayScore = fixture?.awayScore ?? 0;
    homePenalties = fixture?.homePenalties;
    awayPenalties = fixture?.awayPenalties;
    winnerTeamId = fixture?.winnerTeamId;
    events = fixture?.events || [];
    stats = fixture?.stats;
    currentStandings = context?.standings || [];
    currentCup = context?.cupTournament || null;
    currentContinental = context?.continentalTournament || null;
    currentFixtures = context?.fixtures || [];
    teams = context?.teams || [];
    userClubId = context?.userClub?.id;
  } else {
    const opts = fixtureOrOptions as ProcessMatchResultOptions;
    fixture = opts.fixture;
    homeScore = opts.homeScore ?? opts.fixture?.homeScore ?? 0;
    awayScore = opts.awayScore ?? opts.fixture?.awayScore ?? 0;
    homePenalties = opts.homePenalties ?? opts.fixture?.homePenalties;
    awayPenalties = opts.awayPenalties ?? opts.fixture?.awayPenalties;
    winnerTeamId = opts.winnerTeamId ?? opts.fixture?.winnerTeamId;
    events = opts.events ?? opts.fixture?.events ?? [];
    stats = opts.stats ?? opts.fixture?.stats;
    currentStandings = opts.currentStandings ?? opts.standings ?? [];
    currentCup = opts.currentCup ?? opts.cupTournament ?? null;
    currentContinental = opts.currentContinental ?? opts.continentalTournament ?? null;
    currentFixtures = opts.fixtures ?? [];
    teams = opts.teams ?? [];
    userClubId = opts.userClubId ?? opts.userClub?.id;
  }

  const branding = getCompetitionBranding(fixture);
  const normType = branding.type;

  const resolvedWinner = resolveMatchWinner(
    fixture?.homeTeamId || '',
    fixture?.awayTeamId || '',
    homeScore,
    awayScore,
    homePenalties,
    awayPenalties,
    winnerTeamId
  );

  const preservedCompetitionType: CompetitionType =
    fixture?.competitionType ||
    (normType === 'CONTINENTAL_CUP'
      ? 'CONTINENTAL_CUP'
      : normType === 'DOMESTIC_COP'
      ? 'DOMESTIC_COP'
      : 'LEAGUE');

  const compactEvents = pruneMatchEventsForStorage(events, true);

  const updatedFixture: Fixture = {
    ...fixture,
    homeScore,
    awayScore,
    homePenalties,
    awayPenalties,
    winnerTeamId: resolvedWinner,
    isPlayed: true,
    events: compactEvents,
    stats,
    competitionType: preservedCompetitionType,
    competitionName: fixture?.competitionName || branding.name,
    tournamentBadge: fixture?.tournamentBadge || branding.badge,
    stageName: fixture?.stageName || branding.stageName,
  };

  let updatedFixtures = currentFixtures.map(f =>
    f && f.id === updatedFixture.id ? updatedFixture : f
  );

  const isUserHome = Boolean(userClubId && updatedFixture.homeTeamId === userClubId);
  const isUserAway = Boolean(userClubId && updatedFixture.awayTeamId === userClubId);
  const isUserMatch = isUserHome || isUserAway;

  let userOutcome: 'win' | 'draw' | 'loss' | undefined = undefined;
  if (isUserMatch) {
    if (resolvedWinner) {
      userOutcome = resolvedWinner === userClubId ? 'win' : 'loss';
    } else {
      userOutcome =
        homeScore === awayScore
          ? 'draw'
          : isUserHome
          ? homeScore > awayScore
            ? 'win'
            : 'loss'
          : awayScore > homeScore
          ? 'win'
          : 'loss';
    }
  }

  let updatedStandings = [...currentStandings];
  let updatedCup = currentCup
    ? { ...currentCup, matches: [...(currentCup.matches || [])] }
    : null;
  let updatedContinental = currentContinental
    ? {
        ...currentContinental,
        groups: (currentContinental.groups || []).map(g => ({
          ...g,
          standings: [...(g.standings || [])],
        })),
        matches: [...(currentContinental.matches || [])],
      }
    : null;

  // --------------------------------------------------------------------------
  // 1. LEAGUE PROCESSING
  // --------------------------------------------------------------------------
  if (normType === 'LEAGUE') {
    updatedStandings = updateLeagueStandings(
      updatedStandings,
      updatedFixture.homeTeamId,
      updatedFixture.awayTeamId,
      homeScore,
      awayScore
    );
  }

  // --------------------------------------------------------------------------
  // 2. CONTINENTAL CUP PROCESSING (CCL / CCC / UCL / UEL)
  // --------------------------------------------------------------------------
  if (normType === 'CONTINENTAL_CUP' && updatedContinental) {
    const compCode = updatedContinental.competitionId || 'ccl';
    const compName = updatedContinental.name || branding.name;
    const meta = CalendarManager.getContinentalMeta(compCode, compName);

    const cMatchIdx = updatedContinental.matches.findIndex(
      m =>
        m.id === updatedFixture.id ||
        (m.homeTeamId === updatedFixture.homeTeamId &&
          m.awayTeamId === updatedFixture.awayTeamId &&
          ((updatedFixture.matchday && m.matchday === updatedFixture.matchday) ||
            m.stage === updatedFixture.stage ||
            m.stageName === updatedFixture.stageName))
    );

    if (cMatchIdx !== -1) {
      updatedContinental = {
        ...updatedContinental,
        matches: updatedContinental.matches.map((m, idx) =>
          idx === cMatchIdx
            ? {
                ...m,
                homeScore,
                awayScore,
                homePenalties,
                awayPenalties,
                winnerTeamId: resolvedWinner,
                isPlayed: true,
                events: [],
                stats,
              }
            : { ...m }
        ),
      };
    } else {
      updatedContinental = {
        ...updatedContinental,
        matches: [
          ...updatedContinental.matches.map(m => ({ ...m })),
          {
            id: updatedFixture.id,
            stage: (updatedFixture.stage as any) || 'group',
            stageName: branding.stageName,
            roundTrigger: updatedFixture.round || 1,
            matchday: updatedFixture.matchday,
            groupId: updatedFixture.groupId,
            homeTeamId: updatedFixture.homeTeamId,
            awayTeamId: updatedFixture.awayTeamId,
            homeScore,
            awayScore,
            homePenalties,
            awayPenalties,
            winnerTeamId: resolvedWinner,
            isPlayed: true,
            events: [],
            stats,
          },
        ],
      };
    }

    // 2b & 2c. Recalculate Continental Group Standings immutably from all played matches & unlock Quarter-Finals when all 6 matchdays complete
    updatedContinental = recalculateContinentalGroupStandings(
      updatedContinental,
      updatedFixtures
    );

    const isQuarter =
      updatedFixture.stage === 'quarter' || updatedFixture.stageName?.includes('ربع');
    const isSemi =
      updatedFixture.stage === 'semi' || updatedFixture.stageName?.includes('نصف');
    const isFinal =
      (updatedFixture.stage === 'final' || updatedFixture.stageName?.includes('نهائي')) &&
      !isQuarter &&
      !isSemi;

    if (isFinal) {
      updatedContinental.isCompleted = true;
      updatedContinental.winnerClubId = resolvedWinner;
      updatedContinental.runnerUpClubId =
        resolvedWinner === updatedFixture.homeTeamId
          ? updatedFixture.awayTeamId
          : updatedFixture.homeTeamId;
      updatedContinental.currentStage = 'completed';
    } else if (isSemi) {
      const semiMatches = updatedContinental.matches.filter(m => m.stage === 'semi');
      // Resolve any remaining unplayed AI semi-final match immediately
      semiMatches.forEach(m => {
        if (!m.isPlayed) {
          const homeClub = teams.find(t => t.id === m.homeTeamId) || findClubInWorld(m.homeTeamId) || ({ id: m.homeTeamId, name: 'فريق إفريقي' } as any);
          const awayClub = teams.find(t => t.id === m.awayTeamId) || findClubInWorld(m.awayTeamId) || ({ id: m.awayTeamId, name: 'فريق إفريقي' } as any);
          const res = simulateKnockoutMatch(homeClub, awayClub);
          m.homeScore = res.homeScore;
          m.awayScore = res.awayScore;
          m.homePenalties = res.homePenalties;
          m.awayPenalties = res.awayPenalties;
          m.winnerTeamId = res.winnerTeamId;
          m.isPlayed = true;
          const fixIdx = updatedFixtures.findIndex(f => f.id === m.id);
          if (fixIdx !== -1) {
            updatedFixtures[fixIdx] = {
              ...updatedFixtures[fixIdx],
              homeScore: res.homeScore,
              awayScore: res.awayScore,
              homePenalties: res.homePenalties,
              awayPenalties: res.awayPenalties,
              winnerTeamId: res.winnerTeamId,
              isPlayed: true,
            };
          }
        }
      });
      if (semiMatches.length >= 2 && semiMatches.every(m => m.isPlayed)) {
        const finalist1 =
          resolveMatchWinner(
            semiMatches[0].homeTeamId,
            semiMatches[0].awayTeamId,
            semiMatches[0].homeScore || 0,
            semiMatches[0].awayScore || 0,
            semiMatches[0].homePenalties,
            semiMatches[0].awayPenalties,
            semiMatches[0].winnerTeamId
          ) || semiMatches[0].homeTeamId;
        const finalist2 =
          resolveMatchWinner(
            semiMatches[1].homeTeamId,
            semiMatches[1].awayTeamId,
            semiMatches[1].homeScore || 0,
            semiMatches[1].awayScore || 0,
            semiMatches[1].homePenalties,
            semiMatches[1].awayPenalties,
            semiMatches[1].winnerTeamId
          ) || semiMatches[1].homeTeamId;

        const existingFinal = updatedContinental.matches.find(m => m.stage === 'final');
        if (existingFinal) {
          existingFinal.homeTeamId = finalist1;
          existingFinal.awayTeamId = finalist2;
        } else {
          updatedContinental.matches.push({
            id: `${compCode}_final_s${updatedContinental.seasonNumber}`,
            stage: 'final',
            stageName: `نهائي ${compName} الكبير 🏆`,
            roundTrigger: 28,
            homeTeamId: finalist1,
            awayTeamId: finalist2,
            isPlayed: false,
          });
        }
        updatedContinental.currentStage = 'final';
      }
    } else if (isQuarter) {
      const qfMatches = updatedContinental.matches.filter(m => m.stage === 'quarter');
      // Resolve any remaining unplayed AI quarter-final matches immediately
      qfMatches.forEach(m => {
        if (!m.isPlayed) {
          const homeClub = teams.find(t => t.id === m.homeTeamId) || findClubInWorld(m.homeTeamId) || ({ id: m.homeTeamId, name: 'فريق إفريقي' } as any);
          const awayClub = teams.find(t => t.id === m.awayTeamId) || findClubInWorld(m.awayTeamId) || ({ id: m.awayTeamId, name: 'فريق إفريقي' } as any);
          const res = simulateKnockoutMatch(homeClub, awayClub);
          m.homeScore = res.homeScore;
          m.awayScore = res.awayScore;
          m.homePenalties = res.homePenalties;
          m.awayPenalties = res.awayPenalties;
          m.winnerTeamId = res.winnerTeamId;
          m.isPlayed = true;
          const fixIdx = updatedFixtures.findIndex(f => f.id === m.id);
          if (fixIdx !== -1) {
            updatedFixtures[fixIdx] = {
              ...updatedFixtures[fixIdx],
              homeScore: res.homeScore,
              awayScore: res.awayScore,
              homePenalties: res.homePenalties,
              awayPenalties: res.awayPenalties,
              winnerTeamId: res.winnerTeamId,
              isPlayed: true,
            };
          }
        }
      });
      if (qfMatches.length >= 4 && qfMatches.every(m => m.isPlayed)) {
        const qfWinners = qfMatches.map(
          m =>
            resolveMatchWinner(
              m.homeTeamId,
              m.awayTeamId,
              m.homeScore || 0,
              m.awayScore || 0,
              m.homePenalties,
              m.awayPenalties,
              m.winnerTeamId
            ) || m.homeTeamId
        );
        const existingSemis = updatedContinental.matches.filter(m => m.stage === 'semi');
        if (existingSemis.length >= 2) {
          existingSemis[0].homeTeamId = qfWinners[0];
          existingSemis[0].awayTeamId = qfWinners[1];
          existingSemis[1].homeTeamId = qfWinners[2];
          existingSemis[1].awayTeamId = qfWinners[3];
        } else {
          updatedContinental.matches.push(
            {
              id: `${compCode}_semi_1_s${updatedContinental.seasonNumber}`,
              stage: 'semi',
              stageName: `نصف نهائي ${compName} (1)`,
              roundTrigger: 22,
              homeTeamId: qfWinners[0],
              awayTeamId: qfWinners[1],
              isPlayed: false,
            },
            {
              id: `${compCode}_semi_2_s${updatedContinental.seasonNumber}`,
              stage: 'semi',
              stageName: `نصف نهائي ${compName} (2)`,
              roundTrigger: 22,
              homeTeamId: qfWinners[2],
              awayTeamId: qfWinners[3],
              isPlayed: false,
            }
          );
        }
        updatedContinental.currentStage = 'semi';
      }
    }

    // 2d. Synchronize any newly generated Continental knockout matches into updatedFixtures
    const existingIds = new Set(updatedFixtures.map(f => f?.id).filter(Boolean));
    const newContinentalFixes: Fixture[] = [];
    for (const cm of updatedContinental.matches) {
      if (!cm || !cm.id || existingIds.has(cm.id)) continue;
      const mdInfo = CalendarManager.resolveContinentalMatchDate(
        cm,
        updatedContinental.seasonNumber || 1,
        compCode,
        compName
      );
      newContinentalFixes.push({
        id: cm.id,
        round: cm.roundTrigger || 18,
        matchday: cm.matchday,
        date: mdInfo.dateStr,
        timestamp: mdInfo.dateObj.getTime(),
        homeTeamId: cm.homeTeamId,
        awayTeamId: cm.awayTeamId,
        homeScore: cm.homeScore,
        awayScore: cm.awayScore,
        homePenalties: cm.homePenalties,
        awayPenalties: cm.awayPenalties,
        winnerTeamId: cm.winnerTeamId,
        isPlayed: Boolean(cm.isPlayed),
        events: cm.events || [],
        stats: cm.stats,
        competitionType: 'CONTINENTAL_CUP',
        competitionId: compCode,
        competitionName: compName,
        tournamentId: meta.compCode,
        tournamentBadge: meta.badge,
        stage: cm.stage,
        stageName: mdInfo.stageName,
        groupId: cm.groupId,
      });
      existingIds.add(cm.id);
    }
    if (newContinentalFixes.length > 0) {
      updatedFixtures = [...updatedFixtures, ...newContinentalFixes].sort((a, b) =>
        String(a?.date || '9999-99-99').localeCompare(String(b?.date || '9999-99-99'))
      );
    }
  }

  // --------------------------------------------------------------------------
  // 3. DOMESTIC CUP PROCESSING (National Cup for All Countries)
  // --------------------------------------------------------------------------
  if (normType === 'DOMESTIC_COP' && updatedCup) {
    const cupMatchIdx = updatedCup.matches.findIndex(
      m =>
        m.id === updatedFixture.id ||
        (m.homeTeamId === updatedFixture.homeTeamId &&
          m.awayTeamId === updatedFixture.awayTeamId &&
          (m.stage === updatedFixture.cupStage || m.stage === updatedFixture.stage || m.stageName === updatedFixture.stageName))
    );

    if (cupMatchIdx !== -1) {
      updatedCup.matches[cupMatchIdx] = {
        ...updatedCup.matches[cupMatchIdx],
        homeScore,
        awayScore,
        homePenalties,
        awayPenalties,
        winnerTeamId: resolvedWinner,
        isPlayed: true,
        events: [],
        stats,
      };
    }

    if (isUserMatch && userClubId && resolvedWinner) {
      if (resolvedWinner === userClubId) {
        updatedCup.userEliminatedStage = undefined;
      } else {
        updatedCup.userEliminatedStage =
          updatedFixture.stageName ||
          updatedCup.matches[cupMatchIdx]?.stageName ||
          branding.stageName ||
          'الكأس الوطنية';
      }
    }

    const currentStageName =
      updatedFixture.cupStage ||
      updatedCup.matches[cupMatchIdx]?.stage ||
      (updatedFixture.stage as any);

    const stageProgressionMap: Record<
      string,
      { nextStage: CupMatch['stage']; nextArabic: string; roundTrigger: number }
    > = {
      round_of_64: { nextStage: 'round_of_32', nextArabic: 'دور الـ 32', roundTrigger: 8 },
      round_of_32: { nextStage: 'round_of_16', nextArabic: 'ثمن النهائي (دور الـ 16)', roundTrigger: 13 },
      round_of_16: { nextStage: 'quarter', nextArabic: 'ربع النهائي', roundTrigger: 19 },
      quarter: { nextStage: 'semi', nextArabic: 'نصف النهائي', roundTrigger: 24 },
      semi: { nextStage: 'final', nextArabic: 'المباراة النهائية 🏆', roundTrigger: 29 },
    };

    if (currentStageName && stageProgressionMap[currentStageName]) {
      const stageMatches = updatedCup.matches.filter(m => m.stage === currentStageName);
      const nextInfo = stageProgressionMap[currentStageName];
      const alreadyHasNextStage = updatedCup.matches.some(m => m.stage === nextInfo.nextStage);

      // Resolve any remaining unplayed AI matches of this stage immediately
      stageMatches.forEach(m => {
        if (!m.isPlayed) {
          const homeClub = teams.find(t => t.id === m.homeTeamId) || findClubInWorld(m.homeTeamId) || ({ id: m.homeTeamId, name: 'فريق الكأس' } as any);
          const awayClub = teams.find(t => t.id === m.awayTeamId) || findClubInWorld(m.awayTeamId) || ({ id: m.awayTeamId, name: 'فريق الكأس' } as any);
          const res = simulateKnockoutMatch(homeClub, awayClub);
          m.homeScore = res.homeScore;
          m.awayScore = res.awayScore;
          m.homePenalties = res.homePenalties;
          m.awayPenalties = res.awayPenalties;
          m.winnerTeamId = res.winnerTeamId;
          m.isPlayed = true;
          const fixIdx = updatedFixtures.findIndex(f => f.id === m.id);
          if (fixIdx !== -1) {
            updatedFixtures[fixIdx] = {
              ...updatedFixtures[fixIdx],
              homeScore: res.homeScore,
              awayScore: res.awayScore,
              homePenalties: res.homePenalties,
              awayPenalties: res.awayPenalties,
              winnerTeamId: res.winnerTeamId,
              isPlayed: true,
            };
          }
        }
      });

      if (stageMatches.length >= 1 && stageMatches.every(m => m.isPlayed) && !alreadyHasNextStage) {
        const winners = stageMatches.map(
          m =>
            resolveMatchWinner(
              m.homeTeamId,
              m.awayTeamId,
              m.homeScore || 0,
              m.awayScore || 0,
              m.homePenalties,
              m.awayPenalties,
              m.winnerTeamId
            ) || m.homeTeamId
        );

        const numNextMatches = Math.floor(winners.length / 2);
        const cupDef = getDomesticCupDefinitionForCountry(updatedCup.country || 'مصر');
        const cupDisplayName = updatedCup.name || cupDef.shortName || cupDef.name;
        const stageDateInfo = CalendarManager.resolveDomesticCupStageDate(
          nextInfo.nextStage,
          updatedCup.seasonNumber || 1,
          cupDisplayName
        );
        const existingFixIds = new Set(updatedFixtures.map(f => f?.id).filter(Boolean));
        const newCupFixtures: Fixture[] = [];

        for (let i = 0; i < numNextMatches; i++) {
          const homeId = winners[i * 2];
          const awayId = winners[i * 2 + 1];
          if (!homeId || !awayId) continue;

          const newCupMatch: CupMatch = {
            id: `cup_${nextInfo.nextStage}_${i + 1}_s${updatedCup.seasonNumber || 1}`,
            stage: nextInfo.nextStage,
            stageName: nextInfo.nextArabic,
            roundTrigger: nextInfo.roundTrigger,
            homeTeamId: homeId,
            awayTeamId: awayId,
            isPlayed: false,
          };
          updatedCup.matches.push(newCupMatch);

          if (!existingFixIds.has(newCupMatch.id)) {
            newCupFixtures.push({
              id: newCupMatch.id,
              round: nextInfo.roundTrigger,
              homeTeamId: homeId,
              awayTeamId: awayId,
              competitionType: 'DOMESTIC_COP',
              competitionId: updatedCup.id || cupDef.id,
              tournamentId: 'cup',
              competitionName: cupDisplayName,
              tournamentBadge: `🛡️ ${cupDef.shortName || cupDisplayName}`,
              cupStage: nextInfo.nextStage,
              stage: nextInfo.nextStage,
              stageName: stageDateInfo.stageName,
              date: stageDateInfo.dateStr,
              timestamp: stageDateInfo.dateObj.getTime(),
              isPlayed: false,
            });
            existingFixIds.add(newCupMatch.id);
          }
        }

        if (newCupFixtures.length > 0) {
          updatedFixtures = [...updatedFixtures, ...newCupFixtures].sort((a, b) =>
            String(a?.date || '9999-99-99').localeCompare(String(b?.date || '9999-99-99'))
          );
        }
      }
    }

    const isCupFinal =
      currentStageName === 'final' ||
      (updatedFixture.stageName?.includes('نهائي') &&
        !updatedFixture.stageName?.includes('نصف') &&
        !updatedFixture.stageName?.includes('ربع') &&
        !updatedFixture.stageName?.includes('ثمن'));

    if (isCupFinal) {
      updatedCup.isCompleted = true;
      updatedCup.winnerClubId = resolvedWinner;
      updatedCup.runnerUpClubId =
        resolvedWinner === updatedFixture.homeTeamId
          ? updatedFixture.awayTeamId
          : updatedFixture.homeTeamId;
    }
  }

  // --------------------------------------------------------------------------
  // 4. PLAYER STATISTICS & LEADERBOARDS LISTENER
  // --------------------------------------------------------------------------
  const scorerCounts = new Map<string, number>();
  const assistCounts = new Map<string, number>();
  const yellowCounts = new Map<string, number>();
  const redCounts = new Map<string, number>();

  events.forEach(evt => {
    if (!evt) return;
    if (evt.type === 'goal' && evt.playerId) {
      scorerCounts.set(evt.playerId, (scorerCounts.get(evt.playerId) || 0) + 1);
    }
    if (evt.assistPlayerId) {
      assistCounts.set(evt.assistPlayerId, (assistCounts.get(evt.assistPlayerId) || 0) + 1);
    }
    if (evt.type === 'yellow_card' && evt.playerId) {
      yellowCounts.set(evt.playerId, (yellowCounts.get(evt.playerId) || 0) + 1);
    }
    if (evt.type === 'red_card' && evt.playerId) {
      redCounts.set(evt.playerId, (redCounts.get(evt.playerId) || 0) + 1);
    }
  });

  const isHomeCleanSheet = awayScore === 0;
  const isAwayCleanSheet = homeScore === 0;

  const updatedTeams = (teams || []).map(t => {
    if (!t || (t.id !== updatedFixture.homeTeamId && t.id !== updatedFixture.awayTeamId)) {
      return t;
    }

    const isHome = t.id === updatedFixture.homeTeamId;
    const teamCleanSheet = isHome ? isHomeCleanSheet : isAwayCleanSheet;

    const updatedPlayers = (t.players || []).map(p => {
      if (!p) return p;
      const addedGoals = scorerCounts.get(p.id) || 0;
      const addedAssists = assistCounts.get(p.id) || 0;
      const addedYellows = yellowCounts.get(p.id) || 0;
      const addedReds = redCounts.get(p.id) || 0;
      const isGk = p.position === 'GK' || p.positionCategory === 'GK';

      if (
        !addedGoals &&
        !addedAssists &&
        !addedYellows &&
        !addedReds &&
        (!isGk || !teamCleanSheet)
      ) {
        return p;
      }

      const prevStats = p.stats || {
        appearances: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        cleanSheets: 0,
        averageRating: 7.0,
      };

      return {
        ...p,
        stats: {
          ...prevStats,
          goals: prevStats.goals + addedGoals,
          assists: prevStats.assists + addedAssists,
          yellowCards: prevStats.yellowCards + addedYellows,
          redCards: prevStats.redCards + addedReds,
          cleanSheets: prevStats.cleanSheets + (isGk && teamCleanSheet ? 1 : 0),
        },
      };
    });

    return {
      ...t,
      players: updatedPlayers,
    };
  });

  // News output
  const homeClub = (teams || []).find(t => t && t.id === updatedFixture.homeTeamId);
  const awayClub = (teams || []).find(t => t && t.id === updatedFixture.awayTeamId);
  const homeName = homeClub?.shortName || homeClub?.name || 'المضيف';
  const awayName = awayClub?.shortName || awayClub?.name || 'الضيف';

  let newsTitle = `${branding.badge}: ${homeName} (${homeScore}) - (${awayScore}) ${awayName}`;
  if (homePenalties !== undefined && awayPenalties !== undefined) {
    newsTitle += ` [${homePenalties}-${awayPenalties} ركلات]`;
  }

  const newsContent = `أقيمت مواجهة (${branding.stageName}) ضمن مسابقة ${branding.name} وانتهت بنتيجة (${homeScore} - ${awayScore}) لصالح ${
    resolvedWinner
      ? resolvedWinner === updatedFixture.homeTeamId
        ? homeName
        : awayName
      : 'التعادل'
  }.`;

  return {
    updatedStandings,
    updatedCup,
    updatedCupTournament: updatedCup,
    updatedContinental,
    updatedContinentalTournament: updatedContinental,
    updatedFixture,
    updatedFixtures,
    updatedTeams,
    competitionBadge: branding.badge,
    competitionName: branding.name,
    stageLabel: branding.stageName,
    isUserMatch,
    userOutcome,
    newsTitle,
    newsContent,
  };
}
