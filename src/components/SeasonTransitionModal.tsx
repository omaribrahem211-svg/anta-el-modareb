import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { JobOfferCard } from './JobOfferCard';
import { RetroLeagueSelectionScreen } from './RetroLeagueSelectionScreen';
import {
  evaluateLeagueEligibilityForManager,
  getLicenseTitleArabic,
  normalizeCoachingLicense,
  CAREER_CONFIG,
} from '../utils/careerProgressionEngine';
import {
  Trophy,
  Award,
  DollarSign,
  TrendingUp,
  Briefcase,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Lock,
  Unlock,
  Globe,
  Wallet,
  Eye,
  EyeOff,
} from 'lucide-react';

export const SeasonTransitionModal: React.FC = () => {
  const {
    showSeasonTransitionModal,
    seasonEndSummary,
    season,
    userClub,
    manager,
    allLeagues,
    jobOffers,
    selectNextSeasonLeague,
    acceptJobOffer,
    rejectJobOffer,
    startNextSeason,
  } = useGame();

  const [activeView, setActiveView] = useState<'summary' | 'league_selection' | 'offers'>('summary');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [hideLockedLeagues, setHideLockedLeagues] = useState<boolean>(false);

  if (!showSeasonTransitionModal || !seasonEndSummary) return null;

  const safeJobOffers = Array.isArray(jobOffers) ? jobOffers : [];
  const acceptedOffer = safeJobOffers.find(o => o.status === 'accepted');
  const nextSeasonNum = season.seasonNumber + 1;

  const activeLicense = normalizeCoachingLicense(
    seasonEndSummary.licenseSettlement?.activeLicenseAfterRenewal || manager.license
  );
  const activeLicenseInfo = CAREER_CONFIG.LICENSES[activeLicense];
  const settlement = seasonEndSummary.licenseSettlement;

  const isChampion = seasonEndSummary.resultStatus === 'champion';
  const isPromoted = seasonEndSummary.resultStatus === 'promoted';
  const isRelegated = seasonEndSummary.resultStatus === 'relegated';

  const evaluatedLeagues = (allLeagues || []).map(lg =>
    evaluateLeagueEligibilityForManager(lg, activeLicense)
  );
  const displayedLeagues = hideLockedLeagues
    ? evaluatedLeagues.filter(item => item.isUnlocked)
    : evaluatedLeagues;

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeagueId(leagueId);
    selectNextSeasonLeague(leagueId);
    setActiveView('offers');
  };

  return (
    <div
      id="season_transition_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto"
      dir="rtl"
    >
      <div
        id="season_transition_modal_container"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Hero Banner */}
        <div
          className={`relative p-6 sm:p-8 text-center overflow-hidden ${
            isChampion
              ? 'bg-gradient-to-b from-amber-600/40 via-amber-900/30 to-slate-900 border-b border-amber-500/30'
              : isPromoted
              ? 'bg-gradient-to-b from-emerald-600/40 via-emerald-900/30 to-slate-900 border-b border-emerald-500/30'
              : isRelegated
              ? 'bg-gradient-to-b from-rose-700/40 via-rose-950/30 to-slate-900 border-b border-rose-600/30'
              : 'bg-gradient-to-b from-blue-600/40 via-slate-800 to-slate-900 border-b border-slate-700'
          }`}
        >
          {/* Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

          {/* Trophy / Status Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-white/20 shadow-2xl mb-4 relative">
            {isChampion ? (
              <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-bounce" />
            ) : isPromoted ? (
              <ArrowUpRight className="w-12 h-12 sm:w-14 sm:h-14 text-emerald-400" />
            ) : isRelegated ? (
              <ArrowDownRight className="w-12 h-12 sm:w-14 sm:h-14 text-rose-400" />
            ) : (
              <ShieldCheck className="w-12 h-12 sm:w-14 sm:h-14 text-blue-400" />
            )}
            <div className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-slate-950 border border-white/20 text-[11px] font-black text-amber-300">
              الموسم {seasonEndSummary.seasonNumber}
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            {seasonEndSummary.resultTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {seasonEndSummary.resultDescription}
          </p>

          {/* Destination Badge */}
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-white/10 text-xs sm:text-sm font-semibold">
            <span className="text-slate-400">الوجهة للموسم القادم:</span>
            <span className="text-amber-400 font-bold">
              {acceptedOffer ? acceptedOffer.clubName : seasonEndSummary.nextLeagueName} (الدرجة {acceptedOffer ? acceptedOffer.divisionTier : seasonEndSummary.nextDivisionTier})
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold">
              {activeLicenseInfo.badgeIcon} {activeLicenseInfo.titleArabic}
            </span>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <button
              id="btn_tab_season_summary"
              onClick={() => setActiveView('summary')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'summary'
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Award className="w-4 h-4" /> 1. حصيلة الموسم وتسوية الرخصة
            </button>
            <button
              id="btn_tab_league_selection"
              onClick={() => setActiveView('league_selection')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'league_selection'
                  ? 'bg-amber-400 text-slate-950 shadow-lg'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-amber-500/40'
              }`}
            >
              <Globe className="w-4 h-4" /> 2. اختيار وجهتك القادمة للموسم الجديد
            </button>
            <button
              id="btn_tab_season_offers"
              onClick={() => setActiveView('offers')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeView === 'offers'
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" /> 3. عروض الأندية المتاحة
              {safeJobOffers.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {safeJobOffers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-7 max-h-[58vh] overflow-y-auto space-y-6">
          {activeView === 'summary' ? (
            <>
              {/* End-of-Season Financial & License Renewal Settlement Card */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 p-4 sm:p-5 rounded-3xl border border-amber-500/40 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <h4 className="text-sm sm:text-base font-black text-white">
                      التسوية المالية الشخصية وتجديد الرخصة التدريبية للموسم الجديد
                    </h4>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeLicenseInfo.badgeIcon} {activeLicenseInfo.titleArabic}
                  </span>
                </div>

                {settlement?.wasDowngraded && settlement.warningMessage && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/60 flex items-start gap-3 text-xs text-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-rose-300 mb-0.5">
                        تنبيه هام: خفض تلقائي للرخصة التدريبية لعدم كفاية الرصيد الشخصي
                      </div>
                      <p className="leading-relaxed">{settlement.warningMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                    <div className="text-slate-400 mb-1">1. مكافأة وراتب نهاية الموسم (إيداع شخصي)</div>
                    <div className="text-base font-black text-emerald-400">
                      +{(settlement?.seasonBonusDeposited ?? Math.round(seasonEndSummary.prizeMoney * 0.15)).toLocaleString()}$
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                    <div className="text-slate-400 mb-1">2. رسوم التجديد السنوية للرخصة</div>
                    <div className="text-base font-black text-rose-400">
                      -{(settlement?.renewalFeeDeducted ?? activeLicenseInfo.annualRenewalFee).toLocaleString()}$
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                    <div className="text-slate-400 mb-1">3. الرصيد الشخصي الصافي للمدرب</div>
                    <div className="text-base font-black text-amber-400">
                      {(settlement?.personalWalletAfter ?? manager.personalWallet ?? 0).toLocaleString()}$
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <p className="text-xs text-slate-300">
                    صلاحيات رخصتك النشطة ({activeLicenseInfo.titleArabic}): <span className="text-amber-300 font-semibold">{activeLicenseInfo.description}</span>
                  </p>
                  <button
                    onClick={() => setActiveView('league_selection')}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
                  >
                    <Globe className="w-4 h-4" />
                    <span>اختيار الدوري القادم للموسم الجديد</span>
                  </button>
                </div>
              </div>

              {/* Standings Numbers Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" /> إحصائيات الدوري والترتيب النهائي
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 text-center">
                    <div className="text-xs text-slate-400 mb-1">المركز النهائي</div>
                    <div className="text-xl sm:text-2xl font-black text-amber-400">
                      {seasonEndSummary.finalPosition} <span className="text-xs text-slate-400">/ {seasonEndSummary.totalTeams}</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 text-center">
                    <div className="text-xs text-slate-400 mb-1">النقاط الإجمالية</div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-400">
                      {seasonEndSummary.points} <span className="text-xs text-slate-400">نقطة</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 text-center">
                    <div className="text-xs text-slate-400 mb-1">السجل (ف / ت / خ)</div>
                    <div className="text-lg sm:text-xl font-bold text-slate-100">
                      {seasonEndSummary.wins}ف • {seasonEndSummary.draws}ت • {seasonEndSummary.losses}خ
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/50 text-center">
                    <div className="text-xs text-slate-400 mb-1">الأهداف (له / عليه / الفارق)</div>
                    <div className="text-lg sm:text-xl font-bold text-slate-100">
                      {seasonEndSummary.goalsFor} - {seasonEndSummary.goalsAgainst} ({seasonEndSummary.goalDifference > 0 ? `+${seasonEndSummary.goalDifference}` : seasonEndSummary.goalDifference})
                    </div>
                  </div>
                </div>
              </div>

              {/* 🏆 Golden Trophies Showcase */}
              {((seasonEndSummary.trophiesWonList && seasonEndSummary.trophiesWonList.length > 0) ||
                seasonEndSummary.leagueTrophyAwarded ||
                seasonEndSummary.cupTrophyAwarded ||
                seasonEndSummary.continentalTrophyAwarded) && (
                <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-600/20 p-4 sm:p-5 rounded-3xl border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl animate-bounce">🏆</span>
                      <h4 className="text-base sm:text-lg font-black text-amber-300">
                        سجل بطولات الموسم الذهبية ({seasonEndSummary.seasonNumber})
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                      تتويج رسمي معتمد
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {seasonEndSummary.leagueTrophyAwarded && (
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-amber-400/40 flex items-center gap-3 shadow-md">
                        <span className="text-3xl">🥇</span>
                        <div>
                          <div className="text-[11px] text-amber-400 font-bold">بطل الدوري</div>
                          <div className="text-sm font-black text-white">{seasonEndSummary.leagueTrophyAwarded}</div>
                        </div>
                      </div>
                    )}
                    {seasonEndSummary.cupTrophyAwarded && (
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-amber-400/40 flex items-center gap-3 shadow-md">
                        <span className="text-3xl">🛡️</span>
                        <div>
                          <div className="text-[11px] text-purple-400 font-bold">بطل الكأس</div>
                          <div className="text-sm font-black text-white">{seasonEndSummary.cupTrophyAwarded}</div>
                        </div>
                      </div>
                    )}
                    {seasonEndSummary.continentalTrophyAwarded && (
                      <div className="bg-slate-900/80 p-3 rounded-2xl border border-amber-400/40 flex items-center gap-3 shadow-md">
                        <span className="text-3xl">🌍</span>
                        <div>
                          <div className="text-[11px] text-cyan-400 font-bold">المجد القاري</div>
                          <div className="text-sm font-black text-white">{seasonEndSummary.continentalTrophyAwarded}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Competitions Outcome Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-amber-950/30 to-slate-800/80 p-4 rounded-2xl border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h5 className="font-bold text-slate-200 text-sm">الدوري العام</h5>
                  </div>
                  {seasonEndSummary.leagueTrophyAwarded ? (
                    <div className="flex items-center gap-3 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <div className="font-bold text-amber-300 text-sm">{seasonEndSummary.leagueTrophyAwarded}</div>
                        <div className="text-xs text-amber-200/70">تتويج مستحق بلقب المسابقة</div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                      <div className="text-sm font-bold text-slate-300">المركز {seasonEndSummary.finalPosition}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {isPromoted ? 'ضمن الصعود للدرجة الأعلى' : isRelegated ? 'هبط إلى الدرجة الأدنى' : 'البقاء في نفس الدرجة'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-purple-950/30 to-slate-800/80 p-4 rounded-2xl border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    <h5 className="font-bold text-slate-200 text-sm">الكأس الوطنية</h5>
                  </div>
                  <div className="flex items-center gap-3 bg-purple-500/10 p-3 rounded-xl border border-purple-500/30">
                    <span className="text-2xl">🎖️</span>
                    <div>
                      <div className="font-bold text-purple-300 text-sm">{seasonEndSummary.cupResultText}</div>
                      <div className="text-xs text-purple-200/70">
                        {seasonEndSummary.cupTrophyAwarded ? 'حصد لقب الكأس رسمياً' : 'منافسات الكأس'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-950/30 to-slate-800/80 p-4 rounded-2xl border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <h5 className="font-bold text-slate-200 text-sm">البطولة القارية</h5>
                  </div>
                  <div className="flex items-center gap-3 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/30">
                    <span className="text-2xl">🌍</span>
                    <div>
                      <div className="font-bold text-cyan-300 text-sm">{seasonEndSummary.continentalResultText || 'لم يشارك هذا الموسم'}</div>
                      <div className="text-xs text-cyan-200/70">
                        {seasonEndSummary.continentalTrophyAwarded ? 'تتويج قاري تاريخي' : 'المسابقات الإفريقية/الأوروبية'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial, Manager XP & Player Development Rewards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> المكافآت المالية المضافة لخزينة النادي
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">مكافأة ترتيب الدوري:</span>
                    <span className="font-bold text-emerald-400">+{seasonEndSummary.prizeMoney.toLocaleString()}$</span>
                  </div>
                  {(seasonEndSummary.cupPrizeMoney || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                      <span className="text-amber-300 font-semibold">جوائز مسابقة الكأس:</span>
                      <span className="font-bold text-amber-400">+{seasonEndSummary.cupPrizeMoney.toLocaleString()}$</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">عوائد التذاكر والرعاة:</span>
                    <span className="font-semibold text-slate-200">+{seasonEndSummary.ticketRevenueTotal.toLocaleString()}$</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="font-bold text-slate-200">ميزانية النادي الجديدة:</span>
                    <span className="font-bold text-emerald-400">{seasonEndSummary.finalBudget.toLocaleString()}$</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-2xl border border-amber-500/30 space-y-2.5 bg-gradient-to-b from-amber-950/20 to-slate-800/60">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Zap className="w-4 h-4 text-amber-400" /> نقاط تطوير اللاعبين المكتسبة
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">مكافأة إنجاز الكأس:</span>
                    <span className="font-bold text-amber-300">+{seasonEndSummary.cupDevelopmentPoints || 0} ⚡ نقطة</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">مكافأة ترتيب الدوري:</span>
                    <span className="font-bold text-emerald-300">+{seasonEndSummary.leagueDevelopmentPoints || 0} ⚡ نقطة</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="font-bold text-amber-300">إجمالي نقاط التطوير:</span>
                    <span className="font-black text-amber-400 text-base">+{seasonEndSummary.totalDevelopmentPoints || 0} ⚡</span>
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <TrendingUp className="w-4 h-4 text-blue-400" /> مكاسب وتطور المدير الفني
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">نقاط الخبرة XP المكتسبة:</span>
                    <span className="font-bold text-amber-400">+{seasonEndSummary.xpEarned} XP</span>
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">تغير السمعة المهنية:</span>
                    <span className={`font-bold ${seasonEndSummary.reputationChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {seasonEndSummary.reputationChange >= 0 ? `+${seasonEndSummary.reputationChange}` : seasonEndSummary.reputationChange} نقطة
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="font-bold text-slate-200">الرخصة المعتمدة:</span>
                    <span className="font-bold text-amber-400">{activeLicenseInfo.titleArabic}</span>
                  </div>
                </div>
              </div>
            </>
          ) : activeView === 'league_selection' ? (
            /* End-of-Season League Selection Screen ("اختر وجهتك القادمة للموسم الجديد") */
            <RetroLeagueSelectionScreen
              activeLicenseOverride={activeLicense}
              onSelectLeagueAndShowOffers={leagueId => handleSelectLeague(leagueId)}
            />
          ) : (
            /* Job Offers View */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">
                    {selectedLeagueId
                      ? `الأندية والعروض المتاحة في الدوري المختار (${safeJobOffers[0]?.leagueName || ''})`
                      : 'سوق المدربين والعروض التدريبية المتاحة'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    عروض الأندية المسموح لك بتدريبها وفق صلاحيات ({activeLicenseInfo.titleArabic}). يمكنك أيضاً تغيير الدوري من تبويب "اختيار وجهتك القادمة".
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveView('league_selection')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                  >
                    تغيير الدوري المختار 🌍
                  </button>
                  {acceptedOffer && (
                    <button
                      onClick={() => rejectJobOffer(acceptedOffer.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      إلغاء اختيار العقد
                    </button>
                  )}
                </div>
              </div>

              {/* Manager Market Profile Status Card */}
              <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-500/30 font-bold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>{activeLicenseInfo.titleArabic}</span>
                  </div>
                  <div className="text-slate-300">
                    الرصيد الشخصي: <span className="text-emerald-400 font-bold">{(manager.personalWallet || 0).toLocaleString()}$</span>
                  </div>
                  <div className="text-slate-300">
                    السمعة: <span className="text-amber-400 font-bold">⭐ {manager.reputation || 15}/100</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-400">
                  <span>
                    الألقاب: <strong className="text-slate-200">{(manager.leagueTitles || 0) + (manager.cupTitles || 0)} 🏆</strong>
                  </span>
                </div>
              </div>

              {/* Current Club Option Card */}
              {userClub && (
                <div
                  onClick={() => acceptedOffer && rejectJobOffer(acceptedOffer.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    !acceptedOffer
                      ? 'bg-slate-800/90 border-blue-500/80 shadow-lg shadow-blue-900/20 ring-2 ring-blue-500/30'
                      : 'bg-slate-900/60 border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md border border-white/10"
                        style={{ backgroundColor: userClub.primaryColor || '#10b981' }}
                      >
                        {userClub.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-100 text-sm sm:text-base">{userClub.name}</h4>
                          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/30">
                            ناديك الحالي
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          البقاء مع النادي والاستمرار في الموسم القادم ({seasonEndSummary.nextLeagueName})
                        </p>
                      </div>
                    </div>

                    {!acceptedOffer && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-800">
                        <CheckCircle2 className="w-4 h-4" /> الخيار المحدد (البقاء)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Incoming Offers List */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  عروض الأندية المتاحة للقيادة ({safeJobOffers.length})
                </h4>

                {safeJobOffers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    لا توجد عروض إضافية في هذا القسم حالياً. اضغط على "اختيار وجهتك القادمة للموسم الجديد" لاختيار دوري متاح!
                  </div>
                ) : (
                  safeJobOffers.map(offer => (
                    <JobOfferCard
                      key={offer.id}
                      offer={offer}
                      isSelected={acceptedOffer?.id === offer.id}
                      onAccept={acceptJobOffer}
                      onReject={rejectJobOffer}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer & CTA */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-right">
            <div className="text-xs text-slate-400">الفريق الذي ستقوده في الموسم {nextSeasonNum}:</div>
            <div className="text-sm font-bold text-amber-400">
              {acceptedOffer ? `${acceptedOffer.clubName} (${acceptedOffer.leagueName})` : userClub ? `${userClub.name} (${seasonEndSummary.nextLeagueName})` : 'اختر نادياً للموسم القادم'}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {activeView === 'summary' && (
              <button
                onClick={() => setActiveView('league_selection')}
                className="py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4" />
                <span>اختيار الدوري القادم</span>
              </button>
            )}
            <button
              id="btn_start_new_season_cta"
              onClick={() => startNextSeason(acceptedOffer?.id)}
              className="flex-1 sm:flex-initial py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-slate-950" />
              <span>
                {acceptedOffer
                  ? `الانتقال وبدء الموسم الجديد مع ${acceptedOffer.clubName} ✍️`
                  : `بدء الموسم الجديد مع ${userClub?.name || 'فريقك'} 🚀`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

