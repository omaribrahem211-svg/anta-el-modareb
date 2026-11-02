import React, { useMemo, useState } from 'react';
import { X, Handshake, TrendingUp } from 'lucide-react';
import { Player } from '../types/game';
import { useGame } from '../context/GameContext';
import { ModalPortal } from './common/ModalPortal';
import type { SaleOfferResult } from '../utils/transferEngine';

interface Props {
  player: Player;
  onClose: () => void;
  onSold?: (message: string) => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const SellNegotiationModal: React.FC<Props> = ({ player, onClose, onSold }) => {
  const { sellPlayer, evaluatePlayerSale } = useGame() as any;
  const fair = Math.max(25000, Math.round(player.marketValue || 50000));
  const [ask, setAsk] = useState<number>(fair);
  const [result, setResult] = useState<SaleOfferResult | null>(null);
  const [error, setError] = useState<string>('');

  const pct = useMemo(() => Math.round((ask / fair - 1) * 100), [ask, fair]);

  const submit = () => {
    setError('');
    const r: SaleOfferResult | null = evaluatePlayerSale(player.id, ask);
    setResult(r);
  };

  const completeSale = (fee: number) => {
    const res = sellPlayer(player.id, { fee });
    if (res.success) {
      onSold?.(res.message);
      onClose();
    } else {
      setError(res.message);
      setResult(null);
    }
  };

  const presets: { label: string; mult: number }[] = [
    { label: 'سريع -10%', mult: 0.9 },
    { label: 'سعر السوق', mult: 1 },
    { label: '+10%', mult: 1.1 },
    { label: '+20%', mult: 1.2 },
    { label: '+35%', mult: 1.35 },
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl" onClick={onClose}>
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <Handshake className="w-4 h-4" /> تفاوض على بيع اللاعب
              </div>
              <div className="text-white font-bold mt-1">{player.name}</div>
              <div className="text-[11px] text-slate-400">تقييم {player.overallRating} • عمر {player.age}</div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 flex justify-between">
            <span>القيمة السوقية</span>
            <span className="font-black text-emerald-300">{fmt(fair)} ج.م</span>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> السعر الذي تطلبه
              <span className={`mr-auto font-black ${pct > 0 ? 'text-amber-300' : 'text-slate-300'}`}>{pct > 0 ? `+${pct}%` : `${pct}%`}</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={ask || ''}
              onChange={e => { setAsk(Math.max(0, Number(e.target.value) || 0)); setResult(null); }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-black text-center"
            />
            <div className="flex gap-1.5 flex-wrap">
              {presets.map(p => (
                <button key={p.label} type="button" onClick={() => { setAsk(Math.round(fair * p.mult)); setResult(null); }}
                  className="flex-1 min-w-[56px] text-[11px] font-bold bg-slate-800 border border-slate-700 rounded-lg py-1.5 text-slate-200">
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              الأندية بتدفع أكتر للاعب الشاب الموهوب أو لو محتاجاه، وأقل للاعب الكبير أو اللي عقده قرب يخلص. السعر المبالغ فيه بيترفض.
            </p>
          </div>

          {result && (
            <div className={`rounded-2xl p-3 text-xs border ${
              result.status === 'accepted' ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
              : result.status === 'counter' ? 'bg-amber-950/40 border-amber-700 text-amber-200'
              : 'bg-red-950/40 border-red-800 text-red-200'}`}>
              {result.message}
            </div>
          )}
          {error && <div className="rounded-2xl p-3 text-xs border bg-red-950/40 border-red-800 text-red-200">{error}</div>}

          {!result && (
            <button onClick={submit} disabled={ask <= 0} className="w-full bg-amber-400 text-slate-950 font-black py-3 rounded-2xl disabled:opacity-40">
              اعرض اللاعب بهذا السعر
            </button>
          )}
          {result?.status === 'accepted' && (
            <button onClick={() => completeSale(result.fee)} className="w-full bg-emerald-500 text-slate-950 font-black py-3 rounded-2xl">
              إتمام البيع بـ {fmt(result.fee)} ج.م
            </button>
          )}
          {result?.status === 'counter' && (
            <div className="flex gap-2">
              <button onClick={() => completeSale(result.fee)} className="flex-1 bg-amber-400 text-slate-950 font-black py-3 rounded-2xl">
                اقبل {fmt(result.fee)}
              </button>
              <button onClick={() => setResult(null)} className="flex-1 bg-slate-800 text-slate-200 font-bold py-3 rounded-2xl border border-slate-700">
                عدّل السعر
              </button>
            </div>
          )}
          {result?.status === 'rejected' && (
            <button onClick={() => setResult(null)} className="w-full bg-slate-800 text-slate-200 font-bold py-3 rounded-2xl border border-slate-700">
              عدّل السعر
            </button>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
