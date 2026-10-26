/**
 * Game State Repository (Local-First Architecture)
 * 
 * Provides an asynchronous high-performance storage layer using IndexedDB
 * with transparent synchronous-fallback to localStorage.
 * 
 * Ensures all everyday gameplay mutations (tactics, squad, transfers, matches,
 * training, facilities, messages, and manager career) happen locally and instantly
 * without touching Cloud Firestore.
 */

import { normalizeCalendarDate } from '../utils/calendarEngine';

const DB_NAME = 'AntaElModareb_DB_v2';
const DB_VERSION = 2;
const STORE_NAME = 'game_state_store';
export const LEGACY_STORAGE_PREFIX = 'anta_el_modareb_save_v1';

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
}

let dbInstance: IDBDatabase | null = null;
let isIndexedDBAvailable: boolean | null = null;

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
        console.warn('[GameStateRepo] IndexedDB open error, falling back to localStorage:', (event.target as any)?.error);
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
 * Low-level key-value getter in IndexedDB
 */
async function idbGet<T>(key: string): Promise<T | null> {
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
 * Low-level key-value setter in IndexedDB
 */
async function idbSet<T>(key: string, value: T): Promise<boolean> {
  const db = await getIDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

let isSavingToStorage = false;
let pendingSavePayload: LocalGameSavePayload | null = null;
let saveResolveQueue: Array<() => void> = [];

async function executeSave(payload: LocalGameSavePayload): Promise<void> {
  const timestampedPayload: LocalGameSavePayload = {
    ...payload,
    schemaVersion: payload.schemaVersion || 2,
    saveVersion: (payload.saveVersion || 0) + 1,
    lastLocalSaveAt: Date.now(),
  };

  // 1. Asynchronous write to IndexedDB (off main thread)
  try {
    await idbSet('current_save', timestampedPayload);
  } catch (err) {
    console.warn('[GameStateRepo] Error writing to IndexedDB:', err);
  }

  // 2. Non-blocking safety-mirror to localStorage (deferred so it never blocks React UI or frame rendering)
  setTimeout(() => {
    try {
      const safeSetLS = (key: string, val: string) => {
        try {
          localStorage.setItem(key, val);
        } catch (e) {
          // Safe catch for storage limits
        }
      };

      // Save critical lightweight metadata and core entities first
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_meta_save_version`, String(timestampedPayload.saveVersion));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_meta_save_time`, String(timestampedPayload.lastLocalSaveAt));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_manager`, JSON.stringify(timestampedPayload.manager));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_season`, JSON.stringify(timestampedPayload.season));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_activeLeague`, JSON.stringify(timestampedPayload.activeLeague));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_currentRound`, JSON.stringify(timestampedPayload.currentRound));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_calendarDate`, JSON.stringify(timestampedPayload.calendarDate));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_clubEconomy`, JSON.stringify(timestampedPayload.clubEconomy));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_standings`, JSON.stringify(timestampedPayload.standings));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_boardSystem`, JSON.stringify(timestampedPayload.boardSystem));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_cupTournament`, JSON.stringify(timestampedPayload.cupTournament));

      // Secondary items
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_teams`, JSON.stringify(timestampedPayload.teams));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_fixtures`, JSON.stringify(timestampedPayload.fixtures));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_inbox`, JSON.stringify(timestampedPayload.inbox));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_transferHistory`, JSON.stringify(timestampedPayload.transferHistory));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_jobOffers`, JSON.stringify(timestampedPayload.jobOffers));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_transferMarket`, JSON.stringify(timestampedPayload.transferMarket));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_incomingBids`, JSON.stringify(timestampedPayload.incomingBids));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_seasonEndSummary`, JSON.stringify(timestampedPayload.seasonEndSummary));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_activeNegotiations`, JSON.stringify(timestampedPayload.activeNegotiations));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_dailyNews`, JSON.stringify(timestampedPayload.dailyNews));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_retiredPlayers`, JSON.stringify(timestampedPayload.retiredPlayers));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_worldRankings`, JSON.stringify(timestampedPayload.worldRankings));
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_scoutedOpponents`, JSON.stringify(timestampedPayload.scoutedOpponents));
      if (timestampedPayload.africanChampionsLeague !== undefined) {
        safeSetLS(`${LEGACY_STORAGE_PREFIX}_africanChampionsLeague`, JSON.stringify(timestampedPayload.africanChampionsLeague));
      }
      if (timestampedPayload.seasonArchives !== undefined) {
        safeSetLS(`${LEGACY_STORAGE_PREFIX}_seasonArchives`, JSON.stringify(timestampedPayload.seasonArchives));
      }
      safeSetLS(`${LEGACY_STORAGE_PREFIX}_deletedMessageIds`, JSON.stringify(timestampedPayload.deletedMessageIds || []));
    } catch (mirrorErr) {
      console.warn('[GameStateRepo] Deferred localStorage mirror notice:', mirrorErr);
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
        // Coalesce: A save is already running, this payload will be picked up next
        return;
      }

      isSavingToStorage = true;

      const processQueue = async () => {
        while (pendingSavePayload) {
          const toSave = pendingSavePayload;
          pendingSavePayload = null;

          try {
            await executeSave(toSave);
          } catch (err) {
            console.warn('[GameStateRepo] Save execution error:', err);
          }
        }

        isSavingToStorage = false;
        const resolvers = saveResolveQueue;
        saveResolveQueue = [];
        resolvers.forEach(r => r());
      };

      processQueue();
    });
  },

  /**
   * Load local game state, prioritizing IndexedDB with transparent fallback to localStorage
   */
  async loadLocalGameState(): Promise<LocalGameSavePayload | null> {
    // 1. Try loading from IndexedDB first
    try {
      const idbSave = await idbGet<LocalGameSavePayload>('current_save');
      if (idbSave && idbSave.manager && idbSave.teams) {
        return idbSave;
      }
    } catch (err) {
      console.warn('[GameStateRepo] Error reading from IndexedDB:', err);
    }

    // 2. Fallback to reading legacy localStorage
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

      const legacySave: LocalGameSavePayload = {
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
        cupTournament: safeParse('cupTournament', null),
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
      };

      return legacySave;
    } catch {
      return null;
    }
  },

  /**
   * Reset local storage completely
   */
  async clearLocalGameState(): Promise<void> {
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
      keys.forEach(k => {
        if (k.startsWith(LEGACY_STORAGE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  }
};
