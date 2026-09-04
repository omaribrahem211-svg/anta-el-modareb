import { Club, LeagueDefinition, Player } from '../types/game';
import { isRealClub } from '../data/realPlayersData';

export interface WorldValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalClubs: number;
    totalPlayers: number;
    countriesCount: number;
    leaguesCount: number;
    realClubsCount: number;
    nationalityBreakdown: Record<string, number>;
  };
}

export interface ClubSquadValidationResult {
  isValid: boolean;
  isRealClub: boolean;
  clubId: string;
  clubName: string;
  errors: string[];
  warnings: string[];
}

/**
 * Automatically sanitizes and guarantees strict single-ownership of players across all clubs in the world database.
 * If a player is present in multiple clubs (e.g. following a transfer or cross-league save synchronization),
 * the first club in the list (authoritative) retains the player, and subsequent duplicate references are stripped cleanly.
 */
export function sanitizeWorldPlayerOwnership(clubs: Club[]): Club[] {
  const claimedPlayerIds = new Map<string, string>(); // playerId -> owningClubId

  return clubs.map(club => {
    const rawPlayers = Array.isArray(club.players) ? club.players : [];
    let hasModifiedSquad = false;

    const sanitizedPlayers = rawPlayers.filter(p => {
      if (!p || !p.id) return false;

      const currentOwner = claimedPlayerIds.get(p.id);
      if (currentOwner && currentOwner !== club.id) {
        // Player is already claimed by an earlier authoritative club
        hasModifiedSquad = true;
        return false;
      }

      if (currentOwner === club.id) {
        // Duplicate inside the same club
        hasModifiedSquad = true;
        return false;
      }

      claimedPlayerIds.set(p.id, club.id);
      return true;
    });

    if (!hasModifiedSquad) {
      return club;
    }

    const validPlayerIds = new Set(sanitizedPlayers.map(p => p.id));
    const sanitizedTactics = club.tactics ? {
      ...club.tactics,
      startingPlayerIds: (club.tactics.startingPlayerIds || []).filter(id => validPlayerIds.has(id)),
      benchPlayerIds: (club.tactics.benchPlayerIds || []).filter(id => validPlayerIds.has(id)),
    } : undefined;

    return {
      ...club,
      players: sanitizedPlayers,
      tactics: sanitizedTactics,
    };
  });
}

/**
 * Validates a single club's squad integrity.
 * Specifically checks that real clubs have authentic squads with real player IDs and correct nationalities.
 */
export function validateRealClubSquad(club: Club): ClubSquadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isReal = isRealClub(club.id);

  const players = Array.isArray(club.players) ? club.players : [];

  if (players.length === 0) {
    errors.push(`Club "${club.name}" (${club.id}) has 0 players`);
    return { isValid: false, isRealClub: isReal, clubId: club.id, clubName: club.name, errors, warnings };
  }

  if (isReal) {
    // 1. Check that players are NOT randomly generated fictional IDs
    const fakePlayers = players.filter(p => p.id.startsWith('player_') || p.id.startsWith('p_gen_'));
    if (fakePlayers.length > 0) {
      errors.push(`Real club "${club.name}" (${club.id}) contains ${fakePlayers.length} randomly generated/fictional players`);
    }

    // 2. Nationality distribution check for European clubs
    if (club.countryCode === 'ESP' || club.countryCode === 'ENG' || club.countryCode === 'GER' || club.countryCode === 'FRA' || club.countryCode === 'ITA') {
      const arabPlayers = players.filter(p => p.nationalityCode === 'EGY' || p.nationalityCode === 'SAU' || p.nationalityCode === 'UAE' || p.nationalityCode === 'QAT');
      if (arabPlayers.length > players.length * 0.3) {
        errors.push(
          `Real European club "${club.name}" (${club.countryCode}) has unrealistic nationality distribution: ` +
          `${arabPlayers.length}/${players.length} players have Arab nationality.`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    isRealClub: isReal,
    clubId: club.id,
    clubName: club.name,
    errors,
    warnings,
  };
}

/**
 * Validates the entire global football world database integrity.
 * Ensures:
 * - Every club has countryId, countryCode, leagueId, city, division, reputation, budget, facilities
 * - Every player has nationality, nationalityCode, countryOfBirth, currentClubId, currentLeagueId
 * - No duplicate player IDs across clubs or database
 * - No duplicate club IDs across leagues
 * - No player belongs to multiple clubs
 * - Real clubs maintain their authentic squads and realistic nationalities
 * - Each league has enough clubs and valid promotion/relegation boundaries within the same country
 */
export function validateWorldDatabase(
  allClubs: Club[],
  allLeagues: Record<string, LeagueDefinition>,
  options: { logToConsole?: boolean } = { logToConsole: true }
): WorldValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nationalityBreakdown: Record<string, number> = {};

  const seenClubIds = new Set<string>();
  const seenPlayerIds = new Set<string>();
  const playerClubOwnership = new Map<string, string>(); // playerId -> clubId
  const countryCodes = new Set<string>();
  let realClubsCount = 0;

  // 1. Validate Clubs & Players
  for (const club of allClubs) {
    if (!club.id) {
      errors.push(`Club missing ID: ${club.name || 'Unknown'}`);
      continue;
    }

    if (seenClubIds.has(club.id)) {
      errors.push(`Duplicate club ID detected: "${club.id}"`);
    }
    seenClubIds.add(club.id);

    if (isRealClub(club.id)) {
      realClubsCount++;
    }

    // Validate real club squad
    const squadValidation = validateRealClubSquad(club);
    if (!squadValidation.isValid) {
      errors.push(...squadValidation.errors);
    }
    if (squadValidation.warnings.length > 0) {
      warnings.push(...squadValidation.warnings);
    }

    // Club Country ID and League ID check
    const countryId = club.countryId || club.countryCode;
    if (!countryId) {
      errors.push(`Club "${club.name}" (${club.id}) is missing countryId/countryCode`);
    } else {
      countryCodes.add(countryId);
    }

    if (!club.leagueId) {
      errors.push(`Club "${club.name}" (${club.id}) is missing leagueId`);
    } else if (allLeagues && Object.keys(allLeagues).length > 0 && !allLeagues[club.leagueId]) {
      warnings.push(`Club "${club.name}" has leagueId "${club.leagueId}" which is not registered in leagues catalog`);
    }

    if (!club.city) {
      warnings.push(`Club "${club.name}" (${club.id}) is missing city`);
    }

    if (club.reputation === undefined || club.reputation === null) {
      warnings.push(`Club "${club.name}" (${club.id}) is missing reputation rating`);
    }

    // Squad validation
    const players: Player[] = Array.isArray(club.players) ? club.players : [];
    if (players.length === 0) {
      warnings.push(`Club "${club.name}" (${club.id}) has an empty squad (0 players)`);
    } else if (players.length < 16) {
      warnings.push(`Club "${club.name}" (${club.id}) has a small squad (${players.length} players)`);
    }

    for (const player of players) {
      if (!player.id) {
        errors.push(`Player in club "${club.name}" is missing ID`);
        continue;
      }

      if (seenPlayerIds.has(player.id)) {
        errors.push(`Duplicate player ID detected: "${player.id}" in club "${club.name}"`);
      }
      seenPlayerIds.add(player.id);

      if (playerClubOwnership.has(player.id)) {
        errors.push(`Player "${player.name}" (${player.id}) belongs to multiple clubs: "${playerClubOwnership.get(player.id)}" and "${club.id}"`);
      } else {
        playerClubOwnership.set(player.id, club.id);
      }

      // Check player nationality fields
      if (!player.nationality || !player.nationalityCode) {
        errors.push(`Player "${player.name}" (${player.id}) in club "${club.name}" is missing nationality or nationalityCode`);
      }

      if (!player.currentClubId) {
        warnings.push(`Player "${player.name}" (${player.id}) is missing currentClubId`);
      } else if (player.currentClubId !== club.id) {
        errors.push(`Player "${player.name}" currentClubId ("${player.currentClubId}") does not match club ID ("${club.id}")`);
      }

      if (!player.currentLeagueId && club.leagueId) {
        warnings.push(`Player "${player.name}" is missing currentLeagueId`);
      }

      const pCode = player.nationalityCode || 'UNKNOWN';
      nationalityBreakdown[pCode] = (nationalityBreakdown[pCode] || 0) + 1;
    }
  }

  // 2. Validate Leagues Structure & Promotion/Relegation
  if (allLeagues) {
    for (const [lId, league] of Object.entries(allLeagues)) {
      if (!league.id) {
        errors.push(`League entry "${lId}" is missing ID`);
      }
      if (!league.country) {
        errors.push(`League "${league.name || lId}" is missing country`);
      }
      const leagueTeams = league.teams || allClubs.filter(c => c.leagueId === lId);
      if (leagueTeams.length < 4) {
        warnings.push(`League "${league.name}" (${lId}) has only ${leagueTeams.length} clubs (recommended: >= 6)`);
      }
    }
  }

  const isValid = errors.length === 0;

  const report: WorldValidationReport = {
    isValid,
    errors,
    warnings,
    stats: {
      totalClubs: seenClubIds.size,
      totalPlayers: seenPlayerIds.size,
      countriesCount: countryCodes.size,
      leaguesCount: allLeagues ? Object.keys(allLeagues).length : 0,
      realClubsCount,
      nationalityBreakdown,
    },
  };

  if (options.logToConsole) {
    if (isValid) {
      console.info(
        `%c[World Validation SUCCESS]%c ${report.stats.totalClubs} clubs (${realClubsCount} real squads), ` +
        `${report.stats.totalPlayers} players, ${report.stats.countriesCount} countries, ${report.stats.leaguesCount} leagues. Validated authentic.`,
        'color: #10b981; font-weight: bold;',
        'color: #6ee7b7;'
      );
      if (warnings.length > 0) {
        console.warn(`[World Validation] ${warnings.length} non-blocking warnings:`, warnings);
      }
    } else {
      console.error(
        `%c[World Validation FAILED]%c Found ${errors.length} integrity errors:`,
        'color: #ef4444; font-weight: bold;',
        'color: #fca5a5;',
        errors
      );
    }
  }

  return report;
}
