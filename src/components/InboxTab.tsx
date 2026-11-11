import React, { useState, useMemo, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { InboxMessage, Player } from '../types/game';
import { calculateSuggestedRenewalWage } from '../utils/contractAlertEngine';
import { Hero, StatTile, SegTabs, Toast, useToast, TONE, Tone, fmt } from './common/ProUI';
import {
  Mail,
  MailOpen,
  Trash2,
  CheckCheck,
  AlertTriangle,
  FileSignature,
  DollarSign,
  Check,
  X,
  Flame,
  Search,
  ChevronDown,
  Inbox as InboxIcon,
  Newspaper,
  Landmark,
  Users,
  Binoculars,
  ArrowLeftRight,
  Wallet,
} from 'lucide-react';

type Filter = 'all' | 'action' | 'board' | 'news';
const PAGE_SIZE = 15;

/* Type → look & feel (tone, short label, icon) */
const typeMeta = (m: InboxMessage): { tone: Tone; label: string; icon: React.ReactNode } => {
  switch (m.type) {
    case 'contract':
      return m.priority === 'urgent'
        ? { tone: 'rose', label: 'عقد على وشك الانتهاء', icon: <AlertTriangle className="w-4 h-4" /> }
        : { tone: 'amber', label: 'تجديد عقد', icon: <FileSignature className="w-4 h-4" /> };
    case 'offer':
      return { tone: 'emerald', label: 'عرض شراء', icon: <Flame className="w-4 h-4" /> };
    case 'board':
      return { tone: 'rose', label: 'مجلس الإدارة', icon: <Landmark className="w-4 h-4" /> };
    case 'fan':
      return { tone: 'violet', label: 'الجماهير', icon: <Users className="w-4 h-4" /> };
    case 'transfer':
      return { tone: 'sky', label: 'سوق الانتقالات', icon: <ArrowLeftRight className="w-4 h-4" /> };
    case 'scout':
      return { tone: 'violet', label: 'الكشافة', icon: <Binoculars className="w-4 h-4" /> };
    case 'finance':
      return { tone: 'amber', label: 'المالية', icon: <Wallet className="w-4 h-4" /> };
    default:
      return { tone: 'slate', label: 'تقرير النادي', icon: <Newspaper className="w-4 h-4" /> };
  }
};

export const InboxTab: React.FC = () => {
  const {
    inbox,
    markMessageRead,
    deleteMessage,
    clearAllMessages,
    markAllMessagesRead,
    renewPlayerContract,
    acceptIncomingBid,
    rejectIncomingBid,
    listPlayerForTransfer,
    userClub,
  } = useGame();

  const messages: InboxMessage[] = Array.isArray(inbox) ? inbox : [];

  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { toast, show } = useToast(3500);

  // Renewal form state, keyed by player id
  const [wages, setWages] = useState<Record<string, number | string>>({});
  const [years, setYears] = useState<Record<string, number>>({});

  const playerMap = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of userClub?.players || []) if (p && p.id) map.set(p.id, p);
    return map;
  }, [userClub?.players]);

  /** Per-message derived state, computed once per inbox change. */
  const enriched = useMemo(() => {
    return messages.map(m => {
      const cPid = m.contractDetails?.playerId;
      const oPid = m.offerDetails?.playerId;
      const contractPending =
        m.type === 'contract' &&
        !m.contractDetails?.renewed &&
        m.actionTaken !== 'renewed' &&
        (!cPid || playerMap.has(cPid));
      const offerPending =
        m.type === 'offer' &&
        m.offerDetails?.type === 'player_bid' &&
        m.actionTaken !== 'accepted' &&
        m.actionTaken !== 'rejected' &&
        (!oPid || playerMap.has(oPid));
      return { m, pending: contractPending || offerPending, contractPending, offerPending };
    });
  }, [messages, playerMap]);

  const stats = useMemo(() => {
    let unread = 0, contracts = 0, offers = 0;
    for (const e of enriched) {
      if (!e.m.read) unread++;
      if (e.contractPending) contracts++;
      if (e.offerPending) offers++;
    }
    return { unread, contracts, offers, actions: contracts + offers };
  }, [enriched]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = enriched.filter(({ m, pending }) => {
      if (filter === 'action' && !pending) return false;
      if (filter === 'board' && m.type !== 'board' && m.type !== 'fan') return false;
      if (filter === 'news' && (m.type === 'board' || m.type === 'fan' || m.type === 'contract' || m.type === 'offer')) return false;
      if (q) {
        const hay = `${m.title} ${m.sender} ${m.contractDetails?.playerName || ''} ${m.offerDetails?.playerName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Decisions waiting on the coach float to the top while staying newest-first inside each group
    if (filter === 'all' || filter === 'action') {
      return [...rows.filter(r => r.pending), ...rows.filter(r => !r.pending)];
    }
    return rows;
  }, [enriched, filter, query]);

  const shown = list.slice(0, visible);

  const toggle = useCallback((m: InboxMessage) => {
    setOpenId(prev => (prev === m.id ? null : m.id));
    if (!m.read) markMessageRead(m.id);
  }, [markMessageRead]);

  const wageFor = (p: Player, fallback?: number): number => {
    const custom = wages[p.id];
    if (custom !== undefined && custom !== '') return Number(custom);
    return fallback ?? calculateSuggestedRenewalWage(p);
  };
  const yearsFor = (p: Player) => years[p.id] || 2;

  const doRenew = (playerId: string, msgId: string) => {
    const p = playerMap.get(playerId);
    if (!p) return show('اللاعب لم يعد ضمن فريقك', false);
    const res = renewPlayerContract(playerId, wageFor(p), yearsFor(p));
    show(res.message, res.success);
    if (res.success) markMessageRead(msgId);
  };

  const doList = (playerId: string, msgId: string) => {
    const p = playerMap.get(playerId);
    if (!p) return show('اللاعب لم يعد ضمن فريقك', false);
    listPlayerForTransfer(playerId, true);
    show(`تم عرض ${p.name} للبيع`, true);
    markMessageRead(msgId);
  };

  const doBid = (bidId: string, msgId: string, accept: boolean) => {
    const res = accept ? acceptIncomingBid(bidId) : rejectIncomingBid(bidId);
    show(res.message, res.success);
    if (res.success) markMessageRead(msgId);
  };

  const clearAll = () => {
    clearAllMessages();
    setOpenId(null);
    setConfirmClear(false);
    show('تم مسح البريد', true);
  };

  /* ------------------------- expanded body (rendered only when open) ------------------------- */
  const renderBody = (m: InboxMessage) => {
    const c = m.contractDetails;
    const o = m.offerDetails;

    return (
      <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-slate-800/80">
        <p className="text-[13px] leading-7 text-slate-300 whitespace-pre-line pt-2">{m.content}</p>

        {/* ---------- Contract renewal ---------- */}
        {c && (() => {
          const player = playerMap.get(c.playerId);
          const done = c.renewed || m.actionTaken === 'renewed';
          return (
            <div className="rounded-xl border border-amber-500/30 bg-slate-950/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black text-sm text-white truncate">{c.playerName}</div>
                  <div className="text-[11px] text-slate-400">
                    {c.playerPosition} · تقييم {c.playerRating}
                  </div>
                </div>
                <div className="text-left text-[11px] text-slate-400 shrink-0">
                  <div>الراتب: <b className="text-slate-200 font-mono">{fmt(c.currentSalary)}</b></div>
                  <div>القيمة: <b className="text-slate-200 font-mono">{fmt(c.marketValue)}</b></div>
                </div>
              </div>

              {done ? (
                <div className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-600/50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Check className="w-4 h-4" /> تم تجديد العقد
                </div>
              ) : !player ? (
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>اللاعب لم يعد في فريقك — الرسالة أرشيف فقط.</span>
                  <button onClick={() => deleteMessage(m.id)} className="px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 font-bold cursor-pointer shrink-0">
                    حذف
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map(yr => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setYears(prev => ({ ...prev, [player.id]: yr }))}
                        className={`py-2 rounded-lg text-xs font-black cursor-pointer transition ${
                          yearsFor(player) === yr ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {yr === 1 ? 'سنة' : yr === 2 ? 'سنتين' : '3 سنوات'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      step={500}
                      min={1000}
                      value={wages[player.id] ?? c.suggestedWage}
                      onChange={e => setWages(prev => ({ ...prev, [player.id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                      onBlur={() => {
                        const cur = wages[player.id];
                        if (cur === '' || cur === undefined || Number(cur) < 1000) {
                          setWages(prev => ({ ...prev, [player.id]: c.suggestedWage }));
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-bold font-mono text-center focus:outline-none focus:border-amber-500"
                      aria-label="الراتب الشهري"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const base = Number(wages[player.id]) || c.suggestedWage;
                        setWages(prev => ({ ...prev, [player.id]: Math.round((base * 1.15) / 500) * 500 }));
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black rounded-lg border border-slate-700 cursor-pointer shrink-0"
                    >
                      +15%
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500">المقترح: {fmt(c.suggestedWage)} ج.م شهرياً</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => doRenew(player.id, m.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs py-2.5 rounded-xl active:scale-95 cursor-pointer"
                    >
                      <FileSignature className="w-4 h-4" />
                      تجديد ({yearsFor(player)} س · {fmt(wageFor(player, c.suggestedWage))})
                    </button>
                    <button
                      onClick={() => doList(player.id, m.id)}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3 rounded-xl border border-slate-700 cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> للبيع
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* ---------- Incoming transfer bid ---------- */}
        {o && o.type === 'player_bid' && (() => {
          const target = o.playerId ? playerMap.get(o.playerId) : undefined;
          return (
            <div className="rounded-xl border border-emerald-500/30 bg-slate-950/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">النادي المشتري</div>
                  <div className="font-black text-sm text-emerald-400 truncate">{o.clubName}</div>
                  {o.playerName && <div className="text-[11px] text-slate-300 truncate">اللاعب: {o.playerName}</div>}
                </div>
                <div className="text-left shrink-0">
                  <div className="text-[11px] text-slate-400">المبلغ</div>
                  <div className="font-black text-base text-emerald-300 font-mono">{fmt(o.amount)}</div>
                </div>
              </div>

              {m.actionTaken === 'accepted' ? (
                <div className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-600/50 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Check className="w-4 h-4" /> تمت الموافقة وانتقل اللاعب
                </div>
              ) : m.actionTaken === 'rejected' ? (
                <div className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
                  <X className="w-4 h-4 text-rose-400" /> تم رفض هذا العرض
                </div>
              ) : (
                <div className="flex gap-2">
                  {o.bidId && (
                    <>
                      <button
                        onClick={() => doBid(o.bidId!, m.id, true)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs py-2.5 rounded-xl active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> قبول وبيع
                      </button>
                      <button
                        onClick={() => doBid(o.bidId!, m.id, false)}
                        className="flex items-center gap-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 font-bold text-xs px-4 rounded-xl border border-rose-800 cursor-pointer"
                      >
                        <X className="w-4 h-4" /> رفض
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Protect target by renewing instead of selling */}
              {target && m.actionTaken !== 'accepted' && m.actionTaken !== 'rejected' && (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 flex-1">أو جدّد عقده لحمايته من العروض:</span>
                  <button
                    onClick={() => doRenew(target.id, m.id)}
                    className="flex items-center gap-1.5 bg-amber-500 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <FileSignature className="w-3.5 h-3.5" />
                    {yearsFor(target)} س · {fmt(wageFor(target))}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex justify-end">
          <button
            onClick={() => { deleteMessage(m.id); setOpenId(null); }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-rose-400 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> حذف الرسالة
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 pb-24" dir="rtl" id="inbox_main_container">
      <Toast toast={toast} />

      {/* ---------------- Hero ---------------- */}
      <Hero accent={stats.actions > 0 ? '#f59e0b' : '#10b981'}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 flex items-center justify-center border ${TONE.emerald.border} ${TONE.emerald.bg} ${TONE.emerald.text} rounded-xl shrink-0`}>
              <Mail className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-lg text-white leading-tight">البريد والإشعارات</h2>
              <p className="text-[11px] text-slate-400 truncate">قرارات العقود والعروض وتقارير الإدارة</p>
            </div>
          </div>
          {messages.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={markAllMessagesRead}
                disabled={stats.unread === 0}
                title="تحديد الكل كمقروء"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 disabled:opacity-40 cursor-pointer active:scale-95"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmClear(true)}
                title="مسح الكل"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-400 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <StatTile label="غير مقروءة" value={stats.unread} tone={stats.unread ? 'emerald' : 'slate'} icon={<Mail className="w-3 h-3" />} />
          <StatTile label="عقود تنتظرك" value={stats.contracts} tone={stats.contracts ? 'amber' : 'slate'} icon={<FileSignature className="w-3 h-3" />} />
          <StatTile label="عروض شراء" value={stats.offers} tone={stats.offers ? 'sky' : 'slate'} icon={<Flame className="w-3 h-3" />} />
        </div>

        {confirmClear && (
          <div className="mt-3 flex items-center justify-between gap-2 bg-rose-950/80 border border-rose-700 rounded-xl p-3 text-xs text-rose-200">
            <span className="font-bold">مسح {messages.length} رسالة نهائياً؟</span>
            <div className="flex gap-2 shrink-0">
              <button onClick={clearAll} className="bg-rose-600 text-white font-black px-3 py-1.5 rounded-lg cursor-pointer">مسح</button>
              <button onClick={() => setConfirmClear(false)} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer">إلغاء</button>
            </div>
          </div>
        )}
      </Hero>

      {/* ---------------- Filters ---------------- */}
      <SegTabs<Filter>
        value={filter}
        onChange={f => { setFilter(f); setVisible(PAGE_SIZE); setOpenId(null); }}
        tabs={[
          { id: 'all', label: 'الكل', badge: messages.length },
          { id: 'action', label: 'يحتاج قرارك', badge: stats.actions },
          { id: 'board', label: 'الإدارة' },
          { id: 'news', label: 'الأخبار' },
        ]}
      />

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
          placeholder="ابحث بالعنوان أو اسم اللاعب..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* ---------------- List ---------------- */}
      {shown.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <InboxIcon className="w-10 h-10 mx-auto text-slate-700 mb-2" />
          <div className="text-sm font-black text-slate-400">
            {messages.length === 0 ? 'البريد فارغ' : 'لا توجد رسائل مطابقة'}
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            {messages.length === 0 ? 'ستصلك هنا العروض وتنبيهات العقود وتقارير الإدارة' : 'جرّب تغيير التصنيف أو البحث'}
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map(({ m, pending }) => {
            const meta = typeMeta(m);
            const t = TONE[meta.tone];
            const open = openId === m.id;
            return (
              <li
                key={m.id}
                className={`border rounded-2xl overflow-hidden transition-colors ${
                  pending ? `${t.border} bg-slate-900` : m.read ? 'border-slate-800 bg-slate-900/50' : 'border-slate-700 bg-slate-900'
                }`}
              >
                <button
                  onClick={() => toggle(m)}
                  aria-expanded={open}
                  className="w-full flex items-center gap-3 p-3 text-right cursor-pointer"
                >
                  <div className={`relative w-9 h-9 rounded-xl border ${t.border} ${t.bg} ${t.text} flex items-center justify-center shrink-0`}>
                    {m.read ? <MailOpen className="w-4 h-4 opacity-60" /> : meta.icon}
                    {!m.read && <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] leading-snug line-clamp-2 ${m.read ? 'text-slate-300 font-bold' : 'text-white font-black'}`}>
                      {m.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                      <span className={`px-1.5 py-0.5 rounded font-black ${t.bg} ${t.text}`}>{meta.label}</span>
                      <span className="truncate">{m.sender}</span>
                      <span className="shrink-0">· {m.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {pending && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">قرار</span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {open && renderBody(m)}
              </li>
            );
          })}
        </ul>
      )}

      {list.length > shown.length && (
        <button
          onClick={() => setVisible(v => v + PAGE_SIZE)}
          className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-600/60 text-xs font-black text-slate-300 cursor-pointer"
        >
          عرض المزيد ({list.length - shown.length} متبقية)
        </button>
      )}
    </div>
  );
};

export default InboxTab;
