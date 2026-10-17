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
  Calendar,
  Tv
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { DailyLoginRewardItem, DAILY_LOGIN_REWARDS_SCHEDULE } from '../types/dailyReward';
import { AdManager } from '../services/adManager';
import { challengesManager } from '../services/challengesService';

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
    grantChallengeReward,
    dailyRewardsSchedule,
    manager
  } = useGame();

  const [claimSuccessReward, setClaimSuccessReward] = useState<DailyLoginRewardItem | null>(null);
  const [claimMessage, setClaimMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [canDouble, setCanDouble] = useState<boolean>(false);
  const [isDoubled, setIsDoubled] = useState<boolean>(false);
  const [isDoublingLoading, setIsDoublingLoading] = useState<boolean>(false);

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

  // STEP 1: Watch Ad to claim base daily reward (Strict rule)
  const handleClaimWithAd = async () => {
    if (isSubmitting) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setClaimMessage('⚠️ لا يوجد اتصال بالإنترنت. يلزم مشاهدة إعلان لاستلام مكافأة اليوم.');
      return;
    }

    setIsSubmitting(true);
    setClaimMessage('جارٍ تحميل إعلان المكافأة اليومية...');

    let adEarned = false;

    try {
      const shown = await AdManager.showRewarded(
        'coins',
        () => {
          adEarned = true;
          challengesManager.recordAdWatched();
          const res = claimDailyLoginReward();
          if (res && res.success && res.reward) {
            setClaimSuccessReward(res.reward);
            setClaimMessage('🎉 تهانينا! استلمت مكافأة اليوم بنجاح (1X). يمكنك الآن مضاعفتها 2X بإعلان ثانٍ!');
            setCanDouble(true);
          } else {
            setClaimMessage(res?.message || 'تم تسجيل الاستلام بنجاح!');
          }
        },
        () => {
          if (!adEarned) {
            setClaimMessage('⚠️ تم إغلاق الإعلان قبل نهايته؛ يلزم مشاهدة الإعلان كاملاً لاستلام مكافأة اليوم.');
          }
        },
        (err) => {
          setClaimMessage('⚠️ تعذر تشغيل الإعلان حالياً (تأكد من الاتصال بالإنترنت). لم يتم تسليم المكافأة.');
        }
      );

      if (!shown && !adEarned) {
        setClaimMessage('⚠️ تعذر تحميل الإعلان، تحقق من اتصال الإنترنت لمشاهدة الإعلان واستلام المكافأة.');
      }
    } catch (err: any) {
      console.warn('[DailyReward] Error:', err);
      setClaimMessage('حدث خطأ أثناء محاولة تشغيل الإعلان.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Watch 2nd Ad to DOUBLE the daily reward (2X)
  const handleDoubleWithSecondAd = async () => {
    if (!claimSuccessReward || isDoublingLoading) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setClaimMessage('⚠️ لا يوجد اتصال بالإنترنت لتشغيل الإعلان الثاني ومضاعفة المكافأة.');
      return;
    }

    setIsDoublingLoading(true);
    let secondAdEarned = false;

    try {
      const shown = await AdManager.showRewarded(
        'coins',
        () => {
          secondAdEarned = true;
          challengesManager.recordAdWatched();

          // Grant duplicate 1X rewards so total is 2X!
          grantChallengeReward({
            budget: claimSuccessReward.clubFunds || 0,
            coins: claimSuccessReward.coins || 0,
            devPoints: claimSuccessReward.developmentPoints || 0,
            energyPercent: 15,
            reputation: 1,
            label: `✨ مضاعفة مكافأة اليوم (2X): +${(claimSuccessReward.clubFunds || 0).toLocaleString()} ج.م و +${claimSuccessReward.coins} كوينز!`,
          });

          setIsDoubled(true);
          setCanDouble(false);
          setClaimMessage(`🔥 مبروك يا كابتن! تم مضاعفة مكافأة اليوم (2X) بنجاح كامل! حصلت على إجمالي: +${((claimSuccessReward.clubFunds || 0) * 2).toLocaleString()} ج.م و +${claimSuccessReward.coins * 2} كوينز!`);
        },
        () => {
          if (!secondAdEarned) {
            setClaimMessage('⚠️ لم يكتمل الإعلان الثاني، مكافأتك الأساسية محفوظة بالفعل.');
          }
        },
        (err) => {
          setClaimMessage('تعذر إتمام الإعلان الثاني للمضاعفة.');
        }
      );

      if (!shown && !secondAdEarned) {
        setClaimMessage('تعذر تحميل الإعلان الثاني حالياً.');
      }
    } catch (e) {
      console.warn('Double error:', e);
    } finally {
      setIsDoublingLoading(false);
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                  مكافآت تسجيل الدخول اليومي
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  سلسلة 7 أيام 🌟
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300">
                  مكافآت مضاعفة 2X بالإعلانات 🎬
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                شاهد إعلان واستلم مكافأة اليوم، وتقدر تضاعفها 2X بمشاهدة إعلان ثانٍ لدعم ناديك!
              </p>
            </div>
          </div>

          {/* Claim message banner */}
          {claimMessage && (
            <div className={`mt-3 p-3 rounded-xl border text-xs font-bold leading-relaxed ${
              isDoubled || canDouble
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-amber-300'
            }`}>
              {claimMessage}
            </div>
          )}
        </div>

        {/* Days Grid: 1..6 */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[58vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {schedule.slice(0, 6).map((item) => {
              const isToday = canClaimDailyReward && item.day === targetDayNumber;
              const isPastClaimed = !canClaimDailyReward 
                ? item.day <= targetDayNumber 
                : item.day < targetDayNumber;
              const isFuture = item.day > targetDayNumber;

              return (
                <div
                  key={item.day}
                  className={`relative p-3.5 rounded-2xl border transition-all text-right flex flex-col justify-between min-h-[105px] ${
                    isToday
                      ? 'bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : isPastClaimed
                      ? 'bg-slate-900/60 border-emerald-500/40 opacity-75'
                      : 'bg-slate-900/40 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 font-mono">
                      اليوم {item.day}
                    </span>
                    {isPastClaimed ? (
                      <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : isToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 animate-pulse">
                        جاهز للاستلام!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        قريباً
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 my-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>+{item.coins} كوينز</span>
                    </div>
                    {item.clubFunds > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>+{item.clubFunds.toLocaleString()} ج.م</span>
                      </div>
                    )}
                    {item.developmentPoints > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-300">
                        <Star className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>+{item.developmentPoints} نقاط تدريب</span>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    {item.title}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Day 7 Highlight Card */}
          {(() => {
            const day7 = schedule[6] || schedule[schedule.length - 1];
            const isReadyToClaim = canClaimDailyReward && targetDayNumber === 7;
            const isPastClaimed = !canClaimDailyReward && targetDayNumber === 7;

            return (
              <div
                className={`relative p-4 sm:p-5 rounded-2xl border transition-all ${
                  isReadyToClaim
                    ? 'bg-gradient-to-r from-amber-950/70 via-yellow-950/60 to-slate-900 border-amber-400 shadow-xl ring-2 ring-amber-400/50'
                    : isPastClaimed
                    ? 'bg-slate-900/60 border-emerald-500/40 opacity-80'
                    : 'bg-slate-900/50 border-amber-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-black text-amber-300">
                      اليوم 7 - الجائزة الكبرى الأسبوعية 🏆
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-sm">
                    GRAND REWARD 2X
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                  <div className="flex items-center gap-1.5 font-black text-amber-300 bg-amber-950/50 p-2.5 rounded-xl border border-amber-600/30">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>+{day7.coins} كوينز</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-black text-emerald-300 bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-600/30">
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>+{(day7.clubFunds || 0).toLocaleString()} ج.م</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-black text-sky-300 bg-sky-950/50 p-2.5 rounded-xl border border-sky-600/30">
                    <Star className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>+{day7.developmentPoints} نقطة</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-black text-amber-200 bg-amber-900/30 p-2.5 rounded-xl border border-amber-600/30">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>طاقة 100% ⚡</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Action Footer: Strict Ad Claim & Doubling Rule */}
        <div className="p-5 sm:p-6 pt-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-right">
            {canDouble ? (
              <span className="text-emerald-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                تم استلام مكافأة اليوم! شاهد إعلاناً ثانياً لمضاعفتها 2X الآن.
              </span>
            ) : isDoubled ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                تم مضاعفة مكافأة اليوم (2X) بالكامل بنجاح 🔥! عد غداً لمواصلة السلسلة.
              </span>
            ) : canClaimDailyReward ? (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                مكافأة اليوم ({targetDayNumber}) بانتظارك! يلزم مشاهدة إعلان لاستلامها.
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
              {canDouble ? 'اكتفيت بـ (1X) ✓' : 'إغلاق'}
            </button>

            {canDouble ? (
              /* Option to double with 2nd ad */
              <button
                onClick={handleDoubleWithSecondAd}
                disabled={isDoublingLoading}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse disabled:opacity-50"
              >
                <Tv className="w-4 h-4 fill-slate-950" />
                <span>{isDoublingLoading ? 'جارٍ تشغيل الإعلان...' : 'ضاعف مكافأة اليوم (2X) بإعلان 🎬'}</span>
              </button>
            ) : canClaimDailyReward ? (
              /* Watch 1st ad to claim */
              <button
                onClick={handleClaimWithAd}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Tv className="w-4 h-4 fill-slate-950" />
                <span>{isSubmitting ? 'جارٍ تشغيل الإعلان...' : `استلام مكافأة اليوم (${targetDayNumber}) بإعلان 🎬`}</span>
              </button>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
};
