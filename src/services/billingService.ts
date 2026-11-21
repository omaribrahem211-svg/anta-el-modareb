/**
 * خدمة الشراء داخل التطبيق (Google Play Billing عبر @capgo/native-purchases)
 *
 * نسخة أولى: تهيئة + جلب المنتجات + شراء + استعادة + تحديد الاستحقاق.
 * منطق فتح المزايا (المتجر، الشارة، بونص الكوينز) يُبنى فوق هذه الخدمة.
 *
 * قاعدة مهمة: durable vs consumable يتحدد هنا فقط -
 * - premium_coach: نستخدم acknowledge (غير مستهلك)
 * - باقات الكوينز: نستخدم consume (مستهلك لإعادة الشراء)
 */
import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import type { Product, Transaction } from '@capgo/native-purchases';
import {
  ALL_PRODUCT_IDS,
  COIN_PACKS,
  PREMIUM_PRODUCT_ID,
} from '../config/billingConfig';

const PREMIUM_STORAGE_KEY = 'premium_coach_owned';

export class BillingService {
  private static instance: BillingService;
  private initialized = false;
  private products: Product[] = [];

  private constructor() {}

  static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService();
    }
    return BillingService.instance;
  }

  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** هل المستخدم يملك المدرب المميز؟ (محلي + تحقق من المتجر عند التهيئة) */
  isPremium(): boolean {
    try {
      return localStorage.getItem(PREMIUM_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private setPremiumLocal(owned: boolean): void {
    try {
      localStorage.setItem(PREMIUM_STORAGE_KEY, owned ? 'true' : 'false');
    } catch {
      // تجاهل أخطاء التخزين
    }
  }

  /** تهيئة الخدمة ومزامنة حالة الاستحقاق من Google Play */
  async initialize(): Promise<void> {
    if (this.initialized || !this.isAvailable()) return;
    this.initialized = true;
    try {
      await this.syncEntitlement();
    } catch (err) {
      console.warn('[Billing] initialize sync failed', err);
    }
  }

  /** تحميل أسعار المنتجات من المتجر */
  async loadProducts(): Promise<Product[]> {
    if (!this.isAvailable()) return [];
    try {
      const result = await NativePurchases.getProducts({
        productIdentifiers: ALL_PRODUCT_IDS,
        productType: PURCHASE_TYPE.INAPP,
      });
      this.products = result.products ?? [];
      return this.products;
    } catch (err) {
      console.warn('[Billing] loadProducts failed', err);
      return [];
    }
  }

  getLoadedProducts(): Product[] {
    return this.products;
  }

  /**
   * شراء منتج. يرجع المعاملة عند النجاح أو null عند الإلغاء/الفشل.
   * ملاحظة: purchaseProduct مع autoFinishTransactions الافتراضي يُنهي المعاملة،
   * لكننا نتحكم في الإنهاء بأنفسنا حتى نفرّق بين acknowledge و consume.
   */
  async purchase(productId: string): Promise<Transaction | null> {
    if (!this.isAvailable()) return null;
    try {
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType: PURCHASE_TYPE.INAPP,
      });
      if (!transaction || transaction.purchaseState !== '1') {
        return null;
      }
      if (productId === PREMIUM_PRODUCT_ID) {
        await this.acknowledgePremium(transaction);
        this.setPremiumLocal(true);
      } else if (productId in COIN_PACKS) {
        await this.consumePack(transaction);
      }
      return transaction;
    } catch (err) {
      // إلغاء المستخدم أو فشل الدفع
      console.warn('[Billing] purchase failed/cancelled', err);
      return null;
    }
  }

  /** تأكيد شراء المدرب المميز (غير مستهلك) */
  private async acknowledgePremium(transaction: Transaction): Promise<void> {
    try {
      await NativePurchases.acknowledgePurchase({
        purchaseToken: transaction.transactionId,
      });
    } catch (err) {
      console.warn('[Billing] acknowledge failed', err);
    }
  }

  /** استهلاك باقة كوينز (مستهلك - يتيح إعادة الشراء) */
  private async consumePack(transaction: Transaction): Promise<void> {
    try {
      await NativePurchases.consumePurchase({
        purchaseToken: transaction.transactionId,
      });
    } catch (err) {
      console.warn('[Billing] consume failed', err);
    }
  }

  /** مزامنة حالة المدرب المميز من سجل مشتريات Google Play */
  async syncEntitlement(): Promise<boolean> {
    if (!this.isAvailable()) return this.isPremium();
    try {
      const result = await NativePurchases.getPurchases({
        productType: PURCHASE_TYPE.INAPP,
      });
      const purchases: Transaction[] = result.purchases ?? [];
      const owned = purchases.some(
        (p) => p.productIdentifier === PREMIUM_PRODUCT_ID && p.purchaseState === '1'
      );
      this.setPremiumLocal(owned);
      return owned;
    } catch (err) {
      console.warn('[Billing] syncEntitlement failed', err);
      return this.isPremium();
    }
  }

  /** استعادة المشتريات (من شاشة المتجر) */
  async restore(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await NativePurchases.restorePurchases();
      return await this.syncEntitlement();
    } catch (err) {
      console.warn('[Billing] restore failed', err);
      return false;
    }
  }
}

export const billingService = BillingService.getInstance();
