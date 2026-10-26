import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  DollarSign, 
  Activity, 
  Dumbbell, 
  X, 
  Play, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Gift 
} from 'lucide-react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { 
  AdRewardManager, 
  AdRewardType, 
  AD_REWARD_DEFINITIONS, 
  AdRewardClaimResult 
} from '../../services/adRewardService';
import { useGame } from '../../context/GameContext';
import { WorldStarLoanModal } from '../modals/WorldStarLoanModal';

interface RewardedAdCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRewardType?: AdRewardType;
}

export const RewardedAdCenterModal: React.FC<RewardedAdCenterModalProps> = ({
  isOpen,
  onClose,
  defaultRewardType = 'coins',
}) => {
  const { claimAdReward, userClub } = useGame();
  const [selectedType, setSelectedType] = useState<AdRewardType>(defaultRewardType);
  const [showWorldStarModal, setShowWorldStarModal] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<AdRewardType, number>>({
    coins: 0,
    club_funds: 0,
    team_energy: 0,
    training_boost: 0,
  });

  // Keep cooldowns in sync
  useEffect(() => {
    if (!isOpen) return;

    const updateCooldowns = () => {
      setCooldowns({
        coins: AdRewardManager.getCooldownRemaining('coins'),
        club_funds: AdRewardManager.getCooldownRemaining('club_funds'),
        team_energy: AdRewardManager.getCooldownRemaining('team_energy'),
        training_boost: AdRewardManager.getCooldownRemaining('training_boost'),
      });
    };

    updateCooldowns();
    const interval = setInterval(updateCooldowns, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !ADMOB_CONFIG.ENABLE_REWARDS) return null;

  const currentDef = AD_REWARD_DEFINITIONS[selectedType];
  const currentCooldown = cooldowns[selectedType] || 0;

  const handleWatchAd = async () => {
    if (isLoadingAd || currentCooldown > 0) return;

    setIsLoadingAd(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Safeguard timer so UI never gets stuck in loading
    const safetyTimer = setTimeout(() => {
      setIsLoadingAd(false);
    }, 8000);

    try {
      const success = await AdManager.showRewardedAd(
        selectedType,
        // 1. Reward verified and earned
        (claimResult: AdRewardClaimResult) => {
          clearTimeout(safetyTimer);
          setIsLoadingAd(false);
          const gameResult = claimAdReward(selectedType);

          if (gameResult.success) {
            setSuccessMessage(gameResult.message);
          } else {
            setErrorMessage(gameResult.message);
          }
        },
        // 2. Ad dismissed
        () => {
          clearTimeout(safetyTimer);
          setIsLoadingAd(false);
        },
        // 3. Ad failed to show
        (error) => {
          clearTimeout(safetyTimer);
          setIsLoadingAd(false);
          setErrorMessage('تعذر تشغيل الإعلان حالياً. يرجى التأكد من اتصال الإنترنت والمحاولة لاحقاً.');
        }
      );

      if (!success) {
        clearTimeout(safetyTimer);
        setIsLoadingAd(false);
      }
    } catch {
      clearTimeout(safetyTimer);
      setIsLoadingAd(false);
      setErrorMessage('حدث خطأ غير متوقع أثناء استدعاء الإعلان.');
    }
  };

  const getIcon = (type: AdRewardType) => {
    switch (type) {
      case 'coins':
        return <Coins className="w-5 h-5 text-amber-400" />;
      case 'club_funds':
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'team_energy':
        return <Activity className="w-5 h-5 text-sky-400" />;
      case 'training_boost':
        return <Dumbbell className="w-5 h-5 text-purple-400" />;
    }
  };

  const rewardTypes: AdRewardType[] = ['coins', 'club_funds', 'team_energy', 'training_boost'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="rewarded-ad-center-modal"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>مركز المكافآت المجانية</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-normal">
                  AdMob Rewards
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                شاهد إعلاناً اختيارياً واحصل على مكافآت فورية لدعم مسيرتك التدريبية
              </p>
            </div>
          </div>
          <button
            id="btn-close-rewarded-ad-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Notifications */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* World Star Loan Offer (2x Ads) */}
          <div 
            id="reward_center_world_star_loan_card"
            onClick={() => setShowWorldStarModal(true)}
            className="p-3.5 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-purple-950/40 to-slate-900 hover:border-amber-400 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-lg group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center shrink-0 shadow text-slate-950 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-amber-200" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    🌟 استعارة نجم عالمي للمباراة القادمة
                  </span>
                  <span className="text-[10px] bg-purple-500/30 text-purple-200 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                    شاهد إعلانين 2x
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  شاهد إعلانين واجلب نجماً عالمياً عشوائياً (ميسي، رونالدو، صلاح، مبابي، إلخ) لخوض مباراتك القادمة!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shrink-0 shadow transition-all cursor-pointer"
            >
              فتح ✨
            </button>
          </div>

          {/* Reward Choices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {rewardTypes.map((type) => {
              const def = AD_REWARD_DEFINITIONS[type];
              const isSelected = selectedType === type;
              const cd = cooldowns[type] || 0;

              return (
                <button
                  key={type}
                  id={`reward-option-${type}`}
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 relative ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-md ring-1 ring-amber-500/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-800/80">
                        {getIcon(type)}
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        {def.shortTitle}
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                      {def.badge}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-tight">
                    {def.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1 text-[11px]">
                    <span className="font-bold text-amber-400">
                      {def.rewardValueLabel}
                    </span>
                    {cd > 0 ? (
                      <span className="text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {cd} ث
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] font-semibold">
                        جاهز للمشاهدة
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active selection detail card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">المكافأة المحددة:</span>
              <span className="text-xs font-bold text-slate-200">
                {currentDef.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentDef.description}
            </p>
            {userClub && (
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/60">
                <span>النادي الحالي: {userClub.name}</span>
                <span>الميزانية: {userClub.budget.toLocaleString()} ج.م</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            إغلاق
          </button>

          <button
            id="btn-confirm-watch-ad"
            type="button"
            disabled={isLoadingAd || currentCooldown > 0}
            onClick={handleWatchAd}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isLoadingAd || currentCooldown > 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black'
            }`}
          >
            {isLoadingAd ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>جاري تشغيل الإعلان...</span>
              </>
            ) : currentCooldown > 0 ? (
              <>
                <Clock className="w-4 h-4 text-slate-400" />
                <span>متاح بعد {currentCooldown} ثانية</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>مشاهدة إعلان واستلام المكافأة 🎬</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* World Star Loan Modal */}
      <WorldStarLoanModal
        isOpen={showWorldStarModal}
        onClose={() => setShowWorldStarModal(false)}
      />
    </div>
  );
};
