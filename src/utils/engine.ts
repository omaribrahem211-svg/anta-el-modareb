import { Club, Fixture, LeagueStanding, MatchEvent, MatchStats, Player, TeamTactics, ClubManager, ManagerProfile, ActiveTrainingBoost, TacticalMatchReport } from '../types/game';
import { AdManager } from '../services/adManager';
import { getClubStaffBonuses, executeSmartAutoSub } from './staffEngine';
import { MatchRevenueBreakdown } from './matchRevenue';
import { generateTacticalMatchReport, evaluateSquadTacticalSynergy } from './tacticalKnowledgeEngine';

// Egyptian football commentary phrases pool
const GOAL_COMMENTARIES = [
  'جوووووووووول! صاروخية مدوية في المقص اليمين تسكن الشباك!',
  'هدف رااااائع! رأسية لا تصد ولا ترد من ارتقاء خرافي!',
  'جون عالمي يا معلم! مرواغة ساحرة وتسديدة ببطن رجله على الهادي!',
  'جوووول! غلطة دفاعية فادحة واستغلال ذكي من القناص ليضع الكرة في المرمى الخالي!',
  'هدف ناري! انفرادة تامة وتسديدة قوية تخترق حارس المرمى!',
  'جووووول من ضربة جزاء متقنة على يسار الحارس اللي ارتمى يمين!',
  'يا عيني عليك يا فنان! وان تو سريع وإنهاء عالمي في الشباك!',
  'هدف من هجمة مرتدة نموذجية خاطفة في عمق الدفاع!',
];

const CHANCE_COMMENTARIES = [
  'يا نهار أبيض! القائم يتعاطف ويمنع هدف محقق وسط حسرة الجماهير!',
  'تسديدة قوية جداً لكن تمر بجوار القائم الأيمن بسنتيمترات قليلة!',
  'العارضة تهتز! تسديدة صاروخية من خارج منطقة الجزاء تصطدم بالعارضة!',
  'انفرادة خطيرة.. ولكن المهاجم يتسرع ويسدد فوق العارضة بكثير!',
  'عرضية متقنة بالمقاس.. ورأسية قريبة تخرج ضربة مرمى!',
  'دفاع فدائي يشتت الكرة من على خط المرمى في اللحظة الأخيرة!',
];

const SAVE_COMMENTARIES = [
  'الله عليك يا حارس يا بطل! تصدي إعجازي ينقذ الموقف ببراعة!',
  'حارس المرمى يطير في الهواء ويبعد الكرة إلى ركنية بلمسة أطراف الأصابع!',
  'خروج شجاع جداً من الحارس ويقطع الكرة من أمام قدم المهاجم!',
];

const FOUL_COMMENTARIES = [
  'تدخل قوي في وسط الملعب.. والحكم يشهر البطاقة الصفراء للاعب!',
  'شد من الفانلة لمنع هجمة مرتدة خطيرة.. وإنذار مستحق!',
  'اعتراض شديد على الحكم والمساعد.. والحكم يوجه تحذيراً شديد اللهجة!',
];

const RED_CARD_COMMENTARIES = [
  'كارت أحمر مباشر! تدخل عنيف بدون كرة وطرد للاعب وسط صدمة الجهاز الفني!',
  'الإنذار الثاني والطرد! يغادر الملعب مطروداً والفريق يكمل بعشرة لاعبين!',
];

const GENERAL_COMMENTARIES = [
  'ضغط قوي من الفريق في مناطق المنافس وبناء هجمة منظمة.',
  'المدرب يوجه تعليمات مشددة من على الخط للاعبي خط الوسط.',
  'تمريرات قصيرة هادئة واستحواذ محكم على الكرة في دائرة السنتر.',
  'هجمة مرتدة سريعة وانطلاقة ممتازة على الجناح.',
  'أجواء حماسية وصيحات الجماهير تهز أرجاء الملعب الشعبي!',
];

export interface LiveSimulationState {
  fixture: Fixture;
  homeTeam: Club;
  awayTeam: Club;
  currentMinute: number;
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  events: MatchEvent[];
  stats: MatchStats;
  isPlaying: boolean;
  isFinished: boolean;
  isHalfTime: boolean;
  speed: 1 | 2 | 4;
  substitutionsCount: number;
  userTacticsSnapshot?: TeamTactics;
  userClubId?: string;
  
  // Tactical live engine tracking
  homeLineup: string[]; // Active player IDs
  awayLineup: string[]; // Active player IDs
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
  homeXg: number;
  awayXg: number;
  homeDangerousAttacks: number;
  awayDangerousAttacks: number;
  homeYellowedPlayerIds: string[];
  awayYellowedPlayerIds: string[];
  homeReddedPlayerIds: string[];
  awayReddedPlayerIds: string[];
  homeFatigueMap: Record<string, number>; // remaining stamina (0-100)
  awayFatigueMap: Record<string, number>;
  aiSubstitutionsCount: number;
  autoSubsEnabled?: boolean;
  matchRevenue?: MatchRevenueBreakdown;
  tacticalMatchReport?: TacticalMatchReport;
}

export function calculateTeamStrength(
  team: Club, 
  tactics?: TeamTactics,
  customManager?: ClubManager | ManagerProfile,
  trainingBoost?: ActiveTrainingBoost | null
): { 
  attack: number; 
  midfield: number; 
  defense: number; 
  overall: number;
  squadStrength: number;
  managerRating: number;
  physical: number;
} {
  // 1. Determine Manager Rating
  let mgrRating = 65;
  if (customManager) {
    mgrRating = 'rating' in customManager ? customManager.rating : (customManager.managerRating || 65);
  } else if (team?.manager?.rating) {
    mgrRating = team.manager.rating;
  } else if (team?.reputation) {
    mgrRating = Math.max(50, Math.min(96, Math.round(team.reputation * 0.95)));
  }

  if (!team || !team.players || team.players.length === 0) {
    const base = team?.reputation ? team.reputation * 2 + 10 : 50;
    return { 
      attack: base, 
      midfield: base, 
      defense: base, 
      overall: Math.round(base * 0.75 + mgrRating * 0.25),
      squadStrength: base,
      managerRating: mgrRating,
      physical: base,
    };
  }

  const activeIds = tactics?.startingPlayerIds || (team.players || []).slice(0, 11).map(p => p.id);
  const startingPlayers = (team.players || []).filter(p => activeIds.includes(p.id));

  if (startingPlayers.length === 0) {
    const base = team?.reputation ? team.reputation * 2 + 10 : 50;
    return { 
      attack: base, 
      midfield: base, 
      defense: base, 
      overall: Math.round(base * 0.75 + mgrRating * 0.25),
      squadStrength: base,
      managerRating: mgrRating,
      physical: base,
    };
  }

  let atkSum = 0, atkCount = 0;
  let midSum = 0, midCount = 0;
  let defSum = 0, defCount = 0;
  let physSum = 0;
  let gkOverall = 50;
  let totalRatingSum = 0;
  let hasProperGk = false;

  const fitnessBoostMultiplier = trainingBoost?.type === 'fitness' ? 1.08 : 1.0;

  startingPlayers.forEach((p, idx) => {
    // Morale & fitness multiplier (0.75 to 1.1)
    const factor = (0.75 + ((p.fitness * fitnessBoostMultiplier) / 250) + (p.morale / 350));
    totalRatingSum += p.overallRating;

    const pPhys = p.attributes?.physical || 65;
    const pFit = (p.fitness || 90) * fitnessBoostMultiplier;
    physSum += (pPhys * 0.60 + pFit * 0.40) * factor;

    // Tactical Detail: Goalkeeper positioning
    // Slot 0 is designated for the GK in all formations
    if (idx === 0) {
      if (p.positionCategory === 'GK') {
        hasProperGk = true;
        gkOverall = ((p.attributes?.goalkeeping || p.overallRating) * 0.75 + pPhys * 0.25) * factor;
      } else {
        // Punish fielding an outfield player in goal!
        gkOverall = 28 * factor;
      }
    } else if (p.positionCategory === 'GK') {
      // Goalkeeper playing in an outfield position has poor contribution
      defSum += 25 * factor;
      defCount++;
    }

    if (p.positionCategory === 'FWD') {
      // Physicality gives strikers aerial presence and duel winning ability against physical CBs
      atkSum += (p.attributes.shooting * 0.45 + p.attributes.pace * 0.25 + p.attributes.dribbling * 0.15 + pPhys * 0.15) * factor;
      atkCount++;
    } else if (p.positionCategory === 'MID') {
      // Physicality is vital in midfield battles, tackles, second-ball recovery, and endurance
      midSum += (p.attributes.passing * 0.35 + p.attributes.defending * 0.20 + p.attributes.dribbling * 0.20 + pPhys * 0.25) * factor;
      midCount++;
    } else if (p.positionCategory === 'DEF') {
      // Physicality is fundamental for defenders in aerial headers, shielding, and shoulder challenges
      defSum += (p.attributes.defending * 0.50 + pPhys * 0.35 + p.attributes.pace * 0.15) * factor;
      defCount++;
    }
  });

  // If no proper GK found in entire starting XI, GK power collapses to 25
  if (!hasProperGk && startingPlayers.some(p => p.positionCategory === 'GK')) {
    const backupGk = startingPlayers.find(p => p.positionCategory === 'GK');
    if (backupGk) {
      gkOverall = ((backupGk.attributes?.goalkeeping || backupGk.overallRating) * 0.75 + (backupGk.attributes?.physical || 65) * 0.25) * 0.85;
    }
  }

  const rawSquadStrength = Math.round(totalRatingSum / Math.max(1, startingPlayers.length));
  
  // Tactical completeness penalty: Teams fielding < 11 players suffer proportional loss
  const completenessFactor = startingPlayers.length >= 11 ? 1.0 : Math.max(0.65, startingPlayers.length / 11);

  // Tactical Manager Influence Factor - Substantial impact on pitch organization and tactical execution
  let managerBoost = (mgrRating - 65) * 0.40;
  const staffBonuses = getClubStaffBonuses(team);
  if (staffBonuses.tacticalSynergyBonus > 0) {
    managerBoost += staffBonuses.tacticalSynergyBonus * 30; // Technical staff tactical bonus
  }
  if (trainingBoost?.type === 'tactical') {
    managerBoost += 4; // +5% tactical implementation efficiency
  }

  let attack = Math.max(30, Math.min(99, Math.round(((atkCount > 0 ? atkSum / atkCount : 50) + managerBoost) * completenessFactor)));
  let midfield = Math.max(30, Math.min(99, Math.round(((midCount > 0 ? midSum / midCount : 50) + managerBoost) * completenessFactor)));
  let defense = Math.max(30, Math.min(99, Math.round((((defCount > 0 ? defSum / defCount : 50) * 0.7 + gkOverall * 0.3) + managerBoost) * completenessFactor)));
  let physical = Math.max(30, Math.min(99, Math.round((physSum / Math.max(1, startingPlayers.length)) * completenessFactor)));
  
  if (trainingBoost?.type === 'attacking') {
    attack = Math.min(99, Math.round(attack * 1.06)); // +6% attacking efficiency
  }
  if (trainingBoost?.type === 'defensive') {
    defense = Math.min(99, Math.round(defense * 1.06)); // +6% defensive solidity
  }
  if (trainingBoost?.type === 'tactical') {
    midfield = Math.min(99, Math.round(midfield * 1.06)); // +6% tactical midfield dominance
  }

  // Overall is composed of 65% Player Quality (تشكيلة اللاعبين) + 35% Manager Rating (قوة وخبرة المدرب)
  const squadOverall = Math.round((attack + midfield + defense) / 3);
  const overall = Math.max(35, Math.min(99, Math.round(squadOverall * 0.65 + mgrRating * 0.35)));

  return { 
    attack, 
    midfield, 
    defense, 
    overall,
    squadStrength: rawSquadStrength,
    managerRating: mgrRating,
    physical,
  };
}

/**
 * Tactical Counter-Relationship & Matchup Matrix
 * Models realistic football dynamics: formation clashes, tactical styles, pressing traps, team width, defensive lines, and tempo
 */
export function calculateTacticalMatchup(
  homeTactics: TeamTactics,
  awayTactics: TeamTactics
): { 
  homeAttackMod: number; 
  homeDefenseMod: number; 
  homeMidfieldMod: number; 
  awayAttackMod: number; 
  awayDefenseMod: number; 
  awayMidfieldMod: number;
} {
  let homeAttackMod = 1.0;
  let homeDefenseMod = 1.0;
  let homeMidfieldMod = 1.0;
  let awayAttackMod = 1.0;
  let awayDefenseMod = 1.0;
  let awayMidfieldMod = 1.0;

  // 1. Mentality Impact (High-stakes risk vs reward - substantial tactical divergence)
  if (homeTactics.mentality === 'ultra_attacking') { homeAttackMod *= 1.32; homeDefenseMod *= 0.70; }
  else if (homeTactics.mentality === 'attacking') { homeAttackMod *= 1.18; homeDefenseMod *= 0.86; }
  else if (homeTactics.mentality === 'defensive') { homeAttackMod *= 0.82; homeDefenseMod *= 1.25; }
  else if (homeTactics.mentality === 'ultra_defensive') { homeAttackMod *= 0.64; homeDefenseMod *= 1.42; }

  if (awayTactics.mentality === 'ultra_attacking') { awayAttackMod *= 1.32; awayDefenseMod *= 0.70; }
  else if (awayTactics.mentality === 'attacking') { awayAttackMod *= 1.18; awayDefenseMod *= 0.86; }
  else if (awayTactics.mentality === 'defensive') { awayAttackMod *= 0.82; awayDefenseMod *= 1.25; }
  else if (awayTactics.mentality === 'ultra_defensive') { awayAttackMod *= 0.64; awayDefenseMod *= 1.42; }

  // 2. Pressing Intensity & Turnover Matrix
  const isHomeHighPress = homeTactics.pressingIntensity === 'high' || homeTactics.pressingIntensity === 'gegenpress';
  const isAwayHighPress = awayTactics.pressingIntensity === 'high' || awayTactics.pressingIntensity === 'gegenpress';

  if (isHomeHighPress) {
    homeMidfieldMod *= 1.20;
    // High pressing forces catastrophic turnovers against short passing, but gets bypassed by direct balls
    if (awayTactics.passingStyle === 'direct' || awayTactics.passingStyle === 'long_balls') {
      awayAttackMod *= 1.26; // Direct balls bypass the press
    } else if (awayTactics.passingStyle === 'short' || awayTactics.passingStyle === 'tiki_taka_short') {
      homeAttackMod *= 1.22; // High press causes defensive turnovers in opposition final third
    }
  } else if (homeTactics.pressingIntensity === 'low') {
    homeDefenseMod *= 1.16;
    homeMidfieldMod *= 0.88;
  }

  if (isAwayHighPress) {
    awayMidfieldMod *= 1.20;
    if (homeTactics.passingStyle === 'direct' || homeTactics.passingStyle === 'long_balls') {
      homeAttackMod *= 1.26;
    } else if (homeTactics.passingStyle === 'short' || homeTactics.passingStyle === 'tiki_taka_short') {
      awayAttackMod *= 1.22;
    }
  } else if (awayTactics.pressingIntensity === 'low') {
    awayDefenseMod *= 1.16;
    awayMidfieldMod *= 0.88;
  }

  // 3. Defensive Line Height
  const homeDefLine = (homeTactics as any).defensiveLine || 'balanced';
  const awayDefLine = (awayTactics as any).defensiveLine || 'balanced';

  if (homeDefLine === 'deep') {
    homeDefenseMod *= 1.20;
    homeMidfieldMod *= 0.88;
  } else if (homeDefLine === 'high') {
    homeMidfieldMod *= 1.16;
    if (awayTactics.passingStyle === 'direct' || awayTactics.passingStyle === 'long_balls' || awayTactics.tacticalStyle === 'counter_attack') {
      awayAttackMod *= 1.30; // Space behind high line vulnerable to counter
    }
  }

  if (awayDefLine === 'deep') {
    awayDefenseMod *= 1.20;
    awayMidfieldMod *= 0.88;
  } else if (awayDefLine === 'high') {
    awayMidfieldMod *= 1.16;
    if (homeTactics.passingStyle === 'direct' || homeTactics.passingStyle === 'long_balls' || homeTactics.tacticalStyle === 'counter_attack') {
      homeAttackMod *= 1.30;
    }
  }

  // 4. Team Width
  const homeWidth = (homeTactics as any).teamWidth || 'balanced';
  const awayWidth = (awayTactics as any).teamWidth || 'balanced';

  if (homeWidth === 'wide') {
    homeAttackMod *= 1.14;
  } else if (homeWidth === 'narrow') {
    homeDefenseMod *= 1.14;
  }

  if (awayWidth === 'wide') {
    awayAttackMod *= 1.14;
  } else if (awayWidth === 'narrow') {
    awayDefenseMod *= 1.14;
  }

  // 5. Tactical Styles (Counter-attack, Park the Bus, Tiki-Taka, Wing Play, Gegenpress, Direct Play)
  const homeStyle = homeTactics.tacticalStyle || (homeTactics as any).style || 'balanced';
  const awayStyle = awayTactics.tacticalStyle || (awayTactics as any).style || 'balanced';

  // Counter-attack / direct_counter: Decimates opponent when they push high or play attacking/ultra_attacking
  if (homeStyle === 'counter_attack' || homeStyle === 'direct_counter') {
    if (awayTactics.mentality === 'attacking' || awayTactics.mentality === 'ultra_attacking' || isAwayHighPress || awayDefLine === 'high') {
      homeAttackMod *= 1.38; // Deadly transition space behind opponent lines
    }
  }
  if (awayStyle === 'counter_attack' || awayStyle === 'direct_counter') {
    if (homeTactics.mentality === 'attacking' || homeTactics.mentality === 'ultra_attacking' || isHomeHighPress || homeDefLine === 'high') {
      awayAttackMod *= 1.38;
    }
  }

  // Park the bus / catenaccio: Impregnable low defensive block
  if (homeStyle === 'park_the_bus' || homeStyle === 'catenaccio') {
    homeDefenseMod *= 1.42;
    homeAttackMod *= 0.62;
  }
  if (awayStyle === 'park_the_bus' || awayStyle === 'catenaccio') {
    awayDefenseMod *= 1.42;
    awayAttackMod *= 0.62;
  }

  // Tiki-Taka / possession_control: Dominates midfield possession and rhythm
  if (homeStyle === 'tiki_taka' || homeStyle === 'possession_control') {
    homeMidfieldMod *= 1.28;
    if (awayStyle === 'park_the_bus' || awayStyle === 'catenaccio' || awayDefLine === 'deep') {
      homeAttackMod *= 0.82; // Dense box frustrates patient passing
    }
  }
  if (awayStyle === 'tiki_taka' || awayStyle === 'possession_control') {
    awayMidfieldMod *= 1.28;
    if (homeStyle === 'park_the_bus' || homeStyle === 'catenaccio' || homeDefLine === 'deep') {
      awayAttackMod *= 0.82;
    }
  }

  // Wing play: Attacks flanks, especially dangerous against narrow 3-CB or narrow diamond setups
  const hForm = homeTactics.formation || '4-3-3';
  const aForm = awayTactics.formation || '4-4-2';

  if (homeStyle === 'wing_play') {
    if (['3-5-2', '3-4-1-2', '4-1-2-1-2', '4-3-1-2', '5-3-2'].includes(aForm) || awayWidth === 'narrow') {
      homeAttackMod *= 1.25;
    }
  }
  if (awayStyle === 'wing_play') {
    if (['3-5-2', '3-4-1-2', '4-1-2-1-2', '4-3-1-2', '5-3-2'].includes(hForm) || homeWidth === 'narrow') {
      awayAttackMod *= 1.25;
    }
  }

  // Direct play / long_ball: Bypasses pressing
  if (homeStyle === 'direct_play' || homeStyle === 'long_ball') {
    if (isAwayHighPress) homeAttackMod *= 1.22;
  }
  if (awayStyle === 'direct_play' || awayStyle === 'long_ball') {
    if (isHomeHighPress) awayAttackMod *= 1.22;
  }

  // 6. Formation Matchups
  // 3-back systems vs Wide Formations (wingers exploit spaces behind wingbacks)
  const is3BackHome = ['3-5-2', '3-4-3', '3-4-2-1', '3-4-1-2', '3-3-3-1'].includes(hForm);
  const is3BackAway = ['3-5-2', '3-4-3', '3-4-2-1', '3-4-1-2', '3-3-3-1'].includes(aForm);
  const isWideHome = ['4-3-3', '3-4-3', '4-2-4', '5-2-3'].includes(hForm);
  const isWideAway = ['4-3-3', '3-4-3', '4-2-4', '5-2-3'].includes(aForm);

  if (isWideHome && is3BackAway) {
    homeAttackMod *= 1.24; // Wingers attack space behind wingbacks
  }
  if (isWideAway && is3BackHome) {
    awayAttackMod *= 1.24;
  }

  // 5-back systems (5-3-2, 5-4-1, 5-2-3) low block vs attacking systems
  const is5BackHome = ['5-3-2', '5-4-1', '5-2-3'].includes(hForm);
  const is5BackAway = ['5-3-2', '5-4-1', '5-2-3'].includes(aForm);

  if (is5BackHome) {
    homeDefenseMod *= 1.34;
    awayAttackMod *= 0.74;
  }
  if (is5BackAway) {
    awayDefenseMod *= 1.34;
    homeAttackMod *= 0.74;
  }

  // 3-man central midfield vs 2-man flat midfield (4-4-2, 4-2-4)
  const isMidfield3Home = ['4-3-3', '3-5-2', '4-2-3-1', '4-5-1', '4-1-4-1', '4-1-2-1-2'].includes(hForm);
  const isFlat2MidAway = ['4-4-2', '4-2-4'].includes(aForm);
  const isMidfield3Away = ['4-3-3', '3-5-2', '4-2-3-1', '4-5-1', '4-1-4-1', '4-1-2-1-2'].includes(aForm);
  const isFlat2MidHome = ['4-4-2', '4-2-4'].includes(hForm);

  if (isMidfield3Home && isFlat2MidAway) {
    homeMidfieldMod *= 1.24; // Midfield numeric overload
  }
  if (isMidfield3Away && isFlat2MidHome) {
    awayMidfieldMod *= 1.24;
  }

  // 4-1-4-1 / CDM anchor vs 4-2-3-1 CAM
  if (hForm === '4-1-4-1' && aForm === '4-2-3-1') {
    homeDefenseMod *= 1.18;
  }
  if (aForm === '4-1-4-1' && hForm === '4-2-3-1') {
    awayDefenseMod *= 1.18;
  }

  // 7. Match Tempo
  if (homeTactics.tempo === 'slow') {
    homeMidfieldMod *= 1.05; // Patient buildup
  } else if (homeTactics.tempo === 'fast') {
    homeAttackMod *= 1.06; // Urgent direct attacks
  }

  if (awayTactics.tempo === 'slow') {
    awayMidfieldMod *= 1.05;
  } else if (awayTactics.tempo === 'fast') {
    awayAttackMod *= 1.06;
  }

  // 8. Advanced Build-up Styles (Coaching License Deep Integration)
  const homeBuildUp = homeTactics.buildUpStyle;
  const awayBuildUp = awayTactics.buildUpStyle;

  if (homeBuildUp === 'from_back') {
    homeMidfieldMod *= 1.07;
    // Risky against intense pressing or pressing forward
    if (isAwayHighPress || awayTactics.strikerRole === 'pressing_forward') {
      awayAttackMod *= 1.09;
    }
    if (awayDefLine === 'deep' || awayTactics.defensiveBlock === 'low') {
      homeAttackMod *= 1.07; // Smoothly unlocks low blocks
    }
  } else if (homeBuildUp === 'direct_pivot') {
    if (isAwayHighPress) homeAttackMod *= 1.12; // Bypasses the press
    if (homeTactics.strikerRole === 'target_man') homeAttackMod *= 1.08;
    homeMidfieldMod *= 0.96;
  } else if (homeBuildUp === 'channel_balls') {
    homeAttackMod *= 1.08;
    if (awayTactics.fullbackRole === 'overlapping' || is3BackAway) {
      homeAttackMod *= 1.13; // Attacks space behind adventurous fullbacks/wingbacks
    }
  } else if (homeBuildUp === 'patient') {
    homeMidfieldMod *= 1.08;
    homeDefenseMod *= 1.06;
    homeAttackMod *= 0.97;
  }

  if (awayBuildUp === 'from_back') {
    awayMidfieldMod *= 1.07;
    if (isHomeHighPress || homeTactics.strikerRole === 'pressing_forward') {
      homeAttackMod *= 1.09;
    }
    if (homeDefLine === 'deep' || homeTactics.defensiveBlock === 'low') {
      awayAttackMod *= 1.07;
    }
  } else if (awayBuildUp === 'direct_pivot') {
    if (isHomeHighPress) awayAttackMod *= 1.12;
    if (awayTactics.strikerRole === 'target_man') awayAttackMod *= 1.08;
    awayMidfieldMod *= 0.96;
  } else if (awayBuildUp === 'channel_balls') {
    awayAttackMod *= 1.08;
    if (homeTactics.fullbackRole === 'overlapping' || is3BackHome) {
      awayAttackMod *= 1.13;
    }
  } else if (awayBuildUp === 'patient') {
    awayMidfieldMod *= 1.08;
    awayDefenseMod *= 1.06;
    awayAttackMod *= 0.97;
  }

  // 9. Pressing Traps
  const homeTrap = homeTactics.pressingTrap;
  const awayTrap = awayTactics.pressingTrap;

  if (homeTrap === 'trap_wings') {
    if (awayWidth === 'wide' || awayStyle === 'wing_play' || awayTactics.fullbackRole === 'overlapping') {
      homeDefenseMod *= 1.12;
      homeAttackMod *= 1.06; // Dispossession on flank triggers breakaway
    }
  } else if (homeTrap === 'trap_center') {
    if (awayStyle === 'tiki_taka' || awayStyle === 'possession_control' || awayTactics.strikerRole === 'false_9') {
      homeDefenseMod *= 1.12;
      homeMidfieldMod *= 1.08;
    }
  } else if (homeTrap === 'zonal_trap') {
    homeMidfieldMod *= 1.07;
    homeDefenseMod *= 1.05;
  }

  if (awayTrap === 'trap_wings') {
    if (homeWidth === 'wide' || homeStyle === 'wing_play' || homeTactics.fullbackRole === 'overlapping') {
      awayDefenseMod *= 1.12;
      awayAttackMod *= 1.06;
    }
  } else if (awayTrap === 'trap_center') {
    if (homeStyle === 'tiki_taka' || homeStyle === 'possession_control' || homeTactics.strikerRole === 'false_9') {
      awayDefenseMod *= 1.12;
      awayMidfieldMod *= 1.08;
    }
  } else if (awayTrap === 'zonal_trap') {
    awayMidfieldMod *= 1.07;
    awayDefenseMod *= 1.05;
  }

  // 10. Fullback Roles
  const homeFb = homeTactics.fullbackRole;
  const awayFb = awayTactics.fullbackRole;

  if (homeFb === 'overlapping') {
    homeAttackMod *= 1.09;
    if (awayStyle === 'counter_attack' || awayStyle === 'direct_counter' || awayBuildUp === 'channel_balls') {
      awayAttackMod *= 1.11;
      homeDefenseMod *= 0.93;
    }
  } else if (homeFb === 'inverted') {
    homeMidfieldMod *= 1.10;
    homeDefenseMod *= 1.04;
    homeAttackMod *= 0.96;
  } else if (homeFb === 'stay_back') {
    homeDefenseMod *= 1.10;
    awayAttackMod *= 0.93;
    homeAttackMod *= 0.94;
  }

  if (awayFb === 'overlapping') {
    awayAttackMod *= 1.09;
    if (homeStyle === 'counter_attack' || homeStyle === 'direct_counter' || homeBuildUp === 'channel_balls') {
      homeAttackMod *= 1.11;
      awayDefenseMod *= 0.93;
    }
  } else if (awayFb === 'inverted') {
    awayMidfieldMod *= 1.10;
    awayDefenseMod *= 1.04;
    awayAttackMod *= 0.96;
  } else if (awayFb === 'stay_back') {
    awayDefenseMod *= 1.10;
    homeAttackMod *= 0.93;
    awayAttackMod *= 0.94;
  }

  // 11. Striker Roles
  const homeSt = homeTactics.strikerRole;
  const awaySt = awayTactics.strikerRole;

  if (homeSt === 'false_9') {
    homeMidfieldMod *= 1.07;
    homeAttackMod *= 1.05;
  } else if (homeSt === 'target_man') {
    homeAttackMod *= 1.08;
    homeMidfieldMod *= 1.03;
  } else if (homeSt === 'poacher') {
    homeAttackMod *= 1.10;
    homeMidfieldMod *= 0.97;
  } else if (homeSt === 'advanced_forward') {
    homeAttackMod *= 1.09;
    if (awayDefLine === 'high') homeAttackMod *= 1.14;
  } else if (homeSt === 'pressing_forward') {
    homeDefenseMod *= 1.06;
    if (awayBuildUp === 'from_back') homeAttackMod *= 1.11;
  }

  if (awaySt === 'false_9') {
    awayMidfieldMod *= 1.07;
    awayAttackMod *= 1.05;
  } else if (awaySt === 'target_man') {
    awayAttackMod *= 1.08;
    awayMidfieldMod *= 1.03;
  } else if (awaySt === 'poacher') {
    awayAttackMod *= 1.10;
    awayMidfieldMod *= 0.97;
  } else if (awaySt === 'advanced_forward') {
    awayAttackMod *= 1.09;
    if (homeDefLine === 'high') awayAttackMod *= 1.14;
  } else if (awaySt === 'pressing_forward') {
    awayDefenseMod *= 1.06;
    if (homeBuildUp === 'from_back') awayAttackMod *= 1.11;
  }

  // 12. Defensive Block & Match State Presets
  if (homeTactics.defensiveBlock === 'low') {
    homeDefenseMod *= 1.15;
    homeAttackMod *= 0.88;
  } else if (homeTactics.defensiveBlock === 'high') {
    homeMidfieldMod *= 1.09;
    homeAttackMod *= 1.04;
  }

  if (awayTactics.defensiveBlock === 'low') {
    awayDefenseMod *= 1.15;
    awayAttackMod *= 0.88;
  } else if (awayTactics.defensiveBlock === 'high') {
    awayMidfieldMod *= 1.09;
    awayAttackMod *= 1.04;
  }

  if (homeTactics.matchStatePreset === 'protect_lead') {
    homeDefenseMod *= 1.14;
    homeAttackMod *= 0.86;
  } else if (homeTactics.matchStatePreset === 'chase_game') {
    homeAttackMod *= 1.18;
    homeDefenseMod *= 0.82;
  }

  if (awayTactics.matchStatePreset === 'protect_lead') {
    awayDefenseMod *= 1.14;
    awayAttackMod *= 0.86;
  } else if (awayTactics.matchStatePreset === 'chase_game') {
    awayAttackMod *= 1.18;
    awayDefenseMod *= 0.82;
  }

  // Bound modifiers within impactful yet athletic limits (allowing decisive tactical masterclasses)
  homeAttackMod = Math.max(0.45, Math.min(1.75, homeAttackMod));
  homeDefenseMod = Math.max(0.45, Math.min(1.75, homeDefenseMod));
  homeMidfieldMod = Math.max(0.45, Math.min(1.75, homeMidfieldMod));
  awayAttackMod = Math.max(0.45, Math.min(1.75, awayAttackMod));
  awayDefenseMod = Math.max(0.45, Math.min(1.75, awayDefenseMod));
  awayMidfieldMod = Math.max(0.45, Math.min(1.75, awayMidfieldMod));

  return {
    homeAttackMod: Number(homeAttackMod.toFixed(3)),
    homeDefenseMod: Number(homeDefenseMod.toFixed(3)),
    homeMidfieldMod: Number(homeMidfieldMod.toFixed(3)),
    awayAttackMod: Number(awayAttackMod.toFixed(3)),
    awayDefenseMod: Number(awayDefenseMod.toFixed(3)),
    awayMidfieldMod: Number(awayMidfieldMod.toFixed(3)),
  };
}

/**
 * Accurately models home ground advantage, stadium acoustics, fan support, and visitor intimidation.
 * Influenced by stadium tier, facility level, club reputation, match minute, and dynamic crowd momentum.
 */
export function calculateHomeCrowdAdvantage(
  homeTeam: Club,
  awayTeam: Club,
  homeScore: number,
  awayScore: number,
  minute: number,
  isAwayParked: boolean
): {
  homeAttackBonus: number;
  homeMidfieldBonus: number;
  homeDefenseBonus: number;
  awayIntimidationPenalty: number;
  staminaBuffer: number;
} {
  // 1. Stadium Level (1-5) and Facility Quality
  const stadiumLevel = homeTeam.facilities?.stadiumLevel || (homeTeam.facilities as any)?.stadium || 1;
  const capacity = homeTeam.facilities?.stadiumCapacity || 15000;
  const reputation = homeTeam.reputation || 50;

  // Base crowd presence scales with stadium capacity and club reputation
  const baseFacilityBoost = 1.04 + (stadiumLevel * 0.012) + (Math.min(70000, capacity) / 70000) * 0.02;
  const repBoost = (reputation / 100) * 0.02;

  let homeAttackBonus = baseFacilityBoost + repBoost;
  let homeMidfieldBonus = baseFacilityBoost * 0.98;
  let homeDefenseBonus = 1.03 + (stadiumLevel * 0.008);
  let awayIntimidationPenalty = 0.96 - (stadiumLevel * 0.008); // Visiting team shot accuracy/composure under whistle pressure
  let staminaBuffer = 0.04;

  const scoreDiff = homeScore - awayScore;

  // Dynamic In-Match Atmosphere & Crowd Momentum:
  if (scoreDiff > 0) {
    // Crowd is roaring with enthusiasm, lifting home player energy
    homeAttackBonus += 0.02;
    staminaBuffer += 0.04;
  } else if (scoreDiff === 0 && minute >= 60) {
    // High-tension match; fans chant loudly demanding a breakthrough
    homeAttackBonus += 0.03;
    homeMidfieldBonus += 0.02;
  } else if (scoreDiff <= -2) {
    // Away team has stunned the crowd; home advantage is largely neutralized
    homeAttackBonus = Math.max(1.01, homeAttackBonus - 0.07);
    homeMidfieldBonus = Math.max(1.01, homeMidfieldBonus - 0.05);
    awayIntimidationPenalty = 0.99; // Away team plays with calm confidence
  }

  // If visiting team is using a frustrating low-block (Park the bus) and keeping it scoreless late
  if (isAwayParked && homeScore === 0 && minute >= 65) {
    // Crowd groans and restlessness creates slight anxiety in home buildup
    homeMidfieldBonus -= 0.02;
  }

  return {
    homeAttackBonus: Number(homeAttackBonus.toFixed(3)),
    homeMidfieldBonus: Number(homeMidfieldBonus.toFixed(3)),
    homeDefenseBonus: Number(homeDefenseBonus.toFixed(3)),
    awayIntimidationPenalty: Number(awayIntimidationPenalty.toFixed(3)),
    staminaBuffer: Number(staminaBuffer.toFixed(3)),
  };
}

/**
 * Initializes a new Live Simulation State
 */
export function createInitialLiveMatchState(
  fixture: Fixture,
  homeTeam: Club,
  awayTeam: Club,
  userTactics?: TeamTactics,
  userClubId?: string
): LiveSimulationState {
  const homePlayers = Array.isArray(homeTeam?.players) ? homeTeam.players.filter(Boolean) : [];
  const awayPlayers = Array.isArray(awayTeam?.players) ? awayTeam.players.filter(Boolean) : [];

  const isHomeUser = Boolean(homeTeam?.isUserClub) || (Boolean(userClubId) && homeTeam?.id === userClubId);
  const isAwayUser = Boolean(awayTeam?.isUserClub) || (Boolean(userClubId) && awayTeam?.id === userClubId);

  const defaultHomeIds = (isHomeUser && userTactics)
    ? userTactics.startingPlayerIds
    : homeTeam?.tactics?.startingPlayerIds || homePlayers.slice(0, 11).map(p => p?.id).filter(Boolean);

  const defaultAwayIds = (isAwayUser && userTactics)
    ? userTactics.startingPlayerIds
    : awayTeam?.tactics?.startingPlayerIds || awayPlayers.slice(0, 11).map(p => p?.id).filter(Boolean);

  const defaultHomeTactics: TeamTactics = (isHomeUser && userTactics)
    ? userTactics
    : homeTeam?.tactics || {
        formation: '4-3-3',
        mentality: 'balanced',
        passingStyle: 'short',
        pressingIntensity: 'balanced',
        tempo: 'balanced',
        startingPlayerIds: defaultHomeIds,
        benchPlayerIds: homePlayers.slice(11, 18).map(p => p?.id).filter(Boolean),
        captainId: defaultHomeIds[0] || '',
        penaltyTakerId: defaultHomeIds[defaultHomeIds.length - 1] || '',
        freeKickTakerId: defaultHomeIds[0] || '',
        cornerTakerId: defaultHomeIds[1] || '',
      };

  const defaultAwayTactics: TeamTactics = (isAwayUser && userTactics)
    ? userTactics
    : awayTeam?.tactics || {
        formation: '4-4-2',
        mentality: 'balanced',
        passingStyle: 'short',
        pressingIntensity: 'balanced',
        tempo: 'balanced',
        startingPlayerIds: defaultAwayIds,
        benchPlayerIds: awayPlayers.slice(11, 18).map(p => p?.id).filter(Boolean),
        captainId: defaultAwayIds[0] || '',
        penaltyTakerId: defaultAwayIds[defaultAwayIds.length - 1] || '',
        freeKickTakerId: defaultAwayIds[0] || '',
        cornerTakerId: defaultAwayIds[1] || '',
      };

  const homeFatigue: Record<string, number> = {};
  homePlayers.forEach(p => { if (p?.id) homeFatigue[p.id] = p.fitness ?? 100; });

  const awayFatigue: Record<string, number> = {};
  awayPlayers.forEach(p => { if (p?.id) awayFatigue[p.id] = p.fitness ?? 100; });

  return {
    fixture,
    homeTeam,
    awayTeam,
    currentMinute: 0,
    homeScore: 0,
    awayScore: 0,
    events: [],
    stats: {
      homeShots: 0,
      awayShots: 0,
      homeShotsOnTarget: 0,
      awayShotsOnTarget: 0,
      homePossession: 50,
      awayPossession: 50,
      homeFouls: 0,
      awayFouls: 0,
      homeCorners: 0,
      awayCorners: 0,
      homeYellowCards: 0,
      awayYellowCards: 0,
      homeRedCards: 0,
      awayRedCards: 0,
    },
    isPlaying: true,
    isFinished: false,
    isHalfTime: false,
    speed: 1,
    substitutionsCount: 0,
    userTacticsSnapshot: userTactics,
    homeLineup: defaultHomeIds,
    awayLineup: defaultAwayIds,
    homeTactics: defaultHomeTactics,
    awayTactics: defaultAwayTactics,
    homeXg: 0,
    awayXg: 0,
    homeDangerousAttacks: 0,
    awayDangerousAttacks: 0,
    homeYellowedPlayerIds: [],
    awayYellowedPlayerIds: [],
    homeReddedPlayerIds: [],
    awayReddedPlayerIds: [],
    homeFatigueMap: homeFatigue,
    awayFatigueMap: awayFatigue,
    aiSubstitutionsCount: 0,
    autoSubsEnabled: true,
    userClubId,
  };
}

export interface PenaltyShootoutResult {
  homePenalties: number;
  awayPenalties: number;
  winnerTeamId: string;
  penaltyEvents: MatchEvent[];
}

/**
 * Simulates a realistic penalty shootout for knockout / cup matches when tied after regular time.
 */
export function simulatePenaltyShootout(
  homeTeam?: Club,
  awayTeam?: Club,
  homeTactics?: TeamTactics,
  awayTactics?: TeamTactics
): PenaltyShootoutResult {
  const safeHome = homeTeam || ({ id: 'home_dummy', name: 'الفريق المضيف', shortName: 'مض', players: [], reputation: 50 } as any);
  const safeAway = awayTeam || ({ id: 'away_dummy', name: 'الفريق الضيف', shortName: 'ضف', players: [], reputation: 50 } as any);

  const homePlayers: Player[] = Array.isArray(safeHome.players) ? safeHome.players.filter(Boolean) : [];
  const awayPlayers: Player[] = Array.isArray(safeAway.players) ? safeAway.players.filter(Boolean) : [];

  const homeGk = homePlayers.find(p => p.position === 'GK') || homePlayers[0] || { name: 'حارس المرمى', rating: 65, id: 'hgk' };
  const awayGk = awayPlayers.find(p => p.position === 'GK') || awayPlayers[0] || { name: 'حارس المرمى', rating: 65, id: 'agk' };

  // Select penalty takers
  const homeTakers: (Player | { name: string; rating: number; id: string })[] = [];
  if (homeTactics?.penaltyTakerId) {
    const designated = homePlayers.find(p => p.id === homeTactics.penaltyTakerId);
    if (designated) homeTakers.push(designated);
  }
  homePlayers.forEach(p => {
    if (!homeTakers.some(t => t.id === p.id)) homeTakers.push(p);
  });
  while (homeTakers.length < 10) {
    homeTakers.push({ name: `لاعب ${homeTakers.length + 1}`, rating: 65, id: `hp_${homeTakers.length}` });
  }

  const awayTakers: (Player | { name: string; rating: number; id: string })[] = [];
  if (awayTactics?.penaltyTakerId) {
    const designated = awayPlayers.find(p => p.id === awayTactics.penaltyTakerId);
    if (designated) awayTakers.push(designated);
  }
  awayPlayers.forEach(p => {
    if (!awayTakers.some(t => t.id === p.id)) awayTakers.push(p);
  });
  while (awayTakers.length < 10) {
    awayTakers.push({ name: `لاعب ${awayTakers.length + 1}`, rating: 65, id: `ap_${awayTakers.length}` });
  }

  let homeScore = 0;
  let awayScore = 0;
  const penaltyEvents: MatchEvent[] = [];

  penaltyEvents.push({
    minute: 120,
    type: 'commentary',
    teamId: safeHome.id,
    description: `⚖️ صافرة نهاية الوقت الأصلي بالتعادل! الاحتكام رسمياً إلى ركلات الجزاء الترجيحية لحسم بطاقة التأهل.`
  });

  const repDiff = (safeHome.reputation || 50) - (safeAway.reputation || 50);

  // First 5 rounds of penalties
  for (let round = 1; round <= 5; round++) {
    // Home kick
    const hTaker = homeTakers[round - 1];
    let hSuccessChance = 0.75 + (((hTaker as any).rating || 65) - 65) * 0.005 - (((awayGk as any).rating || 65) - 65) * 0.004 + (repDiff > 10 ? 0.03 : 0);
    hSuccessChance = Math.max(0.55, Math.min(0.92, hSuccessChance));
    const hScored = Math.random() < hSuccessChance;
    if (hScored) {
      homeScore++;
      penaltyEvents.push({
        minute: 120,
        type: 'goal',
        teamId: safeHome.id,
        playerName: hTaker.name,
        description: `⚽ ركلة ترجيح (${round}): ${hTaker.name} يسددها ببراعة في أقصى الزاوية معلناً هدفاً لـ (${safeHome.shortName || safeHome.name})!`
      });
    } else {
      penaltyEvents.push({
        minute: 120,
        type: 'save',
        teamId: safeAway.id,
        description: `🧤 ركلة ترجيح (${round}): الحارس ${awayGk.name} يتألق ببراعة ويحرم ${hTaker.name} من التسجيل!`
      });
    }

    // Away kick
    const aTaker = awayTakers[round - 1];
    let aSuccessChance = 0.75 + (((aTaker as any).rating || 65) - 65) * 0.005 - (((homeGk as any).rating || 65) - 65) * 0.004 - (repDiff > 10 ? 0.03 : 0);
    aSuccessChance = Math.max(0.55, Math.min(0.92, aSuccessChance));
    const aScored = Math.random() < aSuccessChance;
    if (aScored) {
      awayScore++;
      penaltyEvents.push({
        minute: 120,
        type: 'goal',
        teamId: safeAway.id,
        playerName: aTaker.name,
        description: `⚽ ركلة ترجيح (${round}): ${aTaker.name} يضع الكرة بهدوء في الشباك لصالح (${safeAway.shortName || safeAway.name})!`
      });
    } else {
      penaltyEvents.push({
        minute: 120,
        type: 'save',
        teamId: safeHome.id,
        description: `🧤 ركلة ترجيح (${round}): الحارس ${homeGk.name} يتوقع الزاوية ويصد تسديدة ${aTaker.name}!`
      });
    }

    // Check early win condition if impossible to catch up
    const homeRemaining = 5 - round;
    const awayRemaining = 5 - round;
    if (homeScore > awayScore + awayRemaining || awayScore > homeScore + homeRemaining) {
      break;
    }
  }

  // Sudden death if tied after 5 kicks
  let suddenDeathRound = 6;
  while (homeScore === awayScore && suddenDeathRound <= 10) {
    const hTaker = homeTakers[suddenDeathRound - 1] || homeTakers[0];
    const aTaker = awayTakers[suddenDeathRound - 1] || awayTakers[0];

    const hScored = Math.random() < 0.72;
    const aScored = Math.random() < 0.72;

    if (hScored) {
      homeScore++;
      penaltyEvents.push({
        minute: 120,
        type: 'goal',
        teamId: safeHome.id,
        playerName: hTaker.name,
        description: `🎯 ركلة إضافية (${suddenDeathRound}): ${hTaker.name} يسجل بنجاح لـ (${safeHome.shortName || safeHome.name})!`
      });
    } else {
      penaltyEvents.push({
        minute: 120,
        type: 'save',
        teamId: safeAway.id,
        description: `❌ ركلة إضافية (${suddenDeathRound}): ${hTaker.name} يهدر الركلة وسط تصدي ممتاز!`
      });
    }

    if (aScored) {
      awayScore++;
      penaltyEvents.push({
        minute: 120,
        type: 'goal',
        teamId: safeAway.id,
        playerName: aTaker.name,
        description: `🎯 ركلة إضافية (${suddenDeathRound}): ${aTaker.name} يسجل بهدوء لـ (${safeAway.shortName || safeAway.name})!`
      });
    } else {
      penaltyEvents.push({
        minute: 120,
        type: 'save',
        teamId: safeHome.id,
        description: `❌ ركلة إضافية (${suddenDeathRound}): ${aTaker.name} يهدر الركلة بعد تألق الحارس!`
      });
    }

    suddenDeathRound++;
  }

  // Absolute tiebreaker guarantee (knockout penalties can never end in a draw)
  if (homeScore === awayScore) {
    if (repDiff >= 0) {
      homeScore++;
    } else {
      awayScore++;
    }
  }

  const winnerTeamId = homeScore > awayScore ? safeHome.id : safeAway.id;
  const winnerTeam = homeScore > awayScore ? safeHome : safeAway;

  penaltyEvents.push({
    minute: 120,
    type: 'commentary',
    teamId: winnerTeamId,
    description: `🏆 نهاية ماراثون ركلات الترجيح: تأهل وفوز (${winnerTeam.shortName || winnerTeam.name}) بنتيجة (${homeScore} - ${awayScore})!`
  });

  return {
    homePenalties: homeScore,
    awayPenalties: awayScore,
    winnerTeamId,
    penaltyEvents,
  };
}

/**
 * Executes a single simulated minute (or time interval step) of the match.
 * Evaluates real-time tactics, substitutions, player attributes, fatigue, and AI decisions.
 */
export function simulateMatchStep(
  prevState: LiveSimulationState,
  liveUserTactics?: TeamTactics
): LiveSimulationState {
  if (prevState.isFinished || prevState.isHalfTime) {
    return prevState;
  }

  const nextMinute = prevState.currentMinute + 1;

  // Check Halftime trigger at minute 45
  if (nextMinute === 45 && !prevState.isHalfTime && prevState.currentMinute < 45) {
    return {
      ...prevState,
      currentMinute: 45,
      isHalfTime: true,
      isPlaying: false,
    };
  }

  // Check Fulltime trigger at minute 90
  if (nextMinute > 90) {
    console.log('[MatchEndingFlow] MATCH_90_REACHED');

    const isCupMatch = 
      prevState.fixture?.competitionType === 'cup' || 
      Boolean(prevState.fixture?.cupStage) || 
      Boolean(prevState.fixture?.stageName?.includes('نهائي')) ||
      Boolean(prevState.fixture?.stageName?.includes('كأس')) ||
      Boolean(prevState.fixture?.stageName?.includes('الكأس')) ||
      Boolean(prevState.fixture?.stageName?.includes('دور الـ')) ||
      Boolean(prevState.fixture?.competitionName?.includes('كأس')) ||
      Boolean(prevState.fixture?.competitionName?.includes('الكأس')) ||
      Boolean(prevState.fixture?.competitionName?.toLowerCase()?.includes('cup')) ||
      Boolean(prevState.fixture?.id?.toLowerCase()?.includes('cup'));
    let finalHomePenalties = prevState.homePenalties;
    let finalAwayPenalties = prevState.awayPenalties;
    let penaltyEvents: MatchEvent[] = [];

    // If knockout / cup match is tied at full-time, immediately resolve penalty shootout
    if (isCupMatch && prevState.homeScore === prevState.awayScore) {
      if (finalHomePenalties === undefined || finalAwayPenalties === undefined || finalHomePenalties === finalAwayPenalties) {
        const shootout = simulatePenaltyShootout(
          prevState.homeTeam,
          prevState.awayTeam,
          prevState.homeTactics,
          prevState.awayTactics
        );
        finalHomePenalties = shootout.homePenalties;
        finalAwayPenalties = shootout.awayPenalties;
        penaltyEvents = shootout.penaltyEvents;
      }
    }

    const isUserHome = Boolean(prevState.homeTeam?.isUserClub) || (Boolean(prevState.userClubId) && prevState.homeTeam?.id === prevState.userClubId);
    const userClub = isUserHome ? prevState.homeTeam : prevState.awayTeam;
    const oppClub = isUserHome ? prevState.awayTeam : prevState.homeTeam;
    const userTactics = isUserHome ? prevState.homeTactics : prevState.awayTactics;
    const oppTactics = isUserHome ? prevState.awayTactics : prevState.homeTactics;
    const userGoals = isUserHome ? prevState.homeScore : prevState.awayScore;
    const oppGoals = isUserHome ? prevState.awayScore : prevState.homeScore;

    const hadRedCard = (isUserHome ? prevState.homeReddedPlayerIds : prevState.awayReddedPlayerIds).length > 0;
    const concededAfter70 = prevState.events.some(e => e.type === 'goal' && e.minute >= 70 && e.teamId === oppClub.id);
    const scoredFromCounter = prevState.events.some(e => e.type === 'goal' && e.teamId === userClub.id && (e.description?.includes('مرتد') || userTactics.tacticalStyle === 'counter_attack'));
    const scoredFromCross = prevState.events.some(e => e.type === 'goal' && e.teamId === userClub.id && (e.description?.includes('عرض') || userTactics.tacticalStyle === 'wing_play'));
    const concededFromCross = prevState.events.some(e => e.type === 'goal' && e.teamId === oppClub.id && (e.description?.includes('عرض') || oppTactics.tacticalStyle === 'wing_play'));

    const mockManager: ManagerProfile = {
      name: userClub.manager?.name || 'المدير الفني',
      age: 40,
      nationality: 'مصر',
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      reputation: 50,
      license: (userClub.manager as any)?.license || 'D',
      matchesManaged: 10,
      wins: 5,
      draws: 2,
      losses: 3,
      goalsScored: 12,
      goalsConceded: 8,
      trophies: [],
      careerEarnings: 0,
      favoriteFormation: userTactics.formation,
      totalSeasons: 1,
      leagueTitles: 0,
      cupTitles: 0,
      promotions: 0,
      relegations: 0,
      clubsManaged: [userClub.name],
      countriesManaged: ['مصر'],
      highestLeagueReached: 'Premier',
      highestManagerLevel: 1,
      highestReputation: 50,
      history: [],
      tacticalExperience: (userClub.manager as any)?.tacticalExperience || { total_football: 50, tiki_taka: 50, gegenpress: 50, counter_attack: 50 },
    };

    const tacticalReport = generateTacticalMatchReport(
      userClub,
      oppClub,
      userTactics,
      oppTactics,
      userGoals,
      oppGoals,
      {
        userPossession: isUserHome ? prevState.stats.homePossession : prevState.stats.awayPossession,
        userShots: isUserHome ? prevState.stats.homeShots : prevState.stats.awayShots,
        userShotsOnTarget: isUserHome ? prevState.stats.homeShotsOnTarget : prevState.stats.awayShotsOnTarget,
        userFouls: isUserHome ? prevState.stats.homeFouls : prevState.stats.awayFouls,
      },
      mockManager,
      {
        hadRedCard,
        concededAfter70,
        scoredFromCounter,
        scoredFromCross,
        concededFromCross,
      }
    );

    return {
      ...prevState,
      currentMinute: 90,
      isFinished: true,
      isPlaying: false,
      isHalfTime: false,
      homePenalties: finalHomePenalties,
      awayPenalties: finalAwayPenalties,
      events: [...prevState.events, ...penaltyEvents],
      tacticalMatchReport: tacticalReport,
    };
  }

  const isUserTeamHome = Boolean(prevState.homeTeam?.isUserClub) || (Boolean(prevState.userClubId) && prevState.homeTeam?.id === prevState.userClubId);
  const isUserTeamAway = Boolean(prevState.awayTeam?.isUserClub) || (Boolean(prevState.userClubId) && prevState.awayTeam?.id === prevState.userClubId);

  // Update active tactics if user made live changes
  let currentHomeTactics = isUserTeamHome && liveUserTactics ? { ...prevState.homeTactics, ...liveUserTactics } : prevState.homeTactics;
  let currentAwayTactics = isUserTeamAway && liveUserTactics ? { ...prevState.awayTactics, ...liveUserTactics } : prevState.awayTactics;

  // Preserve active lineups from prevState (do NOT overwrite with startingPlayerIds as that undoes substitutions!)
  let activeHomeLineup = [...prevState.homeLineup];
  let activeAwayLineup = [...prevState.awayLineup];

  // ====================================================
  // AI MANAGER LOGIC (Requirement 23)
  // ====================================================
  const aiTeam = isUserTeamHome ? prevState.awayTeam : prevState.homeTeam;
  const isAiHome = !isUserTeamHome;
  let aiTactics = isAiHome ? currentHomeTactics : currentAwayTactics;
  let aiLineup = isAiHome ? activeHomeLineup : activeAwayLineup;
  let aiSubsCount = prevState.aiSubstitutionsCount;
  const newEvents: MatchEvent[] = [];

  const aiScore = isAiHome ? prevState.homeScore : prevState.awayScore;
  const userScore = isAiHome ? prevState.awayScore : prevState.homeScore;

  // AI Tactical Reaction around minutes 60-80
  if (nextMinute >= 60 && nextMinute <= 85) {
    // 1. AI is trailing -> Goes attacking & makes aggressive offensive sub
    if (aiScore < userScore && aiTactics.mentality !== 'ultra_attacking' && Math.random() < 0.15) {
      aiTactics = {
        ...aiTactics,
        mentality: (userScore - aiScore >= 2) ? 'ultra_attacking' : 'attacking',
        pressingIntensity: 'high',
      };
      
      newEvents.push({
        minute: nextMinute,
        type: 'commentary',
        teamId: aiTeam.id,
        description: `⚡ تعليمات فنية من مدرب ${aiTeam.shortName}: تكثيف الضغط الهجومي واللعب باندفاع كامل للعودة في النتيجة!`
      });
    }
    // 2. AI is leading at minute 75+ -> Goes defensive to hold the lead
    else if (aiScore > userScore && nextMinute >= 75 && aiTactics.mentality !== 'defensive' && aiTactics.mentality !== 'ultra_defensive' && Math.random() < 0.15) {
      aiTactics = {
        ...aiTactics,
        mentality: 'defensive',
        pressingIntensity: 'low',
      };

      newEvents.push({
        minute: nextMinute,
        type: 'commentary',
        teamId: aiTeam.id,
        description: `🛡️ قرار تكتيكي من مدرب ${aiTeam.shortName}: إغلاق المساحات والاعتماد على التكتل الدفاعي للحفاظ على التقدم.`
      });
    }

    // AI Logical Substitution (up to 3-4 subs per game)
    if (aiSubsCount < 4 && Math.random() < 0.12) {
      const benchPlayers = aiTeam.players.filter(p => !aiLineup.includes(p.id));
      if (benchPlayers.length > 0) {
        const aiFatigueMap = isAiHome ? prevState.homeFatigueMap : prevState.awayFatigueMap;
        // Pick an active player with lowest fitness or poor position fit
        const tiredActivePlayers = aiTeam.players
          .filter(p => aiLineup.includes(p.id))
          .sort((a, b) => (aiFatigueMap[a.id] || 80) - (aiFatigueMap[b.id] || 80));

        const subOut = tiredActivePlayers[0];
        // Pick fresh bench replacement
        const subIn = benchPlayers.sort((a, b) => b.overallRating - a.overallRating)[0];

        if (subOut && subIn) {
          aiLineup = aiLineup.map(id => id === subOut.id ? subIn.id : id);
          aiSubsCount++;

          newEvents.push({
            minute: nextMinute,
            type: 'substitution',
            teamId: aiTeam.id,
            inPlayerName: subIn.name,
            outPlayerName: subOut.name,
            description: `🔄 تبديل في صفوف ${aiTeam.shortName}: دخول (${subIn.name}) وخروج (${subOut.name}).`
          });
        }
      }
    }
  }

  // Re-assign tactical states back
  if (isAiHome) {
    currentHomeTactics = aiTactics;
    activeHomeLineup = aiLineup;
  } else {
    currentAwayTactics = aiTactics;
    activeAwayLineup = aiLineup;
  }

  // USER SMART AUTO-SUBSTITUTION (Enabled by default unless explicitly disabled)
  let userSubsCount = prevState.substitutionsCount;
  const userTeam = isUserTeamHome ? prevState.homeTeam : (isUserTeamAway ? prevState.awayTeam : undefined);

  if (userTeam && prevState.autoSubsEnabled !== false && userSubsCount < 5) {
    const userLineup = isUserTeamHome ? activeHomeLineup : activeAwayLineup;
    const userFatigue = isUserTeamHome ? prevState.homeFatigueMap : prevState.awayFatigueMap;
    const userPitchPlayers = (userTeam?.players || []).filter(p => userLineup.includes(p.id));
    const userBenchPlayers = (userTeam?.players || []).filter(p => !userLineup.includes(p.id));

    // Check if there is an injured player needing an urgent sub immediately
    const hasInjuredPitchPlayer = userPitchPlayers.some(p => Boolean(p.injury || p.isInjured));

    const lastUserSubEvent = prevState.events
      .filter(e => e.type === 'substitution' && e.teamId === userTeam.id)
      .pop();
    const minutesSinceLastSub = lastUserSubEvent ? (nextMinute - lastUserSubEvent.minute) : 99;

    // Substitution windows (well-timed & natural across the second half):
    const isWindow = (
      (nextMinute >= 55 && userSubsCount === 0) ||
      (nextMinute >= 63 && userSubsCount === 1) ||
      (nextMinute >= 71 && userSubsCount === 2) ||
      (nextMinute >= 79 && userSubsCount === 3) ||
      (nextMinute >= 84 && userSubsCount === 4)
    );

    const isExhaustedOnPitch = userPitchPlayers.some(p => (userFatigue[p.id] ?? p.fitness ?? 100) < 55);

    if (hasInjuredPitchPlayer || (isWindow && minutesSinceLastSub >= 3 && nextMinute <= 89) || (isExhaustedOnPitch && nextMinute >= 52 && minutesSinceLastSub >= 3)) {
      const userScore = isUserTeamHome ? prevState.homeScore : prevState.awayScore;
      const oppScore = isUserTeamHome ? prevState.awayScore : prevState.homeScore;
      const yellowedIds = isUserTeamHome ? prevState.homeYellowedPlayerIds : prevState.awayYellowedPlayerIds;

      const smartSub = executeSmartAutoSub(
        userPitchPlayers,
        userBenchPlayers,
        userFatigue,
        5 - userSubsCount,
        {
          minute: nextMinute,
          userScore,
          oppScore,
          yellowCardedIds: yellowedIds,
        }
      );

      if (smartSub) {
        if (isUserTeamHome) {
          activeHomeLineup = activeHomeLineup.map(id => id === smartSub.outPlayer.id ? smartSub.inPlayer.id : id);
        } else {
          activeAwayLineup = activeAwayLineup.map(id => id === smartSub.outPlayer.id ? smartSub.inPlayer.id : id);
        }
        userSubsCount++;

        newEvents.push({
          minute: nextMinute,
          type: 'substitution',
          teamId: userTeam.id,
          playerId: smartSub.outPlayer.id,
          playerName: smartSub.outPlayer.name,
          inPlayerName: smartSub.inPlayer.name,
          outPlayerName: smartSub.outPlayer.name,
          description: `🔄 تبديل تكتيكي ذكي (${userTeam.shortName}): خروج (${smartSub.outPlayer.name}) ودخول (${smartSub.inPlayer.name}) - [${smartSub.reason}].`
        });
      }
    }
  }

  // ====================================================
  // ATTRIBUTE-BASED EVENT ENGINE (Physicality, Tactics, Crowd Advantage)
  // ====================================================
  const homeActivePlayers = (prevState.homeTeam?.players || []).filter(p => activeHomeLineup.includes(p.id));
  const awayActivePlayers = (prevState.awayTeam?.players || []).filter(p => activeAwayLineup.includes(p.id));

  // Compute live effective strength with AdMob Rewarded Training Boost if applied
  const activeBoost = AdManager.getActiveTrainingBoost() || undefined;
  const homeBoost = prevState.homeTeam?.isUserClub ? activeBoost : undefined;
  const awayBoost = prevState.awayTeam?.isUserClub ? activeBoost : undefined;

  // Technical staff bonuses
  const homeStaffBonuses = getClubStaffBonuses(prevState.homeTeam);
  const awayStaffBonuses = getClubStaffBonuses(prevState.awayTeam);

  const homeStrength = calculateTeamStrength(prevState.homeTeam, currentHomeTactics, undefined, homeBoost);
  const awayStrength = calculateTeamStrength(prevState.awayTeam, currentAwayTactics, undefined, awayBoost);

  const matchup = calculateTacticalMatchup(currentHomeTactics, currentAwayTactics);

  // 1. Live Physical Presence & Duel Disparity
  const homePhysSum = homeActivePlayers.reduce((acc, p) => {
    const pPhys = p?.attributes?.physical || 65;
    const pStamina = prevState.homeFatigueMap[p?.id] ?? p?.fitness ?? 90;
    return acc + (pPhys * 0.55 + pStamina * 0.45);
  }, 0);
  const avgHomePhys = homeActivePlayers.length > 0 ? homePhysSum / homeActivePlayers.length : 65;

  const awayPhysSum = awayActivePlayers.reduce((acc, p) => {
    const pPhys = p?.attributes?.physical || 65;
    const pStamina = prevState.awayFatigueMap[p?.id] ?? p?.fitness ?? 90;
    return acc + (pPhys * 0.55 + pStamina * 0.45);
  }, 0);
  const avgAwayPhys = awayActivePlayers.length > 0 ? awayPhysSum / awayActivePlayers.length : 65;

  const physicalDisparity = Math.max(-15, Math.min(15, avgHomePhys - avgAwayPhys));
  const homePhysMod = 1 + (physicalDisparity * 0.006);
  const awayPhysMod = 1 - (physicalDisparity * 0.006);

  // 2. Accurate Home Ground & Crowd Advantage
  const awayStyle = currentAwayTactics.tacticalStyle || (currentAwayTactics as any).style;
  const homeStyle = currentHomeTactics.tacticalStyle || (currentHomeTactics as any).style;
  const isAwayParked = awayStyle === 'park_the_bus' || awayStyle === 'catenaccio' || ['5-3-2', '5-4-1'].includes(currentAwayTactics.formation);
  const isHomeParked = homeStyle === 'park_the_bus' || homeStyle === 'catenaccio' || ['5-3-2', '5-4-1'].includes(currentHomeTactics.formation);

  const crowdAdvantage = calculateHomeCrowdAdvantage(
    prevState.homeTeam,
    prevState.awayTeam,
    prevState.homeScore,
    prevState.awayScore,
    nextMinute,
    isAwayParked
  );

  // Pitch Count Factor (proportional penalty if team plays with 10 or fewer players due to red cards)
  const homeCountFactor = homeActivePlayers.length >= 11 ? 1.0 : Math.max(0.68, 0.76 + (homeActivePlayers.length / 11) * 0.24);
  const awayCountFactor = awayActivePlayers.length >= 11 ? 1.0 : Math.max(0.68, 0.76 + (awayActivePlayers.length / 11) * 0.24);

  // Evaluate Deep Tactical Synergy & Attribute Affinity (NO RANDOM TACTICS)
  const homeSynergy = evaluateSquadTacticalSynergy(
    currentHomeTactics,
    homeActivePlayers,
    currentAwayTactics,
    nextMinute,
    prevState.homeFatigueMap,
    homeActivePlayers.length < 11,
    homeStrength.managerRating,
    awayActivePlayers
  );

  const awaySynergy = evaluateSquadTacticalSynergy(
    currentAwayTactics,
    awayActivePlayers,
    currentHomeTactics,
    nextMinute,
    prevState.awayFatigueMap,
    awayActivePlayers.length < 11,
    awayStrength.managerRating,
    homeActivePlayers
  );

  // Live Fatigue Commentary Warning for high press collapse
  if (homeSynergy.fatigueWarning && nextMinute === 68 && Boolean(prevState.homeTeam?.isUserClub)) {
    newEvents.push({
      minute: 68,
      type: 'commentary',
      teamId: prevState.homeTeam.id,
      description: `⚠️ إرهاق بدني: ${homeSynergy.fatigueWarning}`
    });
  } else if (awaySynergy.fatigueWarning && nextMinute === 68 && Boolean(prevState.awayTeam?.isUserClub)) {
    newEvents.push({
      minute: 68,
      type: 'commentary',
      teamId: prevState.awayTeam.id,
      description: `⚠️ إرهاق بدني: ${awaySynergy.fatigueWarning}`
    });
  }

  // Tactical Insight Commentary to reward astute tactical management
  if ([16, 36, 62, 78].includes(nextMinute) && Math.random() < 0.65) {
    if (matchup.homeAttackMod >= 1.22 || homeSynergy.synergyScore >= 80) {
      newEvents.push({
        minute: nextMinute,
        type: 'commentary',
        teamId: prevState.homeTeam.id,
        description: `🧠 ذكاء تكتيكي لافت: تشكيل (${currentHomeTactics.formation}) وتناغم اللاعبين يمنحان ${prevState.homeTeam.shortName} أفضلية واضحة في فرض نسق اللعب والتحولات الهجومية السريعة.`
      });
    } else if (matchup.awayAttackMod >= 1.22 || awaySynergy.synergyScore >= 80) {
      newEvents.push({
        minute: nextMinute,
        type: 'commentary',
        teamId: prevState.awayTeam.id,
        description: `🧠 براعة تكتيكية للمنافس: أسلوب وتشكيل ${prevState.awayTeam.shortName} (${currentAwayTactics.formation}) يضغطان بقوة على دفاعاتنا ويغلقان مسارات التمرير.`
      });
    }
  }

  // Calculated Effective Strengths incorporating Tactics, Synergy, Physicality, Crowd, and Staff
  const effHomeAtk = homeStrength.attack * matchup.homeAttackMod * homeSynergy.attackMod * crowdAdvantage.homeAttackBonus * homePhysMod * homeCountFactor * (1 + homeStaffBonuses.tacticalScoutingAdvantage);
  const effHomeMid = homeStrength.midfield * matchup.homeMidfieldMod * homeSynergy.midfieldMod * crowdAdvantage.homeMidfieldBonus * homePhysMod * homeCountFactor * (1 + homeStaffBonuses.tacticalSynergyBonus);
  const effHomeDef = homeStrength.defense * matchup.homeDefenseMod * homeSynergy.defenseMod * crowdAdvantage.homeDefenseBonus * homePhysMod * homeCountFactor;

  const effAwayAtk = awayStrength.attack * matchup.awayAttackMod * awaySynergy.attackMod * crowdAdvantage.awayIntimidationPenalty * awayPhysMod * awayCountFactor * (1 + awayStaffBonuses.tacticalScoutingAdvantage);
  const effAwayMid = awayStrength.midfield * matchup.awayMidfieldMod * awaySynergy.midfieldMod * awayPhysMod * awayCountFactor * (1 + awayStaffBonuses.tacticalSynergyBonus);
  const effAwayDef = awayStrength.defense * matchup.awayDefenseMod * awaySynergy.defenseMod * awayPhysMod * awayCountFactor;

  // CORE USER MANDATE: Team Strength & Manager Rating Dominance
  // "الفريق اللى قوة لاعيبينه و قوة مدربه اكبر من الفريق التانى يبقى ليه نسبه فوز اكبر ( يعنى الفوز فى المباراة يتطلب وجود لاعيبه اقوى من الفريق الخصم و المدرب قوته اقوى من الفريق الخصم )"
  const squadDiff = homeStrength.squadStrength - awayStrength.squadStrength;
  const managerDiff = homeStrength.managerRating - awayStrength.managerRating;
  const overallDiff = homeStrength.overall - awayStrength.overall;

  const qualityAdvantage = (overallDiff * 0.025) + (managerDiff * 0.018) + (squadDiff * 0.012);
  const homeQualityMod = Math.max(0.18, Math.min(2.60, 1.0 + qualityAdvantage));
  const awayQualityMod = Math.max(0.18, Math.min(2.60, 1.0 - qualityAdvantage));

  // Dynamic Possession for this minute (strongly reflects quality gap and tactical control)
  const weightedHomeMid = effHomeMid * Math.sqrt(homeQualityMod);
  const weightedAwayMid = effAwayMid * Math.sqrt(awayQualityMod);
  const totalMid = Math.max(10, weightedHomeMid + weightedAwayMid);
  const homePossession = Math.min(84, Math.max(16, Math.round((weightedHomeMid / totalMid) * 100)));
  const awayPossession = 100 - homePossession;

  // Track match events and stats
  let homeScore = prevState.homeScore;
  let awayScore = prevState.awayScore;
  let homeShots = prevState.stats.homeShots;
  let awayShots = prevState.stats.awayShots;
  let homeShotsOnTarget = prevState.stats.homeShotsOnTarget;
  let awayShotsOnTarget = prevState.stats.awayShotsOnTarget;
  let homeFouls = prevState.stats.homeFouls;
  let awayFouls = prevState.stats.awayFouls;
  let homeCorners = prevState.stats.homeCorners;
  let awayCorners = prevState.stats.awayCorners;
  let homeYellowCards = prevState.stats.homeYellowCards;
  let awayYellowCards = prevState.stats.awayYellowCards;
  let homeRedCards = prevState.stats.homeRedCards;
  let awayRedCards = prevState.stats.awayRedCards;
  let homeXg = prevState.homeXg;
  let awayXg = prevState.awayXg;
  let homeDangerousAttacks = prevState.homeDangerousAttacks;
  let awayDangerousAttacks = prevState.awayDangerousAttacks;
  let updatedHomeYellowed = [...prevState.homeYellowedPlayerIds];
  let updatedAwayYellowed = [...prevState.awayYellowedPlayerIds];
  let updatedHomeRedded = [...prevState.homeReddedPlayerIds];
  let updatedAwayRedded = [...prevState.awayReddedPlayerIds];

  // 3. Dynamic Match Momentum & Anti-Blowout Governor
  const scoreDiff = homeScore - awayScore;

  // Realistic Lead Governor: Leading teams manage tempo, but quality advantage still maintains threat
  let homeLeadMod = 1.0;
  if (scoreDiff >= 4) homeLeadMod = overallDiff > 8 ? 0.70 : 0.50;
  else if (scoreDiff === 3) homeLeadMod = overallDiff > 8 ? 0.80 : 0.68;
  else if (scoreDiff === 2) homeLeadMod = overallDiff > 8 ? 0.92 : 0.85;
  else if (scoreDiff === 1) homeLeadMod = 0.98;
  else if (scoreDiff < 0) homeLeadMod = overallDiff < -8 ? 1.05 : 1.15;

  let awayLeadMod = 1.0;
  if (scoreDiff <= -4) awayLeadMod = overallDiff < -8 ? 0.70 : 0.50;
  else if (scoreDiff === -3) awayLeadMod = overallDiff < -8 ? 0.80 : 0.68;
  else if (scoreDiff === -2) awayLeadMod = overallDiff < -8 ? 0.92 : 0.85;
  else if (scoreDiff === -1) awayLeadMod = 0.98;
  else if (scoreDiff > 0) awayLeadMod = overallDiff > 8 ? 1.05 : 1.15;

  // Overextended risk: If a team leads and recklessly stays on ultra_attacking, opponent gets counter-attack opportunities
  const homeOverextended = scoreDiff > 0 && currentHomeTactics.mentality === 'ultra_attacking';
  const awayOverextended = scoreDiff < 0 && currentAwayTactics.mentality === 'ultra_attacking';

  // Calibrated attack generation per minute (strongly driven by midfield control, tactics, and player/manager quality)
  let homeAttackProb = (weightedHomeMid / totalMid) * 0.25 * homeLeadMod * homeQualityMod;
  let awayAttackProb = (weightedAwayMid / totalMid) * 0.23 * awayLeadMod * awayQualityMod;

  if (awayOverextended) homeAttackProb *= 1.25;
  if (homeOverextended) awayAttackProb *= 1.25;

  // Defensive block suppression from Park the Bus, Catenaccio, or 5-back formations
  if (isAwayParked) homeAttackProb *= 0.82;
  if (isHomeParked) awayAttackProb *= 0.82;

  homeAttackProb = Math.min(0.32, Math.max(0.02, homeAttackProb));
  awayAttackProb = Math.min(0.32, Math.max(0.02, awayAttackProb));

  const roll = Math.random();

  if (roll < homeAttackProb) {
    // HOME ATTACK SEQUENCE
    homeDangerousAttacks++;
    const shotRoll = Math.random();

    // Superior teams penetrating weaker defenses convert higher % of attacks into shots
    const homeShotChance = Math.max(0.42, Math.min(0.68, 0.52 + (overallDiff * 0.005)));
    if (shotRoll < homeShotChance) {
      homeShots++;
      const topHomeAttacker = pickPlayerByPosition(homeActivePlayers, 'FWD', 'MID');
      const shootingSkill = topHomeAttacker?.attributes?.shooting || effHomeAtk;
      
      // Fatigue and physical stamina impact on attacker finishing
      const attackerFatigue = prevState.homeFatigueMap[topHomeAttacker?.id] ?? 85;
      const fatigueFactor = attackerFatigue < 55 ? 0.82 : (attackerFatigue < 68 ? 0.92 : 1.0);

      // Blocked shot check: High defending skill blocks more, weak defending blocks less
      const blockProb = isAwayParked ? 0.38 : Math.max(0.12, Math.min(0.34, 0.25 - (overallDiff * 0.003)));
      if (Math.random() < blockProb) {
        // Defensive Block
        const defendingCb = pickPlayerByPosition(awayActivePlayers, 'DEF', 'MID');
        if (Math.random() < 0.45) {
          homeCorners++;
          newEvents.push({
            minute: nextMinute,
            type: 'commentary',
            teamId: prevState.homeTeam.id,
            description: `🛡️ استبسال دفاعي بطولي! تسديدة من (${topHomeAttacker?.name || 'المهاجم'}) ترتطم بالمدافع (${defendingCb?.name || 'الدفاع'}) وتتحول إلى ركنية.`
          });
        }
      } else {
        // Shot is through on goal: high skill strikers reliably find the target
        let onTargetProb = (0.38 + ((shootingSkill - 50) * 0.0036)) * fatigueFactor;
        if (isAwayParked) onTargetProb -= 0.05; // Narrow shooting lanes
        onTargetProb = Math.min(0.68, Math.max(0.25, onTargetProb));

        const isTarget = Math.random() < onTargetProb;
        const shotXg = isTarget ? (Math.random() * 0.20 + 0.09) : (Math.random() * 0.05 + 0.02);
        homeXg += Number(shotXg.toFixed(2));

        if (isTarget) {
          homeShotsOnTarget++;
          const awayGk = awayActivePlayers.find(p => p.positionCategory === 'GK') || awayActivePlayers[0];
          const awayGkPower = (awayGk?.attributes?.goalkeeping || awayGk?.overallRating || 60);
          const awayGkFatigue = prevState.awayFatigueMap[awayGk?.id] ?? 90;
          const gkEfficiency = awayGkFatigue < 50 ? 0.88 : 1.0;

          // Calibrated Goal Conversion on Target:
          // Factoring Player quality and manager coaching quality
          const atkVsGk = ((effHomeAtk - (awayGkPower * gkEfficiency)) * 0.0042);
          const defSuppression = ((effAwayDef - 50) * 0.0020);
          const qualityConversionBonus = (overallDiff * 0.005) + (managerDiff * 0.003);
          let goalProb = 0.28 + atkVsGk - defSuppression + qualityConversionBonus;

          if (isAwayParked) goalProb -= 0.06;
          // Anti-blowout conversion dampener
          if (scoreDiff >= 4) goalProb *= 0.50;
          else if (scoreDiff >= 3) goalProb *= 0.70;
          else if (scoreDiff >= 2) goalProb *= 0.85;

          goalProb = Math.max(0.05, Math.min(0.60, goalProb));

          if (Math.random() < goalProb) {
            homeScore++;
            const scorer = pickGoalScorer(homeActivePlayers);
            const assister = pickAssister(homeActivePlayers, scorer.id);
            const comment = GOAL_COMMENTARIES[Math.floor(Math.random() * GOAL_COMMENTARIES.length)];

            newEvents.push({
              minute: nextMinute,
              type: 'goal',
              teamId: prevState.homeTeam.id,
              playerId: scorer.id,
              playerName: scorer.name,
              assistPlayerId: assister?.id,
              assistPlayerName: assister?.name,
              description: `${comment} - الهدف سجله (${scorer.name})${assister ? ` بعد تمريرة متقنة من (${assister.name})` : ''}!`
            });
          } else {
            newEvents.push({
              minute: nextMinute,
              type: 'save',
              teamId: prevState.homeTeam.id,
              description: `🧤 تصدي بارع من حارس ${prevState.awayTeam.shortName} يبعد تسديدة خطيرة من (${topHomeAttacker?.name || 'الهجوم'})!`
            });
          }
        } else {
          newEvents.push({
            minute: nextMinute,
            type: 'chance',
            teamId: prevState.homeTeam.id,
            description: CHANCE_COMMENTARIES[Math.floor(Math.random() * CHANCE_COMMENTARIES.length)]
          });
        }
      }
    } else {
      if (Math.random() < 0.25) {
        newEvents.push({
          minute: nextMinute,
          type: 'commentary',
          teamId: prevState.homeTeam.id,
          description: `🛡️ تكتل دفاعي منظم من مدافعي ${prevState.awayTeam.shortName} يقطع الكرة قبل تشكيل خطورة.`
        });
      }
    }
  } else if (roll > 1 - awayAttackProb) {
    // AWAY ATTACK SEQUENCE
    awayDangerousAttacks++;
    const shotRoll = Math.random();

    // Superior teams penetrating weaker defenses convert higher % of attacks into shots
    const awayShotChance = Math.max(0.42, Math.min(0.68, 0.52 - (overallDiff * 0.005)));
    if (shotRoll < awayShotChance) {
      awayShots++;
      const topAwayAttacker = pickPlayerByPosition(awayActivePlayers, 'FWD', 'MID');
      const shootingSkill = topAwayAttacker?.attributes?.shooting || effAwayAtk;

      const attackerFatigue = prevState.awayFatigueMap[topAwayAttacker?.id] ?? 85;
      const fatigueFactor = attackerFatigue < 55 ? 0.82 : (attackerFatigue < 68 ? 0.92 : 1.0);

      // Blocked shot check: High defending skill blocks more, weak defending blocks less
      const blockProb = isHomeParked ? 0.38 : Math.max(0.12, Math.min(0.34, 0.25 + (overallDiff * 0.003)));
      if (Math.random() < blockProb) {
        const defendingCb = pickPlayerByPosition(homeActivePlayers, 'DEF', 'MID');
        if (Math.random() < 0.45) {
          awayCorners++;
          newEvents.push({
            minute: nextMinute,
            type: 'commentary',
            teamId: prevState.awayTeam.id,
            description: `🛡️ فدائية في الدفاع! المدافع (${defendingCb?.name || 'الدفاع'}) يرمي بنفسه أمام تسديدة (${topAwayAttacker?.name || 'المهاجم'}) وتتحول إلى ركنية.`
          });
        }
      } else {
        let onTargetProb = (0.38 + ((shootingSkill - 50) * 0.0036)) * fatigueFactor * crowdAdvantage.awayIntimidationPenalty;
        if (isHomeParked) onTargetProb -= 0.05;
        onTargetProb = Math.min(0.68, Math.max(0.25, onTargetProb));

        const isTarget = Math.random() < onTargetProb;
        const shotXg = isTarget ? (Math.random() * 0.20 + 0.09) : (Math.random() * 0.05 + 0.02);
        awayXg += Number(shotXg.toFixed(2));

        if (isTarget) {
          awayShotsOnTarget++;
          const homeGk = homeActivePlayers.find(p => p.positionCategory === 'GK') || homeActivePlayers[0];
          const homeGkPower = (homeGk?.attributes?.goalkeeping || homeGk?.overallRating || 60);
          const homeGkFatigue = prevState.homeFatigueMap[homeGk?.id] ?? 90;
          const gkEfficiency = homeGkFatigue < 50 ? 0.88 : 1.0;

          const atkVsGk = ((effAwayAtk - (homeGkPower * gkEfficiency)) * 0.0042);
          const defSuppression = ((effHomeDef - 50) * 0.0020);
          const qualityConversionBonus = (-overallDiff * 0.005) + (-managerDiff * 0.003);
          let goalProb = 0.28 + atkVsGk - defSuppression + qualityConversionBonus;

          if (isHomeParked) goalProb -= 0.06;
          if (scoreDiff <= -4) goalProb *= 0.50;
          else if (scoreDiff <= -3) goalProb *= 0.70;
          else if (scoreDiff <= -2) goalProb *= 0.85;

          goalProb = Math.max(0.05, Math.min(0.60, goalProb));

          if (Math.random() < goalProb) {
            awayScore++;
            const scorer = pickGoalScorer(awayActivePlayers);
            const assister = pickAssister(awayActivePlayers, scorer.id);
            const comment = GOAL_COMMENTARIES[Math.floor(Math.random() * GOAL_COMMENTARIES.length)];

            newEvents.push({
              minute: nextMinute,
              type: 'goal',
              teamId: prevState.awayTeam.id,
              playerId: scorer.id,
              playerName: scorer.name,
              assistPlayerId: assister?.id,
              assistPlayerName: assister?.name,
              description: `${comment} - هدف لصالح ${prevState.awayTeam.shortName} بقدم (${scorer.name})${assister ? ` وصناعة (${assister.name})` : ''}!`
            });
          } else {
            newEvents.push({
              minute: nextMinute,
              type: 'save',
              teamId: prevState.awayTeam.id,
              description: `🧤 تصدي بطولي من حارس ${prevState.homeTeam.shortName} وسط تشجيع جنوني من الجماهير في المدرجات!`
            });
          }
        } else {
          newEvents.push({
            minute: nextMinute,
            type: 'chance',
            teamId: prevState.awayTeam.id,
            description: CHANCE_COMMENTARIES[Math.floor(Math.random() * CHANCE_COMMENTARIES.length)]
          });
        }
      }
    } else {
      if (Math.random() < 0.25) {
        newEvents.push({
          minute: nextMinute,
          type: 'commentary',
          teamId: prevState.awayTeam.id,
          description: `🛡️ استبسال دفاعي من لاعبي ${prevState.homeTeam.shortName} في التغطية وتشتيت الكرة.`
        });
      }
    }
  } else {
    // Secondary Events (Fouls, Cards, Corners, Penalties, Tactical Play)
    const subRoll = Math.random();
    
    // Penalties check: realistic rate (~1.2% per minute under high pressure in the box)
    if (subRoll < 0.012 && nextMinute > 10) {
      const isHomePenalty = Math.random() > 0.48;
      const penaltyTeam = isHomePenalty ? prevState.homeTeam : prevState.awayTeam;
      const defendingTeam = isHomePenalty ? prevState.awayTeam : prevState.homeTeam;
      const activeShooters = isHomePenalty ? homeActivePlayers : awayActivePlayers;
      const activeDefenders = isHomePenalty ? awayActivePlayers : homeActivePlayers;

      const penaltyTakerId = (isHomePenalty ? currentHomeTactics.penaltyTakerId : currentAwayTactics.penaltyTakerId);
      const outfieldShooters = activeShooters.filter(p => p && p.id && p.positionCategory !== 'GK' && p.position !== 'GK');
      const designatedTaker = outfieldShooters.find(p => p.id === penaltyTakerId);
      const taker = designatedTaker || pickGoalScorer(outfieldShooters.length > 0 ? outfieldShooters : activeShooters);
      const gk = activeDefenders.find(p => p.positionCategory === 'GK') || activeDefenders[0];

      const takerShooting = taker?.attributes?.shooting || 70;
      const gkSaving = gk?.attributes?.goalkeeping || 65;
      const penaltyConversion = Math.max(0.60, Math.min(0.88, 0.76 + ((takerShooting - gkSaving) * 0.003)));

      if (isHomePenalty) homeShots++;
      else awayShots++;

      if (Math.random() < penaltyConversion) {
        if (isHomePenalty) {
          homeScore++;
          homeShotsOnTarget++;
          homeXg += 0.76;
        } else {
          awayScore++;
          awayShotsOnTarget++;
          awayXg += 0.76;
        }
        newEvents.push({
          minute: nextMinute,
          type: 'goal',
          teamId: penaltyTeam.id,
          playerId: taker.id,
          playerName: taker.name,
          description: `⚽ ضربة جزاء! الحكم يطلق صافرته لعرقلة داخل المنطقة.. واللاعب (${taker.name}) يسكنها الشباك بنجاح لصالح ${penaltyTeam.shortName}!`
        });
      } else {
        if (isHomePenalty) {
          homeShotsOnTarget++;
          homeXg += 0.76;
        } else {
          awayShotsOnTarget++;
          awayXg += 0.76;
        }
        newEvents.push({
          minute: nextMinute,
          type: 'save',
          teamId: defendingTeam.id,
          description: `🧤 ركلة جزاء ضائعة! حارس ${defendingTeam.shortName} يتألق ببراعة خرافية ويتصدى لركلة الجزاء من أمام (${taker.name}) وسط ذهول الجميع!`
        });
      }
    } else if (subRoll < 0.07) {
      // Fouls & Cards with real red card dismissal enforcement
      const isHomeFoul = Math.random() < (currentHomeTactics.pressingIntensity === 'high' ? 0.60 : 0.45);
      if (isHomeFoul) {
        homeFouls++;
        if (Math.random() < 0.26) {
          homeYellowCards++;
          const p = pickPlayerByPosition(homeActivePlayers, 'DEF', 'MID');
          if (updatedHomeYellowed.includes(p.id)) {
            // Second yellow -> RED CARD!
            homeRedCards++;
            activeHomeLineup = activeHomeLineup.filter(id => id !== p.id);
            updatedHomeRedded.push(p.id);
            newEvents.push({
              minute: nextMinute,
              type: 'red_card',
              teamId: prevState.homeTeam.id,
              playerId: p.id,
              playerName: p.name,
              description: `🟥 الإنذار الثاني والطرد! الحكم يشهر البطاقة الصفراء الثانية ثم الحمراء في وجه اللاعب (${p.name}) من ${prevState.homeTeam.shortName} ليكمل الفريق المباراة بعشرة لاعبين!`
            });
          } else {
            updatedHomeYellowed.push(p.id);
            newEvents.push({
              minute: nextMinute,
              type: 'yellow_card',
              teamId: prevState.homeTeam.id,
              playerId: p.id,
              playerName: p.name,
              description: `🟨 بطاقة صفراء على اللاعب (${p.name}) من ${prevState.homeTeam.shortName} بعد تدخل قوي لإيقاف انطلاقة المنافس.`
            });
          }
        }
      } else {
        awayFouls++;
        if (Math.random() < 0.26) {
          awayYellowCards++;
          const p = pickPlayerByPosition(awayActivePlayers, 'DEF', 'MID');
          if (updatedAwayYellowed.includes(p.id)) {
            // Second yellow -> RED CARD!
            awayRedCards++;
            activeAwayLineup = activeAwayLineup.filter(id => id !== p.id);
            updatedAwayRedded.push(p.id);
            newEvents.push({
              minute: nextMinute,
              type: 'red_card',
              teamId: prevState.awayTeam.id,
              playerId: p.id,
              playerName: p.name,
              description: `🟥 الإنذار الثاني والطرد! الحكم يشهر البطاقة الحمراء للاعب (${p.name}) من ${prevState.awayTeam.shortName} ليكمل فريقه المباراة بنقص عددي!`
            });
          } else {
            updatedAwayYellowed.push(p.id);
            newEvents.push({
              minute: nextMinute,
              type: 'yellow_card',
              teamId: prevState.awayTeam.id,
              playerId: p.id,
              playerName: p.name,
              description: `🟨 إنذار أصفر للاعب (${p.name}) من ${prevState.awayTeam.shortName} بسبب عرقلة واضحة.`
            });
          }
        }
      }
    } else if (subRoll < 0.12) {
      // Corner kick
      const isHomeCorner = Math.random() > 0.48;
      if (isHomeCorner) homeCorners++;
      else awayCorners++;

      // Corner header chance (~4.5% of corners score in professional football)
      if (Math.random() < 0.045) {
        const cornerTeam = isHomeCorner ? prevState.homeTeam : prevState.awayTeam;
        const cornerPlayers = isHomeCorner ? homeActivePlayers : awayActivePlayers;
        const header = pickCornerHeader(cornerPlayers);

        if (isHomeCorner) {
          homeShots++;
          homeShotsOnTarget++;
          homeScore++;
          homeXg += 0.22;
        } else {
          awayShots++;
          awayShotsOnTarget++;
          awayScore++;
          awayXg += 0.22;
        }

        newEvents.push({
          minute: nextMinute,
          type: 'goal',
          teamId: cornerTeam.id,
          playerId: header.id,
          playerName: header.name,
          description: `🎯 جوووول من ضربة ركنية نموذجية! ارتقاء هائل وضربة رأس قوية من المدافع (${header.name}) تباغت الحارس في الشباك!`
        });
      }
    } else if (subRoll < 0.16) {
      // General tactical commentary
      newEvents.push({
        minute: nextMinute,
        type: 'commentary',
        teamId: Math.random() > 0.5 ? prevState.homeTeam.id : prevState.awayTeam.id,
        description: GENERAL_COMMENTARIES[Math.floor(Math.random() * GENERAL_COMMENTARIES.length)]
      });
    }
  }

  // 4. Tactical Stamina Drain (Influenced by pressing, tempo, natural player physicality, and crowd boost)
  const updatedHomeFatigue = { ...prevState.homeFatigueMap };
  const updatedAwayFatigue = { ...prevState.awayFatigueMap };
  
  let baseHomeDrain = 0.24 * homeSynergy.staminaDrainMult;
  if (currentHomeTactics.pressingIntensity === 'gegenpress') baseHomeDrain = 0.40 * homeSynergy.staminaDrainMult;
  else if (currentHomeTactics.pressingIntensity === 'high') baseHomeDrain = 0.33 * homeSynergy.staminaDrainMult;
  else if (currentHomeTactics.pressingIntensity === 'low') baseHomeDrain = 0.17 * homeSynergy.staminaDrainMult;
  if (currentHomeTactics.tempo === 'fast') baseHomeDrain += 0.04;
  else if (currentHomeTactics.tempo === 'slow') baseHomeDrain -= 0.03;

  let baseAwayDrain = 0.24 * awaySynergy.staminaDrainMult;
  if (currentAwayTactics.pressingIntensity === 'gegenpress') baseAwayDrain = 0.40 * awaySynergy.staminaDrainMult;
  else if (currentAwayTactics.pressingIntensity === 'high') baseAwayDrain = 0.33 * awaySynergy.staminaDrainMult;
  else if (currentAwayTactics.pressingIntensity === 'low') baseAwayDrain = 0.17 * awaySynergy.staminaDrainMult;
  if (currentAwayTactics.tempo === 'fast') baseAwayDrain += 0.04;
  else if (currentAwayTactics.tempo === 'slow') baseAwayDrain -= 0.03;

  const homePressingDrain = Math.max(0.12, baseHomeDrain * (1 - homeStaffBonuses.staminaDrainReduction - crowdAdvantage.staminaBuffer));
  const awayPressingDrain = Math.max(0.14, baseAwayDrain * (1 - awayStaffBonuses.staminaDrainReduction));

  activeHomeLineup.forEach(id => {
    const pObj = prevState.homeTeam?.players?.find(p => p && p.id === id);
    const isGK = pObj?.positionCategory === 'GK';
    const physicalStaminaBonus = ((pObj?.attributes?.physical || 65) - 65) * 0.002;
    const drain = isGK ? 0.04 : Math.max(0.10, homePressingDrain - physicalStaminaBonus);
    const currentVal = updatedHomeFatigue[id] ?? pObj?.fitness ?? 95;
    updatedHomeFatigue[id] = Math.max(25, Number((currentVal - drain).toFixed(1)));
  });

  activeAwayLineup.forEach(id => {
    const pObj = prevState.awayTeam?.players?.find(p => p && p.id === id);
    const isGK = pObj?.positionCategory === 'GK';
    const physicalStaminaBonus = ((pObj?.attributes?.physical || 65) - 65) * 0.002;
    const drain = isGK ? 0.04 : Math.max(0.12, awayPressingDrain - physicalStaminaBonus);
    const currentVal = updatedAwayFatigue[id] ?? pObj?.fitness ?? 95;
    updatedAwayFatigue[id] = Math.max(25, Number((currentVal - drain).toFixed(1)));
  });

  return {
    ...prevState,
    currentMinute: nextMinute,
    homeScore,
    awayScore,
    events: [...prevState.events, ...newEvents].sort((a, b) => a.minute - b.minute),
    stats: {
      homeShots,
      awayShots,
      homeShotsOnTarget,
      awayShotsOnTarget,
      homePossession,
      awayPossession,
      homeFouls,
      awayFouls,
      homeCorners,
      awayCorners,
      homeYellowCards,
      awayYellowCards,
      homeRedCards,
      awayRedCards,
    },
    homeLineup: activeHomeLineup,
    awayLineup: activeAwayLineup,
    homeTactics: currentHomeTactics,
    awayTactics: currentAwayTactics,
    homeXg: Number(homeXg.toFixed(2)),
    awayXg: Number(awayXg.toFixed(2)),
    homeDangerousAttacks,
    awayDangerousAttacks,
    homeYellowedPlayerIds: updatedHomeYellowed,
    awayYellowedPlayerIds: updatedAwayYellowed,
    homeReddedPlayerIds: updatedHomeRedded,
    awayReddedPlayerIds: updatedAwayRedded,
    homeFatigueMap: updatedHomeFatigue,
    awayFatigueMap: updatedAwayFatigue,
    aiSubstitutionsCount: aiSubsCount,
    substitutionsCount: userSubsCount,
    autoSubsEnabled: prevState.autoSubsEnabled ?? true,
    userClubId: prevState.userClubId,
  };
}

/**
 * Runs a complete 90-minute event-by-event match simulation for background/AI matches
 * Uses the exact same realistic attribute-driven engine!
 */
export function simulateMatch(
  homeTeam?: Club,
  awayTeam?: Club,
  homeTactics?: TeamTactics,
  awayTactics?: TeamTactics
): { homeScore: number; awayScore: number; events: MatchEvent[]; stats: MatchStats } {
  const safeHome: Club = homeTeam || ({
    id: 'team_home_safe',
    name: 'الفريق المضيف',
    shortName: 'مض',
    primaryColor: '#1e293b',
    secondaryColor: '#ffffff',
    budget: 1000000,
    transferBudget: 500000,
    wageBudgetMonthly: 50000,
    reputation: 50,
    players: [],
    division: 1,
    city: 'القاهرة',
    isUserClub: false,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [],
  } as unknown as Club);
  const safeAway: Club = awayTeam || ({
    id: 'team_away_safe',
    name: 'الفريق الضيف',
    shortName: 'ضف',
    primaryColor: '#334155',
    secondaryColor: '#ffffff',
    budget: 1000000,
    transferBudget: 500000,
    wageBudgetMonthly: 50000,
    reputation: 50,
    players: [],
    division: 1,
    city: 'الإسكندرية',
    isUserClub: false,
    facilities: { stadium: 1, youthAcademy: 1, trainingCenter: 1, medicalCenter: 1 },
    sponsors: [],
  } as unknown as Club);

  const dummyFixture: Fixture = {
    id: `sim_fix_${Date.now()}_${Math.random()}`,
    round: 1,
    homeTeamId: safeHome.id,
    awayTeamId: safeAway.id,
    isPlayed: false,
  };

  let state = createInitialLiveMatchState(dummyFixture, safeHome, safeAway, homeTactics || safeHome.tactics);
  if (homeTactics) state.homeTactics = homeTactics;
  if (awayTactics) state.awayTactics = awayTactics;

  // Run through all 90 minutes event-by-event
  for (let min = 1; min <= 90; min++) {
    // At halftime (min 45), automatically resume to 2nd half
    if (state.isHalfTime) {
      state.isHalfTime = false;
    }
    state = simulateMatchStep(state);
  }

  // Ensure reasonable minimum stats
  state.stats.homeShots = Math.max(state.stats.homeShots, state.homeScore + Math.floor(Math.random() * 4 + 2));
  state.stats.awayShots = Math.max(state.stats.awayShots, state.awayScore + Math.floor(Math.random() * 4 + 2));
  state.stats.homeShotsOnTarget = Math.max(state.stats.homeShotsOnTarget, state.homeScore + 1);
  state.stats.awayShotsOnTarget = Math.max(state.stats.awayShotsOnTarget, state.awayScore + 1);
  state.stats.homeCorners = Math.max(state.stats.homeCorners, Math.floor(Math.random() * 5 + 1));
  state.stats.awayCorners = Math.max(state.stats.awayCorners, Math.floor(Math.random() * 5 + 1));

  return {
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    events: state.events,
    stats: state.stats,
  };
}

/**
 * Strictly picks an OUTFIELD player to score a goal.
 * GOALKEEPERS ARE ABSOLUTELY FORBIDDEN FROM SCORING.
 * Distribution:
 * - FWD (Strikers / Wingers): ~75% weight
 * - MID (Midfielders): ~20% weight
 * - DEF (Defenders): ~5% weight
 * - GK (Goalkeeper): 0% (NEVER)
 */
export function pickGoalScorer(players: Player[]): Player {
  // 1. Strictly exclude goalkeepers
  const outfield = (players || []).filter(p =>
    Boolean(p && p.id && p.positionCategory !== 'GK' && p.position !== 'GK')
  );

  if (outfield.length === 0) {
    return {
      id: `p_striker_${Math.floor(Math.random() * 10000)}`,
      name: 'مهاجم الفريق',
      position: 'ST',
      positionCategory: 'FWD',
      overallRating: 68,
      potentialRating: 72,
      number: 9,
      age: 23,
      nationality: 'مصر',
      fitness: 100,
      morale: 80,
      form: 7.0,
      marketValue: 50000,
      salary: 2000,
      contractYears: 2,
      attributes: { pace: 70, shooting: 70, passing: 65, dribbling: 68, defending: 40, physical: 65 },
      stats: { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0, averageRating: 7.0, motm: 0 }
    };
  }

  const fwds = outfield.filter(p => p.positionCategory === 'FWD');
  const mids = outfield.filter(p => p.positionCategory === 'MID');
  const defs = outfield.filter(p => p.positionCategory === 'DEF');

  const roll = Math.random();
  // 75% chance for a Forward if available
  if (roll < 0.75 && fwds.length > 0) {
    return fwds[Math.floor(Math.random() * fwds.length)];
  }
  // 20% chance for a Midfielder if available
  if (roll < 0.95 && mids.length > 0) {
    return mids[Math.floor(Math.random() * mids.length)];
  }
  // 5% chance for a Defender if available
  if (defs.length > 0) {
    return defs[Math.floor(Math.random() * defs.length)];
  }
  if (fwds.length > 0) return fwds[Math.floor(Math.random() * fwds.length)];
  if (mids.length > 0) return mids[Math.floor(Math.random() * mids.length)];
  return outfield[Math.floor(Math.random() * outfield.length)];
}

/**
 * Strictly picks an OUTFIELD player to assist a goal.
 * GOALKEEPERS ARE ABSOLUTELY FORBIDDEN FROM ASSISTING.
 */
export function pickAssister(players: Player[], scorerId?: string): Player | undefined {
  const outfield = (players || []).filter(p =>
    Boolean(p && p.id && (!scorerId || p.id !== scorerId) && p.positionCategory !== 'GK' && p.position !== 'GK')
  );

  if (outfield.length === 0) return undefined;
  // In ~20% of goals, there is no direct assist (solo effort, rebound, penalty, etc.)
  if (Math.random() < 0.20) return undefined;

  const mids = outfield.filter(p => p.positionCategory === 'MID');
  const fwds = outfield.filter(p => p.positionCategory === 'FWD');
  const defs = outfield.filter(p => p.positionCategory === 'DEF');

  const roll = Math.random();
  // Midfielders provide the majority of assists (~60%)
  if (roll < 0.60 && mids.length > 0) {
    return mids[Math.floor(Math.random() * mids.length)];
  }
  // Forwards provide ~28% of assists (wingers, cutbacks)
  if (roll < 0.88 && fwds.length > 0) {
    return fwds[Math.floor(Math.random() * fwds.length)];
  }
  // Fullbacks / defenders provide ~12% (crosses)
  if (defs.length > 0) {
    return defs[Math.floor(Math.random() * defs.length)];
  }
  return outfield[Math.floor(Math.random() * outfield.length)];
}

/**
 * Strictly picks an OUTFIELD player for a corner header goal (Defenders / Strikers).
 * GOALKEEPERS ARE ABSOLUTELY FORBIDDEN FROM SCORING.
 */
export function pickCornerHeader(players: Player[]): Player {
  const outfield = (players || []).filter(p =>
    Boolean(p && p.id && p.positionCategory !== 'GK' && p.position !== 'GK')
  );
  if (outfield.length === 0) return pickGoalScorer(players);

  const defs = outfield.filter(p => p.positionCategory === 'DEF');
  const fwds = outfield.filter(p => p.positionCategory === 'FWD');
  const mids = outfield.filter(p => p.positionCategory === 'MID');

  // Tall CBs and Strikers score corner headers
  if (Math.random() < 0.65 && defs.length > 0) {
    return defs[Math.floor(Math.random() * defs.length)];
  }
  if (fwds.length > 0) {
    return fwds[Math.floor(Math.random() * fwds.length)];
  }
  if (defs.length > 0) {
    return defs[Math.floor(Math.random() * defs.length)];
  }
  return mids[Math.floor(Math.random() * mids.length)] || outfield[0];
}

function pickPlayerByPosition(players: Player[], primary: 'FWD' | 'MID' | 'DEF' | 'GK', secondary?: 'FWD' | 'MID' | 'DEF'): Player {
  if (!players || players.length === 0) {
    return {
      id: `p_dummy_${Math.random()}`,
      name: 'لاعب الفريق',
      position: primary === 'GK' ? 'GK' : 'ST',
      positionCategory: primary,
      overallRating: 65,
      potentialRating: 70,
      number: primary === 'GK' ? 1 : 9,
      age: 24,
      nationality: 'مصر',
      fitness: 100,
      morale: 80,
      form: 7.0,
      marketValue: 50000,
      salary: 2000,
      contractYears: 2,
      attributes: { pace: 65, shooting: 65, passing: 65, dribbling: 65, defending: 65, physical: 65 },
      stats: { appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0, averageRating: 7.0, motm: 0 }
    };
  }

  const primaryMatches = players.filter(p => p.positionCategory === primary);
  if (primaryMatches.length > 0) {
    return primaryMatches[Math.floor(Math.random() * primaryMatches.length)];
  }

  if (secondary) {
    const secondaryMatches = players.filter(p => p.positionCategory === secondary);
    if (secondaryMatches.length > 0) {
      return secondaryMatches[Math.floor(Math.random() * secondaryMatches.length)];
    }
  }

  // If primary was not GK, NEVER return a GK in the fallback
  if (primary !== 'GK') {
    const outfieldOnly = players.filter(p => p.positionCategory !== 'GK' && p.position !== 'GK');
    if (outfieldOnly.length > 0) {
      return outfieldOnly[Math.floor(Math.random() * outfieldOnly.length)];
    }
  }

  return players[Math.floor(Math.random() * players.length)];
}

export function updateLeagueStandings(
  standings: LeagueStanding[],
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number
): LeagueStanding[] {
  return standings.map(standing => {
    if (standing.teamId === homeTeamId) {
      const isWin = homeScore > awayScore;
      const isDraw = homeScore === awayScore;
      const isLoss = homeScore < awayScore;
      const formResult: 'W' | 'D' | 'L' = isWin ? 'W' : isDraw ? 'D' : 'L';
      const prevForm = Array.isArray(standing.form) ? standing.form : [];

      return {
        ...standing,
        played: (standing.played || 0) + 1,
        won: (standing.won || 0) + (isWin ? 1 : 0),
        drawn: (standing.drawn || 0) + (isDraw ? 1 : 0),
        lost: (standing.lost || 0) + (isLoss ? 1 : 0),
        goalsFor: (standing.goalsFor || 0) + homeScore,
        goalsAgainst: (standing.goalsAgainst || 0) + awayScore,
        goalDifference: ((standing.goalsFor || 0) + homeScore) - ((standing.goalsAgainst || 0) + awayScore),
        points: (standing.points || 0) + (isWin ? 3 : isDraw ? 1 : 0),
        form: [...prevForm.slice(-4), formResult],
      };
    }

    if (standing.teamId === awayTeamId) {
      const isWin = awayScore > homeScore;
      const isDraw = homeScore === awayScore;
      const isLoss = awayScore < homeScore;
      const formResult: 'W' | 'D' | 'L' = isWin ? 'W' : isDraw ? 'D' : 'L';
      const prevForm = Array.isArray(standing.form) ? standing.form : [];

      return {
        ...standing,
        played: (standing.played || 0) + 1,
        won: (standing.won || 0) + (isWin ? 1 : 0),
        drawn: (standing.drawn || 0) + (isDraw ? 1 : 0),
        lost: (standing.lost || 0) + (isLoss ? 1 : 0),
        goalsFor: (standing.goalsFor || 0) + awayScore,
        goalsAgainst: (standing.goalsAgainst || 0) + homeScore,
        goalDifference: ((standing.goalsFor || 0) + awayScore) - ((standing.goalsAgainst || 0) + homeScore),
        points: (standing.points || 0) + (isWin ? 3 : isDraw ? 1 : 0),
        form: [...prevForm.slice(-4), formResult],
      };
    }

    return standing;
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}

export interface MatchParticipationInfo {
  homeTeam: Club;
  awayTeam: Club;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  homeStartingPlayerIds?: string[];
  awayStartingPlayerIds?: string[];
}

/**
 * Authoritatively calculates and updates all player statistics after a completed match
 */
export function updatePlayersForCompletedMatch(
  team: Club,
  isHome: boolean,
  matchInfo: MatchParticipationInfo
): Player[] {
  const teamScore = isHome ? matchInfo.homeScore : matchInfo.awayScore;
  const oppScore = isHome ? matchInfo.awayScore : matchInfo.homeScore;
  const isWin = teamScore > oppScore;
  const isDraw = teamScore === oppScore;

  const squadPlayers = Array.isArray(team?.players) ? team.players.filter(Boolean) : [];
  const defaultStarterIds = squadPlayers.slice(0, 11).map(p => p?.id).filter(Boolean);
  const startingIds = (isHome ? matchInfo.homeStartingPlayerIds : matchInfo.awayStartingPlayerIds) || team?.tactics?.startingPlayerIds || defaultStarterIds;

  const subInEvents = (matchInfo.events || []).filter(e => e.type === 'substitution' && e.teamId === team?.id);
  const subInPlayerNames = new Set(subInEvents.map(e => e.inPlayerName));

  let bestPlayerId = '';
  let highestCalculatedScore = -1;

  const preCalculatedRatings: { playerId: string; rating: number; minutes: number }[] = [];

  squadPlayers.forEach(p => {
    if (!p || !p.id) return;
    const isStarter = startingIds.includes(p.id);
    const isSubIn = subInPlayerNames.has(p.name);
    if (!isStarter && !isSubIn) return;

    let minutesPlayed = 0;
    if (isStarter) {
      const subbedOutEvt = subInEvents.find(e => e.outPlayerName === p.name);
      minutesPlayed = subbedOutEvt ? subbedOutEvt.minute : 90;
    } else if (isSubIn) {
      const subbedInEvt = subInEvents.find(e => e.inPlayerName === p.name);
      minutesPlayed = subbedInEvt ? Math.max(1, 90 - subbedInEvt.minute) : 25;
    }

    const playerGoals = matchInfo.events.filter(e => e.type === 'goal' && (e.playerId === p.id || e.playerName === p.name)).length;
    const playerAssists = matchInfo.events.filter(e => e.type === 'goal' && (e.assistPlayerId === p.id || e.assistPlayerName === p.name)).length;
    const playerYellows = matchInfo.events.filter(e => e.type === 'yellow_card' && (e.playerId === p.id || e.playerName === p.name)).length;
    const playerReds = matchInfo.events.filter(e => e.type === 'red_card' && (e.playerId === p.id || e.playerName === p.name)).length;

    let baseRating = isWin ? 7.4 : isDraw ? 6.8 : 6.1;
    if (!isStarter) baseRating = 6.4;

    baseRating += playerGoals * 1.1;
    baseRating += playerAssists * 0.7;
    baseRating -= playerYellows * 0.4;
    baseRating -= playerReds * 1.5;

    if (p.positionCategory === 'GK') {
      if (oppScore === 0 && minutesPlayed >= 45) baseRating += 1.0;
      else if (oppScore <= 1) baseRating += 0.4;
      else if (oppScore >= 3) baseRating -= 0.6;
    } else if (p.positionCategory === 'DEF') {
      if (oppScore === 0 && minutesPlayed >= 45) baseRating += 0.7;
      else if (oppScore >= 3) baseRating -= 0.5;
    }

    const matchRating = Math.min(10.0, Math.max(3.5, Number(baseRating.toFixed(1))));
    preCalculatedRatings.push({ playerId: p.id, rating: matchRating, minutes: minutesPlayed });

    if (matchRating > highestCalculatedScore) {
      highestCalculatedScore = matchRating;
      bestPlayerId = p.id;
    }
  });

  return squadPlayers.map(p => {
    if (!p || !p.id) return p;
    const matchData = preCalculatedRatings.find(r => r.playerId === p.id);
    const didParticipate = !matchData;
    const isStarter = startingIds.includes(p.id);

    const prevStats = p.stats || {
      appearances: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      tackles: 0,
      saves: 0,
      averageRating: 7.0,
      motm: 0,
    };

    if (!didParticipate || !matchData) {
      const recoveredFitness = Math.min(100, p.fitness + 8);
      return {
        ...p,
        fitness: recoveredFitness,
      };
    }

    const minutesPlayed = matchData.minutes;
    const matchRating = matchData.rating;

    const playerGoals = matchInfo.events.filter(e => e.type === 'goal' && (e.playerId === p.id || e.playerName === p.name)).length;
    const playerAssists = matchInfo.events.filter(e => e.type === 'goal' && (e.assistPlayerId === p.id || e.assistPlayerName === p.name)).length;
    const playerYellows = matchInfo.events.filter(e => e.type === 'yellow_card' && (e.playerId === p.id || e.playerName === p.name)).length;
    const playerReds = matchInfo.events.filter(e => e.type === 'red_card' && (e.playerId === p.id || e.playerName === p.name)).length;

    const minFactor = minutesPlayed / 90;
    let matchShots = 0;
    let matchShotsOnTarget = 0;
    let matchPasses = 0;
    let matchTackles = 0;
    let matchSaves = 0;

    if (p.positionCategory === 'FWD') {
      matchShots = playerGoals + Math.floor(Math.random() * 3 + 1);
      matchShotsOnTarget = playerGoals + (matchShots > playerGoals ? Math.floor(Math.random() * 2) : 0);
      matchPasses = Math.round((20 + Math.random() * 15) * minFactor);
      matchTackles = Math.floor(Math.random() * 2 * minFactor);
    } else if (p.positionCategory === 'MID') {
      matchShots = playerGoals + (Math.random() < 0.6 ? 1 : 0);
      matchShotsOnTarget = playerGoals + (matchShots > playerGoals && Math.random() < 0.5 ? 1 : 0);
      matchPasses = Math.round((38 + Math.random() * 25) * minFactor);
      matchTackles = Math.round((2 + Math.random() * 4) * minFactor);
    } else if (p.positionCategory === 'DEF') {
      matchShots = playerGoals;
      matchShotsOnTarget = playerGoals;
      matchPasses = Math.round((30 + Math.random() * 18) * minFactor);
      matchTackles = Math.round((3 + Math.random() * 5) * minFactor);
    } else if (p.positionCategory === 'GK') {
      matchPasses = Math.round((16 + Math.random() * 10) * minFactor);
      const oppShotsOnTarget = isHome ? matchInfo.stats.awayShotsOnTarget : matchInfo.stats.homeShotsOnTarget;
      matchSaves = Math.max(0, oppShotsOnTarget - oppScore);
    }

    const isCleanSheet = (p.positionCategory === 'GK' || p.positionCategory === 'DEF') && oppScore === 0 && minutesPlayed >= 45;
    const isMotm = (p.id === bestPlayerId && matchRating >= 7.8) ? 1 : 0;

    const currentApps = prevStats.appearances || 0;
    const currentAvg = prevStats.averageRating || 7.0;
    const newAverageRating = Number(((currentAvg * currentApps + matchRating) / (currentApps + 1)).toFixed(2));

    const staminaDrain = Math.round((12 + Math.random() * 6) * minFactor);
    const newFitness = Math.min(100, Math.max(35, p.fitness - staminaDrain));
    const moraleChange = isWin ? +5 : isDraw ? +1 : -3;
    const newMorale = Math.min(100, Math.max(25, p.morale + moraleChange));

    // Strict safeguard: Goalkeepers NEVER accumulate goals or assists
    const verifiedGoals = (p.positionCategory === 'GK' || p.position === 'GK') ? 0 : playerGoals;
    const verifiedAssists = (p.positionCategory === 'GK' || p.position === 'GK') ? 0 : playerAssists;

    return {
      ...p,
      fitness: newFitness,
      morale: newMorale,
      form: Number(((p.form * 0.7) + (matchRating * 0.3)).toFixed(1)),
      stats: {
        appearances: currentApps + 1,
        starts: (prevStats.starts || 0) + (isStarter ? 1 : 0),
        minutes: (prevStats.minutes || 0) + minutesPlayed,
        goals: (prevStats.goals || 0) + verifiedGoals,
        assists: (prevStats.assists || 0) + verifiedAssists,
        cleanSheets: (prevStats.cleanSheets || 0) + (isCleanSheet ? 1 : 0),
        yellowCards: (prevStats.yellowCards || 0) + playerYellows,
        redCards: (prevStats.redCards || 0) + playerReds,
        shots: (prevStats.shots || 0) + matchShots,
        shotsOnTarget: (prevStats.shotsOnTarget || 0) + matchShotsOnTarget,
        passes: (prevStats.passes || 0) + matchPasses,
        tackles: (prevStats.tackles || 0) + matchTackles,
        saves: (prevStats.saves || 0) + matchSaves,
        averageRating: newAverageRating,
        motm: (prevStats.motm || 0) + isMotm,
      },
    };
  });
}
