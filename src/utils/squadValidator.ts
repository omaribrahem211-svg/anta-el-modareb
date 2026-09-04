import { Club, Fixture, Player, PositionCategory, SquadValidationResult, TeamTactics } from '../types/game';

/**
 * Validates the starting XI for a club to ensure no injured, suspended, or missing players are in the lineup.
 */
export function validateSquadLineup(club: Club | null): SquadValidationResult {
  if (!club || !club.tactics) {
    return {
      isValid: true,
      invalidStarters: [],
      hasInjured: false,
      hasSuspended: false,
      hasMissing: false,
    };
  }

  const squad = Array.isArray(club.players) ? club.players : [];
  const starterIds = club.tactics.startingPlayerIds || [];
  const invalidStarters: { player: Player; reason: 'injured' | 'suspended' | 'missing'; description: string }[] = [];

  let hasInjured = false;
  let hasSuspended = false;
  let hasMissing = false;

  // Check each player in the starting XI
  starterIds.forEach((id, index) => {
    const player = squad.find(p => p.id === id);

    if (!player) {
      hasMissing = true;
      const dummyPlayer: Player = {
        id: id || `missing_${index}`,
        name: `مركز شاغر #${index + 1}`,
        position: 'CM',
        positionCategory: 'MID',
        overallRating: 50,
        potentialRating: 50,
        number: index + 1,
        age: 20,
        fitness: 0,
        morale: 50,
        form: 5,
        marketValue: 0,
        salary: 0,
        contractYears: 1,
        attributes: { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 },
        stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 6.0 },
      };
      invalidStarters.push({
        player: dummyPlayer,
        reason: 'missing',
        description: 'المركز شاغر أو اللاعب غير متواجد في القائمة',
      });
      return;
    }

    // Check Injury
    if (player.injury && player.injury.daysRemaining > 0) {
      hasInjured = true;
      invalidStarters.push({
        player,
        reason: 'injured',
        description: `🚑 مصاب (${player.injury.type || 'إصابة بدنية'}) - باقي ${player.injury.daysRemaining} أيام على التعافي`,
      });
    }
    // Check Suspension
    else if (player.isSuspended || (player.suspensionMatches && player.suspensionMatches > 0)) {
      hasSuspended = true;
      const matchesRemaining = player.suspensionMatches || 1;
      invalidStarters.push({
        player,
        reason: 'suspended',
        description: `🟥 موقوف (${player.suspensionReason || 'بطاقة حمراء / تراكم بطاقات'}) - إيقاف لمدة ${matchesRemaining} مباراة`,
      });
    }
  });

  // Check if lineup is incomplete (< 11 starters) while squad has enough players
  if (starterIds.length < 11 && squad.length >= 11) {
    hasMissing = true;
  }

  const isValid = invalidStarters.length === 0 && (squad.length < 11 || starterIds.length === 11);

  return {
    isValid,
    invalidStarters,
    hasInjured,
    hasSuspended,
    hasMissing,
  };
}

/**
 * Automatically repairs and optimizes a team's starting lineup by replacing
 * any injured, suspended, or missing players with the highest rated eligible candidates.
 */
export function autoFixSquadLineup(club: Club): {
  updatedStartingPlayerIds: string[];
  updatedBenchPlayerIds: string[];
  fixedCount: number;
  replacements: { outPlayerName: string; inPlayerName: string; reason: string }[];
} {
  const squad = Array.isArray(club.players) ? [...club.players] : [];
  if (squad.length === 0) {
    return {
      updatedStartingPlayerIds: [],
      updatedBenchPlayerIds: [],
      fixedCount: 0,
      replacements: [],
    };
  }

  const currentTactics = club.tactics || {
    formation: '4-3-3',
    mentality: 'balanced',
    passingStyle: 'short',
    pressingIntensity: 'balanced',
    tempo: 'balanced',
    startingPlayerIds: squad.slice(0, 11).map(p => p.id),
    benchPlayerIds: squad.slice(11, 18).map(p => p.id),
    captainId: squad[0]?.id || '',
    penaltyTakerId: squad[0]?.id || '',
    freeKickTakerId: squad[0]?.id || '',
    cornerTakerId: squad[0]?.id || '',
  };

  const isEligible = (p: Player) => {
    const isInjured = p.injury && p.injury.daysRemaining > 0;
    const isSusp = p.isSuspended || (p.suspensionMatches && p.suspensionMatches > 0);
    return !isInjured && !isSusp;
  };

  const currentStarters = [...currentTactics.startingPlayerIds];
  const newStarters: string[] = [];
  const replacements: { outPlayerName: string; inPlayerName: string; reason: string }[] = [];
  const usedPlayerIds = new Set<string>();

  // Pass 1: Keep valid starters
  currentStarters.forEach((id) => {
    const p = squad.find(player => player.id === id);
    if (p && isEligible(p) && !usedPlayerIds.has(p.id)) {
      newStarters.push(p.id);
      usedPlayerIds.add(p.id);
    }
  });

  // Pass 2: For slots that were invalid or missing, find best fit replacements
  currentStarters.forEach((id, index) => {
    const p = squad.find(player => player.id === id);
    const needsReplacement = !p || !isEligible(p);

    if (needsReplacement && newStarters.length < 11) {
      const targetCategory: PositionCategory = p?.positionCategory || (index === 0 ? 'GK' : index <= 4 ? 'DEF' : index <= 8 ? 'MID' : 'FWD');
      
      // Find eligible squad members not yet in starting XI
      const candidates = squad
        .filter(cand => !usedPlayerIds.has(cand.id) && isEligible(cand))
        .sort((a, b) => {
          // Category match boost
          const aMatch = a.positionCategory === targetCategory ? 50 : 0;
          const bMatch = b.positionCategory === targetCategory ? 50 : 0;
          // Rating + fitness weight
          const aScore = aMatch + a.overallRating + (a.fitness * 0.1);
          const bScore = bMatch + b.overallRating + (b.fitness * 0.1);
          return bScore - aScore;
        });

      if (candidates.length > 0) {
        const replacement = candidates[0];
        newStarters.push(replacement.id);
        usedPlayerIds.add(replacement.id);

        const reason = p?.injury?.daysRemaining ? 'تعويض إصابة' : p?.isSuspended ? 'تعويض إيقاف' : 'إكمال التشكيل';
        replacements.push({
          outPlayerName: p?.name || 'شاغر',
          inPlayerName: replacement.name,
          reason,
        });
      }
    }
  });

  // Pass 3: Fill up to 11 if squad has >= 11 players
  while (newStarters.length < 11 && newStarters.length < squad.length) {
    const nextBest = squad
      .filter(cand => !usedPlayerIds.has(cand.id) && isEligible(cand))
      .sort((a, b) => b.overallRating - a.overallRating)[0];

    if (!nextBest) break;
    newStarters.push(nextBest.id);
    usedPlayerIds.add(nextBest.id);
  }

  // Bench: Pick next 7 available players (or all remaining)
  const newBench = squad
    .filter(p => !usedPlayerIds.has(p.id))
    .sort((a, b) => {
      const aElig = isEligible(a) ? 20 : 0;
      const bElig = isEligible(b) ? 20 : 0;
      return (bElig + b.overallRating) - (aElig + a.overallRating);
    })
    .slice(0, 7)
    .map(p => p.id);

  return {
    updatedStartingPlayerIds: newStarters,
    updatedBenchPlayerIds: newBench,
    fixedCount: replacements.length,
    replacements,
  };
}
