import React, { useEffect, useState } from 'react';
import {
  X,
  Crown,
  Heart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Star,
  BadgeCheck,
  Coins,
} from 'lucide-react';
import { billingService } from '../services/billingService';
import { COIN_PACKS, PREMIUM_PRODUCT_ID, PREMIUM_COIN_BONUS } from '../config/billingConfig';
import { useGame } from '../context/GameContext';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Purchases already credited in this app run (stops a double credit between the buy flow and the recovery below)
const creditedPurchaseTokens = new Set<string>();

type StoreMessage = { kind: 'success' | 'error' | 'info'; text: string } | null;

export const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose }) => {
  const { grantPurchasedCoins, activatePremiumBenefits } = useGame();
  const [productsReady, setProductsReady] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<StoreMessage>(null);

  const isNative = billingService.isAvailable();

  useEffect(() => {
    if (!isOpen) return;
    setMessage(null);
    setIsPremium(billingService.isPremium());
    let cancelled = false;
    (async () => {
      await billingService.initialize();
      await billingService.loadProducts();
      if (!cancelled) {
        setProductsReady(true);
        setProductsError(billingService.getProductsError());
        setIsPremium(billingService.isPremium());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // A paid coin pack that was never credited/consumed (app closed or crashed mid-purchase) is credited now.
  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    (async () => {
      await billingService.initialize();
      const owned = await billingService.getUnconsumedCoinPacks();
      for (const tx of owned) {
        if (cancelled) return;
        const key = tx.transactionId;
        if (creditedPurchaseTokens.has(key)) continue;
        creditedPurchaseTokens.add(key);
        const pack = COIN_PACKS[tx.productIdentifier as keyof typeof COIN_PACKS];
        if (!pack) continue;
        grantPurchasedCoins(pack.coins, 'باقة دعم اللعبة (تمت استعادتها) ❤️');
        await billingService.finishCoinPack(tx);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReloadProducts = async () => {
    if (reloading) return;
    setReloading(true);
    await billingService.loadProducts();
    setProductsError(billingService.getProductsError());
    setReloading(false);
  };

  const priceOf = (productId: string): string => {
    const p = billingService.getLoadedProducts().find((prod) => prod.identifier === productId);
    return p?.priceString || '';
  };

  const handlePurchase = async (productId: string) => {
    if (purchasingId) return;
    setPurchasingId(productId);
    setMessage(null);
    try {
      const tx = await billingService.purchase(productId);
      if (!tx) {
        setMessage({ kind: 'info', text: 'لم يكتمل الشراء. لم يتم خصم أي مبلغ.' });
        return;
      }
      if (productId === PREMIUM_PRODUCT_ID) {
        const res = activatePremiumBenefits();
        setIsPremium(true);
        setMessage({ kind: 'success', text: res.message });
      } else if (productId in COIN_PACKS) {
        const amount = COIN_PACKS[productId as keyof typeof COIN_PACKS].coins;
        if (!creditedPurchaseTokens.has(tx.transactionId)) {
          creditedPurchaseTokens.add(tx.transactionId);
          const res = grantPurchasedCoins(amount, 'باقة دعم اللعبة ❤️');
          setMessage({ kind: 'success', text: res.message });
          await billingService.finishCoinPack(tx);
        }
      }
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'حدث خطأ أثناء الشراء. حاول مرة أخرى.' });
    } finally {
      setPurchasingId(null);
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    setMessage(null);
    try {
      const owned = await billingService.restore();
      if (owned) {
        const res = activatePremiumBenefits();
        setIsPremium(true);
        setMessage({ kind: 'success', text: res.message });
      } else {
        setMessage({ kind: 'info', text: 'لم يتم العثور على مشتريات سابقة لهذا الحساب.' });
      }
    } catch (_) {
      setMessage({ kind: 'error', text: 'تعذرت استعادة المشتريات حالياً. حاول مرة أخرى.' });
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  const premiumPrice = priceOf(PREMIUM_PRODUCT_ID);
  const supportId = COIN_PACKS.coins_support_75m.id;
  const supportPrice = priceOf(supportId);
  const supportCoins = COIN_PACKS.coins_support_75m.coins;

  return (
    <div className="fixed inset-0 z-[26000] flex items-end sm:items-center justify-center bg-slate-950/90 backdrop-blur-sm p-0 sm:p-4" dir="rtl">
      <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 sm:rounded-3xl rounded-t-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900/95 border-b border-slate-800">
          <h2 className="text-lg font-black text-white">متجر اللعبة 🛒</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!isNative && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>المشتريات متاحة داخل تطبيق أندرويد فقط.</span>
            </div>
          )}

          {message && (
            <div
              className={`flex items-start gap-2 p-3 rounded-xl text-xs leading-relaxed border ${
                message.kind === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : message.kind === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-200'
              }`}
            >
              {message.kind === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* المدرب المميز */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 p-5">
            <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-black text-amber-300">المدرب المميز</h3>
              {isPremium && (
                <span className="mr-auto flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 rounded-full px-2 py-0.5">
                  <BadgeCheck className="w-3 h-3" /> مفعل
                </span>
              )}
            </div>
            <ul className="space-y-1.5 text-xs text-slate-200 leading-relaxed mb-4">
              <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-400 shrink-0" /> كل المميزات بدون إعلانات للأبد</li>
              <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-400 shrink-0" /> كل التشكيلات والأساليب التكتيكية مفتوحة</li>
              <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-400 shrink-0" /> درّب أي نادٍ من اليوم الأول</li>
              <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-amber-400 shrink-0" /> كارت مدرب ذهبي وشارة مميزة بجانب اسمك</li>
              <li className="flex items-center gap-2"><Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" /> بونص {PREMIUM_COIN_BONUS.toLocaleString()} ج.م هدية في خزينة النادي</li>
            </ul>
            {isPremium ? (
              <div className="w-full py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm font-black text-center">
                أنت مدرب مميز ⭐ استمتع بكل المزايا
              </div>
            ) : (
              <button
                onClick={() => handlePurchase(PREMIUM_PRODUCT_ID)}
                disabled={!isNative || purchasingId !== null}
                className="w-full py-3 rounded-xl bg-gradient-to-l from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-sm font-black transition-all cursor-pointer"
              >
                {purchasingId === PREMIUM_PRODUCT_ID ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> جاري الشراء...</span>
                ) : (
                  <>اشترك الآن {premiumPrice ? `- ${premiumPrice}` : ''}</>
                )}
              </button>
            )}
            <p className="mt-2 text-[10px] text-slate-400 text-center">دفعة واحدة فقط، تدوم للأبد. أي ميزة مقفولة جديدة تتفتحلك تلقائياً.</p>
          </div>

          {/* ادعم اللعبة */}
          <div className="rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-rose-400" />
              <h3 className="text-base font-black text-rose-300">ادعم اللعبة</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              اللعبة دي معمولة بمجهود شخص واحد بيحلم يكبرها. دعمك بدولار واحد بيفرق فعلا، وكشكر من القلب هتوصلك {supportCoins.toLocaleString()} هدية في خزينة ناديك.
            </p>
            <button
              onClick={() => handlePurchase(supportId)}
              disabled={!isNative || purchasingId !== null}
              className="w-full py-3 rounded-xl bg-gradient-to-l from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black transition-all cursor-pointer"
            >
              {purchasingId === supportId ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> جاري الشراء...</span>
              ) : (
                <>ادعم اللعبة {supportPrice ? `- ${supportPrice}` : ''} ❤️</>
              )}
            </button>
            <p className="mt-2 text-[10px] text-slate-400 text-center">العملات بتتضاف لخزينة النادي وتقدر تشتري بيها لاعيبة وأي حاجة.</p>
          </div>

          {/* استعادة المشتريات */}
          <button
            onClick={handleRestore}
            disabled={!isNative || restoring || purchasingId !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            استعادة المشتريات
          </button>

          {!productsReady && isNative && (
            <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> جاري تحميل الأسعار من المتجر...
            </p>
          )}

          {productsReady && productsError && isNative && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{productsError}</span>
              </div>
              <button
                onClick={handleReloadProducts}
                disabled={reloading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                {reloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                إعادة تحميل الأسعار
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
