import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { runIntegrityChecks, BlockReason } from '../services/integrityService';

export default function IntegrityGate() {
  const [reason, setReason] = useState<BlockReason>(null);
  const [checking, setChecking] = useState(false);
  const [detail, setDetail] = useState<string[]>([]);
  const busy = useRef(false);
  const adStreak = useRef(0);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setChecking(true);
    try {
      const r = await runIntegrityChecks();
      // Ad-blocker: only block after 2 separate checks in a row (avoids false alarms from a bad network moment)
      if (r.reason === 'adblock') { adStreak.current += 1; setReason(adStreak.current >= 2 ? 'adblock' : null); }
      else { adStreak.current = 0; setReason(r.reason); }
      setDetail(r.detail || []);
    } catch {
      setReason(null);
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const t = setTimeout(check, 4000);
    const iv = setInterval(check, 10 * 60 * 1000);
    let h: any;
    try { CapApp.addListener('resume', () => { setTimeout(check, 1500); }).then((x) => { h = x; }); } catch {}
    return () => { clearTimeout(t); clearInterval(iv); try { h?.remove(); } catch {} };
  }, [check]);

  if (!reason) return null;
  const cheat = reason === 'cheat-app';
  return (
    <div className="fixed inset-0 z-[20000] bg-slate-950 flex flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
      <div className="text-5xl">{cheat ? '🛡️' : '📢'}</div>
      <div className="text-white font-black text-xl">{cheat ? 'تم اكتشاف تطبيق غير مسموح' : 'مانع الإعلانات مفعّل'}</div>
      <div className="text-slate-300 text-sm max-w-xs leading-relaxed">
        {cheat
          ? `تم اكتشاف تطبيق تعديل ألعاب على جهازك${detail.length ? ' (' + detail.join('، ') + ')' : ''}. أزِله ثم اضغط «إعادة الفحص» لمتابعة اللعب.`
          : 'اللعبة مجانية وتعتمد على الإعلانات في استمرارها. من فضلك أوقف مانع الإعلانات أو الـ DNS الخاص (Private DNS) ثم اضغط «إعادة الفحص».'}
      </div>
      <button
        onClick={check}
        disabled={checking}
        className="px-8 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black disabled:opacity-60"
      >
        {checking ? 'جاري الفحص...' : 'إعادة الفحص'}
      </button>
    </div>
  );
}
