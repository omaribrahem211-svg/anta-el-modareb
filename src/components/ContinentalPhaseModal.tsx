import { useState } from 'react';
import { useGame } from '../context/GameContext';
import {
  ROUND_LABEL,
  getContinentalOutcome,
  getContinentalPayout,
  prestigeOf,
  REWARD_SCHEDULE,
  qualifiesForWorldCup,
  tieScoreText,
  type ContinentalPhaseState,
  type ContTie,
  type ContRoundKey,
} from '../services/continentalPhase';
import { themeOf } from '../services/continentalThemes';

function nameOf(st: ContinentalPhaseState, id: string): string {
  return st.teams.find(t => t.id === id)?.name || id;
}

export default function ContinentalPhaseModal() {
  const { userClub, continentalPhase, season, playContinentalStep, playContinentalLiveMatch, simulateContinentalToEnd, finishContinentalPhase, liveMatch, finishLiveMatchAndAdvance } = useGame() as any;
  const st: ContinentalPhaseState | null = continentalPhase;
  const [minimized, setMinimized] = useState(false);

  if (!st || st.status === 'done' || st.seasonNumber !== season?.seasonNumber) return null;
  // While the user is watching a continental match the normal match screen is shown instead
  if (liveMatch) {
    const isContMatch = String(liveMatch.fixture?.id || '').startsWith('cont_');
    if (!isContMatch || !liveMatch.isFinished) return null;
    // Match is over but its result was not recorded yet (e.g. the user left the match screen): offer to record it.
    const nm = (id: string) => st.teams.find(t => t.id === id)?.name || id;
    return (
      <div className="fixed inset-0 z-[9500] bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-3xl p-5 space-y-3 text-center">
          <div className="text-xs text-amber-300 font-bold">{st.compName} • انتهت المباراة</div>
          <div className="flex items-center justify-between gap-2 text-sm font-black text-white">
            <span className="flex-1">{nm(liveMatch.homeTeam?.id)}</span>
            <span className="text-xl font-mono text-amber-300">{liveMatch.homeScore} - {liveMatch.awayScore}</span>
            <span className="flex-1">{nm(liveMatch.awayTeam?.id)}</span>
          </div>
          <button onClick={() => finishLiveMatchAndAdvance()} className="w-full bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl">
            تسجيل النتيجة ومتابعة البطولة
          </button>
        </div>
      </div>
    );
  }

  // Minimised: the whole app (squad, tactics, training...) is usable; a floating button brings the tournament back.
  if (minimized && st.status !== 'finished') {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9500] bg-amber-400 text-slate-950 font-black text-sm px-5 py-3 rounded-full shadow-2xl border-2 border-white/70"
        dir="rtl"
      >
        🏆 العودة إلى {st.compName}
      </button>
    );
  }

  const roundTies: ContTie[] = st.ties.filter(t => t.round === st.round);
  const userTie = roundTies.find(t => t.a === st.userId || t.b === st.userId);
  const finished = st.status === 'finished';
  const outcome = (() => { if (!finished) return null; try { return getContinentalOutcome(st); } catch { return { resultText: 'انتهت مشاركتك في البطولة', isChampion: false, xp: 0, reputation: 0, stageReached: st.round } as any; } })();
  const goesToWorldCup = (() => { try { return finished && qualifiesForWorldCup(st); } catch { return false; } })();
  const isCwc = st.compId === 'cwc';
  const th = themeOf(st.compId);
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
  const wageBill = ((userClub?.players || []) as any[]).reduce((sum, p) => sum + (Number(p?.salary) || 0), 0);
  const payout = (() => { try { return getContinentalPayout(st, wageBill); } catch { return null; } })();
  const pr = prestigeOf(st.compId);
  const floor = Math.round(100000 * pr);
  const money = (months: number) => fmt(Math.max(0, wageBill) * months * 1000 / 1000);
  const allRounds: ContRoundKey[] = ['R32', 'R16', 'QF', 'SF', 'F'];
  const entryRound: ContRoundKey = st.ties.length ? st.ties[0].round : st.round;
  const roundKeys = allRounds.slice(allRounds.indexOf(entryRound));

  const nextLegLabel = (() => {
    if (!userTie) return 'المباراة التالية';
    if (st.round === 'F') return 'العب النهائي';
    if (st.singleLeg) return 'العب المباراة';
    return userTie.legs.length === 0 ? 'العب مباراة الذهاب' : 'العب مباراة الإياب';
  })();

  // Most recent match of the user (across all rounds) so every simulated leg shows a clear result
  const userTies = st.ties.filter(t => (t.a === st.userId || t.b === st.userId) && t.legs.length > 0);
  const lastTie = userTies.length ? userTies[userTies.length - 1] : null;
  const lastLeg = lastTie ? lastTie.legs[lastTie.legs.length - 1] : null;
  const lastLegNo = lastTie ? lastTie.legs.length : 0;
  const tieDecided = !!lastTie?.winnerId;

  return (
    <div className="fixed inset-0 z-[9500] bg-slate-950 overflow-y-auto" dir="rtl">
      <div className="max-w-md mx-auto p-4 space-y-4 pb-10">
        <div className={`${th.hero} rounded-3xl p-5 text-center space-y-1.5 border ${th.accentBorder} relative overflow-hidden`}>
          <div className="absolute -top-6 -left-4 text-8xl opacity-10 select-none">{th.emoji}</div>
          <div className="text-5xl">{finished && outcome?.isChampion ? th.trophy : th.emoji}</div>
          <h1 className="text-xl font-black text-white">{st.compName}</h1>
          <div className={`text-[11px] font-bold ${th.accentText}`}>{th.tagline}</div>
          <div className="text-sm tracking-widest text-amber-300">{'★'.repeat(th.stars)}<span className="text-slate-600">{'★'.repeat(5 - th.stars)}</span></div>
          <p className="text-xs text-slate-300">
            {finished ? 'انتهت مشاركتك في البطولة' : isCwc ? `${ROUND_LABEL[st.round]} • مباراة واحدة • الموسم ${st.seasonNumber}` : `${ROUND_LABEL[st.round]} • الموسم ${st.seasonNumber}`}
          </p>
          <div className="flex justify-center gap-1 pt-1">
            {roundKeys.map(rk => (
              <span key={rk} className={`text-[10px] font-black px-2 py-0.5 rounded-full ${rk === (finished ? outcome?.stageReached : st.round) ? th.chipActive : 'bg-black/30 text-slate-400'}`}>{ROUND_LABEL[rk]}</span>
            ))}
          </div>
        </div>

        {!finished && (
          <div className={`${th.accentSoft} border ${th.accentBorder} rounded-3xl p-4 space-y-1.5`}>
            <div className={`text-[11px] font-black ${th.accentText}`}>💰 الجوائز المالية حسب الدور اللي توصله</div>
            <div className="text-[11px] text-slate-200 space-y-1">
              <div className="flex justify-between"><span>الدخول والمشاركة</span><span className="font-black">{fmt(Math.max(floor, wageBill * REWARD_SCHEDULE.participation * pr))} ج.م</span></div>
              {roundKeys.slice(1).map(rk => (
                <div key={rk} className={`flex justify-between ${rk === st.round ? th.accentText : ''}`}>
                  <span>بلوغ {ROUND_LABEL[rk]}{rk === st.round ? ' ← أنت هنا' : ''}</span>
                  <span className="font-black">+{money(REWARD_SCHEDULE.stage[rk] * pr)} ج.م</span>
                </div>
              ))}
              <div className={`flex justify-between ${th.accentText}`}><span>🏆 التتويج بالبطولة</span><span className="font-black">+{money(REWARD_SCHEDULE.champion * pr)} ج.م</span></div>
            </div>
            <p className="text-[10px] text-slate-400">+ مكافأة شخصية لك كمدرب (5% إلى 15% من جائزة النادي) وخبرة وسمعة تزيد مع أهمية البطولة.</p>
          </div>
        )}

        {finished && outcome && (
          <div className={`rounded-3xl p-5 text-center border ${outcome.isChampion ? 'bg-amber-500/10 border-amber-400/50' : 'bg-slate-900 border-slate-700'}`}>
            <div className="text-xl font-black text-white">{outcome.resultText}</div>
            <p className="text-xs text-slate-400 mt-2">
              {goesToWorldCup
                ? '🌍 تأهلت إلى كأس العالم للأندية! 32 نادياً من أنحاء العالم بنظام خروج المغلوب.'
                : 'بعد المتابعة ستظهر نتيجة الموسم وعروض الأندية. المكافآت ستُضاف إلى ميزانية الموسم القادم.'}
            </p>
          </div>
        )}

        {finished && payout && (
          <div className={`${th.accentSoft} border ${th.accentBorder} rounded-3xl p-4 space-y-1.5`}>
            <div className={`text-[11px] font-black ${th.accentText}`}>💰 مكافآتك من البطولة</div>
            <div className="text-[11px] text-slate-200 space-y-1">
              {payout.lines.map(l => (
                <div key={l.label} className="flex justify-between"><span>{l.label}</span><span className="font-black">{fmt(l.amount)} ج.م</span></div>
              ))}
              <div className="flex justify-between border-t border-white/10 pt-1 font-black text-emerald-300"><span>إجمالي مكافأة النادي</span><span>{fmt(payout.clubPrize)} ج.م</span></div>
              <div className="flex justify-between font-black text-amber-300"><span>مكافأتك الشخصية كمدرب</span><span>{fmt(payout.managerBonus)} ج.م</span></div>
              <div className="flex justify-between text-slate-300"><span>الخبرة / السمعة</span><span>+{outcome?.xp} XP • +{outcome?.reputation} سمعة</span></div>
            </div>
          </div>
        )}

        {isCwc && (() => {
          const counts: Record<string, number> = {};
          st.teams.forEach(t => { const k = (t as any).route; if (k) counts[k] = (counts[k] || 0) + 1; });
          const entries = Object.entries(counts);
          if (!entries.length) return null;
          return (
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4">
              <div className="text-[11px] text-sky-300 font-bold mb-2">طريقة التأهل ({st.teams.length} نادي من الدوريات الممتازة فقط)</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                {entries.map(([k, n]) => (
                  <div key={k} className="flex justify-between bg-slate-950 rounded-lg px-2 py-1"><span>{k}</span><span className="font-black text-white">{n}</span></div>
                ))}
              </div>
            </div>
          );
        })()}

        {lastTie && lastLeg && (
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-4 space-y-1.5">
            <div className="text-[11px] text-amber-300 font-bold">
              آخر نتيجة لك • {ROUND_LABEL[lastTie.round]}{(lastTie.round === 'F' || st.singleLeg) ? '' : lastLegNo === 1 ? ' (الذهاب)' : ' (الإياب)'}
            </div>
            <div className="flex items-center justify-between gap-2 text-sm font-black text-white">
              <span className="flex-1 text-center">{nameOf(st, lastLeg.homeId)}</span>
              <span className="text-lg font-mono text-amber-300">{lastLeg.homeGoals} - {lastLeg.awayGoals}</span>
              <span className="flex-1 text-center">{nameOf(st, lastLeg.awayId)}</span>
            </div>
            {tieDecided && (
              <div className={`text-center text-xs font-bold ${lastTie.winnerId === st.userId ? 'text-emerald-300' : 'text-red-300'}`}>
                {lastTie.winnerId === st.userId ? '✅ تأهلت للدور التالي' : '❌ خرجت من البطولة'} — {tieScoreText(st, lastTie)}
              </div>
            )}
            <p className="text-[10px] text-slate-500 text-center">تقدر تلعب كل مباراة بنفسك أو تحاكيها.</p>
          </div>
        )}

        {!finished && userTie && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 space-y-2">
            <div className="text-[11px] text-emerald-300 font-bold">مباراتك في {ROUND_LABEL[st.round]}</div>
            <div className="flex items-center justify-between gap-2 text-sm font-black text-white">
              <span className="flex-1 text-center">{nameOf(st, userTie.a)}</span>
              <span className="text-slate-500 text-xs">ضد</span>
              <span className="flex-1 text-center">{nameOf(st, userTie.b)}</span>
            </div>
            <div className="text-center text-xs text-slate-300 font-mono">{tieScoreText(st, userTie)}</div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs font-black text-slate-300">
            {finished ? 'النتائج النهائية' : `مباريات ${ROUND_LABEL[st.round]}`}
          </div>
          {(finished ? st.ties.filter(t => t.round === 'F' || t.a === st.userId || t.b === st.userId) : roundTies).map(t => {
            const mine = t.a === st.userId || t.b === st.userId;
            return (
              <div key={t.id} className={`rounded-2xl p-3 border text-xs ${mine ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
                {finished && <div className="text-[10px] text-slate-500 mb-1">{ROUND_LABEL[t.round]}</div>}
                <div className="flex items-center justify-between gap-2 font-bold text-slate-100">
                  <span className={t.winnerId === t.a ? 'text-emerald-300' : ''}>{nameOf(st, t.a)}</span>
                  <span className="text-slate-600">-</span>
                  <span className={t.winnerId === t.b ? 'text-emerald-300' : ''}>{nameOf(st, t.b)}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-1 text-center">{tieScoreText(st, t)}</div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-2">
          {!finished ? (
            <>
              <button onClick={() => (userTie ? playContinentalLiveMatch() : playContinentalStep())} className={`w-full ${th.button} font-black py-3.5 rounded-2xl active:scale-[0.99]`}>
                {nextLegLabel}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setMinimized(true); try { window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'tactics' } })); } catch (_) {} }} className="bg-slate-800 text-slate-100 font-bold py-3 rounded-2xl border border-slate-700 text-sm">
                  ⚙️ التكتيكات
                </button>
                <button onClick={() => { setMinimized(true); try { window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'squad' } })); } catch (_) {} }} className="bg-slate-800 text-slate-100 font-bold py-3 rounded-2xl border border-slate-700 text-sm">
                  👥 التشكيلة
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">بين كل مباراة وأخرى 6 أيام راحة: اللياقة بتتجدد والإصابات بتتحسن.</p>
              {userTie && (
                <button onClick={() => playContinentalStep()} className="w-full bg-slate-800 text-slate-200 font-bold py-3 rounded-2xl border border-slate-700">
                  محاكاة هذه المباراة فقط
                </button>
              )}
              <button onClick={() => simulateContinentalToEnd()} className="w-full bg-slate-800 text-slate-200 font-bold py-3 rounded-2xl border border-slate-700">
                محاكاة باقي البطولة
              </button>
            </>
          ) : (
            <button onClick={() => finishContinentalPhase()} className={`w-full ${th.button} font-black py-3.5 rounded-2xl active:scale-[0.99]`}>
              {goesToWorldCup ? 'متابعة إلى كأس العالم للأندية' : 'متابعة إلى نهاية الموسم'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
