import React, { useMemo } from 'react';
import { Club, MatchEvent, MatchStats, TeamTactics } from '../types/game';
import { OnlineMatchPitch3D, PitchLiveEvent, PitchFeedItem, SquadPlayerInfo } from './pvp/OnlineMatchPitch3D';

export interface TacticalPitch2DProps {
  homeTeam: Club;
  awayTeam: Club;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  isPlaying: boolean;
  isFinished: boolean;
  isHalfTime?: boolean;
  userTactics?: TeamTactics;
  homePossession?: number;
  awayPossession?: number;
  homeDangerousAttacks?: number;
  awayDangerousAttacks?: number;
  activeTactic?: string;
  onTacticChange?: (tacticKey: string) => void;
  onStartSecondHalf?: () => void;
  onFinishMatch?: () => void;
  isSimulationRunning?: boolean;
  userResultType?: 'win' | 'draw' | 'loss';
  finishButtonLabel?: string;
  homePenalties?: number;
  awayPenalties?: number;
  isCupMatch?: boolean;
  /** Active player ids on the field (reflects substitutions) */
  homeLineupIds?: string[];
  awayLineupIds?: string[];
  /** Live formations (falls back to the club's saved tactics) */
  homeFormation?: string;
  awayFormation?: string;
  stats?: Partial<MatchStats>;
  homeXg?: number;
  awayXg?: number;
}

/** Order the squad so the players actually on the pitch come first, mapped to the pitch's squad shape. */
function toPitchSquad(team: Club | undefined, lineupIds?: string[]): SquadPlayerInfo[] | undefined {
  const players = (team as any)?.players as any[] | undefined;
  if (!Array.isArray(players) || players.length === 0) return undefined;
  const map = (p: any): SquadPlayerInfo => ({
    id: p.id,
    name: p.name,
    number: typeof p.number === 'number' ? p.number : undefined,
    position: p.position,
    rating: typeof p.overallRating === 'number' ? p.overallRating : p.rating,
  });
  if (Array.isArray(lineupIds) && lineupIds.length > 0) {
    const byId = new Map(players.map((p) => [p.id, p]));
    const onPitch = lineupIds.map((id) => byId.get(id)).filter(Boolean).map(map);
    if (onPitch.length >= 8) return onPitch;
  }
  return players.map(map);
}

/**
 * 3D Tactical Pitch for Matches with Clean Isometric 2.5D Stadium & Realistic Dynamic Movements
 * Features clean 2.5D pitch, clear Arabic player roles, dynamic attack vectors & dashed passing arrows,
 * streamlined top scoreboard, and non-intrusive quick tactical buttons below the field.
 */
export const TacticalPitch2D: React.FC<TacticalPitch2DProps> = ({
  homeTeam,
  awayTeam,
  currentMinute,
  homeScore,
  awayScore,
  events = [],
  isPlaying,
  isFinished,
  isHalfTime,
  userTactics,
  homePossession = 50,
  awayPossession = 50,
  homeDangerousAttacks = 0,
  awayDangerousAttacks = 0,
  activeTactic,
  onTacticChange,
  onStartSecondHalf,
  onFinishMatch,
  isSimulationRunning,
  userResultType,
  finishButtonLabel,
  homePenalties,
  awayPenalties,
  isCupMatch,
  homeLineupIds,
  awayLineupIds,
  homeFormation: homeFormationProp,
  awayFormation: awayFormationProp,
  stats,
  homeXg,
  awayXg,
}) => {
  const homeLabel = homeTeam?.shortName || homeTeam?.name || 'المضيف';
  const awayLabel = awayTeam?.shortName || awayTeam?.name || 'الضيف';

  // Find the most recent event up to current minute
  const latestMatchEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const sorted = [...events]
      .filter((e) => e && typeof e.minute === 'number' && e.minute <= currentMinute)
      .sort((a, b) => b.minute - a.minute);
    return sorted[0] || null;
  }, [events, currentMinute]);

  // Determine current active zone for 3D ball & pitch highlights
  const currentBallZone = useMemo(() => {
    if (isFinished || isHalfTime) return 'midfield';

    // If an active event occurred recently (within last 2 minutes)
    if (latestMatchEvent && (currentMinute - latestMatchEvent.minute) <= 2) {
      if (
        latestMatchEvent.type === 'goal' ||
        latestMatchEvent.type === 'chance' ||
        latestMatchEvent.type === 'save'
      ) {
        return latestMatchEvent.teamId === homeTeam?.id ? 'guest_box' : 'host_box';
      }
    }

    // Dynamic zones based on minute rhythm and dangerous attacks
    const cycle = currentMinute % 6;
    if (cycle === 0 || cycle === 1) {
      return homeDangerousAttacks >= awayDangerousAttacks ? 'guest_box' : 'host_box';
    }
    if (cycle === 2) return 'guest_half';
    if (cycle === 3) return 'host_half';
    return 'midfield';
  }, [
    currentMinute,
    isFinished,
    isHalfTime,
    latestMatchEvent,
    homeTeam?.id,
    homeDangerousAttacks,
    awayDangerousAttacks,
  ]);

  // Convert event to PitchLiveEvent for the pitch overlays.
  // Match-flow events (goal/card/foul...) only stay "live" for a few minutes, otherwise an old goal
  // would keep the goal card and the ball stuck in the net until the next event.
  const convertedLastEvent: PitchLiveEvent | null = useMemo(() => {
    if (!latestMatchEvent) return null;
    const age = currentMinute - latestMatchEvent.minute;
    const isMilestone = (latestMatchEvent.type as string) === 'halftime' || (latestMatchEvent.type as string) === 'fulltime';
    if (!isMilestone && age > 3) return null;
    const ev: any = latestMatchEvent;
    return {
      id: ev.id || `${ev.minute}-${ev.type}-${ev.playerId || ''}`,
      minute: ev.minute,
      type: ev.type,
      team: ev.teamId === homeTeam?.id ? homeLabel : awayLabel,
      textAr:
        ev.description ||
        ev.textAr ||
        (ev.type === 'goal' ? 'هدف رائع!' : ''),
      scorerName: ev.type === 'goal' ? ev.playerName : undefined,
      assistName: ev.type === 'goal' ? ev.assistPlayerName : undefined,
      playerName: ev.playerName,
      outPlayerName: ev.outPlayerName,
      inPlayerName: ev.inPlayerName,
    };
  }, [latestMatchEvent, currentMinute, homeTeam?.id, homeLabel, awayLabel]);

  // Latest 3 meaningful events for the commentary strip (newest first)
  const recentEvents: PitchFeedItem[] = useMemo(() => {
    if (!events || events.length === 0) return [];
    return events
      .filter((e) => e && typeof e.minute === 'number' && e.minute <= currentMinute && e.description)
      .sort((a, b) => b.minute - a.minute)
      .slice(0, 3)
      .map((e, i) => ({
        id: `${e.minute}-${e.type}-${e.playerId || i}-${i}`,
        minute: e.minute,
        type: e.type,
        text: e.description,
      }));
  }, [events, currentMinute]);

  const momentum = useMemo(() => {
    return Math.max(-100, Math.min(100, (homePossession - 50) * 2));
  }, [homePossession]);

  const homeFormation =
    homeFormationProp || homeTeam?.tactics?.formation || userTactics?.formation || '4-3-3';
  const awayFormation =
    awayFormationProp || awayTeam?.tactics?.formation || '4-4-2';

  const derivedTactic = useMemo(() => {
    if (activeTactic) return activeTactic;
    if (userTactics?.mentality) {
      if (userTactics.mentality.includes('attack')) return 'attack';
      if (userTactics.mentality.includes('defens')) return 'defense';
      return 'balanced';
    }
    return 'balanced';
  }, [activeTactic, userTactics?.mentality]);

  return (
    <OnlineMatchPitch3D
      homeClubName={homeLabel}
      awayClubName={awayLabel}
      homeScore={homeScore}
      awayScore={awayScore}
      minute={currentMinute}
      currentBallZone={currentBallZone}
      momentum={momentum}
      homePossession={homePossession}
      awayPossession={awayPossession}
      homeFormation={homeFormation}
      awayFormation={awayFormation}
      homeSquad={toPitchSquad(homeTeam, homeLineupIds)}
      awaySquad={toPitchSquad(awayTeam, awayLineupIds)}
      lastEvent={convertedLastEvent}
      isFinished={isFinished}
      status={isFinished ? 'finished' : isHalfTime ? 'halftime' : 'playing'}
      addedTime={currentMinute === 45 || currentMinute === 90 ? 3 : undefined}
      title="استاد المباراة التفاعلي"
      recentEvents={recentEvents}
      homeShots={stats?.homeShots}
      awayShots={stats?.awayShots}
      homeShotsOnTarget={stats?.homeShotsOnTarget}
      awayShotsOnTarget={stats?.awayShotsOnTarget}
      homeXg={homeXg}
      awayXg={awayXg}
      homeColor={homeTeam?.primaryColor}
      awayColor={awayTeam?.primaryColor}
      activeTactic={derivedTactic}
      onTacticChange={onTacticChange}
      onStartSecondHalf={onStartSecondHalf}
      onFinishMatch={onFinishMatch}
      isSimulationRunning={isSimulationRunning}
      userResultType={userResultType}
      finishButtonLabel={finishButtonLabel}
      homePenalties={homePenalties}
      awayPenalties={awayPenalties}
      isCupMatch={isCupMatch}
    />
  );
};

