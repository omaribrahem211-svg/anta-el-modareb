import {
  Club,
  FormationType,
  PassingStyle,
  PressingIntensity,
  TacticalMentality,
  TacticalStyle,
  TeamTactics,
} from '../types/game';
import { LiveSimulationState } from './engine';

export type TacticalAlertSeverity = 'urgent' | 'warning' | 'info';
export type TacticalAlertCategory = 
  | 'trailing_score' 
  | 'midfield_overrun' 
  | 'defensive_siege' 
  | 'late_draw_push' 
  | 'stamina_crisis';

export interface TacticalAlert {
  id: string;
  category: TacticalAlertCategory;
  severity: TacticalAlertSeverity;
  title: string;
  badge: string;
  situation: string;
  problemAnalysis: string;
  statsHighlight: {
    label: string;
    value: string;
    isNegative: boolean;
  }[];
  suggestedFormation?: FormationType;
  suggestedMentality?: TacticalMentality;
  suggestedPressing?: PressingIntensity;
  suggestedPassingStyle?: PassingStyle;
  suggestedDefensiveLine?: 'high' | 'balanced' | 'deep';
  suggestedTeamWidth?: 'wide' | 'balanced' | 'narrow';
  suggestedTacticalStyle?: TacticalStyle;
  suggestedChangesList: {
    icon: string;
    title: string;
    description: string;
  }[];
  rationale: string;
  actionButtonText: string;
  dismissedUntilMinute?: number;
}

/**
 * Returns the estimated central midfielder count for a given formation
 */
export function getMidfielderCount(formation: FormationType): number {
  switch (formation) {
    case '3-5-2':
    case '4-5-1':
    case '4-1-4-1':
    case '3-4-1-2':
    case '3-4-2-1':
      return 5;
    case '4-2-3-1':
    case '4-1-2-1-2':
    case '4-1-3-2':
    case '3-3-3-1':
    case '4-3-2-1':
    case '4-4-2':
    case '4-2-2-2':
      return 4;
    case '4-3-3':
    case '5-3-2':
      return 3;
    case '3-4-3':
    case '5-2-3':
    default:
      return 2;
  }
}

/**
 * Translates tactical terms into clear Arabic descriptions
 */
export const TACTICAL_ARABIC_LABELS = {
  mentality: {
    ultra_defensive: 'دفاع حديدي (ركن الحافلة)',
    defensive: 'حذر دفاعي متوازن',
    balanced: 'متوازن',
    attacking: 'هجومي',
    ultra_attacking: 'هجوم كاسح شامل',
  } as Record<TacticalMentality, string>,
  pressing: {
    low: 'ضغط منخفض في مناطقنا',
    balanced: 'ضغط متوازن',
    high: 'ضغط عالي متقدم',
    gegenpress: 'ضغط عكسي فوري (Gegenpress) ⚡',
  } as Record<PressingIntensity, string>,
  passing: {
    short: 'تمريرات قصيرة هادئة',
    direct: 'تمريرات مباشرة سريعة',
    long_balls: 'كرات طولية للمهاجمين',
    tiki_taka_short: 'تيكي تاكا وتدوير الكرة',
    through_balls: 'بينيات في العمق',
  } as Record<PassingStyle, string>,
  defensiveLine: {
    deep: 'خط دفاع متأخر',
    balanced: 'خط دفاع متوازن',
    high: 'خط دفاع متقدم لمصيدة التسلل',
  },
};

/**
 * Evaluates the live match situation in real time and generates intelligent tactical alerts
 * when the score is unfavorable or the opponent is dominating the midfield.
 */
export function analyzeLiveMatchSituation(
  liveMatch: LiveSimulationState,
  userClub: Club,
  snoozedAlerts: Record<string, number> = {}
): TacticalAlert | null {
  if (!liveMatch || liveMatch.isFinished) return null;

  const currentMinute = liveMatch.currentMinute;
  const isUserHome = liveMatch.homeTeam?.id === userClub.id || liveMatch.userClubId === liveMatch.homeTeam?.id;
  
  const userScore = isUserHome ? liveMatch.homeScore : liveMatch.awayScore;
  const oppScore = isUserHome ? liveMatch.awayScore : liveMatch.homeScore;
  const userPossession = isUserHome ? liveMatch.stats.homePossession : liveMatch.stats.awayPossession;
  const oppPossession = isUserHome ? liveMatch.stats.awayPossession : liveMatch.stats.homePossession;
  const userShots = isUserHome ? liveMatch.stats.homeShots : liveMatch.stats.awayShots;
  const oppShots = isUserHome ? liveMatch.stats.awayShots : liveMatch.stats.homeShots;
  const userDangerous = isUserHome ? liveMatch.homeDangerousAttacks : liveMatch.awayDangerousAttacks;
  const oppDangerous = isUserHome ? liveMatch.awayDangerousAttacks : liveMatch.homeDangerousAttacks;
  const oppTeam = isUserHome ? liveMatch.awayTeam : liveMatch.homeTeam;
  const currentTactics = userClub.tactics;

  if (!currentTactics) return null;

  const userMidfielders = getMidfielderCount(currentTactics.formation);
  const oppMidfielders = getMidfielderCount(isUserHome ? liveMatch.awayTactics.formation : liveMatch.homeTactics.formation);

  // Check snooze expiration
  const isSnoozed = (key: string) => {
    const until = snoozedAlerts[key];
    return until !== undefined && currentMinute < until;
  };

  // ----------------------------------------------------
  // SCENARIO 1: Opponent Dominating Midfield (الخصم يسيطر على وسط الملعب)
  // ----------------------------------------------------
  const isMidfieldOverrun = 
    currentMinute >= 15 &&
    (oppPossession >= 56 || (oppPossession >= 53 && oppDangerous >= userDangerous + 3) || (oppMidfielders > userMidfielders && oppPossession >= 54));

  if (isMidfieldOverrun && !isSnoozed('midfield_overrun')) {
    // Determine the ideal counter formation with reinforced midfield
    let recommendedFormation: FormationType = '4-2-3-1';
    if (currentTactics.formation === '4-2-3-1') {
      recommendedFormation = '4-1-4-1';
    } else if (currentTactics.formation === '4-4-2' || currentTactics.formation === '4-2-4') {
      recommendedFormation = '4-2-3-1'; // adds central attacking midfielder and double pivot
    } else if (currentTactics.formation === '4-3-3') {
      recommendedFormation = '4-2-3-1';
    } else if (currentTactics.formation === '3-4-3' || currentTactics.formation === '5-2-3') {
      recommendedFormation = '3-5-2';
    }

    const recommendedMentality: TacticalMentality = userScore < oppScore ? 'attacking' : 'balanced';
    const recommendedPressing: PressingIntensity = currentTactics.pressingIntensity === 'gegenpress' ? 'gegenpress' : 'high';
    const recommendedPassing: PassingStyle = 'tiki_taka_short';

    // Verify if this recommendation is not already adopted
    const alreadyOptimal = 
      currentTactics.formation === recommendedFormation &&
      currentTactics.pressingIntensity === recommendedPressing;

    if (!alreadyOptimal) {
      return {
        id: 'midfield_overrun',
        category: 'midfield_overrun',
        severity: oppPossession >= 62 ? 'urgent' : 'warning',
        title: `🚨 الخصم يسيطر على وسط الملعب (${oppPossession}% استحواذ)`,
        badge: 'معركة الوسط مفقودة ⚠️',
        situation: `نادي (${oppTeam.name}) يفرض هيمنة واضحة على منطقة المناورات في دائرة السنتر، ويحرم فريقنا من تدوير الكرة وبناء اللعب.`,
        problemAnalysis: `الخصم يمتلك أفضلية واضحة في عمق الملعب بنسبة استحواذ (${oppPossession}%)، ومعدل قطع الكرات لدينا منخفض مما يرهق الدفاع بالهجمات المتكررة.`,
        statsHighlight: [
          { label: 'استحواذ الخصم', value: `${oppPossession}%`, isNegative: true },
          { label: 'استحواذ فريقك', value: `${userPossession}%`, isNegative: true },
          { label: 'هجمات الخصم الخطيرة', value: `${oppDangerous}`, isNegative: true },
        ],
        suggestedFormation: recommendedFormation,
        suggestedMentality: recommendedMentality,
        suggestedPressing: recommendedPressing,
        suggestedPassingStyle: recommendedPassing,
        suggestedDefensiveLine: 'balanced',
        suggestedTacticalStyle: 'tiki_taka',
        suggestedChangesList: [
          {
            icon: 'Users',
            title: `تغيير التشكيل إلى (${recommendedFormation})`,
            description: `زيادة الكثافة العددية في خط الوسط بـ 5 لاعبين ومحورين دفاعيين لاستعادة زمام السيطرة.`,
          },
          {
            icon: 'Zap',
            title: `رفع حدة الضغط إلى (${TACTICAL_ARABIC_LABELS.pressing[recommendedPressing]})`,
            description: 'تضييق الخناق على حاملي الكرة في وسط المنافس لمنع التمرير المريح للأمام.',
          },
          {
            icon: 'Compass',
            title: `أسلوب التمرير: (${TACTICAL_ARABIC_LABELS.passing[recommendedPassing]})`,
            description: 'تقريب المسافات بين اللاعبين وتدوير الكرة لكسر وتيرة ضغط المنافس.',
          },
        ],
        rationale: `التحول إلى (${recommendedFormation}) مع رفع الضغط العالي سيعوض النقص العددي في المنتصف ويجبر لاعبي ${oppTeam.name} على ارتكاب أخطاء تحت الضغط.`,
        actionButtonText: `تطبيق خطة السيطرة على الوسط (${recommendedFormation}) فوراً ⚡`,
      };
    }
  }

  // ----------------------------------------------------
  // SCENARIO 2: Trailing in Score (النتيجة لا تسير في صالح الفريق)
  // ----------------------------------------------------
  const isTrailing = oppScore > userScore;
  const goalDeficit = oppScore - userScore;

  if (isTrailing && currentMinute >= 20 && !isSnoozed('trailing_score')) {
    // Sub-case A: Late Game Panic Trailing (Minutes 65 - 90)
    if (currentMinute >= 65) {
      let lateFormation: FormationType = '4-3-3';
      if (goalDeficit >= 2 || currentMinute >= 75) {
        lateFormation = '3-4-1-2'; // full attack with 2 strikers and playmaker
      } else if (currentTactics.formation === '4-3-3') {
        lateFormation = '4-1-3-2';
      }

      const alreadyUltraAttacking = 
        currentTactics.mentality === 'ultra_attacking' && 
        currentTactics.pressingIntensity === 'gegenpress';

      if (!alreadyUltraAttacking) {
        return {
          id: 'trailing_score',
          category: 'trailing_score',
          severity: 'urgent',
          title: `🔥 تأخر بالنتيجة (${userScore}-${oppScore}) في الدقيقة ${currentMinute}' - وقت الهجوم الكاسح!`,
          badge: 'خطر الهزيمة ⏳',
          situation: `الوقت ينفد بسرعة وفريقك متأخر بفارق ${goalDeficit > 1 ? `${goalDeficit} أهداف` : 'هدف'} أمام ${oppTeam.name}. يجب المجازفة الهجومية للعودة بالنتيجة.`,
          problemAnalysis: `الفريق بحاجة لكثافة هجومية قصوى داخل منطقة جزاء الخصم وسرعة إيصال الكرات للمهاجمين قبل صافرة النهاية.`,
          statsHighlight: [
            { label: 'النتيجة', value: `${userScore} : ${oppScore}`, isNegative: true },
            { label: 'الدقيقة الحالية', value: `${currentMinute}'`, isNegative: false },
            { label: 'فارق الأهداف', value: `-${goalDeficit}`, isNegative: true },
          ],
          suggestedFormation: lateFormation,
          suggestedMentality: 'ultra_attacking',
          suggestedPressing: 'gegenpress',
          suggestedPassingStyle: 'direct',
          suggestedDefensiveLine: 'high',
          suggestedTacticalStyle: 'gegenpress',
          suggestedChangesList: [
            {
              icon: 'Flame',
              title: `تغيير العقلية إلى (هجوم كاسح شامل)`,
              description: 'اندفاع كامل لجميع الخطوط وتقدم الأظهرة لمساندة الأجنحة داخل الصندوق.',
            },
            {
              icon: 'Users',
              title: `تشكيل هجومي صريح (${lateFormation})`,
              description: 'الدفع بثنائي هجومي وصانع لعب صريح لزيادة الكثافة العرضية.',
            },
            {
              icon: 'Zap',
              title: 'تفعيل الضغط العكسي (Gegenpress) فوراً',
              description: 'افتكاك الكرة فور فقدانها في مناطق الخصم ومنعهم من إضاعة الوقت.',
            },
          ],
          rationale: `المجازفة التكتيكية بالتحول إلى (${lateFormation}) مع الهجوم الكاسح ستجبر ${oppTeam.name} على التراجع لمنطقته وتخلق فرصاً محققة للتعويض.`,
          actionButtonText: `تفعيل الهجوم الكاسح (${lateFormation}) لإنقاذ اللقاء ⚡`,
        };
      }
    } 
    // Sub-case B: First Half / Mid-Game Trailing (Minutes 20 - 64)
    else {
      let midFormation: FormationType = '4-3-3';
      if (currentTactics.formation === '4-3-3') {
        midFormation = '4-2-3-1';
      } else if (currentTactics.formation === '5-3-2' || currentTactics.formation === '5-2-3') {
        midFormation = '4-3-3'; // take off a defender to chase the game
      }

      const alreadyAttacking = currentTactics.mentality === 'attacking' || currentTactics.mentality === 'ultra_attacking';

      if (!alreadyAttacking) {
        return {
          id: 'trailing_score',
          category: 'trailing_score',
          severity: 'warning',
          title: `⚠️ تأخر مبكر بالنتيجة (${userScore}-${oppScore}) أمام ${oppTeam.shortName}`,
          badge: 'تعديل خططي مطلوب ⚡',
          situation: `استقبلت شباكنا هدفاً والمباراة لا تسير في صالحنا. نحتاج لتعديل التشكيل والعقلية لفرض أسلوبنا قبل فوات الأوان.`,
          problemAnalysis: `الخصم يتقدم في النتيجة ويلعب براحة، بينما نعاني في صناعة الخطورة على مرماه (${userShots} تسديدات فقط).`,
          statsHighlight: [
            { label: 'النتيجة', value: `${userScore} : ${oppScore}`, isNegative: true },
            { label: 'تسديدات فريقك', value: `${userShots}`, isNegative: userShots < 3 },
            { label: 'تسديدات الخصم', value: `${oppShots}`, isNegative: oppShots > userShots },
          ],
          suggestedFormation: midFormation,
          suggestedMentality: 'attacking',
          suggestedPressing: 'high',
          suggestedPassingStyle: 'direct',
          suggestedDefensiveLine: 'balanced',
          suggestedTacticalStyle: 'wing_play',
          suggestedChangesList: [
            {
              icon: 'TrendingUp',
              title: 'تغيير العقلية إلى (هجومي)',
              description: 'رفع نسق التمرير والجرأة في التقدم لزيادة عدد المهاجمين.',
            },
            {
              icon: 'Users',
              title: `تعديل التشكيل إلى (${midFormation})`,
              description: 'فتح أطراف الملعب والاعتماد على الكرات العرضية السريعة.',
            },
            {
              icon: 'Zap',
              title: 'تطبيق ضغط عالي متقدم',
              description: 'إرباك مدافعي المنافس واستخلاص الكرات في مناطق متقدمة.',
            },
          ],
          rationale: `تعديل التشكيل إلى (${midFormation}) مع العقلية الهجومية سيمنح الفريق سرعة الخروج بالكرة والعودة السريعة في النتيجة.`,
          actionButtonText: `تطبيق الخطة الهجومية (${midFormation}) للعودة بالنتيجة ⚡`,
        };
      }
    }
  }

  // ----------------------------------------------------
  // SCENARIO 3: Late Draw in Crucial Game (تعادل متأخر ونحتاج الفوز)
  // ----------------------------------------------------
  const isLateDraw = userScore === oppScore && currentMinute >= 70;
  if (isLateDraw && !isSnoozed('late_draw_push')) {
    if (currentTactics.mentality !== 'attacking' && currentTactics.mentality !== 'ultra_attacking') {
      return {
        id: 'late_draw_push',
        category: 'late_draw_push',
        severity: 'info',
        title: `⏱️ التعادل قائم (${userScore}-${oppScore}) في الدقيقة ${currentMinute}' - خطوة نحو خطف الفوز!`,
        badge: 'فرصة حسم اللقاء 🎯',
        situation: `المباراة متوازنة وتدخل أمتارها الأخيرة. نقطة واحدة غير كافية، والفرصة مواتية لخطف النقاط الثلاث بهجوم مباغت.`,
        problemAnalysis: `دفاع ${oppTeam.name} بدأ يظهر عليه الإرهاق. بتكثيف الهجوم والضغط في آخر 20 دقيقة، يمكننا إحراز هدف الفوز القاتل.`,
        statsHighlight: [
          { label: 'النتيجة', value: `${userScore} : ${oppScore}`, isNegative: false },
          { label: 'الدقائق المتبقية', value: `${90 - currentMinute}'`, isNegative: false },
        ],
        suggestedFormation: currentTactics.formation === '4-3-3' ? '4-3-3' : '4-3-3',
        suggestedMentality: 'attacking',
        suggestedPressing: 'high',
        suggestedPassingStyle: 'through_balls',
        suggestedChangesList: [
          {
            icon: 'TrendingUp',
            title: 'التحول إلى العقلية الهجومية',
            description: 'زيادة عدد اللاعبين داخل منطقة جزاء الخصم عند الكرات المرتدة.',
          },
          {
            icon: 'Zap',
            title: 'رفع الضغط إلى العالي',
            description: 'إجبار دفاع المنافس المرهق على التشتيت العشوائي.',
          },
        ],
        rationale: 'المنافس يلعب بحذر لخطف نقطة التعادل، وزيادة الضغط ستجبرهم على ارتكاب هفوة دفاعية حاسمة.',
        actionButtonText: `تكثيف الهجوم لخطف هدف الفوز ⚽`,
      };
    }
  }

  // ----------------------------------------------------
  // SCENARIO 4: Under Heavy Siege While Leading (حماية التقدم تحت حصار هجومي)
  // ----------------------------------------------------
  const isLeadingUnderSiege = 
    userScore > oppScore &&
    currentMinute >= 75 &&
    (oppShots >= userShots + 3 || oppDangerous >= userDangerous + 4) &&
    (currentTactics.mentality === 'attacking' || currentTactics.mentality === 'ultra_attacking' || currentTactics.mentality === 'balanced');

  if (isLeadingUnderSiege && !isSnoozed('defensive_siege')) {
    const safeDefFormation: FormationType = '5-3-2';
    return {
      id: 'defensive_siege',
      category: 'defensive_siege',
      severity: 'warning',
      title: `🛡️ حماية التقدم (${userScore}-${oppScore}) - الخصم يرمي بكل ثقله الهجومي!`,
      badge: 'تأمين دفاعي مطلوب 🧱',
      situation: `أنت متقدم في النتيجة والدقائق الأخيرة حرجة! ${oppTeam.name} يشن حصاراً هجومياً مكثفاً ولديه (${oppShots}) تسديدة بحثاً عن التعادل.`,
      problemAnalysis: 'خطوطنا مفتوحة في الخلف والمنافس يستغل المساحات في ظهر الأظهرة لخلق خطورة بالغة.',
      statsHighlight: [
        { label: 'النتيجة', value: `${userScore} : ${oppScore}`, isNegative: false },
        { label: 'تسديدات الخصم', value: `${oppShots}`, isNegative: true },
        { label: 'الدقيقة الحالية', value: `${currentMinute}'`, isNegative: false },
      ],
      suggestedFormation: safeDefFormation,
      suggestedMentality: 'defensive',
      suggestedPressing: 'low',
      suggestedPassingStyle: 'direct',
      suggestedDefensiveLine: 'deep',
      suggestedTacticalStyle: 'park_the_bus',
      suggestedChangesList: [
        {
          icon: 'Shield',
          title: `تغيير التشكيل إلى (${safeDefFormation}) تكتل دفاعي`,
          description: 'إضافة مدافع ثالث في القلب وتضييق المساحات العرضية.',
        },
        {
          icon: 'Lock',
          title: 'ضبط العقلية على (حذر دفاعي)',
          description: 'سحب الخطوط وتأمين عمق منطقة الجزاء لحرمانهم من التسديد.',
        },
      ],
      rationale: `التحول إلى (${safeDefFormation}) سيمتص حماس ${oppTeam.name} وينهي المباراة بفوز ثمين وشباك نظيفة.`,
      actionButtonText: `تأمين الدفاع وإغلاق المساحات (${safeDefFormation}) 🛡️`,
    };
  }

  return null;
}

/**
 * Helper to check if a specific tactical alert is currently fully applied
 */
export function isTacticalAdviceApplied(alert: TacticalAlert, currentTactics?: TeamTactics): boolean {
  if (!currentTactics) return false;
  const formationMatches = !alert.suggestedFormation || currentTactics.formation === alert.suggestedFormation;
  const mentalityMatches = !alert.suggestedMentality || currentTactics.mentality === alert.suggestedMentality;
  const pressingMatches = !alert.suggestedPressing || currentTactics.pressingIntensity === alert.suggestedPressing;
  return formationMatches && mentalityMatches && pressingMatches;
}
