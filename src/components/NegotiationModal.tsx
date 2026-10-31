import React, { useState, useEffect } from 'react';
import { ActiveNegotiation, Club, Player } from '../types/game';
import { calculatePlayerFairValue, calculateContractDurationTransferFee } from '../utils/transferEngine';
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
import { ModalPortal } from './common/ModalPortal';

interface NegotiationModalProps {
  player: Player | null;
  sellingClub?: Club | null;
  askingPrice?: number;
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
    action: 'accept_counter' | 'raise_salary' | 'complete_now' | 'cancel',
    extraValue?: number
  ) => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  player,
  sellingClub,
  askingPrice,
  userClub,
  existingNegotiation,
  isOpen,
  onClose,
  onSubmitProposal,
  onRespondToCounter,
}) => {
  // Safely unwrap player in case a wrapper { player: Player } was passed
  const unwrappedPlayer: Player | null =
    player && typeof (player as any).player === 'object' ? (player as any).player : player;

  // Always resolve targetPlayer safely with complete fallback fields
  const targetPlayer: Player | null = unwrappedPlayer
    ? ({
        ...unwrappedPlayer,
        id: unwrappedPlayer.id || existingNegotiation?.playerId || 'player_unknown',
        name: unwrappedPlayer.name || existingNegotiation?.playerName || 'اسم اللاعب',
        overallRating: Number(
          unwrappedPlayer.overallRating ?? (unwrappedPlayer as any).rating ?? existingNegotiation?.playerOverall ?? 65
        ),
        position: (unwrappedPlayer.position || existingNegotiation?.playerPosition || 'CM') as Player['position'],
        age: Number(unwrappedPlayer.age ?? existingNegotiation?.playerAge ?? 24),
        marketValue: Number(
          askingPrice ??
            (unwrappedPlayer as any).askingPrice ??
            (unwrappedPlayer as any).price ??
            unwrappedPlayer.marketValue ??
            existingNegotiation?.bidFee ??
            50000
        ),
        salary: Number(unwrappedPlayer.salary ?? existingNegotiation?.offeredSalary ?? 5000),
      } as Player)
    : existingNegotiation
    ? ({
        id: existingNegotiation.playerId || 'player_unknown',
        name: existingNegotiation.playerName || 'اسم اللاعب',
        overallRating: existingNegotiation.playerOverall || 65,
        position: (existingNegotiation.playerPosition || 'CM') as Player['position'],
        age: existingNegotiation.playerAge || 24,
        marketValue: existingNegotiation.bidFee || 50000,
        salary: existingNegotiation.offeredSalary || 5000,
      } as Player)
    : null;

  const fairVal = targetPlayer
    ? calculatePlayerFairValue(targetPlayer, userClub || undefined)
    : {
        fairMarketValue: 50000,
        minimumAcceptableFee: 50000,
        recommendedMonthlyWage: 3000,
        valuationTier: 'low' as const,
      };

  const resolvedClubName =
    sellingClub?.name ||
    existingNegotiation?.sellingClubName ||
    existingNegotiation?.playerClubName ||
    (targetPlayer as any)?.currentClubName ||
    (targetPlayer as any)?.club ||
    '';

  const hasValidClubAssociation = Boolean(
    (sellingClub && sellingClub.id !== 'free_agents') ||
      (existingNegotiation?.playerClubId && existingNegotiation.playerClubId !== 'free_agents') ||
      (targetPlayer?.currentClubId &&
        targetPlayer.currentClubId !== 'free_agents' &&
        targetPlayer.currentClubId !== '') ||
      (resolvedClubName &&
        !resolvedClubName.includes('وكيل حر') &&
        !resolvedClubName.includes('لاعب حر'))
  );

  const explicitContractType = (targetPlayer as any)?.contractType as 'club' | 'free' | undefined;

  const isFreeAgent =
    explicitContractType === 'free'
      ? true
      : explicitContractType === 'club' || hasValidClubAssociation
      ? false
      : Boolean(
          targetPlayer?.isFreeAgent === true ||
            targetPlayer?.currentLeagueId === 'free_agents' ||
            (targetPlayer !== null && (targetPlayer.contractYears ?? 1) <= 0)
        );

  const displaySellingClubName = isFreeAgent
    ? 'لاعب حر (بدون نادٍ)'
    : resolvedClubName && !resolvedClubName.includes('وكيل حر') && !resolvedClubName.includes('لاعب حر')
    ? resolvedClubName
    : sellingClub?.name || 'ناديه الحالي';

  // Initial Form State - MUST be unconditionally called at top level (Rule of Hooks)
  const [years, setYears] = useState<number>(Math.max(1, Math.min(5, existingNegotiation?.contractYears || 3)));
  const [role, setRole] = useState<'key_player' | 'first_team' | 'rotation' | 'prospect'>(
    existingNegotiation?.squadRole || 'first_team'
  );

  // Use the asking price from the transfer card first so card and modal match accurately
  const explicitCardPrice = Number(
    askingPrice ??
      (targetPlayer as any)?.askingPrice ??
      (targetPlayer as any)?.price ??
      existingNegotiation?.bidFee ??
      targetPlayer?.marketValue ??
      0
  );

  // Base 3-season price & pro-rated price according to selected contract years (1 season = 1/3, 2 seasons = 2/3, 3 seasons = 3/3)
  const baseThreeSeasonPrice = isFreeAgent
    ? 0
    : Math.max(25000, explicitCardPrice > 0 ? explicitCardPrice : fairVal.fairMarketValue);
  const fixedPrice = isFreeAgent
    ? 0
    : calculateContractDurationTransferFee(baseThreeSeasonPrice, years, isFreeAgent);
  const fixedSalary = Math.max(1000, targetPlayer?.salary || fairVal.recommendedMonthlyWage || 2500);

  // Buyer's own bid: starts at the asking price, can be lowered to haggle (the club may counter or refuse)
  const [offerFee, setOfferFee] = useState<number | null>(null);
  const bidFee = isFreeAgent ? 0 : offerFee !== null ? Math.max(0, Math.round(offerFee)) : fixedPrice;

  useEffect(() => {
    if (existingNegotiation) {
      setYears(Math.max(1, Math.min(5, existingNegotiation.contractYears || 3)));
      setRole(existingNegotiation.squadRole || 'first_team');
    } else if (targetPlayer) {
      setYears(3);
      setRole('first_team');
    }
    setOfferFee(null);
  }, [targetPlayer?.id, existingNegotiation?.id, isFreeAgent]);

  if (!isOpen || (!player && !existingNegotiation) || !targetPlayer) {
    return null;
  }

  const safePlayerName = targetPlayer.name || existingNegotiation?.playerName || 'اسم اللاعب';
  const safePlayerNickname = targetPlayer.nickname || '';
  const safePlayerOvr =
    targetPlayer.overallRating || (targetPlayer as any).rating || existingNegotiation?.playerOverall || 65;
  const safePlayerAge = targetPlayer.age || existingNegotiation?.playerAge || 24;
  const safePlayerPosition = targetPlayer.position || existingNegotiation?.playerPosition || 'CM';

  const numFee = bidFee;
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
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
        <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Modal Header with 3D Kit Figurine */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60 gap-3">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <PlayerKit3DModel
                number={targetPlayer.number || 10}
                position={safePlayerPosition}
                overall={safePlayerOvr}
                primaryColor={sellingClub?.primaryColor || userClub?.primaryColor || '#10b981'}
                secondaryColor={sellingClub?.secondaryColor || userClub?.secondaryColor || '#ffffff'}
                isGK={safePlayerPosition === 'GK'}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-white leading-snug break-words">
                    {existingNegotiation ? `طاولة التعاقد: ${safePlayerName}` : `التعاقد مع ${safePlayerName}`}
                  </h3>
                  {safePlayerNickname && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                      «{safePlayerNickname}»
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-300 mt-1">
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    {safePlayerPosition}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>
                    تقييم <span dir="ltr" className="inline-block font-mono font-black text-white tabular-nums">{safePlayerOvr}</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>
                    <span dir="ltr" className="inline-block font-mono font-bold text-white tabular-nums">{safePlayerAge}</span> عاماً
                  </span>
                  <span className="text-slate-600">•</span>
                  {isFreeAgent ? (
                    <span className="text-cyan-300 font-bold">🆓 لاعب حر (انتقال مجاني)</span>
                  ) : (
                    <span className="text-amber-300 font-bold">🏟️ {displaySellingClubName}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            
            {/* Club Financial Overview Bar */}
            {userClub && (
              <div className="grid grid-cols-3 gap-2 bg-slate-950/80 border border-slate-800 p-3 rounded-2xl">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">ميزانية الشراء</span>
                  <span dir="ltr" className="inline-block text-xs font-black text-emerald-400 font-mono tabular-nums mt-0.5">
                    {(userClub.budget || 0).toLocaleString()} ج.م
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">سقف الرواتب المتاح</span>
                  <span dir="ltr" className="inline-block text-xs font-black text-cyan-400 font-mono tabular-nums mt-0.5">
                    {remainingWageBudget.toLocaleString()} ج.م/ش
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    سعر العقد ({years === 1 ? 'موسم واحد' : years === 2 ? 'موسمين' : `${years} مواسم`})
                  </span>
                  <span dir="ltr" className="inline-block text-xs font-black font-mono text-amber-400 tabular-nums mt-0.5">
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
                    {existingNegotiation.stage === 'club_review' && 'قيد المراجعة السريعة'}
                    {existingNegotiation.stage === 'club_counter' && 'عرض مضاد من النادي'}
                    {existingNegotiation.stage === 'player_terms' && 'تمت الموافقة وجاهز للتوقيع'}
                    {existingNegotiation.stage === 'player_counter' && 'عرض مضاد لراتب اللاعب'}
                    {existingNegotiation.stage === 'completed' && 'تمت الصفقة بنجاح'}
                    {existingNegotiation.stage === 'rejected' && 'المفاوضات متعثرة'}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{existingNegotiation.statusMessage}</p>

                {existingNegotiation.stage === 'club_counter' && onRespondToCounter && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onRespondToCounter(existingNegotiation.id, 'accept_counter', existingNegotiation.demandedFee || fixedPrice);
                          onClose();
                        }}
                        disabled={Boolean(userClub && (existingNegotiation.demandedFee || fixedPrice) > (userClub.budget || 0))}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs transition-all shadow cursor-pointer"
                      >
                        قبول العرض المضاد للنادي (
                        <span dir="ltr" className="inline-block font-mono tabular-nums">
                          {(existingNegotiation.demandedFee || fixedPrice).toLocaleString()} ج.م
                        </span>
                        ) وإتمام الصفقة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRespondToCounter(existingNegotiation.id, 'cancel');
                          onClose();
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        إلغاء الصفقة
                      </button>
                    </div>
                  </div>
                )}

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
                        type="button"
                        onClick={() => {
                          onRespondToCounter(existingNegotiation.id, 'raise_salary', existingNegotiation.demandedSalary || fixedSalary);
                          onClose();
                        }}
                        disabled={!canAffordCounterSalary}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow cursor-pointer"
                      >
                        اعتماد راتب اللاعب المطلوب (
                        <span dir="ltr" className="inline-block font-mono tabular-nums">
                          {(existingNegotiation.demandedSalary || fixedSalary).toLocaleString()} ج.م/شهرياً
                        </span>
                        ) وإتمام الصفقة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onRespondToCounter(existingNegotiation.id, 'cancel');
                          onClose();
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        إلغاء الصفقة
                      </button>
                    </div>
                  </div>
                )}

                {(existingNegotiation.stage === 'player_terms' || existingNegotiation.stage === 'club_review') && onRespondToCounter && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'complete_now');
                        onClose();
                      }}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow cursor-pointer"
                    >
                      إتمام التعاقد الفوري الآن ✍️
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRespondToCounter(existingNegotiation.id, 'cancel');
                        onClose();
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      إلغاء الصفقة
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* New Proposal Form */}
            {!existingNegotiation && (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. Fixed, Non-Negotiable Transfer Fee */}
                <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="font-bold text-white flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {isFreeAgent
                          ? 'حالة الانتقال (لاعب حر - منتهي العقد)'
                          : `سعر شراء عقد اللاعب من ${displaySellingClubName}`}
                      </span>
                    </label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/50 text-amber-300 text-[10px] font-bold shrink-0">
                      <Lock className="w-3 h-3" />
                      سعر ثابت وغير قابل للتفاوض
                    </span>
                  </div>
                  {isFreeAgent ? (
                    <div className="w-full bg-emerald-950/40 border border-emerald-600/60 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold text-xs flex items-center justify-between">
                      <span>🆓 انتقال حر مجاني (غير مرتبط بنادٍ حالياً)</span>
                      <span dir="ltr" className="inline-block font-mono font-black tabular-nums">0 ج.م</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-300 text-xs font-bold">
                            تكلفة الشراء لمدة ({years === 1 ? 'موسم واحد - ⅓ السعر' : years === 2 ? 'موسمين - ⅔ السعر' : years === 3 ? '3 مواسم - السعر الكامل' : `${years} مواسم`}):
                          </span>
                          <span dir="ltr" className="inline-block text-emerald-400 font-mono font-black text-sm tabular-nums shrink-0">
                            {fixedPrice.toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                          <span>السعر المطلوب من {displaySellingClubName} (عقد 3 مواسم):</span>
                          <span dir="ltr" className="inline-block font-mono text-amber-300 font-bold tabular-nums">
                            {baseThreeSeasonPrice.toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 flex-wrap gap-1">
                        <span className="text-slate-400">
                          ميزانية ناديك المتاحة:{' '}
                          <strong dir="ltr" className="inline-block text-emerald-400 font-mono tabular-nums">
                            {(userClub?.budget || 0).toLocaleString()} ج.م
                          </strong>
                        </span>
                        {isFeeExceedingBudget && (
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            سعر العقد المختار يتجاوز ميزانيتك الحالية!
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* 2. Fixed, Non-Negotiable Monthly Salary */}
                <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="font-bold text-white flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>مرتب اللاعب الشهري</span>
                    </label>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 text-[10px] font-bold shrink-0">
                      <Lock className="w-3 h-3" />
                      راتب ثابت وغير قابل للتفاوض
                    </span>
                  </div>
                  <div className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-slate-300 text-xs font-bold">الراتب الشهري المحدد للعقد:</span>
                    <span dir="ltr" className="inline-block text-cyan-400 font-mono font-black text-sm tabular-nums shrink-0">
                      {fixedSalary.toLocaleString()} ج.م / شهرياً
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1 flex-wrap gap-1">
                    <span className="text-slate-400">
                      إجمالي رواتب الفريق:{' '}
                      <strong dir="ltr" className="inline-block text-slate-200 font-mono tabular-nums">
                        {currentWages.toLocaleString()} ج.م
                      </strong>{' '}
                      • المتاح:{' '}
                      <strong dir="ltr" className="inline-block text-cyan-400 font-mono tabular-nums">
                        {remainingWageBudget.toLocaleString()} ج.م
                      </strong>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                    <label className="font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>مدة العقد واحتساب السعر</span>
                    </label>
                    {!isFreeAgent && (
                      <div className="mb-3">
                        <div className="text-xs font-bold text-slate-300 mb-1">عرضك لنادي اللاعب (السعر المعلن {fixedPrice.toLocaleString()} ج.م)</div>
                        <input
                          type="number"
                          min={0}
                          value={bidFee}
                          onChange={e => setOfferFee(Number(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex gap-2 mt-2">
                          {[0.95, 0.9, 0.8].map(m => (
                            <button type="button" key={m} onClick={() => setOfferFee(Math.round(fixedPrice * m))} className="flex-1 text-[11px] font-bold bg-slate-800 border border-slate-700 rounded-lg py-1 text-slate-200">
                              -{Math.round((1 - m) * 100)}%
                            </button>
                          ))}
                          <button type="button" onClick={() => setOfferFee(null)} className="flex-1 text-[11px] font-bold bg-emerald-900/40 border border-emerald-700 rounded-lg py-1 text-emerald-300">السعر المعلن</button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">كل ناد له حد أدنى خفي، والعروض المنخفضة جدا تُرفض والمتوسطة تُقابَل بعرض مضاد.</div>
                      </div>
                    )}
                    <select
                      value={years}
                      onChange={e => setYears(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                    >
                      <option value={1}>
                        موسم واحد فقط ({isFreeAgent ? 'مجاني' : `${calculateContractDurationTransferFee(baseThreeSeasonPrice, 1, false).toLocaleString()} ج.م - مدة قصيرة`})
                      </option>
                      <option value={2}>
                        موسمان ({isFreeAgent ? 'مجاني' : `${calculateContractDurationTransferFee(baseThreeSeasonPrice, 2, false).toLocaleString()} ج.م - مدة قصيرة`})
                      </option>
                      <option value={3}>
                        3 مواسم ({isFreeAgent ? 'مجاني' : `${baseThreeSeasonPrice.toLocaleString()} ج.م - السعر الكامل`})
                      </option>
                      <option value={4}>
                        4 مواسم ({isFreeAgent ? 'مجاني' : `${calculateContractDurationTransferFee(baseThreeSeasonPrice, 4, false).toLocaleString()} ج.م`})
                      </option>
                      <option value={5}>
                        5 مواسم ({isFreeAgent ? 'مجاني' : `${calculateContractDurationTransferFee(baseThreeSeasonPrice, 5, false).toLocaleString()} ج.م`})
                      </option>
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

                {/* Mandatory Contract Expiry Departure Warning */}
                <div className={`p-3 rounded-2xl border text-[11px] flex items-start gap-2 ${
                  years === 1
                    ? 'bg-amber-950/40 border-amber-600/60 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${years === 1 ? 'text-amber-400' : 'text-cyan-400'}`} />
                  <span className="leading-relaxed">
                    {years === 1 ? (
                      <>
                        <strong>تنبيه هام (عقد لموسم واحد فقط):</strong> أنت تشتري اللاعب بسعر موسم واحد فقط (
                        <span dir="ltr" className="inline-block font-mono font-bold tabular-nums">{numFee.toLocaleString()} ج.م</span>{' '}
                        بدلاً من{' '}
                        <span dir="ltr" className="inline-block font-mono font-bold tabular-nums">{baseThreeSeasonPrice.toLocaleString()} ج.م</span>
                        ). في حال عدم تجديد عقده قبل نهاية الموسم، <strong>سيغادر اللاعب فريقك فوراً وينتقل إلى نادٍ آخر مجاناً!</strong>
                      </>
                    ) : (
                      <>
                        <strong>بند التزام العقود:</strong> يتم احتساب سعر الشراء حسب عدد المواسم ({years} مواسم). عند انتهاء مدة العقد دون تجديد، يرحل اللاعب تلقائياً لنادٍ آخر.
                      </>
                    )}
                  </span>
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
                    <Send className="w-4 h-4 shrink-0" />
                    <span>
                      {isFeeExceedingBudget ? (
                        'سعر اللاعب الثابت يتجاوز ميزانية النادي'
                      ) : isSalaryExceedingCap ? (
                        'راتب اللاعب يتجاوز سقف الرواتب المتاح'
                      ) : !transferValidation.allowed ? (
                        'لا يمكن إتمام التعاقد (ميزانية غير كافية)'
                      ) : isFreeAgent ? (
                        <>
                          توقيع مجاني مع {safePlayerName} (راتب{' '}
                          <span dir="ltr" className="inline-block font-mono tabular-nums">{numSalary.toLocaleString()} ج.م/ش</span>{' '}
                          - {years} سنوات)
                        </>
                      ) : (
                        <>
                          شراء من {displaySellingClubName} (
                          <span dir="ltr" className="inline-block font-mono tabular-nums">{numFee.toLocaleString()} ج.م</span>
                          ) + راتب{' '}
                          <span dir="ltr" className="inline-block font-mono tabular-nums">{numSalary.toLocaleString()} ج.م/ش</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>
      </div>
    </ModalPortal>
  );
};


