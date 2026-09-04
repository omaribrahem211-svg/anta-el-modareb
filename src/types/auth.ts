import { ManagerProfile, SeasonHistoryEntry, TransferHistoryEntry, ClubEconomySummary, CurrentSeasonStats } from './game';

export type UserRole = 'player' | 'admin' | 'moderator';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface UserPvPStats {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  coinsWonTotal: number;
  cleanSheets: number;
  winStreak: number;
  bestWinStreak: number;
}

export interface UserClubSummary {
  id: string;
  name: string;
  division: number;
  leagueId?: string;
  leagueName?: string;
  country?: string;
  budget: number;
  transferBudget?: number;
  wageBudgetMonthly?: number;
  reputation: number;
  stadiumName: string;
  stadiumCapacity: number;
  squadSize: number;
  squadMarketValue: number;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: number;
  lastLoginAt: number;
  status: AccountStatus;
  isPremium: boolean;
  premiumExpiresAt?: number | null;
  photoURL?: string | null;
  
  // Metadata for career / cloud linking status
  hasCloudSave?: boolean;
  lastCloudSaveAt?: number;
  
  // Virtual Currencies & PvP Ranking
  virtualCoins?: number;
  virtualGems?: number;
  eloRating?: number;
  isOnline?: boolean;
  lastSeenAt?: number;
  pvpStats?: UserPvPStats;

  // Daily Manager Points & Activity for Leaderboards
  dailyPoints?: number;
  dailyMatchesPlayed?: number;
  dailyWins?: number;
  dailyDraws?: number;
  dailyLosses?: number;
  lastDailyPointsDate?: string; // YYYY-MM-DD

  // Cloud-synced Career & Manager data
  managerProfile?: ManagerProfile;
  currentClub?: UserClubSummary;
  currentSeasonStats?: CurrentSeasonStats;
  seasonHistory?: SeasonHistoryEntry[];
  transferHistory?: TransferHistoryEntry[];
  clubEconomy?: ClubEconomySummary;
}

export interface AuthState {
  user: UserProfile | null;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
}

