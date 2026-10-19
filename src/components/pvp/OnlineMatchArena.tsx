import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  CircleDot,
  RefreshCw,
  Users,
  ChevronDown,
  ArrowRightLeft,
  Sparkles,
  BarChart2,
  Radio,
  Share2,
  Download
} from 'lucide-react';
import {
  challengeClient,
  ChallengeParticipant,
  saveLocalChallengeResult
} from '../../services/onlineChallengeService';
import { AdManager } from '../../services/adManager';
import { MatchScorerItem } from '../../utils/onlineMatchCardImageGenerator';
import { OnlineMatchShareCard } from './OnlineMatchShareCard';
import { OnlineMatchPitch3D } from './OnlineMatchPitch3D';

export interface MatchEventItem {
  id: string;
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'save' | 'shot_missed' | 'tactic_change' | 'substitution';
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
  scorers: MatchScorerItem[];
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
  currentBallZone?: 'host_box' | 'host_half' | 'midfield' | 'guest_half' | 'guest_box';
}

export interface InGameTacticsState {
  formation: string;
  mentality: 'defensive' | 'balanced' | 'attacking' | 'all_out_attack';
  passingStyle: 'short' | 'direct' | 'long_balls';
  pressingIntensity: 'low' | 'balanced' | 'gegenpress';
  tempo: 'slow' | 'balanced' | 'fast';
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

  // Active view tab inside the match arena
  const [activeTab, setActiveTab] = useState<'live' | 'tactics' | 'stats'>('live');

  // Match Live State
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
    scorers: [],
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
    currentBallZone: 'midfield',
  });

  // Local In-Game Tactics
  const initialTactics: InGameTacticsState = {
    formation: myParticipant.tactics?.formation || '4-3-3',
    mentality: (myParticipant.tactics?.mentality as any) || 'balanced',
    passingStyle: (myParticipant.tactics?.passingStyle as any) || 'short',
    pressingIntensity: myParticipant.tactics?.pressingIntensity === 'high' ? 'gegenpress' : (myParticipant.tactics?.pressingIntensity as any) || 'balanced',
    tempo: (myParticipant.tactics?.tempo as any) || 'balanced',
  };
  const [myTactics, setMyTactics] = useState<InGameTacticsState>(initialTactics);

  // In-Game Squad & Substitutions Management
  const defaultStarters = useMemo(() => {
    if (Array.isArray(myParticipant.squadSummary) && myParticipant.squadSummary.length > 0) {
      return [...myParticipant.squadSummary];
    }
    return [
      { id: 'p1', name: 'الحارس الأساسي', position: 'GK', rating: 70 },
      { id: 'p2', name: 'قلب الدفاع 1', position: 'CB', rating: 71 },
      { id: 'p3', name: 'قلب الدفاع 2', position: 'CB', rating: 70 },
      { id: 'p4', name: 'الظهير الأيمن', position: 'RB', rating: 69 },
      { id: 'p5', name: 'الظهير الأيسر', position: 'LB', rating: 69 },
      { id: 'p6', name: 'لاعب الارتكاز', position: 'CDM', rating: 72 },
      { id: 'p7', name: 'صانع الألعاب', position: 'CAM', rating: 74 },
      { id: 'p8', name: 'متوسط الميدان', position: 'CM', rating: 71 },
      { id: 'p9', name: 'الجناح الأيمن', position: 'RW', rating: 73 },
      { id: 'p10', name: 'الجناح الأيسر', position: 'LW', rating: 73 },
      { id: 'p11', name: 'رأس الحربة', position: 'ST', rating: 75 },
    ];
  }, [myParticipant.squadSummary]);

  const defaultBench = useMemo(() => {
    if (Array.isArray(myParticipant.benchSummary) && myParticipant.benchSummary.length > 0) {
      return [...myParticipant.benchSummary];
    }
    return [
      { id: 'b1', name: 'حارس بديل', position: 'GK', rating: 68 },
      { id: 'b2', name: 'مدافع بديل', position: 'CB', rating: 69 },
      { id: 'b3', name: 'ظهير بديل', position: 'LB', rating: 68 },
      { id: 'b4', name: 'لاعب وسط بديل', position: 'CM', rating: 70 },
      { id: 'b5', name: 'جناح بديل', position: 'RW', rating: 71 },
      { id: 'b6', name: 'مهاجم بديل', position: 'ST', rating: 72 },
    ];
  }, [myParticipant.benchSummary]);

  const [currentStarters, setCurrentStarters] = useState(defaultStarters);
  const [currentBench, setCurrentBench] = useState(defaultBench);
  const [subsRemaining, setSubsRemaining] = useState(5);
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

  // Opponent Live Banner Notification
  const [opponentBanner, setOpponentBanner] = useState<string | null>(null);
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const hasShownAdForMatchRef = useRef(false);

  // Dedicated container ref for internal commentary scrolling (NO page jump!)
  const commentaryBoxRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<MatchLiveState>(matchState);
  stateRef.current = matchState;

  // FIX: Scroll ONLY the commentary container internally without scrolling the browser page!
  useEffect(() => {
    if (commentaryBoxRef.current) {
      commentaryBoxRef.current.scrollTop = commentaryBoxRef.current.scrollHeight;
    }
  }, [matchState.events.length]);

  // Handle incoming WebSocket/Firestore match events
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
        const changes = data.changes || {};
        let bannerMsg = '';

        if (changes.resumeSecondHalf) {
          setMatchState((prev) => {
            if (prev.status === 'halftime') {
              const resumed: MatchLiveState = {
                ...prev,
                status: 'playing',
                events: [
                  ...prev.events,
                  {
                    id: `ev_start_2nd_half_opp_${Date.now()}`,
                    minute: 45,
                    type: 'tactic_change',
                    team: isHost ? 'host' : 'guest',
                    textAr: '▶️ صافرة انطلاق الشوط الثاني! أطلق الحكم الصافرة وبدأت الإثارة!',
                  },
                ],
              };
              if (isHost) {
                challengeClient.sendMatchTick(roomCode, resumed);
              }
              return resumed;
            }
            return prev;
          });
        }

        if (changes.substitution) {
          bannerMsg = `🔄 أجرى المنافس تبديلاً: دخول [${changes.substitution.in}] بديلاً لـ [${changes.substitution.out}] (د ${data.minute}')`;
        } else if (changes.formation) {
          bannerMsg = `📋 غير المنافس خطته إلى [${changes.formation}] (د ${data.minute}')`;
        } else if (changes.mentality) {
          const mentalityArabic =
            changes.mentality === 'attacking' ? 'هجوم ضاغط 🔥' :
            changes.mentality === 'all_out_attack' ? 'هجوم كاسح شامل ⚡' :
            changes.mentality === 'defensive' ? 'دفاعي محكم 🛡️' : 'متوازن ⚖️';
          bannerMsg = `⚡ عدل المنافس عقليته إلى: ${mentalityArabic} (د ${data.minute}')`;
        } else if (changes.passingStyle || changes.pressingIntensity || changes.tempo) {
          bannerMsg = `🎯 أجرى المنافس تعديلاً على أسلوب اللعب والضغط (د ${data.minute}')`;
        }

        if (bannerMsg) {
          setOpponentBanner(bannerMsg);
          setTimeout(() => setOpponentBanner(null), 6000);
        }
      } else if (data.type === 'rematch_requested') {
        setRematchRequested(true);
      } else if (data.type === 'rematch_accepted') {
        // Reset match for replay
        setRematchRequested(false);
        setRematchWaiting(false);
        setSavedLocally(false);
        hasShownAdForMatchRef.current = false;
        setSubsRemaining(5);
        setCurrentStarters(defaultStarters);
        setCurrentBench(defaultBench);
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
          scorers: [],
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
          currentBallZone: 'midfield',
        });
      } else if (data.type === 'opponent_left') {
        setOpponentBanner('غادر المنافس المباراة.');
      }
    });

    return () => unsub();
  }, [defaultStarters, defaultBench]);

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

      // Synchronize completed match with server RAM Daily Ranking (Top 50)
      challengeClient.recordMatchResult({
        roomCode,
        host: {
          playerId: host.playerId,
          playerName: host.playerName,
          clubName: host.clubName,
          avatar: host.avatar,
          clubRating: host.clubRating,
        },
        guest: {
          playerId: guest.playerId,
          playerName: guest.playerName,
          clubName: guest.clubName,
          avatar: guest.avatar,
          clubRating: guest.clubRating,
        },
        homeScore: matchState.homeScore,
        awayScore: matchState.awayScore,
      }).catch(() => {});
    }
  }, [matchState.status, savedLocally, isHost, matchState.homeScore, matchState.awayScore, opponentParticipant, myParticipant, roomCode, matchState.events.length]);

  // Host-driven match engine ticker
  useEffect(() => {
    if (!isHost || matchState.status === 'finished') return;

    const hostStrength = host.clubRating || 70;
    const guestStrength = guest.clubRating || 70;

    const interval = setInterval(() => {
      setMatchState((prev) => {
        if (prev.status === 'finished' || prev.status === 'halftime') return prev;

        const nextMinute = prev.minute + 1;
        const newEvents = [...prev.events];
        const newScorers = [...prev.scorers];
        let nextHomeScore = prev.homeScore;
        let nextAwayScore = prev.awayScore;
        const nextStats = { ...prev.stats };

        // Dynamic tactical weight calculation
        const strengthDiff = hostStrength - guestStrength;
        const baseHomeChance = 0.085 + (strengthDiff > 0 ? 0.025 : -0.015);
        const baseAwayChance = 0.085 + (strengthDiff < 0 ? 0.025 : -0.015);

        const roll = Math.random();
        let currentZone: MatchLiveState['currentBallZone'] = 'midfield';

        // 1. Home Attack Event
        if (roll < baseHomeChance) {
          nextStats.homeShots += 1;
          currentZone = 'guest_box';
          const onTarget = Math.random() < 0.62;

          if (onTarget) {
            nextStats.homeShotsOnTarget += 1;
            const isGoal = Math.random() < 0.36;

            // Pick a realistic scorer from host lineup
            const hostPlayers = Array.isArray(host.squadSummary) && host.squadSummary.length > 0
              ? host.squadSummary
              : [{ name: 'مهاجم ' + host.clubName, position: 'ST' }];
            const attackers = hostPlayers.filter(p => ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(p.position));
            const candidate = attackers.length > 0 
              ? attackers[Math.floor(Math.random() * attackers.length)] 
              : hostPlayers[Math.floor(Math.random() * hostPlayers.length)];
            const scorerName = candidate?.name || 'مهاجم الفريق';

            if (isGoal) {
              nextHomeScore += 1;
              newScorers.push({
                name: scorerName,
                minute: nextMinute,
                team: 'host',
              });
              newEvents.push({
                id: `ev_${nextMinute}_goal_h`,
                minute: nextMinute,
                type: 'goal',
                team: 'host',
                scorerName,
                textAr: `⚽ هـــــــــدف! ${host.clubName} يسجل بواسطة [${scorerName}] في الدقيقة ${nextMinute}' بعد تسديدة صاروخية سكنت الشباك!`,
              });
            } else {
              newEvents.push({
                id: `ev_${nextMinute}_save_a`,
                minute: nextMinute,
                type: 'save',
                team: 'guest',
                textAr: `🧤 حارس ${guest.clubName} يتألق ببراعة وينقذ تسديدة خطيرة من [${scorerName}]!`,
              });
            }
          } else {
            newEvents.push({
              id: `ev_${nextMinute}_miss_h`,
              minute: nextMinute,
              type: 'shot_missed',
              team: 'host',
              textAr: `💨 فرصة هجومية لـ ${host.clubName} لكن الكرة تمر بجوار القائم!`,
            });
          }
        }
        // 2. Away Attack Event
        else if (roll < baseHomeChance + baseAwayChance) {
          nextStats.awayShots += 1;
          currentZone = 'host_box';
          const onTarget = Math.random() < 0.62;

          // Pick a realistic scorer from guest lineup
          const guestPlayers = Array.isArray(guest.squadSummary) && guest.squadSummary.length > 0
            ? guest.squadSummary
            : [{ name: 'مهاجم ' + guest.clubName, position: 'ST' }];
          const attackers = guestPlayers.filter(p => ['ST', 'CF', 'RW', 'LW', 'CAM'].includes(p.position));
          const candidate = attackers.length > 0 
            ? attackers[Math.floor(Math.random() * attackers.length)] 
            : guestPlayers[Math.floor(Math.random() * guestPlayers.length)];
          const scorerName = candidate?.name || 'مهاجم الفريق';

          if (onTarget) {
            nextStats.awayShotsOnTarget += 1;
            const isGoal = Math.random() < 0.36;
            if (isGoal) {
              nextAwayScore += 1;
              newScorers.push({
                name: scorerName,
                minute: nextMinute,
                team: 'guest',
              });
              newEvents.push({
                id: `ev_${nextMinute}_goal_a`,
                minute: nextMinute,
                type: 'goal',
                team: 'guest',
                scorerName,
                textAr: `⚽ هـــــــــدف! ${guest.clubName} يهز الشباك بواسطة [${scorerName}] في الدقيقة ${nextMinute}' بإنهاء متقن للهجمة!`,
              });
            } else {
              newEvents.push({
                id: `ev_${nextMinute}_save_h`,
                minute: nextMinute,
                type: 'save',
                team: 'host',
                textAr: `🧤 تصدٍ بطولي! حارس مرمى ${host.clubName} يمنع هدفاً محققاً لـ [${scorerName}]!`,
              });
            }
          } else {
            newEvents.push({
              id: `ev_${nextMinute}_miss_a`,
              minute: nextMinute,
              type: 'shot_missed',
              team: 'guest',
              textAr: `⚡ تسديدة مباغتة من لاعبي ${guest.clubName} تعلو العارضة بقليل!`,
            });
          }
        }
        // 3. Corner / Fouls / Cards
        else if (roll > 0.93) {
          const isHomeFoul = Math.random() > 0.5;
          if (isHomeFoul) {
            nextStats.homeFouls += 1;
            currentZone = 'host_half';
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
            currentZone = 'guest_half';
            if (Math.random() < 0.35) {
              newEvents.push({
                id: `ev_${nextMinute}_card_a`,
                minute: nextMinute,
                type: 'yellow_card',
                team: 'guest',
                textAr: `🟨 بطاقة صفراء للاعب ${guest.clubName} لتعطيل هجمة مرتدة سريعة.`,
              });
            }
          }
        } else if (roll > 0.88) {
          // Corner kick
          if (Math.random() > 0.5) {
            nextStats.homeCorners += 1;
            currentZone = 'guest_box';
          } else {
            nextStats.awayCorners += 1;
            currentZone = 'host_box';
          }
        }

        // Adjust live possession dynamically
        const possessionBias = 50 + Math.min(18, Math.max(-18, (strengthDiff * 1.5)));
        const jitter = (Math.random() - 0.5) * 4;
        const currentHomePoss = Math.min(68, Math.max(32, Math.round(possessionBias + jitter)));
        nextStats.homePossession = currentHomePoss;
        nextStats.awayPossession = 100 - currentHomePoss;

        const isFullTime = nextMinute >= 90;
        const isHalftime = nextMinute === 45;

        const updatedState: MatchLiveState = {
          minute: nextMinute,
          homeScore: nextHomeScore,
          awayScore: nextAwayScore,
          status: isFullTime ? 'finished' : (isHalftime ? 'halftime' : 'playing'),
          events: isFullTime ? [
            ...newEvents,
            {
              id: 'fulltime',
              minute: 90,
              type: 'tactic_change',
              team: 'host',
              textAr: `🏁 صفارة النهاية! انتهت المواجهة التنافسية المباشرة بنتيجة [${host.clubName} ${nextHomeScore} - ${nextAwayScore} ${guest.clubName}]!`,
            }
          ] : (isHalftime ? [
            ...newEvents,
            {
              id: 'halftime',
              minute: 45,
              type: 'tactic_change',
              team: 'host',
              textAr: `⏱️ نهاية الشوط الأول بالتعادل أو التقدم [${host.clubName} ${nextHomeScore} - ${nextAwayScore} ${guest.clubName}]، فرصة ذهبية للمدربين لتعديل التكتيك والتبديلات!`,
            }
          ] : newEvents),
          scorers: newScorers,
          stats: nextStats,
          momentum: Math.min(100, Math.max(-100, (nextHomeScore - nextAwayScore) * 30 + (strengthDiff * 2))),
          currentBallZone: currentZone,
        };

        // Broadcast to guest via WebSocket relay / Firestore
        challengeClient.sendMatchTick(roomCode, updatedState);

        if (isFullTime) {
          challengeClient.endMatch(roomCode, updatedState);
        }

        return updatedState;
      });
    }, 450); // 450ms per match minute (full match takes ~40 seconds of real excitement)

    return () => clearInterval(interval);
  }, [isHost, host, guest, roomCode, matchState.status]);

  // ============================================================================
  // TACTICAL ACTIONS: FORMATION, PLAYING STYLE, SUBSTITUTIONS
  // ============================================================================

  // 1. Change Formation
  const handleChangeFormation = (formation: string) => {
    const updated = { ...myTactics, formation };
    setMyTactics(updated);

    const eventText = `📋 تعديل الخطة: أجرى المدرب [${myParticipant.playerName}] تغييراً في رسم [${myParticipant.clubName}] إلى خطة (${formation}) في الدقيقة ${matchState.minute}'`;
    
    // Send to opponent
    challengeClient.sendInGameTactics(roomCode, { formation }, matchState.minute);

    // If host, record tactical event
    if (isHost) {
      setMatchState((prev) => ({
        ...prev,
        events: [
          ...prev.events,
          {
            id: `ev_${prev.minute}_form_${Date.now()}`,
            minute: prev.minute,
            type: 'tactic_change',
            team: 'host',
            textAr: eventText,
          },
        ],
      }));
    }
  };

  // 2. Change Playing Style
  const handleChangeStyle = (key: keyof InGameTacticsState, value: any) => {
    const updated = { ...myTactics, [key]: value };
    setMyTactics(updated);

    challengeClient.sendInGameTactics(roomCode, { [key]: value }, matchState.minute);
  };

  // 3. Confirm Substitution
  const handleConfirmSubstitution = () => {
    if (!selectedStarterId || !selectedBenchId) return;
    if (subsRemaining <= 0) return;

    const outPlayer = currentStarters.find((p) => p.id === selectedStarterId);
    const inPlayer = currentBench.find((p) => p.id === selectedBenchId);

    if (!outPlayer || !inPlayer) return;

    // Swap players
    const nextStarters = currentStarters.map((p) => (p.id === outPlayer.id ? inPlayer : p));
    const nextBench = currentBench.map((p) => (p.id === inPlayer.id ? outPlayer : p));

    setCurrentStarters(nextStarters);
    setCurrentBench(nextBench);
    setSubsRemaining((prev) => Math.max(0, prev - 1));
    setSelectedStarterId(null);
    setSelectedBenchId(null);

    const subText = `🔄 تبديل لـ [${myParticipant.clubName}]: خروج [${outPlayer.name}] ودخول [${inPlayer.name}] في الدقيقة ${matchState.minute}'`;

    // Notify opponent
    challengeClient.sendInGameTactics(
      roomCode,
      {
        substitution: {
          out: outPlayer.name,
          in: inPlayer.name,
          team: isHost ? 'host' : 'guest',
        },
      },
      matchState.minute
    );

    // If host, add to commentary directly
    if (isHost) {
      setMatchState((prev) => ({
        ...prev,
        events: [
          ...prev.events,
          {
            id: `ev_${prev.minute}_sub_${Date.now()}`,
            minute: prev.minute,
            type: 'substitution',
            team: isHost ? 'host' : 'guest',
            textAr: subText,
          },
        ],
      }));
    }
  };

  const handleStartSecondHalf = (chosenTactic?: string) => {
    if (chosenTactic) {
      if (chosenTactic === 'attack') handleChangeStyle('mentality', 'all_out_attack');
      else if (chosenTactic === 'defense') handleChangeStyle('mentality', 'defensive');
      else if (chosenTactic === 'balanced') handleChangeStyle('mentality', 'balanced');
      else if (chosenTactic === 'counter') handleChangeStyle('passingStyle', 'direct');
      else if (chosenTactic === 'high_press') handleChangeStyle('pressingIntensity', 'gegenpress');
    }

    setMatchState((prev) => {
      const nextState: MatchLiveState = {
        ...prev,
        status: 'playing',
        events: [
          ...prev.events,
          {
            id: `ev_start_2nd_half_${Date.now()}`,
            minute: 45,
            type: 'tactic_change',
            team: isHost ? 'host' : 'guest',
            textAr: '▶️ صافرة انطلاق الشوط الثاني! عودة الفريقين إلى أرضية الملعب بحماس متجدد!',
          },
        ],
      };

      if (isHost) {
        challengeClient.sendMatchTick(roomCode, nextState);
      } else {
        challengeClient.sendInGameTactics(roomCode, { resumeSecondHalf: true, mentality: chosenTactic }, 45);
      }
      return nextState;
    });
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

  // Generate dynamic Arabic match recap / narrative summary
  const matchRecapText = useMemo(() => {
    const hostName = host.clubName;
    const guestName = guest.clubName;
    const hostMgr = host.playerName;
    const guestMgr = guest.playerName;
    const hScore = matchState.homeScore;
    const aScore = matchState.awayScore;

    if (hScore > aScore) {
      const diff = hScore - aScore;
      if (diff >= 3) {
        return `مباراة استعراضية وتفوق تكتيكي ساحق لنادي ${hostName} بقيادة المدرب ${hostMgr}، حيث فرض أسلوبه الهجومي وترجم الفرص بنجاعة بالغة، بينما عانى دفاع ${guestName} بقيادة ${guestMgr} من الضغط المكثف.`;
      }
      return `مواجهة قوية وتكتيكية من العيار الثقيل حسمها ${hostName} والمدرب ${hostMgr} بنتيجة (${hScore}-${aScore}) بعد تنظيم دفاعي ذكي واستغلال أمثل للهجمات الحاسمة أمام محاولات ${guestName} المتكررة.`;
    } else if (aScore > hScore) {
      const diff = aScore - hScore;
      if (diff >= 3) {
        return `فوز عريض ومفاجأة تكتيكية أعدها المدرب ${guestMgr} لفريق ${guestName}، بعد الاعتماد على السرعة في التحولات وإنهاء الهجمات ببراعة، في ليلة صعبة على أصحاب الأرض ${hostName}.`;
      }
      return `انتصار ثمين وتفوق خارج الديار حققه فريق ${guestName} والمدرب ${guestMgr} بنتيجة (${aScore}-${hScore})، بعد صمود دفاعي ملحمي ولدغات هجومية خاطفة خطفت نقاط التحدي من ${hostName}.`;
    } else {
      if (hScore === 0) {
        return `مباراة مغلقة وصراع تكتيكي حذر للغاية طغى عليه الانضباط الدفاعي الصارم بين المدربين ${hostMgr} و${guestMgr}، لتنتهي بالتعادل السلبي بعد تبادل غلق المساحات.`;
      }
      return `قمة إثارة وندية بالغة انتهت بالتعادل الإيجابي (${hScore}-${aScore})، حيث تبادل المدربان ${hostMgr} و${guestMgr} السيطرة والفرص طوال الـ90 دقيقة في ملحمة كروية متكافئة.`;
    }
  }, [host.clubName, guest.clubName, host.playerName, guest.playerName, matchState.homeScore, matchState.awayScore]);

  // Safe Exit after completed match
  const handleExitWithAd = () => {
    onExitMatch();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2 px-2 sm:px-4" dir="rtl" id="online-match-arena-root">
      {/* OPPONENT BANNER NOTIFICATION */}
      {opponentBanner && (
        <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-2xl text-center text-xs sm:text-sm font-bold animate-bounce flex items-center justify-center gap-2 shadow-lg">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{opponentBanner}</span>
        </div>
      )}

      {/* TOP BROADCAST SCOREBOARD */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Match Header Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono font-bold text-slate-300">كود الغرفة: {roomCode}</span>
          </div>

          {/* Minute ticker & status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 font-bold">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            {matchState.status === 'finished' ? (
              <span className="text-amber-400 font-black">صافرة النهاية (FT)</span>
            ) : matchState.status === 'halftime' ? (
              <span className="text-blue-400 font-black">استراحة الشوطين (HT)</span>
            ) : (
              <span className="text-emerald-400">الدقيقة {matchState.minute}'</span>
            )}
          </div>
        </div>

        {/* CLUBS, MANAGERS & LIVE SCORE */}
        <div className="grid grid-cols-3 items-center py-4 sm:py-5 gap-2 text-center">
          {/* HOST (Right in RTL) */}
          <div className="flex flex-col items-center space-y-1.5">
            <div className="relative">
              {host.avatar ? (
                <img
                  src={host.avatar}
                  alt={host.playerName}
                  className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-100 font-black text-xl shadow-lg">
                  {host.clubName.charAt(0)}
                </div>
              )}
              {isHost && (
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-md bg-emerald-500 text-[9px] font-bold text-white shadow">
                  أنت
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-[180px]">
                {host.clubName}
              </h3>
              <p className="text-xs text-emerald-300 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
                المدرب: {host.playerName}
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold inline-block mt-0.5">
                {host.clubRating} OVR
              </span>
            </div>
          </div>

          {/* SCOREBOARD (Center) */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center justify-center gap-3 sm:gap-5 text-4xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
              <span className="text-emerald-400 transition-all">{matchState.homeScore}</span>
              <span className="text-slate-600 text-2xl sm:text-3xl">-</span>
              <span className="text-blue-400 transition-all">{matchState.awayScore}</span>
            </div>

            {/* Live Scorers Under Score */}
            <div className="flex flex-col items-center text-[11px] text-slate-400 max-h-12 overflow-hidden space-y-0.5">
              {matchState.scorers.slice(-2).map((s, idx) => (
                <span key={idx} className="text-amber-300 font-medium">
                  ⚽ {s.name} ({s.minute}')
                </span>
              ))}
            </div>
          </div>

          {/* GUEST (Left in RTL) */}
          <div className="flex flex-col items-center space-y-1.5">
            <div className="relative">
              {guest.avatar ? (
                <img
                  src={guest.avatar}
                  alt={guest.playerName}
                  className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-blue-400 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 border-2 border-blue-400/60 flex items-center justify-center text-blue-100 font-black text-xl shadow-lg">
                  {guest.clubName.charAt(0)}
                </div>
              )}
              {!isHost && (
                <span className="absolute -bottom-1 -left-1 px-1.5 py-0.2 rounded-md bg-blue-500 text-[9px] font-bold text-white shadow">
                  أنت
                </span>
              )}
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-[180px]">
                {guest.clubName}
              </h3>
              <p className="text-xs text-blue-300 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
                المدرب: {guest.playerName}
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold inline-block mt-0.5">
                {guest.clubRating} OVR
              </span>
            </div>
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

      {/* NAVIGATION TABS: LIVE / TACTICS & SUBS / STATS */}
      <div className="flex items-center justify-center gap-2 bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'live'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>المباشر والتعليق</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tactics')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'tactics'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>الخطة والتبديلات</span>
          {subsRemaining < 5 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
              {subsRemaining}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'stats'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>الإحصائيات</span>
        </button>
      </div>

      {/* TAB 1: LIVE BROADCAST & COMMENTARY */}
      {activeTab === 'live' && (
        <div className="space-y-4">
          {/* INTERACTIVE 3D PITCH & STADIUM */}
          <OnlineMatchPitch3D
            homeClubName={host.clubName}
            awayClubName={guest.clubName}
            homeScore={matchState.homeScore}
            awayScore={matchState.awayScore}
            minute={matchState.minute}
            currentBallZone={matchState.currentBallZone}
            momentum={matchState.momentum}
            homePossession={matchState.stats.homePossession}
            awayPossession={matchState.stats.awayPossession}
            homeFormation={isHost ? myTactics.formation : (host.tactics?.formation || '4-3-3')}
            awayFormation={!isHost ? myTactics.formation : (guest.tactics?.formation || '4-3-3')}
            homeSquad={Array.isArray(host.squadSummary) ? host.squadSummary : undefined}
            awaySquad={Array.isArray(guest.squadSummary) ? guest.squadSummary : undefined}
            lastEvent={matchState.events[matchState.events.length - 1] as any}
            isFinished={matchState.status === 'finished'}
            status={matchState.status}
            addedTime={matchState.minute === 45 || matchState.minute === 90 ? 3 : undefined}
            activeTactic={
              myTactics.mentality === 'attacking' || myTactics.mentality === 'all_out_attack'
                ? 'attack'
                : myTactics.mentality === 'defensive'
                ? 'defense'
                : 'balanced'
            }
            onTacticChange={(key) => {
              if (key === 'attack') handleChangeStyle('mentality', 'all_out_attack');
              else if (key === 'defense') handleChangeStyle('mentality', 'defensive');
              else if (key === 'balanced') handleChangeStyle('mentality', 'balanced');
              else if (key === 'counter') handleChangeStyle('passingStyle', 'direct');
              else if (key === 'high_press') handleChangeStyle('pressingIntensity', 'gegenpress');
              else if (key === 'shoot') handleChangeStyle('mentality', 'attacking');
            }}
            onStartSecondHalf={() => handleStartSecondHalf(myTactics.mentality)}
            onFinishMatch={handleExitWithAd}
            userResultType={isWinner ? 'win' : isDraw ? 'draw' : 'loss'}
            finishButtonLabel="مغادرة التحدي والعودة للوبي"
          />

          {/* COMMENTARY FEED (CONTAINER WITH INTERNAL SCROLLING - NO PAGE JUMP!) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col h-80">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-white">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                شريط التعليق الصوتي والأحداث المباشرة
              </span>
              <span>{matchState.events.length} حدث</span>
            </div>

            {/* INTERNAL SCROLL CONTAINER */}
            <div
              ref={commentaryBoxRef}
              className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm scrollbar-thin scrollbar-thumb-slate-700"
            >
              {matchState.events.map((event) => (
                <div
                  key={event.id}
                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                    event.type === 'goal'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold'
                      : event.type === 'yellow_card'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : event.type === 'save'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                      : event.type === 'substitution'
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-200 font-medium'
                      : event.type === 'tactic_change'
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-200'
                      : 'bg-slate-800/70 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 font-mono text-xs font-bold text-slate-300 shrink-0">
                    {event.minute}'
                  </span>
                  <p className="leading-snug text-xs sm:text-sm">{event.textAr}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IN-MATCH TACTICS, FORMATION & SUBSTITUTIONS */}
      {activeTab === 'tactics' && (
        <div className="space-y-4">
          {/* FORMATION ADJUSTMENT */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>تعديل الخطة التكتيكية (Formation):</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                الخطة الحالية: {myTactics.formation}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3'].map((form) => (
                <button
                  key={form}
                  type="button"
                  onClick={() => handleChangeFormation(form)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    myTactics.formation === form
                      ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {form}
                </button>
              ))}
            </div>
          </div>

          {/* PLAYING STYLE (MENTALITY, PASSING, PRESSING, TEMPO) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
            <h4 className="text-sm font-bold text-white pb-2 border-b border-slate-800 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>تعديل أسلوب وهوية اللعب:</span>
            </h4>

            {/* Mentality */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-bold block">عقلية الفريق:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'defensive', label: '🛡️ دفاعي محكم' },
                  { key: 'balanced', label: '⚖️ تكتيك متوازن' },
                  { key: 'attacking', label: '🔥 هجوم ضاغط' },
                  { key: 'all_out_attack', label: '⚡ هجوم كاسح شامل' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleChangeStyle('mentality', item.key)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      myTactics.mentality === item.key
                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Passing Style */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-bold block">أسلوب التمرير وبناء اللعب:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'short', label: '🎯 تيكي تاكا وقصير' },
                  { key: 'direct', label: '⚡ لعب مباشر وسريع' },
                  { key: 'long_balls', label: '🚀 كرات طولية وعرضيات' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleChangeStyle('passingStyle', item.key)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      myTactics.passingStyle === item.key
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pressing Intensity */}
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-bold block">شدة الضغط واسترجاع الكرة:</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'low', label: '🛡️ دفاع منطقة هادئ' },
                  { key: 'balanced', label: '⚖️ ضغط متوازن' },
                  { key: 'gegenpress', label: '🔴 ضغط عالي (Gegenpress)' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleChangeStyle('pressingIntensity', item.key)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
                      myTactics.pressingIntensity === item.key
                        ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* IN-GAME SUBSTITUTIONS MANAGER */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <span>إجراء التبديلات الحية أثناء المباراة:</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 font-bold border border-slate-700">
                متبقي: {subsRemaining} تبديلات
              </span>
            </div>

            {/* Instruction Banner */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
              <span>اختر لاعباً من الأساسيين ثم لاعباً من البدلاء لإجراء التبديل الفوري:</span>
              {selectedStarterId && selectedBenchId && (
                <button
                  type="button"
                  onClick={handleConfirmSubstitution}
                  disabled={subsRemaining <= 0}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all animate-pulse"
                >
                  تأكيد التبديل 🔄
                </button>
              )}
            </div>

            {/* Starters vs Bench Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Starters */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span>الأساسيون في الملعب (11 لاعباً):</span>
                  {selectedStarterId && <span className="text-amber-400 text-[10px]">• تم اختيار لاعب للاستبدال</span>}
                </span>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {currentStarters.map((player) => {
                    const isSelected = selectedStarterId === player.id;
                    return (
                      <div
                        key={player.id}
                        onClick={() => setSelectedStarterId(isSelected ? null : player.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-400'
                            : 'bg-slate-800/80 border-slate-700/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[10px] font-bold text-emerald-300">
                            {player.position}
                          </span>
                          <span className="text-xs font-bold truncate max-w-[130px] sm:max-w-[160px]">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{player.rating} OVR</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300">
                            {isSelected ? 'محدد للخروج ❌' : 'استبدال 🔄'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bench */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  <span>دكة البدلاء المتاحة:</span>
                  {selectedBenchId && <span className="text-amber-400 text-[10px]">• تم اختيار البديل</span>}
                </span>

                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {currentBench.map((player) => {
                    const isSelected = selectedBenchId === player.id;
                    return (
                      <div
                        key={player.id}
                        onClick={() => setSelectedBenchId(isSelected ? null : player.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-400'
                            : 'bg-slate-800/80 border-slate-700/70 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 font-mono text-[10px] font-bold text-blue-300">
                            {player.position}
                          </span>
                          <span className="text-xs font-bold truncate max-w-[130px] sm:max-w-[160px]">
                            {player.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{player.rating} OVR</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300">
                            {isSelected ? 'محدد للدخول 🟢' : 'إشراك ⚡'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADVANCED MATCH STATS */}
      {activeTab === 'stats' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white pb-2 border-b border-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>إحصائيات المواجهة التفصيلية:</span>
          </h4>

          <div className="space-y-3.5 py-1 text-xs font-bold">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400 text-sm">{matchState.stats.homeShots}</span>
              <span className="text-slate-400">إجمالي التسديدات</span>
              <span className="text-blue-400 text-sm">{matchState.stats.awayShots}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400 text-sm">{matchState.stats.homeShotsOnTarget}</span>
              <span className="text-slate-400">تسديدات على المرمى</span>
              <span className="text-blue-400 text-sm">{matchState.stats.awayShotsOnTarget}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400 text-sm">{matchState.stats.homeCorners}</span>
              <span className="text-slate-400">الضربات الركنية</span>
              <span className="text-blue-400 text-sm">{matchState.stats.awayCorners}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400 text-sm">{matchState.stats.homeFouls}</span>
              <span className="text-slate-400">الأخطاء المرتكبة</span>
              <span className="text-blue-400 text-sm">{matchState.stats.awayFouls}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-emerald-400 text-sm">{matchState.stats.homePossession}%</span>
              <span className="text-slate-400">نسبة الاستحواذ</span>
              <span className="text-blue-400 text-sm">{matchState.stats.awayPossession}%</span>
            </div>
          </div>
        </div>
      )}

      {/* POST MATCH SHARE CARD & RESULT PRESENTATION */}
      {matchState.status === 'finished' && (
        <div className="space-y-5 pt-2">
          {/* Post Match Celebration / Status Banner */}
          <div className="text-center space-y-1">
            {isWinner ? (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-black shadow-lg">
                <Trophy className="w-5 h-5 text-amber-400" />
                مبروك! لقد حققت الفوز في التحدي المباشر بجدارة!
              </div>
            ) : isDraw ? (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-sm font-black shadow-lg">
                <Shield className="w-5 h-5 text-blue-400" />
                مباراة ملحمية انتهت بالتعادل العادل بعد صراع تكتيكي ممتع!
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-sm font-black shadow-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                هاردلك! فاز المنافس بالمباراة، حان وقت مراجعة خطتك للتحدي القادم!
              </div>
            )}
          </div>

          {/* THE SHAREABLE / DOWNLOADABLE RESULT CARD */}
          <OnlineMatchShareCard
            roomCode={roomCode}
            hostManagerName={host.playerName}
            hostClubName={host.clubName}
            hostAvatar={host.avatar}
            guestManagerName={guest.playerName}
            guestClubName={guest.clubName}
            guestAvatar={guest.avatar}
            homeScore={matchState.homeScore}
            awayScore={matchState.awayScore}
            scorers={matchState.scorers}
            matchRecap={matchRecapText}
            isWinner={isWinner}
            isDraw={isDraw}
          />

          {/* REMATCH NOTIFICATION / BUTTONS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl text-center space-y-3">
            {rematchRequested && (
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-3">
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

            <div className="flex flex-wrap items-center justify-center gap-3">
              {!rematchRequested && (
                <button
                  type="button"
                  onClick={handleRequestRematch}
                  disabled={rematchWaiting}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  {rematchWaiting ? 'في انتظار موافقة المنافس...' : 'طلب إعادة التحدي (Rematch)'}
                </button>
              )}

              <button
                type="button"
                onClick={handleExitWithAd}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                مغادرة التحدي والعودة للوبي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
