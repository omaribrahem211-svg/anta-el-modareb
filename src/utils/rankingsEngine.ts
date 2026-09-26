import { 
  Club, 
  ClubManager, 
  ClubSquadStrength, 
  ManagerProfile, 
  Player, 
  TeamTactics, 
  WorldClubRankingItem, 
  WorldRankingsData 
} from '../types/game';
import { GLOBAL_LEAGUES } from '../data/leaguesData';
import { getOrCreateClubManager } from '../data/worldManagersData';

/**
 * Calculates accurate Starting XI Squad Strength and sub-ratings
 */
export function calculateSquadStrength(club?: Club | null, customTactics?: TeamTactics): ClubSquadStrength {
  const players = Array.isArray(club?.players) ? club.players.filter(Boolean) : [];
  if (players.length === 0) {
    const fallback = club?.reputation ? Math.round(club.reputation * 0.9) : 60;
    return {
      overall: fallback,
      attack: fallback,
      midfield: fallback,
      defense: fallback,
      goalkeeper: fallback,
      benchOverall: fallback,
    };
  }

  const tactics = customTactics || club?.tactics;
  const startingIds = tactics?.startingPlayerIds?.length === 11 
    ? tactics.startingPlayerIds 
    : players.slice(0, 11).map(p => p?.id).filter(Boolean);

  const startingPlayers = players.filter(p => p && p.id && startingIds.includes(p.id));
  const effectiveStarters = startingPlayers.length === 11 ? startingPlayers : players.slice(0, 11);

  let totalStartersRating = 0;
  let atkSum = 0, atkCount = 0;
  let midSum = 0, midCount = 0;
  let defSum = 0, defCount = 0;
  let gkRating = 60;

  effectiveStarters.forEach(p => {
    if (!p) return;
    // Fitness & morale factor (0.9 to 1.05)
    const conditionMult = 0.85 + ((p.fitness || 100) / 400) + ((p.morale || 70) / 600);
    const effRating = (p.overallRating || 60) * conditionMult;
    totalStartersRating += effRating;

    if (p.positionCategory === 'FWD') {
      atkSum += effRating;
      atkCount++;
    } else if (p.positionCategory === 'MID') {
      midSum += effRating;
      midCount++;
    } else if (p.positionCategory === 'DEF') {
      defSum += effRating;
      defCount++;
    } else if (p.positionCategory === 'GK') {
      gkRating = Math.round(effRating);
    }
  });

  const overall = Math.round(totalStartersRating / (effectiveStarters.length || 1));
  const attack = Math.round(atkCount > 0 ? atkSum / atkCount : overall);
  const midfield = Math.round(midCount > 0 ? midSum / midCount : overall);
  const defense = Math.round(defCount > 0 ? defSum / defCount : overall);

  const benchIds = tactics?.benchPlayerIds || [];
  const benchPlayers = players.filter(p => p && p.id && benchIds.includes(p.id));
  const benchTotal = benchPlayers.length > 0
    ? benchPlayers.reduce((acc, p) => acc + (p?.overallRating || 60), 0) / benchPlayers.length
    : overall - 4;
  const benchOverall = Math.round(benchTotal);

  return {
    overall,
    attack,
    midfield,
    defense,
    goalkeeper: gkRating,
    benchOverall,
  };
}

/**
 * Computes User Manager's Dynamic Rating (35 to 99) based on level, win rate, reputation, and titles
 * Rebalanced for long-term engagement: Progression is challenging and authentic.
 */
export function calculateDynamicManagerRating(manager: ManagerProfile): number {
  if (!manager) return 40;

  // Base for a starting/novice manager
  let base = 35;

  // 1. Level & Experience Contribution (hard logarithmic scale, max +14)
  const levelBonus = Math.min(14, Math.floor(Math.sqrt(manager.level || 1) * 2.5));
  base += levelBonus;

  // 2. Matches Managed & Longevity (max +12)
  const matchExp = Math.min(12, Math.floor(Math.log10(Math.max(1, manager.matchesManaged || 0) + 1) * 5.2));
  base += matchExp;

  // 3. License Contribution (Hard milestones)
  switch (manager.license) {
    case 'D': base += 2; break;
    case 'C': base += 5; break;
    case 'B': base += 9; break;
    case 'A': base += 14; break;
    case 'PRO': base += 20; break;
    case 'ELITE': base += 28; break;
    default: break;
  }

  // 4. Reputation Contribution (max +8)
  base += Math.min(8, Math.floor((manager.reputation || 10) * 0.08));

  // 5. Win Rate Quality (Only applies after at least 15 matches, max +6, can decrease by -3 if struggling)
  if ((manager.matchesManaged || 0) >= 15) {
    const winRate = (manager.wins || 0) / manager.matchesManaged;
    if (winRate >= 0.70) base += 6;
    else if (winRate >= 0.55) base += 4;
    else if (winRate >= 0.40) base += 2;
    else if (winRate < 0.25) base -= 3;
  }

  // 6. Major Trophies Won (Prestige milestones, max +20)
  const trophies = manager.trophies || [];
  let trophyBonus = 0;
  trophies.forEach(t => {
    if (t.includes('أبطال أوروبا') || t.includes('UCL') || t.includes('العالم للأندية')) trophyBonus += 6;
    else if (t.includes('البريميرليغ') || t.includes('لا ليغا') || t.includes('سيريا أ') || t.includes('البوندسليغا')) trophyBonus += 4;
    else if (t.includes('أبطال إفريقيا') || t.includes('أبطال آسيا')) trophyBonus += 3.5;
    else if (t.includes('الممتاز المصري') || t.includes('روشن')) trophyBonus += 2;
    else if (t.includes('كأس') || t.includes('Cup')) trophyBonus += 1.5;
    else trophyBonus += 0.8;
  });
  base += Math.min(20, Math.round(trophyBonus));

  return Math.min(99, Math.max(35, Math.round(base)));
}

export interface MatchProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  tacticalEdge: 'home' | 'away' | 'balanced';
}

/**
 * Calculates win/draw/loss odds based on squad strengths, home advantage, and manager ratings
 */
export function calculateMatchProbabilities(
  homeSquad: ClubSquadStrength,
  awaySquad: ClubSquadStrength,
  homeManagerRating: number = 65,
  awayManagerRating: number = 65
): MatchProbabilities {
  // Home advantage gives roughly +3.5 squad power equivalent
  const homePower = homeSquad.overall + 3.5 + (homeManagerRating * 0.15);
  const awayPower = awaySquad.overall + (awayManagerRating * 0.15);

  const powerDiff = homePower - awayPower;

  // Base percentages around balanced match (40% home win, 28% draw, 32% away win)
  let homeWinPct = 40 + (powerDiff * 2.8);
  let drawPct = 28 - (Math.abs(powerDiff) * 0.8);
  let awayWinPct = 32 - (powerDiff * 2.8);

  // Clamp values
  homeWinPct = Math.max(10, Math.min(80, homeWinPct));
  awayWinPct = Math.max(10, Math.min(80, awayWinPct));
  drawPct = Math.max(10, Math.min(40, drawPct));

  // Normalize to 100%
  const total = homeWinPct + drawPct + awayWinPct;
  const h = Math.round((homeWinPct / total) * 100);
  const d = Math.round((drawPct / total) * 100);
  const a = 100 - h - d;

  let tacticalEdge: 'home' | 'away' | 'balanced' = 'balanced';
  if (h >= a + 15) tacticalEdge = 'home';
  else if (a >= h + 15) tacticalEdge = 'away';

  return {
    homeWin: h,
    draw: d,
    awayWin: a,
    tacticalEdge,
  };
}

/**
 * Calculates Manager & Club Ranking Points earned from a single match result
 * Realistic tournament prestige weights
 */
export function calculateMatchRankingPoints(
  result: 'W' | 'D' | 'L',
  leagueTier: number,
  leagueReputation: number,
  competitionType: 'league' | 'cup' | 'continental' | 'world' = 'league',
  opponentRating: number = 70
): { managerPointsDelta: number; clubPointsDelta: number } {
  // Base competition weight
  let compWeight = 1.0;
  if (competitionType === 'world') compWeight = 4.0; // Club World Cup
  else if (competitionType === 'continental') compWeight = 2.8; // Champions League
  else if (competitionType === 'cup') compWeight = 1.6; // National Cup
  else {
    // League tier weight
    if (leagueTier === 1) {
      compWeight = leagueReputation >= 90 ? 2.5 : leagueReputation >= 80 ? 1.8 : 1.4;
    } else if (leagueTier === 2) {
      compWeight = 1.0;
    } else if (leagueTier === 3) {
      compWeight = 0.6;
    } else {
      compWeight = 0.35; // 4th tier
    }
  }

  // Difficulty multiplier based on opponent
  const oppFactor = Math.max(0.6, Math.min(1.8, opponentRating / 75));

  let basePoints = 0;
  if (result === 'W') {
    basePoints = 25 * compWeight * oppFactor;
  } else if (result === 'D') {
    basePoints = 8 * compWeight * oppFactor;
  } else {
    basePoints = -4 * compWeight * (1 / oppFactor);
  }

  const managerPointsDelta = Math.round(basePoints);
  const clubPointsDelta = Math.round(basePoints * 1.5);

  return { managerPointsDelta, clubPointsDelta };
}

/**
 * Calculates Tournament Championship Points for winning a title
 */
export function calculateTrophyRankingPoints(
  tournamentName: string,
  tier: number,
  isContinental: boolean = false,
  isWorld: boolean = false
): number {
  if (isWorld) return 5000; // FIFA Club World Cup
  if (isContinental) {
    if (tournamentName.includes('أوروبا') || tournamentName.includes('UCL')) return 4000;
    return 1800; // CAF Champions League / AFC Champions League
  }
  if (tier === 1) {
    if (tournamentName.includes('البريميرليغ') || tournamentName.includes('لا ليغا')) return 3000;
    if (tournamentName.includes('سيريا أ') || tournamentName.includes('البوندسليغا')) return 2600;
    if (tournamentName.includes('روشن')) return 1400;
    return 950; // Egyptian Premier League
  }
  if (tier === 2) return 450;
  if (tier === 3) return 250;
  return 150; // 4th tier
}

/**
 * Builds the complete monthly World Rankings list for all clubs & managers
 */
export function generateMonthlyWorldRankings(
  userManager?: ManagerProfile | null,
  userClub?: Club | null,
  currentCalendarMonthStr: string = '2026-08'
): WorldRankingsData {
  const safeUserManager = userManager || ({
    id: 'user_manager',
    name: 'المدرب',
    shortName: 'المدرب',
    nationality: 'مصر',
    countryCode: 'EGY',
    age: 38,
    reputation: 20,
    wins: 0,
    rankingPoints: 1000,
    worldRank: 850,
    previousWorldRank: 850,
    monthlyRankChange: 0,
    trophies: [],
  } as any);

  const safeUserClub = userClub || ({
    id: 'user_club_default',
    name: 'النادي',
    reputation: 50,
    leagueId: 'egy_tier_4',
    isUserClub: true,
    players: [],
  } as any);

  // 1. Gather all clubs from all global leagues
  const allClubsMap = new Map<string, Club>();

  Object.values(GLOBAL_LEAGUES || {}).forEach(league => {
    (league?.teams || []).forEach(club => {
      if (club && club.id && !allClubsMap.has(club.id)) {
        allClubsMap.set(club.id, club);
      }
    });
  });

  // Ensure user club is correctly updated
  if (safeUserClub?.id && allClubsMap.has(safeUserClub.id)) {
    allClubsMap.set(safeUserClub.id, {
      ...allClubsMap.get(safeUserClub.id)!,
      ...safeUserClub,
      isUserClub: true,
    });
  }

  const clubsList = Array.from(allClubsMap.values()).filter(c => c && c.id);

  // 2. Compute user manager representation
  const userMgrRating = calculateDynamicManagerRating(safeUserManager);
  const userMgrPoints = safeUserManager.rankingPoints || Math.round(userMgrRating * 30 + (safeUserManager.wins || 0) * 15);

  const userManagerEntry: ClubManager = {
    id: 'user_manager',
    name: `${safeUserManager.name || 'المدرب'} (أنت)`,
    shortName: safeUserManager.shortName || safeUserManager.name || 'المدرب',
    nationality: safeUserManager.nationality || 'مصر',
    countryCode: 'EGY',
    age: safeUserManager.age || 38,
    rating: userMgrRating,
    tacticalStyle: 'balanced',
    preferredFormation: safeUserManager.favoriteFormation || '4-3-3',
    reputation: safeUserManager.reputation || 20,
    rankingPoints: userMgrPoints,
    worldRank: safeUserManager.worldRank || 850,
    previousWorldRank: safeUserManager.previousWorldRank || 850,
    monthlyRankChange: safeUserManager.monthlyRankChange || 0,
    trophiesWonCount: safeUserManager.trophies?.length || 0,
    majorTrophies: safeUserManager.trophies || [],
    currentClubId: safeUserClub?.id || '',
    currentClubName: safeUserClub?.name || 'بدون نادي',
    currentLeagueId: safeUserClub?.leagueId,
  };

  // 3. Build Managers List
  const managersList: ClubManager[] = [];
  managersList.push(userManagerEntry);

  clubsList.forEach(club => {
    if (!club || club.isUserClub) return; // User manager already added

    const mgr = club.manager || getOrCreateClubManager(club);
    if (!mgr) return;
    const existing = managersList.find(m => m && (m.id === mgr.id || m.name === mgr.name));
    if (!existing) {
      managersList.push({
        ...mgr,
        currentClubId: club.id,
        currentClubName: club.name,
        currentLeagueId: club.leagueId,
      });
    }
  });

  // Sort managers by ranking points descending
  managersList.sort((a, b) => (b?.rankingPoints || 0) - (a?.rankingPoints || 0) || (b?.rating || 0) - (a?.rating || 0));

  // Assign world rank and rank delta
  managersList.forEach((mgr, idx) => {
    if (!mgr) return;
    const newRank = idx + 1;
    const prevRank = mgr.previousWorldRank || newRank;
    mgr.worldRank = newRank;
    mgr.previousWorldRank = prevRank;
    mgr.monthlyRankChange = prevRank - newRank; // positive = moved up
  });

  // 4. Build World Clubs List
  const rankedClubs: WorldClubRankingItem[] = clubsList.map(club => {
    const strength = club.squadStrength || calculateSquadStrength(club);
    const mgr = club.isUserClub ? userManagerEntry : (club.manager || getOrCreateClubManager(club));
    const mgrRating = mgr?.rating || 60;
    
    // Club points based on reputation, squad strength, league tier, and manager
    const tierBonus = club.division === 1 ? 8000 : club.division === 2 ? 3500 : club.division === 3 ? 1500 : 500;
    const basePts = ((club.reputation || 30) * 120) + ((strength?.overall || 60) * 60) + (mgrRating * 40) + tierBonus;
    const clubPts = club.rankingPoints ? Math.max(club.rankingPoints, basePts) : basePts;

    return {
      clubId: club.id,
      clubName: club.name,
      shortName: club.shortName || club.name,
      city: club.city || '',
      country: club.country || 'مصر',
      countryCode: club.countryCode || 'EGY',
      leagueId: club.leagueId || 'egy_tier_4',
      leagueName: club.leagueId ? (GLOBAL_LEAGUES[club.leagueId]?.name || 'دوري محلي') : 'دوري محلي',
      tier: club.division || 4,
      reputation: club.reputation || 30,
      squadStrength: strength.overall,
      attackStrength: strength.attack,
      defenseStrength: strength.defense,
      managerName: mgr.name,
      managerRating: mgr.rating,
      rankingPoints: clubPts,
      worldRank: 1,
      previousWorldRank: club.previousWorldRank || 1,
      monthlyRankChange: 0,
      primaryColor: club.primaryColor || '#0284c7',
      secondaryColor: club.secondaryColor || '#ffffff',
      trophiesCount: club.division === 1 && club.reputation >= 85 ? Math.floor(club.reputation / 4) : 0,
    };
  });

  // Sort clubs by ranking points descending
  rankedClubs.sort((a, b) => b.rankingPoints - a.rankingPoints || b.squadStrength - a.squadStrength);

  rankedClubs.forEach((club, idx) => {
    const newRank = idx + 1;
    const prevRank = club.previousWorldRank || newRank;
    club.worldRank = newRank;
    club.previousWorldRank = prevRank;
    club.monthlyRankChange = prevRank - newRank;
  });

  return {
    lastUpdatedMonth: currentCalendarMonthStr,
    managers: managersList,
    clubs: rankedClubs,
  };
}
