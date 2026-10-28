import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import {
  evaluateLeagueEligibilityForManager,
  normalizeCoachingLicense,
  CAREER_CONFIG,
  isClubEligibleForManager,
} from '../utils/careerProgressionEngine';
import { Club, LeagueDefinition } from '../types/game';
import { Globe, Eye, EyeOff, ArrowRight, CheckCircle2, Lock, Unlock, Wallet } from 'lucide-react';

export interface RetroLeagueSelectionScreenProps {
  activeLicenseOverride?: string;
  onSelectLeagueAndShowOffers?: (leagueId: string) => void;
  onDirectClubAppoint?: (club: Club, league: LeagueDefinition) => void;
  onClose?: () => void;
  isStandalonePrototype?: boolean;
}

const CARD_PALETTES = [
  {
    bg: 'from-emerald-900/60 via-slate-900 to-slate-950',
    border: 'border-emerald-500/50 hover:border-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accent: 'text-emerald-300',
  },
  {
    bg: 'from-sky-900/60 via-slate-900 to-slate-950',
    border: 'border-sky-500/50 hover:border-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    accent: 'text-sky-300',
  },
  {
    bg: 'from-amber-900/60 via-slate-900 to-slate-950',
    border: 'border-amber-500/50 hover:border-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accent: 'text-amber-300',
  },
  {
    bg: 'from-purple-900/60 via-slate-900 to-slate-950',
    border: 'border-purple-500/50 hover:border-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    accent: 'text-purple-300',
  },
];

export const RetroLeagueSelectionScreen: React.FC<RetroLeagueSelectionScreenProps> = ({
  activeLicenseOverride,
  onSelectLeagueAndShowOffers,
  onClose,
}) => {
  const {
    manager,
    allLeagues,
    userClub,
    selectNextSeasonLeague,
    jobOffers,
    acceptJobOffer,
    startNextSeason,
    seasonFinished,
  } = useGame();

  const [hideLocked, setHideLocked] = useState<boolean>(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [step, setStep] = useState<'leagues' | 'clubs'>('leagues');
  const [appointedToast, setAppointedToast] = useState<string | null>(null);

  const activeLicense = normalizeCoachingLicense(activeLicenseOverride || manager.license);
  const activeLicenseInfo = CAREER_CONFIG.LICENSES[activeLicense];

  const evaluatedLeagues = useMemo(() => {
    const list = Object.values(allLeagues || {});
    return list.map(lg => evaluateLeagueEligibilityForManager(lg, activeLicense));
  }, [allLeagues, activeLicense]);

  const displayedLeagues = useMemo(() => {
    return hideLocked ? evaluatedLeagues.filter(l => l.isUnlocked) : evaluatedLeagues;
  }, [evaluatedLeagues, hideLocked]);

  const selectedLeagueObj: LeagueDefinition | undefined = useMemo(() => {
    if (!selectedLeagueId || !allLeagues) return undefined;
    return allLeagues[selectedLeagueId] || Object.values(allLeagues).find(l => l.id === selectedLeagueId);
  }, [selectedLeagueId, allLeagues]);

  const clubsInSelectedLeague = useMemo(() => {
    if (!selectedLeagueObj) return [];
    return (selectedLeagueObj.teams || []).map(club => {
      const check = isClubEligibleForManager(club, selectedLeagueObj, activeLicense);
      return {
        club,
        allowed: check.allowed,
        requiredLicense: check.requiredLicense,
        reasonArabic: check.reasonArabic,
      };
    });
  }, [selectedLeagueObj, activeLicense]);

  const handleChooseLeagueCard = (leagueId: string) => {
    setSelectedLeagueId(leagueId);
    selectNextSeasonLeague(leagueId);
    if (onSelectLeagueAndShowOffers) {
      onSelectLeagueAndShowOffers(leagueId);
    } else {
      setStep('clubs');
    }
  };

  const handlePickClubForNewSeason = (clubId: string, clubName: string) => {
    const matchingOffer = (jobOffers || []).find(o => o.clubId === clubId);
    if (matchingOffer) {
      acceptJobOffer(matchingOffer.id);
      if (seasonFinished) {
        startNextSeason(matchingOffer.id);
        if (onClose) onClose();
        return;
      }
    }
    setAppointedToast(`✅ تم اختيار نادي (${clubName}) كوجهتك القادمة في الموسم الجديد!`);
    setTimeout(() => setAppointedToast(null), 4000);
  };

  return (
    <div
      dir="rtl"
      className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4 p-4 select-none"
    >
      {/* Top Header Banner */}
      <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-400 shrink-0" />
            <span>اختر وجهتك القادمة للموسم الجديد</span>
          </h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
            >
              إغلاق ✕
            </button>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          تُعرض الدوريات المتاحة بناءً على رخصتك التدريبية الفعّالة حالياً. الدوريات الأعلى تظهر مقفلة مع توضيح الرخصة المطلوبة لفتحها.
        </p>

        {/* Active License & Personal Wallet Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-3 py-1">
            <span>{activeLicenseInfo.badgeIcon}</span>
            <span className="font-bold text-emerald-300">{activeLicenseInfo.titleArabic}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/40 rounded-xl px-3 py-1">
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 text-[11px]">رصيدك الشخصي:</span>
            <strong className="text-amber-400 font-mono">{(manager.personalWallet || 0).toLocaleString()}$</strong>
          </div>
        </div>
      </div>

      {appointedToast && (
        <div className="p-3 bg-emerald-950 border border-emerald-500 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appointedToast}</span>
        </div>
      )}

      {step === 'leagues' ? (
        <>
          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-bold text-slate-300">
              قائمة الدوريات ({evaluatedLeagues.filter(l => l.isUnlocked).length} متاح / {evaluatedLeagues.length} إجمالي)
            </span>

            <button
              type="button"
              onClick={() => setHideLocked(prev => !prev)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {hideLocked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hideLocked ? 'إظهار الدوريات المقفلة' : 'إخفاء الدوريات المقفلة'}</span>
            </button>
          </div>

          {/* Vertical List of League Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[52vh] overflow-y-auto pr-1">
            {displayedLeagues.map((item, idx) => {
              const palette = CARD_PALETTES[idx % CARD_PALETTES.length];

              if (item.isUnlocked) {
                return (
                  <div
                    key={item.leagueId}
                    onClick={() => handleChooseLeagueCard(item.leagueId)}
                    className={`p-4 rounded-2xl bg-gradient-to-br ${palette.bg} border ${palette.border} shadow-lg transition-all cursor-pointer space-y-2.5`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                          <Unlock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm leading-tight">
                            {item.leagueName}
                          </h4>
                          <div className="text-[11px] text-slate-300 mt-0.5">
                            الدولة: <strong className="text-white">{item.country}</strong> • الدرجة:{' '}
                            <strong className={palette.accent}>{item.tier}</strong>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${palette.badge}`}>
                        متاح ({item.unlockedClubsCount} نادٍ)
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-300">
                        {item.eliteClubsLocked
                          ? '⚠️ متاح (فرق النخبة تتطلب الرخصة الأسطورية)'
                          : `✅ جميع أندية الدوري (${item.totalClubsCount}) متاحة`}
                      </span>
                      <span className="font-bold text-amber-300 flex items-center gap-1 shrink-0">
                        <span>اختيار الدوري</span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </span>
                    </div>
                  </div>
                );
              }

              // LOCKED LEAGUE CARD
              return (
                <div
                  key={item.leagueId}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/50 opacity-80 cursor-not-allowed space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-300 text-sm leading-tight">
                          {item.leagueName}
                        </h4>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          الدولة: <strong className="text-slate-400">{item.country}</strong> • الدرجة:{' '}
                          <strong className="text-slate-400">{item.tier}</strong>
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-700/60 shrink-0">
                      🔒 مغلق
                    </span>
                  </div>

                  <div className="pt-2 border-t border-rose-950/80 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                      <Lock className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>يتطلب: ({item.requiredLicenseTitleArabic}) لفتح هذا الدوري</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-400 font-bold shrink-0">
                      {(CAREER_CONFIG.LICENSES[item.requiredLicense]?.purchaseCost || 0).toLocaleString()}$
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* STEP 2: CLUBS INSIDE SELECTED LEAGUE */
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div>
              <div className="text-xs font-bold text-amber-400">
                {selectedLeagueObj?.name || 'الدوري المختار'}
              </div>
              <div className="text-[11px] text-slate-400">
                اختر نادياً لتولي قيادته الفنية في الموسم الجديد
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep('leagues')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 cursor-pointer"
            >
              ← العودة للدوريات
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {clubsInSelectedLeague.map(({ club, allowed, reasonArabic }) => {
              const isCurrentUserClub = userClub?.id === club.id;
              return (
                <div
                  key={club.id}
                  onClick={() => {
                    if (allowed) {
                      handlePickClubForNewSeason(club.id, club.name);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    allowed
                      ? 'bg-slate-900 hover:bg-slate-800 border-emerald-500/40 cursor-pointer'
                      : 'bg-slate-950/70 border-rose-900/40 opacity-75 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center font-black text-xs text-white shrink-0"
                      style={{ backgroundColor: club.primaryColor || '#16a34a' }}
                    >
                      {(club.shortName || club.name).slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-bold text-white text-xs sm:text-sm truncate">{club.name}</h5>
                        {isCurrentUserClub && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold text-[9px]">
                            ناديك الحالي
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        السمعة: <strong className="text-amber-300">⭐ {club.reputation || 65}</strong> • الميزانية:{' '}
                        <strong className="text-emerald-400">{(club.budget || 0).toLocaleString()}$</strong>
                      </div>
                      {!allowed && reasonArabic && (
                        <div className="text-[10px] text-rose-400 font-bold mt-0.5 flex items-center gap-1">
                          <Lock className="w-3 h-3 shrink-0" />
                          <span>{reasonArabic}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {allowed ? (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0 cursor-pointer"
                    >
                      توقيع العقد ✍️
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950 border border-rose-700/60 text-rose-300 text-[10px] font-bold shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      <span>نخبة مقفل</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
