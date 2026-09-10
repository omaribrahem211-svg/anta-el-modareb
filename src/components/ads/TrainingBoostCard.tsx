import React, { useState, useEffect } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTrainingBoost, TrainingBoostType } from '../../types/game';
import { useGame } from '../../context/GameContext';
import { 
  Dumbbell, 
  Flame, 
  ShieldCheck, 
  BrainCircuit, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';

export const TrainingBoostCard: React.FC = () => {
  if (!ADMOB_CONFIG.ENABLE_REWARDS) return null;

  const { currentRound, calendarDate } = useGame();
  const [activeBoost, setActiveBoost] = useState<ActiveTrainingBoost | null>(AdManager.getActiveTrainingBoost());
  const [selectedType, setSelectedType] = useState<TrainingBoostType>('fitness');
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [adError, setAdError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = AdManager.subscribe((state) => {
      setActiveBoost(state.activeBoost);
      
      // Calculate remaining cooldown
      if (state.lastRewardedAdTimestamp > 0) {
        const elapsed = (Date.now() - state.lastRewardedAdTimestamp) / 1000;
        const remaining = Math.max(0, Math.ceil(60 - elapsed));
        setCooldownSeconds(remaining);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const boostTypes: Array<{
    id: TrainingBoostType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bonus: string;
  }> = [
    {
      id: 'fitness',
      title: 'تدريب اللياقة البدنية',
      description: 'يحافظ على طاقة اللاعبين ومقاومة الإجهاد أثناء المباراة',
      icon: <Dumbbell className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      bonus: '+5% تأثير اللياقة',
    },
    {
      id: 'attacking',
      title: 'تدريب الفعالية الهجومية',
      description: 'يزيد دقة التسديد وإنهاء الهجمات أمام المرمى',
      icon: <Flame className="w-5 h-5 text-rose-400" />,
      color: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      bonus: '+5% فعالية هجومية',
    },
    {
      id: 'defensive',
      title: 'تدريب الصلابة الدفاعية',
      description: 'يعزز التمركز الدفاعي وتصديات حارس المرمى واستخلاص الكرة',
      icon: <ShieldCheck className="w-5 h-5 text-sky-400" />,
      color: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
      bonus: '+5% فعالية دفاعية',
    },
    {
      id: 'tactical',
      title: 'تدريب الاستيعاب التكتيكي',
      description: 'يحسن الالتزام بتعليمات المدرب والتحرك الجماعي بدون كرة',
      icon: <BrainCircuit className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
      bonus: '+5% تنفيذ التكتيك',
    },
  ];

  const handleWatchAdForBoost = async () => {
    if (isLoadingAd || cooldownSeconds > 0) return;
    setIsLoadingAd(true);
    setAdError(null);
    setSuccessMessage(null);

    const success = await AdManager.showRewardedAd(
      'training_boost',
      // 1. On Reward Earned Callback
      () => {
        const newBoost = AdManager.activateTrainingBoost(
          selectedType,
          currentRound,
          calendarDate?.formattedDate || `الجولة ${currentRound}`
        );
        setActiveBoost(newBoost);
        setIsLoadingAd(false);
        setSuccessMessage(`تم تفعيل (${newBoost.title}) بنجاح للمباراة القادمة! ⚡`);
      },
      // 2. On Dismiss Callback
      () => {
        setIsLoadingAd(false);
      },
      // 3. On Failure Callback
      (err) => {
        setIsLoadingAd(false);
        setAdError('تعذر تحميل الإعلان حالياً أو تم إغلاقه قبل الاكتمال. حاول مرة أخرى لاحقاً.');
      }
    );

    if (!success) {
      setIsLoadingAd(false);
    }
  };

  return (
    <div id="training-boost-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-lg relative overflow-hidden">
      {/* Background ambient gradient */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>🏋️ التدريب الإضافي للمباراة</span>
              <span className="text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-normal">
                مكافأة إعلانية
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              شاهد إعلانًا واحصل على تدريب إضافي يعطي أفضلية متوازنة في المباراة القادمة
            </p>
          </div>
        </div>
      </div>

      {/* Active Boost Banner if present */}
      {activeBoost && !activeBoost.isConsumed ? (
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 mb-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-emerald-300">
                {activeBoost.title} (مفعل ⚡)
              </h4>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                ساري للمباراة القادمة
              </span>
            </div>
            <p className="text-xs text-emerald-400/80 mt-1 leading-relaxed">
              {activeBoost.description}
            </p>
          </div>
        </div>
      ) : null}

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl p-3 mb-4 flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Ad Error Notification */}
      {adError && (
        <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{adError}</span>
        </div>
      )}

      {/* Selection Grid for Boost Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        {boostTypes.map((b) => {
          const isSelected = selectedType === b.id;
          return (
            <button
              key={b.id}
              id={`boost-option-${b.id}`}
              type="button"
              onClick={() => setSelectedType(b.id)}
              className={`p-3 rounded-xl border text-right transition-all flex items-start gap-3 relative ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500/50'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800/80 flex-shrink-0 mt-0.5">
                {b.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {b.title}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${b.color}`}>
                    {b.bonus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {b.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Watch Ad Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>يتم استهلاك التدريب تلقائيًا بعد صافرة نهاية المباراة</span>
        </span>

        <button
          id="btn-watch-training-boost-ad"
          type="button"
          disabled={isLoadingAd || cooldownSeconds > 0}
          onClick={handleWatchAdForBoost}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
            isLoadingAd || cooldownSeconds > 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black'
          }`}
        >
          {isLoadingAd ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>جاري تحميل وتشغيل الإعلان...</span>
            </>
          ) : cooldownSeconds > 0 ? (
            <>
              <Clock className="w-4 h-4 text-slate-400" />
              <span>متاح خلال {cooldownSeconds} ثانية</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-slate-950" />
              <span>شاهد إعلانًا لتفعيل التدريب الإضافي 🎬</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
