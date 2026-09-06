import { Club, Fixture, LeagueDefinition, LeagueStanding, ManagerProfile, TeamTactics } from '../types/game';
import { simulateMatch, updateLeagueStandings } from './engine';
import { processPostMatchPlayerUpdates } from './playerFatigueEngine';

export interface BatchSimulationResult {
  nextTeams: Club[];
  nextStandings: LeagueStanding[];
  nextFixtures: Fixture[];
  nextRound: number;
  simulatedRoundsCount: number;
  seasonFinished: boolean;
  userClubStatsDelta: {
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  };
}

/**
 * Simulates multiple rounds of league fixtures sequentially in a single batch transaction.
 * Accurately updates standings, fixtures, player statistics, stamina, morale, and records.
 */
export function simulateMultipleLeagueRounds(
  roundsToSimulate: number,
  startRound: number,
  totalRounds: number,
  currentTeams: Club[],
  currentStandings: LeagueStanding[],
  currentFixtures: Fixture[],
  activeLeague: LeagueDefinition,
  userClubId?: string
): BatchSimulationResult {
  let simTeams = currentTeams.map(t => ({ ...t, players: [...(t.players || [])] }));
  let simStandings = [...currentStandings];
  let simFixtures = [...currentFixtures];
  let roundPtr = startRound;
  let simulatedCount = 0;

  const userStatsDelta = {
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };

  while (simulatedCount < roundsToSimulate && roundPtr <= totalRounds) {
    const currentRoundFixtures = simFixtures.filter(f => f.round === roundPtr && !f.isPlayed);
    if (currentRoundFixtures.length === 0) {
      roundPtr++;
      continue;
    }

    const roundMatches: { homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number }[] = [];

    // Simulate each fixture of this round
    currentRoundFixtures.forEach(fix => {
      const homeTeam = simTeams.find(t => t && t.id === fix.homeTeamId) || simTeams[0];
      const awayTeam = simTeams.find(t => t && t.id === fix.awayTeamId) || simTeams[1];

      if (!homeTeam || !awayTeam) return;

      const matchRes = simulateMatch(homeTeam, awayTeam, homeTeam.tactics, awayTeam.tactics);

      // Update fixture
      simFixtures = simFixtures.map(f => {
        if (f.id === fix.id) {
          return {
            ...f,
            homeScore: matchRes.homeScore,
            awayScore: matchRes.awayScore,
            isPlayed: true,
            events: matchRes.events,
            stats: matchRes.stats,
          };
        }
        return f;
      });

      roundMatches.push({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: matchRes.homeScore,
        awayScore: matchRes.awayScore,
      });

      // Update league standings
      simStandings = updateLeagueStandings(simStandings, homeTeam.id, awayTeam.id, matchRes.homeScore, matchRes.awayScore);

      // Track user stats
      if (userClubId && (homeTeam.id === userClubId || awayTeam.id === userClubId)) {
        const isUserHome = homeTeam.id === userClubId;
        const uScore = isUserHome ? matchRes.homeScore : matchRes.awayScore;
        const oScore = isUserHome ? matchRes.awayScore : matchRes.homeScore;

        userStatsDelta.goalsFor += uScore;
        userStatsDelta.goalsAgainst += oScore;

        if (uScore > oScore) {
          userStatsDelta.wins += 1;
          userStatsDelta.points += 3;
        } else if (uScore === oScore) {
          userStatsDelta.draws += 1;
          userStatsDelta.points += 1;
        } else {
          userStatsDelta.losses += 1;
        }
      }
    });

    // Update player stats & fatigue for clubs that played in this round
    simTeams = simTeams.map(club => {
      const match = roundMatches.find(m => m.homeTeamId === club.id || m.awayTeamId === club.id);
      if (!match) return club;

      const isHome = match.homeTeamId === club.id;
      const tScore = isHome ? match.homeScore : match.awayScore;
      const oppScore = isHome ? match.awayScore : match.homeScore;
      const isWin = tScore > oppScore;
      const isDraw = tScore === oppScore;

      const startingIds = club.tactics?.startingPlayerIds || (club.players || []).slice(0, 11).map(p => p?.id).filter(Boolean) as string[];

      const updateRes = processPostMatchPlayerUpdates(
        club,
        startingIds,
        { events: [], homeScore: match.homeScore, awayScore: match.awayScore },
        isWin,
        isDraw,
        club.id === userClubId
      );

      // Update basic appearances for starters
      const finalPlayers = (updateRes.updatedPlayers || []).filter(Boolean).map(p => {
        const isStarter = p?.id ? startingIds.includes(p.id) : false;
        const currentApps = p.stats?.appearances || 0;
        return {
          ...p,
          stats: {
            ...p.stats,
            appearances: currentApps + (isStarter ? 1 : 0),
          },
        };
      });

      return {
        ...club,
        players: finalPlayers,
      };
    });

    simulatedCount++;
    roundPtr++;
  }

  const isSeasonOver = roundPtr > totalRounds;

  return {
    nextTeams: simTeams,
    nextStandings: simStandings,
    nextFixtures: simFixtures,
    nextRound: Math.min(roundPtr, totalRounds),
    simulatedRoundsCount: simulatedCount,
    seasonFinished: isSeasonOver,
    userClubStatsDelta: userStatsDelta,
  };
}
