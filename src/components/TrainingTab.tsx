import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/game';
import { YouthAcademyModal } from './YouthAcademyModal';
import {
  Dumbbell,
  Zap,
  Target,
  Shield,
  Activity,
  Award,
  Sparkles,
  Heart,
  TrendingUp,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';

interface TrainingTabProps {
  onSelectPlayer: (player: Player) => void;
}

export const TrainingTab: React.FC<TrainingTabProps> = ({ onSelectPlayer }) => {
  const {
    userClub,
    manager,
    setPlayerTrainingFocus,
    trainingIntensity,
    setTrainingIntensity,
    developmentPoints,
    boostPlayerOverall,
    boostPlayerPotential,
  } = useGame();
  const [notification, setNotification] = useState<string | null>(null);
  const [isYouthAcademyOpen, setIsYouthAcademyOpen] = useState<boolean>(false);

  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          🏋️‍♂️
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا توجد منشآت تدريبية أو لاعبين تحت إشرافك حالياً. اختر نادياً من الشواغر التدريبية في تبويب المسيرة لبدء تطوير مواهبه!
        </p>
      </div>
    );
  }

  const handleApplyTeamProgram = (intensity: 'normal' | 'high' | 'recovery') => {
    setTrainingIntensity(intensity);
    setNotification(
      intensity === 'high' 
        ? 'تم تفعيل معسكر تدريبي مكثف لرفع المعدلات الفنية والبدنية!'
        : intensity === 'recovery'
        ? 'تم تفعيل برنامج استشفاء خفيف لتفادي الإجهاد والإصابات.'
        : 'تم تطبيق برنامج تدريبي متوازن.'
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const handleQuickBoost = (player: Player) => {
    if ((developmentPoints || 0) < 50) {
      setNotification(`تحتاج إلى 50 نقطة تطوير على الأقل لترقية التقييم العام (لديك ${developmentPoints || 0} نقطة)`);
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    const res = boostPlayerOverall(player.id);
    setNotification(res.message);
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base text-white">مركز التدريب وتطوير اللاعبين</h2>
              <span className="text-[11px] text-slate-400">تطوير المهارات الفنية، اللياقة البدنية والناشئين يومياً</span>
            </div>
          </div>

          <div className="bg-slate-800 px-3 py-1 rounded-xl text-xs font-bold text-amber-400 border border-slate-700">
            مستوى الملاعب: {userClub.facilities.trainingGroundLevel} / 5
          </div>
        </div>

        {/* Development Points Banner (Tournament & Cup Rewards) */}
        <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/15 border border-amber-500/30 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">نقاط تطوير اللاعبين المكتسبة:</span>
                <span className="font-black text-sm text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40">
                  {developmentPoints || 0} ⚡ نقطة
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                تُمنح تلقائياً عند التأهل لأدوار متقدمة في الكأس وتحقيق المراكز المتقدمة لتطوير مهارات لاعبيك مباشرة!
              </p>
            </div>
          </div>
        </div>

        {/* Team Intensity Selector */}
        <div className="space-y-1.5 pt-2">
          <span className="text-xs font-bold text-slate-300">البرنامج التدريبي الجماعي للفريق:</span>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { id: 'recovery', label: 'استشفاء وراحة', desc: 'استعادة اللياقة' },
              { id: 'normal', label: 'تدريب متوازن', desc: 'تطوير مستقر' },
              { id: 'high', label: 'حمل تدريبي شاق', desc: 'تطور سريع' },
            ].map(prog => (
              <button
                key={prog.id}
                onClick={() => handleApplyTeamProgram(prog.id as any)}
                className={`p-2.5 rounded-2xl border text-center transition-all ${
                  trainingIntensity === prog.id
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-xs">{prog.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{prog.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Youth Academy Direct Access */}
        <div className="pt-2">
          <button
            onClick={() => setIsYouthAcademyOpen(true)}
            className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-right">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-amber-300">أكاديمية قطاع الناشئين والمواهب الصاعدة 🌟</div>
                <div className="text-[10px] text-slate-400">
                  {userClub.youthAcademyProspects?.length || 0} مواهب صاعدة تحت المراقبة • تصعيد أو بيع الحقوق
                </div>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-300 bg-amber-950 border border-amber-800 px-2.5 py-1 rounded-xl">
              إدارة الأكاديمية ↗
            </span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-950 border border-emerald-700 text-emerald-300 text-xs font-bold p-3 rounded-2xl flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{notification}</span>
        </div>
      )}

      {/* Individual Training Focus Assignment List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>التخصص والتركيز الفردي لكل لاعب</span>
        </h3>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {(userClub.players || []).map(player => (
            <div
              key={player.id}
              className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
            >
              <div 
                onClick={() => onSelectPlayer(player)}
                className="flex items-center gap-2.5 min-w-0 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700 shrink-0">
                  {player.overallRating}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{player.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {player.position} • {player.age} سنة • إمكانات: <strong className="text-emerald-400">{player.potentialRating}</strong>
                  </div>
                </div>
              </div>

              {/* Focus Dropdown & Quick Boost */}
              <div className="shrink-0 flex items-center gap-1.5">
                <select
                  value={player.trainingFocus || 'general'}
                  onChange={(e) => setPlayerTrainingFocus(player.id, e.target.value as Player['trainingFocus'])}
                  className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-[11px] text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="general">تدريب شامل</option>
                  <option value="fitness">لياقة وسرعة</option>
                  <option value="shooting">تسديد وإنهاء</option>
                  <option value="passing">تمرير ورؤية</option>
                  <option value="dribbling">مراوغة وتحكم</option>
                  <option value="defending">تمركز وافتكاك</option>
                </select>

                <button
                  onClick={() => handleQuickBoost(player)}
                  title="ترقية التقييم العام (+1) باستخدام 50 نقطة تطوير"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>ترقية (+1)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Youth Academy Modal */}
      <YouthAcademyModal
        isOpen={isYouthAcademyOpen}
        onClose={() => setIsYouthAcademyOpen(false)}
      />

    </div>
  );
};
