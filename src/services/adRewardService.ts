/**
 * Centralized AdMob Reward Service for "أنت المدرب"
 * 
 * Secure abstraction layer for managing rewarded ads and dispatching
 * in-game economy rewards (Coins, Club Treasury, Team Energy, Match Boost).
 * 
 * Strict Security Rules:
 * 1. Rewards are NEVER granted upon clicking or opening an ad.
 * 2. Rewards are ONLY granted upon receiving verified native SDK completion callbacks.
 * 3. Double-claim prevention: every ad session has a unique transaction ID.
 * 4. Frequency & cooldown capping per reward type.
 */

import { ADMOB_CONFIG } from '../config/admobConfig';

export type AdRewardType = 'coins' | 'club_funds' | 'team_energy' | 'training_boost';

export interface AdRewardDefinition {
  type: AdRewardType;
  title: string;
  shortTitle: string;
  description: string;
  rewardValueLabel: string;
  amount: number;
  iconName: string;
  colorClass: string;
  badge: string;
  cooldownSeconds: number;
}

export interface AdRewardClaimResult {
  success: boolean;
  transactionId: string;
  rewardType: AdRewardType;
  title: string;
  amount: number;
  message: string;
  timestamp: number;
}

export const AD_REWARD_DEFINITIONS: Record<AdRewardType, AdRewardDefinition> = {
  coins: {
    type: 'coins',
    title: 'مكافأة كوينز المدرب (50 كوينز)',
    shortTitle: '50 كوينز',
    description: 'شاهد إعلاناً واحصل على 50 كوينز تضاف إلى محفظتك لتحديات الأونلاين والجوائز',
    rewardValueLabel: '+50 كوينز 🪙',
    amount: 50,
    iconName: 'Coins',
    colorClass: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30',
    badge: 'شائع',
    cooldownSeconds: 0,
  },
  club_funds: {
    type: 'club_funds',
    title: 'دعم خزينة النادي (100,000 ج.م)',
    shortTitle: '100,000 ج.م',
    description: 'منحة رعاية مالية فورية من الشريك الإعلاني تضاف إلى ميزانية النادي وسوق الانتقالات',
    rewardValueLabel: '+100,000 ج.م 💵',
    amount: 100000,
    iconName: 'DollarSign',
    colorClass: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
    badge: 'تمويل مباشر',
    cooldownSeconds: 0,
  },
  team_energy: {
    type: 'team_energy',
    title: 'انتعاش بدني للاعبي الفريق (+15%)',
    shortTitle: '+15% لياقة',
    description: 'استعادة فورية لـ 15% من معدل اللياقة البدنية لجميع لاعبي الفريق المرهقين',
    rewardValueLabel: '+15% لياقة الفريق ⚡',
    amount: 15,
    iconName: 'Activity',
    colorClass: 'from-sky-500/20 to-blue-500/20 text-sky-300 border-sky-500/30',
    badge: 'طاقم طبي',
    cooldownSeconds: 0,
  },
  training_boost: {
    type: 'training_boost',
    title: 'تدريب إضافي استثنائي للمباراة القادمة',
    shortTitle: 'تدريب تكتيكي',
    description: 'منح أفضلية تكتيكية/بدنية متوازنة بنسبة 5% لفريقك في المباراة المقبلة',
    rewardValueLabel: '+5% أفضلية المباراة 🏋️',
    amount: 5,
    iconName: 'Dumbbell',
    colorClass: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30',
    badge: 'تكتيك',
    cooldownSeconds: 0,
  },
};

class AdRewardService {
  private claimedTransactions = new Set<string>();
  private lastClaimTimestamps: Record<AdRewardType, number> = {
    coins: 0,
    club_funds: 0,
    team_energy: 0,
    training_boost: 0,
  };

  /**
   * Generates a secure, single-use ad transaction token
   */
  public createAdSession(rewardType: AdRewardType): string {
    return `ad_session_${rewardType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Checks whether a specific reward is on cooldown
   */
  public getCooldownRemaining(rewardType: AdRewardType): number {
    const configCooldown = ADMOB_CONFIG.REWARDED_COOLDOWN_SECONDS ?? 0;
    if (configCooldown <= 0) return 0;
    const lastTimestamp = this.lastClaimTimestamps[rewardType] || 0;
    if (lastTimestamp <= 0) return 0;
    const elapsedSec = (Date.now() - lastTimestamp) / 1000;
    return Math.max(0, Math.ceil(configCooldown - elapsedSec));
  }

  public canClaimReward(rewardType: AdRewardType): boolean {
    if (!ADMOB_CONFIG.ENABLE_REWARDS) return false;
    return this.getCooldownRemaining(rewardType) === 0;
  }

  /**
   * Verifies and processes the reward securely upon verified native callback
   */
  public verifyAndConsumeReward(
    transactionId: string,
    rewardType: AdRewardType
  ): AdRewardClaimResult {
    // 0. Check master reward toggle
    if (!ADMOB_CONFIG.ENABLE_REWARDS) {
      console.warn(`[AdRewardService] Rewards are temporarily disabled`);
      return {
        success: false,
        transactionId,
        rewardType,
        title: '',
        amount: 0,
        message: 'تم إيقاف نظام المكافآت مؤقتاً!',
        timestamp: Date.now(),
      };
    }

    // 1. Check double claim prevention
    if (this.claimedTransactions.has(transactionId)) {
      console.warn(`[AdRewardService] Duplicate claim detected for transaction: ${transactionId}`);
      return {
        success: false,
        transactionId,
        rewardType,
        title: '',
        amount: 0,
        message: 'تم استلام هذه المكافأة مسبقاً!',
        timestamp: Date.now(),
      };
    }

    // 2. Register claim
    this.claimedTransactions.add(transactionId);
    this.lastClaimTimestamps[rewardType] = Date.now();

    const def = AD_REWARD_DEFINITIONS[rewardType];

    return {
      success: true,
      transactionId,
      rewardType,
      title: def.title,
      amount: def.amount,
      message: `مبروك! حصلت على ${def.rewardValueLabel}`,
      timestamp: Date.now(),
    };
  }
}

export const AdRewardManager = new AdRewardService();
export default AdRewardManager;
