import React, { useMemo, useState, useEffect } from 'react';
import { ThumbsUp, MessageCircle, Share2, BadgeCheck, Send, Globe2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Fixture, Club } from '../types/game';

interface Comment { n: string; t: string; me?: boolean }
interface Post {
  id: string;
  author: string;
  kind: 'page' | 'fan' | 'press' | 'rival' | 'me';
  verified?: boolean;
  text: string;
  tag?: string;
  base: number; // base likes
  comments: Comment[];
  order: number; // higher = newer
}
interface Saved { liked: Record<string, 1>; extra: Record<string, Comment[]>; shared: Record<string, 1>; mine: Post[]; lastPostRound: number }

const FANS = ['محمد الغندور', 'أحمد سامي', 'Mostafa Fan', 'يوسف كابتن', 'عم حسين الكروي', 'هدى بتشجع', 'كريم 10', 'سلمى ملكة المدرجات', 'ابو علي الأصلي', 'Ziad_Goal', 'عمر المحلل', 'منى عاشقة الكورة'];
const COMMENTS_WIN = ['الله عليك يا مدرب 🔥', 'ده الفريق اللي بنحبه ❤️', 'كمّل كده وإحنا وراك', 'تحيا الكورة 😍', 'أحلى ماتش الموسم', 'المدرب ده جاب الفريق من الصفر', 'مش مصدق الأداء!! 👏'];
const COMMENTS_LOSS = ['إيه اللي حصل ده؟ 😡', 'محتاجين تغيير في الخطة', 'مش هنسيب الفريق مهما حصل 💪', 'الدفاع كان نايم', 'معلش النتيجة دي هتعدّي', 'عايزين نشوف رد فعل في الماتش الجاي', 'ثقتنا فيك يا مدرب'];
const COMMENTS_DRAW = ['نقطة أحسن من لا شيء', 'كنا نستاهل أكتر', 'التعادل ده طعمه مر', 'الفرص كتير وماسجلناش 😤', 'عادي، الجاي أحسن'];
const REPLY = ['شكراً على دعمك ❤️', 'ده شغلنا وإنتو الأساس 💪', 'هنفضل نحاول لآخر نفس', 'الجمهور هو اللاعب رقم 12 🙏', 'وعد إننا هنفرّحكم'];

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function rnd(seed: string, n: number) { return hash(seed) % n; }
function pickN<T>(arr: T[], seed: string, n: number): T[] {
  const a = arr.slice(); const out: T[] = [];
  for (let i = 0; i < n && a.length; i++) out.push(a.splice(hash(seed + i) % a.length, 1)[0]);
  return out;
}
function timeAgo(rank: number): string {
  const L = ['الآن', 'منذ 10 دقايق', 'منذ 35 دقيقة', 'منذ ساعة', 'منذ ساعتين', 'منذ 4 ساعات', 'منذ 7 ساعات', 'امبارح', 'منذ يومين', 'منذ 3 أيام', 'الأسبوع الماضي'];
  return L[Math.min(rank, L.length - 1)];
}
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n));
const colorFor = (s: string) => ['#0ea5e9', '#a855f7', '#ef4444', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'][hash(s) % 8];

export const SocialTab: React.FC = () => {
  const { userClub, teams, fixtures, standings, manager, currentRound, dailyNews, applyPressEffects } = useGame();
  const key = `anta_social_v1_${userClub?.id || 'x'}`;
  const [saved, setSaved] = useState<Saved>(() => {
    try { const r = localStorage.getItem(key); if (r) return { liked: {}, extra: {}, shared: {}, mine: [], lastPostRound: -1, ...JSON.parse(r) }; } catch { /* */ }
    return { liked: {}, extra: {}, shared: {}, mine: [], lastPostRound: -1 };
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* */ } }, [saved, key]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [compose, setCompose] = useState('');
  const [filter, setFilter] = useState<'all' | 'fans' | 'press' | 'rival'>('all');
  const [limit, setLimit] = useState(14);

  const posts = useMemo<Post[]>(() => {
    if (!userClub) return [];
    const club = userClub as Club;
    const name = club.name, short = club.shortName || club.name;
    const out: Post[] = [];
    const tname = (id: string) => teams.find(t => t.id === id)?.name || 'الخصم';
    const played = (fixtures || [])
      .filter((f: Fixture) => f.isPlayed && f.homeScore != null && (f.homeTeamId === club.id || f.awayTeamId === club.id))
      .sort((a, b) => (b.round || 0) - (a.round || 0)).slice(0, 7);

    played.forEach((f, idx) => {
      const home = f.homeTeamId === club.id;
      const my = (home ? f.homeScore : f.awayScore) ?? 0, op = (home ? f.awayScore : f.homeScore) ?? 0;
      const opp = tname(home ? f.awayTeamId : f.homeTeamId);
      const res = my > op ? 'w' : my === op ? 'd' : 'l';
      const pool = res === 'w' ? COMMENTS_WIN : res === 'l' ? COMMENTS_LOSS : COMMENTS_DRAW;
      const scorers = (f.events || []).filter(e => e.type === 'goal' && e.teamId === club.id && e.playerName).map(e => e.playerName as string);
      const star = scorers[0];
      const o = 1000 - idx * 10;
      const mkComments = (seed: string, n: number): Comment[] => pickN(FANS, seed, n).map((nm, i) => ({ n: nm, t: pool[hash(seed + nm + i) % pool.length] }));
      const sid = f.id;

      out.push({
        id: `${sid}_page`, author: `عشاق ${short} الرسميّة`, kind: 'page', verified: true, order: o + 5,
        text: res === 'w' ? `🔥🔥 مبروك الفوز ${my}-${op} على ${opp}! ${star ? `نجم اللقاء ${star} ⚽` : 'أداء جماعي رائع'} — ادعموا الفريق وكملوا الفرحة 💚`
          : res === 'd' ? `🤝 تعادل ${my}-${op} مع ${opp}.. نقطة في الجيب وعيننا على الماتش الجاي. فريقنا هيرد بقوة 💪`
          : `💔 خسارة ${my}-${op} أمام ${opp}.. بس الفريق اتعلّم الدرس. دعمنا مش هيقف 🙏`,
        tag: 'صفحة جماهير', base: 800 + rnd(sid, 900), comments: mkComments(sid + 'p', 3),
      });
      out.push({
        id: `${sid}_fan1`, author: FANS[rnd(sid + 'f1', FANS.length)], kind: 'fan', order: o + 2,
        text: res === 'w' ? `يا جماعة النهارده ${name} كان مولّع الملعب! ${my}-${op} على ${opp} 😍 المدرب ده فاهم`
          : res === 'd' ? `تعادل ${my}-${op} قدام ${opp}.. معلش بس كان لازم نكسب الماتش ده 😤`
          : `${opp} كسبنا ${op}-${my}.. أنا مش راضي عن الأداء بصراحة، فين الشخصية؟ 😡`,
        base: 40 + rnd(sid + 'l1', 300), comments: mkComments(sid + 'c1', 2),
      });
      if (res !== 'd') {
        out.push({
          id: `${sid}_rival`, author: `ألتراس ${opp}`, kind: 'rival', order: o + 1, tag: 'جماهير الخصم',
          text: res === 'w' ? `مبروك ${name} الفوز.. بس الدور الجاي هنرد ✋ #${opp.replace(/\s/g, '_')}` : `😎 ${op}-${my} على ${name}! تحية للفريق وللجمهور العظيم.. كده نتفاهم`,
          base: 120 + rnd(sid + 'l2', 400), comments: [{ n: pickN(FANS, sid + 'r', 1)[0], t: res === 'w' ? 'الكورة دايرة يا جماعة' : 'الغرور بدري على كده 😂' }],
        });
      }
      if (idx < 3) {
        out.push({
          id: `${sid}_press`, author: 'كووورة إنسايدر', kind: 'press', verified: true, order: o + 4,
          text: `⚽ ملخص: ${home ? name : opp} ${f.homeScore}-${f.awayScore} ${home ? opp : name}${scorers.length ? `\nالأهداف: ${scorers.join('، ')}` : ''}\n${res === 'w' ? 'فوز يعزّز موقف المدرب' : res === 'd' ? 'تعادل يترك الباب مفتوح' : 'خسارة تزيد الضغط على المدرب'} 📊`,
          tag: 'صفحة رياضية', base: 300 + rnd(sid + 'l3', 700), comments: [],
        });
      }
    });

    // مركز الفريق في الجدول
    const myRank = (standings || []).findIndex(s => s.teamId === club.id) + 1;
    if (myRank > 0) {
      out.push({
        id: `standing_${myRank}_${currentRound}`, author: 'بي إن سبورتس الإخبارية', kind: 'press', verified: true, order: 900,
        text: `📈 ${name} يحتل المركز ${myRank} في الترتيب بعد الجولة ${currentRound}${myRank <= 3 ? ' — المنافسة على اللقب مشتعلة 🏆' : myRank > (standings.length * 0.7) ? ' — الفريق في منطقة الخطر ويحتاج رد فعل ⚠️' : ''}`,
        tag: 'ترتيب', base: 200 + rnd('st' + myRank, 300), comments: pickN(FANS, 'st' + myRank, 2).map((n, i) => ({ n, t: myRank <= 4 ? COMMENTS_WIN[(i + myRank) % COMMENTS_WIN.length] : COMMENTS_LOSS[(i + myRank) % COMMENTS_LOSS.length] })),
      });
    }
    // أخبار اللعبة تتحول لبوستات صفحات
    (Array.isArray(dailyNews) ? dailyNews : []).slice(0, 5).forEach((n, i) => {
      if (!n || !n.id) return;
      out.push({ id: `news_${n.id}`, author: n.source || 'كووورة إنسايدر', kind: 'press', verified: true, order: 800 - i, text: `${n.icon || '📰'} ${n.title}\n${(n.content || '').slice(0, 140)}`, tag: 'خبر', base: 150 + (n.likes || rnd(n.id, 500)), comments: [] });
    });
    // بوست ترحيب
    out.push({
      id: 'welcome', author: `ألتراس ${short}`, kind: 'page', verified: true, order: 1, tag: 'صفحة جماهير',
      text: `🙌 أهلاً بالمدرب ${manager?.name || ''} في بيتنا! جمهور ${name} معاك في كل ماتش. كلنا ثقة إنك هتفرّحنا 💚`,
      base: 1200, comments: pickN(FANS, 'w', 3).map((n, i) => ({ n, t: ['نورت يا كابتن 🌹', 'عايزين لقب الموسم ده!', 'إحنا وراك للآخر'][i] })),
    });
    return [...saved.mine.map(m => ({ ...m, order: 2000 + m.order })), ...out].sort((a, b) => b.order - a.order);
  }, [userClub, teams, fixtures, standings, manager, currentRound, dailyNews, saved.mine]);

  if (!userClub) return <div className="text-center text-slate-400 p-8">اختار نادي الأول.</div>;

  const shown = posts.filter(p => filter === 'all' || (filter === 'fans' ? (p.kind === 'fan' || p.kind === 'page' || p.kind === 'me') : p.kind === filter));
  const like = (id: string) => setSaved(s => { const l = { ...s.liked }; if (l[id]) delete l[id]; else l[id] = 1; return { ...s, liked: l }; });
  const share = (id: string, text: string) => {
    setSaved(s => ({ ...s, shared: { ...s.shared, [id]: 1 } }));
    try { (navigator as any).share?.({ text }) ?? (navigator as any).clipboard?.writeText(text); } catch { /* */ }
  };
  const sendComment = (id: string) => {
    const t = (draft[id] || '').trim(); if (!t) return;
    const reply: Comment = { n: FANS[hash(id + t) % FANS.length], t: REPLY[hash(t) % REPLY.length] };
    setSaved(s => ({ ...s, extra: { ...s.extra, [id]: [...(s.extra[id] || []), { n: manager?.name || 'المدرب', t, me: true }, reply] } }));
    setDraft(d => ({ ...d, [id]: '' }));
  };
  const publish = () => {
    const t = compose.trim(); if (!t) return;
    const canBoost = saved.lastPostRound !== currentRound;
    const post: Post = { id: 'me_' + Date.now(), author: `${manager?.name || 'المدرب'} (المدرب)`, kind: 'me', verified: true, order: Date.now() % 100000, text: t, base: 50 + rnd(t, 300), comments: pickN(FANS, t, 2).map((n, i) => ({ n, t: COMMENTS_WIN[(hash(t) + i) % COMMENTS_WIN.length] })) };
    setSaved(s => ({ ...s, mine: [post, ...s.mine].slice(0, 20), lastPostRound: currentRound }));
    if (canBoost) applyPressEffects({ fans: 1, morale: 1 });
    setCompose('');
  };

  return (
    <div className="space-y-3 max-w-xl mx-auto" dir="rtl">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300"><Globe2 className="w-4 h-4" /></div>
        <div><h2 className="font-black text-white text-base">السوشيال</h2><p className="text-[11px] text-slate-400">بوستات جمهور {userClub.shortName || userClub.name} والصفحات الرياضية</p></div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
        <textarea value={compose} onChange={e => setCompose(e.target.value)} rows={2} maxLength={200} placeholder="اكتب بوست للجمهور... (بوست كل جولة بيرفع الحماس)"
          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white placeholder-slate-500 resize-none outline-none focus:border-sky-500" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-slate-500">{saved.lastPostRound === currentRound ? 'نشرت بوست في الجولة دي' : '+ حماس الجمهور لو نشرت بوست الجولة دي'}</span>
          <button onClick={publish} disabled={!compose.trim()} className="px-4 py-1.5 rounded-xl bg-sky-500 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"><Send className="w-3 h-3" /> نشر</button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([['all', 'الكل'], ['fans', 'جماهيرنا'], ['press', 'الصحافة'], ['rival', 'الخصوم']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${filter === k ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-900 text-slate-300 border-slate-700'}`}>{l}</button>
        ))}
      </div>

      {shown.slice(0, limit).map((p, idx) => {
        const liked = !!saved.liked[p.id];
        const allComments = [...p.comments, ...(saved.extra[p.id] || [])];
        return (
          <article key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: colorFor(p.author) }}>{p.author.replace(/^(ألتراس|عشاق)\s*/, '').trim().charAt(0) || '؟'}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-bold text-white truncate">{p.author}{p.verified && <BadgeCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />}</div>
                <div className="text-[11px] text-slate-500">{timeAgo(idx)}{p.tag ? ` · ${p.tag}` : ''} · 🌐</div>
              </div>
            </div>
            <div className="px-3 pb-2.5 text-sm text-slate-100 leading-relaxed whitespace-pre-line">{p.text}</div>
            <div className="px-3 pb-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>👍❤️ {fmt(p.base + (liked ? 1 : 0))}</span>
              <span>{allComments.length} تعليق · {fmt(Math.round(p.base / 12) + (saved.shared[p.id] ? 1 : 0))} مشاركة</span>
            </div>
            <div className="border-t border-slate-800 grid grid-cols-3 text-xs font-bold">
              <button onClick={() => like(p.id)} className={`py-2.5 flex items-center justify-center gap-1.5 ${liked ? 'text-sky-400' : 'text-slate-300'}`}><ThumbsUp className={`w-4 h-4 ${liked ? 'fill-sky-400' : ''}`} /> أعجبني</button>
              <button onClick={() => setOpen(o => ({ ...o, [p.id]: !o[p.id] }))} className="py-2.5 flex items-center justify-center gap-1.5 text-slate-300"><MessageCircle className="w-4 h-4" /> تعليق</button>
              <button onClick={() => share(p.id, p.text)} className={`py-2.5 flex items-center justify-center gap-1.5 ${saved.shared[p.id] ? 'text-emerald-400' : 'text-slate-300'}`}><Share2 className="w-4 h-4" /> مشاركة</button>
            </div>
            {(open[p.id] || allComments.length > 0) && (
              <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-950/40">
                {(open[p.id] ? allComments : allComments.slice(0, 2)).map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black text-white" style={{ background: c.me ? '#10b981' : colorFor(c.n) }}>{c.n.charAt(0)}</div>
                    <div className="bg-slate-800 rounded-2xl px-3 py-1.5 min-w-0"><div className="text-[11px] font-bold text-slate-200">{c.n}</div><div className="text-xs text-slate-100 leading-snug">{c.t}</div></div>
                  </div>
                ))}
                {!open[p.id] && allComments.length > 2 && <button onClick={() => setOpen(o => ({ ...o, [p.id]: true }))} className="text-[11px] text-slate-400">عرض كل التعليقات ({allComments.length})</button>}
                {open[p.id] && (
                  <div className="flex gap-2 pt-1">
                    <input value={draft[p.id] || ''} onChange={e => setDraft(d => ({ ...d, [p.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && sendComment(p.id)} placeholder="اكتب تعليق..." className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-full px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500" />
                    <button onClick={() => sendComment(p.id)} className="px-3 rounded-full bg-sky-500 text-white"><Send className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
      {shown.length > limit && <button onClick={() => setLimit(l => l + 14)} className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300">اعرض بوستات أكتر</button>}
      {shown.length === 0 && <div className="text-center text-slate-500 text-sm p-8">لسه مفيش بوستات. العب ماتش وهتلاقي الجمهور بيتكلم 😄</div>}
    </div>
  );
};
