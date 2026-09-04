// Helper to detect and handle Firestore Quota and Network limits gracefully

const QUOTA_KEY = 'anta_elmodareb_firestore_quota_exceeded_timestamp';
let inMemoryQuotaExceeded = false; // Default to normal active operation; only set to true if a quota error actually occurs

export const PVP_QUOTA_USER_MESSAGE = 'الخدمة الأونلاين مشغولة حاليًا، حاول مرة تانية بعد شوية.';

export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  const code = typeof error === 'object' && error.code ? String(error.code) : '';
  const msg = typeof error === 'object' && error.message ? String(error.message) : String(error);
  return (
    code === 'resource-exhausted' ||
    code.includes('resource-exhausted') ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units')
  );
}

export function markQuotaExceeded(): void {
  inMemoryQuotaExceeded = true;
  try {
    localStorage.setItem(QUOTA_KEY, Date.now().toString());
  } catch {
    // ignore
  }
}

export function isRecentQuotaExceeded(): boolean {
  if (inMemoryQuotaExceeded) return true;
  try {
    const timestamp = localStorage.getItem(QUOTA_KEY);
    if (!timestamp) return false;
    const elapsed = Date.now() - parseInt(timestamp, 10);
    // Cooldown for 15 minutes if quota was exceeded before trying again
    if (elapsed < 15 * 60 * 1000) {
      return true;
    }
    // Cooldown elapsed, clear flag
    clearQuotaExceeded();
    return false;
  } catch {
    return false;
  }
}

export function clearQuotaExceeded(): void {
  inMemoryQuotaExceeded = false;
  try {
    localStorage.removeItem(QUOTA_KEY);
  } catch {
    // ignore
  }
}


