import { Club, InboxMessage, MatchEvent, Player } from '../types/game';
import { getClubStaffBonuses } from './staffEngine';

export interface PostMatchPlayerUpdateResult {
  updatedPlayers: Player[];
  transferMessages: InboxMessage[];
  departedPlayers: { player: Player; fee: number; newClubName: string }[];
}

const BUYER_CLUBS = [
  'نادي فاركو',
  'نادي الجونة',
  'نادي سيراميكا كليوباترا',
  'نادي البنك الأهلي',
  'نادي الاتحاد السكندري',
  'نادي المقاولون العرب',
  'نادي إنبي',
  'نادي سموحة',
  'نادي زد إف سي',
  'نادي فيوتشر',
];

/**
 * Updates player fitness, injury risk, morale, and discontent tracking following a match.
 * Implements:
 * 1. Stamina decay for starters (mitigated by fitness coach).
 * 2. Rest recovery for benched players (boosted by fitness coach).
 * 3. High injury risk for fatigued starters (fitness < 60, reduced by medical staff).
 * 4. Morale decay for players sitting out (mitigated by sports psychologist).
 * 5. Player complaints, transfer requests, and forced transfers when neglected.
 */
export function processPostMatchPlayerUpdates(
  club: Club,
  startingIds: string[],
  matchPlayed: { events: MatchEvent[]; homeScore: number; awayScore: number },
  isTeamWin: boolean,
  isTeamDraw: boolean,
  isUserClub: boolean
): PostMatchPlayerUpdateResult {
  const staffBonuses = getClubStaffBonuses(club);
  const teamPlayers = Array.isArray(club.players) ? club.players : [];

  const updatedPlayers: Player[] = [];
  const transferMessages: InboxMessage[] = [];
  const departedPlayers: { player: Player; fee: number; newClubName: string }[] = [];

  // Pre-calculate substitutions in O(E) once for O(1) player lookups
  const subInIds = new Set<string>();
  const subInNames = new Set<string>();
  for (const e of (matchPlayed.events || [])) {
    if (e && e.type === 'substitution') {
      if ((e as any).inPlayerId) subInIds.add((e as any).inPlayerId);
      if (e.inPlayerName) subInNames.add(e.inPlayerName);
    }
  }

  teamPlayers.forEach(p => {
    const isStarter = startingIds.includes(p.id);
    const isSub = !isStarter && ((p.id && subInIds.has(p.id)) || (p.name && subInNames.has(p.name)));

    if (isStarter) {
      // 1. STARTER: Stamina decay mitigated by fitness coach
      const baseDrain = Math.floor(Math.random() * 8 + 14); // 14 to 21
      const actualDrain = Math.max(7, Math.round(baseDrain * (1 - staffBonuses.staminaDrainReduction)));
      const newFitness = Math.max(30, Math.min(100, (p.fitness ?? 90) - actualDrain));

      // 2. High injury risk if playing while fatigued (< 60 fitness)
      let isInjured = p.isInjured ?? false;
      let injuryType = p.injuryType;
      let injuryWeeks = p.injuryWeeks;

      if (!isInjured && (p.fitness ?? 90) < 60) {
        const injuryChance = 0.28 * (1 - staffBonuses.injuryRiskReduction);
        if (Math.random() < injuryChance) {
          isInjured = true;
          injuryType = 'إجهاد عضلي حاد وتمزق ناتج عن الإرهاق البدني';
          injuryWeeks = Math.floor(Math.random() * 2 + 1); // 1-2 weeks
          if (isUserClub) {
            transferMessages.push({
              id: `injury_fatigue_${p.id}_${Date.now()}`,
              title: `تقرير طبي عاجل: إصابة إجهاد لـ ${p.name} 🏥`,
              sender: 'الجهاز الطبي للفريق',
              date: 'تقرير ما بعد المباراة',
              type: 'news',
              read: false,
              content: `تعرض اللاعب ${p.name} لإصابة (${injuryType}) بسبب مشاركته بلياقة بدنية منخفضة دون أخذ راحة كافية. يقدر غيابه بنحو ${injuryWeeks} أسابيع. يُنصح بإراحة اللاعبين عند هبوط طاقتهم.`,
            });
          }
        }
      }

      // Starter morale boost on win, reset bench unhappiness
      const moraleDelta = isTeamWin ? +6 : isTeamDraw ? +2 : -2;
      const newMorale = Math.min(100, Math.max(30, (p.morale ?? 75) + moraleDelta));

      updatedPlayers.push({
        ...p,
        fitness: newFitness,
        morale: newMorale,
        isInjured,
        injuryType,
        injuryWeeks,
        unhappyMatchesCount: 0,
        disgruntled: false,
      });
    } else if (isSub) {
      // 2. SUBSTITUTE: Played partial match, light stamina drain, good morale boost
      const baseSubDrain = Math.floor(Math.random() * 4 + 7); // 7 to 10
      const actualSubDrain = Math.max(4, Math.round(baseSubDrain * (1 - staffBonuses.staminaDrainReduction)));
      const newFitness = Math.max(35, Math.min(100, (p.fitness ?? 90) - actualSubDrain));

      const subMoraleDelta = isTeamWin ? +5 : isTeamDraw ? +3 : +1; // Happy to get minutes
      const newMorale = Math.min(100, Math.max(40, (p.morale ?? 75) + subMoraleDelta));

      updatedPlayers.push({
        ...p,
        fitness: newFitness,
        morale: newMorale,
        unhappyMatchesCount: 0,
        disgruntled: false,
      });
    } else {
      // 3. BENCH / RESERVES: Rest recovery boosted by fitness coach
      const baseGain = Math.floor(Math.random() * 5 + 14); // 14 to 18
      const actualGain = Math.round(baseGain * (1 + staffBonuses.restRecoveryBonus));
      const newFitness = Math.min(100, (p.fitness ?? 80) + actualGain);

      // 4. Morale for sitting on bench: Rested players maintain good morale and recover full fitness
      // As requested by user: players never leave the club or get forced out due to lack of playing time
      const currentUnhappy = 0; // Disabled: Bench players do not accumulate unhappy counter
      const newMorale = Math.max(65, Math.min(100, (p.morale ?? 80))); // Healthy morale floor for squad depth

      updatedPlayers.push({
        ...p,
        fitness: newFitness,
        morale: newMorale,
        unhappyMatchesCount: 0,
        disgruntled: false,
        transferRequestSubmitted: false,
      });
    }
  });

  return {
    updatedPlayers,
    transferMessages,
    departedPlayers: [], // Players never leave forcefully due to lack of participation
  };
}

export interface PlayerMatchEventStats {
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
}

export interface MatchStatsMap {
  getPlayerStats: (playerId?: string, playerName?: string) => PlayerMatchEventStats;
}

/**
 * Builds an aggregated player match stats lookup map in a single O(E) pass.
 * Allows subsequent per-player lookups in O(1) without repeated array filtering.
 */
export function buildMatchStatsMap(events: MatchEvent[] = []): MatchStatsMap {
  const statsByPlayerId = new Map<string, PlayerMatchEventStats>();
  const statsByPlayerName = new Map<string, PlayerMatchEventStats>();

  const getOrCreate = (id?: string, name?: string): PlayerMatchEventStats => {
    let stat = (id ? statsByPlayerId.get(id) : undefined) || (name ? statsByPlayerName.get(name) : undefined);
    if (!stat) {
      stat = { goals: 0, assists: 0, yellows: 0, reds: 0 };
    }
    if (id && !statsByPlayerId.has(id)) statsByPlayerId.set(id, stat);
    if (name && !statsByPlayerName.has(name)) statsByPlayerName.set(name, stat);
    return stat;
  };

  for (const e of events) {
    if (!e) continue;

    if (e.type === 'goal') {
      if (e.playerId || e.playerName) {
        const s = getOrCreate(e.playerId, e.playerName);
        s.goals += 1;
      }
      if (e.assistPlayerId || e.assistPlayerName) {
        const a = getOrCreate(e.assistPlayerId, e.assistPlayerName);
        a.assists += 1;
      }
    } else if (e.type === 'yellow_card') {
      if (e.playerId || e.playerName) {
        const s = getOrCreate(e.playerId, e.playerName);
        s.yellows += 1;
      }
    } else if (e.type === 'red_card') {
      if (e.playerId || e.playerName) {
        const s = getOrCreate(e.playerId, e.playerName);
        s.reds += 1;
      }
    }
  }

  const defaultStats: PlayerMatchEventStats = { goals: 0, assists: 0, yellows: 0, reds: 0 };

  return {
    getPlayerStats: (playerId?: string, playerName?: string): PlayerMatchEventStats => {
      if (playerId && statsByPlayerId.has(playerId)) return statsByPlayerId.get(playerId)!;
      if (playerName && statsByPlayerName.has(playerName)) return statsByPlayerName.get(playerName)!;
      return defaultStats;
    }
  };
}
