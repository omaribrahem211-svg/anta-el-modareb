import React, { useState } from 'react';
import type { Club, Fixture, LeagueStanding } from '../types/game';
import { mlsConferenceStandings, mlsChampionId, sortMLSStandings } from '../utils/mlsPlayoffs';
import { MLS_CONFERENCE_BY_CLUB_ID } from '../data/mlsClubIds';
import { ClubBadge } from './ClubBadge';

export function MLSCompetitionPanel({ standings, fixtures, teams, userClubId }: { standings: LeagueStanding[]; fixtures: Fixture[]; teams: Club[]; userClubId?: string }) {
  const [conference, setConference] = useState<'Eastern' | 'Western' | 'overall'>(MLS_CONFERENCE_BY_CLUB_ID[userClubId || ''] || 'Eastern');
  const rows = conference === 'overall' ? sortMLSStandings(standings, fixtures) : mlsConferenceStandings(standings, fixtures, conference);
  const name = (id: string) => teams.find(t => t.id === id)?.name || standings.find(r => r.teamId === id)?.teamName || id;
  const club = (id: string) => teams.find(t => t.id === id) || { id, name: name(id) };
  const regular = fixtures.filter(f => !f.mlsPlayoff);
  const regularDone = regular.length === 510 && regular.every(f => f.isPlayed);
  const shield = sortMLSStandings(standings, fixtures)[0];
  const champion = mlsChampionId(fixtures);
  const stages = [ ['wildcard', 'البطاقة الأخيرة', 'الثامن يستضيف التاسع. التعادل يحسم بركلات الترجيح مباشرة.'], ['round_one', 'الدور الأول: الأفضل من 3', 'أول فريق يفوز بمباراتين يتأهل. ملعب الأعلى ثم الأدنى ثم الأعلى عند الحاجة. لا تُجمع الأهداف. التعادل: ترجيح مباشر.'], ['conference_semi', 'نصف نهائي المنطقة', 'مباراة واحدة على ملعب صاحب الترتيب الأعلى. التعادل: وقت إضافي ثم ترجيح.'], ['conference_final', 'نهائي المنطقة', 'مباراة واحدة على ملعب صاحب الترتيب الأعلى. التعادل: وقت إضافي ثم ترجيح.'], ['mls_cup', 'نهائي كأس MLS', 'بطلا المنطقتين. يستضيف الأعلى في ترتيب درع الجماهير. التعادل: وقت إضافي ثم ترجيح.'] ];
  return <div className="space-y-4" dir="rtl" data-testid="mls-competition-panel">
    <div className="rounded-2xl border border-sky-800/60 bg-sky-950/30 p-4 space-y-2 text-xs text-sky-100 leading-6">
      <h3 className="font-bold text-sm">30 نادياً • 34 مباراة لكل فريق • لا صعود أو هبوط</h3>
      <p>15 نادياً في كل منطقة. أول 7 إلى الدور الأول، والثامن والتاسع إلى البطاقة الأخيرة. متصدر الترتيب العام يفوز بدرع الجماهير، وبطل الملحق يفوز بكأس MLS.</p>
      {shield && <p className="font-bold text-amber-300">{regularDone ? 'درع الجماهير' : 'متصدر درع الجماهير'}: {shield.teamName} • {shield.points} نقطة</p>}
      {champion && <p className="font-bold text-emerald-300" data-testid="mls-champion">بطل كأس MLS: {name(champion)}</p>}
    </div>
    <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950">
        {([['Eastern', 'الشرقية'], ['Western', 'الغربية'], ['overall', 'درع الجماهير']] as const).map(([id, label]) => <button key={id} onClick={() => setConference(id)} className={`rounded-xl px-2 py-2 text-xs font-bold ${conference === id ? 'bg-amber-400 text-slate-950' : 'text-slate-300 bg-slate-800'}`}>{label}</button>)}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right min-w-[330px]" data-testid="mls-standings">
          <thead className="text-slate-400 bg-slate-950/40"><tr><th className="p-2">#</th><th>الفريق</th><th className="p-2 text-center">لعب</th><th className="p-2 text-center">فاز</th><th className="p-2 text-center">+/-</th><th className="p-2 text-center">نقطة</th></tr></thead>
          <tbody className="divide-y divide-slate-800">{rows.map((row, i) => <tr key={row.teamId} className={row.teamId === userClubId ? 'bg-amber-500/10 text-amber-200 font-bold' : 'text-slate-200'}>
            <td className={`p-2 ${conference !== 'overall' && i < 7 ? 'text-emerald-400' : conference !== 'overall' && i < 9 ? 'text-amber-400' : 'text-slate-500'}`}>{i + 1}</td>
            <td className="py-3"><div className="flex items-center gap-1.5"><ClubBadge club={club(row.teamId)} size="xs" /><span className="max-w-[112px] truncate" title={row.teamName}>{row.teamName}</span></div></td>
            <td className="text-center p-2">{row.played}</td><td className="text-center p-2">{row.won}</td><td className="text-center p-2 font-mono" dir="ltr">{row.goalDifference}</td><td className="text-center p-2 text-amber-300 font-bold">{row.points}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="p-3 text-[10px] text-slate-400 leading-5">{conference === 'overall' ? 'الترتيب العام لدرع الجماهير واستضافة النهائي. التأهل للملحق يحسب داخل كل منطقة.' : 'الأخضر: تأهل مباشر إلى الدور الأول. الأصفر: البطاقة الأخيرة (8 و9).'} التساوي يبدأ بالنقاط، ثم عدد الانتصارات، ثم فارق الأهداف والأهداف المسجلة.</p>
    </div>
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-3 space-y-4">
      <h3 className="text-sm font-bold text-white">طريق كأس MLS</h3>
      {!regularDone && <p className="text-xs text-slate-400">تظهر مباريات الملحق تلقائياً بعد انتهاء المباريات الـ34 لجميع الأندية.</p>}
      {stages.map(([stage, title, rule]) => {
        const games = fixtures.filter(f => f.mlsPlayoff?.stage === stage);
        return <div key={stage} className="space-y-2"><h4 className="text-xs text-amber-300 font-bold">{title}</h4><p className="text-[11px] leading-5 text-slate-400">{rule}</p>
          {games.map(f => <div key={f.id} className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs space-y-2">
            <div className="flex justify-between gap-2 text-[10px] text-slate-500"><span>{f.mlsPlayoff?.conference === 'Eastern' ? 'الشرقية' : f.mlsPlayoff?.conference === 'Western' ? 'الغربية' : 'النهائي'}{stage === 'round_one' ? ` • المباراة ${f.mlsPlayoff?.gameNumber}` : ''}</span><span>{f.date || 'موعد محاكاة'}</span></div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center"><span className="min-w-0 truncate" title={name(f.homeTeamId)}>{name(f.homeTeamId)}</span><span className="font-mono font-bold text-white" dir="ltr">{f.isPlayed ? `${f.homeScore} - ${f.awayScore}` : '×'}</span><span className="min-w-0 truncate text-left" title={name(f.awayTeamId)}>{name(f.awayTeamId)}</span></div>
            {f.homePenalties != null && <p className="text-center text-[10px] text-amber-300">ركلات الترجيح: {f.homePenalties} - {f.awayPenalties}</p>}
            {f.isPlayed && f.winnerTeamId && <p className="text-[10px] text-emerald-400">الفائز: {name(f.winnerTeamId)}</p>}
          </div>)}
        </div>;
      })}
    </section>
    <p className="text-[10px] leading-5 text-slate-500 px-1">القوائم موثقة بتاريخ 22 نوفمبر 2026. التقييمات والمال موازنة للعبة، والعمق الافتراضي مميز باسمه. الجدول مكيّف لتقويم المسيرة وليس المواعيد الواقعية. بعض تفاصيل الانضباط وقرعة التساوي مبسطة للمحاكاة.</p>
  </div>;
}
