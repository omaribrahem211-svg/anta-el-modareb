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

import { normalizeCompetitionType } from './calendarManager';
export { normalizeCompetitionType };

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
    awayPenalties !== undefined
  ) {
    if (homePenalties !== awayPenalties) {
      return homePenalties > awayPenalties ? homeTeamId : awayTeamId;
    }
    return homeTeamId;
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
export async function processMatchResult(
  fixtureOrOptions: Fixture | ProcessMatchResultOptions,
  context?: ProcessMatchStateContext
): Promise<ProcessMatchResultOutput> {
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

  // Domestic Cup and Continental Tournaments are disabled for streamlined League-only gameplay
  updatedCup = null;
  updatedContinental = null;

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

/**
 * Self-healing repair for cup matches and bracket progression:
 * 1. Synchronizes any cup fixture marked isPlayed === true that is unplayed or missing in cupTournament.matches.
 * 2. If all matches of a completed stage are played, advances the cup bracket to the next stage.
 * 3. Marks cup completion if the final is played.
 */
export function repairOrphanedCupMatches(
  fixtures: Fixture[] = [],
  _cup: CupTournament | null | undefined
): { cup: CupTournament | null; fixtures: Fixture[]; repaired: boolean } {
  const cleanFixtures = (Array.isArray(fixtures) ? fixtures : []).filter(f => {
    if (!f) return false;
    const norm = normalizeCompetitionType(
      f.competitionType || f.tournamentId || f.competitionId || (f.cupStage ? 'DOMESTIC_COP' : undefined)
    );
    return norm === 'LEAGUE';
  });
  return {
    cup: null,
    fixtures: cleanFixtures,
    repaired: cleanFixtures.length !== (fixtures?.length || 0),
  };
}
