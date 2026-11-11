import React, { useState, useMemo, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Club, Player, PositionCategory } from '../types/game';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
import { PlayerCard } from './PlayerCard';
import { PlayerAvatar } from './PlayerAvatar';
import { useLazyList } from '../utils/useLazyList';
import { ModalPortal } from './common/ModalPortal';
import {
  MAX_SQUAD_SIZE,
  isPlayerInjured,
  isPlayerSuspended,
  getEffectiveLineup,
  getFlagEmoji,
  formatMoney,
  getClubCurrencySymbol,
  getOvrColorClasses,
  formatPlayerDualName,
} from '../utils/squadHelpers';
import {
  Users,
  Search,
  ArrowUpDown,
  Activity,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Shield,
  Sparkles,
  Bandage,
  Coins,
  Wallet,
  Gift,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
} from 'lucide-react';

interface SquadTabProps {
  onSelectPlayer: (player: Player) => void;
}

interface SquadPlayerRowProps {
  player: Player;
  club: Club;
  isStarter: boolean;
  isBench: boolean;
  isCaptain: boolean;
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent, playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenSingleBonus: (e: React.MouseEvent, player: Player) => void;
}

/** صف اللاعب في القائمة (مغلف بـ React.memo لتقليل عمليات إعادة الرندرة على الموبايل) */
const SquadPlayerRow = React.memo<SquadPlayerRowProps>(
  ({
    player,
    club,
    isStarter,
    isBench,
    isCaptain,
    isExpanded,
    onToggleExpand,
    onSelectPlayer,
    onOpenSingleBonus,
  }) => {
    const injured = isPlayerInjured(player);
    const suspended = isPlayerSuspended(player);
    const ovrStyle = getOvrColorClasses(player.overallRating);
    const flag = getFlagEmoji(player.nationalityCode, player.nationality);
    const fitness = Math.max(0, Math.min(100, player.fitness ?? 100));
    const dualName = formatPlayerDualName(player.name);

    // شارة حالة واحدة واضحة لكل صف
    let statusBadge: { label: string; className: string };
    if (injured) {
      statusBadge = {
        label: `مصاب (${player.injury?.daysRemaining || 3}ي)`,
        className: 'bg-red-950/90 text-red-300 border-red-700/80',
      };
    } else if (suspended) {
      statusBadge = {
        label: `موقوف (${player.suspensionMatches || 1}م)`,
        className: 'bg-amber-950/90 text-amber-300 border-amber-700/80',
      };
    } else if (isStarter) {
      statusBadge = {
        label: 'أساسي',
        className: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80',
      };
    } else if (isBench) {
      statusBadge = {
        label: 'دكة',
        className: 'bg-sky-950/90 text-sky-300 border-sky-700/80',
      };
    } else {
      statusBadge = {
        label: 'احتياط',
        className: 'bg-slate-800/90 text-slate-400 border-slate-700/80',
      };
    }

    return (
      <div
        style={{ contentVisibility: 'auto', containIntrinsicSize: '68px' }}
        className="bg-slate-900/85 border border-slate-800 hover:border-slate-700/80 rounded-2xl transition-all overflow-hidden"
      >
        {/* الصف الرئيسي المدمج (سطران فقط) */}
        <div
          onClick={() => onSelectPlayer(player)}
          className="p-2.5 sm:p-3 cursor-pointer flex items-center justify-between gap-2 active:bg-slate-800/60"
        >
          {/* اليمين: شارة التقييم + الأفاتار + الاسم الأول والثاني والمركز */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* مربع التقييم الملون حسب الفئة */}
            <div
              className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-black font-mono tabular-nums border shadow-sm shrink-0 ${ovrStyle.badgeBg} ${ovrStyle.badgeText} ${ovrStyle.badgeBorder}`}
              title={`التقييم العام: ${player.overallRating}`}
            >
              <span className="text-[7px] font-bold leading-none opacity-80">OVR</span>
              <span className="text-xs leading-tight">{player.overallRating}</span>
            </div>

            {/* أفاتار اللاعب */}
            <div className="relative shrink-0">
              <PlayerAvatar
                player={player}
                primaryColor={club.primaryColor}
                secondaryColor={club.secondaryColor}
                size="sm"
              />
              {isCaptain && (
                <span
                  title="قائد الفريق"
                  className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center border border-slate-950 shadow"
                >
                  C
                </span>
              )}
            </div>

            {/* سطر الاسم الأول والثاني + سطر المركز والعمر والعلم */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  title={player.name}
                  className="font-extrabold text-[13px] sm:text-sm text-white tracking-tight leading-snug truncate"
                >
                  {dualName}
                </span>
                <span
                  dir="ltr"
                  className="text-[10px] text-emerald-400/90 font-mono font-bold tabular-nums bg-slate-950/80 px-1.5 py-0.2 rounded border border-slate-800 shrink-0"
                >
                  #{player.number}
                </span>
                {player.isGuestStar && (
                  <span title="نجم عالمي ضيف" className="inline-flex shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-300 font-semibold">
                <span
                  className={`text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ${getPositionBadgeClass(
                    player.position
                  )}`}
                >
                  {player.position}
                </span>
                <span>
                  <span dir="ltr" className="inline-block font-mono tabular-nums text-white font-bold">
                    {player.age}
                  </span>{' '}
                  سنة
                </span>
                <span className="text-xs leading-none" title={player.nationality || player.nationalityCode}>
                  {flag}
                </span>
              </div>
            </div>
          </div>

          {/* اليسار: شريط اللياقة المصغر + شارة الحالة الواحدة + زر التفاصيل */}
          <div className="flex items-center gap-2 shrink-0">
            {/* مؤشر اللياقة البدنية */}
            <div className="w-12 sm:w-14 flex flex-col items-end gap-0.5" title={`اللياقة: ${fitness}%`}>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-300">
                <Activity
                  className={`w-2.5 h-2.5 ${
                    fitness >= 80
                      ? 'text-emerald-400'
                      : fitness >= 60
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                />
                <span>{fitness}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    fitness >= 80
                      ? 'bg-emerald-500'
                      : fitness >= 60
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${fitness}%` }}
                />
              </div>
            </div>

            {/* شارة حالة واحدة فقط */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>

            {/* زر توسيع التفاصيل السريعة */}
            <button
              type="button"
              onClick={(e) => onToggleExpand(e, player.id)}
              aria-label="تفاصيل اللاعب السريعة"
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* القسم القابل للطي للتفاصيل المالية والإجراءات */}
        {isExpanded && (
          <div className="px-3 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] animate-fade-in">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="text-slate-500 block text-[9px]">المركز الكامل</span>
                <span className="font-bold text-slate-200">
                  {getPositionArabic(player.position)} ({player.position})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">القيمة السوقية</span>
                <span className="font-bold font-mono text-emerald-400">
                  {formatMoney(player.marketValue || 50000, club, true)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">الراتب الشهري</span>
                <span className="font-bold font-mono text-amber-400">
                  {formatMoney(player.salary || 2500, club, true)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">مدخرات اللاعب</span>
                <span className="font-bold font-mono text-cyan-400">
                  {formatMoney(player.savings || 0, club, true)}
                </span>
              </div>
              {injured && (
                <div className="flex items-center gap-1 text-red-300 font-bold">
                  <Bandage className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    {player.injury?.type || player.injuryType || 'إصابة'} (متبقي{' '}
                    {player.injury?.daysRemaining || 3} أيام)
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 mr-auto">
              <button
                type="button"
                onClick={(e) => onOpenSingleBonus(e, player)}
                className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Coins className="w-3 h-3 text-amber-400" />
                <span>مكافأة</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPlayer(player)}
                className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>ملف اللاعب</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export const SquadTab: React.FC<SquadTabProps> = ({ onSelectPlayer }) => {
  const { userClub, manager, addBonusToPlayer, addBonusToAllPlayers } = useGame();
  const [filterPos, setFilterPos] = useState<PositionCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'rating' | 'fitness' | 'value' | 'age' | 'salary' | 'savings'>('rating');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showFinances, setShowFinances] = useState(false);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // Bonus modal state
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusMode, setBonusMode] = useState<'single' | 'all'>('all');
  const [selectedPlayerForBonus, setSelectedPlayerForBonus] = useState<Player | null>(null);
  const [bonusAmount, setBonusAmount] = useState<number | string>(10000);
  const numBonusAmount = typeof bonusAmount === 'number' ? bonusAmount : (parseInt(bonusAmount) || 0);
  const [bonusSource, setBonusSource] = useState<'club' | 'manager'>('club');
  const [bonusFeedback, setBonusFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // جميع الـ Hooks قبل أي return مبكر
  const squadPlayers = useMemo(() => {
    if (!userClub || !Array.isArray(userClub.players)) return [];
    return userClub.players.filter((p): p is Player => Boolean(p));
  }, [userClub]);

  const { startingIds, benchIds } = useMemo(
    () => getEffectiveLineup(userClub),
    [userClub]
  );

  // أعداد اللاعبين حسب الخطوط لعرضها داخل تبويبات الفلترة
  const categoryCounts = useMemo(() => {
    const counts: Record<PositionCategory | 'ALL', number> = {
      ALL: squadPlayers.length,
      GK: 0,
      DEF: 0,
      MID: 0,
      FWD: 0,
    };
    for (const p of squadPlayers) {
      if (p.positionCategory && counts[p.positionCategory] !== undefined) {
        counts[p.positionCategory] += 1;
      }
    }
    return counts;
  }, [squadPlayers]);

  // فلترة وترتيب اللاعبين داخل useMemo مستقر الهوية
  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return squadPlayers
      .filter((player) => {
        const matchesCategory = filterPos === 'ALL' || player.positionCategory === filterPos;
        const matchesSearch =
          !q ||
          player.name.toLowerCase().includes(q) ||
          Boolean(player.nickname && player.nickname.toLowerCase().includes(q));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.overallRating - a.overallRating;
        if (sortBy === 'fitness') return b.fitness - a.fitness;
        if (sortBy === 'value') return b.marketValue - a.marketValue;
        if (sortBy === 'age') return a.age - b.age;
        if (sortBy === 'salary') return b.salary - a.salary;
        if (sortBy === 'savings') return (b.savings || 0) - (a.savings || 0);
        return 0;
      });
  }, [squadPlayers, filterPos, sortBy, searchQuery]);

  const filterResetKey = `${filterPos}|${sortBy}|${searchQuery.trim().toLowerCase()}`;

  const {
    visibleItems: displayedPlayers,
    hasMore,
    loadMore,
    sentinelRef,
    renderedCount,
    totalCount,
  } = useLazyList(filteredPlayers, {
    initialBatchSize: 15,
    batchStep: 12,
    resetKey: filterResetKey,
  });

  const handleToggleExpand = useCallback((e: React.MouseEvent, playerId: string) => {
    e.stopPropagation();
    setExpandedPlayerId((prev) => (prev === playerId ? null : playerId));
  }, []);

  const handleOpenSingleBonus = useCallback((e: React.MouseEvent, player: Player) => {
    e.stopPropagation();
    setSelectedPlayerForBonus(player);
    setBonusMode('single');
    setBonusAmount(10000);
    setBonusFeedback(null);
    setBonusModalOpen(true);
  }, []);

  // حالة المدرب الحر بدون نادٍ (بعد استدعاء كافة الـ Hooks)
  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          👥
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا يوجد لديك قائمة لاعبين حالياً لأنك غير مرتبط بعقد تدريبي مع أي نادٍ. استعرض شواغر الأندية في تبويب المسيرة لتولي تدريب فريقك القادم!
        </p>
      </div>
    );
  }

  const currencySymbol = getClubCurrencySymbol(userClub);
  const avgSquadRating =
    squadPlayers.length > 0
      ? Math.round(squadPlayers.reduce((sum, p) => sum + p.overallRating, 0) / squadPlayers.length)
      : 0;
  const avgAge =
    squadPlayers.length > 0
      ? (squadPlayers.reduce((sum, p) => sum + p.age, 0) / squadPlayers.length).toFixed(1)
      : '0';
  const totalWage = squadPlayers.reduce((sum, p) => sum + (p.salary || 0), 0);
  const totalSquadSavings = squadPlayers.reduce((sum, p) => sum + (p.savings || 0), 0);
  const avgPlayerSavings =
    squadPlayers.length > 0 ? Math.round(totalSquadSavings / squadPlayers.length) : 0;

  const handleOpenAllBonus = () => {
    setSelectedPlayerForBonus(null);
    setBonusMode('all');
    setBonusAmount(5000);
    setBonusFeedback(null);
    setBonusModalOpen(true);
  };

  const handleExecuteBonus = () => {
    if (numBonusAmount <= 0) return;
    if (bonusMode === 'single' && selectedPlayerForBonus) {
      const res = addBonusToPlayer(selectedPlayerForBonus.id, numBonusAmount, bonusSource);
      setBonusFeedback({ text: res.message, success: res.success });
      if (res.success) {
        setTimeout(() => {
          setBonusModalOpen(false);
          setBonusFeedback(null);
        }, 2200);
      }
    } else {
      const res = addBonusToAllPlayers(numBonusAmount, bonusSource);
      setBonusFeedback({ text: res.message, success: res.success });
      if (res.success) {
        setTimeout(() => {
          setBonusModalOpen(false);
          setBonusFeedback(null);
        }, 2200);
      }
    }
  };

  const totalCalculatedCost =
    bonusMode === 'all' ? numBonusAmount * squadPlayers.length : numBonusAmount;
  const currentFundingAvailable =
    bonusSource === 'club' ? userClub.budget || 0 : manager.personalWallet || 0;
  const canAffordBonus = currentFundingAvailable >= totalCalculatedCost;

  return (
    <div className="space-y-3 pb-20 animate-fade-in" dir="rtl">
      {/* شريط إحصاءات الفريق المدمج + قسم المالية والمدخرات القابل للطي */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h2 className="font-black text-sm text-white">قائمة الفريق</h2>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700 font-mono font-bold text-slate-300">
              {squadPlayers.length} / {MAX_SQUAD_SIZE}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowFinances((prev) => !prev)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
          >
            <PiggyBank className="w-3.5 h-3.5 text-amber-400" />
            <span>المالية والمكافآت</span>
            {showFinances ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* صف واحد مدمج للإحصاءات الأساسية */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950/70 px-2 py-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">معدل التقييم</span>
            <span className="text-xs font-black font-mono text-emerald-400">{avgSquadRating}</span>
          </div>
          <div className="bg-slate-950/70 px-2 py-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">معدل الأعمار</span>
            <span className="text-xs font-black font-mono text-white">{avgAge}</span>
          </div>
          <div className="bg-slate-950/70 px-2 py-1.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">الرواتب</span>
            <span className="text-xs font-black font-mono text-amber-400">
              {formatMoney(totalWage, userClub, true)}
            </span>
          </div>
        </div>

        {/* القسم القابل للطي: المالية والمدخرات وصرف المكافآت */}
        {showFinances && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <div className="flex items-center gap-1">
                <PiggyBank className="w-3.5 h-3.5 text-emerald-400" />
                <span>إجمالي مدخرات اللاعبين:</span>
                <strong className="text-emerald-400 font-mono">
                  {formatMoney(totalSquadSavings, userClub, true)}
                </strong>
              </div>
              <div className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>متوسط الرصيد:</span>
                <strong className="text-amber-300 font-mono">
                  {formatMoney(avgPlayerSavings, userClub, true)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAllBonus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>صرف مكافأة جماعية</span>
            </button>
          </div>
        )}
      </div>

      {/* شريط الفلترة والبحث الثابت (Sticky Toolbar) */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md py-2 space-y-2 border-b border-slate-800/80">
        {/* البحث + الترتيب + التبديل بين القائمة والكروت */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن اسم لاعب أو لقبه..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-8 pl-7 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 shrink-0">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 text-[11px] font-bold focus:outline-none"
            >
              <option value="rating" className="bg-slate-900">التقييم (OVR)</option>
              <option value="fitness" className="bg-slate-900">اللياقة البدنية</option>
              <option value="value" className="bg-slate-900">القيمة السوقية</option>
              <option value="salary" className="bg-slate-900">الراتب</option>
              <option value="savings" className="bg-slate-900">المدخرات</option>
              <option value="age" className="bg-slate-900">الأصغر سناً</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              قائمة
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              كروت
            </button>
          </div>
        </div>

        {/* تبويبات المراكز مع عدد اللاعبين في كل خط */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'الكل', count: categoryCounts.ALL },
            { id: 'GK', label: 'حراس', count: categoryCounts.GK },
            { id: 'DEF', label: 'دفاع', count: categoryCounts.DEF },
            { id: 'MID', label: 'وسط', count: categoryCounts.MID },
            { id: 'FWD', label: 'هجوم', count: categoryCounts.FWD },
          ].map((tab) => {
            const active = filterPos === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterPos(tab.id as PositionCategory | 'ALL')}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    active ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* عرض الكروت أو القائمة المدمجة */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 justify-items-center">
            {displayedPlayers.map((player) => {
              const isStarter = startingIds.includes(player.id);
              const isBench = benchIds.includes(player.id);
              return (
                <div key={player.id} className="flex flex-col items-center gap-1.5">
                  <PlayerCard
                    player={player}
                    club={userClub}
                    size="sm"
                    isCaptain={userClub.tactics?.captainId === player.id}
                    onClick={() => onSelectPlayer(player)}
                  />
                  <div className="flex items-center gap-1 text-[10px]">
                    {isPlayerInjured(player) ? (
                      <span className="text-red-300 font-bold bg-red-950/70 px-2 py-0.5 rounded border border-red-800/50">
                        مصاب
                      </span>
                    ) : isPlayerSuspended(player) ? (
                      <span className="text-amber-300 font-bold bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/50">
                        موقوف
                      </span>
                    ) : isStarter ? (
                      <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                        أساسي
                      </span>
                    ) : isBench ? (
                      <span className="text-sky-300 font-bold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                        دكة
                      </span>
                    ) : (
                      <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        احتياط
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="py-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>عرض المزيد من اللاعبين ({renderedCount} من {totalCount})</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedPlayers.map((player) => (
            <SquadPlayerRow
              key={player.id}
              player={player}
              club={userClub}
              isStarter={startingIds.includes(player.id)}
              isBench={benchIds.includes(player.id)}
              isCaptain={userClub.tactics?.captainId === player.id}
              isExpanded={expandedPlayerId === player.id}
              onToggleExpand={handleToggleExpand}
              onSelectPlayer={onSelectPlayer}
              onOpenSingleBonus={handleOpenSingleBonus}
            />
          ))}

          {hasMore && (
            <div ref={sentinelRef} className="py-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>عرض المزيد من اللاعبين ({renderedCount} من {totalCount})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* نافذة صرف المكافآت */}
      {bonusModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      {bonusMode === 'single'
                        ? `صرف مكافأة لـ: ${selectedPlayerForBonus?.name}`
                        : 'صرف مكافأة جماعية لجميع اللاعبين'}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {bonusMode === 'single'
                        ? 'زيادة رصيد اللاعب ورفع معنوياته'
                        : `صرف موحد لعدد ${squadPlayers.length} لاعباً بالفريق`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBonusModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setBonusMode('all')}
                  className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    bonusMode === 'all'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>الفريق كاملاً ({squadPlayers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBonusMode('single');
                    if (!selectedPlayerForBonus && squadPlayers.length > 0) {
                      setSelectedPlayerForBonus(squadPlayers[0]);
                    }
                  }}
                  className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                    bonusMode === 'single'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>لاعب محدد</span>
                </button>
              </div>

              {bonusMode === 'single' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold block">اختر اللاعب المستفيد:</label>
                  <select
                    value={selectedPlayerForBonus?.id || ''}
                    onChange={(e) => {
                      const p = squadPlayers.find((pl) => pl.id === e.target.value);
                      if (p) setSelectedPlayerForBonus(p);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {squadPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (#{p.number} - {getPositionArabic(p.position)}) | رصيده:{' '}
                        {formatMoney(p.savings || 0, userClub)}
                      </option>
                    ))}
                  </select>

                  {selectedPlayerForBonus && (
                    <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block text-[10px]">الرصيد الشخصي الحالي</span>
                        <span className="font-bold font-mono text-emerald-400">
                          {formatMoney(selectedPlayerForBonus.savings || 0, userClub)}
                        </span>
                      </div>
                      <div className="text-left">
                        <span className="text-slate-400 block text-[10px]">إجمالي المكافآت السابقة</span>
                        <span className="font-bold font-mono text-amber-400">
                          {formatMoney(selectedPlayerForBonus.totalBonusesReceived || 0, userClub)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold block">جهة تمويل المكافأة:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setBonusSource('club')}
                    className={`p-2.5 rounded-2xl border text-right transition-all ${
                      bonusSource === 'club'
                        ? 'bg-blue-950/60 border-blue-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1 text-blue-300">
                      <Shield className="w-3 h-3" />
                      ميزانية النادي
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono block mt-1">
                      {formatMoney(userClub.budget || 0, userClub)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBonusSource('manager')}
                    className={`p-2.5 rounded-2xl border text-right transition-all ${
                      bonusSource === 'manager'
                        ? 'bg-amber-950/60 border-amber-500 text-white'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1 text-amber-300">
                      <Wallet className="w-3 h-3" />
                      محفظتك الشخصية
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono block mt-1">
                      {formatMoney(manager.personalWallet || 0, userClub)}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold block">
                  {bonusMode === 'all' ? 'المبلغ المخصص لكل لاعب:' : 'قيمة المكافأة:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5000, 10000, 25000, 50000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBonusAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        numBonusAmount === amt
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={bonusAmount}
                    onChange={(e) =>
                      setBonusAmount(
                        e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                    onBlur={() => {
                      if (bonusAmount === '' || Number(bonusAmount) <= 0) setBonusAmount(5000);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    placeholder={`أو أدخل مبلغاً مخصصاً (${currencySymbol})...`}
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>المبلغ لكل لاعب:</span>
                  <span className="font-mono text-white font-bold">
                    {formatMoney(numBonusAmount, userClub)}
                  </span>
                </div>
                {bonusMode === 'all' && (
                  <div className="flex items-center justify-between text-slate-400">
                    <span>عدد اللاعبين:</span>
                    <span className="font-mono text-white font-bold">
                      {squadPlayers.length} لاعبين
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-1.5 font-bold">
                  <span>التكلفة الإجمالية المطلوبة:</span>
                  <span className="font-mono text-amber-400 text-sm font-black">
                    {formatMoney(totalCalculatedCost, userClub)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>المتاح في المصدر المختار:</span>
                  <span
                    className={`font-mono font-bold ${
                      canAffordBonus ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatMoney(currentFundingAvailable, userClub)}
                  </span>
                </div>
              </div>

              {bonusFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    bonusFeedback.success
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  {bonusFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{bonusFeedback.text}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExecuteBonus}
                  disabled={!canAffordBonus || numBonusAmount <= 0}
                  className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                    canAffordBonus && numBonusAmount > 0
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 active:scale-98'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    {canAffordBonus ? 'تأكيد وصرف المكافأة فوراً' : 'الرصيد المتاح غير كافٍ'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBonusModalOpen(false)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs"
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
