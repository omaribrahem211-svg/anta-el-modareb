/**
 * Firebase Crashlytics bridge (native Android only).
 * Routes the app's existing JS error/diagnostic pipeline into Crashlytics so every crash and
 * non-fatal JS error shows up with stack traces, device info and breadcrumbs in the Firebase console.
 * No-ops on web builds and when the native plugin is unavailable.
 */
import { Capacitor } from '@capacitor/core';

type CrashlyticsPlugin = typeof import('@capacitor-firebase/crashlytics').FirebaseCrashlytics;

let plugin: CrashlyticsPlugin | null = null;
let initAttempted = false;

async function getPlugin(): Promise<CrashlyticsPlugin | null> {
  if (plugin || initAttempted) return plugin;
  initAttempted = true;
  try {
    if (!Capacitor.isNativePlatform()) return null;
    const mod = await import('@capacitor-firebase/crashlytics');
    plugin = mod.FirebaseCrashlytics;
  } catch {
    plugin = null;
  }
  return plugin;
}

/** Called once at app start. */
export async function initCrashReporting(): Promise<void> {
  const c = await getPlugin();
  if (!c) return;
  try {
    await c.setEnabled({ enabled: true });
    await c.setCustomKey({ key: 'app_version', value: String((import.meta as any).env?.VITE_APP_VERSION || 'unknown'), type: 'string' });
  } catch {}
}

/** Breadcrumb: shows up in the Crashlytics "Logs" tab of the next fatal/non-fatal report. */
export function crashLog(message: string): void {
  getPlugin().then(c => { try { c?.log({ message: String(message).slice(0, 1000) }); } catch {} });
}

/** Reports a non-fatal JS error (window.onerror / unhandledrejection / caught exceptions). */
export function recordJsException(kind: string, message: string, stack?: string): void {
  getPlugin().then(c => {
    if (!c) return;
    try {
      c.setCustomKey({ key: 'js_error_kind', value: kind, type: 'string' });
      c.recordException({
        message: `[${kind}] ${String(message || 'error').slice(0, 500)}`,
        stacktrace: stack
          ? [{ fileName: 'js', lineNumber: 0, functionName: String(stack).slice(0, 1500) }]
          : undefined,
      } as any);
    } catch {}
  });
}

/** Attaches a user id (never an email) once known. */
export function setCrashUserId(id: string): void {
  getPlugin().then(c => { try { c?.setUserId({ userId: String(id).slice(0, 128) }); } catch {} });
}
