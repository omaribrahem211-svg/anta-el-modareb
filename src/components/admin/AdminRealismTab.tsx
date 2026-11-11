import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  ShieldCheck, 
  Coins, 
  Briefcase, 
  TrendingUp,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GameRealismSettings } from '../../types/admin';
import { 
  fetchGameRealismSettings, 
  updateGameRealismSettings, 
  DEFAULT_REALISM_SETTINGS 
} from '../../services/adminService';

export const AdminRealismTab: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GameRealismSettings>(DEFAULT_REALISM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchGameRealismSettings();
        setSettings(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'فشل تحميل إعدادات التوازن والواقعية.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setSaving(true);
      setErrorMsg(null);
      await updateGameRealismSettings(settings, user);
      setSuccessMsg('تم حفظ وتطبيق إعدادات التوازن والواقعية ومباريات التحدي الأونلاين بنجاح!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الإعدادات.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setSettings({
      ...DEFAULT_REALISM_SETTINGS,
      updatedAt: Date.now(),
      updatedBy: user?.email || 'admin'
    });
  };

  return (
    <div className="space-y-6 text-right animate-fade-in">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">إعدادات توازن اللعبة وواقعية المسار المهني (Game Realism & Balance)</h2>
              <p className="text-xs text-slate-400">
                التحكم المركزي في معايير صعوبة عروض التدريب، اشتراطات الرخص، وقواعد مباريات التحدي بالجوائز الافتراضية ونقاط Elo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الإعدادات الافتراضية</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs">جاري تحميل الإعدادات...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Section 1: Career Offers Realism */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-white font-bold text-sm">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>1. معايير صعوبة عروض التدريب ودرجات الأندية (Tiers 1–7)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Job Offer Difficulty */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مستوى واقعية عروض الأندية:</label>
                <select
                  value={settings.jobOfferDifficulty}
                  onChange={(e) => setSettings({ ...settings, jobOfferDifficulty: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none"
                >
                  <option value="easy">مرن (عروض أكثر سهولة)</option>
                  <option value="realistic">واقعي ودقيق (افتراضي - نظام المستويات الـ 7)</option>
                  <option value="hardcore">تحدي صارم (شروط قاسية جداً للصعود والتعاقد)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  يتحكم في فحص شروط السمعة والرخصة والهبوط وتدرج الانتقال للأندية المحلية والعالمية.
                </p>
              </div>

              {/* Promotion Modifier */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مضاعف مكافأة السمعة عند التتويج / الصعود:</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.5"
                  value={settings.promotionDifficultyModifier}
                  onChange={(e) => setSettings({ ...settings, promotionDifficultyModifier: parseFloat(e.target.value) || 1.0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  القيمة الافتراضية 1.0 تعطي زيادة واقعية في السمعة والخبرة عند قيادة الفريق للصعود.
                </p>
              </div>

            </div>
          </div>

          {/* Section 2: Online PvP & Challenge Matches Balance */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-white font-bold text-sm">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>2. توازن مباريات التحدي الأونلاين والجوائز الافتراضية (PvP Challenges & Anti-Abuse)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              
              {/* Elo Tolerance */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">نطاق التكافؤ في تقييم Elo (+/-):</label>
                <input
                  type="number"
                  min="50"
                  max="500"
                  value={settings.pvpMatchmakingEloTolerance}
                  onChange={(e) => setSettings({ ...settings, pvpMatchmakingEloTolerance: parseInt(e.target.value) || 150 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  الحد الأقصى لفارق التقييم بين المدربين عند البحث التلقائي (افتراضي 150).
                </p>
              </div>

              {/* Min Challenge Prize */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">الحد الأدنى لجائزة التحدي (كوينز):</label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  value={settings.pvpMinChallengePrize || settings.pvpMinStakeCoins || 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 100;
                    setSettings({ ...settings, pvpMinChallengePrize: val, pvpMinStakeCoins: val });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
              </div>

              {/* Max Challenge Prize */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">الحد الأقصى لجائزة التحدي (كوينز):</label>
                <input
                  type="number"
                  min="500"
                  max="20000"
                  value={settings.pvpMaxChallengePrize || settings.pvpMaxStakeCoins || 10000}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 10000;
                    setSettings({ ...settings, pvpMaxChallengePrize: val, pvpMaxStakeCoins: val });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
              </div>

              {/* Min Manager Level For Challenge */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">الحد الأدنى لمستوى المدرب لدخول التحديات:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.minManagerLevelForChallenge || settings.minManagerLevelForStake || 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setSettings({ ...settings, minManagerLevelForChallenge: val, minManagerLevelForStake: val });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
              </div>

              {/* Daily Challenge Limit */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">الحد الأقصى اليومي لمباريات التحدي:</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={settings.dailyChallengeLimit || 20}
                  onChange={(e) => setSettings({ ...settings, dailyChallengeLimit: parseInt(e.target.value) || 20 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  حماية ضد الإفراط والتلاعب (افتراضي 20 مباراة يومياً).
                </p>
              </div>

              {/* Same Opponent Cooldown */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">فترة الانتظار لنفس الخصم (دقائق):</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={settings.sameOpponentCooldownMinutes || 15}
                  onChange={(e) => setSettings({ ...settings, sameOpponentCooldownMinutes: parseInt(e.target.value) || 15 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  منع التكرار المتتالي بين نفس الحسابين (15 دقيقة افتراضي).
                </p>
              </div>

              {/* Elo K-Factor */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">معامل K-Factor لحساب تقييم Elo:</label>
                <input
                  type="number"
                  min="16"
                  max="64"
                  value={settings.eloKFactor}
                  onChange={(e) => setSettings({ ...settings, eloKFactor: parseInt(e.target.value) || 32 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  سرعة تغير نقاط التصنيف بعد كل فوز أو خسارة (32 افتراضي).
                </p>
              </div>

            </div>
          </div>

          {/* 3. Game Economy & Pricing Multipliers (Part 17) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm pb-3 border-b border-slate-800">
              <Coins className="w-4 h-4" />
              <span>مضاعفات وتوازن الاقتصاد وانتقالات اللاعبين (Economy & Transfer Multipliers)</span>
            </div>

            <p className="text-xs text-slate-400">
              تسمح هذه الإعدادات بضبط سرعة نمو الميزانيات، دخل المباريات والرعاة، وتكاليف رواتب اللاعبين وأسعار الانتقال بشكل مركزي دون الحاجة لتعديل الكود.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              
              {/* Match Reward Multiplier */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مضاعف دخل ومكافآت المباريات:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.matchRewardMultiplier ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, matchRewardMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full accent-emerald-500"
                  />
                  <span className="font-mono text-emerald-400 font-bold w-12 text-left">{(settings.matchRewardMultiplier ?? 1.0).toFixed(1)}x</span>
                </div>
                <p className="text-[11px] text-slate-500">التحكم في عوائد التذاكر ومكافآت الفوز في المباريات.</p>
              </div>

              {/* Promotion Reward Multiplier */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مضاعف مكافآت الصعود والألقاب:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.promotionRewardMultiplier ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, promotionRewardMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full accent-emerald-500"
                  />
                  <span className="font-mono text-emerald-400 font-bold w-12 text-left">{(settings.promotionRewardMultiplier ?? 1.0).toFixed(1)}x</span>
                </div>
                <p className="text-[11px] text-slate-500">الجوائز المالية الممنوحة عند التتويج أو الصعود للدرجة الأعلى.</p>
              </div>

              {/* Sponsor Reward Multiplier */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مضاعف عقود الرعاية:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.sponsorRewardMultiplier ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, sponsorRewardMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full accent-emerald-500"
                  />
                  <span className="font-mono text-emerald-400 font-bold w-12 text-left">{(settings.sponsorRewardMultiplier ?? 1.0).toFixed(1)}x</span>
                </div>
                <p className="text-[11px] text-slate-500">الدخل الشهري المتحصل من الرعاة والمعلنين.</p>
              </div>

              {/* Transfer Price Multiplier */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مضاعف أسعار سوق الانتقالات:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={settings.transferPriceMultiplier ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, transferPriceMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full accent-purple-500"
                  />
                  <span className="font-mono text-purple-400 font-bold w-12 text-left">{(settings.transferPriceMultiplier ?? 1.0).toFixed(1)}x</span>
                </div>
                <p className="text-[11px] text-slate-500">القيم السوقية وأسعار شراء اللاعبين في الميركاتو.</p>
              </div>

              {/* Salary Multiplier */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">مضاعف رواتب اللاعبين:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={settings.salaryMultiplier ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, salaryMultiplier: parseFloat(e.target.value) || 1.0 })}
                    className="w-full accent-amber-500"
                  />
                  <span className="font-mono text-amber-400 font-bold w-12 text-left">{(settings.salaryMultiplier ?? 1.0).toFixed(1)}x</span>
                </div>
                <p className="text-[11px] text-slate-500">الرواتب الشهرية المستحقة للاعبي الفريق.</p>
              </div>

            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>حفظ وتطبيق الإعدادات المركزية</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
