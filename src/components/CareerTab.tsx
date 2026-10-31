import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { COACHING_COURSES, CoachingCourse } from '../utils/managerFinancesEngine';
import { getLicenseTitleArabic, normalizeCoachingLicense } from '../utils/careerProgressionEngine';
import { getLocalTrainerProfile } from '../services/trainerProfileService';
import { ModalPortal } from './common/ModalPortal';
import { Hero, StatTile, SegTabs, Panel, Meter, Toast, useToast, fmt, fmtShort } from './common/ProUI';
import { ClubBadge } from './ClubBadge';
import {
  Award,
  Star,
  Trophy,
  RotateCcw,
  Check,
  Edit2,
  History,
  Building2,
  Globe2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  X,
  Wallet,
  Coins,
  GraduationCap,
  Heart,
  BookOpen,
  Receipt,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Share2,
  UserCircle2,
  Landmark,
  ScrollText,
  Sparkles,
  Lock,
} from 'lucide-react';
import { CoachCardModal } from './CoachCardModal';
import { ClubSelectionModal } from './ClubSelectionModal';
import { CareerProgressionJourney } from './CareerProgressionJourney';
import { RestartSeasonModal } from './RestartSeasonModal';
import { WorldDominationCard } from './WorldDominationCard';

type SubTab = 'profile' | 'licenses' | 'finance' | 'record';

const LICENSE_RANK: Record<string, number> = { BASIC: 1, PREMIER: 2, CONTINENTAL: 3, LEGENDARY: 4 };

const TX_LABEL: Record<string, string> = {
  salary: 'مرتب شهري',
  trophy_bonus: 'مكافأة بطولة',
  match_bonus: 'مكافأة مباراة',
  club_donation: 'دعم للنادي',
  license_upgrade: 'شراء/ترقية رخصة',
  license_renewal: 'تجديد سنوي للرخصة',
  course_license: 'رسوم رخصة/دورة',
  player_bonus: 'مكافأة لاعب',
};

export const CareerTab: React.FC = () => {
  const {
    manager,
    userClub,
    season,
    activeLeague,
    resetGame,
    updateManagerName,
    openSeasonModal,
    seasonFinished,
    worldRankings,
    userDynamicManagerRating,
    enrollInCoachingCourse,
    donateToClubFromPersonalWallet,
  } = useGame();

  const { toast, show } = useToast();

  const effectiveCoachName = (manager.name && manager.name !== 'الكابتن الجديد' && manager.name !== 'المدرب الجديد')
    ? manager.name
    : (getLocalTrainerProfile()?.name || manager.name || 'المدرب');

  const [subTab, setSubTab] = useState<SubTab>('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(effectiveCoachName);
  const [showRestartSeasonModal, setShowRestartSeasonModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCoachCardModal, setShowCoachCardModal] = useState(false);
  const [showClubSelectModal, setShowClubSelectModal] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState<number | string>(50000);
  const [courseFilter, setCourseFilter] = useState<'all' | 'license' | 'tactical'>('all');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  useEffect(() => {
    if (effectiveCoachName) setNewName(effectiveCoachName);
  }, [effectiveCoachName]);

  const numDonateAmount = typeof donateAmount === 'number' ? donateAmount : (parseInt(donateAmount) || 0);
  const matches = manager.matchesManaged || 0;
  const winRate = matches > 0 ? Math.round(((manager.wins || 0) / matches) * 100) : 0;
  const xpPct = manager.xpToNextLevel > 0 ? Math.min(100, ((manager.xp || 0) / manager.xpToNextLevel) * 100) : 0;
  const wallet = manager.personalWallet || 0;

  const completedCourses = Array.isArray(manager.completedCourses) ? manager.completedCourses : [];
  const transactions = Array.isArray(manager.financialTransactions) ? manager.financialTransactions : [];
  const history = Array.isArray(manager.history) ? manager.history : [];
  const trophies = Array.isArray(manager.trophies) ? manager.trophies : [];

  const filteredCourses = COACHING_COURSES.filter(c => {
    if (courseFilter === 'license') return c.category === 'license';
    if (courseFilter === 'tactical') return c.category !== 'license';
    return true;
  });

  const handleSaveName = () => {
    if (newName.trim()) {
      updateManagerName(newName.trim());
      setIsEditingName(false);
    }
  };

  const handleConfirmReset = () => {
    setShowResetModal(false);
    setShowClubSelectModal(true);
  };

  const handleClubSelectedForNewCareer = (clubId: string) => {
    resetGame(clubId);
    setShowClubSelectModal(false);
    setNewName('الكابتن الجديد');
    show('تمت إعادة ضبط اللعبة! بدأت مسيرتك الجديدة من الموسم الأول، بالتوفيق يا كابتن 🎯');
  };

  const handleExecuteDonation = () => {
    if (numDonateAmount <= 0) return;
    const res = donateToClubFromPersonalWallet(numDonateAmount);
    show(res.message, res.success);
    if (res.success) setShowDonateModal(false);
  };

  const handleEnrollCourse = (course: CoachingCourse) => {
    const res = enrollInCoachingCourse(course.id);
    show(res.message, res.success);
  };

  const tabs = [
    { id: 'profile' as const, label: 'الملف', icon: <UserCircle2 className="w-3.5 h-3.5" /> },
    { id: 'licenses' as const, label: 'الرخص والتطوير', icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: 'finance' as const, label: 'المالية', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'record' as const, label: 'السجل', icon: <ScrollText className="w-3.5 h-3.5" /> },
  ];

  const tierNumber = activeLeague?.tier ?? 1;

  return (
    <div className="space-y-3 pb-20 animate-fade-in" dir="rtl">
      <Toast toast={toast} />

      {seasonFinished && (
        <div className="bg-gradient-to-l from-amber-500/20 to-slate-900 border border-amber-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-2xl">🏆</div>
            <div className="min-w-0">
              <h4 className="font-black text-amber-200 text-sm">الموسم {season.seasonNumber} انتهى</h4>
              <p className="text-[11px] text-amber-100/70">راجع الحصيلة وابدأ الموسم الجديد.</p>
            </div>
          </div>
          <button onClick={openSeasonModal} className="px-3.5 py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-lg cursor-pointer active:scale-95 shrink-0">
            مراجعة الحصيلة
          </button>
        </div>
      )}

      {/* HERO: manager ID card */}
      <Hero accent="#a855f7">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 border-2 border-violet-400/50 flex items-center justify-center font-black text-2xl text-white shadow-xl">
            {effectiveCoachName.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newName}
                  maxLength={30}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                  className="min-w-0 flex-1 bg-slate-950 border border-violet-500 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                  autoFocus
                />
                <button onClick={handleSaveName} className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg cursor-pointer" aria-label="حفظ الاسم"><Check className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-lg text-white leading-tight truncate">{effectiveCoachName}</h2>
                <button onClick={() => setIsEditingName(true)} className="text-slate-400 hover:text-white p-1 cursor-pointer" aria-label="تعديل الاسم"><Edit2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className="text-slate-400">{manager.age} سنة • {manager.nationality}</span>
              <span className="bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-black">{getLicenseTitleArabic(manager.license)}</span>
              <span className="bg-sky-500/15 text-sky-300 border border-sky-500/40 px-2 py-0.5 rounded font-black">الموسم {season.seasonNumber}</span>
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="flex items-center gap-1 justify-end text-amber-300 font-black font-mono text-xl leading-none">
              <Star className="w-4 h-4 fill-amber-300" />
              <span>{manager.reputation}</span>
            </div>
            <span className="text-[10px] text-slate-400">السمعة</span>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-black text-white flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-300" />المستوى {manager.level}</span>
            <span className="font-mono text-slate-400">{fmt(manager.xp)} / {fmt(manager.xpToNextLevel)} XP</span>
          </div>
          <Meter value={xpPct} tone="violet" height={8} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatTile label="التصنيف العالمي" tone="amber" icon={<Globe2 className="w-3 h-3" />} value={`#${manager.worldRank || 850}`} />
          <StatTile label="نقاط التقييم" tone="sky" value={fmtShort(manager.rankingPoints ?? 1200)} />
          <StatTile label="قوة المدرب" tone="emerald" value={`${userDynamicManagerRating}`} sub="من 99" />
        </div>
      </Hero>

      <SegTabs tabs={tabs} value={subTab} onChange={setSubTab} tone="amber" />

      {/* ============ PROFILE ============ */}
      {subTab === 'profile' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowCoachCardModal(true)}
            className="w-full text-right bg-gradient-to-l from-amber-500/15 to-slate-900 border border-amber-400/40 rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 text-slate-950 flex items-center justify-center shrink-0"><Trophy className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-amber-200">كارت المدرب الرسمي</div>
              <div className="text-[11px] text-slate-400">خصص صورتك وشاركه عبر واتساب</div>
            </div>
            <Share2 className="w-4 h-4 text-amber-300 shrink-0" />
          </button>

          <Panel
            title="النادي الحالي"
            icon={<Building2 className="w-4 h-4" />}
            tone="sky"
            right={<span className="text-[10px] font-black text-slate-300 bg-slate-800 rounded px-2 py-0.5">الدرجة {tierNumber}</span>}
          >
            <div className="flex items-center gap-3">
              {userClub ? <ClubBadge club={userClub} size="lg" /> : <div className="w-14 h-14 rounded-xl bg-slate-800" />}
              <div className="min-w-0 flex-1">
                <div className="font-black text-white truncate">{userClub?.name || 'بدون نادٍ'}</div>
                <div className="text-[11px] text-slate-400 truncate">{activeLeague?.name || '—'} {activeLeague?.country ? `(${activeLeague.country})` : ''}</div>
              </div>
              {userClub && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded px-2 py-1 shrink-0 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> عقد ساري
                </span>
              )}
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-2">
            <StatTile label="المواسم" tone="sky" icon={<Calendar className="w-3 h-3" />} value={manager.totalSeasonsCompleted ?? 0} />
            <StatTile label="ألقاب الدوري" tone="amber" icon={<Trophy className="w-3 h-3" />} value={manager.leagueTitles ?? 0} />
            <StatTile label="ألقاب الكأس" tone="violet" icon={<Award className="w-3 h-3" />} value={manager.cupTitles ?? 0} />
            <StatTile label="مرات الصعود" tone="emerald" icon={<ArrowUpRight className="w-3 h-3" />} value={manager.promotions ?? 0} />
          </div>

          <WorldDominationCard manager={manager} currentLeagueId={activeLeague?.id} />

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              id="btn_restart_season_career_tab"
              onClick={() => setShowRestartSeasonModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-black text-amber-300 bg-amber-500/10 border border-amber-500/40 px-5 py-2.5 rounded-xl cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة بداية الموسم {season.seasonNumber}</span>
            </button>
            <button
              onClick={() => setShowResetModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-black text-rose-300 bg-rose-500/10 border border-rose-500/40 px-5 py-2.5 rounded-xl cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>مسيرة جديدة (مسح التقدم)</span>
            </button>
          </div>
        </div>
      )}

      {/* ============ LICENSES ============ */}
      {subTab === 'licenses' && (
        <div className="space-y-3">
          <CareerProgressionJourney />

          <Panel
            title="أكاديمية التدريب"
            icon={<GraduationCap className="w-4 h-4" />}
            tone="violet"
            right={<span className="text-[10px] font-mono text-violet-300">{completedCourses.length}/{COACHING_COURSES.length}</span>}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>محفظتك الشخصية</span>
                <span className="font-mono font-black text-amber-300">{fmt(wallet)} ج.م</span>
              </div>
              <div className="flex gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                {([['all', 'الكل'], ['license', 'الرخص'], ['tactical', 'ورش وتكتيك']] as ['all' | 'license' | 'tactical', string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setCourseFilter(id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black cursor-pointer ${courseFilter === id ? 'bg-violet-500 text-white' : 'text-slate-400'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <ul className="space-y-2.5">
                {filteredCourses.map(course => {
                  const currentLicense = normalizeCoachingLicense(manager.license);
                  const currentRank = LICENSE_RANK[currentLicense] || 1;
                  const ownedList = ['BASIC', ...(manager.ownedLicenses || []).map(l => normalizeCoachingLicense(l))];
                  const target = course.grantsLicense ? normalizeCoachingLicense(course.grantsLicense) : null;
                  const targetRank = target ? (LICENSE_RANK[target] || 0) : 0;
                  const licenseOwned = target ? (ownedList.includes(target) || currentRank >= targetRank) : false;
                  const activeLicense = target ? currentLicense === target : false;
                  const isLicense = course.category === 'license';
                  const completed = isLicense ? activeLicense : completedCourses.includes(course.id);
                  const effectiveCost = isLicense && licenseOwned ? 0 : course.cost;
                  const canAfford = wallet >= effectiveCost;
                  const req = course.requiredLicense ? normalizeCoachingLicense(course.requiredLicense) : null;
                  const reqRank = req ? (LICENSE_RANK[req] || 1) : 0;
                  const hasPrereq = isLicense || !req || currentRank >= reqRank;
                  const locked = !hasPrereq;

                  return (
                    <li
                      key={course.id}
                      className={`rounded-xl border p-3 ${
                        completed ? 'border-emerald-500/40 bg-emerald-500/5' : locked ? 'border-slate-800 bg-slate-950/40 opacity-70' : 'border-slate-800 bg-slate-950/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          completed ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : locked ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-violet-500/15 text-violet-300 border-violet-500/40'
                        }`}>
                          {completed ? <CheckCircle2 className="w-4 h-4" /> : locked ? <Lock className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs text-white leading-snug">{course.title}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                            <span className="font-mono font-black text-amber-300">{course.cost === 0 ? 'مجانية' : `${fmt(course.cost)} ج.م`}</span>
                            {course.annualRenewalFee !== undefined && course.annualRenewalFee > 0 && (
                              <span className="font-mono text-cyan-300">تجديد {fmt(course.annualRenewalFee)}/سنة</span>
                            )}
                            <span className="text-violet-300">+{course.xpReward} XP</span>
                            <span className="text-emerald-300">+{course.reputationReward} ⭐</span>
                          </div>
                        </div>
                        {completed ? (
                          <span className="text-[10px] font-black text-emerald-300 shrink-0">{isLicense ? 'نشطة ✓' : 'مكتملة ✓'}</span>
                        ) : licenseOwned ? (
                          <span className="text-[10px] font-black text-amber-300 shrink-0">مملوكة ✓</span>
                        ) : null}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed mt-2">{course.description}</p>
                      <div className="mt-2 bg-slate-900/80 border border-slate-800 rounded-lg p-2 text-[11px] text-slate-300">
                        <strong className="text-amber-300">⚡ الامتياز: </strong>{course.specialBenefit}
                      </div>

                      {!completed && (
                        <button
                          onClick={() => handleEnrollCourse(course)}
                          disabled={locked || !canAfford}
                          className={`mt-2.5 w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                            !locked && canAfford
                              ? 'bg-gradient-to-b from-violet-400 to-violet-600 text-white cursor-pointer shadow-lg shadow-violet-500/10'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <GraduationCap className="w-4 h-4" />
                          <span>
                            {locked && req
                              ? `تتطلب ${getLicenseTitleArabic(req)} أولاً`
                              : !canAfford
                              ? `ينقصك ${fmt(effectiveCost - wallet)} ج.م`
                              : licenseOwned
                              ? 'تفعيل مجاناً'
                              : `شراء بـ ${fmt(effectiveCost)} ج.م`}
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Panel>
        </div>
      )}

      {/* ============ FINANCE ============ */}
      {subTab === 'finance' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="محفظتك الخاصة" tone="amber" icon={<Coins className="w-3 h-3" />} value={fmtShort(wallet)} sub={`${fmt(wallet)} ج.م`} />
            <StatTile label="مرتبك الشهري" tone="sky" icon={<Calendar className="w-3 h-3" />} value={fmtShort(manager.monthlySalary || 35000)} sub="يُصرف مع كل جولة" />
            <StatTile label="مكافآت وبطولات" tone="emerald" icon={<Trophy className="w-3 h-3" />} value={fmtShort(manager.totalBonusesEarned || 0)} sub="إجمالي" />
            <StatTile label="دعمك للنادي" tone="rose" icon={<Heart className="w-3 h-3" />} value={fmtShort(manager.totalClubDonations || 0)} sub="إجمالي التبرعات" />
          </div>

          <button
            onClick={() => setShowDonateModal(true)}
            disabled={!userClub || wallet < 5000}
            className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              userClub && wallet >= 5000
                ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/10'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            <span>دعم خزينة النادي من محفظتك</span>
          </button>

          <Panel
            title="سجل الحركات المالية"
            icon={<Receipt className="w-4 h-4" />}
            tone="sky"
            right={
              transactions.length > 5 ? (
                <button onClick={() => setShowAllTransactions(v => !v)} className="text-[11px] font-black text-sky-300 flex items-center gap-1 cursor-pointer">
                  <span>{showAllTransactions ? 'أقل' : `الكل (${transactions.length})`}</span>
                  {showAllTransactions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              ) : undefined
            }
          >
            {transactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">لا توجد حركات بعد. ستظهر هنا رواتبك ومكافآتك بعد أول مباراة.</div>
            ) : (
              <ul className="space-y-1.5">
                {(showAllTransactions ? transactions : transactions.slice(0, 5)).map(tx => {
                  const positive = ['salary', 'trophy_bonus', 'match_bonus'].includes(tx.type);
                  return (
                    <li key={tx.id} className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${positive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                        {positive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{tx.description}</div>
                        <div className="text-[10px] text-slate-500">{tx.date} • {TX_LABEL[tx.type] || 'حركة مالية'}</div>
                      </div>
                      <span className={`font-mono font-black shrink-0 ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {positive ? '+' : '-'}{fmt(tx.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ============ RECORD ============ */}
      {subTab === 'record' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="مباريات مقادة" tone="slate" value={matches} />
            <StatTile label="نسبة الفوز" tone="emerald" value={`${winRate}%`} />
            <StatTile label="ف / ت / خ" tone="amber" value={<span className="text-base">{manager.wins || 0} / {manager.draws || 0} / {manager.losses || 0}</span>} />
            <StatTile label="الأهداف (له/عليه)" tone="sky" value={<span className="text-base">{manager.goalsScored || 0} / {manager.goalsConceded || 0}</span>} />
          </div>

          <Panel title="خزينة البطولات" icon={<Trophy className="w-4 h-4" />} tone="amber" right={<span className="text-[10px] font-mono text-amber-300">{trophies.length}</span>}>
            {trophies.length === 0 ? (
              <div className="text-center py-5 text-xs text-slate-500">🏆 الخزينة بانتظار أول تتويج لك!</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {trophies.map((t, i) => (
                  <div key={i} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2 text-xs">
                    <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="font-black text-amber-100">{t}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="المواسم السابقة" icon={<History className="w-4 h-4" />} tone="sky">
            {history.length === 0 ? (
              <div className="text-center py-5 text-xs text-slate-500">أنت في موسمك الأول! ستُسجَّل هنا نتائج كل موسم عند ختامه.</div>
            ) : (
              <ul className="space-y-2">
                {[...history].reverse().map((h, i) => (
                  <li key={i} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-amber-300">الموسم {h.seasonNumber}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                        h.outcome === 'champion' ? 'bg-amber-500/20 text-amber-300'
                        : h.outcome === 'promoted' ? 'bg-emerald-500/20 text-emerald-300'
                        : h.outcome === 'relegated' ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-slate-800 text-slate-300'
                      }`}>
                        {h.outcome === 'champion' ? 'بطل 🏆' : h.outcome === 'promoted' ? 'صعود ⬆️' : h.outcome === 'relegated' ? 'هبوط ⬇️' : 'بقاء'}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-slate-100">{h.clubName}</div>
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3">
                      <span>{h.leagueName}</span>
                      <span>المركز <b className="text-white">#{h.finalPosition}</b></span>
                      <span>النقاط <b className="text-emerald-300 font-mono">{h.points}</b></span>
                      {h.trophiesWon && h.trophiesWon.length > 0 && <span title={h.trophiesWon.join('، ')}>{h.trophiesWon.map(() => '🏆').join('')}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* 🤝 DONATE TO CLUB MODAL (دعم ومساعدة النادي من أموالك الخاصة) */}
      {showDonateModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right relative">
            <button
              onClick={() => setShowDonateModal(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">مساعدة ودعم النادي من أموالك الخاصة</h3>
                <p className="text-xs text-slate-400">ضخ أموال شخصية مباشرة في خزينة النادي</p>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>رصيدك الشخصي المتاح بالمحفظة:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{(manager.personalWallet || 0).toLocaleString()} ج.م</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>خزينة النادي الحالية ({userClub?.name}):</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{(userClub?.budget || 0).toLocaleString()} ج.م</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 block">اختر أو أدخل المبلغ المراد التبرع به:</label>
              
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[10000, 25000, 50000, 100000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDonateAmount(amt)}
                    className={`py-2 rounded-xl font-bold border transition-all ${
                      numDonateAmount === amt
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    {(amt / 1000)}k ج.م
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="5000"
                step="5000"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                onBlur={() => {
                  if (donateAmount === '' || Number(donateAmount) <= 0) setDonateAmount(10000);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-500"
                placeholder="أو أدخل مبلغاً مخصصاً بالجنيه المصري..."
              />
            </div>

            <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-800/50 text-xs space-y-1.5 text-emerald-200/90">
              <span className="font-bold text-emerald-300 block">🌟 المكاسب الإدارية الناتجة عن تبرعك:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300 mr-1">
                <li>إضافة فورية بقيمة {numDonateAmount.toLocaleString()} ج.م إلى ميزانية النادي.</li>
                <li>زيادة فورية في ثقة مجلس الإدارة بمقدار (+15%).</li>
                <li>رفع سمعتك التدريبية (+2 ⭐) وزيادة شعبية المدرب الجارفة بين جماهير النادي.</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExecuteDonation}
                disabled={(manager.personalWallet || 0) < numDonateAmount || numDonateAmount <= 0}
                className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                  (manager.personalWallet || 0) >= numDonateAmount && numDonateAmount > 0
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 active:scale-98 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <PiggyBank className="w-4 h-4" />
                <span>
                  {(manager.personalWallet || 0) >= numDonateAmount ? 'تأكيد ودفع التبرع للنادي فوراً' : 'رصيدك الشخصي غير كافٍ'}
                </span>
              </button>
              <button
                onClick={() => setShowDonateModal(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border-2 border-red-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl shadow-red-500/20 space-y-5 text-right relative">
            
            <button
              onClick={() => setShowResetModal(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">إعادة ضبط اللعبة وبدء مسيرة جديدة</h3>
                <p className="text-xs text-slate-400">تأكيد عملية الحذف وإعادة التشغيل</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-red-950/30 border border-red-900/50 text-xs text-red-200/90 leading-relaxed space-y-2">
              <p className="font-semibold text-red-300">⚠️ تنبيه هام:</p>
              <p>
                هل أنت متأكد من رغبتك في إعادة ضبط اللعبة بالكامل؟
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 mr-2">
                <li>سيتم مسح بيانات المسيرة والتقدم الحالي.</li>
                <li>ستبدأ كمدرب جديد في الموسم الأول بالدرجة الرابعة المصرية.</li>
                <li>ستتم استعادة الميزانيات والتشكيلات الافتراضية الأولية.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleConfirmReset}
                className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تأكيد وبدء مسيرة جديدة الآن</span>
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="w-full sm:w-auto py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer transition-all"
              >
                إلغاء والاحتفاظ بمسيرتي
              </button>
            </div>

          </div>
          </div>
        </ModalPortal>
      )}

      {/* Official Coach Card Modal */}
      <CoachCardModal
        isOpen={showCoachCardModal}
        onClose={() => setShowCoachCardModal(false)}
        manager={manager}
        userClub={userClub}
        worldRankings={worldRankings}
      />

      {/* Starting 4th Tier Club Selection Modal */}
      {showClubSelectModal && (
        <ClubSelectionModal
          onClubSelected={handleClubSelectedForNewCareer}
          onClose={() => setShowClubSelectModal(false)}
          initialSelectedClubId={userClub?.id}
        />
      )}

      {/* Restart Season Modal */}
      <RestartSeasonModal
        isOpen={showRestartSeasonModal}
        onClose={() => setShowRestartSeasonModal(false)}
      />

    </div>
  );
};
