import { Club, LeagueStanding, ManagerProfile } from '../types/game';
import { INITIAL_MANAGER } from '../data/initialData';
import { generateTrainerId } from '../services/trainerProfileService';
import { calibrateRealisticPlayerRating, ensureClubSquadIntegrity } from './playerGenerator';
import { isRealClub, loadRealClubSquad } from '../data/realPlayersData';

export function normalizeClub(t: any): Club {
  if (!t || typeof t !== 'object') {
    return {} as Club;
  }

  let rawPlayers = Array.isArray(t.players) ? t.players : [];
  if (rawPlayers.length === 0 && t.id && isRealClub(t.id)) {
    try {
      rawPlayers = loadRealClubSquad(t.id);
    } catch {
      rawPlayers = [];
    }
  }

  let players = rawPlayers
    .filter((p: any) => p && typeof p === 'object' && p.id)
    .map((p: any) => {
      const safeOvr = Number.isFinite(Number(p.overallRating ?? p.rating)) && Number(p.overallRating ?? p.rating) > 0
        ? Number(p.overallRating ?? p.rating)
        : 65;
      const safePot = Number.isFinite(Number(p.potentialRating ?? p.potential)) && Number(p.potentialRating ?? p.potential) >= safeOvr
        ? Number(p.potentialRating ?? p.potential)
        : safeOvr;
      const baseP = {
        ...p,
        name: p.name || 'لاعب',
        position: p.position || 'CM',
        positionCategory: p.positionCategory || 'MID',
        overallRating: safeOvr,
        potentialRating: safePot,
        isGuestStar: Boolean(p.isGuestStar),
        nationality: p.nationality || t.country || 'مصر',
        nationalityCode: p.nationalityCode || t.countryCode || 'EGY',
        currentClubId: p.currentClubId || t.id,
        currentLeagueId: p.currentLeagueId || t.leagueId || '',
        stats: p.stats || { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0, averageRating: 6.5 },
        attributes: p.attributes && typeof p.attributes === 'object'
          ? {
              pace: Number.isFinite(Number(p.attributes.pace)) ? Number(p.attributes.pace) : safeOvr,
              shooting: Number.isFinite(Number(p.attributes.shooting)) ? Number(p.attributes.shooting) : Math.max(35, safeOvr - 3),
              passing: Number.isFinite(Number(p.attributes.passing)) ? Number(p.attributes.passing) : safeOvr,
              dribbling: Number.isFinite(Number(p.attributes.dribbling)) ? Number(p.attributes.dribbling) : safeOvr,
              defending: Number.isFinite(Number(p.attributes.defending)) ? Number(p.attributes.defending) : Math.max(35, safeOvr - 4),
              physical: Number.isFinite(Number(p.attributes.physical)) ? Number(p.attributes.physical) : safeOvr,
              goalkeeping: p.attributes.goalkeeping !== undefined ? Number(p.attributes.goalkeeping) : (p.position === 'GK' ? safeOvr : undefined),
            }
          : {
              pace: safeOvr,
              shooting: Math.max(35, safeOvr - 3),
              passing: safeOvr,
              dribbling: safeOvr,
              defending: Math.max(35, safeOvr - 4),
              physical: safeOvr,
              goalkeeping: p.position === 'GK' ? safeOvr : undefined,
            },
        savings: p.savings !== undefined ? p.savings : 0,
        totalBonusesReceived: p.totalBonusesReceived ?? 0,
      };
      return calibrateRealisticPlayerRating(baseP, t.id, t.leagueId, t.reputation || 65);
    });

  // Fallback: If any club has fewer than 20 players, auto-generate balanced fallback players up to 22
  if (t.id && players.length < 20) {
    const integrityResult = ensureClubSquadIntegrity({
      ...t,
      players,
    });
    if (Array.isArray(integrityResult?.players) && integrityResult.players.length >= players.length) {
      players = integrityResult.players;
    }
  }

  const playerIds = new Set(players.map((p: any) => p.id));
  const rawStarting = Array.isArray(t.tactics?.startingPlayerIds) ? t.tactics.startingPlayerIds : [];
  const rawBench = Array.isArray(t.tactics?.benchPlayerIds) ? t.tactics.benchPlayerIds : [];

  let startingPlayerIds = rawStarting.filter((id: string) => playerIds.has(id));
  let benchPlayerIds = rawBench.filter((id: string) => playerIds.has(id) && !startingPlayerIds.includes(id));

  // If starting lineup has fewer than 11 and squad has players, backfill from available
  if (startingPlayerIds.length < 11 && players.length > 0) {
    const hasGk = startingPlayerIds.some((id: string) => players.find((p: any) => p.id === id)?.positionCategory === 'GK');
    if (!hasGk) {
      const gk = players.find((p: any) => p.positionCategory === 'GK' && !startingPlayerIds.includes(p.id));
      if (gk) startingPlayerIds.unshift(gk.id);
    }
    for (const p of players) {
      if (startingPlayerIds.length >= 11) break;
      if (!startingPlayerIds.includes(p.id) && !benchPlayerIds.includes(p.id)) {
        startingPlayerIds.push(p.id);
      }
    }
  }

  if (benchPlayerIds.length < 7 && players.length > 11) {
    for (const p of players) {
      if (benchPlayerIds.length >= 7) break;
      if (!startingPlayerIds.includes(p.id) && !benchPlayerIds.includes(p.id)) {
        benchPlayerIds.push(p.id);
      }
    }
  }

  return {
    ...t,
    name: t.name || 'النادي',
    shortName: t.shortName || t.name || 'النادي',
    country: t.country || 'مصر',
    countryCode: t.countryCode || 'EGY',
    leagueId: t.leagueId || 'egy_tier_4',
    budget: (() => {
      let b = Number.isFinite(t.budget) ? t.budget : 250000;
      if (Array.isArray(t.sponsors) && t.sponsors.length > 0) {
        const sponsorshipMoneyTaken = t.sponsors.reduce((sum: number, sp: any) => {
          const signing = sp?.signingBonus || 50000;
          const elapsed = Math.max(0, (sp?.totalDurationMonths || 12) - (sp?.contractMonthsRemaining ?? 12));
          const monthly = (sp?.monthlyPayment || 0) * elapsed;
          return sum + signing + monthly;
        }, 0);
        b = Math.max(0, b - sponsorshipMoneyTaken);
      }
      return b;
    })(),
    players,
    sponsors: Array.isArray(t.sponsors) ? t.sponsors : [],
    facilities: t.facilities || {
      stadiumName: `${t.name || 'ملعب الفريق'}`,
      stadiumCapacity: 5000,
      stadiumLevel: 1,
      medicalCenterLevel: 1,
      trainingGroundLevel: 1,
      youthAcademyLevel: 1,
      scoutingNetworkLevel: 1,
    },
    wageBudgetMonthly: typeof t.wageBudgetMonthly === 'number' ? t.wageBudgetMonthly : 0,
    tactics: {
      ...(t.tactics || {}),
      formation: t.tactics?.formation || '4-3-3',
      tacticalStyle: t.tactics?.tacticalStyle || (t.tactics as any)?.playStyle || 'total_football',
      mentality: t.tactics?.mentality || 'balanced',
      passingStyle: t.tactics?.passingStyle || 'short',
      pressingIntensity: t.tactics?.pressingIntensity || 'balanced',
      tempo: t.tactics?.tempo || 'balanced',
      defensiveBlock: t.tactics?.defensiveBlock || 'mid_block',
      buildUpStyle: t.tactics?.buildUpStyle || 'mixed',
      pressingTrap: t.tactics?.pressingTrap || 'none',
      fullbackRole: t.tactics?.fullbackRole || 'balanced',
      strikerRole: t.tactics?.strikerRole || 'poacher',
      startingPlayerIds: startingPlayerIds.slice(0, 11),
      benchPlayerIds: benchPlayerIds.slice(0, 7),
      captainId: (playerIds.has(t.tactics?.captainId) ? t.tactics.captainId : null) || players[0]?.id || '',
      penaltyTakerId: (playerIds.has(t.tactics?.penaltyTakerId) ? t.tactics.penaltyTakerId : null) || players[0]?.id || '',
      freeKickTakerId: (playerIds.has(t.tactics?.freeKickTakerId) ? t.tactics.freeKickTakerId : null) || players[0]?.id || '',
      cornerTakerId: (playerIds.has(t.tactics?.cornerTakerId) ? t.tactics.cornerTakerId : null) || players[0]?.id || '',
    },
  };
}

export function normalizeStanding(s: any): LeagueStanding {
  return {
    ...s,
    clubId: s?.clubId || '',
    clubName: s?.clubName || 'النادي',
    clubLogo: s?.clubLogo || '🛡️',
    played: s?.played ?? 0,
    won: s?.won ?? 0,
    drawn: s?.drawn ?? 0,
    lost: s?.lost ?? 0,
    goalsFor: s?.goalsFor ?? 0,
    goalsAgainst: s?.goalsAgainst ?? 0,
    goalDifference: s?.goalDifference ?? 0,
    points: s?.points ?? 0,
    form: Array.isArray(s?.form) ? s.form : [],
  };
}

export function normalizeManagerProfile(parsed: any): ManagerProfile {
  const matches = parsed?.matchesManaged ?? parsed?.careerMatches ?? 0;
  const completedSeasons = parsed?.totalSeasonsCompleted ?? Math.max(0, (parsed?.totalSeasons || 1) - 1);

  // Safe migration for play time: if existing career has matches but 0/missing play time, calculate fair retroactive time
  const existingMinutes = typeof parsed?.totalPlayTimeMinutes === 'number' ? parsed.totalPlayTimeMinutes : 0;
  const migratedPlayTimeMinutes = existingMinutes > 0
    ? existingMinutes
    : (matches > 0 ? (matches * 4 + completedSeasons * 20) : 0);

  // Safe migration for player development
  const existingDeveloped = typeof parsed?.totalPlayersDeveloped === 'number' ? parsed.totalPlayersDeveloped : 0;
  const migratedPlayersDeveloped = existingDeveloped > 0
    ? existingDeveloped
    : Math.max(0, Math.floor((parsed?.developmentPoints || 0) / 15));

  return {
    ...INITIAL_MANAGER,
    ...parsed,
    name: parsed?.name || 'المدرب',
    age: parsed?.age || 35,
    nationality: parsed?.nationality || 'مصري',
    trainerId: (!parsed?.trainerId || parsed.trainerId === 'TRN-INIT' || parsed.trainerId === 'TRN-RESTORED' || parsed.trainerId === 'TRN-LOCAL-READY' || parsed.trainerId === 'TRN-IMPORTED')
      ? generateTrainerId()
      : parsed.trainerId,
    monthlySalary: parsed?.monthlySalary ?? 25000,
    personalWallet: parsed?.personalWallet !== undefined ? parsed.personalWallet : 65000,
    financialTransactions: Array.isArray(parsed?.financialTransactions) ? parsed.financialTransactions : [],
    completedCourses: Array.isArray(parsed?.completedCourses)
      ? parsed.completedCourses.filter((c: string) => !['license_d', 'license_c', 'license_b', 'license_a', 'license_pro', 'license_elite'].includes(c))
      : [],
    license: (parsed?.license && ['BASIC', 'PREMIER', 'CONTINENTAL', 'LEGENDARY'].includes(parsed.license)) ? parsed.license : 'BASIC',
    ownedLicenses: Array.isArray(parsed?.ownedLicenses)
      ? Array.from(new Set(['BASIC', ...parsed.ownedLicenses.filter((l: string) => ['BASIC', 'PREMIER', 'CONTINENTAL', 'LEGENDARY'].includes(l))]))
      : ['BASIC'],
    favoriteFormation: parsed?.favoriteFormation || INITIAL_MANAGER.favoriteFormation || '4-3-3',
    matchesManaged: matches,
    wins: parsed?.wins ?? parsed?.careerWins ?? 0,
    draws: parsed?.draws ?? parsed?.careerDraws ?? 0,
    losses: parsed?.losses ?? parsed?.careerLosses ?? 0,
    totalPlayTimeMinutes: migratedPlayTimeMinutes,
    totalPlayersDeveloped: migratedPlayersDeveloped,
    tacticalExperience: parsed?.tacticalExperience && typeof parsed.tacticalExperience === 'object'
      ? { ...INITIAL_MANAGER.tacticalExperience, ...parsed.tacticalExperience }
      : (INITIAL_MANAGER.tacticalExperience || {}),
    tacticalKnowledge: Array.isArray(parsed?.tacticalKnowledge)
      ? parsed.tacticalKnowledge
      : (INITIAL_MANAGER.tacticalKnowledge || []),
  };
}
