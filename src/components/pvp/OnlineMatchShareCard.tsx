import React, { useRef, useState } from 'react';
import {
  Download,
  Share2,
  Trophy,
  CheckCircle2,
  Sparkles,
  Loader2,
  Copy,
  Clock,
  Swords,
  Shield
} from 'lucide-react';
import {
  generateOnlineMatchCardImage,
  downloadMatchCardFile,
  shareMatchCard,
  MatchScorerItem,
  OnlineMatchCardData
} from '../../utils/onlineMatchCardImageGenerator';

interface OnlineMatchShareCardProps {
  roomCode: string;
  hostManagerName: string;
  hostClubName: string;
  hostAvatar?: string | null;
  guestManagerName: string;
  guestClubName: string;
  guestAvatar?: string | null;
  homeScore: number;
  awayScore: number;
  scorers: MatchScorerItem[];
  matchRecap: string;
  dateStr?: string;
  isWinner?: boolean;
  isDraw?: boolean;
}

export const OnlineMatchShareCard: React.FC<OnlineMatchShareCardProps> = ({
  roomCode,
  hostManagerName,
  hostClubName,
  hostAvatar,
  guestManagerName,
  guestClubName,
  guestAvatar,
  homeScore,
  awayScore,
  scorers,
  matchRecap,
  dateStr,
  isWinner,
  isDraw,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loadingAction, setLoadingAction] = useState<'download' | 'share' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getCardData = (): OnlineMatchCardData => ({
    roomCode,
    hostManagerName,
    hostClubName,
    hostAvatar,
    guestManagerName,
    guestClubName,
    guestAvatar,
    homeScore,
    awayScore,
    scorers,
    matchRecap,
    dateStr: dateStr || new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' }),
    cardElement: cardRef.current,
  });

  const handleDownload = async () => {
    try {
      setLoadingAction('download');
      const res = await generateOnlineMatchCardImage(getCardData());
      const success = await downloadMatchCardFile(res.dataUrl, res.fileName);
      if (success) {
        showToast('تم تحميل تصميم نتيجة المباراة بصيغة صورة PNG بنجاح! 📸');
      } else {
        showToast('تعذر حفظ الصورة تلقائياً، يرجى المحاولة ثانية.');
      }
    } catch (err) {
      console.warn('[MatchShareCard] Error downloading image:', err);
      showToast('حدث خطأ أثناء استخراج الصورة.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleShare = async () => {
    try {
      setLoadingAction('share');
      const res = await generateOnlineMatchCardImage(getCardData());
      const title = `نتيجة تحدي أونلاين: ${hostClubName} (${homeScore}) - (${awayScore}) ${guestClubName}`;
      const text = `🔥 قمة نارية في لعبة "أنت المدرب"!\nالمدرب [${hostManagerName}] (${hostClubName}) ${homeScore} - ${awayScore} (${guestClubName}) المدرب [${guestManagerName}]\n${matchRecap}\n\nحمل لعبة أنت المدرب واتحدى أصحابك! 📲`;

      const shared = await shareMatchCard(res.dataUrl, res.fileName, title, text);
      if (shared) {
        showToast('تم فتح نافذة المشاركة أو نسخ تفاصيل النتيجة! 🚀');
      } else {
        showToast('تم نسخ ملخص النتيجة إلى الحافظة.');
      }
    } catch (err) {
      console.warn('[MatchShareCard] Share error:', err);
      showToast('تعذر المشاركة.');
    } finally {
      setLoadingAction(null);
    }
  };

  const hostScorers = scorers.filter((s) => s.team === 'host');
  const guestScorers = scorers.filter((s) => s.team === 'guest');

  return (
    <div className="space-y-3 max-w-md mx-auto w-full" dir="rtl" id="online-match-share-card-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-center text-xs font-bold animate-fade-in flex items-center justify-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* THE ACTUAL SHAREABLE CARD (Target for DOM capture & Visual Presentation - Sleek Compact Size) */}
      <div
        ref={cardRef}
        id="online-match-share-card-capture"
        className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3.5 sm:p-4 shadow-2xl text-white select-none"
        style={{
          boxShadow: '0 15px 35px -10px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.3)',
        }}
      >
        {/* Stadium Floodlight Accents */}
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Pitch Circle Graphic in background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <div className="w-64 h-64 rounded-full border-2 border-emerald-400" />
          <div className="absolute w-full h-[1px] bg-emerald-400" />
        </div>

        {/* TOP HEADER: REQUIRED PROMINENT SLOGAN (REPLACES ROOM CODE & ENGLISH NAME) */}
        <div className="relative z-10 flex items-center justify-center pb-2.5 mb-2.5 border-b border-slate-800/80">
          <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-emerald-500/20 border border-emerald-300/40">
            <Trophy className="w-3.5 h-3.5 fill-current" />
            <span>حمل لعبة أنت المدرب واتحدى أصحابك</span>
            <Sparkles className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>

        {/* TEAMS & SCOREBOARD */}
        <div className="relative z-10 grid grid-cols-3 items-center gap-2 py-1">
          {/* HOST (Right in RTL) */}
          <div className="flex flex-col items-center text-center space-y-1">
            <div className="relative">
              {hostAvatar ? (
                <img
                  src={hostAvatar}
                  alt={hostManagerName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-emerald-400 shadow-md shadow-emerald-900/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 border-2 border-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-900/30">
                  {hostClubName.charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-emerald-600 text-[8px] font-black text-white shadow">
                مضيف
              </span>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate max-w-[95px] sm:max-w-[130px]">
                {hostClubName}
              </h3>
              <p className="text-[10px] text-emerald-300 font-bold truncate max-w-[95px] sm:max-w-[130px]">
                {hostManagerName}
              </p>
            </div>
          </div>

          {/* SCOREBOARD (Center) */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 sm:px-4 py-1.5 shadow-inner">
              <div className="flex items-center justify-center gap-2 sm:gap-3 text-2xl sm:text-3xl font-black font-mono tracking-tight text-white drop-shadow">
                <span className="text-emerald-400">{homeScore}</span>
                <span className="text-slate-600 text-lg">-</span>
                <span className="text-blue-400">{awayScore}</span>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-amber-400 font-bold">
              نهاية اللقاء (FT)
            </span>
          </div>

          {/* GUEST (Left in RTL) */}
          <div className="flex flex-col items-center text-center space-y-1">
            <div className="relative">
              {guestAvatar ? (
                <img
                  src={guestAvatar}
                  alt={guestManagerName}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-blue-400 shadow-md shadow-blue-900/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 border-2 border-blue-400 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-900/30">
                  {guestClubName.charAt(0)}
                </div>
              )}
              <span className="absolute -bottom-1 -left-1 px-1 py-0.2 rounded bg-blue-600 text-[8px] font-black text-white shadow">
                ضيف
              </span>
            </div>

            <div>
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate max-w-[95px] sm:max-w-[130px]">
                {guestClubName}
              </h3>
              <p className="text-[10px] text-blue-300 font-bold truncate max-w-[95px] sm:max-w-[130px]">
                {guestManagerName}
              </p>
            </div>
          </div>
        </div>

        {/* GOALSCORERS LIST (مين سجل الأهداف) */}
        <div className="relative z-10 my-2.5 p-2 rounded-xl bg-slate-900/70 border border-slate-800/90 grid grid-cols-2 gap-2 text-[11px]">
          {/* Host Scorers */}
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-emerald-400 block pb-0.5 border-b border-slate-800 truncate">
              أهداف {hostClubName}:
            </span>
            {hostScorers.length > 0 ? (
              <div className="space-y-0.5 text-slate-200">
                {hostScorers.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[10px] truncate">
                    <span className="text-emerald-400 shrink-0">⚽</span>
                    <span className="font-bold truncate">{s.name}</span>
                    <span className="font-mono text-slate-400 shrink-0">({s.minute}')</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">لا توجد أهداف</p>
            )}
          </div>

          {/* Guest Scorers */}
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-blue-400 block pb-0.5 border-b border-slate-800 truncate">
              أهداف {guestClubName}:
            </span>
            {guestScorers.length > 0 ? (
              <div className="space-y-0.5 text-slate-200">
                {guestScorers.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-[10px] truncate">
                    <span className="text-blue-400 shrink-0">⚽</span>
                    <span className="font-bold truncate">{s.name}</span>
                    <span className="font-mono text-slate-400 shrink-0">({s.minute}')</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 italic">لا توجد أهداف</p>
            )}
          </div>
        </div>

        {/* BRIEF MATCH RECAP (نبذة عن سير اللقاء) */}
        <div className="relative z-10 mb-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>نبذة عن سير اللقاء:</span>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-300 leading-snug font-medium line-clamp-3">
            {matchRecap}
          </p>
        </div>

        {/* FOOTER CALL TO ACTION */}
        <div className="relative z-10 rounded-xl p-2 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-center text-white shadow border border-emerald-500/30">
          <p className="text-[11px] sm:text-xs font-black tracking-wide">
            ⚽ أقوى لعبة تدريب وتحدي مباشر أونلاين • أنت المدرب 🏆
          </p>
        </div>
      </div>

      {/* ACTION BUTTONS: DOWNLOAD & SHARE (Excluded from exported image via attribute) */}
      <div className="flex items-center justify-center gap-2 pt-1" data-hide-on-export="true">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loadingAction !== null}
          className="flex-1 max-w-[200px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
        >
          {loadingAction === 'download' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>تحميل كصورة</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          disabled={loadingAction !== null}
          className="flex-1 max-w-[200px] py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
        >
          {loadingAction === 'share' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          <span>مشاركة مع أصحابك</span>
        </button>
      </div>
    </div>
  );
};
