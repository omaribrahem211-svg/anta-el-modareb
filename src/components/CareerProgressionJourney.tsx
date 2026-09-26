import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  evaluateLicenseEligibility,
  evaluateCareerMilestones,
  getReputationInfo,
  CAREER_CONFIG,
  getNextLicense,
  getLicenseRank,
} from '../utils/careerProgressionEngine';
import { CoachingLicenseTier, CareerMilestone } from '../types/game';
import {
  Award,
  Star,
  CheckCircle2,
  Lock,
  Sparkles,
  Trophy,
  Flame,
  Shield,
  Target,
  Globe2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertCircle,
  HelpCircle,
  Zap,
} from 'lucide-react';

export const CareerProgressionJourney: React.FC = () => {
  const { manager, userClub, enrollInCoachingCourse } = useGame();

  const [activeCategory, setActiveCategory] = useState<'all' | 'short' | 'mid' | 'long'>('all');
  const [showTiersGuide, setShowTiersGuide] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; success: boolean } | null>(null);

  // 1. License Evaluation
  const licenseEval = evaluateLicenseEligibility(manager, userClub);
  const currentLicense = (manager.license as CoachingLicenseTier) || 'D';
  const currentRank = getLicenseRank(currentLicense);

  // 2. Reputation Details
  const reputation = manager.reputation || 15;
  const repInfo = getReputationInfo(reputation);

  // 3. Milestones Evaluation
  const milestonesResult = evaluateCareerMilestones(manager, userClub);

  // 4. Handle License Upgrade Click
  const handleUpgradeLicense = () => {
    if (!licenseEval.nextLicense) return;
    const courseId = `license_${licenseEval.nextLicense.toLowerCase()}`;
    const res = enrollInCoachingCourse(courseId);
    setActionMessage({ text: res.message, success: res.success });
    setTimeout(() => {
      setActionMessage(null);
    }, 4000);
  };

  const filteredMilestones = milestonesResult.milestones.filter(m => {
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  const allLicenses: CoachingLicenseTier[] = ['D', 'C', 'B', 'A', 'PRO', 'ELITE'];

  return (
    <div className="space-y-4 text-right" dir="rtl">

      {/* Action / Notification Toast */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xl animate-fade-in ${
            actionMessage.success
              ? 'bg-emerald-950 text-emerald-300 border-2 border-emerald-500/80 shadow-emerald-500/10'
              : 'bg-rose-950 text-rose-300 border-2 border-rose-500/80'
          }`}
        >
          {actionMessage.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span className="text-xs">{actionMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. COACHING LICENSES TIMELINE & NEXT LICENSE PROGRESSION */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border-2 border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>مسار الرخص التدريبية المعتمدة (Coaching Licenses)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                  {CAREER_CONFIG.LICENSES[currentLicense]?.codeName || currentLicense}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                الرخص تفتح لك أبواب تدريب أندية أقوى، ولا يمكن تجاوزها بالانتظار بل بإنجازات حقيقية في المباريات.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTiersGuide(!showTiersGuide)}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showTiersGuide ? 'إخفاء دليل الأندية' : 'دليل الأندية والرخص'}</span>
          </button>
        </div>

        {/* Horizontal License Milestones Stepper */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[500px] gap-2">
            {allLicenses.map((lic, idx) => {
              const licRank = getLicenseRank(lic);
              const isCurrent = lic === currentLicense;
              const isEarned = licRank <= currentRank;
              const isNext = lic === licenseEval.nextLicense;
              const licConfig = CAREER_CONFIG.LICENSES[lic];

              return (
                <div key={lic} className="flex-1 flex flex-col items-center text-center relative group">
                  {idx > 0 && (
                    <div
                      className={`absolute top-4 -right-1/2 w-full h-1 -z-0 transition-all ${
                        licRank <= currentRank ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    />
                  )}

                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs z-10 transition-all shadow-md ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30 scale-110'
                        : isEarned
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                        : isNext
                        ? 'bg-purple-950 text-purple-300 border-2 border-purple-500 animate-pulse'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {isEarned ? lic : <Lock className="w-3.5 h-3.5" />}
                  </div>

                  <span className={`text-[11px] font-bold mt-1.5 ${isCurrent ? 'text-amber-400' : isEarned ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {licConfig.codeName}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                    {isCurrent ? 'رخصتك الحالية' : isNext ? 'هدفك القادم' : licConfig.badgeName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collapsible Club Tiers Guide */}
        {showTiersGuide && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-fade-in text-xs">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>دليل متطلبات تدريب أندية العالم:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(CAREER_CONFIG.CLUB_TIERS).map(ct => (
                <div key={ct.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ct.nameArabic}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      رخصة {ct.minLicense}+
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{ct.description}</p>
                  <div className="text-[10px] text-slate-300 flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <span>السمعة: {ct.minReputation}+</span>
                    <span>•</span>
                    <span>البطولات: {ct.minTrophies}</span>
                    <span>•</span>
                    <span>المباريات: {ct.minMatches}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next License Target Card & Checklist */}
        {licenseEval.nextLicense && licenseEval.nextLicenseConfig ? (
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/30 border border-purple-500/40 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="font-black text-xs text-white">
                  متطلبات الحصول على: {licenseEval.nextLicenseConfig.arabicTitle} ({licenseEval.nextLicenseConfig.codeName})
                </h4>
              </div>
              <span className="text-[11px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-bold border border-purple-500/30">
                {licenseEval.missingCount === 0 ? 'مستوفٍ لجميع الشروط! 🚀' : `متبقي ${licenseEval.missingCount} شروط`}
              </span>
            </div>

            <p className="text-[11px] text-slate-300">
              {licenseEval.nextLicenseConfig.tierDescription} • <strong className="text-amber-300">تفتح:</strong> {licenseEval.nextLicenseConfig.unlockedClubsDescription}
            </p>

            {/* Overall License Progress Bar */}
            <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  <span>نسبة استيفاء متطلبات الرخصة ({licenseEval.nextLicenseConfig.codeName})</span>
                </span>
                <span className="font-mono font-bold text-purple-300">
                  {licenseEval.overallProgressPercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, licenseEval.overallProgressPercent))}%` }}
                />
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {licenseEval.checklist.map((item) => (
                <div
                  key={item.key}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1.5 text-xs transition-all ${
                    item.isMet
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                          item.isMet
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {item.isMet ? '✓' : '•'}
                      </div>
                      <span className="font-medium text-[11px]">{item.label}</span>
                    </div>

                    <div className="text-left shrink-0">
                      <span className={`font-mono text-[11px] font-bold ${item.isMet ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.current} / {item.target} {item.unit || ''}
                      </span>
                    </div>
                  </div>

                  {/* Individual criteria progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.isMet ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Anti-AFK Play Time Informative Tip */}
            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-cyan-300 gap-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  وقت اللعب الفعلي المسجل: <strong className="text-white font-mono">{licenseEval.activePlayFormatted}</strong> (نظام الحماية ضد الخمول Anti-AFK مفعل)
                </span>
              </div>
              <span className="text-[10px] bg-cyan-950/80 px-2 py-0.5 rounded text-cyan-200 border border-cyan-500/40">
                ميداني فقط ⏱️
              </span>
            </div>

            {/* Upgrade Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleUpgradeLicense}
                disabled={!licenseEval.canUpgrade}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                  licenseEval.canUpgrade
                    ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 cursor-pointer active:scale-98 animate-pulse'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>
                  {licenseEval.canUpgrade
                    ? `اجتياز الاختبار وترقية الرخصة إلى (${licenseEval.nextLicenseConfig.codeName}) الآن! 🎓`
                    : `استكمل شروط الاعتماد الفنية (${licenseEval.missingCount} نواقص) لفتح اختبار الرخصة`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-purple-950/40 via-amber-950/40 to-slate-950 p-4 rounded-2xl border border-amber-500/40 text-center space-y-1">
            <span className="text-2xl">👑🌍</span>
            <h4 className="font-black text-sm text-amber-300">بلغت أعلى رخصة تدريبية في تاريخ كرة القدم (WORLD ELITE)!</h4>
            <p className="text-xs text-slate-300">أنت في قمة المجد الكروي ولديك الأهلية لقيادة أي نادٍ أو منتخب على وجه الأرض.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MANAGER REPUTATION GAUGE (سمعة المدرب من 0 إلى 100) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>مؤشر السمعة التدريبية (Manager Reputation)</span>
                <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                  {reputation} / 100
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">تحدد جودة ونوعية عروض الأندية التي تصلك ومقدار احترام إدارات الأندية لقراراتك</p>
            </div>
          </div>

          <div className="text-left">
            <span className={`text-xs font-black ${repInfo.color} block`}>{repInfo.title}</span>
            <span className="text-[10px] text-slate-400 font-mono">{repInfo.badge}</span>
          </div>
        </div>

        {/* Reputation Progress Bar with Tiers */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.max(5, reputation)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>مغمور (0)</span>
            <span>صاعد (26)</span>
            <span>معتمد (46)</span>
            <span>كبير (66)</span>
            <span>عالمي (81)</span>
            <span>أسطورة (100)</span>
          </div>
        </div>

        <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>كيف ترفع سمعتك؟ الفوز على الأندية الأقوى، التتويج بالبطولات، وتصعيد المواهب الشابة يمنحك قفزات كبرى.</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTINUOUS CAREER MILESTONES (الأهداف المستمرة للمسيرة) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>أهداف وإنجازات المسيرة التدريبية (Career Milestones)</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                  {milestonesResult.completedCount} / {milestonesResult.totalCount} ({milestonesResult.percentCompleted}%)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">أهداف متدرجة تضمن لك دائماً تحديات جديدة لتحقيقها طوال رحلتك</p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCategory === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('short')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCategory === 'short' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              قصيرة المدى
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('mid')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCategory === 'mid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              متوسطة المدى
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('long')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCategory === 'long' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              طويلة المدى 👑
            </button>
          </div>
        </div>

        {/* Milestones Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMilestones.map((m) => {
            const isCompleted = m.isCompleted;
            const progressPercent = Math.min(100, Math.round((m.currentValue / m.targetValue) * 100));

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-gradient-to-br from-emerald-950/40 to-slate-950 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{m.title}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5 leading-snug">{m.description}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isCompleted ? 'مكتمل ✓' : `${m.currentValue}/${m.targetValue}`}
                    </span>
                  </div>

                  {/* Progress Bar if not completed */}
                  {!isCompleted && (
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                        <span>التقدم الميداني</span>
                        <span>{progressPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rewards Tag */}
                <div className="flex items-center justify-between text-[10px] pt-2 mt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-amber-400 font-mono font-bold">+{m.rewardCash.toLocaleString()} ج.م</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">+{m.rewardReputation} ⭐ سمعة</span>
                    <span>•</span>
                    <span className="text-purple-300">+{m.rewardXp} XP</span>
                  </div>

                  <span className="text-[9px] text-slate-400">
                    {m.category === 'short' ? 'أهداف قصيرة' : m.category === 'mid' ? 'أهداف متوسطة' : 'أهداف كبرى'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
