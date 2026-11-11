import React, { useState, useEffect, useRef } from 'react';
import { compressImage } from '../../utils/imageCompressor';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * LazyImage Component
 * 
 * Automatically delays loading and compressing images until they approach the viewport (IntersectionObserver).
 * Compresses oversized images to target pixel dimensions to reduce RAM consumption on low-end Android devices.
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackText,
  maxWidth = 120,
  maxHeight = 120,
  quality = 0.75,
  className = '',
  ...rest
}) => {
  const [isInView, setIsInView] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !src) return;

    let isMounted = true;
    setIsLoading(true);

    compressImage(src, { maxWidth, maxHeight, quality })
      .then((compressed) => {
        if (isMounted) {
          setOptimizedSrc(compressed || src);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOptimizedSrc(src);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isInView, src, maxWidth, maxHeight, quality]);

  if (hasError && fallbackText) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 text-slate-300 font-bold text-xs select-none ${className}`}>
        {fallbackText}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden inline-flex items-center justify-center ${className}`}>
      {isInView && optimizedSrc ? (
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          {...rest}
        />
      ) : (
        <div className="w-full h-full bg-slate-800/60 animate-pulse" />
      )}
    </div>
  );
};
