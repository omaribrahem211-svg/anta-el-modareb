import React, { useState, useEffect } from 'react';
import { ActiveNegotiation, Club, Player } from '../types/game';
import { calculatePlayerFairValue } from '../utils/transferEngine';
import { calculateClubMonthlyIncome, calculateClubTotalMonthlyWages, validateTransferFinancials } from '../services/economyService';
import { PlayerKit3DModel } from './models/Football3DModels';
import {
  Briefcase,
  DollarSign,
  Calendar,
  ShieldCheck,
  AlertCircle,
  X,
  Send,
  Wallet,
  Lock,
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
  // Always resolve targetPlayer safely
  const targetPlayer: Player | null = player || (existingNegotiation ? ({
    id: existingNegotiation.playerId,
    name: existingNegotiation.playerName,
    overallRating: existingNegotiation.playerOverall || 65,
    position: existingNegotiation.playerPosition || 'CM',
    age: existingNegotiation.playerAge || 24,
    marketValue: existingNegotiation.bidFee || 50000,
    salary: existingNegotiation.offeredSalary || 5000,
  } as Player) : null);

  const fairVal = targetPlayer
    ? calculatePlayerFairValue(targetPlayer, userClub || undefined)
    : { fairMarketValue: 50000, minimumAcceptableFee: 50000, recommendedMonthlyWage: 3000, valuationTier: 'low' as const };
  const isFreeAgent = (!sellingClub && !existingNegotiation?.playerClubId) || (targetPlayer !== null && (targetPlayer.contractYears ?? 1) <= 0);
  // Fixed, non-negotiable price AND fixed, non-negotiable monthly salary
  const fixedPrice = isFreeAgent ? 0 : Math.max(25000, fairVal.fairMarketValue);
  const fixedSalary = Math.max(1000, targetPlayer?.salary || fairVal.recommendedMonthlyWage || 2500);

  // Initial Form State - MUST be unconditionally called at top level (Rule of Hooks)
  const [years, setYears] = useState<number>(Math.max(1, Math.min(5, existingNegotiation?.contractYears || 3)));
  const [role, setRole] = useState<'key_player' | 'first_team' | 'rotation' | 'prospect'>(
    existingNegotiation?.squadRole || 'first_team'
  );

  useEffect(() => {
    if (existingNegotiation) {
      setYears(Math.max(1, Math.min(5, existingNegotiation.contractYears || 3)));
      setRole(existingNegotiation.squadRole || 'first_team');
    } else if (targetPlayer) {
      setYears(3);
      setRole('first_team');
    }
  }, [targetPlayer?.id, existingNegotiation?.id, isFreeAgent]);

  if (!isOpen || (!player && !existingNegotiation) || !targetPlayer) {
    return null;
  }

  const numFee = fixedPrice;
  const numSalary = fixedSalary;
  const isFeeExceedingBudget = !isFreeAgent && userClub ? numFee > (userClub.budget || 0) : false;

  const currentWages = userClub ? calculateClubTotalMonthlyWages(userClub) : 0;
  const monthlyIncome = userClub ? calculateClubMonthlyIncome(userClub) : 0;
  const remainingWageBudget = Math.max(0, monthlyIncome - currentWages);
  const isSalaryExceedingCap = userClub ? numSalary > remainingWageBudget : false;

  const transferValidation = userClub
    ? validateTransferFinancials(userClub, targetPlayer, numFee, numSalary, isFreeAgent)
    : { allowed: false, canAffordFee: false, canAffordWage: false, reason: 'يجب تولي تدريب نادٍ أولاً' };

  const canAffordCounterSalary = userClub && existingNegotiation?.demandedSalary
    ? existingNegotiation.demandedSalary <= remainingWageBudget
    : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isFeeExceedingBudget || isSalaryExceedingCap) return;
      if (!transferValidation.allowed && !isFreeAgent) return;

      onSubmitProposal({
        playerId: targetPlayer.id,
        transferFee: numFee,
        monthlySalary: numSalary,
        contractYears: Math.max(1, Math.min(5, years)),
        squadRole: role,
      });
      onClose();
    } catch (err) {
      console.error('[NegotiationModal] Submit error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header with 3D Kit Figurine */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3.5">
            <PlayerKit3DModel
              number={targetPlayer.number || 10}
              position={targetPlayer.position}
              overall={targetPlayer.overallRating}
              primaryColor={sellingClub?.primaryColor || userClub?.primaryColor || '#10b981'}
              secondaryColor={sellingClub?.secondaryColor || userClub?.secondaryColor || '#ffffff'}
              isGK={targetPlayer.position === 'GK'}
              size="sm"
            />
            <div>
              <h3 className="font-black text-base text-white">
                {existingNegotiation ? 'طاولة التعاقد والرواتب' : `التعاقد مع ${targetPlayer.name}`}
              </h3>
              <p className="text-xs text-slate-400">
                {targetPlayer.position} • تقييم {targetPlayer.overallRating} • {targetPlayer.age} عاماً
                {isFreeAgent && ' • 🆓 لاعب حر (انتقال مجاني)'}
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
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">ميزانية الشراء</span>
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {(userClub.budget || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">سقف الرواتب المتاح</span>
                <span className="text-xs font-black text-cyan-400 font-mono">
                  {remainingWageBudget.toLocaleString()} ج.م/ش
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">سعر اللاعب (ثابت)</span>
                <span className="text-xs font-black font-mono text-amber-400">
                  {isFreeAgent ? '0 ج.م (حر)' : `${fixedPrice.toLocaleString()} ج.م`}
                </span>
              </div>
            </div>
          )}

          {/* Active Negotiation State Banner (if continuing) */}
          {existingNegotiation && (
            <div className="bg-slate-950/70 border border-cyan-500/40 p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">مرحلة التعاقد الحالية:</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-700/60 px-2.5 py-1 rounded-full font-bold">
                  {existingNegotiation.stage === 'club_review' && 'تأكيد السعر الثابت للنادي'}
                  {existingNegotiation.stage === 'player_terms' && 'اعتماد الراتب الثابت ومدة العقد'}
                  {existingNegotiation.stage === 'player_counter' && 'اعتماد الراتب الشهري الثابت'}
                  {existingNegotiation.stage === 'completed' && 'تمت الصفقة بنجاح'}
                  {existingNegotiation.stage === 'rejected' && 'المفاوضات متعثرة'}
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">{existingNegotiation.statusMessage}</p>

              {existingNegotiation.stage === 'player_counter' && onRespondToCounter && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {!canAffordCounterSalary && (
                    <div className="text-[11px] text-rose-400 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>الراتب يتجاوز سقف الرواتب الشهري المتاح للنادي!</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'raise_salary', existingNegotiation.demandedSalary || fixedSalary);
                        onClose();
                      }}
                      disabled={!canAffordCounterSalary}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow"
                    >
                      اعتماد راتب اللاعب الثابت ({(existingNegotiation.demandedSalary || fixedSalary).toLocaleString()} ج.م/شهرياً) وإتمام الصفقة
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
              
              {/* 1. Fixed, Non-Negotiable Transfer Fee */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isFreeAgent ? 'حالة الانتقال (لاعب حر - منتهي العقد)' : `سعر شراء عقد اللاعب من ${sellingClub ? sellingClub.name : 'ناديه'}`}</span>
                  </label>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-300 text-[10px] font-bold">
                    <Lock className="w-3 h-3" />
                    سعر ثابت وغير قابل للتفاوض
                  </span>
                </div>
                {isFreeAgent ? (
                  <div className="w-full bg-emerald-950/40 border border-emerald-600/60 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold text-xs flex items-center justify-between">
                    <span>🆓 انتقال حر مجاني (مدة عقده السابق 0 سنة)</span>
                    <span className="font-mono font-black">0 ج.م</span>
                  </div>
                ) : (
                  <>
                    <div className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                      <span className="text-slate-300 text-xs font-bold">قيمة شراء العقد المحددة:</span>
                      <span className="text-emerald-400 font-mono font-black text-sm">{fixedPrice.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400">
                        ميزانية ناديك المتاحة: <strong className="text-emerald-400 font-mono">{(userClub?.budget || 0).toLocaleString()} ج.م</strong>
                      </span>
                      {isFeeExceedingBudget && (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          سعر اللاعب يتجاوز ميزانيتك الحالية!
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 2. Fixed, Non-Negotiable Monthly Salary (مرتب اللاعب ثابت وغير قابل للتفاوض) */}
              <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                    <span>مرتب اللاعب الشهري</span>
                  </label>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-[10px] font-bold">
                    <Lock className="w-3 h-3" />
                    راتب ثابت وغير قابل للتفاوض
                  </span>
                </div>
                <div className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-slate-300 text-xs font-bold">الراتب الشهري المحدد للعقد:</span>
                  <span className="text-cyan-400 font-mono font-black text-sm">{fixedSalary.toLocaleString()} ج.م / شهرياً</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">
                    إجمالي رواتب الفريق: <strong className="text-slate-200 font-mono">{currentWages.toLocaleString()} ج.م</strong> • المتاح: <strong className="text-cyan-400 font-mono">{remainingWageBudget.toLocaleString()} ج.م</strong>
                  </span>
                  {isSalaryExceedingCap && (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      راتب اللاعب يتجاوز سقف الرواتب المتاح!
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Contract Duration (1 to 5 Years) & Squad Role */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>مدة العقد (1 - 5 سنوات)</span>
                  </label>
                  <select
                    value={years}
                    onChange={e => setYears(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>سنة واحدة (1)</option>
                    <option value={2}>سنتان (2)</option>
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
                  disabled={!transferValidation.allowed || isFeeExceedingBudget || isSalaryExceedingCap}
                  className={`w-full py-3 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    !transferValidation.allowed || isFeeExceedingBudget || isSalaryExceedingCap
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-95 cursor-pointer'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isFeeExceedingBudget
                      ? 'سعر اللاعب الثابت يتجاوز ميزانية النادي'
                      : isSalaryExceedingCap
                      ? 'راتب اللاعب يتجاوز سقف الرواتب المتاح'
                      : !transferValidation.allowed
                      ? 'لا يمكن إتمام التعاقد (ميزانية غير كافية)'
                      : isFreeAgent
                      ? `توقيع مجاني مع ${targetPlayer.name} (راتب ${numSalary.toLocaleString()} ج.م/ش - ${years} سنوات)`
                      : `شراء بالسعر الثابت (${numFee.toLocaleString()} ج.م) + راتب ${numSalary.toLocaleString()} ج.م/ش`}
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


