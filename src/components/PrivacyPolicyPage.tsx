import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  HardDrive,
  Cloud,
  Tv,
  Users,
  Smartphone,
  Baby,
  Trash2,
  Mail,
  CheckCircle2,
  Globe,
  ExternalLink,
  Info
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBackToGame?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBackToGame }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    // Update document title and meta description dynamically
    const originalTitle = document.title;
    document.title = lang === 'ar' 
      ? 'سياسة الخصوصية - لعبة أنت المدرب (Privacy Policy)' 
      : 'Privacy Policy - Anta El Modareb Game';
    window.scrollTo(0, 0);

    return () => {
      document.title = originalTitle;
    };
  }, [lang]);

  const handleReturn = () => {
    if (onBackToGame) {
      onBackToGame();
    } else {
      if (window.location.pathname.startsWith('/privacy-policy')) {
        window.history.pushState({}, '', '/');
        window.location.reload();
      } else {
        window.location.hash = '';
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Cairo',sans-serif] selection:bg-emerald-500 selection:text-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReturn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 active:scale-95 cursor-pointer"
              title={lang === 'ar' ? 'العودة إلى اللعبة' : 'Back to Game'}
            >
              <ArrowRight className={`w-4 h-4 ${lang === 'en' ? 'rotate-180' : ''}`} />
              <span>{lang === 'ar' ? 'العودة للعبة' : 'Back to Game'}</span>
            </button>
            <div className="flex items-center gap-2">
              <img
                src="/anta_elmodareb_logo.png"
                alt="شعار أنت المدرب"
                className="w-8 h-8 rounded-lg object-cover border border-amber-500/40 shadow"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {lang === 'ar' ? 'أنت المدرب' : 'Anta El Modareb'}
                </h1>
                <p className="text-[10px] text-slate-400">
                  {lang === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy & Data Protection Policy'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'ar' ? 'وثيقة خصوصية رسمية ومحدثة' : 'Official & Updated Privacy Document'}</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            {lang === 'ar' ? 'سياسة الخصوصية للعبة "أنت المدرب"' : 'Privacy Policy for "Anta El Modareb"'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'توضح هذه الوثيقة بوضوح وشفافية كيفية التعامل مع البيانات، والخدمات المستخدمة فعلياً داخل اللعبة (إعلانات AdMob، تخزين محلي، خدمات Firebase، وتحديات الأونلاين)، مع ضمان احترام خصوصيتك وحماية بياناتك بالكامل.'
              : 'This document explains transparently how user data is handled, the exact services implemented in the game (Google AdMob, local storage, Firebase, and live online challenges), ensuring full respect for your privacy.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400 font-mono">
            <span>{lang === 'ar' ? 'تاريخ السريان: سبتمبر 2026' : 'Effective Date: September 2026'}</span>
            <span>•</span>
            <span>{lang === 'ar' ? 'الإصدار: 2.5.0' : 'App Version: 2.5.0'}</span>
            <span>•</span>
            <span>{lang === 'ar' ? 'نظام التشغيل: أندرويد وويب' : 'Platform: Android & Web'}</span>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* 1. Introduction & Local-First Philosophy */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
            <HardDrive className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '1. طبيعة اللعبة والتخزين المحلي أولاً (Local-First Storage)' : '1. Game Nature & Local-First Storage'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar' ? (
              <>
                لعبة <strong>"أنت المدرب"</strong> هي لعبة محاكاة وإدارة كرة قدم مصرية. مبدأنا الأساسي في التصميم هو <strong>التخزين المحلي أولاً (Local-First)</strong>:
              </>
            ) : (
              <>
                <strong>"Anta El Modareb"</strong> is an Egyptian football club management simulation game. Our core architectural design is <strong>Local-First</strong>:
              </>
            )}
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-2 pr-2 leading-relaxed">
            {lang === 'ar' ? (
              <>
                <li>
                  <strong>حفظ مسيرة اللعبة:</strong> يتم تخزين كافة بيانات مسيرتك الرياضية (اسم المدرب المختار، الفريق، تشكيلة اللاعبين، التكتيكات، سجل المباريات، رصيد العملات الافتراضية، وتاريخ الانتقالات) محلياً داخل ذاكرة جهازك (Local Storage / Sandbox).
                </li>
                <li>
                  <strong>اللعب دون إنترنت:</strong> يمكنك لعب وتجربة وضع المسيرة كاملاً دون الحاجة لأي اتصال بالإنترنت ودون إرسال بياناتك لأي خادم خارجي.
                </li>
                <li>
                  <strong>النسخ الاحتياطي اليدوي:</strong> تتيح اللعبة تصدير ملف حفظ مشفر رقمياً بصيغة <code className="text-emerald-400 font-mono">.anta-save</code> وتخزينه على جهازك أو استيراده في أي وقت بدون أي وساطة من جهات خارجية.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Career Save Data:</strong> All your managerial career data (chosen manager name, club, squad, tactics, match history, virtual coins, and transfers) is saved locally in your device sandbox (Local Storage).
                </li>
                <li>
                  <strong>Offline Playable:</strong> You can play the full single-player career mode completely offline without transmitting any data to external servers.
                </li>
                <li>
                  <strong>Manual Backup:</strong> The game allows you to export a verifiable backup file (<code className="text-emerald-400 font-mono">.anta-save</code>) saved directly on your local device without third-party intervention.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* 2. Google AdMob Advertising */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-base">
            <Tv className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '2. شبكة الإعلانات: جوجل آد موب (Google AdMob)' : '2. Advertising Network: Google AdMob'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar' ? (
              <>
                للحفاظ على اللعبة مجانية ومتاحة لجميع اللاعبين، نستخدم خدمات إعلانات <strong>Google AdMob</strong> التابعة لشركة <strong>Google LLC</strong> عبر الحزمة الرسمية المعتمدة لنظام أندرويد (<code className="text-amber-400 font-mono">@capacitor-community/admob</code>).
              </>
            ) : (
              <>
                To keep the game free for all players, we display advertisements provided by <strong>Google AdMob</strong> (Google LLC) using the official Android SDK (<code className="text-amber-400 font-mono">@capacitor-community/admob</code>).
              </>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ar' ? 'إعلانات البانر (Banner)' : 'Banner Ads'}
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                {lang === 'ar' ? 'إعلانات شريطية ثابتة أسفل الشاشة يتم ضبطها تلقائياً لتناسب أبعاد شاشة هاتفك.' : 'Static bottom banners tailored to fit standard mobile screen dimensions.'}
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ar' ? 'الإعلانات البينية (Interstitial)' : 'Interstitial Ads'}
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                {lang === 'ar' ? 'تظهر في فترات الانتقال الطبيعية بعد انتهاء المباريات لتجنب مقاطعة اللعب.' : 'Displayed at natural transitions after matches conclude, avoiding sudden interruption.'}
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'ar' ? 'إعلانات المكافأة (Rewarded)' : 'Rewarded Ads'}
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                {lang === 'ar' ? 'إعلانات فيديو اختيارية يشاهدها اللاعب طواعية للحصول على مكافآت (مضاعفة إيراد المباراة، علاج لاعب مصاب).' : 'Voluntary opt-in video ads watched to earn in-game rewards (double match cash, speed up injury recovery).'}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
            <span className="font-bold text-white block">
              {lang === 'ar' ? 'البيانات التي تجمعها Google AdMob:' : 'Data Collected by Google AdMob:'}
            </span>
            <p className="leading-relaxed text-slate-400">
              {lang === 'ar'
                ? 'تقوم Google AdMob بجمع معرفات الأجهزة القياسية (مثل معرف الإعلانات الخاص بنظام أندرويد Google Advertising ID - GAID)، وعنوان IP التقريبي، وبيانات تشخيصية عن التفاعل مع الإعلانات لمنع الاحتيال وضمان جودة الإعلان. يمكنك دائماً إعادة تعيين أو إلغاء تخصيص معرف الإعلانات من خلال إعدادات هاتفك (الإعدادات -> Google -> الإعلانات -> إعادة ضبط أو حذف معرف الإعلانات).'
                : 'Google AdMob collects standard mobile device identifiers (such as Google Advertising ID - GAID), approximate IP address, and ad interaction diagnostic data to prevent fraud and deliver appropriate ads. You can reset or opt out of personalized ads at any time via Android device settings (Settings -> Google -> Ads).'}
            </p>
            <div className="pt-1">
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline font-semibold text-[11px]"
              >
                <span>{lang === 'ar' ? 'اطّلع على سياسة خصوصية إعلانات Google الرسمية' : 'Read Google Official Advertising Privacy Policy'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* 3. Google Firebase Services */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-sky-400 font-bold text-base">
            <Cloud className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '3. خدمات جوجل السحابية: فايربيس (Google Firebase)' : '3. Cloud Services: Google Firebase'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar' ? (
              <>
                تستخدم اللعبة خدمات <strong>Google Firebase</strong> المدارة لتوفير مزامنة اختيارية للمسيرة وميزات اللعب التنافسي:
              </>
            ) : (
              <>
                The game utilizes managed <strong>Google Firebase</strong> services for optional career backup and competitive gameplay:
              </>
            )}
          </p>

          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-2 pr-2 leading-relaxed">
            {lang === 'ar' ? (
              <>
                <li>
                  <strong>المصادقة وحسابات المستخدمين (Firebase Authentication):</strong> تسجيل الدخول اختياري تماماً (بريد إلكتروني وكلمة مرور مشفرة، أو حساب زائر مجهول Anonymous Guest). نستخدم معرف المستخدم الفريد (<code className="text-sky-400 font-mono">UID</code>) فقط لربط ملف حفظك السحابي بجهازك. لا نطلب ولا نملك صلاحية الوصول إلى كلمات مرورك.
                </li>
                <li>
                  <strong>قاعدة البيانات السحابية (Cloud Firestore):</strong> تُستخدم لحفظ النسخة الاحتياطية السحابية (<code className="text-sky-400 font-mono">user_career_saves</code>) بموافقتك لنقل مسيرتك عند تغيير هاتفك، ولعرض لوحة الشرف والتصنيف العام للمدربين (اسم المدرب واسم النادي وعدد البطولات فقط).
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Firebase Authentication:</strong> User sign-in is completely optional (Email/Password or Anonymous Guest). We only use a generated User ID (<code className="text-sky-400 font-mono">UID</code>) to bind your optional cloud save. We never have access to plain passwords.
                </li>
                <li>
                  <strong>Cloud Firestore:</strong> Used to store optional cloud career saves (<code className="text-sky-400 font-mono">user_career_saves</code>) allowing seamless recovery across devices, and public leaderboard entries (Manager display name, club name, trophy count).
                </li>
              </>
            )}
          </ul>
        </div>

        {/* 4. Live Online Friend Challenges */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-purple-400 font-bold text-base">
            <Users className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '4. تحديات الأونلاين المباشرة بين الأصدقاء (Live PvP Challenges)' : '4. Live PvP Challenges With Friends'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar' ? (
              <>
                توفر اللعبة ميزة خوض مباريات حية ومباشرة ضد أصدقائك عبر كود غرفة سري من 6 خانات. تتم هذه التحديات عبر بروتوكول البث اللحظي السحابي (Firestore Realtime Relay & WebSockets):
              </>
            ) : (
              <>
                The game features live multiplayer friendly matches via a 6-character room code using real-time synchronization:
              </>
            )}
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-1.5 pr-2 leading-relaxed">
            {lang === 'ar' ? (
              <>
                <li>
                  <strong>البيانات المنقولة أثناء المباراة:</strong> تشمل فقط بيانات التشكيل الافتراضي، خطة اللعب، أحداث المباراة (الأهداف، البطاقات، التبديلات)، وأمر طلب الإعادة (Rematch).
                </li>
                <li>
                  <strong>غرف مؤقتة:</strong> غرف التحدي مؤقتة ويتم تفريغها وإغلاقها تلقائياً بمجرد خروج اللاعبين وانتهاء المباراة.
                </li>
                <li>
                  <strong>لا توجد محادثات صوتية أو وسائط:</strong> لا نقوم بنقل أو تخزين أي صوتيات أو صور شخصية أو كاميرا أو ميكروفون.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>In-match Data:</strong> Only consists of virtual squad ratings, tactical formations, match simulation events (goals, cards, substitutions), and rematch requests.
                </li>
                <li>
                  <strong>Ephemeral Rooms:</strong> Challenge rooms are temporary and automatically closed once players leave or complete the match.
                </li>
                <li>
                  <strong>No Voice/Video:</strong> We do not record or transmit any voice chat, microphone, camera, or personal media.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* 5. Android Permissions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
            <Smartphone className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '5. أذونات نظام التشغيل أندرويد (Android Permissions)' : '5. Android Device Permissions'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar' ? (
              <>
                تطبيق أندرويد الخاص بلعبة <strong>"أنت المدرب"</strong> مصمم وفقاً لأعلى معايير الأمان الموصى بها من Google Play، ويطلب حصرياً الإذنَين الأساسيَّين فقط:
              </>
            ) : (
              <>
                The Android application for <strong>"Anta El Modareb"</strong> follows strict minimal-permission principles and requests only two standard permissions:
              </>
            )}
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <code className="text-xs font-mono font-bold text-emerald-300">android.permission.INTERNET</code>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'ضروري لتحميل إعلانات AdMob، وتزامن مباريات التحدي أونلاين، ومزامنة النسخ السحابية.' : 'Required for loading AdMob ads, live PvP friend matches, and cloud saves.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <code className="text-xs font-mono font-bold text-emerald-300">android.permission.ACCESS_NETWORK_STATE</code>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'ضروري لفحص حالة اتصال الهاتف بالإنترنت قبل إرسال الطلبات لمنع استهلاك البطارية أو تجميد الشاشة.' : 'Allows the app to check internet connectivity status before attempting network calls to save battery.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'اللعبة لا تطلب إذن الكاميرا، الميكروفون، الموقع الجغرافي الدقيق GPS، جهات الاتصال، الرسائل القصيرة، أو الملفات الشخصية.'
                : 'The game does NOT request camera, microphone, precise GPS location, contacts, SMS, or access to your personal device files.'}
            </span>
          </div>
        </div>

        {/* 6. Children's Privacy */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-pink-400 font-bold text-base">
            <Baby className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '6. خصوصية الأطفال والسياسات العائلية (Children\'s Privacy - COPPA)' : '6. Children\'s Privacy & Family Policy'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar'
              ? 'اللعبة مناسبة للجمهور العام وعشاق كرة القدم من مختلف الفئات العمرية. نحن لا نقوم عن قصد أو عمد بجمع أي بيانات تعريف شخصية من الأطفال دون سن 13 عاماً (أو السن المعمول به قانوناً في منطقتك). إذا كنت والداً أو وصياً ولاحظت أن طفلك قد قام بمشاركة أي بيانات سحابية دون موافقتك، يرجى مراسلتنا فوراً لحذفها بالكامل.'
              : 'Our game is intended for general audiences and football sports enthusiasts of all ages. We do not knowingly collect personal identifiable information from children under 13 (or under the age specified in your jurisdiction). If a parent or guardian becomes aware that data has been submitted without consent, please contact us immediately to remove it.'}
          </p>
        </div>

        {/* 7. Data Retention & User Rights */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
            <Trash2 className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '7. حذف البيانات وحقوق المستخدم (Data Deletion & Rights)' : '7. Data Deletion & User Rights'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar' ? (
              <>
                أنت صاحب السيطرة الكاملة على بياناتك داخل لعبة <strong>"أنت المدرب"</strong>:
              </>
            ) : (
              <>
                You retain complete control over your data within <strong>"Anta El Modareb"</strong>:
              </>
            )}
          </p>
          <ul className="list-disc list-inside text-xs sm:text-sm text-slate-300 space-y-2 pr-2 leading-relaxed">
            {lang === 'ar' ? (
              <>
                <li>
                  <strong>حذف البيانات المحلية فوراً:</strong> يمكنك في أي ثانية مسح كامل مسيرتك الرياضية وتصفير بيانات اللعبة من داخل التطبيق عبر خيار <em>"إعادة ضبط المسيرة"</em> في قائمة الإعدادات، أو بمسح بيانات التطبيق من إعدادات الأندرويد.
                </li>
                <li>
                  <strong>طلب حذف الحساب السحابي:</strong> إذا قمت بإنشاء حساب سحابي وترغب في حذف مسيرتك السحابية أو بريدك الإلكتروني من خوادم Firebase نهائياً، يمكنك إرسال طلب حذف بسيط إلى بريد المطور المذكور أدناه، وسيتم مسح كافة سجلاتك خلال 48 ساعة كحد أقصى.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Instant Local Deletion:</strong> You can wipe your local career progress at any time using the <em>"Reset Career"</em> option in Game Settings, or by clearing app storage in Android Settings.
                </li>
                <li>
                  <strong>Cloud Deletion Request:</strong> If you created an optional cloud account and wish to permanently erase your records from Firebase servers, email your request to the developer contact below, and all related cloud records will be purged within 48 hours.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* 8. Data Security */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
            <Lock className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '8. أمن وسلامة البيانات (Data Security)' : '8. Data Security'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar'
              ? 'تلتزم اللعبة باستخدام بروتوكولات التشفير القياسية العالمية (HTTPS / TLS 1.3 / WSS) لجميع الاتصالات السحابية مع خدمات Google Firebase وGoogle AdMob. كما يتم فحص سلامة ملفات الحفظ برمجياً للتحقق من عدم تعرضها للتلف أو التلاعب غير المصرح به.'
              : 'All network transmissions to Google Firebase and Google AdMob use industry-standard HTTPS / TLS 1.3 / WSS encryption. Additionally, local save files use digital integrity checksums to prevent corruption or unauthorized tampering.'}
          </p>
        </div>

        {/* 9. Contact Developer */}
        <div className="bg-slate-900/80 border border-emerald-900/50 rounded-2xl p-4 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2.5 text-emerald-300 font-bold text-base">
            <Mail className="w-5 h-5 shrink-0" />
            <h3>{lang === 'ar' ? '9. الاتصال بالمطور والمسؤول عن الخصوصية (Contact Developer)' : '9. Contact Developer & Privacy Officer'}</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {lang === 'ar'
              ? 'إذا كان لديك أي سؤال، أو استفسار بخصوص هذه السياسة، أو رغبة في طلب حذف أو مراجعة بياناتك، يمكنك التواصل مباشرة مع مطور اللعبة:'
              : 'If you have questions, feedback regarding this Privacy Policy, or wish to request data deletion, please contact the game developer directly:'}
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-400">{lang === 'ar' ? 'البريد الإلكتروني المعتمد للمطور:' : 'Official Developer Email:'}</span>
              <a
                href="mailto:omar.ibrahem211@gmail.com"
                className="font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors underline"
              >
                omar.ibrahem211@gmail.com
              </a>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">{lang === 'ar' ? 'اسم التطبيق / اللعبة:' : 'Application Name:'}</span>
              <span className="font-bold text-slate-200">أنت المدرب - Anta El Modareb</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">{lang === 'ar' ? 'الرابط العام المباشر لسياسة الخصوصية:' : 'Public Privacy Policy URL:'}</span>
              <span className="font-mono text-[11px] text-slate-300 select-all">
                https://ais-pre-oddg67ylxtk2h3cb3joxcv-830970277363.europe-west2.run.app/privacy-policy
              </span>
            </div>
          </div>
        </div>

        {/* Back to Game Button */}
        <div className="pt-4 text-center">
          <button
            onClick={handleReturn}
            className="w-full sm:w-auto min-w-[240px] px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-emerald-950/50 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <ArrowRight className={`w-4 h-4 ${lang === 'en' ? 'rotate-180' : ''}`} />
            <span>{lang === 'ar' ? 'العودة إلى شاشة اللعبة الرئيسية' : 'Return to Main Game Screen'}</span>
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 أنت المدرب (Anta El Modareb). جميع الحقوق محفوظة.</p>
        <p className="text-[11px] text-slate-600 mt-1">
          Google AdMob و Google Firebase هي علامات تجارية مسجلة لشركة Google LLC.
        </p>
      </footer>
    </div>
  );
};
