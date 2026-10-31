import React, { useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { 
  downloadSaveFile, 
  parseAndValidateSaveFile, 
  getExportSaveCode,
  CURRENT_SAVE_FORMAT_VERSION, 
  APP_BUILD_VERSION 
} from '../services/saveBackupService';
import { getLocalTrainerProfile } from '../services/trainerProfileService';
import { RestartSeasonModal } from './RestartSeasonModal';
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
  Sparkles,
  Smartphone,
  ExternalLink,
  FileText,
  Info,
  Copy,
  Check,
  FileCode,
  ClipboardPaste,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';
import { getDebugLogText } from '../utils/errorLog';

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
    userClub,
    daysUntilNextMatch,
    scoutedOpponents,
    deletedMessageIds,
    liveMatch,
    discardSavedLiveMatch,
    applyLoadedSave,
    exportCurrentSavePayload
  } = useGame();

  const trainerProfile = getLocalTrainerProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showRestartSeasonModal, setShowRestartSeasonModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showCodePasteArea, setShowCodePasteArea] = useState(false);
  const [pastedCode, setPastedCode] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const getPayload = () => {
    return exportCurrentSavePayload ? exportCurrentSavePayload() : {
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
  };

  const handleExportBackup = (format: 'anta-save' | 'json' = 'anta-save') => {
    setIsExporting(true);
    setFeedback(null);
    try {
      const payload = getPayload();
      downloadSaveFile(payload, trainerProfile?.trainerId, format);
      setFeedback({
        type: 'success',
        title: 'تم تصدير ملف الحفظ بنجاح',
        message: `تم تنزيل ملف (${format === 'json' ? '.json' : '.anta-save'}) بنجاح على جهازك. يمكنك نقله للهاتف أو رفعه في أي وقت.`
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

  const handleCopyCode = async () => {
    try {
      const payload = getPayload();
      const code = getExportSaveCode(payload, trainerProfile?.trainerId);
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older WebViews
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      setFeedback({
        type: 'success',
        title: 'تم نسخ كود المسيرة بنجاح! 📋',
        message: 'تم نسخ نص كود الحفظ بالكامل إلى الحافظة. يمكنك الآن لصقه مباشرة في التطبيق على هاتفك دون الحاجة لملفات!'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        title: 'فشل النسخ',
        message: `تعذر نسخ الكود تلقائياً: ${err?.message || 'خطأ غير معروف'}`
      });
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const processImportData = async (fileOrText: File | string) => {
    setIsImporting(true);
    setFeedback(null);

    try {
      const result = await parseAndValidateSaveFile(fileOrText);

      if (!result.success || !result.data) {
        setFeedback({
          type: 'error',
          title: 'فشل استيراد المسيرة',
          message: result.error || 'الملف أو الكود غير متوافق أو تالف.'
        });
        return;
      }

      // Safe application and persistence
      await applyLoadedSave(result.data);

      setPastedCode('');
      setShowCodePasteArea(false);

      setFeedback({
        type: 'success',
        title: 'تمت استعادة المسيرة بنجاح! 🏆',
        message: `تم تحميل تقدم المدرب (${result.metadata?.managerName || result.data.manager?.name}) في الموسم ${result.metadata?.seasonNumber || result.data.season?.seasonNumber}. تم تحديث كافة أنظمة اللعبة والتشكيلة وحفظها محلياً على جهازك.`
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImportData(files[0]);
  };

  const handlePastedCodeSubmit = async () => {
    if (!pastedCode.trim()) {
      setFeedback({
        type: 'error',
        title: 'الكود فارغ',
        message: 'يرجى لصق كود أو نص ملف الحفظ أولاً.'
      });
      return;
    }
    await processImportData(pastedCode);
  };

  return (
    <ModalPortal>
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
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>النسخ الاحتياطي اليدوي ونقل المسيرة (Backup / Transfer)</span>
            </h4>

            {/* Export Section */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>تصدير المسيرة الحالية (Export)</span>
                </span>
                <span className="text-[10px] text-slate-400">اختر الصيغة المناسبة لجهازك</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. Standard .anta-save */}
                <button
                  type="button"
                  onClick={() => handleExportBackup('anta-save')}
                  disabled={isExporting}
                  className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-right transition-all flex flex-col gap-1 cursor-pointer group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">ملف مشفر</span>
                    <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/50">
                      .anta-save
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">الصيغة الرسمية المعتمدة</span>
                </button>

                {/* 2. Standard .json */}
                <button
                  type="button"
                  onClick={() => handleExportBackup('json')}
                  disabled={isExporting}
                  className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-teal-500/30 hover:border-teal-500/60 rounded-xl text-right transition-all flex flex-col gap-1 cursor-pointer group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-teal-300">ملف قياسي</span>
                    <span className="text-[9px] text-teal-400 font-mono bg-teal-950/80 px-1 py-0.5 rounded border border-teal-800/50">
                      .json
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">متوافق مع كل برامج الهاتف</span>
                </button>

                {/* 3. Copy Code */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`p-2.5 border rounded-xl text-right transition-all flex flex-col gap-1 cursor-pointer group active:scale-[0.98] ${
                    isCopied 
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' 
                      : 'bg-slate-800 hover:bg-slate-750 border-amber-500/30 hover:border-amber-500/60 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{isCopied ? 'تم النسخ!' : 'نسخ الكود'}</span>
                    </span>
                    <span className="text-[9px] text-amber-400 font-mono bg-amber-950/80 px-1 py-0.5 rounded border border-amber-800/50">
                      Clipboard
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">لصق فوري بدون تحميل ملف</span>
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>استيراد واستعادة مسيرة (Import)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowCodePasteArea(prev => !prev)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>{showCodePasteArea ? 'إخفاء مربع النص' : 'أو الصق كود نصي'}</span>
                  {showCodePasteArea ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Import via File Button */}
              <button
                type="button"
                onClick={handleTriggerFileInput}
                disabled={isImporting}
                className="w-full p-3 bg-slate-800 hover:bg-slate-750 border border-sky-500/30 hover:border-sky-500/60 rounded-xl text-right transition-all flex items-center justify-between cursor-pointer group active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  ) : (
                    <Upload className="w-4 h-4 text-sky-400 group-hover:translate-y-[-1px] transition-transform" />
                  )}
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-sky-300 block">
                      اختيار ملف الحفظ من جهازك
                    </span>
                    <span className="text-[10px] text-slate-400">
                      يدعم ملفات (.anta-save) و (.json) من الموقع والتطبيق
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-sky-300 bg-sky-950/80 border border-sky-800/50 px-2 py-1 rounded-lg font-bold">
                  تصفح الملفات
                </span>
              </button>

              {/* Paste Text Code Expandable Area */}
              {showCodePasteArea && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>الصق نص أو كود الحفظ هنا مباشرة:</span>
                    <span className="text-[10px] text-amber-400">مثالي لنقل المسيرة عبر واتساب أو الملاحظات</span>
                  </div>
                  <textarea
                    value={pastedCode}
                    onChange={(e) => setPastedCode(e.target.value)}
                    placeholder="الصق كود المسيرة الكامل هنا (يبدأ بـ { وينتهي بـ })..."
                    className="w-full h-24 p-2.5 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl text-[11px] text-slate-200 font-mono resize-none focus:outline-none placeholder:text-slate-500"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handlePastedCodeSubmit}
                    disabled={isImporting || !pastedCode.trim()}
                    className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                    <span>استيراد كود المسيرة واستئناف اللعب</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden File Input supporting all devices and Android document pickers */}
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*,.anta-save,.json,application/json,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>



          {/* Android Project Download */}
          <div className="bg-slate-950/60 border border-emerald-900/40 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>ملفات تطبيق الأندرويد المحدثة (Android Project)</span>
              </h4>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                محدث بالكامل ⚡
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              تحتوي هذه الحزمة على كافة ملفات مشروع Android Studio ومكتبات Capacitor وأصول الويب المترجمة (dist) متضمنة جميع التحديثات الأخيرة (نظام بيع وشراء اللاعبين، التكتيكات المحسنة، إعلانات AdMob).
            </p>
            <a
              href="/anta_elmodareb_android_project.zip"
              download="anta_elmodareb_android_project.zip"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل مشروع الأندرويد المحدث (ZIP)</span>
            </a>
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

          {/* About Game & Privacy Policy Link */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">حول اللعبة والخصوصية (About & Privacy)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">الإصدار {APP_BUILD_VERSION}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              لعبة "أنت المدرب" تحترم خصوصيتك بالكامل، وتعمل وفق مبدأ الحفظ المحلي أولاً (Local-First)، مع استخدام معتمد لخدمات Google AdMob و Google Firebase.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.history.pushState({}, '', '/privacy-policy');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="flex-1 py-2 px-3 bg-sky-950/60 hover:bg-sky-900/60 border border-sky-600/40 text-sky-200 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>عرض سياسة الخصوصية الرسمية</span>
                <ExternalLink className="w-3 h-3 text-sky-400" />
              </button>
            </div>
          </div>

          {/* Active Live Match Discard / Recovery */}
          {liveMatch && (
            <div className="bg-amber-950/25 border border-amber-600/40 rounded-2xl p-3.5 space-y-2 text-right">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-200">مباراة جارية محفوظة في الذاكرة</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold font-mono">
                  الدقيقة {liveMatch.currentMinute || 0}'
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                توجد مباراة مباشرة محفوظة محلياً. إذا كانت الشاشة تتجمد أو الأزرار لا تستجيب، يمكنك إلغاؤها بأمان لاستئناف اللعب.
              </p>
              <div className="bg-slate-950/70 p-2 rounded-xl text-[11px] text-emerald-400 font-semibold border border-emerald-900/40">
                🛡️ لن يتم حذف مسيرتك أو أي بيانات أخرى
              </div>
              <button
                type="button"
                id="btn_discard_saved_live_match"
                onClick={() => {
                  if (window.confirm('هل أنت متأكد من إلغاء المباراة المحفوظة؟ لن يتم حذف مسيرتك أو أي بيانات أخرى.')) {
                    discardSavedLiveMatch();
                    setFeedback({
                      type: 'success',
                      title: 'تم إلغاء المباراة المحفوظة بنجاح',
                      message: 'تم مسح المباراة الجارية بأمان دون حذف مسيرتك أو أي بيانات أخرى.',
                    });
                  }
                }}
                className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إلغاء المباراة المحفوظة</span>
              </button>
            </div>
          )}

          {/* Debug log (for testers to send after a freeze / white screen) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              لو حصل تهنيج أو شاشة بيضاء، افتح اللعبة وانسخ سجل الأخطاء وأرسله للمطور.
            </p>
            <button
              type="button"
              id="btn_copy_debug_log"
              onClick={async () => {
                const text = getDebugLogText();
                try {
                  await navigator.clipboard.writeText(text);
                  setFeedback({ type: 'success', title: 'تم نسخ سجل الأخطاء', message: 'ألصقه في رسالة وأرسله للمطور.' });
                } catch {
                  window.prompt('انسخ السجل التالي:', text);
                }
              }}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>نسخ سجل الأخطاء</span>
            </button>
          </div>

          {/* Reset & Season Operations */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              type="button"
              id="btn_restart_season_settings_modal"
              onClick={() => setShowRestartSeasonModal(true)}
              className="w-full py-2.5 px-3 bg-amber-950/30 hover:bg-amber-950/50 border border-amber-800/50 text-amber-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>إعادة بداية الموسم الحالي {season.seasonNumber} (الجولة الأولى)</span>
            </button>

            {onOpenResetConfirm && (
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
            )}
          </div>

        </div>

      </div>

      {/* Restart Season Modal */}
      <RestartSeasonModal
        isOpen={showRestartSeasonModal}
        onClose={() => setShowRestartSeasonModal(false)}
      />
      </div>
    </ModalPortal>
  );
};
