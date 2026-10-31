import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import {
  ActiveNegotiation,
  BoardSystem,
  CalendarDate,
  Club,
  ClubFacilities,
  ClubEconomySummary,
  CurrentSeasonStats,
  CupTournament,
  DailyNewsItem,
  DayAdvanceSummary,
  Fixture,
  FormationType,
  InboxMessage,
  JobOffer,
  LeagueDefinition,
  LeagueStanding,
  ManagerProfile,
  MatchEvent,
  MatchStats,
  Player,
  Position,
  PositionCategory,
  RetiredPlayer,
  SeasonEndSummary,
  SeasonInfo,
  TeamTactics,
  TransferHistoryEntry,
  TransferOffer,
  MatchBlockerInfo,
  SquadValidationResult,
  WorldRankingsData,
  ClubSquadStrength,
  OpponentScoutingReport,
  PlayerAttributes,
  TrainingBoostType,
  StaffMember,
  StaffRole,
  Sponsor,
  SponsorshipOffer,
  SponsorCategory,
  ContinentalTournament,
  ContinentalMatch,
} from '../types/game';
import {
  DailyLoginRewardItem,
  DailyLoginRewardState,
  ClaimDailyRewardResult,
  DAILY_LOGIN_REWARDS_SCHEDULE,
  getLocalTodayDateString,
  calculateDaysDifference,
} from '../types/dailyReward';
import {
  generateIncomingSponsorshipOffers,
  negotiateSponsorshipOffer as negotiateSponsorService,
  getSponsorCategoryLabel,
} from '../services/sponsorshipService';
import { hireStaffMember, getClubStaffBonuses } from '../utils/staffEngine';
import { processPostMatchPlayerUpdates, buildMatchStatsMap } from '../utils/playerFatigueEngine';
import { reorderStartingIdsForFormation, pickBestLineupForFormation } from '../utils/lineupSlots';
import { sanitizeTacticsForManager } from '../utils/tacticalKnowledgeEngine';
import { simulateMultipleLeagueRounds } from '../utils/batchSimulationEngine';
import {
  applyAttributeUpgrade,
  applyOverallBoost,
  applyPotentialBoost,
  applyConditionRecovery,
  StageRewardInfo,
} from '../utils/rewardsEngine';
import { generateOpponentScoutingReport } from '../utils/scoutingEngine';
import { validateSquadLineup, autoFixSquadLineup } from '../utils/squadValidator';
import {
  INITIAL_INBOX,
  INITIAL_MANAGER,
  INITIAL_TEAMS,
  INITIAL_TRANSFER_MARKET,
  generateInitialStandings,
  generateLeagueSchedule,
} from '../data/initialData';
import {
  simulateMatch,
  updateLeagueStandings,
  recalculateStandingsFromFixtures,
  createInitialLiveMatchState,
  simulateMatchStep,
  simulatePenaltyShootout,
  pickGoalScorer,
  LiveSimulationState,
} from '../utils/engine';
import {
  advanceCupTournament,
  calculateSeasonEndSummary,
  generateMasterSeasonAgenda,
  generateSeasonJobOffers,
  generateJobOffersForLeague,
  initNationalCupTournament,
  processNewSeasonAdvancement,
  repairCupProgressionIntegrity,
} from '../utils/seasonEngine';
import {
  evaluateLicenseEligibility,
  settleEndOfSeasonLicenseAndBonus,
  normalizeCoachingLicense,
  CAREER_CONFIG,
  getLicenseTitleArabic,
} from '../utils/careerProgressionEngine';
import { 
  simulateKnockoutMatch,
  initAfricanChampionsLeague,
  initCafConfederationCup,
  initUefaChampionsLeague,
  initUefaEuropaLeague,
  initContinentalTournamentByCode,
  isEuropeanCountry,
  resolveClubContinent,
  resolveClubContinentRegion,
  getTargetContinentForCompetition,
  getContinentalCodesForContinent,
  isClubEligibleForContinentalQualification,
  advanceContinentalTournament,
  recalculateContinentalGroupStandings,
  repairContinentalTournamentIntegrity,
} from '../utils/continentalEngine';
import { getDomesticCupDefinitionForCountry } from '../data/competitionsData';
import { EGYPT_PREMIER_CLUBS } from '../data/arabClubsData';
import {
  addDaysToDate,
  calculateDaysUntilNextMatch,
  checkSeasonRetirements,
  formatCalendarDate,
  generateDailyWorldNews,
  generateInitialBoardSystem,
  getInitialSeasonDate,
  normalizeCalendarDate,
  simulateDailyNegotiations,
  simulateDailySquadTraining,
  parseDateString,
} from '../utils/calendarEngine';
import { generateImmersiveNewsBatch, getInitialFootballNews } from '../services/footballNewsEngine';
import { evaluateMatchImpactOnConfidence, updateDailyBoardConfidence, getClubLeagueTarget } from '../utils/boardEngine';
import { EGYPT_TIER_4_LEAGUE, getLeagueById, GLOBAL_LEAGUES, findClubInWorld, getClubDisplayName, updateLeagueRosterInWorld, getCustomLeagues } from '../data/leaguesData';
import { calculateMatchRevenue, MatchRevenueBreakdown, getBenchmarkTicketPrice } from '../utils/matchRevenue';
import { AdManager } from '../services/adManager';
import { ADMOB_CONFIG } from '../config/admobConfig';
import { notificationService } from '../services/notificationService';
import { DIAGNOSTIC_CONFIG } from '../config/diagnosticConfig';
import { AdRewardType, AdRewardClaimResult } from '../services/adRewardService';
import { getRandomWorldStarTemplate, createGuestStarPlayer, WorldStarTemplate } from '../services/worldStarService';
import { challengesManager, ChallengeReward } from '../services/challengesService';
import { MIGRATION_STORAGE_KEY, runOneTimeWorldMigration, inferClubCountry } from '../utils/worldMigration';
import { validateWorldDatabase, sanitizeWorldPlayerOwnership } from '../utils/worldValidation';
import { isRealClub, loadRealClubSquad } from '../data/realPlayersData';
import { ensureClubSquadIntegrity, calibrateRealisticPlayerRating } from '../utils/playerGenerator';
import { useAuth } from './AuthContext';
import { getLocalTrainerProfile, saveLocalTrainerProfile, generateTrainerId } from '../services/trainerProfileService';
import { gameStateRepository } from '../services/gameStateRepository';
import { timed, runWhenIdle } from '../utils/perfLog';
import { migrateSavePayload, CURRENT_SAVE_FORMAT_VERSION } from '../services/saveBackupService';
import { smartSyncManager, SmartSyncInput } from '../services/smartSyncManager';
import { canPlayerJoinClub, DEFAULT_ECONOMY_CONFIG, calculateClubMonthlyIncome, calculateClubTotalMonthlyWages, validateTransferFinancials } from '../services/economyService';
import { fetchActiveBroadcasts, applyWorldOverridesToClubs, applyWorldOverridesToMarket, isPlayerDeletedInOverrides, SUPER_ADMIN_EMAIL } from '../services/adminService';
import {
  redeemPromoCode,
  validatePromoCodeForRedemption,
  commitValidatedPromoCodeRedemption,
  getOrCreateGuestDeviceId,
} from '../services/promoCodeService';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';
import { validateCareerState, resignManagerFromClub, appointManagerToClub } from '../utils/careerValidator';
import { STAR_RATINGS_OVERRIDES } from '../data/starRatingsOverrides';
import {
  calculatePlayerFairValue,
  calculateContractDurationTransferFee,
  syncPlayerMarketValueWithRating,
  evaluateTransferOffer,
  executeAtomicTransfer,
  findEligibleBuyerClubs,
  generateIncomingAiBids,
  getAllDatabasePlayers,
  resolveClubInfo,
  resolveFullPlayerObject,
  normalizePlayerKey,
  processFreeAgentsAndAiTransfers,
  executeCompetitiveAiTransfersAndGrowth,
  TransferNegotiationProposal,
  NegotiationResult,
} from '../utils/transferEngine';
import {
  checkExpiringContracts,
  getExpiringContractsSummary,
  calculateSuggestedRenewalWage,
} from '../utils/contractAlertEngine';
import {
  generateMonthlyWorldRankings,
  buildRankingsReport,
  calculateDynamicManagerRating,
  calculateSquadStrength,
  calculateMatchRankingPoints,
} from '../utils/rankingsEngine';
import { enrichClubsWithManagers } from '../data/worldManagersData';
import { simulateWorldTransferDay, getTransferWindow, applyWorldMoves, resetWorldTransfers, advanceWorldEra, applyWorldEras, pruneWorldMoves } from '../utils/worldTransferEngine';
import { generateYouthAcademyBatch, promoteYouthProspectToSquad } from '../utils/youthAcademyEngine';
import {
  calculateInitialPlayerSavings,
  COACHING_COURSES,
  ManagerTransaction,
  calculateManagerSeasonBonus,
  calculateWinBonus,
  getCourseAccess,
} from '../utils/managerFinancesEngine';
import { CalendarManager, CalendarScheduleItem } from '../services/calendarManager';
import { SeasonTransitionManager } from '../services/seasonTransitionManager';
import {
  processMatchResult,
  normalizeCompetitionType,
  getCompetitionBranding,
  repairOrphanedCupMatches,
} from '../services/tournamentDispatcher';
import {
  saveWorldStateToDb,
  loadWorldStateFromDb,
  saveActiveLiveMatchToDb,
  loadActiveLiveMatchFromDb,
  clearActiveLiveMatchFromDb,
  saveContinentalCacheToDb,
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
  pruneMatchEventsForStorage,
  pruneFixturesForStorage,
} from '../utils/storage/indexedDbStorage';
import { recordClubTrophiesInWorld } from '../utils/worldStateEngine';

export type LiveMatchState = LiveSimulationState;

interface GameContextType {
  userClub: Club | null;
  isUnemployed: boolean;
  teams: Club[];
  standings: LeagueStanding[];
  fixtures: Fixture[];
  calendarSchedule: CalendarScheduleItem[];
  userCalendarSchedule: CalendarScheduleItem[];
  currentRound: number;
  totalRounds: number;
  manager: ManagerProfile;
  transferMarket: Player[];
  transferHistory: TransferHistoryEntry[];
  incomingBids: TransferOffer[];
  clubEconomy: ClubEconomySummary;
  inbox: InboxMessage[];
  unreadMessagesCount: number;
  liveMatch: LiveMatchState | null;
  discardSavedLiveMatch: () => void;
  seasonFinished: boolean;
  isSimulationRunning: boolean;

  // Multi-Season & Career State
  season: SeasonInfo;
  activeLeague: LeagueDefinition;
  allLeagues: Record<string, LeagueDefinition>;
  seasonEndSummary: SeasonEndSummary | null;
  showSeasonTransitionModal: boolean;
  jobOffers: JobOffer[];
  cupTournament: CupTournament | null;
  africanChampionsLeague: ContinentalTournament | null;
  uefaChampionsLeague?: ContinentalTournament | null;
  deletedMessageIds?: string[];
  switchUserClubToAlAhly: () => { success: boolean; message: string };
  switchContinentalCompetition?: (compCode: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'acl2') => void;
  playAfricanChampionsLeagueMatch: (matchId: string) => { match: ContinentalMatch; message?: string } | null;

  // Calendar, Daily Simulation & Career Systems
  calendarDate: CalendarDate;
  boardSystem: BoardSystem;
  activeNegotiations: ActiveNegotiation[];
  dailyNews: DailyNewsItem[];
  addDailyNews: (newItems: DailyNewsItem[]) => void;
  retiredPlayers: RetiredPlayer[];
  dayAdvanceSummary: DayAdvanceSummary | null;
  showDaySummaryModal: boolean;
  trainingIntensity: 'recovery' | 'normal' | 'high';
  daysUntilNextMatch: number;
  isMatchDay: boolean;

  // Match Blocker & Lineup Validation
  matchBlocker: MatchBlockerInfo | null;
  closeMatchBlocker: () => void;
  autoFixUserStartingLineup: (reopenAsMatchToday?: boolean) => void;
  validateUserLineup: () => SquadValidationResult;

  // Actions
  updateTactics: (tactics: TeamTactics) => void;
  setFormation: (formation: FormationType) => void;
  updateStartingLineup: (startingIds: string[], benchIds: string[]) => void;
  swapPlayers: (sourcePlayerId: string, targetPlayerId: string) => void;
  setCaptainAndSetPieces: (roles: { captainId?: string; penaltyTakerId?: string; freeKickTakerId?: string; cornerTakerId?: string }) => void;
  setPlayerTrainingFocus: (playerId: string, focus: Player['trainingFocus']) => void;
  
  // Day Progression & Calendar Simulation
  advanceToNextDay: (skipToMatch?: boolean, forceAdvance?: boolean) => void | Promise<void>;
  advanceDay?: (skipToMatch?: boolean, forceAdvance?: boolean) => void | Promise<void>;
  advanceCalendarDay: (skipCheck?: boolean) => void;
  forceAdvanceDay: () => void;
  closeDaySummaryModal: () => void;
  setTrainingIntensity: (intensity: 'recovery' | 'normal' | 'high') => void;

  // Match simulation & Live In-Match Actions
  startLiveMatch: (fixtureId?: string) => void;
  pauseLiveMatch: () => void;
  resumeLiveMatch: () => void;
  setMatchSpeed: (speed: 1 | 2 | 4) => void;
  skipLiveMatchToEnd: () => void;
  finishLiveMatchAndAdvance: () => void;
  instantSimulateCurrentRound: (options?: { advanceDate?: boolean; forcePlayUserMatch?: boolean }) => Promise<void>;
  simulateMatchAndAdvanceToNextDay: () => Promise<void>;
  instantSimulateAndAdvance: (matchId?: string) => Promise<void>;
  simulateRoundOnly: (matchId?: string) => Promise<void>;
  simulateMultipleRounds: (roundsCount?: number) => { success: boolean; simulatedCount: number; message: string };
  resumeSecondHalf: (teamTalkMoraleBoost?: boolean) => void;
  makeLiveSubstitution: (outPlayerId: string, inPlayerId: string) => { success: boolean; message: string };
  toggleLiveAutoSubs: () => void;
  recordUserMatchAction: (actionType: 'goal' | 'save' | 'chance' | 'tackle', description?: string, playerName?: string) => void;
  changeLiveMentality: (mentality: TeamTactics['mentality']) => void;
  changeLivePressing: (pressing: TeamTactics['pressingIntensity']) => void;

  // Staff Management
  hireClubStaff: (staffMember: StaffMember) => void;
  fireClubStaff: (role: StaffRole) => void;

  // Transfers & Contracts
  buyPlayer: (player: Player, customFee?: number) => { success: boolean; message: string };
  negotiatePlayerTransfer: (proposal: TransferNegotiationProposal) => { success: boolean; result: NegotiationResult };
  startPlayerNegotiation: (proposal: {
    playerId: string;
    transferFee: number;
    monthlySalary: number;
    contractYears: number;
    squadRole: 'key_player' | 'first_team' | 'rotation' | 'prospect';
  }) => { success: boolean; message: string };
  respondToNegotiationOffer: (
    negotiationId: string,
    action: 'accept_counter' | 'raise_salary' | 'complete_now' | 'cancel',
    extraValue?: number
  ) => { success: boolean; message: string };
  cancelNegotiation: (negotiationId: string) => void;
  acceptSellNegotiation: (negotiationId: string) => { success: boolean; message: string };
  counterSellNegotiation: (negotiationId: string, demandedFee: number) => { success: boolean; message: string };
  rejectSellNegotiation: (negotiationId: string) => { success: boolean; message: string };
  clearCompletedNegotiations: () => void;
  sellPlayer: (playerId: string) => { success: boolean; message: string };
  listPlayerForTransfer: (playerId: string, isListed: boolean) => { success: boolean; message: string };
  releasePlayerContract: (playerId: string) => { success: boolean; message: string };
  acceptIncomingBid: (bidId: string) => { success: boolean; message: string };
  rejectIncomingBid: (bidId: string) => { success: boolean; message: string };
  renewPlayerContract: (playerId: string, wage: number, years: number) => { success: boolean; message: string };
  boostPlayerMorale: (playerId: string) => void;
  holdPlayerMeeting: (playerId: string, topic: 'praise' | 'encourage' | 'promise_gametime' | 'wage_review') => { success: boolean; message: string };
  addBonusToPlayer: (playerId: string, amount: number, source?: 'club' | 'manager' | 'grant') => { success: boolean; message: string };
  addBonusToAllPlayers: (amountPerPlayer: number, source?: 'club' | 'manager' | 'grant') => { success: boolean; message: string };

  // Manager Personal Wealth & Development
  donateToClubFromPersonalWallet: (amount: number) => { success: boolean; message: string };
  enrollInCoachingCourse: (courseId: string) => { success: boolean; message: string };
  unlockCourseForSeason: (courseId: string) => { success: boolean; message: string };

  // Club & Facilities
  upgradeFacility: (facilityKey: keyof ClubFacilities, cost: number) => { success: boolean; message: string };
  treatPlayerInHospital: (playerId: string, treatmentType: 'physio' | 'specialist' | 'prp') => { success: boolean; message: string };
  healPlayerWithAd: (playerId: string) => { success: boolean; message: string };
  cancelPlayerSuspensionWithAd: (playerId: string) => { success: boolean; message: string };
  doubleLiveMatchRevenueWithAd: () => Promise<{ success: boolean; message: string }>;
  rematchLiveMatch: () => Promise<{ success: boolean; message: string }>;
  signWorldStarWithAd: (chosenTemplate?: WorldStarTemplate) => { success: boolean; player?: Player; template?: WorldStarTemplate; message: string };
  setClubTicketPrice: (price: number) => { success: boolean; message: string };
  transferBudgetToWageBudget: (cashAmount: number) => { success: boolean; message: string };
  transferWageToCashBudget: (monthlyAmount: number) => { success: boolean; message: string };
  
  // Youth Academy System
  promoteYouthProspect: (prospectId: string) => { success: boolean; message: string };
  sellYouthProspect: (prospectId: string) => { success: boolean; message: string };
  scoutNewYouthBatch: (cost?: number) => { success: boolean; message: string };

  // Inbox
  markMessageRead: (messageId: string) => void;
  deleteMessage: (messageId: string) => void;
  clearAllMessages: () => void;
  markAllMessagesRead: () => void;

  // Multi-Season & Career Transitions
  startNextSeason: (offerId?: string) => void;
  selectNextSeasonLeague: (leagueId: string) => JobOffer[];
  acceptJobOffer: (offerId: string) => void;
  rejectJobOffer: (offerId: string) => void;
  takeOverClub: (offerId: string) => { success: boolean; message: string };
  openSeasonModal: () => void;
  closeSeasonModal: () => void;
  resignToUnemployed: () => void;
  restartCurrentSeason: () => { success: boolean; message: string };

  // World Rankings & Squad Strength Metrics
  worldRankings: WorldRankingsData | null;
  userSquadStrength: ClubSquadStrength;
  userDynamicManagerRating: number;
  recalculateWorldRankings: (monthStr?: string) => void;

  // Career & Cloud Saves
  saveToCloud: (isManual?: boolean) => Promise<{ success: boolean; message: string }>;
  resetGame: (startingClubId?: string) => void;
  selectStartingClub: (clubId: string) => boolean;
  updateManagerName: (name: string) => void;
  updateTrainerProfile: (name: string, age: number, nationality: string) => void;
  exportCurrentSavePayload: () => any;
  applyLoadedSave: (save: any) => Promise<void> | void;
  runSaveDataMigration: (rawSave: any) => { migratedPayload: any; upgraded: boolean; fromVersion: number; toVersion: number };

  // Scouting & Opponent Spy System
  scoutedOpponents: Record<string, OpponentScoutingReport>;
  scoutOpponent: (oppClubId: string) => { success: boolean; message: string; report?: OpponentScoutingReport };

  // Player Development & Rewards System (نقاط تطوير ومكافآت اللاعبين)
  developmentPoints: number;
  upgradePlayerAttribute: (playerId: string, attribute: keyof PlayerAttributes) => { success: boolean; message: string };
  boostPlayerOverall: (playerId: string) => { success: boolean; message: string };
  boostPlayerPotential: (playerId: string) => { success: boolean; message: string };
  boostPlayerCondition: (playerId: string) => { success: boolean; message: string };
  grantDevelopmentPoints: (amount: number, reason?: string) => void;

  // AdMob Rewarded Economy System (نظام مكافآت الإعلانات الآمن)
  claimAdReward: (rewardType: AdRewardType, boostSubtype?: TrainingBoostType) => { success: boolean; message: string };
  grantChallengeReward: (reward: ChallengeReward) => { success: boolean; message: string };

  // Promo / Gift Codes System (نظام استرداد أكواد الهدايا والمكافآت)
  redeemGiftCode: (
    code: string,
    onAdStarting?: (info: { code: string; rewardAmount: number; rewardCoins: number }) => void
  ) => Promise<{ success: boolean; message: string; rewardAmount?: number; rewardCoins?: number }>;

  // Sponsorship System (نظام عقود الرعاية والشراكات التجارية)
  availableSponsorOffers: SponsorshipOffer[];
  signSponsorshipContract: (offer: SponsorshipOffer) => { success: boolean; message: string };
  terminateSponsorshipContract: (sponsorId: string) => { success: boolean; message: string };
  negotiateSponsorshipOffer: (offerId: string) => { success: boolean; message: string };
  renewSponsorshipContract: (sponsorId: string) => { success: boolean; message: string };
  refreshSponsorshipOffers: () => void;

  // Daily Login Reward System (نظام مكافآت تسجيل الدخول اليومي وتشجيع التفاعل)
  dailyRewardState: DailyLoginRewardState;
  canClaimDailyReward: boolean;
  claimDailyLoginReward: () => ClaimDailyRewardResult;
  showDailyRewardModal: boolean;
  setShowDailyRewardModal: (show: boolean) => void;
  dailyRewardsSchedule: readonly DailyLoginRewardItem[];
}

const STORAGE_KEY = 'anta_el_modareb_save_v1';

const INITIAL_SEASON: SeasonInfo = {
  seasonId: 'season_1',
  seasonNumber: 1,
  startDate: 'الموسم 1',
  endDate: 'نهاية الموسم 1',
  currentRound: 1,
  totalRounds: 34,
  status: 'active',
  leagueId: 'egy_tier_4',
  leagueName: 'دوري الدرجة الرابعة المصري',
  divisionTier: 4,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const INBOX_MAX_MESSAGES = 100;
function capInbox(list: InboxMessage[]): InboxMessage[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: InboxMessage[] = [];
  for (const m of list) {
    if (!m || !m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
    if (out.length >= INBOX_MAX_MESSAGES) break;
  }
  return out;
}

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Concurrency guard to prevent multiple simultaneous simulations and UI freezing
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const isSimulationRunningRef = useRef(false);
  const liveMatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishingMatchRef = useRef(false);
  const isMatchFinishedRef = useRef(false);
  const completedMatchFixtureIdRef = useRef<string | null>(null);

  // Diagnostic render frequency protection (>200 renders within 1 second logs a warning without halting gameplay)
  const providerRenderDiagRef = useRef<{ count: number; windowStart: number; warned: boolean }>({
    count: 0,
    windowStart: Date.now(),
    warned: false,
  });
  const nowRenderTs = Date.now();
  if (nowRenderTs - providerRenderDiagRef.current.windowStart >= 1000) {
    providerRenderDiagRef.current.count = 1;
    providerRenderDiagRef.current.windowStart = nowRenderTs;
    providerRenderDiagRef.current.warned = false;
  } else {
    providerRenderDiagRef.current.count += 1;
    if (providerRenderDiagRef.current.count > 200 && !providerRenderDiagRef.current.warned) {
      providerRenderDiagRef.current.warned = true;
      console.warn(
        `[GameProvider Diagnostics] Render loop warning: GameProvider rendered more than 200 times in 1 second (${providerRenderDiagRef.current.count}).`
      );
    }
  }

  // 1. Season State
  const [season, setSeason] = useState<SeasonInfo>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_season`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.totalRounds || parsed.totalRounds <= 0) {
            parsed.totalRounds = 38;
          }
          return parsed;
        }
      }
      return INITIAL_SEASON;
    } catch {
      return INITIAL_SEASON;
    }
  });

  const [activeLeague, setActiveLeague] = useState<LeagueDefinition>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_activeLeague`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && parsed.id) {
        return getLeagueById(parsed.id) || parsed;
      }
      // Fallback 1: Resolve from saved season leagueId so promoted players never drop back to Division 4
      const savedSeasonRaw = localStorage.getItem(`${STORAGE_KEY}_season`);
      if (savedSeasonRaw) {
        const parsedSeason = JSON.parse(savedSeasonRaw);
        if (parsedSeason?.leagueId) {
          const bySeasonLeague = getLeagueById(parsedSeason.leagueId);
          if (bySeasonLeague) return bySeasonLeague;
        }
      }
      // Fallback 2: Resolve from saved manager currentClubId across GLOBAL_LEAGUES
      const savedMgrRaw = localStorage.getItem(`${STORAGE_KEY}_manager`);
      if (savedMgrRaw) {
        const parsedMgr = JSON.parse(savedMgrRaw);
        if (parsedMgr?.currentClubId) {
          for (const league of Object.values(GLOBAL_LEAGUES)) {
            if ((league.teams || []).some(t => t && t.id === parsedMgr.currentClubId)) {
              return league;
            }
          }
        }
      }
      return EGYPT_TIER_4_LEAGUE;
    } catch {
      return EGYPT_TIER_4_LEAGUE;
    }
  });

  // Normalization Helpers for Safe Loading from LocalStorage
  const normalizeClub = (t: Club): Club => {
    const { countryCode, countryName } = inferClubCountry(t);
    const resolvedCountryCode = t.countryCode || countryCode || 'EGY';
    const countryId = t.countryId || resolvedCountryCode;
    const country = t.country || countryName || 'مصر';
    const leagueId = t.leagueId || (resolvedCountryCode === 'EGY' ? 'egy_tier_4' : `${resolvedCountryCode.toLowerCase()}_tier_${t.division || 1}`);

    // If club is a real club, check if squad is completely empty
    let players = (Array.isArray(t.players) ? t.players : []).filter(Boolean);
    if (isRealClub(t.id) && players.length === 0) {
      players = loadRealClubSquad(t.id).filter(Boolean);
    }

    // Filter out players permanently deleted in admin editor
    players = players.filter(p => p && p.id && !isPlayerDeletedInOverrides(p.id));

    // Ensure every club has a complete, balanced squad of at least 20-22 players
    if (t.id && players.length < 20) {
      const integrityClub = ensureClubSquadIntegrity({
        ...t,
        country,
        countryCode: resolvedCountryCode,
        leagueId,
        players,
      });
      if (Array.isArray(integrityClub?.players) && integrityClub.players.length >= players.length) {
        players = integrityClub.players;
      }
    }

    // Clean up any old fictional Arabic names
    let cleanName = t.name;
    let cleanShortName = t.shortName;
    if (t.id === 'esp1_madrid') { cleanName = 'ريال مدريد'; cleanShortName = 'ريال مدريد'; }
    else if (t.id === 'esp1_barca') { cleanName = 'برشلونة'; cleanShortName = 'برشلونة'; }
    else if (t.id === 'esp1_atletico') { cleanName = 'أتلتيكو مدريد'; cleanShortName = 'أتلتيكو'; }
    else if (t.id === 'eng1_city') { cleanName = 'مانشستر سيتي'; cleanShortName = 'مان سيتي'; }
    else if (t.id === 'eng1_liverpool') { cleanName = 'ليفربول'; cleanShortName = 'ليفربول'; }
    else if (t.id === 'eng1_arsenal') { cleanName = 'أرسنال'; cleanShortName = 'أرسنال'; }
    else if (t.id === 'eng1_united') { cleanName = 'مانشستر يونايتد'; cleanShortName = 'مان يونايتد'; }
    else if (t.id === 'eng1_chelsea') { cleanName = 'تشيلسي'; cleanShortName = 'تشيلسي'; }
    else if (t.id === 'ger_bayern') { cleanName = 'بايرن ميونخ'; cleanShortName = 'بايرن'; }
    else if (t.id === 'ger_dortmund') { cleanName = 'بوروسيا دورتموند'; cleanShortName = 'دورتموند'; }
    else if (t.id === 'ger_leverkusen') { cleanName = 'باير ليفركوزن'; cleanShortName = 'ليفركوزن'; }
    else if (t.id === 'fra_paris') { cleanName = 'باريس سان جيرمان'; cleanShortName = 'باريس'; }
    else if (t.id === 'ita_inter') { cleanName = 'إنتر ميلان'; cleanShortName = 'إنتر'; }
    else if (t.id === 'ita_juve') { cleanName = 'يوفنتوس'; cleanShortName = 'اليوفي'; }
    else if (t.id === 'ita_milan') { cleanName = 'إيه سي ميلان'; cleanShortName = 'ميلان'; }
    else if (t.id === 'sau1_hilal') { cleanName = 'الهلال'; cleanShortName = 'الهلال'; }
    else if (t.id === 'sau1_nassr') { cleanName = 'النصر'; cleanShortName = 'النصر'; }
    else if (t.id === 'sau1_ittihad') { cleanName = 'الاتحاد'; cleanShortName = 'الاتحاد'; }
    else if (t.id === 'sau1_ahli') { cleanName = 'الأهلي السعودي'; cleanShortName = 'الأهلي'; }
    else if (t.id === 'eg1_ahly') { cleanName = 'النادي الأهلي'; cleanShortName = 'الأهلي'; }
    else if (t.id === 'eg1_zamalek') { cleanName = 'نادي الزمالك'; cleanShortName = 'الزمالك'; }
    else if (t.id === 'eg1_pyramids') { cleanName = 'نادي بيراميدز'; cleanShortName = 'بيراميدز'; }
    else if (t.id === 'eg1_ittihad') { cleanName = 'الاتحاد السكندري'; cleanShortName = 'الاتحاد'; }

    const validIdSet = new Set(players.map(p => p.id));
    let startingPlayerIds = Array.isArray(t.tactics?.startingPlayerIds)
      ? t.tactics.startingPlayerIds.filter(id => validIdSet.has(id))
      : [];
    if (startingPlayerIds.length < 11) {
      const hasGk = startingPlayerIds.some(id => players.find(p => p.id === id)?.positionCategory === 'GK');
      if (!hasGk) {
        const gk = players.find(p => p.positionCategory === 'GK' && !startingPlayerIds.includes(p.id));
        if (gk) startingPlayerIds.unshift(gk.id);
      }
      for (const p of players) {
        if (startingPlayerIds.length >= 11) break;
        if (!startingPlayerIds.includes(p.id)) startingPlayerIds.push(p.id);
      }
    }
    let benchPlayerIds = Array.isArray(t.tactics?.benchPlayerIds)
      ? t.tactics.benchPlayerIds.filter(id => validIdSet.has(id) && !startingPlayerIds.includes(id))
      : [];
    if (benchPlayerIds.length < 7) {
      for (const p of players) {
        if (benchPlayerIds.length >= 7) break;
        if (!startingPlayerIds.includes(p.id) && !benchPlayerIds.includes(p.id)) {
          benchPlayerIds.push(p.id);
        }
      }
    }

    let initialBudget = Number.isFinite(t.budget) ? t.budget : 250000;
    if (Array.isArray(t.sponsors) && t.sponsors.length > 0) {
      const sponsorshipTaken = t.sponsors.reduce((sum: number, sp: any) => {
        const signing = sp?.signingBonus || 50000;
        const elapsed = Math.max(0, (sp?.totalDurationMonths || 12) - (sp?.contractMonthsRemaining ?? 12));
        const monthly = (sp?.monthlyPayment || 0) * elapsed;
        return sum + signing + monthly;
      }, 0);
      initialBudget = Math.max(0, initialBudget - sponsorshipTaken);
    }

    return {
      ...t,
      budget: initialBudget,
      name: cleanName,
      shortName: cleanShortName,
      country,
      countryId,
      countryCode: resolvedCountryCode,
      leagueId,
      players: players.map(p => {
        const calibrated = calibrateRealisticPlayerRating(p, t.id, leagueId, t.reputation || 65);
        let effectiveOvr = calibrated.overallRating || p.overallRating || p.rating || 65;
        let effectivePot = Math.max(effectiveOvr, calibrated.potentialRating || p.potentialRating || effectiveOvr);
        let effectiveAttrs = calibrated.attributes || p.attributes || {
          pace: effectiveOvr,
          shooting: Math.max(35, effectiveOvr - 3),
          passing: effectiveOvr,
          dribbling: effectiveOvr,
          defending: Math.max(35, effectiveOvr - 4),
          physical: effectiveOvr,
        };
        let effectiveVal = calibrated.marketValue ?? p.marketValue;

        const starOverride = p.id ? STAR_RATINGS_OVERRIDES[p.id] : undefined;
        if (starOverride) {
          const targetOvr = Math.max(40, Math.min(99, Math.round(starOverride.ovr)));
          // Only apply if current rating is lower; never downgrade developed/trained players
          if (effectiveOvr < targetOvr) {
            effectiveOvr = targetOvr;
            effectivePot = Math.max(effectiveOvr, starOverride.pot ? Math.max(effectiveOvr, starOverride.pot) : effectivePot);
            if (starOverride.attributes) {
              effectiveAttrs = {
                ...effectiveAttrs,
                ...starOverride.attributes,
              };
            }
            effectiveVal = syncPlayerMarketValueWithRating({
              ...p,
              overallRating: effectiveOvr,
              potentialRating: effectivePot,
            });
          }
        }

        return {
          ...p,
          ...calibrated,
          overallRating: effectiveOvr,
          potentialRating: effectivePot,
          marketValue: effectiveVal !== undefined ? effectiveVal : p.marketValue,
          attributes: effectiveAttrs,
          nationality: p.nationality || country,
          nationalityCode: p.nationalityCode || resolvedCountryCode,
          countryOfBirth: p.countryOfBirth || p.nationality || country,
          currentClubId: p.currentClubId || t.id,
          currentLeagueId: p.currentLeagueId || leagueId,
          stats: p.stats || { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0, averageRating: 6.5 },
          savings: p.savings !== undefined ? p.savings : calculateInitialPlayerSavings(p),
          totalBonusesReceived: p.totalBonusesReceived ?? 0,
        };
      }),
      sponsors: [],
      youthAcademyProspects: Array.isArray(t.youthAcademyProspects) && t.youthAcademyProspects.length > 0
        ? t.youthAcademyProspects
        : generateYouthAcademyBatch(t, 1),
      facilities: t.facilities || {
        stadiumName: `${cleanName || 'ملعب الفريق'}`,
        stadiumCapacity: 5000,
        stadiumLevel: 1,
        medicalCenterLevel: 1,
        trainingGroundLevel: 1,
        youthAcademyLevel: 1,
        scoutingNetworkLevel: 1,
      },
      wageBudgetMonthly: typeof t.wageBudgetMonthly === 'number' ? t.wageBudgetMonthly : 0,
      tactics: {
        ...(t.tactics || {}),
        formation: t.tactics?.formation || '4-3-3',
        tacticalStyle: t.tactics?.tacticalStyle || (t.tactics as any)?.playStyle || 'total_football',
        mentality: t.tactics?.mentality || 'balanced',
        passingStyle: t.tactics?.passingStyle || 'short',
        pressingIntensity: t.tactics?.pressingIntensity || 'balanced',
        tempo: t.tactics?.tempo || 'balanced',
        defensiveBlock: t.tactics?.defensiveBlock || 'mid_block',
        buildUpStyle: t.tactics?.buildUpStyle || 'mixed',
        pressingTrap: t.tactics?.pressingTrap || 'none',
        fullbackRole: t.tactics?.fullbackRole || 'balanced',
        strikerRole: t.tactics?.strikerRole || 'poacher',
        startingPlayerIds: Array.isArray(startingPlayerIds) ? startingPlayerIds : [],
        benchPlayerIds: Array.isArray(benchPlayerIds) ? benchPlayerIds : [],
        captainId: t.tactics?.captainId || players[0]?.id || '',
        penaltyTakerId: t.tactics?.penaltyTakerId || players[0]?.id || '',
        freeKickTakerId: t.tactics?.freeKickTakerId || players[0]?.id || '',
        cornerTakerId: t.tactics?.cornerTakerId || players[0]?.id || '',
      },
    };
  };

  const normalizeStanding = (s: LeagueStanding): LeagueStanding => ({
    ...s,
    form: Array.isArray(s?.form) ? s.form : [],
    won: s?.won ?? 0,
    drawn: s?.drawn ?? 0,
    lost: s?.lost ?? 0,
    goalsFor: s?.goalsFor ?? 0,
    goalsAgainst: s?.goalsAgainst ?? 0,
    goalDifference: s?.goalDifference ?? 0,
    points: s?.points ?? 0,
    played: s?.played ?? 0,
  });

  const normalizeManagerProfile = (parsed: any): ManagerProfile => {
    let effectiveName = parsed?.name || INITIAL_MANAGER.name;
    let effectiveAge = parsed?.age || INITIAL_MANAGER.age;
    let effectiveNationality = parsed?.nationality || INITIAL_MANAGER.nationality;

    try {
      const localTrainer = getLocalTrainerProfile();
      if (localTrainer?.name && (!parsed?.name || parsed.name === 'الكابتن الجديد' || parsed.name === 'المدرب الجديد')) {
        effectiveName = localTrainer.name;
      }
      if (localTrainer?.age && (!parsed?.age || parsed.age === 34 || parsed.age === 35)) {
        effectiveAge = localTrainer.age;
      }
      if (localTrainer?.nationality && (!parsed?.nationality || parsed.nationality === 'مصري')) {
        effectiveNationality = localTrainer.nationality;
      }
    } catch {}

    const matches = parsed?.matchesManaged ?? parsed?.careerMatches ?? 0;
    const completedSeasons = parsed?.totalSeasonsCompleted ?? Math.max(0, (parsed?.totalSeasons || 1) - 1);
    const existingMinutes = typeof parsed?.totalPlayTimeMinutes === 'number' ? parsed.totalPlayTimeMinutes : 0;
    const migratedPlayTimeMinutes = existingMinutes > 0
      ? existingMinutes
      : (matches > 0 ? (matches * 4 + completedSeasons * 20) : 0);

    const existingDeveloped = typeof parsed?.totalPlayersDeveloped === 'number' ? parsed.totalPlayersDeveloped : 0;
    const migratedPlayersDeveloped = existingDeveloped > 0
      ? existingDeveloped
      : Math.max(0, Math.floor((parsed?.developmentPoints || 0) / 15));

    return {
      ...INITIAL_MANAGER,
      ...parsed,
      name: effectiveName,
      age: effectiveAge,
      nationality: effectiveNationality,
      isUnemployed: false,
      employmentStatus: 'employed',
      monthlySalary: parsed?.monthlySalary ?? 25000,
      personalWallet: parsed?.personalWallet !== undefined ? parsed.personalWallet : (parsed?.careerEarnings ? Math.round(parsed.careerEarnings * 0.8) : 65000),
      financialTransactions: Array.isArray(parsed?.financialTransactions) && parsed.financialTransactions.length > 0
        ? parsed.financialTransactions
        : INITIAL_MANAGER.financialTransactions,
      completedCourses: Array.isArray(parsed?.completedCourses) ? parsed.completedCourses : [],
      license: normalizeCoachingLicense(parsed?.license),
      seasonCourseAccess: (parsed?.seasonCourseAccess && typeof parsed.seasonCourseAccess === 'object') ? parsed.seasonCourseAccess : {},
      totalClubDonations: parsed?.totalClubDonations ?? 0,
      totalBonusesEarned: parsed?.totalBonusesEarned ?? 0,
      matchesManaged: matches,
      wins: parsed?.wins ?? parsed?.careerWins ?? 0,
      draws: parsed?.draws ?? parsed?.careerDraws ?? 0,
      losses: parsed?.losses ?? parsed?.careerLosses ?? 0,
      totalPlayTimeMinutes: migratedPlayTimeMinutes,
      totalPlayersDeveloped: migratedPlayersDeveloped,
      tacticalExperience: parsed?.tacticalExperience && typeof parsed.tacticalExperience === 'object'
        ? { ...INITIAL_MANAGER.tacticalExperience, ...parsed.tacticalExperience }
        : (INITIAL_MANAGER.tacticalExperience || {}),
      tacticalKnowledge: Array.isArray(parsed?.tacticalKnowledge)
        ? parsed.tacticalKnowledge
        : (INITIAL_MANAGER.tacticalKnowledge || []),
      trophies: Array.isArray(parsed?.trophies) ? parsed.trophies : [],
      history: Array.isArray(parsed?.history)
        ? parsed.history.map((h: any) => ({
            ...h,
            trophiesWon: Array.isArray(h?.trophiesWon) ? h.trophiesWon : [],
          }))
        : [],
      clubsManaged: Array.isArray(parsed?.clubsManaged) ? parsed.clubsManaged : INITIAL_MANAGER.clubsManaged,
      countriesManaged: Array.isArray(parsed?.countriesManaged) ? parsed.countriesManaged : INITIAL_MANAGER.countriesManaged,
    };
  };

  const normalizeCup = (cup: any): CupTournament | null => {
    if (!cup) return null;
    return {
      ...cup,
      rounds: Array.isArray(cup.rounds)
        ? cup.rounds.map((r: any) => ({
            ...r,
            matches: Array.isArray(r?.matches) ? r.matches : [],
          }))
        : [],
    };
  };

  // 2. Teams, Standings, Fixtures, Manager with Career State Validation
  const [manager, setManager] = useState<ManagerProfile>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_manager`);
      if (saved) {
        return normalizeManagerProfile(JSON.parse(saved));
      }
      const localTrainer = getLocalTrainerProfile();
      if (localTrainer?.name) {
        return normalizeManagerProfile({
          name: localTrainer.name,
          age: localTrainer.age || 35,
          nationality: localTrainer.nationality || 'مصري',
        });
      }
      return INITIAL_MANAGER;
    } catch {
      return INITIAL_MANAGER;
    }
  });

  const [teams, setTeams] = useState<Club[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_teams`);
      const savedMarketRaw = localStorage.getItem(`${STORAGE_KEY}_transferMarket`);
      const savedMarket = savedMarketRaw ? JSON.parse(savedMarketRaw) : INITIAL_TRANSFER_MARKET;

      let rawTeams = (activeLeague?.teams && activeLeague.teams.length > 0) ? activeLeague.teams : INITIAL_TEAMS;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawTeams = parsed.map(normalizeClub);
        }
      }

      // Execute one-time world migration to upgrade any old schema
      const activeLeagueId = activeLeague?.id || 'egy_tier_4';
      const migrationResult = runOneTimeWorldMigration(rawTeams, savedMarket, activeLeagueId);
      const normalizedTeams = migrationResult.teams.map(normalizeClub);
      const overriddenTeams = applyWorldOverridesToClubs(normalizedTeams);

      // Validate career state invariant
      const validated = validateCareerState(manager, overriddenTeams, GLOBAL_LEAGUES);
      return validated.teams;
    } catch {
      const fallbackLeagueTeams = (activeLeague?.teams && activeLeague.teams.length > 0) ? activeLeague.teams : INITIAL_TEAMS;
      const activeLeagueId = activeLeague?.id || 'egy_tier_4';
      const migrationResult = runOneTimeWorldMigration(fallbackLeagueTeams, INITIAL_TRANSFER_MARKET, activeLeagueId);
      const normalizedTeams = migrationResult.teams.map(normalizeClub);
      const overriddenTeams = applyWorldOverridesToClubs(normalizedTeams);
      const validated = validateCareerState(manager, overriddenTeams, GLOBAL_LEAGUES);
      return validated.teams;
    }
  });

  const isUnemployed = false;
  const userClub: Club = useMemo(() => {
    const validTeams = (Array.isArray(teams) ? teams : []).filter(t => t && t.id);
    let club: Club;
    if (manager?.currentClubId) {
      const byId = validTeams.find(t => t.id === manager.currentClubId);
      club = byId || validTeams.find(t => t.isUserClub) || validTeams[0] || INITIAL_TEAMS[0];
    } else {
      club = validTeams.find(t => t.isUserClub) || validTeams[0] || INITIAL_TEAMS[0];
    }

    if (club && Array.isArray(club.players)) {
      const cleanPlayers = club.players.filter(Boolean);
      if (cleanPlayers.length !== club.players.length) {
        return {
          ...club,
          players: cleanPlayers,
        };
      }
    }
    return club;
  }, [teams, manager?.currentClubId]);

  // Invariant: exactly the club the manager coaches carries isUserClub. Many actions (facility upgrades,
  // training, tactics...) locate "my club" by that flag; when it drifted (job changes, old saves) they
  // silently changed nothing while the money was still spent.
  useEffect(() => {
    const id = manager?.currentClubId;
    if (!id || manager?.isUnemployed || !Array.isArray(teams)) return;
    if (!teams.some(t => t && t.id === id)) return;
    const drifted = teams.some(t => t && t.id && ((t.id === id) !== !!t.isUserClub));
    if (!drifted) return;
    setTeams(prev => prev.map(t => (t && t.id && ((t.id === id) !== !!t.isUserClub)) ? { ...t, isUserClub: t.id === id } : t));
  }, [teams, manager?.currentClubId, manager?.isUnemployed]);

  const teamsRef = useRef<Club[]>(teams);
  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  const userTacticsRef = useRef<TeamTactics | undefined>(userClub?.tactics);
  useEffect(() => {
    userTacticsRef.current = userClub?.tactics;
  }, [userClub?.tactics]);

  const userClubRef = useRef<Club>(userClub);
  useEffect(() => {
    userClubRef.current = userClub;
  }, [userClub]);

  const activeLeagueRef = useRef<LeagueDefinition>(activeLeague);
  useEffect(() => {
    activeLeagueRef.current = activeLeague;
  }, [activeLeague]);

  const [standings, setStandings] = useState<LeagueStanding[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_standings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeStanding);
        }
      }
      return generateInitialStandings(INITIAL_TEAMS).map(normalizeStanding);
    } catch {
      return generateInitialStandings(INITIAL_TEAMS).map(normalizeStanding);
    }
  });

  const [fixtures, setFixtures] = useState<Fixture[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_fixtures`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(
            (f: any) =>
              f &&
              typeof f === 'object' &&
              f.id &&
              normalizeCompetitionType(
                f.competitionType || f.tournamentId || f.competitionId || (f.cupStage ? 'DOMESTIC_COP' : undefined)
              ) === 'LEAGUE'
          );
          const hasDates = clean.some((f: any) => Boolean(f?.date));
          if (hasDates && clean.length > 0) {
            return clean;
          }
        }
      }
      return CalendarManager.generateMasterSchedule({
        seasonNumber: 1,
        activeLeague: EGYPT_TIER_4_LEAGUE,
        teams: INITIAL_TEAMS,
        userClub: INITIAL_TEAMS.find(t => t.isUserClub) || INITIAL_TEAMS[0],
      });
    } catch {
      return CalendarManager.generateMasterSchedule({
        seasonNumber: 1,
        activeLeague: EGYPT_TIER_4_LEAGUE,
        teams: INITIAL_TEAMS,
        userClub: INITIAL_TEAMS.find(t => t.isUserClub) || INITIAL_TEAMS[0],
      });
    }
  });

  const [currentRound, setCurrentRound] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_currentRound`);
      return saved ? JSON.parse(saved) : 1;
    } catch {
      return 1;
    }
  });

  // 4. Transfers & Inbox
  const [transferMarket, setTransferMarket] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transferMarket`);
      const rawMarket = saved ? JSON.parse(saved) : INITIAL_TRANSFER_MARKET;
      const activeLeagueId = activeLeague?.id || 'egy_tier_4';
      const migrationResult = runOneTimeWorldMigration(teams || INITIAL_TEAMS, rawMarket, activeLeagueId);
      return applyWorldOverridesToMarket(migrationResult.transferMarket);
    } catch {
      return applyWorldOverridesToMarket(INITIAL_TRANSFER_MARKET);
    }
  });

  const [incomingBids, setIncomingBids] = useState<TransferOffer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_incomingBids`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [deletedMessageIds, setDeletedMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_deletedMessageIds`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inbox, setInboxRaw] = useState<InboxMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_inbox`);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return capInbox(parsed);
        }
      }
      return INITIAL_INBOX;
    } catch {
      return INITIAL_INBOX;
    }
  });

  // Central inbox guard: every write goes through here so the list can never grow
  // unbounded (which used to bloat every save/render and freeze the game).
  const setInbox = useCallback((value: InboxMessage[] | ((prev: InboxMessage[]) => InboxMessage[])) => {
    setInboxRaw(prev => {
      const base = Array.isArray(prev) ? prev : [];
      const next = typeof value === 'function' ? (value as (p: InboxMessage[]) => InboxMessage[])(base) : value;
      return capInbox(next);
    });
  }, []);

  // 5. Domestic Cup & Continental Tournaments (Disabled for smooth League-only calendar & performance)
  const [cupTournament, setCupTournament] = useState<CupTournament | null>(null);
  const [africanChampionsLeague, setAfricanChampionsLeague] = useState<ContinentalTournament | null>(null);

  const fixturesRef = useRef(fixtures);
  fixturesRef.current = fixtures;

  useEffect(() => {
    safeLocalStorageRemove(`${STORAGE_KEY}_cupTournament`);
    safeLocalStorageRemove(`${STORAGE_KEY}_africanChampionsLeague`);
    if (cupTournament !== null) setCupTournament(null);
    if (africanChampionsLeague !== null) setAfricanChampionsLeague(null);
    // Clean any legacy non-league fixtures from active state
    setFixtures(prev => {
      if (!Array.isArray(prev)) return prev;
      const hasNonLeague = prev.some(f => {
        const normType = normalizeCompetitionType(
          f?.competitionType || f?.tournamentId || f?.competitionId || (f?.cupStage ? 'DOMESTIC_COP' : undefined)
        );
        return normType !== 'LEAGUE';
      });
      if (!hasNonLeague) return prev;
      return prev.filter(f => {
        const normType = normalizeCompetitionType(
          f?.competitionType || f?.tournamentId || f?.competitionId || (f?.cupStage ? 'DOMESTIC_COP' : undefined)
        );
        return normType === 'LEAGUE';
      });
    });
  }, [cupTournament, africanChampionsLeague]);

  // 6. Job Offers & Season End Summary
  const [jobOffers, setJobOffers] = useState<JobOffer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_jobOffers`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [seasonEndSummary, setSeasonEndSummary] = useState<SeasonEndSummary | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_seasonEndSummary`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showSeasonTransitionModal, setShowSeasonTransitionModal] = useState<boolean>(false);

  // Season-end heavy work (job offers) and the full-screen modal are deferred a few hundred ms so the
  // match-result commit renders first. Opening everything in one tick froze low-end Android WebViews.
  const seasonEndScheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSeasonEndOffersAndModal = (buildOffers: () => ReturnType<typeof generateSeasonJobOffers>) => {
    if (seasonEndScheduleRef.current) clearTimeout(seasonEndScheduleRef.current);
    seasonEndScheduleRef.current = setTimeout(() => {
      seasonEndScheduleRef.current = null;
      try {
        setJobOffers(timed('generateSeasonJobOffers', buildOffers));
      } catch (offersErr) {
        console.warn('[SeasonEnd] Job offers generation failed:', offersErr);
      }
      setShowSeasonTransitionModal(true);
    }, 400);
  };
  const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(null);

  const clearMatchSimulationTimers = useCallback(() => {
    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }
    isMatchFinishedRef.current = false;
    lastSavedMinuteRef.current = -1;
    clearActiveLiveMatchFromDb();
  }, []);

  const discardSavedLiveMatch = useCallback(() => {
    clearMatchSimulationTimers();
    liveMatchRef.current = null;
    setLiveMatch(null);
  }, [clearMatchSimulationTimers]);

  const lastSavedMinuteRef = useRef<number>(-1);
  const liveMatchRef = useRef<LiveMatchState | null>(liveMatch);

  useEffect(() => {
    liveMatchRef.current = liveMatch;
  }, [liveMatch]);

  // Migrate legacy localStorage _active_live_match (if present) and restore any active in-progress live match from IndexedDB on initial mount
  useEffect(() => {
    let cancelled = false;

    const restoreMatchFromCandidate = (candidate: any): any | null => {
      try {
        if (!candidate || !candidate.fixture) return null;
        if (typeof candidate.currentMinute !== 'number' || candidate.currentMinute < 0 || candidate.currentMinute >= 90) return null;
        if (candidate.fixture.isPlayed === true || candidate.isFinished === true) return null;

        // Backward compatibility: legacy saves with complete team squad objects
        if (
          candidate.homeTeam &&
          typeof candidate.homeTeam === 'object' &&
          Array.isArray(candidate.homeTeam.players) &&
          candidate.homeTeam.players.length > 0 &&
          candidate.awayTeam &&
          typeof candidate.awayTeam === 'object' &&
          Array.isArray(candidate.awayTeam.players) &&
          candidate.awayTeam.players.length > 0
        ) {
          const homeStartingIds: string[] = candidate.homeTeam.tactics?.startingPlayerIds || [];
          const awayStartingIds: string[] = candidate.awayTeam.tactics?.startingPlayerIds || [];
          const legacyHomeLineup: string[] = Array.isArray(candidate.homeLineup) && candidate.homeLineup.length > 0
            ? candidate.homeLineup.map((p: any) => typeof p === 'string' ? p : p?.id).filter(Boolean)
            : homeStartingIds.filter(id => candidate.homeTeam.players.some((p: any) => p?.id === id));
          const legacyAwayLineup: string[] = Array.isArray(candidate.awayLineup) && candidate.awayLineup.length > 0
            ? candidate.awayLineup.map((p: any) => typeof p === 'string' ? p : p?.id).filter(Boolean)
            : awayStartingIds.filter(id => candidate.awayTeam.players.some((p: any) => p?.id === id));

          const defHomeFatigue: Record<string, number> = {};
          legacyHomeLineup.forEach((id: string) => { if (id) defHomeFatigue[id] = 100; });
          const defAwayFatigue: Record<string, number> = {};
          legacyAwayLineup.forEach((id: string) => { if (id) defAwayFatigue[id] = 100; });

          return {
            ...candidate,
            homeLineup: legacyHomeLineup,
            awayLineup: legacyAwayLineup,
            homeFatigueMap: candidate.homeFatigueMap && Object.keys(candidate.homeFatigueMap).length > 0
              ? candidate.homeFatigueMap
              : defHomeFatigue,
            awayFatigueMap: candidate.awayFatigueMap && Object.keys(candidate.awayFatigueMap).length > 0
              ? candidate.awayFatigueMap
              : defAwayFatigue,
            homeYellowedPlayerIds: Array.isArray(candidate.homeYellowedPlayerIds) ? candidate.homeYellowedPlayerIds : [],
            awayYellowedPlayerIds: Array.isArray(candidate.awayYellowedPlayerIds) ? candidate.awayYellowedPlayerIds : [],
            homeReddedPlayerIds: Array.isArray(candidate.homeReddedPlayerIds) ? candidate.homeReddedPlayerIds : [],
            awayReddedPlayerIds: Array.isArray(candidate.awayReddedPlayerIds) ? candidate.awayReddedPlayerIds : [],
            homeXg: candidate.homeXg ?? 0,
            awayXg: candidate.awayXg ?? 0,
            homeDangerousAttacks: candidate.homeDangerousAttacks ?? 0,
            awayDangerousAttacks: candidate.awayDangerousAttacks ?? 0,
            aiSubstitutionsCount: candidate.aiSubstitutionsCount ?? 0,
            speed: candidate.speed || 1,
            isPlaying: false,
          };
        }

        // Lightweight format: Reconstruct teams from current teams state or world database
        const currentTeams = teamsRef.current?.length ? teamsRef.current : teams;
        const homeId = candidate.homeTeamId || candidate.homeTeam?.id || candidate.fixture.homeTeamId;
        const awayId = candidate.awayTeamId || candidate.awayTeam?.id || candidate.fixture.awayTeamId;

        if (!homeId || !awayId) return null;

        const homeClub = currentTeams.find(t => t.id === homeId) || findClubInWorld(homeId);
        const awayClub = currentTeams.find(t => t.id === awayId) || findClubInWorld(awayId);

        // If either club is missing from world, erase save instead of opening broken match
        if (!homeClub || !awayClub) {
          console.warn('[LiveMatchRestore] Club missing from world state for saved match, clearing:', { homeId, awayId });
          return null;
        }

        const restoredHome = {
          ...homeClub,
          tactics: {
            ...(homeClub.tactics || {}),
            ...(candidate.homeTactics || {}),
            startingPlayerIds: candidate.homeStartingPlayerIds || candidate.homeTactics?.startingPlayerIds || homeClub.tactics?.startingPlayerIds || [],
            benchPlayerIds: candidate.homeBenchPlayerIds || candidate.homeTactics?.benchPlayerIds || homeClub.tactics?.benchPlayerIds || [],
          },
        };

        const restoredAway = {
          ...awayClub,
          tactics: {
            ...(awayClub.tactics || {}),
            ...(candidate.awayTactics || {}),
            startingPlayerIds: candidate.awayStartingPlayerIds || candidate.awayTactics?.startingPlayerIds || awayClub.tactics?.startingPlayerIds || [],
            benchPlayerIds: candidate.awayBenchPlayerIds || candidate.awayTactics?.benchPlayerIds || awayClub.tactics?.benchPlayerIds || [],
          },
        };

        const homeStartingIds: string[] = restoredHome.tactics?.startingPlayerIds || [];
        const awayStartingIds: string[] = restoredAway.tactics?.startingPlayerIds || [];

        const resolvedHomeLineup: string[] = Array.isArray(candidate.homeLineup) && candidate.homeLineup.length > 0
          ? candidate.homeLineup.map((p: any) => typeof p === 'string' ? p : p?.id).filter(Boolean)
          : homeStartingIds.filter(id => restoredHome.players.some((p: any) => p?.id === id));

        const resolvedAwayLineup: string[] = Array.isArray(candidate.awayLineup) && candidate.awayLineup.length > 0
          ? candidate.awayLineup.map((p: any) => typeof p === 'string' ? p : p?.id).filter(Boolean)
          : awayStartingIds.filter(id => restoredAway.players.some((p: any) => p?.id === id));

        const defaultHomeFatigue: Record<string, number> = {};
        resolvedHomeLineup.forEach((id: string) => { if (id) defaultHomeFatigue[id] = 100; });

        const defaultAwayFatigue: Record<string, number> = {};
        resolvedAwayLineup.forEach((id: string) => { if (id) defaultAwayFatigue[id] = 100; });

        return {
          ...candidate,
          homeTeam: restoredHome,
          awayTeam: restoredAway,
          homeTactics: restoredHome.tactics,
          awayTactics: restoredAway.tactics,
          homeLineup: resolvedHomeLineup,
          awayLineup: resolvedAwayLineup,
          homeFatigueMap: candidate.homeFatigueMap && Object.keys(candidate.homeFatigueMap).length > 0
            ? candidate.homeFatigueMap
            : defaultHomeFatigue,
          awayFatigueMap: candidate.awayFatigueMap && Object.keys(candidate.awayFatigueMap).length > 0
            ? candidate.awayFatigueMap
            : defaultAwayFatigue,
          homeYellowedPlayerIds: Array.isArray(candidate.homeYellowedPlayerIds) ? candidate.homeYellowedPlayerIds : [],
          awayYellowedPlayerIds: Array.isArray(candidate.awayYellowedPlayerIds) ? candidate.awayYellowedPlayerIds : [],
          homeReddedPlayerIds: Array.isArray(candidate.homeReddedPlayerIds) ? candidate.homeReddedPlayerIds : [],
          awayReddedPlayerIds: Array.isArray(candidate.awayReddedPlayerIds) ? candidate.awayReddedPlayerIds : [],
          homeXg: candidate.homeXg ?? 0,
          awayXg: candidate.awayXg ?? 0,
          homeDangerousAttacks: candidate.homeDangerousAttacks ?? 0,
          awayDangerousAttacks: candidate.awayDangerousAttacks ?? 0,
          aiSubstitutionsCount: candidate.aiSubstitutionsCount ?? 0,
          speed: candidate.speed || 1,
          isPlaying: false,
        };
      } catch (err) {
        console.warn('[LiveMatchRestore] Error restoring match candidate:', err);
        return null;
      }
    };

    const migrateAndRestoreLiveMatch = async () => {
      const legacyMatchKey = `${STORAGE_KEY}_active_live_match`;
      try {
        const legacyRaw = localStorage.getItem(legacyMatchKey);
        if (legacyRaw !== null) {
          let parsedLegacy: any = null;
          try {
            parsedLegacy = JSON.parse(legacyRaw);
          } catch {
            parsedLegacy = null;
          }
          const restoredLegacy = restoreMatchFromCandidate(parsedLegacy);
          if (restoredLegacy) {
            await saveActiveLiveMatchToDb(restoredLegacy);
            try {
              localStorage.removeItem(legacyMatchKey);
            } catch {}
            if (!cancelled) {
              setLiveMatch(prev => prev || restoredLegacy);
            }
            return;
          } else {
            try {
              localStorage.removeItem(legacyMatchKey);
            } catch {}
          }
        }
      } catch {
        try {
          localStorage.removeItem(legacyMatchKey);
        } catch {}
      }

      try {
        const savedMatch = await loadActiveLiveMatchFromDb();
        if (cancelled || !savedMatch) return;
        const restored = restoreMatchFromCandidate(savedMatch);
        if (restored) {
          setLiveMatch(prev => prev || restored);
        } else {
          clearActiveLiveMatchFromDb();
        }
      } catch (err) {
        console.warn('[LiveMatchRestore] Notice reading saved match:', err);
        clearActiveLiveMatchFromDb();
      }
    };

    migrateAndRestoreLiveMatch();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveLiveMatchToStorage = useCallback((matchToSave: LiveMatchState | null) => {
    if (matchToSave && !matchToSave.isFinished) {
      saveActiveLiveMatchToDb(matchToSave);
    } else {
      clearActiveLiveMatchFromDb();
    }
  }, []);

  // Save liveMatch only when paused, at minutes 45 and 90, every 10 match minutes, or when match is discarded
  useEffect(() => {
    if (!liveMatch) {
      lastSavedMinuteRef.current = -1;
      saveLiveMatchToStorage(null);
      return;
    }

    const min = liveMatch.currentMinute;
    const shouldSaveMinute = min === 45 || min === 90 || (min > 0 && min % 10 === 0);
    const isMinuteTrigger = shouldSaveMinute && lastSavedMinuteRef.current !== min;
    const isPausedTrigger = !liveMatch.isPlaying;

    if (isPausedTrigger || isMinuteTrigger) {
      lastSavedMinuteRef.current = min;
      saveLiveMatchToStorage(liveMatch);
    }
  }, [liveMatch, saveLiveMatchToStorage]);

  // Save liveMatch when app is closed, backgrounded or page unloaded
  useEffect(() => {
    const handleAppUnloadOrHide = () => {
      if (liveMatchRef.current) {
        saveLiveMatchToStorage(liveMatchRef.current);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', handleAppUnloadOrHide);
      window.addEventListener('pagehide', handleAppUnloadOrHide);
      return () => {
        window.removeEventListener('visibilitychange', handleAppUnloadOrHide);
        window.removeEventListener('pagehide', handleAppUnloadOrHide);
      };
    }
  }, [saveLiveMatchToStorage]);

  // 7. Transfer History & Club Economy Summary
  const [transferHistory, setTransferHistory] = useState<TransferHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_transferHistory`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [clubEconomy, setClubEconomy] = useState<ClubEconomySummary>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_clubEconomy`);
      return saved ? JSON.parse(saved) : {
        clubBudget: 250000,
        transferSpendingTotal: 0,
        transferIncomeTotal: 0,
        salaryExpensesTotal: 0,
        sponsorIncomeTotal: 0,
        matchIncomeTotal: 0,
        facilitySpendingTotal: 0,
        currentSeasonNetProfit: 0,
      };
    } catch {
      return {
        clubBudget: 250000,
        transferSpendingTotal: 0,
        transferIncomeTotal: 0,
        salaryExpensesTotal: 0,
        sponsorIncomeTotal: 0,
        matchIncomeTotal: 0,
        facilitySpendingTotal: 0,
        currentSeasonNetProfit: 0,
      };
    }
  });

  // 8. Career Mode: Calendar, Negotiations, Board, News & Simulation States
  const [calendarDate, setCalendarDate] = useState<CalendarDate>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_calendarDate`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalizeCalendarDate(parsed, season.seasonNumber || 1);
      }
      return getInitialSeasonDate(season.seasonNumber || 1);
    } catch {
      return getInitialSeasonDate(season?.seasonNumber || 1);
    }
  });

  // Synchronize calendarDate to localStorage so it is always preserved across sessions/reloads
  useEffect(() => {
    try {
      if (calendarDate && calendarDate.rawDateStr) {
        localStorage.setItem(`${STORAGE_KEY}_calendarDate`, JSON.stringify(calendarDate));
      }
    } catch (err) {
      console.warn('[GameContext] Failed to sync calendarDate to localStorage:', err);
    }
  }, [calendarDate]);

  const [activeNegotiations, setActiveNegotiations] = useState<ActiveNegotiation[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_activeNegotiations`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [boardSystem, setBoardSystem] = useState<BoardSystem>(() => {
    try {
      const tempUserClub = teams.find(t => t.isUserClub) || teams[0];
      const targetInfo = getClubLeagueTarget(tempUserClub, activeLeague.tier || 4, activeLeague.teams.length || teams.length, activeLeague.teams || teams, tempUserClub.isNewlyPromoted);
      const saved = localStorage.getItem(`${STORAGE_KEY}_boardSystem`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Automatically sync and correct targets to match realistic standards if mismatched
        if (parsed.targetLeaguePosition !== targetInfo.targetPosition) {
          return {
            ...parsed,
            targetLeaguePosition: targetInfo.targetPosition,
            targetLeaguePositionText: targetInfo.targetPositionText,
            leagueTarget: targetInfo.leagueTarget,
            cupTarget: targetInfo.cupTarget,
            objectives: (parsed.objectives || []).map((o: any) => {
              if (o.id === 'obj_league' || o.category === 'league') {
                return {
                  ...o,
                  targetDescription: `الوصول إلى ${targetInfo.targetPositionText} - ${targetInfo.leagueTarget}`,
                  importance: targetInfo.importance,
                };
              }
              return o;
            }),
          };
        }
        return parsed;
      }
      return generateInitialBoardSystem(tempUserClub, activeLeague.tier || 4, activeLeague.teams.length || teams.length, activeLeague.teams || teams, tempUserClub.isNewlyPromoted);
    } catch {
      const tempUserClub = teams.find(t => t.isUserClub) || teams[0];
      return generateInitialBoardSystem(tempUserClub, 4, teams.length, teams, false);
    }
  });

  const [dailyNews, setDailyNews] = useState<DailyNewsItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_dailyNews`);
      const parsed = saved ? JSON.parse(saved) : [];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validNews = parsed.filter(item => item && item.id && item.title);
        if (validNews.length > 0) return validNews;
      }
      return getInitialFootballNews();
    } catch {
      return getInitialFootballNews();
    }
  });

  const addDailyNews = useCallback((newItems: DailyNewsItem[]) => {
    const validItems = (Array.isArray(newItems) ? newItems : []).filter(item => item && item.id);
    setDailyNews(prev => [...validItems, ...prev].slice(0, 40));
  }, []);

  const [retiredPlayers, setRetiredPlayers] = useState<RetiredPlayer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_retiredPlayers`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dayAdvanceSummary, setDayAdvanceSummary] = useState<DayAdvanceSummary | null>(null);
  const [showDaySummaryModal, setShowDaySummaryModal] = useState<boolean>(false);
  const [trainingIntensity, setTrainingIntensity] = useState<'recovery' | 'normal' | 'high'>('normal');
  const [matchBlocker, setMatchBlocker] = useState<MatchBlockerInfo | null>(null);

  // --- Daily Login Reward State (نظام مكافآت تسجيل الدخول اليومي) ---
  const [dailyRewardState, setDailyRewardState] = useState<DailyLoginRewardState>(() => {
    try {
      const saved = localStorage.getItem('anta_el_modareb_daily_login_rewards_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
            lastClaimDate: typeof parsed.lastClaimDate === 'string' ? parsed.lastClaimDate : null,
            totalDaysClaimed: typeof parsed.totalDaysClaimed === 'number' ? parsed.totalDaysClaimed : 0,
            lastClaimTimestamp: typeof parsed.lastClaimTimestamp === 'number' ? parsed.lastClaimTimestamp : null,
            history: Array.isArray(parsed.history) ? parsed.history : [],
          };
        }
      }
    } catch (_) {}
    return {
      streak: 0,
      lastClaimDate: null,
      totalDaysClaimed: 0,
      lastClaimTimestamp: null,
      history: [],
    };
  });

  const [showDailyRewardModal, setShowDailyRewardModal] = useState<boolean>(false);

  const canClaimDailyReward = useMemo(() => {
    if (!dailyRewardState.lastClaimDate) return true;
    const todayStr = getLocalTodayDateString();
    const daysDiff = calculateDaysDifference(dailyRewardState.lastClaimDate, todayStr);
    return daysDiff >= 1;
  }, [dailyRewardState.lastClaimDate]);

  // Prompt the user once per browser session if a daily reward is waiting
  useEffect(() => {
    if (canClaimDailyReward) {
      try {
        let hasPrompted = false;
        try {
          hasPrompted = Boolean(sessionStorage.getItem('anta_daily_reward_prompted_session'));
        } catch {
          hasPrompted = Boolean((window as any).__anta_daily_reward_prompted_memory);
        }

        if (!hasPrompted) {
          try {
            sessionStorage.setItem('anta_daily_reward_prompted_session', 'true');
          } catch {}
          (window as any).__anta_daily_reward_prompted_memory = true;

          const timer = setTimeout(() => {
            setShowDailyRewardModal(true);
          }, 1500);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.warn('[DailyReward] Prompt check notice:', err);
      }
    }
  }, [canClaimDailyReward]);

  const totalRounds = useMemo(() => {
    if (fixtures && fixtures.length > 0) {
      const maxR = Math.max(...fixtures.map(f => f.round || 0));
      if (maxR > 0) return maxR;
    }
    return season.totalRounds || 34;
  }, [fixtures, season.totalRounds]);

  const leagueFixtures = useMemo(() => {
    return fixtures.filter(f => f && normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE');
  }, [fixtures]);

  const allLeagueFixturesPlayed = useMemo(() => {
    return leagueFixtures.length > 0 && leagueFixtures.every(f => f && (f.isPlayed || (f as any).played));
  }, [leagueFixtures]);

  const cupCompleted = useMemo(() => {
    if (!cupTournament) return true;
    if (cupTournament.isCompleted) return true;
    const finalMatch = (cupTournament.matches || []).find(m => m.stage === 'final');
    if (finalMatch && finalMatch.isPlayed) return true;
    return false;
  }, [cupTournament]);

  const continentalCompleted = useMemo(() => {
    if (!africanChampionsLeague) return true;
    if (africanChampionsLeague.isCompleted) return true;
    const finalMatch = (africanChampionsLeague.matches || []).find(m => m.stage === 'final');
    if (finalMatch && finalMatch.isPlayed) return true;
    return false;
  }, [africanChampionsLeague]);

  const userHasUnplayedMatches = useMemo(() => {
    if (!userClub) return false;
    return fixtures.some(f => !f.isPlayed && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id));
  }, [fixtures, userClub?.id]);

  // Complete Season Integrity: Season is completed only when all league fixtures are played, cup & continental are concluded, and no pending user matches remain!
  const seasonFinished = useMemo(() => {
    if (season.status === 'completed') return true;
    if (allLeagueFixturesPlayed && leagueFixtures.length > 0 && cupCompleted && continentalCompleted && !userHasUnplayedMatches) {
      return true;
    }
    return false;
  }, [season.status, allLeagueFixturesPlayed, leagueFixtures.length, cupCompleted, continentalCompleted, userHasUnplayedMatches]);
  const unreadMessagesCount = inbox.filter(m => !m.read).length;

  // Warm the season-snapshot cache so "restart season" can read it synchronously after an app reload
  useEffect(() => {
    gameStateRepository.loadSeasonSnapshot(season?.seasonNumber || 1).catch(() => {});
  }, [season?.seasonNumber]);

  // World Rankings & Squad Strength Computation
  const userSquadStrength = useMemo(() => calculateSquadStrength(userClub), [userClub]);
  const userDynamicManagerRating = useMemo(() => calculateDynamicManagerRating(manager), [manager]);

  const [worldRankings, setWorldRankings] = useState<WorldRankingsData>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_worldRankings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.managers) && Array.isArray(parsed.clubs)) {
          return parsed;
        }
      }
      return generateMonthlyWorldRankings(manager, userClub, calendarDate?.rawDateStr?.slice(0, 7) || '2026-08');
    } catch {
      return generateMonthlyWorldRankings(manager, userClub, '2026-08');
    }
  });

  // Scouting & Opponent Spy State
  const [scoutedOpponents, setScoutedOpponents] = useState<Record<string, OpponentScoutingReport>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_scoutedOpponents`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sponsorship Offers Market State (سوق وعروض الرعاية تم إلغاؤها بالكامل)
  const [availableSponsorOffers, setAvailableSponsorOffers] = useState<SponsorshipOffer[]>([]);

  const recalculateWorldRankings = (monthStr?: string) => {
    const targetMonth = monthStr || (calendarDate?.rawDateStr ? calendarDate.rawDateStr.slice(0, 7) : '2026-08');
    const updated = generateMonthlyWorldRankings(manager, userClub, targetMonth, { previous: worldRankings, teams, standings });
    setWorldRankings(updated);
    const userEntry = (updated?.managers || []).find(m => m && (m.id === 'user_manager' || (m.name && m.name.includes('(أنت)'))));
    if (userEntry) {
      setManager(prev => ({
        ...prev,
        worldRank: userEntry.worldRank,
        rankingPoints: userEntry.rankingPoints,
        managerRating: userDynamicManagerRating,
      }));
    }
  };

  // World transfer windows: every club in every league trades players; completed moves are
  // stored in worldRankings.worldMoves (saved with the game) and replayed onto the static database on load.
  const lastTransferSimDateRef = useRef<string>('');
  useEffect(() => {
    const dateStr = calendarDate?.rawDateStr;
    if (!dateStr || !isInitialLoadDoneRef.current) return;
    const prevDate = lastTransferSimDateRef.current;
    lastTransferSimDateRef.current = dateStr;
    if (!prevDate || dateStr <= prevDate) return;
    const start = Date.parse(`${prevDate}T00:00:00Z`);
    const end = Date.parse(`${dateStr}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    const gapDays = Math.round((end - start) / 86400000);
    if (gapDays < 1 || gapDays > 100) return;

    try {
      const protectedIds = new Set<string>((activeNegotiations || []).map(n => n?.playerId).filter(Boolean) as string[]);
      let workTeams: Club[] = teams;
      let movesAcc = { ...(worldRankings?.worldMoves || {}) };
      const newMoves: Record<string, any> = {};
      const dealsAll: { playerId: string; toClubName: string; fromClubName: string; playerName: string; fee: number; rating: number }[] = [];
      const newsItems: DailyNewsItem[] = [];

      for (let i = 1; i <= gapDays; i++) {
        const d = new Date(start + i * 86400000);
        const win = getTransferWindow(d.getUTCMonth() + 1, d.getUTCDate());
        if (!win) continue;
        const dayStr = d.toISOString().slice(0, 10);
        const res = simulateWorldTransferDay({
          liveTeams: workTeams,
          userClubId: userClub?.id,
          dateStr: dayStr,
          seasonNumber: season?.seasonNumber || 1,
          window: win.window,
          daysLeft: win.daysLeft,
          moves: movesAcc,
          protectedPlayerIds: protectedIds,
        });
        workTeams = res.updatedLiveTeams;
        Object.assign(movesAcc, res.newMoves);
        Object.assign(newMoves, res.newMoves);
        dealsAll.push(...res.deals);
        res.news.forEach((n, idx) => newsItems.push({
          id: `wt_${dayStr}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          dateStr: dayStr,
          title: n.title,
          content: n.summary,
          category: 'transfer',
          importance: 'medium',
          icon: '🔁',
          source: 'سوق الانتقالات',
        } as DailyNewsItem));
      }

      if (dealsAll.length === 0 && Object.keys(newMoves).length === 0) return;

      const changed = new Map<string, Club>();
      workTeams.forEach((c, i) => { if (c && c !== teams[i]) changed.set(c.id, c); });
      if (changed.size > 0) setTeams(prev => prev.map(c => (c && changed.get(c.id)) || c));
      setWorldRankings(prev => ({ ...prev, worldMoves: { ...(prev?.worldMoves || {}), ...newMoves } }));
      const movedIds = new Set(dealsAll.map(d => d.playerId));
      if (movedIds.size > 0) setTransferMarket(prev => (Array.isArray(prev) ? prev.filter(p => !movedIds.has(p.id)) : prev));
      if (newsItems.length > 0) setDailyNews(prev => [...newsItems.slice(0, 8), ...(prev || [])].slice(0, 40));
    } catch (e) {
      console.warn('[WorldTransfers] simulation notice:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDate?.rawDateStr]);

  const careerStateValidationGuardRef = useRef<string>('');

  // Self-healing invariant: Ensure manager is actively linked to their club in state (only after initial hydration completes)
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;
    const validated = validateCareerState(manager, teams, GLOBAL_LEAGUES);
    const targetSig = `${validated.manager.currentClubId || ''}_${validated.manager.isUnemployed ? 1 : 0}`;
    const hasUserClubInTeams = (Array.isArray(teams) ? teams : []).some(
      t => t && t.isUserClub && t.id === validated.manager.currentClubId
    );
    if (
      manager.isUnemployed !== validated.manager.isUnemployed ||
      manager.currentClubId !== validated.manager.currentClubId ||
      !hasUserClubInTeams
    ) {
      if (careerStateValidationGuardRef.current === targetSig && hasUserClubInTeams) {
        return;
      }
      careerStateValidationGuardRef.current = targetSig;
      if (
        manager.isUnemployed !== validated.manager.isUnemployed ||
        manager.currentClubId !== validated.manager.currentClubId
      ) {
        setManager(validated.manager);
      }
      if (!hasUserClubInTeams) {
        setTeams(validated.teams);
      }
    }
  }, [manager.currentClubId]);

  // Unified Real-Date Master Calendar & Team-Centric Schedule (League Only)
  const calendarSchedule: CalendarScheduleItem[] = useMemo(() => {
    const seasonStartDate = getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr || '2026-08-15';
    const seasonStartObj = parseDateString(seasonStartDate);

    return (fixtures || [])
      .filter(f => {
        if (!f) return false;
        const normType = normalizeCompetitionType(
          f.competitionType || f.tournamentId || f.competitionId || (f.cupStage ? 'DOMESTIC_COP' : undefined)
        );
        return normType === 'LEAGUE';
      })
      .map(f => {
        const branding = getCompetitionBranding(f, activeLeague?.shortName || activeLeague?.name);
        const stageName = branding.stageName;
        const tournamentBadge = branding.badge;

        const roundNum = Math.max(1, f.round || 1);
        const roundDateObj = new Date(seasonStartObj);
        roundDateObj.setDate(seasonStartObj.getDate() + (roundNum - 1) * 7);
        const canonicalDate = formatCalendarDate(roundDateObj).rawDateStr;

        const finalDate = canonicalDate || f.date || seasonStartDate;
        const timestamp = parseDateString(finalDate).getTime();

        return {
          ...f,
          competitionType: 'LEAGUE' as const,
          date: finalDate,
          timestamp,
          tournamentId: 'league' as const,
          tournamentBadge,
          stage: f.stage || stageName,
          stageName,
        };
      })
      .sort((a, b) => {
        const roundDiff = (Number(a?.round) || 0) - (Number(b?.round) || 0);
        if (roundDiff !== 0) return roundDiff;
        return String(a?.date || '').localeCompare(String(b?.date || ''));
      });
  }, [fixtures, season?.seasonNumber, activeLeague?.shortName, activeLeague?.name]);

  const userCalendarSchedule: CalendarScheduleItem[] = useMemo(() => {
    if (!userClub?.id) return [];
    return CalendarManager.getUserClubSchedule(userClub.id, calendarSchedule);
  }, [userClub?.id, calendarSchedule]);

  // Calendar & Next Match Helpers (Team-Centric Real-Date Calculation)
  const nextMatchInfo = useMemo(() => {
    return userClub?.id
      ? CalendarManager.calculateDaysUntilUserMatch(userClub.id, calendarDate?.rawDateStr, calendarSchedule)
      : { daysRemaining: 0, isMatchDay: false, nextMatch: null };
  }, [userClub?.id, calendarDate?.rawDateStr, calendarSchedule]);

  const daysUntilNextMatch = nextMatchInfo.daysRemaining;
  const isMatchDay = Boolean(
    nextMatchInfo.nextMatch &&
    !nextMatchInfo.nextMatch.isPlayed &&
    (nextMatchInfo.isMatchDay || (nextMatchInfo.nextMatch.date || '').trim() === (calendarDate?.rawDateStr || '').trim())
  );

  // Helper to build current complete SmartSyncInput snapshot
  const getSyncInput = useCallback((): SmartSyncInput => ({
    user,
    manager,
    userClub: userClub || null,
    teams,
    standings,
    fixtures,
    currentRound,
    season,
    activeLeague,
    calendarDate,
    transferHistory,
    clubEconomy,
    inbox,
    cupTournament,
    jobOffers,
    transferMarket,
    incomingBids,
    seasonEndSummary,
    activeNegotiations,
    boardSystem,
    dailyNews,
    retiredPlayers,
    worldRankings,
    scoutedOpponents,
    deletedMessageIds,
  }), [
    user, manager, userClub, teams, standings, fixtures, currentRound, season,
    activeLeague, calendarDate, transferHistory, clubEconomy, inbox, cupTournament,
    jobOffers, transferMarket, incomingBids, seasonEndSummary, activeNegotiations,
    boardSystem, dailyNews, retiredPlayers, worldRankings, scoutedOpponents, deletedMessageIds
  ]);

  // Track initial load completion to avoid overwriting saves on cold mount
  const isInitialLoadDoneRef = useRef(false);

  /**
   * Save Data Migration Manager (نظام إدارة ترقية إصدارات البيانات المحفوظة)
   * Evaluates the schemaVersion & saveVersion of incoming save data (local or cloud),
   * detects any structural differences or outdated schema versions, and automatically
   * upgrades the payload to the latest schema without losing any career progress.
   */
  const runSaveDataMigration = useCallback((rawSave: any): { migratedPayload: any; upgraded: boolean; fromVersion: number; toVersion: number } => {
    if (!rawSave) {
      return { migratedPayload: null, upgraded: false, fromVersion: 0, toVersion: CURRENT_SAVE_FORMAT_VERSION };
    }

    const unwrapSource = rawSave?.payload || rawSave?.current_save || rawSave?.data || rawSave?.save || rawSave;
    const detectedSchemaVersion = typeof unwrapSource?.schemaVersion === 'number' 
      ? unwrapSource.schemaVersion 
      : 1;

    // Check if structure requires upgrade
    const needsStructuralUpgrade = 
      detectedSchemaVersion < CURRENT_SAVE_FORMAT_VERSION ||
      !unwrapSource?.calendarDate ||
      !unwrapSource?.clubEconomy ||
      !Array.isArray(unwrapSource?.transferHistory) ||
      !Array.isArray(unwrapSource?.teams) ||
      !unwrapSource?.manager?.favoriteFormation ||
      unwrapSource?.manager?.tacticalFamiliarity === undefined ||
      (unwrapSource?.teams?.length > 0 && !unwrapSource.teams.some((t: any) => t && t.isUserClub));

    // Execute comprehensive normalization and schema migration
    const migratedPayload = migrateSavePayload(rawSave);

    const upgraded = Boolean(
      needsStructuralUpgrade || 
      detectedSchemaVersion !== CURRENT_SAVE_FORMAT_VERSION ||
      migratedPayload.schemaVersion !== detectedSchemaVersion
    );

    if (upgraded) {
      console.info(`[MigrationManager] Automatically migrated save data from Schema v${detectedSchemaVersion} to Schema v${CURRENT_SAVE_FORMAT_VERSION}. Career integrity preserved.`);
    }

    return {
      migratedPayload,
      upgraded,
      fromVersion: detectedSchemaVersion,
      toVersion: CURRENT_SAVE_FORMAT_VERSION,
    };
  }, []);

  // Helper to safely apply loaded save data into React state, update profile, and persist to local storage
  const applyLoadedSave = useCallback(async (save: any) => {
    if (!save) return;
    isInitialLoadDoneRef.current = true;

    // Migrate and standardize payload via Migration Manager
    const { migratedPayload: migrated, upgraded } = runSaveDataMigration(save);
    if (!migrated) return;

    // Strip any legacy Cup or Continental fixtures from loaded saves
    const resolvedUserClubId = migrated.manager?.userClubId || migrated.teams?.find((t: any) => t.isUserClub)?.id;
    migrated.cupTournament = null;
    migrated.africanChampionsLeague = null;
    if (Array.isArray(migrated.fixtures)) {
      migrated.fixtures = migrated.fixtures.filter(
        (f: any) =>
          f &&
          normalizeCompetitionType(
            f.competitionType || f.tournamentId || f.competitionId || (f.cupStage ? 'DOMESTIC_COP' : undefined)
          ) === 'LEAGUE'
      );
    }

    // =========================================================================
    // SELF-HEALING 1: SQUAD DE-DUPLICATION (PREVENT DUPLICATE PLAYERS)
    // Remove duplicate players inside clubs by ID and normalized name
    // =========================================================================
    if (Array.isArray(migrated.teams)) {
      migrated.teams = migrated.teams.map((t: any) => {
        if (!t || !Array.isArray(t.players)) return t;
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        const cleanPlayers: Player[] = [];
        for (const p of t.players) {
          if (!p || !p.id) continue;
          const nKey = normalizePlayerKey(p.name);
          if (seenIds.has(p.id) || (nKey && seenNames.has(nKey))) {
            continue; // Skip duplicate!
          }
          seenIds.add(p.id);
          if (nKey) seenNames.add(nKey);
          cleanPlayers.push(p);
        }
        return { ...t, players: cleanPlayers };
      });
    }

    // =========================================================================
    // SELF-HEALING 2: REPAIR LEAGUE STANDINGS & PAST ROUND FIXTURES
    // If the league is frozen (standings all 0s) or past round fixtures are unplayed,
    // simulate past unplayed fixtures and recalculate standings accurately!
    // =========================================================================
    try {
      let healedFixtures = Array.isArray(migrated.fixtures) ? [...migrated.fixtures] : [];
      const curRound = typeof migrated.currentRound === 'number' ? migrated.currentRound : 1;
      const leagueClubs: Club[] = (Array.isArray(migrated.teams) && migrated.teams.length > 0)
        ? migrated.teams.map(normalizeClub)
        : (migrated.activeLeague?.teams || []);

      // 1. Simulate any unplayed past AI league fixtures (round < curRound), NEVER user's own matches!
      let hasUnplayedPastFixtures = false;
      healedFixtures = healedFixtures.map(f => {
        const isUserMatch = Boolean(resolvedUserClubId && (f?.homeTeamId === resolvedUserClubId || f?.awayTeamId === resolvedUserClubId));
        if (f && !isUserMatch && f.round < curRound && normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && (!f.isPlayed || typeof f.homeScore !== 'number')) {
          hasUnplayedPastFixtures = true;
          const hTeam = leagueClubs.find(t => t.id === f.homeTeamId) || findClubInWorld(f.homeTeamId) || leagueClubs[0];
          const aTeam = leagueClubs.find(t => t.id === f.awayTeamId) || findClubInWorld(f.awayTeamId) || leagueClubs[1];
          const simRes = simulateMatch(hTeam, aTeam, hTeam?.tactics, aTeam?.tactics);
          return {
            ...f,
            homeScore: simRes.homeScore,
            awayScore: simRes.awayScore,
            isPlayed: true,
            stats: simRes.stats,
            events: (simRes.events || []).filter(e => e && e.type !== 'commentary').slice(0, 10),
          };
        }
        return f;
      });

      // 2. Check if standings are zeroed or desynced from fixtures
      const currentStandingsArr = Array.isArray(migrated.standings) ? migrated.standings : [];
      const isStandingsAllZero = currentStandingsArr.length === 0 || currentStandingsArr.every(s => (s.played || 0) === 0);
      const shouldRecompute = hasUnplayedPastFixtures || (isStandingsAllZero && curRound > 1) || (curRound > 1 && healedFixtures.some(f => f.isPlayed));

      if (shouldRecompute) {
        console.log('[SelfHealing] Reconstructing and repairing league standings from fixtures up to round', curRound);
        const healedStandings = recalculateStandingsFromFixtures(currentStandingsArr, leagueClubs, healedFixtures);
        migrated.standings = healedStandings;
        migrated.fixtures = healedFixtures;
      }
    } catch (healErr) {
      console.warn('[SelfHealing] Standings integrity check warning:', healErr);
    }

    if (migrated.season) setSeason(migrated.season);
    if (migrated.activeLeague) setActiveLeague(migrated.activeLeague);
    if (Array.isArray(migrated.teams) && migrated.teams.length > 0) setTeams(migrated.teams.map(normalizeClub));
    if (Array.isArray(migrated.standings)) setStandings(migrated.standings.map(normalizeStanding));
    if (Array.isArray(migrated.fixtures)) setFixtures(migrated.fixtures);
    if (typeof migrated.currentRound === 'number') setCurrentRound(migrated.currentRound);
    if (migrated.manager) {
      const normalizedMgr = normalizeManagerProfile(migrated.manager);
      setManager(normalizedMgr);
      if (normalizedMgr.name) {
        saveLocalTrainerProfile({
          name: normalizedMgr.name,
          age: normalizedMgr.age || 35,
          nationality: normalizedMgr.nationality || 'مصري',
          trainerId: normalizedMgr.trainerId || generateTrainerId(),
        });
      }
    }
    if (Array.isArray(migrated.transferMarket)) setTransferMarket(migrated.transferMarket);
    if (Array.isArray(migrated.incomingBids)) setIncomingBids(migrated.incomingBids);
    if (Array.isArray(migrated.inbox)) setInbox(migrated.inbox);
    setCupTournament(null);
    setAfricanChampionsLeague(null);
    if (Array.isArray(migrated.jobOffers)) setJobOffers(migrated.jobOffers);
    if (migrated.seasonEndSummary !== undefined) setSeasonEndSummary(migrated.seasonEndSummary);
    if (Array.isArray(migrated.transferHistory)) setTransferHistory(migrated.transferHistory);
    if (migrated.clubEconomy) setClubEconomy(migrated.clubEconomy);
    if (migrated.calendarDate) {
      setCalendarDate(normalizeCalendarDate(migrated.calendarDate, migrated.season?.seasonNumber || 1));
    }
    if (Array.isArray(migrated.activeNegotiations)) setActiveNegotiations(migrated.activeNegotiations);
    if (migrated.boardSystem) setBoardSystem(migrated.boardSystem);
    if (Array.isArray(migrated.dailyNews)) setDailyNews(migrated.dailyNews);
    if (Array.isArray(migrated.retiredPlayers)) setRetiredPlayers(migrated.retiredPlayers);
    if (migrated.worldRankings) {
      if (typeof migrated.worldRankings === 'object' && !Array.isArray(migrated.worldRankings) && Array.isArray(migrated.worldRankings.managers) && Array.isArray(migrated.worldRankings.clubs)) {
        resetWorldTransfers();
        applyWorldEras(migrated.worldRankings.worldEra);
        applyWorldMoves(migrated.worldRankings.worldMoves);
        setWorldRankings(migrated.worldRankings);
      } else {
        resetWorldTransfers();
        const resolvedClub = migrated.teams?.find(t => t && t.isUserClub) || userClub;
        setWorldRankings(generateMonthlyWorldRankings(migrated.manager || manager, resolvedClub, migrated.calendarDate?.rawDateStr?.slice(0, 7) || '2026-08'));
      }
    }
    if (migrated.scoutedOpponents && typeof migrated.scoutedOpponents === 'object' && !Array.isArray(migrated.scoutedOpponents)) {
      setScoutedOpponents(migrated.scoutedOpponents);
    }
    if (Array.isArray(migrated.deletedMessageIds)) setDeletedMessageIds(migrated.deletedMessageIds);
    if (migrated.dailyRewardState && typeof migrated.dailyRewardState === 'object') {
      setDailyRewardState(migrated.dailyRewardState);
      try {
        localStorage.setItem('anta_el_modareb_daily_login_rewards_v1', JSON.stringify(migrated.dailyRewardState));
      } catch (_) {}
    }

    // Save immediately to local IndexedDB and localStorage so reload retains this save
    try {
      await gameStateRepository.saveLocalGameState(migrated);
    } catch (err) {
      console.warn('[GameContext] Notice saving applied save state:', err);
    }
  }, [runSaveDataMigration]);

  // 1. Local-First Hydration on App Mount (IndexedDB primary + localStorage fallback)
  useEffect(() => {
    let isCancelled = false;

    const hydrateLocal = async () => {
      try {
        const localSave = await gameStateRepository.loadLocalGameState();
        if (!isCancelled && localSave && localSave.manager && (localSave.teams?.length || localSave.season)) {
          applyLoadedSave(localSave);
        }
      } catch (err) {
        console.warn('[GameContext] Local repository hydration notice:', err);
      } finally {
        if (!isCancelled) {
          isInitialLoadDoneRef.current = true;
        }
      }
    };

    hydrateLocal();

    return () => {
      isCancelled = true;
    };
  }, [applyLoadedSave]);

  // 2. Cloud Hydration & Cross-Device Restore for Authenticated User (Gmail)
  useEffect(() => {
    if (!user?.uid) return;

    let isCancelled = false;

    const hydrateCloud = async () => {
      try {
        const cloudSave = await smartSyncManager.loadCloudSave(user.uid);
        if (isCancelled || !cloudSave || !cloudSave.manager) return;

        // Compare against true local storage on disk to prevent overwriting existing local career
        const localSaveOnDisk = await gameStateRepository.loadLocalGameState();
        const effectiveManager = localSaveOnDisk?.manager || manager;
        const effectiveSeason = localSaveOnDisk?.season || season;
        const effectiveRound = localSaveOnDisk?.currentRound ?? currentRound;

        const cloudXp = cloudSave.manager?.xp || 0;
        const cloudSeason = cloudSave.season?.seasonNumber || 1;
        const cloudRound = cloudSave.currentRound || 1;
        const localXp = effectiveManager?.xp || 0;
        const localSeason = effectiveSeason?.seasonNumber || 1;
        const localRound = effectiveRound || 1;

        const isLocalDefault = !localSaveOnDisk || (localSeason === 1 && localRound === 1 && localXp === 0);
        const isLocalAhead = localSeason > cloudSeason ||
          (localSeason === cloudSeason && localRound > localRound);
        const isCloudAhead = !isLocalAhead && (
          cloudSeason > localSeason ||
          (cloudSeason === localSeason && cloudRound > localRound) ||
          (cloudSeason === localSeason && cloudRound === localRound && cloudXp > localXp) ||
          (cloudSeason === localSeason && cloudRound === localRound && cloudSave.savedAt && localSaveOnDisk?.lastLocalSaveAt && cloudSave.savedAt > localSaveOnDisk.lastLocalSaveAt)
        );

        if (!isLocalAhead && (isCloudAhead || isLocalDefault)) {
          applyLoadedSave(cloudSave);
          // Mirror immediately to local storage
          gameStateRepository.saveLocalGameState({
            ...cloudSave,
            lastLocalSaveAt: Date.now(),
          });
        } else {
          // Local state is more advanced, queue it for cloud sync when connection is active
          smartSyncManager.queueDebouncedSync(getSyncInput());
        }
      } catch (err) {
        console.warn('[GameContext] Cloud hydration check notice (safely retaining local save):', err);
      }
    };

    hydrateCloud();

    return () => {
      isCancelled = true;
    };
  }, [user?.uid, applyLoadedSave]);

  // Persist game state (Local-First: IndexedDB + localStorage mirror, debounced + immediate flush on tab change / page hide)
  const saveTimeoutRef = useRef<any>(null);
  const flushLocalSaveImmediate = useCallback((overrides?: Partial<any>) => {
    if (!isInitialLoadDoneRef.current) return;
    try {
      gameStateRepository.saveLocalGameState({
        schemaVersion: 2,
        saveVersion: 1,
        lastLocalSaveAt: Date.now(),
        season,
        activeLeague,
        teams,
        standings,
        fixtures,
        currentRound,
        manager,
        transferMarket,
        incomingBids,
        inbox,
        cupTournament: null,
        africanChampionsLeague: null,
        jobOffers,
        seasonEndSummary,
        transferHistory,
        clubEconomy,
        calendarDate,
        activeNegotiations,
        boardSystem,
        dailyNews,
        retiredPlayers,
        worldRankings,
        scoutedOpponents,
        deletedMessageIds,
        ...(overrides || {}),
      });
    } catch (err) {
      console.warn('Failed immediate flush to local state repository:', err);
    }
  }, [season, activeLeague, teams, standings, fixtures, currentRound, manager, transferMarket, incomingBids, inbox, jobOffers, seasonEndSummary, transferHistory, clubEconomy, calendarDate, activeNegotiations, boardSystem, dailyNews, retiredPlayers, worldRankings, scoutedOpponents, deletedMessageIds]);

  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      flushLocalSaveImmediate();
      if (user?.uid) {
        smartSyncManager.queueDebouncedSync(getSyncInput());
      }
    }, 350);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [season, activeLeague, teams, standings, fixtures, currentRound, manager, transferMarket, incomingBids, inbox, cupTournament, africanChampionsLeague, jobOffers, seasonEndSummary, transferHistory, clubEconomy, calendarDate, activeNegotiations, boardSystem, dailyNews, retiredPlayers, worldRankings, scoutedOpponents, deletedMessageIds, user?.uid, getSyncInput, flushLocalSaveImmediate]);

  // Flush save immediately on screen/tab switch, app backgrounding, or window close
  useEffect(() => {
    const handleImmediateSaveTrigger = () => {
      flushLocalSaveImmediate();
    };
    window.addEventListener('set-active-tab', handleImmediateSaveTrigger);
    window.addEventListener('pagehide', handleImmediateSaveTrigger);
    window.addEventListener('beforeunload', handleImmediateSaveTrigger);
    const handleVisChange = () => {
      if (document.visibilityState === 'hidden') {
        flushLocalSaveImmediate();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => {
      window.removeEventListener('set-active-tab', handleImmediateSaveTrigger);
      window.removeEventListener('pagehide', handleImmediateSaveTrigger);
      window.removeEventListener('beforeunload', handleImmediateSaveTrigger);
      document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, [flushLocalSaveImmediate]);

  // Cloud Synchronization with Firestore (Delegated to SmartSyncManager with Dirty & Quota Protections)
  const saveToCloud = useCallback(async (isManual: boolean = false): Promise<{ success: boolean; message: string }> => {
    return smartSyncManager.triggerMilestoneSync(getSyncInput(), isManual ? 'manual' : 'round');
  }, [getSyncInput]);

  // World Database Integrity Validation - Safely deferred to background without blocking startup
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const rawWorldClubs: Club[] = [];
        const seen = new Set<string>();

        // 1. Live teams (the active league state) have top authority
        teams.forEach(t => {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            rawWorldClubs.push(t);
          }
        });

        // 2. Add remaining global league clubs
        Object.values(GLOBAL_LEAGUES).forEach(league => {
          (league.teams || []).forEach(t => {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              rawWorldClubs.push(t);
            }
          });
        });

        // 3. Guarantee strict single-ownership of all players across the world database
        const allWorldClubs = sanitizeWorldPlayerOwnership(rawWorldClubs);

        validateWorldDatabase(allWorldClubs, GLOBAL_LEAGUES, { logToConsole: false });
      } catch (err) {
        console.warn('[World Validation] Error validating world database:', err);
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, []);



  // Load Active Admin Broadcasts to Inbox
  useEffect(() => {
    const syncBroadcasts = async () => {
      try {
        const active = await fetchActiveBroadcasts();
        if (!active || active.length === 0) return;

        let currentDeleted = new Set<string>(deletedMessageIds);
        try {
          const savedDeleted = localStorage.getItem(`${STORAGE_KEY}_deletedMessageIds`);
          if (savedDeleted) {
            const parsed = JSON.parse(savedDeleted);
            if (Array.isArray(parsed)) {
              currentDeleted = new Set(parsed);
            }
          }
        } catch {}

        setInbox(prev => {
          const existingIds = new Set((prev || []).map(m => m.id));
          const newItems: InboxMessage[] = [];

          active.forEach(b => {
            const msgId = `broadcast_${b.id}`;
            if (!existingIds.has(msgId) && !currentDeleted.has(msgId)) {
              newItems.push({
                id: msgId,
                title: `📢 ${b.title}`,
                sender: b.createdByName || 'إدارة اللعبة',
                date: new Date(b.createdAt).toLocaleDateString('ar-EG'),
                content: b.body + (b.rewardCoins && b.rewardCoins > 0 ? `\n\n🎁 مكافأة البث: تم إرفاق ${b.rewardCoins} كوينز مع هذه الرسالة.` : ''),
                type: 'news',
                read: false,
              });
            }
          });

          if (newItems.length > 0) {
            const merged = [...newItems, ...prev];
            try {
              localStorage.setItem(`${STORAGE_KEY}_inbox`, JSON.stringify(merged));
            } catch {}
            return merged;
          }
          return prev;
        });
      } catch (err) {
        console.warn('Could not sync broadcasts to player inbox:', err);
      }
    };

    syncBroadcasts();
  }, [deletedMessageIds]);

  // ----------------------------------------------------
  // Anti-AFK Active Play Time Tracking Engine
  // ----------------------------------------------------
  const lastUserInteractionRef = useRef<number>(Date.now());
  const activeSecondsBufferRef = useRef<number>(0);

  useEffect(() => {
    // Record user interactions on window with lightweight throttling
    let lastThrottled = 0;
    const registerInteraction = () => {
      const now = Date.now();
      if (now - lastThrottled > 1000) {
        lastThrottled = now;
        lastUserInteractionRef.current = now;
      }
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'pointermove', 'mousemove', 'wheel'];
    events.forEach(evt => window.addEventListener(evt, registerInteraction, { passive: true }));

    // Heartbeat ticker running every 10 seconds
    const interval = setInterval(() => {
      // If tab is hidden in background, STOP counting immediately
      if (document.hidden) return;
      const idleMs = Date.now() - lastUserInteractionRef.current;
      // Smart idle window: 180s (3 minutes) allows thoughtful tactical planning,
      // reading match & scout reports, and watching live simulations without AFK exploits.
      if (idleMs > 180000) return; // User is genuinely idle/AFK!

      // Active play time increment: 10 seconds of verified gameplay
      activeSecondsBufferRef.current += 10;

      if (activeSecondsBufferRef.current >= 60) {
        activeSecondsBufferRef.current -= 60;
        setManager(prev => ({
          ...prev,
          totalPlayTimeMinutes: (prev.totalPlayTimeMinutes || 0) + 1,
        }));
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      events.forEach(evt => window.removeEventListener(evt, registerInteraction));
    };
  }, []);

  // 4) Diagnostic counter for timer recreation frequency
  const timerRecreateStatsRef = useRef<{ timestamps: number[] }>({ timestamps: [] });
  // 2) Watchdog tracking ref for stalled live match
  const liveMatchWatchdogRef = useRef<{ lastMinute: number; lastMinuteChangeTs: number }>({
    lastMinute: -1,
    lastMinuteChangeTs: Date.now(),
  });
  const recreateLiveMatchTimerRef = useRef<(() => void) | null>(null);

  const createLiveMatchTimer = useCallback(() => {
    // 4) Diagnostics: check recreation frequency
    const now = Date.now();
    timerRecreateStatsRef.current.timestamps = timerRecreateStatsRef.current.timestamps.filter(t => now - t < 3000);
    timerRecreateStatsRef.current.timestamps.push(now);
    if (timerRecreateStatsRef.current.timestamps.length > 5) {
      console.warn('[LiveMatchTimer] recreated too often', {
        isPlaying: liveMatchRef.current?.isPlaying,
        isFinished: liveMatchRef.current?.isFinished,
        isHalfTime: liveMatchRef.current?.isHalfTime,
        speed: liveMatchRef.current?.speed,
      });
    }

    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }

    const currentSpeed = liveMatchRef.current?.speed || 1;
    const intervalTime = Math.max(80, 600 / currentSpeed);

    liveMatchTimerRef.current = setInterval(() => {
      if (isMatchFinishedRef.current) {
        if (liveMatchTimerRef.current) {
          clearInterval(liveMatchTimerRef.current);
          liveMatchTimerRef.current = null;
        }
        return;
      }

      setLiveMatch(prev => {
        if (!prev || !prev.isPlaying || prev.isFinished || prev.isHalfTime) {
          if (liveMatchTimerRef.current) {
            clearInterval(liveMatchTimerRef.current);
            liveMatchTimerRef.current = null;
          }
          return prev;
        }

        let next = prev;
        try {
          next = simulateMatchStep(prev, userTacticsRef.current);
        } catch (simErr) {
          console.error('[simulateMatchStep Graceful Recovery]', simErr);
          next = {
            ...prev,
            currentMinute: prev.currentMinute + 1,
            isFinished: prev.currentMinute + 1 >= 90,
            isPlaying: prev.currentMinute + 1 < 90,
          };
        }

        // 2) Track minute changes for watchdog
        if (next.currentMinute !== liveMatchWatchdogRef.current.lastMinute) {
          liveMatchWatchdogRef.current.lastMinute = next.currentMinute;
          liveMatchWatchdogRef.current.lastMinuteChangeTs = Date.now();
        }

        if (next.currentMinute >= 90 || next.isFinished) {
          const currentClub = userClubRef.current;
          const currentLeague = activeLeagueRef.current;
          const userIsInFixture = currentClub && (next.fixture?.homeTeamId === currentClub.id || next.fixture?.awayTeamId === currentClub.id);
          const isUserHome = currentClub ? next.fixture?.homeTeamId === currentClub.id : true;
          const oppClub = isUserHome ? next.awayTeam : next.homeTeam;
          const userScore = isUserHome ? next.homeScore : next.awayScore;
          const oppScore = isUserHome ? next.awayScore : next.homeScore;

          const calculatedRevenue = (userIsInFixture && currentClub) ? calculateMatchRevenue({
            userClub: currentClub,
            opponentClub: oppClub,
            isHome: isUserHome,
            userScore,
            opponentScore: oppScore,
            leagueTier: currentLeague?.tier || 1,
            isCupMatch: next.fixture?.competitionType === 'cup',
            customTicketPrice: currentClub.facilities?.ticketPrice,
          }) : undefined;

          const finishedNext = {
            ...next,
            currentMinute: 90,
            isFinished: true,
            isPlaying: false,
            isHalfTime: false,
            matchRevenue: next.matchRevenue || calculatedRevenue,
          };

          isMatchFinishedRef.current = true;
          console.log('[MatchEndingFlow] MATCH_90_REACHED: Simulation interval stopped cleanly once.');

          if (liveMatchTimerRef.current) {
            clearInterval(liveMatchTimerRef.current);
            liveMatchTimerRef.current = null;
          }

          return finishedNext;
        }

        if (!next.isPlaying || next.isHalfTime) {
          if (liveMatchTimerRef.current) {
            clearInterval(liveMatchTimerRef.current);
            liveMatchTimerRef.current = null;
          }
        }

        return next;
      });
    }, intervalTime);
  }, []);

  useEffect(() => {
    recreateLiveMatchTimerRef.current = createLiveMatchTimer;
  }, [createLiveMatchTimer]);

  // 1) Live match playback timer ticker (Real event-by-event simulation)
  useEffect(() => {
    if (!liveMatch || !liveMatch.isPlaying || liveMatch.isFinished || liveMatch.isHalfTime) {
      if (liveMatchTimerRef.current) {
        clearInterval(liveMatchTimerRef.current);
        liveMatchTimerRef.current = null;
      }
      return;
    }

    createLiveMatchTimer();

    return () => {
      if (liveMatchTimerRef.current) {
        clearInterval(liveMatchTimerRef.current);
        liveMatchTimerRef.current = null;
      }
    };
  }, [liveMatch?.isPlaying, liveMatch?.isFinished, liveMatch?.isHalfTime, liveMatch?.speed, createLiveMatchTimer]);

  // 2) Watchdog for stalled live match: monitors every 2 seconds
  useEffect(() => {
    if (!liveMatch || !liveMatch.isPlaying || liveMatch.isFinished || liveMatch.isHalfTime) {
      return;
    }

    liveMatchWatchdogRef.current.lastMinute = liveMatch.currentMinute;
    liveMatchWatchdogRef.current.lastMinuteChangeTs = Date.now();

    const watchdogInterval = setInterval(() => {
      const current = liveMatchRef.current;
      if (!current || !current.isPlaying || current.isFinished || current.isHalfTime) {
        return;
      }

      const now = Date.now();
      const currentMin = current.currentMinute;
      if (liveMatchWatchdogRef.current.lastMinute !== currentMin) {
        liveMatchWatchdogRef.current.lastMinute = currentMin;
        liveMatchWatchdogRef.current.lastMinuteChangeTs = now;
        return;
      }

      const speedFactor = current.speed || 1;
      const stallThreshold = Math.max(5000, (600 / speedFactor) * 3);
      if (now - liveMatchWatchdogRef.current.lastMinuteChangeTs >= stallThreshold) {
        console.warn(`[LiveMatchWatchdog] stalled at minute ${currentMin}`);
        liveMatchWatchdogRef.current.lastMinuteChangeTs = now;
        recreateLiveMatchTimerRef.current?.();
      }
    }, 2000);

    return () => {
      clearInterval(watchdogInterval);
    };
  }, [liveMatch?.isPlaying, liveMatch?.isFinished, liveMatch?.isHalfTime, liveMatch?.speed]);

  // Actions
  const updateTactics = (tactics: TeamTactics) => {
    const targetId = userClub?.id || manager?.currentClubId;
    setTeams(prev => {
      const next = prev.map(t =>
        (t.isUserClub || (targetId && t.id === targetId))
          ? {
              ...t,
              isUserClub: true,
              tactics: {
                ...(t.tactics || {}),
                ...tactics,
                tacticalStyle: tactics.tacticalStyle || (tactics as any).playStyle || t.tactics?.tacticalStyle || 'total_football',
              },
            }
          : t
      );
      flushLocalSaveImmediate({ teams: next });
      return next;
    });
    try {
      challengesManager.recordTacticsAdjusted();
    } catch (_) {}
  };

  const setFormation = (formation: FormationType) => {
    const targetId = userClub?.id || manager?.currentClubId;
    setTeams(prev => {
      const next = prev.map(t => {
        if ((!t.isUserClub && (!targetId || t.id !== targetId)) || !t.tactics) return t;
        const reorderedStarters = reorderStartingIdsForFormation(t, formation);
        return {
          ...t,
          isUserClub: true,
          tactics: {
            ...t.tactics,
            formation,
            startingPlayerIds: reorderedStarters,
          },
        };
      });
      flushLocalSaveImmediate({ teams: next });
      return next;
    });
  };

  const updateStartingLineup = (startingIds: string[], benchIds: string[]) => {
    const targetId = userClub?.id || manager?.currentClubId;
    setTeams(prev => {
      const next = prev.map(t => {
        if ((!t.isUserClub && (!targetId || t.id !== targetId)) || !t.tactics) return t;
        return {
          ...t,
          isUserClub: true,
          tactics: {
            ...t.tactics,
            startingPlayerIds: startingIds,
            benchPlayerIds: benchIds,
          },
        };
      });
      flushLocalSaveImmediate({ teams: next });
      return next;
    });
  };

  const swapPlayers = (sourcePlayerId: string, targetPlayerId: string) => {
    if (!userClub || !userClub.tactics || !sourcePlayerId || !targetPlayerId) return;
    if (sourcePlayerId === targetPlayerId) return;

    let currentStarting = [...(userClub.tactics.startingPlayerIds || [])];
    let currentBench = [...(userClub.tactics.benchPlayerIds || [])];

    const sourceInStarting = currentStarting.indexOf(sourcePlayerId);
    const sourceInBench = currentBench.indexOf(sourcePlayerId);
    const targetInStarting = currentStarting.indexOf(targetPlayerId);
    const targetInBench = currentBench.indexOf(targetPlayerId);

    // 1. Both in starting XI -> swap starting slots
    if (sourceInStarting !== -1 && targetInStarting !== -1) {
      const temp = currentStarting[sourceInStarting];
      currentStarting[sourceInStarting] = currentStarting[targetInStarting];
      currentStarting[targetInStarting] = temp;
    }
    // 2. Both on bench -> swap bench slots
    else if (sourceInBench !== -1 && targetInBench !== -1) {
      const temp = currentBench[sourceInBench];
      currentBench[sourceInBench] = currentBench[targetInBench];
      currentBench[targetInBench] = temp;
    }
    // 3. One in starting XI, one on bench -> direct swap
    else if (sourceInStarting !== -1 && targetInBench !== -1) {
      currentStarting[sourceInStarting] = targetPlayerId;
      currentBench[targetInBench] = sourcePlayerId;
    } else if (sourceInBench !== -1 && targetInStarting !== -1) {
      currentBench[sourceInBench] = targetPlayerId;
      currentStarting[targetInStarting] = sourcePlayerId;
    }
    // 4. One in starting XI, one in reserve (neither starting nor bench)
    else if (sourceInStarting !== -1 && targetInStarting === -1 && targetInBench === -1) {
      currentStarting[sourceInStarting] = targetPlayerId;
    } else if (sourceInStarting === -1 && sourceInBench === -1 && targetInStarting !== -1) {
      currentStarting[targetInStarting] = sourcePlayerId;
    }
    // 5. One on bench, one in reserve (neither starting nor bench)
    else if (sourceInBench !== -1 && targetInStarting === -1 && targetInBench === -1) {
      currentBench[sourceInBench] = targetPlayerId;
    } else if (sourceInStarting === -1 && sourceInBench === -1 && targetInBench !== -1) {
      currentBench[targetInBench] = sourcePlayerId;
    }

    updateStartingLineup(currentStarting, currentBench);
  };

  const setCaptainAndSetPieces = (roles: { captainId?: string; penaltyTakerId?: string; freeKickTakerId?: string; cornerTakerId?: string }) => {
    const targetId = userClub?.id || manager?.currentClubId;
    setTeams(prev => {
      const next = prev.map(t => {
        if ((!t.isUserClub && (!targetId || t.id !== targetId)) || !t.tactics) return t;
        return {
          ...t,
          isUserClub: true,
          tactics: {
            ...t.tactics,
            ...roles,
          },
        };
      });
      flushLocalSaveImmediate({ teams: next });
      return next;
    });
  };

  const setPlayerTrainingFocus = (playerId: string, focus: Player['trainingFocus']) => {
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        players: (t.players || []).map(p => p.id === playerId ? { ...p, trainingFocus: focus } : p)
      };
    }));
  };

  const boostPlayerMorale = (playerId: string) => {
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        players: (t.players || []).map(p => {
          if (p.id === playerId) {
            return { ...p, morale: Math.min(100, p.morale + 10) };
          }
          return p;
        })
      };
    }));
  };

  // Lineup Validation & Match Blocker Controls
  const closeMatchBlocker = () => {
    setMatchBlocker(null);
  };

  const validateUserLineup = (): SquadValidationResult => {
    if (!userClub) {
      return { isValid: true, invalidStarters: [], hasInjured: false, hasSuspended: false, hasMissing: false, missingPositions: [] };
    }
    return validateSquadLineup(userClub);
  };

  const autoFixUserStartingLineup = (reopenAsMatchToday: boolean = false) => {
    if (!userClub) return;
    const fixResult = autoFixSquadLineup(userClub);

    setTeams(prevTeams => prevTeams.map(t => {
      if (t.isUserClub || (userClub && t.id === userClub.id)) {
        return {
          ...t,
          tactics: {
            ...t.tactics,
            startingPlayerIds: fixResult.updatedStartingPlayerIds,
            benchPlayerIds: fixResult.updatedBenchPlayerIds,
          },
        };
      }
      return t;
    }));

    // If caller explicitly requested to reopen as match_today and blocker was open because of lineup issue:
    if (reopenAsMatchToday && matchBlocker && matchBlocker.reason === 'lineup_issue') {
      const roundFixtures = fixtures.filter(f => f.round === currentRound);
      const userFix = roundFixtures.find(f => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id);
      const opp = teams.find(t => t.id === (userFix?.homeTeamId === userClub.id ? userFix?.awayTeamId : userFix?.homeTeamId));

      if (isMatchDay && userFix && !userFix.isPlayed) {
        setMatchBlocker({
          isOpen: true,
          reason: 'match_today',
          title: '✅ تم ضبط التشكيلة بنجاح - اليوم موعد المباراة!',
          message: `تم استبدال اللاعبين غير الجاهزين بأفضل العناصر المتاحة. اليوم موعد مباراة الجولة ${currentRound} أمام (${opp?.name || 'المنافس'})! يمكنك الآن خوض المباراة.`,
          fixture: userFix,
          opponentClub: opp,
        });
      } else {
        setMatchBlocker(null);
      }
    } else {
      setMatchBlocker(null);
    }
  };

  // Match management
  const startLiveMatch = (fixtureId?: string) => {
    if (seasonFinished) return;

    // Reset blocker immediately
    setMatchBlocker(null);

    // Reset transient locks
    isSimulationRunningRef.current = false;
    setIsSimulationRunning(false);

    // Clear any lingering interval ticker
    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }

    // If currently in an active live match and NOT finished, resume it
    if (liveMatch && !liveMatch.isFinished) {
      resumeLiveMatch();
      try {
        window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }));
      } catch (_) {}
      return;
    }

    // If liveMatch was finished, clear it to start a fresh match
    if (liveMatch && liveMatch.isFinished) {
      setLiveMatch(null);
    }

    // 1. Resolve Target Fixture to play
    let targetFixture: Fixture | undefined = undefined;

    if (fixtureId) {
      targetFixture = (fixtures.find(f => f && f.id === fixtureId) || calendarSchedule.find(f => f && f.id === fixtureId)) as Fixture | undefined;
    }

    // If not found or if targetFixture is already played, find the earliest unplayed fixture for user club
    if (!targetFixture || targetFixture.isPlayed) {
      if (userClub) {
        // Priority 1: User's unplayed match today
        const todayMatch = userCalendarSchedule.find(m => m && !m.isPlayed && (m.date || '').trim() === (calendarDate?.rawDateStr || '').trim());
        if (todayMatch) {
          targetFixture = (fixtures.find(f => f && f.id === todayMatch.id) || todayMatch) as Fixture;
        }

        // Priority 2: User's chronological calendar schedule earliest unplayed match
        if (!targetFixture || targetFixture.isPlayed) {
          const unplayedCal = userCalendarSchedule.find(m => m && !m.isPlayed);
          if (unplayedCal) {
            targetFixture = (fixtures.find(f => f && f.id === unplayedCal.id) || unplayedCal) as Fixture;
          }
        }

        // Priority 3: Current round fixture for user club
        if (!targetFixture || targetFixture.isPlayed) {
          const roundFixtures = fixtures.filter(f => f && f.round === currentRound);
          targetFixture = roundFixtures.find(f => f && !f.isPlayed && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id));
        }

        // Priority 4: Any remaining unplayed fixture for user club across all rounds
        if (!targetFixture || targetFixture.isPlayed) {
          targetFixture = fixtures.find(f => f && !f.isPlayed && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id));
        }
      }
    }

    // If still no fixture or all user matches played, fallback to any round fixture
    if (!targetFixture || targetFixture.isPlayed) {
      const roundFixtures = fixtures.filter(f => f && f.round === currentRound);
      targetFixture = roundFixtures.find(f => f && !f.isPlayed) || roundFixtures[0];
    }

    if (!targetFixture) {
      console.warn('[startLiveMatch] No valid fixture found to play');
      return;
    }

    // 2. Synchronize Calendar Date & Current Round to the Target Fixture date
    // When the user explicitly requests to play the match, auto-align calendar date to matchday!
    if (targetFixture.date && targetFixture.date !== calendarDate?.rawDateStr) {
      try {
        const fixtureDateObj = parseDateString(targetFixture.date);
        const seasonStartObj = parseDateString(season?.startDate || '2026-08-15');
        const dayIdx = Math.max(1, Math.round((fixtureDateObj.getTime() - seasonStartObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const updatedDate = formatCalendarDate(fixtureDateObj, dayIdx);
        setCalendarDate(updatedDate);
        try {
          localStorage.setItem(`${STORAGE_KEY}_calendarDate`, JSON.stringify(updatedDate));
        } catch (_) {}
      } catch (dateErr) {
        console.warn('[startLiveMatch] Date sync notice:', dateErr);
      }
    }

    const targetCompType = normalizeCompetitionType(targetFixture.competitionType || targetFixture.tournamentId);
    if (targetCompType === 'LEAGUE' && targetFixture.round && targetFixture.round !== currentRound) {
      setCurrentRound(targetFixture.round);
      try {
        localStorage.setItem(`${STORAGE_KEY}_currentRound`, JSON.stringify(targetFixture.round));
      } catch (_) {}
    }

    // 3. Squad Lineup Safety Check: Auto-fix cleanly instead of hard blocking the user!
    let currentUserTactics = userClub?.tactics;
    const userIsInMatch = userClub && (targetFixture.homeTeamId === userClub.id || targetFixture.awayTeamId === userClub.id);
    if (userIsInMatch && userClub) {
      const val = validateSquadLineup(userClub);
      if (!val.isValid) {
        console.log('[startLiveMatch] Auto-fixing starting lineup for user club before match kickoff...');
        const fixResult = autoFixSquadLineup(userClub);
        if (userClub.tactics) {
          currentUserTactics = {
            ...userClub.tactics,
            startingPlayerIds: fixResult.updatedStartingPlayerIds,
            benchPlayerIds: fixResult.updatedBenchPlayerIds,
          };
        }

        setTeams(prevTeams => prevTeams.map(t => {
          if (t.isUserClub || (userClub && t.id === userClub.id)) {
            return {
              ...t,
              tactics: currentUserTactics!,
            };
          }
          return t;
        }));
      }
    }

    // 4. Close any open match blocker modal
    setMatchBlocker(null);

    // 5. Resolve Home & Away Teams
    let homeTeam = teams.find(t => t && t.id === targetFixture!.homeTeamId) || (targetFixture.homeTeamId ? findClubInWorld(targetFixture.homeTeamId) : undefined) || teams[0];
    let awayTeam = teams.find(t => t && t.id === targetFixture!.awayTeamId) || (targetFixture.awayTeamId ? findClubInWorld(targetFixture.awayTeamId) : undefined) || teams[1];

    if (homeTeam && (homeTeam.id === userClub?.id || homeTeam.isUserClub)) {
      homeTeam = { ...homeTeam, manager: (manager as any) };
    }
    if (awayTeam && (awayTeam.id === userClub?.id || awayTeam.isUserClub)) {
      awayTeam = { ...awayTeam, manager: (manager as any) };
    }

    // 6. Initialize fresh live match simulation state and start playing immediately
    const initialSimulationState = createInitialLiveMatchState(
      targetFixture,
      homeTeam,
      awayTeam,
      currentUserTactics,
      userClub?.id
    );
    initialSimulationState.isPlaying = true;

    completedMatchFixtureIdRef.current = null;
    isFinishingMatchRef.current = false;
    isMatchFinishedRef.current = false;
    isSimulationRunningRef.current = false;
    setIsSimulationRunning(false);
    setMatchBlocker(null);

    setLiveMatch(initialSimulationState);

    // Direct event-based navigation to matches tab
    try {
      window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }));
    } catch (_) {}
  };

  const pauseLiveMatch = () => {
    setLiveMatch(prev => prev ? { ...prev, isPlaying: false } : null);
  };

  const resumeLiveMatch = () => {
    setLiveMatch(prev => prev ? { ...prev, isPlaying: true } : null);
  };

  const setMatchSpeed = (speed: 1 | 2 | 4) => {
    setLiveMatch(prev => prev ? { ...prev, speed } : null);
  };

  const resumeSecondHalf = (teamTalkMoraleBoost: boolean = false) => {
    if (!liveMatch || !liveMatch.isHalfTime) return;

    if (teamTalkMoraleBoost) {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub) return t;
        return {
          ...t,
          players: (t.players || []).map(p => ({
            ...p,
            morale: Math.min(100, p.morale + 5),
          })),
        };
      }));
    }

    setLiveMatch(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isHalfTime: false,
        isPlaying: true,
        currentMinute: 45,
      };
    });
  };

  const makeLiveSubstitution = (outPlayerId: string, inPlayerId: string) => {
    if (!liveMatch) return { success: false, message: 'لا توجد مباراة جارية حالياً' };
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً' };
    if (liveMatch.substitutionsCount >= 5) {
      return { success: false, message: 'لقد استنفدت جميع التبديلات المتاحة (5 تبديلات)' };
    }

    swapPlayers(outPlayerId, inPlayerId);

    const userSquad = Array.isArray(userClub.players) ? userClub.players : [];
    const outPlayer = userSquad.find(p => p.id === outPlayerId);
    const inPlayer = userSquad.find(p => p.id === inPlayerId);

    const subEvent: MatchEvent = {
      minute: Math.max(1, liveMatch.currentMinute),
      type: 'substitution',
      teamId: userClub.id,
      inPlayerName: inPlayer?.name || 'بديل',
      outPlayerName: outPlayer?.name || 'أساسي',
      description: `🔄 تبديل لصالح ${userClub.shortName || userClub.name}: دخول (${inPlayer?.name || 'بديل'}) وخروج (${outPlayer?.name || 'أساسي'}).`
    };

    setLiveMatch(prev => {
      if (!prev) return null;
      const isHome = prev.homeTeam.id === userClub.id;
      const updatedLineup = (isHome ? prev.homeLineup : prev.awayLineup).map(id => id === outPlayerId ? inPlayerId : id);
      return {
        ...prev,
        homeLineup: isHome ? updatedLineup : prev.homeLineup,
        awayLineup: !isHome ? updatedLineup : prev.awayLineup,
        substitutionsCount: prev.substitutionsCount + 1,
        events: [...prev.events, subEvent].sort((a, b) => a.minute - b.minute),
      };
    });

    return {
      success: true,
      message: `تم إجراء التبديل: ${inPlayer?.name} بدلاً من ${outPlayer?.name} (التبديل ${liveMatch.substitutionsCount + 1}/5)`
    };
  };

  const toggleLiveAutoSubs = () => {
    setLiveMatch(prev => {
      if (!prev) return null;
      return {
        ...prev,
        autoSubsEnabled: !prev.autoSubsEnabled,
      };
    });
  };

  const recordUserMatchAction = (
    actionType: 'goal' | 'save' | 'chance' | 'tackle',
    description?: string,
    playerName?: string
  ) => {
    setLiveMatch(prev => {
      if (!prev || prev.isFinished) return prev;
      const isHome = userClub ? prev.homeTeam.id === userClub.id : true;
      const userTeam = isHome ? prev.homeTeam : prev.awayTeam;
      const currentMin = Math.max(1, prev.currentMinute);

      const resolvedPlayerName = playerName || userClub?.players?.[0]?.name || (isHome ? prev.homeTeam.name : prev.awayTeam.name);

      let eventType: MatchEvent['type'] = 'chance';
      let defaultDesc = `⚡ فرصة خطيرة بعد جملة تكتيكية وبناء هجومي رائع!`;

      if (actionType === 'goal') {
        eventType = 'goal';
        defaultDesc = `⚽ هـــــــــدف! (${resolvedPlayerName}) يسجل ببراعة بفضل التحكم اليدوي المباشر المتقن!`;
      } else if (actionType === 'save') {
        eventType = 'save';
        defaultDesc = `🧤 تصدي خيالي من حارس المرمى بعد تسديدة قوية محكمة!`;
      } else if (actionType === 'tackle') {
        eventType = 'chance';
        defaultDesc = `🛡️ استخلاص دفاعي بطولي وافتكاك للكرة في توقيت مثالي!`;
      }

      const newEvent: MatchEvent = {
        minute: currentMin,
        type: eventType,
        teamId: userTeam.id,
        playerName: actionType === 'goal' ? resolvedPlayerName : undefined,
        description: description || defaultDesc,
      };

      const newHomeScore = isHome && actionType === 'goal' ? prev.homeScore + 1 : prev.homeScore;
      const newAwayScore = !isHome && actionType === 'goal' ? prev.awayScore + 1 : prev.awayScore;

      return {
        ...prev,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        events: [...prev.events, newEvent].sort((a, b) => a.minute - b.minute),
        homeXg: isHome ? prev.homeXg + (actionType === 'goal' ? 0.72 : 0.25) : prev.homeXg,
        awayXg: !isHome ? prev.awayXg + (actionType === 'goal' ? 0.72 : 0.25) : prev.awayXg,
        homeDangerousAttacks: isHome ? prev.homeDangerousAttacks + 1 : prev.homeDangerousAttacks,
        awayDangerousAttacks: !isHome ? prev.awayDangerousAttacks + 1 : prev.awayDangerousAttacks,
        stats: {
          ...prev.stats,
          homeShots: isHome ? prev.stats.homeShots + 1 : prev.stats.homeShots,
          awayShots: !isHome ? prev.stats.awayShots + 1 : prev.stats.awayShots,
          homeShotsOnTarget: isHome && (actionType === 'goal' || actionType === 'save')
            ? prev.stats.homeShotsOnTarget + 1
            : prev.stats.homeShotsOnTarget,
          awayShotsOnTarget: !isHome && (actionType === 'goal' || actionType === 'save')
            ? prev.stats.awayShotsOnTarget + 1
            : prev.stats.awayShotsOnTarget,
        }
      };
    });
  };

  const hireClubStaff = (staffMember: StaffMember) => {
    if (!userClub) return;
    const updatedClub = hireStaffMember(userClub, staffMember);
    setTeams(prev => prev.map(t => t.id === userClub.id ? updatedClub : t));
  };

  const fireClubStaff = (role: StaffRole) => {
    if (!userClub) return;
    const updatedStaff = (userClub.staff || []).filter(s => s.role !== role);
    const updatedClub = {
      ...userClub,
      staff: updatedStaff,
    };
    setTeams(prev => prev.map(t => t.id === userClub.id ? updatedClub : t));
  };

  const changeLiveMentality = (mentality: TeamTactics['mentality']) => {
    if (!userClub?.tactics) return;
    updateTactics({ ...userClub.tactics, mentality });
  };

  const changeLivePressing = (pressingIntensity: TeamTactics['pressingIntensity']) => {
    if (!userClub?.tactics) return;
    updateTactics({ ...userClub.tactics, pressingIntensity });
  };

  const skipLiveMatchToEnd = () => {
    if (isSimulationRunningRef.current) return;
    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }

    setLiveMatch(prev => {
      if (!prev || prev.isFinished) return prev;
      try {
        let state = { ...prev, isHalfTime: false, isPlaying: true };
        const maxSteps = 100;
        let steps = 0;
        while (state.currentMinute < 90 && !state.isFinished && steps < maxSteps) {
          steps++;
          if (state.isHalfTime) {
            state.isHalfTime = false;
            state.isPlaying = true;
          }
          state = simulateMatchStep(state, userClub?.tactics);
        }
        const userIsInFixture = userClub && (state.fixture?.homeTeamId === userClub.id || state.fixture?.awayTeamId === userClub.id);
        const isUserHome = userClub ? state.fixture?.homeTeamId === userClub.id : true;
        const oppClub = isUserHome ? state.awayTeam : state.homeTeam;
        const userScore = isUserHome ? state.homeScore : state.awayScore;
        const oppScore = isUserHome ? state.awayScore : state.homeScore;

        const isCup = 
          state.fixture?.competitionType === 'cup' || 
          Boolean(state.fixture?.cupStage) || 
          Boolean(state.fixture?.stageName?.includes('نهائي')) ||
          Boolean(state.fixture?.stageName?.includes('كأس')) ||
          Boolean(state.fixture?.stageName?.includes('الكأس')) ||
          Boolean(state.fixture?.stageName?.includes('دور الـ')) ||
          Boolean(state.fixture?.competitionName?.includes('كأس')) ||
          Boolean(state.fixture?.competitionName?.includes('الكأس')) ||
          Boolean(state.fixture?.competitionName?.toLowerCase()?.includes('cup')) ||
          Boolean(state.fixture?.id?.toLowerCase()?.includes('cup'));
        let finalHomePenalties = state.homePenalties;
        let finalAwayPenalties = state.awayPenalties;
        let penaltyEvents = state.events || [];

        if (isCup && state.homeScore === state.awayScore) {
          if (finalHomePenalties === undefined || finalAwayPenalties === undefined || finalHomePenalties === finalAwayPenalties) {
            const shoot = simulatePenaltyShootout(state.homeTeam, state.awayTeam, state.homeTactics, state.awayTactics);
            finalHomePenalties = shoot.homePenalties;
            finalAwayPenalties = shoot.awayPenalties;
            penaltyEvents = [...penaltyEvents, ...shoot.penaltyEvents];
          }
        }

        const calculatedRevenue = (userIsInFixture && userClub) ? calculateMatchRevenue({
          userClub,
          opponentClub: oppClub,
          isHome: isUserHome,
          userScore,
          opponentScore: oppScore,
          leagueTier: activeLeague?.tier || 1,
          isCupMatch: isCup,
          userPenalties: isCup ? (isUserHome ? finalHomePenalties : finalAwayPenalties) : undefined,
          opponentPenalties: isCup ? (isUserHome ? finalAwayPenalties : finalHomePenalties) : undefined,
          customTicketPrice: userClub.facilities?.ticketPrice,
          isSkipped: true, // 50% revenue penalty for skipping the match
        }) : undefined;

        isMatchFinishedRef.current = true;

        return {
          ...state,
          currentMinute: 90,
          isPlaying: false,
          isFinished: true,
          isHalfTime: false,
          homePenalties: finalHomePenalties,
          awayPenalties: finalAwayPenalties,
          events: penaltyEvents,
          matchRevenue: calculatedRevenue,
        };
      } catch (err) {
        console.error('Error during skipLiveMatchToEnd:', err);
        isMatchFinishedRef.current = true;
        return {
          ...prev,
          currentMinute: 90,
          isPlaying: false,
          isFinished: true,
          isHalfTime: false,
        };
      }
    });
  };

  const finishLiveMatchAndAdvance = async () => {
    console.log('[DIAG] ADVANCE_STARTED');
    console.log('[MatchEndingFlow] END_MATCH_STARTED');
    console.log('[MatchEndingFlow] finishLiveMatchAndAdvance called. State:', liveMatch ? {
      fixtureId: liveMatch.fixture?.id,
      isFinished: liveMatch.isFinished,
      minute: liveMatch.currentMinute,
      score: `${liveMatch.homeScore}-${liveMatch.awayScore}`
    } : 'null');

    if (isFinishingMatchRef.current || isSimulationRunningRef.current) {
      console.warn('[MatchEndingFlow] Blocked: match finalization or simulation already running');
      return;
    }
    if (!liveMatch || !liveMatch.isFinished) {
      console.warn('[MatchEndingFlow] Blocked: liveMatch is not active or not finished');
      return;
    }

    const currentFixtureId = liveMatch.fixture?.id;
    if (!currentFixtureId) {
      console.warn('[MatchEndingFlow] Blocked: liveMatch has no fixture ID. Clearing state.');
      setLiveMatch(null);
      return;
    }

    if (completedMatchFixtureIdRef.current === currentFixtureId) {
      console.log('[MatchEndingFlow] Idempotency catch: fixture', currentFixtureId, 'already finalized');
      setLiveMatch(null);
      return;
    }

    const targetFixtureInList = fixtures.find(f => f && f.id === currentFixtureId);
    if (targetFixtureInList && targetFixtureInList.isPlayed) {
      console.log('[MatchEndingFlow] Fixture', currentFixtureId, 'is already marked isPlayed in list. Ensuring progression and clearing liveMatch.');
      completedMatchFixtureIdRef.current = currentFixtureId;
      setLiveMatch(null);
      if (currentRound <= targetFixtureInList.round) {
        const nextRound = targetFixtureInList.round + 1;
        const currentRaw = calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr;
        const safeDayIdx = (calendarDate?.dayIndexInSeason || 1) + 1;
        const nextCalendar = addDaysToDate(currentRaw, 1, safeDayIdx);
        const nextSeason = { ...season, currentRound: nextRound };
        setCurrentRound(nextRound);
        setCalendarDate(nextCalendar);
        setSeason(nextSeason);
        try {
          localStorage.setItem(`${STORAGE_KEY}_currentRound`, JSON.stringify(nextRound));
          localStorage.setItem(`${STORAGE_KEY}_calendarDate`, JSON.stringify(nextCalendar));
          localStorage.setItem(`${STORAGE_KEY}_season`, JSON.stringify(nextSeason));
        } catch (_) {}
      }
      return;
    }

    // Capture snapshot and immediately stop all match timers + yield one frame so loading overlay renders cleanly without black screen freeze
    const activeMatchSnapshot = liveMatch;
    isFinishingMatchRef.current = true;
    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);
    completedMatchFixtureIdRef.current = currentFixtureId;

    clearMatchSimulationTimers();
    liveMatchRef.current = null;
    setLiveMatch(null);

    try {
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => {
          setTimeout(resolve, 16);
        })
      );
      console.log('[MatchEndingFlow] Processing match finalization for fixture:', currentFixtureId);
      const { fixture, homeTeam, awayTeam, homeScore, awayScore, events, stats } = activeMatchSnapshot;
      const homeTeamId = homeTeam?.id || fixture?.homeTeamId;
      const awayTeamId = awayTeam?.id || fixture?.awayTeamId;

    // 5. Data Pruning: Keep rawMatchEvents in memory ONLY for post-match player stats calculation of this match,
    // and store only compact goal/red_card scorer summaries (persistentEvents) in permanent storage.
    const rawMatchEvents = (events || []).filter(e => e && e.type !== 'commentary');
    const persistentEvents = pruneMatchEventsForStorage(rawMatchEvents, true);

    const pruneCpuEvents = (evs: MatchEvent[] = []): MatchEvent[] => {
      return pruneMatchEventsForStorage(evs, true);
    };

    // Calculate official realistic match revenue breakdown
    const isUserHome = userClub ? homeTeam?.id === userClub.id : false;
    const userScore = isUserHome ? homeScore : awayScore;
    const oppScore = isUserHome ? awayScore : homeScore;
    const fixtureCompType = normalizeCompetitionType(fixture?.competitionType || fixture?.tournamentId);
    const isContinental = fixtureCompType === 'CONTINENTAL_CUP';
    const isContinentalKnockout = isContinental && Boolean(
      (fixture?.stage && fixture.stage !== 'group' && !fixture.stage.toLowerCase().includes('group')) ||
      (fixture?.stageName && !fixture.stageName.includes('المجموعات'))
    );
    const isCup = 
      fixtureCompType === 'DOMESTIC_COP' ||
      Boolean(fixture?.cupStage) || 
      Boolean(fixture?.competitionName?.includes('كأس')) ||
      Boolean(fixture?.competitionName?.includes('الكأس')) ||
      Boolean(fixture?.competitionName?.toLowerCase()?.includes('cup')) ||
      Boolean(fixture?.id?.toLowerCase()?.includes('cup')) ||
      Boolean(cupTournament?.matches?.some(m => m.id === fixture?.id));
    const requiresKnockoutResolution = isCup || isContinentalKnockout;

    const resolvedCupStage = fixture?.cupStage || (
      fixture?.stageName?.includes('64') ? 'round_of_64' :
      fixture?.stageName?.includes('32') ? 'round_of_32' :
      fixture?.stageName?.includes('16') || fixture?.stageName?.includes('ثمن') ? 'round_of_16' :
      fixture?.stageName?.includes('ربع') || fixture?.stageName?.includes('quarter') ? 'quarter' :
      fixture?.stageName?.includes('نصف') || fixture?.stageName?.includes('semi') ? 'semi' :
      fixture?.stageName?.includes('نهائي') || fixture?.stageName?.includes('final') ? 'final' :
      undefined
    );

    // Handle penalty shootout resolution for tied cup or continental knockout matches
    let finalHomePenalties = activeMatchSnapshot.homePenalties;
    let finalAwayPenalties = activeMatchSnapshot.awayPenalties;
    if (requiresKnockoutResolution && homeScore === awayScore) {
      if (finalHomePenalties === undefined || finalAwayPenalties === undefined || finalHomePenalties === finalAwayPenalties) {
        const shoot = simulatePenaltyShootout(homeTeam, awayTeam, activeMatchSnapshot.homeTactics, activeMatchSnapshot.awayTactics);
        finalHomePenalties = shoot.homePenalties;
        finalAwayPenalties = shoot.awayPenalties;
      }
    }

    const hasPenalties = requiresKnockoutResolution && finalHomePenalties !== undefined && finalAwayPenalties !== undefined;
    const userPenalties = isUserHome ? finalHomePenalties : finalAwayPenalties;
    const oppPenalties = isUserHome ? finalAwayPenalties : finalHomePenalties;

    // In knockout matches, progression is decided by penalty shootout on draw
    const isUserWin = requiresKnockoutResolution
      ? (hasPenalties ? (userPenalties! > oppPenalties!) : userScore > oppScore)
      : userScore > oppScore;
    const isUserDraw = requiresKnockoutResolution
      ? false
      : userScore === oppScore;
    const isUserLoss = requiresKnockoutResolution
      ? (hasPenalties ? (userPenalties! < oppPenalties!) : userScore < oppScore)
      : userScore < oppScore;

    const matchWinner = requiresKnockoutResolution
      ? (hasPenalties ? (finalHomePenalties! > finalAwayPenalties! ? homeTeamId : awayTeamId) : (homeScore > awayScore ? homeTeamId : awayTeamId))
      : (homeScore > awayScore ? homeTeamId : awayScore > homeScore ? awayTeamId : undefined);

    const resolvedRevenue: MatchRevenueBreakdown = (activeMatchSnapshot.matchRevenue) || (userClub ? calculateMatchRevenue({
      userClub,
      opponentClub: isUserHome ? awayTeam : homeTeam,
      isHome: isUserHome,
      userScore,
      opponentScore: oppScore,
      leagueTier: activeLeague?.tier || 1,
      isCupMatch: isCup || isContinental,
      userPenalties: requiresKnockoutResolution ? userPenalties : undefined,
      opponentPenalties: requiresKnockoutResolution ? oppPenalties : undefined,
      customTicketPrice: userClub.facilities?.ticketPrice,
    }) : {
      isHome: isUserHome,
      stadiumCapacity: 5000,
      attendance: 3500,
      attendancePercentage: 70,
      ticketPrice: 20,
      benchmarkTicketPrice: 20,
      ticketRevenue: 70000,
      sponsorsRevenue: 15000,
      sponsorsWinBonus: 0,
      sponsorsMatchdayAd: 15000,
      resultBonus: isUserWin ? 20000 : isUserDraw ? 5000 : 0,
      resultType: isUserWin ? 'win' : isUserDraw ? 'draw' : 'loss',
      baseTotalRevenue: 90000,
      totalRevenue: 90000,
      isDoubledWithAd: false,
      adDoubledBonus: 0,
      isClaimedToBudget: false,
    });

    resolvedRevenue.isClaimedToBudget = true;
    const totalMatchRevenue = resolvedRevenue.totalRevenue;

    // 1. Dispatch user's match result through Central Tournament Dispatcher
    const userFinishedFixture: Fixture = {
      ...fixture,
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      homePenalties: finalHomePenalties,
      awayPenalties: finalAwayPenalties,
      winnerTeamId: matchWinner,
      isPlayed: true,
      events: persistentEvents,
      stats,
      revenueClaimed: true,
      matchRevenue: resolvedRevenue,
    };

    let updatedFixtures = fixtures.map(f => (f.id === fixture.id ? userFinishedFixture : f));
    let updatedStandings = standings;
    let updatedCupTournament = cupTournament;
    let updatedContinental = africanChampionsLeague;

    const userDispatch = await processMatchResult(userFinishedFixture, {
      standings: updatedStandings,
      cupTournament: updatedCupTournament,
      continentalTournament: updatedContinental,
      fixtures: updatedFixtures,
      teams,
      userClub,
      currentRound,
    });
    updatedStandings = userDispatch.updatedStandings;
    updatedCupTournament = userDispatch.updatedCupTournament;
    updatedContinental = userDispatch.updatedContinentalTournament;
    updatedFixtures = userDispatch.updatedFixtures;

    // Check if user won Cup Final or Continental Final for manager trophy rewards
    if (isCup && updatedCupTournament?.isCompleted && userClub && updatedCupTournament.winnerClubId === userClub.id) {
      const cupTrophy = updatedCupTournament.trophyName || updatedCupTournament.name || 'كأس مصر';
      setManager(prev => {
        const prevTrophies = prev.trophies || [];
        if (!prevTrophies.includes(cupTrophy)) {
          return {
            ...prev,
            cupTitles: (prev.cupTitles || 0) + 1,
            trophies: [...prevTrophies, cupTrophy],
            xp: prev.xp + 300,
            reputation: Math.min(99, prev.reputation + 6),
          };
        }
        return prev;
      });
      setInbox(prev => [{
        id: `msg_cup_champion_${Date.now()}`,
        title: `🏆 مبروك! توجت رسمياً بلقب ${cupTrophy}!`,
        sender: 'اتحاد كرة القدم',
        date: 'المباراة النهائية',
        type: 'board',
        read: false,
        content: `إنجاز تاريخي للمدرب ${manager.name}! بعد ملحمة كروية لا تُنسى، نجحت في قيادة ${userClub?.name} لمنصة التتويج وحصد لقب الكأس الغالية.`,
      }, ...prev]);
    }

    if (isContinental && updatedContinental?.currentStage === 'completed' && userClub && updatedContinental.winnerClubId === userClub.id) {
      const cafTrophy = updatedContinental.name || 'دوري أبطال إفريقيا';
      setManager(prev => {
        const prevTrophies = prev.trophies || [];
        if (!prevTrophies.includes(cafTrophy)) {
          return {
            ...prev,
            trophies: [...prevTrophies, cafTrophy],
            xp: prev.xp + 600,
            reputation: Math.min(99, prev.reputation + 12),
          };
        }
        return prev;
      });
      setInbox(prev => [{
        id: `msg_caf_champion_${Date.now()}`,
        title: `🌍🏆 مبروك! بطل دوري أبطال إفريقيا مع ${userClub?.name}!`,
        sender: 'الاتحاد الإفريقي لكرة القدم (CAF)',
        date: 'نهائي إفريقيا',
        type: 'board',
        read: false,
        content: `إنجاز قاري خارق للمدرب ${manager.name}! نجحت في قيادة ${userClub?.name} للتتويج بلقب دوري أبطال إفريقيا والتربع على عرش القارة السمراء!`,
      }, ...prev]);
    }

    // 2. Simulate other matches of the same competition on the same round/date
    const allRoundMatches: {
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number;
      awayScore: number;
      events: MatchEvent[];
      isCup?: boolean;
      homePenalties?: number;
      awayPenalties?: number;
      winnerTeamId?: string;
    }[] = [
      {
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore,
        awayScore,
        events: rawMatchEvents,
        isCup: requiresKnockoutResolution,
        homePenalties: finalHomePenalties,
        awayPenalties: finalAwayPenalties,
        winnerTeamId: matchWinner,
      }
    ];

    if (DIAGNOSTIC_CONFIG.ENABLE_CPU_SIMULATION) {
      console.log('[DIAG] CPU_SIMULATION_STARTED');
      const otherRoundFixtures = updatedFixtures.filter(f => {
        if (!f || f.id === fixture.id || f.isPlayed) return false;
        const isUserFix = Boolean(userClub && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id));
        if (isUserFix) return false;

        const fComp = normalizeCompetitionType(f.competitionType || f.tournamentId);
        return fComp === 'LEAGUE' && f.round === (fixture.round || currentRound);
      });

      for (let i = 0; i < otherRoundFixtures.length; i++) {
        const otherFix = otherRoundFixtures[i];
        try {
          const otherHome = (teams.find(t => t && t.id === otherFix.homeTeamId) || (otherFix.homeTeamId ? findClubInWorld(otherFix.homeTeamId) : undefined) || teams[0]) || ({ id: otherFix.homeTeamId || 'home_dummy', name: 'الفريق المضيف', shortName: 'مض', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
          const otherAway = (teams.find(t => t && t.id === otherFix.awayTeamId) || (otherFix.awayTeamId ? findClubInWorld(otherFix.awayTeamId) : undefined) || teams[1]) || ({ id: otherFix.awayTeamId || 'away_dummy', name: 'الفريق الضيف', shortName: 'ضف', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
          const otherResult = simulateMatch(otherHome, otherAway, otherHome.tactics, otherAway.tactics);
          const prunedOtherEvents = pruneCpuEvents(otherResult.events);

          const finishedOtherFix: Fixture = {
            ...otherFix,
            homeScore: otherResult.homeScore,
            awayScore: otherResult.awayScore,
            isPlayed: true,
            events: prunedOtherEvents,
            stats: otherResult.stats,
          };

          const cpuDispatch = await processMatchResult(finishedOtherFix, {
            standings: updatedStandings,
            cupTournament: null,
            continentalTournament: null,
            fixtures: updatedFixtures,
            teams,
            userClub,
            currentRound,
          });
          updatedStandings = cpuDispatch.updatedStandings;
          updatedFixtures = cpuDispatch.updatedFixtures;

          allRoundMatches.push({
            homeTeamId: otherHome.id,
            awayTeamId: otherAway.id,
            homeScore: otherResult.homeScore,
            awayScore: otherResult.awayScore,
            events: prunedOtherEvents,
            isCup: false,
          });
        } catch (matchErr) {
          console.warn('[MatchEndingFlow] Error simulating CPU fixture:', otherFix?.id, matchErr);
        }

        if ((i + 1) % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      console.log('[DIAG] CPU_SIMULATION_COMPLETED');
    } else {
      console.log('[DIAG] CPU_SIMULATION_SKIPPED [TEST_A]');
    }

    // Advance domestic league currentRound and align calendar date with next round
    const unplayedLeagueRounds = updatedFixtures
      .filter(f => f && normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && !f.isPlayed)
      .map(f => f.round || 1);
    const earliestUnplayedLeagueRound = unplayedLeagueRounds.length > 0 ? Math.min(...unplayedLeagueRounds) : null;
    const nextRoundNumber = earliestUnplayedLeagueRound !== null
      ? earliestUnplayedLeagueRound
      : currentRound + 1;
    const currentRaw = calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr;
    const safeDayIdx = (calendarDate?.dayIndexInSeason || 1) + 1;
    const updatedCalendarDate = addDaysToDate(currentRaw, 1, safeDayIdx);
    const updatedSeason: SeasonInfo = {
      ...season,
      currentRound: nextRoundNumber,
      status: nextRoundNumber > totalRounds ? 'completed' : season.status,
    };

    // Store only lightweight scalar header fields in safeLocalStorageSet; full state is saved to IndexedDB
    safeLocalStorageSet(`${STORAGE_KEY}_currentRound`, JSON.stringify(nextRoundNumber));
    safeLocalStorageSet(`${STORAGE_KEY}_calendarDate`, JSON.stringify(updatedCalendarDate));
    safeLocalStorageSet(`${STORAGE_KEY}_season`, JSON.stringify(updatedSeason));

    let cupNewsMessage: string | undefined = undefined;
    let cupBonusPrize = 0;
    let cupBonusDevPoints = 0;
    const cupRewardMessages: InboxMessage[] = [];

    // 4. Update User Club finances
    // Round wages expense (approx 1/4 of monthly wage bill)
    const roundWages = userClub ? Math.round((userClub.players || []).reduce((sum, p) => sum + (p.salary || 1000), 0) / 4) : 0;

    // Financial breakdown message for user club
    if (userClub && resolvedRevenue) {
      cupRewardMessages.push({
        id: `msg_match_rev_${fixture.id}_${Date.now()}`,
        title: `💰 تقرير إيراد مباراة الجولة ${currentRound}: +${(totalMatchRevenue || 0).toLocaleString()} ج.م${resolvedRevenue.isSkippedMatch ? ' (تخطي 50%)' : ''}`,
        sender: 'الإدارة المالية للنادي',
        date: `الجولة ${currentRound}`,
        type: 'board',
        read: false,
        content: `كشف الإيرادات المالية الرسمية لمباراة الجولة ${currentRound}:\n\n` +
          `🏟️ الحضور الجماهيري: ${(resolvedRevenue.attendance || 0).toLocaleString()} مشجع من أصل ${(resolvedRevenue.stadiumCapacity || 0).toLocaleString()} مقعد (${resolvedRevenue.attendancePercentage || 0}%)\n` +
          `🎟️ سعر التذكرة: ${resolvedRevenue.ticketPrice || 0} ج.م • دخل التذاكر الأساسي: ${(resolvedRevenue.ticketRevenue || 0).toLocaleString()} ج.م\n` +
          `📢 رعاة النادي والإعلانات: ${(resolvedRevenue.sponsorsRevenue || 0).toLocaleString()} ج.م (مكافأة الفوز: ${(resolvedRevenue.sponsorsWinBonus || 0).toLocaleString()} ج.م)\n` +
          (resolvedRevenue.sponsorsBreakdown && resolvedRevenue.sponsorsBreakdown.length > 0
            ? resolvedRevenue.sponsorsBreakdown.map(b => `  • ${b}`).join('\n') + '\n'
            : '') +
          `🏆 مكافأة النتيجة الرسمية (${resolvedRevenue.resultType === 'win' ? 'فوز 🏆' : resolvedRevenue.resultType === 'draw' ? 'تعادل 🤝' : 'هزيمة (0 ج.م)'}): ${(resolvedRevenue.resultBonus || 0) > 0 ? `+${(resolvedRevenue.resultBonus || 0).toLocaleString()} ج.م` : '0 ج.م (لا يوجد مكافأة عند الهزيمة)'}\n` +
          (resolvedRevenue.isSkippedMatch ? `\n⚠️ خصم تخطي المباراة (50%): -${(resolvedRevenue.skipPenaltyAmount || 0).toLocaleString()} ج.م\n(تم منحك نصف الإيرادات فقط كخصم لتخطي المباراة، تشجيعاً لخوض المباريات كاملة)\n` : '') +
          (resolvedRevenue.isDoubledWithAd ? `🎁 مكافأة مضاعفة الإعلان (2X): +${(resolvedRevenue.adDoubledBonus || 0).toLocaleString()} ج.م\n` : '') +
          `\n✅ الإجمالي النهائي المودع في رصيد النادي: ${(totalMatchRevenue || 0).toLocaleString()} جنيه مصري.`,
      });
    }

    // Update club economy tracking
    if (DIAGNOSTIC_CONFIG.ENABLE_BOARD_AND_ECONOMY && userClub) {
      setClubEconomy(prev => ({
        ...prev,
        matchIncomeTotal: prev.matchIncomeTotal + totalMatchRevenue,
        salaryExpensesTotal: prev.salaryExpensesTotal + roundWages,
        currentSeasonNetProfit: prev.currentSeasonNetProfit + totalMatchRevenue - roundWages,
      }));
    }

    // Update player fitness, morale, and comprehensive stats across ALL teams in the league
    let updatedAllTeams = teams;
    if (DIAGNOSTIC_CONFIG.ENABLE_PLAYER_PROCESSING) {
      console.log('[DIAG] PLAYER_PROCESSING_STARTED');
      updatedAllTeams = teams.map(t => {
        const matchAsHome = allRoundMatches.find(m => m.homeTeamId === t.id);
        const matchAsAway = allRoundMatches.find(m => m.awayTeamId === t.id);
        const matchPlayed = matchAsHome || matchAsAway;

        if (!matchPlayed) return t;

        const isHome = !!matchAsHome;
        const tScore = isHome ? matchPlayed.homeScore : matchPlayed.awayScore;
        const matchOppScore = isHome ? matchPlayed.awayScore : matchPlayed.homeScore;
        const isTeamWin = tScore > matchOppScore;
        const isTeamDraw = tScore === matchOppScore;

        const teamPlayers = Array.isArray(t.players) ? t.players : [];
        const startingIds = (t.isUserClub && userClub)
          ? (userClub.tactics?.startingPlayerIds || teamPlayers.slice(0, 11).map(p => p.id))
          : (t.tactics?.startingPlayerIds || teamPlayers.slice(0, 11).map(p => p.id));

        const { updatedPlayers: fatigueUpdatedPlayers, transferMessages, departedPlayers } = processPostMatchPlayerUpdates(
          t,
          startingIds,
          matchPlayed,
          isTeamWin,
          isTeamDraw,
          t.isUserClub
        );

        if (transferMessages.length > 0) {
          setInbox(prev => [...transferMessages, ...prev]);
        }

        let extraTransferIncome = 0;
        if (departedPlayers.length > 0) {
          extraTransferIncome = departedPlayers.reduce((sum, dp) => sum + dp.fee, 0);
        }

        // Precompute player match events into an O(1) lookup map once per team
        const matchStatsMap = buildMatchStatsMap(matchPlayed.events);

        const updatedPlayers = fatigueUpdatedPlayers.map(p => {
          const isStarter = startingIds.includes(p.id);

          const pStats = matchStatsMap.getPlayerStats(p.id, p.name);
          const playerGoals = pStats.goals;
          const playerAssists = pStats.assists;
          const playerYellows = pStats.yellows;
          const playerReds = pStats.reds;

          // Realistic individual match rating
          let matchRating = isStarter ? (isTeamWin ? 7.3 : isTeamDraw ? 6.7 : 6.1) : 6.0;
          if (playerGoals > 0) matchRating += playerGoals * 0.9;
          if (playerAssists > 0) matchRating += playerAssists * 0.5;
          if (playerYellows > 0) matchRating -= 0.4;
          if (playerReds > 0) matchRating -= 2.0;
          if (p.positionCategory === 'GK' && matchOppScore === 0 && isStarter) matchRating += 0.8;
          matchRating = Math.min(10, Math.max(4, Number(matchRating.toFixed(1))));

          const currentApps = p.stats?.appearances || 0;
          const currentAvg = p.stats?.averageRating || 7.0;
          const newAvg = isStarter ? Number(((currentAvg * currentApps + matchRating) / (currentApps + 1)).toFixed(2)) : currentAvg;
          const totalYellows = (p.stats?.yellowCards || 0) + playerYellows;
          const totalReds = (p.stats?.redCards || 0) + playerReds;

          // Realistic Suspension Tracking:
          let newSuspensionMatches = p.suspensionMatches ? Math.max(0, p.suspensionMatches - 1) : 0;
          let newIsSuspended = newSuspensionMatches > 0;
          let newSuspensionReason = newIsSuspended ? p.suspensionReason : undefined;

          if (playerReds > 0) {
            newSuspensionMatches = 2;
            newIsSuspended = true;
            newSuspensionReason = 'طرد ببطاقة حمراء مباشرة';
          } else if (playerYellows > 0 && totalYellows > 0 && totalYellows % 3 === 0) {
            newSuspensionMatches = 1;
            newIsSuspended = true;
            newSuspensionReason = 'تراكم 3 بطاقات صفراء';
          }

          const roundWageEarned = Math.round((p.salary || 2000) / 4);
          const playerSavings = (p.savings !== undefined ? p.savings : calculateInitialPlayerSavings(p)) + roundWageEarned;

          return {
            ...p,
            savings: playerSavings,
            totalBonusesReceived: p.totalBonusesReceived ?? 0,
            isSuspended: newIsSuspended,
            suspensionMatches: newSuspensionMatches,
            suspensionReason: newSuspensionReason,
            stats: {
              ...p.stats,
              appearances: currentApps + (isStarter ? 1 : 0),
              goals: (p.stats?.goals || 0) + playerGoals,
              assists: (p.stats?.assists || 0) + playerAssists,
              yellowCards: totalYellows,
              redCards: totalReds,
              cleanSheets: (p.stats?.cleanSheets || 0) + (p.positionCategory === 'GK' && matchOppScore === 0 && isStarter ? 1 : 0),
              averageRating: newAvg,
            }
          };
        });

        let processedSponsors = t.sponsors;
        if (t.isUserClub && Array.isArray(t.sponsors) && t.sponsors.length > 0) {
          const isMonthTick = currentRound % 4 === 0;
          processedSponsors = t.sponsors.map(sp => {
            const months = isMonthTick
              ? Math.max(0, (sp.contractMonthsRemaining ?? 12) - 1)
              : (sp.contractMonthsRemaining ?? 12);
            let sat = sp.satisfaction ?? 85;
            if (isUserWin) sat = Math.min(100, sat + 2);
            else if (isUserLoss) sat = Math.max(30, sat - 3);
            return {
              ...sp,
              contractMonthsRemaining: months,
              satisfaction: sat,
            };
          });
        }

        let finalPlayers = updatedPlayers;
        let finalTactics = t.tactics;
        if (t.isUserClub) {
          const guestStars = updatedPlayers.filter(p => Boolean(p && p.isGuestStar));
          if (guestStars.length > 0) {
            finalPlayers = updatedPlayers.filter(p => !p || !p.isGuestStar);
            if (t.tactics) {
              const guestIds = guestStars.map(g => g.id);
              const remainingIds = finalPlayers.map(p => p.id);
              let sIds = (t.tactics.startingPlayerIds || []).filter(id => !guestIds.includes(id));
              let bIds = (t.tactics.benchPlayerIds || []).filter(id => !guestIds.includes(id));
              for (const pId of remainingIds) {
                if (sIds.length >= 11) break;
                if (!sIds.includes(pId) && !bIds.includes(pId)) {
                  sIds.push(pId);
                }
              }
              finalTactics = {
                ...t.tactics,
                startingPlayerIds: sIds,
                benchPlayerIds: bIds,
              };
            }
          }
        }

        return {
          ...t,
          budget: t.isUserClub ? t.budget + totalMatchRevenue + cupBonusPrize + extraTransferIncome : t.budget,
          developmentPoints: t.isUserClub ? (t.developmentPoints || 0) + cupBonusDevPoints : t.developmentPoints,
          players: finalPlayers,
          tactics: finalTactics,
          sponsors: processedSponsors,
        };
      });
      console.log('[DIAG] PLAYER_PROCESSING_COMPLETED');
    } else {
      console.log('[DIAG] PLAYER_PROCESSING_SKIPPED [TEST_A]');
    }

    // 5. Update Manager Profile & World Ranking Points (Rebalanced for meaningful, challenging long-term progression)
    const xpGained = isUserWin ? 25 : isUserDraw ? 8 : 2;
    const repGained = isUserWin ? 1 : isUserDraw ? 0 : -1;
    let newXp = manager.xp + xpGained;
    let newLevel = manager.level;
    let newXpToNext = manager.xpToNextLevel;
    let newLicense = manager.license;

    if (newXp >= newXpToNext) {
      newLevel += 1;
      newXp = newXp - newXpToNext;
      newXpToNext = Math.round(newXpToNext * 1.35); // Challenging geometric XP curve
      // Note: Licenses are never skipped automatically by level; they require rigorous exam & performance criteria
    }

    const oppTier = activeLeague.tier || 1;
    const oppRep = activeLeague.reputation || 50;
    const oppTeamObj = isUserHome ? awayTeam : homeTeam;
    const oppClubRating = (oppTeamObj as any)?.rating || oppTeamObj?.reputation || 65;
    const { managerPointsDelta } = calculateMatchRankingPoints(isUserWin ? 'W' : isUserDraw ? 'D' : 'L', oppTier, oppRep, 'league', oppClubRating);
    const updatedRankingPoints = Math.max(100, (manager.rankingPoints || 1200) + managerPointsDelta);

    const roundSalary = Math.round((manager.monthlySalary || 25000) / 4);
    // Win bonus: paid on top of the weekly salary
    const matchBonus = isUserWin ? calculateWinBonus(manager.monthlySalary, activeLeague.tier || 1) : 0;
    const managerCupBonusCut = cupBonusPrize > 0 ? Math.round(cupBonusPrize * 0.15) : 0;
    const totalManagerIncome = roundSalary + matchBonus + managerCupBonusCut;

    const salaryTx: ManagerTransaction = {
      id: `tx_sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: `الجولة ${currentRound}`,
      amount: roundSalary,
      type: 'salary',
      description: `الراتب الأسبوعي للجولة ${currentRound}`,
    };
    const newFinancialTxs: ManagerTransaction[] = [salaryTx];
    if (matchBonus > 0) {
      newFinancialTxs.push({
        id: `tx_win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: `الجولة ${currentRound}`,
        amount: matchBonus,
        type: 'match_bonus',
        description: `مكافأة الفوز في مباراة الجولة ${currentRound}`,
      });
    }
    if (managerCupBonusCut > 0) {
      newFinancialTxs.push({
        id: `tx_cup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: `الجولة ${currentRound}`,
        amount: managerCupBonusCut,
        type: 'trophy_bonus',
        description: `مكافأة التأهل في بطولة الكأس (${managerCupBonusCut.toLocaleString()} ج.م)`,
      });
    }

    lastUserInteractionRef.current = Date.now();

    const initialUpdatedManager: ManagerProfile = {
      ...manager,
      level: newLevel,
      xp: newXp,
      xpToNextLevel: newXpToNext,
      reputation: Math.max(1, Math.min(100, manager.reputation + repGained)),
      license: newLicense,
      matchesManaged: manager.matchesManaged + 1,
      wins: manager.wins + (isUserWin ? 1 : 0),
      draws: manager.draws + (isUserDraw ? 1 : 0),
      losses: manager.losses + (!isUserWin && !isUserDraw ? 1 : 0),
      totalPlayTimeMinutes: (manager.totalPlayTimeMinutes || 0) + 2,
      totalPlayersDeveloped: manager.totalPlayersDeveloped || 0,
      goalsScored: manager.goalsScored + userScore,
      goalsConceded: manager.goalsConceded + oppScore,
      careerEarnings: manager.careerEarnings + (isUserWin ? 2000 : 800) + cupBonusPrize,
      developmentPoints: (manager.developmentPoints || 0) + cupBonusDevPoints,
      rankingPoints: updatedRankingPoints,
      personalWallet: (manager.personalWallet || 0) + totalManagerIncome,
      monthlySalary: manager.monthlySalary || 25000,
      totalBonusesEarned: (manager.totalBonusesEarned || 0) + matchBonus + managerCupBonusCut,
      financialTransactions: [...newFinancialTxs, ...(manager.financialTransactions || [])].slice(0, 30),
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const isSameDay = manager.lastDailyResetDate === todayStr;
    const currentDailyPoints = isSameDay ? (manager.dailyPoints || 0) : 0;
    const currentMatches = isSameDay ? (manager.dailyMatchesPlayed || 0) : 0;
    const currentWins = isSameDay ? (manager.dailyWins || 0) : 0;
    const currentDraws = isSameDay ? (manager.dailyDraws || 0) : 0;
    const currentLosses = isSameDay ? (manager.dailyLosses || 0) : 0;
    const pointsEarned = isUserWin ? 3 : isUserDraw ? 1 : 0;

    const dynamicRating = calculateDynamicManagerRating(initialUpdatedManager);
    let updatedManager: ManagerProfile = {
      ...initialUpdatedManager,
      managerRating: dynamicRating,
      dailyPoints: currentDailyPoints + pointsEarned,
      dailyMatchesPlayed: currentMatches + 1,
      dailyWins: currentWins + (isUserWin ? 1 : 0),
      dailyDraws: currentDraws + (isUserDraw ? 1 : 0),
      dailyLosses: currentLosses + (!isUserWin && !isUserDraw ? 1 : 0),
      lastDailyResetDate: todayStr,
    };

    // 6. Dynamic Board & Fan Confidence Evaluation based on Club Target Position
    const matchOppClub = isUserHome ? awayTeam : homeTeam;
    let evalResult: ReturnType<typeof evaluateMatchImpactOnConfidence> | null = null;
    if (DIAGNOSTIC_CONFIG.ENABLE_BOARD_AND_ECONOMY && boardSystem && userClub) {
      evalResult = evaluateMatchImpactOnConfidence(
        boardSystem,
        userClub,
        updatedStandings,
        {
          isUserHome,
          userScore,
          oppScore,
          oppClub: matchOppClub,
          round: currentRound,
          totalRounds,
          isCupMatch: isCup,
          userWonOnPenalties: hasPenalties && isUserWin,
          userLostOnPenalties: hasPenalties && isUserLoss,
          homePenalties: finalHomePenalties,
          awayPenalties: finalAwayPenalties,
        }
      );
      setBoardSystem(evalResult.updatedBoardSystem);
    }

    // 7. Generate Match & Cup Inbox Messages
    const oppName = isUserHome ? (awayTeam?.name || 'المنافس') : (homeTeam?.name || 'المنافس');
    let matchOutcomeTitle = '';
    if (isCup) {
      if (hasPenalties) {
        matchOutcomeTitle = isUserWin
          ? `تأهل ملحمي بركلات الترجيح أمام ${oppName}! 🏆 (${userScore}-${oppScore}) [${userPenalties}-${oppPenalties} ركلات]`
          : `وداع مؤلم للكأس بركلات الترجيح أمام ${oppName} 😔 (${userScore}-${oppScore}) [${userPenalties}-${oppPenalties} ركلات]`;
      } else {
        matchOutcomeTitle = isUserWin
          ? `فوز وتأهل في مسابقة الكأس على ${oppName}! 🏆 (${userScore}-${oppScore})`
          : `هزيمة ووداع مسابقة الكأس أمام ${oppName} 😔 (${userScore}-${oppScore})`;
      }
    } else {
      matchOutcomeTitle = isUserWin
        ? `فوز مستحق على ${oppName}! 🎉 (${userScore}-${oppScore})`
        : isUserDraw
        ? `تعادل مثير أمام ${oppName} 🤝 (${userScore}-${oppScore})`
        : `هزيمة أمام ${oppName} 😔 (${userScore}-${oppScore})`;
    }

    let matchOutcomeContent = '';
    if (isCup) {
      if (hasPenalties) {
        matchOutcomeContent = isUserWin
          ? `ملحمة كروية حبست الأنفاس! نجح فريقك في حسم بطاقة التأهل بركلات الترجيح (${userPenalties}-${oppPenalties}) بعد التعادل في الوقت الأصلي (${userScore}-${oppScore}). مكافأة التأهل وتذاكر المباراة أضافت ${totalMatchRevenue.toLocaleString()} جنيه لخزينة النادي.`
          : `وداع مؤسف لمسابقة الكأس بعد الاحتكام لركلات الترجيح (${userPenalties}-${oppPenalties}). قدم اللاعبون أداءً بطولياً والتركيز الآن ينصب بالكامل على بطولة الدوري.`;
      } else {
        matchOutcomeContent = isUserWin
          ? `ألف مبروك التأهل المستحق في مسابقة الكأس! جماهير النادي فخورة بالأداء القوي ومواصلة المشوار نحو منصة التتويج.`
          : `هزيمة أدت لتوديع مسابقة الكأس. يجب استخلاص الدروس والتركيز على منافسات الدوري.`;
      }
    } else if (evalResult) {
      matchOutcomeContent = `أحداث الجولة ${currentRound}:\n\n👔 ${evalResult.boardFeedback}\n\n📣 ${evalResult.fanFeedback}\n\nالهدف المطلوب: ${evalResult.updatedBoardSystem.targetLeaguePositionText} | المركز الحالي: ${evalResult.updatedBoardSystem.currentStandingPosition || 1} | نسبة ثقة الإدارة: ${evalResult.updatedBoardSystem.confidence}% | نسبة رضا الجمهور: ${evalResult.updatedBoardSystem.fanConfidence || 80}%`;
    } else if (isUserWin) {
      matchOutcomeContent = `ألف مبروك يا كابتن! جماهير النادي في قمة السعادة بعد الانتصار الرائع. مكافأة الفوز وتذاكر المباراة أضافت ${totalMatchRevenue.toLocaleString()} جنيه لخزينة النادي.`;
    } else if (isUserDraw) {
      matchOutcomeContent = `نقطة ثمينة خارج الديار أو في ملعبنا. يجب مواصلة العمل في التدريبات وتصحيح الأخطاء الدفاعية في الجولة القادمة.`;
    } else {
      matchOutcomeContent = `مجلس الإدارة يطالبك بمراجعة الخطة والتكتيك سريعاً والتعويض في المباراة القادمة لتفادي تراجع الفريق في جدول الترتيب.`;
    }

    const newInboxMsgs: InboxMessage[] = [
      {
        id: `msg_match_round_${currentRound}_${Date.now()}`,
        title: matchOutcomeTitle,
        sender: 'المكتب الإعلامي ومجلس الإدارة',
        date: `الجولة ${currentRound}`,
        type: isUserWin ? 'fan' : 'board',
        read: false,
        content: matchOutcomeContent,
      },
    ];

    if (cupNewsMessage) {
      newInboxMsgs.push({
        id: `msg_cup_round_${currentRound}_${Date.now()}`,
        title: 'نتائج الكأس الوطنية 🏆',
        sender: 'اتحاد كرة القدم',
        date: `الجولة ${currentRound}`,
        type: 'news',
        read: false,
        content: cupNewsMessage,
      });
    }

    if (cupRewardMessages.length > 0) {
      newInboxMsgs.unshift(...cupRewardMessages);
    }

    if (userClub) {
      const departedStars = (userClub.players || []).filter(p => Boolean(p && p.isGuestStar));
      departedStars.forEach(star => {
        newInboxMsgs.push({
          id: `msg_guest_depart_${star.id}_${Date.now()}`,
          title: `✈️ انتهاء فترة إعارة النجم العالمي: ${star.name}`,
          sender: 'إدارة العلاقات العامة والتعاقدات',
          date: `الجولة ${currentRound}`,
          type: 'news',
          read: false,
          content: `انتهت رسمياً فترة إعارة النجم العالمي ${star.name} (${star.nickname}) بعد مشاركته مع الفريق في مباراة اليوم. غادر اللاعب النادي متمنياً للفريق دوام التوفيق والانتصارات.\n\n💡 يمكنك دائماً التعاقد مع نجم عالمي جديد قبل مباراتك القادمة عبر مشاهدة إعلاني رعاية!`,
        });
      });
    }

    // 6.5. Generate Incoming AI Bids & Check Expiring Contracts ONLY on League rounds (avoid blocking main thread after Cup/Continental matches)
    if (DIAGNOSTIC_CONFIG.ENABLE_INCOMING_BIDS && fixtureCompType === 'LEAGUE') {
      console.log('[DIAG] BIDS_STARTED');
      const latestUserClub = updatedAllTeams.find(t => t.isUserClub || (userClub && t.id === userClub.id)) || userClub;
      if (latestUserClub) {
        const aiBidsResult = generateIncomingAiBids(updatedAllTeams, latestUserClub, currentRound, season.seasonNumber);
        if (aiBidsResult.bids.length > 0) {
          setIncomingBids(prev => [...aiBidsResult.bids, ...prev].slice(0, 40));
          newInboxMsgs.unshift(...aiBidsResult.inboxMessages);
        }

        // Check expiring contracts
        const contractAlerts = checkExpiringContracts(latestUserClub, `الجولة ${currentRound}`, inbox);
        if (contractAlerts.length > 0) {
          newInboxMsgs.unshift(...contractAlerts);
        }
      }

      // Rival AI clubs actively buy players, strengthen weakest positions, and train squads for multi-team competition
      try {
        const aiCompRes = executeCompetitiveAiTransfersAndGrowth({
          teams: updatedAllTeams,
          transferMarket: transferMarket || [],
          seasonNumber: season?.seasonNumber || 1,
          currentRound: currentRound || 1,
          activeLeagueTier: activeLeague?.tier || 1,
        });
        updatedAllTeams = aiCompRes.updatedTeams;
        if (aiCompRes.updatedMarket) {
          setTransferMarket(aiCompRes.updatedMarket);
        }
        if (aiCompRes.newTransfers && aiCompRes.newTransfers.length > 0) {
          setTransferHistory(prev => [...aiCompRes.newTransfers, ...(prev || [])].slice(0, 120));
        }
        if (aiCompRes.inboxNotifications && aiCompRes.inboxNotifications.length > 0) {
          newInboxMsgs.unshift(...aiCompRes.inboxNotifications);
        }
      } catch (aiCompErr) {
        console.warn('[MatchEndingFlow] Non-fatal AI competitive transfer notice:', aiCompErr);
      }

      console.log('[DIAG] BIDS_COMPLETED');
    } else {
      console.log('[DIAG] BIDS_SKIPPED');
    }

    const remainingLeagueFixtures = updatedFixtures.filter(f => normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && !f.isPlayed);
    const hasRemainingRounds = nextRoundNumber <= totalRounds && updatedFixtures.some(f => normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && f.round >= nextRoundNumber);
    const isNowFinished = !hasRemainingRounds && remainingLeagueFixtures.length === 0;

    // 7. Check if Season Concluded
    if (isNowFinished) {
      // Strictly enforce contract duration expiry at the end of the season:
      // Any player signed for 1 season (or with 1 season remaining) who was not renewed drops to 0 and immediately transfers to another club!
      updatedAllTeams = updatedAllTeams.map(club => ({
        ...club,
        players: (club.players || []).map(p => {
          if (!p) return p;
          const alreadyDec = (p as any).lastContractDecrementedSeason === season.seasonNumber;
          const nextYears = alreadyDec
            ? Math.max(0, typeof p.contractYears === 'number' ? p.contractYears : 0)
            : Math.max(0, (typeof p.contractYears === 'number' ? p.contractYears : 2) - 1);
          return {
            ...p,
            contractYears: nextYears,
            lastContractDecrementedSeason: season.seasonNumber,
          } as Player;
        }),
      }));

      try {
        const endSeasonFreeAgentRes = processFreeAgentsAndAiTransfers(
          updatedAllTeams,
          transferMarket || [],
          season.seasonNumber,
          currentRound,
          userClub?.id
        );
        updatedAllTeams = endSeasonFreeAgentRes.updatedTeams;
        if (endSeasonFreeAgentRes.updatedMarket) {
          setTransferMarket(endSeasonFreeAgentRes.updatedMarket);
        }
        if (endSeasonFreeAgentRes.newTransfers && endSeasonFreeAgentRes.newTransfers.length > 0) {
          setTransferHistory(prev => [...endSeasonFreeAgentRes.newTransfers, ...(prev || [])].slice(0, 120));
        }
        if (endSeasonFreeAgentRes.inboxNotifications && endSeasonFreeAgentRes.inboxNotifications.length > 0) {
          newInboxMsgs.unshift(...endSeasonFreeAgentRes.inboxNotifications);
        }
      } catch (faErr) {
        console.warn('[MatchEndingFlow] End-of-season contract expiry transfer notice:', faErr);
      }

      const summaryClub =
        updatedAllTeams.find(t => t.isUserClub || (userClub && t.id === userClub.id)) ||
        userClub ||
        teams.find(t => t.isUserClub) ||
        teams[0];
      const summary = calculateSeasonEndSummary(
        { ...season, status: 'completed', totalRounds },
        updatedStandings,
        summaryClub,
        activeLeague,
        updatedCupTournament,
        updatedManager,
        africanChampionsLeague
      );

      // Immediately record League Trophy & Promotion in manager.trophies so Trophy Cabinet updates right away
      if ((updatedManager as any).lastTrophyAwardedSeasonNumber !== season.seasonNumber) {
        const newTrophiesList = [...(updatedManager.trophies || [])];
        if (summary.leagueTrophyAwarded && !newTrophiesList.includes(summary.leagueTrophyAwarded)) {
          newTrophiesList.push(summary.leagueTrophyAwarded);
        }
        updatedManager = {
          ...updatedManager,
          trophies: newTrophiesList,
          leagueTitles: (updatedManager.leagueTitles || 0) + (summary.resultStatus === 'champion' ? 1 : 0),
          promotions: (updatedManager.promotions || 0) + (summary.resultStatus === 'promoted' || (summary.resultStatus === 'champion' && summary.divisionTier > 1) ? 1 : 0),
          relegations: (updatedManager.relegations || 0) + (summary.resultStatus === 'relegated' ? 1 : 0),
          careerEarnings: (updatedManager.careerEarnings || 0) + (summary.prizeMoney || 0),
          lastTrophyAwardedSeasonNumber: season.seasonNumber,
        } as any;
      }

      if (updatedManager.lastSettledSeasonNumber !== season.seasonNumber) {
        const endOfSeasonManagerBonus = calculateManagerSeasonBonus(summary, updatedManager);
        const settlementRes = settleEndOfSeasonLicenseAndBonus(updatedManager, endOfSeasonManagerBonus, season.seasonNumber);
        updatedManager = settlementRes.updatedManager;
        summary.licenseSettlement = settlementRes.settlement;

        if (settlementRes.settlement.wasDowngraded && settlementRes.settlement.warningMessage) {
          newInboxMsgs.unshift({
            id: `msg_license_downgrade_${season.seasonNumber}_${Date.now()}`,
            title: `⚠️ إشعار خفض الرخصة التدريبية لعدم كفاية الرصيد الشخصي`,
            sender: 'لجنة الرخص والاعتماد التدريبي الدولي',
            date: 'ختام الموسم',
            type: 'board',
            read: false,
            content: settlementRes.settlement.warningMessage,
          });
        }
      }

      const offersManager = updatedManager;
      setSeasonEndSummary(summary);
      scheduleSeasonEndOffersAndModal(() =>
        generateSeasonJobOffers(offersManager, summaryClub, activeLeague, summary.finalPosition)
      );

      newInboxMsgs.unshift({
        id: `msg_season_end_${season.seasonNumber}_${Date.now()}`,
        title: `🏁 ختام الموسم ${season.seasonNumber} - ${summary.resultTitle}`,
        sender: 'مجلس إدارة النادي والرابطة',
        date: `ختام الموسم`,
        type: 'board',
        read: false,
        content: `انتهت منافسات الموسم رسمياً. ${summary.resultDescription} اضغط على زر مراجعة الموسم واختيار الدوري القادم للموسم الجديد.`,
      });
    }

    if (isNowFinished) {
      updatedSeason.status = 'completed';
    }

    // Robust Single Source of Truth: Reconstruct exact league standings from all played fixtures
    try {
      updatedStandings = recalculateStandingsFromFixtures(updatedStandings, teams, updatedFixtures);
    } catch (stErr) {
      console.warn('[MatchEndingFlow] Standings recalculate error:', stErr);
    }

    // Commit changes immediately to React state
    console.log('[MatchEndingFlow] Committing updated states to React: fixtures, standings, manager, cup, continental, inbox, teams, currentRound, calendarDate');
    setFixtures(updatedFixtures);
    setStandings(updatedStandings);
    setManager(updatedManager);
    setCupTournament(updatedCupTournament);
    if (updatedContinental) {
      setAfricanChampionsLeague(updatedContinental);
    }
    setInbox(prev => [...newInboxMsgs, ...(prev || [])].slice(0, 80));
    if (DIAGNOSTIC_CONFIG.ENABLE_PLAYER_PROCESSING) {
      setTeams(updatedAllTeams);
    }

    setSeason(updatedSeason);
    setCurrentRound(nextRoundNumber);
    setCalendarDate(updatedCalendarDate);
    setLiveMatch(null);

    // Boost Consumption
    try {
      AdManager.consumeTrainingBoost();
    } catch (e) {
      console.warn('Non-fatal error consuming training boost:', e);
    }

    // Track match in challengesManager
    try {
      const isUserHome = userClub ? fixture.homeTeamId === userClub.id : false;
      const isUserAway = userClub ? fixture.awayTeamId === userClub.id : false;
      const userGoals = isUserHome ? fixture.homeScore : isUserAway ? fixture.awayScore : 0;
      const oppGoals = isUserHome ? fixture.awayScore : isUserAway ? fixture.homeScore : 0;
      const isUserWin = userClub ? userGoals > oppGoals : false;
      const isUserDraw = userClub ? userGoals === oppGoals : false;

      challengesManager.recordMatchPlayed({
        isWin: isUserWin,
        isDraw: isUserDraw,
        userGoals,
        oppGoals,
        isAway: isUserAway,
      });
    } catch (_) {}

    // Prune older round events before committing to React state and IndexedDB
    const prunedFixturesForState = pruneFixturesForStorage(updatedFixtures, nextRoundNumber);
    setFixtures(prunedFixturesForState);

    // Write only lightweight scalar fields via safeLocalStorageSet; full state is saved to IndexedDB below
    safeLocalStorageSet(`${STORAGE_KEY}_currentRound`, JSON.stringify(nextRoundNumber));
    safeLocalStorageSet(`${STORAGE_KEY}_calendarDate`, JSON.stringify(updatedCalendarDate));
    safeLocalStorageSet(`${STORAGE_KEY}_season`, JSON.stringify(updatedSeason));
    safeLocalStorageSet(`${STORAGE_KEY}_manager`, JSON.stringify(updatedManager));
    if (updatedContinental) {
      const sNum = updatedContinental.seasonNumber || updatedSeason.seasonNumber || 1;
      const cCode = updatedContinental.competitionId || 'ccl';
      saveContinentalCacheToDb(sNum, cCode, updatedContinental);
    }

    // Immediately persist to local disk repository before releasing the concurrency lock
    if (DIAGNOSTIC_CONFIG.ENABLE_SAVE) {
      console.log('[DIAG] SAVE_STARTED');
      console.log('[MatchEndingFlow] SAVE_STARTED');
      try {
        await gameStateRepository.saveLocalGameState({
          schemaVersion: 2,
          saveVersion: 1,
          lastLocalSaveAt: Date.now(),
          season: updatedSeason,
          activeLeague,
          teams: updatedAllTeams,
          standings: updatedStandings,
          fixtures: updatedFixtures,
          currentRound: nextRoundNumber,
          manager: updatedManager,
          transferMarket,
          incomingBids,
          inbox: capInbox([...newInboxMsgs, ...inbox]),
          cupTournament: updatedCupTournament,
          africanChampionsLeague: updatedContinental,
          jobOffers,
          seasonEndSummary,
          transferHistory,
          clubEconomy,
          calendarDate: updatedCalendarDate,
          activeNegotiations,
          boardSystem,
          dailyNews,
          retiredPlayers,
          worldRankings,
          scoutedOpponents,
          deletedMessageIds,
        });
        console.log('[DIAG] SAVE_COMPLETED');
        console.log('[MatchEndingFlow] SAVE_COMPLETED');
      } catch (saveErr) {
        console.error('[MatchEndingFlow] Non-fatal save error in finishLiveMatchAndAdvance:', saveErr);
      }
    } else {
      console.log('[DIAG] SAVE_SKIPPED [TEST_A]');
    }

    console.log('[MatchEndingFlow] END_MATCH_COMPLETED');
    console.log('[DIAG] ADVANCE_COMPLETED');
    } catch (error) {
      console.error('[MatchEndingFlow] CRITICAL UNCAUGHT EXCEPTION in finishLiveMatchAndAdvance, running emergency state progression:', error);
      try {
        const fallbackNextRound = currentRound + 1;
        const currentRaw = calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr;
        const safeDayIdx = (calendarDate?.dayIndexInSeason || 1) + 1;
        const fallbackCalendar = addDaysToDate(currentRaw, 1, safeDayIdx);
        const fallbackSeason = { ...season, currentRound: fallbackNextRound };

        setCurrentRound(fallbackNextRound);
        setCalendarDate(fallbackCalendar);
        setSeason(fallbackSeason);
        setLiveMatch(null);

        localStorage.setItem(`${STORAGE_KEY}_currentRound`, JSON.stringify(fallbackNextRound));
        localStorage.setItem(`${STORAGE_KEY}_calendarDate`, JSON.stringify(fallbackCalendar));
        localStorage.setItem(`${STORAGE_KEY}_season`, JSON.stringify(fallbackSeason));
        localStorage.removeItem(`${STORAGE_KEY}_active_live_match`);
      } catch (e) {
        console.error('[MatchEndingFlow] Failed emergency recovery in catch block:', e);
        setLiveMatch(null);
      }
    } finally {
      // Concurrency lock released immediately and synchronously
      isFinishingMatchRef.current = false;
      isSimulationRunningRef.current = false;
      setIsSimulationRunning(false);
      console.log('[MatchEndingFlow] Concurrency locks released successfully');
    }
  };

  const instantSimulateCurrentRound = async (options?: { advanceDate?: boolean; forcePlayUserMatch?: boolean }) => {
    if (isSimulationRunningRef.current || seasonFinished) return;

    // Clear any active live match timer and reset live match state
    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }
    setLiveMatch(null);
    setMatchBlocker(null);

    // Auto-fix squad lineup cleanly instead of hard blocking the user!
    if (userClub) {
      const val = validateSquadLineup(userClub);
      if (!val.isValid) {
        console.log('[instantSimulateCurrentRound] Auto-fixing invalid lineup for user club before simulation');
        const fixResult = autoFixSquadLineup(userClub);
        if (userClub.tactics) {
          userClub.tactics = {
            ...userClub.tactics,
            startingPlayerIds: fixResult.updatedStartingPlayerIds,
            benchPlayerIds: fixResult.updatedBenchPlayerIds,
          };
        }
      }
    }

    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);

    try {
      await new Promise<void>(resolve => setTimeout(resolve, 16));
      // 1. Determine whether today is a Continental/Cup matchday or a League round simulation
      const todayDateRaw = (calendarDate?.rawDateStr || '2026-08-15').trim();
      const todayUserMatches = fixtures.filter(f =>
        f && !f.isPlayed &&
        userClub && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id) &&
        ((f.date || '').trim() === todayDateRaw || (f.date || '').trim() <= todayDateRaw || (f.round && f.round <= currentRound))
      ).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));

      const primaryTodayMatch = todayUserMatches[0];

      // STRICT RULE: The user MUST play all of their matches and rounds across all competitions!
      // If the user is managing a club and has an unplayed match due today/this round, start the live match instead of silently simulating it!
      if (userClub && !manager.isUnemployed && primaryTodayMatch) {
        isSimulationRunningRef.current = false;
        setIsSimulationRunning(false);
        try {
          window.dispatchEvent(new CustomEvent('set-active-tab', { detail: { tab: 'matches' } }));
        } catch (_) {}
        startLiveMatch(primaryTodayMatch.id);
        return;
      }

      const allFixturesToSimulate: Fixture[] = fixtures.filter(
        f =>
          f &&
          !f.isPlayed &&
          !(userClub && !manager.isUnemployed && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)) &&
          normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' &&
          f.round === currentRound
      );

      let updatedFixtures = [...fixtures];
      let updatedStandings = [...standings];
      let updatedCupTournament = null as CupTournament | null;
      let updatedContinental = null as ContinentalTournament | null;
      const allRoundMatches: {
        homeTeamId: string;
        awayTeamId: string;
        homeScore: number;
        awayScore: number;
        events: MatchEvent[];
        isCup?: boolean;
        homePenalties?: number;
        awayPenalties?: number;
        winnerTeamId?: string;
      }[] = [];
      let userSimMatchRevenue: MatchRevenueBreakdown | undefined = undefined;

      for (let i = 0; i < allFixturesToSimulate.length; i++) {
        const fix = allFixturesToSimulate[i];
        try {
          const rawHomeTeam = (teams.find(t => t && t.id === fix.homeTeamId) || (fix.homeTeamId ? findClubInWorld(fix.homeTeamId) : undefined) || teams[0]) || ({ id: fix.homeTeamId || 'home_dummy', name: 'الفريق المضيف', shortName: 'مض', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
          const rawAwayTeam = (teams.find(t => t && t.id === fix.awayTeamId) || (fix.awayTeamId ? findClubInWorld(fix.awayTeamId) : undefined) || teams[1]) || ({ id: fix.awayTeamId || 'away_dummy', name: 'الفريق الضيف', shortName: 'ضف', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
          const baseHomeTeam = fix.homeTeamId && rawHomeTeam.id !== fix.homeTeamId ? { ...rawHomeTeam, id: fix.homeTeamId } : rawHomeTeam;
          const baseAwayTeam = fix.awayTeamId && rawAwayTeam.id !== fix.awayTeamId ? { ...rawAwayTeam, id: fix.awayTeamId } : rawAwayTeam;
          const homeTeam = (userClub && baseHomeTeam.id === userClub.id)
            ? { ...baseHomeTeam, isUserClub: true, manager: (manager as any) }
            : baseHomeTeam;
          const awayTeam = (userClub && baseAwayTeam.id === userClub.id)
            ? { ...baseAwayTeam, isUserClub: true, manager: (manager as any) }
            : baseAwayTeam;

          const matchResult = simulateMatch(homeTeam, awayTeam, homeTeam?.tactics, awayTeam?.tactics);

          const isUserMatch = !!userClub && (fix.homeTeamId === userClub.id || fix.awayTeamId === userClub.id);
          let fixtureUserRevenue: MatchRevenueBreakdown | undefined = undefined;

          if (isUserMatch && userClub) {
            const isUserHome = fix.homeTeamId === userClub.id;
            const oppTeam = isUserHome ? awayTeam : homeTeam;
            const userScore = isUserHome ? matchResult.homeScore : matchResult.awayScore;
            const oppScore = isUserHome ? matchResult.awayScore : matchResult.homeScore;

            fixtureUserRevenue = calculateMatchRevenue({
              userClub,
              opponentClub: oppTeam,
              isHome: isUserHome,
              userScore,
              opponentScore: oppScore,
              leagueTier: activeLeague?.tier || 1,
              isCupMatch: false,
              customTicketPrice: userClub.facilities?.ticketPrice,
              isSkipped: true,
            });
            fixtureUserRevenue.isClaimedToBudget = true;
            userSimMatchRevenue = fixtureUserRevenue;
          }

          const matchEvents = isUserMatch
            ? (matchResult.events || []).filter(
                e =>
                  e &&
                  (e.type === 'goal' ||
                    e.type === 'yellow_card' ||
                    e.type === 'red_card' ||
                    e.type === 'substitution' ||
                    e.type === 'injury' ||
                    e.type === 'save' ||
                    e.type === 'chance')
              )
            : pruneMatchEventsForStorage(matchResult.events || [], true);

          const finishedFix: Fixture = {
            ...fix,
            homeScore: matchResult.homeScore,
            awayScore: matchResult.awayScore,
            isPlayed: true,
            events: matchEvents,
            stats: isUserMatch ? matchResult.stats : undefined,
            matchRevenue: fixtureUserRevenue || fix.matchRevenue,
            revenueClaimed: isUserMatch ? true : fix.revenueClaimed,
          };

          if (isUserMatch) {
            (allRoundMatches as any).__userSimulatedFixture = finishedFix;
            (allRoundMatches as any).__userSimHomeName = homeTeam.name;
            (allRoundMatches as any).__userSimAwayName = awayTeam.name;
          }

          const simDispatch = await processMatchResult(finishedFix, {
            standings: updatedStandings,
            cupTournament: null,
            continentalTournament: null,
            fixtures: updatedFixtures,
            teams,
            userClub,
            currentRound,
          });
          updatedStandings = simDispatch.updatedStandings;
          updatedFixtures = simDispatch.updatedFixtures;

          allRoundMatches.push({
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: matchResult.homeScore,
            awayScore: matchResult.awayScore,
            events: matchEvents,
            isCup: false,
          });
        } catch (err) {
          console.warn('[MatchEndingFlow] Error during instant fixture simulation:', fix?.id, err);
        }
        if ((i + 1) % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

    let cupNewsMessage: string | undefined = undefined;
    let simCupBonusPrize = 0;
    let simCupBonusDevPoints = 0;
    const simCupRewardMessages: InboxMessage[] = [];

    // 3. Update Teams & Players Stats
    let updatedAllTeams = teams.map(t => {
      const matchAsHome = allRoundMatches.find(m => m.homeTeamId === t.id);
      const matchAsAway = allRoundMatches.find(m => m.awayTeamId === t.id);
      const matchPlayed = matchAsHome || matchAsAway;

      if (!matchPlayed) return t;

      const isHome = !!matchAsHome;
      const tScore = isHome ? matchPlayed.homeScore : matchPlayed.awayScore;
      const matchOppScore = isHome ? matchPlayed.awayScore : matchPlayed.homeScore;
      const isTeamWin = tScore > matchOppScore;
      const isTeamDraw = tScore === matchOppScore;

      const teamPlayers = Array.isArray(t?.players) ? t.players.filter(Boolean) : [];
      const startingIds = t?.tactics?.startingPlayerIds || teamPlayers.slice(0, 11).map(p => p?.id).filter(Boolean);

      const { updatedPlayers: fatigueUpdatedPlayers, transferMessages, departedPlayers } = processPostMatchPlayerUpdates(
        t,
        startingIds,
        matchPlayed,
        isTeamWin,
        isTeamDraw,
        t.isUserClub
      );

      if (transferMessages.length > 0) {
        setInbox(prev => [...transferMessages, ...prev]);
      }

      let extraTransferIncome = 0;
      if (departedPlayers.length > 0) {
        extraTransferIncome = departedPlayers.reduce((sum, dp) => sum + dp.fee, 0);
      }

      // Precompute player match events into an O(1) lookup map once per team
      const matchStatsMap = buildMatchStatsMap(matchPlayed.events);

      const updatedPlayers = (fatigueUpdatedPlayers || []).filter(Boolean).map(p => {
        if (!p || !p.id) return p;
        const isStarter = startingIds.includes(p.id);

        const pStats = matchStatsMap.getPlayerStats(p.id, p.name);
        const playerGoals = pStats.goals;
        const playerAssists = pStats.assists;
        const playerYellows = pStats.yellows;
        const playerReds = pStats.reds;

        let matchRating = isStarter ? (isTeamWin ? 7.2 : isTeamDraw ? 6.6 : 6.0) : 6.0;
        if (playerGoals > 0) matchRating += playerGoals * 0.9;
        if (playerAssists > 0) matchRating += playerAssists * 0.5;
        if (playerYellows > 0) matchRating -= 0.4;
        if (playerReds > 0) matchRating -= 2.0;
        if (p.positionCategory === 'GK' && matchOppScore === 0 && isStarter) matchRating += 0.8;
        matchRating = Math.min(10, Math.max(4, Number(matchRating.toFixed(1))));

        const currentApps = p.stats?.appearances || 0;
        const currentAvg = p.stats?.averageRating || 7.0;
        const newAvg = isStarter ? Number(((currentAvg * currentApps + matchRating) / (currentApps + 1)).toFixed(2)) : currentAvg;
        const totalYellows = (p.stats?.yellowCards || 0) + playerYellows;
        const totalReds = (p.stats?.redCards || 0) + playerReds;

        // Realistic Suspension Tracking:
        let newSuspensionMatches = p.suspensionMatches ? Math.max(0, p.suspensionMatches - 1) : 0;
        let newIsSuspended = newSuspensionMatches > 0;
        let newSuspensionReason = newIsSuspended ? p.suspensionReason : undefined;

        if (playerReds > 0) {
          newSuspensionMatches = 2;
          newIsSuspended = true;
          newSuspensionReason = 'طرد ببطاقة حمراء مباشرة';
        } else if (playerYellows > 0 && totalYellows > 0 && totalYellows % 3 === 0) {
          newSuspensionMatches = 1;
          newIsSuspended = true;
          newSuspensionReason = 'تراكم 3 بطاقات صفراء';
        }

        const simRoundWageEarned = Math.round((p.salary || 2000) / 4);
        const simPlayerSavings = (p.savings !== undefined ? p.savings : calculateInitialPlayerSavings(p)) + simRoundWageEarned;

        return {
          ...p,
          savings: simPlayerSavings,
          totalBonusesReceived: p.totalBonusesReceived ?? 0,
          isSuspended: newIsSuspended,
          suspensionMatches: newSuspensionMatches,
          suspensionReason: newSuspensionReason,
          stats: {
            ...p.stats,
            appearances: currentApps + (isStarter ? 1 : 0),
            goals: (p.stats?.goals || 0) + ((p.positionCategory === 'GK' || p.position === 'GK') ? 0 : playerGoals),
            assists: (p.stats?.assists || 0) + ((p.positionCategory === 'GK' || p.position === 'GK') ? 0 : playerAssists),
            yellowCards: totalYellows,
            redCards: totalReds,
            cleanSheets: (p.stats?.cleanSheets || 0) + (p.positionCategory === 'GK' && matchOppScore === 0 && isStarter ? 1 : 0),
            averageRating: newAvg,
          }
        };
      });

      const simMatchIncome = (t.isUserClub && userSimMatchRevenue) ? userSimMatchRevenue.totalRevenue : 0;

      let finalPlayers = updatedPlayers;
      let finalTactics = t.tactics;
      if (t.isUserClub) {
        const guestStars = updatedPlayers.filter(p => Boolean(p && p.isGuestStar));
        if (guestStars.length > 0) {
          finalPlayers = updatedPlayers.filter(p => !p || !p.isGuestStar);
          if (t.tactics) {
            const guestIds = guestStars.map(g => g.id);
            const remainingIds = finalPlayers.map(p => p.id);
            let sIds = (t.tactics.startingPlayerIds || []).filter(id => !guestIds.includes(id));
            let bIds = (t.tactics.benchPlayerIds || []).filter(id => !guestIds.includes(id));
            for (const pId of remainingIds) {
              if (sIds.length >= 11) break;
              if (!sIds.includes(pId) && !bIds.includes(pId)) {
                sIds.push(pId);
              }
            }
            finalTactics = {
              ...t.tactics,
              startingPlayerIds: sIds,
              benchPlayerIds: bIds,
            };
          }
        }
      }

      return {
        ...t,
        budget: t.isUserClub ? t.budget + simMatchIncome + simCupBonusPrize + extraTransferIncome : t.budget,
        developmentPoints: t.isUserClub ? (t.developmentPoints || 0) + simCupBonusDevPoints : t.developmentPoints,
        players: finalPlayers,
        tactics: finalTactics,
      };
    });

    // 4. Update Manager Profile if employed
    let updatedManager = { ...manager };
    const newInboxMsgs: InboxMessage[] = [];

    if (userClub) {
      const departedSimStars = (userClub.players || []).filter(p => Boolean(p && p.isGuestStar));
      departedSimStars.forEach(star => {
        newInboxMsgs.push({
          id: `msg_guest_depart_sim_${star.id}_${Date.now()}`,
          title: `✈️ انتهاء فترة إعارة النجم العالمي: ${star.name}`,
          sender: 'إدارة العلاقات العامة والتعاقدات',
          date: `الجولة ${currentRound}`,
          type: 'news',
          read: false,
          content: `انتهت رسمياً فترة إعارة النجم العالمي ${star.name} (${star.nickname}) بعد مشاركته مع الفريق في مباراة اليوم. غادر اللاعب النادي متمنياً للفريق دوام التوفيق والانتصارات.\n\n💡 تذكير للمدرب: يمكنك دائماً استدعاء نجم عالمي جديد لمباراتك القادمة عبر مشاهدة إعلاني رعاية!`,
        });
      });
    }
    let simUserGoals = 0;
    let simOppGoals = 0;
    let isSimUserWin = false;
    let isSimUserDraw = false;
    let isSimAway = false;
    let hasSimUserMatch = false;

    if (userClub) {
      const userMatch = allRoundMatches.find(m => m.homeTeamId === userClub.id || m.awayTeamId === userClub.id);
      if (userMatch) {
        const isUserHome = userMatch.homeTeamId === userClub.id;
        const userScore = isUserHome ? userMatch.homeScore : userMatch.awayScore;
        const oppScore = isUserHome ? userMatch.awayScore : userMatch.homeScore;
        const isCup = Boolean((userMatch as any).isCup);
        const userPenalties = isUserHome ? (userMatch as any).homePenalties : (userMatch as any).awayPenalties;
        const oppPenalties = isUserHome ? (userMatch as any).awayPenalties : (userMatch as any).homePenalties;
        const hasPenalties = isCup && userPenalties !== undefined && oppPenalties !== undefined;

        const isUserWin = isCup
          ? (hasPenalties ? userPenalties > oppPenalties : userScore > oppScore)
          : userScore > oppScore;
        const isUserDraw = isCup
          ? false
          : userScore === oppScore;

        simUserGoals = userScore;
        simOppGoals = oppScore;
        isSimUserWin = isUserWin;
        isSimUserDraw = isUserDraw;
        isSimAway = !isUserHome;
        hasSimUserMatch = true;
        const isUserLoss = isCup
          ? (hasPenalties ? userPenalties < oppPenalties : userScore < oppScore)
          : userScore < oppScore;

        const xpGained = isUserWin ? 60 : isUserDraw ? 25 : 10;
        const repGained = isUserWin ? 3 : isUserDraw ? 0 : -1;
        let newXp = manager.xp + xpGained;
        let newLevel = manager.level;
        let newXpToNext = manager.xpToNextLevel;
        let newLicense = manager.license;

        if (newXp >= newXpToNext) {
          newLevel += 1;
          newXp = newXp - newXpToNext;
          newXpToNext = Math.round(newXpToNext * 1.5);
          // Note: Licenses are never skipped automatically by level; they require rigorous exam & performance criteria
        }

        // Daily points calculation
        const todayStr = new Date().toISOString().split('T')[0];
        const isSameDailyDate = manager.lastDailyResetDate === todayStr;
        const ptsGainedToday = isUserWin ? 3 : isUserDraw ? 1 : 0;
        const currentDayPts = isSameDailyDate ? (manager.dailyPoints || 0) : 0;
        const currentDayMatches = isSameDailyDate ? (manager.dailyMatchesPlayed || 0) : 0;
        const currentDayWins = isSameDailyDate ? (manager.dailyWins || 0) : 0;
        const currentDayDraws = isSameDailyDate ? (manager.dailyDraws || 0) : 0;
        const currentDayLosses = isSameDailyDate ? (manager.dailyLosses || 0) : 0;

        const updatedDailyPoints = currentDayPts + ptsGainedToday;
        const updatedDailyMatches = currentDayMatches + 1;
        const updatedDailyWins = currentDayWins + (isUserWin ? 1 : 0);
        const updatedDailyDraws = currentDayDraws + (isUserDraw ? 1 : 0);
        const updatedDailyLosses = currentDayLosses + (!isUserWin && !isUserDraw ? 1 : 0);

        const oppTier = activeLeague.tier || 1;
        const oppRep = activeLeague.reputation || 50;
        const userMatchOppClub = teams.find(t => t.id === (isUserHome ? userMatch.awayTeamId : userMatch.homeTeamId));
        const oppClubRating = userMatchOppClub?.rating || 65;
        const { managerPointsDelta } = calculateMatchRankingPoints(isUserWin ? 'W' : isUserDraw ? 'D' : 'L', oppTier, oppRep, 'league', oppClubRating);
        const updatedRankingPoints = Math.max(100, (manager.rankingPoints || 1200) + managerPointsDelta);

        const simManagerSalary = Math.round((manager.monthlySalary || 25000) / 4);
        // Win bonus: paid on top of the weekly salary
        const simMatchBonus = isUserWin ? calculateWinBonus(manager.monthlySalary, activeLeague.tier || 1) : 0;
        const simCupBonusCut = simCupBonusPrize > 0 ? Math.round(simCupBonusPrize * 0.15) : 0;
        const simTotalEarned = simManagerSalary + simMatchBonus + simCupBonusCut;

        const simSalTx: ManagerTransaction = {
          id: `tx_sal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          date: `الجولة ${currentRound}`,
          amount: simManagerSalary,
          type: 'salary',
          description: `الراتب الأسبوعي للجولة ${currentRound}`,
        };
        const simFinancialTxs: ManagerTransaction[] = [simSalTx];
        if (simMatchBonus > 0) {
          simFinancialTxs.push({
            id: `tx_win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date: `الجولة ${currentRound}`,
            amount: simMatchBonus,
            type: 'match_bonus',
            description: `مكافأة الفوز في مباراة الجولة ${currentRound}`,
          });
        }
        if (simCupBonusCut > 0) {
          simFinancialTxs.push({
            id: `tx_cup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            date: `الجولة ${currentRound}`,
            amount: simCupBonusCut,
            type: 'trophy_bonus',
            description: `مكافأة التأهل في بطولة الكأس (${simCupBonusCut.toLocaleString()} ج.م)`,
          });
        }

        lastUserInteractionRef.current = Date.now();

        const initialUpdatedManager: ManagerProfile = {
          ...manager,
          level: newLevel,
          xp: newXp,
          xpToNextLevel: newXpToNext,
          reputation: Math.max(1, Math.min(100, manager.reputation + repGained)),
          license: newLicense,
          matchesManaged: manager.matchesManaged + 1,
          wins: manager.wins + (isUserWin ? 1 : 0),
          draws: manager.draws + (isUserDraw ? 1 : 0),
          losses: manager.losses + (!isUserWin && !isUserDraw ? 1 : 0),
          totalPlayTimeMinutes: (manager.totalPlayTimeMinutes || 0) + 2,
          totalPlayersDeveloped: manager.totalPlayersDeveloped || 0,
          goalsScored: manager.goalsScored + userScore,
          goalsConceded: manager.goalsConceded + oppScore,
          careerEarnings: manager.careerEarnings + simCupBonusPrize,
          developmentPoints: (manager.developmentPoints || 0) + simCupBonusDevPoints,
          dailyPoints: updatedDailyPoints,
          dailyMatchesPlayed: updatedDailyMatches,
          dailyWins: updatedDailyWins,
          dailyDraws: updatedDailyDraws,
          dailyLosses: updatedDailyLosses,
          lastDailyResetDate: todayStr,
          rankingPoints: updatedRankingPoints,
          personalWallet: (manager.personalWallet || 0) + simTotalEarned,
          monthlySalary: manager.monthlySalary || 25000,
          totalBonusesEarned: (manager.totalBonusesEarned || 0) + simMatchBonus + simCupBonusCut,
          financialTransactions: [...simFinancialTxs, ...(manager.financialTransactions || [])].slice(0, 30),
        };

        const dynamicRating = calculateDynamicManagerRating(initialUpdatedManager);
        updatedManager = {
          ...initialUpdatedManager,
          managerRating: dynamicRating,
        };

        const oppClub = teams.find(t => t.id === (isUserHome ? userMatch.awayTeamId : userMatch.homeTeamId));
        
        let simEval: ReturnType<typeof evaluateMatchImpactOnConfidence> | null = null;
        if (boardSystem && userClub && oppClub) {
          simEval = evaluateMatchImpactOnConfidence(
            boardSystem,
            userClub,
            updatedStandings,
            {
              isUserHome,
              userScore,
              oppScore,
              oppClub,
              round: currentRound,
              totalRounds,
              isCupMatch: isCup,
              userWonOnPenalties: hasPenalties && isUserWin,
              userLostOnPenalties: hasPenalties && isUserLoss,
              homePenalties: (userMatch as any).homePenalties,
              awayPenalties: (userMatch as any).awayPenalties,
            }
          );
          setBoardSystem(simEval.updatedBoardSystem);
        }

        let roundInboxTitle = '';
        let roundInboxContent = '';
        if (isCup) {
          if (hasPenalties) {
            roundInboxTitle = isUserWin
              ? `تأهل ملحمي بركلات الترجيح: ${userClub.shortName} (${userScore}-${oppScore}) [${userPenalties}-${oppPenalties} ركلات] ${oppClub?.shortName || ''} 🏆`
              : `وداع مؤلم للكأس بركلات الترجيح: ${userClub.shortName} (${userScore}-${oppScore}) [${userPenalties}-${oppPenalties} ركلات] ${oppClub?.shortName || ''} 😔`;
            roundInboxContent = isUserWin
              ? `ملحمة كروية قوية في مسابقة الكأس! انتهت بالتعادل (${userScore}-${oppScore}) وحسمها فريقك بركلات الترجيح الأعصاب (${userPenalties}-${oppPenalties}) ليتأهل للدور القادم بنجاح.`
              : `وداع غير موفق لبطولة الكأس بركلات الترجيح (${userPenalties}-${oppPenalties}) بعد التعادل في الوقت الأصلي (${userScore}-${oppScore}). التركيز الآن بالكامل على بطولة الدوري.`;
          } else {
            roundInboxTitle = isUserWin
              ? `فوز وتأهل في مسابقة الكأس: ${userClub.shortName} (${userScore}-${oppScore}) ${oppClub?.shortName || ''} 🏆`
              : `خسارة ووداع مسابقة الكأس: ${userClub.shortName} (${userScore}-${oppScore}) ${oppClub?.shortName || ''} 😔`;
            roundInboxContent = isUserWin
              ? `فوز مستحق وتأهل للدور القادم في مسابقة الكأس بنتيجة (${userScore}-${oppScore})!`
              : `خسارة أدت لتوديع مسابقة الكأس بنتيجة (${userScore}-${oppScore}). حان وقت التركيز على بطولة الدوري.`;
          }
        } else {
          roundInboxTitle = `نتيجة الجولة ${currentRound}: ${userClub.shortName} (${userScore}-${oppScore}) ${oppClub?.shortName || ''}`;
          roundInboxContent = simEval 
            ? `أحداث الجولة ${currentRound}:\n\n👔 ${simEval.boardFeedback}\n\n📣 ${simEval.fanFeedback}\n\nالهدف المطلوب: ${simEval.updatedBoardSystem.targetLeaguePositionText} | المركز الحالي: ${simEval.updatedBoardSystem.currentStandingPosition || 1} | نسبة ثقة الإدارة: ${simEval.updatedBoardSystem.confidence}% | نسبة رضا الجمهور: ${simEval.updatedBoardSystem.fanConfidence || 80}%`
            : isUserWin 
            ? `فوز مستحق لفريقنا بنتيجة (${userScore}-${oppScore})! واصلوا الأداء القوي في المباريات المقبلة.`
            : isUserDraw 
            ? `انتهت المباراة بالتعادل (${userScore}-${oppScore}). حصدنا نقطة واحدة ونستعد للجولة القادمة.`
            : `هزيمة مؤسفة بنتيجة (${userScore}-${oppScore}). الإدارة تأمل في تعديل المسار والتعويض سريعاً.`;
        }

        newInboxMsgs.push({
          id: `msg_round_sim_${currentRound}_${Date.now()}`,
          title: roundInboxTitle,
          sender: 'سكرتارية النادي ومجلس الإدارة',
          date: `الجولة ${currentRound}`,
          type: isUserWin ? 'fan' : 'board',
          read: false,
          content: roundInboxContent,
        });

        if (userSimMatchRevenue) {
          const simRoundWages = Math.round((userClub.players || []).reduce((sum, p) => sum + (p.salary || 1000), 0) / 4);
          
          // Club economy tracking
          if (DIAGNOSTIC_CONFIG.ENABLE_BOARD_AND_ECONOMY) {
            setClubEconomy(prev => ({
              ...prev,
              matchIncomeTotal: prev.matchIncomeTotal + userSimMatchRevenue!.totalRevenue,
              salaryExpensesTotal: prev.salaryExpensesTotal + simRoundWages,
              currentSeasonNetProfit: prev.currentSeasonNetProfit + userSimMatchRevenue!.totalRevenue - simRoundWages,
            }));
          }

          // Official financial report message
          newInboxMsgs.push({
            id: `msg_match_rev_sim_${currentRound}_${Date.now()}`,
            title: `💰 تقرير إيراد مباراة الجولة ${currentRound} (محاكاة سريعة 50%): +${userSimMatchRevenue.totalRevenue.toLocaleString()} ج.م`,
            sender: 'الإدارة المالية للنادي',
            date: `الجولة ${currentRound}`,
            type: 'board',
            read: false,
            content: `كشف الإيرادات المالية الرسمية لمباراة الجولة ${currentRound} (تمت محاكاتها سريعاً):\n\n` +
              `🏟️ الحضور الجماهيري: ${userSimMatchRevenue.attendance.toLocaleString()} مشجع (${userSimMatchRevenue.attendancePercentage}%)\n` +
              `🎟️ سعر التذكرة: ${userSimMatchRevenue.ticketPrice} ج.م • دخل التذاكر الأساسي: ${userSimMatchRevenue.ticketRevenue.toLocaleString()} ج.م\n` +
              `📢 رعاة النادي والإعلانات: ${userSimMatchRevenue.sponsorsRevenue.toLocaleString()} ج.م\n` +
              `🏆 مكافأة النتيجة الرسمية (${userSimMatchRevenue.resultType === 'win' ? 'فوز 🏆' : userSimMatchRevenue.resultType === 'draw' ? 'تعادل 🤝' : 'هزيمة (0 ج.م)'}): ${userSimMatchRevenue.resultBonus > 0 ? `+${userSimMatchRevenue.resultBonus.toLocaleString()} ج.م` : '0 ج.م (لا يوجد مكافأة عند الهزيمة)'}\n` +
              `💵 إجمالي الإيراد الأساسي: ${userSimMatchRevenue.baseTotalRevenue.toLocaleString()} ج.م\n\n` +
              `⚠️ خصم تخطي المباراة (50%): -${userSimMatchRevenue.skipPenaltyAmount?.toLocaleString()} ج.م\n` +
              `💡 تم إيداع نصف الإيرادات فقط كخصم لتخطي/محاكاة المباراة، لتشجيع خوض المباريات كاملة.\n\n` +
              `✅ الصافي المودع في خزينة النادي: +${userSimMatchRevenue.totalRevenue.toLocaleString()} جنيه مصري.`,
          });
        }
      }
    } else {
      // Unemployed manager digest & job offers refresh
      newInboxMsgs.push({
        id: `msg_unemployed_round_${currentRound}_${Date.now()}`,
        title: `ملخص الجولة ${currentRound} في دوريات العالم 📰`,
        sender: 'الصحيفة الرياضية',
        date: `الجولة ${currentRound}`,
        type: 'news',
        read: false,
        content: `تم استكمال منافسات الجولة ${currentRound} بنجاح. أندية عديدة تبحث عن مدربين أكفاء؛ تفقد عروض التدريب المتاحة في تبويب المسيرة لاقتناص فرصة جديدة!`,
      });

      // Refresh available vacancies
      const freshOffers = generateSeasonJobOffers(updatedManager, teams[0], activeLeague, 5);
      setJobOffers(freshOffers);
    }

    if (cupNewsMessage) {
      newInboxMsgs.push({
        id: `msg_cup_sim_${currentRound}_${Date.now()}`,
        title: 'نتائج الكأس الوطنية 🏆',
        sender: 'اتحاد كرة القدم',
        date: `الجولة ${currentRound}`,
        type: 'news',
        read: false,
        content: cupNewsMessage,
      });
    }

    if (simCupRewardMessages.length > 0) {
      newInboxMsgs.unshift(...simCupRewardMessages);
    }

    // 5. Generate Incoming AI Bids & Check Expiring Contracts if user is managing a club
    const latestUserClubSim = updatedAllTeams.find(t => t.isUserClub || (userClub && t.id === userClub.id)) || userClub;
    if (latestUserClubSim) {
      const aiBidsResult = generateIncomingAiBids(updatedAllTeams, latestUserClubSim, currentRound, season.seasonNumber);
      if (aiBidsResult.bids.length > 0) {
        setIncomingBids(prev => [...aiBidsResult.bids, ...prev].slice(0, 40));
        newInboxMsgs.unshift(...aiBidsResult.inboxMessages);
      }

      // Check expiring contracts
      const contractAlerts = checkExpiringContracts(latestUserClubSim, `الجولة ${currentRound}`, inbox);
      if (contractAlerts.length > 0) {
        newInboxMsgs.unshift(...contractAlerts);
      }
    }

    // Rival AI clubs actively buy players, strengthen weakest positions, and train squads for multi-team competition
    try {
      const aiCompRes = executeCompetitiveAiTransfersAndGrowth({
        teams: updatedAllTeams,
        transferMarket: transferMarket || [],
        seasonNumber: season?.seasonNumber || 1,
        currentRound: currentRound || 1,
        activeLeagueTier: activeLeague?.tier || 1,
      });
      updatedAllTeams = aiCompRes.updatedTeams;
      if (aiCompRes.updatedMarket) {
        setTransferMarket(aiCompRes.updatedMarket);
      }
      if (aiCompRes.newTransfers && aiCompRes.newTransfers.length > 0) {
        setTransferHistory(prev => [...aiCompRes.newTransfers, ...(prev || [])].slice(0, 120));
      }
      if (aiCompRes.inboxNotifications && aiCompRes.inboxNotifications.length > 0) {
        newInboxMsgs.unshift(...aiCompRes.inboxNotifications);
      }
    } catch (aiCompErr) {
      console.warn('[instantSimulateCurrentRound] Non-fatal AI competitive transfer notice:', aiCompErr);
    }

    const unplayedLeagueInRound = updatedFixtures.some(
      f => f && normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && f.round === currentRound && !f.isPlayed
    );
    const nextRoundNumber = !unplayedLeagueInRound ? currentRound + 1 : currentRound;
    const remainingLeagueFixtures = updatedFixtures.filter(f => normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && !f.isPlayed);
    const hasRemainingRounds = nextRoundNumber <= totalRounds && updatedFixtures.some(f => normalizeCompetitionType(f.competitionType || f.tournamentId) === 'LEAGUE' && f.round >= nextRoundNumber);
    const isNowFinished = !hasRemainingRounds && remainingLeagueFixtures.length === 0;

    // 6. Check if Season Concluded
    if (isNowFinished) {
      const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
      const summary = calculateSeasonEndSummary(
        { ...season, status: 'completed', totalRounds },
        updatedStandings,
        summaryClub,
        activeLeague,
        updatedCupTournament,
        updatedManager,
        africanChampionsLeague
      );

      if ((updatedManager as any).lastTrophyAwardedSeasonNumber !== season.seasonNumber) {
        const newTrophiesList = [...(updatedManager.trophies || [])];
        if (summary.leagueTrophyAwarded && !newTrophiesList.includes(summary.leagueTrophyAwarded)) {
          newTrophiesList.push(summary.leagueTrophyAwarded);
        }
        updatedManager = {
          ...updatedManager,
          trophies: newTrophiesList,
          leagueTitles: (updatedManager.leagueTitles || 0) + (summary.resultStatus === 'champion' ? 1 : 0),
          promotions: (updatedManager.promotions || 0) + (summary.resultStatus === 'promoted' || (summary.resultStatus === 'champion' && summary.divisionTier > 1) ? 1 : 0),
          relegations: (updatedManager.relegations || 0) + (summary.resultStatus === 'relegated' ? 1 : 0),
          careerEarnings: (updatedManager.careerEarnings || 0) + (summary.prizeMoney || 0),
          lastTrophyAwardedSeasonNumber: season.seasonNumber,
        } as any;
      }

      if (updatedManager.lastSettledSeasonNumber !== season.seasonNumber) {
        const endOfSeasonManagerBonus = calculateManagerSeasonBonus(summary, updatedManager);
        const settlementRes = settleEndOfSeasonLicenseAndBonus(updatedManager, endOfSeasonManagerBonus, season.seasonNumber);
        updatedManager = settlementRes.updatedManager;
        summary.licenseSettlement = settlementRes.settlement;

        if (settlementRes.settlement.wasDowngraded && settlementRes.settlement.warningMessage) {
          newInboxMsgs.unshift({
            id: `msg_license_downgrade_${season.seasonNumber}_${Date.now()}`,
            title: `⚠️ إشعار خفض الرخصة التدريبية لعدم كفاية الرصيد الشخصي`,
            sender: 'لجنة الرخص والاعتماد التدريبي الدولي',
            date: 'ختام الموسم',
            type: 'board',
            read: false,
            content: settlementRes.settlement.warningMessage,
          });
        }
      }

      const offersManager = updatedManager;
      setSeasonEndSummary(summary);
      scheduleSeasonEndOffersAndModal(() =>
        generateSeasonJobOffers(offersManager, summaryClub, activeLeague, summary.finalPosition)
      );

      newInboxMsgs.unshift({
        id: `msg_season_end_${season.seasonNumber}_${Date.now()}`,
        title: `🏁 ختام الموسم ${season.seasonNumber} - ${summary.resultTitle}`,
        sender: 'الاتحاد ورابطة الأندية',
        date: `ختام الموسم`,
        type: 'board',
        read: false,
        content: `انتهت منافسات الموسم رسمياً. ${summary.resultDescription} اضغط على زر مراجعة الموسم للاطلاع على الحصيلة الشاملة وعروض التدريب المقدمة إليك.`,
      });
    }

    const updatedSeason: SeasonInfo = {
      ...season,
      currentRound: nextRoundNumber,
      status: isNowFinished ? 'completed' : season.status,
    };

    // Advance calendar by 1 day ONLY if options?.advanceDate === true
    const shouldAdvanceDate = options?.advanceDate === true;
    const currentRaw = calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr;
    const safeDayIdx = (calendarDate?.dayIndexInSeason || 1) + (shouldAdvanceDate ? 1 : 0);
    const updatedCalendarDate = shouldAdvanceDate
      ? addDaysToDate(currentRaw, 1, safeDayIdx)
      : (calendarDate || getInitialSeasonDate(season?.seasonNumber || 1));

    // Robust Single Source of Truth: Reconstruct exact league standings from all played fixtures
    try {
      updatedStandings = recalculateStandingsFromFixtures(updatedStandings, updatedAllTeams, updatedFixtures);
    } catch (stErr) {
      console.warn('[instantSimulateCurrentRound] Standings recalculate error:', stErr);
    }

    // Commit changes immediately to React state
    setFixtures(updatedFixtures);
    setStandings(updatedStandings);
    setManager(updatedManager);
    setCupTournament(updatedCupTournament);
    if (updatedContinental) {
      setAfricanChampionsLeague(updatedContinental);
      try {
        localStorage.setItem(`${STORAGE_KEY}_africanChampionsLeague`, JSON.stringify(updatedContinental));
      } catch (_) {}
    }
    setInbox(prev => [...newInboxMsgs, ...prev]);
    setTeams(updatedAllTeams);
    setSeason(updatedSeason);
    setCurrentRound(nextRoundNumber);
    setCalendarDate(updatedCalendarDate);
    setLiveMatch(null);
    setMatchBlocker(null);

    // Generate fresh matchday headlines for the football world
    let matchdayNews: any[] = [];
    try {
      matchdayNews = generateImmersiveNewsBatch({
        calendarDate: updatedCalendarDate,
        userClub,
        manager: updatedManager,
        teams: updatedAllTeams,
        standings: updatedStandings,
        currentRound,
      }, 3);
      setDailyNews(prev => [...matchdayNews, ...prev].slice(0, 40));
    } catch (e) {
      console.warn('Matchday news simulation notice:', e);
    }

    // Boost Consumption
    AdManager.consumeTrainingBoost();
    // Track match in challengesManager & show Post-Match Summary modal with goal scorers and minutes
    if (hasSimUserMatch) {
      try {
        challengesManager.recordMatchPlayed({
          isWin: isSimUserWin,
          isDraw: isSimUserDraw,
          userGoals: simUserGoals,
          oppGoals: simOppGoals,
          isAway: isSimAway,
        });
      } catch (_) {}

      try {
        const simFix: Fixture | undefined = (allRoundMatches as any).__userSimulatedFixture;
        if (simFix) {
          const homeName = (allRoundMatches as any).__userSimHomeName || getClubDisplayName(simFix.homeTeamId, updatedAllTeams);
          const awayName = (allRoundMatches as any).__userSimAwayName || getClubDisplayName(simFix.awayTeamId, updatedAllTeams);
          const branding = getCompetitionBranding(simFix, activeLeague?.name || 'الدوري الممتاز');
          const cleanCompName = (branding.name || activeLeague?.name || 'الدوري الممتاز')
            .replace(/^[-–—\s]+/, '')
            .trim();
          let cleanRoundLabel = (simFix.stageName || `الجولة ${simFix.round || currentRound}`)
            .replace(/^[-–—\s]+/, '')
            .trim();
          if (cleanRoundLabel.includes(' - ')) {
            const parts = cleanRoundLabel.split(' - ').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
              cleanRoundLabel = parts[parts.length - 1];
            }
          }

          const hScore = simFix.homeScore ?? 0;
          const aScore = simFix.awayScore ?? 0;

          // Filter regular-time/extra-time goals (excluding penalty shootout kicks at min 120)
          const goalEvents = (simFix.events || []).filter(
            ev =>
              ev &&
              ev.type === 'goal' &&
              !ev.description?.includes('ركلة ترجيح') &&
              !ev.description?.includes('ركلة إضافية')
          );

          const homeGoalScorers = goalEvents
            .filter(ev => ev.teamId === simFix.homeTeamId)
            .map(ev => `⚽ ${ev.playerName || 'لاعب'} (${ev.minute}')`);
          const awayGoalScorers = goalEvents
            .filter(ev => ev.teamId === simFix.awayTeamId)
            .map(ev => `⚽ ${ev.playerName || 'لاعب'} (${ev.minute}')`);

          // Guarantee goal scorer entries match homeScore and awayScore 100%
          const hTeamObj =
            updatedAllTeams.find(t => t && t.id === simFix.homeTeamId) ||
            (simFix.homeTeamId ? findClubInWorld(simFix.homeTeamId) : undefined);
          const aTeamObj =
            updatedAllTeams.find(t => t && t.id === simFix.awayTeamId) ||
            (simFix.awayTeamId ? findClubInWorld(simFix.awayTeamId) : undefined);

          while (homeGoalScorers.length < hScore) {
            const scorer = pickGoalScorer(hTeamObj?.players || []);
            const min = Math.min(90, Math.max(5, Math.floor(Math.random() * 84) + 5));
            homeGoalScorers.push(`⚽ ${scorer.name} (${min}')`);
          }
          while (awayGoalScorers.length < aScore) {
            const scorer = pickGoalScorer(aTeamObj?.players || []);
            const min = Math.min(90, Math.max(5, Math.floor(Math.random() * 84) + 5));
            awayGoalScorers.push(`⚽ ${scorer.name} (${min}')`);
          }

          const homeScorersText = homeGoalScorers.slice(0, hScore).join(' ، ');
          const awayScorersText = awayGoalScorers.slice(0, aScore).join(' ، ');
          const allScorersText = [...homeGoalScorers.slice(0, hScore), ...awayGoalScorers.slice(0, aScore)].join(' ، ');

          setDayAdvanceSummary({
            currentDateStr: updatedCalendarDate.rawDateStr,
            formattedArabicDate: updatedCalendarDate.formattedArabic,
            daysAdvanced: shouldAdvanceDate ? 1 : 0,
            matchPlayed: true,
            matchFixtureId: simFix.id,
            matchSummaryText: `انتهت مباراة ${homeName} (${hScore} - ${aScore}) ${awayName}`,
            trainingReports: [],
            injuryUpdates: [],
            negotiationUpdates: [],
            newsItems: matchdayNews.slice(0, 3),
            boardFeedback: undefined,
            postMatchSummary: {
              competitionName: cleanCompName,
              roundLabel: cleanRoundLabel,
              homeTeamName: homeName,
              awayTeamName: awayName,
              homeScore: hScore,
              awayScore: aScore,
              homePenalties: simFix.homePenalties,
              awayPenalties: simFix.awayPenalties,
              homeScorersText,
              awayScorersText,
              allScorersText,
              homeGoalScorers: homeGoalScorers.slice(0, hScore),
              awayGoalScorers: awayGoalScorers.slice(0, aScore),
              isUserWin: isSimUserWin,
              isUserDraw: isSimUserDraw,
            },
          });
          setShowDaySummaryModal(true);
        }
      } catch (summaryErr) {
        console.warn('[MatchEndingFlow] Post-match summary modal notice:', summaryErr);
      }
    }
    console.log('[MatchEndingFlow] Instant simulate round completed successfully');

    // Store only lightweight scalar header fields in localStorage; full state is persisted asynchronously to IndexedDB
    try {
      const prunedFinalFixtures = pruneFixturesForStorage(updatedFixtures, userClub?.id);
      updatedFixtures = prunedFinalFixtures;
      safeLocalStorageSet(`${STORAGE_KEY}_currentRound`, JSON.stringify(nextRoundNumber));
      safeLocalStorageSet(`${STORAGE_KEY}_calendarDate`, JSON.stringify(updatedCalendarDate));
      safeLocalStorageSet(`${STORAGE_KEY}_season`, JSON.stringify(updatedSeason));
      safeLocalStorageSet(`${STORAGE_KEY}_standings`, JSON.stringify(updatedStandings));
      safeLocalStorageSet(`${STORAGE_KEY}_manager`, JSON.stringify(updatedManager));
      if (updatedContinental) {
        const sNum = updatedContinental.seasonNumber || updatedSeason.seasonNumber || 1;
        const cCode = updatedContinental.competitionId || 'ccl';
        saveContinentalCacheToDb(sNum, cCode, updatedContinental);
      }
      safeLocalStorageRemove(`${STORAGE_KEY}_active_live_match`);
    } catch (lsErr) {
      console.warn('[MatchEndingFlow] Sync storage error:', lsErr);
    }

    // Immediately persist to local disk repository
    try {
      await gameStateRepository.saveLocalGameState({
        schemaVersion: 2,
        saveVersion: 1,
        lastLocalSaveAt: Date.now(),
        season: updatedSeason,
        activeLeague,
        teams: updatedAllTeams,
        standings: updatedStandings,
        fixtures: updatedFixtures,
        currentRound: nextRoundNumber,
        manager: updatedManager,
        transferMarket,
        incomingBids,
        inbox: capInbox([...newInboxMsgs, ...inbox]),
        cupTournament: updatedCupTournament,
        africanChampionsLeague: updatedContinental,
        jobOffers,
        seasonEndSummary,
        transferHistory,
        clubEconomy,
        calendarDate: updatedCalendarDate,
        activeNegotiations,
        boardSystem,
        dailyNews: matchdayNews ? [...matchdayNews, ...(dailyNews || [])].slice(0, 40) : dailyNews,
        retiredPlayers,
        worldRankings,
        scoutedOpponents,
        deletedMessageIds,
      });
    } catch (saveErr) {
      console.warn('[MatchEndingFlow] Instant simulate save error:', saveErr);
    }
    } catch (error) {
      console.error('[MatchEndingFlow] CRITICAL UNCAUGHT EXCEPTION in instantSimulateCurrentRound, running emergency progression:', error);
      try {
        const shouldAdvanceDate = options?.advanceDate === true;
        const fallbackNextRound = currentRound + 1;
        const currentRaw = calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr;
        const safeDayIdx = (calendarDate?.dayIndexInSeason || 1) + (shouldAdvanceDate ? 1 : 0);
        const fallbackCalendar = shouldAdvanceDate ? addDaysToDate(currentRaw, 1, safeDayIdx) : (calendarDate || getInitialSeasonDate(season?.seasonNumber || 1));
        const fallbackSeason = { ...season, currentRound: fallbackNextRound, status: fallbackNextRound > totalRounds ? ('completed' as const) : season.status };

        // Guarantee this round's fixtures are marked as played so league doesn't freeze
        let fallbackFixtures = (fixtures || []).map(f => {
          if (f && f.round === currentRound && !f.isPlayed) {
            const hTeam = teams.find(t => t.id === f.homeTeamId) || teams[0];
            const aTeam = teams.find(t => t.id === f.awayTeamId) || teams[1];
            const res = simulateMatch(hTeam, aTeam);
            return {
              ...f,
              homeScore: res.homeScore,
              awayScore: res.awayScore,
              isPlayed: true,
              stats: res.stats,
              events: (res.events || []).filter(e => e && e.type !== 'commentary').slice(0, 5),
            };
          }
          return f;
        });

        const fallbackStandings = recalculateStandingsFromFixtures(standings, teams, fallbackFixtures);

        setCurrentRound(fallbackNextRound);
        setCalendarDate(fallbackCalendar);
        setSeason(fallbackSeason);
        setFixtures(fallbackFixtures);
        setStandings(fallbackStandings);
        setLiveMatch(null);
        setMatchBlocker(null);

        localStorage.setItem(`${STORAGE_KEY}_currentRound`, JSON.stringify(fallbackNextRound));
        localStorage.setItem(`${STORAGE_KEY}_calendarDate`, JSON.stringify(fallbackCalendar));
        localStorage.setItem(`${STORAGE_KEY}_season`, JSON.stringify(fallbackSeason));
        localStorage.setItem(`${STORAGE_KEY}_fixtures`, JSON.stringify(fallbackFixtures));
        localStorage.setItem(`${STORAGE_KEY}_standings`, JSON.stringify(fallbackStandings));
        localStorage.removeItem(`${STORAGE_KEY}_active_live_match`);
      } catch (recoveryErr) {
        console.error('[MatchEndingFlow] Emergency recovery notice:', recoveryErr);
      }
    } finally {
      isSimulationRunningRef.current = false;
      setIsSimulationRunning(false);
      setMatchBlocker(null);
    }
  };

  /**
   * One-touch Match Simulation & Next Day Advancement:
   * Fixes starting lineup automatically if needed, simulates this round's matches,
   * advances calendar by 1 day, and persists everything to disk.
   */
  const simulateMatchAndAdvanceToNextDay = async () => {
    if (isSimulationRunningRef.current || seasonFinished) return;
    setMatchBlocker(null);

    // 1. Auto fix user starting lineup if needed so match is simulated cleanly
    if (userClub) {
      const val = validateSquadLineup(userClub);
      if (!val.isValid) {
        autoFixUserStartingLineup(false);
      }
    }

    // 2. Instant simulate round and advance calendar date atomically
    await instantSimulateCurrentRound({ advanceDate: true, forcePlayUserMatch: true });
    setMatchBlocker(null);
  };

  const instantSimulateAndAdvance = async (_matchId?: string): Promise<void> => {
    await simulateMatchAndAdvanceToNextDay();
  };

  const simulateRoundOnly = async (_matchId?: string): Promise<void> => {
    await instantSimulateCurrentRound({ advanceDate: false, forcePlayUserMatch: true });
  };

  const simulateMultipleRounds = (roundsCount: number = 10): { success: boolean; simulatedCount: number; message: string } => {
    if (isSimulationRunningRef.current) {
      return { success: false, simulatedCount: 0, message: 'المحاكاة جارية حالياً' };
    }
    if (seasonFinished) {
      return { success: false, simulatedCount: 0, message: 'الموسم منتهٍ بالفعل!' };
    }

    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);

    try {
      const res = simulateMultipleLeagueRounds(
        roundsCount,
        currentRound,
        totalRounds,
        teams,
        standings,
        fixtures,
        activeLeague,
        userClub?.id
      );

      if (res.simulatedRoundsCount === 0) {
        return { success: false, simulatedCount: 0, message: 'لم يتم العثور على جولات متبقية للمحاكاة.' };
      }

      if (africanChampionsLeague) {
        const allTeamsMap = new Map<string, Club>();
        Object.values(GLOBAL_LEAGUES).forEach(lg => {
          lg.teams.forEach(c => allTeamsMap.set(c.id, c));
        });
        res.nextTeams.forEach(c => allTeamsMap.set(c.id, c));
        const contAdv = advanceContinentalTournament(
          africanChampionsLeague,
          Math.max(1, res.nextRound - 1),
          allTeamsMap,
          userClub,
          { simulateUserMatches: true, externalFixtures: res.nextFixtures }
        );
        setAfricanChampionsLeague(
          recalculateContinentalGroupStandings(contAdv.updatedTournament, res.nextFixtures)
        );
      }

      setFixtures(res.nextFixtures);
      setStandings(res.nextStandings);
      setTeams(res.nextTeams);
      setCurrentRound(res.nextRound);

      if (res.seasonFinished) {
        const summaryClub = userClub || res.nextTeams.find(t => t.isUserClub) || res.nextTeams[0];
        let activeMgr = manager;
        const summary = calculateSeasonEndSummary(
          { ...season, status: 'completed', totalRounds },
          res.nextStandings,
          summaryClub,
          activeLeague,
          cupTournament,
          activeMgr,
          africanChampionsLeague
        );
        if (activeMgr.lastSettledSeasonNumber !== season.seasonNumber) {
          const endOfSeasonManagerBonus = calculateManagerSeasonBonus(summary, activeMgr);
          const settlementRes = settleEndOfSeasonLicenseAndBonus(activeMgr, endOfSeasonManagerBonus, season.seasonNumber);
          activeMgr = settlementRes.updatedManager;
          summary.licenseSettlement = settlementRes.settlement;
          setManager(activeMgr);
        }
        const offersMgrC = activeMgr;
        setSeasonEndSummary(summary);
        scheduleSeasonEndOffersAndModal(() =>
          generateSeasonJobOffers(offersMgrC, summaryClub, activeLeague, summary.finalPosition)
        );
        setSeason(prev => ({ ...prev, status: 'completed' }));
      }

      const batchMsg: InboxMessage = {
        id: `msg_batch_sim_${Date.now()}`,
        title: `⚡ تقرير المحاكاة السريعة لـ ${res.simulatedRoundsCount} جولات`,
        sender: 'المحلل الفني والإحصائي',
        date: `الجولة ${res.nextRound}`,
        type: 'news',
        read: false,
        content: `تمت محاكاة ${res.simulatedRoundsCount} جولات بنجاح.\n` +
          (userClub
            ? `حصيلة فريقك (${userClub.name}): ${res.userClubStatsDelta.wins} فوز، ${res.userClubStatsDelta.draws} تعادل، ${res.userClubStatsDelta.losses} هزيمة. حصدت ${res.userClubStatsDelta.points} نقطة، وسجلت ${res.userClubStatsDelta.goalsFor} هدفاً واستقبلت ${res.userClubStatsDelta.goalsAgainst}.`
            : `تم تحديث جدول الترتيب وإحصائيات الفرق واللاعبين لجميع الأندية.`),
      };
      setInbox(prev => [batchMsg, ...prev]);

      return {
        success: true,
        simulatedCount: res.simulatedRoundsCount,
        message: `تمت محاكاة ${res.simulatedRoundsCount} جولات بنجاح!`,
      };
    } finally {
      setTimeout(() => {
        isSimulationRunningRef.current = false;
        setIsSimulationRunning(false);
      }, 300);
    }
  };

  // ----------------------------------------------------
  // TRANSFERS & CONTRACT MANAGEMENT
  // ----------------------------------------------------

  const buyPlayer = (player: Player, customFee?: number): { success: boolean; message: string } => {
    if (!userClub) {
      return { success: false, message: 'يجب أن تتولى تدريب نادٍ أولاً لإجراء التعاقدات!' };
    }
    if (!player || !player.id) {
      return { success: false, message: 'بيانات اللاعب غير صالحة!' };
    }

    try {
      const joinCheck = canPlayerJoinClub(player, userClub);
      if (!joinCheck.canJoin) {
        return { success: false, message: joinCheck.reason || 'اللاعب يرفض الانضمام للنادي في الوقت الحالي!' };
      }

      const { fairMarketValue, recommendedMonthlyWage } = calculatePlayerFairValue(player, userClub);
      const baseThreeYearPrice = Math.max(25000, Number(player.marketValue) || fairMarketValue || 50000);
      const defaultContractYears = 3;
      const isInTransferMarket =
        Array.isArray(transferMarket) && transferMarket.some(p => p && p.id === player.id);

      // Search for the player across local teams and world clubs BEFORE treating missing currentClubId as a free agent
      let sellingClubId = isInTransferMarket
        ? ''
        : player.currentClubId && player.currentClubId !== 'free_agents'
          ? player.currentClubId
          : (player as any).clubId && (player as any).clubId !== 'free_agents'
            ? (player as any).clubId
            : '';

      if (!isInTransferMarket && !sellingClubId) {
        const localSelling = teams.find(t => (t.players || []).some(p => p && p.id === player.id));
        if (localSelling) {
          sellingClubId = localSelling.id;
        } else {
          try {
            const custom = getCustomLeagues();
            for (const league of Object.values(custom)) {
              const found = (league.teams || []).find(c => (c.players || []).some(p => p && p.id === player.id));
              if (found) {
                sellingClubId = found.id;
                break;
              }
            }
            if (!sellingClubId) {
              for (const league of Object.values(GLOBAL_LEAGUES)) {
                const found = (league.teams || []).find(c => (c.players || []).some(p => p && p.id === player.id));
                if (found) {
                  sellingClubId = found.id;
                  break;
                }
              }
            }
          } catch {}
        }
      }

      // Only treat as free agent if in transferMarket or not found in any club
      const isFreeAgent = isInTransferMarket || !sellingClubId;

      const transferFee = isFreeAgent
        ? 0
        : customFee !== undefined && customFee > 0
          ? customFee
          : calculateContractDurationTransferFee(baseThreeYearPrice, defaultContractYears, false);
      const salary = Math.max(2500, Number(player.salary) || recommendedMonthlyWage || 2500);

      const transferResult = executeAtomicTransfer({
        player: { ...player, currentClubId: isFreeAgent ? '' : sellingClubId, isFreeAgent },
        sellingClubId: isFreeAgent ? '' : sellingClubId,
        buyingClubId: userClub.id,
        allTeams: teams,
        transferFee,
        salary,
        contractYears: defaultContractYears,
        currentRound,
        seasonNumber: season.seasonNumber,
      });

      if (!transferResult.success) {
        return { success: false, message: transferResult.message };
      }

      setTeams(transferResult.updatedTeams);
      const normBoughtName = normalizePlayerKey(player.name);
      setTransferMarket(prev =>
        (Array.isArray(prev) ? prev : []).filter(
          p => p && p.id && p.id !== player.id && (normBoughtName ? normalizePlayerKey(p.name) !== normBoughtName : true)
        )
      );
      setActiveNegotiations(prev => (Array.isArray(prev) ? prev : []).filter(n => n.playerId !== player.id));

      if (transferResult.transferEntry) {
        setTransferHistory(prev => [transferResult.transferEntry!, ...(Array.isArray(prev) ? prev : [])]);
      }

      if (transferResult.inboxMessage) {
        setInbox(prev => [transferResult.inboxMessage!, ...(Array.isArray(prev) ? prev : [])]);
      }

      setClubEconomy(prev => ({
        ...prev,
        transferSpendingTotal: (prev.transferSpendingTotal || 0) + transferFee,
        currentSeasonNetProfit: (prev.currentSeasonNetProfit || 0) - transferFee,
      }));

      return { success: true, message: transferResult.message };
    } catch (err: any) {
      console.error('[GameContext] buyPlayer failed unexpectedly:', err);
      return { success: false, message: err?.message || 'حدث خطأ غير متوقع أثناء إتمام عملية الشراء.' };
    }
  };

  const negotiatePlayerTransfer = (
    proposal: TransferNegotiationProposal
  ): { success: boolean; result: NegotiationResult } => {
    if (!userClub) {
      return {
        success: false,
        result: {
          decision: 'reject',
          clubApproved: false,
          playerApproved: false,
          message: 'يجب أن تتولى تدريب نادٍ أولاً للدخول في مفاوضات!',
        }
      };
    }

    // Locate player in Market or Teams
    let targetPlayer: Player | undefined = transferMarket.find(p => p.id === proposal.playerId);
    let sellingClub: Club | undefined = undefined;

    if (!targetPlayer) {
      for (const t of teams) {
        const found = (t.players || []).find(p => p.id === proposal.playerId);
        if (found) {
          targetPlayer = found;
          sellingClub = t;
          break;
        }
      }
    }

    if (!targetPlayer) {
      const allDb = getAllDatabasePlayers(teams, transferMarket, activeNegotiations, userClub?.id);
      const foundItem = allDb.find(i => i.player.id === proposal.playerId);
      if (foundItem) {
        targetPlayer = foundItem.player;
        sellingClub = foundItem.club;
      }
    }

    if (!targetPlayer) {
      return {
        success: false,
        result: {
          decision: 'reject',
          clubApproved: false,
          playerApproved: false,
          message: 'اللاعب غير متواجد في قاعدة البيانات!',
        }
      };
    }

    const negotiation = evaluateTransferOffer(
      targetPlayer,
      sellingClub,
      proposal,
      userClub,
      manager.reputation
    );

    if (negotiation.decision === 'accept') {
      const transferResult = executeAtomicTransfer({
        player: targetPlayer,
        sellingClubId: sellingClub?.id,
        buyingClubId: userClub.id,
        allTeams: teams,
        transferFee: proposal.transferFee,
        salary: proposal.monthlySalary,
        contractYears: proposal.contractYears,
        currentRound,
        seasonNumber: season.seasonNumber,
      });

      if (transferResult.success) {
        setTeams(transferResult.updatedTeams);
        setTransferMarket(prev => prev.filter(p => p.id !== targetPlayer!.id));
        if (transferResult.transferEntry) setTransferHistory(prev => [transferResult.transferEntry!, ...prev]);
        if (transferResult.inboxMessage) setInbox(prev => [transferResult.inboxMessage!, ...prev]);

        setClubEconomy(prev => ({
          ...prev,
          transferSpendingTotal: prev.transferSpendingTotal + proposal.transferFee,
          currentSeasonNetProfit: prev.currentSeasonNetProfit - proposal.transferFee,
        }));
      }

      return { success: transferResult.success, result: negotiation };
    }

    return { success: false, result: negotiation };
  };

  const sellPlayer = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const targetPlayer = squadPlayers.find(p => p.id === playerId);
    if (!targetPlayer) {
      return { success: false, message: 'اللاعب غير موجود بالفريق' };
    }

    if (squadPlayers.length <= 14) {
      return { success: false, message: 'لا يمكن بيع اللاعب؛ يجب أن يحتوي الفريق على 14 لاعباً على الأقل!' };
    }

    const saleAmount = Math.max(25000, Math.round(targetPlayer.marketValue || 50000));

    // Pick a real AI club so the sold player joins another club and actively plays there
    const eligibleBuyers = findEligibleBuyerClubs(targetPlayer, teams, userClub.id);
    const fallbackAiClubs = teams.filter(t => !t.isUserClub && t.id !== userClub.id);
    const chosenBuyer = eligibleBuyers.length > 0
      ? eligibleBuyers[Math.floor(Math.random() * eligibleBuyers.length)].club
      : (fallbackAiClubs.length > 0 ? fallbackAiClubs[Math.floor(Math.random() * fallbackAiClubs.length)] : null);

    if (chosenBuyer) {
      const ensuredBuyerTeams = teams.map(t =>
        t.id === chosenBuyer.id ? { ...t, budget: Math.max(t.budget || 0, saleAmount + 100000) } : t
      );
      const atomicRes = executeAtomicTransfer({
        player: targetPlayer,
        sellingClubId: userClub.id,
        buyingClubId: chosenBuyer.id,
        allTeams: ensuredBuyerTeams,
        transferFee: saleAmount,
        salary: targetPlayer.salary || 5000,
        contractYears: 3,
        currentRound,
        seasonNumber: season.seasonNumber,
      });

      if (atomicRes.success) {
        setTeams(atomicRes.updatedTeams);
        if (atomicRes.transferEntry) {
          setTransferHistory(prev => [atomicRes.transferEntry!, ...prev]);
        }
        setClubEconomy(prev => ({
          ...prev,
          transferIncomeTotal: prev.transferIncomeTotal + saleAmount,
          currentSeasonNetProfit: prev.currentSeasonNetProfit + saleAmount,
        }));
        const sellMsg: InboxMessage = {
          id: `msg_trans_sell_${Date.now()}`,
          title: `بيع اللاعب ${targetPlayer.name} إلى ${chosenBuyer.name} 💰`,
          sender: 'إدارة الحسابات والتعاقدات',
          date: `الجولة ${currentRound}`,
          type: 'transfer',
          read: false,
          content: `تم بيع اللاعب ${targetPlayer.name} رسمياً إلى نادي ${chosenBuyer.name} بالسعر الثابت (${saleAmount.toLocaleString()} ج.م) وتم إيداع المبلغ في خزينة النادي وانضم اللاعب لتشكيلة ناديه الجديد.`,
        };
        setInbox(prev => [sellMsg, ...prev]);
        return {
          success: true,
          message: `تم بيع ${targetPlayer.name} إلى نادي ${chosenBuyer.name} بالسعر الثابت (${saleAmount.toLocaleString()} ج.م)!`,
        };
      }
    }

    const newStarting = userClub.tactics?.startingPlayerIds.filter(id => id !== playerId) || [];
    const newBench = userClub.tactics?.benchPlayerIds.filter(id => id !== playerId) || [];
    const soldMarketPlayer: Player = {
      ...targetPlayer,
      currentClubId: chosenBuyer?.id || '',
      currentLeagueId: chosenBuyer?.leagueId || 'free_agents',
      isFreeAgent: !chosenBuyer,
      contractYears: chosenBuyer ? 3 : 0,
      isListedForTransfer: Boolean(chosenBuyer),
    };

    setTeams(prev => prev.map(t => {
      if (t.isUserClub || t.id === userClub.id) {
        return {
          ...t,
          budget: (t.budget || 0) + saleAmount,
          transferBudget: (t.transferBudget || t.budget || 0) + saleAmount,
          players: (t.players || []).filter(p => p.id !== playerId),
          tactics: t.tactics ? {
            ...t.tactics,
            startingPlayerIds: newStarting,
            benchPlayerIds: newBench,
          } : undefined,
        };
      }
      if (chosenBuyer && t.id === chosenBuyer.id) {
        return {
          ...t,
          players: [...(t.players || []).filter(p => p.id !== playerId), soldMarketPlayer],
        };
      }
      return t;
    }));

    if (!chosenBuyer) {
      setTransferMarket(prev => [
        soldMarketPlayer,
        ...(Array.isArray(prev) ? prev.filter(p => p && p.id !== playerId) : []),
      ]);
    }
    setActiveNegotiations(prev => prev.filter(n => n.playerId !== playerId));
    setIncomingBids(prev => prev.filter(b => b.playerId !== playerId));

    const transferEntry: TransferHistoryEntry = {
      id: `tx_${Date.now()}_${targetPlayer.id}`,
      playerId: targetPlayer.id,
      playerName: targetPlayer.name,
      playerRating: targetPlayer.overallRating,
      position: targetPlayer.position,
      type: 'sell',
      fee: saleAmount,
      salary: targetPlayer.salary,
      date: `الجولة ${currentRound}`,
      seasonNumber: season.seasonNumber,
      round: currentRound,
      fromClubName: userClub.name,
      toClubName: chosenBuyer?.name || 'نادي آخر (سوق الانتقالات)',
      timestamp: Date.now(),
    };
    setTransferHistory(prev => [transferEntry, ...prev]);

    setClubEconomy(prev => ({
      ...prev,
      transferIncomeTotal: prev.transferIncomeTotal + saleAmount,
      currentSeasonNetProfit: prev.currentSeasonNetProfit + saleAmount,
    }));

    const sellMsg: InboxMessage = {
      id: `msg_trans_sell_${Date.now()}`,
      title: `بيع اللاعب ${targetPlayer.name} بنجاح 💰`,
      sender: 'إدارة الحسابات',
      date: `الجولة ${currentRound}`,
      type: 'transfer',
      read: false,
      content: `تمت الموافقة على بيع اللاعب ${targetPlayer.name} بالسعر الثابت (${saleAmount.toLocaleString()} جنيه) وتم إيداع المبلغ في خزينة النادي.`,
    };
    setInbox(prev => [sellMsg, ...prev]);

    return { success: true, message: `تم بيع ${targetPlayer.name} بالسعر الثابت (${saleAmount.toLocaleString()} جنيه)!` };
  };

  const listPlayerForTransfer = (playerId: string, isListed: boolean): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const targetPlayer = squadPlayers.find(p => p.id === playerId);
    if (!targetPlayer) return { success: false, message: 'اللاعب غير موجود في قائمة الفريق!' };

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        players: (t.players || []).map(p => p.id === playerId ? { ...p, isListedForTransfer: isListed } : p)
      };
    }));

    if (isListed) {
      // Check if there is already an active selling negotiation for this player
      const alreadyNegotiating = activeNegotiations.some(
        n => n.playerId === playerId && n.type === 'sell' && n.stage !== 'completed' && n.stage !== 'rejected' && n.stage !== 'cancelled'
      );
      
      if (!alreadyNegotiating) {
        // Pick an interested buyer club from available clubs with REAL budgets and appropriate reputation/tier
        const eligibleBuyers = findEligibleBuyerClubs(targetPlayer, teams, userClub.id);

        if (eligibleBuyers.length === 0) {
          return {
            success: true,
            message: `تم إدراج ${targetPlayer.name} في لائحة الانتقالات بالسعر الثابت (${(targetPlayer.marketValue || 0).toLocaleString()} ج.م). سيتم إرسال العروض فور توفر نادٍ بميزانية مناسبة.`,
          };
        }

        const { club: buyerClub } = eligibleBuyers[Math.floor(Math.random() * eligibleBuyers.length)];

        // Fixed, non-negotiable player price
        const offerFee = Math.max(25000, Math.round(targetPlayer.marketValue || 100000));

        if (offerFee <= 0 || offerFee > buyerClub.budget) {
          return {
            success: true,
            message: `تم إدراج ${targetPlayer.name} في لائحة الانتقالات بالسعر الثابت (${offerFee.toLocaleString()} ج.م).`,
          };
        }

        const newSellNeg: ActiveNegotiation = {
          id: `neg_sell_${Date.now()}_${targetPlayer.id}`,
          type: 'sell',
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
          playerOverall: targetPlayer.overallRating,
          playerPosition: targetPlayer.position,
          playerAge: targetPlayer.age,
          playerClubId: userClub.id,
          playerClubName: userClub.name,
          sellingClubName: userClub.name,
          buyerClubId: buyerClub.id,
          buyerClubName: buyerClub.name,
          stage: 'incoming_bid',
          bidFee: offerFee,
          offeredSalary: targetPlayer.salary,
          contractYears: 3,
          squadRole: 'first_team',
          daysRemainingInStage: 3,
          managerHasCountered: true,
          counterCount: 0,
          statusMessage: `وصل عرض رسمي من نادي ${buyerClub.name} لشراء اللاعب ${targetPlayer.name} بالسعر الثابت وغير القابل للتفاوض (${offerFee.toLocaleString()} ج.م). يمكنك قبول البيع أو رفض العرض.`,
          actionRequired: true,
          history: [
            {
              dateStr: calendarDate.rawDateStr,
              message: `[${calendarDate.formattedArabic}] عرض اللاعب للبيع وتلقي عرض رسمي من نادي ${buyerClub.name} بالسعر الثابت (${offerFee.toLocaleString()} ج.م).`,
              from: 'club',
            },
          ],
        };

        setActiveNegotiations(prev => [newSellNeg, ...prev.filter(n => n.playerId !== playerId || n.type !== 'sell')]);

        // Send inbox message
        const sellInboxMsg: InboxMessage = {
          id: `msg_sell_${Date.now()}`,
          title: `عرض شراء وارد للاعب ${targetPlayer.name} من نادي ${buyerClub.name} 💰`,
          sender: `إدارة التعاقدات (${buyerClub.name})`,
          date: calendarDate.formattedArabic || `الجولة ${currentRound}`,
          type: 'offer',
          read: false,
          content: `تلقى ناديك عرضاً رسمياً من نادي ${buyerClub.name} لشراء اللاعب ${targetPlayer.name} بالسعر الثابت (${offerFee.toLocaleString()} ج.م). يمكنك مراجعة العرض والموافقة عليه أو رفضه من تبويب المفاوضات.`,
        };
        setInbox(prev => [sellInboxMsg, ...prev]);

        return {
          success: true,
          message: `تم عرض ${targetPlayer.name} في سوق الانتقالات وتلقى النادي عرضاً رسمياً من نادي ${buyerClub.name} بالسعر الثابت (${offerFee.toLocaleString()} ج.م)!`,
        };
      }

      return {
        success: true,
        message: `تم إدراج ${targetPlayer.name} في لائحة الانتقالات لاستقبال العروض.`,
      };
    } else {
      // Remove any pending sell negotiation for this player
      setActiveNegotiations(prev => prev.filter(n => !(n.playerId === playerId && n.type === 'sell')));
      return {
        success: true,
        message: `تم سحب ${targetPlayer.name} من لائحة الانتقالات.`,
      };
    }
  };

  const acceptSellNegotiation = (negotiationId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    const neg = activeNegotiations.find(n => n.id === negotiationId);
    if (!neg) return { success: false, message: 'المفاوضات غير موجودة أو انتهت صلاحيتها!' };

    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const player = squadPlayers.find(p => p.id === neg.playerId);
    if (!player) {
      setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));
      return { success: false, message: 'اللاعب لم يعد موجوداً في فريقك!' };
    }

    if (squadPlayers.length <= 14) {
      return { success: false, message: 'لا يمكن بيع اللاعب؛ الحد الأدنى لقائمة الفريق 14 لاعباً!' };
    }

    const transferResult = executeAtomicTransfer({
      player,
      sellingClubId: userClub.id,
      buyingClubId: neg.buyerClubId,
      allTeams: teams,
      transferFee: neg.bidFee,
      salary: player.salary,
      contractYears: neg.contractYears || 2,
      currentRound,
      seasonNumber: season.seasonNumber,
    });

    if (!transferResult.success) {
      return { success: false, message: transferResult.message };
    }

    setTeams(transferResult.updatedTeams);
    if (transferResult.transferEntry) setTransferHistory(prev => [transferResult.transferEntry!, ...prev]);
    if (transferResult.inboxMessage) setInbox(prev => [transferResult.inboxMessage!, ...prev]);

    setClubEconomy(prev => ({
      ...prev,
      transferIncomeTotal: (prev.transferIncomeTotal || 0) + neg.bidFee,
      currentSeasonNetProfit: (prev.currentSeasonNetProfit || 0) + neg.bidFee,
    }));

    // Remove negotiation immediately so it disappears from negotiations hub
    setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));
    setIncomingBids(prev => prev.filter(b => b.playerId !== player.id));

    return {
      success: true,
      message: `تمت الموافقة الرسمية على بيع ${player.name} إلى نادي ${neg.buyerClubName} بمبلغ ${neg.bidFee.toLocaleString()} ج.م وتم إيداع المبلغ في خزينة النادي!`,
    };
  };

  const counterSellNegotiation = (negotiationId: string, demandedFee: number): { success: boolean; message: string } => {
    const neg = activeNegotiations.find(n => n.id === negotiationId);
    if (!neg) return { success: false, message: 'المفاوضات غير موجودة!' };

    if (neg.managerHasCountered) {
      return {
        success: false,
        message: 'لقد قمت بتقديم عرض مقابل مسبقاً في هذه المفاوضات! هذا العرض نهائي وحاسم (يمكنك قبول العرض أو رفضه فقط).',
      };
    }

    if (demandedFee <= 0) {
      return { success: false, message: 'يرجى إدخال مبلغ صحيح للعرض المقابل.' };
    }

    setActiveNegotiations(prev => prev.map(n => {
      if (n.id === negotiationId) {
        return {
          ...n,
          demandedFee,
          stage: 'club_counter',
          managerHasCountered: true,
          counterCount: (n.counterCount || 0) + 1,
          daysRemainingInStage: 1,
          actionRequired: false,
          statusMessage: `تم إرسال طلب زيادة المقابل المالي إلى نادي ${neg.buyerClubName} بمبلغ (${demandedFee.toLocaleString()} ج.م). في انتظار ردهم مع تقدم التقويم.`,
          history: [
            ...n.history,
            {
              dateStr: calendarDate.rawDateStr,
              message: `[${calendarDate.formattedArabic}] تقديم عرض مقابل بمبلغ (${demandedFee.toLocaleString()} ج.م).`,
              from: 'manager' as const,
            },
          ],
        };
      }
      return n;
    }));

    return {
      success: true,
      message: `تم إرسال طلب زيادة المقابل المالي إلى نادي ${neg.buyerClubName} بمبلغ (${demandedFee.toLocaleString()} ج.م).`,
    };
  };

  const rejectSellNegotiation = (negotiationId: string): { success: boolean; message: string } => {
    const neg = activeNegotiations.find(n => n.id === negotiationId);
    setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));
    if (neg) {
      setIncomingBids(prev => prev.filter(b => b.playerId !== neg.playerId));
    }
    return { success: true, message: 'تم رفض العرض وإلغاء المفاوضات.' };
  };

  const clearCompletedNegotiations = () => {
    setActiveNegotiations(prev => prev.filter(n => n.stage !== 'completed' && n.stage !== 'rejected' && n.stage !== 'cancelled'));
  };

  const releasePlayerContract = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const targetPlayer = squadPlayers.find(p => p.id === playerId);
    if (!targetPlayer) return { success: false, message: 'اللاعب غير موجود في الفريق!' };

    if (squadPlayers.length <= 14) {
      return { success: false, message: 'لا يمكن تسريح اللاعب؛ الحد الأدنى للقائمة 14 لاعباً.' };
    }

    const severanceFee = Math.round((targetPlayer.salary || 1000) * (targetPlayer.contractYears || 1) * 3);
    if (userClub.budget < severanceFee) {
      return { success: false, message: `الميزانية لا تكفي لدفع الشرط الجزائي والتسريح (${severanceFee.toLocaleString()} ج.م)!` };
    }

    const aiClubs = teams.filter(t => !t.isUserClub && t.id !== userClub.id);
    const destClub = aiClubs.length > 0 ? aiClubs[Math.floor(Math.random() * aiClubs.length)] : null;

    if (destClub) {
      const atomicRes = executeAtomicTransfer({
        player: targetPlayer,
        sellingClubId: userClub.id,
        buyingClubId: destClub.id,
        allTeams: teams.map(t => t.id === userClub.id ? { ...t, budget: Math.max(0, t.budget - severanceFee) } : t),
        transferFee: 0,
        salary: targetPlayer.salary || 3500,
        contractYears: 2,
        currentRound,
        seasonNumber: season.seasonNumber,
      });

      if (atomicRes.success) {
        setTeams(atomicRes.updatedTeams);
        if (atomicRes.transferEntry) {
          setTransferHistory(prev => [atomicRes.transferEntry!, ...prev]);
        }
        return {
          success: true,
          message: `تم إنهاء عقد ${targetPlayer.name} بالتراضي وانتقل اللاعب في صفقة حرة إلى نادي ${destClub.name} ليشارك معهم أساسياً.`,
        };
      }
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        budget: t.budget - severanceFee,
        players: (t.players || []).filter(p => p.id !== playerId),
      };
    }));

    return { success: true, message: `تم إنهاء عقد ${targetPlayer.name} بالتراضي ودفع مستحقاته.` };
  };

  const acceptIncomingBid = (bidId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    const bid = incomingBids.find(b => b.id === bidId);
    if (!bid) return { success: false, message: 'العرض غير موجود أو انتهت صلاحيته!' };

    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const player = squadPlayers.find(p => p.id === bid.playerId);
    if (!player) return { success: false, message: 'اللاعب لم يعد موجوداً في فريقك!' };

    if (squadPlayers.length <= 14) {
      return { success: false, message: 'لا يمكن بيع اللاعب؛ الحد الأدنى لقائمة الفريق 14 لاعباً!' };
    }

    const transferResult = executeAtomicTransfer({
      player,
      sellingClubId: userClub.id,
      buyingClubId: bid.toClubId,
      allTeams: teams,
      transferFee: bid.bidAmount,
      salary: player.salary,
      contractYears: 2,
      currentRound,
      seasonNumber: season.seasonNumber,
    });

    if (!transferResult.success) {
      return { success: false, message: transferResult.message };
    }

    setTeams(transferResult.updatedTeams);
    setIncomingBids(prev => prev.filter(b => b.id !== bidId && b.playerId !== player.id));
    setActiveNegotiations(prev => prev.filter(n => n.playerId !== player.id));
    setTransferMarket(prev => prev.filter(p => p.id !== player.id));

    if (transferResult.transferEntry) setTransferHistory(prev => [transferResult.transferEntry!, ...prev]);

    setClubEconomy(prev => ({
      ...prev,
      transferIncomeTotal: (prev.transferIncomeTotal || 0) + bid.bidAmount,
      currentSeasonNetProfit: (prev.currentSeasonNetProfit || 0) + bid.bidAmount,
    }));

    const acceptMsg: InboxMessage = {
      id: `msg_bid_accept_${Date.now()}`,
      title: `إتمام بيع اللاعب ${player.name} إلى ${bid.toClubName} 💰`,
      sender: 'إدارة التعاقدات والحسابات',
      date: `الجولة ${currentRound}`,
      type: 'transfer',
      read: false,
      content: `تمت الموافقة الرسمية على انتقال ${player.name} إلى (${bid.toClubName}) مقابل ${bid.bidAmount.toLocaleString()} ج.م وتم إيداع المبلغ في الخزينة.`,
    };

    // Mark matching inbox messages as accepted
    setInbox(prev => [
      acceptMsg,
      ...prev.map(m => {
        if (
          m.offerDetails?.bidId === bidId ||
          (m.offerDetails?.playerId === player.id && m.offerDetails?.type === 'player_bid')
        ) {
          return { ...m, read: true, actionTaken: 'accepted' as const };
        }
        return m;
      }),
    ]);

    return { success: true, message: `تمت الموافقة على العرض وانتقال اللاعب بنجاح!` };
  };

  const rejectIncomingBid = (bidId: string): { success: boolean; message: string } => {
    setIncomingBids(prev => prev.filter(b => b.id !== bidId));
    setInbox(prev => prev.map(m => {
      if (m.offerDetails?.bidId === bidId) {
        return { ...m, read: true, actionTaken: 'rejected' as const };
      }
      return m;
    }));
    return { success: true, message: 'تم رفض العرض وإشعار النادي مقدم العرض.' };
  };

  const renewPlayerContract = (playerId: string, wage: number, years: number): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    const targetP = (userClub.players || []).find(p => p.id === playerId);
    const updatedSalary = Math.max(500, Math.round(wage || targetP?.salary || 2500));
    const currentOtherWages = (userClub.players || [])
      .filter(p => p.id !== playerId)
      .reduce((acc, p) => acc + (p.salary || 0), 0);
    const maxWageBudget = calculateClubMonthlyIncome(userClub);
    if (currentOtherWages + updatedSalary > maxWageBudget * 1.35) {
      return {
        success: false,
        message: `الراتب الجديد (${updatedSalary.toLocaleString()} ج.م/شهرياً) يتجاوز سقف الرواتب المتاح للنادي!`,
      };
    }

    let renewedPlayerName = targetP?.name || '';
    const clampedAddYears = Math.min(5, Math.max(1, years || 3));
    let updatedYears = clampedAddYears;

    setTeams(prev => prev.map(t => {
      if (t.id !== userClub.id) {
        return t.isUserClub ? { ...t, isUserClub: false } : t;
      }
      return {
        ...t,
        isUserClub: true,
        players: t.players.map(p => {
          if (p.id === playerId) {
            renewedPlayerName = p.name;
            updatedYears = Math.min(5, Math.max(1, (p.contractYears || 0) + clampedAddYears));
            return {
              ...p,
              salary: updatedSalary,
              contractYears: updatedYears,
              morale: Math.min(100, p.morale + 20),
            };
          }
          return p;
        })
      };
    }));

    // Update matching inbox messages and add renewal confirmation
    const confirmMsg: InboxMessage = {
      id: `msg_renew_confirmed_${Date.now()}_${playerId}`,
      title: `✅ تم تجديد عقد اللاعب ${renewedPlayerName || ''} بنجاح!`,
      sender: 'لجنة التعاقدات وشؤون اللاعبين',
      date: calendarDate.formattedArabic,
      type: 'contract',
      read: false,
      content: `تم توثيق عقد جديد للاعب ${renewedPlayerName} يمتد لـ ${updatedYears} سنوات براتب شهري قدره (${updatedSalary.toLocaleString()} ج.م)، وارتفعت معنويات اللاعب وتأكد بقاؤه ضمن صفوف الفريق!`,
    };

    setInbox(prev => [
      confirmMsg,
      ...prev.map(m => {
        if (m.contractDetails?.playerId === playerId) {
          return {
            ...m,
            read: true,
            actionTaken: 'renewed' as const,
            contractDetails: {
              ...m.contractDetails,
              renewed: true,
              currentSalary: updatedSalary,
              contractYears: updatedYears,
            },
          };
        }
        return m;
      }),
    ]);

    return {
      success: true,
      message: `تم تجديد عقد ${renewedPlayerName || 'اللاعب'} لمدة ${updatedYears} سنوات براتب شهري (${updatedSalary.toLocaleString()} ج.م)!`,
    };
  };

  const upgradeFacility = (facilityKey: keyof ClubFacilities, cost: number): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    // A missing / non-numeric level (old saves, partial objects) counts as level 1. Before, such a
    // facility took the money but kept an undefined level, so the screen kept showing level 1.
    const levelOf = (f: any): number => {
      const n = Number(f?.[facilityKey]);
      return Number.isFinite(n) && n >= 1 ? Math.min(5, Math.round(n)) : 1;
    };
    const existingLevel = levelOf(userClub.facilities);
    if (existingLevel >= 5) {
      return { success: false, message: 'هذه المنشأة وصلت بالفعل إلى المستوى الأقصى.' };
    }

    if ((userClub.budget || 0) < cost) {
      return { success: false, message: 'الميزانية لا تكفي لإجراء هذا التطوير!' };
    }

    // Apply to exactly the club the screen shows (userClub), not to whatever carries the isUserClub flag
    const targetId = userClub.id;
    setTeams(prev => prev.map(t => {
      if (t.id !== targetId) return t;
      const current = levelOf(t.facilities);
      if (current >= 5) return t;
      const capacity = Number(t.facilities?.stadiumCapacity);
      return {
        ...t,
        budget: (t.budget || 0) - cost,
        facilities: {
          ...(t.facilities || ({} as ClubFacilities)),
          stadiumName: t.facilities?.stadiumName || t.name,
          stadiumCapacity: Number.isFinite(capacity) && capacity > 0
            ? (facilityKey === 'stadiumLevel' ? capacity + 600 : capacity)
            : (facilityKey === 'stadiumLevel' ? 5600 : 5000),
          stadiumLevel: facilityKey === 'stadiumLevel' ? current + 1 : Math.max(1, Number(t.facilities?.stadiumLevel) || 1),
          medicalCenterLevel: facilityKey === 'medicalCenterLevel' ? current + 1 : Math.max(1, Number(t.facilities?.medicalCenterLevel) || 1),
          trainingGroundLevel: facilityKey === 'trainingGroundLevel' ? current + 1 : Math.max(1, Number(t.facilities?.trainingGroundLevel) || 1),
          youthAcademyLevel: facilityKey === 'youthAcademyLevel' ? current + 1 : Math.max(1, Number(t.facilities?.youthAcademyLevel) || 1),
          scoutingNetworkLevel: facilityKey === 'scoutingNetworkLevel' ? current + 1 : Math.max(1, Number(t.facilities?.scoutingNetworkLevel) || 1),
          ...(t.facilities?.ticketPrice !== undefined ? { ticketPrice: t.facilities.ticketPrice } : {}),
        },
      };
    }));

    // Update Club Economy Summary
    setClubEconomy(prev => ({
      ...prev,
      facilitySpendingTotal: prev.facilitySpendingTotal + cost,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - cost,
    }));

    return { success: true, message: `تمت الترقية إلى المستوى ${existingLevel + 1} بنجاح!` };
  };

  const treatPlayerInHospital = (
    playerId: string,
    treatmentType: 'physio' | 'specialist' | 'prp'
  ): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    }

    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const player = squadPlayers.find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'اللاعب غير موجود في قائمة الفريق!' };
    }

    if (!player.isInjured && (!player.injury || player.injury.daysRemaining <= 0)) {
      return { success: false, message: 'اللاعب سليم ومعافى تماماً ولا يحتاج لدخول المستشفى!' };
    }

    const currentInjury = player.injury || {
      type: player.injuryType || 'إصابة عضلية',
      daysRemaining: Math.max(2, (player.injuryWeeks || 1) * 3),
      severity: 'mild' as const,
      description: 'إصابة تستدعي العلاج الطبي والتأهيل',
    };

    let cost = 5000;
    let treatmentName = 'جلسات علاج طبيعي وتأهيل حركي';
    let newDaysRemaining = currentInjury.daysRemaining;
    let fullyRecovered = false;

    if (treatmentType === 'physio') {
      cost = 5000;
      treatmentName = 'جلسات علاج طبيعي وتأهيل حركي مكثف';
      newDaysRemaining = Math.max(0, currentInjury.daysRemaining - Math.max(3, Math.ceil(currentInjury.daysRemaining * 0.5)));
      if (newDaysRemaining <= 0) fullyRecovered = true;
    } else if (treatmentType === 'specialist') {
      cost = 20000;
      treatmentName = 'استشارة طبيب أخصائي رياضي وعلاج بالليزر والموجات';
      newDaysRemaining = Math.max(0, currentInjury.daysRemaining - Math.max(5, Math.ceil(currentInjury.daysRemaining * 0.75)));
      if (newDaysRemaining <= 0) fullyRecovered = true;
    } else if (treatmentType === 'prp') {
      cost = 45000;
      treatmentName = 'حقن البلازما الغنية بالصفائح (PRP) وعلاج فوري متقدم';
      fullyRecovered = true;
      newDaysRemaining = 0;
    }

    if (userClub.budget < cost) {
      return {
        success: false,
        message: `ميزانية النادي (${userClub.budget.toLocaleString()} ج.م) لا تكفي لتغطية تكاليف ${treatmentName} (${cost.toLocaleString()} ج.م)!`,
      };
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        budget: Math.max(0, t.budget - cost),
        players: (t.players || []).map(p => {
          if (p.id !== playerId) return p;
          if (fullyRecovered || newDaysRemaining <= 0) {
            return {
              ...p,
              isInjured: false,
              injuryType: undefined,
              injuryWeeks: undefined,
              injuryMatches: undefined,
              injury: null,
              fitness: Math.min(95, Math.max(80, p.fitness + 15)),
            };
          }
          return {
            ...p,
            isInjured: true,
            injuryType: currentInjury.type,
            injury: {
              ...currentInjury,
              daysRemaining: newDaysRemaining,
              treatmentType,
              recoveryPercentage: treatmentType === 'prp' ? 95 : treatmentType === 'specialist' ? 80 : 50,
            },
            fitness: Math.min(85, p.fitness + 5),
          };
        }),
      };
    }));

    setClubEconomy(prev => ({
      ...prev,
      facilitySpendingTotal: prev.facilitySpendingTotal + cost,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - cost,
    }));

    const resultMessage = fullyRecovered || newDaysRemaining <= 0
      ? `تم علاج اللاعب ${player.name} بنجاح عبر (${treatmentName}) وتعافى تماماً وأصبح جاهزاً للمشاركة فوراً!`
      : `تم إخضاع ${player.name} لـ (${treatmentName}) بتكلفة ${cost.toLocaleString()} ج.م، وتقليص مدة غيابه إلى ${newDaysRemaining} ${newDaysRemaining === 1 ? 'يوم' : 'أيام'} فقط!`;

    const medMsg: InboxMessage = {
      id: `msg_med_${Date.now()}`,
      title: `تقرير المركز الطبي: علاج ${player.name} 🏥`,
      sender: 'رئيس الجهاز الطبي للنادي',
      date: calendarDate.formattedArabic || `الجولة ${currentRound}`,
      type: 'news',
      read: false,
      content: resultMessage,
    };
    setInbox(prev => [medMsg, ...prev]);

    return { success: true, message: resultMessage };
  };

  // AdMob Rewarded: Fast-track recovery for injured player immediately after onUserEarnedReward
  const healPlayerWithAd = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    const player = (userClub.players || []).find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'اللاعب غير موجود في قائمة الفريق!' };
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        players: (t.players || []).map(p => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            isInjured: false,
            injuryType: undefined,
            injuryWeeks: undefined,
            injuryMatches: undefined,
            injury: null,
            fitness: Math.min(100, Math.max(90, (p.fitness || 80) + 15)),
          };
        }),
      };
    }));

    const successMessage = `تم تسريع علاج وشفا اللاعب ${player.name} بنجاح بعد مشاهدة الإعلان! أصبح اللاعب جاهزاً للمشاركة فوراً 🏥✨`;

    const medMsg: InboxMessage = {
      id: `msg_reward_heal_${Date.now()}`,
      title: `علاج فوري للمصاب: ${player.name} 🏥`,
      sender: 'الجهاز الطبي للنادي',
      date: calendarDate.formattedArabic || `الجولة ${currentRound}`,
      type: 'news',
      read: false,
      content: successMessage,
    };
    setInbox(prev => [medMsg, ...prev]);

    return { success: true, message: successMessage };
  };

  // AdMob Rewarded: Cancel player match suspension immediately after onUserEarnedReward
  const cancelPlayerSuspensionWithAd = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    const player = (userClub.players || []).find(p => p.id === playerId);
    if (!player) {
      return { success: false, message: 'اللاعب غير موجود في قائمة الفريق!' };
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        players: (t.players || []).map(p => {
          if (p.id !== playerId) return p;
          return {
            ...p,
            isSuspended: false,
            suspensionMatches: 0,
            suspensionReason: undefined,
          };
        }),
      };
    }));

    const successMessage = `تم إلغاء عقوبة الإيقاف عن اللاعب ${player.name} بنجاح بعد مشاهدة الإعلان! أصبح متاحاً للمباراة القادمة 🟨🟩`;

    const suspMsg: InboxMessage = {
      id: `msg_reward_susp_${Date.now()}`,
      title: `إلغاء عقوبة الإيقاف: ${player.name} 🛡️`,
      sender: 'لجنة المسابقات وشؤون اللاعبين',
      date: calendarDate.formattedArabic || `الجولة ${currentRound}`,
      type: 'news',
      read: false,
      content: successMessage,
    };
    setInbox(prev => [suspMsg, ...prev]);

    return { success: true, message: successMessage };
  };

  // AdMob Rewarded (2X): Sign a random world star for the next match only
  const signWorldStarWithAd = (chosenTemplate?: WorldStarTemplate): {
    success: boolean;
    player?: Player;
    template?: WorldStarTemplate;
    message: string;
  } => {
    if (!userClub) {
      return { success: false, message: 'يجب أن تدرب نادياً للتعاقد مع نجم عالمي!' };
    }

    const template = chosenTemplate || getRandomWorldStarTemplate();
    const guestPlayer = createGuestStarPlayer(template, userClub.id);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;

      // Filter out any previous guest star
      const existingRegularPlayers = (t.players || []).filter(p => !p || !p.isGuestStar);
      const newPlayers = [guestPlayer, ...existingRegularPlayers];

      // Insert into starting lineup or bench
      let updatedTactics = t.tactics ? { ...t.tactics } : undefined;
      if (updatedTactics) {
        const oldGuestStarIds = (t.players || []).filter(p => Boolean(p && p.isGuestStar)).map(p => p.id);
        let startingIds = (updatedTactics.startingPlayerIds || []).filter(id => !oldGuestStarIds.includes(id));
        let benchIds = (updatedTactics.benchPlayerIds || []).filter(id => !oldGuestStarIds.includes(id));

        if (startingIds.length < 11) {
          startingIds = [guestPlayer.id, ...startingIds];
        } else {
          // Replace someone in same position category or last position
          const sameCategoryIdx = startingIds.findIndex(id => {
            const pl = existingRegularPlayers.find(p => p.id === id);
            return pl && pl.positionCategory === guestPlayer.positionCategory;
          });
          const targetIndex = sameCategoryIdx >= 0 ? sameCategoryIdx : (startingIds.length - 1);
          const replacedPlayerId = startingIds[targetIndex];
          startingIds[targetIndex] = guestPlayer.id;

          if (!benchIds.includes(replacedPlayerId) && benchIds.length < 7) {
            benchIds = [replacedPlayerId, ...benchIds];
          }
        }

        updatedTactics = {
          ...updatedTactics,
          startingPlayerIds: startingIds,
          benchPlayerIds: benchIds,
        };
      }

      return {
        ...t,
        players: newPlayers,
        tactics: updatedTactics || t.tactics,
      };
    }));

    try {
      challengesManager.recordAdWatched();
    } catch (_) {}

    const starMsg: InboxMessage = {
      id: `msg_guest_star_${Date.now()}`,
      title: `🌟 وصول النجم العالمي: ${guestPlayer.name} (${guestPlayer.nickname})`,
      sender: 'إدارة العلاقات العامة والتعاقدات الاستثنائية',
      date: calendarDate.formattedArabic || `الجولة ${currentRound}`,
      type: 'news',
      read: false,
      content: `تهانينا يا كابتن! بفضل عقد الرعاية الاستثنائي (2x Ads)، انضم النجم العالمي الكبير ${guestPlayer.name} (تقييم ${guestPlayer.overallRating} - ${template.tierLabelArabic}) رسمياً إلى صفوف فريقك لخوض المباراة القادمة فقط!\n\n💬 تصريح اللاعب فور توقيع العقد:\n"${template.quote}"\n\n📌 تم إدراج اللاعب مباشرة في تشكيلة المباراة القادمة، وسينتهي عقده فور انتهاء صافرة المباراة. حظاً موفقاً في حسم الفوز ⚽🔥`,
    };
    setInbox(prev => [starMsg, ...prev]);

    return {
      success: true,
      player: guestPlayer,
      template,
      message: `🎉 تم التعاقد مع النجم العالمي ${guestPlayer.name} (${guestPlayer.overallRating}) للمباراة القادمة بنجاح!`,
    };
  };

  // AdMob Rewarded: Double Match Revenue after match ends
  const doubleLiveMatchRevenueWithAd = async (): Promise<{ success: boolean; message: string }> => {
    if (!userClub) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    if (!liveMatch || !liveMatch.matchRevenue) {
      return { success: false, message: 'لا توجد بيانات إيراد للمباراة الحالية!' };
    }

    if (liveMatch.matchRevenue.isDoubledWithAd) {
      return { success: false, message: 'تمت مضاعفة إيراد هذه المباراة بالفعل!' };
    }

    const currentRev = liveMatch.matchRevenue;
    const bonusAmount = currentRev.baseTotalRevenue;

    return new Promise((resolve) => {
      let resolved = false;

      const safeResolve = (result: { success: boolean; message: string }) => {
        if (resolved) return;
        resolved = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        resolve(result);
      };

      const safetyTimer = setTimeout(() => {
        safeResolve({
          success: false,
          message: 'انتهت مهلة استجابة الإعلان، يرجى المحاولة بعد لحظات.',
        });
      }, 7000);

      AdManager.showRewardedForAction({
        actionType: 'double_match_revenue',
        onUserEarnedReward: () => {
          const updatedRev: MatchRevenueBreakdown = {
            ...currentRev,
            isDoubledWithAd: true,
            adDoubledBonus: bonusAmount,
            totalRevenue: currentRev.baseTotalRevenue + bonusAmount,
          };

          // Update live match state
          setLiveMatch(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              matchRevenue: updatedRev,
            };
          });

          // If match was already finalized and deposited, add bonus difference to club budget
          if (currentRev.isClaimedToBudget) {
            setTeams(prev => prev.map(t => {
              if (!t.isUserClub && t.id !== userClub.id) return t;
              return {
                ...t,
                budget: (t.budget || 0) + bonusAmount,
              };
            }));

            if (DIAGNOSTIC_CONFIG.ENABLE_BOARD_AND_ECONOMY) {
              setClubEconomy(prev => ({
                ...prev,
                matchIncomeTotal: prev.matchIncomeTotal + bonusAmount,
                currentSeasonNetProfit: prev.currentSeasonNetProfit + bonusAmount,
              }));
            }
          }

          // Update fixture match revenue in fixtures list if present
          if (liveMatch.fixture?.id) {
            setFixtures(prev => prev.map(f => {
              if (f.id === liveMatch.fixture?.id && f.matchRevenue) {
                return {
                  ...f,
                  matchRevenue: updatedRev,
                };
              }
              return f;
            }));
          }

          const bonusMsg: InboxMessage = {
            id: `msg_ad_rev_double_${Date.now()}`,
            title: `🎁 مكافأة مشاهدة الإعلان: مضاعفة إيراد المباراة (+${bonusAmount.toLocaleString()} ج.م)`,
            sender: 'إدارة الرعاية والتسويق',
            date: calendarDate.formattedArabic || `الجولة ${currentRound}`,
            type: 'board',
            read: false,
            content: `تهانينا! بفضل مشاهدتك لإعلان الرعاية الإضافي عبر AdMob، تم مضاعفة كامل إيرادات مباراتك بنجاح.\n\n💰 الإيراد الإضافي الممنوح: +${bonusAmount.toLocaleString()} جنيه مصري.\n📈 الإجمالي الجديد لإيراد المباراة: ${(currentRev.baseTotalRevenue + bonusAmount).toLocaleString()} جنيه مصري.`,
          };
          setInbox(prev => [bonusMsg, ...prev]);

          safeResolve({
            success: true,
            message: `🎉 مبروك! تمت مضاعفة إيراد المباراة بنجاح وحصلت على +${bonusAmount.toLocaleString()} ج.م إضافية!`,
          });
        },
        onDismiss: (earned) => {
          if (!earned) {
            safeResolve({ success: false, message: 'لم تكتمل مشاهدة الإعلان حتى نهايته، لم يتم منح المضاعفة.' });
          }
        },
        onFailure: (err) => {
          safeResolve({
            success: false,
            message: (err && err.message) ? err.message : 'تعذر تحميل الإعلان حالياً، يرجى المحاولة بعد قليل.',
          });
        },
      }).then((started) => {
        if (!started) {
          safeResolve({ success: false, message: 'تعذر تشغيل الإعلان حالياً، يرجى المحاولة لاحقاً.' });
        }
      }).catch(() => {
        safeResolve({ success: false, message: 'حدث خطأ غير متوقع أثناء تجهيز الإعلان.' });
      });
    });
  };

  // Rewarded Match Replay / Rematch Feature (إعادة المباراة مقابل مشاهدة إعلان)
  const rematchLiveMatch = async (): Promise<{ success: boolean; message: string }> => {
    if (!liveMatch) {
      return { success: false, message: 'لا توجد مباراة نشطة لإعادتها!' };
    }

    const currentFixtureId = liveMatch.fixture?.id;
    const targetFixture = fixtures.find(f => f.id === currentFixtureId);
    if (!targetFixture) {
      return { success: false, message: 'تعذر العثور على بيانات المباراة لإعادتها!' };
    }

    return new Promise((resolve) => {
      let resolved = false;

      const safeResolve = (result: { success: boolean; message: string }) => {
        if (resolved) return;
        resolved = true;
        if (safetyTimer) clearTimeout(safetyTimer);
        resolve(result);
      };

      const safetyTimer = setTimeout(() => {
        safeResolve({
          success: false,
          message: 'انتهت مهلة استجابة الإعلان، يرجى المحاولة بعد لحظات.',
        });
      }, 7000);

      AdManager.showRewardedForAction({
        actionType: 'rematch_match',
        onUserEarnedReward: () => {
          let homeTeam = teams.find(t => t.id === targetFixture.homeTeamId) || (targetFixture.homeTeamId ? findClubInWorld(targetFixture.homeTeamId) : undefined) || teams[0];
          let awayTeam = teams.find(t => t.id === targetFixture.awayTeamId) || (targetFixture.awayTeamId ? findClubInWorld(targetFixture.awayTeamId) : undefined) || teams[1];

          if (homeTeam && (homeTeam.id === userClub?.id || homeTeam.isUserClub)) {
            homeTeam = { ...homeTeam, manager: (manager as any) };
          }
          if (awayTeam && (awayTeam.id === userClub?.id || awayTeam.isUserClub)) {
            awayTeam = { ...awayTeam, manager: (manager as any) };
          }

          // Reset match state completely back to minute 0 with fresh energy
          const resetSimulationState = createInitialLiveMatchState(targetFixture, homeTeam, awayTeam, userClub?.tactics, userClub?.id);
          resetSimulationState.isPlaying = true;
          completedMatchFixtureIdRef.current = null;
          isFinishingMatchRef.current = false;
          isMatchFinishedRef.current = false;

          setLiveMatch(resetSimulationState);

          safeResolve({
            success: true,
            message: '🎬 تم تجهيز إعادة المباراة بنجاح! تنطلق صافرة البداية من جديد الآن.. حظاً موفقاً في حسم الفوز ⚽🏆',
          });
        },
        onDismiss: (earned) => {
          if (!earned) {
            safeResolve({ success: false, message: 'لم تكتمل مشاهدة الإعلان، تعذر إعادة المباراة.' });
          }
        },
        onFailure: (err) => {
          safeResolve({
            success: false,
            message: (err && err.message) ? err.message : 'تعذر تحميل الإعلان حالياً، يرجى المحاولة بعد قليل.',
          });
        },
      }).then((started) => {
        if (!started) {
          safeResolve({ success: false, message: 'تعذر تشغيل الإعلان حالياً، يرجى المحاولة لاحقاً.' });
        }
      }).catch(() => {
        safeResolve({ success: false, message: 'حدث خطأ غير متوقع أثناء تجهيز الإعلان.' });
      });
    });
  };

  // Adjust Club Match Ticket Price
  const setClubTicketPrice = (price: number): { success: boolean; message: string } => {
    if (!userClub) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    const safePrice = Math.max(5, Math.min(500, Math.round(price)));

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        facilities: {
          ...t.facilities,
          ticketPrice: safePrice,
        },
      };
    }));

    return {
      success: true,
      message: `تم ضبط سعر تذكرة مباريات الفريق على ${safePrice} جنيه مصري بنجاح!`,
    };
  };

  const transferBudgetToWageBudget = (cashAmount: number): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    if (cashAmount <= 0) {
      return { success: false, message: 'يرجى إدخال مبلغ صحيح للتحويل!' };
    }

    if (userClub.budget < cashAmount) {
      return {
        success: false,
        message: `الميزانية الحالية للنادي (${userClub.budget.toLocaleString()} ج.م) لا تكفي لتحويل هذا المبلغ (${cashAmount.toLocaleString()} ج.م)!`,
      };
    }

    // 1:1 Direct conversion into wage cap so the exact amount transferred is immediately available for player salaries
    const monthlyWageBonus = Math.round(cashAmount);
    if (monthlyWageBonus < 500) {
      return {
        success: false,
        message: 'الحد الأدنى للتحويل هو 500 ج.م لزيادة سقف الرواتب.',
      };
    }

    const targetClubId = userClub.id;
    setTeams(prev => {
      const next = prev.map(t => {
        const isMatch = t.id === targetClubId || Boolean(t.isUserClub && (!targetClubId || t.id === targetClubId));
        if (!isMatch) return t;
        const newWageBonus = (t.wageBudgetMonthly || 0) + monthlyWageBonus;
        return {
          ...t,
          budget: Math.max(0, t.budget - cashAmount),
          wageBudgetMonthly: newWageBonus,
        };
      });
      flushLocalSaveImmediate({ teams: next });
      return next;
    });

    setClubEconomy(prev => ({
      ...prev,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - cashAmount,
    }));

    return {
      success: true,
      message: `تم تحويل ${cashAmount.toLocaleString()} ج.م من ميزانية النادي إلى سقف الرواتب بنجاح (+${monthlyWageBonus.toLocaleString()} ج.م متاحة فوراً للتعاقدات)!`,
    };
  };

  const transferWageToCashBudget = (monthlyAmount: number): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    if (monthlyAmount <= 0) {
      return { success: false, message: 'يرجى إدخال مبلغ صحيح للتحويل!' };
    }

    const currentWageBonus = userClub.wageBudgetMonthly || 0;
    if (currentWageBonus < monthlyAmount) {
      return {
        success: false,
        message: `فائض ميزانية الرواتب المخصص للتحويل حالياً هو (${currentWageBonus.toLocaleString()} ج.م) فقط!`,
      };
    }

    const projectedClub: Club = {
      ...userClub,
      wageBudgetMonthly: currentWageBonus - monthlyAmount,
    };
    const projectedIncome = calculateClubMonthlyIncome(projectedClub);
    const currentWages = calculateClubTotalMonthlyWages(userClub);

    if (currentWages > projectedIncome) {
      return {
        success: false,
        message: `لا يمكن خفض سقف الرواتب! إجمالي رواتب لاعبيك الحالية (${currentWages.toLocaleString()} ج.م) ستتجاوز السقف الجديد (${projectedIncome.toLocaleString()} ج.م).`,
      };
    }

    const cashGain = Math.round(monthlyAmount);
    const targetClubId = userClub.id;

    setTeams(prev => {
      const next = prev.map(t => {
        const isMatch = t.id === targetClubId || Boolean(t.isUserClub && (!targetClubId || t.id === targetClubId));
        if (!isMatch) return t;
        return {
          ...t,
          budget: t.budget + cashGain,
          wageBudgetMonthly: Math.max(0, currentWageBonus - monthlyAmount),
        };
      });
      flushLocalSaveImmediate({ teams: next });
      return next;
    });

    setClubEconomy(prev => ({
      ...prev,
      currentSeasonNetProfit: prev.currentSeasonNetProfit + cashGain,
    }));

    return {
      success: true,
      message: `تم استرداد ${cashGain.toLocaleString()} ج.م من فائض سقف الرواتب إلى الميزانية النقدية للنادي بنجاح!`,
    };
  };

  const promoteYouthProspect = (prospectId: string): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    }

    const currentProspects = Array.isArray(userClub.youthAcademyProspects)
      ? userClub.youthAcademyProspects
      : [];
    const prospect = currentProspects.find(p => p.id === prospectId);
    if (!prospect) {
      return { success: false, message: 'الموهبة غير مسجلة في الأكاديمية!' };
    }

    // Limit check: Maximum 3 youth promotions per season
    const promotedThisSeason = userClub.seasonPromotedYouthCount || 0;
    if (promotedThisSeason >= 3) {
      return {
        success: false,
        message: 'بلغت الحد الأقصى لتصعيد الناشئين لهذا الموسم (3 لاعبين فقط لكل موسم)! انتظر بداية الموسم القادم لتصعيد مواهب جديدة.',
      };
    }

    // Cost check: Half of the player's market valuation
    const promotionCost = Math.round(prospect.marketValuation * 0.5);
    if (userClub.budget < promotionCost) {
      return {
        success: false,
        message: `ميزانية النادي لا تكفي لرسوم توثيق وتصعيد اللاعب (${promotionCost.toLocaleString()} ج.م - نصف القيمة السوقية)!`,
      };
    }

    const squad = Array.isArray(userClub.players) ? userClub.players : [];
    if (squad.length >= 35) {
      return { success: false, message: 'قائمة الفريق الأول مكتملة (الحد الأقصى 35 لاعباً)! يرجى بيع أو إعارة أحد اللاعبين أولاً.' };
    }

    const newPlayer = promoteYouthProspectToSquad(prospect, userClub);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        budget: Math.max(0, t.budget - promotionCost),
        seasonPromotedYouthCount: (t.seasonPromotedYouthCount || 0) + 1,
        players: [newPlayer, ...(t.players || [])],
        youthAcademyProspects: (t.youthAcademyProspects || []).filter(p => p.id !== prospectId),
      };
    }));

    setClubEconomy(prev => ({
      ...prev,
      facilitySpendingTotal: prev.facilitySpendingTotal + promotionCost,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - promotionCost,
    }));

    lastUserInteractionRef.current = Date.now();

    setManager(prev => ({
      ...prev,
      totalPlayersDeveloped: (prev.totalPlayersDeveloped || 0) + 1,
    }));

    const promoMsg: InboxMessage = {
      id: `msg_youth_promote_${Date.now()}`,
      title: `تصعيد موهبة شابة: ${prospect.name} إلى الفريق الأول 🌟`,
      sender: 'مدير قطاع الناشئين',
      date: `الجولة ${currentRound}`,
      type: 'scout',
      read: false,
      content: `تم رسمياً تصعيد الجوهرة الشابة ${prospect.name} (${prospect.age} سنة - ${prospect.position}) إلى قائمة الفريق الأول ومنحه القميص رقم (${newPlayer.number}) بعقد احترافي يمتد لـ 3 مواسم وقدرة محتملة تصل إلى (${prospect.potentialRating} ⭐). تم دفع رسوم تسجيل وتصعيد ${promotionCost.toLocaleString()} ج.م (نصف القيمة السوقية). [المتبقي من كوتة التصعيد لهذا الموسم: ${2 - promotedThisSeason} لاعبين].`,
    };
    setInbox(prev => [promoMsg, ...prev]);

    return {
      success: true,
      message: `تم تصعيد ${prospect.name} (${prospect.position}) رسمياً للفريق الأول مقابل ${promotionCost.toLocaleString()} ج.م (تبقى لك ${2 - promotedThisSeason} تصعيد هذا الموسم)!`,
    };
  };

  const sellYouthProspect = (prospectId: string): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    }

    const currentProspects = Array.isArray(userClub.youthAcademyProspects)
      ? userClub.youthAcademyProspects
      : [];
    const prospect = currentProspects.find(p => p.id === prospectId);
    if (!prospect) {
      return { success: false, message: 'الموهبة غير مسجلة في الأكاديمية!' };
    }

    const saleAmount = prospect.marketValuation || 25000;

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        budget: t.budget + saleAmount,
        youthAcademyProspects: (t.youthAcademyProspects || []).filter(p => p.id !== prospectId),
      };
    }));

    setClubEconomy(prev => ({
      ...prev,
      transferIncomeTotal: prev.transferIncomeTotal + saleAmount,
      currentSeasonNetProfit: prev.currentSeasonNetProfit + saleAmount,
    }));

    const sellMsg: InboxMessage = {
      id: `msg_youth_sale_${Date.now()}`,
      title: `بيع حقوق الناشئ: ${prospect.name} 💰`,
      sender: 'إدارة الاستثمار والتسويق',
      date: `الجولة ${currentRound}`,
      type: 'transfer',
      read: false,
      content: `تم بيع حقوق رعاية اللاعب الشاب ${prospect.name} إلى أحد الأندية الاستثمارية مقابل ${saleAmount.toLocaleString()} ج.م وتم إيداع المبلغ كاملاً في خزينة النادي.`,
    };
    setInbox(prev => [sellMsg, ...prev]);

    return {
      success: true,
      message: `تم بيع حقوق ${prospect.name} بنجاح وإيداع ${saleAmount.toLocaleString()} ج.م في خزينة النادي!`,
    };
  };

  const scoutNewYouthBatch = (cost: number = 10000): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    }

    if (userClub.budget < cost) {
      return {
        success: false,
        message: `ميزانية النادي لا تكفي لرسوم تجارب الأداء والكشافة (${cost.toLocaleString()} ج.م)!`,
      };
    }

    const newProspects = generateYouthAcademyBatch(userClub, season.seasonNumber || 1);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      const existing = Array.isArray(t.youthAcademyProspects) ? t.youthAcademyProspects : [];
      // Keep up to 10 prospects in academy
      const combined = [...newProspects, ...existing].slice(0, 10);
      return {
        ...t,
        budget: Math.max(0, t.budget - cost),
        youthAcademyProspects: combined,
      };
    }));

    setClubEconomy(prev => ({
      ...prev,
      facilitySpendingTotal: prev.facilitySpendingTotal + cost,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - cost,
    }));

    const scoutMsg: InboxMessage = {
      id: `msg_scout_batch_${Date.now()}`,
      title: `انضمام دفعة مواهب جديدة للأكاديمية 🌟`,
      sender: 'كشافة قطاع الناشئين',
      date: `الجولة ${currentRound}`,
      type: 'scout',
      read: false,
      content: `أسفرت الاختبارات الميدانية للكشافة عن اكتشاف ${newProspects.length} مواهب صاعدة تم ضمهم لأكاديمية النادي، بإمكانك متابعة تطورهم وتصعيد أفضلهم للفريق الأول.`,
    };
    setInbox(prev => [scoutMsg, ...prev]);

    return {
      success: true,
      message: `تم إجراء الاختبارات وانضمام ${newProspects.length} مواهب شابة واعدة لقطاع الناشئين!`,
    };
  };

  // --- Sponsorship Contracts System (نظام عقود الرعاية ملغى بالكامل) ---
  const signSponsorshipContract = (_offer: SponsorshipOffer): { success: boolean; message: string } => {
    return { success: false, message: 'تم إلغاء نظام عقود الرعاية بالكامل من اللعبة.' };
  };

  const terminateSponsorshipContract = (_sponsorId: string): { success: boolean; message: string } => {
    return { success: false, message: 'تم إلغاء نظام عقود الرعاية بالكامل من اللعبة.' };
  };

  const renewSponsorshipContract = (_sponsorId: string): { success: boolean; message: string } => {
    return { success: false, message: 'تم إلغاء نظام عقود الرعاية بالكامل من اللعبة.' };
  };

  const negotiateSponsorshipOffer = (_offerId: string): { success: boolean; message: string } => {
    return { success: false, message: 'تم إلغاء نظام عقود الرعاية بالكامل من اللعبة.' };
  };

  const refreshSponsorshipOffers = () => {
    setAvailableSponsorOffers([]);
  };

  // Universal Sponsorship Cancellation & Budget Deduction Migration (guarded with ref + safeLocalStorage to prevent render loops)
  const sponsorshipMigrationGuardRef = useRef(false);
  useEffect(() => {
    if (sponsorshipMigrationGuardRef.current) return;
    try {
      const migrationKey = 'anta_el_modareb_sponsorship_deducted_v4';
      if (safeLocalStorageGet(migrationKey)) {
        sponsorshipMigrationGuardRef.current = true;
        return;
      }
      sponsorshipMigrationGuardRef.current = true;

      let totalDeductedForUser = 0;
      let anyChanged = false;

      const sanitizedTeams = teams.map(t => {
        const currentSponsors = Array.isArray(t.sponsors) ? t.sponsors : [];
        if (currentSponsors.length > 0) {
          anyChanged = true;
          const sponsorshipMoneyTaken = currentSponsors.reduce((sum: number, sp: any) => {
            const signing = sp?.signingBonus || 50000;
            const elapsed = Math.max(0, (sp?.totalDurationMonths || 12) - (sp?.contractMonthsRemaining ?? 12));
            const monthly = (sp?.monthlyPayment || 0) * elapsed;
            return sum + signing + monthly;
          }, 0);

          if (t.isUserClub || (userClub && t.id === userClub.id)) {
            totalDeductedForUser += sponsorshipMoneyTaken;
          }

          return {
            ...t,
            budget: Math.max(0, (t.budget || 0) - sponsorshipMoneyTaken),
            sponsors: [],
          };
        }
        return {
          ...t,
          sponsors: [],
        };
      });

      // Also check inbox if user had previous sponsor signed messages even if sponsors array was cleared
      if (userClub && totalDeductedForUser === 0 && Array.isArray(inbox)) {
        const sponsorSignedMsgs = inbox.filter(m => m && (m.id?.includes('msg_sponsor_signed') || m.title?.includes('عقد رعاية')));
        if (sponsorSignedMsgs.length > 0) {
          const bonusDeduction = sponsorSignedMsgs.length * 50000;
          totalDeductedForUser += bonusDeduction;
          anyChanged = true;
        }
      }

      if (anyChanged || totalDeductedForUser > 0) {
        let finalTeams = sanitizedTeams;
        if (totalDeductedForUser > 0 && userClub) {
          finalTeams = sanitizedTeams.map(t => {
            if (t.isUserClub || t.id === userClub.id) {
              return {
                ...t,
                budget: Math.max(0, (t.budget || 0) - (t.sponsors?.length ? 0 : totalDeductedForUser)),
                sponsors: [],
              };
            }
            return t;
          });
        }
        setTeams(finalTeams);

        if (totalDeductedForUser > 0) {
          const deductionMsg: InboxMessage = {
            id: `msg_sponsor_deduction_${Date.now()}`,
            title: `📋 قرار رسمي: إلغاء نظام الرعاية واسترداد المبالغ (-${totalDeductedForUser.toLocaleString()} ج.م)`,
            sender: 'اللجنة المالية واتحاد الكرة',
            date: `الجولة ${currentRound}`,
            type: 'board',
            read: false,
            content: `بناءً على التحديثات التنظيمية والقرارات الأخيرة، تم إلغاء نظام عقود الرعاية بالكامل من المسابقات. وبناءً عليه تم استرداد وخصم كافة المبالغ ومكافآت التوقيع التي حصل عليها النادي سابقاً من الرعاة بقيمة (-${totalDeductedForUser.toLocaleString()} ج.م) من ميزانية النادي.`,
          };
          setInbox(prev => [deductionMsg, ...prev]);
        }
      }

      safeLocalStorageSet(migrationKey, 'true');
      safeLocalStorageRemove(`${STORAGE_KEY}_sponsorOffers`);
    } catch (e) {
      console.warn('Error in sponsorship cancellation migration:', e);
    }
  }, [teams, userClub?.id]);

  // --- Player Development & Rewards System (تطوير اللاعبين بنقاط المكافآت) ---
  const currentDevPoints = userClub?.developmentPoints ?? manager?.developmentPoints ?? 0;

  const upgradePlayerAttribute = (playerId: string, attribute: keyof PlayerAttributes): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    const player = (userClub.players || []).find(p => p.id === playerId);
    if (!player) return { success: false, message: 'اللاعب غير موجود في قائمة فريقك!' };

    const curPoints = userClub.developmentPoints ?? manager.developmentPoints ?? 0;
    const res = applyAttributeUpgrade(player, attribute, curPoints);
    if (!res.success) return { success: false, message: res.message };

    const remaining = Math.max(0, curPoints - res.cost);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        developmentPoints: remaining,
        players: (t.players || []).map(p => p.id === playerId ? res.updatedPlayer : p),
      };
    }));

    lastUserInteractionRef.current = Date.now();

    setManager(prev => ({
      ...prev,
      developmentPoints: remaining,
      totalPlayersDeveloped: (prev.totalPlayersDeveloped || 0) + 1,
    }));

    try {
      challengesManager.recordPlayerUpgraded();
    } catch (_) {}

    return { success: true, message: res.message };
  };

  const boostPlayerOverall = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    const player = (userClub.players || []).find(p => p.id === playerId);
    if (!player) return { success: false, message: 'اللاعب غير موجود في قائمة فريقك!' };

    const curPoints = userClub.developmentPoints ?? manager.developmentPoints ?? 0;
    const res = applyOverallBoost(player, curPoints);
    if (!res.success) return { success: false, message: res.message };

    const remaining = Math.max(0, curPoints - res.cost);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        developmentPoints: remaining,
        players: (t.players || []).map(p => p.id === playerId ? res.updatedPlayer : p),
      };
    }));

    lastUserInteractionRef.current = Date.now();

    setManager(prev => ({
      ...prev,
      developmentPoints: remaining,
      totalPlayersDeveloped: (prev.totalPlayersDeveloped || 0) + 1,
    }));

    return { success: true, message: res.message };
  };

  const boostPlayerPotential = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    const player = (userClub.players || []).find(p => p.id === playerId);
    if (!player) return { success: false, message: 'اللاعب غير موجود في قائمة فريقك!' };

    const curPoints = userClub.developmentPoints ?? manager.developmentPoints ?? 0;
    const res = applyPotentialBoost(player, curPoints);
    if (!res.success) return { success: false, message: res.message };

    const remaining = Math.max(0, curPoints - res.cost);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        developmentPoints: remaining,
        players: (t.players || []).map(p => p.id === playerId ? res.updatedPlayer : p),
      };
    }));

    lastUserInteractionRef.current = Date.now();

    setManager(prev => ({
      ...prev,
      developmentPoints: remaining,
      totalPlayersDeveloped: (prev.totalPlayersDeveloped || 0) + 1,
    }));

    return { success: true, message: res.message };
  };

  const boostPlayerCondition = (playerId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };
    const player = (userClub.players || []).find(p => p.id === playerId);
    if (!player) return { success: false, message: 'اللاعب غير موجود في قائمة فريقك!' };

    const curPoints = userClub.developmentPoints ?? manager.developmentPoints ?? 0;
    const res = applyConditionRecovery(player, curPoints);
    if (!res.success) return { success: false, message: res.message };

    const remaining = Math.max(0, curPoints - res.cost);

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && t.id !== userClub.id) return t;
      return {
        ...t,
        developmentPoints: remaining,
        players: (t.players || []).map(p => p.id === playerId ? res.updatedPlayer : p),
      };
    }));

    setManager(prev => ({
      ...prev,
      developmentPoints: remaining,
    }));

    return { success: true, message: res.message };
  };

  const grantDevelopmentPoints = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub && (userClub ? t.id !== userClub.id : true)) return t;
      return {
        ...t,
        developmentPoints: (t.developmentPoints || 0) + amount,
      };
    }));

    setManager(prev => ({
      ...prev,
      developmentPoints: (prev.developmentPoints || 0) + amount,
    }));
  };

  const markMessageRead = (messageId: string) => {
    setInbox(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
  };

  const deleteMessage = (messageId: string) => {
    setInbox(prev => prev.filter(m => m.id !== messageId));

    setDeletedMessageIds(prev => {
      if (prev.includes(messageId)) return prev;
      return [...prev, messageId].slice(-200);
    });
  };

  const clearAllMessages = () => {
    const allIds = (inbox || []).map(m => m.id);
    setDeletedMessageIds(deletedPrev =>
      Array.from(new Set([...deletedPrev, ...allIds])).slice(-200)
    );
    setInbox([]);
  };

  const markAllMessagesRead = () => {
    setInbox(prev => prev.map(m => ({ ...m, read: true })));
  };

  // ----------------------------------------------------
  // MULTI-SEASON TRANSITIONS, CAREER & RESIGNATION ENGINE
  // ----------------------------------------------------

  const selectNextSeasonLeague = (leagueId: string): JobOffer[] => {
    const targetLeague = getLeagueById(leagueId);
    if (!targetLeague) return [];
    const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
    const leagueOffers = generateJobOffersForLeague(manager, targetLeague, summaryClub);
    setJobOffers(leagueOffers);
    return leagueOffers;
  };

  const acceptJobOffer = (offerId: string) => {
    setJobOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'accepted' } : { ...o, status: 'rejected' }));
  };

  const rejectJobOffer = (offerId: string) => {
    setJobOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o));
  };

  const openSeasonModal = () => {
    // When user explicitly requests to review the season end, open the modal and ensure summary is ready
    if (season.status !== 'completed') {
      setSeason(prev => ({ ...prev, status: 'completed' }));
    }

    try {
      const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
      let activeMgr = manager;
      const summary = calculateSeasonEndSummary(
        { ...season, status: 'completed', totalRounds },
        standings,
        summaryClub,
        activeLeague,
        cupTournament,
        activeMgr,
        africanChampionsLeague
      );
      if (activeMgr.lastSettledSeasonNumber !== season.seasonNumber) {
        const endOfSeasonManagerBonus = calculateManagerSeasonBonus(summary, activeMgr);
        const settlementRes = settleEndOfSeasonLicenseAndBonus(activeMgr, endOfSeasonManagerBonus, season.seasonNumber);
        activeMgr = settlementRes.updatedManager;
        summary.licenseSettlement = settlementRes.settlement;
        setManager(activeMgr);
      } else if (seasonEndSummary?.licenseSettlement) {
        summary.licenseSettlement = seasonEndSummary.licenseSettlement;
      }
      setSeasonEndSummary(summary);
      if (summaryClub && summary.trophiesWonList && summary.trophiesWonList.length > 0) {
        runWhenIdle(() => {
        loadWorldStateFromDb().then(ws => {
          if (ws) {
            const formattedTrophies = summary.trophiesWonList!.map(t => ({
              name: t,
              season: season.seasonNumber,
              year: `الموسم ${season.seasonNumber}`,
            }));
            const updatedWs = recordClubTrophiesInWorld(ws, summaryClub.id, formattedTrophies);
            saveWorldStateToDb(updatedWs);
          }
        }).catch(() => {});
        });
      }
      if (!jobOffers || jobOffers.length === 0) {
        setJobOffers(generateSeasonJobOffers(activeMgr, summaryClub, activeLeague, summary.finalPosition));
      }
      setShowSeasonTransitionModal(true);
    } catch (err) {
      console.error('Failed to calculate season end summary, using safe fallback:', err);
      const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
      const fallbackPos = (standings.findIndex(s => s.teamId === summaryClub?.id) + 1) || 1;
      const fallbackStanding = standings.find(s => s.teamId === summaryClub?.id) || standings[0];
      const userWonCup = !!(cupTournament && summaryClub && (
        cupTournament.winnerClubId === summaryClub.id ||
        (cupTournament.matches || []).some(m => m.stage === 'final' && m.isPlayed && (
          m.winnerTeamId === summaryClub.id ||
          (m.homeTeamId === summaryClub.id && (m.homeScore || 0) > (m.awayScore || 0)) ||
          (m.awayTeamId === summaryClub.id && (m.awayScore || 0) > (m.homeScore || 0))
        ))
      ));
      const fallbackCupTrophy = userWonCup ? (cupTournament?.trophyName || cupTournament?.name || 'كأس مصر') : undefined;
      const fallbackCupText = userWonCup
        ? `🏆 بطل ${fallbackCupTrophy}!`
        : (cupTournament?.userEliminatedStage ? `ودع البطولة من ${cupTournament.userEliminatedStage}` : 'لم يشارك في الأدوار المتقدمة للكأس');

      const safeSummary: SeasonEndSummary = {
        seasonNumber: season.seasonNumber,
        leagueId: activeLeague.id,
        leagueName: activeLeague.name,
        divisionTier: activeLeague.tier,
        clubId: summaryClub?.id || 'unknown',
        clubName: summaryClub?.name || 'فريقك',
        finalPosition: fallbackPos,
        totalTeams: standings.length || 20,
        resultStatus: fallbackPos === 1 ? 'champion' : (fallbackPos <= (activeLeague.promotionSpots || 2) && activeLeague.tier > 1 ? 'promoted' : 'stayed'),
        resultTitle: fallbackPos === 1 ? '🏆 بطل الدوري!' : `المركز ${fallbackPos}`,
        resultDescription: `أنهيت الموسم في المركز ${fallbackPos} في ${activeLeague.name}.`,
        played: fallbackStanding?.played || totalRounds,
        wins: fallbackStanding?.won || 0,
        draws: fallbackStanding?.drawn || 0,
        losses: fallbackStanding?.lost || 0,
        goalsFor: fallbackStanding?.goalsFor || 0,
        goalsAgainst: fallbackStanding?.goalsAgainst || 0,
        goalDifference: fallbackStanding?.goalDifference || 0,
        points: fallbackStanding?.points || 0,
        prizeMoney: 100000 + (userWonCup ? (cupTournament?.prizeMoneyWinner || 150000) : 0),
        ticketRevenueTotal: 100000,
        sponsorshipTotal: 50000,
        xpEarned: 250 + (userWonCup ? 250 : 0),
        reputationChange: 2 + (userWonCup ? 5 : 0),
        finalBudget: (summaryClub?.budget || 100000) + 150000,
        nextLeagueName: activeLeague.name,
        nextDivisionTier: fallbackPos === 1 && activeLeague.tier > 1 ? activeLeague.tier - 1 : activeLeague.tier,
        cupTrophyAwarded: fallbackCupTrophy,
        cupResultText: fallbackCupText,
      };
      setSeasonEndSummary(safeSummary);
      if (!jobOffers || jobOffers.length === 0) {
        setJobOffers(generateSeasonJobOffers(manager, summaryClub, activeLeague, safeSummary.finalPosition));
      }
      setShowSeasonTransitionModal(true);
    }
  };

  const closeSeasonModal = () => {
    setShowSeasonTransitionModal(false);
  };

  const resignToUnemployed = () => {
    // Resignation is disabled for system stability
    setShowSeasonTransitionModal(false);
  };

  const takeOverClub = (offerId: string): { success: boolean; message: string } => {
    const offer = jobOffers.find(o => o.id === offerId);
    if (!offer) {
      return { success: false, message: 'العرض التدريبي غير متاح حالياً.' };
    }

    // 1. Preserve former club and its squad in the persistent universe before leaving
    if (activeLeague?.id && Array.isArray(teams) && teams.length > 0) {
      try {
        const cleanedPrevTeams = teams.map(t => ({
          ...t,
          isUserClub: false,
        }));
        updateLeagueRosterInWorld(activeLeague.id, cleanedPrevTeams);
      } catch (saveOldErr) {
        console.warn('[TakeOverClub] Notice preserving former club in universe:', saveOldErr);
      }
    }

    // Check if club exists in current league
    const clubInCurrentLeague = teams.find(t => t.id === offer.clubId);
    let appointedTeams: Club[] = [];
    let appointedLeague = activeLeague;

    if (clubInCurrentLeague) {
      const appointed = appointManagerToClub(manager, teams, offer.clubId, offer.clubName);
      setManager(appointed.manager);
      appointedTeams = appointed.teams;
      setTeams(appointed.teams);
      updateLeagueRosterInWorld(activeLeague.id, appointed.teams);
    } else {
      const targetLeague = getLeagueById(offer.leagueId);
      if (targetLeague) {
        appointedLeague = targetLeague;
        setActiveLeague(targetLeague);
        const leagueTeams = (targetLeague.teams || []).map(t => normalizeClub(t));
        const appointed = appointManagerToClub(manager, leagueTeams, offer.clubId, offer.clubName);
        setManager(appointed.manager);
        appointedTeams = appointed.teams;
        setTeams(appointed.teams);
        updateLeagueRosterInWorld(targetLeague.id, appointed.teams);
        setStandings(generateInitialStandings(appointed.teams));
        const userClubObj = appointed.teams.find(t => t.isUserClub);
        setCupTournament(null);
        const newAgenda = generateMasterSeasonAgenda(season.seasonNumber || 1, targetLeague, appointed.teams, undefined, undefined, userClubObj);
        setFixtures(newAgenda);
        const maxR = newAgenda.length > 0 ? Math.max(...newAgenda.map(f => f.round)) : 34;
        setSeason(prev => ({ ...prev, totalRounds: maxR, leagueId: targetLeague.id, leagueName: targetLeague.name, divisionTier: targetLeague.tier }));
      }
    }

    // Reset club economy for the new club so old club's transactions don't leak
    setClubEconomy({
      clubBudget: appointedTeams.find(t => t.isUserClub)?.budget || offer.transferBudget || 250000,
      transferSpendingTotal: 0,
      transferIncomeTotal: 0,
      salaryExpensesTotal: 0,
      sponsorIncomeTotal: 0,
      matchIncomeTotal: 0,
      facilitySpendingTotal: 0,
      currentSeasonNetProfit: 0,
    });

    const newClubObj = appointedTeams.find(t => t.isUserClub);
    if (newClubObj) {
      setBoardSystem(generateInitialBoardSystem(newClubObj, appointedLeague.tier, appointedTeams.length, appointedTeams, false));
    }

    setJobOffers(prev => prev.filter(o => o.id !== offerId));
    setLiveMatch(null);

    const joinMsg: InboxMessage = {
      id: `msg_join_club_${Date.now()}`,
      title: `تولي تدريب ${offer.clubName} رسمياً! ✍️`,
      sender: `مجلس إدارة ${offer.clubName}`,
      date: `الجولة ${currentRound}`,
      type: 'board',
      read: false,
      content: `مرحباً بك يا كابتن! نثق في خبرتك التدريبية لإعادة ترتيب صفوف الفريق وتحقيق الأهداف المحددة والمنافسة على الألقاب. ميزانية التعاقدات المرصودة: ${(offer.transferBudget || newClubObj?.budget || 200000).toLocaleString()} ج.م.`,
    };

    // Purge old team's player contract renewal and transfer offer messages
    const newClubPlayerIds = new Set((newClubObj?.players || []).map(p => p.id));
    setInbox(prev => {
      const filtered = prev.filter(m => {
        if (m.type === 'contract' && m.contractDetails?.playerId) {
          return newClubPlayerIds.has(m.contractDetails.playerId);
        }
        if (m.type === 'offer' && m.offerDetails?.playerId) {
          return newClubPlayerIds.has(m.offerDetails.playerId);
        }
        return true;
      });
      return [joinMsg, ...filtered];
    });

    return { success: true, message: `توليت رسمياً تدريب نادي ${offer.clubName}!` };
  };

  const startNextSeason = (chosenOfferId?: string) => {
    try {
      const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
      const summary = seasonEndSummary || calculateSeasonEndSummary(
        { ...season, status: 'completed', totalRounds },
        standings,
        summaryClub,
        activeLeague,
        cupTournament,
        manager,
        africanChampionsLeague
      );

      const safeJobOffers = Array.isArray(jobOffers) ? jobOffers : [];
      const acceptedOffer = chosenOfferId 
        ? safeJobOffers.find(o => o.id === chosenOfferId)
        : safeJobOffers.find(o => o.status === 'accepted');

      const result = timed('processNewSeasonAdvancement', () => processNewSeasonAdvancement(
        season,
        summary,
        summaryClub,
        manager,
        teams,
        acceptedOffer
      ));

      const overriddenNextTeams = applyWorldOverridesToClubs(result.nextTeams);
      const targetUserClubId = result.updatedManager.currentClubId;
      const baseNextTeams = overriddenNextTeams.map(t => {
        if (t.id === targetUserClubId) {
          return { ...t, isUserClub: true };
        }
        return { ...t, isUserClub: false };
      });

      // 1. Process Free Agents (contractYears === 0) & AI Club Transfers for the new season
      const freeAgencyAndAiResult = timed('startNextSeason.processFreeAgentsAndAiTransfers', () => processFreeAgentsAndAiTransfers(
        baseNextTeams,
        transferMarket,
        result.nextSeason.seasonNumber,
        1,
        targetUserClubId
      ));
      // Season-long course access ends with the season: if the coach's formation / style is no longer open
      // (course expired or license dropped) switch to a safe one and re-pick the lineup for it.
      const finalNextTeams = freeAgencyAndAiResult.updatedTeams.map(t => {
        if (!t.isUserClub || !t.tactics) return t;
        try {
          const fix = sanitizeTacticsForManager(t.tactics, result.updatedManager, result.nextSeason.seasonNumber);
          if (!fix.formationChanged && !fix.styleChanged) return t;
          let nt = { ...t, tactics: fix.tactics };
          if (fix.formationChanged) {
            const best = pickBestLineupForFormation(nt, fix.tactics.formation);
            nt = { ...nt, tactics: { ...nt.tactics, startingPlayerIds: best.startingIds, benchPlayerIds: best.benchIds } };
          }
          return nt;
        } catch (_) {
          return t;
        }
      });
      const updatedMarketAfterWindow = freeAgencyAndAiResult.updatedTransferMarket;
      const nextTransferHistory = [
        ...freeAgencyAndAiResult.newTransferHistory,
        ...transferHistory,
      ].slice(0, 250);

      setTransferMarket(updatedMarketAfterWindow);
      setTransferHistory(nextTransferHistory);

      const nextUserClubObj =
        finalNextTeams.find(t => t.id === targetUserClubId) ||
        finalNextTeams.find(t => t.isUserClub) ||
        finalNextTeams[0];

      setAfricanChampionsLeague(null);

      // Build unified Master Schedule (League Only) cleanly from scratch
      const nextFixturesWithContinental = timed('startNextSeason.generateMasterSeasonAgenda', () => generateMasterSeasonAgenda(
        result.nextSeason.seasonNumber,
        result.nextActiveLeague,
        finalNextTeams,
        null,
        null,
        nextUserClubObj
      ));

      // 3. Archive finished season history locally
      let updatedSeasonArchives: any[] = [];
      try {
        const rawArchives = localStorage.getItem(`${STORAGE_KEY}_season_archives`);
        const existingArchives = rawArchives ? JSON.parse(rawArchives) : [];

        const finishedArchiveEntry = {
          seasonNumber: season.seasonNumber,
          leagueId: activeLeague.id,
          leagueName: activeLeague.name,
          championTeamId: standings[0]?.teamId || '',
          championTeamName: standings[0]?.teamName || '',
          runnerUpTeamId: standings[1]?.teamId || '',
          runnerUpTeamName: standings[1]?.teamName || '',
          standingsSnapshot: standings.slice(0, 20),
          completedAt: Date.now(),
        };
        updatedSeasonArchives = [
          finishedArchiveEntry,
          ...(Array.isArray(existingArchives) ? existingArchives.filter((a: any) => a.seasonNumber !== season.seasonNumber) : []),
        ].slice(0, 25);
        localStorage.setItem(`${STORAGE_KEY}_season_archives`, JSON.stringify(updatedSeasonArchives));
      } catch (_) {}

      setSeason(result.nextSeason);
      setActiveLeague(result.nextActiveLeague);
      setTeams(finalNextTeams);
      setStandings(result.nextStandings);
      setFixtures(nextFixturesWithContinental);
      setManager(result.updatedManager);
      setCupTournament(null);
      setCurrentRound(1);
      setSeasonEndSummary(null);
      setJobOffers([]);
      setShowSeasonTransitionModal(false);
      setLiveMatch(null);

      // If manager switched clubs, reset economy to pristine state for the new club
      let initialEconomy = clubEconomy;
      if (acceptedOffer) {
        initialEconomy = {
          clubBudget: acceptedOffer.clubBudget || 250000,
          transferSpendingTotal: 0,
          transferIncomeTotal: 0,
          salaryExpensesTotal: 0,
          sponsorIncomeTotal: 0,
          matchIncomeTotal: 0,
          facilitySpendingTotal: 0,
          currentSeasonNetProfit: 0,
        };
        setClubEconomy(initialEconomy);
      }

      const newSeasonInitialDate = getInitialSeasonDate(result.nextSeason.seasonNumber);
      setCalendarDate(newSeasonInitialDate);

      let initialBoard = boardSystem;
      if (nextUserClubObj) {
        initialBoard = generateInitialBoardSystem(nextUserClubObj, result.nextActiveLeague.tier, finalNextTeams.length, finalNextTeams, nextUserClubObj.isNewlyPromoted);
        setBoardSystem(initialBoard);
      }

      const startMsg: InboxMessage = {
        id: `msg_new_season_${result.nextSeason.seasonNumber}_${Date.now()}`,
        title: `انطلاق الموسم الجديد ${result.nextSeason.seasonNumber} في ${result.nextActiveLeague.name}! 🚀`,
        sender: 'رابطة الأندية المحترفة',
        date: 'الجولة الأولى',
        type: 'news',
        read: false,
        content: `أهلاً بك في الموسم ${result.nextSeason.seasonNumber} ضمن منافسات ${result.nextActiveLeague.name}. تم إعداد جدول مباريات الدوري للموسم الجديد وجاهزية الفريق بنسبة 100%.`,
      };

      const nextClubPlayerIds = new Set((nextUserClubObj?.players || []).map(p => p.id));
      const filteredInbox = inbox.filter(m => {
        if (m.type === 'contract' && m.contractDetails?.playerId) {
          return nextClubPlayerIds.has(m.contractDetails.playerId);
        }
        if (m.type === 'offer' && m.offerDetails?.playerId) {
          return nextClubPlayerIds.has(m.offerDetails.playerId);
        }
        return true;
      });
      const newInbox = [
        startMsg,
        ...(freeAgencyAndAiResult.inboxNotifications || []),
        ...filteredInbox,
      ];
      setInbox(newInbox);

      // العالم الثابت (باقي الدوريات): كبر سن + اعتزال + جيل جديد، ويُحفظ كعدّاد مواسم يُعاد تشغيله عند التحميل
      try {
        const nextEra = (worldRankings?.worldEra || 0) + 1;
        const eraReport = advanceWorldEra(nextEra);
        setWorldRankings(prev => ({ ...prev, worldEra: nextEra, worldMoves: pruneWorldMoves(prev?.worldMoves, teams, season?.seasonNumber || nextEra) }));
        const eraDate = calendarDate?.rawDateStr || new Date().toISOString().slice(0, 10);
        const eraNews: DailyNewsItem[] = eraReport.retiredStars.slice(0, 4).map((r, i) => ({
          id: `era_ret_${nextEra}_${i}`,
          dateStr: eraDate,
          title: `اعتزال ${r.name} (${r.age} عاماً) رسمياً`,
          content: `أعلن ${r.name} نجم ${r.clubName} اعتزال كرة القدم بعد مسيرة حافلة، وكان تصنيفه ${r.rating}.`,
          category: 'milestone',
          importance: 'medium',
          icon: '🏅',
          source: 'عالم الكرة',
        } as DailyNewsItem));
        if (eraNews.length > 0) setDailyNews(prev => [...eraNews, ...(prev || [])].slice(0, 40));
      } catch (e) {
        console.warn('[worldEra] failed', e);
      }

      let nextRetired = retiredPlayers;
      if (Array.isArray(result.newRetiredPlayers) && result.newRetiredPlayers.length > 0) {
        nextRetired = [...result.newRetiredPlayers, ...retiredPlayers].slice(0, 150);
        setRetiredPlayers(nextRetired);
        const userClubRetired = result.newRetiredPlayers.filter(rp => rp.clubId === nextUserClubObj?.id || rp.clubName === nextUserClubObj?.name);
        if (userClubRetired.length > 0) {
          const retireMsg: InboxMessage = {
            id: `msg_retire_${Date.now()}`,
            title: `تكريم ووداع: اعتزال ${userClubRetired.length} من نجوم الفريق رسمياً 🏅`,
            sender: 'إدارة النادي وجماهيره',
            date: 'بداية الموسم',
            type: 'news',
            read: false,
            content: `أعلن النادي رسمياً اعتزال اللاعبين المخضرمين: ${userClubRetired.map(p => `${p.name} (${p.age} عاماً)`).join('، ')}. تم توجيه الشكر لهم على عطائهم وإخلاصهم طوال مسيرتهم الكروية الحافلة.`,
          };
          setInbox(prev => [retireMsg, ...prev]);
        }
      }

      // Immediately synchronize and save state to disk/storage
      try {
        gameStateRepository.saveLocalGameState({
          schemaVersion: 2,
          saveVersion: 1,
          lastLocalSaveAt: Date.now(),
          season: result.nextSeason,
          activeLeague: result.nextActiveLeague,
          teams: finalNextTeams,
          standings: result.nextStandings,
          fixtures: nextFixturesWithContinental,
          currentRound: 1,
          manager: result.updatedManager,
          transferMarket: updatedMarketAfterWindow,
          incomingBids: [],
          inbox: newInbox,
          cupTournament: null,
          africanChampionsLeague: null,
          seasonArchives: updatedSeasonArchives,
          jobOffers: [],
          seasonEndSummary: null,
          transferHistory: nextTransferHistory,
          clubEconomy: initialEconomy,
          calendarDate: newSeasonInitialDate,
          activeNegotiations: [],
          boardSystem: initialBoard,
          dailyNews: [],
          retiredPlayers: nextRetired,
          worldRankings,
          deletedMessageIds,
        } as any);

        // Save initial snapshot for this new season to allow clean restart (IndexedDB + memory cache, never localStorage)
        gameStateRepository.saveSeasonSnapshot(result.nextSeason.seasonNumber, {
          teams: finalNextTeams,
          clubBudget: nextUserClubObj?.budget || 250000,
          manager: result.updatedManager,
          calendarDate: newSeasonInitialDate,
          activeLeagueId: result.nextActiveLeague.id,
          seasonNumber: result.nextSeason.seasonNumber,
        });
      } catch (saveErr) {
        console.warn('Immediate save on season transition:', saveErr);
      }
    } catch (err) {
      console.error('Error starting next season:', err);
      // Failsafe recovery: bump season number, reset round and regenerate fresh fixtures and standings so game never locks
      const safeNextSeasonNum = season.seasonNumber + 1;
      const safeJobOffers = Array.isArray(jobOffers) ? jobOffers : [];
      const acceptedOffer = chosenOfferId 
        ? safeJobOffers.find(o => o.id === chosenOfferId)
        : safeJobOffers.find(o => o.status === 'accepted');

      const safeNextLeague = acceptedOffer ? getLeagueById(acceptedOffer.leagueId) : activeLeague;
      let safeTeams = acceptedOffer && Array.isArray(safeNextLeague.teams) && safeNextLeague.teams.length > 0 
        ? [...safeNextLeague.teams] 
        : teams;

      const targetClubId = acceptedOffer ? acceptedOffer.clubId : (userClub?.id || teams[0]?.id);
      safeTeams = safeTeams.map(t => {
        const isTarget = t.id === targetClubId || (acceptedOffer && t.name === acceptedOffer.clubName);
        return {
          ...t,
          isUserClub: isTarget,
          players: (t.players || []).map(p => ({
            ...p,
            age: p.age + 1,
            fitness: 100,
            morale: Math.max(70, p.morale),
          }))
        };
      });

      const safeUserClub = safeTeams.find(t => t.isUserClub) || safeTeams[0];
      const safeStandings = generateInitialStandings(safeTeams);
      const safeFixtures = generateMasterSeasonAgenda(safeNextSeasonNum, safeNextLeague, safeTeams, undefined, undefined, safeUserClub);

      const safeManager: ManagerProfile = acceptedOffer ? {
        ...manager,
        currentClubId: safeUserClub.id,
        currentClubName: safeUserClub.name,
        totalSeasons: manager.totalSeasons + 1,
      } : {
        ...manager,
        totalSeasons: manager.totalSeasons + 1,
      };

      setSeason({
        seasonId: `season_${safeNextSeasonNum}_${Date.now()}`,
        seasonNumber: safeNextSeasonNum,
        startDate: `الموسم ${safeNextSeasonNum}`,
        endDate: `نهاية الموسم ${safeNextSeasonNum}`,
        currentRound: 1,
        totalRounds: safeFixtures.length > 0 ? Math.max(...safeFixtures.map(f => f.round)) : 34,
        status: 'active',
        leagueId: safeNextLeague.id,
        leagueName: safeNextLeague.name,
        divisionTier: safeNextLeague.tier,
      });
      setActiveLeague(safeNextLeague);
      setTeams(safeTeams);
      setStandings(safeStandings);
      setFixtures(safeFixtures);
      setManager(safeManager);
      setCupTournament(null);
      setCurrentRound(1);
      setShowSeasonTransitionModal(false);
      setSeasonEndSummary(null);
      setJobOffers([]);
    }
  };

  /**
   * Restart Current Season:
   * Returns manager to round 1 of the current season, cancels all match results,
   * reverts player transfers/contracts made this season, restores the beginning budget,
   * resets player fitness to 100%, and synchronizes all agenda/standings/events.
   */
  const restartCurrentSeason = (): { success: boolean; message: string } => {
    try {
      if (!userClub) {
        return { success: false, message: 'لا يوجد نادٍ نشط حالياً لإعادة بدء موسمه.' };
      }

      const currentSeasonNum = season.seasonNumber || 1;
      const snapshotKey = `${STORAGE_KEY}_season_${currentSeasonNum}_snapshot`;
      let savedSnapshot: any = null;
      try {
        savedSnapshot = gameStateRepository.getSeasonSnapshotSync(currentSeasonNum);
        if (!savedSnapshot) {
          const raw = localStorage.getItem(snapshotKey);
          if (raw) savedSnapshot = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('[RestartSeason] Error reading season snapshot:', e);
      }

      let restoredTeams: Club[] = [];
      let restoredBudget: number = 0;
      const thisSeasonTransfers = (transferHistory || []).filter(t => t && t.seasonNumber === currentSeasonNum);
      const boughtPlayerIds = new Set(thisSeasonTransfers.filter(t => t.type === 'buy').map(t => t.playerId));
      const soldEntries = thisSeasonTransfers.filter(t => t.type === 'sell');

      // 1. Restore Pristine Teams & Squads
      if (savedSnapshot && Array.isArray(savedSnapshot.teams) && savedSnapshot.teams.length > 0) {
        console.log(`[RestartSeason] Restoring pristine teams from season ${currentSeasonNum} snapshot.`);
        restoredTeams = savedSnapshot.teams.map(normalizeClub);
        restoredBudget = typeof savedSnapshot.clubBudget === 'number' && savedSnapshot.clubBudget > 0
          ? savedSnapshot.clubBudget
          : (userClub.budget || 100000);
      } else {
        console.log(`[RestartSeason] No stored snapshot found. Programmatically reverting season ${currentSeasonNum} changes.`);

        // Beginning budget calculation: cancel all income made this uncompleted season and refund spending
        const spentTransfers = clubEconomy?.transferSpendingTotal || 0;
        const spentFacilities = clubEconomy?.facilitySpendingTotal || 0;
        const incomeTransfers = clubEconomy?.transferIncomeTotal || 0;
        const incomeMatches = clubEconomy?.matchIncomeTotal || 0;
        const incomeSponsors = clubEconomy?.sponsorIncomeTotal || 0;

        const baselineBudget = (userClub.budget || 100000)
          + spentTransfers
          + spentFacilities
          - incomeTransfers
          - incomeMatches
          - incomeSponsors;

        restoredBudget = Math.max(50000, baselineBudget);

        restoredTeams = teams.map(team => {
          let updatedPlayers = [...(team.players || [])];

          if (team.isUserClub || team.id === userClub.id) {
            // Remove players bought this season
            if (boughtPlayerIds.size > 0) {
              updatedPlayers = updatedPlayers.filter(p => !boughtPlayerIds.has(p.id));
            }

            // Restore players sold this season if not already present
            for (const sold of soldEntries) {
              if (!updatedPlayers.some(p => p.id === sold.playerId)) {
                let originalPlayer: Player | undefined;
                for (const otherTeam of teams) {
                  const found = (otherTeam.players || []).find(p => p.id === sold.playerId);
                  if (found) {
                    originalPlayer = found;
                    break;
                  }
                }
                if (!originalPlayer) {
                  originalPlayer = (transferMarket || []).find(p => p.id === sold.playerId);
                }
                if (!originalPlayer) {
                  const pos = sold.position || 'CM';
                  const posCat: PositionCategory = pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos) ? 'DEF' : ['ST', 'CF', 'RW', 'LW'].includes(pos) ? 'FWD' : 'MID';
                  const baseRat = sold.playerRating || 70;
                  originalPlayer = {
                    id: sold.playerId,
                    name: sold.playerName,
                    overallRating: baseRat,
                    potentialRating: Math.min(99, baseRat + 3),
                    position: pos,
                    positionCategory: posCat,
                    attributes: {
                      pace: baseRat,
                      shooting: baseRat,
                      passing: baseRat,
                      dribbling: baseRat,
                      defending: baseRat,
                      physical: baseRat,
                    },
                    age: 24,
                    fitness: 100,
                    morale: 85,
                    salary: sold.salary || 2500,
                    marketValue: sold.fee || 50000,
                    contractYears: 2,
                    form: 7,
                    number: Math.floor(Math.random() * 98) + 1,
                    stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 6.5 },
                  };
                }
                updatedPlayers.push(originalPlayer);
              }
            }
          }

          // Reset all players in team: full fitness 100%, morale 85, form 7, clear injuries/suspensions/cards, reset season stats to 0
          const pristinePlayers = updatedPlayers.map(p => ({
            ...p,
            fitness: 100,
            morale: 85,
            form: 7,
            isInjured: false,
            injury: null,
            injuryType: undefined,
            isSuspended: false,
            suspensionMatches: 0,
            suspensionReason: undefined,
            isListedForTransfer: false,
            stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 6.5 },
          }));

          const isUser = Boolean(team.isUserClub || team.id === userClub.id);
          return {
            ...team,
            isUserClub: isUser,
            budget: isUser ? restoredBudget : team.budget,
            players: pristinePlayers,
          };
        });

        // Save this pristine baseline as season snapshot for subsequent restarts
        gameStateRepository.saveSeasonSnapshot(currentSeasonNum, {
          teams: restoredTeams,
          clubBudget: restoredBudget,
          manager: {
            ...manager,
            matchesManaged: manager.matchesManaged,
            wins: manager.wins,
            draws: manager.draws,
            losses: manager.losses,
          },
          activeLeagueId: activeLeague.id,
          seasonNumber: currentSeasonNum,
        });
      }

      // 2. Restore Transfer Market
      let restoredMarket: Player[] = Array.isArray(savedSnapshot?.transferMarket) && savedSnapshot.transferMarket.length > 0
        ? savedSnapshot.transferMarket
        : [...(transferMarket || [])];

      // Return players bought this season back to the market if they were free agents/market signings
      if (boughtPlayerIds.size > 0) {
        for (const bpId of boughtPlayerIds) {
          const boughtPlayer = (userClub.players || []).find(p => p.id === bpId);
          if (boughtPlayer && !restoredMarket.some(m => m.id === bpId)) {
            restoredMarket.push({
              ...boughtPlayer,
              isListedForTransfer: true,
              isFreeAgent: true,
            });
          }
        }
      }
      // Remove any sold players from market who were returned to userClub squad
      for (const sold of soldEntries) {
        restoredMarket = restoredMarket.filter(m => m.id !== sold.playerId);
      }

      // 3. Revert Manager Matches, Wins, Draws, Losses for this season
      const userPlayedFixtures = (fixtures || []).filter(
        f => f && f.isPlayed && (f.homeTeamId === userClub.id || f.awayTeamId === userClub.id)
      );
      let seasonWins = 0;
      let seasonDraws = 0;
      let seasonLosses = 0;
      for (const f of userPlayedFixtures) {
        const isHome = f.homeTeamId === userClub.id;
        const userScore = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
        const oppScore = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
        if (userScore > oppScore) seasonWins++;
        else if (userScore === oppScore) seasonDraws++;
        else seasonLosses++;
      }

      const restoredManager: ManagerProfile = savedSnapshot && savedSnapshot.manager ? {
        ...manager,
        matchesManaged: typeof savedSnapshot.manager.matchesManaged === 'number'
          ? savedSnapshot.manager.matchesManaged
          : Math.max(0, (manager.matchesManaged || 0) - userPlayedFixtures.length),
        wins: typeof savedSnapshot.manager.wins === 'number'
          ? savedSnapshot.manager.wins
          : Math.max(0, (manager.wins || 0) - seasonWins),
        draws: typeof savedSnapshot.manager.draws === 'number'
          ? savedSnapshot.manager.draws
          : Math.max(0, (manager.draws || 0) - seasonDraws),
        losses: typeof savedSnapshot.manager.losses === 'number'
          ? savedSnapshot.manager.losses
          : Math.max(0, (manager.losses || 0) - seasonLosses),
      } : {
        ...manager,
        matchesManaged: Math.max(0, (manager.matchesManaged || 0) - userPlayedFixtures.length),
        wins: Math.max(0, (manager.wins || 0) - seasonWins),
        draws: Math.max(0, (manager.draws || 0) - seasonDraws),
        losses: Math.max(0, (manager.losses || 0) - seasonLosses),
      };

      const restoredUserClub = restoredTeams.find(t => t.isUserClub || t.id === userClub.id) || restoredTeams[0];

      // 4. ATOMIC LEAGUE RESET
      const freshStandings = generateInitialStandings(restoredTeams);
      const freshCup = null as any;
      const activeFreshContinental = null as any;

      const freshFixtures = generateMasterSeasonAgenda(
        currentSeasonNum,
        activeLeague,
        restoredTeams,
        null,
        null,
        restoredUserClub
      );

      // 5. Reset Calendar Date to Season Start
      const initialSeasonDate = getInitialSeasonDate(currentSeasonNum);

      // 6. Reset Economy for the Season
      const resetEconomy: ClubEconomySummary = {
        clubBudget: restoredBudget,
        transferSpendingTotal: 0,
        transferIncomeTotal: 0,
        salaryExpensesTotal: 0,
        sponsorIncomeTotal: 0,
        matchIncomeTotal: 0,
        facilitySpendingTotal: 0,
        currentSeasonNetProfit: 0,
      };

      // 7. Reset Board System
      const freshBoard = generateInitialBoardSystem(
        restoredUserClub,
        activeLeague.tier,
        restoredTeams.length,
        restoredTeams,
        restoredUserClub.isNewlyPromoted
      );

      // 8. Clean up transfer history entries for this season
      const remainingTransferHistory = (transferHistory || []).filter(t => t.seasonNumber !== currentSeasonNum);

      // 9. Clean up current season match/transfer inbox messages and prepend restart announcement
      const announcementMsg: InboxMessage = {
        id: `msg_season_restart_${currentSeasonNum}_${Date.now()}`,
        title: `🔄 إعادة انطلاق الموسم ${currentSeasonNum}: تصفير جدول الدوري والعودة للجولة الأولى!`,
        sender: 'مجلس إدارة النادي والرابطة',
        date: 'الجولة الأولى',
        type: 'board',
        read: false,
        content:
          `بناءً على طلبك، تم إجراء تصفير شامل لجدول الدوري والتعاقدات وإيرادات المباريات وإعادة بدء الموسم ${currentSeasonNum} رسمياً من الجولة الأولى.\n\n` +
          `• النادي: ${restoredUserClub.name}\n` +
          `• المسابقة: ${activeLeague.name}\n` +
          `• الميزانية المستردة: ${restoredBudget.toLocaleString()} ج.م\n` +
          `• اللياقة البدنية: 100% لجميع اللاعبين دون إصابات أو إيقافات. 🚀`,
      };

      const filteredInbox = (inbox || []).filter(m => {
        if (!m || !m.id) return false;
        if (
          m.id.startsWith('msg_match_rev_') ||
          m.id.startsWith('msg_trans_') ||
          m.id.startsWith('msg_cup_') ||
          m.id.startsWith('msg_cont_') ||
          m.id.startsWith('msg_batch_sim_')
        ) {
          return false;
        }
        return true;
      });
      const newInbox = [announcementMsg, ...filteredInbox];

      setLiveMatch(null);
      clearActiveLiveMatchFromDb().catch(() => {});

      try {
        localStorage.removeItem(`${STORAGE_KEY}_active_live_match`);
        localStorage.removeItem(`${STORAGE_KEY}_seasonEndSummary`);
        localStorage.removeItem(`${STORAGE_KEY}_africanChampionsLeague`);
      } catch {}

      const leagueFixturesOnly = freshFixtures.filter(
        f => f.competitionType === 'LEAGUE' || f.competitionType === 'league'
      );
      const totalRoundsCount =
        leagueFixturesOnly.length > 0
          ? Math.max(...leagueFixturesOnly.map(f => f.round || 0))
          : (restoredTeams.length - 1) * 2;

      const updatedSeasonObj: SeasonInfo = {
        ...season,
        currentRound: 1,
        totalRounds: totalRoundsCount,
        status: 'active',
      };

      // Commit all restored states synchronously before UI re-render
      setTeams(restoredTeams);
      setStandings(freshStandings);
      setCupTournament(null);
      setAfricanChampionsLeague(null);
      setFixtures(freshFixtures);
      setCurrentRound(1);
      setSeason(updatedSeasonObj);
      setCalendarDate(initialSeasonDate);
      setClubEconomy(resetEconomy);
      setBoardSystem(freshBoard);
      setTransferHistory(remainingTransferHistory);
      setTransferMarket(restoredMarket);
      setManager(restoredManager);
      setActiveNegotiations([]);
      setIncomingBids([]);
      setSeasonEndSummary(null);
      setDayAdvanceSummary(null);
      setJobOffers([]);
      setShowSeasonTransitionModal(false);
      setInbox(newInbox);

      // Persist state to local repository & IndexedDB simultaneously
      try {
        gameStateRepository.saveLocalGameState({
          schemaVersion: 2,
          saveVersion: 1,
          lastLocalSaveAt: Date.now(),
          season: updatedSeasonObj,
          activeLeague,
          teams: restoredTeams,
          standings: freshStandings,
          fixtures: freshFixtures,
          currentRound: 1,
          manager: restoredManager,
          transferMarket: restoredMarket,
          incomingBids: [],
          inbox: newInbox,
          cupTournament: freshCup,
          africanChampionsLeague: activeFreshContinental,
          jobOffers: [],
          seasonEndSummary: null,
          transferHistory: remainingTransferHistory,
          clubEconomy: resetEconomy,
          calendarDate: initialSeasonDate,
          activeNegotiations: [],
          boardSystem: freshBoard,
          dailyNews: [],
          retiredPlayers,
          worldRankings,
          scoutedOpponents,
          deletedMessageIds,
        } as any);

        safeLocalStorageSet(`${STORAGE_KEY}_currentRound`, '1');
        safeLocalStorageSet(`${STORAGE_KEY}_season`, JSON.stringify(updatedSeasonObj));
        safeLocalStorageSet(`${STORAGE_KEY}_calendarDate`, JSON.stringify(initialSeasonDate));
        safeLocalStorageSet(`${STORAGE_KEY}_clubEconomy`, JSON.stringify(resetEconomy));
        safeLocalStorageSet(`${STORAGE_KEY}_manager`, JSON.stringify(restoredManager));
        safeLocalStorageSet(`${STORAGE_KEY}_activeNegotiations`, '[]');
        safeLocalStorageSet(`${STORAGE_KEY}_incomingBids`, '[]');
      } catch (err) {
        console.warn('[RestartSeason] Error saving game state on restart:', err);
      }

      // Synchronize with cloud in background
      setTimeout(() => {
        saveToCloud(true).catch(syncErr => {
          console.warn('[RestartSeason] Cloud sync deferred/offline:', syncErr);
        });
      }, 200);

      return {
        success: true,
        message: `تمت إعادة بداية الموسم ${currentSeasonNum} بنجاح! تم تصفير الدوري والكأس والبطولات القارية والعودة للجولة الأولى 🚀`,
      };
    } catch (error: any) {
      console.error('[RestartSeason] Failed to restart current season:', error);
      return {
        success: false,
        message: `تعذر إعادة بداية الموسم: ${error?.message || 'خطأ غير متوقع'}`,
      };
    }
  };

  // ----------------------------------------------------
  // DAILY PROGRESSION, CALENDAR SIMULATION & CAREER SYSTEMS
  // ----------------------------------------------------

  const advanceToNextDay = async (skipToMatch: boolean = false, forceAdvance: boolean = false) => {
    if (isSimulationRunningRef.current) return;
    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);

    try {
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => {
          setTimeout(resolve, 16);
        })
      );
      // Master Calendar Gating: If user's club has any unplayed fixture on or before today's calendar date (or active round trigger), block advancement
      if (!forceAdvance && userClub && !seasonFinished) {
        const todayStr = (calendarDate?.rawDateStr || '2026-08-15').trim();
        const userMatches = CalendarManager.getUserClubSchedule(userClub.id, calendarSchedule.length > 0 ? calendarSchedule : (fixtures as CalendarScheduleItem[]));

        // Strict User Match Preservation: Check for any scheduled user match up to today's date OR any due Continental/Cup matchday up to currentRound
        const userPendingMatch = userMatches.find(
          f =>
            !f.isPlayed &&
            ((f.date || '').trim() <= todayStr ||
              ((f.competitionType === 'CONTINENTAL_CUP' || f.competitionType === 'continental' || f.competitionType === 'DOMESTIC_COP' || f.competitionType === 'cup') &&
                f.round &&
                f.round <= currentRound))
        );

        if (userPendingMatch) {
          const val = validateSquadLineup(userClub);
          const oppId = userPendingMatch.homeTeamId === userClub.id ? userPendingMatch.awayTeamId : userPendingMatch.homeTeamId;
          const oppClub = (teams || []).find(t => t && t.id === oppId) || (oppId ? findClubInWorld(oppId) : undefined);
          const branding = getCompetitionBranding(userPendingMatch, activeLeague?.shortName || activeLeague?.name);

          if (!val.isValid) {
            setMatchBlocker({
              isOpen: true,
              reason: 'lineup_issue',
              title: `🚨 تنبيه (${branding.badge}): لاعب غير جاهز في التشكيل`,
              message: `يوجد لاعبون مصابون أو موقوفون ضمن التشكيل الأساسي للمباراة القادمة (${branding.stageName}) أمام (${oppClub?.name || 'المنافس'})! يجب استبدالهم أو تسوية التشكيل أولاً.`,
              fixture: userPendingMatch,
              opponentClub: oppClub,
              invalidStarters: val.invalidStarters,
            });
          } else {
            setMatchBlocker({
              isOpen: true,
              reason: 'match_today',
              title: `${branding.badge} - موعد مباراة رسمية!`,
              message: `حان موعد مباراة (${branding.stageName}) أمام (${oppClub?.name || 'المنافس'})! يجب خوض المباراة وإدارتها تفاعلياً وعدم تخطيها بالمحاكاة الصامتة.`,
              fixture: userPendingMatch,
              opponentClub: oppClub,
            });
          }
          isSimulationRunningRef.current = false;
          setIsSimulationRunning(false);
          return; // BLOCK ADVANCEMENT!
        }
      }

      // Time-Driven Calendar Simulation Step
      const simResult = CalendarManager.advanceCalendarStep({
        currentDateStr: calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr,
        dayIndexInSeason: calendarDate?.dayIndexInSeason || 1,
        seasonNumber: season?.seasonNumber || 1,
        userClubId: userClub?.id || null,
        masterSchedule: calendarSchedule.length > 0 ? calendarSchedule : (fixtures as CalendarScheduleItem[]),
        teams,
        skipDirectlyToNextUserMatch: skipToMatch,
      });

      const newDate = simResult.nextDate;
      const daysAdvanced = Math.max(1, (newDate.dayIndexInSeason || 1) - (calendarDate?.dayIndexInSeason || 1));

      // Synchronize simulated background AI matches into fixtures and route through Tournament Dispatcher in non-blocking batches
      let nextFixtures = [...fixtures];
      if (simResult.simulatedFixtures.length > 0) {
        let nextStandings = [...standings];

        for (let idx = 0; idx < simResult.simulatedFixtures.length; idx++) {
          const sf = simResult.simulatedFixtures[idx];
          const disp = await processMatchResult(sf, {
            standings: nextStandings,
            cupTournament: null,
            continentalTournament: null,
            fixtures: nextFixtures,
            teams,
            userClub,
            currentRound,
          });
          nextStandings = disp.updatedStandings;
          nextFixtures = disp.updatedFixtures;
          if ((idx + 1) % 3 === 0) {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
          }
        }

        setFixtures(nextFixtures);
        try {
          const freshStandings = recalculateStandingsFromFixtures(nextStandings, teams, nextFixtures);
          setStandings(freshStandings);
        } catch (_) {
          setStandings(nextStandings);
        }
      }

      // Check for Season End (May 30 or after) -> Trigger Automatic SeasonTransitionManager only when all league fixtures have completed
      const seasonDateRange = CalendarManager.getSeasonDateRange(season?.seasonNumber || 1);
      const isSeasonEndReached = (simResult.seasonFinished || newDate.rawDateStr >= seasonDateRange.endDateStr) && allLeagueFixturesPlayed && !userHasUnplayedMatches;

      if (isSeasonEndReached && !seasonFinished) {
        const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
        let activeMgr = manager;
        const summary = calculateSeasonEndSummary(
          { ...season, status: 'completed', totalRounds },
          standings,
          summaryClub,
          activeLeague,
          null,
          activeMgr,
          null
        );

        if ((activeMgr as any).lastTrophyAwardedSeasonNumber !== season.seasonNumber) {
          const newTrophiesList = [...(activeMgr.trophies || [])];
          if (summary.leagueTrophyAwarded && !newTrophiesList.includes(summary.leagueTrophyAwarded)) {
            newTrophiesList.push(summary.leagueTrophyAwarded);
          }
          activeMgr = {
            ...activeMgr,
            trophies: newTrophiesList,
            leagueTitles: (activeMgr.leagueTitles || 0) + (summary.resultStatus === 'champion' ? 1 : 0),
            promotions: (activeMgr.promotions || 0) + (summary.resultStatus === 'promoted' || (summary.resultStatus === 'champion' && summary.divisionTier > 1) ? 1 : 0),
            relegations: (activeMgr.relegations || 0) + (summary.resultStatus === 'relegated' ? 1 : 0),
            careerEarnings: (activeMgr.careerEarnings || 0) + (summary.prizeMoney || 0),
            lastTrophyAwardedSeasonNumber: season.seasonNumber,
          } as any;
        }

        if (activeMgr.lastSettledSeasonNumber !== season.seasonNumber) {
          const endOfSeasonManagerBonus = calculateManagerSeasonBonus(summary, activeMgr);
          const settlementRes = settleEndOfSeasonLicenseAndBonus(activeMgr, endOfSeasonManagerBonus, season.seasonNumber);
          activeMgr = settlementRes.updatedManager;
          summary.licenseSettlement = settlementRes.settlement;
        }

        if (summary.trophiesWonList && summary.trophiesWonList.length > 0 && summaryClub) {
          runWhenIdle(() => {
          loadWorldStateFromDb().then(ws => {
            if (ws) {
              const formattedTrophies = summary.trophiesWonList!.map(t => ({
                name: t,
                season: season.seasonNumber,
                year: `الموسم ${season.seasonNumber}`,
              }));
              const updatedWs = recordClubTrophiesInWorld(ws, summaryClub.id, formattedTrophies);
              saveWorldStateToDb(updatedWs);
            }
          }).catch(() => {});
          });
        }

        const offersMgrD = activeMgr;
        setSeason(prev => ({ ...prev, status: 'completed' }));
        setSeasonEndSummary(summary);
        scheduleSeasonEndOffersAndModal(() =>
          generateSeasonJobOffers(offersMgrD, summaryClub, activeLeague, summary.finalPosition)
        );
        setCupTournament(null);
        setAfricanChampionsLeague(null);
        setManager(activeMgr);
      }

      // 1. Simulate Daily Squad Training & Recovery across the days advanced
      let updatedTrainingReports: DayAdvanceSummary['trainingReports'] = [];
      let updatedInjuryReports: DayAdvanceSummary['injuryUpdates'] = [];
      let updatedSquadPlayers: Player[] | undefined = userClub && Array.isArray(userClub.players)
        ? userClub.players.filter((p): p is Player => Boolean(p && p.id)).map(p => ({
            ...p,
            attributes: p.attributes || {
              pace: p.overallRating || 65,
              shooting: p.overallRating || 65,
              passing: p.overallRating || 65,
              dribbling: p.overallRating || 65,
              defending: p.overallRating || 65,
              physical: p.overallRating || 65,
              goalkeeping: p.position === 'GK' ? (p.overallRating || 65) : 30,
            },
            fitness: typeof p.fitness === 'number' ? p.fitness : 100,
            morale: typeof p.morale === 'number' ? p.morale : 85,
          }))
        : undefined;

      if (updatedSquadPlayers && updatedSquadPlayers.length > 0) {
        for (let dayStep = 0; dayStep < daysAdvanced; dayStep++) {
          try {
            const trainingResult = simulateDailySquadTraining(
              updatedSquadPlayers,
              trainingIntensity || 'normal',
              userClub?.facilities?.trainingGroundLevel || 1
            );
            if (trainingResult && Array.isArray(trainingResult.updatedPlayers)) {
              updatedSquadPlayers = trainingResult.updatedPlayers;
            }
            if (trainingResult?.injuryUpdates && trainingResult.injuryUpdates.length > 0) {
              updatedInjuryReports.push(...trainingResult.injuryUpdates);
            }
            if (dayStep === daysAdvanced - 1 || (trainingResult?.trainingReports && trainingResult.trainingReports.some(r => r && r.type === 'growth'))) {
              if (trainingResult?.trainingReports) {
                updatedTrainingReports.push(...trainingResult.trainingReports);
              }
            }
          } catch (tErr) {
            console.warn('[DailyProgression] Training simulation step warning:', tErr);
          }
        }
      }

      // 2. Simulate Active Negotiations Progression across the days advanced
      let currentActiveNegs = Array.isArray(activeNegotiations) ? [...activeNegotiations] : [];
      let allCompletedTransfers: { negotiation: ActiveNegotiation; player: Player }[] = [];
      let allNegReports: DayAdvanceSummary['negotiationUpdates'] = [];

      for (let dayStep = 0; dayStep < daysAdvanced; dayStep++) {
        if (currentActiveNegs.length === 0) break;
        try {
          const negResult = simulateDailyNegotiations(
            currentActiveNegs,
            userClub,
            teams || [],
            transferMarket || []
          );
          currentActiveNegs = (negResult.updatedNegotiations || []).filter(n => n && n.stage !== 'completed');
          if (negResult.completedTransfers && negResult.completedTransfers.length > 0) {
            allCompletedTransfers.push(...negResult.completedTransfers);
          }
          if (negResult.negotiationReports && negResult.negotiationReports.length > 0) {
            allNegReports.push(...negResult.negotiationReports);
          }
          if (currentActiveNegs.some(n => n && n.actionRequired)) {
            break;
          }
        } catch (negErr) {
          console.warn('[DailyProgression] Negotiation simulation warning:', negErr);
          break;
        }
      }

      // Filter out completed deals so they do not linger on the active negotiations tab
      setActiveNegotiations(currentActiveNegs);

      // Atomically execute squad updates and completed transfers
      let calculatedNextTeams = (Array.isArray(teams) ? teams : []).map(t => {
        if (!t) return t;
        if ((t.isUserClub || (userClub && t.id === userClub.id)) && updatedSquadPlayers) {
          return {
            ...t,
            players: updatedSquadPlayers,
          };
        }
        return t;
      });

      if (allCompletedTransfers.length > 0 && userClub) {
        allCompletedTransfers.forEach(({ negotiation: deal, player: targetPlayer }) => {
          if (targetPlayer && deal) {
            const safeFee = deal.bidFee || 0;
            const safeSalary = deal.offeredSalary || targetPlayer.salary || 10000;
            const safeYears = deal.contractYears || 2;
            const newPlayer: Player = {
              ...targetPlayer,
              currentClubId: userClub.id,
              currentLeagueId: activeLeague?.id || userClub.leagueId || 'egy_tier_1',
              salary: safeSalary,
              contractYears: safeYears,
              isListedForTransfer: false,
              morale: 95,
              fitness: 100,
            };

            calculatedNextTeams = calculatedNextTeams.map(t => {
              if (!t) return t;
              const normTargetName = normalizePlayerKey(targetPlayer.name);
              if (t.isUserClub || t.id === userClub.id) {
                const filtered = (t.players || []).filter(p => p && p.id !== targetPlayer.id && (normTargetName ? normalizePlayerKey(p.name) !== normTargetName : true));
                return {
                  ...t,
                  budget: Math.max(0, (t.budget || 0) - safeFee),
                  players: [...filtered, newPlayer],
                };
              }
              if (deal.playerClubId && t.id === deal.playerClubId) {
                return {
                  ...t,
                  budget: (t.budget || 0) + safeFee,
                  players: (t.players || []).filter(p => p && p.id !== targetPlayer.id && (normTargetName ? normalizePlayerKey(p.name) !== normTargetName : true)),
                };
              }
              if (t.players && t.players.some(p => p && (p.id === targetPlayer.id || (normTargetName && normalizePlayerKey(p.name) === normTargetName)))) {
                return {
                  ...t,
                  players: t.players.filter(p => p && p.id !== targetPlayer.id && (normTargetName ? normalizePlayerKey(p.name) !== normTargetName : true)),
                };
              }
              return t;
            });
          }
        });
      }

      // Ensure any player whose contract has expired (contractYears <= 0) immediately transfers to another club and plays in its starting lineup
      if (isSeasonEndReached && !seasonFinished) {
        calculatedNextTeams = calculatedNextTeams.map(club => ({
          ...club,
          players: (club.players || []).map(p => {
            if (!p) return p;
            const alreadyDec = (p as any).lastContractDecrementedSeason === (season?.seasonNumber || 1);
            return {
              ...p,
              contractYears: alreadyDec
                ? Math.max(0, typeof p.contractYears === 'number' ? p.contractYears : 0)
                : Math.max(0, (typeof p.contractYears === 'number' ? p.contractYears : 2) - 1),
              lastContractDecrementedSeason: season?.seasonNumber || 1,
            } as Player;
          }),
        }));
      }

      const hasExpiredContracts = calculatedNextTeams.some(
        club => Array.isArray(club?.players) && club.players.some(p => p && (typeof p.contractYears === 'number' ? p.contractYears : 2) <= 0)
      );

      if (hasExpiredContracts) {
        const freeAgentRes = processFreeAgentsAndAiTransfers(
          calculatedNextTeams,
          transferMarket || [],
          season?.seasonNumber || 1,
          currentRound || 1,
          userClub?.id
        );
        calculatedNextTeams = freeAgentRes.updatedTeams;
        if (freeAgentRes.updatedMarket) {
          setTransferMarket(freeAgentRes.updatedMarket);
        }
        if (freeAgentRes.newTransfers && freeAgentRes.newTransfers.length > 0) {
          setTransferHistory(prev => [...freeAgentRes.newTransfers, ...(prev || [])].slice(0, 120));
        }
        if (freeAgentRes.inboxNotifications && freeAgentRes.inboxNotifications.length > 0) {
          setInbox(prev => [...freeAgentRes.inboxNotifications, ...(prev || [])].slice(0, 80));
        }
      } else if ((newDate.dayIndexInSeason || 1) % 5 === 0) {
        // Periodic AI market activity & contender squad strengthening during regular calendar progression
        try {
          const aiDayCompRes = executeCompetitiveAiTransfersAndGrowth({
            teams: calculatedNextTeams,
            transferMarket: transferMarket || [],
            seasonNumber: season?.seasonNumber || 1,
            currentRound: currentRound || 1,
            activeLeagueTier: activeLeague?.tier || 1,
          });
          calculatedNextTeams = aiDayCompRes.updatedTeams;
          if (aiDayCompRes.updatedMarket) {
            setTransferMarket(aiDayCompRes.updatedMarket);
          }
          if (aiDayCompRes.newTransfers && aiDayCompRes.newTransfers.length > 0) {
            setTransferHistory(prev => [...aiDayCompRes.newTransfers, ...(prev || [])].slice(0, 120));
          }
          if (aiDayCompRes.inboxNotifications && aiDayCompRes.inboxNotifications.length > 0) {
            setInbox(prev => [...aiDayCompRes.inboxNotifications, ...(prev || [])].slice(0, 80));
          }
        } catch (_) {}
      }

      // Deduct monthly player salaries on the 1st of each month (or when month changes)
      const isNewMonthDay = newDate.day === 1 || (calendarDate && newDate.month !== calendarDate.month);
      if (isNewMonthDay) {
        let userMonthlyWagesPaid = 0;
        calculatedNextTeams = calculatedNextTeams.map(club => {
          if (!club) return club;
          const clubMonthlyWages = (club.players || []).reduce((sum, p) => sum + (p?.salary || 0), 0);
          if (club.isUserClub || (userClub && club.id === userClub.id)) {
            userMonthlyWagesPaid = clubMonthlyWages;
          }
          return {
            ...club,
            budget: Math.max(0, (club.budget || 0) - clubMonthlyWages),
          };
        });

        if (userMonthlyWagesPaid > 0) {
          setClubEconomy(prev => ({
            ...prev,
            wagesExpenseTotal: (prev.wagesExpenseTotal || 0) + userMonthlyWagesPaid,
            currentSeasonNetProfit: (prev.currentSeasonNetProfit || 0) - userMonthlyWagesPaid,
          }));
        }
      }

      setTeams(calculatedNextTeams);

      if (allCompletedTransfers.length > 0 && userClub) {
        allCompletedTransfers.forEach(({ negotiation: deal, player: targetPlayer }) => {
          if (targetPlayer && deal) {
            const safeFee = deal.bidFee || 0;
            const safeSalary = deal.offeredSalary || targetPlayer.salary || 10000;
            const normDealName = normalizePlayerKey(deal.playerName || targetPlayer.name);
            // Remove from market by both ID and normalized name
            setTransferMarket(prev => (prev || []).filter(p => p && p.id !== targetPlayer.id && (normDealName ? normalizePlayerKey(p.name) !== normDealName : true)));

            // Log to transfer history
            const historyEntry: TransferHistoryEntry = {
              id: `th_neg_${deal.id}_${Date.now()}`,
              date: newDate.formattedArabic,
              playerName: deal.playerName || targetPlayer.name,
              playerId: deal.playerId || targetPlayer.id,
              playerRating: targetPlayer.overallRating || deal.playerOverall || 70,
              position: targetPlayer.position || deal.playerPosition || 'CM',
              fromClubName: deal.playerClubName || 'وكيل حر',
              toClubName: userClub.name,
              fee: safeFee,
              salary: safeSalary,
              seasonNumber: season?.seasonNumber || 1,
              type: 'buy',
              timestamp: Date.now(),
            };
            setTransferHistory(prev => [historyEntry, ...(prev || [])]);

            // Update club economy
            setClubEconomy(prev => ({
              ...prev,
              transferSpendingTotal: (prev?.transferSpendingTotal || 0) + safeFee,
              currentSeasonNetProfit: (prev?.currentSeasonNetProfit || 0) - safeFee,
            }));

            // Send confirmation message to inbox
            const inboxMsg: InboxMessage = {
              id: `msg_trans_comp_${Date.now()}_${targetPlayer.id}`,
              title: `انضمام اللاعب ${deal.playerName || targetPlayer.name} للفريق رسمياً! ✍️`,
              sender: 'لجنة التعاقدات والاحتراف',
              date: newDate.formattedArabic,
              type: 'transfer',
              read: false,
              content: `اكتملت إجراءات انتقال اللاعب ${deal.playerName || targetPlayer.name} (${deal.playerPosition || targetPlayer.position} - تقييم ${deal.playerOverall || targetPlayer.overallRating}) بنجاح وتم قيده رسمياً في قائمة الفريق. العقد يمتد لـ ${deal.contractYears || 2} سنوات براتب شهري ${safeSalary.toLocaleString()} ج.م.`,
            };
            setInbox(prev => [inboxMsg, ...(prev || [])]);
          }
        });
      }

      // 3. Generate Daily World News
      let dailyNewsBatch: DailyNewsItem[] = [];
      try {
        dailyNewsBatch = generateImmersiveNewsBatch({
          calendarDate: newDate,
          userClub,
          manager,
          teams: calculatedNextTeams || teams || [],
          standings: standings || [],
          currentRound,
        }, 4);
        setDailyNews(prev => [...dailyNewsBatch, ...(prev || [])].slice(0, 40));
      } catch (e) {
        console.warn('Daily news generation error:', e);
      }

      // 4. Update Board System Confidence & Feedback
      let dailyBoardFeedback: string | undefined = undefined;
      if (userClub) {
        setBoardSystem(prev => {
          const updated = updateDailyBoardConfidence(prev, userClub, standings || []);
          dailyBoardFeedback = updated?.statusDescription || undefined;
          return updated;
        });
      }

      // 5. Monthly World Rankings Recalculation & Notification
      if (calendarDate && typeof calendarDate.month === 'number' && newDate.month !== calendarDate.month) {
        try {
          const updatedMonthStr = `${newDate.year}-${String(newDate.month).padStart(2, '0')}`;
          const freshWorldRankings = generateMonthlyWorldRankings(manager, userClub, updatedMonthStr, { previous: worldRankings, teams: calculatedNextTeams || teams, standings });
          if (freshWorldRankings) {
            setWorldRankings(freshWorldRankings);

            const userRankEntry = (freshWorldRankings.managers || []).find(m => m && (m.id === 'user_manager' || (m.name && m.name.includes('(أنت)'))));
            const topManager = freshWorldRankings.managers?.[0];
            const topClub = freshWorldRankings.clubs?.[0];

            const monthlyInboxMsg: InboxMessage = {
              id: `msg_fifa_rankings_${newDate.month}_${newDate.year}_${Date.now()}`,
              title: `تقرير التصنيف الشهري العالمي للأندية والمدربين 🌍 (${newDate.formattedArabic})`,
              sender: 'الاتحاد الدولي للتاريخ والإحصاء (IFFHS) والفيفا',
              date: newDate.formattedArabic,
              type: 'news',
              read: false,
              content: buildRankingsReport(freshWorldRankings, userRankEntry, newDate.formattedArabic),
            };

            setInbox(prev => [monthlyInboxMsg, ...(prev || [])]);

            if (userRankEntry) {
              setManager(prev => ({
                ...prev,
                worldRank: userRankEntry.worldRank,
                previousWorldRank: userRankEntry.previousWorldRank,
                monthlyRankChange: userRankEntry.monthlyRankChange,
                rankingPoints: userRankEntry.rankingPoints,
                managerRating: userDynamicManagerRating,
              }));
            }
          }
        } catch (rankErr) {
          console.warn('[DailyProgression] Monthly rankings error:', rankErr);
        }
      }

      // 6. Periodic Contract Expiry Checks (on 1st & 15th of month or month change)
      if (userClub && (newDate.day === 1 || newDate.day === 15 || (calendarDate && newDate.month !== calendarDate.month))) {
        try {
          const contractAlerts = checkExpiringContracts(userClub, newDate.formattedArabic, inbox || []);
          if (contractAlerts.length > 0) {
            // Re-check against the freshest inbox so fast multi-day sims never duplicate alerts
            setInbox(prev => {
              const base = prev || [];
              const fresh = contractAlerts.filter(a => !base.some(m =>
                m.contractDetails?.playerId === a.contractDetails?.playerId &&
                !m.contractDetails?.renewed && m.actionTaken !== 'renewed'));
              return fresh.length ? [...fresh, ...base] : base;
            });
          }
        } catch (contractErr) {
          console.warn('[DailyProgression] Contract alert error:', contractErr);
        }
      }

      // 7. Assemble Day Summary
      const summary: DayAdvanceSummary = {
        currentDateStr: newDate.rawDateStr,
        formattedArabicDate: newDate.formattedArabic,
        daysAdvanced,
        trainingReports: updatedTrainingReports,
        injuryUpdates: updatedInjuryReports,
        negotiationUpdates: allNegReports,
        newsItems: dailyNewsBatch.slice(0, 3),
        boardFeedback: dailyBoardFeedback || undefined,
      };

      setCalendarDate(newDate);
      setDayAdvanceSummary(summary);
      setShowDaySummaryModal(true);
      console.log('[DailyProgression] Day advanced successfully to:', newDate.formattedArabic);

      // Persist advanced calendar date and full game state to disk repository (IndexedDB) without blocking main thread with huge localStorage strings
      try {
        safeLocalStorageSet(`${STORAGE_KEY}_calendarDate`, JSON.stringify(newDate));
        const prunedDayFixtures = pruneFixturesForStorage(nextFixtures, userClub?.id);
        gameStateRepository.saveLocalGameState({
          schemaVersion: 2,
          saveVersion: 1,
          lastLocalSaveAt: Date.now(),
          season,
          activeLeague,
          teams: calculatedNextTeams,
          standings,
          fixtures: prunedDayFixtures,
          currentRound,
          manager,
          transferMarket,
          incomingBids,
          inbox,
          cupTournament,
          africanChampionsLeague,
          jobOffers,
          seasonEndSummary,
          transferHistory,
          clubEconomy,
          calendarDate: newDate,
          activeNegotiations: currentActiveNegs,
          boardSystem,
          dailyNews: dailyNewsBatch ? [...dailyNewsBatch, ...(dailyNews || [])].slice(0, 40) : dailyNews,
          retiredPlayers,
          worldRankings,
          scoutedOpponents,
          deletedMessageIds,
        });
      } catch (saveErr) {
        console.warn('[DailyProgression] Save to local repository notice:', saveErr);
      }


    } catch (error) {
      console.error('[DailyProgression] CRITICAL UNCAUGHT EXCEPTION in advanceToNextDay, recovering safely:', error);
      try {
        const safeRaw = calendarDate?.rawDateStr || getInitialSeasonDate(season?.seasonNumber || 1).rawDateStr;
        const fallbackDate = addDaysToDate(safeRaw, 1, (calendarDate?.dayIndexInSeason || 1));
        setCalendarDate(fallbackDate);
        localStorage.setItem(`${STORAGE_KEY}_calendarDate`, JSON.stringify(fallbackDate));
        setDayAdvanceSummary({
          currentDateStr: fallbackDate.rawDateStr,
          formattedArabicDate: fallbackDate.formattedArabic,
          daysAdvanced: 1,
          trainingReports: [],
          injuryUpdates: [],
          negotiationUpdates: [],
          newsItems: [],
        });
        setShowDaySummaryModal(true);
      } catch (fallbackErr) {
        console.error('[DailyProgression] Fallback advance failed:', fallbackErr);
      }
    } finally {
      isSimulationRunningRef.current = false;
      setIsSimulationRunning(false);
    }
  };

  const advanceCalendarDay = (skipCheck: boolean = false) => {
    advanceToNextDay(skipCheck);
  };

  const forceAdvanceDay = () => {
    advanceToNextDay(false, true);
  };

  const closeDaySummaryModal = () => {
    setShowDaySummaryModal(false);
  };

  // Start Multi-Stage Player Negotiation
  const startPlayerNegotiation = (proposal: {
    playerId: string;
    transferFee: number;
    monthlySalary: number;
    contractYears: number;
    squadRole: 'key_player' | 'first_team' | 'rotation' | 'prospect';
  }): { success: boolean; message: string } => {
    try {
      if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً.' };

      let targetPlayer: Player | undefined = transferMarket.find(p => p.id === proposal.playerId) ||
        teams.flatMap(t => Array.isArray(t.players) ? t.players : []).find(p => p.id === proposal.playerId);

      if (!targetPlayer) {
        const allDb = getAllDatabasePlayers(teams, transferMarket, activeNegotiations, userClub?.id);
        const foundItem = allDb.find(i => i.player.id === proposal.playerId);
        if (foundItem) {
          targetPlayer = foundItem.player;
        }
      }

      if (!targetPlayer) {
        return { success: false, message: 'اللاعب غير موجود في قاعدة البيانات.' };
      }

      // Check if already in active negotiations
      if (activeNegotiations.some(n => n.playerId === proposal.playerId && n.stage !== 'completed' && n.stage !== 'rejected')) {
        return { success: false, message: 'توجد مفاوضات جارية بالفعل مع هذا اللاعب.' };
      }

      const sellingClub = teams.find(t => (t.players || []).some(p => p.id === proposal.playerId) && !t.isUserClub);
      const resolvedClub = resolveClubInfo(
        targetPlayer.currentClubId || sellingClub?.id,
        (targetPlayer as any).currentClubName || sellingClub?.name,
        teams
      );
      const hasClubAssociation = Boolean(
        sellingClub ||
          resolvedClub.club ||
          (targetPlayer.currentClubId && targetPlayer.currentClubId !== 'free_agents' && targetPlayer.currentClubId !== '') ||
          (!resolvedClub.clubName.includes('وكيل حر') && !resolvedClub.clubName.includes('لاعب حر'))
      );
      const isFreeAgent =
        !hasClubAssociation &&
        (targetPlayer.isFreeAgent === true ||
          targetPlayer.currentLeagueId === 'free_agents' ||
          (targetPlayer.contractYears !== undefined && targetPlayer.contractYears <= 0) ||
          proposal.transferFee <= 0);
      const displaySellingClubName = isFreeAgent ? 'لاعب حر (بدون نادٍ)' : resolvedClub.clubName;
      const effectiveTransferFee = isFreeAgent ? 0 : proposal.transferFee;

      if (!isFreeAgent && effectiveTransferFee > userClub.budget) {
        return { success: false, message: `قيمة عرض الشراء المطلوب (${effectiveTransferFee.toLocaleString()} ج.م) تتجاوز ميزانية النادي المتاحة (${userClub.budget.toLocaleString()} ج.م). يجب توفير سعر اللاعب أولاً!` };
      }

      const safeRawDate = calendarDate?.rawDateStr || new Date().toISOString().slice(0, 10);
      const safeDateArabic = calendarDate?.formattedArabic || 'اليوم';
      const safeContractYears = Math.min(5, Math.max(1, proposal.contractYears || 3));
      const { fairMarketValue, recommendedMonthlyWage } = calculatePlayerFairValue(targetPlayer, sellingClub || resolvedClub.club);
      const requiredClubFee = isFreeAgent
        ? 0
        : calculateContractDurationTransferFee(fairMarketValue, safeContractYears, false);
      const requiredPlayerWage = Math.max(1500, Number(targetPlayer.salary) || recommendedMonthlyWage || 2500);
      const offeredWage = Math.max(1000, proposal.monthlySalary || requiredPlayerWage);

      const joinCheck = canPlayerJoinClub(targetPlayer, userClub);

      let initialStage: ActiveNegotiation['stage'] = 'player_terms';
      let demandedFee: number | undefined = undefined;
      let demandedSalary: number | undefined = undefined;
      let actionRequired = true;
      let statusMessage = '';

      if (!joinCheck.canJoin) {
        initialStage = 'rejected';
        actionRequired = false;
        statusMessage = joinCheck.reason || `رفض ${targetPlayer.name} العرض لعدم تناسب طموحاته مع الدرجة الحالية لناديك.`;
      } else if (!isFreeAgent && effectiveTransferFee < Math.round(requiredClubFee * 0.85)) {
        initialStage = 'club_counter';
        demandedFee = requiredClubFee;
        actionRequired = true;
        statusMessage = `عرض مقابل من ${displaySellingClubName}: تطلب الإدارة مبلغ ${requiredClubFee.toLocaleString()} ج.م للموافقة الفورية على انتقال ${targetPlayer.name}.`;
      } else if (offeredWage < Math.round(requiredPlayerWage * 0.85)) {
        initialStage = 'player_counter';
        demandedSalary = requiredPlayerWage;
        actionRequired = true;
        statusMessage = `وافق النادي على العرض، بينما طلب وكيل اللاعب ${targetPlayer.name} راتباً شهرياً قدره ${requiredPlayerWage.toLocaleString()} ج.م للتوقيع الفوري.`;
      } else {
        initialStage = 'player_terms';
        actionRequired = true;
        statusMessage = isFreeAgent
          ? `✅ وافق اللاعب الحر ${targetPlayer.name} على شروط العقد (${safeContractYears} سنوات)! يمكنك إتمام التوقيع الفوري الآن.`
          : `✅ وافقت إدارة ${displaySellingClubName} واللاعب ${targetPlayer.name} على العرض المالي! يمكنك حسم وإتمام التعاقد فوراً.`;
      }

      const newNegotiation: ActiveNegotiation = {
        id: `neg_${Date.now()}_${targetPlayer.id}`,
        type: 'buy',
        playerId: targetPlayer.id,
        playerName: targetPlayer.name,
        playerOverall: targetPlayer.overallRating || 70,
        playerPosition: targetPlayer.position || 'CM',
        playerAge: targetPlayer.age || 25,
        playerClubId: isFreeAgent ? '' : (targetPlayer.currentClubId || sellingClub?.id || resolvedClub.leagueId),
        playerClubName: displaySellingClubName,
        sellingClubName: displaySellingClubName,
        buyerClubId: userClub.id,
        buyerClubName: userClub.name,
        bidFee: effectiveTransferFee,
        offeredSalary: offeredWage,
        contractYears: safeContractYears,
        squadRole: proposal.squadRole || 'first_team',
        demandedFee,
        demandedSalary,
        stage: initialStage,
        daysRemainingInStage: initialStage === 'rejected' ? 0 : 1,
        statusMessage,
        actionRequired,
        history: [
          {
            dateStr: safeRawDate,
            message: `[${safeDateArabic}] تقديم عرض رسمي (قيمة الصفقة: ${effectiveTransferFee.toLocaleString()} ج.م • الراتب: ${offeredWage.toLocaleString()} ج.م • المدة: ${safeContractYears} سنوات).`,
            from: 'manager',
          },
          {
            dateStr: safeRawDate,
            message: `[${safeDateArabic}] ${statusMessage}`,
            from: initialStage === 'club_counter' ? 'club' : 'player',
          },
        ],
      };

      setActiveNegotiations(prev => [newNegotiation, ...prev.filter(n => n.playerId !== targetPlayer!.id || n.type !== 'buy')]);

      return {
        success: initialStage !== 'rejected',
        message: statusMessage,
      };
    } catch (err: any) {
      console.error('[startPlayerNegotiation] Exception caught:', err);
      return { success: false, message: err?.message || 'حدث خطأ أثناء بدء المفاوضات.' };
    }
  };

  // Respond to Counter-Offers or Immediately Finalize Negotiations
  const respondToNegotiationOffer = (
    negotiationId: string,
    action: 'accept_counter' | 'raise_salary' | 'complete_now' | 'cancel',
    extraValue?: number
  ): { success: boolean; message: string } => {
    const neg = activeNegotiations.find(n => n.id === negotiationId);
    if (!neg) return { success: false, message: 'المفاوضات غير موجودة.' };

    if (action === 'cancel') {
      setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));
      return { success: true, message: 'تم إلغاء المفاوضات والانسحاب من الصفقة.' };
    }

    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    // Determine final fee and salary for immediate completion
    const finalFee =
      action === 'accept_counter'
        ? (extraValue ?? neg.demandedFee ?? neg.bidFee ?? 0)
        : (neg.bidFee ?? 0);
    const finalSalary =
      action === 'raise_salary'
        ? (extraValue ?? neg.demandedSalary ?? neg.offeredSalary ?? 2500)
        : (neg.demandedSalary ?? neg.offeredSalary ?? 2500);

    if (userClub.budget < finalFee) {
      return {
        success: false,
        message: `ميزانية النادي (${userClub.budget.toLocaleString()} ج.م) لا تكفي لدفع قيمة الصفقة المطلوبة (${finalFee.toLocaleString()} ج.م)!`,
      };
    }

    if (
      action === 'accept_counter' ||
      action === 'raise_salary' ||
      action === 'complete_now'
    ) {
      const fullPlayer = resolveFullPlayerObject(
        {
          ...neg,
          bidFee: finalFee,
          offeredSalary: finalSalary,
        },
        teams,
        transferMarket
      );

      const safeYears = Math.min(5, Math.max(1, neg.contractYears || 3));
      const signedPlayer: Player = {
        ...fullPlayer,
        currentClubId: userClub.id,
        currentLeagueId: activeLeague.id,
        isFreeAgent: false,
        salary: finalSalary,
        contractYears: safeYears,
        isListedForTransfer: false,
        morale: 95,
        fitness: 100,
      };

      // Add to userClub squad, deduct transfer fee from budget, and remove from selling club
      const normSignedName = normalizePlayerKey(signedPlayer.name);
      setTeams(prevTeams =>
        (Array.isArray(prevTeams) ? prevTeams : []).map(t => {
          if (!t) return t;
          if (t.isUserClub || t.id === userClub.id) {
            const filtered = (t.players || []).filter(
              p =>
                p &&
                p.id &&
                p.id !== neg.playerId &&
                (normSignedName ? normalizePlayerKey(p.name) !== normSignedName : true)
            );
            return {
              ...t,
              budget: Math.max(0, (t.budget || 0) - finalFee),
              transferBudget: Math.max(0, (t.transferBudget || t.budget || 0) - finalFee),
              players: [...filtered, signedPlayer],
            };
          }
          if (neg.playerClubId && t.id === neg.playerClubId) {
            return {
              ...t,
              budget: (t.budget || 0) + finalFee,
              players: (t.players || []).filter(
                p =>
                  p &&
                  p.id &&
                  p.id !== neg.playerId &&
                  (normSignedName ? normalizePlayerKey(p.name) !== normSignedName : true)
              ),
            };
          }
          if (
            t.players &&
            t.players.some(
              p => p && (p.id === neg.playerId || (normSignedName && normalizePlayerKey(p.name) === normSignedName))
            )
          ) {
            return {
              ...t,
              players: (t.players || []).filter(
                p =>
                  p &&
                  p.id &&
                  p.id !== neg.playerId &&
                  (normSignedName ? normalizePlayerKey(p.name) !== normSignedName : true)
              ),
            };
          }
          return t;
        })
      );

      // Remove from transferMarket by both ID and normalized name
      setTransferMarket(prev =>
        (Array.isArray(prev) ? prev : []).filter(
          p =>
            p &&
            p.id &&
            p.id !== neg.playerId &&
            (normSignedName ? normalizePlayerKey(p.name) !== normSignedName : true)
        )
      );

      const historyEntry: TransferHistoryEntry = {
        id: `th_neg_comp_${neg.id}_${Date.now()}`,
        date: calendarDate.formattedArabic,
        playerName: neg.playerName,
        playerId: neg.playerId,
        playerRating: fullPlayer.overallRating || neg.playerOverall,
        position: fullPlayer.position || neg.playerPosition,
        fromClubName: neg.playerClubName || 'وكيل حر',
        toClubName: userClub.name,
        fee: finalFee,
        salary: finalSalary,
        seasonNumber: season.seasonNumber,
        type: 'buy',
        timestamp: Date.now(),
      };
      setTransferHistory(prev => [historyEntry, ...(Array.isArray(prev) ? prev : [])]);

      setClubEconomy(prev => ({
        ...prev,
        transferSpendingTotal: (prev.transferSpendingTotal || 0) + finalFee,
        currentSeasonNetProfit: (prev.currentSeasonNetProfit || 0) - finalFee,
      }));

      setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId && n.playerId !== neg.playerId));

      const msg: InboxMessage = {
        id: `msg_trans_signed_${Date.now()}_${neg.playerId}`,
        title: `تم إتمام التعاقد الرسمي مع ${neg.playerName}! ✍️`,
        sender: 'لجنة التعاقدات والاحتراف',
        date: calendarDate.formattedArabic,
        type: 'transfer',
        read: false,
        content: `تم توقيع العقود رسمياً مع اللاعب ${neg.playerName} قادماً من (${neg.playerClubName || 'صفقة حرة'}) مقابل ${finalFee.toLocaleString()} ج.م وبراتب شهري ${finalSalary.toLocaleString()} ج.م لمدة ${safeYears} سنوات، وانضم اللاعب مباشرة لقائمة فريقك.`,
      };
      setInbox(prev => [msg, ...prev]);

      return {
        success: true,
        message: `تم حسم الصفقة بنجاح! انضم ${neg.playerName} رسمياً إلى قائمة فريقك.`,
      };
    }

    return { success: false, message: 'إجراء غير معروف.' };
  };

  const cancelNegotiation = (negotiationId: string) => {
    setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));
  };

  // Player Interaction / Meeting
  const holdPlayerMeeting = (
    playerId: string,
    topic: 'praise' | 'encourage' | 'promise_gametime' | 'wage_review'
  ): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً.' };
    const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
    const player = squadPlayers.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'اللاعب غير موجود في الفريق.' };

    let moraleBoost = 5;
    let message = '';

    if (topic === 'praise') {
      moraleBoost = 12;
      message = `أثنيت على التزام وأداء ${player.name}، مما رفع معنوياته بشكل كبير!`;
    } else if (topic === 'encourage') {
      moraleBoost = 8;
      message = `قدمت كلمات تشجيعية لـ ${player.name} وحفزته للقتال على مركزه.`;
    } else if (topic === 'promise_gametime') {
      moraleBoost = 15;
      message = `وعدت ${player.name} بالحصول على دقائق لعب كافية في المباريات القادمة.`;
    } else if (topic === 'wage_review') {
      moraleBoost = 6;
      message = `ناقشت مع ${player.name} خطط الإدارة بخصوص تقييم الرواتب والعقود.`;
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        players: (t.players || []).map(p => {
          if (p.id === playerId) {
            return {
              ...p,
              morale: Math.min(100, p.morale + moraleBoost),
            };
          }
          return p;
        }),
      };
    }));

    return { success: true, message };
  };

  // Player Financial Bonuses & Rewards
  const addBonusToPlayer = (
    playerId: string,
    amount: number,
    source: 'club' | 'manager' | 'grant' = 'club'
  ): { success: boolean; message: string } => {
    if (amount <= 0) return { success: false, message: 'يرجى إدخال مبلغ مكافأة صالح أكبر من الصفر.' };
    if (!userClub) return { success: false, message: 'ليس لديك فريق حالياً.' };

    const targetPlayer = (userClub.players || []).find(p => p.id === playerId);
    if (!targetPlayer) return { success: false, message: 'اللاعب غير موجود في قائمة الفريق.' };

    if (source === 'club') {
      if ((userClub.budget || 0) < amount) {
        return { success: false, message: `ميزانية النادي غير كافية (${(userClub.budget || 0).toLocaleString()} ج.م).` };
      }
    } else if (source === 'manager') {
      if ((manager.personalWallet || 0) < amount) {
        return { success: false, message: `رصيدك الشخصي في المحفظة غير كافٍ (${(manager.personalWallet || 0).toLocaleString()} ج.م).` };
      }
    }

    // Deduct funding
    if (source === 'club') {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub) return t;
        return {
          ...t,
          budget: Math.max(0, t.budget - amount),
          transferBudget: Math.max(0, t.transferBudget - amount),
        };
      }));
      setClubEconomy(prev => ({
        ...prev,
        clubBudget: Math.max(0, prev.clubBudget - amount),
      }));
    } else if (source === 'manager') {
      const tx: ManagerTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: `الجولة ${currentRound}`,
        amount,
        type: 'player_bonus',
        description: `صرف مكافأة شخصية للاعب ${targetPlayer.name} بمبلغ ${amount.toLocaleString()} ج.م`,
      };
      setManager(prev => ({
        ...prev,
        personalWallet: Math.max(0, (prev.personalWallet || 0) - amount),
        financialTransactions: [tx, ...(prev.financialTransactions || [])].slice(0, 30),
      }));
    }

    // Update target player savings and morale
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        players: (t.players || []).map(p => {
          if (p.id !== playerId) return p;
          const currentSavings = p.savings !== undefined ? p.savings : calculateInitialPlayerSavings(p);
          return {
            ...p,
            savings: currentSavings + amount,
            totalBonusesReceived: (p.totalBonusesReceived || 0) + amount,
            morale: Math.min(100, (p.morale || 85) + (amount >= 20000 ? 15 : 10)),
            moraleStatus: 'ecstatic' as const,
            moraleReason: `سعيد جداً بحصوله على مكافأة مالية تحفيزية بقيمة ${amount.toLocaleString()} ج.م`,
          };
        }),
      };
    }));

    return {
      success: true,
      message: `تم إيداع مكافأة ${amount.toLocaleString()} ج.م في رصيد اللاعب ${targetPlayer.name} بنجاح! 💰`,
    };
  };

  const addBonusToAllPlayers = (
    amountPerPlayer: number,
    source: 'club' | 'manager' | 'grant' = 'club'
  ): { success: boolean; message: string } => {
    if (amountPerPlayer <= 0) return { success: false, message: 'يرجى إدخال مبلغ مكافأة صالح أكبر من الصفر.' };
    if (!userClub) return { success: false, message: 'ليس لديك فريق حالياً.' };

    const squad = userClub.players || [];
    if (squad.length === 0) return { success: false, message: 'قائمة الفريق خالية.' };

    const totalCost = amountPerPlayer * squad.length;

    if (source === 'club') {
      if ((userClub.budget || 0) < totalCost) {
        return {
          success: false,
          message: `ميزانية النادي لا تكفي لصرف المكافأة للجميع. المطلوب: ${totalCost.toLocaleString()} ج.م | المتاح: ${(userClub.budget || 0).toLocaleString()} ج.م`,
        };
      }
    } else if (source === 'manager') {
      if ((manager.personalWallet || 0) < totalCost) {
        return {
          success: false,
          message: `محفظتك الشخصية لا تكفي للمكافأة الجماعية. المطلوب: ${totalCost.toLocaleString()} ج.م | رصيدك: ${(manager.personalWallet || 0).toLocaleString()} ج.م`,
        };
      }
    }

    // Deduct funding
    if (source === 'club') {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub) return t;
        return {
          ...t,
          budget: Math.max(0, t.budget - totalCost),
          transferBudget: Math.max(0, t.transferBudget - totalCost),
        };
      }));
      setClubEconomy(prev => ({
        ...prev,
        clubBudget: Math.max(0, prev.clubBudget - totalCost),
      }));
    } else if (source === 'manager') {
      const tx: ManagerTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: `الجولة ${currentRound}`,
        amount: totalCost,
        type: 'player_bonus',
        description: `صرف مكافأة جماعية لجميع لاعبي الفريق (${squad.length} لاعبين) بمبلغ ${totalCost.toLocaleString()} ج.م`,
      };
      setManager(prev => ({
        ...prev,
        personalWallet: Math.max(0, (prev.personalWallet || 0) - totalCost),
        financialTransactions: [tx, ...(prev.financialTransactions || [])].slice(0, 30),
      }));
    }

    // Update all squad players
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        players: (t.players || []).map(p => {
          const currentSavings = p.savings !== undefined ? p.savings : calculateInitialPlayerSavings(p);
          return {
            ...p,
            savings: currentSavings + amountPerPlayer,
            totalBonusesReceived: (p.totalBonusesReceived || 0) + amountPerPlayer,
            morale: Math.min(100, (p.morale || 85) + 15),
            moraleStatus: 'ecstatic' as const,
            moraleReason: `معنويات مرتفعة بفضل المكافأة الجماعية (${amountPerPlayer.toLocaleString()} ج.م)`,
          };
        }),
      };
    }));

    // Add inbox celebratory message
    const bonusMsg: InboxMessage = {
      id: `msg_bonus_${Date.now()}`,
      title: `صرف مكافأة مالية لجميع لاعبي الفريق! 🎁💰`,
      sender: source === 'manager' ? 'المدير الفني (أنت شخصياً)' : 'مجلس الإدارة والمدرب',
      date: `الجولة ${currentRound}`,
      type: 'finance',
      content: `تم رسمياً صرف مكافأة مالية قدرها ${amountPerPlayer.toLocaleString()} ج.م لكل لاعب بالفريق بإجمالي ${totalCost.toLocaleString()} ج.م (${source === 'manager' ? 'من أموالك الخاصة' : 'من خزينة النادي'}). سادت حالة من البهجة والارتياح الشديد بين اللاعبين!`,
      read: false,
    };
    setInbox(prev => [bonusMsg, ...prev]);

    return {
      success: true,
      message: `تم صرف مكافأة ${amountPerPlayer.toLocaleString()} ج.م لكل لاعب (${squad.length} لاعبين) بإجمالي ${totalCost.toLocaleString()} ج.م بنجاح! 🚀`,
    };
  };

  // Manager Personal Wealth & Development Functions
  const donateToClubFromPersonalWallet = (amount: number): { success: boolean; message: string } => {
    if (amount <= 0) return { success: false, message: 'يرجى إدخال مبلغ دعم صالح أكبر من الصفر.' };
    if (!userClub) return { success: false, message: 'أنت لست مدرباً لأي نادٍ حالياً.' };

    const currentWallet = manager.personalWallet || 0;
    if (currentWallet < amount) {
      return {
        success: false,
        message: `رصيدك الشخصي غير كافٍ. رصيدك الحالي: ${currentWallet.toLocaleString()} ج.م`,
      };
    }

    // Deduct from manager wallet and record transaction
    const tx: ManagerTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: `الجولة ${currentRound}`,
      amount,
      type: 'club_donation',
      description: `دعم وتبرع مالي لخزينة النادي بمبلغ ${amount.toLocaleString()} ج.م من أموالك الخاصة`,
    };

    setManager(prev => ({
      ...prev,
      personalWallet: Math.max(0, (prev.personalWallet || 0) - amount),
      totalClubDonations: (prev.totalClubDonations || 0) + amount,
      reputation: Math.min(100, prev.reputation + (amount >= 50000 ? 5 : 2)),
      financialTransactions: [tx, ...(prev.financialTransactions || [])].slice(0, 30),
    }));

    // Add to club treasury
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        budget: t.budget + amount,
        transferBudget: t.transferBudget + amount,
      };
    }));
    setClubEconomy(prev => ({
      ...prev,
      clubBudget: prev.clubBudget + amount,
    }));

    // Boost board satisfaction and confidence
    setBoardSystem(prev => ({
      ...prev,
      confidence: Math.min(100, prev.confidence + 15),
      fanConfidence: Math.min(100, (prev.fanConfidence || 75) + 12),
    }));

    // Add thank-you message to inbox
    const thankYouMsg: InboxMessage = {
      id: `msg_donation_${Date.now()}`,
      title: `خطاب شكر وتقدير وعرفان من مجلس الإدارة 🌟🤝`,
      sender: 'رئيس مجلس الإدارة',
      date: `الجولة ${currentRound}`,
      type: 'board',
      content: `يتقدم مجلس الإدارة وجماهير نادي ${userClub.name} بخالص الشكر وعظيم التقدير لموقفك التاريخي بالتبرع ودعم خزينة النادي بمبلغ ${amount.toLocaleString()} ج.م من أموالك الخاصة! هذا الوفاء والإخلاص يرفع من رصيدك في قلوب الجميع.`,
      read: false,
    };
    setInbox(prev => [thankYouMsg, ...prev]);

    return {
      success: true,
      message: `تم تحويل ${amount.toLocaleString()} ج.م من محفظتك الشخصية إلى خزينة النادي بنجاح! ارتفعت ثقة الإدارة والجماهير. 👏`,
    };
  };

  const enrollInCoachingCourse = (courseId: string): { success: boolean; message: string } => {
    const course = COACHING_COURSES.find(c => c.id === courseId);
    if (!course) return { success: false, message: 'الرخصة أو الدورة التدريبية غير موجودة.' };

    // 4-Tier License rank hierarchy (BASIC -> PREMIER -> CONTINENTAL -> LEGENDARY)
    const licenseRanks: Record<string, number> = {
      'BASIC': 1,
      'PREMIER': 2,
      'CONTINENTAL': 3,
      'LEGENDARY': 4,
    };
    const currentLicense = normalizeCoachingLicense(manager.license);
    const currentRank = licenseRanks[currentLicense] || 1;
    const ownedLicensesList = Array.from(new Set(['BASIC', ...(manager.ownedLicenses || []).map(l => normalizeCoachingLicense(l))]));

    // Check if this is a coaching license purchase/upgrade
    if (course.category === 'license' && course.grantsLicense) {
      const targetLicense = normalizeCoachingLicense(course.grantsLicense);
      const targetRank = licenseRanks[targetLicense] || 1;
      const alreadyOwned = ownedLicensesList.includes(targetLicense) || currentRank >= targetRank;

      if (alreadyOwned && currentLicense === targetLicense) {
        return {
          success: false,
          message: `أنت تمتلك وتستخدم حالياً (${getLicenseTitleArabic(targetLicense)}) بالفعل.`,
        };
      }

      // Purchase price is paid once from manager.personalWallet ONLY
      const purchaseCost = alreadyOwned ? 0 : course.cost;
      const currentWallet = manager.personalWallet || 0;
      if (currentWallet < purchaseCost) {
        return {
          success: false,
          message: `رصيد ميزانيتك الشخصية (${currentWallet.toLocaleString()}$) لا يكفي لشراء ${course.title} (${purchaseCost.toLocaleString()}$). يتم خصم تكاليف الرخص حصرياً من الرصيد الشخصي للمدرب وليس من ميزانية النادي.`,
        };
      }
    } else {
      // Tactical or specialist course
      const currentWallet = manager.personalWallet || 0;
      if (currentWallet < course.cost) {
        return {
          success: false,
          message: `رصيدك الشخصي (${currentWallet.toLocaleString()}$) لا يكفي لتكلفة الدورة (${course.cost.toLocaleString()}$).`,
        };
      }

      if (course.requiredLicense) {
        const reqNorm = normalizeCoachingLicense(course.requiredLicense);
        const requiredRank = licenseRanks[reqNorm] || 1;
        if (currentRank < requiredRank) {
          return {
            success: false,
            message: `تتطلب هذه الدورة الحصول أولاً على (${getLicenseTitleArabic(reqNorm)}). رخصتك الحالية: ${getLicenseTitleArabic(currentLicense)}`,
          };
        }
      }

      if ((manager.completedCourses || []).includes(courseId)) {
        return { success: false, message: 'لقد أتممت هذه الدورة التدريبية مسبقاً.' };
      }
    }

    const tx: ManagerTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: `الجولة ${currentRound}`,
      amount: course.cost,
      type: course.category === 'license' ? 'license_upgrade' : 'course_license',
      description: course.category === 'license'
        ? `شراء وترقية الرخصة التدريبية: ${course.title} (تُخصم من الرصيد الشخصي)`
        : `الالتحاق بـ: ${course.title}`,
    };

    setManager(prev => {
      const prevNormLicense = normalizeCoachingLicense(prev.license);
      const prevOwned = Array.from(new Set(['BASIC', ...(prev.ownedLicenses || []).map(l => normalizeCoachingLicense(l))])) as any[];
      const targetLic = course.grantsLicense ? normalizeCoachingLicense(course.grantsLicense) : null;
      const isAlreadyOwned = targetLic ? prevOwned.includes(targetLic) : false;
      const actualCost = (course.category === 'license' && isAlreadyOwned) ? 0 : course.cost;

      const newWallet = Math.max(0, (prev.personalWallet || 0) - actualCost);
      let newLicense = prevNormLicense;
      const updatedOwned = [...prevOwned];

      if (targetLic) {
        newLicense = targetLic;
        if (!updatedOwned.includes(targetLic)) {
          updatedOwned.push(targetLic);
        }
      }

      const newCompleted = [...(prev.completedCourses || [])];
      if (!newCompleted.includes(courseId)) {
        newCompleted.push(courseId);
      }
      const newXp = prev.xp + course.xpReward;
      let newLevel = prev.level;
      let newXpToNext = prev.xpToNextLevel;
      if (newXp >= newXpToNext) {
        newLevel += 1;
        newXpToNext = Math.round(newXpToNext * 1.5);
      }
      const newRep = Math.min(100, prev.reputation + course.reputationReward);
      const newRankPts = (prev.rankingPoints || 1200) + (course.category === 'license' ? course.reputationReward * 8 : 15);

      let extraDevPts = 0;
      if (course.id === 'workshop_gegenpress') extraDevPts = 25;
      if (course.id === 'fellowship_elite') extraDevPts = 50;

      return {
        ...prev,
        personalWallet: newWallet,
        license: newLicense,
        ownedLicenses: updatedOwned,
        completedCourses: newCompleted,
        xp: newXp,
        level: newLevel,
        xpToNextLevel: newXpToNext,
        reputation: newRep,
        rankingPoints: newRankPts,
        developmentPoints: (prev.developmentPoints || 0) + extraDevPts,
        financialTransactions: [tx, ...(prev.financialTransactions || [])].slice(0, 30),
      };
    });

    // Special Course side-effects
    if (course.id === 'course_psychology') {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub) return t;
        return {
          ...t,
          players: (t.players || []).map(p => ({
            ...p,
            morale: 100,
            moraleStatus: 'ecstatic' as const,
            moraleReason: 'تأثير إيجابي من دبلومة علم النفس الرياضي للمدرب',
          })),
        };
      }));
    }

    if (course.id === 'course_conditioning') {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub) return t;
        return {
          ...t,
          players: (t.players || []).map(p => ({
            ...p,
            fitness: Math.min(100, (p.fitness || 90) + 15),
          })),
        };
      }));
    }

    const courseInboxMsg: InboxMessage = {
      id: `msg_course_${Date.now()}`,
      title: `🎓 إتمام دورة تدريبية: ${course.title}`,
      sender: 'أكاديمية إعداد القادة والمدربين',
      date: `الجولة ${currentRound}`,
      type: 'news',
      content: `أتممت بنجاح متطلبات "${course.title}". تم تسجيل المزايا والمكتسبات الفنية: ${course.specialBenefit} وحصلت على ${course.xpReward} XP و +${course.reputationReward} سمعة تدريبية.`,
      read: false,
    };
    setInbox(prev => [courseInboxMsg, ...prev]);

    return {
      success: true,
      message: `تهانينا! أتممت بنجاح "${course.title}". ${course.specialBenefit} 🎓🏆`,
    };
  };

  /**
   * Opens an ad-unlockable course (tactic workshop) until the end of the CURRENT season.
   * Called after the rewarded ad was completed. It never charges money and grants no XP/dev points
   * (those belong to the permanent purchase), so it cannot be farmed.
   */
  const unlockCourseForSeason = (courseId: string): { success: boolean; message: string } => {
    const course = COACHING_COURSES.find(c => c.id === courseId);
    if (!course || !course.adUnlockable) {
      return { success: false, message: 'هذه الدورة لا تُفتح بالإعلانات.' };
    }
    const seasonNum = season?.seasonNumber || 1;
    const access = getCourseAccess(manager, courseId, seasonNum);
    if (access === 'owned') return { success: false, message: 'هذه الدورة مملوكة لك بشكل دائم بالفعل.' };
    if (access === 'season') return { success: false, message: 'هذه الدورة مفتوحة لك بالفعل حتى نهاية الموسم.' };

    if (course.requiredLicense) {
      const ranks: Record<string, number> = { BASIC: 1, PREMIER: 2, CONTINENTAL: 3, LEGENDARY: 4 };
      const reqNorm = normalizeCoachingLicense(course.requiredLicense);
      const cur = normalizeCoachingLicense(manager.license);
      if ((ranks[cur] || 1) < (ranks[reqNorm] || 1)) {
        return { success: false, message: `تتطلب هذه الدورة الحصول أولاً على (${getLicenseTitleArabic(reqNorm)}).` };
      }
    }

    setManager(prev => ({
      ...prev,
      seasonCourseAccess: { ...(prev.seasonCourseAccess || {}), [courseId]: seasonNum },
    }));

    setInbox(prev => [
      {
        id: `msg_course_season_${Date.now()}`,
        title: `🎓 تم فتح "${course.title}" حتى نهاية الموسم ${seasonNum}`,
        sender: 'أكاديمية إعداد القادة والمدربين',
        date: `الجولة ${currentRound}`,
        type: 'news',
        content: `${course.specialBenefit}\n\nالدورة مفتوحة لك حتى نهاية الموسم ${seasonNum}، وبعدها تُغلق ما لم تشترِها بشكل دائم.`,
        read: false,
      } as InboxMessage,
      ...prev,
    ]);

    return { success: true, message: `تم فتح "${course.title}" حتى نهاية الموسم ${seasonNum}! ${course.specialBenefit}` };
  };

  const resetGame = (startingClubId?: string) => {
    // Clear storage repository (IndexedDB and localStorage mirrors)
    gameStateRepository.clearLocalGameState().catch(err => console.warn('Error clearing local game state:', err));

    localStorage.removeItem(`${STORAGE_KEY}_season`);
    localStorage.removeItem(`${STORAGE_KEY}_activeLeague`);
    localStorage.removeItem(`${STORAGE_KEY}_teams`);
    localStorage.removeItem(`${STORAGE_KEY}_standings`);
    localStorage.removeItem(`${STORAGE_KEY}_fixtures`);
    localStorage.removeItem(`${STORAGE_KEY}_currentRound`);
    localStorage.removeItem(`${STORAGE_KEY}_manager`);
    localStorage.removeItem(`${STORAGE_KEY}_transferMarket`);
    localStorage.removeItem(`${STORAGE_KEY}_incomingBids`);
    localStorage.removeItem(`${STORAGE_KEY}_inbox`);
    localStorage.removeItem(`${STORAGE_KEY}_cupTournament`);
    localStorage.removeItem(`${STORAGE_KEY}_jobOffers`);
    localStorage.removeItem(`${STORAGE_KEY}_seasonEndSummary`);
    localStorage.removeItem(`${STORAGE_KEY}_transferHistory`);
    localStorage.removeItem(`${STORAGE_KEY}_clubEconomy`);
    localStorage.removeItem(`${STORAGE_KEY}_calendarDate`);
    localStorage.removeItem(`${STORAGE_KEY}_activeNegotiations`);
    localStorage.removeItem(`${STORAGE_KEY}_boardSystem`);
    localStorage.removeItem(`${STORAGE_KEY}_dailyNews`);
    localStorage.removeItem(`${STORAGE_KEY}_retiredPlayers`);
    localStorage.removeItem(`${STORAGE_KEY}_worldRankings`);
    resetWorldTransfers();
    setWorldRankings(prev => ({ ...prev, worldMoves: undefined, worldEra: undefined }));
    localStorage.removeItem(`${STORAGE_KEY}_scoutedOpponents`);
    localStorage.removeItem(`${STORAGE_KEY}_deletedMessageIds`);

    const rawTeams = applyWorldOverridesToClubs(INITIAL_TEAMS);
    const chosenClubId = startingClubId || 'team_user';
    const freshTeams = rawTeams.map(t => ({
      ...t,
      isUserClub: t.id === chosenClubId,
    }));
    const chosenUserClub = freshTeams.find(t => t.id === chosenClubId) || freshTeams[0];
    const freshMarket = applyWorldOverridesToMarket(INITIAL_TRANSFER_MARKET);

    const freshAgenda = generateMasterSeasonAgenda(1, EGYPT_TIER_4_LEAGUE, freshTeams, undefined, undefined, chosenUserClub);
    const maxR = freshAgenda.length > 0 ? Math.max(...freshAgenda.map(f => f.round)) : 34;

    setSeason({ ...INITIAL_SEASON, totalRounds: maxR });
    setActiveLeague(EGYPT_TIER_4_LEAGUE);
    setTeams(freshTeams);
    setStandings(generateInitialStandings(freshTeams));
    setCupTournament(null);
    setFixtures(freshAgenda);
    setCurrentRound(1);
    setManager({
      ...INITIAL_MANAGER,
      currentClubId: chosenUserClub.id,
      clubsManaged: [chosenUserClub.name],
    });
    setTransferMarket(freshMarket);
    setIncomingBids([]);
    setDeletedMessageIds([]);
    setInbox(INITIAL_INBOX.map((msg, idx) => idx === 0 ? {
      ...msg,
      title: `مرحباً بك في ${chosenUserClub.name}!`,
      content: `يا كابتن، بنرحب بيك على رأس القيادة الفنية لنادي ${chosenUserClub.name} العريق في دوري الدرجة الرابعة. الجماهير هنا بتعشق الكورة ومستنية منك تصعد بالفريق للدرجة الثالثة وتعمل موسم تاريخي. الخزينة فيها ${chosenUserClub.budget.toLocaleString()} جنيه، والقائمة تحت أمرك. ورينا شطارتك وتكتيكك!`,
    } : msg));
    setJobOffers([]);
    setSeasonEndSummary(null);
    setShowSeasonTransitionModal(false);
    setLiveMatch(null);
    setTransferHistory([]);
    setClubEconomy({
      clubBudget: chosenUserClub.budget || 85000,
      transferSpendingTotal: 0,
      transferIncomeTotal: 0,
      salaryExpensesTotal: 0,
      sponsorIncomeTotal: 0,
      matchIncomeTotal: 0,
      facilitySpendingTotal: 0,
      currentSeasonNetProfit: 0,
    });
    setCalendarDate(getInitialSeasonDate(1));
    setActiveNegotiations([]);
    setBoardSystem(generateInitialBoardSystem(chosenUserClub, 4, freshTeams.length, freshTeams, false));
    setDailyNews([]);
    setRetiredPlayers([]);
    setScoutedOpponents({});

    gameStateRepository.saveSeasonSnapshot(1, {
      teams: freshTeams,
      clubBudget: chosenUserClub.budget || 85000,
      manager: {
        ...INITIAL_MANAGER,
        currentClubId: chosenUserClub.id,
        clubsManaged: [chosenUserClub.name],
      },
      transferMarket: freshMarket,
      calendarDate: getInitialSeasonDate(1),
      activeLeagueId: EGYPT_TIER_4_LEAGUE.id,
      seasonNumber: 1,
    });
  };

  const selectStartingClub = (clubId: string): boolean => {
    const target = teams.find(t => t.id === clubId);
    if (!target) return false;

    const updatedTeams = teams.map(t => ({
      ...t,
      isUserClub: t.id === clubId,
    }));
    setTeams(updatedTeams);
    setManager(prev => {
      const updated = {
        ...prev,
        currentClubId: target.id,
        clubsManaged: Array.from(new Set([...(prev.clubsManaged || []), target.name])),
      };
      try {
        localStorage.setItem(`${STORAGE_KEY}_manager`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setClubEconomy(prev => ({
      ...prev,
      clubBudget: target.budget,
    }));
    setBoardSystem(generateInitialBoardSystem(target, 4, updatedTeams.length, updatedTeams, false));

    gameStateRepository.saveSeasonSnapshot(season.seasonNumber || 1, {
      teams: updatedTeams,
      clubBudget: target.budget,
      manager: {
        ...manager,
        currentClubId: target.id,
        clubsManaged: Array.from(new Set([...(manager.clubsManaged || []), target.name])),
      },
      calendarDate: getInitialSeasonDate(1),
      activeLeagueId: activeLeague.id,
      seasonNumber: season.seasonNumber || 1,
    });

    return true;
  };

  const updateManagerName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setManager(prev => {
      const updated = { ...prev, name: trimmed };
      try {
        localStorage.setItem(`${STORAGE_KEY}_manager`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    saveLocalTrainerProfile({
      name: trimmed,
      age: manager.age || 35,
      nationality: manager.nationality || 'مصري',
    });

    try {
      const currentPayload = exportCurrentSavePayload();
      gameStateRepository.saveLocalGameState({
        ...(currentPayload as any),
        manager: { ...currentPayload.manager, name: trimmed },
        lastLocalSaveAt: Date.now(),
      });
    } catch (err) {
      console.warn('[GameContext] Failed to immediately save updated manager name:', err);
    }
  };

  const updateTrainerProfile = (name: string, age: number, nationality: string) => {
    const trimmed = name.trim();
    const finalNat = nationality.trim();
    setManager(prev => {
      const updated = {
        ...prev,
        name: trimmed || prev.name,
        age: age || prev.age,
        nationality: finalNat || prev.nationality,
      };
      try {
        localStorage.setItem(`${STORAGE_KEY}_manager`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    saveLocalTrainerProfile({
      name: trimmed || manager.name,
      age: age || manager.age || 35,
      nationality: finalNat || manager.nationality || 'مصري',
    });

    try {
      const currentPayload = exportCurrentSavePayload();
      gameStateRepository.saveLocalGameState({
        ...(currentPayload as any),
        manager: {
          ...currentPayload.manager,
          name: trimmed || currentPayload.manager?.name,
          age: age || currentPayload.manager?.age,
          nationality: finalNat || currentPayload.manager?.nationality,
        },
        lastLocalSaveAt: Date.now(),
      });
    } catch (err) {
      console.warn('[GameContext] Failed to immediately save updated trainer profile:', err);
    }
  };

  const exportCurrentSavePayload = useCallback(() => {
    return {
      schemaVersion: 2,
      saveVersion: 1,
      lastLocalSaveAt: Date.now(),
      season,
      activeLeague,
      teams,
      standings,
      fixtures,
      currentRound,
      manager,
      transferMarket,
      incomingBids,
      inbox,
      cupTournament,
      jobOffers,
      seasonEndSummary,
      transferHistory,
      clubEconomy,
      calendarDate,
      activeNegotiations,
      boardSystem,
      dailyNews,
      retiredPlayers,
      worldRankings,
      scoutedOpponents,
      deletedMessageIds,
      dailyRewardState,
    };
  }, [
    season, activeLeague, teams, standings, fixtures, currentRound, manager,
    transferMarket, incomingBids, inbox, cupTournament, jobOffers, seasonEndSummary,
    transferHistory, clubEconomy, calendarDate, activeNegotiations, boardSystem,
    dailyNews, retiredPlayers, worldRankings, scoutedOpponents, deletedMessageIds,
    dailyRewardState
  ]);

  // ----------------------------------------------------
  // SCOUTING & OPPONENT SPY METHOD
  // ----------------------------------------------------
  const scoutOpponent = (oppClubId: string): { success: boolean; message: string; report?: OpponentScoutingReport } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    const opp = teams.find(t => t.id === oppClubId);
    if (!opp) return { success: false, message: 'النادي المنافس غير موجود.' };

    const SCOUT_COST = 100000;
    if (userClub.budget < SCOUT_COST) {
      return {
        success: false,
        message: `ميزانية النادي (${userClub.budget.toLocaleString()} ج.م) لا تكفي لدفع تكلفة التجسس الكشفي (${SCOUT_COST.toLocaleString()} ج.م)!`
      };
    }

    // Deduct 100k from club budget
    setTeams(prevTeams => prevTeams.map(t => {
      if (t.isUserClub || t.id === userClub.id) {
        return {
          ...t,
          budget: Math.max(0, t.budget - SCOUT_COST)
        };
      }
      return t;
    }));

    // Update club economy
    setClubEconomy(prev => ({
      ...prev,
      otherExpensesTotal: prev.otherExpensesTotal + SCOUT_COST,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - SCOUT_COST
    }));

    // Generate Report
    const report = generateOpponentScoutingReport(
      opp,
      currentRound,
      calendarDate.rawDateStr,
      calendarDate.formattedArabic,
      userClub
    );

    setScoutedOpponents(prev => ({
      ...prev,
      [oppClubId]: report
    }));

    const scoutMsg: InboxMessage = {
      id: `msg_scout_${Date.now()}_${oppClubId}`,
      title: `تقرير التجسس والتكتيك الخاص بـ ${opp.name} جاهز! 🕵️‍♂️`,
      sender: 'كبير كشافي ومحللي النادي',
      date: calendarDate.formattedArabic,
      type: 'board',
      read: false,
      content: `تم الانتهاء من مهمة التجسس الكشفي على تدريبات وخطة ${opp.name}. الخطة المتوقعة: ${report.predictedFormation}، ومعدل دقة التقرير ${report.scoutConfidenceRating}%. تم إيداع التقرير في صفحة المباريات.`
    };
    setInbox(prev => [scoutMsg, ...prev]);

    return {
      success: true,
      message: `تم التجسس بنجاح على ${opp.name} وتجهيز التقرير الفني الشامل! تم خصم 100,000 ج.م من الميزانية.`,
      report
    };
  };

  // ----------------------------------------------------
  // ADMOB REWARD SYSTEM (المنظومة المركزية لمكافآت الإعلانات)
  // ----------------------------------------------------
  const claimAdReward = (
    rewardType: AdRewardType,
    boostSubtype: TrainingBoostType = 'fitness'
  ): { success: boolean; message: string } => {
    if (!ADMOB_CONFIG.ENABLE_REWARDS) {
      return {
        success: false,
        message: 'تم إيقاف نظام المكافآت مؤقتاً',
      };
    }

    // Automatically count rewarded ads towards the challenges & retention system
    challengesManager.recordAdWatched();

    if (rewardType === 'coins') {
      const coinAmount = 50;
      setManager(prev => ({
        ...prev,
        personalWallet: (prev.personalWallet || 0) + (coinAmount * 100),
      }));

      try {
        const authData = localStorage.getItem('anta_el_modareb_auth_user');
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.virtualCoins = (parsed.virtualCoins || 0) + coinAmount;
          localStorage.setItem('anta_el_modareb_auth_user', JSON.stringify(parsed));
        }
      } catch (_) {}

      return {
        success: true,
        message: `تم إضافة ${coinAmount} كوينز بنجاح إلى رصيدك! 🪙`,
      };
    }

    if (rewardType === 'club_funds') {
      const fundAmount = 100000;
      if (!userClub) {
        return { success: false, message: 'يجب أن تدرب نادياً لاستلام الدعم المالي!' };
      }

      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        return {
          ...t,
          budget: (t.budget || 0) + fundAmount,
          transferBudget: (t.transferBudget || 0) + fundAmount,
        };
      }));

      setClubEconomy(prev => ({
        ...prev,
        clubBudget: prev.clubBudget + fundAmount,
      }));

      const sponsorMsg: InboxMessage = {
        id: `msg_ad_sponsor_${Date.now()}`,
        title: 'منحة رعاية مالية فورية من الشريك الإعلاني 💵✨',
        sender: 'مدير التسويق والرعاية',
        date: `الجولة ${currentRound}`,
        type: 'finance',
        content: `تم تحويل دفعة تمويل إعلاني قدرها ${fundAmount.toLocaleString()} ج.م مباشرة إلى خزينة نادي ${userClub.name} وميزانية التعاقدات.`,
        read: false,
      };
      setInbox(prev => [sponsorMsg, ...prev]);

      return {
        success: true,
        message: `تم إيداع ${fundAmount.toLocaleString()} ج.م في خزينة النادي! 💵`,
      };
    }

    if (rewardType === 'team_energy') {
      if (!userClub) {
        return { success: false, message: 'لا يوجد فريق حالياً لإنعاش اللياقة!' };
      }

      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        return {
          ...t,
          players: t.players.map(p => ({
            ...p,
            fitness: Math.min(100, (p.fitness || 90) + 15),
          })),
        };
      }));

      return {
        success: true,
        message: 'تم إنعاش اللياقة البدنية لجميع لاعبي الفريق بنسبة +15%! ⚡',
      };
    }

    if (rewardType === 'training_boost') {
      const boost = AdManager.activateTrainingBoost(
        boostSubtype,
        currentRound,
        calendarDate?.formattedDate || `الجولة ${currentRound}`
      );
      return {
        success: true,
        message: `تم تفعيل (${boost.title}) للمباراة القادمة بنجاح! 🏋️`,
      };
    }

    return { success: false, message: 'نوع المكافأة غير معروف' };
  };

  // ----------------------------------------------------
  // CHALLENGES & RETENTION REWARD DISPATCHER
  // ----------------------------------------------------
  const grantChallengeReward = (reward: ChallengeReward): { success: boolean; message: string } => {
    if (reward.budget && reward.budget > 0 && userClub) {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        const newBudget = (t.budget || 0) + reward.budget;
        return {
          ...t,
          budget: newBudget,
          transferBudget: (t.transferBudget || 0) + reward.budget,
        };
      }));

      setClubEconomy(prev => ({
        ...prev,
        clubBudget: prev.clubBudget + reward.budget,
      }));
    }

    if (reward.coins && reward.coins > 0) {
      setManager(prev => ({
        ...prev,
        personalWallet: (prev.personalWallet || 0) + (reward.coins * 100),
      }));

      try {
        const authData = localStorage.getItem('anta_el_modareb_auth_user');
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.virtualCoins = (parsed.virtualCoins || 0) + reward.coins;
          localStorage.setItem('anta_el_modareb_auth_user', JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    if (reward.devPoints && reward.devPoints > 0) {
      grantDevelopmentPoints(reward.devPoints, 'مكافأة إنجاز التحديات');
    }

    if (reward.energyPercent && reward.energyPercent > 0 && userClub) {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        return {
          ...t,
          players: (t.players || []).map(p => ({
            ...p,
            fitness: Math.min(100, (p.fitness || 85) + reward.energyPercent),
          })),
        };
      }));
    }

    if (reward.reputation && reward.reputation > 0) {
      setManager(prev => ({
        ...prev,
        reputation: (prev.reputation || 20) + reward.reputation,
      }));
    }

    return {
      success: true,
      message: `تم استلام الجائزة بنجاح: ${reward.label}`,
    };
  };

  // ----------------------------------------------------
  // PROMO / GIFT CODES SYSTEM (نظام أكواد الهدايا والمكافآت)
  // ----------------------------------------------------
  const redeemGiftCode = async (
    code: string,
    onAdStarting?: (info: { code: string; rewardAmount: number; rewardCoins: number }) => void
  ): Promise<{ success: boolean; message: string; rewardAmount?: number; rewardCoins?: number }> => {
    if (!userClub) {
      return { 
        success: false, 
        message: 'يجب أن تكون مرتبطاً بنادٍ أولاً لتتمكن من استرداد الكود وإيداع المكافأة المالية في ميزانيته!' 
      };
    }

    const managerInfo = {
      userId: user?.uid || manager.trainerId || getOrCreateGuestDeviceId(),
      managerName: manager.name || 'المدرب',
      clubName: userClub.name || 'النادي',
      trainerId: manager.trainerId,
    };

    try {
      // 1. Strictly validate the code BEFORE loading or showing any advertisement.
      // If the code is expired, invalid, exhausted, disabled, or already redeemed, this throws immediately and NO ad loads!
      const validated = await validatePromoCodeForRedemption(code, managerInfo);

      // 2. Notify caller that the code is valid and the user is eligible for the reward, so the ad is now starting
      if (onAdStarting) {
        try {
          onAdStarting({
            code: validated.officialCode,
            rewardAmount: validated.matchedCode.rewardAmount,
            rewardCoins: validated.matchedCode.rewardCoins || 0,
          });
        } catch {}
      }

      // 3. Load and play the Rewarded Ad ONLY now that we know the user will receive the code's funds
      return await new Promise<{ success: boolean; message: string; rewardAmount?: number; rewardCoins?: number }>(async (resolve) => {
        let settled = false;
        let committedResult: {
          success: boolean;
          message: string;
          rewardAmount: number;
          rewardCoins: number;
        } | null = null;

        const finishResolve = (result: { success: boolean; message: string; rewardAmount?: number; rewardCoins?: number }) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };

        const applyRewardPayout = () => {
          if (committedResult) return;

          const res = commitValidatedPromoCodeRedemption(validated, managerInfo);
          committedResult = {
            success: true,
            message: res.message,
            rewardAmount: res.rewardAmount,
            rewardCoins: res.rewardCoins,
          };

          challengesManager.recordAdWatched();

          // A. Inject cash directly into user club budget
          setTeams(prev => prev.map(t => {
            if (!t.isUserClub && t.id !== userClub.id) return t;
            return {
              ...t,
              budget: (t.budget || 0) + res.rewardAmount,
              transferBudget: (t.transferBudget || 0) + res.rewardAmount,
            };
          }));

          setClubEconomy(prev => ({
            ...prev,
            clubBudget: (prev.clubBudget || 0) + res.rewardAmount,
          }));

          // B. Add to manager career earnings and personal wallet if coins given
          setManager(prev => ({
            ...prev,
            careerEarnings: (prev.careerEarnings || 0) + res.rewardAmount,
            personalWallet: res.rewardCoins ? (prev.personalWallet || 0) + (res.rewardCoins * 100) : prev.personalWallet,
          }));

          if (res.rewardCoins && res.rewardCoins > 0) {
            try {
              const authData = localStorage.getItem('anta_el_modareb_auth_user');
              if (authData) {
                const parsed = JSON.parse(authData);
                parsed.virtualCoins = (parsed.virtualCoins || 0) + res.rewardCoins;
                localStorage.setItem('anta_el_modareb_auth_user', JSON.stringify(parsed));
              }
            } catch (_) {}
          }

          // C. Official banking inbox notification for the manager
          const bonusMsg: InboxMessage = {
            id: `msg_promo_${Date.now()}_${Math.random()}`,
            title: `🎁 استرداد كود هدية: إيداع (+${res.rewardAmount.toLocaleString()} ج.م) في الخزينة`,
            sender: 'إدارة اللعبة والمسابقات',
            date: `الجولة ${currentRound}`,
            type: 'board',
            read: false,
            content: `تهانينا يا كابتن ${manager.name}!\n\nتم التحقق من كود الهدية [${res.code}] ومشاهدة الإعلان بنجاح، وتم إيداع مبلغ قدره (${res.rewardAmount.toLocaleString()} جنيه مصري) مباشرة في ميزانية نادي ${userClub.name}.${res.rewardCoins ? `\nبالإضافة إلى منحك (${res.rewardCoins}) كوينز ذهبية!` : ''}\n\nبيان المكافأة: ${res.description}\n\nنتمنى لك كل التوفيق والانتصارات في قيادة ناديك!`,
          };
          setInbox(prev => [bonusMsg, ...prev]);

          // D. Save game automatically
          setTimeout(() => {
            saveToCloud(false).catch(() => {});
          }, 500);
        };

        try {
          const started = await AdManager.showRewardedForAction({
            actionType: 'redeem_promo_code',
            onUserEarnedReward: () => {
              applyRewardPayout();
            },
            onDismiss: (rewardEarned) => {
              if (rewardEarned || committedResult) {
                applyRewardPayout();
                finishResolve(committedResult!);
              } else {
                finishResolve({
                  success: false,
                  message: 'لم تكتمل مشاهدة الإعلان! يجب مشاهدة الإعلان بالكامل لاستلام أموال الكود.',
                });
              }
            },
            onFailure: (adErr) => {
              finishResolve({
                success: false,
                message: adErr?.message || 'تعذر تحميل الإعلان حالياً، لم يتم استهلاك الكود. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
              });
            },
          });

          if (!started && !committedResult) {
            finishResolve({
              success: false,
              message: 'تعذر تحميل الإعلان حالياً، لم يتم استهلاك الكود. يرجى المحاولة مرة أخرى.',
            });
          }
        } catch (adEx: any) {
          finishResolve({
            success: false,
            message: adEx?.message || 'حدث خطأ أثناء تشغيل الإعلان، لم يتم استهلاك الكود.',
          });
        }
      });
    } catch (err: any) {
      return { success: false, message: err?.message || 'حدث خطأ أثناء محاولة استرداد الكود.' };
    }
  };

  // ----------------------------------------------------
  // DAILY LOGIN REWARDS SYSTEM (نظام مكافآت تسجيل الدخول اليومي)
  // ----------------------------------------------------
  const claimDailyLoginReward = useCallback((): ClaimDailyRewardResult => {
    const todayStr = getLocalTodayDateString();

    // Check if already claimed today
    if (dailyRewardState.lastClaimDate === todayStr) {
      return {
        success: false,
        message: 'لقد استلمت مكافأتك اليومية بالفعل اليوم! عد غداً للاستمرار في سلسلة المكافآت والحصول على جوائز أكبر.',
      };
    }

    // Determine current streak
    let nextStreak = 1;
    if (dailyRewardState.lastClaimDate) {
      const daysDiff = calculateDaysDifference(dailyRewardState.lastClaimDate, todayStr);
      if (daysDiff === 1 && dailyRewardState.streak > 0) {
        // Consecutive day: advance in 1..7 cycle
        nextStreak = (dailyRewardState.streak % 7) + 1;
      } else if (daysDiff === 0) {
        return {
          success: false,
          message: 'تم استلام مكافأة اليوم مسبقاً!',
        };
      } else {
        // Missed one or more days: reset to Day 1
        nextStreak = 1;
      }
    } else {
      nextStreak = 1;
    }

    const rewardItem = DAILY_LOGIN_REWARDS_SCHEDULE.find(r => r.day === nextStreak) || DAILY_LOGIN_REWARDS_SCHEDULE[0];

    // 1. Grant Coins & Personal Wallet & Manager Development Points (Single atomic update)
    setManager(prev => ({
      ...prev,
      personalWallet: (prev.personalWallet || 0) + (rewardItem.coins * 100),
      careerEarnings: (prev.careerEarnings || 0) + (rewardItem.clubFunds || 0),
      developmentPoints: (prev.developmentPoints || 0) + (rewardItem.developmentPoints || 0),
    }));

    try {
      const authData = localStorage.getItem('anta_el_modareb_auth_user');
      if (authData) {
        const parsed = JSON.parse(authData);
        parsed.virtualCoins = (parsed.virtualCoins || 0) + rewardItem.coins;
        localStorage.setItem('anta_el_modareb_auth_user', JSON.stringify(parsed));
      }
    } catch (_) {}

    // 2. Grant Club Funds, Development Points & Squad Energy/Morale (Single atomic update)
    if (userClub) {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        return {
          ...t,
          budget: (t.budget || 0) + (rewardItem.clubFunds || 0),
          transferBudget: (t.transferBudget || 0) + (rewardItem.clubFunds || 0),
          developmentPoints: (t.developmentPoints || 0) + (rewardItem.developmentPoints || 0),
          players: (t.players || []).map(p => ({
            ...p,
            fitness: rewardItem.energyBoost ? Math.min(100, (p.fitness || 85) + 15) : p.fitness,
            morale: rewardItem.moraleBoost ? 100 : p.morale,
            moraleStatus: rewardItem.moraleBoost ? 'ecstatic' : p.moraleStatus,
          })),
        };
      }));

      if (rewardItem.clubFunds > 0) {
        setClubEconomy(prev => ({
          ...prev,
          clubBudget: (prev.clubBudget || 0) + rewardItem.clubFunds,
        }));
      }
    }

    // 3. Send celebratory message to manager's inbox
    const rewardMsg: InboxMessage = {
      id: `msg_daily_reward_${Date.now()}_${Math.random()}`,
      title: `🎁 استلام مكافأة تسجيل الدخول اليومية (اليوم ${nextStreak} من 7)`,
      sender: 'إدارة اللعبة والفعاليات اليومية',
      date: `الجولة ${currentRound}`,
      type: 'board',
      read: false,
      content: `تهانينا يا كابتن ${manager?.name || 'المدرب'}!\n\nتم استلام مكافأة تسجيل الدخول اليومي بنجاح:\n• 🪙 +${rewardItem.coins} كوينز ذهبية للرصيد والمحفظة\n• 💰 +${rewardItem.clubFunds.toLocaleString()} ج.م دعماً لميزانية النادي\n• ⭐ +${rewardItem.developmentPoints} نقاط تدريب وتطوير للاعبين\n${rewardItem.energyBoost ? '• ⚡ استعادة وشحن طاقة ولياقة جميع لاعبي الفريق\n' : ''}${rewardItem.moraleBoost ? '• 🔥 رفع الروح المعنوية للاعبين إلى الدرجة الممتازة\n' : ''}\nسلسلة تسجيل الدخول الحالية: ${nextStreak} يوم/أيام.\nإجمالي أيام الدخول التراكمية: ${(dailyRewardState.totalDaysClaimed || 0) + 1} يوم.\nاستمر في تسجيل الدخول اليومي لحصد الجائزة الكبرى!`,
    };
    setInbox(prev => [rewardMsg, ...prev]);

    // 4. Update dailyRewardState
    const updatedState: DailyLoginRewardState = {
      streak: nextStreak,
      lastClaimDate: todayStr,
      totalDaysClaimed: (dailyRewardState.totalDaysClaimed || 0) + 1,
      lastClaimTimestamp: Date.now(),
      history: [
        {
          date: todayStr,
          day: nextStreak,
          coins: rewardItem.coins,
          clubFunds: rewardItem.clubFunds,
          developmentPoints: rewardItem.developmentPoints,
          timestamp: Date.now(),
        },
        ...(dailyRewardState.history || []).slice(0, 30),
      ],
    };

    setDailyRewardState(updatedState);
    try {
      localStorage.setItem('anta_el_modareb_daily_login_rewards_v1', JSON.stringify(updatedState));
    } catch (_) {}

    return {
      success: true,
      message: `مبروك يا كابتن! حصلت على مكافأة اليوم (${nextStreak}) بنجاح! 🪙 +${rewardItem.coins} كوينز و +${rewardItem.clubFunds.toLocaleString()} ج.م`,
      reward: rewardItem,
      streak: nextStreak,
      isMilestone: rewardItem.isMilestone,
    };
  }, [
    dailyRewardState,
    manager?.name,
    userClub,
    currentRound,
  ]);

  // ----------------------------------------------------
  // CONTINENTAL & AL AHLY ADMIN SYSTEM
  // ----------------------------------------------------

  const switchUserClubToAlAhly = useCallback((): { success: boolean; message: string } => {
    try {
      const egyPremierLeague = GLOBAL_LEAGUES['egy_tier_1'] || {
        id: 'egy_tier_1',
        name: 'الدوري المصري الممتاز',
        shortName: 'الدوري المصري',
        country: 'مصر',
        countryCode: 'EGY',
        divisionTier: 1,
        tier: 1,
        reputation: 82,
        teamsCount: 18,
        promotionSpots: 0,
        relegationSpots: 3,
        playoffSpots: 0,
        teams: EGYPT_PREMIER_CLUBS,
      };

      // Load authentic Al Ahly squad
      let ahlyPlayers: Player[] = [];
      try {
        ahlyPlayers = loadRealClubSquad('eg1_ahly');
      } catch (err) {
        console.warn('Could not load real squad for Al Ahly:', err);
      }

      // Base Al Ahly definition
      const baseAhly = EGYPT_PREMIER_CLUBS.find(c => c.id === 'eg1_ahly') || {
        id: 'eg1_ahly',
        name: 'النادي الأهلي',
        shortName: 'الأهلي',
        city: 'القاهرة',
        country: 'مصر',
        countryCode: 'EGY',
        division: 1,
        divisionTier: 1,
        leagueId: 'egy_tier_1',
        reputation: 95,
        rating: 86,
        primaryColor: '#dc2626',
        secondaryColor: '#ffffff',
        budget: 15000000,
        transferBudget: 8000000,
        wageBudgetMonthly: 2000000,
        stadiumName: 'استاد القاهرة الدولي',
        stadiumCapacity: 75000,
        stadiumLevel: 5,
        isUserClub: true,
        players: [],
        sponsors: [],
        facilities: {
          stadiumName: 'استاد القاهرة الدولي',
          stadiumCapacity: 75000,
          stadiumLevel: 5,
          medicalCenterLevel: 5,
          trainingGroundLevel: 5,
          youthAcademyLevel: 5,
          scoutingNetworkLevel: 5,
        },
      };

      const finalSquad = (ahlyPlayers.length > 0 ? ahlyPlayers : (baseAhly.players || [])).filter(Boolean).map(p => ({
        ...p,
        fitness: 100,
        morale: 100,
        moraleStatus: 'ecstatic' as const,
        form: 8.5,
        isInjured: false,
        injury: null,
        isSuspended: false,
        suspensionMatches: 0,
      }));

      const startingIds = finalSquad.slice(0, 11).map(p => p.id);
      const benchIds = finalSquad.slice(11, 18).map(p => p.id);

      const alAhlyUserClub: Club = {
        ...baseAhly,
        isUserClub: true,
        budget: 15000000,
        transferBudget: 8000000,
        wageBudgetMonthly: 2000000,
        players: finalSquad,
        tactics: {
          formation: '4-3-3',
          mentality: 'attacking',
          passingStyle: 'short',
          pressingIntensity: 'high',
          tempo: 'fast',
          startingPlayerIds: startingIds,
          benchPlayerIds: benchIds,
          captainId: finalSquad[0]?.id || '',
          penaltyTakerId: finalSquad.find(p => p.attributes?.shooting > 75)?.id || finalSquad[0]?.id || '',
          freeKickTakerId: finalSquad.find(p => p.attributes?.passing > 78)?.id || finalSquad[0]?.id || '',
          cornerTakerId: finalSquad.find(p => p.attributes?.passing > 78)?.id || finalSquad[0]?.id || '',
        },
      };

      // Construct league teams with Al Ahly as userClub
      const allPremierClubs = (GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS);
      const finalLeagueTeams = allPremierClubs.map(t => {
        if (t.id === 'eg1_ahly') {
          return alAhlyUserClub;
        }
        return {
          ...t,
          isUserClub: false,
        };
      });

      // Update league standings and master calendar schedule
      const freshStandings = generateInitialStandings(finalLeagueTeams);

      // Generate Unified Master Calendar Schedule (League Only)
      const freshFixtures = CalendarManager.generateMasterSchedule({
        seasonNumber: 1,
        activeLeague: egyPremierLeague,
        teams: finalLeagueTeams,
        userClub: alAhlyUserClub,
        cupTournament: null,
        continentalTournament: null,
      });

      // Update state
      setActiveLeague(egyPremierLeague);
      setTeams(finalLeagueTeams);
      setStandings(freshStandings);
      setFixtures(freshFixtures);
      setCurrentRound(1);
      setSeason(prev => ({
        ...prev,
        seasonNumber: 1,
        leagueId: egyPremierLeague.id,
        leagueName: egyPremierLeague.name,
        divisionTier: 1,
        currentRound: 1,
        totalRounds: Math.max(...freshFixtures.map(f => f.round), 34),
        status: 'active',
      }));
      setCupTournament(null);
      setAfricanChampionsLeague(null);

      setClubEconomy({
        clubBudget: 15000000,
        transferSpendingTotal: 0,
        transferIncomeTotal: 0,
        salaryExpensesTotal: 0,
        sponsorIncomeTotal: 0,
        matchIncomeTotal: 0,
        facilitySpendingTotal: 0,
        currentSeasonNetProfit: 0,
      });

      setBoardSystem(generateInitialBoardSystem(alAhlyUserClub, 1, finalLeagueTeams.length, finalLeagueTeams, false));

      setManager(prev => ({
        ...prev,
        currentClubId: 'eg1_ahly',
        clubsManaged: Array.from(new Set([...(prev.clubsManaged || []), 'النادي الأهلي'])),
        monthlySalary: 150000,
        reputation: Math.max(90, prev.reputation || 90),
        license: 'PRO',
      }));

      // Add welcoming inbox message
      const welcomeMsg: InboxMessage = {
        id: `msg_ahly_appointed_${Date.now()}`,
        title: '🦅 مرحباً بك في القلعة الحمراء! تولي القيادة الفنية للنادي الأهلي',
        sender: 'مجلس إدارة النادي الأهلي المصري',
        date: calendarDate?.formattedArabic || 'الموسم 1',
        type: 'board',
        read: false,
        content: `أهلاً بك يا كابتن على رأس الجهاز الفني للنادي الأهلي!\n\n⚽ القائمة والجاهزية:\nتم تجهيز كافة نجوم الفريق (محمد الشناوي، إمام عاشور، وسام أبو علي، حسين الشحات، بيرسي تاو، مروان عطية، رامي ربيعة...) بكامل اللياقة والمعنويات (100%). الخزينة مرصود بها 15,000,000 ج.م للمنافسة على لقب الدوري.\n\nانطلق الآن واكتب التاريخ مع المارد الأحمر!`,
      };

      setInbox(prev => [welcomeMsg, ...(prev || [])]);

      // Save to localStorage
      try {
        localStorage.setItem(`${STORAGE_KEY}_teams`, JSON.stringify(finalLeagueTeams));
        localStorage.setItem(`${STORAGE_KEY}_standings`, JSON.stringify(freshStandings));
        localStorage.setItem(`${STORAGE_KEY}_fixtures`, JSON.stringify(freshFixtures));
        localStorage.setItem(`${STORAGE_KEY}_activeLeague`, JSON.stringify(egyPremierLeague));
        localStorage.removeItem(`${STORAGE_KEY}_africanChampionsLeague`);
        localStorage.setItem(`${STORAGE_KEY}_currentRound`, '1');
      } catch (saveErr) {
        console.warn('LocalStorage save error:', saveErr);
      }

      return {
        success: true,
        message: 'تم تولي تدريب النادي الأهلي بنجاح! 🦅🏆',
      };
    } catch (err: any) {
      console.error('Failed to switch club to Al Ahly:', err);
      return {
        success: false,
        message: `تعذر تولي تدريب النادي الأهلي: ${err?.message || 'خطأ غير متوقع'}`,
      };
    }
  }, [calendarDate?.formattedArabic]);

  // Simulate or play an African Champions League Match
  const playAfricanChampionsLeagueMatch = useCallback((matchId: string): { match: ContinentalMatch; message?: string } | null => {
    if (!africanChampionsLeague) return null;

    const currentMatch = africanChampionsLeague.matches.find(m => m.id === matchId);
    if (!currentMatch) return null;
    if (currentMatch.isPlayed) {
      return { match: currentMatch, message: 'هذه المباراة لعبت بالفعل!' };
    }

    const homeClub = (userClub?.id === currentMatch.homeTeamId ? userClub : (teams.find(t => t.id === currentMatch.homeTeamId) || findClubInWorld(currentMatch.homeTeamId))) || {
      id: currentMatch.homeTeamId,
      name: getClubDisplayName(currentMatch.homeTeamId, teams),
      rating: 78,
      players: [],
    } as any;

    const awayClub = (userClub?.id === currentMatch.awayTeamId ? userClub : (teams.find(t => t.id === currentMatch.awayTeamId) || findClubInWorld(currentMatch.awayTeamId))) || {
      id: currentMatch.awayTeamId,
      name: getClubDisplayName(currentMatch.awayTeamId, teams),
      rating: 78,
      players: [],
    } as any;

    let updatedMatch: ContinentalMatch;

    if (currentMatch.stage === 'group') {
      const simResult = simulateMatch(homeClub, awayClub);
      updatedMatch = {
        ...currentMatch,
        isPlayed: true,
        homeScore: simResult.homeScore,
        awayScore: simResult.awayScore,
        events: simResult.events || [],
        stats: simResult.stats || undefined,
        winnerTeamId: simResult.homeScore > simResult.awayScore ? homeClub.id : simResult.awayScore > simResult.homeScore ? awayClub.id : undefined,
      };
    } else {
      const koResult = simulateKnockoutMatch(homeClub, awayClub);
      updatedMatch = {
        ...currentMatch,
        isPlayed: true,
        homeScore: koResult.homeScore,
        awayScore: koResult.awayScore,
        homePenalties: koResult.homePenalties,
        awayPenalties: koResult.awayPenalties,
        winnerTeamId: koResult.winnerTeamId,
        events: koResult.events || [],
        stats: koResult.stats || undefined,
      };
    }

    // Update matches list
    const updatedMatches = africanChampionsLeague.matches.map(m => m.id === matchId ? updatedMatch : m);

    // Update group standings
    let updatedGroups = africanChampionsLeague.groups.map(grp => {
      if (currentMatch.groupId && grp.id === currentMatch.groupId) {
        const isHomeWin = (updatedMatch.homeScore ?? 0) > (updatedMatch.awayScore ?? 0);
        const isAwayWin = (updatedMatch.awayScore ?? 0) > (updatedMatch.homeScore ?? 0);
        const isDraw = (updatedMatch.homeScore ?? 0) === (updatedMatch.awayScore ?? 0);

        const newStandings = grp.standings.map(s => {
          if (s.teamId === currentMatch.homeTeamId) {
            const gf = s.goalsFor + (updatedMatch.homeScore ?? 0);
            const ga = s.goalsAgainst + (updatedMatch.awayScore ?? 0);
            return {
              ...s,
              played: s.played + 1,
              won: s.won + (isHomeWin ? 1 : 0),
              drawn: s.drawn + (isDraw ? 1 : 0),
              lost: s.lost + (isAwayWin ? 1 : 0),
              goalsFor: gf,
              goalsAgainst: ga,
              goalDifference: gf - ga,
              points: s.points + (isHomeWin ? 3 : isDraw ? 1 : 0),
            };
          }
          if (s.teamId === currentMatch.awayTeamId) {
            const gf = s.goalsFor + (updatedMatch.awayScore ?? 0);
            const ga = s.goalsAgainst + (updatedMatch.homeScore ?? 0);
            return {
              ...s,
              played: s.played + 1,
              won: s.won + (isAwayWin ? 1 : 0),
              drawn: s.drawn + (isDraw ? 1 : 0),
              lost: s.lost + (isHomeWin ? 1 : 0),
              goalsFor: gf,
              goalsAgainst: ga,
              goalDifference: gf - ga,
              points: s.points + (isAwayWin ? 3 : isDraw ? 1 : 0),
            };
          }
          return s;
        }).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });

        return {
          ...grp,
          standings: newStandings,
        };
      }
      return grp;
    });

    let nextStage = africanChampionsLeague.currentStage;
    const allGroupMatchesPlayed = updatedMatches.filter(m => m.stage === 'group').every(m => m.isPlayed);

    if (allGroupMatchesPlayed && nextStage === 'group') {
      nextStage = 'quarter';
      const qualifiedFirst: string[] = [];
      const qualifiedSecond: string[] = [];

      updatedGroups.forEach(g => {
        if (g.standings.length >= 2) {
          qualifiedFirst.push(g.standings[0].teamId);
          qualifiedSecond.push(g.standings[1].teamId);
        }
      });

      if (qualifiedFirst.length === 4 && qualifiedSecond.length === 4) {
        const qfPairs = [
          { home: qualifiedFirst[0], away: qualifiedSecond[1] },
          { home: qualifiedFirst[1], away: qualifiedSecond[0] },
          { home: qualifiedFirst[2], away: qualifiedSecond[3] },
          { home: qualifiedFirst[3], away: qualifiedSecond[2] },
        ];

        qfPairs.forEach((pair, idx) => {
          updatedMatches.push({
            id: `caf_cl_qf_${idx + 1}_s${africanChampionsLeague.seasonNumber}`,
            stage: 'quarter',
            stageName: `ربع النهائي - مباراة ${idx + 1}`,
            roundTrigger: 18,
            homeTeamId: pair.home,
            awayTeamId: pair.away,
            isPlayed: false,
          });
        });
      }
    }

    const qfMatches = updatedMatches.filter(m => m.stage === 'quarter');
    if (qfMatches.length === 4 && qfMatches.every(m => m.isPlayed) && nextStage === 'quarter') {
      nextStage = 'semi';
      const qfWinners = qfMatches.map(m => m.winnerTeamId || m.homeTeamId);
      updatedMatches.push({
        id: `caf_cl_sf_1_s${africanChampionsLeague.seasonNumber}`,
        stage: 'semi',
        stageName: 'نصف النهائي 1',
        roundTrigger: 22,
        homeTeamId: qfWinners[0],
        awayTeamId: qfWinners[1],
        isPlayed: false,
      });
      updatedMatches.push({
        id: `caf_cl_sf_2_s${africanChampionsLeague.seasonNumber}`,
        stage: 'semi',
        stageName: 'نصف النهائي 2',
        roundTrigger: 22,
        homeTeamId: qfWinners[2],
        awayTeamId: qfWinners[3],
        isPlayed: false,
      });
    }

    const sfMatches = updatedMatches.filter(m => m.stage === 'semi');
    if (sfMatches.length === 2 && sfMatches.every(m => m.isPlayed) && nextStage === 'semi') {
      nextStage = 'final';
      const sfWinners = sfMatches.map(m => m.winnerTeamId || m.homeTeamId);
      updatedMatches.push({
        id: `caf_cl_final_s${africanChampionsLeague.seasonNumber}`,
        stage: 'final',
        stageName: 'المباراة النهائية الكبرى 🏆',
        roundTrigger: 26,
        homeTeamId: sfWinners[0],
        awayTeamId: sfWinners[1],
        isPlayed: false,
      });
    }

    let winnerClubId = africanChampionsLeague.winnerClubId;
    const finalMatch = updatedMatches.find(m => m.stage === 'final');
    if (finalMatch && finalMatch.isPlayed && !winnerClubId) {
      winnerClubId = finalMatch.winnerTeamId || finalMatch.homeTeamId;
      nextStage = 'completed';
      if (winnerClubId === userClub?.id) {
        setTeams(prev => prev.map(t => {
          if (!t.isUserClub && t.id !== userClub?.id) return t;
          return {
            ...t,
            budget: t.budget + (africanChampionsLeague.prizeMoneyWinner || 15000000),
          };
        }));
        setManager(prev => ({
          ...prev,
          reputation: Math.min(100, (prev.reputation || 80) + 25),
          rankingPoints: (prev.rankingPoints || 1200) + 500,
          trophies: [...(prev.trophies || []), 'دوري أبطال إفريقيا (CAF Champions League)'],
        }));
      }
    }

    const updatedTournament: ContinentalTournament = {
      ...africanChampionsLeague,
      matches: updatedMatches,
      groups: updatedGroups,
      currentStage: nextStage,
      winnerClubId,
    };

    setAfricanChampionsLeague(updatedTournament);

    const isUserInvolved = userClub && (currentMatch.homeTeamId === userClub.id || currentMatch.awayTeamId === userClub.id);
    let outcomeMsg = `انتهت المباراة: ${homeClub.name} ${updatedMatch.homeScore} - ${updatedMatch.awayScore} ${awayClub.name}`;
    if (updatedMatch.homePenalties !== undefined && updatedMatch.awayPenalties !== undefined) {
      outcomeMsg += ` (ركلات الترجيح: ${updatedMatch.homePenalties} - ${updatedMatch.awayPenalties})`;
    }

    if (isUserInvolved) {
      const isUserHome = currentMatch.homeTeamId === userClub.id;
      const userGoals = isUserHome ? (updatedMatch.homeScore ?? 0) : (updatedMatch.awayScore ?? 0);
      const oppGoals = isUserHome ? (updatedMatch.awayScore ?? 0) : (updatedMatch.homeScore ?? 0);
      const isUserWin = userGoals > oppGoals || (updatedMatch.winnerTeamId === userClub.id);

      setManager(prev => ({
        ...prev,
        matchesManaged: (prev.matchesManaged || 0) + 1,
        wins: isUserWin ? (prev.wins || 0) + 1 : prev.wins,
        draws: (!isUserWin && userGoals === oppGoals) ? (prev.draws || 0) + 1 : prev.draws,
        losses: (!isUserWin && userGoals < oppGoals) ? (prev.losses || 0) + 1 : prev.losses,
        xp: prev.xp + (isUserWin ? 150 : 50),
      }));

      const resultInboxMsg: InboxMessage = {
        id: `msg_caf_cl_${Date.now()}`,
        title: `ملخص مباراة دوري أبطال إفريقيا: ${homeClub.name} vs ${awayClub.name}`,
        sender: 'الاتحاد الإفريقي لكرة القدم (CAF)',
        date: calendarDate?.formattedArabic || `الموسم ${africanChampionsLeague.seasonNumber}`,
        type: 'news',
        read: false,
        content: `${outcomeMsg}\n\nأداء قوي ومثير في البطولة القارية الأغلى! ${isUserWin ? 'تهانينا على الفوز الرائع ورفع راية الكرة المصرية عالياً! 🦅🔥' : 'مواجهة تكتيكية شاقة تزيد من خبرة الفريق القارية.'}`,
      };
      setInbox(prev => [resultInboxMsg, ...prev]);
    }

    return { match: updatedMatch, message: outcomeMsg };
  }, [africanChampionsLeague, userClub, teams, calendarDate?.formattedArabic]);

  // Automatic Super Admin assignment to Al Ahly
  const adminAutoAssignedRef = useRef(false);
  useEffect(() => {
    if (!user?.email || adminAutoAssignedRef.current) return;
    const email = user.email.toLowerCase();
    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      const isAlAhly = userClub && (userClub.id === 'eg1_ahly' || userClub.name?.includes('الأهلي'));
      if (!isAlAhly) {
        adminAutoAssignedRef.current = true;
        console.log('[AdminAutoAssign] Detected Super Admin account, provisioning Al Ahly SC...');
        switchUserClubToAlAhly();
      }
    }
  }, [user?.email, userClub, switchUserClubToAlAhly]);

  return (
    <GameContext.Provider
      value={{
        userClub,
        teams,
        standings,
        fixtures,
        calendarSchedule,
        userCalendarSchedule,
        currentRound,
        totalRounds,
        manager,
        isUnemployed,
        transferMarket,
        transferHistory,
        clubEconomy,
        incomingBids,
        inbox,
        unreadMessagesCount,
        liveMatch,
        discardSavedLiveMatch,
        seasonFinished,
        isSimulationRunning,
        season,
        activeLeague,
        allLeagues: GLOBAL_LEAGUES,
        seasonEndSummary,
        showSeasonTransitionModal,
        jobOffers,
        cupTournament,
        calendarDate,
        boardSystem,
        activeNegotiations,
        dailyNews,
        addDailyNews,
        retiredPlayers,
        worldRankings,
        userSquadStrength,
        userDynamicManagerRating,
        recalculateWorldRankings,
        dayAdvanceSummary,
        showDaySummaryModal,
        trainingIntensity,
        daysUntilNextMatch,
        isMatchDay,
        matchBlocker,
        closeMatchBlocker,
        autoFixUserStartingLineup,
        validateUserLineup,
        advanceToNextDay,
        advanceDay: advanceToNextDay,
        advanceCalendarDay,
        forceAdvanceDay,
        closeDaySummaryModal,
        setTrainingIntensity,
        updateTactics,
        setFormation,
        updateStartingLineup,
        swapPlayers,
        setCaptainAndSetPieces,
        setPlayerTrainingFocus,
        startLiveMatch,
        pauseLiveMatch,
        resumeLiveMatch,
        setMatchSpeed,
        skipLiveMatchToEnd,
        finishLiveMatchAndAdvance,
        instantSimulateCurrentRound,
        simulateMatchAndAdvanceToNextDay,
        instantSimulateAndAdvance,
        simulateRoundOnly,
        simulateMultipleRounds,
        resumeSecondHalf,
        makeLiveSubstitution,
        toggleLiveAutoSubs,
        recordUserMatchAction,
        changeLiveMentality,
        changeLivePressing,
        hireClubStaff,
        fireClubStaff,
        buyPlayer,
        negotiatePlayerTransfer,
        startPlayerNegotiation,
        respondToNegotiationOffer,
        cancelNegotiation,
        acceptSellNegotiation,
        counterSellNegotiation,
        rejectSellNegotiation,
        clearCompletedNegotiations,
        sellPlayer,
        listPlayerForTransfer,
        releasePlayerContract,
        acceptIncomingBid,
        rejectIncomingBid,
        renewPlayerContract,
        boostPlayerMorale,
        holdPlayerMeeting,
        addBonusToPlayer,
        addBonusToAllPlayers,
        donateToClubFromPersonalWallet,
        enrollInCoachingCourse,
        unlockCourseForSeason,
        upgradeFacility,
        treatPlayerInHospital,
        healPlayerWithAd,
        cancelPlayerSuspensionWithAd,
        doubleLiveMatchRevenueWithAd,
        rematchLiveMatch,
        signWorldStarWithAd,
        setClubTicketPrice,
        promoteYouthProspect,
        sellYouthProspect,
        scoutNewYouthBatch,
        transferBudgetToWageBudget,
        transferWageToCashBudget,
        markMessageRead,
        deleteMessage,
        clearAllMessages,
        markAllMessagesRead,
        startNextSeason,
        selectNextSeasonLeague,
        acceptJobOffer,
        rejectJobOffer,
        takeOverClub,
        openSeasonModal,
        closeSeasonModal,
        resignToUnemployed,
        restartCurrentSeason,
        saveToCloud,
        resetGame,
        selectStartingClub,
        updateManagerName,
        updateTrainerProfile,
        exportCurrentSavePayload,
        applyLoadedSave,
        runSaveDataMigration,
        scoutedOpponents,
        scoutOpponent,
        developmentPoints: currentDevPoints,
        upgradePlayerAttribute,
        boostPlayerOverall,
        boostPlayerPotential,
        boostPlayerCondition,
        grantDevelopmentPoints,
        claimAdReward,
        grantChallengeReward,
        redeemGiftCode,
        availableSponsorOffers,
        signSponsorshipContract,
        terminateSponsorshipContract,
        negotiateSponsorshipOffer,
        renewSponsorshipContract,
        refreshSponsorshipOffers,
        dailyRewardState,
        canClaimDailyReward,
        claimDailyLoginReward,
        showDailyRewardModal,
        setShowDailyRewardModal,
        dailyRewardsSchedule: DAILY_LOGIN_REWARDS_SCHEDULE,
        deletedMessageIds,
        africanChampionsLeague: null,
        switchUserClubToAlAhly,
        switchContinentalCompetition: () => {},
        playAfricanChampionsLeagueMatch,
        uefaChampionsLeague: null,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

