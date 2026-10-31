import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { canCheckForAppUpdate, isUpdateRequired, runImmediateUpdate } from '../services/appUpdateService';

/**
 * Makes sure everyone plays the latest version: on launch and every time the app returns to the foreground
 * it asks Google Play for a newer build. If one exists the full-screen Play update opens right away; if the
 * player backs out, a blocking screen stays until the update is accepted.
 */
export default function ForcedUpdateGate() {
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const runningRef = useRef(false);

  const enforce = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      if (!(await isUpdateRequired())) {
        setBlocked(false);
        return;
      }
      const result = await runImmediateUpdate();
      // 'ok' => Play installs and restarts the app; 'cancelled' => keep the blocking screen until accepted;
      // 'failed' => Play could not run it (e.g. offline), so never lock the game.
      setBlocked(result !== 'failed');
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!canCheckForAppUpdate()) return;
    enforce();
    const sub = CapApp.addListener('appStateChange', state => {
      if (state.isActive) enforce();
    });
    return () => {
      sub.then(h => h.remove()).catch(() => {});
    };
  }, [enforce]);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center p-6 text-center" dir="rtl">
      <div className="max-w-sm w-full space-y-4">
        <div className="text-5xl">⬆️</div>
        <h2 className="text-xl font-black text-white">يتوفر تحديث جديد للعبة</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          لازم تحدّث اللعبة عشان تكمل اللعب بأحدث إصلاحات ومميزات. تقدمك محفوظ ومش هيضيع.
        </p>
        <button
          onClick={enforce}
          disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black py-3 rounded-2xl"
        >
          {busy ? 'جاري التحميل...' : 'تحديث الآن'}
        </button>
      </div>
    </div>
  );
}
