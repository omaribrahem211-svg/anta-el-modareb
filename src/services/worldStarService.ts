import { Player, Position, PositionCategory, PreferredFoot } from '../types/game';

export type WorldStarTier = 'legend' | 'world_class' | 'wildcard';

export interface WorldStarTemplate {
  name: string;
  nameEn: string;
  nickname: string;
  nationality: string;
  nationalityCode: string;
  flag: string;
  position: Position;
  positionCategory: PositionCategory;
  age: number;
  preferredFoot: PreferredFoot;
  overallRating: number;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    goalkeeping?: number;
  };
  tier: WorldStarTier;
  tierLabelArabic: string;
  cardColor: string;
  quote: string;
}

export const WORLD_STARS_POOL: WorldStarTemplate[] = [
  // ==========================================
  // 1. الفئة الأسطورية (LEGENDS & MEGA STARS: 88 - 93)
  // ==========================================
  {
    name: 'ليونيل ميسي',
    nameEn: 'Lionel Messi',
    nickname: 'البرغوث الأسطوري 🐐',
    nationality: 'الأرجنتين',
    nationalityCode: 'ARG',
    flag: '🇦🇷',
    position: 'RW',
    positionCategory: 'FWD',
    age: 37,
    preferredFoot: 'left',
    overallRating: 91,
    attributes: { pace: 80, shooting: 93, passing: 95, dribbling: 94, defending: 36, physical: 65 },
    tier: 'legend',
    tierLabelArabic: 'أسطورة عالمية (GOAT)',
    cardColor: 'from-amber-500 via-yellow-400 to-amber-600 border-amber-300',
    quote: 'جاهز لقيادة هجوم فريقك وتقديم سحر كروي استثنائي في هذه المباراة الحاسمة!',
  },
  {
    name: 'كريستيانو رونالدو',
    nameEn: 'Cristiano Ronaldo',
    nickname: 'صاروخ ماديرا (الدون) 🚀',
    nationality: 'البرتغال',
    nationalityCode: 'POR',
    flag: '🇵🇹',
    position: 'ST',
    positionCategory: 'FWD',
    age: 39,
    preferredFoot: 'right',
    overallRating: 89,
    attributes: { pace: 78, shooting: 94, passing: 79, dribbling: 82, defending: 35, physical: 84 },
    tier: 'legend',
    tierLabelArabic: 'أسطورة هجومية خارقة',
    cardColor: 'from-red-600 via-amber-500 to-yellow-500 border-yellow-300',
    quote: 'سأضع كل طاقتي وخبرتي التهديفية في الشباك لنهدي جماهير النادي فوزاً لا يُنسى! SIUUU!',
  },
  {
    name: 'كيليان مبابي',
    nameEn: 'Kylian Mbappé',
    nickname: 'القطار النفاث ⚡',
    nationality: 'فرنسا',
    nationalityCode: 'FRA',
    flag: '🇫🇷',
    position: 'ST',
    positionCategory: 'FWD',
    age: 25,
    preferredFoot: 'right',
    overallRating: 92,
    attributes: { pace: 97, shooting: 91, passing: 82, dribbling: 93, defending: 38, physical: 80 },
    tier: 'legend',
    tierLabelArabic: 'قنبلة هجومية عالمية',
    cardColor: 'from-purple-600 via-indigo-500 to-pink-500 border-purple-300',
    quote: 'لن يتمكن أي مدافع من مجاراة سرعتي.. الفوز سيكون حليفنا اليوم بإذن الله!',
  },
  {
    name: 'إرلينغ هالاند',
    nameEn: 'Erling Haaland',
    nickname: 'الفايكنج المدمر 🤖',
    nationality: 'النرويج',
    nationalityCode: 'NOR',
    flag: '🇳🇴',
    position: 'ST',
    positionCategory: 'FWD',
    age: 24,
    preferredFoot: 'left',
    overallRating: 91,
    attributes: { pace: 89, shooting: 94, passing: 68, dribbling: 81, defending: 45, physical: 91 },
    tier: 'legend',
    tierLabelArabic: 'ماكينة أهداف ساحقة',
    cardColor: 'from-sky-500 via-cyan-400 to-blue-600 border-cyan-300',
    quote: 'مهمتي واحدة فقط: تحويل كل كرة داخل منطقة الجزاء إلى هدف داخل الشباك!',
  },
  {
    name: 'كيفين دي بروين',
    nameEn: 'Kevin De Bruyne',
    nickname: 'مهندس التمريرات الساحرة 📐',
    nationality: 'بلجيكا',
    nationalityCode: 'BEL',
    flag: '🇧🇪',
    position: 'CAM',
    positionCategory: 'MID',
    age: 33,
    preferredFoot: 'right',
    overallRating: 90,
    attributes: { pace: 72, shooting: 88, passing: 95, dribbling: 87, defending: 65, physical: 77 },
    tier: 'legend',
    tierLabelArabic: 'مايسترو صناعة اللعب',
    cardColor: 'from-blue-600 via-sky-400 to-indigo-600 border-sky-300',
    quote: 'سأرسل تمريرات بالملمتر لمهاجميك لفتح أي دفاع متكتل أمامنا!',
  },
  {
    name: 'فينيسيوس جونيور',
    nameEn: 'Vinicius Jr',
    nickname: 'الراقص السامبا 🇧🇷✨',
    nationality: 'البرازيل',
    nationalityCode: 'BRA',
    flag: '🇧🇷',
    position: 'LW',
    positionCategory: 'FWD',
    age: 24,
    preferredFoot: 'right',
    overallRating: 90,
    attributes: { pace: 96, shooting: 84, passing: 81, dribbling: 92, defending: 34, physical: 72 },
    tier: 'legend',
    tierLabelArabic: 'ساحر الأطراف والمراوغة',
    cardColor: 'from-emerald-500 via-yellow-400 to-teal-600 border-yellow-300',
    quote: 'المتعة والفاعلية مضمونة اليوم على الرواق الأيسر!',
  },
  {
    name: 'فيرجيل فان دايك',
    nameEn: 'Virgil van Dijk',
    nickname: 'جدار برلين البشري 🛡️',
    nationality: 'هولندا',
    nationalityCode: 'NED',
    flag: '🇳🇱',
    position: 'CB',
    positionCategory: 'DEF',
    age: 33,
    preferredFoot: 'right',
    overallRating: 89,
    attributes: { pace: 78, shooting: 60, passing: 72, dribbling: 71, defending: 91, physical: 88 },
    tier: 'legend',
    tierLabelArabic: 'صخرة الدفاع العالمية',
    cardColor: 'from-orange-600 via-amber-500 to-slate-800 border-orange-400',
    quote: 'لن يمر أي مهاجم من منطقتنا.. الشباك النظيفة هي عهدي لكم اليوم!',
  },
  {
    name: 'تيبو كورتوا',
    nameEn: 'Thibaut Courtois',
    nickname: 'الأخطبوط البلجيكي 🧤',
    nationality: 'بلجيكا',
    nationalityCode: 'BEL',
    flag: '🇧🇪',
    position: 'GK',
    positionCategory: 'GK',
    age: 32,
    preferredFoot: 'left',
    overallRating: 89,
    attributes: { pace: 48, shooting: 20, passing: 74, dribbling: 45, defending: 25, physical: 78, goalkeeping: 92 },
    tier: 'legend',
    tierLabelArabic: 'حارس المرمى الخارق',
    cardColor: 'from-cyan-600 via-teal-500 to-slate-900 border-cyan-400',
    quote: 'اطمئنوا تماماً، المرمى في أمان كامل ولن تهتز شباكنا!',
  },

  // ==========================================
  // 2. الفئة الممتازة (TOP CLASS & STARS: 84 - 87)
  // ==========================================
  {
    name: 'محمد صلاح',
    nameEn: 'Mohamed Salah',
    nickname: 'فخر العرب (الملك المصري) 👑🇪🇬',
    nationality: 'مصر',
    nationalityCode: 'EGY',
    flag: '🇪🇬',
    position: 'RW',
    positionCategory: 'FWD',
    age: 32,
    preferredFoot: 'left',
    overallRating: 88,
    attributes: { pace: 89, shooting: 88, passing: 83, dribbling: 88, defending: 45, physical: 75 },
    tier: 'world_class',
    tierLabelArabic: 'نجم عالمي صف أول',
    cardColor: 'from-red-600 via-amber-500 to-emerald-600 border-amber-300',
    quote: 'شرف كبير أن أرتدي قميص فريقك اليوم.. سأقاتل لنهدي جماهيرنا فوزاً تاريخياً!',
  },
  {
    name: 'جود بيلينغهام',
    nameEn: 'Jude Bellingham',
    nickname: 'الفتى الذهبي المقاتل 🌟',
    nationality: 'إنجلترا',
    nationalityCode: 'ENG',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    position: 'CAM',
    positionCategory: 'MID',
    age: 21,
    preferredFoot: 'right',
    overallRating: 88,
    attributes: { pace: 81, shooting: 85, passing: 84, dribbling: 87, defending: 78, physical: 84 },
    tier: 'world_class',
    tierLabelArabic: 'نجم وسط متكامل',
    cardColor: 'from-blue-600 via-slate-800 to-indigo-700 border-blue-400',
    quote: 'سأركض في كل شبر من الملعب وأربط بين الدفاع والهجوم حتى الصافرة الأخيرة!',
  },
  {
    name: 'لوكا مودريتش',
    nameEn: 'Luka Modrić',
    nickname: 'المايسترو الكرواتي 🎻',
    nationality: 'كرواتيا',
    nationalityCode: 'CRO',
    flag: '🇭🇷',
    position: 'CM',
    positionCategory: 'MID',
    age: 38,
    preferredFoot: 'both',
    overallRating: 85,
    attributes: { pace: 68, shooting: 77, passing: 89, dribbling: 87, defending: 72, physical: 66 },
    tier: 'world_class',
    tierLabelArabic: 'مايسترو الخبرة والهدوء',
    cardColor: 'from-red-600 via-blue-500 to-slate-800 border-red-300',
    quote: 'كرة القدم تلعب بالعقل أولاً.. تحكمنا بالوسط سيهدينا نقاط المباراة!',
  },
  {
    name: 'أشرف حكيمي',
    nameEn: 'Achraf Hakimi',
    nickname: 'الصاروخ المغربي 🇲🇦⚡',
    nationality: 'المغرب',
    nationalityCode: 'MAR',
    flag: '🇲🇦',
    position: 'RB',
    positionCategory: 'DEF',
    age: 26,
    preferredFoot: 'right',
    overallRating: 85,
    attributes: { pace: 93, shooting: 74, passing: 80, dribbling: 81, defending: 77, physical: 78 },
    tier: 'world_class',
    tierLabelArabic: 'ظهير طائر عالمي',
    cardColor: 'from-emerald-600 via-red-600 to-green-700 border-emerald-400',
    quote: 'الرواق الأيمن ملك لفريقنا اليوم.. سرعة دفاعية وهجومية لا تهدأ!',
  },
  {
    name: 'روبرت ليفاندوفسكي',
    nameEn: 'Robert Lewandowski',
    nickname: 'القناص البولندي 🎯',
    nationality: 'بولندا',
    nationalityCode: 'POL',
    flag: '🇵🇱',
    position: 'ST',
    positionCategory: 'FWD',
    age: 36,
    preferredFoot: 'right',
    overallRating: 87,
    attributes: { pace: 72, shooting: 91, passing: 79, dribbling: 84, defending: 44, physical: 81 },
    tier: 'world_class',
    tierLabelArabic: 'قناص كلاسيكي قاتل',
    cardColor: 'from-red-600 via-rose-500 to-slate-900 border-rose-300',
    quote: 'نصف فرصة داخل منطقة الجزاء تكفيني لافتتاح التسجيل!',
  },
  {
    name: 'أنطوان غريزمان',
    nameEn: 'Antoine Griezmann',
    nickname: 'الأمير الصغير التكتيكي 🎭',
    nationality: 'فرنسا',
    nationalityCode: 'FRA',
    flag: '🇫🇷',
    position: 'ST',
    positionCategory: 'FWD',
    age: 33,
    preferredFoot: 'left',
    overallRating: 86,
    attributes: { pace: 77, shooting: 85, passing: 87, dribbling: 86, defending: 68, physical: 72 },
    tier: 'world_class',
    tierLabelArabic: 'مهاجم ذكي وصانع فرص',
    cardColor: 'from-blue-600 via-red-500 to-slate-800 border-indigo-300',
    quote: 'سأربك دفاع المنافس بتحركاتي التكتيكية ومساندة خط الوسط!',
  },

  // ==========================================
  // 3. الفئة المتواضعة / بطاقة الحظ (WILDCARD & CONTROVERSIAL STARS: 74 - 81)
  // (هنا يتجلى عنصر الحظ الذي طلبه المستخدم: لاعب مشهور وممتع لكن تقييمه متوسط أو متقلب)
  // ==========================================
  {
    name: 'نيمار جونيور',
    nameEn: 'Neymar Jr',
    nickname: 'الساحر العائد 🪄 (فورمة متوسطة)',
    nationality: 'البرازيل',
    nationalityCode: 'BRA',
    flag: '🇧🇷',
    position: 'CAM',
    positionCategory: 'MID',
    age: 32,
    preferredFoot: 'both',
    overallRating: 81,
    attributes: { pace: 76, shooting: 82, passing: 84, dribbling: 91, defending: 32, physical: 56 },
    tier: 'wildcard',
    tierLabelArabic: 'بطاقة حظ (مهارة بدون لياقة كافية)',
    cardColor: 'from-yellow-600 via-amber-500 to-slate-800 border-yellow-500',
    quote: 'سأمتع الجماهير بمراوغاتي الساحرة، لكن احذروا الإرهاق والتدخلات العنيفة!',
  },
  {
    name: 'إدين هازارد',
    nameEn: 'Eden Hazard',
    nickname: 'الساحر المعتزل مؤقتاً 🍔🇧🇪',
    nationality: 'بلجيكا',
    nationalityCode: 'BEL',
    flag: '🇧🇪',
    position: 'LW',
    positionCategory: 'FWD',
    age: 33,
    preferredFoot: 'right',
    overallRating: 77,
    attributes: { pace: 68, shooting: 76, passing: 82, dribbling: 85, defending: 30, physical: 58 },
    tier: 'wildcard',
    tierLabelArabic: 'بطاقة حظ استعراضية',
    cardColor: 'from-amber-700 via-orange-600 to-slate-900 border-amber-600',
    quote: 'عدت من الاعتزال لمباراة واحدة فقط معكم! قد لا أركض كثيراً لكن لمساتي لا تزال ساحرة!',
  },
  {
    name: 'سيرجيو راموس',
    nameEn: 'Sergio Ramos',
    nickname: 'المحارب الأندلسي ⚔️ (بطاقة حمراء محتملة!)',
    nationality: 'إسبانيا',
    nationalityCode: 'ESP',
    flag: '🇪🇸',
    position: 'CB',
    positionCategory: 'DEF',
    age: 38,
    preferredFoot: 'right',
    overallRating: 80,
    attributes: { pace: 61, shooting: 68, passing: 73, dribbling: 66, defending: 83, physical: 84 },
    tier: 'wildcard',
    tierLabelArabic: 'مدافع قتالي (حماس زائد)',
    cardColor: 'from-red-700 via-orange-600 to-slate-900 border-red-500',
    quote: 'إما أن نقطع الكرة بروح قتالية، أو نقطع أرجل المهاجمين! لا استسلام أبداً!',
  },
  {
    name: 'باول بوغبا',
    nameEn: 'Paul Pogba',
    nickname: 'المايسترو المتردد 💈',
    nationality: 'فرنسا',
    nationalityCode: 'FRA',
    flag: '🇫🇷',
    position: 'CM',
    positionCategory: 'MID',
    age: 31,
    preferredFoot: 'right',
    overallRating: 78,
    attributes: { pace: 64, shooting: 79, passing: 84, dribbling: 82, defending: 62, physical: 80 },
    tier: 'wildcard',
    tierLabelArabic: 'بطاقة حظ (موهبة متقلبة)',
    cardColor: 'from-purple-800 via-indigo-700 to-slate-900 border-purple-500',
    quote: 'إن كان يوم حظي فسأرسل تمريرات خرافية، وإن لم يكن فربما أتكاسل قليلاً في الارتداد الدفاعي!',
  },
  {
    name: 'ماريو بالوتيلي',
    nameEn: 'Mario Balotelli',
    nickname: 'سوبر ماريو المشاغب 🧨 (Why Always Me?)',
    nationality: 'إيطاليا',
    nationalityCode: 'ITA',
    flag: '🇮🇹',
    position: 'ST',
    positionCategory: 'FWD',
    age: 34,
    preferredFoot: 'right',
    overallRating: 75,
    attributes: { pace: 70, shooting: 82, passing: 68, dribbling: 77, defending: 31, physical: 83 },
    tier: 'wildcard',
    tierLabelArabic: 'مهاجم مشاغب ومزاجي',
    cardColor: 'from-sky-800 via-slate-800 to-amber-700 border-sky-600',
    quote: 'سأسدد كرات صاروخية قد تمزق الشباك، أو ربما أتشاجر مع الحكم.. ترقبوا المفاجآت!',
  },
  {
    name: 'جيمس رودريغيز',
    nameEn: 'James Rodríguez',
    nickname: 'القدم اليسرى الذهبية (بسرعة سلحفاة) 🐢',
    nationality: 'كولومبيا',
    nationalityCode: 'COL',
    flag: '🇨🇴',
    position: 'CAM',
    positionCategory: 'MID',
    age: 33,
    preferredFoot: 'left',
    overallRating: 79,
    attributes: { pace: 59, shooting: 81, passing: 85, dribbling: 80, defending: 45, physical: 62 },
    tier: 'wildcard',
    tierLabelArabic: 'مهارة بدون سرعة',
    cardColor: 'from-yellow-700 via-amber-600 to-slate-900 border-yellow-500',
    quote: 'أعطوني الكرة على قدمي اليسرى وسأضعها في الزاوية التسعين، لكن لا تطلبوا مني الركض السريع!',
  },
  {
    name: 'أنتوني',
    nameEn: 'Antony',
    nickname: 'الدوار الاستعراضي (السبينر) 🌪️',
    nationality: 'البرازيل',
    nationalityCode: 'BRA',
    flag: '🇧🇷',
    position: 'RW',
    positionCategory: 'FWD',
    age: 24,
    preferredFoot: 'left',
    overallRating: 74,
    attributes: { pace: 82, shooting: 71, passing: 70, dribbling: 81, defending: 41, physical: 64 },
    tier: 'wildcard',
    tierLabelArabic: 'استعراض مراوغات متقلب',
    cardColor: 'from-yellow-800 via-amber-700 to-slate-900 border-amber-500',
    quote: 'سأقوم بحركة الدوران الاستعراضي 360 درجة لإمتاع المدرجات اليوم!',
  },
  {
    name: 'أندريه أونانا',
    nameEn: 'André Onana',
    nickname: 'الحارس المغامر 🧤🎲',
    nationality: 'الكاميرون',
    nationalityCode: 'CMR',
    flag: '🇨🇲',
    position: 'GK',
    positionCategory: 'GK',
    age: 28,
    preferredFoot: 'right',
    overallRating: 79,
    attributes: { pace: 55, shooting: 25, passing: 83, dribbling: 60, defending: 35, physical: 78, goalkeeping: 79 },
    tier: 'wildcard',
    tierLabelArabic: 'حارس مجازف بردود فعل متقلبة',
    cardColor: 'from-emerald-800 via-teal-700 to-slate-900 border-emerald-600',
    quote: 'سأشارك معكم كحارس ولاعب ارتكاز إضافي.. تصديات خرافية وتمريرات مجازفة!',
  },
];

/**
 * Picks a random world star with realistic weighted probability:
 * - 30% Mega Legend (88+)
 * - 40% World Class (84-87)
 * - 30% Wildcard / High-Variance (74-81)
 */
export function getRandomWorldStarTemplate(): WorldStarTemplate {
  const rand = Math.random();
  let pool: WorldStarTemplate[];

  if (rand < 0.30) {
    pool = WORLD_STARS_POOL.filter(s => s.tier === 'legend');
  } else if (rand < 0.70) {
    pool = WORLD_STARS_POOL.filter(s => s.tier === 'world_class');
  } else {
    pool = WORLD_STARS_POOL.filter(s => s.tier === 'wildcard');
  }

  if (pool.length === 0) {
    pool = WORLD_STARS_POOL;
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  return selected;
}

/**
 * Creates a fully playable Player instance from a WorldStarTemplate
 * Configured specifically for a 1-match loan contract.
 */
export function createGuestStarPlayer(template: WorldStarTemplate, userClubId?: string): Player {
  const uniqueId = `guest_star_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // Pick an iconic shirt number based on position & star
  let jerseyNumber = 10;
  if (template.position === 'GK') jerseyNumber = 1;
  else if (template.position === 'ST') jerseyNumber = template.nameEn.includes('Ronaldo') ? 7 : template.nameEn.includes('Haaland') ? 9 : 9;
  else if (template.position === 'CB') jerseyNumber = 4;
  else if (template.position === 'RB') jerseyNumber = 2;
  else if (template.position === 'RW') jerseyNumber = template.nameEn.includes('Messi') ? 10 : template.nameEn.includes('Salah') ? 11 : 7;
  else if (template.position === 'LW') jerseyNumber = template.nameEn.includes('Mbappé') ? 7 : 11;
  else if (template.position === 'CAM' || template.position === 'CM') jerseyNumber = template.nameEn.includes('De Bruyne') ? 17 : 10;

  return {
    id: uniqueId,
    name: template.name,
    firstName: template.name.split(' ')[0] || template.name,
    lastName: template.name.split(' ').slice(1).join(' ') || '',
    nickname: template.nickname,
    nationality: template.nationality,
    nationalityCode: template.nationalityCode,
    countryOfBirth: template.nationality,
    age: template.age,
    preferredFoot: template.preferredFoot,
    personality: template.tier === 'legend' ? 'leader' : template.tier === 'wildcard' ? 'temperamental' : 'ambitious',
    position: template.position,
    positionCategory: template.positionCategory,
    overallRating: template.overallRating,
    rating: template.overallRating,
    potentialRating: Math.max(template.overallRating, 94),
    attributes: { ...template.attributes },
    salary: 0, // No salary burden on club treasury
    marketValue: template.overallRating >= 90 ? 150000000 : template.overallRating >= 84 ? 75000000 : 20000000,
    morale: 100,
    moraleStatus: 'ecstatic',
    moraleReason: 'متحمس جداً لخوض هذه المباراة الاستثنائية وتقديم كل ما لديه لإسعاد الجماهير!',
    fitness: 100,
    fatigue: 0,
    trainingProgress: 0,
    form: 9,
    number: jerseyNumber,
    contractYears: 1,
    stats: {
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      averageRating: 0,
    },
    // Guest Star Properties
    isGuestStar: true,
    guestMatchesRemaining: 1,
    guestStarTier: template.tier,
    guestStarQuote: template.quote,
    currentClubId: userClubId,
  };
}

/**
 * Checks if the squad already has an active guest star for the next match
 */
export function findActiveGuestStar(players: Player[]): Player | undefined {
  return (players || []).find(p => Boolean(p && p.isGuestStar && (p.guestMatchesRemaining === undefined || p.guestMatchesRemaining > 0)));
}
