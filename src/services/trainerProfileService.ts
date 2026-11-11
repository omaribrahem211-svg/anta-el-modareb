/**
 * Trainer Profile Service (Local-First Identity)
 * 
 * Manages the trainer's local identity without any external Google/Gmail/Firebase Auth.
 * Automatically generates a unique local Trainer ID and stores profile details in localStorage.
 */

export const TRAINER_PROFILE_STORAGE_KEY = 'anta_trainer_profile_v1';

export interface LocalTrainerProfile {
  trainerId: string;
  name: string;
  age: number;
  nationality: string;
  createdAt: number;
  updatedAt: number;
  isCreated: boolean;
}

/**
 * Generate a unique random Trainer ID locally
 * Example: TRN-M2K8P1-9X7Z
 */
export function generateTrainerId(): string {
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRN-${timePart}-${randPart}`;
}

/**
 * Retrieves the local trainer profile if it exists
 */
export function getLocalTrainerProfile(): LocalTrainerProfile | null {
  try {
    const raw = localStorage.getItem(TRAINER_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.trainerId && parsed.name) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[TrainerProfile] Failed to read profile from localStorage:', e);
  }
  return null;
}

/**
 * Saves or creates the local trainer profile
 */
export function saveLocalTrainerProfile(profile: {
  name: string;
  age: number;
  nationality: string;
  trainerId?: string;
}): LocalTrainerProfile {
  const existing = getLocalTrainerProfile();
  const trainerId = profile.trainerId || existing?.trainerId || generateTrainerId();
  const now = Date.now();

  const fullProfile: LocalTrainerProfile = {
    trainerId,
    name: profile.name.trim() || 'كابتن الفريق',
    age: Math.max(18, Math.min(85, profile.age || 35)),
    nationality: profile.nationality.trim() || 'مصري',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    isCreated: true,
  };

  try {
    localStorage.setItem(TRAINER_PROFILE_STORAGE_KEY, JSON.stringify(fullProfile));
  } catch (e) {
    console.warn('[TrainerProfile] Failed to save profile to localStorage:', e);
  }

  return fullProfile;
}

/**
 * Checks if the trainer profile already exists locally
 */
export function hasLocalTrainerProfile(): boolean {
  return getLocalTrainerProfile() !== null;
}
