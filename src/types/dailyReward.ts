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
    coins: 50,
    clubFunds: 300000,
    developmentPoints: 15,
    title: 'بداية الانطلاقة',
    description: '50 كوينز + 300 ألف ج.م لميزانية النادي + 15 نقطة تطوير',
    badge: 'اليوم الأول'
  },
  {
    day: 2,
    coins: 75,
    clubFunds: 500000,
    developmentPoints: 20,
    title: 'حماس التدريبات',
    description: '75 كوينز + 500 ألف ج.م + 20 نقطة تطوير لاعبين',
    badge: 'اليوم الثاني'
  },
  {
    day: 3,
    coins: 100,
    clubFunds: 750000,
    developmentPoints: 25,
    energyBoost: true,
    title: 'نشاط الفريق وتجديد الطاقة',
    description: '100 كوينز + 750 ألف ج.م + 25 نقطة تطوير + شحن طاقة الفريق ⚡',
    badge: 'اليوم الثالث'
  },
  {
    day: 4,
    coins: 150,
    clubFunds: 1000000,
    developmentPoints: 30,
    title: 'ثقة الإدارة والجماهير',
    description: '150 كوينز + 1 مليون ج.م + 30 نقطة تطوير تكتيكي',
    badge: 'اليوم الرابع'
  },
  {
    day: 5,
    coins: 200,
    clubFunds: 1500000,
    developmentPoints: 40,
    moraleBoost: true,
    title: 'روح الانتصارات والعزيمة',
    description: '200 كوينز + 1.5 مليون ج.م + 40 نقطة تطوير + تعزيز المعنويات 🔥',
    badge: 'اليوم الخامس'
  },
  {
    day: 6,
    coins: 300,
    clubFunds: 2200000,
    developmentPoints: 50,
    title: 'نادي النخبة المتألق',
    description: '300 كوينز + 2.2 مليون ج.م + 50 نقطة تطوير شاملة',
    badge: 'اليوم السادس'
  },
  {
    day: 7,
    coins: 600,
    clubFunds: 4000000,
    developmentPoints: 80,
    moraleBoost: true,
    energyBoost: true,
    title: 'الجائزة الكبرى الأسبوعية 🏆',
    description: '600 كوينز + 4 مليون ج.م + 80 نقطة تطوير + طاقة ومعنويات كاملة!',
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

export function calculateDaysDifference(dateStr1: string, dateStr2: string): number {
  try {
    const d1 = new Date(dateStr1 + 'T00:00:00');
    const d2 = new Date(dateStr2 + 'T00:00:00');
    const diffTime = d2.getTime() - d1.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}
