import { Club, Player } from '../types/game';
import { GLOBAL_COUNTRIES } from '../data/countriesData';

/** الحد الأقصى لحجم قائمة الفريق */
export const MAX_SQUAD_SIZE = 25;

/** فحص موحد لإصابة اللاعب في جميع أنحاء التطبيق */
export function isPlayerInjured(p?: Player | null): boolean {
  if (!p) return false;
  return Boolean(p.isInjured || (p.injury?.daysRemaining ?? 0) > 0);
}

/** فحص موحد لإيقاف اللاعب في جميع أنحاء التطبيق */
export function isPlayerSuspended(p?: Player | null): boolean {
  if (!p) return false;
  return Boolean(p.isSuspended || (p.suspensionMatches ?? 0) > 0);
}

/** استخراج التشكيل الأساسي والدكة مع fallback موحد في حال عدم تهيئة المصفوفات */
export function getEffectiveLineup(club?: Club | null): {
  startingIds: string[];
  benchIds: string[];
} {
  if (!club) return { startingIds: [], benchIds: [] };
  const players = (Array.isArray(club.players) ? club.players : []).filter(Boolean);
  const rawStarting = club.tactics?.startingPlayerIds;
  const startingIds =
    Array.isArray(rawStarting) && rawStarting.length > 0
      ? rawStarting
      : players.slice(0, 11).map((p) => p.id);

  const rawBench = club.tactics?.benchPlayerIds;
  const benchIds = Array.isArray(rawBench)
    ? rawBench
    : players
        .filter((p) => !startingIds.includes(p.id))
        .slice(0, 7)
        .map((p) => p.id);

  return { startingIds, benchIds };
}

/** قاموس شامل لأعلام الدول المستخدمة في اللعبة مع fallback محايد */
const COUNTRY_FLAGS_MAP: Record<string, string> = {
  EGY: '🇪🇬',
  SAU: '🇸🇦',
  KSA: '🇸🇦',
  UAE: '🇦🇪',
  ARE: '🇦🇪',
  QAT: '🇶🇦',
  MAR: '🇲🇦',
  MOR: '🇲🇦',
  TUN: '🇹🇳',
  ALG: '🇩🇿',
  DZA: '🇩🇿',
  SDN: '🇸🇩',
  LBY: '🇱🇾',
  IRQ: '🇮🇶',
  JOR: '🇯🇴',
  SYR: '🇸🇾',
  LBN: '🇱🇧',
  PAL: '🇵🇸',
  PLE: '🇵🇸',
  KWT: '🇰🇼',
  OMN: '🇴🇲',
  BHR: '🇧🇭',
  YEM: '🇾🇪',
  MRT: '🇲🇷',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  GBR: '🇬🇧',
  SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  ESP: '🇪🇸',
  FRA: '🇫🇷',
  GER: '🇩🇪',
  DEU: '🇩🇪',
  ITA: '🇮🇹',
  POR: '🇵🇹',
  PRT: '🇵🇹',
  NED: '🇳🇱',
  NLD: '🇳🇱',
  BEL: '🇧🇪',
  CRO: '🇭🇷',
  HRV: '🇭🇷',
  SRB: '🇷🇸',
  SUI: '🇨🇭',
  CHE: '🇨🇭',
  AUT: '🇦🇹',
  POL: '🇵🇱',
  SWE: '🇸🇪',
  NOR: '🇳🇴',
  DEN: '🇩🇰',
  DNK: '🇩🇰',
  TUR: '🇹🇷',
  GRE: '🇬🇷',
  UKR: '🇺🇦',
  RUS: '🇷🇺',
  CZE: '🇨🇿',
  ROU: '🇷🇴',
  HUN: '🇭🇺',
  SVK: '🇸🇰',
  SVN: '🇸🇮',
  BIH: '🇧🇦',
  MNE: '🇲🇪',
  MKD: '🇲🇰',
  ALB: '🇦🇱',
  GEO: '🇬🇪',
  IRL: '🇮🇪',
  NIR: '🇬🇧',
  FIN: '🇫🇮',
  ISL: '🇮🇸',
  BRA: '🇧🇷',
  ARG: '🇦🇷',
  URU: '🇺🇾',
  COL: '🇨🇴',
  CHI: '🇨🇱',
  CHL: '🇨🇱',
  ECU: '🇪🇨',
  PAR: '🇵🇾',
  PER: '🇵🇪',
  VEN: '🇻🇪',
  BOL: '🇧🇴',
  MEX: '🇲🇽',
  USA: '🇺🇸',
  CAN: '🇨🇦',
  CRC: '🇨🇷',
  JAM: '🇯🇲',
  SEN: '🇸🇳',
  NGA: '🇳🇬',
  NGR: '🇳🇬',
  CIV: '🇨🇮',
  CMR: '🇨🇲',
  GHA: '🇬🇭',
  MLI: '🇲🇱',
  BFA: '🇧🇫',
  GUI: '🇬🇳',
  GIN: '🇬🇳',
  COD: '🇨🇩',
  CGO: '🇨🇬',
  ZAF: '🇿🇦',
  RSA: '🇿🇦',
  ZMB: '🇿🇲',
  ZAM: '🇿🇲',
  ZWE: '🇿🇼',
  UGA: '🇺🇬',
  KEN: '🇰🇪',
  TAN: '🇹🇿',
  ETH: '🇪🇹',
  ANG: '🇦🇴',
  AGO: '🇦🇴',
  MOZ: '🇲🇿',
  GAB: '🇬🇦',
  EQG: '🇬🇶',
  CPV: '🇨🇻',
  BEN: '🇧🇯',
  TOG: '🇹🇬',
  NAM: '🇳🇦',
  GAM: '🇬🇲',
  GMB: '🇬🇲',
  JPN: '🇯🇵',
  KOR: '🇰🇷',
  IRN: '🇮🇷',
  AUS: '🇦🇺',
  UZB: '🇺🇿',
  CHN: '🇨🇳',
  IND: '🇮🇳',
  NZL: '🇳🇿',
};

// دمج أعلام GLOBAL_COUNTRIES إن وجدت
for (const c of Object.values(GLOBAL_COUNTRIES)) {
  if (c.code && c.flag) {
    COUNTRY_FLAGS_MAP[c.code.toUpperCase()] = c.flag;
  }
}

/** إرجاع إيموجي العلم بناءً على رمز الجنسية أو اسمها مع fallback محايد */
export function getFlagEmoji(nationalityCode?: string, nationalityName?: string): string {
  if (nationalityCode) {
    const code = nationalityCode.trim().toUpperCase();
    if (COUNTRY_FLAGS_MAP[code]) return COUNTRY_FLAGS_MAP[code];
  }
  if (nationalityName) {
    const name = nationalityName.trim();
    const matched = Object.values(GLOBAL_COUNTRIES).find(
      (c) => c.name === name || c.code.toLowerCase() === name.toLowerCase()
    );
    if (matched?.flag) return matched.flag;
  }
  return '🏳️';
}

/** استنتاج عملة النادي من رمز الدولة أو الدوري */
export function getClubCurrencySymbol(club?: Club | null): string {
  const code = (club?.countryCode || club?.leagueId || '').toUpperCase();
  if (code.includes('EGY') || code === 'EG') return 'ج.م';
  if (code.includes('SAU') || code.includes('KSA') || code === 'SA') return 'ر.س';
  if (code.includes('UAE') || code.includes('ARE') || code === 'AE') return 'د.إ';
  if (code.includes('QAT') || code === 'QA') return 'ر.ق';
  if (code.includes('MAR') || code.includes('MOR')) return 'د.م';
  if (code.includes('TUN')) return 'د.ت';
  if (code.includes('ALG') || code.includes('DZA')) return 'د.ج';
  if (code.includes('ENG') || code.includes('GBR')) return '£';
  if (
    code.includes('ESP') ||
    code.includes('GER') ||
    code.includes('ITA') ||
    code.includes('FRA') ||
    code.includes('POR') ||
    code.includes('NED')
  ) {
    return '€';
  }
  // افتراضي للدوري المصري إن لم يتوفر countryCode واضح
  if (!code) return 'ج.م';
  return '$';
}

/** تنسيق المبالغ المالية مع عملة النادي المناسبة */
export function formatMoney(
  value: number | undefined | null,
  club?: Club | null,
  compact: boolean = false
): string {
  const amount = Number(value) || 0;
  const currency = getClubCurrencySymbol(club);
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M ${currency}`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `${Math.round(amount / 1_000)}k ${currency}`;
    }
  }
  return `${amount.toLocaleString()} ${currency}`;
}

/** فئات ألوان التقييم الموحدة (85+ سماوي/نخبة، 75-84 ذهبي، 65-74 أخضر، أقل من 65 رمادي) */
export function getOvrColorClasses(ovr: number): {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  ringColor: string;
  tierLabel: string;
} {
  if (ovr >= 85) {
    return {
      badgeBg: 'bg-gradient-to-br from-cyan-400 to-sky-500',
      badgeText: 'text-slate-950',
      badgeBorder: 'border-cyan-200',
      ringColor: 'ring-cyan-400/50',
      tierLabel: 'نخبة',
    };
  }
  if (ovr >= 75) {
    return {
      badgeBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      badgeText: 'text-slate-950',
      badgeBorder: 'border-amber-200',
      ringColor: 'ring-amber-400/50',
      tierLabel: 'ذهبي',
    };
  }
  if (ovr >= 65) {
    return {
      badgeBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      badgeText: 'text-slate-950',
      badgeBorder: 'border-emerald-300',
      ringColor: 'ring-emerald-400/40',
      tierLabel: 'فضي',
    };
  }
  return {
    badgeBg: 'bg-slate-800',
    badgeText: 'text-slate-200',
    badgeBorder: 'border-slate-600',
    ringColor: 'ring-slate-600/40',
    tierLabel: 'برونزي',
  };
}

const COMPOUND_PREFIXES = new Set(['عبد', 'أبو', 'ابو', 'بن', 'ابن', 'آل']);
const COMPOUND_SUFFIXES = new Set(['الدين', 'الله', 'الإسلام', 'الحق']);

/**
 * تقسيم اسم اللاعب الذكي لاستخراج الاسم الأول والاسم الثاني بدقة
 * مع مراعاة الأسماء المركبة العربية (مثل: عبد الله السعيد، محمد عبد المنعم، وسام أبو علي، سيف الدين الجزيري)
 */
export function getPlayerFirstAndSecondName(rawName?: string | null): {
  firstName: string;
  secondName: string;
  displayName: string;
} {
  const cleaned = (rawName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return { firstName: 'لاعب', secondName: '', displayName: 'لاعب' };
  }

  const rawTokens = cleaned.split(' ');
  const logicalParts: string[] = [];

  let i = 0;
  while (i < rawTokens.length) {
    let current = rawTokens[i];

    // إذا كانت الكلمة بادئة مركبة (عبد / أبو / بن) ندمجها مع الكلمة التالية
    if (COMPOUND_PREFIXES.has(current) && i + 1 < rawTokens.length) {
      current = `${current} ${rawTokens[i + 1]}`;
      i += 2;
    } else {
      i += 1;
    }

    // إذا كانت الكلمة التالية لاحقة مركبة (الدين / الله) ندمجها مع الجزء الحالي
    if (i < rawTokens.length && COMPOUND_SUFFIXES.has(rawTokens[i])) {
      current = `${current} ${rawTokens[i]}`;
      i += 1;
    }

    logicalParts.push(current);
  }

  const firstName = logicalParts[0] || cleaned;
  const secondName = logicalParts[1] || '';
  const displayName = secondName ? `${firstName} ${secondName}` : firstName;

  return { firstName, secondName, displayName };
}

/** إرجاع الاسم الأول والثاني للاعب كنص منسق */
export function formatPlayerDualName(rawName?: string | null): string {
  return getPlayerFirstAndSecondName(rawName).displayName;
}

