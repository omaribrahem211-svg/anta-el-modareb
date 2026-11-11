import type { Position, PositionCategory, PreferredFoot } from '../types/game';
import type { RealPlayerTemplate } from './realPlayersData';

/**
 * Compact real-squad format.
 *   'الاسم|POS|العمر|التقييم|الإمكانات|القيمة بالمليون يورو|رمز الجنسية[|رقم القميص[|L]]'
 * Attributes, wage and ids are derived deterministically so a whole real squad
 * costs one short line per player instead of a 20-line object.
 */
export type CompactSquadMap = Record<string, string[]>;

const NATIONALITY: Record<string, string> = {
  EGY: 'مصر', SAU: 'السعودية', ENG: 'إنجلترا', ESP: 'إسبانيا', GER: 'ألمانيا', ITA: 'إيطاليا', FRA: 'فرنسا',
  POR: 'البرتغال', NED: 'هولندا', BEL: 'بلجيكا', BRA: 'البرازيل', ARG: 'الأرجنتين', URU: 'الأوروغواي',
  COL: 'كولومبيا', CHI: 'تشيلي', ECU: 'الإكوادور', PAR: 'باراغواي', VEN: 'فنزويلا', PER: 'بيرو', MEX: 'المكسيك',
  USA: 'الولايات المتحدة', CAN: 'كندا', CRO: 'كرواتيا', SRB: 'صربيا', SUI: 'سويسرا', AUT: 'النمسا',
  DEN: 'الدنمارك', SWE: 'السويد', NOR: 'النرويج', FIN: 'فنلندا', POL: 'بولندا', CZE: 'التشيك', SVK: 'سلوفاكيا',
  HUN: 'المجر', ROU: 'رومانيا', GRE: 'اليونان', TUR: 'تركيا', UKR: 'أوكرانيا', RUS: 'روسيا', SCO: 'إسكتلندا',
  WAL: 'ويلز', IRL: 'أيرلندا', NIR: 'أيرلندا الشمالية', ISL: 'آيسلندا', SVN: 'سلوفينيا', BIH: 'البوسنة',
  MNE: 'الجبل الأسود', ALB: 'ألبانيا', KOS: 'كوسوفو', MKD: 'مقدونيا الشمالية', GEO: 'جورجيا', ARM: 'أرمينيا',
  MAR: 'المغرب', ALG: 'الجزائر', TUN: 'تونس', SEN: 'السنغال', CIV: 'كوت ديفوار', GHA: 'غانا', NGA: 'نيجيريا',
  CMR: 'الكاميرون', MLI: 'مالي', GUI: 'غينيا', COD: 'الكونغو الديمقراطية', GAB: 'الغابون', ZAM: 'زامبيا',
  RSA: 'جنوب إفريقيا', BFA: 'بوركينا فاسو', CPV: 'الرأس الأخضر', GAM: 'غامبيا', ANG: 'أنغولا', MOZ: 'موزمبيق',
  SDN: 'السودان', LBY: 'ليبيا', IRQ: 'العراق', SYR: 'سوريا', JOR: 'الأردن', PLE: 'فلسطين', LBN: 'لبنان',
  UAE: 'الإمارات', QAT: 'قطر', KUW: 'الكويت', OMA: 'عُمان', BHR: 'البحرين', IRN: 'إيران', JPN: 'اليابان',
  KOR: 'كوريا الجنوبية', AUS: 'أستراليا', NZL: 'نيوزيلندا', CHN: 'الصين', UZB: 'أوزبكستان', JAM: 'جامايكا',
  CUW: 'كوراساو', SUR: 'سورينام', HAI: 'هايتي', CRC: 'كوستاريكا', PAN: 'بنما', HON: 'هندوراس', BOL: 'بوليفيا',
  TOG: 'توغو', BEN: 'بنين', ZIM: 'زيمبابوي', TAN: 'تنزانيا', KEN: 'كينيا', UGA: 'أوغندا', CGO: 'الكونغو',
  EQG: 'غينيا الاستوائية', MTN: 'موريتانيا', COM: 'جزر القمر', MAD: 'مدغشقر', NAM: 'ناميبيا', LUX: 'لوكسمبورغ',
  CYP: 'قبرص', ISR: 'إسرائيل', BUL: 'بلغاريا', LTU: 'ليتوانيا', LVA: 'لاتفيا', EST: 'إستونيا', BLR: 'بيلاروسيا',
};

const POS_CAT: Record<string, PositionCategory> = {
  GK: 'GK', CB: 'DEF', RB: 'DEF', LB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', RW: 'FWD', LW: 'FWD', ST: 'FWD',
};

// [pace, shooting, passing, dribbling, defending, physical] offsets from overall
const POS_PROFILE: Record<string, [number, number, number, number, number, number]> = {
  GK: [-30, -45, -25, -35, -45, -12],
  CB: [-9, -28, -14, -20, 2, 3],
  RB: [2, -20, -6, -8, -3, -4],
  LB: [2, -20, -6, -8, -3, -4],
  CDM: [-8, -16, 0, -8, 0, 3],
  CM: [-5, -10, 3, -1, -8, -3],
  CAM: [-4, -3, 4, 4, -26, -12],
  RW: [4, -3, -4, 5, -34, -14],
  LW: [4, -3, -4, 5, -34, -14],
  ST: [0, 4, -12, -4, -38, -2],
};

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h ^ (h >>> 15)) >>> 0;
}

const clamp = (v: number, lo = 25, hi = 96) => Math.max(lo, Math.min(hi, Math.round(v)));

export function parseCompactPlayer(clubId: string, leagueId: string, line: string, index: number, number: number): RealPlayerTemplate {
  const [name, pos, age, ovr, pot, valueM, nat, , foot] = line.split('|').map(s => s.trim());
  const position = (POS_CAT[pos] ? pos : 'CM') as Position;
  const overall = Math.max(40, Math.min(97, Number(ovr) || 60));
  const potential = Math.max(overall, Math.min(99, Number(pot) || overall));
  const value = Math.max(0.05, Number(valueM) || 1) * 1_000_000;
  const h = hash(`${clubId}|${name}`);
  const jitter = (n: number) => ((h >>> (n * 4)) % 7) - 3; // -3..+3

  const profile = POS_PROFILE[position];
  const attrs = {
    pace: clamp(overall + profile[0] + jitter(0)),
    shooting: clamp(overall + profile[1] + jitter(1)),
    passing: clamp(overall + profile[2] + jitter(2)),
    dribbling: clamp(overall + profile[3] + jitter(3)),
    defending: clamp(overall + profile[4] + jitter(4)),
    physical: clamp(overall + profile[5] + jitter(5)),
    goalkeeping: position === 'GK' ? overall : undefined,
  };

  const parts = name.split(' ');
  const preferredFoot: PreferredFoot = foot === 'L' ? 'left' : foot === 'B' ? 'both' : (h % 9 === 0 ? 'left' : 'right');
  const natCode = (nat || 'EGY').toUpperCase();

  return {
    id: `${clubId}_r${index + 1}`,
    name,
    firstName: parts[0] || name,
    lastName: parts.slice(1).join(' ') || name,
    nationality: NATIONALITY[natCode] || natCode,
    nationalityCode: natCode,
    clubId,
    leagueId,
    position,
    positionCategory: POS_CAT[position],
    age: Math.max(15, Math.min(44, Number(age) || 25)),
    overallRating: overall,
    potentialRating: potential,
    marketValue: Math.round(value),
    salary: Math.max(2500, Math.round(value * 0.012)),
    preferredFoot,
    number,
    attributes: attrs as RealPlayerTemplate['attributes'],
  };
}

export function buildCompactSquads(leagueId: string, map: CompactSquadMap): Record<string, RealPlayerTemplate[]> {
  const out: Record<string, RealPlayerTemplate[]> = {};
  Object.entries(map).forEach(([clubId, lines]) => {
    // 1) explicit shirt numbers win (first claim), 2) the rest get the lowest free number
    const numbers: number[] = new Array(lines.length).fill(0);
    const taken = new Set<number>();
    lines.forEach((l, i) => {
      const n = Number(l.split('|')[7]) || 0;
      if (n > 0 && !taken.has(n)) { numbers[i] = n; taken.add(n); }
    });
    lines.forEach((l, i) => {
      if (numbers[i]) return;
      let n = l.split('|')[1]?.trim() === 'GK' ? 12 : 2;
      while (taken.has(n)) n++;
      numbers[i] = n;
      taken.add(n);
    });
    out[clubId] = lines.map((line, i) => parseCompactPlayer(clubId, leagueId, line, i, numbers[i]));
  });
  return out;
}
