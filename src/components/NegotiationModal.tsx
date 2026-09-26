import React, { useState } from 'react';
import { ActiveNegotiation, Club, Player } from '../types/game';
import { calculatePlayerFairValue } from '../utils/transferEngine';
import { calculateClubMonthlyIncome, calculateClubTotalMonthlyWages, validateTransferFinancials } from '../services/economyService';
import {
  Briefcase,
  DollarSign,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  X,
  Send,
  Coins,
  Wallet,
} from 'lucide-react';

interface NegotiationModalProps {
  player: Player | null;
  sellingClub?: Club | null;
  userClub: Club | null;
  existingNegotiation?: ActiveNegotiation | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitProposal: (proposal: {
    playerId: string;
    transferFee: number;
    monthlySalary: number;
    contractYears: number;
    squadRole: 'key_player' | 'first_team' | 'rotation' | 'prospect';
  }) => void;
  onRespondToCounter?: (
    negotiationId: string,
    action: 'accept_counter' | 'raise_salary' | 'cancel',
    extraValue?: number
  ) => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  player,
  sellingClub,
  userClub,
  existingNegotiation,
  isOpen,
  onClose,
  onSubmitProposal,
  onRespondToCounter,
}) => {
  if (!isOpen || (!player && !existingNegotiation)) return null;

  const targetPlayer = player || (existingNegotiation ? ({
    id: existingNegotiation.playerId,
    name: existingNegotiation.playerName,
    overallRating: existingNegotiation.playerOverall,
    position: existingNegotiation.playerPosition,
    age: existingNegotiation.playerAge,
    marketValue: existingNegotiation.bidFee,
    salary: existingNegotiation.offeredSalary,
  } as Player) : null);

  if (!targetPlayer) return null;

  const fairVal = calculatePlayerFairValue(targetPlayer, userClub || undefined);
  const isFreeAgent = !sellingClub && !existingNegotiation?.playerClubId;
  const minRequiredSalary = Math.max(1000, targetPlayer.salary || 0);
  const minRequiredFee = isFreeAgent ? Math.max(25000, Math.round(fairVal.fairMarketValue * 0.75)) : Math.max(25000, fairVal.fairMarketValue);

  // Initial Form State
  const [fee, setFee] = useState<number | string>(existingNegotiation?.bidFee || minRequiredFee);
  const [salary, setSalary] = useState<number | string>(
    existingNegotiation?.offeredSalary || Math.max(minRequiredSalary, fairVal.recommendedMonthlyWage)
  );
  const [years, setYears] = useState<number>(existingNegotiation?.contractYears || 3);
  const [role, setRole] = useState<'key_player' | 'first_team' | 'rotation' | 'prospect'>(
    existingNegotiation?.squadRole || 'first_team'
  );

  const numFee = typeof fee === 'number' ? fee : (Number(fee) || 0);
  const numSalary = typeof salary === 'number' ? salary : (Number(salary) || 0);

  // Financial calculations
  const clubMonthlyIncome = userClub ? calculateClubMonthlyIncome(userClub) : 0;
  const clubCurrentWages = userClub ? calculateClubTotalMonthlyWages(userClub) : 0;
  const remainingWageBudget = Math.max(0, clubMonthlyIncome - clubCurrentWages);
  
  const isSalaryBelowCurrent = numSalary < (targetPlayer.salary || 0);
  const isFeeExceedingBudget = userClub ? numFee > (userClub.budget || 0) : false;
  const isSalaryExceedingCap = numSalary > remainingWageBudget;

  const transferValidation = userClub
    ? validateTransferFinancials(userClub, targetPlayer, numFee, numSalary, isFreeAgent)
    : { allowed: false, canAffordFee: false, canAffordWage: false, reason: 'يجب تولي تدريب نادٍ أولاً' };

  // Counter offer validations
  const canAffordCounterFee = userClub && existingNegotiation?.demandedFee ? (userClub.budget || 0) >= existingNegotiation.demandedFee : true;
  const canAffordCounterSalary = userClub && existingNegotiation?.demandedSalary ? (clubCurrentWages + existingNegotiation.demandedSalary <= clubMonthlyIncome) : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSalaryBelowCurrent || isFeeExceedingBudget || isSalaryExceedingCap) return;
    if (!transferValidation.allowed && !isFreeAgent) return;

    onSubmitProposal({
      playerId: targetPlayer.id,
      transferFee: numFee,
      monthlySalary: numSalary,
      contractYears: years,
      squadRole: role,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                {existingNegotiation ? 'طاولة المفاوضات الجارية' : `تقديم عرض تعاقد مع ${targetPlayer.name}`}
              </h3>
              <p className="text-xs text-slate-400">
                {targetPlayer.position} • تقييم {targetPlayer.overallRating} • {targetPlayer.age} عاماً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Club Financial Overview Pill */}
          {userClub && (
            <div className="grid grid-cols-2 gap-2 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">ميزانية الانتقالات المتوفرة</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  {userClub.budget.toLocaleString()} ج.م
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">سقف الرواتب الشهري المتاح</span>
                <span className={`text-sm font-black font-mono ${remainingWageBudget > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {remainingWageBudget.toLocaleString()} ج.م/ش
                </span>
                <span className="text-[9px] text-slate-500 block">من إجمالي دخل: {clubMonthlyIncome.toLocaleString()} ج.م</span>
              </div>
            </div>
          )}

          {/* Active Negotiation State Banner (if continuing) */}
          {existingNegotiation && (
            <div className="bg-slate-950/70 border border-cyan-500/40 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">مرحلة المفاوضات الحالية:</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-700/60 px-2.5 py-1 rounded-full font-bold">
                  {existingNegotiation.stage === 'club_review' && 'مراجعة النادي البائع'}
                  {existingNegotiation.stage === 'club_counter' && 'عرض مقابل من النادي'}
                  {existingNegotiation.stage === 'player_terms' && 'شروط عقد اللاعب'}
                  {existingNegotiation.stage === 'player_counter' && 'طلب راتب أعلى من اللاعب'}
                  {existingNegotiation.stage === 'completed' && 'تمت الصفقة بنجاح'}
                  {existingNegotiation.stage === 'rejected' && 'المفاوضات متعثرة'}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{existingNegotiation.statusMessage}</p>

              {/* Action buttons for responding to counter offers */}
              {existingNegotiation.stage === 'club_counter' && onRespondToCounter && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {!canAffordCounterFee && (
                    <div className="text-[11px] text-rose-400 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>المبلغ المطلوب أكبر من ميزانية النادي المتاحة!</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'accept_counter', existingNegotiation.demandedFee);
                        onClose();
                      }}
                      disabled={!canAffordCounterFee}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow"
                    >
                      قبول طلب النادي ({(existingNegotiation.demandedFee || 0).toLocaleString()} ج.م)
                    </button>
                    <button
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'cancel');
                        onClose();
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold rounded-xl text-xs transition-all"
                    >
                      انسحاب
                    </button>
                  </div>
                </div>
              )}

              {existingNegotiation.stage === 'player_counter' && onRespondToCounter && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {!canAffordCounterSalary && (
                    <div className="text-[11px] text-rose-400 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>الراتب المطلوب يتجاوز سقف الدخل الشهري المتاح لناديك ({remainingWageBudget.toLocaleString()} ج.م)!</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'raise_salary', existingNegotiation.demandedSalary);
                        onClose();
                      }}
                      disabled={!canAffordCounterSalary}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow"
                    >
                      الموافقة على راتب اللاعب ({(existingNegotiation.demandedSalary || 0).toLocaleString()} ج.م)
                    </button>
                    <button
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'cancel');
                        onClose();
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold rounded-xl text-xs transition-all"
                    >
                      إلغاء الصفقة
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New Proposal Form */}
          {!existingNegotiation && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Transfer Fee / Signing Fee */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isFreeAgent ? 'مكافأة التوقيع ورسوم الوكيل (تُخصم من ميزانيتك)' : `قيمة عرض الشراء لنادي ${sellingClub ? sellingClub.name : 'اللاعب'}`}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {isFreeAgent ? 'الحد الأدنى للتوقيع:' : 'القيمة السوقية:'} {fairVal.fairMarketValue.toLocaleString()} ج.م
                  </span>
                </div>
                <input
                  type="number"
                  min={25000}
                  step={5000}
                  value={fee}
                  onChange={e => setFee(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => {
                    if (fee === '' || Number(fee) < 25000) setFee(minRequiredFee);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">
                    ميزانية ناديك المتاحة: <strong className="text-emerald-400 font-mono">{(userClub?.budget || 0).toLocaleString()} ج.م</strong>
                  </span>
                  {numFee > (userClub?.budget || 0) && (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      العرض يتجاوز ميزانيتك الحالية!
                    </span>
                  )}
                </div>
              </div>

              {/* Monthly Salary */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    <span>الراتب الشهري المقترح للاعب</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    راتب اللاعب الحالي: {(targetPlayer.salary || 0).toLocaleString()} ج.م/ش
                  </span>
                </div>
                <input
                  type="number"
                  min={minRequiredSalary}
                  step={1000}
                  value={salary}
                  onChange={e => setSalary(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={() => {
                    if (salary === '' || Number(salary) < minRequiredSalary) setSalary(minRequiredSalary);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-400 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">
                    السقف المتاح للرواتب: <strong className="text-amber-400 font-mono">{remainingWageBudget.toLocaleString()} ج.م/ش</strong>
                  </span>
                  {isSalaryBelowCurrent && (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      لا يمكن عرض راتب أقل من راتبه الحالي!
                    </span>
                  )}
                  {!isSalaryBelowCurrent && numSalary > remainingWageBudget && (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      الراتب يتجاوز سقف دخل النادي!
                    </span>
                  )}
                </div>
              </div>

              {/* Contract Duration & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>مدة العقد (سنوات)</span>
                  </label>
                  <select
                    value={years}
                    onChange={e => setYears(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>سنة واحدة</option>
                    <option value={2}>سنتان</option>
                    <option value={3}>3 سنوات</option>
                    <option value={4}>4 سنوات</option>
                    <option value={5}>5 سنوات</option>
                  </select>
                </div>

                <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>الدور المتوقع في التشكيلة</span>
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                  >
                    <option value="key_player">نجم أساسي لا غنى عنه</option>
                    <option value="first_team">لاعب أساسي منتظم</option>
                    <option value="rotation">لاعب مداورة وتناوب</option>
                    <option value="prospect">موهبة شابة واعدة</option>
                  </select>
                </div>
              </div>

              {/* Validation Warning Alert */}
              {!transferValidation.allowed && transferValidation.reason && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{transferValidation.reason}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!transferValidation.allowed || isSalaryBelowCurrent || isFeeExceedingBudget || isSalaryExceedingCap}
                  className={`w-full py-3 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    !transferValidation.allowed || isSalaryBelowCurrent || isFeeExceedingBudget || isSalaryExceedingCap
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-95 cursor-pointer'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isSalaryBelowCurrent
                      ? 'الراتب المعروض أقل من راتب اللاعب الحالي'
                      : isFeeExceedingBudget
                      ? 'قيمة العرض تتجاوز ميزانية النادي'
                      : isSalaryExceedingCap
                      ? 'الراتب يتجاوز سقف دخل النادي'
                      : !transferValidation.allowed
                      ? 'لا يمكن تقديم العرض (تجاوز القيود المالية)'
                      : 'إرسال العرض وبدء المفاوضات الرسمية'}
                  </span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};

