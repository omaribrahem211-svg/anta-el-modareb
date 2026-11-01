export interface DailyLoginRewardItem {
  day: number; // 1 to 7
  coins: number;
  clubFunds: number;
  developmentPoints: number;
  moraleBoost?: boolean;
  energyBoost?: boolean;
  title: string;
  description: string;
  badge?: string;
  isMilestone?: boolean;
}

export interface DailyLoginRewardClaimRecord {
  date: string;
  day: number;
  coins: number;
  clubFunds: number;
  developmentPoints: number;
  timestamp: number;
}

export interface DailyLoginRewardState {
  streak: number; // Current day in 1..7 streak
  lastClaimDate: string | null; // 'YYYY-MM-DD'
  totalDaysClaimed: number;
  lastClaimTimestamp: number | null;
  history: DailyLoginRewardClaimRecord[];
}

export interface ClaimDailyRewardResult {
  success: boolean;
  message: string;
  reward?: DailyLoginRewardItem;
  streak?: number;
  isMilestone?: boolean;
}

export const DAILY_LOGIN_REWARDS_SCHEDULE: readonly DailyLoginRewardItem[] = [
  {
    day: 1,
    coins: 20,
    clubFunds: 10000,
    developmentPoints: 3,
    title: 'بداية الانطلاقة',
    description: '20 كوينز + 10 ألف ج.م + 3 نقطة تطوير',
    badge: 'اليوم الأول'
  },
  {
    day: 2,
    coins: 25,
    clubFunds: 15000,
    developmentPoints: 4,
    title: 'حماس التدريبات',
    description: '25 كوينز + 15 ألف ج.م + 4 نقطة تطوير',
    badge: 'اليوم الثاني'
  },
  {
    day: 3,
    coins: 30,
    clubFunds: 20000,
    developmentPoints: 5,
    energyBoost: true,
    title: 'نشاط الفريق وتجديد الطاقة',
    description: '30 كوينز + 20 ألف ج.م + 5 نقطة تطوير + شحن طاقة الفريق ⚡',
    badge: 'اليوم الثالث'
  },
  {
    day: 4,
    coins: 40,
    clubFunds: 25000,
    developmentPoints: 5,
    title: 'ثقة الإدارة والجماهير',
    description: '40 كوينز + 25 ألف ج.م + 5 نقطة تطوير',
    badge: 'اليوم الرابع'
  },
  {
    day: 5,
    coins: 50,
    clubFunds: 30000,
    developmentPoints: 6,
    moraleBoost: true,
    title: 'روح الانتصارات والعزيمة',
    description: '50 كوينز + 30 ألف ج.م + 6 نقطة تطوير + تعزيز المعنويات 🔥',
    badge: 'اليوم الخامس'
  },
  {
    day: 6,
    coins: 60,
    clubFunds: 40000,
    developmentPoints: 8,
    title: 'نادي النخبة المتألق',
    description: '60 كوينز + 40 ألف ج.م + 8 نقطة تطوير',
    badge: 'اليوم السادس'
  },
  {
    day: 7,
    coins: 100,
    clubFunds: 75000,
    developmentPoints: 12,
    moraleBoost: true,
    energyBoost: true,
    title: 'الجائزة الكبرى الأسبوعية 🏆',
    description: '100 كوينز + 75 ألف ج.م + 12 نقطة تطوير + طاقة ومعنويات كاملة!',
    badge: 'الجائزة الكبرى',
    isMilestone: true
  }
];

export function getLocalTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateDaysDifference(dateStr1?: string | null, dateStr2?: string | null): number {
  if (!dateStr1 || !dateStr2) return 1;
  try {
    const s1 = dateStr1.split('T')[0].trim();
    const s2 = dateStr2.split('T')[0].trim();
    const d1 = new Date(`${s1}T00:00:00`);
    const d2 = new Date(`${s2}T00:00:00`);
    const t1 = d1.getTime();
    const t2 = d2.getTime();
    if (isNaN(t1) || isNaN(t2)) return 1;
    const diffTime = t2 - t1;
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(days) ? 1 : days;
  } catch {
    return 1;
  }
}
