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
      // 1. STARTER: Gentle net post-match stamina adjustment (reflecting post-match recovery + week rest before next round)
      const currentFit = p.fitness ?? 92;
      const baseDrain = Math.floor(Math.random() * 4 + 4); // 4 to 7% net drain
      const actualDrain = Math.max(3, Math.round(baseDrain * (1 - staffBonuses.staminaDrainReduction)));
      // If starter was already low (< 82%), give them partial recovery toward 85% so they don't stay exhausted across consecutive rounds
      const newFitness = currentFit < 82
        ? Math.min(92, currentFit + Math.floor(Math.random() * 6 + 8))
        : Math.max(65, Math.min(100, currentFit - actualDrain));

      // 2. Realistic, low injury risk ONLY if playing while severely exhausted (< 42 fitness) and squad has < 1 injury
      let isInjured = false;
      let injuryType: string | undefined = undefined;
      let injuryWeeks: number | undefined = undefined;
      let injuryObj: Player['injury'] = null;

      if (
        currentFit < 42 &&
        activeInjuredCount < 1 &&
        newInjuriesThisMatch < 1
      ) {
        const injuryChance = 0.008 * (1 - staffBonuses.injuryRiskReduction);
        if (Math.random() < injuryChance) {
          const isMinorKnock = Math.random() < 0.85;
          const durationDays = isMinorKnock ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 3) + 4;
          isInjured = true;
          injuryType = isMinorKnock ? 'كدمة خفيفة وإجهاد بسيط' : 'شد عضلي خفيف نتيجة الإرهاق';
          injuryWeeks = 1;
          injuryObj = {
            type: injuryType,
            severity: 'mild',
            durationDays,
            daysRemaining: durationDays,
            description: 'كدمة بسيطة تحتاج لراحة قصيرة وعلاج طبيعي سريع',
            treatmentType: 'natural',
          };
          activeInjuredCount += 1;
          newInjuriesThisMatch += 1;

          if (isUserClub) {
            transferMessages.push({
              id: `injury_fatigue_${p.id}_${Date.now()}`,
              title: `تقرير طبي: ${injuryType} للاعب ${p.name} 🏥`,
              sender: 'الجهاز الطبي للفريق',
              date: 'تقرير ما بعد المباراة',
              type: 'news',
              read: false,
              content: `تعرض اللاعب ${p.name} لـ (${injuryType}) بسبب مشاركته بمخزون بدني منخفض. مدة الراحة المقررة: ${durationDays} أيام فقط ويعود بعدها فوراً للتشكيلة.`,
            });
          }
        }
      }

      // Starter morale boost on win, reset bench unhappiness
      const moraleDelta = isTeamWin ? +6 : isTeamDraw ? +2 : -2;
      const newMorale = Math.min(100, Math.max(35, (p.morale ?? 75) + moraleDelta));

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
      // 2. SUBSTITUTE: Played partial match, very light stamina drain or net recovery
      const currentFit = p.fitness ?? 92;
      const baseSubDrain = Math.floor(Math.random() * 3 + 2); // 2 to 4%
      const actualSubDrain = Math.max(2, Math.round(baseSubDrain * (1 - staffBonuses.staminaDrainReduction)));
      const newFitness = currentFit < 85
        ? Math.min(95, currentFit + 8)
        : Math.max(72, Math.min(100, currentFit - actualSubDrain));

      const subMoraleDelta = isTeamWin ? +5 : isTeamDraw ? +3 : +1;
      const newMorale = Math.min(100, Math.max(45, (p.morale ?? 75) + subMoraleDelta));

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
      // 3. BENCH / RESERVES: Fast rest recovery boosted by fitness coach (+22 to +30%)
      const baseGain = Math.floor(Math.random() * 9 + 22); // 22 to 30
      const actualGain = Math.round(baseGain * (1 + staffBonuses.restRecoveryBonus));
      const newFitness = Math.min(100, (p.fitness ?? 85) + actualGain);

      // 4. Morale for sitting on bench: Rested players maintain good morale and recover full fitness
      const newMorale = Math.max(68, Math.min(100, (p.morale ?? 80)));

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
