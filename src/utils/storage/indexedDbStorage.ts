/**
 * IndexedDB Storage Layer using idb-keyval
 * 
 * Provides an asynchronous, zero-quota-limit local database for the persistent universe.
 * Strictly local to the device (no Firebase consumption).
 */

import { get, set, del, clear } from 'idb-keyval';
import { WorldState } from '../../types/worldState';

export const IDB_WORLD_STATE_KEY = 'anta_universe_world_state_v1';
export const IDB_SAVE_METADATA_KEY = 'anta_universe_metadata_v1';

let isSavingWorldState = false;
let pendingWorldState: WorldState | null = null;
let saveResolvers: Array<() => void> = [];

/**
 * Saves the world state to IndexedDB with queue coalescing to prevent race conditions.
 */
export async function saveWorldStateToDb(worldState: WorldState): Promise<boolean> {
  if (!worldState) return false;

  pendingWorldState = worldState;

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
      currentResolvers.forEach(fn => fn());
    };

    processQueue();
  });
}

/**
 * Loads the world state from IndexedDB.
 */
export async function loadWorldStateFromDb(): Promise<WorldState | null> {
  try {
    const data = await get<WorldState>(IDB_WORLD_STATE_KEY);
    if (data && data.teams && data.players && data.leagues) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[IndexedDbStorage] Error reading worldState from IndexedDB:', err);
    return null;
  }
}

/**
 * Checks if a persisted world state exists in IndexedDB.
 */
export async function hasSavedWorldStateInDb(): Promise<boolean> {
  try {
    const data = await get<WorldState>(IDB_WORLD_STATE_KEY);
    return Boolean(data && data.teams && Object.keys(data.teams).length > 0);
  } catch {
    return false;
  }
}

/**
 * Deletes the persistent universe from IndexedDB.
 */
export async function clearWorldStateFromDb(): Promise<void> {
  try {
    await del(IDB_WORLD_STATE_KEY);
  } catch (err) {
    console.warn('[IndexedDbStorage] Error clearing worldState from IndexedDB:', err);
  }
}
