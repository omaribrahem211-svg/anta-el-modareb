import { Club, LeagueDefinition, ManagerProfile } from '../types/game';

export interface ValidatedCareerState {
  manager: ManagerProfile;
  teams: Club[];
  userClub: Club;
  isUnemployed: boolean;
}

/**
 * Validates and enforces Single Source of Truth for manager career and employment status.
 * Resignation is disabled for stability. Ensures the manager is ALWAYS linked to a valid club.
 */
export function validateCareerState(
  rawManager: ManagerProfile,
  rawTeams: Club[],
  allLeagues?: Record<string, LeagueDefinition>
): ValidatedCareerState {
  const manager = { ...rawManager };
  const teams = (Array.isArray(rawTeams) ? rawTeams : []).filter(t => t && t.id).map(t => ({ ...t }));

  // 1. Resignation is disabled: manager is always employed
  manager.isUnemployed = false;
  manager.employmentStatus = 'employed';

  let matchedClubIndex = -1;

  // Try finding club by currentClubId
  if (manager.currentClubId) {
    matchedClubIndex = teams.findIndex(t => t && t.id === manager.currentClubId);
  }

  // If not found by currentClubId, check if any team in the active league has isUserClub: true
  if (matchedClubIndex === -1) {
    matchedClubIndex = teams.findIndex(t => t && t.isUserClub);
    if (matchedClubIndex !== -1 && teams[matchedClubIndex]?.id) {
      manager.currentClubId = teams[matchedClubIndex].id;
    }
  }

  // If still not matched, check if manager has managed clubs history and find by name
  if (matchedClubIndex === -1 && Array.isArray(manager.clubsManaged) && manager.clubsManaged.length > 0) {
    for (let i = manager.clubsManaged.length - 1; i >= 0; i--) {
      const prevName = manager.clubsManaged[i];
      const idx = teams.findIndex(t => t && (t.name === prevName || t.shortName === prevName));
      if (idx !== -1 && teams[idx]?.id) {
        matchedClubIndex = idx;
        manager.currentClubId = teams[idx].id;
        break;
      }
    }
  }

  // If still not matched, check allLeagues
  if (matchedClubIndex === -1 && allLeagues && manager.currentClubId) {
    for (const league of Object.values(allLeagues)) {
      const found = (league?.teams || []).find(t => t && t.id === manager.currentClubId);
      if (found && found.id) {
        const idx = teams.findIndex(t => t && t.id === found.id);
        if (idx !== -1) {
          matchedClubIndex = idx;
        }
        break;
      }
    }
  }

  // Fallback: If still not matched, default to the first team in the active league
  if (matchedClubIndex === -1 && teams.length > 0 && teams[0]?.id) {
    matchedClubIndex = 0;
    manager.currentClubId = teams[0].id;
  }

  // Update teams array so only the matched club is marked isUserClub: true
  const updatedTeams = teams.map((t, idx) => ({
    ...t,
    isUserClub: idx === matchedClubIndex && matchedClubIndex !== -1,
  }));

  const userClub = matchedClubIndex !== -1 ? updatedTeams[matchedClubIndex] : updatedTeams[0];

  if (userClub && userClub.id) {
    manager.currentClubId = userClub.id;
    if (userClub.name && !manager.clubsManaged?.includes(userClub.name)) {
      manager.clubsManaged = Array.from(new Set([...(manager.clubsManaged || []), userClub.name]));
    }
  }

  return {
    manager,
    teams: updatedTeams,
    userClub,
    isUnemployed: false,
  };
}

/**
 * Resigns the manager from their current club.
 * NOTE: Resignation is disabled for game stability. Returns the state preserved safely.
 */
export function resignManagerFromClub(
  manager: ManagerProfile,
  teams: Club[],
  _currentClubName?: string
): { manager: ManagerProfile; teams: Club[] } {
  return {
    manager: {
      ...manager,
      isUnemployed: false,
      employmentStatus: 'employed',
    },
    teams,
  };
}

/**
 * Appoints the manager to a new club.
 */
export function appointManagerToClub(
  manager: ManagerProfile,
  teams: Club[],
  targetClubId: string,
  targetClubName: string
): { manager: ManagerProfile; teams: Club[] } {
  const updatedManager: ManagerProfile = {
    ...manager,
    isUnemployed: false,
    employmentStatus: 'employed',
    currentClubId: targetClubId,
    clubsManaged: Array.from(new Set([...(manager.clubsManaged || []), targetClubName])),
    reputation: Math.min(100, Math.max(1, manager.reputation + 2)),
  };

  const updatedTeams = teams.map(t => ({
    ...t,
    isUserClub: t.id === targetClubId,
  }));

  return {
    manager: updatedManager,
    teams: updatedTeams,
  };
}

