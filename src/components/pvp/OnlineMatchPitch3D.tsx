import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  Shield,
  Crosshair,
  Sliders,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Flame,
  Play,
  CheckCircle2,
  ArrowRight,
  Trophy,
  Award,
  AlertCircle,
} from 'lucide-react';
import { stadiumAudio } from '../../utils/stadiumAudio';

export interface PitchLiveEvent {
  id?: string;
  minute?: number;
  type?: string;
  team?: string;
  textAr?: string;
  scorerName?: string;
  assistName?: string;
  playerName?: string;
  outPlayerName?: string;
  inPlayerName?: string;
}

export interface SquadPlayerInfo {
  id?: string;
  name: string;
  number?: number;
  position?: string;
  role?: string;
}

export interface OnlineMatchPitch3DProps {
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
  minute: number;
  currentBallZone: 'host_box' | 'midfield' | 'guest_box' | 'host_half' | 'guest_half' | string;
  momentum: number; // -100 to +100
  homePossession: number;
  awayPossession: number;
  homeFormation?: string;
  awayFormation?: string;
  homeSquad?: SquadPlayerInfo[];
  awaySquad?: SquadPlayerInfo[];
  lastEvent?: PitchLiveEvent | null;
  isFinished?: boolean;
  status?: 'playing' | 'halftime' | 'finished';
  addedTime?: number;
  title?: string;
  homeColor?: string;
  awayColor?: string;
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

// Normalized coordinate for player positions on the vertical pitch (x: 0..100%, y: 0..100%)
interface PlayerDot {
  id: string;
  name: string;
  role: string;
  roleArabic: string;
  jerseyNumber: number;
  x: number; // width percentage (0..100)
  y: number; // length percentage (0..100)
  isCarrier: boolean;
  isRunning: boolean;
  isScorer?: boolean;
}

// Map role to traditional squad number
const ROLE_NUMBER_MAP: Record<string, number> = {
  GK: 1,
  RB: 2,
  LB: 3,
  CB: 4,
  CDM: 6,
  RW: 7,
  CM: 8,
  ST: 9,
  CAM: 10,
  CF: 9,
  LW: 11,
  RM: 7,
  LM: 11,
  RWB: 2,
  LWB: 3,
};

// Simplified Arabic role translation
export function getSimplifiedRoleArabic(role: string): string {
  if (role === 'GK') return 'حارس';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(role)) return 'مدافع';
  if (['CM', 'CDM', 'CAM', 'LM', 'RM', 'MF'].includes(role)) return 'وسط';
  if (['ST', 'CF', 'LW', 'RW', 'FW'].includes(role)) return 'مهاجم';
  return 'لاعب';
}

// Authentic Egyptian and Arab realistic player names pool by position
const ARABIC_POSITION_NAMES: Record<string, string[]> = {
  GK: ['محمد الشناوي', 'محمد عواد', 'أحمد الشناوي', 'مصطفى شوبير', 'محمد بسام', 'المهدي سليمان'],
  LB: ['علي معلول', 'أحمد فتوح', 'محمد حمدي', 'كريم الدبيس', 'محمد شكري'],
  CB: ['محمد عبد المنعم', 'محمود الونش', 'ياسر إبراهيم', 'حسام عبد المجيد', 'رامي ربيعة', 'علي جبر', 'محمود متولي'],
  RB: ['محمد هاني', 'عمر جابر', 'أكرم توفيق', 'أحمد عيد', 'كريم فؤاد', 'عمر كمال'],
  CDM: ['مروان عطية', 'نبيل دونجا', 'أليو ديانج', 'حمدي فتحي', 'مهند لاشين', 'أحمد توفيق'],
  CM: ['إمام عاشور', 'عبد الله السعيد', 'عمرو السولية', 'أحمد حمدي', 'بلاتي توريه', 'ناصر ماهر'],
  CAM: ['محمد مجدي أفشة', 'عبد الله السعيد', 'ناصر ماهر', 'يوسف أوباما', 'أحمد قندوسي'],
  LW: ['حسين الشحات', 'مصطفى شلبي', 'رمضان صبحي', 'طاهر محمد طاهر', 'محمود تريزيجيه'],
  RW: ['أحمد مصطفى زيزو', 'بيرسي تاو', 'مصطفى فتحي', 'محمود شيكابالا', 'محمد صلاح'],
  ST: ['وسام أبو علي', 'سيف الجزيري', 'مصطفى محمد', 'فيستون ماييلي', 'مروان حمدي', 'عمر مرموش', 'ناصر منسي'],
};

// Realistic international stars pool for international clubs
const INTERNATIONAL_POSITION_NAMES: Record<string, string[]> = {
  GK: ['كورتوا', 'أليسون', 'إيدرسون', 'تير شتيجن', 'دوناروما', 'أوبلاك', 'بونو'],
  LB: ['ديفيز', 'ميندي', 'هيرنانديز', 'روبرتسون', 'بالدي', 'ديماركو'],
  CB: ['فان دايك', 'روديجر', 'ميليتاو', 'روبن دياز', 'أراوخو', 'ساليبا', 'ماركينيوس'],
  RB: ['أرنولد', 'كارفاخال', 'كايل ووكر', 'أشرف حكيمي', 'جول كوندي'],
  CDM: ['رودري', 'تشواميني', 'كاسيميرو', 'نجولو كانتي', 'ديكلان رايس'],
  CM: ['كيفين دي بروين', 'فيدي فالفيردي', 'بيدري', 'لوكا مودريتش', 'أليكسيس ماك أليستر'],
  CAM: ['جود بيلينجهام', 'داني أولمو', 'جمال موسيالا', 'فلوريان فيرتز', 'برونو فيرنانديز'],
  LW: ['فينيسيوس جونيور', 'لويس دياز', 'كفاراتسخيليا', 'مارتينيلي', 'رافاييل لياو'],
  RW: ['محمد صلاح', 'لامين يامال', 'رودريجو', 'بوكايو ساكا', 'برناردو سيلفا'],
  ST: ['إيرلينج هالاند', 'كيليان مبابي', 'روبرت ليفاندوفسكي', 'هاري كاين', 'لاوتارو مارتينيز'],
};

/**
 * Smartly assigns names to formation slots from actual squad or realistic pools
 */
function assignPlayerNameAndNumber(
  slotRole: string,
  slotIndex: number,
  clubName: string,
  squad: SquadPlayerInfo[] | undefined,
  usedNames: Set<string>
): { name: string; jerseyNumber: number } {
  // Check if squad has an unused match for this position
  if (squad && squad.length > 0) {
    const isCategoryMatch = (pPos: string | undefined, r: string) => {
      if (!pPos) return false;
      if (r === 'GK') return pPos.includes('GK') || pPos.includes('حارس');
      if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'DF'].includes(r)) {
        return pPos.includes('CB') || pPos.includes('LB') || pPos.includes('RB') || pPos.includes('DF') || pPos.includes('دفاع') || pPos.includes('مدافع');
      }
      if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'MF'].includes(r)) {
        return pPos.includes('CM') || pPos.includes('CDM') || pPos.includes('CAM') || pPos.includes('LM') || pPos.includes('RM') || pPos.includes('MF') || pPos.includes('وسط');
      }
      if (['ST', 'CF', 'LW', 'RW', 'FW'].includes(r)) {
        return pPos.includes('ST') || pPos.includes('CF') || pPos.includes('LW') || pPos.includes('RW') || pPos.includes('FW') || pPos.includes('هجوم') || pPos.includes('مهاجم');
      }
      return true;
    };

    // Priority 1: exact role or category match not yet used
    const match = squad.find((p) => p?.name && !usedNames.has(p.name) && isCategoryMatch(p.position || p.role, slotRole))
      || squad.find((p) => p?.name && !usedNames.has(p.name));

    if (match && match.name) {
      usedNames.add(match.name);
      return {
        name: match.name,
        jerseyNumber: match.number || ROLE_NUMBER_MAP[slotRole] || (slotIndex + 1),
      };
    }
  }

  // Detect whether club is Western/European or Arab/Egyptian
  const isWesternClub = /[a-zA-Z]/.test(clubName) || ['ريال', 'برشلونة', 'سيتي', 'ليفربول', 'بايرن', 'أرسنال', 'يونايتد', 'باريس', 'تشيلسي', 'يوفنتوس', 'إنتر', 'ميلان'].some(c => clubName.includes(c));
  const pool = isWesternClub ? INTERNATIONAL_POSITION_NAMES : ARABIC_POSITION_NAMES;
  const candidates = pool[slotRole] || pool['CM'] || ['نجم الفريق'];

  // Pick candidate not yet used
  for (const cand of candidates) {
    if (!usedNames.has(cand)) {
      usedNames.add(cand);
      return {
        name: cand,
        jerseyNumber: ROLE_NUMBER_MAP[slotRole] || (slotIndex + 1),
      };
    }
  }

  // Fallback if all used
  const fallback = candidates[slotIndex % candidates.length];
  return {
    name: fallback,
    jerseyNumber: ROLE_NUMBER_MAP[slotRole] || (slotIndex + 1),
  };
}

/**
 * Vertical Formations Map for HOME team (Defending Bottom Goal y=94%, Attacking Top Goal y=6%)
 */
const VERTICAL_FORMATIONS_MAP: Record<string, { role: string; x: number; y: number }[]> = {
  '4-3-3': [
    { role: 'GK', x: 50, y: 94 },
    { role: 'LB', x: 16, y: 82 },
    { role: 'CB', x: 38, y: 84 },
    { role: 'CB', x: 62, y: 84 },
    { role: 'RB', x: 84, y: 82 },
    { role: 'CDM', x: 50, y: 72 },
    { role: 'CM', x: 32, y: 64 },
    { role: 'CM', x: 68, y: 64 },
    { role: 'LW', x: 20, y: 52 },
    { role: 'ST', x: 50, y: 48 },
    { role: 'RW', x: 80, y: 52 },
  ],
  '4-4-2': [
    { role: 'GK', x: 50, y: 94 },
    { role: 'LB', x: 16, y: 82 },
    { role: 'CB', x: 38, y: 84 },
    { role: 'CB', x: 62, y: 84 },
    { role: 'RB', x: 84, y: 82 },
    { role: 'LM', x: 18, y: 66 },
    { role: 'CM', x: 38, y: 67 },
    { role: 'CM', x: 62, y: 67 },
    { role: 'RM', x: 82, y: 66 },
    { role: 'ST', x: 38, y: 50 },
    { role: 'ST', x: 62, y: 50 },
  ],
  '4-2-3-1': [
    { role: 'GK', x: 50, y: 94 },
    { role: 'LB', x: 16, y: 82 },
    { role: 'CB', x: 38, y: 84 },
    { role: 'CB', x: 62, y: 84 },
    { role: 'RB', x: 84, y: 82 },
    { role: 'CDM', x: 36, y: 73 },
    { role: 'CDM', x: 64, y: 73 },
    { role: 'CAM', x: 50, y: 60 },
    { role: 'LM', x: 20, y: 58 },
    { role: 'RM', x: 80, y: 58 },
    { role: 'ST', x: 50, y: 48 },
  ],
  '3-5-2': [
    { role: 'GK', x: 50, y: 94 },
    { role: 'CB', x: 28, y: 84 },
    { role: 'CB', x: 50, y: 85 },
    { role: 'CB', x: 72, y: 84 },
    { role: 'LWB', x: 14, y: 70 },
    { role: 'CM', x: 34, y: 65 },
    { role: 'CDM', x: 50, y: 73 },
    { role: 'CM', x: 66, y: 65 },
    { role: 'RWB', x: 86, y: 70 },
    { role: 'ST', x: 38, y: 50 },
    { role: 'ST', x: 62, y: 50 },
  ],
  '5-3-2': [
    { role: 'GK', x: 50, y: 94 },
    { role: 'LWB', x: 14, y: 82 },
    { role: 'CB', x: 32, y: 85 },
    { role: 'CB', x: 50, y: 86 },
    { role: 'CB', x: 68, y: 85 },
    { role: 'RWB', x: 86, y: 82 },
    { role: 'CM', x: 32, y: 67 },
    { role: 'CDM', x: 50, y: 73 },
    { role: 'CM', x: 68, y: 67 },
    { role: 'ST', x: 38, y: 50 },
    { role: 'ST', x: 62, y: 50 },
  ],
  '4-1-4-1': [
    { role: 'GK', x: 50, y: 94 },
    { role: 'LB', x: 16, y: 82 },
    { role: 'CB', x: 38, y: 84 },
    { role: 'CB', x: 62, y: 84 },
    { role: 'RB', x: 84, y: 82 },
    { role: 'CDM', x: 50, y: 74 },
    { role: 'LM', x: 18, y: 62 },
    { role: 'CM', x: 38, y: 63 },
    { role: 'CM', x: 62, y: 63 },
    { role: 'RM', x: 82, y: 62 },
    { role: 'ST', x: 50, y: 48 },
  ],
};

// Tactical Presets for quick actions
const QUICK_TACTICS_LIST = [
  { id: 'attack', label: 'هجوم كاسح', icon: Zap, color: 'text-amber-400' },
  { id: 'balanced', label: 'متوازن', icon: Sliders, color: 'text-emerald-400' },
  { id: 'defense', label: 'دفاع محكم', icon: Shield, color: 'text-blue-400' },
  { id: 'counter', label: 'مرتدات', icon: Flame, color: 'text-orange-400' },
  { id: 'high_press', label: 'ضغط عالي', icon: Activity, color: 'text-rose-400' },
  { id: 'shoot', label: 'تسديد', icon: Crosshair, color: 'text-purple-400' },
];

/**
 * Miniature 3D Player Figurine Component (مجسم لاعب مصغر ثلاثي الأبعاد مع الاسم والرقم)
 */
const MiniaturePlayerFigurine: React.FC<{
  player: PlayerDot;
  isHome: boolean;
  primaryColor?: string;
  isGK: boolean;
}> = ({ player, isHome, primaryColor, isGK }) => {
  const kitColor = isGK
    ? isHome
      ? '#f59e0b'
      : '#06b6d4'
    : primaryColor || (isHome ? '#10b981' : '#2563eb');
  const shortsColor = isHome ? '#ffffff' : '#0f172a';
  const sockColor = kitColor;

  return (
    <div className="relative flex flex-col items-center">
      {/* Scorer celebration banner above player head */}
      {player.isScorer && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[8px] shadow-lg animate-bounce z-30 whitespace-nowrap border border-amber-200">
          <span>⚽</span>
          <span>هداف!</span>
        </div>
      )}

      {/* 3D Contact Shadow on Turf - Light & Hardware-friendly */}
      <div
        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-black/60 rounded-full blur-[0.6px]"
        style={{
          width: player.isRunning ? '14px' : '11px',
          height: '3px',
        }}
      />

      {/* Miniature 3D Figurine Body - Compact & Ultra-lightweight (Reduced size by ~35%) */}
      <div
        className={`relative flex flex-col items-center transition-transform duration-200 ${
          player.isCarrier ? 'scale-105' : 'scale-90'
        }`}
      >
        {/* Head with skin tone and styled hair (Smaller: 10px / 2.5) */}
        <div className="relative w-2.5 h-2.5 rounded-full bg-[#f6c89f] border border-black/30 flex items-center justify-center overflow-hidden z-3 shadow-xs">
          <div className="absolute top-0 inset-x-0 h-1 bg-[#2a1b12] rounded-t-full" />
        </div>

        {/* Torso & Jersey with sleeves and squad number (Smaller: w-3.5 h-3) */}
        <div
          className={`relative w-3.5 h-3 rounded-xs border border-black/30 flex items-center justify-center -mt-0.5 z-2 shadow-xs ${
            player.isCarrier ? 'ring-1.5 ring-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]' : ''
          }`}
          style={{ backgroundColor: kitColor }}
        >
          {/* Sleeves */}
          <div
            className="absolute -left-0.8 top-0.5 w-0.8 h-1.5 rounded-l-xs"
            style={{ backgroundColor: kitColor }}
          />
          <div
            className="absolute -right-0.8 top-0.5 w-0.8 h-1.5 rounded-r-xs"
            style={{ backgroundColor: kitColor }}
          />
          {/* Collar trim */}
          <div className="absolute top-0 w-1.5 h-0.5 bg-white/40 rounded-b-xs" />
          {/* Squad Number on jersey */}
          <span className="text-[6px] font-black text-white leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)] z-2">
            {player.jerseyNumber}
          </span>
        </div>

        {/* Athletic Shorts (Smaller: w-3 h-1.4) */}
        <div
          className="w-3 h-1.4 -mt-0.5 rounded-b-xs border-x border-b border-black/20 flex justify-between px-0.5"
          style={{ backgroundColor: shortsColor }}
        >
          <div className="w-1 h-full bg-black/10" />
          <div className="w-1 h-full bg-black/10" />
        </div>

        {/* Legs, Socks & Boots */}
        <div className="flex items-center gap-0.5 -mt-0.5">
          {/* Left Foot */}
          <div className={`flex flex-col items-center ${player.isRunning ? 'animate-leg-left' : ''}`}>
            <div className="w-1 h-1.2 rounded-xs" style={{ backgroundColor: sockColor }} />
            <div className="w-1.2 h-0.6 bg-slate-900 rounded-[1px] border-b border-white/40" />
          </div>
          {/* Right Foot */}
          <div className={`flex flex-col items-center ${player.isRunning ? 'animate-leg-right' : ''}`}>
            <div className="w-1 h-1.2 rounded-xs" style={{ backgroundColor: sockColor }} />
            <div className="w-1.2 h-0.6 bg-slate-900 rounded-[1px] border-b border-white/40" />
          </div>
        </div>
      </div>

      {/* PLAYER NAME & ROLE LABELS - ONLY SHOWN FOR USER'S TEAM (isHome) */}
      {isHome ? (
        <div className="flex flex-col items-center mt-0.5 pointer-events-none z-10 max-w-[65px] sm:max-w-[75px]">
          {/* Real Player Name Badge */}
          <span
            className={`px-1 py-0.2 rounded text-[7px] sm:text-[7.5px] font-black tracking-tight whitespace-nowrap truncate max-w-full shadow-md border leading-tight transition-all duration-200 ${
              player.isCarrier
                ? 'bg-amber-400 text-slate-950 border-amber-300 ring-1 ring-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] scale-105'
                : 'bg-slate-950/85 text-emerald-300 border-emerald-500/40'
            }`}
            title={player.name}
          >
            {player.name}
          </span>
          {/* Role and squad number */}
          <span className="text-[6px] font-bold text-slate-300/80 mt-0.2 leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            {player.roleArabic} #{player.jerseyNumber}
          </span>
        </div>
      ) : player.isCarrier ? (
        /* Minimal away carrier indicator without text clutter */
        <div className="mt-0.5 pointer-events-none z-10">
          <span className="px-1 py-0.2 rounded text-[6.5px] font-black bg-blue-600/90 text-white border border-blue-400/50 shadow">
            #{player.jerseyNumber}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export const OnlineMatchPitch3D: React.FC<OnlineMatchPitch3DProps> = ({
  homeClubName,
  awayClubName,
  homeScore,
  awayScore,
  minute,
  currentBallZone,
  momentum,
  homePossession,
  awayPossession,
  homeFormation = '4-3-3',
  awayFormation = '4-3-3',
  homeSquad,
  awaySquad,
  lastEvent,
  isFinished,
  status,
  addedTime,
  title,
  homeColor,
  awayColor,
  activeTactic: externalActiveTactic,
  onTacticChange,
  onStartSecondHalf,
  onFinishMatch,
  isSimulationRunning = false,
  userResultType,
  finishButtonLabel,
  homePenalties,
  awayPenalties,
  isCupMatch,
}) => {
  // Perspective angle state: 'isometric' (2.5D longitudinal) | 'broadcast' (3D longitudinal) | 'top' (2D Tactical)
  const [viewAngle, setViewAngle] = useState<'isometric' | 'broadcast' | 'top'>('isometric');
  const [showRadar, setShowRadar] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(stadiumAudio.isMuted());
  const [selectedTactic, setSelectedTactic] = useState<string>(externalActiveTactic || 'balanced');
  const [halfTimeTalk, setHalfTimeTalk] = useState<'motivate' | 'focus' | 'calm'>('motivate');

  const isHalfTimeBreak =
    status === 'halftime' ||
    (!isFinished && minute === 45 && (lastEvent?.type === 'halftime' || Boolean(lastEvent?.textAr?.includes('الشوط الأول'))));

  const isFullTimeFinished = isFinished || status === 'finished';

  const handleStartSecondHalfClick = () => {
    if (!isMuted) {
      stadiumAudio.playWhistle();
    }
    if (onStartSecondHalf) {
      onStartSecondHalf();
    }
  };

  const handleFinishMatchClick = () => {
    if (!isMuted) {
      stadiumAudio.playWhistle();
    }
    if (onFinishMatch) {
      onFinishMatch();
    }
  };

  // Animation frame tick for lifelike miniature movement - 700ms smooth tactical tick matching CSS transitions
  const [animTick, setAnimTick] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimTick((t) => (t + 1) % 10000);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  // Audio triggers for important match events (Goal Roar & Referee Whistle)
  useEffect(() => {
    if (lastEvent?.type === 'goal') {
      stadiumAudio.playGoalRoar();
    } else if (
      lastEvent?.type === 'yellow_card' ||
      lastEvent?.type === 'red_card' ||
      lastEvent?.type === 'foul' ||
      lastEvent?.type === 'substitution' ||
      status === 'halftime' ||
      status === 'finished' ||
      isFinished
    ) {
      stadiumAudio.playWhistle();
    }
  }, [lastEvent?.type, lastEvent?.id, status, isFinished]);

  const isGoal = lastEvent?.type === 'goal';
  const isAttack = currentBallZone !== 'midfield';

  // Compute Scorer, Assist, and Scoring Club details
  const goalDetails = useMemo(() => {
    if (!isGoal) return null;

    let scorer = lastEvent?.scorerName || lastEvent?.playerName;
    let assist = lastEvent?.assistName;
    const isHomeScorer = lastEvent?.team === homeClubName || lastEvent?.team === 'host';
    const scoringClub = isHomeScorer ? homeClubName : awayClubName;

    // Parse from textAr if not directly supplied
    if (!scorer && lastEvent?.textAr) {
      const bracketMatch = lastEvent.textAr.match(/\[(.*?)\]/);
      if (bracketMatch) {
        scorer = bracketMatch[1];
      } else {
        const parenMatch = lastEvent.textAr.match(/\((.*?)\)/);
        if (parenMatch) {
          scorer = parenMatch[1];
        } else {
          const byMatch = lastEvent.textAr.match(/بواسطة\s+([^\s]+(?:\s+[^\s]+)?)/);
          if (byMatch) {
            scorer = byMatch[1].trim();
          }
        }
      }
    }

    if (!assist && lastEvent?.textAr) {
      const assistMatch = lastEvent.textAr.match(/تمريرة.*?من\s+[\(\[](.*?)[\)\]]/);
      if (assistMatch) {
        assist = assistMatch[1];
      }
    }

    if (!scorer) {
      scorer = isHomeScorer ? 'هداف الفريق' : 'مهاجم الفريق';
    }

    return {
      scorerName: scorer,
      assistName: assist,
      scoringClub,
      minute: lastEvent?.minute ?? minute,
      isHomeScorer,
    };
  }, [isGoal, lastEvent, homeClubName, awayClubName, minute]);

  // Active Match Notification banner for key match events
  // (Fouls, Cards, Extra Time, Substitutions, Half-time, Full-time)
  const activeNotification = useMemo(() => {
    // 1. Full-time finish / End of match
    if (
      isFinished ||
      status === 'finished' ||
      lastEvent?.type === 'fulltime' ||
      lastEvent?.textAr?.includes('نهاية المباراة') ||
      lastEvent?.textAr?.includes('صافرة النهاية')
    ) {
      const isHomeWin = homeScore > awayScore;
      const isAwayWin = awayScore > homeScore;
      const isDraw = homeScore === awayScore;
      const winnerName = isHomeWin ? homeClubName : isAwayWin ? awayClubName : null;

      return {
        id: 'fulltime',
        type: 'fulltime',
        icon: '🏆',
        title: 'صافرة النهاية | انتهاء المباراة',
        subtitle: isDraw
          ? `تعادل الفريقين بنتيجة (${homeScore} - ${awayScore})`
          : `فوز مستحق لنادي ${winnerName}! 👏`,
        details: `${homeClubName} ${homeScore} - ${awayScore} ${awayClubName}`,
        badge: "نهاية اللقاء FT",
        badgeBg: 'bg-amber-400 text-slate-950 font-black',
        borderClass: 'border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.35)]',
        bgGradient: 'from-amber-950/95 via-slate-900/95 to-slate-950/95',
        textColor: 'text-amber-300',
      };
    }

    // 2. Half-time whistle
    if (
      status === 'halftime' ||
      lastEvent?.type === 'halftime' ||
      lastEvent?.textAr?.includes('نهاية الشوط الأول') ||
      (minute === 45 && !isFinished && lastEvent?.textAr?.includes('الشوط'))
    ) {
      return {
        id: 'halftime',
        type: 'halftime',
        icon: '⏸️',
        title: 'صافرة نهاية الشوط الأول',
        subtitle: 'استراحة ما بين الشوطين - توجه اللاعبين لغرف الملابس',
        details: `النتيجة الحالية: ${homeClubName} ${homeScore} - ${awayScore} ${awayClubName}`,
        badge: "استراحة HT 45'",
        badgeBg: 'bg-sky-400 text-slate-950 font-black',
        borderClass: 'border-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.35)]',
        bgGradient: 'from-sky-950/95 via-slate-900/95 to-slate-950/95',
        textColor: 'text-sky-300',
      };
    }

    // 3. Stoppage / Added Time (الوقت بدل الضائع)
    if (
      lastEvent?.type === 'stoppage_time' ||
      lastEvent?.textAr?.includes('بدل ضائع') ||
      (addedTime && addedTime > 0 && (minute === 45 || minute === 90))
    ) {
      const matchMinutes =
        lastEvent?.textAr?.match(/(\d+)\s*دقيق/)?.[1] || (addedTime ? String(addedTime) : '3');
      return {
        id: 'stoppage',
        type: 'stoppage_time',
        icon: '⏱️',
        title: 'لوحة الحكم الرابع: وقت بدل ضائع',
        subtitle: `احتساب +${matchMinutes} دقائق وقت إضافي بدل ضائع`,
        details: lastEvent?.textAr || `وقت بدل ضائع للشوط ${minute <= 45 ? 'الأول' : 'الثاني'}`,
        badge: `+${matchMinutes}' وقت إضافي`,
        badgeBg: 'bg-purple-500 text-white font-black',
        borderClass: 'border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.35)]',
        bgGradient: 'from-purple-950/95 via-slate-900/95 to-slate-950/95',
        textColor: 'text-purple-200',
      };
    }

    // 4. Red Card (طرد مباشر)
    if (
      lastEvent?.type === 'red_card' ||
      lastEvent?.textAr?.includes('بطاقة حمراء') ||
      lastEvent?.textAr?.includes('طرد')
    ) {
      const pName = lastEvent?.playerName || lastEvent?.scorerName || 'لاعب الفريق';
      const teamLabel =
        lastEvent?.team === 'host'
          ? homeClubName
          : lastEvent?.team === 'guest'
          ? awayClubName
          : lastEvent?.team || '';
      return {
        id: lastEvent?.id || 'red_card',
        type: 'red_card',
        icon: '🟥',
        title: 'بطاقة حمراء - طرد مباشر!',
        subtitle: `${pName} ${teamLabel ? `(${teamLabel})` : ''}`,
        details: lastEvent?.textAr || 'طرد مباشر بعد تدخل قوي ومغادرة أرضية الملعب',
        badge: `دقيقة ${lastEvent?.minute ?? minute}'`,
        badgeBg: 'bg-red-600 text-white font-black',
        borderClass: 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.45)]',
        bgGradient: 'from-red-950/95 via-slate-900/95 to-slate-950/95',
        textColor: 'text-red-200',
      };
    }

    // 5. Yellow Card (بطاقة صفراء)
    if (
      lastEvent?.type === 'yellow_card' ||
      lastEvent?.textAr?.includes('بطاقة صفراء') ||
      lastEvent?.textAr?.includes('إنذار') ||
      lastEvent?.textAr?.includes('انذار')
    ) {
      const pName = lastEvent?.playerName || lastEvent?.scorerName || 'لاعب الفريق';
      const teamLabel =
        lastEvent?.team === 'host'
          ? homeClubName
          : lastEvent?.team === 'guest'
          ? awayClubName
          : lastEvent?.team || '';
      return {
        id: lastEvent?.id || 'yellow_card',
        type: 'yellow_card',
        icon: '🟨',
        title: 'بطاقة صفراء - إنذار رسمي',
        subtitle: `${pName} ${teamLabel ? `(${teamLabel})` : ''}`,
        details: lastEvent?.textAr || 'إنذار من حكم اللقاء بسبب مخالفة تكتيكية',
        badge: `دقيقة ${lastEvent?.minute ?? minute}'`,
        badgeBg: 'bg-yellow-400 text-slate-950 font-black',
        borderClass: 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.35)]',
        bgGradient: 'from-amber-950/95 via-slate-900/95 to-slate-950/95',
        textColor: 'text-amber-200',
      };
    }

    // 6. Substitution (تبديل لاعبين)
    if (lastEvent?.type === 'substitution' || lastEvent?.textAr?.includes('تبديل')) {
      const teamLabel =
        lastEvent?.team === 'host'
          ? homeClubName
          : lastEvent?.team === 'guest'
          ? awayClubName
          : lastEvent?.team || '';
      const outP = lastEvent?.outPlayerName;
      const inP = lastEvent?.inPlayerName;
      return {
        id: lastEvent?.id || 'substitution',
        type: 'substitution',
        icon: '🔄',
        title: 'إجراء تبديل تكتيكي',
        subtitle:
          outP && inP
            ? `خروج 🔻: ${outP} | دخول 🔺: ${inP}`
            : lastEvent?.textAr || 'تبديل في صفوف الفريق',
        details: `${teamLabel ? `نادي ${teamLabel} • ` : ''}الدقيقة ${lastEvent?.minute ?? minute}'`,
        badge: 'تبديل تكتيكي',
        badgeBg: 'bg-emerald-500 text-slate-950 font-black',
        borderClass: 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
        bgGradient: 'from-emerald-950/95 via-slate-900/95 to-slate-950/95',
        textColor: 'text-emerald-200',
      };
    }

    // 7. Fouls, Penalties, Offsides (الأخطاء والجزاء والتسلل)
    if (
      lastEvent?.type === 'foul' ||
      lastEvent?.textAr?.includes('خطأ') ||
      lastEvent?.textAr?.includes('فاول') ||
      lastEvent?.textAr?.includes('ركلة جزاء') ||
      lastEvent?.textAr?.includes('ضربة جزاء') ||
      lastEvent?.textAr?.includes('تسلل') ||
      lastEvent?.textAr?.includes('مخالفة')
    ) {
      const isPenalty = lastEvent.textAr?.includes('جزاء');
      const isOffside = lastEvent.textAr?.includes('تسلل');
      return {
        id: lastEvent?.id || 'foul',
        type: isPenalty ? 'penalty' : isOffside ? 'offside' : 'foul',
        icon: isPenalty ? '🚨' : isOffside ? '🚩' : '⚠️',
        title: isPenalty ? '🚨 ضربة جزاء!' : isOffside ? '🚩 راية تسلل!' : '⚠️ صافرة الحكم: مخالفة',
        subtitle: isPenalty
          ? 'الحكم يحتسب ركلة جزاء مباشرة!'
          : isOffside
          ? 'الحكم المساعد يعلن عن حالة تسلل'
          : 'خطأ وركلة حرة في منتصف الملعب',
        details: lastEvent?.textAr || '',
        badge: `دقيقة ${lastEvent?.minute ?? minute}'`,
        badgeBg: isPenalty
          ? 'bg-rose-500 text-white font-black'
          : 'bg-amber-500 text-slate-950 font-black',
        borderClass: isPenalty
          ? 'border-rose-500 shadow-[0_0_18px_rgba(244,63,94,0.4)]'
          : 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.35)]',
        bgGradient: isPenalty
          ? 'from-rose-950/95 via-slate-900/95 to-slate-950/95'
          : 'from-slate-900/95 via-slate-950/95 to-slate-950/95',
        textColor: isPenalty ? 'text-rose-200' : 'text-amber-200',
      };
    }

    return null;
  }, [
    lastEvent,
    isFinished,
    status,
    minute,
    addedTime,
    homeScore,
    awayScore,
    homeClubName,
    awayClubName,
  ]);

  // Compute Ball Coordinates on Vertical Field (x: width 0..100%, y: length 0..100%)
  // Home attacks UP towards y=4%, Away attacks DOWN towards y=96%
  const ballPos = useMemo(() => {
    if (isGoal) {
      if (lastEvent?.team === homeClubName) {
        // Goal scored by Home in the top goal net
        return { x: 50 + Math.sin(animTick * 0.3) * 6, y: 3 };
      } else {
        // Goal scored by Away in the bottom goal net
        return { x: 50 + Math.sin(animTick * 0.3) * 6, y: 97 };
      }
    }

    if (currentBallZone === 'guest_box') {
      // Home team in Away's box at the TOP
      const wobbleX = Math.sin(animTick * 0.14) * 16;
      return { x: 50 + wobbleX, y: 12 + Math.cos(animTick * 0.18) * 4 };
    }
    if (currentBallZone === 'guest_half') {
      // Attacking build-up in upper half
      const wobbleX = Math.sin(animTick * 0.12) * 22;
      return { x: 50 + wobbleX, y: 28 + Math.cos(animTick * 0.15) * 5 };
    }
    if (currentBallZone === 'host_box') {
      // Away team in Home's box at the BOTTOM
      const wobbleX = Math.sin(animTick * 0.14) * 16;
      return { x: 50 + wobbleX, y: 88 - Math.cos(animTick * 0.18) * 4 };
    }
    if (currentBallZone === 'host_half') {
      // Defending build-up in lower half
      const wobbleX = Math.sin(animTick * 0.12) * 22;
      return { x: 50 + wobbleX, y: 72 - Math.cos(animTick * 0.15) * 5 };
    }

    // Midfield zone with dynamic momentum shift
    const shiftedY = 50 - (momentum / 100) * 12 + Math.sin(animTick * 0.12) * 5;
    const shiftedX = 50 + Math.cos(animTick * 0.1) * 24;
    return {
      x: Math.max(18, Math.min(82, shiftedX)),
      y: Math.max(38, Math.min(62, shiftedY)),
    };
  }, [currentBallZone, momentum, animTick, isGoal, lastEvent?.team, homeClubName]);

  // Compute HOME Players (Defending Bottom y=94%, Attacking Top y=6%)
  const homePlayers: PlayerDot[] = useMemo(() => {
    const list = VERTICAL_FORMATIONS_MAP[homeFormation] || VERTICAL_FORMATIONS_MAP['4-3-3'];
    const isHomeAttack = currentBallZone === 'guest_box' || currentBallZone === 'guest_half';
    const isAwayAttack = currentBallZone === 'host_box' || currentBallZone === 'host_half';
    const time = animTick * 0.14;
    const usedNames = new Set<string>();

    return list.map((p, idx) => {
      let targetX = p.x;
      let targetY = p.y;
      let isRunning = false;

      // Assign realistic player name and jersey number
      const playerInfo = assignPlayerNameAndNumber(p.role, idx, homeClubName, homeSquad, usedNames);

      // Micro movement breathing
      const phase = time + idx * 1.35;
      const microX = Math.sin(phase) * 1.2;
      const microY = Math.cos(phase * 1.1) * 1.0;

      if (p.role === 'GK') {
        targetX = 50 + (ballPos.x - 50) * 0.32;
        targetY = 94;
        if (isAwayAttack) {
          targetY = 92.5;
          isRunning = true;
        }
      } else if (['CB', 'DF'].includes(p.role)) {
        if (isHomeAttack) {
          targetY = p.y - 16;
          isRunning = true;
        } else if (isAwayAttack) {
          targetY = Math.min(90, p.y + 4);
          targetX = p.x + (ballPos.x - p.x) * 0.22;
          isRunning = true;
        }
      } else if (['LB', 'RB', 'LWB', 'RWB'].includes(p.role)) {
        if (isHomeAttack) {
          targetY = p.y - 32;
          isRunning = true;
        } else if (isAwayAttack) {
          targetY = Math.min(88, p.y + 4);
          isRunning = true;
        }
      } else if (p.role === 'CDM') {
        if (isHomeAttack) {
          targetY = p.y - 22;
          isRunning = true;
        } else if (isAwayAttack) {
          targetY = p.y + 6;
          isRunning = true;
        }
        targetX = p.x + (ballPos.x - p.x) * 0.25;
      } else if (p.role === 'CM' || p.role === 'CAM') {
        if (isHomeAttack) {
          targetY = p.y - 28;
          targetX = p.x + (ballPos.x - p.x) * 0.25;
          isRunning = true;
        } else if (isAwayAttack) {
          targetY = Math.min(80, p.y + 10);
          isRunning = true;
        }
      } else if (['LW', 'RW', 'LM', 'RM'].includes(p.role)) {
        if (isHomeAttack) {
          targetY = p.y - 32;
          targetX = p.x + (50 - p.x) * 0.22;
          isRunning = true;
        } else if (isAwayAttack) {
          targetY = p.y + 6;
          isRunning = true;
        }
      } else if (p.role === 'ST' || p.role === 'CF') {
        if (isHomeAttack) {
          targetY = 16 + Math.sin(time * 0.8) * 4;
          targetX = 50 + Math.cos(time * 0.7) * 14;
          isRunning = true;
        } else if (isAwayAttack) {
          targetY = 48 + Math.sin(time * 0.5) * 3;
          targetX = 50;
        }
      }

      const finalX = Math.max(8, Math.min(92, targetX + microX));
      const finalY = Math.max(6, Math.min(94, targetY + microY));
      const dist = Math.hypot(finalX - ballPos.x, finalY - ballPos.y);
      const isCarrier = dist < 7.5 && (isHomeAttack || currentBallZone === 'midfield');
      const isScorer = Boolean(
        isGoal &&
        goalDetails?.isHomeScorer &&
        (goalDetails?.scorerName === playerInfo.name || (p.role === 'ST' && !goalDetails?.scorerName))
      );

      return {
        id: `home-${idx}`,
        name: playerInfo.name,
        role: p.role,
        roleArabic: getSimplifiedRoleArabic(p.role),
        jerseyNumber: playerInfo.jerseyNumber,
        x: finalX,
        y: finalY,
        isCarrier,
        isRunning,
        isScorer,
      };
    });
  }, [homeFormation, currentBallZone, animTick, ballPos, homeClubName, homeSquad, isGoal, goalDetails]);

  // Compute AWAY Players (Defending Top y=6%, Attacking Bottom y=94%)
  const awayPlayers: PlayerDot[] = useMemo(() => {
    const list = VERTICAL_FORMATIONS_MAP[awayFormation] || VERTICAL_FORMATIONS_MAP['4-3-3'];
    const isHomeAttack = currentBallZone === 'guest_box' || currentBallZone === 'guest_half';
    const isAwayAttack = currentBallZone === 'host_box' || currentBallZone === 'host_half';
    const time = animTick * 0.14;
    const usedNames = new Set<string>();

    return list.map((p, idx) => {
      // Invert Y coordinate for Away Team
      const mirroredY = 100 - p.y;
      let targetX = 100 - p.x;
      let targetY = mirroredY;
      let isRunning = false;

      // Assign realistic player name and jersey number
      const playerInfo = assignPlayerNameAndNumber(p.role, idx, awayClubName, awaySquad, usedNames);

      const phase = time + (idx + 11) * 1.35;
      const microX = Math.sin(phase) * 1.2;
      const microY = Math.cos(phase * 1.1) * 1.0;

      if (p.role === 'GK') {
        targetX = 50 + (ballPos.x - 50) * 0.32;
        targetY = 6;
        if (isHomeAttack) {
          targetY = 7.5;
          isRunning = true;
        }
      } else if (['CB', 'DF'].includes(p.role)) {
        if (isAwayAttack) {
          targetY = mirroredY + 16;
          isRunning = true;
        } else if (isHomeAttack) {
          targetY = Math.max(10, mirroredY - 4);
          targetX = targetX + (ballPos.x - targetX) * 0.22;
          isRunning = true;
        }
      } else if (['LB', 'RB', 'LWB', 'RWB'].includes(p.role)) {
        if (isAwayAttack) {
          targetY = mirroredY + 32;
          isRunning = true;
        } else if (isHomeAttack) {
          targetY = Math.max(12, mirroredY - 4);
          isRunning = true;
        }
      } else if (p.role === 'CDM') {
        if (isAwayAttack) {
          targetY = mirroredY + 22;
          isRunning = true;
        } else if (isHomeAttack) {
          targetY = mirroredY - 6;
          isRunning = true;
        }
        targetX = targetX + (ballPos.x - targetX) * 0.25;
      } else if (p.role === 'CM' || p.role === 'CAM') {
        if (isAwayAttack) {
          targetY = mirroredY + 28;
          targetX = targetX + (ballPos.x - targetX) * 0.25;
          isRunning = true;
        } else if (isHomeAttack) {
          targetY = Math.max(20, mirroredY - 10);
          isRunning = true;
        }
      } else if (['LW', 'RW', 'LM', 'RM'].includes(p.role)) {
        if (isAwayAttack) {
          targetY = mirroredY + 32;
          targetX = targetX + (50 - targetX) * 0.22;
          isRunning = true;
        } else if (isHomeAttack) {
          targetY = mirroredY - 6;
          isRunning = true;
        }
      } else if (p.role === 'ST' || p.role === 'CF') {
        if (isAwayAttack) {
          targetY = 84 - Math.sin(time * 0.8) * 4;
          targetX = 50 + Math.cos(time * 0.7) * 14;
          isRunning = true;
        } else if (isHomeAttack) {
          targetY = 52 - Math.sin(time * 0.5) * 3;
          targetX = 50;
        }
      }

      const finalX = Math.max(8, Math.min(92, targetX + microX));
      const finalY = Math.max(6, Math.min(94, targetY + microY));
      const dist = Math.hypot(finalX - ballPos.x, finalY - ballPos.y);
      const isCarrier = dist < 7.5 && isAwayAttack;
      const isScorer = Boolean(
        isGoal &&
        !goalDetails?.isHomeScorer &&
        (goalDetails?.scorerName === playerInfo.name || (p.role === 'ST' && !goalDetails?.scorerName))
      );

      return {
        id: `away-${idx}`,
        name: playerInfo.name,
        role: p.role,
        roleArabic: getSimplifiedRoleArabic(p.role),
        jerseyNumber: playerInfo.jerseyNumber,
        x: finalX,
        y: finalY,
        isCarrier,
        isRunning,
        isScorer,
      };
    });
  }, [awayFormation, currentBallZone, animTick, ballPos, awayClubName, awaySquad, isGoal, goalDetails]);

  // Compute Attack & Passing Vectors (Moving Vertically UP or DOWN)
  const attackSimulation = useMemo(() => {
    const isHomeAttacking = currentBallZone === 'guest_box' || currentBallZone === 'guest_half';
    const isAwayAttacking = currentBallZone === 'host_box' || currentBallZone === 'host_half';
    const isBoxAttack = currentBallZone === 'guest_box' || currentBallZone === 'host_box';

    if (!isHomeAttacking && !isAwayAttacking) {
      // Midfield circulation vector
      return {
        hasVector: true,
        startX: ballPos.x - 6,
        startY: ballPos.y + 4,
        endX: ballPos.x + 8,
        endY: ballPos.y - 4,
        isShot: false,
        direction: 'up',
        color: '#fbbf24',
        targetGoal: null,
      };
    }

    if (isHomeAttacking) {
      const carrier = homePlayers.find((p) => p.isCarrier) || homePlayers.find((p) => p.role === 'ST') || homePlayers[0];
      if (isBoxAttack) {
        // Shooting vector on Away Goal (at the TOP y=3)
        return {
          hasVector: true,
          startX: carrier?.x || ballPos.x,
          startY: carrier?.y || ballPos.y,
          endX: 50 + Math.sin(animTick * 0.2) * 8,
          endY: 3,
          isShot: true,
          direction: 'up',
          color: '#fbbf24',
          targetGoal: { x: 50, y: 3 },
        };
      } else {
        // Passing build-up vector UPWARDS towards striker
        const striker = homePlayers.find((p) => p.role === 'ST') || { x: 50, y: 20 };
        return {
          hasVector: true,
          startX: carrier?.x || ballPos.x,
          startY: carrier?.y || ballPos.y,
          endX: striker.x,
          endY: striker.y,
          isShot: false,
          direction: 'up',
          color: '#34d399',
          targetGoal: null,
        };
      }
    } else {
      const carrier = awayPlayers.find((p) => p.isCarrier) || awayPlayers.find((p) => p.role === 'ST') || awayPlayers[0];
      if (isBoxAttack) {
        // Shooting vector on Home Goal (at the BOTTOM y=97)
        return {
          hasVector: true,
          startX: carrier?.x || ballPos.x,
          startY: carrier?.y || ballPos.y,
          endX: 50 + Math.sin(animTick * 0.2) * 8,
          endY: 97,
          isShot: true,
          direction: 'down',
          color: '#fbbf24',
          targetGoal: { x: 50, y: 97 },
        };
      } else {
        // Passing build-up vector DOWNWARDS towards striker
        const striker = awayPlayers.find((p) => p.role === 'ST') || { x: 50, y: 80 };
        return {
          hasVector: true,
          startX: carrier?.x || ballPos.x,
          startY: carrier?.y || ballPos.y,
          endX: striker.x,
          endY: striker.y,
          isShot: false,
          direction: 'down',
          color: '#60a5fa',
          targetGoal: null,
        };
      }
    }
  }, [currentBallZone, ballPos, homePlayers, awayPlayers, animTick]);

  // Perspective 3D Transforms for the Vertical Stadium View
  const transformStyle = useMemo(() => {
    if (viewAngle === 'top') {
      return {
        transform: 'perspective(1200px) rotateX(0deg) scale(0.98)',
        transformOrigin: 'center center',
      };
    }
    if (viewAngle === 'broadcast') {
      return {
        transform: 'perspective(850px) rotateX(28deg) scale(0.95)',
        transformOrigin: 'center center',
      };
    }
    // Default 'isometric' clean 2.5D longitudinal angle
    return {
      transform: 'perspective(1050px) rotateX(20deg) scale(0.97)',
      transformOrigin: 'center center',
    };
  }, [viewAngle]);

  const handleTacticClick = (tacticId: string) => {
    setSelectedTactic(tacticId);
    onTacticChange?.(tacticId);
    if (!isMuted) {
      stadiumAudio.playWhistle();
    }
  };

  return (
    <div
      className="relative bg-slate-950/90 rounded-3xl border border-slate-800 p-3 sm:p-4 shadow-2xl overflow-hidden select-none"
      id="live-stadium-component"
      dir="rtl"
    >
      {/* 1. TOP HEADER (Scoreboard, Live Minute & Possession) */}
      <div className="relative z-10 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 mb-3 backdrop-blur-md shadow-lg">
        {/* Score & Club Matchup Line */}
        <div className="flex items-center justify-between gap-2">
          {/* HOME TEAM (Right in RTL - Defends Bottom, Attacks UP ⬆️) */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              style={{ backgroundColor: homeColor || '#10b981' }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[120px] sm:max-w-[160px]">
                {homeClubName}
              </span>
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                <ArrowUp className="w-2.5 h-2.5" /> يهاجم للأعلى
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-emerald-400 font-mono mr-auto">
              {homeScore}
            </span>
          </div>

          {/* CENTER: LIVE MINUTE & MATCH STATE */}
          <div className="flex flex-col items-center shrink-0 px-2 sm:px-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span className="font-mono">{minute}'</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
              {isFinished ? 'صافرة النهاية' : minute <= 45 ? 'الشوط الأول' : 'الشوط الثاني'}
            </span>
          </div>

          {/* AWAY TEAM (Left in RTL - Defends Top, Attacks DOWN ⬇️) */}
          <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
            <span className="text-lg sm:text-2xl font-black text-blue-400 font-mono ml-auto">
              {awayScore}
            </span>
            <div className="flex flex-col items-end min-w-0 text-left">
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[120px] sm:max-w-[160px]">
                {awayClubName}
              </span>
              <span className="text-[9px] text-blue-400 font-bold flex items-center gap-0.5">
                يهاجم للأسفل <ArrowDown className="w-2.5 h-2.5" />
              </span>
            </div>
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.7)]"
              style={{ backgroundColor: awayColor || '#3b82f6' }}
            />
          </div>
        </div>

        {/* SLIM POSSESSION BAR */}
        <div className="mt-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
            <span className="text-emerald-400">{homePossession}% استحواذ</span>
            <span className="text-slate-500 font-medium">السيطرة الميدانية</span>
            <span className="text-blue-400">{awayPossession}% استحواذ</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
            <div
              className="h-full transition-all duration-500 rounded-r-full"
              style={{
                width: `${homePossession}%`,
                backgroundColor: homeColor || '#10b981',
              }}
            />
            <div
              className="h-full transition-all duration-500 rounded-l-full"
              style={{
                width: `${awayPossession}%`,
                backgroundColor: awayColor || '#3b82f6',
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. DEDICATED FIXED MATCH EVENTS SCREEN (شاشة عرض أحداث المباراة الثابتة - خارج الملعب بدون حجب اللعب) */}
      <div className="relative z-10 w-full max-w-lg mx-auto mb-2" id="match-events-fixed-display">
        {isGoal && goalDetails ? (
          /* GOAL CELEBRATION BROADCAST CARD (شاشة الهدف التلفزيونية) */
          <div className="px-3 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-amber-950 border-2 border-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="text-2xl sm:text-3xl shrink-0 animate-bounce">⚽</div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-black shrink-0 shadow">
                    هــــــــــدف! GOAL!
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-300">
                    لصالح: <strong className="text-emerald-300 font-black">{goalDetails.scoringClub}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs sm:text-sm font-black text-white truncate">
                  <span className="text-amber-300 drop-shadow">🌟 {goalDetails.scorerName}</span>
                  {goalDetails.assistName && (
                    <span className="text-[10px] sm:text-[11px] text-slate-300 font-medium">
                      (صناعة: <strong className="text-amber-200">{goalDetails.assistName}</strong>)
                    </span>
                  )}
                </div>
                {lastEvent?.textAr && (
                  <span className="text-[9.5px] text-slate-300/80 truncate mt-0.5">
                    {lastEvent.textAr}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 text-center pl-1">
              <span className="font-mono text-xs font-black text-amber-300 bg-slate-950/80 px-2 py-1 rounded-lg border border-amber-400/40 block">
                {goalDetails.minute}'
              </span>
            </div>
          </div>
        ) : activeNotification ? (
          /* ACTIVE MATCH EVENT BROADCAST CARD (شاشة البطاقات والأخطاء والوقت بدل الضائع والتبديلات ونهاية المباراة) */
          <div
            className={`px-3 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r ${activeNotification.bgGradient} border-2 ${activeNotification.borderClass} shadow-xl flex items-center justify-between gap-2.5 animate-in fade-in duration-200`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="text-xl sm:text-2xl shrink-0 drop-shadow">
                {activeNotification.icon}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] sm:text-xs font-black tracking-tight ${activeNotification.textColor}`}>
                    {activeNotification.title}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeNotification.badgeBg} shrink-0`}>
                    {activeNotification.badge}
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-white font-bold truncate mt-0.5">
                  {activeNotification.subtitle}
                </div>
                {activeNotification.details && (
                  <div className="text-[9.5px] text-slate-300/85 truncate">
                    {activeNotification.details}
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 text-center pl-1">
              <span className="font-mono text-xs font-black text-slate-300 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-700 block">
                {lastEvent?.minute ?? minute}'
              </span>
            </div>
          </div>
        ) : (
          /* LIVE PLAY TICKER MONITOR (شاشة أحداث اللعب المباشر المستمرة) */
          <div className="px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1 text-slate-300">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                بث مباشر
              </span>
              <span className="text-[11px] sm:text-xs truncate font-medium text-slate-200">
                {lastEvent?.textAr || (currentBallZone === 'guest_box' ? `هجمة واعدة لنادي ${homeClubName} في منطقة الجزاء!` : currentBallZone === 'host_box' ? `هجوم مرتد لنادي ${awayClubName}!` : 'تناقل سريع للكرة في وسط الميدان وفرض السيطرة')}
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-slate-400 shrink-0 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {minute}'
            </span>
          </div>
        )}
      </div>

      {/* 3. VERTICAL ISOMETRIC 2.5D STADIUM CANVAS (الملعب بدون أي شاشات تغطيه لتبقى الرؤية واضحة 100%) */}
      <div className="relative w-full overflow-hidden flex flex-col items-center justify-center">
        {/* Pitch Controls Bar */}
        <div className="w-full max-w-[340px] sm:max-w-[370px] flex items-center justify-between pb-1.5 px-1 text-[11px] font-bold text-slate-400">
          {/* Dynamic Attack Indicator */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            {currentBallZone === 'guest_box' ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span>هجمة خطيرة لـ {homeClubName}</span>
                <ArrowUp className="w-3.5 h-3.5 animate-bounce" />
              </span>
            ) : currentBallZone === 'host_box' ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span>هجمة خطيرة لـ {awayClubName}</span>
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </span>
            ) : (
              <span className="text-slate-400 font-medium">تناقل الكرة وبناء الهجمة</span>
            )}
          </div>

          {/* Camera Angles & Audio Controls */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-xl border border-slate-800 text-[10px]">
              <button
                type="button"
                onClick={() => setViewAngle('isometric')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  viewAngle === 'isometric'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                مائل 2.5D
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('broadcast')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  viewAngle === 'broadcast'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                بث 3D
              </button>
              <button
                type="button"
                onClick={() => setViewAngle('top')}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                  viewAngle === 'top'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                رأسي 2D
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowRadar(!showRadar)}
              className={`p-1 rounded-xl border text-[10px] transition-all cursor-pointer ${
                showRadar ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="رادار التشكيل"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                const next = stadiumAudio.toggleMute();
                setIsMuted(next);
                if (!next) stadiumAudio.playWhistle();
              }}
              className={`p-1 rounded-xl border text-[10px] transition-all cursor-pointer ${
                !isMuted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title={isMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* LIVE SCOREBOARD BAR (فوق الملعب مباشرة تحت طريقة العرض - شريط النتيجة الشفاف الموحد خارج أرضية الملعب) */}
        <div className="w-full max-w-[330px] sm:max-w-[360px] mb-2 px-3 py-1.5 rounded-2xl bg-slate-900/95 border border-slate-800 flex items-center justify-between shadow-lg">
          {/* Home Team */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: homeColor || '#10b981' }}
            />
            <span className="text-xs font-black text-white truncate max-w-[95px] sm:max-w-[110px]">
              {homeClubName}
            </span>
          </div>

          {/* Central Live Score & Time */}
          <div className="flex items-center gap-2 px-2 shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-xl bg-slate-950 border border-slate-700/80 shadow-inner font-mono font-black text-sm sm:text-base">
              <span className="text-emerald-400">{homeScore}</span>
              <span className="text-slate-500 text-xs">-</span>
              <span className="text-blue-400">{awayScore}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-black font-mono text-amber-300">
              {!isFinished && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
              <span>{isFinished ? 'FT' : `${minute}'`}</span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-left">
            <span className="text-xs font-black text-white truncate max-w-[95px] sm:max-w-[110px]">
              {awayClubName}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: awayColor || '#3b82f6' }}
            />
          </div>
        </div>

        {/* 3D VERTICAL PITCH BOARD (الأبعاد المدمجة المتناسقة بدون أي عناصر تحجب اللعب) */}
        <div
          style={{
            ...transformStyle,
            transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          className="relative w-full max-w-[330px] sm:max-w-[360px] aspect-[10/12.2] rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-slate-700/80 bg-emerald-900"
        >
          {/* Alternating Horizontal Mowed Grass Stripes (أشرطة العشب الأفقية كالملاعب العالمية) */}
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 w-full ${
                  i % 2 === 0 ? 'bg-[#15803d]' : 'bg-[#166534]'
                }`}
              />
            ))}
          </div>

          {/* SVG PITCH MARKINGS FOR VERTICAL STADIUM (ViewBox: 68m width x 105m length) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-1"
            viewBox="0 0 68 105"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="vertical-arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fbbf24" />
              </marker>
            </defs>

            {/* Outer Touchlines */}
            <rect
              x="3"
              y="3"
              width="62"
              height="99"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />

            {/* Halfway Line across the center horizontally */}
            <line
              x1="3"
              y1="52.5"
              x2="65"
              y2="52.5"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />

            {/* Center Circle */}
            <circle
              cx="34"
              cy="52.5"
              r="9.15"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            <circle cx="34" cy="52.5" r="0.8" fill="white" />

            {/* TOP PENALTY BOX (Away defensive box) */}
            <rect
              x="14"
              y="3"
              width="40"
              height="16.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            {/* Top 6-Yard Box */}
            <rect
              x="24"
              y="3"
              width="20"
              height="5.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            {/* Top Penalty Spot */}
            <circle cx="34" cy="14" r="0.7" fill="white" />
            {/* Top Penalty Arc */}
            <path
              d="M 26 19.5 A 9.15 9.15 0 0 0 42 19.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            {/* Top 3D Goal Net */}
            <rect
              x="28"
              y="0.8"
              width="12"
              height="2.2"
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#ffffff"
              strokeWidth="0.8"
            />

            {/* BOTTOM PENALTY BOX (Home defensive box) */}
            <rect
              x="14"
              y="85.5"
              width="40"
              height="16.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            {/* Bottom 6-Yard Box */}
            <rect
              x="24"
              y="96.5"
              width="20"
              height="5.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            {/* Bottom Penalty Spot */}
            <circle cx="34" cy="91" r="0.7" fill="white" />
            {/* Bottom Penalty Arc */}
            <path
              d="M 26 85.5 A 9.15 9.15 0 0 1 42 85.5"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.85"
              strokeWidth="0.8"
            />
            {/* Bottom 3D Goal Net */}
            <rect
              x="28"
              y="102"
              width="12"
              height="2.2"
              fill="rgba(255, 255, 255, 0.3)"
              stroke="#ffffff"
              strokeWidth="0.8"
            />

            {/* Corner Arcs */}
            <path d="M 3 5 A 2 2 0 0 0 5 3" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" />
            <path d="M 63 3 A 2 2 0 0 0 65 5" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" />
            <path d="M 3 100 A 2 2 0 0 0 5 102" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" />
            <path d="M 65 100 A 2 2 0 0 1 63 102" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" />

            {/* DYNAMIC PASSING & SHOOTING VECTORS (Moving Vertically) */}
            {attackSimulation.hasVector && (
              <g>
                <line
                  x1={(attackSimulation.startX / 100) * 68}
                  y1={(attackSimulation.startY / 100) * 105}
                  x2={(attackSimulation.endX / 100) * 68}
                  y2={(attackSimulation.endY / 100) * 105}
                  stroke={attackSimulation.color}
                  strokeWidth={attackSimulation.isShot ? '1.5' : '1.2'}
                  strokeDasharray="3,3"
                  strokeOpacity="0.9"
                  markerEnd="url(#vertical-arrow)"
                />

                {/* Shooting Target Crosshairs on Goal Mouth */}
                {attackSimulation.isShot && attackSimulation.targetGoal && (
                  <g>
                    <circle
                      cx={(attackSimulation.targetGoal.x / 100) * 68}
                      cy={(attackSimulation.targetGoal.y / 100) * 105}
                      r="3"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="0.6"
                      strokeDasharray="1,1"
                    />
                    <circle
                      cx={(attackSimulation.targetGoal.x / 100) * 68}
                      cy={(attackSimulation.targetGoal.y / 100) * 105}
                      r="1.4"
                      fill="rgba(251, 191, 36, 0.5)"
                    />
                  </g>
                )}
              </g>
            )}
          </svg>

          {/* HOME PLAYERS (Miniature 3D Figurines - Emerald Kit) */}
          {homePlayers.map((player) => (
            <div
              key={player.id}
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.7s cubic-bezier(0.25, 1, 0.5, 1), top 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
                willChange: 'left, top',
              }}
              className="absolute z-10 pointer-events-none select-none"
            >
              <MiniaturePlayerFigurine
                player={player}
                isHome={true}
                primaryColor={homeColor}
                isGK={player.role === 'GK'}
              />
            </div>
          ))}

          {/* AWAY PLAYERS (Miniature 3D Figurines - Blue Kit) */}
          {awayPlayers.map((player) => (
            <div
              key={player.id}
              style={{
                left: `${player.x}%`,
                top: `${player.y}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'left 0.7s cubic-bezier(0.25, 1, 0.5, 1), top 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
                willChange: 'left, top',
              }}
              className="absolute z-10 pointer-events-none select-none"
            >
              <MiniaturePlayerFigurine
                player={player}
                isHome={false}
                primaryColor={awayColor}
                isGK={player.role === 'GK'}
              />
            </div>
          ))}

          {/* 3D BALL WITH REALISTIC TRAJECTORY & SHADOW */}
          <div
            style={{
              left: `${ballPos.x}%`,
              top: `${ballPos.y}%`,
              transform: 'translate(-50%, -50%)',
              transition: 'left 0.45s cubic-bezier(0.25, 1, 0.5, 1), top 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
              willChange: 'left, top',
            }}
            className="absolute z-20 pointer-events-none"
          >
            {/* Ground Contact Shadow */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-1.5 bg-black/70 rounded-full blur-[0.8px]" />

            {/* 3D Ball Sphere */}
            <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white border border-slate-900 shadow-md flex items-center justify-center animate-ball-float">
              <span className="text-[7.5px] sm:text-[8px] leading-none">⚽</span>
            </div>

            {/* Shot Flash Glow */}
            {attackSimulation.isShot && (
              <span className="absolute -inset-1 rounded-full bg-amber-400/30 animate-ping pointer-events-none" />
            )}
          </div>

          {/* 2D TACTICAL RADAR OVERLAY (Collapsible in Corner) */}
          {showRadar && (
            <div className="absolute bottom-2 left-2 z-25 bg-slate-950/90 border border-slate-700 rounded-xl p-1.5 shadow-2xl backdrop-blur-sm pointer-events-none">
              <div className="text-[7px] font-bold text-slate-400 text-center mb-0.5">رادار التشكيل</div>
              <div className="relative w-16 h-24 bg-emerald-950/90 rounded border border-emerald-500/40 overflow-hidden">
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-emerald-400/30" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-emerald-400/30" />
                {homePlayers.map((p) => (
                  <div
                    key={`radar-${p.id}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    className={`absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      p.isCarrier ? 'bg-amber-400 ring-1 ring-white animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                ))}
                {awayPlayers.map((p) => (
                  <div
                    key={`radar-${p.id}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    className={`absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      p.isCarrier ? 'bg-amber-400 ring-1 ring-white animate-ping' : 'bg-blue-400'
                    }`}
                  />
                ))}
                <div
                  style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%` }}
                  className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-300 ring-1 ring-amber-500 animate-pulse"
                />
              </div>
            </div>
          )}
        </div>

        {/* HALF-TIME CENTER SCREEN (شاشة استراحة الشوطين في منتصف الشاشة - خيارات المدرب وزر بدء الشوط الثاني) */}
        {isHalfTimeBreak && (
          <div className="absolute inset-0 z-35 flex items-center justify-center p-2 sm:p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-full max-w-[325px] sm:max-w-[350px] bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 rounded-3xl border-2 border-amber-400/90 shadow-[0_0_35px_rgba(251,191,36,0.3)] p-3.5 sm:p-4 text-center flex flex-col items-center gap-2.5">
              {/* Top Badge: انتهاء الشوط الأول */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black shadow">
                <span>⏸️</span>
                <span>صافرة نهاية الشوط الأول</span>
                <span className="font-mono bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded text-[10px]">
                  HT 45'
                </span>
              </div>

              {/* Current Score Summary */}
              <div className="w-full py-2 px-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 shadow-inner">
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[95px]">
                  {homeClubName}
                </span>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-slate-900 border border-amber-400/40 text-amber-300 font-mono font-black text-base sm:text-lg">
                  <span>{homeScore}</span>
                  <span className="text-slate-500 text-xs">-</span>
                  <span>{awayScore}</span>
                </div>
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[95px]">
                  {awayClubName}
                </span>
              </div>

              {/* Match Stats / Possession Strip */}
              <div className="w-full flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>الاستحواذ: <strong className="text-emerald-400 font-mono">%{homePossession}</strong></span>
                <span className="text-slate-500 font-bold">استراحة ما بين الشوطين</span>
                <span>الاستحواذ: <strong className="text-blue-400 font-mono">%{awayPossession}</strong></span>
              </div>

              {/* Coach's Options for the 2nd Half */}
              <div className="w-full pt-1.5 border-t border-slate-800/90 space-y-2 text-right">
                <div className="flex items-center justify-between text-[10.5px] font-bold text-amber-300">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>خيارات وتعديلات المدرب للشوط الثاني:</span>
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-mono">
                    {QUICK_TACTICS_LIST.find((t) => t.id === selectedTactic)?.label || 'متوازن'}
                  </span>
                </div>

                {/* Tactical Mentality Grid (6 options) */}
                <div className="grid grid-cols-3 gap-1">
                  {QUICK_TACTICS_LIST.map((tactic) => {
                    const isSelected = selectedTactic === tactic.id;
                    const Icon = tactic.icon;
                    return (
                      <button
                        key={`ht-${tactic.id}`}
                        type="button"
                        onClick={() => handleTacticClick(tactic.id)}
                        className={`py-1.5 px-1 rounded-xl text-[9.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-black ring-1 ring-amber-400/50'
                            : 'bg-slate-950/90 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{tactic.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Team Talk in Locker Room */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-300 block">حديث وتوجيه المدرب للاعبين:</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'motivate', icon: '🔥', label: 'تحفيز وهجوم' },
                      { id: 'focus', icon: '🧠', label: 'تركيز دفاعي' },
                      { id: 'calm', icon: '🧘', label: 'هدوء وتمرير' },
                    ].map((talk) => (
                      <button
                        key={talk.id}
                        type="button"
                        onClick={() => setHalfTimeTalk(talk.id as any)}
                        className={`py-1 px-1 rounded-xl text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border ${
                          halfTimeTalk === talk.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black ring-1 ring-emerald-500/40'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{talk.icon}</span>
                        <span className="truncate">{talk.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Second Half Action Button */}
              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={handleStartSecondHalfClick}
                  className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-300/40"
                >
                  <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                  <span>بدء الشوط الثاني ▶</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL-TIME CENTER SCREEN (شاشة نهاية المباراة في منتصف الملعب - تأكيد النتيجة والانتقال) */}
        {isFullTimeFinished && (
          <div className="absolute inset-0 z-35 flex items-center justify-center p-2 sm:p-3 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-full max-w-[325px] sm:max-w-[360px] bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 rounded-3xl border-2 border-emerald-400/90 shadow-[0_0_40px_rgba(16,185,129,0.35)] p-3.5 sm:p-4 text-center flex flex-col items-center gap-2.5">
              {/* Top Badge: انتهاء المباراة بالكامل */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-[11px] font-black shadow">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>صافرة نهاية المباراة</span>
                <span className="font-mono bg-slate-950 text-emerald-300 px-1.5 py-0.2 rounded text-[10px]">
                  FT 90'
                </span>
              </div>

              {/* Result Status Strip */}
              {userResultType && (() => {
                const effectiveIsCup = isCupMatch || (homePenalties !== undefined && awayPenalties !== undefined);
                const hasShootout = homePenalties !== undefined && awayPenalties !== undefined;
                const isShootoutWin = hasShootout ? (userResultType === 'win' || (homePenalties !== awayPenalties && (homePenalties > awayPenalties))) : userResultType === 'win';
                const isEffectiveWin = effectiveIsCup ? (hasShootout ? (userResultType === 'win' || isShootoutWin) : userResultType === 'win') : userResultType === 'win';
                const isEffectiveDraw = !effectiveIsCup && userResultType === 'draw';
                return (
                  <div
                    className={`w-full py-1.5 px-3 rounded-xl text-center text-xs font-black flex items-center justify-center gap-1.5 border ${
                      isEffectiveWin
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isEffectiveDraw
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {effectiveIsCup ? (
                      hasShootout ? (
                        isEffectiveWin ? (
                          <>
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span>🎉 فوز ملحمي وتأهل بركلات الترجيح ({homePenalties} - {awayPenalties}) لمواصلة المشوار!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            <span>😔 خسارة بركلات الترجيح ({homePenalties} - {awayPenalties}) وتوديع مسابقة الكأس</span>
                          </>
                        )
                      ) : userResultType === 'win' ? (
                        <>
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>🎉 فوز رائع وتأهل مستحق في مسابقة الكأس!</span>
                        </>
                      ) : userResultType === 'loss' ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-400" />
                          <span>😔 خسارة وتوديع مسابقة الكأس.. حظ أوفر!</span>
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4 text-amber-400" />
                          <span>⚖️ نهاية الوقت الأصلي والاحتكام لركلات الترجيح لحسم التأهل!</span>
                        </>
                      )
                    ) : userResultType === 'win' ? (
                      <>
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>🎉 فوز رائع ومستحق! نقاط الانتصار أضيفت لرصيدك</span>
                      </>
                    ) : userResultType === 'draw' ? (
                      <>
                        <Award className="w-4 h-4 text-amber-300" />
                        <span>🤝 تعادل ونقطة إضافية في رصيد الدوري بعد مواجهة حماسية!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>😔 هزيمة مؤسفة.. حان وقت التعويض في الجولة القادمة!</span>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Final Score Summary */}
              <div className="w-full py-2 px-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center gap-1.5 shadow-inner">
                <div className="w-full flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-white truncate max-w-[100px]">
                    {homeClubName}
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-slate-900 border border-emerald-400/40 text-emerald-300 font-mono font-black text-base sm:text-lg">
                    <span>{homeScore}</span>
                    <span className="text-slate-500 text-xs">-</span>
                    <span>{awayScore}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-black text-white truncate max-w-[100px]">
                    {awayClubName}
                  </span>
                </div>
                {homePenalties !== undefined && awayPenalties !== undefined && (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-mono font-black text-amber-300">
                    <span>🎯 ركلات الترجيح:</span>
                    <span>({homePenalties} - {awayPenalties})</span>
                  </div>
                )}
              </div>

              {/* Match Final Stats */}
              <div className="w-full flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>الاستحواذ: <strong className="text-emerald-400 font-mono">%{homePossession}</strong></span>
                <span className="text-slate-500 font-bold">النتيجة النهائية</span>
                <span>الاستحواذ: <strong className="text-blue-400 font-mono">%{awayPossession}</strong></span>
              </div>

              {/* Action Button: Confirm Result & Advance directly from the pitch */}
              <div className="w-full pt-1.5">
                {onFinishMatch ? (
                  <button
                    id="pitch_finish_match_btn"
                    type="button"
                    disabled={isSimulationRunning}
                    onClick={handleFinishMatchClick}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-300/40 disabled:opacity-60"
                  >
                    <span>
                      {isSimulationRunning
                        ? 'جارٍ حفظ النتيجة والانتقال...'
                        : finishButtonLabel || 'تأكيد النتيجة والانتقال للجولة التالية'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-950 stroke-[3]" />
                  </button>
                ) : (
                  <div className="py-2 px-3 rounded-xl bg-slate-950/80 text-slate-300 text-xs font-bold border border-slate-800">
                    انتهت أحداث المواجهة بالكامل
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. COACH CONTROL PANEL (لوحة تحكم وتوجيهات المدرب - دكة البدلاء) */}
      <div className="relative z-10 mt-2.5 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] sm:text-xs font-black text-slate-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>لوحة تحكم وتوجيهات المدرب (دكة البدلاء)</span>
          </span>
          <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
            التكتيك الحالي: {QUICK_TACTICS_LIST.find((t) => t.id === selectedTactic)?.label || 'متوازن'}
          </span>
        </div>

        {/* Quick Tactic Action Buttons */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {QUICK_TACTICS_LIST.map((tactic) => {
            const Icon = tactic.icon;
            const isSelected = selectedTactic === tactic.id;
            return (
              <button
                key={tactic.id}
                type="button"
                onClick={() => handleTacticClick(tactic.id)}
                className={`py-1.5 sm:py-2 px-1 sm:px-2 rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer border shadow-sm ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black ring-1 ring-emerald-500/40'
                    : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={tactic.label}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : tactic.color}`} />
                <span className="truncate">{tactic.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
