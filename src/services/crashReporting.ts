import { Capacitor } from '@capacitor/core';

type CrashlyticsPlugin = typeof import('@capacitor-firebase/crashlytics').FirebaseCrashlytics;
type CrashlyticsHandle = { api: CrashlyticsPlugin };

let pluginHandle: CrashlyticsHandle | null = null;
let pluginLoad: Promise<CrashlyticsHandle | null> | null = null;
let pluginDisabled = false;
let failureWarned = false;

function warnOnce(operation: string, error: unknown): void {
  if (failureWarned) return;
  failureWarned = true;
  try {
    console.warn(`[Crashlytics] Disabled after ${operation} failed.`, error);
  } catch {
    // Reporting must never affect the app.
  }
}

/**
 * Identifies the Capacitor proxy's unimplemented-method rejection. The global error
 * handlers must not feed this failure back into Crashlytics and recursively report it.
 */
export function isCrashlyticsBridgeFailure(error: unknown): boolean {
  try {
    const text = error instanceof Error
      ? `${error.message}\n${error.stack || ''}`
      : String(error ?? '');
    return /FirebaseCrashlytics\.[\w$]+\(\)[\s\S]*not implemented/i.test(text);
  } catch {
    return false;
  }
}

/**
 * Loads the native plugin only when Capacitor says it is registered. Keep the proxy
 * inside a plain object: returning the proxy itself from a Promise makes Promise
 * resolution treat its dynamic `.then` method as a thenable, which calls the native
 * plugin's unimplemented `then()` method on Android.
 */
function getPlugin(): Promise<CrashlyticsHandle | null> {
  if (pluginDisabled) return Promise.resolve(null);
  if (pluginHandle) return Promise.resolve(pluginHandle);
  if (pluginLoad) return pluginLoad;

  try {
    if (
      typeof window === 'undefined' ||
      !Capacitor.isNativePlatform() ||
      !Capacitor.isPluginAvailable('FirebaseCrashlytics')
    ) {
      pluginDisabled = true;
      return Promise.resolve(null);
    }
  } catch (error) {
    pluginDisabled = true;
    warnOnce('plugin availability check', error);
    return Promise.resolve(null);
  }

  pluginLoad = import('@capacitor-firebase/crashlytics')
    .then((mod) => {
      const handle: CrashlyticsHandle = { api: mod.FirebaseCrashlytics };
      pluginHandle = handle;
      return handle;
    })
    .catch((error) => {
      pluginDisabled = true;
      warnOnce('plugin load', error);
      return null;
    });

  return pluginLoad;
}

async function safelyCallCrashlytics(
  operation: string,
  call: (plugin: CrashlyticsPlugin) => void | Promise<unknown>,
): Promise<void> {
  try {
    const handle = await getPlugin();
    if (!handle || pluginDisabled) return;
    await call(handle.api);
  } catch (error) {
    // Disable after the first native failure so a missing Firebase setup cannot
    // produce a rejection for every app error or breadcrumb.
    pluginDisabled = true;
    pluginHandle = null;
    warnOnce(operation, error);
  }
}

/** Called once at app start. */
export function initCrashReporting(): void {
  void safelyCallCrashlytics('initialization', async (crashlytics) => {
    await crashlytics.setEnabled({ enabled: true });
    await crashlytics.setCustomKey({
      key: 'app_version',
      value: String((import.meta as any).env?.VITE_APP_VERSION || 'unknown'),
      type: 'string',
    });
  });
}

/** Breadcrumb: shows up in the Crashlytics "Logs" tab of the next report. */
export function crashLog(message: string): void {
  void safelyCallCrashlytics('log', (crashlytics) =>
    crashlytics.log({ message: String(message).slice(0, 1000) }),
  );
}

/** Reports a non-fatal JS error (window.onerror / unhandledrejection / caught exceptions). */
export function recordJsException(kind: string, message: string, stack?: string): void {
  void safelyCallCrashlytics('exception reporting', async (crashlytics) => {
    await crashlytics.setCustomKey({ key: 'js_error_kind', value: kind, type: 'string' });
    await crashlytics.recordException({
      message: `[${kind}] ${String(message || 'error').slice(0, 500)}`,
      stacktrace: stack
        ? [{ fileName: 'js', lineNumber: 0, functionName: String(stack).slice(0, 1500) }]
        : undefined,
    } as any);
  });
}

/** Attaches a user id (never an email) once known. */
export function setCrashUserId(id: string): void {
  void safelyCallCrashlytics('user ID', (crashlytics) =>
    crashlytics.setUserId({ userId: String(id).slice(0, 128) }),
  );
}
