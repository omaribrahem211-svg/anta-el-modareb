import { TeamTactics, Player, MatchEvent, MatchStats } from './game';

export type PvPMatchState = 
  | 'created' 
  | 'waiting_for_opponent' 
  | 'waiting_for_lineup' 
  | 'ready' 
  | 'locked' 
  | 'simulating' 
  | 'completed' 
  | 'cancelled' 
  | 'expired' 
  | 'refunded';

export type PvPMatchType = 'friendly' | 'challenge';

export interface PvPParticipant {
  userId: string;
  email: string | null;
  displayName: string;
  clubName: string;
  clubPrimaryColor?: string;
  managerLevel: number;
  managerReputation: number;
  eloRating: number;
  squadRating: number;
  tactics?: TeamTactics;
  startingPlayers?: Player[];
  benchPlayers?: Player[];
  isReady: boolean;
  lockedAt?: number;
}

export interface PvPMatch {
  id: string;
  matchType: PvPMatchType;
  status: PvPMatchState;
  
  // Virtual In-Game Prize (Virtual currency ONLY, non-withdrawable, zero cash value)
  prizeAmount: number;    // 0 for friendly, 100, 250, 500, 1000, 5000, 10000 for challenge
  totalPrizePool: number; // Total virtual coins in the challenge prize pool
  winnerReward: number;   // Full prize amount for the challenge winner (no platform fee currently)
  systemFee?: number;     // Reserved for future platform sinks if needed (currently 0)

  // Compatibility alias
  stakeAmount?: number;

  // Challenge Creator / Host Manager
  player1Id: string;
  challengeCreatorId?: string;
  player1: PvPParticipant;

  // Opponent / Challenger Manager
  player2Id?: string | null;
  challengerId?: string | null;
  player2Email?: string | null; // For direct friend invitations
  player2?: PvPParticipant | null;

  // Match Results & Detailed Events
  score?: {
    player1: number;
    player2: number;
  };
  events?: MatchEvent[];
  stats?: MatchStats;
  winnerId?: string | null; // null if draw
  isDraw?: boolean;

  // Elo rating adjustments
  player1EloDelta?: number;
  player2EloDelta?: number;
  player1NewElo?: number;
  player2NewElo?: number;

  // Virtual coins won / returned
  player1CoinsDelta?: number;
  player2CoinsDelta?: number;

  // Timestamps
  createdAt: number;
  acceptedAt?: number;
  expiresAt: number;
  lockedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
  cancelReason?: string;
}

export type PvPTransactionType = 
  | 'prize_reserved' 
  | 'prize_won' 
  | 'prize_refunded' 
  | 'initial_grant';

export interface PvPTransaction {
  id: string;
  userId: string;
  userEmail: string | null;
  matchId: string;
  type: PvPTransactionType;
  amount: number;
  balanceAfter: number;
  timestamp: number;
  note: string;
}

export interface PvPLeaderboardEntry {
  uid: string;
  displayName: string;
  email: string | null;
  eloRating: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  coinsWonTotal: number;
  isOnline: boolean;
  lastSeenAt?: number;
}

