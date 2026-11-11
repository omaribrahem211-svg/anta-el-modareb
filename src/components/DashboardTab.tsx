import React from 'react';
import { useGame } from '../context/GameContext';
import { ActiveTab, Club, Player } from '../types/game';
import { findClubInWorld } from '../data/leaguesData';
import { FootballNewsFeed } from './news/FootballNewsFeed';
import { CoachHomeCard } from './CoachHomeCard';
import { CoachCardModal } from './CoachCardModal';
import { Hero, StatTile, SegTabs, Panel, Meter, Toast, useToast, fmtShort, TONE, Tone } from './common/ProUI';
import {
  Play, Zap, Trophy, Users, Wallet, Award, Swords, ChevronLeft, Calendar, Sparkles, ShieldCheck,
  Flame, Clock, Briefcase, Activity, FastForward, Globe2, Star,
} from 'lucide-react';

interface DashboardTabProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectPlayer: (player: Player) => void;
}

const FALLBACK_CLUB = (id: string, name = 'النادي المنافس'): Club => ({
  id, name, shortName: 'منافس', city: 'مصر', country: 'مصر',
  primaryColor: '#334155', secondaryColor: '#ffffff', reputation: 50, players: [],
} as unknown as Club);

const compBadge = (f: any, leagueName: string): string => {
  if (f?.tournamentBadge) return f.tournamentBadge;
  const t = f?.competitionType;
  if (t === 'continental' || t === 'CONTINENTAL_CUP') return '🏆 دوري أبطال إفريقيا';
  if (t === 'cup' || t === 'DOMESTIC_COP') return '🛡️ كأس مصر';
  return `🇪🇬 ${leagueName}`;
};

const MENTALITY_LABEL: Record<string, string> = {
  attacking: 'هجومي ضاغط',
  defensive: 'دفاع متكتل ومرتدات',
  ultra_attacking: 'هجوم شامل كاسح',
};

const confTone = (v: number): Tone => (v >= 75 ? 'emerald' : v >= 50 ? 'sky' : v >= 35 ? 'amber' : 'rose');

const ClubBadge: React.FC<{ club?: Club | null; size?: number }> = ({ club, size = 56 }) => (
  <div
    className="flex items-center justify-center font-black text-white border border-white/15 shadow-lg shrink-0"
    style={{
      width: size, height: size, borderRadius: 14, fontSize: size * 0.36,
      background: `linear-gradient(145deg, ${club?.primaryColor || '#334155'}, ${club?.secondaryColor || '#0f172a'}55)`,
    }}
  >
    {(club?.shortName || club?.name || '؟').slice(0, 2)}
  </div>
);

const BigButton: React.FC<{
  id?: string; onClick: () => void; disabled?: boolean; tone?: 'primary' | 'ghost' | 'gold'; children: React.ReactNode; title?: string;
}> = ({ id, onClick, disabled, tone = 'primary', children, title }) => (
  <button
    id={id}
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center justify-center gap-2 font-black text-xs sm:text-sm py-3 px-4 rounded-xl transition-all active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
      tone === 'primary'
        ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20'
        : tone === 'gold'
        ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700'
    }`}
  >
    {children}
  </button>
);

const LinkRow: React.FC<{ onClick: () => void; icon: React.ReactNode; title: string; sub: string; tone: Tone; badge?: string }> = ({ onClick, icon, title, sub, tone, badge }) => {
  const t = TONE[tone];
  return (
    <button onClick={onClick} className={`w-full text-right flex items-center gap-3 p-3 rounded-2xl border ${t.border} ${t.bg} hover:brightness-125 transition-all cursor-pointer group`}>
      <div className={`w-10 h-10 rounded-xl border ${t.border} flex items-center justify-center shrink-0 ${t.text}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-black text-xs sm:text-sm text-white truncate">{title}</h4>
          {badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${t.border} ${t.text}`}>{badge}</span>}
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">{sub}</p>
      </div>
      <ChevronLeft className={`w-4 h-4 shrink-0 ${t.text} group-hover:-translate-x-1 transition-transform`} />
    </button>
  );
};

export const DashboardTab: React.FC<DashboardTabProps> = ({ setActiveTab, onSelectPlayer }) => {
  const { toast, show } = useToast(4000);
  const [showCoachCardModal, setShowCoachCardModal] = React.useState(false);
  const [dashboardSection, setDashboardSection] = React.useState<'overview' | 'news' | 'prestige'>('overview');

  const {
    userClub, teams, standings, fixtures, currentRound, totalRounds, manager, startLiveMatch,
    instantSimulateCurrentRound, seasonFinished, isSimulationRunning, season, activeLeague,
    openSeasonModal, jobOffers, takeOverClub, calendarDate, boardSystem, activeNegotiations,
    dailyNews, addDailyNews, daysUntilNextMatch, isMatchDay, advanceToNextDay, trainingIntensity,
    setTrainingIntensity, worldRankings, userSquadStrength, userDynamicManagerRating, liveMatch,
    userCalendarSchedule,
  } = useGame();

  // NOTE: every hook lives above the unemployed early-return (rules of hooks).
  const todayStr = calendarDate?.rawDateStr || '';
  const activeUserFixture = React.useMemo(() => {
    if (!userClub?.id || !Array.isArray(userCalendarSchedule)) return undefined;
    const dueTournamentMatch = userCalendarSchedule.find(
      m => m && !m.isPlayed &&
        (m.competitionType === 'CONTINENTAL_CUP' || m.competitionType === 'continental' || m.competitionType === 'DOMESTIC_COP' || m.competitionType === 'cup') &&
        m.round && m.round <= currentRound
    );
    if (dueTournamentMatch) return dueTournamentMatch;
    const dueMatch = userCalendarSchedule.find(m => m && !m.isPlayed && (m.date || '') <= todayStr);
    if (dueMatch) return dueMatch;
    const upcoming = userCalendarSchedule.find(m => m && !m.isPlayed && m.date >= todayStr);
    if (upcoming) return upcoming;
    return userCalendarSchedule.find(m => m && !m.isPlayed);
  }, [userClub?.id, userCalendarSchedule, todayStr, currentRound]);

  const dateLabel = calendarDate?.formattedArabic || calendarDate?.formattedArabicDate || '';

  /* ===================== Unemployed manager ===================== */
  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
        <Toast toast={toast} />

        <Hero accent="#f59e0b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-2xl shrink-0">👔</div>
              <div className="min-w-0">
                <h2 className="font-black text-base text-white">مدرب حر بدون نادٍ</h2>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">اختر عرضاً من الشواغر أدناه، أو تابع الأيام لتصلك عروض جديدة.</p>
              </div>
            </div>
            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-full font-black shrink-0">متاح للتعاقد</span>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-950/70 border border-slate-800 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              الجولة {currentRound} من {totalRounds}{dateLabel ? ` • ${dateLabel}` : ''}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <BigButton tone="ghost" disabled={isSimulationRunning} onClick={() => advanceToNextDay(false)}>
                <Clock className="w-4 h-4 text-cyan-400" /> اليوم التالي
              </BigButton>
              <BigButton disabled={isSimulationRunning} onClick={() => instantSimulateCurrentRound()}>
                <Zap className="w-4 h-4" /> {isSimulationRunning ? 'جارٍ المحاكاة...' : `محاكاة الجولة ${currentRound}`}
              </BigButton>
            </div>
          </div>
        </Hero>

        <Panel
          title={`الشواغر والعروض (${jobOffers.length})`}
          icon={<Trophy className="w-4 h-4" />}
          tone="amber"
          right={<button onClick={() => setActiveTab('career')} className="text-[11px] text-amber-300 font-bold hover:underline">التفاصيل ➔</button>}
        >
          {jobOffers.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400">لا توجد عروض فورية. تابع الأيام أو حاكِ الجولة لتصلك عروض جديدة.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {jobOffers.map(offer => (
                <div key={offer.id} className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all">
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-white truncate">{offer.clubName}</h4>
                    <span className="text-[11px] text-slate-400 block truncate">{offer.leagueName}</span>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">الميزانية: {fmtShort(offer.transferBudget || 100000)} ج.م</div>
                  </div>
                  <button
                    onClick={() => {
                      const res = takeOverClub(offer.id);
                      show(res.message, res.success);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow active:scale-95 shrink-0 cursor-pointer"
                  >
                    تولي التدريب
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile tone="violet" label="المستوى" value={`Lv ${manager.level}`} sub={`CAF-${manager.license}`} icon={<Award className="w-3 h-3" />} />
          <StatTile tone="amber" label="السمعة" value={manager.reputation} sub="خبرة وتأثير" icon={<Star className="w-3 h-3" />} />
          <StatTile tone="sky" label={activeLeague.name} value={teams.length} sub="نادي" icon={<Trophy className="w-3 h-3" />} />
          <StatTile tone="emerald" label="الجولة" value={currentRound} sub={`من ${totalRounds}`} icon={<Calendar className="w-3 h-3" />} />
        </div>

        <CoachHomeCard manager={manager} userClub={null} worldRankings={worldRankings} userDynamicManagerRating={userDynamicManagerRating} onOpenFullModal={() => setShowCoachCardModal(true)} />

        <FootballNewsFeed news={dailyNews} onAddNews={addDailyNews} userClub={null} manager={manager} teams={teams} standings={standings} currentRound={currentRound} calendarDate={calendarDate} />

        <CoachCardModal isOpen={showCoachCardModal} onClose={() => setShowCoachCardModal(false)} manager={manager} userClub={null} worldRankings={worldRankings} />
      </div>
    );
  }

  /* ===================== Employed manager ===================== */
  const safeFixtures = Array.isArray(fixtures) ? fixtures.filter(Boolean) : [];
  const safeTeams = Array.isArray(teams) ? teams.filter(Boolean) : [];
  const safeStandings = Array.isArray(standings) ? standings.filter(Boolean) : [];
  const roundFixtures = safeFixtures.filter(f => f.round === currentRound);

  const nextFixture: any = activeUserFixture ||
    roundFixtures.find(f => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id);

  const isHome = liveMatch ? liveMatch.homeTeam?.id === userClub.id : nextFixture?.homeTeamId === userClub.id;
  const oppTeamId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const oppTeam: Club | undefined = liveMatch
    ? ((isHome ? liveMatch.awayTeam : liveMatch.homeTeam) as Club)
    : oppTeamId
    ? safeTeams.find(t => t.id === oppTeamId) || findClubInWorld(oppTeamId) || FALLBACK_CLUB(oppTeamId, oppTeamId === 'team_user' ? 'فريقك' : undefined)
    : undefined;

  // Next user fixture in a future round (shown on rest rounds)
  const nextUpcomingUserFixture = safeFixtures.find(f => !f.isPlayed && f.round >= currentRound && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id));
  const isUpcomingHome = nextUpcomingUserFixture?.homeTeamId === userClub.id;
  const upcomingOppId = isUpcomingHome ? nextUpcomingUserFixture?.awayTeamId : nextUpcomingUserFixture?.homeTeamId;
  const upcomingOpp = upcomingOppId ? safeTeams.find(t => t.id === upcomingOppId) || findClubInWorld(upcomingOppId) || FALLBACK_CLUB(upcomingOppId) : undefined;

  // Standing: only the user's own row (never another club's numbers)
  const userRankIndex = safeStandings.findIndex(s => s.teamId === userClub.id);
  const userStanding = userRankIndex !== -1 ? safeStandings[userRankIndex] : null;
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 0;
  const rankText = userRank ? `#${userRank}` : '—';

  // Starters condition (?? so a 0 value is not turned into 100)
  const startingIds = Array.isArray(userClub.tactics?.startingPlayerIds) ? userClub.tactics.startingPlayerIds : [];
  const squadPlayers = Array.isArray(userClub.players) ? userClub.players.filter(Boolean) : [];
  const starters = squadPlayers.filter(p => p.id && startingIds.includes(p.id));
  const avg = (key: 'fitness' | 'morale', def: number) =>
    starters.length > 0 ? Math.round(starters.reduce((sum, p) => sum + ((p as any)[key] ?? def), 0) / starters.length) : def;
  const avgFitness = avg('fitness', 100);
  const avgMorale = avg('morale', 85);

  const topScorer = squadPlayers.length > 0
    ? squadPlayers.reduce((best, p) => ((p.stats?.goals || 0) > (best.stats?.goals || 0) ? p : best), squadPlayers[0])
    : null;

  const stageLabel = nextFixture?.stageName || nextFixture?.stage || `الجولة ${currentRound}`;
  const accent = userClub.primaryColor || '#10b981';
  const myScore = liveMatch ? (isHome ? liveMatch.homeScore : liveMatch.awayScore) : 0;
  const oppScore = liveMatch ? (isHome ? liveMatch.awayScore : liveMatch.homeScore) : 0;

  const TRAINING: { id: 'recovery' | 'normal' | 'high'; label: string; tone: Tone }[] = [
    { id: 'recovery', label: 'استشفاء', tone: 'sky' },
    { id: 'normal', label: 'متوازن', tone: 'emerald' },
    { id: 'high', label: 'مكثف 🔥', tone: 'amber' },
  ];

  const playNow = () => {
    setActiveTab('matches');
    startLiveMatch(nextFixture?.id);
  };

  /* ---------- 1. match / progression center ---------- */
  const matchCenter = seasonFinished ? (
    <Hero accent="#f59e0b">
      <div className="text-center space-y-3">
        <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
        <h2 className="text-lg font-black text-white">انتهى الموسم {season.seasonNumber}</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {userRank === 1 ? `🎉 مبروك التتويج بلقب ${activeLeague.name}!` : `أنهيت الموسم في المركز ${userRank || '—'} في ${activeLeague.name}. راجع الحصيلة وابدأ الموسم الجديد.`}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <BigButton tone="gold" onClick={openSeasonModal}><Trophy className="w-4 h-4" /> ختام الموسم وبدء الجديد</BigButton>
          <BigButton tone="ghost" onClick={() => setActiveTab('league')}>جدول الترتيب</BigButton>
        </div>
      </div>
    </Hero>
  ) : oppTeam ? (
    <Hero accent={accent}>
      {/* date + training */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800/80">
        <div className="min-w-0">
          <div className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{dateLabel}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isMatchDay ? (
              <strong className="text-emerald-400 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> المباراة اليوم أمام {oppTeam.name}</strong>
            ) : (
              <>باقي <strong className="text-amber-300 font-mono">{daysUntilNextMatch}</strong> {daysUntilNextMatch === 1 ? 'يوم' : 'أيام'} على اللقاء</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 self-start sm:self-center">
          <Activity className="w-3.5 h-3.5 text-emerald-400 mx-1" />
          {TRAINING.map(o => (
            <button
              key={o.id}
              onClick={() => setTrainingIntensity(o.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer ${
                trainingIntensity === o.id ? `${TONE[o.tone].bg} ${TONE[o.tone].text} border ${TONE[o.tone].border}` : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* competition line */}
      <div className="flex items-center justify-between text-[11px] mt-3">
        <span className="font-black text-amber-300 truncate">
          {compBadge(nextFixture, activeLeague.name)} • {stageLabel}
          {nextFixture?.date && <span className="text-cyan-400/80 font-mono mr-1"> ({nextFixture.date})</span>}
        </span>
        <span className="text-slate-400 font-bold shrink-0">{isHome ? '🏟️ بملعبنا' : '✈️ خارج الديار'}</span>
      </div>

      {/* head to head */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-4">
        <div className="flex flex-col items-center text-center min-w-0">
          <ClubBadge club={userClub} />
          <h3 className="font-black text-xs sm:text-sm text-white truncate max-w-full mt-2">{userClub.name}</h3>
          <span className="text-[10px] text-slate-400 mt-0.5">{userRank ? `المركز #${userRank}` : 'فريقك'}</span>
        </div>

        <div className="flex flex-col items-center justify-center min-w-[64px]">
          {liveMatch ? (
            <>
              <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 flex items-center gap-1.5 font-mono font-black text-lg text-white">
                <span className={myScore > oppScore ? 'text-emerald-400' : ''}>{myScore}</span>
                <span className="text-slate-600">:</span>
                <span className={oppScore > myScore ? 'text-emerald-400' : ''}>{oppScore}</span>
              </div>
              <span className={`text-[10px] font-black mt-1.5 ${liveMatch.isFinished ? 'text-amber-400' : 'text-rose-400'}`}>
                {liveMatch.isFinished ? 'نهائي' : `🔴 ${liveMatch.currentMinute}'`}
              </span>
            </>
          ) : (
            <div className="w-11 h-11 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center font-black text-sm text-amber-400">VS</div>
          )}
        </div>

        <div className="flex flex-col items-center text-center min-w-0">
          <ClubBadge club={oppTeam} />
          <h3 className="font-black text-xs sm:text-sm text-white truncate max-w-full mt-2">{oppTeam.name || 'المنافس'}</h3>
          <span className="text-[10px] text-slate-400 mt-0.5">{oppTeam.city || ''}</span>
        </div>
      </div>

      {/* actions */}
      <div className="pt-3 border-t border-slate-800/80 space-y-2">
        {liveMatch ? (
          <BigButton id="dashboard_continue_live_match_btn" onClick={() => setActiveTab('matches')}>
            <Play className="w-4 h-4 fill-slate-950" />
            {liveMatch.isFinished ? 'عرض النتيجة واعتماد الجولة' : `متابعة المباراة (${liveMatch.currentMinute}')`}
          </BigButton>
        ) : nextFixture?.isPlayed ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <BigButton id="dashboard_next_round_btn" disabled={isSimulationRunning} onClick={() => advanceToNextDay(true)}>
              <FastForward className="w-4 h-4" /> الجولة التالية ({currentRound + 1})
            </BigButton>
            <BigButton id="dashboard_advance_day_played_btn" tone="ghost" disabled={isSimulationRunning} onClick={() => advanceToNextDay(false)}>
              <Clock className="w-4 h-4 text-cyan-400" /> اليوم التالي (+1)
            </BigButton>
          </div>
        ) : isMatchDay ? (
          <BigButton id="dashboard_play_live_btn" disabled={isSimulationRunning} onClick={playNow}>
            <Play className="w-4 h-4 fill-slate-950" /> ابدأ المباراة ({stageLabel}) لايف
          </BigButton>
        ) : (
          <>
            <BigButton id="dashboard_play_match_direct_btn" disabled={isSimulationRunning} onClick={playNow} title="التقدم مباشرة لموعد المباراة وبدء اللقاء">
              <Play className="w-4 h-4 fill-slate-950" /> خوض المباراة الآن
            </BigButton>
            <div className="grid grid-cols-2 gap-2">
              <BigButton id="dashboard_fast_skip_match_btn" tone="ghost" disabled={isSimulationRunning} onClick={() => advanceToNextDay(true)} title="محاكاة الأيام حتى موعد اللقاء">
                <FastForward className="w-4 h-4 text-amber-400" /> تخطي الأيام ({daysUntilNextMatch})
              </BigButton>
              <BigButton id="dashboard_advance_day_btn" tone="ghost" disabled={isSimulationRunning} onClick={() => advanceToNextDay(false)} title="محاكاة يوم واحد مع التدريب والعلاج والمفاوضات">
                <Clock className="w-4 h-4 text-cyan-400" /> اليوم التالي (+1)
              </BigButton>
            </div>
          </>
        )}
      </div>
    </Hero>
  ) : (
    <Hero accent="#6366f1">
      <div className="flex items-center justify-between text-[11px] mb-3">
        <span className="flex items-center gap-1.5 font-black text-cyan-300"><Calendar className="w-3.5 h-3.5" /> الجولة {currentRound} من {totalRounds}</span>
        <span className="bg-indigo-500/15 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-500/40 font-black">☕ راحة لفريقك</span>
      </div>
      <div className="flex items-center gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-2xl shrink-0">🏆</div>
        <div>
          <h3 className="font-black text-sm text-white">لا مباراة لفريقك في هذه الجولة</h3>
          <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">تُلعب الآن مباريات الأندية الأخرى، ويعود فريقك في الجولة القادمة.</p>
        </div>
      </div>
      {nextUpcomingUserFixture && upcomingOpp && (
        <div className="flex items-center justify-between text-[11px] bg-slate-950/60 px-3.5 py-2.5 rounded-xl border border-slate-800 mt-2.5 gap-2">
          <span className="text-slate-400 flex items-center gap-1.5 shrink-0"><Swords className="w-3.5 h-3.5 text-amber-400" /> المباراة القادمة</span>
          <span className="text-amber-300 font-black truncate">ج{nextUpcomingUserFixture.round} • {upcomingOpp.name} {isUpcomingHome ? '🏟️' : '✈️'}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        <BigButton id="dashboard_sim_rest_round_btn" disabled={isSimulationRunning} onClick={() => { instantSimulateCurrentRound(); setActiveTab('matches'); }}>
          <Zap className="w-4 h-4" /> {isSimulationRunning ? 'جارٍ المحاكاة...' : `محاكاة الجولة ${currentRound}`}
        </BigButton>
        <BigButton id="dashboard_advance_day_rest_btn" tone="ghost" disabled={isSimulationRunning} onClick={() => advanceToNextDay(false)}>
          <Clock className="w-4 h-4 text-cyan-400" /> اليوم التالي (+1)
        </BigButton>
      </div>
    </Hero>
  );

  /* ---------- board panel ---------- */
  const board = (() => {
    if (!boardSystem) return null;
    const targetRank = boardSystem.targetLeaguePosition || 1;
    const rankMargin = userRank ? targetRank - userRank : 0;
    const isAhead = rankMargin >= 0;
    const boardConf = boardSystem.confidence ?? 80;
    const fanConf = boardSystem.fanConfidence ?? 80;
    const overall = boardSystem.overallConfidence ?? Math.round(boardConf * 0.55 + fanConf * 0.45);

    const boardLabel: Record<string, string> = { very_satisfied: 'راضٍ جداً ✨', satisfied: 'مستقر 👍', under_review: 'قيد التقييم ⚠️', danger_zone: 'تحذير خطر 🚨' };
    const fanLabel: Record<string, string> = { ecstatic: 'احتفالات 🥳', satisfied: 'دعم 👏', discontent: 'قلق 😒', furious: 'غضب 🤬' };

    const Gauge: React.FC<{ icon: string; title: string; label?: string; value: number }> = ({ icon, title, label, value }) => (
      <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs gap-2">
          <span className="font-black text-slate-200 flex items-center gap-1.5"><span>{icon}</span>{title}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${TONE[confTone(value)].bg} ${TONE[confTone(value)].border} ${TONE[confTone(value)].text}`}>{label || `${value}%`}</span>
        </div>
        <Meter value={value} tone={confTone(value)} height={7} />
        <div className="text-left text-[10px] font-mono text-slate-400">{value}%</div>
      </div>
    );

    return (
      <Panel
        title="ثقة الإدارة والجماهير"
        icon={<ShieldCheck className="w-4 h-4" />}
        tone="violet"
        right={<span className={`text-[11px] font-mono font-black ${TONE[confTone(overall)].text}`}>{overall}%</span>}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="text-slate-400">هدف النادي: <strong className="text-amber-300">{boardSystem.targetLeaguePositionText || `المركز ${targetRank} أو أعلى`}</strong></span>
            {userRank > 0 && (
              <span className={`px-2.5 py-1 rounded-xl font-black border shrink-0 ${isAhead ? TONE.emerald.bg + ' ' + TONE.emerald.border + ' ' + TONE.emerald.text : TONE.rose.bg + ' ' + TONE.rose.border + ' ' + TONE.rose.text}`}>
                #{userRank} {isAhead ? (rankMargin > 0 ? `(+${rankMargin} ✅)` : '✅') : `(${rankMargin} ⚠️)`}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Gauge icon="👔" title="مجلس الإدارة" label={boardLabel[boardSystem.boardStatus as string]} value={boardConf} />
            <Gauge icon="📣" title="الجمهور" label={fanLabel[boardSystem.fanStatus as string]} value={fanConf} />
          </div>
          {boardSystem.statusDescription && (
            <p className="text-[11px] text-slate-300 bg-slate-950/70 border border-slate-800 p-3 rounded-2xl leading-relaxed flex gap-2">
              <span className="shrink-0">💬</span><span>{boardSystem.statusDescription}</span>
            </p>
          )}
        </div>
      </Panel>
    );
  })();

  const worldRank =
    manager?.worldRank ||
    (Array.isArray(worldRankings?.managers) ? (worldRankings.managers.find((m: any) => m && (m.id === 'user_manager' || m.isUser)) as any)?.worldRank : null);
  const topManager = Array.isArray(worldRankings?.managers) ? worldRankings.managers[0]?.name : null;
  const topClub = Array.isArray(worldRankings?.clubs) ? worldRankings.clubs[0]?.clubName : null;

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      <Toast toast={toast} />

      {matchCenter}

      <SegTabs
        tone={dashboardSection === 'news' ? 'amber' : dashboardSection === 'prestige' ? 'violet' : 'emerald'}
        value={dashboardSection}
        onChange={setDashboardSection}
        tabs={[
          { id: 'overview', label: 'نظرة عامة', icon: <Activity className="w-3.5 h-3.5" /> },
          { id: 'news', label: 'الأخبار', icon: <Sparkles className="w-3.5 h-3.5" /> },
          { id: 'prestige', label: 'المدرب والتصنيف', icon: <Trophy className="w-3.5 h-3.5" /> },
        ]}
      />

      {dashboardSection === 'overview' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {activeNegotiations.length > 0 && (
            <LinkRow
              onClick={() => setActiveTab('transfers')}
              icon={<Briefcase className="w-4 h-4" />}
              tone="sky"
              title={`${activeNegotiations.length} مفاوضات جارية`}
              sub={activeNegotiations.some(n => n.actionRequired) ? '⚠️ يوجد عرض يتطلب ردك' : 'تتقدم يوماً بيوم مع التقويم'}
            />
          )}

          <LinkRow
            onClick={() => setActiveTab('challenges')}
            icon={<Zap className="w-4 h-4" />}
            tone="amber"
            title="مركز التحديات والمكافآت"
            sub="اربح متتالية، افتح الصناديق وضاعف مكافآتك"
            badge="2X 🎬"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button onClick={() => setActiveTab('league')} className="text-right cursor-pointer active:scale-[0.97] transition-transform">
              <StatTile tone="amber" label="الترتيب" value={rankText} icon={<Trophy className="w-3 h-3" />} sub={`${userStanding?.points ?? 0} نقطة`} />
              <div className="flex items-center gap-1 mt-1.5 px-1">
                {userStanding?.form && userStanding.form.length > 0 ? (
                  userStanding.form.slice(-5).map((res, i) => (
                    <span key={i} className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center text-white ${res === 'W' ? 'bg-emerald-600' : res === 'D' ? 'bg-amber-600' : 'bg-rose-600'}`}>
                      {res === 'W' ? 'ف' : res === 'D' ? 'ت' : 'خ'}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-500">لم تُلعب مباريات</span>
                )}
              </div>
            </button>

            <button onClick={() => setActiveTab('tactics')} className="text-right cursor-pointer active:scale-[0.97] transition-transform">
              <StatTile tone={avgFitness >= 75 ? 'emerald' : avgFitness >= 50 ? 'amber' : 'rose'} label="لياقة التشكيل" value={`${avgFitness}%`} icon={<Users className="w-3 h-3" />} sub={`المعنويات ${avgMorale}%`} />
              <div className="mt-1.5 px-1"><Meter value={avgFitness} tone={avgFitness >= 75 ? 'emerald' : avgFitness >= 50 ? 'amber' : 'rose'} height={4} /></div>
            </button>

            <button onClick={() => setActiveTab('career')} className="text-right cursor-pointer active:scale-[0.97] transition-transform">
              <StatTile tone="violet" label="مستوى المدرب" value={`Lv ${manager.level}`} icon={<Award className="w-3 h-3" />} sub={`رخصة CAF-${manager.license}`} />
            </button>

            <button onClick={() => setActiveTab('club')} className="text-right cursor-pointer active:scale-[0.97] transition-transform">
              <StatTile tone="sky" label="الميزانية" value={fmtShort(userClub.budget)} icon={<Wallet className="w-3 h-3" />} sub={`استاد ${(userClub.facilities?.stadiumCapacity || 5000).toLocaleString('en-US')}`} />
            </button>
          </div>

          {board}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topScorer && (
              <Panel title="نجم الفريق" icon={<Sparkles className="w-4 h-4" />} tone="amber" right={<button onClick={() => onSelectPlayer(topScorer)} className="text-[11px] text-emerald-300 font-bold">البطاقة ➔</button>}>
                <button onClick={() => onSelectPlayer(topScorer)} className="w-full flex items-center gap-3 text-right cursor-pointer">
                  <div className="w-12 h-14 border-2 border-emerald-500/40 bg-emerald-500/10 flex flex-col items-center justify-center shrink-0" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)' }}>
                    <span className="font-black text-lg leading-none font-mono text-emerald-300">{topScorer.overallRating}</span>
                    <span className="text-[8px] font-black text-slate-400">{topScorer.position}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-sm text-white truncate">{topScorer.name}</div>
                    {topScorer.nickname && <div className="text-[11px] text-amber-300 font-bold truncate">"{topScorer.nickname}"</div>}
                    <div className="text-[11px] text-slate-400 mt-0.5">⚽ {topScorer.stats?.goals ?? 0} • 🎯 {topScorer.stats?.assists ?? 0}</div>
                  </div>
                </button>
              </Panel>
            )}

            <Panel title="الخطة والأسلوب" icon={<ShieldCheck className="w-4 h-4" />} tone="sky" right={<button onClick={() => setActiveTab('tactics')} className="text-[11px] text-sky-300 font-bold">تعديل ➔</button>}>
              <button onClick={() => setActiveTab('tactics')} className="w-full flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-right cursor-pointer">
                <div>
                  <div className="text-lg font-black text-white font-mono">{userClub.tactics?.formation || '4-3-3'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{MENTALITY_LABEL[userClub.tactics?.mentality as string] || 'توازن تكتيكي'}</div>
                </div>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
              </button>
            </Panel>
          </div>
        </div>
      )}

      {dashboardSection === 'news' && (
        <div className="animate-in fade-in duration-200">
          <FootballNewsFeed news={dailyNews} onAddNews={addDailyNews} userClub={userClub} manager={manager} teams={teams} standings={standings} currentRound={currentRound} calendarDate={calendarDate} />
        </div>
      )}

      {dashboardSection === 'prestige' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <CoachHomeCard manager={manager} userClub={userClub} worldRankings={worldRankings} userDynamicManagerRating={userDynamicManagerRating} onOpenFullModal={() => setShowCoachCardModal(true)} />

          <Panel title="التصنيف العالمي" icon={<Globe2 className="w-4 h-4" />} tone="violet" right={<span className="text-[10px] text-violet-300 font-bold">{worldRankings?.rankingMonth || 'شهري'}</span>}>
            <button onClick={() => setActiveTab('rankings')} className="w-full text-right cursor-pointer space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <StatTile tone="amber" label="مركزك عالمياً" value={worldRank ? `#${worldRank}` : '—'} />
                <StatTile tone="emerald" label="قوة التشكيلة" value={userSquadStrength?.averageStartingRating ?? userSquadStrength?.overall ?? '—'} />
                <StatTile tone="violet" label="قوة المدرب" value={userDynamicManagerRating != null ? `${userDynamicManagerRating}` : '—'} sub="من 99" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center bg-slate-950/70 p-2.5 rounded-2xl border border-slate-800">
                <div><div className="text-[10px] text-slate-500">نقاط التصنيف</div><div className="font-black text-white font-mono text-xs">{manager?.rankingPoints != null ? manager.rankingPoints.toLocaleString('en-US') : '—'}</div></div>
                <div className="border-x border-slate-800"><div className="text-[10px] text-slate-500">أول المدربين</div><div className="font-black text-amber-300 text-xs truncate px-1">{topManager || '—'}</div></div>
                <div><div className="text-[10px] text-slate-500">أول الأندية</div><div className="font-black text-cyan-300 text-xs truncate px-1">{topClub || '—'}</div></div>
              </div>
            </button>
          </Panel>
        </div>
      )}

      <CoachCardModal isOpen={showCoachCardModal} onClose={() => setShowCoachCardModal(false)} manager={manager} userClub={userClub} worldRankings={worldRankings} />
    </div>
  );
};
