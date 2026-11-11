// Helper to detect and handle Firestore Quota, Network, and Availability limits gracefully

const QUOTA_KEY = 'anta_elmodareb_firestore_quota_exceeded_timestamp';
let inMemoryQuotaExceeded = false; // Default to normal active operation; only set to true if a quota error actually occurs

export const PVP_QUOTA_USER_MESSAGE = 'الخدمة الأونلاين مشغولة حاليًا، حفظك ومسيرتك مؤمنة محليًا بالكامل.';

export function isQuotaExceededError(error: any): boolean {
  if (!error) return false;
  const code = typeof error === 'object' && error.code ? String(error.code).toLowerCase() : '';
  const msg = typeof error === 'object' && error.message ? String(error.message).toLowerCase() : String(error).toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    code.includes('quota-exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units') ||
    msg.includes('free daily read units') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

export function isFirestoreUnavailableError(error: any): boolean {
  if (!error) return false;
  if (isQuotaExceededError(error)) return true;
  const code = typeof error === 'object' && error.code ? String(error.code).toLowerCase() : '';
  const msg = typeof error === 'object' && error.message ? String(error.message).toLowerCase() : String(error).toLowerCase();
  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    code.includes('failed-precondition') ||
    code.includes('network-request-failed') ||
    code.includes('client-offline') ||
    code.includes('permission-denied') ||
    code.includes('timeout') ||
    msg.includes('unavailable') ||
    msg.includes('offline') ||
    msg.includes('network') ||
    msg.includes('client is offline') ||
    msg.includes('timeout')
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



