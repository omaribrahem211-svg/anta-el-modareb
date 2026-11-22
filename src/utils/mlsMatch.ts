import type { Club, Fixture, MatchEvent, MatchStats } from '../types/game';
import { createInitialLiveMatchState, simulateMatchStep, simulatePenaltyShootout } from './engine';
import { mlsUsesExtraTime } from './mlsPlayoffs';
type Score = { homeScore: number; awayScore: number; events?: MatchEvent[]; stats?: MatchStats; homePenalties?: number; awayPenalties?: number; winnerTeamId?: string };
/** Resolve a simulated MLS playoff through the same engine rules as a watched game. */
export function resolveMLSPlayoffScore<T extends Score>(fixture: Fixture, score: T, home: Club, away: Club): T & { homePenalties?: number; awayPenalties?: number; winnerTeamId?: string } {
  if (!fixture.mlsPlayoff) return score;
  let result: Score = { ...score };
  if (result.homeScore === result.awayScore && !(result.homePenalties != null && result.awayPenalties != null && result.homePenalties !== result.awayPenalties)) {
    if (mlsUsesExtraTime(fixture)) {
      let live = createInitialLiveMatchState(fixture, home, away);
      live = { ...live, currentMinute: 90, homeScore: result.homeScore, awayScore: result.awayScore, events: [...(result.events || [])], stats: result.stats || live.stats, isExtraTime: true, isHalfTime: false, isPlaying: true };
      let steps = 0;
      while (!live.isFinished && steps++ < 40) {
        if (live.isHalfTime) live = { ...live, isHalfTime: false, isPlaying: true };
        live = simulateMatchStep(live);
      }
      if (!live.isFinished) throw new Error('MLS extra time did not finish');
      result = { ...result, homeScore: live.homeScore, awayScore: live.awayScore, homePenalties: live.homePenalties, awayPenalties: live.awayPenalties, events: live.events, stats: live.stats };
    } else {
      const pens = simulatePenaltyShootout(home, away, home.tactics, away.tactics, undefined, { minute: 90, isSeriesMatch: fixture.mlsPlayoff.stage === 'round_one' });
      result = { ...result, homePenalties: pens.homePenalties, awayPenalties: pens.awayPenalties, events: [...(result.events || []), ...pens.penaltyEvents] };
    }
  }
  const winnerTeamId = result.homeScore > result.awayScore ? home.id : result.awayScore > result.homeScore ? away.id : result.homePenalties! > result.awayPenalties! ? home.id : away.id;
  return { ...score, ...result, winnerTeamId } as T & { homePenalties?: number; awayPenalties?: number; winnerTeamId?: string };
}
