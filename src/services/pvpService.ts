import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types/auth';
import { Club, Player, TeamTactics } from '../types/game';
import {
  PvPMatch,
  PvPMatchState,
  PvPMatchType,
  PvPParticipant,
  PvPLeaderboardEntry,
  PvPTransaction
} from '../types/pvp';
import { calculateTeamStrength, simulateMatch } from '../utils/engine';
import { fetchGameRealismSettings } from './adminService';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';

const DEFAULT_ELO = 1200;
const DEFAULT_COINS = 1000;
const K_FACTOR = 32;

/**
 * Deeply sanitizes any object or array before writing to Firestore.
 * Removes all undefined properties recursively so Firestore never throws unsupported field value errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

/**
 * Calculate Elo delta between two players based on match outcome
 * outcome: 1 (player 1 wins), 0.5 (draw), 0 (player 2 wins)
 */
export function calculateEloDelta(
  p1Elo: number,
  p2Elo: number,
  outcome: 1 | 0.5 | 0,
  k: number = K_FACTOR
): { delta1: number; delta2: number } {
  const expected1 = 1 / (1 + Math.pow(10, (p2Elo - p1Elo) / 400));
  const expected2 = 1 - expected1;

  const outcome2 = (1 - outcome) as 1 | 0.5 | 0;

  const delta1 = Math.round(k * (outcome - expected1));
  const delta2 = Math.round(k * (outcome2 - expected2));

  return { delta1, delta2 };
}

const FALLBACK_ONLINE_MANAGERS: PvPLeaderboardEntry[] = [
  { uid: 'bot_1', displayName: 'كابتن حسام حسن', email: null, eloRating: 1540, matchesPlayed: 45, wins: 32, draws: 8, losses: 5, winRate: 71, coinsWonTotal: 12500, isOnline: true, lastSeenAt: Date.now() },
  { uid: 'bot_2', displayName: 'طارق العشري', email: null, eloRating: 1480, matchesPlayed: 38, wins: 24, draws: 9, losses: 5, winRate: 63, coinsWonTotal: 9800, isOnline: true, lastSeenAt: Date.now() },
  { uid: 'bot_3', displayName: 'علي ماهر', email: null, eloRating: 1420, matchesPlayed: 29, wins: 18, draws: 6, losses: 5, winRate: 62, coinsWonTotal: 7200, isOnline: true, lastSeenAt: Date.now() },
  { uid: 'bot_4', displayName: 'أحمد سامي', email: null, eloRating: 1390, matchesPlayed: 22, wins: 13, draws: 5, losses: 4, winRate: 59, coinsWonTotal: 5400, isOnline: true, lastSeenAt: Date.now() },
  { uid: 'bot_5', displayName: 'أيمن الرمادي', email: null, eloRating: 1350, matchesPlayed: 18, wins: 10, draws: 4, losses: 4, winRate: 56, coinsWonTotal: 4100, isOnline: true, lastSeenAt: Date.now() },
];

/**
 * Track user online presence and update profile metadata in Firestore
 */
export async function updateOnlinePresence(
  user: UserProfile,
  isOnline: boolean
): Promise<void> {
  if (!user?.uid) return;
  if (isRecentQuotaExceeded()) return; // Avoid hammering quota

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      isOnline,
      lastSeenAt: Date.now()
    }, { merge: true });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
    }
  }
}

/**
 * Listen to live active managers and leaderboard (Scoped to top 20 with cache)
 */
export function subscribeToOnlineManagers(
  onUpdate: (managers: PvPLeaderboardEntry[]) => void
): Unsubscribe {
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('lastLoginAt', 'desc'), limit(20));

    return onSnapshot(q, (snapshot) => {
      const entries: PvPLeaderboardEntry[] = [];
      const now = Date.now();

      snapshot.forEach((d) => {
        const data = d.data() as UserProfile;
        const isOnline = Boolean(data.isOnline && data.lastSeenAt && (now - data.lastSeenAt < 10 * 60 * 1000));
        const stats = data.pvpStats || {
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsScored: 0,
          goalsConceded: 0,
          coinsWonTotal: 0,
          cleanSheets: 0,
          winStreak: 0,
          bestWinStreak: 0
        };

        const winRate = stats.matchesPlayed > 0 
          ? Math.round((stats.wins / stats.matchesPlayed) * 100) 
          : 0;

        entries.push({
          uid: data.uid,
          displayName: data.displayName || 'مدرب مجهول',
          email: data.email,
          eloRating: data.eloRating || DEFAULT_ELO,
          matchesPlayed: stats.matchesPlayed,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          winRate,
          coinsWonTotal: stats.coinsWonTotal,
          isOnline,
          lastSeenAt: data.lastSeenAt || data.lastLoginAt
        });
      });

      // Sort by Elo Rating descending
      entries.sort((a, b) => b.eloRating - a.eloRating);
      onUpdate(entries.length > 0 ? entries : FALLBACK_ONLINE_MANAGERS);
    }, (err) => {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
      }
      onUpdate(FALLBACK_ONLINE_MANAGERS);
    });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
    }
    onUpdate(FALLBACK_ONLINE_MANAGERS);
    return () => {};
  }
}

/**
 * Listen to matches for the current user (active, waiting, completed - scoped to limit 15)
 */
export function subscribeToUserPvPMatches(
  userId: string,
  onUpdate: (matches: PvPMatch[]) => void
): Unsubscribe {
  try {
    const matchesCol = collection(db, 'pvp_matches');
    const q = query(matchesCol, orderBy('createdAt', 'desc'), limit(15));

    return onSnapshot(q, (snapshot) => {
      const matches: PvPMatch[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as PvPMatch;
        // Normalise prize amount from legacy stakeAmount if needed
        if (data.prizeAmount === undefined && data.stakeAmount !== undefined) {
          data.prizeAmount = data.stakeAmount;
        }
        if (
          data.player1Id === userId || 
          data.player2Id === userId || 
          (data.status === 'waiting_for_opponent' && data.player1Id !== userId)
        ) {
          matches.push(data);
        }
      });
      onUpdate(matches);
    }, (err) => {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded();
      }
      onUpdate([]);
    });
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
    }
    onUpdate([]);
    return () => {};
  }
}

/**
 * Listen to a single match in real-time
 */
export function subscribeToMatch(
  matchId: string,
  onUpdate: (match: PvPMatch | null) => void
): Unsubscribe {
  const matchRef = doc(db, 'pvp_matches', matchId);
  return onSnapshot(matchRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as PvPMatch;
      if (data.prizeAmount === undefined && data.stakeAmount !== undefined) {
        data.prizeAmount = data.stakeAmount;
      }
      onUpdate(data);
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.warn('subscribeToMatch error:', err);
  });
}

/**
 * Helper to build a participant object from current player context
 */
export function buildParticipant(
  user: UserProfile,
  club: Club | null | undefined,
  tactics: TeamTactics,
  managerLevel: number = 1,
  managerReputation: number = 20
): PvPParticipant {
  const teamStr = club ? calculateTeamStrength(club, tactics) : { attack: 50, midfield: 50, defense: 50, overall: 50 };
  const activeIds = tactics?.startingPlayerIds || [];
  const squadPlayers = Array.isArray(club?.players) ? club.players : [];
  const startingPlayers = squadPlayers.filter(p => activeIds.includes(p.id));
  const benchPlayers = squadPlayers.filter(p => (tactics?.benchPlayerIds || []).includes(p.id));

  const participant: PvPParticipant = {
    userId: user.uid,
    email: user.email || null,
    displayName: user.displayName || user.email?.split('@')[0] || 'المدرب',
    clubName: club?.name || 'النادي',
    clubPrimaryColor: club?.primaryColor || '#10b981',
    managerLevel,
    managerReputation,
    eloRating: user.eloRating || DEFAULT_ELO,
    squadRating: teamStr.overall,
    tactics,
    startingPlayers,
    benchPlayers,
    isReady: true
  };

  return sanitizeForFirestore(participant);
}

/**
 * Anti-Abuse Checks: Daily limit and same-opponent cooldown for challenge matches
 */
async function validateChallengeAntiAbuse(
  userId: string,
  opponentId?: string | null,
  prizeAmount: number = 0,
  managerLevel: number = 1
): Promise<void> {
  if (prizeAmount <= 0) return; // Friendly matches have no prize restrictions

  const settings = await fetchGameRealismSettings();
  const minLevel = settings.minManagerLevelForChallenge || 1;
  if (managerLevel < minLevel) {
    throw new Error(`يتطلب دخول مباريات التحدي وصول المدرب إلى المستوى ${minLevel} على الأقل.`);
  }

  const dailyLimit = settings.dailyChallengeLimit || 20;
  const cooldownMinutes = settings.sameOpponentCooldownMinutes || 15;
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const cooldownThreshold = now - cooldownMinutes * 60 * 1000;

  // Query recent matches for this user
  const matchesCol = collection(db, 'pvp_matches');
  const userMatchesQuery = query(
    matchesCol,
    where('player1Id', '==', userId),
    where('createdAt', '>=', oneDayAgo),
    limit(50)
  );

  try {
    const snap = await getDocs(userMatchesQuery);
    let dailyChallengeCount = 0;

    snap.forEach((d) => {
      const match = d.data() as PvPMatch;
      const matchPrize = match.prizeAmount || match.stakeAmount || 0;
      if (matchPrize > 0) {
        dailyChallengeCount++;
        // Check cooldown against same opponent if opponentId is known
        if (opponentId && (match.player2Id === opponentId || match.player1Id === opponentId)) {
          if (match.createdAt > cooldownThreshold && match.status !== 'cancelled') {
            const minutesLeft = Math.ceil((match.createdAt + cooldownMinutes * 60 * 1000 - now) / 60000);
            throw new Error(`يرجى الانتظار ${minutesLeft} دقيقة قبل إعادة تحدي نفس المنافس على جائزة.`);
          }
        }
      }
    });

    if (dailyChallengeCount >= dailyLimit) {
      throw new Error(`وصلت للحد الأقصى اليومي لمباريات التحدي (${dailyLimit} مباراة في اليوم).`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('يرجى الانتظار') || err.message.includes('الحد الأقصى')) {
      throw err;
    }
    // Continue gracefully if composite index is still building in Firestore
    console.warn('Anti-abuse check notice:', err);
  }
}

/**
 * Matchmaking: Search for an open waiting match or create a new one atomically
 */
export async function findRandomMatchOrQueue(
  currentUser: UserProfile,
  userClub: Club,
  tactics: TeamTactics,
  prizeAmount: number = 0,
  managerLevel: number = 1,
  managerReputation: number = 20
): Promise<{ match: PvPMatch; wasMatched: boolean }> {
  const userCoins = currentUser.virtualCoins !== undefined ? currentUser.virtualCoins : DEFAULT_COINS;
  
  if (prizeAmount > 0 && userCoins < prizeAmount) {
    throw new Error(`رصيدك من الكوينز الافتراضية (${userCoins}) غير كافٍ لدخول مباراة تحدي بجائزة (${prizeAmount} كوينز).`);
  }

  // Anti-abuse check
  await validateChallengeAntiAbuse(currentUser.uid, null, prizeAmount, managerLevel);

  const participant = buildParticipant(currentUser, userClub, tactics, managerLevel, managerReputation);
  const matchType: PvPMatchType = prizeAmount > 0 ? 'challenge' : 'friendly';
  const totalPrizePool = prizeAmount * 2;
  const winnerReward = totalPrizePool; // Winner receives full agreed challenge prize pool (zero platform fee)

  // 1. Look for waiting match with same prize
  const matchesCol = collection(db, 'pvp_matches');
  const q = query(
    matchesCol,
    where('status', '==', 'waiting_for_opponent'),
    where('prizeAmount', '==', prizeAmount),
    limit(10)
  );

  const snapshot = await getDocs(q);
  let matchedDocId: string | null = null;
  let matchedData: PvPMatch | null = null;

  for (const d of snapshot.docs) {
    const data = d.data() as PvPMatch;
    // Prevent matching with oneself, verify expiry, and exclude private friend invites
    if (data.player1Id !== currentUser.uid && data.expiresAt > Date.now() && !data.player2Email) {
      matchedDocId = d.id;
      matchedData = data;
      break;
    }
  }

  // 2. If matched an existing waiting game, join atomically
  if (matchedDocId && matchedData) {
    // Check anti-abuse cooldown with matched opponent
    await validateChallengeAntiAbuse(currentUser.uid, matchedData.player1Id, prizeAmount, managerLevel);

    const matchRef = doc(db, 'pvp_matches', matchedDocId);
    const userRef = doc(db, 'users', currentUser.uid);

    await runTransaction(db, async (tx) => {
      const currentMatchSnap = await tx.get(matchRef);
      if (!currentMatchSnap.exists()) {
        throw new Error('مباراة التحدي لم تعد متاحة.');
      }
      const matchDocData = currentMatchSnap.data() as PvPMatch;
      if (matchDocData.status !== 'waiting_for_opponent' || matchDocData.player2Id) {
        throw new Error('تم الانضمام لهذه المباراة من قبل مدرب آخر.');
      }

      // Check wallet if prize challenge
      if (prizeAmount > 0) {
        const userSnap = await tx.get(userRef);
        const latestCoins = (userSnap.exists() && userSnap.data()?.virtualCoins !== undefined) 
          ? userSnap.data()?.virtualCoins 
          : (currentUser.virtualCoins !== undefined ? currentUser.virtualCoins : DEFAULT_COINS);

        if (latestCoins < prizeAmount) {
          throw new Error('رصيد الكوينز غير كافٍ.');
        }

        const newBalance = latestCoins - prizeAmount;
        if (userSnap.exists()) {
          tx.update(userRef, { virtualCoins: newBalance });
        } else {
          tx.set(userRef, {
            uid: currentUser.uid,
            email: currentUser.email || null,
            displayName: currentUser.displayName || 'مدرب الفريق',
            role: currentUser.role || 'player',
            status: 'active',
            isPremium: Boolean(currentUser.isPremium),
            virtualCoins: newBalance,
            createdAt: currentUser.createdAt || Date.now(),
            lastLoginAt: Date.now()
          }, { merge: true });
        }

        // Record transaction
        const txDocRef = doc(collection(db, 'pvp_transactions'));
        const txRecord: PvPTransaction = {
          id: txDocRef.id,
          userId: currentUser.uid,
          userEmail: currentUser.email || null,
          matchId: matchedDocId!,
          type: 'prize_reserved',
          amount: -prizeAmount,
          balanceAfter: newBalance,
          timestamp: Date.now(),
          note: `حجز اشتراك مباراة تحدي بجائزة (${prizeAmount} كوينز)`
        };
        tx.set(txDocRef, sanitizeForFirestore(txRecord));
      }

      // Update match with challenger (Player 2)
      const updatedMatch: Partial<PvPMatch> = {
        player2Id: currentUser.uid,
        challengerId: currentUser.uid,
        player2: participant,
        status: 'ready',
        acceptedAt: Date.now()
      };

      tx.update(matchRef, sanitizeForFirestore(updatedMatch));
    });

    const updatedSnap = await getDoc(matchRef);
    const fullMatch = updatedSnap.data() as PvPMatch;

    return { match: fullMatch, wasMatched: true };
  }

  // 3. If no match found, create a new waiting match and reserve challenge prize
  console.log('[PVP] Creating match');
  const matchRef = doc(collection(db, 'pvp_matches'));
  const newMatchId = matchRef.id;
  const userRef = doc(db, 'users', currentUser.uid);

  const newMatch: PvPMatch = {
    id: newMatchId,
    matchType,
    status: 'waiting_for_opponent',
    prizeAmount,
    stakeAmount: prizeAmount,
    totalPrizePool,
    winnerReward,
    systemFee: 0,
    player1Id: currentUser.uid,
    challengeCreatorId: currentUser.uid,
    player1: participant,
    player2Id: null,
    challengerId: null,
    player2: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 20 * 60 * 1000 // 20 mins expiry
  };

  await runTransaction(db, async (tx) => {
    if (prizeAmount > 0) {
      const userSnap = await tx.get(userRef);
      const latestCoins = (userSnap.exists() && userSnap.data()?.virtualCoins !== undefined) 
        ? userSnap.data()?.virtualCoins 
        : (currentUser.virtualCoins !== undefined ? currentUser.virtualCoins : DEFAULT_COINS);

      if (latestCoins < prizeAmount) {
        throw new Error('رصيد الكوينز غير كافٍ.');
      }

      const newBalance = latestCoins - prizeAmount;
      if (userSnap.exists()) {
        tx.update(userRef, { virtualCoins: newBalance });
      } else {
        tx.set(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || null,
          displayName: currentUser.displayName || 'مدرب الفريق',
          role: currentUser.role || 'player',
          status: 'active',
          isPremium: Boolean(currentUser.isPremium),
          virtualCoins: newBalance,
          createdAt: currentUser.createdAt || Date.now(),
          lastLoginAt: Date.now()
        }, { merge: true });
      }

      const txDocRef = doc(collection(db, 'pvp_transactions'));
      const txRecord: PvPTransaction = {
        id: txDocRef.id,
        userId: currentUser.uid,
        userEmail: currentUser.email || null,
        matchId: newMatchId,
        type: 'prize_reserved',
        amount: -prizeAmount,
        balanceAfter: newBalance,
        timestamp: Date.now(),
        note: `حجز اشتراك مباراة تحدي بجائزة (${prizeAmount} كوينز)`
      };
      tx.set(txDocRef, sanitizeForFirestore(txRecord));
    }

    tx.set(matchRef, sanitizeForFirestore(newMatch));
  });

  console.log('[PVP] Match created:', newMatchId);
  return { match: newMatch, wasMatched: false };
}

/**
 * Create a direct match invitation for a friend via email
 */
export async function createFriendInvitation(
  currentUser: UserProfile,
  userClub: Club,
  tactics: TeamTactics,
  friendEmail: string,
  prizeAmount: number = 0,
  managerLevel: number = 1,
  managerReputation: number = 20
): Promise<PvPMatch> {
  const cleanEmail = friendEmail.trim().toLowerCase();
  if (cleanEmail === currentUser.email?.toLowerCase()) {
    throw new Error('لا يمكنك إرسال دعوة لنفسك.');
  }

  const userCoins = currentUser.virtualCoins !== undefined ? currentUser.virtualCoins : DEFAULT_COINS;
  if (prizeAmount > 0 && userCoins < prizeAmount) {
    throw new Error(`رصيدك (${userCoins} كوينز) لا يكفي لاختيار جائزة تحدي (${prizeAmount} كوينز).`);
  }

  // Anti-abuse validation
  await validateChallengeAntiAbuse(currentUser.uid, null, prizeAmount, managerLevel);

  const participant = buildParticipant(currentUser, userClub, tactics, managerLevel, managerReputation);
  const matchType: PvPMatchType = prizeAmount > 0 ? 'challenge' : 'friendly';
  const totalPrizePool = prizeAmount * 2;
  const winnerReward = totalPrizePool;

  const matchRef = doc(collection(db, 'pvp_matches'));
  const matchId = matchRef.id;
  const userRef = doc(db, 'users', currentUser.uid);

  const newMatch: PvPMatch = {
    id: matchId,
    matchType,
    status: 'waiting_for_opponent',
    prizeAmount,
    stakeAmount: prizeAmount,
    totalPrizePool,
    winnerReward,
    systemFee: 0,
    player1Id: currentUser.uid,
    challengeCreatorId: currentUser.uid,
    player1: participant,
    player2Id: null,
    challengerId: null,
    player2Email: cleanEmail,
    player2: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours for friend invitations
  };

  await runTransaction(db, async (tx) => {
    if (prizeAmount > 0) {
      const userSnap = await tx.get(userRef);
      const latestCoins = (userSnap.exists() && userSnap.data()?.virtualCoins !== undefined) 
        ? userSnap.data()?.virtualCoins 
        : (currentUser.virtualCoins !== undefined ? currentUser.virtualCoins : DEFAULT_COINS);

      if (latestCoins < prizeAmount) {
        throw new Error('رصيد الكوينز غير كافٍ.');
      }

      const newBalance = latestCoins - prizeAmount;
      if (userSnap.exists()) {
        tx.update(userRef, { virtualCoins: newBalance });
      } else {
        tx.set(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || null,
          displayName: currentUser.displayName || 'مدرب الفريق',
          role: currentUser.role || 'player',
          status: 'active',
          isPremium: Boolean(currentUser.isPremium),
          virtualCoins: newBalance,
          createdAt: currentUser.createdAt || Date.now(),
          lastLoginAt: Date.now()
        }, { merge: true });
      }

      const txDocRef = doc(collection(db, 'pvp_transactions'));
      const txRecord: PvPTransaction = {
        id: txDocRef.id,
        userId: currentUser.uid,
        userEmail: currentUser.email || null,
        matchId,
        type: 'prize_reserved',
        amount: -prizeAmount,
        balanceAfter: newBalance,
        timestamp: Date.now(),
        note: `حجز اشتراك دعوة تحدي صديق بجائزة (${prizeAmount} كوينز)`
      };
      tx.set(txDocRef, sanitizeForFirestore(txRecord));
    }

    tx.set(matchRef, sanitizeForFirestore(newMatch));
  });

  return newMatch;
}

/**
 * Accept a friend invitation / challenge match and join
 */
export async function acceptFriendMatch(
  matchId: string,
  currentUser: UserProfile,
  userClub: Club,
  tactics: TeamTactics,
  managerLevel: number = 1,
  managerReputation: number = 20
): Promise<void> {
  const matchRef = doc(db, 'pvp_matches', matchId);
  const userRef = doc(db, 'users', currentUser.uid);
  const participant = buildParticipant(currentUser, userClub, tactics, managerLevel, managerReputation);

  const matchSnapInitial = await getDoc(matchRef);
  if (!matchSnapInitial.exists()) {
    throw new Error('مباراة التحدي لم تعد متاحة.');
  }
  const initialMatchData = matchSnapInitial.data() as PvPMatch;
  const matchPrize = initialMatchData.prizeAmount || initialMatchData.stakeAmount || 0;

  // Anti-abuse validation against the host
  await validateChallengeAntiAbuse(currentUser.uid, initialMatchData.player1Id, matchPrize, managerLevel);

  await runTransaction(db, async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) {
      throw new Error('مباراة التحدي لم تعد متاحة.');
    }
    const match = matchSnap.data() as PvPMatch;
    const resolvedPrize = match.prizeAmount || match.stakeAmount || 0;

    if (match.status !== 'waiting_for_opponent') {
      throw new Error('هذه الدعوة لم تعد متاحة.');
    }
    if (match.player1Id === currentUser.uid) {
      throw new Error('لا يمكنك قبول دعوتك الخاصة.');
    }

    if (resolvedPrize > 0) {
      const userSnap = await tx.get(userRef);
      const latestCoins = (userSnap.exists() && userSnap.data()?.virtualCoins !== undefined) 
        ? userSnap.data()?.virtualCoins 
        : (currentUser.virtualCoins !== undefined ? currentUser.virtualCoins : DEFAULT_COINS);

      if (latestCoins < resolvedPrize) {
        throw new Error(`رصيدك (${latestCoins}) غير كافٍ لقبول التحدي (${resolvedPrize} كوينز).`);
      }

      const newBalance = latestCoins - resolvedPrize;
      if (userSnap.exists()) {
        tx.update(userRef, { virtualCoins: newBalance });
      } else {
        tx.set(userRef, {
          uid: currentUser.uid,
          email: currentUser.email || null,
          displayName: currentUser.displayName || 'مدرب الفريق',
          role: currentUser.role || 'player',
          status: 'active',
          isPremium: Boolean(currentUser.isPremium),
          virtualCoins: newBalance,
          createdAt: currentUser.createdAt || Date.now(),
          lastLoginAt: Date.now()
        }, { merge: true });
      }

      const txDocRef = doc(collection(db, 'pvp_transactions'));
      const txRecord: PvPTransaction = {
        id: txDocRef.id,
        userId: currentUser.uid,
        userEmail: currentUser.email || null,
        matchId,
        type: 'prize_reserved',
        amount: -resolvedPrize,
        balanceAfter: newBalance,
        timestamp: Date.now(),
        note: `حجز اشتراك قبول تحدي بجائزة (${resolvedPrize} كوينز)`
      };
      tx.set(txDocRef, sanitizeForFirestore(txRecord));
    }

    tx.update(matchRef, sanitizeForFirestore({
      player2Id: currentUser.uid,
      challengerId: currentUser.uid,
      player2: participant,
      status: 'ready',
      acceptedAt: Date.now()
    }));
  });
}

/**
 * Update tactics & starting lineup before match is locked
 */
export async function updateParticipantTactics(
  matchId: string,
  userId: string,
  isPlayer1: boolean,
  tactics: TeamTactics,
  startingPlayers: Player[],
  benchPlayers: Player[]
): Promise<void> {
  const matchRef = doc(db, 'pvp_matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) return;

  const match = matchSnap.data() as PvPMatch;
  if (match.status === 'locked' || match.status === 'simulating' || match.status === 'completed') {
    throw new Error('تم قفل التشكيل ولا يمكن تعديل التكتيك أثناء المباراة.');
  }

  const participantKey = isPlayer1 ? 'player1' : 'player2';
  const participant = isPlayer1 ? match.player1 : match.player2;
  if (!participant) return;

  const updatedParticipant: PvPParticipant = {
    ...participant,
    tactics,
    startingPlayers,
    benchPlayers,
    isReady: true
  };

  await setDoc(matchRef, {
    [participantKey]: sanitizeForFirestore(updatedParticipant)
  }, { merge: true });
}

/**
 * Server-Authoritative Simulation of the PvP Match
 * Locks match, calculates outcome, updates ratings and distributes virtual coin rewards atomically.
 */
export async function lockAndSimulatePvPMatch(matchId: string): Promise<PvPMatch> {
  console.log('[PVP] Starting match', matchId);
  const matchRef = doc(db, 'pvp_matches', matchId);
  const matchSnap = await getDoc(matchRef);
  if (!matchSnap.exists()) {
    throw new Error('مباراة التحدي لم تعد متاحة.');
  }
  const match = matchSnap.data() as PvPMatch;

  if (match.status === 'completed') {
    return match;
  }
  if (!match.player1 || !match.player2) {
    throw new Error('لا يمكن بدء المحاكاة بدون تواجد الفريقين.');
  }

  const resolvedPrize = match.prizeAmount || match.stakeAmount || 0;
  const resolvedWinnerReward = match.winnerReward || resolvedPrize * 2;

  // 1. Construct temporary Club representations for both participants to feed into the simulation engine
  const homeClub: Club = {
    id: match.player1.userId,
    name: match.player1.clubName,
    shortName: match.player1.clubName.substring(0, 10),
    city: 'القاهرة',
    country: 'مصر',
    countryId: 'EGY',
    division: 1,
    reputation: match.player1.managerReputation || 50,
    primaryColor: match.player1.clubPrimaryColor || '#10b981',
    secondaryColor: '#ffffff',
    budget: 100000,
    transferBudget: 50000,
    wageBudgetMonthly: 20000,
    facilities: {
      stadiumName: `استاد ${match.player1.clubName}`,
      stadiumCapacity: 25000,
      stadiumLevel: 3,
      medicalCenterLevel: 3,
      trainingGroundLevel: 3,
      youthAcademyLevel: 3,
      scoutingNetworkLevel: 3,
    },
    sponsors: [],
    isUserClub: true,
    players: match.player1.startingPlayers || [],
  };

  const awayClub: Club = {
    id: match.player2.userId,
    name: match.player2.clubName,
    shortName: match.player2.clubName.substring(0, 10),
    city: 'الإسكندرية',
    country: 'مصر',
    countryId: 'EGY',
    division: 1,
    reputation: match.player2.managerReputation || 50,
    primaryColor: match.player2.clubPrimaryColor || '#3b82f6',
    secondaryColor: '#ffffff',
    budget: 100000,
    transferBudget: 50000,
    wageBudgetMonthly: 20000,
    facilities: {
      stadiumName: `استاد ${match.player2.clubName}`,
      stadiumCapacity: 25000,
      stadiumLevel: 3,
      medicalCenterLevel: 3,
      trainingGroundLevel: 3,
      youthAcademyLevel: 3,
      scoutingNetworkLevel: 3,
    },
    sponsors: [],
    isUserClub: false,
    players: match.player2.startingPlayers || [],
  };

  // 2. Authoritatively simulate match
  const simResult = simulateMatch(
    homeClub,
    awayClub,
    match.player1.tactics,
    match.player2.tactics
  );

  const homeGoals = simResult.homeScore;
  const awayGoals = simResult.awayScore;
  const isDraw = homeGoals === awayGoals;
  let winnerId: string | null = null;
  if (!isDraw) {
    winnerId = homeGoals > awayGoals ? match.player1.userId : match.player2.userId;
  }

  // 3. Compute Elo adjustments
  const p1Elo = match.player1.eloRating || DEFAULT_ELO;
  const p2Elo = match.player2.eloRating || DEFAULT_ELO;
  const outcome1: 1 | 0.5 | 0 = isDraw ? 0.5 : winnerId === match.player1.userId ? 1 : 0;
  const { delta1, delta2 } = calculateEloDelta(p1Elo, p2Elo, outcome1);
  const p1NewElo = Math.max(100, p1Elo + delta1);
  const p2NewElo = Math.max(100, p2Elo + delta2);

  // 4. Compute Coin payouts (Winner gets predefined prize pool; Draw refunds agreed prize)
  const p1CoinDelta = isDraw 
    ? (resolvedPrize > 0 ? resolvedPrize : 0) // Refund on draw
    : winnerId === match.player1.userId 
    ? resolvedWinnerReward 
    : 0;

  const p2CoinDelta = isDraw 
    ? (resolvedPrize > 0 ? resolvedPrize : 0) // Refund on draw
    : winnerId === match.player2.userId 
    ? resolvedWinnerReward 
    : 0;

  // 5. Execute Atomic Settlement in Firestore
  const p1UserRef = doc(db, 'users', match.player1.userId);
  const p2UserRef = doc(db, 'users', match.player2.userId);

  await runTransaction(db, async (tx) => {
    // Transaction Read-Before-Write Requirement: Read all documents first!
    const matchTxSnap = await tx.get(matchRef);
    if (!matchTxSnap.exists()) {
      throw new Error('مباراة التحدي لم تعد متاحة.');
    }
    const currentTxMatch = matchTxSnap.data() as PvPMatch;
    if (currentTxMatch.status === 'completed') {
      return; // Already completed by another concurrent process
    }

    const p1Snap = await tx.get(p1UserRef);
    const p2Snap = await tx.get(p2UserRef);

    const p1Data = p1Snap.exists() ? (p1Snap.data() as UserProfile) : null;
    const p2Data = p2Snap.exists() ? (p2Snap.data() as UserProfile) : null;

    const p1CurrentCoins = p1Data?.virtualCoins !== undefined ? p1Data.virtualCoins : DEFAULT_COINS;
    const p2CurrentCoins = p2Data?.virtualCoins !== undefined ? p2Data.virtualCoins : DEFAULT_COINS;

    const p1NewCoins = p1CurrentCoins + p1CoinDelta;
    const p2NewCoins = p2CurrentCoins + p2CoinDelta;

    // Update Player 1 Stats
    const p1Stats = p1Data?.pvpStats || {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      coinsWonTotal: 0,
      cleanSheets: 0,
      winStreak: 0,
      bestWinStreak: 0
    };
    p1Stats.matchesPlayed++;
    p1Stats.goalsScored += homeGoals;
    p1Stats.goalsConceded += awayGoals;
    if (homeGoals > awayGoals) {
      p1Stats.wins++;
      p1Stats.winStreak++;
      if (p1Stats.winStreak > p1Stats.bestWinStreak) p1Stats.bestWinStreak = p1Stats.winStreak;
      p1Stats.coinsWonTotal += resolvedWinnerReward;
    } else if (homeGoals === awayGoals) {
      p1Stats.draws++;
      p1Stats.winStreak = 0;
    } else {
      p1Stats.losses++;
      p1Stats.winStreak = 0;
    }
    if (awayGoals === 0) p1Stats.cleanSheets++;

    // Update Player 2 Stats
    const p2Stats = p2Data?.pvpStats || {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      coinsWonTotal: 0,
      cleanSheets: 0,
      winStreak: 0,
      bestWinStreak: 0
    };
    p2Stats.matchesPlayed++;
    p2Stats.goalsScored += awayGoals;
    p2Stats.goalsConceded += homeGoals;
    if (awayGoals > homeGoals) {
      p2Stats.wins++;
      p2Stats.winStreak++;
      if (p2Stats.winStreak > p2Stats.bestWinStreak) p2Stats.bestWinStreak = p2Stats.winStreak;
      p2Stats.coinsWonTotal += resolvedWinnerReward;
    } else if (awayGoals === homeGoals) {
      p2Stats.draws++;
      p2Stats.winStreak = 0;
    } else {
      p2Stats.losses++;
      p2Stats.winStreak = 0;
    }
    if (homeGoals === 0) p2Stats.cleanSheets++;

    // Update Users in Firestore with existence fallback
    if (p1Snap.exists()) {
      tx.update(p1UserRef, {
        eloRating: p1NewElo,
        virtualCoins: p1NewCoins,
        pvpStats: p1Stats
      });
    } else {
      tx.set(p1UserRef, {
        uid: match.player1.userId,
        email: match.player1.email || null,
        displayName: match.player1.displayName || match.player1.clubName,
        role: 'player',
        status: 'active',
        isPremium: false,
        eloRating: p1NewElo,
        virtualCoins: p1NewCoins,
        pvpStats: p1Stats,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      }, { merge: true });
    }

    if (p2Snap.exists()) {
      tx.update(p2UserRef, {
        eloRating: p2NewElo,
        virtualCoins: p2NewCoins,
        pvpStats: p2Stats
      });
    } else {
      tx.set(p2UserRef, {
        uid: match.player2.userId,
        email: match.player2.email || null,
        displayName: match.player2.displayName || match.player2.clubName,
        role: 'player',
        status: 'active',
        isPremium: false,
        eloRating: p2NewElo,
        virtualCoins: p2NewCoins,
        pvpStats: p2Stats,
        createdAt: Date.now(),
        lastLoginAt: Date.now()
      }, { merge: true });
    }

    // Payout Ledgers
    if (p1CoinDelta > 0) {
      const txDocRef1 = doc(collection(db, 'pvp_transactions'));
      const txRecord1: PvPTransaction = {
        id: txDocRef1.id,
        userId: match.player1.userId,
        userEmail: match.player1.email,
        matchId,
        type: isDraw ? 'prize_refunded' : 'prize_won',
        amount: p1CoinDelta,
        balanceAfter: p1NewCoins,
        timestamp: Date.now(),
        note: isDraw ? `استرداد جائزة التعادل (+${p1CoinDelta} كوينز)` : `جائزة الفوز بمباراة التحدي (+${p1CoinDelta} كوينز)`
      };
      tx.set(txDocRef1, sanitizeForFirestore(txRecord1));
    }

    if (p2CoinDelta > 0) {
      const txDocRef2 = doc(collection(db, 'pvp_transactions'));
      const txRecord2: PvPTransaction = {
        id: txDocRef2.id,
        userId: match.player2.userId,
        userEmail: match.player2.email,
        matchId,
        type: isDraw ? 'prize_refunded' : 'prize_won',
        amount: p2CoinDelta,
        balanceAfter: p2NewCoins,
        timestamp: Date.now(),
        note: isDraw ? `استرداد جائزة التعادل (+${p2CoinDelta} كوينز)` : `جائزة الفوز بمباراة التحدي (+${p2CoinDelta} كوينز)`
      };
      tx.set(txDocRef2, sanitizeForFirestore(txRecord2));
    }

    // Finalize match document
    console.log('[PVP] Completing match', matchId);
    tx.update(matchRef, sanitizeForFirestore({
      status: 'completed',
      score: {
        player1: homeGoals,
        player2: awayGoals
      },
      events: simResult.events || [],
      stats: simResult.stats || {},
      winnerId: winnerId ?? null,
      isDraw: Boolean(isDraw),
      player1EloDelta: delta1,
      player2EloDelta: delta2,
      player1NewElo: p1NewElo,
      player2NewElo: p2NewElo,
      player1CoinsDelta: p1CoinDelta,
      player2CoinsDelta: p2CoinDelta,
      lockedAt: currentTxMatch.lockedAt || match.lockedAt || Date.now(),
      completedAt: Date.now()
    }));
  });

  const finalSnap = await getDoc(matchRef);
  return finalSnap.data() as PvPMatch;
}

/**
 * Cancel an active waiting match and refund reserved prize coins atomically
 */
export async function cancelPvPMatch(
  matchId: string,
  userId: string,
  reason: string = 'إلغاء من قبل المستخدم'
): Promise<void> {
  const matchRef = doc(db, 'pvp_matches', matchId);

  await runTransaction(db, async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) return;
    const match = matchSnap.data() as PvPMatch;
    const resolvedPrize = match.prizeAmount || match.stakeAmount || 0;

    if (match.status === 'locked' || match.status === 'simulating' || match.status === 'completed') {
      throw new Error('لا يمكن إلغاء مباراة بعد قفلها أو اكتمالها.');
    }

    // Refund Player 1 if prize was reserved
    if (resolvedPrize > 0 && match.player1Id) {
      const p1UserRef = doc(db, 'users', match.player1Id);
      const p1Snap = await tx.get(p1UserRef);
      if (p1Snap.exists()) {
        const cur = p1Snap.data()?.virtualCoins !== undefined ? p1Snap.data()?.virtualCoins : DEFAULT_COINS;
        tx.update(p1UserRef, { virtualCoins: cur + resolvedPrize });

        const txDocRef = doc(collection(db, 'pvp_transactions'));
        const txRecord: PvPTransaction = {
          id: txDocRef.id,
          userId: match.player1Id,
          userEmail: match.player1?.email || null,
          matchId,
          type: 'prize_refunded',
          amount: resolvedPrize,
          balanceAfter: cur + resolvedPrize,
          timestamp: Date.now(),
          note: `استرداد جائزة إلغاء التحدي (+${resolvedPrize} كوينز)`
        };
        tx.set(txDocRef, sanitizeForFirestore(txRecord));
      }
    }

    // Refund Player 2 if joined with prize
    if (resolvedPrize > 0 && match.player2Id) {
      const p2UserRef = doc(db, 'users', match.player2Id);
      const p2Snap = await tx.get(p2UserRef);
      if (p2Snap.exists()) {
        const cur = p2Snap.data()?.virtualCoins !== undefined ? p2Snap.data()?.virtualCoins : DEFAULT_COINS;
        tx.update(p2UserRef, { virtualCoins: cur + resolvedPrize });

        const txDocRef = doc(collection(db, 'pvp_transactions'));
        const txRecord: PvPTransaction = {
          id: txDocRef.id,
          userId: match.player2Id,
          userEmail: match.player2?.email || null,
          matchId,
          type: 'prize_refunded',
          amount: resolvedPrize,
          balanceAfter: cur + resolvedPrize,
          timestamp: Date.now(),
          note: `استرداد جائزة إلغاء التحدي (+${resolvedPrize} كوينز)`
        };
        tx.set(txDocRef, sanitizeForFirestore(txRecord));
      }
    }

    tx.update(matchRef, sanitizeForFirestore({
      status: 'cancelled',
      cancelledAt: Date.now(),
      cancelReason: reason
    }));
  });
}
