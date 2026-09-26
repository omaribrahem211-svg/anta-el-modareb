import React from 'react';
import { TacticalMatchReport, TeamTactics, Club } from '../types/game';
import { 
  ShieldCheck, 
  Flame, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Zap, 
  Compass, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { ALL_TACTICAL_STYLES, ALL_FORMATIONS } from '../utils/tacticalKnowledgeEngine';

interface TacticalMatchReportCardProps {
  report: TacticalMatchReport;
  userTactics?: TeamTactics;
  userClub?: Club;
}

export const TacticalMatchReportCard: React.FC<TacticalMatchReportCardProps> = ({
  report,
  userTactics,
  userClub,
}) => {
  const formationMeta = userTactics?.formation ? ALL_FORMATIONS[userTactics.formation] : undefined;
  const styleKey = userTactics?.tacticalStyle || 'total_football';
  const styleMeta = ALL_TACTICAL_STYLES[styleKey] || ALL_TACTICAL_STYLES['total_football'];

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    if (score >= 70) return 'text-cyan-400 bg-cyan-950/80 border-cyan-500/40';
    if (score >= 55) return 'text-amber-400 bg-amber-950/80 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/80 border-rose-500/40';
  };

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-cyan-500';
    if (score >= 55) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const pillars = [
    { label: 'كفاءة الضغط واسترجاع الكرة', score: report.pressingRating, icon: Flame },
    { label: 'سلاسة بناء اللعب من الخلف', score: report.buildUpRating, icon: Compass },
    { label: 'التنظيم والصلابة الدفاعية', score: report.defensiveOrgRating, icon: ShieldCheck },
    { label: 'صناعة الفرص والخطورة', score: report.chanceCreationRating, icon: Zap },
    { label: 'التعديلات وقراءة سيناريو اللقاء', score: report.adjustmentsRating, icon: Brain },
  ];

  return (
    <div className="bg-slate-950/90 border border-cyan-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 text-right overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm sm:text-base text-white">التقرير والتحليل التكتيكي الفني</h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Tactical Debrief
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {formationMeta ? formationMeta.nameArabic : userTactics?.formation} • {styleMeta.nameArabic}
            </p>
          </div>
        </div>

        {/* Tactical Score Badge */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 block">تقييم النضج التكتيكي</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black font-mono text-cyan-300">
                {report.overallTacticalScore}%
              </span>
              <span className="text-[10px] font-bold text-slate-500">/ 100</span>
            </div>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-black text-base shadow-lg ${getScoreColor(report.overallTacticalScore)}`}>
            {report.overallTacticalScore >= 85 ? 'A+' : report.overallTacticalScore >= 70 ? 'B+' : report.overallTacticalScore >= 55 ? 'C' : 'D'}
          </div>
        </div>
      </div>

      {/* Synergy Bonus Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs relative z-10">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-bold">علاوة التناغم التكتيكي المكتسبة:</span>
          </div>
          <span className="font-mono font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
            +{report.tacticalSynergyBonus}% Synergy
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-bold">الخبرة المكتسبة في الأسلوب:</span>
          </div>
          <span className="font-mono font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
            +{report.tacticalExpGained?.[0]?.expGained || 10} XP
          </span>
        </div>
      </div>

      {/* The 5 Pillars of Tactical Performance */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 relative z-10">
        <h5 className="text-xs font-black text-slate-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>محاور الانضباط والفاعلية التكتيكية الخمسة:</span>
        </h5>

        <div className="space-y-2">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{pillar.label}</span>
                  </div>
                  <span className="font-mono font-black text-white">{pillar.score}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(pillar.score)}`}
                    style={{ width: `${Math.min(100, Math.max(0, pillar.score))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary & Secondary Insights */}
      <div className="space-y-2 relative z-10 text-xs">
        {/* Primary Insight */}
        <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-black text-cyan-300 block">رؤية المحلل الفني الرئيسية:</span>
            <p className="text-slate-300 leading-relaxed">{report.primaryInsightArabic}</p>
          </div>
        </div>

        {/* Secondary Insight */}
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-black text-emerald-300 block">ملاحظة التطور والتمركز:</span>
            <p className="text-slate-300 leading-relaxed">{report.secondaryInsightArabic}</p>
          </div>
        </div>

        {/* Stamina / Fatigue Warning (if present) */}
        {report.staminaWarningArabic && (
          <div className="p-3 bg-amber-950/50 border border-amber-500/40 rounded-2xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black text-amber-300 block">تنبيه الحمل البدني واللياقة:</span>
              <p className="text-amber-200/90 leading-relaxed">{report.staminaWarningArabic}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tactical Style Mastery Bar */}
      {report.tacticalExpGained && report.tacticalExpGained.length > 0 && (
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1.5 relative z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>مستوى إتقان أسلوب ({report.tacticalExpGained[0].styleNameArabic}):</span>
            </span>
            <span className="font-mono font-black text-cyan-400">
              {report.tacticalExpGained[0].newTotal} / 100 XP
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, report.tacticalExpGained[0].newTotal)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
