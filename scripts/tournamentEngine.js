/**
 * ============================================================================
 * TOURNAMENT & FIXTURE GENERATION ENGINE (Capacitor / Mobile JS Production Ready)
 * ============================================================================
 * Features:
 * - Unified 48-Game-Week Calendar with Sub-slot Scheduling (MIDWEEK / WEEKEND).
 * - Zero Collision Architecture: Strict validation per (week, slot) tuple.
 * - Double Round-Robin Generator (Berger Algorithm / Circle Method).
 * - Knockout Stage Generator & Propagation (Single & Two-legged with aggregate/ET/PKs).
 * - Continental Champions League (32 Teams -> 8 Groups -> R16 -> QF -> SF -> Final).
 * - Domestic Cup (Knockout across Weeks 8, 16, 24, 32).
 * - Quadrennial World Cup (Every 4 years, e.g., 2026, 2030; Weeks 36-40).
 * - Fully automated stage progressions with tie-breakers and standings.
 * - Deterministic, lightweight, memory-leak-free structures for Mobile WebViews.
 */

// ==========================================
// 1. CONSTANTS & CALENDAR SLOTS
// ==========================================

export const MATCH_SLOTS = {
  MIDWEEK: 'MIDWEEK',
  WEEKEND: 'WEEKEND'
};

export const TOURNAMENT_TYPES = {
  LEAGUE: 'LEAGUE',
  DOMESTIC_CUP: 'DOMESTIC_CUP',
  CONTINENTAL: 'CONTINENTAL',
  WORLD_CUP: 'WORLD_CUP'
};

export const TOURNAMENT_STAGES = {
  LEAGUE: 'LEAGUE',
  GROUP: 'GROUP',
  ROUND_OF_32: 'ROUND_OF_32',
  ROUND_OF_16: 'ROUND_OF_16',
  QUARTER_FINALS: 'QUARTER_FINALS',
  SEMI_FINALS: 'SEMI_FINALS',
  THIRD_PLACE: 'THIRD_PLACE',
  FINAL: 'FINAL'
};

// ==========================================
// 2. CORE TOURNAMENT MANAGER CLASS
// ==========================================

export class TournamentManager {
  constructor() {
    this.teams = new Map(); // teamId -> Team
    this.tournaments = new Map(); // tournamentId -> Tournament
    this.calendar = new Map(); // weekNumber -> Match[]
    this.standings = new Map(); // tournamentOrGroupId -> Map<teamId, TeamStats>
    this.currentWeek = 1;
    this.currentYear = 2026;
    this.totalWeeksInSeason = 48;
    this.matchIdCounter = 1;

    // Track active aggregate ties for two-legged knockout ties: tieKey -> AggregateTie
    this.aggregateTies = new Map();
  }

  // ------------------------------------------
  // Registration & Storage
  // ------------------------------------------
  registerTeam(team) {
    if (!team || !team.id) throw new Error('Invalid team registration.');
    this.teams.set(team.id, {
      id: team.id,
      name: team.name,
      rating: team.rating || 75,
      leagueId: team.leagueId || 'DEFAULT_LEAGUE',
      country: team.country || 'Global',
      isNationalTeam: Boolean(team.isNationalTeam)
    });
  }

  registerTournament(tournament) {
    if (!tournament || !tournament.id) throw new Error('Invalid tournament registration.');
    this.tournaments.set(tournament.id, {
      id: tournament.id,
      name: tournament.name,
      type: tournament.type, // 'LEAGUE' | 'DOMESTIC_CUP' | 'CONTINENTAL' | 'WORLD_CUP'
      year: tournament.year || this.currentYear,
      stages: tournament.stages || [],
      currentStage: tournament.currentStage || null,
      winnerId: null,
      runnerUpId: null,
      groups: tournament.groups || [], // For group tournaments
      isCompleted: false
    });
  }

  // ------------------------------------------
  // Calendar & Collision-Proof Scheduling
  // ------------------------------------------
  addMatchToCalendar(match) {
    if (!match.roundWeek || match.roundWeek < 1 || match.roundWeek > this.totalWeeksInSeason) {
      throw new Error(`Invalid roundWeek ${match.roundWeek} for match ${match.id}`);
    }

    const slot = match.slot || MATCH_SLOTS.WEEKEND;
    match.slot = slot;

    if (!this.calendar.has(match.roundWeek)) {
      this.calendar.set(match.roundWeek, []);
    }

    const weeklyMatches = this.calendar.get(match.roundWeek);

    // Collision Check: Verify neither team is already booked for this specific week AND slot
    for (const existing of weeklyMatches) {
      if (existing.slot === slot) {
        if (
          existing.homeId === match.homeId ||
          existing.awayId === match.homeId ||
          existing.homeId === match.awayId ||
          existing.awayId === match.awayId
        ) {
          const offendingTeam = (existing.homeId === match.homeId || existing.awayId === match.homeId) ? match.homeId : match.awayId;
          throw new Error(
            `Scheduling Collision Error: Team [${offendingTeam}] already has a match in Week ${match.roundWeek} [Slot: ${slot}]. Existing: ${existing.id}, Proposed: ${match.id}`
          );
        }
      }
    }

    weeklyMatches.push(match);
  }

  // ------------------------------------------
  // 1. Double Round-Robin Generator (Berger Algorithm / Circle Method)
  // ------------------------------------------
  generateLeagueFixtures(tournamentId, teamIds, startWeek = 1, slot = MATCH_SLOTS.WEEKEND) {
    let pool = [...teamIds];
    if (pool.length % 2 !== 0) pool.push(null); // Bye team if odd
    const n = pool.length;
    const roundsInSingleHalf = n - 1;
    const matchesPerRound = n / 2;
    const schedule = [];

    // First Half (Home / Away balanced)
    for (let round = 0; round < roundsInSingleHalf; round++) {
      const roundMatches = [];
      const scheduledWeek = startWeek + round;

      for (let i = 0; i < matchesPerRound; i++) {
        const t1 = pool[i];
        const t2 = pool[n - 1 - i];

        if (t1 !== null && t2 !== null) {
          // Balance home/away: alternate by round and position
          const isHomeT1 = (i === 0) ? (round % 2 === 0) : ((i + round) % 2 === 0);
          roundMatches.push({
            id: `M_${tournamentId}_W${scheduledWeek}_${this.matchIdCounter++}`,
            homeId: isHomeT1 ? t1 : t2,
            awayId: isHomeT1 ? t2 : t1,
            tournamentId,
            stage: TOURNAMENT_STAGES.LEAGUE,
            roundWeek: scheduledWeek,
            slot,
            played: false,
            homeGoals: 0,
            awayGoals: 0,
            winnerId: null,
            isNeutral: false
          });
        }
      }
      schedule.push(roundMatches);

      // Rotate pool elements, holding index 0 constant
      const last = pool.pop();
      pool.splice(1, 0, last);
    }

    // Second Half (Mirrored reverse fixtures)
    for (let round = 0; round < roundsInSingleHalf; round++) {
      const scheduledWeek = startWeek + roundsInSingleHalf + round;
      const reverseRoundMatches = schedule[round].map(m => ({
        id: `M_${tournamentId}_W${scheduledWeek}_${this.matchIdCounter++}`,
        homeId: m.awayId,
        awayId: m.homeId,
        tournamentId,
        stage: TOURNAMENT_STAGES.LEAGUE,
        roundWeek: scheduledWeek,
        slot,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        winnerId: null,
        isNeutral: false
      }));
      schedule.push(reverseRoundMatches);
    }

    // Initialize league table
    this.initStandings(tournamentId, teamIds);

    // Commit matches to calendar
    schedule.flat().forEach(match => this.addMatchToCalendar(match));
    return schedule.flat();
  }

  // ------------------------------------------
  // 2. Knockout Stage Generation (Single & Two-Legged)
  // ------------------------------------------
  generateKnockoutRound(
    tournamentId,
    stageName,
    pairings, // Array of [teamAId, teamBId]
    targetWeek,
    slot = MATCH_SLOTS.MIDWEEK,
    isNeutral = false,
    isTwoLegged = false,
    secondLegWeek = null
  ) {
    const matches = [];

    pairings.forEach(([teamA, teamB], idx) => {
      if (!teamA || !teamB) return;

      const firstLegMatch = {
        id: `M_${tournamentId}_${stageName}_L1_${idx}_${this.matchIdCounter++}`,
        homeId: teamA,
        awayId: teamB,
        tournamentId,
        stage: stageName,
        roundWeek: targetWeek,
        slot,
        played: false,
        homeGoals: 0,
        awayGoals: 0,
        winnerId: null,
        isNeutral,
        isTwoLegged,
        leg: isTwoLegged ? 1 : 0,
        tieKey: `${tournamentId}_${stageName}_TIE_${idx}`
      };

      matches.push(firstLegMatch);
      this.addMatchToCalendar(firstLegMatch);

      if (isTwoLegged && secondLegWeek) {
        const secondLegMatch = {
          id: `M_${tournamentId}_${stageName}_L2_${idx}_${this.matchIdCounter++}`,
          homeId: teamB,
          awayId: teamA,
          tournamentId,
          stage: stageName,
          roundWeek: secondLegWeek,
          slot,
          played: false,
          homeGoals: 0,
          awayGoals: 0,
          winnerId: null,
          isNeutral,
          isTwoLegged: true,
          leg: 2,
          tieKey: `${tournamentId}_${stageName}_TIE_${idx}`
        };

        matches.push(secondLegMatch);
        this.addMatchToCalendar(secondLegMatch);

        this.aggregateTies.set(firstLegMatch.tieKey, {
          tieKey: firstLegMatch.tieKey,
          tournamentId,
          stageName,
          teamA,
          teamB,
          leg1Played: false,
          leg2Played: false,
          leg1Score: { home: 0, away: 0 },
          leg2Score: { home: 0, away: 0 },
          winnerId: null
        });
      }
    });

    return matches;
  }

  // ------------------------------------------
  // 3. Champions League (8 Groups of 4 -> Knockout)
  // ------------------------------------------
  generateContinentalGroups(tournamentId, top32TeamIds, groupWeeks = [3, 6, 9, 12, 15, 18]) {
    if (top32TeamIds.length !== 32) {
      throw new Error(`Continental tournament requires 32 teams. Provided: ${top32TeamIds.length}`);
    }

    const groups = [];
    const tournament = this.tournaments.get(tournamentId);

    // Seed into 8 groups of 4
    for (let i = 0; i < 8; i++) {
      const groupId = `${tournamentId}_GROUP_${String.fromCharCode(65 + i)}`; // Group A to H
      const groupTeams = top32TeamIds.slice(i * 4, (i + 1) * 4);
      groups.push({ id: groupId, name: `Group ${String.fromCharCode(65 + i)}`, teams: groupTeams });

      this.initStandings(groupId, groupTeams);

      // Schedule 6 rounds across the 6 midweek slots
      const pairings = [
        [[0, 1], [2, 3]], // Week 3 (R1)
        [[2, 0], [1, 3]], // Week 6 (R2)
        [[0, 3], [1, 2]], // Week 9 (R3)
        [[3, 0], [2, 1]], // Week 12 (R4 - Reverse)
        [[1, 0], [3, 2]], // Week 15 (R5 - Reverse)
        [[0, 2], [3, 1]]  // Week 18 (R6 - Reverse)
      ];

      pairings.forEach((round, rIdx) => {
        const scheduledWeek = groupWeeks[rIdx];
        round.forEach(([hIdx, aIdx]) => {
          const match = {
            id: `M_${groupId}_W${scheduledWeek}_${this.matchIdCounter++}`,
            homeId: groupTeams[hIdx],
            awayId: groupTeams[aIdx],
            tournamentId,
            groupId,
            stage: TOURNAMENT_STAGES.GROUP,
            roundWeek: scheduledWeek,
            slot: MATCH_SLOTS.MIDWEEK,
            played: false,
            homeGoals: 0,
            awayGoals: 0,
            winnerId: null,
            isNeutral: false
          };
          this.addMatchToCalendar(match);
        });
      });
    }

    if (tournament) {
      tournament.groups = groups;
      tournament.currentStage = TOURNAMENT_STAGES.GROUP;
    }
  }

  // ------------------------------------------
  // 4. Quadrennial World Cup Generator
  // ------------------------------------------
  generateWorldCup(tournamentId, national32TeamIds, groupWeeks = [36, 37]) {
    if (national32TeamIds.length !== 32) {
      throw new Error(`World Cup requires 32 national teams. Provided: ${national32TeamIds.length}`);
    }

    const tournament = this.tournaments.get(tournamentId);
    const groups = [];

    // 8 Groups of 4 (Single Round Robin - 3 games per team)
    // Scheduled in compact Weeks 36 and 37 across Midweek & Weekend
    for (let i = 0; i < 8; i++) {
      const groupId = `${tournamentId}_WC_GROUP_${String.fromCharCode(65 + i)}`;
      const groupTeams = national32TeamIds.slice(i * 4, (i + 1) * 4);
      groups.push({ id: groupId, name: `World Cup Group ${String.fromCharCode(65 + i)}`, teams: groupTeams });

      this.initStandings(groupId, groupTeams);

      // Matchday 1: Week 36 MIDWEEK
      // Matchday 2: Week 36 WEEKEND
      // Matchday 3: Week 37 MIDWEEK
      const fixturesPlan = [
        { week: groupWeeks[0], slot: MATCH_SLOTS.MIDWEEK, pairs: [[0, 1], [2, 3]] },
        { week: groupWeeks[0], slot: MATCH_SLOTS.WEEKEND, pairs: [[0, 2], [1, 3]] },
        { week: groupWeeks[1], slot: MATCH_SLOTS.MIDWEEK, pairs: [[3, 0], [1, 2]] }
      ];

      fixturesPlan.forEach(fp => {
        fp.pairs.forEach(([h, a]) => {
          const match = {
            id: `M_${groupId}_W${fp.week}_${fp.slot}_${this.matchIdCounter++}`,
            homeId: groupTeams[h],
            awayId: groupTeams[a],
            tournamentId,
            groupId,
            stage: TOURNAMENT_STAGES.GROUP,
            roundWeek: fp.week,
            slot: fp.slot,
            played: false,
            homeGoals: 0,
            awayGoals: 0,
            winnerId: null,
            isNeutral: true // World Cup hosted at neutral tournament venues
          };
          this.addMatchToCalendar(match);
        });
      });
    }

    if (tournament) {
      tournament.groups = groups;
      tournament.currentStage = TOURNAMENT_STAGES.GROUP;
    }
  }

  // ------------------------------------------
  // 5. Standings & Tie-Breakers
  // ------------------------------------------
  initStandings(scopeId, teamIds) {
    const table = new Map();
    teamIds.forEach(id => {
      table.set(id, {
        teamId: id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    });
    this.standings.set(scopeId, table);
  }

  updateStandings(scopeId, homeId, awayId, homeGoals, awayGoals) {
    const table = this.standings.get(scopeId);
    if (!table) return;

    const homeStat = table.get(homeId);
    const awayStat = table.get(awayId);
    if (!homeStat || !awayStat) return;

    homeStat.played += 1;
    awayStat.played += 1;
    homeStat.goalsFor += homeGoals;
    homeStat.goalsAgainst += awayGoals;
    awayStat.goalsFor += awayGoals;
    awayStat.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      homeStat.won += 1;
      homeStat.points += 3;
      awayStat.lost += 1;
    } else if (homeGoals < awayGoals) {
      awayStat.won += 1;
      awayStat.points += 3;
      homeStat.lost += 1;
    } else {
      homeStat.drawn += 1;
      homeStat.points += 1;
      awayStat.drawn += 1;
      awayStat.points += 1;
    }

    homeStat.goalDifference = homeStat.goalsFor - homeStat.goalsAgainst;
    awayStat.goalDifference = awayStat.goalsFor - awayStat.goalsAgainst;
  }

  getRankedStandings(scopeId) {
    const table = this.standings.get(scopeId);
    if (!table) return [];

    return Array.from(table.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      // Rating fallback
      const teamA = this.teams.get(a.teamId);
      const teamB = this.teams.get(b.teamId);
      return (teamB?.rating || 0) - (teamA?.rating || 0);
    });
  }

  // ------------------------------------------
  // 6. Collision-Proof Week Simulator
  // ------------------------------------------
  simulateWeek(simEngineCallback) {
    // Default simulation engine if none provided
    const defaultEngine = (homeTeam, awayTeam, isNeutral) => {
      const homeAdv = isNeutral ? 0 : 5;
      const ratingDiff = (homeTeam.rating + homeAdv) - awayTeam.rating;
      const lambdaHome = Math.max(0.4, 1.4 + ratingDiff * 0.04);
      const lambdaAway = Math.max(0.3, 1.1 - ratingDiff * 0.04);

      let homeGoals = 0;
      let awayGoals = 0;
      for (let i = 0; i < 4; i++) {
        if (Math.random() < lambdaHome / 4) homeGoals++;
        if (Math.random() < lambdaAway / 4) awayGoals++;
      }

      let winnerId = null;
      if (homeGoals > awayGoals) winnerId = homeTeam.id;
      else if (awayGoals > homeGoals) winnerId = awayTeam.id;

      return { homeGoals, awayGoals, winnerId };
    };

    const runEngine = simEngineCallback || defaultEngine;

    // Chronological Execution within Week:
    // 1. MIDWEEK slot simulated first -> Stage progressions checked (may schedule weekend matches)
    this.simulateSlot(MATCH_SLOTS.MIDWEEK, runEngine);
    this.checkStageProgressions();

    // 2. WEEKEND slot simulated second -> Stage progressions checked
    this.simulateSlot(MATCH_SLOTS.WEEKEND, runEngine);
    this.checkStageProgressions();

    this.currentWeek++;
  }

  simulateSlot(slot, runEngine) {
    const weeklyMatches = this.calendar.get(this.currentWeek) || [];
    const slotMatches = weeklyMatches.filter(m => m.slot === slot && !m.played);
    const participatedInSlot = new Set();

    slotMatches.forEach(match => {
      if (participatedInSlot.has(match.homeId) || participatedInSlot.has(match.awayId)) {
        throw new Error(
          `CRITICAL COLLISION: Team [${participatedInSlot.has(match.homeId) ? match.homeId : match.awayId}] playing multiple times in Week ${this.currentWeek} Slot ${slot}`
        );
      }

      participatedInSlot.add(match.homeId);
      participatedInSlot.add(match.awayId);

      const homeTeam = this.teams.get(match.homeId);
      const awayTeam = this.teams.get(match.awayId);
      const result = runEngine(homeTeam, awayTeam, match.isNeutral);

      match.homeGoals = result.homeGoals;
      match.awayGoals = result.awayGoals;
      match.winnerId = result.winnerId;
      match.played = true;

      // Update League / Group tables if applicable
      const tableScope = match.groupId || match.tournamentId;
      if (match.stage === TOURNAMENT_STAGES.LEAGUE || match.stage === TOURNAMENT_STAGES.GROUP) {
        this.updateStandings(tableScope, match.homeId, match.awayId, match.homeGoals, match.awayGoals);
      }

      // Two-Legged Aggregate Resolution
      if (match.isTwoLegged && match.tieKey) {
        this.handleAggregateLegCompletion(match, runEngine);
      } else if (!match.isTwoLegged && match.stage !== TOURNAMENT_STAGES.LEAGUE && match.stage !== TOURNAMENT_STAGES.GROUP) {
        // Single-leg knockout must have a winner (Extra Time / Penalties)
        if (!match.winnerId) {
          match.winnerId = Math.random() < 0.5 ? match.homeId : match.awayId;
          if (match.homeGoals === match.awayGoals) {
            match.penaltyShootoutWinner = match.winnerId;
          }
        }
      }
    });
  }

  handleAggregateLegCompletion(match, engine) {
    const tie = this.aggregateTies.get(match.tieKey);
    if (!tie) return;

    if (match.leg === 1) {
      tie.leg1Played = true;
      tie.leg1Score = { home: match.homeGoals, away: match.awayGoals };
    } else if (match.leg === 2) {
      tie.leg2Played = true;
      tie.leg2Score = { home: match.homeGoals, away: match.awayGoals };

      // Aggregate: Team A is initial home, Team B is away
      // In Leg 2: Team B is home, Team A is away
      const teamATotal = tie.leg1Score.home + tie.leg2Score.away;
      const teamBTotal = tie.leg1Score.away + tie.leg2Score.home;

      if (teamATotal > teamBTotal) {
        tie.winnerId = tie.teamA;
      } else if (teamBTotal > teamATotal) {
        tie.winnerId = tie.teamB;
      } else {
        // Tied on aggregate -> Extra-time / Penalties shootout resolution
        tie.winnerId = Math.random() < 0.5 ? tie.teamA : tie.teamB;
        tie.decidedByPenalties = true;
      }

      match.winnerId = tie.winnerId;
    }
  }

  // ------------------------------------------
  // 7. Automated Stage Progression & Next Round Seeding
  // ------------------------------------------
  checkStageProgressions() {
    this.tournaments.forEach(tournament => {
      if (tournament.isCompleted) return;

      // ----------------------------------------------------
      // A. Domestic Cup Progressions (Weeks 8, 16, 24, 32)
      // ----------------------------------------------------
      if (tournament.type === TOURNAMENT_TYPES.DOMESTIC_CUP) {
        this.processDomesticCupProgression(tournament);
      }

      // ----------------------------------------------------
      // B. Continental Champions League Progressions
      // Groups end Week 18 -> R16 (W21/26) -> QF (W29) -> SF (W34) -> Final (W37)
      // ----------------------------------------------------
      if (tournament.type === TOURNAMENT_TYPES.CONTINENTAL) {
        this.processContinentalProgression(tournament);
      }

      // ----------------------------------------------------
      // C. World Cup Progressions (Weeks 36 - 40)
      // ----------------------------------------------------
      if (tournament.type === TOURNAMENT_TYPES.WORLD_CUP) {
        this.processWorldCupProgression(tournament);
      }

      // ----------------------------------------------------
      // D. Domestic League Completion Check (Week 30)
      // ----------------------------------------------------
      if (tournament.type === TOURNAMENT_TYPES.LEAGUE && this.currentWeek === 30) {
        const table = this.getRankedStandings(tournament.id);
        if (table.length > 0) {
          tournament.winnerId = table[0].teamId;
          tournament.runnerUpId = table[1]?.teamId || null;
          tournament.isCompleted = true;
        }
      }
    });
  }

  processDomesticCupProgression(tournament) {
    // Week 8 (R16 completed) -> Generate QF for Week 16
    if (this.currentWeek === 8 && tournament.currentStage === TOURNAMENT_STAGES.ROUND_OF_16) {
      const r16Matches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.ROUND_OF_16);
      if (r16Matches.every(m => m.played)) {
        const winners = r16Matches.map(m => m.winnerId);
        const pairings = this.createRandomPairings(winners);
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.QUARTER_FINALS,
          pairings,
          16, // Week 16
          MATCH_SLOTS.MIDWEEK
        );
        tournament.currentStage = TOURNAMENT_STAGES.QUARTER_FINALS;
      }
    }

    // Week 16 (QF completed) -> Generate SF for Week 24
    if (this.currentWeek === 16 && tournament.currentStage === TOURNAMENT_STAGES.QUARTER_FINALS) {
      const qfMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.QUARTER_FINALS);
      if (qfMatches.every(m => m.played)) {
        const winners = qfMatches.map(m => m.winnerId);
        const pairings = this.createRandomPairings(winners);
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.SEMI_FINALS,
          pairings,
          24, // Week 24
          MATCH_SLOTS.MIDWEEK
        );
        tournament.currentStage = TOURNAMENT_STAGES.SEMI_FINALS;
      }
    }

    // Week 24 (SF completed) -> Generate Final for Week 32
    if (this.currentWeek === 24 && tournament.currentStage === TOURNAMENT_STAGES.SEMI_FINALS) {
      const sfMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.SEMI_FINALS);
      if (sfMatches.every(m => m.played)) {
        const winners = sfMatches.map(m => m.winnerId);
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.FINAL,
          [[winners[0], winners[1]]],
          32, // Week 32
          MATCH_SLOTS.WEEKEND,
          true // Neutral stadium
        );
        tournament.currentStage = TOURNAMENT_STAGES.FINAL;
      }
    }

    // Week 32 (Final completed)
    if (this.currentWeek === 32 && tournament.currentStage === TOURNAMENT_STAGES.FINAL) {
      const finalMatch = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.FINAL)[0];
      if (finalMatch && finalMatch.played) {
        tournament.winnerId = finalMatch.winnerId;
        tournament.runnerUpId = finalMatch.winnerId === finalMatch.homeId ? finalMatch.awayId : finalMatch.homeId;
        tournament.isCompleted = true;
      }
    }
  }

  processContinentalProgression(tournament) {
    // Week 18 (Groups Finish) -> Advance top 2 from each group -> R16 Two-Legs (Week 21 & 26)
    if (this.currentWeek === 18 && tournament.currentStage === TOURNAMENT_STAGES.GROUP) {
      const groupMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.GROUP);
      if (groupMatches.every(m => m.played)) {
        const groupWinners = [];
        const groupRunnersUp = [];

        tournament.groups.forEach(g => {
          const ranked = this.getRankedStandings(g.id);
          groupWinners.push(ranked[0].teamId);
          groupRunnersUp.push(ranked[1].teamId);
        });

        // Seed Group Winners vs Runners-up (avoid same group rematch)
        const pairings = [];
        for (let i = 0; i < 8; i++) {
          pairings.push([groupRunnersUp[i], groupWinners[(i + 1) % 8]]);
        }

        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.ROUND_OF_16,
          pairings,
          21, // Leg 1: Week 21
          MATCH_SLOTS.MIDWEEK,
          false,
          true,
          26 // Leg 2: Week 26
        );
        tournament.currentStage = TOURNAMENT_STAGES.ROUND_OF_16;
      }
    }

    // Week 26 (R16 2nd Leg completed) -> Generate QF for Week 29
    if (this.currentWeek === 26 && tournament.currentStage === TOURNAMENT_STAGES.ROUND_OF_16) {
      const r16Leg2Matches = (this.calendar.get(26) || []).filter(m => m.tournamentId === tournament.id && m.stage === TOURNAMENT_STAGES.ROUND_OF_16);
      if (r16Leg2Matches.every(m => m.played)) {
        const winners = [];
        for (let i = 0; i < 8; i++) {
          const tie = this.aggregateTies.get(`${tournament.id}_${TOURNAMENT_STAGES.ROUND_OF_16}_TIE_${i}`);
          if (tie && tie.winnerId) winners.push(tie.winnerId);
        }

        const pairings = this.createRandomPairings(winners);
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.QUARTER_FINALS,
          pairings,
          29, // Week 29
          MATCH_SLOTS.MIDWEEK,
          false
        );
        tournament.currentStage = TOURNAMENT_STAGES.QUARTER_FINALS;
      }
    }

    // Week 29 (QF completed) -> Generate SF for Week 34
    if (this.currentWeek === 29 && tournament.currentStage === TOURNAMENT_STAGES.QUARTER_FINALS) {
      const qfMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.QUARTER_FINALS);
      if (qfMatches.every(m => m.played)) {
        const winners = qfMatches.map(m => m.winnerId);
        const pairings = this.createRandomPairings(winners);
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.SEMI_FINALS,
          pairings,
          34, // Week 34
          MATCH_SLOTS.MIDWEEK,
          false
        );
        tournament.currentStage = TOURNAMENT_STAGES.SEMI_FINALS;
      }
    }

    // Week 34 (SF completed) -> Generate Final for Week 37
    if (this.currentWeek === 34 && tournament.currentStage === TOURNAMENT_STAGES.SEMI_FINALS) {
      const sfMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.SEMI_FINALS);
      if (sfMatches.every(m => m.played)) {
        const winners = sfMatches.map(m => m.winnerId);
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.FINAL,
          [[winners[0], winners[1]]],
          37, // Week 37
          MATCH_SLOTS.MIDWEEK,
          true // Neutral Grand Final
        );
        tournament.currentStage = TOURNAMENT_STAGES.FINAL;
      }
    }

    // Week 37 (Final completed)
    if (this.currentWeek === 37 && tournament.currentStage === TOURNAMENT_STAGES.FINAL) {
      const finalMatch = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.FINAL)[0];
      if (finalMatch && finalMatch.played) {
        tournament.winnerId = finalMatch.winnerId;
        tournament.runnerUpId = finalMatch.winnerId === finalMatch.homeId ? finalMatch.awayId : finalMatch.homeId;
        tournament.isCompleted = true;
      }
    }
  }

  processWorldCupProgression(tournament) {
    // Week 37 Midweek: Groups Finish -> Generate R16 for Week 38 MIDWEEK
    if (this.currentWeek === 37 && tournament.currentStage === TOURNAMENT_STAGES.GROUP) {
      const wcGroupMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.GROUP);
      if (wcGroupMatches.every(m => m.played)) {
        const gWinners = [];
        const gRunners = [];
        tournament.groups.forEach(g => {
          const ranked = this.getRankedStandings(g.id);
          gWinners.push(ranked[0].teamId);
          gRunners.push(ranked[1].teamId);
        });

        // Bracket pairings (A1 vs B2, C1 vs D2, etc.)
        const pairings = [];
        for (let i = 0; i < 8; i += 2) {
          pairings.push([gWinners[i], gRunners[i + 1]]);
          pairings.push([gWinners[i + 1], gRunners[i]]);
        }

        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.ROUND_OF_16,
          pairings,
          38, // Week 38 MIDWEEK
          MATCH_SLOTS.MIDWEEK,
          true
        );
        tournament.currentStage = TOURNAMENT_STAGES.ROUND_OF_16;
      }
    }

    // Week 38 MIDWEEK (R16 completes) -> Generate QF for Week 38 WEEKEND
    if (this.currentWeek === 38 && tournament.currentStage === TOURNAMENT_STAGES.ROUND_OF_16) {
      const r16Matches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.ROUND_OF_16);
      if (r16Matches.every(m => m.played)) {
        const winners = r16Matches.map(m => m.winnerId);
        const pairings = [];
        for (let i = 0; i < winners.length; i += 2) {
          pairings.push([winners[i], winners[i + 1]]);
        }
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.QUARTER_FINALS,
          pairings,
          38, // Week 38 WEEKEND
          MATCH_SLOTS.WEEKEND,
          true
        );
        tournament.currentStage = TOURNAMENT_STAGES.QUARTER_FINALS;
      }
    }

    // Week 38 WEEKEND (QF completes) -> Generate SF for Week 39 MIDWEEK
    if (this.currentWeek === 38 && tournament.currentStage === TOURNAMENT_STAGES.QUARTER_FINALS) {
      const qfMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.QUARTER_FINALS);
      if (qfMatches.every(m => m.played)) {
        const winners = qfMatches.map(m => m.winnerId);
        const pairings = [[winners[0], winners[1]], [winners[2], winners[3]]];
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.SEMI_FINALS,
          pairings,
          39, // Week 39 MIDWEEK
          MATCH_SLOTS.MIDWEEK,
          true
        );
        tournament.currentStage = TOURNAMENT_STAGES.SEMI_FINALS;
      }
    }

    // Week 39 MIDWEEK (SF completes) -> Generate 3rd Place & Final for Week 40 WEEKEND
    if (this.currentWeek === 39 && tournament.currentStage === TOURNAMENT_STAGES.SEMI_FINALS) {
      const sfMatches = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.SEMI_FINALS);
      if (sfMatches.every(m => m.played)) {
        const winners = sfMatches.map(m => m.winnerId);
        const losers = sfMatches.map(m => m.winnerId === m.homeId ? m.awayId : m.homeId);

        // Third place match
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.THIRD_PLACE,
          [[losers[0], losers[1]]],
          40,
          MATCH_SLOTS.MIDWEEK,
          true
        );

        // World Cup Grand Final
        this.generateKnockoutRound(
          tournament.id,
          TOURNAMENT_STAGES.FINAL,
          [[winners[0], winners[1]]],
          40,
          MATCH_SLOTS.WEEKEND,
          true
        );
        tournament.currentStage = TOURNAMENT_STAGES.FINAL;
      }
    }

    // Week 40 (Final completes)
    if (this.currentWeek === 40 && tournament.currentStage === TOURNAMENT_STAGES.FINAL) {
      const finalMatch = this.getTournamentMatchesByStage(tournament.id, TOURNAMENT_STAGES.FINAL)[0];
      if (finalMatch && finalMatch.played) {
        tournament.winnerId = finalMatch.winnerId;
        tournament.runnerUpId = finalMatch.winnerId === finalMatch.homeId ? finalMatch.awayId : finalMatch.homeId;
        tournament.isCompleted = true;
      }
    }
  }

  // ------------------------------------------
  // Helper Query Functions
  // ------------------------------------------
  getTournamentMatchesByStage(tournamentId, stage) {
    const list = [];
    this.calendar.forEach(weeklyMatches => {
      weeklyMatches.forEach(m => {
        if (m.tournamentId === tournamentId && m.stage === stage) {
          list.push(m);
        }
      });
    });
    return list;
  }

  createRandomPairings(ids) {
    const shuffled = [...ids].sort(() => 0.5 - Math.random());
    const pairings = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) {
        pairings.push([shuffled[i], shuffled[i + 1]]);
      }
    }
    return pairings;
  }
}

// ==========================================
// 8. VERIFICATION TEST RUN
// ==========================================

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('tournamentEngine.js')) {
  console.log('='.repeat(75));
  console.log('🏆 TOURNAMENT & FIXTURE SCHEDULING ENGINE - FULL SEASON VALIDATION');
  console.log('='.repeat(75));

  const manager = new TournamentManager();

  // 1. Register 16 Domestic League Teams
  const leagueTeamIds = [];
  for (let i = 1; i <= 16; i++) {
    const id = `CLUB_${String(i).padStart(2, '0')}`;
    leagueTeamIds.push(id);
    manager.registerTeam({
      id,
      name: `Premier Club ${i}`,
      rating: 70 + Math.floor(Math.random() * 20),
      leagueId: 'EPL',
      country: 'England'
    });
  }

  // 2. Register Additional Teams for Continental Champions League (Total 32)
  const continentalTeamIds = [...leagueTeamIds];
  for (let i = 17; i <= 32; i++) {
    const id = `EU_CLUB_${String(i).padStart(2, '0')}`;
    continentalTeamIds.push(id);
    manager.registerTeam({
      id,
      name: `European Club ${i}`,
      rating: 74 + Math.floor(Math.random() * 18),
      leagueId: 'CONTINENTAL_QUALIFIERS',
      country: 'Europe'
    });
  }

  // 3. Register 32 National Teams for Quadrennial World Cup
  const worldCupTeamIds = [];
  const sampleCountries = [
    'Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'England', 'Portugal', 'Netherlands',
    'Italy', 'Belgium', 'Croatia', 'Uruguay', 'Morocco', 'Japan', 'Senegal', 'USA',
    'Mexico', 'Switzerland', 'Denmark', 'Colombia', 'Egypt', 'Nigeria', 'South Korea', 'Australia',
    'Saudi Arabia', 'Cameroon', 'Ghana', 'Ecuador', 'Chile', 'Algeria', 'Poland', 'Austria'
  ];
  for (let i = 1; i <= 32; i++) {
    const id = `NAT_${String(i).padStart(2, '0')}`;
    worldCupTeamIds.push(id);
    manager.registerTeam({
      id,
      name: sampleCountries[i - 1],
      rating: 75 + Math.floor(Math.random() * 15),
      country: sampleCountries[i - 1],
      isNationalTeam: true
    });
  }

  // 4. Initialize Tournaments
  // A. Domestic League (Weeks 1 to 30)
  manager.registerTournament({
    id: 'DOMESTIC_LEAGUE_2026',
    name: 'National Premier League',
    type: TOURNAMENT_TYPES.LEAGUE
  });
  manager.generateLeagueFixtures('DOMESTIC_LEAGUE_2026', leagueTeamIds, 1, MATCH_SLOTS.WEEKEND);

  // B. Domestic Cup (Knockout across Weeks 8, 16, 24, 32)
  manager.registerTournament({
    id: 'FA_CUP_2026',
    name: 'National FA Cup',
    type: TOURNAMENT_TYPES.DOMESTIC_CUP,
    currentStage: TOURNAMENT_STAGES.ROUND_OF_16
  });
  const cupR16Pairings = manager.createRandomPairings(leagueTeamIds);
  manager.generateKnockoutRound(
    'FA_CUP_2026',
    TOURNAMENT_STAGES.ROUND_OF_16,
    cupR16Pairings,
    8, // Week 8 MIDWEEK
    MATCH_SLOTS.MIDWEEK
  );

  // C. Continental Champions League (Groups Weeks 3, 6, 9, 12, 15, 18 -> Knockout Weeks 21, 26, 29, 34, 37)
  manager.registerTournament({
    id: 'UCL_2026',
    name: 'Continental Champions League',
    type: TOURNAMENT_TYPES.CONTINENTAL
  });
  manager.generateContinentalGroups('UCL_2026', continentalTeamIds, [3, 6, 9, 12, 15, 18]);

  // D. Quadrennial World Cup (Every 4 years -> 2026 is a World Cup Year!)
  const isWorldCupYear = (manager.currentYear % 4 === 2) || (manager.currentYear === 2026);
  if (isWorldCupYear) {
    manager.registerTournament({
      id: 'WORLD_CUP_2026',
      name: 'FIFA World Cup 2026',
      type: TOURNAMENT_TYPES.WORLD_CUP
    });
    manager.generateWorldCup('WORLD_CUP_2026', worldCupTeamIds, [36, 37]);
  }

  console.log(`\n✅ Tournaments Initialized for Season ${manager.currentYear}:`);
  console.log(`   - Domestic League: 16 teams, 30 weeks double round-robin.`);
  console.log(`   - Domestic FA Cup: 16 teams single knockout (Weeks 8, 16, 24, 32).`);
  console.log(`   - Continental Champions League: 32 teams, 8 groups -> Knockouts.`);
  console.log(`   - Quadrennial World Cup: 32 National teams (Weeks 36-40).`);

  // 5. Execute Complete 48-Week Season Simulation with Collision Checks
  console.log('\n🚀 Simulating All 48 Game Weeks...');
  let totalMatchesPlayed = 0;

  for (let week = 1; week <= 48; week++) {
    const weeklyCount = (manager.calendar.get(week) || []).length;
    manager.simulateWeek();
    totalMatchesPlayed += weeklyCount;
  }

  console.log(`\n✨ Season ${manager.currentYear} Simulation Completed Successfully!`);
  console.log(`   Total Official Matches Scheduled & Played: ${totalMatchesPlayed}`);

  // Display Champions
  console.log('\n🏆  SEASON ROLL OF HONOUR:');
  manager.tournaments.forEach(trn => {
    const winner = manager.teams.get(trn.winnerId);
    const runnerUp = manager.teams.get(trn.runnerUpId);
    console.log(`   🏅 ${trn.name.padEnd(30)}: Champion -> ${winner?.name || 'TBD'} | Runner-up -> ${runnerUp?.name || 'TBD'}`);
  });

  // Display League Top 4
  console.log('\n📊  DOMESTIC LEAGUE FINAL TOP 4:');
  const leagueTable = manager.getRankedStandings('DOMESTIC_LEAGUE_2026').slice(0, 4);
  console.table(
    leagueTable.map((row, idx) => ({
      Rank: idx + 1,
      Team: manager.teams.get(row.teamId)?.name,
      P: row.played,
      W: row.won,
      D: row.drawn,
      L: row.lost,
      GF: row.goalsFor,
      GA: row.goalsAgainst,
      GD: row.goalDifference,
      PTS: row.points
    }))
  );

  console.log('='.repeat(75));
}
