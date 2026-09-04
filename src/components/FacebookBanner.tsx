import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Sparkles, MessageCircle } from 'lucide-react';

const FB_DISMISSED_KEY = 'anta_el_modareb_fb_banner_dismissed_v2';
const FACEBOOK_COMMUNITY_URL = 'https://www.facebook.com/share/1dM9YvHPFr/';

export const FacebookBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(FB_DISMISSED_KEY);
      if (!dismissed) {
        setIsDismissed(false);
      }
    } catch {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(FB_DISMISSED_KEY, 'true');
    } catch (err) {
      console.warn('Could not save dismissal state:', err);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-600/40 p-3.5 sm:p-4 shadow-xl mb-4 animate-fade-in"
      dir="rtl"
      id="facebook-community-banner"
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Banner Content */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
            <MessageCircle className="w-5 h-5" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-black text-sm text-white tracking-wide">
                تابع صفحة أنت المدرب على فيسبوك ⚽
              </h4>
              <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                مجتمع اللعبة
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 sm:line-clamp-none">
              خليك أول واحد يعرف التحديثات والبطولات والأخبار الجديدة
            </p>
          </div>
        </div>

        {/* Action Button & Close */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <a
            href={FACEBOOK_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-visit-facebook"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>تابعنا على فيسبوك</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleDismiss}
            id="btn-dismiss-fb-banner"
            aria-label="إغلاق الإشعار"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all cursor-pointer"
            title="إخفاء هذا الإشعار"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
