import { 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc, 
  query, 
  where,
  orderBy, 
  limit, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/auth';
import { ManagerProfile } from '../types/game';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';

export interface DailyManagerLeaderboardEntry {
  uid: string;
  managerName: string;
  clubName: string;
  leagueName?: string;
  divisionTier?: number;
  dailyPoints: number;
  dailyMatchesPlayed: number;
  dailyWins: number;
  dailyDraws: number;
  dailyLosses: number;
  lastUpdated: number;
  level: number;
  reputation: number;
  isCurrentUser?: boolean;
}

/**
 * Returns today's ISO date string (YYYY-MM-DD) in local time
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const LEADERBOARD_CACHE_KEY = 'anta_elmodareb_daily_leaderboard_cache';
const LEADERBOARD_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache to stay well within free tier

/**
 * Update the user's daily points in Firestore upon finishing a match (Zero read version)
 */
export async function recordMatchDailyPointsInCloud(
  userId: string,
  userEmail: string | null,
  managerName: string,
  clubName: string,
  leagueName: string,
  divisionTier: number,
  isWin: boolean,
  isDraw: boolean,
  level: number,
  reputation: number,
  localStats?: {
    currentDailyPoints?: number;
    currentMatches?: number;
    currentWins?: number;
    currentDraws?: number;
    currentLosses?: number;
    lastDate?: string;
  }
): Promise<{ dailyPoints: number; pointsEarned: number }> {
  const today = getTodayDateString();
  const pointsEarned = isWin ? 3 : isDraw ? 1 : 0;

  try {
    let currentDailyPoints = 0;
    let currentMatches = 0;
    let currentWins = 0;
    let currentDraws = 0;
    let currentLosses = 0;

    if (localStats && localStats.lastDate === today) {
      currentDailyPoints = localStats.currentDailyPoints || 0;
      currentMatches = localStats.currentMatches || 0;
      currentWins = localStats.currentWins || 0;
      currentDraws = localStats.currentDraws || 0;
      currentLosses = localStats.currentLosses || 0;
    } else if (!localStats && !isRecentQuotaExceeded()) {
      // Fallback only if localStats was not provided
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (data.lastDailyPointsDate === today) {
          currentDailyPoints = data.dailyPoints || 0;
          currentMatches = data.dailyMatchesPlayed || 0;
          currentWins = data.dailyWins || 0;
          currentDraws = data.dailyDraws || 0;
          currentLosses = data.dailyLosses || 0;
        }
      }
    }

    const updatedPoints = currentDailyPoints + pointsEarned;
    const updatedMatches = currentMatches + 1;
    const updatedWins = currentWins + (isWin ? 1 : 0);
    const updatedDraws = currentDraws + (isDraw ? 1 : 0);
    const updatedLosses = currentLosses + (!isWin && !isDraw ? 1 : 0);

    if (!isRecentQuotaExceeded()) {
      const userRef = doc(db, 'users', userId);

      // Single write to Firestore users collection
      await setDoc(userRef, {
        dailyPoints: updatedPoints,
        dailyMatchesPlayed: updatedMatches,
        dailyWins: updatedWins,
        dailyDraws: updatedDraws,
        dailyLosses: updatedLosses,
        lastDailyPointsDate: today,
        lastSeenAt: Date.now(),
        isOnline: true,
        currentClub: {
          id: 'club_' + userId,
          name: clubName,
          division: divisionTier,
          leagueName,
          budget: 100000,
          reputation: reputation,
          stadiumName: 'الملعب الرئيسي',
          stadiumCapacity: 5000,
          squadSize: 18,
          squadMarketValue: 500000
        }
      }, { merge: true });
    }

    return { dailyPoints: updatedPoints, pointsEarned };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded();
    }
    console.warn('Notice: recording daily points locally (cloud sync offline/quota limit):', error);
    return { dailyPoints: pointsEarned, pointsEarned };
  }
}

/**
 * Fetch daily leaderboards of managers based on today's match points (with smart TTL caching)
 */
export async function fetchDailyManagersLeaderboard(
  currentUserId?: string,
  localManagerFallback?: ManagerProfile,
  localClubName?: string,
  localLeagueName?: string,
  forceRefresh: boolean = false
): Promise<DailyManagerLeaderboardEntry[]> {
  const today = getTodayDateString();
  const entries: DailyManagerLeaderboardEntry[] = [];

  // 1. Check local storage cache if not forced
  if (!forceRefresh && !isRecentQuotaExceeded()) {
    try {
      const cachedStr = localStorage.getItem(LEADERBOARD_CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.date === today && Date.now() - cached.timestamp < LEADERBOARD_CACHE_TTL && Array.isArray(cached.entries)) {
          return cached.entries;
        }
      }
    } catch {
      // ignore
    }
  }

  if (isRecentQuotaExceeded()) {
    try {
      const cachedStr = localStorage.getItem(LEADERBOARD_CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (Array.isArray(cached.entries) && cached.entries.length > 0) {
          return cached.entries;
        }
      }
    } catch {}
  } else {
    try {
      const usersCol = collection(db, 'users');
      const q = query(
        usersCol,
        where('lastDailyPointsDate', '==', today),
        orderBy('dailyPoints', 'desc'),
        limit(25)
      );

      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const u = docSnap.data() as UserProfile;
        entries.push({
          uid: u.uid,
          managerName: u.managerProfile?.name || u.displayName || 'مدرب محترف',
          clubName: u.currentClub?.name || 'نادٍ رياضي',
          leagueName: u.currentClub?.leagueName || 'دوري المحترفين',
          divisionTier: u.currentClub?.division || 4,
          dailyPoints: u.dailyPoints || 0,
          dailyMatchesPlayed: u.dailyMatchesPlayed || 0,
          dailyWins: u.dailyWins || 0,
          dailyDraws: u.dailyDraws || 0,
          dailyLosses: u.dailyLosses || 0,
          lastUpdated: u.lastSeenAt || Date.now(),
          level: u.managerProfile?.level || 1,
          reputation: u.managerProfile?.reputation || 50,
          isCurrentUser: currentUserId ? u.uid === currentUserId : false
        });
      });

      // Save to cache
      if (entries.length > 0) {
        try {
          localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify({
            date: today,
            timestamp: Date.now(),
            entries
          }));
        } catch {}
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
      }
      console.warn('Fallback getting daily leaderboard (cloud limit/offline):', err);
    }
  }

  // If current user is not in the list (e.g. offline or new), include their current local state
  if (localManagerFallback) {
    const localDate = localManagerFallback.lastDailyResetDate || today;
    const userDailyPts = localDate === today ? (localManagerFallback.dailyPoints || 0) : 0;
    const userMatches = localDate === today ? (localManagerFallback.dailyMatchesPlayed || 0) : 0;

    const existingIndex = entries.findIndex(e => e.isCurrentUser || (currentUserId && e.uid === currentUserId));
    if (existingIndex >= 0) {
      entries[existingIndex].dailyPoints = Math.max(entries[existingIndex].dailyPoints, userDailyPts);
      entries[existingIndex].dailyMatchesPlayed = Math.max(entries[existingIndex].dailyMatchesPlayed, userMatches);
      entries[existingIndex].managerName = localManagerFallback.name || entries[existingIndex].managerName;
      if (localClubName) entries[existingIndex].clubName = localClubName;
    } else {
      entries.push({
        uid: currentUserId || 'current_user',
        managerName: localManagerFallback.name || 'أنت (المدرب)',
        clubName: localClubName || 'فريقك',
        leagueName: localLeagueName || 'الدوري الحالي',
        divisionTier: 4,
        dailyPoints: userDailyPts,
        dailyMatchesPlayed: userMatches,
        dailyWins: localDate === today ? (localManagerFallback.dailyWins || 0) : 0,
        dailyDraws: localDate === today ? (localManagerFallback.dailyDraws || 0) : 0,
        dailyLosses: localDate === today ? (localManagerFallback.dailyLosses || 0) : 0,
        lastUpdated: Date.now(),
        level: localManagerFallback.level || 1,
        reputation: localManagerFallback.reputation || 50,
        isCurrentUser: true
      });
    }
  }

  // Sort descending by dailyPoints, then by dailyWins
  entries.sort((a, b) => {
    if (b.dailyPoints !== a.dailyPoints) return b.dailyPoints - a.dailyPoints;
    if (b.dailyWins !== a.dailyWins) return b.dailyWins - a.dailyWins;
    return (b.dailyMatchesPlayed || 0) - (a.dailyMatchesPlayed || 0);
  });

  return entries;
}
