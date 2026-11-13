import React, { useMemo, useState } from 'react';
import { Mic, X, Check, ChevronLeft } from 'lucide-react';
import { Fixture } from '../types/game';
import { useGame } from '../context/GameContext';
import { EXTRA, GENERAL } from '../data/pressBank';

type Tone = 'humble' | 'bold' | 'fire';
interface Answer { tone: Tone; text: string; fx: { board: number; fans: number; morale: number; rep: number }; reply: string }
interface Question { q: string; a: Answer[] }

const TONE_LABEL: Record<Tone, string> = { humble: '🙏 متواضع', bold: '💪 واثق', fire: '🔥 هجومي' };

type Kind = 'bigwin' | 'win' | 'draw' | 'loss' | 'heavyloss';

const BANK: Record<Kind, Question[]> = {
  bigwin: [
    { q: 'فوز كبير النهارده، إيه سر الأداء ده؟', a: [
      { tone: 'humble', text: 'اللاعيبة هما اللي بيتعبوا وأنا بس بنظّم الشغل.', fx: { board: 1, fans: 2, morale: 3, rep: 1 }, reply: 'الجمهور بيحب تواضعك واللاعيبة حسّوا بتقدير.' },
      { tone: 'bold', text: 'ده نتيجة شغل أسابيع، ولسه الأفضل جاي.', fx: { board: 2, fans: 3, morale: 2, rep: 2 }, reply: 'ثقتك رفعت الحماس حواليك.' },
      { tone: 'fire', text: 'ده مجرد تسخين، الباقيين يستعدوا.', fx: { board: 0, fans: 4, morale: 1, rep: 3 }, reply: 'الجمهور اتحمّس بس الخصوم هتاخد كلامك تحدّي.' },
    ] },
    { q: 'هل بتفكر ترفع هدفك للموسم بعد النتيجة دي؟', a: [
      { tone: 'humble', text: 'خطوة خطوة، كل ماتش له حسابه.', fx: { board: 2, fans: 1, morale: 1, rep: 1 }, reply: 'الإدارة مرتاحة لهدوئك.' },
      { tone: 'bold', text: 'أكيد، لو كملنا بالأداء ده كل الأهداف ممكنة.', fx: { board: 1, fans: 3, morale: 2, rep: 2 }, reply: 'الجمهور بدأ يحلم.' },
      { tone: 'fire', text: 'هدفنا اللقب ومش هنقبل بأقل منه.', fx: { board: -1, fans: 5, morale: 2, rep: 3 }, reply: 'ضغط كبير على الإدارة بس الجمهور مجنون بيك.' },
    ] },
    { q: 'مين أحسن لاعب عندك النهارده؟', a: [
      { tone: 'humble', text: 'كل الفريق، ماتش جماعي بامتياز.', fx: { board: 1, fans: 1, morale: 4, rep: 1 }, reply: 'الغرفة كلها حسّت إنك عادل.' },
      { tone: 'bold', text: 'اللي سجّل طبعاً، بس الباقيين اشتغلوا عشانه.', fx: { board: 1, fans: 2, morale: 2, rep: 1 }, reply: 'إجابة متوازنة.' },
      { tone: 'fire', text: 'فيه لاعيبة لسه ما وصلوش لمستواهم وهنشتغل عليهم.', fx: { board: 0, fans: 0, morale: -3, rep: 1 }, reply: 'بعض اللاعيبة اتضايقوا من كلامك.' },
    ] },
  ],
  win: [
    { q: 'ماتش صعب واتكسب، إيه رأيك في الأداء؟', a: [
      { tone: 'humble', text: 'كسبنا بصعوبة، لسه عندنا حاجات لازم نصلّحها.', fx: { board: 2, fans: 1, morale: 1, rep: 1 }, reply: 'الإدارة بتحب مدرب بيشوف العيوب.' },
      { tone: 'bold', text: 'المهم 3 نقاط، والأداء هيتحسن مع الوقت.', fx: { board: 1, fans: 2, morale: 2, rep: 1 }, reply: 'إجابة محترفة.' },
      { tone: 'fire', text: 'الأداء كان ممتاز ومحدّش يقول غير كده.', fx: { board: 0, fans: 3, morale: 2, rep: 2 }, reply: 'الجمهور معاك والصحافة هتعلّق.' },
    ] },
    { q: 'الجمهور عاوز لقب، إنت مستعد للضغط؟', a: [
      { tone: 'humble', text: 'الضغط عادي في بلد كروي زي بلدنا.', fx: { board: 1, fans: 2, morale: 1, rep: 1 }, reply: 'رد ناضج.' },
      { tone: 'bold', text: 'الضغط بيطلّع أحسن ما عندنا.', fx: { board: 1, fans: 3, morale: 2, rep: 2 }, reply: 'اللاعيبة استمدّوا منك ثقة.' },
      { tone: 'fire', text: 'اللي مش قد الضغط ميبقاش في الملعب.', fx: { board: -1, fans: 3, morale: -1, rep: 2 }, reply: 'كلامك فيه رسالة للاعيبة.. وصلت بشدة.' },
    ] },
    { q: 'إيه اللي هتغيّره في الماتش الجاي؟', a: [
      { tone: 'humble', text: 'هراجع الفيديو مع الجهاز الفني وبعدين نقرر.', fx: { board: 2, fans: 1, morale: 1, rep: 1 }, reply: 'تحضير هادي.' },
      { tone: 'bold', text: 'هنفضل على نفس النهج مع تعديلات بسيطة.', fx: { board: 1, fans: 1, morale: 2, rep: 1 }, reply: 'استقرار.' },
      { tone: 'fire', text: 'هغيّر اللي مش مقتنع بيهم من غير ما أقول مين.', fx: { board: 0, fans: 1, morale: -3, rep: 1 }, reply: 'جو قلق في غرفة الملابس.' },
    ] },
  ],
  draw: [
    { q: 'تعادل، هل تعتبره نتيجة مرضية؟', a: [
      { tone: 'humble', text: 'مش مرضية بالكامل بس نقطة أحسن من لا شيء.', fx: { board: 1, fans: 0, morale: 1, rep: 0 }, reply: 'تواضع مفهوم.' },
      { tone: 'bold', text: 'كنا الأحسن وماقدرناش نكسب، هنعوّض.', fx: { board: 1, fans: 2, morale: 2, rep: 1 }, reply: 'ثقة جيدة.' },
      { tone: 'fire', text: 'الحكم والحظ ضدنا، نتيجتنا أحسن من كده.', fx: { board: -2, fans: 2, morale: 1, rep: -1 }, reply: 'الإدارة مش بتحب لوم الحكام.' },
    ] },
    { q: 'النتايج مش ثابتة الفترة اللي فاتت، ليه؟', a: [
      { tone: 'humble', text: 'مسؤوليتي، هشتغل على تثبيت الأداء.', fx: { board: 2, fans: 1, morale: 2, rep: 1 }, reply: 'أخدت المسؤولية بنفسك.' },
      { tone: 'bold', text: 'مرحلة بناء ولازم نصبر عليها.', fx: { board: 0, fans: 1, morale: 1, rep: 1 }, reply: 'الجمهور منقسم.' },
      { tone: 'fire', text: 'إصابات وظروف، محدّش يحمّلني الذنب.', fx: { board: -2, fans: -1, morale: -1, rep: -1 }, reply: 'الصحافة هتلاحقك بالموضوع.' },
    ] },
  ],
  loss: [
    { q: 'خسارة صعبة، هتستقيل لو النتايج استمرت كده؟', a: [
      { tone: 'humble', text: 'أنا مسؤول عن الخسارة وهصلّح الأخطاء.', fx: { board: 2, fans: 2, morale: 2, rep: 1 }, reply: 'المسؤولية مكسبة حتى في الخسارة.' },
      { tone: 'bold', text: 'الاستقالة مش في قاموسي، هنرجع أقوى.', fx: { board: 0, fans: 2, morale: 3, rep: 1 }, reply: 'اللاعيبة استمدوا منك قوة.' },
      { tone: 'fire', text: 'اللي عاوز ياخد مكاني يتفضل.', fx: { board: -3, fans: -1, morale: 0, rep: -1 }, reply: 'إجابة متحدّية.. الإدارة مش مرتاحة.' },
    ] },
    { q: 'مين مسؤول عن الخسارة بالنسبة لك؟', a: [
      { tone: 'humble', text: 'أنا أولهم، التشكيل والخطة مسؤوليتي.', fx: { board: 2, fans: 2, morale: 3, rep: 1 }, reply: 'اللاعيبة اتحمسوا ليك أكتر.' },
      { tone: 'bold', text: 'كلنا شركاء في الخسارة وكلنا هنصلّح.', fx: { board: 1, fans: 1, morale: 2, rep: 1 }, reply: 'روح الفريق الواحد.' },
      { tone: 'fire', text: 'فيه لاعيبة ماكانوش على قد المسؤولية.', fx: { board: -1, fans: 0, morale: -5, rep: -1 }, reply: 'غرفة الملابس مش راضية عن كلامك.' },
    ] },
    { q: 'الجمهور غضبان، رسالتك ليهم؟', a: [
      { tone: 'humble', text: 'معاهم حق وأعدهم بإننا هنرجّع الفرحة.', fx: { board: 1, fans: 4, morale: 1, rep: 1 }, reply: 'الجمهور هدي شوية.' },
      { tone: 'bold', text: 'اصبروا علينا، الصورة هتتغير قريب.', fx: { board: 1, fans: 2, morale: 1, rep: 1 }, reply: 'طلب صبر معقول.' },
      { tone: 'fire', text: 'الدعم بيبان وقت الشدة مش وقت الفوز بس.', fx: { board: 0, fans: -3, morale: 0, rep: 0 }, reply: 'ناس شافت كلامك لوم للجمهور.' },
    ] },
  ],
  heavyloss: [
    { q: 'هزيمة ثقيلة النهارده، إيه اللي حصل؟', a: [
      { tone: 'humble', text: 'هزيمة مؤلمة وأعتذر للجمهور، هنراجع كل حاجة.', fx: { board: 2, fans: 3, morale: 1, rep: 1 }, reply: 'اعتذارك خفّف الغضب.' },
      { tone: 'bold', text: 'يوم سيئ يحصل، هنتجاوزه بالشغل.', fx: { board: -1, fans: 0, morale: 2, rep: 0 }, reply: 'الصحافة شايفة إنك بتقلل من الموضوع.' },
      { tone: 'fire', text: 'الحكم والتوفيق ضدنا والنتيجة ماتعبّرش عننا.', fx: { board: -4, fans: -3, morale: -1, rep: -2 }, reply: 'الجمهور والإدارة غاضبين من الأعذار.' },
    ] },
    { q: 'مستقبلك مع الفريق في خطر، رد فعلك؟', a: [
      { tone: 'humble', text: 'القرار للإدارة وأنا مستعد لأي نتيجة.', fx: { board: 2, fans: 1, morale: 0, rep: 1 }, reply: 'احترام للإدارة.' },
      { tone: 'bold', text: 'عندي ثقة إني أقدر أصلّح الوضع.', fx: { board: 0, fans: 1, morale: 2, rep: 1 }, reply: 'ثقة مطلوبة.' },
      { tone: 'fire', text: 'مش هستقيل ومحدّش هيبعدني.', fx: { board: -4, fans: -1, morale: 0, rep: -1 }, reply: 'الإدارة اتضايقت من التحدي.' },
    ] },
    { q: 'هتعمل تغييرات كبيرة في التشكيل؟', a: [
      { tone: 'humble', text: 'هنقيّم الوضع وناخد القرار الصح.', fx: { board: 1, fans: 1, morale: 1, rep: 1 }, reply: 'رد متزن.' },
      { tone: 'bold', text: 'أكيد، فرصة للي يستاهل.', fx: { board: 1, fans: 2, morale: 1, rep: 1 }, reply: 'اللاعيبة البدلاء اتحمسوا.' },
      { tone: 'fire', text: 'هقلب الفريق كله مفيش أسماء كبيرة.', fx: { board: -1, fans: 1, morale: -4, rep: 0 }, reply: 'النجوم مستاءين من كلامك.' },
    ] },
  ],
};

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function pickQs(kind: Kind, seed: string, opp: string): Question[] {
  // 3 questions per conference: 2 about the result (from a big pool) + 1 general. Seeded by fixture, but offset by the
  // time so two conferences after similar results are never the same.
  const h = hash(seed) + (Date.now() % 997);
  const kindPool = [...BANK[kind], ...(EXTRA[kind] || [])];
  const pickFrom = (pool: Question[], n: number, off: number) => {
    const p = pool.slice();
    const res: Question[] = [];
    for (let i = 0; i < Math.min(n, p.length); i++) res.push(p.splice((h * (i + 3) + off + i * 11) % p.length, 1)[0]);
    return res;
  };
  const out = [...pickFrom(kindPool, 2, 0), ...pickFrom(GENERAL as Question[], 1, 5)];
  const fill = (t: string) => t.split('{opp}').join(opp);
  return out.map(q => ({ q: fill(q.q), a: q.a.map(a => ({ ...a, text: fill(a.text), reply: fill(a.reply) })) }));
}

interface Props { fixture: Fixture; onClose: () => void }

export const PressConferenceModal: React.FC<Props> = ({ fixture, onClose }) => {
  const { userClub, teams, applyPressEffects } = useGame();
  const isHome = userClub?.id === fixture.homeTeamId;
  const my = (isHome ? fixture.homeScore : fixture.awayScore) ?? 0;
  const op = (isHome ? fixture.awayScore : fixture.homeScore) ?? 0;
  const oppId = isHome ? fixture.awayTeamId : fixture.homeTeamId;
  const oppName = teams.find(t => t.id === oppId)?.name || 'الخصم';
  const kind: Kind = my - op >= 3 ? 'bigwin' : my > op ? 'win' : my === op ? 'draw' : op - my >= 3 ? 'heavyloss' : 'loss';
  const qs = useMemo(() => pickQs(kind, fixture.id, oppName), [kind, fixture.id, oppName]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Answer | null>(null);
  const [total, setTotal] = useState({ board: 0, fans: 0, morale: 0, rep: 0 });
  const [done, setDone] = useState(false);

  const choose = (a: Answer) => {
    if (picked) return;
    setPicked(a);
    applyPressEffects(a.fx);
    setTotal(t => ({ board: t.board + a.fx.board, fans: t.fans + a.fx.fans, morale: t.morale + a.fx.morale, rep: t.rep + a.fx.rep }));
  };
  const next = () => {
    if (i + 1 >= qs.length) { setDone(true); return; }
    setI(i + 1); setPicked(null);
  };
  const sign = (n: number) => (n > 0 ? '+' + n : String(n));
  const chip = (label: string, n: number) => (
    <span key={label} className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${n > 0 ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : n < 0 ? 'text-rose-300 border-rose-500/40 bg-rose-500/10' : 'text-slate-400 border-slate-600 bg-slate-800'}`}>{label} {sign(n)}</span>
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300"><Mic className="w-4 h-4" /></div>
            <div>
              <h3 className="font-black text-white text-sm">المؤتمر الصحفي</h3>
              <p className="text-[11px] text-slate-400">بعد ماتش {userClub?.shortName || userClub?.name} ({my}-{op}) أمام {oppName}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="تخطي" className="p-1.5 rounded-xl bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {!done ? (
          <>
            <div className="text-[11px] text-slate-500 mb-1">السؤال {i + 1} من {qs.length}</div>
            <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-3 mb-3 text-sm font-bold text-white leading-relaxed">🎙️ {qs[i].q}</div>
            <div className="space-y-2">
              {qs[i].a.map((a, k) => {
                const sel = picked === a;
                return (
                  <button key={k} disabled={!!picked} onClick={() => choose(a)}
                    className={`w-full text-right p-3 rounded-2xl border transition-all ${sel ? 'bg-emerald-950/70 border-emerald-500' : picked ? 'opacity-40 bg-slate-800/40 border-slate-700' : 'bg-slate-800/60 border-slate-700 active:scale-[.98]'}`}>
                    <div className="text-[11px] font-bold text-amber-300 mb-0.5">{TONE_LABEL[a.tone]}</div>
                    <div className="text-sm text-slate-100 leading-relaxed">{a.text}</div>
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-slate-300 bg-slate-800/60 rounded-xl p-2.5">📰 {picked.reply}</div>
                <div className="flex flex-wrap gap-1.5">{chip('الإدارة', picked.fx.board)}{chip('الجماهير', picked.fx.fans)}{chip('معنويات الفريق', picked.fx.morale)}{chip('سمعتك', picked.fx.rep)}</div>
                <button onClick={next} className="w-full py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-1.5">
                  {i + 1 >= qs.length ? 'إنهاء المؤتمر' : 'السؤال التالي'} <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
            {!picked && <button onClick={onClose} className="w-full mt-3 py-2.5 text-xs text-slate-400">تخطّى المؤتمر الصحفي</button>}
          </>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-300"><Check className="w-6 h-6" /></div>
            <div className="font-black text-white">خلص المؤتمر الصحفي</div>
            <div className="flex flex-wrap justify-center gap-1.5">{chip('الإدارة', total.board)}{chip('الجماهير', total.fans)}{chip('معنويات الفريق', total.morale)}{chip('سمعتك', total.rep)}</div>
            <button onClick={onClose} className="w-full py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm">تمام</button>
          </div>
        )}
      </div>
    </div>
  );
};
