import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldBan, 
  CheckCircle2, 
  Trophy, 
  DollarSign, 
  Layers,
  AlertTriangle,
  FileText,
  Coins,
  TrendingUp,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Building,
  Users,
  History,
  CreditCard,
  PlusCircle,
  Gem,
  CheckCircle
} from 'lucide-react';
import { UserProfile } from '../../types/auth';
import { moderateUserAccount, grantCoinsToUser, fetchUserCoinLedger } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { SeasonHistoryEntry, TransferHistoryEntry } from '../../types/game';

interface UserInspectorModalProps {
  user: UserProfile;
  onClose: () => void;
  onUserUpdated: () => void;
}

type InspectorTab = 'overview' | 'career' | 'season' | 'transfers' | 'economy' | 'coins';

export const UserInspectorModal: React.FC<UserInspectorModalProps> = ({
  user,
  onClose,
  onUserUpdated
}) => {
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<InspectorTab>('overview');
  
  // Moderation state
  const [isModerating, setIsModerating] = useState(false);
  const [actionTarget, setActionTarget] = useState<'active' | 'suspended' | 'banned' | null>(null);
  const [reason, setReason] = useState('');
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Coins Grant state
  const [coinAmount, setCoinAmount] = useState<number>(500);
  const [coinCustomAmount, setCoinCustomAmount] = useState<string>('');
  const [coinReasonCategory, setCoinReasonCategory] = useState<string>('تعويض عن عطل فني');
  const [coinCustomReason, setCoinCustomReason] = useState<string>('');
  const [isGrantingCoins, setIsGrantingCoins] = useState(false);
  const [grantSuccessMsg, setGrantSuccessMsg] = useState<string | null>(null);
  const [grantErrorMsg, setGrantErrorMsg] = useState<string | null>(null);
  
  // Ledger state
  const [coinLedger, setCoinLedger] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Current virtual balance
  const currentCoins = typeof user.virtualCoins === 'number' ? user.virtualCoins : 1000;
  const currentGems = typeof user.virtualGems === 'number' ? user.virtualGems : 0;

  // Load coin ledger when coins tab is selected
  useEffect(() => {
    if (activeTab === 'coins') {
      loadLedger();
    }
  }, [activeTab, user.uid]);

  const loadLedger = async () => {
    try {
      setLoadingLedger(true);
      const data = await fetchUserCoinLedger(user.uid);
      setCoinLedger(data);
    } catch (err) {
      console.warn('Error loading coin ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleModerationSubmit = async () => {
    if (!actionTarget || !currentAdmin) return;

    if (!reason.trim()) {
      setModerationError('يرجى كتابة سبب الإجراء الإداري لسجل التدقيق.');
      return;
    }

    try {
      setIsModerating(true);
      setModerationError(null);

      await moderateUserAccount(
        user.uid,
        user.email || 'No Email',
        actionTarget,
        reason,
        currentAdmin
      );

      setActionTarget(null);
      setReason('');
      onUserUpdated();
    } catch (err: any) {
      console.error('Moderation error:', err);
      setModerationError(err.message || 'فشل في تطبيق الإجراء الإداري.');
    } finally {
      setIsModerating(false);
    }
  };

  const handleGrantCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;

    const finalAmount = coinCustomAmount ? parseInt(coinCustomAmount) : coinAmount;
    if (!finalAmount || finalAmount <= 0 || isNaN(finalAmount)) {
      setGrantErrorMsg('يرجى إدخال مبلغ كوينز صحيح أكبر من الصفر.');
      return;
    }

    const finalReason = coinCustomReason.trim() 
      ? `${coinReasonCategory}: ${coinCustomReason.trim()}`
      : coinReasonCategory;

    try {
      setIsGrantingCoins(true);
      setGrantErrorMsg(null);
      setGrantSuccessMsg(null);

      const result = await grantCoinsToUser(
        user.uid,
        user.email || 'No Email',
        finalAmount,
        finalReason,
        currentAdmin
      );

      setGrantSuccessMsg(`تم بنجاح إضافة ${finalAmount.toLocaleString()} كوينز! (الرصيد الجديد: ${result.balanceAfter.toLocaleString()})`);
      setCoinCustomAmount('');
      setCoinCustomReason('');
      loadLedger();
      onUserUpdated();
      setTimeout(() => setGrantSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error granting coins:', err);
      setGrantErrorMsg(err.message || 'حدث خطأ أثناء شحن الكوينز.');
    } finally {
      setIsGrantingCoins(false);
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'غير متوفر';
    return new Date(timestamp).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ----------------------------------------------------
  // RECONCILIATION & DATA AGGREGATION
  // ----------------------------------------------------
  const managerProfile = user.managerProfile;
  const currentClub = user.currentClub;
  const currentSeason = user.currentSeasonStats;
  const seasonHistory = user.seasonHistory || managerProfile?.history || [];
  const transferHistory = user.transferHistory || [];
  const clubEconomy = user.clubEconomy;
  const pvpStats = user.pvpStats;

  // Career matches calculation
  let totalMatches = 0;
  let totalWins = 0;
  let totalDraws = 0;
  let totalLosses = 0;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;
  let hasRealStats = false;

  if (managerProfile && managerProfile.matchesManaged > 0) {
    totalMatches = managerProfile.matchesManaged;
    totalWins = managerProfile.wins;
    totalDraws = managerProfile.draws;
    totalLosses = managerProfile.losses;
    totalGoalsScored = managerProfile.goalsScored;
    totalGoalsConceded = managerProfile.goalsConceded;
    hasRealStats = true;
  } else if (seasonHistory.length > 0) {
    totalMatches = seasonHistory.reduce((sum, s) => sum + (s.matchesPlayed || 0), 0);
    totalWins = seasonHistory.reduce((sum, s) => sum + (s.wins || 0), 0);
    totalDraws = seasonHistory.reduce((sum, s) => sum + (s.draws || 0), 0);
    totalLosses = seasonHistory.reduce((sum, s) => sum + (s.losses || 0), 0);
    totalGoalsScored = seasonHistory.reduce((sum, s) => sum + (s.goalsFor || 0), 0);
    totalGoalsConceded = seasonHistory.reduce((sum, s) => sum + (s.goalsAgainst || 0), 0);
    hasRealStats = totalMatches > 0;
  } else if (currentSeason && currentSeason.matchesPlayed > 0) {
    totalMatches = currentSeason.matchesPlayed;
    totalWins = currentSeason.wins;
    totalDraws = currentSeason.draws;
    totalLosses = currentSeason.losses;
    totalGoalsScored = currentSeason.goalsFor;
    totalGoalsConceded = currentSeason.goalsAgainst;
    hasRealStats = true;
  }

  const winRate = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : null;
  const goalDifference = totalGoalsScored - totalGoalsConceded;
  const trophiesCount = managerProfile?.trophies?.length || seasonHistory.reduce((sum, s) => sum + (s.trophiesWon?.length || 0), 0);
  const promotionsCount = managerProfile?.promotions || seasonHistory.filter(s => s.status === 'champion' || s.status === 'promoted').length;
  const relegationsCount = managerProfile?.relegations || seasonHistory.filter(s => s.status === 'relegated').length;

  // Best season
  let bestSeason: SeasonHistoryEntry | null = null;
  if (seasonHistory.length > 0) {
    bestSeason = [...seasonHistory].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  }

  // Transfer totals
  const totalTransferSpent = transferHistory
    .filter(t => t.type === 'buy')
    .reduce((sum, t) => sum + t.fee, 0);
  const totalTransferIncome = transferHistory
    .filter(t => t.type === 'sell')
    .reduce((sum, t) => sum + t.fee, 0);
  const netTransferBalance = totalTransferIncome - totalTransferSpent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn text-right">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title & Manager Quick Info */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-950/50">
            {user.displayName ? user.displayName.charAt(0) : <User className="w-7 h-7" />}
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-100">
                {managerProfile?.name || user.displayName || 'مدرب الفريق'}
              </h2>
              
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                user.status === 'active' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                  : user.status === 'suspended'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}>
                {user.status === 'active' ? 'نشط ومصرح' : user.status === 'suspended' ? 'موقوف مؤقتاً' : 'محظور (Banned)'}
              </span>

              {user.isPremium && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  مشترك VIP ⭐
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap font-mono">
              <span dir="ltr">{user.email || 'بدون بريد إلكتروني'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400 font-bold">🪙 {currentCoins.toLocaleString()} كوينز</span>
              <span className="text-slate-600">•</span>
              <span className="text-blue-400">🏆 Elo: {user.eloRating || 1200}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-5 border-b border-slate-800 scrollbar-none text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>نظرة عامة والحساب</span>
          </button>

          <button
            onClick={() => setActiveTab('career')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'career'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>إحصائيات وسجل المدرب</span>
          </button>

          <button
            onClick={() => setActiveTab('season')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'season'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الموسم الحالي</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'transfers'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل الانتقالات ({transferHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('economy')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'economy'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>اقتصاد النادي</span>
          </button>

          <button
            onClick={() => setActiveTab('coins')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'coins'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50 font-bold'
                : 'bg-slate-800/80 hover:bg-slate-800 text-amber-300'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>إضافة الكوينز والسجل الإداري</span>
          </button>
        </div>

        {/* Action Moderation Prompt (If active) */}
        {actionTarget && (
          <div className="mb-6 p-4 bg-slate-950 border border-amber-500/40 rounded-2xl animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-bold mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>تأكيد الإجراء الإداري: {
                actionTarget === 'suspended' ? 'إيقاف الحساب مؤقتاً' :
                actionTarget === 'banned' ? 'حظر الحساب نهائياً' : 'إعادة تفعيل الحساب'
              }</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              سيتم تسجيل هذا الإجراء في سجل التدقيق غير القابل للتعديل (Immutable Audit Log) مرفقاً ببياناتك الإدارية.
            </p>

            {moderationError && (
              <div className="mb-3 p-2 bg-rose-950/60 border border-rose-800 text-xs text-rose-300 rounded-lg">
                {moderationError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">سبب الإجراء الإداري (مطلوب لسجل التدقيق):</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: مخالفة شروط الاستخدام أو بلاغ عن اسم غير لائق"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  onClick={() => {
                    setActionTarget(null);
                    setModerationError(null);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleModerationSubmit}
                  disabled={isModerating}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg text-white transition-all cursor-pointer ${
                    actionTarget === 'banned' ? 'bg-rose-600 hover:bg-rose-500' :
                    actionTarget === 'suspended' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isModerating ? 'جاري التنفيذ والتسجيل...' : 'تأكيد وحفظ في السجل'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-fadeIn text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Account Card */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs pb-1.5 border-b border-slate-800">
                  <User className="w-3.5 h-3.5" />
                  <span>بيانات الحساب والنظام (Account)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">معرف المستخدم (UID):</span>
                  <span className="text-slate-200 font-mono text-[11px] max-w-[170px] truncate" title={user.uid}>{user.uid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">البريد الإلكتروني:</span>
                  <span className="text-slate-200 font-mono" dir="ltr">{user.email || 'غير مسجل'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الدور / الصلاحية:</span>
                  <span className="text-slate-200 font-semibold">{user.role === 'admin' ? 'مسؤول نظام (Admin)' : 'مدرب ولاعب (Player)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">تاريخ إنشاء الحساب:</span>
                  <span className="text-slate-300">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">آخر تسجيل دخول:</span>
                  <span className="text-slate-300">{formatDate(user.lastLoginAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">مزامنة السحابة:</span>
                  <span className="text-emerald-400 font-medium">
                    {user.hasCloudSave ? `متزامن (${formatDate(user.lastCloudSaveAt)})` : 'حفظ سحابي مسجل'}
                  </span>
                </div>
              </div>

              {/* Manager Status Card */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs pb-1.5 border-b border-slate-800">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>المسار المهني للمدرب (Manager Profile)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">اسم المدرب:</span>
                  <span className="text-slate-200 font-bold">{managerProfile?.name || user.displayName || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">مستوى المدرب:</span>
                  <span className="text-amber-400 font-bold">المستوى {managerProfile?.level || 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الخبرة (XP):</span>
                  <span className="text-slate-200 font-mono">{managerProfile?.xp || 0} / {managerProfile?.xpToNextLevel || 100} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رخصة التدريب:</span>
                  <span className="text-emerald-400 font-bold">رخصة {managerProfile?.license || 'D'} من الاتحاد الإفريقي (CAF)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">السمعة التدريبية:</span>
                  <span className="text-slate-200 font-mono">{managerProfile?.reputation || 25} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الألقاب والبطولات:</span>
                  <span className="text-amber-400 font-bold">{trophiesCount} بطولة</span>
                </div>
              </div>

            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-slate-400 text-[11px] block mb-0.5">مباريات المسيرة</span>
                <span className="text-lg font-bold text-slate-100 font-mono">
                  {hasRealStats ? totalMatches : '0 (مسيرة جديدة)'}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-slate-400 text-[11px] block mb-0.5">نسبة الفوز</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {winRate ? `${winRate}%` : 'غير متوفر'}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-slate-400 text-[11px] block mb-0.5">الكوينز الافتراضية</span>
                <span className="text-lg font-bold text-amber-400 font-mono">
                  {currentCoins.toLocaleString()}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <span className="text-slate-400 text-[11px] block mb-0.5">ميزانية النادي</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {currentClub?.budget ? `${currentClub.budget.toLocaleString()} ج.م` : '250,000 ج.م'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAREER STATISTICS & HISTORY */}
        {activeTab === 'career' && (
          <div className="space-y-5 animate-fadeIn text-xs">
            
            {/* Career Record Summary Grid */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Award className="w-4 h-4" />
                  <span>السجل التاريخي الشامل للمدرب (Career Record)</span>
                </div>
                {!hasRealStats && (
                  <span className="text-[11px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full">
                    المسيرة في بدايتها (0 مباريات مسجلة)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-slate-400 text-[10px] block mb-1">المباريات</span>
                  <span className="text-base font-bold text-slate-100 font-mono">{totalMatches}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-emerald-400 text-[10px] block mb-1">فوز</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{totalWins}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-amber-400 text-[10px] block mb-1">تعادل</span>
                  <span className="text-base font-bold text-amber-400 font-mono">{totalDraws}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-rose-400 text-[10px] block mb-1">خسارة</span>
                  <span className="text-base font-bold text-rose-400 font-mono">{totalLosses}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-slate-400 text-[10px] block mb-1">نسبة الفوز</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{winRate ? `${winRate}%` : '—'}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                  <span className="text-slate-400 text-[10px] block mb-1">فارق الأهداف</span>
                  <span className={`text-base font-bold font-mono ${goalDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {goalDifference > 0 ? `+${goalDifference}` : goalDifference}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-slate-300">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">الأهداف المسجلة:</span>
                  <span className="font-bold text-emerald-400 font-mono">{totalGoalsScored} هدف</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">الأهداف المستقبلة:</span>
                  <span className="font-bold text-rose-400 font-mono">{totalGoalsConceded} هدف</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">معدل التسجيل:</span>
                  <span className="font-bold text-slate-100 font-mono">
                    {totalMatches > 0 ? (totalGoalsScored / totalMatches).toFixed(2) : '—'} / مباراة
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">مرات الصعود:</span>
                  <span className="font-bold text-emerald-400 font-mono">{promotionsCount}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">مرات الهبوط:</span>
                  <span className="font-bold text-rose-400 font-mono">{relegationsCount}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">الألقاب والبطولات:</span>
                  <span className="font-bold text-amber-400 font-mono">{trophiesCount}</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex justify-between">
                  <span className="text-slate-400">أعلى دوري تم الوصول إليه:</span>
                  <span className="font-bold text-blue-400">
                    {currentClub?.division ? `الدرجة ${currentClub.division}` : 'الدرجة 4'}
                  </span>
                </div>
              </div>
            </div>

            {/* Past Seasons History Table */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <History className="w-4 h-4" />
                  <span>سجل المواسم السابقة للمدرب (Season History)</span>
                </div>
                <span className="text-[11px] text-slate-400">{seasonHistory.length} موسم مسجل</span>
              </div>

              {seasonHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-right">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-2">
                        <th className="pb-2 font-semibold">الموسم</th>
                        <th className="pb-2 font-semibold">النادي</th>
                        <th className="pb-2 font-semibold">الدوري والدرجة</th>
                        <th className="pb-2 font-semibold text-center">المركز</th>
                        <th className="pb-2 font-semibold text-center">لعب</th>
                        <th className="pb-2 font-semibold text-center">ف/ت/خ</th>
                        <th className="pb-2 font-semibold text-center">النقاط</th>
                        <th className="pb-2 font-semibold text-center">النتيجة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {seasonHistory.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 font-mono text-slate-300">موسم {s.seasonNumber || idx + 1}</td>
                          <td className="py-2.5 font-bold text-slate-200">{s.clubName || 'النادي'}</td>
                          <td className="py-2.5 text-slate-400">{s.leagueName || 'الدوري'} (د{s.divisionTier || 4})</td>
                          <td className="py-2.5 font-bold font-mono text-center text-amber-400">#{s.finalPosition || '—'}</td>
                          <td className="py-2.5 font-mono text-center text-slate-300">{s.matchesPlayed || 0}</td>
                          <td className="py-2.5 font-mono text-center text-slate-400">{s.wins || 0}/{s.draws || 0}/{s.losses || 0}</td>
                          <td className="py-2.5 font-mono text-center font-bold text-emerald-400">{s.points || 0}</td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === 'champion' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                              s.status === 'promoted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              s.status === 'relegated' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {s.status === 'champion' ? '🏆 بطل' : s.status === 'promoted' ? '🎉 صعود' : s.status === 'relegated' ? '🔴 هبوط' : 'ثبات'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl">
                  لا توجد مواسم مكتملة سابقة مسجلة. المدرب يخوض موسمه الافتتاحي حالياً.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: CURRENT SEASON */}
        {activeTab === 'season' && (
          <div className="space-y-4 animate-fadeIn text-xs">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Building className="w-4 h-4" />
                  <span>تفاصيل الموسم الحالي والمنافسة الجارية (Current Season)</span>
                </div>
                <span className="text-[11px] bg-blue-950 text-blue-400 border border-blue-800 px-3 py-0.5 rounded-full font-bold">
                  الموسم {currentSeason?.seasonNumber || 1}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Club & League info */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">النادي المُدار حالياً:</span>
                    <span className="text-slate-200 font-bold">{currentClub?.name || 'نادي المستقبل'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المسابقة / الدوري:</span>
                    <span className="text-slate-200">{currentSeason?.leagueName || currentClub?.leagueName || 'دوري الدرجة الرابعة المصري'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">درجة الدوري:</span>
                    <span className="text-slate-200">الدرجة {currentSeason?.divisionTier || currentClub?.division || 4}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المركز الحالي بجدول الترتيب:</span>
                    <span className="text-amber-400 font-bold font-mono">
                      #{currentSeason?.currentPosition ? currentSeason.currentPosition : '1'}
                    </span>
                  </div>
                </div>

                {/* Season Performance Metrics */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">المباريات الملعوبة:</span>
                    <span className="text-slate-200 font-mono font-bold">{currentSeason?.matchesPlayed ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">سجل المباريات (فوز/تعادل/خسارة):</span>
                    <span className="text-slate-200 font-mono">
                      {currentSeason?.wins ?? 0} ف - {currentSeason?.draws ?? 0} ت - {currentSeason?.losses ?? 0} خ
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">إجمالي النقاط:</span>
                    <span className="text-emerald-400 font-bold font-mono">{currentSeason?.points ?? 0} نقطة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">متوسط النقاط للمباراة (PPG):</span>
                    <span className="text-slate-200 font-mono">{currentSeason?.pointsPerGame ?? '0.00'}</span>
                  </div>
                </div>

              </div>

              {/* Goals breakdown */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <span className="text-slate-400 text-[10px] block mb-1">أهداف له (GF)</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">{currentSeason?.goalsFor ?? 0}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <span className="text-slate-400 text-[10px] block mb-1">أهداف عليه (GA)</span>
                  <span className="text-base font-bold text-rose-400 font-mono">{currentSeason?.goalsAgainst ?? 0}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <span className="text-slate-400 text-[10px] block mb-1">فارق الأهداف (GD)</span>
                  <span className="text-base font-bold text-slate-100 font-mono">
                    {currentSeason?.goalDifference ?? 0}
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: TRANSFERS HISTORY */}
        {activeTab === 'transfers' && (
          <div className="space-y-4 animate-fadeIn text-xs">
            
            {/* Transfer Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-rose-900/40 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-rose-400 mb-1">
                  <span className="text-[11px] font-semibold">إجمالي الإنفاق على الشراء</span>
                  <ArrowDownRight className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-rose-400 font-mono">
                  {totalTransferSpent.toLocaleString()} ج.م
                </span>
              </div>

              <div className="bg-slate-950 border border-emerald-900/40 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <span className="text-[11px] font-semibold">إجمالي عوائد البيع</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {totalTransferIncome.toLocaleString()} ج.م
                </span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center justify-between text-slate-300 mb-1">
                  <span className="text-[11px] font-semibold">صافي ميزان الانتقالات</span>
                  <DollarSign className="w-4 h-4" />
                </div>
                <span className={`text-base font-bold font-mono ${netTransferBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {netTransferBalance >= 0 ? `+${netTransferBalance.toLocaleString()}` : netTransferBalance.toLocaleString()} ج.م
                </span>
              </div>
            </div>

            {/* Transfers Table */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <History className="w-4 h-4" />
                  <span>سجل الصفقات والانتقالات المكتملة (Transfers Log)</span>
                </div>
                <span className="text-[11px] text-slate-400">{transferHistory.length} صفقات</span>
              </div>

              {transferHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-right">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-2">
                        <th className="pb-2 font-semibold">اللاعب</th>
                        <th className="pb-2 font-semibold">المركز</th>
                        <th className="pb-2 font-semibold text-center">التقييم</th>
                        <th className="pb-2 font-semibold text-center">نوع الصفقة</th>
                        <th className="pb-2 font-semibold text-center">قيمة الانتقال</th>
                        <th className="pb-2 font-semibold text-center">الراتب</th>
                        <th className="pb-2 font-semibold text-left">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {transferHistory.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 font-bold text-slate-200">{t.playerName}</td>
                          <td className="py-2.5 text-slate-400">{t.position}</td>
                          <td className="py-2.5 font-mono text-center text-amber-400 font-bold">{t.playerRating}</td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.type === 'buy' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {t.type === 'buy' ? '📥 شراء' : '📤 بيع'}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-center font-bold text-slate-100">{t.fee.toLocaleString()} ج.م</td>
                          <td className="py-2.5 font-mono text-center text-slate-400">{t.salary ? `${t.salary.toLocaleString()} ج.م` : '—'}</td>
                          <td className="py-2.5 font-mono text-left text-slate-500">{t.date || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl">
                  لم يتم إجراء صفقات انتقال مسجلة حتى الآن خلال هذا الموسم.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 5: CLUB ECONOMY & ASSETS */}
        {activeTab === 'economy' && (
          <div className="space-y-4 animate-fadeIn text-xs">
            
            {/* Real Separation: Club Budget vs Coins */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Club Finances Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs pb-2 border-b border-slate-800">
                  <Building className="w-3.5 h-3.5" />
                  <span>المالية التشغيلية للنادي (Club Budget)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">السيولة النقدية في الخزينة:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    {(currentClub?.budget || 250000).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ميزانية الرواتب الشهرية:</span>
                  <span className="text-slate-200 font-mono">
                    {(currentClub?.wageBudgetMonthly || 50000).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">القيمة السوقية للقائمة:</span>
                  <span className="text-slate-200 font-mono font-bold">
                    {(currentClub?.squadMarketValue || 1850000).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">عدد لاعبي الفريق:</span>
                  <span className="text-slate-200 font-mono">{currentClub?.squadSize || 20} لاعباً</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">سعة الاستاد:</span>
                  <span className="text-slate-200 font-mono">{(currentClub?.stadiumCapacity || 5000).toLocaleString()} متفرج</span>
                </div>
              </div>

              {/* Virtual Currencies Card */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs pb-2 border-b border-slate-800">
                  <Coins className="w-3.5 h-3.5" />
                  <span>العملات الافتراضية وحساب المدرب (Virtual Coins)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رصيد الكوينز الافتراضية (Coins):</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">{currentCoins.toLocaleString()} كوينز</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رصيد الماس (Gems):</span>
                  <span className="text-blue-400 font-mono font-bold">{currentGems.toLocaleString()} 💎</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">تصنيف الأونلاين (Elo Rating):</span>
                  <span className="text-slate-100 font-mono font-bold">{user.eloRating || 1200}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">إجمالي جوائز التحديات المكتسبة:</span>
                  <span className="text-amber-300 font-mono">{pvpStats?.coinsWonTotal?.toLocaleString() || 0} كوينز</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">باقة الحساب:</span>
                  <span className="text-slate-300 font-medium">{user.isPremium ? 'باقة VIP الاحترافية' : 'الحساب القياسي (Standard)'}</span>
                </div>
              </div>

            </div>

            {/* Club Season Economy Ledger Breakdown */}
            {clubEconomy && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span>سجل الإيرادات والمصروفات التراكمي للموسم</span>
                  </div>
                  <span className={`font-mono font-bold ${clubEconomy.currentSeasonNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    صافي الأرباح: {clubEconomy.currentSeasonNetProfit >= 0 ? `+${clubEconomy.currentSeasonNetProfit.toLocaleString()}` : clubEconomy.currentSeasonNetProfit.toLocaleString()} ج.م
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-emerald-400 text-[10px] block mb-1">عوائد المباريات والتذاكر</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {(clubEconomy.matchIncomeTotal || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-emerald-400 text-[10px] block mb-1">عوائد الرعاية</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {(clubEconomy.sponsorIncomeTotal || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-rose-400 text-[10px] block mb-1">مصروفات الرواتب</span>
                    <span className="text-sm font-bold text-rose-400 font-mono">
                      {(clubEconomy.salaryExpensesTotal || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                    <span className="text-rose-400 text-[10px] block mb-1">تطوير المنشآت والاستاد</span>
                    <span className="text-sm font-bold text-rose-400 font-mono">
                      {(clubEconomy.facilitySpendingTotal || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 6: ADMIN COINS GRANT & AUDIT LEDGER */}
        {activeTab === 'coins' && (
          <div className="space-y-5 animate-fadeIn text-xs">
            
            {/* Coins Grant Form */}
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <PlusCircle className="w-4 h-4" />
                  <span>شحن وإضافة كوينز للمدرب (Admin Coins Grant)</span>
                </div>
                <span className="text-slate-400 font-mono text-xs">
                  الرصيد الحالي: <strong className="text-amber-400 font-bold">{currentCoins.toLocaleString()}</strong> كوينز
                </span>
              </div>

              {grantSuccessMsg && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{grantSuccessMsg}</span>
                </div>
              )}

              {grantErrorMsg && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{grantErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleGrantCoins} className="space-y-4">
                
                {/* Presets */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">اختر المبلغ السريع أو حدد مخصص:</label>
                  <div className="flex flex-wrap gap-2">
                    {[100, 500, 1000, 5000, 10000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => {
                          setCoinAmount(amt);
                          setCoinCustomAmount('');
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          !coinCustomAmount && coinAmount === amt
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950/50'
                            : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800'
                        }`}
                      >
                        +{amt.toLocaleString()} كوينز
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">أو أدخل مبلغاً مخصصاً:</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="مثال: 2500"
                      value={coinCustomAmount}
                      onChange={(e) => setCoinCustomAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">سبب الشحن (لسجل التدقيق):</label>
                    <select
                      value={coinReasonCategory}
                      onChange={(e) => setCoinReasonCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="تعويض عن عطل فني في مباراة">تعويض عن عطل فني في مباراة</option>
                      <option value="مكافأة مسابقة أونلاين">مكافأة مسابقة أونلاين</option>
                      <option value="هدية ترويجية ودعم للاعب">هدية ترويجية ودعم للاعب</option>
                      <option value="دعم ومساندة فنية من الإدارة">دعم ومساندة فنية من الإدارة</option>
                      <option value="أخرى">سبب مخصص آخر</option>
                    </select>
                  </div>
                </div>

                {/* Custom note */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ملاحظة إضافية لسجل الرقابة (اختياري):</label>
                  <input
                    type="text"
                    placeholder="تفاصيل إضافية عن سبب الإجراء الإداري..."
                    value={coinCustomReason}
                    onChange={(e) => setCoinCustomReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Balance Preview & Action Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400 font-mono">
                    الرصيد بعد الشحن: <strong className="text-emerald-400 font-bold">
                      {(currentCoins + (coinCustomAmount ? parseInt(coinCustomAmount) || 0 : coinAmount)).toLocaleString()}
                    </strong> كوينز
                  </div>

                  <button
                    type="submit"
                    disabled={isGrantingCoins}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-950/50 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isGrantingCoins ? (
                      <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></span>
                    ) : (
                      <Coins className="w-4 h-4" />
                    )}
                    <span>تنفيذ الشحن وتسجيل المعاملة</span>
                  </button>
                </div>

              </form>
            </div>

            {/* Immutable Coins Ledger Table */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CreditCard className="w-4 h-4" />
                  <span>سجل حركات الكوينز غير القابل للتعديل (Immutable Coins Ledger)</span>
                </div>
                <button
                  onClick={loadLedger}
                  disabled={loadingLedger}
                  className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLedger ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>

              {coinLedger.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-right">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800 pb-2">
                        <th className="pb-2 font-semibold">التاريخ</th>
                        <th className="pb-2 font-semibold">نوع المعاملة</th>
                        <th className="pb-2 font-semibold text-center">المبلغ</th>
                        <th className="pb-2 font-semibold text-center">الرصيد السابق</th>
                        <th className="pb-2 font-semibold text-center">الرصيد الجديد</th>
                        <th className="pb-2 font-semibold">السبب والمسؤول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {coinLedger.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 text-slate-400">{formatDate(tx.timestamp)}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.type === 'admin_grant' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                              tx.type === 'prize' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {tx.type === 'admin_grant' ? 'شحن إداري' : tx.type === 'prize' ? 'جائزة تحدي' : tx.type || 'معاملة'}
                            </span>
                          </td>
                          <td className="py-2.5 text-center font-bold text-emerald-400">+{tx.amount?.toLocaleString()}</td>
                          <td className="py-2.5 text-center text-slate-400">{tx.balanceBefore?.toLocaleString() ?? '—'}</td>
                          <td className="py-2.5 text-center font-bold text-slate-200">{tx.balanceAfter?.toLocaleString() ?? '—'}</td>
                          <td className="py-2.5 text-slate-300 font-sans">
                            <div>{tx.reason || 'إجراء إداري'}</div>
                            {tx.adminEmail && <div className="text-[10px] text-slate-500 font-mono" dir="ltr">{tx.adminEmail}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-900/40 rounded-xl">
                  {loadingLedger ? 'جاري تحميل سجل المعاملات...' : 'لا توجد حركات شحن أو معاملات مسجلة سابقة لهذا الحساب.'}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Footer Moderation Controls */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>عرض وإدارة الحساب والمسيرة التدريبية</span>
          </div>

          <div className="flex items-center gap-2">
            {user.status === 'active' ? (
              <>
                <button
                  onClick={() => setActionTarget('suspended')}
                  className="px-3.5 py-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>إيقاف الحساب مؤقتاً</span>
                </button>
                <button
                  onClick={() => setActionTarget('banned')}
                  className="px-3.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  <span>حظر الحساب</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setActionTarget('active')}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>إلغاء الإيقاف وتفعيل الحساب</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
