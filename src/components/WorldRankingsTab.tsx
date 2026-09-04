import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Trophy, 
  Globe2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  Shield, 
  Award, 
  Sparkles, 
  Flame,
  CheckCircle2,
  Filter,
  UserCheck,
  Compass,
  AlertCircle
} from 'lucide-react';
import { ClubManager, WorldClubRankingItem } from '../types/game';

type RankingType = 'managers' | 'clubs';
type RegionFilter = 'all' | 'egypt' | 'africa' | 'europe' | 'asia';

export const WorldRankingsTab: React.FC = () => {
  const { 
    worldRankings, 
    manager, 
    userClub, 
    calendarDate,
    userSquadStrength,
    userDynamicManagerRating 
  } = useGame();

  const [rankingType, setRankingType] = useState<RankingType>('managers');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManager, setSelectedManager] = useState<ClubManager | null>(null);
  const [selectedClub, setSelectedClub] = useState<WorldClubRankingItem | null>(null);

  const managersList = worldRankings?.managers || [];
  const clubsList = worldRankings?.clubs || [];

  // Filtered Managers
  const filteredManagers = useMemo(() => {
    return managersList.filter(mgr => {
      // Region filter
      if (regionFilter === 'egypt') {
        const isEg = mgr.nationality === 'مصر' || mgr.currentClubName.includes('الأهلي') || mgr.currentClubName.includes('الزمالك') || mgr.currentClubName.includes('بيراميدز') || (mgr.currentLeagueId && mgr.currentLeagueId.startsWith('egy_'));
        if (!isEg) return false;
      } else if (regionFilter === 'africa') {
        const isAf = ['مصر', 'تونس', 'المغرب', 'الجزائر', 'جنوب إفريقيا'].includes(mgr.nationality) || (mgr.currentLeagueId && mgr.currentLeagueId.startsWith('egy_'));
        if (!isAf) return false;
      } else if (regionFilter === 'europe') {
        const isEu = ['إسبانيا', 'إيطاليا', 'إنجلترا', 'ألمانيا', 'فرنسا', 'البرتغال', 'هولندا', 'بلجيكا', 'كرواتيا', 'سويسرا', 'النمسا'].includes(mgr.nationality) || (mgr.currentLeagueId && (mgr.currentLeagueId.startsWith('eng_') || mgr.currentLeagueId.startsWith('esp_') || mgr.currentLeagueId.startsWith('ita_') || mgr.currentLeagueId.startsWith('ger_') || mgr.currentLeagueId.startsWith('fra_')));
        if (!isEu) return false;
      } else if (regionFilter === 'asia') {
        const isAs = ['السعودية', 'الإمارات', 'قطر', 'تركيا', 'أستراليا'].includes(mgr.nationality) || (mgr.currentLeagueId && (mgr.currentLeagueId.startsWith('sau_') || mgr.currentLeagueId.startsWith('uae_') || mgr.currentLeagueId.startsWith('qat_')));
        if (!isAs) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = mgr.name.toLowerCase().includes(q);
        const matchClub = mgr.currentClubName.toLowerCase().includes(q);
        const matchNat = mgr.nationality.toLowerCase().includes(q);
        return matchName || matchClub || matchNat;
      }

      return true;
    });
  }, [managersList, regionFilter, searchQuery]);

  // Filtered Clubs
  const filteredClubs = useMemo(() => {
    return clubsList.filter(club => {
      // Region filter
      if (regionFilter === 'egypt') {
        if (club.country !== 'مصر' && !club.leagueId.startsWith('egy_')) return false;
      } else if (regionFilter === 'africa') {
        const isAf = ['مصر', 'المغرب', 'تونس', 'الجزائر'].includes(club.country) || club.leagueId.startsWith('egy_');
        if (!isAf) return false;
      } else if (regionFilter === 'europe') {
        const isEu = ['إنجلترا', 'إسبانيا', 'إيطاليا', 'ألمانيا', 'فرنسا'].includes(club.country) || club.leagueId.startsWith('eng_') || club.leagueId.startsWith('esp_') || club.leagueId.startsWith('ita_') || club.leagueId.startsWith('ger_') || club.leagueId.startsWith('fra_');
        if (!isEu) return false;
      } else if (regionFilter === 'asia') {
        const isAs = ['السعودية', 'الإمارات', 'قطر'].includes(club.country) || club.leagueId.startsWith('sau_') || club.leagueId.startsWith('uae_') || club.leagueId.startsWith('qat_');
        if (!isAs) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = club.clubName.toLowerCase().includes(q);
        const matchCountry = club.country.toLowerCase().includes(q);
        const matchMgr = club.managerName.toLowerCase().includes(q);
        return matchName || matchCountry || matchMgr;
      }

      return true;
    });
  }, [clubsList, regionFilter, searchQuery]);

  // User Manager Entity in list
  const userManagerInRankings = useMemo(() => {
    return managersList.find(m => m.id === 'user_manager' || m.name.includes('(أنت)'));
  }, [managersList]);

  // User Club Entity in list
  const userClubInRankings = useMemo(() => {
    return clubsList.find(c => c.clubId === userClub?.id);
  }, [clubsList, userClub]);

  const top1Manager = managersList[0];
  const pointsToTop1 = top1Manager && userManagerInRankings 
    ? Math.max(0, top1Manager.rankingPoints - userManagerInRankings.rankingPoints) 
    : 10000;

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-800/40 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-indigo-900/80 text-indigo-300 border border-indigo-700/60 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 shadow-sm">
                <Globe2 className="w-3.5 h-3.5 text-indigo-400" />
                تصنيف الفيفا و IFFHS العالمي
              </span>
              <span className="bg-slate-800/80 text-slate-300 text-xs px-2.5 py-1 rounded-full font-medium border border-slate-700">
                تحديث شهري: {calendarDate?.formattedArabic || 'أغسطس 2026'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              التصنيف العالمي للأندية والمدربين 🌍
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              ترتيب معتمد يعتمد على <strong className="text-amber-300">قوة التشكيلة الأساسية</strong> و <strong className="text-amber-300">تقييم المدرب</strong> ونقاط البطولات الواقعية. للوصول للمركز الأول عالمياً يجب تدريب أكبر الأندية والفوز بالبطولات القارية الكبرى!
            </p>
          </div>

          {/* Quick Rank Capsule */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-indigo-500/30 p-3.5 rounded-xl shadow-lg shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex flex-col items-center justify-center font-black shadow-md">
              <span className="text-[10px] uppercase tracking-tighter font-extrabold leading-none">ترتيبك</span>
              <span className="text-lg leading-tight">#{userManagerInRankings?.worldRank || manager.worldRank || 850}</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{manager.name}</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-800/60">
                  تقييم {userDynamicManagerRating || 60}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                نقاطك: <span className="text-amber-400 font-bold">{userManagerInRankings?.rankingPoints?.toLocaleString() || (manager.rankingPoints || 1200).toLocaleString()}</span> نقطة
              </p>
              <div className="flex items-center gap-1 text-[10px] text-indigo-300">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>الفارق عن #1 عالمياً: {pointsToTop1.toLocaleString()} نقطة</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Reality Notice */}
      <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-200">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>تنبيه واقعية التصنيف:</strong> الفوز بالدوري المحلي (مثل الدوري المصري أو الدرجات الأدنى) يمنح نقاطاً مدروسة ولكن لن يجعلك المصنف الأول عالمياً فوراً! لكي تتصدر العالم كأفضل مدرب، تحتاج لبناء سمعتك التدريبية، حصد الرخص المتقدمة، وتدريب عمالقة العالم والمنافسة على دوري أبطال أوروبا وكأس العالم للأندية.
        </p>
      </div>

      {/* Navigation Switch & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Toggle between Managers and Clubs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => setRankingType('managers')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              rankingType === 'managers'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            تصنيف المدربين العالمي
            <span className="bg-indigo-950 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-800">
              {managersList.length}
            </span>
          </button>
          
          <button
            onClick={() => setRankingType('clubs')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              rankingType === 'clubs'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            تصنيف الأندية العالمي
            <span className="bg-indigo-950 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded-full border border-indigo-800">
              {clubsList.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={rankingType === 'managers' ? 'بحث عن اسم المدرب أو النادي...' : 'بحث عن النادي أو الدولة...'}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Regional Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
        <span className="text-slate-500 text-xs font-semibold pl-1 shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3" />
          المنطقة:
        </span>
        {[
          { id: 'all', label: 'العالم أجمع 🌐' },
          { id: 'egypt', label: 'الدوري المصري 🇪🇬' },
          { id: 'africa', label: 'إفريقيا 🌍' },
          { id: 'europe', label: 'أوروبا 🏆' },
          { id: 'asia', label: 'آسيا والخليج 🇸🇦' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setRegionFilter(item.id as RegionFilter)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              regionFilter === item.id
                ? 'bg-slate-700 text-white font-bold border border-slate-600 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* RANKINGS CONTENT */}
      {rankingType === 'managers' ? (
        /* ================= MANAGERS RANKING VIEW ================= */
        <div className="space-y-3">
          {/* User's Floating Status Highlight */}
          {userManagerInRankings && (
            <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border-2 border-amber-500/60 rounded-2xl p-4 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex flex-col items-center justify-center font-black shrink-0 shadow">
                    <span className="text-[10px] leading-none uppercase">رقمك</span>
                    <span className="text-lg">#{userManagerInRankings.worldRank}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-white">{userManagerInRankings.name}</h4>
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                        أنت
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      النادي الحالي: <strong className="text-slate-200">{userManagerInRankings.currentClubName}</strong> • الجنسية: {userManagerInRankings.nationality}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-400 block">قوة وتصنيف المدرب</span>
                    <span className="text-base font-black text-amber-400">{userDynamicManagerRating} / 99</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800"></div>
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-400 block">نقاط التصنيف</span>
                    <span className="text-base font-black text-indigo-400">{userManagerInRankings.rankingPoints.toLocaleString()}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800"></div>
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-400 block">التغير الشهري</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                      {userManagerInRankings.monthlyRankChange > 0 ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          +{userManagerInRankings.monthlyRankChange}
                        </>
                      ) : userManagerInRankings.monthlyRankChange < 0 ? (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                          {userManagerInRankings.monthlyRankChange}
                        </>
                      ) : (
                        <>
                          <Minus className="w-3.5 h-3.5 text-slate-400" />
                          0
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List of Managers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-800/70">
            {filteredManagers.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Search className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold">لم يتم العثور على أي مدربين يطابقون شروط البحث.</p>
              </div>
            ) : (
              filteredManagers.map((mgr) => {
                const isUser = mgr.id === 'user_manager' || mgr.name.includes('(أنت)');
                const isTop3 = mgr.worldRank <= 3;

                return (
                  <div
                    key={mgr.id}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                      isUser
                        ? 'bg-amber-950/20 hover:bg-amber-950/30'
                        : isTop3
                        ? 'bg-slate-900/90 hover:bg-slate-800/60'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Left Rank & Basic Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* World Rank Badge */}
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          mgr.worldRank === 1
                            ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 shadow-amber-500/20'
                            : mgr.worldRank === 2
                            ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950'
                            : mgr.worldRank === 3
                            ? 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        {mgr.worldRank <= 3 && <Trophy className="w-3.5 h-3.5 mr-0.5" />}
                        #{mgr.worldRank}
                      </div>

                      {/* Rank Movement */}
                      <div className="hidden xs:flex flex-col items-center justify-center w-7 shrink-0 text-[10px] font-bold">
                        {mgr.monthlyRankChange > 0 ? (
                          <span className="text-emerald-400 flex items-center">
                            <TrendingUp className="w-3 h-3" />
                            +{mgr.monthlyRankChange}
                          </span>
                        ) : mgr.monthlyRankChange < 0 ? (
                          <span className="text-red-400 flex items-center">
                            <TrendingDown className="w-3 h-3" />
                            {mgr.monthlyRankChange}
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center">
                            <Minus className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Manager Name, Club, Tactical Style */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-white truncate">
                            {mgr.name}
                          </h3>
                          {isUser && (
                            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded shrink-0">
                              أنت
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 hidden sm:inline shrink-0">
                            ({mgr.nationality})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                          <span className="text-slate-300 font-medium truncate">
                            {mgr.currentClubName}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[11px] bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded text-indigo-300">
                            {mgr.tacticalStyle === 'tiki_taka' ? 'تيكي تاكا' :
                             mgr.tacticalStyle === 'high_press' ? 'ضغط عالي' :
                             mgr.tacticalStyle === 'counter_attack' ? 'مرتدات خاطفة' :
                             mgr.tacticalStyle === 'possession' ? 'استحواذ' :
                             mgr.tacticalStyle === 'defensive' ? 'تنظيم دفاعي' :
                             mgr.tacticalStyle === 'attacking' ? 'هجومي شامل' : 'متوازن'}
                          </span>
                          {mgr.trophiesWonCount > 0 && (
                            <span className="text-[11px] text-amber-400 font-medium hidden md:inline">
                              🏆 {mgr.trophiesWonCount} ألقاب
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Metrics: Manager Rating & Ranking Points */}
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0 text-left">
                      {/* Rating Gauge */}
                      <div className="text-center bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl min-w-[62px]">
                        <span className="text-[9px] text-slate-400 block font-medium">قوة المدرب</span>
                        <span className={`text-sm sm:text-base font-black ${
                          mgr.rating >= 90 ? 'text-amber-400' :
                          mgr.rating >= 80 ? 'text-emerald-400' :
                          mgr.rating >= 70 ? 'text-sky-400' : 'text-slate-300'
                        }`}>
                          {mgr.rating}
                        </span>
                      </div>

                      {/* Ranking Points */}
                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] text-slate-400 block">نقاط التصنيف</span>
                        <span className="text-xs sm:text-sm font-black text-indigo-300">
                          {mgr.rankingPoints.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ================= CLUBS RANKING VIEW ================= */
        <div className="space-y-3">
          {/* User Club Floating Highlight */}
          {userClubInRankings && (
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex flex-col items-center justify-center font-black shrink-0 shadow">
                    <span className="text-[10px] leading-none uppercase">رتبة ناديك</span>
                    <span className="text-lg">#{userClubInRankings.worldRank}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-white">{userClubInRankings.clubName}</h4>
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                        ناديك
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      الدوري: <strong className="text-slate-200">{userClubInRankings.leagueName}</strong> • المدرب: {userClubInRankings.managerName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-400 block">قوة التشكيل</span>
                    <span className="text-base font-black text-emerald-400">{userSquadStrength.overall}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800"></div>
                  <div className="text-center px-2">
                    <span className="text-[10px] text-slate-400 block">نقاط النادي</span>
                    <span className="text-base font-black text-indigo-400">{userClubInRankings.rankingPoints.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* List of Clubs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl divide-y divide-slate-800/70">
            {filteredClubs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Search className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold">لم يتم العثور على أي نادٍ يطابق شروط البحث.</p>
              </div>
            ) : (
              filteredClubs.map((club) => {
                const isUser = club.clubId === userClub?.id;
                const isTop3 = club.worldRank <= 3;

                return (
                  <div
                    key={club.clubId}
                    className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                      isUser
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                        : isTop3
                        ? 'bg-slate-900/90 hover:bg-slate-800/60'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Left Rank & Club Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* World Rank Badge */}
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          club.worldRank === 1
                            ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 shadow-amber-500/20'
                            : club.worldRank === 2
                            ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950'
                            : club.worldRank === 3
                            ? 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        {club.worldRank <= 3 && <Trophy className="w-3.5 h-3.5 mr-0.5" />}
                        #{club.worldRank}
                      </div>

                      {/* Rank Movement */}
                      <div className="hidden xs:flex flex-col items-center justify-center w-7 shrink-0 text-[10px] font-bold">
                        {club.monthlyRankChange > 0 ? (
                          <span className="text-emerald-400 flex items-center">
                            <TrendingUp className="w-3 h-3" />
                            +{club.monthlyRankChange}
                          </span>
                        ) : club.monthlyRankChange < 0 ? (
                          <span className="text-red-400 flex items-center">
                            <TrendingDown className="w-3 h-3" />
                            {club.monthlyRankChange}
                          </span>
                        ) : (
                          <span className="text-slate-500 flex items-center">
                            <Minus className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      {/* Club Name, Country, Manager */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                            style={{ backgroundColor: club.primaryColor }}
                          />
                          <h3 className="font-bold text-sm sm:text-base text-white truncate">
                            {club.clubName}
                          </h3>
                          {isUser && (
                            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded shrink-0">
                              ناديك
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 hidden sm:inline shrink-0">
                            ({club.country})
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                          <span className="text-slate-300 font-medium truncate">
                            {club.leagueName}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">
                            المدرب: <strong className="text-slate-200">{club.managerName}</strong> (تقييم {club.managerRating})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Metrics: Squad Strength & Points */}
                    <div className="flex items-center gap-3 sm:gap-5 shrink-0 text-left">
                      {/* Squad Strength */}
                      <div className="text-center bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded-xl min-w-[62px]">
                        <span className="text-[9px] text-slate-400 block font-medium">قوة التشكيل</span>
                        <span className={`text-sm sm:text-base font-black ${
                          club.squadStrength >= 85 ? 'text-amber-400' :
                          club.squadStrength >= 75 ? 'text-emerald-400' :
                          club.squadStrength >= 65 ? 'text-sky-400' : 'text-slate-300'
                        }`}>
                          {club.squadStrength}
                        </span>
                      </div>

                      {/* Ranking Points */}
                      <div className="text-right min-w-[70px]">
                        <span className="text-[10px] text-slate-400 block">نقاط النادي</span>
                        <span className="text-xs sm:text-sm font-black text-indigo-300">
                          {club.rankingPoints.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
