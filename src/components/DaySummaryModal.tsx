import React from 'react';
import { DayAdvanceSummary } from '../types/game';
import {
  Calendar,
  Sparkles,
  HeartPulse,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface DaySummaryModalProps {
  summary: DayAdvanceSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onGoToMatches?: () => void;
  isMatchDay?: boolean;
}

export const DaySummaryModal: React.FC<DaySummaryModalProps> = ({
  summary,
  isOpen,
  onClose,
  onGoToMatches,
  isMatchDay,
}) => {
  if (!isOpen || !summary) return null;

  const hasTraining = summary.trainingReports && summary.trainingReports.length > 0;
  const hasInjuries = summary.injuryUpdates && summary.injuryUpdates.length > 0;
  const hasNegotiations = summary.negotiationUpdates && summary.negotiationUpdates.length > 0;
  const hasNews = summary.newsItems && summary.newsItems.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">
                {summary.daysAdvanced && summary.daysAdvanced > 1
                  ? `ملخص التقدم لموعد المباراة (${summary.daysAdvanced} أيام)`
                  : 'ملخص أحداث اليوم'}
              </h3>
              <p className="text-xs text-emerald-400 font-bold">{summary.formattedArabicDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          
          {/* Match Day Alert (if today is match day) */}
          {isMatchDay && (
            <div className="bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/50 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚽</span>
                <div>
                  <h4 className="font-black text-sm text-emerald-300">اليوم هو يوم المباراة!</h4>
                  <p className="text-[11px] text-slate-300">الفريق جاهز لخوض الجولة. توجه لتبويب المباريات لخوض اللقاء.</p>
                </div>
              </div>
              {onGoToMatches && (
                <button
                  onClick={() => {
                    onClose();
                    onGoToMatches();
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow shrink-0"
                >
                  خوض المباراة ➔
                </button>
              )}
            </div>
          )}

          {/* Match Result Banner (if simulated) */}
          {summary.matchSummaryText && (
            <div className="bg-slate-800/90 border border-slate-700 p-3.5 rounded-2xl flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">نتيجة المباراة:</span>
                <p className="text-slate-300">{summary.matchSummaryText}</p>
              </div>
            </div>
          )}

          {/* Training Reports */}
          {hasTraining && (
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl space-y-2">
              <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تطورات وتحديثات التدريب</span>
              </h4>
              <div className="space-y-1.5">
                {summary.trainingReports.map((report, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-slate-200 flex items-center justify-between">
                    <span>{report.changeText}</span>
                    <span className="text-emerald-400 font-bold text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                      +1 تقييم
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Injury Updates */}
          {hasInjuries && (
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl space-y-2">
              <h4 className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>التقرير الطبي والإصابات</span>
              </h4>
              <div className="space-y-1.5">
                {summary.injuryUpdates.map((inj, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                      inj.recovered
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    {inj.recovered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{inj.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negotiations Progress */}
          {hasNegotiations && (
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl space-y-2">
              <h4 className="font-bold text-cyan-400 flex items-center gap-1.5 text-xs">
                <Briefcase className="w-3.5 h-3.5" />
                <span>مستجدات المفاوضات والانتقالات</span>
              </h4>
              <div className="space-y-1.5">
                {summary.negotiationUpdates.map((neg, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-slate-200 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-white block">{neg.playerName}</span>
                      <p className="text-[11px] text-slate-400">{neg.text}</p>
                    </div>
                    {neg.actionRequired && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-1 rounded-lg font-bold shrink-0">
                        مطلوب ردك
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily News */}
          {hasNews && (
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl space-y-2">
              <h4 className="font-bold text-purple-400 flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>عناوين وأخبار اليوم</span>
              </h4>
              <div className="space-y-1.5">
                {summary.newsItems.map(item => (
                  <div key={item.id} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <span>{item.icon || '📰'}</span>
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Board Feedback if any */}
          {summary.boardFeedback && (
            <div className="bg-slate-900/90 border border-amber-500/30 p-3 rounded-2xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">ملاحظات مجلس الإدارة:</span>
                <p className="text-slate-300 text-[11px]">{summary.boardFeedback}</p>
              </div>
            </div>
          )}

          {!hasTraining && !hasInjuries && !hasNegotiations && !hasNews && !summary.matchSummaryText && (
            <div className="text-center py-6 text-slate-400">
              مر اليوم بهدوء واستقرار في معسكر الفريق، واستمرت الحصص التدريبية الاعتيادية بنجاح.
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow active:scale-95"
          >
            متابعة العمل اليومي ➔
          </button>
        </div>

      </div>
    </div>
  );
};
