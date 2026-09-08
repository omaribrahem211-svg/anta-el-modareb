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
import {
  analyzeLiveMatchSituation,
  isTacticalAdviceApplied,
  TacticalAlert,
  TACTICAL_ARABIC_LABELS,
} from '../utils/tacticalAdvisor';
import confetti from 'canvas-confetti';
import {
  Swords,
  Play,
  Pause,
  FastForward,
  SkipForward,
  CheckCircle2,
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
  Sparkles,
  UserCheck,
  ChevronRight,
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
} from 'lucide-react';

export const MatchesTab: React.FC = () => {
  const {
    userClub,
    manager,
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
  } = useGame();

  const { t, language } = useLanguage();
  const commentaryScrollRef = useRef<HTMLDivElement>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedOutPlayerId, setSelectedOutPlayerId] = useState<string>('');
  const [selectedInPlayerId, setSelectedInPlayerId] = useState<string>('');
  const [isScoutingLoading, setIsScoutingLoading] = useState(false);
  const [scoutingToast, setScoutingToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [showScoutingModal, setShowScoutingModal] = useState(false);

  const isSkippingRef = React.useRef(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleSafeSkip = () => {
    if (isSkipping || isSkippingRef.current || !liveMatch || liveMatch.isFinished) return;
    isSkippingRef.current = true;
    setIsSkipping(true);
    try {
      skipLiveMatchToEnd();
    } finally {
      setTimeout(() => {
        isSkippingRef.current = false;
        setIsSkipping(false);
      }, 300);
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
  }, [liveMatch?.fixtureId, liveMatch?.currentMinute]);

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

  // Confetti on win after match finishes
  useEffect(() => {
    if (liveMatch && liveMatch.isFinished && userClub?.id) {
      const isUserHome = liveMatch.homeTeam?.id === userClub.id;
      const userGoals = isUserHome ? liveMatch.homeScore : liveMatch.awayScore;
      const oppGoals = isUserHome ? liveMatch.awayScore : liveMatch.homeScore;

      if (userGoals > oppGoals) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      }
    }
  }, [liveMatch?.isFinished]);

  // Current Round Fixtures
  const roundFixtures = (fixtures || []).filter(f => f && f.round === currentRound);
  const userFixture = userClub?.id && !manager.isUnemployed 
    ? roundFixtures.find(f => f && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id))
    : undefined;

  // Resolve upcoming match details for user club
  const upcomingMatchAnalysis = useMemo(() => {
    if (!userFixture || !userClub?.id) return null;
    const isUserHome = userFixture.homeTeamId === userClub.id;
    const oppTeamId = isUserHome ? userFixture.awayTeamId : userFixture.homeTeamId;
    const oppClub = (oppTeamId ? (teams.find(t => t && t.id === oppTeamId) || findClubInWorld(oppTeamId)) : null) || null;

    if (!oppClub) return null;

    const oppManager = oppClub.manager || getOrCreateClubManager(oppClub);
    const oppSquad = calculateSquadStrength(oppClub);
    const userSquad = userSquadStrength || calculateSquadStrength(userClub);

    const homeSquad = isUserHome ? userSquad : oppSquad;
    const awaySquad = isUserHome ? oppSquad : userSquad;
    const homeMgrRating = isUserHome ? (userDynamicManagerRating || 50) : (oppManager.rating || 65);
    const awayMgrRating = isUserHome ? (oppManager.rating || 65) : (userDynamicManagerRating || 50);

    const odds = calculateMatchProbabilities(homeSquad, awaySquad, homeMgrRating, awayMgrRating);

    return {
      isUserHome,
      oppClub,
      oppManager,
      oppSquad,
      userSquad,
      odds,
    };
  }, [userFixture, userClub, teams, userSquadStrength, userDynamicManagerRating]);

  // If in a live match
  if (liveMatch) {
    const isUserHome = userClub ? liveMatch.homeTeam?.id === userClub.id : false;
    const userGoals = isUserHome ? liveMatch.homeScore : liveMatch.awayScore;
    const oppGoals = isUserHome ? liveMatch.awayScore : liveMatch.homeScore;
    const isUserWin = userGoals > oppGoals;
    const isUserDraw = userGoals === oppGoals;

    // Filter events up to current minute
    const visibleEvents = (liveMatch.events || []).filter(e => e.minute <= liveMatch.currentMinute);

    const activeUserLineup = isUserHome ? (liveMatch.homeLineup || []) : (liveMatch.awayLineup || []);
    const userTeamObj = isUserHome ? liveMatch.homeTeam : liveMatch.awayTeam;
    const startingPlayers = (userTeamObj?.players || []).filter(p => activeUserLineup.includes(p.id));
    const benchPlayers = (userTeamObj?.players || []).filter(p => !activeUserLineup.includes(p.id));

    const handleExecuteSub = () => {
      if (!selectedOutPlayerId || !selectedInPlayerId) return;
      const res = makeLiveSubstitution(selectedOutPlayerId, selectedInPlayerId);
      setSubToast(res.message);
      setSelectedOutPlayerId('');
      setSelectedInPlayerId('');
      setTimeout(() => setSubToast(null), 4000);
      setShowSubModal(false);
    };

    return (
      <div className="space-y-4 pb-20 animate-fade-in">
        
        {/* Sticky-style Compact Scoreboard Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
          
          {/* Minute & Status Pill */}
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-bold text-slate-300">
              الجولة {liveMatch.fixture.round} من {totalRounds}
            </span>

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
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-white/20 mb-1.5"
                style={{ backgroundColor: liveMatch.homeTeam.primaryColor, color: '#fff' }}
              >
                {liveMatch.homeTeam.shortName.slice(0, 2)}
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
                    {liveMatch.homeTeam.manager?.name || 'المدرب'} ({liveMatch.homeTeam.manager?.rating || liveMatch.homeTeam.rating || 65} ⭐)
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
              <span className="text-[10px] text-slate-400 mt-1 font-medium">
                {liveMatch.isFinished ? 'النتيجة النهائية' : liveMatch.isHalfTime ? 'الشوط الأول' : 'مباشر'}
              </span>
            </div>

            {/* Away Team */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-white/20 mb-1.5"
                style={{ backgroundColor: liveMatch.awayTeam.primaryColor, color: '#fff' }}
              >
                {liveMatch.awayTeam.shortName.slice(0, 2)}
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
                    {liveMatch.awayTeam.manager?.name || 'المدرب'} ({liveMatch.awayTeam.manager?.rating || liveMatch.awayTeam.rating || 65} ⭐)
                  </span>
                )}
              </div>
            </div>
          </div>

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

          {/* In-Game Speed & Action Controls (if not finished) */}
          {!liveMatch.isFinished && !liveMatch.isHalfTime ? (
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={liveMatch.isPlaying ? pauseLiveMatch : resumeLiveMatch}
                className="col-span-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer"
              >
                {liveMatch.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{liveMatch.isPlaying ? 'إيقاف' : 'استئناف'}</span>
              </button>

              <button
                onClick={() => setMatchSpeed(liveMatch.speed === 1 ? 2 : liveMatch.speed === 2 ? 4 : 1)}
                className="col-span-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-mono font-bold text-xs py-2 rounded-xl cursor-pointer"
              >
                <FastForward className="w-4 h-4" />
                <span>{liveMatch.speed}x</span>
              </button>

              <button
                disabled={isSkipping}
                onClick={handleSafeSkip}
                className={`col-span-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs py-2 rounded-xl shadow-md cursor-pointer transition-all active:scale-95 ${
                  isSkipping ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                <SkipForward className="w-4 h-4" />
                <span>{isSkipping ? 'جاري التخطي...' : 'تخطي للنهاية (صافرة الحكم)'}</span>
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
                  {isUserWin ? '🎉 فوز رائع ومستحق! مكافأة الفوز ونقاط الخبرة أضيفت لرصيدك.' : isUserDraw ? '🤝 تعادل ونقطة إضافية في رصيد الدوري.' : '😔 هزيمة مؤسفة.. حان وقت التعويض في الجولة القادمة!'}
                </span>
              </div>

              <button
                disabled={isSimulationRunning}
                onClick={finishLiveMatchAndAdvance}
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

        {/* 2D Tactical Pitch Component */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>المحاكاة التكتيكية الحية للملعب (2D)</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              التبديلات: {liveMatch.substitutionsCount || 0}/5
            </span>
          </div>

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

            {/* Resume 2nd Half Action Button & Skip to end */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => resumeSecondHalf(teamTalkChosen === 'motivate' || teamTalkChosen === 'demand')}
                className="sm:col-span-2 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>استئناف الشوط الثاني (الدقائق 46 - 90)</span>
              </button>

              <button
                disabled={isSkipping}
                onClick={handleSafeSkip}
                className={`sm:col-span-1 py-3.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer ${
                  isSkipping ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                <SkipForward className="w-4 h-4" />
                <span>{isSkipping ? 'جاري التخطي...' : 'تخطي للنهاية'}</span>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">
              {userFixture?.competitionType === 'cup' 
                ? (userFixture.stageName || 'مباراة الكأس الوطنية 🏆') 
                : 'جدول المباريات الرسمية'}
            </h2>
          </div>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-bold text-amber-400">
            {seasonFinished ? 'الموسم انتهى' : `الجولة الحالية: ${currentRound} / ${totalRounds}`}
          </span>
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
          /* User club has no fixture in this round (e.g. knocked out of cup) */
          <div className="space-y-3">
            <div className="p-3.5 bg-indigo-950/50 border border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-300">
                <span className="text-xl">☕</span>
                <div>
                  <div className="text-white font-black text-sm">راحة لفريقك في الجولة {currentRound}</div>
                  <div className="text-indigo-300/80 text-[11px] font-normal">تُقام مباريات الكأس لباقي الفرق المتنافسة. سيستأنف فريقك الدوري في الجولة القادمة.</div>
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
        ) : isMatchDay ? (
          /* MATCH DAY IS ACTIVE */
          <div className="space-y-3">
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>
                  {userFixture?.competitionType === 'cup' 
                    ? `اليوم موعد مباراة الكأس (${userFixture?.stageName || 'الكأس الوطنية'})! 🏆` 
                    : 'اليوم موعد المباراة الرسمية في جدول الدوري! ⚽'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">الجولة {currentRound}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="start_live_match_btn"
                disabled={isSimulationRunning}
                onClick={() => userFixture?.id ? startLiveMatch(userFixture.id) : startLiveMatch()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>خوض مباراة الجولة {currentRound} الآن ⚽</span>
              </button>

              <button
                id="instant_simulate_round_btn"
                disabled={isSimulationRunning}
                onClick={() => instantSimulateCurrentRound()}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <FastForward className="w-4 h-4 text-amber-400" />
                <span>{isSimulationRunning ? 'جارٍ المحاكاة...' : `محاكاة نتائج مباريات الجولة ${currentRound}`}</span>
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

            {/* Quick Calendar Advancing Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="advance_fast_to_match_btn"
                onClick={() => advanceToNextDay(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer"
              >
                <FastForward className="w-4 h-4 text-amber-300" />
                <span>التقدم السريع لموعد المباراة (تخطي {daysUntilNextMatch} أيام) ⏩</span>
              </button>

              <button
                id="advance_single_day_btn"
                onClick={() => advanceToNextDay(false)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow transition-all active:scale-95 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>محاكاة اليوم التالي فقط ➔</span>
              </button>
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
                  {upcomingMatchAnalysis.oppSquad.overall > upcomingMatchAnalysis.userSquad.overall
                    ? `فريق ${upcomingMatchAnalysis.oppClub.name} يتفوق في القوة الإجمالية. يُنصح بالاعتماد على التكتيك المتوازن أو الهجمات المرتدة وتضييق المساحات في الثلث الدفاعي.`
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
                  {upcomingMatchAnalysis.userSquad.benchOverall < 65
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
                          رصيد النادي غير كافٍ ({userClub?.budget.toLocaleString()} ج.م)
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
                {upcomingMatchAnalysis.isUserHome ? 'ملعبك (المضيف)' : 'خارج الديار (الضيف)'}
              </span>
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
                      {manager.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{manager.name}</h4>
                      <span className="text-[10px] text-emerald-400 block font-medium">(أنت - {userClub?.name})</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_strength')}:</span>
                      <span className="font-mono font-black text-emerald-400 text-xs">{userDynamicManagerRating || 50} ⭐</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_points')}:</span>
                      <span className="font-mono text-slate-200">{manager.rankingPoints || 1200} نقطة</span>
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
                      {upcomingMatchAnalysis.oppManager.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white truncate">{upcomingMatchAnalysis.oppManager.name}</h4>
                      <span className="text-[10px] text-rose-400 block font-medium">({upcomingMatchAnalysis.oppClub.name})</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_strength')}:</span>
                      <span className="font-mono font-black text-rose-400 text-xs">{upcomingMatchAnalysis.oppManager.rating} ⭐</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('manager_ranking')}:</span>
                      <span className="font-mono text-slate-200">#{upcomingMatchAnalysis.oppManager.worldRank || 450} عالمياً</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">{t('preferred_formation')}:</span>
                      <span className="font-mono font-bold text-slate-300">{upcomingMatchAnalysis.oppManager.preferredFormation}</span>
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
                    userVal: upcomingMatchAnalysis.userSquad.overall,
                    oppVal: upcomingMatchAnalysis.oppSquad.overall
                  },
                  {
                    label: t('attack'),
                    userVal: upcomingMatchAnalysis.userSquad.attack,
                    oppVal: upcomingMatchAnalysis.oppSquad.attack
                  },
                  {
                    label: t('midfield'),
                    userVal: upcomingMatchAnalysis.userSquad.midfield,
                    oppVal: upcomingMatchAnalysis.oppSquad.midfield
                  },
                  {
                    label: t('defense'),
                    userVal: upcomingMatchAnalysis.userSquad.defense,
                    oppVal: upcomingMatchAnalysis.oppSquad.defense
                  },
                  {
                    label: t('goalkeeping'),
                    userVal: upcomingMatchAnalysis.userSquad.goalkeeper,
                    oppVal: upcomingMatchAnalysis.oppSquad.goalkeeper
                  },
                  {
                    label: t('bench_strength'),
                    userVal: upcomingMatchAnalysis.userSquad.benchOverall,
                    oppVal: upcomingMatchAnalysis.oppSquad.benchOverall
                  },
                ].map((row, idx) => {
                  const isUserAhead = row.userVal > row.oppVal;
                  const isOppAhead = row.oppVal > row.userVal;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-mono font-bold ${isUserAhead ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {userClub?.shortName}: {row.userVal}
                        </span>
                        <span className="text-slate-400 font-medium">{row.label}</span>
                        <span className={`font-mono font-bold ${isOppAhead ? 'text-rose-400' : 'text-slate-300'}`}>
                          {upcomingMatchAnalysis.oppClub.shortName}: {row.oppVal}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 transition-all duration-500" 
                          style={{ width: `${(row.userVal / (row.userVal + row.oppVal)) * 100}%` }} 
                        />
                        <div 
                          className="bg-rose-500 transition-all duration-500" 
                          style={{ width: `${(row.oppVal / (row.userVal + row.oppVal)) * 100}%` }} 
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
                    {upcomingMatchAnalysis.odds.homeWin}%
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">{t('draw_chance')}</span>
                  <span className="font-mono font-black text-base text-amber-400">
                    {upcomingMatchAnalysis.odds.draw}%
                  </span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 block">{t('away_win_chance')}</span>
                  <span className="font-mono font-black text-base text-blue-400">
                    {upcomingMatchAnalysis.odds.awayWin}%
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {upcomingMatchAnalysis.odds.tacticalEdge === 'home'
                    ? t('tactical_edge_home')
                    : upcomingMatchAnalysis.odds.tacticalEdge === 'away'
                    ? t('tactical_edge_away')
                    : t('tactical_edge_balanced')}
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Current Round Fixtures List */}
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

            return (
              <div
                key={fixture.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isUserGame
                    ? 'bg-emerald-950/40 border-emerald-600/70 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {/* Home */}
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-left">
                  <span className={`text-xs font-bold truncate ${home.isUserClub ? 'text-emerald-300' : 'text-white'}`}>
                    {home.name}
                  </span>
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                    style={{ backgroundColor: home.primaryColor }}
                  >
                    {home.shortName.slice(0, 1)}
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
                    style={{ backgroundColor: away.primaryColor }}
                  >
                    {away.shortName.slice(0, 1)}
                  </div>
                  <span className={`text-xs font-bold truncate ${away.isUserClub ? 'text-emerald-300' : 'text-white'}`}>
                    {away.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
