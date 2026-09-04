import React, { useMemo } from 'react';
import { Club, FormationType, MatchEvent, TeamTactics } from '../types/game';

interface TacticalPitch2DProps {
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
}

// Coordinates for formations on a 100 x 60 SVG pitch
// Home team plays on Left -> Right, Away team plays on Right -> Left
const FORMATION_COORDS: Record<FormationType, { x: number; y: number; role: string }[]> = {
  '4-4-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 38, y: 12, role: 'LM' },
    { x: 36, y: 24, role: 'CM' },
    { x: 36, y: 36, role: 'CM' },
    { x: 38, y: 48, role: 'RM' },
    { x: 46, y: 22, role: 'ST' },
    { x: 46, y: 38, role: 'ST' },
  ],
  '4-3-3': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 32, y: 30, role: 'CDM' },
    { x: 38, y: 20, role: 'CM' },
    { x: 38, y: 40, role: 'CM' },
    { x: 46, y: 14, role: 'LW' },
    { x: 47, y: 30, role: 'ST' },
    { x: 46, y: 46, role: 'RW' },
  ],
  '4-2-3-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 32, y: 22, role: 'CDM' },
    { x: 32, y: 38, role: 'CDM' },
    { x: 40, y: 14, role: 'LM' },
    { x: 40, y: 30, role: 'CAM' },
    { x: 40, y: 46, role: 'RM' },
    { x: 47, y: 30, role: 'ST' },
  ],
  '3-5-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 16, role: 'CB' },
    { x: 19, y: 30, role: 'CB' },
    { x: 20, y: 44, role: 'CB' },
    { x: 34, y: 10, role: 'LWB' },
    { x: 33, y: 22, role: 'CM' },
    { x: 31, y: 30, role: 'CDM' },
    { x: 33, y: 38, role: 'CM' },
    { x: 34, y: 50, role: 'RWB' },
    { x: 46, y: 23, role: 'ST' },
    { x: 46, y: 37, role: 'ST' },
  ],
  '5-3-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 10, role: 'LWB' },
    { x: 18, y: 20, role: 'CB' },
    { x: 17, y: 30, role: 'CB' },
    { x: 18, y: 40, role: 'CB' },
    { x: 20, y: 50, role: 'RWB' },
    { x: 34, y: 20, role: 'CM' },
    { x: 32, y: 30, role: 'CDM' },
    { x: 34, y: 40, role: 'CM' },
    { x: 46, y: 24, role: 'ST' },
    { x: 46, y: 36, role: 'ST' },
  ],
  '4-1-4-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 30, y: 30, role: 'CDM' },
    { x: 39, y: 14, role: 'LM' },
    { x: 38, y: 24, role: 'CM' },
    { x: 38, y: 36, role: 'CM' },
    { x: 39, y: 46, role: 'RM' },
    { x: 47, y: 30, role: 'ST' },
  ],
  '3-4-3': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 16, role: 'CB' },
    { x: 19, y: 30, role: 'CB' },
    { x: 20, y: 44, role: 'CB' },
    { x: 34, y: 12, role: 'LM' },
    { x: 33, y: 24, role: 'CM' },
    { x: 33, y: 36, role: 'CM' },
    { x: 34, y: 48, role: 'RM' },
    { x: 46, y: 14, role: 'LW' },
    { x: 47, y: 30, role: 'ST' },
    { x: 46, y: 46, role: 'RW' },
  ],
  '4-5-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 36, y: 12, role: 'LM' },
    { x: 34, y: 22, role: 'CM' },
    { x: 32, y: 30, role: 'CDM' },
    { x: 34, y: 38, role: 'CM' },
    { x: 36, y: 48, role: 'RM' },
    { x: 47, y: 30, role: 'ST' },
  ],
  '4-1-2-1-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 31, y: 30, role: 'CDM' },
    { x: 36, y: 20, role: 'CM' },
    { x: 36, y: 40, role: 'CM' },
    { x: 41, y: 30, role: 'CAM' },
    { x: 46, y: 22, role: 'ST' },
    { x: 46, y: 38, role: 'ST' },
  ],
  '5-4-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 10, role: 'LWB' },
    { x: 18, y: 20, role: 'CB' },
    { x: 17, y: 30, role: 'CB' },
    { x: 18, y: 40, role: 'CB' },
    { x: 20, y: 50, role: 'RWB' },
    { x: 36, y: 14, role: 'LM' },
    { x: 34, y: 24, role: 'CM' },
    { x: 34, y: 36, role: 'CM' },
    { x: 36, y: 46, role: 'RM' },
    { x: 47, y: 30, role: 'ST' },
  ],
  '4-2-4': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 34, y: 24, role: 'CM' },
    { x: 34, y: 36, role: 'CM' },
    { x: 46, y: 12, role: 'LW' },
    { x: 47, y: 24, role: 'ST' },
    { x: 47, y: 36, role: 'ST' },
    { x: 46, y: 48, role: 'RW' },
  ],
  '4-3-2-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 34, y: 18, role: 'CM' },
    { x: 32, y: 30, role: 'CDM' },
    { x: 34, y: 42, role: 'CM' },
    { x: 41, y: 22, role: 'CAM' },
    { x: 41, y: 38, role: 'CAM' },
    { x: 47, y: 30, role: 'ST' },
  ],
  '4-2-2-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 32, y: 22, role: 'CDM' },
    { x: 32, y: 38, role: 'CDM' },
    { x: 40, y: 16, role: 'CAM' },
    { x: 40, y: 44, role: 'CAM' },
    { x: 47, y: 22, role: 'ST' },
    { x: 47, y: 38, role: 'ST' },
  ],
  '4-3-1-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 33, y: 18, role: 'CM' },
    { x: 31, y: 30, role: 'CDM' },
    { x: 33, y: 42, role: 'CM' },
    { x: 40, y: 30, role: 'CAM' },
    { x: 47, y: 22, role: 'ST' },
    { x: 47, y: 38, role: 'ST' },
  ],
  '3-4-2-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 16, role: 'CB' },
    { x: 19, y: 30, role: 'CB' },
    { x: 20, y: 44, role: 'CB' },
    { x: 33, y: 10, role: 'LWB' },
    { x: 32, y: 24, role: 'CM' },
    { x: 32, y: 36, role: 'CM' },
    { x: 33, y: 50, role: 'RWB' },
    { x: 41, y: 22, role: 'CAM' },
    { x: 41, y: 38, role: 'CAM' },
    { x: 47, y: 30, role: 'ST' },
  ],
  '3-4-1-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 16, role: 'CB' },
    { x: 19, y: 30, role: 'CB' },
    { x: 20, y: 44, role: 'CB' },
    { x: 33, y: 12, role: 'LM' },
    { x: 32, y: 24, role: 'CM' },
    { x: 32, y: 36, role: 'CM' },
    { x: 33, y: 48, role: 'RM' },
    { x: 40, y: 30, role: 'CAM' },
    { x: 47, y: 22, role: 'ST' },
    { x: 47, y: 38, role: 'ST' },
  ],
  '5-2-3': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 10, role: 'LWB' },
    { x: 18, y: 20, role: 'CB' },
    { x: 17, y: 30, role: 'CB' },
    { x: 18, y: 40, role: 'CB' },
    { x: 20, y: 50, role: 'RWB' },
    { x: 33, y: 24, role: 'CM' },
    { x: 33, y: 36, role: 'CM' },
    { x: 46, y: 14, role: 'LW' },
    { x: 47, y: 30, role: 'ST' },
    { x: 46, y: 46, role: 'RW' },
  ],
  '4-1-3-2': [
    { x: 8, y: 30, role: 'GK' },
    { x: 22, y: 12, role: 'LB' },
    { x: 20, y: 24, role: 'CB' },
    { x: 20, y: 36, role: 'CB' },
    { x: 22, y: 48, role: 'RB' },
    { x: 31, y: 30, role: 'CDM' },
    { x: 39, y: 14, role: 'LM' },
    { x: 39, y: 30, role: 'CAM' },
    { x: 39, y: 46, role: 'RM' },
    { x: 47, y: 22, role: 'ST' },
    { x: 47, y: 38, role: 'ST' },
  ],
  '3-3-3-1': [
    { x: 8, y: 30, role: 'GK' },
    { x: 20, y: 16, role: 'CB' },
    { x: 19, y: 30, role: 'CB' },
    { x: 20, y: 44, role: 'CB' },
    { x: 31, y: 14, role: 'LWB' },
    { x: 30, y: 30, role: 'CDM' },
    { x: 31, y: 46, role: 'RWB' },
    { x: 40, y: 16, role: 'LAM' },
    { x: 40, y: 30, role: 'CAM' },
    { x: 40, y: 44, role: 'RAM' },
    { x: 47, y: 30, role: 'ST' },
  ],
};

export const TacticalPitch2D: React.FC<TacticalPitch2DProps> = ({
  homeTeam,
  awayTeam,
  currentMinute,
  homeScore,
  awayScore,
  events,
  isPlaying,
  isFinished,
  isHalfTime,
  userTactics,
}) => {
  // Find current active / latest event around this minute
  const recentEvents = events.filter(e => e.minute <= currentMinute);
  const latestEvent = recentEvents.length > 0 ? recentEvents[recentEvents.length - 1] : null;

  // Determine attack state & Ball Position (0..100 X, 0..60 Y)
  const isRecentGoal = latestEvent?.type === 'goal' && (currentMinute - latestEvent.minute <= 2);
  const isRecentChance = latestEvent?.type === 'chance' && (currentMinute - latestEvent.minute <= 2);
  const isRecentSave = latestEvent?.type === 'save' && (currentMinute - latestEvent.minute <= 2);
  const isHomeAttacking = homeTeam ? latestEvent?.teamId === homeTeam.id : false;

  const ballPosition = useMemo(() => {
    if (isFinished || isHalfTime) {
      return { x: 50, y: 30 }; // Center spot
    }
    if (isRecentGoal) {
      return isHomeAttacking ? { x: 97, y: 30 } : { x: 3, y: 30 };
    }
    if (isRecentSave) {
      return isHomeAttacking ? { x: 93, y: 26 + (currentMinute % 8) } : { x: 7, y: 26 + (currentMinute % 8) };
    }
    if (isRecentChance) {
      return isHomeAttacking ? { x: 82, y: 20 + (currentMinute % 20) } : { x: 18, y: 20 + (currentMinute % 20) };
    }

    // Default dynamic movement in midfield / buildup based on current minute
    const minutePhase = (currentMinute % 10);
    const xBase = 35 + (minutePhase * 3);
    const yBase = 15 + ((currentMinute * 7) % 30);
    return { x: xBase, y: yBase };
  }, [currentMinute, isRecentGoal, isRecentSave, isRecentChance, isHomeAttacking, isFinished, isHalfTime]);

  // Calculate dynamic momentum (0..100) Home vs Away
  const momentum = useMemo(() => {
    let homeScoreWeight = homeScore * 15;
    let awayScoreWeight = awayScore * 15;
    const recent5Events = events.filter(e => e.minute <= currentMinute && e.minute >= currentMinute - 10);
    recent5Events.forEach(e => {
      if (homeTeam && e.teamId === homeTeam.id) {
        if (e.type === 'goal') homeScoreWeight += 20;
        else if (e.type === 'chance' || e.type === 'save') homeScoreWeight += 8;
      } else {
        if (e.type === 'goal') awayScoreWeight += 20;
        else if (e.type === 'chance' || e.type === 'save') awayScoreWeight += 8;
      }
    });

    const total = (50 + homeScoreWeight) + (50 + awayScoreWeight);
    const homePercent = Math.min(85, Math.max(15, Math.round(((50 + homeScoreWeight) / total) * 100)));
    return homePercent;
  }, [currentMinute, homeScore, awayScore, events, homeTeam?.id]);

  const homeFormation: FormationType = (homeTeam?.isUserClub && userTactics?.formation) || (homeTeam?.tactics?.formation) || '4-3-3';
  const awayFormation: FormationType = (awayTeam?.isUserClub && userTactics?.formation) || (awayTeam?.tactics?.formation) || '4-4-2';

  const homeCoords = FORMATION_COORDS[homeFormation] || FORMATION_COORDS['4-3-3'];
  const awayBaseCoords = FORMATION_COORDS[awayFormation] || FORMATION_COORDS['4-4-2'];

  // Mirror away coords across X = 50
  const awayCoords = awayBaseCoords.map(c => ({
    x: 100 - c.x,
    y: c.y,
    role: c.role
  }));

  const homeColor = homeTeam.primaryColor || '#dc2626';
  const awayColor = awayTeam.primaryColor || '#1d4ed8';

  return (
    <div className="space-y-2">
      {/* Momentum Indicator Header */}
      <div className="flex items-center justify-between text-[11px] font-bold px-2 py-1 bg-slate-950/80 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5" style={{ color: homeColor }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
          <span>{homeTeam.shortName}</span>
          <span className="font-mono text-slate-300">({momentum}%)</span>
        </div>

        <span className="text-[10px] text-slate-400 font-normal">مؤشر السيطرة والزخم</span>

        <div className="flex items-center gap-1.5" style={{ color: awayColor }}>
          <span className="font-mono text-slate-300">({100 - momentum}%)</span>
          <span>{awayTeam.shortName}</span>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
        </div>
      </div>

      {/* Momentum Visual Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
        <div 
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${momentum}%`, backgroundColor: homeColor }}
        />
        <div 
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${100 - momentum}%`, backgroundColor: awayColor }}
        />
      </div>

      {/* 2D Tactical Pitch Canvas (SVG) */}
      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-emerald-800/60 bg-emerald-950">
        <svg 
          viewBox="0 0 100 60" 
          className="w-full h-auto aspect-[5/3] block select-none"
        >
          <defs>
            {/* Realistic grass stripes pattern */}
            <linearGradient id="grassPitchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14532d" />
              <stop offset="50%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            <pattern id="grassStripes" width="10" height="60" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="5" height="60" fill="#15803d" opacity="0.18" />
              <rect x="5" y="0" width="5" height="60" fill="#14532d" opacity="0.18" />
            </pattern>

            {/* Ball Shadow Filter */}
            <filter id="ballGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0.5" stdDeviation="0.8" floodColor="#000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Pitch */}
          <rect x="0" y="0" width="100" height="60" fill="url(#grassPitchGrad)" />
          <rect x="0" y="0" width="100" height="60" fill="url(#grassStripes)" />

          {/* Pitch Outer Boundary Line */}
          <rect x="3" y="3" width="94" height="54" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />

          {/* Halfway Line */}
          <line x1="50" y1="3" x2="50" y2="57" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />

          {/* Center Circle & Center Spot */}
          <circle cx="50" cy="30" r="9" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <circle cx="50" cy="30" r="0.8" fill="#ffffff" fillOpacity="0.9" />

          {/* Home Penalty Box (Left) */}
          <rect x="3" y="14" width="14" height="32" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <rect x="3" y="21" width="5" height="18" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <circle cx="12" cy="30" r="0.6" fill="#ffffff" fillOpacity="0.9" />
          <path d="M 17 23 A 7 7 0 0 1 17 37" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />

          {/* Home Goal Post */}
          <rect x="1" y="25" width="2" height="10" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.9" />

          {/* Away Penalty Box (Right) */}
          <rect x="83" y="14" width="14" height="32" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <rect x="92" y="21" width="5" height="18" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <circle cx="88" cy="30" r="0.6" fill="#ffffff" fillOpacity="0.9" />
          <path d="M 83 23 A 7 7 0 0 0 83 37" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />

          {/* Away Goal Post */}
          <rect x="97" y="25" width="2" height="10" fill="#ffffff" fillOpacity="0.2" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.9" />

          {/* Corner Arcs */}
          <path d="M 3 5 A 2 2 0 0 0 5 3" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <path d="M 3 55 A 2 2 0 0 1 5 57" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <path d="M 97 5 A 2 2 0 0 1 95 3" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />
          <path d="M 97 55 A 2 2 0 0 0 95 57" fill="none" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.75" />

          {/* Home Team Players */}
          {homeCoords.map((pos, idx) => (
            <g key={`home-p-${idx}`} className="transition-all duration-500">
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r="2.2" 
                fill={homeColor} 
                stroke="#ffffff" 
                strokeWidth="0.5" 
                className="filter drop-shadow-sm"
              />
              <text 
                x={pos.x} 
                y={pos.y + 0.7} 
                fontSize="1.6" 
                fontWeight="bold" 
                fill="#ffffff" 
                textAnchor="middle"
                className="select-none pointer-events-none font-mono"
              >
                {idx === 0 ? 'GK' : pos.role}
              </text>
            </g>
          ))}

          {/* Away Team Players */}
          {awayCoords.map((pos, idx) => (
            <g key={`away-p-${idx}`} className="transition-all duration-500">
              <circle 
                cx={pos.x} 
                cy={pos.y} 
                r="2.2" 
                fill={awayColor} 
                stroke="#ffffff" 
                strokeWidth="0.5" 
                className="filter drop-shadow-sm"
              />
              <text 
                x={pos.x} 
                y={pos.y + 0.7} 
                fontSize="1.6" 
                fontWeight="bold" 
                fill="#ffffff" 
                textAnchor="middle"
                className="select-none pointer-events-none font-mono"
              >
                {idx === 0 ? 'GK' : pos.role}
              </text>
            </g>
          ))}

          {/* The Match Ball with animation */}
          <g 
            className="transition-all duration-700 ease-out"
            filter="url(#ballGlow)"
          >
            <circle 
              cx={ballPosition.x} 
              cy={ballPosition.y} 
              r="1.6" 
              fill="#ffffff" 
              stroke="#0f172a" 
              strokeWidth="0.4" 
            />
            <circle 
              cx={ballPosition.x} 
              cy={ballPosition.y} 
              r="0.6" 
              fill="#0f172a" 
            />
          </g>

          {/* Pitch Event Flash Overlay */}
          {isRecentGoal && (
            <g className="animate-bounce">
              <rect x="30" y="20" width="40" height="20" rx="3" fill="#047857" fillOpacity="0.9" stroke="#34d399" strokeWidth="0.8" />
              <text x="50" y="30" fill="#ffffff" fontSize="4.5" fontWeight="900" textAnchor="middle">⚽ هــــدف!</text>
              <text x="50" y="36" fill="#a7f3d0" fontSize="2.3" fontWeight="bold" textAnchor="middle">
                {latestEvent?.playerName || 'تسديدة رائعة'}
              </text>
            </g>
          )}

          {isRecentSave && (
            <g>
              <rect x="34" y="22" width="32" height="16" rx="3" fill="#1e3a8a" fillOpacity="0.9" stroke="#60a5fa" strokeWidth="0.7" />
              <text x="50" y="31" fill="#ffffff" fontSize="3.5" fontWeight="bold" textAnchor="middle">🧤 تصدي بطولي!</text>
            </g>
          )}

          {isRecentChance && (
            <g>
              <rect x="34" y="22" width="32" height="16" rx="3" fill="#581c87" fillOpacity="0.9" stroke="#c084fc" strokeWidth="0.7" />
              <text x="50" y="31" fill="#ffffff" fontSize="3.5" fontWeight="bold" textAnchor="middle">🎯 فرصة خطيرة!</text>
            </g>
          )}

        </svg>

        {/* Pitch Corner Watermark / Formation indicator */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2 pointer-events-none">
          <span className="text-[9px] bg-black/60 backdrop-blur-sm text-slate-200 px-2 py-0.5 rounded-full border border-white/10 font-mono">
            {homeTeam.shortName}: {homeFormation}
          </span>
          <span className="text-[9px] bg-black/60 backdrop-blur-sm text-slate-200 px-2 py-0.5 rounded-full border border-white/10 font-mono">
            {awayTeam.shortName}: {awayFormation}
          </span>
        </div>
      </div>
    </div>
  );
};
