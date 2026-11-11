import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player } from '../types/game';
import { YouthAcademyModal } from './YouthAcademyModal';
import { StaffManagementCard } from './StaffManagementCard';
import { getPositionArabic } from '../utils/positionHelper';
import { Hero, StatTile, SegTabs, Panel, Meter, LevelPips, RatingPlate, Toast, useToast, type Tone } from './common/ProUI';
import {
  Dumbbell,
  Zap,
  Activity,
  Sparkles,
  Heart,
  TrendingUp,
  GraduationCap,
  Calendar,
  Play,
  Search,
  Flame,
  HeartPulse,
  Clock,
  Users,
  ClipboardList,
  Wand2,
} from 'lucide-react';

interface TrainingTabProps {
  onSelectPlayer: (player: Player) => void;
}

type SubTab = 'today' | 'squad' | 'staff';
type PosFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD' | 'U21';
type Focus = NonNullable<Player['trainingFocus']>;

const FOCUS_OPTIONS: { id: Focus; label: string; icon: string }[] = [
  { id: 'general', label: 'شامل', icon: '🔄' },
  { id: 'fitness', label: 'لياقة', icon: '🏃' },
  { id: 'shooting', label: 'تسديد', icon: '🎯' },
  { id: 'passing', label: 'تمرير', icon: '⚽' },
  { id: 'dribbling', label: 'مراوغة', icon: '🎨' },
  { id: 'defending', label: 'دفاع', icon: '🛡️' },
  { id: 'goalkeeping', label: 'حراسة', icon: '🧤' },
];

const INTENSITIES: { id: 'recovery' | 'normal' | 'high'; label: string; desc: string; tone: Tone; icon: React.ReactNode; note: string }[] = [
  { id: 'recovery', label: 'استشفاء', desc: 'راحة واستعادة اللياقة', tone: 'sky', icon: <Heart className="w-5 h-5" />, note: 'تطور أبطأ • إصابات أقل' },
  { id: 'normal', label: 'متوازن', desc: 'تطور فني وبدني مستقر', tone: 'emerald', icon: <Activity className="w-5 h-5" />, note: 'الخيار الآمن' },
  { id: 'high', label: 'مكثف', desc: 'تطور سريع بإجهاد أعلى', tone: 'rose', icon: <Flame className="w-5 h-5" />, note: 'تطور أسرع • خطر إجهاد' },
];

const ratingTone = (r: number): Tone => (r >= 80 ? 'amber' : r >= 70 ? 'emerald' : r >= 60 ? 'sky' : 'slate');
const fitnessTone = (f: number): Tone => (f > 80 ? 'emerald' : f > 65 ? 'amber' : 'rose');

const DEF_POS = ['CB', 'LB', 'RB', 'LWB', 'RWB'];
const MID_POS = ['CDM', 'CM', 'CAM', 'LM', 'RM'];
const FWD_POS = ['RW', 'LW', 'ST', 'CF'];

export const TrainingTab: React.FC<TrainingTabProps> = ({ onSelectPlayer }) => {
  const {
    userClub,
    manager,
    setPlayerTrainingFocus,
    trainingIntensity,
    setTrainingIntensity,
    developmentPoints,
    boostPlayerOverall,
    dayAdvanceSummary,
    advanceToNextDay,
    calendarDate,
    isMatchDay,
    daysUntilNextMatch,
  } = useGame();

  const { toast, show } = useToast();
  const [subTab, setSubTab] = useState<SubTab>('today');
  const [isYouthAcademyOpen, setIsYouthAcademyOpen] = useState(false);
  const [positionFilter, setPositionFilter] = useState<PosFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const players: Player[] = Array.isArray(userClub?.players) ? (userClub!.players as Player[]) : [];

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return players
      .filter(p => {
        if (q && !(p.name || '').toLowerCase().includes(q) && !(p.nickname || '').toLowerCase().includes(q)) return false;
        switch (positionFilter) {
          case 'GK': return p.position === 'GK';
          case 'DEF': return DEF_POS.includes(p.position);
          case 'MID': return MID_POS.includes(p.position);
          case 'FWD': return FWD_POS.includes(p.position);
          case 'U21': return p.age <= 21;
          default: return true;
        }
      })
      .sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
  }, [players, searchQuery, positionFilter]);

  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">🏋️</div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا توجد منشآت تدريبية أو لاعبين تحت إشرافك حالياً. اختر نادياً من الشواغر التدريبية في تبويب المسيرة لبدء تطوير مواهبه!
        </p>
      </div>
    );
  }

  const dev = Number(developmentPoints) || 0;
  const trainingLevel = userClub.facilities?.trainingGroundLevel || 1;
  const growthReports = dayAdvanceSummary?.trainingReports?.filter(r => r.type === 'growth') || [];
  const otherReports = dayAdvanceSummary?.trainingReports?.filter(r => r.type !== 'growth') || [];
  const injuries = dayAdvanceSummary?.injuryUpdates || [];
  const hasReports = growthReports.length > 0 || otherReports.length > 0 || injuries.length > 0;
  const growthIds = new Set(growthReports.map(r => r.playerId));
  const avgFitness = players.length
    ? Math.round(players.reduce((s, p) => s + (typeof p.fitness === 'number' ? p.fitness : 100), 0) / players.length)
    : 100;
  const injuredCount = players.filter(p => p.isInjured || (p.injury && p.injury.daysRemaining > 0)).length;

  const applyIntensity = (id: 'recovery' | 'normal' | 'high') => {
    setTrainingIntensity(id);
    show(
      id === 'high'
        ? 'تم تفعيل حمل تدريبي مكثف: تطور أسرع مع زيادة الإجهاد.'
        : id === 'recovery'
        ? 'تم تفعيل برنامج استشفاء لاستعادة الجاهزية وتقليل الإصابات.'
        : 'تم تطبيق برنامج تدريبي متوازن.'
    );
  };

  const runSession = () => {
    if (isMatchDay) {
      show('⚠️ اليوم موعد مباراة رسمية! توجه لتبويب المباريات لخوض اللقاء أولاً.', false);
      return;
    }
    advanceToNextDay(false);
    show('✅ تم إجراء الحصة التدريبية وتحديث التقرير.');
  };

  const autoAssign = () => {
    let changed = 0;
    players.forEach(p => {
      let focus: Focus = 'general';
      if (p.position === 'GK') focus = 'goalkeeping';
      else if (DEF_POS.includes(p.position)) focus = 'defending';
      else if (['CM', 'CDM'].includes(p.position)) focus = 'passing';
      else if (['CAM', 'RW', 'LW', 'LM', 'RM'].includes(p.position)) focus = 'dribbling';
      else if (['ST', 'CF'].includes(p.position)) focus = 'shooting';
      if ((typeof p.fitness === 'number' ? p.fitness : 100) < 70) focus = 'fitness';
      if ((p.trainingFocus || 'general') !== focus) {
        setPlayerTrainingFocus(p.id, focus);
        changed++;
      }
    });
    show(changed > 0 ? `تم ضبط التخصص الأمثل تلقائياً لـ ${changed} لاعباً حسب مراكزهم وجاهزيتهم.` : 'التخصصات مضبوطة بالفعل بشكل مثالي.');
  };

  const quickBoost = (p: Player) => {
    if (dev < 50) {
      show(`تحتاج 50 نقطة تطوير على الأقل (لديك ${dev}).`, false);
      return;
    }
    const res = boostPlayerOverall(p.id);
    show(res.message, res.success);
  };

  const tabs = [
    { id: 'today' as const, label: 'حصة اليوم', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'squad' as const, label: 'اللاعبون', icon: <Users className="w-3.5 h-3.5" />, badge: players.length },
    { id: 'staff' as const, label: 'الجهاز والأكاديمية', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3 pb-20 animate-fade-in" dir="rtl">
      <Toast toast={toast} />

      {/* HERO */}
      <Hero accent="#10b981">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-lg text-white leading-tight">مركز التدريب</h2>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
              <span>ملاعب التدريب</span>
              <LevelPips level={trainingLevel} tone="emerald" />
              <span className="font-mono text-emerald-300">{trainingLevel}/5</span>
            </div>
          </div>
          <div className="text-left shrink-0">
            <div className="flex items-center gap-1 justify-end text-amber-300 font-black font-mono text-xl leading-none">
              <Zap className="w-4 h-4" />
              <span>{dev}</span>
            </div>
            <span className="text-[10px] text-slate-400">نقاط التطوير</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile
            label="المباراة القادمة"
            tone={isMatchDay ? 'amber' : 'sky'}
            icon={<Clock className="w-3 h-3" />}
            value={isMatchDay ? 'اليوم' : `${daysUntilNextMatch ?? '-'} يوم`}
          />
          <StatTile label="متوسط الجاهزية" tone={fitnessTone(avgFitness)} icon={<Activity className="w-3 h-3" />} value={`${avgFitness}%`} />
          <StatTile label="المصابون" tone={injuredCount > 0 ? 'rose' : 'emerald'} icon={<HeartPulse className="w-3 h-3" />} value={injuredCount} sub={injuredCount > 0 ? 'يحتاجون رعاية' : 'الجميع جاهز'} />
          <StatTile label="التاريخ" tone="slate" icon={<Calendar className="w-3 h-3" />} value={<span className="text-sm">{calendarDate?.formattedArabic || '—'}</span>} />
        </div>
      </Hero>

      <SegTabs tabs={tabs} value={subTab} onChange={setSubTab} tone="emerald" />

      {/* TODAY */}
      {subTab === 'today' && (
        <div className="space-y-3">
          <Panel title="مستوى الحمل التدريبي" icon={<Flame className="w-4 h-4" />} tone="emerald">
            <div className="grid grid-cols-3 gap-2">
              {INTENSITIES.map(opt => {
                const active = trainingIntensity === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => applyIntensity(opt.id)}
                    aria-pressed={active}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${
                      active
                        ? 'border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400/50 shadow-lg shadow-emerald-500/10'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'
                    }`}
                  >
                    <div className={`mx-auto mb-1.5 ${active ? 'text-emerald-300' : 'text-slate-400'} flex justify-center`}>{opt.icon}</div>
                    <div className={`font-black text-sm ${active ? 'text-white' : 'text-slate-300'}`}>{opt.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
                    <div className="text-[9px] mt-1.5 text-slate-500">{opt.note}</div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={runSession}
              disabled={isMatchDay}
              className={`mt-4 w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isMatchDay
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isMatchDay ? 'اليوم يوم مباراة — توجه للمباريات' : 'إجراء حصة اليوم'}</span>
            </button>
            <p className="mt-2 text-[11px] text-slate-500 text-center">الحصة تُنهي اليوم وتطور مهارات اللاعبين تدريجياً وتزيد الانسجام.</p>
          </Panel>

          <Panel
            title="تقرير آخر حصة"
            icon={<Sparkles className="w-4 h-4" />}
            tone="amber"
            right={<span className="text-[10px] text-slate-400">{dayAdvanceSummary?.formattedArabicDate || 'لا يوجد تقرير بعد'}</span>}
          >
            {hasReports ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <StatTile label="تطورات (+1)" tone="emerald" icon={<TrendingUp className="w-3 h-3" />} value={growthReports.length} />
                  <StatTile label="الحمل" tone="sky" icon={<Activity className="w-3 h-3" />} value={<span className="text-sm">{trainingIntensity === 'recovery' ? 'استشفاء' : trainingIntensity === 'high' ? 'مكثف' : 'متوازن'}</span>} />
                  <StatTile label="إصابات" tone={injuries.length ? 'rose' : 'emerald'} icon={<HeartPulse className="w-3 h-3" />} value={injuries.length} />
                </div>

                {growthReports.length > 0 && (
                  <ul className="space-y-1.5">
                    {growthReports.map((rep, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 bg-emerald-500/5 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs">
                        <span className="text-slate-100 font-bold break-words min-w-0">🌟 {rep.changeText}</span>
                        <span className="text-[10px] font-black text-emerald-300 shrink-0">ترقية ⚡</span>
                      </li>
                    ))}
                  </ul>
                )}

                {injuries.length > 0 && (
                  <ul className="space-y-1.5">
                    {injuries.map((inj, i) => (
                      <li
                        key={i}
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs border ${
                          inj.recovered ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/5 border-rose-500/30 text-rose-200'
                        }`}
                      >
                        <span className="font-bold min-w-0 break-words">{inj.recovered ? '🩹' : '🏥'} {inj.text}</span>
                        <span className="text-[10px] font-black shrink-0">{inj.recovered ? 'تعافى' : 'تحت العلاج'}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {otherReports.length > 0 && (
                  <ul className="space-y-1">
                    {otherReports.map((rep, i) => (
                      <li key={i} className="text-[11px] text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">{rep.changeText}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-1.5">
                <div className="text-3xl">📋</div>
                <div className="font-black text-sm text-white">جاهز للحصة الأولى</div>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">اختر مستوى الحمل ثم اضغط «إجراء حصة اليوم» لتظهر تفاصيل التطور هنا.</p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* SQUAD */}
      {subTab === 'squad' && (
        <Panel
          title="التخصص الفردي"
          icon={<Users className="w-4 h-4" />}
          tone="emerald"
          right={
            <button
              onClick={autoAssign}
              className="flex items-center gap-1.5 text-[11px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 cursor-pointer active:scale-95"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>توزيع ذكي</span>
            </button>
          }
        >
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1">
                {([
                  ['ALL', 'الكل'], ['GK', 'حراس'], ['DEF', 'دفاع'], ['MID', 'وسط'], ['FWD', 'هجوم'], ['U21', '≤21'],
                ] as [PosFilter, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setPositionFilter(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                      positionFilter === id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم اللاعب..."
                  className="w-full sm:w-44 bg-slate-950 border border-slate-800 rounded-xl pr-8 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {filteredPlayers.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">لا يوجد لاعبون يطابقون البحث.</div>
            ) : (
              <ul className="space-y-2">
                {filteredPlayers.map(p => {
                  const focus: Focus = p.trainingFocus || 'general';
                  const fitness = typeof p.fitness === 'number' ? p.fitness : 100;
                  const morale = typeof p.morale === 'number' ? p.morale : 85;
                  const progress = Math.min(100, Math.round(p.trainingProgress || 0));
                  const grew = growthIds.has(p.id);
                  const open = expandedId === p.id;
                  const focusMeta = FOCUS_OPTIONS.find(f => f.id === focus) || FOCUS_OPTIONS[0];
                  const injured = p.isInjured || Boolean(p.injury && p.injury.daysRemaining > 0);

                  return (
                    <li
                      key={p.id}
                      className={`rounded-xl border bg-slate-950/70 transition-colors ${grew ? 'border-emerald-500/60' : 'border-slate-800'}`}
                    >
                      <div className="flex items-center gap-3 p-2.5">
                        <RatingPlate value={p.overallRating} label={p.position} tone={ratingTone(p.overallRating)} />
                        <button onClick={() => onSelectPlayer(p)} className="min-w-0 flex-1 text-right cursor-pointer">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-white break-words leading-tight">{p.name}</span>
                            {grew && <span className="text-[9px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded px-1.5">تطور ⭐</span>}
                            {injured && <span className="text-[9px] font-black text-rose-300 bg-rose-500/10 border border-rose-500/40 rounded px-1.5">مصاب</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {getPositionArabic(p.position)} • {p.age} سنة • سقف <span className="text-emerald-400 font-bold">{p.potentialRating || p.overallRating}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1"><Meter value={progress} tone="emerald" height={4} /></div>
                            <span className="text-[9px] font-mono text-slate-400">{progress}%</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setExpandedId(open ? null : p.id)}
                          aria-expanded={open}
                          className={`shrink-0 text-[11px] font-black px-2.5 py-2 rounded-lg border cursor-pointer ${
                            open ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 text-emerald-300 border-slate-700'
                          }`}
                        >
                          {focusMeta.icon} {focusMeta.label}
                        </button>
                      </div>

                      {open && (
                        <div className="border-t border-slate-800 p-3 space-y-3 bg-slate-900/40">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <div className="flex justify-between text-slate-400 mb-1"><span>الجاهزية</span><span className={`font-mono font-bold ${fitnessTone(fitness) === 'emerald' ? 'text-emerald-400' : fitnessTone(fitness) === 'amber' ? 'text-amber-400' : 'text-rose-400'}`}>{fitness}%</span></div>
                              <Meter value={fitness} tone={fitnessTone(fitness)} />
                            </div>
                            <div>
                              <div className="flex justify-between text-slate-400 mb-1"><span>المعنويات</span><span className="font-mono font-bold text-white">{morale}%</span></div>
                              <Meter value={morale} tone="violet" />
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-bold text-slate-300 mb-1.5">التخصص الفردي</div>
                            <div className="flex flex-wrap gap-1.5">
                              {FOCUS_OPTIONS.filter(f => f.id !== 'goalkeeping' || p.position === 'GK').map(f => (
                                <button
                                  key={f.id}
                                  onClick={() => setPlayerTrainingFocus(p.id, f.id)}
                                  aria-pressed={focus === f.id}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border cursor-pointer active:scale-95 ${
                                    focus === f.id
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                                  }`}
                                >
                                  {f.icon} {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => quickBoost(p)}
                            className={`w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-2 border cursor-pointer active:scale-[0.98] ${
                              dev >= 50
                                ? 'bg-amber-500/15 text-amber-200 border-amber-500/50'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                            title="ترقية التقييم العام (+1) مقابل 50 نقطة تطوير"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>ترقية فورية (+1)</span>
                            <span className="font-mono text-[10px] opacity-80">50 ⚡</span>
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>
      )}

      {/* STAFF */}
      {subTab === 'staff' && (
        <div className="space-y-3">
          <button
            onClick={() => setIsYouthAcademyOpen(true)}
            className="w-full text-right bg-gradient-to-l from-amber-500/10 to-slate-900 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm text-amber-200">أكاديمية الناشئين</div>
              <div className="text-[11px] text-slate-400">{userClub.youthAcademyProspects?.length || 0} مواهب تحت المراقبة • تصعيد أو بيع</div>
            </div>
            <span className="text-[11px] font-black text-amber-300 shrink-0">دخول ↗</span>
          </button>

          <StaffManagementCard />
        </div>
      )}

      <YouthAcademyModal isOpen={isYouthAcademyOpen} onClose={() => setIsYouthAcademyOpen(false)} />
    </div>
  );
};
