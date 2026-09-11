import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import {
  challengeClient,
  ChallengeRoomState,
  ChallengeParticipant,
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
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [roomState, setRoomState] = useState<ChallengeRoomState | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const playerId = getOrCreatePlayerId();
  const isHost = roomState?.host?.playerId === playerId;

  // Load local challenge history on mount
  useEffect(() => {
    setHistory(getLocalChallengeHistory());
  }, [activeView]);

  // Subscribe to connection status and incoming WebSocket events
  useEffect(() => {
    const unsubStatus = challengeClient.subscribeStatus((status) => {
      setConnectionStatus(status);
    });

    const unsubMessages = challengeClient.subscribeMessages((data: any) => {
      if (data.type === 'room_created') {
        setRoomState(data.room);
        setActiveView('room');
        setFeedback({ type: 'success', message: `تم إنشاء غرفة التحدي بكود: ${data.code}` });
      } else if (data.type === 'room_joined') {
        setRoomState(data.room);
        setActiveView('room');
        setFeedback({ type: 'success', message: 'تم الانضمام إلى غرفة التحدي بنجاح!' });
      } else if (data.type === 'opponent_joined') {
        setRoomState(data.room);
        setFeedback({ type: 'success', message: `انضم المنافس [${data.guest?.clubName || 'المنافس'}] إلى الغرفة!` });
      } else if (data.type === 'opponent_ready_changed') {
        setRoomState(data.room);
      } else if (data.type === 'sync_state') {
        setRoomState(data.room);
      } else if (data.type === 'match_started') {
        if (data.room) setRoomState(data.room);
        setActiveView('playing');
      } else if (data.type === 'opponent_left') {
        setFeedback({ type: 'error', message: data.message || 'غادر المنافس غرفة التحدي.' });
        setRoomState(null);
        setActiveView('lobby');
      } else if (data.type === 'error') {
        setFeedback({ type: 'error', message: data.message || 'حدث خطأ في الاتصال.' });
        setLoadingAction(null);
      }
    });

    // Auto-connect to WebSocket relay on mount
    challengeClient.connect().catch(() => {});

    return () => {
      unsubStatus();
      unsubMessages();
    };
  }, []);

  // Prepare current user's participant data
  const getParticipantPayload = useCallback(() => {
    const squad = Array.isArray(userClub?.players) ? userClub.players : [];
    const clubRating = Math.round(
      squad.length > 0
        ? squad.slice(0, 11).reduce((sum, p) => sum + (p.rating || 65), 0) / Math.min(11, squad.length)
        : 70
    );

    return {
      playerName: manager?.name || user?.displayName || 'المدرب',
      clubName: userClub?.name || 'نادي التحدي',
      clubRating,
      tactics: userClub?.tactics || {
        formation: '4-3-3',
        mentality: 'balanced',
        passingStyle: 'short',
        pressingIntensity: 'balanced',
        tempo: 'balanced',
      },
      squadSummary: squad.slice(0, 11).map((p) => ({
        id: p.id,
        name: p.name,
        position: p.position,
        rating: p.rating || 65,
      })),
    };
  }, [userClub, manager, user]);

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
      setFeedback({ type: 'error', message: 'تعذر الاتصال بخادم التحديات. يرجى المحاولة ثانية.' });
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
      setFeedback({ type: 'error', message: 'فشل الانضمام للغرفة. تحقق من الكود والاتصال.' });
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
        <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>الاتصال حي ومباشر عبر الذاكرة المؤقتة (RAM Relay) بدون استهلاك أو تخزين على قواعد البيانات</span>
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

      {/* DUAL ACTION CARDS (CREATE OR JOIN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CARD 1: CREATE CHALLENGE */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">إنشاء تحدي جديد</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              قم بإنشاء غرفة تحدي واستلم كوداً خاصاً لتشاركه مع صديقك عبر واتساب أو أي تطبيق.
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
            <span>إنشاء كود التحدي والانتظار ⚡</span>
          </button>
        </div>

        {/* CARD 2: JOIN CHALLENGE */}
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">الانضمام لتحدي صديق</h3>
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
              أنشئ تحدياً أو انضم لصديقك لتسجيل أول مواجهة تنافسية حية!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
