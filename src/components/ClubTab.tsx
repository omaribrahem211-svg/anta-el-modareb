import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { ClubFacilities } from '../types/game';
import { calculateClubMonthlyIncome, calculateClubTotalMonthlyWages } from '../services/economyService';
import { getBenchmarkTicketPrice } from '../utils/matchRevenue';
import { MedicalCenterModal } from './MedicalCenterModal';
import { YouthAcademyModal } from './YouthAcademyModal';
import { PromoCodeRedeemModal } from './PromoCodeRedeemModal';
import { ClubBadge } from './ClubBadge';
import { ClubArena3DShowcase, Facility3DModel } from './models/Football3DModels';
import { Hero, StatTile, SegTabs, Panel, LevelPips, Toast, useToast, fmt, fmtShort } from './common/ProUI';
import {
  Building2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  ArrowUpRight,
  HeartPulse,
  Dumbbell,
  GraduationCap,
  Binoculars,
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
  LayoutDashboard,
  Landmark,
} from 'lucide-react';

type SubTab = 'overview' | 'facilities' | 'finance';

const parseAmount = (v: number | string): number => (typeof v === 'number' ? v : Number(v) || 0);

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

  const { toast, show } = useToast(4000);
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isYouthAcademyModalOpen, setIsYouthAcademyModalOpen] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [ticketPriceInput, setTicketPriceInput] = useState<number>(userClub?.facilities?.ticketPrice || 20);
  const [transferMode, setTransferMode] = useState<'cash_to_wage' | 'wage_to_cash'>('cash_to_wage');
  const [cashAmount, setCashAmount] = useState<number | string>(60000);
  const [wageAmount, setWageAmount] = useState<number | string>(5000);
  const [donation, setDonation] = useState<number | string>(50000);

  useEffect(() => {
    if (userClub?.facilities?.ticketPrice) setTicketPriceInput(userClub.facilities.ticketPrice);
  }, [userClub?.facilities?.ticketPrice]);

  if (!userClub || manager.isUnemployed) {
    return (
      <div className="space-y-4 pb-20 animate-fade-in text-center py-16 px-4" dir="rtl">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl mx-auto border border-amber-500/40 shadow-xl">🏟️</div>
        <h2 className="text-lg font-black text-white mt-4">أنت حالياً مدرب حر (بدون نادٍ)</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mt-1">
          لا توجد منشآت أو ميزانية نادٍ لإدارتها حالياً. تعاقد مع أحد الأندية في تبويب المسيرة لبدء تطوير ملعبه ومرافقه!
        </p>
      </div>
    );
  }

  const budget = userClub.budget || 0;
  const squad = Array.isArray(userClub.players) ? userClub.players : [];
  const facilities: ClubFacilities = userClub.facilities || {
    stadiumCapacity: 5000, stadiumLevel: 1, stadiumName: 'استاد النادي',
    medicalCenterLevel: 1, trainingGroundLevel: 1, youthAcademyLevel: 1, scoutingNetworkLevel: 1,
  };

  const wages = calculateClubTotalMonthlyWages(userClub);
  const income = calculateClubMonthlyIncome(userClub);
  const maintenance = (facilities.stadiumLevel || 1) * 3000 + (facilities.medicalCenterLevel || 1) * 2000;
  const net = income - (wages + maintenance);
  const wageRoom = Math.max(0, income - wages);
  const wageBonus = userClub.wageBudgetMonthly || 0;
  const capacity = facilities.stadiumCapacity || 5000;
  const injured = squad.filter(p => p.isInjured || (p.injury && p.injury.daysRemaining > 0)).length;
  const prospects = Array.isArray(userClub.youthAcademyProspects) ? userClub.youthAcademyProspects : [];
  const bestProspect = prospects.length ? Math.max(...prospects.map(p => p.potentialRating || 0)) : 0;

  // ---- Ticket pricing model ----
  const benchmark = getBenchmarkTicketPrice(activeLeague?.tier || 1);
  const ratio = benchmark > 0 ? ticketPriceInput / benchmark : 1;
  const attendancePct = ratio <= 0.8 ? 95 : ratio <= 1 ? 85 : ratio <= 1.2 ? 72 : ratio <= 1.5 ? 55 : ratio <= 2 ? 38 : 20;
  const estCrowd = Math.round(capacity * attendancePct / 100);
  const estGate = estCrowd * ticketPriceInput;
  const monthlyGate = estGate * 2; // ~2 home games / month

  const facilitiesList: {
    key: keyof ClubFacilities;
    title: string;
    desc: string;
    level: number;
    cost: number;
    benefit: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'stadiumLevel', title: 'الاستاد والمدرجات', desc: facilities.stadiumName || 'استاد النادي',
      level: facilities.stadiumLevel || 1, cost: (facilities.stadiumLevel || 1) * 30000 + 20000,
      benefit: `السعة ${fmt(capacity)} متفرج (+600 مع كل ترقية)`, icon: <Building2 className="w-4 h-4" />,
    },
    {
      key: 'medicalCenterLevel', title: 'المركز الطبي', desc: 'علاج طبيعي واستشفاء',
      level: facilities.medicalCenterLevel || 1, cost: (facilities.medicalCenterLevel || 1) * 25000 + 15000,
      benefit: 'استعادة أسرع للياقة وإصابات أقل', icon: <HeartPulse className="w-4 h-4" />,
    },
    {
      key: 'trainingGroundLevel', title: 'ملاعب التدريب', desc: 'نجيل طبيعي ومعدات لياقة',
      level: facilities.trainingGroundLevel || 1, cost: (facilities.trainingGroundLevel || 1) * 25000 + 15000,
      benefit: 'معدل تطور أعلى للاعبين', icon: <Dumbbell className="w-4 h-4" />,
    },
    {
      key: 'youthAcademyLevel', title: 'أكاديمية الناشئين', desc: 'اكتشاف وتفريخ المواهب',
      level: facilities.youthAcademyLevel || 1, cost: (facilities.youthAcademyLevel || 1) * 25000 + 20000,
      benefit: 'تصعيد حتى 3 مواهب بالموسم بنصف قيمتها', icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      key: 'scoutingNetworkLevel', title: 'شبكة الكشافة', desc: 'محللو أداء وكشافة',
      level: facilities.scoutingNetworkLevel || 1, cost: (facilities.scoutingNetworkLevel || 1) * 18000 + 12000,
      benefit: 'صفقات أفضل ومواهب مغمورة في السوق', icon: <Binoculars className="w-4 h-4" />,
    },
  ];

  const handleUpgrade = (key: keyof ClubFacilities, cost: number) => {
    const res = upgradeFacility(key, cost);
    show(res.message, res.success);
  };

  const handleCashToWage = () => {
    const amt = parseAmount(cashAmount);
    if (amt <= 0) return;
    const res = transferBudgetToWageBudget(amt);
    show(res.message, res.success);
  };

  const handleWageToCash = () => {
    const amt = parseAmount(wageAmount);
    if (amt <= 0) return;
    const res = transferWageToCashBudget(amt);
    show(res.message, res.success);
  };

  const handleDonate = () => {
    const amt = parseAmount(donation);
    if (amt <= 0) return;
    const res = donateToClubFromPersonalWallet(amt);
    show(res.message, res.success);
  };

  const handleSaveTicket = () => {
    const res = setClubTicketPrice(ticketPriceInput);
    show(res.message, res.success);
  };

  const tabs = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'facilities' as const, label: 'المنشآت', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'finance' as const, label: 'المالية', icon: <Landmark className="w-3.5 h-3.5" /> },
  ];

  const numCash = parseAmount(cashAmount);
  const numWage = parseAmount(wageAmount);
  const numDonation = parseAmount(donation);
  const wallet = manager.personalWallet || 0;

  const userRank = (standings || []).findIndex(s => s && s.teamId === userClub.id) + 1 || 1;
  const targetRank = boardSystem?.targetLeaguePosition || 1;
  const rankMargin = targetRank - userRank;

  return (
    <div className="space-y-3 pb-20 animate-fade-in" dir="rtl">
      <Toast toast={toast} />

      {/* HERO */}
      <Hero accent={userClub.primaryColor || '#10b981'}>
        <div className="flex items-center gap-3">
          <ClubBadge club={userClub} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="font-black text-lg text-white leading-tight truncate">{userClub.name}</h2>
            <div className="text-[11px] text-slate-400 truncate">{userClub.city} • {facilities.stadiumName || 'استاد النادي'}</div>
          </div>
          <div className="text-left shrink-0">
            <div className="text-[10px] text-slate-400">خزينة النادي</div>
            <div className="font-black font-mono text-xl text-emerald-300 leading-tight">{fmtShort(budget)}</div>
            <div className="text-[10px] text-slate-500 font-mono">{fmt(budget)} ج.م</div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShowDailyRewardModal(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black border cursor-pointer active:scale-95 ${
              canClaimDailyReward
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 animate-pulse'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>{canClaimDailyReward ? 'مكافأة يومية جاهزة' : `المكافأة اليومية (يوم ${dailyRewardState?.streak || 0})`}</span>
          </button>
          <button
            onClick={() => setShowPromoModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black border border-amber-500/40 bg-amber-500/10 text-amber-200 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>كود هدية</span>
          </button>
        </div>
      </Hero>

      <SegTabs tabs={tabs} value={subTab} onChange={setSubTab} tone="emerald" />

      {/* ============ OVERVIEW ============ */}
      {subTab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="دخل شهري" tone="emerald" icon={<TrendingUp className="w-3 h-3" />} value={`+${fmtShort(income)}`} sub="ج.م / شهر" />
            <StatTile label="رواتب اللاعبين" tone="rose" icon={<Users className="w-3 h-3" />} value={`-${fmtShort(wages)}`} sub="ج.م / شهر" />
            <StatTile label="سقف رواتب متاح" tone={wageRoom > 0 ? 'amber' : 'rose'} icon={<Scale className="w-3 h-3" />} value={fmtShort(wageRoom)} sub="ج.م / شهر" />
            <StatTile label="صافي التدفق" tone={net >= 0 ? 'emerald' : 'rose'} icon={net >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} value={`${net >= 0 ? '+' : '-'}${fmtShort(Math.abs(net))}`} sub={`صيانة ${fmtShort(maintenance)}`} />
          </div>

          <ClubArena3DShowcase
            clubName={userClub.name}
            stadiumName={facilities.stadiumName || 'استاد النادي'}
            stadiumCapacity={capacity}
            facilities={facilities}
            stadiumLevel={facilities.stadiumLevel || 1}
            primaryColor={userClub.primaryColor || '#10b981'}
          />

          {/* Medical */}
          <button
            onClick={() => setIsMedicalModalOpen(true)}
            className="w-full text-right bg-gradient-to-l from-emerald-500/10 to-slate-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm text-white">مستشفى النادي</div>
              <div className="mt-0.5">
                {injured > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-300"><Bandage className="w-3 h-3" /> {injured} لاعب مصاب يحتاج رعاية</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300"><CheckCircle2 className="w-3 h-3" /> لا إصابات — الجميع جاهز</span>
                )}
              </div>
            </div>
            <span className="text-[11px] font-black text-emerald-300 shrink-0">دخول ↗</span>
          </button>

          {/* Youth */}
          <button
            onClick={() => setIsYouthAcademyModalOpen(true)}
            className="w-full text-right bg-gradient-to-l from-amber-500/10 to-slate-900 border border-amber-500/40 rounded-2xl p-4 flex items-center gap-3 cursor-pointer active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-sm text-white">أكاديمية الناشئين</div>
              <div className="text-[11px] text-slate-400">
                {prospects.length} مواهب{bestProspect > 0 ? ` • أعلى سقف ${bestProspect} ⭐` : ''}
              </div>
            </div>
            <span className="text-[11px] font-black text-amber-300 shrink-0">دخول ↗</span>
          </button>

          {/* Board */}
          {boardSystem && (
            <Panel
              title="أهداف مجلس الإدارة"
              icon={<Target className="w-4 h-4" />}
              tone="violet"
              right={
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${
                  rankMargin >= 0 ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                }`}>
                  المركز #{userRank} • {rankMargin >= 0 ? 'ضمن الهدف' : `${Math.abs(rankMargin)} خلف الهدف`}
                </span>
              }
            >
              <div className="text-xs text-slate-300 mb-3">
                الهدف: <strong className="text-amber-300">{boardSystem.targetLeaguePositionText || `المركز ${targetRank}`}</strong>
              </div>
              <ul className="space-y-2">
                {(boardSystem.objectives || []).map(obj => (
                  <li key={obj.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-black text-white flex items-center gap-1.5 min-w-0">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${obj.isAchieved ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <span className="truncate">{obj.title}</span>
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 ${
                        obj.importance === 'critical' ? 'bg-rose-500/15 text-rose-300' : obj.importance === 'high' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {obj.importance === 'critical' ? 'حاسم' : obj.importance === 'high' ? 'مهم' : 'عادي'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{obj.targetDescription}</p>
                    <div className="text-[10px] text-slate-500 mt-1">الحالة: <span className="text-slate-200 font-bold">{obj.currentProgress}</span></div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {/* ============ FACILITIES ============ */}
      {subTab === 'facilities' && (
        <Panel title="ترقية المنشآت" icon={<TrendingUp className="w-4 h-4" />} tone="amber" right={<span className="text-[10px] text-slate-400 font-mono">الخزينة {fmtShort(budget)}</span>}>
          <ul className="space-y-3">
            {facilitiesList.map(item => {
              const maxed = item.level >= 5;
              const affordable = budget >= item.cost;
              return (
                <li key={item.key} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <Facility3DModel facilityKey={item.key as any} level={item.level} clubColor={userClub.primaryColor || '#10b981'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-white font-black text-sm">
                        <span className="text-amber-300">{item.icon}</span>
                        <span className="truncate">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{item.desc}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <LevelPips level={item.level} tone="amber" />
                        <span className="text-[10px] font-mono text-amber-300">{item.level}/5</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-300/90 mt-2">✨ {item.benefit}</div>
                  <button
                    onClick={() => handleUpgrade(item.key, item.cost)}
                    disabled={maxed || !affordable}
                    className={`mt-2.5 w-full py-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
                      maxed
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30 cursor-default'
                        : affordable
                        ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/10 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {maxed ? (
                      <span>المستوى الأقصى ★</span>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>{affordable ? `ترقية — ${fmt(item.cost)} ج.م` : `ينقصك ${fmt(item.cost - budget)} ج.م`}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {/* ============ FINANCE ============ */}
      {subTab === 'finance' && (
        <div className="space-y-3">
          {/* Ticket pricing */}
          <Panel title="تسعير التذاكر" icon={<Ticket className="w-4 h-4" />} tone="emerald" right={<span className="text-[10px] text-slate-400">سعة {fmt(capacity)}</span>}>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">سعر التذكرة</div>
                  <div className="font-black font-mono text-3xl text-amber-300 leading-none">{ticketPriceInput}<span className="text-xs text-slate-400 mr-1">ج.م</span></div>
                </div>
                <div className="text-[10px] text-slate-500 text-left">معيار دوريك<br /><span className="font-mono text-slate-300">{benchmark} ج.م</span></div>
              </div>

              <input
                type="range" min={5} max={100} step={1}
                value={ticketPriceInput}
                onChange={e => setTicketPriceInput(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
                aria-label="سعر التذكرة"
              />
              <div className="flex flex-wrap gap-1.5">
                {[10, 15, 20, 25, 35, 50, 75].map(v => (
                  <button
                    key={v}
                    onClick={() => setTicketPriceInput(v)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono cursor-pointer ${
                      ticketPriceInput === v ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <StatTile label="الحضور" tone="sky" value={`${attendancePct}%`} sub={`~${fmtShort(estCrowd)} مشجع`} />
                <StatTile label="إيراد المباراة" tone="emerald" value={`+${fmtShort(estGate)}`} sub="ج.م" />
                <StatTile label="تقدير الشهر" tone="amber" value={`+${fmtShort(monthlyGate)}`} sub="مباراتان" />
              </div>
              <div className={`text-[11px] font-bold text-center ${ratio <= 1 ? 'text-emerald-300' : ratio <= 1.4 ? 'text-amber-300' : 'text-rose-300'}`}>
                {ratio <= 0.8 ? '🔥 إقبال جماهيري قياسي' : ratio <= 1 ? '✅ إقبال طبيعي ومثالي' : ratio <= 1.4 ? '⚠️ عزوف جزئي بسبب السعر' : '❌ مقاطعة وعزوف كبير'}
              </div>

              <button
                onClick={handleSaveTicket}
                className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>اعتماد السعر</span>
              </button>
            </div>
          </Panel>

          {/* Budget <-> wages */}
          <Panel title="الميزانية وسقف الرواتب" icon={<Scale className="w-4 h-4" />} tone="sky" right={<span className="text-[10px] font-mono text-amber-300">دعم حالي +{fmt(wageBonus)}/ش</span>}>
            <div className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                حوّل جزءاً من سيولة النادي لرفع سقف الرواتب بنفس القيمة (1:1)، أو أعد الفائض إلى الخزينة.
              </p>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setTransferMode('cash_to_wage')}
                  className={`py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer ${transferMode === 'cash_to_wage' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  <Coins className="w-3.5 h-3.5" /> خزينة ← رواتب
                </button>
                <button
                  onClick={() => setTransferMode('wage_to_cash')}
                  className={`py-2 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer ${transferMode === 'wage_to_cash' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'}`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" /> رواتب ← خزينة
                </button>
              </div>

              {transferMode === 'cash_to_wage' ? (
                <>
                  <div className="flex justify-between text-[11px] text-slate-400"><span>المبلغ من الخزينة</span><span>المتاح {fmt(budget)}</span></div>
                  <input
                    type="number" min={500} step={5000} value={cashAmount}
                    onChange={e => setCashAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    onBlur={() => { if (parseAmount(cashAmount) <= 0) setCashAmount(24000); }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-300 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[24000, 60000, 120000, 240000, 600000].map(v => (
                      <button key={v} onClick={() => setCashAmount(v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${numCash === v ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{fmtShort(v)}</button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-300">الزيادة في سقف الرواتب</span>
                    <strong className="font-mono text-emerald-300">+{fmt(numCash)} ج.م/ش</strong>
                  </div>
                  <button
                    onClick={handleCashToWage}
                    disabled={budget < numCash || numCash <= 0}
                    className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-b from-emerald-400 to-emerald-600 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                  >
                    {budget < numCash ? 'الخزينة لا تكفي' : `تحويل ${fmt(numCash)} ج.م إلى سقف الرواتب`}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-[11px] text-slate-400"><span>المبلغ من سقف الرواتب</span><span>المخصص {fmt(wageBonus)}/ش</span></div>
                  <input
                    type="number" min={100} step={500} value={wageAmount}
                    onChange={e => setWageAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    onBlur={() => { if (parseAmount(wageAmount) <= 0) setWageAmount(5000); }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sky-300 font-mono font-bold text-sm focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[2000, 5000, 10000, 20000, 50000].map(v => (
                      <button key={v} onClick={() => setWageAmount(v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${numWage === v ? 'bg-sky-500/20 text-sky-300 border-sky-500/60' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{fmtShort(v)}</button>
                    ))}
                  </div>
                  <div className="flex justify-between items-center bg-sky-500/10 border border-sky-500/30 rounded-lg px-3 py-2 text-xs">
                    <span className="text-slate-300">السيولة المستردة للخزينة</span>
                    <strong className="font-mono text-sky-300">+{fmt(numWage)} ج.م</strong>
                  </div>
                  <button
                    onClick={handleWageToCash}
                    disabled={wageBonus < numWage || numWage <= 0}
                    className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-b from-sky-400 to-sky-600 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
                  >
                    {wageBonus < numWage ? 'الفائض المخصص أقل من المبلغ' : `استرداد ${fmt(numWage)} ج.م للخزينة`}
                  </button>
                </>
              )}
            </div>
          </Panel>

          {/* Personal donation */}
          <Panel title="دعم الخزينة من أموالك" icon={<PiggyBank className="w-4 h-4" />} tone="amber" right={<span className="text-[10px] font-mono text-amber-300">محفظتك {fmtShort(wallet)}</span>}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {[10000, 25000, 50000, 100000, 250000].map(v => (
                  <button key={v} onClick={() => setDonation(v)} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${numDonation === v ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>{fmtShort(v)}</button>
                ))}
              </div>
              <input
                type="number" min={5000} step={5000} value={donation}
                onChange={e => setDonation(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                onBlur={() => { if (parseAmount(donation) <= 0) setDonation(10000); }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-amber-300 font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                placeholder="المبلغ بالجنيه"
              />
              <div className="text-[11px] text-slate-400 flex justify-between gap-2">
                <span>+{fmt(numDonation)} ج.م للخزينة</span>
                <span className="text-emerald-300 font-bold">ثقة الإدارة ↑ • سمعتك ↑</span>
              </div>
              <button
                onClick={handleDonate}
                disabled={wallet < numDonation || numDonation <= 0}
                className="w-full py-2.5 rounded-lg text-xs font-black bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>{wallet < numDonation ? 'رصيد محفظتك لا يكفي' : 'ضخ المبلغ في الخزينة'}</span>
              </button>
            </div>
          </Panel>
        </div>
      )}

      <MedicalCenterModal isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} />
      <YouthAcademyModal isOpen={isYouthAcademyModalOpen} onClose={() => setIsYouthAcademyModalOpen(false)} />
      <PromoCodeRedeemModal isOpen={showPromoModal} onClose={() => setShowPromoModal(false)} />
    </div>
  );
};
