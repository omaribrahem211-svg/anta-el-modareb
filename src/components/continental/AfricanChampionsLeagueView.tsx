import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Globe,
  Calendar,
  Play,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { findClubInWorld, getClubDisplayName } from '../../data/leaguesData';
import { ContinentalMatch, ContinentalGroup } from '../../types/game';
import {
  resolveClubContinentRegion,
  getContinentalCompetitionsForRegion,
  recalculateContinentalGroupStandings,
} from '../../utils/continentalEngine';

interface AfricanChampionsLeagueViewProps {
  onPlayMatch?: (matchId: string) => void;
}

export const AfricanChampionsLeagueView: React.FC<AfricanChampionsLeagueViewProps> = () => {
  const {
    africanChampionsLeague,
    userClub,
    activeLeague,
    switchUserClubToAlAhly,
    switchContinentalCompetition,
    teams,
    calendarDate,
    fixtures,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'knockout'>('groups');
  const [filterUserOnly, setFilterUserOnly] = useState<boolean>(false);
  const [lastMatchResult, setLastMatchResult] = useState<{ match: ContinentalMatch; message?: string } | null>(null);

  const liveTournament = useMemo(() => {
    if (!africanChampionsLeague) return null;
    return recalculateContinentalGroupStandings(africanChampionsLeague, fixtures);
  }, [africanChampionsLeague, fixtures]);

  // Resolve current managed club's continent ('africa' | 'europe') based on userClub.continent / activeLeague.region / country
  const managedRegion = resolveClubContinentRegion(userClub, activeLeague);
  const availableContinentalButtons = getContinentalCompetitionsForRegion(managedRegion).filter(
    comp => comp.region === managedRegion
  );
  const regionConfederationLabel =
    managedRegion === 'europe' ? 'الاتحاد الأوروبي (UEFA)' : 'الاتحاد الإفريقي (CAF)';

  if (!liveTournament) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Trophy className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">البطولات القارية للأندية ({regionConfederationLabel})</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            اختر البطولة القارية الخاصة بقارة ناديك لتفعيلها واستعراضها في الموسم الحالي!
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {switchContinentalCompetition &&
            availableContinentalButtons.map(comp => (
              <button
                key={comp.code}
                onClick={() => switchContinentalCompetition(comp.code)}
                className={`px-4 py-2.5 rounded-xl font-black text-xs cursor-pointer transition-all ${
                  comp.tier === 1
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {comp.shortLabel}
              </button>
            ))}
          {managedRegion === 'africa' && (
            <button
              onClick={() => switchUserClubToAlAhly()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>تولي تدريب النادي الأهلي 🦅</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { groups, matches, currentStage, name, prizeMoneyWinner, competitionId } = liveTournament;
  const isThursdayComp = competitionId === 'ccc' || competitionId === 'uel';
  const isUserParticipantInThisComp = Boolean(
    userClub && groups.some(g => g.teamIds.includes(userClub.id))
  );
  const compEnglishLabel =
    competitionId === 'ucl'
      ? 'UEFA Champions League 🏆'
      : competitionId === 'uel'
      ? 'UEFA Europa League 🟠'
      : competitionId === 'ccc'
      ? 'CAF Confederation Cup 🌍'
      : 'CAF Champions League 🌍';

  const getClub = (clubId: string) => {
    if (userClub && userClub.id === clubId) return userClub;
    const foundInTeams = teams.find(t => t.id === clubId);
    if (foundInTeams) return foundInTeams;
    return (
      findClubInWorld(clubId) || {
        id: clubId,
        name: getClubDisplayName(clubId, teams),
        shortName: 'منافس',
        primaryColor: '#334155',
      }
    );
  };

  const groupMatches = matches.filter(m => m.stage === 'group');
  const knockoutMatches = matches.filter(m => m.stage !== 'group');

  const nextUserMatch = matches.find(
    m => !m.isPlayed && userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id)
  );

  return (
    <div className="space-y-4">
      {/* Multi-Continental Switcher Bar (Filtered strictly by Managed Club's Continent) */}
      {switchContinentalCompetition && (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 px-1">
            <Globe className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-300">
              استعراض البطولات القارية المعتمدة ({regionConfederationLabel}):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableContinentalButtons.map(comp => {
              const isSelected = competitionId === comp.code;
              const activeClass =
                comp.code === 'ccl'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : comp.code === 'ccc'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow'
                  : comp.code === 'ucl'
                  ? 'bg-blue-500 text-white font-black shadow'
                  : 'bg-orange-500 text-white font-black shadow';

              return (
                <button
                  key={comp.code}
                  onClick={() => switchContinentalCompetition(comp.code)}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? activeClass
                      : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{comp.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Continental Tournament Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-slate-950 font-black flex items-center justify-center shrink-0 shadow-lg">
              <Trophy className="w-6 h-6 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white">{name}</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {compEnglishLabel}
                </span>
                <span className="text-[10px] bg-slate-800 text-cyan-300 border border-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {isThursdayComp ? '📅 مواعيد المباريات: الخميس (منتصف الأسبوع)' : '📅 مواعيد المباريات: الثلاثاء / الأربعاء'}
                </span>
                {userClub && (
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      isUserParticipantInThisComp
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/90 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isUserParticipantInThisComp
                      ? `⭐ ${userClub.shortName || userClub.name} مشارك رسمياً`
                      : `👁️ استعراض (${userClub.shortName || userClub.name} يشارك في البطولة القارية الأخرى)`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                نظام المجموعات (ذهاب وإياب) وخروج المغلوب (وقت إضافي وركلات ترجيح) • الجائزة الكبرى:{' '}
                <strong className="text-amber-400 font-mono">{prizeMoneyWinner.toLocaleString()} ج.م</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-amber-400 font-mono font-bold">
              المرحلة:{' '}
              {currentStage === 'group'
                ? 'دور المجموعات'
                : currentStage === 'quarter'
                ? 'ربع النهائي'
                : currentStage === 'semi'
                ? 'نصف النهائي'
                : 'النهائي الكبير 🏆'}
            </span>
          </div>
        </div>

        {/* Featured Next User Match Box */}
        {nextUserMatch && (
          <div className="mt-4 p-3.5 bg-slate-950/90 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400">مباراتك القارية القادمة: </span>
                <span className="font-bold text-white">
                  {getClub(nextUserMatch.homeTeamId).name} vs {getClub(nextUserMatch.awayTeamId).name}
                </span>
                <span className="text-[10px] text-amber-400 font-mono mr-2">({nextUserMatch.stageName})</span>
              </div>
            </div>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }))}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-950" />
              <span>متابعة التقويم وخوض المباراة 📅</span>
            </button>
          </div>
        )}
      </div>

      {/* Match Result Alert */}
      {lastMatchResult && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-2 text-xs text-emerald-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              نتيجة المباراة: <strong>{getClub(lastMatchResult.match.homeTeamId).name}</strong> ({lastMatchResult.match.homeScore}) - ({lastMatchResult.match.awayScore}){' '}
              <strong>{getClub(lastMatchResult.match.awayTeamId).name}</strong>
              {lastMatchResult.match.homePenalties !== undefined && (
                <span className="text-amber-300 font-mono mr-1">
                  {' '}
                  (ركلات ترجيح: {lastMatchResult.match.homePenalties} - {lastMatchResult.match.awayPenalties})
                </span>
              )}
            </span>
          </div>
          <button
            onClick={() => setLastMatchResult(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('groups')}
          className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'groups' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          مجموعات البطولة (4 مجموعات) 🌍
        </button>
        <button
          onClick={() => setActiveTab('matches')}
          className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'matches' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          مباريات دور المجموعات ⚽
        </button>
        <button
          onClick={() => setActiveTab('knockout')}
          className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'knockout' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          الأدوار الإقصائية والنهائي 🏆
        </button>
      </div>

      {/* TAB 1: GROUPS STANDINGS */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((grp: ContinentalGroup, idx: number) => {
            const isUserGroup = Boolean(userClub && grp.teamIds.includes(userClub.id));

            return (
              <div
                key={grp.id}
                className={`bg-slate-900 border rounded-3xl p-4 space-y-3 shadow-lg ${
                  isUserGroup
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <h3 className="font-bold text-sm text-white">{grp.name}</h3>
                  </div>
                  {isUserGroup && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                      مجموعة فريقك ⭐
                    </span>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="text-[11px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                        <th className="py-1 px-1.5 w-7 text-center">#</th>
                        <th className="py-1 px-2">الفريق</th>
                        <th className="py-1 px-1.5 text-center">لعب</th>
                        <th className="py-1 px-1.5 text-center">ف</th>
                        <th className="py-1 px-1.5 text-center">ت</th>
                        <th className="py-1 px-1.5 text-center">خ</th>
                        <th className="py-1 px-1.5 text-center">+/-</th>
                        <th className="py-1 px-2 text-center font-black">نقاط</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {grp.standings.map((st, sIdx) => {
                        const club = getClub(st.teamId);
                        const isThisUser = userClub && userClub.id === st.teamId;
                        const isTopTwo = sIdx < 2;

                        return (
                          <tr
                            key={st.teamId}
                            className={`transition-colors ${
                              isThisUser ? 'bg-amber-500/15 font-bold text-white' : 'text-slate-300 hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2 px-1 text-center font-mono">
                              <span
                                className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] ${
                                  isTopTwo ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-500'
                                }`}
                              >
                                {sIdx + 1}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <div
                                  className="w-3.5 h-3.5 rounded-full shrink-0"
                                  style={{ backgroundColor: club.primaryColor || '#dc2626' }}
                                />
                                <span className={`truncate ${isThisUser ? 'text-amber-300 font-black' : ''}`}>{club.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-1.5 text-center font-mono text-slate-400">{st.played}</td>
                            <td className="py-2 px-1.5 text-center font-mono text-slate-300">{st.won}</td>
                            <td className="py-2 px-1.5 text-center font-mono text-slate-400">{st.drawn}</td>
                            <td className="py-2 px-1.5 text-center font-mono text-slate-400">{st.lost}</td>
                            <td className="py-2 px-1.5 text-center font-mono text-[11px] dir-ltr">
                              <span
                                className={
                                  st.goalDifference > 0
                                    ? 'text-emerald-400'
                                    : st.goalDifference < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }
                              >
                                {st.goalDifference > 0 ? `+${st.goalDifference}` : st.goalDifference}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-mono font-black text-amber-400 text-xs">{st.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <span>المركز 1 و 2 يتأهلان لربع النهائي القاري</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: MATCHES SCHEDULE */}
      {activeTab === 'matches' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">تصفية المباريات:</span>
              <button
                onClick={() => setFilterUserOnly(!filterUserOnly)}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                  filterUserOnly ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {filterUserOnly ? `مباريات ${userClub?.shortName || 'فريقك'} فقط ⭐` : 'جميع مباريات دور المجموعات 🌍'}
              </button>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {groupMatches.filter(m => m.isPlayed).length} / {groupMatches.length} لُعبت
            </span>
          </div>

          <div className="space-y-2">
            {groupMatches
              .filter(m => {
                if (!filterUserOnly) return true;
                if (!userClub) return true;
                return m.homeTeamId === userClub.id || m.awayTeamId === userClub.id;
              })
              .map(match => {
                const home = getClub(match.homeTeamId);
                const away = getClub(match.awayTeamId);
                const isUserMatch = userClub && (match.homeTeamId === userClub.id || match.awayTeamId === userClub.id);
                const isActuallyPlayed = Boolean(match.isPlayed && match.homeScore !== undefined && match.awayScore !== undefined);

                return (
                  <div
                    key={match.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                      isUserMatch
                        ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/50 shadow-md'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Top Row: Stage Badge + Date / Status / Play CTA */}
                    <div className="flex items-center justify-between gap-2 w-full border-b border-slate-800/70 pb-2">
                      <span className="bg-slate-950 px-2.5 py-1 rounded-lg text-amber-400 font-bold text-[11px] border border-slate-800 truncate">
                        {match.stageName}
                      </span>

                      <div className="shrink-0">
                        {!isActuallyPlayed ? (
                          (() => {
                            const matchingFix = (fixtures || []).find(f => f.id === match.id);
                            const matchDate = matchingFix?.date || (match as any).date;
                            const isToday = Boolean(calendarDate?.rawDateStr && matchDate && matchDate <= calendarDate.rawDateStr);

                            if (isToday && isUserMatch) {
                              return (
                                <button
                                  onClick={() => window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }))}
                                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95 animate-pulse"
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  <span>العب المباراة الآن ⚽</span>
                                </button>
                              );
                            }

                            return (
                              <div className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{matchDate || 'مجدولة بالتقويم'}</span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-800/50">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>انتهت</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Main Matchup Row: Home Team vs Away Team */}
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2 justify-start flex-1 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: home.primaryColor || '#dc2626' }}
                        >
                          {home.shortName?.slice(0, 2) || 'أ'}
                        </div>
                        <span className={`text-xs sm:text-sm font-bold leading-tight break-words ${home.id === userClub?.id ? 'text-amber-300 font-black' : 'text-white'}`}>
                          {home.name}
                        </span>
                      </div>

                      <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono font-black text-sm text-center shrink-0 min-w-[68px]">
                        {isActuallyPlayed ? (
                          <span className="text-amber-400">
                            {match.homeScore} - {match.awayScore}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">VS</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 justify-end flex-1 min-w-0 text-left">
                        <span className={`text-xs sm:text-sm font-bold leading-tight break-words text-left ${away.id === userClub?.id ? 'text-amber-300 font-black' : 'text-white'}`}>
                          {away.name}
                        </span>
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: away.primaryColor || '#15803d' }}
                        >
                          {away.shortName?.slice(0, 2) || 'ض'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: KNOCKOUT BRACKET */}
      {activeTab === 'knockout' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="font-bold text-sm sm:text-base text-white">شجرة الأدوار الإقصائية (من ربع النهائي حتى النهائي)</h3>
              </div>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full font-mono border border-slate-700">
                وقت إضافي وركلات ترجيح ⚡
              </span>
            </div>

            {knockoutMatches.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="font-bold text-sm text-slate-300">مرحلة المجموعات لم تنتهِ بعد</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  تُلعب حالياً جولات دور المجموعات الـ 6. فور اكتمال الجولة السادسة، سيتأهل أول وثاني كل مجموعة إلى الدور ربع النهائي تلقائياً!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {knockoutMatches.map(km => {
                  const home = getClub(km.homeTeamId);
                  const away = getClub(km.awayTeamId);
                  const isUserMatch = userClub && (km.homeTeamId === userClub.id || km.awayTeamId === userClub.id);
                  const isActuallyPlayed = Boolean(km.isPlayed && km.homeScore !== undefined && km.awayScore !== undefined);
                  const winnerClub = km.winnerTeamId ? getClub(km.winnerTeamId) : null;
                  const shortStageName = km.stageName ? km.stageName.replace(/^.+?-\s*/, '') : 'دور إقصائي';

                  return (
                    <div
                      key={km.id}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${
                        isUserMatch
                          ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/60 shadow-lg'
                          : 'bg-slate-950/90 border-slate-800'
                      }`}
                    >
                      {/* Top Header Row: Stage Name + Winner Badge or Date/Play CTA */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl">
                            {shortStageName}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {!isActuallyPlayed ? (
                            (() => {
                              const matchingFix = (fixtures || []).find(f => f.id === km.id);
                              const matchDate = matchingFix?.date || (km as any).date;
                              const isToday = Boolean(calendarDate?.rawDateStr && matchDate && matchDate <= calendarDate.rawDateStr);

                              if (isToday && isUserMatch) {
                                return (
                                  <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }))}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95 animate-pulse"
                                  >
                                    <Play className="w-3 h-3 fill-white" />
                                    <span>العب المباراة الآن ⚽</span>
                                  </button>
                                );
                              }

                              return (
                                <div className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{matchDate || 'مجدولة بالتقويم'}</span>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-700/50 shadow-sm">
                              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[190px]">الفائز: {winnerClub?.name || 'متأهل'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Matchup Row: Home Team - Score Box - Away Team in Responsive Grid */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 w-full pt-1">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 justify-start min-w-0">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow"
                            style={{ backgroundColor: home.primaryColor || '#dc2626' }}
                          >
                            {home.shortName?.slice(0, 2) || 'أ'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-xs sm:text-sm font-bold block leading-snug break-words ${
                                isActuallyPlayed && km.winnerTeamId === home.id
                                  ? 'text-emerald-400 font-black'
                                  : home.id === userClub?.id
                                  ? 'text-amber-300 font-black'
                                  : 'text-slate-100'
                              }`}
                            >
                              {home.name}
                            </span>
                          </div>
                        </div>

                        {/* Center Score Box */}
                        <div className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl font-mono font-black text-xs sm:text-sm text-center shrink-0 min-w-[72px] shadow-inner">
                          {isActuallyPlayed ? (
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-white tracking-wider">
                                {km.homeScore} - {km.awayScore}
                              </span>
                              {km.homePenalties !== undefined && km.awayPenalties !== undefined && (
                                <span className="text-[9px] text-amber-400 font-bold mt-0.5 whitespace-nowrap">
                                  ({km.homePenalties} - {km.awayPenalties} ر.ت)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">VS</span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 justify-end min-w-0 text-left">
                          <div className="min-w-0 flex-1 text-left">
                            <span
                              className={`text-xs sm:text-sm font-bold block leading-snug break-words text-left ${
                                km.winnerTeamId === away.id
                                  ? 'text-emerald-400 font-black'
                                  : away.id === userClub?.id
                                  ? 'text-amber-300 font-black'
                                  : 'text-slate-100'
                              }`}
                            >
                              {away.name}
                            </span>
                          </div>
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow"
                            style={{ backgroundColor: away.primaryColor || '#15803d' }}
                          >
                            {away.shortName?.slice(0, 2) || 'ض'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
