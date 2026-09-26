import React, { useMemo } from 'react';
import { Club, MatchEvent, TeamTactics } from '../types/game';
import { OnlineMatchPitch3D, PitchLiveEvent } from './pvp/OnlineMatchPitch3D';

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
}) => {
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

  // Convert event to PitchLiveEvent for 3D pitch celebration overlay
  const convertedLastEvent: PitchLiveEvent | null = useMemo(() => {
    if (!latestMatchEvent) return null;
    return {
      id: (latestMatchEvent as any).id || `${latestMatchEvent.minute}-${latestMatchEvent.type}`,
      minute: latestMatchEvent.minute,
      type: latestMatchEvent.type,
      team: latestMatchEvent.teamId === homeTeam?.id ? homeTeam?.name : awayTeam?.name,
      textAr:
        latestMatchEvent.description ||
        (latestMatchEvent as any).textAr ||
        (latestMatchEvent.type === 'goal' ? 'هدف رائع!' : ''),
    };
  }, [latestMatchEvent, homeTeam?.id, homeTeam?.name, awayTeam?.name]);

  const momentum = useMemo(() => {
    return Math.max(-100, Math.min(100, (homePossession - 50) * 2));
  }, [homePossession]);

  const homeFormation =
    homeTeam?.tactics?.formation || userTactics?.formation || '4-3-3';
  const awayFormation =
    awayTeam?.tactics?.formation || '4-4-2';

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
      homeClubName={homeTeam?.shortName || homeTeam?.name || 'المضيف'}
      awayClubName={awayTeam?.shortName || awayTeam?.name || 'الضيف'}
      homeScore={homeScore}
      awayScore={awayScore}
      minute={currentMinute}
      currentBallZone={currentBallZone}
      momentum={momentum}
      homePossession={homePossession}
      awayPossession={awayPossession}
      homeFormation={homeFormation}
      awayFormation={awayFormation}
      homeSquad={(homeTeam as any)?.players}
      awaySquad={(awayTeam as any)?.players}
      lastEvent={convertedLastEvent}
      isFinished={isFinished}
      status={isFinished ? 'finished' : isHalfTime ? 'halftime' : 'playing'}
      addedTime={currentMinute === 45 || currentMinute === 90 ? 3 : undefined}
      title="استاد المباراة التفاعلي 2.5D"
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

