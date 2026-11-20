import { Club, Player, Position, PositionCategory } from '../types/game';

/**
 * Football legends ("أساطير زمان"). They sit in the transfer market under "قاعة الأساطير", cost a lot, and are
 * never picked up by AI clubs. A legend is a normal Player with isLegend = true (no retirement before 42).
 */
interface LegendDef {
  id: string;
  name: string;
  nat: string;
  code: string;
  pos: Position;
  age: number;
  ovr: number;
  value: number; // market value
  attrs: [number, number, number, number, number, number]; // pace, shooting, passing, dribbling, defending, physical
  number: number;
  title: string;
}

const L = (
  id: string, name: string, nat: string, code: string, pos: Position, age: number, ovr: number,
  value: number, attrs: LegendDef['attrs'], number: number, title: string
): LegendDef => ({ id: `legend_${id}`, name, nat, code, pos, age, ovr, value, attrs, number, title });

export const LEGENDS: LegendDef[] = [
  // Egypt & Arab world
  L('aboutrika', 'محمد أبوتريكة', 'مصر', 'EGY', 'CAM', 33, 88, 45_000_000, [74, 86, 91, 89, 52, 70], 22, 'ساحر الأهلي'),
  L('hossam_hassan', 'حسام حسن', 'مصر', 'EGY', 'ST', 33, 85, 30_000_000, [76, 87, 74, 78, 40, 82], 9, 'العميد'),
  L('ahmed_hassan', 'أحمد حسن', 'مصر', 'EGY', 'CM', 34, 84, 25_000_000, [70, 78, 85, 82, 72, 78], 8, 'كبير الفراعنة'),
  L('el_hadary', 'عصام الحضري', 'مصر', 'EGY', 'GK', 35, 86, 28_000_000, [60, 30, 55, 40, 30, 80], 1, 'السد العالي'),
  L('mido', 'أحمد "ميدو" حسام', 'مصر', 'EGY', 'ST', 30, 84, 32_000_000, [80, 86, 70, 78, 40, 88], 9, 'الجنرال'),
  L('zaki', 'عمرو زكي', 'مصر', 'EGY', 'ST', 30, 83, 22_000_000, [77, 86, 66, 74, 38, 84], 11, 'الهداف الشرس'),
  L('mahmoud_alkhateeb', 'محمود الخطيب', 'مصر', 'EGY', 'RW', 30, 88, 38_000_000, [86, 87, 88, 90, 48, 72], 10, 'بيبو'),
  L('saeed_oweiran', 'سعيد العويران', 'السعودية', 'KSA', 'ST', 30, 85, 28_000_000, [86, 88, 78, 86, 40, 76], 9, 'صقر الدوري'),
  // World legends
  L('maradona', 'دييجو مارادونا', 'الأرجنتين', 'ARG', 'CAM', 27, 95, 120_000_000, [86, 90, 92, 98, 45, 78], 10, 'الإله الأرجنتيني'),
  L('pele', 'بيليه', 'البرازيل', 'BRA', 'ST', 27, 96, 125_000_000, [90, 94, 90, 95, 52, 80], 10, 'ملك الكرة'),
  L('cruyff', 'يوهان كرويف', 'هولندا', 'NED', 'CAM', 28, 93, 100_000_000, [87, 88, 94, 93, 55, 72], 14, 'الطائر الهولندي'),
  L('zidane', 'زين الدين زيدان', 'فرنسا', 'FRA', 'CAM', 30, 94, 110_000_000, [78, 88, 95, 96, 62, 82], 5, 'زيزو'),
  L('ronaldinho', 'رونالدينيو', 'البرازيل', 'BRA', 'CAM', 26, 93, 105_000_000, [88, 87, 91, 98, 40, 74], 10, 'ساحر البرازيل'),
  L('ronaldo_r9', 'رونالدو', 'البرازيل', 'BRA', 'ST', 25, 95, 115_000_000, [94, 96, 78, 95, 35, 82], 9, 'الظاهرة'),
  L('henry', 'تييري هنري', 'فرنسا', 'FRA', 'ST', 27, 92, 90_000_000, [93, 91, 84, 90, 42, 80], 14, 'ملك هايبري'),
  L('maldini', 'باولو مالديني', 'إيطاليا', 'ITA', 'CB', 30, 91, 70_000_000, [78, 52, 78, 70, 96, 88], 3, 'قائد ميلان'),
  L('cannavaro', 'فابيو كانافارو', 'إيطاليا', 'ITA', 'CB', 31, 90, 62_000_000, [76, 40, 66, 66, 95, 90], 5, 'جدار إيطاليا'),
  L('roberto_carlos', 'روبيرتو كارلوس', 'البرازيل', 'BRA', 'LB', 29, 89, 55_000_000, [91, 85, 80, 84, 82, 80], 3, 'صاروخ الجناح'),
  L('cafu', 'كافو', 'البرازيل', 'BRA', 'RB', 29, 89, 52_000_000, [88, 66, 80, 82, 85, 84], 2, 'الظهير الأسطوري'),
  L('buffon', 'جيانلويجي بوفون', 'إيطاليا', 'ITA', 'GK', 30, 92, 60_000_000, [58, 32, 60, 42, 34, 86], 1, 'جيجي'),
  L('casillas', 'إيكر كاسياس', 'إسبانيا', 'ESP', 'GK', 28, 91, 58_000_000, [60, 30, 58, 42, 32, 84], 1, 'القديس'),
  L('pirlo', 'أندريا بيرلو', 'إيطاليا', 'ITA', 'CDM', 32, 90, 60_000_000, [60, 82, 96, 86, 74, 70], 21, 'المايسترو'),
  L('xavi', 'تشافي هيرنانديز', 'إسبانيا', 'ESP', 'CM', 29, 90, 65_000_000, [70, 74, 96, 90, 72, 68], 6, 'مدير الأوركسترا'),
  L('iniesta', 'أندريس إنييستا', 'إسبانيا', 'ESP', 'CM', 28, 91, 75_000_000, [76, 78, 93, 94, 62, 70], 8, 'الساحر'),
  L('kaka', 'ريكاردو كاكا', 'البرازيل', 'BRA', 'CAM', 26, 91, 80_000_000, [90, 86, 88, 92, 48, 76], 22, 'الملاك'),
  L('beckham', 'ديفيد بيكهام', 'إنجلترا', 'ENG', 'RW', 29, 88, 50_000_000, [76, 82, 93, 82, 62, 74], 7, 'الركلات الحرة'),
  L('gerrard', 'ستيفن جيرارد', 'إنجلترا', 'ENG', 'CM', 29, 90, 62_000_000, [78, 88, 90, 82, 80, 88], 8, 'قلب ليفربول'),
  L('lampard', 'فرانك لامبارد', 'إنجلترا', 'ENG', 'CM', 29, 89, 55_000_000, [70, 90, 86, 78, 70, 82], 8, 'الهداف الوسط'),
  L('drogba', 'ديدييه دروجبا', 'ساحل العاج', 'CIV', 'ST', 30, 90, 62_000_000, [82, 90, 74, 80, 52, 94], 11, 'ملك أفريقيا'),
  L('eto', 'صامويل إيتو', 'الكاميرون', 'CMR', 'ST', 28, 90, 60_000_000, [90, 90, 76, 86, 42, 82], 9, 'الأسد غير المروّض'),
  L('totti', 'فرانشيسكو توتي', 'إيطاليا', 'ITA', 'CAM', 30, 89, 55_000_000, [72, 88, 91, 90, 48, 72], 10, 'ملك روما'),
  L('shevchenko', 'أندريه شيفتشينكو', 'أوكرانيا', 'UKR', 'ST', 28, 90, 65_000_000, [88, 91, 78, 86, 40, 80], 7, 'سيبيليو'),
  L('baggio', 'روبرتو باجيو', 'إيطاليا', 'ITA', 'CAM', 28, 91, 72_000_000, [78, 89, 92, 94, 40, 70], 10, 'الذيل الإلهي'),
  L('batistuta', 'جابرييل باتيستوتا', 'الأرجنتين', 'ARG', 'ST', 28, 90, 58_000_000, [82, 94, 70, 80, 36, 88], 9, 'باتيجول'),
  L('vanbasten', 'ماركو فان باستن', 'هولندا', 'NED', 'ST', 27, 93, 85_000_000, [84, 95, 82, 90, 40, 82], 9, 'البجعة'),
];

/** Fixed-length (10-wide) skills for a legend card: use for display where needed. */
export function createLegendPlayer(def: LegendDef): Player {
  const cat: PositionCategory = def.pos === 'GK' ? 'GK'
    : (def.pos === 'CB' || def.pos === 'RB' || def.pos === 'LB') ? 'DEF'
    : (def.pos === 'CDM' || def.pos === 'CM' || def.pos === 'CAM') ? 'MID' : 'FWD';
  const parts = def.name.split(' ');
  const [pace, shooting, passing, dribbling, defending, physical] = def.attrs;
  return {
    id: def.id,
    name: def.name,
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    nickname: def.title,
    nationality: def.nat,
    nationalityCode: def.code,
    countryOfBirth: def.nat,
    currentClubId: '',
    currentClubName: 'قاعة الأساطير',
    currentLeagueId: 'free_agents',
    age: def.age,
    position: def.pos,
    positionCategory: cat,
    overallRating: def.ovr,
    rating: def.ovr,
    potentialRating: def.ovr,
    salary: Math.round(def.value / 90 / 1000) * 1000,
    marketValue: def.value,
    askingPrice: def.value,
    morale: 95,
    fitness: 100,
    fatigue: 0,
    form: 8.5,
    number: def.number,
    attributes: { pace, shooting, passing, dribbling, defending, physical, goalkeeping: def.pos === 'GK' ? def.ovr : 20 },
    stats: { appearances: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, cleanSheets: 0, averageRating: 7.5 },
    contractYears: 0,
    isFreeAgent: true,
    isListedForTransfer: true,
    isLegend: true,
    careerStage: 'legend',
    personality: 'leader',
    preferredFoot: 'right',
    trainingFocus: 'general',
  } as Player;
}

/**
 * Makes sure every legend that is not owned by a club, not already on the market and not retired is on the market.
 * Returns the same array when nothing changed (cheap to call).
 */
export function ensureLegendsInMarket(market: Player[], teams: Club[], retiredIds: Set<string> = new Set()): Player[] {
  const base = Array.isArray(market) ? market : [];
  const present = new Set<string>();
  for (const p of base) if (p && p.id && p.id.startsWith('legend_')) present.add(p.id);
  const owned = new Set<string>();
  for (const t of teams || []) {
    for (const p of (t && Array.isArray(t.players) ? t.players : [])) {
      if (p && p.id && p.id.startsWith('legend_')) owned.add(p.id);
    }
  }
  const missing = LEGENDS.filter(l => !present.has(l.id) && !owned.has(l.id) && !retiredIds.has(l.id));
  if (missing.length === 0) return base;
  return [...base, ...missing.map(createLegendPlayer)];
}
