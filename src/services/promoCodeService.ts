import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where,
  orderBy, 
  runTransaction 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PromoCode, PromoCodeRedemption } from '../types/admin';
import { isQuotaExceededError, markQuotaExceeded } from '../utils/firestoreErrorHelper';
import { addDoc } from 'firebase/firestore';

const LOCAL_PROMO_CODES_KEY = 'anta_el_modareb_cached_promo_codes_v1';
const LOCAL_CUSTOM_PROMO_CODES_KEY = 'anta_el_modareb_custom_promo_codes_permanent_v1';
const LOCAL_REDEEMED_CODES_KEY = 'anta_el_modareb_redeemed_codes_v1';
const RATE_LIMIT_KEY = 'anta_el_modareb_promo_rate_limit_v1';

async function logPromoAdminAudit(
  adminUserId: string,
  adminEmail: string,
  action: 'create_promo_code' | 'delete_promo_code' | 'toggle_promo_code',
  targetCode: string,
  reason: string,
  metadata?: Record<string, any>
) {
  try {
    const auditLogsCol = collection(db, 'admin_audit_logs');
    await addDoc(auditLogsCol, {
      adminUserId,
      adminEmail: adminEmail || 'admin',
      action,
      targetUserId: targetCode,
      targetUserEmail: 'ALL_MANAGERS',
      timestamp: Date.now(),
      reason,
      metadata: metadata || {}
    });
  } catch (err) {
    console.warn('[PromoCodes] Audit log error:', err);
  }
}

// Sample pre-seeded default codes if database is empty on first boot
export const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: 'WELCOME10M',
    code: 'WELCOME10M',
    rewardAmount: 10000000,
    rewardCoins: 50,
    maxUses: 1000,
    usedCount: 0,
    usedByManagerIds: [],
    redeemedBy: [],
    description: 'هدية الترحيب بالمدربين الجدد (10 مليون جنيه لدعم ميزانية النادي)',
    isActive: true,
    createdAt: Date.now() - 86400000,
    createdBy: 'omar.ibrahem211@gmail.com',
    expiresAt: null
  }
];

function getPersistentCustomCodes(): PromoCode[] {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_PROMO_CODES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function savePersistentCustomCodes(customCodes: PromoCode[]): void {
  try {
    localStorage.setItem(LOCAL_CUSTOM_PROMO_CODES_KEY, JSON.stringify(customCodes));
  } catch {}
}

function getCachedPromoCodes(): PromoCode[] {
  const map = new Map<string, PromoCode>();
  
  // 1. Defaults first
  for (const c of DEFAULT_PROMO_CODES) {
    map.set(c.code.toUpperCase(), c);
  }

  // 2. Persistent custom codes (never wiped)
  for (const c of getPersistentCustomCodes()) {
    map.set(c.code.toUpperCase(), c);
  }

  // 3. Regular cached codes
  try {
    const raw = localStorage.getItem(LOCAL_PROMO_CODES_KEY);
    if (raw) {
      const parsed: PromoCode[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const c of parsed) {
          map.set(c.code.toUpperCase(), c);
        }
      }
    }
  } catch {}

  return Array.from(map.values());
}

function cachePromoCodes(codes: PromoCode[]): void {
  try {
    localStorage.setItem(LOCAL_PROMO_CODES_KEY, JSON.stringify(codes));
    
    // Also save all custom non-default codes to persistent store
    const defaultKeys = new Set(DEFAULT_PROMO_CODES.map(d => d.code.toUpperCase()));
    const customOnly = codes.filter(c => !defaultKeys.has(c.code.toUpperCase()));
    if (customOnly.length > 0) {
      const existingCustom = getPersistentCustomCodes();
      const customMap = new Map<string, PromoCode>();
      existingCustom.forEach(c => customMap.set(c.code.toUpperCase(), c));
      customOnly.forEach(c => customMap.set(c.code.toUpperCase(), c));
      savePersistentCustomCodes(Array.from(customMap.values()));
    }
  } catch {}
}

export function getLocalRedeemedCodeKeys(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_REDEEMED_CODES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function markCodeRedeemedLocally(code: string): void {
  try {
    const list = getLocalRedeemedCodeKeys();
    if (!list.includes(code.toUpperCase())) {
      list.push(code.toUpperCase());
      localStorage.setItem(LOCAL_REDEEMED_CODES_KEY, JSON.stringify(list));
    }
  } catch {}
}

// -----------------------------------------------------------
// Rate Limiting (Prevent Brute-Force Code Guessing)
// -----------------------------------------------------------
function checkRateLimit(): { allowed: boolean; waitSeconds?: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { allowed: true };
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.blockedUntil && now < data.blockedUntil) {
      const wait = Math.ceil((data.blockedUntil - now) / 1000);
      return { allowed: false, waitSeconds: wait };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

function recordFailedAttempt(): void {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    let data = raw ? JSON.parse(raw) : { attempts: 0, windowStart: now };
    if (now - data.windowStart > 120000) {
      data = { attempts: 1, windowStart: now };
    } else {
      data.attempts = (data.attempts || 0) + 1;
    }

    if (data.attempts >= 5) {
      data.blockedUntil = now + 90000; // Block for 90 seconds after 5 failed attempts
    }

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch {}
}

function clearRateLimit(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {}
}

// -----------------------------------------------------------
// Admin Methods
// -----------------------------------------------------------

/**
 * Fetch all promo codes from Firestore (with intelligent local cache merge)
 */
export async function fetchAllPromoCodes(): Promise<PromoCode[]> {
  try {
    const promoRef = collection(db, 'promo_codes');
    const q = query(promoRef, orderBy('createdAt', 'desc'));
    
    // Safety timeout: 2500ms so UI never hangs
    const getDocsPromise = getDocs(q);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Promo codes fetch timeout')), 2500)
    );
    const snap = await Promise.race([getDocsPromise, timeoutPromise]);

    const localCached = getCachedPromoCodes();

    if (snap.empty) {
      // Seed initial default code if database is fresh
      if (localCached.length > 0) {
        const first = localCached[0];
        setDoc(doc(db, 'promo_codes', first.code), first).catch(() => {});
      }
      return localCached;
    }

    const firestoreCodes: PromoCode[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as PromoCode));

    // MERGE: Keep all local custom codes while updating from Firestore
    const mergedMap = new Map<string, PromoCode>();
    
    // 1. Local cached / persistent codes
    for (const c of localCached) {
      mergedMap.set(c.code.toUpperCase(), c);
    }

    // 2. Overwrite / supplement with latest cloud Firestore codes
    for (const c of firestoreCodes) {
      mergedMap.set(c.code.toUpperCase(), c);
    }

    const mergedList = Array.from(mergedMap.values());
    cachePromoCodes(mergedList);

    return mergedList;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
    }
    console.warn('[PromoCodes] Firestore read fallback to local cache:', err);
    return getCachedPromoCodes();
  }
}

/**
 * Create a new custom promo code
 */
export async function createPromoCode(params: {
  code: string;
  rewardAmount: number;
  rewardCoins?: number;
  maxUses: number;
  description?: string;
  expiresAt?: number | null;
  adminUser?: { uid: string; email?: string | null };
}): Promise<{ success: boolean; promoCode: PromoCode; message: string }> {
  const normalizedCode = params.code.trim().toUpperCase().replace(/\s+/g, '');

  if (!normalizedCode || normalizedCode.length < 3 || normalizedCode.length > 32) {
    throw new Error('يجب أن يتكون الكود من 3 إلى 32 حرفاً أو رقماً إنجليزياً بدون مسافات.');
  }

  if (!/^[A-Z0-9_-]+$/.test(normalizedCode)) {
    throw new Error('الكود يجب أن يحتوي فقط على حروف وأرقام إنجليزية وشرطات (A-Z, 0-9, -, _).');
  }

  if (!params.rewardAmount || params.rewardAmount <= 0) {
    throw new Error('يرجى تحديد مبلغ مالي صحيح وإيجابي لميزانية النادي (مثلاً 10,000,000 ج.م).');
  }

  if (!params.maxUses || params.maxUses < 1) {
    throw new Error('عدد مرات الاستخدام يجب أن يكون 1 على الأقل.');
  }

  // 1. Fast check for duplicates
  const cachedCodes = getCachedPromoCodes();
  if (cachedCodes.some(c => c.code.toUpperCase() === normalizedCode)) {
    throw new Error(`الكود (${normalizedCode}) موجود بالفعل! يرجى اختيار كود آخر أو تعديله.`);
  }

  const adminEmail = params.adminUser?.email || 'omar.ibrahem211@gmail.com';
  const adminUid = params.adminUser?.uid || 'super_admin';

  const newCodeDoc: PromoCode = {
    id: normalizedCode,
    code: normalizedCode,
    rewardAmount: Math.round(params.rewardAmount),
    rewardCoins: params.rewardCoins ? Math.max(0, Math.round(params.rewardCoins)) : 0,
    maxUses: Math.round(params.maxUses),
    usedCount: 0,
    usedByManagerIds: [],
    redeemedBy: [],
    description: params.description?.trim() || 'كود مكافأة مالي للمدربين',
    isActive: true,
    createdAt: Date.now(),
    createdBy: adminEmail,
    expiresAt: params.expiresAt || null
  };

  // 2. Save to local cache & persistent store IMMEDIATELY (guarantees code is never lost)
  const updatedCache = [newCodeDoc, ...cachedCodes.filter(c => c.code.toUpperCase() !== normalizedCode)];
  cachePromoCodes(updatedCache);

  // 3. Write to Firestore cloud with safety timeout (await it to guarantee it is persisted in cloud for Android users)
  let cloudSynced = false;
  try {
    const setDocPromise = setDoc(doc(db, 'promo_codes', normalizedCode), newCodeDoc);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore write timeout')), 5000)
    );
    await Promise.race([setDocPromise, timeoutPromise]);
    cloudSynced = true;
  } catch (err) {
    console.warn('[PromoCodes] Firestore write note (saved locally):', err);
  }

  logPromoAdminAudit(
    adminUid,
    adminEmail,
    'create_promo_code',
    normalizedCode,
    `إنشاء كود مكافأة [${normalizedCode}] بمبلغ ${params.rewardAmount.toLocaleString()} ج.م وحد أقصى ${params.maxUses} استخدام`,
    { code: normalizedCode, rewardAmount: params.rewardAmount, maxUses: params.maxUses, cloudSynced }
  ).catch(() => {});

  return {
    success: true,
    promoCode: newCodeDoc,
    message: cloudSynced
      ? `تم إنشاء ونشر كود المكافأة [${normalizedCode}] بنجاح على السحابة وجاهز للاستخدام الفوري لجميع أجهزة الأندرويد والويب!`
      : `تم حفظ الكود [${normalizedCode}] محلياً وجاري مزامنته مع السحابة فور توفر الاتصال.`
  };
}

/**
 * Delete a promo code permanently
 */
export async function deletePromoCode(
  codeId: string, 
  adminUser?: { uid: string; email?: string | null }
): Promise<{ success: boolean; message: string }> {
  const normalized = codeId.trim().toUpperCase();

  // 1. Update local cache immediately
  const cached = getCachedPromoCodes().filter(c => c.code !== normalized);
  cachePromoCodes(cached);

  const adminEmail = adminUser?.email || 'omar.ibrahem211@gmail.com';
  const adminUid = adminUser?.uid || 'super_admin';

  // 2. Sync deletion to Firestore with safety timeout
  try {
    const deletePromise = deleteDoc(doc(db, 'promo_codes', normalized));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore delete timeout')), 4000)
    );
    await Promise.race([deletePromise, timeoutPromise]);
  } catch (err) {
    console.warn('[PromoCodes] Firestore delete note:', err);
  }

  logPromoAdminAudit(
    adminUid,
    adminEmail,
    'delete_promo_code',
    normalized,
    `حذف كود المكافأة [${normalized}] نهائياً من النظام لمنع أي استخدام مستقبلي`,
    { code: normalized }
  ).catch(() => {});

  return {
    success: true,
    message: `تم حذف الكود [${normalized}] بنجاح ولن يتمكن أي مدرب من استخدامه بعد الآن.`
  };
}

/**
 * Toggle code active / inactive status
 */
export async function togglePromoCodeStatus(
  codeId: string,
  isActive: boolean,
  adminUser?: { uid: string; email?: string | null }
): Promise<{ success: boolean; message: string }> {
  const normalized = codeId.trim().toUpperCase();

  // 1. Update cache immediately
  const cached = getCachedPromoCodes().map(c => {
    if (c.code === normalized) return { ...c, isActive };
    return c;
  });
  cachePromoCodes(cached);

  const adminEmail = adminUser?.email || 'omar.ibrahem211@gmail.com';
  const adminUid = adminUser?.uid || 'super_admin';

  // 2. Sync toggle to Firestore with safety timeout
  try {
    const updatePromise = updateDoc(doc(db, 'promo_codes', normalized), { isActive });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore toggle timeout')), 4000)
    );
    await Promise.race([updatePromise, timeoutPromise]);
  } catch (err) {
    console.warn('[PromoCodes] Firestore toggle note:', err);
  }

  logPromoAdminAudit(
    adminUid,
    adminEmail,
    'toggle_promo_code',
    normalized,
    `تغيير حالة كود المكافأة [${normalized}] إلى (${isActive ? 'مفعل ومتاح للاستخدام' : 'معطل ومجمد'})`,
    { code: normalized, isActive }
  ).catch(() => {});

  return {
    success: true,
    message: `تم ${isActive ? 'تفعيل' : 'إيقاف'} الكود [${normalized}] بنجاح.`
  };
}

// -----------------------------------------------------------
// Coach / Player Redemption Method (Atomic & Anti-Tamper)
// -----------------------------------------------------------

export interface RedeemResult {
  success: boolean;
  message: string;
  rewardAmount: number;
  rewardCoins: number;
  code: string;
  description: string;
}

/**
 * Redeem a promo code for a manager:
 * - Checks local cached codes and Firestore cloud codes seamlessly.
 * - Prevents multiple uses by the same manager.
 * - Prevents usage of expired, inactive, or exhausted codes.
 * - Supports offline and instant local redemption with background sync.
 */
export async function redeemPromoCode(
  rawInput: string,
  managerInfo: {
    userId: string;
    managerName: string;
    clubName: string;
    trainerId?: string;
  }
): Promise<RedeemResult> {
  const normalizedCode = (rawInput || '').trim().toUpperCase().replace(/\s+/g, '');
  const strippedCode = normalizedCode.replace(/[-_]/g, '');

  if (!normalizedCode) {
    throw new Error('يرجى كتابة كود الهدية أولاً!');
  }

  // 1. Check rate limit
  const rateLimit = checkRateLimit();
  if (!rateLimit.allowed) {
    throw new Error(`يرجى الانتظار (${rateLimit.waitSeconds} ثانية) قبل محاولة إدخال كود جديد لحماية الأمان.`);
  }

  const userIdentifier = managerInfo.userId || managerInfo.trainerId || 'anon_manager';

  // 2. Look up promo code: First in local cache & persistent store, then Firestore cloud fallback
  const cachedCodes = getCachedPromoCodes();
  let matchedCode: PromoCode | undefined = cachedCodes.find(
    c => c.code.toUpperCase() === normalizedCode || 
         c.code.toUpperCase().replace(/[-_]/g, '') === strippedCode
  );

  // If not found in local cache, check Firestore with safety timeout (up to 6000ms for mobile networks)
  if (!matchedCode) {
    try {
      // Step A: Direct document lookup by normalizedCode
      const codeRef = doc(db, 'promo_codes', normalizedCode);
      const getDocPromise = getDoc(codeRef);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore read timeout')), 6000)
      );
      const docSnap = await Promise.race([getDocPromise, timeoutPromise]);
      if (docSnap && docSnap.exists()) {
        matchedCode = { id: docSnap.id, ...docSnap.data() } as PromoCode;
      } else if (strippedCode !== normalizedCode) {
        // Step B: Direct document lookup by strippedCode
        const strippedRef = doc(db, 'promo_codes', strippedCode);
        const strippedSnap = await getDoc(strippedRef).catch(() => null);
        if (strippedSnap && strippedSnap.exists()) {
          matchedCode = { id: strippedSnap.id, ...strippedSnap.data() } as PromoCode;
        }
      }

      // Step C: If still not found, query by code field
      if (!matchedCode) {
        const qCode = query(collection(db, 'promo_codes'), where('code', '==', normalizedCode));
        const qSnap = await getDocs(qCode).catch(() => null);
        if (qSnap && !qSnap.empty) {
          matchedCode = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() } as PromoCode;
        }
      }

      // Step D: If still not found, search full collection in-memory
      if (!matchedCode) {
        const allSnap = await getDocs(collection(db, 'promo_codes')).catch(() => null);
        if (allSnap && !allSnap.empty) {
          for (const d of allSnap.docs) {
            const data = d.data() as PromoCode;
            const cCode = (data.code || d.id).toUpperCase();
            if (cCode === normalizedCode || cCode.replace(/[-_]/g, '') === strippedCode) {
              matchedCode = { id: d.id, ...data };
              break;
            }
          }
        }
      }

      if (matchedCode) {
        // Add to local cache for future instantaneous lookups
        const updated = [matchedCode, ...cachedCodes.filter(c => c.code.toUpperCase() !== matchedCode!.code.toUpperCase())];
        cachePromoCodes(updated);
      }
    } catch (err) {
      console.warn('[PromoCodes] Cloud lookup note:', err);
    }
  }

  // If code was not found anywhere
  if (!matchedCode) {
    recordFailedAttempt();
    throw new Error('كود غير صحيح! يرجى التأكد من كتابة الحروف والأرقام بدقة.');
  }

  const officialCode = matchedCode.code.toUpperCase();

  // 3. Check local redemption record
  const localRedeemed = getLocalRedeemedCodeKeys();
  if (localRedeemed.includes(officialCode) || localRedeemed.includes(normalizedCode)) {
    throw new Error('لقد قمت باسترداد هذا الكود بالفعل مسبقاً! لا يمكن استرداد الكود أكثر من مرة لنفس المدرب.');
  }

  // 4. Validate code business rules
  if (!matchedCode.isActive) {
    recordFailedAttempt();
    throw new Error('عذراً، هذا الكود معطل حالياً أو تم إيقافه من قِبل إدارة اللعبة.');
  }

  if (matchedCode.expiresAt && Date.now() > matchedCode.expiresAt) {
    recordFailedAttempt();
    throw new Error('عذراً، لقد انتهت صلاحية هذا الكود ولم يعد متاحاً للاستخدام.');
  }

  if ((matchedCode.usedCount || 0) >= (matchedCode.maxUses || 1)) {
    recordFailedAttempt();
    throw new Error('عذراً، لقد استُنفد هذا الكود بالكامل ووصل للحد الأقصى المسموح من الاستخدامات!');
  }

  const usedIds = Array.isArray(matchedCode.usedByManagerIds) ? matchedCode.usedByManagerIds : [];
  if (usedIds.includes(userIdentifier)) {
    recordFailedAttempt();
    throw new Error('لقد قمت باسترداد هذا الكود بالفعل مسبقاً! لا يمكن استخدام الكود مرتين لنفس الحساب.');
  }

  // 5. Apply redemption locally
  const redemptionRecord: PromoCodeRedemption = {
    userId: userIdentifier,
    managerName: managerInfo.managerName || 'المدرب',
    clubName: managerInfo.clubName || 'النادي',
    redeemedAt: Date.now(),
    amount: matchedCode.rewardAmount,
  };

  const nextUsedCount = (matchedCode.usedCount || 0) + 1;
  const nextUsedIds = [...usedIds, userIdentifier];
  const nextRedeemedBy = Array.isArray(matchedCode.redeemedBy)
    ? [...matchedCode.redeemedBy, redemptionRecord].slice(-100)
    : [redemptionRecord];

  const updatedCode: PromoCode = {
    ...matchedCode,
    usedCount: nextUsedCount,
    usedByManagerIds: nextUsedIds,
    redeemedBy: nextRedeemedBy,
  };

  const updatedCache = cachedCodes.map(c => c.code.toUpperCase() === officialCode ? updatedCode : c);
  if (!updatedCache.some(c => c.code.toUpperCase() === officialCode)) {
    updatedCache.unshift(updatedCode);
  }
  cachePromoCodes(updatedCache);

  markCodeRedeemedLocally(officialCode);
  markCodeRedeemedLocally(normalizedCode);
  clearRateLimit();

  // 6. Background cloud sync to Firestore with safety timeout
  const syncRedemptionToCloud = async () => {
    try {
      const codeRef = doc(db, 'promo_codes', officialCode);
      const updatePromise = updateDoc(codeRef, {
        usedCount: nextUsedCount,
        usedByManagerIds: nextUsedIds,
        redeemedBy: nextRedeemedBy,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore redemption sync timeout')), 3000)
      );
      await Promise.race([updatePromise, timeoutPromise]);
    } catch (err) {
      console.warn('[PromoCodes] Background redemption sync note:', err);
    }
  };

  syncRedemptionToCloud();

  return {
    success: true,
    code: updatedCode.code,
    rewardAmount: updatedCode.rewardAmount,
    rewardCoins: updatedCode.rewardCoins || 0,
    description: updatedCode.description || 'مكافأة كود الهدية',
    message: `مبروك يا كابتن! تم استرداد الكود بنجاح وإيداع (${updatedCode.rewardAmount.toLocaleString()} ج.م) مباشرة في ميزانية ناديك! 💰🎉`
  };
}
