import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Coins,
  Shield,
  Zap,
  Users,
  Star,
  Swords,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  UserPlus,
  RefreshCw,
  Award,
  CircleDot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import {
  PvPMatch,
  PvPLeaderboardEntry
} from '../../types/pvp';
import {
  subscribeToOnlineManagers,
  subscribeToUserPvPMatches,
  findRandomMatchOrQueue,
  acceptFriendMatch,
  updateOnlinePresence
} from '../../services/pvpService';
import { PvPFriendInviteModal } from './PvPFriendInviteModal';
import { PvPMatchViewModal } from './PvPMatchViewModal';
import { isQuotaExceededError, PVP_QUOTA_USER_MESSAGE } from '../../utils/firestoreErrorHelper';

export const FEATURE_PVP_ENABLED = false;

export const OnlinePvPTab: React.FC = () => {
  if (!FEATURE_PVP_ENABLED) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8 px-4 text-center" dir="rtl" id="pvp-disabled-container">
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6 backdrop-blur-md">
          <div className="w-20 h-20 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <Swords className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
              صيانة وترقية
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              التحديات المباشرة متوقفة مؤقتًا وستعود قريبًا
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              نقوم حاليًا بتحديث خوادم المباريات التنافسية وبناء نظام تصنيف وتحديات واقعية أكثر دقة واستقرارًا. يمكنك متابعة مسيرتك المحلية في الدوريات والكؤوس الآن.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>بيانات مسيرتك وإنجازاتك محفوظة بالكامل محلياً</span>
          </div>
        </div>
      </div>
    );
  }

  const { user } = useAuth();
  const { userClub, manager } = useGame();

  const [onlineManagers, setOnlineManagers] = useState<PvPLeaderboardEntry[]>([]);
  const [userMatches, setUserMatches] = useState<PvPMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PvPMatch | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [prizeSelect, setPrizeSelect] = useState<number>(500);
  const [activeSubTab, setActiveSubTab] = useState<'matches' | 'leaderboard'>('matches');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // User details
  const userCoins = user?.virtualCoins !== undefined ? user.virtualCoins : 1000;
  const userElo = user?.eloRating || 1200;
  const userStats = user?.pvpStats || {
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsScored: 0,
    goalsConceded: 0,
    coinsWonTotal: 0,
    cleanSheets: 0,
    winStreak: 0,
    bestWinStreak: 0
  };

  const winRate = userStats.matchesPlayed > 0 
    ? Math.round((userStats.wins / userStats.matchesPlayed) * 100) 
    : 0;

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.uid) return;

    const unsubOnline = subscribeToOnlineManagers((managers) => {
      setOnlineManagers(managers);
    });

    const unsubMatches = subscribeToUserPvPMatches(user.uid, (matches) => {
      setUserMatches(matches);
    });

    return () => {
      unsubOnline();
      unsubMatches();
    };
  }, [user?.uid]);

  // Handle Matchmaking
  const handleStartMatch = async (prize: number = 0) => {
    if (!user) {
      setFeedback({ type: 'error', message: 'يرجى تسجيل الدخول أولاً للعب عبر الإنترنت.' });
      return;
    }

    if (!userClub) {
      setFeedback({ type: 'error', message: 'يجب تولي تدريب نادٍ أولاً لخوض مباريات الأونلاين والمنافسات!' });
      return;
    }

    try {
      setLoadingAction(prize > 0 ? `challenge_${prize}` : 'friendly');
      setFeedback(null);

      const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];

      const { match, wasMatched } = await findRandomMatchOrQueue(
        user,
        userClub,
        userClub.tactics || {
          formation: '4-3-3',
          mentality: 'balanced',
          passingStyle: 'short',
          pressingIntensity: 'balanced',
          tempo: 'balanced',
          startingPlayerIds: squadPlayers.slice(0, 11).map(p => p.id),
          benchPlayerIds: squadPlayers.slice(11, 18).map(p => p.id),
          captainId: squadPlayers[0]?.id || '',
          penaltyTakerId: squadPlayers[0]?.id || '',
          freeKickTakerId: squadPlayers[0]?.id || '',
          cornerTakerId: squadPlayers[0]?.id || '',
        },
        prize,
        manager.level,
        manager.reputation
      );

      if (wasMatched) {
        setFeedback({
          type: 'success',
          message: `تم العثور على منافس فوراً (${match.player1.displayName})! افتح غرفة المباراة لبدء اللقاء.`
        });
      } else {
        setFeedback({
          type: 'success',
          message: `تم إنشاء مباراة التحدي وإدراجك في قائمة الانتظار بنجاح! سيتم إشعارك فور انضمام منافس.`
        });
      }

      setSelectedMatch(match);
    } catch (err: any) {
      console.error('Matchmaking error:', err);
      const isQuota = isQuotaExceededError(err);
      setFeedback({
        type: 'error',
        message: isQuota ? PVP_QUOTA_USER_MESSAGE : (err.message || 'فشل البحث عن مباراة أونلاين.')
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Accepting a Challenge Invite
  const handleAcceptInvite = async (match: PvPMatch) => {
    if (!user) {
      setFeedback({ type: 'error', message: 'يرجى تسجيل الدخول أولاً للعب عبر الإنترنت.' });
      return;
    }

    if (!userClub) {
      setFeedback({ type: 'error', message: 'يجب تولي تدريب نادٍ أولاً لقبول التحدي وخوض مباريات الأونلاين!' });
      return;
    }

    try {
      setLoadingAction(`accept_${match.id}`);
      setFeedback(null);

      const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];

      await acceptFriendMatch(
        match.id,
        user,
        userClub,
        userClub.tactics || {
          formation: '4-3-3',
          mentality: 'balanced',
          passingStyle: 'short',
          pressingIntensity: 'balanced',
          tempo: 'balanced',
          startingPlayerIds: squadPlayers.slice(0, 11).map(p => p.id),
          benchPlayerIds: squadPlayers.slice(11, 18).map(p => p.id),
          captainId: squadPlayers[0]?.id || '',
          penaltyTakerId: squadPlayers[0]?.id || '',
          freeKickTakerId: squadPlayers[0]?.id || '',
          cornerTakerId: squadPlayers[0]?.id || '',
        },
        manager.level,
        manager.reputation
      );

      setFeedback({
        type: 'success',
        message: 'تم قبول التحدي بنجاح! يمكنك الآن بدء المباراة.'
      });
      setSelectedMatch(match);
    } catch (err: any) {
      console.error('Accept invite error:', err);
      const isQuota = isQuotaExceededError(err);
      setFeedback({
        type: 'error',
        message: isQuota ? PVP_QUOTA_USER_MESSAGE : (err.message || 'فشل قبول التحدي.')
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Active / Pending matches filter
  const pendingMatches = userMatches.filter(m => m.status !== 'completed' && m.status !== 'cancelled');
  const pastMatches = userMatches.filter(m => m.status === 'completed');

  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          ⚔️
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          يجب أن تكون مرتبطاً بعقد تدريبي مع أحد الأندية للمشاركة في بطولات وتحديات الأونلاين ومواجهة المدربين الآخرين. تفضل باختيار نادٍ في تبويب المسيرة!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-right">
      
      {/* Top Banner: PvP Manager Career Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          {/* Manager Info & Club */}
          <div className="flex items-center gap-4 text-right">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border-2"
              style={{
                backgroundColor: userClub?.primaryColor || '#10b981',
                borderColor: '#ffffff30',
                color: '#ffffff'
              }}
            >
              {userClub ? userClub.name.substring(0, 2) : '⚽'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{userClub?.name}</h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CircleDot className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                  أونلاين
                </span>
              </div>
              <p className="text-xs text-slate-400">
                المدرب: <span className="text-slate-200 font-semibold">{user?.displayName || manager.name}</span> | المستوى: {manager.level} ({manager.license})
              </p>
            </div>
          </div>

          {/* Key Metrics: Elo & Virtual Coins */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
            
            {/* Elo Rating */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>تصنيف Elo</span>
              </div>
              <div className="text-lg font-black text-white font-mono">{userElo}</div>
            </div>

            {/* Virtual Coins Wallet */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-bold">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>الكوينز الافتراضية</span>
              </div>
              <div className="text-lg font-black text-amber-300 font-mono">{userCoins} 🪙</div>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                <span>نسبة الانتصارات</span>
              </div>
              <div className="text-lg font-black text-white font-mono">{winRate}%</div>
            </div>

            {/* Win Streak */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1 text-[11px] text-orange-400 font-bold">
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>سلسلة الانتصارات</span>
              </div>
              <div className="text-lg font-black text-orange-400 font-mono">{userStats.winStreak} 🔥</div>
            </div>

          </div>

        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            : 'bg-red-950/60 border-red-800 text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button 
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Online Managers Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white">المدربون المتصلون الآن في السيرفر:</h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg">
              {onlineManagers.filter(m => m.isOnline).length} متصل
            </span>
          </div>
          <p className="text-[11px] text-slate-400">تحديث تلقائي وفوري</p>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {onlineManagers.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">لا يوجد مدربون آخرون مسجلون حالياً.</p>
          ) : (
            onlineManagers.slice(0, 15).map((mgr) => (
              <div 
                key={mgr.uid}
                className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 hover:border-slate-700 px-3 py-2 rounded-2xl shrink-0 transition-colors"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                    {mgr.displayName.substring(0, 2)}
                  </div>
                  {mgr.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-200 max-w-[100px] truncate">{mgr.displayName}</div>
                  <div className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    <span>{mgr.eloRating} Elo</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Matchmaking Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Option 1: Friendly Match (مباراة ودية) */}
        <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 space-y-4 transition-all group shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-lg">
              ودية مجانية
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">مباراة ودية</h3>
            <p className="text-xs text-slate-400 mt-1">
              العب مع صديق أو منافس بدون جائزة. مباراة للمتعة واختبار الخطط والتكتيكات وتطوير تصنيف Elo.
            </p>
          </div>

          <button
            onClick={() => handleStartMatch(0)}
            disabled={loadingAction !== null}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingAction === 'friendly' ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            <span>بدء مباراة ودية</span>
          </button>
        </div>

        {/* Option 2: Challenge Match (مباراة تحدي بجائزة افتراضية) */}
        <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 space-y-4 transition-all group shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-lg font-mono">
              رصيدك: {userCoins} 🪙
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">مباراة تحدي (جائزة افتراضية)</h3>
            <p className="text-xs text-slate-400 mt-1">
              تحدى مدرباً آخر في مباراة حماسية. يتفق الطرفان على جائزة افتراضية ويحصل الفائز عليها بالكامل.
            </p>
          </div>

          {/* Prize Value Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">اختر جائزة التحدي:</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[500, 1000, 5000, 10000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setPrizeSelect(amount)}
                  className={`py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    prizeSelect === amount
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {amount >= 1000 ? `${amount / 1000}k` : amount} 🪙
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleStartMatch(prizeSelect)}
            disabled={loadingAction !== null || userCoins < prizeSelect}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loadingAction?.startsWith('challenge') ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Swords className="w-4 h-4" />
            )}
            <span>إنشاء مباراة تحدي ({prizeSelect.toLocaleString()} كوينز)</span>
          </button>
        </div>

        {/* Option 3: Direct Challenge Friend (دعوة تحدي لصديق) */}
        <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-3xl p-5 space-y-4 transition-all group shadow-lg">
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-105 transition-transform">
              <UserPlus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded-lg">
              تحدي مباشر
            </span>
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">دعوة صديق لمباراة تحدي</h3>
            <p className="text-xs text-slate-400 mt-1">
              أرسل دعوة خاصة لصديقك بالبريد الإلكتروني لخوض مباراة ودية أو تحدي بجائزة افتراضية متفق عليها.
            </p>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إرسال دعوة تحدي لصديق</span>
          </button>
        </div>

      </div>

      {/* Sub Tabs: Matches Queue & History vs Global Leaderboard */}
      <div className="flex border-b border-slate-800 gap-3 pt-2">
        <button
          onClick={() => setActiveSubTab('matches')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'matches'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>المباريات الحالية وسجل المواجهات ({userMatches.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('leaderboard')}
          className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeSubTab === 'leaderboard'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>لوحة الشرف وتصنيف كبار المدربين</span>
        </button>
      </div>

      {/* SUB TAB 1: MATCHES LIST */}
      {activeSubTab === 'matches' && (
        <div className="space-y-6">
          
          {/* Active / Pending Matches */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>المباريات النشطة وقوائم الانتظار:</span>
            </h3>

            {pendingMatches.length === 0 ? (
              <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-2">
                <Swords className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">لا توجد مباريات معلقة أو قيد الانتظار حالياً.</p>
                <p className="text-[11px] text-slate-500">اختر من الخيارات بالأعلى لبدء مباراة ودية أو تحدي بجائزة!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingMatches.map((m) => {
                  const isHost = m.player1Id === user?.uid;
                  const isInvitedToMe = m.player2Email?.toLowerCase() === user?.email?.toLowerCase() && !m.player2Id;
                  const prize = m.prizeAmount || m.stakeAmount || 0;

                  return (
                    <div 
                      key={m.id}
                      className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition-colors shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl ${
                          m.status === 'ready'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {m.status === 'ready' ? 'جاهزة للعب والمحاكاة' : 'في انتظار اكتمال المنافس'}
                        </span>

                        <span className="text-[11px] font-mono text-amber-400 font-bold">
                          {prize > 0 ? `جائزة: ${prize.toLocaleString()} 🪙` : 'ودية مجانية'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="text-right space-y-1">
                          <span className="font-bold text-white block">{m.player1.clubName}</span>
                          <span className="text-[11px] text-slate-400 block">{m.player1.displayName}</span>
                        </div>

                        <div className="text-center font-bold text-slate-500 font-mono text-sm px-3">
                          VS
                        </div>

                        <div className="text-left space-y-1">
                          <span className="font-bold text-white block">
                            {m.player2 ? m.player2.clubName : 'في الانتظار...'}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {m.player2 ? m.player2.displayName : m.player2Email ? `دعوة: ${m.player2Email}` : 'أي منافس عشوائي'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        {isInvitedToMe && (
                          <button
                            onClick={() => handleAcceptInvite(m)}
                            disabled={loadingAction !== null}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>قبول التحدي ودخول المباراة</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedMatch(m)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>فتح غرفة المباراة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Matches History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>سجل المواجهات المنتهية ({pastMatches.length}):</span>
            </h3>

            {pastMatches.length === 0 ? (
              <div className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl text-center text-xs text-slate-500">
                لم تلعب أي مباريات أونلاين حتى الآن.
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl divide-y divide-slate-800/80 overflow-hidden shadow-lg">
                {pastMatches.map((m) => {
                  const isP1 = m.player1Id === user?.uid;
                  const isWon = m.winnerId === user?.uid;
                  const isDraw = m.isDraw;
                  const prize = m.prizeAmount || m.stakeAmount || 0;

                  return (
                    <div 
                      key={m.id}
                      onClick={() => setSelectedMatch(m)}
                      className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isWon 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : isDraw 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isWon ? 'فوز' : isDraw ? 'تعادل' : 'هزيمة'}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{m.player1.clubName}</span>
                            <span className="font-mono font-black text-amber-300 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                              {m.score?.player1} - {m.score?.player2}
                            </span>
                            <span>{m.player2?.clubName}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            الخصم: {isP1 ? m.player2?.displayName : m.player1.displayName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        {/* Elo change */}
                        <span className={`font-bold ${
                          (isP1 ? m.player1EloDelta || 0 : m.player2EloDelta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {(isP1 ? m.player1EloDelta || 0 : m.player2EloDelta || 0) >= 0 ? '+' : ''}
                          {isP1 ? m.player1EloDelta : m.player2EloDelta} Elo
                        </span>

                        {/* Coins reward */}
                        {prize > 0 && (
                          <span className="text-amber-400 font-bold">
                            +{(isP1 ? m.player1CoinsDelta || 0 : m.player2CoinsDelta || 0)} 🪙
                          </span>
                        )}

                        <span className="text-slate-400 text-[11px] font-sans">عرض التفاصيل ←</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUB TAB 2: GLOBAL LEADERBOARD */}
      {activeSubTab === 'leaderboard' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>لوحة الشرف وتصنيف كبار مدربي اللعبة حول العالم</span>
              </h3>
              <p className="text-xs text-slate-400">ترتيب المدربين حسب نقاط تقييم Elo الدولية</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              إجمالي المتنافسين: {onlineManagers.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/50">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">المدرب</th>
                  <th className="py-3 px-3 text-center">تقييم Elo</th>
                  <th className="py-3 px-3 text-center">المباريات</th>
                  <th className="py-3 px-3 text-center">فوز</th>
                  <th className="py-3 px-3 text-center">نسبة الفوز</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {onlineManagers.map((mgr, idx) => {
                  const isMe = mgr.uid === user?.uid;
                  return (
                    <tr 
                      key={mgr.uid}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMe ? 'bg-indigo-950/30 border-r-4 border-indigo-500' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-400 font-sans">
                        {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                      </td>

                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{mgr.displayName}</span>
                          {isMe && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded">
                              أنت
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-amber-400">
                        {mgr.eloRating} ⭐
                      </td>

                      <td className="py-3 px-3 text-center text-slate-300">
                        {mgr.matchesPlayed}
                      </td>

                      <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                        {mgr.wins}
                      </td>

                      <td className="py-3 px-3 text-center text-slate-300">
                        {mgr.winRate}%
                      </td>

                      <td className="py-3 px-3 text-center font-sans">
                        {mgr.isOnline ? (
                          <span className="text-emerald-400 text-[10px] font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                            متصل الآن
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">
                            غير متصل
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Friend Invite Modal */}
      {showInviteModal && (
        <PvPFriendInviteModal
          onClose={() => setShowInviteModal(false)}
          onMatchCreated={(match) => {
            setShowInviteModal(false);
            setSelectedMatch(match);
            setFeedback({
              type: 'success',
              message: `تم إرسال دعوة المباراة إلى ${match.player2Email} بنجاح!`
            });
          }}
        />
      )}

      {/* Match Room / View Modal */}
      {selectedMatch && (
        <PvPMatchViewModal
          initialMatch={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onMatchUpdated={(updated) => {
            setSelectedMatch(updated);
          }}
        />
      )}

    </div>
  );
};
