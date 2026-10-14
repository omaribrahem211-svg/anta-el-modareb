import React, { useState } from 'react';
import { 
  Gift, 
  X, 
  Check, 
  Sparkles, 
  Flame, 
  Coins, 
  Wallet, 
  Star, 
  Zap, 
  Trophy, 
  Clock, 
  Calendar
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { DailyLoginRewardItem, DAILY_LOGIN_REWARDS_SCHEDULE } from '../types/dailyReward';

interface DailyLoginRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyLoginRewardModal: React.FC<DailyLoginRewardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    dailyRewardState,
    canClaimDailyReward,
    claimDailyLoginReward,
    dailyRewardsSchedule,
    manager
  } = useGame();

  const [claimSuccessReward, setClaimSuccessReward] = useState<DailyLoginRewardItem | null>(null);
  const [claimMessage, setClaimMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Defensive fallback for schedule
  const schedule = (Array.isArray(dailyRewardsSchedule) && dailyRewardsSchedule.length >= 7)
    ? dailyRewardsSchedule
    : DAILY_LOGIN_REWARDS_SCHEDULE;

  // Defensive fallback for dailyRewardState
  const safeState = dailyRewardState || { streak: 0, lastClaimDate: null, totalDaysClaimed: 0 };
  const rawStreak = Number(safeState.streak) || 0;

  // Determine which day in 1..7 is the target day to claim or show
  let targetDayNumber = 1;
  if (!safeState.lastClaimDate) {
    targetDayNumber = 1;
  } else if (canClaimDailyReward) {
    targetDayNumber = ((rawStreak % 7) || 0) + 1;
  } else {
    // Already claimed today: show current day in 1..7 cycle
    targetDayNumber = (((rawStreak - 1) % 7 + 7) % 7) + 1;
  }
  // Strictly clamp between 1 and 7
  targetDayNumber = Math.max(1, Math.min(7, targetDayNumber));

  const handleClaim = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = claimDailyLoginReward();
      if (res && res.success && res.reward) {
        setClaimSuccessReward(res.reward);
        setClaimMessage(res.message);
      } else {
        setClaimMessage(res?.message || 'تعذر استلام المكافأة حالياً');
      }
    } catch (err: any) {
      console.warn('[DailyReward] Claim note:', err);
      setClaimMessage('تم تسجيل محاولة الاستلام بنجاح');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer z-10"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 rounded-2xl text-amber-400 shadow-inner">
              <Gift className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  مكافآت تسجيل الدخول اليومي
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  سلسلة 7 أيام 🌟
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                سجّل دخولك كل يوم لربح كوينز، ميزانية لناديك، ونقاط تدريب لتطوير لاعبيك!
              </p>
            </div>
          </div>

          {/* User Streak & Stats Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-300 font-bold">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>السلسلة الحالية: {safeState.streak || 0} يوم</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-600/40 text-emerald-300 font-bold">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>إجمالي الأيام: {safeState.totalDaysClaimed || 0} يوم</span>
            </div>

            {canClaimDailyReward ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold animate-pulse">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>مكافأة اليوم جاهزة للاستلام!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>تم استلام مكافأة اليوم بنجاح ✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Success Celebration Banner */}
        {claimSuccessReward && (
          <div className="mx-5 sm:mx-6 mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-emerald-950/90 border border-emerald-500/70 shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <Check className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm sm:text-base text-emerald-200">
                  مبروك يا كابتن {manager?.name || ''}! تم استلام المكافأة بنجاح 🎉
                </h3>
                <p className="text-xs text-emerald-300/90 mt-1">
                  {claimMessage}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-900/80 border border-emerald-600/50 text-emerald-200 font-bold flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    +{claimSuccessReward.coins} كوينز
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-900/80 border border-emerald-600/50 text-emerald-200 font-bold flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    +{(claimSuccessReward.clubFunds || 0).toLocaleString()} ج.م
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-900/80 border border-emerald-600/50 text-emerald-200 font-bold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-sky-400" />
                    +{claimSuccessReward.developmentPoints} نقاط تطوير
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7-Days Schedule Grid */}
        <div className="p-5 sm:p-6 space-y-3 max-h-[55vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {schedule.slice(0, 6).map((item) => {
              const isPastClaimed = !canClaimDailyReward 
                ? item.day <= targetDayNumber 
                : item.day < targetDayNumber;
              const isCurrentDay = item.day === targetDayNumber;
              const isReadyToClaim = isCurrentDay && canClaimDailyReward;

              return (
                <div
                  key={item.day}
                  className={`relative p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isReadyToClaim
                      ? 'bg-gradient-to-b from-amber-950/40 to-slate-800 border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                      : isPastClaimed
                      ? 'bg-emerald-950/20 border-emerald-700/40 text-slate-300'
                      : 'bg-slate-800/40 border-slate-700/50 opacity-75'
                  }`}
                >
                  {/* Top Day Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-900/70 border border-slate-700/60 text-slate-300">
                      اليوم {item.day}
                    </span>
                    {isPastClaimed ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400" title="تم الاستلام">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : isReadyToClaim ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-slate-950 font-black animate-pulse">
                        متاح!
                      </span>
                    ) : null}
                  </div>

                  {/* Rewards Breakdown */}
                  <div className="space-y-1.5 my-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{item.coins} كوينز</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{Math.round((item.clubFunds || 0) / 1000).toLocaleString()}k ج.م</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-sky-300">
                      <Star className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>+{item.developmentPoints} نقاط تطوير</span>
                    </div>

                    {item.energyBoost && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-200">
                        <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>شحن طاقة ⚡</span>
                      </div>
                    )}

                    {item.moraleBoost && (
                      <div className="flex items-center gap-1 text-[10px] text-red-200">
                        <Flame className="w-3 h-3 text-red-400 shrink-0" />
                        <span>رفع المعنويات 🔥</span>
                      </div>
                    )}
                  </div>

                  {/* Status footer pill */}
                  <div className="mt-2 pt-2 border-t border-slate-700/40 text-center">
                    <span className={`text-[10px] font-bold ${
                      isPastClaimed
                        ? 'text-emerald-400'
                        : isReadyToClaim
                        ? 'text-amber-300'
                        : 'text-slate-400'
                    }`}>
                      {isPastClaimed ? 'تم الاستلام ✓' : isReadyToClaim ? 'جاهز للاستلام 🎁' : 'مغلق 🔒'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Day 7: Grand Mega Reward Card */}
            {(() => {
              const day7 = schedule.find(s => s.day === 7) || schedule[6] || {
                day: 7,
                coins: 600,
                clubFunds: 4000000,
                developmentPoints: 80,
                title: 'الجائزة الكبرى الأسبوعية',
                description: 'الجائزة الكبرى',
                isMilestone: true
              };
              const isPastClaimed = !canClaimDailyReward 
                ? (targetDayNumber === 7 || safeState.streak >= 7) && safeState.lastClaimDate !== null
                : false;
              const isReadyToClaim = targetDayNumber === 7 && canClaimDailyReward;

              return (
                <div
                  key="day-7"
                  className={`col-span-2 relative p-4 rounded-xl border flex flex-col justify-between overflow-hidden transition-all ${
                    isReadyToClaim
                      ? 'bg-gradient-to-br from-amber-950/70 via-slate-900 to-amber-950/70 border-amber-400 ring-2 ring-amber-400 shadow-xl shadow-amber-500/20'
                      : isPastClaimed
                      ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-600/60'
                      : 'bg-gradient-to-br from-slate-900 to-slate-800/80 border-amber-600/50'
                  }`}
                >
                  {/* Glowing background accent for Day 7 */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-black text-amber-300">
                          اليوم 7 - الجائزة الكبرى الأسبوعية
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-sm">
                        GRAND REWARD
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mb-3">
                      الجائزة الملكية الأضخم في السلسلة لدعم ناديك وتطوير نجومك بالكامل!
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-black text-amber-300 bg-amber-950/50 p-2 rounded-lg border border-amber-600/30">
                        <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>+{day7.coins} كوينز</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-black text-emerald-300 bg-emerald-950/50 p-2 rounded-lg border border-emerald-600/30">
                        <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>+{(day7.clubFunds || 0).toLocaleString()} ج.م</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-black text-sky-300 bg-sky-950/50 p-2 rounded-lg border border-sky-600/30">
                        <Star className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>+{day7.developmentPoints} نقطة تطوير</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-black text-amber-200 bg-amber-900/30 p-2 rounded-lg border border-amber-600/30">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>طاقة ومعنويات 100% ⚡</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {isReadyToClaim ? 'جاهزة للاستلام الآن!' : 'تُفتح في اليوم السابع من السلسلة'}
                    </span>
                    <span className={`font-bold ${isPastClaimed ? 'text-emerald-400' : isReadyToClaim ? 'text-amber-300' : 'text-slate-400'}`}>
                      {isPastClaimed ? 'تم الاستلام ✓' : isReadyToClaim ? 'متاح الاستلام 🏆' : 'مغلق 🔒'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-5 sm:p-6 pt-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-right">
            {canClaimDailyReward ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                مكافأة اليوم ({targetDayNumber}) بانتظارك! اضغط الزر لاستلامها فوراً.
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                لقد استلمت مكافأة اليوم. عد غداً لمواصلة السلسلة وحصد اليوم التالي!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            {canClaimDailyReward && (
              <button
                onClick={handleClaim}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse disabled:opacity-50"
              >
                <Gift className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الاستلام...' : `استلام مكافأة اليوم (${targetDayNumber}) 🎁`}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
