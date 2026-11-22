// =========================================================================
// NationalTeamView (شاشة المنتخبات) — isolated UI for national teams.
// NO transfers anywhere in this view: national teams are call-up lists only.
// =========================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { MatchTacticsControls } from '../MatchTacticsControls';
import { Trophy, Users, Globe, RefreshCw, Flag, Medal, CalendarDays } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  InternationalMatch,
  InternationalStage,
  NationalTeam,
} from '../../types/nationalTeams';
import { getNationalTeamById } from '../../utils/nationalTeamsEngine';

type NtSubTab = 'tournament' | 'ranking' | 'squad' | 'lineup';

const STAGE_ORDER: Record<string, number> = {
  group: 0,
  round_of_16: 1,
  quarter: 2,
  semi: 3,
  final: 4,
  friendly: 5,
};

function stageBadge(stage: InternationalStage | 'friendly'): string {
  switch (stage) {
    case 'group': return 'المجموعات';
    case 'round_of_16': return 'دور الـ16';
    case 'quarter': return 'ربع النهائي';
    case 'semi': return 'نصف النهائي';
    case 'final': return 'النهائي';
    default: return 'ودية';
  }
}

const MatchRow: React.FC<{ m: InternationalMatch; teams: NationalTeam[]; highlightId?: string | null }> = ({ m, teams, highlightId }) => {
  const home = getNationalTeamById(teams, m.homeTeamId);
  const away = getNationalTeamById(teams, m.awayTeamId);
  const isUser = highlightId && (m.homeTeamId === highlightId || m.awayTeamId === highlightId);
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs border ${isUser ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
      <span className="text-slate-500 w-16 shrink-0">{stageBadge(m.stage)}</span>
      <span className="flex-1 text-right text-white font-semibold truncate">{home?.flag} {home?.name || m.homeTeamId}</span>
      <span className="mx-2 font-black text-amber-400 whitespace-nowrap">
        {m.isPlayed ? `${m.homeScore} - ${m.awayScore}` : `جولة ${m.roundTrigger}`}
        {m.isPlayed && typeof m.homePenalties === 'number' ? ` (${m.homePenalties}-${m.awayPenalties})` : ''}
      </span>
      <span className="flex-1 text-left text-white font-semibold truncate">{away?.name || m.awayTeamId} {away?.flag}</span>
    </div>
  );
};

export const NationalTeamView: React.FC = () => {
  const {
    nationalTeamsState,
    userNationalTeam,
    acceptNationalTeamJob,
    declineNationalTeamJob,
    resignFromNationalTeam,
    refreshNationalTeamCallUp,
    setNationalTeamLineup,
    setNationalTeamTactics,
    pendingInternationalMatch,
    startNationalTeamLiveMatch,
    liveMatch,
  } = useGame();

  const [subTab, setSubTab] = useState<NtSubTab>('tournament');
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [startError, setStartError] = useState('');
  const activeNationalMatch = Boolean(liveMatch?.internationalContext);
  useEffect(() => setDraftIds(null), [userNationalTeam?.id]);

  const state = nationalTeamsState;
  const tournament = state?.activeTournament || state?.queuedTournament || null;
  const userNtId = state?.userNationalTeamId || null;

  const rankedTeams = useMemo(
    () => [...(state?.teams || [])].sort((a, b) => a.worldRank - b.worldRank),
    [state?.teams]
  );

  const userMatches = useMemo(() => {
    if (!state || !userNtId) return [] as InternationalMatch[];
    const tMatches = tournament ? tournament.matches.filter(m => m.homeTeamId === userNtId || m.awayTeamId === userNtId) : [];
    const fMatches = (state.friendlyMatches || []).filter(m => m.homeTeamId === userNtId || m.awayTeamId === userNtId);
    return [...tMatches, ...fMatches].sort((a, b) => (STAGE_ORDER[a.stage] ?? 9) - (STAGE_ORDER[b.stage] ?? 9) || a.roundTrigger - b.roundTrigger);
  }, [state, tournament, userNtId]);

  if (!state || state.teams.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-400 text-sm">
        جارٍ تجهيز نظام المنتخبات الوطنية...
      </div>
    );
  }

  const pendingOffer = (state.pendingJobOffers || [])[0] || null;

  return (
    <div className="space-y-4">
      {/* User NT status / job offer card */}
      {userNationalTeam ? (
        <div className="bg-gradient-to-l from-emerald-900/60 to-slate-900 border border-emerald-700/50 rounded-3xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{userNationalTeam.flag}</span>
              <div>
                <div className="text-white font-black text-base">منتخب {userNationalTeam.name}</div>
                <div className="text-emerald-300 text-xs font-bold">أنت المدرب الوطني • الترتيب العالمي #{userNationalTeam.worldRank}</div>
              </div>
            </div>
            <div className="text-left text-xs text-slate-300">
              <div>فوز: <span className="text-emerald-400 font-bold">{userNationalTeam.stats.won}</span></div>
              <div>تعادل: <span className="text-slate-300 font-bold">{userNationalTeam.stats.drawn}</span></div>
              <div>هزيمة: <span className="text-rose-400 font-bold">{userNationalTeam.stats.lost}</span></div>
            </div>
          </div>
          {userNationalTeam.trophies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {userNationalTeam.trophies.map((t, i) => (
                <span key={i} className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 font-bold">🏆 {t.name} (م{t.seasonNumber})</span>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              disabled={activeNationalMatch}
              onClick={refreshNationalTeamCallUp}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث قائمة الاستدعاء
            </button>
            <button
              disabled={activeNationalMatch}
              onClick={resignFromNationalTeam}
              className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition-colors"
            >
              الاستقالة
            </button>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 text-center">المنتخبات لا تجري انتقالات — قوائم استدعاء فقط من اللاعبين الحاليين</div>
          <div className="mt-1 text-[10px] text-slate-500 text-center">📄 عقدك ينتهي بعد نهاية البطولة الدولية القادمة، وبعدها تصلك عروض جديدة • السجل أعلاه تراكمي لكل المواسم</div>
        </div>
      ) : pendingOffer ? (
        <div className="bg-gradient-to-l from-amber-900/40 to-slate-900 border border-amber-600/50 rounded-3xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{pendingOffer.flag}</span>
            <div className="flex-1">
              <div className="text-white font-black text-base">عرض تدريب منتخب {pendingOffer.nationalTeamName}</div>
              <div className="text-amber-300 text-xs">يمكنك الجمع بين المنتخب والنادي. العقد يمتد حتى نهاية البطولة الدولية القادمة.</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => acceptNationalTeamJob(pendingOffer.id)}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-2 rounded-xl transition-colors"
            >
              ✅ قبول العرض
            </button>
            <button
              onClick={declineNationalTeamJob}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition-colors"
            >
              رفض
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 text-center">
          <Flag className="w-6 h-6 text-slate-500 mx-auto mb-1" />
          <div className="text-slate-300 text-xs font-bold">تدريب المنتخبات متاح من سمعة 50+</div>
          <div className="text-slate-500 text-[10px] mt-1">تبدأ بعروض من منتخبات ناشئة، وكلما ربحت البطولات وصلتك عروض من منتخبات أقوى</div>
        </div>
      )}

      {userNationalTeam && <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
        <div className="text-sm font-black text-amber-300">إدارة المباراة الدولية</div>
        <p className="text-xs text-slate-300 leading-6">نفس ملعب ومحرك مباريات الدوري: اختر التشكيلة والخطة وأسلوب اللعب، وتحكم في التبديلات أثناء المباراة. نتائج المنتخب منفصلة عن جدول وأموال النادي.</p>
        {userNationalTeam.isStatistical && <p className="text-xs text-sky-300 leading-6">هذا المنتخب إحصائي. المراكز المعروضة للمباراة فقط، وليست أسماء لاعبين حقيقيين ولا تدخل الأندية أو سوق الانتقالات.</p>}
        {pendingInternationalMatch ? <>
          <MatchRow m={pendingInternationalMatch} teams={state.teams} highlightId={userNtId} />
          <button id="play_national_match_btn" onClick={() => { setStartError(''); if (!startNationalTeamLiveMatch(pendingInternationalMatch.id)) setStartError('أكمل المباراة النشطة أولاً، ثم حاول مجدداً.'); }} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 text-sm">
            {activeNationalMatch ? 'العودة إلى المباراة الدولية' : 'العب مباراة المنتخب الآن'}
          </button>
          {startError && <p className="text-xs text-rose-300">{startError}</p>}
        </> : <p className="text-xs text-slate-400">لا توجد مباراة دولية مستحقة الآن. يمكنك تجهيز المنتخب للمباراة القادمة.</p>}
        {!activeNationalMatch && userNationalTeam.tactics && <MatchTacticsControls tactics={userNationalTeam.tactics} onChange={setNationalTeamTactics} />}
      </div>}

      {/* Sub tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setSubTab('tournament')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${subTab === 'tournament' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <Trophy className="w-3.5 h-3.5 inline ml-1" />البطولة
        </button>
        <button
          onClick={() => setSubTab('ranking')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${subTab === 'ranking' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <Globe className="w-3.5 h-3.5 inline ml-1" />التصنيف
        </button>
        <button
          onClick={() => setSubTab('squad')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${subTab === 'squad' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          <Users className="w-3.5 h-3.5 inline ml-1" />القائمة
        </button>
        <button
          onClick={() => setSubTab('lineup')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${subTab === 'lineup' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          ⚽ التشكيلة
        </button>
      </div>

      {/* Tournament view */}
      {subTab === 'tournament' && (
        <div className="space-y-3">
          {!tournament ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-center text-slate-400 text-xs">
              <CalendarDays className="w-5 h-5 mx-auto mb-2 text-slate-500" />
              لا توجد بطولة دولية هذا الموسم. كأس الأمم الإفريقية كل موسمين وكأس العالم كل 4 مواسم.
              {userNationalTeam && userNationalTeam.stats.played > 0 && (
                <div className="mt-2 text-[10px] text-slate-500">
                  سجل منتخبك ({userNationalTeam.stats.played} مباراة) تراكمي من الوديات والبطولات السابقة — الوديات الدولية تقام كل 6 جولات.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="text-white font-black text-sm">{tournament.name} — الموسم {tournament.seasonNumber}</div>
                <div className="text-[10px] text-slate-400">
                  {tournament.isCompleted ? `🏆 البطل: ${getNationalTeamById(state.teams, tournament.winnerTeamId)?.name || ''}` : `المرحلة: ${stageBadge(tournament.currentStage as InternationalStage)}`}
                </div>
              </div>

              {tournament.groups.map(group => (
                <div key={group.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="bg-slate-800/60 px-3 py-1.5 text-xs font-black text-amber-400">{group.name}</div>
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="px-3 py-1 font-normal">المنتخب</th>
                        <th className="px-1 py-1 font-normal text-center">لعب</th>
                        <th className="px-1 py-1 font-normal text-center">ف</th>
                        <th className="px-1 py-1 font-normal text-center">ت</th>
                        <th className="px-1 py-1 font-normal text-center">ه</th>
                        <th className="px-1 py-1 font-normal text-center">+/-</th>
                        <th className="px-2 py-1 font-normal text-center">نقاط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.standings.map((row, idx) => {
                        const nt = getNationalTeamById(state.teams, row.teamId);
                        const isUser = row.teamId === userNtId;
                        return (
                          <tr key={row.teamId} className={`border-b border-slate-800/50 ${isUser ? 'bg-amber-500/10' : ''}`}>
                            <td className="px-3 py-1.5 text-white font-semibold whitespace-nowrap">
                              <span className={`inline-block w-4 text-center font-black ${idx < 2 ? 'text-emerald-400' : 'text-slate-600'}`}>{idx + 1}</span>
                              {' '}{nt?.flag} {nt?.name || row.teamName}
                            </td>
                            <td className="px-1 py-1.5 text-center text-slate-400">{row.played}</td>
                            <td className="px-1 py-1.5 text-center text-emerald-400">{row.won}</td>
                            <td className="px-1 py-1.5 text-center text-slate-400">{row.drawn}</td>
                            <td className="px-1 py-1.5 text-center text-rose-400">{row.lost}</td>
                            <td className="px-1 py-1.5 text-center text-slate-300" dir="ltr">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                            <td className="px-2 py-1.5 text-center text-amber-400 font-black">{row.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="space-y-1.5">
                <div className="text-slate-400 text-xs font-bold px-1">المباريات</div>
                {[...tournament.matches]
                  .sort((a, b) => (STAGE_ORDER[b.stage] ?? 9) - (STAGE_ORDER[a.stage] ?? 9) || b.roundTrigger - a.roundTrigger)
                  .slice(0, 40)
                  .map(m => <MatchRow key={m.id} m={m} teams={state.teams} highlightId={userNtId} />)}
              </div>
            </>
          )}

          {userMatches.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-slate-400 text-xs font-bold px-1">مباريات منتخبك (بما فيها الوديات)</div>
              {userMatches.slice(0, 12).map(m => <MatchRow key={m.id} m={m} teams={state.teams} highlightId={userNtId} />)}
            </div>
          )}
        </div>
      )}

      {/* World ranking */}
      {subTab === 'ranking' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-slate-800/60 px-3 py-1.5 text-xs font-black text-amber-400 flex items-center gap-1">
            <Medal className="w-3.5 h-3.5" /> التصنيف العالمي للمنتخبات
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[480px] overflow-y-auto">
            {rankedTeams.map(nt => (
              <div key={nt.id} className={`flex items-center gap-2 px-3 py-2 text-xs ${nt.id === userNtId ? 'bg-amber-500/10' : ''}`}>
                <span className="w-6 text-center font-black text-slate-400">{nt.worldRank}</span>
                <span className="text-lg">{nt.flag}</span>
                <span className="flex-1 text-white font-semibold">{nt.name}</span>
                {nt.isStatistical && <span className="text-[9px] text-slate-500 border border-slate-700 rounded-full px-1.5 py-0.5">إحصائي</span>}
                {nt.isUserManaged && <span className="text-[9px] text-emerald-300 border border-emerald-700 rounded-full px-1.5 py-0.5">منتخبك</span>}
                <span className="text-amber-400 font-bold" dir="ltr">{nt.rankingPoints}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lineup management */}
      {subTab === 'lineup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-slate-800/60 px-3 py-1.5 text-xs font-black text-amber-400">إدارة تشكيلة المنتخب</div>
          {!userNationalTeam ? (
            <div className="p-5 text-center text-slate-400 text-xs">درّب منتخباً أولاً لإدارة التشكيلة.</div>
          ) : (() => {
            const squad = [...userNationalTeam.players].sort((a, b) => b.overallRating - a.overallRating);
            const valid = (userNationalTeam.userStartingIds || []).filter(id => squad.some(p => p.id === id));
            const current = valid.length === 11 ? valid : (userNationalTeam.tactics?.startingPlayerIds || []);
            const isGk = (p: any) => String(p.position || '').toUpperCase() === 'GK';
            const toggle = (id: string) => {
              const next = new Set(draftIds ?? current);
              if (next.has(id)) next.delete(id); else next.add(id);
              const arr = [...next];
              // Keep the draft while it is not yet 11: only a full XI is applied.
              if (arr.length === 11) setNationalTeamLineup(arr);
              else setNationalTeamLineup(null);
              setDraftIds(arr);
            };
            const shown = draftIds ?? current;
            const shownSet = new Set(shown);
            return (
              <div>
                <div className="px-3 py-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span>المختارون: <b className={shown.length === 11 ? 'text-emerald-400' : 'text-rose-400'}>{shown.length}/11</b> {shown.length !== 11 && '(سيُستخدم التشكيل التلقائي حتى تكتمل 11)'}</span>
                  <button
                    disabled={activeNationalMatch} onClick={() => { setDraftIds(null); setNationalTeamLineup(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-2.5 py-1 rounded-lg"
                  >
                    تشكيل تلقائي
                  </button>
                </div>
                <div className="divide-y divide-slate-800/60">
                  {squad.map(p => (
                    <button key={p.id} disabled={activeNationalMatch} onClick={() => toggle(p.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-right ${shownSet.has(p.id) ? 'bg-emerald-900/30' : ''}`}>
                      <span className="w-5">{shownSet.has(p.id) ? '✅' : '⬜'}</span>
                      <span className="w-9 text-center font-black text-sky-400">{p.position}</span>
                      <span className="flex-1 text-white font-semibold">{p.name}{isGk(p) ? ' 🧤' : ''}</span>
                      <span className="font-black text-slate-300">{p.overallRating}</span>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2 text-[10px] text-slate-500 text-center">اختر 11 لاعباً. هذه التشكيلة تبدأ المباراة الدولية، ويمكنك التحكم في الخطة والتبديلات داخل الملعب.</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Call-up squad */}
      {subTab === 'squad' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="bg-slate-800/60 px-3 py-1.5 text-xs font-black text-amber-400">
            {userNationalTeam ? `قائمة استدعاء منتخب ${userNationalTeam.name} (${userNationalTeam.players.length})` : 'قائمة الاستدعاء'}
          </div>
          {!userNationalTeam ? (
            <div className="p-5 text-center text-slate-400 text-xs">درّب منتخباً أولاً لعرض قائمة الاستدعاء.</div>
          ) : userNationalTeam.isStatistical ? (
            <div className="p-5 text-center text-slate-400 text-xs">هذا المنتخب يشارك بقوة إحصائية (لا يتوفر له لاعبون حقيقيون كافون في اللعبة).</div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {[...userNationalTeam.players]
                .sort((a, b) => b.overallRating - a.overallRating)
                .map(p => (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <span className="w-9 text-center font-black text-sky-400">{p.position}</span>
                    <span className="flex-1 text-white font-semibold">{p.name}</span>
                    <span className="text-slate-500 text-[10px]">{p.age} سنة</span>
                    <span className={`font-black ${p.overallRating >= 85 ? 'text-amber-400' : p.overallRating >= 75 ? 'text-emerald-400' : 'text-slate-300'}`}>{p.overallRating}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NationalTeamView;
