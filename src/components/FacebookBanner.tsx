import React from 'react';
import { ExternalLink, MessageCircle, Sparkles } from 'lucide-react';

const FACEBOOK_COMMUNITY_URL = 'https://www.facebook.com/share/1dM9YvHPFr/';

export const FacebookBanner: React.FC = () => {
  return (
    <div 
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-600/40 p-3.5 sm:p-4 shadow-xl mb-3 animate-fade-in"
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
              <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                مجتمع اللعبة
              </span>
            </div>
            <p className="text-xs text-slate-300 line-clamp-1 sm:line-clamp-none">
              خليك أول واحد يعرف التحديثات والبطولات والأخبار الجديدة وتشكيلات المدربين
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-end">
          <a
            href={FACEBOOK_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="btn-visit-facebook"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>تابعنا على فيسبوك</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

