import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { YouthProspect } from '../types/game';
import {
  GraduationCap,
  Sparkles,
  UserPlus,
  DollarSign,
  TrendingUp,
  Award,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Star,
  Search,
  ChevronRight,
  Info
} from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';

interface YouthAcademyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YouthAcademyModal: React.FC<YouthAcademyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    userClub,
    promoteYouthProspect,
    sellYouthProspect,
    scoutNewYouthBatch,
    upgradeFacility,
  } = useGame();

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [isScoutingLoading, setIsScoutingLoading] = useState(false);

  if (!isOpen || !userClub) return null;

  const facilities = userClub.facilities || {
    stadiumCapacity: 5000,
    stadiumLevel: 1,
    stadiumName: 'استاد النادي',
    medicalCenterLevel: 1,
    trainingGroundLevel: 1,
    youthAcademyLevel: 1,
    scoutingNetworkLevel: 1,
  };

  const academyLevel = facilities.youthAcademyLevel || 1;
  const upgradeCost = academyLevel * 25000 + 20000;
  const isMaxLevel = academyLevel >= 5;
  const scoutCost = academyLevel * 12000 + 8000;

  const prospects: YouthProspect[] = Array.isArray(userClub.youthAcademyProspects)
    ? userClub.youthAcademyProspects
    : [];

  const promotedThisSeason = userClub.seasonPromotedYouthCount || 0;
  const remainingPromotions = Math.max(0, 3 - promotedThisSeason);
  const isPromotionLimitReached = promotedThisSeason >= 3;

  const filteredProspects = selectedCategory === 'ALL'
    ? prospects
    : prospects.filter(p => p.positionCategory === selectedCategory);

  const handlePromote = (prospect: YouthProspect) => {
    const promotionCost = Math.round(prospect.marketValuation * 0.5);
    if (isPromotionLimitReached) {
      setNotification({ text: 'بلغت الحد الأقصى لتصعيد الناشئين لهذا الموسم (3 لاعبين فقط)!', type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    if (userClub.budget < promotionCost) {
      setNotification({ text: `ميزانية النادي لا تكفي لرسوم التصعيد (${promotionCost.toLocaleString()} ج.م)!`, type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    const res = promoteYouthProspect(prospect.id);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSell = (prospect: YouthProspect) => {
    const res = sellYouthProspect(prospect.id);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleScoutNewIntake = () => {
    if (userClub.budget < scoutCost) {
      setNotification({ text: `ميزانية النادي لا تكفي لرسوم تجارب أداء الكشافة (${scoutCost.toLocaleString()} ج.م)`, type: 'error' });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    setIsScoutingLoading(true);
    setTimeout(() => {
      const res = scoutNewYouthBatch(scoutCost);
      setIsScoutingLoading(false);
      setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
      setTimeout(() => setNotification(null), 3500);
    }, 600);
  };

  const handleUpgradeAcademy = () => {
    const res = upgradeFacility('youthAcademyLevel', upgradeCost);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 3500);
  };

  const getPositionArabicName = (pos: string) => {
    switch (pos) {
      case 'GK': return 'حارس مرمى';
      case 'CB': return 'قلب دفاع';
      case 'RB': return 'ظهير أيمن';
      case 'LB': return 'ظهير أيسر';
      case 'CDM': return 'وسط مدافع';
      case 'CM': return 'وسط محوري';
      case 'CAM': return 'صانع ألعاب';
      case 'RW': return 'جناح أيمن';
      case 'LW': return 'جناح أيسر';
      case 'ST': return 'مهاجم هداف';
      default: return pos;
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
      <div
        id="youth_academy_modal"
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-xl shrink-0 shadow-lg">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-white">أكاديمية قطاع الناشئين والمواهب الصاعدة 🌟</h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  مستوى {academyLevel} / 5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تفريخ وتطوير جواهر المستقبل، وتصعيدهم للفريق الأول أو الاستثمار في بيع عقودهم
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {notification && (
          <div className={`m-3 p-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Academy Overview & Actions Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Level & Quality Card */}
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">كفاءة وتجهيزات الأكاديمية:</span>
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                  {[...Array(5)].map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-4 h-4 ${idx < academyLevel ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                    />
                  ))}
                  <span className="mr-1 text-xs text-slate-300 font-mono">({academyLevel}/5)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {academyLevel === 1 && 'مستوى تأسيسي: ناشئون بأعمار 15-18 سنة وطاقات تأسيسية (38-44) قابلة للتطوير.'}
                  {academyLevel === 2 && 'مدرسة إقليمية: رصد أفضل في المحافظات مع مواهب بطاقات (40-47).'}
                  {academyLevel === 3 && 'مركز تدريب متقدم: ظهور خامات كروية واعدة بطاقات (43-50) وقدرة محتملة عالية.'}
                  {academyLevel === 4 && 'أكاديمية احترافية: مواهب شابة (45-53) جاهزة للتطوير بالتدريب والمباريات.'}
                  {academyLevel >= 5 && 'أكاديمية النخبة الأسطورية: تفريخ أفضل مواهب الناشئين (حتى 55 كحد أقصى) مع إمكانات نمو هائلة.'}
                </p>
              </div>

              {!isMaxLevel && (
                <button
                  onClick={handleUpgradeAcademy}
                  disabled={userClub.budget < upgradeCost}
                  className="mt-3 w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 border border-amber-500/30 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>ترقية الأكاديمية ({upgradeCost.toLocaleString()} ج.م)</span>
                </button>
              )}
            </div>

            {/* Scout New Trials Card */}
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">تجارب أداء واختبارات كشف جديدة:</span>
                <h4 className="font-bold text-white text-sm">إرسال كشافة الأكاديمية 🕵️‍♂️</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  إجراء اختبارات ميدانية لجلب دفعة ناشئين جديدة بطاقات أولية (أقصاها 55) وأسعار مناسبة للتطوير.
                </p>
              </div>

              <button
                onClick={handleScoutNewIntake}
                disabled={isScoutingLoading}
                className="mt-3 w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>
                  {isScoutingLoading ? 'جاري الفحص الميداني...' : `اختبارات كشف جديدة (${scoutCost.toLocaleString()} ج.م)`}
                </span>
              </button>
            </div>

            {/* Club Finances & Promotion Quota Overview */}
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 block mb-1">ميزانية النادي المتاحة:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    كوتة التصعيد: {promotedThisSeason}/3
                  </span>
                </div>
                <div className="font-black text-emerald-400 font-mono text-base sm:text-lg">
                  {userClub.budget.toLocaleString()} ج.م
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>المواهب في الأكاديمية: <strong className="text-white font-mono">{prospects.length}</strong></span>
                  <span className={remainingPromotions > 0 ? 'text-teal-300 font-bold' : 'text-rose-400 font-bold'}>
                    {remainingPromotions > 0 ? `متبقي ${remainingPromotions} تصعيد بالموسم` : 'اكتملت كوتة الموسم'}
                  </span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-slate-900 rounded-xl border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>تكلفة التصعيد = 50% من القيمة السوقية للموهبة (بحد أقصى 3 لاعبين بكل موسم).</span>
              </div>
            </div>

          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>مواهب الأكاديمية الحالية ({filteredProspects.length})</span>
            </h4>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {[
                { id: 'ALL', label: 'الكل' },
                { id: 'GK', label: 'حراس 🧤' },
                { id: 'DEF', label: 'دفاع 🛡️' },
                { id: 'MID', label: 'وسط ⚙️' },
                { id: 'FWD', label: 'هجوم ⚽' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    selectedCategory === tab.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prospects List */}
          {filteredProspects.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center font-bold text-xl mx-auto">
                🌱
              </div>
              <h4 className="text-sm font-bold text-slate-300">لا توجد مواهب في هذا التصنيف حالياً</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                اضغط على زر (اختبارات كشف جديدة) أعلاه لإجراء تجارب أداء واستقطاب مواهب واعدة للأكاديمية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProspects.map(prospect => (
                <div
                  key={prospect.id}
                  id={`prospect_card_${prospect.id}`}
                  className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 relative overflow-hidden transition-all shadow-md"
                >
                  {/* Prospect Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-teal-500/20 border border-amber-500/30 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0">
                        {prospect.position}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-bold text-white text-sm sm:text-base">{prospect.name}</h5>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 border border-slate-700">
                            {prospect.age} سنة
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="text-teal-400 font-medium">{getPositionArabicName(prospect.position)}</span>
                          <span>•</span>
                          <span>القدم: {prospect.preferredFoot === 'both' ? 'القدمين' : prospect.preferredFoot === 'left' ? 'اليسرى' : 'اليمنى'}</span>
                          <span>•</span>
                          <span>{prospect.nationality}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ratings Badge */}
                    <div className="text-left shrink-0 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                      <div className="text-[10px] text-slate-400">الطاقة الحالية</div>
                      <div className="text-sm font-black text-emerald-400 font-mono">
                        {prospect.overallRating}
                        <span className="text-[10px] text-slate-500 font-normal"> / 99</span>
                      </div>
                    </div>
                  </div>

                  {/* Potential Bar & Trait */}
                  <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" /> القدرة المحتملة (Potential):
                      </span>
                      <span className="font-black text-amber-400 font-mono">
                        {prospect.potentialRating} ⭐
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(30, (prospect.potentialRating / 99) * 100))}%` }}
                      />
                    </div>

                    {prospect.specialTrait && (
                      <div className="pt-1 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <span>السمة الخاصة:</span>
                        <span>{prospect.specialTrait}</span>
                      </div>
                    )}
                  </div>

                  {/* Scout Report */}
                  <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/50">
                    <span className="text-amber-400 font-bold ml-1">تقرير الكشاف:</span>
                    {prospect.scoutReport}
                  </div>

                  {/* Financial Values */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px] block">القيمة السوقية للحقوق:</span>
                      <strong className="text-emerald-400 font-mono font-bold">
                        {prospect.marketValuation.toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px] block">الراتب المطلوب شهرياً:</span>
                      <strong className="text-cyan-400 font-mono font-bold">
                        {prospect.wageDemandMonthly.toLocaleString()} ج.م/ش
                      </strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-1">
                    <button
                      id={`btn_promote_${prospect.id}`}
                      onClick={() => handlePromote(prospect)}
                      disabled={isPromotionLimitReached || userClub.budget < Math.round(prospect.marketValuation * 0.5)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer ${
                        isPromotionLimitReached
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                          : userClub.budget < Math.round(prospect.marketValuation * 0.5)
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60 cursor-not-allowed opacity-70'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                      }`}
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>
                        {isPromotionLimitReached
                          ? 'اكتملت كوتة التصعيد لهذا الموسم (3/3)'
                          : `تصعيد للفريق الأول (${Math.round(prospect.marketValuation * 0.5).toLocaleString()} ج.م)`}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            أكاديمية {userClub.name} • {userClub.city}
          </span>

          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
          >
            إغلاق الأكاديمية
          </button>
        </div>

      </div>
      </div>
    </ModalPortal>
  );
};
