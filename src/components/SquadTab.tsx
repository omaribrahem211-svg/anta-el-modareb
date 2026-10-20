import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, PositionCategory } from '../types/game';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Zap,
  Activity,
  Heart,
  DollarSign,
  ChevronRight,
  Shield,
  Award,
  Sparkles,
  Bandage,
  Stethoscope,
  Coins,
  Wallet,
  Gift,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface SquadTabProps {
  onSelectPlayer: (player: Player) => void;
}

export const SquadTab: React.FC<SquadTabProps> = ({ onSelectPlayer }) => {
  const { userClub, manager, addBonusToPlayer, addBonusToAllPlayers } = useGame();
  const [filterPos, setFilterPos] = useState<PositionCategory | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'rating' | 'fitness' | 'value' | 'age' | 'salary' | 'savings'>('rating');
  const [searchQuery, setSearchQuery] = useState('');

  // Bonus modal state
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusMode, setBonusMode] = useState<'single' | 'all'>('all');
  const [selectedPlayerForBonus, setSelectedPlayerForBonus] = useState<Player | null>(null);
  const [bonusAmount, setBonusAmount] = useState<number | string>(10000);
  const numBonusAmount = typeof bonusAmount === 'number' ? bonusAmount : (parseInt(bonusAmount) || 0);
  const [bonusSource, setBonusSource] = useState<'club' | 'manager'>('club');
  const [bonusFeedback, setBonusFeedback] = useState<{ text: string; success: boolean } | null>(null);

  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          👥
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا يوجد لديك قائمة لاعبين حالياً لأنك غير مرتبط بعقد تدريبي مع أي نادٍ. استعرض شواغر الأندية في تبويب المسيرة لتولي تدريب فريقك القادم!
        </p>
      </div>
    );
  }

  const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
  const startingIds = userClub.tactics?.startingPlayerIds || [];
  const benchIds = userClub.tactics?.benchPlayerIds || [];

  // Filter & Sort
  const filteredPlayers = squadPlayers.filter(player => {
    const matchesCategory = filterPos === 'ALL' || player.positionCategory === filterPos;
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (player.nickname && player.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.overallRating - a.overallRating;
    if (sortBy === 'fitness') return b.fitness - a.fitness;
    if (sortBy === 'value') return b.marketValue - a.marketValue;
    if (sortBy === 'age') return a.age - b.age;
    if (sortBy === 'salary') return b.salary - a.salary;
    if (sortBy === 'savings') return (b.savings || 0) - (a.savings || 0);
    return 0;
  });

  const avgSquadRating = squadPlayers.length > 0 ? Math.round(squadPlayers.reduce((sum, p) => sum + p.overallRating, 0) / squadPlayers.length) : 0;
  const avgAge = squadPlayers.length > 0 ? (squadPlayers.reduce((sum, p) => sum + p.age, 0) / squadPlayers.length).toFixed(1) : '0';
  const totalWage = squadPlayers.reduce((sum, p) => sum + (p.salary || 0), 0);
  const totalSquadSavings = squadPlayers.reduce((sum, p) => sum + (p.savings || 0), 0);
  const avgPlayerSavings = squadPlayers.length > 0 ? Math.round(totalSquadSavings / squadPlayers.length) : 0;

  const handleOpenSingleBonus = (e: React.MouseEvent, player: Player) => {
    e.stopPropagation();
    setSelectedPlayerForBonus(player);
    setBonusMode('single');
    setBonusAmount(10000);
    setBonusFeedback(null);
    setBonusModalOpen(true);
  };

  const handleOpenAllBonus = () => {
    setSelectedPlayerForBonus(null);
    setBonusMode('all');
    setBonusAmount(5000);
    setBonusFeedback(null);
    setBonusModalOpen(true);
  };

  const handleExecuteBonus = () => {
    if (numBonusAmount <= 0) return;
    if (bonusMode === 'single' && selectedPlayerForBonus) {
      const res = addBonusToPlayer(selectedPlayerForBonus.id, numBonusAmount, bonusSource);
      setBonusFeedback({ text: res.message, success: res.success });
      if (res.success) {
        setTimeout(() => {
          setBonusModalOpen(false);
          setBonusFeedback(null);
        }, 2200);
      }
    } else {
      const res = addBonusToAllPlayers(numBonusAmount, bonusSource);
      setBonusFeedback({ text: res.message, success: res.success });
      if (res.success) {
        setTimeout(() => {
          setBonusModalOpen(false);
          setBonusFeedback(null);
        }, 2200);
      }
    }
  };

  const totalCalculatedCost = bonusMode === 'all' ? numBonusAmount * squadPlayers.length : numBonusAmount;
  const currentFundingAvailable = bonusSource === 'club' ? (userClub.budget || 0) : (manager.personalWallet || 0);
  const canAffordBonus = currentFundingAvailable >= totalCalculatedCost;

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* Squad Summary Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">قائمة لاعبي الفريق</h2>
          </div>
          <span className="text-xs bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 font-bold text-slate-300">
            {squadPlayers.length} / 25 لاعباً
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">معدل التقييم</span>
            <span className="text-sm font-black text-emerald-400">{avgSquadRating}</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">معدل الأعمار</span>
            <span className="text-sm font-black text-white">{avgAge} سنة</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">إجمالي الرواتب</span>
            <span className="text-sm font-black text-amber-400">{(totalWage || 0).toLocaleString()} ج.م</span>
          </div>
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block flex items-center justify-center gap-1">
              <PiggyBank className="w-3 h-3 text-emerald-400" />
              مدخرات اللاعبين
            </span>
            <span className="text-sm font-black text-emerald-300">
              {totalSquadSavings >= 1000000 
                ? `${(totalSquadSavings / 1000000).toFixed(1)}M ج.م` 
                : `${(totalSquadSavings / 1000).toFixed(0)}k ج.م`}
            </span>
          </div>
        </div>

        {/* Squad Financial Actions Bar */}
        <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span>متوسط رصيد اللاعب: <strong className="text-emerald-400 font-mono font-bold">{(avgPlayerSavings || 0).toLocaleString()} ج.م</strong></span>
          </div>
          
          <button
            onClick={handleOpenAllBonus}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-95 transition-all shrink-0"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>صرف مكافأة جماعية</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-2">
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن اسم لاعب أو لقبه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Position Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'الكل' },
            { id: 'GK', label: 'حراس المرمى' },
            { id: 'DEF', label: 'الدفاع' },
            { id: 'MID', label: 'الوسط' },
            { id: 'FWD', label: 'الهجوم' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterPos(tab.id as PositionCategory | 'ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterPos === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <span>عرض {filteredPlayers.length} لاعب</span>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none"
            >
              <option value="rating">الأعلى تقييماً</option>
              <option value="savings">الأعلى رصيداً ومدخرات 💰</option>
              <option value="salary">الأعلى راتباً</option>
              <option value="value">الأعلى قيمة سوقية</option>
              <option value="fitness">الأعلى لياقة</option>
              <option value="age">الأصغر سناً</option>
            </select>
          </div>
        </div>

      </div>

      {/* Players List */}
      <div className="space-y-2">
        {filteredPlayers.map((player) => {
          const isStarter = startingIds.includes(player.id);
          const isBench = benchIds.includes(player.id);
          const playerSavings = player.savings || 0;
          const playerBonuses = player.totalBonusesReceived || 0;

          return (
            <div
              key={player.id}
              onClick={() => onSelectPlayer(player)}
              className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-2.5 active:scale-[0.99]"
            >
              {/* Left: Overall & Info */}
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Rating Badge */}
                <div 
                  className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black shrink-0 border ${
                    player.overallRating >= 56 
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-700' 
                      : player.overallRating >= 50 
                      ? 'bg-blue-950 text-blue-400 border-blue-700' 
                      : 'bg-amber-950 text-amber-400 border-amber-700'
                  }`}
                >
                  <span className="text-base leading-none">{player.overallRating}</span>
                  <span className="text-[8px] uppercase tracking-wider font-bold">{player.position}</span>
                </div>

                {/* Name & Role */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">{player.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">#{player.number}</span>
                    <span className="text-[10px] text-slate-300 bg-slate-800/80 px-1 py-0.2 rounded border border-slate-700">
                      {player.nationalityCode === 'EGY' ? '🇪🇬' : player.nationalityCode === 'SAU' ? '🇸🇦' : player.nationalityCode === 'UAE' ? '🇦🇪' : player.nationalityCode === 'QAT' ? '🇶🇦' : player.nationalityCode === 'MAR' ? '🇲🇦' : player.nationalityCode === 'TUN' ? '🇹🇳' : player.nationalityCode === 'ALG' ? '🇩🇿' : player.nationalityCode === 'ESP' ? '🇪🇸' : player.nationalityCode === 'ENG' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' : player.nationalityCode === 'FRA' ? '🇫🇷' : player.nationalityCode === 'ITA' ? '🇮🇹' : player.nationalityCode === 'GER' ? '🇩🇪' : player.nationalityCode === 'BRA' ? '🇧🇷' : player.nationalityCode === 'ARG' ? '🇦🇷' : '🇪🇬'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPositionBadgeClass(player.position)}`}>
                      {getPositionArabic(player.position)} ({player.position})
                    </span>
                    {player.nickname && (
                      <span className="text-amber-400 text-[11px] truncate">"{player.nickname}"</span>
                    )}
                    <span className="text-slate-400 text-[11px]">• {player.age} سنة</span>
                  </div>

                  {/* Starter / Bench / Injury Badge & Financial Status */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {player.isInjured || (player.injury && player.injury.daysRemaining > 0) ? (
                      <span className="text-[9px] bg-red-950 text-red-300 border border-red-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-1 animate-pulse">
                        <Bandage className="w-3 h-3 text-red-400" />
                        مصاب: {player.injury?.type || player.injuryType || 'إصابة'} ({player.injury?.daysRemaining || 3} يوم)
                      </span>
                    ) : isStarter ? (
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-bold">
                        أساسي (تشكيل أول)
                      </span>
                    ) : isBench ? (
                      <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-700 px-1.5 py-0.2 rounded font-medium">
                        بديل
                      </span>
                    ) : (
                      <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded">
                        احتياطي
                      </span>
                    )}

                    {/* Financial Badge: Player Savings */}
                    {(player.isSuspended || (player.suspensionMatches && player.suspensionMatches > 0)) && (
                      <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-700 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        موقوف ({player.suspensionMatches || 1} مباراة)
                      </span>
                    )}

                    <span className="text-[9px] bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                      <PiggyBank className="w-2.5 h-2.5 text-emerald-400" />
                      رصيده: {playerSavings.toLocaleString()} ج.م
                    </span>

                    {playerBonuses > 0 && (
                      <span className="text-[9px] bg-amber-950/70 text-amber-300 border border-amber-800/60 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                        <Gift className="w-2.5 h-2.5 text-amber-400" />
                        مكافآت: {playerBonuses.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Finances, Action & Chevron */}
              <div className="flex items-center gap-2 shrink-0 text-left">
                <div className="flex flex-col items-end">
                  {/* Fitness Indicator */}
                  <div className="flex items-center gap-1">
                    <Activity className={`w-3 h-3 ${player.fitness > 80 ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span className="text-xs font-bold text-slate-200">{player.fitness}%</span>
                  </div>

                  <div className="text-[11px] font-bold text-emerald-400 mt-0.5">
                    {((player.marketValue || 50000) / 1000).toFixed(0)}k ج.م
                  </div>

                  <div className="text-[9px] text-slate-500">
                    {((player.salary || 2500)).toLocaleString()} ج.م/ش
                  </div>
                </div>

                {/* Direct Player Bonus Button */}
                <button
                  onClick={(e) => handleOpenSingleBonus(e, player)}
                  title="صرف مكافأة مالية تحفيزية للاعب"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-emerald-400 border border-slate-700 hover:border-emerald-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>مكافأة</span>
                </button>

                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonus Distribution Modal */}
      {bonusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {bonusMode === 'single' ? `صرف مكافأة لـ: ${selectedPlayerForBonus?.name}` : 'صرف مكافأة جماعية لجميع اللاعبين'}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {bonusMode === 'single' ? 'زيادة رصيد اللاعب ورفع معنوياته للقمة' : `صرف موحد لعدد ${squadPlayers.length} لاعباً بالفريق`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setBonusModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target mode toggle if opened freely */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setBonusMode('all')}
                className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  bonusMode === 'all' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>الفريق كاملاً ({squadPlayers.length})</span>
              </button>
              <button
                onClick={() => {
                  setBonusMode('single');
                  if (!selectedPlayerForBonus && squadPlayers.length > 0) {
                    setSelectedPlayerForBonus(squadPlayers[0]);
                  }
                }}
                className={`py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                  bonusMode === 'single' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>لاعب محدد</span>
              </button>
            </div>

            {/* Select player dropdown if single mode */}
            {bonusMode === 'single' && (
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300 font-bold block">اختر اللاعب المستفيد:</label>
                <select
                  value={selectedPlayerForBonus?.id || ''}
                  onChange={(e) => {
                    const p = squadPlayers.find(pl => pl.id === e.target.value);
                    if (p) setSelectedPlayerForBonus(p);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {squadPlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.number} - {getPositionArabic(p.position)}) | رصيده الحالي: {(p.savings || 0).toLocaleString()} ج.م
                    </option>
                  ))}
                </select>

                {selectedPlayerForBonus && (
                  <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">الرصيد الشخصي الحالي للاعب</span>
                      <span className="font-bold font-mono text-emerald-400">{(selectedPlayerForBonus.savings || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="text-left">
                      <span className="text-slate-400 block text-[10px]">إجمالي المكافآت السابقة</span>
                      <span className="font-bold font-mono text-amber-400">{(selectedPlayerForBonus.totalBonusesReceived || 0).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Funding Source Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">جهة تمويل المكافأة:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setBonusSource('club')}
                  className={`p-2.5 rounded-2xl border text-right transition-all ${
                    bonusSource === 'club' 
                      ? 'bg-blue-950/60 border-blue-500 text-white' 
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block font-bold text-xs flex items-center gap-1 text-blue-300">
                    <Shield className="w-3 h-3" />
                    ميزانية النادي
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono block mt-1">
                    {(userClub.budget || 0).toLocaleString()} ج.م
                  </span>
                </button>

                <button
                  onClick={() => setBonusSource('manager')}
                  className={`p-2.5 rounded-2xl border text-right transition-all ${
                    bonusSource === 'manager' 
                      ? 'bg-amber-950/60 border-amber-500 text-white' 
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block font-bold text-xs flex items-center gap-1 text-amber-300">
                    <Wallet className="w-3 h-3" />
                    محفظتك الشخصية
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono block mt-1">
                    {(manager.personalWallet || 0).toLocaleString()} ج.م
                  </span>
                </button>
              </div>
            </div>

            {/* Bonus Amount Presets */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-bold block">
                {bonusMode === 'all' ? 'المبلغ المخصص لكل لاعب:' : 'قيمة المكافأة:'}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5000, 10000, 25000, 50000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBonusAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      numBonusAmount === amt
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {(amt / 1000)}k
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div className="pt-1">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  onBlur={() => {
                    if (bonusAmount === '' || Number(bonusAmount) <= 0) setBonusAmount(5000);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-white font-mono text-center focus:outline-none focus:border-amber-500"
                  placeholder="أو أدخل مبلغاً مخصصاً بالجنيه المصري..."
                />
              </div>
            </div>

            {/* Calculation & Cost Summary */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>المبلغ لكل لاعب:</span>
                <span className="font-mono text-white font-bold">{numBonusAmount.toLocaleString()} ج.م</span>
              </div>
              {bonusMode === 'all' && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>عدد اللاعبين:</span>
                  <span className="font-mono text-white font-bold">{squadPlayers.length} لاعبين</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-1.5 font-bold">
                <span>التكلفة الإجمالية المطلوبة:</span>
                <span className="font-mono text-amber-400 text-sm font-black">
                  {totalCalculatedCost.toLocaleString()} ج.م
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>المتاح في المصدر المختار:</span>
                <span className={`font-mono font-bold ${canAffordBonus ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentFundingAvailable.toLocaleString()} ج.م
                </span>
              </div>
            </div>

            {/* Feedback Alert */}
            {bonusFeedback && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                bonusFeedback.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
              }`}>
                {bonusFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{bonusFeedback.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleExecuteBonus}
                disabled={!canAffordBonus || numBonusAmount <= 0}
                className={`flex-1 py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                  canAffordBonus && numBonusAmount > 0
                    ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-slate-950 active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>
                  {canAffordBonus ? 'تأكيد وصرف المكافأة فوراً' : 'الرصيد المتاح غير كافٍ'}
                </span>
              </button>
              <button
                onClick={() => setBonusModalOpen(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

