// =========================================================================
// Supplementary national teams (statistical strength only — no players).
// These countries have no real players in the game world, so they take part
// in AFCON / World Cup as statistical-strength teams. Fully isolated from
// club data. Arabic names follow the style of countriesData.ts.
// =========================================================================

import { ContinentCode } from '../types/game';

export interface SupplementaryNation {
  code: string;
  name: string;
  flag: string;
  continent: ContinentCode;
  footballLevel: number; // 1 - 100
}

export const SUPPLEMENTARY_NATIONS: Record<string, SupplementaryNation> = {
  SEN: { code: 'SEN', name: 'السنغال', flag: '🇸🇳', continent: 'AFRICA', footballLevel: 84 },
  NGA: { code: 'NGA', name: 'نيجيريا', flag: '🇳🇬', continent: 'AFRICA', footballLevel: 82 },
  CIV: { code: 'CIV', name: 'كوت ديفوار', flag: '🇨🇮', continent: 'AFRICA', footballLevel: 81 },
  CMR: { code: 'CMR', name: 'الكاميرون', flag: '🇨🇲', continent: 'AFRICA', footballLevel: 79 },
  GHA: { code: 'GHA', name: 'غانا', flag: '🇬🇭', continent: 'AFRICA', footballLevel: 78 },
  COD: { code: 'COD', name: 'الكونغو الديمقراطية', flag: '🇨🇩', continent: 'AFRICA', footballLevel: 77 },
  MLI: { code: 'MLI', name: 'مالي', flag: '🇲🇱', continent: 'AFRICA', footballLevel: 76 },
  RSA: { code: 'RSA', name: 'جنوب أفريقيا', flag: '🇿🇦', continent: 'AFRICA', footballLevel: 75 },
  BFA: { code: 'BFA', name: 'بوركينا فاسو', flag: '🇧🇫', continent: 'AFRICA', footballLevel: 74 },
  ZAM: { code: 'ZAM', name: 'زامبيا', flag: '🇿🇲', continent: 'AFRICA', footballLevel: 72 },

  POR: { code: 'POR', name: 'البرتغال', flag: '🇵🇹', continent: 'EUROPE', footballLevel: 88 },
  NED: { code: 'NED', name: 'هولندا', flag: '🇳🇱', continent: 'EUROPE', footballLevel: 87 },
  BEL: { code: 'BEL', name: 'بلجيكا', flag: '🇧🇪', continent: 'EUROPE', footballLevel: 86 },
  CRO: { code: 'CRO', name: 'كرواتيا', flag: '🇭🇷', continent: 'EUROPE', footballLevel: 85 },
  SUI: { code: 'SUI', name: 'سويسرا', flag: '🇨🇭', continent: 'EUROPE', footballLevel: 82 },
  URU: { code: 'URU', name: 'أوروغواي', flag: '🇺🇾', continent: 'SOUTH_AMERICA', footballLevel: 84 },
  COL: { code: 'COL', name: 'كولومبيا', flag: '🇨🇴', continent: 'SOUTH_AMERICA', footballLevel: 83 },
  CHI: { code: 'CHI', name: 'تشيلي', flag: '🇨🇱', continent: 'SOUTH_AMERICA', footballLevel: 79 },
  MEX: { code: 'MEX', name: 'المكسيك', flag: '🇲🇽', continent: 'NORTH_AMERICA', footballLevel: 80 },
  USA: { code: 'USA', name: 'الولايات المتحدة', flag: '🇺🇸', continent: 'NORTH_AMERICA', footballLevel: 78 },
  JPN: { code: 'JPN', name: 'اليابان', flag: '🇯🇵', continent: 'ASIA', footballLevel: 81 },
  KOR: { code: 'KOR', name: 'كوريا الجنوبية', flag: '🇰🇷', continent: 'ASIA', footballLevel: 80 },
  AUS: { code: 'AUS', name: 'أستراليا', flag: '🇦🇺', continent: 'ASIA', footballLevel: 76 },
};

/** AFCON field: the 6 real African countries + these 10 statistical ones = 16. */
export const AFCON_SIZE = 16;

/** World Cup field: the 17 real countries + the 15 strongest others = 32. */
export const WORLD_CUP_SIZE = 32;
