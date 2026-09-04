import React from 'react';
import { JobOffer } from '../types/game';
import { Briefcase, Building2, DollarSign, Trophy, MapPin, CheckCircle2, XCircle, Users } from 'lucide-react';

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

  return (
    <div
      id={`job_offer_${offer.id}`}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isAccepted
          ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-900/20'
          : isRejected
          ? 'bg-slate-900/40 border-slate-800 opacity-60'
          : isSelected
          ? 'bg-slate-850 border-amber-500/80 shadow-lg shadow-amber-500/10'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header bar */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: offer.primaryColor || '#f59e0b' }}
      />

      <div className="p-4 sm:p-5 space-y-4">
        {/* Title and Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md border border-white/10 shrink-0"
              style={{ backgroundColor: offer.primaryColor }}
            >
              {offer.clubName.slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-100 text-base sm:text-lg">{offer.clubName}</h4>
                {offer.categoryBadge && (
                  <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-0.5 rounded-full border border-amber-500/40 font-bold flex items-center gap-1 shadow-sm">
                    {offer.categoryBadge}
                  </span>
                )}
                {isAccepted && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> تم القبول
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> {offer.country}
                </span>
                <span>•</span>
                <span className="text-amber-400 font-medium">{offer.leagueName}</span>
                <span>•</span>
                <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                  الدرجة {offer.divisionTier}
                </span>
              </div>
            </div>
          </div>

          <div className="text-left shrink-0">
            <div className="text-xs text-slate-400">السمعة</div>
            <div className="text-sm font-bold text-amber-400">⭐ {offer.clubReputation}/100</div>
          </div>
        </div>

        {/* Offer Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40">
            <div className="text-slate-400 flex items-center gap-1 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> راتب المدرب الشهري
            </div>
            <div className="font-bold text-emerald-400 text-sm">
              {offer.managerSalary.toLocaleString()} ج.م
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40">
            <div className="text-slate-400 flex items-center gap-1 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" /> ميزانية الانتقالات
            </div>
            <div className="font-bold text-blue-400 text-sm">
              {offer.transferBudget.toLocaleString()} ج.م
            </div>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/40 col-span-2 sm:col-span-1">
            <div className="text-slate-400 flex items-center gap-1 mb-1">
              <Building2 className="w-3.5 h-3.5 text-purple-400" /> الاستاد وسعته
            </div>
            <div className="font-bold text-slate-200 truncate">
              {offer.stadiumName}
            </div>
            <div className="text-[10px] text-slate-400">
              ({offer.stadiumCapacity.toLocaleString()} مشجع)
            </div>
          </div>
        </div>

        {/* Board Expectations & Interest Reason */}
        <div className="space-y-2">
          {offer.interestReason && (
            <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-2.5 text-xs text-indigo-200/90 flex items-start gap-2">
              <Users className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-indigo-300">سبب اهتمام الإدارة بالتعاقد: </span>
                {offer.interestReason}
              </div>
            </div>
          )}

          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-200/90 flex items-start gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">أهداف وطموحات الإدارة: </span>
              {offer.boardExpectations} (عقد لمدة {offer.contractDurationYears} سنوات).
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {isAccepted ? (
            <button
              id={`btn_offer_accepted_${offer.id}`}
              disabled
              className="flex-1 py-2 px-4 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> العقد التدريبي المختار للموسم القادم
            </button>
          ) : (
            <>
              <button
                id={`btn_accept_offer_${offer.id}`}
                onClick={() => onAccept(offer.id)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> قبول العقد والانتقال للنادي
              </button>
              {!isRejected && (
                <button
                  id={`btn_reject_offer_${offer.id}`}
                  onClick={() => onReject(offer.id)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> رفض
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
