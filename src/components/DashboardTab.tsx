import React from 'react';
import { useGame } from '../context/GameContext';
import { ActiveTab, Club, Player } from '../types/game';
import { findClubInWorld } from '../data/leaguesData';
import { FootballNewsFeed } from './news/FootballNewsFeed';
import { CoachHomeCard } from './CoachHomeCard';
import { CoachCardModal } from './CoachCardModal';
import {
  Play,
  Zap,
  Trophy,
  Users,
  Wallet,
  TrendingUp,
  AlertCircle,
  Award,
  Swords,
  ChevronLeft,
  Calendar,
  Sparkles,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  Clock,
  Briefcase,
  Activity,
  HeartPulse,
  Send,
  FastForward,
  CheckCircle2,
  AlertTriangle,
  Globe2,
} from 'lucide-react';

interface DashboardTabProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectPlayer: (player: Player) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ setActiveTab, onSelectPlayer }) => {
  const [notification, setNotification] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showCoachCardModal, setShowCoachCardModal] = React.useState(false);
  const [dashboardSection, setDashboardSection] = React.useState<'overview' | 'news' | 'prestige'>('overview');

  const {
    userClub,
    teams,
    standings,
    fixtures,
    currentRound,
    totalRounds,
    manager,
    startLiveMatch,
    instantSimulateCurrentRound,
    seasonFinished,
    isSimulationRunning,
    season,
    activeLeague,
    openSeasonModal,
    jobOffers,
    takeOverClub,
    calendarDate,
    boardSystem,
    activeNegotiations,
    dailyNews,
    addDailyNews,
    daysUntilNextMatch,
    isMatchDay,
    advanceToNextDay,
    trainingIntensity,
    setTrainingIntensity,
    worldRankings,
    userSquadStrength,
    userDynamicManagerRating,
    liveMatch,
    userCalendarSchedule,
    calendarSchedule,
  } = useGame();

  // If Manager is unemployed
  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
        {/* Notification Toast */}
        {notification && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xl ${
            notification.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-200' 
              : 'bg-red-950/90 border-red-500/80 text-red-200'
          }`}>
            <span>{notification.text}</span>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 text-sm">✕</button>
          </div>
        )}

        {/* Unemployed Hero Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 rounded-3xl border border-amber-500/40 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/40">
                👔
              </div>
              <div>
                <h2 className="font-black text-base text-white">أنت حالياً مدرب حر (بدون نادٍ)</h2>
                <p className="text-xs text-slate-400">
                  قدمت استقالتك أو تبحث عن تحدٍ جديد. يمكنك تولي تدريب نادٍ من الشواغر أدناه أو محاكاة جولات الدوري!
                </p>
              </div>
            </div>
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-700/60 px-3 py-1 rounded-full font-bold">
              متاح للتعاقد
            </span>
          </div>

          {/* Quick Round Advance as Spectator */}
          <div className="flex items-center justify-between bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                منافسات الجولة {currentRound} من {totalRounds} • {calendarDate?.formattedArabic || calendarDate?.formattedArabicDate || ''}
              </span>
              <span className="text-[11px] text-slate-400 block">
                تقدم يوماً بيوم أو قم بمحاكاة مباريات الجولة للاطلاع على النتائج وتجديد عروض الأندية
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => advanceToNextDay(false)}
                disabled={isSimulationRunning}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl shadow cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>اليوم التالي</span>
              </button>

              <button
                onClick={() => instantSimulateCurrentRound()}
                disabled={isSimulationRunning}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>{isSimulationRunning ? 'جارٍ المحاكاة...' : `محاكاة الجولة ${currentRound}`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Available Job Offers Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>الشواغر والعروض التدريبية المتاحة ({jobOffers.length})</span>
            </h3>
            <button
              onClick={() => setActiveTab('career')}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              عرض التفاصيل ➔
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobOffers.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-xs text-slate-400 bg-slate-900/80 rounded-2xl border border-slate-800">
                لا توجد عروض فورية حالياً. قم بمحاكاة الجولة الحالية لتصلك عروض تدريبية جديدة!
              </div>
            ) : (
              jobOffers.map(offer => (
                <div
                  key={offer.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">{offer.clubName}</h4>
                    <span className="text-xs text-slate-400 block">{offer.leagueName}</span>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      الميزانية: {(offer.transferBudget || 100000).toLocaleString()} ج.م
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const res = takeOverClub(offer.id);
                      setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                      setTimeout(() => setNotification(null), 4000);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95 shrink-0"
                  >
                    تولي التدريب ✍️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manager Career Snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div 
            onClick={() => setActiveTab('career')}
            className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 transition-all text-center"
          >
            <div className="text-xs text-slate-400 mb-1">المستوى التدريبي</div>
            <div className="text-xl font-black text-purple-300">مستوى {manager.level}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">CAF-{manager.license}</div>
          </div>

          <div 
            onClick={() => setActiveTab('career')}
            className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 transition-all text-center"
          >
            <div className="text-xs text-slate-400 mb-1">السمعة التدريبية</div>
            <div className="text-xl font-black text-amber-400">{manager.reputation} ⭐</div>
            <div className="text-[10px] text-slate-500 mt-0.5">خبرة وتأثير</div>
          </div>

          <div 
            onClick={() => setActiveTab('league')}
            className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 transition-all text-center"
          >
            <div className="text-xs text-slate-400 mb-1">جدول الترتيب</div>
            <div className="text-xl font-black text-white">{teams.length} أندية</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{activeLeague.name}</div>
          </div>

          <div 
            onClick={() => setActiveTab('matches')}
            className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl cursor-pointer hover:border-slate-700 transition-all text-center"
          >
            <div className="text-xs text-slate-400 mb-1">الجولة القادمة</div>
            <div className="text-xl font-black text-emerald-400">الجولة {currentRound}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">من {totalRounds} جولة</div>
          </div>
        </div>

        {/* Official Coach Card on Home Page (Free Agent) with Share & Details */}
        <CoachHomeCard
          manager={manager}
          userClub={null}
          worldRankings={worldRankings}
          userDynamicManagerRating={userDynamicManagerRating}
          onOpenFullModal={() => setShowCoachCardModal(true)}
        />

        {/* Dynamic Football News Feed for Free Agent Manager */}
        <div className="pt-2">
          <FootballNewsFeed
            news={dailyNews}
            onAddNews={addDailyNews}
            userClub={null}
            manager={manager}
            teams={teams}
            standings={standings}
            currentRound={currentRound}
            calendarDate={calendarDate}
          />
        </div>

        {/* Full Coach Card Modal for Free Agent */}
        <CoachCardModal
          isOpen={showCoachCardModal}
          onClose={() => setShowCoachCardModal(false)}
          manager={manager}
          userClub={null}
          worldRankings={worldRankings}
        />
      </div>
    );
  }

  // Find next match
  const safeFixtures = Array.isArray(fixtures) ? fixtures.filter(Boolean) : [];
  const safeTeams = Array.isArray(teams) ? teams.filter(Boolean) : [];
  const safeStandings = Array.isArray(standings) ? standings.filter(Boolean) : [];

  const roundFixtures = safeFixtures.filter(f => f && f.round === currentRound);

  // Active upcoming fixture from unified calendar across all competitions (League, CAF Champions League, Cup)
  const activeUserFixture = React.useMemo(() => {
    if (!userClub?.id || !Array.isArray(userCalendarSchedule)) return undefined;
    // 0. Priority: Any unplayed Continental or Cup match whose round trigger has arrived (<= currentRound)
    const dueTournamentMatch = userCalendarSchedule.find(
      m =>
        m &&
        !m.isPlayed &&
        (m.competitionType === 'CONTINENTAL_CUP' || m.competitionType === 'continental' || m.competitionType === 'DOMESTIC_COP' || m.competitionType === 'cup') &&
        m.round &&
        m.round <= currentRound
    );
    if (dueTournamentMatch) return dueTournamentMatch;
    // 1. Unplayed match today (or overdue unplayed match)
    const todayMatch = userCalendarSchedule.find(m => m && !m.isPlayed && (m.date === calendarDate?.rawDateStr || (m.date || '') <= (calendarDate?.rawDateStr || '')));
    if (todayMatch) return todayMatch;
    // 2. Next unplayed fixture on or after today
    const upcoming = userCalendarSchedule.find(m => m && !m.isPlayed && m.date >= (calendarDate?.rawDateStr || ''));
    if (upcoming) return upcoming;
    // 3. Any remaining unplayed fixture
    return userCalendarSchedule.find(m => m && !m.isPlayed);
  }, [userClub?.id, userCalendarSchedule, calendarDate?.rawDateStr, currentRound]);

  const nextFixture = activeUserFixture || (userClub?.id 
    ? roundFixtures.find(f => f && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id))
    : undefined);
  
  const isHome = liveMatch
    ? liveMatch.homeTeam?.id === userClub?.id
    : (userClub?.id ? nextFixture?.homeTeamId === userClub.id : false);
  const oppTeamId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const oppTeamFromLiveMatch = liveMatch
    ? (isHome ? liveMatch.awayTeam : liveMatch.homeTeam)
    : undefined;
  const oppTeam = oppTeamFromLiveMatch || (oppTeamId ? (
    safeTeams.find(t => t && t.id === oppTeamId) ||
    findClubInWorld(oppTeamId) ||
    ({
      id: oppTeamId,
      name: oppTeamId === 'team_user' ? 'فريقك' : 'النادي المنافس',
      shortName: 'منافس',
      city: 'مصر',
      country: 'مصر',
      primaryColor: '#334155',
      secondaryColor: '#ffffff',
      reputation: 50,
      players: [],
    } as Club)
  ) : undefined);

  // Next upcoming fixture for user club across future rounds (when user has no match in this current round)
  const nextUpcomingUserFixture = userClub?.id
    ? safeFixtures.find(f => f && !f.isPlayed && f.round >= currentRound && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id))
    : undefined;
  const isUpcomingHome = userClub?.id ? nextUpcomingUserFixture?.homeTeamId === userClub.id : false;
  const upcomingOppId = isUpcomingHome ? nextUpcomingUserFixture?.awayTeamId : nextUpcomingUserFixture?.homeTeamId;
  const upcomingOpp = upcomingOppId ? (
    safeTeams.find(t => t && t.id === upcomingOppId) ||
    findClubInWorld(upcomingOppId) ||
    ({
      id: upcomingOppId,
      name: 'النادي المنافس',
      shortName: 'منافس',
      city: 'مصر',
      country: 'مصر',
      primaryColor: '#334155',
      secondaryColor: '#ffffff',
      reputation: 50,
      players: [],
    } as Club)
  ) : undefined;

  // User Standing
  const userRankIndex = userClub?.id && safeStandings.length > 0 
    ? safeStandings.findIndex(s => s && s.teamId === userClub.id) 
    : -1;
  const userStanding = userRankIndex !== -1 
    ? safeStandings[userRankIndex] 
    : (safeStandings.length > 0 ? (safeStandings[0] || null) : null);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 1;

  // Starters stats
  const startingIds = Array.isArray(userClub?.tactics?.startingPlayerIds) ? userClub.tactics.startingPlayerIds : [];
  const squadPlayers = Array.isArray(userClub?.players) ? userClub.players.filter(Boolean) : [];
  const starters = squadPlayers.filter(p => p && p.id && startingIds.includes(p.id));
  const avgFitness = starters.length > 0 
    ? Math.round(starters.reduce((sum, p) => sum + (p.fitness || 100), 0) / starters.length) 
    : 100;
  const avgMorale = starters.length > 0 
    ? Math.round(starters.reduce((sum, p) => sum + (p.morale || 85), 0) / starters.length) 
    : 85;

  // Top team scorer
  const sortedScorers = squadPlayers.length > 0
    ? [...squadPlayers].sort((a, b) => (b?.stats?.goals || 0) - (a?.stats?.goals || 0))
    : [];
  const topScorer = sortedScorers.length > 0 ? (sortedScorers[0] || null) : null;

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* 1. Unified Match & Progression Center */}
      {seasonFinished ? (
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 p-5 rounded-3xl border border-amber-800/60 text-center space-y-3">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
          <h2 className="text-lg font-black text-white">انتهت منافسات الموسم {season.seasonNumber} رسمياً!</h2>
          <p className="text-xs text-slate-300">
            {userRank === 1 ? `🎉 مبروك التتويج بلقب ${activeLeague.name}!` : `أنهيت الموسم في المركز ${userRank} في ${activeLeague.name}. يمكنك مراجعة الحصيلة وتحديد مستقبلك للموسم الجديد.`}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button 
              onClick={openSeasonModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4" /> مراجعة ختام الموسم وبدء الموسم الجديد
            </button>
            <button 
              onClick={() => setActiveTab('league')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              جدول الترتيب
            </button>
          </div>
        </div>
      ) : oppTeam ? (
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-xl space-y-3.5">
          {/* Header Ticker: Date, Matchday Countdown & Training Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 text-cyan-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-white">
                    {calendarDate?.formattedArabic || calendarDate?.formattedArabicDate || ''}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">({season.startDate})</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isMatchDay ? (
                    <strong className="text-emerald-400 flex items-center gap-1 font-bold">
                      <Zap className="w-3.5 h-3.5" /> موعد المباراة الرسمية اليوم أمام {oppTeam.name}!
                    </strong>
                  ) : (
                    <span>
                      باقي <strong className="text-amber-300 font-mono font-bold">{daysUntilNextMatch}</strong> {daysUntilNextMatch === 1 ? 'يوم' : 'أيام'} على موعد اللقاء ({nextFixture?.stageName || nextFixture?.stage || `الجولة ${currentRound}`})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Compact Training Intensity Selector */}
            <div className="flex items-center gap-1.5 self-start sm:self-center bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
              <span className="text-slate-400 font-medium px-1 flex items-center gap-1 text-[11px]">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>التدريب:</span>
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setTrainingIntensity('recovery')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    trainingIntensity === 'recovery'
                      ? 'bg-slate-800 text-cyan-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  استشفاء
                </button>
                <button
                  onClick={() => setTrainingIntensity('normal')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    trainingIntensity === 'normal'
                      ? 'bg-slate-800 text-emerald-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  متوازن
                </button>
                <button
                  onClick={() => setTrainingIntensity('high')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    trainingIntensity === 'high'
                      ? 'bg-slate-800 text-amber-300 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  مكثف 🔥
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-amber-400">
              <span>{nextFixture?.tournamentBadge || (nextFixture?.competitionType === 'continental' ? '🏆 دوري أبطال إفريقيا' : nextFixture?.competitionType === 'cup' ? '🛡️ كأس مصر' : `🇪🇬 ${activeLeague.name}`)}</span>
              <span>•</span>
              <span>{nextFixture?.stageName || nextFixture?.stage || `الجولة ${currentRound}`}</span>
              {nextFixture?.date && (
                <span className="text-[11px] text-cyan-400/90 font-mono">({nextFixture.date})</span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {isHome ? '🏟️ بملعبنا' : '✈️ خارج الديار'}
            </span>
          </div>

          {/* Match Head to Head */}
          <div className="grid grid-cols-5 items-center gap-2 py-1">
            {/* User Club */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow border border-white/10 mb-1.5"
                style={{ backgroundColor: userClub?.primaryColor || '#1e293b', color: '#fff' }}
              >
                {(userClub?.shortName || userClub?.name || 'فريق').slice(0, 2)}
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-full">{userClub.name}</h3>
              <span className="text-[10px] text-slate-400 mt-0.5">المركز #{userRank}</span>
            </div>

            {/* VS or Live Score Badge */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              {liveMatch ? (
                <div className="flex flex-col items-center">
                  <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700/80 flex items-center gap-1 font-mono font-black text-sm text-white shadow-inner">
                    <span className={isHome ? (liveMatch.homeScore > liveMatch.awayScore ? 'text-emerald-400' : '') : (liveMatch.awayScore > liveMatch.homeScore ? 'text-emerald-400' : '')}>
                      {isHome ? liveMatch.homeScore : liveMatch.awayScore}
                    </span>
                    <span className="text-slate-500">:</span>
                    <span className={!isHome ? (liveMatch.homeScore > liveMatch.awayScore ? 'text-emerald-400' : '') : (liveMatch.awayScore > liveMatch.homeScore ? 'text-emerald-400' : '')}>
                      {isHome ? liveMatch.awayScore : liveMatch.homeScore}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold mt-1 ${liveMatch.isFinished ? 'text-amber-400' : 'text-rose-400'}`}>
                    {liveMatch.isFinished ? 'نهائي' : `${liveMatch.currentMinute}' دقيقة`}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                  VS
                </div>
              )}
            </div>

            {/* Opponent */}
            <div className="col-span-2 flex flex-col items-center text-center">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow border border-white/10 mb-1.5"
                style={{ backgroundColor: oppTeam?.primaryColor || '#334155', color: '#fff' }}
              >
                {oppTeam?.shortName ? oppTeam.shortName.slice(0, 2) : 'ضف'}
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-white truncate max-w-full">{oppTeam?.name || 'المنافس القادم'}</h3>
              <span className="text-[10px] text-slate-400 mt-0.5">{oppTeam?.city || ''}</span>
            </div>
          </div>

          {/* Match Actions */}
          <div className="pt-2 border-t border-slate-800/80">
            {liveMatch ? (
              /* ACTIVE OR FINISHED LIVE MATCH IN PROGRESS */
              <button
                id="dashboard_continue_live_match_btn"
                onClick={() => setActiveTab('matches')}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {liveMatch.isFinished 
                    ? 'عرض النتيجة واعتماد الجولة 📋' 
                    : `متابعة المباراة (${liveMatch.currentMinute}') 🔴`}
                </span>
              </button>
            ) : (nextFixture && nextFixture.isPlayed) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  id="dashboard_next_round_btn"
                  onClick={() => advanceToNextDay(true)}
                  disabled={isSimulationRunning}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <FastForward className="w-4 h-4 fill-white text-white" />
                  <span>التقدم للجولة التالية ({currentRound + 1}) ⏩</span>
                </button>

                <button
                  id="dashboard_advance_day_played_btn"
                  onClick={() => advanceToNextDay(false)}
                  disabled={isSimulationRunning}
                  className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 font-bold text-xs py-2.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>اليوم التالي (+1)</span>
                </button>
              </div>
            ) : isMatchDay ? (
              <div className="w-full">
                <button
                  id="dashboard_play_live_btn"
                  disabled={isSimulationRunning}
                  onClick={() => {
                    setActiveTab('matches');
                    startLiveMatch(nextFixture?.id);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>خوض مباراة ({nextFixture?.stageName || nextFixture?.stage || `الجولة ${currentRound}`}) لايف الآن ⚽⚡</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  id="dashboard_play_match_direct_btn"
                  onClick={() => {
                    setActiveTab('matches');
                    startLiveMatch(nextFixture?.id);
                  }}
                  disabled={isSimulationRunning}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm py-2.5 px-3 rounded-xl transition-all shadow active:scale-95 cursor-pointer disabled:opacity-50"
                  title="التقدم مباشرة لموعد المباراة وبدء اللقاء في الملعب"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>خوض المباراة الآن فوراً ⚽⚡</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="dashboard_fast_skip_match_btn"
                    onClick={() => advanceToNextDay(true)}
                    disabled={isSimulationRunning}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700/80 font-bold text-xs py-2 px-3 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="التقدم بالتقويم ومحاكاة الأيام حتى موعد اللقاء"
                  >
                    <FastForward className="w-3.5 h-3.5 text-amber-400" />
                    <span>تخطي الأيام ({daysUntilNextMatch} أيام) ⏩</span>
                  </button>

                  <button
                    id="dashboard_advance_day_btn"
                    onClick={() => advanceToNextDay(false)}
                    disabled={isSimulationRunning}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 font-bold text-xs py-2 px-3 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title="محاكاة يوم واحد وتطبيق تدريب اليوم وعلاج الإصابات والمفاوضات"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>اليوم التالي (+1)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Rest Round / Bye Week / Cup Round for Remaining Clubs */
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 rounded-3xl border border-indigo-500/30 p-5 shadow-2xl space-y-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />
          
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-cyan-400">
              <Calendar className="w-3.5 h-3.5" />
              الجولة {currentRound} من {totalRounds}
            </span>
            <span className="bg-indigo-950/80 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-700/50 font-bold text-[11px]">
              ☕ راحة لفريقك في هذه الجولة
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="w-14 h-14 rounded-2xl bg-indigo-900/40 border border-indigo-500/40 flex items-center justify-center text-2xl shrink-0">
              🏆
            </div>
            <div className="space-y-1 text-center sm:text-right">
              <h3 className="font-black text-white text-sm">
                مباريات بطولة الكأس للأندية المتأهلة
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                فريقك لا يشارك في هذه الجولة بسبب مغادرة بطولة الكأس أو جدول الراحة. تجري حالياً مباريات بين الأندية الأخرى، وسيستأنف فريقك منافسات الدوري في الجولة القادمة!
              </p>
            </div>
          </div>

          {nextUpcomingUserFixture && upcomingOpp && (
            <div className="flex items-center justify-between text-xs bg-slate-900/90 px-3.5 py-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                المباراة القادمة لفريقك:
              </span>
              <span className="text-amber-300 font-bold">
                الجولة {nextUpcomingUserFixture.round} أمام ({upcomingOpp?.name || 'المنافس'}) {isUpcomingHome ? '🏟️ بملعبنا' : '✈️ خارج الديار'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              id="dashboard_sim_rest_round_btn"
              disabled={isSimulationRunning}
              onClick={() => {
                instantSimulateCurrentRound();
                setActiveTab('matches');
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Zap className="w-4 h-4 text-cyan-200" />
              <span>{isSimulationRunning ? 'جارٍ المحاكاة...' : `محاكاة نتائج مباريات الجولة ${currentRound} ⚡`}</span>
            </button>

            <button
              id="dashboard_advance_day_rest_btn"
              disabled={isSimulationRunning}
              onClick={() => advanceToNextDay(false)}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm py-3 px-4 rounded-xl transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>التقدم بالتقويم (+1 يوم) ➔</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Sleek Segmented Switcher for Clean Navigation (Anti-clutter) */}
      <div className="flex items-center justify-center p-1 bg-slate-900/90 border border-slate-800/80 rounded-2xl gap-1 text-xs">
        <button
          onClick={() => setDashboardSection('overview')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all cursor-pointer ${
            dashboardSection === 'overview'
              ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-750/70'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>نظرة عامة والجاهزية</span>
        </button>

        <button
          onClick={() => setDashboardSection('news')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all cursor-pointer ${
            dashboardSection === 'news'
              ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-750/70'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>أخبار ومستجدات الدوري</span>
        </button>

        <button
          onClick={() => setDashboardSection('prestige')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-bold transition-all cursor-pointer ${
            dashboardSection === 'prestige'
              ? 'bg-slate-800 text-purple-400 shadow-sm border border-slate-750/70'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>المدرب والتصنيف العالمي</span>
        </button>
      </div>

      {/* SECTION 1: OVERVIEW & SQUAD READINESS */}
      {dashboardSection === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Active Negotiations Quick Alert (if any) */}
          {activeNegotiations.length > 0 && (
            <div 
              onClick={() => setActiveTab('transfers')}
              className="bg-cyan-950/40 border border-cyan-500/40 p-3.5 rounded-2xl hover:border-cyan-400 transition-all cursor-pointer flex items-center justify-between gap-3 shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">لديك {activeNegotiations.length} مفاوضات جارية في سوق الانتقالات</h4>
                  <p className="text-[11px] text-slate-300">
                    {activeNegotiations.some(n => n.actionRequired) 
                      ? '⚠️ يوجد عرض يتطلب ردك أو تعديل الشروط!'
                      : 'المفاوضات تتقدم يوماً بيوم مع تقدم التقويم.'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-cyan-400 font-bold">متابعة ➔</span>
            </div>
          )}

          {/* Challenges & Ad Rewards Highlight Banner */}
          <div 
            onClick={() => setActiveTab('challenges')}
            className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 hover:border-amber-400/80 p-3 sm:p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 shadow-md group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-xl shrink-0 group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-xs sm:text-sm text-white truncate">مركز التحديات ومكافآت الإعلانات</h4>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                    مكافآت مضاعفة 2X 🎬
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                  اربح 5 مباريات متتالية وافتح صناديق الحظ وضاعف مكافآتك 2X لملايين الجنيهات!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold shrink-0">
              <span className="hidden sm:inline">دخول التحديات</span>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* League Standing Widget */}
            <div 
              onClick={() => setActiveTab('league')}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>ترتيب الفريق</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-white">#{userRank}</span>
                <span className="text-xs font-bold text-amber-400">{userStanding?.points ?? 0} نقطة</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {userStanding?.form && userStanding.form.length > 0 ? (
                  userStanding.form.map((res, i) => (
                    <span 
                      key={i} 
                      className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center text-white ${
                        res === 'W' ? 'bg-emerald-600' : res === 'D' ? 'bg-amber-600' : 'bg-red-600'
                      }`}
                    >
                      {res === 'W' ? 'ف' : res === 'D' ? 'ت' : 'خ'}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500">لم تلعب مباريات بعد</span>
                )}
              </div>
            </div>

            {/* Squad Condition */}
            <div 
              onClick={() => setActiveTab('tactics')}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>جاهزية التشكيل</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-emerald-400">{avgFitness}%</span>
                <span className="text-xs text-slate-400">لياقة</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-400" />
                <span>المعنويات: <strong className="text-slate-200">{avgMorale}%</strong></span>
              </div>
            </div>

            {/* Manager Level */}
            <div 
              onClick={() => setActiveTab('career')}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>مستوى المدرب</span>
                <Award className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-black text-purple-300">مستوى {manager.level}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                الرخصة: <strong className="text-amber-400 font-mono">CAF-{manager.license}</strong>
              </div>
            </div>

            {/* Financial Flow */}
            <div 
              onClick={() => setActiveTab('club')}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>الميزانية والاستاد</span>
                <Wallet className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-lg font-black text-cyan-300 font-mono">{userClub.budget.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400">ج.م</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                سعة الاستاد: <strong className="text-slate-200">{userClub.facilities?.stadiumCapacity || 5000} مشجع</strong>
              </div>
            </div>
          </div>

          {/* Board & Fan Confidence Widget */}
          {boardSystem && userClub && (
            (() => {
              const userRank = (userClub?.id ? (Array.isArray(standings) ? standings : []).findIndex(s => s && s.teamId === userClub.id) + 1 : 1) || 1;
              const targetRank = boardSystem.targetLeaguePosition || 1;
              const rankMargin = targetRank - userRank;
              const isAhead = rankMargin >= 0;

              const boardConf = boardSystem.confidence ?? 80;
              const fanConf = boardSystem.fanConfidence ?? 80;
              const overallConf = boardSystem.overallConfidence ?? Math.round((boardConf * 0.55) + (fanConf * 0.45));

              return (
                <div className="bg-slate-900/95 border border-slate-800 p-4 sm:p-5 rounded-3xl space-y-3.5 shadow-xl">
                  {/* Header: Target vs Actual Position */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-bold shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-white flex items-center gap-2">
                          <span>ثقة مجلس الإدارة والجماهير</span>
                          <span className="text-[11px] font-mono text-purple-400 bg-purple-950/80 border border-purple-800/60 px-2 py-0.5 rounded-lg">
                            {overallConf}% المؤشر العام
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          هدف النادي: <strong className="text-amber-300 font-bold">{boardSystem.targetLeaguePositionText || `المركز ${targetRank} أو أعلى`}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span className="text-xs text-slate-300 font-medium">الترتيب الحالي:</span>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
                        isAhead
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                          : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                      }`}>
                        المركز #{userRank}
                        <span className="text-[10px] font-normal">
                          ({isAhead ? `+${rankMargin} متفوق ✅` : `${rankMargin} متأخر ⚠️`})
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Dual Confidence Gauges: Board & Fans */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Board Confidence Gauge */}
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>👔</span> ثقة مجلس الإدارة
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          boardSystem.boardStatus === 'very_satisfied' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                          boardSystem.boardStatus === 'satisfied' ? 'bg-teal-950 text-teal-300 border-teal-700' :
                          boardSystem.boardStatus === 'under_review' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                          'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                        }`}>
                          {boardSystem.boardStatus === 'very_satisfied' && 'راضٍ جداً ✨'}
                          {boardSystem.boardStatus === 'satisfied' && 'مستقر 👍'}
                          {boardSystem.boardStatus === 'under_review' && 'قيد التقييم ⚠️'}
                          {boardSystem.boardStatus === 'danger_zone' && 'تحذير خطر 🚨'}
                          {!boardSystem.boardStatus && `${boardConf}%`}
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            boardConf >= 75 ? 'bg-emerald-500' :
                            boardConf >= 50 ? 'bg-teal-500' :
                            boardConf >= 35 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${boardConf}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>موقف الإدارة:</span>
                        <strong className="text-white font-mono">{boardConf}%</strong>
                      </div>
                    </div>

                    {/* Fan Confidence Gauge */}
                    <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>📣</span> ثقة ورضا الجمهور
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          boardSystem.fanStatus === 'ecstatic' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' :
                          boardSystem.fanStatus === 'satisfied' ? 'bg-teal-950 text-teal-300 border-teal-700' :
                          boardSystem.fanStatus === 'discontent' ? 'bg-amber-950 text-amber-300 border-amber-700' :
                          'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                        }`}>
                          {boardSystem.fanStatus === 'ecstatic' && 'هتافات واحتفالات 🥳'}
                          {boardSystem.fanStatus === 'satisfied' && 'دعم ومساندة 👏'}
                          {boardSystem.fanStatus === 'discontent' && 'قلق واستهجان 😒'}
                          {boardSystem.fanStatus === 'furious' && 'غضب ومطالب بالتغيير 🤬'}
                          {!boardSystem.fanStatus && `${fanConf}%`}
                        </span>
                      </div>

                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            fanConf >= 75 ? 'bg-emerald-500' :
                            fanConf >= 50 ? 'bg-teal-500' :
                            fanConf >= 35 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${fanConf}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>مزاج الجماهير:</span>
                        <strong className="text-white font-mono">{fanConf}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Board & Fan Match Feedback */}
                  {boardSystem.statusDescription && (
                    <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800/80 p-3 rounded-2xl leading-relaxed">
                      <p className="flex items-start gap-2">
                        <span className="text-amber-400 shrink-0 mt-0.5">💬</span>
                        <span>{boardSystem.statusDescription}</span>
                      </p>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Star Player Spotlight & Quick Formation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Star / Top Scorer Player Card */}
            {topScorer && (
              <div 
                onClick={() => onSelectPlayer(topScorer)}
                className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 cursor-pointer transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    نجم الفريق الأول
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">عرض البطاقة ➔</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-700 flex flex-col items-center justify-center font-black">
                    <span className="text-lg leading-none">{topScorer.overallRating}</span>
                    <span className="text-[9px] uppercase font-bold">{topScorer.position}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">{topScorer.name}</div>
                    <div className="text-xs text-amber-400 font-medium">"{topScorer.nickname || 'الهداف'}"</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      سجل {topScorer.stats?.goals ?? 0} أهداف • صنع {topScorer.stats?.assists ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Tactic Selector */}
            <div 
              onClick={() => setActiveTab('tactics')}
              className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 cursor-pointer transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  الخطة والنهج الفني
                </span>
                <span className="text-[11px] text-blue-400 font-medium">تعديل الخطة ➔</span>
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div>
                  <div className="text-base font-black text-white font-mono">{userClub.tactics?.formation || '4-3-3'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    الأسلوب: {
                      userClub.tactics?.mentality === 'attacking' ? 'هجومي ضاغط' :
                      userClub.tactics?.mentality === 'defensive' ? 'دفاع متكتل ومرتدات' :
                      userClub.tactics?.mentality === 'ultra_attacking' ? 'هجوم شامل كاسح' : 'توازن تكتيكي'
                    }
                  </div>
                </div>
                <div className="p-2 bg-slate-800 rounded-lg text-slate-300">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LEAGUE NEWS & DAILY STORIES */}
      {dashboardSection === 'news' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <FootballNewsFeed
            news={dailyNews}
            onAddNews={addDailyNews}
            userClub={userClub}
            manager={manager}
            teams={teams}
            standings={standings}
            currentRound={currentRound}
            calendarDate={calendarDate}
          />
        </div>
      )}

      {/* SECTION 3: COACH PRESTIGE & WORLD RANKINGS */}
      {dashboardSection === 'prestige' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Official Coach Card on Home Page with Share & Customization */}
          <CoachHomeCard
            manager={manager}
            userClub={userClub}
            worldRankings={worldRankings}
            userDynamicManagerRating={userDynamicManagerRating}
            onOpenFullModal={() => setShowCoachCardModal(true)}
          />

          {/* World Rankings & Global Prestige Widget */}
          <div 
            onClick={() => setActiveTab('rankings')}
            className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 hover:border-indigo-400/60 p-4 rounded-3xl cursor-pointer transition-all shadow-xl space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black group-hover:scale-105 transition-transform">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">تصنيف الفيفا العالمي للأندية والمدربين</h3>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                      {worldRankings?.rankingMonth || 'شهري'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    قوة التشكيلة: <strong className="text-emerald-400">{userSquadStrength?.averageStartingRating ?? userSquadStrength?.overall ?? 70}</strong> | قوة المدرب: <strong className="text-amber-400">{userDynamicManagerRating ?? 50}/99</strong>
                  </p>
                </div>
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400">مركزك التدريبي عالمياً</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  #{manager?.worldRank || (Array.isArray(worldRankings?.managers) ? (worldRankings.managers.find(m => m && (m.id === 'user_manager' || (m as any)?.isUser))?.worldRank) : null) || 850}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
              <div>
                <div className="text-[10px] text-slate-500">نقاط التصنيف</div>
                <div className="font-bold text-white font-mono">{manager?.rankingPoints?.toLocaleString() || '1,200'}</div>
              </div>
              <div className="border-x border-slate-800">
                <div className="text-[10px] text-slate-500">الأول عالمياً (مدربون)</div>
                <div className="font-bold text-amber-300 truncate px-1">
                  {(Array.isArray(worldRankings?.managers) && worldRankings.managers.length > 0 && worldRankings.managers[0]?.name)
                    ? worldRankings.managers[0].name
                    : 'بيب جوارديولا'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">الأول عالمياً (أندية)</div>
                <div className="font-bold text-cyan-300 truncate px-1">
                  {(Array.isArray(worldRankings?.clubs) && worldRankings.clubs.length > 0 && worldRankings.clubs[0]?.clubName)
                    ? worldRankings.clubs[0].clubName
                    : 'ريال مدريد'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Coach Card Modal for High-Res Inspection, Download & Customization */}
      <CoachCardModal
        isOpen={showCoachCardModal}
        onClose={() => setShowCoachCardModal(false)}
        manager={manager}
        userClub={userClub}
        worldRankings={worldRankings}
      />
    </div>
  );
};
