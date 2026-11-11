import { LocalNotifications, ScheduleOptions, PendingLocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Club, Fixture, ManagerProfile, Player } from '../types/game';

export interface NotificationSettings {
  enabled: boolean;
  maxDaily: number;
  soundEnabled: boolean;
}

export interface NotificationGameContext {
  userClub?: Club | null;
  manager?: ManagerProfile | null;
  teams?: Club[];
  fixtures?: Fixture[];
  currentRound?: number;
  daysUntilNextMatch?: number;
  nextOpponentName?: string;
}

const SETTINGS_KEY = 'anta_el_modareb_notifications_settings';
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: false,
  maxDaily: 0,
  soundEnabled: false,
};

const CHANNEL_ID = 'anta_el_modareb_daily_channel';

class NotificationService {
  private isInitialized = false;
  private settings: NotificationSettings = DEFAULT_SETTINGS;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed, enabled: false, maxDaily: 0 };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings, enabled: false };
  }

  public saveSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
      enabled: false,
      maxDaily: 0,
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[NotificationService] Failed to save settings to localStorage:', e);
    }
  }

  /**
   * Initializes the notification service.
   * NOTE: Device notification and alarm permissions are completely disabled.
   * Cancels any previously scheduled legacy alarms/notifications on device.
   */
  public async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.isInitialized = true;
      await this.cancelAllScheduledNotifications();
      return true;
    } catch {
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Device permission request completely disabled:
   * Never requests notification permissions or alarm/reminder permissions from the user's device.
   */
  public async requestPermissions(): Promise<boolean> {
    return false;
  }

  /**
   * Notification scheduling completely disabled:
   * Never registers or schedules alarms on the user's device.
   */
  public async scheduleDailyMotivationalNotifications(_context?: NotificationGameContext): Promise<boolean> {
    await this.cancelAllScheduledNotifications();
    return false;
  }

  /**
   * Cancel and clear all previously scheduled local notifications/alarms
   */
  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          const pending = await LocalNotifications.getPending();
          if (pending && pending.notifications && pending.notifications.length > 0) {
            await LocalNotifications.cancel({
              notifications: pending.notifications.map(n => ({ id: n.id })),
            });
          }
        } catch (_) {}
      }
      localStorage.removeItem('anta_el_modareb_scheduled_notifs');
    } catch (e) {
      console.warn('[NotificationService] Cancel notifications warning:', e);
    }
  }

  /**
   * Test notification is disabled
   */
  public async sendTestNotification(_context?: NotificationGameContext, _forcedType?: string): Promise<{ success: boolean; title: string; body: string }> {
    return { success: false, title: '', body: '' };
  }

  /**
   * Highly varied, immersive message generator using real club and squad data
   */
  public generateDynamicMessage(
    context: NotificationGameContext,
    slot: 'afternoon' | 'evening' | 'test',
    excludeTypes: string[] = [],
    forcedType?: string
  ): { title: string; body: string; type: string } {
    const clubName = context.userClub?.name || 'فريقك';
    const players = (context.userClub?.players || []).filter(p => p && p.name);
    
    // Pick two random distinct players from squad if available
    const player1 = players.length > 0 ? players[Math.floor(Math.random() * players.length)].name : 'هداف الفريق';
    const player2 = players.length > 1 
      ? players.filter(p => p.name !== player1)[Math.floor(Math.random() * (players.length - 1))]?.name || 'صانع الألعاب'
      : 'قائد الفريق';
    
    // Pick next opponent name
    const opponent = context.nextOpponentName || 'المنافس القادم';

    // Categories list
    const availableCategories: Array<{
      type: string;
      weight: number;
      generator: () => { title: string; body: string };
    }> = [
      // 1. Rivals / Opponent preparation hype
      {
        type: 'rival_preparation',
        weight: 10,
        generator: () => {
          const options = [
            {
              title: `⚔️ استنفار في معسكر (${opponent}) لمواجهتكم!`,
              body: `مدرب (${opponent}) يرفع حالة الطوارئ ويجهز خطة دفاعية مكثفة لإيقاف نجوم ${clubName}. هل خطتك التكتيكية جاهزة لحسم اللقاء؟ ⚽🔥`,
            },
            {
              title: `🏟️ مواجهة نارية قادمة أمام (${opponent})!`,
              body: `جماهير ${clubName} تطالبك بالنقاط الثلاث وإشعال حماس اللاعبين في القمة القادمة! ادخل الآن واضبط التشكيلة الأساسية. 📋`,
            },
            {
              title: `🎙️ تصريحات ساخنة من مدرب (${opponent})!`,
              body: `المنافس يتحدى فريقك في المؤتمر الصحفي! اللاعبون بانتظار توجيهاتك لإثبات تفوق ${clubName} في الملعب. 💥`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 2. Training ground drama / clash (خناقة أو مشادة في التمرين)
      {
        type: 'training_drama',
        weight: 9,
        generator: () => {
          const options = [
            {
              title: `🚨 مشادة ساخنة في تدريب ${clubName}!`,
              body: `توتر واشتباك كلامي حاد بين (${player1}) و(${player2}) في المران الأخير! الفريق بحاجة لتدخلك الفوري لإعادة الانضباط وغرفة الملابس. ⚠️`,
            },
            {
              title: `💥 تداخل قوي وتنافس مشتعل في المران!`,
              body: `روح قتالية عالية واحتكاك حماسي بين (${player1}) و(${player2}) لحجز مكان أساسي في تشكيل ${clubName}. ألقِ نظرة على جاهزية التشكيل! ⚡`,
            },
            {
              title: `⚠️ توتر في المعسكر قبل موعد المباراة!`,
              body: `مدرب الأحمال يبلغك بضرورة الحديث مع (${player1}) لتهدئة الأجواء وإشعال تركيز المجموعة لمباراة الجولة. 🗣️`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 3. Transfer Bids & Market Rumors (عروض انتقال للاعبين)
      {
        type: 'transfer_rumors',
        weight: 8,
        generator: () => {
          const options = [
            {
              title: `💰 عرض مالي ضخم لشراء (${player1})!`,
              body: `نادٍ منافس تقدم بعرض رسمي لضم نجمك (${player1})! افتح اللعبة الآن وحدد موقفك: هل ترفض العرض أم تبيعه بمبلغ قياسي؟ ✍️`,
            },
            {
              title: `🤝 وكيل أعمال (${player1}) يطلب جلسة عاجلة!`,
              body: `وكيل اللاعب يطلب تعديل الراتب وتمديد العقد بعد تألقه اللافت مع ${clubName}. لا تدع أندية أخرى تخطفه! ⏳`,
            },
            {
              title: `🌍 فرصة ذهبية في سوق الانتقالات!`,
              body: `كشافو ${clubName} رصدوا لاعباً متاحاً بسعر مميز يناسب خطتك.. استغل الميزانية قبل خطفه من المنافسين! 🔍`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 4. Board of Directors & President Demands (مجلس الإدارة ورئيس النادي)
      {
        type: 'board_pressure',
        weight: 7,
        generator: () => {
          const options = [
            {
              title: `📋 رسالة خاصة من رئيس نادي ${clubName}!`,
              body: `مجلس الإدارة يعقد اجتماعاً مهماً ويطالبك بالنقاط الثلاث في اللقاء المقبل لضمان تحقيق هدف الموسم. هل ستلبي طموحاتهم؟ 🏆`,
            },
            {
              title: `💵 مكافآت مضاعفة بانتظار الفريق!`,
              body: `رئيس النادي يعد بصرف مكافأة استثنائية للاعبين في حال تحقيق الفوز القادم! شحذ همم لاعبيك وتولّ القيادة ⚽`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 5. Medical recovery & Star Player return (تعافي النجوم المصابين)
      {
        type: 'medical_update',
        weight: 7,
        generator: () => {
          const options = [
            {
              title: `🩺 بشرى سارة من طبيب ${clubName}!`,
              body: `الجهاز الطبي يؤكد تعافي اللاعب (${player1}) بنسبة 100% وجاهزيته الفنية للعودة إلى المستطيل الأخضر! 🌟`,
            },
            {
              title: `⚡ فحص اللياقة يبتسم للفريق!`,
              body: `اللاعب (${player1}) يجتاز الاختبار الطبي بنجاح ويكون جاهزاً للمشاركة أساسياً أمام المنافس! 🏃‍♂️`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 6. Daily Login Gift & Office Rewards (المكافآت اليومية)
      {
        type: 'daily_reward',
        weight: 8,
        generator: () => {
          const options = [
            {
              title: `🎁 مكافأتك اليومية في انتظارك يا كوتش!`,
              body: `مكتبك التدريبي جاهز بجرعة كوينز ونقاط تطوير مجانية لدعم صفقاتك وتطوير منشآت ${clubName}. استلمها الآن! ⭐`,
            },
            {
              title: `🌟 دعم النادي اليومي متاح الآن!`,
              body: `لا تدع سلسلة الحضور اليومي تنقطع! احصل على مكافأة اليوم وارفع معنويات لاعبيك قبل المباريات 🎁`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 7. Tactical & Lineup Readiness
      {
        type: 'tactical_readiness',
        weight: 6,
        generator: () => {
          const options = [
            {
              title: `🎯 جاهزية التشكيلة لخوض الجولة!`,
              body: `اللاعبون في انتظار المحاضرة الفنية وإعلان التشكيل الأساسي لـ ${clubName}. ادخل ورتب خطة الانتصار 📋`,
            },
            {
              title: `🏃‍♂️ الحصة التدريبية جاهزة للانطلاق!`,
              body: `نجوم ${clubName} جاهزون للحصة التدريبية اليومية لتحسين اللياقة ومعدل التطور قبل موعد المباراة القادمة! ⚽`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 8. Ultras & Fan Passion (جماهير الفريق والألتراس وتيفو المباراة)
      {
        type: 'fan_ultras',
        weight: 8,
        generator: () => {
          const options = [
            {
              title: `🔥 جماهير ${clubName} تشعل الأجواء قبل القمة!`,
              body: `الألتراس يجهز تيفو تاريخياً في المدرجات ويوجه رسالة خاصة لك: "لا بديل عن الفوز وإسعاد المدرج"! ادخل واشحن همم لاعبيك 🥁`,
            },
            {
              title: `📢 هتافات حماسية في محيط مقر ${clubName}!`,
              body: `حشود جماهيرية غفيرة تحتشد لمساندة الفريق والمطالبة باقتناص النقاط الثلاث وتقديم أداء بطولي! 🏟️`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 9. Youth Academy & Wonderkid Scouted (اكتشاف موهبة صاعدة)
      {
        type: 'scouting_wonderkid',
        weight: 7,
        generator: () => {
          const options = [
            {
              title: `💎 موهبة ذهبية جديدة في قطاع ناشئي ${clubName}!`,
              body: `رئيس قطاع الناشئين يبلغك بتألق لاعب شاب خارق في تدريبات الشباب وينصحك بتصعيده للفريق الأول قبل أن تخطفه الأعين! ⭐`,
            },
            {
              title: `🌟 تقرير كشافي ${clubName} يثير الإعجاب!`,
              body: `تقرير فني استثنائي وصل لمكتبك عن لاعب صاعد يمتلك مهارات فريدة يمكن تطويره ليصبح نجم المستقبل في فريقك! 🔍`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 10. Press Conference Feud (المؤتمر الصحفي والمناوشات الإعلامية)
      {
        type: 'press_conference_feud',
        weight: 8,
        generator: () => {
          const options = [
            {
              title: `🎙️ حرب تصريحات مشتعلة قبل لقاء (${opponent})!`,
              body: `مدرب (${opponent}) يقلل من قوة خط هجومك في المؤتمر الصحفي! هل سترد عليه بتكتيك هجومي ساحق على أرض الملعب؟ 💥`,
            },
            {
              title: `📰 عناوين الصحف الرياضية تتحدث عن (${player1})!`,
              body: `الإعلام الرياضي يصف نجمك (${player1}) بمفتاح الفوز الحاسم لـ ${clubName}. تفقد حالته النفسية وجاهزيته الآن! 🗞️`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 11. Training Wonder Goal & Spectacular Form (هدف خيالي في المران)
      {
        type: 'training_wonder_goal',
        weight: 7,
        generator: () => {
          const options = [
            {
              title: `🚀 قذيفة صاروخية من (${player1}) في التمرين!`,
              body: `تصفيق حار من الجهاز الفني بعد تسجيل (${player1}) هدفاً إعجازياً من منتصف الملعب في تدريبات اليوم! الروح المعنوية في السماء ⚽🔥`,
            },
            {
              title: `🧤 تألق حارس المرمى وتصديات خرافية!`,
              body: `حارس مرمى ${clubName} يقدم فاصلاً من التصديات المستحيلة في تقسيمة اليوم ويبعث برسالة طمأنينة لدفاع الفريق! 🛡️`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

      // 12. Locker Room Motivation Speech (خطاب غرفة الملابس)
      {
        type: 'locker_room_speech',
        weight: 7,
        generator: () => {
          const options = [
            {
              title: `👑 نجوم ${clubName} يتعاهدون على حصد الفوز!`,
              body: `(${player2}) يقود جلسة خاصة بين اللاعبين في غرفة الملابس لغلق صفحة الإخفاق والتركيز التام لتحقيق الانتصارات القادمة! 🤝`,
            },
            {
              title: `📊 المحاضرة الفنية التكتيكية جاهزة للعرض!`,
              body: `مساعد المدرب ينتهي من تحليل نقاط الضعف في دفاع الخصم (${opponent}). ادخل لمراجعة التعليمات قبل المباراة 📋`,
            },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },
    ];

    // Filter out excluded types if possible
    let candidates = availableCategories.filter(c => !excludeTypes.includes(c.type));
    if (forcedType) {
      candidates = availableCategories.filter(c => c.type === forcedType);
    }
    if (candidates.length === 0) {
      candidates = availableCategories;
    }

    // Weighted random selection
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = candidates[0];

    for (const c of candidates) {
      if (rand < c.weight) {
        selected = c;
        break;
      }
      rand -= c.weight;
    }

    const content = selected.generator();
    return {
      title: content.title,
      body: content.body,
      type: selected.type,
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;
