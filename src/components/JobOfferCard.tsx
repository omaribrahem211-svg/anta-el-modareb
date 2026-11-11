import React from 'react';
import { JobOffer } from '../types/game';
import {
  Briefcase,
  Building2,
  DollarSign,
  Trophy,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  Flame,
  ShieldAlert,
  Sparkles,
  Scale,
  Calendar,
  Compass,
  Layers,
  Star,
} from 'lucide-react';

interface JobOfferCardProps {
  offer: JobOffer;
  isSelected?: boolean;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
}

export const JobOfferCard: React.FC<JobOfferCardProps> = ({
  offer,
  isSelected,
  onAccept,
  onReject,
}) => {
  const isAccepted = offer.status === 'accepted';
  const isRejected = offer.status === 'rejected';

  // Archetype Badge Styling & Icon
  const getArchetypeBadgeConfig = () => {
    switch (offer.offerType || offer.offerCategory) {
      case 'higher_competition':
        return {
          icon: <Trophy className="w-3.5 h-3.5 text-amber-400" />,
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          label: offer.offerTypeArabic || 'نادي أكبر ومنافسة أعلى 🏆',
        };
      case 'title_challenger':
        return {
          icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          label: offer.offerTypeArabic || 'ميزانية ضخمة ومنافسة على الألقاب 💰',
        };
      case 'relegation_salvage':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />,
          bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          label: offer.offerTypeArabic || 'إنقاذ من شبح الهبوط 🛟',
        };
      case 'youth_foundation':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-teal-400" />,
          bg: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
          label: offer.offerTypeArabic || 'حرية كاملة لبناء وتطوير الفريق 🌱',
        };
      case 'mid_table_project':
      default:
        return {
          icon: <Scale className="w-3.5 h-3.5 text-sky-400" />,
          bg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
          label: offer.offerTypeArabic || 'مشروع متوسط مستقر 🛠️',
        };
    }
  };

  const badgeConfig = getArchetypeBadgeConfig();

  // Pressure Level Badge Styling
  const getPressureBadge = () => {
    switch (offer.pressureLevel) {
      case 'extreme':
        return {
          text: offer.pressureLevelArabic || 'شديد الحرج 🔥',
          className: 'bg-rose-950/60 border-rose-800 text-rose-300',
        };
      case 'high':
        return {
          text: offer.pressureLevelArabic || 'ضغط مرتفع 🔥',
          className: 'bg-amber-950/60 border-amber-800 text-amber-300',
        };
      case 'low':
        return {
          text: offer.pressureLevelArabic || 'ضغط منخفض وهادئ 🌱',
          className: 'bg-teal-950/60 border-teal-800 text-teal-300',
        };
      case 'moderate':
      default:
        return {
          text: offer.pressureLevelArabic || 'توقعات متوازنة ⚖️',
          className: 'bg-blue-950/60 border-blue-800 text-blue-300',
        };
    }
  };

  const pressureBadge = getPressureBadge();

  return (
    <div
      id={`job_offer_${offer.id}`}
      onClick={() => {
        if (!isAccepted) onAccept(offer.id);
      }}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
        isAccepted
          ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-900/20 ring-2 ring-emerald-500/40'
          : isRejected
          ? 'bg-slate-900/40 border-slate-800 opacity-60'
          : isSelected
          ? 'bg-slate-850 border-amber-500/80 shadow-lg shadow-amber-500/10'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Club Primary Accent Top Bar */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: offer.primaryColor || '#f59e0b' }}
      />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Header: Club Badge, Name, Category & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md border border-white/10 shrink-0"
              style={{ backgroundColor: offer.primaryColor }}
            >
              {offer.clubName.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-100 text-base sm:text-lg">{offer.clubName}</h4>

                {/* Offer Archetype Tag */}
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold flex items-center gap-1.5 shadow-sm ${badgeConfig.bg}`}>
                  {badgeConfig.icon}
                  {badgeConfig.label}
                </span>

                {isAccepted && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> تم القبول
                  </span>
                )}
              </div>

              {/* Geographic and League Identity */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3 h-3 text-slate-400" /> {offer.country}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-medium">{offer.leagueName}</span>
                <span>•</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold">
                  الدرجة {offer.divisionTier}
                </span>
                {offer.requiredLicense && (
                  <>
                    <span>•</span>
                    <span className="bg-indigo-950/60 border border-indigo-800 text-indigo-300 px-2 py-0.5 rounded font-bold text-[11px]">
                      رخصة {offer.requiredLicense}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-left shrink-0">
            <div className="text-[11px] text-slate-400">سمعة النادي</div>
            <div className="text-sm font-bold text-amber-400 flex items-center justify-end gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {offer.clubReputation}/100
            </div>
          </div>
        </div>

        {/* Club Situation Notice (if available) */}
        {offer.clubSituationDescription && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
            <Compass className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sky-300 ml-1">وضع النادي الحالي:</span>
              {offer.clubSituationDescription}
            </div>
          </div>
        )}

        {/* Core Financial & Strategic Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Manager Monthly Salary */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1 text-[11px]">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> راتب المدرب الشهري
            </div>
            <div className="font-bold text-emerald-400 text-sm">
              {offer.managerSalary.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">شامل المكافآت الدورية</div>
          </div>

          {/* Transfer & Wage Budget */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1 text-[11px]">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /> ميزانية الانتقالات
            </div>
            <div className="font-bold text-blue-400 text-sm">
              {offer.transferBudget.toLocaleString()} ج.م
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              رواتب: {offer.wageBudgetMonthly ? offer.wageBudgetMonthly.toLocaleString() : '—'} ج.م
            </div>
          </div>

          {/* Contract Duration & Pressure */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> مدة العقد والضغط
            </div>
            <div className="font-bold text-slate-200 text-sm">
              {offer.contractDurationYears} {offer.contractDurationYears === 1 ? 'موسم واحد' : offer.contractDurationYears === 2 ? 'موسمان' : 'مواسم'}
            </div>
            <div className="text-[10px] text-amber-300/90 mt-0.5 truncate" title={pressureBadge.text}>
              {pressureBadge.text}
            </div>
          </div>

          {/* Squad Quality & Stadium */}
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 flex items-center gap-1.5 mb-1 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> جودة التشكيلة
            </div>
            <div className="font-bold text-indigo-300 text-sm flex items-center gap-1">
              ⭐ {offer.squadQualityRating || 70}/100
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {offer.stadiumName}
            </div>
          </div>
        </div>

        {/* Board Expectations, Interest Reason, and Tactical Fit */}
        <div className="space-y-2.5">
          {/* Board Expectations */}
          <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-100/95 flex items-start gap-2.5 leading-relaxed">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 ml-1">أهداف وطموحات الإدارة:</span>
              {offer.boardExpectations}
              {offer.freedomLevelArabic && (
                <div className="text-[11px] text-amber-300/80 mt-1 font-medium">
                  • حرية بناء الفريق: {offer.freedomLevelArabic}
                </div>
              )}
            </div>
          </div>

          {/* Specific Reason for Interest */}
          {offer.interestReason && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 text-xs text-indigo-100/95 flex items-start gap-2.5 leading-relaxed">
              <Users className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-300 ml-1">سبب اهتمام النادي بالمدرب:</span>
                {offer.interestReason}
              </div>
            </div>
          )}

          {/* Tactical Fit Description */}
          {offer.tacticalFitReason && (
            <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-100/95 flex items-start gap-2.5 leading-relaxed">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300 ml-1">التوافق مع أسلوبك التكتيكي:</span>
                {offer.tacticalFitReason}
              </div>
            </div>
          )}
        </div>

        {/* Actions: Accept or Reject */}
        <div className="flex items-center gap-2.5 pt-1">
          {isAccepted ? (
            <button
              id={`btn_offer_accepted_${offer.id}`}
              disabled
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> العقد التدريبي المختار للموسم القادم
            </button>
          ) : (
            <>
              <button
                id={`btn_accept_offer_${offer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAccept(offer.id);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> توقيع العقد والانتقال للنادي
              </button>
              {!isRejected && (
                <button
                  id={`btn_reject_offer_${offer.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReject(offer.id);
                  }}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> اعتذار ورفض
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
