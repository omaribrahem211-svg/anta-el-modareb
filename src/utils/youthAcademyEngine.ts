import { Club, Player, Position, PositionCategory, PreferredFoot, PlayerPersonality, YouthProspect } from '../types/game';
import { getCountryById, GLOBAL_COUNTRIES } from '../data/countriesData';
import { calculatePlayerValuation } from './playerGenerator';

const POSITIONS_BY_CATEGORY: Record<PositionCategory, Position[]> = {
  GK: ['GK'],
  DEF: ['CB', 'RB', 'LB'],
  MID: ['CDM', 'CM', 'CAM'],
  FWD: ['RW', 'LW', 'ST'],
};

const PERSONALITIES: PlayerPersonality[] = [
  'ambitious',
  'determined',
  'leader',
  'professional',
  'loyal',
  'temperamental',
];

const PREFERRED_FEET: PreferredFoot[] = ['right', 'right', 'left', 'both'];

const SCOUT_REPORTS: Record<PositionCategory, string[]> = {
  GK: [
    'يمتلك ردود فعل استثنائية وشجاعة عالية في الكرات العرضية والانفرادات.',
    'حارس مرمى واعد يتميز بطول القامة وسرعة التمركز وتوجيه خط الدفاع.',
    'يجيد بناء اللعب بالقدمين والتصدي للكرات الصعبة في الزوايا المستحيلة.',
    'موهبة حراسة شابة تتنبأ لها أجهزة القياس بمستقبل دولي مشرق.',
  ],
  DEF: [
    'مدافع صلب يمتلك توقيتاً مثالياً في قطع الكرات والتدخلات الهوائية.',
    'ظهير عصري سريع يتميز بالعرضيات الدقيقة والمساندة الهجومية القوية.',
    'قائد بالفطرة في عمق الدفاع ولديه هدوء ورؤية رائعة لبناء الهجمة من الخلف.',
    'مدافع يتمتع بقوة بدنية وشراسة دفاعية وسرعة ارتداد عالية.',
  ],
  MID: [
    'صانع ألعاب موهوب يمتلك رؤية بانورامية وتمريرات بينية حاسمة تكسر الخطوط.',
    'لاعب وسط محوري يربط الخطوط بذكاء ولياقة بدنية لا تهدأ طوال الـ 90 دقيقة.',
    'مهندس خط وسط يتميز بالتسديدات القوية المتقنة والتحكم العالي بالكرة.',
    'موهبة استثنائية في قراءة اللعب وافتكاك الكرات وبدء الهجمات المرتدة.',
  ],
  FWD: [
    'مهاجم هداف يمتلك حاسة تهديفية قاتلة وإنهاء متقن أمام المرمى.',
    'جناح مهاري فائق السرعة يجيد المراوغة في المساحات الضيقة وصناعة الأهداف.',
    'مهاجم متكامل يجمع بين السرعة الهائلة والقوة البدنية والارتقاء العالي.',
    'جوهرة هجومية وموهبة صاعدة يلقب في الأكاديمية بـ "الهداف المستقبلي".',
  ],
};

const SPECIAL_TRAITS: string[] = [
  'صاحب تسديدات صاروخية 🚀',
  'مراوغ استثنائي وموهبة فطرية ✨',
  'قائد للمجموعة وشخصية بطولية 🛡️',
  'سرعة خارقة في الانطلاق ⚡',
  'رؤية تكتيكية وتمريرات ساحرة 🎯',
  'لياقة حديدية وتحمل استثنائي 💪',
  'حائط صد وتدخلات دفاعية نظيفة 🧱',
  'حاسة تهديفية ولمسة أخيرة قاتلة ⚽',
];

/**
 * Generates an intake of young academy prospects (ages 15-18)
 * based on the club's Youth Academy Level (1-5) and club prestige.
 * 
 * Strict Balance Rules:
 * - Overall rating is small: Capped at maximum 55 so training is essential for progression.
 * - Age: 15-18 years old.
 * - Market valuation: Low (maximum 300,000 EGP) to prevent exploitation/free profit.
 * - Potential: High ceiling so player can grow over seasons through training & matches.
 */
export function generateYouthAcademyBatch(
  club: Club,
  seasonNumber: number = 1
): YouthProspect[] {
  const academyLevel = club.facilities?.youthAcademyLevel || 1;
  const countryCode = club.countryCode || 'EGY';
  const country = getCountryById(countryCode);

  // Number of prospects scaled with academy facility level (3 at lvl 1 up to 6 at lvl 5)
  const prospectCount = Math.min(6, 2 + Math.floor(academyLevel * 0.8) + (Math.random() < 0.3 ? 1 : 0));
  const prospects: YouthProspect[] = [];

  // Low base ability ranges by academy level (Strictly capped at 55 max):
  // Lvl 1: 38 - 44
  // Lvl 2: 40 - 47
  // Lvl 3: 43 - 50
  // Lvl 4: 45 - 53
  // Lvl 5: 48 - 55
  const baseRatingMin = 36 + academyLevel * 2;
  const baseRatingMax = Math.min(55, 42 + academyLevel * 2.6);

  const categories: PositionCategory[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD', 'FWD'];

  for (let i = 0; i < prospectCount; i++) {
    const cat = categories[i % categories.length];
    const positions = POSITIONS_BY_CATEGORY[cat];
    const pos = positions[Math.floor(Math.random() * positions.length)];

    // Names from country pool
    const { firstNames, lastNames } = country.playerNamePool;
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)] || 'محمد';
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)] || 'علي';
    const fullName = `${firstName} ${lastName}`;

    const age = Math.floor(Math.random() * 4) + 15; // 15, 16, 17, 18
    const rawOverall = Math.floor(Math.random() * (baseRatingMax - baseRatingMin + 1)) + baseRatingMin;
    // Strict Cap: Overall rating never exceeds 55
    const overallRating = Math.min(55, Math.max(36, Math.round(rawOverall)));

    // Potential rating: Room to grow through training and matches (65 to 88)
    const potentialBonus = Math.floor(Math.random() * 10) + (academyLevel * 4) + (19 - age) * 2;
    const isWonderkid = academyLevel >= 3 && Math.random() < (academyLevel * 0.07);
    const potentialRating = isWonderkid 
      ? Math.min(88, Math.max(78, overallRating + 28)) 
      : Math.min(84, Math.max(overallRating + 14, overallRating + potentialBonus));

    const reports = SCOUT_REPORTS[cat] || SCOUT_REPORTS.MID;
    const scoutReport = isWonderkid
      ? `🌟 موهبة خام واعدة جداً (Wonderkid)! يتمتع بطاقة تأسيسية (${overallRating}) وإمكانات هائلة للتطور بالتدريب والخبرة.`
      : reports[Math.floor(Math.random() * reports.length)];

    const specialTrait = Math.random() < (0.35 + academyLevel * 0.08)
      ? SPECIAL_TRAITS[Math.floor(Math.random() * SPECIAL_TRAITS.length)]
      : undefined;

    // Valuation calculation: Strictly capped at 300,000 EGP max
    const { marketValue, salary } = calculatePlayerValuation(
      overallRating,
      potentialRating,
      age,
      cat,
      club.reputation || 50
    );

    // Youth valuation strictly capped between 35,000 EGP and 300,000 EGP max
    const rawValuation = Math.round(marketValue * 0.35);
    const marketValuation = Math.min(300000, Math.max(35000, Math.round(rawValuation / 5000) * 5000));
    const wageDemandMonthly = Math.min(1800, Math.max(400, Math.round(salary * 0.3)));

    prospects.push({
      id: `youth_${club.id}_s${seasonNumber}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      firstName,
      lastName,
      name: fullName,
      age,
      position: pos,
      positionCategory: cat,
      nationality: country.name,
      nationalityCode: country.code,
      preferredFoot: PREFERRED_FEET[Math.floor(Math.random() * PREFERRED_FEET.length)],
      personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
      overallRating,
      potentialRating,
      scoutReport,
      specialTrait,
      graduationReadiness: Math.min(100, Math.round(((age - 14) / 4) * 60 + (overallRating / 60) * 40)),
      marketValuation,
      wageDemandMonthly,
      intakeSeasonNumber: seasonNumber,
    });
  }

  // Sort best potential first
  return prospects.sort((a, b) => b.potentialRating - a.potentialRating);
}

/**
 * Converts an academy prospect into a full first-team Player object
 * with generated attributes, jersey number, and official professional contract.
 */
export function promoteYouthProspectToSquad(
  prospect: YouthProspect,
  club: Club
): Player {
  const isGK = prospect.position === 'GK';
  const isDef = prospect.positionCategory === 'DEF';
  const isMid = prospect.positionCategory === 'MID';
  const isFwd = prospect.positionCategory === 'FWD';
  const overall = Math.min(55, prospect.overallRating);

  // Scaled young attributes proportional to youth overall (30 - 62)
  const attributes = {
    pace: Math.min(68, Math.max(35, overall + Math.floor(Math.random() * 10 - 2))),
    shooting: Math.min(65, Math.max(25, overall + (isFwd ? Math.floor(Math.random() * 6 + 3) : isDef ? -10 : 0))),
    passing: Math.min(65, Math.max(25, overall + (isMid ? Math.floor(Math.random() * 6 + 3) : isGK ? -10 : 0))),
    dribbling: Math.min(65, Math.max(25, overall + (isFwd || isMid ? Math.floor(Math.random() * 6 + 2) : isGK ? -12 : -3))),
    defending: Math.min(65, Math.max(25, overall + (isDef ? Math.floor(Math.random() * 6 + 4) : isFwd ? -12 : -2))),
    physical: Math.min(65, Math.max(30, overall + Math.floor(Math.random() * 8 - 2))),
    goalkeeping: isGK ? Math.min(65, Math.max(35, overall + Math.floor(Math.random() * 5 + 2))) : undefined,
  };

  // Find next available jersey number
  const existingSquad = Array.isArray(club.players) ? club.players : [];
  const takenNumbers = new Set(existingSquad.map(p => p.number));
  let jerseyNumber = Math.floor(Math.random() * 50) + 30; // Youth often wear 30+
  while (takenNumbers.has(jerseyNumber)) {
    jerseyNumber = (jerseyNumber % 99) + 1;
  }

  // Market value capped at 300,000 EGP max
  const finalMarketValue = Math.min(300000, Math.max(35000, prospect.marketValuation));

  return {
    id: `promoted_${prospect.id}`,
    firstName: prospect.firstName,
    lastName: prospect.lastName,
    name: prospect.name,
    nationality: prospect.nationality,
    nationalityCode: prospect.nationalityCode,
    countryOfBirth: prospect.nationality,
    preferredFoot: prospect.preferredFoot,
    personality: prospect.personality,
    currentClubId: club.id,
    currentLeagueId: club.leagueId,
    age: prospect.age,
    position: prospect.position,
    positionCategory: prospect.positionCategory,
    overallRating: overall,
    potentialRating: prospect.potentialRating,
    attributes,
    salary: prospect.wageDemandMonthly,
    marketValue: finalMarketValue,
    morale: 95, // High morale for newly promoted youth
    fitness: 100,
    form: 7.0,
    number: jerseyNumber,
    stats: {
      appearances: 0,
      starts: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      tackles: 0,
      saves: 0,
      averageRating: 7.0,
      motm: 0,
    },
    contractYears: 3, // 3-year initial youth contract
  };
}
