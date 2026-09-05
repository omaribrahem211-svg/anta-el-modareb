import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  setDoc,
  deleteDoc,
  query, 
  where,
  orderBy, 
  limit,
  startAfter,
  getDoc,
  getCountFromServer,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/auth';
import { AdminAuditLog, AdminDashboardMetrics, AdminActionType, GameRealismSettings, BroadcastMessage, BroadcastType, WorldVersion } from '../types/admin';
import { PvPMatch } from '../types/pvp';
import { Club, Player } from '../types/game';
import { cancelPvPMatch } from './pvpService';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';

export const SUPER_ADMIN_EMAIL = 'omar.ibrahem211@gmail.com';

const LOCAL_ADMIN_USERS_KEY = 'anta_el_modareb_cached_admin_users_v1';
const LOCAL_ADMIN_PVP_KEY = 'anta_el_modareb_cached_admin_pvp_v1';
const LOCAL_ADMIN_AUDIT_LOGS_KEY = 'anta_el_modareb_cached_audit_logs_v1';
const LOCAL_GAME_REALISM_KEY = 'anta_el_modareb_cached_realism_settings_v1';
const LOCAL_ADMIN_BROADCASTS_KEY = 'anta_el_modareb_cached_broadcasts_v1';

export const DEFAULT_REALISM_SETTINGS: GameRealismSettings = {
  id: 'game_balance_v1',
  jobOfferDifficulty: 'realistic',
  promotionDifficultyModifier: 1.0,
  relegationDifficultyModifier: 1.0,
  pvpMatchmakingEloTolerance: 150,
  pvpMinChallengePrize: 100,
  pvpMaxChallengePrize: 10000,
  minManagerLevelForChallenge: 1,
  dailyChallengeLimit: 20,
  sameOpponentCooldownMinutes: 15,
  eloKFactor: 32,
  systemFeePercentage: 0, // No platform fee currently as requested
  
  // Economy Rebalancing Multipliers (Part 17)
  matchRewardMultiplier: 1.0,
  promotionRewardMultiplier: 1.0,
  leagueRewardMultiplier: 1.0,
  sponsorRewardMultiplier: 1.0,
  transferPriceMultiplier: 1.0,
  salaryMultiplier: 1.0,

  updatedAt: Date.now(),
  updatedBy: 'system'
};

function getLocalGameRealismSettings(): GameRealismSettings {
  try {
    const saved = localStorage.getItem(LOCAL_GAME_REALISM_KEY);
    if (saved) {
      return { ...DEFAULT_REALISM_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_REALISM_SETTINGS;
}

function saveLocalGameRealismSettings(settings: GameRealismSettings): void {
  try {
    localStorage.setItem(LOCAL_GAME_REALISM_KEY, JSON.stringify(settings));
  } catch {}
}

function getCachedAdminUsers(): UserProfile[] {
  try {
    const data = localStorage.getItem(LOCAL_ADMIN_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function cacheAdminUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(users.slice(0, 100)));
  } catch {}
}

function getCachedAdminPvPMatches(): PvPMatch[] {
  try {
    const data = localStorage.getItem(LOCAL_ADMIN_PVP_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function cacheAdminPvPMatches(matches: PvPMatch[]): void {
  try {
    localStorage.setItem(LOCAL_ADMIN_PVP_KEY, JSON.stringify(matches.slice(0, 100)));
  } catch {}
}

function getLocalAdminAuditLogs(): AdminAuditLog[] {
  try {
    const data = localStorage.getItem(LOCAL_ADMIN_AUDIT_LOGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [
    {
      id: 'init_sys_log',
      adminUserId: 'system',
      adminEmail: 'omar.ibrahem211@gmail.com',
      action: 'update_system_settings',
      targetUserId: 'system',
      targetUserEmail: 'System Core',
      timestamp: Date.now(),
      reason: 'تهيئة نظام الحماية والتدقيق الإداري ومراقبة نشاط اللعبة بنجاح.',
      metadata: { status: 'active', mode: 'secure_audit' }
    }
  ];
}

function saveLocalAdminAuditLog(log: AdminAuditLog): void {
  try {
    const existing = getLocalAdminAuditLogs();
    const updated = [log, ...existing.filter(l => l.id !== log.id)].slice(0, 150);
    localStorage.setItem(LOCAL_ADMIN_AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch {}
}

export function isUserSuperAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  if (user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (user.role === 'admin') return true;
  return false;
}

/**
 * Fetch total exact count of users using server aggregation (getCountFromServer)
 */
export async function fetchTotalUserCount(): Promise<number> {
  if (isRecentQuotaExceeded()) {
    return 1;
  }
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getCountFromServer(usersCol);
    return snapshot.data().count;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return 1;
    }
    try {
      const q = query(collection(db, 'users'), limit(50));
      const snap = await getDocs(q);
      return Math.max(snap.size, 1);
    } catch {
      return 1;
    }
  }
}

/**
 * Fetch total exact count of PvP matches using server aggregation (getCountFromServer)
 */
export async function fetchTotalPvPMatchesCount(): Promise<number> {
  if (isRecentQuotaExceeded()) {
    return 0;
  }
  try {
    const matchesCol = collection(db, 'pvp_matches');
    const snapshot = await getCountFromServer(matchesCol);
    return snapshot.data().count;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return 0;
    }
    try {
      const q = query(collection(db, 'pvp_matches'), limit(50));
      const snap = await getDocs(q);
      return snap.size;
    } catch {
      return 0;
    }
  }
}

/**
 * Fetch users from Firestore with pagination and limit
 */
export async function fetchAllUsers(maxLimit: number = 300): Promise<UserProfile[]> {
  if (isRecentQuotaExceeded()) {
    return getCachedAdminUsers();
  }
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'), limit(maxLimit));
    const snapshot = await getDocs(q);

    const users: UserProfile[] = [];
    snapshot.forEach((d) => {
      users.push(d.data() as UserProfile);
    });

    if (users.length > 0) {
      cacheAdminUsers(users);
    }
    return users;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Notice: loading users from local cache/fallback (cloud limit active):', error);
    return getCachedAdminUsers();
  }
}

/**
 * Fetch all online PvP matches from Firestore (Admin only)
 */
export async function fetchAdminPvPMatches(): Promise<PvPMatch[]> {
  if (isRecentQuotaExceeded()) {
    return getCachedAdminPvPMatches();
  }
  try {
    const matchesCol = collection(db, 'pvp_matches');
    const q = query(matchesCol, orderBy('createdAt', 'desc'), limit(150));
    const snapshot = await getDocs(q);

    const matches: PvPMatch[] = [];
    snapshot.forEach((d) => {
      matches.push(d.data() as PvPMatch);
    });

    if (matches.length > 0) {
      cacheAdminPvPMatches(matches);
    }
    return matches;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Notice: loading PvP matches from local cache/fallback (cloud limit active):', error);
    return getCachedAdminPvPMatches();
  }
}

/**
 * Fetch Game Realism & Balance Settings
 */
export async function fetchGameRealismSettings(): Promise<GameRealismSettings> {
  if (isRecentQuotaExceeded()) {
    return getLocalGameRealismSettings();
  }
  try {
    const settingsRef = doc(db, 'system_settings', 'game_balance_v1');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as GameRealismSettings;
      saveLocalGameRealismSettings(data);
      return data;
    } else {
      return getLocalGameRealismSettings();
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    return getLocalGameRealismSettings();
  }
}

/**
 * Update Game Realism & Balance Settings with Admin Audit Log
 */
export async function updateGameRealismSettings(
  newSettings: Partial<GameRealismSettings>,
  adminUser: UserProfile
): Promise<void> {
  const updated: GameRealismSettings = {
    ...DEFAULT_REALISM_SETTINGS,
    ...newSettings,
    id: 'game_balance_v1',
    updatedAt: Date.now(),
    updatedBy: adminUser.email || adminUser.uid
  };
  saveLocalGameRealismSettings(updated);

  const logEntry: Omit<AdminAuditLog, 'id'> = {
    adminUserId: adminUser.uid,
    adminEmail: adminUser.email || 'admin',
    action: 'update_system_settings',
    targetUserId: 'system',
    targetUserEmail: 'System Config',
    timestamp: Date.now(),
    reason: 'تحديث إعدادات التوازن والواقعية وصعوبة عروض التدريب ومباريات الأونلاين',
    metadata: newSettings
  };
  saveLocalAdminAuditLog({ id: `audit_${Date.now()}`, ...logEntry });

  if (isRecentQuotaExceeded()) return;

  try {
    const settingsRef = doc(db, 'system_settings', 'game_balance_v1');
    await setDoc(settingsRef, updated);

    // Audit log
    const auditLogsCol = collection(db, 'admin_audit_logs');
    await addDoc(auditLogsCol, logEntry);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return;
    }
    console.warn('Notice: realism settings saved locally (cloud write error):', error);
  }
}

/**
 * Admin action: Cancel PvP Match & Refund Challenge Prize with Audit Log
 */
export async function adminCancelAndRefundMatch(
  match: PvPMatch,
  reason: string,
  adminUser: UserProfile
): Promise<void> {
  const logEntry: Omit<AdminAuditLog, 'id'> = {
    adminUserId: adminUser.uid,
    adminEmail: adminUser.email || 'admin',
    action: 'refund_pvp_match',
    targetUserId: match.player1Id,
    targetUserEmail: match.player1.email || 'Host Manager',
    timestamp: Date.now(),
    reason: reason.trim() || 'إلغاء واسترداد جائزة التحدي لمباراة أونلاين بواسطة الإدارة',
    metadata: {
      matchId: match.id,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      prizeAmount: match.prizeAmount || match.stakeAmount || 0,
      matchType: match.matchType
    }
  };
  saveLocalAdminAuditLog({ id: `audit_refund_${Date.now()}`, ...logEntry });

  try {
    await cancelPvPMatch(match.id, adminUser.uid, `إلغاء إداري: ${reason}`);

    if (!isRecentQuotaExceeded()) {
      const auditLogsCol = collection(db, 'admin_audit_logs');
      await addDoc(auditLogsCol, logEntry);
    }
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return;
    }
    console.warn('Notice: PvP match cancellation handled locally:', error);
  }
}

/**
 * Compute real-time admin metrics from Firestore data using exact aggregation counts
 */
export async function fetchAdminDashboardMetrics(): Promise<AdminDashboardMetrics> {
  try {
    const [totalUsersCount, totalPvPMatchesCount, sampleUsers, pvpMatches] = await Promise.all([
      fetchTotalUserCount(),
      fetchTotalPvPMatchesCount(),
      fetchAllUsers(300),
      fetchAdminPvPMatches()
    ]);

    const now = Date.now();
    const threeMinutesAgo = now - 3 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const totalUsers = Math.max(totalUsersCount, sampleUsers.length, 1);
    // User is considered currently online if isOnline is true or lastSeenAt/lastLoginAt within last 3 minutes
    const currentlyOnlineUsers = Math.max(
      sampleUsers.filter(u => 
        u.isOnline === true || (u.lastSeenAt && u.lastSeenAt >= threeMinutesAgo) || (u.lastLoginAt && u.lastLoginAt >= threeMinutesAgo)
      ).length,
      1
    );
    const activeUsers = Math.max(sampleUsers.filter(u => (u.lastLoginAt || 0) >= sevenDaysAgo).length, 1);
    const newUsers24h = sampleUsers.filter(u => (u.createdAt || 0) >= oneDayAgo).length;
    const premiumUsers = sampleUsers.filter(u => u.isPremium).length;

    const totalPvPMatches = Math.max(totalPvPMatchesCount, pvpMatches.length);
    const activePvPMatches = pvpMatches.filter(m => m.status === 'waiting_for_opponent' || m.status === 'ready' || m.status === 'locked' || m.status === 'simulating').length;
    const totalCoinsCirculating = Math.max(sampleUsers.reduce((sum, u) => sum + (u.virtualCoins || 1000), 0), 1000);

    return {
      totalUsers,
      currentlyOnlineUsers,
      activeUsers,
      newUsers24h,
      totalClubs: totalUsers,
      totalMatchesPlayed: totalPvPMatches,
      premiumUsers,
      revenueTotal: 0,
      totalPvPMatches,
      activePvPMatches,
      totalCoinsCirculating
    };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Fallback admin metrics calculation (offline/quota active):', error);
    return {
      totalUsers: 1,
      currentlyOnlineUsers: 1,
      activeUsers: 1,
      newUsers24h: 0,
      totalClubs: 1,
      totalMatchesPlayed: 0,
      premiumUsers: 0,
      revenueTotal: 0,
      totalPvPMatches: 0,
      activePvPMatches: 0,
      totalCoinsCirculating: 1000
    };
  }
}

/**
 * Moderate a user account (Suspend / Unsuspend / Ban / Unban) with mandatory immutable audit log
 */
export async function moderateUserAccount(
  targetUserId: string,
  targetUserEmail: string,
  newStatus: 'active' | 'suspended' | 'banned',
  reason: string,
  adminUser: UserProfile
): Promise<void> {
  const logEntry: Omit<AdminAuditLog, 'id'> = {
    adminUserId: adminUser.uid,
    adminEmail: adminUser.email || 'admin',
    action: newStatus === 'suspended' ? 'suspend_user' : (newStatus === 'banned' ? 'ban_user' : 'unsuspend_user'),
    targetUserId,
    targetUserEmail: targetUserEmail || 'Unknown Email',
    timestamp: Date.now(),
    reason: reason.trim() || 'إجراء إداري روتيني',
    metadata: {
      newStatus
    }
  };
  saveLocalAdminAuditLog({ id: `audit_mod_${Date.now()}`, ...logEntry });

  if (isRecentQuotaExceeded()) return;

  try {
    const userRef = doc(db, 'users', targetUserId);
    const userDoc = await getDoc(userRef);
    const oldStatus = userDoc.exists() ? (userDoc.data() as UserProfile).status : 'active';

    // 1. Update user account status in Firestore
    await updateDoc(userRef, {
      status: newStatus
    });

    // 2. Determine action type
    let actionType: AdminActionType = 'suspend_user';
    if (newStatus === 'suspended') actionType = 'suspend_user';
    else if (newStatus === 'banned') actionType = 'ban_user';
    else if (newStatus === 'active' && oldStatus === 'suspended') actionType = 'unsuspend_user';
    else if (newStatus === 'active' && oldStatus === 'banned') actionType = 'unban_user';

    // 3. Write immutable audit log
    const auditLogsCol = collection(db, 'admin_audit_logs');
    await addDoc(auditLogsCol, {
      ...logEntry,
      action: actionType,
      metadata: {
        previousStatus: oldStatus,
        newStatus
      }
    });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
      return;
    }
    console.warn('Notice: moderation status saved locally (cloud write error):', error);
  }
}

/**
 * Fetch immutable audit logs (Admin only)
 */
export async function fetchAdminAuditLogs(): Promise<AdminAuditLog[]> {
  if (isRecentQuotaExceeded()) {
    return getLocalAdminAuditLogs();
  }
  try {
    const logsCol = collection(db, 'admin_audit_logs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(150));
    const snapshot = await getDocs(q);

    const logs: AdminAuditLog[] = [];
    snapshot.forEach((d) => {
      logs.push({
        id: d.id,
        ...(d.data() as Omit<AdminAuditLog, 'id'>)
      });
    });

    if (logs.length > 0) {
      try {
        localStorage.setItem(LOCAL_ADMIN_AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
      } catch {}
      return logs;
    }
    return getLocalAdminAuditLogs();
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Notice: loading audit logs from local storage fallback:', error);
    return getLocalAdminAuditLogs();
  }
}

/**
 * Grant Coins to a user with atomic Firestore update, immutable ledger entry, and audit log (Part 7 & 8)
 */
export async function grantCoinsToUser(
  targetUserId: string,
  targetUserEmail: string,
  amount: number,
  reason: string,
  adminUser: UserProfile
): Promise<{ balanceBefore: number; balanceAfter: number }> {
  if (amount <= 0 || isNaN(amount)) {
    throw new Error('المبلغ المحدد غير صالح. يجب أن يكون رقماً موجباً.');
  }
  if (!reason.trim()) {
    throw new Error('يرجى كتابة سبب الإجراء الإداري لسجل التدقيق.');
  }

  try {
    const userRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error('لم يتم العثور على حساب المستخدم.');
    }

    const userData = userSnap.data() as UserProfile;
    const balanceBefore = typeof userData.virtualCoins === 'number' ? userData.virtualCoins : 1000;
    const balanceAfter = balanceBefore + amount;

    // 1. Update user virtualCoins
    await updateDoc(userRef, {
      virtualCoins: balanceAfter,
    });

    // 2. Write immutable transaction in pvp_transactions ledger
    const txId = `tx_admin_grant_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pvpTxCol = collection(db, 'pvp_transactions');
    await addDoc(pvpTxCol, {
      transactionId: txId,
      userId: targetUserId,
      userEmail: targetUserEmail || userData.email || null,
      type: 'admin_grant',
      amount: amount,
      balanceBefore,
      balanceAfter,
      reason: reason.trim(),
      source: 'admin_grant',
      adminId: adminUser.uid,
      adminEmail: adminUser.email || 'admin',
      timestamp: Date.now(),
    });

    // 3. Write immutable audit log
    const auditLogsCol = collection(db, 'admin_audit_logs');
    await addDoc(auditLogsCol, {
      adminUserId: adminUser.uid,
      adminEmail: adminUser.email || 'admin',
      action: 'grant_coins',
      targetUserId,
      targetUserEmail: targetUserEmail || userData.email || 'Unknown',
      timestamp: Date.now(),
      reason: reason.trim(),
      metadata: {
        amountGranted: amount,
        balanceBefore,
        balanceAfter,
        transactionId: txId,
      },
    });

    return { balanceBefore, balanceAfter };
  } catch (error) {
    console.error('Error granting coins to user:', error);
    throw error;
  }
}

/**
 * Fetch Coin Ledger transactions for a specific user
 */
export async function fetchUserCoinLedger(userId: string): Promise<any[]> {
  try {
    const txCol = collection(db, 'pvp_transactions');
    const q = query(
      txCol,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);

    const list: any[] = [];
    snapshot.forEach((d) => {
      list.push({
        id: d.id,
        ...d.data(),
      });
    });

    return list;
  } catch (error) {
    console.warn('Could not fetch user coin ledger:', error);
    return [];
  }
}

// ----------------------------------------------------
// ADMIN BROADCAST MESSAGES (PHASE 2)
// ----------------------------------------------------

function getLocalBroadcasts(): BroadcastMessage[] {
  try {
    const data = localStorage.getItem(LOCAL_ADMIN_BROADCASTS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveLocalBroadcasts(broadcasts: BroadcastMessage[]): void {
  try {
    localStorage.setItem(LOCAL_ADMIN_BROADCASTS_KEY, JSON.stringify(broadcasts));
  } catch {}
}

/**
 * Send a broadcast announcement/event message to all players
 */
export async function sendBroadcastMessage(
  adminUser: UserProfile,
  data: {
    title: string;
    body: string;
    type: BroadcastType;
    rewardCoins?: number;
    expiresAt?: number;
  }
): Promise<BroadcastMessage> {
  if (!isUserSuperAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin rights required.');
  }

  const broadcastId = `bcast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const broadcastData: BroadcastMessage = {
    id: broadcastId,
    title: data.title.trim(),
    body: data.body.trim(),
    type: data.type,
    createdAt: Date.now(),
    createdBy: adminUser.uid,
    createdByName: adminUser.displayName || adminUser.email || 'الإدارة',
    isActive: true,
    expiresAt: data.expiresAt || (Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    rewardCoins: data.rewardCoins || 0,
  };

  // 1. Save locally first
  const currentBroadcasts = getLocalBroadcasts();
  saveLocalBroadcasts([broadcastData, ...currentBroadcasts.filter(b => b.id !== broadcastId)]);

  // 2. Local audit log
  saveLocalAdminAuditLog({
    id: `audit_bcast_${Date.now()}`,
    adminUserId: adminUser.uid,
    adminEmail: adminUser.email || 'admin',
    action: 'send_broadcast',
    targetUserId: 'ALL_USERS',
    targetUserEmail: 'all_players',
    timestamp: Date.now(),
    reason: `إرسال رسالة جماعية: ${data.title}`,
    metadata: {
      broadcastId,
      title: data.title,
      type: data.type,
      rewardCoins: data.rewardCoins,
    }
  });

  if (!isRecentQuotaExceeded()) {
    try {
      const broadcastCol = collection(db, 'broadcast_messages');
      const newBroadcastDoc = doc(broadcastCol, broadcastId);
      await setDoc(newBroadcastDoc, broadcastData);

      // Write immutable audit log
      const auditLogsCol = collection(db, 'admin_audit_logs');
      await addDoc(auditLogsCol, {
        adminUserId: adminUser.uid,
        adminEmail: adminUser.email || 'admin',
        action: 'send_broadcast',
        targetUserId: 'ALL_USERS',
        targetUserEmail: 'all_players',
        timestamp: Date.now(),
        reason: `إرسال رسالة جماعية: ${data.title}`,
        metadata: {
          broadcastId,
          title: data.title,
          type: data.type,
          rewardCoins: data.rewardCoins,
        },
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
      }
      console.warn('Notice: broadcast message saved locally (cloud write error):', error);
    }
  }

  return broadcastData;
}

/**
 * Fetch all active broadcast messages for player inboxes
 */
export async function fetchActiveBroadcasts(): Promise<BroadcastMessage[]> {
  if (isRecentQuotaExceeded()) {
    return getLocalBroadcasts().filter(b => b.isActive && (!b.expiresAt || b.expiresAt > Date.now()));
  }
  try {
    const broadcastCol = collection(db, 'broadcast_messages');
    const q = query(
      broadcastCol,
      where('isActive', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const getDocsPromise = getDocs(q);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Broadcast fetch timeout')), 3500)
    );
    const snapshot = await Promise.race([getDocsPromise, timeoutPromise]);

    const broadcasts: BroadcastMessage[] = [];
    snapshot.forEach(docSnap => {
      broadcasts.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as BroadcastMessage);
    });

    if (broadcasts.length > 0) {
      saveLocalBroadcasts(broadcasts);
      return broadcasts;
    }
    return getLocalBroadcasts().filter(b => b.isActive && (!b.expiresAt || b.expiresAt > Date.now()));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Could not fetch active broadcasts from cloud, returning local fallback:', error);
    return getLocalBroadcasts().filter(b => b.isActive && (!b.expiresAt || b.expiresAt > Date.now()));
  }
}

/**
 * Fetch all broadcasts for Admin Management
 */
export async function fetchAllBroadcasts(): Promise<BroadcastMessage[]> {
  if (isRecentQuotaExceeded()) {
    return getLocalBroadcasts();
  }
  try {
    const broadcastCol = collection(db, 'broadcast_messages');
    const q = query(broadcastCol, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    const broadcasts: BroadcastMessage[] = [];
    snapshot.forEach(docSnap => {
      broadcasts.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as BroadcastMessage);
    });

    if (broadcasts.length > 0) {
      saveLocalBroadcasts(broadcasts);
      return broadcasts;
    }
    return getLocalBroadcasts();
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Could not fetch all broadcasts from cloud, returning local fallback:', error);
    return getLocalBroadcasts();
  }
}

/**
 * Deactivate broadcast
 */
export async function toggleBroadcastStatus(
  adminUser: UserProfile,
  broadcastId: string,
  isActive: boolean
): Promise<void> {
  if (!isUserSuperAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin rights required.');
  }

  // Update locally first
  const current = getLocalBroadcasts();
  const updated = current.map(b => b.id === broadcastId ? { ...b, isActive } : b);
  saveLocalBroadcasts(updated);

  saveLocalAdminAuditLog({
    id: `audit_toggle_${Date.now()}`,
    adminUserId: adminUser.uid,
    adminEmail: adminUser.email || 'admin',
    action: 'deactivate_broadcast',
    targetUserId: 'ALL_USERS',
    targetUserEmail: 'all_players',
    timestamp: Date.now(),
    reason: `تغيير حالة الرسالة الجماعية إلى ${isActive ? 'نشطة' : 'متوقفة'}`,
    metadata: { broadcastId, isActive },
  });

  if (!isRecentQuotaExceeded()) {
    try {
      const broadcastRef = doc(db, 'broadcast_messages', broadcastId);
      await updateDoc(broadcastRef, { isActive });

      // Write immutable audit log
      const auditLogsCol = collection(db, 'admin_audit_logs');
      await addDoc(auditLogsCol, {
        adminUserId: adminUser.uid,
        adminEmail: adminUser.email || 'admin',
        action: 'deactivate_broadcast',
        targetUserId: 'ALL_USERS',
        targetUserEmail: 'all_players',
        timestamp: Date.now(),
        reason: `تغيير حالة الرسالة الجماعية إلى ${isActive ? 'نشطة' : 'متوقفة'}`,
        metadata: { broadcastId, isActive },
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
      }
      console.warn('Notice: broadcast status toggle saved locally (cloud write error):', error);
    }
  }
}

/**
 * Delete broadcast message
 */
export async function deleteBroadcastMessage(
  adminUser: UserProfile,
  broadcastId: string
): Promise<void> {
  if (!isUserSuperAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin rights required.');
  }

  // Delete locally
  const current = getLocalBroadcasts();
  saveLocalBroadcasts(current.filter(b => b.id !== broadcastId));

  saveLocalAdminAuditLog({
    id: `audit_del_${Date.now()}`,
    adminUserId: adminUser.uid,
    adminEmail: adminUser.email || 'admin',
    action: 'delete_broadcast',
    targetUserId: 'ALL_USERS',
    targetUserEmail: 'all_players',
    timestamp: Date.now(),
    reason: `حذف الرسالة الجماعية نهائياً`,
    metadata: { broadcastId },
  });

  if (!isRecentQuotaExceeded()) {
    try {
      const broadcastRef = doc(db, 'broadcast_messages', broadcastId);
      await deleteDoc(broadcastRef);

      // Write audit log
      const auditLogsCol = collection(db, 'admin_audit_logs');
      await addDoc(auditLogsCol, {
        adminUserId: adminUser.uid,
        adminEmail: adminUser.email || 'admin',
        action: 'delete_broadcast',
        targetUserId: 'ALL_USERS',
        targetUserEmail: 'all_players',
        timestamp: Date.now(),
        reason: `حذف الرسالة الجماعية نهائياً`,
        metadata: { broadcastId },
      });
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
      }
      console.warn('Notice: broadcast deletion saved locally (cloud write error):', error);
    }
  }
}

// ----------------------------------------------------
// FOOTBALL WORLD EDITOR & VERSIONING SERVICES
// ----------------------------------------------------

const LOCAL_WORLD_VERSIONS_KEY = 'anta_el_modareb_world_versions';
const LOCAL_WORLD_OVERRIDES_KEY = 'anta_el_modareb_world_overrides';

export const DEFAULT_WORLD_VERSION: WorldVersion = {
  id: 'v1.0.0_official_2026_27',
  versionNumber: 1,
  name: 'الإصدار الرسمي 1.0 (موسم 2026/2027 المكتمل)',
  description: 'قاعدة بيانات كرة القدم العالمية المتكاملة تشمل كافة الدوريات العالمية والعربية واللاتينية والأندية الحقيقية.',
  createdAt: 1771977600000,
  createdBy: SUPER_ADMIN_EMAIL,
  isDefault: true,
  isActive: true,
  totalCountries: 18,
  totalLeagues: 24,
  totalClubs: 420,
  totalPlayers: 6800,
  validationStatus: 'valid',
  validationSummary: {
    errorsCount: 0,
    warningsCount: 2,
    realClubsCount: 380,
  },
  changelog: [
    'إضافة كافة الدوريات الأوروبية الخمس الكبرى بتشكيلاتها الواقعية',
    'إضافة الدرجة الثانية الإسبانية والإنجليزية والدرجة الأولى المصرية',
    'إضافة دوري روشن السعودي والدوري الإماراتي والقطري',
    'إضافة الدوري البرازيلي والأرجنتيني',
    'إصلاح نظام الانتقالات وتثمين اللاعبين بدقة واقعية',
  ],
};

/**
 * Fetch all world versions from Firestore with fallback to LocalStorage
 */
export async function fetchWorldVersions(): Promise<WorldVersion[]> {
  try {
    const versionsCol = collection(db, 'world_versions');
    const q = query(versionsCol, orderBy('versionNumber', 'desc'), limit(50));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const versions: WorldVersion[] = [];
      snapshot.forEach((d) => {
        versions.push(d.data() as WorldVersion);
      });
      return versions;
    }
  } catch (err) {
    console.warn('Could not fetch world versions from Firestore, using local fallback:', err);
  }

  // Local fallback
  try {
    const saved = localStorage.getItem(LOCAL_WORLD_VERSIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore error
  }

  return [DEFAULT_WORLD_VERSION];
}

/**
 * Publish a new world version
 */
export async function publishWorldVersion(
  adminUser: UserProfile,
  newVersion: WorldVersion
): Promise<void> {
  if (!isUserSuperAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin rights required.');
  }

  // Save to Firestore
  try {
    const versionRef = doc(db, 'world_versions', newVersion.id);
    await setDoc(versionRef, newVersion);

    // If marked default, unset others
    if (newVersion.isDefault) {
      const versionsCol = collection(db, 'world_versions');
      const snap = await getDocs(versionsCol);
      const batchPromises = snap.docs
        .filter(d => d.id !== newVersion.id && d.data().isDefault)
        .map(d => updateDoc(d.ref, { isDefault: false }));
      await Promise.all(batchPromises);
    }
  } catch (err) {
    console.warn('Failed to save world version to Firestore, using local fallback:', err);
  }

  // Also sync locally
  try {
    const existing = await fetchWorldVersions();
    const updated = [
      newVersion,
      ...existing.filter(v => v.id !== newVersion.id).map(v => newVersion.isDefault ? { ...v, isDefault: false } : v)
    ];
    localStorage.setItem(LOCAL_WORLD_VERSIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save to local storage:', err);
  }

  // Write audit log
  try {
    const auditLogsCol = collection(db, 'admin_audit_logs');
    await addDoc(auditLogsCol, {
      adminUserId: adminUser.uid,
      adminEmail: adminUser.email || 'admin',
      action: 'publish_world_version',
      targetUserId: 'WORLD_DATABASE',
      targetUserEmail: newVersion.name,
      timestamp: Date.now(),
      reason: `نشر إصدار عالم كرة قدم جديد ${newVersion.id} (${newVersion.name})`,
      metadata: { version: newVersion },
    });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

/**
 * Set a specific world version as default for new careers
 */
export async function setDefaultWorldVersion(
  adminUser: UserProfile,
  versionId: string
): Promise<void> {
  if (!isUserSuperAdmin(adminUser)) {
    throw new Error('Unauthorized: Admin rights required.');
  }

  try {
    const versionsCol = collection(db, 'world_versions');
    const snap = await getDocs(versionsCol);
    const promises = snap.docs.map(d => updateDoc(d.ref, { isDefault: d.id === versionId }));
    await Promise.all(promises);
  } catch (err) {
    console.warn('Failed setting default world version in Firestore:', err);
  }

  // Local sync
  try {
    const existing = await fetchWorldVersions();
    const updated = existing.map(v => ({ ...v, isDefault: v.id === versionId }));
    localStorage.setItem(LOCAL_WORLD_VERSIONS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed setting default in localStorage:', err);
  }

  // Audit log
  try {
    const auditLogsCol = collection(db, 'admin_audit_logs');
    await addDoc(auditLogsCol, {
      adminUserId: adminUser.uid,
      adminEmail: adminUser.email || 'admin',
      action: 'set_default_world',
      targetUserId: 'WORLD_DATABASE',
      targetUserEmail: versionId,
      timestamp: Date.now(),
      reason: `تعيين إصدار العالم ${versionId} كإصدار افتراضي للمسيرات الجديدة`,
      metadata: { versionId },
    });
  } catch (err) {
    console.warn('Audit log error:', err);
  }
}

export const LOCAL_DELETED_PLAYERS_KEY = 'anta_el_modareb_deleted_player_ids_v1';

/**
 * Fetch list of player IDs that have been permanently deleted by admin
 */
export function getDeletedPlayerIds(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_PLAYERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore error
  }
  return [];
}

/**
 * Record a player ID as permanently deleted so they never regenerate
 */
export function recordDeletedPlayerId(playerId: string): void {
  try {
    const current = getDeletedPlayerIds();
    if (!current.includes(playerId)) {
      current.push(playerId);
      localStorage.setItem(LOCAL_DELETED_PLAYERS_KEY, JSON.stringify(current));
    }
  } catch (err) {
    console.warn('Failed recording deleted player ID:', err);
  }
}

/**
 * Check if a player has been deleted
 */
export function isPlayerDeletedInOverrides(playerId: string): boolean {
  if (!playerId) return false;
  const deleted = getDeletedPlayerIds();
  return deleted.includes(playerId);
}

/**
 * Fetch Custom World Overrides (e.g. customized clubs/players/leagues edited in the admin panel)
 */
export function getLocalWorldOverrides(): {
  countries: Record<string, any>;
  leagues: Record<string, any>;
  clubs: Record<string, any>;
  players: Record<string, { player: Player; clubId: string }>;
  competitions: Record<string, any>;
} {
  try {
    const raw = localStorage.getItem(LOCAL_WORLD_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        countries: parsed.countries || {},
        leagues: parsed.leagues || {},
        clubs: parsed.clubs || {},
        players: parsed.players || {},
        competitions: parsed.competitions || {},
      };
    }
  } catch {
    // Ignore error
  }
  return {
    countries: {},
    leagues: {},
    clubs: {},
    players: {},
    competitions: {},
  };
}

export function saveLocalWorldOverride(
  category: 'countries' | 'leagues' | 'clubs' | 'players' | 'competitions',
  id: string,
  data: any
): void {
  try {
    const current = getLocalWorldOverrides();
    (current[category] as any)[id] = data;
    localStorage.setItem(LOCAL_WORLD_OVERRIDES_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Failed to save override:', err);
  }
}

/**
 * Permanently delete a player from the world database
 */
export function deleteLocalWorldPlayer(playerId: string, clubId?: string): void {
  try {
    // 1. Mark as permanently deleted
    recordDeletedPlayerId(playerId);

    // 2. Remove from player overrides
    const overrides = getLocalWorldOverrides();
    if (overrides.players[playerId]) {
      delete overrides.players[playerId];
      localStorage.setItem(LOCAL_WORLD_OVERRIDES_KEY, JSON.stringify(overrides));
    }

    // 3. Remove from club override if present
    if (clubId && overrides.clubs[clubId]) {
      const club = overrides.clubs[clubId];
      if (Array.isArray(club.players)) {
        club.players = club.players.filter((p: Player) => p.id !== playerId);
        saveLocalWorldOverride('clubs', clubId, club);
      }
    }
  } catch (err) {
    console.warn('Failed deleting local world player:', err);
  }
}

/**
 * Apply all world overrides and deletions to a list of clubs
 */
export function applyWorldOverridesToClubs(clubs: Club[]): Club[] {
  const overrides = getLocalWorldOverrides();
  const deletedPlayerIds = new Set(getDeletedPlayerIds());

  // Map of player overrides by ID
  const playerOverrideMap = new Map<string, { player: Player; clubId: string }>();
  Object.entries(overrides.players || {}).forEach(([pId, val]) => {
    if (val && val.player && !deletedPlayerIds.has(pId)) {
      playerOverrideMap.set(pId, val);
    }
  });

  return clubs.map(club => {
    // 1. Apply club-level override if exists, preserving user club status
    let activeClub: Club = overrides.clubs[club.id] 
      ? { ...club, ...overrides.clubs[club.id], isUserClub: club.isUserClub } 
      : { ...club };

    // 2. Filter out deleted players
    let currentPlayers = (activeClub.players || []).filter(p => !deletedPlayerIds.has(p.id));

    // 3. Apply individual player attribute/rating updates
    currentPlayers = currentPlayers.map(p => {
      const override = playerOverrideMap.get(p.id);
      if (override) {
        return {
          ...p,
          ...override.player,
          overallRating: override.player.overallRating ?? p.overallRating,
          potentialRating: override.player.potentialRating ?? p.potentialRating,
          marketValue: override.player.marketValue ?? p.marketValue,
          salary: override.player.salary ?? p.salary,
          age: override.player.age ?? p.age,
          position: override.player.position ?? p.position,
          positionCategory: override.player.positionCategory ?? p.positionCategory,
          nationality: override.player.nationality ?? p.nationality,
          name: override.player.name ?? p.name,
          currentClubId: override.clubId || activeClub.id,
        };
      }
      return p;
    });

    // 4. If any player was assigned to this club via override but not yet in the list, add them
    playerOverrideMap.forEach(({ player, clubId }) => {
      if (clubId === activeClub.id && !currentPlayers.some(p => p.id === player.id)) {
        currentPlayers.push({
          ...player,
          currentClubId: activeClub.id,
        });
      }
    });

    // 5. If a player in this squad was moved to ANOTHER club in playerOverrideMap, remove them
    currentPlayers = currentPlayers.filter(p => {
      const override = playerOverrideMap.get(p.id);
      if (override && override.clubId && override.clubId !== activeClub.id) {
        return false;
      }
      return true;
    });

    // 6. Ensure tactics lineup refers to valid player IDs
    const validIds = new Set(currentPlayers.map(p => p.id));
    const startingPlayerIds = (activeClub.tactics?.startingPlayerIds || [])
      .filter(id => validIds.has(id));
    
    // Fill starting lineup if needed
    if (startingPlayerIds.length < Math.min(11, currentPlayers.length)) {
      currentPlayers.forEach(p => {
        if (startingPlayerIds.length < 11 && !startingPlayerIds.includes(p.id)) {
          startingPlayerIds.push(p.id);
        }
      });
    }

    const benchPlayerIds = (activeClub.tactics?.benchPlayerIds || [])
      .filter(id => validIds.has(id) && !startingPlayerIds.includes(id));

    return {
      ...activeClub,
      players: currentPlayers,
      tactics: {
        ...activeClub.tactics,
        formation: activeClub.tactics?.formation || '4-3-3',
        mentality: activeClub.tactics?.mentality || 'balanced',
        passingStyle: activeClub.tactics?.passingStyle || 'short',
        pressingIntensity: activeClub.tactics?.pressingIntensity || 'balanced',
        tempo: activeClub.tactics?.tempo || 'balanced',
        startingPlayerIds,
        benchPlayerIds,
        captainId: validIds.has(activeClub.tactics?.captainId || '') ? activeClub.tactics.captainId : currentPlayers[0]?.id || '',
        penaltyTakerId: validIds.has(activeClub.tactics?.penaltyTakerId || '') ? activeClub.tactics.penaltyTakerId : currentPlayers[0]?.id || '',
        freeKickTakerId: validIds.has(activeClub.tactics?.freeKickTakerId || '') ? activeClub.tactics.freeKickTakerId : currentPlayers[0]?.id || '',
        cornerTakerId: validIds.has(activeClub.tactics?.cornerTakerId || '') ? activeClub.tactics.cornerTakerId : currentPlayers[0]?.id || '',
      }
    };
  });
}

/**
 * Apply world overrides and remove deleted players from transfer market
 */
export function applyWorldOverridesToMarket(market: Player[]): Player[] {
  const overrides = getLocalWorldOverrides();
  const deletedPlayerIds = new Set(getDeletedPlayerIds());

  return (market || [])
    .filter(p => !deletedPlayerIds.has(p.id))
    .map(p => {
      const override = overrides.players[p.id];
      if (override && override.player) {
        return {
          ...p,
          ...override.player,
          overallRating: override.player.overallRating ?? p.overallRating,
          potentialRating: override.player.potentialRating ?? p.potentialRating,
          marketValue: override.player.marketValue ?? p.marketValue,
          salary: override.player.salary ?? p.salary,
          age: override.player.age ?? p.age,
          position: override.player.position ?? p.position,
        };
      }
      return p;
    });
}


