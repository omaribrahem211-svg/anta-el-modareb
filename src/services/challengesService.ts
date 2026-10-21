/**
 * Challenges & Engagement Economy Service for "أنت المدرب"
 * 
 * - Win streak & multi-match challenges (No single-match rewards, 5 consecutive wins crown challenge)
 * - Strict Ad-Gated Rewards: MUST watch 1st ad to claim base reward (1X), and can watch 2nd ad to DOUBLE (2X)
 * - Lucky Mystery Chest: Capped at 100,000 ج.م max
 * - 3-Hour Cooldown for Lucky Chest and Manual Challenges Rotation
 * - Android-optimized responsive state and strict network & completion verification
 */

import { AdManager } from './adManager';

export interface ChallengeReward {
  budget: number;
  coins: number;
  devPoints: number;
  energyPercent: number;
  reputation: number;
  label: string;
}

export type ChallengeCategory = 'matches' | 'ads' | 'squad';

export interface ChallengeItem {
  id: string;
  category: ChallengeCategory;
  title: string;
  description: string;
  badge: string;
  icon: string;
  current: number;
  target: number;
  unit?: string;
  isCompleted: boolean;
  isClaimed: boolean;
  canDoubleWithSecondAd?: boolean; // Can watch a 2nd ad to double after 1st ad claim
  isDoubled?: boolean;
  reward: ChallengeReward;
  isDirectAdAction?: boolean; // Can click to watch ad immediately to progress
  directAdLabel?: string;
  rotationTier?: number;
}

export interface MatchRecordDetails {
  isWin: boolean;
  isDraw?: boolean;
  userGoals?: number;
  oppGoals?: number;
  isAway?: boolean;
}

export interface ChallengesState {
  lastUpdatedDate: string; // 'YYYY-MM-DD'
  currentWinStreak: number; // Consecutive wins (resets to 0 on loss/draw)
  goalsScoredToday: number;
  cleanSheetsToday: number;
  bigMarginWinsToday: number;
  awayWinsToday: number;
  adsWatchedToday: number;
  matchesPlayedToday: number;
  winsToday: number;
  tacticsAdjustedToday: number;
  trainingDoneToday: number;
  playersUpgradedToday: number;
  luckyChestCountToday: number;
  lastLuckyChestTimestamp: number;
  lastRotateMatchesTimestamp: number;
  challenges: ChallengeItem[];
  completedHistoryIds: string[];
}

const STORAGE_KEY = 'anta_elmodareb_challenges_v4';
export const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 hours = 10,800,000 ms

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// -------------------------------------------------------------------
// DYNAMIC MATCH CHALLENGES POOL (Multi-match, win streak focus, rotating!)
// -------------------------------------------------------------------
export const MATCH_CHALLENGES_POOL: ChallengeItem[] = [
  {
    id: 'quest_win_streak_5',
    category: 'matches',
    title: 'سلسلة الانتصارات الذهبية (5 مباريات متتالية) 🔥',
    description: 'حقق الفوز في 5 مباريات رسمية متتالية دون تعادل أو هزيمة لإثبات الهيمنة التكتيكية المطلقة!',
    badge: '5 انتصارات متتالية',
    icon: 'Flame',
    current: 0,
    target: 5,
    unit: 'فوز متتالي',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 850000,
      coins: 120,
      devPoints: 50,
      energyPercent: 25,
      reputation: 3,
      label: '850,000 ج.م + 120 كوينز + 50 نقطة تطوير + 3 سمعة 👑',
    },
  },
  {
    id: 'quest_clean_sheet_2',
    category: 'matches',
    title: 'الجدار الدفاعي الفولاذي (شباك نظيفة في مباراتين) 🧤',
    description: 'حافظ على نظافة شباك فريقك دون تلقي أي هدف في مباراتين رسميتين.',
    badge: 'شباك نظيفة',
    icon: 'ShieldCheck',
    current: 0,
    target: 2,
    unit: 'مباراة',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 350000,
      coins: 50,
      devPoints: 20,
      energyPercent: 10,
      reputation: 1,
      label: '350,000 ج.م + 50 كوينز + 20 نقطة تطوير 🛡️',
    },
  },
  {
    id: 'quest_score_8_goals',
    category: 'matches',
    title: 'الماكينة التهديفية (تسجيل 8 أهداف) ⚽',
    description: 'سجل هجوم فريقك 8 أهداف إجمالاً في المباريات الرسمية لإسعاد الجماهير.',
    badge: 'طوفان هجومي',
    icon: 'Swords',
    current: 0,
    target: 8,
    unit: 'أهداف',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 450000,
      coins: 60,
      devPoints: 25,
      energyPercent: 15,
      reputation: 2,
      label: '450,000 ج.م + 60 كوينز + 25 نقطة تطوير ⚽',
    },
  },
  {
    id: 'quest_big_win_2',
    category: 'matches',
    title: 'الفوز الكاسح (فارق هدفين+ في مباراتين) ⚡',
    description: 'حقق انتصارين بفارق هدفين أو أكثر في الدوري أو الكأس لإثبات تفوقك.',
    badge: 'فوز عريض',
    icon: 'Trophy',
    current: 0,
    target: 2,
    unit: 'مباريات',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 500000,
      coins: 70,
      devPoints: 30,
      energyPercent: 15,
      reputation: 2,
      label: '500,000 ج.م + 70 كوينز + 30 نقطة تطوير ⚡',
    },
  },
  {
    id: 'quest_win_away_2',
    category: 'matches',
    title: 'قاهر المنافسين خارج الأرض (فوزين خارج الديار) 🏟️',
    description: 'انتزع الفوز في مباراتين رسميتين خارج ملعبك وأمام جماهير الخصم.',
    badge: 'فوز خارج الأرض',
    icon: 'Award',
    current: 0,
    target: 2,
    unit: 'انتصارات',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 450000,
      coins: 65,
      devPoints: 25,
      energyPercent: 15,
      reputation: 2,
      label: '450,000 ج.م + 65 كوينز + 2 سمعة 🏟️',
    },
  },
  {
    id: 'quest_matches_4',
    category: 'matches',
    title: 'ماراثون الجولات (خوض 4 مباريات) 🏃',
    description: 'خض 4 مباريات في مسيرتك التدريبية (مباريات لايف أو محاكاة سريعة).',
    badge: 'ماراثون الجولات',
    icon: 'Swords',
    current: 0,
    target: 4,
    unit: 'مباريات',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 350000,
      coins: 50,
      devPoints: 20,
      energyPercent: 10,
      reputation: 1,
      label: '350,000 ج.م + 50 كوينز 🪙',
    },
  },
  {
    id: 'quest_win_streak_3',
    category: 'matches',
    title: 'ثلاثية الانتصارات المتتالية 🌟',
    description: 'حقق 3 انتصارات متتالية لحصد العلامة الكاملة.',
    badge: '3 على التوالي',
    icon: 'Flame',
    current: 0,
    target: 3,
    unit: 'فوز متتالي',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 400000,
      coins: 60,
      devPoints: 25,
      energyPercent: 15,
      reputation: 2,
      label: '400,000 ج.م + 60 كوينز + 25 نقطة تطوير 🌟',
    },
  },
];

// Initial starter setup
const INITIAL_ACTIVE_CHALLENGES: ChallengeItem[] = [
  // 1. DIRECT AD REWARD QUESTS (High monetization & Ad views)
  {
    id: 'quest_ad_investor',
    category: 'ads',
    title: 'المستثمر الذهبي 💰',
    description: 'شاهد إعلانين فيديو لدعم خزينة النادي وسوق الانتقالات بتمويل ضخم.',
    badge: 'إعلانات ممولة',
    icon: 'Tv',
    current: 0,
    target: 2,
    unit: 'إعلان',
    isCompleted: false,
    isClaimed: false,
    isDirectAdAction: true,
    directAdLabel: 'مشاهدة إعلان تمويلي 🎬',
    reward: {
      budget: 250000,
      coins: 40,
      devPoints: 10,
      energyPercent: 0,
      reputation: 1,
      label: '250,000 ج.م + 40 كوينز 🪙',
    },
  },
  {
    id: 'quest_ad_recovery',
    category: 'ads',
    title: 'طاقم الاستشفاء الشامل ⚡',
    description: 'شاهد إعلاناً لإنعاش كامل لاعبي الفريق واستعادة لياقتهم البدنية القصوى.',
    badge: 'طبي وبدني',
    icon: 'HeartPulse',
    current: 0,
    target: 1,
    unit: 'إعلان',
    isCompleted: false,
    isClaimed: false,
    isDirectAdAction: true,
    directAdLabel: 'مشاهدة إعلان الاستشفاء 🎬',
    reward: {
      budget: 150000,
      coins: 25,
      devPoints: 5,
      energyPercent: 25,
      reputation: 0,
      label: '+25% لياقة شاملة + 150,000 ج.م 💵',
    },
  },
  {
    id: 'quest_ad_rep_boost',
    category: 'ads',
    title: 'الراعي الترويجي للمدرب ⭐',
    description: 'شاهد إعلاناً ترويجياً لزيادة شهرة وسمعة المدرب في وسائل الإعلام العالمية.',
    badge: 'سمعة دولية',
    icon: 'Award',
    current: 0,
    target: 1,
    unit: 'إعلان',
    isCompleted: false,
    isClaimed: false,
    isDirectAdAction: true,
    directAdLabel: 'مشاهدة إعلان السمعة 🎬',
    reward: {
      budget: 120000,
      coins: 30,
      devPoints: 15,
      energyPercent: 0,
      reputation: 2,
      label: '+2 سمعة تدريبية + 120,000 ج.م 🌟',
    },
  },
  {
    id: 'quest_ad_mega_sponsor',
    category: 'ads',
    title: 'راعي البث الفضائي المميز 📡',
    description: 'شاهد 3 إعلانات فيديو لجلب عقد حقوق بث استثنائي يدر مبالغ مالية كبرى لناديك.',
    badge: 'بث مميز',
    icon: 'Tv',
    current: 0,
    target: 3,
    unit: 'إعلانات',
    isCompleted: false,
    isClaimed: false,
    isDirectAdAction: true,
    directAdLabel: 'مشاهدة إعلان البث 🎬',
    reward: {
      budget: 450000,
      coins: 60,
      devPoints: 20,
      energyPercent: 10,
      reputation: 2,
      label: '450,000 ج.م + 60 كوينز + 20 نقطة تطوير 🏆',
    },
  },
  {
    id: 'quest_ad_grand_partnership',
    category: 'ads',
    title: 'التحالف الاستثماري الخارق 💎',
    description: 'شاهد 5 إعلانات فيديو لفتح شراكة ذهبية تمنحك تمويلاً أسطورياً ورفع رصيد المدرب.',
    badge: 'شراكة خارقة',
    icon: 'Sparkles',
    current: 0,
    target: 5,
    unit: 'إعلانات',
    isCompleted: false,
    isClaimed: false,
    isDirectAdAction: true,
    directAdLabel: 'مشاهدة إعلان الشراكة 🎬',
    reward: {
      budget: 800000,
      coins: 100,
      devPoints: 40,
      energyPercent: 20,
      reputation: 3,
      label: '800,000 ج.م + 100 كوينز + 3 سمعة دولية 💎',
    },
  },

  // 2. ACTIVE MATCH CHALLENGES (Rotating pool starters - 5 in a row crown challenge)
  MATCH_CHALLENGES_POOL[0], // 5 consecutive wins
  MATCH_CHALLENGES_POOL[1], // clean sheet 2 matches
  MATCH_CHALLENGES_POOL[2], // score 8 goals
  MATCH_CHALLENGES_POOL[5], // marathon 4 matches

  // 3. SQUAD & TACTICS MASTERY
  {
    id: 'quest_tactic_adjust',
    category: 'squad',
    title: 'المهندس التكتيكي 🧠',
    description: 'قم بتعديل تشكيلة فريقك وتحديث الخطة والنهج الفني قبل المباراة.',
    badge: 'تكتيك متقدم',
    icon: 'ShieldCheck',
    current: 0,
    target: 1,
    unit: 'تعديل',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 100000,
      coins: 20,
      devPoints: 10,
      energyPercent: 0,
      reputation: 0,
      label: '100,000 ج.م + 20 كوينز 🪙',
    },
  },
  {
    id: 'quest_upgrade_player',
    category: 'squad',
    title: 'صانع النجوم والمواهب 🌟',
    description: 'قم بترقية سمة واحدة لأحد لاعبي فريقك بنقاط التطوير والمكافآت.',
    badge: 'تطوير النجوم',
    icon: 'Sparkles',
    current: 0,
    target: 1,
    unit: 'ترقية',
    isCompleted: false,
    isClaimed: false,
    reward: {
      budget: 150000,
      coins: 25,
      devPoints: 10,
      energyPercent: 10,
      reputation: 1,
      label: '150,000 ج.م + 25 كوينز 💵',
    },
  },
];

export class ChallengesManager {
  private static instance: ChallengesManager;
  private state: ChallengesState;
  private listeners: Array<(state: ChallengesState) => void> = [];

  private constructor() {
    this.state = this.loadState();
    this.setupAdListener();
  }

  public static getInstance(): ChallengesManager {
    if (!ChallengesManager.instance) {
      ChallengesManager.instance = new ChallengesManager();
    }
    return ChallengesManager.instance;
  }

  private loadState(): ChallengesState {
    const today = getTodayString();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.challenges)) {
          // Filter out legacy single-match or time challenges
          parsed.challenges = parsed.challenges.filter((c: ChallengeItem) => 
            c.category !== ('time' as any) && 
            !c.id.startsWith('quest_time_') &&
            c.id !== 'quest_hattrick_match'
          );

          if (typeof parsed.currentWinStreak !== 'number') {
            parsed.currentWinStreak = 0;
          }
          if (typeof parsed.lastLuckyChestTimestamp !== 'number') {
            parsed.lastLuckyChestTimestamp = 0;
          }
          if (typeof parsed.lastRotateMatchesTimestamp !== 'number') {
            parsed.lastRotateMatchesTimestamp = 0;
          }
          if (!Array.isArray(parsed.completedHistoryIds)) {
            parsed.completedHistoryIds = [];
          }

          // If new day, reset daily counters but preserve streak & timestamps
          if (parsed.lastUpdatedDate !== today) {
            parsed.lastUpdatedDate = today;
            parsed.adsWatchedToday = 0;
            parsed.matchesPlayedToday = 0;
            parsed.winsToday = 0;
            parsed.tacticsAdjustedToday = 0;
            parsed.trainingDoneToday = 0;
            parsed.playersUpgradedToday = 0;
            parsed.luckyChestCountToday = 0;
            parsed.goalsScoredToday = 0;
            parsed.cleanSheetsToday = 0;
            parsed.bigMarginWinsToday = 0;
            parsed.awayWinsToday = 0;

            parsed.challenges = JSON.parse(JSON.stringify(INITIAL_ACTIVE_CHALLENGES));
          } else {
            // Ensure 5-consecutive wins crown challenge is present
            const hasWinStreak = parsed.challenges.some((c: ChallengeItem) => c.id === 'quest_win_streak_5');
            if (!hasWinStreak) {
              parsed.challenges.unshift(JSON.parse(JSON.stringify(MATCH_CHALLENGES_POOL[0])));
            }
          }

          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading challenges state:', e);
    }

    // Fresh default state
    const fresh: ChallengesState = {
      lastUpdatedDate: today,
      currentWinStreak: 0,
      goalsScoredToday: 0,
      cleanSheetsToday: 0,
      bigMarginWinsToday: 0,
      awayWinsToday: 0,
      adsWatchedToday: 0,
      matchesPlayedToday: 0,
      winsToday: 0,
      tacticsAdjustedToday: 0,
      trainingDoneToday: 0,
      playersUpgradedToday: 0,
      luckyChestCountToday: 0,
      lastLuckyChestTimestamp: 0,
      lastRotateMatchesTimestamp: 0,
      challenges: JSON.parse(JSON.stringify(INITIAL_ACTIVE_CHALLENGES)),
      completedHistoryIds: [],
    };
    this.saveState(fresh);
    return fresh;
  }

  private saveState(state: ChallengesState = this.state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Error saving challenges state:', e);
    }
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.state));
    window.dispatchEvent(new CustomEvent('anta-challenges-updated', { detail: this.state }));
  }

  public subscribe(callback: (state: ChallengesState) => void): () => void {
    this.listeners.push(callback);
    callback(this.state);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public getState(): ChallengesState {
    return this.state;
  }

  public getUnclaimedCompletedCount(): number {
    return this.state.challenges.filter(c => c.isCompleted && !c.isClaimed).length;
  }

  /**
   * Cooldown for Lucky Mystery Ad Chest (3 hours)
   */
  public getLuckyChestCooldownRemaining(): number {
    if (!this.state.lastLuckyChestTimestamp) return 0;
    const elapsed = Date.now() - this.state.lastLuckyChestTimestamp;
    return Math.max(0, Math.ceil((THREE_HOURS_MS - elapsed) / 1000));
  }

  /**
   * Cooldown for manual Match Challenges Rotation (3 hours)
   */
  public getRotateMatchesCooldownRemaining(): number {
    if (!this.state.lastRotateMatchesTimestamp) return 0;
    const elapsed = Date.now() - this.state.lastRotateMatchesTimestamp;
    return Math.max(0, Math.ceil((THREE_HOURS_MS - elapsed) / 1000));
  }

  private setupAdListener() {
    window.addEventListener('anta-ad-rewarded-completed', () => {
      this.recordAdWatched();
    });
  }

  public recordAdWatched() {
    this.state.adsWatchedToday += 1;
    this.updateChallengeProgress('quest_ad_investor', this.state.adsWatchedToday);
    this.updateChallengeProgress('quest_ad_recovery', this.state.adsWatchedToday);
    this.updateChallengeProgress('quest_ad_rep_boost', this.state.adsWatchedToday);
    this.updateChallengeProgress('quest_ad_mega_sponsor', this.state.adsWatchedToday);
    this.updateChallengeProgress('quest_ad_grand_partnership', this.state.adsWatchedToday);
    this.saveState();
    this.notify();
  }

  /**
   * Record match outcome and update dynamic match challenges.
   * If user wins, consecutive streak increments. If user loses/draws, streak resets to 0.
   */
  public recordMatchPlayed(input: boolean | MatchRecordDetails) {
    const isWin = typeof input === 'boolean' ? input : input.isWin;
    const isDraw = typeof input === 'boolean' ? false : Boolean(input.isDraw);
    const userGoals = typeof input === 'object' && typeof input.userGoals === 'number' ? input.userGoals : (isWin ? 2 : 0);
    const oppGoals = typeof input === 'object' && typeof input.oppGoals === 'number' ? input.oppGoals : (isWin ? 0 : 2);
    const isAway = typeof input === 'object' ? Boolean(input.isAway) : false;

    this.state.matchesPlayedToday += 1;
    this.state.goalsScoredToday = (this.state.goalsScoredToday || 0) + userGoals;

    if (isWin) {
      this.state.winsToday += 1;
      this.state.currentWinStreak = (this.state.currentWinStreak || 0) + 1;

      if (userGoals - oppGoals >= 2) {
        this.state.bigMarginWinsToday = (this.state.bigMarginWinsToday || 0) + 1;
      }
      if (isAway) {
        this.state.awayWinsToday = (this.state.awayWinsToday || 0) + 1;
      }
    } else {
      // Streak breaks on defeat or draw!
      this.state.currentWinStreak = 0;
    }

    if (oppGoals === 0 && (isWin || isDraw)) {
      this.state.cleanSheetsToday = (this.state.cleanSheetsToday || 0) + 1;
    }

    // Update active match challenges based on updated metrics
    this.updateChallengeProgress('quest_win_streak_5', this.state.currentWinStreak);
    this.updateChallengeProgress('quest_win_streak_3', this.state.currentWinStreak);
    this.updateChallengeProgress('quest_clean_sheet_2', this.state.cleanSheetsToday);
    this.updateChallengeProgress('quest_score_8_goals', this.state.goalsScoredToday);
    this.updateChallengeProgress('quest_big_win_2', this.state.bigMarginWinsToday);
    this.updateChallengeProgress('quest_win_away_2', this.state.awayWinsToday);
    this.updateChallengeProgress('quest_matches_4', this.state.matchesPlayedToday);

    this.saveState();
    this.notify();
  }

  public recordTacticsAdjusted() {
    this.state.tacticsAdjustedToday += 1;
    this.updateChallengeProgress('quest_tactic_adjust', this.state.tacticsAdjustedToday);
    this.saveState();
    this.notify();
  }

  public recordPlayerUpgraded() {
    this.state.playersUpgradedToday += 1;
    this.updateChallengeProgress('quest_upgrade_player', this.state.playersUpgradedToday);
    this.saveState();
    this.notify();
  }

  private updateChallengeProgress(challengeId: string, currentVal: number) {
    const ch = this.state.challenges.find(c => c.id === challengeId);
    if (!ch || ch.isClaimed) return;

    if (ch.id === 'quest_win_streak_5' || ch.id === 'quest_win_streak_3') {
      if (!ch.isCompleted) {
        ch.current = currentVal;
      }
    } else {
      ch.current = Math.min(ch.target, currentVal);
    }

    if (ch.current >= ch.target && !ch.isCompleted) {
      ch.isCompleted = true;
      window.dispatchEvent(new CustomEvent('anta-challenge-completed', { detail: ch }));
    }
  }

  /**
   * Rotate a match challenge when claimed so players ALWAYS have fresh, evolving challenges!
   */
  public rotateMatchChallenge(claimedId: string) {
    const index = this.state.challenges.findIndex(c => c.id === claimedId);
    if (index === -1) return;

    if (!this.state.completedHistoryIds.includes(claimedId)) {
      this.state.completedHistoryIds.push(claimedId);
    }

    // Find candidate from MATCH_CHALLENGES_POOL that is not currently active
    const activeIds = new Set(this.state.challenges.map(c => c.id));
    const candidate = MATCH_CHALLENGES_POOL.find(p => !activeIds.has(p.id));

    if (candidate) {
      const freshChallenge: ChallengeItem = JSON.parse(JSON.stringify(candidate));
      freshChallenge.current = 0;
      freshChallenge.isCompleted = false;
      freshChallenge.isClaimed = false;
      this.state.challenges.splice(index, 1, freshChallenge);
    } else {
      // Cycle back with enhanced tier bonus!
      const randomFromPool = MATCH_CHALLENGES_POOL[Math.floor(Math.random() * MATCH_CHALLENGES_POOL.length)];
      const freshChallenge: ChallengeItem = JSON.parse(JSON.stringify(randomFromPool));
      freshChallenge.id = `${randomFromPool.id}_tier_${Date.now()}`;
      freshChallenge.title = `${randomFromPool.title} (المستوى التالي)`;
      freshChallenge.current = 0;
      freshChallenge.isCompleted = false;
      freshChallenge.isClaimed = false;
      freshChallenge.reward.budget = Math.round((freshChallenge.reward.budget || 0) * 1.25);
      freshChallenge.reward.coins = Math.round((freshChallenge.reward.coins || 0) * 1.25);
      freshChallenge.reward.label = `✨ ${(freshChallenge.reward.budget || 0).toLocaleString()} ج.م + ${freshChallenge.reward.coins || 0} كوينز 🪙`;
      this.state.challenges.splice(index, 1, freshChallenge);
    }

    this.saveState();
    this.notify();
  }

  /**
   * Manually cycle/refresh all active match challenges (once every 3 hours)
   */
  public rotateAllMatchChallenges(): { success: boolean; message: string } {
    const remaining = this.getRotateMatchesCooldownRemaining();
    if (remaining > 0) {
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      return {
        success: false,
        message: `تغيير التحديات متاح مرة كل 3 ساعات. متاح بعد: ${hours}س و ${mins}د`,
      };
    }

    const activeIds = new Set(this.state.challenges.filter(c => c.category !== 'matches').map(c => c.id));
    const newMatchBatch: ChallengeItem[] = [];

    const shuffledPool = [...MATCH_CHALLENGES_POOL].sort(() => 0.5 - Math.random());
    for (const poolItem of shuffledPool) {
      if (newMatchBatch.length >= 4) break;
      if (!activeIds.has(poolItem.id)) {
        const item: ChallengeItem = JSON.parse(JSON.stringify(poolItem));
        item.current = 0;
        item.isCompleted = false;
        item.isClaimed = false;
        newMatchBatch.push(item);
      }
    }

    const preserved = this.state.challenges.filter(c => c.category !== 'matches');
    this.state.challenges = [...newMatchBatch, ...preserved];
    this.state.lastRotateMatchesTimestamp = Date.now();

    this.saveState();
    this.notify();

    return {
      success: true,
      message: 'تم تدوير وتحديث تحديات المباريات بنجاح!',
    };
  }

  /**
   * Watch an ad directly from an ad challenge item to increment progress.
   * STRICT: Does NOT progress unless the ad finishes completely.
   */
  public async watchAdForChallenge(
    challengeId: string,
    onSuccess?: () => void,
    onFailure?: (err: any) => void
  ): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (onFailure) onFailure('لا يوجد اتصال بالإنترنت لتشغيل الإعلان');
      return false;
    }

    let adRewardEarned = false;

    const shown = await AdManager.showRewarded(
      'club_funds',
      () => {
        adRewardEarned = true;
        this.recordAdWatched();
        if (onSuccess) onSuccess();
      },
      () => {
        if (!adRewardEarned && onFailure) {
          onFailure('لم يتم احتساب المشاهدة لأن الإعلان لم يكتمل.');
        }
      },
      (err) => {
        if (onFailure) onFailure(err);
      }
    );

    if (!shown && onFailure) {
      onFailure('تعذر تحميل الإعلان، تحقق من اتصال الإنترنت.');
    }

    return shown && adRewardEarned;
  }

  /**
   * Open the Lucky Mystery Ad Chest by watching an ad!
   * - Capped at 100,000 ج.م MAX
   * - Cooldown: once every 3 hours
   * - STRICT: Reward is granted ONLY when ad is genuinely completed
   */
  public async openLuckyAdChest(
    onSuccess: (reward: { label: string; budget: number; coins: number; devPoints: number }) => void,
    onFailure?: (err: any) => void
  ): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (onFailure) onFailure('لا يوجد اتصال بالإنترنت لتشغيل إعلان الصندوق');
      return false;
    }

    const cooldownRemaining = this.getLuckyChestCooldownRemaining();
    if (cooldownRemaining > 0) {
      const hours = Math.floor(cooldownRemaining / 3600);
      const mins = Math.floor((cooldownRemaining % 3600) / 60);
      const secs = cooldownRemaining % 60;
      if (onFailure) {
        onFailure(`صندوق الحظ متاح مرة كل 3 ساعات! متبقي: ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
      return false;
    }

    let adRewardEarned = false;

    const shown = await AdManager.showRewarded(
      'coins',
      () => {
        adRewardEarned = true;
        this.recordAdWatched();
        this.state.luckyChestCountToday += 1;
        this.state.lastLuckyChestTimestamp = Date.now();

        // Cash rewards strictly up to 100,000 ج.م max
        const budgets = [25000, 50000, 75000, 100000];
        const coinsList = [15, 25, 35, 50];
        const devPointsList = [5, 10, 15, 20];

        const randomBudget = budgets[Math.floor(Math.random() * budgets.length)];
        const randomCoins = coinsList[Math.floor(Math.random() * coinsList.length)];
        const randomDevPoints = devPointsList[Math.floor(Math.random() * devPointsList.length)];

        const result = {
          label: `🎉 كنز الحظ الإعلاني: +${randomBudget.toLocaleString()} ج.م (حد أقصى 100 ألف) + ${randomCoins} كوينز + ${randomDevPoints} نقطة تطوير!`,
          budget: randomBudget,
          coins: randomCoins,
          devPoints: randomDevPoints,
        };

        this.saveState();
        this.notify();
        onSuccess(result);
      },
      () => {
        if (!adRewardEarned && onFailure) {
          onFailure('تم إغلاق الإعلان قبل اكتماله؛ يجب مشاهدة الإعلان كاملاً لفتح صندوق الحظ.');
        }
      },
      (err) => {
        if (onFailure) onFailure(err);
      }
    );

    if (!shown && onFailure) {
      onFailure('تعذر تشغيل الإعلان حالياً (تأكد من الاتصال بالإنترنت).');
    }

    return shown && adRewardEarned;
  }

  /**
   * Double the Lucky Ad Chest reward by watching a 2nd ad!
   */
  public async doubleLuckyAdChest(
    baseReward: { budget: number; coins: number; devPoints: number },
    onSuccess: (reward: { label: string; budget: number; coins: number; devPoints: number }) => void,
    onFailure?: (err: any) => void
  ): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (onFailure) onFailure('لا يوجد اتصال بالإنترنت لتشغيل إعلان مضاعفة الصندوق');
      return false;
    }

    let adRewardEarned = false;

    const shown = await AdManager.showRewarded(
      'coins',
      () => {
        adRewardEarned = true;
        this.recordAdWatched();

        const result = {
          label: `✨ مضاعفة 2X خارقة: إيداع إضافي +${((baseReward.budget || 0)).toLocaleString()} ج.م و +${baseReward.coins || 0} كوينز و +${baseReward.devPoints || 0} نقاط تطوير!`,
          budget: baseReward.budget,
          coins: baseReward.coins,
          devPoints: baseReward.devPoints,
        };

        this.notify();
        onSuccess(result);
      },
      () => {
        if (!adRewardEarned && onFailure) {
          onFailure('لم يكتمل الإعلان الثاني؛ لم يتم مضاعفة جوائز الصندوق.');
        }
      },
      (err) => {
        if (onFailure) onFailure(err);
      }
    );

    if (!shown && onFailure) {
      onFailure('تعذر تشغيل الإعلان حالياً للمضاعفة (تأكد من الاتصال بالإنترنت).');
    }

    return shown && adRewardEarned;
  }

  /**
   * Claim Challenge Reward:
   * RULE: To claim ANY reward, player MUST watch an ad first! (Step 1)
   * Player can optionally watch a 2nd ad to DOUBLE the reward (Step 2)
   */
  public async claimChallenge(
    challengeId: string,
    mode: 'claim_with_ad' | 'double_with_second_ad' | boolean,
    onRewardApplied: (reward: ChallengeReward) => void,
    onFailure?: (err: any) => void
  ): Promise<boolean> {
    const ch = this.state.challenges.find(c => c.id === challengeId);
    if (!ch || !ch.isCompleted) {
      return false;
    }

    const resolvedMode: 'claim_with_ad' | 'double_with_second_ad' = 
      mode === true || mode === 'double_with_second_ad' ? 'double_with_second_ad' : 'claim_with_ad';

    if (resolvedMode === 'claim_with_ad' && ch.isClaimed && !ch.canDoubleWithSecondAd) {
      return false;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (onFailure) {
        onFailure('لا يوجد اتصال بالإنترنت لتشغيل الإعلان واستلام الجائزة.');
      }
      return false;
    }

    let adRewardEarned = false;

    // STEP 1: Watch 1st Ad to claim base reward (1X)
    if (resolvedMode === 'claim_with_ad') {
      const shown = await AdManager.showRewarded(
        'club_funds',
        () => {
          adRewardEarned = true;
          this.recordAdWatched();
          ch.isClaimed = true;
          ch.canDoubleWithSecondAd = true; // Player is now eligible to double with a 2nd ad!

          this.saveState();
          this.notify();

          onRewardApplied(ch.reward);
        },
        () => {
          if (!adRewardEarned) {
            ch.isClaimed = false;
            ch.canDoubleWithSecondAd = false;
            this.saveState();
            this.notify();
            if (onFailure) {
              onFailure('لم يتم مشاهدة الإعلان حتى نهايته؛ لا يمكن تسليم المكافأة إلا بعد اكتمال مشاهدة الإعلان.');
            }
          }
        },
        (err) => {
          ch.isClaimed = false;
          ch.canDoubleWithSecondAd = false;
          this.saveState();
          this.notify();
          if (onFailure) {
            onFailure('تعذر تشغيل الإعلان (تأكد من الاتصال بالإنترنت). لم يتم تسليم الجائزة.');
          }
        }
      );

      if (!shown && onFailure) {
        onFailure('تعذر تشغيل الإعلان حالياً. لم يتم تسليم الجائزة.');
      }

      return shown && adRewardEarned;
    }

    // STEP 2: Watch 2nd Ad to DOUBLE the reward (2X)
    if (resolvedMode === 'double_with_second_ad') {
      if (!ch.canDoubleWithSecondAd) {
        if (onFailure) onFailure('تمت مضاعفة هذا التحدي مسبقاً أو غير مؤهل للمضاعفة.');
        return false;
      }

      const shown = await AdManager.showRewarded(
        'club_funds',
        () => {
          adRewardEarned = true;
          this.recordAdWatched();
          ch.canDoubleWithSecondAd = false;
          ch.isDoubled = true;

          // Rotate match challenge now that full claim & doubling completed
          if (ch.category === 'matches') {
            this.rotateMatchChallenge(ch.id);
          } else {
            this.saveState();
            this.notify();
          }

          // Dispatch the second 1X amount so the user gets 2X total!
          const secondHalfReward: ChallengeReward = {
            budget: ch.reward.budget,
            coins: ch.reward.coins,
            devPoints: ch.reward.devPoints,
            energyPercent: ch.reward.energyPercent,
            reputation: ch.reward.reputation,
            label: `✨ مضاعفة 2X ناجحة: إيداع إضافي +${((ch.reward.budget || 0)).toLocaleString()} ج.م و +${ch.reward.coins || 0} كوينز! 🪙`,
          };

          onRewardApplied(secondHalfReward);
        },
        () => {
          if (!adRewardEarned && onFailure) {
            onFailure('لم يكتمل الإعلان الثاني؛ لم يتم احتساب المكافأة المضاعفة.');
          }
        },
        (err) => {
          if (onFailure) {
            onFailure('تعذر إتمام الإعلان الثاني للمضاعفة. مكافأتك الأساسية محفوظة بالفعل.');
          }
        }
      );

      return shown && adRewardEarned;
    }

    return false;
  }

  /**
   * Finalize and rotate a challenge if user chooses to skip 2nd ad
   */
  public finishWithoutDoubling(challengeId: string) {
    const ch = this.state.challenges.find(c => c.id === challengeId);
    if (!ch) return;
    ch.canDoubleWithSecondAd = false;
    if (ch.category === 'matches') {
      this.rotateMatchChallenge(ch.id);
    } else {
      this.saveState();
      this.notify();
    }
  }

  /**
   * Refresh all challenges to initial state
   */
  public refreshChallenges() {
    this.state.challenges = JSON.parse(JSON.stringify(INITIAL_ACTIVE_CHALLENGES));
    this.saveState();
    this.notify();
  }
}

export const challengesManager = ChallengesManager.getInstance();
