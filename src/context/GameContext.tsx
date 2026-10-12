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
  createInitialLiveMatchState,
  simulateMatchStep,
  simulatePenaltyShootout,
  LiveSimulationState,
} from '../utils/engine';
import {
  advanceCupTournament,
  calculateSeasonEndSummary,
  generateMasterSeasonAgenda,
  generateSeasonJobOffers,
  initNationalCupTournament,
  processNewSeasonAdvancement,
  repairCupProgressionIntegrity,
} from '../utils/seasonEngine';
import { evaluateLicenseEligibility } from '../utils/careerProgressionEngine';
import { simulateKnockoutMatch } from '../utils/continentalEngine';
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
} from '../utils/calendarEngine';
import { generateImmersiveNewsBatch, getInitialFootballNews } from '../services/footballNewsEngine';
import { evaluateMatchImpactOnConfidence, updateDailyBoardConfidence, getClubLeagueTarget } from '../utils/boardEngine';
import { EGYPT_TIER_4_LEAGUE, getLeagueById, GLOBAL_LEAGUES, findClubInWorld, getClubDisplayName } from '../data/leaguesData';
import { calculateMatchRevenue, MatchRevenueBreakdown, getBenchmarkTicketPrice } from '../utils/matchRevenue';
import { AdManager } from '../services/adManager';
import { ADMOB_CONFIG } from '../config/admobConfig';
import { DIAGNOSTIC_CONFIG } from '../config/diagnosticConfig';
import { AdRewardType, AdRewardClaimResult } from '../services/adRewardService';
import { MIGRATION_STORAGE_KEY, runOneTimeWorldMigration, inferClubCountry } from '../utils/worldMigration';
import { validateWorldDatabase, sanitizeWorldPlayerOwnership } from '../utils/worldValidation';
import { isRealClub, loadRealClubSquad } from '../data/realPlayersData';
import { useAuth } from './AuthContext';
import { getLocalTrainerProfile, saveLocalTrainerProfile } from '../services/trainerProfileService';
import { gameStateRepository } from '../services/gameStateRepository';
import { migrateSavePayload, CURRENT_SAVE_FORMAT_VERSION } from '../services/saveBackupService';
import { smartSyncManager, SmartSyncInput } from '../services/smartSyncManager';
import { canPlayerJoinClub, DEFAULT_ECONOMY_CONFIG, calculateClubMonthlyIncome, calculateClubTotalMonthlyWages, validateTransferFinancials } from '../services/economyService';
import { fetchActiveBroadcasts, applyWorldOverridesToClubs, applyWorldOverridesToMarket, isPlayerDeletedInOverrides } from '../services/adminService';
import { redeemPromoCode } from '../services/promoCodeService';
import { isQuotaExceededError, markQuotaExceeded, isRecentQuotaExceeded } from '../utils/firestoreErrorHelper';
import { validateCareerState, resignManagerFromClub, appointManagerToClub } from '../utils/careerValidator';
import {
  calculatePlayerFairValue,
  evaluateTransferOffer,
  executeAtomicTransfer,
  findEligibleBuyerClubs,
  generateIncomingAiBids,
  getAllDatabasePlayers,
  resolveClubInfo,
  resolveFullPlayerObject,
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
  calculateDynamicManagerRating,
  calculateSquadStrength,
  calculateMatchRankingPoints,
} from '../utils/rankingsEngine';
import { enrichClubsWithManagers } from '../data/worldManagersData';
import { generateYouthAcademyBatch, promoteYouthProspectToSquad } from '../utils/youthAcademyEngine';
import {
  calculateInitialPlayerSavings,
  COACHING_COURSES,
  ManagerTransaction,
} from '../utils/managerFinancesEngine';

export type LiveMatchState = LiveSimulationState;

interface GameContextType {
  userClub: Club | null;
  isUnemployed: boolean;
  teams: Club[];
  standings: LeagueStanding[];
  fixtures: Fixture[];
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
  africanChampionsLeague?: any;
  uefaChampionsLeague?: any;
  deletedMessageIds?: string[];

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
  autoFixUserStartingLineup: () => void;
  validateUserLineup: () => SquadValidationResult;

  // Actions
  updateTactics: (tactics: TeamTactics) => void;
  setFormation: (formation: FormationType) => void;
  updateStartingLineup: (startingIds: string[], benchIds: string[]) => void;
  swapPlayers: (sourcePlayerId: string, targetPlayerId: string) => void;
  setCaptainAndSetPieces: (roles: { captainId?: string; penaltyTakerId?: string; freeKickTakerId?: string; cornerTakerId?: string }) => void;
  setPlayerTrainingFocus: (playerId: string, focus: Player['trainingFocus']) => void;
  
  // Day Progression & Calendar Simulation
  advanceToNextDay: (skipToMatch?: boolean) => void;
  closeDaySummaryModal: () => void;
  setTrainingIntensity: (intensity: 'recovery' | 'normal' | 'high') => void;

  // Match simulation & Live In-Match Actions
  startLiveMatch: (fixtureId?: string) => void;
  pauseLiveMatch: () => void;
  resumeLiveMatch: () => void;
  setMatchSpeed: (speed: 1 | 2 | 4) => void;
  skipLiveMatchToEnd: () => void;
  finishLiveMatchAndAdvance: () => void;
  instantSimulateCurrentRound: () => void;
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
  buyPlayer: (player: Player) => { success: boolean; message: string };
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
    action: 'accept_counter' | 'raise_salary' | 'cancel',
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

  // Club & Facilities
  upgradeFacility: (facilityKey: keyof ClubFacilities, cost: number) => { success: boolean; message: string };
  treatPlayerInHospital: (playerId: string, treatmentType: 'physio' | 'specialist' | 'prp') => { success: boolean; message: string };
  healPlayerWithAd: (playerId: string) => { success: boolean; message: string };
  cancelPlayerSuspensionWithAd: (playerId: string) => { success: boolean; message: string };
  doubleLiveMatchRevenueWithAd: () => Promise<{ success: boolean; message: string }>;
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
  acceptJobOffer: (offerId: string) => void;
  rejectJobOffer: (offerId: string) => void;
  takeOverClub: (offerId: string) => { success: boolean; message: string };
  openSeasonModal: () => void;
  closeSeasonModal: () => void;
  resignToUnemployed: () => void;

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

  // Promo / Gift Codes System (نظام استرداد أكواد الهدايا والمكافآت)
  redeemGiftCode: (code: string) => Promise<{ success: boolean; message: string; rewardAmount?: number; rewardCoins?: number }>;

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
  totalRounds: 44,
  status: 'active',
  leagueId: 'egy_tier_4',
  leagueName: 'دوري الدرجة الرابعة المصري',
  divisionTier: 4,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Concurrency guard to prevent multiple simultaneous simulations and UI freezing
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const isSimulationRunningRef = useRef(false);
  const liveMatchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFinishingMatchRef = useRef(false);
  const isMatchFinishedRef = useRef(false);
  const completedMatchFixtureIdRef = useRef<string | null>(null);

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
        return parsed;
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
    let players = Array.isArray(t.players) ? t.players : [];
    if (isRealClub(t.id) && players.length === 0) {
      players = loadRealClubSquad(t.id);
    }

    // Filter out players permanently deleted in admin editor
    players = players.filter(p => !isPlayerDeletedInOverrides(p.id));

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

    const startingPlayerIds = t.tactics?.startingPlayerIds && t.tactics.startingPlayerIds.length === 11
      ? t.tactics.startingPlayerIds
      : players.slice(0, 11).map(p => p.id);
    const benchPlayerIds = t.tactics?.benchPlayerIds && t.tactics.benchPlayerIds.length > 0
      ? t.tactics.benchPlayerIds
      : players.slice(11, 18).map(p => p.id);

    return {
      ...t,
      name: cleanName,
      shortName: cleanShortName,
      country,
      countryId,
      countryCode: resolvedCountryCode,
      leagueId,
      players: players.map(p => ({
        ...p,
        nationality: p.nationality || country,
        nationalityCode: p.nationalityCode || resolvedCountryCode,
        countryOfBirth: p.countryOfBirth || p.nationality || country,
        currentClubId: p.currentClubId || t.id,
        currentLeagueId: p.currentLeagueId || leagueId,
        stats: p.stats || { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0, averageRating: 6.5 },
        attributes: p.attributes || { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 },
        savings: p.savings !== undefined ? p.savings : calculateInitialPlayerSavings(p),
        totalBonusesReceived: p.totalBonusesReceived ?? 0,
      })),
      sponsors: Array.isArray(t.sponsors) ? t.sponsors : [],
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
      tactics: {
        formation: t.tactics?.formation || '4-3-3',
        mentality: t.tactics?.mentality || 'balanced',
        passingStyle: t.tactics?.passingStyle || 'short',
        pressingIntensity: t.tactics?.pressingIntensity || 'balanced',
        tempo: t.tactics?.tempo || 'balanced',
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
      license: (parsed?.license && ['D', 'C', 'B', 'A', 'PRO', 'ELITE'].includes(parsed.license)) ? parsed.license : 'D',
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

      let rawTeams = INITIAL_TEAMS;
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
      const activeLeagueId = activeLeague?.id || 'egy_tier_4';
      const migrationResult = runOneTimeWorldMigration(INITIAL_TEAMS, INITIAL_TRANSFER_MARKET, activeLeagueId);
      const normalizedTeams = migrationResult.teams.map(normalizeClub);
      const overriddenTeams = applyWorldOverridesToClubs(normalizedTeams);
      const validated = validateCareerState(manager, overriddenTeams, GLOBAL_LEAGUES);
      return validated.teams;
    }
  });

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
          const maxR = Math.max(...parsed.map(f => f.round || 0));
          if (maxR >= 38) return parsed;
        }
      }
      const initialCup = initNationalCupTournament(1, 'مصر', INITIAL_TEAMS);
      return generateMasterSeasonAgenda(1, EGYPT_TIER_4_LEAGUE, INITIAL_TEAMS, initialCup);
    } catch {
      const initialCup = initNationalCupTournament(1, 'مصر', INITIAL_TEAMS);
      return generateMasterSeasonAgenda(1, EGYPT_TIER_4_LEAGUE, INITIAL_TEAMS, initialCup);
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

  const [inbox, setInbox] = useState<InboxMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_inbox`);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return INITIAL_INBOX;
    } catch {
      return INITIAL_INBOX;
    }
  });

  // 5. Cup Tournament
  const [cupTournament, setCupTournament] = useState<CupTournament | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_cupTournament`);
      if (saved) {
        return normalizeCup(JSON.parse(saved));
      }
      return normalizeCup(initNationalCupTournament(1, 'مصر', INITIAL_TEAMS));
    } catch {
      return normalizeCup(initNationalCupTournament(1, 'مصر', INITIAL_TEAMS));
    }
  });

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
  const [liveMatch, setLiveMatch] = useState<LiveMatchState | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_active_live_match`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.fixture) {
          // When restoring an in-progress match from storage, start paused so player can resume when ready
          return { ...parsed, isPlaying: false };
        }
      }
    } catch (e) {
      console.warn('[GameContext] Failed to restore active live match from storage:', e);
    }
    return null;
  });

  useEffect(() => {
    try {
      if (liveMatch) {
        localStorage.setItem(`${STORAGE_KEY}_active_live_match`, JSON.stringify(liveMatch));
      } else {
        localStorage.removeItem(`${STORAGE_KEY}_active_live_match`);
      }
    } catch (e) {
      console.warn('[GameContext] Failed to save active live match to storage:', e);
    }
  }, [liveMatch]);

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
      const hasPrompted = sessionStorage.getItem('anta_daily_reward_prompted_session');
      if (!hasPrompted) {
        sessionStorage.setItem('anta_daily_reward_prompted_session', 'true');
        const timer = setTimeout(() => {
          setShowDailyRewardModal(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [canClaimDailyReward]);

  const totalRounds = useMemo(() => {
    if (fixtures.length > 0) {
      const maxR = Math.max(...fixtures.map(f => f.round || 0));
      if (maxR > 0) return maxR;
    }
    return season.totalRounds || 38;
  }, [fixtures, season.totalRounds]);

  const isUnemployed = false;
  const userClub: Club = useMemo(() => {
    const validTeams = (Array.isArray(teams) ? teams : []).filter(t => t && t.id);
    if (manager?.currentClubId) {
      const byId = validTeams.find(t => t.id === manager.currentClubId);
      if (byId) return byId;
    }
    const found = validTeams.find(t => t.isUserClub);
    if (found) return found;
    return validTeams[0] || INITIAL_TEAMS[0];
  }, [teams, manager?.currentClubId]);

  const leagueFixtures = useMemo(() => {
    return fixtures.filter(f => f && (!f.competitionType || f.competitionType === 'league'));
  }, [fixtures]);

  const allLeagueFixturesPlayed = useMemo(() => {
    return leagueFixtures.length > 0 && leagueFixtures.every(f => f && (f.isPlayed || (f as any).played));
  }, [leagueFixtures]);

  // Season is ONLY finished when status is completed, currentRound > totalRounds, or all league fixtures are played AND round reached total
  const seasonFinished = season.status === 'completed' || currentRound > totalRounds || (allLeagueFixturesPlayed && currentRound >= totalRounds);
  const unreadMessagesCount = inbox.filter(m => !m.read).length;

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

  // Sponsorship Offers Market State (سوق وعروض الرعاية الواردة)
  const [availableSponsorOffers, setAvailableSponsorOffers] = useState<SponsorshipOffer[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sponsorOffers`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return userClub ? generateIncomingSponsorshipOffers(userClub, 4) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_sponsorOffers`, JSON.stringify(availableSponsorOffers));
    } catch {}
  }, [availableSponsorOffers]);

  useEffect(() => {
    if (userClub && (!availableSponsorOffers || availableSponsorOffers.length === 0)) {
      setAvailableSponsorOffers(generateIncomingSponsorshipOffers(userClub, 4));
    }
  }, [userClub?.id]);

  const recalculateWorldRankings = (monthStr?: string) => {
    const targetMonth = monthStr || (calendarDate?.rawDateStr ? calendarDate.rawDateStr.slice(0, 7) : '2026-08');
    const updated = generateMonthlyWorldRankings(manager, userClub, targetMonth);
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

  // Self-healing invariant: Ensure manager is actively linked to their club in state
  useEffect(() => {
    const validated = validateCareerState(manager, teams, GLOBAL_LEAGUES);
    if (
      manager.isUnemployed !== validated.manager.isUnemployed ||
      manager.currentClubId !== validated.manager.currentClubId ||
      !(Array.isArray(teams) ? teams : []).some(t => t && t.isUserClub && t.id === validated.manager.currentClubId)
    ) {
      setManager(validated.manager);
      setTeams(validated.teams);
    }
  }, [manager.currentClubId]);

  // Calendar & Next Match Helpers
  const nextMatchInfo = userClub ? calculateDaysUntilNextMatch(
    calendarDate?.rawDateStr,
    currentRound,
    getInitialSeasonDate(season.seasonNumber).rawDateStr
  ) : { daysRemaining: 0, isMatchDay: false, scheduledDateStr: '', formattedScheduledDate: '' };

  const daysUntilNextMatch = nextMatchInfo.daysRemaining;
  const isMatchDay = nextMatchInfo.isMatchDay || currentRound <= totalRounds && daysUntilNextMatch === 0;

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

    // Self-healing: Repair any cup qualification/progression integrity issues
    const resolvedUserClubId = migrated.manager?.userClubId || migrated.teams?.find((t: any) => t.isUserClub)?.id;
    if (migrated.cupTournament && resolvedUserClubId) {
      const repaired = repairCupProgressionIntegrity(migrated.cupTournament, migrated.fixtures || [], resolvedUserClubId);
      if (repaired.repaired) {
        migrated.cupTournament = repaired.updatedCup;
        if (repaired.updatedFixtures?.length) {
          migrated.fixtures = repaired.updatedFixtures;
        }
      }
    }

    if (migrated.season) setSeason(migrated.season);
    if (migrated.activeLeague) setActiveLeague(migrated.activeLeague);
    if (Array.isArray(migrated.teams) && migrated.teams.length > 0) setTeams(migrated.teams.map(normalizeClub));
    if (Array.isArray(migrated.standings) && migrated.standings.length > 0) setStandings(migrated.standings.map(normalizeStanding));
    if (Array.isArray(migrated.fixtures) && migrated.fixtures.length > 0) setFixtures(migrated.fixtures);
    if (typeof migrated.currentRound === 'number') setCurrentRound(migrated.currentRound);
    if (migrated.manager) {
      const normalizedMgr = normalizeManagerProfile(migrated.manager);
      setManager(normalizedMgr);
      if (normalizedMgr.name) {
        saveLocalTrainerProfile({
          name: normalizedMgr.name,
          age: normalizedMgr.age || 35,
          nationality: normalizedMgr.nationality || 'مصري',
          trainerId: normalizedMgr.trainerId || 'TRN-RESTORED',
        });
      }
    }
    if (Array.isArray(migrated.transferMarket)) setTransferMarket(migrated.transferMarket);
    if (Array.isArray(migrated.incomingBids)) setIncomingBids(migrated.incomingBids);
    if (Array.isArray(migrated.inbox)) setInbox(migrated.inbox);
    if (migrated.cupTournament) setCupTournament(migrated.cupTournament);
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
        setWorldRankings(migrated.worldRankings);
      } else {
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
        const isCloudAhead = cloudSeason > localSeason ||
          (cloudSeason === localSeason && cloudRound > localRound) ||
          cloudXp > localXp ||
          (cloudSave.savedAt && localSaveOnDisk?.lastLocalSaveAt && cloudSave.savedAt > localSaveOnDisk.lastLocalSaveAt);

        if (isCloudAhead || isLocalDefault) {
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

  // Persist game state (Local-First: IndexedDB + localStorage mirror, debounced to avoid UI freezing)
  const saveTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
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
        });

        // Queue coalesced debounced background cloud sync
        if (user?.uid) {
          smartSyncManager.queueDebouncedSync(getSyncInput());
        }
      } catch (err) {
        console.warn('Failed to save to local state repository:', err);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [season, activeLeague, teams, standings, fixtures, currentRound, manager, transferMarket, incomingBids, inbox, cupTournament, jobOffers, seasonEndSummary, transferHistory, clubEconomy, calendarDate, activeNegotiations, boardSystem, dailyNews, retiredPlayers, worldRankings, scoutedOpponents, deletedMessageIds, user?.uid, getSyncInput]);

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

  // Live match playback timer ticker (Real event-by-event simulation)
  useEffect(() => {
    if (!liveMatch || !liveMatch.isPlaying || liveMatch.isFinished || liveMatch.isHalfTime) {
      if (liveMatchTimerRef.current) {
        clearInterval(liveMatchTimerRef.current);
        liveMatchTimerRef.current = null;
      }
      return;
    }

    const intervalTime = Math.max(80, 600 / liveMatch.speed); // e.g. 600ms per simulated minute at 1x

    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }

    liveMatchTimerRef.current = setInterval(() => {
      if (isMatchFinishedRef.current) {
        if (liveMatchTimerRef.current) {
          clearInterval(liveMatchTimerRef.current);
          liveMatchTimerRef.current = null;
          console.log('[DIAG] TIMER_CLEARED');
        }
        return;
      }

      setLiveMatch(prev => {
        if (!prev || !prev.isPlaying || prev.isFinished || prev.isHalfTime) {
          if (liveMatchTimerRef.current) {
            clearInterval(liveMatchTimerRef.current);
            liveMatchTimerRef.current = null;
            console.log('[DIAG] TIMER_CLEARED');
          }
          return prev;
        }

        console.log(`[DIAG] TIMER_TICK minute=${prev.currentMinute}`);
        const next = simulateMatchStep(prev, userClub?.tactics);

        console.log(`[DIAG] MATCH_END_CHECK minute=${next.currentMinute}`);
        const isEndCondition = next.isFinished || next.currentMinute >= 90;
        console.log(`[DIAG] MATCH_END_CONDITION result=${isEndCondition}`);

        if (next.currentMinute >= 90) {
          console.log('[DIAG] TIMER_REACHED_90');
        }

        if (next.currentMinute >= 90 || next.isFinished) {
          const userIsInFixture = userClub && (next.fixture?.homeTeamId === userClub.id || next.fixture?.awayTeamId === userClub.id);
          const isUserHome = userClub ? next.fixture?.homeTeamId === userClub.id : true;
          const oppClub = isUserHome ? next.awayTeam : next.homeTeam;
          const userScore = isUserHome ? next.homeScore : next.awayScore;
          const oppScore = isUserHome ? next.awayScore : next.homeScore;

          const calculatedRevenue = (userIsInFixture && userClub) ? calculateMatchRevenue({
            userClub,
            opponentClub: oppClub,
            isHome: isUserHome,
            userScore,
            opponentScore: oppScore,
            leagueTier: activeLeague?.tier || 1,
            isCupMatch: next.fixture?.competitionType === 'cup',
            customTicketPrice: userClub.facilities?.ticketPrice,
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
          console.log('[DIAG] FINISH_MATCH_CALLED');

          if (liveMatchTimerRef.current) {
            clearInterval(liveMatchTimerRef.current);
            liveMatchTimerRef.current = null;
            console.log('[DIAG] TIMER_CLEARED');
          }

          return finishedNext;
        }

        if (!next.isPlaying || next.isHalfTime) {
          if (liveMatchTimerRef.current) {
            clearInterval(liveMatchTimerRef.current);
            liveMatchTimerRef.current = null;
            console.log('[DIAG] TIMER_CLEARED');
          }
        }

        return next;
      });
    }, intervalTime);

    return () => {
      if (liveMatchTimerRef.current) {
        clearInterval(liveMatchTimerRef.current);
        liveMatchTimerRef.current = null;
      }
    };
  }, [liveMatch?.isPlaying, liveMatch?.isFinished, liveMatch?.isHalfTime, liveMatch?.speed, userClub?.tactics]);

  // Actions
  const updateTactics = (tactics: TeamTactics) => {
    setTeams(prev => prev.map(t => t.isUserClub ? { ...t, tactics } : t));
  };

  const setFormation = (formation: FormationType) => {
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub || !t.tactics) return t;
      return {
        ...t,
        tactics: { ...t.tactics, formation }
      };
    }));
  };

  const updateStartingLineup = (startingIds: string[], benchIds: string[]) => {
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub || !t.tactics) return t;
      return {
        ...t,
        tactics: {
          ...t.tactics,
          startingPlayerIds: startingIds,
          benchPlayerIds: benchIds,
        }
      };
    }));
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
    setTeams(prev => prev.map(t => {
      if (!t.isUserClub || !t.tactics) return t;
      return {
        ...t,
        tactics: {
          ...t.tactics,
          ...roles,
        }
      };
    }));
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

  const autoFixUserStartingLineup = () => {
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

    // If blocker was open because of lineup issue, check if it's resolved
    if (matchBlocker && matchBlocker.reason === 'lineup_issue') {
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
    }
  };

  // Match management
  const startLiveMatch = (fixtureId?: string) => {
    if (isSimulationRunningRef.current || seasonFinished) return;

    // If already in progress, resume match rather than creating duplicate
    if (liveMatch && !liveMatch.isFinished) {
      resumeLiveMatch();
      return;
    }
    if (liveMatch && liveMatch.isFinished) {
      return;
    }

    const roundFixtures = fixtures.filter(f => f.round === currentRound);
    const targetFixture = fixtureId
      ? fixtures.find(f => f.id === fixtureId)
      : userClub ? roundFixtures.find(f => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id) : roundFixtures[0];

    // Prevent replaying already completed fixture or starting if no target fixture exists
    if (!targetFixture || targetFixture.isPlayed) return;

    // Match Day Gating: User cannot play before reaching match date
    if (userClub && !isMatchDay && daysUntilNextMatch > 0) {
      const opp = teams.find(t => t.id === (targetFixture.homeTeamId === userClub.id ? targetFixture.awayTeamId : targetFixture.homeTeamId));
      setMatchBlocker({
        isOpen: true,
        reason: 'not_match_day',
        title: '⏳ اليوم ليس موعد المباراة!',
        message: `متبقي ${daysUntilNextMatch} ${daysUntilNextMatch === 1 ? 'يوم' : 'أيام'} حتى موعد مباراة الجولة ${currentRound} أمام (${opp?.name || 'المنافس'}). يمكنك استخدام زر (تخطي الأيام حتى موعد المباراة) للوصول مباشرة إلى يوم اللقاء، أو التقدم يوماً بيوم لإتمام الحصص التدريبية.`,
        fixture: targetFixture,
        opponentClub: opp,
      });
      return;
    }

    // Lineup validity check for user's club before starting match (only if user club is in this fixture)
    const userIsInMatch = userClub && (targetFixture.homeTeamId === userClub.id || targetFixture.awayTeamId === userClub.id);
    if (userIsInMatch && userClub) {
      const val = validateSquadLineup(userClub);
      if (!val.isValid) {
        setMatchBlocker({
          isOpen: true,
          reason: 'lineup_issue',
          title: '🚨 تنبيه: تعذر بدء المباراة بسبب التشكيلة',
          message: 'يوجد لاعبون مصابون أو موقوفون في التشكيل الأساسي! يجب استبدالهم بلاعبين جاهزين قبل انطلاق صافرة البداية.',
          invalidStarters: val.invalidStarters,
        });
        return;
      }
    }

    const homeTeam = teams.find(t => t.id === targetFixture.homeTeamId) || (targetFixture.homeTeamId ? findClubInWorld(targetFixture.homeTeamId) : undefined) || teams[0];
    const awayTeam = teams.find(t => t.id === targetFixture.awayTeamId) || (targetFixture.awayTeamId ? findClubInWorld(targetFixture.awayTeamId) : undefined) || teams[1];

    const initialSimulationState = createInitialLiveMatchState(targetFixture, homeTeam, awayTeam, userClub?.tactics, userClub?.id);
    completedMatchFixtureIdRef.current = null;
    isFinishingMatchRef.current = false;
    isMatchFinishedRef.current = false;
    setLiveMatch(initialSimulationState);
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

  const finishLiveMatchAndAdvance = () => {
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
      console.log('[MatchEndingFlow] Fixture', currentFixtureId, 'is already marked isPlayed in list. Clearing liveMatch.');
      completedMatchFixtureIdRef.current = currentFixtureId;
      setLiveMatch(null);
      return;
    }

    // Acquire locks and mark fixture completed
    isFinishingMatchRef.current = true;
    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);
    completedMatchFixtureIdRef.current = currentFixtureId;

    if (liveMatchTimerRef.current) {
      console.log('[MatchEndingFlow] Cleared liveMatchTimerRef interval immediately');
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }

    try {
      console.log('[MatchEndingFlow] Processing match finalization for fixture:', currentFixtureId);
      const { fixture, homeTeam, awayTeam, homeScore, awayScore, events, stats } = liveMatch;
      const homeTeamId = homeTeam?.id || fixture?.homeTeamId;
      const awayTeamId = awayTeam?.id || fixture?.awayTeamId;

    // 5. Clean up simulation buffer: Keep meaningful match events (goals, cards, substitutions, saves, chances, injuries)
    // and prune generic high-frequency text commentary to prevent huge memory / localStorage payload.
    const persistentEvents = (events || []).filter(e => e && e.type !== 'commentary');

    const pruneCpuEvents = (evs: MatchEvent[] = []): MatchEvent[] => {
      return (evs || []).filter(e =>
        e && (
          e.type === 'goal' ||
          e.type === 'yellow_card' ||
          e.type === 'red_card' ||
          e.type === 'substitution' ||
          e.type === 'injury'
        )
      );
    };

    // Calculate official realistic match revenue breakdown
    const isUserHome = userClub ? homeTeam?.id === userClub.id : false;
    const userScore = isUserHome ? homeScore : awayScore;
    const oppScore = isUserHome ? awayScore : homeScore;
    const isCup = 
      fixture?.competitionType === 'cup' || 
      Boolean(fixture?.cupStage) || 
      Boolean(fixture?.stageName?.includes('نهائي')) ||
      Boolean(fixture?.stageName?.includes('كأس')) ||
      Boolean(fixture?.stageName?.includes('الكأس')) ||
      Boolean(fixture?.stageName?.includes('دور الـ')) ||
      Boolean(fixture?.stageName?.includes('ثمن')) ||
      Boolean(fixture?.stageName?.includes('ربع')) ||
      Boolean(fixture?.stageName?.includes('نصف')) ||
      Boolean(fixture?.competitionName?.includes('كأس')) ||
      Boolean(fixture?.competitionName?.includes('الكأس')) ||
      Boolean(fixture?.competitionName?.toLowerCase()?.includes('cup')) ||
      Boolean(fixture?.id?.toLowerCase()?.includes('cup')) ||
      (liveMatch.homePenalties !== undefined && liveMatch.awayPenalties !== undefined) ||
      Boolean(cupTournament?.matches?.some(m => m.id === fixture?.id || (userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) && (m.roundTrigger === fixture?.round || m.roundTrigger === currentRound))));

    const resolvedCupStage = fixture?.cupStage || (
      fixture?.stageName?.includes('64') ? 'round_of_64' :
      fixture?.stageName?.includes('32') ? 'round_of_32' :
      fixture?.stageName?.includes('16') || fixture?.stageName?.includes('ثمن') ? 'round_of_16' :
      fixture?.stageName?.includes('ربع') || fixture?.stageName?.includes('quarter') ? 'quarter' :
      fixture?.stageName?.includes('نصف') || fixture?.stageName?.includes('semi') ? 'semi' :
      fixture?.stageName?.includes('نهائي') || fixture?.stageName?.includes('final') ? 'final' :
      undefined
    );

    // Handle penalty shootout resolution for tied cup matches
    let finalHomePenalties = liveMatch.homePenalties;
    let finalAwayPenalties = liveMatch.awayPenalties;
    if (isCup && homeScore === awayScore) {
      if (finalHomePenalties === undefined || finalAwayPenalties === undefined || finalHomePenalties === finalAwayPenalties) {
        const shoot = simulatePenaltyShootout(homeTeam, awayTeam, liveMatch.homeTactics, liveMatch.awayTactics);
        finalHomePenalties = shoot.homePenalties;
        finalAwayPenalties = shoot.awayPenalties;
      }
    }

    const hasPenalties = isCup && finalHomePenalties !== undefined && finalAwayPenalties !== undefined;
    const userPenalties = isUserHome ? finalHomePenalties : finalAwayPenalties;
    const oppPenalties = isUserHome ? finalAwayPenalties : finalHomePenalties;

    // In cup matches, a draw does not exist - progression is decided by penalty shootout
    const isUserWin = isCup
      ? (hasPenalties ? (userPenalties! > oppPenalties!) : userScore > oppScore)
      : userScore > oppScore;
    const isUserDraw = isCup
      ? false
      : userScore === oppScore;
    const isUserLoss = isCup
      ? (hasPenalties ? (userPenalties! < oppPenalties!) : userScore < oppScore)
      : userScore < oppScore;

    const matchWinner = isCup
      ? (hasPenalties ? (finalHomePenalties! > finalAwayPenalties! ? homeTeamId : awayTeamId) : (homeScore > awayScore ? homeTeamId : awayTeamId))
      : undefined;

    const resolvedRevenue: MatchRevenueBreakdown = (liveMatch.matchRevenue) || (userClub ? calculateMatchRevenue({
      userClub,
      opponentClub: isUserHome ? awayTeam : homeTeam,
      isHome: isUserHome,
      userScore,
      opponentScore: oppScore,
      leagueTier: activeLeague?.tier || 1,
      isCupMatch: isCup,
      userPenalties: isCup ? userPenalties : undefined,
      opponentPenalties: isCup ? oppPenalties : undefined,
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

    // 1. Update this fixture
    let updatedFixtures = fixtures.map(f => {
      if (f.id === fixture.id) {
        return {
          ...f,
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
      }
      return f;
    });

    let updatedStandings = standings;
    if (DIAGNOSTIC_CONFIG.ENABLE_STANDINGS_UPDATE) {
      console.log('[DIAG] STANDINGS_STARTED');
      if (!fixture.competitionType || fixture.competitionType === 'league') {
        updatedStandings = updateLeagueStandings(standings, homeTeamId, awayTeamId, homeScore, awayScore);
      }
      console.log('[DIAG] STANDINGS_COMPLETED');
    } else {
      console.log('[DIAG] STANDINGS_SKIPPED [TEST_A]');
    }

    // Update cup tournament matches if this was a cup match
    let updatedCupTournament = cupTournament;
    if (isCup && updatedCupTournament) {
      const resolvedMatchWinner = matchWinner || (hasPenalties ? (finalHomePenalties! > finalAwayPenalties! ? homeTeamId : awayTeamId) : (homeScore > awayScore ? homeTeamId : awayTeamId));
      const isFinal = resolvedCupStage === 'final' || fixture.cupStage === 'final' || fixture.stageName?.includes('النهائي');

      if (userClub && resolvedMatchWinner === userClub.id) {
        updatedCupTournament.userEliminatedStage = undefined;
      }

      let cupMatchFoundAndUpdated = false;
      const updatedMatches = updatedCupTournament.matches.map(m => {
        const isSameId = m.id === fixture.id;
        const isSameStage = !resolvedCupStage || m.stage === resolvedCupStage;
        const isUserMatch = Boolean(userClub && (m.homeTeamId === userClub.id || m.awayTeamId === userClub.id) && (homeTeamId === userClub.id || awayTeamId === userClub.id));
        const isSameTwoClubs = (m.homeTeamId === homeTeamId && m.awayTeamId === awayTeamId) || (m.homeTeamId === awayTeamId && m.awayTeamId === homeTeamId);

        if (isSameId || (isSameStage && (isUserMatch || isSameTwoClubs))) {
          cupMatchFoundAndUpdated = true;
          const isMatchInverted = m.homeTeamId === awayTeamId;
          return {
            ...m,
            homeTeamId: m.homeTeamId || (isUserHome ? homeTeamId : awayTeamId),
            awayTeamId: m.awayTeamId || (isUserHome ? awayTeamId : homeTeamId),
            homeScore: isMatchInverted ? awayScore : homeScore,
            awayScore: isMatchInverted ? homeScore : awayScore,
            homePenalties: isMatchInverted ? finalAwayPenalties : finalHomePenalties,
            awayPenalties: isMatchInverted ? finalHomePenalties : finalAwayPenalties,
            winnerTeamId: resolvedMatchWinner,
            isPlayed: true,
            events: persistentEvents,
            stats,
          };
        }
        return m;
      });

      // If placeholder match in this stage had not yet recorded user club, assign it now
      if (!cupMatchFoundAndUpdated && resolvedCupStage) {
        const targetIdx = updatedMatches.findIndex(m => m.stage === resolvedCupStage && !m.isPlayed);
        if (targetIdx !== -1) {
          updatedMatches[targetIdx] = {
            ...updatedMatches[targetIdx],
            homeTeamId: homeTeamId,
            awayTeamId: awayTeamId,
            homeScore,
            awayScore,
            homePenalties: finalHomePenalties,
            awayPenalties: finalAwayPenalties,
            winnerTeamId: resolvedMatchWinner,
            isPlayed: true,
            events: persistentEvents,
            stats,
          };
        } else {
          updatedMatches.push({
            id: fixture.id || `cup_${resolvedCupStage}_user_${currentRound}`,
            stage: resolvedCupStage as any,
            stageName: fixture.stageName || 'مباراة الكأس',
            roundTrigger: currentRound,
            homeTeamId,
            awayTeamId,
            homeScore,
            awayScore,
            homePenalties: finalHomePenalties,
            awayPenalties: finalAwayPenalties,
            winnerTeamId: resolvedMatchWinner,
            isPlayed: true,
            events: persistentEvents,
            stats,
          });
        }
      }

      updatedCupTournament = {
        ...updatedCupTournament,
        matches: updatedMatches,
      };

      if (isFinal) {
        updatedCupTournament.isCompleted = true;
        updatedCupTournament.winnerClubId = resolvedMatchWinner;
        updatedCupTournament.runnerUpClubId = resolvedMatchWinner === homeTeam.id ? awayTeam.id : homeTeam.id;

        if (userClub && resolvedMatchWinner === userClub.id) {
          updatedCupTournament.userEliminatedStage = undefined;
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

          // Add celebration message
          const cupMsg: InboxMessage = {
            id: `msg_cup_champion_${Date.now()}`,
            title: `🏆 مبروك! توجت رسمياً بلقب ${cupTrophy}!`,
            sender: 'اتحاد كرة القدم',
            date: 'المباراة النهائية',
            type: 'board',
            read: false,
            content: `إنجاز تاريخي للمدرب ${manager.name}! بعد ملحمة كروية لا تُنسى، نجحت في قيادة ${userClub?.name} لمنصة التتويج وحصد لقب الكأس الغالية. تم تسجيل اللقب رسمياً في خزينة بطولاتك وإيداع الجائزة المالية في خزينة النادي.`,
          };
          setInbox(prev => [cupMsg, ...prev]);
        } else if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
          updatedCupTournament.userEliminatedStage = 'وصيف الكأس (المباراة النهائية)';
        }
      }
    }

    // 2. Simulate other matches in the same round
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
        events: persistentEvents,
        isCup,
        homePenalties: finalHomePenalties,
        awayPenalties: finalAwayPenalties,
        winnerTeamId: matchWinner,
      }
    ];

    if (DIAGNOSTIC_CONFIG.ENABLE_CPU_SIMULATION) {
      console.log('[DIAG] CPU_SIMULATION_STARTED');
      const otherRoundFixtures = updatedFixtures.filter(f => f.round === currentRound && f.id !== fixture.id && !f.isPlayed);
      
      otherRoundFixtures.forEach(otherFix => {
        const otherHome = (teams.find(t => t && t.id === otherFix.homeTeamId) || (otherFix.homeTeamId ? findClubInWorld(otherFix.homeTeamId) : undefined) || teams[0]) || ({ id: otherFix.homeTeamId || 'home_dummy', name: 'الفريق المضيف', shortName: 'مض', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
        const otherAway = (teams.find(t => t && t.id === otherFix.awayTeamId) || (otherFix.awayTeamId ? findClubInWorld(otherFix.awayTeamId) : undefined) || teams[1]) || ({ id: otherFix.awayTeamId || 'away_dummy', name: 'الفريق الضيف', shortName: 'ضف', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
        const isOtherCup = otherFix.competitionType === 'cup';
        const otherResult = isOtherCup ? simulateKnockoutMatch(otherHome, otherAway) : simulateMatch(otherHome, otherAway, otherHome.tactics, otherAway.tactics);
        const prunedOtherEvents = pruneCpuEvents(otherResult.events);

        updatedFixtures = updatedFixtures.map(f => {
          if (f.id === otherFix.id) {
            return {
              ...f,
              homeScore: otherResult.homeScore,
              awayScore: otherResult.awayScore,
              homePenalties: isOtherCup ? (otherResult as any).homePenalties : undefined,
              awayPenalties: isOtherCup ? (otherResult as any).awayPenalties : undefined,
              winnerTeamId: isOtherCup ? (otherResult as any).winnerTeamId : undefined,
              isPlayed: true,
              events: prunedOtherEvents,
              stats: otherResult.stats,
            };
          }
          return f;
        });

        if (isOtherCup && updatedCupTournament) {
          const koRes = otherResult as any;
          updatedCupTournament = {
            ...updatedCupTournament,
            matches: updatedCupTournament.matches.map(m => {
              if (m.id === otherFix.id || (m.stage === otherFix.cupStage && (m.homeTeamId === otherHome.id || m.awayTeamId === otherAway.id))) {
                return {
                  ...m,
                  homeScore: koRes.homeScore,
                  awayScore: koRes.awayScore,
                  homePenalties: koRes.homePenalties,
                  awayPenalties: koRes.awayPenalties,
                  winnerTeamId: koRes.winnerTeamId,
                  isPlayed: true,
                  events: prunedOtherEvents,
                  stats: koRes.stats,
                };
              }
              return m;
            }),
          };
          if (otherFix.cupStage === 'final') {
            updatedCupTournament.isCompleted = true;
            updatedCupTournament.winnerClubId = koRes.winnerTeamId;
            updatedCupTournament.runnerUpClubId = koRes.winnerTeamId === otherHome.id ? otherAway.id : otherHome.id;
          }
        }

        allRoundMatches.push({
          homeTeamId: otherHome.id,
          awayTeamId: otherAway.id,
          homeScore: otherResult.homeScore,
          awayScore: otherResult.awayScore,
          events: prunedOtherEvents,
        });

        if (DIAGNOSTIC_CONFIG.ENABLE_STANDINGS_UPDATE) {
          if (!otherFix.competitionType || otherFix.competitionType === 'league') {
            updatedStandings = updateLeagueStandings(updatedStandings, otherHome.id, otherAway.id, otherResult.homeScore, otherResult.awayScore);
          }
        }
      });
      console.log('[DIAG] CPU_SIMULATION_COMPLETED');
    } else {
      console.log('[DIAG] CPU_SIMULATION_SKIPPED [TEST_A]');
    }

    // 3. Advance Cup Tournament if applicable
    let cupNewsMessage: string | undefined = undefined;
    let cupBonusPrize = 0;
    let cupBonusDevPoints = 0;
    const cupRewardMessages: InboxMessage[] = [];

    if (updatedCupTournament) {
      const isContinentalActive = Boolean(fixtures?.some(f => f.competitionType === 'continental'));
      const cupAdv = advanceCupTournament(
        updatedCupTournament,
        currentRound,
        teams,
        userClub,
        isContinentalActive,
        totalRounds
      );
      updatedCupTournament = cupAdv.updatedCup;
      cupNewsMessage = cupAdv.cupNewsMessage;

      // Handle cup advancement rewards (financial prize & player development points)
      if (cupAdv.newlyAwardedRewards && cupAdv.newlyAwardedRewards.length > 0 && userClub) {
        cupAdv.newlyAwardedRewards.forEach(reward => {
          cupBonusPrize += reward.prizeMoney;
          cupBonusDevPoints += reward.developmentPoints;

          cupRewardMessages.push({
            id: `msg_cup_stage_reward_${reward.stageKey}_${Date.now()}_${Math.random()}`,
            title: `💰 مكافأة إنجاز الكأس: ${reward.stageName} (+${reward.prizeMoney.toLocaleString()} ج.م و +${reward.developmentPoints} ⚡ نقاط تطوير)`,
            sender: 'لجنة تنظيم الكأس والمسابقات',
            date: `الجولة ${currentRound}`,
            type: 'board',
            read: false,
            content: `تهانينا الحارة لنادي ${userClub.name} وإدارته الفنية واللاعبين!\n\nتقديراً للإنجاز الرائع والوصول إلى [${reward.stageName}] في مسابقة الكأس، تم إيداع مكافأة مالية قدرها ${reward.prizeMoney.toLocaleString()} جنيه مباشرة في خزينة النادي، بالإضافة إلى منح لاعبيك (${reward.developmentPoints}) نقطة تطوير مخصصة لترقية مهاراتهم وقدراتهم في مركز التدريب.`,
          });
        });
      }

      // Synchronize cup matches into fixtures
      if (updatedCupTournament && updatedCupTournament.matches) {
        const cupStages = ['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];
        cupStages.forEach(stage => {
          const stageMatches = updatedCupTournament!.matches.filter(m => m.stage === stage);
          const stageFixes = updatedFixtures.filter(f => (f.competitionType === 'cup' || f.cupStage === stage) && (f.cupStage === stage || (!f.cupStage && f.stageName?.includes(stage))));
          
          stageMatches.forEach((cm, idx) => {
            const targetFix = stageFixes.find(f => f.id === cm.id || (cm.homeTeamId && (f.homeTeamId === cm.homeTeamId || f.awayTeamId === cm.homeTeamId))) || stageFixes[idx];
            if (targetFix) {
              const fIndex = updatedFixtures.findIndex(existingF => existingF.id === targetFix.id);
              if (fIndex !== -1) {
                updatedFixtures[fIndex] = {
                  ...updatedFixtures[fIndex],
                  homeTeamId: cm.homeTeamId || updatedFixtures[fIndex].homeTeamId,
                  awayTeamId: cm.awayTeamId || updatedFixtures[fIndex].awayTeamId,
                  homeScore: cm.homeScore !== undefined ? cm.homeScore : updatedFixtures[fIndex].homeScore,
                  awayScore: cm.awayScore !== undefined ? cm.awayScore : updatedFixtures[fIndex].awayScore,
                  homePenalties: cm.homePenalties !== undefined ? cm.homePenalties : updatedFixtures[fIndex].homePenalties,
                  awayPenalties: cm.awayPenalties !== undefined ? cm.awayPenalties : updatedFixtures[fIndex].awayPenalties,
                  winnerTeamId: cm.winnerTeamId || updatedFixtures[fIndex].winnerTeamId,
                  isPlayed: cm.isPlayed !== undefined ? cm.isPlayed : updatedFixtures[fIndex].isPlayed,
                  events: cm.events || updatedFixtures[fIndex].events,
                  stats: cm.stats || updatedFixtures[fIndex].stats,
                };
              }
            }
          });
        });

        // Run self-healing to guarantee that if user won in Round of 16 (or any cup match),
        // they are 100% placed into the next stage fixture and match
        if (userClub?.id) {
          const rep = repairCupProgressionIntegrity(updatedCupTournament, updatedFixtures, userClub.id);
          if (rep.repaired) {
            updatedCupTournament = rep.updatedCup;
            updatedFixtures = rep.updatedFixtures;
          }
        }
      }
    }

    // 4. Update User Club finances
    // Round wages expense (approx 1/4 of monthly wage bill)
    const roundWages = userClub ? Math.round((userClub.players || []).reduce((sum, p) => sum + (p.salary || 1000), 0) / 4) : 0;

    // Financial breakdown message for user club
    if (userClub && resolvedRevenue) {
      cupRewardMessages.push({
        id: `msg_match_rev_${fixture.id}_${Date.now()}`,
        title: `💰 تقرير إيراد مباراة الجولة ${currentRound}: +${totalMatchRevenue.toLocaleString()} ج.م${resolvedRevenue.isSkippedMatch ? ' (تخطي 50%)' : ''}`,
        sender: 'الإدارة المالية للنادي',
        date: `الجولة ${currentRound}`,
        type: 'board',
        read: false,
        content: `كشف الإيرادات المالية الرسمية لمباراة الجولة ${currentRound}:\n\n` +
          `🏟️ الحضور الجماهيري: ${resolvedRevenue.attendance.toLocaleString()} مشجع من أصل ${resolvedRevenue.stadiumCapacity.toLocaleString()} مقعد (${resolvedRevenue.attendancePercentage}%)\n` +
          `🎟️ سعر التذكرة: ${resolvedRevenue.ticketPrice} ج.م • دخل التذاكر الأساسي: ${resolvedRevenue.ticketRevenue.toLocaleString()} ج.م\n` +
          `📢 رعاة النادي والإعلانات: ${resolvedRevenue.sponsorsRevenue.toLocaleString()} ج.م (مكافأة الفوز: ${resolvedRevenue.sponsorsWinBonus.toLocaleString()} ج.م)\n` +
          (resolvedRevenue.sponsorsBreakdown && resolvedRevenue.sponsorsBreakdown.length > 0
            ? resolvedRevenue.sponsorsBreakdown.map(b => `  • ${b}`).join('\n') + '\n'
            : '') +
          `🏆 مكافأة النتيجة الرسمية (${resolvedRevenue.resultType === 'win' ? 'فوز' : resolvedRevenue.resultType === 'draw' ? 'تعادل' : 'مشاركة'}): ${resolvedRevenue.resultBonus.toLocaleString()} ج.م\n` +
          (resolvedRevenue.isSkippedMatch ? `\n⚠️ خصم تخطي المباراة (50%): -${resolvedRevenue.skipPenaltyAmount?.toLocaleString()} ج.م\n(تم منحك نصف الإيرادات فقط كخصم لتخطي المباراة، تشجيعاً لخوض المباريات كاملة)\n` : '') +
          (resolvedRevenue.isDoubledWithAd ? `🎁 مكافأة مضاعفة الإعلان (2X): +${resolvedRevenue.adDoubledBonus?.toLocaleString()} ج.م\n` : '') +
          `\n✅ الإجمالي النهائي المودع في رصيد النادي: ${totalMatchRevenue.toLocaleString()} جنيه مصري.`,
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

        return {
          ...t,
          budget: t.isUserClub ? t.budget + totalMatchRevenue + cupBonusPrize + extraTransferIncome : t.budget,
          developmentPoints: t.isUserClub ? (t.developmentPoints || 0) + cupBonusDevPoints : t.developmentPoints,
          players: updatedPlayers,
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
    const matchBonus = (isUserWin && userClub) ? (activeLeague.tier === 1 ? 12000 : activeLeague.tier === 2 ? 7000 : activeLeague.tier === 3 ? 4500 : 3000) : 0;
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
    const updatedManager: ManagerProfile = {
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

    // 6.5. Generate Incoming AI Bids & Check Expiring Contracts for User Club
    if (DIAGNOSTIC_CONFIG.ENABLE_INCOMING_BIDS) {
      console.log('[DIAG] BIDS_STARTED');
      const latestUserClub = updatedAllTeams.find(t => t.isUserClub || (userClub && t.id === userClub.id)) || userClub;
      if (latestUserClub) {
        const aiBidsResult = generateIncomingAiBids(updatedAllTeams, latestUserClub, currentRound, season.seasonNumber);
        if (aiBidsResult.bids.length > 0) {
          setIncomingBids(prev => [...aiBidsResult.bids, ...prev]);
          newInboxMsgs.unshift(...aiBidsResult.inboxMessages);
        }

        // Check expiring contracts
        const contractAlerts = checkExpiringContracts(latestUserClub, `الجولة ${currentRound}`, inbox);
        if (contractAlerts.length > 0) {
          newInboxMsgs.unshift(...contractAlerts);
        }
      }
      console.log('[DIAG] BIDS_COMPLETED');
    } else {
      console.log('[DIAG] BIDS_SKIPPED [TEST_A]');
    }

    const nextRoundNumber = currentRound + 1;
    const remainingLeagueFixtures = updatedFixtures.filter(f => (!f.competitionType || f.competitionType === 'league') && !f.isPlayed);
    const hasRemainingRounds = nextRoundNumber <= totalRounds && updatedFixtures.some(f => f.round >= nextRoundNumber);
    const isNowFinished = !hasRemainingRounds && remainingLeagueFixtures.length === 0;

    // 7. Check if Season Concluded
    if (isNowFinished) {
      const summaryClub = userClub || teams.find(t => t.isUserClub) || teams[0];
      const summary = calculateSeasonEndSummary(
        { ...season, status: 'completed', totalRounds },
        updatedStandings,
        summaryClub,
        activeLeague,
        updatedCupTournament,
        updatedManager
      );

      const generatedOffers = generateSeasonJobOffers(
        updatedManager,
        summaryClub,
        activeLeague,
        summary.finalPosition
      );

      // Sponsor League Champion / Top 4 Milestone Bonuses
      if (summary.finalPosition === 1) {
        const leagueTrophyBonus = (summaryClub.sponsors || []).reduce(
          (sum, sp) => sum + (sp.milestoneBonus?.leagueChampionBonus || 0),
          0
        );
        if (leagueTrophyBonus > 0) {
          summaryClub.budget = (summaryClub.budget || 0) + leagueTrophyBonus;
          newInboxMsgs.unshift({
            id: `msg_sponsor_league_trophy_${Date.now()}`,
            title: `🏆 مكافأة الرعاة للتتويج بالدوري: +${leagueTrophyBonus.toLocaleString()} ج.م!`,
            sender: 'تحالف الرعاة والشركاء التجاريين',
            date: 'ختام الموسم',
            type: 'board',
            read: false,
            content: `تهانينا الحارة بالتتويج بلقب الدوري الممتاز! تقديراً لهذا الإنجاز العظيم، قرر رعاة النادي تفعيل بند مكافأة التتويج وصرف +${leagueTrophyBonus.toLocaleString()} جنيه مصري لحساب النادي فوراً!`,
          });
        }
      } else if (summary.finalPosition <= 4) {
        const topFourBonus = (summaryClub.sponsors || []).reduce(
          (sum, sp) => sum + (sp.milestoneBonus?.topFourFinishBonus || 0),
          0
        );
        if (topFourBonus > 0) {
          summaryClub.budget = (summaryClub.budget || 0) + topFourBonus;
          newInboxMsgs.unshift({
            id: `msg_sponsor_top4_bonus_${Date.now()}`,
            title: `⭐ مكافأة الرعاة للمربع الذهبي: +${topFourBonus.toLocaleString()} ج.م!`,
            sender: 'لجنة الرعاة الرسميين',
            date: 'ختام الموسم',
            type: 'board',
            read: false,
            content: `تقديراً لإنهاء الموسم في المربع الذهبي وحجز مقعد قاري في بطولات إفريقيا، تم إيداع حافز المربع الذهبي +${topFourBonus.toLocaleString()} ج.م في خزينة النادي!`,
          });
        }
      }

      setSeasonEndSummary(summary);
      setJobOffers(generatedOffers);
      setShowSeasonTransitionModal(true);

      newInboxMsgs.unshift({
        id: `msg_season_end_${season.seasonNumber}_${Date.now()}`,
        title: `🏁 ختام الموسم ${season.seasonNumber} - ${summary.resultTitle}`,
        sender: 'مجلس إدارة النادي والرابطة',
        date: `ختام الموسم`,
        type: 'board',
        read: false,
        content: `انتهت منافسات الموسم رسمياً. ${summary.resultDescription} اضغط على زر مراجعة الموسم للاطلاع على الحصيلة الشاملة وعروض التدريب المقدمة إليك.`,
      });

      setSeason(prev => ({ ...prev, status: 'completed' }));
    }

    // Commit changes
    console.log('[MatchEndingFlow] Committing updated states to React: fixtures, standings, manager, cup, inbox, teams, currentRound');
    setFixtures(updatedFixtures);
    if (DIAGNOSTIC_CONFIG.ENABLE_STANDINGS_UPDATE) {
      setStandings(updatedStandings);
    }
    setManager(updatedManager);
    setCupTournament(updatedCupTournament);
    setInbox(prev => [...newInboxMsgs, ...prev]);
    if (DIAGNOSTIC_CONFIG.ENABLE_PLAYER_PROCESSING) {
      setTeams(updatedAllTeams);
    }

    setCurrentRound(nextRoundNumber);
    setLiveMatch(null);

    // Boost Consumption
    try {
      AdManager.consumeTrainingBoost();
    } catch (e) {
      console.warn('Non-fatal error consuming training boost:', e);
    }

    // Interstitial Check (decoupled microtask so it never blocks React UI or causes race condition)
    try {
      queueMicrotask(() => {
        try {
          AdManager.onMatchCompleted();
        } catch (adErr) {
          console.warn('Non-fatal AdMob onMatchCompleted error:', adErr);
        }
      });
    } catch (e) {
      // ignore
    }

    // Immediately persist to local disk repository before releasing the concurrency lock
    if (DIAGNOSTIC_CONFIG.ENABLE_SAVE) {
      console.log('[DIAG] SAVE_STARTED');
      console.log('[MatchEndingFlow] SAVE_STARTED');
      try {
        gameStateRepository.saveLocalGameState({
          schemaVersion: 2,
          saveVersion: 1,
          lastLocalSaveAt: Date.now(),
          season,
          activeLeague,
          teams: updatedAllTeams,
          standings: updatedStandings,
          fixtures: updatedFixtures,
          currentRound: nextRoundNumber,
          manager: updatedManager,
          transferMarket,
          incomingBids,
          inbox: [...newInboxMsgs, ...inbox],
          cupTournament: updatedCupTournament,
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
      console.error('[MatchEndingFlow] CRITICAL UNCAUGHT EXCEPTION in finishLiveMatchAndAdvance:', error);
      try {
        setLiveMatch(null);
      } catch (e) {
        console.error('[MatchEndingFlow] Failed to clear liveMatch in catch block:', e);
      }
    } finally {
      // Concurrency lock released ONLY after state update and save have finished
      setTimeout(() => {
        isFinishingMatchRef.current = false;
        isSimulationRunningRef.current = false;
        setIsSimulationRunning(false);
        console.log('[MatchEndingFlow] Concurrency locks released successfully');
      }, 150);
    }
  };

  const instantSimulateCurrentRound = () => {
    if (isSimulationRunningRef.current || seasonFinished) return;
    if (liveMatch) return;

    const roundFixtures = fixtures.filter(f => f.round === currentRound && !f.isPlayed);
    const userPlaysThisRound = userClub && roundFixtures.some(f => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id);
    const userFix = roundFixtures.find(f => f.homeTeamId === userClub?.id || f.awayTeamId === userClub?.id);

    // Match Day Gating: User cannot play before reaching match date (only if user has a match this round)
    if (userPlaysThisRound && userClub && userFix && !isMatchDay && daysUntilNextMatch > 0) {
      const opp = teams.find(t => t.id === (userFix?.homeTeamId === userClub.id ? userFix?.awayTeamId : userFix?.homeTeamId));
      setMatchBlocker({
        isOpen: true,
        reason: 'not_match_day',
        title: '⏳ اليوم ليس موعد المباراة!',
        message: `متبقي ${daysUntilNextMatch} ${daysUntilNextMatch === 1 ? 'يوم' : 'أيام'} حتى موعد مباراة الجولة ${currentRound} أمام (${opp?.name || 'المنافس'}). يمكنك استخدام زر (تخطي الأيام حتى موعد المباراة) للوصول مباشرة إلى يوم اللقاء، أو التقدم يوماً بيوم لإتمام الحصص التدريبية.`,
        fixture: userFix,
        opponentClub: opp,
      });
      return;
    }

    // Lineup validity check for user's club before instant simulation (only if user club is playing)
    if (userPlaysThisRound && userClub) {
      const val = validateSquadLineup(userClub);
      if (!val.isValid) {
        setMatchBlocker({
          isOpen: true,
          reason: 'lineup_issue',
          title: '🚨 تنبيه: تعذر محاكاة الجولة بسبب التشكيلة',
          message: 'يوجد لاعبون مصابون أو موقوفون في التشكيل الأساسي! يرجى تعديل التشكيلة أولاً أو الضغط على الضبط التلقائي.',
          invalidStarters: val.invalidStarters,
        });
        return;
      }
    }

    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);

    if (liveMatchTimerRef.current) {
      clearInterval(liveMatchTimerRef.current);
      liveMatchTimerRef.current = null;
    }

    try {

    // 1. Simulate all matches of current round
    let updatedFixtures = [...fixtures];
    let updatedStandings = [...standings];
    let updatedCupTournament = cupTournament;
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

    roundFixtures.forEach(fix => {
      const homeTeam = (teams.find(t => t && t.id === fix.homeTeamId) || (fix.homeTeamId ? findClubInWorld(fix.homeTeamId) : undefined) || teams[0]) || ({ id: fix.homeTeamId || 'home_dummy', name: 'الفريق المضيف', shortName: 'مض', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
      const awayTeam = (teams.find(t => t && t.id === fix.awayTeamId) || (fix.awayTeamId ? findClubInWorld(fix.awayTeamId) : undefined) || teams[1]) || ({ id: fix.awayTeamId || 'away_dummy', name: 'الفريق الضيف', shortName: 'ضف', players: [], tactics: { startingPlayerIds: [], benchPlayerIds: [] } } as any);
      const isCup = fix.competitionType === 'cup';
      const matchResult = isCup
        ? simulateKnockoutMatch(homeTeam, awayTeam)
        : simulateMatch(homeTeam, awayTeam, homeTeam?.tactics, awayTeam?.tactics);

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
          isCupMatch: isCup,
          customTicketPrice: userClub.facilities?.ticketPrice,
          isSkipped: true, // 50% revenue for fast-simulated / skipped match
        });
        fixtureUserRevenue.isClaimedToBudget = true;
        userSimMatchRevenue = fixtureUserRevenue;
      }

      const matchEvents = (matchResult.events || []).filter(e =>
        e && (
          e.type === 'goal' ||
          e.type === 'yellow_card' ||
          e.type === 'red_card' ||
          e.type === 'substitution' ||
          e.type === 'injury' ||
          (isUserMatch && (e.type === 'save' || e.type === 'chance'))
        )
      );

      updatedFixtures = updatedFixtures.map(f => {
        if (f.id === fix.id) {
          return {
            ...f,
            homeScore: matchResult.homeScore,
            awayScore: matchResult.awayScore,
            homePenalties: isCup ? (matchResult as any).homePenalties : undefined,
            awayPenalties: isCup ? (matchResult as any).awayPenalties : undefined,
            winnerTeamId: isCup ? (matchResult as any).winnerTeamId : undefined,
            isPlayed: true,
            events: matchEvents,
            stats: matchResult.stats,
            matchRevenue: fixtureUserRevenue || f.matchRevenue,
            revenueClaimed: isUserMatch ? true : f.revenueClaimed,
          };
        }
        return f;
      });

      allRoundMatches.push({
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: matchResult.homeScore,
        awayScore: matchResult.awayScore,
        events: matchEvents,
        isCup,
        homePenalties: isCup ? (matchResult as any).homePenalties : undefined,
        awayPenalties: isCup ? (matchResult as any).awayPenalties : undefined,
        winnerTeamId: isCup ? (matchResult as any).winnerTeamId : undefined,
      });

      if (!fix.competitionType || fix.competitionType === 'league') {
        updatedStandings = updateLeagueStandings(updatedStandings, homeTeam.id, awayTeam.id, matchResult.homeScore, matchResult.awayScore);
      } else if (fix.competitionType === 'cup' && updatedCupTournament) {
        const koRes = matchResult as any;
        const isCupFinal = fix.cupStage === 'final' || fix.stageName?.includes('النهائي');

        updatedCupTournament = {
          ...updatedCupTournament,
          matches: updatedCupTournament.matches.map(m => {
            if (m.id === fix.id || (m.stage === fix.cupStage && (m.homeTeamId === homeTeam.id || m.awayTeamId === awayTeam.id))) {
              return {
                ...m,
                homeScore: matchResult.homeScore,
                awayScore: matchResult.awayScore,
                homePenalties: koRes.homePenalties,
                awayPenalties: koRes.awayPenalties,
                winnerTeamId: koRes.winnerTeamId,
                isPlayed: true,
                events: matchEvents,
                stats: matchResult.stats,
              };
            }
            return m;
          }),
        };

        if (isCupFinal) {
          updatedCupTournament.isCompleted = true;
          updatedCupTournament.winnerClubId = koRes.winnerTeamId;
          updatedCupTournament.runnerUpClubId = koRes.winnerTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;

          if (userClub && koRes.winnerTeamId === userClub.id) {
            updatedCupTournament.userEliminatedStage = undefined;
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

            const cupMsg: InboxMessage = {
              id: `msg_cup_champion_${Date.now()}`,
              title: `🏆 مبروك! توجت رسمياً بلقب ${cupTrophy}!`,
              sender: 'اتحاد كرة القدم',
              date: 'المباراة النهائية',
              type: 'board',
              read: false,
              content: `إنجاز تاريخي للمدرب ${manager.name}! بعد ملحمة كروية لا تُنسى، نجحت في قيادة ${userClub?.name} لمنصة التتويج وحصد لقب الكأس الغالية. تم تسجيل اللقب رسمياً في خزينة بطولاتك وإيداع الجائزة المالية في خزينة النادي.`,
            };
            setInbox(prev => [cupMsg, ...prev]);
          } else if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
            updatedCupTournament.userEliminatedStage = 'وصيف الكأس (المباراة النهائية)';
          }
        }
      }
    });

    // 2. Advance Cup Tournament if applicable
    let cupNewsMessage: string | undefined = undefined;
    let simCupBonusPrize = 0;
    let simCupBonusDevPoints = 0;
    const simCupRewardMessages: InboxMessage[] = [];

    if (updatedCupTournament) {
      const isContinentalActive = Boolean(fixtures?.some(f => f.competitionType === 'continental'));
      const cupAdv = advanceCupTournament(
        updatedCupTournament,
        currentRound,
        teams,
        userClub || undefined,
        isContinentalActive,
        totalRounds
      );
      updatedCupTournament = cupAdv.updatedCup;
      cupNewsMessage = cupAdv.cupNewsMessage;

      // Handle cup advancement rewards (financial prize & player development points)
      if (cupAdv.newlyAwardedRewards && cupAdv.newlyAwardedRewards.length > 0 && userClub) {
        cupAdv.newlyAwardedRewards.forEach(reward => {
          simCupBonusPrize += reward.prizeMoney;
          simCupBonusDevPoints += reward.developmentPoints;

          simCupRewardMessages.push({
            id: `msg_cup_stage_reward_${reward.stageKey}_${Date.now()}_${Math.random()}`,
            title: `💰 مكافأة إنجاز الكأس: ${reward.stageName} (+${reward.prizeMoney.toLocaleString()} ج.م و +${reward.developmentPoints} ⚡ نقاط تطوير)`,
            sender: 'لجنة تنظيم الكأس والمسابقات',
            date: `الجولة ${currentRound}`,
            type: 'board',
            read: false,
            content: `تهانينا الحارة لنادي ${userClub.name} وإدارته الفنية واللاعبين!\n\nتقديراً للإنجاز الرائع والوصول إلى [${reward.stageName}] في مسابقة الكأس، تم إيداع مكافأة مالية قدرها ${reward.prizeMoney.toLocaleString()} جنيه مباشرة في خزينة النادي، بالإضافة إلى منح لاعبيك (${reward.developmentPoints}) نقطة تطوير مخصصة لترقية مهاراتهم وقدراتهم في مركز التدريب.`,
          });
        });
      }

      // Synchronize cup matches into fixtures
      if (updatedCupTournament && updatedCupTournament.matches) {
        const cupStages = ['round_of_64', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];
        cupStages.forEach(stage => {
          const stageMatches = updatedCupTournament!.matches.filter(m => m.stage === stage);
          const stageFixes = updatedFixtures.filter(f => (f.competitionType === 'cup' || f.cupStage === stage) && (f.cupStage === stage || (!f.cupStage && f.stageName?.includes(stage))));
          stageMatches.forEach((cm, idx) => {
            const targetFix = stageFixes.find(f => f.id === cm.id || (cm.homeTeamId && (f.homeTeamId === cm.homeTeamId || f.awayTeamId === cm.homeTeamId))) || stageFixes[idx];
            if (targetFix) {
              const fIndex = updatedFixtures.findIndex(existingF => existingF.id === targetFix.id);
              if (fIndex !== -1) {
                updatedFixtures[fIndex] = {
                  ...updatedFixtures[fIndex],
                  cupStage: stage as any,
                  homeTeamId: cm.homeTeamId || updatedFixtures[fIndex].homeTeamId,
                  awayTeamId: cm.awayTeamId || updatedFixtures[fIndex].awayTeamId,
                  homeScore: cm.homeScore !== undefined ? cm.homeScore : updatedFixtures[fIndex].homeScore,
                  awayScore: cm.awayScore !== undefined ? cm.awayScore : updatedFixtures[fIndex].awayScore,
                  homePenalties: cm.homePenalties !== undefined ? cm.homePenalties : updatedFixtures[fIndex].homePenalties,
                  awayPenalties: cm.awayPenalties !== undefined ? cm.awayPenalties : updatedFixtures[fIndex].awayPenalties,
                  winnerTeamId: cm.winnerTeamId || updatedFixtures[fIndex].winnerTeamId,
                  isPlayed: cm.isPlayed !== undefined ? cm.isPlayed : updatedFixtures[fIndex].isPlayed,
                  events: cm.events || updatedFixtures[fIndex].events,
                  stats: cm.stats || updatedFixtures[fIndex].stats,
                };
              }
            }
          });
        });

        // Run self-healing to guarantee that if user won in Round of 16 (or any cup match),
        // they are 100% placed into the next stage fixture and match
        if (userClub?.id) {
          const rep = repairCupProgressionIntegrity(updatedCupTournament, updatedFixtures, userClub.id);
          if (rep.repaired) {
            updatedCupTournament = rep.updatedCup;
            updatedFixtures = rep.updatedFixtures;
          }
        }
      }
    }

    // 3. Update Teams & Players Stats
    const updatedAllTeams = teams.map(t => {
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

      return {
        ...t,
        budget: t.isUserClub ? t.budget + simMatchIncome + simCupBonusPrize + extraTransferIncome : t.budget,
        developmentPoints: t.isUserClub ? (t.developmentPoints || 0) + simCupBonusDevPoints : t.developmentPoints,
        players: updatedPlayers,
      };
    });

    // 4. Update Manager Profile if employed
    let updatedManager = { ...manager };
    const newInboxMsgs: InboxMessage[] = [];

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
        const simMatchBonus = isUserWin ? (activeLeague.tier === 1 ? 12000 : activeLeague.tier === 2 ? 7000 : activeLeague.tier === 3 ? 4500 : 3000) : 0;
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
              `🏆 مكافأة النتيجة الرسمية (${userSimMatchRevenue.resultType === 'win' ? 'فوز' : userSimMatchRevenue.resultType === 'draw' ? 'تعادل' : 'مشاركة'}): ${userSimMatchRevenue.resultBonus.toLocaleString()} ج.م\n` +
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
        setIncomingBids(prev => [...aiBidsResult.bids, ...prev]);
        newInboxMsgs.unshift(...aiBidsResult.inboxMessages);
      }

      // Check expiring contracts
      const contractAlerts = checkExpiringContracts(latestUserClubSim, `الجولة ${currentRound}`, inbox);
      if (contractAlerts.length > 0) {
        newInboxMsgs.unshift(...contractAlerts);
      }
    }

    const nextRoundNumber = currentRound + 1;
    const remainingLeagueFixtures = updatedFixtures.filter(f => (!f.competitionType || f.competitionType === 'league') && !f.isPlayed);
    const hasRemainingRounds = nextRoundNumber <= totalRounds && updatedFixtures.some(f => f.round >= nextRoundNumber);
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
        updatedManager
      );

      const generatedOffers = generateSeasonJobOffers(
        updatedManager,
        summaryClub,
        activeLeague,
        summary.finalPosition
      );

      // Sponsor League Champion / Top 4 Milestone Bonuses
      if (summary.finalPosition === 1) {
        const leagueTrophyBonus = (summaryClub.sponsors || []).reduce(
          (sum, sp) => sum + (sp.milestoneBonus?.leagueChampionBonus || 0),
          0
        );
        if (leagueTrophyBonus > 0) {
          summaryClub.budget = (summaryClub.budget || 0) + leagueTrophyBonus;
          newInboxMsgs.unshift({
            id: `msg_sponsor_league_trophy_sim_${Date.now()}`,
            title: `🏆 مكافأة الرعاة للتتويج بالدوري: +${leagueTrophyBonus.toLocaleString()} ج.م!`,
            sender: 'تحالف الرعاة والشركاء التجاريين',
            date: 'ختام الموسم',
            type: 'board',
            read: false,
            content: `تهانينا الحارة بالتتويج بلقب الدوري الممتاز! تقديراً لهذا الإنجاز، قرر رعاة النادي تفعيل بند مكافأة التتويج وصرف +${leagueTrophyBonus.toLocaleString()} جنيه مصري لحساب النادي فوراً!`,
          });
        }
      } else if (summary.finalPosition <= 4) {
        const topFourBonus = (summaryClub.sponsors || []).reduce(
          (sum, sp) => sum + (sp.milestoneBonus?.topFourFinishBonus || 0),
          0
        );
        if (topFourBonus > 0) {
          summaryClub.budget = (summaryClub.budget || 0) + topFourBonus;
          newInboxMsgs.unshift({
            id: `msg_sponsor_top4_bonus_sim_${Date.now()}`,
            title: `⭐ مكافأة الرعاة للمربع الذهبي: +${topFourBonus.toLocaleString()} ج.م!`,
            sender: 'لجنة الرعاة الرسميين',
            date: 'ختام الموسم',
            type: 'board',
            read: false,
            content: `تقديراً لإنهاء الموسم في المربع الذهبي وحجز مقعد قاري في بطولات إفريقيا، تم إيداع حافز المربع الذهبي +${topFourBonus.toLocaleString()} ج.م في خزينة النادي!`,
          });
        }
      }

      setSeasonEndSummary(summary);
      setJobOffers(generatedOffers);
      setShowSeasonTransitionModal(true);

      newInboxMsgs.unshift({
        id: `msg_season_end_${season.seasonNumber}_${Date.now()}`,
        title: `🏁 ختام الموسم ${season.seasonNumber} - ${summary.resultTitle}`,
        sender: 'الاتحاد ورابطة الأندية',
        date: `ختام الموسم`,
        type: 'board',
        read: false,
        content: `انتهت منافسات الموسم رسمياً. ${summary.resultDescription} اضغط على زر مراجعة الموسم للاطلاع على الحصيلة الشاملة وعروض التدريب المقدمة إليك.`,
      });

      setSeason(prev => ({ ...prev, status: 'completed' }));
    }

    // Commit changes
    setFixtures(updatedFixtures);
    setStandings(updatedStandings);
    setManager(updatedManager);
    setCupTournament(updatedCupTournament);
    setInbox(prev => [...newInboxMsgs, ...prev]);
    setTeams(updatedAllTeams);
    setCurrentRound(nextRoundNumber);
    setLiveMatch(null);

    // Generate fresh matchday headlines for the football world
    try {
      const matchdayNews = generateImmersiveNewsBatch({
        calendarDate,
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
    // Interstitial Check (non-blocking background preload & show if ready)
    AdManager.onMatchCompleted();
    console.log('[MatchEndingFlow] Instant simulate round completed successfully');
    } catch (error) {
      console.error('[MatchEndingFlow] CRITICAL UNCAUGHT EXCEPTION in instantSimulateCurrentRound:', error);
    } finally {
      setTimeout(() => {
        isSimulationRunningRef.current = false;
        setIsSimulationRunning(false);
      }, 100);
    }
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

      setFixtures(res.nextFixtures);
      setStandings(res.nextStandings);
      setTeams(res.nextTeams);
      setCurrentRound(res.nextRound);

      if (res.seasonFinished) {
        const summaryClub = userClub || res.nextTeams.find(t => t.isUserClub) || res.nextTeams[0];
        const summary = calculateSeasonEndSummary(
          { ...season, status: 'completed', totalRounds },
          res.nextStandings,
          summaryClub,
          activeLeague,
          cupTournament,
          manager
        );
        const generatedOffers = generateSeasonJobOffers(
          manager,
          summaryClub,
          activeLeague,
          summary.finalPosition
        );
        setSeasonEndSummary(summary);
        setJobOffers(generatedOffers);
        setShowSeasonTransitionModal(true);
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

  const buyPlayer = (player: Player): { success: boolean; message: string } => {
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
      const transferFee = Math.max(25000, Number(player.marketValue) || fairMarketValue || 50000);
      const salary = Math.max(2500, Number(player.salary) || recommendedMonthlyWage || 2500);

      const transferResult = executeAtomicTransfer({
        player,
        sellingClubId: player.currentClubId,
        buyingClubId: userClub.id,
        allTeams: teams,
        transferFee,
        salary,
        contractYears: 2,
        currentRound,
        seasonNumber: season.seasonNumber,
      });

      if (!transferResult.success) {
        return { success: false, message: transferResult.message };
      }

      setTeams(transferResult.updatedTeams);
      setTransferMarket(prev => (Array.isArray(prev) ? prev : []).filter(p => p && p.id && p.id !== player.id));

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

    const saleAmount = Math.round((targetPlayer.marketValue || 50000) * 0.95);

    const newStarting = userClub.tactics?.startingPlayerIds.filter(id => id !== playerId) || [];
    const newBench = userClub.tactics?.benchPlayerIds.filter(id => id !== playerId) || [];

    setTeams(prev => prev.map(t => {
      if (t.isUserClub) {
        return {
          ...t,
          budget: t.budget + saleAmount,
          players: (t.players || []).filter(p => p.id !== playerId),
          tactics: t.tactics ? {
            ...t.tactics,
            startingPlayerIds: newStarting,
            benchPlayerIds: newBench,
          } : undefined,
        };
      }
      return t;
    }));

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
      toClubName: 'نادي آخر (سوق الانتقالات)',
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
      content: `تمت الموافقة على بيع اللاعب ${targetPlayer.name} بمبلغ ${saleAmount.toLocaleString()} جنيه وتم إيداع المبلغ في خزينة النادي.`,
    };
    setInbox(prev => [sellMsg, ...prev]);

    return { success: true, message: `تم بيع ${targetPlayer.name} مقابل ${saleAmount.toLocaleString()} جنيه!` };
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
            message: `تم إدراج ${targetPlayer.name} في لائحة الانتقالات. ولكن لا يوجد نادٍ يمتلك الميزانية الكافية (${(targetPlayer.marketValue || 0).toLocaleString()} ج.م) والسمعة المناسبة لتقديم عرض شراء رسمي في الوقت الحالي.`,
          };
        }

        const { club: buyerClub, maxAffordableFee } = eligibleBuyers[Math.floor(Math.random() * eligibleBuyers.length)];

        // Generate an initial realistic offer (90% to 110% of market value, strictly capped by club's budget ceiling)
        const multiplier = 0.90 + Math.random() * 0.15;
        const rawOffer = Math.round((targetPlayer.marketValue || 100000) * multiplier);
        const offerFee = Math.min(rawOffer, maxAffordableFee, Math.floor(buyerClub.budget * 0.85));

        if (offerFee <= 0 || offerFee > buyerClub.budget) {
          return {
            success: true,
            message: `تم إدراج ${targetPlayer.name} في لائحة الانتقالات لاستقبال العروض.`,
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
          contractYears: 2,
          squadRole: 'first_team',
          daysRemainingInStage: 3,
          managerHasCountered: false,
          counterCount: 0,
          statusMessage: `وصل عرض رسمي من نادي ${buyerClub.name} للتعاقد مع اللاعب ${targetPlayer.name} بمقابل مالي قدره (${offerFee.toLocaleString()} ج.م). يمكنك قبول البيع أو تقديم عرض مالي مقابل أو رفض العرض.`,
          actionRequired: true,
          history: [
            {
              dateStr: calendarDate.rawDateStr,
              message: `[${calendarDate.formattedArabic}] عرض اللاعب للبيع وتلقي عرض رسمي من نادي ${buyerClub.name} بقيمة (${offerFee.toLocaleString()} ج.م).`,
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
          content: `تلقى ناديك عرضاً رسمياً من نادي ${buyerClub.name} لشراء اللاعب ${targetPlayer.name} بمقابل ${offerFee.toLocaleString()} ج.م (ميزانية النادي المشتري: ${buyerClub.budget.toLocaleString()} ج.م). يمكنك مراجعة العرض والموافقة عليه أو تقديم عرض مقابل واحد من تبويب المفاوضات.`,
        };
        setInbox(prev => [sellInboxMsg, ...prev]);

        return {
          success: true,
          message: `تم عرض ${targetPlayer.name} في سوق الانتقالات وتلقى النادي عرضاً رسمياً من نادي ${buyerClub.name} بمبلغ (${offerFee.toLocaleString()} ج.م)!`,
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

    let renewedPlayerName = '';
    let updatedYears = years;

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
            updatedYears = (p.contractYears || 0) + years;
            return {
              ...p,
              salary: wage,
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
      content: `تم توثيق عقد جديد للاعب ${renewedPlayerName} يمتد لـ ${updatedYears} سنوات براتب شهري ${wage.toLocaleString()} ج.م، وارتفعت معنويات اللاعب وتأكد بقاؤه مع النادي!`,
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
              currentSalary: wage,
              contractYears: updatedYears,
            },
          };
        }
        return m;
      }),
    ]);

    return { success: true, message: `تم تجديد عقد ${renewedPlayerName || 'اللاعب'} بنجاح لمدة ${years} سنوات!` };
  };

  const upgradeFacility = (facilityKey: keyof ClubFacilities, cost: number): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

    if (userClub.budget < cost) {
      return { success: false, message: 'الميزانية لا تكفي لإجراء هذا التطوير!' };
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      const currentVal = t.facilities[facilityKey];
      if (typeof currentVal === 'number' && currentVal >= 5) {
        return t;
      }
      return {
        ...t,
        budget: t.budget - cost,
        facilities: {
          ...t.facilities,
          [facilityKey]: typeof currentVal === 'number' ? currentVal + 1 : currentVal,
          stadiumCapacity: facilityKey === 'stadiumLevel' ? t.facilities.stadiumCapacity + 600 : t.facilities.stadiumCapacity,
        }
      };
    }));

    // Update Club Economy Summary
    setClubEconomy(prev => ({
      ...prev,
      facilitySpendingTotal: prev.facilitySpendingTotal + cost,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - cost,
    }));

    return { success: true, message: 'تمت ترقية وتطوير المنشأة بنجاح!' };
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
      daysRemaining: 7,
      severity: 'moderate' as const,
      description: 'إصابة تستدعي العلاج الطبي والتأهيل',
    };

    let cost = 5000;
    let treatmentName = 'جلسات علاج طبيعي وتأهيل حركي';
    let newDaysRemaining = currentInjury.daysRemaining;
    let fullyRecovered = false;

    if (treatmentType === 'physio') {
      cost = 5000;
      treatmentName = 'جلسات علاج طبيعي وتأهيل حركي مكثف';
      newDaysRemaining = Math.max(1, Math.ceil(currentInjury.daysRemaining * 0.65));
    } else if (treatmentType === 'specialist') {
      cost = 20000;
      treatmentName = 'استشارة طبيب أخصائي رياضي وعلاج بالليزر والموجات';
      newDaysRemaining = Math.max(1, Math.ceil(currentInjury.daysRemaining * 0.35));
    } else if (treatmentType === 'prp') {
      cost = 45000;
      treatmentName = 'حقن البلازما الغنية بالصفائح (PRP) وعلاج فوري متقدم';
      if (currentInjury.daysRemaining <= 4) {
        fullyRecovered = true;
        newDaysRemaining = 0;
      } else {
        newDaysRemaining = 1;
      }
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

          resolve({
            success: true,
            message: `🎉 مبروك! تمت مضاعفة إيراد المباراة بنجاح وحصلت على +${bonusAmount.toLocaleString()} ج.م إضافية!`,
          });
        },
        onDismiss: (earned) => {
          if (!earned) {
            resolve({ success: false, message: 'لم تكتمل مشاهدة الإعلان حتى نهايته، لم يتم منح المضاعفة.' });
          }
        },
        onFailure: () => {
          resolve({ success: false, message: 'تعذر تحميل الإعلان حالياً، يرجى المحاولة بعد قليل.' });
        },
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

    // 12 months wage distribution: 12 EGP of cash budget allocates 1 EGP/month of permanent wage capacity
    const monthlyWageBonus = Math.round(cashAmount / 12);
    if (monthlyWageBonus < 100) {
      return {
        success: false,
        message: 'الحد الأدنى للتحويل هو 1,200 ج.م لإضافة 100 ج.م شهرياً لسقف الرواتب.',
      };
    }

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        budget: Math.max(0, t.budget - cashAmount),
        wageBudgetMonthly: (t.wageBudgetMonthly || 0) + monthlyWageBonus,
      };
    }));

    setClubEconomy(prev => ({
      ...prev,
      currentSeasonNetProfit: prev.currentSeasonNetProfit - cashAmount,
    }));

    return {
      success: true,
      message: `تم تحويل ${cashAmount.toLocaleString()} ج.م من ميزانية النادي إلى ميزانية الرواتب بنجاح (+${monthlyWageBonus.toLocaleString()} ج.م شهرياً لسقف الرواتب)!`,
    };
  };

  const transferWageToCashBudget = (monthlyAmount: number): { success: boolean; message: string } => {
    if (!userClub || manager.isUnemployed) {
      return { success: false, message: 'أنت غير مرتبط بأي نادٍ حالياً!' };
    }

    if (monthlyAmount <= 0) {
      return { success: false, message: 'يرجى إدخال مبلغ شهري صحيح للتحويل!' };
    }

    const currentWageBonus = userClub.wageBudgetMonthly || 0;
    if (currentWageBonus < monthlyAmount) {
      return {
        success: false,
        message: `فائض ميزانية الرواتب المخصص للتحويل حالياً هو (${currentWageBonus.toLocaleString()} ج.م/شهرياً) فقط!`,
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

    const cashGain = monthlyAmount * 12;

    setTeams(prev => prev.map(t => {
      if (!t.isUserClub) return t;
      return {
        ...t,
        budget: t.budget + cashGain,
        wageBudgetMonthly: Math.max(0, currentWageBonus - monthlyAmount),
      };
    }));

    setClubEconomy(prev => ({
      ...prev,
      currentSeasonNetProfit: prev.currentSeasonNetProfit + cashGain,
    }));

    return {
      success: true,
      message: `تم تحويل ${monthlyAmount.toLocaleString()} ج.م شهرياً من الرواتب إلى ميزانية النادي بنجاح (+${cashGain.toLocaleString()} ج.م للميزانية النقدية)!`,
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

  // --- Sponsorship Contracts System (نظام عقود الرعاية المتطورة) ---
  const signSponsorshipContract = (offer: SponsorshipOffer): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };

    const category = (offer.category || offer.type || 'shirt') as SponsorCategory;
    const catInfo = getSponsorCategoryLabel(category);
    const signingBonus = offer.signingBonus || 50000;

    const currentSponsors = Array.isArray(userClub.sponsors) ? userClub.sponsors : [];
    const updatedSponsors = currentSponsors.filter(
      s => (s.category || s.type) !== category
    );

    const newSponsor: Sponsor = {
      ...offer,
      id: `sp_${category}_${userClub.id}_${Date.now()}`,
      category,
      type: category,
      contractMonthsRemaining: offer.totalDurationMonths || 12,
      satisfaction: 90,
    };

    updatedSponsors.push(newSponsor);

    setTeams(prev => prev.map(t => {
      if (t.id === userClub.id) {
        return {
          ...t,
          budget: (t.budget || 0) + signingBonus,
          sponsors: updatedSponsors,
        };
      }
      return t;
    }));

    setAvailableSponsorOffers(prev => prev.filter(o => o.id !== offer.id));

    // Official celebratory board message
    const sponsorContractMsg: InboxMessage = {
      id: `msg_sponsor_signed_${Date.now()}`,
      title: `🤝 إبرام عقد رعاية رسمي مع ${offer.name} (+${signingBonus.toLocaleString()} ج.م)`,
      sender: 'مجلس إدارة النادي - لجنة التسويق',
      date: `الجولة ${currentRound}`,
      type: 'board',
      read: false,
      content: `يسعد مجلس إدارة النادي الإعلان رسمياً عن توقيع عقد رعاية وشراكة تجارية مع "${offer.name}" كـ ${catInfo.label} لمدة ${offer.totalDurationMonths || 12} شهراً.\n\n` +
        `💼 تفاصيل العقد المالي:\n` +
        `💵 مكافأة توقيع فورية: +${signingBonus.toLocaleString()} ج.م تم إيداعها مباشرة في خزينة النادي.\n` +
        `📅 الدفعة الشهرية الثابتة: +${offer.monthlyPayment.toLocaleString()} ج.م تُصرف بانتظام.\n` +
        `⚽ مكافأة الفوز في الدوري: +${offer.bonusForWin.toLocaleString()} ج.م لكل انتصار.\n` +
        `🏆 مكافأة مباريات الكأس: +${(offer.bonusCupWin || offer.bonusForWin * 1.5).toLocaleString()} ج.م.\n` +
        `🌍 حافز الانتصارات القارية والإفريقية: +${(offer.bonusContinentalWin || offer.bonusForWin * 2.5).toLocaleString()} ج.م.\n\n` +
        `نتمنى أن تسهم هذه الشراكة الاستراتيجية في دعم مسيرة الفريق نحو منصات التتويج!`,
    };
    setInbox(prev => [sponsorContractMsg, ...prev]);

    return {
      success: true,
      message: `تم توقيع العقد بنجاح مع ${offer.name} وأودعت مكافأة التوقيع (+${signingBonus.toLocaleString()} ج.م) في خزينة النادي!`,
    };
  };

  const terminateSponsorshipContract = (sponsorId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };

    const currentSponsors = Array.isArray(userClub.sponsors) ? userClub.sponsors : [];
    const targetSponsor = currentSponsors.find(s => s.id === sponsorId);
    if (!targetSponsor) return { success: false, message: 'لم يتم العثور على عقد الرعاية المطلوب!' };

    const penalty = targetSponsor.penaltyClause || Math.round(targetSponsor.monthlyPayment * 1.5);
    const updatedSponsors = currentSponsors.filter(s => s.id !== sponsorId);

    setTeams(prev => prev.map(t => {
      if (t.id === userClub.id) {
        return {
          ...t,
          budget: Math.max(0, (t.budget || 0) - penalty),
          sponsors: updatedSponsors,
        };
      }
      return t;
    }));

    return {
      success: true,
      message: `تم فسخ العقد مع ${targetSponsor.name}. تم تطبيق شرط جزائي قدره -${penalty.toLocaleString()} ج.م وأصبحت الخانة شاغرة للتعاقد الجديد.`,
    };
  };

  const renewSponsorshipContract = (sponsorId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };

    const currentSponsors = Array.isArray(userClub.sponsors) ? userClub.sponsors : [];
    const targetSponsor = currentSponsors.find(s => s.id === sponsorId);
    if (!targetSponsor) return { success: false, message: 'لم يتم العثور على عقد الرعاية المطلوب!' };

    if ((targetSponsor.satisfaction || 80) < 65) {
      return {
        success: false,
        message: `يرفض ممثلو شركة ${targetSponsor.name} التجديد المبكر حالياً بسبب تراجع نتائج الفريق (نسبة الرضا: ${targetSponsor.satisfaction}%). حسن النتائج أولاً!`,
      };
    }

    const boostRatio = 1.10;
    const newMonthly = Math.round((targetSponsor.monthlyPayment * boostRatio) / 1000) * 1000;
    const renewalBonus = Math.round(newMonthly * 1.5);

    const updatedSponsors = currentSponsors.map(s => {
      if (s.id === sponsorId) {
        return {
          ...s,
          monthlyPayment: newMonthly,
          contractMonthsRemaining: (s.contractMonthsRemaining || 0) + 12,
          totalDurationMonths: (s.totalDurationMonths || 12) + 12,
          satisfaction: Math.min(100, (s.satisfaction || 80) + 10),
        };
      }
      return s;
    });

    setTeams(prev => prev.map(t => {
      if (t.id === userClub.id) {
        return {
          ...t,
          budget: (t.budget || 0) + renewalBonus,
          sponsors: updatedSponsors,
        };
      }
      return t;
    }));

    return {
      success: true,
      message: `تم تمديد الشراكة بنجاح مع ${targetSponsor.name} لـ 12 شهراً إضافياً وزيادة الدفعة الشهرية بنسبة 10% مع صرف مكافأة ولاء +${renewalBonus.toLocaleString()} ج.م!`,
    };
  };

  const negotiateSponsorshipOffer = (offerId: string): { success: boolean; message: string } => {
    if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ حالياً!' };

    const targetOffer = availableSponsorOffers.find(o => o.id === offerId);
    if (!targetOffer) return { success: false, message: 'العرض غير متاح حالياً!' };

    const managerRep = manager?.reputation || 50;
    const result = negotiateSponsorService(targetOffer, userClub, managerRep);

    setAvailableSponsorOffers(prev =>
      prev.map(o => (o.id === offerId ? result.updatedOffer : o))
    );

    return {
      success: result.success,
      message: result.message,
    };
  };

  const refreshSponsorshipOffers = () => {
    if (!userClub) return;
    const freshOffers = generateIncomingSponsorshipOffers(userClub, 4);
    setAvailableSponsorOffers(freshOffers);
  };

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
    setInbox(prev => {
      const next = prev.filter(m => m.id !== messageId);
      try {
        localStorage.setItem(`${STORAGE_KEY}_inbox`, JSON.stringify(next));
      } catch {}
      return next;
    });

    setDeletedMessageIds(prev => {
      if (prev.includes(messageId)) return prev;
      const next = [...prev, messageId];
      try {
        localStorage.setItem(`${STORAGE_KEY}_deletedMessageIds`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearAllMessages = () => {
    setInbox(prev => {
      const allIds = prev.map(m => m.id);
      setDeletedMessageIds(deletedPrev => {
        const combined = Array.from(new Set([...deletedPrev, ...allIds]));
        try {
          localStorage.setItem(`${STORAGE_KEY}_deletedMessageIds`, JSON.stringify(combined));
        } catch {}
        return combined;
      });
      try {
        localStorage.setItem(`${STORAGE_KEY}_inbox`, JSON.stringify([]));
      } catch {}
      return [];
    });
  };

  const markAllMessagesRead = () => {
    setInbox(prev => prev.map(m => ({ ...m, read: true })));
  };

  // ----------------------------------------------------
  // MULTI-SEASON TRANSITIONS, CAREER & RESIGNATION ENGINE
  // ----------------------------------------------------

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
      const summary = calculateSeasonEndSummary(
        { ...season, status: 'completed', totalRounds },
        standings,
        summaryClub,
        activeLeague,
        cupTournament,
        manager
      );
      setSeasonEndSummary(summary);
      if (!jobOffers || jobOffers.length === 0) {
        setJobOffers(generateSeasonJobOffers(manager, summaryClub, activeLeague, summary.finalPosition));
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

    // Check if club exists in current league
    const clubInCurrentLeague = teams.find(t => t.id === offer.clubId);
    let appointedTeams: Club[] = [];
    let appointedLeague = activeLeague;

    if (clubInCurrentLeague) {
      const appointed = appointManagerToClub(manager, teams, offer.clubId, offer.clubName);
      setManager(appointed.manager);
      appointedTeams = appointed.teams;
      setTeams(appointed.teams);
    } else {
      const targetLeague = getLeagueById(offer.leagueId);
      if (targetLeague) {
        appointedLeague = targetLeague;
        setActiveLeague(targetLeague);
        const leagueTeams = targetLeague.teams.map(t => normalizeClub(t));
        const appointed = appointManagerToClub(manager, leagueTeams, offer.clubId, offer.clubName);
        setManager(appointed.manager);
        appointedTeams = appointed.teams;
        setTeams(appointed.teams);
        setStandings(generateInitialStandings(appointed.teams));
        const userClubObj = appointed.teams.find(t => t.isUserClub);
        const newCup = initNationalCupTournament(season.seasonNumber || 1, targetLeague.country, appointed.teams, userClubObj);
        setCupTournament(newCup);
        const newAgenda = generateMasterSeasonAgenda(season.seasonNumber || 1, targetLeague, appointed.teams, newCup, undefined, userClubObj);
        setFixtures(newAgenda);
        const maxR = Math.max(...newAgenda.map(f => f.round), 42);
        setSeason(prev => ({ ...prev, totalRounds: maxR, leagueId: targetLeague.id, leagueName: targetLeague.name }));
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
        manager
      );

      const safeJobOffers = Array.isArray(jobOffers) ? jobOffers : [];
      const acceptedOffer = chosenOfferId 
        ? safeJobOffers.find(o => o.id === chosenOfferId)
        : safeJobOffers.find(o => o.status === 'accepted');

      const result = processNewSeasonAdvancement(
        season,
        summary,
        summaryClub,
        manager,
        teams,
        acceptedOffer
      );

      const overriddenNextTeams = applyWorldOverridesToClubs(result.nextTeams);
      const targetUserClubId = result.updatedManager.currentClubId;
      const finalNextTeams = overriddenNextTeams.map(t => {
        if (t.id === targetUserClubId) {
          return { ...t, isUserClub: true };
        }
        return { ...t, isUserClub: false };
      });

      setSeason(result.nextSeason);
      setActiveLeague(result.nextActiveLeague);
      setTeams(finalNextTeams);
      setStandings(result.nextStandings);
      setFixtures(result.nextFixtures);
      setManager(result.updatedManager);
      setCupTournament(result.nextCup);
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

      const nextUserClubObj = finalNextTeams.find(t => t.id === targetUserClubId) || finalNextTeams.find(t => t.isUserClub) || finalNextTeams[0];
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
        content: `أهلاً بك في الموسم ${result.nextSeason.seasonNumber}. تم إعداد جدول المباريات وجاهزية الفريق بنسبة 100%. أهداف الإدارة واضحة: المنافسة وتحقيق أقصى درجات النجاح!`,
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
      const newInbox = [startMsg, ...filteredInbox];
      setInbox(newInbox);

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
          fixtures: result.nextFixtures,
          currentRound: 1,
          manager: result.updatedManager,
          transferMarket,
          incomingBids: [],
          inbox: newInbox,
          cupTournament: result.nextCup,
          jobOffers: [],
          seasonEndSummary: null,
          transferHistory,
          clubEconomy: initialEconomy,
          calendarDate: newSeasonInitialDate,
          activeNegotiations: [],
          boardSystem: initialBoard,
          dailyNews: [],
          retiredPlayers: nextRetired,
          worldRankings,
          scoutedOpponents,
          deletedMessageIds,
        } as any);
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
      const safeCup = initNationalCupTournament(safeNextSeasonNum, safeNextLeague.country, safeTeams, safeUserClub);
      const safeFixtures = generateMasterSeasonAgenda(safeNextSeasonNum, safeNextLeague, safeTeams, safeCup, undefined, safeUserClub);

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
      setCupTournament(safeCup);
      setCurrentRound(1);
      setShowSeasonTransitionModal(false);
      setSeasonEndSummary(null);
      setJobOffers([]);
    }
  };

  // ----------------------------------------------------
  // DAILY PROGRESSION, CALENDAR SIMULATION & CAREER SYSTEMS
  // ----------------------------------------------------

  const advanceToNextDay = (skipToMatch: boolean = false) => {
    if (isSimulationRunningRef.current) return;
    isSimulationRunningRef.current = true;
    setIsSimulationRunning(true);

    try {
      // Gating check: Block advancement if today is match day and match is not yet completed
      if (userClub && !seasonFinished) {
      const roundFixtures = fixtures.filter(f => f.round === currentRound);
      const userFixture = roundFixtures.find(f => f.homeTeamId === userClub.id || f.awayTeamId === userClub.id);

      const currentMatchInfo = calculateDaysUntilNextMatch(
        calendarDate.rawDateStr,
        currentRound,
        getInitialSeasonDate(season.seasonNumber).rawDateStr
      );

      const isTodayMatchDay = currentMatchInfo.isMatchDay || currentMatchInfo.daysRemaining <= 0;

      if (isTodayMatchDay && userFixture && !userFixture.isPlayed) {
        const val = validateSquadLineup(userClub);
        const oppClub = teams.find(t => t.id === (userFixture.homeTeamId === userClub.id ? userFixture.awayTeamId : userFixture.homeTeamId));

        if (!val.isValid) {
          setMatchBlocker({
            isOpen: true,
            reason: 'lineup_issue',
            title: '🚨 تنبيه: لا يمكن الانتقال لليوم التالي بوجود لاعب غير جاهز',
            message: 'يوجد لاعبون مصابون أو موقوفون ضمن التشكيل الأساسي لمباراة اليوم! يجب استبدالهم أو تسوية التشكيل أولاً.',
            fixture: userFixture,
            opponentClub: oppClub,
            invalidStarters: val.invalidStarters,
          });
        } else {
          setMatchBlocker({
            isOpen: true,
            reason: 'match_today',
            title: '⚽ اليوم موعد مباراة رسمية!',
            message: `اليوم موعد مباراة الجولة ${currentRound} أمام (${oppClub?.name || 'المنافس'})! لا يمكن الانتقال إلى اليوم التالي قبل خوض المباراة أو محاكاتها وإنهاء أحداث هذا اليوم.`,
            fixture: userFixture,
            opponentClub: oppClub,
          });
        }
        return; // BLOCK ADVANCEMENT!
      }
    }

    let daysAdvanced = 1;

    // If skipToMatch requested, skip directly to the exact match day
    if (skipToMatch && userClub && !seasonFinished) {
      const matchInfo = calculateDaysUntilNextMatch(
        calendarDate.rawDateStr,
        currentRound,
        getInitialSeasonDate(season.seasonNumber).rawDateStr,
        totalRounds
      );

      if (matchInfo.daysRemaining > 0) {
        // Jump directly to the exact match day!
        daysAdvanced = matchInfo.daysRemaining;
      }
    }

    const newDate = addDaysToDate(calendarDate.rawDateStr, daysAdvanced, calendarDate.dayIndexInSeason || 1);

    // 1. Simulate Daily Squad Training & Recovery across the days advanced
    let updatedTrainingReports: DayAdvanceSummary['trainingReports'] = [];
    let updatedInjuryReports: DayAdvanceSummary['injuryUpdates'] = [];
    let updatedSquadPlayers: Player[] | undefined = userClub && userClub.players ? [...userClub.players] : undefined;

    if (updatedSquadPlayers) {
      for (let dayStep = 0; dayStep < daysAdvanced; dayStep++) {
        const trainingResult = simulateDailySquadTraining(
          updatedSquadPlayers,
          trainingIntensity,
          userClub?.facilities?.trainingGroundLevel || 1
        );
        updatedSquadPlayers = trainingResult.updatedPlayers;
        if (trainingResult.injuryUpdates.length > 0) {
          updatedInjuryReports.push(...trainingResult.injuryUpdates);
        }
        if (dayStep === daysAdvanced - 1 || trainingResult.trainingReports.some(r => r.type === 'growth')) {
          updatedTrainingReports.push(...trainingResult.trainingReports);
        }
      }
    }

    // 2. Simulate Active Negotiations Progression across the days advanced
    let currentActiveNegs = [...activeNegotiations];
    let allCompletedTransfers: { negotiation: ActiveNegotiation; player: Player }[] = [];
    let allNegReports: DayAdvanceSummary['negotiationUpdates'] = [];

    for (let dayStep = 0; dayStep < daysAdvanced; dayStep++) {
      if (currentActiveNegs.length === 0) break;
      const negResult = simulateDailyNegotiations(
        currentActiveNegs,
        userClub,
        teams,
        transferMarket
      );
      currentActiveNegs = negResult.updatedNegotiations.filter(n => n.stage !== 'completed');
      if (negResult.completedTransfers.length > 0) {
        allCompletedTransfers.push(...negResult.completedTransfers);
      }
      if (negResult.negotiationReports.length > 0) {
        allNegReports.push(...negResult.negotiationReports);
      }
      if (currentActiveNegs.some(n => n.actionRequired)) {
        break;
      }
    }

    // Filter out completed deals so they do not linger on the active negotiations tab
    setActiveNegotiations(currentActiveNegs);

    // Atomically execute squad updates and completed transfers
    setTeams(prevTeams => {
      let nextTeams = prevTeams.map(t => {
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
          if (targetPlayer) {
            const newPlayer: Player = {
              ...targetPlayer,
              currentClubId: userClub.id,
              currentLeagueId: activeLeague.id,
              salary: deal.offeredSalary,
              contractYears: deal.contractYears,
              isListedForTransfer: false,
              morale: 95,
              fitness: 100,
            };

            nextTeams = nextTeams.map(t => {
              if (t.isUserClub || t.id === userClub.id) {
                const filtered = (t.players || []).filter(p => p.id !== targetPlayer.id);
                return {
                  ...t,
                  budget: Math.max(0, t.budget - deal.bidFee),
                  players: [...filtered, newPlayer],
                };
              }
              if (deal.playerClubId && t.id === deal.playerClubId) {
                return {
                  ...t,
                  budget: t.budget + deal.bidFee,
                  players: (t.players || []).filter(p => p.id !== targetPlayer.id),
                };
              }
              if (t.players && t.players.some(p => p.id === targetPlayer.id)) {
                return {
                  ...t,
                  players: t.players.filter(p => p.id !== targetPlayer.id),
                };
              }
              return t;
            });
          }
        });
      }

      return nextTeams;
    });

    if (allCompletedTransfers.length > 0 && userClub) {
      allCompletedTransfers.forEach(({ negotiation: deal, player: targetPlayer }) => {
        if (targetPlayer) {
          // Remove from market
          setTransferMarket(prev => prev.filter(p => p.id !== targetPlayer.id));

          // Log to transfer history
          const historyEntry: TransferHistoryEntry = {
            id: `th_neg_${deal.id}_${Date.now()}`,
            date: newDate.formattedArabic,
            playerName: deal.playerName,
            playerId: deal.playerId,
            playerRating: targetPlayer.overallRating || deal.playerOverall,
            position: targetPlayer.position || deal.playerPosition,
            fromClubName: deal.playerClubName || 'وكيل حر',
            toClubName: userClub.name,
            fee: deal.bidFee,
            salary: deal.offeredSalary,
            seasonNumber: season.seasonNumber,
            type: 'buy',
            timestamp: Date.now(),
          };
          setTransferHistory(prev => [historyEntry, ...prev]);

          // Update club economy
          setClubEconomy(prev => ({
            ...prev,
            transferSpendingTotal: prev.transferSpendingTotal + deal.bidFee,
            currentSeasonNetProfit: prev.currentSeasonNetProfit - deal.bidFee,
          }));

          // Send confirmation message to inbox
          const inboxMsg: InboxMessage = {
            id: `msg_trans_comp_${Date.now()}_${targetPlayer.id}`,
            title: `انضمام اللاعب ${deal.playerName} للفريق رسمياً! ✍️`,
            sender: 'لجنة التعاقدات والاحتراف',
            date: newDate.formattedArabic,
            type: 'transfer',
            read: false,
            content: `اكتملت إجراءات انتقال اللاعب ${deal.playerName} (${deal.playerPosition} - تقييم ${deal.playerOverall}) بنجاح وتم قيده رسمياً في قائمة الفريق. العقد يمتد لـ ${deal.contractYears} سنوات براتب شهري ${deal.offeredSalary.toLocaleString()} ج.م.`,
          };
          setInbox(prev => [inboxMsg, ...prev]);
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
        teams,
        standings,
        currentRound,
      }, 4);
      setDailyNews(prev => [...dailyNewsBatch, ...prev].slice(0, 40));
    } catch (e) {
      console.warn('Daily news generation error:', e);
    }

    // 4. Update Board System Confidence & Feedback
    let dailyBoardFeedback: string | undefined = undefined;
    if (userClub) {
      setBoardSystem(prev => {
        const updated = updateDailyBoardConfidence(prev, userClub, standings);
        dailyBoardFeedback = updated.statusDescription;
        return updated;
      });
    }

    // 5. Check If Next Match is Today
    const nextInfoAfterAdvance = userClub ? calculateDaysUntilNextMatch(
      newDate.rawDateStr,
      currentRound,
      getInitialSeasonDate(season.seasonNumber).rawDateStr
    ) : { daysRemaining: 0, isMatchDay: false };

    // 6. Monthly World Rankings Recalculation & Notification
    if (newDate.month !== calendarDate.month) {
      const updatedMonthStr = `${newDate.year}-${String(newDate.month).padStart(2, '0')}`;
      const freshWorldRankings = generateMonthlyWorldRankings(manager, userClub, updatedMonthStr);
      setWorldRankings(freshWorldRankings);

      const userRankEntry = freshWorldRankings.managers.find(m => m.id === 'user_manager' || m.name.includes('(أنت)'));
      const topManager = freshWorldRankings.managers[0];
      const topClub = freshWorldRankings.clubs[0];

      const monthlyInboxMsg: InboxMessage = {
        id: `msg_fifa_rankings_${newDate.month}_${newDate.year}_${Date.now()}`,
        title: `تقرير التصنيف الشهري العالمي للأندية والمدربين 🌍 (${newDate.formattedArabic})`,
        sender: 'الاتحاد الدولي للتاريخ والإحصاء (IFFHS) والفيفا',
        date: newDate.formattedArabic,
        type: 'news',
        read: false,
        content: `صدر رسمياً جدول التصنيف العالمي الجديد لشهر ${newDate.formattedArabic}!\n\n👑 المصنف الأول عالمياً بين المدربين: ${topManager?.name || 'بيب جوارديولا'} (${topManager?.currentClubName || 'مانشستر سيتي'}) برصيد ${(topManager?.rankingPoints || 3200).toLocaleString()} نقطة.\n🏆 المصنف الأول بين الأندية: ${topClub?.clubName || 'ريال مدريد'} برصيد ${(topClub?.rankingPoints || 3400).toLocaleString()} نقطة.\n\n📍 ترتيبك التدريبي العالمي: المركز #${userRankEntry?.worldRank || manager.worldRank || 850} برصيد ${(userRankEntry?.rankingPoints || manager.rankingPoints || 1200).toLocaleString()} نقطة.\n\nتفضل بزيارة قسم "التصنيف العالمي" لمشاهدة القائمة الكاملة ومتابعة رحلتك نحو القمة!`,
      };

      setInbox(prev => [monthlyInboxMsg, ...prev]);

      if (userRankEntry) {
        setManager(prev => ({
          ...prev,
          worldRank: userRankEntry.worldRank,
          rankingPoints: userRankEntry.rankingPoints,
          managerRating: userDynamicManagerRating,
        }));
      }
    }

    // 7. Periodic Contract Expiry Checks (on 1st & 15th of month or month change)
    if (userClub && (newDate.day === 1 || newDate.day === 15 || newDate.month !== calendarDate.month)) {
      const contractAlerts = checkExpiringContracts(userClub, newDate.formattedArabic, inbox);
      if (contractAlerts.length > 0) {
        setInbox(prev => [...contractAlerts, ...prev]);
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
    } catch (error) {
      console.error('[DailyProgression] CRITICAL UNCAUGHT EXCEPTION in advanceToNextDay:', error);
    } finally {
      setTimeout(() => {
        isSimulationRunningRef.current = false;
        setIsSimulationRunning(false);
      }, 100);
    }
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
    const isFreeAgent = !targetPlayer.currentClubId && !sellingClub && resolvedClub.clubName.includes('وكيل حر');
    const displaySellingClubName = resolvedClub.clubName;

    if (!isFreeAgent && proposal.transferFee > userClub.budget) {
      return { success: false, message: `قيمة عرض الشراء المطلوب (${proposal.transferFee.toLocaleString()} ج.م) تتجاوز ميزانية النادي المتاحة (${userClub.budget.toLocaleString()} ج.م). يجب توفير سعر اللاعب أولاً!` };
    }

    const currentWages = calculateClubTotalMonthlyWages(userClub);
    const monthlyIncome = calculateClubMonthlyIncome(userClub);
    if (currentWages + proposal.monthlySalary > monthlyIncome) {
      const remainingWageBudget = Math.max(0, monthlyIncome - currentWages);
      return {
        success: false,
        message: `لا يمكن تقديم العرض! الراتب المقترح (${proposal.monthlySalary.toLocaleString()} ج.م) سيتسبب في تجاوز إجمالي رواتب الفريق لسقف دخل النادي الشهري (${monthlyIncome.toLocaleString()} ج.م). إجمالي الرواتب الحالي: ${currentWages.toLocaleString()} ج.م، والمتبقي لسقف الرواتب هو ${remainingWageBudget.toLocaleString()} ج.م فقط!`,
      };
    }

    const newNegotiation: ActiveNegotiation = {
      id: `neg_${Date.now()}_${targetPlayer.id}`,
      type: 'buy',
      playerId: targetPlayer.id,
      playerName: targetPlayer.name,
      playerOverall: targetPlayer.overallRating,
      playerPosition: targetPlayer.position,
      playerAge: targetPlayer.age,
      playerClubId: targetPlayer.currentClubId || sellingClub?.id || resolvedClub.leagueId,
      playerClubName: displaySellingClubName,
      sellingClubName: displaySellingClubName,
      buyerClubId: userClub.id,
      buyerClubName: userClub.name,
      bidFee: proposal.transferFee,
      offeredSalary: proposal.monthlySalary,
      contractYears: proposal.contractYears,
      squadRole: proposal.squadRole,
      stage: isFreeAgent ? 'player_terms' : 'club_review',
      daysRemainingInStage: isFreeAgent ? 1 : 2,
      statusMessage: isFreeAgent
        ? 'تم تقديم شروط العقد الشخصي للاعب، في انتظار رد وكيل أعماله.'
        : `تم إرسال عرض الشراء الرسمي إلى إدارة ${displaySellingClubName}، في انتظار مراجعتهم.`,
      actionRequired: false,
      history: [
        {
          dateStr: calendarDate.rawDateStr,
          message: `[${calendarDate.formattedArabic}] بدء المفاوضات وتقديم العرض المبدئي.`,
          from: 'manager',
        },
      ],
    };

    setActiveNegotiations(prev => [newNegotiation, ...prev]);

    return {
      success: true,
      message: isFreeAgent
        ? `تم تقديم العقد للاعب ${targetPlayer.name}. سيصلك الرد خلال الأيام القادمة عبر تقدم التقويم.`
        : `تم إرسال عرض الشراء لنادي ${displaySellingClubName}. تابع تقدم الردود يومياً.`,
    };
  };

  // Respond to Counter-Offers in Negotiations
  const respondToNegotiationOffer = (
    negotiationId: string,
    action: 'accept_counter' | 'raise_salary' | 'cancel',
    extraValue?: number
  ): { success: boolean; message: string } => {
    const neg = activeNegotiations.find(n => n.id === negotiationId);
    if (!neg) return { success: false, message: 'المفاوضات غير موجودة.' };

    if (action === 'cancel') {
      setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));
      return { success: true, message: 'تم إلغاء المفاوضات والانسحاب من الصفقة.' };
    }

    if (action === 'accept_counter' && neg.demandedFee) {
      if (userClub && neg.demandedFee > userClub.budget) {
        return { success: false, message: 'المبلغ المطلوب يتجاوز ميزانية النادي الحالية.' };
      }

      setActiveNegotiations(prev => prev.map(n => {
        if (n.id === negotiationId) {
          return {
            ...n,
            bidFee: neg.demandedFee || n.bidFee,
            stage: 'player_terms',
            daysInStage: 0,
            statusMessage: 'وافق النادي البائع على العرض المعدل! جاري مناقشة البنود الشخصية والراتب مع اللاعب.',
            actionRequired: false,
            history: [
              ...n.history,
              {
                dateStr: calendarDate.rawDateStr,
                message: `[${calendarDate.formattedArabic}] قبول المقابل المالي المطلوب من النادي البائع (${(neg.demandedFee || 0).toLocaleString()} ج.م).`,
                from: 'manager' as const,
              },
            ],
          };
        }
        return n;
      }));

      return { success: true, message: 'تمت الموافقة على طلب النادي البائع، وانتقلت المفاوضات لعقد اللاعب.' };
    }

    if (action === 'raise_salary' && extraValue) {
      if (!userClub) return { success: false, message: 'أنت غير مرتبط بنادٍ!' };

      if (userClub.budget < neg.bidFee) {
        return { success: false, message: `ميزانية النادي (${userClub.budget.toLocaleString()} ج.م) لا تكفي لدفع قيمة الصفقة المطلوبة (${neg.bidFee.toLocaleString()} ج.م)!` };
      }

      const currentWages = calculateClubTotalMonthlyWages(userClub);
      const monthlyIncome = calculateClubMonthlyIncome(userClub);
      if (currentWages + extraValue > monthlyIncome) {
        const remaining = Math.max(0, monthlyIncome - currentWages);
        return {
          success: false,
          message: `لا يمكن قبول الراتب المطلوب (${extraValue.toLocaleString()} ج.م)! سيتجاوز إجمالي الرواتب سقف دخل النادي الشهري (${monthlyIncome.toLocaleString()} ج.م). المتبقي لسقف الرواتب: ${remaining.toLocaleString()} ج.م فقط.`
        };
      }

      // Resolve full player object
      const fullPlayer = resolveFullPlayerObject(
        {
          ...neg,
          offeredSalary: extraValue,
        },
        teams,
        transferMarket
      );

      const signedPlayer: Player = {
        ...fullPlayer,
        currentClubId: userClub.id,
        currentLeagueId: activeLeague.id,
        salary: extraValue,
        contractYears: neg.contractYears,
        isListedForTransfer: false,
        morale: 95,
        fitness: 100,
      };

      // Add to userClub squad & deduct transfer fee
      setTeams(prevTeams => (Array.isArray(prevTeams) ? prevTeams : []).map(t => {
        if (!t) return t;
        if (t.isUserClub || t.id === userClub.id) {
          const filtered = (t.players || []).filter(p => p && p.id && p.id !== neg.playerId);
          return {
            ...t,
            budget: Math.max(0, (t.budget || 0) - neg.bidFee),
            players: [...filtered, signedPlayer],
          };
        }
        if (neg.playerClubId && t.id === neg.playerClubId) {
          return {
            ...t,
            budget: (t.budget || 0) + neg.bidFee,
            players: (t.players || []).filter(p => p && p.id && p.id !== neg.playerId),
          };
        }
        if (t.players && t.players.some(p => p && p.id === neg.playerId)) {
          return {
            ...t,
            players: (t.players || []).filter(p => p && p.id && p.id !== neg.playerId),
          };
        }
        return t;
      }));

      // Remove from market
      setTransferMarket(prev => (Array.isArray(prev) ? prev : []).filter(p => p && p.id && p.id !== neg.playerId));

      // Transfer history entry
      const historyEntry: TransferHistoryEntry = {
        id: `th_neg_raise_${neg.id}_${Date.now()}`,
        date: calendarDate.formattedArabic,
        playerName: neg.playerName,
        playerId: neg.playerId,
        playerRating: fullPlayer.overallRating || neg.playerOverall,
        position: fullPlayer.position || neg.playerPosition,
        fromClubName: neg.playerClubName || 'وكيل حر',
        toClubName: userClub.name,
        fee: neg.bidFee,
        salary: extraValue,
        seasonNumber: season.seasonNumber,
        type: 'buy',
        timestamp: Date.now(),
      };
      setTransferHistory(prev => [historyEntry, ...(Array.isArray(prev) ? prev : [])]);

      // Update club economy
      setClubEconomy(prev => ({
        ...prev,
        transferSpendingTotal: (prev.transferSpendingTotal || 0) + neg.bidFee,
        currentSeasonNetProfit: (prev.currentSeasonNetProfit || 0) - neg.bidFee,
      }));

      // Remove completed negotiation immediately from active negotiations list
      setActiveNegotiations(prev => prev.filter(n => n.id !== negotiationId));

      // Inbox message
      const msg: InboxMessage = {
        id: `msg_trans_signed_${Date.now()}_${neg.playerId}`,
        title: `تم إتمام التعاقد مع ${neg.playerName}! ✍️`,
        sender: 'لجنة التعاقدات والاحتراف',
        date: calendarDate.formattedArabic,
        type: 'transfer',
        read: false,
        content: `تم توقيع العقود رسمياً مع اللاعب ${neg.playerName} براتب شهري ${extraValue.toLocaleString()} ج.م وانضم اللاعب مباشرة لقائمة الفريق.`,
      };
      setInbox(prev => [msg, ...prev]);

      return { success: true, message: `تمت الموافقة على راتب ${neg.playerName} وانضم رسمياً إلى قائمة فريقك!` };
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
    if (!course) return { success: false, message: 'الدورة التدريبية غير موجودة.' };

    const currentWallet = manager.personalWallet || 0;
    if (currentWallet < course.cost) {
      return {
        success: false,
        message: `رصيدك الشخصي (${currentWallet.toLocaleString()} ج.م) لا يكفي لتكلفة الدورة (${course.cost.toLocaleString()} ج.م).`,
      };
    }

    // License rank hierarchy
    const licenseRanks: Record<string, number> = {
      'D': 1,
      'C': 2,
      'B': 3,
      'A': 4,
      'PRO': 5,
      'ELITE': 6,
    };
    const currentLicense = (manager.license && licenseRanks[manager.license]) ? manager.license : 'D';
    const currentRank = licenseRanks[currentLicense] || 1;

    // Check license requirement
    if (course.requiredLicense) {
      const requiredRank = licenseRanks[course.requiredLicense] || 1;
      if (currentRank < requiredRank) {
        return {
          success: false,
          message: `تتطلب هذه الدورة الحصول أولاً على رخصة التدريب (${course.requiredLicense}). رخصتك الحالية: ${currentLicense}`,
        };
      }
    }

    // If already completed license or has higher license
    if (course.category === 'license') {
      const grantsRank = course.grantsLicense ? (licenseRanks[course.grantsLicense] || 0) : 0;
      const isAlreadyCompleted = (manager.completedCourses || []).includes(courseId) || 
        (grantsRank > 0 && (course.id === 'license_d' ? (currentRank > 1 || (manager.completedCourses || []).includes('license_d')) : currentRank >= grantsRank));

      if (isAlreadyCompleted) {
        return { success: false, message: 'أنت حاصل بالفعل على هذه الرخصة التدريبية أو مؤهل أعلى منها.' };
      }

      // Check real in-game milestones & criteria (Anti-AFK, genuine career progression)
      const currentClub = userClub || null;
      const evalResult = evaluateLicenseEligibility(manager, currentClub);
      if (evalResult.nextLicense && course.grantsLicense === evalResult.nextLicense) {
        const unmet = evalResult.checklist.filter(c => !c.isMet && c.key !== 'exam_fee');
        if (unmet.length > 0) {
          const unmetLabels = unmet.map(u => `${u.label}: الحالي (${u.current}) / المطلوب (${u.target}${u.unit ? ' ' + u.unit : ''})`).join(' | ');
          return {
            success: false,
            message: `لم تستوفِ بعد الشروط الميدانية للرخصة (${evalResult.nextLicense})! المتطلبات غير المكتملة: ${unmetLabels}. يمكنك متابعة مسيرتك التدريبية في قسم المسيرة.`,
          };
        }
      }
    }

    // Record transaction
    const tx: ManagerTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: `الجولة ${currentRound}`,
      amount: course.cost,
      type: 'course_license',
      description: `الالتحاق بـ: ${course.title}`,
    };

    setManager(prev => {
      const newWallet = Math.max(0, (prev.personalWallet || 0) - course.cost);
      let newLicense = prev.license || 'D';
      if (course.grantsLicense) {
        const targetRank = licenseRanks[course.grantsLicense] || 1;
        const existingRank = licenseRanks[newLicense] || 1;
        if (targetRank >= existingRank) {
          newLicense = course.grantsLicense;
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
    const freshCup = initNationalCupTournament(1, 'مصر', freshTeams, chosenUserClub);

    const freshAgenda = generateMasterSeasonAgenda(1, EGYPT_TIER_4_LEAGUE, freshTeams, freshCup, undefined, chosenUserClub);
    const maxR = Math.max(...freshAgenda.map(f => f.round), 44);

    setSeason({ ...INITIAL_SEASON, totalRounds: maxR });
    setActiveLeague(EGYPT_TIER_4_LEAGUE);
    setTeams(freshTeams);
    setStandings(generateInitialStandings(freshTeams));
    setCupTournament(freshCup);
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
        if (!t.isUserClub) return t;
        return {
          ...t,
          budget: t.budget + fundAmount,
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
        if (!t.isUserClub) return t;
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
  // PROMO / GIFT CODES SYSTEM (نظام أكواد الهدايا والمكافآت)
  // ----------------------------------------------------
  const redeemGiftCode = async (
    code: string
  ): Promise<{ success: boolean; message: string; rewardAmount?: number; rewardCoins?: number }> => {
    if (!userClub) {
      return { 
        success: false, 
        message: 'يجب أن تكون مرتبطاً بنادٍ أولاً لتتمكن من استرداد الكود وإيداع المكافأة المالية في ميزانيته!' 
      };
    }

    try {
      const res = await redeemPromoCode(code, {
        userId: user?.uid || manager.trainerId || 'local_user',
        managerName: manager.name || 'المدرب',
        clubName: userClub.name || 'النادي',
        trainerId: manager.trainerId,
      });

      if (res.success && res.rewardAmount > 0) {
        // 1. Inject cash directly into user club budget
        setTeams(prev => prev.map(t => {
          if (!t.isUserClub && t.id !== userClub.id) return t;
          return {
            ...t,
            budget: (t.budget || 0) + res.rewardAmount,
          };
        }));

        // 2. Add to manager career earnings and personal wallet if coins given
        setManager(prev => ({
          ...prev,
          careerEarnings: (prev.careerEarnings || 0) + res.rewardAmount,
          personalWallet: res.rewardCoins ? (prev.personalWallet || 0) + (res.rewardCoins * 100) : prev.personalWallet,
        }));

        // 3. Official banking inbox notification for the manager
        const bonusMsg: InboxMessage = {
          id: `msg_promo_${Date.now()}_${Math.random()}`,
          title: `🎁 استرداد كود هدية: إيداع (+${res.rewardAmount.toLocaleString()} ج.م) في الخزينة`,
          sender: 'إدارة اللعبة والمسابقات',
          date: `الجولة ${currentRound}`,
          type: 'board',
          read: false,
          content: `تهانينا يا كابتن ${manager.name}!\n\nتم التحقق من كود الهدية [${res.code}] بنجاح وإيداع مبلغ قدره (${res.rewardAmount.toLocaleString()} جنيه مصري) مباشرة في ميزانية نادي ${userClub.name}.${res.rewardCoins ? `\nبالإضافة إلى منحك (${res.rewardCoins}) كوينز ذهبية!` : ''}\n\nبيان المكافأة: ${res.description}\n\nنتمنى لك كل التوفيق والانتصارات في قيادة ناديك!`,
        };
        setInbox(prev => [bonusMsg, ...prev]);

        // 4. Save game automatically
        setTimeout(() => {
          saveToCloud(false).catch(() => {});
        }, 500);

        return {
          success: true,
          message: res.message,
          rewardAmount: res.rewardAmount,
          rewardCoins: res.rewardCoins,
        };
      }

      return { success: false, message: res.message || 'فشل استرداد الكود.' };
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

    // 1. Grant Coins & Personal Wallet
    if (rewardItem.coins > 0) {
      setManager(prev => ({
        ...prev,
        personalWallet: (prev.personalWallet || 0) + (rewardItem.coins * 100),
        careerEarnings: (prev.careerEarnings || 0) + rewardItem.clubFunds,
      }));

      try {
        const authData = localStorage.getItem('anta_el_modareb_auth_user');
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.virtualCoins = (parsed.virtualCoins || 0) + rewardItem.coins;
          localStorage.setItem('anta_el_modareb_auth_user', JSON.stringify(parsed));
        }
      } catch (_) {}
    }

    // 2. Grant Club Funds (if user manages a club)
    if (userClub && rewardItem.clubFunds > 0) {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        return {
          ...t,
          budget: (t.budget || 0) + rewardItem.clubFunds,
          transferBudget: (t.transferBudget || 0) + rewardItem.clubFunds,
        };
      }));

      setClubEconomy(prev => ({
        ...prev,
        clubBudget: (prev.clubBudget || 0) + rewardItem.clubFunds,
      }));
    }

    // 3. Grant Development Points
    if (rewardItem.developmentPoints > 0) {
      grantDevelopmentPoints(rewardItem.developmentPoints, `مكافأة تسجيل الدخول اليومي - اليوم ${nextStreak}`);
    }

    // 4. Boost Squad Energy / Morale if milestone or specified
    if (userClub && (rewardItem.energyBoost || rewardItem.moraleBoost)) {
      setTeams(prev => prev.map(t => {
        if (!t.isUserClub && t.id !== userClub.id) return t;
        return {
          ...t,
          players: (t.players || []).map(p => ({
            ...p,
            fitness: rewardItem.energyBoost ? Math.min(100, (p.fitness || 85) + 15) : p.fitness,
            morale: rewardItem.moraleBoost ? 100 : p.morale,
            moraleStatus: rewardItem.moraleBoost ? 'ecstatic' : p.moraleStatus,
          })),
        };
      }));
    }

    // 5. Send celebratory message to manager's inbox
    const rewardMsg: InboxMessage = {
      id: `msg_daily_reward_${Date.now()}_${Math.random()}`,
      title: `🎁 استلام مكافأة تسجيل الدخول اليومية (اليوم ${nextStreak} من 7)`,
      sender: 'إدارة اللعبة والفعاليات اليومية',
      date: `الجولة ${currentRound}`,
      type: 'board',
      read: false,
      content: `تهانينا يا كابتن ${manager.name}!\n\nتم استلام مكافأة تسجيل الدخول اليومي بنجاح:\n• 🪙 +${rewardItem.coins} كوينز ذهبية للرصيد والمحفظة\n• 💰 +${rewardItem.clubFunds.toLocaleString()} ج.م دعماً لميزانية النادي\n• ⭐ +${rewardItem.developmentPoints} نقاط تدريب وتطوير للاعبين\n${rewardItem.energyBoost ? '• ⚡ استعادة وشحن طاقة ولياقة جميع لاعبي الفريق\n' : ''}${rewardItem.moraleBoost ? '• 🔥 رفع الروح المعنوية للاعبين إلى الدرجة الممتازة\n' : ''}\nسلسلة تسجيل الدخول الحالية: ${nextStreak} يوم/أيام.\nإجمالي أيام الدخول التراكمية: ${(dailyRewardState.totalDaysClaimed || 0) + 1} يوم.\nاستمر في تسجيل الدخول اليومي لحصد الجائزة الكبرى!`,
    };
    setInbox(prev => [rewardMsg, ...prev]);

    // 6. Update dailyRewardState
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

    // 7. Save game state
    setTimeout(() => {
      saveToCloud(false).catch(() => {});
    }, 400);

    return {
      success: true,
      message: `مبروك يا كابتن! حصلت على مكافأة اليوم (${nextStreak}) بنجاح! 🪙 +${rewardItem.coins} كوينز و +${rewardItem.clubFunds.toLocaleString()} ج.م`,
      reward: rewardItem,
      streak: nextStreak,
      isMilestone: rewardItem.isMilestone,
    };
  }, [
    dailyRewardState,
    manager.name,
    userClub,
    currentRound,
    grantDevelopmentPoints,
    saveToCloud,
  ]);

  return (
    <GameContext.Provider
      value={{
        userClub,
        teams,
        standings,
        fixtures,
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
        upgradeFacility,
        treatPlayerInHospital,
        healPlayerWithAd,
        cancelPlayerSuspensionWithAd,
        doubleLiveMatchRevenueWithAd,
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
        acceptJobOffer,
        rejectJobOffer,
        takeOverClub,
        openSeasonModal,
        closeSeasonModal,
        resignToUnemployed,
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

