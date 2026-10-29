import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { InboxMessage, Player } from '../types/game';
import { calculateSuggestedRenewalWage } from '../utils/contractAlertEngine';
import {
  Mail,
  MailOpen,
  Trash2,
  CheckCircle2,
  Calendar,
  Building,
  Users,
  Flame,
  ArrowLeftRight,
  ShieldAlert,
  AlertTriangle,
  FileSignature,
  DollarSign,
  TrendingUp,
  X,
  Check,
  Award,
  Sparkles,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  UserCheck,
  Tag
} from 'lucide-react';

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
    teams,
  } = useGame();

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'contract' | 'offer' | 'board' | 'news'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(20);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Renewal Form local states keyed by playerId
  const [renewalWages, setRenewalWages] = useState<Record<string, number | string>>({});
  const [renewalYears, setRenewalYears] = useState<Record<string, number>>({});
  const [activeRenewalPlayerId, setActiveRenewalPlayerId] = useState<string | null>(null);

  // Trigger temporary feedback toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4000);
  };

  // O(1) Map lookup for userClub players to prevent O(N*M) freeze when opening Inbox
  const playerByIdMap = useMemo(() => {
    const map = new Map<string, Player>();
    if (userClub && Array.isArray(userClub.players)) {
      for (let i = 0; i < userClub.players.length; i++) {
        const p = userClub.players[i];
        if (p && p.id) map.set(p.id, p);
      }
    }
    return map;
  }, [userClub?.players]);

  // Helper to find player object in userClub in O(1)
  const getPlayerById = (playerId?: string): Player | undefined => {
    if (!playerId) return undefined;
    return playerByIdMap.get(playerId);
  };

  // Get active wage for a player
  const getSelectedWage = (player: Player): number => {
    const custom = renewalWages[player.id];
    if (custom !== undefined && custom !== '') return Number(custom);
    return calculateSuggestedRenewalWage(player);
  };

  // Get active years for a player
  const getSelectedYears = (player: Player): number => {
    return renewalYears[player.id] || 2;
  };

  const handleOpenMessage = (msg: InboxMessage) => {
    setSelectedMessageId(prev => (prev === msg.id ? null : msg.id));
    if (!msg.read) {
      markMessageRead(msg.id);
    }
  };

  const handleClearAll = () => {
    clearAllMessages();
    setSelectedMessageId(null);
    setShowClearConfirm(false);
    showToast('تم مسح جميع الرسائل بنجاح', 'info');
  };

  // Quick direct contract renewal from Inbox
  const handleDirectRenewal = (playerId: string, msgId?: string) => {
    const player = getPlayerById(playerId);
    if (!player) {
      showToast('تعذر العثور على اللاعب في قائمتك الحالية', 'error');
      return;
    }

    const wage = getSelectedWage(player);
    const years = getSelectedYears(player);

    const result = renewPlayerContract(playerId, wage, years);
    if (result.success) {
      showToast(result.message, 'success');
      setActiveRenewalPlayerId(null);
      if (msgId) {
        markMessageRead(msgId);
      }
    } else {
      showToast(result.message, 'error');
    }
  };

  // Direct list player for transfer from Inbox
  const handleDirectListForTransfer = (playerId: string, msgId?: string) => {
    const player = getPlayerById(playerId);
    if (!player) {
      showToast('تعذر العثور على اللاعب في قائمتك الحالية', 'error');
      return;
    }

    listPlayerForTransfer(playerId, true);
    showToast(`تم إدراج اللاعب ${player.name} على قائمة الانتقالات رسمياً!`, 'info');
    if (msgId) {
      markMessageRead(msgId);
    }
  };

  // Direct Accept Transfer Offer from Inbox
  const handleDirectAcceptBid = (bidId: string, msgId: string) => {
    const res = acceptIncomingBid(bidId);
    if (res.success) {
      showToast(res.message, 'success');
      markMessageRead(msgId);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Direct Reject Transfer Offer from Inbox
  const handleDirectRejectBid = (bidId: string, msgId: string) => {
    const res = rejectIncomingBid(bidId);
    if (res.success) {
      showToast(res.message, 'info');
      markMessageRead(msgId);
    } else {
      showToast(res.message, 'error');
    }
  };

  // Computed summary stats
  const stats = useMemo(() => {
    const unreadCount = inbox.filter(m => !m.read).length;
    const currentClubPlayerIds = new Set((userClub?.players || []).map(p => p.id));
    const contractCount = inbox.filter(m => 
      m.type === 'contract' && 
      !m.contractDetails?.renewed && 
      m.actionTaken !== 'renewed' &&
      (!m.contractDetails?.playerId || currentClubPlayerIds.has(m.contractDetails.playerId))
    ).length;
    const pendingOffersCount = inbox.filter(m => 
      m.type === 'offer' && 
      m.actionTaken !== 'accepted' && 
      m.actionTaken !== 'rejected' &&
      (!m.offerDetails?.playerId || currentClubPlayerIds.has(m.offerDetails.playerId))
    ).length;
    const boardCount = inbox.filter(m => m.type === 'board' || m.type === 'fan').length;
    const newsCount = inbox.filter(m => m.type === 'news' || m.type === 'transfer').length;

    return { unreadCount, contractCount, pendingOffersCount, boardCount, newsCount };
  }, [inbox, userClub?.players]);

  // Filtered messages list
  const filteredInbox = useMemo(() => {
    const currentClubPlayerIds = new Set((userClub?.players || []).map(p => p.id));

    return inbox.filter(msg => {
      // Category filter
      if (activeFilter === 'contract') {
        if (msg.type !== 'contract') return false;
        // Don't show contract renewal requests for players no longer in the user's club
        if (msg.contractDetails?.playerId && !currentClubPlayerIds.has(msg.contractDetails.playerId)) {
          return false;
        }
      }
      if (activeFilter === 'offer') {
        if (msg.type !== 'offer') return false;
        // Don't show transfer bids for players no longer in the user's club
        if (msg.offerDetails?.playerId && !currentClubPlayerIds.has(msg.offerDetails.playerId)) {
          return false;
        }
      }
      if (activeFilter === 'board' && msg.type !== 'board' && msg.type !== 'fan') return false;
      if (activeFilter === 'news' && msg.type !== 'news' && msg.type !== 'transfer') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = msg.title.toLowerCase().includes(q);
        const matchSender = msg.sender.toLowerCase().includes(q);
        const matchContent = msg.content.toLowerCase().includes(q);
        const matchPlayer = msg.contractDetails?.playerName.toLowerCase().includes(q) || msg.offerDetails?.playerName?.toLowerCase().includes(q);
        if (!matchTitle && !matchSender && !matchContent && !matchPlayer) return false;
      }

      return true;
    });
  }, [inbox, activeFilter, searchQuery, userClub?.players]);

  const paginatedInbox = useMemo(
    () => filteredInbox.slice(0, visibleCount),
    [filteredInbox, visibleCount]
  );

  const getBadgeType = (type: InboxMessage['type'], priority?: string) => {
    switch (type) {
      case 'contract':
        return priority === 'urgent'
          ? { label: '🚨 خطر رحيل مجاني', color: 'bg-rose-950/80 text-rose-300 border-rose-700/80' }
          : { label: '⏳ تجديد عقد مطلوب', color: 'bg-amber-950/80 text-amber-300 border-amber-700/80' };
      case 'offer':
        return priority === 'high'
          ? { label: '🔥 عرض انتقال مغرٍ', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/80' }
          : { label: '💰 عرض شراء رسمي', color: 'bg-teal-950/80 text-teal-300 border-teal-700/80' };
      case 'board':
        return { label: 'مجلس الإدارة', color: 'bg-red-950/80 text-red-300 border-red-800/80' };
      case 'fan':
        return { label: 'رابطة الجماهير', color: 'bg-purple-950/80 text-purple-300 border-purple-800/80' };
      case 'transfer':
        return { label: 'سوق الانتقالات', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-800/80' };
      case 'scout':
        return { label: 'الكشافة والناشئين', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80' };
      default:
        return { label: 'تقرير النادي', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-fade-in" id="inbox_main_container">
      
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold border flex items-center gap-2 animate-bounce ${
          feedbackToast.type === 'success' 
            ? 'bg-emerald-900 border-emerald-500 text-white' 
            : feedbackToast.type === 'error'
            ? 'bg-rose-900 border-rose-500 text-white'
            : 'bg-slate-900 border-slate-600 text-slate-200'
        }`}>
          {feedbackToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Info className="w-4 h-4 text-amber-400" />}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Header Banner & Global Action Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-3xl space-y-4 shadow-sm" id="inbox_header_card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white">صندوق الوارد والتنبيهات</h2>
                {stats.unreadCount > 0 && (
                  <span className="bg-emerald-500 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full">
                    {stats.unreadCount} جديد
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">تنبيهات العقود المنتهية، عروض الانتقالات، وتقارير الإدارة الفنية</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {inbox.length > 0 && (
              <>
                <button
                  id="inbox_mark_all_read_btn"
                  onClick={markAllMessagesRead}
                  className="text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-bold transition active:scale-95 cursor-pointer"
                  title="تحديد الكل كمقروء"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تحديد الكل كمقروء</span>
                </button>

                <button
                  id="inbox_clear_all_btn"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 flex items-center gap-1.5 font-bold transition active:scale-95 cursor-pointer"
                  title="مسح جميع الرسائل"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>مسح الكل</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Actionable Urgent Alerts Summary Bar */}
        {(stats.contractCount > 0 || stats.pendingOffersCount > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
            {stats.contractCount > 0 && (
              <div
                onClick={() => setActiveFilter('contract')}
                className="bg-gradient-to-r from-amber-950/70 to-rose-950/60 border border-amber-600/50 hover:border-amber-500 p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-200">
                      ⚠️ يوجد {stats.contractCount} لاعبين تنتهي عقودهم قريباً!
                    </div>
                    <div className="text-[11px] text-amber-300/80">
                      جدد عقودهم الآن قبل دخولهم الفترة الحرة والرحيل مجاناً
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-500/30 shrink-0">
                  تجديد العقود ✍️
                </span>
              </div>
            )}

            {stats.pendingOffersCount > 0 && (
              <div
                onClick={() => setActiveFilter('offer')}
                className="bg-gradient-to-r from-emerald-950/70 to-teal-950/60 border border-emerald-600/50 hover:border-emerald-500 p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-200">
                      🔥 يوجد {stats.pendingOffersCount} عروض انتقال معلقة!
                    </div>
                    <div className="text-[11px] text-emerald-300/80">
                      عروض شراء رسمية ومغرية تنتظر قرارك الإداري
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-500/30 shrink-0">
                  مراجعة العروض 💰
                </span>
              </div>
            )}
          </div>
        )}

        {/* Clear Confirmation Prompt */}
        {showClearConfirm && (
          <div className="bg-red-950/90 border border-red-700 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200 animate-fade-in">
            <span className="font-bold">هل أنت متأكد من رغبتك في مسح كافة الرسائل والإشعارات ({inbox.length})؟</span>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={handleClearAll}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-4 py-1.5 rounded-xl transition cursor-pointer"
              >
                نعم، مسح الكل
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills and Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => { setActiveFilter('all'); setVisibleCount(20); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>الكل</span>
              <span className="text-[10px] opacity-80 font-mono">({inbox.length})</span>
            </button>

            <button
              onClick={() => { setActiveFilter('contract'); setVisibleCount(20); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'contract'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>العقود المنتهية</span>
              {stats.contractCount > 0 && (
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full font-mono">
                  {stats.contractCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveFilter('offer'); setVisibleCount(20); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'offer'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-teal-400" />
              <span>عروض الانتقال</span>
              {stats.pendingOffersCount > 0 && (
                <span className="text-[10px] bg-teal-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full font-mono">
                  {stats.pendingOffersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveFilter('board'); setVisibleCount(20); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'board'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Building className="w-3.5 h-3.5 text-purple-400" />
              <span>الإدارة والجماهير</span>
            </button>

            <button
              onClick={() => { setActiveFilter('news'); setVisibleCount(20); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'news'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>أخبار النادي</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="w-full sm:w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setVisibleCount(20); }}
              placeholder="بحث في الرسائل..."
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3" id="inbox_messages_list">
        {filteredInbox.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
            <MailOpen className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <div className="text-sm font-bold text-slate-300">لا توجد رسائل مطابقة</div>
            <div className="text-xs text-slate-500">ستصلك الإشعارات والعروض والتنبيهات مع استمرار الموسم وجولاته.</div>
          </div>
        ) : (
          paginatedInbox.map(msg => {
            const badge = getBadgeType(msg.type, msg.priority);
            const isSelected = selectedMessageId === msg.id;
            const isContractMsg = msg.type === 'contract' || !!msg.contractDetails;
            const isOfferMsg = msg.type === 'offer' || !!msg.offerDetails;
            const contractDetails = msg.contractDetails;
            const offerDetails = msg.offerDetails;

            // Player object for contract/offer actions
            const targetPlayerId = contractDetails?.playerId || offerDetails?.playerId;
            const targetPlayer = getPlayerById(targetPlayerId);

            // Is renewal form currently open for this message/player
            const isRenewalFormOpen = activeRenewalPlayerId === targetPlayerId;

            // Priority badge & glow styling
            const isUrgent = msg.priority === 'urgent';
            const isHigh = msg.priority === 'high' || offerDetails?.isLucrative;

            return (
              <div
                key={msg.id}
                id={`inbox_msg_${msg.id}`}
                className={`rounded-3xl border transition-colors space-y-3 p-4 sm:p-5 ${
                  !msg.read
                    ? isUrgent
                      ? 'bg-slate-900/95 border-rose-500/70'
                      : isHigh
                      ? 'bg-slate-900/95 border-amber-500/70'
                      : 'bg-slate-900/90 border-emerald-500/60'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/80'
                }`}
              >
                {/* Message Header Row */}
                <div 
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => handleOpenMessage(msg)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {msg.read ? (
                        <MailOpen className="w-4 h-4 text-slate-500" />
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full block ${
                          isUrgent ? 'bg-rose-500' : isHigh ? 'bg-amber-400' : 'bg-emerald-500'
                        }`} />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm sm:text-base font-bold ${msg.read ? 'text-slate-200' : 'text-white'}`}>
                          {msg.title}
                        </h3>
                        {offerDetails?.isLucrative && (
                          <span className="text-[10px] bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Sparkles className="w-3 h-3" />
                            <span>مغرٍ (+{Math.round(((offerDetails.profitRatio || 1.2) - 1) * 100)}%)</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <span>من: <strong className="text-slate-300">{msg.sender}</strong></span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{msg.date}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2.5 py-1 rounded-xl border font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(msg.id);
                        if (selectedMessageId === msg.id) setSelectedMessageId(null);
                      }}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="حذف الرسالة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenMessage(msg)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Message Body Content */}
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80 whitespace-pre-line">
                  {msg.content}
                </div>

                {/* ============================================================ */}
                {/* 1. INTERACTIVE CONTRACT RENEWAL MODULE IN INBOX */}
                {/* ============================================================ */}
                {isContractMsg && contractDetails && (
                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs font-mono">
                          {contractDetails.playerPosition}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white">{contractDetails.playerName}</span>
                            <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-500/30 font-mono">
                              ⭐ {contractDetails.playerRating} OVR
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>الراتب الحالي: <strong className="text-slate-200">{contractDetails.currentSalary.toLocaleString()} ج.م</strong></span>
                            <span>•</span>
                            <span>القيمة: <strong className="text-slate-200">{contractDetails.marketValue.toLocaleString()} ج.م</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {contractDetails.renewed || msg.actionTaken === 'renewed' ? (
                          <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>تم تجديد العقد ({contractDetails.contractYears} سنوات)</span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border flex items-center gap-1 ${
                              contractDetails.contractYears === 0
                                ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                                : 'bg-amber-950/80 text-amber-300 border-amber-600'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              <span>
                                {contractDetails.contractYears === 0 ? 'العقد منتهٍ (حر)' : 'متبقي: سنة واحدة'}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Renewal Form if not renewed */}
                    {!contractDetails.renewed && msg.actionTaken !== 'renewed' && (() => {
                      const targetPlayer = getPlayerById(contractDetails.playerId);
                      if (!targetPlayer) {
                        return (
                          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                            <span className="text-slate-400">
                              ℹ️ هذا اللاعب لم يعد ضمن صفوف فريقك الحالي ({userClub?.name})، الرسالة محفوظة كأرشيف.
                            </span>
                            <button
                              onClick={() => deleteMessage(msg.id)}
                              className="text-rose-400 hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 transition cursor-pointer shrink-0"
                            >
                              حذف من البريد
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            
                            {/* Duration Selector */}
                            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-1.5">
                              <label className="text-[11px] text-slate-400 font-bold block">مدة التجديد المقترحة:</label>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[1, 2, 3].map(yr => {
                                  const activeYr = renewalYears[contractDetails.playerId] || 2;
                                  return (
                                    <button
                                      key={yr}
                                      type="button"
                                      onClick={() => setRenewalYears(prev => ({ ...prev, [contractDetails.playerId]: yr }))}
                                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                                        activeYr === yr
                                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                      }`}
                                    >
                                      +{yr} {yr === 1 ? 'سنة' : yr === 2 ? 'سنتين' : 'سنوات'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Wage Adjuster */}
                            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                                <span>الراتب الشهري الجديد:</span>
                                <span className="text-amber-300 font-mono">
                                  (المقترح: {contractDetails.suggestedWage.toLocaleString()} ج.م)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step={500}
                                  min={1000}
                                  value={renewalWages[contractDetails.playerId] ?? contractDetails.suggestedWage}
                                  onChange={e => {
                                    const val = e.target.value === '' ? '' : Number(e.target.value);
                                    setRenewalWages(prev => ({ ...prev, [contractDetails.playerId]: val }));
                                  }}
                                  onBlur={() => {
                                    const current = renewalWages[contractDetails.playerId];
                                    if (current === '' || current === undefined || Number(current) < 1000) {
                                      setRenewalWages(prev => ({ ...prev, [contractDetails.playerId]: contractDetails.suggestedWage }));
                                    }
                                  }}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold font-mono focus:outline-none focus:border-amber-500 text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentVal = renewalWages[contractDetails.playerId];
                                    const base = (typeof currentVal === 'number' && currentVal > 0)
                                      ? currentVal
                                      : (Number(currentVal) || contractDetails.suggestedWage);
                                    setRenewalWages(prev => ({ ...prev, [contractDetails.playerId]: Math.round(base * 1.15 / 500) * 500 }));
                                  }}
                                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 shrink-0 cursor-pointer"
                                  title="زيادة الراتب بنسبة 15%"
                                >
                                  +15%
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <button
                              id={`inbox_renew_btn_${contractDetails.playerId}`}
                              onClick={() => handleDirectRenewal(contractDetails.playerId, msg.id)}
                              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                            >
                              <FileSignature className="w-4 h-4" />
                              <span>
                                تجديد العقد فوراً ({getSelectedYears(targetPlayer)} سنوات - {getSelectedWage(targetPlayer).toLocaleString()} ج.م)
                              </span>
                            </button>

                            <button
                              onClick={() => handleDirectListForTransfer(contractDetails.playerId, msg.id)}
                              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                              <span>عرض اللاعب للبيع</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* ============================================================ */}
                {/* 2. INTERACTIVE TRANSFER OFFER MODULE IN INBOX */}
                {/* ============================================================ */}
                {isOfferMsg && offerDetails?.type === 'player_bid' && (
                  <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">النادي المشتري:</span>
                          <span className="font-black text-sm text-emerald-400">{offerDetails.clubName}</span>
                        </div>
                        {offerDetails.playerName && (
                          <div className="text-xs text-slate-300 font-bold mt-0.5">
                            اللاعب المستهدف: {offerDetails.playerName} ({offerDetails.playerPosition || 'لاعب'})
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">المبلغ المعروض:</span>
                        <span className="text-base font-black text-emerald-300 font-mono">
                          {(offerDetails.amount || 0).toLocaleString()} ج.م
                        </span>
                      </div>
                    </div>

                    {/* Offer Actions */}
                    {msg.actionTaken === 'accepted' ? (
                      <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تمت الموافقة الرسمية على العرض وانتقال اللاعب للنادي المشتري.</span>
                      </div>
                    ) : msg.actionTaken === 'rejected' ? (
                      <div className="bg-slate-900 border border-slate-700 text-slate-400 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                        <X className="w-4 h-4 text-rose-400" />
                        <span>تم رفض هذا العرض مسبقاً.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {offerDetails.bidId && (
                            <>
                              <button
                                id={`inbox_accept_bid_${offerDetails.bidId}`}
                                onClick={() => handleDirectAcceptBid(offerDetails.bidId!, msg.id)}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>قبول العرض وبيع اللاعب ({(offerDetails.amount || 0).toLocaleString()} ج.م)</span>
                              </button>

                              <button
                                id={`inbox_reject_bid_${offerDetails.bidId}`}
                                onClick={() => handleDirectRejectBid(offerDetails.bidId!, msg.id)}
                                className="flex items-center justify-center gap-1.5 bg-red-950/70 hover:bg-red-900 text-red-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-red-800 transition cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                <span>رفض العرض</span>
                              </button>
                            </>
                          )}

                          {targetPlayer && (
                            <button
                              onClick={() => setActiveRenewalPlayerId(prev => prev === targetPlayer.id ? null : targetPlayer.id)}
                              className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-3.5 py-2 rounded-xl border border-amber-700/50 transition cursor-pointer"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>{isRenewalFormOpen ? 'إغلاق نافذة التجديد' : 'تجديد العقد لحماية اللاعب'}</span>
                            </button>
                          )}
                        </div>

                        {/* Inline Protect & Renew Form for Bid Target */}
                        {isRenewalFormOpen && targetPlayer && (
                          <div className="mt-3 p-3 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-2.5 animate-fade-in">
                            <div className="text-xs font-bold text-amber-200">
                              ✍️ تجديد عقد {targetPlayer.name} لقطع الطريق على العروض الخارجية:
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3].map(yr => (
                                  <button
                                    key={yr}
                                    type="button"
                                    onClick={() => setRenewalYears(prev => ({ ...prev, [targetPlayer.id]: yr }))}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                      (renewalYears[targetPlayer.id] || 2) === yr
                                        ? 'bg-amber-500 text-slate-950'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    +{yr} سنة
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => handleDirectRenewal(targetPlayer.id, msg.id)}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-lg transition"
                              >
                                تأكيد التجديد براتب {getSelectedWage(targetPlayer).toLocaleString()} ج.م
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {filteredInbox.length > visibleCount && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount(prev => prev + 20)}
              className="px-6 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-slate-700 transition cursor-pointer"
            >
              عرض المزيد من الرسائل ({filteredInbox.length - visibleCount} متبقية)
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
export default InboxTab;
