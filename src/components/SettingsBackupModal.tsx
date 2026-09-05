import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { 
  downloadSaveFile, 
  parseAndValidateSaveFile, 
  CURRENT_SAVE_FORMAT_VERSION, 
  APP_BUILD_VERSION 
} from '../services/saveBackupService';
import { getLocalTrainerProfile } from '../services/trainerProfileService';
import {
  Settings,
  X,
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  User,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileCheck,
  FileX,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface SettingsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResetConfirm?: () => void;
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  isOpen,
  onClose,
  onOpenResetConfirm,
}) => {
  const { 
    manager, 
    season, 
    currentRound, 
    teams, 
    standings, 
    fixtures, 
    activeLeague,
    transferMarket,
    incomingBids,
    inbox,
    cupTournament,
    jobOffers,
    seasonEndSummary,
    transferHistory,
    clubEconomy,
    calendarDate,
    activeNegotiations,
    boardSystem,
    dailyNews,
    retiredPlayers,
    worldRankings,
    scoutedOpponents,
    deletedMessageIds,
    applyLoadedSave,
    exportCurrentSavePayload
  } = useGame();

  const trainerProfile = getLocalTrainerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExportBackup = () => {
    setIsExporting(true);
    try {
      // Gather active game payload
      const payload = exportCurrentSavePayload ? exportCurrentSavePayload() : {
        schemaVersion: CURRENT_SAVE_FORMAT_VERSION,
        saveVersion: 1,
        lastLocalSaveAt: Date.now(),
        season,
        activeLeague,
        teams,
        standings,
        fixtures,
        currentRound,
        manager,
        transferMarket,
        incomingBids,
        inbox,
        cupTournament,
        jobOffers,
        seasonEndSummary,
        transferHistory,
        clubEconomy,
        calendarDate,
        activeNegotiations,
        boardSystem,
        dailyNews,
        retiredPlayers,
        worldRankings,
        scoutedOpponents,
        deletedMessageIds,
      };

      downloadSaveFile(payload, trainerProfile?.trainerId);
      setFeedback({
        type: 'success',
        title: 'تم تصدير ملف الحفظ بنجاح',
        message: 'تم تنزيل ملف (.anta-save) على جهازك. يمكنك نقله أو استعادته في أي وقت بأمان.'
      });
    } catch (e: any) {
      setFeedback({
        type: 'error',
        title: 'فشل التصدير',
        message: `حدث خطأ أثناء إعداد ملف الحفظ: ${e?.message || 'خطأ غير معروف'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsImporting(true);
    setFeedback(null);

    try {
      const result = await parseAndValidateSaveFile(file);

      if (!result.success || !result.data) {
        setFeedback({
          type: 'error',
          title: 'فشل استيراد ملف الحفظ',
          message: result.error || 'الملف غير متوافق أو تالف.'
        });
        return;
      }

      // Safe application of migrated save
      await applyLoadedSave(result.data);

      setFeedback({
        type: 'success',
        title: 'تمت استعادة النسخة الاحتياطية بنجاح!',
        message: `تم تحميل تقدم المدرب (${result.metadata?.managerName || result.data.manager?.name}) في الموسم ${result.metadata?.seasonNumber || result.data.season?.seasonNumber}. تم تحديث كافة أنظمة اللعبة والتشكيلة محلياً.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'خطأ أثناء الاستيراد',
        message: `تعذر إتمام الاستعادة: ${err?.message || 'حدث خطأ غير متوقع'}`
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">إعدادات ملف الحفظ والنسخ الاحتياطي</h3>
              <p className="text-xs text-slate-400">إدارة مسيرتك التدريبية، الحفظ المحلي، والاستيراد/التصدير</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedback && (
          <div className={`mb-4 p-3.5 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
          }`}>
            {feedback.type === 'success' ? (
              <FileCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <FileX className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span className="font-bold block text-sm mb-0.5">{feedback.title}</span>
              <p>{feedback.message}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          
          {/* Trainer Card Info */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{manager.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    {manager.nationality || 'مصري'} • {manager.age || 35} سنة • الترخيص ({manager.license || 'D'})
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono font-bold">
                Local-First
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>معرّف المدرب (Trainer ID):</span>
              <span className="text-slate-200 font-bold tracking-wider">
                {trainerProfile?.trainerId || manager.trainerId || 'TRN-LOCAL-READY'}
              </span>
            </div>
          </div>

          {/* Backup & Restore Action Buttons */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>النسخ الاحتياطي اليدوي (Manual Backup / Restore)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="p-3.5 bg-slate-800 hover:bg-slate-750 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl text-right transition-all flex flex-col gap-1.5 cursor-pointer shadow-md group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>تصدير نسخة احتياطية</span>
                  </span>
                  <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    .anta-save
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  تصدير ملف يحتوي على كامل بيانات الموسم والتشكيلة والأموال مشفر ومحمي.
                </p>
              </button>

              {/* Import Button */}
              <button
                type="button"
                onClick={handleTriggerFileInput}
                disabled={isImporting}
                className="p-3.5 bg-slate-800 hover:bg-slate-750 border border-sky-500/30 hover:border-sky-500/60 rounded-2xl text-right transition-all flex flex-col gap-1.5 cursor-pointer shadow-md group active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 group-hover:text-sky-200 flex items-center gap-1.5">
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    ) : (
                      <Upload className="w-4 h-4 text-sky-400" />
                    )}
                    <span>استيراد نسخة احتياطية</span>
                  </span>
                  <span className="text-[10px] text-sky-400/80 font-mono bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                    اختيار ملف
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  استعادة ملف حفظ سابق مع فحص تلقائي للسلامة والترقية (Migration).
                </p>
              </button>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".anta-save,.json,application/json,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* System Security & Architecture Note */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ميزات أمان ملف الحفظ:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-400 pr-1">
              <li>فحص سلامة رقمي (Integrity Hash Check) لمنع التعديل العشوائي والتلف.</li>
              <li>نظام ترقية تلقائي (Auto-Migration) يضمن التوافق التام مع أي تحديثات مستقبلية للعبة.</li>
              <li>نسخة احتياطية محلية تعمل 100% دون اتصال بالإنترنت أو الحاجة لتسجيل حساب.</li>
            </ul>
          </div>

          {/* Reset Career Danger Zone Option */}
          {onOpenResetConfirm && (
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenResetConfirm();
                }}
                className="w-full py-2.5 px-3 bg-red-950/20 hover:bg-red-950/40 border border-red-800/40 text-red-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط اللعبة وبدء مسيرة جديدة من الصفر</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
