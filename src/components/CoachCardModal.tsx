import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ManagerProfile, Club, WorldRankingsData } from '../types/game';
import { getLocalTrainerProfile } from '../services/trainerProfileService';
import {
  generateCoachCardImage,
  downloadCoachCardFile,
  shareCoachCardImage,
  GeneratedCardResult,
  TacticalProfileData,
} from '../utils/coachCardImageGenerator';
import {
  Camera,
  Share2,
  Trophy,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  UserCheck,
  Download,
  Loader2,
  Shield,
  Star,
  Activity,
  Award,
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
  const [actionLoading, setActionLoading] = useState<'download' | 'share' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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

  // 0. Effective Coach Name resolution
  const effectiveCoachName = (manager?.name && manager.name !== 'الكابتن الجديد' && manager.name !== 'المدرب الجديد')
    ? manager.name
    : (getLocalTrainerProfile()?.name || manager?.name || 'المدرب');

  // 1. Matches & Record stats
  const totalMatches = Math.max(manager?.matchesManaged || 0, userClub?.stats?.played || 0);
  const totalWins = Math.max(manager?.wins || 0, userClub?.stats?.won || 0);
  const totalDraws = Math.max(manager?.draws || 0, userClub?.stats?.drawn || 0);
  const totalLosses = Math.max(manager?.losses || 0, userClub?.stats?.lost || 0);
  const totalGoalsScored = Math.max(manager?.goalsScored || 0, userClub?.stats?.goalsFor || 0);
  const totalGoalsConceded = Math.max(manager?.goalsConceded || 0, userClub?.stats?.goalsAgainst || 0);

  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  // 2. World Ranking & Points
  const userRankFromList = (Array.isArray(worldRankings?.managers) ? worldRankings.managers : []).find(
    (m) => m && (m.id === 'user_manager' || m.id === (manager as any)?.id || (m as any)?.isUser)
  )?.worldRank;

  const globalRank = manager?.worldRank || userRankFromList || 850;
  const rankingPoints =
    manager?.rankingPoints || Math.max(1200, 1200 + totalWins * 35 + (manager?.level || 1) * 20);

  const managerLevel = manager?.level || 1;
  const managerOvr =
    manager?.managerRating ||
    (manager as any)?.rating ||
    Math.min(99, 68 + managerLevel * 3 + (totalWins > 5 ? 5 : 0));
  const trophiesCount =
    (manager?.leagueTitles || 0) + (manager?.cupTitles || 0) ||
    (Array.isArray(manager?.trophies)
      ? manager.trophies.length
      : typeof manager?.trophies === 'number'
      ? manager.trophies
      : 0);

  // 3. Tactical Playing Style (أسلوب اللعب)
  const tacticalProfile: TacticalProfileData = useMemo(() => {
    const tactics = userClub?.tactics || {
      formation: manager?.favoriteFormation || '4-3-3',
      mentality: 'balanced',
      passingStyle: 'short',
      pressingIntensity: 'balanced',
      tempo: 'balanced',
    };

    const formation = tactics.formation || manager?.favoriteFormation || '4-3-3';
    let styleTitle = 'أسلوب متوازن وشامل';
    let mentalityDesc = 'واقعية متوازنة';
    let passingDesc = 'بناء منظم';
    let pressingDesc = 'ضغط متوازن';
    let tacticalBio = `يعتمد على خطة ${formation} بانضباط خططي وتوازن بين حماية المرمى والمباغتة الهجومية.`;

    if (tactics.mentality === 'attacking' || tactics.mentality === 'ultra_attacking') {
      if (tactics.passingStyle === 'short') {
        styleTitle = 'هجوم كاسح واستحواذ (تيكي تاكا)';
        mentalityDesc = 'هجومية شجاعة';
        passingDesc = 'تمرير قصير وسريع';
        pressingDesc = 'ضغط عالي مكثف';
        tacticalBio = `فلسفة هجومية جريئة تعتمد على الاستحواذ الإيجابي والضغط العالي لاسترجاع الكرة سريعاً.`;
      } else {
        styleTitle = 'هجوم سريع ومباشر';
        mentalityDesc = 'هجومية مباشرة';
        passingDesc = 'تمرير عمودي مباشر';
        pressingDesc = 'ضغط أمامي سريع';
        tacticalBio = `سرعة قصوى في التحول الهجومي واستغلال المساحات في دفاع المنافس بالكرات المباشرة.`;
      }
    } else if (tactics.mentality === 'defensive' || tactics.mentality === 'ultra_defensive') {
      styleTitle = 'دفاع حديدي ومرتدات خاطفة';
      mentalityDesc = 'دفاعية منظمة';
      passingDesc = 'مرتدات طولية';
      pressingDesc = 'تكتل دفاعي محكم';
      tacticalBio = `تأمين دفاعي صلب وغلق المساحات مع الاعتماد على الهجمات المرتدة النموذجية لحسم المباريات.`;
    } else if (tactics.passingStyle === 'short') {
      styleTitle = 'استحواذ وهدوء تكتيكي';
      mentalityDesc = 'سيطرة على الإيقاع';
      passingDesc = 'بناء هادئ من الخلف';
      pressingDesc = 'ضغط متوسط منظم';
      tacticalBio = `التحكم في مجريات اللعب وحرمان الخصم من الكرة مع بناء منظم للهجمة من الخط الخلفي.`;
    }

    return {
      styleTitle,
      formation,
      mentalityDesc,
      passingDesc,
      pressingDesc,
      tacticalBio,
    };
  }, [manager, userClub]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setToastMessage('حجم الصورة كبير، يرجى اختيار صورة أقل من 5 ميجابايت.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
        try {
          localStorage.setItem(STORAGE_COACH_PHOTO, result);
          setToastMessage('تم تحديث صورة المدرب بنجاح! 📸');
          setTimeout(() => setToastMessage(null), 2500);
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
      setTimeout(() => setToastMessage(null), 2000);
    } catch {
      // ignore
    }
  };

  /**
   * Prepares the full Coach Card Image ensuring 100% of data is included
   */
  const prepareCardImage = async (): Promise<GeneratedCardResult> => {
    return await generateCoachCardImage({
      manager: {
        ...manager,
        name: effectiveCoachName,
      },
      userClub,
      globalRank,
      rankingPoints,
      totalMatches,
      totalWins,
      totalDraws,
      totalLosses,
      totalGoalsScored,
      totalGoalsConceded,
      winRate,
      trophiesCount,
      tacticalProfile,
      photoUrl,
      cardElement: cardRef.current,
    });
  };

  // Button 1: Download Card
  const handleDownloadImage = async () => {
    if (actionLoading) return;
    setActionLoading('download');
    setToastMessage('جاري استخراج وتحميل كارت المدرب...');
    try {
      const imageResult = await prepareCardImage();
      const success = await downloadCoachCardFile(imageResult.dataUrl, imageResult.fileName);
      if (success) {
        setToastMessage('تم تحميل كارت المدرب بنجاح! 📥');
      } else {
        setToastMessage('تم حفظ الصورة على جهازك.');
      }
    } catch (err: any) {
      console.error('Download card error:', err);
      setToastMessage('حدث خطأ أثناء تحميل الكارت، يرجى المحاولة ثانية.');
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Button 2: Share Card
  const handleShareCard = async () => {
    if (actionLoading) return;
    setActionLoading('share');
    setToastMessage('جاري تجهيز الكارت للمشاركة...');
    try {
      const imageResult = await prepareCardImage();
      const shareTitle = `كارت المدرب: ${effectiveCoachName} • أنت المدرب`;
      const shareText = `🏆 كارت المدرب: ${effectiveCoachName}\n🌍 الترتيب العالمي: #${globalRank}\n📊 المباريات: ${totalMatches} | نسبة الفوز: ${winRate}%\n⚡ أسلوب اللعب: ${tacticalProfile.styleTitle}\n⚽ لعبة أنت المدرب`;

      const res = await shareCoachCardImage(imageResult, shareTitle, shareText);
      if (res.shared) {
        setToastMessage('تمت مشاركة كارت المدرب بنجاح! 🚀');
      } else {
        setToastMessage('تم حفظ الكارت بجهازك لسهولة مشاركته! 📸');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.warn('Share notice:', err);
        await handleDownloadImage();
      }
    } finally {
      setActionLoading(null);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  return (
    <div
      id="coach_card_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl w-full max-w-md p-4 sm:p-5 shadow-2xl text-slate-100 relative overflow-hidden flex flex-col items-center max-h-[95vh] overflow-y-auto">
        {/* Modal Close Button */}
        <button
          id="btn_close_coach_card_modal"
          onClick={onClose}
          className="absolute top-3 left-3 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer z-20"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="sticky top-0 z-30 w-full mb-3 p-2.5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 animate-fadeIn">
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

        {/* ========================================================= */}
        {/* THE COACH CARD CONTAINER (Captured cleanly on export)    */}
        {/* ========================================================= */}
        <div
          ref={cardRef}
          id="official_coach_card"
          className="w-full relative rounded-2xl p-4 sm:p-5 shadow-xl select-none text-right border-2 border-amber-500/40"
          style={{
            background: 'linear-gradient(180deg, #09131f 0%, #061019 60%, #03080e 100%)',
            boxShadow: '0 15px 35px -10px rgba(16, 185, 129, 0.15), 0 0 25px rgba(245, 158, 11, 0.08)',
          }}
        >
          {/* Top Emerald & Gold Holographic Accent Line */}
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-500 rounded-t-2xl" />

          {/* 1. Header: Logo and Title «أنت المدرب» */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3.5 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black">
                <Trophy className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <span className="text-sm font-black text-amber-300 block tracking-wide">
                  أنت المدرب
                </span>
                <span className="text-[10px] text-slate-400 font-medium block">
                  بطاقة المدرب الرسمية
                </span>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono font-black text-xs">
              {managerOvr} OVR
            </div>
          </div>

          {/* 2. Coach Photo + Name & Club */}
          <div className="flex items-center gap-3.5 mb-4">
            {/* Coach Photo Container */}
            <div className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0">
              <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-lg bg-slate-800 flex items-center justify-center relative group">
                {photoUrl ? (
                  <img src={photoUrl} alt={effectiveCoachName} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                    <UserCheck className="w-7 h-7 text-amber-400 mb-0.5" />
                    <span className="text-[9px] text-slate-400">صورة المدرب</span>
                  </div>
                )}

                {/* Upload Overlay Button (Hidden in exported image) */}
                <button
                  id="coach_photo_upload_overlay"
                  type="button"
                  data-hide-on-export="true"
                  onClick={() => fileInputRef.current?.click()}
                  className="photo-upload-overlay absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-300 gap-0.5 cursor-pointer"
                  title="تغيير صورة المدرب"
                >
                  <Camera className="w-4 h-4" />
                  <span className="text-[9px] font-bold">رفع صورة</span>
                </button>
              </div>

              {/* Upload trigger icon badge */}
              <button
                type="button"
                data-hide-on-export="true"
                onClick={() => fileInputRef.current?.click()}
                className="photo-upload-overlay absolute -bottom-1.5 -left-1.5 p-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 shadow cursor-pointer transition-transform active:scale-90"
                title="رفع صورة"
              >
                <Camera className="w-3 h-3" />
              </button>

              {photoUrl && (
                <button
                  type="button"
                  data-hide-on-export="true"
                  onClick={handleResetPhoto}
                  className="photo-upload-overlay absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow cursor-pointer transition-transform active:scale-90"
                  title="استعادة الصورة الأصلية"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Coach Name & Club Information */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white truncate tracking-wide">
                {effectiveCoachName}
              </h3>
              <div className="text-xs text-amber-400 font-bold mt-0.5 truncate">
                المدير الفني لنادي {userClub?.name || 'دوري الدرجة الرابعة'}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-medium">
                  المستوى {managerLevel}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  {manager.nationality || 'مصر'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Core Stats Grid: World Rank, Matches, Win Rate */}
          <div className="grid grid-cols-3 gap-2 mb-3.5 text-center">
            {/* World Rank */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-amber-300 mb-0.5 block">
                التصنيف العالمي
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                #{globalRank}
              </span>
            </div>

            {/* Number of Matches */}
            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/80 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-300 mb-0.5 block">
                عدد المباريات
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalMatches}
              </span>
            </div>

            {/* Win Rate */}
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-center">
              <span className="text-[11px] font-bold text-emerald-300 mb-0.5 block">
                نسبة الفوز
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {winRate}%
              </span>
            </div>
          </div>

          {/* Quick Record Sub-Bar (Wins, Draws, Losses) */}
          <div className="flex items-center justify-around py-1.5 px-3 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] mb-3.5 font-bold">
            <span className="text-emerald-400">فوز: {totalWins}</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400">تعادل: {totalDraws}</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400">خسارة: {totalLosses}</span>
          </div>

          {/* 4. Tactical Playing Style (أسلوب اللعب) */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                أسلوب اللعب:
              </span>
              <span className="text-xs font-black text-emerald-400">
                {tacticalProfile.styleTitle}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {tacticalProfile.tacticalBio}
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60">
              <span>الخطة: <strong className="text-amber-300 font-mono">{tacticalProfile.formation}</strong></span>
              <span>العقلية: <strong className="text-slate-200">{tacticalProfile.mentalityDesc}</strong></span>
              <span>التمرير: <strong className="text-slate-200">{tacticalProfile.passingDesc}</strong></span>
            </div>
          </div>

          {/* 5. Clean Footer Branding */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/70">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              رخصة تدريب معتمدة
            </span>
            <span>لعبة أنت المدرب 2026</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ACTION BUTTONS (Placed OUTSIDE the Card, Zero Overlap)    */}
        {/* ========================================================= */}
        <div className="w-full mt-4 flex items-center gap-2.5">
          {/* Button 1: Download Card (تحميل الكارت) */}
          <button
            type="button"
            id="btn_download_coach_card"
            onClick={handleDownloadImage}
            disabled={actionLoading !== null}
            className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'download' ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Download className="w-4 h-4 text-slate-950" />
            )}
            <span>تحميل الكارت</span>
          </button>

          {/* Button 2: Share Card (مشاركة الكارت) */}
          <button
            type="button"
            id="btn_share_coach_card"
            onClick={handleShareCard}
            disabled={actionLoading !== null}
            className="flex-1 py-3 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {actionLoading === 'share' ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Share2 className="w-4 h-4 text-slate-950" />
            )}
            <span>مشاركة الكارت</span>
          </button>
        </div>
      </div>
    </div>
  );
};
