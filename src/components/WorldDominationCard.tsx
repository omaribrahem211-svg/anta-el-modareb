import React, { useState } from 'react';
import { Globe, Trophy, Crown, CheckCircle2, Lock, ChevronDown, ChevronUp, Sparkles, Compass } from 'lucide-react';
import { ManagerProfile } from '../types/game';
import { GLOBAL_LEAGUES } from '../data/leaguesData';

interface WorldDominationCardProps {
  manager: ManagerProfile;
  currentLeagueId?: string;
}

interface CountryGroup {
  country: string;
  flag: string;
  leagues: {
    id: string;
    name: string;
    shortName: string;
    tier: number;
    isConquered: boolean;
    isCurrent: boolean;
  }[];
}

const COUNTRY_FLAGS: Record<string, string> = {
  'مصر': '🇪🇬',
  'المملكة العربية السعودية': '🇸🇦',
  'إنجلترا': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'إسبانيا': '🇪🇸',
  'ألمانيا': '🇩🇪',
  'إيطاليا': '🇮🇹',
  'فرنسا': '🇫🇷',
  'المغرب': '🇲🇦',
  'تونس': '🇹🇳',
  'الجزائر': '🇩🇿',
  'الإمارات العربية المتحدة': '🇦🇪',
  'قطر': '🇶🇦',
  'البرازيل': '🇧🇷',
  'الأرجنتين': '🇦🇷',
};

export const WorldDominationCard: React.FC<WorldDominationCardProps> = ({ manager, currentLeagueId }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'conquered' | 'remaining'>('all');

  const conquered = manager.conqueredLeagues || [];
  const totalLeaguesCount = Object.keys(GLOBAL_LEAGUES).length;
  const conqueredCount = conquered.length;
  const percentage = Math.min(100, Math.round((conqueredCount / Math.max(1, totalLeaguesCount)) * 100));

  // Determine Manager Rank based on World Domination %
  const getDominationRank = (pct: number) => {
    if (pct >= 100) {
      return {
        title: '👑 سيد العالم المطلق في كرة القدم',
        subtitle: 'حققت المستحيل! ترويض كافة دوريات العالم من الدرجة الرابعة حتى نخبة القمة',
        color: 'from-amber-400 via-yellow-300 to-amber-500',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-400',
        glowColor: 'shadow-amber-500/30',
      };
    }
    if (pct >= 75) {
      return {
        title: '🌐 إمبراطور الدوريات العابرة للقارات',
        subtitle: 'أنت على بعد خطوات قليلة من إتمام السيطرة الكاملة على كوكب الأرض!',
        color: 'from-purple-500 to-indigo-600',
        textColor: 'text-purple-300',
        borderColor: 'border-purple-500',
        glowColor: 'shadow-purple-500/20',
      };
    }
    if (pct >= 50) {
      return {
        title: '⚡ فاتح القارات والبطولات الكبرى',
        subtitle: 'سيطرت على نصف دوريات العالم! اسمك يتردد كأحد أعظم عقول التدريب',
        color: 'from-blue-500 to-cyan-600',
        textColor: 'text-cyan-300',
        borderColor: 'border-cyan-500',
        glowColor: 'shadow-cyan-500/20',
      };
    }
    if (pct >= 25) {
      return {
        title: '🌍 مدرب دولي واسع النفوذ',
        subtitle: 'مسيرة تصاعدية ملهمة تمتد عبر بلدان ومسابقات متعددة',
        color: 'from-emerald-500 to-teal-600',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500',
        glowColor: 'shadow-emerald-500/20',
      };
    }
    if (pct > 0) {
      return {
        title: '🚀 قاهر البطولات الصاعد',
        subtitle: 'بداية الغزو الكروي! ترويض أولى الدوريات والانطلاق نحو العالمية',
        color: 'from-blue-600 to-indigo-700',
        textColor: 'text-blue-300',
        borderColor: 'border-blue-500',
        glowColor: 'shadow-blue-500/20',
      };
    }
    return {
      title: '🧭 في مستهل رحلة السيطرة على العالم',
      subtitle: 'حقق أول لقب دوري لتسجل اسمك في لوحة شرف غزو بطولات العالم',
      color: 'from-slate-700 to-slate-800',
      textColor: 'text-slate-300',
      borderColor: 'border-slate-700',
      glowColor: 'shadow-slate-800/10',
    };
  };

  const rank = getDominationRank(percentage);

  // Group all leagues by Country
  const countryGroupsMap = new Map<string, CountryGroup>();

  Object.values(GLOBAL_LEAGUES).forEach(league => {
    const country = league.country || 'أخرى';
    if (!countryGroupsMap.has(country)) {
      countryGroupsMap.set(country, {
        country,
        flag: COUNTRY_FLAGS[country] || '🌐',
        leagues: [],
      });
    }

    const isConquered = conquered.includes(league.id);
    const isCurrent = currentLeagueId === league.id;

    countryGroupsMap.get(country)!.leagues.push({
      id: league.id,
      name: league.name,
      shortName: league.shortName,
      tier: league.tier,
      isConquered,
      isCurrent,
    });
  });

  // Sort leagues inside each country by Tier (1 -> 2 -> 3 -> 4)
  countryGroupsMap.forEach(grp => {
    grp.leagues.sort((a, b) => a.tier - b.tier);
  });

  const countryGroups = Array.from(countryGroupsMap.values());

  return (
    <div
      id="world_domination_card"
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-2 border-indigo-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden text-right"
      dir="rtl"
    >
      {/* Decorative Top Accent */}
      <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-indigo-500" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-black shadow-lg shrink-0">
            {percentage >= 100 ? (
              <Crown className="w-7 h-7 text-amber-400 animate-bounce" />
            ) : (
              <Globe className="w-6 h-6 text-indigo-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-white">
                نسبة السيطرة على العالم (World Domination)
              </h3>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full font-bold">
                {conqueredCount} / {totalLeaguesCount} دوري
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              كلما توجت بلقب دوري مختلف، ترتفع نسبة سيطرتك وصولاً للسيادة الكاملة 100%
            </p>
          </div>
        </div>

        {/* Big Percentage Badge */}
        <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-indigo-500/30 shadow-inner self-end sm:self-auto">
          <span className="text-xs text-slate-400 font-bold">معدل الغزو:</span>
          <span className="text-2xl sm:text-3xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-cyan-300">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Rank Status Card */}
      <div className={`p-4 rounded-2xl bg-slate-950/70 border ${rank.borderColor}/40 shadow-lg ${rank.glowColor} space-y-1.5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${rank.textColor}`} />
            <span className={`text-sm font-black ${rank.textColor}`}>{rank.title}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {percentage === 100 ? 'تم فتح العالم كاملاً ✓' : `${totalLeaguesCount - conqueredCount} دوري متبقٍ`}
          </span>
        </div>
        <p className="text-xs text-slate-400">{rank.subtitle}</p>

        {/* Multi-segment / Smooth Progress Bar */}
        <div className="pt-2 space-y-1">
          <div className="w-full bg-slate-800/80 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-700/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-indigo-500 transition-all duration-700 shadow-md"
              style={{ width: `${Math.max(3, percentage)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0% (البداية)</span>
            <span>25% (إقليمي)</span>
            <span>50% (قاري)</span>
            <span>75% (عالمي)</span>
            <span className="text-amber-400 font-bold">100% (سيد العالم 👑)</span>
          </div>
        </div>
      </div>

      {/* 100% Domination Trophy Celebration Banner */}
      {percentage >= 100 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-400 p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shrink-0">
            👑
          </div>
          <div>
            <h4 className="font-black text-sm text-amber-300">
              أسطورة الأساطير: سيطرة مطلقة على العالم الكروي 100%!
            </h4>
            <p className="text-xs text-amber-100/90 mt-0.5">
              لقد قدت الأندية في كل الدرجات والدوريات حول العالم نحو المجد، وكتبت اسمك بحروف من ذهب كأعظم مدير فني في تاريخ كرة القدم.
            </p>
          </div>
        </div>
      )}

      {/* Toggle Matrix View Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-2.5 px-4 bg-slate-950/80 hover:bg-slate-950 border border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl flex items-center justify-between text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-md"
      >
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span>خريطة ومصفوفة دوريات العالم (استعراض وتفقد الغزو)</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
            {conqueredCount} مروّض
          </span>
        </div>
        <div className="flex items-center gap-1 text-indigo-400">
          <span>{isExpanded ? 'إخفاء التفاصيل' : 'عرض الخريطة'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded World Leagues Matrix */}
      {isExpanded && (
        <div className="space-y-4 pt-2 animate-in fade-in duration-200">
          {/* Sub-Filters */}
          <div className="flex items-center gap-2 pb-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              جميع الدوريات ({totalLeaguesCount})
            </button>
            <button
              onClick={() => setFilter('conquered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'conquered'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              المروّضة فقط 🏆 ({conqueredCount})
            </button>
            <button
              onClick={() => setFilter('remaining')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === 'remaining'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              بانتظار الفتح 🔒 ({totalLeaguesCount - conqueredCount})
            </button>
          </div>

          {/* Country Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {countryGroups.map(group => {
              const visibleLeagues = group.leagues.filter(l => {
                if (filter === 'conquered') return l.isConquered;
                if (filter === 'remaining') return !l.isConquered;
                return true;
              });

              if (visibleLeagues.length === 0) return null;

              const countryConqueredCount = group.leagues.filter(l => l.isConquered).length;
              const isCountryFullyDominated = countryConqueredCount === group.leagues.length;

              return (
                <div
                  key={group.country}
                  className={`bg-slate-950/80 rounded-2xl border p-3.5 space-y-2.5 transition-all ${
                    isCountryFullyDominated
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.flag}</span>
                      <h4 className="font-bold text-xs sm:text-sm text-white">{group.country}</h4>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isCountryFullyDominated
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {countryConqueredCount} / {group.leagues.length} دوري
                    </span>
                  </div>

                  {/* League Badges List */}
                  <div className="space-y-1.5">
                    {visibleLeagues.map(league => (
                      <div
                        key={league.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          league.isConquered
                            ? 'bg-gradient-to-r from-amber-500/15 to-slate-900 border-amber-500/40 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {league.isConquered ? (
                            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-bold text-white text-[11px] sm:text-xs">
                              {league.shortName || league.name}
                            </span>
                            {league.isCurrent && (
                              <span className="mr-2 text-[9px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                                دوريك الحالي
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-md font-mono">
                            الدرجة {league.tier}
                          </span>
                          {league.isConquered ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> بطل
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">
                              قيد التحدي
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
