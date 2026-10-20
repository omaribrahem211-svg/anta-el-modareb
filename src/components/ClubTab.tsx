import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { ClubFacilities } from '../types/game';
import { calculateClubMonthlyIncome, calculateClubTotalMonthlyWages } from '../services/economyService';
import { getBenchmarkTicketPrice } from '../utils/matchRevenue';
import { MedicalCenterModal } from './MedicalCenterModal';
import { YouthAcademyModal } from './YouthAcademyModal';
import {
  Building2,
  Wallet,
  TrendingUp,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  HeartPulse,
  Dumbbell,
  GraduationCap,
  Binoculars,
  DollarSign,
  ArrowLeftRight,
  Coins,
  Scale,
  Stethoscope,
  Bandage,
  Sparkles,
  Target,
  PiggyBank,
  Heart,
  Ticket,
  Gift,
} from 'lucide-react';
import { PromoCodeRedeemModal } from './PromoCodeRedeemModal';

export const ClubTab: React.FC = () => {
  const { 
    userClub, 
    manager, 
    boardSystem, 
    standings, 
    upgradeFacility, 
    transferBudgetToWageBudget, 
    transferWageToCashBudget,
    donateToClubFromPersonalWallet,
    setClubTicketPrice,
    activeLeague,
    canClaimDailyReward,
    setShowDailyRewardModal,
    dailyRewardState,
  } = useGame();
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState<boolean>(false);
  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
  const [ticketPriceInput, setTicketPriceInput] = useState<number>(userClub?.facilities?.ticketPrice || 20);

  useEffect(() => {
    if (userClub?.facilities?.ticketPrice) {
      setTicketPriceInput(userClub.facilities.ticketPrice);
    }
  }, [userClub?.facilities?.ticketPrice]);
  const [isYouthAcademyModalOpen, setIsYouthAcademyModalOpen] = useState<boolean>(false);
  const [transferMode, setTransferMode] = useState<'cash_to_wage' | 'wage_to_cash'>('cash_to_wage');
  const [cashAmountToTransfer, setCashAmountToTransfer] = useState<number | string>(60000);
  const [wageAmountToTransfer, setWageAmountToTransfer] = useState<number | string>(5000);
  const [personalDonationAmount, setPersonalDonationAmount] = useState<number | string>(50000);

  const numCashAmount = typeof cashAmountToTransfer === 'number' ? cashAmountToTransfer : (Number(cashAmountToTransfer) || 0);
  const numWageAmount = typeof wageAmountToTransfer === 'number' ? wageAmountToTransfer : (Number(wageAmountToTransfer) || 0);
  const numPersonalDonation = typeof personalDonationAmount === 'number' ? personalDonationAmount : (Number(personalDonationAmount) || 0);


  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">
          🏟️
        </div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا توجد منشآت أو ميزانية نادٍ خاصة بك لإدارتها حالياً. تعاقد مع أحد الأندية المتاحة في تبويب المسيرة لبدء تطوير ملعبه ومرافقه!
        </p>
      </div>
    );
  }

  const squadPlayers = Array.isArray(userClub.players) ? userClub.players : [];
  const totalMonthlyWages = calculateClubTotalMonthlyWages(userClub);
  const facilities = userClub.facilities || { stadiumCapacity: 5000, stadiumLevel: 1, stadiumName: 'استاد النادي', medicalCenterLevel: 1, trainingGroundLevel: 1, youthAcademyLevel: 1, scoutingNetworkLevel: 1 };
  const estimatedTicketMonthly = (facilities.stadiumCapacity || 5000) * 25 * 2; // approx 2 home games / month
  const totalMonthlyIncome = calculateClubMonthlyIncome(userClub);
  const monthlyMaintenance = (facilities.stadiumLevel || 1) * 3000 + (facilities.medicalCenterLevel || 1) * 2000;
  const netMonthlyIncome = totalMonthlyIncome - (totalMonthlyWages + monthlyMaintenance);
  const remainingWageBudget = Math.max(0, totalMonthlyIncome - totalMonthlyWages);
  const currentWageBonus = userClub.wageBudgetMonthly || 0;

  const handleUpgrade = (key: keyof ClubFacilities, name: string, cost: number) => {
    const res = upgradeFacility(key, cost);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleTransferBudgetToWage = () => {
    if (numCashAmount <= 0) return;
    const res = transferBudgetToWageBudget(numCashAmount);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTransferWageToCash = () => {
    if (numWageAmount <= 0) return;
    const res = transferWageToCashBudget(numWageAmount);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDonatePersonal = () => {
    if (numPersonalDonation <= 0) return;
    const res = donateToClubFromPersonalWallet(numPersonalDonation);
    setNotification({ text: res.message, type: res.success ? 'success' : 'error' });
    setTimeout(() => setNotification(null), 4000);
  };

  const facilitiesList: {
    key: keyof ClubFacilities;
    title: string;
    desc: string;
    level: number;
    cost: number;
    icon: React.ComponentType<{ className?: string }>;
    benefit: string;
  }[] = [
    {
      key: 'stadiumLevel',
      title: 'استاد النادي والمدرجات',
      desc: facilities.stadiumName || 'استاد النادي',
      level: facilities.stadiumLevel || 1,
      cost: (facilities.stadiumLevel || 1) * 30000 + 20000,
      icon: Building2,
      benefit: `السعة الحالية: ${facilities.stadiumCapacity || 5000} متفرج (+600 متفرج مع كل ترقية)`,
    },
    {
      key: 'medicalCenterLevel',
      title: 'المركز الطبي والتأهيل',
      desc: 'عيادة علاج طبيعي واستشفاء لعضلات اللاعبين',
      level: facilities.medicalCenterLevel || 1,
      cost: (facilities.medicalCenterLevel || 1) * 25000 + 15000,
      icon: HeartPulse,
      benefit: 'تسريع استعادة اللياقة والجاهزية بعد المباريات وتقليل الإصابات',
    },
    {
      key: 'trainingGroundLevel',
      title: 'ملاعب ومنشآت التدريب',
      desc: 'أرضيات نجيل طبيعي ومعدات لياقة بدنية',
      level: facilities.trainingGroundLevel || 1,
      cost: (facilities.trainingGroundLevel || 1) * 25000 + 15000,
      icon: Dumbbell,
      benefit: 'زيادة معدل تطور اللاعبين والارتقاء بطاقاتهم المحتملة',
    },
    {
      key: 'youthAcademyLevel',
      title: 'أكاديمية قطاع الناشئين',
      desc: 'اكتشاف وتفريخ المواهب المصرية الصاعدة',
      level: facilities.youthAcademyLevel || 1,
      cost: (facilities.youthAcademyLevel || 1) * 25000 + 20000,
      icon: GraduationCap,
      benefit: 'تصعيد حتى 3 مواهب واعدة بالموسم بنصف قيمتها السوقية فقط',
    },
    {
      key: 'scoutingNetworkLevel',
      title: 'شبكة الكشافة والتنقيب',
      desc: 'محللو أداء وكشافة في محافظات مصر',
      level: facilities.scoutingNetworkLevel || 1,
      cost: (facilities.scoutingNetworkLevel || 1) * 18000 + 12000,
      icon: Binoculars,
      benefit: 'كشف صفقات ممتازة ومواهب مغمورة في سوق الانتقالات',
    },
  ];

  return (
    <div className="space-y-4 pb-20 animate-fade-in" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-bold text-base text-white">إدارة النادي والمنشآت والمالية</h2>
              <span className="text-[11px] text-slate-400">{userClub.name} • {userClub.city}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDailyRewardModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer text-xs font-bold border ${
                canClaimDailyReward
                  ? 'bg-gradient-to-r from-emerald-500/25 via-amber-500/25 to-emerald-500/25 hover:from-emerald-500/35 hover:to-amber-500/35 border-emerald-400 text-emerald-200 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700/80 text-slate-300'
              }`}
              title="مكافأة تسجيل الدخول اليومي"
            >
              <Gift className={`w-4 h-4 ${canClaimDailyReward ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>مكافأة يومية {canClaimDailyReward ? '⚡' : `(يوم ${dailyRewardState.streak || 0})`}</span>
            </button>

            <button
              onClick={() => setShowPromoModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 hover:from-amber-500/30 hover:to-amber-500/40 border border-amber-500/50 px-3 py-1.5 rounded-xl text-amber-200 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer text-xs font-bold"
              title="استرداد كود هدية للحصول على أموال فورية للنادي"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span>كود هدية 🎁</span>
            </button>

            <div className="bg-emerald-950/80 border border-emerald-700/60 px-3 py-1.5 rounded-xl text-left">
              <span className="text-[10px] text-emerald-300 block">الرصيد المالي النادي</span>
              <span className="font-black text-xs text-emerald-400 font-mono">
                {(userClub.budget || 0).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>

        {/* Financial Flow Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">تذاكر المباريات (تقديري)</span>
            <span className="font-black text-cyan-400 font-mono text-sm">
              +{(estimatedTicketMonthly || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">رواتب اللاعبين الحالية</span>
            <span className="font-black text-red-400 font-mono text-sm">
              -{(totalMonthlyWages || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">سقف الرواتب المتاح</span>
            <span className={`font-black font-mono text-sm ${remainingWageBudget > 0 ? 'text-amber-400' : 'text-red-400'}`}>
              {(remainingWageBudget || 0).toLocaleString()} ج.م
            </span>
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">صافي التدفق الشهري</span>
            <span className={`font-black font-mono text-sm ${netMonthlyIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {netMonthlyIncome >= 0 ? `+${(netMonthlyIncome || 0).toLocaleString()}` : (netMonthlyIncome || 0).toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>

      {notification && (
        <div className={`p-3 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-red-950 text-red-300 border border-red-700'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 💼 MANAGER PERSONAL WEALTH DONATION TO CLUB (دعم النادي من المحفظة الشخصية للمدرب) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 rounded-3xl p-4 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>دعم ميزانية النادي من أموالك الخاصة 🤝</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.2 rounded-full font-normal">
                  ذمة المدرب الشخصية
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                يمكنك التبرع بمبلغ من مدخراتك وراتبك الشخصي لدعم خزينة ناديك ورفع ثقة الإدارة ومحبة الجماهير
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-amber-500/30 px-3 py-1.5 rounded-xl text-left">
            <span className="text-[10px] text-slate-400 block">رصيد محفظتك الخاصة</span>
            <span className="font-black text-xs text-amber-400 font-mono">
              {(manager.personalWallet || 0).toLocaleString()} ج.م
            </span>
          </div>
        </div>

        <div className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-slate-300 font-semibold">اختر قيمة التبرع من مدخراتك:</span>
            <div className="flex flex-wrap gap-1.5">
              {[10000, 25000, 50000, 100000, 250000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPersonalDonationAmount(val)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    personalDonationAmount === val
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {(val / 1000)}k ج.م
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={5000}
              step={5000}
              value={personalDonationAmount}
              onChange={e => setPersonalDonationAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
              onBlur={() => {
                if (personalDonationAmount === '' || Number(personalDonationAmount) <= 0) setPersonalDonationAmount(10000);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              placeholder="المبلغ بالجنيه..."
            />
            <button
              onClick={handleDonatePersonal}
              disabled={(manager.personalWallet || 0) < numPersonalDonation || numPersonalDonation <= 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-md ${
                (manager.personalWallet || 0) >= numPersonalDonation && numPersonalDonation > 0
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>ضخ المبلغ في الخزينة</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
            <span>⚡ الأثر: +{numPersonalDonation.toLocaleString()} ج.م لخزينة النادي</span>
            <span className="text-emerald-400 font-semibold">+15% ثقة مجلس الإدارة • +2 ⭐ سمعة للمدرب</span>
          </div>
        </div>
      </div>

      {/* 🎟️ MATCHDAY TICKET PRICING & STADIUM CAPACITY (إدارة أسعار تذاكر المباريات والاستاد) */}
      {(() => {
        const currentCap = userClub.facilities?.stadiumCapacity || 5000;
        const benchmark = getBenchmarkTicketPrice(activeLeague?.tier || 1);
        const ratio = ticketPriceInput / benchmark;
        // Elasticity simulation
        let expectedAttendancePct = 80;
        if (ratio <= 0.8) expectedAttendancePct = 95;
        else if (ratio <= 1.0) expectedAttendancePct = 85;
        else if (ratio <= 1.2) expectedAttendancePct = 72;
        else if (ratio <= 1.5) expectedAttendancePct = 55;
        else if (ratio <= 2.0) expectedAttendancePct = 38;
        else expectedAttendancePct = 20;

        const estCrowd = Math.round(currentCap * (expectedAttendancePct / 100));
        const estGateRev = estCrowd * ticketPriceInput;

        const handleSaveTicketPrice = () => {
          const res = setClubTicketPrice(ticketPriceInput);
          setNotification({
            text: res.message,
            type: res.success ? 'success' : 'error',
          });
          setTimeout(() => setNotification(null), 4000);
        };

        return (
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>تسعير تذاكر المباريات والاستاد 🎟️</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded-full font-normal">
                      مباريات داخل الأرض
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    حدد سعر التذكرة لجماهير النادي. السعر المنخفض يزيد الحضور والامتلاء، بينما السعر المرتفع يعظم دخل المقعد الواحد لكنه يقلل عدد المشجعين
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-left">
                <span className="text-[10px] text-slate-400 block">سعة الاستاد الحالية</span>
                <span className="font-black text-xs text-emerald-400 font-mono">
                  {currentCap.toLocaleString()} مقعد (مستوى {userClub.facilities?.stadiumLevel || 1})
                </span>
              </div>
            </div>

            {/* Pricing Controls & Presets */}
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold">سعر التذكرة المختار:</span>
                  <span className="text-base font-black text-amber-400 font-mono">{ticketPriceInput} ج.م</span>
                  <span className="text-[10px] text-slate-500">(سعر المعيار لدوريك: {benchmark} ج.م)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">خيارات سريعة:</span>
                  {[10, 15, 20, 25, 35, 50, 75].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTicketPriceInput(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                        ticketPriceInput === preset
                          ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider / Range */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>5 ج.م (تذاكر شعبية مخفضة)</span>
                  <span>100 ج.م (تذاكر VIP ومباريات كبرى)</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={1}
                  value={ticketPriceInput}
                  onChange={(e) => setTicketPriceInput(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Live Impact Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">الحضور المتوقع</span>
                  <span className="text-xs font-black text-white">
                    ~{estCrowd.toLocaleString()} مشجع ({expectedAttendancePct}%)
                  </span>
                </div>

                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">تأثير السعر على الجمهور</span>
                  <span className={`text-xs font-black font-sans ${ratio <= 1 ? 'text-emerald-400' : ratio <= 1.4 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {ratio <= 0.8 ? '🔥 إقبال جماهيري قياسي' : ratio <= 1 ? '✅ إقبال طبيعي ومثالي' : ratio <= 1.4 ? '⚠️ عزوف جزئي لارتفاع السعر' : '❌ مقاطعة وعزوف كبير'}
                  </span>
                </div>

                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-sans">إيراد التذاكر المتوقع بالمباراة</span>
                  <span className="text-xs font-black text-emerald-400">
                    +{estGateRev.toLocaleString()} ج.م
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400">
                  💡 تلميح: تطوير مدرجات الاستاد يزيد السعة الجماهيرية وتضاعف إيراداتك في كل جولة تلعبها على أرضك.
                </span>
                <button
                  id="btn_save_ticket_price"
                  type="button"
                  onClick={handleSaveTicketPrice}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>اعتماد سعر التذكرة</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Budget Adjustment / Transfer to Wage Budget Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span>تحويل الميزانية وتعديل سقف الرواتب ⚖️</span>
          </h3>
          <span className="text-[11px] text-amber-300 font-mono bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
            دعم الرواتب الحالي: +{currentWageBonus.toLocaleString()} ج.م/ش
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          يمكنك تحويل جزء من سيولة النادي النقدية لزيادة سقف الرواتب الشهرية لإبرام صفقات مع نجوم برواتب أعلى (كل 12,000 ج.م سيولة نقدية تضيف 1,000 ج.م شهرياً لسقف الرواتب)، أو استعادة الفائض للميزانية النقدية.
        </p>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setTransferMode('cash_to_wage')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              transferMode === 'cash_to_wage'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>تحويل ميزانية النادي ⬅️ إلى الرواتب</span>
          </button>
          <button
            onClick={() => setTransferMode('wage_to_cash')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              transferMode === 'wage_to_cash'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>تحويل فائض الرواتب ⬅️ إلى ميزانية النادي</span>
          </button>
        </div>

        {/* Transfer Form based on Mode */}
        {transferMode === 'cash_to_wage' ? (
          <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>المبلغ المراد تحويله من ميزانية النادي النقدية:</span>
                <span className="text-slate-400 font-normal">المتاح: {userClub.budget.toLocaleString()} ج.م</span>
              </label>
              <input
                type="number"
                min={1200}
                step={6000}
                value={cashAmountToTransfer}
                onChange={e => setCashAmountToTransfer(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                onBlur={() => {
                  if (cashAmountToTransfer === '' || Number(cashAmountToTransfer) <= 0) setCashAmountToTransfer(24000);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {[24000, 60000, 120000, 240000, 600000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setCashAmountToTransfer(val)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    cashAmountToTransfer === val
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {val.toLocaleString()} ج.م
                </button>
              ))}
            </div>

            <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300">الزيادة الناتجة في سقف الرواتب الشهري:</span>
              <strong className="text-emerald-400 font-mono text-sm">
                +{Math.round(numCashAmount / 12).toLocaleString()} ج.م/شهرياً
              </strong>
            </div>

            <button
              onClick={handleTransferBudgetToWage}
              disabled={userClub.budget < numCashAmount || numCashAmount <= 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span>
                {userClub.budget < numCashAmount
                  ? 'الميزانية النقدية الحالية لا تكفي'
                  : `تأكيد تحويل ${numCashAmount.toLocaleString()} ج.م إلى سقف الرواتب`}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>المبلغ الشهري المراد إعادته من سقف الرواتب:</span>
                <span className="text-slate-400 font-normal">الفائض المخصص الحالي: {currentWageBonus.toLocaleString()} ج.م/ش</span>
              </label>
              <input
                type="number"
                min={100}
                step={500}
                value={wageAmountToTransfer}
                onChange={e => setWageAmountToTransfer(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                onBlur={() => {
                  if (wageAmountToTransfer === '' || Number(wageAmountToTransfer) <= 0) setWageAmountToTransfer(5000);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-cyan-400 font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {[2000, 5000, 10000, 20000, 50000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWageAmountToTransfer(val)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    wageAmountToTransfer === val
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {val.toLocaleString()} ج.م/ش
                </button>
              ))}
            </div>

            <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/60 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300">السيولة النقدية المستردة لميزانية النادي:</span>
              <strong className="text-cyan-400 font-mono text-sm">
                +{(numWageAmount * 12).toLocaleString()} ج.م
              </strong>
            </div>

            <button
              onClick={handleTransferWageToCash}
              disabled={currentWageBonus < numWageAmount || numWageAmount <= 0}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>
                {currentWageBonus < numWageAmount
                  ? 'فائض سقف الرواتب المخصص أقل من هذا المبلغ'
                  : `تأكيد استرداد ${(numWageAmount * 12).toLocaleString()} ج.م للميزانية النقدية`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Medical Center & Hospital Card */}
      {(() => {
        const injuredCount = squadPlayers.filter(p => p.isInjured || (p.injury && p.injury.daysRemaining > 0)).length;
        return (
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg">
                  <Stethoscope className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-white">مستشفى النادي والمركز الطبي الرياضي 🏥</h3>
                    <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      مستوى {facilities.medicalCenterLevel || 1} / 5
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    علاج وتأهيل اللاعبين المصابين فوراً ببرامج العلاج الطبيعي أو استشارة أخصائي الطب الرياضي أو الحقن بالبلازما (PRP) لتسريع عودتهم للملاعب.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {injuredCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-300 bg-red-950/80 border border-red-700/60 px-2.5 py-1 rounded-xl">
                        <Bandage className="w-3.5 h-3.5 text-red-400" />
                        يوجد {injuredCount} لاعب مصاب في الفريق يحتاج للرعاية
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        لا توجد إصابات حالياً في الفريق، جميع اللاعبين جاهزون
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => setIsMedicalModalOpen(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm py-3 px-5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>دخول مستشفى النادي وإدارة العلاج</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Youth Academy & Wonderkids Spotlight Card */}
      {(() => {
        const prospectsCount = Array.isArray(userClub.youthAcademyProspects) ? userClub.youthAcademyProspects.length : 0;
        const highestPotential = Array.isArray(userClub.youthAcademyProspects) && userClub.youthAcademyProspects.length > 0
          ? Math.max(...userClub.youthAcademyProspects.map(p => p.potentialRating))
          : 0;

        return (
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg">
                  <GraduationCap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-white">أكاديمية قطاع الناشئين والمواهب الصاعدة 🌟</h3>
                    <span className="text-xs bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full font-bold">
                      مستوى {facilities.youthAcademyLevel || 1} / 5
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    تفريخ وتطوير جواهر المستقبل، وتصعيد المواهب للفريق الأول مجاناً أو استثمار بيع عقودهم لزيادة ميزانية النادي.
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2.5 py-1 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      {prospectsCount} مواهب شابة مسجلة حالياً
                    </span>
                    {highestPotential > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 rounded-xl">
                        أعلى إمكانية محتملة: {highestPotential} ⭐
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <button
                  id="btn_open_youth_academy"
                  onClick={() => setIsYouthAcademyModalOpen(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm py-3 px-5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-amber-400/40"
                >
                  <GraduationCap className="w-4 h-4 text-slate-950" />
                  <span>دخول أكاديمية الناشئين والمواهب</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Board Objectives & Confidence Card */}
      {boardSystem && userClub && (
        (() => {
          const userRank = (userClub?.id ? (standings || []).findIndex(s => s && s.teamId === userClub.id) + 1 : 1) || 1;
          const targetRank = boardSystem.targetLeaguePosition || 1;
          const rankMargin = targetRank - userRank;
          const isAhead = rankMargin >= 0;

          return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white flex items-center gap-2">
                      <span>أهداف مجلس الإدارة وخطة الموسم 🎯</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      الهدف المحدد: <strong className="text-amber-300 font-bold">{boardSystem.targetLeaguePositionText || `المركز ${targetRank}`}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">المركز الحالي:</span>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                    isAhead ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}>
                    المركز #{userRank} ({isAhead ? `+${rankMargin} متفوق ✅` : `${rankMargin} متأخر ⚠️`})
                  </span>
                </div>
              </div>

              {/* Objectives List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(boardSystem.objectives || []).map(obj => (
                  <div
                    key={obj.id}
                    className="bg-slate-950/70 border border-slate-800/90 p-3 rounded-2xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${obj.isAchieved ? 'text-emerald-400' : 'text-slate-500'}`} />
                        {obj.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        obj.importance === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        obj.importance === 'high' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {obj.importance === 'critical' ? 'حاسم' : obj.importance === 'high' ? 'مرتفع' : 'متوسط'}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{obj.targetDescription}</p>
                    <div className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg">
                      الحالة: <strong className="text-slate-200">{obj.currentProgress}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* Facilities Upgrade Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span>تطوير وترقية المنشآت الرياضية</span>
        </h3>

        <div className="space-y-3">
          {facilitiesList.map(item => {
            const Icon = item.icon;
            const isMax = item.level >= 5;

            return (
              <div
                key={item.key}
                className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{item.title}</h4>
                      <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full font-bold">
                        مستوى {item.level} / 5
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    <p className="text-[11px] text-emerald-400 font-medium mt-1">✨ {item.benefit}</p>
                  </div>
                </div>

                <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <button
                    onClick={() => handleUpgrade(item.key, item.title, item.cost)}
                    disabled={isMax || userClub.budget < item.cost}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {isMax ? (
                      <span>وصل الحد الأقصى</span>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>ترقية ({item.cost.toLocaleString()} ج.م)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Hospital / Medical Center Modal */}
      <MedicalCenterModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
      />

      {/* Youth Academy Modal */}
      <YouthAcademyModal
        isOpen={isYouthAcademyModalOpen}
        onClose={() => setIsYouthAcademyModalOpen(false)}
      />

      {/* Promo & Gift Code Redemption Modal */}
      <PromoCodeRedeemModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
      />

    </div>
  );
};
