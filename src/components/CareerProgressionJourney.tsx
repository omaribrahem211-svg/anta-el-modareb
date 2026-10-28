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
  const currentLicense = licenseEval.currentLicense;
  const currentRank = getLicenseRank(currentLicense);

  // 2. Reputation Details
  const reputation = manager.reputation || 15;
  const repInfo = getReputationInfo(reputation);

  // 3. Milestones Evaluation
  const milestonesResult = evaluateCareerMilestones(manager, userClub);

  // 4. Handle License Upgrade Click
  const handleUpgradeLicense = (targetTier?: CoachingLicenseTier) => {
    const tierToBuy = targetTier || licenseEval.nextLicense;
    if (!tierToBuy) return;
    const courseId = `license_${tierToBuy.toLowerCase()}`;
    const res = enrollInCoachingCourse(courseId);
    setActionMessage({ text: res.message, success: res.success });
    setTimeout(() => {
      setActionMessage(null);
    }, 4500);
  };

  const filteredMilestones = milestonesResult.milestones.filter(m => {
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  const allLicenses: Array<'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY'> = [
    'BASIC',
    'PREMIER',
    'CONTINENTAL',
    'LEGENDARY',
  ];
  const ownedSet = new Set(['BASIC', ...(manager.ownedLicenses || [])]);

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
      {/* 1. COACHING LICENSES STORE & STRUCTURE (هيكل ومتجر الرخص التدريبية الـ 4) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border-2 border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>نظام ومتجر الرخص التدريبية المعتمد (4 رخص تدريبية)</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                  {CAREER_CONFIG.LICENSES[currentLicense]?.titleArabic}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                تُخصم جميع عمليات شراء الرخص وتجديدها السنوي حصراً من ميزانيتك الشخصية ({(manager.personalWallet || 0).toLocaleString()}$) وليس من ميزانية النادي.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTiersGuide(!showTiersGuide)}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showTiersGuide ? 'إخفاء دليل الأندية' : 'دليل تصنيف الأندية'}</span>
          </button>
        </div>

        {/* 4 Coaching Licenses Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {allLicenses.map((lic) => {
            const licConfig = CAREER_CONFIG.LICENSES[lic];
            const licRank = getLicenseRank(lic);
            const isCurrent = lic === currentLicense;
            const isOwned = ownedSet.has(lic) || licRank <= currentRank;
            const canAfford = (manager.personalWallet || 0) >= licConfig.purchaseCost;

            return (
              <div
                key={lic}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-400 ring-2 ring-amber-500/20 shadow-lg'
                    : isOwned
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/40'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-lg shadow-inner shrink-0">
                        {licConfig.badgeIcon}
                      </div>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                          <span>{licConfig.titleArabic}</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {licConfig.titleEnglish}
                        </span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="text-[10px] bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-black shrink-0">
                        رخصتك النشطة ✓
                      </span>
                    ) : isOwned ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-600/50 px-2.5 py-0.5 rounded-full font-bold shrink-0">
                        مملوكة ✓
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                        <Lock className="w-3 h-3" /> غير مملوكة
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80">
                    <strong className="text-amber-300 block mb-0.5">الصلاحيات:</strong>
                    {licConfig.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">سعر الشراء (لمرة واحدة)</span>
                      <span className="font-mono font-black text-amber-400">
                        {licConfig.purchaseCost === 0 ? 'مجانية (0$)' : `${licConfig.purchaseCost.toLocaleString()}$`}
                      </span>
                    </div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">رسوم التجديد السنوية</span>
                      <span className="font-mono font-black text-cyan-400">
                        {licConfig.annualRenewalFee === 0 ? 'مجانية (0$)' : `${licConfig.annualRenewalFee.toLocaleString()}$`}
                      </span>
                    </div>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleUpgradeLicense(lic)}
                    disabled={!isOwned && !canAfford}
                    className={`w-full py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                      isOwned
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                        : canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 cursor-pointer active:scale-98'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>
                      {isOwned
                        ? `تفعيل ${licConfig.titleArabic} مجاناً`
                        : canAfford
                        ? `شراء وترقية إلى ${licConfig.titleArabic} (${licConfig.purchaseCost.toLocaleString()}$)`
                        : `الرصيد الشخصي غير كافٍ (${licConfig.purchaseCost.toLocaleString()}$)`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Collapsible Club Tiers Guide */}
        {showTiersGuide && (
          <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-fade-in text-xs">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>دليل صلاحيات الرخص وتصنيفات الدوريات والأندية:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.values(CAREER_CONFIG.CLUB_TIERS).map(ct => (
                <div key={ct.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{ct.nameArabic}</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                      {CAREER_CONFIG.LICENSES[ct.minLicense]?.titleArabic}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">{ct.description}</p>
                </div>
              ))}
            </div>
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
