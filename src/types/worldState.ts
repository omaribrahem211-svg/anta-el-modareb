import {
  Club,
  Player,
  Position,
  PositionCategory,
  TeamTactics,
  ClubFacilities,
  Sponsor,
  StaffMember,
  ClubManager,
  ClubSquadStrength
} from './game';

export interface WorldPlayer extends Player {
  id: string;
  name: string;
  currentClubId: string;
  currentLeagueId?: string;
  salary: number;
  contractYears: number;
  contractDuration?: number; // alias
  overallRating: number;
  rating?: number;
  potentialRating: number;
  marketValue: number;
  age: number;
  position: Position;
  positionCategory: PositionCategory;
}

export interface WorldTeam {
  id: string;
  name: string;
  shortName: string;
  city?: string;
  country?: string;
  countryCode?: string;
  division: number;
  currentLeagueId: string;
  reputation: number;
  budget: number;
  transferBudget?: number;
  wageBudgetMonthly?: number;
  primaryColor?: string;
  secondaryColor?: string;
  facilities?: ClubFacilities;
  sponsors?: Sponsor[];
  tactics?: TeamTactics;
  staff?: StaffMember[];
  manager?: ClubManager;
  squadStrength?: ClubSquadStrength;
  trophies?: { name: string; season: number; year?: string }[];
  isNewlyPromoted?: boolean;
  isNewlyRelegated?: boolean;
  previousDivision?: number;
  [key: string]: any;
}

export interface WorldState {
  version: number;
  lastUpdated: number;
  userCurrentTeamId: string;
  leagues: Record<string, string[]>; // LeagueId -> Array of Team IDs
  teams: Record<string, WorldTeam>;   // TeamId -> WorldTeam
  players: Record<string, WorldPlayer>; // PlayerId -> WorldPlayer
}

export interface LeaguePromotionRelegationRule {
  leagueId: string;
  promotedTeamIds: string[];
  relegatedTeamIds: string[];
  targetPromotedLeagueId?: string;
  targetRelegatedLeagueId?: string;
}
