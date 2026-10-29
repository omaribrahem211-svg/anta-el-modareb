import { Player, PlayerAttributes, CupTournament, Club } from '../types/game';
import { syncPlayerMarketValueWithRating } from './transferEngine';

export interface StageRewardInfo {
  stageKey: string;
  stageName: string;
  prizeMoney: number;
  developmentPoints: number;
  description: string;
}

export const CUP_STAGE_REWARDS: Record<string, { prizeMoney: number; developmentPoints: number; stageName: string }> = {
  round_of_32: {
    prizeMoney: 80000,
    developmentPoints: 5,
    stageName: 'دور الـ 32 من الكأس',
  },
  round_of_16: {
    prizeMoney: 180000,
    developmentPoints: 10,
    stageName: 'ثمن نهائي الكأس (دور الـ 16)',
  },
  quarter: {
    prizeMoney: 400000,
    developmentPoints: 15,
    stageName: 'ربع نهائي الكأس (دور الـ 8)',
  },
  semi: {
    prizeMoney: 850000,
    developmentPoints: 25,
    stageName: 'نصف نهائي الكأس (المربع الذهبي)',
  },
  runner_up: {
    prizeMoney: 1800000,
    developmentPoints: 35,
    stageName: 'وصيف الكأس الوطنية 🥈',
  },
  champion: {
    prizeMoney: 4000000,
    developmentPoints: 60,
    stageName: 'التتويج بلقب الكأس الوطنية 🏆',
  },
};

export const UPGRADE_COSTS = {
  ATTRIBUTE: 5,     // ترقية سمة محددة +1
  OVERALL: 15,      // معسكر تطوير شامل +1 للتقييم الإجمالي
  POTENTIAL: 10,    // رفع سقف إمكانات اللاعب الشاب +2
  RECOVERY: 3,      // استشفاء بدني متكامل 100% ومعنويات قصوى
};

/**
 * Checks if user club advanced to any cup stage or won the cup, and returns any unclaimed rewards.
 */
export function checkCupStageAdvancementRewards(
  cup: CupTournament,
  userClubId: string
): { updatedCup: CupTournament; newlyAwarded: StageRewardInfo[] } {
  if (!cup || !cup.matches || !userClubId) {
    return { updatedCup: cup, newlyAwarded: [] };
  }

  const claimed = new Set(cup.claimedRewardStages || []);
  const newlyAwarded: StageRewardInfo[] = [];

  const userMatches = cup.matches.filter(m => m.homeTeamId === userClubId || m.awayTeamId === userClubId);
  const finalMatch = cup.matches.find(m => m.stage === 'final');

  const isMatchWonByUser = (m: any): boolean => {
    if (!m || !m.isPlayed) return false;
    if (m.winnerTeamId === userClubId) return true;
    const isUserHome = m.homeTeamId === userClubId;
    const isUserAway = m.awayTeamId === userClubId;
    if (!isUserHome && !isUserAway) return false;

    const hs = m.homeScore ?? 0;
    const as = m.awayScore ?? 0;
    const hp = m.homePenalties;
    const ap = m.awayPenalties;

    if (hp !== undefined && ap !== undefined && hp !== ap) {
      return isUserHome ? hp > ap : ap > hp;
    }
    if (hs !== as) {
      return isUserHome ? hs > as : as > hs;
    }
    return false;
  };

  // Check 1: Champion
  const isChampion = (finalMatch && finalMatch.isPlayed && isMatchWonByUser(finalMatch)) || (cup.isCompleted && cup.winnerClubId === userClubId);

  if (isChampion && !claimed.has('champion')) {
    claimed.add('champion');
    // If champion, also make sure runner_up isn't claimed erroneously
    claimed.add('runner_up');
    const r = CUP_STAGE_REWARDS.champion;
    newlyAwarded.push({
      stageKey: 'champion',
      stageName: r.stageName,
      prizeMoney: r.prizeMoney,
      developmentPoints: r.developmentPoints,
      description: `مكافأة التتويج التاريخي بكأس البطولة: +${r.prizeMoney.toLocaleString()} ج.م و +${r.developmentPoints} نقاط تطوير لاعبين!`,
    });
  }

  // Check 2: Runner-up (played final and not champion)
  if (!isChampion && finalMatch && finalMatch.isPlayed && (finalMatch.homeTeamId === userClubId || finalMatch.awayTeamId === userClubId) && !claimed.has('runner_up')) {
    claimed.add('runner_up');
    const r = CUP_STAGE_REWARDS.runner_up;
    newlyAwarded.push({
      stageKey: 'runner_up',
      stageName: r.stageName,
      prizeMoney: r.prizeMoney,
      developmentPoints: r.developmentPoints,
      description: `مكافأة بلوغ المباراة النهائية (وصيف البطولة): +${r.prizeMoney.toLocaleString()} ج.م و +${r.developmentPoints} نقاط تطوير!`,
    });
  }

  // Check 3: Semi-finals reached (user has a semi match, or won a quarter match)
  const wonQuarter = userMatches.some(m => m.stage === 'quarter' && isMatchWonByUser(m));
  const hasSemiMatch = userMatches.some(m => m.stage === 'semi');

  if ((wonQuarter || hasSemiMatch) && !claimed.has('semi')) {
    claimed.add('semi');
    const r = CUP_STAGE_REWARDS.semi;
    newlyAwarded.push({
      stageKey: 'semi',
      stageName: r.stageName,
      prizeMoney: r.prizeMoney,
      developmentPoints: r.developmentPoints,
      description: `مكافأة التأهل للمربع الذهبي (نصف النهائي): +${r.prizeMoney.toLocaleString()} ج.م و +${r.developmentPoints} نقاط تطوير!`,
    });
  }

  // Check 4: Quarter-finals reached (user has a quarter match, or won round_of_16)
  const wonR16 = userMatches.some(m => m.stage === 'round_of_16' && isMatchWonByUser(m));
  const hasQuarterMatch = userMatches.some(m => m.stage === 'quarter');

  if ((wonR16 || hasQuarterMatch) && !claimed.has('quarter')) {
    claimed.add('quarter');
    const r = CUP_STAGE_REWARDS.quarter;
    newlyAwarded.push({
      stageKey: 'quarter',
      stageName: r.stageName,
      prizeMoney: r.prizeMoney,
      developmentPoints: r.developmentPoints,
      description: `مكافأة التأهل لربع نهائي الكأس: +${r.prizeMoney.toLocaleString()} ج.م و +${r.developmentPoints} نقاط تطوير!`,
    });
  }

  // Check 5: Round of 16 reached (user has a round_of_16 match, or won round_of_32)
  const wonR32 = userMatches.some(m => m.stage === 'round_of_32' && isMatchWonByUser(m));
  const hasR16Match = userMatches.some(m => m.stage === 'round_of_16');

  if ((wonR32 || hasR16Match) && !claimed.has('round_of_16')) {
    claimed.add('round_of_16');
    const r = CUP_STAGE_REWARDS.round_of_16;
    newlyAwarded.push({
      stageKey: 'round_of_16',
      stageName: r.stageName,
      prizeMoney: r.prizeMoney,
      developmentPoints: r.developmentPoints,
      description: `مكافأة التأهل لثمن نهائي الكأس (دور الـ 16): +${r.prizeMoney.toLocaleString()} ج.م و +${r.developmentPoints} نقاط تطوير!`,
    });
  }

  // Check 6: Round of 32 reached (won round_of_64, or started in round_of_32)
  const wonR64 = userMatches.some(m => m.stage === 'round_of_64' && isMatchWonByUser(m));
  const hasR32Match = userMatches.some(m => m.stage === 'round_of_32');

  if (wonR64 && !claimed.has('round_of_32')) {
    claimed.add('round_of_32');
    const r = CUP_STAGE_REWARDS.round_of_32;
    newlyAwarded.push({
      stageKey: 'round_of_32',
      stageName: r.stageName,
      prizeMoney: r.prizeMoney,
      developmentPoints: r.developmentPoints,
      description: `مكافأة التأهل لدور الـ 32 من الكأس: +${r.prizeMoney.toLocaleString()} ج.م و +${r.developmentPoints} نقاط تطوير!`,
    });
  }

  return {
    updatedCup: {
      ...cup,
      claimedRewardStages: Array.from(claimed),
    },
    newlyAwarded,
  };
}

/**
 * Upgrades a single player attribute (+1) using Development Points
 */
export function applyAttributeUpgrade(
  player: Player,
  attribute: keyof PlayerAttributes,
  availablePoints: number
): { updatedPlayer: Player; cost: number; success: boolean; message: string } {
  const cost = UPGRADE_COSTS.ATTRIBUTE;
  if (availablePoints < cost) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: `عفواً، تحتاج إلى ${cost} نقاط تطوير. رصيدك الحالي: ${availablePoints} نقطة.`,
    };
  }

  const currentValue = player.attributes[attribute] ?? 50;
  if (currentValue >= 99) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: 'وصلت هذه السمة إلى الحد الأقصى (99)!',
    };
  }

  const updatedAttrs = {
    ...player.attributes,
    [attribute]: currentValue + 1,
  };

  // Recalculate average to see if overall bumps
  const attrValues = [
    updatedAttrs.pace,
    updatedAttrs.shooting,
    updatedAttrs.passing,
    updatedAttrs.dribbling,
    updatedAttrs.defending,
    updatedAttrs.physical,
  ];
  if (updatedAttrs.goalkeeping) attrValues.push(updatedAttrs.goalkeeping);
  const avg = Math.round(attrValues.reduce((s, v) => s + v, 0) / attrValues.length);
  const newOverall = Math.max(player.overallRating, Math.min(99, avg));
  const newPotential = Math.max(player.potentialRating, newOverall);

  const previousOvr = player.overallRating;
  const tempPlayer: Player = {
    ...player,
    attributes: updatedAttrs,
    overallRating: newOverall,
    potentialRating: newPotential,
    trainingProgress: Math.min(100, (player.trainingProgress || 0) + 15),
    morale: Math.min(100, player.morale + 3),
  };

  // Even if overallRating didn't jump a full integer, attribute upgrade increases market value slightly (~4%)
  const syncedVal =
    newOverall > previousOvr
      ? syncPlayerMarketValueWithRating(tempPlayer, previousOvr)
      : Math.round(Math.max(syncPlayerMarketValueWithRating(tempPlayer, previousOvr), (player.marketValue || 50000) * 1.04) / 1000) * 1000;

  const updatedPlayer: Player = {
    ...tempPlayer,
    marketValue: syncedVal,
  };

  return {
    updatedPlayer,
    cost,
    success: true,
    message: `تمت ترقية سمة اللاعب بنجاح (+1)! القيمة السوقية الجديدة: ${syncedVal.toLocaleString()} ج.م (الرصيد المتبقي: ${availablePoints - cost} نقطة).`,
  };
}

/**
 * Comprehensive mastery boost (+1 Overall Rating & key stats)
 */
export function applyOverallBoost(
  player: Player,
  availablePoints: number
): { updatedPlayer: Player; cost: number; success: boolean; message: string } {
  const cost = UPGRADE_COSTS.OVERALL;
  if (availablePoints < cost) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: `تحتاج إلى ${cost} نقطة تطوير لمعسكر التطوير الشامل. رصيدك: ${availablePoints} نقطة.`,
    };
  }

  if (player.overallRating >= 99) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: 'اللاعب وصل بالفعل للتقييم الأسطوري الأقصى (99)!',
    };
  }

  const newOverall = player.overallRating + 1;
  const newPotential = Math.max(player.potentialRating, newOverall);

  // Boost key attributes based on position
  const isGK = player.position === 'GK';
  const updatedAttrs = { ...player.attributes };
  if (isGK) {
    updatedAttrs.goalkeeping = Math.min(99, (updatedAttrs.goalkeeping || 60) + 1);
    updatedAttrs.physical = Math.min(99, updatedAttrs.physical + 1);
  } else {
    updatedAttrs.pace = Math.min(99, updatedAttrs.pace + 1);
    updatedAttrs.physical = Math.min(99, updatedAttrs.physical + 1);
    if (['ST', 'CF', 'RW', 'LW'].includes(player.position)) {
      updatedAttrs.shooting = Math.min(99, updatedAttrs.shooting + 1);
    } else if (['CM', 'CAM', 'CDM', 'LM', 'RM'].includes(player.position)) {
      updatedAttrs.passing = Math.min(99, updatedAttrs.passing + 1);
    } else {
      updatedAttrs.defending = Math.min(99, updatedAttrs.defending + 1);
    }
  }

  const previousOvr = player.overallRating;
  const tempPlayer: Player = {
    ...player,
    overallRating: newOverall,
    potentialRating: newPotential,
    attributes: updatedAttrs,
    trainingProgress: 100,
    morale: 100,
    form: Math.min(10, player.form + 1),
  };
  const newMarketValue = syncPlayerMarketValueWithRating(tempPlayer, previousOvr);
  const updatedPlayer: Player = {
    ...tempPlayer,
    marketValue: newMarketValue,
  };

  return {
    updatedPlayer,
    cost,
    success: true,
    message: `🌟 إنجاز رائع! ارتفع المستوى العام لـ ${player.name} إلى (${newOverall}) وارتفع سعره السوقي إلى ${newMarketValue.toLocaleString()} ج.م!`,
  };
}

/**
 * Boosts player potential ceiling (+2 Potential)
 */
export function applyPotentialBoost(
  player: Player,
  availablePoints: number
): { updatedPlayer: Player; cost: number; success: boolean; message: string } {
  const cost = UPGRADE_COSTS.POTENTIAL;
  if (availablePoints < cost) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: `تحتاج إلى ${cost} نقاط تطوير لرفع سقف الإمكانات. رصيدك: ${availablePoints} نقطة.`,
    };
  }

  if (player.potentialRating >= 99) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: 'سقف إمكانات اللاعب يبلغ الذروة العالمية القصوى (99)!',
    };
  }

  const newPotential = Math.min(99, player.potentialRating + 2);
  const tempPlayer: Player = {
    ...player,
    potentialRating: newPotential,
    morale: Math.min(100, player.morale + 10),
  };
  const newMarketValue = Math.max(
    Math.round(((player.marketValue || 50000) * 1.08) / 1000) * 1000,
    syncPlayerMarketValueWithRating(tempPlayer, player.overallRating)
  );
  const updatedPlayer: Player = {
    ...tempPlayer,
    marketValue: newMarketValue,
  };

  return {
    updatedPlayer,
    cost,
    success: true,
    message: `🚀 تم صقل موهبة ${player.name} ورفع سقف إمكاناته إلى (${newPotential}) وسعره السوقي إلى ${newMarketValue.toLocaleString()} ج.م!`,
  };
}

/**
 * Instant full physical & mental recovery (100% Fitness, 100% Morale, eliminates fatigue/injury)
 */
export function applyConditionRecovery(
  player: Player,
  availablePoints: number
): { updatedPlayer: Player; cost: number; success: boolean; message: string } {
  const cost = UPGRADE_COSTS.RECOVERY;
  if (availablePoints < cost) {
    return {
      updatedPlayer: player,
      cost: 0,
      success: false,
      message: `تحتاج إلى ${cost} نقاط تطوير لتفعيل برنامج الاستشفاء الطبي. رصيدك: ${availablePoints} نقطة.`,
    };
  }

  const updatedPlayer: Player = {
    ...player,
    fitness: 100,
    fatigue: 0,
    morale: 100,
    moraleStatus: 'ecstatic',
    isInjured: false,
    injury: null,
    injuryType: undefined,
    injuryWeeks: undefined,
    injuryMatches: undefined,
  };

  return {
    updatedPlayer,
    cost,
    success: true,
    message: `⚡ استعاد ${player.name} كامل لياقته (100%) وتعافى من أي إصابات ليصبح جاهزاً للمشاركة فوراً!`,
  };
}
