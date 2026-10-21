import { Club, InboxMessage, Player } from '../types/game';

/**
 * Calculates a realistic, fair suggested wage for contract renewal
 * based on player rating, age, current salary, and market value.
 */
export function calculateSuggestedRenewalWage(player: Player): number {
  const currentSalary = player.salary || 5000;
  const rating = player.overallRating || 60;
  
  // Rating-based baseline wage
  let baseByRating = 3000;
  if (rating >= 85) baseByRating = 180000;
  else if (rating >= 80) baseByRating = 95000;
  else if (rating >= 75) baseByRating = 50000;
  else if (rating >= 70) baseByRating = 28000;
  else if (rating >= 65) baseByRating = 14000;
  else if (rating >= 60) baseByRating = 8000;
  else baseByRating = 4500;

  // Age factor: younger stars demand more increment, older veterans accept modest raises
  let ageFactor = 1.15;
  if (player.age <= 23) ageFactor = 1.25;
  else if (player.age >= 32) ageFactor = 1.05;

  // Performance form factor
  const formBonus = ((player.form || 6) - 5) * 0.03;

  const estimated = Math.round(Math.max(currentSalary * (ageFactor + formBonus), baseByRating * 0.9));
  // Round to clean nearest 500
  return Math.max(2000, Math.round(estimated / 500) * 500);
}

/**
 * Scans user club players for expiring contracts and returns formatted Inbox messages.
 * Prevents duplicates if an active or unread contract alert already exists for the player.
 */
export function checkExpiringContracts(
  userClub: Club,
  dateStr: string,
  existingInbox: InboxMessage[] = []
): InboxMessage[] {
  const alerts: InboxMessage[] = [];
  if (!userClub || !Array.isArray(userClub.players)) return alerts;

  const expiringPlayers = userClub.players.filter(p => {
    const years = typeof p.contractYears === 'number' ? p.contractYears : 2;
    return years <= 1;
  });

  for (const player of expiringPlayers) {
    const years = typeof player.contractYears === 'number' ? player.contractYears : 1;
    
    // Check if an unresolved alert for this player already exists in the inbox
    const hasRecentAlert = existingInbox.some(m => 
      m.contractDetails?.playerId === player.id && 
      !m.contractDetails?.renewed && 
      m.actionTaken !== 'renewed'
    );

    if (hasRecentAlert) continue;

    const suggestedWage = calculateSuggestedRenewalWage(player);
    const isExpired = years === 0;
    const isUrgent = isExpired || player.overallRating >= 70;

    const title = isExpired
      ? `🚨 خطر رحيل مجاني: عقد ${player.name} (${player.position}) منتهٍ ويحق له التوقيع لأي نادٍ!`
      : `⏳ تنبيه شؤون اللاعبين: اقتراب نهاية عقد ${player.name} (${player.position} - تقييم ${player.overallRating})`;

    const content = isExpired
      ? `تحذير عاجل من لجنة التعاقدات: انتهت المدة الرسمية لعقد اللاعب ${player.name} (${player.position} - تقييم ${player.overallRating}) مع الفريق، وأصبح حراً قانونياً في التوقيع مجاناً لأي نادٍ منافس دون أي عائد مالي للنادي!\n\nنوصي بفتح مفاوضات التجديد فوراً أو حسم موقفه لحماية استقرار التشكيلة.`
      : `إشعار إداري وفني: يتبقى للاعب ${player.name} (${player.position} - تقييم ${player.overallRating} - العمر ${player.age}) سنة واحدة فقط في عقده الحالي (ينتهي بنهاية الموسم).\n\nالقيمة السوقية الحالية: ${(player.marketValue || 0).toLocaleString()} ج.م | الراتب الحالي: ${(player.salary || 2500).toLocaleString()} ج.م شهرياً.\n\nلتفادي دخول اللاعب في الفترة الحرة أو رحيله دون مقابل، يُنصح بتجديد العقد الآن أو عرضه للبيع للاستفادة من قيمته السوقية.`;

    alerts.push({
      id: `msg_contract_${player.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title,
      sender: 'لجنة التعاقدات وشؤون اللاعبين',
      date: dateStr,
      type: 'contract',
      read: false,
      priority: isUrgent ? 'urgent' : 'high',
      content,
      contractDetails: {
        playerId: player.id,
        playerName: player.name,
        playerPosition: player.position,
        playerRating: player.overallRating,
        currentSalary: player.salary,
        suggestedWage,
        marketValue: player.marketValue,
        contractYears: years,
        renewed: false,
      },
    });
  }

  return alerts;
}

/**
 * Returns summary count of players with expiring contracts for the user club.
 */
export function getExpiringContractsSummary(userClub: Club): {
  criticalCount: number;
  warningCount: number;
  players: Player[];
} {
  if (!userClub || !Array.isArray(userClub.players)) {
    return { criticalCount: 0, warningCount: 0, players: [] };
  }

  const expiring = userClub.players.filter(p => (p.contractYears ?? 2) <= 1);
  const critical = expiring.filter(p => (p.contractYears ?? 2) === 0);
  const warning = expiring.filter(p => (p.contractYears ?? 2) === 1);

  return {
    criticalCount: critical.length,
    warningCount: warning.length,
    players: expiring,
  };
}
