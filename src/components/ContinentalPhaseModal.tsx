import { useGame } from '../context/GameContext';
import {
  ROUND_LABEL,
  getContinentalOutcome,
  qualifiesForWorldCup,
  tieScoreText,
  type ContinentalPhaseState,
  type ContTie,
} from '../services/continentalPhase';

function nameOf(st: ContinentalPhaseState, id: string): string {
  return st.teams.find(t => t.id === id)?.name || id;
}

export default function ContinentalPhaseModal() {
  const { continentalPhase, season, playContinentalStep, playContinentalLiveMatch, simulateContinentalToEnd, finishContinentalPhase, liveMatch, finishLiveMatchAndAdvance } = useGame() as any;
  const st: ContinentalPhaseState | null = continentalPhase;

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

  const roundTies: ContTie[] = st.ties.filter(t => t.round === st.round);
  const userTie = roundTies.find(t => t.a === st.userId || t.b === st.userId);
  const finished = st.status === 'finished';
  const outcome = finished ? getContinentalOutcome(st) : null;
  const goesToWorldCup = finished && qualifiesForWorldCup(st);
  const isCwc = st.compId === 'cwc';

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
        <div className="text-center pt-2 space-y-1">
          <div className="text-4xl">{finished && outcome?.isChampion ? '🏆' : '🌍'}</div>
          <h1 className="text-lg font-black text-white">{st.compName}</h1>
          <p className="text-xs text-slate-400">
            {finished ? 'انتهت مشاركتك في البطولة' : isCwc ? `${ROUND_LABEL[st.round]} • مباراة واحدة • الموسم ${st.seasonNumber}` : `${ROUND_LABEL[st.round]} • الموسم ${st.seasonNumber}`}
          </p>
        </div>

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
              <button onClick={() => (userTie ? playContinentalLiveMatch() : playContinentalStep())} className="w-full bg-emerald-500 text-slate-950 font-black py-3.5 rounded-2xl active:scale-[0.99]">
                {nextLegLabel}
              </button>
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
            <button onClick={() => finishContinentalPhase()} className="w-full bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl active:scale-[0.99]">
              {goesToWorldCup ? 'متابعة إلى كأس العالم للأندية' : 'متابعة إلى نهاية الموسم'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
