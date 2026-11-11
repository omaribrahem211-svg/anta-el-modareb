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

  const hasTraining = Array.isArray(summary.trainingReports) && summary.trainingReports.length > 0;
  const hasInjuries = Array.isArray(summary.injuryUpdates) && summary.injuryUpdates.length > 0;
  const validNegotiations = Array.isArray(summary.negotiationUpdates)
    ? summary.negotiationUpdates.filter(
        (neg: any) => neg && typeof neg === 'object' && Boolean(neg.playerName || neg.text)
      )
    : [];
  const hasNegotiations = validNegotiations.length > 0;
  const hasNews = Array.isArray(summary.newsItems) && summary.newsItems.length > 0;

  const pm = summary.postMatchSummary;
  const parsedHomeScore = pm ? (Number(pm.homeScore) >= 0 ? Number(pm.homeScore) : 0) : 0;
  const parsedAwayScore = pm ? (Number(pm.awayScore) >= 0 ? Number(pm.awayScore) : 0) : 0;
  const totalMatchGoals = parsedHomeScore + parsedAwayScore;
  const homeScorersDisplay = pm
    ? pm.homeScorersText || (Array.isArray(pm.homeGoalScorers) && pm.homeGoalScorers.length > 0 ? pm.homeGoalScorers.join(' ، ') : '')
    : '';
  const awayScorersDisplay = pm
    ? pm.awayScorersText || (Array.isArray(pm.awayGoalScorers) && pm.awayGoalScorers.length > 0 ? pm.awayGoalScorers.join(' ، ') : '')
    : '';
  const cleanCompHeader = pm
    ? [pm.competitionName, pm.roundLabel]
        .map(s => (s || '').replace(/^[-–—\s]+/, '').trim())
        .filter(Boolean)
        .join(' - ')
    : '';

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
                {pm
                  ? 'ملخص نتيجة المباراة وأحداث اليوم'
                  : summary.daysAdvanced && summary.daysAdvanced > 1
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

          {/* Match Result Banner (Post-Match Summary with Competition, Score & Goal Scorers) */}
          {(pm || summary.matchSummaryText) && (
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/50 p-4 rounded-2xl space-y-2.5 shadow-xl">
              {pm ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{cleanCompHeader || 'مباراة رسمية'}</span>
                    </span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full font-bold">
                      النتيجة النهائية
                    </span>
                  </div>

                  <div className="text-center py-1.5">
                    <div className="font-black text-base sm:text-lg text-white tracking-wide">
                      <span>{pm.homeTeamName}</span>
                      <span className="mx-3 px-3 py-0.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono">
                        {pm.homeScore} - {pm.awayScore}
                      </span>
                      <span>{pm.awayTeamName}</span>
                    </div>
                    {pm.homePenalties !== undefined && pm.awayPenalties !== undefined && (
                      <div className="text-[11px] text-amber-300 font-mono font-bold mt-1">
                        ركلات الترجيح: ({pm.homePenalties} - {pm.awayPenalties})
                      </div>
                    )}
                  </div>

                  {/* Detailed Goal Scorers directly below score */}
                  <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-2.5 text-[11px] space-y-1">
                    {totalMatchGoals > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center sm:text-right">
                        <div className="text-emerald-300 font-medium">
                          <span className="text-slate-400 text-[10px] block mb-0.5">{pm.homeTeamName}:</span>
                          {parsedHomeScore > 0 ? (homeScorersDisplay || `⚽ ${parsedHomeScore} ${parsedHomeScore === 1 ? 'هدف' : 'أهداف'}`) : <span className="text-slate-500">لم يسجل</span>}
                        </div>
                        <div className="text-cyan-300 font-medium">
                          <span className="text-slate-400 text-[10px] block mb-0.5">{pm.awayTeamName}:</span>
                          {parsedAwayScore > 0 ? (awayScorersDisplay || `⚽ ${parsedAwayScore} ${parsedAwayScore === 1 ? 'هدف' : 'أهداف'}`) : <span className="text-slate-500">لم يسجل</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 font-medium">
                        {parsedHomeScore === 0 && parsedAwayScore === 0 ? 'تعادل سلبي بدون أهداف (0 - 0)' : `انتهت المباراة بنتيجة (${parsedHomeScore} - ${parsedAwayScore})`}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">نتيجة المباراة:</span>
                    <p className="text-slate-300">{summary.matchSummaryText}</p>
                  </div>
                </div>
              )}
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
                {validNegotiations.map((neg, idx) => (
                  <div key={idx} className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-slate-200 flex items-center justify-between gap-2">
                    <div>
                      {neg.playerName && <span className="font-bold text-white block">{neg.playerName}</span>}
                      {neg.text && <p className="text-[11px] text-slate-400">{neg.text}</p>}
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

          {!hasTraining && !hasInjuries && !hasNegotiations && !hasNews && !summary.matchSummaryText && !pm && (
            <div className="text-center py-6 text-slate-400">
              مر اليوم بهدوء واستقرار في معسكر الفريق، واستمرت الحصص التدريبية الاعتيادية بنجاح.
            </div>
          )}

          {/* Match Day Alert Banner if reached matchday */}
          {isMatchDay && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/60 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl animate-bounce">⚽</span>
                <div>
                  <span className="font-black text-xs sm:text-sm text-emerald-300 block">اليوم موعد مباراة رسمية بالتقويم!</span>
                  <span className="text-[11px] text-slate-300">وصلت إلى يوم اللقاء، فريقك بانتظار صافرة البداية.</span>
                </div>
              </div>
              {onGoToMatches && (
                <button
                  onClick={onGoToMatches}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 shrink-0 cursor-pointer"
                >
                  الذهاب للمباراة ➔
                </button>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          {isMatchDay && onGoToMatches ? (
            <button
              onClick={onGoToMatches}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl transition-all shadow active:scale-95 cursor-pointer"
            >
              خوض المباراة الآن ⚽
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all shadow active:scale-95 cursor-pointer"
          >
            {isMatchDay ? 'إغلاق ومتابعة' : 'متابعة العمل اليومي ➔'}
          </button>
        </div>

      </div>
    </div>
  );
};
