import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { FormationType, Player, TacticalMentality, PassingStyle, PressingIntensity, TempoSpeed, TacticalStyle, TeamTactics } from '../types/game';
import { validateSquadLineup } from '../utils/squadValidator';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
import {
  Sliders,
  Sparkles,
  Shield,
  Zap,
  Target,
  Crown,
  ChevronDown,
  Activity,
  Award,
  Users,
  Check,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Layers,
  Compass,
} from 'lucide-react';

interface TacticsTabProps {
  onSelectPlayer: (player: Player) => void;
}

// Position coordinates on a 100x100 virtual pitch for each formation
const FORMATION_SLOTS: Record<FormationType, { pos: string; top: number; left: number }[]> = {
  '4-3-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 52, left: 50 },
    { pos: 'CM', top: 44, left: 32 },
    { pos: 'CM', top: 44, left: 68 },
    { pos: 'RW', top: 22, left: 20 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 22, left: 80 },
  ],
  '4-4-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'RM', top: 46, left: 18 },
    { pos: 'CM', top: 48, left: 39 },
    { pos: 'CM', top: 48, left: 61 },
    { pos: 'LM', top: 46, left: 82 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '4-2-3-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 54, left: 36 },
    { pos: 'CDM', top: 54, left: 64 },
    { pos: 'RAM', top: 34, left: 20 },
    { pos: 'CAM', top: 32, left: 50 },
    { pos: 'LAM', top: 34, left: 80 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '3-5-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'RWB', top: 48, left: 12 },
    { pos: 'CM', top: 50, left: 34 },
    { pos: 'CDM', top: 54, left: 50 },
    { pos: 'CM', top: 50, left: 66 },
    { pos: 'LWB', top: 48, left: 88 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '5-3-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RWB', top: 68, left: 12 },
    { pos: 'CB', top: 74, left: 30 },
    { pos: 'CB', top: 75, left: 50 },
    { pos: 'CB', top: 74, left: 70 },
    { pos: 'LWB', top: 68, left: 88 },
    { pos: 'CM', top: 46, left: 30 },
    { pos: 'CM', top: 48, left: 50 },
    { pos: 'CM', top: 46, left: 70 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '4-1-4-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'RM', top: 38, left: 18 },
    { pos: 'CM', top: 40, left: 39 },
    { pos: 'CM', top: 40, left: 61 },
    { pos: 'LM', top: 38, left: 82 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '3-4-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'LM', top: 48, left: 15 },
    { pos: 'CM', top: 50, left: 38 },
    { pos: 'CM', top: 50, left: 62 },
    { pos: 'RM', top: 48, left: 85 },
    { pos: 'LW', top: 22, left: 20 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'RW', top: 22, left: 80 },
  ],
  '4-5-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'RM', top: 44, left: 15 },
    { pos: 'CM', top: 46, left: 33 },
    { pos: 'CDM', top: 54, left: 50 },
    { pos: 'CM', top: 46, left: 67 },
    { pos: 'LM', top: 44, left: 85 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '4-1-2-1-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'CM', top: 44, left: 30 },
    { pos: 'CM', top: 44, left: 70 },
    { pos: 'CAM', top: 32, left: 50 },
    { pos: 'ST', top: 16, left: 36 },
    { pos: 'ST', top: 16, left: 64 },
  ],
  '5-4-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RWB', top: 68, left: 12 },
    { pos: 'CB', top: 74, left: 30 },
    { pos: 'CB', top: 75, left: 50 },
    { pos: 'CB', top: 74, left: 70 },
    { pos: 'LWB', top: 68, left: 88 },
    { pos: 'RM', top: 44, left: 18 },
    { pos: 'CM', top: 46, left: 39 },
    { pos: 'CM', top: 46, left: 61 },
    { pos: 'LM', top: 44, left: 82 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '4-2-4': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CM', top: 48, left: 38 },
    { pos: 'CM', top: 48, left: 62 },
    { pos: 'RW', top: 22, left: 15 },
    { pos: 'ST', top: 16, left: 38 },
    { pos: 'ST', top: 16, left: 62 },
    { pos: 'LW', top: 22, left: 85 },
  ],
  '4-3-2-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CM', top: 50, left: 28 },
    { pos: 'CDM', top: 54, left: 50 },
    { pos: 'CM', top: 50, left: 72 },
    { pos: 'CAM', top: 32, left: 35 },
    { pos: 'CAM', top: 32, left: 65 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '4-2-2-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 56, left: 36 },
    { pos: 'CDM', top: 56, left: 64 },
    { pos: 'CAM', top: 36, left: 25 },
    { pos: 'CAM', top: 36, left: 75 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '4-3-1-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CM', top: 52, left: 28 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'CM', top: 52, left: 72 },
    { pos: 'CAM', top: 34, left: 50 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '3-4-2-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'LWB', top: 50, left: 12 },
    { pos: 'CM', top: 52, left: 38 },
    { pos: 'CM', top: 52, left: 62 },
    { pos: 'RWB', top: 50, left: 88 },
    { pos: 'CAM', top: 32, left: 34 },
    { pos: 'CAM', top: 32, left: 66 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '3-4-1-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'LM', top: 48, left: 14 },
    { pos: 'CM', top: 52, left: 38 },
    { pos: 'CM', top: 52, left: 62 },
    { pos: 'RM', top: 48, left: 86 },
    { pos: 'CAM', top: 34, left: 50 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '5-2-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'LWB', top: 68, left: 12 },
    { pos: 'CB', top: 74, left: 30 },
    { pos: 'CB', top: 75, left: 50 },
    { pos: 'CB', top: 74, left: 70 },
    { pos: 'RWB', top: 68, left: 88 },
    { pos: 'CM', top: 48, left: 38 },
    { pos: 'CM', top: 48, left: 62 },
    { pos: 'LW', top: 22, left: 20 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'RW', top: 22, left: 80 },
  ],
  '4-1-3-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'LB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'RB', top: 70, left: 82 },
    { pos: 'CDM', top: 58, left: 50 },
    { pos: 'LM', top: 40, left: 20 },
    { pos: 'CAM', top: 36, left: 50 },
    { pos: 'RM', top: 40, left: 80 },
    { pos: 'ST', top: 18, left: 36 },
    { pos: 'ST', top: 18, left: 64 },
  ],
  '3-3-3-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'LWB', top: 54, left: 18 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'RWB', top: 54, left: 82 },
    { pos: 'LAM', top: 34, left: 25 },
    { pos: 'CAM', top: 32, left: 50 },
    { pos: 'RAM', top: 34, left: 75 },
    { pos: 'ST', top: 16, left: 50 },
  ],
};

export const TacticsTab: React.FC<TacticsTabProps> = ({ onSelectPlayer }) => {
  const {
    userClub,
    manager,
    updateTactics,
    setFormation,
    swapPlayers,
    setCaptainAndSetPieces,
    updateStartingLineup,
  } = useGame();

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedPlayerForSwap, setSelectedPlayerForSwap] = useState<{
    id: string;
    name: string;
    position: string;
    overall: number;
    role: 'starter' | 'bench' | 'reserve';
  } | null>(null);
  const [benchFilter, setBenchFilter] = useState<'all' | 'bench' | 'reserves'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'pitch' | 'instructions' | 'roles'>('pitch');
  const [notification, setNotification] = useState<string | null>(null);

  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          📋
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا يوجد لديك خطة تكتيكية أو تشكيل أساسي لتعديله. اختر نادياً من الشواغر التدريبية في تبويب المسيرة لبدء قيادته فنياً!
        </p>
      </div>
    );
  }

  const rawTactics = userClub.tactics || ({} as any);
  const allPlayers = (userClub.players || []).filter(Boolean);
  const safeStartingIds = Array.isArray(rawTactics.startingPlayerIds) && rawTactics.startingPlayerIds.length > 0
    ? rawTactics.startingPlayerIds
    : allPlayers.slice(0, 11).map(p => p?.id).filter(Boolean);
  const safeBenchIds = Array.isArray(rawTactics.benchPlayerIds)
    ? rawTactics.benchPlayerIds
    : allPlayers.slice(11, 18).map(p => p?.id).filter(Boolean);

  const tactics: TeamTactics = {
    formation: rawTactics.formation || '4-3-3',
    mentality: rawTactics.mentality || 'balanced',
    passingStyle: rawTactics.passingStyle || 'short',
    pressingIntensity: rawTactics.pressingIntensity || 'balanced',
    tempo: rawTactics.tempo || 'balanced',
    startingPlayerIds: safeStartingIds,
    benchPlayerIds: safeBenchIds,
    captainId: rawTactics.captainId || allPlayers[0]?.id || '',
    penaltyTakerId: rawTactics.penaltyTakerId || allPlayers[0]?.id || '',
    freeKickTakerId: rawTactics.freeKickTakerId || allPlayers[0]?.id || '',
    cornerTakerId: rawTactics.cornerTakerId || allPlayers[0]?.id || '',
  };

  const startingPlayers = (tactics.startingPlayerIds || []).map(id => allPlayers.find(p => p && p.id === id)).filter(Boolean) as Player[];
  const benchPlayers = (tactics.benchPlayerIds || []).map(id => allPlayers.find(p => p && p.id === id)).filter(Boolean) as Player[];
  const reservePlayers = allPlayers.filter(p => p && p.id && !tactics.startingPlayerIds.includes(p.id) && !tactics.benchPlayerIds.includes(p.id));

  const currentSlots = FORMATION_SLOTS[tactics.formation] || FORMATION_SLOTS['4-3-3'];
  const validationResult = validateSquadLineup(userClub);

  const handlePlayerSwapSelection = (
    player: Player,
    role: 'starter' | 'bench' | 'reserve',
    slotIdx?: number
  ) => {
    if (!selectedPlayerForSwap) {
      // Pick first player
      setSelectedPlayerForSwap({
        id: player.id,
        name: player.name,
        position: player.position,
        overall: player.overallRating,
        role,
      });
      if (typeof slotIdx === 'number') {
        setSelectedSlotIndex(slotIdx);
      }
    } else {
      // If clicking same player, cancel selection
      if (selectedPlayerForSwap.id === player.id) {
        setSelectedPlayerForSwap(null);
        setSelectedSlotIndex(null);
        return;
      }

      // Execute Swap
      swapPlayers(selectedPlayerForSwap.id, player.id);
      setNotification(`تم تبديل ${selectedPlayerForSwap.name} مع ${player.name} بنجاح! 🔄`);
      setSelectedPlayerForSwap(null);
      setSelectedSlotIndex(null);
      setTimeout(() => setNotification(null), 3500);
    }
  };

  const handleMoveReserveToBench = (reservePlayer: Player) => {
    if (benchPlayers.length < 7) {
      // Just add to bench
      const nextBench = [...tactics.benchPlayerIds, reservePlayer.id];
      updateStartingLineup(tactics.startingPlayerIds, nextBench);
      setNotification(`تمت إضافة ${reservePlayer.name} إلى دكة البدلاء بنجاح! 🪑`);
    } else {
      // Swap with the last bench player
      const targetBenchPlayer = benchPlayers[benchPlayers.length - 1];
      if (targetBenchPlayer) {
        swapPlayers(targetBenchPlayer.id, reservePlayer.id);
        setNotification(`تم استبدال ${targetBenchPlayer.name} ونزول ${reservePlayer.name} في دكة البدلاء 🔄`);
      }
    }
    setTimeout(() => setNotification(null), 3500);
  };

  const handleMoveBenchToReserves = (benchPlayer: Player) => {
    if (reservePlayers.length > 0) {
      // Swap with first reserve player
      const targetReservePlayer = reservePlayers[0];
      swapPlayers(benchPlayer.id, targetReservePlayer.id);
      setNotification(`تم نقل ${benchPlayer.name} للاحتياط ودخول ${targetReservePlayer.name} للدكة 🔄`);
    } else {
      // Remove from bench
      const nextBench = tactics.benchPlayerIds.filter(id => id !== benchPlayer.id);
      updateStartingLineup(tactics.startingPlayerIds, nextBench);
      setNotification(`تم نقل ${benchPlayer.name} إلى قائمة الاحتياط.`);
    }
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAutoPickBest11 = () => {
    const squad = Array.isArray(userClub?.players) ? userClub.players : [];
    // Filter available players first (not injured, not suspended)
    const availablePlayers = squad.filter(p => !p.isInjured && (!p.suspensionMatches || p.suspensionMatches <= 0) && !p.isSuspended);
    const pool = availablePlayers.length >= 11 ? availablePlayers : squad;

    const slots = FORMATION_SLOTS[tactics.formation] || FORMATION_SLOTS['4-3-3'];
    const chosenPlayerIds: string[] = [];
    const best11: Player[] = [];

    // Slot-by-slot smart placement prioritizing fitness, energy and exact positional fit
    slots.forEach(slot => {
      const remainingCandidates = pool.filter(p => !chosenPlayerIds.includes(p.id));
      if (remainingCandidates.length === 0) return;

      const scored = remainingCandidates.map(player => {
        const fitness = player.fitness ?? 100;
        const morale = player.morale ?? 75;
        
        // 1. Fitness & Energy weight (50%) + Overall Rating (40%) + Morale (10%)
        let score = (player.overallRating * 0.40) + (fitness * 0.50) + (morale * 0.10);

        // 2. Penalize severe fatigue heavily so tired stars sit on the bench
        if (fitness < 65) {
          score -= (65 - fitness) * 2.0;
        }

        // 3. Exact position match bonus
        if (player.position.toUpperCase() === slot.pos.toUpperCase()) {
          score += 35;
        } else {
          // Category match
          const slotCategory = (slot.pos === 'GK') ? 'GK'
            : ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(slot.pos) ? 'DEF'
            : ['CDM', 'CM', 'CAM', 'RM', 'LM', 'RAM', 'LAM'].includes(slot.pos) ? 'MID'
            : 'FWD';

          if (player.positionCategory === slotCategory) {
            score += 15;
          } else {
            // Out of position severe penalty
            score -= 45;
          }
        }

        return { player, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const topPick = scored[0]?.player;
      if (topPick) {
        chosenPlayerIds.push(topPick.id);
        best11.push(topPick);
      }
    });

    // Fallback if any slots couldn't be filled
    if (best11.length < 11) {
      const fallbackRemaining = squad.filter(p => !chosenPlayerIds.includes(p.id))
        .sort((a, b) => ((b.fitness || 100) * 0.6 + b.overallRating * 0.4) - ((a.fitness || 100) * 0.6 + a.overallRating * 0.4));
      while (best11.length < 11 && fallbackRemaining.length > 0) {
        const p = fallbackRemaining.shift()!;
        chosenPlayerIds.push(p.id);
        best11.push(p);
      }
    }

    const startingIds = best11.map(p => p.id);
    // Bench: select highest energy/fitness bench players covering positions
    const benchPool = squad.filter(p => !startingIds.includes(p.id))
      .sort((a, b) => ((b.fitness || 100) * 0.55 + b.overallRating * 0.45) - ((a.fitness || 100) * 0.55 + a.overallRating * 0.45));
    const benchIds = benchPool.slice(0, 7).map(p => p.id);

    updateStartingLineup(startingIds, benchIds);
    setNotification(`⚡ تم اختيار التشكيلة بذكاء: إعطاء الأولوية للجاهزية واللياقة البدنية والمراكز المتوافقة مع خطة ${tactics.formation}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      
      {/* Tactics Header Navigation */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">الخطة والتكتيك الميداني</h2>
          </div>

          <button
            onClick={handleAutoPickBest11}
            className="flex items-center gap-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>التشكيل الأفضل</span>
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('pitch')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'pitch'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الملعب والتشكيل (11)
          </button>
          <button
            onClick={() => setActiveSubTab('instructions')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'instructions'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            النهج والتعليمات
          </button>
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'roles'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            شارة القيادة والكرات الثابتة
          </button>
        </div>
      </div>

      {/* Lineup Validation Issue Alert Banner */}
      {!validationResult.isValid && (
        <div className="bg-red-950/70 border-2 border-red-500 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-900/80 border border-red-500 text-red-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-red-100">
                🚨 تنبيه: يوجد لاعبون غير مؤهلين (مصابون أو موقوفون) في التشكيل الأساسي!
              </h4>
              <p className="text-[11px] text-red-300 mt-0.5">
                لن تتمكن من الانتقال لليوم التالي أو خوض المباراة حتى استبدالهم: {validationResult.invalidStarters.map(s => s.player.name).join('، ')}
              </p>
            </div>
          </div>

          <button
            onClick={handleAutoPickBest11}
            className="self-end sm:self-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>تسوية التشكيل تلقائياً ⚡</span>
          </button>
        </div>
      )}

      {notification && (
        <div className="bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold p-3 rounded-2xl flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* VIEW 1: Interactive Pitch */}
      {activeSubTab === 'pitch' && (
        <div className="space-y-4">
          
          {/* Formation Selector Bar */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="text-xs text-slate-400 font-medium">الرسم التكتيكي:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3', '4-5-1', '4-1-2-1-2', '5-4-1', '4-2-4', '4-3-2-1', '4-2-2-2', '4-3-1-2', '3-4-2-1', '3-4-1-2', '5-2-3', '4-1-3-2', '3-3-3-1'] as FormationType[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormation(fmt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                    tactics.formation === fmt
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Football Field Visualizer */}
          <div className="relative w-full aspect-[4/5] sm:aspect-[4/4.5] max-w-lg mx-auto bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900 rounded-3xl border-4 border-emerald-950 shadow-2xl overflow-hidden p-3 select-none">
            
            {/* Field Grass Stripes Texture */}
            <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(0deg,transparent,transparent_30px,rgba(0,0,0,0.4)_30px,rgba(0,0,0,0.4)_60px)]" />

            {/* Field Markings */}
            <div className="absolute inset-3 border-2 border-white/30 rounded-2xl pointer-events-none">
              {/* Half-way Line & Center Circle */}
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/30 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/40 rounded-full -translate-x-1/2 -translate-y-1/2" />

              {/* Penalty Boxes */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-white/30 rounded-b-xl" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-white/30 rounded-t-xl" />

              {/* Goal Boxes */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-b-2 border-x-2 border-white/30" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-t-2 border-x-2 border-white/30" />
            </div>

            {/* Starting 11 Player Nodes on Pitch */}
            {currentSlots.map((slot, index) => {
              const player = startingPlayers[index];
              const isSelected = selectedPlayerForSwap?.id === player?.id || selectedSlotIndex === index;
              const isPlayerInjured = !!player?.isInjured;
              const isPlayerSuspended = !!(player?.isSuspended || (player?.suspensionMatches && player.suspensionMatches > 0));
              const isPlayerIneligible = isPlayerInjured || isPlayerSuspended;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (player) {
                      handlePlayerSwapSelection(player, 'starter', index);
                    }
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform active:scale-90 z-10 ${
                    isSelected ? 'scale-125 z-20' : 'hover:scale-110'
                  }`}
                  style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                >
                  {/* Jersey / Circle */}
                  <div 
                    className={`relative w-10 h-10 rounded-full flex flex-col items-center justify-center font-bold text-white shadow-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-amber-300 ring-4 ring-amber-400/80 bg-amber-600 scale-110 animate-pulse' 
                        : isPlayerIneligible
                        ? 'border-red-500 bg-red-950 ring-2 ring-red-500'
                        : player?.positionCategory === 'GK'
                        ? 'border-amber-300 bg-amber-800'
                        : 'border-white/80 bg-slate-900'
                    }`}
                  >
                    <span className="text-xs leading-none font-mono">
                      {player ? player.overallRating : slot.pos}
                    </span>
                    <span className="text-[7px] text-amber-300 font-bold leading-none mt-0.5">
                      {player?.number ? `#${player.number}` : slot.pos}
                    </span>

                    {/* Ineligibility Icon Badge */}
                    {isPlayerInjured && (
                      <span className="absolute -top-2 -left-2 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center border border-white shadow">
                        🚑
                      </span>
                    )}
                    {isPlayerSuspended && !isPlayerInjured && (
                      <span className="absolute -top-2 -left-2 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center border border-white shadow">
                        🟥
                      </span>
                    )}

                    {/* Captain C Badge */}
                    {player && tactics.captainId === player.id && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center border border-white">
                        C
                      </span>
                    )}
                  </div>

                  {/* Player Name Pill */}
                  <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold mt-1 truncate max-w-[84px] shadow-md text-center ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black border border-amber-300'
                      : isPlayerIneligible
                      ? 'bg-red-950 text-red-200 border border-red-600 font-bold'
                      : 'bg-slate-950/90 text-white border border-slate-700/80'
                  }`}>
                    {player ? player.name.split(' ')[0] : 'شاغر'}
                  </div>

                  {/* Fitness Battery Dot */}
                  {player && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isPlayerIneligible ? 'bg-red-500' : player.fitness > 80 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-[8px] text-white/80 font-mono">{player.fitness}%</span>
                    </div>
                  )}
                </div>
              );
            })}

          </div>

          {/* Active Swap Banner if player selected */}
          {selectedPlayerForSwap && (
            <div className="bg-amber-950/90 border-2 border-amber-400/90 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-xl">
              <div className="flex items-center gap-2.5 text-xs text-white">
                <span className="text-lg animate-bounce">🔄</span>
                <div>
                  <span className="text-amber-300 font-bold">اللاعب المحدد للتبديل: </span>
                  <strong className="text-white font-black">{selectedPlayerForSwap.name}</strong> 
                  <span className="text-slate-300 mr-1.5">
                    ({selectedPlayerForSwap.position} - طاقة {selectedPlayerForSwap.overall} - {selectedPlayerForSwap.role === 'starter' ? 'أساسي' : selectedPlayerForSwap.role === 'bench' ? 'دكة البدلاء' : 'احتياطي'})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-200 font-medium hidden sm:inline">اضغط على أي لاعب آخر لإتمام التبديل</span>
                <button
                  onClick={() => {
                    setSelectedPlayerForSwap(null);
                    setSelectedSlotIndex(null);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 font-bold cursor-pointer"
                >
                  إلغاء التحديد ✕
                </button>
              </div>
            </div>
          )}

          {/* Bench & Reserve Swapper Sheet */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  دكة البدلاء وقائمة الاحتياط ({allPlayers.length - startingPlayers.length} لاعب)
                </h3>
              </div>

              {/* View Filters */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  onClick={() => setBenchFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    benchFilter === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({benchPlayers.length + reservePlayers.length})
                </button>
                <button
                  onClick={() => setBenchFilter('bench')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    benchFilter === 'bench' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🪑 دكة البدلاء ({benchPlayers.length}/7)
                </button>
                <button
                  onClick={() => setBenchFilter('reserves')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    benchFilter === 'reserves' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👥 الاحتياط ({reservePlayers.length})
                </button>
              </div>
            </div>

            {/* Players List with Swap Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {(benchFilter === 'all'
                ? [...benchPlayers, ...reservePlayers]
                : benchFilter === 'bench'
                ? benchPlayers
                : reservePlayers
              ).map((p) => {
                const isBench = benchPlayers.some(bp => bp.id === p.id);
                const role = isBench ? 'bench' : 'reserve';
                const isSelected = selectedPlayerForSwap?.id === p.id;
                const isPlayerInjured = !!p.isInjured;
                const isPlayerSuspended = !!(p.isSuspended || (p.suspensionMatches && p.suspensionMatches > 0));

                return (
                  <div
                    key={p.id}
                    className={`border p-3 rounded-2xl transition-all flex items-center justify-between gap-2 text-xs ${
                      isSelected
                        ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 text-white shadow-lg'
                        : isPlayerInjured || isPlayerSuspended
                        ? 'border-red-900/80 bg-red-950/20'
                        : isBench
                        ? 'border-blue-900/60 bg-blue-950/20 hover:border-blue-700'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                    }`}
                  >
                    <div
                      onClick={() => handlePlayerSwapSelection(p, role)}
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono border shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : isPlayerInjured || isPlayerSuspended
                          ? 'bg-red-950 border-red-700 text-red-300'
                          : isBench
                          ? 'bg-blue-900/80 border-blue-600 text-blue-200'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}>
                        {p.overallRating}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-white flex items-center gap-1.5 truncate">
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{p.number}</span>
                          {isPlayerInjured && <span title="مصاب">🚑</span>}
                          {isPlayerSuspended && <span title="موقوف">🟥</span>}
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getPositionBadgeClass(p.position)}`}>
                            {getPositionArabic(p.position)} ({p.position})
                          </span>
                          <span className="text-slate-400">
                            لياقة: <strong className={p.fitness > 75 ? 'text-emerald-400' : 'text-amber-400'}>{p.fitness}%</strong>
                          </span>
                          {isPlayerInjured && <span className="text-red-400 font-bold">({p.injuryType || 'إصابة'})</span>}
                          {isPlayerSuspended && <span className="text-red-400 font-bold">({p.suspensionMatches} مباريات إيقاف)</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for this player */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isBench ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveBenchToReserves(p);
                          }}
                          title="نقل للاحتياط"
                          className="px-2 py-1 bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 transition-all"
                        >
                          ⬇️ للاحتياط
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveReserveToBench(p);
                          }}
                          title="ترقية لدكة البدلاء"
                          className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/80 rounded-lg text-[10px] font-bold text-blue-200 transition-all"
                        >
                          ⬆️ للدكة
                        </button>
                      )}

                      <button
                        onClick={() => handlePlayerSwapSelection(p, role)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                        title="تبديل مع لاعب آخر"
                      >
                        🔄
                      </button>

                      <button
                        onClick={() => onSelectPlayer(p)}
                        className="p-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                        title="عرض بطاقة اللاعب"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: Tactical Instructions & Style */}
      {activeSubTab === 'instructions' && (
        <div className="space-y-4">
          
          {/* Tactical Style (طريقة وأسلوب اللعب) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>فلسفة وأسلوب اللعب الأساسي (Tactical Style):</span>
              </span>
              <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full font-bold">
                8 طرق لعب عالمية
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: 'tiki_taka',
                  label: 'تيكي تاكا واستحواذ شامل (Tiki-Taka)',
                  desc: 'تمريرات قصيرة مكثفة مع تدوير الكرة والسيطرة التامة على منتصف الملعب.',
                  icon: '🌀'
                },
                {
                  id: 'gegenpress',
                  label: 'ضغط عكسي عالي خانق (Gegenpressing)',
                  desc: 'افتكاك الكرة فور فقدانها في الثلث الهجومي برتم بدني عنيف.',
                  icon: '⚡'
                },
                {
                  id: 'direct_counter',
                  label: 'هجمات مرتدة سريعة وخاطفة (Counter Attack)',
                  desc: 'تراجع دفاعي منظم واستغلال المساحات الشاغرة بانطلاقات صاروخية.',
                  icon: '🚀'
                },
                {
                  id: 'wing_play',
                  label: 'لعب هجومي عبر الأطراف (Wing Play)',
                  desc: 'تحميل اللعب على الأجنحة والظهيرين وإرسال عرضيات متقنة للمهاجمين.',
                  icon: '🏹'
                },
                {
                  id: 'catenaccio',
                  label: 'كاتيناتشو دفاعي حديدي (Catenaccio)',
                  desc: 'تأمين دفاعي صارم وإغلاق تام لكافة المنافذ لإنهاء اللقاء بنظافة الشباك.',
                  icon: '🛡️'
                },
                {
                  id: 'possession_control',
                  label: 'التحكم بالرتم والاستحواذ الصبور (Control)',
                  desc: 'بناء متدرج من الخلف بدون تسرع والبحث عن الثغرات في دفاع المنافس.',
                  icon: '🎯'
                },
                {
                  id: 'long_ball',
                  label: 'كرات طولية مباشرة (Route One)',
                  desc: 'إرسال كرات ساقطة طويلة خلف المدافعين للمهاجم القوي لربح الكرات الثانية.',
                  icon: '✈️'
                },
                {
                  id: 'fluid_creative',
                  label: 'لامركزية وحرية إبداعية (Fluid / Free)',
                  desc: 'تبادل المراكز بحرية تامة وإعطاء صانعي الألعاب كامل الإبداع والارتجال.',
                  icon: '✨'
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateTactics({ ...tactics, tacticalStyle: opt.id as TacticalStyle })}
                  className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                    tactics.tacticalStyle === opt.id
                      ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{opt.label}</span>
                    <span className="text-base">{opt.icon}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mentality */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>العقلية والنهج التكتيكي العام (Mentality):</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: 'ultra_defensive', label: 'دفاع متكتل (أوتوبيس)', desc: 'تراجع شامل والاعتماد على الكرات الطويلة العشوائية' },
                { id: 'defensive', label: 'دفاع حذر ومرتدات', desc: 'تأمين الخط الخلفي واستغلال سرعة الأجنحة' },
                { id: 'balanced', label: 'توازن تكتيكي منضبط', desc: 'تحكم في وسط الملعب وموازنة الهجوم والدفاع' },
                { id: 'attacking', label: 'هجومي منظم وضاغط', desc: 'زيادة عددية في مناطق الخصم والبحث عن الأهداف' },
                { id: 'ultra_attacking', label: 'هجوم شامل كاسح', desc: 'اندفاع كامل لجميع الخطوط لتسجيل أهداف حاسمة' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateTactics({ ...tactics, mentality: opt.id as TacticalMentality })}
                  className={`p-3 rounded-2xl border text-right transition-all ${
                    tactics.mentality === opt.id
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Passing Style */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>أسلوب التمرير وبناء الهجمة (Passing Style):</span>
            </label>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { id: 'short', label: 'تمريرات قصيرة (تيكي تاكا)' },
                { id: 'direct', label: 'لعب مباشر وسريع' },
                { id: 'long_balls', label: 'كرات طولية وعالية' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateTactics({ ...tactics, passingStyle: opt.id as PassingStyle })}
                  className={`p-3 rounded-2xl border font-bold transition-all ${
                    tactics.passingStyle === opt.id
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pressing Intensity */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-red-400" />
              <span>كثافة الضغط والافتكاك (Pressing Intensity):</span>
            </label>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { id: 'high', label: 'ضغط عالي شرس' },
                { id: 'balanced', label: 'ضغط متوازن في الوسط' },
                { id: 'low', label: 'ارتداد وهدوء دفاعي' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => updateTactics({ ...tactics, pressingIntensity: opt.id as PressingIntensity })}
                  className={`p-3 rounded-2xl border font-bold transition-all ${
                    tactics.pressingIntensity === opt.id
                      ? 'bg-red-950 border-red-500 text-red-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tactical Advice & Synergy Insight for the Manager */}
          <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-3xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>التقرير التكتيكي الفني للمدرب (Tactical Briefing):</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                مؤشرات تفصيلية
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>🎯 نقطة القوة الأساسية:</span>
                </div>
                <div className="text-slate-300 leading-relaxed">
                  {(tactics.tacticalStyle as any) === 'counter_attack' || (tactics as any).style === 'counter_attack' || (tactics.tacticalStyle as any) === 'direct_counter'
                    ? 'المرتدات الخاطفة تباغت المنافسين الضاغطين وتصنع مساحات في الثلث الأخير خلف دفاعاتهم.'
                    : tactics.tacticalStyle === 'catenaccio' || (tactics as any).style === 'park_the_bus'
                    ? 'تكتل دفاعي حديدي يمنع تسديدات الخصم داخل المنطقة ويقلل تحويل الفرص لأهداف بنسبة كبيرة.'
                    : tactics.tacticalStyle === 'tiki_taka'
                    ? 'استحواذ مكثف على دائرة الوسط، يحد من خطورة هجمات الخصم ويصنع فرصاً نوعية بالصبر.'
                    : tactics.tacticalStyle === 'wing_play'
                    ? 'استغلال الأروقة والأطراف لإرسال عرضيات متقنة للمهاجمين، فعال جداً ضد الخطط الضيقة.'
                    : 'توازن منضبط يوزع الجهد على كافة خطوط الملعب ويمنع المفاجآت التكتيكية.'}
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>⚠️ التنبيه والجانب البدني:</span>
                </div>
                <div className="text-slate-300 leading-relaxed">
                  {tactics.pressingIntensity === 'high' || tactics.pressingIntensity === 'gegenpress'
                    ? 'الضغط العالي يستنزف اللياقة بسرعة! احرص على إراحة اللاعبين المتعبين بين الدقيقتين 60 و75.'
                    : tactics.mentality === 'ultra_attacking'
                    ? 'الاندفاع الهجومي الكاسح يترك مساحات شاسعة خلف الدفاع، احذر من مرتدات الخصم السريعة.'
                    : tactics.mentality === 'defensive' || tactics.mentality === 'ultra_defensive'
                    ? 'التراجع الدفاعي يقلل محاولاتك الهجومية، ستحتاج لاستغلال الكرات الثابتة أو انفراد حاسم.'
                    : 'حالة بدنية وتكتيكية متزنة تساعدك على قراءة أحداث المباراة والتدخل في الوقت المناسب.'}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VIEW 3: Roles & Set Pieces */}
      {activeSubTab === 'roles' && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>تحديد قائد الفريق ومنفذي الكرات الثابتة</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Captain */}
            <div className="space-y-1">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>قائد الفريق (Captain):</span>
              </label>
              <select
                value={tactics.captainId}
                onChange={(e) => setCaptainAndSetPieces({ captainId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-amber-400"
              >
                {allPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position}) - خبرة {p.age} سنة - تقييم {p.overallRating}
                  </option>
                ))}
              </select>
            </div>

            {/* Penalty Taker */}
            <div className="space-y-1">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-red-400" />
                <span>مسدد ضربات الجزاء الأول:</span>
              </label>
              <select
                value={tactics.penaltyTakerId}
                onChange={(e) => setCaptainAndSetPieces({ penaltyTakerId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-red-400"
              >
                {allPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position}) - تسديد {p.attributes.shooting}
                  </option>
                ))}
              </select>
            </div>

            {/* Free Kicks */}
            <div className="space-y-1">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>مسدد الضربات الحرة المباشرة:</span>
              </label>
              <select
                value={tactics.freeKickTakerId}
                onChange={(e) => setCaptainAndSetPieces({ freeKickTakerId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-400"
              >
                {allPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position}) - تمرير {p.attributes.passing} - تسديد {p.attributes.shooting}
                  </option>
                ))}
              </select>
            </div>

            {/* Corners */}
            <div className="space-y-1">
              <label className="text-slate-300 font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-400" />
                <span>منفذ الضربات الركنية:</span>
              </label>
              <select
                value={tactics.cornerTakerId}
                onChange={(e) => setCaptainAndSetPieces({ cornerTakerId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-400"
              >
                {allPlayers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.position}) - تمرير وعرضيات {p.attributes.passing}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
