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

  const squad = (Array.isArray(club.players) ? club.players : []).filter(Boolean);
  const starterIds = club.tactics.startingPlayerIds || [];
  const invalidStarters: { player: Player; reason: 'injured' | 'suspended' | 'missing'; description: string }[] = [];

  let hasInjured = false;
  let hasSuspended = false;
  let hasMissing = false;

  // Check each player in the starting XI
  starterIds.forEach((id, index) => {
    const player = squad.find(p => p && p.id === id);

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
    startingPlayerIds: squad.slice(0, 11).map(p => p?.id).filter(Boolean) as string[],
    benchPlayerIds: squad.slice(11, 18).map(p => p?.id).filter(Boolean) as string[],
    captainId: squad[0]?.id || '',
    penaltyTakerId: squad[0]?.id || '',
    freeKickTakerId: squad[0]?.id || '',
    cornerTakerId: squad[0]?.id || '',
  };

  const isEligible = (p: Player) => {
    if (!p) return false;
    const isInjured = p.injury && p.injury.daysRemaining > 0;
    const isSusp = p.isSuspended || (p.suspensionMatches && p.suspensionMatches > 0);
    return !isInjured && !isSusp;
  };

  const currentStarters = [...currentTactics.startingPlayerIds];
  const targetSlotsCount = Math.min(11, squad.length);
  const fixedStarters: (string | null)[] = new Array(targetSlotsCount).fill(null);
  const replacements: { outPlayerName: string; inPlayerName: string; reason: string }[] = [];
  const usedPlayerIds = new Set<string>();

  const getDefaultCategoryForSlot = (idx: number): PositionCategory => {
    if (idx === 0) return 'GK';
    if (idx <= 4) return 'DEF';
    if (idx <= 8) return 'MID';
    return 'FWD';
  };

  // Step 1: Retain valid, eligible starters at their EXACT slot indices!
  for (let i = 0; i < targetSlotsCount; i++) {
    const originalId = currentStarters[i];
    if (!originalId) continue;
    const player = squad.find(p => p && p.id === originalId);
    if (player && isEligible(player) && !usedPlayerIds.has(player.id)) {
      fixedStarters[i] = player.id;
      usedPlayerIds.add(player.id);
    }
  }

  // Step 2: For any slot that was injured/suspended/missing, replace ONLY that slot with best matching position candidate
  for (let i = 0; i < targetSlotsCount; i++) {
    if (fixedStarters[i] !== null) continue;

    const originalId = currentStarters[i];
    const originalPlayer = originalId ? squad.find(p => p && p.id === originalId) : null;
    const targetCategory: PositionCategory = originalPlayer?.positionCategory || getDefaultCategoryForSlot(i);

    const candidates = squad
      .filter(cand => cand && cand.id && !usedPlayerIds.has(cand.id) && isEligible(cand))
      .sort((a, b) => {
        const aCatMatch = a.positionCategory === targetCategory ? 100 : (targetCategory === 'GK' ? -100 : 0);
        const bCatMatch = b.positionCategory === targetCategory ? 100 : (targetCategory === 'GK' ? -100 : 0);
        const aScore = aCatMatch + a.overallRating + (a.fitness * 0.1);
        const bScore = bCatMatch + b.overallRating + (b.fitness * 0.1);
        return bScore - aScore;
      });

    if (candidates.length > 0) {
      const bestFit = candidates[0];
      fixedStarters[i] = bestFit.id;
      usedPlayerIds.add(bestFit.id);

      const reason = originalPlayer?.injury?.daysRemaining ? 'تعويض إصابة' : originalPlayer?.isSuspended ? 'تعويض إيقاف' : 'إكمال التشكيل';
      replacements.push({
        outPlayerName: originalPlayer?.name || `مركز #${i + 1}`,
        inPlayerName: bestFit.name,
        reason,
      });
    }
  }

  const newStarters = fixedStarters.filter(Boolean) as string[];

  // Bench: Maintain existing bench players if eligible and not promoted to starters, then backfill
  const newBench: string[] = [];
  const currentBench = currentTactics.benchPlayerIds || [];
  currentBench.forEach(bId => {
    if (!bId || usedPlayerIds.has(bId)) return;
    const bp = squad.find(p => p && p.id === bId);
    if (bp && isEligible(bp)) {
      newBench.push(bp.id);
      usedPlayerIds.add(bp.id);
    }
  });

  // Backfill remaining bench slots up to 7
  squad
    .filter(p => p && p.id && !usedPlayerIds.has(p.id))
    .sort((a, b) => {
      const aElig = isEligible(a) ? 20 : 0;
      const bElig = isEligible(b) ? 20 : 0;
      return (bElig + (b?.overallRating || 50)) - (aElig + (a?.overallRating || 50));
    })
    .forEach(p => {
      if (newBench.length < 7) {
        newBench.push(p.id);
        usedPlayerIds.add(p.id);
      }
    });

  return {
    updatedStartingPlayerIds: newStarters,
    updatedBenchPlayerIds: newBench,
    fixedCount: replacements.length,
    replacements,
  };
}
