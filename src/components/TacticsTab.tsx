import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { FormationType, Player, TacticalMentality, PassingStyle, PressingIntensity, TempoSpeed, TacticalStyle, TeamTactics } from '../types/game';
import { validateSquadLineup } from '../utils/squadValidator';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
import { ALL_FORMATIONS, ALL_TACTICAL_STYLES } from '../utils/tacticalKnowledgeEngine';
import { getLicenseRank } from '../utils/careerProgressionEngine';
import { PlayerKit3DModel } from './models/Football3DModels';
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
  Lock,
  Unlock,
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
  '3-4-3-diamond': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'LM', top: 46, left: 15 },
    { pos: 'RM', top: 46, left: 85 },
    { pos: 'CAM', top: 36, left: 50 },
    { pos: 'LW', top: 20, left: 20 },
    { pos: 'ST', top: 15, left: 50 },
    { pos: 'RW', top: 20, left: 80 },
  ],
  '4-4-1-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'RM', top: 46, left: 18 },
    { pos: 'CM', top: 48, left: 39 },
    { pos: 'CM', top: 48, left: 61 },
    { pos: 'LM', top: 46, left: 82 },
    { pos: 'CAM', top: 30, left: 50 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '4-2-3-1-asym': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 56, left: 38 },
    { pos: 'CM', top: 52, left: 62 },
    { pos: 'CAM', top: 36, left: 50 },
    { pos: 'RW', top: 22, left: 18 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 28, left: 82 },
  ],
  '3-2-4-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'CDM', top: 56, left: 36 },
    { pos: 'CDM', top: 56, left: 64 },
    { pos: 'LM', top: 38, left: 14 },
    { pos: 'CAM', top: 36, left: 38 },
    { pos: 'CAM', top: 36, left: 62 },
    { pos: 'RM', top: 38, left: 86 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '3-2-2-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 72, left: 25 },
    { pos: 'CB', top: 74, left: 50 },
    { pos: 'CB', top: 72, left: 75 },
    { pos: 'CDM', top: 58, left: 38 },
    { pos: 'CDM', top: 58, left: 62 },
    { pos: 'CAM', top: 38, left: 38 },
    { pos: 'CAM', top: 38, left: 62 },
    { pos: 'RW', top: 22, left: 18 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 22, left: 82 },
  ],
  '2-3-5': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 74, left: 38 },
    { pos: 'CB', top: 74, left: 62 },
    { pos: 'RWB', top: 56, left: 20 },
    { pos: 'CDM', top: 54, left: 50 },
    { pos: 'LWB', top: 56, left: 80 },
    { pos: 'RW', top: 20, left: 14 },
    { pos: 'CAM', top: 22, left: 32 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'CAM', top: 22, left: 68 },
    { pos: 'LW', top: 20, left: 86 },
  ],
  '4-2-1-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 70, left: 18 },
    { pos: 'CB', top: 72, left: 39 },
    { pos: 'CB', top: 72, left: 61 },
    { pos: 'LB', top: 70, left: 82 },
    { pos: 'CDM', top: 54, left: 36 },
    { pos: 'CDM', top: 54, left: 64 },
    { pos: 'CAM', top: 36, left: 50 },
    { pos: 'RW', top: 22, left: 20 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 22, left: 80 },
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
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-3xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>الرسم التكتيكي (26 تشكيل عالمي):</span>
              </span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full font-bold">
                رخصتك: {manager.license}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {Object.values(ALL_FORMATIONS).map((fmt) => {
                const isUnlocked = getLicenseRank(manager.license) >= getLicenseRank(fmt.minLicense);
                const isSelected = tactics.formation === fmt.id;

                return (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      if (isUnlocked) {
                        setFormation(fmt.id);
                        setNotification(`تم تطبيق تشكيل ${fmt.nameArabic}`);
                      } else {
                        setNotification(`🔒 خطة ${fmt.nameArabic} تتطلب رخصة تدريب (${fmt.minLicense}) على الأقل! رخصتك الحالية (${manager.license}).`);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-md scale-105 ring-2 ring-amber-400'
                        : isUnlocked
                        ? 'bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700'
                        : 'bg-slate-950/90 text-slate-500 border border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {!isUnlocked && <Lock className="w-3 h-3 text-slate-500" />}
                    <span>{fmt.id}</span>
                    {!isUnlocked && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-slate-900 text-amber-500/80 font-bold">
                        {fmt.minLicense}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Formation Info Card */}
            {ALL_FORMATIONS[tactics.formation] && (
              <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-300 text-xs">
                      {ALL_FORMATIONS[tactics.formation].nameArabic}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      الرخصة المطلوبة: {ALL_FORMATIONS[tactics.formation].minLicense}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {ALL_FORMATIONS[tactics.formation].descriptionArabic}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    {ALL_FORMATIONS[tactics.formation].strengthsArabic}
                  </span>
                </div>
              </div>
            )}
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

            {/* Starting 11 3D Kit Figurines on Pitch */}
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
                  {/* 3D Sculpted Kit Figurine */}
                  <div className="relative">
                    <PlayerKit3DModel
                      number={player?.number || index + 1}
                      position={slot.pos}
                      overall={player?.overallRating}
                      primaryColor={isPlayerIneligible ? '#991b1b' : (userClub.primaryColor || '#10b981')}
                      secondaryColor={userClub.secondaryColor || '#ffffff'}
                      isGK={slot.pos === 'GK' || player?.positionCategory === 'GK'}
                      isCaptain={Boolean(player && tactics.captainId === player.id)}
                      isSelected={isSelected}
                      size="sm"
                    />

                    {/* Ineligibility Icon Badge */}
                    {isPlayerInjured && (
                      <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center border border-white shadow z-30">
                        🚑
                      </span>
                    )}
                    {isPlayerSuspended && !isPlayerInjured && (
                      <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-600 text-white font-black text-[9px] rounded-full flex items-center justify-center border border-white shadow z-30">
                        🟥
                      </span>
                    )}
                  </div>

                  {/* Player Name & Overall Rating Pill */}
                  <div className={`px-2 py-0.5 rounded-lg text-[10px] font-bold -mt-0.5 shadow-md text-center flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-black border border-amber-300'
                      : isPlayerIneligible
                      ? 'bg-red-950 text-red-200 border border-red-600 font-bold'
                      : 'bg-slate-950/95 text-white border border-slate-700/80'
                  }`}>
                    <span className="truncate max-w-[62px]">{player ? player.name.split(' ')[0] : 'شاغر'}</span>
                    {player && (
                      <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-black ${
                        player.overallRating >= 80
                          ? 'bg-amber-400 text-slate-950'
                          : player.overallRating >= 70
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-700 text-slate-200'
                      }`} title={`طاقة اللاعب: ${player.overallRating}`}>
                        {player.overallRating}
                      </span>
                    )}
                  </div>

                  {/* Position Badge & Fitness Battery Dot */}
                  {player && (
                    <div className="flex items-center gap-1 mt-0.5 bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-white/10 shadow-sm">
                      <span className="text-[8px] font-bold text-amber-300 font-mono">{slot.pos}</span>
                      <span className="text-[8px] text-slate-500">•</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isPlayerIneligible ? 'bg-red-500' : player.fitness > 80 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-[8px] text-white/90 font-mono">{player.fitness}%</span>
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
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] text-slate-400 font-bold leading-none mb-0.5">طاقة</span>
                        <div className={`w-9 h-8 rounded-xl flex items-center justify-center font-black font-mono text-xs border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-300'
                            : isPlayerInjured || isPlayerSuspended
                            ? 'bg-red-950 border-red-700 text-red-300'
                            : p.overallRating >= 80
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : p.overallRating >= 70
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : isBench
                            ? 'bg-blue-900/80 border-blue-600 text-blue-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`} title={`طاقة اللاعب: ${p.overallRating}`}>
                          {p.overallRating}
                        </div>
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
          
          {/* Tactical Style (طريقة وأسلوب اللعب وفلسفة المدرب) */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>فلسفات وأساليب اللعب العالمية (Tactical Philosophies):</span>
              </label>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full font-bold">
                رخصتك التدريبية: {manager.license}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(ALL_TACTICAL_STYLES).map(style => {
                const isUnlocked = getLicenseRank(manager.license) >= getLicenseRank(style.minLicense);
                const isSelected = (tactics.tacticalStyle || 'total_football') === style.id;
                const exp = (manager.tacticalExperience && (manager.tacticalExperience as any)[style.id]) ?? 50;

                return (
                  <div
                    key={style.id}
                    onClick={() => {
                      if (isUnlocked) {
                        updateTactics({ ...tactics, tacticalStyle: style.id });
                        setNotification(`تم اعتماد فلسفة: ${style.nameArabic}`);
                      } else {
                        setNotification(`🔒 أسلوب (${style.nameArabic}) يتطلب رخصة تدريب (${style.minLicense}) على الأقل! رخصتك الحالية (${manager.license}).`);
                      }
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-xl ring-2 ring-amber-500/40'
                        : isUnlocked
                        ? 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        : 'bg-slate-950/90 border-slate-900 text-slate-500 hover:border-slate-800 opacity-75'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{style.nameArabic}</span>
                          {!isUnlocked && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{style.nameEnglish}</span>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        isUnlocked
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                      }`}>
                        {isUnlocked ? `رخصة ${style.minLicense} ✓` : `مطلوب رخصة ${style.minLicense}`}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{style.descArabic}</p>

                    {/* Synergy & Counter Advantage */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] space-y-1">
                      <div className="text-emerald-400 flex items-center gap-1">
                        <span>⚡ الميزة التكتيكية:</span>
                        <span className="text-slate-300">{style.counterAdvantageArabic}</span>
                      </div>
                      <div className="text-amber-400 flex items-center gap-1">
                        <span>⚠️ الحذر الفني:</span>
                        <span className="text-slate-400">{style.mismatchWarningArabic}</span>
                      </div>
                    </div>

                    {/* Mastery XP Progress Bar */}
                    {isUnlocked && (
                      <div className="mt-2.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">معدل إتقان الخطة:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, exp)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-cyan-400">{exp}/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advanced Tactical Roles & Instructions */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>التعليمات التكتيكية المتقدمة (Advanced Instructions):</span>
              </label>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded-full font-bold">
                تحكم احترافي
              </span>
            </div>

            {/* Build-up Style */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>1. نمط بناء اللعب من الخلف (Build-up Style):</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'standard', label: 'تدرج كروي متوازن', desc: 'خيارات تمرير مفتوحة' },
                  { id: 'from_back', label: 'تحضير قصير صبور', desc: 'بناء مع حارس المرمى' },
                  { id: 'direct_pivot', label: 'عمودي نحو المحطة', desc: 'تخطي وسط الملعب' },
                  { id: 'channel_balls', label: 'عبر أروقة الأطراف', desc: 'استغلال المساحات الجانبية' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateTactics({ ...tactics, buildUpStyle: opt.id as any })}
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      (tactics.buildUpStyle || 'standard') === opt.id
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-white text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pressing Trap */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>2. مصيدة الضغط واسترجاع الكرة (Pressing Trap):</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'none', label: 'ضغط متوازن بدون فخ', desc: 'تغطية متساوية للملعب' },
                  { id: 'trap_wings', label: 'حصار على خط التماس', desc: 'إجبار الخصم على الأطراف' },
                  { id: 'trap_center', label: 'خنق العمق والوسط', desc: 'افتكاك الكرة بالدائرة' },
                  { id: 'zonal_trap', label: 'مصيدة المساحات النصفية', desc: 'عزل صانعي ألعاب الخصم' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateTactics({ ...tactics, pressingTrap: opt.id as any })}
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      (tactics.pressingTrap || 'none') === opt.id
                        ? 'bg-amber-950 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-white text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fullback Roles */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>3. توظيف الأظهرة (Fullback Roles):</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'standard', label: 'ظهير تقليدي', desc: 'مساندة متزنة دفاعاً وهجوماً' },
                  { id: 'overlapping', label: 'ظهير طائر متداخل', desc: 'انطلاقات هجومية وعرضيات' },
                  { id: 'inverted', label: 'ظهير مقلوب للعمق', desc: 'الدخول كلاعب وسط إضافي' },
                  { id: 'stay_back', label: 'التزام دفاعي صارم', desc: 'تأمين المرتدات والبقاء بالخلف' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateTactics({ ...tactics, fullbackRole: opt.id as any })}
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      (tactics.fullbackRole || 'standard') === opt.id
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-white text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Striker Roles */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>4. دور رأس الحربة (Striker Role):</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'advanced_forward', label: 'مهاجم متقدم صريح', desc: 'الجري في المساحات والتسجيل' },
                  { id: 'target_man', label: 'مهاجم محطة بدني', desc: 'الاستلام بظهره وربح الهوائيات' },
                  { id: 'false_9', label: 'مهاجم وهمي ساقط', desc: 'النزول للوسط وتفريغ المساحات' },
                  { id: 'pressing_forward', label: 'مهاجم ضاغط مقاتل', desc: 'إزعاج مدافعي الخصم ومطاردتهم' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateTactics({ ...tactics, strikerRole: opt.id as any })}
                    className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer ${
                      (tactics.strikerRole || 'advanced_forward') === opt.id
                        ? 'bg-rose-950 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-bold text-white text-xs">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
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
