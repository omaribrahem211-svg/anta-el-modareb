/**
 * Performance ("lite") mode: on weak GPUs (e.g. Mali G52) the WebView sometimes fails to paint parts of busy screens
 * (white panels, invisible white text). Lite mode removes animations, blur and backdrop filters, and a forced repaint
 * is triggered when the app returns to the foreground / a live match opens.
 */
const KEY = 'perf_mode'; // 'on' | 'off' | (unset = auto)

export type PerfSetting = 'auto' | 'on' | 'off';

export function getPerfSetting(): PerfSetting {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch { return 'auto'; }
}

function autoLite(): boolean {
  try {
    const mem = (navigator as any).deviceMemory as number | undefined;
    const cores = navigator.hardwareConcurrency || 8;
    return (typeof mem === 'number' && mem <= 4) || cores <= 6;
  } catch { return false; }
}

export function isLiteMode(): boolean {
  const s = getPerfSetting();
  return s === 'on' ? true : s === 'off' ? false : autoLite();
}

export function applyPerfMode(): void {
  try { document.documentElement.classList.toggle('perf-lite', isLiteMode()); } catch {}
}

export function setPerfSetting(v: PerfSetting): void {
  try { if (v === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch {}
  applyPerfMode();
  forceRepaint();
}

/** Nudges the compositor so panels that failed to paint are drawn again. */
export function forceRepaint(): void {
  try {
    const el = document.getElementById('root') || document.body;
    el.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.style.transform = ''; });
    });
  } catch {}
}

let installed = false;
export function installPerfMode(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  applyPerfMode();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { forceRepaint(); setTimeout(forceRepaint, 600); }
  });
  window.addEventListener('focus', () => forceRepaint());
}
