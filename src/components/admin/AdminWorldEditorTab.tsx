import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe2,
  Trophy,
  Shield,
  Users,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Trash2,
  RefreshCw,
  Layers,
  Sparkles,
  Sliders,
  DollarSign,
  Flag,
  FileCheck,
  ChevronRight,
  Database,
  ArrowUpDown,
  Award,
  Crown,
  Eye
} from 'lucide-react';
import { WorldEditorSubTab, WorldVersion } from '../../types/admin';
import { Club, Country, LeagueDefinition, Player, Position, PositionCategory } from '../../types/game';
import { GLOBAL_COUNTRIES } from '../../data/countriesData';
import { GLOBAL_LEAGUES, getLeagueById } from '../../data/leaguesData';
import { GLOBAL_COMPETITIONS, CompetitionDefinition } from '../../data/competitionsData';
import { validateWorldDatabase, sanitizeWorldPlayerOwnership, WorldValidationReport } from '../../utils/worldValidation';
import { isRealClub, REAL_SQUADS_BY_CLUB_ID } from '../../data/realPlayersData';
import { useAuth } from '../../context/AuthContext';
import {
  fetchWorldVersions,
  publishWorldVersion,
  setDefaultWorldVersion,
  getLocalWorldOverrides,
  saveLocalWorldOverride,
  deleteLocalWorldPlayer,
  DEFAULT_WORLD_VERSION,
} from '../../services/adminService';

export const AdminWorldEditorTab: React.FC = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<WorldEditorSubTab>('overview');
  
  // Data state with local overrides applied
  const [countries, setCountries] = useState<Record<string, Country>>(() => {
    const overrides = getLocalWorldOverrides().countries as Record<string, Country>;
    return { ...GLOBAL_COUNTRIES, ...overrides };
  });

  const [leagues, setLeagues] = useState<Record<string, LeagueDefinition>>(() => {
    const overrides = getLocalWorldOverrides().leagues as Record<string, LeagueDefinition>;
    return { ...GLOBAL_LEAGUES, ...overrides };
  });

  const countryList = useMemo<Country[]>(() => Object.values(countries) as Country[], [countries]);
  const leagueList = useMemo<LeagueDefinition[]>(() => Object.values(leagues) as LeagueDefinition[], [leagues]);

  const [versions, setVersions] = useState<WorldVersion[]>([DEFAULT_WORLD_VERSION]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [activeVersionId, setActiveVersionId] = useState<string>(DEFAULT_WORLD_VERSION.id);

  // Search & Filter States
  const [countrySearch, setCountrySearch] = useState('');
  const [leagueSearch, setLeagueSearch] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('ALL');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>('ALL');

  // Modals & Editing State
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [isNewCountry, setIsNewCountry] = useState(false);

  const [editingLeague, setEditingLeague] = useState<LeagueDefinition | null>(null);
  const [isNewLeague, setIsNewLeague] = useState(false);

  const [editingClub, setEditingClub] = useState<Club | null>(null);
  const [isNewClub, setIsNewClub] = useState(false);

  const [editingPlayer, setEditingPlayer] = useState<{ player: Player; clubId: string } | null>(null);
  const [isNewPlayer, setIsNewPlayer] = useState(false);

  const [editingCompetition, setEditingCompetition] = useState<CompetitionDefinition | null>(null);

  // Notification / Toast
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load versions
  const loadVersions = async () => {
    try {
      setLoadingVersions(true);
      const fetched = await fetchWorldVersions();
      setVersions(fetched);
      const defaultVer = fetched.find(v => v.isDefault);
      if (defaultVer) setActiveVersionId(defaultVer.id);
    } catch (err) {
      console.error('Failed to load world versions:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    loadVersions();
  }, []);

  // Compute all clubs and players
  const allClubs = useMemo<Club[]>(() => {
    const list: Club[] = [];
    leagueList.forEach(league => {
      (league.teams || []).forEach(t => {
        list.push({ ...t, leagueId: t.leagueId || league.id, country: t.country || league.country });
      });
    });
    return list;
  }, [leagueList]);

  const allPlayers = useMemo(() => {
    const list: { player: Player; club: Club; league: LeagueDefinition }[] = [];
    leagueList.forEach(league => {
      (league.teams || []).forEach(club => {
        (club.players || []).forEach(player => {
          list.push({ player, club, league });
        });
      });
    });
    return list;
  }, [leagueList]);

  // Validation Report
  const validationReport: WorldValidationReport = useMemo(() => {
    const sanitizedClubs = sanitizeWorldPlayerOwnership(allClubs);
    return validateWorldDatabase(sanitizedClubs, leagues, { logToConsole: false });
  }, [allClubs, leagues]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // ----------------------------------------------------
  // HANDLERS FOR SAVING ENTITIES
  // ----------------------------------------------------

  const handleSaveCountry = (c: Country) => {
    setCountries(prev => ({ ...prev, [c.id]: c }));
    saveLocalWorldOverride('countries', c.id, c);
    setEditingCountry(null);
    showToast('success', `تم حفظ بيانات الدولة (${c.name}) بنجاح.`);
  };

  const handleSaveLeague = (l: LeagueDefinition) => {
    setLeagues(prev => ({ ...prev, [l.id]: l }));
    saveLocalWorldOverride('leagues', l.id, l);
    setEditingLeague(null);
    showToast('success', `تم حفظ بيانات الدوري (${l.name}) بنجاح.`);
  };

  const handleSaveClub = (updatedClub: Club) => {
    const targetLeagueId = updatedClub.leagueId;
    if (!targetLeagueId || !leagues[targetLeagueId]) {
      showToast('error', 'يجب اختيار دوري صالح للنادي.');
      return;
    }

    setLeagues(prev => {
      const copy = { ...prev };
      const targetLeague = copy[targetLeagueId];
      if (!targetLeague) return prev;

      const existingIndex = targetLeague.teams.findIndex(t => t.id === updatedClub.id);
      if (existingIndex >= 0) {
        targetLeague.teams[existingIndex] = updatedClub;
      } else {
        targetLeague.teams.push(updatedClub);
      }
      return copy;
    });

    saveLocalWorldOverride('clubs', updatedClub.id, updatedClub);
    setEditingClub(null);
    showToast('success', `تم حفظ بيانات النادي (${updatedClub.name}) وتشكيلته بنجاح.`);
  };

  const handleSavePlayer = (p: Player, targetClubId: string) => {
    setLeagues(prev => {
      const copy = { ...prev };
      for (const lKey of Object.keys(copy)) {
        const league = copy[lKey];
        for (const club of league.teams) {
          if (!Array.isArray(club.players)) {
            club.players = [];
          }
          if (club.id === targetClubId) {
            const playerIndex = club.players.findIndex(x => x.id === p.id);
            if (playerIndex >= 0) {
              club.players[playerIndex] = p;
            } else {
              club.players.push(p);
            }
          } else {
            // Remove from other club if moved
            club.players = club.players.filter(x => x.id !== p.id);
          }
        }
      }
      return copy;
    });

    saveLocalWorldOverride('players', p.id, { player: p, clubId: targetClubId });
    setEditingPlayer(null);
    showToast('success', `تم حفظ بيانات اللاعب (${p.name}) بنجاح.`);
  };

  const handleDeletePlayer = (playerId: string, clubId: string, playerName: string) => {
    // 1. Remove from local leagues state
    setLeagues(prev => {
      const copy = { ...prev };
      for (const lKey of Object.keys(copy)) {
        const league = copy[lKey];
        for (const club of league.teams) {
          if (!Array.isArray(club.players)) {
            club.players = [];
          }
          if (club.id === clubId || club.players.some(x => x.id === playerId)) {
            club.players = club.players.filter(x => x.id !== playerId);
            if (club.tactics) {
              club.tactics.startingPlayerIds = (club.tactics.startingPlayerIds || []).filter(id => id !== playerId);
              club.tactics.benchPlayerIds = (club.tactics.benchPlayerIds || []).filter(id => id !== playerId);
            }
          }
        }
      }
      return copy;
    });

    // 2. Persist deletion in global world overrides
    deleteLocalWorldPlayer(playerId, clubId);
    setEditingPlayer(null);
    showToast('success', `تم حذف اللاعب (${playerName}) نهائياً من قاعدة بيانات اللعبة.`);
  };

  // ----------------------------------------------------
  // VERSION MANAGEMENT HANDLERS
  // ----------------------------------------------------

  const handlePublishNewVersion = async () => {
    if (!user) return;
    const nextVerNum = (versions[0]?.versionNumber || 1) + 1;
    const newVerId = `v${nextVerNum}.0_${Date.now()}`;

    const newVersion: WorldVersion = {
      id: newVerId,
      versionNumber: nextVerNum,
      name: `إصدار عالم كرة القدم المحدث v${nextVerNum}.0`,
      description: `تحديث شامل وتدقيق لقواعد بيانات الأندية واللاعبين والمسابقات.`,
      createdAt: Date.now(),
      createdBy: user.email || 'Admin',
      isDefault: true,
      isActive: true,
      totalCountries: Object.keys(countries).length,
      totalLeagues: Object.keys(leagues).length,
      totalClubs: allClubs.length,
      totalPlayers: allPlayers.length,
      validationStatus: validationReport.errors.length === 0 ? (validationReport.warnings.length === 0 ? 'valid' : 'warning') : 'error',
      validationSummary: {
        errorsCount: validationReport.errors.length,
        warningsCount: validationReport.warnings.length,
        realClubsCount: validationReport.stats.realClubsCount,
      },
      changelog: [
        `تدقيق ${allClubs.length} نادي مع ${allPlayers.length} لاعب حقيقي`,
        `التحقق من صحة الدوريات والدرجات والتوزيع الجغرافي`,
        `تحديث شامل للأسعار والرواتب وقيم اللاعبين`,
      ],
    };

    try {
      await publishWorldVersion(user, newVersion);
      await loadVersions();
      showToast('success', `تم نشر إصدار العالم الجديد (${newVersion.name}) وتعيينه كإصدار افتراضي بنجاح! 🚀`);
    } catch (err: any) {
      showToast('error', `فشل نشر الإصدار: ${err?.message || 'خطأ غير متوقع'}`);
    }
  };

  const handleSetDefaultVersion = async (vId: string) => {
    if (!user) return;
    try {
      await setDefaultWorldVersion(user, vId);
      await loadVersions();
      showToast('success', 'تم تعيين الإصدار كإصدار افتراضي للمسيرات الجديدة بنجاح.');
    } catch (err: any) {
      showToast('error', `فشل التعيين: ${err?.message || 'خطأ'}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-lg backdrop-blur-md transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300 shadow-rose-950/50'
          }`}
        >
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="text-sm font-semibold">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white text-xs">
            إغلاق
          </button>
        </div>
      )}

      {/* Editor Main Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Globe2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">محرر عالم كرة القدم الرئيسي</h1>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                  Master World Editor V1
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                التحكم الكامل والسيادي في الدول، الدوريات، الأندية، واللاعبين والمسابقات وقواعد النسخ الافتراضية للعبة.
              </p>
            </div>
          </div>

          {/* Quick Global Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSubTab('validation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                validationReport.errors.length > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>فحص النزاهة ({validationReport.errors.length} أخطاء / {validationReport.warnings.length} تنبيهات)</span>
            </button>

            <button
              onClick={handlePublishNewVersion}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>نشر إصدار عالم جديد</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'overview', label: 'نظرة عامة وإحصائيات', icon: Database },
            { id: 'countries', label: `الدول (${Object.keys(countries).length})`, icon: Flag },
            { id: 'leagues', label: `الدوريات (${Object.keys(leagues).length})`, icon: Trophy },
            { id: 'clubs', label: `الأندية (${allClubs.length})`, icon: Shield },
            { id: 'players', label: `اللاعبين (${allPlayers.length})`, icon: Users },
            { id: 'competitions', label: `الكؤوس والبطولات`, icon: Crown },
            { id: 'versions', label: `إصدارات العالم (${versions.length})`, icon: Layers },
            { id: 'validation', label: 'فحص وتدقيق السلامة', icon: FileCheck },
          ].map(item => {
            const Icon = item.icon;
            const isActive = subTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSubTab(item.id as WorldEditorSubTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. OVERVIEW & QUICK STATS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">الدول المسجلة</span>
                <Flag className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">{Object.keys(countries).length}</div>
              <div className="text-[11px] text-slate-400 mt-1">تغطي إفريقيا، أوروبا، آسيا، ولاتينيا</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">الدوريات والمسابقات</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{Object.keys(leagues).length}</div>
              <div className="text-[11px] text-slate-400 mt-1">تشمل الدرجات 1، 2، 3، 4 والبطولات القارية</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">الأندية الحقيقية</span>
                <Shield className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-white">{allClubs.length}</div>
              <div className="text-[11px] text-emerald-400 mt-1">{validationReport.stats.realClubsCount} نادي حقيقي معتمد</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">اللاعبين المسجلين</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{allPlayers.length.toLocaleString()}</div>
              <div className="text-[11px] text-slate-400 mt-1">مع قيم سوقية ورواتب واقعية</div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">إدارة الدوريات والدرجات</h3>
                <p className="text-xs text-slate-400 mt-1">
                  تعديل أعداد مقاعد الصعود والهبوط، سمعة الدوريات، والجوائز المالية للمسابقات.
                </p>
              </div>
              <button
                onClick={() => setSubTab('leagues')}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                تصفح الدوريات
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">تخصيص الأندية والتشكيلات</h3>
                <p className="text-xs text-slate-400 mt-1">
                  التحكم في ميزانيات الأندية، سمعة النادي، سعة الملعب، والتشكيلات المعتمدة.
                </p>
              </div>
              <button
                onClick={() => setSubTab('clubs')}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                تصفح الأندية
              </button>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">قاعدة بيانات النجوم واللاعبين</h3>
                <p className="text-xs text-slate-400 mt-1">
                  تعديل طاقات اللاعبين، مراكزهم، جنسياتهم، عقودهم، وقيمهم السوقية.
                </p>
              </div>
              <button
                onClick={() => setSubTab('players')}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                تصفح اللاعبين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. COUNTRIES & NATIONS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'countries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث عن دولة بالاسم أو الرمز..."
                value={countrySearch}
                onChange={e => setCountrySearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 pr-9 pl-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={() => {
                setIsNewCountry(true);
                setEditingCountry({
                  id: '',
                  name: '',
                  code: '',
                  flag: '🏳️',
                  continent: 'Europe',
                  footballLevel: 75,
                  foreignPlayerRate: 0.2,
                  playerNamePool: { firstNames: [], lastNames: [] },
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دولة جديدة</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {countryList
              .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.toLowerCase().includes(countrySearch.toLowerCase()))
              .map(c => (
                <div key={c.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.flag}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{c.code} • {c.continent}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsNewCountry(false);
                        setEditingCountry(c);
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>مستوى كرة القدم:</span>
                      <span className="text-emerald-400 font-bold">{c.footballLevel} / 100</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.footballLevel}%` }} />
                    </div>

                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>نسبة اللاعبين الأجانب:</span>
                      <span className="text-slate-200">{Math.round((c.foreignPlayerRate || 0.15) * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. LEAGUES & DIVISIONS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'leagues' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="بحث عن دوري..."
                  value={leagueSearch}
                  onChange={e => setLeagueSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 pr-9 pl-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedCountryFilter}
                onChange={e => setSelectedCountryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">جميع الدول</option>
                {Array.from(new Set(leagueList.map(l => l.country))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setIsNewLeague(true);
                setEditingLeague({
                  id: '',
                  name: '',
                  shortName: '',
                  country: 'مصر',
                  tier: 1,
                  reputation: 80,
                  promotionSpots: 2,
                  relegationSpots: 3,
                  playoffSpots: 1,
                  teams: [],
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة دوري جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leagueList
              .filter(l => {
                const matchSearch = l.name.toLowerCase().includes(leagueSearch.toLowerCase()) || l.shortName.toLowerCase().includes(leagueSearch.toLowerCase());
                const matchCountry = selectedCountryFilter === 'ALL' || l.country === selectedCountryFilter;
                return matchSearch && matchCountry;
              })
              .map(l => (
                <div key={l.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
                          D{l.tier}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{l.name}</h4>
                          <span className="text-[11px] text-slate-400">{l.country} • الدرجة {l.tier}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsNewLeague(false);
                          setEditingLeague(l);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">الأندية</span>
                        <span className="text-xs font-bold text-white">{l.teams?.length || 0}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">مقاعد الصعود</span>
                        <span className="text-xs font-bold text-emerald-400">{l.promotionSpots || 0}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">مقاعد الهبوط</span>
                        <span className="text-xs font-bold text-rose-400">{l.relegationSpots || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>سمعة الدوري:</span>
                    <span className="font-bold text-amber-400">{l.reputation} / 100</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. CLUBS & SQUADS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'clubs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="بحث عن نادٍ..."
                  value={clubSearch}
                  onChange={e => setClubSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 pr-9 pl-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedLeagueFilter}
                onChange={e => setSelectedLeagueFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">جميع الدوريات</option>
                {leagueList.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                setIsNewClub(true);
                const firstLeague = leagueList[0];
                setEditingClub({
                  id: `club_custom_${Date.now()}`,
                  name: '',
                  shortName: '',
                  city: 'القاهرة',
                  country: firstLeague?.country || 'مصر',
                  countryCode: 'EGY',
                  division: firstLeague?.tier || 1,
                  leagueId: firstLeague?.id || '',
                  reputation: 60,
                  primaryColor: '#059669',
                  secondaryColor: '#ffffff',
                  budget: 500000,
                  transferBudget: 250000,
                  wageBudgetMonthly: 150000,
                  facilities: {
                    stadiumName: 'الملعب البلدي',
                    stadiumCapacity: 8000,
                    stadiumLevel: 2,
                    medicalCenterLevel: 2,
                    trainingGroundLevel: 2,
                    youthAcademyLevel: 2,
                    scoutingNetworkLevel: 2,
                  },
                  sponsors: [],
                  isUserClub: false,
                  players: [],
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة نادٍ جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allClubs
              .filter(c => {
                const matchSearch = c.name.toLowerCase().includes(clubSearch.toLowerCase()) || c.shortName.toLowerCase().includes(clubSearch.toLowerCase());
                const matchLeague = selectedLeagueFilter === 'ALL' || c.leagueId === selectedLeagueFilter;
                return matchSearch && matchLeague;
              })
              .map(club => {
                const isReal = isRealClub(club.id);
                return (
                  <div key={club.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-md border border-white/10"
                          style={{ backgroundColor: club.primaryColor, color: club.secondaryColor }}
                        >
                          {club.shortName?.slice(0, 2) || club.name?.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{club.name}</h4>
                            {isReal && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                                نادٍ حقيقي
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{club.city} • {club.country}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsNewClub(false);
                          setEditingClub(club);
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">اللاعبين</span>
                        <span className="font-bold text-white">{club.players?.length || 0}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">السمعة</span>
                        <span className="font-bold text-amber-400">{club.reputation}</span>
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block">الميزانية</span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {((club.budget || 0) / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. PLAYERS & STARS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'players' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                <input
                  type="text"
                  placeholder="بحث عن لاعب بالاسم..."
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 pr-9 pl-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={selectedPositionFilter}
                onChange={e => setSelectedPositionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">جميع المراكز</option>
                <option value="GK">حارس مرمى (GK)</option>
                <option value="DEF">دفاع (DEF)</option>
                <option value="MID">وسط (MID)</option>
                <option value="FWD">هجوم (FWD)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setIsNewPlayer(true);
                const firstClub = allClubs[0];
                setEditingPlayer({
                  player: {
                    id: `p_custom_${Date.now()}`,
                    name: '',
                    age: 22,
                    nationality: 'مصر',
                    nationalityCode: 'EGY',
                    countryOfBirth: 'مصر',
                    position: 'ST',
                    positionCategory: 'FWD',
                    overallRating: 72,
                    potentialRating: 80,
                    attributes: {
                      pace: 75,
                      shooting: 72,
                      passing: 68,
                      dribbling: 74,
                      defending: 40,
                      physical: 70,
                    },
                    salary: 15000,
                    marketValue: 1200000,
                    morale: 90,
                    fitness: 100,
                    form: 7,
                    number: 9,
                    contractYears: 3,
                    stats: {
                      appearances: 0,
                      goals: 0,
                      assists: 0,
                      yellowCards: 0,
                      redCards: 0,
                      cleanSheets: 0,
                      averageRating: 7.0,
                    },
                  },
                  clubId: firstClub?.id || '',
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة لاعب جديد</span>
            </button>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">اللاعب</th>
                    <th className="p-3">النادي</th>
                    <th className="p-3 text-center">المركز</th>
                    <th className="p-3 text-center">التقييم</th>
                    <th className="p-3 text-center">الإمكانات</th>
                    <th className="p-3 text-center">العمر</th>
                    <th className="p-3 text-center">القيمة السوقية</th>
                    <th className="p-3 text-center">الراتب</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {allPlayers
                    .filter(({ player, club }) => {
                      const matchSearch = player.name.toLowerCase().includes(playerSearch.toLowerCase()) || (player.nationality || '').toLowerCase().includes(playerSearch.toLowerCase());
                      const matchPos = selectedPositionFilter === 'ALL' || player.positionCategory === selectedPositionFilter || player.position === selectedPositionFilter;
                      return matchSearch && matchPos;
                    })
                    .slice(0, 100) // Paginated slice for high performance
                    .map(({ player, club }) => (
                      <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{player.name}</div>
                          <div className="text-[10px] text-slate-400">{player.nationality}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {club.name}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            player.positionCategory === 'FWD' ? 'bg-rose-500/20 text-rose-300' :
                            player.positionCategory === 'MID' ? 'bg-emerald-500/20 text-emerald-300' :
                            player.positionCategory === 'DEF' ? 'bg-blue-500/20 text-blue-300' :
                            'bg-amber-500/20 text-amber-300'
                          }`}>
                            {player.position}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-400 text-sm">
                          {player.overallRating}
                        </td>
                        <td className="p-3 text-center font-bold text-amber-400">
                          {player.potentialRating}
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          {player.age}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-300">
                          €{((player.marketValue || 0) / 1000000).toFixed(1)}M
                        </td>
                        <td className="p-3 text-center font-mono text-slate-400">
                          €{((player.salary || 0)).toLocaleString()}/ش
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setIsNewPlayer(false);
                                setEditingPlayer({ player, clubId: club.id });
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="تعديل اللاعب"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`هل أنت متأكد من حذف اللاعب (${player.name}) نهائياً من قاعدة البيانات؟ لن يظهر في التشكيلة أو سوق الانتقالات مجدداً.`)) {
                                  handleDeletePlayer(player.id, club.id, player.name);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="حذف نهائي"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. COMPETITIONS & CUPS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'competitions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(GLOBAL_COMPETITIONS).map(comp => (
              <div key={comp.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg"
                      style={{ backgroundColor: comp.color }}
                    >
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{comp.name}</h4>
                      <span className="text-[11px] text-slate-400">{comp.country} • {comp.continent}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                    سمعة {comp.reputation}/100
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  {comp.formatDescription}
                </p>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">جائزة البطل</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      €{(comp.championPrize / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block">جائزة الوصيف</span>
                    <span className="font-bold text-slate-300 font-mono">
                      €{(comp.runnerUpPrize / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. WORLD VERSIONS & SNAPSHOTS SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'versions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">إصدارات عالم كرة القدم وقواعد البيانات</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تتيح إصدارات العالم استمرار مسيرات اللاعبين الحالية دون تشويش بينما تبدأ المسيرات الجديدة بأحدث إصدار رسمي.
              </p>
            </div>

            <button
              onClick={handlePublishNewVersion}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-emerald-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>نشر إصدار جديد</span>
            </button>
          </div>

          <div className="space-y-3">
            {versions.map(v => (
              <div
                key={v.id}
                className={`bg-slate-900/60 border p-5 rounded-2xl transition-all ${
                  v.isDefault ? 'border-emerald-500/50 shadow-lg shadow-emerald-950/40' : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-base font-bold text-white">{v.name}</h4>
                      {v.isDefault && (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          الإصدار الافتراضي للمسيرات الجديدة
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{v.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!v.isDefault && (
                      <button
                        onClick={() => handleSetDefaultVersion(v.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors"
                      >
                        تعيين كافتراضي
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 block">تاريخ النشر:</span>
                    <span className="text-slate-300 font-mono">{new Date(v.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الأندية واللاعبين:</span>
                    <span className="text-slate-300">{v.totalClubs} نادٍ / {v.totalPlayers} لاعب</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">حالة التدقيق:</span>
                    <span className={`font-bold ${v.validationStatus === 'valid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {v.validationStatus === 'valid' ? 'معتمد وسليم 100%' : 'توجد ملاحظات'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">الناشر:</span>
                    <span className="text-slate-300 font-mono text-[11px]">{v.createdBy}</span>
                  </div>
                </div>

                {v.changelog && v.changelog.length > 0 && (
                  <div className="mt-3 bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1.5">أبرز التحسينات والتغييرات:</span>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                      {v.changelog.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 8. VALIDATION & HEALTH CHECK SUB-TAB */}
      {/* ==================================================== */}
      {subTab === 'validation' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-3xl border ${
            validationReport.errors.length === 0
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-4">
              {validationReport.errors.length === 0 ? (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <XCircle className="w-6 h-6" />
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-white">
                  {validationReport.errors.length === 0
                    ? 'قاعدة البيانات العالمية سليمة وصالحة للنشر واللعب!'
                    : `تم اكتشاف ${validationReport.errors.length} أخطاء تحتاج إلى معالجة.`}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تم فحص كافة معرفات الأندية واللاعبين، التشكيلات الحقيقية، الروابط الجغرافية، ونظام الصعود والهبوط.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">الأخطاء الحرجة</span>
              <span className={`text-2xl font-bold ${validationReport.errors.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {validationReport.errors.length}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">التنبيهات والملاحظات</span>
              <span className="text-2xl font-bold text-amber-400">
                {validationReport.warnings.length}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">الأندية الحقيقية الموثقة</span>
              <span className="text-2xl font-bold text-teal-400">
                {validationReport.stats.realClubsCount}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-center">
              <span className="text-xs text-slate-400 block">إجمالي اللاعبين</span>
              <span className="text-2xl font-bold text-blue-400">
                {validationReport.stats.totalPlayers}
              </span>
            </div>
          </div>

          {/* Errors List */}
          {validationReport.errors.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>قائمة الأخطاء المكتشفة:</span>
              </h4>
              <ul className="list-disc list-inside text-xs text-rose-200 space-y-1.5">
                {validationReport.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings List */}
          {validationReport.warnings.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>الملاحظات والتنبيهات:</span>
              </h4>
              <ul className="list-disc list-inside text-xs text-amber-200 space-y-1.5">
                {validationReport.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT / CREATE COUNTRY MODAL */}
      {/* ==================================================== */}
      {editingCountry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isNewCountry ? 'إضافة دولة جديدة' : `تعديل دولة (${editingCountry.name})`}
              </h3>
              <button onClick={() => setEditingCountry(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">اسم الدولة بالعربية</label>
                  <input
                    type="text"
                    value={editingCountry.name}
                    onChange={e => setEditingCountry({ ...editingCountry, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">رمز الدولة (e.g. EGY, ESP)</label>
                  <input
                    type="text"
                    value={editingCountry.code}
                    onChange={e => setEditingCountry({ ...editingCountry, code: e.target.value.toUpperCase(), id: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">العلم (Emoji)</label>
                  <input
                    type="text"
                    value={editingCountry.flag}
                    onChange={e => setEditingCountry({ ...editingCountry, flag: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white text-center text-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">القارة</label>
                  <select
                    value={editingCountry.continent}
                    onChange={e => setEditingCountry({ ...editingCountry, continent: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  >
                    <option value="Africa">إفريقيا</option>
                    <option value="Europe">أوروبا</option>
                    <option value="Asia">آسيا</option>
                    <option value="South America">أمريكا الجنوبية</option>
                    <option value="North America">أمريكا الشمالية</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">مستوى كرة القدم (1 - 100): {editingCountry.footballLevel}</label>
                <input
                  type="range"
                  min="30"
                  max="99"
                  value={editingCountry.footballLevel}
                  onChange={e => setEditingCountry({ ...editingCountry, footballLevel: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">نسبة اللاعبين الأجانب: {Math.round((editingCountry.foreignPlayerRate || 0.15) * 100)}%</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.01"
                  value={editingCountry.foreignPlayerRate || 0.15}
                  onChange={e => setEditingCountry({ ...editingCountry, foreignPlayerRate: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button onClick={() => setEditingCountry(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">
                إلغاء
              </button>
              <button
                onClick={() => handleSaveCountry(editingCountry)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50"
              >
                حفظ الدولة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT / CREATE LEAGUE MODAL */}
      {/* ==================================================== */}
      {editingLeague && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isNewLeague ? 'إضافة دوري جديد' : `تعديل الدوري (${editingLeague.name})`}
              </h3>
              <button onClick={() => setEditingLeague(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">اسم الدوري الكامل</label>
                  <input
                    type="text"
                    value={editingLeague.name}
                    onChange={e => setEditingLeague({ ...editingLeague, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الاسم المختصر</label>
                  <input
                    type="text"
                    value={editingLeague.shortName}
                    onChange={e => setEditingLeague({ ...editingLeague, shortName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">الدولة</label>
                  <select
                    value={editingLeague.country}
                    onChange={e => setEditingLeague({ ...editingLeague, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  >
                    {countryList.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الدرجة (1 = ممتاز، 2 = ثانية...)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editingLeague.tier}
                    onChange={e => setEditingLeague({ ...editingLeague, tier: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">مقاعد الصعود</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={editingLeague.promotionSpots}
                    onChange={e => setEditingLeague({ ...editingLeague, promotionSpots: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">مقاعد الهبوط</label>
                  <input
                    type="number"
                    min="0"
                    max="6"
                    value={editingLeague.relegationSpots}
                    onChange={e => setEditingLeague({ ...editingLeague, relegationSpots: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">السمعة (1-100)</label>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={editingLeague.reputation}
                    onChange={e => setEditingLeague({ ...editingLeague, reputation: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button onClick={() => setEditingLeague(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">
                إلغاء
              </button>
              <button
                onClick={() => handleSaveLeague(editingLeague)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50"
              >
                حفظ الدوري
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT / CREATE CLUB MODAL */}
      {/* ==================================================== */}
      {editingClub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isNewClub ? 'إضافة نادٍ جديد' : `تعديل النادي (${editingClub.name})`}
              </h3>
              <button onClick={() => setEditingClub(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">اسم النادي</label>
                  <input
                    type="text"
                    value={editingClub.name}
                    onChange={e => setEditingClub({ ...editingClub, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الاسم المختصر</label>
                  <input
                    type="text"
                    value={editingClub.shortName}
                    onChange={e => setEditingClub({ ...editingClub, shortName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">المدينة</label>
                  <input
                    type="text"
                    value={editingClub.city}
                    onChange={e => setEditingClub({ ...editingClub, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الدوري المخصص</label>
                  <select
                    value={editingClub.leagueId}
                    onChange={e => {
                      const l = leagues[e.target.value];
                      setEditingClub({
                        ...editingClub,
                        leagueId: e.target.value,
                        division: l?.tier || editingClub.division,
                        country: l?.country || editingClub.country,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  >
                    {leagueList.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.country})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">السمعة (1-99)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={editingClub.reputation}
                    onChange={e => setEditingClub({ ...editingClub, reputation: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">الميزانية المالية الحالية (€)</label>
                  <input
                    type="number"
                    value={editingClub.budget}
                    onChange={e => setEditingClub({ ...editingClub, budget: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">سعة الملعب</label>
                  <input
                    type="number"
                    value={editingClub.facilities?.stadiumCapacity || 5000}
                    onChange={e => setEditingClub({
                      ...editingClub,
                      facilities: {
                        ...editingClub.facilities,
                        stadiumCapacity: Number(e.target.value),
                        stadiumName: editingClub.facilities?.stadiumName || `ملعب ${editingClub.name}`,
                        stadiumLevel: 1,
                        medicalCenterLevel: 1,
                        trainingGroundLevel: 1,
                        youthAcademyLevel: 1,
                        scoutingNetworkLevel: 1,
                      }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">اللون الأساسي للقميص</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingClub.primaryColor}
                      onChange={e => setEditingClub({ ...editingClub, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingClub.primaryColor}
                      onChange={e => setEditingClub({ ...editingClub, primaryColor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">اللون الثانوي</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editingClub.secondaryColor}
                      onChange={e => setEditingClub({ ...editingClub, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingClub.secondaryColor}
                      onChange={e => setEditingClub({ ...editingClub, secondaryColor: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button onClick={() => setEditingClub(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">
                إلغاء
              </button>
              <button
                onClick={() => handleSaveClub(editingClub)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50"
              >
                حفظ النادي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT / CREATE PLAYER MODAL */}
      {/* ==================================================== */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isNewPlayer ? 'إضافة لاعب جديد' : `تعديل اللاعب (${editingPlayer.player.name})`}
              </h3>
              <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">اسم اللاعب الكامل</label>
                  <input
                    type="text"
                    value={editingPlayer.player.name}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, name: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">النادي الحالي</label>
                  <select
                    value={editingPlayer.clubId}
                    onChange={e => setEditingPlayer({ ...editingPlayer, clubId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  >
                    {allClubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={editingPlayer.player.nationality}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, nationality: e.target.value }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">المركز</label>
                  <select
                    value={editingPlayer.player.position}
                    onChange={e => {
                      const pos = e.target.value as Position;
                      const cat: PositionCategory = pos === 'GK' ? 'GK' : ['CB', 'RB', 'LB'].includes(pos) ? 'DEF' : ['CDM', 'CM', 'CAM'].includes(pos) ? 'MID' : 'FWD';
                      setEditingPlayer({
                        ...editingPlayer,
                        player: { ...editingPlayer.player, position: pos, positionCategory: cat }
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  >
                    {['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">العمر</label>
                  <input
                    type="number"
                    min="16"
                    max="42"
                    value={editingPlayer.player.age}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, age: Number(e.target.value) }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">التقييم الإجمالي (Overall): {editingPlayer.player.overallRating}</label>
                  <input
                    type="range"
                    min="40"
                    max="99"
                    value={editingPlayer.player.overallRating}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, overallRating: Number(e.target.value) }
                    })}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الإمكانات (Potential): {editingPlayer.player.potentialRating}</label>
                  <input
                    type="range"
                    min="40"
                    max="99"
                    value={editingPlayer.player.potentialRating}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, potentialRating: Number(e.target.value) }
                    })}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">القيمة السوقية (€)</label>
                  <input
                    type="number"
                    value={editingPlayer.player.marketValue}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, marketValue: Number(e.target.value) }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">الراتب الشهري (€)</label>
                  <input
                    type="number"
                    value={editingPlayer.player.salary}
                    onChange={e => setEditingPlayer({
                      ...editingPlayer,
                      player: { ...editingPlayer.player, salary: Number(e.target.value) }
                    })}
                    className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-white font-mono focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800">
              {!isNewPlayer ? (
                <button
                  onClick={() => {
                    if (window.confirm(`هل أنت متأكد من حذف اللاعب (${editingPlayer.player.name}) نهائياً؟`)) {
                      handleDeletePlayer(editingPlayer.player.id, editingPlayer.clubId, editingPlayer.player.name);
                    }
                  }}
                  className="px-4 py-2 bg-rose-950/50 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف اللاعب نهائياً
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button onClick={() => setEditingPlayer(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">
                  إلغاء
                </button>
                <button
                  onClick={() => handleSavePlayer(editingPlayer.player, editingPlayer.clubId)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50"
                >
                  حفظ اللاعب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
