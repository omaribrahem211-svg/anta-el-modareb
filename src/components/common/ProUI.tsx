import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Small shared UI kit used by the Club / Career / Training pages so they share one
 * "professional football game" look: angled hero banners, stat tiles, segmented tabs,
 * and a single toast that always appears at the top of the screen.
 */

export type Tone = 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'slate';

export const TONE: Record<Tone, { text: string; bg: string; border: string; bar: string; glow: string }> = {
  emerald: { text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'from-emerald-500 to-teal-400', glow: 'shadow-emerald-500/10' },
  amber: { text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'from-amber-500 to-yellow-300', glow: 'shadow-amber-500/10' },
  sky: { text: 'text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', bar: 'from-sky-500 to-cyan-300', glow: 'shadow-sky-500/10' },
  rose: { text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', bar: 'from-rose-500 to-orange-400', glow: 'shadow-rose-500/10' },
  violet: { text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', bar: 'from-violet-500 to-fuchsia-400', glow: 'shadow-violet-500/10' },
  slate: { text: 'text-slate-200', bg: 'bg-slate-800/60', border: 'border-slate-700', bar: 'from-slate-500 to-slate-300', glow: 'shadow-black/10' },
};

const ANGLED = 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))';

export const fmt = (n: number | undefined | null): string => Math.round(Number(n) || 0).toLocaleString('en-US');

/** Compact money format for tight tiles: 1.2M / 350K */
export const fmtShort = (n: number | undefined | null): string => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 10_000) return `${Math.round(v / 1000)}K`;
  return Math.round(v).toLocaleString('en-US');
};

/* ------------------------------ Toast ------------------------------ */

export interface ToastState {
  text: string;
  ok: boolean;
}

export function useToast(durationMs = 3500) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const show = useCallback((text: string, ok = true) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, ok });
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  return { toast, show };
}

export const Toast: React.FC<{ toast: ToastState | null }> = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className="fixed top-3 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none" dir="rtl">
      <div
        className={`pointer-events-auto max-w-md w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold shadow-2xl border backdrop-blur ${
          toast.ok ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/60' : 'bg-rose-950/95 text-rose-200 border-rose-500/60'
        }`}
        role="status"
      >
        {toast.ok ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
        <span className="leading-relaxed">{toast.text}</span>
      </div>
    </div>
  );
};

/* ------------------------------ Hero ------------------------------ */

export const Hero: React.FC<{
  accent?: string; // css color for the diagonal stripe
  children: React.ReactNode;
}> = ({ accent = '#10b981', children }) => (
  <div
    className="relative overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 sm:p-5"
    style={{ clipPath: ANGLED, borderRadius: 4 }}
  >
    <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} />
    <div
      className="absolute -top-16 -left-10 w-56 h-56 rounded-full opacity-20 blur-3xl pointer-events-none"
      style={{ background: accent }}
    />
    <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
      backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)',
    }} />
    <div className="relative">{children}</div>
  </div>
);

/* ------------------------------ Stat tile ------------------------------ */

export const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
}> = ({ label, value, sub, tone = 'slate', icon }) => {
  const t = TONE[tone];
  return (
    <div className={`relative border ${t.border} ${t.bg} px-3 py-2.5 min-w-0`} style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)', borderRadius: 2 }}>
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold tracking-wide">
        {icon && <span className={`${t.text} shrink-0`}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={`mt-0.5 font-black text-lg leading-tight font-mono tabular-nums truncate ${t.text}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{sub}</div>}
    </div>
  );
};

/* ------------------------------ Segmented tabs ------------------------------ */

export function SegTabs<T extends string>({
  tabs,
  value,
  onChange,
  tone = 'emerald',
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode; badge?: number | string }[];
  value: T;
  onChange: (id: T) => void;
  tone?: Tone;
}) {
  return (
    <div className="py-0.5">
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {tabs.map(tab => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={`flex-1 min-w-[84px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? `bg-gradient-to-b ${TONE[tone].bar} text-slate-950 shadow-lg`
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== 0 && (
                <span className={`text-[9px] px-1.5 rounded-full font-black ${active ? 'bg-slate-950/30 text-white' : 'bg-slate-700 text-slate-200'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Panel ------------------------------ */

export const Panel: React.FC<{
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, right, tone = 'slate', children, className = '' }) => {
  const t = TONE[tone];
  return (
    <section className={`bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      <header className={`flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-800 bg-gradient-to-l from-transparent ${tone === 'slate' ? 'to-slate-800/40' : t.bg}`}>
        <h3 className="flex items-center gap-2 font-black text-sm text-white min-w-0">
          {icon && <span className={`${t.text} shrink-0`}>{icon}</span>}
          <span className="truncate">{title}</span>
        </h3>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
};

/* ------------------------------ Meter ------------------------------ */

export const Meter: React.FC<{ value: number; max?: number; tone?: Tone; height?: number }> = ({ value, max = 100, tone = 'emerald', height = 6 }) => {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="w-full bg-slate-800 rounded-full overflow-hidden" style={{ height }}>
      <div className={`h-full rounded-full bg-gradient-to-r ${TONE[tone].bar} transition-[width] duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/** Level pips, e.g. 3 / 5 */
export const LevelPips: React.FC<{ level: number; max?: number; tone?: Tone }> = ({ level, max = 5, tone = 'amber' }) => (
  <div className="flex items-center gap-1" aria-label={`المستوى ${level} من ${max}`}>
    {Array.from({ length: max }).map((_, i) => (
      <span
        key={i}
        className={`h-1.5 w-5 rounded-sm ${i < level ? `bg-gradient-to-r ${TONE[tone].bar}` : 'bg-slate-800'}`}
      />
    ))}
  </div>
);

/** Big rating plate similar to a player-card overall box. */
export const RatingPlate: React.FC<{ value: number | string; label?: string; tone?: Tone }> = ({ value, label, tone = 'emerald' }) => (
  <div className={`w-12 h-14 border-2 ${TONE[tone].border} ${TONE[tone].bg} flex flex-col items-center justify-center shrink-0`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)' }}>
    <span className={`font-black text-lg leading-none font-mono ${TONE[tone].text}`}>{value}</span>
    {label && <span className="text-[8px] font-black text-slate-400 mt-0.5">{label}</span>}
  </div>
);
