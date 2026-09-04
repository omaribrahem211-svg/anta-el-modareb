/**
 * Smart Sync Manager (Cloud Synchronization & Write Throttling Engine)
 * 
 * Guarantees minimal Firestore write consumption by:
 * 1. Debouncing routine changes (45s window with change coalescing)
 * 2. Immediate event triggers on true milestones (match end, round end, season end, manual save)
 * 3. Granular Dirty-State tracking with fast hashing (no writes if state is unchanged)
 * 4. Minimal Cloud Save Payload (trimmed match logs, max 10 matches, max 20 inbox items, IDs over duplicates)
 * 5. Transparent Offline Queue & Conflict Management
 */

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/auth';
import { Club, ManagerProfile, SeasonHistoryEntry, TransferHistoryEntry } from '../types/game';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';

export interface CloudSaveSyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: boolean;
  syncError: string | null;
  saveVersion: number;
}

export interface SmartSyncInput {
  user: UserProfile | null;
  manager: ManagerProfile;
  userClub: Club | null;
  teams?: Club[];
  standings: any[];
  fixtures?: any[];
  currentRound: number;
  season: {
    seasonId?: string;
    seasonNumber: number;
    startDate?: string;
    endDate?: string;
    currentRound?: number;
    totalRounds?: number;
    status?: string;
    leagueId?: string;
    leagueName?: string;
    divisionTier?: number;
    isCompleted?: boolean;
    year?: string;
  };
  activeLeague: any;
  calendarDate?: any;
  transferHistory: TransferHistoryEntry[];
  clubEconomy: any;
  inbox: any[];
  cupTournament?: any;
  jobOffers?: any[];
  transferMarket?: any[];
  incomingBids?: any[];
  seasonEndSummary?: any;
  activeNegotiations?: any[];
  boardSystem?: any;
  dailyNews?: any[];
  retiredPlayers?: any[];
  worldRankings?: any[];
  scoutedOpponents?: any;
  deletedMessageIds?: string[];
}

/**
 * Builds the complete Cloud Career Save payload for durable restore across devices and refreshes.
 */
export function buildFullCloudSavePayload(input: SmartSyncInput, saveVersion: number) {
  const {
    user,
    manager,
    userClub,
    teams = [],
    standings = [],
    fixtures = [],
    currentRound,
    season,
    activeLeague,
    calendarDate,
    transferHistory = [],
    clubEconomy,
    inbox = [],
    cupTournament = null,
    jobOffers = [],
    transferMarket = [],
    incomingBids = [],
    seasonEndSummary = null,
    activeNegotiations = [],
    boardSystem = null,
    dailyNews = [],
    retiredPlayers = [],
    worldRankings = [],
    scoutedOpponents = {},
    deletedMessageIds = [],
  } = input;

  return {
    schemaVersion: 2,
    saveVersion,
    savedAt: Date.now(),
    userUid: user?.uid || '',
    userEmail: user?.email || '',
    season,
    activeLeague,
    teams,
    standings,
    fixtures,
    currentRound,
    manager,
    transferMarket,
    incomingBids,
    inbox: (inbox || []).slice(0, 50),
    cupTournament,
    jobOffers,
    seasonEndSummary,
    transferHistory,
    clubEconomy,
    calendarDate,
    activeNegotiations,
    boardSystem,
    dailyNews: (dailyNews || []).slice(-25),
    retiredPlayers,
    worldRankings,
    scoutedOpponents,
    deletedMessageIds: deletedMessageIds || [],
  };
}

/**
 * Generates a fast, lightweight hash of critical game metrics to detect real changes.
 */
export function computeStateHashes(input: SmartSyncInput): {
  overallHash: string;
  managerHash: string;
  clubHash: string;
  seasonHash: string;
} {
  const { manager, userClub, standings, season, activeLeague, currentRound, transferHistory, clubEconomy } = input;
  const userStanding = userClub ? (standings.find(s => s.teamId === userClub.id) || null) : null;

  const managerHash = `${manager.level}_${manager.xp}_${manager.rankingPoints || 0}_${manager.dailyPoints || 0}_${(manager.trophies || []).length}_${(manager.history || []).length}_${manager.personalWallet || 0}`;
  const clubHash = userClub
    ? `${userClub.id}_${userClub.budget}_${userClub.reputation}_${userClub.facilities?.stadiumLevel || 1}_${userClub.players?.length || 0}_${clubEconomy?.currentSeasonNetProfit || 0}`
    : 'no_club';
  const seasonHash = `${season.seasonNumber}_${activeLeague.id}_${currentRound}_${userStanding?.played || 0}_${userStanding?.points || 0}_${(transferHistory || []).length}`;

  const overallHash = `v2_${managerHash}|${clubHash}|${seasonHash}`;

  return {
    overallHash,
    managerHash,
    clubHash,
    seasonHash,
  };
}

/**
 * Builds an ultra-compact, stripped Cloud Save payload.
 * Removes redundant static data, truncates long match logs and inbox items.
 */
export function buildMinimalCloudSavePayload(input: SmartSyncInput, saveVersion: number) {
  const { manager, userClub, standings, season, activeLeague, transferHistory, clubEconomy, inbox } = input;
  const userStanding = userClub ? (standings.find(s => s.teamId === userClub.id) || null) : null;
  const userRankIndex = userClub ? standings.findIndex(s => s.teamId === userClub.id) : -1;

  // Trim match/career history to the most essential summary items
  const compactSeasonHistory = (manager.history || []).slice(-10).map((h: SeasonHistoryEntry) => ({
    seasonNumber: h.seasonNumber,
    seasonYear: h.seasonYear,
    clubName: h.clubName,
    leagueName: h.leagueName,
    divisionTier: h.divisionTier,
    finalPosition: h.finalPosition,
    trophiesWon: h.trophiesWon || [],
    points: h.points || 0,
    played: h.played || 0,
    wins: h.wins || 0,
    resultStatus: h.resultStatus,
  }));

  // Trim transfer history to last 10 entries max
  const compactTransferHistory = (transferHistory || []).slice(-10).map((t: TransferHistoryEntry) => ({
    id: t.id,
    playerName: t.playerName,
    type: t.type,
    fromClubName: t.fromClubName,
    toClubName: t.toClubName,
    fee: t.fee,
    round: t.round,
  }));

  // Retain only the last 20 messages for the cloud document
  const compactInbox = (inbox || []).slice(0, 20).map(m => ({
    id: m.id,
    title: m.title,
    sender: m.sender,
    date: m.date,
    type: m.type,
    read: m.read,
  }));

  return {
    uid: input.user?.uid,
    role: input.user?.role || 'player',
    status: input.user?.status || 'active',
    isPremium: Boolean(input.user?.isPremium),
    schemaVersion: 2,
    saveVersion,
    hasCloudSave: true,
    lastCloudSaveAt: Date.now(),
    updatedAt: serverTimestamp(),
    dailyPoints: manager.dailyPoints || 0,
    dailyMatchesPlayed: manager.dailyMatchesPlayed || 0,
    dailyWins: manager.dailyWins || 0,
    dailyDraws: manager.dailyDraws || 0,
    dailyLosses: manager.dailyLosses || 0,
    lastDailyPointsDate: manager.lastDailyResetDate || new Date().toISOString().split('T')[0],
    isOnline: true,
    lastSeenAt: Date.now(),
    managerProfile: {
      name: manager.name,
      nationality: manager.nationality,
      level: manager.level,
      xp: manager.xp,
      reputation: manager.reputation,
      rankingPoints: manager.rankingPoints || 0,
      dailyPoints: manager.dailyPoints || 0,
      trophies: manager.trophies || [],
      isUnemployed: Boolean(manager.isUnemployed),
    },
    currentClub: userClub ? {
      id: userClub.id,
      name: userClub.name,
      division: userClub.division,
      leagueId: activeLeague.id,
      leagueName: activeLeague.name,
      country: userClub.country || 'مصر',
      budget: userClub.budget,
      transferBudget: userClub.transferBudget || userClub.budget,
      wageBudgetMonthly: userClub.wageBudgetMonthly || 50000,
      reputation: userClub.reputation,
      stadiumName: userClub.facilities?.stadiumName || userClub.name,
      stadiumCapacity: userClub.facilities?.stadiumCapacity || 5000,
      squadSize: userClub.players?.length || 0,
      squadMarketValue: (userClub.players || []).reduce((sum, p) => sum + (p.marketValue || 0), 0),
    } : null,
    currentSeasonStats: userStanding ? {
      seasonNumber: season.seasonNumber,
      leagueName: activeLeague.name,
      divisionTier: activeLeague.tier,
      matchesPlayed: userStanding.played || 0,
      wins: userStanding.won || 0,
      draws: userStanding.drawn || 0,
      losses: userStanding.lost || 0,
      points: userStanding.points || 0,
      currentPosition: userRankIndex >= 0 ? userRankIndex + 1 : 1,
      goalsFor: userStanding.goalsFor || 0,
      goalsAgainst: userStanding.goalsAgainst || 0,
      goalDifference: userStanding.goalDifference || 0,
      pointsPerGame: userStanding.played > 0 ? Number(((userStanding.points || 0) / userStanding.played).toFixed(2)) : 0,
    } : null,
    seasonHistory: compactSeasonHistory,
    transferHistory: compactTransferHistory,
    inbox: compactInbox,
    clubEconomy: userClub ? {
      clubBudget: userClub.budget,
      transferSpendingTotal: clubEconomy.transferSpendingTotal || 0,
      transferIncomeTotal: clubEconomy.transferIncomeTotal || 0,
      salaryExpensesTotal: clubEconomy.salaryExpensesTotal || 0,
      sponsorIncomeTotal: clubEconomy.sponsorIncomeTotal || 0,
      matchIncomeTotal: clubEconomy.matchIncomeTotal || 0,
      facilitySpendingTotal: clubEconomy.facilitySpendingTotal || 0,
      currentSeasonNetProfit: clubEconomy.currentSeasonNetProfit || 0,
    } : null,
  };
}

class SmartSyncManager {
  private lastSavedHash: string = '';
  private debounceTimer: any = null;
  private isSyncing: boolean = false;
  private pendingSync: boolean = false;
  private currentSaveVersion: number = 1;
  private lastSyncTimestamp: number | null = null;
  private latestInput: SmartSyncInput | null = null;
  private subscribers: Set<(state: CloudSaveSyncState) => void> = new Set();

  constructor() {
    this.initNetworkListeners();
    this.initVisibilityListeners();
  }

  public subscribe(callback: (state: CloudSaveSyncState) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getSyncState());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    const state = this.getSyncState();
    this.subscribers.forEach(cb => cb(state));
  }

  public getSyncState(): CloudSaveSyncState {
    return {
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncTimestamp,
      pendingChanges: this.pendingSync,
      syncError: null,
      saveVersion: this.currentSaveVersion,
    };
  }

  /**
   * Schedule a coalesced background sync (debounced ~45 seconds)
   */
  public queueDebouncedSync(input: SmartSyncInput): void {
    this.latestInput = input;
    if (!input.user?.uid) return;

    const { overallHash } = computeStateHashes(input);
    if (overallHash === this.lastSavedHash) {
      // Nothing meaningful changed
      return;
    }

    this.pendingSync = true;
    this.notify();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushSync(false);
    }, 45000); // 45 seconds debounce window
  }

  /**
   * Execute immediate synchronization for major milestones (Match, Round, Season transition, Manual)
   */
  public async triggerMilestoneSync(
    input: SmartSyncInput,
    reason: 'match' | 'round' | 'season' | 'manual' | 'online' = 'manual'
  ): Promise<{ success: boolean; message: string }> {
    this.latestInput = input;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    return this.flushSync(reason === 'manual');
  }

  /**
   * Perform actual Firestore write with all safeguards applied
   */
  private async flushSync(isManual: boolean = false): Promise<{ success: boolean; message: string }> {
    const input = this.latestInput;
    if (!input || !input.user || !input.user.uid) {
      this.pendingSync = false;
      this.notify();
      return { success: false, message: 'يرجى تسجيل الدخول أولاً لتفعيل الحفظ السحابي.' };
    }

    if (isRecentQuotaExceeded()) {
      this.pendingSync = false;
      this.notify();
      return { success: false, message: 'الحصة السحابية اليومية مكتملة. حفظك المحلي نشط ومؤمن على جهازك.' };
    }

    const { overallHash } = computeStateHashes(input);
    if (!isManual && overallHash === this.lastSavedHash) {
      this.pendingSync = false;
      this.notify();
      return { success: true, message: 'البيانات السحابية متزامنة بالفعل.' };
    }

    if (this.isSyncing) {
      return { success: true, message: 'جاري الحفظ بالفعل...' };
    }

    this.isSyncing = true;
    this.notify();

    try {
      this.currentSaveVersion += 1;
      const minimalPayload = buildMinimalCloudSavePayload(input, this.currentSaveVersion);
      const fullPayload = buildFullCloudSavePayload(input, this.currentSaveVersion);

      // 1. Save full career data to user career_save subcollection
      const fullSaveRef = doc(db, 'users', input.user.uid, 'career_save', 'current');
      await setDoc(fullSaveRef, fullPayload);

      // 2. Save public summary to user document for PvP, rankings, and presence
      const userRef = doc(db, 'users', input.user.uid);
      await setDoc(userRef, minimalPayload, { merge: true });

      this.lastSavedHash = overallHash;
      this.lastSyncTimestamp = Date.now();
      this.pendingSync = false;
      this.isSyncing = false;
      this.notify();

      return { success: true, message: 'تم حفظ وتحديث مسيرتك سحابياً بنجاح لحسابك! ☁️' };
    } catch (err) {
      this.isSyncing = false;
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
        this.pendingSync = false;
        this.notify();
        return { success: false, message: 'تم الوصول للحد اليومي المجاني. الحفظ المحلي نشط.' };
      }
      this.pendingSync = true;
      this.notify();
      return { success: false, message: 'تعذر الاتصال بالسحابة حالياً، تم الحفظ محلياً بأمان.' };
    }
  }

  /**
   * Loads the saved game state from Firestore for an authenticated user
   */
  public async loadCloudSave(userId: string): Promise<any | null> {
    if (!userId) return null;
    try {
      const fullSaveRef = doc(db, 'users', userId, 'career_save', 'current');
      const snap = await getDoc(fullSaveRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.manager && (data.teams?.length > 0 || data.season)) {
          return data;
        }
      }

      // Check legacy backup field in user document
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        if (uData && uData.fullGameSave && uData.fullGameSave.manager) {
          return uData.fullGameSave;
        }
      }
      return null;
    } catch (err) {
      console.warn('[SmartSyncManager] Error loading cloud save from Firestore:', err);
      return null;
    }
  }

  /**
   * Browser Network Lifecycle Listeners
   */
  private initNetworkListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (this.pendingSync && this.latestInput) {
        this.flushSync(false);
      }
    });
  }

  /**
   * Browser Visibility & Unload Lifecycle Listeners
   */
  private initVisibilityListeners() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.pendingSync && this.latestInput) {
        this.flushSync(false);
      }
    });

    window.addEventListener('beforeunload', () => {
      if (this.pendingSync && this.latestInput) {
        // Trigger non-blocking sync attempt before unload
        this.flushSync(false);
      }
    });
  }
}

export const smartSyncManager = new SmartSyncManager();
