import { Club, LeagueStanding, ManagerProfile } from '../types/game';
import { INITIAL_MANAGER } from '../data/initialData';

export function normalizeClub(t: any): Club {
  if (!t || typeof t !== 'object') {
    return {} as Club;
  }

  const players = Array.isArray(t.players) ? t.players : [];
  const startingPlayerIds = t.tactics?.startingPlayerIds && t.tactics.startingPlayerIds.length === 11
    ? t.tactics.startingPlayerIds
    : players.slice(0, 11).map((p: any) => p.id);
  const benchPlayerIds = t.tactics?.benchPlayerIds && t.tactics.benchPlayerIds.length > 0
    ? t.tactics.benchPlayerIds
    : players.slice(11, 18).map((p: any) => p.id);

  return {
    ...t,
    name: t.name || 'النادي',
    shortName: t.shortName || t.name || 'النادي',
    country: t.country || 'مصر',
    countryCode: t.countryCode || 'EGY',
    leagueId: t.leagueId || 'egy_tier_4',
    budget: Number.isFinite(t.budget) ? t.budget : 250000,
    players: players.map((p: any) => ({
      ...p,
      nationality: p.nationality || t.country || 'مصر',
      nationalityCode: p.nationalityCode || t.countryCode || 'EGY',
      currentClubId: p.currentClubId || t.id,
      stats: p.stats || { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0, averageRating: 6.5 },
      attributes: p.attributes || { pace: 60, shooting: 60, passing: 60, dribbling: 60, defending: 60, physical: 60 },
      savings: p.savings !== undefined ? p.savings : 0,
      totalBonusesReceived: p.totalBonusesReceived ?? 0,
    })),
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
    tactics: {
      formation: t.tactics?.formation || '4-3-3',
      mentality: t.tactics?.mentality || 'balanced',
      passingStyle: t.tactics?.passingStyle || 'short',
      pressingIntensity: t.tactics?.pressingIntensity || 'balanced',
      tempo: t.tactics?.tempo || 'balanced',
      startingPlayerIds: Array.isArray(startingPlayerIds) ? startingPlayerIds : [],
      benchPlayerIds: Array.isArray(benchPlayerIds) ? benchPlayerIds : [],
      captainId: t.tactics?.captainId || players[0]?.id || '',
      penaltyTakerId: t.tactics?.penaltyTakerId || players[0]?.id || '',
      freeKickTakerId: t.tactics?.freeKickTakerId || players[0]?.id || '',
      cornerTakerId: t.tactics?.cornerTakerId || players[0]?.id || '',
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
  return {
    ...INITIAL_MANAGER,
    ...parsed,
    name: parsed?.name || 'المدرب',
    age: parsed?.age || 35,
    nationality: parsed?.nationality || 'مصري',
    trainerId: parsed?.trainerId || 'TRN-INIT',
    monthlySalary: parsed?.monthlySalary ?? 25000,
    personalWallet: parsed?.personalWallet !== undefined ? parsed.personalWallet : 65000,
    financialTransactions: Array.isArray(parsed?.financialTransactions) ? parsed.financialTransactions : [],
    completedCourses: Array.isArray(parsed?.completedCourses) ? parsed.completedCourses : [],
    favoriteFormation: parsed?.favoriteFormation || INITIAL_MANAGER.favoriteFormation || '4-3-3',
  };
}
