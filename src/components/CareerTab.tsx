import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { COACHING_COURSES, CoachingCourse } from '../utils/managerFinancesEngine';
import { getLocalTrainerProfile } from '../services/trainerProfileService';
import {
  UserCheck,
  Award,
  Star,
  Trophy,
  TrendingUp,
  RotateCcw,
  Check,
  Edit2,
  Shield,
  Briefcase,
  Flame,
  Target,
  Sparkles,
  History,
  Building2,
  Globe2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  X,
  Wallet,
  Coins,
  GraduationCap,
  Heart,
  Activity,
  BookOpen,
  Gift,
  ArrowDownLeft,
  Receipt,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import { CoachCardModal } from './CoachCardModal';
import { ClubSelectionModal } from './ClubSelectionModal';
import { CareerProgressionJourney } from './CareerProgressionJourney';
import { RestartSeasonModal } from './RestartSeasonModal';
import { WorldDominationCard } from './WorldDominationCard';

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

  const effectiveCoachName = (manager.name && manager.name !== 'الكابتن الجديد' && manager.name !== 'المدرب الجديد')
    ? manager.name
    : (getLocalTrainerProfile()?.name || manager.name || 'المدرب');

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(effectiveCoachName);

  useEffect(() => {
    if (effectiveCoachName) {
      setNewName(effectiveCoachName);
    }
  }, [effectiveCoachName]);
  const [showRestartSeasonModal, setShowRestartSeasonModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetSuccess, setShowResetSuccess] = useState(false);
  const [showCoachCardModal, setShowCoachCardModal] = useState(false);
  const [showClubSelectModal, setShowClubSelectModal] = useState(false);

  // Financial system state
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState<number | string>(50000);
  const numDonateAmount = typeof donateAmount === 'number' ? donateAmount : (parseInt(donateAmount) || 0);
  const [financeNotification, setFinanceNotification] = useState<{ text: string; success: boolean } | null>(null);
  const [activeCourseCategory, setActiveCourseCategory] = useState<'all' | 'license' | 'tactical'>('all');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const winRate = manager.matchesManaged > 0 
    ? Math.round((manager.wins / manager.matchesManaged) * 100) 
    : 0;

  const handleSaveName = () => {
    if (newName.trim()) {
      updateManagerName(newName.trim());
      setIsEditingName(false);
    }
  };

  const handleConfirmReset = () => {
    // Open club selection screen to allow choosing starting 4th tier club
    setShowResetModal(false);
    setShowClubSelectModal(true);
  };

  const handleClubSelectedForNewCareer = (clubId: string) => {
    resetGame(clubId);
    setShowClubSelectModal(false);
    setShowResetSuccess(true);
    setNewName('الكابتن الجديد');
    setTimeout(() => {
      setShowResetSuccess(false);
    }, 4500);
  };

  const handleExecuteDonation = () => {
    if (numDonateAmount <= 0) return;
    const res = donateToClubFromPersonalWallet(numDonateAmount);
    setFinanceNotification({ text: res.message, success: res.success });
    if (res.success) {
      setTimeout(() => {
        setShowDonateModal(false);
        setFinanceNotification(null);
      }, 2500);
    }
  };

  const handleEnrollCourse = (course: CoachingCourse) => {
    const res = enrollInCoachingCourse(course.id);
    setFinanceNotification({ text: res.message, success: res.success });
    setTimeout(() => {
      setFinanceNotification(null);
    }, 3500);
  };

  const completedCoursesList = Array.isArray(manager.completedCourses) ? manager.completedCourses : [];
  const transactionsList = Array.isArray(manager.financialTransactions) ? manager.financialTransactions : [];

  const filteredCourses = COACHING_COURSES.filter(c => {
    if (activeCourseCategory === 'license') return c.category === 'license';
    if (activeCourseCategory === 'tactical') return c.category !== 'license';
    return true;
  });

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* Finance / General Notification Toast */}
      {financeNotification && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xl animate-fade-in ${
          financeNotification.success 
            ? 'bg-emerald-950 text-emerald-300 border-2 border-emerald-500/80 shadow-emerald-500/10' 
            : 'bg-red-950 text-red-300 border-2 border-red-500/80'
        }`}>
          {financeNotification.success ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-sm">{financeNotification.text}</span>
        </div>
      )}

      {/* Reset Game Success Toast / Banner */}
      {showResetSuccess && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-2 border-emerald-500/80 p-4 rounded-3xl flex items-center justify-between gap-3 shadow-2xl shadow-emerald-500/10 animate-bounce">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-300 text-sm">تمت إعادة ضبط اللعبة بنجاح!</h4>
              <p className="text-xs text-emerald-200/80">بدأت مسيرتك التدريبية الجديدة من الموسم الأول. بالتوفيق يا كابتن!</p>
            </div>
          </div>
          <button
            onClick={() => setShowResetSuccess(false)}
            className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Season Review Shortcut banner if season is finished */}
      {seasonFinished && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-600/20 to-amber-500/20 border border-amber-500/50 p-4 rounded-3xl flex items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              🏆
            </div>
            <div>
              <h4 className="font-bold text-amber-300 text-sm">الموسم {season.seasonNumber} انتهى رسمياً</h4>
              <p className="text-xs text-amber-200/80">انقر لمراجعة الحصيلة، توزيع المكافآت، وبدء الموسم الجديد.</p>
            </div>
          </div>
          <button
            onClick={openSeasonModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
          >
            مراجعة الحصيلة 🏁
          </button>
        </div>
      )}

      {/* Manager Card ID */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-purple-500 via-amber-500 to-purple-500" />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-950 text-purple-300 border-2 border-purple-600/60 flex items-center justify-center font-black text-2xl shadow-xl">
              {effectiveCoachName.slice(0, 2)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-slate-950 border border-purple-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    />
                    <button 
                      onClick={handleSaveName}
                      className="bg-emerald-600 text-white p-1 rounded-lg"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="font-black text-base text-white">{effectiveCoachName}</h2>
                    <button 
                      onClick={() => setIsEditingName(true)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">{manager.age} سنة • {manager.nationality}</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                  رخصة التدريب: CAF-{manager.license || 'D'}
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-bold">
                  الموسم الحالي: {season.seasonNumber}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1 text-amber-400 font-black text-sm">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{manager.reputation} ⭐</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">السمعة التدريبية</span>
          </div>
        </div>

        {/* Level and XP progress */}
        <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              المستوى التدريبي: {manager.level}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {manager.xp} / {manager.xpToNextLevel} XP
            </span>
          </div>
          
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (manager.xp / manager.xpToNextLevel) * 100)}%` }}
            />
          </div>
        </div>

        {/* Global World Ranking & Power Metric */}
        <div className="bg-gradient-to-r from-indigo-950/80 to-slate-950 p-3 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>التصنيف العالمي للمدربين:</span>
                <span className="text-amber-400 font-mono font-black">#{manager.worldRank || 850}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                نقاط التقييم: <strong className="text-white font-mono">{manager.rankingPoints?.toLocaleString() || '1,200'}</strong> | القوة التدريبية: <strong className="text-amber-300 font-bold">{userDynamicManagerRating}/99</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Card Button / Trigger */}
        <button
          type="button"
          onClick={() => setShowCoachCardModal(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-emerald-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 border border-amber-400/40 rounded-2xl flex items-center justify-between text-right cursor-pointer transition-all active:scale-[0.99] shadow-lg shadow-amber-500/5 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <span>كارت المدرب الرسمي (Coach Card)</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.2 rounded-full font-bold">
                  أنت المدرب
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                تخصيص صورتك، استعراض بياناتك، ومشاركة الكارت عبر واتساب
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-[-3px] transition-transform">
            <Share2 className="w-4 h-4" />
            <span>عرض ومشاركة</span>
          </div>
        </button>
      </div>

      {/* 🌍 WORLD DOMINATION PERCENTAGE & CONQUEST MAP (نسبة السيطرة على العالم) */}
      <WorldDominationCard manager={manager} currentLeagueId={activeLeague?.id} />

      {/* 🚀 COACHING LICENSES & CAREER PROGRESSION JOURNEY */}
      <CareerProgressionJourney />

      {/* 💼 MANAGER FINANCIAL WEALTH & PERSONAL LEDGER (الذمة المالية والمحفظة الشخصية للمدرب) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold shadow-md">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>الذمة المالية والمحفظة الشخصية للمدرب</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full font-normal">
                  أموالك الخاصة
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                رواتبك الشهرية من النادي، ومكافآت التتويج، واستثمارها في تطوير قدراتك أو دعم ناديك
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDonateModal(true)}
            disabled={!userClub || (manager.personalWallet || 0) < 5000}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              userClub && (manager.personalWallet || 0) >= 5000
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>مساعدة ودعم النادي 🤝</span>
          </button>
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* 1: Personal Wallet Balance */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-amber-500/30">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              رصيد محفظتك الخاصة
            </span>
            <span className="text-base font-black text-amber-400 font-mono block mt-1">
              {(manager.personalWallet || 0).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-emerald-400/90 block mt-0.5">جاهزة للاستخدام الحر</span>
          </div>

          {/* 2: Monthly Club Salary */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              مرتبك الشهري من النادي
            </span>
            <span className="text-base font-black text-white font-mono block mt-1">
              {(manager.monthlySalary || 35000).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">يُصرف دورياً مع كل جولة</span>
          </div>

          {/* 3: Total Bonuses Earned */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Trophy className="w-3 h-3 text-emerald-400" />
              مكافآت الفوز والبطولات
            </span>
            <span className="text-base font-black text-emerald-400 font-mono block mt-1">
              {(manager.totalBonusesEarned || 0).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">جوائز المباريات والألقاب</span>
          </div>

          {/* 4: Total Donations to Club */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-400" />
              مساعداتك لناديك
            </span>
            <span className="text-base font-black text-rose-300 font-mono block mt-1">
              {(manager.totalClubDonations || 0).toLocaleString()} ج.م
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">تبرعات لدعم الخزينة</span>
          </div>
        </div>
      </div>

      {/* 🎓 COACHING ACADEMY & LICENSES (أكاديمية التدريب والتطوير المهني والرخص) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>أكاديمية التدريب ورخص الاتحاد القاري والدولي</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.2 rounded-full font-mono">
                  {completedCoursesList.length} / {COACHING_COURSES.length} مكتملة
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                استثمر أموالك الخاصة في اجتياز الرخص الرسمية وورش العمل التكتيكية لرفع سمعتك وتطوير لاعبيك
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveCourseCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCourseCategory === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              الكل ({COACHING_COURSES.length})
            </button>
            <button
              onClick={() => setActiveCourseCategory('license')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCourseCategory === 'license' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              الرخص الرسمية
            </button>
            <button
              onClick={() => setActiveCourseCategory('tactical')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeCourseCategory === 'tactical' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              تكتيك ومعايشات
            </button>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredCourses.map(course => {
            const licenseRankMap: Record<string, number> = {
              'D': 1,
              'C': 2,
              'B': 3,
              'A': 4,
              'PRO': 5,
              'ELITE': 6,
            };
            const currentLicense = (manager.license && licenseRankMap[manager.license]) ? manager.license : 'D';
            const currentRank = licenseRankMap[currentLicense] || 1;

            const courseGrantsRank = course.grantsLicense ? (licenseRankMap[course.grantsLicense] || 0) : 0;
            const isCompleted = completedCoursesList.includes(course.id) || 
              (course.category === 'license' && courseGrantsRank > 0 && (course.id === 'license_d' ? (completedCoursesList.includes('license_d') || currentRank > 1) : currentRank >= courseGrantsRank));

            const canAfford = (manager.personalWallet || 0) >= course.cost;
            const requiredRank = course.requiredLicense ? (licenseRankMap[course.requiredLicense] || 1) : 0;
            const hasPrerequisite = !course.requiredLicense || (currentRank >= requiredRank);

            return (
              <div
                key={course.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : hasPrerequisite
                    ? 'bg-slate-950/70 border-slate-800 hover:border-purple-500/50'
                    : 'bg-slate-950/30 border-slate-900 opacity-60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">{course.title}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                          <span className="text-amber-400 font-mono font-bold">{course.cost.toLocaleString()} ج.م</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-purple-300">+{course.xpReward} XP</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-emerald-400">+{course.reputationReward} ⭐ سمعة</span>
                        </div>
                      </div>
                    </div>

                    {isCompleted ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                        مكتملة ومُعتمدة ✓
                      </span>
                    ) : !hasPrerequisite ? (
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                        تتطلب رخصة {course.requiredLicense}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300">
                    <strong className="text-amber-300 font-bold block mb-0.5">⚡ الامتياز الفني:</strong>
                    <span>{course.specialBenefit}</span>
                  </div>
                </div>

                {!isCompleted && (
                  <button
                    onClick={() => handleEnrollCourse(course)}
                    disabled={!hasPrerequisite || !canAfford}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md ${
                      hasPrerequisite && canAfford
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-98 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>
                      {!hasPrerequisite
                        ? `تتطلب أولاً الحصول على رخصة ${course.requiredLicense}`
                        : !canAfford
                        ? `الرصيد المتاح غير كافٍ (ناقص ${(course.cost - (manager.personalWallet || 0)).toLocaleString()} ج.م)`
                        : `التسجيل وسداد ${course.cost.toLocaleString()} ج.م من محفظتك`}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 📜 FINANCIAL TRANSACTION LEDGER (سجل المعاملات والتحويلات المالية للمدرب) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">سجل الحركات المالية للمدرب</h3>
              <p className="text-[11px] text-slate-400">كشف حساب الرواتب، المكافآت، رسوم الرخص، والتبرعات للنادي</p>
            </div>
          </div>

          {transactionsList.length > 5 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>{showAllTransactions ? 'عرض أقل' : `عرض الكل (${transactionsList.length})`}</span>
              {showAllTransactions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {transactionsList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
            لا توجد حركات مالية مسجلة حتى الآن. ستظهر هنا رواتبك الدورية ومكافآتك بعد أول جولة ومباراة!
          </div>
        ) : (
          <div className="space-y-2">
            {(showAllTransactions ? transactionsList : transactionsList.slice(0, 5)).map((tx) => {
              const isPositive = ['salary', 'trophy_bonus', 'match_bonus'].includes(tx.type);

              return (
                <div
                  key={tx.id}
                  className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800/80 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isPositive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{tx.description}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="text-slate-300">
                          {tx.type === 'salary' ? 'مرتب شهري' : tx.type === 'trophy_bonus' ? 'مكافأة بطولة' : tx.type === 'match_bonus' ? 'مكافأة مباراة' : tx.type === 'club_donation' ? 'مساهمة للنادي' : tx.type === 'course_license' ? 'رسوم رخصة/دورة' : 'مكافأة لاعب'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className={`font-mono font-black text-sm block ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? '+' : '-'}{tx.amount.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Career Milestones Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> عدد المواسم
          </div>
          <div className="text-lg font-black text-white">{manager.totalSeasonsCompleted} مكتمل</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> ألقاب الدوري
          </div>
          <div className="text-lg font-black text-amber-400">{manager.leagueTitles} بطولات</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <Award className="w-3.5 h-3.5 text-purple-400" /> ألقاب الكأس
          </div>
          <div className="text-lg font-black text-purple-400">{manager.cupTitles} كؤوس</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-center">
          <div className="text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> مرات الصعود
          </div>
          <div className="text-lg font-black text-emerald-400">{manager.promotions} مرات</div>
        </div>
      </div>

      {/* Current Club & Contract Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>النادي الحالي والمسابقة</span>
          </h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl border border-slate-700">
            الدرجة {activeLeague?.divisionTier || 1}
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md border border-white/10"
              style={{ backgroundColor: userClub?.primaryColor || '#059669' }}
            >
              {(userClub?.name || 'نادي').slice(0, 2)}
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">{userClub?.name || 'فريقك الحالي'}</div>
              <div className="text-xs text-slate-400">{activeLeague?.name || 'الدوري الممتاز'} ({activeLeague?.country || 'مصر'})</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> عقد سارٍ
            </span>
          </div>
        </div>
      </div>

      {/* Career Record Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>السجل التدريبي الشامل</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">المباريات المقادة</span>
            <span className="text-lg font-black text-white font-mono">{manager.matchesManaged}</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">نسبة الفوز</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{winRate}%</span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">فوز / تعادل / خسارة</span>
            <span className="text-xs font-black text-amber-400 font-mono mt-1 block">
              {manager.wins}ف / {manager.draws}ت / {manager.losses}خ
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">الأهداف (له / عليه)</span>
            <span className="text-xs font-black text-blue-400 font-mono mt-1 block">
              {manager.goalsScored} / {manager.goalsConceded}
            </span>
          </div>
        </div>
      </div>

      {/* Season-by-Season Career History Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <History className="w-4 h-4 text-blue-400" />
          <span>سجل المواسم السابقة في المسيرة</span>
        </h3>

        {(!manager.history || manager.history.length === 0) ? (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
            أنت حالياً في موسمك الأول! سيتم تسجيل إحصائيات وإنجازات كل موسم تلقائياً في هذا السجل التاريخي عند ختامه.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <tr>
                  <th className="py-2 px-2">الموسم</th>
                  <th className="py-2 px-2">النادي</th>
                  <th className="py-2 px-2">الدوري</th>
                  <th className="py-2 px-2">الترتيب</th>
                  <th className="py-2 px-2">النقاط</th>
                  <th className="py-2 px-2">النتيجة</th>
                  <th className="py-2 px-2">الكؤوس</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(manager.history || []).map((hist, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-amber-400">م {hist.seasonNumber}</td>
                    <td className="py-2.5 px-2 font-semibold text-slate-200">{hist.clubName}</td>
                    <td className="py-2.5 px-2 text-slate-400">{hist.leagueName}</td>
                    <td className="py-2.5 px-2 font-bold text-slate-200">#{hist.finalPosition}</td>
                    <td className="py-2.5 px-2 font-mono text-emerald-400">{hist.points}</td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        hist.outcome === 'champion'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : hist.outcome === 'promoted'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : hist.outcome === 'relegated'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {hist.outcome === 'champion' ? 'بطل 🏆' : hist.outcome === 'promoted' ? 'صعود ⬆️' : hist.outcome === 'relegated' ? 'هبوط ⬇️' : 'بقاء'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-400">
                      {hist.trophiesWon && hist.trophiesWon.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {hist.trophiesWon.map((tr, tIdx) => (
                            <span key={tIdx} className="text-amber-400" title={tr}>🏆</span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trophy Cabinet */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>خزينة البطولات والإنجازات</span>
        </h3>

        {(!manager.trophies || manager.trophies.length === 0) ? (
          <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/80">
            🏆 الخزينة في انتظار أول تتويج لك! نافس على الصدارة والكأس لحصد الألقاب وإضافتها لمجدك التدريبي.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(manager.trophies || []).map((trophy, idx) => (
              <div key={idx} className="bg-amber-950/40 border border-amber-700/60 p-3 rounded-2xl flex items-center gap-2 text-xs">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-bold text-amber-200">{trophy}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset & Season Operations */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          id="btn_restart_season_career_tab"
          onClick={() => setShowRestartSeasonModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/80 px-5 py-2.5 rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 font-bold"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span>إعادة بداية الموسم {season.seasonNumber}</span>
        </button>

        <button
          onClick={() => setShowResetModal(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-900/80 px-5 py-2.5 rounded-2xl transition-all cursor-pointer shadow-lg active:scale-95 font-bold"
        >
          <RotateCcw className="w-4 h-4 text-red-400" />
          <span>إعادة ضبط اللعبة (مسيرة جديدة)</span>
        </button>
      </div>

      {/* 🤝 DONATE TO CLUB MODAL (دعم ومساعدة النادي من أموالك الخاصة) */}
      {showDonateModal && (
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
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
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


