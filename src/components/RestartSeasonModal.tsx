import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  Users,
  DollarSign,
  Trophy,
  ShieldAlert,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface RestartSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RestartSeasonModal: React.FC<RestartSeasonModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    season,
    currentRound,
    totalRounds,
    userClub,
    activeLeague,
    restartCurrentSeason,
  } = useGame();

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const currentSeasonNum = season.seasonNumber || 1;

  const handleConfirmRestart = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setFeedback(null);

    try {
      const result = restartCurrentSeason();
      if (result.success) {
        setFeedback({ success: true, message: result.message });
        setTimeout(() => {
          setIsProcessing(false);
          setFeedback(null);
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      } else {
        setIsProcessing(false);
        setFeedback({ success: false, message: result.message });
      }
    } catch (err: any) {
      setIsProcessing(false);
      setFeedback({
        success: false,
        message: `حدث خطأ أثناء إعادة الموسم: ${err?.message || 'خطأ غير معروف'}`,
      });
    }
  };

  return (
    <div
      id="restart_season_modal_backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        id="restart_season_modal_content"
        className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-3xl shadow-2xl shadow-amber-500/10 overflow-hidden text-right"
      >
        {/* Top Gradient Stripe */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 w-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors z-10 disabled:opacity-50 cursor-pointer"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-3">
          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-amber-500/10">
              <RotateCcw className="w-7 h-7 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-600/50">
                  الموسم {currentSeasonNum}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {activeLeague?.name || 'الدوري'}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                إعادة بداية الموسم الحالي
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            العودة للجولة الأولى من الموسم {currentSeasonNum} مع تصفير جميع النتائج وإلغاء صفقات اللاعبين وإعادة ضبط الميزانية كما كانت في بداية هذا الموسم غير المكتمل.
          </p>
        </div>

        {/* Current State Indicator Pill */}
        <div className="px-5 sm:px-6 py-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">النادي</span>
              <span className="font-bold text-white truncate block">{userClub?.name || 'فريقك'}</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">الجولة الحالية</span>
              <span className="font-bold text-amber-400 font-mono block">
                {currentRound} / {totalRounds}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">ميزانية النادي</span>
              <span className="font-bold text-emerald-400 font-mono block text-[11px] truncate">
                {(userClub?.budget || 0).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Changes Breakdown List */}
        <div className="px-5 sm:px-6 py-3 space-y-2.5 max-h-[38vh] overflow-y-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ما الذي سيحدث عند استخدام هذا الزر؟</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold">العودة للجولة الأولى وتصفير النتائج</strong>
                <span className="text-[11px] text-slate-400">
                  إلغاء كافة المباريات الملعوبة في هذا الموسم وتوليد جدول مواجهات رسمي جديد ونظيف بالكامل.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold">إلغاء جميع التعاقدات والصفقات</strong>
                <span className="text-[11px] text-slate-400">
                  استرجاع أي لاعب قمت ببيعه خلال هذا الموسم وإلغاء عقود اللاعبين الذين تعاقدت معهم لتعود القائمة كما كانت.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold">استرداد ميزانية بداية الموسم</strong>
                <span className="text-[11px] text-slate-400">
                  تصفير إيرادات وأرباح المباريات المكتسبة خلال الموسم غير المكتمل واسترجاع كافة الأموال المصروفة في الصفقات لتعود الميزانية لرصيدها الأصلي.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <Trophy className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold">تصفير جدول الترتيب واللياقة 100%</strong>
                <span className="text-[11px] text-slate-400">
                  تصفير نقاط جميع الفرق وإلغاء أي إصابات أو إيقافات حدثت للاعبيك واستعادة اللياقة الكاملة (100%).
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/50 flex items-center gap-2 text-[11px] text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>ملاحظة:</strong> سيتم الاحتفاظ باسم مدربك ورخصتك التدريبية وسمعتك ومسيرتك الإجمالية.
            </span>
          </div>
        </div>

        {/* Feedback Alert if any */}
        {feedback && (
          <div className="px-5 sm:px-6 py-2">
            <div
              className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500'
                  : 'bg-red-950/90 text-red-300 border border-red-500'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="p-5 sm:p-6 pt-3 bg-slate-950/90 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            id="btn_confirm_restart_season"
            onClick={handleConfirmRestart}
            disabled={isProcessing}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>جارٍ تصفير الموسم والمزامنة...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 text-slate-950" />
                <span>تأكيد إعادة بداية الموسم {currentSeasonNum} 🚀</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl cursor-pointer transition-all disabled:opacity-50"
          >
            إلغاء والاحتفاظ بتقدمي
          </button>
        </div>
      </div>
    </div>
  );
};
