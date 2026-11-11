import React, { useEffect, useState } from 'react';
import { AdManager } from '../../services/adManager';
import { ADMOB_CONFIG } from '../../config/admobConfig';
import { ActiveTab } from '../../types/game';

interface BannerAdContainerProps {
  activeTab?: ActiveTab;
  isMatchActive?: boolean;
}

/**
 * Dedicated Native AdMob Banner Container.
 * Anchored directly above the bottom navigation bar (at bottom-[58px]).
 * - Manages the native Android AdView lifecycle via AdManager with unit ID: ca-app-pub-5272866425919152/4077924883.
 * - Provides a clean, reserved layout area for the native Android AdView.
 * - Displays NO debug pills, status indicators, or Ad Unit ID text in the UI.
 */
export const BannerAdContainer: React.FC<BannerAdContainerProps> = ({ isMatchActive }) => {
  const [isPremium, setIsPremium] = useState<boolean>(AdManager.isPremium());

  useEffect(() => {
    const unsub = AdManager.subscribe((state) => {
      setIsPremium(state.isPremium);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) {
      AdManager.destroyBanner();
      return;
    }

    // Ensure the native AdMob banner is requested and kept active
    AdManager.ensureBannerActive();
  }, [isPremium]);

  // Policy: the native banner floats above the WebView, so it must never cover app content.
  // 1) Sit exactly on top of the real bottom-nav (measured, includes gesture-bar safe area).
  // 2) Hide it while any full-screen overlay/modal or live match is open.
  const [overlayOpen, setOverlayOpen] = useState(false);

  const matchActiveRef = React.useRef<boolean>(!!isMatchActive);
  matchActiveRef.current = !!isMatchActive;

  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) return;
    let raf = 0;
    let timer: any = null;
    let lastMarginApply = 0;
    let pendingH = 0;
    const check = () => {
      const overlays = Array.from(document.querySelectorAll('.fixed.inset-0')) as HTMLElement[];
      const open = overlays.some(el => {
        if (el.closest('#native-admob-banner-container')) return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const z = parseInt(cs.zIndex || '0', 10) || 0;
        return z >= 40 && r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none';
      });
      setOverlayOpen(prev => (prev === open ? prev : open));

      // Re-creating the native banner makes the screen flash, so only do it for a real, stable change of the nav
      // height, never while an overlay / live match is showing, and at most once every few seconds.
      if (open || matchActiveRef.current) return;
      const nav = document.querySelector('nav.fixed.bottom-0') as HTMLElement | null;
      if (!nav) return;
      const h = Math.ceil(nav.getBoundingClientRect().height);
      if (h <= 0 || Math.abs(h - AdManager.getBannerMargin()) < 6) { pendingH = 0; return; }
      if (pendingH !== h) { pendingH = h; return; } // wait for the same value on the next check
      if (Date.now() - lastMarginApply < 4000) return;
      if (AdManager.setBannerMargin(h)) {
        lastMarginApply = Date.now();
        pendingH = 0;
        AdManager.reapplyBannerMargin();
      }
    };
    const schedule = () => {
      if (timer) return;
      timer = setTimeout(() => { timer = null; raf = requestAnimationFrame(check); }, 400);
    };
    check();
    // Only structural changes (modals opening / closing) matter; watching every style change made this run constantly.
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    const poll = setInterval(schedule, 2500);
    return () => {
      mo.disconnect();
      clearInterval(poll);
      window.removeEventListener('resize', schedule);
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [isPremium]);

  const shouldHide = overlayOpen || !!isMatchActive;
  useEffect(() => {
    if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium) return;
    // Hide at once (so it never covers content), but resume only after the state was stable for a moment (no flapping)
    if (shouldHide) { AdManager.hideBanner(); return; }
    const t = setTimeout(() => { AdManager.resumeBanner(); }, 500);
    return () => clearTimeout(t);
  }, [shouldHide, isPremium]);

  if (!ADMOB_CONFIG.ENABLE_BANNER || isPremium || shouldHide) {
    return null;
  }

  return (
    <div
      id="native-admob-banner-container"
      aria-hidden="true"
      style={{ bottom: AdManager.getBannerMargin() }}
      className="fixed left-0 right-0 z-20 pointer-events-none flex justify-center items-center h-[50px] w-full"
    >
      {/* 
        Dedicated transparent space for the Android Native AdView.
        Located exactly above the bottom navigation (58px margin), ensuring buttons and content remain fully accessible.
      */}
      <div className="w-[320px] h-[50px] pointer-events-none" />
    </div>
  );
};
