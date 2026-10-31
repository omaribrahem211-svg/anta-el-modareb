import { useState } from 'react';
import { useGame } from '../context/GameContext';

export default function SeasonEventModal() {
  const { pendingSeasonEvent, resolveSeasonEvent, userClub } = useGame() as any;
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const budget = Math.max(0, userClub?.budget || 0);

  if (!pendingSeasonEvent && !result) return null;

  if (result) {
    return (
      <div className="fixed inset-0 z-[9000] bg-black/80 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 text-center">
          <div className="text-4xl">✅</div>
          <p className="text-sm text-slate-200 leading-relaxed">{result}</p>
          <button onClick={() => setResult(null)} className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-2xl">تمام</button>
        </div>
      </div>
    );
  }

  const ev = pendingSeasonEvent;
  return (
    <div className="fixed inset-0 z-[9000] bg-black/80 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{ev.icon}</div>
          <h2 className="text-lg font-black text-white">{ev.title}</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{ev.body}</p>
        <div className="space-y-2">
          {ev.choices.map((c: any) => {
            const cantPay = (c.cost || 0) > budget;
            return (
              <button
                key={c.id}
                disabled={busy || cantPay}
                onClick={() => {
                  if (busy) return;
                  setBusy(true);
                  const r = resolveSeasonEvent(c.id);
                  if (r?.message) setResult(r.message);
                  setBusy(false);
                }}
                className="w-full text-right bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 rounded-2xl px-4 py-3"
              >
                <div className="text-sm font-bold text-white">{c.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{cantPay ? 'خزينة النادي لا تكفي' : c.hint}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
