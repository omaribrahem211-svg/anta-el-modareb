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
  enabled: true,
  maxDaily: 2, // Strict requirement: max 2 notifications per day
  soundEnabled: true,
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
        this.settings = { ...DEFAULT_SETTINGS, ...parsed, maxDaily: 2 };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
      maxDaily: 2, // Enforce 2 max
    };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[NotificationService] Failed to save settings to localStorage:', e);
    }
  }

  /**
   * Initializes the notification service, registers the Android notification channel,
   * and requests permissions if needed.
   */
  public async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (Capacitor.isNativePlatform()) {
        // Create an official Android Notification Channel with sound & vibration
        await LocalNotifications.createChannel({
          id: CHANNEL_ID,
          name: 'إشعارات النادي والبطولات الحماسية',
          description: 'تنبيهات وأخبار النادي، عروض الانتقالات، وأجواء المباريات الساخنة',
          importance: 4, // High importance (heads-up banner and sound)
          visibility: 1,
          sound: 'beep.wav',
          vibration: true,
          lights: true,
          lightColor: '#059669',
        }).catch(err => {
          console.warn('[NotificationService] Android createChannel notice:', err);
        });

        // Request permission on native platform
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'prompt' || permStatus.display === 'prompt-with-rationale') {
          await LocalNotifications.requestPermissions().catch(() => {});
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        // Web fallback
        if (Notification.permission === 'default') {
          // Can be prompted by user action
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.warn('[NotificationService] Initialization notice:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Request notification permission explicitly (triggered by user interaction if needed)
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
      return false;
    } catch (error) {
      console.warn('[NotificationService] Request permission error:', error);
      return false;
    }
  }

  /**
   * Schedules at most 2 motivational, personalized notifications per day at distinct hours.
   * Slot 1: Afternoon (~14:00)
   * Slot 2: Evening (~20:30)
   */
  public async scheduleDailyMotivationalNotifications(context: NotificationGameContext): Promise<boolean> {
    this.loadSettings();
    if (!this.settings.enabled) {
      await this.cancelAllScheduledNotifications();
      return false;
    }

    try {
      await this.init();

      if (Capacitor.isNativePlatform()) {
        // Clear any old pending notifications to prevent stacking
        await this.cancelAllScheduledNotifications();

        const now = new Date();
        const scheduledItems: any[] = [];

        // Calculate Slot 1 (Afternoon around 14:00 - 2:00 PM)
        const slot1Date = new Date();
        slot1Date.setHours(14, 0, 0, 0);
        if (slot1Date.getTime() <= now.getTime()) {
          // If 14:00 already passed today, schedule for tomorrow 14:00
          slot1Date.setDate(slot1Date.getDate() + 1);
        }

        // Calculate Slot 2 (Evening around 20:30 - 8:30 PM)
        const slot2Date = new Date();
        slot2Date.setHours(20, 30, 0, 0);
        if (slot2Date.getTime() <= now.getTime()) {
          // If 20:30 already passed today, schedule for tomorrow 20:30
          slot2Date.setDate(slot2Date.getDate() + 1);
        }

        // Generate 2 distinct, varied notification messages
        const notif1 = this.generateDynamicMessage(context, 'afternoon', []);
        const notif2 = this.generateDynamicMessage(context, 'evening', [notif1.type]);

        scheduledItems.push({
          id: 101,
          title: notif1.title,
          body: notif1.body,
          schedule: { at: slot1Date, allowWhileIdle: true },
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#059669',
          actionTypeId: '',
          extra: { type: notif1.type, slot: 'afternoon' },
        });

        scheduledItems.push({
          id: 102,
          title: notif2.title,
          body: notif2.body,
          schedule: { at: slot2Date, allowWhileIdle: true },
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#059669',
          actionTypeId: '',
          extra: { type: notif2.type, slot: 'evening' },
        });

        await LocalNotifications.schedule({ notifications: scheduledItems });
        console.log('[NotificationService] Successfully scheduled 2 daily notifications at distinct times:', {
          slot1: slot1Date.toLocaleTimeString(),
          slot2: slot2Date.toLocaleTimeString(),
        });
        return true;
      } else {
        // On Web, store the scheduled intents in localStorage
        const now = new Date();
        const slot1Date = new Date();
        slot1Date.setHours(14, 0, 0, 0);
        if (slot1Date.getTime() <= now.getTime()) slot1Date.setDate(slot1Date.getDate() + 1);

        const slot2Date = new Date();
        slot2Date.setHours(20, 30, 0, 0);
        if (slot2Date.getTime() <= now.getTime()) slot2Date.setDate(slot2Date.getDate() + 1);

        const notif1 = this.generateDynamicMessage(context, 'afternoon', []);
        const notif2 = this.generateDynamicMessage(context, 'evening', [notif1.type]);

        localStorage.setItem('anta_el_modareb_scheduled_notifs', JSON.stringify([
          { id: 101, title: notif1.title, body: notif1.body, at: slot1Date.toISOString(), type: notif1.type },
          { id: 102, title: notif2.title, body: notif2.body, at: slot2Date.toISOString(), type: notif2.type },
        ]));
        return true;
      }
    } catch (error) {
      console.warn('[NotificationService] scheduleDailyMotivationalNotifications error:', error);
      return false;
    }
  }

  /**
   * Cancel all previously scheduled local notifications
   */
  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map(n => ({ id: n.id })),
          });
        }
      } else {
        localStorage.removeItem('anta_el_modareb_scheduled_notifs');
      }
    } catch (e) {
      console.warn('[NotificationService] Cancel notifications warning:', e);
    }
  }

  /**
   * Instantly fire a test notification so the user/admin can preview what it looks like.
   */
  public async sendTestNotification(context?: NotificationGameContext, forcedType?: string): Promise<{ success: boolean; title: string; body: string }> {
    try {
      await this.init();
      const message = this.generateDynamicMessage(context || {}, 'test', [], forcedType);

      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 9000) + 1000,
              title: message.title,
              body: message.body,
              schedule: { at: new Date(Date.now() + 1000) }, // in 1 second
              channelId: CHANNEL_ID,
              smallIcon: 'ic_stat_icon_config_sample',
              iconColor: '#059669',
            },
          ],
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(message.title, {
            body: message.body,
            icon: '/favicon.ico',
          });
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification(message.title, {
              body: message.body,
              icon: '/favicon.ico',
            });
          }
        }
      }

      return { success: true, title: message.title, body: message.body };
    } catch (error) {
      console.error('[NotificationService] sendTestNotification failed:', error);
      return { success: false, title: 'خطأ', body: 'تعذر إرسال الإشعار التجريبي' };
    }
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
