/**
 * ============================================================================
 * REALISTIC MOBILE FOOTBALL MANAGEMENT - MATCH SIMULATION ENGINE (ES6 / Node.js)
 * ============================================================================
 * Architecture Overview:
 * 1. Event/Phase-Driven: 90 mins segmented into micro-possession phases (~20-25 chances).
 * 2. Tactical & Manager Influences: Coaching licenses (C -> B -> A -> Pro) + Tactical Counter Matrix.
 * 3. 3-Stage Conversion Funnel (Build-up -> Penetration -> Finishing vs GK) with xG calibration.
 * 4. Complacency & Home-Field Advantage modifiers to generate authentic, realistic scorelines.
 */

// ==========================================
// 1. CONSTANTS & TACTICAL MATRICES
// ==========================================

export const COACHING_LICENSES = {
  National_C: {
    name: 'National C License',
    tacticalCompliance: 0.70, // 30% tactical drift/positional indiscipline
    blunderChanceMultiplier: 1.15, // +15% chance of unforced defensive blunders
    tacticalCounterBonus: 0.05,
    halftimeAdjustmentBonus: 0.02,
    subEffectiveness: 0.65,
    complacencyImmunity: false,
  },
  National_B: {
    name: 'National B License',
    tacticalCompliance: 0.80,
    blunderChanceMultiplier: 1.08,
    tacticalCounterBonus: 0.10,
    halftimeAdjustmentBonus: 0.05,
    subEffectiveness: 0.75,
    complacencyImmunity: false,
  },
  National_A: {
    name: 'National A License',
    tacticalCompliance: 0.92,
    blunderChanceMultiplier: 0.90, // -10% blunders
    tacticalCounterBonus: 0.18,
    halftimeAdjustmentBonus: 0.10,
    subEffectiveness: 0.90,
    complacencyImmunity: false,
  },
  Pro: {
    name: 'UEFA / FIFA Pro License',
    tacticalCompliance: 1.00,
    blunderChanceMultiplier: 0.75, // -25% blunders
    tacticalCounterBonus: 0.25,
    halftimeAdjustmentBonus: 0.15,
    subEffectiveness: 1.00,
    complacencyImmunity: true, // Prevents squad complacency when ahead by 2+ goals
  },
};

/**
 * Rock-Paper-Scissors Tactical Counter Matrix
 * Values reflect the attacking & possession leverage granted against specific opponent systems.
 */
export const TACTICAL_COUNTER_MATRIX = {
  // High Press: Overwhelms Low Blocks, but vulnerable to direct Counter Attack over the top
  high_press: {
    beats: ['low_block', 'high_possession'],
    weakAgainst: ['counter_attack', 'long_ball'],
    advantageMultiplier: 1.22,
    disadvantageMultiplier: 0.82,
  },
  // Low Block / Counter: Suffocates High Possession, vulnerable to Wing Overloads and Long Distance Shooting
  low_block: {
    beats: ['high_possession', 'tiki_taka'],
    weakAgainst: ['wing_play', 'high_press'],
    advantageMultiplier: 1.20,
    disadvantageMultiplier: 0.84,
  },
  // Counter Attack: Exploits high defensive lines
  counter_attack: {
    beats: ['high_press', 'high_possession'],
    weakAgainst: ['low_block'],
    advantageMultiplier: 1.25,
    disadvantageMultiplier: 0.85,
  },
  // Wing Play: Exploits narrow defensive systems, neutralized by 5-back and wide wing-backs
  wing_play: {
    beats: ['narrow_central', 'low_block'],
    weakAgainst: ['five_back', 'high_press'],
    advantageMultiplier: 1.20,
    disadvantageMultiplier: 0.85,
  },
  // Tiki-Taka / Central Overload: Dominates open formations, struggles against packed Low Blocks with dual CDMs
  tiki_taka: {
    beats: ['open_fluid', 'narrow_central'],
    weakAgainst: ['low_block', 'high_press'],
    advantageMultiplier: 1.20,
    disadvantageMultiplier: 0.82,
  },
};

// ==========================================
// 2. HELPER UTILITIES
// ==========================================

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const rollProbability = (prob) => Math.random() < prob;

/**
 * Calculates tactical matchup coefficient based on systems & manager licenses.
 */
function evaluateTacticalAdvantage(teamA, teamB) {
  const tacticA = teamA.tactic.system;
  const tacticB = teamB.tactic.system;
  const ruleA = TACTICAL_COUNTER_MATRIX[tacticA];
  const ruleB = TACTICAL_COUNTER_MATRIX[tacticB];

  let modA = 1.0;
  let modB = 1.0;

  const licenseA = COACHING_LICENSES[teamA.manager.license] || COACHING_LICENSES.National_C;
  const licenseB = COACHING_LICENSES[teamB.manager.license] || COACHING_LICENSES.National_C;

  if (ruleA && ruleA.beats.includes(tacticB)) {
    modA += (ruleA.advantageMultiplier - 1.0) * (1 + licenseA.tacticalCounterBonus);
  } else if (ruleA && ruleA.weakAgainst.includes(tacticB)) {
    modA *= ruleA.disadvantageMultiplier;
  }

  if (ruleB && ruleB.beats.includes(tacticA)) {
    modB += (ruleB.advantageMultiplier - 1.0) * (1 + licenseB.tacticalCounterBonus);
  } else if (ruleB && ruleB.weakAgainst.includes(tacticA)) {
    modB *= ruleB.disadvantageMultiplier;
  }

  return { teamAMod: modA, teamBMod: modB };
}

// ==========================================
// 3. CORE SIMULATION ENGINE
// ==========================================

/**
 * Simulates a full 90-minute football match between two teams.
 * 
 * @param {Object} homeTeam 
 * @param {Object} awayTeam 
 * @returns {Object} Complete match report with logs, stats, and final score.
 */
export function simulateMatch(homeTeam, awayTeam) {
  // Validate / Default Fallbacks
  const home = {
    ...homeTeam,
    licenseCfg: COACHING_LICENSES[homeTeam.manager.license] || COACHING_LICENSES.National_C,
  };
  const away = {
    ...awayTeam,
    licenseCfg: COACHING_LICENSES[awayTeam.manager.license] || COACHING_LICENSES.National_C,
  };

  // State Trackers
  const state = {
    homeScore: 0,
    awayScore: 0,
    homeShots: 0,
    awayShots: 0,
    homeShotsOnTarget: 0,
    awayShotsOnTarget: 0,
    homeXG: 0.0,
    awayXG: 0.0,
    homeCorners: 0,
    awayCorners: 0,
    homeFouls: 0,
    awayFouls: 0,
    homeYellowCards: 0,
    awayYellowCards: 0,
    homeRedCards: 0,
    awayRedCards: 0,
    homePossessionTicks: 0,
    awayPossessionTicks: 0,
    commentary: [],
  };

  const addCommentary = (minute, type, text, teamName) => {
    state.commentary.push({
      minute,
      type, // 'GOAL' | 'SAVE' | 'BLUNDER' | 'DEFENDED' | 'MISS' | 'CARD' | 'HALFTIME' | 'FULLTIME'
      team: teamName,
      text,
      currentScore: `${home.name} ${state.homeScore} - ${state.awayScore} ${away.name}`,
    });
  };

  // 1. Initial Environmental Factors
  // Home ground advantage (~4-6% boost in midfield confidence and chance generation)
  const homeAdvantage = 1.06;

  // 2. Generate Match Timeline of Attacking Micro-Phases
  // Typically 20 to 25 dangerous possession transitions occur during an elite 90-minute match
  const totalPhases = Math.floor(randomBetween(21, 26));
  const phaseMinutes = [];
  for (let i = 0; i < totalPhases; i++) {
    phaseMinutes.push(Math.floor(randomBetween(2, 89)));
  }
  phaseMinutes.sort((a, b) => a - b);

  let isHalftimeProcessed = false;

  // 3. Execution of Micro-Phases
  for (let i = 0; i < phaseMinutes.length; i++) {
    const minute = phaseMinutes[i];

    // Halftime Management (Minute ~45)
    if (minute >= 45 && !isHalftimeProcessed) {
      isHalftimeProcessed = true;
      addCommentary(45, 'HALFTIME', `صافرة نهاية الشوط الأول. النتيجة: ${home.name} ${state.homeScore} - ${state.awayScore} ${away.name}. المدربون يراجعون التعليمات داخل غرف الملابس.`, null);
      
      // Reactive halftime tactical adjustments: Higher licenses adapt better to losing/tied game
      if (state.homeScore <= state.awayScore) {
        home.tacticalBoost = home.licenseCfg.halftimeAdjustmentBonus;
      }
      if (state.awayScore <= state.homeScore) {
        away.tacticalBoost = away.licenseCfg.halftimeAdjustmentBonus;
      }
    }

    // Evaluate tactical advantage for current phase
    const { teamAMod: homeTacticalAdv, teamBMod: awayTacticalAdv } = evaluateTacticalAdvantage(home, away);

    // ==========================================
    // PHASE STAGE 1: Midfield Possession Contest
    // ==========================================
    const homeMidPower = (home.midfieldRating * homeAdvantage * homeTacticalAdv * (1 + (home.tacticalBoost || 0))) * home.licenseCfg.tacticalCompliance;
    const awayMidPower = (away.midfieldRating * awayTacticalAdv * (1 + (away.tacticalBoost || 0))) * away.licenseCfg.tacticalCompliance;

    // Smoothed possession ratio (emulating real mobile management curves: 32% - 68% typical bounds)
    const rawRatio = homeMidPower / (homeMidPower + awayMidPower);
    const homePossessionProb = clamp(0.50 + (rawRatio - 0.50) * 0.65, 0.30, 0.70);

    const attackingTeam = Math.random() < homePossessionProb ? home : away;
    const defendingTeam = attackingTeam === home ? away : home;
    const isHomeAttacking = attackingTeam === home;

    // Track possession
    if (isHomeAttacking) {
      state.homePossessionTicks += 1;
    } else {
      state.awayPossessionTicks += 1;
    }

    // Dynamic Complacency Check:
    // If a team leads by 2+ goals, drop attacking urgency by 15% unless coached by a Pro license
    const goalDifference = isHomeAttacking 
      ? (state.homeScore - state.awayScore)
      : (state.awayScore - state.homeScore);

    let attackingUrgency = 1.0;
    if (goalDifference >= 2 && !attackingTeam.licenseCfg.complacencyImmunity) {
      attackingUrgency = 0.85; // 15% drop due to game management / relaxation
    }

    // ==========================================
    // PHASE STAGE 2: Defensive Penetration & Blunders
    // ==========================================
    
    // Check for defensive blunder caused by lower coaching license
    const blunderBaselineProb = 0.04; // 4% baseline error rate
    const defenderBlunderProb = blunderBaselineProb * defendingTeam.licenseCfg.blunderChanceMultiplier;
    const isDefensiveBlunder = rollProbability(defenderBlunderProb);

    let penetrationSuccess = false;
    let attackValue = attackingTeam.attackRating * attackingUrgency;
    let defenseValue = defendingTeam.defenseRating;

    if (isDefensiveBlunder) {
      // Blunder creates clean line-break
      penetrationSuccess = true;
      addCommentary(minute, 'BLUNDER', `خطأ فادح في التمركز الدفاعي وسوء تغطية من دفاع ${defendingTeam.name} يمنح مهاجمي ${attackingTeam.name} انفراداً خطيراً!`, defendingTeam.name);
    } else {
      // Regular tactical contest
      const tacticalMultiplier = isHomeAttacking ? homeTacticalAdv : awayTacticalAdv;
      const penetrationRatio = (attackValue * tacticalMultiplier) / (defenseValue + (attackValue * tacticalMultiplier));
      
      // Calibrated baseline: ~55-60% of organized attacks breach the final third
      const calibratedPenetrationThreshold = 0.48;
      penetrationSuccess = penetrationRatio > (calibratedPenetrationThreshold + (Math.random() * 0.25 - 0.10));
    }

    if (!penetrationSuccess) {
      // Phase intercepted in final third
      if (rollProbability(0.25)) {
        addCommentary(minute, 'DEFENDED', `استبسال دفاعي منظم من ${defendingTeam.name} يقطع الكرة قبل وصولها لمنطقة العمليات.`, defendingTeam.name);
      }
      
      // Possible foul during tactical breakdown
      if (rollProbability(0.12)) {
        if (isHomeAttacking) state.awayFouls++; else state.homeFouls++;
        if (rollProbability(0.20)) {
          if (isHomeAttacking) {
            state.awayYellowCards++;
            addCommentary(minute, 'CARD', `بطاقة صفراء لمدافع ${defendingTeam.name} بعد تدخل قوي لإيقاف هجمة مرتدة واعدة.`, defendingTeam.name);
          } else {
            state.homeYellowCards++;
            addCommentary(minute, 'CARD', `بطاقة صفراء لمدافع ${defendingTeam.name} لتعطيل اللعب التكتيكي.`, defendingTeam.name);
          }
        }
      }
      continue; // End phase
    }

    // ==========================================
    // PHASE STAGE 3: The Chance Conversion Funnel (xG & Finishing)
    // ==========================================
    // Attack managed to generate a shot
    if (isHomeAttacking) state.homeShots++; else state.awayShots++;

    // Classify shot quality into realistic bands (Tap-in/1v1, Box strike, Long-range)
    let shotQuality;
    if (isDefensiveBlunder || rollProbability(0.20)) {
      shotQuality = 'BIG_CHANCE'; // 0.35 - 0.65 xG
    } else if (rollProbability(0.55)) {
      shotQuality = 'BOX_EFFORT'; // 0.10 - 0.28 xG
    } else {
      shotQuality = 'HALF_CHANCE'; // 0.03 - 0.09 xG
    }

    // Calculate baseline xG for the opportunity
    let chanceXG = 0.0;
    if (shotQuality === 'BIG_CHANCE') {
      chanceXG = randomBetween(0.36, 0.62);
    } else if (shotQuality === 'BOX_EFFORT') {
      chanceXG = randomBetween(0.11, 0.26);
    } else {
      chanceXG = randomBetween(0.03, 0.08);
    }

    // Attribute weighting: Attacker finishing competence vs Goalkeeper reflex
    const attackerSkillFactor = clamp(attackingTeam.attackRating / 80, 0.85, 1.25);
    const gkResistanceFactor = clamp(85 / defendingTeam.goalkeeperRating, 0.80, 1.20);
    
    chanceXG = Number((chanceXG * attackerSkillFactor).toFixed(3));
    
    if (isHomeAttacking) state.homeXG += chanceXG; else state.awayXG += chanceXG;

    // Shot accuracy evaluation (On-target vs Off-target)
    const onTargetProb = shotQuality === 'BIG_CHANCE' ? 0.78 : (shotQuality === 'BOX_EFFORT' ? 0.52 : 0.35);
    const isOnTarget = rollProbability(onTargetProb);

    if (!isOnTarget) {
      addCommentary(minute, 'MISS', `تسديدة من ${attackingTeam.name} تمر بجوار القائم دون تشكيل خطورة مباشرة على المرمى.`, attackingTeam.name);
      continue;
    }

    if (isHomeAttacking) state.homeShotsOnTarget++; else state.awayShotsOnTarget++;

    // Finishing vs Goalkeeper formula (Strictly scaled to generate realistic low-scoring football matches)
    // Conditional probability: P(Goal | OnTarget) = (chanceXG / onTargetProb) * gkResistanceFactor
    const baseConversionRate = (chanceXG / Math.max(0.1, onTargetProb));
    const goalProbability = clamp(baseConversionRate * gkResistanceFactor * (0.85 + (Math.random() * 0.30)), 0.08, 0.92);
    const isGoal = rollProbability(goalProbability);

    if (isGoal) {
      if (isHomeAttacking) {
        state.homeScore++;
      } else {
        state.awayScore++;
      }

      const goalPhrases = [
        `⚽ جوووووووول! هدف رائع لصالح ${attackingTeam.name}! تسديدة متقنة تسكن الزاوية المستحيلة للشباك! (xG: ${chanceXG.toFixed(2)})`,
        `⚽ هدف مؤكد! جملة تكتيكية سريعة ينهيها مهاجم ${attackingTeam.name} داخل الشباك دون أي فرصة للحارس! (xG: ${chanceXG.toFixed(2)})`,
        `⚽ جوووول! استغلال مثالي للفرصة من ${attackingTeam.name}، الكرة تصطدم بأسفل العارضة وتتحول للمرمى! (xG: ${chanceXG.toFixed(2)})`,
      ];
      const selectedPhrase = goalPhrases[Math.floor(Math.random() * goalPhrases.length)];
      addCommentary(minute, 'GOAL', selectedPhrase, attackingTeam.name);
    } else {
      // Goalkeeper pulled off a save
      const savePhrases = [
        `تصدي إعجازي! حارس مرمى ${defendingTeam.name} ينقذ مرماه من هدف محقق ويبعد الكرة ببراعة!`,
        `حارس ${defendingTeam.name} يثبت أقدامه ويتصدى ببراعة لتسديدة زاحفة قوية داخل منطقة الجزاء.`,
        `رد فعل سريع من حارس مرمى ${defendingTeam.name} يحرم ${attackingTeam.name} من افتتاح التسجيل!`,
      ];
      const selectedSave = savePhrases[Math.floor(Math.random() * savePhrases.length)];
      addCommentary(minute, 'SAVE', selectedSave, defendingTeam.name);
      
      if (rollProbability(0.35)) {
        if (isHomeAttacking) state.homeCorners++; else state.awayCorners++;
      }
    }
  }

  // Final Whistle Log
  addCommentary(90, 'FULLTIME', `صافرة نهاية المباراة! النتيجة النهائية: ${home.name} ${state.homeScore} - ${state.awayScore} ${away.name}.`, null);

  // Compute final possession percentages
  const totalPossession = state.homePossessionTicks + state.awayPossessionTicks || 1;
  const homePossessionPct = Math.round((state.homePossessionTicks / totalPossession) * 100);
  const awayPossessionPct = 100 - homePossessionPct;

  // Return clean structured summary object
  return {
    fixture: {
      homeTeam: home.name,
      awayTeam: away.name,
      homeManager: `${home.manager.name} (${home.licenseCfg.name})`,
      awayManager: `${away.manager.name} (${away.licenseCfg.name})`,
      homeTactic: home.tactic.system,
      awayTactic: away.tactic.system,
    },
    result: {
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      winner: state.homeScore > state.awayScore ? 'HOME' : state.awayScore > state.homeScore ? 'AWAY' : 'DRAW',
    },
    statistics: {
      possession: {
        home: `${homePossessionPct}%`,
        away: `${awayPossessionPct}%`,
      },
      expectedGoals: {
        home: Number(state.homeXG.toFixed(2)),
        away: Number(state.awayXG.toFixed(2)),
      },
      totalShots: {
        home: state.homeShots,
        away: state.awayShots,
      },
      shotsOnTarget: {
        home: state.homeShotsOnTarget,
        away: state.awayShotsOnTarget,
      },
      corners: {
        home: state.homeCorners,
        away: state.awayCorners,
      },
      fouls: {
        home: state.homeFouls,
        away: state.awayFouls,
      },
      cards: {
        yellow: {
          home: state.homeYellowCards,
          away: state.awayYellowCards,
        },
        red: {
          home: state.homeRedCards,
          away: state.awayRedCards,
        },
      },
    },
    commentaryLogs: state.commentary,
  };
}

// ==========================================
// 4. MOCK DEMO EXECUTION
// ==========================================

const mockHomeTeam = {
  name: 'الأهلي القاهري (Al Ahly SC)',
  attackRating: 84,
  midfieldRating: 83,
  defenseRating: 81,
  goalkeeperRating: 85,
  manager: {
    name: 'مارسيل كولر',
    license: 'Pro', // Top tier license: high tactical compliance, zero complacency
  },
  tactic: {
    system: 'high_press', // High press style
    formation: '4-3-3',
  },
};

const mockAwayTeam = {
  name: 'بيراميدز إف سي (Pyramids FC)',
  attackRating: 82,
  midfieldRating: 80,
  defenseRating: 78,
  goalkeeperRating: 80,
  manager: {
    name: 'مدرب صاعد',
    license: 'National_C', // Lower license: +15% blunders, positional drift
  },
  tactic: {
    system: 'low_block', // Low block (vulnerable to high press counter matrix)
    formation: '5-3-2',
  },
};

// Execute simulation if run directly in Node.js
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('modularMatchEngine.js')) {
  console.log('='.repeat(70));
  console.log('⚽ REALISTIC FOOTBALL SIMULATION ENGINE TEST RUN');
  console.log('='.repeat(70));

  const matchReport = simulateMatch(mockHomeTeam, mockAwayTeam);

  console.log(`\n🏟️  المباراة: ${matchReport.fixture.homeTeam} vs ${matchReport.fixture.awayTeam}`);
  console.log(`👔  المدربون: ${matchReport.fixture.homeManager} VS ${matchReport.fixture.awayManager}`);
  console.log(`📋  التكتيك: [${matchReport.fixture.homeTactic}] ضد [${matchReport.fixture.awayTactic}]`);
  console.log(`\n🏆  النتيجة النهائية: ${matchReport.result.homeScore} - ${matchReport.result.awayScore} (${matchReport.result.winner})`);
  
  console.log('\n📊  إحصائيات اللقاء:');
  console.table({
    'الاستحواذ': matchReport.statistics.possession,
    'الأهداف المتوقعة (xG)': matchReport.statistics.expectedGoals,
    'إجمالي التسديدات': matchReport.statistics.totalShots,
    'تسديدات على المرمى': matchReport.statistics.shotsOnTarget,
    'الركنيات': matchReport.statistics.corners,
    'البطاقات الصفراء': matchReport.statistics.cards.yellow,
  });

  console.log('\n🎙️  أبرز أحداث ومجريات المباراة (Commentary Logs):');
  matchReport.commentaryLogs.forEach((log) => {
    const icon = log.type === 'GOAL' ? '⚽' : log.type === 'SAVE' ? '🧤' : log.type === 'BLUNDER' ? '⚠️' : log.type === 'CARD' ? '🟨' : '⏱️';
    console.log(`[د ${String(log.minute).padStart(2, '0')}] ${icon} [${log.type}] ${log.text}`);
  });

  console.log('\n' + '='.repeat(70));
}
