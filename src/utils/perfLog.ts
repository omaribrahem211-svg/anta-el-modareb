/**
 * Lightweight performance helpers used by heavy end-of-season work.
 * - timed(): runs fn, warns when it takes longer than `warnMs` so slow steps show up in the error log.
 * - runWhenIdle(): defers non-urgent work until the browser is idle (never blocks a visible frame).
 */
import { pushDebugLog } from './errorLog';

export function timed<T>(label: string, fn: () => T, warnMs: number = 150): T {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    return fn();
  } finally {
    const took = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
    if (took >= warnMs) {
      const msg = `[SlowStep] ${label} took ${Math.round(took)}ms`;
      console.warn(msg);
      pushDebugLog('perf', msg);
    }
  }
}

export function runWhenIdle(fn: () => void, timeoutMs: number = 2500): void {
  try {
    const ric = typeof window !== 'undefined' ? (window as any).requestIdleCallback : undefined;
    if (typeof ric === 'function') {
      ric(() => {
        try { fn(); } catch (e) { console.warn('[runWhenIdle] task failed:', e); }
      }, { timeout: timeoutMs });
    } else {
      setTimeout(() => {
        try { fn(); } catch (e) { console.warn('[runWhenIdle] task failed:', e); }
      }, 200);
    }
  } catch (e) {
    console.warn('[runWhenIdle] scheduling failed:', e);
  }
}
