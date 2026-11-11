// Visual identity of every continental competition (Tailwind classes are written out in full so they are generated).
export interface CompTheme {
  emoji: string;
  trophy: string;
  tagline: string;
  stars: number;           // prestige 1..5
  hero: string;            // header background
  accentText: string;
  accentBorder: string;
  accentSoft: string;      // soft tinted card background
  button: string;          // primary button
  chipActive: string;
}

const T = (t: CompTheme) => t;

export const COMP_THEMES: Record<string, CompTheme> = {
  ucl: T({ emoji: '⭐', trophy: '🏆', tagline: 'نخبة أندية أوروبا • الكأس ذات الأذنين', stars: 5,
    hero: 'bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-950', accentText: 'text-sky-300', accentBorder: 'border-sky-400/50',
    accentSoft: 'bg-sky-500/10', button: 'bg-sky-400 text-slate-950', chipActive: 'bg-sky-400 text-slate-950' }),
  uel: T({ emoji: '🔥', trophy: '🏆', tagline: 'الدوري الأوروبي • بطولة المنافسة الشرسة', stars: 3,
    hero: 'bg-gradient-to-br from-orange-900 via-amber-900 to-slate-950', accentText: 'text-orange-300', accentBorder: 'border-orange-400/50',
    accentSoft: 'bg-orange-500/10', button: 'bg-orange-400 text-slate-950', chipActive: 'bg-orange-400 text-slate-950' }),
  ccl: T({ emoji: '🌍', trophy: '🏆', tagline: 'قمة الكرة الأفريقية • البطولة الأغلى في القارة', stars: 4,
    hero: 'bg-gradient-to-br from-emerald-950 via-green-900 to-slate-950', accentText: 'text-amber-300', accentBorder: 'border-amber-400/50',
    accentSoft: 'bg-amber-500/10', button: 'bg-amber-400 text-slate-950', chipActive: 'bg-amber-400 text-slate-950' }),
  ccc: T({ emoji: '🦅', trophy: '🏆', tagline: 'كأس الكونفدرالية • فرصة جديدة للمجد القاري', stars: 2,
    hero: 'bg-gradient-to-br from-teal-950 via-cyan-900 to-slate-950', accentText: 'text-teal-300', accentBorder: 'border-teal-400/50',
    accentSoft: 'bg-teal-500/10', button: 'bg-teal-400 text-slate-950', chipActive: 'bg-teal-400 text-slate-950' }),
  acl: T({ emoji: '🐉', trophy: '🏆', tagline: 'نخبة آسيا • أقوى أندية القارة الصفراء', stars: 4,
    hero: 'bg-gradient-to-br from-rose-950 via-red-900 to-slate-950', accentText: 'text-rose-300', accentBorder: 'border-rose-400/50',
    accentSoft: 'bg-rose-500/10', button: 'bg-rose-400 text-slate-950', chipActive: 'bg-rose-400 text-slate-950' }),
  acl2: T({ emoji: '🌸', trophy: '🏆', tagline: 'دوري أبطال آسيا 2 • طريقك لنخبة آسيا', stars: 2,
    hero: 'bg-gradient-to-br from-fuchsia-950 via-purple-900 to-slate-950', accentText: 'text-fuchsia-300', accentBorder: 'border-fuchsia-400/50',
    accentSoft: 'bg-fuchsia-500/10', button: 'bg-fuchsia-400 text-slate-950', chipActive: 'bg-fuchsia-400 text-slate-950' }),
  lib: T({ emoji: '🔱', trophy: '🏆', tagline: 'كوبا ليبرتادوريس • حرب القارة اللاتينية', stars: 4,
    hero: 'bg-gradient-to-br from-yellow-900 via-lime-950 to-slate-950', accentText: 'text-yellow-300', accentBorder: 'border-yellow-400/50',
    accentSoft: 'bg-yellow-500/10', button: 'bg-yellow-400 text-slate-950', chipActive: 'bg-yellow-400 text-slate-950' }),
  sud: T({ emoji: '🌎', trophy: '🏆', tagline: 'كوبا سودأمريكانا • كأس أمريكا الجنوبية', stars: 3,
    hero: 'bg-gradient-to-br from-sky-950 via-blue-900 to-slate-950', accentText: 'text-cyan-300', accentBorder: 'border-cyan-400/50',
    accentSoft: 'bg-cyan-500/10', button: 'bg-cyan-400 text-slate-950', chipActive: 'bg-cyan-400 text-slate-950' }),
  cwc: T({ emoji: '👑', trophy: '🏆', tagline: 'كأس العالم للأندية • أبطال القارات وجهاً لوجه', stars: 5,
    hero: 'bg-gradient-to-br from-amber-700 via-purple-950 to-slate-950', accentText: 'text-amber-200', accentBorder: 'border-amber-300/60',
    accentSoft: 'bg-amber-400/10', button: 'bg-gradient-to-l from-amber-300 to-yellow-500 text-slate-950', chipActive: 'bg-amber-300 text-slate-950' }),
};

export const DEFAULT_THEME: CompTheme = COMP_THEMES.ccl;
export const themeOf = (compId?: string): CompTheme => (compId && COMP_THEMES[compId]) || DEFAULT_THEME;
