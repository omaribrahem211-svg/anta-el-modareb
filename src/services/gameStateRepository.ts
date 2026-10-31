/**
 * Game State Repository (IndexedDB Primary + In-Memory Fallback Architecture)
 *
 * Provides an asynchronous high-performance storage layer using IndexedDB (and idb-keyval)
 * with automatic Data Pruning and an In-Memory Map fallback.
 *
 * Heavy collections (teams, fixtures, cupTournament, africanChampionsLeague, transferMarket,
 * transferHistory, seasonArchives, retiredPlayers) are stored EXCLUSIVELY in IndexedDB / Memory
 * and evicted from localStorage to prevent QuotaExceededError and synchronous JSON serialization lag.
 */

import { get as idbKeyvalGet, set as idbKeyvalSet, del as idbKeyvalDel } from 'idb-keyval';
import { normalizeCalendarDate } from '../utils/calendarEngine';
import {
  evictHeavyLocalStorageKeys,
  pruneContinentalForStorage,
  pruneCupTournamentForStorage,
  pruneFixturesForStorage,
  safeLocalStorageSet,
} from '../utils/storage/indexedDbStorage';

const DB_NAME = 'AntaElModareb_DB_v2';
const DB_VERSION = 2;
const STORE_NAME = 'game_state_store';
const IDB_KEYVAL_SAVE_KEY = 'anta_el_modareb_idb_current_save_v2';
export const LEGACY_STORAGE_PREFIX = 'anta_el_modareb_save_v1';

const seasonSnapshotCache = new Map<number, any>();

export interface LocalGameSavePayload {
  schemaVersion: number;
  saveVersion: number;
  lastLocalSaveAt: number;
  activeLeague: any;
  teams: any[];
  standings: any[];
  fixtures: any[];
  currentRound: number;
  season: any;
  manager: any;
  transferMarket: any[];
  incomingBids: any[];
  inbox: any[];
  cupTournament: any;
  jobOffers: any[];
  seasonEndSummary: any;
  transferHistory: any[];
  clubEconomy: any;
  calendarDate: any;
  activeNegotiations: any[];
  boardSystem: any;
  dailyNews: any[];
  retiredPlayers: any[];
  worldRankings: any;
  scoutedOpponents: any;
  africanChampionsLeague?: any;
  seasonArchives?: any[];
  deletedMessageIds?: string[];
  pendingCloudSync?: boolean;
  worldState?: any;
}

let dbInstance: IDBDatabase | null = null;
let isIndexedDBAvailable: boolean | null = null;
let inMemorySaveCache: LocalGameSavePayload | null = null;

/**
 * Initializes and caches the IndexedDB connection with error resilience.
 */
async function getIDB(): Promise<IDBDatabase | null> {
  if (isIndexedDBAvailable === false) return null;
  if (dbInstance) return dbInstance;

  if (typeof window === 'undefined' || !window.indexedDB) {
    isIndexedDBAvailable = false;
    return null;
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        isIndexedDBAvailable = true;
        resolve(dbInstance);
      };

      request.onerror = (event: Event) => {
        console.warn('[GameStateRepo] IndexedDB open error, using idb-keyval / In-Memory fallback:', (event.target as any)?.error);
        isIndexedDBAvailable = false;
        resolve(null);
      };
    } catch (err) {
      console.warn('[GameStateRepo] IndexedDB initialization exception:', err);
      isIndexedDBAvailable = false;
      resolve(null);
    }
  });
}

/**
 * Low-level key-value getter in IndexedDB with idb-keyval fallback
 */
async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const kvVal = await idbKeyvalGet<T>(`${IDB_KEYVAL_SAVE_KEY}_${key}`);
    if (kvVal !== undefined && kvVal !== null) {
      return kvVal;
    }
  } catch {
    // continue to custom IDB store
  }

  const db = await getIDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result !== undefined ? (request.result as T) : null);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Low-level key-value setter in IndexedDB with idb-keyval backup
 */
async function idbSet<T>(key: string, value: T): Promise<boolean> {
  let savedToKv = false;
  try {
    await idbKeyvalSet(`${IDB_KEYVAL_SAVE_KEY}_${key}`, value);
    savedToKv = true;
  } catch {
    // continue to custom IDB store
  }

  const db = await getIDB();
  if (!db) return savedToKv;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(savedToKv);
    } catch {
      resolve(savedToKv);
    }
  });
}

let isSavingToStorage = false;
let pendingSavePayload: LocalGameSavePayload | null = null;
let saveResolveQueue: Array<() => void> = [];
let hasEvictedLegacyHeavyKeys = false;
let lastSaveStartedAt = 0;
// Minimum gap between full saves (they are coalesced: only the latest payload is written)
const MIN_SAVE_INTERVAL_MS = 1500;

function waitMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wait until the browser is idle so a heavy save never blocks a frame (match ticks, tab switches)
function waitForIdle(): Promise<void> {
  return new Promise(resolve => {
    const ric = typeof window !== 'undefined' ? (window as any).requestIdleCallback : undefined;
    if (typeof ric === 'function') {
      ric(() => resolve(), { timeout: 1500 });
    } else {
      setTimeout(resolve, 50);
    }
  });
}

/**
 * Prunes verbose timeline commentary, old round events, and oversized arrays before persisting.
 */
function pruneSavePayload(payload: LocalGameSavePayload): LocalGameSavePayload {
  const currentRound = typeof payload.currentRound === 'number' ? payload.currentRound : 1;
  return {
    ...payload,
    fixtures: pruneFixturesForStorage(payload.fixtures, currentRound),
    cupTournament: pruneCupTournamentForStorage(payload.cupTournament),
    africanChampionsLeague: pruneContinentalForStorage(payload.africanChampionsLeague),
    transferHistory: Array.isArray(payload.transferHistory)
      ? payload.transferHistory.slice(0, 100)
      : [],
    dailyNews: Array.isArray(payload.dailyNews)
      ? payload.dailyNews.slice(0, 30)
      : [],
    inbox: Array.isArray(payload.inbox)
      ? payload.inbox.slice(0, 60)
      : [],
    retiredPlayers: Array.isArray(payload.retiredPlayers)
      ? payload.retiredPlayers.slice(0, 80)
      : [],
  };
}

async function executeSave(payload: LocalGameSavePayload): Promise<void> {
  const pruned = pruneSavePayload(payload);
  const timestampedPayload: LocalGameSavePayload = {
    ...pruned,
    schemaVersion: pruned.schemaVersion || 2,
    saveVersion: (pruned.saveVersion || 0) + 1,
    lastLocalSaveAt: Date.now(),
  };

  // 1. Always keep in-memory cache updated immediately (zero-latency fallback)
  inMemorySaveCache = timestampedPayload;

  // 2. Proactively evict legacy heavy keys from localStorage once per session
  if (!hasEvictedLegacyHeavyKeys) {
    hasEvictedLegacyHeavyKeys = true;
    evictHeavyLocalStorageKeys(LEGACY_STORAGE_PREFIX);
  }

  // 3. Asynchronous write to IndexedDB (off main thread, no 5MB quota restriction)
  try {
    await idbSet('current_save', timestampedPayload);
  } catch (err) {
    console.warn('[GameStateRepo] Notice writing to IndexedDB (state safely held in memory cache):', err);
  }

  // 4. Lightweight header-only metadata sync to localStorage (never write heavy teams/fixtures/market arrays!)
  // activeLeague is mirrored WITHOUT its teams array so cold restarts still resolve the correct division
  // while keeping the synchronous localStorage write tiny (no main-thread stall, no quota errors).
  setTimeout(() => {
    try {
      safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_meta_save_version`, String(timestampedPayload.saveVersion));
      safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_meta_save_time`, String(timestampedPayload.lastLocalSaveAt));
      if (timestampedPayload.activeLeague) {
        const { teams: _omitTeams, ...slimLeague } = timestampedPayload.activeLeague as any;
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_activeLeague`, JSON.stringify(slimLeague));
      }
      if (timestampedPayload.manager) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_manager`, JSON.stringify(timestampedPayload.manager));
      }
      if (timestampedPayload.season) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_season`, JSON.stringify(timestampedPayload.season));
      }
      if (timestampedPayload.currentRound !== undefined) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_currentRound`, JSON.stringify(timestampedPayload.currentRound));
      }
      if (timestampedPayload.calendarDate) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_calendarDate`, JSON.stringify(timestampedPayload.calendarDate));
      }
      if (timestampedPayload.clubEconomy) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_clubEconomy`, JSON.stringify(timestampedPayload.clubEconomy));
      }
      if (timestampedPayload.standings) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_standings`, JSON.stringify(timestampedPayload.standings));
      }
      if (timestampedPayload.boardSystem) {
        safeLocalStorageSet(`${LEGACY_STORAGE_PREFIX}_boardSystem`, JSON.stringify(timestampedPayload.boardSystem));
      }
    } catch (mirrorErr) {
      console.warn('[GameStateRepo] Deferred header metadata sync notice:', mirrorErr);
    }
  }, 50);
}

export const gameStateRepository = {
  /**
   * Save complete game state locally with queue coalescing to prevent parallel blocking writes
   */
  async saveLocalGameState(payload: LocalGameSavePayload): Promise<void> {
    pendingSavePayload = payload;

    return new Promise<void>((resolve) => {
      saveResolveQueue.push(resolve);

      if (isSavingToStorage) {
        return;
      }

      isSavingToStorage = true;

      const processQueue = async () => {
        while (pendingSavePayload) {
          // When the app is going to background, save right away; otherwise throttle + wait for idle time.
          // Newer payloads overwrite pendingSavePayload while we wait, so only the latest state is written.
          const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
          if (!isHidden) {
            const sinceLast = Date.now() - lastSaveStartedAt;
            if (sinceLast < MIN_SAVE_INTERVAL_MS) {
              await waitMs(MIN_SAVE_INTERVAL_MS - sinceLast);
            }
            await waitForIdle();
          }

          const toSave = pendingSavePayload;
          pendingSavePayload = null;
          if (!toSave) break;
          lastSaveStartedAt = Date.now();

          try {
            await executeSave(toSave);
          } catch (err) {
            console.warn('[GameStateRepo] Save execution error:', err);
          }
        }

        isSavingToStorage = false;
        const resolvers = saveResolveQueue;
        saveResolveQueue = [];
        resolvers.forEach((r) => r());
      };

      processQueue();
    });
  },

  /**
   * Load local game state, prioritizing IndexedDB, then In-Memory Cache, then legacy localStorage migration
   */
  async loadLocalGameState(): Promise<LocalGameSavePayload | null> {
    // 1. Try loading from IndexedDB first
    try {
      const idbSave = await idbGet<LocalGameSavePayload>('current_save');
      if (idbSave && idbSave.manager && Array.isArray(idbSave.teams) && idbSave.teams.length > 0) {
        inMemorySaveCache = idbSave;
        evictHeavyLocalStorageKeys(LEGACY_STORAGE_PREFIX);
        return idbSave;
      }
    } catch (err) {
      console.warn('[GameStateRepo] Error reading from IndexedDB:', err);
    }

    // 2. Try in-memory cache
    if (inMemorySaveCache && inMemorySaveCache.manager && Array.isArray(inMemorySaveCache.teams) && inMemorySaveCache.teams.length > 0) {
      return inMemorySaveCache;
    }

    // 3. Fallback to migrating legacy localStorage save into IndexedDB
    try {
      const managerRaw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_manager`);
      if (!managerRaw) return null;

      const safeParse = (key: string, fallback: any) => {
        try {
          const raw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_${key}`);
          return raw ? JSON.parse(raw) : fallback;
        } catch {
          return fallback;
        }
      };

      const legacySave: LocalGameSavePayload = pruneSavePayload({
        schemaVersion: 2,
        saveVersion: parseInt(localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_meta_save_version`) || '1', 10),
        lastLocalSaveAt: parseInt(localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_meta_save_time`) || String(Date.now()), 10),
        activeLeague: safeParse('activeLeague', null),
        teams: safeParse('teams', []),
        standings: safeParse('standings', []),
        fixtures: safeParse('fixtures', []),
        currentRound: safeParse('currentRound', 1),
        season: safeParse('season', { seasonNumber: 1, isCompleted: false, year: '2025/2026' }),
        manager: safeParse('manager', null),
        transferMarket: safeParse('transferMarket', []),
        incomingBids: safeParse('incomingBids', []),
        inbox: safeParse('inbox', []),
        cupTournament: null,
        jobOffers: safeParse('jobOffers', []),
        seasonEndSummary: safeParse('seasonEndSummary', null),
        transferHistory: safeParse('transferHistory', []),
        clubEconomy: safeParse('clubEconomy', {
          transferSpendingTotal: 0,
          transferIncomeTotal: 0,
          salaryExpensesTotal: 0,
          sponsorIncomeTotal: 0,
          matchIncomeTotal: 0,
          facilitySpendingTotal: 0,
          currentSeasonNetProfit: 0,
        }),
        calendarDate: normalizeCalendarDate(safeParse('calendarDate', null)),
        activeNegotiations: safeParse('activeNegotiations', []),
        boardSystem: safeParse('boardSystem', null),
        dailyNews: safeParse('dailyNews', []),
        retiredPlayers: safeParse('retiredPlayers', []),
        worldRankings: safeParse('worldRankings', null),
        scoutedOpponents: safeParse('scoutedOpponents', {}),
        africanChampionsLeague: safeParse('africanChampionsLeague', null),
        seasonArchives: safeParse('seasonArchives', []),
        deletedMessageIds: safeParse('deletedMessageIds', []),
      });

      inMemorySaveCache = legacySave;
      await idbSet('current_save', legacySave);
      evictHeavyLocalStorageKeys(LEGACY_STORAGE_PREFIX);
      return legacySave;
    } catch {
      return null;
    }
  },

  /**
   * Save or load season archive snapshot in IndexedDB (instead of bloating localStorage).
   * The snapshot is kept in a small in-memory cache so "restart season" can read it synchronously,
   * and the (large) IndexedDB write is deferred so it never competes with the season-transition frame.
   */
  async saveSeasonSnapshot(seasonNum: number, snapshot: any): Promise<void> {
    seasonSnapshotCache.set(seasonNum, snapshot);
    for (const k of Array.from(seasonSnapshotCache.keys())) {
      if (k < seasonNum - 1) seasonSnapshotCache.delete(k);
    }
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1200));
      await idbSet(`season_${seasonNum}_snapshot`, snapshot);
    } catch {}
  },

  getSeasonSnapshotSync(seasonNum: number): any | null {
    return seasonSnapshotCache.get(seasonNum) ?? null;
  },

  async loadSeasonSnapshot(seasonNum: number): Promise<any | null> {
    const cached = seasonSnapshotCache.get(seasonNum);
    if (cached) return cached;
    try {
      const snap = await idbGet<any>(`season_${seasonNum}_snapshot`);
      if (snap) seasonSnapshotCache.set(seasonNum, snap);
      return snap;
    } catch {
      return null;
    }
  },

  /**
   * Reset local storage completely
   */
  async clearLocalGameState(): Promise<void> {
    inMemorySaveCache = null;
    try {
      await idbKeyvalDel(`${IDB_KEYVAL_SAVE_KEY}_current_save`);
    } catch {}

    try {
      const db = await getIDB();
      if (db) {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
    } catch (err) {
      console.warn('[GameStateRepo] Error clearing IndexedDB:', err);
    }

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith(LEGACY_STORAGE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  },
};
