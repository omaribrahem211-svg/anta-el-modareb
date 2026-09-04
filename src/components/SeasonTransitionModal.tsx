import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { JobOfferCard } from './JobOfferCard';
import {
  Trophy,
  Award,
  DollarSign,
  TrendingUp,
  Briefcase,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Building2,
  Calendar,
  Zap,
} from 'lucide-react';

export const SeasonTransitionModal: React.FC = () => {
  const {
    showSeasonTransitionModal,
    closeSeasonModal,
    seasonEndSummary,
    season,
    userClub,
    manager,
    jobOffers,
    acceptJobOffer,
    rejectJobOffer,
    startNextSeason,
  } = useGame();

  const [activeView, setActiveView] = useState<'summary' | 'offers'>('summary');

  if (!showSeasonTransitionModal || !seasonEndSummary) return null;

  const safeJobOffers = Array.isArray(jobOffers) ? jobOffers : [];
  const acceptedOffer = safeJobOffers.find(o => o.status === 'accepted');
  const nextSeasonNum = season.seasonNumber + 1;

  const isChampion = seasonEndSummary.resultStatus === 'champion';
  const isPromoted = seasonEndSummary.resultStatus === 'promoted';
  const isRelegated = seasonEndSummary.resultStatus === 'relegated';
  const isPlayoffs = seasonEndSummary.resultStatus === 'playoffs';

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
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-white/10 text-xs sm:text-sm font-semibold">
            <span className="text-slate-400">الوجهة للموسم القادم:</span>
            <span className="text-amber-400 font-bold">
              {acceptedOffer ? acceptedOffer.clubName : seasonEndSummary.nextLeagueName} (الدرجة {acceptedOffer ? acceptedOffer.divisionTier : seasonEndSummary.nextDivisionTier})
            </span>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              id="btn_tab_season_summary"
              onClick={() => setActiveView('summary')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'summary'
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Award className="w-4 h-4" /> حصيلة الموسم والإنجازات
            </button>
            <button
              id="btn_tab_season_offers"
              onClick={() => setActiveView('offers')}
              className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeView === 'offers'
                  ? 'bg-white text-slate-950 shadow-lg'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <Briefcase className="w-4 h-4" /> العروض التدريبية المقدمة
              {jobOffers.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {jobOffers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-7 max-h-[55vh] overflow-y-auto space-y-6">
          {activeView === 'summary' ? (
            <>
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

              {/* Trophies & Cup Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-amber-950/30 to-slate-800/80 p-4 rounded-2xl border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h5 className="font-bold text-slate-200 text-sm">البطولات والدرع</h5>
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
                    <p className="text-xs text-slate-400">
                      لم يتم التتويج بلقب الدوري هذا الموسم. التركيز على التتويج في المواسم القادمة!
                    </p>
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
                        {seasonEndSummary.cupTrophyAwarded ? 'حصد لقب الكأس رسمياً' : 'منافسات خروج المغلوب'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial, Manager XP & Player Development Rewards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Finances */}
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <DollarSign className="w-4 h-4 text-emerald-400" /> المكافآت المالية المضافة للخزينة
                  </div>
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">مكافأة ترتيب الدوري:</span>
                    <span className="font-bold text-emerald-400">+{seasonEndSummary.prizeMoney.toLocaleString()} ج.م</span>
                  </div>
                  {(seasonEndSummary.cupPrizeMoney || 0) > 0 && (
                    <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                      <span className="text-amber-300 font-semibold">جوائز مسابقة الكأس:</span>
                      <span className="font-bold text-amber-400">+{seasonEndSummary.cupPrizeMoney.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs py-1 border-b border-slate-700/40">
                    <span className="text-slate-300">عوائد التذاكر والرعاة:</span>
                    <span className="font-semibold text-slate-200">+{seasonEndSummary.ticketRevenueTotal.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-1">
                    <span className="font-bold text-slate-200">الرصيد المالي الجديد:</span>
                    <span className="font-bold text-emerald-400">{seasonEndSummary.finalBudget.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Player Development Points Card */}
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
                  <p className="text-[10px] text-slate-400 leading-tight">
                    يمكنك استهلاك هذه النقاط في مركز التدريب لترقية مهارات وسقف إمكانات اللاعبين!
                  </p>
                </div>

                {/* Manager Rewards */}
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
                    <span className="font-bold text-slate-200">المستوى والرخصة:</span>
                    <span className="font-bold text-slate-100">المستوى {manager.level} • رخصة {manager.license}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Job Offers View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">العروض التدريبية الجديدة</h3>
                  <p className="text-xs text-slate-400">
                    يمكنك اختيار الانتقال إلى نادٍ جديد لقيادة مشروعه، أو البقاء مع ناديك الحالي ومواصلة المسيرة.
                  </p>
                </div>
                {acceptedOffer && (
                  <button
                    onClick={() => rejectJobOffer(acceptedOffer.id)}
                    className="text-xs text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    إلغاء اختيار العقد
                  </button>
                )}
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
                  عروض الأندية الأخرى المتاحة ({safeJobOffers.length})
                </h4>

                {safeJobOffers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    لا توجد عروض إضافية متاحة حالياً. حقق نتائج أفضل لرفع سمعتك وجذب كبرى الأندية!
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
            <button
              id="btn_start_new_season_cta"
              onClick={() => startNextSeason(acceptedOffer?.id)}
              className="flex-1 sm:flex-initial py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-slate-950" /> بدء الموسم الجديد (الموسم {nextSeasonNum})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
