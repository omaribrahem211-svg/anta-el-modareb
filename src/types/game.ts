import { DailyLoginRewardState } from './dailyReward';
export * from './dailyReward';

export type Position = 'GK' | 'CB' | 'RB' | 'LB' | 'CDM' | 'CM' | 'CAM' | 'RW' | 'LW' | 'ST';

export type PositionCategory = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Continent = 'Africa' | 'Europe' | 'South America' | 'Asia' | 'North America';

export type PreferredFoot = 'right' | 'left' | 'both';

export type PlayerPersonality = 'ambitious' | 'loyal' | 'leader' | 'temperamental' | 'professional' | 'determined';

export interface Country {
  id: string; // e.g. 'EGY', 'ESP', 'ENG'
  name: string; // 'مصر', 'إسبانيا'
  code: string; // 'EGY', 'ESP'
  flag: string; // '🇪🇬', '🇪🇸'
  continent: Continent;
  footballLevel: number; // 1 - 100
  foreignPlayerRate: number; // 0.05 to 0.40
  playerNamePool: {
    firstNames: string[];
    lastNames: string[];
  };
  preferredPositionsDistribution?: Partial<Record<PositionCategory, number>>;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  country: string;
  countryCode?: string;
  type: 'league' | 'cup' | 'continental';
  tier?: number;
  reputation: number;
}

export interface PlayerAttributes {
  pace: number;         // السرعة
  shooting: number;     // التسديد
  passing: number;      // التمرير
  dribbling: number;    // المراوغة
  defending: number;    // الدفاع
  physical: number;     // القوة البدنية
  goalkeeping?: number; // حراسة المرمى (للحراس)
}

export interface PlayerStats {
  appearances: number;
  starts?: number;
  minutes?: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  shots?: number;
  shotsOnTarget?: number;
  passes?: number;
  tackles?: number;
  saves?: number;
  averageRating: number;
  motm?: number;
}

export interface PlayerInjury {
  type: string;
  daysRemaining: number;
  durationDays?: number;
  isInjured?: boolean;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  treatmentType?: string;
  recoveryPercentage?: number;
  sustainedDate?: string;
}

export interface Player {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  nickname?: string;
  nationality?: string;         // 'مصر', 'إسبانيا', 'البرازيل', إلخ
  nationalityCode?: string;     // 'EGY', 'ESP', 'BRA'
  countryOfBirth?: string;
  preferredFoot?: PreferredFoot;
  personality?: PlayerPersonality;
  currentClubId?: string;
  currentLeagueId?: string;
  age: number;
  position: Position;
  positionCategory: PositionCategory;
  overallRating: number; // 35 - 99
  rating?: number; // alias for overallRating
  potentialRating: number;
  attributes: PlayerAttributes;
  salary: number;        // راتب شهري
  savings?: number;       // رصيد ومدخرات اللاعب المالية
  totalBonusesReceived?: number; // إجمالي المكافآت المالية المستلمة
  marketValue: number;   // القيمة السوقية
  morale: number;        // 0 - 100
  moraleStatus?: 'ecstatic' | 'happy' | 'neutral' | 'unhappy' | 'furious';
  moraleReason?: string;
  fitness: number;       // 0 - 100 (اللياقة والجاهزية)
  fatigue?: number;      // 0 - 100 (الإرهاق البدني)
  trainingProgress?: number; // 0 - 100 (التقدم نحو التطور)
  injury?: PlayerInjury | null;
  isInjured?: boolean;
  injuryType?: string;
  suspensionMatches?: number;
  isSuspended?: boolean;
  suspensionReason?: string;
  form: number;          // 1 - 10 (المستوى الأخير)
  number: number;
  stats: PlayerStats;
  contractYears: number;
  contractStartYear?: number;
  contractEndYear?: number;
  secondaryPositions?: Position[];
  askingPrice?: number;
  isListedForTransfer?: boolean;
  isLoanListed?: boolean;
  isFreeAgent?: boolean;
  attributeProgress?: Partial<Record<keyof PlayerAttributes, number>>; // 0-100 progress for each attribute
  trainingFocus?: 'general' | 'fitness' | 'shooting' | 'defending' | 'passing' | 'dribbling' | 'goalkeeping';
  careerStage?: 'young' | 'developing' | 'peak' | 'veteran' | 'legend';
  announcedRetirement?: boolean;
  unhappyMatchesCount?: number;
  disgruntled?: boolean;
  injuryWeeks?: number;
  transferRequestSubmitted?: boolean;
  isGuestStar?: boolean; // هل اللاعب معار لمباراة واحدة فقط مقابل إعلان
  guestMatchesRemaining?: number; // عدد المباريات المتبقية (عادة 1)
  guestStarTier?: 'legend' | 'world_class' | 'star' | 'wildcard';
  guestStarQuote?: string;
}

export type StaffRole = 
  | 'assistant_manager'     // مدرب مساعد أول
  | 'fitness_coach'         // مدرب لياقة وأحمال
  | 'psychologist'          // طبيب نفسي رياضي
  | 'medical_doctor'        // رئيس الجهاز الطبي
  | 'performance_analyst';   // محلل أداء تكتيكي

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  roleTitleArabic: string;
  rating: number;          // 1 - 5 نجوم
  salaryMonthly: number;   // راتب شهري
  specialty: string;       // التخصص الدقيق
  description: string;     // الوصف والتأثير
  bonusEffectArabic: string; // نص التأثير التكتيكي/البدني المباشر
  avatar?: string;
}

export type FootballPlayer = Player;

export type FormationType = 
  | '4-4-2' 
  | '4-3-3' 
  | '3-5-2' 
  | '4-2-3-1' 
  | '5-3-2' 
  | '4-1-4-1'
  | '3-4-3'
  | '4-5-1'
  | '4-1-2-1-2'
  | '5-4-1'
  | '4-2-4'
  | '4-3-2-1'
  | '4-2-2-2'
  | '4-3-1-2'
  | '3-4-2-1'
  | '3-4-1-2'
  | '5-2-3'
  | '4-1-3-2'
  | '3-3-3-1'
  | '3-2-4-1'
  | '4-4-1-1'
  | '3-2-2-3'
  | '2-3-5'
  | '4-2-1-3'
  | '4-2-3-1-asym'
  | '3-4-3-diamond';

export type TacticalMentality = 'ultra_defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra_attacking';
export type PassingStyle = 'short' | 'direct' | 'long_balls' | 'tiki_taka_short' | 'through_balls';
export type PressingIntensity = 'low' | 'balanced' | 'high' | 'gegenpress';
export type TempoSpeed = 'slow' | 'balanced' | 'fast';

export type TacticalStyle = 
  | 'tiki_taka'
  | 'gegenpress'
  | 'counter_attack'
  | 'park_the_bus'
  | 'wing_play'
  | 'direct_play'
  | 'total_football'
  | 'catenaccio'
  | 'possession_control'
  | 'transition_control'
  | 'fluid_creative'
  | 'long_ball'
  | 'build_up_from_back'
  | 'fast_transition'
  | 'fluid_positional_play'
  | 'tactical_mastermind';

export type TeamWidth = 'wide' | 'balanced' | 'narrow';
export type DefensiveLine = 'high' | 'balanced' | 'deep';

// Aliases for compatibility
export type Mentality = TacticalMentality;
export type MatchTempo = TempoSpeed;

export interface TeamTactics {
  formation: FormationType;
  mentality: TacticalMentality;
  tacticalStyle?: TacticalStyle;
  teamWidth?: TeamWidth;
  defensiveLine?: DefensiveLine;
  passingStyle: PassingStyle;
  pressingIntensity: PressingIntensity;
  tempo: TempoSpeed;
  startingPlayerIds: string[]; // 11 IDs
  benchPlayerIds: string[];    // up to 7 IDs
  captainId: string;
  penaltyTakerId: string;
  freeKickTakerId: string;
  cornerTakerId: string;

  // Advanced Tactical Knowledge Unlocks (Coaching License Progressive Systems)
  buildUpStyle?: 'from_back' | 'direct_pivot' | 'channel_balls' | 'patient' | 'standard';
  pressingTrap?: 'trap_wings' | 'trap_center' | 'zonal_trap' | 'none';
  fullbackRole?: 'standard' | 'overlapping' | 'inverted' | 'stay_back';
  strikerRole?: 'advanced_forward' | 'target_man' | 'false_9' | 'poacher' | 'pressing_forward';
  midfieldRole?: 'balanced' | 'deep_playmaker' | 'box_to_box' | 'ball_winner' | 'mezzala' | 'shadow_striker';
  attackingPattern?: 'balanced' | 'overload_isolate' | 'switch_play' | 'third_man_runs' | 'rotational';
  pressingTriggers?: ('heavy_touch' | 'back_pass' | 'touchline')[];
  defensiveBlock?: 'low' | 'mid' | 'high' | 'hybrid';
  matchStatePreset?: 'normal' | 'protect_lead' | 'chase_game' | 'counter_risk';
  customPhilosophyName?: string;
}

export interface TacticalMatchReport {
  pressingRating: number;          // 0 - 100
  buildUpRating: number;          // 0 - 100
  defensiveOrgRating: number;     // 0 - 100
  chanceCreationRating: number;   // 0 - 100
  adjustmentsRating: number;      // 0 - 100
  overallTacticalScore: number;   // 0 - 100
  primaryInsightArabic: string;
  secondaryInsightArabic: string;
  staminaWarningArabic?: string;
  tacticalExpGained: {
    styleId: string;
    styleNameArabic: string;
    expGained: number;
    newTotal: number;
  }[];
  tacticalSynergyBonus: number;   // percentage e.g. +8%
}

export type Tactics = TeamTactics;

export interface ClubFacilities {
  stadiumName: string;
  stadiumCapacity: number;
  stadiumLevel: number;     // 1 - 5
  medicalCenterLevel: number;// 1 - 5
  trainingGroundLevel: number;// 1 - 5
  youthAcademyLevel: number;// 1 - 5
  scoutingNetworkLevel: number;// 1 - 5
  ticketPrice?: number;     // Custom ticket price set by coach (in EGP)
}

export type SponsorCategory = 'shirt' | 'stadium' | 'sleeve' | 'kit_apparel' | 'commercial_partner';

export interface SponsorMilestoneBonus {
  leagueChampionBonus?: number;
  cupChampionBonus?: number;
  continentalChampionBonus?: number;
  topFourFinishBonus?: number;
}

export interface Sponsor {
  id: string;
  name: string;
  type: SponsorCategory | 'shirt' | 'stadium' | 'sleeve';
  monthlyPayment: number;
  contractMonthsRemaining: number;
  bonusForWin: number;
  // Extended realistic properties
  category?: SponsorCategory;
  industry?: string;
  tagline?: string;
  brandColor?: string;
  accentColor?: string;
  signingBonus?: number;
  totalDurationMonths?: number;
  satisfaction?: number; // 0 - 100
  reputationMinRequired?: number;
  // Competition-specific clauses
  bonusForDraw?: number;
  bonusCupWin?: number;
  bonusContinentalWin?: number;
  bonusCleanSheet?: number;
  bonusDerbyWin?: number;
  milestoneBonus?: SponsorMilestoneBonus;
  penaltyClause?: number;
}

export interface SponsorshipOffer extends Sponsor {
  offerExpiryRounds?: number;
  isNegotiated?: boolean;
  negotiationCount?: number;
}

export interface FinancialReport {
  weeklyRevenue: {
    tickets: number;
    sponsors: number;
    merchandise: number;
  };
  weeklyExpenses: {
    salaries: number;
    facilityMaintenance: number;
    scouting: number;
  };
}

export interface ClubManager {
  id: string;
  name: string;
  shortName?: string;
  nationality: string;
  countryCode?: string;
  age: number;
  rating: number; // 50 - 99 (قوة وخبرة وتكتيك المدرب)
  tacticalStyle: 'attacking' | 'possession' | 'counter_attack' | 'defensive' | 'high_press' | 'tiki_taka' | 'balanced';
  preferredFormation: FormationType;
  reputation: number; // 1 - 100
  rankingPoints: number; // نقاط تصنيف المدرب
  worldRank: number; // الترتيب العالمي الحالي
  previousWorldRank: number;
  monthlyRankChange: number; // +3, -2, 0
  trophiesWonCount: number;
  majorTrophies: string[];
  currentClubId: string;
  currentClubName: string;
  currentLeagueId?: string;
  contractYears?: number;
  monthlySalary?: number;
  avatar?: string;
}

export interface ClubSquadStrength {
  overall: number; // Starting XI average rating (متوسط قوة التشكيل الأساسي)
  averageStartingRating?: number;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  benchOverall: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  city: string;
  country?: string;
  countryId?: string;
  countryCode?: string;
  continent?: Continent | 'africa' | 'europe' | 'asia' | 'south_america';
  division: number; // 1 = Premier, 2 = Second, 3 = Third, 4 = Fourth
  leagueId?: string;
  reputation: number; // 1 - 100
  minimumManagerLevel?: number;
  minimumReputation?: number;
  preferredManagerLevel?: number;
  preferredReputation?: number;
  clubPrestige?: number;
  financialPower?: 'low' | 'medium' | 'high' | 'elite';
  primaryColor: string;
  secondaryColor: string;
  budget: number; // الرصيد المالي الحالي
  rating?: number;
  stats?: any;
  developmentPoints?: number; // نقاط تطوير اللاعبين المتاحة للنادي
  transferBudget: number;
  wageBudgetMonthly: number;
  facilities: ClubFacilities;
  sponsors: Sponsor[];
  isUserClub: boolean;
  players: Player[];
  tactics?: TeamTactics;
  staff?: StaffMember[];
  manager?: ClubManager;
  squadStrength?: ClubSquadStrength;
  youthAcademyProspects?: YouthProspect[];
  seasonPromotedYouthCount?: number;
  targetLeaguePosition?: number;
  targetLeaguePositionText?: string;
  isNewlyPromoted?: boolean;
  isNewlyRelegated?: boolean;
  previousDivision?: number;
  rankingPoints?: number;
  worldRank?: number;
  previousWorldRank?: number;
  monthlyRankChange?: number;
}

export interface LeagueStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'chance' | 'save' | 'injury' | 'commentary';
  teamId: string;
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  inPlayerName?: string;
  outPlayerName?: string;
  description: string; // تعليق مصري
}

export interface MatchStats {
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homePossession: number; // e.g. 52
  awayPossession: number; // e.g. 48
  homeFouls: number;
  awayFouls: number;
  homeCorners: number;
  awayCorners: number;
  homeYellowCards: number;
  awayYellowCards: number;
  homeRedCards: number;
  awayRedCards: number;
}

export type CompetitionType = 
  | 'LEAGUE' 
  | 'DOMESTIC_COP' 
  | 'DOMESTIC_CUP'
  | 'CONTINENTAL_CUP' 
  | 'league' 
  | 'cup' 
  | 'continental' 
  | 'playoff';

export interface Fixture {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenalties?: number;
  awayPenalties?: number;
  winnerTeamId?: string;
  isPlayed: boolean;
  events?: MatchEvent[];
  stats?: MatchStats;
  competitionType?: CompetitionType;
  competitionId?: string; // e.g. 'egyptian_league', 'caf_champions_league', 'egypt_cup'
  competitionName?: string;
  cupStage?: string;
  stageName?: string;
  stage?: string;
  groupId?: string;
  matchday?: number;
  revenueClaimed?: boolean;
  matchRevenue?: any;
  date?: string; // "YYYY-MM-DD"
  timestamp?: number; // ms timestamp
  tournamentId?: 'league' | 'cup' | 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl' | 'caf_cl';
  tournamentBadge?: string;
}

// ----------------------------------------------------
// MULTI-SEASON & CAREER ENGINE TYPES
// ----------------------------------------------------

export interface SeasonInfo {
  seasonId: string;
  seasonNumber: number;
  startDate: string;
  endDate: string;
  currentRound: number;
  totalRounds: number;
  status: 'upcoming' | 'active' | 'completed';
  leagueId: string;
  leagueName: string;
  divisionTier: number;
}

export interface SeasonHistoryEntry {
  seasonNumber: number;
  seasonYear: string;
  clubId: string;
  clubName: string;
  country: string;
  leagueName: string;
  divisionTier: number;
  finalPosition: number;
  totalTeams: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  trophiesWon: string[];
  resultStatus: 'champion' | 'promoted' | 'playoffs' | 'stayed' | 'relegated';
  resultText: string;
  cupResult?: string;
  managerXpEarned: number;
  seasonEarnings: number;
  outcome?: string;
  status?: string;
  matchesPlayed?: number;
}

export interface SeasonEndSummary {
  seasonNumber: number;
  leagueId: string;
  leagueName: string;
  divisionTier: number;
  clubId: string;
  clubName: string;
  finalPosition: number;
  totalTeams: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  resultStatus: 'champion' | 'promoted' | 'playoffs' | 'stayed' | 'relegated';
  resultTitle: string;
  resultDescription: string;
  nextLeagueName: string;
  nextLeagueId?: string;
  nextDivisionTier: number;
  leagueTrophyAwarded?: string;
  cupTrophyAwarded?: string;
  cupResultText: string;
  continentalTrophyAwarded?: string;
  continentalResultText?: string;
  trophiesWonList?: string[];
  prizeMoney: number;
  ticketRevenueTotal: number;
  sponsorshipTotal: number;
  xpEarned: number;
  reputationChange: number;
  finalBudget: number;
  cupPrizeMoney?: number;
  cupDevelopmentPoints?: number;
  leagueDevelopmentPoints?: number;
  totalDevelopmentPoints?: number;
  developmentPointsEarned?: number;
  developmentPointsBreakdown?: { reason: string; points: number }[];
  worldDominationInfo?: { percentage: number; conqueredCount: number; totalCount: number; isNewConquest: boolean; leagueName: string };
  licenseSettlement?: {
    previousLicense: CoachingLicenseTier;
    previousLicenseTitle: string;
    activeLicense: CoachingLicenseTier;
    activeLicenseAfterRenewal?: CoachingLicenseTier;
    activeLicenseTitle: string;
    seasonBonusDeposited: number;
    renewalFeeRequired: number;
    renewalFeeDeducted: number;
    wasDowngraded: boolean;
    walletBeforeSettlement: number;
    walletAfterSettlement: number;
    personalWalletAfter?: number;
    messageArabic: string;
    warningMessage?: string;
  };
}

export interface LeagueDefinition {
  id: string;
  name: string;
  shortName: string;
  country: string;
  region?: 'africa' | 'europe' | 'asia' | 'south_america';
  tier: number; // 1 = Premier, 2 = Second, 3 = Third, 4 = Fourth
  divisionTier?: number; // alias for tier
  reputation: number; // 1 - 100
  promotionSpots: number; // e.g. 1 or 2
  relegationSpots: number; // e.g. 1 or 2
  playoffSpots: number;
  teams: Club[];
}

export type JobOfferCategory = 
  | 'domestic_stepup' 
  | 'arab_challenge' 
  | 'european_leap' 
  | 'global_elite' 
  | 'rebuild_project' 
  | 'continental_champions'
  // 5 Specific Realism Archetypes:
  | 'higher_competition'    // نادي أكبر ومنافسة أعلى
  | 'mid_table_project'      // نادي متوسط يريد بناء مشروع
  | 'relegation_salvage'     // نادي في خطر ويحتاج إنقاذه من الهبوط
  | 'title_challenger'       // نادي لديه ميزانية كبيرة ويريد المنافسة على البطولات
  | 'youth_foundation';      // نادي أصغر يعطي المدرب فرصة أكبر لبناء الفريق

export interface JobOffer {
  id: string;
  clubId: string;
  clubName: string;
  country: string;
  countryCode?: string;
  leagueId: string;
  leagueName: string;
  divisionTier: number;
  clubReputation: number;
  clubPrestige?: number;
  financialPower?: 'low' | 'medium' | 'high' | 'elite';
  offerCategory?: JobOfferCategory;
  categoryBadge?: string; // e.g. 'عملاق محلي 🇪🇬' | 'تحدي عربي طموح 🏆' | 'بوابة أوروبا 🌍' | 'عملاق عالمي 🌟' | 'مشروع صعود 🚀'
  interestReason?: string; // سبب اهتمام النادي بالمدرب باللغة العربية
  minimumLevelRequired?: number;
  minimumReputationRequired?: number;
  requiredLicense?: CoachingLicenseTier;
  difficultyRating?: 'easy' | 'medium' | 'hard' | 'extreme';
  taskDifficultyArabic?: string; // e.g. "تحدي متوازن" | "مهمة شاقة" | "مشروع أسطوري"
  primaryColor: string;
  secondaryColor: string;
  managerSalary: number; // راتب المدرب الشهري
  transferBudget: number;
  clubBudget?: number;
  wageBudgetMonthly: number;
  boardExpectations: string; // e.g. "المنافسة على اللقب والصعود"
  contractDurationYears: number;
  stadiumName: string;
  stadiumCapacity: number;
  currentPositionInLeague?: number;
  status: 'pending' | 'accepted' | 'rejected';

  // Realistic Multi-Factor Job Market Additions
  pressureLevel?: 'low' | 'moderate' | 'high' | 'extreme';
  pressureLevelArabic?: string; // مستوى الضغط والتوقعات
  offerType?: 'higher_competition' | 'mid_table_project' | 'relegation_salvage' | 'title_challenger' | 'youth_foundation';
  offerTypeArabic?: string; // نوع العرض بالعربية
  squadQualityRating?: number; // متوسط جودة وقوة التشكيلة
  tacticalFitReason?: string; // التوافق مع الأسلوب التكتيكي للمدرب
  clubAmbitionText?: string; // طموح إدارة النادي
  freedomLevelArabic?: string; // حرية بناء الفريق وسوق الانتقالات
  clubSituationDescription?: string; // وضع النادي الحالي والظروف التي دفعتهم للتفاوض
}

export interface YouthProspect {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  age: number; // 15 - 18
  position: Position;
  positionCategory: PositionCategory;
  nationality: string;
  nationalityCode: string;
  preferredFoot: PreferredFoot;
  personality: PlayerPersonality;
  overallRating: number; // 48 - 72 based on academy level
  potentialRating: number; // 75 - 94+
  scoutReport: string; // تقرير الكشاف الفني
  specialTrait?: string; // e.g. 'صاحب تسديدات صاروخية' | 'مراوغ استثنائي' | 'حائط صد دفاعي' | 'صانع ألعاب عبقري'
  graduationReadiness: number; // 0 - 100%
  marketValuation: number;
  wageDemandMonthly: number;
  intakeSeasonNumber: number;
}

export interface CupMatch {
  id: string;
  stage: 'round_of_64' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final';
  stageName: string;
  roundTrigger: number; // e.g. Round 4 = Quarter, Round 8 = Semi, Round 12 = Final
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  isPlayed: boolean;
  winnerTeamId?: string;
  events?: MatchEvent[];
  stats?: MatchStats;
}

export interface CupTournament {
  id: string;
  name: string;
  country: string;
  seasonNumber: number;
  trophyName: string;
  prizeMoneyWinner: number;
  prizeMoneyRunnerUp: number;
  matches: CupMatch[];
  isCompleted: boolean;
  winnerClubId?: string;
  runnerUpClubId?: string;
  userEliminatedStage?: string;
  claimedRewardStages?: string[];
}

export interface ContinentalGroupStanding {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ContinentalGroup {
  id: string;
  name: string;
  teamIds: string[];
  standings: ContinentalGroupStanding[];
}

export interface ContinentalMatch {
  id: string;
  stage: 'group' | 'quarter' | 'semi' | 'final';
  stageName: string;
  groupId?: string;
  matchday?: number;
  roundTrigger: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  isPlayed: boolean;
  winnerTeamId?: string;
  events?: MatchEvent[];
  stats?: MatchStats;
}

export interface ContinentalTournament {
  id: string;
  competitionId: 'ccl' | 'ccc' | 'ucl' | 'uel' | 'acl';
  name: string;
  region: 'africa' | 'europe' | 'asia' | 'south_america';
  seasonNumber: number;
  trophyName: string;
  prizeMoneyWinner: number;
  prizeMoneyRunnerUp: number;
  groups: ContinentalGroup[];
  matches: ContinentalMatch[];
  isCompleted: boolean;
  winnerClubId?: string;
  runnerUpClubId?: string;
  userEliminatedStage?: string;
  currentStage: 'group' | 'quarter' | 'semi' | 'final' | 'completed';
}

export interface ManagerProfile {
  trainerId?: string;
  name: string;
  age: number;
  nationality: string;
  avatar?: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  reputation: number; // 1 - 100
  license: CoachingLicenseTier;
  matchesManaged: number;
  wins: number;
  draws: number;
  losses: number;
  goalsScored: number;
  goalsConceded: number;
  trophies: string[];
  careerEarnings: number;
  favoriteFormation: FormationType;
  
  // Permanent multi-season stats
  totalSeasons: number;
  leagueTitles: number;
  cupTitles: number;
  promotions: number;
  relegations: number;
  clubsManaged: string[];
  countriesManaged: string[];
  highestLeagueReached: string;
  highestManagerLevel: number;
  highestReputation: number;
  developmentPoints?: number; // نقاط تطوير اللاعبين المتاحة للمدرب
  isUnemployed?: boolean;
  currentClubId?: string | null;
  currentClubName?: string;
  employmentStatus?: 'employed' | 'unemployed';
  totalSeasonsCompleted?: number;
  history: SeasonHistoryEntry[];

  // Career Progression, Continuous Milestones & Dynamic Challenges
  completedMilestones?: string[]; // IDs of unlocked career milestones
  unlockedBadges?: string[]; // Badges earned along the journey
  activeChallenges?: CareerDynamicChallenge[]; // Current dynamic challenges
  totalPlayersDeveloped?: number; // Total players trained / leveled up
  totalPlayTimeMinutes?: number; // Real active in-game minutes
  bestClubManaged?: string; // Best club managed

  // World Domination & League Conquest System (السيطرة على العالم)
  conqueredLeagues?: string[]; // قائمة الدوريات الفريدة التي فاز بها المدرب
  worldDominationPercentage?: number; // نسبة السيطرة على العالم (0 - 100%)

  // Global Manager Ranking, Daily Points & Monthly Points
  rankingPoints?: number;
  managerRating?: number; // 50 - 99 (قوة وخبرة وتصنيف المدرب)
  worldRank?: number;
  previousWorldRank?: number;
  monthlyRankChange?: number;
  dailyPoints?: number;
  dailyMatchesPlayed?: number;
  dailyWins?: number;
  dailyDraws?: number;
  dailyLosses?: number;
  lastDailyResetDate?: string; // YYYY-MM-DD
  monthlyRankingPoints?: number;
  previousMonthRank?: number;
  currentRank?: number;
  lastRankingResetMonth?: string;

  // Manager Personal Finances & Development
  monthlySalary?: number; // مرتب المدرب الشهري من النادي الحالي
  personalWallet?: number; // الذمة المالية والمحفظة الشخصية للمدرب
  financialTransactions?: ManagerTransaction[]; // سجل المعاملات المالية
  completedCourses?: string[]; // الدورات والرخص التدريبية الحاصل عليها
  ownedLicenses?: CoachingLicenseTier[]; // الرخص التي قام المدرب بشرائها سابقاً
  lastSettledSeasonNumber?: number; // رقم الموسم الأخير الذي تمت تسوية مكافأته وتجديد رخصته
  totalClubDonations?: number; // إجمالي المبالغ المتبرع بها للنادي
  totalBonusesEarned?: number; // إجمالي مكافآت الفوز والبطولات
  dailyLoginRewardState?: DailyLoginRewardState; // حالة ومكافآت تسجيل الدخول اليومي المتتالية

  // Deep Tactical Knowledge & Mastery (الخبرة والمعرفة التكتيكية التراكمية)
  tacticalExperience?: Record<string, number>; // e.g. { high_press: 72, tiki_taka: 55, low_block: 85 }
  tacticalKnowledge?: string[]; // IDs of unlocked tactical capabilities
  customPhilosophies?: {
    id: string;
    name: string;
    description: string;
    formation: FormationType;
    style: TacticalStyle;
    buildUp: string;
    pressing: PressingIntensity;
    createdDate: string;
  }[];
}

export interface ManagerTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'salary' | 'trophy_bonus' | 'course_license' | 'license_upgrade' | 'license_renewal' | 'club_donation' | 'player_bonus' | 'match_bonus';
  description: string;
}

export type OfficialCoachingLicenseTier = 'BASIC' | 'PREMIER' | 'CONTINENTAL' | 'LEGENDARY';
export type CoachingLicenseTier = OfficialCoachingLicenseTier | 'D' | 'C' | 'B' | 'A' | 'PRO' | 'ELITE';

export type ClubPrestigeTier = 'tier_dc' | 'tier_cb' | 'tier_ba' | 'tier_apro' | 'tier_pro' | 'tier_elite';

export interface CareerMilestone {
  id: string;
  title: string;
  description: string;
  category: 'short' | 'mid' | 'long';
  targetValue: number;
  currentValue: number;
  unit?: string;
  rewardReputation: number;
  rewardXp: number;
  rewardCash: number;
  badgeIcon: string;
  isCompleted: boolean;
  unlockedAt?: string;
}

export interface CareerDynamicChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'normal' | 'hard' | 'extreme';
  targetType: 'win_streak' | 'beat_stronger' | 'clean_sheets' | 'top_position' | 'undefeated_month' | 'player_rating';
  targetValue: number;
  currentValue: number;
  rewardReputation: number;
  rewardCash: number;
  expiresInRounds: number;
  isCompleted: boolean;
  isFailed?: boolean;
}

export interface WorldClubRankingItem {
  clubId: string;
  clubName: string;
  shortName: string;
  city: string;
  country: string;
  countryCode: string;
  leagueId: string;
  leagueName: string;
  tier: number;
  reputation: number;
  squadStrength: number; // متوسط قوة التشكيل الأساسي
  attackStrength: number;
  defenseStrength: number;
  managerName: string;
  managerRating: number;
  rankingPoints: number;
  worldRank: number;
  previousWorldRank: number;
  monthlyRankChange: number;
  primaryColor: string;
  secondaryColor: string;
  trophiesCount?: number;
}

export interface WorldRankingsData {
  lastUpdatedMonth: string; // e.g. '2026-08'
  rankingMonth?: string;
  managers: ClubManager[];
  clubs: WorldClubRankingItem[];
}

export interface InboxMessage {
  id: string;
  title: string;
  sender: string;
  date: string;
  content: string;
  type: 'board' | 'transfer' | 'scout' | 'fan' | 'news' | 'offer' | 'finance' | 'contract';
  read: boolean;
  priority?: 'normal' | 'high' | 'urgent';
  offerDetails?: {
    type: 'player_bid' | 'job_offer' | 'contract_renewal';
    clubId?: string;
    clubName?: string;
    playerId?: string;
    playerName?: string;
    playerPosition?: Position;
    playerRating?: number;
    amount?: number;
    wageOffer?: number;
    jobOfferId?: string;
    bidId?: string;
    isLucrative?: boolean;
    profitRatio?: number;
  };
  contractDetails?: {
    playerId: string;
    playerName: string;
    playerPosition: Position;
    playerRating: number;
    currentSalary: number;
    suggestedWage: number;
    marketValue: number;
    contractYears: number;
    renewed?: boolean;
  };
  actionTaken?: 'accepted' | 'rejected' | 'renewed' | null;
}

export interface TransferOffer {
  id: string;
  playerId: string;
  player: Player;
  fromClubId: string;
  fromClubName: string;
  toClubId: string;
  toClubName: string;
  bidAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  date: string;
}

export interface TransferHistoryEntry {
  id: string;
  playerId: string;
  playerName: string;
  playerRating: number;
  position: Position;
  type: 'buy' | 'sell';
  fee: number;
  salary: number;
  date: string;
  seasonNumber: number;
  round?: number;
  fromClubName: string;
  toClubName: string;
  timestamp: number;
}

export interface ClubEconomySummary {
  clubBudget: number;
  transferSpendingTotal: number;
  transferIncomeTotal: number;
  salaryExpensesTotal: number;
  sponsorIncomeTotal: number;
  matchIncomeTotal: number;
  facilitySpendingTotal: number;
  otherExpensesTotal?: number;
  currentSeasonNetProfit: number;
}

export interface CurrentSeasonStats {
  seasonNumber: number;
  leagueName: string;
  divisionTier: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  currentPosition: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  pointsPerGame: number;
}

export type ActiveTab = 'dashboard' | 'squad' | 'tactics' | 'matches' | 'online_pvp' | 'rankings' | 'league' | 'transfers' | 'training' | 'club' | 'career' | 'inbox' | 'challenges';

// ----------------------------------------------------
// CAREER MODE: CALENDAR, DAY-BY-DAY & ADVANCED SIMULATION
// ----------------------------------------------------

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  rawDateStr: string; // '2026-08-09'
  formattedArabic: string; // 'الأحد 9 أغسطس 2026'
  formattedArabicDate?: string;
  formattedDate?: string;
  dayIndexInSeason: number;
}

export type NegotiationStage = 
  | 'incoming_bid'
  | 'club_review'
  | 'club_counter'
  | 'player_terms'
  | 'player_counter'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface ActiveNegotiation {
  id: string;
  type: 'buy' | 'sell' | 'renew';
  playerId: string;
  playerName: string;
  playerPosition: Position;
  playerOverall: number;
  playerAge: number;
  playerClubId?: string;
  playerClubName?: string;
  sellingClubName?: string;
  buyerClubId: string;
  buyerClubName: string;
  stage: NegotiationStage;
  bidFee: number;
  offeredSalary: number;
  contractYears: number;
  squadRole: 'key_player' | 'first_team' | 'rotation' | 'prospect';
  demandedFee?: number;
  demandedSalary?: number;
  counterSalaryOffer?: number;
  lastFeedback?: string;
  actionRequired?: boolean;
  daysRemaining?: number;
  statusMessage: string;
  daysRemainingInStage: number;
  managerHasCountered?: boolean;
  counterCount?: number;
  history: {
    dateStr: string;
    message: string;
    from: 'manager' | 'club' | 'player';
  }[];
}

export interface BoardObjective {
  id: string;
  title: string;
  category: 'league' | 'cup' | 'finance' | 'youth';
  targetDescription: string;
  currentProgress: string;
  isAchieved: boolean;
  importance: 'critical' | 'high' | 'medium';
}

export interface BoardSystem {
  confidence: number; // 0 - 100 (ثقة مجلس الإدارة)
  fanConfidence?: number; // 0 - 100 (ثقة ورضا الجماهير)
  overallConfidence?: number; // 0 - 100 (المؤشر العام الشامل)
  targetLeaguePosition: number; // e.g. 1, 4, 8, 14
  targetLeaguePositionText: string; // e.g. "المركز 1 (التتويج باللقب)"
  currentStandingPosition?: number; // المركز الحالي في جدول الدوري
  leagueTarget: string;
  cupTarget: string;
  financialTarget: string;
  youthTarget: string;
  wageCapMonthly: number;
  status: 'secure' | 'stable' | 'under_pressure' | 'critical' | 'very_satisfied' | 'satisfied' | 'danger_zone';
  boardStatus?: 'very_satisfied' | 'satisfied' | 'under_review' | 'danger_zone';
  fanStatus?: 'ecstatic' | 'satisfied' | 'discontent' | 'furious';
  statusDescription: string;
  fanStatusDescription?: string;
  lastMatchFeedback?: string;
  objectives: BoardObjective[];
}

export interface DailyNewsItem {
  id: string;
  dateStr: string;
  title: string;
  content: string;
  category: 'transfer' | 'injury' | 'match' | 'board' | 'youth' | 'crisis' | 'scout' | 'milestone';
  importance: 'high' | 'medium' | 'normal';
  icon?: string;
  source?: string;
  author?: string;
  tags?: string[];
  clubName?: string;
  likes?: number;
  timeAgo?: string;
  fullStory?: string;
  commentsCount?: number;
  isBreaking?: boolean;
}

export interface RetiredPlayer {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  finalRating: number;
  lastClubName: string;
  clubId?: string;
  clubName?: string;
  careerGoals: number;
  careerAssists: number;
  careerAppearances: number;
  trophiesWon: string[];
  retirementSeason: number;
  retirementYear: string;
  legacyNote: string;
}

export interface DayAdvanceSummary {
  currentDateStr: string;
  formattedArabicDate: string;
  daysAdvanced?: number;
  matchPlayed?: boolean;
  matchFixtureId?: string;
  matchSummaryText?: string;
  postMatchSummary?: {
    competitionName: string;
    roundLabel: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    homePenalties?: number;
    awayPenalties?: number;
    homeScorersText: string;
    awayScorersText: string;
    allScorersText: string;
    homeGoalScorers?: string[];
    awayGoalScorers?: string[];
    isUserWin?: boolean;
    isUserDraw?: boolean;
  };
  trainingReports: {
    playerId: string;
    playerName: string;
    changeText: string;
    type: 'growth' | 'fatigue' | 'boost';
  }[];
  injuryUpdates: {
    playerId: string;
    playerName: string;
    text: string;
    recovered?: boolean;
  }[];
  negotiationUpdates: {
    negotiationId: string;
    playerName: string;
    text: string;
    stage: NegotiationStage;
    actionRequired?: boolean;
  }[];
  newsItems: DailyNewsItem[];
  boardFeedback?: string;
  contractsExpiringCount?: number;
}

export interface MatchBlockerInfo {
  isOpen: boolean;
  reason: 'match_today' | 'lineup_issue' | 'not_match_day';
  title: string;
  message: string;
  fixture?: Fixture;
  opponentClub?: Club;
  invalidStarters?: {
    player: Player;
    reason: 'injured' | 'suspended' | 'missing';
    description: string;
  }[];
}

export interface SquadValidationResult {
  isValid: boolean;
  invalidStarters: {
    player: Player;
    reason: 'injured' | 'suspended' | 'missing';
    description: string;
  }[];
  hasInjured: boolean;
  hasSuspended: boolean;
  hasMissing: boolean;
  missingPositions?: string[];
}

export interface KeyThreatPlayer {
  id: string;
  name: string;
  position: string;
  rating: number;
  threatDescription: string;
  markingAdvice: string;
}

export interface OpponentScoutingReport {
  opponentClubId: string;
  opponentClubName: string;
  round: number;
  scoutedAtDateStr: string;
  scoutedAtFormatted: string;
  cost: number; // 100,000 EGP
  tacticalWeaknesses: string[];
  tacticalStrengths: string[];
  keyThreatPlayers: KeyThreatPlayer[];
  predictedFormation: FormationType;
  predictedMentality: TacticalMentality;
  predictedPressing: PressingIntensity;
  recommendedCounterStrategy: {
    suggestedFormation: FormationType;
    suggestedMentality: TacticalMentality;
    suggestedPressing: PressingIntensity;
    tacticalTip: string;
  };
  setPieceVulnerability: string;
  staminaAndFormInsight: string;
  scoutConfidenceRating: number; // 92 - 99%
}

export interface ReferralFriend {
  id: string;
  friendName: string;
  friendCode: string;
  joinedDate: string;
  seasonsCompleted: number; // Must reach at least 3 seasons to qualify
  rewardClaimed: boolean;
  rewardAmount: number; // 1,000,000 EGP
  status: 'in_progress' | 'ready_to_claim' | 'claimed';
}

export interface ReferralSystemState {
  myReferralCode: string;
  referredByCode?: string;
  referrals: ReferralFriend[];
  totalRewardsClaimed: number;
}

export type TrainingBoostType = 'fitness' | 'attacking' | 'defensive' | 'tactical';

export interface ActiveTrainingBoost {
  type: TrainingBoostType;
  title: string;
  description: string;
  activatedAtRound: number;
  activatedAtDateStr: string;
  bonusValue: number; // 0.05 (+5%)
  isConsumed: boolean;
}

export interface AdManagerState {
  isPremium: boolean;
  matchesPlayedSinceLastInterstitial: number;
  lastInterstitialTimestamp: number;
  activeBoost: ActiveTrainingBoost | null;
  lastRewardedAdTimestamp: number;
}





