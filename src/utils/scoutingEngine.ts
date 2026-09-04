import { Club, FormationType, OpponentScoutingReport, TacticalMentality, PressingIntensity, KeyThreatPlayer } from '../types/game';

/**
 * Generates an in-depth tactical spy and scouting report for the upcoming opponent
 */
export function generateOpponentScoutingReport(
  oppClub: Club,
  round: number,
  currentDateStr: string,
  formattedDateStr: string,
  userClub?: Club
): OpponentScoutingReport {
  const oppPlayers = Array.isArray(oppClub.players) ? oppClub.players : [];
  const sortedByRating = [...oppPlayers].sort((a, b) => b.overallRating - a.overallRating);
  
  // Find top star players
  const topAttackers = sortedByRating.filter(p => p.positionCategory === 'FWD' || p.position === 'CAM');
  const topMidfielders = sortedByRating.filter(p => p.positionCategory === 'MID');
  const topDefenders = sortedByRating.filter(p => p.positionCategory === 'DEF');
  const topGK = sortedByRating.find(p => p.positionCategory === 'GK') || sortedByRating[0];

  const keyThreats: KeyThreatPlayer[] = [];

  if (topAttackers.length > 0) {
    const starFwd = topAttackers[0];
    keyThreats.push({
      id: starFwd.id,
      name: starFwd.name,
      position: starFwd.position,
      rating: starFwd.overallRating,
      threatDescription: `أخطر أسلحة ${oppClub.name} الهجومية، يتميز بحس تهديفي عالي (${starFwd.attributes.shooting} إنهاء) وسرعة اختراق في منطقة الجزاء.`,
      markingAdvice: `فرض رقابة لصيقة عليه بواسطة قلب الدفاع الأساسي ومنعه من الاستلام وظهره للمرمى.`
    });
  }

  if (topMidfielders.length > 0) {
    const starMid = topMidfielders[0];
    keyThreats.push({
      id: starMid.id,
      name: starMid.name,
      position: starMid.position,
      rating: starMid.overallRating,
      threatDescription: `ضابط إيقاع خط الوسط وموزع الكرات الحاسمة (${starMid.attributes.passing} تمرير، ${starMid.attributes.dribbling} مراوغة).`,
      markingAdvice: `الضغط السريع عليه في الثلث الأوسط لمنعه من التمرير البيني المريح خلف خط دفاعنا.`
    });
  }

  if (topDefenders.length > 0) {
    const starDef = topDefenders[0];
    keyThreats.push({
      id: starDef.id,
      name: starDef.name,
      position: starDef.position,
      rating: starDef.overallRating,
      threatDescription: `صخرة الدفاع وقائد الخط الخلفي (${starDef.attributes.defending} افتكاك، ${starDef.attributes.physical} قوة بدنية).`,
      markingAdvice: `تجنب الصراعات الهوائية الفردية معه والاعتماد على الكرات الأرضية السريعة بين الخطوط.`
    });
  }

  const oppFormation: FormationType = oppClub.tactics?.formation || '4-3-3';
  const oppMentality: TacticalMentality = oppClub.tactics?.mentality || 'balanced';
  const oppPressing: PressingIntensity = oppClub.tactics?.pressingIntensity || 'balanced';

  // Determine tactical weaknesses based on opponent formation & squad stats
  const tacticalWeaknesses: string[] = [];
  const tacticalStrengths: string[] = [];

  if (oppFormation === '4-3-3' || oppFormation === '4-2-4') {
    tacticalWeaknesses.push('اندفاع هجومي مبالغ فيه يترك مساحات شاسعة خلف الظهيرين يمكن ضربها بالمرتدات السريعة.');
    tacticalWeaknesses.push('فجوة ملحوظة بين خط الوسط والهجوم عند فقدان الكرة في ملعبنا.');
    tacticalStrengths.push('كثافة هجومية عالية وضغط مستمر على أطراف الملعب عبر الأجنحة.');
  } else if (oppFormation === '4-4-2' || oppFormation === '4-5-1') {
    tacticalWeaknesses.push('بطء التحول من الحالة الدفاعية إلى الهجوم مع الاعتماد المفرط على الكرات الطولية العشوائية.');
    tacticalWeaknesses.push('عجز نسبي في الاستحواذ الإيجابي تحت الضغط العالي في الثلث الأوسط.');
    tacticalStrengths.push('تنظيم دفاعي مدمج بخطين متقاربين يغلق عمق منطقة الجزاء.');
  } else if (oppFormation === '3-5-2' || oppFormation === '5-3-2' || oppFormation === '5-4-1') {
    tacticalWeaknesses.push('مساحات شاغرة على أطراف الملعب خلف لاعبي الرواق (Wing-backs) عند انضمامهم للهجوم.');
    tacticalWeaknesses.push('صعوبة في الخروج بالكرة تحت الضغط المعاكس المباشر على ثلاثي قلب الدفاع.');
    tacticalStrengths.push('حصن دفاعي قوي في الكرات الهوائية والعرضيات داخل الصندوق.');
  } else {
    tacticalWeaknesses.push('تذبذب في التمركز الدفاعي عند مواجهة تبادل المراكز السريع بين مهاجمينا.');
    tacticalWeaknesses.push('ارتباك واضح لدى المدافعين عند الضغط المباغت أثناء بناء اللعب من الخلف.');
    tacticalStrengths.push('توازن خطوط الفريق واللعب الجماعي المنظم في وسط الميدان.');
  }

  if (topGK && topGK.overallRating < 70) {
    tacticalWeaknesses.push(`ضعف نسبي لحارس المرمى ${topGK.name} (${topGK.overallRating}) في رد الفعل والتعامل مع التسديدات البعيدة.`);
  }

  // Recommended counter strategy
  let counterFormation: FormationType = '4-2-3-1';
  let counterMentality: TacticalMentality = 'balanced';
  let counterPressing: PressingIntensity = 'high';
  let tacticalTip = '';

  if (oppFormation === '4-3-3') {
    counterFormation = '4-2-3-1';
    counterMentality = 'balanced';
    counterPressing = 'high';
    tacticalTip = 'استخدام ثنائي ارتكاز دفاعي (Double Pivot) لغلق المساحات أمام صانع ألعابهم، مع إطلاق الأجنحة السريعة لضرب ظهر أظهرتهم.';
  } else if (oppFormation === '4-4-2') {
    counterFormation = '4-3-3';
    counterMentality = 'attacking';
    counterPressing = 'high';
    tacticalTip = 'التفوق العددي بثلاثي خط الوسط ضد ثنائي وسط الخصم سيمكنك من فرض السيطرة والاستحواذ التام وصناعة فرص متتالية.';
  } else if (oppFormation === '3-5-2' || oppFormation === '5-3-2') {
    counterFormation = '4-3-3';
    counterMentality = 'attacking';
    counterPressing = 'balanced';
    tacticalTip = 'التركيز على فتح الملعب وتكثيف الهجمات من الأطراف العريضة عبر الأجنحة والظهيرين لاستغلال تقدم أظهرة الخصم.';
  } else {
    counterFormation = '4-2-3-1';
    counterMentality = 'attacking';
    counterPressing = 'high';
    tacticalTip = 'الضغط العالي واللعب المباشر السريع سيجبر خط دفاع الخصم على ارتكاب أخطاء فادحة في التمرير في مناطقه الحساسة.';
  }

  const avgFitness = Math.round(oppPlayers.reduce((acc, p) => acc + (p.fitness || 85), 0) / (oppPlayers.length || 1));
  const staminaInsight = avgFitness < 80 
    ? `يعاني الفريق المنافس من انخفاض ملحوظ في المعدل البدني (متوسط لياقة ${avgFitness}%)، مما يجعلهم عرضة للانهيار البدني في الشوط الثاني.`
    : `يتمتع المنافس بجاهزية بدنية جيدة (متوسط لياقة ${avgFitness}%)، ويُنصح بإدارة مجهود لاعبينا والقيام بالتبديلات بعد الدقيقة 60.`;

  return {
    opponentClubId: oppClub.id,
    opponentClubName: oppClub.name,
    round,
    scoutedAtDateStr: currentDateStr,
    scoutedAtFormatted: formattedDateStr,
    cost: 100000,
    tacticalWeaknesses,
    tacticalStrengths,
    keyThreatPlayers: keyThreats,
    predictedFormation: oppFormation,
    predictedMentality: oppMentality,
    predictedPressing: oppPressing,
    recommendedCounterStrategy: {
      suggestedFormation: counterFormation,
      suggestedMentality: counterMentality,
      suggestedPressing: counterPressing,
      tacticalTip
    },
    setPieceVulnerability: 'ضعف الرقابة الفردية على القائم القريب في الركنيات يتيح فرصة تسجيل عالية لمدافعينا المتقدمين.',
    staminaAndFormInsight: staminaInsight,
    scoutConfidenceRating: Math.floor(Math.random() * 6) + 94 // 94% - 99%
  };
}
