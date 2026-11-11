import { Position, PositionCategory } from '../types/game';

/**
 * Arabic localization helper for football positions and position categories.
 */

export const POSITION_ARABIC: Record<Position, string> = {
  GK: 'حارس مرمى',
  CB: 'قلب دفاع',
  RB: 'ظهير أيمن',
  LB: 'ظهير أيسر',
  CDM: 'خط وسط دفاعي',
  CM: 'خط وسط',
  CAM: 'صانع ألعاب',
  RW: 'جناح هجومي أيمن',
  LW: 'جناح هجومي أيسر',
  ST: 'مهاجم صريح',
};

export const SHORT_POSITION_ARABIC: Record<string, string> = {
  GK: 'حارس مرمى',
  CB: 'قلب دفاع',
  RB: 'ظهير أيمن',
  LB: 'ظهير أيسر',
  LWB: 'ظهير جناح أيسر',
  RWB: 'ظهير جناح أيمن',
  CDM: 'وسط دفاعي',
  CM: 'خط وسط',
  CAM: 'صانع ألعاب',
  RAM: 'وسط أيمن',
  LAM: 'وسط أيسر',
  LM: 'جناح أيسر',
  RM: 'جناح أيمن',
  RW: 'جناح أيمن',
  LW: 'جناح أيسر',
  ST: 'مهاجم',
  CF: 'قلب هجوم',
};

export const POSITION_CATEGORY_ARABIC: Record<PositionCategory, string> = {
  GK: 'حراسة المرمى',
  DEF: 'خط الدفاع',
  MID: 'خط الوسط',
  FWD: 'خط الهجوم',
};

export const SHORT_CATEGORY_ARABIC: Record<PositionCategory, string> = {
  GK: 'حارس',
  DEF: 'مدافع',
  MID: 'وسط',
  FWD: 'مهاجم',
};

/**
 * Returns full Arabic name of position (e.g. 'ST' -> 'مهاجم صريح')
 */
export function getPositionArabic(pos?: string): string {
  if (!pos) return 'لاعب';
  const upper = pos.toUpperCase();
  if (POSITION_ARABIC[upper as Position]) {
    return POSITION_ARABIC[upper as Position];
  }
  if (SHORT_POSITION_ARABIC[upper]) {
    return SHORT_POSITION_ARABIC[upper];
  }
  return pos;
}

/**
 * Returns short Arabic position label (e.g. 'ST' -> 'مهاجم', 'GK' -> 'حارس مرمى')
 */
export function getShortPositionArabic(pos?: string): string {
  if (!pos) return 'لاعب';
  const upper = pos.toUpperCase();
  if (SHORT_POSITION_ARABIC[upper]) {
    return SHORT_POSITION_ARABIC[upper];
  }
  if (POSITION_ARABIC[upper as Position]) {
    return POSITION_ARABIC[upper as Position];
  }
  return pos;
}

/**
 * Returns Arabic Category name (e.g. 'FWD' -> 'خط الهجوم', 'DEF' -> 'خط الدفاع')
 */
export function getCategoryArabic(cat?: string): string {
  if (!cat) return 'عام';
  const upper = cat.toUpperCase() as PositionCategory;
  return POSITION_CATEGORY_ARABIC[upper] || SHORT_CATEGORY_ARABIC[upper] || cat;
}

/**
 * Returns Short Arabic Category (e.g. 'FWD' -> 'مهاجم', 'DEF' -> 'مدافع')
 */
export function getShortCategoryArabic(cat?: string): string {
  if (!cat) return 'لاعب';
  const upper = cat.toUpperCase() as PositionCategory;
  return SHORT_CATEGORY_ARABIC[upper] || cat;
}

/**
 * Returns Tailwind color classes tailored for each position category
 */
export function getPositionBadgeClass(catOrPos?: string): string {
  if (!catOrPos) return 'bg-slate-800 text-slate-300 border-slate-700';
  const upper = catOrPos.toUpperCase();

  if (upper === 'GK' || upper === 'حارس مرمى') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }
  if (upper === 'DEF' || ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(upper)) {
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  }
  if (upper === 'MID' || ['CDM', 'CM', 'CAM', 'RM', 'LM', 'RAM', 'LAM'].includes(upper)) {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  }
  if (upper === 'FWD' || ['ST', 'CF', 'RW', 'LW'].includes(upper)) {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }

  return 'bg-slate-800 text-slate-300 border-slate-700';
}
