import { UserProfile } from './auth';

export type AdminActionType = 
  | 'suspend_user'
  | 'unsuspend_user'
  | 'ban_user'
  | 'unban_user'
  | 'grant_admin'
  | 'revoke_admin'
  | 'grant_coins'
  | 'send_broadcast'
  | 'deactivate_broadcast'
  | 'delete_broadcast'
  | 'update_system_settings'
  | 'update_economy_settings'
  | 'cancel_pvp_match'
  | 'refund_pvp_match'
  | 'create_world_version'
  | 'publish_world_version'
  | 'set_default_world'
  | 'edit_country'
  | 'edit_league'
  | 'edit_club'
  | 'edit_player'
  | 'edit_competition';

export type BroadcastType = 'announcement' | 'event' | 'maintenance' | 'reward' | 'update';

export interface WorldVersion {
  id: string;
  versionNumber: number;
  name: string;
  description: string;
  createdAt: number;
  createdBy: string;
  isDefault: boolean;
  isActive: boolean;
  totalCountries: number;
  totalLeagues: number;
  totalClubs: number;
  totalPlayers: number;
  validationStatus: 'valid' | 'warning' | 'error';
  validationSummary?: {
    errorsCount: number;
    warningsCount: number;
    realClubsCount: number;
  };
  changelog?: string[];
}

export type WorldEditorSubTab = 
  | 'overview'
  | 'countries'
  | 'leagues'
  | 'clubs'
  | 'players'
  | 'competitions'
  | 'versions'
  | 'validation';

export interface BroadcastMessage {
  id: string;
  title: string;
  body: string;
  type: BroadcastType;
  createdAt: number;
  createdBy: string;
  createdByName?: string;
  isActive: boolean;
  expiresAt?: number;
  rewardCoins?: number;
}

export type CoinTransactionSource = 
  | 'match_reward'
  | 'challenge_prize'
  | 'admin_grant'
  | 'achievement'
  | 'season_reward'
  | 'promotion_reward'
  | 'store_purchase'
  | 'refund'
  | 'daily_reward';

export interface CoinLedgerEntry {
  id: string;
  transactionId: string;
  userId: string;
  userEmail?: string | null;
  type: 'admin_grant' | 'reward' | 'deduction' | 'prize' | 'purchase' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: CoinTransactionSource;
  adminId?: string | null;
  adminEmail?: string | null;
  timestamp: number;
}

export interface AdminAuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  action: AdminActionType;
  targetUserId: string;
  targetUserEmail: string;
  timestamp: number;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  currentlyOnlineUsers: number;
  activeUsers: number;
  newUsers24h: number;
  totalClubs: number;
  totalMatchesPlayed: number;
  premiumUsers: number;
  revenueTotal: number;
  totalPvPMatches: number;
  activePvPMatches: number;
  totalCoinsCirculating: number;
}

export interface GameRealismSettings {
  id: string;
  jobOfferDifficulty: 'easy' | 'realistic' | 'hardcore';
  promotionDifficultyModifier: number; // 0.8 - 1.5
  relegationDifficultyModifier: number; // 0.8 - 1.5
  pvpMatchmakingEloTolerance: number; // e.g. 150
  pvpMinChallengePrize: number; // 100
  pvpMaxChallengePrize: number; // 10000
  minManagerLevelForChallenge: number; // 1
  dailyChallengeLimit: number; // e.g. 20 matches per day
  sameOpponentCooldownMinutes: number; // e.g. 15 minutes cooldown
  eloKFactor: number; // 32
  systemFeePercentage: number; // 0 (or future optional platform sink)
  
  // Economy Rebalancing Multipliers (Part 17)
  matchRewardMultiplier: number; // 0.5 - 2.0
  promotionRewardMultiplier: number; // 0.5 - 2.0
  leagueRewardMultiplier: number; // 0.5 - 2.0
  sponsorRewardMultiplier: number; // 0.5 - 2.0
  transferPriceMultiplier: number; // 0.5 - 3.0
  salaryMultiplier: number; // 0.5 - 2.5
  
  // Compatibility aliases
  pvpMinStakeCoins?: number;
  pvpMaxStakeCoins?: number;
  minManagerLevelForStake?: number;

  updatedAt: number;
  updatedBy: string;
}

export type AdminTab = 'dashboard' | 'world_editor' | 'users' | 'broadcasts' | 'pvp_matches' | 'realism' | 'realism_settings' | 'audit_logs' | 'settings';

