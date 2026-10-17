import React, { useState } from 'react';
import { ExternalLink, Users, X } from 'lucide-react';

const FACEBOOK_COMMUNITY_URL = 'https://www.facebook.com/share/1dM9YvHPFr/';
const SESSION_KEY = 'anta_fb_banner_dismissed_session_v3';

export const FacebookBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      // Clear legacy permanent dismiss so user request is honored
      localStorage.removeItem('anta_fb_banner_dismissed_v1');
      return sessionStorage.getItem(SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {}
  };

  if (isDismissed) return null;

  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 border border-blue-500/40 hover:border-blue-400/70 p-3 sm:p-3.5 shadow-lg mb-3 transition-all"
      dir="rtl"
      id="facebook-community-banner"
    >
      {/* Decorative subtle blue aura */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex items-center justify-between gap-3">
        {/* Banner Content */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-600/30 font-black text-lg select-none">
            f
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                مجتمع "أنت المدرب" الرسمي على فيسبوك
              </h4>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                15,000+ مدرب
              </span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
              شارك خططك وتكتيكاتك وتنافس مع أفضل المدربين العرب في البطولات والتحديثات
            </p>
          </div>
        </div>

        {/* Action Button & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={FACEBOOK_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-visit-facebook"
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-600/25 shrink-0"
          >
            <span>انضم للجروب</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="إخفاء مؤقتاً"
            aria-label="إخفاء مؤقتاً"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
