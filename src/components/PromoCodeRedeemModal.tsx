import React, { useState } from 'react';
import { 
  Gift, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  Coins, 
  Loader2, 
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useGame } from '../context/GameContext';

interface PromoCodeRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromoCodeRedeemModal: React.FC<PromoCodeRedeemModalProps> = ({ isOpen, onClose }) => {
  const { userClub, manager, redeemGiftCode } = useGame();
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    code: string;
    amount: number;
    coins?: number;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = codeInput.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode) {
      setError('يرجى كتابة كود الهدية أولاً!');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await redeemGiftCode(cleanCode);

      if (res.success && res.rewardAmount) {
        setSuccessResult({
          code: cleanCode,
          amount: res.rewardAmount,
          coins: res.rewardCoins,
          message: res.message
        });
        setCodeInput('');
      } else {
        setError(res.message || 'تعذر استرداد الكود، يرجى المحاولة لاحقاً.');
      }
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء التحقق من الكود!');
    } finally {
      setLoading(false);
    }
  };

  const handleResetModal = () => {
    setSuccessResult(null);
    setError(null);
    setCodeInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-right" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-right relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shadow-inner">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">استرداد كود الهدية (Gift Code)</h3>
              <p className="text-[11px] text-slate-400">
                اشحن ميزانية ناديك فوراً بالأموال الممنوحة لك من الإدارة
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Club Budget Status */}
        {userClub && (
          <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 p-3 rounded-2xl text-xs relative z-10">
            <div className="flex items-center gap-2 text-slate-300">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>ميزانية النادي الحالية:</span>
            </div>
            <span className="font-mono font-black text-emerald-400 text-sm">
              {userClub.budget.toLocaleString()} ج.م
            </span>
          </div>
        )}

        {/* ============================================================ */}
        {/* Success View */}
        {/* ============================================================ */}
        {successResult ? (
          <div className="space-y-4 py-2 text-center animate-fade-in relative z-10">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl shadow-xl shadow-emerald-950/50">
              🎉
            </div>

            <div className="space-y-1.5">
              <h4 className="font-black text-lg text-white">مبروك يا كابتن!</h4>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                تم التحقق من الكود بنجاح وإيداع المبلغ في خزينة ناديك فوراً.
              </p>
            </div>

            {/* Credited Amount Card */}
            <div className="bg-gradient-to-br from-emerald-950/80 to-slate-950 border border-emerald-500/50 p-4 rounded-2xl shadow-lg space-y-1">
              <span className="text-xs text-emerald-300 font-bold block">المبلغ المالي المضاف:</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                +{successResult.amount.toLocaleString()} ج.م
              </div>
              {successResult.coins ? (
                <div className="text-xs text-amber-300 font-bold pt-1">
                  + {successResult.coins.toLocaleString()} كوينز ذهبية 🪙
                </div>
              ) : null}
            </div>

            {userClub && (
              <div className="text-xs text-slate-400">
                الرصيد المالي الجديد لناديك: <strong className="text-white font-mono font-bold">{userClub.budget.toLocaleString()} ج.م</strong>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleResetModal}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                استرداد كود آخر
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
              >
                تم، العودة للعبة 👍
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* Input Form View */
          /* ============================================================ */
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            
            {/* Error Message Alert */}
            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>اكتب كود الهدية:</span>
                <span className="text-[10px] text-slate-400 font-normal">غير حساس للمسافات</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={loading}
                  value={codeInput}
                  onChange={(e) => {
                    setError(null);
                    setCodeInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                  }}
                  placeholder="مثال: WELCOME10M"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-base sm:text-lg text-white font-mono font-black tracking-widest placeholder-slate-600 focus:outline-none transition-all text-center uppercase shadow-inner"
                />
                {codeInput && (
                  <button
                    type="button"
                    onClick={() => setCodeInput('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Anti-tamper security info */}
            <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-2xl text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>شروط وأمان الاسترداد:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px] pr-1 leading-relaxed">
                <li>يتم إيداع المبلغ المالي فورياً في الميزانية الرسمية لناديك.</li>
                <li>كل كود متاح لعدد استخدامات محدد ويُستخدم مرة واحدة فقط لكل مدرب.</li>
                <li>يتم التحقق سحابياً لمنع أي محاولات تكرار أو تلاعب بالرصيد.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>

              <button
                type="submit"
                disabled={loading || !codeInput.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-amber-950/50 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>جاري التحقق والاسترداد...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>استرداد المكافأة فوراً 🎁</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
