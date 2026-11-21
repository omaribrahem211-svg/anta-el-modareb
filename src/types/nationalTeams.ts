// =========================================================================
// National Teams (تدريب المنتخبات) — fully isolated type definitions.
// Nothing in this file is imported by club logic; club logic is untouched.
// =========================================================================

import { ContinentCode, Player, TeamTactics } from './game';

/** International competitions handled by the national-teams engine. */
export type InternationalCompetitionId = 'afcon' | 'worldcup';

/** Friendly internationals use the same match shape with this marker id. */
export const FRIENDLY_COMPETITION_ID = 'friendly' as const;

/**
 * A national team. Squads are CALL-UP LISTS ONLY: 23 snapshots of existing
 * club players selected by nationality. National teams never buy, sell or
 * generate players. Countries without enough real players participate as
 * statistical-strength teams (players: [] and a derived reputation).
 */
export interface NationalTeam {
  id: string; // 'nt_EGY'
  countryCode: string; // 'EGY'
  name: string; // 'مصر'
  shortName: string; // 'EGY'
  flag: string; // '🇪🇬'
  continent: ContinentCode;
  /** True when the country has too few real players and plays statistically. */
  isStatistical: boolean;
  /** Raw country football level (1-100) from countries data. */
  footballLevel: number;
  /** Engine-scale reputation used by the match engine fallback path. */
  reputation: number;
  /** The current 23-man call-up list (snapshots of club players). */
  players: Player[];
  /** Season number of the last call-up refresh. */
  lastCallUpSeason?: number;
  /** Auto-built default tactics for AI-managed matches. */
  tactics?: TeamTactics;
  /** FIFA-style ranking points (NT ranking, separate from club rankings). */
  rankingPoints: number;
  worldRank: number;
  previousWorldRank?: number;
  /** Trophies won by this national team. */
  trophies: NationalTeamTrophy[];
  /** All-time NT stats. */
  stats: NationalTeamStats;
  /** True when the user is the current NT manager (dual club+NT job allowed). */
  isUserManaged?: boolean;
}

export interface NationalTeamTrophy {
  competitionId: InternationalCompetitionId;
  name: string; // 'كأس الأمم الإفريقية'
  seasonNumber: number;
}

export interface NationalTeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export type InternationalStage =
  | 'group'
  | 'round_of_16'
  | 'quarter'
  | 'semi'
  | 'final';

export interface InternationalGroupStanding {
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

export interface InternationalGroup {
  id: string;
  name: string; // 'المجموعة أ'
  teamIds: string[];
  standings: InternationalGroupStanding[];
}

export interface InternationalMatch {
  id: string;
  competitionId: InternationalCompetitionId | typeof FRIENDLY_COMPETITION_ID;
  stage: InternationalStage | 'friendly';
  stageName: string;
  groupId?: string;
  matchday?: number;
  /** League round number after which this match is played (international break). */
  roundTrigger: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  homePenalties?: number;
  awayPenalties?: number;
  isPlayed: boolean;
  winnerTeamId?: string;
}

export interface InternationalTournament {
  id: string; // 'afcon_s2', 'worldcup_s4'
  competitionId: InternationalCompetitionId;
  name: string;
  trophyName: string;
  seasonNumber: number;
  groups: InternationalGroup[];
  matches: InternationalMatch[];
  participantTeamIds: string[];
  currentStage: InternationalStage | 'completed';
  isCompleted: boolean;
  winnerTeamId?: string;
  runnerUpTeamId?: string;
  /** The NT managed by the user, if it participates. */
  userTeamId?: string;
  userEliminatedStage?: string;
}

/** A national-team job offer for a high-reputation manager. */
export interface NationalTeamJobOffer {
  id: string;
  nationalTeamId: string;
  nationalTeamName: string;
  flag: string;
  requiredReputation: number;
  offeredSeason: number;
  expiresAfterSeasons: number;
}

/** Serializable slice stored in game state / saves. All fields optional-additive. */
export interface NationalTeamsState {
  teams: NationalTeam[];
  activeTournament: InternationalTournament | null;
  /** A tournament scheduled later this season (e.g. post-season World Cup). */
  queuedTournament: InternationalTournament | null;
  lastTournamentSeasonByCompetition: Partial<Record<InternationalCompetitionId, number>>;
  friendlyMatches: InternationalMatch[];
  userNationalTeamId: string | null;
  pendingJobOffers: NationalTeamJobOffer[];
  initializedForSeason?: number;
  /** Idempotency marker: highest league round already processed. */
  lastProcessedRound?: number;
  /** Set once the post-season tournament was force-completed at season end. */
  postSeasonCompletedForSeason?: number;
}
