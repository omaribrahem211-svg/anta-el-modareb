import { Club, Player, StaffMember, StaffRole } from '../types/game';
import { AVAILABLE_STAFF_CANDIDATES, getDefaultStaffForClub } from '../data/staffData';

export interface ClubStaffBonuses {
  tacticalSynergyBonus: number;      // e.g. 0.04 to 0.12 (extra win percentage & chance creation)
  staminaDrainReduction: number;    // e.g. 0.10 to 0.40 (reduces in-match fitness loss)
  restRecoveryBonus: number;        // e.g. 0.10 to 0.50 (faster fitness recovery on rest)
  benchMoraleProtection: number;    // e.g. 0.15 to 0.60 (reduces bench unhappiness)
  injuryRiskReduction: number;      // e.g. 0.15 to 0.70 (drastically reduces injury chance)
  tacticalScoutingAdvantage: number; // e.g. 0.02 to 0.10 (counter-tactic offensive boost)
  totalMonthlySalary: number;       // total monthly payroll for technical staff
}

export interface PreMatchStaffBriefing {
  assistantManagerName: string;
  assistantRating: number;
  tacticalAdvice: string;
  recommendedMentality: string;
  recommendedStyle: string;
  analystName: string;
  analystRating: number;
  opponentWeaknessAnalysis: string;
  opponentDangerousPlayer?: string;
  calculatedMatchAdvantagePct: number;
}

/**
 * Returns the club's active staff, initializing with defaults if missing
 */
export function getClubStaff(club?: Club | null): StaffMember[] {
  if (!club) return [];
  if (Array.isArray(club.staff) && club.staff.length > 0) {
    return club.staff;
  }
  return getDefaultStaffForClub(club);
}

/**
 * Computes the aggregated bonuses from all hired staff members
 */
export function getClubStaffBonuses(club?: Club | null): ClubStaffBonuses {
  const staff = getClubStaff(club);
  
  let tacticalSynergyBonus = 0.03;
  let staminaDrainReduction = 0.10;
  let restRecoveryBonus = 0.15;
  let benchMoraleProtection = 0.20;
  let injuryRiskReduction = 0.20;
  let tacticalScoutingAdvantage = 0.03;
  let totalMonthlySalary = 0;

  staff.forEach(member => {
    totalMonthlySalary += member.salaryMonthly || 0;
    const ratingMultiplier = member.rating / 5; // 0.2 to 1.0

    switch (member.role) {
      case 'assistant_manager':
        tacticalSynergyBonus = 0.03 + (0.09 * ratingMultiplier); // up to 12%
        break;
      case 'fitness_coach':
        staminaDrainReduction = 0.10 + (0.30 * ratingMultiplier); // up to 40%
        restRecoveryBonus = 0.15 + (0.35 * ratingMultiplier); // up to 50%
        break;
      case 'psychologist':
        benchMoraleProtection = 0.15 + (0.45 * ratingMultiplier); // up to 60%
        break;
      case 'medical_doctor':
        injuryRiskReduction = 0.20 + (0.50 * ratingMultiplier); // up to 70%
        break;
      case 'performance_analyst':
        tacticalScoutingAdvantage = 0.02 + (0.08 * ratingMultiplier); // up to 10%
        break;
    }
  });

  return {
    tacticalSynergyBonus,
    staminaDrainReduction,
    restRecoveryBonus,
    benchMoraleProtection,
    injuryRiskReduction,
    tacticalScoutingAdvantage,
    totalMonthlySalary,
  };
}

/**
 * Hires or replaces a staff member of the specified role
 */
export function hireStaffMember(club: Club, newMember: StaffMember): Club {
  const currentStaff = getClubStaff(club);
  // Remove existing member with the same role
  const updatedStaff = currentStaff.filter(m => m.role !== newMember.role);
  updatedStaff.push(newMember);

  return {
    ...club,
    staff: updatedStaff,
  };
}

/**
 * Terminates the contract of a staff member
 */
export function fireStaffMember(club: Club, role: StaffRole): Club {
  const currentStaff = getClubStaff(club);
  const updatedStaff = currentStaff.filter(m => m.role !== role);
  return {
    ...club,
    staff: updatedStaff,
  };
}

/**
 * Generates an intelligent pre-match staff briefing for the user before facing an opponent
 */
export function generatePreMatchStaffBriefing(
  userClub: Club,
  opponentClub: Club,
  userMentality?: string
): PreMatchStaffBriefing {
  const staff = getClubStaff(userClub);
  const assistant = staff.find(m => m.role === 'assistant_manager') || AVAILABLE_STAFF_CANDIDATES[0];
  const analyst = staff.find(m => m.role === 'performance_analyst') || AVAILABLE_STAFF_CANDIDATES[16];

  const bonuses = getClubStaffBonuses(userClub);

  // Analyze opponent formation & play style
  const oppFormation = opponentClub.tactics?.formation || '4-3-3';
  const oppMentality = opponentClub.tactics?.mentality || 'balanced';

  let tacticalAdvice = '';
  let recommendedMentality = 'balanced';
  let recommendedStyle = 'تمرير متوازن وسيطرة على وسط الملعب';

  if (oppFormation.includes('3-') || oppFormation.includes('5-')) {
    tacticalAdvice = `المنافس يلعب بـ ${oppFormation} ويعتمد على التكتل الدفاعي في العمق. نصيحتي هي توسيع رقعة اللعب عبر الأجنحة واستغلال العرضيات المتقنة لإجبار دفاعهم على التشتت.`;
    recommendedMentality = 'attacking';
    recommendedStyle = 'اللعب المفتوح عبر الأجنحة والكرات العرضية';
  } else if (oppMentality === 'attacking' || oppMentality === 'ultra_attacking') {
    tacticalAdvice = `المنافس يندفع للأمام بخطوط متقدمة وضغط شرس. أفضل طريقة لمعاقبتهم هي التراجع المحكم والاعتماد على الهجمات المرتدة السريعة خلف أظهرتهم!`;
    recommendedMentality = 'counter_attack';
    recommendedStyle = 'هجمات مرتدة خاطفة وكرات طولية سريعة';
  } else if (oppMentality === 'defensive' || oppMentality === 'ultra_defensive') {
    tacticalAdvice = `المنافس يركن الحافلة ويلعب بدفاع منخفض. يجب الصبر وتدوير الكرة بسرعة والتسديد من خارج المنطقة لإرغامهم على الخروج.`;
    recommendedMentality = 'attacking';
    recommendedStyle = 'الاستحواذ الإيجابي والتسديد من المسافات المتوسطة';
  } else {
    tacticalAdvice = `المنافس يعتمد على التوازن التكتيكي. إذا فرضنا سيطرتنا على خط الوسط وضغطنا بقوة في أول 20 دقيقة سنحسم اللقاء مبكراً.`;
    recommendedMentality = 'balanced';
    recommendedStyle = 'الضغط في وسط الملعب وسرعة استرجاع الكرة';
  }

  // Find opponent dangerous player (top rated attacker or overall)
  const oppPlayers = opponentClub.players || [];
  const topOpponent = [...oppPlayers].sort((a, b) => b.overallRating - a.overallRating)[0];
  const dangerousName = topOpponent ? `${topOpponent.name} (${topOpponent.position} - تقييم ${topOpponent.overallRating})` : undefined;

  let weaknessAnalysis = '';
  if (oppPlayers.some(p => p.positionCategory === 'DEF' && p.overallRating < 70)) {
    weaknessAnalysis = 'رصدت كاميرات التحليل بطئاً واضحاً في ارتداد قلبي دفاع الخصم عند الكرات السريعة، ننصح بالتمرير البيني للمهاجم الصريح.';
  } else if (oppPlayers.some(p => p.positionCategory === 'GK' && p.overallRating < 72)) {
    weaknessAnalysis = 'حارس مرمى المنافس لديه رد فعل بطيء في الكرات البعيدة والكرات الثانية، وجه اللاعبين للتسديد المباشر كلما لاحت الفرصة.';
  } else {
    weaknessAnalysis = 'المنافس يترك مساحات شاسعة بين خطي الوسط والدفاع عند التحول من الهجوم للدفاع، استغل هذه المساحة بصانع ألعابك.';
  }

  const calculatedMatchAdvantagePct = Math.round(
    (bonuses.tacticalSynergyBonus + bonuses.tacticalScoutingAdvantage) * 100
  );

  return {
    assistantManagerName: assistant.name,
    assistantRating: assistant.rating,
    tacticalAdvice,
    recommendedMentality,
    recommendedStyle,
    analystName: analyst.name,
    analystRating: analyst.rating,
    opponentWeaknessAnalysis: weaknessAnalysis,
    opponentDangerousPlayer: dangerousName,
    calculatedMatchAdvantagePct,
  };
}

export interface AutoSubMatchContext {
  minute?: number;
  userScore?: number;
  oppScore?: number;
  yellowCardedIds?: string[];
  isAi?: boolean;
}

/**
 * Intelligent In-Match Auto-Substitution Engine
 * Finds the most critical candidate for substitution (injury, severe fatigue, yellow card risk, or tactical need)
 * and picks the best available bench player matching the position, tactical context, and high energy.
 */
export function executeSmartAutoSub(
  pitchPlayers: Player[],
  benchPlayers: Player[],
  currentStaminas: Record<string, number> = {},
  availableSubsLeft: number = 5,
  matchContext?: AutoSubMatchContext
): { outPlayer: Player; inPlayer: Player; reason: string } | null {
  if (availableSubsLeft <= 0 || pitchPlayers.length === 0 || benchPlayers.length === 0) {
    return null;
  }

  const minute = matchContext?.minute || 65;
  const userScore = matchContext?.userScore ?? 0;
  const oppScore = matchContext?.oppScore ?? 0;
  const isTrailing = userScore < oppScore;
  const isLeading = userScore > oppScore;
  const yellowCardedIds = matchContext?.yellowCardedIds || [];

  // Valid bench replacements (not injured, not suspended, decent fitness)
  const validBench = benchPlayers.filter(p => 
    !p.injury && 
    !p.isInjured && 
    !p.isSuspended && 
    (currentStaminas[p.id] ?? p.fitness ?? 100) >= 55
  );

  if (validBench.length === 0) return null;

  // 1. Identify players on pitch needing substitution
  const candidates = pitchPlayers.map(player => {
    // Goalkeepers are NEVER subbed out unless injured!
    const isGK = player.positionCategory === 'GK';
    const isPlayerInjured = Boolean(player.injury || player.isInjured);

    if (isGK && !isPlayerInjured) {
      return { player, stamina: 100, needScore: -999, reason: '' };
    }

    const stamina = currentStaminas[player.id] ?? player.fitness ?? 100;
    let needScore = 0;
    let reason = '';

    if (isPlayerInjured) {
      needScore += 180;
      reason = 'إصابة عضلية طارئة وعدم قدرة على إكمال المباراة';
    } else if (stamina < 60) {
      needScore += 90;
      reason = 'هبوط حاد في طاقة اللياقة والسرعة البدنية';
    } else if (stamina < 75) {
      needScore += 60;
      reason = 'تراجع منسوب النشاط البدني وتفادي الإجهاد';
    } else if ((player.stats?.averageRating || 6.5) < 5.8) {
      needScore += 35;
      reason = 'تنشيط تكتيكي لرفع نسق وفاعلية الخط';
    }

    // Yellow card caution risk for Defenders / Midfielders
    if (yellowCardedIds.includes(player.id) && (player.positionCategory === 'DEF' || player.positionCategory === 'MID')) {
      needScore += 40;
      if (!reason) reason = 'تبديل احترازي بعد نيل بطاقة صفراء تجنباً للطرد';
    }

    // Tactical context adjustments
    if (minute >= 70) {
      if (isTrailing) {
        // When trailing: We need goals! Don't sub out fresh attackers; sub out tired defenders/mids for attackers
        if (player.positionCategory === 'DEF' && stamina < 78) {
          needScore += 35;
          reason = 'تبديل هجومي شجاع لتكثيف الضغط وإدراك التعادل';
        } else if (player.positionCategory === 'FWD' && !isPlayerInjured && stamina >= 70) {
          needScore -= 40; // keep goal threats on pitch
        }
      } else if (isLeading && minute >= 75) {
        // When leading: Preserve the win! Sub out tired attackers for defensive stability
        if (player.positionCategory === 'FWD' && stamina < 78) {
          needScore += 35;
          reason = 'تبديل تكتيكي استراتيجي لتأمين التقدم وحماية النتيجة';
        }
      } else if (stamina < 75) {
        // Tied: Fresh legs to push for the winner
        needScore += 25;
        if (!reason) reason = 'ضخ دماء جديدة لكسر التعادل وحسم النقاط الثلاث';
      }
    }

    // High natural fatigue based on position (Wingers and Box-to-Box midfielders run the most)
    if (['LM', 'RM', 'LW', 'RW', 'CAM', 'CM'].includes(player.position) && minute >= 60) {
      needScore += 15;
    }

    return { player, stamina, needScore, reason };
  });

  // Sort descending by need
  candidates.sort((a, b) => b.needScore - a.needScore);

  // Minimum need score threshold
  const targetSubOut = candidates.find(c => c.needScore >= 35);
  if (!targetSubOut) return null;

  const outPlayer = targetSubOut.player;

  // 2. Score bench candidates to find the most suitable replacement
  const scoredBench = validBench.map(benchP => {
    // Goalkeepers only come on if the outgoing player is also a goalkeeper
    if (benchP.positionCategory === 'GK' && outPlayer.positionCategory !== 'GK') {
      return { player: benchP, score: -999 };
    }
    if (benchP.positionCategory !== 'GK' && outPlayer.positionCategory === 'GK') {
      return { player: benchP, score: -999 };
    }

    const stamina = currentStaminas[benchP.id] ?? benchP.fitness ?? 100;
    let score = (benchP.overallRating || 60) * 0.5 + stamina * 0.3;

    // Positional matching
    if (benchP.position === outPlayer.position) {
      score += 45; // Exact position match (e.g. ST for ST, CB for CB)
    } else if (benchP.positionCategory === outPlayer.positionCategory) {
      score += 28; // Same line (e.g. RW for LW, CAM for CM)
    } else if (isTrailing && minute >= 70 && outPlayer.positionCategory === 'DEF' && (benchP.positionCategory === 'FWD' || benchP.positionCategory === 'MID')) {
      // Tactical offensive sub: forward/midfielder coming on for a defender
      score += 35;
    } else if (isLeading && minute >= 75 && outPlayer.positionCategory === 'FWD' && (benchP.positionCategory === 'DEF' || benchP.positionCategory === 'MID')) {
      // Tactical defensive sub: defender/midfielder coming on for a forward
      score += 35;
    } else {
      score -= 30; // Unfavorable position shift
    }

    return { player: benchP, score };
  });

  scoredBench.sort((a, b) => b.score - a.score);

  const bestReplacement = scoredBench[0];
  if (!bestReplacement || bestReplacement.score < 0) return null;

  return {
    outPlayer,
    inPlayer: bestReplacement.player,
    reason: targetSubOut.reason || 'تنشيط تكتيكي لرفع أداء الفريق',
  };
}
