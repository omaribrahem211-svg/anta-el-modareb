import React, { useState, useEffect, useRef } from 'react';
import { Share } from '@capacitor/share';
import { ManagerProfile, Club, WorldRankingsData } from '../types/game';
import { 
  Camera, 
  Share2, 
  Trophy, 
  Globe, 
  Calendar, 
  Shield, 
  Award, 
  CheckCircle2, 
  X, 
  RotateCcw,
  Sparkles,
  TrendingUp,
  Flame,
  UserCheck
} from 'lucide-react';

interface CoachCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: ManagerProfile;
  userClub: Club | null;
  worldRankings: WorldRankingsData | null;
}

const STORAGE_COACH_PHOTO = 'anta_elmodareb_coach_photo_v1';

export const CoachCardModal: React.FC<CoachCardModalProps> = ({
  isOpen,
  onClose,
  manager,
  userClub,
  worldRankings,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedPhoto = localStorage.getItem(STORAGE_COACH_PHOTO);
      if (savedPhoto) {
        setPhotoUrl(savedPhoto);
      }
    } catch (e) {
      console.warn('Error reading coach photo:', e);
    }
  }, []);

  if (!isOpen) return null;

  const globalRank = manager.worldRank || 
    ((worldRankings?.managers || []).find(m => m && m.id === 'user_manager')?.worldRank) || 
    850;

  const winRate = manager.matchesManaged > 0 
    ? Math.round((manager.wins / manager.matchesManaged) * 100) 
    : 0;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت.');
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
        try {
          localStorage.setItem(STORAGE_COACH_PHOTO, result);
          setToastMessage('تم تحديث وحفظ صورة المدرب بنجاح!');
          setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
          console.warn('LocalStorage error on photo save:', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPhoto = () => {
    setPhotoUrl(null);
    try {
      localStorage.removeItem(STORAGE_COACH_PHOTO);
      setToastMessage('تمت استعادة الصورة الافتراضية.');
      setTimeout(() => setToastMessage(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    const shareTitle = `كارت المدرب: ${manager.name} - أنت المدرب`;
    const shareText = 
      `🏆 بطاقة المدرب الرسمي في لعبة "أنت المدرب" ⚽\n\n` +
      `👤 الاسم: ${manager.name}\n` +
      `🌍 الدولة: ${manager.nationality || 'مصر'}\n` +
      `🎂 العمر: ${manager.age || 35} سنة\n` +
      `🌐 الترتيب العالمي: المركز #${globalRank}\n` +
      `🛡️ النادي: ${userClub?.name || 'دوري الدرجة الرابعة'}\n` +
      `📊 المباريات: ${manager.matchesManaged} مباراة | نسبة الفوز: ${winRate}%\n` +
      `🥇 البطولات: ${manager.trophies || 0}\n\n` +
      `⭐ "أنت المدرب" - لعبة التدريب الكروي الواقعية`;

    try {
      // 1. Try Capacitor Native Android Share Plugin
      try {
        const canShare = await Share.canShare();
        if (canShare?.value) {
          await Share.share({
            title: shareTitle,
            text: shareText,
            dialogTitle: 'مشاركة كارت المدرب عبر واتساب والتطبيقات',
          });
          setToastMessage('تم فتح نافذة المشاركة الرسمية بنجاح!');
          setTimeout(() => setToastMessage(null), 3000);
          return;
        }
      } catch (nativeErr) {
        console.log('Capacitor Share plugin fallback:', nativeErr);
      }

      // 2. Try Web Share API (Standard in modern Android browsers)
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
          });
          setToastMessage('تمت المشاركة بنجاح!');
          setTimeout(() => setToastMessage(null), 3000);
          return;
        } catch (webShareErr: any) {
          if (webShareErr.name === 'AbortError') {
            return; // User canceled
          }
        }
      }

      // 3. Fallback: Copy to clipboard
      await navigator.clipboard.writeText(shareText);
      setToastMessage('تم نسخ بيانات كارت المدرب للحافظة بنجاح!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (finalErr) {
      console.warn('Share error:', finalErr);
      setToastMessage('تعذر فتح المشاركة، تأكد من إعطاء الصلاحيات للتطبيق.');
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl shadow-amber-500/10 text-slate-100 relative overflow-hidden flex flex-col items-center">
        
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 left-16 z-20 p-2.5 bg-emerald-900/90 border border-emerald-500 text-emerald-100 text-xs rounded-xl shadow-lg flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* Hidden File Input for Image Upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handlePhotoUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Card Container - Golden FUT Style Badge */}
        <div 
          id="official_coach_card"
          className="w-full relative rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden border-2 border-amber-400/50 select-none"
          style={{
            background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)',
            boxShadow: '0 20px 40px -15px rgba(245, 158, 11, 0.2), inset 0 1px 0 rgba(251, 191, 36, 0.3)'
          }}
        >
          {/* Distinctive Decorative Top Hologram / Golden Watermark */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500" />
          
          {/* Card Top Header Branding: "أنت المدرب" */}
          <div className="text-center mb-4 relative">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>أنت المدرب • الكارت الرسمي</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          {/* Coach Photo & Upload Button */}
          <div className="relative mx-auto w-32 h-32 sm:w-36 sm:h-36 mb-4">
            <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-xl bg-slate-800 flex items-center justify-center relative group">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt={manager.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center mb-1 text-amber-400">
                    <UserCheck className="w-9 h-9" />
                  </div>
                  <span className="text-[10px] text-slate-400">صورة افتراضية</span>
                </div>
              )}

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-300 gap-1 cursor-pointer"
                title="تغيير صورة المدرب"
              >
                <Camera className="w-6 h-6" />
                <span className="text-[11px] font-bold">رفع صورة جديدة</span>
              </button>
            </div>

            {/* Quick Upload Action Floating Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -left-2 p-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg cursor-pointer transition-transform active:scale-90"
              title="رفع صورة من الجهاز"
            >
              <Camera className="w-4 h-4" />
            </button>

            {photoUrl && (
              <button
                type="button"
                onClick={handleResetPhoto}
                className="absolute -bottom-2 -right-2 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-lg cursor-pointer transition-transform active:scale-90"
                title="استعادة الصورة الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Coach Identity (Name & Title) */}
          <div className="text-center mb-4">
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {manager.name}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-1 text-xs text-amber-300 font-semibold">
              <span>المدير الفني</span>
              <span>•</span>
              <span className="text-slate-300">{userClub?.name || 'دوري الدرجة الرابعة'}</span>
            </div>
          </div>

          {/* Core Card Metrics Grid (Country, Age, Global Ranking) */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 mb-4">
            {/* Country / Nationality */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                <Globe className="w-3 h-3 text-sky-400" />
                <span>الدولة</span>
              </div>
              <div className="font-bold text-xs text-slate-200 truncate">
                {manager.nationality || 'مصر'}
              </div>
            </div>

            {/* Age */}
            <div className="text-center border-x border-slate-800">
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>العمر</span>
              </div>
              <div className="font-bold text-xs text-slate-200 font-mono">
                {manager.age || 35} سنة
              </div>
            </div>

            {/* Global Ranking */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 mb-0.5">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>الترتيب العالمي</span>
              </div>
              <div className="font-black text-xs text-amber-300 font-mono">
                #{globalRank}
              </div>
            </div>
          </div>

          {/* Secondary Stats Strip */}
          <div className="grid grid-cols-3 gap-1 text-center py-2 px-1 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px]">المباريات</span>
              <span className="font-bold font-mono text-white">{manager.matchesManaged}</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-slate-500 block text-[10px]">نسبة الفوز</span>
              <span className="font-bold font-mono text-emerald-400">{winRate}%</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">البطولات</span>
              <span className="font-bold font-mono text-amber-400">{manager.trophies || 0} 🏆</span>
            </div>
          </div>

          {/* Bottom Card Footer Watermark */}
          <div className="mt-3 text-center text-[10px] text-slate-500 tracking-wide">
            رخصة تدريب معتمدة • أنت المدرب (Anta El Modareb)
          </div>
        </div>

        {/* Action Buttons: Native Share Button & Photo Button */}
        <div className="w-full mt-4 space-y-2">
          <button
            type="button"
            disabled={isSharing}
            onClick={handleNativeShare}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:from-amber-400 hover:to-emerald-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{isSharing ? 'جاري المشاركة...' : 'مشاركة كارت المدرب (واتساب / التطبيقات)'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>تغيير صورة المدرب من الجهاز</span>
          </button>
        </div>

      </div>
    </div>
  );
};
