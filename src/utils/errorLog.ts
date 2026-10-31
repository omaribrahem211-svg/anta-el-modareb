/**
 * Tiny persistent debug log (last 30 entries) so testers can copy what went wrong
 * after a white screen / freeze. Stored as a small JSON string only.
 */
const LOG_KEY = 'debug_error_log';
const MAX_ENTRIES = 30;

interface DebugEntry { t: string; kind: string; msg: string }

function readLog(): DebugEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushDebugLog(kind: string, msg: string): void {
  try {
    const entries = readLog();
    entries.push({ t: new Date().toISOString(), kind, msg: String(msg).slice(0, 400) });
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // storage unavailable: ignore
  }
}

export function getDebugLogText(): string {
  const entries = readLog();
  if (entries.length === 0) return 'لا توجد أخطاء مسجلة.';
  return entries.map(e => `${e.t} [${e.kind}] ${e.msg}`).join('\n');
}

export function clearDebugLog(): void {
  try { localStorage.removeItem(LOG_KEY); } catch {}
}

let installed = false;
export function installGlobalErrorLogging(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (ev: ErrorEvent) => {
    pushDebugLog('error', `${ev.message || 'error'} @ ${ev.filename || ''}:${ev.lineno || 0}`);
  });
  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const reason: any = ev.reason;
    pushDebugLog('rejection', reason?.message || String(reason));
  });
}
