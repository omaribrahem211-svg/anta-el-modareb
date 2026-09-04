import { Club } from '../types/game';
import { isRealClub, loadRealClubSquad } from './realPlayersData';
import { generateClubSquad } from '../utils/playerGenerator';

/**
 * Universal Club Factory
 * If the club is a real-world club with a defined squad, it uses loadRealClubSquad(id).
 * Fictional / lower tier clubs use generateClubSquad(id, countryCode, leagueId, reputation, baseSquadLevel).
 */
export function createClub(
  id: string,
  name: string,
  shortName: string,
  city: string,
  country: string,
  countryCode: string,
  division: number,
  leagueId: string,
  reputation: number,
  baseSquadLevel: number,
  primaryColor: string,
  secondaryColor: string,
  budget: number,
  transferBudget: number,
  wageBudgetMonthly: number,
  stadiumName: string,
  stadiumCapacity: number,
  facilitiesLevel: number = 4
): Club {
  const players = isRealClub(id)
    ? loadRealClubSquad(id)
    : generateClubSquad(id, countryCode, leagueId, reputation, baseSquadLevel);

  const startingPlayerIds = players.slice(0, 11).map(p => p.id);
  const benchPlayerIds = players.slice(11, 18).map(p => p.id);

  return {
    id,
    name,
    shortName,
    city,
    country,
    countryCode,
    countryId: countryCode,
    division,
    leagueId,
    reputation,
    budget,
    transferBudget,
    wageBudgetMonthly,
    primaryColor,
    secondaryColor,
    isUserClub: false,
    facilities: {
      stadiumName,
      stadiumCapacity,
      stadiumLevel: facilitiesLevel,
      medicalCenterLevel: facilitiesLevel,
      trainingGroundLevel: facilitiesLevel,
      youthAcademyLevel: facilitiesLevel,
      scoutingNetworkLevel: facilitiesLevel,
    },
    tactics: {
      formation: '4-3-3',
      mentality: 'balanced',
      passingStyle: 'short',
      pressingIntensity: 'balanced',
      tempo: 'balanced',
      startingPlayerIds,
      benchPlayerIds,
      captainId: players[0]?.id || '',
      penaltyTakerId: players[0]?.id || '',
      freeKickTakerId: players[0]?.id || '',
      cornerTakerId: players[0]?.id || '',
    },
    players,
    sponsors: [
      {
        id: `sp_${id}_main`,
        name: `${name} شريك رئيسي`,
        type: 'shirt',
        monthlyPayment: Math.round(budget * 0.05),
        contractMonthsRemaining: 12,
        bonusForWin: 50000,
      },
      {
        id: `sp_${id}_kit`,
        name: 'راعي الملعب الرسمي',
        type: 'stadium',
        monthlyPayment: Math.round(budget * 0.03),
        contractMonthsRemaining: 24,
        bonusForWin: 25000,
      },
    ],
  };
}
