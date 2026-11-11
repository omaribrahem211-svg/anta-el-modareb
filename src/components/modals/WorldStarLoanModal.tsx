import React, { useState } from 'react';
import { 
  Sparkles, Star, Award, Shield, Zap, Target, Share2, 
  Activity, TrendingUp, X, CheckCircle2, Play, Flame, 
  AlertCircle, Users, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGame } from '../../context/GameContext';
import { AdManager } from '../../services/adManager';
import { Player } from '../../types/game';
import { WorldStarTemplate } from '../../services/worldStarService';
import { ModalPortal } from '../common/ModalPortal';

interface WorldStarLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTactics?: () => void;
}

export const WorldStarLoanModal: React.FC<WorldStarLoanModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTactics,
}) => {
  const { userClub, signWorldStarWithAd } = useGame();

  const [adStep, setAdStep] = useState<1 | 2>(1);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [revealedPlayer, setRevealedPlayer] = useState<Player | null>(null);
  const [revealedTemplate, setRevealedTemplate] = useState<WorldStarTemplate | null>(null);
  const [isReplacingExisting, setIsReplacingExisting] = useState(false);

  if (!isOpen) return null;

  const currentGuestStar = (userClub?.players || []).find(p => Boolean(p?.isGuestStar));

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'],
      });
    } catch (_) {}
  };

  const handleWatchAd = async (stepNumber: 1 | 2) => {
    if (isLoadingAd) return;
    setIsLoadingAd(true);
    setErrorMessage(null);

    const safetyTimer = setTimeout(() => {
      setIsLoadingAd(false);
    }, 9000);

    try {
      const started = await AdManager.showRewardedForAction({
        actionType: 'world_star_loan',
        onUserEarnedReward: () => {
          clearTimeout(safetyTimer);
          setIsLoadingAd(false);

          if (stepNumber === 1) {
            // First ad finished successfully -> advance to step 2
            setAdStep(2);
          } else {
            // Second ad finished successfully -> SIGN THE WORLD STAR!
            const result = signWorldStarWithAd();
            if (result.success && result.player && result.template) {
              setRevealedPlayer(result.player);
              setRevealedTemplate(result.template);
              triggerConfetti();
            } else {
              setErrorMessage(result.message || 'حدث خطأ أثناء إضافة اللاعب.');
            }
          }
        },
        onDismiss: (rewardEarned) => {
          clearTimeout(safetyTimer);
          setIsLoadingAd(false);
          if (!rewardEarned) {
            setErrorMessage('لم تكتمل مشاهدة الإعلان! يرجى إكماله للنهاية لتأكيد الرعاية.');
          }
        },
        onFailure: (err) => {
          clearTimeout(safetyTimer);
          setIsLoadingAd(false);
          setErrorMessage(
            (err && err.message) || 'تعذر تشغيل الإعلان حالياً، يرجى التحقق من الاتصال والمحاولة لاحقاً.'
          );
        },
      });

      if (!started) {
        clearTimeout(safetyTimer);
        setIsLoadingAd(false);
      }
    } catch {
      clearTimeout(safetyTimer);
      setIsLoadingAd(false);
      setErrorMessage('حدث خطأ غير متوقع أثناء استدعاء الإعلان.');
    }
  };

  const handleClose = () => {
    setAdStep(1);
    setRevealedPlayer(null);
    setRevealedTemplate(null);
    setIsReplacingExisting(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-slate-900 border border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-y-auto flex flex-col text-right">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500" />

        {/* Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>صفقة النجم العالمي</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  مباراة واحدة فقط
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">عقد رعاية استثنائي يمنحك لاعباً مشهوراً عشوائياً لمباراتك القادمة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* REVEALED STAR SCREEN (When 2 Ads Complete) */}
        {revealedPlayer && revealedTemplate ? (
          <div className="py-4 space-y-4 animate-scale-up">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-lg">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>تهانينا! وصل النجم العالمي إلى ناديك 🌟</span>
              </div>
              <h3 className="text-xl font-black text-white">
                {revealedPlayer.name} {revealedTemplate.flag}
              </h3>
              <p className="text-xs text-amber-400 font-bold">{revealedPlayer.nickname}</p>
            </div>

            {/* Futuristic Star Card */}
            <div className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-br ${revealedTemplate.cardColor} shadow-2xl relative overflow-hidden border`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-bold border border-white/20">
                    {revealedTemplate.tierLabelArabic}
                  </span>
                  <div className="text-white text-xs font-mono mt-1 opacity-90">{revealedTemplate.nameEn}</div>
                </div>

                <div className="flex flex-col items-center bg-black/50 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/30 shadow-xl">
                  <span className="text-3xl font-black text-amber-300 font-mono leading-none">
                    {revealedPlayer.overallRating}
                  </span>
                  <span className="text-[11px] font-black text-white mt-1 px-2 py-0.5 rounded bg-amber-500/40">
                    {revealedPlayer.position}
                  </span>
                </div>
              </div>

              {/* Quote Bubble */}
              <div className="mt-4 p-3 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/20 text-xs text-slate-100 leading-relaxed italic">
                "{revealedPlayer.guestStarQuote || revealedTemplate.quote}"
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4 text-center">
                <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300 font-bold">السرعة</div>
                  <div className="text-base font-black text-amber-300 font-mono">{revealedPlayer.attributes.pace}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300 font-bold">التسديد</div>
                  <div className="text-base font-black text-amber-300 font-mono">{revealedPlayer.attributes.shooting}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300 font-bold">التمرير</div>
                  <div className="text-base font-black text-amber-300 font-mono">{revealedPlayer.attributes.passing}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300 font-bold">المراوغة</div>
                  <div className="text-base font-black text-amber-300 font-mono">{revealedPlayer.attributes.dribbling}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300 font-bold">الدفاع</div>
                  <div className="text-base font-black text-amber-300 font-mono">{revealedPlayer.attributes.defending}</div>
                </div>
                <div className="bg-black/40 rounded-xl p-2 border border-white/10">
                  <div className="text-[10px] text-slate-300 font-bold">البدنية</div>
                  <div className="text-base font-black text-amber-300 font-mono">{revealedPlayer.attributes.physical}</div>
                </div>
              </div>

              {/* Bottom Notice */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/90 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  متاح في تشكيلتك لمباراتك القادمة فقط
                </span>
                <span className="font-bold text-amber-300">مباراة واحدة</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تم، جاهز لخوض المباراة ⚽</span>
              </button>

              {onNavigateToTactics && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onNavigateToTactics();
                  }}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>ضبط الخطة والتشكيلة</span>
                </button>
              )}
            </div>
          </div>
        ) : currentGuestStar && !isReplacingExisting ? (
          /* ACTIVE GUEST STAR ALREADY IN SQUAD */
          <div className="py-4 space-y-4">
            <div className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>لديك بالفعل نجم عالمي جاهز للمباراة القادمة!</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  مباراة متبقية: {currentGuestStar.guestMatchesRemaining || 1}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                اللاعب <strong className="text-amber-300">{currentGuestStar.name}</strong> ({currentGuestStar.nickname}) متواجد حالياً في قائمة فريقك ومتاح في التشكيلة الأساسية، وسيغادر فور نهاية المباراة.
              </p>
            </div>

            {/* Current Guest Star Preview */}
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex flex-col items-center justify-center font-mono">
                  <span className="text-lg font-black text-amber-300 leading-none">{currentGuestStar.overallRating}</span>
                  <span className="text-[10px] font-bold text-slate-300">{currentGuestStar.position}</span>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{currentGuestStar.name}</h4>
                  <p className="text-xs text-amber-400">{currentGuestStar.nickname}</p>
                </div>
              </div>

              <div className="text-left">
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  جاهز للمباراة 🟢
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                الاحتفاظ به لخوض المباراة القادمة
              </button>

              <button
                type="button"
                onClick={() => setIsReplacingExisting(true)}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>استبدال بنجم آخر (2 إعلان)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* AD PROGRESSION STEPPER (2X ADS) */
          <div className="py-4 space-y-4">
            
            {/* Description Banner */}
            <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>كيف يعمل نظام استعارة النجوم؟</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 leading-relaxed pr-2 list-disc list-inside">
                <li>شاهد <strong className="text-amber-300">إعلانين متتاليين (2x Ads)</strong> لتأمين الرعاية وجذب نجم عالمي.</li>
                <li>يصلك لاعب مشهور <strong className="text-purple-300">عشوائياً</strong>: قد يكون أسطورة خارقة (ميسي، رونالدو، مبابي، دي بروين)، أو نجماً عالمياً (صلاح، بيلينغهام، كين)، أو بطاقة حظ مفاجئة (نيمار، هازارد، راموس، بالوتيلي).</li>
                <li>اللاعب متاح في خطتك <strong className="text-emerald-300">لمدة مباراة واحدة فقط</strong> ثم يغادر تلقائياً بعد صافرة النهاية.</li>
                <li>يمكنك تكرار هذه العملية قبل كل مباراة لجذب نجوم جدد دائماً!</li>
              </ul>
            </div>

            {/* Step Indicator (1/2 vs 2/2) */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className={`p-3 rounded-2xl border transition-all ${
                adStep === 1 
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg' 
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              }`}>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                  {adStep === 2 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 fill-amber-400" />}
                  <span>الإعلان الأول (1/2)</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">
                  {adStep === 2 ? 'مكتمل ومؤكد ✅' : 'موافقة النادي والوسيط'}
                </div>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${
                adStep === 2 
                  ? 'bg-gradient-to-r from-purple-500/20 to-amber-500/20 border-amber-400 text-amber-300 shadow-lg animate-pulse' 
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-500'
              }`}>
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>الإعلان الثاني (2/2)</span>
                </div>
                <div className="text-[10px] mt-0.5 opacity-80">
                  {adStep === 2 ? 'توقيع العقد وكشف النجم 🚀' : 'قيد الانتظار'}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-500/60 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Card for Current Step */}
            {adStep === 1 ? (
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">الخطوة 1: توثيق رعاية النادي الأول</div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    إعلان 1 من 2
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  شاهد الإعلان الأول لبدء المفاوضات وتجهيز عقد الإعارة الذهبي لمباراتك القادمة.
                </p>

                <button
                  type="button"
                  disabled={isLoadingAd}
                  onClick={() => handleWatchAd(1)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoadingAd ? (
                    <span>جارٍ تحميل وتشغيل الإعلان... ⏳</span>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>مشاهدة الإعلان الأول (1 / 2) 🎬</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/50 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تم تأكيد الرعاية الأولى! الخطوة الأخيرة 🌟</span>
                  </div>
                  <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-bold">
                    إعلان 2 من 2
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  رائع جداً! شاهد الإعلان الثاني الآن لإتمام التوقيع الرسمي واستدعاء النجم العالمي إلى تشكيلة فريقك فوراً.
                </p>

                <button
                  type="button"
                  disabled={isLoadingAd}
                  onClick={() => handleWatchAd(2)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-black text-sm shadow-xl shadow-purple-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoadingAd ? (
                    <span>جارٍ إتمام العقد وتجهيز النجم... ⏳</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>مشاهدة الإعلان الثاني وتوقيع النجم العالمي 🚀</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </ModalPortal>
  );
};
