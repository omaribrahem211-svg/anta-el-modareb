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
  /** names of the next opponent's best players (for rival "statements") */
  opponentPlayers?: string[];
  /** true when today's daily login reward was already taken (so a "reward waiting" push today would be false) */
  rewardClaimedToday?: boolean;
  streak?: number;
}

const SETTINGS_KEY = 'anta_el_modareb_notifications_settings';
const ASKED_KEY = 'anta_notif_perm_asked_v1';
const RECENT_KEY = 'anta_notif_recent_types_v1';
const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  maxDaily: 2,
  soundEnabled: true,
};

const CHANNEL_ID = 'anta_el_modareb_daily_channel_v2';
// our own id range, so we never touch notifications that belong to something else
const ID_BASE = 3000;
const ID_MAX = 3099;
const LEGACY_IDS = [101, 102];
// at most 2 per day, in the evening hours only (never at night)
const SLOTS: Array<[number, number]> = [[17, 5], [21, 0]];
const DAYS_AHEAD = 3;
// an opponent-specific / "today" message is only trusted for the first notifications (state changes after every match)
const FRESH_COUNT = 2;
const OPPONENT_TYPES = ['rival_camp', 'rival_preparation', 'press_conference_feud'];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

class NotificationService {
  private isInitialized = false;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private scheduling = false;
  private again = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // older builds forced enabled:false / maxDaily:0 into storage: ignore those stale values
        this.settings = { ...DEFAULT_SETTINGS, ...parsed, maxDaily: 2, enabled: parsed.enabled === false && parsed.userChoice === true ? false : true };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings, maxDaily: 2 };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...this.settings, userChoice: true }));
    } catch (e) {
      console.warn('[NotificationService] Failed to save settings to localStorage:', e);
    }
  }

  private isNative(): boolean {
    try { return Capacitor.isNativePlatform(); } catch { return false; }
  }

  /** 'granted' | 'denied' | 'prompt' | 'unsupported' */
  public async getPermissionState(): Promise<string> {
    if (!this.isNative()) return 'unsupported';
    try {
      const r = await LocalNotifications.checkPermissions();
      const d = r.display as string;
      return d === 'granted' ? 'granted' : d === 'denied' ? 'denied' : 'prompt';
    } catch { return 'unsupported'; }
  }

  public hasAskedPermission(): boolean {
    try { return localStorage.getItem(ASKED_KEY) === '1'; } catch { return true; }
  }

  public markAsked(): void {
    try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* */ }
  }

  /** Creates the Android channel. NEVER asks for permission (that is done once, from a friendly in-app prompt). */
  public async init(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (!this.isNative()) return false;
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'أخبار وأجواء النادي',
        description: 'أخبار حماسية قبل المباريات وتذكير بالمكافآت',
        importance: 3, // default: sound, no pop-over, less intrusive
        visibility: 1,
        vibration: false,
      });
      this.isInitialized = true;
      return true;
    } catch (e) {
      console.warn('[NotificationService] createChannel failed', e);
      return false;
    }
  }

  /**
   * Asks for the notification permission (POST_NOTIFICATIONS on Android 13+). Only ever the notification permission:
   * we never request, and the manifest does not declare, the exact-alarm / "alarms & reminders" permission.
   */
  public async requestPermissions(): Promise<boolean> {
    try { localStorage.setItem(ASKED_KEY, '1'); } catch { /* */ }
    if (!this.isNative()) return false;
    try {
      const r = await LocalNotifications.requestPermissions();
      return r.display === 'granted';
    } catch (e) {
      console.warn('[NotificationService] requestPermissions failed', e);
      return false;
    }
  }

  private recentTypes(): string[] {
    try { const a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(a) ? a.slice(0, 8) : []; } catch { return []; }
  }

  private rememberTypes(types: string[]): void {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([...types, ...this.recentTypes()].slice(0, 8))); } catch { /* */ }
  }

  /**
   * Plans the next days (max 2 per day, 17:xx and 21:xx local time) and schedules them as plain (non-exact) alarms.
   * Re-run whenever the app goes to the background so the texts always reflect the latest fixture/opponent.
   * Safe to call often: calls are serialised and every failure is swallowed (a notification problem must never break the game).
   */
  public async scheduleDailyMotivationalNotifications(context?: NotificationGameContext): Promise<boolean> {
    if (this.scheduling) { this.again = true; return false; }
    this.scheduling = true;
    try {
      this.loadSettings();
      if (!this.isNative() || !context?.userClub) return false;
      if (!this.settings.enabled) { await this.cancelAllScheduledNotifications(); return false; }
      if ((await this.getPermissionState()) !== 'granted') return false;
      await this.init();
      await this.cancelAllScheduledNotifications();

      const now = Date.now();
      const plan: Array<{ at: Date; day: number }> = [];
      for (let d = 0; d <= DAYS_AHEAD; d++) {
        for (const [h, m] of SLOTS) {
          const at = new Date();
          at.setDate(at.getDate() + d);
          const jitter = (hash(`${at.getFullYear()}-${at.getMonth()}-${at.getDate()}-${h}`) % 50) - 10; // -10..+39 min
          at.setHours(h, m + jitter, 0, 0);
          // never within 2 hours of now (the player is probably playing right now) and never in the past
          if (at.getTime() - now < 2 * 3600 * 1000) continue;
          plan.push({ at, day: d });
        }
      }
      plan.sort((x, y) => x.at.getTime() - y.at.getTime());
      const items = plan.slice(0, 7);

      const used: string[] = [...this.recentTypes()];
      const batchTypes: string[] = [];
      const texts = new Set<string>();
      const notifications = items.map((it, idx) => {
        const fresh = idx < FRESH_COUNT;
        let exclude = [...used.slice(0, 4), ...batchTypes.slice(-3)];
        if (!fresh) exclude = [...exclude, ...OPPONENT_TYPES];
        if (it.day === 0 && context.rewardClaimedToday) exclude.push('daily_reward');
        // the very next push is always about the real next opponent (the most exciting one)
        let msg = this.generateDynamicMessage(context, idx % 2 === 0 ? 'afternoon' : 'evening', exclude, idx === 0 && context.nextOpponentName ? 'rival_camp' : undefined);
        for (let t = 0; t < 4 && texts.has(msg.body); t++) {
          msg = this.generateDynamicMessage(context, 'evening', [...exclude, msg.type]);
        }
        texts.add(msg.body);
        batchTypes.push(msg.type);
        return {
          id: ID_BASE + idx,
          title: msg.title,
          body: msg.body,
          schedule: { at: it.at, allowWhileIdle: false },
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#059669',
          extra: { type: msg.type },
        };
      });
      if (!notifications.length) return false;
      await LocalNotifications.schedule({ notifications });
      this.rememberTypes(batchTypes.slice(0, 4));
      return true;
    } catch (e) {
      console.warn('[NotificationService] schedule failed (ignored)', e);
      return false;
    } finally {
      this.scheduling = false;
      if (this.again) { this.again = false; /* the latest state wins on the next trigger */ }
    }
  }

  /** Cancels only OUR pending notifications. */
  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      if (this.isNative()) {
        try {
          const pending = await LocalNotifications.getPending();
          const mine = (pending?.notifications || []).filter(n => (n.id >= ID_BASE && n.id <= ID_MAX) || LEGACY_IDS.includes(n.id));
          if (mine.length) await LocalNotifications.cancel({ notifications: mine.map(n => ({ id: n.id })) });
        } catch { /* */ }
      }
      localStorage.removeItem('anta_el_modareb_scheduled_notifs');
    } catch (e) {
      console.warn('[NotificationService] Cancel notifications warning:', e);
    }
  }

  /** Shows one sample push in 5 seconds (for the settings screen). */
  public async sendTestNotification(context?: NotificationGameContext, forcedType?: string): Promise<{ success: boolean; title: string; body: string }> {
    try {
      if (!this.isNative() || (await this.getPermissionState()) !== 'granted') return { success: false, title: '', body: '' };
      await this.init();
      const msg = this.generateDynamicMessage(context || {}, 'test', [], forcedType);
      await LocalNotifications.schedule({
        notifications: [{
          id: ID_MAX, title: msg.title, body: msg.body, channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_icon_config_sample', iconColor: '#059669',
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: false },
        }],
      });
      return { success: true, title: msg.title, body: msg.body };
    } catch {
      return { success: false, title: '', body: '' };
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
    const hasOpponent = !!context.nextOpponentName;
    const streak = context.streak || 0;

    // Categories list
    const availableCategories: Array<{
      type: string;
      weight: number;
      generator: () => { title: string; body: string };
    }> = [
      // 0. Rival camp / trash talk about the REAL next opponent (generic: no invented quotes attributed to named people)
      {
        type: 'rival_camp',
        weight: 16,
        generator: () => {
          const options = [
            { title: `🔒 معسكر مغلق في ${opponent} عشانك!`, body: `الإدارة قفلت الباب على اللاعبين ومنعت الزيارات، وهدفهم الوحيد يكسبوا ${clubName}. جهّز ردك يا كوتش 💪` },
            { title: `😤 ${opponent} بيتحداك قبل المواجهة`, body: `أحد لاعبي ${opponent} قال إن ماتش ${clubName} هو فرصتهم لإثبات نفسهم قدام الجمهور. ردّك هيكون في الملعب 🔥` },
            { title: `📣 جماهير ${opponent} بتجهّز استقبال خاص!`, body: `الألتراس بيجهّز تيفو وهتافات لماتش ${clubName}. الأجواء هتولّع.. اختار تشكيلتك صح ⚽` },
            { title: `🧠 مدرب ${opponent} قاعد يحلّل لعبك!`, body: `سمعنا إن جهاز ${opponent} الفني قضى الليل يدرس نقاط قوتك. فاجئهم بتكتيك مختلف 📋` },
            { title: `🏃 ${opponent} رفع التدريبات استعداداً لك`, body: `التمارين أصبحت مضاعفة هناك، والهدف نقاط ماتش ${clubName}. إنت جاهز؟ ⚡` },
            { title: `🥁 الشارع الرياضي منتظر ${clubName} و${opponent}`, body: `المحللين بيقولوا الماتش ده ممكن يغيّر ترتيب الجدول. متسيبش النقاط تروح 🏆` },
            { title: `🕵️ ${opponent} بيراقب تدريباتك!`, body: `الكلام إن كشّافين من ${opponent} حضروا مرانك. غيّر خطة اللعب قبل الماتش 😏` },
          ];
          return options[Math.floor(Math.random() * options.length)];
        },
      },

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
              title: `🚨 أجواء ساخنة في تدريب ${clubName}!`,
              body: `الحماس في المران وصل لدرجة احتكاكات قوية بين اللاعبين على أماكنهم في التشكيل. مرّ على الفريق وظبّط الأمور ⚠️`,
            },
            {
              title: `💥 تنافس مشتعل في المران!`,
              body: `كل لاعب في ${clubName} بيقاتل عشان مكانه الأساسي. ألقِ نظرة على التشكيل واختار الأجدر ⚡`,
            },
            {
              title: `⚠️ كلمة منك قبل المباراة!`,
              body: `الفريق محتاج كلمة تحفيز منك قبل مباراة الجولة. جلسة مع اللاعبين ممكن تفرق في المعنويات 🗣️`,
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
              title: `💰 أندية بتراقب (${player1})!`,
              body: `الصحافة بتتكلم عن اهتمام أندية بنجمك (${player1}). فكّر في تجديد عقده قبل ما حد يخطفه ✍️`,
            },
            {
              title: `🤝 وقت مراجعة العقود!`,
              body: `راجع عقود نجوم ${clubName} قبل ما تنتهي، ولا تسيب لاعب مهم يرحل مجاناً ⏳`,
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
              title: `💼 الإدارة بتتابع نتايجك!`,
              body: `مجلس إدارة ${clubName} مستني منك نتيجة قوية الجولة الجاية. كل فوز بيرفع ثقتهم فيك ⚽`,
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
              title: `🩺 الجهاز الطبي في ${clubName} يذكّرك`,
              body: `راجع لياقة اللاعبين قبل المباراة الجاية، لاعب مرهق ممكن يخسّرك النقاط 🏃`,
            },
            {
              title: `⚡ اللياقة هي السر!`,
              body: `الفرق اللي بتتحكم في الإجهاد بتكسب أكتر. اعمل تدوير للاعبين قبل الجولة 🔄`,
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
              title: `🔥 ${streak > 1 ? `سلسلتك ${streak} أيام!` : 'ابدأ سلسلة الحضور!'}`,
              body: `ادخل النهارده واستلم مكافأتك قبل ما السلسلة تتقطع، وكل يوم بيزيد الجايزة 🎁`,
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
    let candidates = availableCategories.filter(c => !excludeTypes.includes(c.type) && (hasOpponent || !OPPONENT_TYPES.includes(c.type)));
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
