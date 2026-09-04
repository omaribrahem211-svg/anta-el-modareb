import {
  Club,
  ContinentalGroup,
  ContinentalGroupStanding,
  ContinentalMatch,
  ContinentalTournament,
  Fixture,
  LeagueDefinition,
  LeagueStanding,
  MatchEvent,
  MatchStats,
} from '../types/game';
import { simulateMatch } from './engine';
import { GLOBAL_LEAGUES } from '../data/leaguesData';
import {
  EGYPT_PREMIER_CLUBS,
  MOROCCO_BOTOLA_CLUBS,
  TUNISIA_LIGUE_CLUBS,
  ALGERIA_LIGUE_CLUBS,
} from '../data/arabClubsData';
import {
  ENGLAND_PREMIER_CLUBS,
  SPAIN_LA_LIGA_CLUBS,
  ITALY_SERIE_A_CLUBS,
  GERMANY_BUNDESLIGA_CLUBS,
  FRANCE_LIGUE_1_CLUBS,
} from '../data/europeanClubsData';

// ----------------------------------------------------
// 1. INITIALIZATION: AFRICAN CHAMPIONS LEAGUE (CAF CL)
// ----------------------------------------------------

/**
 * Initializes the African Champions League (CAF CL)
 * 16 Top clubs across Africa (Egypt, Morocco, Tunisia, Algeria)
 * 4 Groups of 4 teams, 6 matchdays, Top 2 advance to Quarterfinals.
 */
export function initAfricanChampionsLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[]
): ContinentalTournament {
  // Collect top African clubs from data or qualifications
  let participantPool: Club[] = [];

  if (qualifiedClubs && qualifiedClubs.length >= 8) {
    participantPool = [...qualifiedClubs];
  } else {
    // Collect from Egyptian Premier League, Morocco, Tunisia, Algeria
    const egyptTeams = (GLOBAL_LEAGUES['egy_tier_1']?.teams || EGYPT_PREMIER_CLUBS).slice(0, 4);
    const moroccoTeams = (GLOBAL_LEAGUES['mar_tier_1']?.teams || MOROCCO_BOTOLA_CLUBS).slice(0, 4);
    const tunisiaTeams = (GLOBAL_LEAGUES['tun_tier_1']?.teams || TUNISIA_LIGUE_CLUBS).slice(0, 4);
    const algeriaTeams = (GLOBAL_LEAGUES['alg_tier_1']?.teams || ALGERIA_LIGUE_CLUBS).slice(0, 4);

    participantPool = [...egyptTeams, ...moroccoTeams, ...tunisiaTeams, ...algeriaTeams];
  }

  // Ensure we have 16 distinct clubs
  const uniquePool: Club[] = [];
  const seenIds = new Set<string>();

  participantPool.forEach(c => {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      uniquePool.push(c);
    }
  });

  // If user club is an Egyptian/African top tier club with top finish, ensure inclusion
  if (userClub && ['مصر', 'المغرب', 'تونس', 'الجزائر'].includes(userClub.country) && userClub.division === 1 && !seenIds.has(userClub.id)) {
    if (uniquePool.length >= 16) {
      uniquePool[uniquePool.length - 1] = userClub;
    } else {
      uniquePool.push(userClub);
    }
    seenIds.add(userClub.id);
  }

  // Backfill up to 16 teams if needed
  while (uniquePool.length < 16) {
    const fallbackId = `caf_club_${uniquePool.length + 1}`;
    uniquePool.push({
      id: fallbackId,
      name: `نادي إفريقي ${uniquePool.length + 1}`,
      shortName: `إفريقي ${uniquePool.length + 1}`,
      city: 'القاهرة',
      primaryColor: '#059669',
      secondaryColor: '#ffffff',
      budget: 5000000,
      transferBudget: 3000000,
      wageBudgetMonthly: 100000,
      reputation: 68,
      division: 1,
      country: 'مصر',
      facilities: {
        stadiumName: `ستاد إفريقيا ${uniquePool.length + 1}`,
        stadiumCapacity: 25000,
        stadiumLevel: 3,
        medicalCenterLevel: 3,
        trainingGroundLevel: 3,
        youthAcademyLevel: 3,
        scoutingNetworkLevel: 3,
      },
      sponsors: [],
      isUserClub: false,
      players: [],
    });
  }

  const shuffled = [...uniquePool.slice(0, 16)];

  const groupNames = [
    'المجموعة الأولى (A)',
    'المجموعة الثانية (B)',
    'المجموعة الثالثة (C)',
    'المجموعة الرابعة (D)',
  ];

  const groups: ContinentalGroup[] = [];
  const matches: ContinentalMatch[] = [];

  // Create 4 groups of 4
  for (let gIdx = 0; gIdx < 4; gIdx++) {
    const groupClubs = shuffled.slice(gIdx * 4, gIdx * 4 + 4);
    const groupTeamIds = groupClubs.map(c => c.id);
    const standings: ContinentalGroupStanding[] = groupClubs.map(c => ({
      teamId: c.id,
      teamName: c.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    const groupId = `ccl_group_${gIdx + 1}_s${seasonNumber}`;
    groups.push({
      id: groupId,
      name: groupNames[gIdx],
      teamIds: groupTeamIds,
      standings,
    });

    // Generate 6 matchdays for this group (Unified calendar matchday triggers: 3, 6, 8, 12, 14, 16)
    const [t0, t1, t2, t3] = groupTeamIds;
    const schedulePairs = [
      { md: 1, round: 3, pairs: [[t0, t1], [t2, t3]] },
      { md: 2, round: 6, pairs: [[t3, t0], [t1, t2]] },
      { md: 3, round: 8, pairs: [[t0, t2], [t1, t3]] },
      { md: 4, round: 12, pairs: [[t2, t0], [t3, t1]] },
      { md: 5, round: 14, pairs: [[t0, t3], [t2, t1]] },
      { md: 6, round: 16, pairs: [[t1, t0], [t3, t2]] },
    ];

    schedulePairs.forEach(sp => {
      sp.pairs.forEach((pair, pairIdx) => {
        matches.push({
          id: `ccl_m_g${gIdx + 1}_md${sp.md}_${pairIdx}_s${seasonNumber}`,
          stage: 'group',
          stageName: `المجموعات - الجولة ${sp.md}`,
          groupId,
          matchday: sp.md,
          roundTrigger: sp.round,
          homeTeamId: pair[0],
          awayTeamId: pair[1],
          isPlayed: false,
        });
      });
    });
  }

  return {
    id: `ccl_s${seasonNumber}`,
    competitionId: 'ccl',
    name: 'دوري أبطال إفريقيا',
    region: 'africa',
    seasonNumber,
    trophyName: 'كأس دوري أبطال إفريقيا',
    prizeMoneyWinner: 15000000,
    prizeMoneyRunnerUp: 7500000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

// ----------------------------------------------------
// 2. INITIALIZATION: UEFA CHAMPIONS LEAGUE (UCL)
// ----------------------------------------------------

/**
 * Initializes the UEFA Champions League (UCL)
 * 16 Top clubs across Europe (England, Spain, Italy, Germany, France)
 * 4 Groups of 4 teams, 6 matchdays, Top 2 advance to Quarterfinals.
 */
export function initUefaChampionsLeague(
  seasonNumber: number,
  allTeams: Club[],
  userClub?: Club,
  qualifiedClubs?: Club[]
): ContinentalTournament {
  let participantPool: Club[] = [];

  if (qualifiedClubs && qualifiedClubs.length >= 8) {
    participantPool = [...qualifiedClubs];
  } else {
    const engTeams = (GLOBAL_LEAGUES['eng_tier_1']?.teams || ENGLAND_PREMIER_CLUBS).slice(0, 4);
    const espTeams = (GLOBAL_LEAGUES['esp_tier_1']?.teams || SPAIN_LA_LIGA_CLUBS).slice(0, 4);
    const itaTeams = (GLOBAL_LEAGUES['ita_tier_1']?.teams || ITALY_SERIE_A_CLUBS).slice(0, 3);
    const gerTeams = (GLOBAL_LEAGUES['ger_tier_1']?.teams || GERMANY_BUNDESLIGA_CLUBS).slice(0, 3);
    const fraTeams = (GLOBAL_LEAGUES['fra_tier_1']?.teams || FRANCE_LIGUE_1_CLUBS).slice(0, 2);

    participantPool = [...engTeams, ...espTeams, ...itaTeams, ...gerTeams, ...fraTeams];
  }

  const uniquePool: Club[] = [];
  const seenIds = new Set<string>();

  participantPool.forEach(c => {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      uniquePool.push(c);
    }
  });

  // If user club is a European top tier club, add them
  if (userClub && ['إنجلترا', 'إسبانيا', 'إيطاليا', 'ألمانيا', 'فرنسا'].includes(userClub.country) && userClub.division === 1 && !seenIds.has(userClub.id)) {
    if (uniquePool.length >= 16) {
      uniquePool[uniquePool.length - 1] = userClub;
    } else {
      uniquePool.push(userClub);
    }
    seenIds.add(userClub.id);
  }

  while (uniquePool.length < 16) {
    const fallbackId = `ucl_club_${uniquePool.length + 1}`;
    uniquePool.push({
      id: fallbackId,
      name: `نادي أوروبي ${uniquePool.length + 1}`,
      shortName: `أوروبي ${uniquePool.length + 1}`,
      city: 'مدريد',
      primaryColor: '#1e3a8a',
      secondaryColor: '#ffffff',
      budget: 50000000,
      transferBudget: 30000000,
      wageBudgetMonthly: 500000,
      reputation: 82,
      division: 1,
      country: 'إسبانيا',
      facilities: {
        stadiumName: `ستاد أوروبا ${uniquePool.length + 1}`,
        stadiumCapacity: 55000,
        stadiumLevel: 5,
        medicalCenterLevel: 5,
        trainingGroundLevel: 5,
        youthAcademyLevel: 5,
        scoutingNetworkLevel: 5,
      },
      sponsors: [],
      isUserClub: false,
      players: [],
    });
  }

  const shuffled = [...uniquePool.slice(0, 16)];

  const groupNames = [
    'المجموعة الأولى (A)',
    'المجموعة الثانية (B)',
    'المجموعة الثالثة (C)',
    'المجموعة الرابعة (D)',
  ];

  const groups: ContinentalGroup[] = [];
  const matches: ContinentalMatch[] = [];

  for (let gIdx = 0; gIdx < 4; gIdx++) {
    const groupClubs = shuffled.slice(gIdx * 4, gIdx * 4 + 4);
    const groupTeamIds = groupClubs.map(c => c.id);
    const standings: ContinentalGroupStanding[] = groupClubs.map(c => ({
      teamId: c.id,
      teamName: c.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    const groupId = `ucl_group_${gIdx + 1}_s${seasonNumber}`;
    groups.push({
      id: groupId,
      name: groupNames[gIdx],
      teamIds: groupTeamIds,
      standings,
    });

    const [t0, t1, t2, t3] = groupTeamIds;
    const schedulePairs = [
      { md: 1, round: 3, pairs: [[t0, t1], [t2, t3]] },
      { md: 2, round: 6, pairs: [[t3, t0], [t1, t2]] },
      { md: 3, round: 8, pairs: [[t0, t2], [t1, t3]] },
      { md: 4, round: 12, pairs: [[t2, t0], [t3, t1]] },
      { md: 5, round: 14, pairs: [[t0, t3], [t2, t1]] },
      { md: 6, round: 16, pairs: [[t1, t0], [t3, t2]] },
    ];

    schedulePairs.forEach(sp => {
      sp.pairs.forEach((pair, pairIdx) => {
        matches.push({
          id: `ucl_m_g${gIdx + 1}_md${sp.md}_${pairIdx}_s${seasonNumber}`,
          stage: 'group',
          stageName: `المجموعات - الجولة ${sp.md}`,
          groupId,
          matchday: sp.md,
          roundTrigger: sp.round,
          homeTeamId: pair[0],
          awayTeamId: pair[1],
          isPlayed: false,
        });
      });
    });
  }

  return {
    id: `ucl_s${seasonNumber}`,
    competitionId: 'ucl',
    name: 'دوري أبطال أوروبا',
    region: 'europe',
    seasonNumber,
    trophyName: 'كأس ذات الأذنين (دوري أبطال أوروبا)',
    prizeMoneyWinner: 85000000,
    prizeMoneyRunnerUp: 45000000,
    groups,
    matches,
    isCompleted: false,
    currentStage: 'group',
  };
}

// ----------------------------------------------------
// 3. KNOCKOUT MATCH SIMULATOR WITH PENALTIES
// ----------------------------------------------------

export function simulateKnockoutMatch(
  homeTeam: Club,
  awayTeam: Club
): {
  homeScore: number;
  awayScore: number;
  homePenalties?: number;
  awayPenalties?: number;
  winnerTeamId: string;
  events: MatchEvent[];
  stats: MatchStats;
} {
  const baseResult = simulateMatch(homeTeam, awayTeam);
  let homeScore = baseResult.homeScore;
  let awayScore = baseResult.awayScore;
  let homePenalties: number | undefined = undefined;
  let awayPenalties: number | undefined = undefined;
  let winnerTeamId = '';

  if (homeScore > awayScore) {
    winnerTeamId = homeTeam.id;
  } else if (awayScore > homeScore) {
    winnerTeamId = awayTeam.id;
  } else {
    // Scores are tied -> Penalty shootout!
    const homeRep = homeTeam.reputation || 50;
    const awayRep = awayTeam.reputation || 50;
    const repDiff = homeRep - awayRep;

    // Simulate 5 penalties each
    let homeP = Math.floor(Math.random() * 2 + 3); // 3 to 5
    let awayP = Math.floor(Math.random() * 2 + 3);

    if (repDiff > 10 && Math.random() < 0.65) {
      homeP = Math.max(homeP, awayP + 1);
    } else if (repDiff < -10 && Math.random() < 0.65) {
      awayP = Math.max(awayP, homeP + 1);
    }

    if (homeP === awayP) {
      if (Math.random() > 0.5) {
        homeP += 1;
      } else {
        awayP += 1;
      }
    }

    homePenalties = homeP;
    awayPenalties = awayP;
    winnerTeamId = homeP > awayP ? homeTeam.id : awayTeam.id;

    const winnerClub = winnerTeamId === homeTeam.id ? homeTeam : awayTeam;
    baseResult.events.push({
      minute: 120,
      type: 'commentary',
      teamId: winnerTeamId,
      description: `🎯 حسمت ركلات الترجيح الموقعة لصالح (${winnerClub.shortName || winnerClub.name}) بنتيجة (${homeP} - ${awayP}) بعد التعادل في الوقت الأصلي!`,
    });
  }

  return {
    homeScore,
    awayScore,
    homePenalties,
    awayPenalties,
    winnerTeamId,
    events: baseResult.events,
    stats: baseResult.stats,
  };
}

// ----------------------------------------------------
// 4. ADVANCEMENT OF CONTINENTAL TOURNAMENT
// ----------------------------------------------------

export function advanceContinentalTournament(
  tournament: ContinentalTournament,
  currentRound: number,
  allTeamsMap: Map<string, Club>,
  userClub?: Club | null
): {
  updatedTournament: ContinentalTournament;
  userMatchThisRound?: ContinentalMatch;
  newsMessage?: string;
} {
  if (tournament.isCompleted) {
    return { updatedTournament: tournament };
  }

  let updatedTournament = { ...tournament };
  let matches = [...updatedTournament.matches];
  let groups = [...updatedTournament.groups];
  let userMatchThisRound: ContinentalMatch | undefined = undefined;
  let newsMessage: string | undefined = undefined;

  // Helper to find a club by ID
  const findClub = (id: string): Club => {
    return allTeamsMap.get(id) || {
      id,
      name: 'نادي منافس',
      shortName: 'منافس',
      city: 'القاهرة',
      primaryColor: '#334155',
      secondaryColor: '#ffffff',
      budget: 1000000,
      transferBudget: 500000,
      wageBudgetMonthly: 50000,
      reputation: 60,
      division: 1,
      country: 'مصر',
      facilities: {
        stadiumName: 'ستاد المنافس',
        stadiumCapacity: 20000,
        stadiumLevel: 3,
        medicalCenterLevel: 3,
        trainingGroundLevel: 3,
        youthAcademyLevel: 3,
        scoutingNetworkLevel: 3,
      },
      sponsors: [],
      isUserClub: false,
      players: [],
    };
  };

  // ----------------------------------------------------
  // A. SIMULATE GROUP STAGE MATCHES (Rounds 2, 4, 6, 8, 10, 12)
  // ----------------------------------------------------
  const unplayedGroupMatches = matches.filter(
    m => m.stage === 'group' && m.roundTrigger === currentRound && !m.isPlayed
  );

  if (unplayedGroupMatches.length > 0) {
    unplayedGroupMatches.forEach(gMatch => {
      const homeTeam = findClub(gMatch.homeTeamId);
      const awayTeam = findClub(gMatch.awayTeamId);
      const res = simulateMatch(homeTeam, awayTeam);

      gMatch.homeScore = res.homeScore;
      gMatch.awayScore = res.awayScore;
      gMatch.isPlayed = true;
      gMatch.winnerTeamId =
        res.homeScore > res.awayScore
          ? homeTeam.id
          : res.awayScore > res.homeScore
          ? awayTeam.id
          : undefined;
      gMatch.events = res.events;
      gMatch.stats = res.stats;

      if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
        userMatchThisRound = gMatch;
      }

      // Update Group Standings
      if (gMatch.groupId) {
        const group = groups.find(g => g.id === gMatch.groupId);
        if (group) {
          group.standings = group.standings.map(s => {
            if (s.teamId === homeTeam.id) {
              const isWin = res.homeScore > res.awayScore;
              const isDraw = res.homeScore === res.awayScore;
              const isLoss = res.homeScore < res.awayScore;
              return {
                ...s,
                played: s.played + 1,
                won: s.won + (isWin ? 1 : 0),
                drawn: s.drawn + (isDraw ? 1 : 0),
                lost: s.lost + (isLoss ? 1 : 0),
                goalsFor: s.goalsFor + res.homeScore,
                goalsAgainst: s.goalsAgainst + res.awayScore,
                goalDifference: s.goalsFor + res.homeScore - (s.goalsAgainst + res.awayScore),
                points: s.points + (isWin ? 3 : isDraw ? 1 : 0),
              };
            }
            if (s.teamId === awayTeam.id) {
              const isWin = res.awayScore > res.homeScore;
              const isDraw = res.homeScore === res.awayScore;
              const isLoss = res.awayScore < res.homeScore;
              return {
                ...s,
                played: s.played + 1,
                won: s.won + (isWin ? 1 : 0),
                drawn: s.drawn + (isDraw ? 1 : 0),
                lost: s.lost + (isLoss ? 1 : 0),
                goalsFor: s.goalsFor + res.awayScore,
                goalsAgainst: s.goalsAgainst + res.homeScore,
                goalDifference: s.goalsFor + res.awayScore - (s.goalsAgainst + res.homeScore),
                points: s.points + (isWin ? 3 : isDraw ? 1 : 0),
              };
            }
            return s;
          }).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          });
        }
      }
    });

    const matchdayNum = unplayedGroupMatches[0]?.matchday || 1;
    newsMessage = `انتهت مباريات الجولة ${matchdayNum} من دور المجموعات لـ ${tournament.name}!`;

    // If Matchday 6 (Round 16) just concluded, Generate Quarterfinals!
    if (currentRound === 16) {
      updatedTournament.currentStage = 'quarter';
      const qualifiedFirst: string[] = [];
      const qualifiedSecond: string[] = [];

      groups.forEach(g => {
        if (g.standings.length >= 2) {
          qualifiedFirst.push(g.standings[0].teamId);
          qualifiedSecond.push(g.standings[1].teamId);
        }
      });

      // User check
      if (userClub) {
        const isUserQualified =
          qualifiedFirst.includes(userClub.id) || qualifiedSecond.includes(userClub.id);
        const wasInTournament = groups.some(g => g.teamIds.includes(userClub.id));
        if (wasInTournament && !isUserQualified) {
          updatedTournament.userEliminatedStage = 'دور المجموعات';
        }
      }

      // Pair up QFs: A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2
      if (qualifiedFirst.length === 4 && qualifiedSecond.length === 4) {
        const qfPairs = [
          { home: qualifiedFirst[0], away: qualifiedSecond[1] },
          { home: qualifiedFirst[1], away: qualifiedSecond[0] },
          { home: qualifiedFirst[2], away: qualifiedSecond[3] },
          { home: qualifiedFirst[3], away: qualifiedSecond[2] },
        ];

        qfPairs.forEach((pair, idx) => {
          matches.push({
            id: `${tournament.competitionId}_qf_${idx + 1}_s${tournament.seasonNumber}`,
            stage: 'quarter',
            stageName: `ربع النهائي - مباراة ${idx + 1}`,
            roundTrigger: 18,
            homeTeamId: pair.home,
            awayTeamId: pair.away,
            isPlayed: false,
          });
        });

        newsMessage = `اكتمل دور المجموعات وتحددت مواجهات الدور ربع النهائي النارية لـ ${tournament.name}! 🌟`;
      }
    }
  }

  // ----------------------------------------------------
  // B. SIMULATE QUARTERFINALS (Round 18)
  // ----------------------------------------------------
  if (currentRound === 18) {
    const unplayedQFs = matches.filter(m => m.stage === 'quarter' && !m.isPlayed);
    if (unplayedQFs.length > 0) {
      const sfWinners: string[] = [];

      unplayedQFs.forEach((qfMatch, idx) => {
        const homeTeam = findClub(qfMatch.homeTeamId);
        const awayTeam = findClub(qfMatch.awayTeamId);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);

        qfMatch.homeScore = res.homeScore;
        qfMatch.awayScore = res.awayScore;
        qfMatch.homePenalties = res.homePenalties;
        qfMatch.awayPenalties = res.awayPenalties;
        qfMatch.isPlayed = true;
        qfMatch.winnerTeamId = res.winnerTeamId;
        qfMatch.events = res.events;
        qfMatch.stats = res.stats;

        sfWinners.push(res.winnerTeamId);

        if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
          userMatchThisRound = qfMatch;
          if (res.winnerTeamId !== userClub.id) {
            updatedTournament.userEliminatedStage = 'الدور ربع النهائي';
          }
        }
      });

      // Generate Semifinals for Round 20
      if (sfWinners.length >= 4) {
        updatedTournament.currentStage = 'semi';
        matches.push(
          {
            id: `${tournament.competitionId}_sf_1_s${tournament.seasonNumber}`,
            stage: 'semi',
            stageName: 'نصف النهائي - المباراة الأولى',
            roundTrigger: 20,
            homeTeamId: sfWinners[0],
            awayTeamId: sfWinners[1],
            isPlayed: false,
          },
          {
            id: `${tournament.competitionId}_sf_2_s${tournament.seasonNumber}`,
            stage: 'semi',
            stageName: 'نصف النهائي - المباراة الثانية',
            roundTrigger: 20,
            homeTeamId: sfWinners[2],
            awayTeamId: sfWinners[3],
            isPlayed: false,
          }
        );
      }

      newsMessage = `إثارة بالغة في ربع نهائي ${tournament.name} وتأهل الفرق الأربعة إلى المربع الذهبي!`;
    }
  }

  // ----------------------------------------------------
  // C. SIMULATE SEMIFINALS (Round 20)
  // ----------------------------------------------------
  if (currentRound === 20) {
    const unplayedSFs = matches.filter(m => m.stage === 'semi' && !m.isPlayed);
    if (unplayedSFs.length > 0) {
      const finalWinners: string[] = [];

      unplayedSFs.forEach(sfMatch => {
        const homeTeam = findClub(sfMatch.homeTeamId);
        const awayTeam = findClub(sfMatch.awayTeamId);
        const res = simulateKnockoutMatch(homeTeam, awayTeam);

        sfMatch.homeScore = res.homeScore;
        sfMatch.awayScore = res.awayScore;
        sfMatch.homePenalties = res.homePenalties;
        sfMatch.awayPenalties = res.awayPenalties;
        sfMatch.isPlayed = true;
        sfMatch.winnerTeamId = res.winnerTeamId;
        sfMatch.events = res.events;
        sfMatch.stats = res.stats;

        finalWinners.push(res.winnerTeamId);

        if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
          userMatchThisRound = sfMatch;
          if (res.winnerTeamId !== userClub.id) {
            updatedTournament.userEliminatedStage = 'نصف النهائي';
          }
        }
      });

      // Generate Final for Round 22
      if (finalWinners.length >= 2) {
        updatedTournament.currentStage = 'final';
        matches.push({
          id: `${tournament.competitionId}_final_s${tournament.seasonNumber}`,
          stage: 'final',
          stageName: 'المباراة النهائية الكبرى',
          roundTrigger: 22,
          homeTeamId: finalWinners[0],
          awayTeamId: finalWinners[1],
          isPlayed: false,
        });
      }

      newsMessage = `تحدد طرفا النهائي الحلم لبطولة ${tournament.name}! 🏆`;
    }
  }

  // ----------------------------------------------------
  // D. SIMULATE FINAL (Round 22)
  // ----------------------------------------------------
  if (currentRound === 22) {
    const finalMatch = matches.find(m => m.stage === 'final' && !m.isPlayed);
    if (finalMatch) {
      const homeTeam = findClub(finalMatch.homeTeamId);
      const awayTeam = findClub(finalMatch.awayTeamId);
      const res = simulateKnockoutMatch(homeTeam, awayTeam);

      finalMatch.homeScore = res.homeScore;
      finalMatch.awayScore = res.awayScore;
      finalMatch.homePenalties = res.homePenalties;
      finalMatch.awayPenalties = res.awayPenalties;
      finalMatch.isPlayed = true;
      finalMatch.winnerTeamId = res.winnerTeamId;
      finalMatch.events = res.events;
      finalMatch.stats = res.stats;

      const runnerUpId = res.winnerTeamId === homeTeam.id ? awayTeam.id : homeTeam.id;

      updatedTournament.isCompleted = true;
      updatedTournament.currentStage = 'completed';
      updatedTournament.winnerClubId = res.winnerTeamId;
      updatedTournament.runnerUpClubId = runnerUpId;

      if (userClub && (homeTeam.id === userClub.id || awayTeam.id === userClub.id)) {
        userMatchThisRound = finalMatch;
        if (res.winnerTeamId !== userClub.id) {
          updatedTournament.userEliminatedStage = 'الوصيف (نهائي البطولة)';
        }
      }

      const winnerClub = findClub(res.winnerTeamId);
      newsMessage = `ألف مبروك لفريق (${winnerClub.name}) التتويج بلقب ${tournament.name} ورفع ${tournament.trophyName}! 🏆🎉`;
    }
  }

  return {
    updatedTournament: {
      ...updatedTournament,
      matches,
      groups,
    },
    userMatchThisRound,
    newsMessage,
  };
}

// ----------------------------------------------------
// 5. CONTINENTAL QUALIFICATION FOR NEXT SEASON
// ----------------------------------------------------

export function determineQualifiedClubsForContinental(
  allLeagues: Record<string, LeagueDefinition>,
  standingsByLeague: Record<string, LeagueStanding[]>
): {
  africanClubs: Club[];
  uefaClubs: Club[];
} {
  const africanClubs: Club[] = [];
  const uefaClubs: Club[] = [];

  // African Leagues: Egypt (top 2), Morocco (top 2), Tunisia (top 2), Algeria (top 2)
  const africanLeagueIds = ['egy_tier_1', 'mar_tier_1', 'tun_tier_1', 'alg_tier_1'];
  africanLeagueIds.forEach(lgId => {
    const lg = allLeagues[lgId] || GLOBAL_LEAGUES[lgId];
    if (!lg) return;
    const std = standingsByLeague[lgId];
    if (std && std.length >= 2) {
      const top1 = lg.teams.find(t => t.id === std[0].teamId);
      const top2 = lg.teams.find(t => t.id === std[1].teamId);
      if (top1) africanClubs.push(top1);
      if (top2) africanClubs.push(top2);
    } else {
      africanClubs.push(...lg.teams.slice(0, 4));
    }
  });

  // European Leagues: England (top 4), Spain (top 4), Italy (top 3), Germany (top 3), France (top 2)
  const uefaLeaguesConfig = [
    { id: 'eng_tier_1', spots: 4 },
    { id: 'esp_tier_1', spots: 4 },
    { id: 'ita_tier_1', spots: 3 },
    { id: 'ger_tier_1', spots: 3 },
    { id: 'fra_tier_1', spots: 2 },
  ];

  uefaLeaguesConfig.forEach(cfg => {
    const lg = allLeagues[cfg.id] || GLOBAL_LEAGUES[cfg.id];
    if (!lg) return;
    const std = standingsByLeague[cfg.id];
    if (std && std.length >= cfg.spots) {
      for (let i = 0; i < cfg.spots; i++) {
        const club = lg.teams.find(t => t.id === std[i].teamId);
        if (club) uefaClubs.push(club);
      }
    } else {
      uefaClubs.push(...lg.teams.slice(0, cfg.spots));
    }
  });

  return { africanClubs, uefaClubs };
}
