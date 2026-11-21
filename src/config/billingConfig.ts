/**
 * إعدادات الشراء داخل التطبيق - المدرب المميز وباقة دعم اللعبة
 *
 * معرّفات المنتجات يجب أن تطابق ما يتم إنشاؤه في Google Play Console.
 * النوع (دائم/مستهلك) يتحدد في الكود فقط:
 * - premium_coach: غير مستهلك (acknowledge)
 * - coins_support_75m: مستهلك (consume) حتى يمكن شراؤها مرة أخرى
 */

export const PREMIUM_PRODUCT_ID = 'premium_coach';

export const COIN_PACKS = {
  coins_support_75m: { id: 'coins_support_75m', coins: 75_000_000 },
} as const;

export type CoinPackId = keyof typeof COIN_PACKS;

export const COIN_PACK_IDS: string[] = Object.values(COIN_PACKS).map((p) => p.id);

export const ALL_PRODUCT_IDS: string[] = [PREMIUM_PRODUCT_ID, ...COIN_PACK_IDS];

/** مكافأة الكوينز عند شراء المدرب المميز */
export const PREMIUM_COIN_BONUS = 50_000_000;
