import React, { useState, useMemo } from 'react';
import { DailyNewsItem, Club, ManagerProfile, LeagueStanding, CalendarDate } from '../../types/game';
import { generateImmersiveNewsBatch } from '../../services/footballNewsEngine';
import { 
  Newspaper, 
  Flame, 
  Sparkles, 
  Heart, 
  MessageSquare, 
  Search, 
  RefreshCw, 
  Clock, 
  ArrowRight, 
  X, 
  Share2, 
  Check, 
  ShieldAlert,
  SlidersHorizontal,
  ChevronLeft
} from 'lucide-react';

interface FootballNewsFeedProps {
  news: DailyNewsItem[];
  onAddNews?: (newItems: DailyNewsItem[]) => void;
  userClub?: Club | null;
  manager?: ManagerProfile | null;
  teams: Club[];
  standings: LeagueStanding[];
  currentRound: number;
  calendarDate?: CalendarDate;
  compact?: boolean;
}

type NewsCategoryFilter = 'all' | 'match' | 'transfer' | 'board' | 'youth' | 'my_club';

export const FootballNewsFeed: React.FC<FootballNewsFeedProps> = ({
  news,
  onAddNews,
  userClub,
  manager,
  teams,
  standings,
  currentRound,
  calendarDate,
  compact = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<NewsCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<DailyNewsItem | null>(null);
  const [likedArticles, setLikedArticles] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Find breaking news
  const safeNews = useMemo(() => {
    return (Array.isArray(news) ? news : []).filter(item => item && item.id);
  }, [news]);

  const breakingNewsItem = useMemo(() => {
    return safeNews.find(item => item?.isBreaking) || safeNews[0] || null;
  }, [safeNews]);

  // Filtered news items
  const filteredNews = useMemo(() => {
    return safeNews.filter(item => {
      if (!item || !item.id) return false;
      // Category filter
      if (activeCategory === 'my_club') {
        if (!userClub?.name) return false;
        const matchesClub = item.clubName === userClub.name || 
          item.title?.includes(userClub.name) || 
          item.content?.includes(userClub.name) ||
          (manager?.name && (item.title?.includes(manager.name) || item.content?.includes(manager.name)));
        if (!matchesClub) return false;
      } else if (activeCategory !== 'all') {
        if (item.category !== activeCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = item.title?.toLowerCase().includes(q) || false;
        const inContent = item.content?.toLowerCase().includes(q) || false;
        const inSource = item.source?.toLowerCase().includes(q) || false;
        const inClub = item.clubName?.toLowerCase().includes(q) || false;
        const inTags = item.tags?.some(t => t.toLowerCase().includes(q)) || false;
        if (!inTitle && !inContent && !inSource && !inClub && !inTags) {
          return false;
        }
      }

      return true;
    });
  }, [safeNews, activeCategory, searchQuery, userClub, manager]);

  // Handle like toggle
  const handleToggleLike = (e: React.MouseEvent, articleId: string) => {
    e.stopPropagation();
    setLikedArticles(prev => ({
      ...prev,
      [articleId]: !prev[articleId]
    }));
  };

  // Handle refresh feed / reporter dispatch
  const handleRefreshNews = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    setTimeout(() => {
      if (onAddNews) {
        const freshBatch = generateImmersiveNewsBatch({
          calendarDate,
          userClub,
          manager,
          teams,
          standings,
          currentRound,
        }, 3);
        onAddNews(freshBatch);
      }
      setIsRefreshing(false);
    }, 600);
  };

  // Handle article share
  const handleShareArticle = (e: React.MouseEvent, article: DailyNewsItem) => {
    e.stopPropagation();
    const shareText = `📰 ${article.title}\n\n${article.content}\n\nالمصدر: ${article.source || 'أخبار الكرة المصرية'}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        setCopiedShareId(article.id);
        setTimeout(() => setCopiedShareId(null), 2500);
      }).catch(() => {});
    }
  };

  // Helper for category badge styling
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'transfer':
        return { label: 'سوق الانتقالات', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' };
      case 'match':
        return { label: 'المباريات والنتائج', color: 'bg-blue-950/80 text-blue-300 border-blue-800/80' };
      case 'board':
        return { label: 'الإدارة والمدربون', color: 'bg-amber-950/80 text-amber-300 border-amber-800/80' };
      case 'youth':
        return { label: 'المواهب والناشئون', color: 'bg-purple-950/80 text-purple-300 border-purple-800/80' };
      case 'crisis':
        return { label: 'أزمات وطوارئ', color: 'bg-rose-950/80 text-rose-300 border-rose-800/80' };
      case 'milestone':
        return { label: 'إنجازات وأرقام', color: 'bg-yellow-950/80 text-yellow-300 border-yellow-800/80' };
      default:
        return { label: 'أخبار عامة', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header Banner & Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Newspaper className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              <span>جريدة صدى الملاعب والمسيرة</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                تغطية حية
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              أحدث الكواليس، تحركات الميركاتو، وتصريحات المدربين في الدوري
            </p>
          </div>
        </div>

        {/* Live Refresh Button */}
        <button
          onClick={handleRefreshNews}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 hover:text-white active:scale-95 disabled:opacity-50"
          title="تحديث التقارير الصحفية"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">مراسل الملاعب</span>
        </button>
      </div>

      {/* 2. Breaking News Ticker */}
      {breakingNewsItem && (
        <div 
          onClick={() => setSelectedArticle(breakingNewsItem)}
          className="cursor-pointer bg-gradient-to-r from-red-950/70 via-slate-900/90 to-red-950/50 border border-red-800/60 hover:border-red-600/80 p-2.5 sm:p-3 rounded-2xl flex items-center gap-2.5 shadow-lg group transition-all"
        >
          <div className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shrink-0 animate-pulse shadow-md">
            <Flame className="w-3 h-3 fill-white" />
            <span>عاجل</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-red-100 group-hover:text-white truncate transition-colors">
              {breakingNewsItem.title}
            </p>
          </div>
          <ChevronLeft className="w-4 h-4 text-red-400 group-hover:-translate-x-1 transition-transform shrink-0" />
        </div>
      )}

      {/* 3. Category Filter Chips & Search Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              الكل ({news.length})
            </button>

            {userClub && (
              <button
                onClick={() => setActiveCategory('my_club')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  activeCategory === 'my_club'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span>⭐ فريقي</span>
                <span className="text-[10px] opacity-80">({userClub.name})</span>
              </button>
            )}

            <button
              onClick={() => setActiveCategory('match')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === 'match'
                  ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              المباريات والنتائج
            </button>

            <button
              onClick={() => setActiveCategory('transfer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === 'transfer'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              الميركاتو
            </button>

            <button
              onClick={() => setActiveCategory('board')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === 'board'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              المدربون والإدارة
            </button>

            <button
              onClick={() => setActiveCategory('youth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === 'youth'
                  ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60'
              }`}
            >
              المواهب
            </button>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border text-xs font-semibold shrink-0 transition-colors ${
              showFilters || searchQuery
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="بحث وتصفية"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable Search Input */}
        {showFilters && (
          <div className="relative animate-fadeIn">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم نادٍ، لاعب، مدرب، أو كلمة مفتاحية..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pr-10 pl-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. News Cards Grid */}
      <div className="space-y-2.5">
        {filteredNews.length > 0 ? (
          filteredNews.slice(0, compact ? 4 : 20).map((article) => {
            const isLiked = likedArticles[article.id] || false;
            const likesCount = (article.likes || 120) + (isLiked ? 1 : 0);
            const badge = getCategoryBadge(article.category);

            return (
              <div
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className="group cursor-pointer bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:shadow-xl relative flex flex-col justify-between gap-2.5"
              >
                {/* Top Metadata row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {article.source || 'صدى الملاعب'}
                    </span>
                    {article.author && (
                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        • بقلم: {article.author}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{article.timeAgo || article.dateStr}</span>
                  </span>
                </div>

                {/* Headline & Snippet */}
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug flex items-start gap-2">
                    <span className="text-base shrink-0 select-none">{article.icon || '📰'}</span>
                    <span>{article.title}</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 pr-6">
                    {article.content}
                  </p>
                </div>

                {/* Bottom Interactive Bar */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                  {/* Social engagement */}
                  <div className="flex items-center gap-3 text-slate-400">
                    <button
                      onClick={(e) => handleToggleLike(e, article.id)}
                      className={`flex items-center gap-1 text-[11px] transition-colors ${
                        isLiked ? 'text-rose-400 font-bold' : 'hover:text-rose-400'
                      }`}
                      title="إعجاب"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                      <span>{likesCount}</span>
                    </button>

                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{article.commentsCount || 18}</span>
                    </span>

                    <button
                      onClick={(e) => handleShareArticle(e, article)}
                      className="text-slate-500 hover:text-emerald-400 transition-colors"
                      title="مشاركة الخبر"
                    >
                      {copiedShareId === article.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Read story prompt */}
                  <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold group-hover:underline">
                    <span>قراءة التقرير الكامل</span>
                    <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
            <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">
              لا توجد أخبار تطابق هذا التصنيف أو مصطلح البحث
            </p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              عرض جميع الأخبار
            </button>
          </div>
        )}
      </div>

      {/* 5. Full Story Article Modal */}
      {selectedArticle && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedArticle(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative text-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedArticle.icon || '📰'}</span>
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                    {selectedArticle.source || 'صحيفة الكرة المصرية'}
                  </span>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {selectedArticle.author && <span>الكاتب: {selectedArticle.author}</span>}
                    <span>• {selectedArticle.timeAgo || selectedArticle.dateStr}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Article Headline */}
            <div className="space-y-2">
              {selectedArticle.isBreaking && (
                <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  <Flame className="w-3 h-3 fill-white" />
                  خبر عاجل
                </span>
              )}
              <h2 className="text-base sm:text-xl font-black text-white leading-snug">
                {selectedArticle.title}
              </h2>
            </div>

            {/* Main Article Body */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
              <p className="text-xs sm:text-sm font-semibold text-emerald-200/90 leading-relaxed border-b border-slate-800/60 pb-3">
                {selectedArticle.content}
              </p>

              {selectedArticle.fullStory ? (
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-2 font-normal">
                  {selectedArticle.fullStory}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  وتواصل لجان المتابعة الرياضية رصد تداعيات هذا الخبر، مع توقعات بصدور بيانات رسمية من الأطراف المعنية لتوضيح الموقف للجماهير ووسائل الإعلام في الساعات القليلة المقبلة.
                </p>
              )}
            </div>

            {/* Tags */}
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedArticle.tags.map((tag, idx) => (
                  <span key={idx} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Social Interaction Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={(e) => handleToggleLike(e, selectedArticle.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  likedArticles[selectedArticle.id]
                    ? 'bg-rose-950 border-rose-600 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${likedArticles[selectedArticle.id] ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{(selectedArticle.likes || 120) + (likedArticles[selectedArticle.id] ? 1 : 0)} إعجاب</span>
              </button>

              <button
                onClick={(e) => handleShareArticle(e, selectedArticle)}
                className="flex items-center gap-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
              >
                {copiedShareId === selectedArticle.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم نسخ التقرير!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة الخبر</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
