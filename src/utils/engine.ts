import { Club, Fixture, LeagueStanding, MatchEvent, MatchStats, Player, TeamTactics, ClubManager, ManagerProfile, ActiveTrainingBoost } from '../types/game';
import { AdManager } from '../services/adManager';

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
  events: MatchEvent[];
  stats: MatchStats;
  isPlaying: boolean;
  isFinished: boolean;
  isHalfTime: boolean;
  speed: 1 | 2 | 4;
  substitutionsCount: number;
  userTacticsSnapshot?: TeamTactics;
  
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
      managerRating: mgrRating
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
      managerRating: mgrRating
    };
  }

  let atkSum = 0, atkCount = 0;
  let midSum = 0, midCount = 0;
  let defSum = 0, defCount = 0;
  let gkOverall = 50;
  let totalRatingSum = 0;

  const fitnessBoostMultiplier = trainingBoost?.type === 'fitness' ? 1.05 : 1.0;

  startingPlayers.forEach(p => {
    // Morale & fitness multiplier (0.75 to 1.1)
    const factor = (0.75 + ((p.fitness * fitnessBoostMultiplier) / 250) + (p.morale / 350));
    totalRatingSum += p.overallRating;

    if (p.positionCategory === 'FWD') {
      atkSum += (p.attributes.shooting * 0.6 + p.attributes.pace * 0.4) * factor;
      atkCount++;
    } else if (p.positionCategory === 'MID') {
      midSum += (p.attributes.passing * 0.4 + p.attributes.dribbling * 0.3 + p.attributes.defending * 0.3) * factor;
      midCount++;
    } else if (p.positionCategory === 'DEF') {
      defSum += (p.attributes.defending * 0.6 + p.attributes.physical * 0.4) * factor;
      defCount++;
    } else if (p.positionCategory === 'GK') {
      gkOverall = (p.attributes.goalkeeping || p.overallRating) * factor;
    }
  });

  const rawSquadStrength = Math.round(totalRatingSum / startingPlayers.length);
  
  // Tactical Manager Influence Factor (+- 15% influence on raw pitch execution)
  // Higher rated managers organize better transitions, defense and set pieces
  let managerBoost = (mgrRating - 65) * 0.18;
  if (trainingBoost?.type === 'tactical') {
    managerBoost += 3; // +5% tactical implementation efficiency
  }

  let attack = Math.max(30, Math.min(99, Math.round((atkCount > 0 ? atkSum / atkCount : 50) + managerBoost)));
  let midfield = Math.max(30, Math.min(99, Math.round((midCount > 0 ? midSum / midCount : 50) + managerBoost)));
  let defense = Math.max(30, Math.min(99, Math.round(((defCount > 0 ? defSum / defCount : 50) * 0.7 + gkOverall * 0.3) + managerBoost)));
  
  if (trainingBoost?.type === 'attacking') {
    attack = Math.min(99, Math.round(attack * 1.05)); // +5% attacking efficiency
  }
  if (trainingBoost?.type === 'defensive') {
    defense = Math.min(99, Math.round(defense * 1.05)); // +5% defensive solidity
  }
  if (trainingBoost?.type === 'tactical') {
    midfield = Math.min(99, Math.round(midfield * 1.05)); // +5% tactical midfield dominance
  }

  // Overall is composed of 75% Player Quality (تشكيلة اللاعبين) + 25% Manager Rating (قوة وخبرة المدرب)
  const squadOverall = Math.round((attack + midfield + defense) / 3);
  const overall = Math.max(35, Math.min(99, Math.round(squadOverall * 0.75 + mgrRating * 0.25)));

  return { 
    attack, 
    midfield, 
    defense, 
    overall,
    squadStrength: rawSquadStrength,
    managerRating: mgrRating
  };
}

/**
 * Tactical Counter-Relationship & Matchup Matrix
 */
export function calculateTacticalMatchup(
  homeTactics: TeamTactics,
  awayTactics: TeamTactics
): { homeAttackMod: number; homeDefenseMod: number; homeMidfieldMod: number; awayAttackMod: number; awayDefenseMod: number; awayMidfieldMod: number } {
  let homeAttackMod = 1.0;
  let homeDefenseMod = 1.0;
  let homeMidfieldMod = 1.0;
  let awayAttackMod = 1.0;
  let awayDefenseMod = 1.0;
  let awayMidfieldMod = 1.0;

  // 1. Mentality Impact
  if (homeTactics.mentality === 'ultra_attacking') { homeAttackMod *= 1.30; homeDefenseMod *= 0.75; }
  else if (homeTactics.mentality === 'attacking') { homeAttackMod *= 1.15; homeDefenseMod *= 0.90; }
  else if (homeTactics.mentality === 'defensive') { homeAttackMod *= 0.85; homeDefenseMod *= 1.20; }
  else if (homeTactics.mentality === 'ultra_defensive') { homeAttackMod *= 0.65; homeDefenseMod *= 1.35; }

  if (awayTactics.mentality === 'ultra_attacking') { awayAttackMod *= 1.30; awayDefenseMod *= 0.75; }
  else if (awayTactics.mentality === 'attacking') { awayAttackMod *= 1.15; awayDefenseMod *= 0.90; }
  else if (awayTactics.mentality === 'defensive') { awayAttackMod *= 0.85; awayDefenseMod *= 1.20; }
  else if (awayTactics.mentality === 'ultra_defensive') { awayAttackMod *= 0.65; awayDefenseMod *= 1.35; }

  // 2. Pressing Intensity & Turnover Matrix
  if (homeTactics.pressingIntensity === 'high') {
    homeMidfieldMod *= 1.12;
    // High pressing exposes defensive transition against fast counter attacks
    if (awayTactics.passingStyle === 'direct' || awayTactics.mentality === 'attacking') {
      awayAttackMod *= 1.10;
    }
  } else if (homeTactics.pressingIntensity === 'low') {
    homeDefenseMod *= 1.08;
    homeMidfieldMod *= 0.92;
  }

  if (awayTactics.pressingIntensity === 'high') {
    awayMidfieldMod *= 1.12;
    if (homeTactics.passingStyle === 'direct' || homeTactics.mentality === 'attacking') {
      homeAttackMod *= 1.10;
    }
  } else if (awayTactics.pressingIntensity === 'low') {
    awayDefenseMod *= 1.08;
    awayMidfieldMod *= 0.92;
  }

  // 3. Formation Matchups
  // 3-5-2 overloads central midfield vs 4-4-2
  if (homeTactics.formation === '3-5-2' && awayTactics.formation === '4-4-2') {
    homeMidfieldMod *= 1.10;
  } else if (awayTactics.formation === '3-5-2' && homeTactics.formation === '4-4-2') {
    awayMidfieldMod *= 1.10;
  }

  // 4-3-3 wide wingers attack vulnerable 3-defender formations (3-5-2)
  if (homeTactics.formation === '4-3-3' && awayTactics.formation === '3-5-2') {
    homeAttackMod *= 1.08;
  } else if (awayTactics.formation === '4-3-3' && homeTactics.formation === '3-5-2') {
    awayAttackMod *= 1.08;
  }

  // 5-3-2 low block stiffens defense against 4-3-3
  if (homeTactics.formation === '5-3-2' && awayTactics.formation === '4-3-3') {
    homeDefenseMod *= 1.12;
  } else if (awayTactics.formation === '5-3-2' && homeTactics.formation === '4-3-3') {
    awayDefenseMod *= 1.12;
  }

  return {
    homeAttackMod,
    homeDefenseMod,
    homeMidfieldMod,
    awayAttackMod,
    awayDefenseMod,
    awayMidfieldMod,
  };
}

/**
 * Initializes a new Live Simulation State
 */
export function createInitialLiveMatchState(
  fixture: Fixture,
  homeTeam: Club,
  awayTeam: Club,
  userTactics?: TeamTactics
): LiveSimulationState {
  const homePlayers = Array.isArray(homeTeam?.players) ? homeTeam.players : [];
  const awayPlayers = Array.isArray(awayTeam?.players) ? awayTeam.players : [];

  const defaultHomeIds = (homeTeam?.isUserClub && userTactics)
    ? userTactics.startingPlayerIds
    : homeTeam?.tactics?.startingPlayerIds || homePlayers.slice(0, 11).map(p => p.id);

  const defaultAwayIds = (awayTeam?.isUserClub && userTactics)
    ? userTactics.startingPlayerIds
    : awayTeam?.tactics?.startingPlayerIds || awayPlayers.slice(0, 11).map(p => p.id);

  const defaultHomeTactics: TeamTactics = (homeTeam?.isUserClub && userTactics)
    ? userTactics
    : homeTeam?.tactics || {
        formation: '4-3-3',
        mentality: 'balanced',
        passingStyle: 'short',
        pressingIntensity: 'balanced',
        tempo: 'balanced',
        startingPlayerIds: defaultHomeIds,
        benchPlayerIds: homePlayers.slice(11, 18).map(p => p.id),
        captainId: defaultHomeIds[0] || '',
        penaltyTakerId: defaultHomeIds[defaultHomeIds.length - 1] || '',
        freeKickTakerId: defaultHomeIds[0] || '',
        cornerTakerId: defaultHomeIds[1] || '',
      };

  const defaultAwayTactics: TeamTactics = (awayTeam?.isUserClub && userTactics)
    ? userTactics
    : awayTeam?.tactics || {
        formation: '4-4-2',
        mentality: 'balanced',
        passingStyle: 'short',
        pressingIntensity: 'balanced',
        tempo: 'balanced',
        startingPlayerIds: defaultAwayIds,
        benchPlayerIds: awayPlayers.slice(11, 18).map(p => p.id),
        captainId: defaultAwayIds[0] || '',
        penaltyTakerId: defaultAwayIds[defaultAwayIds.length - 1] || '',
        freeKickTakerId: defaultAwayIds[0] || '',
        cornerTakerId: defaultAwayIds[1] || '',
      };

  const homeFatigue: Record<string, number> = {};
  homePlayers.forEach(p => { homeFatigue[p.id] = p.fitness; });

  const awayFatigue: Record<string, number> = {};
  awayPlayers.forEach(p => { awayFatigue[p.id] = p.fitness; });

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
    return {
      ...prevState,
      currentMinute: 90,
      isFinished: true,
      isPlaying: false,
      isHalfTime: false,
    };
  }

  // Update active tactics if user made live changes
  let currentHomeTactics = prevState.homeTeam.isUserClub && liveUserTactics ? liveUserTactics : prevState.homeTactics;
  let currentAwayTactics = prevState.awayTeam.isUserClub && liveUserTactics ? liveUserTactics : prevState.awayTactics;

  // Update lineups if user swapped players
  let activeHomeLineup = [...prevState.homeLineup];
  let activeAwayLineup = [...prevState.awayLineup];

  if (prevState.homeTeam.isUserClub && liveUserTactics?.startingPlayerIds) {
    activeHomeLineup = liveUserTactics.startingPlayerIds;
  } else if (prevState.awayTeam.isUserClub && liveUserTactics?.startingPlayerIds) {
    activeAwayLineup = liveUserTactics.startingPlayerIds;
  }

  // ====================================================
  // AI MANAGER LOGIC (Requirement 23)
  // ====================================================
  const aiTeam = prevState.homeTeam.isUserClub ? prevState.awayTeam : prevState.homeTeam;
  const isAiHome = !prevState.homeTeam.isUserClub;
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
        // Pick an active player with lowest fitness or poor position fit
        const tiredActivePlayers = aiTeam.players
          .filter(p => aiLineup.includes(p.id))
          .sort((a, b) => (prevState.awayFatigueMap[a.id] || 80) - (prevState.awayFatigueMap[b.id] || 80));

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

  // ====================================================
  // ATTRIBUTE-BASED EVENT ENGINE (Requirements 19 & 22)
  // ====================================================
  const homeActivePlayers = (prevState.homeTeam?.players || []).filter(p => activeHomeLineup.includes(p.id));
  const awayActivePlayers = (prevState.awayTeam?.players || []).filter(p => activeAwayLineup.includes(p.id));

  // Compute live effective strength with AdMob Rewarded Training Boost if applied
  const activeBoost = AdManager.getActiveTrainingBoost() || undefined;
  const homeBoost = prevState.homeTeam?.isUserClub ? activeBoost : undefined;
  const awayBoost = prevState.awayTeam?.isUserClub ? activeBoost : undefined;

  const homeStrength = calculateTeamStrength(prevState.homeTeam, currentHomeTactics, undefined, homeBoost);
  const awayStrength = calculateTeamStrength(prevState.awayTeam, currentAwayTactics, undefined, awayBoost);

  const matchup = calculateTacticalMatchup(currentHomeTactics, currentAwayTactics);

  // Home advantage (+5% boost)
  const effHomeAtk = homeStrength.attack * matchup.homeAttackMod * 1.05;
  const effHomeMid = homeStrength.midfield * matchup.homeMidfieldMod * 1.05;
  const effHomeDef = homeStrength.defense * matchup.homeDefenseMod * 1.05;

  const effAwayAtk = awayStrength.attack * matchup.awayAttackMod;
  const effAwayMid = awayStrength.midfield * matchup.awayMidfieldMod;
  const effAwayDef = awayStrength.defense * matchup.awayDefenseMod;

  // Possession calculation for this phase
  const totalMid = effHomeMid + effAwayMid;
  const homePossession = Math.min(78, Math.max(22, Math.round((effHomeMid / totalMid) * 100)));
  const awayPossession = 100 - homePossession;

  // Dynamic Event Rolling for minute nextMinute
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

  const roll = Math.random();

  // Attack generation probability based on midfield + possession
  const homeAttackProb = (effHomeMid / totalMid) * 0.32;
  const awayAttackProb = (effAwayMid / totalMid) * 0.30;

  if (roll < homeAttackProb) {
    // HOME ATTACK SEQUENCE
    homeDangerousAttacks++;
    const shotRoll = Math.random();

    if (shotRoll < 0.60) {
      homeShots++;
      const isTarget = Math.random() < 0.52;
      const shotXg = isTarget ? (Math.random() * 0.35 + 0.15) : (Math.random() * 0.10 + 0.02);
      homeXg += Number(shotXg.toFixed(2));

      if (isTarget) {
        homeShotsOnTarget++;
        // Goal chance vs Away GK
        const awayGk = awayActivePlayers.find(p => p.positionCategory === 'GK') || awayActivePlayers[0];
        const awayGkPower = (awayGk?.attributes.goalkeeping || 50) * 0.012;
        const goalProb = Math.max(0.15, Math.min(0.85, (effHomeAtk / (effHomeAtk + effAwayDef * 1.5)) - awayGkPower + 0.25));

        if (Math.random() < goalProb) {
          homeScore++;
          const scorer = pickPlayerByPosition(homeActivePlayers, 'FWD', 'MID');
          const assister = pickPlayerByPosition(homeActivePlayers.filter(p => p.id !== scorer.id), 'MID', 'FWD');
          const comment = GOAL_COMMENTARIES[Math.floor(Math.random() * GOAL_COMMENTARIES.length)];

          newEvents.push({
            minute: nextMinute,
            type: 'goal',
            teamId: prevState.homeTeam.id,
            playerId: scorer.id,
            playerName: scorer.name,
            assistPlayerId: assister?.id,
            assistPlayerName: assister?.name,
            description: `${comment} - الهدف سجله (${scorer.name})${assister ? ` بعد أسيست متقن من (${assister.name})` : ''}!`
          });
        } else {
          // Goalkeeper Save
          newEvents.push({
            minute: nextMinute,
            type: 'save',
            teamId: prevState.homeTeam.id,
            description: `🧤 تصدي رائع من حارس ${prevState.awayTeam.shortName} لتسديدة خطيرة من هجوم ${prevState.homeTeam.shortName}!`
          });
        }
      } else {
        // Missed Chance
        newEvents.push({
          minute: nextMinute,
          type: 'chance',
          teamId: prevState.homeTeam.id,
          description: CHANCE_COMMENTARIES[Math.floor(Math.random() * CHANCE_COMMENTARIES.length)]
        });
      }
    }
  } else if (roll > 1 - awayAttackProb) {
    // AWAY ATTACK SEQUENCE
    awayDangerousAttacks++;
    const shotRoll = Math.random();

    if (shotRoll < 0.60) {
      awayShots++;
      const isTarget = Math.random() < 0.52;
      const shotXg = isTarget ? (Math.random() * 0.35 + 0.15) : (Math.random() * 0.10 + 0.02);
      awayXg += Number(shotXg.toFixed(2));

      if (isTarget) {
        awayShotsOnTarget++;
        const homeGk = homeActivePlayers.find(p => p.positionCategory === 'GK') || homeActivePlayers[0];
        const homeGkPower = (homeGk?.attributes.goalkeeping || 50) * 0.012;
        const goalProb = Math.max(0.15, Math.min(0.85, (effAwayAtk / (effAwayAtk + effHomeDef * 1.5)) - homeGkPower + 0.25));

        if (Math.random() < goalProb) {
          awayScore++;
          const scorer = pickPlayerByPosition(awayActivePlayers, 'FWD', 'MID');
          const assister = pickPlayerByPosition(awayActivePlayers.filter(p => p.id !== scorer.id), 'MID', 'FWD');
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
            description: `🧤 تصدي بطولي من حارس ${prevState.homeTeam.shortName} يبعد كرة هدف محقق!`
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
    // Secondary Events (Fouls, Cards, Corners, General Play)
    const subRoll = Math.random();
    if (subRoll < 0.07) {
      const isHomeFoul = Math.random() < (currentHomeTactics.pressingIntensity === 'high' ? 0.65 : 0.45);
      if (isHomeFoul) {
        homeFouls++;
        if (Math.random() < 0.35) {
          homeYellowCards++;
          const p = pickPlayerByPosition(homeActivePlayers, 'DEF', 'MID');
          newEvents.push({
            minute: nextMinute,
            type: 'yellow_card',
            teamId: prevState.homeTeam.id,
            playerId: p.id,
            playerName: p.name,
            description: `🟨 بطاقة صفراء على اللاعب (${p.name}) من ${prevState.homeTeam.shortName} بعد تدخل عنيف لمنع هجمة مرتدة.`
          });
        }
      } else {
        awayFouls++;
        if (Math.random() < 0.35) {
          awayYellowCards++;
          const p = pickPlayerByPosition(awayActivePlayers, 'DEF', 'MID');
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
    } else if (subRoll < 0.12) {
      if (Math.random() > 0.5) homeCorners++;
      else awayCorners++;
    } else if (subRoll < 0.16) {
      newEvents.push({
        minute: nextMinute,
        type: 'commentary',
        teamId: Math.random() > 0.5 ? prevState.homeTeam.id : prevState.awayTeam.id,
        description: GENERAL_COMMENTARIES[Math.floor(Math.random() * GENERAL_COMMENTARIES.length)]
      });
    }
  }

  // Fatigue accumulation for active players
  const updatedHomeFatigue = { ...prevState.homeFatigueMap };
  const updatedAwayFatigue = { ...prevState.awayFatigueMap };
  
  const homePressingDrain = currentHomeTactics.pressingIntensity === 'high' ? 0.22 : 0.14;
  const awayPressingDrain = currentAwayTactics.pressingIntensity === 'high' ? 0.22 : 0.14;

  activeHomeLineup.forEach(id => {
    updatedHomeFatigue[id] = Math.max(30, (updatedHomeFatigue[id] || 100) - homePressingDrain);
  });
  activeAwayLineup.forEach(id => {
    updatedAwayFatigue[id] = Math.max(30, (updatedAwayFatigue[id] || 100) - awayPressingDrain);
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
    homeFatigueMap: updatedHomeFatigue,
    awayFatigueMap: updatedAwayFatigue,
    aiSubstitutionsCount: aiSubsCount,
  };
}

/**
 * Runs a complete 90-minute event-by-event match simulation for background/AI matches
 * Uses the exact same realistic attribute-driven engine!
 */
export function simulateMatch(
  homeTeam: Club,
  awayTeam: Club,
  homeTactics?: TeamTactics,
  awayTactics?: TeamTactics
): { homeScore: number; awayScore: number; events: MatchEvent[]; stats: MatchStats } {
  const dummyFixture: Fixture = {
    id: `sim_fix_${Date.now()}_${Math.random()}`,
    round: 1,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    isPlayed: false,
  };

  let state = createInitialLiveMatchState(dummyFixture, homeTeam, awayTeam, homeTactics || awayTactics);

  // Run through all 90 minutes event-by-event
  for (let min = 1; min <= 90; min++) {
    // At halftime (min 45), automatically resume to 2nd half
    if (state.isHalfTime) {
      state.isHalfTime = false;
    }
    state = simulateMatchStep(state, homeTactics || awayTactics);
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

function pickPlayerByPosition(players: Player[], primary: 'FWD' | 'MID' | 'DEF' | 'GK', secondary?: 'FWD' | 'MID' | 'DEF'): Player {
  if (!players || players.length === 0) {
    return {
      id: `p_dummy_${Math.random()}`,
      name: 'لاعب الفريق',
      position: 'ST',
      positionCategory: 'FWD',
      overallRating: 65,
      potentialRating: 70,
      number: 9,
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

      return {
        ...standing,
        played: standing.played + 1,
        won: standing.won + (isWin ? 1 : 0),
        drawn: standing.drawn + (isDraw ? 1 : 0),
        lost: standing.lost + (isLoss ? 1 : 0),
        goalsFor: standing.goalsFor + homeScore,
        goalsAgainst: standing.goalsAgainst + awayScore,
        goalDifference: (standing.goalsFor + homeScore) - (standing.goalsAgainst + awayScore),
        points: standing.points + (isWin ? 3 : isDraw ? 1 : 0),
        form: [...standing.form.slice(-4), formResult],
      };
    }

    if (standing.teamId === awayTeamId) {
      const isWin = awayScore > homeScore;
      const isDraw = homeScore === awayScore;
      const isLoss = awayScore < homeScore;
      const formResult: 'W' | 'D' | 'L' = isWin ? 'W' : isDraw ? 'D' : 'L';

      return {
        ...standing,
        played: standing.played + 1,
        won: standing.won + (isWin ? 1 : 0),
        drawn: standing.drawn + (isDraw ? 1 : 0),
        lost: standing.lost + (isLoss ? 1 : 0),
        goalsFor: standing.goalsFor + awayScore,
        goalsAgainst: standing.goalsAgainst + homeScore,
        goalDifference: (standing.goalsFor + awayScore) - (standing.goalsAgainst + homeScore),
        points: standing.points + (isWin ? 3 : isDraw ? 1 : 0),
        form: [...standing.form.slice(-4), formResult],
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

  const squadPlayers = Array.isArray(team?.players) ? team.players : [];
  const defaultStarterIds = squadPlayers.slice(0, 11).map(p => p.id);
  const startingIds = (isHome ? matchInfo.homeStartingPlayerIds : matchInfo.awayStartingPlayerIds) || team?.tactics?.startingPlayerIds || defaultStarterIds;

  const subInEvents = matchInfo.events.filter(e => e.type === 'substitution' && e.teamId === team?.id);
  const subInPlayerNames = new Set(subInEvents.map(e => e.inPlayerName));

  let bestPlayerId = '';
  let highestCalculatedScore = -1;

  const preCalculatedRatings: { playerId: string; rating: number; minutes: number }[] = [];

  squadPlayers.forEach(p => {
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

    return {
      ...p,
      fitness: newFitness,
      morale: newMorale,
      form: Number(((p.form * 0.7) + (matchRating * 0.3)).toFixed(1)),
      stats: {
        appearances: currentApps + 1,
        starts: (prevStats.starts || 0) + (isStarter ? 1 : 0),
        minutes: (prevStats.minutes || 0) + minutesPlayed,
        goals: (prevStats.goals || 0) + playerGoals,
        assists: (prevStats.assists || 0) + playerAssists,
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
