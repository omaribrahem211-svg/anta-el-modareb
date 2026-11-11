import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import {
  FormationType,
  TeamTactics,
  Player,
  TacticalStyle,
  CoachingLicenseTier,
} from '../types/game';
import { getPositionArabic } from '../utils/positionHelper';
import {
  ALL_FORMATIONS,
  ALL_TACTICAL_STYLES,
  getFormationAccess,
  getStyleAccess,
  findCoursesUnlocking,
} from '../utils/tacticalKnowledgeEngine';
import {
  isPlayerInjured,
  isPlayerSuspended,
  getEffectiveLineup,
  getOvrColorClasses,
  formatPlayerDualName,
} from '../utils/squadHelpers';
import {
  FORMATION_SLOTS,
  isPlayerOutOfPosition,
  getPositionFitScore,
  pickBestLineupForFormation,
} from '../utils/lineupSlots';
import { PlayerAvatar } from './PlayerAvatar';
import { ModalPortal } from './common/ModalPortal';
import {
  Sliders,
  Shield,
  Zap,
  Crosshair,
  Award,
  RotateCcw,
  Users,
  Lock,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Bandage,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Undo2,
  X,
  UserPlus,
} from 'lucide-react';

interface TacticsTabProps {
  onSelectPlayer: (player: Player) => void;
}

type SubTabType = 'lineup' | 'tactics' | 'roles';
type FormationCategoryFilter = 'ALL' | 'DEF_5' | 'BAL_4' | 'ATK_3' | 'ELITE';

const LICENSE_NAMES_AR: Record<string, string> = {
  NONE: 'مبتدئ',
  BASIC: 'أساسية',
  PREMIER: 'ممتازة',
  CONTINENTAL: 'قارية',
  LEGENDARY: 'أسطورية',
  D: 'رخصة D',
  C: 'رخصة C',
  B: 'رخصة B',
  A: 'رخصة A',
  PRO: 'رخصة PRO',
  ELITE: 'رخصة النخبة ELITE',
};

function getLicenseNameAr(tier: CoachingLicenseTier | string): string {
  return LICENSE_NAMES_AR[tier] || `رخصة ${tier}`;
}

export const TacticsTab: React.FC<TacticsTabProps> = ({ onSelectPlayer }) => {
  const { userClub, manager, season, updateTactics, setFormation, updateStartingLineup } = useGame();
  const seasonNum = season?.seasonNumber || 1;

  // جميع الـ Hooks في الأعلى قبل أي return شرطي
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('lineup');
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
  const [emptySlotPickerIdx, setEmptySlotPickerIdx] = useState<number | null>(null);
  const [formationSheetOpen, setFormationSheetOpen] = useState(false);
  const [formationCatFilter, setFormationCatFilter] = useState<FormationCategoryFilter>('ALL');
  const [showAdvancedInstructions, setShowAdvancedInstructions] = useState(false);
  const [confirmAutoPickOpen, setConfirmAutoPickOpen] = useState(false);
  const [undoLineup, setUndoLineup] = useState<{
    startingIds: string[];
    benchIds: string[];
  } | null>(null);
  const [swapNotification, setSwapNotification] = useState<string | null>(null);

  // حالة السحب والإفلات باللمس أو الماوس (Pointer Events / HTML5 Drag)
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    type: 'slot' | 'player';
    slotIdx?: number;
    playerId?: string;
  } | null>(null);

  // مرجع لتنظيف مؤقت الإشعارات عند إلغاء تركيب المكوّن
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, duration = 2600) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setSwapNotification(message);
    notificationTimerRef.current = setTimeout(() => {
      setSwapNotification(null);
      notificationTimerRef.current = null;
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, []);

  // استخراج اللاعبين والتشكيل الفعلي بشكل آمن
  const allPlayers = useMemo(() => {
    if (!userClub || !Array.isArray(userClub.players)) return [];
    return userClub.players.filter((p): p is Player => Boolean(p));
  }, [userClub]);

  const { startingIds, benchIds } = useMemo(
    () => getEffectiveLineup(userClub),
    [userClub]
  );

  const currentFormation: FormationType = userClub?.tactics?.formation || '4-3-3';
  const slots = FORMATION_SLOTS[currentFormation] || FORMATION_SLOTS['4-3-3'];

  // بناء مصفوفة الـ 11 خانة مع الحفاظ على فهرس كل خانة (null = مركز شاغر)
  const startingSlots = useMemo<(Player | null)[]>(() => {
    return Array.from({ length: 11 }, (_, idx) => {
      const id = startingIds[idx];
      if (!id) return null;
      return allPlayers.find((p) => p.id === id) ?? null;
    });
  }, [startingIds, allPlayers]);

  // قائمة البدلاء والاحتياط خارج الـ 11 الأساسيين
  const nonStartingPlayers = useMemo(() => {
    const starterSet = new Set(
      startingSlots.filter((p): p is Player => Boolean(p)).map((p) => p.id)
    );
    const benchOrdered: Player[] = [];
    for (const bId of benchIds) {
      const p = allPlayers.find((pl) => pl.id === bId);
      if (p && !starterSet.has(p.id) && !benchOrdered.some((x) => x.id === p.id)) {
        benchOrdered.push(p);
      }
    }
    const reserves = allPlayers.filter(
      (p) => !starterSet.has(p.id) && !benchOrdered.some((x) => x.id === p.id)
    );
    return [...benchOrdered, ...reserves];
  }, [allPlayers, startingSlots, benchIds]);

  // إحصاءات جاهزية وانسجام التشكيل الأساسي
  const lineupReadiness = useMemo(() => {
    const activeStarters = startingSlots.filter((p): p is Player => Boolean(p));
    const count = activeStarters.length;
    const avgOvr =
      count > 0
        ? Math.round(activeStarters.reduce((s, p) => s + p.overallRating, 0) / count)
        : 0;
    const avgFitness =
      count > 0
        ? Math.round(activeStarters.reduce((s, p) => s + (p.fitness ?? 100), 0) / count)
        : 0;
    let outOfPosCount = 0;
    startingSlots.forEach((p, idx) => {
      const slot = slots[idx];
      if (p && slot && isPlayerOutOfPosition(p, slot.pos)) {
        outOfPosCount += 1;
      }
    });
    const unavailableCount = activeStarters.filter(
      (p) => isPlayerInjured(p) || isPlayerSuspended(p)
    ).length;
    return {
      count,
      avgOvr,
      avgFitness,
      outOfPosCount,
      unavailableCount,
    };
  }, [startingSlots, slots]);

  // إجمالي عدد التشكيلات ديناميكياً
  const totalFormationsCount = useMemo(() => Object.keys(ALL_FORMATIONS).length, []);

  // قائمة التشكيلات مصنفة للـ Bottom Sheet
  const filteredFormationDefinitions = useMemo(() => {
    const allList = Object.values(ALL_FORMATIONS);
    return allList.filter((f) => {
      if (formationCatFilter === 'ALL') return true;
      if (formationCatFilter === 'ELITE') return f.minLicense === 'PRO' || f.minLicense === 'ELITE' || f.minLicense === 'A';
      if (formationCatFilter === 'DEF_5') return f.id.startsWith('5-');
      if (formationCatFilter === 'BAL_4') return f.id.startsWith('4-');
      if (formationCatFilter === 'ATK_3') return f.id.startsWith('3-') || f.id.startsWith('2-');
      return true;
    });
  }, [formationCatFilter]);

  // حالة المدرب الحر بدون نادٍ
  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          📋
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          إعدادات التكتيك وخطط اللعب ستكون متاحة فور توقيعك عقداً تدريبياً مع أحد الأندية من تبويب المسيرة!
        </p>
      </div>
    );
  }

  const tactics: TeamTactics = userClub.tactics || {
    formation: '4-3-3',
    mentality: 'balanced',
    passingStyle: 'short',
    pressingIntensity: 'balanced',
    tempo: 'balanced',
    startingPlayerIds: startingIds,
    benchPlayerIds: benchIds,
    captainId: allPlayers[0]?.id || '',
    penaltyTakerId: allPlayers[0]?.id || '',
    freeKickTakerId: allPlayers[0]?.id || '',
    cornerTakerId: allPlayers[0]?.id || '',
  };

  // تبديل لاعبين (بين خانة أساسية ولاعب آخر أو بين خانتين)
  const executePlayerSwap = (sourcePlayerId: string, targetPlayerId: string) => {
    if (sourcePlayerId === targetPlayerId) {
      setSelectedSwapId(null);
      return;
    }

    const p1 = allPlayers.find((p) => p.id === sourcePlayerId);
    const p2 = allPlayers.find((p) => p.id === targetPlayerId);
    if (!p1 || !p2) return;

    const p1InStarting = startingIds.includes(sourcePlayerId);
    const p2InStarting = startingIds.includes(targetPlayerId);

    // منع إدخال مصاب أو موقوف إلى التشكيل الأساسي
    if (!p1InStarting && p2InStarting && (isPlayerInjured(p1) || isPlayerSuspended(p1))) {
      showToast(
        isPlayerInjured(p1)
          ? `⛔ لا يمكن إشراك ${p1.name} لأنه مصاب حالياً!`
          : `⛔ لا يمكن إشراك ${p1.name} لأنه موقوف حالياً!`,
        3200
      );
      setSelectedSwapId(null);
      return;
    }

    if (!p2InStarting && p1InStarting && (isPlayerInjured(p2) || isPlayerSuspended(p2))) {
      showToast(
        isPlayerInjured(p2)
          ? `⛔ لا يمكن إشراك ${p2.name} لأنه مصاب حالياً!`
          : `⛔ لا يمكن إشراك ${p2.name} لأنه موقوف حالياً!`,
        3200
      );
      setSelectedSwapId(null);
      return;
    }

    setUndoLineup({ startingIds: [...startingIds], benchIds: [...benchIds] });

    const newStarting = [...startingIds];
    const newBench = [...benchIds];

    const sIdx1 = newStarting.indexOf(sourcePlayerId);
    const sIdx2 = newStarting.indexOf(targetPlayerId);
    const bIdx1 = newBench.indexOf(sourcePlayerId);
    const bIdx2 = newBench.indexOf(targetPlayerId);

    if (sIdx1 !== -1 && sIdx2 !== -1) {
      newStarting[sIdx1] = targetPlayerId;
      newStarting[sIdx2] = sourcePlayerId;
    } else if (sIdx1 !== -1 && sIdx2 === -1) {
      newStarting[sIdx1] = targetPlayerId;
      if (bIdx2 !== -1) {
        newBench[bIdx2] = sourcePlayerId;
      } else if (!newBench.includes(sourcePlayerId) && newBench.length < 7) {
        newBench.push(sourcePlayerId);
      }
    } else if (sIdx1 === -1 && sIdx2 !== -1) {
      newStarting[sIdx2] = sourcePlayerId;
      if (bIdx1 !== -1) {
        newBench[bIdx1] = targetPlayerId;
      } else if (!newBench.includes(targetPlayerId) && newBench.length < 7) {
        newBench.push(targetPlayerId);
      }
    } else if (bIdx1 !== -1 && bIdx2 !== -1) {
      newBench[bIdx1] = targetPlayerId;
      newBench[bIdx2] = sourcePlayerId;
    }

    updateStartingLineup(newStarting, newBench);
    setSelectedSwapId(null);
    showToast(`🔄 تم التبديل بين ${formatPlayerDualName(p1.name)} و ${formatPlayerDualName(p2.name)}`);
  };

  // وضع لاعب في خانة شاغرة محددة بالفهرس
  const assignPlayerToSlotIndex = (slotIdx: number, candidate: Player) => {
    if (isPlayerInjured(candidate) || isPlayerSuspended(candidate)) {
      showToast(
        isPlayerInjured(candidate)
          ? `⛔ لا يمكن إشراك ${candidate.name} لأنه مصاب!`
          : `⛔ لا يمكن إشراك ${candidate.name} لأنه موقوف!`,
        3000
      );
      return;
    }

    setUndoLineup({ startingIds: [...startingIds], benchIds: [...benchIds] });

    const newStarting = Array.from({ length: 11 }, (_, i) => startingIds[i] || '');
    const existingIdx = newStarting.indexOf(candidate.id);
    const displacedId = newStarting[slotIdx];

    if (existingIdx !== -1) {
      newStarting[existingIdx] = displacedId || '';
    }
    newStarting[slotIdx] = candidate.id;

    const cleanedStarting = newStarting.filter(Boolean);
    const newBench = benchIds.filter((id) => id !== candidate.id);
    if (displacedId && !cleanedStarting.includes(displacedId) && !newBench.includes(displacedId)) {
      newBench.unshift(displacedId);
    }

    updateStartingLineup(newStarting, newBench.slice(0, 7));
    setEmptySlotPickerIdx(null);
    setSelectedSwapId(null);
    showToast(`✅ تم وضع ${candidate.name} في مركز ${slots[slotIdx]?.pos || ''}`);
  };

  const handlePlayerTap = (playerId: string) => {
    if (!selectedSwapId) {
      setSelectedSwapId(playerId);
      return;
    }
    executePlayerSwap(selectedSwapId, playerId);
  };

  // اختيار التشكيلة مع منع التشكيلات المقفلة
  const handleSelectFormation = (formationId: FormationType) => {
    const def = ALL_FORMATIONS[formationId];
    const unlocked = def ? getFormationAccess(formationId, manager, seasonNum) !== 'locked' : true;
    if (!unlocked) {
      const reqLicense = def ? getLicenseNameAr(def.minLicense) : 'رخصة متقدمة';
      const courses = findCoursesUnlocking('formation', formationId);
      const via = courses.length ? ` أو دورة «${courses[0].title}» من تبويب المسيرة` : '';
      showToast(`🔒 التشكيلة ${formationId} مقفلة — مطلوب ${reqLicense}${via}`, 4200);
      return;
    }
    setFormation(formationId);
    setFormationSheetOpen(false);
    showToast(`📐 تم تطبيق التشكيلة ${formationId} وإعادة توزيع المراكز تلقائياً`);
  };

  // اختيار الهوية التكتيكية مع منع الأنماط المقفلة
  const handleSelectTacticalStyle = (styleId: TacticalStyle) => {
    const def = ALL_TACTICAL_STYLES[styleId];
    const unlocked = def ? getStyleAccess(styleId, manager, seasonNum) !== 'locked' : true;
    if (!unlocked) {
      const reqLicense = def ? getLicenseNameAr(def.minLicense) : 'رخصة متقدمة';
      const courses = findCoursesUnlocking('style', styleId);
      const via = courses.length ? ` أو دورة «${courses[0].title}» من تبويب المسيرة` : '';
      showToast(`🔒 أسلوب "${def?.nameArabic || styleId}" مقفل — مطلوب ${reqLicense}${via}`, 4200);
      return;
    }
    updateTactics({ ...tactics, tacticalStyle: styleId });
    showToast(`⚡ تم تفعيل الهوية التكتيكية: ${ALL_TACTICAL_STYLES[styleId]?.nameArabic}`);
  };

  // الاختيار التلقائي لأفضل تشكيل (مع حفظ نسخة للتراجع)
  const handleExecuteAutoPick = () => {
    setUndoLineup({ startingIds: [...startingIds], benchIds: [...benchIds] });
    const best = pickBestLineupForFormation(userClub, currentFormation);
    updateStartingLineup(best.startingIds, best.benchIds);
    setConfirmAutoPickOpen(false);
    setSelectedSwapId(null);
    showToast('✨ تم اختيار أفضل 11 لاعباً أساسياً و7 بدلاء حسب المراكز واللياقة!');
  };

  const handleUndoLineup = () => {
    if (!undoLineup) return;
    updateStartingLineup(undoLineup.startingIds, undoLineup.benchIds);
    setUndoLineup(null);
    showToast('↩️ تم التراجع واستعادة التشكيل السابق');
  };

  const handleTacticChange = (key: keyof TeamTactics, value: any) => {
    updateTactics({
      ...tactics,
      [key]: value,
    });
  };

  // اللاعب المحدد حالياً للتبديل (إن وجد)
  const selectedSwapPlayer = selectedSwapId
    ? allPlayers.find((p) => p.id === selectedSwapId) || null
    : null;
  const selectedSwapSlotIdx = selectedSwapId ? startingIds.indexOf(selectedSwapId) : -1;
  const selectedSwapSlotPos =
    selectedSwapSlotIdx !== -1 ? slots[selectedSwapSlotIdx]?.pos : selectedSwapPlayer?.position;

  const activeStyleDef =
    ALL_TACTICAL_STYLES[tactics.tacticalStyle || 'total_football'] ||
    ALL_TACTICAL_STYLES.total_football;

  return (
    <div className="space-y-3 pb-24 animate-fade-in" dir="rtl">
      {/* شريط الإشعارات العائم */}
      {swapNotification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-emerald-500/60 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>{swapNotification}</span>
        </div>
      )}

      {/* شريط التبويبات الفرعية الثلاثة (التشكيل | الخطة | الأدوار) */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md py-1.5 border-b border-slate-800/80">
        <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'lineup', label: 'التشكيل والملعب', icon: Users },
            { id: 'tactics', label: 'الخطة والتعليمات', icon: Sliders },
            { id: 'roles', label: 'الأدوار والكرات الثابتة', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as SubTabType)}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== 1) تبويب التشكيل والملعب ==================== */}
      {activeSubTab === 'lineup' && (
        <div className="space-y-3">
          {/* شريط جاهزية وانسجام التشكيل + أزرار التشكيلة والاختيار التلقائي */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* زر فتح نافذة التشكيلات */}
              <button
                type="button"
                onClick={() => setFormationSheetOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-white transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block leading-none">
                    خطة الانتشار ({totalFormationsCount} متاحة)
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-400">
                    {currentFormation}{' '}
                    <span className="font-sans text-[10px] text-slate-300 font-bold">
                      ({ALL_FORMATIONS[currentFormation]?.nameArabic || currentFormation})
                    </span>
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* أزرار أفضل تشكيل + تراجع */}
              <div className="flex items-center gap-1.5">
                {undoLineup && (
                  <button
                    type="button"
                    onClick={handleUndoLineup}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>تراجع</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmAutoPickOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>أفضل تشكيل</span>
                </button>
              </div>
            </div>

            {/* مؤشرات الجاهزية والانسجام */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">قوة الأساسيين</span>
                <span className="text-xs font-black font-mono text-emerald-400">
                  {lineupReadiness.avgOvr} OVR
                </span>
              </div>
              <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">متوسط اللياقة</span>
                <span
                  className={`text-xs font-black font-mono ${
                    lineupReadiness.avgFitness >= 75
                      ? 'text-emerald-400'
                      : lineupReadiness.avgFitness >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {lineupReadiness.avgFitness}%
                </span>
              </div>
              <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">خارج المركز</span>
                <span
                  className={`text-xs font-black font-mono ${
                    lineupReadiness.outOfPosCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {lineupReadiness.outOfPosCount === 0
                    ? 'متناغم ✓'
                    : `${lineupReadiness.outOfPosCount} لاعب`}
                </span>
              </div>
            </div>

            {/* شريط إرشاد التبديل النشط */}
            {selectedSwapPlayer ? (
              <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-amber-200">
                <span>
                  اختر لاعباً آخر من الملعب أو الدكة للتبديل مع{' '}
                  <strong className="text-white font-black">{formatPlayerDualName(selectedSwapPlayer.name)}</strong> (
                  {selectedSwapSlotPos})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSwapId(null)}
                  className="text-[11px] font-bold text-amber-300 hover:text-white px-2 py-0.5 rounded bg-slate-900/70"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>اضغط على أي لاعب أو اسحبه للتبديل بين المراكز والدكة</span>
                <span>الأساسيون: {lineupReadiness.count}/11</span>
              </div>
            )}
          </div>

          {/* الملعب التكتيكي التفاعلي (SVG خفيف وسريع بدون مجسمات ثلاثية الأبعاد ثقيلة) */}
          <div className="relative w-full max-w-[440px] mx-auto aspect-[3/4] rounded-3xl overflow-hidden border-2 border-emerald-800/80 shadow-2xl select-none bg-emerald-950">
            {/* خلفية العشب وتخطيط الملعب بـ SVG */}
            <svg
              viewBox="0 0 300 400"
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="pitchStripes" width="300" height="40" patternUnits="userSpaceOnUse">
                  <rect width="300" height="20" fill="#064e3b" />
                  <rect y="20" width="300" height="20" fill="#065f46" />
                </pattern>
              </defs>
              <rect width="300" height="400" fill="url(#pitchStripes)" />
              {/* حدود الملعب */}
              <rect
                x="12"
                y="12"
                width="276"
                height="376"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
              {/* خط المنتصف والدائرة */}
              <line
                x1="12"
                y1="200"
                x2="288"
                y2="200"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
              <circle
                cx="150"
                cy="200"
                r="36"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
              <circle cx="150" cy="200" r="3" fill="rgba(255,255,255,0.4)" />
              {/* منطقة الجزاء العلوية (الهجوم) */}
              <rect
                x="68"
                y="12"
                width="164"
                height="58"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
              <rect
                x="105"
                y="12"
                width="90"
                height="22"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
              {/* منطقة الجزاء السفلية (حارس المرمى) */}
              <rect
                x="68"
                y="330"
                width="164"
                height="58"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
              <rect
                x="105"
                y="366"
                width="90"
                height="22"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="2"
              />
            </svg>

            {/* خانات اللاعبين الـ 11 على الملعب */}
            {slots.map((slot, index) => {
              const player = startingSlots[index] ?? null;

              // خانة شاغرة: عند الضغط تفتح قائمة اختيار لاعب متاح
              if (!player) {
                return (
                  <div
                    key={`empty-slot-${index}`}
                    style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                    onClick={() => setEmptySlotPickerIdx(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverTarget({ type: 'slot', slotIdx: index });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedPlayerId) {
                        const dragged = allPlayers.find((p) => p.id === draggedPlayerId);
                        if (dragged) assignPlayerToSlotIndex(index, dragged);
                      }
                      setDraggedPlayerId(null);
                      setDragOverTarget(null);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer z-10 group transition-transform active:scale-95 ${
                      dragOverTarget?.type === 'slot' && dragOverTarget.slotIdx === index
                        ? 'scale-110'
                        : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-amber-400/80 bg-slate-950/75 flex flex-col items-center justify-center text-amber-300 shadow-lg group-hover:border-amber-300">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="text-[8px] font-black font-mono leading-none mt-0.5">
                        {slot.pos}
                      </span>
                    </div>
                    <span className="mt-0.5 px-1.5 py-0.2 rounded bg-amber-500/90 text-slate-950 font-black text-[9px] shadow">
                      شاغر
                    </span>
                  </div>
                );
              }

              const isSelected = selectedSwapId === player.id;
              const isCaptain = tactics.captainId === player.id;
              const injured = isPlayerInjured(player);
              const suspended = isPlayerSuspended(player);
              const outOfPos = isPlayerOutOfPosition(player, slot.pos);
              const ovrStyle = getOvrColorClasses(player.overallRating);
              const fitness = Math.max(0, Math.min(100, player.fitness ?? 100));
              const dualName = formatPlayerDualName(player.name);

              return (
                <div
                  key={`slot-${index}-${player.id}`}
                  style={{ top: `${slot.top}%`, left: `${slot.left}%` }}
                  draggable
                  onDragStart={() => setDraggedPlayerId(player.id)}
                  onDragEnd={() => {
                    setDraggedPlayerId(null);
                    setDragOverTarget(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget({ type: 'player', playerId: player.id });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedPlayerId && draggedPlayerId !== player.id) {
                      executePlayerSwap(draggedPlayerId, player.id);
                    }
                    setDraggedPlayerId(null);
                    setDragOverTarget(null);
                  }}
                  onClick={() => handlePlayerTap(player.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform z-10 ${
                    isSelected ||
                    (dragOverTarget?.type === 'player' && dragOverTarget.playerId === player.id)
                      ? 'scale-125 z-20'
                      : 'hover:scale-105'
                  }`}
                >
                  {/* الدائرة التكتيكية للاعب بألوان النادي ورقم القميص */}
                  <div className="relative">
                    <div
                      style={{
                        backgroundColor:
                          slot.pos === 'GK' ? '#eab308' : userClub.primaryColor || '#10b981',
                        borderColor: isSelected
                          ? '#fbbf24'
                          : injured || suspended
                          ? '#ef4444'
                          : userClub.secondaryColor || '#ffffff',
                      }}
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 shadow-lg flex flex-col items-center justify-center relative ${
                        isSelected ? 'ring-4 ring-amber-400/80 animate-pulse' : ''
                      }`}
                    >
                      <span
                        style={{
                          color: slot.pos === 'GK' ? '#0f172a' : '#ffffff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                        }}
                        className="font-black font-mono text-xs sm:text-sm leading-none tabular-nums"
                      >
                        {player.number}
                      </span>
                      <span
                        style={{
                          color: slot.pos === 'GK' ? '#0f172a' : '#ffffff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.85)',
                        }}
                        className="text-[8px] font-black font-mono leading-none mt-0.5 opacity-95"
                      >
                        {slot.pos}
                      </span>
                    </div>

                    {/* شارة التقييم المصغرة أعلى اليمين */}
                    <span
                      className={`absolute -top-1 -right-2 px-1 py-0.2 rounded-md text-[9px] font-black font-mono tabular-nums border shadow ${ovrStyle.badgeBg} ${ovrStyle.badgeText} ${ovrStyle.badgeBorder}`}
                    >
                      {player.overallRating}
                    </span>

                    {/* شارة الكابتن */}
                    {isCaptain && (
                      <span className="absolute -top-1 -left-1.5 w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center border border-slate-950 shadow">
                        C
                      </span>
                    )}

                    {/* تنبيه لعب في غير مركزه */}
                    {outOfPos && !injured && !suspended && (
                      <span
                        title={`يلعب خارج مركزه الأصلي (${player.position})`}
                        className="absolute -bottom-0.5 -left-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border border-slate-950 shadow"
                      >
                        !
                      </span>
                    )}

                    {/* تنبيه الإصابة أو الإيقاف */}
                    {(injured || suspended) && (
                      <span className="absolute -bottom-0.5 -left-1.5 w-4 h-4 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center justify-center border border-slate-950 shadow animate-bounce">
                        {injured ? '+' : '🟥'}
                      </span>
                    )}
                  </div>

                  {/* شريط الاسم الأول والثاني واللياقة أسفل الدائرة */}
                  <div
                    title={player.name}
                    className="mt-0.5 bg-slate-950/95 border border-slate-700/90 px-2 py-0.5 rounded-lg text-center shadow-lg min-w-[64px] max-w-[96px] sm:max-w-[110px]"
                  >
                    <div className="text-[9.5px] sm:text-[10.5px] font-extrabold text-white truncate leading-[1.25] tracking-tight">
                      {dualName}
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                      <div
                        className={`h-full ${
                          fitness >= 75
                            ? 'bg-emerald-400'
                            : fitness >= 55
                            ? 'bg-amber-400'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${fitness}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* شريط دكة البدلاء والاحتياط الأفقي القابل للتمرير */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black text-white">
                  دكة البدلاء والاحتياط ({nonStartingPlayers.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                اسحب أو اضغط للتبديل • اضغط على "ملف" للتفاصيل
              </span>
            </div>

            <div className="flex items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar">
              {nonStartingPlayers.map((player, idx) => {
                const isBenchSlot = idx < 7;
                const isSelected = selectedSwapId === player.id;
                const injured = isPlayerInjured(player);
                const suspended = isPlayerSuspended(player);
                const ovrStyle = getOvrColorClasses(player.overallRating);
                const fitness = Math.max(0, Math.min(100, player.fitness ?? 100));

                // حساب مدى ملاءمة هذا البديل للخانة المحددة حالياً في الملعب
                const fitWithSelected =
                  selectedSwapSlotPos && selectedSwapId !== player.id
                    ? getPositionFitScore(player, selectedSwapSlotPos)
                    : null;

                return (
                  <div
                    key={player.id}
                    draggable={!injured && !suspended}
                    onDragStart={() => setDraggedPlayerId(player.id)}
                    onDragEnd={() => {
                      setDraggedPlayerId(null);
                      setDragOverTarget(null);
                    }}
                    onClick={() => handlePlayerTap(player.id)}
                    className={`w-36 sm:w-40 shrink-0 rounded-2xl p-2.5 border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50'
                        : injured || suspended
                        ? 'bg-red-950/20 border-red-900/50 opacity-75'
                        : fitWithSelected !== null && fitWithSelected >= 88
                        ? 'bg-emerald-950/40 border-emerald-500/70'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-black font-mono tabular-nums px-1.5 py-0.2 rounded border ${ovrStyle.badgeBg} ${ovrStyle.badgeText} ${ovrStyle.badgeBorder}`}
                      >
                        {player.overallRating}
                      </span>
                      <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {player.position}
                      </span>
                    </div>

                    <div className="my-1.5 flex items-center gap-2">
                      <PlayerAvatar
                        player={player}
                        primaryColor={userClub.primaryColor}
                        secondaryColor={userClub.secondaryColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          title={player.name}
                          className="text-[11.5px] sm:text-xs font-extrabold text-white truncate leading-snug tracking-tight"
                        >
                          {formatPlayerDualName(player.name)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums mt-0.5">
                          <span dir="ltr" className="inline-block text-slate-300 font-bold">#{player.number}</span> •{' '}
                          <span dir="ltr" className="inline-block">{fitness}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-800/80">
                      {injured ? (
                        <span className="text-[9px] text-red-400 font-bold flex items-center gap-0.5">
                          <Bandage className="w-2.5 h-2.5" /> مصاب
                        </span>
                      ) : suspended ? (
                        <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" /> موقوف
                        </span>
                      ) : fitWithSelected !== null ? (
                        <span
                          className={`text-[9px] font-bold ${
                            fitWithSelected >= 70 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {fitWithSelected >= 88
                            ? 'مركز مطابق ★'
                            : fitWithSelected >= 70
                            ? 'مناسب للخط'
                            : 'خارج المركز !'}
                        </span>
                      ) : (
                        <span
                          className={`text-[9px] font-bold ${
                            isBenchSlot ? 'text-sky-400' : 'text-slate-500'
                          }`}
                        >
                          {isBenchSlot ? `بديل #${idx + 1}` : 'احتياط'}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlayer(player);
                        }}
                        className="text-[9px] text-slate-400 hover:text-white underline"
                      >
                        ملف
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2) تبويب الخطة والتعليمات ==================== */}
      {activeSubTab === 'tactics' && (
        <div className="space-y-3">
          {/* أزرار التقسيم السريعة (Segmented Controls) للعقلية والتمرير والضغط */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3.5">
            {/* 1. العقلية التكتيكية */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  العقلية التكتيكية
                </span>
                <span className="text-[10px] text-slate-400">
                  {tactics.mentality === 'ultra_attacking' || tactics.mentality === 'attacking'
                    ? 'هجوم + / دفاع -'
                    : tactics.mentality === 'ultra_defensive' || tactics.mentality === 'defensive'
                    ? 'دفاع + / هجوم -'
                    : 'توازن الخطوط'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'ultra_defensive', label: 'تحفظ شديد' },
                  { id: 'defensive', label: 'دفاعية' },
                  { id: 'balanced', label: 'متوازنة' },
                  { id: 'attacking', label: 'هجومية' },
                  { id: 'ultra_attacking', label: 'اندفاع كامل' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTacticChange('mentality', item.id)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      tactics.mentality === item.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. أسلوب التمرير */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-blue-400" />
                  أسلوب التمرير
                </span>
                <span className="text-[10px] text-slate-400">
                  {tactics.passingStyle === 'short' || tactics.passingStyle === 'tiki_taka_short'
                    ? 'استحواذ + / دقة +'
                    : tactics.passingStyle === 'long_balls'
                    ? 'مرتدات سريعة +'
                    : 'متنوع ومباشر'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'short', label: 'قصير (تيكي تاكا)' },
                  { id: 'direct', label: 'مباشر متوازن' },
                  { id: 'long_balls', label: 'كرات طولية' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTacticChange('passingStyle', item.id)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      tactics.passingStyle === item.id
                        ? 'bg-blue-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. شدة الضغط */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-red-400" />
                  شدة الضغط البدني
                </span>
                <span className="text-[10px] text-slate-400">
                  {tactics.pressingIntensity === 'high' || tactics.pressingIntensity === 'gegenpress'
                    ? 'افتكاك + / استهلاك لياقة -'
                    : tactics.pressingIntensity === 'low'
                    ? 'توفير لياقة +'
                    : 'ضغط متوازن'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'low', label: 'منخفض' },
                  { id: 'balanced', label: 'متوازن' },
                  { id: 'high', label: 'ضغط عالٍ' },
                  { id: 'gegenpress', label: 'عكسي خانق' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTacticChange('pressingIntensity', item.id)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      tactics.pressingIntensity === item.id
                        ? 'bg-red-500 text-white font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* الهوية التكتيكية (16 أسلوباً مع قفل الرخص التدريبية) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-emerald-400" />
                الهوية التكتيكية ({Object.keys(ALL_TACTICAL_STYLES).length} أسلوباً)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                النشط: {activeStyleDef?.nameArabic}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-0.5">
              {Object.values(ALL_TACTICAL_STYLES).map((style) => {
                const access = getStyleAccess(style.id, manager, seasonNum);
                const unlocked = access !== 'locked';
                const isSelected = (tactics.tacticalStyle || 'total_football') === style.id;
                const reqLicenseName = getLicenseNameAr(style.minLicense);

                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleSelectTacticalStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-md'
                        : unlocked
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-950/30 border-slate-800/50 text-slate-500 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{style.nameArabic}</span>
                      {!unlocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {style.descArabic}
                    </p>
                    {!unlocked && (
                      <span className="mt-1.5 inline-block text-[9px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.5 rounded">
                        مطلوب {reqLicenseName} أو دورة 🎓
                      </span>
                    )}
                    {access === 'course' && (
                      <span className="mt-1.5 inline-block text-[9px] font-bold text-violet-300 bg-violet-950/60 border border-violet-700/50 px-1.5 py-0.5 rounded">
                        مفتوح بدورة 🎓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* الملخص التكتيكي الديناميكي المبني مباشرة من ALL_TACTICAL_STYLES لجميع الأنماط الـ 16 */}
          {activeStyleDef && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  التحليل التكتيكي لأسلوب: {activeStyleDef.nameArabic}
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  {getLicenseNameAr(activeStyleDef.minLicense)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-950/30 border border-emerald-800/50 p-2.5 rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      نقاط القوة والتفوق المضاد
                    </span>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {activeStyleDef.counterAdvantageArabic}
                    </p>
                  </div>
                </div>
                <div className="bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold block">
                      تحذير عدم التوافق والمخاطر
                    </span>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {activeStyleDef.mismatchWarningArabic}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* قسم التعليمات المتقدمة القابل للطي */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedInstructions((prev) => !prev)}
              className="w-full p-3.5 flex items-center justify-between text-xs font-black text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                <span>تعليمات متقدمة (بناء اللعب، مصيدة الضغط، أدوار الأظهرة والهجوم)</span>
              </span>
              {showAdvancedInstructions ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showAdvancedInstructions && (
              <div className="p-3.5 pt-0 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">
                    أسلوب بناء اللعب من الخلف
                  </label>
                  <select
                    value={tactics.buildUpStyle || 'standard'}
                    onChange={(e) => handleTacticChange('buildUpStyle', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="standard">بناء لعب متوازن</option>
                    <option value="from_back">تمريرات قصيرة من الخلف</option>
                    <option value="patient">تدوير صبور للكرة</option>
                    <option value="direct_pivot">تمرير مباشر للمحور</option>
                    <option value="channel_balls">كرات طولية في القنوات</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">
                    منطقة مصيدة الضغط
                  </label>
                  <select
                    value={tactics.pressingTrap || 'none'}
                    onChange={(e) => handleTacticChange('pressingTrap', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="none">ضغط تقليدي متوازن</option>
                    <option value="trap_wings">مصيدة الأطراف</option>
                    <option value="trap_center">مصيدة العمق</option>
                    <option value="zonal_trap">مصيدة المناطق المتقدمة</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">
                    أدوار الأظهرة (RB / LB)
                  </label>
                  <select
                    value={tactics.fullbackRole || 'standard'}
                    onChange={(e) => handleTacticChange('fullbackRole', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="standard">تقدم متوازن حسب الموقف</option>
                    <option value="overlapping">تقدم هجومي مستمر على الأطراف</option>
                    <option value="inverted">أظهرة وهمية للعمق (Inverted)</option>
                    <option value="stay_back">بقاء في الدفاع لتأمين الخلف</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">
                    دور رأس الحربة (ST)
                  </label>
                  <select
                    value={tactics.strikerRole || 'advanced_forward'}
                    onChange={(e) => handleTacticChange('strikerRole', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="advanced_forward">مهاجم صريح متقدم</option>
                    <option value="poacher">قناص داخل الصندوق (Poacher)</option>
                    <option value="target_man">محطة هجومية للكرات العالية</option>
                    <option value="false_9">مهاجم وهمي ساقط للوسط (False 9)</option>
                    <option value="pressing_forward">مهاجم ضاغط</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 3) تبويب الأدوار والكرات الثابتة ==================== */}
      {activeSubTab === 'roles' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              تعيين القائد ومتخصصي الكرات الثابتة
            </h3>
            <span className="text-[10px] text-slate-400">
              مع ترشيح تلقائي لأفضل 3 لاعبين لكل دور
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                key: 'captainId' as const,
                label: 'قائد الفريق (الكابتن)',
                badge: 'C',
                scoreFn: (p: Player) => p.overallRating * 2 + p.age * 1.5,
                statLabel: (p: Player) => `OVR ${p.overallRating} • ${p.age} سنة`,
              },
              {
                key: 'penaltyTakerId' as const,
                label: 'مسدد ركلات الجزاء',
                badge: 'PK',
                scoreFn: (p: Player) => (p.attributes?.shooting || 50) * 2 + p.overallRating,
                statLabel: (p: Player) => `تسديد ${p.attributes?.shooting || 50}`,
              },
              {
                key: 'freeKickTakerId' as const,
                label: 'مسدد الركلات الحرة',
                badge: 'FK',
                scoreFn: (p: Player) =>
                  (p.attributes?.shooting || 50) + (p.attributes?.passing || 50),
                statLabel: (p: Player) =>
                  `تسديد ${p.attributes?.shooting || 50} • تمرير ${p.attributes?.passing || 50}`,
              },
              {
                key: 'cornerTakerId' as const,
                label: 'منفذ الركنيات',
                badge: 'CK',
                scoreFn: (p: Player) => (p.attributes?.passing || 50) * 2 + p.overallRating,
                statLabel: (p: Player) => `تمرير ${p.attributes?.passing || 50}`,
              },
            ].map((role) => {
              const currentPlayer =
                allPlayers.find((p) => p.id === tactics[role.key]) || allPlayers[0];
              const topCandidates = [...allPlayers]
                .filter((p) => p.positionCategory !== 'GK' || role.key === 'captainId')
                .sort((a, b) => role.scoreFn(b) - role.scoreFn(a))
                .slice(0, 3);

              return (
                <div
                  key={role.key}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{role.label}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black font-mono text-[10px]">
                      {role.badge}
                    </span>
                  </div>

                  {currentPlayer && (
                    <div className="flex items-center gap-2.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <PlayerAvatar
                        player={currentPlayer}
                        primaryColor={userClub.primaryColor}
                        secondaryColor={userClub.secondaryColor}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-extrabold text-white truncate tracking-tight">
                          {formatPlayerDualName(currentPlayer.name)}{' '}
                          <span dir="ltr" className="inline-block font-mono text-slate-400 font-bold">
                            (#{currentPlayer.number})
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {role.statLabel(currentPlayer)}
                        </div>
                      </div>
                    </div>
                  )}

                  <select
                    value={tactics[role.key] || ''}
                    onChange={(e) => handleTacticChange(role.key, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                  >
                    {allPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPlayerDualName(p.name)} (#{p.number} - {p.position}) — {role.statLabel(p)}
                      </option>
                    ))}
                  </select>

                  {/* أفضل 3 مرشحين مقترحين */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">أفضل المرشحين:</span>
                    <div className="flex flex-wrap gap-1">
                      {topCandidates.map((cand) => (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => handleTacticChange(role.key, cand.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            tactics[role.key] === cand.id
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {formatPlayerDualName(cand.name)} ({role.statLabel(cand)})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== نافذة اختيار التشكيلة (Bottom Sheet) ==================== */}
      {formationSheetOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            dir="rtl"
          >
            <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-4 space-y-3 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-white">
                    اختر خطة الانتشار ({totalFormationsCount} تشكيلة)
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    يتم إعادة توزيع اللاعبين الأساسيين تلقائياً حسب مراكز التشكيلة الجديدة
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormationSheetOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* فلاتر فئات التشكيلات */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'ALL', label: 'الكل' },
                  { id: 'BAL_4', label: 'متوازنة (4 دفاع)' },
                  { id: 'ATK_3', label: 'هجومية (3 دفاع)' },
                  { id: 'DEF_5', label: 'دفاعية (5 دفاع)' },
                  { id: 'ELITE', label: 'نخبوية (برخصة متقدمة)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormationCatFilter(cat.id as FormationCategoryFilter)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      formationCatFilter === cat.id
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* شبكة التشكيلات مع معاينة مصغرة لنقاط الـ 11 لاعباً */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto pr-0.5 flex-1">
                {filteredFormationDefinitions.map((fDef) => {
                  const fAccess = getFormationAccess(fDef.id, manager, seasonNum);
                  const unlocked = fAccess !== 'locked';
                  const isCurrent = currentFormation === fDef.id;
                  const fSlots = FORMATION_SLOTS[fDef.id] || FORMATION_SLOTS['4-3-3'];
                  const reqLicenseName = getLicenseNameAr(fDef.minLicense);

                  return (
                    <button
                      key={fDef.id}
                      type="button"
                      onClick={() => handleSelectFormation(fDef.id)}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg'
                          : unlocked
                          ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200'
                          : 'bg-slate-950/40 border-slate-800/50 text-slate-500 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-mono font-black text-xs text-emerald-400">
                          {fDef.id}
                        </span>
                        {!unlocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      </div>

                      <div className="text-[11px] font-bold truncate mt-0.5">
                        {fDef.nameArabic}
                      </div>

                      {/* معاينة مصغرة للملعب (11 نقطة) */}
                      <div className="relative w-full h-16 bg-emerald-950/70 border border-emerald-800/40 rounded-lg my-1.5 overflow-hidden">
                        {fSlots.map((s, idx) => (
                          <span
                            key={idx}
                            style={{ top: `${s.top}%`, left: `${s.left}%` }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                              s.pos === 'GK' ? 'bg-amber-400' : 'bg-emerald-300'
                            }`}
                          />
                        ))}
                      </div>

                      {!unlocked ? (
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-950/70 border border-amber-800/50 px-1.5 py-0.5 rounded block text-center">
                          مطلوب {reqLicenseName} أو دورة 🎓
                        </span>
                      ) : fAccess === 'course' ? (
                        <span className="text-[9px] font-bold text-violet-300 bg-violet-950/60 border border-violet-700/50 px-1.5 py-0.5 rounded block text-center">
                          مفتوحة بدورة 🎓
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 truncate block">
                          {fDef.strengthsArabic}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ==================== نافذة ملء الخانة الشاغرة (Empty Slot Picker) ==================== */}
      {emptySlotPickerIdx !== null && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            dir="rtl"
          >
            <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-white">
                    اختر لاعباً لمركز {slots[emptySlotPickerIdx]?.pos} (
                    {getPositionArabic((slots[emptySlotPickerIdx]?.pos || 'CM') as any)})
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    مرتبون حسب مدى الملاءمة للمركز والتقييم واللياقة
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEmptySlotPickerIdx(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 overflow-y-auto flex-1">
                {[...nonStartingPlayers]
                  .filter((p) => !isPlayerInjured(p) && !isPlayerSuspended(p))
                  .sort((a, b) => {
                    const targetPos = slots[emptySlotPickerIdx]?.pos || 'CM';
                    const scoreA =
                      getPositionFitScore(a, targetPos) * 10 + a.overallRating * 2 + a.fitness * 0.2;
                    const scoreB =
                      getPositionFitScore(b, targetPos) * 10 + b.overallRating * 2 + b.fitness * 0.2;
                    return scoreB - scoreA;
                  })
                  .map((cand) => {
                    const targetPos = slots[emptySlotPickerIdx]?.pos || 'CM';
                    const fit = getPositionFitScore(cand, targetPos);
                    return (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => assignPlayerToSlotIndex(emptySlotPickerIdx, cand)}
                        className="w-full p-2.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between gap-2 text-right transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <PlayerAvatar
                            player={cand}
                            primaryColor={userClub.primaryColor}
                            secondaryColor={userClub.secondaryColor}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-white truncate tracking-tight">
                              {formatPlayerDualName(cand.name)}{' '}
                              <span dir="ltr" className="inline-block font-mono text-slate-400 font-bold">
                                (#{cand.number})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              المركز: {cand.position} • اللياقة: {cand.fitness}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              fit >= 88
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                : fit >= 70
                                ? 'bg-sky-950 text-sky-300 border border-sky-700'
                                : 'bg-amber-950 text-amber-300 border border-amber-700'
                            }`}
                          >
                            {fit >= 88 ? 'مطابق تماماً' : fit >= 70 ? 'نفس الخط' : 'خارج المركز'}
                          </span>
                          <span className="font-mono font-black text-xs text-emerald-400">
                            {cand.overallRating}
                          </span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ==================== نافذة تأكيد "أفضل تشكيل" ==================== */}
      {confirmAutoPickOpen && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            dir="rtl"
          >
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white">
                  تعيين أفضل تشكيل تلقائياً ({currentFormation})؟
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  سيقوم المساعد الفني باختيار أفضل 11 لاعباً أساسياً و7 بدلاء أصحاء وفقاً لمراكز التشكيلة الحالية واللياقة البدنية. يمكنك التراجع بزر "تراجع" بعد التنفيذ.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteAutoPick}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs cursor-pointer"
                >
                  نعم، رتّب التشكيل
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAutoPickOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
