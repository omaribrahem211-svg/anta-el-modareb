import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Sponsor, SponsorshipOffer, SponsorCategory } from '../types/game';
import { getSponsorCategoryLabel } from '../services/sponsorshipService';
import {
  X,
  Award,
  DollarSign,
  TrendingUp,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Coins,
  Briefcase,
  Handshake,
  RefreshCw,
  Trash2,
  Trophy,
  Globe,
  Percent,
  Zap,
  Tag,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';

interface SponsorshipHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SponsorshipHubModal: React.FC<SponsorshipHubModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    userClub,
    signSponsorshipContract,
    terminateSponsorshipContract,
    negotiateSponsorshipOffer,
    renewSponsorshipContract,
    availableSponsorOffers,
    refreshSponsorshipOffers,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'active' | 'offers' | 'milestones' | 'analytics'>('active');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  if (!isOpen || !userClub) return null;

  const sponsors: Sponsor[] = Array.isArray(userClub.sponsors) ? userClub.sponsors : [];
  const offers: SponsorshipOffer[] = Array.isArray(availableSponsorOffers) ? availableSponsorOffers : [];

  const totalMonthlyIncome = sponsors.reduce((sum, s) => sum + (s.monthlyPayment || 0), 0);
  const totalAnnualProjected = totalMonthlyIncome * 12;
  const avgSatisfaction =
    sponsors.length > 0
      ? Math.round(sponsors.reduce((sum, s) => sum + (s.satisfaction || 80), 0) / sponsors.length)
      : 80;

  // Filter offers
  const filteredOffers = offers.filter(o => {
    if (selectedCategoryFilter === 'all') return true;
    return (o.category || o.type) === selectedCategoryFilter;
  });

  // Handle contract signing
  const handleSign = (offer: SponsorshipOffer) => {
    if (!signSponsorshipContract) return;
    const res = signSponsorshipContract(offer);
    setFeedbackMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Handle negotiation
  const handleNegotiate = (offerId: string) => {
    if (!negotiateSponsorshipOffer) return;
    const res = negotiateSponsorshipOffer(offerId);
    setFeedbackMessage({
      text: res.message,
      type: res.success ? 'success' : 'info',
    });
    setTimeout(() => setFeedbackMessage(null), 6000);
  };

  // Handle termination
  const handleTerminate = (sponsorId: string) => {
    if (!terminateSponsorshipContract) return;
    const res = terminateSponsorshipContract(sponsorId);
    setFeedbackMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Handle early renewal
  const handleRenew = (sponsorId: string) => {
    if (!renewSponsorshipContract) return;
    const res = renewSponsorshipContract(sponsorId);
    setFeedbackMessage({
      text: res.message,
      type: res.success ? 'success' : 'error',
    });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const allSlots: { key: SponsorCategory; title: string; desc: string }[] = [
    { key: 'shirt', title: 'الراعي الرئيسي للقميص', desc: 'صدر القميص في كافة المباريات الرسمية' },
    { key: 'stadium', title: 'راعي الاستاد واللوحات LED', desc: 'حقوق تسمية الملعب واللوحات الإلكترونية' },
    { key: 'kit_apparel', title: 'المورد الرسمي للأطقم', desc: 'تصنيع وتوزيع الأطقم والتجهيزات الرياضية' },
    { key: 'sleeve', title: 'راعي أكمام القميص والظهر', desc: 'مساحة الإعلان على الأكمام وأعلى ظهر القميص' },
    { key: 'commercial_partner', title: 'الشريك التجاري والمصرفي', desc: 'الشريك الحصري للخدمات البنكية والرقمية' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-y-auto animate-in fade-in duration-150 min-h-screen" dir="rtl">
      {/* Top Page Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition cursor-pointer"
              title="العودة إلى النادي"
            >
              <ArrowRight className="w-4 h-4 ml-0.5" />
              <span>العودة إلى النادي</span>
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-lg font-black text-white">
                    صفحة عقود الرعاية والشراكات التجارية
                  </h1>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {userClub.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  إدارة عقود الرعاة، والتفاوض على مكافآت البطولات، وتنمية المداخيل التجارية للنادي
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="إغلاق والعودة"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`px-4 py-3 text-sm flex items-center justify-center gap-2 font-medium transition ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-b border-emerald-800'
              : feedbackMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-b border-rose-800'
              : 'bg-blue-950/90 text-blue-200 border-b border-blue-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : feedbackMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Financial Highlights Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Coins className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">الدخل الشهري للرعاية:</span>
                <strong className="text-emerald-400 font-mono text-sm sm:text-base font-bold">
                  +{totalMonthlyIncome.toLocaleString()} ج.م
                </strong>
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">العائد السنوي المتوقع:</span>
                <strong className="text-blue-400 font-mono text-sm sm:text-base font-bold">
                  +{totalAnnualProjected.toLocaleString()} ج.م
                </strong>
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">العقود المفعلة:</span>
                <strong className="text-amber-400 font-mono text-sm sm:text-base font-bold">
                  {sponsors.length} من أصل 5 شراكات
                </strong>
              </div>
            </div>

            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <Percent className="w-6 h-6 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[11px]">متوسط رضا الرعاة:</span>
                <strong className="text-cyan-400 font-mono text-sm sm:text-base font-bold">{avgSatisfaction}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-900/80 border-b border-slate-800 sticky top-16 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'active'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>الرعاة الحاليون ({sponsors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap relative cursor-pointer ${
              activeTab === 'offers'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>سوق وعروض الرعاية الواردة</span>
            {offers.length > 0 && (
              <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                {offers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('milestones')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'milestones'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>حوافز المسابقات والبطولات</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>التحليل المالي للرعاية</span>
          </button>
        </div>
      </div>

      {/* Page Content Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
          {/* TAB 1: ACTIVE SPONSORS */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>الشراكات التجارية المعتمدة بقميص واستاد النادي</span>
                </h3>

                <button
                  onClick={() => setActiveTab('offers')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl transition"
                >
                  <Handshake className="w-3.5 h-3.5" />
                  <span>استعراض عروض جديدة ({offers.length})</span>
                </button>
              </div>

              {sponsors.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-3xl border border-slate-800 space-y-3">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-slate-300">لا توجد عقود رعاية مفعلة حالياً</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    افتح تبويب &quot;سوق وعروض الرعاية&quot; لتوقيع أولى الشراكات التجارية للنادي والحصول على مكافآت توقيع فورية ودخل شهري مستقر.
                  </p>
                  <button
                    onClick={() => setActiveTab('offers')}
                    className="mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20 transition"
                  >
                    توقيع عقود رعاية الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sponsors.map(sponsor => {
                    const catInfo = getSponsorCategoryLabel(sponsor.category || sponsor.type);
                    const satisfaction = sponsor.satisfaction ?? 85;

                    return (
                      <div
                        key={sponsor.id}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3.5 shadow-md relative overflow-hidden transition"
                      >
                        {/* Top Accent Strip */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: sponsor.brandColor || '#f59e0b' }}
                        />

                        {/* Sponsor Header */}
                        <div className="flex items-start justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-inner"
                              style={{ backgroundColor: sponsor.brandColor || '#1e293b' }}
                            >
                              {sponsor.name.slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                                <span>{sponsor.name}</span>
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {sponsor.industry || 'شراكة تجارية واستراتيجية'}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${catInfo.badgeColor}`}>
                            {catInfo.label}
                          </span>
                        </div>

                        {sponsor.tagline && (
                          <div className="text-[11px] italic text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
                            &quot;{sponsor.tagline}&quot;
                          </div>
                        )}

                        {/* Financial Figures */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/70 p-2.5 rounded-xl border border-slate-800">
                          <div>
                            <span className="text-slate-400 block text-[10px]">الدفع الشهري الثابت:</span>
                            <strong className="text-emerald-400 font-mono text-xs sm:text-sm">
                              +{sponsor.monthlyPayment.toLocaleString()} ج.م
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">المدة المتبقية:</span>
                            <span className="text-white font-mono text-xs font-semibold flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {sponsor.contractMonthsRemaining} أشهر
                              {sponsor.totalDurationMonths ? ` من ${sponsor.totalDurationMonths}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Competition Bonuses Breakdown */}
                        <div className="space-y-1 text-[11px] text-slate-300">
                          <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">
                            حوافز ومكافآت المسابقات:
                          </span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            <div className="flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded-lg">
                              <span className="text-slate-400">مكافأة فوز الدوري:</span>
                              <strong className="text-amber-400 font-mono">
                                +{sponsor.bonusForWin.toLocaleString()} ج.م
                              </strong>
                            </div>

                            <div className="flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded-lg">
                              <span className="text-slate-400">مكافأة الكأس:</span>
                              <strong className="text-cyan-400 font-mono">
                                +{(sponsor.bonusCupWin || sponsor.bonusForWin * 1.5).toLocaleString()} ج.م
                              </strong>
                            </div>

                            <div className="flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded-lg">
                              <span className="text-slate-400">مكافأة القارات:</span>
                              <strong className="text-indigo-400 font-mono">
                                +{(sponsor.bonusContinentalWin || sponsor.bonusForWin * 2.5).toLocaleString()} ج.م
                              </strong>
                            </div>

                            <div className="flex justify-between items-center bg-slate-900/40 px-2 py-1 rounded-lg">
                              <span className="text-slate-400">نظافة الشباك:</span>
                              <strong className="text-emerald-400 font-mono">
                                +{(sponsor.bonusCleanSheet || Math.round(sponsor.bonusForWin * 0.4)).toLocaleString()} ج.م
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Satisfaction Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">رضا مجلس إدارة الراعي:</span>
                            <span
                              className={`font-bold font-mono ${
                                satisfaction >= 75
                                  ? 'text-emerald-400'
                                  : satisfaction >= 50
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {satisfaction}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                satisfaction >= 75
                                  ? 'bg-emerald-500'
                                  : satisfaction >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${satisfaction}%` }}
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleRenew(sponsor.id)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                            <span>تمديد مبكر (+12 شهر)</span>
                          </button>

                          <button
                            onClick={() => handleTerminate(sponsor.id)}
                            title="فسخ العقد"
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition border border-transparent hover:border-rose-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Club Sponsorship Inventory Slots Checklist */}
              <div className="mt-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>حالة خانات الرعاية الخمس المتاحة بالنادي</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 text-xs">
                  {allSlots.map(slot => {
                    const activeSponsor = sponsors.find(s => (s.category || s.type) === slot.key);
                    return (
                      <div
                        key={slot.key}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          activeSponsor
                            ? 'bg-slate-900/90 border-emerald-500/30 text-slate-200'
                            : 'bg-slate-900/40 border-dashed border-slate-800 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="font-bold flex items-center gap-1.5 text-xs text-white">
                            {activeSponsor ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span>{slot.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {activeSponsor ? activeSponsor.name : 'شاغرة - جاهزة للتعاقد'}
                          </span>
                        </div>

                        {!activeSponsor && (
                          <button
                            onClick={() => {
                              setSelectedCategoryFilter(slot.key);
                              setActiveTab('offers');
                            }}
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded-lg transition"
                          >
                            توقيع
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INCOMING SPONSORSHIP OFFERS & BIDS */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Handshake className="w-4 h-4 text-emerald-400" />
                    <span>عروض الرعاية والشراكات الواردة لمجلس إدارة النادي</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    تقييم عروض الشركات والمؤسسات بناءً على سمعة النادي ونتائجه ومنافسته في البطولات
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (refreshSponsorshipOffers) refreshSponsorshipOffers();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تحديث واستقطاب عروض جديدة</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'كافة العروض' },
                  { id: 'shirt', label: 'القميص' },
                  { id: 'stadium', label: 'الاستاد' },
                  { id: 'kit_apparel', label: 'الأطقم' },
                  { id: 'sleeve', label: 'الأكمام' },
                  { id: 'commercial_partner', label: 'شريك تجاري' },
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setSelectedCategoryFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                      selectedCategoryFilter === pill.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {filteredOffers.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-3xl border border-slate-800 space-y-3">
                  <Tag className="w-12 h-12 text-slate-600 mx-auto" />
                  <h4 className="text-base font-bold text-slate-300">لا توجد عروض في هذا التصنيف حالياً</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    اضغط على زر &quot;تحديث واستقطاب عروض جديدة&quot; لاستقبال خطابات اهتمام من كبرى الشركات.
                  </p>
                  <button
                    onClick={() => {
                      if (refreshSponsorshipOffers) refreshSponsorshipOffers();
                    }}
                    className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-500 transition"
                  >
                    استقطاب عروض الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5">
                  {filteredOffers.map(offer => {
                    const catInfo = getSponsorCategoryLabel(offer.category || offer.type);
                    const isOccupied = sponsors.some(
                      s => (s.category || s.type) === (offer.category || offer.type)
                    );

                    return (
                      <div
                        key={offer.id}
                        className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl space-y-3 shadow-lg relative overflow-hidden transition flex flex-col justify-between"
                      >
                        {/* Top Brand Banner */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5"
                          style={{ backgroundColor: offer.brandColor || '#10b981' }}
                        />

                        <div className="space-y-3">
                          {/* Header info */}
                          <div className="flex items-start justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg"
                                style={{ backgroundColor: offer.brandColor || '#1e293b' }}
                              >
                                {offer.name.slice(0, 2)}
                              </div>
                              <div>
                                <h4 className="font-black text-sm text-white">{offer.name}</h4>
                                <span className="text-[11px] text-slate-400 block">{offer.industry}</span>
                              </div>
                            </div>

                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${catInfo.badgeColor}`}>
                              {catInfo.label}
                            </span>
                          </div>

                          {offer.tagline && (
                            <p className="text-[11px] text-slate-400 italic bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                              &quot;{offer.tagline}&quot;
                            </p>
                          )}

                          {/* Upfront Cash & Monthly Payments */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <div>
                              <span className="text-amber-400 block text-[10px] font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                مكافأة توقيع فورية كاش:
                              </span>
                              <strong className="text-amber-300 font-mono text-sm block mt-0.5">
                                +{(offer.signingBonus || 50000).toLocaleString()} ج.م
                              </strong>
                            </div>

                            <div>
                              <span className="text-emerald-400 block text-[10px] font-bold flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                الدفعة الشهرية الثابتة:
                              </span>
                              <strong className="text-emerald-400 font-mono text-sm block mt-0.5">
                                +{offer.monthlyPayment.toLocaleString()} ج.م
                              </strong>
                            </div>
                          </div>

                          {/* Performance clauses across competitions */}
                          <div className="space-y-1.5 text-xs bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                              مكافآت وحوافز النتائج في البطولات:
                            </span>

                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded-lg">
                                <span className="text-slate-400">فوز الدوري:</span>
                                <strong className="text-amber-400 font-mono">
                                  +{offer.bonusForWin.toLocaleString()} ج.م
                                </strong>
                              </div>

                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded-lg">
                                <span className="text-slate-400">فوز الكأس:</span>
                                <strong className="text-cyan-400 font-mono">
                                  +{(offer.bonusCupWin || offer.bonusForWin * 1.5).toLocaleString()} ج.م
                                </strong>
                              </div>

                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded-lg">
                                <span className="text-slate-400">فوز إفريقي/قاري:</span>
                                <strong className="text-indigo-400 font-mono">
                                  +{(offer.bonusContinentalWin || offer.bonusForWin * 2.5).toLocaleString()} ج.م
                                </strong>
                              </div>

                              <div className="flex justify-between bg-slate-950/60 p-1.5 rounded-lg">
                                <span className="text-slate-400">مدة العقد:</span>
                                <strong className="text-white font-mono">
                                  {offer.totalDurationMonths || 12} شهر
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Slot Status Notice */}
                          {isOccupied && (
                            <div className="text-[10px] text-amber-300 bg-amber-950/30 border border-amber-900/40 p-2 rounded-lg flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>يوجد راعٍ حالي في هذه الخانة؛ قبول هذا العقد سيحل محله مباشرة.</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                          <button
                            onClick={() => handleSign(offer)}
                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition"
                          >
                            <Handshake className="w-4 h-4" />
                            <span>توقيع العقد فوراً</span>
                          </button>

                          <button
                            onClick={() => handleNegotiate(offer.id)}
                            disabled={offer.negotiationCount ? offer.negotiationCount >= 2 : false}
                            className={`px-3 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition ${
                              offer.negotiationCount && offer.negotiationCount >= 2
                                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>تفاوض {offer.negotiationCount ? `(${offer.negotiationCount}/2)` : ''}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPETITION MILESTONES & TROPHY BONUSES */}
          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>مكافآت وحوافز التتويج بالبطولات الموعودة من الرعاة</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    بنود تحفيزية خاصة تودع في خزينة النادي فور تحقيق الإنجازات ورفع الكؤوس
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* League Championship Milestone */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        🏆
                      </div>
                      <h4 className="font-bold text-sm text-white">لقب الدوري العام</h4>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold">
                      الدوري المصري
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    مكافأة تمنح للنادي عند احتلال صدارة الترتيب النهائي ورفع درع البطولة
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">إجمالي الحافز الموعود:</span>
                    <strong className="text-amber-400 font-mono text-sm">
                      +{sponsors.reduce((sum, s) => sum + (s.milestoneBonus?.leagueChampionBonus || 0), 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>

                {/* Cup Championship Milestone */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                        🥇
                      </div>
                      <h4 className="font-bold text-sm text-white">لقب كأس مصر / الكأس المحلية</h4>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-cyan-400 font-bold">
                      البطولة الإقصائية
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    مكافأة الفوز في المباراة النهائية ورفع الكأس العريقة
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">إجمالي الحافز الموعود:</span>
                    <strong className="text-cyan-400 font-mono text-sm">
                      +{sponsors.reduce((sum, s) => sum + (s.milestoneBonus?.cupChampionBonus || 0), 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>

                {/* Continental Title Milestone */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                        🌍
                      </div>
                      <h4 className="font-bold text-sm text-white">دوري أبطال إفريقيا / المسابقة القارية</h4>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-bold">
                      المجد الإفريقي
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    أعلى مكافأة تجارية تمنح عند التتويج القاري وتمثيل الوطن في كأس العالم للأندية
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">إجمالي الحافز الموعود:</span>
                    <strong className="text-indigo-400 font-mono text-sm">
                      +{sponsors.reduce((sum, s) => sum + (s.milestoneBonus?.continentalChampionBonus || 0), 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>

                {/* Top 4 Finish Milestone */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        ⭐
                      </div>
                      <h4 className="font-bold text-sm text-white">المربع الذهبي والتأهل القاري</h4>
                    </div>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold">
                      حجز المقعد الإفريقي
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    مكافأة إنهاء موسم الدوري بين الأربعة الأوائل وضمان المشاركة في البطولات القارية
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">إجمالي الحافز الموعود:</span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      +{sponsors.reduce((sum, s) => sum + (s.milestoneBonus?.topFourFinishBonus || 0), 0).toLocaleString()} ج.م
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCIAL ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>التحليل المالي الشامل للرعاية والشراكات التجارية</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <span className="text-slate-400 block text-xs">التدفق الشهري الثابت</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    +{totalMonthlyIncome.toLocaleString()} ج.م
                  </div>
                  <p className="text-[11px] text-slate-500">
                    تضخ هذه المبالغ شهرياً في ميزانية النادي لتغطية رواتب اللاعبين والمصاريف التشغيلية.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <span className="text-slate-400 block text-xs">متوسط مكافأة الفوز في المباراة</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    +{sponsors.reduce((sum, s) => sum + (s.bonusForWin || 0), 0).toLocaleString()} ج.م
                  </div>
                  <p className="text-[11px] text-slate-500">
                    مجموع المكافآت التي يمنحها الرعاة للنادي عند كل انتصار رسمي في بطولة الدوري.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <span className="text-slate-400 block text-xs">مكافأة الفوز القاري / الإفريقي</span>
                  <div className="text-2xl font-black text-indigo-400 font-mono">
                    +{sponsors.reduce((sum, s) => sum + (s.bonusContinentalWin || s.bonusForWin * 2.5), 0).toLocaleString()} ج.م
                  </div>
                  <p className="text-[11px] text-slate-500">
                    حوافز مضاعفة تمنح للنادي في مواجهات البطولات القارية والكبرى.
                  </p>
                </div>
              </div>

              {/* Tips for Maximizing Sponsorship */}
              <div className="bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-500/20 p-4 rounded-2xl space-y-2 text-xs">
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <span>إرشادات المدير الفني لتعظيم العوائد التجارية:</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>تحقيق الانتصارات المتتالية يرفع نسبة رضا الرعاة ويفتح المجال لعروض تجديد بقيم مالية أعلى بنسبة 20-30%.</li>
                  <li>المنافسة على الألقاب في الكأس والدوري تؤدي إلى وصول عروض من شركات الاتصالات والبنوك الكبرى.</li>
                  <li>تفاوض دائماً قبل التوقيع لرفع الدفعات الشهرية؛ فسمعة النادي تمنحك قوة تفاوضية ممتازة.</li>
                  <li>احرص على إشغال الخانات الخمس للرعاية لضمان تدفق نقدي كافٍ لدفع رواتب كبار النجوم.</li>
                </ul>
              </div>
            </div>
          )}
      </main>

      {/* Page Footer */}
      <footer className="mt-auto bg-slate-900/90 border-t border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام عقود الرعاية المتطور - موافق للوائح الاتحاد المصري والدولي لكرة القدم</span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 ml-0.5" />
            <span>العودة إلى النادي</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
