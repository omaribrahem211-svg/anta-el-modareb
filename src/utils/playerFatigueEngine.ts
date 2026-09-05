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

  teamPlayers.forEach(p => {
    const isStarter = startingIds.includes(p.id);
    const isSub = matchPlayed.events.some(e => 
      e.type === 'substitution' && (e.inPlayerName === p.name || (e as any).inPlayerId === p.id)
    );

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

      // 4. Morale decay for sitting on bench (mitigated by sports psychologist)
      const currentUnhappy = (p.unhappyMatchesCount ?? 0) + 1;
      const baseDrop = Math.floor(Math.random() * 3 + 4); // 4 to 6
      const actualDrop = Math.max(1, Math.round(baseDrop * (1 - staffBonuses.benchMoraleProtection)));
      const newMorale = Math.max(10, (p.morale ?? 70) - actualDrop);

      let disgruntled = p.disgruntled ?? false;
      let transferRequestSubmitted = p.transferRequestSubmitted ?? false;

      // Unhappy threshold reached
      if (currentUnhappy >= 4 && newMorale < 50) {
        disgruntled = true;
      }

      // Transfer request submitted
      if (currentUnhappy >= 6 && newMorale < 40 && !transferRequestSubmitted) {
        transferRequestSubmitted = true;
        if (isUserClub) {
          transferMessages.push({
            id: `transfer_req_${p.id}_${Date.now()}`,
            title: `إنذار وطلب انتقال رسمي من وكيل ${p.name} ⚠️`,
            sender: `وكيل أعمال اللاعب ${p.name}`,
            date: 'طلب رسمي',
            type: 'contract',
            read: false,
            content: `السيد المدير الفني، موكلي اللاعب ${p.name} يشعر بإحباط شديد وتراجع في حالته النفسية (${newMorale}%) بسبب عدم مشاركته في المباريات الأخيرة (${currentUnhappy} مباريات متتالية). يطالب اللاعب بالحصول على فرصة لعب فورية أو الموافقة على بيعه خلال أقرب وقت ممكن.`,
          });
        }
      }

      // Forced transfer execution if completely neglected
      if (isUserClub && (currentUnhappy >= 9 || newMorale < 25)) {
        const buyerClubName = BUYER_CLUBS[Math.floor(Math.random() * BUYER_CLUBS.length)];
        const transferFee = Math.round((p.marketValue || 350000) * 0.9);

        departedPlayers.push({
          player: p,
          fee: transferFee,
          newClubName: buyerClubName,
        });

        transferMessages.push({
          id: `forced_transfer_${p.id}_${Date.now()}`,
          title: `رحيل رسمي: انتقال اللاعب ${p.name} إلى ${buyerClubName} ✈️`,
          sender: 'مجلس إدارة النادي',
          date: 'بيان رسمي',
          type: 'news',
          read: false,
          content: `بسبب انهيار الحالة النفسية للاعب ${p.name} (${newMorale}%) وغيابه المستمر عن التشكيل لـ ${currentUnhappy} مباريات، قررت إدارة النادي قبول العرض المقدم من ${buyerClubName} لشراء بطاقة اللاعب نهائياً بمبلغ ${transferFee.toLocaleString()} ج.م، وتم إنهاء التعاقد ودياً حفاظاً على استقرار غرفة الملابس.`,
        });

        // Do not add to updatedPlayers (player left squad)
        return;
      }

      updatedPlayers.push({
        ...p,
        fitness: newFitness,
        morale: newMorale,
        unhappyMatchesCount: currentUnhappy,
        disgruntled,
        transferRequestSubmitted,
      });
    }
  });

  return {
    updatedPlayers,
    transferMessages,
    departedPlayers,
  };
}
