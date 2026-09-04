import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import {
  Trophy,
  Award,
  TrendingUp,
  Target,
  Share2,
  Shield,
  Star,
  Flame,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Medal,
  Crown,
  RefreshCw,
  Zap,
  Globe,
} from 'lucide-react';
import { fetchDailyManagersLeaderboard, DailyManagerLeaderboardEntry } from '../services/managerRankingService';
import { getClubDisplayName, findClubInWorld } from '../data/leaguesData';

export const LeagueTab: React.FC = () => {
  const {
    standings,
    userClub,
    teams,
    currentRound,
    totalRounds,
    season,
    activeLeague,
    cupTournament,
    africanChampionsLeague,
    uefaChampionsLeague,
    manager,
  } = useGame();
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'standings' | 'cup' | 'african_cl' | 'uefa_cl' | 'scorers' | 'assists' | 'daily_managers'>('standings');
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

  // Helper to find player club name
  const getPlayerClubName = (player: any) => {
    const club = teams.find(t => t.id === player.currentClubId || (t.players || []).some((p: any) => p.id === player.id));
    return club?.name || userClub?.name || 'النادي';
  };

  // Helper to get club by ID
  const getClubName = (clubId: string) => {
    return getClubDisplayName(clubId, teams);
  };

  // Aggregate players across all league clubs for statistics
  const allPlayers = teams.flatMap(t => Array.isArray(t.players) ? t.players : []);

  const topScorers = [...allPlayers].sort((a, b) => (b.stats?.goals || 0) - (a.stats?.goals || 0)).filter(p => (p.stats?.goals || 0) > 0);
  const topAssisters = [...allPlayers].sort((a, b) => (b.stats?.assists || 0) - (a.stats?.assists || 0)).filter(p => (p.stats?.assists || 0) > 0);

  const promotionSpots = activeLeague.promotionSpots || 1;
  const relegationSpots = activeLeague.relegationSpots || 0;
  const totalTeams = standings.length;

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

        {/* Promotion / Relegation Rule Pill */}
        <div className="flex flex-wrap gap-2 text-xs">
          {promotionSpots > 0 && (
            <div className="bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-300">
              <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>المراكز (1 إلى {promotionSpots}): صعود مباشر إلى الدرجة الأعلى 🚀</span>
            </div>
          )}
          {relegationSpots > 0 && (
            <div className="bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-rose-300">
              <ArrowDownRight className="w-4 h-4 text-rose-400 shrink-0" />
              <span>آخر {relegationSpots} مراكز ({totalTeams - relegationSpots + 1} إلى {totalTeams}): هبوط مباشر ⚠️</span>
            </div>
          )}
        </div>

        {/* Sub-Tab Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab('standings')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'standings' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            جدول الترتيب
          </button>
          <button
            onClick={() => setActiveSubTab('cup')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'cup' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏆 الكأس الوطنية
          </button>
          <button
            onClick={() => setActiveSubTab('african_cl')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'african_cl' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌍 أبطال إفريقيا
          </button>
          <button
            onClick={() => setActiveSubTab('uefa_cl')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeSubTab === 'uefa_cl' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⭐ أبطال أوروبا
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
                {standings.map((team, idx) => {
                  const isUser = userClub ? team.teamId === userClub.id : false;
                  const isLeader = idx === 0;
                  const isPromotionZone = idx < promotionSpots;
                  const isRelegationZone = relegationSpots > 0 && idx >= totalTeams - relegationSpots;

                  return (
                    <tr
                      key={team.teamId}
                      className={`transition-colors ${
                        isUser
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 font-bold'
                          : isPromotionZone
                          ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                          : isRelegationZone
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-2 text-center">
                        <span 
                          className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-bold ${
                            isLeader 
                              ? 'bg-amber-400 text-slate-950' 
                              : isPromotionZone
                              ? 'bg-emerald-500 text-slate-950'
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

                      {/* Team Name */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`truncate max-w-[130px] sm:max-w-[180px] ${isUser ? 'text-amber-300 font-bold' : 'text-slate-200'}`}>
                            {team.teamName}
                          </span>
                          {isUser && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-semibold">
                              فريقك
                            </span>
                          )}
                          {isPromotionZone && !isUser && (
                            <span className="text-[9px] text-emerald-400 font-medium">⬆️</span>
                          )}
                          {isRelegationZone && !isUser && (
                            <span className="text-[9px] text-rose-400 font-medium">⬇️</span>
                          )}
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="py-3 px-2 text-center font-mono text-slate-300">{team.played}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-emerald-400">{team.won}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-amber-400">{team.drawn}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-red-400">{team.lost}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-slate-400">{team.goalsFor}</td>
                      <td className="py-3 px-1.5 text-center font-mono text-slate-400">{team.goalsAgainst}</td>
                      
                      {/* Goal Difference */}
                      <td className="py-3 px-2 text-center font-mono font-bold">
                        <span className={team.goalDifference > 0 ? 'text-emerald-400' : team.goalDifference < 0 ? 'text-red-400' : 'text-slate-400'}>
                          {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-amber-400">
                        {team.points}
                      </td>

                      {/* Form */}
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

      {/* VIEW 2: National Cup Tournament */}
      {activeSubTab === 'cup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="font-bold text-base text-white">
                  {cupTournament?.name || 'كأس مصر الوطنية'}
                </h3>
                <span className="text-xs text-slate-400">
                  الموسم {season.seasonNumber} • بطولة خروج المغلوب بنظام الإقصاء المباشر وركلات الترجيح
                </span>
              </div>
            </div>
            {cupTournament?.isCompleted && cupTournament.winnerClubId && (
              <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                🏆 بطل الكأس: {getClubName(cupTournament.winnerClubId)}
              </div>
            )}
          </div>

          {/* Cup Stages Breakdown */}
          {cupTournament && cupTournament.matches && cupTournament.matches.length > 0 ? (
            <div className="space-y-4 pt-2">
              {(['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final'] as const).map(stageKey => {
                const stageMatches = cupTournament.matches.filter(m => m.stage === stageKey);
                if (stageMatches.length === 0) return null;

                const stageTitle = 
                  stageKey === 'round_of_64' ? 'دور الـ 64 (شامل كافة درجات الدوري)' :
                  stageKey === 'round_of_32' ? 'دور الـ 32' :
                  stageKey === 'round_of_16' ? 'ثمن النهائي (دور الـ 16)' :
                  stageKey === 'quarter' ? 'دور ربع النهائي' : 
                  stageKey === 'semi' ? 'دور نصف النهائي' : 
                  'المباراة النهائية 🏆';
                const triggerRound = stageMatches[0]?.roundTrigger || 18;

                return (
                  <div key={stageKey} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{stageTitle}</span>
                        {stageMatches.every(m => m.isPlayed) ? (
                          <span className="text-emerald-400 text-xs font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">مكتمل ✓</span>
                        ) : (
                          <span className="text-amber-400 text-xs font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">تقام مع الجولة {triggerRound}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stageMatches.map(m => {
                        const homeName = getClubName(m.homeTeamId);
                        const awayName = getClubName(m.awayTeamId);
                        const isUserMatch = userClub ? (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) : false;

                        return (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                              isUserMatch
                                ? 'bg-purple-950/30 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                                : 'bg-slate-900/70 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate flex-1">
                              {userClub && m.homeTeamId === userClub.id && <span className="text-[10px] text-amber-400 font-black">★</span>}
                              <span className={`truncate ${m.winnerTeamId === m.homeTeamId ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                                {homeName}
                              </span>
                            </div>

                            <div className="text-center px-2 py-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                              {m.isPlayed ? (
                                <div>
                                  <span className="font-mono font-black text-white text-sm">
                                    {m.homeScore} - {m.awayScore}
                                  </span>
                                  {m.homePenalties !== undefined && m.awayPenalties !== undefined && (
                                    <div className="text-[10px] text-amber-400 font-mono">
                                      ركلات ({m.homePenalties} - {m.awayPenalties})
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-medium">لم تلعب بعد</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 truncate flex-1 justify-end text-left">
                              <span className={`truncate ${m.winnerTeamId === m.awayTeamId ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                                {awayName}
                              </span>
                              {userClub && m.awayTeamId === userClub.id && <span className="text-[10px] text-amber-400 font-black">★</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">
              لا توجد مباريات مبرمجة في الكأس حالياً
            </div>
          )}
        </div>
      )}

      {/* VIEW: African Champions League */}
      {activeSubTab === 'african_cl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-base text-white">
                  {africanChampionsLeague?.name || 'دوري أبطال إفريقيا'}
                </h3>
                <span className="text-xs text-slate-400">
                  الموسم {season.seasonNumber} • مرحلة المجموعات (16 نادياً) والأدوار الإقصائية القارية
                </span>
              </div>
            </div>
            {africanChampionsLeague?.isCompleted && africanChampionsLeague.winnerClubId && (
              <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                🏆 البطل الإفريقي: {getClubName(africanChampionsLeague.winnerClubId)}
              </div>
            )}
          </div>

          {/* Group Tables */}
          {africanChampionsLeague?.groups && africanChampionsLeague.groups.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-emerald-400">مجموعات دوري أبطال إفريقيا</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {africanChampionsLeague.groups.map(grp => (
                  <div key={grp.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <div className="font-bold text-xs text-white border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{grp.name}</span>
                      <span className="text-[10px] text-emerald-400">يتأهل الأول والثاني</span>
                    </div>
                    <table className="w-full text-right text-xs">
                      <thead className="text-[10px] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1 px-1 text-center w-6">#</th>
                          <th className="py-1 px-1">الفريق</th>
                          <th className="py-1 px-1 text-center">لعب</th>
                          <th className="py-1 px-1 text-center">فارق</th>
                          <th className="py-1 px-1 text-center font-bold text-emerald-400">نقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {grp.standings.map((st, sIdx) => {
                          const isUser = userClub?.id === st.teamId;
                          const isQualifying = sIdx < 2;
                          return (
                            <tr key={st.teamId} className={isUser ? 'bg-emerald-950/40 font-bold' : isQualifying ? 'bg-slate-900/40' : ''}>
                              <td className="py-1.5 px-1 text-center">
                                <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center font-mono text-[10px] ${
                                  isQualifying ? 'bg-emerald-500/30 text-emerald-300 font-bold' : 'text-slate-500'
                                }`}>
                                  {sIdx + 1}
                                </span>
                              </td>
                              <td className="py-1.5 px-1 truncate max-w-[120px] text-white">
                                {st.teamName} {isUser && <span className="text-amber-400">★</span>}
                              </td>
                              <td className="py-1.5 px-1 text-center text-slate-400 font-mono">{st.played}</td>
                              <td className="py-1.5 px-1 text-center text-slate-400 font-mono">{st.goalDifference > 0 ? `+${st.goalDifference}` : st.goalDifference}</td>
                              <td className="py-1.5 px-1 text-center font-bold text-emerald-400 font-mono">{st.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knockout Stage */}
          {africanChampionsLeague && (
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-emerald-400">الأدوار الإقصائية الإفريقية</h4>
              {(['quarter', 'semi', 'final'] as const).map(stageKey => {
                const stageMatches = (africanChampionsLeague.matches || []).filter(m => m.stage === stageKey);
                if (stageMatches.length === 0) return null;
                const stageName = stageKey === 'quarter' ? 'ربع النهائي (الجولة 14)' : stageKey === 'semi' ? 'نصف النهائي (الجولة 18)' : 'النهائي القاري الكبير 🏆 (الجولة 22)';

                return (
                  <div key={stageKey} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <span className="font-bold text-xs text-slate-200 block">{stageName}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {stageMatches.map(m => {
                        const homeName = getClubName(m.homeTeamId);
                        const awayName = getClubName(m.awayTeamId);
                        const isUserMatch = userClub ? (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) : false;

                        return (
                          <div key={m.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isUserMatch ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-slate-900/60 border-slate-800'
                          }`}>
                            <span className={`truncate flex-1 ${m.winnerTeamId === m.homeTeamId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                              {homeName}
                            </span>
                            <div className="px-2 py-0.5 bg-slate-950 rounded font-mono font-bold text-white shrink-0 text-center">
                              {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : 'لم تلعب'}
                              {m.homePenalties !== undefined && m.awayPenalties !== undefined && (
                                <div className="text-[9px] text-amber-400">({m.homePenalties}-{m.awayPenalties} ركلات)</div>
                              )}
                            </div>
                            <span className={`truncate flex-1 text-left justify-end ${m.winnerTeamId === m.awayTeamId ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                              {awayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: UEFA Champions League */}
      {activeSubTab === 'uefa_cl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="font-bold text-base text-white">
                  {uefaChampionsLeague?.name || 'دوري أبطال أوروبا'}
                </h3>
                <span className="text-xs text-slate-400">
                  الموسم {season.seasonNumber} • مرحلة المجموعات والأدوار الإقصائية الأوروبية
                </span>
              </div>
            </div>
            {uefaChampionsLeague?.isCompleted && uefaChampionsLeague.winnerClubId && (
              <div className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                🏆 بطل أوروبا: {getClubName(uefaChampionsLeague.winnerClubId)}
              </div>
            )}
          </div>

          {/* Group Tables */}
          {uefaChampionsLeague?.groups && uefaChampionsLeague.groups.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-blue-400">مجموعات دوري أبطال أوروبا</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uefaChampionsLeague.groups.map(grp => (
                  <div key={grp.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                    <div className="font-bold text-xs text-white border-b border-slate-800 pb-1.5 flex items-center justify-between">
                      <span>{grp.name}</span>
                      <span className="text-[10px] text-blue-400">يتأهل الأول والثاني</span>
                    </div>
                    <table className="w-full text-right text-xs">
                      <thead className="text-[10px] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-1 px-1 text-center w-6">#</th>
                          <th className="py-1 px-1">الفريق</th>
                          <th className="py-1 px-1 text-center">لعب</th>
                          <th className="py-1 px-1 text-center">فارق</th>
                          <th className="py-1 px-1 text-center font-bold text-blue-400">نقاط</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {grp.standings.map((st, sIdx) => {
                          const isUser = userClub?.id === st.teamId;
                          const isQualifying = sIdx < 2;
                          return (
                            <tr key={st.teamId} className={isUser ? 'bg-blue-950/40 font-bold' : isQualifying ? 'bg-slate-900/40' : ''}>
                              <td className="py-1.5 px-1 text-center">
                                <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center font-mono text-[10px] ${
                                  isQualifying ? 'bg-blue-500/30 text-blue-300 font-bold' : 'text-slate-500'
                                }`}>
                                  {sIdx + 1}
                                </span>
                              </td>
                              <td className="py-1.5 px-1 truncate max-w-[120px] text-white">
                                {st.teamName} {isUser && <span className="text-amber-400">★</span>}
                              </td>
                              <td className="py-1.5 px-1 text-center text-slate-400 font-mono">{st.played}</td>
                              <td className="py-1.5 px-1 text-center text-slate-400 font-mono">{st.goalDifference > 0 ? `+${st.goalDifference}` : st.goalDifference}</td>
                              <td className="py-1.5 px-1 text-center font-bold text-blue-400 font-mono">{st.points}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Knockout Stage */}
          {uefaChampionsLeague && (
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-sm text-blue-400">الأدوار الإقصائية الأوروبية</h4>
              {(['quarter', 'semi', 'final'] as const).map(stageKey => {
                const stageMatches = (uefaChampionsLeague.matches || []).filter(m => m.stage === stageKey);
                if (stageMatches.length === 0) return null;
                const stageName = stageKey === 'quarter' ? 'ربع النهائي (الجولة 14)' : stageKey === 'semi' ? 'نصف النهائي (الجولة 18)' : 'نهائي دوري أبطال أوروبا 🏆 (الجولة 22)';

                return (
                  <div key={stageKey} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <span className="font-bold text-xs text-slate-200 block">{stageName}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {stageMatches.map(m => {
                        const homeName = getClubName(m.homeTeamId);
                        const awayName = getClubName(m.awayTeamId);
                        const isUserMatch = userClub ? (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) : false;

                        return (
                          <div key={m.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isUserMatch ? 'bg-blue-950/30 border-blue-500/50' : 'bg-slate-900/60 border-slate-800'
                          }`}>
                            <span className={`truncate flex-1 ${m.winnerTeamId === m.homeTeamId ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>
                              {homeName}
                            </span>
                            <div className="px-2 py-0.5 bg-slate-950 rounded font-mono font-bold text-white shrink-0 text-center">
                              {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : 'لم تلعب'}
                              {m.homePenalties !== undefined && m.awayPenalties !== undefined && (
                                <div className="text-[9px] text-amber-400">({m.homePenalties}-{m.awayPenalties} ركلات)</div>
                              )}
                            </div>
                            <span className={`truncate flex-1 text-left justify-end ${m.winnerTeamId === m.awayTeamId ? 'text-blue-400 font-bold' : 'text-slate-300'}`}>
                              {awayName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                      <div className="text-xs text-slate-400">{getPlayerClubName(player)} • {player.position}</div>
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

      {/* VIEW: Daily Managers Leaderboard */}
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

          {/* User's Daily Status Badge */}
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
                <div className="text-xl font-black text-blue-400 font-mono">
                  {manager.dailyMatchesPlayed || 0}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                ⚽
              </div>
              <div>
                <div className="text-[11px] text-slate-400">انتصارات اليوم</div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {manager.dailyWins || 0}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400">مستوى المدرب</div>
                <div className="text-xl font-black text-purple-400 font-mono">
                  مستوى {manager.level}
                </div>
              </div>
            </div>
          </div>

          {/* Ranking Table */}
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
                      {/* Rank Position Badge */}
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

                      {/* Manager and Club Details */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {lead.managerName}
                          </span>
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

                    {/* Stats & Points */}
                    <div className="flex items-center gap-3 shrink-0 text-left">
                      <div className="hidden sm:flex flex-col items-end text-xs text-slate-400 font-mono">
                        <span>{lead.dailyMatchesPlayed} مباريات</span>
                        <span className="text-[11px] text-emerald-400">{lead.dailyWins}ف - {lead.dailyDraws}ت - {lead.dailyLosses}خ</span>
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

      {/* VIEW 4: Top Assists */}
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
                      <div className="text-xs text-slate-400">{getPlayerClubName(player)} • {player.position}</div>
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

