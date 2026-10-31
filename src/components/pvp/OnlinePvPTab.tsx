import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Swords,
  Trophy,
  Shield,
  Zap,
  Users,
  Copy,
  Check,
  Share2,
  Play,
  LogOut,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ChevronRight,
  Flame,
  Medal,
  Search,
  Bot,
  Calendar,
  Award
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import {
  challengeClient,
  ChallengeRoomState,
  ChallengeParticipant,
  DailyCoachRankEntry,
  getLocalChallengeHistory,
  clearLocalChallengeHistory,
  ChallengeHistoryItem,
  getOrCreatePlayerId
} from '../../services/onlineChallengeService';
import { OnlineMatchArena } from './OnlineMatchArena';

export const OnlinePvPTab: React.FC = () => {
  const { userClub, manager } = useGame();
  const { user } = useAuth();

  const [activeView, setActiveView] = useState<'lobby' | 'room' | 'playing'>('lobby');
  const [activeLobbyTab, setActiveLobbyTab] = useState<'challenges' | 'ranking'>('challenges');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [roomState, setRoomState] = useState<ChallengeRoomState | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Matchmaking (Random Online Match) state
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [queueSize, setQueueSize] = useState(0);

  // Daily Ranking state (Top 50 coaches in RAM)
  const [dailyRanking, setDailyRanking] = useState<DailyCoachRankEntry[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(false);

  const playerId = getOrCreatePlayerId();
  const isHost = roomState?.host?.playerId === playerId;

  // Search Timer
  useEffect(() => {
    let timer: any;
    if (isSearchingMatch) {
      timer = setInterval(() => {
        setSearchSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSearchSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isSearchingMatch]);

  // Load local challenge history on mount
  useEffect(() => {
    setHistory(getLocalChallengeHistory());
  }, [activeView]);

  // Load daily ranking function
  const loadDailyRanking = useCallback(async () => {
    setIsLoadingRanking(true);
    try {
      const list = await challengeClient.fetchDailyRanking();
      setDailyRanking(list);
    } catch (err) {
      console.warn('[OnlinePvPTab] Failed to load daily ranking:', err);
    } finally {
      setIsLoadingRanking(false);
    }
  }, []);

  // Fetch ranking when switching to the ranking tab (and when coming back from a match)
  useEffect(() => {
    if (activeView === 'lobby' && activeLobbyTab === 'ranking') loadDailyRanking();
  }, [loadDailyRanking, activeLobbyTab, activeView]);

  useEffect(() => {
    loadDailyRanking();
  }, [loadDailyRanking]);

  // Subscribe to connection status and incoming WebSocket events
  useEffect(() => {
    const unsubStatus = challengeClient.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubMessages = challengeClient.subscribeMessages((data: any) => {
      if (data.type === 'room_created') {
        setIsSearchingMatch(false);
        setRoomState(data.room);
        setActiveView('room');
        setFeedback({ type: 'success', message: `تم إنشاء غرفة التحدي بكود: ${data.code}` });
      } else if (data.type === 'room_joined') {
        setIsSearchingMatch(false);
        setRoomState(data.room);
        setActiveView('room');
        setFeedback({ type: 'success', message: 'تم الانضمام إلى غرفة التحدي بنجاح!' });
      } else if (data.type === 'random_match_matched') {
        setIsSearchingMatch(false);
        if (data.room) setRoomState(data.room);
        setActiveView('playing');
        setFeedback(data.isBot
          ? {
              type: 'success',
              message: data.botReason === 'timeout'
                ? 'مفيش مدرب حقيقي متاح دلوقتي، فبدأنا مباراة تدريبية ضد مدرب آلي. المباريات التدريبية مش بتحسب في الترتيب اليومي.'
                : 'بدأت مباراة تدريبية ضد مدرب آلي (مش بتحسب في الترتيب اليومي).'
            }
          : {
              type: 'success',
              message: `لقينا منافس حقيقي! [${data.opponent?.playerName || 'المدرب'} - ${data.opponent?.clubName || 'المنافس'}] - انطلقت المباراة الآن!`
            });
      } else if (data.type === 'matchmaking_searching') {
        setIsSearchingMatch(true);
        if (typeof data.queueSize === 'number') setQueueSize(data.queueSize);
      } else if (data.type === 'matchmaking_cancelled') {
        setIsSearchingMatch(false);
      } else if (data.type === 'daily_ranking' || data.type === 'daily_ranking_updated') {
        if (Array.isArray(data.ranking)) {
          setDailyRanking(data.ranking);
        }
      } else if (data.type === 'opponent_joined') {
        setRoomState(data.room);
        setFeedback({ type: 'success', message: `انضم المنافس [${data.guest?.clubName || 'المنافس'}] إلى الغرفة!` });
      } else if (data.type === 'opponent_ready_changed') {
        setRoomState(data.room);
      } else if (data.type === 'sync_state') {
        setRoomState(data.room);
      } else if (data.type === 'match_started') {
        setIsSearchingMatch(false);
        if (data.room) setRoomState(data.room);
        setActiveView('playing');
      } else if (data.type === 'opponent_left') {
        setFeedback({ type: 'error', message: data.message || 'غادر المنافس غرفة التحدي.' });
        setRoomState(null);
        setActiveView('lobby');
      } else if (data.type === 'error') {
        setFeedback({ type: 'error', message: data.message || 'حدث خطأ في الاتصال.' });
        setLoadingAction(null);
        setIsSearchingMatch(false);
      }
    });

    // Auto-connect to WebSocket relay on mount
    challengeClient.connect().catch(() => {});

    return () => {
      unsubStatus();
      unsubMessages();
      // leaving the page must never leave us sitting in the matchmaking queue
      challengeClient.cancelMatchmaking();
    };
  }, []);

  // Prepare current user's participant data
  const getParticipantPayload = useCallback(() => {
    const squad = Array.isArray(userClub?.players) ? userClub.players : [];
    const ovr = (p: any) => Number(p?.overallRating ?? p?.rating ?? 65) || 65;

    // The real XI and bench the coach picked (falls back to the best players if no lineup is saved)
    const byId = new Map(squad.map(p => [p.id, p]));
    const startIds: string[] = Array.isArray(userClub?.tactics?.startingPlayerIds) ? userClub!.tactics!.startingPlayerIds : [];
    const benchIds: string[] = Array.isArray(userClub?.tactics?.benchPlayerIds) ? userClub!.tactics!.benchPlayerIds : [];
    let starters = startIds.map(id => byId.get(id)).filter(Boolean) as typeof squad;
    if (starters.length < 11) {
      const rest = [...squad].filter(p => !starters.includes(p)).sort((a, b) => ovr(b) - ovr(a));
      starters = [...starters, ...rest].slice(0, 11);
    }
    let bench = benchIds.map(id => byId.get(id)).filter(p => p && !starters.includes(p)) as typeof squad;
    if (bench.length < 7) {
      const rest = [...squad].filter(p => !starters.includes(p) && !bench.includes(p)).sort((a, b) => ovr(b) - ovr(a));
      bench = [...bench, ...rest].slice(0, 9);
    }
    const clubRating = Math.round(
      starters.length > 0 ? starters.reduce((sum, p) => sum + ovr(p), 0) / starters.length : 70
    );

    // Big base64 photos would bloat every room document (1MB limit) - only share light URLs
    const storedCoachPhoto = typeof window !== 'undefined' ? localStorage.getItem('anta_elmodareb_coach_photo_v1') : null;
    const candidate = storedCoachPhoto || user?.photoURL || '';
    const coachAvatar = candidate && candidate.length < 4000 ? candidate : (user?.photoURL || '');

    return {
      playerName: manager?.name || user?.displayName || 'المدرب',
      avatar: coachAvatar,
      clubName: userClub?.name || 'نادي التحدي',
      clubLogo: '',
      primaryColor: userClub?.primaryColor || '#10b981',
      clubRating,
      tactics: userClub?.tactics || {
        formation: '4-3-3',
        mentality: 'balanced',
        passingStyle: 'short',
        pressingIntensity: 'balanced',
        tempo: 'balanced',
      },
      squadSummary: starters.map((p) => ({ id: p.id, name: p.name, position: p.position, rating: ovr(p) })),
      benchSummary: bench.map((p) => ({ id: p.id, name: p.name, position: p.position, rating: ovr(p) })),
    };
  }, [userClub, manager, user]);

  // Handle Start Random Matchmaking
  const handleStartRandomMatch = async () => {
    if (!userClub) {
      setFeedback({ type: 'error', message: 'يجب أن تقود نادياً أولاً لتتمكن من خوض التحدي العشوائي.' });
      return;
    }

    try {
      setFeedback(null);
      setIsSearchingMatch(true);
      await challengeClient.findRandomMatch(getParticipantPayload());
    } catch (err: any) {
      setIsSearchingMatch(false);
      setFeedback({ type: 'error', message: err?.message || 'تعذر بدء البحث العشوائي. تحقق من الاتصال.' });
    }
  };

  // Handle Cancel Matchmaking
  const handleCancelMatchmaking = () => {
    challengeClient.cancelMatchmaking();
    setIsSearchingMatch(false);
  };

  // Handle Request Bot Match (Instant test if waiting in queue)
  const handlePlayWithBot = () => {
    challengeClient.requestBotMatch(getParticipantPayload());
  };

  // Handle Create Room
  const handleCreateRoom = async () => {
    if (!userClub) {
      setFeedback({ type: 'error', message: 'يجب أن تقود نادياً أولاً لتتمكن من إنشاء التحدي.' });
      return;
    }

    try {
      setLoadingAction('create');
      setFeedback(null);
      await challengeClient.createRoom(getParticipantPayload());
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'تعذر إنشاء غرفة التحديات. يرجى المحاولة ثانية.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setFeedback({ type: 'error', message: 'يرجى كتابة كود التحدي المكوّن من 6 خانات.' });
      return;
    }

    if (!userClub) {
      setFeedback({ type: 'error', message: 'يجب أن تقود نادياً أولاً لتتمكن من الانضمام للتحدي.' });
      return;
    }

    try {
      setLoadingAction('join');
      setFeedback(null);
      await challengeClient.joinRoom(cleanCode, getParticipantPayload());
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'فشل الانضمام للغرفة. تحقق من الكود والاتصال.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle Copy Room Code
  const handleCopyCode = () => {
    if (!roomState?.code) return;
    navigator.clipboard.writeText(roomState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handle WhatsApp / Share Code
  const handleShareCode = () => {
    if (!roomState?.code) return;
    const shareText = `⚽ يتحدّاك المدرب [${manager?.name || 'صديقك'}] في مباراة مباشرة وحماسية بلعبة "أنت المدرب"!\nكود الغرفة: ${roomState.code}\nادخل اللعبة واضغط "مباريات أونلاين" ثم اكتب الكود لتحديه فوراً!`;

    if (navigator.share) {
      navigator.share({
        title: 'تحدي أونلاين - أنت المدرب',
        text: shareText,
      }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    }
  };

  // Handle Toggle Ready
  const handleToggleReady = () => {
    if (!roomState?.code) return;
    const nextReady = !isReady;
    setIsReady(nextReady);
    challengeClient.toggleReady(roomState.code, nextReady);
  };

  // Handle Start Match (Kick-off)
  const handleStartMatch = () => {
    if (!roomState?.code) return;
    challengeClient.startMatch(roomState.code, {
      minute: 0,
      homeScore: 0,
      awayScore: 0,
    });
  };

  // Handle Leave Room
  const handleLeaveRoom = () => {
    if (roomState?.code) {
      challengeClient.leaveRoom(roomState.code);
    }
    setRoomState(null);
    setIsReady(false);
    setActiveView('lobby');
  };

  // Handle Clear Local History
  const handleClearHistory = () => {
    clearLocalChallengeHistory();
    setHistory([]);
    setFeedback({ type: 'success', message: 'تم مسح سجل التحديات المحلية بنجاح.' });
  };

  // ==========================================
  // VIEW 1: ACTIVE LIVE MATCH ARENA
  // ==========================================
  if (activeView === 'playing' && roomState) {
    const myParticipant = isHost ? roomState.host : (roomState.guest || roomState.host);
    const opponentParticipant = isHost ? (roomState.guest || roomState.host) : roomState.host;

    return (
      <OnlineMatchArena
        roomCode={roomState.code}
        isHost={isHost}
        myParticipant={myParticipant}
        opponentParticipant={opponentParticipant}
        onExitMatch={() => {
          challengeClient.leaveRoom(roomState.code);
          setRoomState(null);
          setIsReady(false);
          setActiveView('lobby');
        }}
      />
    );
  }

  // ==========================================
  // VIEW 2: ROOM LOBBY (WAITING FOR OPPONENT)
  // ==========================================
  if (activeView === 'room' && roomState) {
    const hostData = roomState.host;
    const guestData = roomState.guest;
    const hasOpponent = !!guestData;

    return (
      <div className="space-y-6 max-w-3xl mx-auto py-6 px-4" dir="rtl" id="online-pvp-room-container">
        {/* ROOM TOP HEADER */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white">غرفة التحدي المباشر</h2>
            </div>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-300 text-slate-400 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              مغادرة الغرفة
            </button>
          </div>

          {/* ROOM CODE DISPLAY CARD */}
          <div className="bg-slate-950/80 border-2 border-emerald-500/40 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              كود الغرفة لمشاركته مع صديقك:
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="font-mono text-3xl sm:text-5xl font-black text-emerald-400 tracking-widest bg-slate-900/90 px-6 py-2 rounded-2xl border border-emerald-500/30 select-all shadow-inner">
                {roomState.code}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ الكود'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareCode}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Share2 className="w-4 h-4" />
                <span>إرسال عبر واتساب أو التطبيقات</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              {hasOpponent
                ? '🟢 المنافس متصل الآن في الغرفة! استعدوا لبدء المباراة.'
                : '⏳ في انتظار انضمام المنافس عبر كتابة هذا الكود...'}
            </p>
          </div>
        </div>

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center gap-2.5 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-red-500/15 border-red-500/40 text-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* TEAMS LINEUP COMPARISON */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* HOST CARD */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                المستضيف (Host)
              </span>
              <span className="text-xs font-bold text-slate-400">
                تشكيل: {hostData.tactics?.formation || '4-3-3'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-xl shadow-inner">
                {hostData.clubName.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-base font-black text-white">{hostData.clubName}</h4>
                <p className="text-xs text-slate-400">المدرب: {hostData.playerName}</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300 font-bold">
                    قوة الفريق: {hostData.clubRating} OVR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* GUEST CARD */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                الضيف (Guest)
              </span>
              <span className="text-xs font-bold text-slate-400">
                {guestData ? `تشكيل: ${guestData.tactics?.formation || '4-3-3'}` : 'في الانتظار'}
              </span>
            </div>

            {guestData ? (
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border-2 border-blue-500/40 flex items-center justify-center text-blue-300 font-black text-xl shadow-inner">
                  {guestData.clubName.charAt(0)}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-base font-black text-white">{guestData.clubName}</h4>
                  <p className="text-xs text-slate-400">المدرب: {guestData.playerName}</p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-blue-300 font-bold">
                      قوة الفريق: {guestData.clubRating} OVR
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Clock className="w-5 h-5 animate-spin" />
                </div>
                <p className="text-xs text-slate-400 font-bold">
                  شارك الكود مع صديقك ليظهر هنا فوراً
                </p>
              </div>
            )}
          </div>
        </div>

        {/* READY & START BUTTONS */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 text-center space-y-3 shadow-xl">
          {hasOpponent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>الفريقان متصلان بنجاح! حان وقت انطلاق التحدي.</span>
              </div>

              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartMatch}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>بدء المباراة المباشرة الآن ⚡</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-800/80 rounded-2xl text-xs text-slate-300 font-bold">
                  في انتظار قيام المستضيف (Host) بالضغط على بدء المباراة...
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400 text-xs py-2 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>قم بإعطاء كود الغرفة لصديقك لبدء المباراة فور انضمامه.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: MAIN LOBBY (CREATE / JOIN / HISTORY)
  // ==========================================
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4" dir="rtl" id="online-pvp-lobby-container">
      {/* HEADER WITH LIVE WEBSOCKET STATUS */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 backdrop-blur-md relative overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">تحديات أونلاين المباشرة</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                العب مباريات حية وتنافسية ضد أصدقائك عبر كود الغرفة والـWebSocket
              </p>
            </div>
          </div>

          {/* CONNECTION PILL */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-bold">
            {connectionStatus === 'connected' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300">متصل بالخادم المباشر</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300">جارِ الاتصال بالخادم...</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-red-300">غير متصل</span>
                <button
                  type="button"
                  onClick={() => challengeClient.connect()}
                  className="mr-1 text-slate-300 hover:text-white underline"
                >
                  إعادة
                </button>
              </>
            )}
          </div>
        </div>

        {/* GUARANTEE BADGE */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>اتصال حي ومباشر وفوري لمباريات وتحديات الأصدقاء أونلاين على الأندرويد والويب</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>تحديثات الترتيب لحظية في ذاكرة الخادم السريع (RAM)</span>
          </div>
        </div>

        {/* LOBBY NAVIGATION TABS */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveLobbyTab('challenges')}
            className={`flex-1 py-2.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeLobbyTab === 'challenges'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>المباريات والتحديات ⚔️</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveLobbyTab('ranking');
              loadDailyRanking();
            }}
            className={`flex-1 py-2.5 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeLobbyTab === 'ranking'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>الترتيب اليومي للمدربين (Top 50) 🏆</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between gap-3 transition-all shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-red-500/15 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* MATCHMAKING ACTIVE SEARCH OVERLAY / MODAL */}
      {isSearchingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 relative overflow-hidden">
            {/* Ambient pulse */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-ping opacity-75" />
              <span className="absolute inset-2 rounded-full border-2 border-dashed border-emerald-400 animate-spin" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                <Search className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">جارِ البحث عن منافس أونلاين...</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                بندوّر دلوقتي على مدرب حقيقي تاني بيدوّر على مباراة. لو ملقيناش حد خلال حوالي 18 ثانية هنعرض عليك مباراة تدريبية ضد مدرب آلي.
              </p>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400">وقت البحث:</span>
                <p className="font-mono font-black text-emerald-400 text-base">{searchSeconds} ثانية</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400">حجم الطابور:</span>
                <p className="font-mono font-black text-blue-400 text-base">{Math.max(1, queueSize)} لاعب</p>
              </div>
            </div>

            {/* Fallback Solo Bot Option if waiting */}
            {searchSeconds >= 6 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 animate-in fade-in">
                <p className="text-[11px] text-amber-300 font-bold">
                  مش عايز تستنى؟ ممكن تلعب مباراة تدريبية ضد مدرب آلي (مش بتحسب في الترتيب).
                </p>
                <button
                  type="button"
                  onClick={handlePlayWithBot}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
                >
                  <Bot className="w-4 h-4" />
                  <span>ابدأ مباراة تدريبية دلوقتي 🤖</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleCancelMatchmaking}
              className="w-full py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors border border-slate-700"
            >
              إلغاء البحث والعودة
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CHALLENGES & RANDOM MATCHMAKING */}
      {/* ========================================================================= */}
      {activeLobbyTab === 'challenges' && (
        <div className="space-y-6">
          {/* HERO CARD: RANDOM ONLINE MATCH (تحدي عشوائي) */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-teal-950/60 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="space-y-2 max-w-lg">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                  <Flame className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                  <span>ميزة جديدة: تحدي عشوائي بدون انتظار أصدقاء</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">تحدي عشوائي مباشر (Random Match)</h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ادخل نظام الـ Matchmaking فوراً للبحث عن أي لاعب Online متاح. عند العثور على منافس تبدأ المباراة تلقائياً دون أي حد لعدد المباريات!
                </p>
              </div>

              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleStartRandomMatch}
                  disabled={isSearchingMatch}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-98 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>دخول التحدي العشوائي الآن ⚡</span>
                </button>
              </div>
            </div>
          </div>

          {/* DUAL ACTION CARDS (CREATE OR JOIN WITH CODE - KEEPING EXISTING ROOMS SYSTEM 100% INTACT) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 1: CREATE CHALLENGE ROOM */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">إنشاء غرفة لصديق (Room)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  أنشئ غرفة خاصة واستلم كوداً سداسياً لمشاركته مع صديقك عبر واتساب للعب ضده مباشرة.
                </p>

                {userClub && (
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between text-slate-300 font-bold">
                      <span>نادي التحدي:</span>
                      <span className="text-emerald-400">{userClub.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>المدرب:</span>
                      <span>{manager?.name || 'المدرب الحالي'}</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={loadingAction === 'create'}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loadingAction === 'create' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>إنشاء كود الغرفة والانتظار ⚡</span>
              </button>
            </div>

            {/* CARD 2: JOIN CHALLENGE ROOM */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-white">الانضمام بكود الغرفة</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  إذا أرسل لك صديقك كود الغرفة، اكتبه هنا للدخول في المواجهة المباشرة معه.
                </p>

                <form onSubmit={handleJoinRoom} className="space-y-3 pt-1">
                  <div>
                    <label htmlFor="challenge-room-code-input" className="block text-xs font-bold text-slate-300 mb-1.5">
                      كود الغرفة (6 خانات):
                    </label>
                    <input
                      id="challenge-room-code-input"
                      type="text"
                      maxLength={6}
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="مثال: 7K4B2P"
                      className="w-full bg-slate-950/80 border border-slate-700 focus:border-blue-500 rounded-2xl px-4 py-3 text-center text-lg font-mono font-black text-white tracking-widest outline-none transition-all placeholder:text-slate-600 placeholder:font-sans placeholder:text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loadingAction === 'join' || !inputCode.trim()}
                    className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 disabled:opacity-50 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition-all"
                  >
                    {loadingAction === 'join' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span>الانضمام للمباراة 🎯</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCAL MATCH HISTORY */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>سجل التحديات المحلية السابقة</span>
              </div>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  مسح السجل
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 rounded-xl font-bold ${
                          item.result === 'win'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : item.result === 'draw'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {item.result === 'win' ? 'فوز 🟢' : item.result === 'draw' ? 'تعادل 🟡' : 'خسارة 🔴'}
                      </span>

                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-sm">
                          {item.myClub} <span className="text-emerald-400 font-mono">{item.myScore}</span> -{' '}
                          <span className="text-blue-400 font-mono">{item.opponentScore}</span> {item.opponentClub}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          المنافس: {item.opponentName} • كود: {item.roomCode}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(item.timestamp).toLocaleDateString('ar-EG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 text-slate-400">
                <Shield className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-bold">لا يوجد سجل تحديات سابقة على هذا الجهاز حتى الآن.</p>
                <p className="text-[11px] text-slate-500">
                  أنشئ تحدياً أو ادخل التحدي العشوائي لتسجيل أول مواجهة تنافسية حية!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY COACH RANKING (أفضل 50 مدرب - RAM Storage Only) */}
      {/* ========================================================================= */}
      {activeLobbyTab === 'ranking' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* DAILY RANKING HEADER CARD */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">الترتيب اليومي للمدربين (Top 50)</h3>
                  <p className="text-xs text-slate-400">
                    يعتمد الترتيب على عدد مرات الفوز اليوم فقط • يُستخدم عدد المباريات كـ Tie-Breaker
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadDailyRanking}
                disabled={isLoadingRanking}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRanking ? 'animate-spin' : ''}`} />
                <span>تحديث الترتيب</span>
              </button>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 flex items-center gap-2 text-xs text-slate-300">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                كل مباراة مكتملة ضد مدرب حقيقي (تحدي عشوائي أو غرفة مع صديق) بتتحسب في الترتيب اليومي: الفوز 3 نقاط والتعادل نقطة. المباريات التدريبية ضد المدرب الآلي مش بتتحسب.
              </span>
            </div>
          </div>

          {/* RANKING LIST TABLE */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
            {isLoadingRanking ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400">جارِ جلب قائمة أفضل 50 مدرب لليوم...</p>
              </div>
            ) : dailyRanking.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold">
                      <th className="py-3 px-3 text-center">#</th>
                      <th className="py-3 px-3">المدرب والنادي</th>
                      <th className="py-3 px-2 text-center">القوة</th>
                      <th className="py-3 px-3 text-center text-amber-300">نقاط</th>
                      <th className="py-3 px-3 text-center text-emerald-400">فوز (W)</th>
                      <th className="py-3 px-2 text-center text-blue-400">تعادل (D)</th>
                      <th className="py-3 px-2 text-center text-red-400">خسارة (L)</th>
                      <th className="py-3 px-3 text-center text-slate-300">المباريات (M)</th>
                      <th className="py-3 px-3 text-center text-amber-400">نسبة الفوز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {dailyRanking.map((coach) => {
                      const isMe = coach.playerId === playerId;
                      const winRate = coach.matchesPlayed > 0 ? Math.round((coach.wins / coach.matchesPlayed) * 100) : 0;

                      return (
                        <tr
                          key={coach.playerId}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            isMe ? 'bg-emerald-500/10 border-l-4 border-emerald-500' : ''
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3 px-3 text-center">
                            {coach.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 text-sm shadow-sm">
                                🥇
                              </span>
                            ) : coach.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 font-black border border-slate-400/40 text-sm shadow-sm">
                                🥈
                              </span>
                            ) : coach.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 font-black border border-amber-700/40 text-sm shadow-sm">
                                🥉
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-slate-400">#{coach.rank}</span>
                            )}
                          </td>

                          {/* Coach & Club */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              {coach.avatar ? (
                                <img
                                  src={coach.avatar}
                                  alt={coach.coachName}
                                  className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-300">
                                  {coach.coachName.charAt(0)}
                                </div>
                              )}
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black text-white text-xs sm:text-sm">
                                    {coach.coachName}
                                  </span>
                                  {isMe && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                      أنت
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400">{coach.clubName}</p>
                              </div>
                            </div>
                          </td>

                          {/* Club Rating */}
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold text-[11px]">
                              {coach.clubRating}
                            </span>
                          </td>

                          {/* Points */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-black text-amber-300 text-sm">{coach.points ?? coach.wins * 3 + coach.draws}</span>
                          </td>

                          {/* Wins */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-black text-emerald-400 text-sm">{coach.wins}</span>
                          </td>

                          {/* Draws */}
                          <td className="py-3 px-2 text-center font-mono text-blue-400 font-bold">
                            {coach.draws}
                          </td>

                          {/* Losses */}
                          <td className="py-3 px-2 text-center font-mono text-red-400 font-bold">
                            {coach.losses}
                          </td>

                          {/* Matches Played */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                            {coach.matchesPlayed}
                          </td>

                          {/* Win Rate */}
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-black text-amber-400">{winRate}%</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3 text-slate-400">
                <Trophy className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-bold text-slate-300">لا يوجد متصدرين في الترتيب اليومي حتى الآن!</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  كن أول مدرب يظفر بالصدارة اليوم. العب مباراة تحدي عشوائي أو أنشئ غرفة مع صديقك الآن!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveLobbyTab('challenges');
                    handleStartRandomMatch();
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>خوض مباراة لتسجيل اسمك ⚡</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
