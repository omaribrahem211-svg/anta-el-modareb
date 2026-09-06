import React, { useState } from 'react';
import { Player, PlayerAttributes } from '../types/game';
import { useGame } from '../context/GameContext';
import { calculateAskingPrice, getPlayerTransferStatus, resolveClubInfo } from '../utils/transferEngine';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
import {
  X,
  Zap,
  Target,
  Share2,
  Shield,
  Activity,
  Heart,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  Award,
  AlertCircle,
  Briefcase,
  ShieldAlert,
  Clock,
  Building2,
  Trophy,
  Bandage,
  Stethoscope,
  Coins,
  PiggyBank,
  Gift,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

interface PlayerModalProps {
  player: Player | null;
  onClose: () => void;
  onStartNegotiation?: (player: Player) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ player, onClose, onStartNegotiation }) => {
  const {
    setPlayerTrainingFocus,
    renewPlayerContract,
    boostPlayerMorale,
    sellPlayer,
    userClub,
    manager,
    teams,
    activeNegotiations,
    developmentPoints,
    upgradePlayerAttribute,
    boostPlayerOverall,
    boostPlayerPotential,
    boostPlayerCondition,
    addBonusToPlayer,
    dayAdvanceSummary,
  } = useGame();
  const [talkCooldown, setTalkCooldown] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Direct Player Bonus State
  const [bonusInputAmount, setBonusInputAmount] = useState<number>(10000);
  const [bonusFundingSource, setBonusFundingSource] = useState<'club' | 'manager'>('club');
  const [showBonusRow, setShowBonusRow] = useState(false);

  if (!player) return null;

  const isSquadPlayer = Boolean(
    userClub?.id && (player.currentClubId === userClub.id || (userClub.players || []).some(p => p && p.id === player.id))
  );

  const rawClub = teams.find(t => t && (t.id === player.currentClubId || (t.players || []).some(p => p && p.id === player.id)));
  const safeClubInfo = resolveClubInfo(player.currentClubId || rawClub?.id, (player as any).currentClubName || rawClub?.name, teams);
  const playerClub = rawClub || safeClubInfo.club;
  const { askingPrice, loanFee } = calculateAskingPrice(player, playerClub);
  const statusInfo = getPlayerTransferStatus(player, playerClub, activeNegotiations, userClub?.id);

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-amber-400 border-amber-500 bg-amber-950/60';
    if (rating >= 70) return 'text-emerald-400 border-emerald-500 bg-emerald-950/50';
    if (rating >= 60) return 'text-cyan-400 border-cyan-500 bg-cyan-950/50';
    if (rating >= 53) return 'text-blue-400 border-blue-500 bg-blue-950/50';
    return 'text-slate-300 border-slate-500 bg-slate-800/50';
  };

  const getPositionBadge = (pos: string) => {
    if (pos === 'GK') return 'bg-amber-950 text-amber-300 border-amber-700/60';
    if (['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(pos)) return 'bg-blue-950 text-blue-300 border-blue-700/60';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
    return 'bg-red-950 text-red-300 border-red-700/60';
  };

  const handleBoostMorale = () => {
    if (talkCooldown) return;
    boostPlayerMorale(player.id);
    setTalkCooldown(true);
    setNotification({ text: `تحدثت مع ${player.name} وحفزته! زادت معنوياته بشكل ملحوظ.`, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRenew = () => {
    const proposedWage = Math.round(player.salary * 1.15);
    const res = renewPlayerContract(player.id, proposedWage, 2);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSell = () => {
    const res = sellPlayer(player.id);
    if (res.success) {
      onClose();
    } else {
      setNotification({ text: res.message, type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const attrList = [
    { label: 'السرعة والانطلاق', val: player.attributes.pace, icon: Zap, color: 'bg-amber-500' },
    { label: 'التسديد والإنهاء', val: player.attributes.shooting, icon: Target, color: 'bg-red-500' },
    { label: 'التمرير والرؤية', val: player.attributes.passing, icon: Share2, color: 'bg-emerald-500' },
    { label: 'المراوغة والتحكم', val: player.attributes.dribbling, icon: Activity, color: 'bg-purple-500' },
    { label: 'التدخلات والدفاع', val: player.attributes.defending, icon: Shield, color: 'bg-blue-500' },
    { label: 'القوة والالتحام', val: player.attributes.physical, icon: TrendingUp, color: 'bg-orange-500' },
    ...(player.attributes.goalkeeping ? [{ label: 'حراسة المرمى والتصدي', val: player.attributes.goalkeeping, icon: Award, color: 'bg-cyan-500' }] : []),
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center font-black shrink-0 ${getRatingColor(player.overallRating)}`}>
              <span className="text-xl leading-none">{player.overallRating}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">{player.position}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl text-white break-words leading-tight">{player.name}</h3>
                {player.number && (
                  <span className="text-xs text-slate-400 font-mono bg-slate-850 border border-slate-700 px-1.5 py-0.5 rounded-md">
                    #{player.number}
                  </span>
                )}
              </div>
              {player.nickname && (
                <div className="text-xs text-amber-400 font-bold mt-0.5">"{player.nickname}"</div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${getPositionBadgeClass(player.position)}`}>
                  {getPositionArabic(player.position)} ({player.position})
                </span>
                <span className="text-xs text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                  {player.nationality ? `${player.nationalityCode ? `${player.nationalityCode === 'EGY' ? '🇪🇬' : player.nationalityCode === 'SAU' ? '🇸🇦' : player.nationalityCode === 'UAE' ? '🇦🇪' : player.nationalityCode === 'QAT' ? '🇶🇦' : player.nationalityCode === 'MAR' ? '🇲🇦' : player.nationalityCode === 'TUN' ? '🇹🇳' : player.nationalityCode === 'ALG' ? '🇩🇿' : player.nationalityCode === 'ESP' ? '🇪🇸' : player.nationalityCode === 'ENG' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : player.nationalityCode === 'FRA' ? '🇫🇷' : player.nationalityCode === 'ITA' ? '🇮🇹' : player.nationalityCode === 'GER' ? '🇩🇪' : player.nationalityCode === 'BRA' ? '🇧🇷' : player.nationalityCode === 'ARG' ? '🇦🇷' : '🌐'} ` : ''}${player.nationality}` : '🇪🇬 مصر'}
                </span>
                {player.preferredFoot && (
                  <span className="text-[11px] text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded-md">
                    {player.preferredFoot === 'left' ? 'القدم اليسرى' : player.preferredFoot === 'both' ? 'كلتا القدمين' : 'القدم اليمنى'}
                  </span>
                )}
                {player.personality && (
                  <span className="text-[11px] text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded-md">
                    {player.personality === 'leader' ? 'قائد بالفطرة' : player.personality === 'ambitious' ? 'طموح للغاية' : player.personality === 'loyal' ? 'وفي للنادي' : player.personality === 'professional' ? 'محترف منضبط' : player.personality === 'determined' ? 'عزيمة فولاذية' : 'متحمس وانفعالي'}
                  </span>
                )}
                <span className="text-xs text-slate-400">{player.age} سنة</span>
                <span className="text-xs text-slate-400">• القدرة المحتملة: <strong className="text-emerald-400 font-bold">{player.potentialRating || player.overallRating}</strong></span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`p-2.5 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
          }`}>
            <AlertCircle className="w-4 h-4" />
            <span>{notification.text}</span>
          </div>
        )}

        {/* Club, League & Transfer Status Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-cyan-400" />
              النادي الحالي
            </span>
            <span className="font-bold text-slate-100 truncate mt-0.5">
              {playerClub ? playerClub.name : safeClubInfo.clubName}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              حالة الانتقال
            </span>
            <span className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded-md border mt-0.5 w-fit ${statusInfo.statusColor}`}>
              {statusInfo.statusLabel}
            </span>
          </div>

          <div className="flex flex-col col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              مدة العقد
            </span>
            <span className="font-bold text-slate-200 mt-0.5">
              {player.contractYears && player.contractYears > 0 ? `${player.contractYears} سنوات متبقية` : 'حر / منتهي العقد'}
            </span>
          </div>
        </div>

        {/* Injury Alert if applicable */}
        {(player.isInjured || (player.injury && player.injury.daysRemaining > 0)) && (
          <div className="bg-red-950/80 border border-red-700/80 p-3 rounded-2xl flex items-center justify-between gap-2.5 text-xs text-red-200 shadow-lg">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold text-red-300">حالة اللاعب الطبية: </span>
                <span>{player.injury?.type || player.injuryType || 'إصابة عضلية'} (متبقي {player.injury?.daysRemaining || 3} يوم للتعافي)</span>
              </div>
            </div>
            <span className="text-[10px] bg-red-900/60 text-red-200 border border-red-700 px-2 py-0.5 rounded-full font-bold">
              في المستشفى 🏥
            </span>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 text-center">
          <div>
            <span className="text-[10px] text-slate-400">الجاهزية واللياقة</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-bold text-white">{player.fitness || 100}%</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full rounded-full ${(player.fitness || 100) > 80 ? 'bg-emerald-500' : (player.fitness || 100) > 60 ? 'bg-amber-500' : 'bg-red-500'}`} 
                style={{ width: `${player.fitness || 100}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400">المعنويات</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Heart className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-white">{player.morale || 85}%</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full rounded-full ${(player.morale || 85) > 75 ? 'bg-red-500' : 'bg-amber-500'}`} 
                style={{ width: `${player.morale || 85}%` }}
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400">المستوى الأخير</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">{(player.form || 7.5).toFixed(1)} / 10</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${((player.form || 7.5) / 10) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Detailed Attributes */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>القدرات والمهارات الفنية</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            {attrList.map((attr, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                    <attr.icon className="w-3 h-3 text-slate-400" />
                    {attr.label}
                  </span>
                  <span className="font-bold font-mono text-slate-200">{attr.val}</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${attr.color}`}
                    style={{ width: `${Math.min(100, (attr.val / 99) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract & Financials */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>القيمة السوقية</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-emerald-400 mt-1">
              {player.marketValue ? `${player.marketValue.toLocaleString()} ج.م` : 'غير محدد'}
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>السعر المطلوب</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-amber-400 mt-1">
              {askingPrice === 0 ? 'مجاناً (لاعب حر)' : `${askingPrice.toLocaleString()} ج.م`}
            </div>
          </div>

          <div className="bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>الراتب الشهري</span>
            </div>
            <div className="font-bold text-xs sm:text-sm text-slate-200 mt-1">
              {player.salary ? `${player.salary.toLocaleString()} ج.م` : '2,500 ج.م'}
            </div>
          </div>
        </div>

        {/* Player Personal Wealth & Bonus Granting Panel */}
        {isSquadPlayer && (
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">الذمة المالية ومدخرات اللاعب</span>
              </div>
              <button
                onClick={() => setShowBonusRow(!showBonusRow)}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 px-2.5 py-1 rounded-xl border border-emerald-700/50 flex items-center gap-1 transition-all"
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{showBonusRow ? 'إخفاء لوحة الصرف' : 'إيداع مكافأة شخصية'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">رصيد اللاعب الشخصي</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {(player.savings || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">إجمالي المكافآت المستلمة</span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {(player.totalBonusesReceived || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            {/* Expandable Bonus Form */}
            {showBonusRow && (
              <div className="pt-2 border-t border-emerald-900/40 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold">مصدر تمويل المكافأة:</span>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setBonusFundingSource('club')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        bonusFundingSource === 'club' ? 'bg-blue-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      ميزانية النادي
                    </button>
                    <button
                      onClick={() => setBonusFundingSource('manager')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        bonusFundingSource === 'manager' ? 'bg-amber-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      محفظتك الخاصة
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-xs">
                  {[5000, 10000, 25000, 50000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBonusInputAmount(amt)}
                      className={`py-1.5 rounded-lg font-bold border transition-all text-[11px] ${
                        bonusInputAmount === amt 
                          ? 'bg-amber-500 text-slate-950 border-amber-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {(amt / 1000)}k ج.م
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={bonusInputAmount}
                    onChange={(e) => setBonusInputAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                    placeholder="مبلغ مخصص..."
                  />
                  <button
                    onClick={() => {
                      const res = addBonusToPlayer(player.id, bonusInputAmount, bonusFundingSource);
                      setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                      if (res.success) {
                        setShowBonusRow(false);
                      }
                      setTimeout(() => setNotification(null), 3000);
                    }}
                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    صرف الآن 💰
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Season Statistics */}
        <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
          <h4 className="text-[11px] font-bold text-slate-300 mb-2">إحصائيات الموسم الحالي</h4>
          <div className="grid grid-cols-4 gap-1 text-center text-xs">
            <div className="bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-[10px] text-slate-400 block">المباريات</span>
              <strong className="text-white font-bold">{player.stats?.appearances ?? 0}</strong>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-[10px] text-slate-400 block">الأهداف</span>
              <strong className="text-emerald-400 font-bold">{player.stats?.goals ?? 0}</strong>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-[10px] text-slate-400 block">صناعة</span>
              <strong className="text-blue-400 font-bold">{player.stats?.assists ?? 0}</strong>
            </div>
            <div className="bg-slate-900/60 p-1.5 rounded-lg">
              <span className="text-[10px] text-slate-400 block">إنذارات</span>
              <strong className="text-amber-400 font-bold">{player.stats?.yellowCards ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isSquadPlayer ? (
          <>
            {/* Individual Daily Training Focus & Progression Hub */}
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">التخصص والتركيز التدريبي اليومي:</span>
                </div>
                <span className="text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/60 font-bold">
                  تطوير مستمر 📈
                </span>
              </div>

              {/* Progress towards natural rating increase */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>معدل التقدم الطبيعي نحو الترقية (+1):</span>
                  </span>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    {Math.min(100, Math.round(player.trainingProgress || 0))}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round(player.trainingProgress || 0))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  يكتسب اللاعب نقاط نمو مع كل حصة تدريبية يومية حتى يصل لـ 100% ليترقى تلقائياً.
                </p>
              </div>

              {/* Focus Selector Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">اختر مهارة التركيز الأساسية:</label>
                <select 
                  value={player.trainingFocus || 'general'} 
                  onChange={(e) => setPlayerTrainingFocus(player.id, e.target.value as Player['trainingFocus'])}
                  className="w-full bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="general">🔄 تدريب شامل عام (تطوير متوازن لكافة المراكز)</option>
                  <option value="fitness">🏃‍♂️ لياقة بدنية وسرعة (استرجاع الجاهزية ورفع التحمل)</option>
                  <option value="shooting">🎯 التسديد وإنهاء الهجمات (رفع الفعالية التهديفية)</option>
                  <option value="passing">⚽ التمرير ورؤية اللعب (صناعة اللعب والكرات الحاسمة)</option>
                  <option value="dribbling">🎨 المراوغة والمهارة الفردية (التحكم بالكرة والمراوغة)</option>
                  <option value="defending">🛡️ التمركز الدفاعي والافتكاك (قطع الكرات والرقابة)</option>
                  {player.position === 'GK' && (
                    <option value="goalkeeping">🧤 حراسة المرمى والتصدي (ردة الفعل والتقاط الكرات)</option>
                  )}
                </select>
              </div>

              {/* Daily Training Report for this player */}
              {(() => {
                const playerDailyReport = dayAdvanceSummary?.trainingReports?.find(r => r.playerId === player.id);
                const playerInjuryReport = dayAdvanceSummary?.injuryUpdates?.find(r => r.playerId === player.id);

                if (playerDailyReport) {
                  return (
                    <div className="bg-emerald-950/60 border border-emerald-600/70 p-3 rounded-xl flex items-start gap-2 text-xs text-emerald-200 animate-fade-in">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-emerald-300 text-[11px]">تقرير الحصة التدريبية لليوم:</strong>
                        <span>{playerDailyReport.changeText}</span>
                      </div>
                    </div>
                  );
                }

                if (playerInjuryReport) {
                  return (
                    <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-fade-in ${
                      playerInjuryReport.recovered
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-600 text-rose-200'
                    }`}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[11px]">تقرير العيادة الطبية اليومي:</strong>
                        <span>{playerInjuryReport.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl text-[11px] text-slate-400 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>يتدرب اللاعب يومياً وفق هذا البرنامج؛ اضغط على "إجراء الحصة التدريبية" في تبويب التدريب لتسجيل تقرير اليوم.</span>
                  </div>
                );
              })()}
            </div>

            {/* Development Points Upgrade Panel (مكافآت الكأس والبطولات) */}
            <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">تطوير اللاعب بنقاط مكافآت البطولات</span>
                </div>
                <span className="text-xs font-black text-amber-300 bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  {developmentPoints || 0} ⚡ نقطة متاحة
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => {
                    const res = boostPlayerOverall(player.id);
                    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-amber-200">ترقية عامة (+1)</span>
                  <span className="text-[10px] text-amber-400/80 font-mono">50 نقطة</span>
                </button>

                <button
                  onClick={() => {
                    const res = boostPlayerPotential(player.id);
                    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-200">سقف الإمكانات (+2)</span>
                  <span className="text-[10px] text-emerald-400/80 font-mono">35 نقطة</span>
                </button>

                <button
                  onClick={() => {
                    const res = boostPlayerCondition(player.id);
                    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                    setTimeout(() => setNotification(null), 3000);
                  }}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-cyan-200">استشفاء لياقة (+15)</span>
                  <span className="text-[10px] text-cyan-400/80 font-mono">15 نقطة</span>
                </button>
              </div>

              {/* Specific Attribute Upgrade Buttons */}
              <div className="pt-1">
                <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>ترقية مهارة فنية محددة (+1):</span>
                  <span className="text-[10px] text-slate-400">التكلفة: 20 نقطة</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[11px]">
                  {[
                    { key: 'pace', label: 'السرعة' },
                    { key: 'shooting', label: 'التسديد' },
                    { key: 'passing', label: 'التمرير' },
                    { key: 'dribbling', label: 'المراوغة' },
                    { key: 'defending', label: 'الدفاع' },
                    { key: 'physical', label: 'البدنية' },
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => {
                        const res = upgradePlayerAttribute(player.id, item.key as keyof PlayerAttributes);
                        setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                        setTimeout(() => setNotification(null), 3000);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 py-1 px-1.5 rounded-lg text-slate-200 hover:text-white font-medium text-center transition-all active:scale-95 cursor-pointer"
                    >
                      +{item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
              <button 
                onClick={handleBoostMorale}
                disabled={talkCooldown}
                className="bg-purple-950/80 hover:bg-purple-900/90 border border-purple-700 text-purple-200 py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
              >
                <Heart className="w-4 h-4 text-purple-400" />
                <span>جلسة تحفيز</span>
              </button>

              <button 
                onClick={handleRenew}
                className="bg-blue-950/80 hover:bg-blue-900/90 border border-blue-700 text-blue-200 py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>تجديد العقد (+15%)</span>
              </button>

              <button 
                onClick={handleSell}
                className="bg-red-950/80 hover:bg-red-900/90 border border-red-700 text-red-200 py-2.5 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              >
                <DollarSign className="w-4 h-4 text-red-400" />
                <span>عرض للبيع</span>
              </button>
            </div>
          </>
        ) : (
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                if (onStartNegotiation) {
                  onStartNegotiation(player);
                  onClose();
                }
              }}
              disabled={!statusInfo.canNegotiate}
              className={`w-full py-3 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
                statusInfo.canNegotiate
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>{statusInfo.status === 'negotiating' ? 'عرض طاولة المفاوضات الجارية' : 'بدء المفاوضات'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

