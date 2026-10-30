import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { TacticalPitch2D } from './TacticalPitch2D';
import { StadiumSponsorBanner } from './StadiumSponsorBanner';
import { FormationType, TacticalMentality, PressingIntensity, Club, MatchEvent, TeamTactics } from '../types/game';
import { useLanguage } from '../utils/i18n';
import { calculateSquadStrength, calculateMatchProbabilities, calculateDynamicManagerRating } from '../utils/rankingsEngine';
import { getOrCreateClubManager } from '../data/worldManagersData';
import { getPositionArabic } from '../utils/positionHelper';
import { findClubInWorld, getClubDisplayName } from '../data/leaguesData';
import { LiveTacticalAlertBanner } from './LiveTacticalAlertBanner';
import { TacticalMatchReportCard } from './TacticalMatchReportCard';
import { RestartSeasonModal } from './RestartSeasonModal';
import { WorldStarLoanModal } from './modals/WorldStarLoanModal';
import { ClubCrest3DShield } from './models/Football3DModels';
import { ClubBadge } from './ClubBadge';
import { fireLightweightCelebration } from '../utils/confetti';
import {
  analyzeLiveMatchSituation,
  isTacticalAdviceApplied,
  TacticalAlert,
  TACTICAL_ARABIC_LABELS,
} from '../utils/tacticalAdvisor';
import {
  Swords,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Gamepad2,
  Globe,
  Calendar,
  Shield,
  Activity,
  Award,
  AlertTriangle,
  Trophy,
  Users,
  Flame,
  ArrowRight,
  Sliders,
  RefreshCw,
  RotateCcw,
  Sparkles,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Percent,
  Compass,
  Info,
  Eye,
  Gift,
  Search,
  Lock,
  Unlock,
  FileText,
  Clock,
  BrainCircuit,
  CalendarDays,
  Coins,
  Target,
  ShieldAlert,
  Lightbulb,
  Zap,
  Home,
} from 'lucide-react';

export const MatchesTab: React.FC = () => {
  const {
    userClub,
    manager,
    cupTournament,
    teams,
    fixtures,
    currentRound,
    totalRounds,
    liveMatch,
    startLiveMatch,
    pauseLiveMatch,
    resumeLiveMatch,
    setMatchSpeed,
    skipLiveMatchToEnd,
    finishLiveMatchAndAdvance,
    resumeSecondHalf,
    makeLiveSubstitution,
    changeLiveMentality,
    changeLivePressing,
    setFormation,
    updateTactics,
    seasonFinished,
    isSimulationRunning,
    openSeasonModal,
    season,
    instantSimulateCurrentRound,
    toggleLiveAutoSubs,
    userSquadStrength,
    userDynamicManagerRating,
    isMatchDay,
    daysUntilNextMatch,
    advanceToNextDay,
    scoutedOpponents,
    scoutOpponent,
    calendarDate,
    doubleLiveMatchRevenueWithAd,
    rematchLiveMatch,
    userCalendarSchedule,
    calendarSchedule,
    recordUserMatchAction,
  } = useGame();

  const { t, language } = useLanguage();
  const commentaryScrollRef = useRef<HTMLDivElement>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedOutPlayerId, setSelectedOutPlayerId] = useState<string>('');
  const [selectedInPlayerId, setSelectedInPlayerId] = useState<string>('');
  const [isScoutingLoading, setIsScoutingLoading] = useState(false);
  const [scoutingToast, setScoutingToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [showScoutingModal, setShowScoutingModal] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adToast, setAdToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [isRematchLoading, setIsRematchLoading] = useState(false);
  const [rematchToast, setRematchToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [showRestartSeasonModal, setShowRestartSeasonModal] = useState(false);
  const [showWorldStarModal, setShowWorldStarModal] = useState(false);
  const [scheduleViewMode, setScheduleViewMode] = useState<'team' | 'round'>('team');
  const activeGuestStar = (userClub?.players || []).find(p => Boolean(p && p.isGuestStar));

  const handleRematchWithAd = async () => {
    if (isRematchLoading || !liveMatch || !liveMatch.isFinished) return;
    setIsRematchLoading(true);
    setRematchToast(null);
    try {
      const res = await rematchLiveMatch();
      setRematchToast({ text: res.message, isError: !res.success });
      if (res.success) {
        setTimeout(() => setRematchToast(null), 5000);
      }
    } catch (err: any) {
      setRematchToast({ text: err?.message || 'حدث خطأ أثناء طلب إعادة المباراة.', isError: true });
    } finally {
      setIsRematchLoading(false);
    }
  };

  const handleDoubleRevenueWithAd = async () => {
    if (isAdLoading || !liveMatch?.matchRevenue) return;
    if (liveMatch.matchRevenue.isDoubledWithAd) {
      setAdToast({ text: 'تمت مضاعفة إيراد هذه المباراة بالفعل!', isError: false });
      setTimeout(() => setAdToast(null), 3000);
      return;
    }

    setIsAdLoading(true);
    try {
      const res = await doubleLiveMatchRevenueWithAd();
      setAdToast({ text: res.message, isError: !res.success });
      setTimeout(() => setAdToast(null), 4500);
    } catch (err) {
      setAdToast({ text: 'حدث خطأ أثناء تشغيل الإعلان.', isError: true });
      setTimeout(() => setAdToast(null), 4000);
    } finally {
      setIsAdLoading(false);
    }
  };
  const [subToast, setSubToast] = useState<string | null>(null);
  const [tacticalToast, setTacticalToast] = useState<string | null>(null);
  const [snoozedTacticalAlerts, setSnoozedTacticalAlerts] = useState<Record<string, number>>({});
  const [teamTalkChosen, setTeamTalkChosen] = useState<string | null>(null);
  const [showCommentary, setShowCommentary] = useState<boolean>(true);

  // Reset tactical alert snoozes when match starts
  useEffect(() => {
    if (!liveMatch || liveMatch.currentMinute <= 1) {
      setSnoozedTacticalAlerts({});
    }
  }, [liveMatch?.fixture?.id, liveMatch?.currentMinute]);

  // Initialize with any finished match already existing on initial mount so restored matches never trigger celebration
  const celebratedMatchIdRef = useRef<string | null>(
    liveMatch && liveMatch.isFinished && liveMatch.fixture?.id ? liveMatch.fixture.id : null
  );

  // Trigger celebration on match win (championship only for cup final, cup_win for other cup matches)
  useEffect(() => {
    if (liveMatch && liveMatch.isFinished && liveMatch.fixture?.id) {
      if (celebratedMatchIdRef.current !== liveMatch.fixture.id) {
        celebratedMatchIdRef.current = liveMatch.fixture.id;
        const isUserHome = userClub ? liveMatch.homeTeam?.id === userClub.id : false;
        const userGoals = isUserHome ? liveMatch.homeScore : liveMatch.awayScore;
        const oppGoals = isUserHome ? liveMatch.awayScore : liveMatch.homeScore;
        const hasPenalties = liveMatch.homePenalties !== undefined && liveMatch.awayPenalties !== undefined;
        const userPenalties = isUserHome ? liveMatch.homePenalties : liveMatch.awayPenalties;
        const oppPenalties = isUserHome ? liveMatch.awayPenalties : liveMatch.homePenalties;
        const won = hasPenalties ? (userPenalties! > oppPenalties!) : userGoals > oppGoals;

        if (won) {
          const isCupMatch = Boolean(
            liveMatch.fixture.competitionType === 'cup' ||
            liveMatch.fixture.competitionType === 'DOMESTIC_COP' ||
            liveMatch.fixture.competitionType === 'DOMESTIC_CUP' ||
            liveMatch.fixture.tournamentId === 'cup' ||
            liveMatch.fixture.cupStage ||
            liveMatch.fixture.competitionType === 'continental' ||
            liveMatch.fixture.competitionType === 'CONTINENTAL_CUP'
          );

          if (isCupMatch) {
            const isCupFinal =
              liveMatch.fixture.cupStage === 'final' ||
              liveMatch.fixture.stage === 'final';
            fireLightweightCelebration(isCupFinal ? 'championship' : 'cup_win');
          }
        }
      }
    }
  }, [liveMatch?.isFinished, liveMatch?.fixture?.id, userClub?.id]);

  // Compute live smart tactical advisory alert
  const activeTacticalAlert = useMemo(() => {
    if (!liveMatch || !userClub || liveMatch.isFinished) return null;
    return analyzeLiveMatchSituation(liveMatch, userClub, snoozedTacticalAlerts);
  }, [liveMatch, userClub, snoozedTacticalAlerts]);

  // Check if current tactical advice is already applied
  const isAdviceApplied = useMemo(() => {
    if (!activeTacticalAlert || !userClub?.tactics) return false;
    return isTacticalAdviceApplied(activeTacticalAlert, userClub.tactics);
  }, [activeTacticalAlert, userClub?.tactics]);

  // Handler to apply tactical advice instantly with one click
  const handleApplyTacticalAlert = (alert: TacticalAlert) => {
    if (!userClub?.tactics) return;

    const currentTactics = userClub.tactics;
    const updatedTactics: TeamTactics = {
      ...currentTactics,
      formation: alert.suggestedFormation || currentTactics.formation,
      mentality: alert.suggestedMentality || currentTactics.mentality,
      pressingIntensity: alert.suggestedPressing || currentTactics.pressingIntensity,
      passingStyle: alert.suggestedPassingStyle || currentTactics.passingStyle,
      defensiveLine: alert.suggestedDefensiveLine || currentTactics.defensiveLine,
      teamWidth: alert.suggestedTeamWidth || currentTactics.teamWidth,
      tacticalStyle: alert.suggestedTacticalStyle || currentTactics.tacticalStyle,
    };

    updateTactics(updatedTactics);
    if (alert.suggestedFormation) {
      setFormation(alert.suggestedFormation);
    }
    if (alert.suggestedMentality) {
      changeLiveMentality(alert.suggestedMentality);
    }
    if (alert.suggestedPressing) {
      changeLivePressing(alert.suggestedPressing);
    }

    // Add immediate in-game commentary event
    if (liveMatch && !liveMatch.isFinished) {
      const commentaryDesc = `⚡ قرار تكتيكي عاجل من المدرب: تنفيذ توصية (${alert.badge}) بالتحول لتشكيل (${alert.suggestedFormation || currentTactics.formation}) واللعب بأسلوب (${alert.suggestedMentality ? TACTICAL_ARABIC_LABELS.mentality[alert.suggestedMentality] : 'متوازن'}) مع ضغط (${alert.suggestedPressing ? TACTICAL_ARABIC_LABELS.pressing[alert.suggestedPressing] : 'متقدم'}) لاستعادة السيطرة!`;
      
      const newEvent: MatchEvent = {
        minute: Math.max(1, liveMatch.currentMinute),
        type: 'commentary',
        teamId: userClub.id,
        description: commentaryDesc,
      };
      liveMatch.events.push(newEvent);
    }

    const formationText = alert.suggestedFormation ? `الخطة ${alert.suggestedFormation}` : '';
    const mentalityText = alert.suggestedMentality ? `عقلية ${TACTICAL_ARABIC_LABELS.mentality[alert.suggestedMentality]}` : '';
    setTacticalToast(`✅ تم تطبيق التعديل التكتيكي بنجاح! تم اعتماد ${formationText} و ${mentalityText} 🟢`);
    setTimeout(() => {
      setTacticalToast(null);
    }, 4500);

    // Snooze this specific alert category for 15 simulated minutes
    setSnoozedTacticalAlerts(prev => ({
      ...prev,
      [alert.id]: (liveMatch?.currentMinute || 0) + 15,
    }));
  };

  // Handler to dismiss or snooze alert
  const handleDismissTacticalAlert = (alertId: string) => {
    setSnoozedTacticalAlerts(prev => ({
      ...prev,
      [alertId]: (liveMatch?.currentMinute || 0) + 12,
    }));
  };

  // Auto scroll commentary container ONLY internally (never scroll whole page)
  useEffect(() => {
    if (liveMatch && commentaryScrollRef.current) {
      commentaryScrollRef.current.scrollTop = commentaryScrollRef.current.scrollHeight;
    }
  }, [liveMatch?.currentMinute, liveMatch?.events?.length]);

  // Match finished effect
  useEffect(() => {
    if (liveMatch && liveMatch.isFinished) {
      console.log('[DIAG] MATCH_RESULT_RENDERED');
      console.log('[DIAG] RESULT_STATE_SET');
      console.log('[MatchEndingFlow] RESULT_RENDERED');
    }
  }, [liveMatch?.isFinished]);

  // Current Round Fixtures
  const roundFixtures = (fixtures || []).filter(f => f && f.round === currentRound);

  // Active user fixture across all competitions (League, CAF CL, Cup)
  const userFixture = useMemo(() => {
    if (!userClub?.id || manager.isUnemployed) return undefined;
    // 0. Priority: Any unplayed Continental or Cup match whose round trigger has arrived (<= currentRound)
    const dueTournamentMatch = (userCalendarSchedule || []).find(
      m =>
        m &&
        !m.isPlayed &&
        (m.competitionType === 'CONTINENTAL_CUP' || m.competitionType === 'continental' || m.competitionType === 'DOMESTIC_COP' || m.competitionType === 'cup') &&
        m.round &&
        m.round <= currentRound
    );
    if (dueTournamentMatch) return dueTournamentMatch;
    // 1. Match scheduled for today on real-world calendar (or overdue unplayed match)
    const todayMatch = (userCalendarSchedule || []).find(m => m && !m.isPlayed && (m.date === calendarDate?.rawDateStr || (m.date || '') <= (calendarDate?.rawDateStr || '')));
    if (todayMatch) return todayMatch;
    // 2. Next upcoming unplayed fixture on or after today
    const upcoming = (userCalendarSchedule || []).find(m => m && !m.isPlayed && m.date >= (calendarDate?.rawDateStr || ''));
    if (upcoming) return upcoming;
    // 3. Round fixture fallback
    return roundFixtures.find(f => f && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id));
  }, [userClub?.id, manager.isUnemployed, userCalendarSchedule, calendarDate?.rawDateStr, roundFixtures, currentRound]);

  // Resolve upcoming match details for user club
  const upcomingMatchAnalysis = useMemo(() => {
    if (!userFixture || !userClub?.id) return null;
    try {
      const isUserHome = userFixture.homeTeamId === userClub.id;
      const oppTeamId = isUserHome ? userFixture.awayTeamId : userFixture.homeTeamId;
      const oppClub = (oppTeamId ? (teams.find(t => t && t.id === oppTeamId) || findClubInWorld(oppTeamId)) : null) || null;

      if (!oppClub) return null;

      const oppManager = oppClub.manager || getOrCreateClubManager(oppClub) || {
        id: `mgr_${oppClub.id}`,
        name: 'مدرب المنافس',
        rating: 65,
        worldRank: 450,
        preferredFormation: '4-3-3',
      };
      const oppSquad = calculateSquadStrength(oppClub) || { overall: 65, attack: 65, midfield: 65, defense: 65, goalkeeper: 65, benchOverall: 65 };
      const userSquad = userSquadStrength || calculateSquadStrength(userClub) || { overall: 65, attack: 65, midfield: 65, defense: 65, goalkeeper: 65, benchOverall: 65 };

      const homeSquad = isUserHome ? userSquad : oppSquad;
      const awaySquad = isUserHome ? oppSquad : userSquad;
      const homeMgrRating = isUserHome ? (userDynamicManagerRating || 50) : (oppManager.rating || 65);
      const awayMgrRating = isUserHome ? (oppManager.rating || 65) : (userDynamicManagerRating || 50);

      const odds = calculateMatchProbabilities(homeSquad, awaySquad, homeMgrRating, awayMgrRating) || {
        homeWin: 40,
        draw: 30,
        awayWin: 30,
        tacticalEdge: 'balanced',
      };

      return {
        isUserHome,
        oppClub,
        oppManager,
        oppSquad,
        userSquad,
        odds,
      };
    } catch (e) {
      console.error('[MatchesTab] Error calculating upcomingMatchAnalysis:', e);
      return null;
    }
  }, [userFixture, userClub, teams, userSquadStrength, userDynamicManagerRating]);

  // If in a live match
  if (liveMatch) {
    if (liveMatch.isFinished) {
      console.log('[MatchEndingFlow] RESULT_RENDER_STARTED');
    }
    const isUserHome = userClub ? liveMatch.homeTeam?.id === userClub.id : false;
    const userGoals = isUserHome ? liveMatch.homeScore : liveMatch.awayScore;
    const oppGoals = isUserHome ? liveMatch.awayScore : liveMatch.homeScore;
    const isCupMatch = Boolean(
      liveMatch.fixture?.competitionType === 'cup' ||
      liveMatch.fixture?.competitionType === 'DOMESTIC_COP' ||
      liveMatch.fixture?.competitionType === 'continental' ||
      liveMatch.fixture?.competitionType === 'CONTINENTAL_CUP'
    );
    const hasPenalties = liveMatch.homePenalties !== undefined && liveMatch.awayPenalties !== undefined;
    const userPenalties = isUserHome ? liveMatch.homePenalties : liveMatch.awayPenalties;
    const oppPenalties = isUserHome ? liveMatch.awayPenalties : liveMatch.homePenalties;

    // Match results: win, draw, or loss (considering penalties for knockout ties)
    const isUserWin = hasPenalties ? (userPenalties! > oppPenalties!) : userGoals > oppGoals;
    const isUserDraw = hasPenalties ? false : userGoals === oppGoals;
    const isUserLoss = hasPenalties ? (userPenalties! < oppPenalties!) : userGoals < oppGoals;

    // Filter events up to current minute
    const visibleEvents = (liveMatch.events || []).filter(e => e && e.minute <= liveMatch.currentMinute);

    const activeUserLineup = isUserHome ? (liveMatch.homeLineup || []) : (liveMatch.awayLineup || []);
    const userTeamObj = isUserHome ? liveMatch.homeTeam : liveMatch.awayTeam;
    const startingPlayers = (userTeamObj?.players || []).filter(p => p && p.id && activeUserLineup.includes(p.id));
    const benchPlayers = (userTeamObj?.players || []).filter(p => p && p.id && !activeUserLineup.includes(p.id));

    const handleExecuteSub = () => {
      if (!selectedOutPlayerId || !selectedInPlayerId) return;
      const res = makeLiveSubstitution(selectedOutPlayerId, selectedInPlayerId);
      setSubToast(res.message);
      setSelectedOutPlayerId('');
      setSelectedInPlayerId('');
      setTimeout(() => setSubToast(null), 4000);
      setShowSubModal(false);
    };

    const handleReturnToDashboard = () => {
      if (liveMatch?.isPlaying) {
        pauseLiveMatch();
      }
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'dashboard' } }));
    };

    return (
      <div className="space-y-4 pb-20 animate-fade-in">
        
        {/* Sticky-style Compact Scoreboard Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
          
          {/* Minute & Status Pill with Home Navigation */}
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-2">
              <button
                id="btn_live_match_return_home"
                type="button"
                onClick={handleReturnToDashboard}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="العودة إلى لوحة التحكم الرئيسية (المباراة تبقى محفوظة ومستمرة)"
              >
                <Home className="w-3.5 h-3.5 text-amber-400" />
                <span>الرئيسية</span>
              </button>

              <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-bold text-slate-300">
                {liveMatch.fixture.stageName || liveMatch.fixture.tournamentBadge || `الجولة ${liveMatch.fixture.round} من ${totalRounds}`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                liveMatch.isFinished 
                  ? 'bg-slate-500' 
                  : liveMatch.isHalfTime 
                  ? 'bg-amber-400' 
                  : 'bg-red-500 animate-ping'
              }`} />
              <span className={`font-black font-mono text-sm ${
                liveMatch.isFinished 
                  ? 'text-amber-400' 
                  : liveMatch.isHalfTime 
                  ? 'text-amber-300' 
                  : 'text-red-400'
              }`}>
                {liveMatch.isFinished 
                  ? 'نهاية المباراة 90\'' 
                  : liveMatch.isHalfTime 
                  ? 'استراحة الشوطين (45\')' 
                  : `${liveMatch.currentMinute}' دقيقة`}
              </span>
            </div>
          </div>

          {/* Teams and Score Display */}
          <div className="grid grid-cols-5 items-center gap-2 py-2">
            
            {/* Home Team */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div className="mb-1.5 flex justify-center">
                <ClubBadge club={liveMatch.homeTeam} size="lg" />
              </div>
              <h3 className="font-bold text-sm text-white truncate max-w-full">
                {liveMatch.homeTeam.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                {liveMatch.homeTeam.isUserClub ? (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                    {manager.name} ({userDynamicManagerRating || 50} ⭐)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 font-medium bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                    {liveMatch.homeTeam.manager?.name || 'المدرب'} ({liveMatch.homeTeam.manager?.rating || liveMatch.homeTeam.reputation || 65} ⭐)
                  </span>
                )}
              </div>
            </div>

            {/* Live Score Numbers */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="bg-slate-950 border border-slate-700/80 px-3.5 py-1.5 rounded-2xl flex items-center gap-2 font-mono font-black text-2xl text-white shadow-inner">
                <span className={liveMatch.homeScore > liveMatch.awayScore ? 'text-emerald-400' : ''}>{liveMatch.homeScore}</span>
                <span className="text-slate-600">:</span>
                <span className={liveMatch.awayScore > liveMatch.homeScore ? 'text-emerald-400' : ''}>{liveMatch.awayScore}</span>
              </div>
              {hasPenalties && (
                <div className="mt-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] font-mono font-black text-amber-300 shadow-sm animate-pulse">
                  ركلات ({liveMatch.homePenalties} - {liveMatch.awayPenalties})
                </div>
              )}
              <span className="text-[10px] text-slate-400 mt-1 font-medium">
                {liveMatch.isFinished ? (hasPenalties ? 'حسم بركلات الترجيح' : 'النتيجة النهائية') : liveMatch.isHalfTime ? 'الشوط الأول' : 'مباشر'}
              </span>
            </div>

            {/* Away Team */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div className="mb-1.5 flex justify-center">
                <ClubBadge club={liveMatch.awayTeam} size="lg" />
              </div>
              <h3 className="font-bold text-sm text-white truncate max-w-full">
                {liveMatch.awayTeam.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                {liveMatch.awayTeam.isUserClub ? (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                    {manager.name} ({userDynamicManagerRating || 50} ⭐)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 font-medium bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.2 rounded truncate max-w-[120px]">
                    {liveMatch.awayTeam.manager?.name || 'المدرب'} ({liveMatch.awayTeam.manager?.rating || liveMatch.awayTeam.reputation || 65} ⭐)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Goal Scorers & Minutes Row (Live & Post-Match) */}
          {(() => {
            const goalEvents = (liveMatch.events || []).filter(e => e && e.type === 'goal');
            if (goalEvents.length === 0) return null;
            const homeScorers = goalEvents
              .filter(e => e.teamId === liveMatch.homeTeam.id)
              .map(e => `${e.playerName || 'لاعب'} '${e.minute}`);
            const awayScorers = goalEvents
              .filter(e => e.teamId === liveMatch.awayTeam.id)
              .map(e => `${e.playerName || 'لاعب'} '${e.minute}`);
            return (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                <div className="text-right space-y-0.5 pr-1">
                  {homeScorers.length > 0 ? (
                    <div className="text-emerald-300 font-bold leading-relaxed">
                      ⚽ {homeScorers.join('، ')}
                    </div>
                  ) : (
                    <div className="text-slate-600">—</div>
                  )}
                </div>
                <div className="text-left space-y-0.5 pl-1 border-r border-slate-800/60">
                  {awayScorers.length > 0 ? (
                    <div className="text-amber-300 font-bold leading-relaxed">
                      ⚽ {awayScorers.join('، ')}
                    </div>
                  ) : (
                    <div className="text-slate-600">—</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Possession & xG Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{liveMatch.stats.homePossession}% استحواذ (xG: {liveMatch.homeXg || 0})</span>
              <span>{liveMatch.stats.awayPossession}% استحواذ (xG: {liveMatch.awayXg || 0})</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full flex overflow-hidden">
              <div 
                className="h-full transition-all duration-500" 
                style={{ width: `${liveMatch.stats.homePossession}%`, backgroundColor: liveMatch.homeTeam.primaryColor }}
              />
              <div 
                className="h-full transition-all duration-500" 
                style={{ width: `${liveMatch.stats.awayPossession}%`, backgroundColor: liveMatch.awayTeam.primaryColor }}
              />
            </div>
          </div>

          {/* In-Game Action Controls (if not finished) */}
          {!liveMatch.isFinished && !liveMatch.isHalfTime ? (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={liveMatch.isPlaying ? pauseLiveMatch : resumeLiveMatch}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all active:scale-95"
              >
                {liveMatch.isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                <span>{liveMatch.isPlaying ? 'إيقاف مؤقت' : 'استئناف اللعب'}</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 p-1 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 px-1 hidden sm:inline">السرعة:</span>
                <button
                  type="button"
                  onClick={() => setMatchSpeed(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    (liveMatch.speed || 1) === 1
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="السرعة الطبيعية 1X"
                >
                  1X
                </button>
                <button
                  type="button"
                  onClick={() => setMatchSpeed(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    liveMatch.speed === 2
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black animate-pulse'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title="مضاعفة السرعة 2X"
                >
                  2X
                </button>
              </div>

              <button
                id="btn_skip_live_match_to_end"
                type="button"
                onClick={skipLiveMatchToEnd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-rose-100 cursor-pointer shadow-sm active:scale-95"
                title="تخطي ما تبقى من دقائق المباراة حتى النهاية (تحصل على 50% فقط من الإيراد)"
              >
                <FastForward className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">تخطي للنهاية (خصم 50% من الإيراد)</span>
                <span className="sm:hidden">تخطي (50%)</span>
              </button>
            </div>
          ) : liveMatch.isFinished ? (
            /* Match Finished Banner & Advance CTA */
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-3">
              <div className={`p-3 rounded-2xl text-center text-xs font-bold flex items-center justify-center gap-2 ${
                isUserWin 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                  : isUserDraw 
                  ? 'bg-amber-950 text-amber-300 border border-amber-700' 
                  : 'bg-red-950 text-red-300 border border-red-700'
              }`}>
                <Trophy className="w-4 h-4" />
                <span>
                  {isUserWin
                    ? '🎉 فوز رائع ومستحق! مكافأة الفوز ونقاط الخبرة أضيفت لرصيدك في جدول الدوري.'
                    : isUserDraw
                    ? '🤝 تعادل ونقطة إضافية تضاف إلى رصيد فريقك في جدول الدوري.'
                    : '😔 هزيمة مؤسفة.. حان وقت التعويض في الجولة القادمة!'}
                </span>
              </div>

              {/* Rewarded Rematch Feature (إعادة المباراة عند الهزيمة أو التعادل مقابل مشاهدة إعلان) */}
              {!isUserWin && (
                <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-2 border-indigo-500/50 rounded-2xl p-4 shadow-xl space-y-3 text-right">
                  <div className="flex items-center justify-between border-b border-indigo-500/30 pb-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-indigo-400" />
                      <h4 className="font-black text-sm text-white">فرصة ذهبية: إعادة المباراة فوراً (Rematch)</h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>مكافأة إعلان AdMob</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isUserDraw 
                      ? 'لم تكن راضياً عن نتيجة التعادل؟ شاهد إعلاناً واحصل على فرصة ثانية لإعادة المباراة من البداية لتحقيق الفوز واقتناص النقاط الثلاث كاملة!' 
                      : 'خسارة غير مرضية؟ لا تقلق يا كابتن! يمكنك مشاهدة إعلان قصير لإعادة المباراة فوراً من الدقيقة صفر واللعب من جديد لتعديل النتيجة وتحقيق الفوز!'}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      id="btn_rematch_match_with_ad"
                      type="button"
                      onClick={handleRematchWithAd}
                      disabled={isRematchLoading || isSimulationRunning}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-black text-xs py-3 px-4 rounded-xl shadow-lg shadow-indigo-950/70 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                    >
                      <RotateCcw className={`w-4 h-4 text-white ${isRematchLoading ? 'animate-spin' : ''}`} />
                      <span>{isRematchLoading ? 'جاري تجهيز الإعلان وإعادة المباراة...' : '🎬 شاهد إعلاناً وأعد المباراة فوراً'}</span>
                    </button>
                  </div>

                  {rematchToast && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
                      rematchToast.isError ? 'bg-rose-950/90 text-rose-200 border border-rose-600' : 'bg-emerald-950/90 text-emerald-200 border border-emerald-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{rematchToast.text}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Match Revenue & Double with Ad Card */}
              {liveMatch.matchRevenue && (
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3 text-right">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-amber-400" />
                      <h4 className="font-black text-sm text-white">كشف إيرادات المباراة (Match Revenue)</h4>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {liveMatch.matchRevenue.isHome ? '🏟️ داخل الأرض' : '✈️ خارج الأرض'}
                    </span>
                  </div>

                  {/* Attendance & Ticket Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">الحضور الجماهيري</span>
                      <span className="text-xs font-bold text-white">
                        {(liveMatch.matchRevenue.attendance || 0).toLocaleString()} / {(liveMatch.matchRevenue.stadiumCapacity || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-400 block font-bold">
                        نسبة الامتلاء: {liveMatch.matchRevenue.attendancePercentage || 0}%
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">سعر التذكرة</span>
                      <span className="text-xs font-black text-amber-400 font-mono">
                        {liveMatch.matchRevenue.ticketPrice || 0} ج.م
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        (المعيار: {liveMatch.matchRevenue.benchmarkTicketPrice || 0} ج.م)
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">إيراد بيع التذاكر</span>
                      <span className="text-xs font-black text-emerald-400 font-mono">
                        {(liveMatch.matchRevenue.ticketRevenue || 0).toLocaleString()} ج.م
                      </span>
                    </div>

                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">مكافأة الفوز / النتيجة</span>
                      <span className={`text-xs font-black font-mono ${(liveMatch.matchRevenue.resultBonus || 0) > 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                        {(liveMatch.matchRevenue.resultBonus || 0) > 0 ? `+${(liveMatch.matchRevenue.resultBonus || 0).toLocaleString()} ج.م` : '0 ج.م'}
                      </span>
                    </div>
                  </div>

                  {/* Breakdown details */}
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>• إيراد التذاكر:</span>
                      <span className="font-mono text-emerald-400 font-bold">+{(liveMatch.matchRevenue.ticketRevenue || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>• مكافأة النتيجة ({liveMatch.matchRevenue.resultType === 'win' ? 'فوز بالمباراة 🏆' : liveMatch.matchRevenue.resultType === 'draw' ? 'تعادل 🤝' : 'هزيمة ❌'}):</span>
                      <span className="font-mono text-purple-400 font-bold">
                        {(liveMatch.matchRevenue.resultBonus || 0) > 0 ? `+${(liveMatch.matchRevenue.resultBonus || 0).toLocaleString()} ج.م` : '0 ج.م (لا يوجد مكافأة عند الهزيمة)'}
                      </span>
                    </div>
                    {liveMatch.matchRevenue.isSkippedMatch && (
                      <div className="flex items-center justify-between text-rose-300 font-bold pt-1 border-t border-slate-800">
                        <span>⚠️ خصم تخطي المباراة (نصف الإيرادات 50%):</span>
                        <span className="font-mono text-rose-400">-{(liveMatch.matchRevenue.skipPenaltyAmount || 0).toLocaleString()} ج.م</span>
                      </div>
                    )}
                    {liveMatch.matchRevenue.isDoubledWithAd && (
                      <div className="flex items-center justify-between text-amber-300 font-bold pt-1 border-t border-slate-800">
                        <span>🎁 مكافأة مشاهدة إعلان AdMob (مضاعفة 2X):</span>
                        <span className="font-mono text-amber-400">+{(liveMatch.matchRevenue.adDoubledBonus || 0).toLocaleString()} ج.م</span>
                      </div>
                    )}
                  </div>

                  {/* Total & Rewarded Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-amber-950/60 to-emerald-950/60 border border-amber-500/50 p-3 rounded-xl">
                    <div>
                      <span className="text-[11px] text-slate-300 block font-medium">إجمالي إيراد المباراة المودع:</span>
                      <span className="text-xl font-black text-amber-300 font-mono">
                        {(liveMatch.matchRevenue.totalRevenue || 0).toLocaleString()} ج.م
                      </span>
                    </div>

                    {liveMatch.matchRevenue.isDoubledWithAd ? (
                      <div className="flex items-center gap-1.5 bg-emerald-950 border border-emerald-500/60 text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تمت مضاعفة الإيراد بنجاح! (+{(liveMatch.matchRevenue.adDoubledBonus || 0).toLocaleString()} ج.م)</span>
                      </div>
                    ) : (
                      <button
                        id="btn_double_match_revenue_ad"
                        type="button"
                        onClick={handleDoubleRevenueWithAd}
                        disabled={isAdLoading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-60 cursor-pointer animate-pulse"
                      >
                        <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                        <span>{isAdLoading ? 'جاري تجهيز الإعلان...' : '🎁 شاهد إعلانًا وضاعف إيراد المباراة'}</span>
                      </button>
                    )}
                  </div>

                  {adToast && (
                    <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
                      adToast.isError ? 'bg-rose-950/90 text-rose-200 border border-rose-600' : 'bg-emerald-950/90 text-emerald-200 border border-emerald-600'
                    }`}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{adToast.text}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tactical Match Analysis & Debrief */}
              {liveMatch.tacticalMatchReport && (
                <TacticalMatchReportCard
                  report={liveMatch.tacticalMatchReport}
                  userTactics={userClub?.tactics}
                  userClub={userClub}
                />
              )}

              <button
                id="finish_match_and_advance_btn"
                disabled={isSimulationRunning}
                onClick={() => {
                  console.log('[DIAG] FINISH_BUTTON_CLICKED');
                  console.log('[MatchesTab] User clicked Confirm Result & Advance button');
                  try {
                    finishLiveMatchAndAdvance();
                  } catch (err) {
                    console.error('[MatchesTab] Error during finishLiveMatchAndAdvance click:', err);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-xl shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <span>{isSimulationRunning ? 'جارٍ حفظ النتيجة والانتقال...' : 'تأكيد النتيجة والانتقال للجولة التالية'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}

        </div>

        {/* Sub Toast Alert */}
        {subToast && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-lg">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{subToast}</span>
          </div>
        )}

        {/* Tactical Feedback Toast */}
        {tacticalToast && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{tacticalToast}</span>
          </div>
        )}

        {/* Smart In-Match Tactical Advisory Alert */}
        {!liveMatch.isFinished && activeTacticalAlert && (
          <LiveTacticalAlertBanner
            alert={activeTacticalAlert}
            onApply={handleApplyTacticalAlert}
            onDismiss={handleDismissTacticalAlert}
            isApplied={isAdviceApplied}
          />
        )}

        {/* 2.5D Tactical Stadium Simulation */}
        <div className="space-y-2.5">
          <TacticalPitch2D
            homeTeam={liveMatch.homeTeam}
            awayTeam={liveMatch.awayTeam}
            currentMinute={liveMatch.currentMinute}
            homeScore={liveMatch.homeScore}
            awayScore={liveMatch.awayScore}
            events={liveMatch.events}
            isPlaying={liveMatch.isPlaying}
            isFinished={liveMatch.isFinished}
            isHalfTime={liveMatch.isHalfTime}
            userTactics={userClub?.tactics}
            homePossession={liveMatch.stats?.homePossession || 50}
            awayPossession={liveMatch.stats?.awayPossession || 50}
            homeDangerousAttacks={liveMatch.homeDangerousAttacks || 0}
            awayDangerousAttacks={liveMatch.awayDangerousAttacks || 0}
            onStartSecondHalf={() => resumeSecondHalf(teamTalkChosen === 'motivate' || teamTalkChosen === 'demand')}
            onFinishMatch={() => {
              console.log('[MatchesTab] User clicked Confirm Result from pitch center overlay');
              finishLiveMatchAndAdvance();
            }}
            isSimulationRunning={isSimulationRunning}
            userResultType={isUserWin ? 'win' : isUserDraw ? 'draw' : 'loss'}
            homePenalties={liveMatch.homePenalties}
            awayPenalties={liveMatch.awayPenalties}
            isCupMatch={isCupMatch}
            finishButtonLabel="تأكيد النتيجة والانتقال للجولة التالية"
            onTacticChange={(tacticKey) => {
              if (tacticKey === 'attack') changeLiveMentality('attacking');
              else if (tacticKey === 'defend') changeLiveMentality('defensive');
              else if (tacticKey === 'balanced') changeLiveMentality('balanced');
              else if (tacticKey === 'counter') changeLiveMentality('attacking');
              else if (tacticKey === 'high_press') changeLivePressing('high');
            }}
          />

          {/* Stadium Pitch-side LED Sponsor Board */}
          <StadiumSponsorBanner
            currentMinute={liveMatch.currentMinute}
            isMatchPlaying={liveMatch.isPlaying}
          />
        </div>

        {/* Live In-Match Tactical Quick Bar (Available during active play) */}
        {!liveMatch.isFinished && !liveMatch.isHalfTime && userClub?.tactics && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3.5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>التعليمات التكتيكية المباشرة من دكة البدلاء</span>
              </span>
              
              <div className="flex items-center gap-1.5">
                <button
                  id="toggle_live_auto_subs_btn"
                  onClick={toggleLiveAutoSubs}
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    liveMatch.autoSubsEnabled
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400'
                  }`}
                  title="الذكاء الاصطناعي يستبدل اللاعبين المجهدين والمصابين تلقائياً"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${liveMatch.autoSubsEnabled ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>تبديل تلقائي: {liveMatch.autoSubsEnabled ? 'مفعل 🟢' : 'معطل ⚪'}</span>
                </button>

                <button
                  onClick={() => setShowSubModal(!showSubModal)}
                  disabled={(liveMatch.substitutionsCount || 0) >= 5}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>تبديل يدوي ({5 - (liveMatch.substitutionsCount || 0)} متبقي)</span>
                </button>
              </div>
            </div>

            {/* Quick Formation Selectors */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">تشكيل الفريق الميداني:</span>
                {activeTacticalAlert?.suggestedFormation && (
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>توصية المساعد: {activeTacticalAlert.suggestedFormation}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'] as FormationType[]).map(form => {
                  const isSelected = userClub.tactics?.formation === form;
                  const isSuggested = activeTacticalAlert?.suggestedFormation === form;
                  return (
                    <button
                      key={form}
                      onClick={() => setFormation(form)}
                      className={`py-1.5 px-1 rounded-xl text-[11px] font-mono font-bold border transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black shadow-sm'
                          : isSuggested
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/60'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{form}</span>
                      {isSuggested && !isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Mentality Selectors */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">عقلية اللعب الحالية:</span>
                {activeTacticalAlert?.suggestedMentality && (
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <span>موصى به: {TACTICAL_ARABIC_LABELS.mentality[activeTacticalAlert.suggestedMentality]}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(['ultra_defensive', 'defensive', 'balanced', 'attacking', 'ultra_attacking'] as TacticalMentality[]).map(mentality => {
                  const isSelected = userClub.tactics?.mentality === mentality;
                  const isSuggested = activeTacticalAlert?.suggestedMentality === mentality;
                  const labels: Record<TacticalMentality, string> = {
                    'ultra_defensive': 'دفاع حديدي',
                    'defensive': 'حذر دفاعي',
                    'balanced': 'متوازن',
                    'attacking': 'هجومي',
                    'ultra_attacking': 'هجوم كاسح',
                  };
                  return (
                    <button
                      key={mentality}
                      onClick={() => changeLiveMentality(mentality)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black shadow-sm'
                          : isSuggested
                          ? 'bg-amber-500/10 border-amber-400/70 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{labels[mentality]}</span>
                      {isSuggested && !isSelected && (
                        <span className="absolute -top-1 -right-0.5 text-[8px] text-amber-400 font-black">★</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Pressing Intensity */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">حدة الضغط:</span>
                {activeTacticalAlert?.suggestedPressing && (
                  <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1">
                    <span>موصى به: {TACTICAL_ARABIC_LABELS.pressing[activeTacticalAlert.suggestedPressing]}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'balanced', 'high', 'gegenpress'] as PressingIntensity[]).map(pressing => {
                  const isSelected = userClub.tactics?.pressingIntensity === pressing;
                  const isSuggested = activeTacticalAlert?.suggestedPressing === pressing;
                  const labels: Record<PressingIntensity, string> = {
                    'low': 'منخفض',
                    'balanced': 'متوازن',
                    'high': 'عالي',
                    'gegenpress': 'عكسي ⚡',
                  };
                  return (
                    <button
                      key={pressing}
                      onClick={() => changeLivePressing(pressing)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black shadow-sm'
                          : isSuggested
                          ? 'bg-yellow-500/10 border-yellow-400/70 text-yellow-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{labels[pressing]}</span>
                      {isSuggested && !isSelected && (
                        <span className="absolute -top-1 -right-0.5 text-[8px] text-yellow-400 font-black">★</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Live Substitution Drawer / Modal */}
        {showSubModal && (
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-4 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>إجراء تبديل تكتيكي في الملعب ({liveMatch.substitutionsCount || 0}/5 مستخدمة)</span>
              </h4>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                إلغاء ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Player to Exit (Starting XI) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>اللاعب المغادر (الأساسيون):</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {startingPlayers.length} في الملعب
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 border border-slate-800/80 rounded-2xl p-2 bg-slate-950/60">
                  {startingPlayers.map(p => {
                    const isSelected = selectedOutPlayerId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedOutPlayerId(p.id)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-red-950/80 border-red-500 text-white shadow-md ring-1 ring-red-500/50'
                            : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0 border border-slate-700">
                            {p.overallRating}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{p.name}</p>
                            <span className="text-[10px] text-slate-400">{getPositionArabic(p.position)} ({p.position})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-mono">لياقة: {p.fitness}%</span>
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${p.fitness > 70 ? 'bg-emerald-500' : p.fitness > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${p.fitness}%` }}
                              />
                            </div>
                          </div>
                          {isSelected && <span className="text-xs text-red-400 font-black">خروج ⬇</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Select Player to Enter (Bench) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>اللاعب البديل (دكة البدلاء):</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {benchPlayers.length} بدلاء متاحين
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 border border-slate-800/80 rounded-2xl p-2 bg-slate-950/60">
                  {benchPlayers.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">لا يوجد بدلاء متاحين على الدكة</div>
                  ) : (
                    benchPlayers.map(p => {
                      const isSelected = selectedInPlayerId === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedInPlayerId(p.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/50'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-emerald-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0 border border-slate-700">
                              {p.overallRating}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{p.name}</p>
                              <span className="text-[10px] text-slate-400">{getPositionArabic(p.position)} ({p.position})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 font-mono">جاهزية: {p.fitness}%</span>
                              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${p.fitness > 70 ? 'bg-emerald-500' : p.fitness > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${p.fitness}%` }}
                                />
                              </div>
                            </div>
                            {isSelected && <span className="text-xs text-emerald-400 font-black">دخول ⬆</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Selected Summary & Confirmation */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-300">
                {selectedOutPlayerId && selectedInPlayerId ? (
                  <span className="flex items-center gap-1.5">
                    خروج <strong className="text-red-400">{startingPlayers.find(p => p.id === selectedOutPlayerId)?.name}</strong> (طاقة {startingPlayers.find(p => p.id === selectedOutPlayerId)?.overallRating}) 
                    ↔️ 
                    دخول <strong className="text-emerald-400">{benchPlayers.find(p => p.id === selectedInPlayerId)?.name}</strong> (طاقة {benchPlayers.find(p => p.id === selectedInPlayerId)?.overallRating})
                  </span>
                ) : (
                  <span className="text-slate-400">يرجى تحديد لاعب من الأساسيين ولاعب من البدلاء لتنفيذ التبديل</span>
                )}
              </div>

              <button
                onClick={handleExecuteSub}
                disabled={!selectedOutPlayerId || !selectedInPlayerId}
                className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                تأكيد التبديل ونزول اللاعب 🔄
              </button>
            </div>
          </div>
        )}

        {/* Halftime Locker Room Modal */}
        {liveMatch.isHalfTime && (
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-5 space-y-4 shadow-2xl animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
            <div className="text-center space-y-1">
              <h3 className="font-black text-lg text-white">استراحة الشوطين - غرفة تبديل الملابس 🚪</h3>
              <p className="text-xs text-slate-400">
                النتيجة الحالية: <span className="text-amber-300 font-bold font-mono">{liveMatch.homeScore} : {liveMatch.awayScore}</span>
              </p>
            </div>

            {/* Team Talk Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-300">حديث المدرب للاعبين بين الشوطين:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'motivate', label: 'تحفيز وتشجيع', desc: '+5% معنويات وعزيمة للفريق' },
                  { id: 'demand', label: 'مطالبة بمزيد من التركيز', desc: 'تركيز دفاعي وتقليل الأخطاء' },
                  { id: 'calm', label: 'تهدئة اللعب والحفاظ على النتيجة', desc: 'انضباط تكتيكي واستحواذ هادئ' },
                ].map(talk => (
                  <button
                    key={talk.id}
                    onClick={() => setTeamTalkChosen(talk.id)}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                      teamTalkChosen === talk.id
                        ? 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs text-amber-400">{talk.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{talk.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Halftime Tactical Advisory Box */}
            {activeTacticalAlert && (
              <div className="bg-slate-950/90 border border-amber-500/60 rounded-2xl p-3.5 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>تقرير وتوصية المساعد الفني للشوط الثاني: {activeTacticalAlert.badge}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">استراحة الشوطين</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeTacticalAlert.situation}
                </p>
                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <div className="text-slate-200">
                      التشكيل الموصى به: <strong className="text-emerald-400 font-mono font-black">{activeTacticalAlert.suggestedFormation}</strong>
                      {activeTacticalAlert.suggestedMentality && (
                        <span> | العقلية: <strong className="text-amber-300">{TACTICAL_ARABIC_LABELS.mentality[activeTacticalAlert.suggestedMentality]}</strong></span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {activeTacticalAlert.rationale}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApplyTacticalAlert(activeTacticalAlert)}
                    className="w-full sm:w-auto py-2 px-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>تطبيق توصية الشوط الثاني ⚡</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Formation Adjustment at Halftime */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">تغيير التشكيل للشوط الثاني (اختياري):</label>
                {activeTacticalAlert?.suggestedFormation && (
                  <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>الموصى به: {activeTacticalAlert.suggestedFormation}</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'] as FormationType[]).map(form => {
                  const isSelected = userClub?.tactics?.formation === form;
                  const isSuggested = activeTacticalAlert?.suggestedFormation === form;
                  return (
                    <button
                      key={form}
                      onClick={() => setFormation(form)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : isSuggested
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/60'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{form}</span>
                      {isSuggested && !isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resume 2nd Half Action Button */}
            <div className="pt-1">
              <button
                onClick={() => resumeSecondHalf(teamTalkChosen === 'motivate' || teamTalkChosen === 'demand')}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>استئناف الشوط الثاني (الدقائق 46 - 90)</span>
              </button>
            </div>
          </div>
        )}

        {/* Compact Isolated Commentary Stream Container (Non-Intrusive) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-xl">
          <div 
            onClick={() => setShowCommentary(!showCommentary)}
            className="flex items-center justify-between border-b border-slate-800 pb-2.5 cursor-pointer select-none"
          >
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>شريط التعليق الصوتي وأحداث اللقاء</span>
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">{visibleEvents.length} أحداث</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showCommentary ? 'rotate-180' : ''}`} />
            </div>
          </div>

          {showCommentary && (
            <div ref={commentaryScrollRef} className="space-y-2 max-h-52 overflow-y-auto pr-1 scroll-smooth">
              {visibleEvents.length === 0 ? (
                <div className="text-center py-5 text-xs text-slate-500">
                  صافرة البداية تنطلق.. الفريقان يتحسسان أرضية الملعب في الدقائق الأولى!
                </div>
              ) : (
                visibleEvents.map((evt, idx) => (
                  <div 
                    key={idx}
                    className={`p-2 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                      evt.type === 'goal'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold animate-pulse'
                        : evt.type === 'yellow_card'
                        ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                        : evt.type === 'save'
                        ? 'bg-blue-950/60 border-blue-600/60 text-blue-200'
                        : evt.type === 'chance'
                        ? 'bg-purple-950/60 border-purple-600/60 text-purple-200'
                        : evt.type === 'substitution'
                        ? 'bg-cyan-950/60 border-cyan-600/60 text-cyan-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="font-mono font-black text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                      {evt.minute}'
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Live Match Stats Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>إحصائيات المباراة المباشرة</span>
          </h4>

          <div className="space-y-2 text-xs">
            {[
              { label: 'إجمالي التسديدات', home: liveMatch.stats.homeShots, away: liveMatch.stats.awayShots },
              { label: 'التسديدات على المرمى', home: liveMatch.stats.homeShotsOnTarget, away: liveMatch.stats.awayShotsOnTarget },
              { label: 'الهجمات الخطيرة', home: liveMatch.homeDangerousAttacks || 0, away: liveMatch.awayDangerousAttacks || 0 },
              { label: 'الضربات الركنية', home: liveMatch.stats.homeCorners, away: liveMatch.stats.awayCorners },
              { label: 'الأخطاء المرتكبة', home: liveMatch.stats.homeFouls, away: liveMatch.stats.awayFouls },
              { label: 'البطاقات الصفراء', home: liveMatch.stats.homeYellowCards, away: liveMatch.stats.awayYellowCards },
            ].map((stat, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                <span className="font-bold font-mono text-emerald-400 w-8 text-center">{stat.home}</span>
                <span className="text-slate-400 text-[11px]">{stat.label}</span>
                <span className="font-bold font-mono text-blue-400 w-8 text-center">{stat.away}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // Handle Opponent Scouting Action
  const handleScoutOpponent = (oppClubId: string) => {
    setIsScoutingLoading(true);
    setTimeout(() => {
      const res = scoutOpponent(oppClubId);
      setIsScoutingLoading(false);
      setScoutingToast({ text: res.message, isError: !res.success });
      setTimeout(() => setScoutingToast(null), 5000);
    }, 300);
  };

  // Not in live match: Show Fixtures & Round Schedule
  return (
    <div className="space-y-4 pb-20 animate-fade-in font-['Cairo',sans-serif]">
      
      {/* Toast Notification Banner */}
      {scoutingToast && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-between gap-2 ${
            scoutingToast.isError
              ? 'bg-rose-950 border border-rose-600 text-rose-200'
              : 'bg-emerald-950 border border-emerald-500 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {scoutingToast.isError ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{scoutingToast.text}</span>
          </div>
          <button
            onClick={() => setScoutingToast(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner & Match Day Gate */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">
              {userFixture?.tournamentBadge ? `${userFixture.tournamentBadge} - ${userFixture.stageName || 'جدول المباريات الرسمية'}` : 'جدول المباريات الرسمية (الدوري والبطولات)'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn_restart_season_matches_tab"
              onClick={() => setShowRestartSeasonModal(true)}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="إعادة بداية الموسم الحالي وإلغاء نتائج الجولات والتعاقدات"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>إعادة بداية الموسم</span>
            </button>
            <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-bold text-amber-400">
              {seasonFinished ? 'الموسم انتهى' : `الجولة الحالية: ${currentRound} / ${totalRounds}`}
            </span>
          </div>
        </div>

        {/* Dynamic Match Day State Dispatch */}
        {seasonFinished ? (
          <button
            id="review_season_btn"
            onClick={openSeasonModal}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-amber-950/60 transition-all active:scale-95 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>مراجعة ختام الموسم {season.seasonNumber} وبدء الموسم التالي</span>
          </button>
        ) : !userFixture ? (
          /* User club has no fixture in this round (e.g. bye round in odd teams) */
          <div className="space-y-3">
            <div className="p-3.5 bg-indigo-950/50 border border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-300">
                <span className="text-xl">☕</span>
                <div>
                  <div className="text-white font-black text-sm">أسبوع راحة لفريقك في الجولة {currentRound}</div>
                  <div className="text-indigo-300/80 text-[11px] font-normal">تُقام مباريات الدوري لباقي الفرق المتنافسة. يمكنك محاكاة الجولة أو التقدم بالتقويم.</div>
                </div>
              </div>
              <span className="text-xs bg-indigo-900/60 text-indigo-200 px-2.5 py-1 rounded-full font-mono border border-indigo-700/50 shrink-0">
                الجولة {currentRound}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="instant_simulate_round_rest_btn"
                disabled={isSimulationRunning}
                onClick={() => instantSimulateCurrentRound()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Zap className="w-4 h-4 text-cyan-300" />
                <span>{isSimulationRunning ? 'جارٍ المحاكاة...' : `محاكاة نتائج مباريات الجولة ${currentRound} لباقي الفرق ⚡`}</span>
              </button>

              <button
                id="advance_day_rest_btn"
                disabled={isSimulationRunning}
                onClick={() => advanceToNextDay(false)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>التقدم بالتقويم (+1 يوم) ➔</span>
              </button>
            </div>
          </div>
        ) : (userFixture && userFixture.isPlayed) ? (
          /* MATCH IN THIS ROUND ALREADY PLAYED */
          <div className="space-y-3">
            {(() => {
              const homeClub = (teams.find(t => t && t.id === userFixture.homeTeamId) || (userFixture.homeTeamId ? findClubInWorld(userFixture.homeTeamId) : undefined));
              const awayClub = (teams.find(t => t && t.id === userFixture.awayTeamId) || (userFixture.awayTeamId ? findClubInWorld(userFixture.awayTeamId) : undefined));
              const homeName = homeClub?.name || getClubDisplayName(userFixture.homeTeamId, teams);
              const awayName = awayClub?.name || getClubDisplayName(userFixture.awayTeamId, teams);
              const compLabel = userFixture.tournamentBadge || 'الدوري الممتاز';
              const stageLabel = userFixture.stageName || `الجولة ${userFixture.round || currentRound}`;
              const goalEvents = (userFixture.events || []).filter(e => e && e.type === 'goal');
              const homeGoals = goalEvents
                .filter(e => e.teamId === userFixture.homeTeamId)
                .map(e => `${e.playerName || 'لاعب'} '${e.minute}`);
              const awayGoals = goalEvents
                .filter(e => e.teamId === userFixture.awayTeamId)
                .map(e => `${e.playerName || 'لاعب'} '${e.minute}`);

              return (
                <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/60 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-300 font-bold border-b border-emerald-800/50 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{compLabel} - {stageLabel}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">النتيجة النهائية</span>
                  </div>

                  <div className="text-center font-black text-sm sm:text-base text-white py-1">
                    <span>{homeName}</span>
                    <span className="mx-2.5 px-2.5 py-0.5 rounded-lg bg-slate-950/90 border border-emerald-500/40 text-amber-400 font-mono">
                      {userFixture.homeScore} - {userFixture.awayScore}
                    </span>
                    <span>{awayName}</span>
                  </div>

                  {goalEvents.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-emerald-800/40 text-[11px]">
                      <div className="text-right text-emerald-200 font-semibold">
                        {homeGoals.length > 0 ? `⚽ ${homeGoals.join('، ')}` : '—'}
                      </div>
                      <div className="text-left text-amber-200 font-semibold border-r border-emerald-800/40 pl-1">
                        {awayGoals.length > 0 ? `⚽ ${awayGoals.join('، ')}` : '—'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="advance_next_round_completed_btn"
                disabled={isSimulationRunning}
                onClick={() => advanceToNextDay(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FastForward className="w-4 h-4 text-amber-300" />
                <span>التقدم للجولة التالية ({currentRound + 1}) ⏩</span>
              </button>

              <button
                id="advance_day_completed_btn"
                disabled={isSimulationRunning}
                onClick={() => advanceToNextDay(false)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>اليوم التالي (+1)</span>
              </button>
            </div>
          </div>
        ) : isMatchDay ? (
          /* MATCH DAY IS ACTIVE */
          <div className="space-y-3">
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>اليوم موعد مباراة رسمية: {userFixture?.stageName || userFixture?.tournamentBadge || `الجولة ${currentRound}`}! ⚽</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">{userFixture?.tournamentBadge || `الجولة ${currentRound}`}</span>
            </div>

            {/* World Star Loan Banner (عقد إعارة نجم عالمي لمباراة واحدة) */}
            <div 
              id="btn_open_world_star_loan_modal"
              onClick={() => setShowWorldStarModal(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-slate-900 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-lg active:scale-[0.99] flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      {activeGuestStar 
                        ? `🌟 النجم العالمي: ${activeGuestStar.name} (${activeGuestStar.overallRating}) في تشكيلتك!` 
                        : '🌟 استعارة نجم عالمي لمباراة اليوم (2x Ads)'}
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full font-bold">
                      {activeGuestStar ? 'مباراة واحدة' : 'عقد ذهبي 2x'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeGuestStar 
                      ? `${activeGuestStar.nickname} جاهز في الخطة الأساسية، وسيغادر فور نهاية المباراة.`
                      : 'احصل على نجم عالمي عشوائي (ميسي، رونالدو، مبابي، صلاح، أو بطاقة حظ) لخوض مباراة اليوم!'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:text-amber-300">
                <span>{activeGuestStar ? 'تفاصيل / استبدال' : 'استدعاء النجم'}</span>
                <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
              </div>
            </div>

            <div className="w-full">
              <button
                id="start_live_match_btn"
                disabled={isSimulationRunning}
                onClick={() => userFixture?.id ? startLiveMatch(userFixture.id) : startLiveMatch()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>خوض مباراة ({userFixture?.stageName || `الجولة ${currentRound}`}) لايف الآن ⚽⚡</span>
              </button>
            </div>
          </div>
        ) : (
          /* NOT MATCH DAY - PRE-MATCH TRAINING & PREPARATION HUB */
          <div className="space-y-3">
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <CalendarDays className="w-4 h-4 text-amber-400" />
                  <span>{t('not_match_day_title')}</span>
                </div>
                <span className="text-[11px] bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-full font-mono border border-slate-700">
                  متبقي {daysUntilNextMatch} أيام
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                اليوم مخصص للحصص التدريبية والتحضير الفني والتجسس على خطة المنافس. يمكنك استغلال الأيام المتبقية أو التقدم مباشرة لموعد اللقاء.
              </p>
            </div>

            {/* Quick Calendar Advancing Actions & Direct Play */}
            <div className="space-y-2">
              <button
                id="play_match_now_prematch_btn"
                onClick={() => userFixture?.id ? startLiveMatch(userFixture.id) : startLiveMatch()}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>خوض مباراة الجولة {currentRound} الآن فوراً والانتقال للملعب ⚽⚡</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  id="advance_fast_to_match_btn"
                  onClick={() => advanceToNextDay(true)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer"
                >
                  <FastForward className="w-4 h-4 text-amber-300" />
                  <span>التقدم لموعد المباراة (تخطي {daysUntilNextMatch} أيام) ⏩</span>
                </button>

                <button
                  id="advance_single_day_btn"
                  onClick={() => advanceToNextDay(false)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>محاكاة اليوم التالي فقط (+1) ➔</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MATCH PREVIEW, COACHING ADVICE & OPPONENT SPY HUB */}
      {upcomingMatchAnalysis && userFixture && !userFixture.isPlayed && (
        <div className="space-y-4">

          {/* 1. Coaching Tips & Tactical Advice Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {t('match_tips_title')}
                </h3>
              </div>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono border border-slate-700">
                {upcomingMatchAnalysis.isUserHome ? 'ملعبك (المضيف)' : 'خارج الديار (الضيف)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Tactical Hint */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-teal-400" />
                  <span>توجيه تكتيكي ذكي:</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {(upcomingMatchAnalysis?.oppSquad?.overall || 65) > (upcomingMatchAnalysis?.userSquad?.overall || 65)
                    ? `فريق ${upcomingMatchAnalysis?.oppClub?.name || 'المنافس'} يتفوق في القوة الإجمالية. يُنصح بالاعتماد على التكتيك المتوازن أو الهجمات المرتدة وتضييق المساحات في الثلث الدفاعي.`
                    : `فريقك يمتلك أفضلية القوة الفنية. يُنصح بفرض أسلوب الاستحواذ الهجومي والضغط في نصف ملعب المنافس لحسم اللقاء مبكراً.`}
                </p>
              </div>

              {/* Squad & Fitness Hint */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>الجاهزية البدنية والتناوب:</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {(upcomingMatchAnalysis?.userSquad?.benchOverall || 65) < 65
                    ? `دكة البدلاء بحاجة لتعزيز في سوق الانتقالات. احرص على تدوير اللاعبين المصابين بالإرهاق قبل انطلاق صافرة البداية.`
                    : `دكة البدلاء جاهزة لإحداث الفارق في الشوط الثاني عند استبدال العناصر المجهدة.`}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Opponent Scouting & Spy Hub (Cost: 100k EGP) */}
          {(() => {
            const oppId = upcomingMatchAnalysis?.oppClub?.id;
            if (!oppId) return null;
            const existingReport = scoutedOpponents[oppId];
            const canAfford = (userClub?.budget || 0) >= 100000;

            return (
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-amber-400 animate-pulse" />
                    <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                      <span>{t('spy_scout_title')}</span>
                    </h3>
                  </div>

                  {existingReport ? (
                    <span className="text-[11px] px-3 py-1 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{t('scouted_status')} (ثقة {existingReport.scoutConfidenceRating}%)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] px-3 py-1 rounded-full font-bold bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('scout_cost_label')}: 100,000 ج.م</span>
                    </span>
                  )}
                </div>

                {/* If already scouted -> Render Full Confidential Intelligence Dossier */}
                {existingReport ? (
                  <div className="space-y-3.5">
                    {/* Summary Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">{t('predicted_formation')}</span>
                        <span className="font-mono font-bold text-amber-400">{existingReport.predictedFormation}</span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">أسلوب اللعب</span>
                        <span className="font-bold text-sky-400">
                          {existingReport.predictedMentality === 'attacking' ? 'هجومي ضاغط' : existingReport.predictedMentality === 'defensive' ? 'دفاعي حذر' : 'متوازن'}
                        </span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">كثافة الضغط</span>
                        <span className="font-bold text-emerald-400">
                          {existingReport.predictedPressing === 'high' ? 'ضغط عالي' : existingReport.predictedPressing === 'low' ? 'تراجع دفاعي' : 'ضغط متوسط'}
                        </span>
                      </div>
                      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">دقة تقرير الكشاف</span>
                        <span className="font-mono font-black text-emerald-400">{existingReport.scoutConfidenceRating}% ⭐</span>
                      </div>
                    </div>

                    {/* Key Threat Players */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
                      <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>{t('key_threats')}:</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(existingReport.keyThreatPlayers || []).map((threat, idx) => (
                          <div key={threat.id || idx} className="bg-slate-900/90 border border-rose-900/40 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-xs text-white">{threat.name} ({threat.position})</div>
                              <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-mono font-bold">
                                تقييم {threat.rating}
                              </span>
                            </div>
                            <div className="text-[11px] text-amber-300/90 font-medium">
                              🎯 الخطر: {threat.threatDescription}
                            </div>
                            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                              <span className="text-emerald-400 font-bold">توجيه الرقابة: </span>
                              {threat.markingAdvice}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tactical Weaknesses & Exploits */}
                    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-amber-400" />
                        <span>{t('tactical_weaknesses')}:</span>
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {(existingReport.tacticalWeaknesses || []).map((weakness, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-amber-400 font-bold shrink-0">⚠️</span>
                            <span>{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Counter-Strategy */}
                    <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>{t('counter_strategy')}:</span>
                      </span>
                      
                      {typeof existingReport.recommendedCounterStrategy === 'object' && existingReport.recommendedCounterStrategy !== null ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            <span className="bg-slate-900 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg font-mono">
                              التشكيل المقترح: <strong>{existingReport.recommendedCounterStrategy.suggestedFormation}</strong>
                            </span>
                            <span className="bg-slate-900 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg">
                              النهج: <strong>{existingReport.recommendedCounterStrategy.suggestedMentality === 'attacking' ? 'هجومي' : existingReport.recommendedCounterStrategy.suggestedMentality === 'defensive' ? 'دفاعي' : 'متوازن'}</strong>
                            </span>
                            <span className="bg-slate-900 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg">
                              الضغط: <strong>{existingReport.recommendedCounterStrategy.suggestedPressing === 'high' ? 'عالي' : 'متوازن'}</strong>
                            </span>
                          </div>
                          <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
                            {existingReport.recommendedCounterStrategy.tacticalTip}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-200/90 leading-relaxed font-medium">
                          {String(existingReport.recommendedCounterStrategy || '')}
                        </p>
                      )}
                    </div>

                    {/* Set-Piece & Stamina Insights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                        <span className="text-slate-400 font-bold block mb-1">🎯 الكرات الثابتة:</span>
                        {existingReport.setPieceVulnerability}
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                        <span className="text-slate-400 font-bold block mb-1">⚡ المخزون البدني:</span>
                        {existingReport.staminaAndFormInsight}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Not yet scouted CTA Box */
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                      <Search className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-white">
                        هل ترغب في كشف خطة وتكتيك ومفاتيح لعب {upcomingMatchAnalysis.oppClub.name}؟
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        سيقوم فريق الكشافين السريين بحضور تدريبات المنافس وتزويدك بتقرير شامل عن الخطة، أخطر العناصر، الثغرات الدفاعية، والخطة المضادة للفوز باللقاء.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        id="scout_opponent_action_btn"
                        onClick={() => handleScoutOpponent(oppId)}
                        disabled={isScoutingLoading || !canAfford}
                        className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/60'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>
                          {isScoutingLoading
                            ? 'جاري إرسال الكشاف وإعداد التقرير...'
                            : `طلب تقرير التجسس الكشفي (100,000 ج.م) 🕵️‍♂️`}
                        </span>
                      </button>

                      {!canAfford && (
                        <span className="text-xs text-rose-400 font-bold">
                          رصيد النادي غير كافٍ ({(userClub?.budget || 0).toLocaleString()} ج.م)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 3. Pre-Match Technical Odds & Manager Comparison Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {t('match_preview')}
                </h3>
              </div>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono border border-slate-700">
                {upcomingMatchAnalysis?.isUserHome ? 'ملعبك (المضيف)' : 'خارج الديار (الضيف)'}
              </span>
            </div>

            {/* 3D Broadcast Club Shields Face-off Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/50 via-slate-950 to-rose-950/50 p-4 flex items-center justify-around gap-3 shadow-inner">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <ClubCrest3DShield
                  clubName={userClub?.name || 'فريقك'}
                  primaryColor={userClub?.primaryColor || '#10b981'}
                  secondaryColor={userClub?.secondaryColor || '#ffffff'}
                  reputation={upcomingMatchAnalysis?.userSquad?.overall || 70}
                  size="md"
                />
                <span className="text-xs font-black text-white">{userClub?.name || 'فريقك'}</span>
                <span className="text-[10px] text-emerald-400 font-bold">نادي المدرب</span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-amber-500/50 flex items-center justify-center font-black text-amber-400 text-xs shadow-lg">
                  VS
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {userFixture?.stageName || `الجولة ${currentRound}`}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1.5 text-center">
                <ClubCrest3DShield
                  clubName={upcomingMatchAnalysis?.oppClub?.name || 'المنافس'}
                  primaryColor={upcomingMatchAnalysis?.oppClub?.primaryColor || '#e11d48'}
                  secondaryColor={upcomingMatchAnalysis?.oppClub?.secondaryColor || '#ffffff'}
                  reputation={upcomingMatchAnalysis?.oppSquad?.overall || 70}
                  size="md"
                />
                <span className="text-xs font-black text-white">{upcomingMatchAnalysis?.oppClub?.name || 'المنافس'}</span>
                <span className="text-[10px] text-rose-400 font-bold">المنافس القادم</span>
              </div>
            </div>

            {/* Manager vs Manager Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>{t('manager_vs_manager')}</span>
                </span>
                <span className="text-slate-400 text-[10px]">مواجهة فنية وتكتيكية</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* User Manager */}
                <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-black text-emerald-300 text-xs shrink-0">
                      {(manager?.name || 'م').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{manager?.name || 'المدرب'}</h4>
                      <span className="text-[10px] text-emerald-400 block font-medium">(أنت - {userClub?.name || 'فريقك'})</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_strength')}:</span>
                      <span className="font-mono font-black text-emerald-400 text-xs">{userDynamicManagerRating || 50} ⭐</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_points')}:</span>
                      <span className="font-mono text-slate-200">{(manager?.rankingPoints || 1200).toLocaleString()} نقطة</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('preferred_formation')}:</span>
                      <span className="font-mono font-bold text-slate-300">{userClub?.tactics?.formation || '4-3-3'}</span>
                    </div>
                  </div>
                </div>

                {/* Opponent Manager */}
                <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center font-black text-rose-300 text-xs shrink-0">
                      {(upcomingMatchAnalysis?.oppManager?.name || 'م').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{upcomingMatchAnalysis?.oppManager?.name || 'مدرب المنافس'}</h4>
                      <span className="text-[10px] text-rose-400 block font-medium">({upcomingMatchAnalysis?.oppClub?.name || 'المنافس'})</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_strength')}:</span>
                      <span className="font-mono font-black text-rose-400 text-xs">{upcomingMatchAnalysis?.oppManager?.rating || 65} ⭐</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_ranking')}:</span>
                      <span className="font-mono text-slate-200">#{upcomingMatchAnalysis?.oppManager?.worldRank || 450} عالمياً</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('preferred_formation')}:</span>
                      <span className="font-mono font-bold text-slate-300">{upcomingMatchAnalysis?.oppManager?.preferredFormation || '4-3-3'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Squad Strengths Comparison */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{t('squad_strength_title')}</span>
              </h4>

              <div className="space-y-2 text-xs">
                {[
                  {
                    label: t('overall_strength'),
                    userVal: upcomingMatchAnalysis?.userSquad?.overall || 65,
                    oppVal: upcomingMatchAnalysis?.oppSquad?.overall || 65
                  },
                  {
                    label: t('attack'),
                    userVal: upcomingMatchAnalysis?.userSquad?.attack || 65,
                    oppVal: upcomingMatchAnalysis?.oppSquad?.attack || 65
                  },
                  {
                    label: t('midfield'),
                    userVal: upcomingMatchAnalysis?.userSquad?.midfield || 65,
                    oppVal: upcomingMatchAnalysis?.oppSquad?.midfield || 65
                  },
                  {
                    label: t('defense'),
                    userVal: upcomingMatchAnalysis?.userSquad?.defense || 65,
                    oppVal: upcomingMatchAnalysis?.oppSquad?.defense || 65
                  },
                  {
                    label: t('goalkeeping'),
                    userVal: upcomingMatchAnalysis?.userSquad?.goalkeeper || 65,
                    oppVal: upcomingMatchAnalysis?.oppSquad?.goalkeeper || 65
                  },
                  {
                    label: t('bench_strength'),
                    userVal: upcomingMatchAnalysis?.userSquad?.benchOverall || 65,
                    oppVal: upcomingMatchAnalysis?.oppSquad?.benchOverall || 65
                  },
                ].map((row, idx) => {
                  const isUserAhead = row.userVal > row.oppVal;
                  const isOppAhead = row.oppVal > row.userVal;
                  const total = (row.userVal + row.oppVal) || 1;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-mono font-bold ${isUserAhead ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {userClub?.shortName || userClub?.name || 'فريقك'}: {row.userVal}
                        </span>
                        <span className="text-slate-400 font-medium">{row.label}</span>
                        <span className={`font-mono font-bold ${isOppAhead ? 'text-rose-400' : 'text-slate-300'}`}>
                          {upcomingMatchAnalysis?.oppClub?.shortName || upcomingMatchAnalysis?.oppClub?.name || 'المنافس'}: {row.oppVal}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${(row.userVal / total) * 100}%` }} 
                        />
                        <div 
                          className="bg-rose-500 transition-all duration-500" 
                          style={{ width: `${(row.oppVal / total) * 100}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Match Probabilities Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-400" />
                  <span>{t('match_chances')}</span>
                </span>
                <span className="text-[10px] text-slate-400">محاكاة احتمالية النتيجة</span>
              </h4>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">{t('home_win_chance')}</span>
                  <span className="font-mono font-black text-base text-emerald-400">
                    {upcomingMatchAnalysis?.odds?.homeWin ?? 40}%
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">{t('draw_chance')}</span>
                  <span className="font-mono font-black text-base text-amber-400">
                    {upcomingMatchAnalysis?.odds?.draw ?? 30}%
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">{t('away_win_chance')}</span>
                  <span className="font-mono font-black text-base text-blue-400">
                    {upcomingMatchAnalysis?.odds?.awayWin ?? 30}%
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {upcomingMatchAnalysis?.odds?.tacticalEdge === 'home'
                    ? t('tactical_edge_home')
                    : upcomingMatchAnalysis?.odds?.tacticalEdge === 'away'
                    ? t('tactical_edge_away')
                    : t('tactical_edge_balanced')}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 4. Fixture Views: Team Calendar vs Current Round */}
      <div className="space-y-3">
        {/* Sleek Segmented Switcher */}
        <div className="flex items-center justify-between p-1 bg-slate-900 border border-slate-800 rounded-2xl gap-1 text-xs">
          <button
            onClick={() => setScheduleViewMode('team')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
              scheduleViewMode === 'team'
                ? 'bg-slate-800 text-emerald-400 shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>جدول مباريات فريقي 📅 ({userCalendarSchedule.length})</span>
          </button>

          <button
            onClick={() => setScheduleViewMode('round')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
              scheduleViewMode === 'round'
                ? 'bg-slate-800 text-amber-400 shadow-md border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-4 h-4 text-amber-400" />
            <span>مباريات الجولة الحالية ⚽ (الجولة {currentRound})</span>
          </button>
        </div>

        {/* View Mode 1: Team-Centric Master Schedule (Chronological Real Calendar) */}
        {scheduleViewMode === 'team' ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span>التقويم الزمني الموحد لمباريات {userClub?.name || 'فريقك'} (من 15 أغسطس حتى 30 مايو)</span>
              </h3>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono border border-slate-700">
                {userCalendarSchedule.filter(m => m.isPlayed).length} / {userCalendarSchedule.length} مباراة
              </span>
            </div>

            {userCalendarSchedule.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
                لا توجد مباريات مجدولة حالياً.
              </div>
            ) : (
              <div className="space-y-2">
                {userCalendarSchedule.map(fixture => {
                  if (!fixture) return null;
                  const home = (teams.find(t => t && t.id === fixture.homeTeamId) || (fixture.homeTeamId ? findClubInWorld(fixture.homeTeamId) : undefined)) || { name: getClubDisplayName(fixture.homeTeamId, teams), shortName: 'مض', primaryColor: '#334155', isUserClub: fixture.homeTeamId === userClub?.id };
                  const away = (teams.find(t => t && t.id === fixture.awayTeamId) || (fixture.awayTeamId ? findClubInWorld(fixture.awayTeamId) : undefined)) || { name: getClubDisplayName(fixture.awayTeamId, teams), shortName: 'ضف', primaryColor: '#334155', isUserClub: fixture.awayTeamId === userClub?.id };
                  const isUserHome = fixture.homeTeamId === userClub?.id;
                  const oppClub = isUserHome ? away : home;
                  const isToday = fixture.date === calendarDate?.rawDateStr;
                  const isUpcomingNext = !fixture.isPlayed && fixture.id === userFixture?.id;

                  // Result indicator
                  let resultBadge = null;
                  if (fixture.isPlayed && typeof fixture.homeScore === 'number' && typeof fixture.awayScore === 'number') {
                    const userScore = isUserHome ? fixture.homeScore : fixture.awayScore;
                    const oppScore = isUserHome ? fixture.awayScore : fixture.homeScore;
                    if (userScore > oppScore) {
                      resultBadge = <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">فوز ✅</span>;
                    } else if (userScore === oppScore) {
                      resultBadge = <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">تعادل 🤝</span>;
                    } else {
                      resultBadge = <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">خسارة ❌</span>;
                    }
                  }

                  return (
                    <div
                      key={fixture.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isToday && !fixture.isPlayed
                          ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xl'
                          : isUpcomingNext
                          ? 'bg-slate-900/90 border-amber-500/50 shadow-md'
                          : fixture.isPlayed
                          ? 'bg-slate-900/60 border-slate-800/80 opacity-90'
                          : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      {/* Left: Tournament Badge & Stage info */}
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-lg shrink-0">
                          {fixture.tournamentId === 'ccl' ? '🏆' : fixture.tournamentId === 'cup' ? '🛡️' : '🇪🇬'}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">
                              {fixture.tournamentBadge || (fixture.tournamentId === 'ccl' ? '🏆 دوري أبطال إفريقيا' : fixture.tournamentId === 'cup' ? '🛡️ كأس مصر' : '🇪🇬 الدوري الممتاز')}
                            </span>
                            {resultBadge}
                            {isToday && !fixture.isPlayed && (
                              <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.2 rounded-full font-black animate-pulse">
                                مباراة اليوم ⚽
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>{fixture.stageName || fixture.stage || `الجولة ${fixture.round}`}</span>
                            <span>•</span>
                            <span className="font-mono text-cyan-400/90">{fixture.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Teams Head-to-Head + Goal Scorers */}
                      <div className="flex flex-col items-center justify-center flex-1 py-1 sm:py-0 gap-1">
                        <div className="flex items-center justify-center gap-2 w-full">
                          {/* Home Team */}
                          <div className="flex items-center gap-1.5 text-left justify-end flex-1 min-w-0">
                            <span className={`text-xs font-bold truncate ${home.isUserClub ? 'text-emerald-300 font-black' : 'text-slate-200'}`}>
                              {home.name}
                            </span>
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 text-white"
                              style={{ backgroundColor: home.primaryColor || '#334155' }}
                            >
                              {(home.shortName || home.name || 'م').slice(0, 1)}
                            </div>
                          </div>

                          {/* Score or VS */}
                          <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-xs shrink-0 text-center min-w-[60px]">
                            {fixture.isPlayed ? (
                              <span className="text-amber-400 text-sm">{fixture.homeScore} - {fixture.awayScore}</span>
                            ) : isToday ? (
                              <span className="text-emerald-400 text-xs font-bold">اليوم</span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">VS</span>
                            )}
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center gap-1.5 text-right justify-start flex-1 min-w-0">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 text-white"
                              style={{ backgroundColor: away.primaryColor || '#334155' }}
                            >
                              {(away.shortName || away.name || 'ض').slice(0, 1)}
                            </div>
                            <span className={`text-xs font-bold truncate ${away.isUserClub ? 'text-emerald-300 font-black' : 'text-slate-200'}`}>
                              {away.name}
                            </span>
                          </div>
                        </div>

                        {fixture.isPlayed && Array.isArray(fixture.events) && fixture.events.some((ev: any) => ev && ev.type === 'goal') && (
                          <div className="text-[10px] text-slate-300 text-center leading-relaxed">
                            ⚽ {fixture.events
                              .filter((ev: any) => ev && ev.type === 'goal')
                              .map((ev: any) => `${ev.playerName || 'لاعب'} '${ev.minute}`)
                              .join('، ')}
                          </div>
                        )}
                      </div>

                      {/* Right: Action or Status */}
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {isUserHome ? '🏟️ ملعبنا' : '✈️ خارج الديار'}
                        </span>

                        {isToday && !fixture.isPlayed && (
                          <button
                            onClick={() => startLiveMatch(fixture.id)}
                            disabled={isSimulationRunning}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>العب الآن</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* View Mode 2: Current Round Fixtures List */
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 px-1">
              {userFixture?.stageName 
                ? `مباريات ${userFixture.stageName} (الجولة ${currentRound})` 
                : `مباريات الجولة الحالية (${currentRound})`}
            </h3>
            
            <div className="space-y-2">
              {roundFixtures.map(fixture => {
                if (!fixture) return null;
                const home = (teams.find(t => t && t.id === fixture.homeTeamId) || (fixture.homeTeamId ? findClubInWorld(fixture.homeTeamId) : undefined)) || { name: getClubDisplayName(fixture.homeTeamId, teams), shortName: 'مض', primaryColor: '#334155', isUserClub: false };
                const away = (teams.find(t => t && t.id === fixture.awayTeamId) || (fixture.awayTeamId ? findClubInWorld(fixture.awayTeamId) : undefined)) || { name: getClubDisplayName(fixture.awayTeamId, teams), shortName: 'ضف', primaryColor: '#334155', isUserClub: false };
                const isUserGame = Boolean(home?.isUserClub || away?.isUserClub || (userClub?.id && (fixture.homeTeamId === userClub.id || fixture.awayTeamId === userClub.id)));

                const homeInitial = (home?.shortName || home?.name || 'مض').slice(0, 1);
                const awayInitial = (away?.shortName || away?.name || 'ضف').slice(0, 1);

                return (
                  <div
                    key={fixture.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      isUserGame
                        ? 'bg-emerald-950/40 border-emerald-600/70 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Home */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-left">
                        <span className={`text-xs font-bold truncate ${home.isUserClub ? 'text-emerald-300' : 'text-white'}`}>
                          {home.name}
                        </span>
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                          style={{ backgroundColor: home.primaryColor || '#334155' }}
                        >
                          {homeInitial}
                        </div>
                      </div>

                      {/* Score / VS */}
                      <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono font-black text-sm shrink-0 text-center">
                        {fixture.isPlayed ? (
                          <span className="text-amber-400">{fixture.homeScore} - {fixture.awayScore}</span>
                        ) : (
                          <span className="text-slate-500 text-xs">VS</span>
                        )}
                      </div>

                      {/* Away */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-start text-right">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                          style={{ backgroundColor: away.primaryColor || '#334155' }}
                        >
                          {awayInitial}
                        </div>
                        <span className={`text-xs font-bold truncate ${away.isUserClub ? 'text-emerald-300' : 'text-white'}`}>
                          {away.name}
                        </span>
                      </div>
                    </div>

                    {fixture.isPlayed && Array.isArray(fixture.events) && fixture.events.some(ev => ev && ev.type === 'goal') && (
                      <div className="pt-1 border-t border-slate-800/60 text-[10px] text-slate-300 text-center">
                        ⚽ {fixture.events
                          .filter(ev => ev && ev.type === 'goal')
                          .map(ev => `${ev.playerName || 'لاعب'} '${ev.minute}`)
                          .join('، ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Restart Season Modal */}
      <RestartSeasonModal
        isOpen={showRestartSeasonModal}
        onClose={() => setShowRestartSeasonModal(false)}
      />

      {/* World Star Loan Modal (2x Ads) */}
      <WorldStarLoanModal
        isOpen={showWorldStarModal}
        onClose={() => setShowWorldStarModal(false)}
        onNavigateToTactics={() => window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'tactics' } }))}
      />

    </div>
  );
};
