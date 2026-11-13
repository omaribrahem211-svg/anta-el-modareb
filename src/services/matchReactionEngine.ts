import type { DailyNewsItem, Club, MatchEvent } from '../types/game';

// After-match news & statements built from what REALLY happened in the match (score, scorers, cards, the table and the
// other results of the round), with many different templates so two matches never read the same.

export interface MatchReactionContext {
  dateStr: string;
  userClub: Club;
  opponent: Club;
  isHome: boolean;
  userScore: number;
  oppScore: number;
  events: MatchEvent[];
  managerName: string;
  standings?: { teamId: string; position?: number; points?: number }[];
  form?: ('W' | 'D' | 'L')[];            // user's last results, newest first (this match included)
  otherResults?: { homeId: string; awayId: string; homeScore: number; awayScore: number; events?: MatchEvent[] }[];
  teams?: Club[];
  recentTitles?: Set<string>;
  competitionName?: string;
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const SOURCES = ['الأهرام الرياضي', 'صدى الملاعب', 'يلا كورة إكسبريس', 'ستاد مصر الرياضي', 'راديو الكرة المصرية', 'كورة نيوز', 'الملعب الحر'];
const WRITERS = ['طارق رضوان', 'أحمد الشامي', 'محمود شوقي', 'كريم سعيد', 'محمد عراقي', 'إسلام صادق', 'عصام سالم', 'خالد الإتربي'];

type Item = Omit<DailyNewsItem, 'id' | 'dateStr' | 'source' | 'author' | 'likes' | 'commentsCount' | 'timeAgo'>;

function topScorer(events: MatchEvent[], teamId: string): { name: string; goals: number } | null {
  const m = new Map<string, number>();
  for (const e of events || []) if (e && e.type === 'goal' && e.teamId === teamId && e.playerName) m.set(e.playerName, (m.get(e.playerName) || 0) + 1);
  let best: { name: string; goals: number } | null = null;
  m.forEach((g, name) => { if (!best || g > best.goals) best = { name, goals: g }; });
  return best;
}

export function generateMatchReactions(ctx: MatchReactionContext, max: number = 6): DailyNewsItem[] {
  const { userClub, opponent, userScore, oppScore, events, managerName, dateStr } = ctx;
  const U = userClub.name, O = opponent.name;
  const diff = userScore - oppScore;
  const res: 'W' | 'D' | 'L' = diff > 0 ? 'W' : diff < 0 ? 'L' : 'D';
  const score = `${userScore}-${oppScore}`;
  const form = ctx.form || [];
  const winStreak = (() => { let n = 0; for (const f of form) { if (f === 'W') n++; else break; } return n; })();
  const lossStreak = (() => { let n = 0; for (const f of form) { if (f === 'L') n++; else break; } return n; })();
  const noWin = (() => { let n = 0; for (const f of form) { if (f !== 'W') n++; else break; } return n; })();
  const myScorer = topScorer(events, userClub.id);
  const oppScorer = topScorer(events, opponent.id);
  const reds = (events || []).filter(e => e && e.type === 'red_card');
  const userRed = reds.find(e => e.teamId === userClub.id);
  const oppRed = reds.find(e => e.teamId === opponent.id);
  const oppCoach = (opponent as any).manager?.name ? `المدرب ${(opponent as any).manager.name}` : `مدرب ${O}`;
  const pos = ctx.standings?.find(s => s.teamId === userClub.id)?.position;

  const pool: { w: number; make: () => Item }[] = [];
  const add = (w: number, make: () => Item) => pool.push({ w, make });

  // ---------- Opponent coach statement ----------
  add(5, () => {
    if (res === 'W') {
      const q = pick([
        `«قدّمنا مباراة محترمة لكن ${U} كان أفضل منا اليوم، نهنئهم ونعود أقوى»`,
        `«النتيجة قاسية لكن الأخطاء الدفاعية كلفتنا غالياً، سنراجع كل شيء في التدريب»`,
        `«لم نكن في يومنا، و${managerName} قرأ المباراة أفضل مني، هذه هي كرة القدم»`,
        `«سنحت لنا فرص كانت كفيلة بقلب النتيجة، لكن الكرة لا ترحم من لا يسجّل»`,
        `«اللاعبون بذلوا كل ما عندهم، والخسارة ${score} لا تعبّر عن مجريات اللعب كله»`,
      ]);
      return { title: `${oppCoach} بعد الخسارة أمام ${U}: ${pick(['نعترف بالأفضلية', 'سنعوّض سريعاً', 'الأخطاء كلفتنا المباراة', 'اللاعبون لم يقصّروا'])}`, content: q, category: 'match', importance: 'medium', icon: '🎙️', clubName: O, tags: ['#تصريحات', `#${O.replace(/\s+/g, '_')}`] };
    }
    if (res === 'L') {
      const q = pick([
        `«كنا نعرف أن ${U} يملك أسلحة خطيرة وجهّزنا الفريق لها، فخرجنا بالنقاط الثلاث»`,
        `«هذا الفوز إهداء للجماهير التي ساندتنا طوال الموسم، ونحن في الطريق الصحيح»`,
        `«ضغطنا في التوقيت المناسب وضربنا في الوقت المناسب، تنفيذ مثالي لخطة المباراة»`,
        `«احترام ${managerName} واجب، لكن الأفضل في الملعب اليوم كان فريقنا»`,
        `«لاعبونا قاتلوا على كل كرة، وهذه هي الروح التي أبحث عنها»`,
      ]);
      return { title: `${oppCoach} بعد الفوز على ${U}: ${pick(['خطتنا نجحت', 'فوز للجماهير', 'الروح القتالية صنعت الفارق', 'نحترم المنافس لكن...'])}`, content: q, category: 'match', importance: 'medium', icon: '🎙️', clubName: O, tags: ['#تصريحات', `#${O.replace(/\s+/g, '_')}`] };
    }
    const q = pick([
      `«نقطة مقبولة أمام فريق قوي مثل ${U}، لكننا كنا نطمح لأكثر»`,
      `«التعادل عادل، ولو سنحت لنا الفرصة الأخيرة لتغيّر كل شيء»`,
      `«لم نخسر وهذا مهم، لكن أمامنا عمل كثير لتحسين اللمسة الأخيرة»`,
    ]);
    return { title: `${oppCoach} عن التعادل ${score} مع ${U}: ${pick(['نقطة مقبولة', 'كنا نطمح لأكثر', 'تعادل عادل'])}`, content: q, category: 'match', importance: 'normal', icon: '🎙️', clubName: O, tags: ['#تصريحات'] };
  });

  // ---------- User's scorer / star statement ----------
  if (myScorer) add(5, () => {
    const hat = myScorer.goals >= 3;
    const q = hat
      ? pick([`«سعادتي لا توصف بهذه الثلاثية، لكن أهم شيء أن الفريق فاز»`, `«الفضل لزملائي الذين صنعوا لي الفرص، والهدف الثالث إهداء للجماهير»`, `«كنت أحلم بهاتريك في هذه البطولة، الحمد لله تحقق الحلم»`])
      : pick([`«أهدي الهدف لعائلتي وللجماهير، وسنواصل العمل بنفس الروح»`, `«المهم عندي أن يفوز الفريق، والأهداف تأتي بتعليمات ${managerName}»`, `«الثقة التي منحها لي المدرب هي سر تألقي، وسأردّها بالأهداف»`, `«لن نتوقف عند هذه النتيجة، أمامنا مباريات أصعب بكثير»`]);
    return {
      title: hat ? `هاتريك ${myScorer.name}: «${pick(['ليلة لا تُنسى', 'حلم تحقق', 'الفضل لزملائي'])}» 🎩` : `${myScorer.name} بعد التسجيل: ${pick(['أهدي الهدف للجماهير', 'الثقة سر تألقي', 'المهم الفوز', 'نواصل بنفس الروح'])}`,
      content: q, category: 'milestone', importance: hat ? 'high' : 'medium', icon: hat ? '🎩' : '⚽', clubName: U, tags: [`#${U.replace(/\s+/g, '_')}`, '#تصريحات_لاعبين'],
    };
  });
  else if (res === 'L' || res === 'D') add(4, () => {
    const star = (userClub.players || []).filter(p => p && p.name).sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0))[0];
    const nm = star?.name || 'قائد الفريق';
    return {
      title: `${nm} بعد ${res === 'L' ? 'الخسارة' : 'التعادل'} أمام ${O}: ${pick(['سنعوّض الجماهير', 'نتحمّل المسؤولية', 'الأخطاء لن تتكرر', 'ما زال الطريق طويلاً'])}`,
      content: pick([`«نعتذر للجماهير، لكن الموسم طويل وسنقاتل حتى النهاية»`, `«كلنا نتحمل المسؤولية، لا نبحث عن شماعات»`, `«سنجلس مع المدرب ${managerName} ونصحّح الأخطاء بسرعة»`]),
      category: 'match', importance: 'medium', icon: '🗣️', clubName: U, tags: [`#${U.replace(/\s+/g, '_')}`],
    };
  });

  // ---------- Opponent hero ----------
  if (oppScorer && oppScorer.goals >= 2 && res !== 'W') add(3, () => ({
    title: `${oppScorer.name} نجم ${O} يخطف الأضواء ويسجل ${oppScorer.goals === 2 ? 'هدفين' : `${oppScorer.goals} أهداف`} في مرمى ${U}`,
    content: `تألق ${oppScorer.name} في مواجهة ${U} وقاد فريقه إلى ${res === 'L' ? 'الفوز' : 'نقطة ثمينة'}، وتحدثت الصحافة عن اهتمام أندية كبرى به بعد هذا الأداء.`,
    category: 'transfer', importance: 'normal', icon: '⭐', clubName: O, tags: [`#${O.replace(/\s+/g, '_')}`],
  }));

  // ---------- Pundit analysis ----------
  add(4, () => {
    const t = res === 'W'
      ? (diff >= 3 ? [`اكتساح مستحق: ${U} يسحق ${O} بنتيجة ${score}`, `${U} يقدّم عرضاً هجومياً مبهراً أمام ${O}`] : [`${U} يخطف ثلاث نقاط ثمينة من ${O}`, `قراءة تكتيكية ذكية تمنح ${U} الفوز على ${O}`, `فوز بشق الأنفس لـ${U} على ${O}`])
      : res === 'L'
        ? (diff <= -3 ? [`سقوط مدوٍّ لـ${U} أمام ${O} بنتيجة ${score}`, `كارثة دفاعية: ${U} يتلقى هزيمة ثقيلة من ${O}`] : [`${U} يتعثر أمام ${O} ويخسر ${score}`, `ضربة موجعة لـ${U} بعد الخسارة من ${O}`, `${O} يفرض كلمته ويهزم ${U}`])
        : [`تعادل ${score} بين ${U} و${O} بعد مباراة مثيرة`, `${U} و${O} يتقاسمان النقاط في لقاء متكافئ`, `لا غالب ولا مغلوب في مواجهة ${U} و${O}`];
    const body = res === 'W'
      ? pick([`أجمع المحللون على أن ${managerName} نجح في قراءة نقاط ضعف ${O} وتحويل الأفضلية إلى نتيجة.`, `ظهر الانسجام بين خطوط ${U} وبدا الفريق أكثر نضجاً في إدارة أوقات المباراة.`, `الضغط العالي وسرعة التحول كانا مفتاح الفوز بحسب تقييم الخبراء الفنيين.`])
      : res === 'L'
        ? pick([`انتقد النقاد التمركز الدفاعي وبطء الارتداد، وطالبوا ${managerName} بمراجعة الخطة سريعاً.`, `افتقد ${U} للحلول الهجومية وبدا بلا أنياب أمام دفاع ${O} المنظم.`, `رأى المحللون أن التبديلات جاءت متأخرة وأن الفريق دفع الثمن.`])
        : pick([`تبادل الفريقان السيطرة، وبقيت التفاصيل الصغيرة هي الفارق بين الفوز والتعادل.`, `بدا الحذر على الفريقين وتفوق التنظيم الدفاعي على الجمال الهجومي.`]);
    return { title: pick(t), content: body, category: 'match', importance: Math.abs(diff) >= 3 ? 'high' : 'medium', icon: '📰', clubName: U, tags: ['#تحليل', `#${U.replace(/\s+/g, '_')}`] };
  });

  // ---------- Fans ----------
  add(3, () => {
    const t = res === 'W'
      ? [`فرحة عارمة في مدرجات ${U} بعد الفوز على ${O}`, `الجماهير تهتف باسم ${managerName} بعد الانتصار`, `«الكابتن ${managerName} فاهم اللعبة»: ردود فعل الجماهير بعد الفوز`]
      : res === 'L'
        ? [`غضب جماهير ${U} بعد الخسارة من ${O}`, `هتافات غاضبة ضد الجهاز الفني عقب صافرة النهاية`, `الجماهير تطالب بمراجعة شاملة بعد السقوط أمام ${O}`]
        : [`جماهير ${U} منقسمة بعد التعادل مع ${O}`, `«نقطة مش كفاية»: الجماهير تطالب بالمزيد`];
    const c = res === 'W'
      ? pick([`امتلأت منصات التواصل بعبارات الفخر، وتصدّر وسم الفريق قائمة الأكثر تداولاً.`, `خرجت الجماهير سعيدة وهي تردد أغاني الفريق في محيط الاستاد.`])
      : res === 'L'
        ? pick([`عبّر المشجعون عن غضبهم على المنصات، وطالب بعضهم بتغييرات عاجلة في التشكيلة.`, `غادر كثيرون المدرجات قبل النهاية، وبقي القلة يشجعون الفريق حتى الصافرة.`])
        : pick([`تباينت الآراء بين من رأى النتيجة مقبولة ومن اعتبرها فرصة ضائعة.`]);
    return { title: pick(t), content: c, category: res === 'L' ? 'crisis' : 'match', importance: 'medium', icon: res === 'W' ? '🎉' : res === 'L' ? '😡' : '🤔', clubName: U, tags: ['#الجماهير', `#${U.replace(/\s+/g, '_')}`] };
  });

  // ---------- Referee ----------
  if (reds.length > 0) add(4, () => {
    const who = userRed ? U : O;
    const nm = (userRed || oppRed)?.playerName || 'اللاعب';
    return {
      title: `جدل تحكيمي: طرد ${nm} يشعل مباراة ${U} و${O}`,
      content: pick([`اختلفت الآراء حول قرار طرد ${nm} لاعب ${who}، بين من رآه صحيحاً ومن اعتبره قاسياً، وسط مطالبات بمراجعة تقنية الفيديو.`, `قرار طرد ${nm} غيّر شكل المباراة وفتح باب النقاش حول مستوى التحكيم هذا الموسم.`]),
      category: 'match', importance: 'high', icon: '🟥', clubName: who, tags: ['#التحكيم', '#بطاقة_حمراء'],
    };
  });

  // ---------- Form / streak / table ----------
  if (winStreak >= 3) add(6, () => ({
    title: `${U} يحقق الفوز ${winStreak === 3 ? 'الثالث' : `رقم ${winStreak}`} تواليًا بقيادة ${managerName}`,
    content: pick([`سلسلة انتصارات تعزز ثقة اللاعبين وترفع معنويات الجماهير، والمدرب يطالب بعدم الاسترخاء.`, `بات الفريق من أكثر الفرق استقراراً في المسابقة بعد هذه السلسلة المتتالية من الانتصارات.`]),
    category: 'milestone', importance: 'high', icon: '🔥', clubName: U, tags: ['#سلسلة_انتصارات'],
  }));
  if (lossStreak >= 2) add(6, () => ({
    title: `أزمة في ${U}: ${lossStreak === 2 ? 'الخسارة الثانية' : `${lossStreak} هزائم`} تواليًا والأنظار على ${managerName}`,
    content: pick([`بدأت الضغوط تتزايد على الجهاز الفني بعد تراجع النتائج، والإدارة تراقب الموقف عن كثب.`, `اجتماع طارئ بين مجلس الإدارة والجهاز الفني لبحث أسباب التراجع قبل الجولة القادمة.`]),
    category: 'crisis', importance: 'high', icon: '⚠️', clubName: U, tags: ['#أزمة', '#المدرب'],
  }));
  else if (noWin >= 4) add(4, () => ({
    title: `${U} بلا فوز منذ ${noWin} مباريات.. هل يتغير الحال؟`,
    content: `تتواصل معاناة الفريق في تحقيق الانتصار، ويبحث ${managerName} عن حلول لإعادة التوازن قبل أن تتسع الفجوة في جدول الترتيب.`,
    category: 'crisis', importance: 'medium', icon: '📉', clubName: U, tags: ['#تراجع'],
  }));
  if (pos && ctx.standings && ctx.standings.length > 4) {
    const n = ctx.standings.length;
    if (pos === 1) add(5, () => ({ title: `${U} على القمة: الصدارة بعد مواجهة ${O}`, content: pick([`يواصل الفريق التربع على القمة ويؤكد أنه المرشح الأول للقب.`, `الصدارة تضع على اللاعبين مسؤولية إضافية، والمدرب يؤكد أن الطريق ما زال طويلاً.`]), category: 'milestone', importance: 'high', icon: '👑', clubName: U, tags: ['#الصدارة'] }));
    else if (pos >= n - 2) add(5, () => ({ title: `${U} في منطقة الخطر: صراع البقاء يشتعل`, content: pick([`يقبع الفريق في المراكز المهددة بالهبوط، والجولات القادمة ستحدد مصيره.`, `الإدارة تعقد جلسة مع اللاعبين لرفع الروح المعنوية قبل مواجهات البقاء.`]), category: 'crisis', importance: 'high', icon: '🚨', clubName: U, tags: ['#صراع_البقاء'] }));
  }

  // ---------- Board ----------
  add(2, () => ({
    title: res === 'W' ? `مجلس إدارة ${U} يشيد بالجهاز الفني: «نثق في ${managerName}»` : res === 'L' ? `رئيس ${U} يتحدث عن الخسارة: «نراجع كل شيء ولن نتهاون»` : `مصدر بإدارة ${U}: «راضون عن الأداء ونريد الأفضل»`,
    content: pick([`أكد مصدر مقرب من الإدارة أن الأهداف الموضوعة للموسم لم تتغير، وأن الدعم الكامل متاح للجهاز الفني.`, `تابعت الإدارة المباراة من المنصة، وأبدت رغبتها في رؤية مزيد من الشخصية والانضباط التكتيكي.`]),
    category: 'board', importance: 'normal', icon: '🏛️', clubName: U, tags: ['#الإدارة'],
  }));

  // ---------- Other results of the round ----------
  const others = ctx.otherResults || [];
  const nameOf = (id: string) => ctx.teams?.find(t => t && t.id === id)?.name || '';
  const big = [...others].filter(m => nameOf(m.homeId) && nameOf(m.awayId)).sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0];
  if (big && Math.abs(big.homeScore - big.awayScore) >= 3) add(4, () => {
    const hw = big.homeScore > big.awayScore;
    const w = nameOf(hw ? big.homeId : big.awayId), l = nameOf(hw ? big.awayId : big.homeId);
    const s = `${Math.max(big.homeScore, big.awayScore)}-${Math.min(big.homeScore, big.awayScore)}`;
    return { title: `نتيجة الجولة: ${w} يكتسح ${l} بنتيجة ${s}`, content: pick([`سهرة تهديفية مميزة في ملعب ${hw ? w : l}، ورقم لافت في أهداف الجولة.`, `فوز كبير يعيد ترتيب الأوراق في صراع الصدارة ويضع ${l} في موقف صعب.`]), category: 'match', importance: 'medium', icon: '📊', tags: ['#نتائج_الجولة'] };
  });
  for (const m of others) {
    const cnt = new Map<string, number>();
    for (const e of m.events || []) if (e && e.type === 'goal' && e.playerName) cnt.set(e.playerName, (cnt.get(e.playerName) || 0) + 1);
    let hat: string | null = null; cnt.forEach((g, n) => { if (g >= 3 && !hat) hat = n; });
    if (hat) { add(5, () => ({ title: `هاتريك لـ${hat} في مباراة ${nameOf(m.homeId)} و${nameOf(m.awayId)}`, content: pick([`خطف ${hat} الأضواء بثلاثية رائعة جعلته حديث الشارع الكروي بعد الجولة.`, `لاعب واحد قلب مباراة كاملة رأساً على عقب، والأنظار تتجه إليه في سباق الهدافين.`]), category: 'milestone', importance: 'medium', icon: '🎩', tags: ['#هاتريك'] })); break; }
  }

  // ---------- pick ----------
  const recent = ctx.recentTitles || new Set<string>();
  const made: Item[] = [];
  const bag = [...pool];
  // the opponent coach statement and the pundit analysis are always the backbone; the rest are drawn by weight
  const order: { w: number; make: () => Item }[] = [];
  while (bag.length) {
    const total = bag.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total, i = 0;
    for (; i < bag.length; i++) { r -= bag[i].w; if (r <= 0) break; }
    order.push(bag.splice(Math.min(i, bag.length - 1), 1)[0]);
  }
  const titles = new Set<string>();
  for (const o of order) {
    if (made.length >= max) break;
    try {
      const it = o.make();
      if (!it || titles.has(it.title) || recent.has(it.title)) continue;
      titles.add(it.title); made.push(it);
    } catch { /* skip */ }
  }
  const now = Date.now();
  return made.map((it, i) => ({
    ...it,
    id: `news_react_${now}_${i}_${ri(100, 999)}`,
    dateStr,
    source: pick(SOURCES),
    author: pick(WRITERS),
    likes: ri(40, 900),
    commentsCount: ri(5, 120),
    timeAgo: pick(['الآن', 'منذ 5 دقائق', 'منذ 12 دقيقة', 'منذ 25 دقيقة', 'منذ ساعة']),
  } as DailyNewsItem));
}
