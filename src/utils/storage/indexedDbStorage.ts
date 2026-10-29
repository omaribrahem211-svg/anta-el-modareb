/**
 * IndexedDB Storage & Safe Storage Engine using idb-keyval
 *
 * Provides:
 * 1. Asynchronous, high-capacity IndexedDB storage (via idb-keyval).
 * 2. Automatic In-Memory Fallback (Map) when IndexedDB or localStorage is unavailable or hits QuotaExceededError.
 * 3. Safe localStorage wrappers (safeLocalStorageSet / Get / Remove) that never throw or trigger blocking alerts.
 * 4. Data Pruning utilities to strip minute-by-minute commentary, tactical timelines, and stale round logs
 *    before persisting save states.
 */

import { get, set, del } from 'idb-keyval';
import { WorldState } from '../../types/worldState';
import {
  Fixture,
  MatchEvent,
  CupTournament,
  ContinentalTournament,
} from '../../types/game';

export const IDB_WORLD_STATE_KEY = 'anta_universe_world_state_v1';
export const IDB_SAVE_METADATA_KEY = 'anta_universe_metadata_v1';
export const IDB_ACTIVE_LIVE_MATCH_KEY = 'anta_active_live_match_v1';
export const IDB_CONT_CACHE_PREFIX = 'anta_cont_cache_v1_';
export const LEGACY_STORAGE_PREFIX = 'anta_el_modareb_save_v1';

/**
 * In-Memory Fallback Store (Map)
 * Guarantees the game continues running smoothly in RAM if browser storage quota is exceeded or restricted.
 */
const memoryFallbackStore = new Map<string, any>();

/**
 * List of heavy legacy localStorage suffixes that must be evicted from localStorage
 * and stored exclusively in IndexedDB + memoryFallbackStore.
 */
const HEAVY_LOCAL_STORAGE_SUFFIXES = [
  '_active_live_match',
  '_teams',
  '_fixtures',
  '_transferMarket',
  '_transferHistory',
  '_cupTournament',
  '_africanChampionsLeague',
  '_seasonArchives',
  '_retiredPlayers',
  '_worldRankings',
  '_scoutedOpponents',
  '_dailyNews',
  '_inbox',
];

/**
 * Evicts heavy/bloated keys from localStorage to free up the 5MB WebView quota immediately.
 */
export function evictHeavyLocalStorageKeys(prefix: string = LEGACY_STORAGE_PREFIX): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    for (const suffix of HEAVY_LOCAL_STORAGE_SUFFIXES) {
      const fullKey = `${prefix}${suffix}`;
      const existing = window.localStorage.getItem(fullKey);
      if (existing !== null) {
        memoryFallbackStore.set(fullKey, existing);
        window.localStorage.removeItem(fullKey);
      }
    }

    // Also remove any cached continental or season snapshot keys in localStorage
    const allKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) allKeys.push(k);
    }

    for (const k of allKeys) {
      if (
        k.startsWith(`${prefix}_contCache_`) ||
        k.startsWith(`${prefix}_season_`) ||
        k.endsWith('_active_live_match')
      ) {
        const val = window.localStorage.getItem(k);
        if (val !== null) {
          memoryFallbackStore.set(k, val);
        }
        window.localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('[SafeStorage] Notice while evicting heavy localStorage keys:', err);
  }
}

/**
 * Safe wrapper for localStorage.setItem with automatic QuotaExceededError recovery and In-Memory Fallback.
 * Never throws or triggers blocking UI alerts.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  memoryFallbackStore.set(key, value);
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        (typeof err.message === 'string' && err.message.toLowerCase().includes('quota')));

    if (isQuotaError) {
      evictHeavyLocalStorageKeys();
      try {
        // Only retry writing to localStorage if the payload itself is small (< 64KB)
        if (value.length < 65536) {
          window.localStorage.setItem(key, value);
          return true;
        }
      } catch {
        // Silently keep in memoryFallbackStore
      }
    }
    return false;
  }
}

/**
 * Safe wrapper for localStorage.getItem with In-Memory Fallback lookup.
 */
export function safeLocalStorageGet(key: string): string | null {
  if (memoryFallbackStore.has(key)) {
    const memVal = memoryFallbackStore.get(key);
    if (typeof memVal === 'string') return memVal;
  }
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe wrapper for localStorage.removeItem.
 */
export function safeLocalStorageRemove(key: string): void {
  memoryFallbackStore.delete(key);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ============================================================================
// DATA PRUNING ENGINE (تطهير البيانات غير الضرورية قبل الحفظ الدائم)
// ============================================================================

/**
 * Prunes minute-by-minute match events (commentary, chances, saves, fouls, offsides, stoppage time).
 * Keeps only compact goal & red_card summary records (or empty array for older rounds)
 * so scorers and disciplinary records remain intact without bloating storage.
 */
export function pruneMatchEventsForStorage(
  events?: MatchEvent[],
  keepEssentialScorers: boolean = true
): MatchEvent[] {
  if (!keepEssentialScorers || !Array.isArray(events) || events.length === 0) {
    return [];
  }

  const compact: MatchEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;
    if (e.type === 'goal' || e.type === 'red_card') {
      compact.push({
        id: e.id || `${e.type}_${e.minute}_${i}`,
        minute: e.minute,
        type: e.type,
        teamId: e.teamId,
        playerId: e.playerId,
        playerName: e.playerName,
        assistPlayerId: e.assistPlayerId,
        assistPlayerName: e.assistPlayerName,
        description: '',
      });
    }
  }
  return compact;
}

/**
 * Prunes fixtures list before saving to storage:
 * - Strips verbose minute-by-minute commentary and timeline events from all played fixtures.
 * - For older finished rounds (round < currentRound - 1), clears events array completely,
 *   retaining only Final Score, Penalties, Winner, and core MatchStats.
 */
export function pruneFixturesForStorage(
  fixtures: Fixture[] | undefined | null,
  currentRound: number = 1
): Fixture[] {
  if (!Array.isArray(fixtures)) return [];

  return fixtures.map((f) => {
    if (!f || !f.isPlayed) return f;

    const isRecentRound = typeof f.round === 'number' ? f.round >= currentRound - 1 : false;
    const prunedEvents = pruneMatchEventsForStorage(f.events, isRecentRound);

    return {
      ...f,
      events: prunedEvents,
    };
  });
}

/**
 * Prunes finished matches inside Domestic Cup tournament to prevent storing duplicate event timelines.
 */
export function pruneCupTournamentForStorage(
  cup: CupTournament | null | undefined
): CupTournament | null {
  if (!cup) return null;
  if (!Array.isArray(cup.matches)) return cup;

  return {
    ...cup,
    matches: cup.matches.map((m) => {
      if (!m || !m.isPlayed) return m;
      return {
        ...m,
        events: pruneMatchEventsForStorage(m.events, false),
      };
    }),
  };
}

/**
 * Prunes finished matches inside Continental Tournament to prevent storing verbose timelines.
 */
export function pruneContinentalForStorage(
  continental: ContinentalTournament | null | undefined
): ContinentalTournament | null {
  if (!continental) return null;
  if (!Array.isArray(continental.matches)) return continental;

  return {
    ...continental,
    matches: continental.matches.map((m) => {
      if (!m || !m.isPlayed) return m;
      return {
        ...m,
        events: pruneMatchEventsForStorage(m.events, false),
      };
    }),
  };
}

// ============================================================================
// ACTIVE LIVE MATCH & CONTINENTAL CACHE IN INDEXEDDB (NO LOCALSTORAGE QUOTA)
// ============================================================================

/**
 * Saves an active in-progress live match snapshot to IndexedDB + Memory Fallback (never localStorage).
 * Strips verbose commentary events before saving to keep the snapshot lightweight.
 */
export async function saveActiveLiveMatchToDb(liveMatch: any | null): Promise<void> {
  // Always ensure legacy localStorage key is removed so it never occupies quota
  safeLocalStorageRemove(`${LEGACY_STORAGE_PREFIX}_active_live_match`);

  if (!liveMatch) {
    memoryFallbackStore.delete(IDB_ACTIVE_LIVE_MATCH_KEY);
    try {
      await del(IDB_ACTIVE_LIVE_MATCH_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const lightweightSnapshot = {
    ...liveMatch,
    // Keep only the last 12 commentary/timeline items in the crash-recovery snapshot
    events: Array.isArray(liveMatch.events)
      ? liveMatch.events.filter((e: any) => e && (e.type !== 'commentary' || e.minute >= (liveMatch.currentMinute || 0) - 5)).slice(-35)
      : [],
  };

  memoryFallbackStore.set(IDB_ACTIVE_LIVE_MATCH_KEY, lightweightSnapshot);
  try {
    await set(IDB_ACTIVE_LIVE_MATCH_KEY, lightweightSnapshot);
  } catch (err) {
    console.warn('[IndexedDbStorage] Notice saving active live match to IndexedDB (kept in memory):', err);
  }
}

/**
 * Loads an active in-progress live match snapshot from IndexedDB or Memory Fallback.
 */
export async function loadActiveLiveMatchFromDb(): Promise<any | null> {
  if (memoryFallbackStore.has(IDB_ACTIVE_LIVE_MATCH_KEY)) {
    return memoryFallbackStore.get(IDB_ACTIVE_LIVE_MATCH_KEY) || null;
  }
  try {
    const saved = await get<any>(IDB_ACTIVE_LIVE_MATCH_KEY);
    if (saved) {
      memoryFallbackStore.set(IDB_ACTIVE_LIVE_MATCH_KEY, saved);
      return saved;
    }
  } catch (err) {
    console.warn('[IndexedDbStorage] Notice reading active live match from IndexedDB:', err);
  }
  return null;
}

/**
 * Immediately clears the active live match from both Memory Fallback and IndexedDB.
 */
export async function clearActiveLiveMatchFromDb(): Promise<void> {
  memoryFallbackStore.delete(IDB_ACTIVE_LIVE_MATCH_KEY);
  safeLocalStorageRemove(`${LEGACY_STORAGE_PREFIX}_active_live_match`);
  try {
    await del(IDB_ACTIVE_LIVE_MATCH_KEY);
  } catch {
    // ignore
  }
}

/**
 * Saves a continental tournament cache entry into IndexedDB + Memory Fallback.
 */
export async function saveContinentalCacheToDb(
  seasonNum: number,
  compCode: string,
  tournament: ContinentalTournament
): Promise<void> {
  const key = `${IDB_CONT_CACHE_PREFIX}s${seasonNum}_${compCode}`;
  const pruned = pruneContinentalForStorage(tournament);
  memoryFallbackStore.set(key, pruned);
  safeLocalStorageRemove(`${LEGACY_STORAGE_PREFIX}_contCache_s${seasonNum}_${compCode}`);
  try {
    await set(key, pruned);
  } catch {
    // kept in memoryFallbackStore
  }
}

/**
 * Loads a continental tournament cache entry from Memory Fallback or IndexedDB.
 */
export async function loadContinentalCacheFromDb(
  seasonNum: number,
  compCode: string
): Promise<ContinentalTournament | null> {
  const key = `${IDB_CONT_CACHE_PREFIX}s${seasonNum}_${compCode}`;
  if (memoryFallbackStore.has(key)) {
    return memoryFallbackStore.get(key) || null;
  }
  try {
    const cached = await get<ContinentalTournament>(key);
    if (cached) {
      memoryFallbackStore.set(key, cached);
      return cached;
    }
  } catch {
    // ignore
  }
  return null;
}

// ============================================================================
// PERSISTENT WORLD STATE STORAGE
// ============================================================================

let isSavingWorldState = false;
let pendingWorldState: WorldState | null = null;
let saveResolvers: Array<() => void> = [];

/**
 * Saves the world state to IndexedDB with queue coalescing to prevent race conditions.
 */
export async function saveWorldStateToDb(worldState: WorldState): Promise<boolean> {
  if (!worldState) return false;

  pendingWorldState = worldState;
  memoryFallbackStore.set(IDB_WORLD_STATE_KEY, worldState);

  return new Promise<boolean>((resolve) => {
    saveResolvers.push(() => resolve(true));

    if (isSavingWorldState) {
      return;
    }

    isSavingWorldState = true;

    const processQueue = async () => {
      while (pendingWorldState) {
        const payloadToSave: WorldState = {
          ...pendingWorldState,
          lastUpdated: Date.now(),
        };
        pendingWorldState = null;

        try {
          await set(IDB_WORLD_STATE_KEY, payloadToSave);
        } catch (err) {
          console.warn('[IndexedDbStorage] Error writing worldState to IndexedDB:', err);
        }
      }

      isSavingWorldState = false;
      const currentResolvers = saveResolvers;
      saveResolvers = [];
      currentResolvers.forEach((fn) => fn());
    };

    processQueue();
  });
}

/**
 * Loads the world state from IndexedDB or Memory Fallback.
 */
export async function loadWorldStateFromDb(): Promise<WorldState | null> {
  try {
    const data = await get<WorldState>(IDB_WORLD_STATE_KEY);
    if (data && data.teams && data.players && data.leagues) {
      memoryFallbackStore.set(IDB_WORLD_STATE_KEY, data);
      return data;
    }
  } catch (err) {
    console.warn('[IndexedDbStorage] Error reading worldState from IndexedDB:', err);
  }
  const fallback = memoryFallbackStore.get(IDB_WORLD_STATE_KEY);
  if (fallback && fallback.teams && fallback.players && fallback.leagues) {
    return fallback;
  }
  return null;
}

/**
 * Checks if a persisted world state exists in IndexedDB.
 */
export async function hasSavedWorldStateInDb(): Promise<boolean> {
  try {
    const data = await get<WorldState>(IDB_WORLD_STATE_KEY);
    return Boolean(data && data.teams && Object.keys(data.teams).length > 0);
  } catch {
    const fallback = memoryFallbackStore.get(IDB_WORLD_STATE_KEY);
    return Boolean(fallback && fallback.teams && Object.keys(fallback.teams).length > 0);
  }
}

/**
 * Deletes the persistent universe from IndexedDB.
 */
export async function clearWorldStateFromDb(): Promise<void> {
  memoryFallbackStore.delete(IDB_WORLD_STATE_KEY);
  try {
    await del(IDB_WORLD_STATE_KEY);
  } catch (err) {
    console.warn('[IndexedDbStorage] Error clearing worldState from IndexedDB:', err);
  }
}
