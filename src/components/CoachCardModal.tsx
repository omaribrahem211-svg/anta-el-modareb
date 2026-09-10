import React, { useState, useEffect, useRef } from 'react';
import { Share } from '@capacitor/share';
import { ManagerProfile, Club, WorldRankingsData } from '../types/game';
import { generateCoachCardImage } from '../utils/coachCardImageGenerator';
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
  UserCheck,
  Download,
  MessageCircle,
  Loader2
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
  const [actionLoading, setActionLoading] = useState<'download' | 'whatsapp' | 'facebook' | 'share' | null>(null);
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

  const prepareImageFile = async (): Promise<{ file: File; dataUrl: string; blob: Blob }> => {
    const { dataUrl, blob } = await generateCoachCardImage({
      manager,
      userClub,
      globalRank,
      winRate,
      photoUrl,
    });
    const safeName = (manager.name || 'مدرب').replace(/[^\w\u0600-\u06FF]/g, '_');
    const fileName = `كارت_المدرب_${safeName}.png`;
    const file = new File([blob], fileName, { type: 'image/png' });
    return { file, dataUrl, blob };
  };

  // 1. Download Card Image (PNG)
  const handleDownloadImage = async () => {
    if (actionLoading) return;
    setActionLoading('download');
    setToastMessage('جاري إنشاء صورة الكارت بجودة فائقة...');
    try {
      const { dataUrl, file } = await prepareImageFile();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setToastMessage('تم حفظ صورة كارت المدرب في جهازك بنجاح! 📸');
    } catch (err) {
      console.error('Download error:', err);
      setToastMessage('تعذر تنزيل الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // 2. Share to WhatsApp / WhatsApp Story
  const handleShareWhatsApp = async () => {
    if (actionLoading) return;
    setActionLoading('whatsapp');
    setToastMessage('جاري تجهيز صورة كارت المدرب لواتساب...');
    try {
      const { file, dataUrl } = await prepareImageFile();

      // Try native share sheet with the image file (allows WhatsApp / WhatsApp Status selection)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `كارت المدرب: ${manager.name}`,
          text: `🏆 كارت المدرب الرسمي: ${manager.name} ⚽ لعبة أنت المدرب\n🔥 الترتيب العالمي: #${globalRank} | البطولات: ${manager.trophies || 0}`,
        });
        setToastMessage('تمت المشاركة بنجاح عبر واتساب!');
        return;
      }

      // Fallback: Download image and open WhatsApp
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const msg = encodeURIComponent(
        `🏆 كارت المدرب الرسمي: ${manager.name} ⚽\n` +
        `🌍 الدولة: ${manager.nationality || 'مصر'} | الترتيب العالمي: #${globalRank}\n` +
        `🛡️ النادي: ${userClub?.name || 'دوري الدرجة الرابعة'}\n` +
        `🥇 البطولات: ${manager.trophies || 0} | نسبة الفوز: ${winRate}%\n` +
        `🔥 حَمّل لعبة أنت المدرب وشوف مهاراتك التدريبية!`
      );
      window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
      setToastMessage('تم تنزيل صورة الكارت وفتح واتساب لمشاركتها كحالة (ستوري) أو رسالة!');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('WhatsApp share error:', err);
        setToastMessage('حدث خطأ أثناء المشاركة، يرجى استخدام زر التحميل.');
      }
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // 3. Share to Facebook
  const handleShareFacebook = async () => {
    if (actionLoading) return;
    setActionLoading('facebook');
    setToastMessage('جاري تجهيز صورة كارت المدرب لفيسبوك...');
    try {
      const { file, dataUrl } = await prepareImageFile();

      // Try native share with image file (supports Facebook feed & Facebook story)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `كارت المدرب: ${manager.name}`,
          text: `🏆 كارت المدرب الرسمي: ${manager.name} ⚽ لعبة أنت المدرب\n🔥 حَمّل اللعبة ونافسني!`,
        });
        setToastMessage('تمت المشاركة بنجاح على فيسبوك!');
        return;
      }

      // Fallback: Download image and open Facebook
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://www.facebook.com/share/1dM9YvHPFr/')}&quote=${encodeURIComponent(`🏆 كارت المدرب الرسمي: ${manager.name} - لعبة أنت المدرب`)}`;
      window.open(fbUrl, '_blank');
      setToastMessage('تم تنزيل صورة الكارت وفتح فيسبوك لنشرها في القصة (Story) أو المنشورات!');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Facebook share error:', err);
        setToastMessage('حدث خطأ أثناء المشاركة، يرجى استخدام زر التحميل.');
      }
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // 4. Share to All Apps (Native Share Image File)
  const handleShareAll = async () => {
    if (actionLoading) return;
    setActionLoading('share');
    setToastMessage('جاري تحضير مشاركة صورة الكارت...');
    try {
      const { file } = await prepareImageFile();

      // 1. Try native Web Share API with image file
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `كارت المدرب: ${manager.name} - لعبة أنت المدرب`,
          text: `🏆 كارت المدرب الرسمي: ${manager.name} ⚽ لعبة أنت المدرب\n🔥 الترتيب العالمي: #${globalRank}`,
        });
        setToastMessage('تمت مشاركة صورة الكارت بنجاح!');
        return;
      }

      // 2. Capacitor Share fallback
      try {
        const canShareCap = await Share.canShare();
        if (canShareCap?.value) {
          await Share.share({
            title: `كارت المدرب: ${manager.name}`,
            text: `🏆 كارت المدرب الرسمي: ${manager.name} ⚽\n🌐 الترتيب: #${globalRank}\n🥇 البطولات: ${manager.trophies || 0}\n🔥 حَمّل لعبة أنت المدرب!`,
            dialogTitle: 'مشاركة كارت المدرب مع التطبيقات',
          });
          setToastMessage('تم فتح نافذة المشاركة!');
          return;
        }
      } catch (capErr) {
        console.warn('Capacitor share fallback:', capErr);
      }

      // 3. Fallback: Download image
      await handleDownloadImage();
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Share all error:', err);
        setToastMessage('تعذر فتح المشاركة المباشرة، جاري تنزيل الصورة.');
        await handleDownloadImage();
      }
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 3500);
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
          
          {/* Card Top Header Branding: "لعبة أنت المدرب" */}
          <div className="text-center mb-4 relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-amber-400/20 to-emerald-500/25 border border-amber-400/50 text-amber-300 text-xs font-black tracking-wide shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>لعبة أنت المدرب</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
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

          {/* Required Slogan Banner */}
          <div className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border border-amber-400/40 text-center shadow-inner">
            <p className="text-xs font-black text-amber-300 tracking-tight">
              🔥 حَمّل لعبة أنت المدرب وشوف قدراتك التدريبية!
            </p>
          </div>

          {/* Bottom Card Footer Watermark */}
          <div className="mt-2.5 text-center text-[10px] text-slate-400 tracking-wide font-medium">
            رخصة تدريب معتمدة • لعبة أنت المدرب
          </div>
        </div>

        {/* Action Buttons: Download, WhatsApp Story, Facebook, Native Share & Photo Upload */}
        <div className="w-full mt-4 space-y-2">
          {/* 1. Download Card Image Button */}
          <button
            type="button"
            id="btn_download_coach_card_image"
            disabled={actionLoading !== null}
            onClick={handleDownloadImage}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {actionLoading === 'download' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-emerald-100" />
            )}
            <span>{actionLoading === 'download' ? 'جاري إنشاء وتنزيل الصورة...' : 'تحميل صورة الكارت بجودة عالية (PNG)'}</span>
          </button>

          {/* 2. Social Share Row: WhatsApp Story & Facebook */}
          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp Story / Message */}
            <button
              type="button"
              id="btn_share_whatsapp"
              disabled={actionLoading !== null}
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs rounded-xl shadow-md shadow-green-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {actionLoading === 'whatsapp' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5 text-slate-950" />
              )}
              <span>{actionLoading === 'whatsapp' ? 'جاري التجهيز...' : 'واتساب / ستوري'}</span>
            </button>

            {/* Facebook Share */}
            <button
              type="button"
              id="btn_share_facebook"
              disabled={actionLoading !== null}
              onClick={handleShareFacebook}
              className="py-2.5 px-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {actionLoading === 'facebook' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-white" />
              )}
              <span>{actionLoading === 'facebook' ? 'جاري التجهيز...' : 'مشاركة فيسبوك'}</span>
            </button>
          </div>

          {/* 3. Share to All Apps (Native Share Image File) */}
          <button
            type="button"
            id="btn_share_all_apps"
            disabled={actionLoading !== null}
            onClick={handleShareAll}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {actionLoading === 'share' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
            ) : (
              <Share2 className="w-3.5 h-3.5 text-slate-950" />
            )}
            <span>{actionLoading === 'share' ? 'جاري المشاركة...' : 'مشاركة صورة الكارت لكل التطبيقات'}</span>
          </button>

          {/* 4. Upload / Change Coach Photo */}
          <button
            type="button"
            id="btn_change_coach_photo"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
          >
            <Camera className="w-3 h-3 text-amber-400" />
            <span>تغيير صورة المدرب من الجهاز</span>
          </button>
        </div>

      </div>
    </div>
  );
};
