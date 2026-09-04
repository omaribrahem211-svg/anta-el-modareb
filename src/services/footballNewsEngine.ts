import { DailyNewsItem, Club, ManagerProfile, LeagueStanding, CalendarDate } from '../types/game';

// Trusted news sources & journalists for realism
const NEWS_SOURCES = [
  { name: 'الأهرام الرياضي', tag: 'جريدة رسمية' },
  { name: 'صدى الملاعب', tag: 'تغطية حية' },
  { name: 'مراسل الدرجة الرابعة', tag: 'أخبار الأقاليم' },
  { name: 'يلا كورة إكسبريس', tag: 'حصريات' },
  { name: 'ستاد مصر الرياضي', tag: 'تحليل فني' },
  { name: 'راديو الكرة المصرية', tag: 'كواليس' },
];

const JOURNALISTS = [
  'طارق رضوان',
  'أحمد الشامي',
  'محمود شوقي',
  'كريم سعيد',
  'محمد عراقي',
  'إسلام صادق',
  'عصام سالم',
  'خالد الإتربي'
];

interface GenerateNewsContext {
  calendarDate?: CalendarDate;
  userClub?: Club | null;
  manager?: ManagerProfile | null;
  teams: Club[];
  standings: LeagueStanding[];
  currentRound: number;
}

/**
 * Random item picker
 */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate rich, randomized, simulated league headlines
 */
export function generateImmersiveNewsBatch(ctx: GenerateNewsContext, count: number = 4): DailyNewsItem[] {
  const { calendarDate, userClub, manager, teams, standings, currentRound } = ctx;
  const dateStr = calendarDate?.formattedArabic || 'اليوم';
  const rawDateStr = calendarDate?.rawDateStr || new Date().toISOString().split('T')[0];

  const newsItems: DailyNewsItem[] = [];
  const defaultFallbackClub = {
    id: 'team_fallback_1',
    name: 'النادي الأهلي',
    shortName: 'الأهلي',
    reputation: 80,
    budget: 1000000,
    players: [],
    division: 1,
  } as unknown as Club;
  const defaultFallbackClub2 = {
    id: 'team_fallback_2',
    name: 'نادي الزمالك',
    shortName: 'الزمالك',
    reputation: 78,
    budget: 800000,
    players: [],
    division: 1,
  } as unknown as Club;

  const rawTeamsList = (Array.isArray(teams) && teams.length > 0) ? teams : [defaultFallbackClub, defaultFallbackClub2];
  const safeTeams = rawTeamsList.filter(t => t && t.id && t.name);
  if (safeTeams.length === 0) {
    safeTeams.push(defaultFallbackClub, defaultFallbackClub2);
  }

  // Helper to pick distinct teams
  const getTwoDistinctTeams = (): [Club, Club] => {
    const t1 = pick(safeTeams) || defaultFallbackClub;
    const remaining = safeTeams.filter(t => t && t.id && t.id !== t1.id);
    const t2 = remaining.length > 0 ? (pick(remaining) || defaultFallbackClub2) : defaultFallbackClub2;
    return [t1, t2];
  };

  // Helper to pick a player from a club
  const getPlayerFromClub = (club: Club) => {
    if (club && Array.isArray(club.players) && club.players.length > 0) {
      const validPlayers = club.players.filter(p => p && p.name);
      if (validPlayers.length > 0) {
        return pick(validPlayers);
      }
    }
    return {
      name: pick(['أحمد صابر', 'محمود زيزو', 'عمر كمال', 'حسام حسن', 'طارق حامد', 'مصطفى شلبي', 'كريم نيدفيد', 'يوسف أوباما']),
      position: 'مهاجم',
      overall: getRandomInt(65, 82),
      age: getRandomInt(19, 31),
    };
  };

  // 1. User Club specific news (if managed)
  if (userClub && userClub.id && userClub.name && manager && Math.random() < 0.6) {
    const validStandings = (Array.isArray(standings) ? standings : []).filter(s => s && s.teamId);
    const isTopFour = validStandings.findIndex(s => s.teamId === userClub.id) < 4;
    const isLeading = validStandings[0]?.teamId === userClub.id;

    if (isLeading) {
      newsItems.push({
        id: `news_user_${Date.now()}_${getRandomInt(100, 999)}`,
        dateStr,
        title: `رياح البطولة تهب على ${userClub.name}: المدرب ${manager.name} يسطر ملحمة تكتيكية!`,
        content: `أشادت وسائل الإعلام بالأداء الاستثنائي لنادي ${userClub.name} وتصدره المستحق لجدول الترتيب بفضل الانضباط التكتيكي والروح القتالية التي غرسها المدرب ${manager.name}.`,
        fullStory: `في تقرير فني موسع، نال نادي ${userClub.name} إشادات غير مسبوقة من كبار محللي الكرة في الدوري، حيث اعتبروا أن النجاح الباهر للفريق لم يأتِ بمحض الصدفة، بل هو ثمرة عمل دؤوب وتخطيط محكم من الجهاز الفني بقيادة المدرب ${manager.name}.\n\nوأكد النقاد أن الفريق أظهر توازناً نادراً بين الصلابة الدفاعية والفاعلية الهجومية في الهجمات المرتدة، مما جعل ${userClub.name} المرشح الأول لنيل بطاقة الصعود المباشرة.\n\nمن جانبها، عبّرت جماهير النادي عن سعادتها البالغة بهذا التوهج، وطالبت إدارة النادي بالحفاظ على استقرار الفريق ودعم المدرب في الميركاتو المقبل.`,
        category: 'milestone',
        importance: 'high',
        icon: '👑',
        source: pick(NEWS_SOURCES).name,
        author: pick(JOURNALISTS),
        clubName: userClub.name,
        likes: getRandomInt(350, 1200),
        commentsCount: getRandomInt(45, 180),
        timeAgo: 'عاجل - منذ 25 دقيقة',
        tags: [`#${userClub.name.replace(/\s+/g, '_')}`, '#صدارة_الدوري', '#المدرب'],
        isBreaking: true,
      });
    } else if (isTopFour) {
      newsItems.push({
        id: `news_user_${Date.now()}_${getRandomInt(100, 999)}`,
        dateStr,
        title: `طموحات لا تنتهي: ${userClub.name} يواصل الزحف نحو الصدارة بقيادة ${manager.name}`,
        content: `أكدت تقارير مقربة من إدارة ${userClub.name} رضا المجلس التام عن نسق التطور الفني والبدني للفريق واقترابه من المراكز المؤهلة للمرحلة الحاسمة.`,
        fullStory: `تشهد أروقة نادي ${userClub.name} حالة من التفاؤل والهدوء بعد النتائج الإيجابية المتتالية التي وضعت الفريق بين الأربعة الكبار في جدول المسابقة.\n\nوفي تصريحات خاصة، أكد أحد أعضاء مجلس الإدارة أن الثقة كاملة في الكابتن ${manager.name} لإكمال الموسم وتحقيق الهدف المنشود بالصعود.\n\nوأضاف: "الفريق أصبح يمتلك هوية وشخصية واضحة داخل المستطيل الأخضر، واللاعبون يبذلون قصارى جهدهم في التدريبات اليومية للارتقاء أكثر في الترتيب العام."`,
        category: 'board',
        importance: 'medium',
        icon: '📈',
        source: pick(NEWS_SOURCES).name,
        author: pick(JOURNALISTS),
        clubName: userClub.name,
        likes: getRandomInt(180, 560),
        commentsCount: getRandomInt(20, 80),
        timeAgo: 'منذ ساعة',
        tags: [`#${userClub.name.replace(/\s+/g, '_')}`, '#الدوري_المصري', '#المربع_الذهبي'],
      });
    } else {
      newsItems.push({
        id: `news_user_${Date.now()}_${getRandomInt(100, 999)}`,
        dateStr,
        title: `المدرب ${manager.name} يعلن حالة الطوارئ في معسكر ${userClub.name} لتصحيح المسار`,
        content: `عقد الجهاز الفني جلسة حاسمة مع اللاعبين لمراجعة الأخطاء الدفاعية وطالب بمضاعفة التركيز في الجولات المتبقية للابتعاد عن مناطق الخطر.`,
        fullStory: `في خطوة حاسمة لإعادة التوازن، قرر المدرب ${manager.name} رفع وتيرة الاستعدادات وإجراء تعديلات خططية مرتقبة على التشكيل الأساسي لنادي ${userClub.name}.\n\nوعلم مراسلنا أن الجلسة شهدت مصارحة واضحة حول أسباب تذبذب النتائج، حيث تعاهد اللاعبون على القتال في المباريات المقبلة وحصد النقاط كاملة.\n\nالمدرب أكد للجماهير في تصريح مقتضب أن القادم سيكون أفضل، وأن الفريق يمتلك الجودة الكافية للعودة سريعاً إلى سكة الانتصارات.`,
        category: 'crisis',
        importance: 'medium',
        icon: '⚠️',
        source: pick(NEWS_SOURCES).name,
        author: pick(JOURNALISTS),
        clubName: userClub.name,
        likes: getRandomInt(120, 390),
        commentsCount: getRandomInt(15, 65),
        timeAgo: 'منذ 3 ساعات',
        tags: [`#${userClub.name.replace(/\s+/g, '_')}`, '#تصحيح_المسار', '#جلسة_طارئة'],
      });
    }
  }

  // 2. Transfer Market Buzz & Rumors
  const [teamA, teamB] = getTwoDistinctTeams();
  const starPlayer = getPlayerFromClub(teamA);
  const feeEstimate = getRandomInt(150, 950) * 1000;

  const transferTemplates = [
    {
      title: `صفقة الموسم تلوح في الأفق: ${teamB.name} يرصد ${feeEstimate.toLocaleString()} ج.م لخطف ${starPlayer.name}!`,
      content: `دخلت إدارة ${teamB.name} في مفاوضات متقدمة للتعاقد مع نجم ${teamA.name} ${starPlayer.name} لتعزيز الخطوط قبل إغلاق نافذة الانتقالات.`,
      fullStory: `علمت مصادرنا الخاصة أن مسؤولي التعاقدات في نادي ${teamB.name} قد تواصلوا رسمياً مع وكيل اللاعب ${starPlayer.name} لاستطلاع رأيه حول الانتقال خلال الميركاتو الحالي.\n\nاللاعب البالغ من العمر ${starPlayer.age || 24} عاماً يقدم مستويات لافتة مع نادي ${teamA.name} جعلته هدفاً لعدة أندية تسعى للمنافسة.\n\nفي المقابل، تتمسك إدارة ${teamA.name} بموقف صارم وترفض التفريط في ركيزتها الأساسية إلا بمقابل مالي يليق بقيمته الفنية. الساعات القادمة ستكون حاسمة في مصير الصفقة.`,
      category: 'transfer' as const,
      importance: 'high' as const,
      icon: '🤝',
      tags: ['#ميركاتو', `#${teamB.name.replace(/\s+/g, '_')}`, `#${teamA.name.replace(/\s+/g, '_')}`],
    },
    {
      title: `جلسة سرية في القاهرة: وكيل ${starPlayer.name} يبحث شروط فسخ العقد مع ${teamA.name}`,
      content: `ترددت أنباء قوية عن رغبة اللاعب في خوض تجربة جديدة بعد تلقيه عروضاً مغرية من أندية دوري المحترفين والدرجة الممتازة.`,
      fullStory: `كشفت مصادر مطلعة عن اجتماع مغلق عقد بأحد فنادق القاهرة الكبرى بين وكيل اللاعب ${starPlayer.name} وممثلين عن أندية مهتمة بضمه.\n\nاللاعب يسعى لتأمين عقد أفضل يضمن له المشاركة بصفة أساسية في مشروع طموح، بينما تصر إدارة ${teamA.name} على احترام بنود العقد المبرم وتلوح بفرض عقوبات انضباطية في حال استمرار التمرد.\n\nالجمهور بدوره انقسم بين متفهم لرغبة اللاعب في التطور وبين غاضب من توقيت فتح ملف الرحيل في منتصف الموسم.`,
      category: 'transfer' as const,
      importance: 'medium' as const,
      icon: '💼',
      tags: ['#كواليس_الانتقالات', '#أزمة_عقد', starPlayer.name.replace(/\s+/g, '_')],
    }
  ];
  const chosenTransfer = pick(transferTemplates);
  newsItems.push({
    id: `news_trans_${Date.now()}_${getRandomInt(100, 999)}`,
    dateStr,
    title: chosenTransfer.title,
    content: chosenTransfer.content,
    fullStory: chosenTransfer.fullStory,
    category: chosenTransfer.category,
    importance: chosenTransfer.importance,
    icon: chosenTransfer.icon,
    source: pick(NEWS_SOURCES).name,
    author: pick(JOURNALISTS),
    clubName: teamA.name,
    likes: getRandomInt(210, 890),
    commentsCount: getRandomInt(30, 110),
    timeAgo: 'منذ ساعتين',
    tags: chosenTransfer.tags,
  });

  // 3. Matchday Dramas & Rivalry
  const [rival1, rival2] = getTwoDistinctTeams();
  const matchDramas = [
    {
      title: `زلزال في الدوري: ${rival1.name} يفجر مفاجأة مدوية ويسقط ${rival2.name} بثلاثية تاريخية!`,
      content: `في واحدة من أكبر مفاجآت الجولة ${currentRound}، لقّن لاعبو ${rival1.name} منافسهم درساً قاسياً في الهجمات الخاطفة لينهوا اللقاء بفوز عريض قلب موازين الترتيب.`,
      fullStory: `لم تكن الجماهير الحاضرة تتوقع هذا السيناريو الجنوني عندما أطلق الحكم صافرة البداية! دخل نادي ${rival2.name} وهو المرشح الأوفر حظاً، لكن بسالة وتماسك ${rival1.name} حوّلا التوقعات إلى رماد.\n\nثلاثة أهداف مباغتة، وتألق غير عادي من حارس المرمى، جعلت مدرجات ${rival1.name} تشتعل بالأهازيج والفرحة العارمة.\n\nمدرب ${rival2.name} اعتذر للجماهير في المؤتمر الصحفي وقال: "اليوم لم نكن حاضرين ذهنياً، نتحمل المسؤولية كاملة وسنعمل على استعادة كبريائنا فوراً في الجولة المقبلة."`,
      category: 'match' as const,
      importance: 'high' as const,
      icon: '🔥',
      tags: ['#مفاجأة_الجولة', `#${rival1.name.replace(/\s+/g, '_')}`, '#ريمونتادا'],
      isBreaking: Math.random() < 0.4,
    },
    {
      title: `ديربي مشتعل: طردان واشتباكات تكتيكية في مواجهة نارية بين ${rival1.name} و ${rival2.name}`,
      content: `شهدت القمة إثارة بالغة وتوتراً عصبياً داخل المستطيل الأخضر بعد قرارات تحكيمية مثيرة للجدل كادت تعصف بالمباراة في اللحظات الأخيرة.`,
      fullStory: `أوفت مواجهة الديربي بين ${rival1.name} و ${rival2.name} بكافة وعودها الكروية من حيث الشغف والإثارة، ولكن التوتر طغى على الدقائق الأخيرة.\n\nالحكم اضطر لإشهار البطاقة الحمراء مرتين، وسط اعتراضات عنيفة من دكة بدلاء الفريقين.\n\nالمباراة انتهت بتعادل درامي لا يرضي طموح أي من الطرفين، لكنه أظهر مدى الشراسة التي تميز هذا الدوري ورغبة كل نادٍ في القتال حتى الرمق الأخير.`,
      category: 'match' as const,
      importance: 'medium' as const,
      icon: '⚡',
      tags: ['#ديربي_الأعصاب', '#بطاقات_حمراء', '#إثارة_الدوري'],
    }
  ];
  const chosenMatch = pick(matchDramas);
  newsItems.push({
    id: `news_match_${Date.now()}_${getRandomInt(100, 999)}`,
    dateStr,
    title: chosenMatch.title,
    content: chosenMatch.content,
    fullStory: chosenMatch.fullStory,
    category: chosenMatch.category,
    importance: chosenMatch.importance,
    icon: chosenMatch.icon,
    source: pick(NEWS_SOURCES).name,
    author: pick(JOURNALISTS),
    clubName: rival1.name,
    likes: getRandomInt(400, 1400),
    commentsCount: getRandomInt(50, 220),
    timeAgo: 'منذ 4 ساعات',
    tags: chosenMatch.tags,
    isBreaking: chosenMatch.isBreaking,
  });

  // 4. Wonderkid & Scouting Discovery
  const scoutClub = pick(safeTeams) || defaultFallbackClub;
  const youngAge = getRandomInt(17, 20);
  const wonderkidName = pick(['زياد طارق', 'يوسف حسن', 'عمر سيد معوض', 'محمد عبد الله', 'أحمد كباكا', 'حمزة علاء', 'عبد الرحمن مجدي', 'إبراهيم عادل الصغير']);

  newsItems.push({
    id: `news_youth_${Date.now()}_${getRandomInt(100, 999)}`,
    dateStr,
    title: `جوهرة لا تقدر بثمن: موهبة ${scoutClub.name} الشاب ${wonderkidName} يخطف أنظار أندية النخبة!`,
    content: `كشافو المنتخبات الوطنية وأندية المقدمة يراقبون عن كثب اللاعب الصاعد (${youngAge} عاماً) بعد تألقه اللافت ومهاراته العالية في صناعة وتسجيل الأهداف.`,
    fullStory: `بات اللاعب الصاعد ${wonderkidName} حديث الشارع الرياضي بعد سلسلة من العروض المذهلة التي قدمها بقميص ناديه ${scoutClub.name}.\n\nاللاعب يتمتع بسرعة فائقة وقدرة استثنائية على المراوغة في المساحات الضيقة وحس تهديفي نادر للاعبين في مثل سنه (${youngAge} عاماً).\n\nمصادر موثوقة أفادت بأن مدرب منتخب الشباب وضعه ضمن القائمة الموسعة للمعسكر المقبل، فيما تسعى إدارة ناديه لتوقيع عقد احترافي طويل الأمد لتحصينه من إغراءات الأندية الكبرى.`,
    category: 'youth',
    importance: 'medium',
    icon: '🌟',
    source: pick(NEWS_SOURCES).name,
    author: pick(JOURNALISTS),
    clubName: scoutClub.name,
    likes: getRandomInt(320, 950),
    commentsCount: getRandomInt(40, 130),
    timeAgo: 'منذ 6 ساعات',
    tags: ['#موهبة_المستقبل', '#ناشئ_واعد', `#${scoutClub.name.replace(/\s+/g, '_')}`],
  });

  // 5. Managerial & Boardroom Shakeup
  const boardClub = pick(safeTeams) || defaultFallbackClub2;
  newsItems.push({
    id: `news_board_${Date.now()}_${getRandomInt(100, 999)}`,
    dateStr,
    title: `ساعات حاسمة في ${boardClub.name}: مجلس الإدارة يعقد اجتماعاً طارئاً لحسم مصير الجهاز الفني`,
    content: `تقارير تشير إلى منح المدرب فرصة أخيرة في المباراة القادمة أو الإقالة الفورية مع طرح أسماء بارزة لتولي القيادة الفنية للفريق.`,
    fullStory: `تسود حالة من الترقب الشديد داخل أروقة نادي ${boardClub.name} عقب اجتماع طارئ عقده مجلس الإدارة لمناقشة تراجع النتائج في الجولات الأخيرة.\n\nوبحسب ما تسرب من كواليس الاجتماع، فإن أغلبية الأعضاء يميلون لتغيير الجهاز الفني لضخ دماء جديدة، بينما طالب الرئيس بمنح المدرب فرصة أخيرة في مواجهة الجولة المقبلة لإثبات جدارته.\n\nفي غضون ذلك، بدأت لجان التعاقدات بالتواصل غير المباشر مع مدربين بارزين تحسباً لأي قرار رسمي بالإقالة في الساعات القادمة.`,
    category: 'board',
    importance: 'medium',
    icon: '👔',
    source: pick(NEWS_SOURCES).name,
    author: pick(JOURNALISTS),
    clubName: boardClub.name,
    likes: getRandomInt(150, 480),
    commentsCount: getRandomInt(25, 95),
    timeAgo: 'منذ 8 ساعات',
    tags: [`#${boardClub.name.replace(/\s+/g, '_')}`, '#اجتماع_طارئ', '#مصير_المدرب'],
  });

  return newsItems.slice(0, count);
}

/**
 * Generates initial rich news seed when launching the app or if news feed is empty
 */
export function getInitialFootballNews(userClubName?: string, managerName?: string): DailyNewsItem[] {
  return [
    {
      id: 'news_init_1',
      dateStr: 'اليوم',
      title: 'ضربة البداية: موسم كروي استثنائي وطموحات الصعود تشعل حماس الأندية والجماهير!',
      content: 'اتحاد الكرة يعلن الجاهزية الكاملة لانطلاق الجولات وسط ترقب جماهيري حاشد لمعرفة من سيحصد بطاقات التأهل التاريخية للدرجة الأعلى.',
      fullStory: 'أعلنت لجنة المسابقات باتحاد كرة القدم عن انطلاق الموسم الكروي الجديد في أجواء حماسية استثنائية تشهد تنافساً شرساً بين جميع الفرق المشاركة.\n\nوأكدت اللجنة تطبيق أحدث اللوائح التنظيمية لضمان العدالة وتكافؤ الفرص، مشيدة بالاستعدادات المكثفة التي قامت بها الأندية خلال فترات الإعداد والمعسكرات المغلقة.\n\nالجماهير العاشقة تترقب بشغف مباريات الجولة الأولى، في حين رفعت الأجهزة الفنية شعار "لا بديل عن النقاط الثلاث" لبدء الموسم بأفضل صورة ممكنة.',
      category: 'match',
      importance: 'high',
      icon: '🏆',
      source: 'الأهرام الرياضي',
      author: 'طارق رضوان',
      likes: 1250,
      commentsCount: 165,
      timeAgo: 'عاجل - اليوم',
      tags: ['#انطلاق_الموسم', '#الدوري_المصري', '#طموح_الصعود'],
      isBreaking: true,
    },
    {
      id: 'news_init_2',
      dateStr: 'أمس',
      title: userClubName && managerName 
        ? `أنظار المتابعين تتجه لنادي ${userClubName}: مشروع المدرب ${managerName} يحظى بإشادات واسعة` 
        : 'كشافو الكرة يضعون قائمة بأبرز 10 مواهب صاعدة مرشحة للانفجار هذا الموسم',
      content: userClubName 
        ? `اعتبر نقاد الكرة أن تعيين المدرب في ${userClubName} خطوة ذكية ستمنح الفريق تنظيماً تكتيكياً رفيعاً للمنافسة على اللقب.`
        : 'أعدت مراكز الرصد الفني تقريراً يبرز أسماء واعدة تمتلك قدرات فردية خارقة قد تغير معادلة الصعود والهبوط.',
      fullStory: 'أفردت الملاحق الرياضية مساحات واسعة للحديث عن الأفكار التكتيكية الحديثة التي بدأت تظهر في الملاعب.\n\nالخبراء أشادوا بالانضباط العالي والجرأة في إشراك العناصر الشابة، مؤكدين أن الأندية التي تعتمد على التخطيط العلمي والروح القتالية هي الأقرب للظفر ببطاقات التأهل.\n\nالملعب سيكون الفيصل، والجماهير مستعدة لدعم فرقها بكل قوة حتى صافرة ختام الموسم.',
      category: 'milestone',
      importance: 'medium',
      icon: '🌟',
      source: 'صدى الملاعب',
      author: 'أحمد الشامي',
      likes: 640,
      commentsCount: 78,
      timeAgo: 'منذ 5 ساعات',
      tags: ['#تحليل_فني', '#مشاريع_المدربين', '#المستقبل'],
    },
    {
      id: 'news_init_3',
      dateStr: 'أمس',
      title: 'سوق الانتقالات يشتعل: صراع خفي بين الأندية لتدعيم خطوط الهجوم قبل غلق القيد',
      content: 'تتسابق إدارات الأندية لإتمام صفقات اللحظات الأخيرة مع التركيز على المهاجمين والهدافين ذوي الخبرة لحسم المباريات المغلقة.',
      fullStory: 'تشهد الساعات الأخيرة من نافذة القيد نشاطاً محموماً في غرف العمليات ولجان التعاقدات بالأندية.\n\nوكلاء اللاعبين يكثفون اتصالاتهم لتسويق لاعبيهم، بينما تحاول الأندية موازنة سقف الرواتب مع المطالب الفنية للمدربين.\n\nالعديد من المفاجآت مرشحة للحدوث قبل إسدال الستار على الميركاتو، مع توقع إعلان صفقات تبادلية كبرى في اللحظات الحاسمة.',
      category: 'transfer',
      importance: 'medium',
      icon: '🤝',
      source: 'يلا كورة إكسبريس',
      author: 'محمود شوقي',
      likes: 820,
      commentsCount: 92,
      timeAgo: 'منذ 8 ساعات',
      tags: ['#الميركاتو', '#صفقات_الساعة_الأخيرة', '#أخبار_الانتقالات'],
    },
    {
      id: 'news_init_4',
      dateStr: 'منذ يومين',
      title: 'لجنة المسابقات تعتمد شروط الحوافز المالية والمكافآت لأصحاب المراكز الأولى',
      content: 'أعلن الاتحاد عن حزمة جوائز استثنائية ودعم مالي للأندية الصاعدة بهدف رفع القيمة التسويقية وتطوير البنية التحتية.',
      fullStory: 'في خطوة لقيت ترحيباً واسعاً من مجالس إدارات الأندية، أقرت لجنة المسابقات لائحة حوافز ومكافآت مالية تصاعدية.\n\nالقرار يهدف إلى تحفيز الفرق على اللعب النظيف وتطوير مستوى المنافسة حتى الجولة الأخيرة دون أي تهاون.\n\nكما تم تخصيص دعم إضافي للأندية التي تعتمد على قطاعات الناشئين وتمنح دقائق لعب كافية للمواهب الصاعدة تحت 21 عاماً.',
      category: 'board',
      importance: 'normal',
      icon: '💰',
      source: 'راديو الكرة المصرية',
      author: 'إسلام صادق',
      likes: 490,
      commentsCount: 35,
      timeAgo: 'منذ يومين',
      tags: ['#اتحاد_الكرة', '#لوائح_المسابقات', '#حوافز_مالية'],
    }
  ];
}
