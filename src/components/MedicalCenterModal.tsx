import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Player, PlayerInjury } from '../types/game';
import { getPositionArabic, getPositionBadgeClass } from '../utils/positionHelper';
import { AdManager } from '../services/adManager';
import {
  HeartPulse,
  Activity,
  Zap,
  Sparkles,
  ShieldCheck,
  Building2,
  Check,
  AlertCircle,
  X,
  Clock,
  Coins,
  DollarSign,
  Stethoscope,
  Bandage,
  Award,
  Film,
  Play
} from 'lucide-react';

interface MedicalCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer?: (player: Player) => void;
}

export const MedicalCenterModal: React.FC<MedicalCenterModalProps> = ({
  isOpen,
  onClose,
  onSelectPlayer,
}) => {
  const { userClub, manager, treatPlayerInHospital, upgradeFacility, healPlayerWithAd } = useGame();
  const [notification, setNotification] = useState<{ text: string; isError: boolean } | null>(null);
  const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<Player | null>(null);
  const [adLoadingPlayerId, setAdLoadingPlayerId] = useState<string | null>(null);

  if (!isOpen || !userClub || manager.isUnemployed) {
    return null;
  }

  const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
  const injuredPlayers = squadPlayers.filter(
    (p) => p.isInjured || (p.injury && p.injury.daysRemaining > 0)
  );

  const facilities = userClub.facilities || {
    stadiumCapacity: 5000,
    stadiumLevel: 1,
    stadiumName: 'استاد النادي',
    medicalCenterLevel: 1,
    trainingGroundLevel: 1,
    youthAcademyLevel: 1,
    scoutingNetworkLevel: 1,
  };

  const medLevel = facilities.medicalCenterLevel || 1;
  const upgradeCost = medLevel * 25000 + 15000;
  const recoverySpeedBonus = (medLevel - 1) * 15; // e.g. Level 1: 0%, Level 2: +15%, Level 3: +30%, etc.

  const handleUpgradeCenter = () => {
    const res = upgradeFacility('medicalCenterLevel', upgradeCost);
    setNotification({ text: res.message, isError: !res.success });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleExecuteTreatment = (
    player: Player,
    treatmentType: 'physio' | 'specialist' | 'prp'
  ) => {
    const res = treatPlayerInHospital(player.id, treatmentType);
    setNotification({ text: res.message, isError: !res.success });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleWatchAdToHeal = async (player: Player) => {
    if (adLoadingPlayerId) return;
    setAdLoadingPlayerId(player.id);

    try {
      await AdManager.showRewardedForAction({
        actionType: 'heal_player',
        onUserEarnedReward: () => {
          const res = healPlayerWithAd(player.id);
          setNotification({ text: `🎉 ${res.message}`, isError: !res.success });
          setTimeout(() => setNotification(null), 5000);
        },
        onDismiss: (earned) => {
          if (!earned) {
            setNotification({ text: 'لم تكتمل مشاهدة الإعلان، لم يتم تطبيق الشفاء الفوري.', isError: true });
            setTimeout(() => setNotification(null), 3500);
          }
        },
        onFailure: () => {
          setNotification({ text: 'تعذر تحميل الإعلان حالياً، يرجى المحاولة بعد قليل.', isError: true });
          setTimeout(() => setNotification(null), 3500);
        }
      });
    } catch (e) {
      setNotification({ text: 'حدث خطأ أثناء الاتصال بنظام الإعلانات.', isError: true });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setAdLoadingPlayerId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-emerald-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl overflow-hidden flex flex-col text-right">
        
        {/* Top Glow Border */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-lg">
              <Stethoscope className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  مستشفى النادي والمركز الطبي الرياضي 🏥
                </h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  المستوى {medLevel} / 5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                إدارة برامج الاستشفاء والعلاج المكثف للاعبي الفريق المصابين
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`my-3 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
              notification.isError
                ? 'bg-red-950/80 border border-red-700 text-red-300'
                : 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
            }`}
          >
            {notification.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Scrollable Center Body */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
          
          {/* Medical Facility Overview Card */}
          <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-900/60 rounded-2xl p-3.5 sm:p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  <span>كفاءة التجهيزات الطبية ومعدات الاستشفاء:</span>
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  مستوى المركز الطبي الحالي يمنح تسريعاً للاستشفاء الطبيعي بنسبة{' '}
                  <strong className="text-emerald-400 font-mono">+{recoverySpeedBonus}%</strong> ويقلل احتمالية تفاقم الإصابات البدنية.
                </p>
              </div>

              {medLevel < 5 && (
                <button
                  onClick={handleUpgradeCenter}
                  className="self-start sm:self-center px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>ترقية المركز للمستوى {medLevel + 1} ({upgradeCost.toLocaleString()} ج.م)</span>
                </button>
              )}
            </div>
          </div>

          {/* Injured Squad Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                <Bandage className="w-4 h-4 text-rose-400" />
                <span>قائمة اللاعبين المصابين في المستشفى ({injuredPlayers.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                ميزانية النادي: <strong className="text-emerald-400 font-mono">{(userClub.budget || 0).toLocaleString()} ج.م</strong>
              </span>
            </div>

            {injuredPlayers.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2.5">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                  ✨
                </div>
                <h5 className="font-bold text-sm text-white">المستشفى فارغ! جاهزية طبية 100%</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  لا يوجد أي لاعب مصاب في صفوف الفريق حالياً. جميع عناصر الفريق في قمة الجاهزية الطبية لخوض المباريات والمنافسات!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {injuredPlayers.map((player) => {
                  const injury = player.injury || {
                    type: player.injuryType || 'إصابة عضلية',
                    daysRemaining: 5,
                    severity: 'moderate',
                    description: 'إصابة بدنية تستدعي التأهيل',
                  };

                  const daysLeft = injury.daysRemaining || 1;
                  const totalDays = injury.durationDays || Math.max(daysLeft, 7);
                  const progressPct = Math.min(100, Math.max(10, Math.round(((totalDays - daysLeft) / totalDays) * 100)));

                  return (
                    <div
                      key={player.id}
                      className="bg-slate-950/80 border border-rose-900/50 hover:border-rose-700/80 rounded-2xl p-4 space-y-3 transition-all shadow-lg"
                    >
                      {/* Player Profile & Injury Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-rose-950 text-rose-200 border border-rose-700/60 flex flex-col items-center justify-center font-black shrink-0">
                            <span className="text-xs font-mono">{player.overallRating}</span>
                            <span className="text-[8px] text-rose-400">#{player.number}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{player.name}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${getPositionBadgeClass(
                                  player.position
                                )}`}
                              >
                                {getPositionArabic(player.position)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-rose-300 mt-0.5">
                              <span className="font-bold">🚑 {injury.type || player.injuryType || 'إصابة في أوتار العضلة'}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-300">
                                باقي: <strong className="text-amber-300 font-mono">{daysLeft}</strong> {daysLeft === 1 ? 'يوم' : 'أيام'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick View Profile Button */}
                        {onSelectPlayer && (
                          <button
                            onClick={() => onSelectPlayer(player)}
                            className="self-end sm:self-center text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                          >
                            بطاقة اللاعب 🔍
                          </button>
                        )}
                      </div>

                      {/* Recovery Progress Bar */}
                      <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">معدل التعافي والالتئام:</span>
                          <span className="text-emerald-400 font-bold font-mono">{progressPct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Rewarded Video Ad: Instant Free Healing */}
                      <div className="bg-gradient-to-r from-amber-950/40 via-emerald-950/30 to-teal-950/40 border border-amber-500/40 rounded-xl p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <Film className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                              <span>🎬 علاج وشفاء فوري مجاناً</span>
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                                إعلان بمكافأة
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5">
                              شاهد إعلاناً قصيراً لشفاء اللاعب 100% وعودته للملاعب فوراً دون دفع أي رسوم.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleWatchAdToHeal(player)}
                          disabled={adLoadingPlayerId === player.id}
                          className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{adLoadingPlayerId === player.id ? 'جارٍ التشغيل...' : 'شاهد إعلانًا لعلاج اللاعب مجانًا 🎬'}</span>
                        </button>
                      </div>

                      {/* Hospital Treatment Action Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {/* Option 1: Basic Physio */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="font-bold text-xs text-sky-300 flex items-center gap-1">
                              <span>💆‍♂️ جلسات تأهيل مكثف</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              تسريع التعافي بمقدار (3 أيام) عبر أجهزة الليزر والتدليك.
                            </p>
                          </div>
                          <button
                            onClick={() => handleExecuteTreatment(player, 'physio')}
                            className="w-full py-1.5 bg-sky-950 hover:bg-sky-900 border border-sky-700 text-sky-200 font-bold text-[11px] rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            تطبيق (10,000 ج.م)
                          </button>
                        </div>

                        {/* Option 2: Specialist Care */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="font-bold text-xs text-amber-300 flex items-center gap-1">
                              <span>👨‍⚕️ استشارة خبير دولي</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              تخفيض 50% من مدة الغياب فوراً وتحسين اللياقة والجاهزية.
                            </p>
                          </div>
                          <button
                            onClick={() => handleExecuteTreatment(player, 'specialist')}
                            className="w-full py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-700 text-amber-200 font-bold text-[11px] rounded-lg transition-all active:scale-95 cursor-pointer"
                          >
                            استدعاء الخبير (25,000 ج.م)
                          </button>
                        </div>

                        {/* Option 3: Instant PRP & Full Recovery */}
                        <div className="bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-800/80 rounded-xl p-2.5 flex flex-col justify-between space-y-2">
                          <div>
                            <div className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>⚡ حقن بلازما واستشفاء فوري</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                              شفاء تام 100% وإزالة الإصابة فوراً ليصبح جاهزاً للعب اليوم!
                            </p>
                          </div>
                          <button
                            onClick={() => handleExecuteTreatment(player, 'prp')}
                            className="w-full py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] rounded-lg shadow transition-all active:scale-95 cursor-pointer"
                          >
                            استشفاء فوري (50,000 ج.م)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام المستشفى يضمن عدم مشاركة أي لاعب مصاب لحمايته من تفاقم الإصابة.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all cursor-pointer"
          >
            إغلاق المستشفى
          </button>
        </div>

      </div>
    </div>
  );
};
