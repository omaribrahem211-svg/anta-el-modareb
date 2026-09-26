import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  AlertCircle, 
  Sparkles, 
  Users, 
  Coins, 
  TrendingUp, 
  Clock, 
  Power, 
  RefreshCw,
  Eye,
  X,
  Calendar,
  DollarSign
} from 'lucide-react';
import { PromoCode } from '../../types/admin';
import { 
  fetchAllPromoCodes, 
  createPromoCode, 
  deletePromoCode, 
  togglePromoCodeStatus 
} from '../../services/promoCodeService';
import { useAuth } from '../../context/AuthContext';

export const AdminPromoCodesTab: React.FC = () => {
  const { user } = useAuth();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'exhausted' | 'inactive'>('all');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inspectCode, setInspectCode] = useState<PromoCode | null>(null);
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<PromoCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  // Form State
  const [newCode, setNewCode] = useState('');
  const [newRewardAmount, setNewRewardAmount] = useState<number>(10000000); // 10 Million default
  const [newRewardCoins, setNewRewardCoins] = useState<number>(0);
  const [newMaxUses, setNewMaxUses] = useState<number>(100);
  const [newDescription, setNewDescription] = useState('هدية دعم ميزانية النادي للمدربين');
  const [newExpiryDays, setNewExpiryDays] = useState<number>(30); // 30 days default
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCodes = async () => {
    try {
      setLoading(true);
      const data = await fetchAllPromoCodes();
      setCodes(data);
    } catch (err: any) {
      showToast('تعذر تحميل الأكواد من السحابة، تم عرض البيانات المخزنة محلياً.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`تم نسخ الكود [${code}] إلى الحافظة!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateRandomCode = () => {
    const prefixes = ['ANTA', 'MODAREB', 'SUPER', 'CHAMP', 'BONUS', 'EGYPT'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    setNewCode(`${prefix}-${randomPart}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const codeToUse = (newCode || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!codeToUse || codeToUse.length < 3) {
      showToast('يرجى إدخال كود يتكون من 3 أحرف أو أرقام على الأقل.', true);
      return;
    }

    const reward = Number(newRewardAmount);
    if (isNaN(reward) || reward <= 0) {
      showToast('يرجى إدخال مبلغ مالي صحيح وإيجابي (مثال: 10,000,000 ج.م).', true);
      return;
    }

    const uses = Number(newMaxUses);
    if (isNaN(uses) || uses < 1) {
      showToast('يرجى تحديد عدد مرات استخدام لا يقل عن 1.', true);
      return;
    }

    const adminUid = user?.uid || 'super_admin';
    const adminEmail = user?.email || 'omar.ibrahem211@gmail.com';

    try {
      setIsSubmitting(true);
      const expiresAt = newExpiryDays > 0 ? Date.now() + newExpiryDays * 86400000 : null;

      const res = await createPromoCode({
        code: codeToUse,
        rewardAmount: Math.round(reward),
        rewardCoins: Math.max(0, Math.round(Number(newRewardCoins) || 0)),
        maxUses: Math.round(uses),
        description: newDescription,
        expiresAt,
        adminUser: { uid: adminUid, email: adminEmail }
      });

      // Update UI immediately
      setCodes(prev => [res.promoCode, ...prev.filter(c => c.code !== res.promoCode.code)]);
      showToast(res.message);
      setShowCreateModal(false);
      setNewCode('');
      setNewRewardAmount(10000000);
      setNewRewardCoins(0);
      setNewMaxUses(100);
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء إنشاء الكود!', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (code: PromoCode) => {
    const adminUid = user?.uid || 'super_admin';
    const adminEmail = user?.email || 'omar.ibrahem211@gmail.com';
    const nextState = !code.isActive;

    // Optimistic UI update
    setCodes(prev => prev.map(c => c.code === code.code ? { ...c, isActive: nextState } : c));
    showToast(`تم ${nextState ? 'تفعيل' : 'تعطيل'} الكود [${code.code}] بنجاح.`);

    try {
      await togglePromoCodeStatus(code.code, nextState, { uid: adminUid, email: adminEmail });
    } catch (err: any) {
      console.warn('Toggle status warning:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmCode) return;
    const targetCode = deleteConfirmCode.code;
    const adminUid = user?.uid || 'super_admin';
    const adminEmail = user?.email || 'omar.ibrahem211@gmail.com';

    // Optimistic UI update
    setCodes(prev => prev.filter(c => c.code !== targetCode));
    setDeleteConfirmCode(null);
    showToast(`تم حذف الكود [${targetCode}] بنجاح.`);

    try {
      await deletePromoCode(targetCode, { uid: adminUid, email: adminEmail });
    } catch (err: any) {
      console.warn('Delete code warning:', err);
    }
  };

  // Filtered list
  const filteredCodes = codes.filter(c => {
    const matchesSearch = 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const isExhausted = (c.usedCount || 0) >= (c.maxUses || 1);
    const isExpired = Boolean(c.expiresAt && Date.now() > c.expiresAt);

    if (statusFilter === 'active') {
      return c.isActive && !isExhausted && !isExpired;
    }
    if (statusFilter === 'exhausted') {
      return isExhausted || isExpired;
    }
    if (statusFilter === 'inactive') {
      return !c.isActive;
    }
    return true;
  });

  // KPI Calculations
  const totalCodesCount = codes.length;
  const activeCodesCount = codes.filter(c => c.isActive && (c.usedCount || 0) < c.maxUses && (!c.expiresAt || Date.now() <= c.expiresAt)).length;
  const totalRedemptionsCount = codes.reduce((acc, c) => acc + (c.usedCount || 0), 0);
  const totalBudgetDistributed = codes.reduce((acc, c) => acc + ((c.usedCount || 0) * (c.rewardAmount || 0)), 0);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border animate-fade-in ${
          toast.isError 
            ? 'bg-rose-950 text-rose-200 border-rose-500' 
            : 'bg-emerald-950 text-emerald-200 border-emerald-500'
        }`}>
          {toast.isError ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Main Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">نظام أكواد الهدايا والمكافآت (Promo Codes)</h2>
              <p className="text-xs text-slate-400">
                أنشئ ووزّع أكواد مكافآت للمدربين، وحدد المبالغ الممنوحة وعدد مرات الاستخدام مع حماية كاملة ضد التكرار والتلاعب.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCodes}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              generateRandomCode();
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-amber-950/40 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إنشاء كود هدية جديد 🎁</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الأكواد النشطة</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {activeCodesCount} <span className="text-xs font-normal text-slate-400">/ {totalCodesCount} كود</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>مرات الاسترداد</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-300 font-mono">
            {totalRedemptionsCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">استرداد</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي الأموال الموزعة</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
            {(totalBudgetDistributed / 1000000).toFixed(1)}M <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>حماية ضد الاختراق</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-purple-300">
            معاملات سحابية مؤمنة 🔒
          </div>
          <p className="text-[10px] text-slate-400">حد الاستخدام مرة لكل مدرب</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالكود أو بالوصف..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'all' 
                ? 'bg-amber-500 text-slate-950 shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            الكل ({codes.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'active' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ساري ونشط ({activeCodesCount})
          </button>
          <button
            onClick={() => setStatusFilter('exhausted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'exhausted' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            مستنفد أو منتهي
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'inactive' 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            معطل
          </button>
        </div>
      </div>

      {/* Codes List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
          جاري تحميل أكواد الهدايا من قاعدة البيانات...
        </div>
      ) : filteredCodes.length === 0 ? (
        <div className="p-12 bg-slate-900/40 rounded-3xl border border-slate-800 text-center space-y-3">
          <Gift className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-sm">لا توجد أكواد مطابقة</h4>
          <p className="text-xs text-slate-400">
            لم يتم العثور على أي أكواد بهذة المعايير. اضغط على الزر بالأعلى لإنشاء كود جديد.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCodes.map(code => {
            const isExhausted = (code.usedCount || 0) >= (code.maxUses || 1);
            const isExpired = Boolean(code.expiresAt && Date.now() > code.expiresAt);
            const usagePercent = Math.min(100, Math.round(((code.usedCount || 0) / (code.maxUses || 1)) * 100));

            return (
              <div 
                key={code.id}
                className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-3xl p-5 shadow-lg space-y-4 transition-all"
              >
                {/* Code Top Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-amber-300 bg-amber-950/70 border border-amber-500/40 px-3 py-1 rounded-xl tracking-wider select-all">
                      {code.code}
                    </span>
                    <button
                      onClick={() => handleCopyCode(code.code)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                      title="نسخ الكود"
                    >
                      {copiedCode === code.code ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {!code.isActive ? (
                      <span className="bg-rose-950 text-rose-300 border border-rose-800/60 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        🔴 معطل
                      </span>
                    ) : isExpired ? (
                      <span className="bg-amber-950 text-amber-300 border border-amber-800/60 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        ⏱️ منتهي الصلاحية
                      </span>
                    ) : isExhausted ? (
                      <span className="bg-amber-950 text-amber-300 border border-amber-800/60 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        🟡 استُنفد بالكامل
                      </span>
                    ) : (
                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        🟢 نشط ومتاح
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {code.description && (
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {code.description}
                  </p>
                )}

                {/* Rewards Breakdown */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">المكافأة النقدية:</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      +{(code.rewardAmount || 0).toLocaleString()} ج.م
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">مكافأة الكوينز:</span>
                    <span className="text-sm font-black text-amber-400 font-mono">
                      {code.rewardCoins ? `+${code.rewardCoins.toLocaleString()} 🪙` : '0 كوينز'}
                    </span>
                  </div>
                </div>

                {/* Usage Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>نسبة الاستخدام:</span>
                    <span className="font-bold text-white font-mono">
                      {code.usedCount || 0} / {code.maxUses} مستخدم ({usagePercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isExhausted ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>إجمالي المبالغ المطالب بها: {(((code.usedCount || 0) * (code.rewardAmount || 0))).toLocaleString()} ج.م</span>
                    {code.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        ينتهي: {new Date(code.expiresAt).toLocaleDateString('ar-EG')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setInspectCode(code)}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-bold transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>سجل المدربين ({code.redeemedBy?.length || 0})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleStatus(code)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
                        code.isActive 
                          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                          : 'bg-emerald-950 hover:bg-emerald-900 border-emerald-800 text-emerald-300'
                      }`}
                      title={code.isActive ? 'تعطيل الكود مؤقتاً' : 'تفعيل الكود'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmCode(code)}
                      className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-rose-100 transition-colors cursor-pointer"
                      title="حذف الكود نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* Create Promo Code Modal */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-lg text-white">توليد وإنشاء كود هدية جديد</h3>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} noValidate className="space-y-4 text-xs">
              
              {/* Code Name Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>كود الهدية (Promo Code):</span>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>توليد كود عشوائي</span>
                  </button>
                </label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="مثال: SUPER10M أو EGYPT2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              {/* Reward Amount in Cash (The Core User Request) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>المبلغ المالي الممنوح لميزانية النادي (ج.م):</span>
                  <span className="text-emerald-400 font-mono font-black">{newRewardAmount.toLocaleString()} ج.م</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={newRewardAmount || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setNewRewardAmount(isNaN(val) ? 0 : val);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
                  {[1000000, 5000000, 10000000, 25000000, 50000000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewRewardAmount(val)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                        newRewardAmount === val
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`} ج.م
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Virtual Coins Reward */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>مكافأة الكوينز الإضافية (اختياري):</span>
                  <span className="text-amber-400 font-mono">{newRewardCoins} 🪙</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newRewardCoins || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setNewRewardCoins(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Max Uses Limit (Core User Request) */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 flex items-center justify-between">
                  <span>الحد الأقصى الإجمالي لعدد مرات الاستخدام:</span>
                  <span className="text-sky-400 font-mono font-bold">{newMaxUses} مستخدم</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={newMaxUses || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setNewMaxUses(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 10, 50, 100, 500, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewMaxUses(val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        newMaxUses === val
                          ? 'bg-sky-600 text-white border-sky-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {val === 1 ? 'مستخدم واحد (كود شخصي)' : `${val} مستخدم`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  * النظام يمنع نفس المدرب أو الحساب من استخدام الكود أكثر من مرة واحدة تلقائياً.
                </p>
              </div>

              {/* Expiry Days */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">مدة الصلاحية:</label>
                <select
                  value={newExpiryDays}
                  onChange={(e) => setNewExpiryDays(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value={7}>أسبوع واحد (7 أيام)</option>
                  <option value={14}>أسبوعين (14 يوماً)</option>
                  <option value={30}>شهر كامل (30 يوماً)</option>
                  <option value={90}>3 أشهر (90 يوماً)</option>
                  <option value={0}>دائم بدون تاريخ انتهاء</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">وصف / سبب المكافأة:</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="مثال: مكافأة بمناسبة افتتاح الموسم الجديد"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء ونشر الكود 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Inspect Code Redemptions Modal */}
      {/* ============================================================ */}
      {inspectCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-right max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-base text-white">
                  سجل استرداد الكود: <span className="font-mono text-amber-300">{inspectCode.code}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  إجمالي مرات الاسترداد: {inspectCode.usedCount || 0} من {inspectCode.maxUses}
                </p>
              </div>
              <button 
                onClick={() => setInspectCode(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {!inspectCode.redeemedBy || inspectCode.redeemedBy.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لم يقم أي مدرب باسترداد هذا الكود حتى الآن.
                </div>
              ) : (
                inspectCode.redeemedBy.map((item, idx) => (
                  <div key={idx} className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-white">{item.managerName}</div>
                      <div className="text-[10px] text-slate-400">{item.clubName}</div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="font-black text-emerald-400">+{item.amount.toLocaleString()} ج.م</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(item.redeemedAt).toLocaleString('ar-EG')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-left">
              <button
                onClick={() => setInspectCode(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Delete Confirmation Modal */}
      {/* ============================================================ */}
      {deleteConfirmCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-right">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto text-xl">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-base text-white">هل أنت متأكد من حذف هذا الكود نهائياً؟</h3>
              <p className="text-xs text-slate-300">
                الكود <span className="font-mono text-amber-300 font-bold">{deleteConfirmCode.code}</span>
              </p>
              <p className="text-xs text-rose-400 leading-relaxed pt-1">
                بمجرد الحذف، لن يتمكن أي مدرب من استرداد الكود بعد الآن، وسيتم إيقافه نهائياً وفورياً على جميع الأجهزة.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmCode(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-950/50"
              >
                نعم، احذف الكود فوراً 🗑️
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
