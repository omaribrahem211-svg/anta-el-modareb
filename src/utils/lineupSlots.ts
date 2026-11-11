import { Club, FormationType, Player, PositionCategory } from '../types/game';
import { getEffectiveLineup, isPlayerInjured, isPlayerSuspended } from './squadHelpers';

export interface FormationSlotCoord {
  pos: string;
  top: number;
  left: number;
}

/**
 * إحداثيات مراكز التشكيلات الـ 26 على الملعب العمودي
 * الهجوم للأعلى (GK عند top: 88 و ST عند top: 14-18)
 * المراكز اليمنى (RB/RWB/RM/RAM/RW) على اليمين (left > 50)
 * المراكز اليسرى (LB/LWB/LM/LAM/LW) على اليسار (left < 50)
 */
export const FORMATION_SLOTS: Record<FormationType, FormationSlotCoord[]> = {
  '4-3-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 71, left: 84 },
    { pos: 'CB', top: 74, left: 62 },
    { pos: 'CB', top: 74, left: 38 },
    { pos: 'LB', top: 71, left: 16 },
    { pos: 'CM', top: 49, left: 70 },
    { pos: 'CDM', top: 55, left: 50 },
    { pos: 'CM', top: 49, left: 30 },
    { pos: 'RW', top: 24, left: 80 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 24, left: 20 },
  ],
  '4-4-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 71, left: 84 },
    { pos: 'CB', top: 74, left: 62 },
    { pos: 'CB', top: 74, left: 38 },
    { pos: 'LB', top: 71, left: 16 },
    { pos: 'RM', top: 46, left: 84 },
    { pos: 'CM', top: 50, left: 62 },
    { pos: 'CM', top: 50, left: 38 },
    { pos: 'LM', top: 46, left: 16 },
    { pos: 'ST', top: 18, left: 62 },
    { pos: 'ST', top: 18, left: 38 },
  ],
  '4-2-3-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CDM', top: 56, left: 62 },
    { pos: 'CDM', top: 56, left: 38 },
    { pos: 'RW', top: 34, left: 80 },
    { pos: 'CAM', top: 36, left: 50 },
    { pos: 'LW', top: 34, left: 20 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '3-5-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 74, left: 72 },
    { pos: 'CB', top: 76, left: 50 },
    { pos: 'CB', top: 74, left: 28 },
    { pos: 'RM', top: 48, left: 85 },
    { pos: 'CM', top: 53, left: 65 },
    { pos: 'CAM', top: 40, left: 50 },
    { pos: 'CM', top: 53, left: 35 },
    { pos: 'LM', top: 48, left: 15 },
    { pos: 'ST', top: 18, left: 62 },
    { pos: 'ST', top: 18, left: 38 },
  ],
  '5-3-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RWB', top: 65, left: 86 },
    { pos: 'CB', top: 75, left: 68 },
    { pos: 'CB', top: 77, left: 50 },
    { pos: 'CB', top: 75, left: 32 },
    { pos: 'LWB', top: 65, left: 14 },
    { pos: 'CM', top: 48, left: 68 },
    { pos: 'CDM', top: 53, left: 50 },
    { pos: 'CM', top: 48, left: 32 },
    { pos: 'ST', top: 18, left: 62 },
    { pos: 'ST', top: 18, left: 38 },
  ],
  '4-1-4-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CDM', top: 59, left: 50 },
    { pos: 'RM', top: 40, left: 84 },
    { pos: 'CM', top: 43, left: 62 },
    { pos: 'CM', top: 43, left: 38 },
    { pos: 'LM', top: 40, left: 16 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '3-4-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 74, left: 72 },
    { pos: 'CB', top: 76, left: 50 },
    { pos: 'CB', top: 74, left: 28 },
    { pos: 'RM', top: 50, left: 85 },
    { pos: 'CM', top: 52, left: 62 },
    { pos: 'CM', top: 52, left: 38 },
    { pos: 'LM', top: 50, left: 15 },
    { pos: 'RW', top: 24, left: 78 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 24, left: 22 },
  ],
  '4-3-2-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CM', top: 54, left: 70 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'CM', top: 54, left: 30 },
    { pos: 'CAM', top: 34, left: 64 },
    { pos: 'CAM', top: 34, left: 36 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '4-5-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'RM', top: 45, left: 85 },
    { pos: 'CM', top: 50, left: 67 },
    { pos: 'CDM', top: 55, left: 50 },
    { pos: 'CM', top: 50, left: 33 },
    { pos: 'LM', top: 45, left: 15 },
    { pos: 'ST', top: 16, left: 50 },
  ],
  '4-1-2-1-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CDM', top: 59, left: 50 },
    { pos: 'CM', top: 46, left: 70 },
    { pos: 'CM', top: 46, left: 30 },
    { pos: 'CAM', top: 33, left: 50 },
    { pos: 'ST', top: 17, left: 62 },
    { pos: 'ST', top: 17, left: 38 },
  ],
  '4-2-2-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CDM', top: 56, left: 64 },
    { pos: 'CDM', top: 56, left: 36 },
    { pos: 'CAM', top: 36, left: 74 },
    { pos: 'CAM', top: 36, left: 26 },
    { pos: 'ST', top: 17, left: 62 },
    { pos: 'ST', top: 17, left: 38 },
  ],
  '5-4-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RWB', top: 67, left: 86 },
    { pos: 'CB', top: 75, left: 68 },
    { pos: 'CB', top: 77, left: 50 },
    { pos: 'CB', top: 75, left: 32 },
    { pos: 'LWB', top: 67, left: 14 },
    { pos: 'RM', top: 45, left: 82 },
    { pos: 'CM', top: 49, left: 61 },
    { pos: 'CM', top: 49, left: 39 },
    { pos: 'LM', top: 45, left: 18 },
    { pos: 'ST', top: 17, left: 50 },
  ],
  '3-4-2-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 74, left: 72 },
    { pos: 'CB', top: 76, left: 50 },
    { pos: 'CB', top: 74, left: 28 },
    { pos: 'RM', top: 52, left: 85 },
    { pos: 'CM', top: 54, left: 62 },
    { pos: 'CM', top: 54, left: 38 },
    { pos: 'LM', top: 52, left: 15 },
    { pos: 'CAM', top: 32, left: 65 },
    { pos: 'CAM', top: 32, left: 35 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '4-2-4': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CM', top: 52, left: 62 },
    { pos: 'CM', top: 52, left: 38 },
    { pos: 'RW', top: 23, left: 84 },
    { pos: 'ST', top: 16, left: 61 },
    { pos: 'ST', top: 16, left: 39 },
    { pos: 'LW', top: 23, left: 16 },
  ],
  '3-3-3-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 75, left: 72 },
    { pos: 'CB', top: 77, left: 50 },
    { pos: 'CB', top: 75, left: 28 },
    { pos: 'RM', top: 53, left: 78 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'LM', top: 53, left: 22 },
    { pos: 'RW', top: 32, left: 80 },
    { pos: 'CAM', top: 34, left: 50 },
    { pos: 'LW', top: 32, left: 20 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '3-2-4-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 75, left: 72 },
    { pos: 'CB', top: 76, left: 50 },
    { pos: 'CB', top: 75, left: 28 },
    { pos: 'CDM', top: 57, left: 62 },
    { pos: 'CDM', top: 57, left: 38 },
    { pos: 'RW', top: 34, left: 84 },
    { pos: 'CAM', top: 36, left: 62 },
    { pos: 'CAM', top: 36, left: 38 },
    { pos: 'LW', top: 34, left: 16 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '4-3-1-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 71, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 71, left: 16 },
    { pos: 'CM', top: 52, left: 70 },
    { pos: 'CDM', top: 55, left: 50 },
    { pos: 'CM', top: 52, left: 30 },
    { pos: 'CAM', top: 34, left: 50 },
    { pos: 'ST', top: 17, left: 63 },
    { pos: 'ST', top: 17, left: 37 },
  ],
  '3-4-1-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 74, left: 72 },
    { pos: 'CB', top: 76, left: 50 },
    { pos: 'CB', top: 74, left: 28 },
    { pos: 'RM', top: 50, left: 85 },
    { pos: 'CM', top: 53, left: 62 },
    { pos: 'CM', top: 53, left: 38 },
    { pos: 'LM', top: 50, left: 15 },
    { pos: 'CAM', top: 34, left: 50 },
    { pos: 'ST', top: 17, left: 63 },
    { pos: 'ST', top: 17, left: 37 },
  ],
  '5-2-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RWB', top: 66, left: 86 },
    { pos: 'CB', top: 75, left: 68 },
    { pos: 'CB', top: 77, left: 50 },
    { pos: 'CB', top: 75, left: 32 },
    { pos: 'LWB', top: 66, left: 14 },
    { pos: 'CM', top: 50, left: 63 },
    { pos: 'CM', top: 50, left: 37 },
    { pos: 'RW', top: 24, left: 78 },
    { pos: 'ST', top: 16, left: 50 },
    { pos: 'LW', top: 24, left: 22 },
  ],
  '3-4-3-diamond': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 75, left: 72 },
    { pos: 'CB', top: 77, left: 50 },
    { pos: 'CB', top: 75, left: 28 },
    { pos: 'CDM', top: 58, left: 50 },
    { pos: 'RM', top: 47, left: 78 },
    { pos: 'LM', top: 47, left: 22 },
    { pos: 'CAM', top: 36, left: 50 },
    { pos: 'RW', top: 22, left: 78 },
    { pos: 'ST', top: 15, left: 50 },
    { pos: 'LW', top: 22, left: 22 },
  ],
  '4-1-3-2': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CDM', top: 58, left: 50 },
    { pos: 'RM', top: 40, left: 80 },
    { pos: 'CAM', top: 38, left: 50 },
    { pos: 'LM', top: 40, left: 20 },
    { pos: 'ST', top: 17, left: 63 },
    { pos: 'ST', top: 17, left: 37 },
  ],
  '4-4-1-1': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'RM', top: 48, left: 84 },
    { pos: 'CM', top: 51, left: 62 },
    { pos: 'CM', top: 51, left: 38 },
    { pos: 'LM', top: 48, left: 16 },
    { pos: 'CF', top: 31, left: 50 },
    { pos: 'ST', top: 15, left: 50 },
  ],
  '4-2-3-1-asym': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 66, left: 85 },
    { pos: 'CB', top: 75, left: 64 },
    { pos: 'CB', top: 75, left: 40 },
    { pos: 'LB', top: 74, left: 18 },
    { pos: 'CDM', top: 56, left: 60 },
    { pos: 'CDM', top: 54, left: 36 },
    { pos: 'RM', top: 38, left: 82 },
    { pos: 'CAM', top: 34, left: 52 },
    { pos: 'LW', top: 21, left: 20 },
    { pos: 'ST', top: 15, left: 54 },
  ],
  '3-2-2-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 75, left: 72 },
    { pos: 'CB', top: 76, left: 50 },
    { pos: 'CB', top: 75, left: 28 },
    { pos: 'CDM', top: 56, left: 63 },
    { pos: 'CDM', top: 56, left: 37 },
    { pos: 'CAM', top: 38, left: 64 },
    { pos: 'CAM', top: 38, left: 36 },
    { pos: 'RW', top: 20, left: 80 },
    { pos: 'ST', top: 15, left: 50 },
    { pos: 'LW', top: 20, left: 20 },
  ],
  '2-3-5': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'CB', top: 75, left: 65 },
    { pos: 'CB', top: 75, left: 35 },
    { pos: 'CDM', top: 54, left: 72 },
    { pos: 'CDM', top: 56, left: 50 },
    { pos: 'CDM', top: 54, left: 28 },
    { pos: 'RW', top: 22, left: 86 },
    { pos: 'CAM', top: 28, left: 66 },
    { pos: 'ST', top: 15, left: 50 },
    { pos: 'CAM', top: 28, left: 34 },
    { pos: 'LW', top: 22, left: 14 },
  ],
  '4-2-1-3': [
    { pos: 'GK', top: 88, left: 50 },
    { pos: 'RB', top: 72, left: 84 },
    { pos: 'CB', top: 75, left: 62 },
    { pos: 'CB', top: 75, left: 38 },
    { pos: 'LB', top: 72, left: 16 },
    { pos: 'CDM', top: 56, left: 63 },
    { pos: 'CDM', top: 56, left: 37 },
    { pos: 'CAM', top: 37, left: 50 },
    { pos: 'RW', top: 21, left: 80 },
    { pos: 'ST', top: 15, left: 50 },
    { pos: 'LW', top: 21, left: 20 },
  ],
};

/** تحويل اسم المركز الفرعي في الخانة إلى فئة PositionCategory */
export function getSlotCategory(slotPos: string): PositionCategory {
  const normalized = slotPos.toUpperCase();
  if (normalized === 'GK') return 'GK';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(normalized)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'RM', 'LM', 'RAM', 'LAM'].includes(normalized)) return 'MID';
  return 'FWD';
}

/** تقييم مدى ملاءمة اللاعب لمركز الخانة (أعلى = أنسب) */
export function getPositionFitScore(player: Player, slotPos: string): number {
  const pPos = (player.position || '').toUpperCase();
  const sPos = slotPos.toUpperCase();

  // مطابقة تامة للمركز
  if (pPos === sPos) return 100;

  // بدائل متكافئة جداً
  if (
    (pPos === 'RB' && sPos === 'RWB') ||
    (pPos === 'RWB' && sPos === 'RB') ||
    (pPos === 'LB' && sPos === 'LWB') ||
    (pPos === 'LWB' && sPos === 'LB') ||
    (pPos === 'ST' && sPos === 'CF') ||
    (pPos === 'CF' && sPos === 'ST') ||
    (pPos === 'RW' && sPos === 'RM') ||
    (pPos === 'RM' && sPos === 'RW') ||
    (pPos === 'LW' && sPos === 'LM') ||
    (pPos === 'LM' && sPos === 'LW') ||
    (pPos === 'CF' && sPos === 'CAM') ||
    (pPos === 'CAM' && sPos === 'CF')
  ) {
    return 88;
  }

  const pCat = player.positionCategory || getSlotCategory(pPos);
  const sCat = getSlotCategory(sPos);

  // حارس المرمى لا يصلح للاعب ميدان والعكس
  if (pCat === 'GK' || sCat === 'GK') {
    return pCat === sCat ? 100 : 0;
  }

  // نفس الفئة العامة (دفاع / وسط / هجوم)
  if (pCat === sCat) return 72;

  // فئة مجاورة (دفاع <-> وسط أو وسط <-> هجوم)
  if (
    (pCat === 'DEF' && sCat === 'MID') ||
    (pCat === 'MID' && sCat === 'DEF') ||
    (pCat === 'MID' && sCat === 'FWD') ||
    (pCat === 'FWD' && sCat === 'MID')
  ) {
    return 35;
  }

  // دفاع <-> هجوم
  return 15;
}

/** هل يلعب اللاعب في غير مركزه داخل هذه الخانة؟ */
export function isPlayerOutOfPosition(player: Player, slotPos: string): boolean {
  return getPositionFitScore(player, slotPos) < 70;
}

/**
 * توزيع اللاعبين الأساسيين الحاليين على الـ 11 خانة للتشكيلة المختارة
 * الأولوية: مطابقة المركز الدقيق > نفس الفئة (GK/DEF/MID/FWD) > الأقرب ملاءمة
 * دالة نقية لا تغير من قائمة الأساسيين بل ترتبهم على الخانات الـ 11
 */
export function assignPlayersToSlots(
  players: (Player | null | undefined)[],
  slots: FormationSlotCoord[]
): (Player | null)[] {
  const validPlayers = players.filter((p): p is Player => Boolean(p));
  const result: (Player | null)[] = new Array(slots.length).fill(null);
  const usedPlayerIds = new Set<string>();

  // المرحلة 1: مطابقة دقيقة للمركز (Exact Match أو شبه مطابق >= 88)
  slots.forEach((slot, idx) => {
    let bestPlayer: Player | null = null;
    let bestScore = -1;

    for (const p of validPlayers) {
      if (usedPlayerIds.has(p.id)) continue;
      const fit = getPositionFitScore(p, slot.pos);
      if (fit >= 88) {
        const score = fit * 1000 + p.overallRating;
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = p;
        }
      }
    }

    if (bestPlayer) {
      result[idx] = bestPlayer;
      usedPlayerIds.add(bestPlayer.id);
    }
  });

  // المرحلة 2: نفس الفئة (PositionCategory match >= 70)
  slots.forEach((slot, idx) => {
    if (result[idx] !== null) return;
    let bestPlayer: Player | null = null;
    let bestScore = -1;

    for (const p of validPlayers) {
      if (usedPlayerIds.has(p.id)) continue;
      const fit = getPositionFitScore(p, slot.pos);
      if (fit >= 70) {
        const score = fit * 1000 + p.overallRating;
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = p;
        }
      }
    }

    if (bestPlayer) {
      result[idx] = bestPlayer;
      usedPlayerIds.add(bestPlayer.id);
    }
  });

  // المرحلة 3: ملء الخانات المتبقية بأقرب لاعب متاح من الأساسيين الحاليين
  slots.forEach((slot, idx) => {
    if (result[idx] !== null) return;
    let bestPlayer: Player | null = null;
    let bestScore = -1;

    for (const p of validPlayers) {
      if (usedPlayerIds.has(p.id)) continue;
      const fit = getPositionFitScore(p, slot.pos);
      const score = fit * 1000 + p.overallRating;
      if (score > bestScore) {
        bestScore = score;
        bestPlayer = p;
      }
    }

    if (bestPlayer) {
      result[idx] = bestPlayer;
      usedPlayerIds.add(bestPlayer.id);
    }
  });

  return result;
}

/**
 * إعادة ترتيب معرفات اللاعبين الأساسيين عند تغيير التشكيلة لضمان وضع كل لاعب في الخانة الأنسب له
 */
export function reorderStartingIdsForFormation(
  club: Club,
  formation: FormationType
): string[] {
  const { startingIds } = getEffectiveLineup(club);
  const allPlayers = (Array.isArray(club.players) ? club.players : []).filter(Boolean);
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3'];

  const currentStarters = startingIds
    .map((id) => allPlayers.find((p) => p.id === id) || null)
    .filter((p): p is Player => Boolean(p));

  const assigned = assignPlayersToSlots(currentStarters, slots);
  const orderedIds = assigned.filter((p): p is Player => Boolean(p)).map((p) => p.id);

  // إذا كان هناك أي معرفات لم تُضف (مثلاً في حالة نقص العدد)، نحتفظ بها بدون تغيير
  for (const id of startingIds) {
    if (id && !orderedIds.includes(id)) {
      orderedIds.push(id);
    }
  }

  return orderedIds;
}

/**
 * اختيار أفضل 11 لاعباً أساسياً + 7 بدلاء جاهزين بناءً على الخانات الـ 11 للتشكيلة المختارة
 */
export function pickBestLineupForFormation(
  club: Club,
  formation?: FormationType
): { startingIds: string[]; benchIds: string[] } {
  const targetFormation = formation || club.tactics?.formation || '4-3-3';
  const slots = FORMATION_SLOTS[targetFormation] || FORMATION_SLOTS['4-3-3'];
  const allPlayers = (Array.isArray(club.players) ? club.players : []).filter(Boolean);

  // استبعاد المصابين والموقوفين والمنهكين جداً (لياقة أقل من 55%) إن توفرت بدائل
  const healthyPool = allPlayers.filter(
    (p) => !isPlayerInjured(p) && !isPlayerSuspended(p) && p.fitness >= 55
  );
  const fallbackPool = allPlayers.filter(
    (p) => !isPlayerInjured(p) && !isPlayerSuspended(p)
  );
  const candidatePool = healthyPool.length >= 11 ? healthyPool : fallbackPool.length >= 11 ? fallbackPool : allPlayers;

  const chosenStarters: (Player | null)[] = new Array(slots.length).fill(null);
  const usedIds = new Set<string>();

  // 1) اختيار حارس المرمى أولاً
  slots.forEach((slot, idx) => {
    if (slot.pos !== 'GK') return;
    const bestGk = candidatePool
      .filter((p) => !usedIds.has(p.id) && p.positionCategory === 'GK')
      .sort((a, b) => b.overallRating * 2 + b.fitness * 0.3 - (a.overallRating * 2 + a.fitness * 0.3))[0];
    if (bestGk) {
      chosenStarters[idx] = bestGk;
      usedIds.add(bestGk.id);
    }
  });

  // 2) اختيار المطابقة الدقيقة لكل خانة
  slots.forEach((slot, idx) => {
    if (chosenStarters[idx]) return;
    const bestExact = candidatePool
      .filter((p) => !usedIds.has(p.id) && getPositionFitScore(p, slot.pos) >= 88)
      .sort(
        (a, b) =>
          b.overallRating * 2 +
          b.fitness * 0.25 +
          getPositionFitScore(b, slot.pos) * 0.2 -
          (a.overallRating * 2 + a.fitness * 0.25 + getPositionFitScore(a, slot.pos) * 0.2)
      )[0];
    if (bestExact) {
      chosenStarters[idx] = bestExact;
      usedIds.add(bestExact.id);
    }
  });

  // 3) اختيار نفس الفئة للخانات المتبقية
  slots.forEach((slot, idx) => {
    if (chosenStarters[idx]) return;
    const bestCat = candidatePool
      .filter((p) => !usedIds.has(p.id) && getPositionFitScore(p, slot.pos) >= 70)
      .sort(
        (a, b) =>
          b.overallRating * 2 +
          b.fitness * 0.25 -
          (a.overallRating * 2 + a.fitness * 0.25)
      )[0];
    if (bestCat) {
      chosenStarters[idx] = bestCat;
      usedIds.add(bestCat.id);
    }
  });

  // 4) سد أي خانة متبقية بأفضل متاح
  slots.forEach((slot, idx) => {
    if (chosenStarters[idx]) return;
    const bestAny = candidatePool
      .filter((p) => !usedIds.has(p.id))
      .sort(
        (a, b) =>
          getPositionFitScore(b, slot.pos) * 2 +
          b.overallRating -
          (getPositionFitScore(a, slot.pos) * 2 + a.overallRating)
      )[0];
    if (bestAny) {
      chosenStarters[idx] = bestAny;
      usedIds.add(bestAny.id);
    }
  });

  const startingIds = chosenStarters.filter((p): p is Player => Boolean(p)).map((p) => p.id);

  // اختيار 7 بدلاء متوازنين (حارس + مدافعين + وسط + مهاجمين) من الأصحاء غير الأساسيين
  const remainingHealthy = allPlayers
    .filter((p) => !usedIds.has(p.id) && !isPlayerInjured(p) && !isPlayerSuspended(p))
    .sort((a, b) => b.overallRating * 2 + b.fitness * 0.2 - (a.overallRating * 2 + a.fitness * 0.2));

  const benchIds: string[] = [];
  const benchGk = remainingHealthy.find((p) => p.positionCategory === 'GK');
  if (benchGk) benchIds.push(benchGk.id);

  for (const p of remainingHealthy) {
    if (benchIds.length >= 7) break;
    if (!benchIds.includes(p.id)) {
      benchIds.push(p.id);
    }
  }

  return { startingIds, benchIds };
}
