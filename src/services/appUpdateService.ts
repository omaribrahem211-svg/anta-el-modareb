import { Capacitor, registerPlugin } from '@capacitor/core';

interface InAppUpdatePlugin {
  check(): Promise<{ available: boolean; inProgress?: boolean; allowed?: boolean; versionCode?: number; error?: string }>;
  startImmediate(): Promise<{ result: 'ok' | 'cancelled' | 'failed' }>;
}

const InAppUpdate = registerPlugin<InAppUpdatePlugin>('InAppUpdate');

export type UpdateCheckResult = 'none' | 'required' | 'started';

/** True only for the Android app; web / sideloaded builds just skip everything. */
export function canCheckForAppUpdate(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/** Asks Google Play whether a newer version exists. Any error counts as "no update". */
export async function isUpdateRequired(): Promise<boolean> {
  if (!canCheckForAppUpdate()) return false;
  try {
    const info = await InAppUpdate.check();
    return Boolean((info.available || info.inProgress) && info.allowed !== false);
  } catch {
    return false;
  }
}

/**
 * Launches Google Play's full-screen update. Resolves 'ok' when the update was accepted (the app restarts
 * itself after install), 'cancelled' if the player backed out, 'failed' if Play could not run it.
 */
export async function runImmediateUpdate(): Promise<'ok' | 'cancelled' | 'failed'> {
  if (!canCheckForAppUpdate()) return 'failed';
  try {
    const res = await InAppUpdate.startImmediate();
    return res.result;
  } catch {
    return 'failed';
  }
}
