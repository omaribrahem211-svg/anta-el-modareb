import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseLazyListOptions {
  initialBatchSize?: number;
  batchStep?: number;
  rootMargin?: string;
  resetKey?: string | number;
}

/**
 * useLazyList Hook
 * 
 * Provides automated, stutter-free incremental rendering for large lists
 * using an IntersectionObserver sentinel. Prevents frame drops, memory spikes,
 * and Android browser crashes by rendering elements in manageable chunks.
 */
export function useLazyList<T>(
  items: T[],
  options: UseLazyListOptions = {}
): {
  visibleItems: T[];
  hasMore: boolean;
  loadMore: () => void;
  sentinelRef: (node: HTMLElement | null) => void;
  renderedCount: number;
  totalCount: number;
} {
  const {
    initialBatchSize = 16,
    batchStep = 12,
    rootMargin = '250px',
    resetKey,
  } = options;

  const [visibleCount, setVisibleCount] = useState<number>(initialBatchSize);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // إعادة ضبط العدد المرئي فقط عند تغير طول المصفوفة أو مفتاح الفلترة لتجنب مسح "عرض المزيد" مع كل رندرة
  useEffect(() => {
    setVisibleCount(initialBatchSize);
  }, [items.length, initialBatchSize, resetKey]);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => Math.min(items.length, prev + batchStep));
  }, [items.length, batchStep]);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || visibleCount >= items.length) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount(prev => Math.min(items.length, prev + batchStep));
          }
        },
        { rootMargin, threshold: 0.05 }
      );

      observerRef.current.observe(node);
    },
    [visibleCount, items.length, batchStep, rootMargin]
  );

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return {
    visibleItems,
    hasMore,
    loadMore,
    sentinelRef,
    renderedCount: visibleItems.length,
    totalCount: items.length,
  };
}
