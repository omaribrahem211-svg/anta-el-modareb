import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  Trophy,
  Shield,
  Zap,
  Activity,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Sliders,
  Award,
  CircleDot
} from 'lucide-react';
import {
  challengeClient,
  ChallengeParticipant,
  saveLocalChallengeResult
} from '../../services/onlineChallengeService';

export interface MatchEventItem {
  id: string;
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'save' | 'shot_missed' | 'tactic_change';
  team: 'host' | 'guest';
  scorerName?: string;
  assistName?: string;
  textAr: string;
}

export interface MatchLiveState {
  minute: number;
  homeScore: number;
  awayScore: number;
  status: 'playing' | 'halftime' | 'finished';
  events: MatchEventItem[];
  stats: {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
    homeFouls: number;
    awayFouls: number;
    homeCorners: number;
    awayCorners: number;
  };
  momentum: number; // -100 (away dominant) to +100 (home dominant)
}

interface OnlineMatchArenaProps {
  roomCode: string;
  isHost: boolean;
  myParticipant: ChallengeParticipant;
  opponentParticipant: ChallengeParticipant;
  onExitMatch: () => void;
}

export const OnlineMatchArena: React.FC<OnlineMatchArenaProps> = ({
  roomCode,
  isHost,
  myParticipant,
  opponentParticipant,
  onExitMatch,
}) => {
  const host = isHost ? myParticipant : opponentParticipant;
  const guest = isHost ? opponentParticipant : myParticipant;

  const [matchState, setMatchState] = useState<MatchLiveState>({
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    status: 'playing',
    events: [
      {
        id: 'start',
        minute: 0,
        type: 'tactic_change',
        team: 'host',
        textAr: '🏁 الحكم يطلق صفارة البداية، وتحدي التكتيك يبدأ الآن!',
      },
    ],
    stats: {
      homePossession: 50,
      awayPossession: 50,
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homeFouls: 0,
      awayFouls: 0,
      homeCorners: 0,
      awayCorners: 0,
    },
    momentum: 0,
  });

  const [myMentality, setMyMentality] = useState<'defensive' | 'balanced' | 'attacking' | 'all_out_attack'>('balanced');
  const [opponentBanner, setOpponentBanner] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  const commentaryEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<MatchLiveState>(matchState);
  stateRef.current = matchState;

  // Auto-scroll commentary feed
  useEffect(() => {
    commentaryEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [matchState.events.length]);

  // Handle incoming WebSocket match events
  useEffect(() => {
    const unsub = challengeClient.subscribeMessages((data: any) => {
      if (data.type === 'match_tick') {
        if (data.matchState) {
          setMatchState(data.matchState);
        }
      } else if (data.type === 'match_ended') {
        if (data.finalMatchState) {
          setMatchState(data.finalMatchState);
        }
      } else if (data.type === 'opponent_in_game_tactics') {
        const mentalityArabic =
          data.changes?.mentality === 'attacking' ? 'هجومي 🔥' :
          data.changes?.mentality === 'all_out_attack' ? 'هجوم كاسح ⚡' :
          data.changes?.mentality === 'defensive' ? 'دفاعي محكم 🛡️' : 'متوازن ⚖️';

        setOpponentBanner(`قام المنافس بتعديل الخطة إلى: ${mentalityArabic} (الدقيقة ${data.minute}')`);
        setTimeout(() => setOpponentBanner(null), 5000);
      } else if (data.type === 'rematch_requested') {
        setRematchRequested(true);
      } else if (data.type === 'rematch_accepted') {
        // Reset match for replay
        setRematchRequested(false);
        setRematchWaiting(false);
        setSavedLocally(false);
        setMatchState({
          minute: 0,
          homeScore: 0,
          awayScore: 0,
          status: 'playing',
          events: [
            {
              id: 'rematch_start',
              minute: 0,
              type: 'tactic_change',
              team: 'host',
              textAr: '🔥 إعادة التحدي! بدأت صافرة المباراة الجديدة بحماس مضاعف!',
            },
          ],
          stats: {
            homePossession: 50,
            awayPossession: 50,
            homeShots: 0,
            awayShots: 0,
            homeShotsOnTarget: 0,
            awayShotsOnTarget: 0,
            homeFouls: 0,
            awayFouls: 0,
            homeCorners: 0,
            awayCorners: 0,
          },
          momentum: 0,
        });
      } else if (data.type === 'opponent_left') {
        setOpponentBanner('غادر المنافس المباراة.');
      }
    });

    return () => unsub();
  }, []);

  // Save to client's local storage upon match completion
  useEffect(() => {
    if (matchState.status === 'finished' && !savedLocally) {
      setSavedLocally(true);
      const myScore = isHost ? matchState.homeScore : matchState.awayScore;
      const oppScore = isHost ? matchState.awayScore : matchState.homeScore;
      const result = myScore > oppScore ? 'win' : myScore === oppScore ? 'draw' : 'loss';

      saveLocalChallengeResult({
        roomCode,
        opponentName: opponentParticipant.playerName,
        opponentClub: opponentParticipant.clubName,
        myClub: myParticipant.clubName,
        myScore,
        opponentScore: oppScore,
        result,
        eventsCount: matchState.events.length,
      });
    }
  }, [matchState.status, savedLocally, isHost, matchState.homeScore, matchState.awayScore, opponentParticipant, myParticipant, roomCode, matchState.events.length]);

  // Host-driven match engine ticker
  useEffect(() => {
    if (!isHost || matchState.status === 'finished') return;

    const hostStrength = host.clubRating || 70;
    const guestStrength = guest.clubRating || 70;

    const interval = setInterval(() => {
      setMatchState((prev) => {
        if (prev.status === 'finished') return prev;

        const nextMinute = prev.minute + 1;
        const newEvents = [...prev.events];
        let nextHomeScore = prev.homeScore;
        let nextAwayScore = prev.awayScore;
        const nextStats = { ...prev.stats };

        // Calculate dynamic momentum and chances
        const strengthDiff = hostStrength - guestStrength;
        const baseHomeChance = 0.08 + (strengthDiff > 0 ? 0.03 : -0.02);
        const baseAwayChance = 0.08 + (strengthDiff < 0 ? 0.03 : -0.02);

        const roll = Math.random();

        // 1. Home Attack Event
        if (roll < baseHomeChance) {
          nextStats.homeShots += 1;
          const onTarget = Math.random() < 0.6;
          if (onTarget) {
            nextStats.homeShotsOnTarget += 1;
            const isGoal = Math.random() < 0.35;
            if (isGoal) {
              nextHomeScore += 1;
              newEvents.push({
                id: `ev_${nextMinute}_goal_h`,
                minute: nextMinute,
                type: 'goal',
                team: 'host',
                textAr: `⚽ هـــــــــدف! ${host.clubName} يسجل هدفاً رائعاً في الدقيقة ${nextMinute}' بعد جملة تكتيكية منظمة!`,
              });
            } else {
              newEvents.push({
                id: `ev_${nextMinute}_save_a`,
                minute: nextMinute,
                type: 'save',
                team: 'guest',
                textAr: `🧤 حارس مرمى ${guest.clubName} يتألق ببراعة وينقذ تسديدة خطيرة من مهاجم ${host.clubName}!`,
              });
            }
          } else {
            newEvents.push({
              id: `ev_${nextMinute}_miss_h`,
              minute: nextMinute,
              type: 'shot_missed',
              team: 'host',
              textAr: `💨 تسديدة قوية من لاعبي ${host.clubName} تمر بجوار القائم الأيمن!`,
            });
          }
        }
        // 2. Away Attack Event
        else if (roll < baseHomeChance + baseAwayChance) {
          nextStats.awayShots += 1;
          const onTarget = Math.random() < 0.6;
          if (onTarget) {
            nextStats.awayShotsOnTarget += 1;
            const isGoal = Math.random() < 0.35;
            if (isGoal) {
              nextAwayScore += 1;
              newEvents.push({
                id: `ev_${nextMinute}_goal_a`,
                minute: nextMinute,
                type: 'goal',
                team: 'guest',
                textAr: `⚽ هـــــــــدف! ${guest.clubName} يهز الشباك في الدقيقة ${nextMinute}' بهجمة مرتدة سريعة ومتقنة!`,
              });
            } else {
              newEvents.push({
                id: `ev_${nextMinute}_save_h`,
                minute: nextMinute,
                type: 'save',
                team: 'host',
                textAr: `🧤 تصدٍ مذهل! حارس ${host.clubName} يمنع هدفاً محققاً لـ ${guest.clubName}!`,
              });
            }
          } else {
            newEvents.push({
              id: `ev_${nextMinute}_miss_a`,
              minute: nextMinute,
              type: 'shot_missed',
              team: 'guest',
              textAr: `⚡ فرصة خطيرة لـ ${guest.clubName} لكن التسديدة تعلو العارضة بقليل!`,
            });
          }
        }
        // 3. Foul / Cards
        else if (roll > 0.94) {
          const isHomeFoul = Math.random() > 0.5;
          if (isHomeFoul) {
            nextStats.homeFouls += 1;
            if (Math.random() < 0.35) {
              newEvents.push({
                id: `ev_${nextMinute}_card_h`,
                minute: nextMinute,
                type: 'yellow_card',
                team: 'host',
                textAr: `🟨 بطاقة صفراء للاعب ${host.clubName} بعد تدخل خشن في وسط الملعب.`,
              });
            }
          } else {
            nextStats.awayFouls += 1;
            if (Math.random() < 0.35) {
              newEvents.push({
                id: `ev_${nextMinute}_card_a`,
                minute: nextMinute,
                type: 'yellow_card',
                team: 'guest',
                textAr: `🟨 بطاقة صفراء للاعب ${guest.clubName} لتعطيل هجمة واعدة.`,
              });
            }
          }
        }

        // Adjust live possession dynamically
        const possessionBias = 50 + Math.min(18, Math.max(-18, (strengthDiff * 1.5)));
        const jitter = (Math.random() - 0.5) * 4;
        const currentHomePoss = Math.min(68, Math.max(32, Math.round(possessionBias + jitter)));
        nextStats.homePossession = currentHomePoss;
        nextStats.awayPossession = 100 - currentHomePoss;

        const isFullTime = nextMinute >= 90;
        const updatedState: MatchLiveState = {
          minute: nextMinute,
          homeScore: nextHomeScore,
          awayScore: nextAwayScore,
          status: isFullTime ? 'finished' : (nextMinute === 45 ? 'halftime' : 'playing'),
          events: isFullTime ? [
            ...newEvents,
            {
              id: 'fulltime',
              minute: 90,
              type: 'tactic_change',
              team: 'host',
              textAr: `🏁 صفارة النهاية! انتهت المباراة بنتيجة [${host.clubName} ${nextHomeScore} - ${nextAwayScore} ${guest.clubName}]!`,
            }
          ] : newEvents,
          stats: nextStats,
          momentum: Math.min(100, Math.max(-100, (nextHomeScore - nextAwayScore) * 30 + (strengthDiff * 2))),
        };

        // Broadcast to guest via WebSocket relay
        challengeClient.sendMatchTick(roomCode, updatedState);

        if (isFullTime) {
          challengeClient.endMatch(roomCode, updatedState);
        }

        return updatedState;
      });
    }, 450); // 450ms per match minute (full match takes ~40s)

    return () => clearInterval(interval);
  }, [isHost, host, guest, roomCode, matchState.status]);

  // Handle in-game tactics change by either player
  const handleChangeMentality = (mentality: 'defensive' | 'balanced' | 'attacking' | 'all_out_attack') => {
    setMyMentality(mentality);
    challengeClient.sendInGameTactics(roomCode, { mentality }, matchState.minute);
  };

  const handleRequestRematch = () => {
    setRematchWaiting(true);
    challengeClient.requestRematch(roomCode);
  };

  const handleAcceptRematch = () => {
    challengeClient.acceptRematch(roomCode);
  };

  const myScore = isHost ? matchState.homeScore : matchState.awayScore;
  const oppScore = isHost ? matchState.awayScore : matchState.homeScore;
  const isWinner = matchState.status === 'finished' && myScore > oppScore;
  const isDraw = matchState.status === 'finished' && myScore === oppScore;

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-3 px-2 sm:px-4" dir="rtl" id="online-match-arena-root">
      {/* OPPONENT BANNER NOTIFICATION */}
      {opponentBanner && (
        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2 rounded-xl text-center text-sm font-bold animate-bounce flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>{opponentBanner}</span>
        </div>
      )}

      {/* TOP SCOREBOARD */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold text-slate-300">كود التحدي: {roomCode}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 font-bold text-emerald-400">
            <Clock className="w-3.5 h-3.5" />
            {matchState.status === 'finished' ? (
              <span className="text-amber-400 font-black">نهاية المباراة (FT)</span>
            ) : (
              <span>الدقيقة {matchState.minute}'</span>
            )}
          </div>
        </div>

        {/* CLUBS & LIVE SCORE */}
        <div className="grid grid-cols-3 items-center py-4 sm:py-6 gap-2 text-center">
          {/* HOST (Right side in RTL) */}
          <div className="flex flex-col items-center space-y-1">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-300 font-black text-xl shadow-lg">
              {host.clubName.charAt(0)}
            </div>
            <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-[180px]">
              {host.clubName}
            </h3>
            <span className="text-xs text-slate-400">المدرب: {host.playerName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              تقييم {host.clubRating} OVR
            </span>
          </div>

          {/* SCORE */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center justify-center gap-3 sm:gap-5 text-4xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
              <span className="text-emerald-400">{matchState.homeScore}</span>
              <span className="text-slate-500 text-2xl sm:text-3xl">-</span>
              <span className="text-blue-400">{matchState.awayScore}</span>
            </div>
            <span className="text-xs px-3 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
              {matchState.status === 'finished' ? 'انتهت' : 'مباشر الآن'}
            </span>
          </div>

          {/* GUEST (Left side in RTL) */}
          <div className="flex flex-col items-center space-y-1">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-2 border-blue-500/40 flex items-center justify-center text-blue-300 font-black text-xl shadow-lg">
              {guest.clubName.charAt(0)}
            </div>
            <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-[180px]">
              {guest.clubName}
            </h3>
            <span className="text-xs text-slate-400">المدرب: {guest.playerName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
              تقييم {guest.clubRating} OVR
            </span>
          </div>
        </div>

        {/* POSSESSION BAR */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          <div className="flex justify-between text-xs font-bold text-slate-400 px-1">
            <span className="text-emerald-400">{matchState.stats.homePossession}% استحواذ</span>
            <span className="text-blue-400">{matchState.stats.awayPossession}% استحواذ</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${matchState.stats.homePossession}%` }}
            />
            <div
              className="bg-blue-500 transition-all duration-300"
              style={{ width: `${matchState.stats.awayPossession}%` }}
            />
          </div>
        </div>
      </div>

      {/* IN-GAME TACTICS CONTROLS (Active during match) */}
      {matchState.status !== 'finished' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>تعديل العقلية التكتيكية لحظياً (ينتقل للمنافس فوراً):</span>
            </div>
            <span className="text-xs text-slate-400">عقليتك: {myMentality}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleChangeMentality('defensive')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                myMentality === 'defensive'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🛡️ دفاعي محكم
            </button>
            <button
              type="button"
              onClick={() => handleChangeMentality('balanced')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                myMentality === 'balanced'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ⚖️ تكتيك متوازن
            </button>
            <button
              type="button"
              onClick={() => handleChangeMentality('attacking')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                myMentality === 'attacking'
                  ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🔥 هجوم ضاغط
            </button>
            <button
              type="button"
              onClick={() => handleChangeMentality('all_out_attack')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                myMentality === 'all_out_attack'
                  ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ⚡ هجوم كاسح شامل
            </button>
          </div>
        </div>
      )}

      {/* LIVE COMMENTARY AND STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COMMENTARY FEED (Takes 2 cols on md) */}
        <div className="md:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col h-72">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5 text-white">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              التعليق المباشر للمباراة
            </span>
            <span>{matchState.events.length} حدث</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm">
            {matchState.events.map((event) => (
              <div
                key={event.id}
                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                  event.type === 'goal'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : event.type === 'yellow_card'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : event.type === 'save'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                    : 'bg-slate-800/70 border-slate-700/60 text-slate-300'
                }`}
              >
                <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 font-mono text-xs font-bold text-slate-300 shrink-0">
                  {event.minute}'
                </span>
                <p className="leading-snug">{event.textAr}</p>
              </div>
            ))}
            <div ref={commentaryEndRef} />
          </div>
        </div>

        {/* MATCH STATS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col justify-between">
          <h4 className="text-sm font-bold text-white pb-2 border-b border-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            إحصائيات المواجهة
          </h4>

          <div className="space-y-3 py-2 text-xs font-bold">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400">{matchState.stats.homeShots}</span>
              <span className="text-slate-400">إجمالي التسديدات</span>
              <span className="text-blue-400">{matchState.stats.awayShots}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400">{matchState.stats.homeShotsOnTarget}</span>
              <span className="text-slate-400">تسديدات على المرمى</span>
              <span className="text-blue-400">{matchState.stats.awayShotsOnTarget}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400">{matchState.stats.homeCorners}</span>
              <span className="text-slate-400">الضربات الركنية</span>
              <span className="text-blue-400">{matchState.stats.awayCorners}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400">{matchState.stats.homeFouls}</span>
              <span className="text-slate-400">الأخطاء المرتكبة</span>
              <span className="text-blue-400">{matchState.stats.awayFouls}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            تحديث فوري عبر WebSocket Relay (ذاكرة المؤقتة RAM)
          </div>
        </div>
      </div>

      {/* POST MATCH ACTIONS & CELEBRATION */}
      {matchState.status === 'finished' && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="space-y-1">
            {isWinner ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-black">
                <Trophy className="w-5 h-5 text-amber-400" />
                مبروك! لقد حققت الفوز في التحدي المباشر!
              </div>
            ) : isDraw ? (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-sm font-black">
                <Shield className="w-5 h-5 text-blue-400" />
                مباراة ملحمية انتهت بالتعادل العادل!
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-sm font-black">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                هاردلك! فاز المنافس بالمباراة، حان وقت تعديل تكتيكك!
              </div>
            )}
            <p className="text-xs text-slate-400">
              تم حفظ نتيجة التحدي محلياً في جهازك (بدون استهلاك لقاعدة البيانات)
            </p>
          </div>

          {/* REMATCH NOTIFICATION */}
          {rematchRequested && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-300 text-sm font-bold flex items-center justify-center gap-3">
              <span>طلب المنافس إعادة التحدي فوراً! هل توافق؟</span>
              <button
                type="button"
                onClick={handleAcceptRematch}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors"
              >
                الموافقة ولعب الإعادة ⚡
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {!rematchRequested && (
              <button
                type="button"
                onClick={handleRequestRematch}
                disabled={rematchWaiting}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                {rematchWaiting ? 'في انتظار موافقة المنافس...' : 'طلب إعادة التحدي (Rematch)'}
              </button>
            )}

            <button
              type="button"
              onClick={onExitMatch}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm shadow-md flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              مغادرة التحدي والعودة
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
