import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { AppErrorDetail, getDebugLogText } from '../utils/errorLog';

/**
 * Non-blocking error reporter: when a JavaScript error happens, a small "⚠️ خطأ" chip appears. Tapping it opens
 * the exact error (message + location + app version) with a copy button so the player can send a screenshot.
 * Native crashes (Java / WebView) can't be shown here; those still appear in Play Console.
 */
export default function ErrorReporter() {
  const [errors, setErrors] = useState<AppErrorDetail[]>([]);
  const [open, setOpen] = useState(false);
  const [ver, setVer] = useState('');
  const [copied, setCopied] = useState(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const onErr = (e: Event) => {
      const d = (e as CustomEvent<AppErrorDetail>).detail;
      if (!d) return;
      const key = d.msg.slice(0, 120);
      if (seen.current.has(key)) return;
      seen.current.add(key);
      setErrors(prev => [...prev.slice(-4), d]);
    };
    window.addEventListener('app-error', onErr);
    return () => window.removeEventListener('app-error', onErr);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    CapApp.getInfo().then(i => setVer(`${i.version} (${i.build})`)).catch(() => {});
  }, []);

  if (errors.length === 0) return null;

  const text = () =>
    [`النسخة: ${ver || 'web'}`, `الجهاز: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`, '',
      ...errors.map(e => `[${e.t}] ${e.kind}: ${e.msg}\n${e.stack}`), '', 'السجل:', getDebugLogText()].join('\n');

  const copy = async () => {
    try { await navigator.clipboard.writeText(text()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-2 left-2 z-[30000] px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black shadow-lg"
        >
          ⚠️ حصل خطأ ({errors.length}) — اضغط للتفاصيل
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[30001] bg-slate-950/95 p-4 overflow-auto" dir="rtl">
          <div className="text-white font-black text-lg mb-1">تفاصيل الخطأ</div>
          <div className="text-slate-300 text-xs mb-3">خد سكرين شوت للشاشة دي وابعتها للمطوّر. اللعبة ممكن تكمل عادي.</div>
          <div className="text-emerald-300 text-xs mb-2" dir="ltr">v{ver || 'web'}</div>
          <pre className="text-[11px] leading-snug text-amber-200 whitespace-pre-wrap break-words bg-slate-900 rounded-xl p-3" dir="ltr">
{errors.map(e => `${e.t.slice(11, 19)} ${e.kind}: ${e.msg}\n${e.stack.split('\n').slice(0, 6).join('\n')}`).join('\n\n')}
          </pre>
          <div className="flex gap-2 mt-3">
            <button onClick={copy} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm">{copied ? 'تم النسخ ✓' : 'نسخ التفاصيل'}</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl bg-slate-700 text-white font-black text-sm">إغلاق</button>
            <button onClick={() => { setErrors([]); seen.current.clear(); setOpen(false); }} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm">مسح</button>
          </div>
        </div>
      )}
    </>
  );
}
