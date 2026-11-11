/**
 * World State Engine - Single Source of Truth for the Persistent Universe
 * 
 * Decouples game logic, simulation, transfers, and manager career changes from hardcoded club IDs.
 * Preserves club rosters, ratings, trophies, and league tiers permanently across club switches.
 */

import { Club, Player } from '../types/game';
import { WorldPlayer, WorldTeam, WorldState, LeaguePromotionRelegationRule } from '../types/worldState';
import { GLOBAL_LEAGUES, EGYPT_TIER_4_LEAGUE } from '../data/leaguesData';
import { calculateRealisticSalary } from '../services/economyService';
import { calculateSquadStrength } from '../utils/rankingsEngine';

const WORLD_STATE_VERSION = 1;

/**
 * Initializes a new WorldState object from seed JSON data.
 * This is ONLY called once on a fresh game or if no save exists.
 */
export function initWorldStateFromSeed(userTeamId?: string, defaultLeagueId: string = 'egy_tier_4'): WorldState {
  const leagues: Record<string, string[]> = {};
  const teams: Record<string, WorldTeam> = {};
  const players: Record<string, WorldPlayer> = {};

  const allLeagues = { ...GLOBAL_LEAGUES, [EGYPT_TIER_4_LEAGUE.id]: EGYPT_TIER_4_LEAGUE };

  Object.entries(allLeagues).forEach(([leagueId, leagueDef]) => {
    if (!leagueDef || !Array.isArray(leagueDef.teams)) return;

    if (!leagues[leagueId]) {
      leagues[leagueId] = [];
    }

    leagueDef.teams.forEach(club => {
      if (!club || !club.id) return;

      // Register team in league
      if (!leagues[leagueId].includes(club.id)) {
        leagues[leagueId].push(club.id);
      }

      // Store normalized team
      if (!teams[club.id]) {
        teams[club.id] = {
          id: club.id,
          name: club.name,
          shortName: club.shortName || club.name,
          city: club.city || '',
          country: club.country || leagueDef.country || 'مصر',
          countryCode: club.countryCode,
          division: club.division ?? leagueDef.tier ?? 1,
          currentLeagueId: leagueId,
          reputation: club.reputation || 50,
          budget: club.budget || 200000,
          transferBudget: club.transferBudget || club.budget || 200000,
          wageBudgetMonthly: club.wageBudgetMonthly || 30000,
          primaryColor: club.primaryColor || '#10b981',
          secondaryColor: club.secondaryColor || '#0f172a',
          facilities: club.facilities,
          sponsors: club.sponsors || [],
          tactics: club.tactics,
          staff: club.staff || [],
          manager: club.manager,
          trophies: [],
          isNewlyPromoted: false,
          isNewlyRelegated: false,
        };
      }

      // Store normalized players
      if (Array.isArray(club.players)) {
        club.players.forEach(p => {
          if (!p || !p.id) return;

          const overall = Number(p.overallRating || p.rating || 60);
          const salary = Number(p.salary) > 0 ? Number(p.salary) : calculateRealisticSalary(overall, { divisionTier: leagueDef.tier || 1 });
          const contractYears = Number(p.contractYears) > 0 ? Number(p.contractYears) : 2;

          players[p.id] = {
            ...p,
            id: p.id,
            name: p.name,
            currentClubId: club.id,
            currentLeagueId: leagueId,
            salary,
            contractYears,
            contractDuration: contractYears,
            overallRating: overall,
            rating: overall,
            potentialRating: Number(p.potentialRating || overall + 5),
            marketValue: Number(p.marketValue || overall * 1500),
            age: Number(p.age || 24),
            position: p.position || 'CM',
            positionCategory: p.positionCategory || 'MID',
          };
        });
      }
    });
  });

  // Pick default user club
  let selectedUserTeamId = userTeamId;
  if (!selectedUserTeamId || !teams[selectedUserTeamId]) {
    const defaultLeagueTeams = leagues[defaultLeagueId];
    selectedUserTeamId = (defaultLeagueTeams && defaultLeagueTeams[0]) || Object.keys(teams)[0] || 'team_al_ahly';
  }

  return {
    version: WORLD_STATE_VERSION,
    lastUpdated: Date.now(),
    userCurrentTeamId: selectedUserTeamId,
    leagues,
    teams,
    players,
  };
}

/**
 * Denormalizes a team by ID, constructing a full Club object with its current players.
 */
export function denormalizeTeam(teamId: string, worldState: WorldState): Club | null {
  if (!worldState || !worldState.teams) return null;
  const wTeam = worldState.teams[teamId];
  if (!wTeam) return null;

  // Gather all players currently belonging to this club
  const clubPlayers: Player[] = Object.values(worldState.players)
    .filter(p => p && p.currentClubId === teamId)
    .map(p => ({
      ...p,
      contractDuration: p.contractYears,
    }));

  const isUserClub = teamId === worldState.userCurrentTeamId;

  const club: Club = {
    id: wTeam.id,
    name: wTeam.name,
    shortName: wTeam.shortName,
    city: wTeam.city || '',
    country: wTeam.country,
    countryCode: wTeam.countryCode,
    division: wTeam.division,
    leagueId: wTeam.currentLeagueId,
    reputation: wTeam.reputation,
    budget: wTeam.budget,
    transferBudget: wTeam.transferBudget ?? wTeam.budget,
    wageBudgetMonthly: wTeam.wageBudgetMonthly ?? 30000,
    primaryColor: wTeam.primaryColor || '#10b981',
    secondaryColor: wTeam.secondaryColor || '#0f172a',
    facilities: wTeam.facilities || {
      stadiumName: `${wTeam.name} Stadium`,
      stadiumCapacity: 15000,
      stadiumLevel: 2,
      medicalCenterLevel: 2,
      trainingGroundLevel: 2,
      youthAcademyLevel: 2,
      scoutingNetworkLevel: 2,
    },
    sponsors: wTeam.sponsors || [],
    isUserClub,
    players: clubPlayers,
    tactics: wTeam.tactics,
    staff: wTeam.staff,
    manager: wTeam.manager,
    isNewlyPromoted: wTeam.isNewlyPromoted,
    isNewlyRelegated: wTeam.isNewlyRelegated,
    previousDivision: wTeam.previousDivision,
  };

  club.squadStrength = calculateSquadStrength(club);
  return club;
}

/**
 * Denormalizes all clubs belonging to a specific league.
 */
export function denormalizeLeagueTeams(leagueId: string, worldState: WorldState): Club[] {
  if (!worldState || !worldState.leagues) return [];
  const teamIds = worldState.leagues[leagueId] || [];

  return teamIds
    .map(id => denormalizeTeam(id, worldState))
    .filter((c): c is Club => c !== null);
}

/**
 * Synchronizes active mutated clubs and their players into the immutable world state.
 */
export function updateWorldWithClubs(worldState: WorldState, clubs: Club[]): WorldState {
  if (!worldState || !Array.isArray(clubs) || clubs.length === 0) return worldState;

  const nextTeams = { ...worldState.teams };
  const nextPlayers = { ...worldState.players };

  clubs.forEach(club => {
    if (!club || !club.id) return;

    // Update team properties
    const existing = nextTeams[club.id];
    nextTeams[club.id] = {
      ...(existing || {}),
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      city: club.city || existing?.city || '',
      country: club.country || existing?.country,
      division: club.division ?? existing?.division ?? 1,
      currentLeagueId: club.leagueId || existing?.currentLeagueId || '',
      reputation: club.reputation ?? existing?.reputation ?? 50,
      budget: club.budget ?? existing?.budget ?? 100000,
      transferBudget: club.transferBudget ?? existing?.transferBudget ?? club.budget,
      wageBudgetMonthly: club.wageBudgetMonthly ?? existing?.wageBudgetMonthly ?? 30000,
      primaryColor: club.primaryColor || existing?.primaryColor || '#10b981',
      secondaryColor: club.secondaryColor || existing?.secondaryColor || '#0f172a',
      facilities: club.facilities || existing?.facilities,
      sponsors: club.sponsors || existing?.sponsors || [],
      tactics: club.tactics || existing?.tactics,
      staff: club.staff || existing?.staff,
      manager: club.manager || existing?.manager,
    };

    // Update players
    if (Array.isArray(club.players)) {
      club.players.forEach(p => {
        if (!p || !p.id) return;
        const pOverall = Number(p.overallRating || p.rating || 60);
        nextPlayers[p.id] = {
          ...p,
          id: p.id,
          name: p.name,
          currentClubId: club.id,
          currentLeagueId: club.leagueId || existing?.currentLeagueId,
          salary: Number(p.salary) > 0 ? Number(p.salary) : (nextPlayers[p.id]?.salary || 3000),
          contractYears: Number(p.contractYears) > 0 ? Number(p.contractYears) : (nextPlayers[p.id]?.contractYears || 2),
          contractDuration: Number(p.contractYears) > 0 ? Number(p.contractYears) : (nextPlayers[p.id]?.contractYears || 2),
          overallRating: pOverall,
          rating: pOverall,
        };
      });
    }
  });

  return {
    ...worldState,
    teams: nextTeams,
    players: nextPlayers,
    lastUpdated: Date.now(),
  };
}

/**
 * Switches the managed club cleanly without wiping or resetting the former club.
 */
export function switchManagerTeamInWorld(worldState: WorldState, newTeamId: string): WorldState {
  if (!worldState || !worldState.teams[newTeamId]) {
    console.warn('[WorldStateEngine] Target club not found in worldState:', newTeamId);
    return worldState;
  }

  return {
    ...worldState,
    userCurrentTeamId: newTeamId,
    lastUpdated: Date.now(),
  };
}

/**
 * Applies cumulative promotions and relegations to the world leagues and updates team definitions.
 */
export function resolveSeasonPromotionsAndRelegations(
  worldState: WorldState,
  rules: LeaguePromotionRelegationRule[]
): WorldState {
  if (!worldState || !Array.isArray(rules) || rules.length === 0) return worldState;

  const nextLeagues = { ...worldState.leagues };
  const nextTeams = { ...worldState.teams };

  rules.forEach(rule => {
    const { leagueId, promotedTeamIds, relegatedTeamIds, targetPromotedLeagueId, targetRelegatedLeagueId } = rule;

    // Handle Promoted Teams
    if (targetPromotedLeagueId && Array.isArray(promotedTeamIds) && promotedTeamIds.length > 0) {
      if (!nextLeagues[targetPromotedLeagueId]) nextLeagues[targetPromotedLeagueId] = [];
      if (!nextLeagues[leagueId]) nextLeagues[leagueId] = [];

      promotedTeamIds.forEach(teamId => {
        // Remove from current league
        nextLeagues[leagueId] = nextLeagues[leagueId].filter(id => id !== teamId);
        // Add to higher league
        if (!nextLeagues[targetPromotedLeagueId].includes(teamId)) {
          nextLeagues[targetPromotedLeagueId].push(teamId);
        }
        // Update team metadata
        if (nextTeams[teamId]) {
          const oldDiv = nextTeams[teamId].division;
          nextTeams[teamId] = {
            ...nextTeams[teamId],
            currentLeagueId: targetPromotedLeagueId,
            division: Math.max(1, oldDiv - 1),
            previousDivision: oldDiv,
            isNewlyPromoted: true,
            isNewlyRelegated: false,
          };
        }
      });
    }

    // Handle Relegated Teams
    if (targetRelegatedLeagueId && Array.isArray(relegatedTeamIds) && relegatedTeamIds.length > 0) {
      if (!nextLeagues[targetRelegatedLeagueId]) nextLeagues[targetRelegatedLeagueId] = [];
      if (!nextLeagues[leagueId]) nextLeagues[leagueId] = [];

      relegatedTeamIds.forEach(teamId => {
        // Remove from current league
        nextLeagues[leagueId] = nextLeagues[leagueId].filter(id => id !== teamId);
        // Add to lower league
        if (!nextLeagues[targetRelegatedLeagueId].includes(teamId)) {
          nextLeagues[targetRelegatedLeagueId].push(teamId);
        }
        // Update team metadata
        if (nextTeams[teamId]) {
          const oldDiv = nextTeams[teamId].division;
          nextTeams[teamId] = {
            ...nextTeams[teamId],
            currentLeagueId: targetRelegatedLeagueId,
            division: oldDiv + 1,
            previousDivision: oldDiv,
            isNewlyPromoted: false,
            isNewlyRelegated: true,
          };
        }
      });
    }
  });

  return {
    ...worldState,
    leagues: nextLeagues,
    teams: nextTeams,
    lastUpdated: Date.now(),
  };
}

/**
 * Transfers a player between two clubs in the universe state, updating contracts and balances.
 */
export function transferPlayerInWorld(
  worldState: WorldState,
  params: {
    playerId: string;
    buyingClubId: string;
    sellingClubId?: string;
    transferFee: number;
    salary: number;
    contractYears: number;
  }
): WorldState {
  const { playerId, buyingClubId, sellingClubId, transferFee, salary, contractYears } = params;

  if (!worldState || !worldState.players[playerId]) return worldState;

  const nextPlayers = { ...worldState.players };
  const nextTeams = { ...worldState.teams };

  const existingPlayer = nextPlayers[playerId];
  const targetLeagueId = nextTeams[buyingClubId]?.currentLeagueId || existingPlayer.currentLeagueId;

  // Update Player
  nextPlayers[playerId] = {
    ...existingPlayer,
    currentClubId: buyingClubId,
    currentLeagueId: targetLeagueId,
    salary,
    contractYears,
    contractDuration: contractYears,
    isListedForTransfer: false,
    fitness: 100,
  };

  // Debit Buying Club
  if (nextTeams[buyingClubId]) {
    nextTeams[buyingClubId] = {
      ...nextTeams[buyingClubId],
      budget: Math.max(0, (nextTeams[buyingClubId].budget || 0) - transferFee),
    };
  }

  // Credit Selling Club
  if (sellingClubId && nextTeams[sellingClubId]) {
    nextTeams[sellingClubId] = {
      ...nextTeams[sellingClubId],
      budget: (nextTeams[sellingClubId].budget || 0) + transferFee,
    };
  }

  return {
    ...worldState,
    teams: nextTeams,
    players: nextPlayers,
    lastUpdated: Date.now(),
  };
}

/**
 * Records newly won trophies for a club in the persistent world state.
 */
export function recordClubTrophiesInWorld(
  worldState: WorldState,
  clubId: string,
  newTrophies: { name: string; season: number; year?: string }[]
): WorldState {
  if (!worldState || !worldState.teams || !worldState.teams[clubId] || !newTrophies || newTrophies.length === 0) {
    return worldState;
  }
  const existingTeam = worldState.teams[clubId];
  const existingTrophies = existingTeam.trophies || [];
  const updatedTrophies = [...existingTrophies];

  newTrophies.forEach(t => {
    const alreadyExists = updatedTrophies.some(et => et.name === t.name && et.season === t.season);
    if (!alreadyExists) {
      updatedTrophies.push(t);
    }
  });

  return {
    ...worldState,
    teams: {
      ...worldState.teams,
      [clubId]: {
        ...existingTeam,
        trophies: updatedTrophies,
      },
    },
    lastUpdated: Date.now(),
  };
}

