import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/game';
import { YouthAcademyModal } from './YouthAcademyModal';
import { StaffManagementCard } from './StaffManagementCard';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
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
  GraduationCap,
  Calendar,
  Play,
  Filter,
  Search,
  Users,
  Flame,
  ShieldAlert,
  HeartPulse,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Clock
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
    dayAdvanceSummary,
    advanceToNextDay,
    calendarDate,
    isMatchDay,
    daysUntilNextMatch,
  } = useGame();

  const [notification, setNotification] = useState<string | null>(null);
  const [isYouthAcademyOpen, setIsYouthAcademyOpen] = useState<boolean>(false);
  const [positionFilter, setPositionFilter] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD' | 'U21'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDailyReportExpanded, setIsDailyReportExpanded] = useState<boolean>(true);
  const [dailyTheme, setDailyTheme] = useState<'balanced' | 'tactical' | 'physical' | 'setpieces' | 'recovery'>('balanced');

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
        ? 'تم تفعيل حمل تدريبي شاق ومكثف! سيتطور اللاعبون أسرع مع زيادة الإجهاد البدني.'
        : intensity === 'recovery'
        ? 'تم تفعيل برنامج استشفاء خفيف لتفادي الإجهاد والإصابات واستعادة الجاهزية.'
        : 'تم تطبيق برنامج تدريبي متوازن ومستقر للفريق.'
    );
    setTimeout(() => setNotification(null), 3500);
  };

  const handleExecuteDailySession = () => {
    if (isMatchDay) {
      setNotification('⚠️ اليوم موعد مباراة رسمية! توجه لتبويب المباريات لخوض اللقاء أولاً.');
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    advanceToNextDay(false);
    setNotification('✅ تم إجراء الحصة التدريبية بنجاح وتحديث التقرير اليومي!');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleAutoAssignAllFocus = () => {
    if (!userClub?.players) return;
    let count = 0;
    userClub.players.forEach(p => {
      let focus: Player['trainingFocus'] = 'general';
      if (p.position === 'GK') focus = 'goalkeeping';
      else if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.position)) focus = 'defending';
      else if (['CM', 'CDM'].includes(p.position)) focus = 'passing';
      else if (['CAM', 'RW', 'LW'].includes(p.position)) focus = 'dribbling';
      else if (['ST'].includes(p.position)) focus = 'shooting';

      // If low fitness (< 70), switch to fitness/recovery
      if (p.fitness < 70) {
        focus = 'fitness';
      }

      setPlayerTrainingFocus(p.id, focus);
      count++;
    });
    setNotification(`تم تعيين التخصص التدريبي المثالي تلقائياً لـ ${count} لاعباً وفق مراكزهم واحتياجاتهم!`);
    setTimeout(() => setNotification(null), 3500);
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

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-amber-400 border-amber-500 bg-amber-950/60';
    if (rating >= 70) return 'text-emerald-400 border-emerald-500 bg-emerald-950/50';
    if (rating >= 60) return 'text-cyan-400 border-cyan-500 bg-cyan-950/50';
    if (rating >= 53) return 'text-blue-400 border-blue-500 bg-blue-950/50';
    return 'text-slate-300 border-slate-500 bg-slate-800/50';
  };

  // Filter players
  const filteredPlayers = (userClub.players || []).filter(player => {
    const matchesSearch = !searchQuery || player.name.toLowerCase().includes(searchQuery.toLowerCase()) || (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (positionFilter === 'ALL') return true;
    if (positionFilter === 'GK') return player.position === 'GK';
    if (positionFilter === 'DEF') return ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(player.position);
    if (positionFilter === 'MID') return ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(player.position);
    if (positionFilter === 'FWD') return ['RW', 'LW', 'ST'].includes(player.position);
    if (positionFilter === 'U21') return player.age <= 21;
    return true;
  });

  const dailyGrowthReports = dayAdvanceSummary?.trainingReports?.filter(r => r.type === 'growth') || [];
  const dailyOtherReports = dayAdvanceSummary?.trainingReports?.filter(r => r.type !== 'growth') || [];
  const dailyInjuries = dayAdvanceSummary?.injuryUpdates || [];
  const hasDailyReports = (dayAdvanceSummary?.trainingReports && dayAdvanceSummary.trainingReports.length > 0) || dailyInjuries.length > 0;

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/40 shrink-0 shadow-lg">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg text-white">مركز التدريب وتطوير اللاعبين اليومي</h2>
              <span className="text-xs text-slate-400">إدارة الحصص التدريبية، التخصصات الفردية، وتنمية قدرات الفريق</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-400 border border-slate-700">
              منشآت التدريب: {userClub.facilities.trainingGroundLevel} / 5 🏟️
            </div>
          </div>
        </div>

        {/* Development Points Banner (Tournament & Cup Rewards) */}
        <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-blue-500/15 border border-amber-500/30 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">رصيد نقاط تطوير اللاعبين المكتسبة:</span>
                <span className="font-black text-sm text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/40">
                  {developmentPoints || 0} ⚡ نقطة
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تُمنح عبر حسم مباريات الكؤوس ومكافآت الترتيب لتطوير المهارات الفردية مباشرة (+1) بدون انتظار التطور التدريجي!
              </p>
            </div>
          </div>
        </div>

        {/* Daily Training Program & Execution Panel (آلية يومية لاختيار نوع التدريب) */}
        <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">برنامج المران اليومي للفريق:</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                {calendarDate?.formattedArabic || 'اليوم الحالي'}
              </span>
            </div>

            {/* Match Day indicator / Countdown */}
            <div className="flex items-center gap-2 text-xs">
              {isMatchDay ? (
                <span className="font-bold text-amber-300 bg-amber-950/80 border border-amber-600 px-2.5 py-1 rounded-xl flex items-center gap-1.5 animate-pulse">
                  <span>⚽</span>
                  <span>اليوم موعد مباراة رسمية</span>
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>متبقي <strong className="text-blue-300">{daysUntilNextMatch}</strong> أيام حتى موعد المباراة القادمة</span>
                </span>
              )}
            </div>
          </div>

          {/* Training Intensity Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">مستوى الحمل التدريبي البدني:</span>
              <span className="text-[11px] text-slate-400">يؤثر مباشرة على سرعة التطور ومخاطر الإجهاد</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[
                { id: 'recovery', label: 'استشفاء وتأهيل', desc: 'راحة واستعادة لياقة', icon: Heart, color: 'border-blue-500/40 text-blue-300' },
                { id: 'normal', label: 'تدريب متوازن', desc: 'تطور فني وبدني مستقر', icon: Activity, color: 'border-emerald-500/40 text-emerald-300' },
                { id: 'high', label: 'حمل شاق ومكثف', desc: 'تطور مضاعف وسريع', icon: Flame, color: 'border-rose-500/40 text-rose-300' },
              ].map(prog => (
                <button
                  key={prog.id}
                  onClick={() => handleApplyTeamProgram(prog.id as any)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    trainingIntensity === prog.id
                      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500/50'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="font-black text-xs sm:text-sm flex items-center justify-center gap-1.5">
                    <prog.icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{prog.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{prog.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Training Session Execution Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>إجراء الحصة التدريبية يطور مهارات اللاعبين تدريجياً ويزيد من الانسجام واللياقة.</span>
            </div>

            <button
              onClick={handleExecuteDailySession}
              disabled={isMatchDay}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
                isMatchDay
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-950/50'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isMatchDay ? 'اليوم يوم مباراة (توجه للمباريات)' : 'إجراء الحصة التدريبية لليوم ⏱️'}</span>
            </button>
          </div>
        </div>

        {/* Youth Academy Direct Access */}
        <div>
          <button
            onClick={() => setIsYouthAcademyOpen(true)}
            className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-right">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-amber-300">أكاديمية قطاع الناشئين والمواهب الصاعدة 🌟</div>
                <div className="text-[11px] text-slate-400">
                  {userClub.youthAcademyProspects?.length || 0} مواهب صاعدة تحت المراقبة • تصعيد للفريق الأول أو بيع الحقوق
                </div>
              </div>
            </div>

            <span className="text-xs font-bold text-amber-300 bg-amber-950 border border-amber-800 px-3 py-1.5 rounded-xl shrink-0">
              إدارة الأكاديمية ↗
            </span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs font-bold p-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Daily Training Report Summary (عرض ملخص التقرير اليومي) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/40">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">ملخص تقرير الحصة التدريبية الأخيرة</h3>
              <span className="text-[11px] text-slate-400">
                {dayAdvanceSummary?.formattedArabicDate ? `تقرير حصة: ${dayAdvanceSummary.formattedArabicDate}` : 'بانتظار تنفيذ أول حصة تدريبية اليوم'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsDailyReportExpanded(!isDailyReportExpanded)}
            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1 transition-all"
          >
            <span>{isDailyReportExpanded ? 'طي التقرير' : 'عرض التقرير'}</span>
            {isDailyReportExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isDailyReportExpanded && (
          <div className="space-y-3 animate-fade-in text-xs">
            {hasDailyReports ? (
              <>
                {/* Highlights Counter Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-xl flex items-center gap-2.5">
                    <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">تطورات مهارية (+1)</span>
                      <strong className="text-emerald-300 font-bold text-xs sm:text-sm">
                        {dailyGrowthReports.length} لاعبين
                      </strong>
                    </div>
                  </div>

                  <div className="bg-blue-950/40 border border-blue-800/60 p-2.5 rounded-xl flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">تحديثات بدنية</span>
                      <strong className="text-blue-300 font-bold text-xs sm:text-sm">
                        {trainingIntensity === 'recovery' ? 'استشفاء إيجابي' : trainingIntensity === 'high' ? 'حمل شاق' : 'جاهزية متوازنة'}
                      </strong>
                    </div>
                  </div>

                  <div className="bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl flex items-center gap-2.5 col-span-2 sm:col-span-1">
                    <HeartPulse className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">التقرير الطبي والإصابات</span>
                      <strong className="text-rose-300 font-bold text-xs sm:text-sm">
                        {dailyInjuries.length > 0 ? `${dailyInjuries.length} حالات مسجلة` : 'لا توجد إصابات جديدة'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Growth and Progression Reports */}
                {dailyGrowthReports.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>قفزات وتطور في تقييمات اللاعبين (+1):</span>
                    </span>
                    <div className="space-y-1.5">
                      {dailyGrowthReports.map((rep, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/80 border border-emerald-600/40 p-3 rounded-2xl flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm">🌟</span>
                            <span className="text-slate-200 font-bold break-words">{rep.changeText}</span>
                          </div>
                          <span className="text-emerald-300 font-black text-xs bg-emerald-950 border border-emerald-600/60 px-2.5 py-1 rounded-xl shrink-0">
                            ترقية تقييم ⚡
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medical & Recovery Updates */}
                {dailyInjuries.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>تحديثات العيادة الطبية والتأهيل:</span>
                    </span>
                    <div className="space-y-1.5">
                      {dailyInjuries.map((inj, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
                            inj.recovered
                              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                              : 'bg-rose-950/70 border-rose-700 text-rose-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{inj.recovered ? '🩹' : '🏥'}</span>
                            <span className="font-bold">{inj.text}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-current shrink-0">
                            {inj.recovered ? 'تعافى تماماً' : 'تحت العلاج'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Training Reports */}
                {dailyOtherReports.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="space-y-1">
                      {dailyOtherReports.map((rep, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl text-slate-300 flex items-center justify-between text-xs"
                        >
                          <span>{rep.changeText}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-lg mx-auto">
                  📋
                </div>
                <h4 className="font-bold text-white text-xs sm:text-sm">جاهز لإجراء الحصة التدريبية اليومية</h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  اختر تخصصات لاعبيك ومستوى الحمل التدريبي في الأعلى، ثم اضغط على زر (إجراء الحصة التدريبية لليوم) لمشاهدة تفاصيل التقرير وتطور المهارات.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Club Staff & Technical Department Management */}
      <StaffManagementCard />

      {/* Individual Training Focus Assignment List (مكونات التدريب الفردي المحسنة مع ظهور الأسماء كاملاً) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>التخصص والتركيز الفردي لكل لاعب</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              تحديد التخصص اليومي لتطوير مهارات كل لاعب بدقة وزيادة كفاءته التكتيكية
            </span>
          </div>

          {/* Smart Auto-Assign Button */}
          <button
            onClick={handleAutoAssignAllFocus}
            className="self-start md:self-auto bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>🎯 توزيع التخصصات الذكي حسب المراكز</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          {/* Position Category Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            {[
              { id: 'ALL', label: 'الجميع' },
              { id: 'GK', label: 'حراس' },
              { id: 'DEF', label: 'دفاع' },
              { id: 'MID', label: 'وسط' },
              { id: 'FWD', label: 'هجوم' },
              { id: 'U21', label: 'مواهب (≤21)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setPositionFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  positionFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم اللاعب..."
              className="w-full sm:w-48 bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Players Individual Training Cards List */}
        <div className="space-y-3 max-h-[650px] overflow-y-auto custom-scrollbar pr-1">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              لا يوجد لاعبون يطابقون خيارات البحث أو التصفية الحالية.
            </div>
          ) : (
            filteredPlayers.map(player => {
              const currentFocus = player.trainingFocus || 'general';
              const progressPct = player.trainingProgress ? Math.min(100, Math.round(player.trainingProgress)) : 0;
              const hasGrowthToday = dailyGrowthReports.some(r => r.playerId === player.id);

              return (
                <div
                  key={player.id}
                  className={`bg-slate-950/80 border rounded-2xl p-3.5 sm:p-4 space-y-3 transition-all hover:border-slate-700 ${
                    hasGrowthToday ? 'border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20' : 'border-slate-800'
                  }`}
                >
                  {/* Top Row: Rating, Full Clear Player Name, Position, Age, Potential */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Overall Rating Box */}
                      <div className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center font-black shrink-0 ${getRatingColor(player.overallRating)}`}>
                        <span className="text-base leading-none">{player.overallRating}</span>
                        <span className="text-[9px] uppercase font-bold tracking-wider">{player.position}</span>
                      </div>

                      {/* Full Name & Information - NO HARSH TRUNCATION */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => onSelectPlayer(player)}
                            className="font-black text-sm sm:text-base text-white hover:text-emerald-400 transition-colors text-right break-words leading-tight cursor-pointer"
                          >
                            {player.name}
                          </button>
                          {player.number && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-md">
                              #{player.number}
                            </span>
                          )}
                          {hasGrowthToday && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              تطور اليوم ⭐
                            </span>
                          )}
                        </div>

                        {player.nickname && (
                          <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                            "{player.nickname}"
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className={`px-2 py-0.2 rounded-md font-bold text-[10px] border ${getPositionBadgeClass(player.position)}`}>
                            {getPositionArabic(player.position)} ({player.position})
                          </span>
                          <span>{player.age} سنة</span>
                          <span>•</span>
                          <span>سقف الإمكانات: <strong className="text-emerald-400 font-bold">{player.potentialRating || player.overallRating}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Profile Link Button */}
                    <button
                      onClick={() => onSelectPlayer(player)}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-bold transition-all shrink-0 cursor-pointer"
                      title="معاينة الملف الشامل للاعب"
                    >
                      الملف ↗
                    </button>
                  </div>

                  {/* Indicators Row: Fitness, Morale, Training Progress Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                    {/* Fitness */}
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        الجاهزية:
                      </span>
                      <strong className={`font-mono text-xs ${player.fitness > 80 ? 'text-emerald-400' : player.fitness > 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {player.fitness || 100}%
                      </strong>
                    </div>

                    {/* Morale */}
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                        <Heart className="w-3.5 h-3.5 text-red-400" />
                        المعنويات:
                      </span>
                      <strong className="font-mono text-xs text-white">
                        {player.morale || 85}%
                      </strong>
                    </div>

                    {/* Natural Training Progress towards +1 */}
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>التقدم التدريبي نحو الترقية (+1):</span>
                        <span className="text-emerald-400 font-bold font-mono">{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Individual Focus Selector & Quick Boost Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-[11px] font-bold text-slate-300 shrink-0">التخصص الفردي:</label>
                      <select
                        value={currentFocus}
                        onChange={(e) => setPlayerTrainingFocus(player.id, e.target.value as Player['trainingFocus'])}
                        className="flex-1 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="general">🔄 تدريب شامل متوازن</option>
                        <option value="fitness">🏃‍♂️ لياقة وسرعة وبدنية</option>
                        <option value="shooting">🎯 تسديد وإنهاء الهجمات</option>
                        <option value="passing">⚽ تمرير ورؤية وصناعة</option>
                        <option value="dribbling">🎨 مراوغة وتحكم فردي</option>
                        <option value="defending">🛡️ تمركز دفاعي وافتكاك</option>
                        {player.position === 'GK' && (
                          <option value="goalkeeping">🧤 حراسة المرمى والتصدي</option>
                        )}
                      </select>
                    </div>

                    {/* Quick Boost Button */}
                    <button
                      onClick={() => handleQuickBoost(player)}
                      title="ترقية التقييم العام (+1) باستخدام 50 نقطة تطوير"
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>ترقية فورية (+1)</span>
                      <span className="text-[10px] text-amber-400/80 font-mono">(50 ⚡)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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

