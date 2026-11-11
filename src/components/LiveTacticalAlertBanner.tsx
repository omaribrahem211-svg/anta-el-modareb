import React, { useState } from 'react';
import {
  AlertTriangle,
  Flame,
  Zap,
  Shield,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Users,
  Compass,
  Lock,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { TacticalAlert, TACTICAL_ARABIC_LABELS } from '../utils/tacticalAdvisor';

interface LiveTacticalAlertBannerProps {
  alert: TacticalAlert;
  onApply: (alert: TacticalAlert) => void;
  onDismiss: (alertId: string) => void;
  isApplied?: boolean;
}

export const LiveTacticalAlertBanner: React.FC<LiveTacticalAlertBannerProps> = ({
  alert,
  onApply,
  onDismiss,
  isApplied = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  const handleApply = () => {
    setIsApplying(true);
    setTimeout(() => {
      onApply(alert);
      setIsApplying(false);
      setJustApplied(true);
      setTimeout(() => {
        setJustApplied(false);
      }, 3000);
    }, 250);
  };

  const getIconForCategory = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-4 h-4 text-orange-400" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'TrendingUp':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'Compass':
        return <Compass className="w-4 h-4 text-teal-400" />;
      case 'Lock':
        return <Lock className="w-4 h-4 text-slate-400" />;
      default:
        return <Users className="w-4 h-4 text-indigo-400" />;
    }
  };

  const isUrgent = alert.severity === 'urgent';
  const isWarning = alert.severity === 'warning';

  return (
    <div
      id={`tactical_alert_${alert.id}`}
      className={`rounded-3xl border-2 transition-all duration-300 shadow-2xl relative overflow-hidden ${
        isApplied || justApplied
          ? 'bg-slate-900/95 border-emerald-500/80 shadow-emerald-950/40'
          : isUrgent
          ? 'bg-gradient-to-b from-red-950/90 via-slate-900 to-slate-950 border-red-500/80 shadow-red-950/40'
          : isWarning
          ? 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/70 shadow-amber-950/30'
          : 'bg-gradient-to-b from-blue-950/80 via-slate-900 to-slate-950 border-blue-500/70 shadow-blue-950/30'
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className={`h-1.5 w-full ${
          isApplied || justApplied
            ? 'bg-emerald-400'
            : isUrgent
            ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse'
            : isWarning
            ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500'
            : 'bg-blue-400'
        }`}
      />

      <div className="p-3.5 sm:p-4 space-y-3">
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 border ${
                isUrgent
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse'
                  : isWarning
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{alert.badge}</span>
            </span>

            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>تنبيه المساعد الفني للمدرب</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-0.5 cursor-pointer"
              title={isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}
            >
              <span className="text-[10px] hidden sm:inline">{isExpanded ? 'طي' : 'تفاصيل'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="تجاهل التنبيه مؤقتاً"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alert Title & Situation Brief */}
        <div className="space-y-1">
          <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 leading-snug">
            <span>{alert.title}</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            {alert.situation}
          </p>
        </div>

        {/* Stats Highlights Pills */}
        {alert.statsHighlight && alert.statsHighlight.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {alert.statsHighlight.map((stat, idx) => (
              <div
                key={idx}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border ${
                  stat.isNegative
                    ? 'bg-red-950/50 border-red-700/50 text-red-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}
              >
                <span className="text-[10px] text-slate-400 font-sans">{stat.label}:</span>
                <span className="font-black text-white">{stat.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Expanded Details: Suggested Tactical Setup */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-slate-800/80 animate-fade-in">
            {/* Quick Changes Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Formation Suggestion Card */}
              {alert.suggestedFormation && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">التشكيل المقترح:</span>
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {alert.suggestedFormation}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {alert.suggestedFormation === '4-2-3-1'
                      ? 'كثافة خط الوسط وصانع لعب'
                      : alert.suggestedFormation === '3-5-2'
                      ? '5 لاعبين في الوسط وسيطرة تامة'
                      : alert.suggestedFormation === '4-3-3'
                      ? 'هجوم ثلاثي متقدم على الأطراف'
                      : alert.suggestedFormation === '3-4-1-2'
                      ? 'ثنائي هجومي وصانع ألعاب'
                      : 'توازن دفاعي وتأمين للمرمى'}
                  </div>
                </div>
              )}

              {/* Mentality Suggestion Card */}
              {alert.suggestedMentality && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">عقلية اللعب:</span>
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className="text-sm font-black text-amber-300">
                    {TACTICAL_ARABIC_LABELS.mentality[alert.suggestedMentality] || alert.suggestedMentality}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {alert.suggestedMentality === 'ultra_attacking'
                      ? 'اندفاع كاسح للمناطق الأمامية'
                      : alert.suggestedMentality === 'attacking'
                      ? 'جرأة هجومية وبناء سريع'
                      : alert.suggestedMentality === 'defensive'
                      ? 'تأمين الدفاع وإغلاق العمق'
                      : 'توازن بين الخطوط'}
                  </div>
                </div>
              )}

              {/* Pressing Suggestion Card */}
              {alert.suggestedPressing && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">حدة الضغط:</span>
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div className="text-sm font-black text-yellow-300">
                    {TACTICAL_ARABIC_LABELS.pressing[alert.suggestedPressing] || alert.suggestedPressing}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {alert.suggestedPressing === 'gegenpress'
                      ? 'استخلاص فوري بعد فقدان الكرة'
                      : alert.suggestedPressing === 'high'
                      ? 'ضغط متقدم في مناطق الخصم'
                      : 'ضغط منضبط في منتصف ملعبنا'}
                  </div>
                </div>
              )}
            </div>

            {/* Rationale & Tactical Insight */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-2.5 text-xs text-slate-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-400">رؤية المساعد الفني: </span>
                <span>{alert.rationale}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Button: Apply Recommendation Now */}
        <div className="pt-1 flex items-center gap-2">
          {isApplied || justApplied ? (
            <div className="w-full py-2.5 px-4 bg-emerald-950/80 border border-emerald-500 rounded-2xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow-inner">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>تم تطبيق التعديلات التكتيكية بنجاح! الفريق ينفذ التعليمات الآن 🟢</span>
            </div>
          ) : (
            <button
              id={`apply_tactical_advice_${alert.id}`}
              onClick={handleApply}
              disabled={isApplying}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-xl cursor-pointer ${
                isUrgent
                  ? 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 shadow-red-950/50 ring-1 ring-red-400/40'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 ring-1 ring-emerald-400/40'
              }`}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري تطبيق التعليمات والتعديل...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{alert.actionButtonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
