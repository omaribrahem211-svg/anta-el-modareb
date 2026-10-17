import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  challengesManager,
  ChallengesState,
  ChallengeItem,
  ChallengeReward,
} from '../services/challengesService';
import {
  Trophy,
  Tv,
  Sparkles,
  Zap,
  Flame,
  CheckCircle2,
  Gift,
  Coins,
  ShieldCheck,
  Award,
  HeartPulse,
  Swords,
  RotateCcw,
  Play,
  Lock,
  Clock,
  Check,
  X,
  Star,
  Wallet,
} from 'lucide-react';

export const ChallengesTab: React.FC = () => {
  const { grantChallengeReward } = useGame();
  const [challengesState, setChallengesState] = useState<ChallengesState>(() => challengesManager.getState());
  const [activeFilter, setActiveFilter] = useState<'all' | 'matches' | 'ads' | 'squad'>('all');
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [activeAdId, setActiveAdId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [chestOpening, setChestOpening] = useState(false);

  // Lucky chest doubling modal state
  const [luckyChestWonReward, setLuckyChestWonReward] = useState<{
    label: string;
    budget: number;
    coins: number;
    devPoints: number;
  } | null>(null);
  const [isDoublingChest, setIsDoublingChest] = useState(false);

  // Live countdown timers (3 hours cooldowns)
  const [luckyCooldown, setLuckyCooldown] = useState<number>(() => challengesManager.getLuckyChestCooldownRemaining());
  const [rotateCooldown, setRotateCooldown] = useState<number>(() => challengesManager.getRotateMatchesCooldownRemaining());

  useEffect(() => {
    const unsub = challengesManager.subscribe((state) => {
      setChallengesState({ ...state });
      setLuckyCooldown(challengesManager.getLuckyChestCooldownRemaining());
      setRotateCooldown(challengesManager.getRotateMatchesCooldownRemaining());
    });
    return () => unsub();
  }, []);

  // 1-second interval to tick cooldown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setLuckyCooldown(challengesManager.getLuckyChestCooldownRemaining());
      setRotateCooldown(challengesManager.getRotateMatchesCooldownRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCooldown = (totalSecs: number): string => {
    if (totalSecs <= 0) return '00:00:00';
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleWatchDirectAd = async (challengeId: string) => {
    if (isLoadingAd) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNotification({
        text: '⚠️ لا يوجد اتصال بالإنترنت. يرجى الاتصال لتشغيل الإعلان والحصول على تقدم التحدي.',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setIsLoadingAd(true);
    setActiveAdId(challengeId);

    try {
      const success = await challengesManager.watchAdForChallenge(
        challengeId,
        () => {
          setNotification({ text: 'تم تسجيل مشاهدة الإعلان وتقدم التحدي بنجاح! 🎬', type: 'success' });
          setTimeout(() => setNotification(null), 3500);
        },
        (errMsg?: any) => {
          const text = typeof errMsg === 'string' ? errMsg : 'لم يكتمل الإعلان أو تعذر تشغيله، لم يتم احتساب التقدم.';
          setNotification({ text, type: 'error' });
          setTimeout(() => setNotification(null), 4000);
        }
      );
      if (!success) {
        setNotification({
          text: 'لم يكتمل الإعلان حتى النهاية أو لا يوجد اتصال، لم يتم احتساب التقدم.',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 3500);
      }
    } finally {
      setIsLoadingAd(false);
      setActiveAdId(null);
    }
  };

  const handleOpenLuckyChest = async () => {
    if (chestOpening || luckyCooldown > 0) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNotification({
        text: '⚠️ لا يوجد اتصال بالإنترنت لفتح صندوق الحظ الإعلاني.',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setChestOpening(true);

    try {
      const success = await challengesManager.openLuckyAdChest(
        (reward) => {
          grantChallengeReward({
            budget: reward.budget,
            coins: reward.coins,
            devPoints: reward.devPoints,
            energyPercent: 15,
            reputation: 1,
            label: reward.label,
          });
          setLuckyChestWonReward(reward);
          setNotification({ text: reward.label, type: 'success' });
          setTimeout(() => setNotification(null), 5000);
        },
        (errMsg?: any) => {
          const text = typeof errMsg === 'string' ? errMsg : 'لم يكتمل الإعلان؛ يجب مشاهدته كاملاً لفتح صندوق الحظ.';
          setNotification({ text, type: 'error' });
          setTimeout(() => setNotification(null), 4000);
        }
      );
      if (!success) {
        setNotification({
          text: 'تم إغلاق الإعلان قبل اكتماله أو تعذر التحميل، لم يتم منح جوائز الصندوق.',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 3500);
      }
    } finally {
      setChestOpening(false);
    }
  };

  const handleDoubleChestWithSecondAd = async () => {
    if (!luckyChestWonReward || isDoublingChest) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNotification({
        text: '⚠️ لا يوجد اتصال بالإنترنت لتشغيل الإعلان الثاني ومضاعفة جوائز الصندوق.',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setIsDoublingChest(true);
    try {
      const success = await challengesManager.doubleLuckyAdChest(
        luckyChestWonReward,
        (doubledReward) => {
          grantChallengeReward({
            budget: doubledReward.budget,
            coins: doubledReward.coins,
            devPoints: doubledReward.devPoints,
            energyPercent: 15,
            reputation: 1,
            label: doubledReward.label,
          });
          setNotification({ text: doubledReward.label, type: 'success' });
          setLuckyChestWonReward(null);
          setTimeout(() => setNotification(null), 6000);
        },
        (errMsg?: any) => {
          const text = typeof errMsg === 'string' ? errMsg : 'لم يكتمل الإعلان الثاني، لم يتم مضاعفة الجائزة.';
          setNotification({ text, type: 'error' });
          setTimeout(() => setNotification(null), 4000);
        }
      );
      if (success) {
        setLuckyChestWonReward(null);
      }
    } finally {
      setIsDoublingChest(false);
    }
  };

  // STEP 1: Claim base reward with 1st ad (STRICT: no reward without watching ad)
  const handleClaimWithAd = async (challenge: ChallengeItem) => {
    if (isLoadingAd) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNotification({
        text: '⚠️ لا يوجد اتصال بالإنترنت. يلزم مشاهدة إعلان لاستلام الجائزة، وتظل جائزتك محفوظة حتى تتصل بالإنترنت.',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4500);
      return;
    }

    setIsLoadingAd(true);
    setActiveAdId(challenge.id);

    try {
      const success = await challengesManager.claimChallenge(
        challenge.id,
        'claim_with_ad',
        (reward: ChallengeReward) => {
          grantChallengeReward(reward);
          setNotification({
            text: `🎉 تهانينا! تم استلام: ${reward.label}. يمكنك الآن مضاعفة الجائزة 2X بإعلان ثانٍ!`,
            type: 'success',
          });
          setTimeout(() => setNotification(null), 5000);
        },
        (errMsg?: any) => {
          const text = typeof errMsg === 'string' ? errMsg : '⚠️ لم يتم مشاهدة الإعلان حتى نهايته؛ لا يمكن تسليم المكافأة إلا بعد اكتمال مشاهدة الإعلان كاملاً. مكافأتك لا تزال محفوظة.';
          setNotification({ text, type: 'error' });
          setTimeout(() => setNotification(null), 4500);
        }
      );

      if (!success) {
        setNotification({
          text: '⚠️ لم تكتمل مشاهدة الإعلان أو حدث انقطاع في الشبكة؛ لم يتم تسليم المكافأة، وتظل محفوظة لك.',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } finally {
      setIsLoadingAd(false);
      setActiveAdId(null);
    }
  };

  // STEP 2: Double reward with 2nd ad (2X)
  const handleDoubleWithSecondAd = async (challenge: ChallengeItem) => {
    if (isLoadingAd) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNotification({
        text: '⚠️ لا يوجد اتصال بالإنترنت لمشاهدة الإعلان الثاني ومضاعفة المكافأة 2X.',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setIsLoadingAd(true);
    setActiveAdId(challenge.id);

    try {
      const success = await challengesManager.claimChallenge(
        challenge.id,
        'double_with_second_ad',
        (doubledReward: ChallengeReward) => {
          grantChallengeReward(doubledReward);
          setNotification({
            text: `✨ مضاعفة خارقة 2X: ${doubledReward.label}`,
            type: 'success',
          });
          setTimeout(() => setNotification(null), 5500);
        },
        (errMsg?: any) => {
          const text = typeof errMsg === 'string' ? errMsg : '⚠️ لم يكتمل الإعلان الثاني، لم يتم احتساب المكافأة الإضافية.';
          setNotification({ text, type: 'error' });
          setTimeout(() => setNotification(null), 4500);
        }
      );

      if (!success) {
        setNotification({
          text: '⚠️ لم تكتمل مشاهدة الإعلان الثاني، مكافأتك الأساسية محفوظة بالفعل.',
          type: 'error',
        });
        setTimeout(() => setNotification(null), 4000);
      }
    } finally {
      setIsLoadingAd(false);
      setActiveAdId(null);
    }
  };

  const handleFinishWithoutDoubling = (challengeId: string) => {
    challengesManager.finishWithoutDoubling(challengeId);
    setNotification({
      text: 'تم تأكيد استلام المكافأة الأساسية وإتمام التحدي بنجاح ✓',
      type: 'success',
    });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRotateMatches = () => {
    const res = challengesManager.rotateAllMatchChallenges();
    if (res.success) {
      setNotification({
        text: '🔄 تم تدوير وتحديث تحديات المباريات بنجاح! تحديات جديدة ومتنوعة بانتظارك.',
        type: 'success',
      });
    } else {
      setNotification({
        text: res.message,
        type: 'error',
      });
    }
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredChallenges = challengesState.challenges.filter((c) => {
    if (activeFilter === 'all') return true;
    return c.category === activeFilter;
  });

  const unclaimedCount = challengesManager.getUnclaimedCompletedCount();

  return (
    <div className="space-y-4 pb-24 animate-fade-in" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-2xl transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/80 text-rose-200'
          }`}
        >
          <span className="leading-relaxed">{notification.text}</span>
          <button
            onClick={() => setNotification(null)}
            className="opacity-70 hover:opacity-100 px-2 py-0.5 text-base cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* MODAL: Lucky Chest Won - Double with 2nd Ad Prompt */}
      {luckyChestWonReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-center">
            <button
              onClick={() => setLuckyChestWonReward(null)}
              className="absolute top-4 left-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-3xl shadow-inner animate-bounce">
              🎁
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                تم فتح صندوق الحظ بنجاح!
              </span>
              <h3 className="text-lg font-black text-white">مبروك يا كابتن! 🎉</h3>
              <p className="text-xs text-slate-300">
                حصلت على جوائز قيّمة لدعم مسيرة ناديك:
              </p>
            </div>

            {/* Reward Badges Grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex flex-col items-center">
                <Wallet className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[10px] text-slate-400">ميزانية النادي</span>
                <span className="font-mono font-black text-xs text-emerald-300">
                  +{luckyChestWonReward.budget.toLocaleString()} ج.م
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/30 flex flex-col items-center">
                <Coins className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[10px] text-slate-400">كوينز ذهبية</span>
                <span className="font-mono font-black text-xs text-amber-300">
                  +{luckyChestWonReward.coins}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-sky-950/60 border border-sky-500/30 flex flex-col items-center">
                <Star className="w-4 h-4 text-sky-400 mb-1" />
                <span className="text-[10px] text-slate-400">نقاط تطوير</span>
                <span className="font-mono font-black text-xs text-sky-300">
                  +{luckyChestWonReward.devPoints}
                </span>
              </div>
            </div>

            {/* Doubling Promotion */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/15 border border-amber-500/40 space-y-1">
              <span className="text-xs font-black text-amber-300 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                هل ترغب في مضاعفة كل هذه الجوائز (2X)؟
              </span>
              <p className="text-[11px] text-slate-300">
                شاهد إعلاناً ثانياً لتحصل على ضعف الميزانية والكوينز ونقاط التطوير فوراً!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleDoubleChestWithSecondAd}
                disabled={isDoublingChest}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Tv className="w-4 h-4 fill-slate-950" />
                <span>{isDoublingChest ? 'جارٍ مشاهدة الإعلان...' : 'ضاعف الجوائز (2X) بإعلان 🎬'}</span>
              </button>

              <button
                onClick={() => setLuckyChestWonReward(null)}
                disabled={isDoublingChest}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer active:scale-95"
              >
                الاحتفاظ بالجوائز فقط ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner: Challenges & Retention Hub */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/40 p-4 sm:p-5 shadow-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">
                  مركز تحديات المباريات ومكافآت الإعلانات
                </h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40">
                  متجددة كل 3 ساعات
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                اكسب 5 مباريات متتالية لحصد الجائزة الكبرى، وشاهد الإعلانات لاستلام المكافآت ومضاعفتها 2X!
              </p>
            </div>
          </div>

          {/* Unclaimed counter badge */}
          {unclaimedCount > 0 && (
            <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 px-3.5 py-1.5 rounded-2xl text-xs font-bold shrink-0 self-start sm:self-center shadow animate-pulse">
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>{unclaimedCount} مكافآت جاهزة للاستلام!</span>
            </div>
          )}
        </div>

        {/* Vital Progress Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          {/* Win Streak Indicator */}
          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">سلسلة الانتصارات</span>
              <span className="font-bold text-amber-300 font-mono text-xs sm:text-sm">
                {challengesState.currentWinStreak || 0} من 5 متتالية 🔥
              </span>
            </div>
          </div>

          {/* Ads Watched Today */}
          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">إعلانات شاهدتها اليوم</span>
              <span className="font-bold text-blue-300 font-mono text-xs sm:text-sm">
                {challengesState.adsWatchedToday} إعلانات
              </span>
            </div>
          </div>

          {/* Matches Played Today */}
          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <Swords className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">مباريات خضتها اليوم</span>
              <span className="font-bold text-emerald-300 font-mono text-xs sm:text-sm">
                {challengesState.matchesPlayedToday} مباريات
              </span>
            </div>
          </div>

          {/* Completed Challenges */}
          <div className="bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">التحديات المنجزة</span>
              <span className="font-bold text-purple-300 font-mono text-xs sm:text-sm">
                {challengesState.challenges.filter((c) => c.isCompleted).length} من {challengesState.challenges.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SPECIAL FEATURE: LUCKY MYSTERY AD CHEST (صندوق الحظ الإعلاني - حد أقصى 100 ألف - كل 3 ساعات) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-amber-600/20 border-2 border-amber-500/60 p-4 sm:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/30 text-amber-300 border border-amber-400 flex items-center justify-center text-3xl shrink-0 shadow-lg animate-bounce">
              🎁
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white">
                  صندوق الحظ الإعلاني السريع (حتى 100,000 ج.م)
                </h3>
                {luckyCooldown <= 0 ? (
                  <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                    متاح الآن
                  </span>
                ) : (
                  <span className="bg-slate-800 text-amber-300 border border-amber-500/40 font-mono text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    متبقي: {formatCooldown(luckyCooldown)}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">
                شاهد إعلان فيديو وافتح الصندوق فوراً لتحصل على مبالغ مالية تصل إلى <strong>100,000 ج.م</strong> كحد أقصى وكوينز ونقاط تطوير! وتقدر تضاعف الجوائز 2X بإعلان ثانٍ (متاح مرة كل 3 ساعات).
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
            {luckyCooldown > 0 ? (
              <div className="flex items-center justify-center gap-2 bg-slate-800/80 border border-slate-700 text-slate-400 font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl">
                <Lock className="w-4 h-4 text-amber-400/70" />
                <span>متاح بعد: {formatCooldown(luckyCooldown)}</span>
              </div>
            ) : (
              <button
                onClick={handleOpenLuckyChest}
                disabled={chestOpening}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/30 transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Tv className="w-4 h-4 fill-slate-950" />
                <span>{chestOpening ? 'جارٍ فتح الصندوق...' : 'شاهد إعلان وافتح الصندوق 🎬'}</span>
              </button>
            )}
            <span className="text-[10px] text-slate-400 text-center sm:text-right">
              استخدام الصندوق متاح مرة كل 3 ساعات
            </span>
          </div>
        </div>
      </div>

      {/* Category Segmented Filters & Rotate Match Challenges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            كل التحديات ({challengesState.challenges.length})
          </button>

          <button
            onClick={() => setActiveFilter('matches')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'matches'
                ? 'bg-slate-800 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>تحديات المباريات (متجددة) ⚽</span>
          </button>

          <button
            onClick={() => setActiveFilter('ads')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'ads'
                ? 'bg-slate-800 text-blue-300 border border-blue-500/50 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-blue-400" />
            <span>إعلانات ممولة</span>
          </button>

          <button
            onClick={() => setActiveFilter('squad')}
            className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'squad'
                ? 'bg-slate-800 text-sky-300 border border-sky-500/50 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>التكتيك والنجوم</span>
          </button>
        </div>

        {/* Rotate Match Challenges Button (3-Hour Cooldown) */}
        <button
          onClick={handleRotateMatches}
          disabled={rotateCooldown > 0}
          className={`self-end sm:self-auto px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 text-xs active:scale-95 shadow-sm ${
            rotateCooldown > 0
              ? 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 cursor-pointer'
          }`}
          title="تدوير وتغيير تحديات المباريات لتحديات جديدة (مرة كل 3 ساعات)"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${rotateCooldown > 0 ? 'text-slate-500' : 'text-purple-400'}`} />
          <span>
            {rotateCooldown > 0
              ? `تدوير التحديات (${formatCooldown(rotateCooldown)}) 🔒`
              : 'تدوير تحديات المباريات 🔄'}
          </span>
        </button>
      </div>

      {/* Challenges List */}
      <div className="space-y-3">
        {filteredChallenges.map((challenge) => {
          const progressPercent = Math.min(100, Math.round((challenge.current / challenge.target) * 100));
          const isAdWorking = isLoadingAd && activeAdId === challenge.id;

          return (
            <div
              key={challenge.id}
              className={`rounded-2xl border p-4 sm:p-4.5 transition-all shadow-md space-y-3 ${
                challenge.isClaimed && !challenge.canDoubleWithSecondAd
                  ? 'bg-slate-950/60 border-slate-800/60 opacity-65'
                  : challenge.isCompleted
                  ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/60 shadow-emerald-950/30'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-750'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${
                      challenge.isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-800 text-amber-400 border-slate-700'
                    }`}
                  >
                    {challenge.icon === 'Tv' && <Tv className="w-5 h-5 text-blue-400" />}
                    {challenge.icon === 'HeartPulse' && <HeartPulse className="w-5 h-5 text-rose-400" />}
                    {challenge.icon === 'Award' && <Award className="w-5 h-5 text-yellow-400" />}
                    {challenge.icon === 'Swords' && <Swords className="w-5 h-5 text-amber-400" />}
                    {challenge.icon === 'Flame' && <Flame className="w-5 h-5 text-orange-400" />}
                    {challenge.icon === 'ShieldCheck' && <ShieldCheck className="w-5 h-5 text-blue-400" />}
                    {challenge.icon === 'Sparkles' && <Sparkles className="w-5 h-5 text-emerald-400" />}
                    {challenge.icon === 'Trophy' && <Trophy className="w-5 h-5 text-amber-400" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-white truncate">
                        {challenge.title}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {challenge.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {challenge.description}
                    </p>
                  </div>
                </div>

                {/* Reward Label Badge */}
                <div className="shrink-0 text-left bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">الجائزة:</span>
                  <span className="text-xs font-bold text-amber-300 font-mono">
                    {challenge.reward.label}
                  </span>
                </div>
              </div>

              {/* Progress Bar & Indicators */}
              <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">مستوى التقدم:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {`${challenge.current} / ${challenge.target} ${challenge.unit || ''}`}
                    {' '}({progressPercent}%)
                  </span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      challenge.isCompleted
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons: Strict Ad Claim & Doubling Rule */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                {/* 1. Fully Claimed & Doubled or Finalized */}
                {challenge.isClaimed && !challenge.canDoubleWithSecondAd ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold py-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {challenge.isDoubled
                        ? 'تم استلام المكافأة ومضاعفتها (2X) بنجاح كامل 🔥'
                        : 'تم استلام المكافأة الأساسية بنجاح ✅'}
                    </span>
                  </div>
                ) : challenge.isClaimed && challenge.canDoubleWithSecondAd ? (
                  /* 2. Claimed 1X - Eligible to Double with 2nd Ad */
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>تم استلام (1X)! شاهد إعلاناً ثانياً لمضاعفة الجائزة 2X:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDoubleWithSecondAd(challenge)}
                        disabled={isLoadingAd}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Tv className="w-3.5 h-3.5 fill-slate-950" />
                        <span>{isAdWorking ? 'جارٍ المشاهدة...' : 'ضاعف المكافأة (2X) بإعلان ثانٍ 🎬'}</span>
                      </button>

                      <button
                        onClick={() => handleFinishWithoutDoubling(challenge.id)}
                        disabled={isLoadingAd}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer active:scale-95"
                      >
                        اكتفيت بـ 1X ✓
                      </button>
                    </div>
                  </div>
                ) : challenge.isCompleted ? (
                  /* 3. Completed: MUST WATCH 1ST AD TO CLAIM (Strict rule: no free claim) */
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>اكتمل التحدي! يلزم مشاهدة إعلان لاستلام الجائزة:</span>
                    </div>

                    <button
                      onClick={() => handleClaimWithAd(challenge)}
                      disabled={isLoadingAd}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Tv className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{isAdWorking ? 'جارٍ تشغيل الإعلان...' : 'استلام المكافأة بمشاهدة إعلان 🎬 (1X)'}</span>
                    </button>
                  </div>
                ) : challenge.isDirectAdAction ? (
                  /* 4. Direct Ad quest button */
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 w-full">
                    <span className="text-[11px] text-slate-400">
                      شاهد الإعلان بالكامل لزيادة تقدم هذا التحدي فوراً
                    </span>

                    <button
                      onClick={() => handleWatchDirectAd(challenge.id)}
                      disabled={isLoadingAd}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{isAdWorking ? 'جارٍ تشغيل الإعلان...' : (challenge.directAdLabel || 'مشاهدة إعلان 🎬')}</span>
                    </button>
                  </div>
                ) : (
                  /* 5. In-progress instructions */
                  <div className="flex items-center justify-between gap-2 w-full text-xs text-slate-400 py-1">
                    <span>
                      {challenge.id === 'quest_win_streak_5'
                        ? '🔥 اكسب 5 مباريات متتالية دون تعادل أو هزيمة لنيل الجائزة الملكية'
                        : 'خض مباريات الدوري والكأس لإكمال هذا التحدي'}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{progressPercent}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
