import { Capacitor, registerPlugin } from '@capacitor/core';

interface IntegrityPlugin {
  scan(): Promise<{ packages: string[]; debugger: boolean; suBinary: boolean }>;
}
const Integrity = registerPlugin<IntegrityPlugin>('Integrity');

export type BlockReason = 'cheat-app' | 'adblock' | null;
export interface IntegrityResult { reason: BlockReason; detail?: string[] }

const isAndroidNative = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

async function probe(url: string, ms = 6000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Known hack / root / cloner apps, attached debugger. Android only. */
export async function detectCheatTools(): Promise<string[]> {
  if (!isAndroidNative()) return [];
  try {
    const r = await Integrity.scan();
    const out = [...(r.packages || [])];
    return out;
  } catch {
    return [];
  }
}

/**
 * Ad blocker (incl. DNS-level blockers) detection. We only flag when the internet clearly works
 * (control URLs reachable) while ad endpoints fail in 2 separate rounds. Offline = never flagged.
 */
export async function detectAdBlock(): Promise<boolean> {
  if (!isAndroidNative()) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const ads = [
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://googleads.g.doubleclick.net/mads/static/mad/sdk/native/production/sdk-core-v40.html',
    'https://csi.gstatic.com/csi',
  ];
  for (let round = 0; round < 2; round++) {
    const control = (await probe('https://www.gstatic.com/generate_204')) || (await probe('https://www.google.com/generate_204'));
    if (!control) return false;
    const results = await Promise.all(ads.slice(0, 2).map((u) => probe(u)));
    if (results.some(Boolean)) return false;
    if (round === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return true;
}

export async function runIntegrityChecks(): Promise<IntegrityResult> {
  const tools = await detectCheatTools();
  if (tools.length) return { reason: 'cheat-app', detail: tools };
  if (await detectAdBlock()) return { reason: 'adblock' };
  return { reason: null };
}
