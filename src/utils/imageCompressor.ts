/**
 * Image Compressor & Lazy Loading Utility
 * 
 * Provides client-side image compression, memory-bounded caching,
 * and lazy-loading helpers to prevent memory leaks and UI freezes on low-end Android devices.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.75)
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

// In-memory LRU cache for compressed image data URLs (Max 120 items to conserve RAM on Android)
const COMPRESSION_CACHE = new Map<string, string>();
const MAX_CACHE_ENTRIES = 120;

function setInCache(key: string, value: string) {
  if (COMPRESSION_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = COMPRESSION_CACHE.keys().next().value;
    if (firstKey) COMPRESSION_CACHE.delete(firstKey);
  }
  COMPRESSION_CACHE.set(key, value);
}

/**
 * Compresses an image (DataURL, remote URL, or Blob) using an offscreen HTML5 canvas.
 * Preserves aspect ratio, resizes to target bounds, and encodes at optimal quality.
 */
export async function compressImage(
  source: string | Blob,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 160,
    maxHeight = 160,
    quality = 0.75,
    mimeType = 'image/webp',
  } = options;

  if (typeof source === 'string') {
    // Check in-memory cache first
    const cacheKey = `${source.slice(0, 80)}_${maxWidth}x${maxHeight}_q${quality}`;
    if (COMPRESSION_CACHE.has(cacheKey)) {
      return COMPRESSION_CACHE.get(cacheKey)!;
    }

    // Skip compression for tiny SVG or icon strings
    if (source.startsWith('data:image/svg+xml') || source.length < 512) {
      return source;
    }
  }

  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let objectUrl: string | null = null;
      if (typeof source !== 'string') {
        objectUrl = URL.createObjectURL(source);
        img.src = objectUrl;
      } else {
        img.src = source;
      }

      img.onload = () => {
        try {
          if (objectUrl) URL.revokeObjectURL(objectUrl);

          let { width, height } = img;
          if (width <= 0 || height <= 0) {
            resolve(typeof source === 'string' ? source : '');
            return;
          }

          // Calculate downscaled dimensions maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d', { alpha: true });

          if (!ctx) {
            resolve(typeof source === 'string' ? source : '');
            return;
          }

          // Enable high-quality bilinear interpolation for downsampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);

          // Test WebP support with fallback to JPEG
          let compressed = canvas.toDataURL(mimeType, quality);
          if (compressed.startsWith('data:image/png') && mimeType !== 'image/png') {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          // Cleanup canvas context to release GPU RAM immediately
          canvas.width = 0;
          canvas.height = 0;

          if (typeof source === 'string') {
            const cacheKey = `${source.slice(0, 80)}_${maxWidth}x${maxHeight}_q${quality}`;
            setInCache(cacheKey, compressed);
          }

          resolve(compressed);
        } catch {
          resolve(typeof source === 'string' ? source : '');
        }
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(typeof source === 'string' ? source : '');
      };
    } catch {
      resolve(typeof source === 'string' ? source : '');
    }
  });
}

/**
 * Creates an ultra-lightweight thumbnail avatar DataURL for club badges and player avatars.
 */
export async function createOptimizedThumbnail(source: string, size: number = 80): Promise<string> {
  return compressImage(source, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    mimeType: 'image/webp',
  });
}
