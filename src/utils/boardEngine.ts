import { BoardObjective, BoardSystem, Club, LeagueStanding } from '../types/game';

/**
 * Determines the club's target league position and objective description
 * based on league tier, club prestige/reputation, squad power ranking relative to the league,
 * and whether the club is newly promoted.
 */
export function getClubLeagueTarget(
  club: Club,
  tier: number = 1,
  totalTeams: number = 18,
  allLeagueTeams?: Club[],
  isNewlyPromoted?: boolean
): {
  targetPosition: number;
  targetPositionText: string;
  leagueTarget: string;
  cupTarget: string;
  importance: 'critical' | 'high' | 'medium';
} {
  const reputation = club.reputation || 50;
  const isPromoted = isNewlyPromoted ?? club.isNewlyPromoted ?? false;

  // Calculate club's relative power rank in this league (1 = strongest in league, e.g. Ahly)
  let powerRank = 1;
  if (allLeagueTeams && allLeagueTeams.length > 1) {
    const getScore = (c: Club) => {
      const rep = c.reputation || 50;
      let squadOvr = rep;
      if (c.players && c.players.length > 0) {
        const top11 = [...c.players].sort((a, b) => b.overallRating - a.overallRating).slice(0, 11);
        squadOvr = top11.reduce((sum, p) => sum + p.overallRating, 0) / top11.length;
      } else if (c.squadStrength) {
        squadOvr = (c.squadStrength.attack + c.squadStrength.midfield + c.squadStrength.defense) / 3;
      }
      return (rep * 0.7) + (squadOvr * 0.3);
    };

    const sortedTeams = [...allLeagueTeams].sort((a, b) => getScore(b) - getScore(a));
    const foundIdx = sortedTeams.findIndex(t => t.id === club.id);
    powerRank = foundIdx >= 0 ? foundIdx + 1 : Math.round(totalTeams / 2);
  } else {
    // Fallback relative estimate based on standard tier reputations
    if (tier === 1) {
      powerRank = reputation >= 92 ? 1 : reputation >= 85 ? 3 : reputation >= 76 ? 7 : reputation >= 72 ? 11 : 16;
    } else if (tier === 2) {
      powerRank = reputation >= 66 ? 1 : reputation >= 63 ? 4 : reputation >= 59 ? 8 : 14;
    } else if (tier === 3) {
      powerRank = reputation >= 38 ? 1 : reputation >= 36 ? 3 : 5;
    } else {
      powerRank = reputation >= 23 ? 1 : reputation >= 20 ? 3 : 6;
    }
  }

  // If newly promoted, objectives MUST reflect survival and establishing stability!
  if (isPromoted) {
    if (tier === 1) {
      const safePos = Math.max(12, totalTeams - 4);
      return {
        targetPosition: safePos,
        targetPositionText: `تفادي الهبوط وتثبيت الأقدام (المركز ${safePos} أو أعلى)`,
        leagueTarget: 'نادي صاعد حديثاً: ضمان البقاء في دوري الأضواء، تفادي شبح الهبوط، وتثبيت أقدام الفريق بين الكبار.',
        cupTarget: 'تقديم أداء مشرف ومحاولة تجاوز الأدوار التمهيدية الأولى',
        importance: 'critical',
      };
    } else if (tier === 2) {
      const safePos = Math.max(10, totalTeams - 5);
      return {
        targetPosition: safePos,
        targetPositionText: `تثبيت الأقدام وتفادي الهبوط (المركز ${safePos} أو أعلى)`,
        leagueTarget: 'نادي صاعد حديثاً: الاستقرار في دوري المحترفين والابتعاد عن مراكز الهبوط للدرجة الأدنى.',
        cupTarget: 'المشاركة المشرفة في تمهيدي الكأس',
        importance: 'critical',
      };
    } else if (tier === 3) {
      const safePos = Math.max(4, totalTeams - 2);
      return {
        targetPosition: safePos,
        targetPositionText: `تثبيت الأقدام في الدرجة الثالثة (المركز ${safePos} أو أعلى)`,
        leagueTarget: 'نادي صاعد حديثاً: تثبيت أقدام الفريق في الدرجة الثالثة وتفادي الهبوط مجدداً.',
        cupTarget: 'المشاركة في الأدوار التمهيدية الأولى',
        importance: 'critical',
      };
    }
  }

  // TIER 1: الدوري الممتاز / دوري الأضواء (18 نادياً)
  if (tier === 1) {
    // كبار الدوري المرشحون للقب (المركز 1 فقط للأهلي/ريال مدريد/مانشستر سيتي/الهلال)
    if (powerRank === 1 || (powerRank === 2 && reputation >= 90)) {
      return {
        targetPosition: 1,
        targetPositionText: 'المركز 1 (التتويج بلقب الدوري)',
        leagueTarget: 'التتويج بلقب الدوري الممتاز واعتلاء منصة التتويج والمنافسة على القمة دون أي تهاون.',
        cupTarget: 'حصد لقب كأس مصر وتحقيق الثنائية',
        importance: 'critical',
      };
    }
    // أندية المربع الذهبي والبطولات القارية (الزمالك، بيراميدز، المصري، إلخ)
    else if (powerRank <= 4 || reputation >= 80) {
      return {
        targetPosition: 4,
        targetPositionText: 'المربع الذهبي (المركز 4 أو أعلى)',
        leagueTarget: 'إنهاء الموسم في المربع الذهبي وحجز مقعد قاري في البطولات الإفريقية.',
        cupTarget: 'بلوغ الدور نصف النهائي أو المنافسة على اللقب',
        importance: 'critical',
      };
    }
    // أندية النصف الأول من الجدول (الاتحاد، سموحة، سيراميكا، زد، إنبي)
    else if (powerRank <= 8 || reputation >= 75) {
      return {
        targetPosition: 8,
        targetPositionText: 'النصف الأول من الجدول (المركز 8 أو أعلى)',
        leagueTarget: 'إنهاء الموسم في المنطقة الدافئة بالنصف الأول من جدول الترتيب وإحراج الكبار.',
        cupTarget: 'بلوغ الدور ربع النهائي في مسابقة الكأس',
        importance: 'high',
      };
    }
    // أندية وسط الترتيب الآمن (طلائع الجيش، البنك الأهلي، الإسماعيلي، الجونة، فاركو)
    else if (powerRank <= 13 || reputation >= 71) {
      return {
        targetPosition: 11,
        targetPositionText: 'المنطقة الآمنة بوسط الترتيب (المركز 11 أو أعلى)',
        leagueTarget: 'الابتعاد المبكر عن صراع الهبوط وتثبيت الفريق في وسط جدول الترتيب.',
        cupTarget: 'بلوغ دور الـ 16 في مسابقة الكأس',
        importance: 'high',
      };
    }
    // أندية تفادي الهبوط والبقاء في الدوري الممتاز
    else {
      const safePos = Math.max(12, totalTeams - 4);
      return {
        targetPosition: safePos,
        targetPositionText: `تفادي الهبوط (المركز ${safePos} أو أعلى)`,
        leagueTarget: 'ضمان البقاء في دوري الأضواء وتفادي مراكز الهبوط للدرجة الأدنى.',
        cupTarget: 'تقديم أداء مشرف وتجاوز الأدوار التمهيدية الأولى',
        importance: 'critical',
      };
    }
  }

  // TIER 2: دوري المحترفين / الدرجة الثانية
  else if (tier === 2) {
    if (powerRank <= 2 || reputation >= 67) {
      return {
        targetPosition: 1,
        targetPositionText: 'الصعود المباشر (المركز 1 أو 2)',
        leagueTarget: 'تصدر الترتيب وحسم بطاقة الصعود المباشر للدوري الممتاز مبكراً.',
        cupTarget: 'تخطي دور الـ 32 في مسابقة الكأس',
        importance: 'critical',
      };
    } else if (powerRank <= 5 || reputation >= 63) {
      return {
        targetPosition: 3,
        targetPositionText: 'المنافسة على الصعود (المركز 3 أو أعلى)',
        leagueTarget: 'المنافسة الشرسة على بطاقات الصعود للدوري الممتاز أو مقاعد الملحق.',
        cupTarget: 'الوصول لدور الـ 32 في الكأس',
        importance: 'high',
      };
    } else if (powerRank <= 11 || reputation >= 59) {
      return {
        targetPosition: 8,
        targetPositionText: 'وسط الترتيب المريح (المركز 8 أو أعلى)',
        leagueTarget: 'إنهاء الموسم في المنطقة الدافئة بوسط الترتيب وتطوير تشكيلة الفريق.',
        cupTarget: 'المشاركة في تمهيدي الكأس',
        importance: 'high',
      };
    } else {
      const safePos = Math.max(11, totalTeams - 5);
      return {
        targetPosition: safePos,
        targetPositionText: `تفادي الهبوط (المركز ${safePos} أو أعلى)`,
        leagueTarget: 'تثبيت أقدام الفريق وتفادي صراع الهبوط للدرجة الثالثة.',
        cupTarget: 'المشاركة في الأدوار التمهيدية الأولى',
        importance: 'critical',
      };
    }
  }

  // TIER 3: دوري الدرجة الثالثة
  else if (tier === 3) {
    if (powerRank <= 2 || reputation >= 38) {
      return {
        targetPosition: 1,
        targetPositionText: 'بطل المجموعة والصعود (المركز 1)',
        leagueTarget: 'تصدر المجموعة وتحقيق الصعود المباشر للدرجة الثانية (المحترفين).',
        cupTarget: 'بلوغ الأدوار التمهيدية المتقدمة',
        importance: 'critical',
      };
    } else if (powerRank <= Math.max(3, Math.round(totalTeams * 0.5)) || reputation >= 35) {
      const targetPos = Math.max(3, Math.round(totalTeams * 0.45));
      return {
        targetPosition: targetPos,
        targetPositionText: `النصف الأول من المجموعة (المركز ${targetPos} أو أعلى)`,
        leagueTarget: 'المنافسة في النصف الأول من المجموعة وتطوير عناصر الفريق.',
        cupTarget: 'الظهور المشرف في تمهيدي الكأس',
        importance: 'high',
      };
    } else {
      const safePos = Math.max(4, totalTeams - 2);
      return {
        targetPosition: safePos,
        targetPositionText: `البقاء في الدرجة الثالثة (المركز ${safePos} أو أعلى)`,
        leagueTarget: 'تثبيت أقدام الفريق وتفادي صراع الهبوط للدرجة الرابعة.',
        cupTarget: 'المشاركة في الأدوار التمهيدية الأولى',
        importance: 'critical',
      };
    }
  }

  // TIER 4: دوري الدرجة الرابعة / الهواة ومراكز الشباب
  else {
    if (powerRank <= 2 || reputation >= 23) {
      return {
        targetPosition: 1,
        targetPositionText: 'صدارة المجموعة والصعود (المركز 1)',
        leagueTarget: 'تصدر دوري الدرجة الرابعة وتحقيق الصعود المباشر للدرجة الثالثة.',
        cupTarget: 'المشاركة في تمهيدي الكأس',
        importance: 'critical',
      };
    } else if (powerRank <= 4 || reputation >= 20) {
      return {
        targetPosition: 3,
        targetPositionText: 'المنافسة في المربع الذهبي (المركز 3 أو أعلى)',
        leagueTarget: 'المنافسة على المراكز المتقدمة والاقتراب من بطاقات الصعود.',
        cupTarget: 'المشاركة في الأدوار التمهيدية الأولى',
        importance: 'high',
      };
    } else {
      return {
        targetPosition: 5,
        targetPositionText: 'بناء الفريق وأداء مشرف (المركز 5 أو أعلى)',
        leagueTarget: 'بناء هوية تنافسية للفريق وتطوير المواهب الشابة والظهور بمستوى مشرف.',
        cupTarget: 'المشاركة في الأدوار التمهيدية الأولى',
        importance: 'medium',
      };
    }
  }
}

/**
 * Generates initial Board Objectives based on active league tier, club reputation, league roster and specific league target.
 */
export function generateInitialBoardSystem(
  club: Club,
  tier: number = 1,
  totalTeams: number = 18,
  allLeagueTeams?: Club[],
  isNewlyPromoted?: boolean
): BoardSystem {
  const targetInfo = getClubLeagueTarget(club, tier, totalTeams, allLeagueTeams, isNewlyPromoted);
  const wageCap = club.wageBudgetMonthly || Math.round(club.budget * 0.15);

  const confidence = 82; // ثقة الإدارة الابتدائية
  const fanConfidence = 80; // ثقة ورضا الجمهور الابتدائية
  const overallConfidence = Math.round((confidence * 0.55) + (fanConfidence * 0.45));

  const objectives: BoardObjective[] = [
    {
      id: 'obj_league',
      title: 'هدف الدوري',
      category: 'league',
      targetDescription: `الوصول إلى ${targetInfo.targetPositionText} - ${targetInfo.leagueTarget}`,
      currentProgress: 'الموسم قيد الانطلاق، في انتظار بدء الجولات',
      isAchieved: false,
      importance: targetInfo.importance,
    },
    {
      id: 'obj_cup',
      title: 'هدف مسابقة الكأس',
      category: 'cup',
      targetDescription: targetInfo.cupTarget,
      currentProgress: 'البطولة جارية',
      isAchieved: false,
      importance: 'high',
    },
    {
      id: 'obj_finance',
      title: 'الانضباط المالي',
      category: 'finance',
      targetDescription: `عدم تجاوز فاتورة رواتب شهرياً ${wageCap.toLocaleString()} ج.م`,
      currentProgress: 'الميزانية مستقرة ومتحكم بها',
      isAchieved: false,
      importance: 'high',
    },
    {
      id: 'obj_youth',
      title: 'رعاية وتطوير المواهب',
      category: 'youth',
      targetDescription: 'الاعتماد على اللاعبين الشباب وإعطاؤهم دقائق لعب حقيقية',
      currentProgress: 'يتم مراقبة أداء الناشئين دورياً',
      isAchieved: false,
      importance: 'medium',
    },
  ];

  return {
    confidence,
    fanConfidence,
    overallConfidence,
    targetLeaguePosition: targetInfo.targetPosition,
    targetLeaguePositionText: targetInfo.targetPositionText,
    currentStandingPosition: 1,
    leagueTarget: targetInfo.leagueTarget,
    cupTarget: targetInfo.cupTarget,
    financialTarget: `عدم تجاوز فاتورة رواتب شهرياً ${wageCap.toLocaleString()} ج.م`,
    youthTarget: 'تطوير موهبتين واعدتين تحت سن 22 عاماً وإشراكهما في المباريات',
    wageCapMonthly: wageCap,
    status: 'secure',
    boardStatus: 'satisfied',
    fanStatus: 'satisfied',
    statusDescription: `مجلس الإدارة يثق في قدراتك لبلوغ ${targetInfo.targetPositionText}.`,
    fanStatusDescription: `الجماهير تقف خلف الفريق وتتطلع لتحقيق ${targetInfo.targetPositionText}.`,
    lastMatchFeedback: 'بداية الموسم الجديد: نتطلع لتحقيق الأهداف المنشودة.',
    objectives,
  };
}

export interface MatchEvaluationResult {
  updatedBoardSystem: BoardSystem;
  boardFeedback: string;
  fanFeedback: string;
  boardDelta: number;
  fanDelta: number;
}

/**
 * Dynamically evaluates Board Confidence and Fan Confidence after every single match,
 * strictly based on the Club's Target Position vs Actual Standing Position in the league table.
 */
export function evaluateMatchImpactOnConfidence(
  currentBoardSystem: BoardSystem,
  userClub: Club,
  standings: LeagueStanding[],
  match: {
    isUserHome: boolean;
    userScore: number;
    oppScore: number;
    oppClub: Club;
    round: number;
    totalRounds: number;
    isCupMatch?: boolean;
    userWonOnPenalties?: boolean;
    userLostOnPenalties?: boolean;
    homePenalties?: number;
    awayPenalties?: number;
  }
): MatchEvaluationResult {
  const targetPos = currentBoardSystem.targetLeaguePosition || 1;
  const currentRank = (userClub?.id ? (standings || []).findIndex(s => s && s.teamId === userClub.id) + 1 : 1) || 1;

  // Rank difference (positive means ahead of target, negative means trailing target)
  const rankMargin = targetPos - currentRank;

  const isCup = Boolean(match.isCupMatch);
  const userWonPenalties = Boolean(match.userWonOnPenalties);
  const userLostPenalties = Boolean(match.userLostOnPenalties);

  const isWin = isCup
    ? (userWonPenalties || match.userScore > match.oppScore)
    : match.userScore > match.oppScore;
  const isDraw = isCup
    ? false
    : match.userScore === match.oppScore;
  const isLoss = isCup
    ? (userLostPenalties || match.userScore < match.oppScore)
    : match.userScore < match.oppScore;
  const goalDiff = match.userScore - match.oppScore;

  const userRep = userClub.reputation || 50;
  const oppRep = match.oppClub.reputation || 50;
  const isUnderdogWin = isWin && oppRep >= userRep + 8;
  const isShockLoss = isLoss && userRep >= oppRep + 10;

  // 1. Calculate Board Confidence Delta
  let boardDelta = 0;
  if (isWin) {
    boardDelta += isCup ? 4 : 3;
    if (rankMargin >= 0) {
      boardDelta += 2; // On or ahead of target
    } else {
      boardDelta += 1; // Good step towards recovery
    }
    if (isUnderdogWin) boardDelta += 2;
  } else if (isDraw) {
    if (rankMargin > 0) {
      boardDelta += 1; // Cushion from high ranking
    } else if (rankMargin === 0) {
      boardDelta += 0;
    } else {
      boardDelta -= 1; // Dropping points when behind target
    }
    if (oppRep > userRep + 10) boardDelta += 1; // Respectable draw against superior opponent
  } else {
    // Loss
    boardDelta -= isCup ? 2 : 3;
    if (rankMargin < 0) {
      // Underperforming target + lost match
      boardDelta -= Math.min(4, Math.abs(rankMargin));
    } else if (rankMargin >= 2) {
      // Comfortably ahead of target cushions the blow
      boardDelta += 1;
    }
    if (isShockLoss) boardDelta -= 2;
  }

  // 2. Calculate Fan Confidence Delta
  let fanDelta = 0;
  if (isWin) {
    fanDelta += isCup ? 5 : 4;
    if (goalDiff >= 3) fanDelta += 3;
    else if (goalDiff >= 2) fanDelta += 1;
    if (isUnderdogWin) fanDelta += 4;
    if (rankMargin >= 0) fanDelta += 2;
  } else if (isDraw) {
    if (match.userScore >= 2) fanDelta += 1; // Exciting high-scoring draw
    if (rankMargin < 0) fanDelta -= 2;
    else fanDelta -= 1;
    if (oppRep > userRep + 10) fanDelta += 2;
  } else {
    // Loss
    fanDelta -= isCup ? 3 : 4;
    if (goalDiff <= -3) fanDelta -= 3;
    if (rankMargin < 0) fanDelta -= Math.min(5, Math.abs(rankMargin) + 1);
    else if (rankMargin >= 2) fanDelta += 1;
    if (isShockLoss) fanDelta -= 3;
  }

  // 3. Apply bounds (5% to 100%)
  const prevBoardConf = currentBoardSystem.confidence ?? 80;
  const prevFanConf = currentBoardSystem.fanConfidence ?? 80;

  const newBoardConfidence = Math.min(100, Math.max(5, prevBoardConf + boardDelta));
  const newFanConfidence = Math.min(100, Math.max(5, prevFanConf + fanDelta));
  const newOverallConfidence = Math.round((newBoardConfidence * 0.55) + (newFanConfidence * 0.45));

  // 4. Derive Statuses
  let boardStatus: 'very_satisfied' | 'satisfied' | 'under_review' | 'danger_zone';
  let legacyStatus: 'secure' | 'stable' | 'under_pressure' | 'critical';

  if (newBoardConfidence >= 80) {
    boardStatus = 'very_satisfied';
    legacyStatus = 'secure';
  } else if (newBoardConfidence >= 60) {
    boardStatus = 'satisfied';
    legacyStatus = 'stable';
  } else if (newBoardConfidence >= 38) {
    boardStatus = 'under_review';
    legacyStatus = 'under_pressure';
  } else {
    boardStatus = 'danger_zone';
    legacyStatus = 'critical';
  }

  let fanStatus: 'ecstatic' | 'satisfied' | 'discontent' | 'furious';
  if (newFanConfidence >= 80) {
    fanStatus = 'ecstatic';
  } else if (newFanConfidence >= 60) {
    fanStatus = 'satisfied';
  } else if (newFanConfidence >= 38) {
    fanStatus = 'discontent';
  } else {
    fanStatus = 'furious';
  }

  // 5. Generate Contextual Feedback
  let boardFeedback = '';
  let fanFeedback = '';

  if (isCup) {
    if (isWin) {
      if (userWonPenalties) {
        boardFeedback = `مجلس الإدارة: إشادة هائلة بحسم بطاقة التأهل بركلات الترجيح بعد ملحمة كروية، ومواصلة المشوار نحو الكأس!`;
        fanFeedback = `أفراح جنونية في المدرجات بعد الانتصار بركلات الترجيح والاقتراب خطوة إضافية من اللقب!`;
      } else {
        boardFeedback = `مجلس الإدارة: فوز رائع وتأهل مستحق إلى الدور القادم في مسابقة الكأس.`;
        fanFeedback = `هتافات تشجيعية واحتفالات صاخبة بالتأهل والمستوى المميز للفريق.`;
      }
    } else {
      if (userLostPenalties) {
        boardFeedback = `مجلس الإدارة: وداع مؤلم لمسابقة الكأس بركلات الترجيح، الإدارة تدعو للتركيز التام على مواجهات الدوري.`;
        fanFeedback = `حزن في المدرجات على ضياع فرصة الكأس بركلات الحظ، مع مساندة الفريق في مشوار الدوري.`;
      } else {
        boardFeedback = `مجلس الإدارة: خيبة أمل بعد توديع مسابقة الكأس، ومطالبة بتدارك الأخطاء في مباريات الدوري.`;
        fanFeedback = `استياء جماهيري من الإقصاء ومطالبة بالتعويض المباشر في الدوري.`;
      }
    }
  } else if (isWin) {
    if (rankMargin > 0) {
      boardFeedback = `إشادة من مجلس الإدارة: فوز رائع يبقينا في المركز (${currentRank}) متفوقين على الهدف المحدد (${currentBoardSystem.targetLeaguePositionText}).`;
      fanFeedback = `هتافات واحتفالات صاخبة في المدرجات! الجماهير سعيدة جداً بالنتيجة والموقع المتقدم في الجدول.`;
    } else if (rankMargin === 0) {
      boardFeedback = `مجلس الإدارة راضٍ: الفوز يحافظ على تواجد الفريق بالمركز المطلوب (${currentRank}) تماماً وفق الخطة.`;
      fanFeedback = `دعم جماهيري كبير وثقة متزايدة في قدرة الجهاز الفني على تحقيق طموحات الموسم.`;
    } else {
      boardFeedback = `مجلس الإدارة: فوز هام وثمين يساعدنا على تقليص الفارق والاقتراب من المركز المستهدف (${currentBoardSystem.targetLeaguePositionText}) حيث نحتل حالياً المركز (${currentRank}).`;
      fanFeedback = `تنفس الصعداء في المدرجات؛ الجماهير تأمل أن تكون هذه بداية صحوة حقيقية للارتقاء في الترتيب.`;
    }
  } else if (isDraw) {
    if (rankMargin >= 0) {
      boardFeedback = `مجلس الإدارة: نقطة مقبولة تحافظ على مركزنا في جدول الترتيب (المركز ${currentRank} - الهدف: المركز ${targetPos}).`;
      fanFeedback = `الجماهير ترى التعادل مقبولاً مع ضرورة التركيز على حصد النقاط الثلاث في الجولة القادمة.`;
    } else {
      boardFeedback = `تنبيه من الإدارة: التعادل يعطل تقدمنا نحو الهدف المنشود (${currentBoardSystem.targetLeaguePositionText})، الفريق يتواجد بالمركز (${currentRank}) ونحتاج لانتصارات عاجلة.`;
      fanFeedback = `استياء نسبي من نزيف النقاط؛ الجماهير تطالب بشراسة هجومية أكبر.`;
    }
  } else {
    // Loss
    if (rankMargin > 2) {
      boardFeedback = `مجلس الإدارة: هزيمة مخيبة ولكن رصيدنا المتقدم بالمركز (${currentRank}) يمنحنا فرصة سريعة للتعويض (الهدف: المركز ${targetPos}).`;
      fanFeedback = `حزن جماهيري مع تمسك بالأمل بفضل التواجد في مراكز متقدمة بالجدول.`;
    } else if (rankMargin >= 0) {
      boardFeedback = `تحذير من الإدارة: الهزيمة تهدد مركزنا المستهدف (${currentBoardSystem.targetLeaguePositionText}). يجب تصحيح المسار فوراً.`;
      fanFeedback = `غضب جماهيري ومطالبة للاعبين بالقتال على كل كرة في المباريات القادمة.`;
    } else {
      boardFeedback = `تحذير شديد اللهجة من مجلس الإدارة: الفريق يتراجع إلى المركز (${currentRank}) وهو بعيد تماماً عن الهدف المطلوب (${currentBoardSystem.targetLeaguePositionText})! منصبك مهدد في حال استمرار النتائج السلبية.`;
      fanFeedback = `صافرات استهجان وغضب عارم في المدرجات؛ الجماهير تعبر عن خيبة أملها الشديدة وتطالب بتغيير جذري.`;
    }
  }

  // 6. Update Objectives Progress
  const updatedObjectives = currentBoardSystem.objectives.map(obj => {
    if (obj.category === 'league') {
      const isAhead = rankMargin >= 0;
      return {
        ...obj,
        currentProgress: `الفريق في المركز (${currentRank}) حالياً | ${isAhead ? '✅ متوافق مع الهدف' : '⚠️ متأخر عن الهدف'}`,
        isAchieved: isAhead,
      };
    }
    return obj;
  });

  const updatedBoardSystem: BoardSystem = {
    ...currentBoardSystem,
    confidence: newBoardConfidence,
    fanConfidence: newFanConfidence,
    overallConfidence: newOverallConfidence,
    currentStandingPosition: currentRank,
    status: legacyStatus,
    boardStatus,
    fanStatus,
    statusDescription: boardFeedback,
    fanStatusDescription: fanFeedback,
    lastMatchFeedback: `${boardFeedback} | ${fanFeedback}`,
    objectives: updatedObjectives,
  };

  return {
    updatedBoardSystem,
    boardFeedback,
    fanFeedback,
    boardDelta,
    fanDelta,
  };
}

/**
 * Updates Board & Fan metrics on daily calendar advancement based on standing positioning.
 */
export function updateDailyBoardConfidence(
  prev: BoardSystem | null | undefined,
  userClub: Club | undefined,
  standings: LeagueStanding[]
): BoardSystem {
  if (!prev || typeof prev !== 'object') {
    return generateInitialBoardSystem(userClub, 1, 18, [], false);
  }

  const currentPos = (userClub?.id ? (standings || []).findIndex(s => s && s.teamId === userClub.id) + 1 : 1) || 1;
  const targetPos = prev.targetLeaguePosition || 1;
  const margin = targetPos - currentPos;

  let delta = 0;
  if (margin >= 2) delta = 0.2;
  else if (margin < -3) delta = -0.3;

  const newConf = Math.min(100, Math.max(5, Math.round((prev.confidence ?? 80) + delta)));
  const newFan = Math.min(100, Math.max(5, Math.round((prev.fanConfidence ?? 80) + delta)));
  const overall = Math.round((newConf * 0.55) + (newFan * 0.45));

  let boardStatus: 'very_satisfied' | 'satisfied' | 'under_review' | 'danger_zone' = 'satisfied';
  if (newConf >= 80) boardStatus = 'very_satisfied';
  else if (newConf >= 60) boardStatus = 'satisfied';
  else if (newConf >= 38) boardStatus = 'under_review';
  else boardStatus = 'danger_zone';

  let fanStatus: 'ecstatic' | 'satisfied' | 'discontent' | 'furious' = 'satisfied';
  if (newFan >= 80) fanStatus = 'ecstatic';
  else if (newFan >= 60) fanStatus = 'satisfied';
  else if (newFan >= 38) fanStatus = 'discontent';
  else fanStatus = 'furious';

  return {
    ...prev,
    confidence: newConf,
    fanConfidence: newFan,
    overallConfidence: overall,
    currentStandingPosition: currentPos,
    boardStatus,
    fanStatus,
    status: newConf >= 80 ? 'secure' : newConf >= 60 ? 'stable' : newConf >= 38 ? 'under_pressure' : 'critical',
  };
}
