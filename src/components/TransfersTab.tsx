import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { ActiveNegotiation, Player, PositionCategory } from '../types/game';
import { NegotiationModal } from './NegotiationModal';
import {
  getAllDatabasePlayers,
  MarketPlayerItem,
  generateTransferRumors,
  TransferRumor,
  resolveClubInfo,
  calculateAskingPrice,
} from '../utils/transferEngine';
import { canPlayerJoinClub, calculateClubMonthlyIncome, calculateClubTotalMonthlyWages, validateTransferFinancials } from '../services/economyService';
import { GLOBAL_LEAGUES } from '../data/leaguesData';
import {
  ArrowLeftRight,
  Search,
  Wallet,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
  TrendingUp,
  DollarSign,
  UserPlus,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Filter,
  SlidersHorizontal,
  Flame,
  Radio,
  Newspaper,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Building2,
  Trophy,
  Globe2,
} from 'lucide-react';

interface TransfersTabProps {
  onSelectPlayer: (player: Player) => void;
}

export const TransfersTab: React.FC<TransfersTabProps> = ({ onSelectPlayer }) => {
  const {
    userClub,
    teams,
    transferMarket,
    buyPlayer,
    sellPlayer,
    activeNegotiations,
    startPlayerNegotiation,
    respondToNegotiationOffer,
    cancelNegotiation,
    acceptSellNegotiation,
    counterSellNegotiation,
    rejectSellNegotiation,
    listPlayerForTransfer,
    incomingBids,
    acceptIncomingBid,
    rejectIncomingBid,
    calendarDate,
  } = useGame();

  // Navigation & Sub-Tabs
  const [activeTabMode, setActiveTabMode] = useState<'buy' | 'rumors' | 'negotiations' | 'sell'>('buy');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Counter proposal state for sell negotiations
  const [counteringNegId, setCounteringNegId] = useState<string | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<number | string>('');

  // Negotiation Modal State
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
  const [selectedNegotiation, setSelectedNegotiation] = useState<ActiveNegotiation | null>(null);
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);

  // ----------------------------------------------------
  // ADVANCED FILTER & SEARCH STATE
  // ----------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');
  const [selectedNationality, setSelectedNationality] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<PositionCategory | 'ALL'>('ALL');
  const [selectedExactPos, setSelectedExactPos] = useState<string>('ALL');
  const [minAge, setMinAge] = useState<number | string>(15);
  const [maxAge, setMaxAge] = useState<number | string>(42);
  const [minOverall, setMinOverall] = useState<number | string>(45);
  const [maxOverall, setMaxOverall] = useState<number | string>(99);
  const [maxMarketValue, setMaxMarketValue] = useState<number>(0); // 0 = unlimited
  const [maxSalary, setMaxSalary] = useState<number>(0); // 0 = unlimited
  const [sortBy, setSortBy] = useState<'overall' | 'value' | 'salary' | 'age' | 'name'>('overall');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination for smooth ultra-fast rendering
  const [displayCount, setDisplayCount] = useState<number>(30);

  // 1. Fetch All Database Players
  const allDbPlayers: MarketPlayerItem[] = useMemo(() => {
    return getAllDatabasePlayers(teams, transferMarket, activeNegotiations, userClub?.id);
  }, [teams, transferMarket, activeNegotiations, userClub?.id]);

  // 2. Transfer Rumors Feed
  const [rumorFeedSeed, setRumorFeedSeed] = useState<number>(1);
  const transferRumors: TransferRumor[] = useMemo(() => {
    return generateTransferRumors(allDbPlayers, calendarDate?.formattedArabic || 'اليوم', 12);
  }, [allDbPlayers, rumorFeedSeed, calendarDate?.formattedArabic]);

  // 3. Extract unique filter options dynamically from database
  const availableLeagues = useMemo(() => {
    const map = new Map<string, string>();
    allDbPlayers.forEach(item => {
      if (item.leagueId && item.leagueName) {
        map.set(item.leagueId, item.leagueName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allDbPlayers]);

  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    allDbPlayers.forEach(item => {
      if (item.clubName && item.clubName !== 'وكيل حر (بدون نادٍ)') {
        // If league filter is active, only show clubs of that league
        if (selectedLeague === 'ALL' || item.leagueId === selectedLeague) {
          set.add(item.clubName);
        }
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allDbPlayers, selectedLeague]);

  const availableNationalities = useMemo(() => {
    const set = new Set<string>();
    allDbPlayers.forEach(item => {
      if (item.player?.nationality) {
        set.add(item.player.nationality);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [allDbPlayers]);

  // 4. Apply Multi-Dimension Filtering
  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = allDbPlayers.filter(item => {
      const p = item.player;
      if (!p) return false;

      // Never show user's own players in the buy market
      if (userClub?.id) {
        if (item.isUserClubPlayer || item.club?.id === userClub.id || (userClub.players || []).some(myP => myP && p && myP.id === p.id)) {
          return false;
        }
      }

      // Text Search
      if (q) {
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesNick = (p.nickname || '').toLowerCase().includes(q);
        const matchesClub = (item.clubName || '').toLowerCase().includes(q);
        const matchesNat = (p.nationality || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNick && !matchesClub && !matchesNat) return false;
      }

      // League Filter
      if (selectedLeague !== 'ALL') {
        if (selectedLeague === 'free_agents') {
          if (item.clubName !== 'وكيل حر (بدون نادٍ)') return false;
        } else if (item.leagueId !== selectedLeague) {
          return false;
        }
      }

      // Club Filter
      if (selectedClub !== 'ALL') {
        if (item.clubName !== selectedClub) return false;
      }

      // Nationality Filter
      if (selectedNationality !== 'ALL') {
        if (p.nationality !== selectedNationality) return false;
      }

      // Position Category
      if (selectedCategory !== 'ALL') {
        if (p.positionCategory !== selectedCategory) return false;
      }

      // Exact Position
      if (selectedExactPos !== 'ALL') {
        if (p.position !== selectedExactPos) return false;
      }

      // Age Range
      const parsedMinAge = typeof minAge === 'number' ? minAge : (parseInt(minAge) || 15);
      const parsedMaxAge = typeof maxAge === 'number' ? maxAge : (parseInt(maxAge) || 45);
      if (p.age < parsedMinAge || p.age > parsedMaxAge) return false;

      // Overall Rating Range
      const parsedMinOverall = typeof minOverall === 'number' ? minOverall : (parseInt(minOverall) || 40);
      const parsedMaxOverall = typeof maxOverall === 'number' ? maxOverall : (parseInt(maxOverall) || 99);
      if (p.overallRating < parsedMinOverall || p.overallRating > parsedMaxOverall) return false;

      // Market Value
      if (maxMarketValue > 0 && p.marketValue > maxMarketValue) return false;

      // Salary
      if (maxSalary > 0 && p.salary > maxSalary) return false;

      return true;
    });

    // Sort Results
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'overall') {
        comparison = a.player.overallRating - b.player.overallRating;
      } else if (sortBy === 'value') {
        comparison = a.player.marketValue - b.player.marketValue;
      } else if (sortBy === 'salary') {
        comparison = a.player.salary - b.player.salary;
      } else if (sortBy === 'age') {
        comparison = a.player.age - b.player.age;
      } else if (sortBy === 'name') {
        comparison = a.player.name.localeCompare(b.player.name, 'ar');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [
    allDbPlayers,
    searchQuery,
    selectedLeague,
    selectedClub,
    selectedNationality,
    selectedCategory,
    selectedExactPos,
    minAge,
    maxAge,
    minOverall,
    maxOverall,
    maxMarketValue,
    maxSalary,
    sortBy,
    sortOrder,
  ]);

  const displayedList = useMemo(() => {
    return filteredPlayers.slice(0, displayCount);
  }, [filteredPlayers, displayCount]);

  // Reset Filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLeague('ALL');
    setSelectedClub('ALL');
    setSelectedNationality('ALL');
    setSelectedCategory('ALL');
    setSelectedExactPos('ALL');
    setMinAge(15);
    setMaxAge(42);
    setMinOverall(45);
    setMaxOverall(99);
    setMaxMarketValue(0);
    setMaxSalary(0);
    setSortBy('overall');
    setSortOrder('desc');
    setDisplayCount(30);
  };

  const handleBuy = (player: Player, overrideFee?: number) => {
    if (!player) return;
    if (!userClub) {
      setNotification({ text: 'يجب تولي تدريب نادٍ أولاً لتتمكن من إبرام الصفقات!', type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    try {
      const joinCheck = canPlayerJoinClub(player, userClub);
      if (!joinCheck.canJoin) {
        setNotification({ text: joinCheck.reason || 'اللاعب يرفض الانتقال إلى ناديك.', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      const safeClub = resolveClubInfo(player.currentClubId, (player as any).currentClubName, teams);
      const { askingPrice } = calculateAskingPrice(player, safeClub.club);
      const effectiveFee = overrideFee != null ? overrideFee : Math.max(25000, askingPrice || player.marketValue || 50000);
      const effectiveSalary = Math.max(2500, player.salary || 2500);

      const clubBudget = userClub.budget || 0;
      if (clubBudget < effectiveFee) {
        setNotification({
          text: `ميزانية ناديك (${clubBudget.toLocaleString()} ج.م) لا تكفي لدفع قيمة الصفقة (${effectiveFee.toLocaleString()} ج.م)!`,
          type: 'error',
        });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      const res = buyPlayer({
        ...player,
        marketValue: effectiveFee,
        salary: effectiveSalary,
      });
      setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      console.error('Error in handleBuy:', err);
      setNotification({ text: err?.message || 'حدث خطأ أثناء محاولة إتمام الشراء', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleStartNegotiation = (player: Player) => {
    if (!userClub) {
      setNotification({ text: 'يجب تولي تدريب نادٍ أولاً للتفاوض مع اللاعبين!', type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    setNegotiatingPlayer(player);
    setSelectedNegotiation(null);
    setIsNegotiationModalOpen(true);
  };

  const handleOpenExistingNegotiation = (neg: ActiveNegotiation) => {
    setSelectedNegotiation(neg);
    setNegotiatingPlayer(null);
    setIsNegotiationModalOpen(true);
  };

  const handleQuickSell = (player: Player) => {
    if (!userClub) return;
    const res = sellPlayer(player.id);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 3500);
  };

  const clubMonthlyIncome = userClub ? calculateClubMonthlyIncome(userClub) : 0;
  const clubTotalWages = userClub ? calculateClubTotalMonthlyWages(userClub) : 0;
  const remainingWageBudget = Math.max(0, clubMonthlyIncome - clubTotalWages);

  return (
    <div id="transfers_tab_root" className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base text-white">سوق الانتقالات والمفاوضات</h2>
              <span className="text-[11px] text-slate-400">
                قاعدة بيانات شاملة ({allDbPlayers.length.toLocaleString()} لاعب) • شائعات الميركاتو • مفاوضات رسمية
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-emerald-950/80 border border-emerald-700/60 px-3 py-1.5 rounded-xl text-left">
              <span className="text-[10px] text-emerald-300 block">الميزانية المتاحة</span>
              <span className="font-black text-xs text-emerald-400 font-mono">
                {userClub ? `${userClub.budget.toLocaleString()} ج.م` : 'بدون نادٍ'}
              </span>
            </div>

            {userClub && (
              <div className="bg-amber-950/80 border border-amber-700/60 px-3 py-1.5 rounded-xl text-left">
                <span className="text-[10px] text-amber-300 block">سقف الرواتب المتاح</span>
                <span className={`font-black text-xs font-mono ${remainingWageBudget > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {remainingWageBudget.toLocaleString()} ج.م/ش
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-center text-xs font-bold">
          <button
            id="tab_btn_market"
            onClick={() => setActiveTabMode('buy')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTabMode === 'buy' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>السوق الشامل</span>
            <span className="text-[10px] opacity-80 font-mono">({allDbPlayers.length})</span>
          </button>

          <button
            id="tab_btn_rumors"
            onClick={() => setActiveTabMode('rumors')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 relative ${
              activeTabMode === 'rumors' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>شائعات الميركاتو</span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse absolute top-1.5 left-1.5" />
          </button>

          <button
            id="tab_btn_negotiations"
            onClick={() => setActiveTabMode('negotiations')}
            className={`py-2 px-1 rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTabMode === 'negotiations' ? 'bg-cyan-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>المفاوضات ({activeNegotiations.length})</span>
            {activeNegotiations.some(n => n.actionRequired) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            id="tab_btn_sell"
            onClick={() => setActiveTabMode('sell')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeTabMode === 'sell' ? 'bg-rose-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            بيع لاعبيك ({userClub?.players ? userClub.players.length : 0})
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-fade-in ${
          notification.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
        }`}>
          {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 1: COMPREHENSIVE TRANSFER MARKET WITH FILTERS */}
      {/* ==================================================== */}
      {activeTabMode === 'buy' && (
        <div className="space-y-3">
          
          {/* Quick Search & Filter Toggle Bar */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم اللاعب، النادي، أو الجنسية..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowAdvancedFilters(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                  showAdvancedFilters
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>فلاتر متقدمة</span>
                {showAdvancedFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                onClick={handleResetFilters}
                title="إعادة ضبط جميع الفلاتر"
                className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Position Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL', label: 'كافة المراكز' },
                { id: 'GK', label: '🧤 حراس المرمى' },
                { id: 'DEF', label: '🛡️ خط الدفاع' },
                { id: 'MID', label: '⚙️ خط الوسط' },
                { id: 'FWD', label: '⚡ خط الهجوم' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedCategory(tab.id as PositionCategory | 'ALL');
                    setSelectedExactPos('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* EXPANDABLE ADVANCED FILTERS PANEL */}
            {showAdvancedFilters && (
              <div className="pt-3 border-t border-slate-800 space-y-3.5 animate-fade-in text-xs">
                
                {/* Row 1: League, Club, Nationality */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">الدوري / المسابقة</label>
                    <select
                      value={selectedLeague}
                      onChange={e => {
                        setSelectedLeague(e.target.value);
                        setSelectedClub('ALL');
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">جميع الدوريات ({availableLeagues.length})</option>
                      <option value="free_agents">سوق اللاعبين الأحرار فقط</option>
                      {availableLeagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">النادي</label>
                    <select
                      value={selectedClub}
                      onChange={e => setSelectedClub(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">جميع الأندية ({availableClubs.length})</option>
                      {availableClubs.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">الجنسية</label>
                    <select
                      value={selectedNationality}
                      onChange={e => setSelectedNationality(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">جميع الجنسيات ({availableNationalities.length})</option>
                      {availableNationalities.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Age, Overall Rating, Sorting */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                      العمر ({minAge} - {maxAge})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={15}
                        max={typeof maxAge === 'number' ? maxAge : 45}
                        value={minAge}
                        onChange={e => setMinAge(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (minAge === '' || Number(minAge) < 15) setMinAge(15);
                        }}
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-center font-mono"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="number"
                        min={typeof minAge === 'number' ? minAge : 15}
                        max={45}
                        value={maxAge}
                        onChange={e => setMaxAge(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (maxAge === '' || Number(maxAge) > 45) setMaxAge(45);
                        }}
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">
                      التقييم العام ({minOverall} - {maxOverall})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={40}
                        max={typeof maxOverall === 'number' ? maxOverall : 99}
                        value={minOverall}
                        onChange={e => setMinOverall(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (minOverall === '' || Number(minOverall) < 40) setMinOverall(40);
                        }}
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-emerald-400 font-bold text-center font-mono"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="number"
                        min={typeof minOverall === 'number' ? minOverall : 40}
                        max={99}
                        value={maxOverall}
                        onChange={e => setMaxOverall(e.target.value === '' ? '' : Number(e.target.value))}
                        onBlur={() => {
                          if (maxOverall === '' || Number(maxOverall) > 99) setMaxOverall(99);
                        }}
                        className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-emerald-400 font-bold text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">الترتيب حسب</label>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="overall">التقييم الإجمالي ⭐</option>
                      <option value="value">القيمة السوقية 💰</option>
                      <option value="salary">الراتب الشهري 💵</option>
                      <option value="age">العمر ⏳</option>
                      <option value="name">الاسم الأبجدي 🔤</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-bold">اتجاه الترتيب</label>
                    <button
                      onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 font-bold flex items-center justify-center gap-1"
                    >
                      <span>{sortOrder === 'desc' ? 'تنازلي (الأعلى أولاً)' : 'تصاعدي (الأقل أولاً)'}</span>
                    </button>
                  </div>
                </div>

                {/* Specific Position Chips */}
                {selectedCategory !== 'ALL' && (
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1 font-bold">تحديد المركز الدقيق:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setSelectedExactPos('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          selectedExactPos === 'ALL' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        الكل في هذا الخط
                      </button>
                      {(selectedCategory === 'GK'
                        ? ['GK']
                        : selectedCategory === 'DEF'
                        ? ['CB', 'RB', 'LB', 'RWB', 'LWB']
                        : selectedCategory === 'MID'
                        ? ['CDM', 'CM', 'CAM', 'RM', 'LM']
                        : ['ST', 'CF', 'RW', 'LW']
                      ).map(pos => (
                        <button
                          key={pos}
                          onClick={() => setSelectedExactPos(pos)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono ${
                            selectedExactPos === pos ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs px-2 text-slate-400">
            <span>
              تم العثور على <strong className="text-emerald-400 font-mono">{filteredPlayers.length.toLocaleString()}</strong> لاعب
              {filteredPlayers.length > displayCount && ` (يتم عرض أول ${displayCount})`}
            </span>
            {userClub && (
              <span className="text-[11px]">
                نادي المدرب: <strong className="text-white">{userClub.name}</strong>
              </span>
            )}
          </div>

          {/* PLAYER CARDS LIST */}
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-xs text-slate-400 space-y-2">
              <Search className="w-8 h-8 text-slate-600 mx-auto" />
              <p>لم يتم العثور على لاعبين يطابقون خيارات البحث والفلاتر الحالية.</p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedList.map(item => {
                const player = item.player;
                const isUserClub = item.isUserClubPlayer;
                const safeClubName = item.clubName || 'وكيل حر (بدون نادٍ)';
                const safeLeagueName = item.leagueName || 'دوري تنافسي';

                return (
                  <div
                    key={`${player.id}_${item.club?.id || 'free'}`}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3.5 rounded-2xl transition-all space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rating Badge */}
                        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-emerald-600/50 flex flex-col items-center justify-center font-black shrink-0 shadow">
                          <span className={`text-lg leading-none ${
                            player.overallRating >= 85 ? 'text-amber-400' :
                            player.overallRating >= 75 ? 'text-emerald-400' :
                            player.overallRating >= 65 ? 'text-cyan-400' : 'text-slate-300'
                          }`}>
                            {player.overallRating}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5">{player.position}</span>
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">{player.name}</span>
                            {player.nickname && (
                              <span className="text-xs text-amber-400">"{player.nickname}"</span>
                            )}
                            <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                              {player.nationalityCode === 'EGY' ? '🇪🇬' : player.nationalityCode === 'SAU' ? '🇸🇦' : player.nationalityCode === 'UAE' ? '🇦🇪' : player.nationalityCode === 'QAT' ? '🇶🇦' : player.nationalityCode === 'MAR' ? '🇲🇦' : player.nationalityCode === 'TUN' ? '🇹🇳' : player.nationalityCode === 'ALG' ? '🇩🇿' : player.nationalityCode === 'ESP' ? '🇪🇸' : player.nationalityCode === 'ENG' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : player.nationalityCode === 'FRA' ? '🇫🇷' : player.nationalityCode === 'ITA' ? '🇮🇹' : player.nationalityCode === 'GER' ? '🇩🇪' : player.nationalityCode === 'BRA' ? '🇧🇷' : player.nationalityCode === 'ARG' ? '🇦🇷' : '🌐'} {player.nationality || 'مصر'}
                            </span>
                          </div>

                          {/* Club & League Badges */}
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 font-medium text-slate-300">
                              <Building2 className="w-3 h-3 text-cyan-400" />
                              <strong className="text-white">{safeClubName}</strong>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">{safeLeagueName}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400">{player.age} عاماً</span>
                            {player.potentialRating > player.overallRating && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-[11px] text-emerald-400 font-semibold">
                                  إمكانية: {player.potentialRating}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Market Value & Salary */}
                      <div className="text-left shrink-0">
                        <span className="text-xs font-bold text-emerald-400 font-mono block">
                          {player.marketValue > 0 ? `${player.marketValue.toLocaleString()} ج.م` : 'انتقال حر (مجاني)'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          راتب: {player.salary.toLocaleString()} ج.م/ش
                        </span>
                        <span className={`inline-block text-[9px] px-2 py-0.5 rounded mt-1 font-bold border ${item.statusColor}`}>
                          {item.statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Attributes Bar */}
                    {player.attributes && (
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                        <div>
                          <span className="text-slate-400 block">السرعة</span>
                          <span className="font-bold text-white font-mono">{player.attributes.pace}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">التسديد</span>
                          <span className="font-bold text-white font-mono">{player.attributes.shooting}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">التمرير</span>
                          <span className="font-bold text-white font-mono">{player.attributes.passing}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">الدفاع</span>
                          <span className="font-bold text-white font-mono">{player.attributes.defending}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onSelectPlayer(player)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>تفاصيل كاملة</span>
                      </button>

                      {isUserClub ? (
                        <div className="col-span-2 bg-slate-800/60 text-slate-400 text-xs py-2 rounded-xl text-center font-bold border border-slate-700/60 flex items-center justify-center">
                          لاعب في ناديك الحالي
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartNegotiation(player)}
                            className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>تفاوض رسمي</span>
                          </button>

                          {(() => {
                            const effectiveAskingPrice = item.askingPrice || player.marketValue || 50000;
                            const effectiveSalary = player.salary || 2500;
                            const clubBudget = userClub?.budget || 0;
                            const isAffordableFee = userClub ? clubBudget >= effectiveAskingPrice : false;
                            const isAffordableWage = userClub ? (clubTotalWages + effectiveSalary <= clubMonthlyIncome) : false;
                            const canDirectBuy = Boolean(userClub && isAffordableFee && isAffordableWage);

                            return (
                              <button
                                onClick={() => handleBuy(player, effectiveAskingPrice)}
                                disabled={!canDirectBuy}
                                title={
                                  !userClub ? 'يجب تولي تدريب نادٍ' :
                                  !isAffordableFee ? `الميزانية غير كافية (${clubBudget.toLocaleString()} / ${effectiveAskingPrice.toLocaleString()} ج.م)` :
                                  !isAffordableWage ? `الراتب (${effectiveSalary.toLocaleString()} ج.م) يتجاوز سقف دخل النادي` :
                                  'شراء مباشر'
                                }
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>
                                  {!userClub ? 'شراء مباشر' :
                                   !isAffordableFee ? 'الميزانية لا تكفي' :
                                   !isAffordableWage ? 'سقف الرواتب' :
                                   'شراء مباشر'}
                                </span>
                              </button>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Load More Button */}
              {filteredPlayers.length > displayCount && (
                <div className="text-center pt-2 pb-4">
                  <button
                    onClick={() => setDisplayCount(prev => prev + 30)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-2xl border border-slate-700 transition-all shadow"
                  >
                    عرض المزيد من اللاعبين (متبقي {filteredPlayers.length - displayCount}) ⬇️
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 2: TRANSFER RUMORS & SCOOPS FEED                */}
      {/* ==================================================== */}
      {activeTabMode === 'rumors' && (
        <div className="space-y-3 animate-fade-in">
          
          {/* Header & Refresh */}
          <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 p-4 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                    <span>صحيفة الميركاتو وشائعات الانتقالات</span>
                    <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full font-bold">
                      عاجل وحصري 🔥
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    كواليس المفاوضات السرية، تسريبات الوكلاء، وتحركات الأندية الكبرى في سوق اللاعبين
                  </p>
                </div>
              </div>

              <button
                onClick={() => setRumorFeedSeed(prev => prev + 1)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تحديث الشائعات 🔄</span>
              </button>
            </div>
          </div>

          {/* Rumor Cards Grid */}
          <div className="space-y-3">
            {transferRumors.map(rumor => {
              const matchedPlayer = allDbPlayers.find(p => p.player.name === rumor.playerName)?.player;

              return (
                <div
                  key={rumor.id}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl transition-all space-y-3 shadow-md group"
                >
                  {/* Category & Source Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border ${
                        rumor.category === 'mega_deal' ? 'bg-amber-950 text-amber-300 border-amber-600' :
                        rumor.category === 'release_clause' ? 'bg-rose-950 text-rose-300 border-rose-600' :
                        rumor.category === 'contract_dispute' ? 'bg-purple-950 text-purple-300 border-purple-600' :
                        'bg-cyan-950 text-cyan-300 border-cyan-600'
                      }`}>
                        {rumor.category === 'mega_deal' && '💎 صفقة مدوية'}
                        {rumor.category === 'negotiation' && '👀 مفاوضات سرية'}
                        {rumor.category === 'release_clause' && '⚡ كسر شرط جزائي'}
                        {rumor.category === 'contract_dispute' && '⚠️ خلاف على العقد'}
                        {rumor.category === 'swap' && '🔄 صفقة تبادلية'}
                      </span>

                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Newspaper className="w-3 h-3 text-slate-500" />
                        {rumor.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">احتمالية الحسم:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rumor.probability >= 75 ? 'bg-emerald-500' :
                              rumor.probability >= 55 ? 'bg-amber-500' : 'bg-slate-500'
                            }`}
                            style={{ width: `${rumor.probability}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200">{rumor.probability}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Headline & Details */}
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors leading-relaxed">
                      {rumor.headline}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
                      {rumor.details}
                    </p>
                  </div>

                  {/* Player & Clubs Quick Box */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-xs">
                        {rumor.playerOverall}
                      </span>
                      <div>
                        <span className="font-bold text-white block">{rumor.playerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{rumor.playerPosition} • {rumor.playerAge} عاماً</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-medium">من: <strong className="text-slate-200">{rumor.currentClubName}</strong></span>
                      <span className="text-amber-400">➜</span>
                      <span className="text-slate-400 font-medium">إلى: <strong className="text-emerald-400">{rumor.interestedClubName}</strong></span>
                    </div>

                    {matchedPlayer && (
                      <button
                        onClick={() => handleStartNegotiation(matchedPlayer)}
                        className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded-xl font-bold text-xs flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Briefcase className="w-3 h-3" />
                        <span>خطف اللاعب والتفاوض معه</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 3: ACTIVE NEGOTIATIONS HUB                      */}
      {/* ==================================================== */}
      {activeTabMode === 'negotiations' && (
        <div className="space-y-3">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800 text-xs text-slate-400">
            💡 تظهر هنا جميع مفاوضات الشراء والبيع الجارية لناديك. تتطور العروض تلقائياً مع تقدم أيام التقويم، وعند الموافقة النهائية أو إتمام الصفقة يتم انتقال اللاعب وإيداع/خصم المبالغ المالية فوراً!
          </div>

          {activeNegotiations.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl text-xs text-slate-400 space-y-2">
              <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-slate-300">لا توجد مفاوضات نشطة حالياً.</p>
              <p className="text-[11px] text-slate-500">
                يمكنك بدء مفاوضات شراء من "السوق الشامل" أو عرض لاعبيك للبيع من تبويب "بيع لاعبيك" لتلقي العروض الرسمية.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeNegotiations.map(neg => {
                const isSell = neg.type === 'sell';
                const safeSellingClub = neg.sellingClubName || neg.playerClubName || 'نادي اللاعب';
                const buyerClubDisplay = neg.buyerClubName || 'النادي المشتري';
                const buyerClubObj = teams.find(t => t.id === neg.buyerClubId);

                return (
                  <div
                    key={neg.id}
                    className={`bg-slate-900 border p-4 rounded-2xl space-y-3 transition-all ${
                      neg.actionRequired
                        ? 'border-amber-500/80 shadow-lg shadow-amber-950/30'
                        : isSell
                        ? 'border-rose-500/40 bg-gradient-to-b from-slate-900 to-rose-950/10'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Negotiation Header */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isSell ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                          }`}>
                            {isSell ? '💰 عرض بيع وارد' : '🛒 مفاوضة شراء'}
                          </span>
                          <h4 className="font-bold text-sm text-white">{neg.playerName}</h4>
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                            {neg.playerPosition} • {neg.playerOverall}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          {isSell ? (
                            <>
                              النادي المشتري: <strong className="text-emerald-400 font-bold">{buyerClubDisplay}</strong> {buyerClubObj && <span className="text-[10px] text-slate-500 font-mono">(الميزانية: {buyerClubObj.budget.toLocaleString()} ج.م)</span>} | قيمة العرض: <strong className="text-emerald-400 font-mono font-bold">{neg.bidFee.toLocaleString()} ج.م</strong>
                            </>
                          ) : (
                            <>
                              النادي البائع: <strong className="text-slate-200 font-bold">{safeSellingClub}</strong> | العرض المقدم: <strong className="text-emerald-400 font-mono">{neg.bidFee.toLocaleString()} ج.م</strong> | راتب: <strong className="text-slate-200 font-mono">{neg.offeredSalary.toLocaleString()} ج.م/ش</strong>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-left">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold block ${
                          neg.stage === 'completed' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                          neg.stage === 'rejected' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                          neg.stage === 'player_terms' ? 'bg-blue-950 text-blue-300 border border-blue-700' :
                          neg.stage === 'incoming_bid' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse' :
                          'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}>
                          {neg.stage === 'incoming_bid' && (neg.managerHasCountered ? '⚡ عرض نهائي' : '🔥 عرض رسمي متاح')}
                          {neg.stage === 'club_review' && 'مراجعة النادي'}
                          {neg.stage === 'club_counter' && (isSell ? 'طلب زيادة المبلغ' : 'عرض مقابل من النادي')}
                          {neg.stage === 'player_terms' && 'شروط اللاعب'}
                          {neg.stage === 'player_counter' && 'طلب راتب أعلى'}
                          {neg.stage === 'completed' && 'اكتملت الصفقة'}
                          {neg.stage === 'rejected' && 'مرفوضة / منسحب'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" /> متبقي {neg.daysRemainingInStage || 1} يوم
                        </span>
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{neg.statusMessage}</span>
                    </div>

                    {/* Counter price input if active for this sell negotiation */}
                    {isSell && counteringNegId === neg.id && (
                      <div className="p-3 bg-slate-950 border border-amber-500/50 rounded-xl space-y-2.5 animate-fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-amber-300 font-bold">تحديد المقابل المالي المطلوب (عرض مقابل وحيد):</span>
                          <span className="text-slate-400 font-mono">العرض الحالي: {neg.bidFee.toLocaleString()} ج.م</span>
                        </div>
                        {buyerClubObj && (
                          <div className="text-[11px] text-slate-400 flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex-wrap gap-1">
                            <span>ميزانية {buyerClubObj.name} المتاحة: <strong className="text-emerald-400 font-mono">{buyerClubObj.budget.toLocaleString()} ج.م</strong></span>
                            <span className="text-rose-400">⚠️ طلب مبلغ أعلى من ميزانية النادي سيؤدي لانسحاب النادي فوراً</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={counterPriceInput}
                            onChange={e => setCounterPriceInput(e.target.value === '' ? '' : Number(e.target.value))}
                            onBlur={() => {
                              if (counterPriceInput === '' || Number(counterPriceInput) < neg.bidFee) {
                                setCounterPriceInput(Math.round(neg.bidFee * 1.15));
                              }
                            }}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex-1 font-mono focus:outline-none focus:border-amber-400"
                            min={neg.bidFee}
                            step={10000}
                            placeholder={`مثال: ${Math.round(neg.bidFee * 1.15)}`}
                          />
                          <button
                            onClick={() => {
                              const targetVal = typeof counterPriceInput === 'number' && counterPriceInput > 0
                                ? counterPriceInput
                                : (Number(counterPriceInput) || Math.round(neg.bidFee * 1.15));
                              const res = counterSellNegotiation(neg.id, targetVal);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 3500);
                              setCounteringNegId(null);
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all"
                          >
                            إرسال الطلب 📤
                          </button>
                          <button
                            onClick={() => setCounteringNegId(null)}
                            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800 flex-wrap">
                      {isSell ? (
                        <>
                          {neg.stage === 'incoming_bid' && (
                            <>
                              <button
                                onClick={() => {
                                  const res = acceptSellNegotiation(neg.id);
                                  setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                  setTimeout(() => setNotification(null), 4000);
                                }}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                <span>قبول البيع ({neg.bidFee.toLocaleString()} ج.م) وإتمام الصفقة 💰</span>
                              </button>

                              {!neg.managerHasCountered && (
                                <button
                                  onClick={() => {
                                    setCounteringNegId(neg.id);
                                    setCounterPriceInput(Math.round(neg.bidFee * 1.15));
                                  }}
                                  className="bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/60 text-amber-300 font-bold text-xs py-2 px-3 rounded-xl transition-all"
                                >
                                  <span>تقديم عرض مقابل (مرة واحدة فقط) 📈</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  const res = rejectSellNegotiation(neg.id);
                                  setNotification({ text: res.message, type: 'error' });
                                  setTimeout(() => setNotification(null), 3000);
                                }}
                                className="bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-700 border border-slate-700 text-slate-400 text-xs py-2 px-3 rounded-xl transition-all"
                              >
                                رفض العرض ✕
                              </button>
                            </>
                          )}

                          {neg.stage === 'club_counter' && (
                            <>
                              <span className="text-xs text-amber-300 flex-1 font-bold">
                                تم طلب مبلغ ({neg.demandedFee?.toLocaleString()} ج.م) • سيصل رد {buyerClubDisplay} مع تقدم الأيام.
                              </span>
                              <button
                                onClick={() => {
                                  const res = rejectSellNegotiation(neg.id);
                                  setNotification({ text: res.message, type: 'error' });
                                  setTimeout(() => setNotification(null), 3000);
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs py-2 px-3 rounded-xl transition-all"
                              >
                                سحب الطلب وإلغاء المفاوضات
                              </button>
                            </>
                          )}

                          {(neg.stage === 'rejected' || neg.stage === 'completed') && (
                            <button
                              onClick={() => cancelNegotiation(neg.id)}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-3 rounded-xl transition-all ml-auto"
                            >
                              إزالة من القائمة ✕
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenExistingNegotiation(neg)}
                            className="flex-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold text-xs py-2 rounded-xl transition-all"
                          >
                            مراجعة وتعديل العرض ✍️
                          </button>

                          {neg.demandedSalary && neg.stage === 'player_counter' && (
                            <button
                              onClick={() => {
                                const res = respondToNegotiationOffer(neg.id, 'raise_salary', neg.demandedSalary);
                                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                setTimeout(() => setNotification(null), 3000);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all"
                            >
                              قبول راتب اللاعب ({neg.demandedSalary.toLocaleString()} ج.م)
                            </button>
                          )}

                          {neg.demandedFee && neg.stage === 'club_counter' && (
                            <button
                              onClick={() => {
                                const res = respondToNegotiationOffer(neg.id, 'accept_counter', neg.demandedFee);
                                setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                                setTimeout(() => setNotification(null), 3000);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all"
                            >
                              قبول طلب النادي ({neg.demandedFee.toLocaleString()} ج.م)
                            </button>
                          )}

                          <button
                            onClick={() => cancelNegotiation(neg.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs px-3 py-2 rounded-xl transition-all"
                          >
                            إلغاء
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* VIEW 4: SELL SQUAD PLAYERS                           */}
      {/* ==================================================== */}
      {activeTabMode === 'sell' && (
        <div className="space-y-2.5">
          {!userClub ? (
            <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-3xl text-xs text-slate-400">
              أنت غير مرتبط بنادٍ حالياً ولا توجد قائمة لاعبين للبيع.
            </div>
          ) : (
            <>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span>📢 سوق بيع لاعبي الفريق وإدارة العروض</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  عند عرض أي لاعب للبيع، يتم طرحه رسمياً في سوق الانتقالات وتتلقى عروضاً من الأندية الأخرى للتفاوض ومتابعة العرض في تبويب المفاوضات. يمكنك قبول البيع فور وصول السعر المناسب لإيداع المبلغ في الخزينة فوراً.
                </p>
              </div>

              {(userClub.players || []).map(player => {
                const isListed = Boolean(player.isListedForTransfer);
                const activeSellNeg = activeNegotiations.find(
                  n => n.playerId === player.id && n.type === 'sell' && n.stage !== 'completed' && n.stage !== 'rejected'
                );
                const incomingBid = incomingBids.find(b => b.playerId === player.id);
                const salePrice = Math.round(player.marketValue * 0.95);

                return (
                  <div
                    key={player.id}
                    className={`bg-slate-900 border p-3.5 rounded-2xl flex items-center justify-between gap-3 flex-wrap transition-all ${
                      incomingBid ? 'border-emerald-500/60 bg-emerald-950/15 ring-1 ring-emerald-500/30' : isListed ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">
                        {player.overallRating}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{player.name}</span>
                          {incomingBid && (
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                              عرض شراء وارد 💰
                            </span>
                          )}
                          {isListed && !incomingBid && (
                            <span className="bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              معروض للبيع 📢
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {player.position} • {player.age} سنة • القيمة السوقية: <strong className="text-slate-200 font-mono">{player.marketValue.toLocaleString()} ج.م</strong> • راتب {player.salary.toLocaleString()} ج.م/ش
                        </div>

                        {incomingBid && (
                          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                            <span>🔥 عرض شراء رسمي من ({incomingBid.toClubName}) بمبلغ {incomingBid.bidAmount.toLocaleString()} ج.م</span>
                          </div>
                        )}

                        {activeSellNeg && !incomingBid && (
                          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-bold">
                            <span>🔥 عرض مفاوضات من ({activeSellNeg.buyerClubName}) بمبلغ {activeSellNeg.bidFee.toLocaleString()} ج.م</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {incomingBid ? (
                        <>
                          <button
                            onClick={() => {
                              const res = acceptIncomingBid(incomingBid.id);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 4000);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول البيع ({incomingBid.bidAmount.toLocaleString()} ج.م)</span>
                          </button>

                          <button
                            onClick={() => {
                              const res = rejectIncomingBid(incomingBid.id);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 3000);
                            }}
                            className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                          >
                            رفض العرض
                          </button>
                        </>
                      ) : activeSellNeg ? (
                        <>
                          <button
                            onClick={() => {
                              const res = acceptSellNegotiation(activeSellNeg.id);
                              setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                              setTimeout(() => setNotification(null), 4000);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول بيع ({activeSellNeg.bidFee.toLocaleString()} ج.م)</span>
                          </button>

                          <button
                            onClick={() => setActiveTabMode('negotiations')}
                            className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            إدارة التفاوض ✍️
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const res = listPlayerForTransfer(player.id, !isListed);
                            setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
                            setTimeout(() => setNotification(null), 3500);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                            isListed
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md font-black'
                          }`}
                        >
                          <span>{isListed ? 'سحب من البيع ✕' : 'عرض للبيع واستقبال عروض 📢'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleQuickSell(player)}
                        title="بيع فوري سريع بنسبة 95% من القيمة"
                        className="bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-red-400" />
                        <span>بيع فوري ({salePrice.toLocaleString()} ج.م)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Interactive Negotiation Modal */}
      <NegotiationModal
        player={negotiatingPlayer}
        userClub={userClub}
        existingNegotiation={selectedNegotiation}
        isOpen={isNegotiationModalOpen}
        onClose={() => {
          setIsNegotiationModalOpen(false);
          setNegotiatingPlayer(null);
          setSelectedNegotiation(null);
        }}
        onSubmitProposal={(proposal) => {
          const res = startPlayerNegotiation(proposal);
          setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
          setTimeout(() => setNotification(null), 3500);
          setIsNegotiationModalOpen(false);
          setActiveTabMode('negotiations');
        }}
        onRespondToCounter={(negId, action, extraVal) => {
          const res = respondToNegotiationOffer(negId, action, extraVal);
          setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
          setTimeout(() => setNotification(null), 3500);
          setIsNegotiationModalOpen(false);
        }}
      />

    </div>
  );
};
