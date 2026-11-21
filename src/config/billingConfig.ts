/**
 * إعدادات الشراء داخل التطبيق - المدرب المميز وباقات الكوينز
 *
 * معرّفات المنتجات يجب أن تطابق ما يتم إنشاؤه في Google Play Console.
 * النوع (دائم/مستهلك) يتحدد في الكود فقط:
 * - premium_coach: غير مستهلك (acknowledge)
 * - باقات الكوينز: مستهلكة (consume) حتى يمكن شراؤها مرة أخرى
 */

export const PREMIUM_PRODUCT_ID = 'premium_coach';

export const COIN_PACKS = {
  coins_30m: { id: 'coins_30m', coins: 30_000_000 },
  coins_100m: { id: 'coins_100m', coins: 100_000_000 },
  coins_300m: { id: 'coins_300m', coins: 300_000_000 },
} as const;

export type CoinPackId = keyof typeof COIN_PACKS;

export const COIN_PACK_IDS: string[] = Object.values(COIN_PACKS).map((p) => p.id);

export const ALL_PRODUCT_IDS: string[] = [PREMIUM_PRODUCT_ID, ...COIN_PACK_IDS];

/** مكافأة الكوينز عند شراء المدرب المميز */
export const PREMIUM_COIN_BONUS = 50_000_000;
