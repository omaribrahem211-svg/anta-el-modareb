import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { recalculateStandingsFromFixtures } from '../utils/engine';
import {
  Trophy,
  Award,
  Target,
  Share2,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Medal,
  Crown,
  RefreshCw,
  Zap,
  Globe,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { fetchDailyManagersLeaderboard, DailyManagerLeaderboardEntry } from '../services/managerRankingService';
import { getClubDisplayName } from '../data/leaguesData';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { isEuropeanCountry } from '../utils/continentalEngine';
import { ClubBadge } from './ClubBadge';

export const LeagueTab: React.FC = () => {
  const {
    standings,
    fixtures,
    userClub,
    teams,
    currentRound,
    totalRounds,
    season,
    activeLeague,
    manager,
    cupTournament,
    africanChampionsLeague,
    calendarDate,
  } = useGame();
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<
    'standings' | 'domestic_cup' | 'continental' | 'daily_managers' | 'scorers' | 'assists'
  >('standings');
  const [dailyLeaders, setDailyLeaders] = useState<DailyManagerLeaderboardEntry[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);

  const loadDailyRanking = async () => {
    setLoadingDaily(true);
    try {
      const entries = await fetchDailyManagersLeaderboard(
        user?.uid,
        manager,
        userClub?.name,
        activeLeague?.name
      );
      setDailyLeaders(entries);
    } catch (e) {
      console.warn('Error loading daily ranking:', e);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'daily_managers') {
      loadDailyRanking();
    }
  }, [activeSubTab, manager.dailyPoints, user?.uid]);

  const getPlayerClubName = (player: any) => {
    if (!player) return userClub?.name || 'النادي';
    const club = teams.find(
      t => t && (t.id === player.currentClubId || (t.players || []).some((p: any) => p && p.id === player.id))
    );
    return club?.name || userClub?.name || 'النادي';
  };

  const getClubName = (clubId: string) => {
    return getClubDisplayName(clubId, teams);
  };

  const { topScorers, topAssisters } = useMemo(() => {
    const players = (teams || [])
      .filter(Boolean)
      .flatMap(t => (Array.isArray(t.players) ? t.players.filter(Boolean) : []));

    const scorers = [...players]
      .filter(p => (p.stats?.goals || 0) > 0)
      .sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0))
      .slice(0, 50);

    const assisters = [...players]
      .filter(p => (p.stats?.assists || 0) > 0)
      .sort((a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0))
      .slice(0, 50);

    return { topScorers: scorers, topAssisters: assisters };
  }, [teams]);

  const effectiveStandings = useMemo(() => {
    const isAllZero = standings.length === 0 || standings.every(s => (s.played || 0) === 0);
    const hasPlayedFixtures = (fixtures || []).some(
      f => f && (!f.competitionType || f.competitionType === 'league' || f.competitionType === 'LEAGUE') && (f.isPlayed || (f as any).played)
    );
    if ((isAllZero && hasPlayedFixtures) || standings.length === 0) {
      return recalculateStandingsFromFixtures(standings, teams, fixtures);
    }
    return standings;
  }, [standings, teams, fixtures]);

  const promotionSpots = activeLeague.promotionSpots || 1;
  const relegationSpots = activeLeague.relegationSpots || 0;
  const totalTeams = effectiveStandings.length;

  const isEuro = isEuropeanCountry(activeLeague.country);
  const cupDef = getDomesticCupDefinitionForCountry(activeLeague.country || 'مصر');
  const cupTitle = cupTournament?.name || cupDef.shortName || cupDef.name;
  const continentalTitle = africanChampionsLeague?.name || (isEuro ? 'دوري أبطال أوروبا' : 'دوري أبطال إفريقيا');

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-white">{activeLeague.name}</h2>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-bold border border-slate-700">
                  الموسم {season.seasonNumber}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {activeLeague.country} • الدرجة {activeLeague.divisionTier} • {totalTeams} أندية
              </span>
            </div>
          </div>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700 font-bold text-emerald-400">
            الجولة {Math.min(currentRound, totalRounds)} / {totalRounds}
          </span>
        </div>

        {/* Continental Qualification & Promotion/Relegation Rules */}
        <div className="flex flex-wrap gap-2 text-xs">
          {activeLeague.tier === 1 ? (
            <>
              <div className="bg-amber-950/50 border border-amber-700/70 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  المركز 1 و 2: تأهل مباشر إلى {isEuro ? 'دوري أبطال أوروبا 🏆' : 'دوري أبطال إفريقيا 🏆'}
                </span>
              </div>
              <div className="bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-300">
                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  بطل {cupTitle} والمركز 3 (أو 4): تأهل إلى {isEuro ? 'الدوري الأوروبي 🟠' : 'كأس الكونفدرالية الإفريقية 🌍'}
                </span>
              </div>
            </>
          ) : (
            promotionSpots > 0 && (
              <div className="bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-300">
                <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>المراكز (1 إلى {promotionSpots}): صعود مباشر إلى الدرجة الأعلى 🚀</span>
              </div>
            )
          )}
          {relegationSpots > 0 && (
            <div className="bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-rose-300">
              <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                آخر {relegationSpots} مراكز ({totalTeams - relegationSpots + 1} إلى {totalTeams}): هبوط مباشر ⚠️
              </span>
            </div>
          )}
        </div>

        {/* Sub-Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('standings')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'standings' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            جدول الدوري
          </button>
          <button
            onClick={() => setActiveSubTab('domestic_cup')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'domestic_cup'
                ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="truncate">{cupTitle} 🛡️</span>
          </button>
          <button
            onClick={() => setActiveSubTab('daily_managers')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'daily_managers' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>ترتيب المدربين ⭐</span>
          </button>
          <button
            onClick={() => setActiveSubTab('scorers')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'scorers' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            الهدافين ⚽
          </button>
          <button
            onClick={() => setActiveSubTab('assists')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'assists' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            صناع اللعب 🎯
          </button>
        </div>
      </div>

      {/* VIEW 1: League Table */}
      {activeSubTab === 'standings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-2 text-center w-8">#</th>
                  <th className="py-3 px-2">الفريق</th>
                  <th className="py-3 px-2 text-center">لعب</th>
                  <th className="py-3 px-1.5 text-center">ف</th>
                  <th className="py-3 px-1.5 text-center">ت</th>
                  <th className="py-3 px-1.5 text-center">خ</th>
                  <th className="py-3 px-1.5 text-center">له</th>
                  <th className="py-3 px-1.5 text-center">عليه</th>
                  <th className="py-3 px-2 text-center font-mono">الفارق</th>
                  <th className="py-3 px-3 text-center font-black text-amber-400">النقاط</th>
                  <th className="py-3 px-2 text-center hidden sm:table-cell">النتائج</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {effectiveStandings.map((team, idx) => {
                  if (!team) return null;
                  const isUser = userClub?.id ? team.teamId === userClub.id : false;
                  const isLeader = idx === 0;
                  const isChampionsLeagueZone = activeLeague.tier === 1 && idx < 2;
                  const isSecondaryContinentalZone = activeLeague.tier === 1 && (idx === 2 || idx === 3);
                  const isPromotionZone = activeLeague.tier > 1 && idx < promotionSpots;
                  const isRelegationZone = relegationSpots > 0 && idx >= totalTeams - relegationSpots;

                  const matchingClub = teams.find(t => t && (t.id === team.teamId || t.name === team.teamName));

                  return (
                    <tr
                      key={team.teamId}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 font-bold'
                          : isChampionsLeagueZone || isPromotionZone
                          ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                          : isSecondaryContinentalZone
                          ? 'bg-cyan-950/15 hover:bg-cyan-950/25'
                          : isRelegationZone
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold ${
                            isLeader
                              ? 'bg-amber-400 text-slate-950'
                              : isChampionsLeagueZone || isPromotionZone
                              ? 'bg-emerald-500 text-slate-950'
                              : isSecondaryContinentalZone
                              ? 'bg-cyan-500 text-slate-950'
                              : isRelegationZone
                              ? 'bg-rose-500 text-white'
                              : isUser
                              ? 'bg-blue-400 text-slate-950'
                              : 'text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <ClubBadge club={matchingClub || { id: team.teamId, name: team.teamName }} size="xs" />
                          <span
                            className={`truncate max-w-[130px] sm:max-w-[180px] ${
                              isUser ? 'text-amber-300 font-bold' : 'text-slate-200'
                            }`}
                          >
                            {team.teamName}
                          </span>
                          {isUser && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-semibold">
                              فريقك
                            </span>
                          )}
                          {isChampionsLeagueZone && (
                            <span className="text-[9px] text-amber-400 font-medium" title="مؤهل لدوري الأبطال">
                              🏆
                            </span>
                          )}
                          {isSecondaryContinentalZone && (
                            <span className="text-[9px] text-cyan-400 font-medium" title="مؤهل للكونفدرالية / الدوري الأوروبي">
                              🌍
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-2 text-center font-mono text-slate-300">{team.played}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-emerald-400">{team.won}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-amber-400">{team.drawn}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-red-400">{team.lost}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-slate-400">{team.goalsFor}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-slate-400">{team.goalsAgainst}</td>

                      <td className="py-3 px-2 text-center font-mono font-bold">
                        <span
                          className={
                            team.goalDifference > 0
                              ? 'text-emerald-400'
                              : team.goalDifference < 0
                              ? 'text-red-400'
                              : 'text-slate-400'
                          }
                        >
                          {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-amber-400">{team.points}</td>

                      <td className="py-3 px-2 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center gap-0.5">
                          {(team.form || []).map((f, i) => (
                            <span
                              key={i}
                              className={`w-3.5 h-3.5 rounded-sm text-[8px] font-bold flex items-center justify-center text-white ${
                                f === 'W' ? 'bg-emerald-600' : f === 'D' ? 'bg-amber-600' : 'bg-red-600'
                              }`}
                            >
                              {f === 'W' ? 'ف' : f === 'D' ? 'ت' : 'خ'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: Domestic National Cup */}
      {activeSubTab === 'domestic_cup' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/40 rounded-3xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">{cupDef.name}</h3>
                    <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">
                      خروج المغلوب المباشر ⚡
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {cupDef.formatDescription} • الفائز يتأهل مباشرة إلى{' '}
                    <strong className="text-emerald-400">
                      {isEuro ? 'الدوري الأوروبي (UEFA Europa League)' : 'كأس الكونفدرالية الإفريقية (CAF Confederation Cup)'}
                    </strong>{' '}
                    • جائزة البطل: <strong className="text-amber-400 font-mono">{cupDef.championPrize.toLocaleString()} ج.م</strong>
                  </p>
                </div>
              </div>
              {cupTournament?.winnerClubId && (
                <div className="bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 rounded-2xl text-xs text-amber-300 font-black flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>بطل الكأس: {getClubName(cupTournament.winnerClubId)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>مواجهات وأدوار {cupTitle} (منتصف الأسبوع - وقت إضافي وركلات ترجيح)</span>
            </h4>

            {!cupTournament || !cupTournament.matches || cupTournament.matches.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">جاري تجهيز قرعة الكأس الوطنية للموسم الحالي...</div>
            ) : (
              <div className="space-y-3">
                {cupTournament.matches.map(cm => {
                  const isUserMatch = Boolean(userClub && (cm.homeTeamId === userClub.id || cm.awayTeamId === userClub.id));
                  const matchingFix = (fixtures || []).find(f => f.id === cm.id);
                  const matchDate = matchingFix?.date;
                  const isToday = Boolean(calendarDate?.rawDateStr && matchDate && matchDate <= calendarDate.rawDateStr);
                  const isActuallyPlayed = Boolean(cm.isPlayed && cm.homeScore !== undefined && cm.awayScore !== undefined);

                  return (
                    <div
                      key={cm.id}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${
                        isUserMatch
                          ? 'bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 border-amber-500/60 shadow-md'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      {/* Top Header Row: Stage Badge + Winner / Date / Play CTA */}
                      <div className="flex items-center justify-between gap-2 w-full border-b border-slate-800/70 pb-2">
                        <span className="bg-slate-900 px-2.5 py-1 rounded-xl text-rose-300 font-bold text-xs border border-slate-800">
                          {cm.stageName}
                        </span>

                        <div className="shrink-0">
                          {!isActuallyPlayed ? (
                            isToday && isUserMatch ? (
                              <button
                                onClick={() => window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }))}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer animate-pulse"
                              >
                                <Play className="w-3 h-3 fill-white" />
                                <span>خوض مباراة الكأس ⚽</span>
                              </button>
                            ) : (
                              <div className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{matchDate || 'مجدولة بالتقويم'}</span>
                              </div>
                            )
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-800/50">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>تأهل: {getClubName(cm.winnerTeamId || (cm.homeScore! > cm.awayScore! ? cm.homeTeamId : cm.awayTeamId))}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Matchup Row: Home Team vs Away Team */}
                      <div className="flex items-center justify-between gap-2 w-full">
                        <span
                          className={`text-xs sm:text-sm font-bold leading-snug break-words flex-1 text-right ${
                            isActuallyPlayed && cm.winnerTeamId === cm.homeTeamId
                              ? 'text-emerald-400 font-black'
                              : cm.homeTeamId === userClub?.id
                              ? 'text-amber-300 font-black'
                              : 'text-white'
                          }`}
                        >
                          {getClubName(cm.homeTeamId)}
                        </span>

                        <div className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl font-mono font-black text-sm text-center shrink-0 min-w-[72px]">
                          {isActuallyPlayed ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-white">
                                {cm.homeScore} - {cm.awayScore}
                              </span>
                              {cm.homePenalties !== undefined && cm.awayPenalties !== undefined && (
                                <span className="text-[10px] text-amber-400 font-bold mt-0.5 whitespace-nowrap">
                                  ({cm.homePenalties} - {cm.awayPenalties} ر.ت)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs font-bold">VS</span>
                          )}
                        </div>

                        <span
                          className={`text-xs sm:text-sm font-bold leading-snug break-words flex-1 text-left ${
                            isActuallyPlayed && cm.winnerTeamId === cm.awayTeamId
                              ? 'text-emerald-400 font-black'
                              : cm.awayTeamId === userClub?.id
                              ? 'text-amber-300 font-black'
                              : 'text-white'
                          }`}
                        >
                          {getClubName(cm.awayTeamId)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Top Scorers */}
      {activeSubTab === 'scorers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-red-400" />
            <span>قائمة هدافي المسابقة</span>
          </h3>

          {topScorers.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              لم تسجل أي أهداف بعد في البطولة. العب الجولات لتظهر أسماء الهدافين هنا!
            </div>
          ) : (
            <div className="space-y-2">
              {topScorers.map((player, idx) => (
                <div
                  key={player.id}
                  className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold font-mono text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">
                        {getPlayerClubName(player)} • {player.position}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-700 px-3 py-1.5 rounded-xl font-bold font-mono text-sm">
                    <span>⚽</span>
                    <span>{player.stats?.goals || 0} أهداف</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: Daily Managers Leaderboard */}
      {activeSubTab === 'daily_managers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-4 rounded-2xl border border-amber-500/20">
            <div>
              <h3 className="font-black text-base text-amber-300 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>ترتيب مدربي اللعبة اليومي (Live Daily Points)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                يُحسب الترتيب يومياً بناءً على عدد النقاط المكتسبة من لعب المباريات اليوم (3 نقاط للفوز، 1 للتعادل). يتجدد كل 24 ساعة.
              </p>
            </div>

            <button
              onClick={loadDailyRanking}
              disabled={loadingDaily}
              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDaily ? 'animate-spin text-amber-400' : ''}`} />
              <span>تحديث الترتيب</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">نقاطك اليوم</div>
                <div className="text-xl font-black text-amber-400 font-mono">
                  {manager.dailyPoints || 0} <span className="text-xs font-normal">نقطة</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                <Medal className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">مباريات لعبتها اليوم</div>
                <div className="text-xl font-black text-blue-400 font-mono">{manager.dailyMatchesPlayed || 0}</div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                ⚽
              </div>
              <div>
                <div className="text-[11px] text-slate-400">انتصارات اليوم</div>
                <div className="text-xl font-black text-emerald-400 font-mono">{manager.dailyWins || 0}</div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">مستوى المدرب</div>
                <div className="text-xl font-black text-purple-400 font-mono">مستوى {manager.level}</div>
              </div>
            </div>
          </div>

          {loadingDaily ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">جاري تحميل لوحة صدارة المدربين اليومية...</p>
            </div>
          ) : dailyLeaders.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/50 rounded-2xl border border-slate-800">
              <Crown className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h4 className="font-bold text-sm text-slate-300">كن أول مدرب يحصد نقاط اليوم!</h4>
              <p className="text-xs text-slate-500 mt-1">العب مباريات الدوري واحصد نقاط الفوز والتعادل لتتصدر القائمة.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dailyLeaders.map((lead, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={lead.uid + idx}
                    className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      lead.isCurrentUser
                        ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/20'
                        : isTop1
                        ? 'bg-gradient-to-r from-amber-950/20 to-slate-950 border-amber-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm font-mono shrink-0 shadow-md ${
                          isTop1
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                            : isTop2
                            ? 'bg-slate-300 text-slate-950'
                            : isTop3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{lead.managerName}</span>
                          {lead.isCurrentUser && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-full shrink-0">
                              أنت
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                            مستوى {lead.level}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <Shield className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{lead.clubName}</span>
                          <span>•</span>
                          <span>{lead.leagueName || 'الدوري العام'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-left">
                      <div className="hidden sm:flex flex-col items-end text-xs text-slate-400 font-mono">
                        <span>{lead.dailyMatchesPlayed} مباريات</span>
                        <span className="text-[11px] text-emerald-400">
                          {lead.dailyWins}ف - {lead.dailyDraws}ت - {lead.dailyLosses}خ
                        </span>
                      </div>

                      <div className="bg-slate-900 border border-amber-500/30 px-3.5 py-1.5 rounded-xl text-center min-w-[75px]">
                        <div className="text-[10px] text-slate-400 font-medium">النقاط</div>
                        <div className="text-base font-black text-amber-300 font-mono leading-none mt-0.5">
                          {lead.dailyPoints}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 5: Top Assists */}
      {activeSubTab === 'assists' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-400" />
            <span>قائمة أكثر اللاعبين صناعة للأهداف (Playmakers)</span>
          </h3>

          {topAssisters.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              لم يتم صناعة أهداف مسجلة بعد. العب المباريات لمشاهدة التمريرات الحاسمة!
            </div>
          ) : (
            <div className="space-y-2">
              {topAssisters.map((player, idx) => (
                <div
                  key={player.id}
                  className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold font-mono text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white">{player.name}</div>
                      <div className="text-xs text-slate-400">
                        {getPlayerClubName(player)} • {player.position}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-blue-950 text-blue-300 border border-blue-700 px-3 py-1.5 rounded-xl font-bold font-mono text-sm">
                    <span>🎯</span>
                    <span>{player.stats?.assists || 0} صناعة</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

          </div>
  );
};
