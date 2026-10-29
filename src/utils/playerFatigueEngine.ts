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

  const medicalLevel = club.facilities?.medicalCenterLevel || (club.facilities as any)?.medicalCenter || 1;
  const roundRecoveryDays = 3 + Math.floor(medicalLevel / 2); // 3 to 5 days of rehabilitation per match round
  let activeInjuredCount = teamPlayers.filter(
    pl => pl && (pl.isInjured || (pl.injury && pl.injury.daysRemaining > 0))
  ).length;
  let newInjuriesThisMatch = 0;

  teamPlayers.forEach(p => {
    const isStarter = startingIds.includes(p.id);
    const isSub = !isStarter && ((p.id && subInIds.has(p.id)) || (p.name && subInNames.has(p.name)));
    const wasAlreadyInjured = Boolean(p.isInjured || (p.injury && p.injury.daysRemaining > 0));

    // Automatic rehabilitation & recovery for any currently injured player after each round
    if (wasAlreadyInjured) {
      const currentDays =
        p.injury && typeof p.injury.daysRemaining === 'number' && p.injury.daysRemaining > 0
          ? p.injury.daysRemaining
          : Math.max(1, (p.injuryWeeks || 1) * 3);
      const remainingDays = currentDays - roundRecoveryDays;

      if (remainingDays <= 0) {
        activeInjuredCount = Math.max(0, activeInjuredCount - 1);
        const recoveredFitness = Math.min(100, Math.max(88, (p.fitness ?? 75) + 20));
        if (isUserClub) {
          transferMessages.push({
            id: `injury_recovered_${p.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: `✅ شفاء تام وعودة للتدريبات: ${p.name} جاهز للمشاركة!`,
            sender: 'الجهاز الطبي للفريق',
            date: 'تقرير الجهاز الطبي',
            type: 'news',
            read: false,
            content: `أنهى اللاعب ${p.name} برنامجه العلاجي والتأهيلي بنجاح تام وتعافى كلياً من الإصابة، وأصبح جاهزاً بدنياً (${recoveredFitness}%) للعودة إلى التشكيلة والمشاركة في المباريات القادمة.`,
          });
        }
        updatedPlayers.push({
          ...p,
          fitness: recoveredFitness,
          morale: Math.min(100, Math.max(78, (p.morale ?? 75) + 5)),
          isInjured: false,
          injuryType: undefined,
          injuryWeeks: undefined,
          injuryMatches: undefined,
          injury: null,
          unhappyMatchesCount: 0,
          disgruntled: false,
          transferRequestSubmitted: false,
        });
        return;
      } else {
        const syncedType = p.injury?.type || p.injuryType || 'إجهاد عضلي خفيف';
        const syncedWeeks = Math.max(1, Math.ceil(remainingDays / 5));
        updatedPlayers.push({
          ...p,
          fitness: Math.min(95, (p.fitness ?? 70) + 12),
          morale: Math.max(68, p.morale ?? 75),
          isInjured: true,
          injuryType: syncedType,
          injuryWeeks: syncedWeeks,
          injury: {
            type: syncedType,
            severity: p.injury?.severity || 'mild',
            durationDays: p.injury?.durationDays || currentDays,
            daysRemaining: remainingDays,
            description: p.injury?.description || 'يخضع لجلسات التأهيل الطبي للعودة قريباً للملاعب',
            treatmentType: p.injury?.treatmentType || 'natural',
          },
          unhappyMatchesCount: 0,
          disgruntled: false,
          transferRequestSubmitted: false,
        });
        return;
      }
    }

    if (isStarter) {
      // 1. STARTER: Stamina decay mitigated by fitness coach
      const baseDrain = Math.floor(Math.random() * 6 + 11); // 11 to 16 (realistic drain)
      const actualDrain = Math.max(6, Math.round(baseDrain * (1 - staffBonuses.staminaDrainReduction)));
      const newFitness = Math.max(35, Math.min(100, (p.fitness ?? 90) - actualDrain));

      // 2. Realistic, low injury risk ONLY if playing while severely exhausted (< 45 fitness) and squad has < 2 injuries
      let isInjured = false;
      let injuryType: string | undefined = undefined;
      let injuryWeeks: number | undefined = undefined;
      let injuryObj: Player['injury'] = null;

      if (
        (p.fitness ?? 90) < 45 &&
        activeInjuredCount < 2 &&
        newInjuriesThisMatch < 1
      ) {
        const injuryChance = 0.035 * (1 - staffBonuses.injuryRiskReduction);
        if (Math.random() < injuryChance) {
          const durationDays = Math.floor(Math.random() * 4) + 3; // 3 to 6 days (1 to 2 matches max)
          isInjured = true;
          injuryType = 'إجهاد عضلي خفيف نتيجة الإرهاق';
          injuryWeeks = 1;
          injuryObj = {
            type: injuryType,
            severity: 'mild',
            durationDays,
            daysRemaining: durationDays,
            description: 'إجهاد عضلي بسيط يحتاج لراحة قصيرة وعلاج طبيعي',
            treatmentType: 'natural',
          };
          activeInjuredCount += 1;
          newInjuriesThisMatch += 1;

          if (isUserClub) {
            transferMessages.push({
              id: `injury_fatigue_${p.id}_${Date.now()}`,
              title: `تقرير طبي: إجهاد عضلي خفيف للاعب ${p.name} 🏥`,
              sender: 'الجهاز الطبي للفريق',
              date: 'تقرير ما بعد المباراة',
              type: 'news',
              read: false,
              content: `تعرض اللاعب ${p.name} لـ (${injuryType}) بسبب مشاركته بطاقة بدنية منخفضة جداً. مدة الغياب والعلاج المقررة: ${durationDays} أيام فقط ويعود بعدها مباشرة للتشكيلة.`,
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
        injury: injuryObj,
        unhappyMatchesCount: 0,
        disgruntled: false,
      });
    } else if (isSub) {
      // 2. SUBSTITUTE: Played partial match, light stamina drain, good morale boost
      const baseSubDrain = Math.floor(Math.random() * 4 + 6); // 6 to 9
      const actualSubDrain = Math.max(4, Math.round(baseSubDrain * (1 - staffBonuses.staminaDrainReduction)));
      const newFitness = Math.max(40, Math.min(100, (p.fitness ?? 90) - actualSubDrain));

      const subMoraleDelta = isTeamWin ? +5 : isTeamDraw ? +3 : +1; // Happy to get minutes
      const newMorale = Math.min(100, Math.max(40, (p.morale ?? 75) + subMoraleDelta));

      updatedPlayers.push({
        ...p,
        fitness: newFitness,
        morale: newMorale,
        isInjured: false,
        injuryType: undefined,
        injuryWeeks: undefined,
        injury: null,
        unhappyMatchesCount: 0,
        disgruntled: false,
      });
    } else {
      // 3. BENCH / RESERVES: Rest recovery boosted by fitness coach
      const baseGain = Math.floor(Math.random() * 6 + 16); // 16 to 21
      const actualGain = Math.round(baseGain * (1 + staffBonuses.restRecoveryBonus));
      const newFitness = Math.min(100, (p.fitness ?? 80) + actualGain);

      // 4. Morale for sitting on bench: Rested players maintain good morale and recover full fitness
      const newMorale = Math.max(65, Math.min(100, (p.morale ?? 80)));

      updatedPlayers.push({
        ...p,
        fitness: newFitness,
        morale: newMorale,
        isInjured: false,
        injuryType: undefined,
        injuryWeeks: undefined,
        injury: null,
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
